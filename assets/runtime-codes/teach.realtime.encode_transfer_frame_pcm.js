/******************
《【教程】【音频流】【上传】实时转码上传-pcm固定帧大小》
作者：高坚果
时间：2022-04-26 20:58:37

通过onProcess回调可实现录音的实时处理，onProcess的buffers参数内容为pcm数组（16位 LE小端模式 Little Endian），能直接流式的将数据进行上传；需要用到Recorder.SampleData方法来实时提取出pcm数据和转换采样率。

pcm数据从中间任意位置截取出来都能正常播放，所以可以生成任意固定大小的帧，并且每帧均可独立播放；其他格式就没有这种特性了，比如mp3，截取出来的数据无法解码播放，必须满足特定的MP3帧格式才能播放；本demo只适用于16位pcm格式，未支持8位pcm和其他录音格式，其他格式如需按固定大小的数据帧上传到服务器，请参考《【教程】【音频流】【上传】实时转码上传-实时帧回调版》。

如果不需要获得最终结果，可实时清理缓冲数据，避免占用过多内存，想录多久就录多久。

【接收端要实时播放?】本示例代码上传过来的数据都是一小段一小段的pcm片段数据文件（每一段均可独立正常播放），接收端可以直接播放pcm数据，可以参考《【教程】【音频流】【播放】实时解码播放音频片段》使用BufferStreamPlayer插件来播放。
******************/
var testSampleRate=16000;
var testBitRate=16; //本例子只支持16位pcm，不支持其他值

var SendFrameSize=3200;/**** 每次发送指定二进制数据长度的数据帧，单位字节，16位pcm取值必须为2的整数倍。
16位16khz的pcm 1秒有：16000hz*16位/8比特=32000字节的数据，默认配置3200字节每秒发送大约10次
【设为0不指定长度】onProcess每次回调均立即发送一帧长度不定的pcm数据出去，大部分场景下均可以不使用固定的帧大小，比如各大平台的语音识别接口
******/

//重置环境，每次开始录音时必须先调用此方法，清理环境
var RealTimeSendReset=function(){
	send_pcmBuffer=new Int16Array(0);
	send_pcmSampleRate=testSampleRate;
	send_chunk=null;
	send_lastFrame=null;
	send_logNumber=0;
};
var send_pcmBuffer; //将pcm数据缓冲起来按固定大小切分发送
var send_pcmSampleRate; //pcm缓冲的采样率，等于testSampleRate，但取值过大时可能低于配置值
var send_chunk; //SampleData需要的上次转换结果，用于连续转换采样率
var send_lastFrame; //最后发送的一帧数据
var send_logNumber;

//=====实时处理核心函数==========
var RealTimeSendTry=function(buffers,bufferSampleRate,isClose){
	//提取出新的pcm数据
	var pcm=new Int16Array(0);
	if(buffers.length>0){
		//【关键代码】借用SampleData函数进行数据的连续处理，采样率转换是顺带的，得到新的pcm数据
		var chunk=Recorder.SampleData(buffers,bufferSampleRate,testSampleRate,send_chunk);
		send_chunk=chunk;
		
		pcm=chunk.data; //此时的pcm就是原始的音频16位pcm数据（小端LE），直接保存即为16位pcm文件、加个wav头即为wav文件、丢给mp3编码器转一下码即为mp3文件
		send_pcmSampleRate=chunk.sampleRate; //实际转换后的采样率，如果testSampleRate值比录音数据的采样率大，将会使用录音数据的采样率
	};
	
	//没有指定固定的帧大小，直接把pcm发送出去即可
	if(!SendFrameSize){
		TransferUpload(pcm,isClose);
		return;
	};
	
	//先将新的pcm写入缓冲，再按固定大小切分后发送
	var pcmBuffer=send_pcmBuffer;
	var tmp=new Int16Array(pcmBuffer.length+pcm.length);
	tmp.set(pcmBuffer,0);
	tmp.set(pcm,pcmBuffer.length);
	pcmBuffer=tmp;
	
	//循环切分出固定长度的数据帧
	var chunkSize=SendFrameSize/(testBitRate/8);
	while(true){
		//切分出固定长度的一帧数据
		if(pcmBuffer.length>=chunkSize){
			var frame=new Int16Array(pcmBuffer.subarray(0,chunkSize));
			pcmBuffer=new Int16Array(pcmBuffer.subarray(chunkSize));
			
			var closeVal=false;
			if(isClose && pcmBuffer.length==0){
				closeVal=true; //已关闭录音，且没有剩余要发送的数据了
			}
			TransferUpload(frame,closeVal);
			if(!closeVal) continue; //循环切分剩余数据
		}else if(isClose){
			//已关闭录音，但此时结尾剩余的数据不够一帧长度，结尾补0凑够一帧即可，或者直接丢弃结尾的这点数据
			var frame=new Int16Array(chunkSize);
			frame.set(pcmBuffer); pcmBuffer=new Int16Array(0);
			TransferUpload(frame,true);
		}
		break;
	}
	//剩余数据存回去，留给下次发送
	send_pcmBuffer=pcmBuffer;
};

//=====数据传输函数==========
var TransferUpload=function(pcmFrame,isClose){
	if(isClose && pcmFrame.length==0){
		//最后一帧数据，在没有指定固定的帧大小时，因为不是从onProcess调用的，pcmFrame的长度为0没有数据。可以修改成复杂一点的逻辑：停止录音时不做任何处理，等待下一次onProcess回调时再调用实际的停止录音，这样pcm就一直数据了；或者延迟一帧的发送，isClose时取延迟的这帧作为最后一帧
		//这里使用简单的逻辑：直接生成一帧静默的pcm（全0），使用上一帧的长度或50ms长度
		//return; //如果不需要处理最后一帧数据，直接return不做任何处理
		var len=send_lastFrame?send_lastFrame.length
				:Math.round(send_pcmSampleRate/1000*50);
		pcmFrame=new Int16Array(len);
	}
	send_lastFrame=pcmFrame;
	
	//*********发送方式一：Base64文本发送***************
	var str="",bytes=new Uint8Array(pcmFrame.buffer);
	for(var i=0,L=bytes.length;i<L;i++) str+=String.fromCharCode(bytes[i]);
	var base64=btoa(str);
	//可以实现
	//WebSocket send(base64) ...
	//WebRTC send(base64) ...
	//XMLHttpRequest send(base64) ...
	
	//*********发送方式二：直接ArrayBuffer二进制发送***************
	var arrayBuffer=pcmFrame.buffer;
	//可以实现
	//WebSocket send(arrayBuffer) ...
	//WebRTC send(arrayBuffer) ...
	//XMLHttpRequest send(arrayBuffer) ...
	
	
	//****这里仅显示一个日志 意思意思****
	var number=++send_logNumber;
	testLogFrame(pcmFrame, number);
	
	//最后一次调用发送，此时的pcmFrame可以认为是最后一帧
	if(isClose){
		Runtime.Log("[No."+(number<100?("000"+number).substr(-3):number)+"]已停止传输");
		testMergeFrames();
	};
};



//测试用
var testFrames,testUseMerge;
//测试合并所有数据帧成一个完整pcm文件，直接二进制拼接即可
var testMergeFrames=function(){
	if(!testUseMerge){
		return Runtime.Log("未勾选合并成一个完整pcm，不测试合并成完整pcm文件","#aaa");
	}
	var size=0; for(var i=0;i<testFrames.length;i++)size+=testFrames[i].length;
	if(size==0){
		return Runtime.Log("未录制得到pcm数据帧，不测试合并成完整pcm文件",1);
	}
	var pcm=new Int16Array(size);
	for(var i=0,offset=0;i<testFrames.length;i++){
		pcm.set(testFrames[i], offset);
		offset+=testFrames[i].length;
	}
	
	var recSet={type:"pcm",sampleRate:send_pcmSampleRate,bitRate:testBitRate};
	var dur=Math.round(pcm.length/recSet.sampleRate*1000);
	var blob=new Blob([pcm.buffer],{type:"audio/pcm"});
	Runtime.LogAudio(blob,dur,{set:recSet},testFrames.length+"帧pcm合并成一个完整pcm");
};
//测试一帧数据打一个日志
var testLogFrame=function(pcmFrame, number){
	if(testUseMerge) testFrames.push(pcmFrame);
	
	var recSet={type:"pcm",sampleRate:send_pcmSampleRate,bitRate:testBitRate};
	var dur=Math.round(pcmFrame.length/recSet.sampleRate*1000);
	var blob=new Blob([pcmFrame.buffer],{type:"audio/pcm"});
	var logMsg="No."+(number<100?("000"+number).substr(-3):number);
	Runtime.LogAudio(blob,dur,{set:recSet},logMsg);
	
	if(true && number%100==0){//emmm....
		Runtime.LogClear();
	};
};



//=====以下代码为音频数据源，采集原始音频用的==================
//加载框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
	,{url:RootFolder+"/src/engine/pcm.js",check:function(){return !Recorder.prototype.pcm}}
]);

//显示控制按钮
Runtime.Ctrls([
	{html:'<div style="padding-bottom:8px"><label><input class="useMerge" type="checkbox" checked>测试结束时合并成一个完整pcm（内存会持续变大，测试内存占用时要取消勾选）</label></div>'}
	,{name:"开始录音和按固定帧大小传输pcm",click:"recStart"}
	,{name:"停止录音",click:"recStop"}
]);



//调用录音
var rec;
function recStart(){
	if(rec){
		rec.close();
	};
	//配置有效性检查
	if(testBitRate!=16 || SendFrameSize%2==1){
		Runtime.Log("本例子只支持16位pcm SendFrameSize 必须为2的整数倍",1);
		return;
	};
	
	var clearBufferIdx=0,processTime=0;
	var rec2=rec=Recorder({
		type:"unknown" //这里特意使用unknown格式，方便清理内存
		,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate,newBufferIdx,asyncEnd){
			Runtime.Process.apply(null,arguments);
			processTime=Date.now();
			
			//实时释放清理内存，用于支持长时间录音；在指定了有效的type时，编码器内部可能还会有其他缓冲，必须同时提供takeoffEncodeChunk才能清理内存，否则type需要提供unknown格式来阻止编码器内部缓冲
			//这里进行了延迟操作（必须要的操作），只清理上次到现在之前的buffer，新的还未推入编码器进行编码需保留
			//if(this.clearBufferIdx>newBufferIdx){ this.clearBufferIdx=0 } //变量改到this里面时，重新录音了，这样写可以重置this环境
			for(var i=clearBufferIdx;i<newBufferIdx;i++){
				buffers[i]=null;
			};
			clearBufferIdx=newBufferIdx;
			
			//【关键代码】推入实时处理
			RealTimeSendTry(buffers,bufferSampleRate,false);
		}
	});
	
	rec2.open(function(){//打开麦克风授权获得相关资源
		if(rec2!=rec) return; //sync
		rec2.start();//开始录音
		Runtime.Log("已开始录音");
		
		//【稳如老狗WDT】可选的，监控是否在正常录音有onProcess回调，如果长时间没有回调就代表录音不正常
		var wdt=rec.watchDogTimer=setInterval(function(){
			if(!rec || wdt!=rec.watchDogTimer){ clearInterval(wdt); return } //sync
			if(Date.now()<rec.wdtPauseT) return; //如果暂停录音了就不检测，此demo没有用到暂停。puase时赋值rec.wdtPauseT=Date.now()*2（永不监控），resume时赋值rec.wdtPauseT=Date.now()+1000（1秒后再监控）
			if(Date.now()-(processTime||startTime)>1500){ clearInterval(wdt);
				Runtime.Log(processTime?"录音被中断":"录音未能正常开始",1);
				// ... 错误处理，关闭录音，提醒用户
			}
		},1000);
		var startTime=Date.now(); rec.wdtPauseT=0;
	},function(msg,isUserNotAllow){
		if(rec2!=rec) return; //sync
		Runtime.Log((isUserNotAllow?"UserNotAllow，":"")+"无法录音:"+msg, 1);
	});
	
	testUseMerge=document.querySelector(".useMerge").checked;
	testFrames=[]; //测试打日志用的
	RealTimeSendReset();//重置环境，开始录音时必须调用一次
};
function recStop(){
	var rec2=rec; rec=null; if(!rec2) return Runtime.Log("未开始录音",1);
	rec2.watchDogTimer=0; //停止监控onProcess超时
	rec2.close();//直接close掉即可，这个例子不需要获得最终的音频文件。unknown、wav等不支持实时编码的格式无法调用stop，因为onProcess里面清理掉了内存数据
	
	RealTimeSendTry([],0,true);//最后一次发送
};