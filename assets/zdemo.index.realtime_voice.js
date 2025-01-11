/** 实时语音通话聊天对讲，websocket实时传输数据 **/

(function(){
"use strict";

//这些代码大部分复制自 /app-support-sample/demo_UniApp/pages/recTest/test_realtime_voice.vue
var PageObject=function(){
	var data={
		wsApi:"", wsID1:"", wsID2:""
		,ws_audioFrameCount:0, ws_audioFrameSize:0, ws_audioFrameDur:0, ws_audioFrameDurTxt:""
		
		,ws_voiceSendUserCount:0,ws_voiceSendOKCount:0,ws_voiceSendErrCount:0,ws_voiceSendSize:0,ws_voiceSendDur:0,ws_voiceSendDurTxt:""
		,ws_voiceReceiveCount:0,ws_voiceReceiveSize:0,ws_voiceReceiveDur:0,ws_voiceReceiveDurTxt:""
	};
	for(var k in data) this[k]=data[k];
};
PageObject.prototype={
	setData:function(data){
		for(var k in data) this[k]=data[k];
		
		$(".rtVoice_audioFrameMsg").html(this.ws_audioFrameDurTxt?(
			this.ws_audioFrameDurTxt+'，'+this.ws_audioFrameCount+'帧，'+this.ws_audioFrameSize+'字节'
		):"");
		
		var rs=this.ws_voiceReceiveDurTxt||this.ws_voiceSendDurTxt;
		$(".rtVoice_voiceReceiveMsg").html(rs?(
			'接收：'+this.ws_voiceReceiveDurTxt+'，'+this.ws_voiceReceiveCount+'帧，'+this.ws_voiceReceiveSize+'字节'
		):"");
		$(".rtVoice_voiceSendMsg").html(rs?(
			'发送：'+this.ws_voiceSendDurTxt+'，'+this.ws_voiceSendUserCount+'人接收，OK '+this.ws_voiceSendOKCount+'帧，Err '+this.ws_voiceSendErrCount+'帧，'+this.ws_voiceSendSize+'字节'
		):"");
	}
	
	,log:function(){
		reclog.apply(null,arguments);
	}
	,formatTime:function(ms,showSS){
		var ss=ms%1000;ms=(ms-ss)/1000;
		var s=ms%60;ms=(ms-s)/60;
		var m=ms%60;ms=(ms-m)/60;
		var h=ms, v="";
		if(h>0) v+=(h<10?"0":"")+h+":";
		v+=(m<10?"0":"")+m+":";
		v+=(s<10?"0":"")+s;
		if(showSS)v+="″"+("00"+ss).substr(-3);;
		return v;
	}
	,checkSet:function(api){
		if(api==2){
			this.wsApi=$(".rtVoice_input_ws").val();
			if(!/^wss?:\/\/.+/i.test(this.wsApi) || /局域网/.test(this.wsApi)){
				this.log("请配置ws地址，比如填写：ws://127.0.0.1:9529/",1);
				return false;
			}
			localStorage["Rec_RtVoice_wsApi"]=this.wsApi; //测试用的存起来
			
			this.wsID1=$(".rtVoice_input_wsID1").val();
			if(!this.wsID1){
				this.log("请填写我的标识");
				return false;
			}
			localStorage["Rec_RtVoice_wsID1"]=this.wsID1; //测试用的存起来
		}
		return true;
	}
	
	
	
	//连接websocket
	,wsConnClick:function(){
		if(!this.checkSet(2))return;
		this.log("正在连接"+this.wsApi+"...");
		if(this.socket) this.socket.close();
		var sid=this.SID=(this.SID||0)+1; //同步操作
		
		this.socketIsOpen=false;
		this.socket=new WebSocket(this.wsApi);
		this.socket.binaryType="arraybuffer";
		this.socket.onclose=(function(){
			if(sid!=this.SID) return;
			this.socketIsOpen=false;
			this.destroyStreamPlay();
			this.log("ws已断开");
		}).bind(this);
		this.socket.onerror=(function(e){
			if(sid!=this.SID) return;
			this.socketIsOpen=false;
			this.destroyStreamPlay();
			this.log("ws因为错误已断开："+e.message,1);
		}).bind(this);
		this.socket.onopen=(function(){
			if(sid!=this.SID) return;
			this.socketIsOpen=true;
			this.socket.number=1;
			this.socket.sendCalls={};
			this.log("ws已连接",2);
			
			this.ws__sendMessage("setMeta",{uid:this.wsID1},null,null,(function(){
				this.log("ws已绑定标识："+this.wsID1,2);
			}).bind(this),(function(err){
				this.log("ws绑定标识出错："+err,1);
			}).bind(this));
			
			this.ws_voiceReceiveCount=0;
			this.ws_voiceReceiveSize=0;
			this.ws_voiceReceiveDur=0;
			this.ws_voiceReceiveDurTxt="00:00";
			this.resetWsSendVoice();
			this.initStreamPlay(); //先初始化播放器
		}).bind(this);
		this.socket.onmessage=(function(e){
			if(sid!=this.SID) return;
			this.ws__receiveMessage(e.data);
		}).bind(this);
	}
	,wsDisconnClick:function(){
		if(this.socketIsOpen)this.log("ws正在断开...");
		else this.log("ws未连接");
		if(this.socket) this.socket.close();
	}
	//解析处理服务器消息
	,ws__receiveMessage:function(rawMsg){
		var binary=new Uint8Array(0),rawTxt=rawMsg;//纯文本消息
		if (rawMsg instanceof ArrayBuffer) {//二进制内容，提取第一行文本
			var bytes=new Uint8Array(rawMsg);
			var str="",bIdx=bytes.length;
			for(var i=0;i<bytes.length;i++){
				if(bytes[i]==10){ bIdx=i+1; break }
				else str+=String.fromCharCode(bytes[i]);
			}
			rawTxt=decodeURIComponent(escape(str));
			binary=new Uint8Array(bytes.buffer.slice(bIdx));
		}
		
		//解析json
		var msgErr="";
		if(!rawTxt){ msgErr="无JSON数据"; }else{
			try{
				var msgObj=JSON.parse(rawTxt);
				if(!msgObj.type || !msgObj.n){
					msgErr="JSON数据中无type或n："+rawTxt;
				}
			}catch(e){ msgErr="非JSON格式数据："+rawTxt; }
		}
		if(msgErr){
			console.error("ws__receiveMessage错误: "+msgErr);
			return;
		}
		var type=msgObj.type,data=msgObj.v||{};
	
		//处理此消息
		if(/^response\.(\d+)\.?/.test(type)){//响应回调
			var msgNo=+RegExp.$1;
			var cb=this.socket.sendCalls[msgNo];
			if(cb){
				delete this.socket.sendCalls[msgNo];
				clearTimeout(cb.timer);
				if(msgObj.c===0){
					cb.success(data,binary,msgObj);
				}else{
					cb.fail(msgObj.m||"-");
				}
			}
			return;
		}
		
		//交给对应接口处理
		if(this["onMsg__"+type]){
			this["onMsg__"+type](data,binary,msgObj);
			return;
		}
		console.error("ws__receiveMessage未知消息类型："+rawTxt);
		this.ws__sendMessage("",{},null,{from:msgObj,c:1,m:"类型对应的接口不存在，type="+type});
	}
	//发送消息给服务器
	,ws__sendMessage:function(type,data,bytes,response,onSuccess,onFail){
		var socket=this.socket;
		if(!this.socketIsOpen){
			console.error("ws连接未打开",arguments);
			if(onFail) onFail("ws连接未打开");
			return;
		}
		var msgNo=socket.number++;
		
		if(response) type="response."+response.from.n+"."+response.from.type;
		var msgObj={type:type,n:msgNo};
		if(response){
			msgObj.c=response.c||0;
			msgObj.m=response.m||"";
		};
		msgObj.v=data||{};
		
		//需要回调结果
		if(onSuccess){
			onFail=onFail||function(){};
			var timer=setTimeout(function(){
				delete socket.sendCalls[msgNo];
				onFail("等待服务器响应超时");
			},60000);
			socket.sendCalls[msgNo]={success:onSuccess,fail:onFail,timer:timer};
		}
		
		var rawTxt=JSON.stringify(msgObj);
		if(bytes && bytes.length){//换行拼接二进制内容
			var str=unescape(encodeURIComponent(rawTxt));
			var u8arr=new Uint8Array(str.length);
			for(var i=0;i<str.length;i++)u8arr[i]=str.charCodeAt(i);
			
			var arr=new Uint8Array(u8arr.length+1+bytes.length);
			arr.set(u8arr);
			arr[u8arr.length]=10;
			arr.set(bytes, u8arr.length+1);
			this.socket.send(arr.buffer);
		}else{
			this.socket.send(rawTxt);
		}
	}
	
	
	//服务器将pcm片段发送给客户端，模拟播放语音流
	,wsAudioStartClick:function(){
		var readAudio=$(".rtVoice_input_readAudio")[0].checked;
		var socket=this.socket;
		if(!this.socketIsOpen) return this.log("ws未连接",1);
		if(socket.audioStartToken) return this.log("请先audioStop",1);
		this.ws_audioFrameCount=0;
		this.ws_audioFrameSize=0;
		this.ws_audioFrameDur=0;
		this.ws_audioFrameDurTxt="00:00";
		this.setData();
		this.ws__sendMessage("audioStart",{readAudio:readAudio},null,null,(function(data){
			socket.audioStartToken=data.token;
			this.log("已打开服务器端语音流 readAudio="+readAudio+" token="+data.token,2);
		}).bind(this),(function(err){
			this.log("打开服务器端语音流出错："+err,1);
		}).bind(this));
	}
	//结束模拟播放语音流
	,wsAudioStopClick:function(){
		var socket=this.socket;
		var token=socket && socket.audioStartToken;
		if(token){
			this.ws__sendMessage("audioStop",{token:token},null,null,(function(){
				socket.audioStartToken="";
				this.log("已停止服务器端语音流");
			}).bind(this),(function(err){
				this.log("停止服务器端语音流出错："+err,1);
			}).bind(this));
		}
	}
	//收到服务器模拟语音流片段数据，进行播放
	,onMsg__audioFrame:function(data,binary,msgObj){
		var pcm=new Int16Array(binary.buffer);
		this.ws_audioFrameCount++;
		this.ws_audioFrameSize+=binary.length;
		this.ws_audioFrameDur=Math.round(this.ws_audioFrameSize/2/data.sampleRate*1000);
		this.ws_audioFrameDurTxt=this.formatTime(this.ws_audioFrameDur);
		this.setData();
		
		this.streamPlay(pcm,data.sampleRate);
	}
	
	,readWsID2:function(){
		this.wsID2=$(".rtVoice_input_wsID2").val();
		if(!this.wsID2) return "请填写对方标识";
		if(this.wsID1==this.wsID2) return "对方标识不能和我的标识相同";
		localStorage["Rec_RtVoice_wsID2"]=this.wsID2; //测试用的存起来
	}
	//语音通话对讲
	,wsOpenVoiceClick:function(){
		if(!this.socketIsOpen) return this.log("ws未连接",1);
		var err=this.readWsID2(); if(err) return this.log(err,1);
		this.log("我方已开始语音发送，请在上面进行录音操作",2);
		
		//打开回声消除设置
		var useAEC=$(".useAECSet")[0];
		if(useAEC) useAEC.checked=true;
		//调用页面中的录音功能
		var openFn=window.recreq||recopen;
		openFn(function(err){ recstart() });
		
		var lastIdx=1e9,chunk=null;
		//在录音onProcess里面直接实时处理，这里的参数就是onProcess的参数
		window.RtVoiceProcess=(function(buffers,powerLevel,duration,sampleRate,newBufferIdx){
			//实时转码，上传，这里只提取最新的pcm发送出去即可
			if(lastIdx>newBufferIdx){
				chunk=null; //重新录音了，重置环境
			}
			lastIdx=newBufferIdx;
			
			//借用SampleData函数进行数据的连续处理，采样率转换是顺带的，得到新的pcm数据
			chunk=Recorder.SampleData(buffers,sampleRate,16000,chunk);
			var pcm=chunk.data;
			
			//二进制pcm
			var bytes=new Uint8Array(pcm.buffer);
			
			//发送pcm出去
			this.ws__sendMessage("sendTo",{
				toMetaKey:"uid",toMetaValue:this.wsID2 //接收方信息，可以是群组（群组的需控制同时只能一人发，否则多人得服务器端混流）
				,sendType:"custom_voiceFrame",sendData:{
					fromMetaKey:"uid",fromMetaValue:this.wsID1//告诉对方是我发的信息
					,sampleRate:16000 //采样率
				}
			},bytes,null,(function(data){
				this.ws_voiceSendUserCount=data.count;
				if(data.count){
					this.ws_voiceSendOKCount++;
				}else{ //没有接收方
					this.ws_voiceSendErrCount++;
				}
				this.ws_voiceSendSize+=pcm.byteLength;
				this.ws_voiceSendDur=Math.round(this.ws_voiceSendSize/2/16000*1000);
				this.ws_voiceSendDurTxt=this.formatTime(this.ws_voiceSendDur);
				this.setData();
			}).bind(this));
		}).bind(this);
		this.resetWsSendVoice();
	}
	,resetWsSendVoice:function(){
		this.ws_voiceSendUserCount=0;
		this.ws_voiceSendOKCount=0;
		this.ws_voiceSendErrCount=0;
		this.ws_voiceSendSize=0;
		this.ws_voiceSendDur=0;
		this.ws_voiceSendDurTxt="00:00";
		this.setData();
	}
	//结束语音通话对讲
	,wsCloseVoiceClick:function(){
		window.RtVoiceProcess=null;
		this.log("我方已结束语音发送");
	}
	//收到对方发来的自定义类型的语音数据
	,onMsg__custom_voiceFrame:function(data,binary,msgObj){
		var pcm=new Int16Array(binary.buffer);
		this.ws_voiceReceiveCount++;
		this.ws_voiceReceiveSize+=binary.length;
		this.ws_voiceReceiveDur=Math.round(this.ws_voiceReceiveSize/2/data.sampleRate*1000);
		this.ws_voiceReceiveDurTxt=this.formatTime(this.ws_voiceReceiveDur);
		this.setData();
		
		this.streamPlay(pcm,data.sampleRate);
	}
	
	
	//播放实时的语音流
	,streamPlay:function(pcm,sampleRate){
		this.initStreamPlay();
		if(sampleRate!=16000){ console.warn("未适配非16000采样率的pcm播放：initStreamPlay中手写的16000采样率，使用其他采样率需要修改初始化代码"); return; }
		
		var sp=this.wsStreamPlay;
		if(!sp || !sp.__isStart) return;
		//if(播放新的) sp.clearInput(); //清除已输入但还未播放的数据，一般用于非实时模式打断老的播放
		sp.input(pcm);
	}
	//初始化播放器
	,initStreamPlay:function(){
		if(this.spIsInit)return; //已初始化完成
		if(this.spInit_time && Date.now()-this.spInit_time<2000)return; //等待播放器初始化完成
		var stime=this.spInit_time=Date.now();
		
		var Tag="wsStreamPlay";
		var sp=Recorder.BufferStreamPlayer({
			decode:false,sampleRate:16000
			//,realtime:false //默认为true实时模式，设为false为非实时模式。要连续完整播放时要设为false，否则实时模式会丢弃延迟过大的数据并加速播放
			,onInputError:function(errMsg, inputIndex){
				console.error(Tag+"第"+inputIndex+"次的音频片段input输入出错: "+errMsg);
			}
			,onPlayEnd:function(){
				// 没有可播放的数据了，缓冲中 或者 已播放完成
			}
		});
		sp.start((function(){
			if(stime!=this.spInit_time) return; //可能调用了destroy
			sp.__isStart=true;
			this.wsStreamPlay=sp;
			this.spIsInit=true;
			this.spInit_time=0;
			this.log("streamPlay已打开",2);
		}).bind(this),(function(err){
			if(stime!=this.spInit_time) return; //可能调用了destroy
			this.spInit_time=0;
			this.log("streamPlay初始化错误："+err,1);
		}).bind(this));
	}
	//销毁播放器
	,destroyStreamPlay(){
		this.spIsInit=false;
		this.spInit_time=0;
		if(this.wsStreamPlay){
			this.wsStreamPlay.stop();
			this.wsStreamPlay=null;
		}
	}
};
window.RtVoiceObj=new PageObject();



/***显示界面***/
var isShow=false;
window.rtVoiceOnShow=function(){
	if(isShow) return; isShow=true;
	
	$(".rtVoiceView").html('\
<div style="border:1px solid #ddd;background:#fff">\
<div style="background:#f5f5f5;border-bottom:1px solid #ddd;padding:10px 5px">\
	<span style="color:#06c;font-weight:bold;">WebSocket语音通话聊天</span>\
	<span style="font-size:13px;color:#999;margin-left:10px">源码: <a href="https://github.com/xiangyuecn/Recorder/blob/master/assets/zdemo.index.realtime_voice.js" target="_blank">/assets/zdemo.index.realtime_voice.js</a></span>\
</div>\
\
<div style="border-bottom:1px solid #ddd;padding:5px">\
	<div>ws(s)：<input class="rtVoice_input_ws" style="width:260px;padding: 5px 3px;border:1px solid #ddd"/> </div>\
	<div style="font-size:13px;color:#999">需要先在电脑上运行Recorder仓库\
		<a href="https://github.com/xiangyuecn/Recorder/tree/master/assets/node-localServer" target="_blank">/assets/node-localServer</a>\
		内的nodejs服务器端脚本，然后填写你电脑局域网ip即可测试（用127.0.0.1时可用ws），支持ws、wss测试WebSocket地址</div>\
	\
	<div>\
		<span>我的标识</span>\
		<input class="rtVoice_input_wsID1" style="width:50px;padding: 5px 3px;border:1px solid #ddd;vertical-align:middle"/>\
		<button onclick="RtVoiceObj.wsConnClick()" style="vertical-align:middle">连接服务器</button>\
		<button onclick="RtVoiceObj.wsDisconnClick()" style="vertical-align:middle">断开</button>\
	</div>\
</div>\
\
<div style="border-bottom:1px solid #ddd;padding:5px">\
	<div style="font-size:13px;color:#999">服务器将pcm片段实时发送给客户端，模拟播放语音流</div>\
	<label style="font-size:13px"><input type="checkbox" class="rtVoice_input_readAudio">读audio-16k.wav</label>\
	<button onclick="RtVoiceObj.wsAudioStartClick()" style="vertical-align:middle">播放语音流</button>\
	<button onclick="RtVoiceObj.wsAudioStopClick()" style="vertical-align:middle">结束</button>\
	<div class="rtVoice_audioFrameMsg"></div>\
</div>\
\
<div style="padding:5px">\
	<div style="font-size:13px;color:#999">语音通话聊天对讲，请在上面进行录音操作，音频数据会实时传送给对方播放（实时pcm）</div>\
	<span>对方标识</span>\
	<input class="rtVoice_input_wsID2" style="width:50px;padding: 5px 3px;border:1px solid #ddd;vertical-align:middle"/>\
	<button onclick="RtVoiceObj.wsOpenVoiceClick()" style="vertical-align:middle">开始通话</button>\
	<button onclick="RtVoiceObj.wsCloseVoiceClick()" style="vertical-align:middle">结束</button>\
	<div class="rtVoice_voiceReceiveMsg"></div>\
	<div class="rtVoice_voiceSendMsg"></div>\
</div>\
\
</div>\
\
<div style="margin-top:15px"><div style="display:inline-block;">\
	<div style="border:1px solid #ddd;background:#f5f5f5;color:#06c;font-weight:bold;padding:10px 5px">发语音和文本消息（简单演示，需先连接）</div>\
	<div style="border:2px solid #0b1">\
		<div style="border-bottom:2px solid #0b1; padding:3px; background:#fff">\
			<div class="rtvoiceVoiceBtn" style="display: inline-block;padding:12px 0;width:110px;text-align: center;background: #0b1;color: #fff;border-radius: 6px;cursor: pointer;">按住发语音</div>\
			<textarea class="rtvoiceMsgInput" style="vertical-align: middle;width:130px;height:40px;padding:0"></textarea>\
			<input type="button" value="发消息" onclick="RtVoiceObj.rtTxtMsgSend()">\
		</div>\
		<style>\
			.rtvoiceMsgOut,.rtvoiceMsgIn{\
				display: inline-block;\
				max-width: 220px;\
				clear: both;\
				padding: 6px 10px;\
				border-radius: 10px;\
				word-break: break-all;\
				\
				float: right;\
				background: #0b1;\
				color: #fff;\
				margin: 3px 8px 0 0;\
			}\
			.rtvoiceMsgIn{\
				float: left;\
				background: #fff;\
				color: #000;\
				margin: 3px 0 0 8px;\
			}\
		</style>\
		<div style="min-height:100px;padding-bottom:10px;background: #f0f0f0;">\
			<div onclick="$(\'.rtvoiceMsgBox\').html(\'\')" style="text-align: right;">清屏</div>\
			<div class="rtvoiceMsgBox" style="overflow: hidden;"></div>\
		</div>\
	</div>\
</div></div>\
	');
	
	var wsApi=localStorage["Rec_RtVoice_wsApi"]||"ws://127.0.0.1:9529/ws123";
	$(".rtVoice_input_ws").val(wsApi);
	
	$(".rtVoice_input_wsID1").val(localStorage["Rec_RtVoice_wsID1"]||1);
	$(".rtVoice_input_wsID2").val(localStorage["Rec_RtVoice_wsID2"]||2);
	
	bindTouch();
};


/***发语音和文本消息***/
//长按发语音
var rtvoiceStart=false;
var bindTouch=function(){
	DemoFragment.BindTouchButton("rtvoiceVoiceBtn"
		,"按住发语音"
		,"松开结束录音"
		,{upBG:"#0b1",downBG:"#fa0"}
		,function(cancel){//按下回调
			rtvoiceStart=true;
			
			//开始录音
			var openFn=window.recreq||recopen;
			var errEnd=function(err){
				if(err){
					rtvoiceStart=false;
					rtmsgView("[错误]"+err,false);
					cancel("录音错误");
					return;
				};
			};
			openFn(function(err){
				if(err) errEnd(err);
				else recstart(errEnd);
			});
		}
		,function(isCancel,isUser){//结束长按回调
			if(rtvoiceStart && !isCancel){
				//结束录音
				recstop(function(err,data){
					rtvoiceStart=false;
					if(!isUser){
						rtmsgView("[事件]touch事件被打断",false);
						return;
					};
					if(err){
						rtmsgView("[错误]"+err,false);
						return;
					};
					
					RtVoiceObj.rtvoiceMsgSend(data.data, data.duration);
				});
			};
		}
	);
};

var rtmsgTime=function(){
	var d=new Date();
	return '<span style="font-size:12px;background:rgba(0,53,255,0.2);">'+("0"+d.getMinutes()).substr(-2)+"′"+("0"+d.getSeconds()).substr(-2)+"</span> ";
};
var rtmsgView=function(msg,isIn){
	var id=RandomKey(16);
	$(".rtvoiceMsgBox").prepend('<div class="'+(isIn?"rtvoiceMsgIn":"rtvoiceMsgOut")+'">'+rtmsgTime()+msg.replace(/[<>&]/g,function(a){return "&#"+a.charCodeAt(0)+";"}).replace(/ /g,"&nbsp;").replace(/[\r\n]/g,"<br>")+' <span class="'+id+'_s" style="font-size:12px;color:#ddd"></span></div>');
	return id;
};
var rtvoiceView=function(data,isIn){
	var id=RandomKey(16);
	rtvoiceDatas[id]=data;
	$(".rtvoiceMsgBox").prepend('<div class="'+(isIn?"rtvoiceMsgIn":"rtvoiceMsgOut")+'" onclick="RtVoiceObj.rtvoicePlay(\''+id+'\')" style="cursor: pointer;">'+rtmsgTime()+'<span style="color:#06c">语音</span> '+(data.duration/1000).toFixed(2)+'s <span class="'+id+'_s" style="font-size:12px;color:#ddd"></span></div>');
	return id;
};
var rtvoiceDatas={};
RtVoiceObj.rtvoicePlay=function(id){
	var audio=$(".recPlay")[0];
	audio.style.display="inline-block";
	if(!(audio.ended || audio.paused)){
		audio.pause();
	};
	audio.src=(window.URL||webkitURL).createObjectURL(rtvoiceDatas[id].data);
	audio.play();
};


//发送语音消息给对方
RtVoiceObj.rtvoiceMsgSend=function(blob,duration){
	var msgId=rtvoiceView({data:blob, duration:duration},false);
	$("."+msgId+"_s").html("发送中");
	var revCount=0;
	var msgEnd=function(err){
		if(err){
			$("."+msgId+"_s").html("发送失败");
			rtmsgView("[语音未发送]"+err,false);
			return;
		}
		$("."+msgId+"_s").html("已发"+revCount+"人");
	};
	var err=this.readWsID2(); if(err) return msgEnd(err);
	
	var reader = new FileReader();
	reader.onloadend = (function() {
		var bytes=new Uint8Array(reader.result);
		
		this.ws__sendMessage("sendTo",{
			toMetaKey:"uid",toMetaValue:this.wsID2
			,sendType:"custom_voiceMsg",sendData:{
				fromMetaKey:"uid",fromMetaValue:this.wsID1//告诉对方是我发的信息
				,mime:blob.type, duration:duration
			}
		},bytes,null,(function(data){
			revCount=data.count;
			if(!data.count){//没有接收方
				msgEnd("对方"+this.wsID2+"不在线");
				return;
			};
			msgEnd("");
		}).bind(this),(function(err){
			msgEnd(err);
		}).bind(this));
	}).bind(this);
	reader.readAsArrayBuffer(blob);
};
//收到对方发来的语音消息
RtVoiceObj.onMsg__custom_voiceMsg=function(data,binary,msgObj){
	rtvoiceView({data:new Blob([binary], {type:data.mime}), duration:data.duration},true);
};


//发送文本消息
RtVoiceObj.rtTxtMsgSend=function(txt){
	var input=$(".rtvoiceMsgInput");
	txt=txt||input.val();
	var msgId=rtmsgView(txt,false);
	$("."+msgId+"_s").html("发送中");
	var revCount=0;
	var msgEnd=function(err){
		if(err){
			$("."+msgId+"_s").html("发送失败");
			rtmsgView("[消息未发送]"+err,false);
			return;
		}
		$("."+msgId+"_s").html("已发"+revCount+"人");
	};
	var err=this.readWsID2(); if(err) return msgEnd(err);
	
	this.ws__sendMessage("sendTo",{
		toMetaKey:"uid",toMetaValue:this.wsID2
		,sendType:"custom_txtMsg",sendData:{
			fromMetaKey:"uid",fromMetaValue:this.wsID1//告诉对方是我发的信息
			,txt:txt
		}
	},null,null,(function(data){
		revCount=data.count;
		if(!data.count){//没有接收方
			msgEnd("对方"+this.wsID2+"不在线");
			return;
		};
		input.val("");
		msgEnd("");
	}).bind(this),(function(err){
		msgEnd(err);
	}).bind(this));
};
//收到对方发来的文本消息
RtVoiceObj.onMsg__custom_txtMsg=function(data,binary,msgObj){
	rtmsgView(data.txt,true);
};


})();