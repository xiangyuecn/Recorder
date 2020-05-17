/******************
《【教程】实时转码并上传-mp3专版》
作者：高坚果
时间：2020-5-16 16:58:48

mp3编码器实现了实时转码，能做到边录音边转码；通过takeoffEncodeChunk回调选项，可以实时接收到mp3转码二进制片段结果，将所有片段拼接到一起即为一个完整的mp3。

如果不需要获得最终结果，可实时清理缓冲数据（需延迟清理），避免占用过多内存，想录多久就录多久。

本方法和《【教程】实时转码并上传-通用版》的onProcess+mock实现有本质上的区别，onProcess+mock是实时将pcm片段转成一个mp3文件（会有首尾静默，导致拼接的完整mp3存在停顿杂音），takeoffEncodeChunk是直接得到pcm片段编码生成的mp3数据，因此不会引入停顿杂音影响到mp3的音质。

但takeoffEncodeChunk选项的使用条件比较苛刻，只有环境支持实时特性时才能正常进行录音，否则rec.open会走fail回调。
******************/
var testOutputWavLog=false;//顺带打一份wav的log，录音后执行mp3、wav合并的demo代码可对比音质
var testSampleRate=16000;
var testBitRate=16;

var SendInterval=300;//mp3 chunk数据会缓冲，当pcm的累积时长达到这个时长，就会传输发送。这个值在takeoffEncodeChunk实现下，使用0也不会有性能上的影响。

//重置环境
var RealTimeSendTryReset=function(){
	realTimeSendTryTime=0;
};

var realTimeSendTryTime=0;
var realTimeSendTryNumber;
var transferUploadNumberMax;
var realTimeSendTryBytesChunks;
var realTimeSendTryClearPrevBufferIdx;
var realTimeSendTryWavTestBuffers;
var realTimeSendTryWavTestSampleRate;

//=====实时处理核心函数==========
var RealTimeSendTry=function(chunkBytes,isClose){
	if(chunkBytes){//推入缓冲再说
		realTimeSendTryBytesChunks.push(chunkBytes);
	};
	
	var t1=Date.now();
	if(!isClose && t1-realTimeSendTryTime<SendInterval){
		return;//控制缓冲达到指定间隔才进行传输
	};
	realTimeSendTryTime=t1;
	var number=++realTimeSendTryNumber;
	
	
	//mp3缓冲的chunk拼接成一个更长点的mp3
	var len=0;
	for(var i=0;i<realTimeSendTryBytesChunks.length;i++){
		len+=realTimeSendTryBytesChunks[i].length;
	};
	var chunkData=new Uint8Array(len);
	for(var i=0,idx=0;i<realTimeSendTryBytesChunks.length;i++){
		var chunk=realTimeSendTryBytesChunks[i];
		chunkData.set(chunk,idx);
		idx+=chunk.length;
	};
	realTimeSendTryBytesChunks=[];
	
	//推入传输
	var blob=null,meta={};
	if(chunkData.length>0){//mp3不是空的
		blob=new Blob([chunkData],{type:"audio/mp3"});
		meta=Recorder.mp3ReadMeta([chunkData.buffer],chunkData.length)||{};//读取出这个mp3片段信息
	};
	TransferUpload(number
		,blob
		,meta.duration||0
		,{set:{
			type:"mp3"
			,sampleRate:meta.sampleRate
			,bitRate:meta.bitRate
		}}
		,isClose
	);
	
	
	if(testOutputWavLog){
		//测试输出一份wav，方便对比数据
		var recMock2=Recorder({
			type:"wav"
			,sampleRate:testSampleRate
			,bitRate:16
		});
		var chunk=Recorder.SampleData(realTimeSendTryWavTestBuffers,realTimeSendTryWavTestSampleRate,realTimeSendTryWavTestSampleRate);
		recMock2.mock(chunk.data,realTimeSendTryWavTestSampleRate);
		recMock2.stop(function(blob,duration){
			var logMsg="No."+(number<100?("000"+number).substr(-3):number);
			Runtime.LogAudio(blob,duration,recMock2,logMsg);
		});
	};
	realTimeSendTryWavTestBuffers=[];
};

//=====实时处理时清理一下内存（延迟清理），本方法先于RealTimeSendTry执行======
var RealTimeOnProcessClear=function(buffers,powerLevel,bufferDuration,bufferSampleRate,newBufferIdx,asyncEnd){
	if(realTimeSendTryTime==0){
		realTimeSendTryTime=Date.now();
		realTimeSendTryNumber=0;
		transferUploadNumberMax=0;
		realTimeSendTryBytesChunks=[];
		realTimeSendTryClearPrevBufferIdx=0;
		realTimeSendTryWavTestBuffers=[];
		realTimeSendTryWavTestSampleRate=0;
	};
	
	//清理PCM缓冲数据，最后完成录音时不能调用stop，因为数据已经被清掉了
	//这里进行了延迟操作（必须要的操作），只清理上次到现在的buffer
	for(var i=realTimeSendTryClearPrevBufferIdx;i<newBufferIdx;i++){
		buffers[i]=null;
	};
	realTimeSendTryClearPrevBufferIdx=newBufferIdx;
	
	//备份一下方便后面生成测试wav
	for(var i=newBufferIdx;i<buffers.length;i++){
		realTimeSendTryWavTestBuffers.push(buffers[i]);
	};
	realTimeSendTryWavTestSampleRate=bufferSampleRate;
};

//=====数据传输函数==========
var TransferUpload=function(number,blobOrNull,duration,blobRec,isClose){
	transferUploadNumberMax=Math.max(transferUploadNumberMax,number);
	if(blobOrNull){
		var blob=blobOrNull;
		
		//*********Read As Base64***************
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
		
		//*********Blob***************
		//可以实现
		//WebSocket send(blob) ...
		//WebRTC send(blob) ...
		//XMLHttpRequest send(blob) ...
		
		//这里仅 console send 意思意思
		var numberFail=number<transferUploadNumberMax?'<span style="color:red">顺序错乱的数据，如果要求不高可以直接丢弃，或者调大SendInterval试试</span>':"";
		var logMsg="No."+(number<100?("000"+number).substr(-3):number)+numberFail;
		
		Runtime.LogAudio(blob,duration,blobRec,logMsg);
		
		if(true && number%100==0){//emmm....
			Runtime.LogClear();
		};
	};
	
	if(isClose){
		Runtime.Log("No."+(number<100?("000"+number).substr(-3):number)+":已停止传输");
	};
};



//=====以下代码无关紧要，音频数据源，采集原始音频用的==================
//加载框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
	,{url:RootFolder+"/src/engine/mp3-engine.js",check:function(){return !Recorder.lamejs}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
]);

//显示控制按钮
Runtime.Ctrls([
	{name:"开始录音和传输mp3",click:"recStart"}
	,{name:"停止录音",click:"recStop"}
]);


//调用录音
var rec;
function recStart(){
	if(rec){
		rec.close();
	};
	
	rec=Recorder({
		type:"mp3"
		,sampleRate:testSampleRate
		,bitRate:testBitRate
		,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate,newBufferIdx,asyncEnd){
			Runtime.Process.apply(null,arguments);
			
			RealTimeOnProcessClear(buffers,powerLevel,bufferDuration,bufferSampleRate,newBufferIdx,asyncEnd);//实时数据处理，清理内存
		}
		,takeoffEncodeChunk:function(chunkBytes){
			//接管实时转码，推入实时处理
			RealTimeSendTry(chunkBytes,false);
		}
	});
	
	var t=setTimeout(function(){
		Runtime.Log("无法录音：权限请求被忽略（超时假装手动点击了确认对话框）",1);
	},8000);
	
	rec.open(function(){//打开麦克风授权获得相关资源
		clearTimeout(t);
		rec.start();//开始录音
		
		RealTimeSendTryReset();//重置
	},function(msg,isUserNotAllow){
		clearTimeout(t);
		Runtime.Log((isUserNotAllow?"UserNotAllow，":"")+"无法录音:"+msg, 1);
	});
};
function recStop(){
	rec.close();//直接close掉即可，这个例子不需要获得最终的音频文件
	
	RealTimeSendTry(null,true);//最后一次发送
};