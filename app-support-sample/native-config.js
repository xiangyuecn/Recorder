/*
app-support/app.js中Native测试用的配置例子，用于调用Hybrid App的原生接口来录音

【本文件的作用】：实现app-native-support.js内Config的四个标注为需实现的接口，提供本文件可免去修改源码，即可在Android和iOS已适配的Hybrid App内录音（H5调用App原生录音接口）。

本例子提供了一个JsBridge实现，并且本文件所在目录内还有Android和iOS的demo项目，app原生层已实现相应的接口，copy源码改改就能用。

本配置例子仅支持在浏览器环境内使用，可以在iframe中使用（含跨域），但未适配非浏览器环境。

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

CLog("[Hybrid App] native-config init");



if(isBrowser){
/******JsBridge简易版*******/
/*JsBridge名称定义
	Android为addJavascriptInterface注入到全局，提供RecordAppJsBridge.request(jsonString)
	iOS为userContentController绑定对象实现（此对象仅供识别，由于messageHandlers没有同步返回值（同步能实现异步，异步只能异步到死），因此不能参与数据交互，数据交互使用重写prompt实现）
*/
var JsBridgeName="RecordAppJsBridge";

var AppJsBridgeRequest=window.AppJsBridgeRequest=function(action,args,call){
	var p=window.top;
	var pfn=0;
	try{//让顶层window去处理，如果跨域无权限就算了
		pfn=p.AppJsBridgeRequest;
	}catch(e){
		CLog($T("qkwO::检测到跨域iframe，AppJsBridgeRequest将由Native通过执行postMessage转发来兼容数据的返回",":When a cross-domain iframe is detected, AppJsBridgeRequest will be returned by Native by performing postMessage forwarding."),3);
	};
	if(pfn && pfn!=AppJsBridgeRequest){
		return pfn(action,args,call);
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
	}else if( ((window.webkit||{}).messageHandlers||{})[JsBridgeName+"IsSet"] ){//iOS
		val=prompt(data);
	}else{//非App环境
		json.message=$T("jXZB::非app，不能调用接口",":Non-app, cannot call the interface");
		if(call) AppJsBridgeRequest.Call(json);
	};
	val=val&&JSON.parse(val)||json;
	
	return val;//同步返回结果，异步返回会走AppJsBridgeRequest.Call
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

//尝试注入顶层window，用于接收Native回调数据，此处特殊处理一下，省得跨域的iframe无权限
//本JsBridge因为多了异步回调方法，因此对NativeRecordReceivePCM封装了一层，没有用它自带的postMessage转发兼容实现，其实这里的代码和它的代码是一样的。
try{
	window.top.AppJsBridgeRequest=AppJsBridgeRequest;
}catch(e){
	var tipsFn=function(){
		CLog($T("bFcE::检测到跨域iframe，AppJsBridgeRequest无法注入到顶层，已监听postMessage，Native通过执行postMessage转发来兼容数据返回",":Cross-domain iframe detected, AppJsBridgeRequest cannot be injected into the top level, postMessage has been listened to, and Native performs postMessage forwarding to support data return."),3);
		if(window.parent!=window.top){
			CLog($T("9cSl::RecordApp Native Config示例不支持跨域iframe超过1层，因为没有处理中间的iframe的window的postMessage转发",":The RecordApp Native Config example does not support cross-domain iframes with more than 1 layer, because the postMessage forwarding of the window of the intermediate iframe is not processed."),1);
		};
	};
	setTimeout(tipsFn,8000);
	tipsFn();
	
	addEventListener("message",function(e){//纯天然，无需考虑origin
		var data=e.data;
		if(data&&data.type=="AppJsBridgeRequest"){
			var action=data.action;
			data=data.data;
			if(action=="Call"){
				AppJsBridgeRequest.Call(data);
			}else if(action=="Record"){
				AppJsBridgeRequest.Record(data.pcmDataBase64, data.sampleRate);
			}else{
				CLog($T("jDCI::AppJsBridgeRequest未知postMessage：",":AppJsBridgeRequest unknown postMessage: ")+action,3);
			};
		};
	});
};
/******JsBridge简单实现 End*******/
};







/*********实现app.js内Native中Config的接口*************/
config.IsApp=function(call){
	if(!isBrowser){
		CLog($T("pvEs::测试用的配置文件native-config.js未适配非浏览器环境，无法进行App原生录音调用",":The configuration file native-config.js used for testing is not adapted to non-browser environments. Unable to make App native recording call"),3);
		call(false);
		return;
	};
	
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
			fail($T("wMEz::用户拒绝了录音权限",":User denied recording permission"),true);
		}else{
			fail($T("G7zU::不支持录音",":Does not support recording"));
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
		clearInterval(aliveInt);
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


}));