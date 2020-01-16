/*
录音 RecordApp：ios上的微信支持文件。

特别注明：本文件涉及的功能需要后端的支持，如果你不能提供微信JsSDK签名、素材下载api，并且坚决要使用本文件，那将会很困难。

本文件诞生的原因是因为IOS端WKWebView(UIWebView)中未开放getUserMedia功能来录音，对应的微信内也不能用H5录音，只能寻求其他解决方案。Android端没有此问题。当以后IOS任何地方的网页都能录音时，本文件就可以删除了。

本文件源码可以不用改动，因为需要改动的地方已放到了app.js的IOS-Weixin.Config中了；最终实际实现可参考app-support-sample目录内的配置文件。

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
		WXRecordData.wx=null;
		if(err){
			fail("微信JsSDK准备失败："+err);
			return;
		};
		WXRecordData.wx=wx;
		
		//可能已经在录音了，关掉再说
		if(isStart){
			killStart(function(){
				platform.RequestPermission(success,fail);
			});
			return;
		};
		
		//微信不能提前发起授权请求，需要开始录音时才会调起授权，并且授权一次后管很久，因此开始录音然后关闭就能检测出权限
		wx.startRecord({
			success:function(){
				setTimeout(function(){
					stopNow(function(e){
						if(!e || /short/i.test(e)){ //排除stopRecord:tooshort错误
							success();
						}else{
							fail("清理资源出错："+e);
						};
					});
				},100);
			}
			,fail:function(o){
				fail("无法录音："+o.errMsg);
			}
			,cancel:function(o){
				fail("用户不允许录音："+o.errMsg,true);
			}
		});
	});
};
var isWaitStart,isStart;
var stopNow=function(call){
	isStart=0;
	isWaitStart=0;
	WXRecordData.wx.stopRecord({
		success:function(){
			call&&call();
		},fail:function(o){
			call&&call("无法结束录音："+o.errMsg);
		}
	});
};
var killStart=function(call){
	console.warn("录音中，正在kill重试");
	stopNow(function(){
		setTimeout(call,300);
	});
};
var timeLog=function(msg){
	console.log("["+Date.now()+"]"+msg);
};
platform.Start=function(set,success,fail){
	var wx=WXRecordData.wx;
	if(!wx){
		fail("请先调用RequestPermission");
		return;
	};
	if(isStart){
		killStart(function(){
			platform.Start(set,success,fail);
		});
		return;
	};
	if(isWaitStart){
		console.log("等待上次wx.startRecord回调后重试");
		setTimeout(function(){
			platform.Start(set,success,fail);
		},600);
		return;
	};
	
	isStart=0;
	isWaitStart=1;
	var startFail=function(o){
		isWaitStart=0;
		fail("无法录音："+o.errMsg);
		stopNow();
	};
	wx.startRecord({
		success:function(){
			isStart=1;
			isWaitStart=0;
			WXRecordData.startTime=Date.now();
			WXRecordData.start=set;
			timeLog("已开始录音");
			success();
		}
		,fail:startFail
		,cancel:startFail
	});
	
	//监听超时自动停止后接续录音
	WXRecordData.chunks=[];
	WXRecordData.chunkErr="";
	WXRecordData.stopJoinEnd=null;
	wx.onVoiceRecordEnd({
		complete:function(res){
			var t1=Date.now();
			if(WXRecordData.stopJoinEnd){
				//正在进行stop调用时发生了onVoiceRecordEnd，此时不会触发stop回调，需要手动触发
				WXRecordData.stopJoinEnd(res,"chunk");
			}else{
				if(res.localId && WXRecordData.chunks){
					WXRecordData.chunks.push({res:res,duration:t1-WXRecordData.startTime,time:t1,from:"chunk"});
				}else{
					//已彻底停止录音了，就不要塞数据了，丢弃
					console.error("已忽略chunk数据",res);
				};
			};
			
			timeLog("微信录音超时，正在重启...");
			if(!isStart){
				console.error("已停止录音，拒绝重启");
				return;
			};
			wx.startRecord({
				success:function(){
					WXRecordData.startTime=Date.now();
					console.log("已接续录音,中断"+(Date.now()-t1)+"ms");
				}
				,fail:function(o){
					var msg="无法接续录音："+o.errMsg;
					console.error(msg,o);
					WXRecordData.chunkErr=msg;
				}
			});
		}
	});
};
platform.Stop=function(successx,failx){
	isStart=0;
	timeLog("开始停止录音");
	
	var fail=function(msg){
		failx("录音失败："+(msg.errMsg||msg));
	};
	var set=WXRecordData.start;
	if(!set){
		fail("未开始录音");
		return;
	};
	WXRecordData.start=null;
	var dwxData={list:[]};
	set.DownWxMediaData=dwxData;
	
	//格式转换 音质差是跟微信服务器返回的amr本来就音质差，转其他格式几乎无损音质，和微信本地播放音质有区别
	var transform=function(){
		var list=dwxData.list;
		var list0=list[0];
		if(list0.duration){
			//服务器端已经转码了，就直接返回
			var bstr=atob(list0.data),n=bstr.length,u8arr=new Uint8Array(n);
			while(n--){
				u8arr[n]=bstr.charCodeAt(n);
			};
			var blob=new Blob([u8arr.buffer], {type:list0.mime});
			
			successx(blob,list0.duration);
			return;
		};
		
		var pcms=[];
		var enTime=0;
		var encode=function(){
			enTime||(enTime=Date.now());
			var pcm=[];
			for(var i=0;i<pcms.length;i++){
				var o=pcms[i];
				for(var j=0;j<o.length;j++){
					pcm.push(o[j]);
				};
			};
			
			var rec=Recorder(set).mock(pcm,8000);
			rec.stop(function(blob,duration){
				dwxData.encodeTime=Date.now()-enTime;
				
				//把可能变更的配置写回去
				for(var k in rec.set){
					set[k]=rec.set[k];
				};
				successx(blob,duration);
			},fail);
		};
		
		var deidx=0;
		var deTime=0;
		var decode=function(){
			deTime||(deTime=Date.now());
			if(deidx>=list.length){
				dwxData.decodeTime=Date.now()-deTime;
				encode();
				return;
			};
			
			var data=list[deidx];
			data.duration=chunkList[deidx].duration;
			data.isAmr=true;
			var bstr=atob(data.data),n=bstr.length,u8arr=new Uint8Array(n);
			while(n--){
				u8arr[n]=bstr.charCodeAt(n);
			};
			
			Recorder.AMR.decode(u8arr,function(pcm){
				pcms.push(pcm);
				deidx++;
				decode();
			},function(msg){
				fail("AMR音频"+(deidx+1)+"无法解码:"+msg);
			});
		};
		
		if(Recorder.AMR){
			decode();
		}else{
			fail("未加载AMR转换引擎");
		};
	};
	
	
	var mediaIds=[];
	var stopFn=function(){
		if(!successx){//仅清理资源的直接返回，避免进行上传和下载操作
			fail("仅清理资源");
			return;
		};
		
		var upIds=[];
		for(var i=0;i<chunkList.length;i++){
			upIds.push(chunkList[i].res.localId);
		};
		timeLog("结束录音共"+upIds.length+"段，开始上传下载");
		console.log(upIds,chunkList);
		
		//下载片段
		var downidx=0;
		var downStart=0;
		var downEnd=function(){
			dwxData.downTime=Date.now()-downStart;
			//上传下载都完成了，进行转码
			transform();
		};
		var down=function(){
			downStart||(downStart=Date.now());
			if(downidx>=mediaIds.length){
				downEnd();
				return;
			};
			var serverId=mediaIds[downidx];
			
			config.DownWxMedia({
				mediaId:serverId
				,transform_mediaIds:mediaIds.join(",")
				,transform_type:set.type
				,transform_bitRate:set.bitRate
				,transform_sampleRate:set.sampleRate
			},function(data){
				dwxData.list.push(data);
				//转码结果，已全部转换合并好了
				if(data.duration){
					downEnd();
					return;
				};
				
				if(/amr/i.test(data.mime)){
					downidx++;
					down();
				}else{
					fail("微信服务器返回了未知音频类型："+data.mime);
				};
			},function(msg){
				fail("下载音频失败："+msg);
			});
		};
		
		
		//微信上传所有片段
		var upidx=0;
		var up=function(){
			if(upidx>=upIds.length){
				dwxData.uploadTime=Date.now()-upStart;
				down();
				return;
			};
			var localId=upIds[upidx];
			console.log("微信录音片段"+upidx+" wx.playVoice({localId:'"+localId+"'})");
			wx.uploadVoice({
				localId:localId
				,isShowProgressTips:0
				,fail:fail
				,success:function(res){
					var serverId=res.serverId;
					console.log("serverId:"+serverId);
					
					mediaIds.push(serverId);
					upidx++;
					up();
				}
			});
		};
		var upStart=Date.now();
		up();
	};
	
	var chunkList=WXRecordData.chunks;
	if(WXRecordData.chunkErr){
		console.error(WXRecordData.chunkErr,chunkList);
		fail("录制失败，已录制"+chunkList.length+"分钟，但后面出错："+WXRecordData.chunkErr);
		return;
	};
	if(chunkList.length){
		if(Date.now()-chunkList[chunkList.length-1].time<900){
			console.error("丢弃结尾未停止太短录音");
			stopNow();
			stopFn();
			return;
		};
	};
	
	//等待停止回调，或者onVoiceRecordEnd回调，如果停止过程中发生了onVoiceRecordEnd可能不会触发stop回调
	WXRecordData.stopJoinEnd=function(res,from){
		WXRecordData.stopJoinEnd=null;
		
		var t1=Date.now();
		if(res.localId){
			chunkList.push({res:res,duration:t1-WXRecordData.startTime,time:t1,from:from});
		}else{
			//定时n分钟录音时，当刚刚接续录音，然后立即出发停止时，返回数据没有localId
			console.error("已忽略"+from+"数据",res);
		};
		WXRecordData.chunks=null;//不要继续塞数据了，就算有也丢弃
		
		stopFn();
	};
	WXRecordData.wx.stopRecord({
		fail:fail
		,success:function(res){
			WXRecordData.stopJoinEnd&&WXRecordData.stopJoinEnd(res,"stop");
		}
	});
};
})();