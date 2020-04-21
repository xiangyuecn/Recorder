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
,ConfigSet:{}
};



/**
RecordSDK配置函数，配置成功会调用True回调，否则走False
True() 配置成功回调
False(errMsg) 配置失败回调

set={
	sdkApi:""
	
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
		sdkApi:"//recordsdk.jiebian.life/npi/recordsdk"
		,onResult:NOOP
	};
	for(var k in Conf){
		baseSet[k]=Conf[k];
	};
	for(var k in set){
		baseSet[k]=set[k];
	};
	set=baseSet;
	This.ConfigSet=set;
	
	//给api加上http前缀，如果是file协议下，不加前缀没法用
	if(set.sdkApi.indexOf("//")==0){
		if(/^https:/i.test(location.href)){
			set.sdkApi="https:"+set.sdkApi;
		}else{
			set.sdkApi="http:"+set.sdkApi;
		};
	};
	
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







var NOOP=function(){};

var UA=navigator.userAgent;
var IsBad=/\bMSIE\b/i.test(UA);//明确拒绝支持的，或者压根加载不了js的浏览器
var IsWx=/MicroMessenger/i.test(UA);
var NeedHttps=window.isSecureContext===false;

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