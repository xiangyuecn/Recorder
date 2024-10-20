/******************
《【教程】【PCM基础】buffers转pcm、转采样率、pcm转成其他格式等》
作者：高坚果
时间：2024-08-20 21:09

Recorder的buffers和onProcess回调中的buffers都是[Int16Array,Int16Array,...]二维数组，其中Int16Array就是16位的pcm片段。

使用Recorder.SampleData方法可以转换pcm的采样率，比如需要16000采样率的pcm，可以用此方法将buffers转换采样率并得到对应的pcm。

播放器一般无法直接播放pcm文件，可使用rec.mock方法，可以将pcm转码成其他已支持的格式来播放；或者使用Recorder.wav_header方法生成一个wav头，拼接到pcm前面即可变成wav文件来播放；实时的pcm数据可使用BufferStreamPlayer来播放。

本教程中会将onProcess中实时得到的所有pcm片段数据缓冲起来，相当于拼接在一起得到一个大的pcm，最后再进行转码成wav和mp3两种格式，得到一个可以完整播放和保存的音频文件；在实时上传等处理中通过这些代码，可以方便试听发送出去的音频是否正常。

附带base64和pcm二进制互转，更多js中的二进制知识请参考《【Demo库】js二进制转换-Base64/Hex/Int16Array/ArrayBuffer/Blob》
******************/

//=====将pcm转成wav，wav格式简单可以直接pcm前面拼接个wav头即可，或者通用点用下面的mock转码成wav=====
var pcm_to_wav=function(pcm,sampleRate,bitRate,tag){ //pcm:Int16Array
	var recSet={type:"wav",sampleRate:sampleRate,bitRate:bitRate};
	var pcmDur=Math.round(pcm.length/sampleRate*1000);
	var header=Recorder.wav_header(1,1,sampleRate,bitRate,pcm.byteLength);
	var bytes=new Uint8Array(header.length+pcm.byteLength);
	bytes.set(header);
	bytes.set(new Uint8Array(pcm.buffer), header.length);
	
	var blob=new Blob([bytes.buffer],{type:"audio/wav"});
	Runtime.LogAudio(blob,pcmDur,{set:recSet},(tag||"实时处理的所有pcm")+"转wav");
};

//=====将pcm转成mp3，需要转成其他格式也是支持的=====
var pcm_to_mp3=function(pcm,sampleRate,tag){ //pcm:Int16Array
	var newSampleRate=sampleRate; //可转换成你需要的采样率
	
	var recMock=Recorder({ type:"mp3",sampleRate:newSampleRate,bitRate:16 });
	recMock.mock(pcm,sampleRate);
	//recMock.dataType="arraybuffer"; //下面stop默认返回blob文件，可以改成返回ArrayBuffer
	recMock.stop(function(blob,duration){
		Runtime.LogAudio(blob,duration,recMock,(tag||"实时处理的所有pcm")+"转mp3");
	},function(msg){
		//转码错误？没想到什么时候会产生错误！
		Runtime.Log("不应该出现的错误:"+msg,1);
	});
};



//=====base64和pcm二进制互转=====
var pcm_to_base64=function(pcm,sampleRate){ //pcm:Int16Array
	var bytes=new Uint8Array(pcm.buffer); //相当于无符号byte[]
	var str=""; for(var i=0;i<bytes.length;i++) str+=String.fromCharCode(bytes[i]);
	var base64=btoa(str); //已得到base64
	
	var tips="实时处理的所有pcm二进制数据（"+bytes.length+"字节）已转成base64（"+base64.length+"个字符）";
	console.log(tips,base64);
	Runtime.Log(tips+"，base64文本太长，请打开浏览器控制台查看","#aaa");
	lastBase64=base64;
	lastBase64SampleRate=sampleRate; //base64中的pcm的采样率
};
var base64_to_pcm=function(base64, sampleRate){
	var str=atob(base64);
	var bytes=new Uint8Array(str.length); //相当于无符号byte[]
	for(var i=0;i<bytes.length;i++) bytes[i]=str.charCodeAt(i);
	var pcm=new Int16Array(bytes.buffer); //已还原得到16位pcm数据
	
	Runtime.Log("base64（"+base64.length+"个字符）已转回pcm二进制数据（"+bytes.length+"字节）","#aaa");
	pcm_to_wav(pcm,sampleRate,16,"base64转回pcm");
	pcm_to_mp3(pcm,sampleRate,"base64转回pcm");
};

var lastBase64,lastBase64SampleRate;
var base64_to_pcmClick=function(){
	if(!lastBase64) return Runtime.Log("请先录个音",1);
	base64_to_pcm(lastBase64,lastBase64SampleRate);
};


//=====pcm 8位 16 位互转=====
	//更多的 24位 32位 转换，请参考 assets/工具-裸PCM转WAV播放测试.html 里面的源码
var pcm_8_16_Click=function(){
	var pcm16=pcmBuffer, sampleRate=pcmBufferSampleRate;
	Runtime.Log("pcm16位转8位，再8位转回16位","#aaa");
	
	//16位转8位
	var pcm8=new Uint8Array(pcm16.length); //pcm16:Int16Array
	for(var i=0,L=pcm16.length;i<L;i++){
		//16转8据说是雷霄骅的 https://blog.csdn.net/sevennight1989/article/details/85376149 细节比blqw的按比例的算法清晰点
		var val=(pcm16[i]>>8)+128;
		pcm8[i]=val;
	};
	
	//8位转16位
	var pcm16=new Int16Array(pcm8.length); //pcm8:Uint8Array
	for(var i=0,L=pcm8.length;i<L;i++){
		var b=pcm8[i];
		pcm16[i]=(b-128)<<8;
	};
	
	console.log("8位16位互转", pcmBuffer, pcm8, pcm16);
	pcm_to_wav(pcm8,sampleRate,8,"16位转8位 | ");
	pcm_to_wav(pcm16,sampleRate,16,"8位转16位 | ");
};



//=====加载框架=====
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
	,{url:RootFolder+"/src/engine/mp3-engine.js",check:function(){return !Recorder.lamejs}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
]);

//显示控制按钮
Runtime.Ctrls([
	{name:"开始录音",click:"recStart"}
	,{name:"结束录音",click:"recStop"}
	
	,{html:'<span style="margin-left:30px"></span>'}
	,{name:"base64转回pcm",click:"base64_to_pcmClick"}
	,{name:"8位16位pcm互转",click:"pcm_8_16_Click"}
]);



var pcmBuffer=new Int16Array(0); //所有pcm拼接到一起放到这个缓冲里面
var pcmBufferSampleRate=16000;

//=====调用录音=====
var rec;
function recStart(){
	if(rec) rec.close();
	pcmBuffer=new Int16Array(0); //重置环境
	var chunk=null; //SampleData需要的上次转换结果，用于连续转换采样率
	
	var rec2=rec=Recorder({
		type:"mp3"
		,sampleRate:44100
		,bitRate:128
		,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate,newBufferIdx,asyncEnd){
			//onProcess是实时处理回调函数，大约1秒12次回调
			Runtime.Process.apply(null,arguments);
			
			//【关键代码】用SampleData函数进行数据的连续处理，转换采样率并得到新的pcm数据
			chunk=Recorder.SampleData(buffers,bufferSampleRate,pcmBufferSampleRate,chunk);
			//chunk=Recorder.SampleData(rec2.buffers,rec2.srcSampleRate,pcmBufferSampleRate,chunk); //直接使用rec2.buffers来处理也是一样的，rec2.buffers的采样率>=buffers的采样率
			//这个就是当前最新的pcm，采样率已转成16000，Int16Array可以直接发送使用，或发送pcm.buffer是ArrayBuffer
			var pcm=chunk.data; 
			
			//【关键代码】将实时处理的pcm拼接到缓冲结尾，结束录音时方便转码试听
			var tmp=new Int16Array(pcmBuffer.length+pcm.length);
			tmp.set(pcmBuffer,0);
			tmp.set(pcm,pcmBuffer.length);
			pcmBuffer=tmp;
		}
	});
	
	rec2.open(function(){//打开麦克风授权获得相关资源
		if(rec2!=rec) return; //sync
		rec2.start();//开始录音
		Runtime.Log("已开始录音");
	},function(msg,isUserNotAllow){
		if(rec2!=rec) return; //sync
		Runtime.Log((isUserNotAllow?"UserNotAllow，":"")+"无法录音:"+msg, 1);
	});
};

function recStop(){
	var rec2=rec; rec=null; if(!rec2) return Runtime.Log("未开始录音",1);
	rec2.stop(function(blob,duration){
		rec2.close();//关闭录音
		Runtime.LogAudio(blob,duration,rec2,"stop得到的录音");
		
		pcm_to_base64(pcmBuffer, pcmBufferSampleRate); //pcm二进制数据转成base64
		pcm_to_wav(pcmBuffer, pcmBufferSampleRate, 16); //pcm转wav
		pcm_to_mp3(pcmBuffer, pcmBufferSampleRate); //pcm转mp3
	},function(msg){
		rec.close();
		Runtime.Log("录音失败:"+msg, 1);
	});
};
