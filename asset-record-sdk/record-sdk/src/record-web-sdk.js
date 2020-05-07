/*=SET:Desc=*/
/*<@录音，RecordSDK：无限兼容任何浏览器的全功能录音一站式解决方案，一行代码搞定：语音转文字、HTTP录音、无公众号微信内JsSDK录音@>*/
/*
https://github.com/xiangyuecn/Recorder
*/
(function(factory){
	factory(window);
	//umd returnExports.js
	if(typeof(define)=='function' && define.amd){
		define(function(){
			return RecordSDK;
		});
	};
	if(typeof(module)=='object' && module.exports){
		module.exports=RecordSDK;
	};
}(function(window){
"use strict";

var RecordSDK={
LM:"2020-4-19 10:41:03"
,ConfigSet:{} //Config设置的配置
,ConfigSrv:{} //加载到的服务器端配置，数据参考服务器端getConfig接口
};



/**
RecordSDK配置函数，配置成功会调用True回调，否则走False；可以多次进行参数配置，js加载后立即进行一次调用，拉取服务器端配置信息；页面准备完毕后再进行一次调用，配置onResult回调，会尝试拿到上次可能存在的录音结果。
True() 配置成功回调
False(errMsg) 配置失败回调

set={
	sdkApi:"" //sdk的api服务地址，一般情况下无需设置；如果已获得服务器端源码部署了时提供你的地址，参考RecordSDK服务器端部署相关文档
	
	,onResult:fn(res) 当收到录音结果时回调，此回调可能会在录音结束时、Config完毕并且拿到了返回的录音时回调
			res={
				time:123456 //此结果创建的时间，一般为录音结束时的时间
				,action:"abc" //调用录音时提供的action，如果页面内存在多个功能模块需要录音，此参数用来区分是哪个功能的录音回调
				
				,isCancel:false //如果data为null时，isCancel为true代表用户取消了录音
				,errMsg:"" //如果data为null时，会提供不能获得录音的错误原因
				
				,data:{//录音结果数据，如果录音成功会是对象，否则是null
					,blob:Blob Object //录音音频文件对象，如果开启实时传输或自定义的不返回音频，blob可能为null
					,duration:123 //录音时长
					,custom:{} //自定义返回的更多内容
				}
			}
}
**/
RecordSDK.Config=function(set,True,False){
	var This=this,Conf=This.ConfigSet;
	var baseSet={
		sdkApi:""
		,onResult:NOOP
	};
	for(var k in Conf){
		baseSet[k]=Conf[k];
	};
	for(var k in set){
		baseSet[k]=set[k];
	};
	set=baseSet;
	This.ConfigSet=Conf=set;
	
	//给api加上http前缀，如果是file协议下，不加前缀没法用
	Conf.sdkApi=Conf.sdkApi||"//jiebian.life/paas/recordsdk";
	if(Conf.sdkApi.indexOf("//")==0){
		if(/^https:/i.test(location.href)){
			Conf.sdkApi="https:"+Conf.sdkApi;
		}else{
			Conf.sdkApi="http:"+Conf.sdkApi;
		};
	};
	
	var state=Conf._state;//0 未初始化 1 配置加载中 2 配置加载失败 3 配置加载成功
	var callbacks=Conf._cbs||[];
	Conf._cbs=callbacks;
	if(state==3){
		True&&True();
		return;
	};
	callbacks.push({t:True||NOOP,f:False||NOOP});
	if(state==1){
		return;
	};
	
	var end=function(s,m){
		Conf._state=s;
		for(var i=0;i<callbacks.length;i++){
			var o=callbacks[i];
			if(s==2){
				o.f(m);
			}else{
				o.t();
			};
		};
		callbacks.length=0;
	};
	LoadJsp("",{action:"getConfig"},function(data){
		This.ConfigSrv=data;
		Log(data.logMsg);
		Log("RecordSDK Config加载成功", data);
		
		end(3);
	},function(err){
		Log("RecordSDK Config加载失败",err,1);
		
		end(2,"录音配置加载失败，请重试:"+err);
	});
};

/**
开始录音，会打开录音界面，界面显示方式有两种：
1. 当前网页+浏览器支持录音时，直接在页面内弹出录音界面（embed）。
2. 当前网页+浏览器不支持录音时(如http网址、ios浏览器)，通过跳转到新页面显示录音界面；当前浏览器支持录音：跳转方式默认为window.open（未弹出时使用location.href）；当前浏览器不支持录音：显示二维码，通过二维码跳转到新页面显示录音（移动端提示截屏后到微信内扫一扫二维码录音，PC端提示扫一扫二维码录音）。
**/
RecordSDK.Record=function(set){
	var baseSet={
		type:"mp3" //录音格式，支持wav、mp3两个
		,bitRate:16 //比特率 wav:16或8位，MP3：8kbps 1k/s，8kbps 2k/s 录音文件很小
		,sampleRate:16000 //采样率，wav格式大小=sampleRate*时间；mp3此项对低比特率有影响，高比特率几乎无影响。
					//wav任意值，mp3取值范围：48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000
					//采样率参考https://www.cnblogs.com/devin87/p/mp3-recorder.html
		
		,embedOnly:false //是否仅仅允许在当前页面内录音；设为true会禁止任何形式的跳出当前页面，当环境不支持录音时只会提示当前环境不支持录音；默认false会使用任何可以行的办法去录音
		
		,runtime:"default" /*录音实现（包括UI、录音逻辑），取值：
					custom:完全自定义实现
					default:默认实现，界面内显示开始录音按钮+波形显示
					innerUI:半自定义实现，当网页+浏览器均支持录音时（embed）显示界面的方式为当前页面内自己的UI界面，其他跳转新页面录音的界面和default相同
				*/
		,runtimeSet:{
			processOnly:false //是否必须支持实时回调，在需要实时传输的时候设置为true，当环境不支持实时回调时，将会跳转到支持的浏览器内录音
			,args:{} /*可选，根据runtime不同，需要的参数也不同：
				runtime=custom：你自定义的代码内需要提供哪些参数，开始录音时会传这个args进去
				runtime=default、innerUI：可提供参数{
								transferURL:"" //如果提供，将会开启实时传输，此时processOnly配置项永远为true
							}
				runtime=default：可提供参数{
								touchMode:false //是否开启按住录音，false时是点击开始，点击结束，true时按住开始录音松手结束录音
							}
				*/
			
			,customID:"" //runtime为custom时必须提供，此id为账户管理后台的自定义id，显示录音界面时会加载此id内的自定义配置
		}
	};
	for(var k in set){
		baseSet[k]=set[k];
	};
	set=baseSet;
	
};










/**********************工具函数***********************/
var NOOP=function(){};
var RandomKey=RecordSDK.RandomKey=function(len){
	var s=[];
	for(var i=0;i<len;i++){
		s.push(String.fromCharCode(Math.floor(Math.random()*26)+97));
	};
	return s.join("");
};
var Now=RecordSDK.Now=function(){//为兼容古董
	return new Date().getTime();
};
var Log=RecordSDK.Log=function(m,o,isErr){
	if(window.console){
		if(isErr){
			console.error(m,o);
		}else{
			console.log(m,o);
		};
	};
};
var SetParam=RecordSDK.SetParam=function(url,params){
	url+=url.indexOf("?")+1?"&":"?";
	var i=0;
	for(var k in params){
		if(i!=0){ url+="&"; }; i++;
		
		var val=params[k];
		val=val==null?"":val+"";
		url+=encodeURIComponent(k)+"="+encodeURIComponent(val);
	};
	return url;
};

var UA=navigator.userAgent;
var IsBad=/\bMSIE\b/i.test(UA);//明确拒绝支持的，或者压根加载不了js的浏览器
var IsWx=/MicroMessenger/i.test(UA);
var NeedHttps=window.isSecureContext===false;


var Js=RecordSDK.Js=function(urls,True,False,win){
	var load=function(idx){
		if(idx>=urls.length){
			True();
			return;
		};
		var itm=urls[idx];
		var url=itm.url;
		if(itm.check()===false){
			load(idx+1);
			return;
		};
		
		LoadJs({
			url:url
			,timeout:itm.timeout||60000
		},function(){
			load(idx+1);
		},function(msg){
			False(msg+"，"+url);
		},win);
	};
	load(0);
};
/**
发起一个POST请求。此方法无需低版本兼容处理，能调用此方法的说明浏览器能录音
True(data,apiData)
False(msg, apiDataOrNull)

set={
	url:"" 请求地址，可以不填，默认为sdkApi
	,timeout:30000 请求超时，默认30秒
}
**/
var LoadData=RecordSDK.LoadData=function(set,data,True,False){
	True=True||NOOP;
	False=False||NOOP;
	if(typeof(set)=="string"){
		set={url:set};
	};
	set.url=set.url||RecordSDK.ConfigSet.sdkApi;
	
	var xhr=new XMLHttpRequest();
	xhr.timeout=set.timeout||30000;
	xhr.open("POST",set.url,true);
	xhr.onreadystatechange=function(){
		if(xhr.readyState==4){
			if(xhr.status==200){
				try{
					var o=JSON.parse(xhr.responseText);
				}catch(e){
					var m="接口返回未知格式数据";
					Log(m,e,1);
					False(m);
					return;
				};
				if(o.c!==0){
					False(o.m,o);
					return;
				};
				True(o.v,o);
			}else{
				False("请求失败["+xhr.status+"]");
			}
		}
	};
	var arr=[];
	for(var k in data){
		arr.push(k+"="+encodeURIComponent(data[k]));
	};
	xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	xhr.send(arr.join("&"));
};
/**
发起一个jsonp GET请求
True(data,apiData)
False(msg, apiDataOrNull)

data:{} 可选请求参数，会拼接到url中
set={
	url:"" 请求地址，可以不填，默认为sdkApi
	,allowCache:false 是否允许缓存，默认不允许会在url中添加t当前时间参数
	,timeout:30000 请求超时，默认30秒
}
**/
var LoadJsp=RecordSDK.LoadJsp=function(set,data,True,False){
	if(typeof(set)=="string"){
		set={url:set};
	};
	set.url=set.url||RecordSDK.ConfigSet.sdkApi;
	
	data=data||{};
	if(!set.allowCache&&!data.t){
		data.t=Now().toString(36);
	};
	set.url=SetParam(set.url,data);
	
	if(!set.jsonp){
		set.jsonp=true;
	};
	LoadJs(set,True,False);
};
var LoadJs=RecordSDK.LoadJs=function(set,True,False,win){
	win=win||window;
	var doc=win.document;
	if(typeof(set)=="string"){
		set={url:set};
	};
	
	var baseSet={
		url:""
		,jsonp:"" //true="callback"||"param" 存在为jsonp请求
		,timeout:30000
		,True:True||NOOP //True()|True(data,apiData) jsonp时为后面这个
		,False:False||NOOP //False(msg, apiDataOrNull)
	};
	for(var k in set){
		baseSet[k]=set[k];
	};
	set=baseSet;
	
	var isTimeout=false,int;
	if(set.True!=NOOP || set.False!=NOOP){
		int=setTimeout(function(){
				elem.onerror({message:"超时"});
				isTimeout=true;
			},set.timeout);
	};
	var jsonp=set.jsonp===true?"callback":set.jsonp;
	var jsonpOk=0;
	if(jsonp){
		var key="RecordSDK_Jsp"+RandomKey(16);
		var param={};param[jsonp]=key;
		set.url=SetParam(set.url,param);
		win[key]=function(data){
			clearTimeout(int);
			jsonpOk=isTimeout=true;
			delete win[key];
			
			if(data.c!==0){
				set.False(data.m||"接口调用失败",data);
				return;
			};
			set.True(data.v,data);
		};
	};
	
	var elem=doc.createElement("script");
	elem.setAttribute("type","text/javascript");
	elem.setAttribute("src",set.url);
	elem.onload=function(){
		clearTimeout(int);
		if(jsonp){
			if(jsonpOk){
				return;
			};
			set.False("请求失败:无响应");
			return;
		};
		if(isTimeout){
			return;
		};
		set.True();
	};
	elem.onerror=function(e){
		clearTimeout(int);
		if(isTimeout){
			return;
		};
		set.False("请求失败:"+(e.message||"-"));
	};
	doc.body.appendChild(elem);
};



var checkSupportH5=function(){
	var AC=window.AudioContext||window.webkitAudioContext;
	if(!AC){
		return false;
	};
	
	var scope=navigator;
	var UM=(scope.mediaDevices||{}).getUserMedia;
	if(!UM){
		UM=scope.getUserMedia||scope.webkitGetUserMedia||scope.mozGetUserMedia||scope.msGetUserMedia;
	};
	if(!UM){
		return false;
	};
	
	return true;
};





window.RecordSDK=RecordSDK;

}));