/*
录音 RecordApp：app native支持文件。

特别注明：本文件涉及的功能需要IOS、Android App端的支持，如果你不能修改App的源码，并且坚决要使用本文件，那将会很困难。

本文件诞生的原因是因为IOS端WKWebView(UIWebView)中未开放getUserMedia功能来录音，只能寻求其他解决方案。Android端没有此问题，但Android里面使用网页的录音权限问题可能比原生的权限机制要复杂，为了简化js端的复杂性（出问题了好甩锅），不管是Android还是IOS都实现一下可能会简单很多。当以后IOS任何地方的网页都能录音时，本文件就可以删除了。

录音功能由原生App(Native)代码实现，通过JsBridge和h5进行交互。Native层需要提供：请求权限、开始录音、结束录音、定时回到PCM片段 这4个功能、接口。

JsBridge可以是自己实现的交互方式 或 别人提供的框架。因为不知道具体使用的桥接方式，对应的底下有三个方法需要自行实现。

录音必须是单声道的，因为这个库从头到尾就没有打算支持双声道。

https://github.com/xiangyuecn/Recorder
*/
(function(){
"use strict";

var App=RecordApp;
var platform=App.Platforms.Native;
var config=platform.Config;

platform.IsInit=true;

/*******App Native层在录音时定时回调本js方法*******/
/*
pcmData: int[] 当前单声道录音缓冲PCM片段，正常情况下为上次回调本接口开始到现在的录音数据
duration: 123456 已录制总时长
sampleRate：123456 录制音频实际的采样率
*/
window.top.NativeRecordReceivePCM=function(pcmData,duration,sampleRate){//无视iframe
	//本算法来自recorder-core.js，如果需要改动，两个地方一块改
	var size=pcmData.length;
	var power=0;
	for(var j=0;j<size;j++){
		power+=Math.abs(pcmData[j]);
	};
	power/=size;
	var powerLevel;
	if(power<1251){
		powerLevel=Math.round(power/1250*10);
	}else{
		powerLevel=Math.round(Math.min(100,Math.max(0,(1+Math.log(power/10000)/Math.log(10))*100)));
	}
	
	App.ReceivePCM(pcmData,powerLevel,duration,sampleRate);
};


/*******实现统一接口，以下方法参数请参考app.js RecordApp中的同名方法*******/

platform.RequestPermission=function(success,fail){
	//【需实现】
	fail("未实现RequestPermission调用App原生接口");
};
platform.Start=function(set,success,fail){
	//【需实现】
	fail("未实现Start调用App原生接口");
};
platform.Stop=function(success,fail){
	//【需实现】
	fail("未实现Stop调用App原生接口");
};
})();