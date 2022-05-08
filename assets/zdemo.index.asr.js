/***index.html 中的 ASR 实时语音识别、音频文件转文字***/
(function(){

reclog("请稍后，正在加载需要的js...");
loadJsList([//加载依赖的js
	{url:"src/extensions/asr.aliyun.short.js"
		,check:function(){return !Recorder.ASR_Aliyun_Short}}
	,{url:"assets/runtime-codes/fragment.touch_button.js"
		,check:function(){return !window.DemoFragment||!DemoFragment.BindTouchButton}}
],function(){
	reclog("需要的js加载完成");
	
//显示界面
$(".asrView").html('<div style="border:1px solid #ddd;margin-top:6px">\
<div style="background:#f5f5f5;color:#06c;font-weight:bold;border-bottom:1px solid #ddd;padding:10px 10px">\
	实时语音识别 [阿里云版] - /src/extensions/asr.aliyun.short.js\
</div>\
\
<div class="arsLangs" style="border-bottom:1px solid #ddd;padding:10px">识别语言模型：\
	<style>.arsLangs label{cursor: pointer;margin-right:10px}</style>\
	<label><input type="radio" name="arsLang" value="普通话" checked>普通话</label>\
	<label><input type="radio" name="arsLang" value="粤语">粤语</label>\
	<label><input type="radio" name="arsLang" value="英语">英语</label>\
	<label><input type="radio" name="arsLang" value="日语">日语</label>\
</div>\
<div style="border-bottom:1px solid #ddd;padding:10px">Token Api：\
	<input class="asrTokenApi" value="'+localTokenApi(1)+'" style="width:240px"/>\
	<span class="asrTokenApiCheck" style="font-size:12px"></span>\
</div>\
\
<div style="border-bottom:1px solid #ddd;padding:10px">\
	<div>\
		<span class="asrStartBtns">\
			<button class="mainBtn recTouchBtn" style="width:260px;height:60px;line-height:60px;margin-right:80px"></button>\
			\
			<button onclick="asrStartClick_NoTouch()">免按住开始录音+识别</button>\
		</span>\
		<button onclick="asrStopClick_NoTouch()">结束语音识别</button>\
	</div>\
	\
	<div class="recAsrStatus"></div>\
</div>\
\
<div style="border-bottom:1px solid #ddd;padding:10px">\
	<div style="margin:0 0 6px;font-size:12px">实时识别结果: <span class="recAsrTime"></span></div>\
	<div class="recAsrTxt" style="padding:15px 10px;min-height:50px;border:3px dashed #a2a1a1"></div>\
</div>\
\
\
<div style="color:#06c;border-bottom:1px solid #ddd;padding:10px 10px">\
	音频文件转文字 [阿里云版] - /src/extensions/asr.aliyun.short.js\
</div>\
<div style="border-bottom:1px solid #ddd;padding:10px">\
	<button onclick="asrLastRecBlobToText()">将当前录音Blob文件识别成文本</button>\
</div>\
\
<div style="background:#f5f5f5;color:#06c;font-weight:bold;border-bottom:1px solid #ddd;padding:10px 10px">\
	实时语音识别 [腾讯云版] [其他云]\
</div>\
<div style="padding:10px;color:#aaa;font-size:14px">\
	腾讯云一句话语音识别（不支持实时特性），前端基本上没有什么需要做的，仅需让后端提供一个录音文件上传接口（很容易），前端将录制好1分钟内的语音文件直接上传给服务器，由后端调用腾讯云语一句话音识别接口，然后返回结果即可。暂不提供插件、测试代码。\
	<div style="margin-top:10px">\
		相较于阿里云的一句话语音识别：前端直接对接阿里云很容易（后端对接会很难，音频数据前端直连阿里云，无需走后端），后端对接腾讯云很容易（前端无法直连腾讯云，音频数据必须走后端）；根据自己的业务需求选择合适的云进行对接，避免多走弯路。\
	</div>\
</div>\
\
</div>');

recAsrStatus("请先在上面打开录音得到权限后再来语音识别哦~","#ccc");
//长按识别
DemoFragment.BindTouchButton(
	"recTouchBtn"
	,"按住进行录音+识别"
	,"松开结束"
	,{}
	,asrOnTouchStart
	,asrOnTouchEnd
);

$(".asrTokenApi").bind("change",function(){
	localStorage["ASR_Aliyun_Short_TokenApi"]=this.value==localTokenApi()?"":this.value;
});

//检查tokenApi本地服务是否已开启
(function(){
var checkOK=0;
var run=function(){
	var tipsElem=$(".asrTokenApiCheck");
	if(!$(".asrTokenApi").length){
		clearInterval(tokenApiCheckInt);
		return;
	}
	var url=$(".asrTokenApi").val();
	if(!url || url!=localTokenApi()){
		checkOK=0;
		tipsElem.html("");
		return;
	}
	if(window.asrTokenApiCheckReset){
		asrTokenApiCheckReset=0;
		checkOK=0;
	}
	if(checkOK){
		tipsElem.html('<span style="color:#0b1">本地服务已运行</span>');
		return;
	}
	var xhr=new XMLHttpRequest();
	xhr.open("GET",url.replace(/token$/g,"echo"));
	xhr.onreadystatechange=function(){
		if(xhr.readyState==4){
			if(xhr.status==200){
				checkOK=1;
				run();
			}else{
				var tips='<span style="color:red;word-break:break-all;">检测到本地服务未运行，请先下载'
				+'<a href="https://gitee.com/xiangyuecn/Recorder/blob/master/assets/demo-asr/NodeJsServer_asr.aliyun.short.js" target="_blank">NodeJsServer_asr.aliyun.short.js</a>'
				+'文件到本地，配置好代码里的阿里云账号后，然后命令行执行命令 `node NodeJsServer_asr.aliyun.short.js` 运行此程序即可提供本地测试接口</span>';
				if(tipsElem.html().indexOf("检测到本地服务未运行")==-1){
					tipsElem.html(tips);
				}
			}
		}
	};
	xhr.send();
};
clearInterval(window.tokenApiCheckInt);
window.tokenApiCheckInt=setInterval(run,1000);
run();
})();


},function(err){
	reclog(err,1);
});


var formatTime=function(n){//格式化毫秒成 分:秒
	n=Math.round(n/1000);
	var s=n%60;
	var m=(n-s)/60;
	return m+":"+("0"+s).substr(-2);
};


function localTokenApi(useSet){
	var url="http://127.0.0.1:9527/token";
	if(useSet){
		url=localStorage["ASR_Aliyun_Short_TokenApi"]||url;
	}
	return url;
};






var asr,rec_isStart;

//===========将最后一个录音blob转文字==============
window.asrLastRecBlobToText=function(){
	if(!recLogLast){
		reclog("请先录音",1);
		return;
	};
	if(asr){
		reclog("上次asr未关闭",1);
		return;
	};
	reclog("开始识别当前录音Blob文件，asrProcess中已限制最多识别前60*3-5*(3-1)=170秒 ...");
	$(".recAsrTxt").text("");
	$(".recAsrTime").html("");
	
	var asr2=asr=Recorder.ASR_Aliyun_Short({
		tokenApi:$(".asrTokenApi").val()
		,apiArgs:{
			lang:$("[name=arsLang]:checked").val()
		}
		,asrProcess:function(text,nextDuration,abortMsg){
			/***识别中间结果实回调，必须返回true才能继续识别，否则立即超时停止识别***/
			if(abortMsg){
				//语音识别中途出错，单个文件识别无需任何处理，会自动回调结果
				reclog("[asrProcess回调]被终止："+abortMsg,1);
				return false;
			};
			
			$(".recAsrTxt").text(text);
			$(".recAsrTime").html("识别时长: "+formatTime(asr2.asrDuration())
				+" 已发送数据时长: "+formatTime(asr2.sendDuration()));
			return nextDuration<=3*60*1000;//允许识别3分钟的识别时长（比音频时长小5*2秒）
		}
		,log:function(msg,color){
			reclog('<span style="opacity:0.15">'+msg+'</span>',color);
		}
	});
	reclog("语言："+asr.set.apiArgs.lang);
	//语音文件识别只需调用audioToText即可完成识别，简单快速
	asr.audioToText(recLogLast.blob,function(text,abortMsg){
		asr=null;
		if(abortMsg){
			reclog("发现识别中途被终止(一般无需特别处理)："+abortMsg,"#fb8");
		};
		reclog("文件识别最终结果："+text, 2);
	},function(errMsg){
		asr=null;
		reclog("文件识别结束失败："+errMsg, 1);
	});
};






//===========实时语音识别==============
window.asrInput=function(buffers,sampleRate,offset){
	if(asr){
		asr.input(buffers, sampleRate, offset);
	}
};


//免长按，这里就是调用的长按时的两个状态方法 功能是一样的
window.asrStartClick_NoTouch=function(){
	asrOnTouchStart(function(){});
};
window.asrStopClick_NoTouch=function(){
	if(!asr){
		reclog("未开始识别",1);
		return;
	};
	asrOnTouchEnd(false,true);
};


/**长按开始录音**/
var asrOnTouchStart=function(cancel){
	if(asr){
		cancel("上次asr未关闭");
		recAsrStatus("上次asr未关闭",1);
		return;
	};
	
	rec_isStart=false;
	//开始录音
	recstart(function(err){
		if(err){
			cancel("录音错误");
			recAsrStatus("[错误]"+err,1);
			return;
		};
		
		rec_isStart=true;
		asrOnTouchStart__(cancel);
	});
};
var asrOnTouchStart__=function(cancel){
	$(".recAsrTxt").text("");
	$(".recAsrTime").html("");
	
	//创建语音识别对象，每次识别都要新建，asr不能共用
	var asr2=asr=Recorder.ASR_Aliyun_Short({
		tokenApi:$(".asrTokenApi").val()
		,apiArgs:{
			lang:$("[name=arsLang]:checked").val()
		}
		,asrProcess:function(text,nextDuration,abortMsg){
			/***实时识别结果，必须返回true才能继续识别，否则立即超时停止识别***/
			if(abortMsg){
				//语音识别中途出错
				recAsrStatus("[asrProcess回调]被终止："+abortMsg,1);
				cancel("语音识别出错");//立即结束录音，就算继续录音也不会识别
				return false;
			};
			
			$(".recAsrTxt").text(text);
			$(".recAsrTime").html("识别时长: "+formatTime(asr2.asrDuration())
				+" 已发送数据时长: "+formatTime(asr2.sendDuration()));
			return nextDuration<=2*60*1000;//允许识别2分钟的识别时长（比录音时长小5秒）
		}
		,log:function(msg,color){
			reclog('<span style="opacity:0.15">'+msg+'</span>',color);
		}
	});
	reclog("语言："+asr.set.apiArgs.lang);
	recAsrStatus("连接服务器中，请稍后...");
	//打开语音识别，建议先打开asr，成功后再开始录音
	asr.start(function(){//无需特殊处理start和stop的关系，只要调用了stop，会阻止未完成的start，不会执行回调
		recAsrStatus("滴~~ 已开始语音识别，请讲话（asrProcess中已限制最多识别60*2-5*(2-1)=115秒）...",2);
	},function(errMsg){
		recAsrStatus("语音识别开始失败，请重试："+errMsg,1);
		
		cancel("语音识别开始失败");
	});
};

/**松开停止录音**/
var asrOnTouchEnd=function(isCancel,isUser){
	recAsrStatus(isCancel?"已取消":isUser?"已松开":"长按被取消",isUser?0:1);
	
	var asr2=asr;asr=null;//先干掉asr，防止重复stop
	if(!asr2){
		reclog("未开始识别",1);
	}else{
		//asr.stop 和 rec.stop 无需区分先后，同时执行就ok了
		asr2.stop(function(text,abortMsg){
			if(abortMsg){
				abortMsg="发现识别中途被终止(一般无需特别处理)："+abortMsg;
			};
			recAsrStatus("语音识别完成"+(abortMsg?"，"+abortMsg:""),abortMsg?"#f60":2);
			reclog("识别最终结果："+text, 2);
		},function(errMsg){
			recAsrStatus("语音识别"+(!isUser?"被取消":"结束失败")+"："+errMsg, 1);
		});
	};
	
	if(rec_isStart){
		rec_isStart=false;
		recstop(function(err,data){
			if(err){
				reclog(err,1);
			}
		});
	};
};

/**更新状态**/
var recAsrStatus=function(html,color){
	var elem=document.querySelector(".recAsrStatus");
	elem.style.color=color==1?"red":color==2?"#0b1":(color||null);
	elem.innerHTML=html;
	
	reclog(html,color);
};


})();