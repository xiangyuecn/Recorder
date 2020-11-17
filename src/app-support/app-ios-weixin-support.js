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
var CLog=App.CLog;
var platform=App.Platforms.Weixin;
var config=platform.Config;

platform.IsInit=true;

var WXRecordData={};

/*******给IOS-Weixin实现统一接口*******/

platform.RequestPermission=function(success,fail){
	if(permissionState==5){//授权过，能管很久
		success();
		return;
	};
	permissionCalls.push({t:success,f:fail});
	if(permissionState==1){
		CLog("检测到连续的RequestPermission调用，wx环境已加入队列，这种操作是不建议的，如果是用户触发，应当开启遮罩层避免重复点击",3);
		return;
	};
	permissionState=1;
	
	var end=function(err,isUser){
		permissionState=err?0:5;
		var arr=permissionCalls;
		permissionCalls=[];
		for(var i=0;i<arr.length;i++){
			if(err){
				arr[i].f(err,isUser);
			}else{
				arr[i].t();
			};
		};
	};
	
	config.WxReady(function(wx,err){
		WXRecordData.wx=null;
		if(err){
			end("微信JsSDK准备失败："+err);
			return;
		};
		WXRecordData.wx=wx;
		
		//可能已经在录音了，暴力直接关掉一次再说，不然没法start
		killStart(function(){
			//微信不能提前发起授权请求，需要开始录音时才会调起授权 ，并且授权一次后管很久，因此开始录音然后关闭就能检测出权限
			wx.startRecord({
				success:function(){
					//只许关闭成功，不许失败
					var kill=function(wait,Final){
						setTimeout(function(){
							stopNow(function(err){
								if(err){
									CLog("停止wx录音"+(Final?'[Final]':'')+":"+err,3);
								};
								if(!err || Final){
									end();
								}else{
									kill(1000,1);//加大延迟重试一次，再不行就忽略
								};
							});
						},wait);
					};
					kill(100);
				}
				,fail:function(o){
					end("无法微信录音："+o.errMsg);
				}
				,cancel:function(o){
					end("用户不允许微信录音："+o.errMsg,true);
				}
			});
		});
	});
};
var permissionState;//0 无动作 1请求中 5已有权限
var permissionCalls=[];

var isWaitStart,isStart,startID=0;
var stopNow=function(call,keep){
	if(!keep){
		isStart=0;
		isWaitStart=0;
	};
	WXRecordData.wx.stopRecord({
		success:function(){
			call&&call();
		},fail:function(o){
			call&&call("无法结束录音："+o.errMsg);
		}
	});
};
var killStart=function(call,keep){
	if(!keep && isStart){
		CLog("录音中，正在kill重试",3);
	};
	stopNow(function(){
		setTimeout(call,300);
	},keep);
};
platform.Start=function(set,success,fail){
	var wx=WXRecordData.wx;
	if(!wx){
		fail("请先调用RequestPermission");
		return;
	};
	if(isStart){
		CLog("wx正在录音，但又开始新录音，kill掉老的",3);
		killStart(function(){
			platform.Start(set,success,fail);
		});
		return;
	};
	if(isWaitStart){
		CLog("wx上次Start还未完成，等待重试...",3);
		setTimeout(function(){
			platform.Start(set,success,fail);
		},600);
		return;
	};
	var id=++startID;//自增id阻止掉非本次的老的异步回调
	
	var startFail=function(o){
		isWaitStart=0;
		fail("开始微信录音失败："+o.errMsg);
		stopNow();
	};
	
	//开始微信录音
	var run=function(Final){
		isStart=0;
		isWaitStart=1;
		wx.startRecord({
			success:function(){
				isStart=1;
				isWaitStart=0;
				WXRecordData.startTime=Date.now();
				WXRecordData.start=set;
				CLog("wx已开始录音");
				success();
			}
			,fail:function(e){
				if(Final){
					startFail(e);
				}else{
					killStart(function(){//重试一次
						run(1);
					});
				};
			}
			,cancel:startFail
		});
	};
	run();
	
	//监听超时自动停止后接续录音
	WXRecordData.chunks=[];
	WXRecordData.chunkErr="";
	stopJoinEnd=null;
	stopWaitChunk=null;
	wx.onVoiceRecordEnd({
		complete:function(res){
			var t1=Date.now();
			if(stopJoinEnd){
				//正在进行stop调用时发生了onVoiceRecordEnd，此时不会触发stop回调，需要手动触发
				stopJoinEnd(res,"chunk");
			}else{
				if(res.localId && WXRecordData.chunks){
					WXRecordData.chunks.push({res:res,duration:t1-WXRecordData.startTime,time:t1,from:"chunk"});
				}else{
					//已彻底停止录音了，就不要塞数据了，丢弃
					CLog("已忽略wx chunk数据",3,res);
				};
			};
			
			if(stopWaitChunk){//已停止，正在等待满一分钟的一块
				stopWaitChunk();
				return;
			};
			
			CLog("wx录音超时，正在接续...");
			var rerun=function(tryCount){
				if(!isStart || id!=startID){
					CLog("已停止wx录音，拒绝接续",3);
					return;
				};
				wx.startRecord({
					success:function(){
						if(id==startID){//应该是相同的
							WXRecordData.startTime=Date.now();
							CLog("已接续wx录音,中断"+(Date.now()-t1)+"ms");
						}
					}
					,fail:function(o){
						if(!isStart || id!=startID){
							return;
						};
						var msg="无法接续微信录音："+o.errMsg;
						CLog(msg,1,o);
						if(tryCount>2){
							WXRecordData.chunkErr=msg;
						}else{
							tryCount++;
							CLog("尝试重启..."+tryCount);
							killStart(function(){//救一下，缺个几百毫秒已不重要了
								rerun(tryCount);
							},1);
						};
					}
				});
			};
			rerun(0);
		}
	});
};

var stopJoinEnd,stopWaitChunk;
platform.Stop=function(successx,failx){
	var wx=WXRecordData.wx;
	isStart=0;
	var hasWaitChunk=!!stopWaitChunk;//已收到59秒以上最后一块录音，无需停止录音了
	stopWaitChunk=null;
	CLog("开始停止录音");
	
	var failCall=function(msg){
		failx("录音失败[wx]："+(msg.errMsg||msg));
	};
	var set=WXRecordData.start;
	if(!set){
		failCall("未开始录音");
		return;
	};
	//开始或接续录音后距离1分钟最大时间间隔太短，等待接续信号
	var curDuration=Date.now()-WXRecordData.startTime;
	if(!hasWaitChunk && curDuration>59100){
		CLog("wx录音即将满1分钟，等待它录满，不然stop不可控...",3);
		stopWaitChunk=function(){
			platform.Stop(successx,failx);
		};
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
			
			App._SRec=null;
			CLog("微信素材服务器端已转码，不支持RecordApp.GetStopUsedRec方法",3);
			successx(blob,list0.duration);
			return;
		};
		
		var pcms=[];
		var enTime=0;
		var encode=function(){
			enTime||(enTime=Date.now());
			var pcm=[];
			
			//采样率提升处理，copy自Recorder.SampleRaise(pcms,8000,set.sampleRate)
			var step=set.sampleRate/8000;
			if(step<=1){
				step=1;
			}else{
				CLog("微信arm素材采样率为8000hz（语音音质勉强能听），已自动提升成设置的采样率"+set.sampleRate+"hz，但音质不可能会变好",3);
			};
			var posFloat=0,prev=0;
			for(var i=0;i<pcms.length;i++){
				var o=pcms[i];
				for(var i2=0;i2<o.length;i2++){
					var cur=o[i2];
					
					var pos=Math.floor(posFloat);
					posFloat+=step;
					var end=Math.floor(posFloat);
					
					//简单的从prev平滑填充到cur，有效减少转换引入的杂音
					var n=(cur-prev)/(end-pos);
					for(var j=1;pos<end;pos++,j++){
						pcm.push( Math.floor(prev+(j*n)) );
					};
					
					prev=cur;
				};
			};
			
			var rec=Recorder(set).mock(pcm,set.sampleRate);
			rec.stop(function(blob,duration){
				dwxData.encodeTime=Date.now()-enTime;
				
				//把可能变更的配置写回去
				for(var k in rec.set){
					set[k]=rec.set[k];
				};
				App._SRec=rec;
				successx(blob,duration);
			},failCall);
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
				failCall("AMR音频"+(deidx+1)+"无法解码:"+msg);
			});
		};
		
		if(Recorder.AMR){
			decode();
		}else{
			failCall("未加载AMR转换引擎");
		};
	};
	
	
	//上传微信本地录音，然后通过微信素材接口下载录音数据
	var mediaIds=[];
	var stopFn=function(){
		if(!successx){//仅清理资源的直接返回，避免进行上传和下载操作
			failCall("仅清理资源");
			return;
		};
		
		var upIds=[];
		for(var i=0;i<chunkList.length;i++){
			upIds.push(chunkList[i].res.localId);
		};
		CLog("结束录音共"+upIds.length+"段，开始上传下载",upIds,chunkList);
		if(!upIds.length){
			failCall("未获得任何录音");
			return;
		};
		
		//下载所有的片段
		var downidx=0;
		var downStart=0;
		var downEnd=function(){
			dwxData.downTime=Date.now()-downStart;
			//上传下载都完成了，进行转码
			CLog("开始转码...");
			transform();
		};
		var down=function(tryCount){
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
					failCall("微信服务器返回了未知音频类型："+data.mime);
				};
			},function(msg){
				tryCount=tryCount||0;
				if(tryCount>2){
					failCall("下载微信音频失败："+msg);
				}else{
					tryCount++;
					CLog("DownWxMedia失败，重试..."+tryCount,1,msg);
					down(tryCount);
				};
			});
		};
		
		
		//微信上传所有片段
		var upidx=0;
		var up=function(tryCount){
			if(upidx>=upIds.length){
				dwxData.uploadTime=Date.now()-upStart;
				CLog("开始下载微信素材...");
				down();
				return;
			};
			var localId=upIds[upidx];
			CLog("wx上传本地录音["+upidx+"] wx.playVoice({localId:'"+localId+"'})");
			wx.uploadVoice({
				localId:localId
				,isShowProgressTips:0
				,fail:function(e){
					tryCount=tryCount||0;
					if(tryCount>2){
						failCall("微信uploadVoice失败["+upidx+"]："+e.errMsg);
					}else{
						tryCount++;
						CLog("uploadVoice失败，重试..."+tryCount,1,e);
						up(tryCount);
					};
				}
				,success:function(res){
					var serverId=res.serverId;
					CLog("上传OK serverId:"+serverId);
					
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
	if(WXRecordData.chunkErr){//接续错误重试也没用的 就返回错误
		CLog(WXRecordData.chunkErr,1,chunkList);
		failCall("录制失败，已录制"+chunkList.length+"分钟，但后面出错："+WXRecordData.chunkErr);
		return;
	};
	if(hasWaitChunk){//已收到59秒以上最后一块录音，无需停止录音了
		stopFn();
		return;
	};
	if(chunkList.length){
		if(Date.now()-chunkList[chunkList.length-1].time<900){
			CLog("丢弃结尾未停止太短录音",3);
			stopNow();
			stopFn();
			return;
		};
	};
	
	//等待停止回调，或者onVoiceRecordEnd回调，如果停止过程中发生了onVoiceRecordEnd可能不会触发stop回调，虽然开头已经处理了快满1分钟的情况，但还是要补刀一下
	stopJoinEnd=function(res,from){
		stopJoinEnd=null;
		
		var t1=Date.now();
		if(res.localId){
			chunkList.push({res:res,duration:t1-WXRecordData.startTime,time:t1,from:from});
		}else{
			//定时n分钟录音时，当刚刚接续录音，然后立即出发停止时，返回数据没有localId
			CLog("已忽略"+from+"数据",3,res);
		};
		WXRecordData.chunks=null;//不要继续塞数据了，就算有也丢弃
		
		stopFn();
	};
	wx.stopRecord({
		fail:function(e){
			stopJoinEnd=null;
			//出错了，如果录音太短，尽力将有效的部分返回
			if(chunkList.length && curDuration<3000){
				CLog("停止录音出错，但后续录音太短，已忽略此错误："+e.errMsg,3);
				stopFn();
			}else{
				failCall(e);
			};
		}
		,success:function(res){
			stopJoinEnd&&stopJoinEnd(res,"stop");
		}
	});
};
})();