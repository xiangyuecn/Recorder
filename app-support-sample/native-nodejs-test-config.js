/*
app-support/app.js中Native测试用的配置例子，用于调用NodeJs的原生接口来录音（本例子仅为模拟采集到麦克风数据）

【本文件的作用】：实现app-native-support.js内Config的四个标注为需实现的接口，提供本文件可免去修改源码，即可在已适配的NodeJS程序内录音。

可到assets/node-codes目录内运行test-recordapp.js，会调用本配置进行测试。

本配置例子仅支持在NodeJs环境内使用，仅模拟采集到麦克风数据，未真实调用录音功能。

https://github.com/xiangyuecn/Recorder
*/
(function(factory){
	var browser=typeof window=="object" && !!window.document;
	var win=browser?window:Object; //非浏览器环境，Recorder挂载在Object下面
	var rec=win.Recorder,ni=rec.i18n;
	factory(rec,ni,ni.$T,browser);
}(function(Recorder,i18n,$T,isBrowser){
"use strict";

var App=Recorder.RecordApp;
var CLog=App.CLog;
var platform=App.Platforms.Native;
var config=platform.Config;

CLog("[NodeJs Test] native-config init");


/*********模拟麦克风数据源**********/
var TestMic=App.NativeNodeJsTest_Microphone={
	setBuffer:function(pcm,sampleRate,reqErr,startErr,stopErr){
		this.buffer=pcm;
		this.sampleRate=sampleRate;
		this.reqErr=reqErr;
		this.startErr=startErr;
		this.stopErr=stopErr;
	}
	,start:function(){
		var This=this,idx=0;
		clearInterval(this.timer);
		this.timer=setInterval(function(){//模拟实时获取到麦克风数据
			if(!This.buffer || !This.buffer.length){
				CLog($T("t0xX::未设置模拟数据",":Simulation data not set"));
				return;
			}
			var pcm=new Int16Array(This.sampleRate/1000*100);
			if(idx>=This.buffer.length)idx=0;
			for(var i=0;i<pcm.length;i++){
				pcm[i]=This.buffer[idx++]||0;
			}
			//将实时获取到的数据传回给js
			App.NativeRecordReceivePCM(pcm,This.sampleRate);
		},100);
	}
	,stop:function(){
		clearInterval(this.timer);
	}
};


/*********实现app.js内Native中Config的接口*************/
config.IsApp=function(call){
	call(true);
}
config.JsBridgeRequestPermission=function(success,fail){
	if(TestMic.reqErr){
		return fail(TestMic.reqErr);
	}
	success();
}
config.JsBridgeStart=function(set,success,fail){
	if(TestMic.startErr){
		return fail(TestMic.startErr);
	}
	TestMic.start();
	success();
}
config.JsBridgeStop=function(success,fail){
	TestMic.stop();
	if(TestMic.stopErr){
		return fail(TestMic.stopErr);
	}
	success();
}
/*********接口实现END*************/


}));