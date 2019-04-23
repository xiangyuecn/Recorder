/*
录音 RecordApp：ios上的微信支持文件。

特别注明：本文件涉及的功能需要后端的支持，如果你不能提供微信JsSDK签名、素材下载api，并且坚决要使用本文件，那将会很困难。

本文件诞生的原因是因为IOS端WKWebView(UIWebView)中未开放getUserMedia功能来录音，对应的微信内也不能用H5录音，只能寻求其他解决方案。Android端没有此问题。当以后IOS任何地方的网页都能录音时，本文件就可以删除了。

本文件源码可以不用改动，因为需要改动的地方已放到了app.js的IOS-Weixin.Config中了。

https://github.com/xiangyuecn/Recorder
*/
(function(){
"use strict";

var App=RecordApp;
var platform=App.Platforms.Weixin;
var config=platform.Config;

platform.IsInit=true;

var WXRecordData={};

/*******给IOS-Weixin实现统一接口*******/

platform.RequestPermission=function(success,fail){
	config.WxReady(function(wx,err){
		WXRecordData.wx=wx;
		if(err){
			fail("微信JsSDK准备失败："+err);
			return;
		};
		
		//微信不能提前发起授权请求，需要等到开始录音时才会调起授权
		success();
	});
};
platform.Start=function(set,success,fail){
	WXRecordData.start=set;
	
	WXRecordData.wx.startRecord({
		success:function(){
			success();
		}
		,fail:function(o){
			fail("无法录音："+o.errMsg);
		}
	});
};
platform.Stop=function(success,fail){
	var fail=function(msg){
		fail("录音失败："+(msg.errMsg||msg));
	};
	
	//amr格式转换
	var amr=function(data){
		var end=function(){
			var bstr=atob(data),n=bstr.length,u8arr=new Uint8Array(n);
			while(n--){
				u8arr[n]=bstr.charCodeAt(n);
			};
			
			Recorder.AMR.decode(u8arr,function(pcm){
				//音质差是跟微信服务器返回的amr本来就音质差，转其他格式几乎无损音质，和微信本地播放音质有区别
				var set=WXRecordData.start;
				
				var rec=Recorder(set).mock(pcm,8000);
				rec.stop(function(blob,duration){
					//把配置写回去
					for(var k in rec.set){
						set[k]=rec.set[k];
					};
					App.BlobRead(blob,duration,success);
				},fail);
			},function(msg){
				fail("AMR音频无法解码:"+msg);
			});
		};
		if(Recorder.AMR){
			end();
		}else{
			App.Js(config.AMREngine,end,function(){
				fail("加载AMR转换引擎失败");
			});
		};
	};
	
	WXRecordData.wx.stopRecord({
		fail:fail
		,success:function(res){
			var localId=res.localId;
			console.log("微信录音 wx.playVoice({localId:'"+localId+"'})");
			wx.uploadVoice({
				localId:localId
				,isShowProgressTips:0
				,fail:fail
				,success:function(res){
					var serverId=res.serverId;
					console.log("微信录音serverId:"+serverId);
					
					config.DownWxMedia(serverId,function(data){
						if(/amr/i.test(data.mime)){
							amr(data.data);
						}else{
							fail("微信服务器返回了未知音频类型："+data.mime);
						};
					},function(msg){
						fail("下载音频失败："+msg);
					});
				}
			});
		}
	});
};
})();