/*
录音 RecordApp： app统一录音接口支持，用于兼容原生应用、ios上的微信 等，需要和app-ios-weixin-support.js（支持IOS上的微信）、app-native-support.js（支持原生应用）配合使用。

特别注明：使用本功能虽然可以最大限度的兼容Android和IOS，但需ios-weixin需要后端提供支持，native需要app端提供支持，具体情况查看相应的文件。

本功能独立于recorder-core.js，可以仅使用RecordApp作为入口，可以不关心recorder-core中的方法，因为RecordApp已经对他进行了一次封装，并且屏蔽了非通用的功能。

注意：此文件并非拿来就能用的，需要改动【需实现】标注的地方，或者使用另外的初始化配置文件来进行配置，可参考app-support-sample目录内的配置文件。

https://github.com/xiangyuecn/Recorder
*/
(function(){
"use strict";
var IsWx=/MicroMessenger/i.test(navigator.userAgent);


//文件基础目录，此目录内包含recorder-core.js、engine等。实际取值需自行根据自己的网站目录调整，或者加载本js前，设置RecordAppBaseFolder全局变量。
//【需实现】
var BaseFolder=window.RecordAppBaseFolder || /*=:=*/ "/Recorder/src/" /*<@ "/Recorder/dist/" @>*/; //编译指令：源码时使用前面的文件夹，压缩时使用后面的文件夹


//提供一个回调fn()，免得BaseFolder要在这个文件之前定义，其他值又要在之后定义的麻烦。
var OnInstalled=window.OnRecordAppInstalled;


/*
可能支持的底层平台列表实现配置，对应的都会有一个app-xxx-support.js文件(Default为使用recorder-core.js除外)

每个实现配置内包含两个值：Support和Config
Support: fn( call(canUse) ) 判断此底层是否支持或开启，如果底层可用需回调call(true)选择使用这个底层平台，并忽略其他平台
Config: 此平台的配置选项，会传入app-xxx-support.js中，具体需要什么配置也一样参考这个js文件里面的说明
*/
var Config_SupportPlatforms=[
	{
		Key:"Native"
		,Support:function(call){
			call(false);//如需打开原生App支持，此处应该改成判断：1. 判断app是否是在环境中 2. app支持录音
		}
		,Config:{}
	}
	,{
		Key:"IOS-Weixin"
		,Support:function(call){
			if(!App.AlwaysUseWeixinJS){
				if(Recorder.Support()){//浏览器支持录音就不走微信的渣渣接口了
					call(false);
					return;
				};
			};
			//如果是微信 就返回支持
			call(IsWx);
		}
		,Config:{
			WxReady:function(call){
				//【需实现】
				//此方法需要自行实现，需要在微信JsSDK wx.config好后调用call(wx,err)函数
				call(null,"未实现IOS-Weixin.Config.WxReady");
			}
			,DownWxMedia:function(param,success,fail){
				/*【需实现】
					下载微信录音素材，服务器端接口文档： https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1444738727
					param:{//接口调用参数
						mediaId："" 录音接口上传得到的微信服务器上的ID，用于下载单个素材（如果录音分了多段，会循环调用DownWxMedia）；如果服务器会进行转码，请忽略这个参数
						
						transform_mediaIds:"mediaId,mediaId,mediaId" 1个及以上mediaId，半角逗号分隔，用于服务器端进行转码用的，正常情况下这个参数用不到。如果服务器端会进行转码，需要把这些素材全部下载下来，然后按顺序合并为一个音频文件
						transform_type:"mp3" 录音set中的类型，用于转码结果类型，正常情况下这个参数用不到。如果服务器端会进行转码，接口返回的mime必须是：audio/type(如：audio/mp3)。
						transform_bitRate:123 建议的比特率，转码用的，同transform_type
						transform_sampleRate:123 建议的采样率，转码用的，同transform_type
						
						* 素材下载的amr音质很渣，也许可以通过高清接口获得清晰点的音频，那么后两个参数就有用武之地。
					}
					success： fn(obj) 下载成功返回结果
						obj:{
							mime:"audio/amr" //这个值是服务器端请求临时素材接口返回的Content-Type响应头，未转码必须是audio/amr；如果服务器进行了转码，是转码后的类型mime，并且提供duration
							,data:"base64文本" //服务器端下载到或转码的文件二进制内容进行base64编码
							
							,duration:0 //音频时长，这个是可选的，如果服务器端进行了转码，必须提供这个参数
						}
					fail: fn(msg) 下载出错回调
				*/
				fail("下载素材接口DownWxMedia未实现");
			}
			//amr解码引擎文件，因为微信临时素材接口返回的音频为amr格式，刚好有amr解码器，省去了服务器端的复杂性
			,AMREngine:[
				{url:BaseFolder+"engine/beta-amr.js",check:function(){return !Recorder.prototype.amr}}
				/*=:=*/
					,{url:BaseFolder+"engine/beta-amr-engine.js",check:function(){return !Recorder.AMR}}
					,{url:BaseFolder+"engine/wav.js",check:function(){return !Recorder.prototype.wav}}
				/*<@ @>*/
			]
		}
		,ExtendDefault:true
	}
	,{
		Key:"Default"
		,Support:function(call){
			//默认的始终要支持
			call(true);
		}
		,Config:{
			paths:[//当使用默认实现时，会自动把这些js全部加载，如果core和编码器已手动加载，可以把此数组清空
				{url:BaseFolder+"recorder-core.js",check:function(){return !window.Recorder}}
				,{url:BaseFolder+"engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
				/*=:=*/ ,{url:BaseFolder+"engine/mp3-engine.js",check:function(){return !Recorder.lamejs}} /*<@ @>*/ //编译指令：压缩后mp3-engine已包含在了mp3.js中
			]
		}
	}
];







var Native=Config_SupportPlatforms[0];
var Weixin=Config_SupportPlatforms[1];
var Default=Config_SupportPlatforms[2];
//给Default实现统一接口
Default.RequestPermission=function(success,fail){
	var rec=Recorder();
	rec.open(function(){
		rec.close();
		success();
	},fail);
};
Default.Start=function(set,success,fail){
	var appRec=App.__Rec;
	if(appRec!=null){
		appRec.close();
	};
	App.__Rec=appRec=Recorder({
		type:set.type
		,sampleRate:set.sampleRate
		,bitRate:set.bitRate
		
		,onProcess:function(pcmData,powerLevel,duration,sampleRate){
			App.ReceivePCM(pcmData[pcmData.length-1],powerLevel,duration,sampleRate);
		}
	});
	appRec.appSet=set;
	appRec.open(function(){
		appRec.start();
		success();
	},function(msg){
		fail(msg);
	});
};
Default.Stop=function(success,fail){
	var appRec=App.__Rec;
	if(!appRec){
		fail("未开始录音");
		return;
	};
	var end=function(){
		appRec.close();
		//把配置写回去
		for(var k in appRec.set){
			appRec.appSet[k]=appRec.set[k];
		};
		App.__Rec=null;
	};
	appRec.stop(function(blob,duration){
		end();
		App.BlobRead(blob,duration,success);
	},function(msg){
		end();
		fail(msg);
	});
};












var App={
LM:"2019-4-23 14:51:14"
,Current:0
,IsWx:IsWx
,BaseFolder:BaseFolder
,AlwaysUseWeixinJS:false //测试用的，微信里面总是使用微信的接口，方便Android上调试
,Platforms:{
	Native:Native
	,Weixin:Weixin
	,Default:Default
}
,Js:function(urls,True,False,win){
	win=win||window;
	var doc=win.document;
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
		
		var elem=doc.createElement("script");
		elem.setAttribute("type","text/javascript");
		elem.setAttribute("src",url);
		elem.onload=function(){
			load(idx+1);
		};
		elem.onerror=function(e){
			False("请求失败:"+(e.message||"-")+"，"+url);
		};
		doc.body.appendChild(elem);
	};
	load(0);
}
,BlobRead:function(blob,duration,call){
	var reader=new FileReader();
	reader.onloadend=function(){
		call({
			mime:blob.type
			,duration:duration
			,data:(/.+;\s*base64\s*,\s*(.+)$/i.exec(reader.result)||[])[1]
		});
	};
	reader.readAsDataURL(blob);
}


/*
此方法由底层实现来调用，在开始录音后，底层如果能实时返还pcm数据，则会调用此方法
pcmData:int[] 当前单声道录音缓冲PCM片段，正常情况下为上次回调本接口开始到现在的录音数据
powerLevel,duration,sampleRate 和Recorder的onProcess相同
*/
,ReceivePCM:function(pcmData,powerLevel,duration,sampleRate){
	if(App.OnProcess){
		App.OnProcess([pcmData],powerLevel,duration,sampleRate);
	};
}



//事件，需在使用的地方绑定一个函数，注意：新函数会覆盖旧的函数
//参数和Recorder的onProcess相同，但pcmDatas[[int,...]]的数组长度始终为1
//OnProcess:function(pcmDatas,powerLevel,duration,sampleRate){}



/*
初始化安装，可反复调用
success: fn() 初始化成功
fail: fn(msg) 初始化失败
*/
,Install:function(success,fail){
	//因为此操作是异步的，为了避免竞争Current资源，此代码保证得到结果前只会发起一次调用
	var reqs=App.__reqs||(App.__reqs=[]);
	reqs.push({s:success,f:fail});
	success=function(){
		call("s",arguments);
	};
	fail=function(errMsg,isUserNotAllow){
		call("f",arguments);
	};
	var call=function(fn,args){
		for(var i=0;i<reqs.length;i++){
			reqs[i][fn].apply(null,args);
		};
		reqs.length=0;
	};
	if(reqs.length>1){
		return;
	};
	
	
	var idx=0;
	var initPlatform=function(platform,end){
		if(platform.IsInit){
			end();
			return;
		};
		var config=platform.Config;
		var paths=config.paths||[{url:BaseFolder+"app-support/app-"+platform.Key.toLowerCase()+"-support.js",check:function(){}}];
		
		//加载需要的支持js文件
		App.Js(paths,function(){
			platform.IsInit=true;
			end();
		},function(msg){
			msg="初始化js库失败："+msg;
			console.log(msg,platform);
			fail(msg);
		});
	};
	var next=function(cur){
		//遍历选择支持的底层平台
		if(!cur){
			cur=Config_SupportPlatforms[idx];			
			var initEnd=function(){
				cur.Support(function(canUse){
					if(canUse){
						initPlatform(cur,function(){
							next(cur);
						});
					}else{
						idx++;
						next();
					};
				});
			};
			
			//需要Default平台支持，先初始化再说
			if(cur.ExtendDefault){
				initPlatform(Default,initEnd);
			}else{
				initEnd();
			};
			return;
		};
		
		//已获取支持的底层平台
		App.Current=cur;
		success();
	};
	
	
	next(App.Current);
}


/*
请求录音权限，如果当前环境不支持录音或用户拒绝将调用错误回调，调用start前需先至少调用一次此方法
success:fn() 有权限时回调
fail:fn(errMsg,isUserNotAllow) 没有权限或者不能录音时回调，如果是用户主动拒绝的录音权限，除了有错误消息外，isUserNotAllow=true，方便程序中做不同的提示，提升用户主动授权概率
*/
,RequestPermission:function(success,fail){
	App.Install(function(){
		var cur=App.Current;
		console.log("开始请求"+cur.Key+"录音权限");
		
		cur.RequestPermission(function(){
			console.log("录音权限请求成功");
			success();
		},function(errMsg,isUserNotAllow){
			console.log("录音权限请求失败："+errMsg+",isUserNotAllow:"+isUserNotAllow);
			fail(errMsg,isUserNotAllow);
		});
	},function(err){
		console.log("Install失败",err);
		fail(err);
	});
}
/*
开始录音，需先调用RequestPermission
注：如果对应的底层实现可以实时返回PCM数据，应调用相应RecordApp.ReceivePCM(pcmData,powerLevel,duration,sampleRate)方法。注意如果回调速率超过1秒10次，建议限制成一秒10次(可丢弃未回调数据)

set：设置默认值：{
	type:"mp3"//最佳输出格式，如果底层实现能够支持就应当优先返回此格式
	sampleRate:16000//最佳采样率hz
	bitRate:16//最佳比特率kbps
} 注意：此对象会被修改，因为平台实现时需要把实际使用的值存入此对象
success:fn() 打开录音时回调
fail:fn(errMsg) 开启录音出错时回调
*/
,Start:function(set,success,fail){
	var cur=App.Current;
	if(!cur){
		fail("需先调用RequestPermission");
		return;
	};
	set||(set={});
	var obj={
		type:"mp3"
		,sampleRate:16000
		,bitRate:16
	};
	for(var k in obj){
		set[k]||(set[k]=obj[k]);
	};
	cur.Start(set,function(){
		console.log("开始录音",set);
		success();
	},function(msg){
		console.log("开始录音失败："+msg);
		fail(msg);
	});
}
/*
结束录音

success:fn(blob,duration)	结束录音时回调
	blob:Blob 录音数据audio/mp3|wav...格式
	duration:123 //音频持续时间
	
	注意：个个平台统一实现时，这个回调格式是这样的：
		fn(obj) 平台结束录音时回调，obj={
			mime:"audio/mp3" //录音数据格式，注意：不一定和start传入的set.type相同，可能为其他值
			,duration:123 //音频持续时间
			,data:"base64" //音频数据，base64编码后的纯文本格式
		}
	
fail:fn(errMsg) 录音出错时回调
*/
,Stop:function(success,fail){
	var cur=App.Current;
	if(!cur){
		fail("需先调用RequestPermission");
		return;
	};
	
	cur.Stop(function(obj){
		var bstr=atob(obj.data),n=bstr.length,u8arr=new Uint8Array(n);
		while(n--){
			u8arr[n]=bstr.charCodeAt(n);
		};
		var blob=new Blob([u8arr], {type:obj.mime});
		
		console.log("结束录音"+blob.size+"b "+obj.duration+"ms",blob);
		success(blob, obj.duration);
	},function(msg){
		console.log("结束录音失败："+msg);
		fail(msg);
	});
}

};

window.RecordApp=App;

OnInstalled&&OnInstalled();

})();