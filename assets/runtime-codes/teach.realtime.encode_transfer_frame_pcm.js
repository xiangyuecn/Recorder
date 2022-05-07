/******************
《【教程】【音频流】【上传】实时转码并上传-pcm固定帧大小》
作者：高坚果
时间：2022-04-26 20:58:37

通过onProcess回调可实现录音的实时处理；pcm格式拥有极速转码特性，能做到边录音边转码，流式的将数据进行上传；涉及Recorder两个核心方法：mock、SampleData。

pcm数据从中间任意位置（16位时为双字节 LE小端模式 Little Endian）截取出来都能正常播放，所以可以生成任意固定大小的帧，并且每帧均可独立播放；其他格式就没有这种特性了，比如mp3，截取出来的数据无法解码播放，必须满足特定的MP3帧格式才能播放；所以本demo只适用于pcm格式，不支持其他格式，其他格式如需按固定大小的数据帧上传到服务器，请参考《【教程】【音频流】【上传】实时转码并上传-通用版》。

如果不需要获得最终结果，可实时清理缓冲数据，避免占用过多内存，想录多久就录多久。

【pcm拼接】两个参数相同的pcm文件直接二进制拼接在一起即可成为长的pcm文件；
本demo中已实现了多个pcm片段文件合并函数：Recorder.PCMMerge，此函数可移植到后端使用；
方法文档：
	Recorder.PCMMerge(fileBytesList,bitRate,sampleRate,True,False)
		fileBytesList：[Uint8Array,...] 所有pcm文件列表，每项为一个文件Uint8Array二进制数组；列表内的所有pcm的比特率和采样率必须一致
		bitRate: pcm的位数，取值8或16
		sampleRate: pcm的采样率，比如16000
		True: fn(fileBytes,duration,info) 合并成功回调
				fileBytes：Uint8Array 为mp3二进制文件
				duration：合并后的时长
				info：{ sampleRate:123 //和参数一致 , bitRate:8 16 //和参数一致 }
		False: fn(errMsg) 出错回调（此函数并未用到）

【接收端要实时播放?】上传过来的数据都是一小段一小段的数据片段文件（每一段均可独立正常播放），接收端可以进行缓冲，实时的解码成PCM进行播放，可以参考《【教程】【音频流】【播放】实时解码播放音频片段》使用BufferStreamPlayer插件来播放。
******************/
var testSampleRate=16000;
var testBitRate=16;

var SendFrameSize=3200;/**** 每次发送指定二进制数据长度的数据帧，单位字节，16位pcm取值必须为2的整数倍，8位随意。
16位16khz的pcm 1秒有：16000hz*16位/8比特=32000字节的数据，默认配置3200字节每秒发送大约10次
******/

//重置环境，每次开始录音时必须先调用此方法，清理环境
var RealTimeSendTryReset=function(){
	realTimeSendTryChunks=null;
};

var realTimeSendTryNumber;
var transferUploadNumberMax;
var realTimeSendTryChunk;
var realTimeSendTryChunks;

//=====实时处理核心函数==========
var RealTimeSendTry=function(buffers,bufferSampleRate,isClose){
	if(realTimeSendTryChunks==null){
		realTimeSendTryNumber=0;
		transferUploadNumberMax=0;
		realTimeSendTryChunk=null;
		realTimeSendTryChunks=[];
	};
	//配置有效性检查
	if(testBitRate==16 && SendFrameSize%2==1){
		Runtime.Log("16位pcm SendFrameSize 必须为2的整数倍",1);
		return;
	};
	
	var pcm=[],pcmSampleRate=0;
	if(buffers.length>0){
		//借用SampleData函数进行数据的连续处理，采样率转换是顺带的，得到新的pcm数据
		var chunk=Recorder.SampleData(buffers,bufferSampleRate,testSampleRate,realTimeSendTryChunk);
		
		//清理已处理完的缓冲数据，释放内存以支持长时间录音，最后完成录音时不能调用stop，因为数据已经被清掉了
		for(var i=realTimeSendTryChunk?realTimeSendTryChunk.index:0;i<chunk.index;i++){
			buffers[i]=null;
		};
		realTimeSendTryChunk=chunk;//此时的chunk.data就是原始的音频16位pcm数据（小端LE），直接保存即为16位pcm文件、加个wav头即为wav文件、丢给mp3编码器转一下码即为mp3文件
		
		pcm=chunk.data;
		pcmSampleRate=chunk.sampleRate;
		
		if(pcmSampleRate!=testSampleRate)//除非是onProcess给的bufferSampleRate低于testSampleRate
			throw new Error("不应该出现pcm采样率"+pcmSampleRate+"和需要的采样率"+testSampleRate+"不一致");
	};
	
	//将pcm数据丢进缓冲，凑够一帧发送，缓冲内的数据可能有多帧，循环切分发送
	if(pcm.length>0){
		realTimeSendTryChunks.push({pcm:pcm,pcmSampleRate:pcmSampleRate});
	};
	
	//从缓冲中切出一帧数据
	var chunkSize=SendFrameSize/(testBitRate/8);//8位时需要的采样数和帧大小一致，16位时采样数为帧大小的一半
	var pcm=new Int16Array(chunkSize),pcmSampleRate=0;
	var pcmOK=false,pcmLen=0;
	for1:for(var i1=0;i1<realTimeSendTryChunks.length;i1++){
		var chunk=realTimeSendTryChunks[i1];
		pcmSampleRate=chunk.pcmSampleRate;
		
		for(var i2=chunk.offset||0;i2<chunk.pcm.length;i2++){
			pcm[pcmLen]=chunk.pcm[i2];
			pcmLen++;
			
			//满一帧了，清除已消费掉的缓冲
			if(pcmLen==chunkSize){
				pcmOK=true;
				chunk.offset=i2+1;
				for(var i3=0;i3<i1;i3++){
					realTimeSendTryChunks.splice(0,1);
				};
				break for1;
			}
		}
	};
	
	//缓冲的数据不够一帧时，不发送 或者 是结束了
	if(!pcmOK){
		if(isClose){
			var number=++realTimeSendTryNumber;
			TransferUpload(number,null,0,null,isClose);
		};
		return;
	};
	
	//16位pcm格式可以不经过mock转码，直接发送new Blob([pcm],"audio/pcm") 但8位的就必须转码，通用起见，均转码处理，pcm转码速度极快
	var number=++realTimeSendTryNumber;
	var encStartTime=Date.now();
	var recMock=Recorder({
		type:"pcm"
		,sampleRate:testSampleRate //需要转换成的采样率
		,bitRate:testBitRate //需要转换成的比特率
	});
	recMock.mock(pcm,pcmSampleRate);
	recMock.stop(function(blob,duration){
		blob.encTime=Date.now()-encStartTime;
		
		//转码好就推入传输
		TransferUpload(number,blob,duration,recMock,false);
		
		//循环调用，继续切分缓冲中的数据帧，直到不够一帧
		RealTimeSendTry([], 0, isClose);
	},function(msg){
		//转码错误？没想到什么时候会产生错误！
		Runtime.Log("不应该出现的错误:"+msg,1);
	});
};



//=====数据传输函数==========
var TransferUpload=function(number,blobOrNull,duration,blobRec,isClose){
	transferUploadNumberMax=Math.max(transferUploadNumberMax,number);
	if(blobOrNull){
		var blob=blobOrNull;
		var encTime=blob.encTime;
		
		//*********发送方式一：Base64文本发送***************
		var reader=new FileReader();
		reader.onloadend=function(){
			var base64=(/.+;\s*base64\s*,\s*(.+)$/i.exec(reader.result)||[])[1];
			
			//可以实现
			//WebSocket send(base64) ...
			//WebRTC send(base64) ...
			//XMLHttpRequest send(base64) ...
			
			//这里啥也不干
		};
		reader.readAsDataURL(blob);
		
		//*********发送方式二：Blob二进制发送***************
		//可以实现
		//WebSocket send(blob) ...
		//WebRTC send(blob) ...
		//XMLHttpRequest send(blob) ...
		
		
		//****这里仅 console.log一下 意思意思****
		var numberFail=number<transferUploadNumberMax?'<span style="color:red">顺序错乱的数据，如果要求不高可以直接丢弃</span>':"";
		var logMsg="No."+(number<100?("000"+number).substr(-3):number)+numberFail;
		
		Runtime.LogAudio(blob,duration,blobRec,logMsg+"花"+("___"+encTime).substr(-3)+"ms");
		
		if(true && number%100==0){//emmm....
			Runtime.LogClear();
		};
	};
	
	if(isClose){
		Runtime.Log("No."+(number<100?("000"+number).substr(-3):number)+":已停止传输");
	};
};








//=====pcm文件合并核心函数==========
Recorder.PCMMerge=function(fileBytesList,bitRate,sampleRate,True,False){
	//计算所有文件总长度
	var size=0;
	for(var i=0;i<fileBytesList.length;i++){
		size+=fileBytesList[i].byteLength;
	};
	
	//全部直接拼接到一起
	var fileBytes=new Uint8Array(size);
	var pos=0;
	for(var i=0;i<fileBytesList.length;i++){
		var bytes=fileBytesList[i];
		fileBytes.set(bytes,pos);
		pos+=bytes.byteLength;
	};
	
	//计算合并后的总时长
	var duration=Math.round(size*8/bitRate/sampleRate*1000);
	
	True(fileBytes,duration,{ bitRate:bitRate,sampleRate:sampleRate });
};



//=====以下代码无关紧要，音频数据源，采集原始音频用的==================
//加载框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
	,{url:RootFolder+"/src/engine/pcm.js",check:function(){return !Recorder.prototype.pcm}}
]);

//显示控制按钮
Runtime.Ctrls([
	{name:"开始录音和按固定帧大小传输pcm",click:"recStart"}
	,{name:"停止录音",click:"recStop"}
	,{name:"合并日志中所有pcm",click:"testLogsMergeAll"}
]);


//合并日志中的所有pcm文件成一个文件
var testLogsMergeAll=function(){
	var audios=Runtime.LogAudios;
	
	var bitRate=testBitRate,sampleRate=testSampleRate;
	var idx=-1 +1,files=[],exclude=0,badConfig=0;
	var read=function(){
		idx++;
		if(idx>=audios.length){
			var tips=(exclude?"，已排除"+exclude+"个非pcm文件":"")
				+(badConfig?"，已排除"+badConfig+"个参数不同pcm文件":"");
			if(!files.length){
				Runtime.Log("至少需要录1段pcm"+tips,1);
				return;
			};
			Recorder.PCMMerge(files,bitRate,sampleRate,function(file,duration,info){
				Runtime.Log("合并"+files.length+"个成功"+tips,2);
				info.type="pcm";
				Runtime.LogAudio(new Blob([file.buffer],{type:"audio/pcm"}),duration,{set:info},"已合并");
			},function(msg){
				Runtime.Log(msg+"，请清除日志后重试",1);
			});
			return;
		};
		
		var logItem=audios[idx],logSet=logItem.set||{};
		if(!/pcm/.test(logItem.blob.type)){
			exclude++;
			read();
			return;
		};
		if(bitRate!=logSet.bitRate || sampleRate!=logSet.sampleRate){
			badConfig++;//音频参数不一致的，不合并
			read();
			return;
		};
		
		var reader=new FileReader();
		reader.onloadend=function(){
			files.push(new Uint8Array(reader.result));
			read();
		};
		reader.readAsArrayBuffer(logItem.blob);
	};
	read();
};



//调用录音
var rec;
function recStart(){
	if(rec){
		rec.close();
	};
	rec=Recorder({
		type:"unknown"
		,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate){
			Runtime.Process.apply(null,arguments);
			
			//推入实时处理，因为是unknown格式，buffers和rec.buffers是完全相同的，只需清理buffers就能释放内存。
			RealTimeSendTry(buffers,bufferSampleRate,false);
		}
	});
	
	var t=setTimeout(function(){
		Runtime.Log("无法录音：权限请求被忽略（超时假装手动点击了确认对话框）",1);
	},8000);
	
	rec.open(function(){//打开麦克风授权获得相关资源
		clearTimeout(t);
		rec.start();//开始录音
		
		RealTimeSendTryReset();//重置环境，开始录音时必须调用一次
	},function(msg,isUserNotAllow){
		clearTimeout(t);
		Runtime.Log((isUserNotAllow?"UserNotAllow，":"")+"无法录音:"+msg, 1);
	});
};
function recStop(){
	rec.close();//直接close掉即可，这个例子不需要获得最终的音频文件
	
	RealTimeSendTry([],0,true);//最后一次发送
};