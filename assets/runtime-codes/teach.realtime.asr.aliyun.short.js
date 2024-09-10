/******************
《【教程】【ASR】实时语音识别、音频文件转文字-阿里云版》
作者：高坚果
时间：2020-7-22 22:37:09

通过阿里云语音识别（语音转文字）插件 /src/extensions/asr.aliyun.short.js，可实现实时语音识别、单个语音文件转文字。

只需要后端提供一个Token生成接口，就能进行语音识别，可直接参考或本地运行此NodeJs后端测试程序：/assets/demo-asr/NodeJsServer_asr.aliyun.short.js，配置好代码里的阿里云账号后，在目录内直接命令行执行`node NodeJsServer_asr.aliyun.short.js`即可运行提供本地测试接口。

目前暂未提供其他版本的语音识别插件，比如腾讯云、讯飞等，搭配使用Recorder的onProcess实时处理，可根据自己的业务需求选择对应厂家自行对接即可，如需定制开发请联系作者。
******************/

var asr;

/*************单个语音文件转文字例子，你也可以录完音后再一次性进行识别***************/
//将录音文件进行语音识别，支持的录音格式取决于浏览器的支持，兼容性mp3最好，wav次之，其他格式不一定能够解码
var fileToText=function(audioBlob,fileName){
	if(asr){
		Runtime.Log("上次asr未关闭",1);
		return;
	};
	Runtime.Log("开始识别文件：《"+fileName+"》，asrProcess中已限制最多识别前60*3-5*(3-1)=170秒 ...");
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
			,xxx:"其他请求参数"
		}
		,apiRequest:urlReq //如果提供了token数据，可不发起api请求
		,asrProcess:function(text,nextDuration,abortMsg){
			/***识别中间结果实回调，必须返回true才能继续识别，否则立即超时停止识别***/
			if(abortMsg){
				//语音识别中途出错，单个文件识别无需任何处理，会自动回调结果
				Runtime.Log("[asrProcess回调]被终止："+abortMsg,1);
				return false;
			};
			
			$(".recAsrTxt").text(text);
			$(".recAsrTime").html("识别时长: "+formatTime(asr2.asrDuration())
				+" 已发送数据时长: "+formatTime(asr2.sendDuration()));
			return nextDuration<=3*60*1000;//允许识别3分钟的识别时长（比音频时长小5*2秒）
		}
		,log:function(msg,color){
			Runtime.Log('<span style="opacity:0.15">'+msg+'</span>',color);
		}
	});
	Runtime.Log("语言："+asr.set.apiArgs.lang);
	//语音文件识别只需调用audioToText即可完成识别，简单快速
	asr.audioToText(audioBlob,function(text,abortMsg){
		asr=null;
		if(abortMsg){
			Runtime.Log("发现识别中途被终止(一般无需特别处理)："+abortMsg,"#fb8");
		};
		Runtime.Log("文件识别最终结果："+text, 2);
	},function(errMsg){
		asr=null;
		Runtime.Log("文件识别结束失败："+errMsg, 1);
	});
};
/*************单个语音文件转文字例子 END***************/



/*************实时语音识别例子*************************/
/******界面交互处理、打开录音权限******/
//使用长按录音的方式，可有效控制转换时长，避免不必要的资源浪费
//长按按钮功能已经封装好了，直接调用 BindTouchButton 即可快速实现长按
var bindTouchButton=function(){
	DemoFragment.BindTouchButton(
		"recTouchBtn"
		,"按住进行录音+识别"
		,"松开结束"
		,{}
		,asrOnTouchStart
		,asrOnTouchEnd
	);
};

var rec;
/**打开录音，先得到录音权限**/
function recOpenClick(){
	$(".recOpenBtn").hide();
	$(".recCloseBtn").show();
	var end=function(isOk){
		if(isOk){
			$(".asrStartBtns").show();
			$(".asrStopBtn").show();
		};
	};
	
	rec=Recorder({
		type:"wav"
		,sampleRate:16000
		,bitRate:16
		,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate,newBufferIdx,asyncEnd){
			Runtime.Process.apply(null,arguments);
			
			//实时推入asr处理。asr.input随时都可以调用，就算asr并未start，会缓冲到asr.start完成然后将已input的数据进行识别
			if(asr){
				//buffers是从录音开头到现在的缓冲，因此需要提供 buffersOffset=newBufferIdx
				asr.input(buffers, bufferSampleRate, newBufferIdx);
			};
		}
	});
	var t=setTimeout(function(){
		recAsrStatus("无法录音：权限请求被忽略（超时假装手动点击了确认对话框）",1);
		rec=null;
		end(false);
	},8000);
	
	recAsrStatus("正在打开录音权限，请稍后...");
	rec.open(function(){//打开麦克风授权获得相关资源
		clearTimeout(t);
		recAsrStatus("录音已打开，可以长按录音+识别了",2);
		end(true);
	},function(msg,isUserNotAllow){//用户拒绝未授权或不支持
		clearTimeout(t);
		recAsrStatus((isUserNotAllow?"UserNotAllow，":"")+"无法录音:"+msg, 1);
		rec=null;
		end(false);
	});
};
var recCloseClick=function(){
	$(".recOpenBtn").show();
	$(".recCloseBtn").hide();
	$(".asrStartBtns").hide();
	if(rec){
		Runtime.Log("已关闭录音");
		rec.close();
		rec=null;
	}else{
		Runtime.Log("未打开录音",1);
	}
};


//免长按，这里就是调用的长按时的两个状态方法 功能是一样的
var asrStartClick_NoTouch=function(){
	asrOnTouchStart(function(){});
};
var asrStopClick_NoTouch=function(){
	if(!asr){
		Runtime.Log("未开始识别",1);
		return;
	};
	asrOnTouchEnd(false,true);
};




/******核心的长按录音识别******/
/**长按开始录音**/
var asrOnTouchStart=function(cancel){
	if(!rec){
		cancel("未打开录音");
		recAsrStatus("未打开录音",1);
		return;
	};
	rec.s_isStart=false;
	if(asr){
		cancel("上次asr未关闭");
		recAsrStatus("上次asr未关闭",1);
		return;
	};
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
			,xxx:"其他请求参数"
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
			Runtime.Log('<span style="opacity:0.15">'+msg+'</span>',color);
		}
	});
	Runtime.Log("语言："+asr.set.apiArgs.lang);
	recAsrStatus("连接服务器中，请稍后...");
	//打开语音识别，建议先打开asr，成功后再开始录音
	asr.start(function(){//无需特殊处理start和stop的关系，只要调用了stop，会阻止未完成的start，不会执行回调
		//开始录音
		Runtime.Log("开始录音...");
		rec.start();
		rec.s_isStart=true;
		
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
		Runtime.Log("未开始识别",1);
	}else{
		//asr.stop 和 rec.stop 无需区分先后，同时执行就ok了
		asr2.stop(function(text,abortMsg){
			if(abortMsg){
				abortMsg="发现识别中途被终止(一般无需特别处理)："+abortMsg;
			};
			recAsrStatus("语音识别完成"+(abortMsg?"，"+abortMsg:""),abortMsg?"#f60":2);
			Runtime.Log("识别最终结果："+text, 2);
		},function(errMsg){
			recAsrStatus("语音识别"+(!isUser?"被取消":"结束失败")+"："+errMsg, 1);
		});
	};
	
	var rec2=rec;
	if(rec2.s_isStart){
		rec2.s_isStart=false;
		rec2.stop(function(blob,duration){
			Runtime.LogAudio(blob,duration,rec2);
		},function(errMsg){
			Runtime.Log("录音失败:"+errMsg, 1);
		});
	};
};

/**更新状态**/
var recAsrStatus=function(html,color){
	var elem=document.querySelector(".recAsrStatus");
	elem.style.color=color==1?"red":color==2?"#0b1":(color||null);
	elem.innerHTML=html;
	
	Runtime.Log(html,color);
};
/*************实时语音识别例子 END***************/



//破坏环境，测试错误是否被正确处理
var killToken=function(){
	if(!asr){
		Runtime.Log("未开始语音识别",1);
		return;
	}
	asr.set.apiRequest=function(url,args,success,fail){
		fail("不让获取Token");
	}
	Runtime.Log("已设置ASR的apiRequest，下一分钟将无法获得Token");
};
var killWs=function(){
	if(!asr || !asr.wsCur){
		Runtime.Log("未开始语音识别",1);
		return;
	}
	asr.wsCur.close();
	Runtime.Log("已强制关闭了ASR的WebSocket连接");
};





//=====以下代码无关紧要，音频数据源和界面==================
//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
	,{url:RootFolder+"/src/extensions/asr.aliyun.short.js",check:function(){return !Recorder.ASR_Aliyun_Short}}
	
	,{url:RootFolder+"/assets/runtime-codes/fragment.touch_button.js",check:function(){return !window.DemoFragment||!DemoFragment.BindTouchButton}}//引入BindTouchButton
]);


//显示控制按钮
Runtime.Ctrls([
	{html:'\
<hr/><div class="arsLangs" style="padding:5px 0">识别语言模型：\
	<style>.arsLangs label{cursor: pointer;margin-right:10px}</style>\
	<label><input type="radio" name="arsLang" value="普通话" checked>普通话</label>\
	<label><input type="radio" name="arsLang" value="粤语">粤语</label>\
	<label><input type="radio" name="arsLang" value="英语">英语</label>\
	<label><input type="radio" name="arsLang" value="日语">日语</label>\
</div>\
<hr/><div style="padding:5px 0">Token Api：\
	<input class="asrTokenApi" value="'+localTokenApi(1).replace(/"/g,"&quot;")+'" placeholder="请填写api地址 或 token的json数据" style="width:240px"/>\
	<div style="font-size:13px;color:#999;word-break:break-all;">\
		<div>你可以下载Recorder仓库<a href="https://gitee.com/xiangyuecn/Recorder/tree/master/assets/demo-asr" target="_blank">/assets/demo-asr</a>内的nodejs服务器端脚本到电脑上，配置好代码里的阿里云账号，然后运行此服务器端脚本即可提供本地测试接口</div>\
		<div>如果无法访问此api地址，比如手机上，你可以根据服务器脚本中的提示在电脑上打http地址，手动复制或自行提供 {appkey:"...",token:"..."} ，先删掉上面输入框中的url再粘贴json进去即可使用</div>\
	</div>\
</div>\
'}
	,{html:'<hr/>\
<div>\
	<span style="margin-right:170px">\
	<button class="mainBtn recOpenBtn" onclick="recOpenClick()">单击此处打开 录音+识别 功能</button>\
	<button class="mainBtn recCloseBtn" onclick="recCloseClick()" style="display:none;">关闭录音</button>\
	</span>\
	\
	<button class="mainBtn asrStartBtns" style="display:none;" onclick="asrStartClick_NoTouch()">免按住开始录音+识别</button>\
	<button class="mainBtn asrStopBtn" onclick="asrStopClick_NoTouch()" style="display:none;">结束语音识别</button>\
</div>\
\
<div>\
	<button class="mainBtn recTouchBtn asrStartBtns" style="width:260px;height:60px;line-height:60px;display:none;"></button>\
</div>\
\
<div class="recAsrStatus"></div>\
\
<hr/>\
<div style="margin:12px 0 6px;font-size:12px">实时识别结果: <span class="recAsrTime"></span></div>\
<div class="recAsrTxt" style="padding:15px 10px;min-height:50px;margin-bottom:12px;border:3px dashed #a2a1a1"></div>\
'}
	
	,{name:"破坏ASR配置，下一分钟得不到Token",click:"killToken"}
	,{name:"强制断开ASR的WebSocket连接",click:"killWs"}
	,{choiceFile:{
		multiple:false
		,name:"音频（已限制最多前3分钟内转成文字）"
		,mime:"audio/*"
		,process:function(fileName,arrayBuffer,filesCount,fileIdx,endCall){
			fileToText(new Blob([arrayBuffer]),fileName);
			endCall();
		}
	}}
]);

bindTouchButton();

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
$(".asrTokenApi").bind("change",function(){
	localStorage["ASR_Aliyun_Short_TokenApi"]=this.value==localTokenApi()?"":this.value;
});
