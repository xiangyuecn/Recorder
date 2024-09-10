/******************
《【教程】【音频流】【上传】实时转码上传-实时帧回调版》
作者：高坚果
时间：2020-5-16 16:58:48

通过Recorder的takeoffEncodeChunk回调选项，可以实时接收到录音转码输出的二进制片段结果（数据帧）；因此可以流式的将数据进行上传，将所有数据帧直接二进制拼接到一起即为一个完整的音频文件；注意：回调的每一帧数据中会包含若干个音频帧，长度不是固定的，取决于音频格式对应的编码器。

本方法早期为mp3专版，现已适用于 mp3、pcm、amr、ogg、g711 等支持实时转码的所有格式，但不支持wav格式（因wav文件头需要整个文件的长度）；amr、ogg第一帧数据开头会带文件头，除ogg格式外其他格式的每一帧数据均可独立解码和播放，ogg需要合并成一个完整文件才能解码。

录音如果不需要获得最终结果，可实时清理缓冲数据（需延迟清理），避免占用过多内存，想录多久就录多久。

本方法和《【教程】【音频流】【上传】实时转码上传-通用转码版》的onProcess+mock实现有本质上的区别，onProcess+mock是实时将pcm片段独立的转成一个音频片段文件，部分格式拼接后的完整文件存在停顿杂音，takeoffEncodeChunk是直接得到音频编码器的实时输出结果，因此不会引入杂音影响到音质；pcm、g711格式无此问题。

【接收端要实时播放?】本示例代码上传过来的数据都是一小段一小段的数据片段文件，除ogg格式外每一段均可独立正常播放，接收端可以进行缓冲，实时的解码成PCM进行播放，解码时应当连续解码（比如使用同一个解码器）否则可能会引入杂音，可以参考《【教程】【音频流】【播放】实时解码播放音频片段》使用BufferStreamPlayer插件来播放。
******************/
var testSampleRate=16000;
var testBitRate=16;

var SendFrameSize=0;/**** 【不建议】每次发送指定二进制数据长度的数据帧，单位字节，默认0不指定长度
由于不同格式、不同采样率比特率下单个音频帧的大小很难确定（一个数据帧中包含若干个音频帧），如果指定了固定的发送的帧大小，会导致数据帧的首尾不一定刚好是完整的音频帧，进而导致无法独立的解码，解码时应当留意此问题
因此不建议使用固定的帧大小，编码器实时输出多长的数据就发送多长的数据出去即可
******/

//重置环境，每次开始录音时必须先调用此方法，清理环境
var RealTimeSendReset=function(){
	send_frameBuffer=new Uint8Array(0);
	send_logNumber=0;
};
var send_frameBuffer; //提供了SendFrameSize时，将数据缓冲起来按固定大小切分发送
var send_logNumber;

//=====实时处理核心函数==========
var RealTimeSendTry=function(chunkBytes,isClose){
	//没有指定固定的帧大小，直接把chunkBytes发送出去即可
	if(!SendFrameSize){
		TransferUpload(chunkBytes,isClose);
		return;
	};
	
	//先将数据写入缓冲，再按固定大小切分后发送 【不建议使用固定的帧大小】
	var frameBuffer=send_frameBuffer;
	var tmp=new Uint8Array(frameBuffer.length+chunkBytes.length);
	tmp.set(frameBuffer,0);
	tmp.set(chunkBytes,frameBuffer.length);
	frameBuffer=tmp;
	
	while(true){
		//切分出固定长度的一帧数据（注：包含若干个音频帧，首尾不一定刚好是完整的音频帧）
		if(frameBuffer.length>=SendFrameSize){
			var frame=new Uint8Array(frameBuffer.subarray(0,SendFrameSize));
			frameBuffer=new Uint8Array(frameBuffer.subarray(SendFrameSize));
			
			var closeVal=false;
			if(isClose && frameBuffer.length==0){
				closeVal=true; //已关闭录音，且没有剩余要发送的数据了
			}
			TransferUpload(frame,closeVal);
			if(!closeVal) continue; //循环切分剩余数据
		}else if(isClose){
			//已关闭录音，但此时结尾剩余的数据不够一帧长度
			var frame=frameBuffer; frameBuffer=new Uint8Array(0);
			TransferUpload(frame,true);
		}
		break;
	}
	//剩余数据存回去，留给下次发送
	send_frameBuffer=frameBuffer;
};

//=====数据传输函数==========
var TransferUpload=function(frameBytes,isClose){
	if(frameBytes.length>0){
		//*********发送方式一：Base64文本发送***************
		var str=""; for(var i=0,L=frameBytes.length;i<L;i++) str+=String.fromCharCode(frameBytes[i]);
		var base64=btoa(str);
		//可以实现
		//WebSocket send(base64) ...
		//WebRTC send(base64) ...
		//XMLHttpRequest send(base64) ...
		
		//*********发送方式二：直接ArrayBuffer二进制发送***************
		var arrayBuffer=frameBytes.buffer;
		//可以实现
		//WebSocket send(arrayBuffer) ...
		//WebRTC send(arrayBuffer) ...
		//XMLHttpRequest send(arrayBuffer) ...
		
		
		//****这里仅显示一个日志 意思意思****
		var number=++send_logNumber;
		testLogFrame(frameBytes, number);
	};
	
	//最后一次调用发送，注意此时的frameBytes不一定有数据，可能长度为0
	//请勿假设调用了rec.stop之后的takeoffEncodeChunk一定有回调并且是最后一帧，因为可能会回调 0-2 帧
	//请以isClose为准，isClose的当前帧或者前一帧，只要是有数据的就是最后一帧；因此如果需要获得最后一帧数据，可延迟一帧的发送，isClose时取当前帧或延迟的这帧作为最后一帧
	if(isClose){
		var number=send_logNumber;
		Runtime.Log("[No."+(number<100?("000"+number).substr(-3):number)+"]已停止传输");
		testMergeFrames();
	};
};



//测试用
var testRec,testFrames,testDuration,testUseMerge;
//测试合并所有数据帧成一个完整文件，直接二进制拼接即可
var testMergeFrames=function(){
	if(!testUseMerge){
		return Runtime.Log("未勾选合并成一个完整音频，不测试合并成完整音频文件","#aaa");
	}
	var size=0; for(var i=0;i<testFrames.length;i++)size+=testFrames[i].length;
	if(size==0){
		return Runtime.Log("未录制得到音频数据帧，不测试合并成完整音频文件",1);
	}
	var bytes=new Uint8Array(size);
	for(var i=0,offset=0;i<testFrames.length;i++){
		bytes.set(testFrames[i], offset);
		offset+=testFrames[i].length;
	}
	
	var recSet=testRec.set;
	var blob=new Blob([bytes.buffer],{type:"audio/"+recSet.type});
	Runtime.LogAudio(blob,testDuration,testRec,testFrames.length+"帧数据合并成一个完整音频");
};
//测试一帧数据打一个日志
var testLogFrame=function(frameBytes, number){
	if(testUseMerge) testFrames.push(frameBytes);
	
	var recSet=testRec.set;
	var dur=0; //简单估算数据时长，不一定准确
	if(recSet.type=="mp3"){
		dur=Math.round(frameBytes.length/recSet.bitRate*8);
	}else if(recSet.type=="pcm"){
		dur=Math.round(frameBytes.length/recSet.bitRate*8/recSet.sampleRate*1000);
	}else if(recSet.type=="g711a"){
		dur=Math.round(frameBytes.length/recSet.sampleRate*1000);
	}else if(recSet.type=="amr"){
		if(recSet.bitRate==12.2){ //20ms一个amr帧 32字节
			dur=Math.round(frameBytes.length/32*20);
		}
	}else if(recSet.type=="ogg"){
		//不会估算，ogg编码器凑够一页数据后才会回调，大概4kb数据一帧，时长未知
	}
	
	var blob=new Blob([frameBytes.buffer],{type:"audio/"+recSet.type});
	var logMsg="No."+(number<100?("000"+number).substr(-3):number);
	Runtime.LogAudio(blob,dur,testRec,logMsg);
	
	if(true && number%100==0){//emmm....
		Runtime.LogClear();
	};
};



//=====以下代码为音频数据源，采集原始音频用的==================
//加载框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
	,{url:RootFolder+"/src/engine/mp3-engine.js",check:function(){return !Recorder.lamejs}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
	,{url:RootFolder+"/src/engine/pcm.js",check:function(){return !Recorder.prototype.pcm}}
	,{url:RootFolder+"/src/engine/g711x.js",check:function(){return !Recorder.prototype.g711a}}
]);

//显示控制按钮
Runtime.Ctrls([
	{html:'<div style="padding-bottom:8px"><label><input class="useMerge" type="checkbox" checked>测试结束时合并成一个完整音频（内存会持续变大，测试内存占用时要取消勾选）</label></div>'}
	,{html:'<span>开始录音和传输：</span>'}
	,{name:"mp3",click:"recStart('mp3');Date.now"}
	,{name:"pcm",click:"recStart('pcm');Date.now"}
	,{name:"g711a",click:"recStart('g711a');Date.now"}
	,{name:"amr",click:"recStart_loadJs('amr');Date.now"}
	,{name:"ogg",click:"recStart_loadJs('ogg');Date.now"}
	,{html:'<div></div>'}
	,{name:"停止录音",click:"recStop"}
]);

//几个大一点的js，按需加载
function recStart_loadJs(type){
	var js=[{url:RootFolder+"/dist/engine/beta-amr.js",check:function(){return !Recorder.prototype.amr}}];
	if(type=="ogg"){
		js=[{url:RootFolder+"/dist/engine/beta-ogg.js",check:function(){return !Recorder.prototype.ogg}}];
	}
	Runtime.ImportJs(js,function(count){
		if(count) Runtime.Log("已加载"+type+"编码器");
		recStart(type);
	},function(err){
		Runtime.Log(err,1);
	},function(count){
		if(count==0) Runtime.Log("加载"+type+"编码器...");
	});
};


//调用录音
var rec;
function recStart(type){
	if(rec){
		rec.close();
	};
	
	var clearBufferIdx=0,processTime=0;
	var rec2=rec=Recorder({
		type:type
		,sampleRate:testSampleRate
		,bitRate:testBitRate
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
		}
		,takeoffEncodeChunk:function(chunkBytes){
			//【关键代码】接管实时转码，推入实时处理
			RealTimeSendTry(chunkBytes,false);
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
	testRec=rec2; testFrames=[]; testDuration=0; //测试打日志用的
	RealTimeSendReset();//重置环境，开始录音时必须调用一次
};
function recStop(){
	var rec2=rec; rec=null; if(!rec2) return Runtime.Log("未开始录音",1);
	rec2.watchDogTimer=0; //停止监控onProcess超时
	Runtime.Log("正在停止录音...","#aaa");
	var stopNext=function(){
		rec2.close();//关闭录音
		Runtime.Log("已结束录音","#aaa");
		RealTimeSendTry(new Uint8Array(0),true);//最后一次发送
	};
	
	//调用stop停止录音，让编码器输出可能存在的最后一段音频数据；stop时编码器不一定有数据输出，因此请勿假设stop后一定存在最后一帧，如果有数据输出，一定会在stop回调前调用takeoffEncodeChunk
	//注：wav等不支持实时编码的格式无法调用stop，因为onProcess里面清理掉了内存数据
	rec2.stop(function(blob,duration){
		//stop无法得到blob音频数据，因为提供了takeoffEncodeChunk时blob长度为0
		testDuration=duration; //测试打日志用的
		stopNext();
	},function(err){
		//如果出错，直接不管，只结束录音
		Runtime.Log("不应该出现的stop错误："+err,1);
		stopNext();
	});
};