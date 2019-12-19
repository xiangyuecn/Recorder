/*
app-support/app.js中Native测试用的配置例子，用于调用App的原生接口来录音

【本文件的作用】：实现app.js内Native中Config的四个标注为需实现的接口（这几个接口是app-native-support.js需要的），提供本文件可免去修改app.js源码。

本例子提供了一个JsBridge实现，并且本文件所在目录内还有Android和IOS的demo项目，app原生层已实现相应的接口，copy源码改改就能用。

此文件需要在app.js之前进行加载，【注意】【如果你App原生层实现不是用的demo中提供的接口文件，需自行重写本配置代码】

https://github.com/xiangyuecn/Recorder
*/
(function(){
"use strict";

/**【需修改】请使用自己的js文件目录，不要用github的不稳定。RecordApp会自动从这个目录内进行加载相关的实现文件、Recorder核心、编码引擎，会自动默认加载哪些文件，请查阅app.js内所有Platform的paths配置；如果这些文件你已手动全部加载，这个目录配置可以不用**/
window.RecordAppBaseFolder=window.PageSet_RecordAppBaseFolder||"https://xiangyuecn.github.io/Recorder/src/";



//Install Begin：在RecordApp准备好时执行这些代码
window.OnRecordAppInstalled=window.Native_RecordApp_Config=function(){
console.log("native-config install");

window.Native_RecordApp_Config=null;
window.IOS_Weixin_RecordApp_Config&&IOS_Weixin_RecordApp_Config();//如果ios-weixin-config.js也引入了的话，也需要初始化


var App=RecordApp;
var platform=App.Platforms.Native;
var config=platform.Config;






/******JsBridge简易版*******/
/*JsBridge名称定义
	Android为addJavascriptInterface注入到全局，提供RecordAppJsBridge.request(jsonString)
	IOS为userContentController绑定对象实现（此对象仅供识别，由于messageHandlers没有同步返回值（同步能实现异步，异步只能异步到死），因此不能参与数据交互，数据交互使用重写prompt实现）
*/
var JsBridgeName="RecordAppJsBridge";

var AppJsBridgeRequest=window.AppJsBridgeRequest=function(action,args,call){
	var p=GetParent();
	if(p!=window && p.AppJsBridgeRequest){//让iframe上层去处理，直到top层
		return p.AppJsBridgeRequest(action,args,call);
	};
	
	args||(args={});
	
	var callback="";
	if(call){
		callback=Callbacks.length+"";
		Callbacks.push(call);
	};
	
	var json={status:"",message:"",callback:callback,value:null};//接口调用返回数据格式标准
	
	var data=JSON.stringify({action:action,args:args,callback:callback});
	
	//APP差异化处理
	var val="";
	if(window[JsBridgeName]){//Android
		val=window[JsBridgeName].request(data);
	}else if( ((window.webkit||{}).messageHandlers||{})[JsBridgeName+"IsSet"] ){//IOS
		val=prompt(data);
	}else{//非App环境
		json.message="非app，不能调用接口";
	};
	val=val&&JSON.parse(val)||json;
	
	return val;//同步返回结果，异步返回会走AppJsBridgeRequest.Call
};
var GetParent=function(){
	try{
		var p=window.parent;
		p.x;
		return p;
	}catch(e){
		return window;
	};
};
var Callbacks=[""];

//app异步回调
AppJsBridgeRequest.Call=function(msg){
	if(Callbacks[msg.callback]){
		Callbacks[msg.callback](msg);
		Callbacks[msg.callback]=null;
	}else{
		//NOOP
	};
};
//app事件回调
AppJsBridgeRequest.Record=function(pcmDataBase64,sampleRate){
	NativeRecordReceivePCM(pcmDataBase64,sampleRate);
};
/******JsBridge简单实现 End*******/









/*********实现app.js内Native中Config的接口*************/
config.IsApp=function(call){
	/*识别为app环境*/
	if(window[JsBridgeName]||((window.webkit||{}).messageHandlers||{})[JsBridgeName+"IsSet"]){
		call(true);
		return;
	};
	call(false);//非app
};
config.JsBridgeRequestPermission=function(success,fail){
	//异步接口，录音权限检测，返回值int：1支持，2不支持，3用户拒绝
	AppJsBridgeRequest("recordPermission",{},function(json){
		if(json.status!="success"){
			fail(json.message);
			return;
		};
		if(json.value==1){
			success();
		}else if(json.value==3){
			fail("用户拒绝了录音权限",true);
		}else{
			fail("不支持录音");
		};
	});
};
var aliveInt;
config.JsBridgeStart=function(set,success,fail){
	//异步接口，开始录音
	AppJsBridgeRequest("recordStart",{param:set},function(json){
		if(json.status!="success"){
			fail(json.message);
			return;
		};
		
		success();
		
		//激活定时心跳，如果超过10秒未发心跳，app将会停止录音，防止未stop导致泄露
		aliveInt=setInterval(function(){
			//同步接口
			var val=AppJsBridgeRequest("recordAlive");
			//console.log("心跳已发出："+JSON.stringify(val));
		},5000);
	});
};
config.JsBridgeStop=function(success,fail){
	clearInterval(aliveInt);//关掉定时心跳
	
	//异步接口，结束录音
	AppJsBridgeRequest("recordStop",{},function(json){
		if(json.status!="success"){
			fail(json.message);
			return;
		};
		success();
	});
};
/*********接口实现END*************/



};
//Install End


//如果已加载RecordApp，手动进行触发
if(window.RecordApp){
	OnRecordAppInstalled();
};

})();


console.error("【注意】本网站正在使用RecordApp的native-config.js测试用的配置例子，这个配置如果要使用到你的网站，需要自己重写或修改后才能使用");
//别的站点引用弹窗醒目提示
if(!/^file:|:\/\/[^\/]*(jiebian.life|github.io)(\/|$)/.test(location.href)
	&& !localStorage["DisableAppSampleAlert"]
	&& !window.AppSampleAlert){
	window.AppSampleAlert=1;
	alert("【注意】当前网站正在使用RecordApp测试用的配置例子*.config.js，需要自己重写或修改后才能使用");
};
