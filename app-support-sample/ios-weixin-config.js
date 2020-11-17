/*
app-support/app.js中IOS-Weixin测试用的配置例子，用于支持ios的微信中使用微信JsSDK来录音

【本文件的作用】：实现app.js内IOS-Weixin中Config的两个标注为需实现的接口（这几个接口是app-ios-weixin-support.js需要的），提供本文件可免去修改app.js源码。

此文件需要在app.js之前进行加载，【注意】【本文件需要修改后才能用到你的网站】

支持在iframe中使用，但不支持在跨域。

https://github.com/xiangyuecn/Recorder
*/
(function(){
"use strict";

/******简化后的使用配置修改项******/
//可简单修改此处配置即可正常使用。当然参考本例子全部自己写是最佳选择，可能需要多花点时间。

/**【需修改】请使用自己的js文件目录，不要用github的不稳定。RecordApp会自动从这个目录内进行加载相关的实现文件、Recorder核心、编码引擎，会自动默认加载哪些文件，请查阅app.js内所有Platform的paths配置；如果这些文件你已手动全部加载，这个目录配置可以不用**/
window.RecordAppBaseFolder=window.PageSet_RecordAppBaseFolder||"https://xiangyuecn.gitee.io/recorder/src/";

/**【需修改】请使用自己的网站后端一个接口地址去实现：微信JsSDK签名、微信录音素材下载两个功能；不能用下面这个演示地址，微信【强制】要【绑安全域名】，别的站用不了。如果你要调整请求的参数、或者响应结果格式、或用两个接口地址，需要修改下面对应的ajax调用。
【微信文档】后端签名接口参考：微信JsSDK wx.config需使用到后端接口进行签名，文档: https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/JS-SDK.html 阅读：通过config接口注入权限验证配置、附录1-JS-SDK使用权限签名算法。
【微信文档】后端素材下载接口参考: https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1444738727
**/
var MyWxApi=window.PageSet_RecordAppWxApi||"https://jiebian.life/api/weixin/git_record"; /*本例子提供的这个api接口：
			会实现两个功能，ajax POST请求参数如下(都是两个参数，完整细节看下面ajax调用):
				功能一、action="sign" //JsSDK签名
						url="https://x.com/page" //当前页面url地址,需要对这个地址进行签名
				功能二、action="wxdown" //素材下载
						mediaID="abcd" //需下载的素材ID
			响应内容(JSON Object):
				{
					c:0		//code，0：正常，其他：错误
					,m:""	//errMsg code!=0时的错误描述
					,v:{}	//返回结果value，为JSON Object
							//sign时:v={appid:"公众号appid", timestamp:1577836800, noncestr:"随机字符串", signature:"签名值"} 就是返回wx.config需要的签名相关参数
							//wxdown时:v={mime:"audio/amr", data:"base64文本"} 就是返回素材下载的音频文件base64编码数据
				}*/
/******END******/



//Install Begin：在RecordApp准备好时执行这些代码
window.OnRecordAppInstalled=window.IOS_Weixin_RecordApp_Config=function(){
window.IOS_Weixin_RecordApp_Config=null;
window.Native_RecordApp_Config&&Native_RecordApp_Config();//如果native-config.js也引入了的话，也需要初始化

var App=RecordApp;
var CLog=App.CLog;
var platform=App.Platforms.Weixin;
var config=platform.Config;

CLog("ios-weixin-config init");



var win=window.top;//微信JsSDK让顶层去加载，免得iframe各种麻烦

var isIOS=/iphone/i.test(navigator.userAgent);
if(isIOS){
	var sbwxKey="Bad_WeixinIOSH5HistoryInitLocation";
	win[sbwxKey]=win[sbwxKey]||window[sbwxKey]||location.href;
	//如果你是在 history.pushState 修改了地址之后加载的本js，就更惨了，此初始化url将不准确，因此你可以在页面首次加载时立即设置Bad_WeixinIOSH5HistoryInitLocation变量为那时的location.href
	
	setTimeout(function(){
	CLog("IOS内微信不认 history.pushState 产生的新地址，如果签名地址不是页面加载时的地址，可能会导致签名失败，当前签名使用的地址为："+win[sbwxKey],3);
	},5000);
};


/*********实现app.js内IOS-Weixin中Config的接口*************/
config.Enable=function(call){
	//是否启用微信支持，默认启用，如果要禁用就回调call(false)
	call(true);
};
config.WxReady=function(call){
	//此方法已实现在微信JsSDK wx.config好后调用call(wx,err)函数
	//微信JsSDK wx.config需使用到后端接口进行签名，文档： https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/JS-SDK.html 阅读：通过config接口注入权限验证配置、附录1-JS-SDK使用权限签名算法
	if(!win.WxReady){
		win.eval("var InitJsSDK="+InitJsSDK.toString()+";InitJsSDK")(App,MyWxApi,ajax);
	};
	
	win.WxReady(call);
};
config.DownWxMedia=function(param,success,fail){
	/*下载微信录音素材，服务器端接口文档： https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1444738727
	param:{//接口调用参数
		mediaId："" 录音接口上传得到的微信服务器上的ID，用于下载单个素材（如果录音分了多段，会循环调用DownWxMedia）；如果服务器会进行转码，请忽略这个参数
		
		transform_mediaIds:"mediaId,mediaId,mediaId" 1个及以上mediaId，半角逗号分隔，用于服务器端进行转码用的，正常情况下这个参数用不到。如果服务器端会进行转码，需要把这些素材全部下载下来，然后按顺序合并为一个音频文件
		transform_type:"mp3" 录音set中的类型，用于转码结果类型，正常情况下这个参数用不到。如果服务器端会进行转码，接口返回的mime必须是：audio/type(如：audio/mp3)。
		transform_bitRate:123 建议的比特率，转码用的，同transform_type
		transform_sampleRate:123 建议的采样率，转码用的，同transform_type
		
		* 素材下载的amr音质很渣，也许可以通过高清接口获得清晰点的speex音频，那么transform_*参数就有用武之地；直接下载的amr只需用mediaId参数就可以了。
	}
	success： fn(obj) 下载成功返回结果
		obj:{
			mime:"audio/amr" //这个值是服务器端请求临时素材接口返回的Content-Type响应头，未转码必须是audio/amr；如果服务器进行了转码，是转码后的类型mime，并且提供duration
			,data:"base64文本" //服务器端下载到或转码的文件二进制内容进行base64编码
			
			,duration:0 //音频时长，如果服务器端进行了转码，必须返回这个参数并且>0，否则不要提供或者直接给0
		}
	fail: fn(msg) 下载出错回调
	*/
	
	var failCall=function(err){
		CLog(err,1);
		fail(err);
	};
	
	CLog("下载微信素材...",param);
	ajax(MyWxApi,{
		action:"wxdown"
		,mediaID:param.mediaId
		,transform_mediaIds:param.transform_mediaIds
		,transform_type:param.transform_type
		,transform_bitRate:param.transform_bitRate
		,transform_sampleRate:param.transform_sampleRate
	},function(data,raw){
		var mime=data.mime,b64=data.data;
		if(!mime || !b64 || (b64.length||1)%4!=0 ){
			CLog("下载错误",1,raw);
			failCall("微信音频素材下载接口返回非预定义json数据");
		}else{
			CLog("成功下载微信音频素材"+mime+" ≈"+(b64.length/4*3)+"b");
			success(data);
		};
	},function(msg){
		failCall("微信音频素材下载失败："+msg);
	});
};
/*********接口实现END*************/






//手撸一个ajax
var ajax=function(url,data,True,False){
	var xhr=new XMLHttpRequest();
	xhr.timeout=20000;
	xhr.open("POST",url);
	xhr.onreadystatechange=function(){
		if(xhr.readyState==4){
			if(xhr.status==200){
				try{
					var o=JSON.parse(xhr.responseText);
				}catch(e){};
				
				if(o.c!==0 || !o.v){
					False(o.m||"接口返回非预定义json数据");
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




/*********JsSDK*************/
//本方法不一定是当前页面执行，如果是iframe将交给top层执行，因此必须能独立运行
var InitJsSDK=function(App,MyWxApi,ajax){
	var CLog=App.CLog;
	var wxOjbK=function(call){
		if(errMsg){
			call(null,errMsg);
			return;
		};
		
		wxConfig(function(){
			call(wx);
		},function(msg){
			call(wx,"请求微信接口失败: "+msg);
		});
	};
	
	//微信环境准备完毕
	window.WxReady=function(call){
		if(isReady){
			wxOjbK(call);
		}else{
			calls.push(call);
		};
	};
	var isReady=false;
	var calls=[];
	var errMsg="";
	
	var jsEnd=function(){
		isReady=true;
		var arr=calls;
		calls=[];
		for(var i=0;i<arr.length;i++){
			wxOjbK(arr[i]);
		};
	};
	App.Js([{url:"https://res.wx.qq.com/open/js/jweixin-1.6.0.js",check:function(){return !window.wx||!wx.config}}],function(){
		CLog("weixin jssdk加载好了");
		jsEnd();
	},function(msg){
		errMsg="加载微信JsSDK失败，请刷新页面："+msg;
		CLog("weixin jssdk加载失败:"+msg,1);
		jsEnd();
	},window);
	
	
	
	//等等完成签名
	var wxConfigStatus=0;
	var wxConfigInt=0;
	var wxConfigErr="";
	var wxConfigCalls=[];
	var wxConfig=function(True,False){
		if(wxConfigStatus==6){
			True();
			return;
		}else if(wxConfigStatus==5){
			False(wxConfigErr);
			return;
		};
		wxConfigCalls.push({t:True,f:False});
		var end=function(err){
			clearTimeout(wxConfigInt);
			if(wxConfigStatus<5){			
				wxConfigErr=err?"微信config失败，请刷新页面重试："+err:"";
				wxConfigStatus=err?5:6;
				
				var arr=wxConfigCalls;
				wxConfigCalls=[];
				for(var i=0;i<arr.length;i++){
					var o=arr[i];
					if(err){
						o.f(wxConfigErr);
					}else{
						o.t();
					};
				};
			};
		};
		if(wxConfigStatus!=0){
			return;
		};
		wxConfigStatus=1;
		wxConfigInt=setTimeout(function(){
			end("微信JsSDK签名超时");
		},30000);
		
		var config=function(data){
			wx.config({
				debug:false
				,appId:data.appid
				,timestamp:data.timestamp
				,nonceStr:data.noncestr
				,signature:data.signature
				,jsApiList:("getLocation"
+",startRecord,stopRecord,onVoiceRecordEnd"
+",playVoice,pauseVoice,stopVoice,onVoicePlayEnd"
+",uploadVoice,downloadVoice"
).split(",")
			});
			wx.error(function(res){
				CLog("wx.error",1,res);
				end("wx.error:"+res.errMsg);
			});
			wx.ready(function(){
				CLog("微信JsSDK签名配置完成");
				end();
			});
		};
		
		
		var href=window.Bad_WeixinIOSH5HistoryInitLocation||location.href;
		ajax(MyWxApi,{
			action:"sign"
			,url:href.replace(/#.*/g,"")
		},function(data,raw){
			CLog("微信签名接口结果",raw);
			if(!data.appid){
				end("微信签名接口返回非预定义json数据");
			}else{
				config(data);
			};
		},end);
	};
};



};
//Install End


//如果已加载RecordApp，手动进行触发
if(window.RecordApp){
	OnRecordAppInstalled();
};

})();




console.error("【注意】本网站正在使用RecordApp的ios-weixin-config.js测试用的配置例子，这个配置如果要使用到你的网站，需要自己重写或修改后才能使用");
//别的站点引用弹窗醒目提示
if(!/^file:|:\/\/[^\/]*(jiebian.life|git\w+.io)(\/|$)/.test(location.href)
	&& !localStorage["DisableAppSampleAlert"]
	&& !window.AppSampleAlert){
	window.AppSampleAlert=1;
	alert("【注意】当前网站正在使用RecordApp测试用的配置例子*.config.js，需要自己重写或修改后才能使用");
};
