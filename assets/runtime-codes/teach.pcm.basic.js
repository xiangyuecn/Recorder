/******************
《【教程】【PCM基础】buffers转pcm、转采样率、改音量、pcm合并转mp3等格式》
作者：高坚果
时间：2024-08-20 21:09

Recorder的buffers和onProcess回调中的buffers都是[Int16Array,Int16Array,...]二维数组，其中Int16Array就是16位的pcm片段。

使用Recorder.SampleData方法可以转换pcm的采样率，比如需要16000采样率的pcm，可以用此方法将buffers转换采样率并得到对应的pcm。

播放器一般无法直接播放pcm文件，可使用rec.mock方法，可以将pcm转码成其他已支持的格式来播放；或者使用Recorder.wav_header方法生成一个wav头，拼接到pcm前面即可变成wav文件来播放；实时的pcm数据可使用BufferStreamPlayer来播放。

本教程中会将onProcess中实时得到的所有pcm片段数据缓冲起来，相当于拼接在一起得到一个大的pcm，最后再进行转码成wav和mp3两种格式，得到一个可以完整播放和保存的音频文件；在实时上传等处理中通过这些代码，可以方便试听发送出去的音频是否正常。

附带base64和pcm二进制互转，更多js中的二进制知识请参考《【Demo库】js二进制转换、基础知识-Base64/Hex/Int16Array/ArrayBuffer/Blob》
******************/

//=====将pcm转成wav，wav格式简单可以直接pcm前面拼接个wav头即可，或者通用点用下面的mock转码成wav=====
var pcm_to_wav=function(pcm,sampleRate,bitRate,tag){
	//pcm:Int16Array(16位小端LE)，如果是ArrayBuffer请用pcm=new Int16Array(arrayBuffer)
	//你也可以传个pcm片段数组，先合并成一个大的pcm，再来拼接wav头
	//pcm=pcms_merge([pcm1,pcm2,pcm3,...]);
	
	//生成wav头，wav_header方法需要 import 'recorder-core/src/engine/wav' 才会有
	//同理：wav文件直接去掉wav头就是pcm，参考下面 Recorder.wav_decode 将wav解码成pcm
	var header=Recorder.wav_header(1,1,sampleRate,bitRate,pcm.byteLength);
	var bytes=new Uint8Array(header.length+pcm.byteLength);
	bytes.set(header);
	bytes.set(new Uint8Array(pcm.buffer), header.length);
	
	//非浏览器环境可以直接用bytes或ArrayBuffer
	var arrayBuffer=bytes.buffer;
	//浏览器支持直接生成个Blob文件，测试打日志用的
	var blob=new Blob([arrayBuffer],{type:"audio/wav"});
	var recSet={type:"wav",sampleRate:sampleRate,bitRate:bitRate};
	var pcmDur=Math.round(pcm.length/sampleRate*1000);
	Runtime.LogAudio(blob,pcmDur,{set:recSet},(tag||"实时处理的所有pcm")+"转wav");
};

//如果你有多个pcm片段，可以用下面方法合并成单个pcm，合并多个Uint8Array也可以用这个方法
var pcms_merge=function(pcmList){ //pcmList:[pcm,pcm,...] pcm:Int16Array 采样率需要一致
	var size=0;for(var i=0;i<pcmList.length;i++) size+=pcmList[i].length;
	var pcm=new Int16Array(size); //参数是Uint8Array就改成new Uint8Array(size);
	for(var i=0,offset=0;i<pcmList.length;i++){
		pcm.set(pcmList[i],offset); //循环写入到前一个的后面，完成拼接
		offset+=pcmList[i].length;
	};
	return pcm;
}; //更多的二进制处理，比如pcm前面加个数据包包头，请参考 【Demo库】js二进制转换...

//=====将pcm转成mp3，使用mock转码，需要转成其他格式也是支持的=====
var pcm_to_mp3=function(pcm,sampleRate,tag){ //pcm:Int16Array
	//你也可以传个pcm片段数组，先合并成一个大的pcm，再来转码成其他格式
	//pcm=pcms_merge([pcm1,pcm2,pcm3,...]);
	
	//可转换成你需要的采样率
	var newSampleRate=/*3200;*/ sampleRate;
	if(newSampleRate>sampleRate){ //提高采样率需手动操作，默认只允许降低采样率
		pcm=Recorder.SampleData([pcm],sampleRate,newSampleRate).data;
		sampleRate=newSampleRate;
	}
	
	var recMock=Recorder({ type:"mp3",sampleRate:newSampleRate,bitRate:16 });
	recMock.mock(pcm,sampleRate);
	//下面stop默认返回blob文件，非浏览器环境可以改成返回ArrayBuffer
	//recMock.dataType="arraybuffer";
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
	console.log(tips,{base64:base64});
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
	if(!pcm16.length) return Runtime.Log("请先录个音",1);
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


//=====降低/放大pcm音量=====
var setVolume_Click=function(){
	//音量值：取值0.0-5.0（超过5也行，但削峰严重音质明显变差），0.0静音，1.0不改变音量，0.5降低一倍音量，2.0放大一倍音量
	var volume=+document.querySelector(".in_volume").value||0;
	
	var pcm=pcmBuffer, sampleRate=pcmBufferSampleRate;
	if(!pcm.length) return Runtime.Log("请先录个音",1);
	Runtime.Log("降低/放大pcm音量，倍数："+volume,"#aaa");
	
	//直接将pcm的每个采样值*倍数，即完成音量调整，注意结果限制在-0x8000 到 0x7FFF
	var newPcm=new Int16Array(pcm.length);
	for(var i=0,L=pcm.length;i<L;i++){
		newPcm[i]=Math.min(0x7FFF, Math.max(-0x8000, pcm[i]*volume));
	}
	
	pcm_to_wav(newPcm,sampleRate,16,"降低/放大pcm音量"+volume+"倍 | ");
};


//=====自动调整pcm音量，用于录音音量过低时自动放大；注意：只支持完整pcm处理，实时处理效果会很差（需自行平衡maxSample取值），如果无声音将会放大噪声=====
var autoVolume_Click=function(){
	//pcm的最大采样值/0x7FFF的比值，如果低于此比例，最大采样值将自动放大到此比例，放大倍数不超过最大倍数
	var autoRatio=+document.querySelector(".in_autoRatio").value||0.6;
	var autoMax=+document.querySelector(".in_autoMax").value||160; //0x7fff*0.6/127≈160
	var autoMinSample=+document.querySelector(".in_autoMinSample").value||127;
	
	var pcm=pcmBuffer, sampleRate=pcmBufferSampleRate;
	if(!pcm.length) return Runtime.Log("请先录个音",1);
	
	//查找出最大采样值，可以在录音的onProcess中进行计算得到，结束录音后直接判断
	var maxSample=0;
	for(var i=0,L=pcm.length;i<L;i++){
		var v=pcm[i];
		maxSample=v<0? (-v>maxSample?-v:maxSample) : (v>maxSample?v:maxSample);
	}
	//判断是否要自动放大
	var bl=maxSample/0x7FFF, newPcm=pcm;
	if(maxSample<autoMinSample){ //音量太低或完全静音
		bl=0;
	}else if(bl<autoRatio){ //需要放大，且至少有点音量
		bl=0x7FFF*autoRatio/maxSample;
		bl=Math.min(bl, autoMax);
		
		//直接将pcm的每个采样值*倍数，即完成音量调整，注意结果限制在-0x8000 到 0x7FFF
		newPcm=new Int16Array(pcm.length);
		for(var i=0,L=pcm.length;i<L;i++){
			newPcm[i]=Math.min(0x7FFF, Math.max(-0x8000, pcm[i]*bl));
		}
	}else{ //不需要放大
		bl=1;
	}
	
	Runtime.Log("自动调整pcm音量"+bl.toFixed(2)+"倍，maxSample:"+maxSample+" autoRatio:"+autoRatio+" autoMax:"+autoMax+" autoMinSample:"+autoMinSample,"#aaa");
	pcm_to_wav(newPcm,sampleRate,16,"自动调整pcm音量"+bl.toFixed(2)+"倍 | ");
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
	
	,{html:'<div style="font-size:12px;padding-top:10px"><label><input type="checkbox" class="in_AGC">录音禁用自动增益AGC(audioTrackSet.autoGainControl)：AGC参数的生效依赖依回声消除AEC(echoCancellation)未被显式禁用，所以禁用了AEC或AGC都会导致录音音量变小或非常小（尤其是iOS），需要不禁用AEC+AGC才会有增益效果</label></div>'}
	
	,{html:"<hr/>"}
	,{name:"降低/放大pcm音量",click:"setVolume_Click"}
	,{html:'<span style="font-size:12px">音量倍数：<input class="in_volume" placeholder="0.1-5.0" style="width:50px"> 小于1降低音量，大于1放大音量（超过5也行，但削峰严重音质明显变差），0.0静音，1.0不改变音量，0.5降低一倍音量，2.0放大一倍音量</span>'}
	
	,{html:"<hr/>"}
	,{name:"自动调整pcm音量",click:"autoVolume_Click"}
	,{html:'<span style="font-size:12px">标准化比例：<input class="in_autoRatio" placeholder="0.5-1.0" style="width:50px"> 为pcm的最大采样值/0x7FFF的比值，如果低于此比例，最大采样值将自动放大到此比例，放大倍数不超过最大 <input class="in_autoMax" placeholder="160" style="width:50px"> 倍，如果最大采样值低于 <input class="in_autoMinSample" placeholder="127" style="width:50px"> 当做静音不放大处理（取值100-0x7FFF）；用于录音音量过低时自动放大（如果无声音将会放大噪声），比如手机上禁用了回声消除时音量太低放大一下</span>'}
	
	,{html:"<hr/>"}
	
	,{choiceFile:{
		multiple:false,name:"wav",title:"解码成待处理的pcm",mime:"audio/wav"
		,process:function(fileName,arrayBuffer,filesCount,fileIdx,endCall){
			//内置的wav解码得到pcm
			Recorder.wav_decode(arrayBuffer,function(pcm,sampleRate,wavInfo){
				pcm_to_wav(pcm,sampleRate,16,"解码的pcm | ");
				Runtime.Log("已解码wav "+sampleRate+" "+JSON.stringify(wavInfo));
				pcmBuffer=pcm;
				pcmBufferSampleRate=sampleRate;
			},function(err){
				Runtime.Log(err,1);
			});
			endCall();
		}
	}}
]);



var pcmBuffer=new Int16Array(0); //所有pcm拼接到一起放到这个缓冲里面
var pcmBufferSampleRate=16000;

//=====调用录音=====
var rec;
function recStart(){
	if(rec) rec.close();
	pcmBuffer=new Int16Array(0); //重置环境
	var chunk=null; //SampleData需要的上次转换结果，用于连续转换采样率
	
	//可选是否打开回声消除（同时控制自动增益）
	var noAGC=document.querySelector(".in_AGC").checked;
	var audioTrackSet=null;
	if(noAGC){ //明确禁用，浏览器默认是打开回声消除
		audioTrackSet={echoCancellation:false,noiseSuppression:false,autoGainControl:false}
	}
	
	var rec2=rec=Recorder({
		type:"mp3"
		,sampleRate:44100
		,bitRate:128
		,audioTrackSet:audioTrackSet
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
