/******************
《【教程】新录音从老录音接续、或录制中途插入音频》
作者：高坚果
时间：2021-10-25 10:55:55

本教程是Recorder内部使用的最为核心方法 rec.envIn(pcmData,pcmAbsSum) 的使用示例；配套的有私有方法`envStart(mockEnvInfo,sampleRate)`（私有方法请自行阅读源码），这两方法控制着录音的开启、实时音频输入逻辑，起到隔离平台环境差异的作用（Recorder、RecordApp共享使用了本机制，实现了录音过程和平台环境无关）。

通过调用 rec.envIn 方法，会在当前正在录制的录音中追加进新的pcm数据，每次调用本方法都会触发onProcess回调；从而可以做到：在录音过程中插入音频数据、在新的录音中注入之前老的录音的buffers数据可以做到接续录音 等业务逻辑。

由于 rec.envIn 实现机制复杂，理解起来很困难，不太建议使用；在你不知道确切用途的情况下，请勿随意调用。
******************/

//从素材录音接续录音，之前有一个录音已经stop了，通过这个例子，可以继续恢复录音
var recEnvInStart=function(){
	if(!srcOk){
		Runtime.Log("请先录制一段素材",1);
		return;
	}
	
	_start(function(){
		//将素材录音的buffers二维数组转成一维，就拿到pcm了，注意采样率
		var chunk=Recorder.SampleData(srcRec.buffers, srcRec.srcSampleRate, rec.srcSampleRate);
		//直接输入pcm数据到刚start的录音，这样就会接续录音了，因为是这里和start是同步操作，输入的数据会被放到开头
		//pcm的采样率必须和rec的srcSampleRate一致
		rec.envIn(chunk.data);//忽略pcmAbsSum参数，影响不大
		
		Runtime.Log("已从素材录音尾部接续开始新的录音，正在录音中...");
	});
};
//普通开始录音
var recStart=function(){
	_start(function(){
		Runtime.Log("已开始普通录音中...");
	});
};

var rec,curDuration;
var _start=function(onStart){
	rec&&rec.close();
	curDuration=0;
	
	rec=Recorder({
		type:"mp3"
		,sampleRate:16000
		,bitRate:16
		,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate){
			curDuration=bufferDuration;
			Runtime.Process.apply(null,arguments);
		}
	});
	var t=setTimeout(function(){
		Runtime.Log("无法录音：权限请求被忽略（超时假装手动点击了确认对话框）",1);
	},8000);
	
	rec.open(function(){//打开麦克风授权获得相关资源
		clearTimeout(t);
		
		rec.start();//开始录音
		onStart();
	},function(msg,isUserNotAllow){//用户拒绝未授权或不支持
		clearTimeout(t);
		Runtime.Log((isUserNotAllow?"UserNotAllow，":"")+"无法录音:"+msg, 1);
	});
};

//在当前正在进行的录音中插入素材的音频数据，录音结果会变长
var append=function(){
	if(!srcOk){
		Runtime.Log("未进行素材录音",1);
		return;
	}
	if(!rec){
		Runtime.Log("未开始录音",1);
		return;
	}
	
	//将素材录音的buffers二维数组转成一维，就拿到pcm了，注意采样率
	var chunk=Recorder.SampleData(srcRec.buffers, srcRec.srcSampleRate, rec.srcSampleRate);
	//直接输入pcm数据到当前录音，追加到录音后面，pcm的采样率必须和rec的srcSampleRate一致
	rec.envIn(chunk.data);//忽略pcmAbsSum参数，影响不大
	
	Runtime.Log("已在"+curDuration+"ms处插入了素材音频");
};

//停止录音
var recStop=function(){
	if(!rec){
		Runtime.Log("未开始录音",1);
		return;
	}
	rec.stop(function(blob,duration){
		rec.close();//释放录音资源
		
		Runtime.LogAudio(blob,duration,rec);
	},function(msg){
		Runtime.Log("录音失败:"+msg, 1);
	});
};



//=====以下代码无关紧要，音频数据源，采集原始音频用的==================
//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
	,{url:RootFolder+"/src/engine/mp3-engine.js",check:function(){return !Recorder.lamejs}}
]);

//显示控制按钮
Runtime.Ctrls([
	{name:"先录一段音作为素材",click:"srcStart"}
	,{name:"结束素材录音",click:"srcStop"}
	,{html:"<hr/>"}
	,{name:"从素材录音开始接续录音",click:"recEnvInStart"}
	,{name:"普通开始录音",click:"recStart"}
	,{name:"结束录音",click:"recStop"}
	,{html:"<hr/>"}
	,{name:"在当前录制中插入素材的音频",click:"append"}
	,{html:"<hr/>"}
]);


//调用录音
var srcRec,srcOk=0;
function srcStart(){
	srcRec&&srcRec.close();
	srcOk=0;
	
	srcRec=Recorder({
		type:"mp3"
		,sampleRate:16000
		,bitRate:16
		,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate){
			Runtime.Process.apply(null,arguments);
		}
	});
	var t=setTimeout(function(){
		Runtime.Log("无法录音：权限请求被忽略（超时假装手动点击了确认对话框）",1);
	},8000);
	
	srcRec.open(function(){//打开麦克风授权获得相关资源
		clearTimeout(t);
		srcRec.start();//开始录音
	},function(msg,isUserNotAllow){//用户拒绝未授权或不支持
		clearTimeout(t);
		Runtime.Log((isUserNotAllow?"UserNotAllow，":"")+"无法录音:"+msg, 1);
	});
};
function srcStop(){
	if(!srcRec){
		Runtime.Log("未开始素材录音",1);
		return;
	}
	srcRec.stop(function(blob,duration){
		srcRec.close();//释放录音资源
		srcOk=1;
		
		Runtime.LogAudio(blob,duration,srcRec,"素材录音");
	},function(msg){
		Runtime.Log("录音失败:"+msg, 1);
	});
};