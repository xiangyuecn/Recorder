/******************
《【教程】实时转码并上传》
作者：高坚果
时间：2019-10-22 23:04:49

通过onProcess回调可实现录音的实时处理；mp3和wav格式拥有极速转码特性，能做到边录音边转码；涉及Recorder两个核心方法：mock、SampleData。

如果不需要获得最终结果，可实时清理缓冲数据，避免占用过多内存，想录多久就录多久。
******************/

var SendInterval=50;//转码发送间隔（实际间隔比这个变量值偏大点，取决于bufferSize）。这个值可以设置很大，但不能设置很低，毕竟转码和传输还是要花费一定时间的，设备性能低下可能还处理不过来。
//mp3格式下一般大于500ms就能保证能够正常转码处理，wav大于100ms，剩下的问题就是传输速度了。由于转码操作都是串行的，录制过程中转码生成出来mp3顺序都是能够得到保证，但结束时最后几段数据可能产生顺序问题，需要留意。由于传输通道不一定稳定，后端接收到的顺序可能错乱，因此可以携带编号进行传输，完成后进行一次排序以纠正顺序错乱的问题。

//重置环境
var RealTimeSendTryReset=function(){
	realTimeSendTryTime=0;
};

var realTimeSendTryTime=0;
var realTimeSendTryNumber;
var transferUploadNumberMax;
var realTimeSendTryChunk;

//=====实时处理核心函数==========
var RealTimeSendTry=function(rec,isClose){
	var t1=Date.now(),endT=0,recImpl=Recorder.prototype;
	if(realTimeSendTryTime==0){
		realTimeSendTryTime=t1;
		realTimeSendTryNumber=0;
		transferUploadNumberMax=0;
		realTimeSendTryChunk=null;
	};
	if(!isClose && t1-realTimeSendTryTime<SendInterval){
		return;
	};
	realTimeSendTryTime=t1;
	var number=++realTimeSendTryNumber;
	
	var newSampleRate=16000;
	//借用SampleData函数进行数据的连续处理，采样率转换是顺带的
	var chunk=Recorder.SampleData(rec.buffers,rec.srcSampleRate,newSampleRate,realTimeSendTryChunk,{frameType:isClose?"":"mp3"});
	
	//清理已处理完的缓冲数据，释放内存以支持长时间录音，最后完成录音时不能调用stop，因为数据已经被清掉了
	for(var i=realTimeSendTryChunk?realTimeSendTryChunk.index:0;i<chunk.index;i++){
		rec.buffers[i]=null;
	};
	realTimeSendTryChunk=chunk;
	
	//没有新数据，不能进行mock转码
	if(chunk.data.length==0){
		TransferUpload(number,null,0,null,isClose);
		return;
	};
	
	//通过mock方法实时转码成mp3
	var recMock=Recorder({
		type:"mp3"
		,sampleRate:newSampleRate //采样率
		,bitRate:16 //比特率
	});
	recMock.mock(chunk.data,chunk.sampleRate);
	recMock.stop(function(blob,duration){
		//转码好就推入传输
		TransferUpload(number,blob,duration,recMock,isClose);
	},function(msg){
		//转码错误？没想到什么时候会产生错误！
		Runtime.Log("不应该出现的错误:"+msg);
	});
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
//显示控制按钮
Runtime.Ctrls([
	{name:"开始录音和传输",click:"recStart"}
	,{name:"停止录音",click:"recStop"}
]);

//加载框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
	,{url:RootFolder+"/src/engine/mp3-engine.js",check:function(){return !Recorder.lamejs}}
]);


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
			
			RealTimeSendTry(rec,false);//推入实时处理，因为是unknown格式，这里简化函数调用，没有用到buffers和bufferSampleRate，因为这些数据和rec.buffers是完全相同的。
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
	
	RealTimeSendTry(rec,true);//最后一次发送
};