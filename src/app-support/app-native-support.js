/*
录音 RecordApp: Hybrid App Native支持文件。

特别注明：本文件涉及的功能需要IOS、Android App端的支持，如果你不能修改App的源码，并且坚决要使用本文件，那将会很困难。

本文件诞生的原因是因为IOS端WKWebView(UIWebView)中未开放getUserMedia功能来录音，只能寻求其他解决方案。Android端没有此问题，但Android里面使用网页的录音权限问题可能比原生的权限机制要复杂，为了简化js端的复杂性（出问题了好甩锅），不管是Android还是IOS都实现一下可能会简单很多。当以后IOS任何地方的网页都能录音时，本文件就可以删除了。

录音功能由原生App(Native)代码实现，通过JsBridge和h5进行交互。Native层需要提供：请求权限、开始录音、结束录音、定时回调PCM[Int16]片段 这4个功能、接口。因为js层已自动加载Recorder和相应的js编码引擎，所以，Native层无需进行编码（Android和IOS的音频编码并非易事，且不易更新），大大简化App的逻辑和弹性。

录音必须是单声道的，因为这个库从头到尾就没有打算支持双声道。

JsBridge可以是自己实现的交互方式 或 别人提供的框架。因为不知道具体使用的桥接方式，对应的请求已抽象成了3个方法在Native.Config中，需自行实现。

本文件源码可以不用改动，因为需要改动的地方已放到了app.js的Native.Config中了；最终实际实现可参考app-support-sample目录内的配置文件，另外此目录内还有Android和IOS的demo项目，copy源码改改就能用。

https://github.com/xiangyuecn/Recorder
*/
(function(){
"use strict";

var App=RecordApp;
var platform=App.Platforms.Native;
var config=platform.Config;

platform.IsInit=true;

/*******Hybrid App Native层在录音时定时回调本js方法*******/
/*
pcmDataBase64: base64<Int16[]>字符串 当前单声道录音缓冲PCM片段，正常情况下为上次回调本接口开始到现在的录音数据，Int16[]二进制数组需要编码成base64字符串
sampleRate：123456 录制音频实际的采样率
*/
var onRecFn=window.NativeRecordReceivePCM=window.top.NativeRecordReceivePCM=function(pcmDataBase64,sampleRate){//无视iframe
	var rec=onRecFn.rec;
	if(!rec){
		console.error("未开始录音，但收到Native PCM数据");
		return;
	};
	if(!rec._appStart){
		rec.envStart(1,sampleRate);
	};
	rec._appStart=1;
	
	var bstr=atob(pcmDataBase64),n=bstr.length;
	var pcm=new Int16Array(n/2);
	var sum=0;
	for(var idx=0,s,i=0;i+2<=n;idx++,i+=2){
		s=((bstr.charCodeAt(i)|(bstr.charCodeAt(i+1)<<8))<<16)>>16;
		pcm[idx]=s;
		sum+=Math.abs(s);
	};
	
	rec.envIn(pcm,sum);
};


/*******实现统一接口，以下方法参数请参考app.js RecordApp中的同名方法*******/

platform.RequestPermission=function(success,fail){
	config.JsBridgeRequestPermission(success,fail);
};
platform.Start=function(set,success,fail){
	onRecFn.param=set;
	var rec=Recorder(set);
	rec.set.disableEnvInFix=true; //不要音频输入丢失补偿
	
	onRecFn.rec=rec;//等待第一个数据到来再调用rec.start
	App.__Rec=rec;//rec在stop时需要即时清理，因此暴露的内部变量需另外赋值
	
	config.JsBridgeStart(set,success,fail);
};
platform.Stop=function(success,fail){
	var failCall=function(msg){
		fail(msg);
		onRecFn.rec=null;
		App.__Rec=null;
	};
	config.JsBridgeStop(function(){
		var rec=onRecFn.rec;
		onRecFn.rec=null;
		
		if(!rec){
			failCall("未开始录音");
			return;
		};
		
		console.log("rec encode start: pcm:"+rec.recSize+" src:"+rec.srcSampleRate+" set:"+JSON.stringify(onRecFn.param));
		
		var end=function(){
			//把可能变更的配置写回去
			for(var k in rec.set){
				onRecFn.param[k]=rec.set[k];
			};
		};
		if(!success){
			end();
			failCall("仅清理资源");
			return;
		};
		rec.stop(function(blob,duration){
			console.log("rec encode end")
			end();
			success(blob,duration);
			App.__Rec=null;
		},function(msg){
			end();
			failCall(msg);
		});
	},failCall);
};
})();