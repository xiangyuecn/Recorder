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
	<input class="asrTokenApi" value="'+localTokenApi(1).replace(/"/g,"&quot;")+'" placeholder="请填写api地址 或 token的json数据" style="width:240px"/>\
	<div style="font-size:13px;color:#999;word-break:break-all;">\
		<div>你可以下载Recorder仓库<a href="https://gitee.com/xiangyuecn/Recorder/tree/master/assets/demo-asr" target="_blank">/assets/demo-asr</a>内的nodejs服务器端脚本到电脑上，配置好代码里的阿里云账号，然后运行此服务器端脚本即可提供本地测试接口</div>\
		<div>如果无法访问此api地址，比如手机上，你可以根据服务器脚本中的提示在电脑上打http地址，手动复制或自行提供 {appkey:"...",token:"..."} ，先删掉上面输入框中的url再粘贴json进去即可使用</div>\
	</div>\
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
	实时语音识别 [腾讯云版] [讯飞] 等\
</div>\
<div style="padding:10px;color:#aaa;font-size:14px">\
	目前暂未提供其他版本的语音识别插件，比如腾讯云、讯飞等，搭配使用Recorder的onProcess实时处理，可根据自己的业务需求选择对应厂家自行对接即可，如需定制开发请联系作者。\
</div>\
\
</div>');

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
	
	var url=$(".asrTokenApi").val();
	var urlReq=null;
	if(/^\s*\{.*\}\s*$/.test(url)){
		//这里是输入框里面填的json数据，直接success回调即可
		urlReq=function(url,args,success,fail){
			var data; try{ data=JSON.parse(url); }catch(e){};
			if(!data || !data.appkey || !data.token){
				fail("填写的json数据"+(!data?"解析失败":"中缺少appkey或token"));
			}else{
				success({ appkey:data.appkey, token:data.token });
			}
		}
	};
	
	var asr2=asr=Recorder.ASR_Aliyun_Short({
		tokenApi:url
		,apiArgs:{
			lang:$("[name=arsLang]:checked").val()
		}
		,apiRequest:urlReq //如果提供了token数据，可不发起api请求
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
	//调用页面中的录音功能
	var openFn=window.recreq||recopen;
	openFn(function(err){
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
	});
};
var asrOnTouchStart__=function(cancel){
	$(".recAsrTxt").text("");
	$(".recAsrTime").html("");
	
	var url=$(".asrTokenApi").val();
	var urlReq=null;
	if(/^\s*\{.*\}\s*$/.test(url)){
		//这里是输入框里面填的json数据，直接success回调即可
		urlReq=function(url,args,success,fail){
			var data; try{ data=JSON.parse(url); }catch(e){};
			if(!data || !data.appkey || !data.token){
				fail("填写的json数据"+(!data?"解析失败":"中缺少appkey或token"));
			}else{
				success({ appkey:data.appkey, token:data.token });
			}
		}
	};
	
	//创建语音识别对象，每次识别都要新建，asr不能共用
	var asr2=asr=Recorder.ASR_Aliyun_Short({
		tokenApi:url
		,apiArgs:{
			lang:$("[name=arsLang]:checked").val()
		}
		,apiRequest:urlReq //如果提供了token数据，可不发起api请求
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