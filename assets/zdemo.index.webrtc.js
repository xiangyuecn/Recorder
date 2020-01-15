/*index.html 中的 webrtc 局域网点对点传输
参考https://blog.csdn.net/zhhaogen/article/details/54908455
	https://blog.csdn.net/caoshangpa/article/details/53306992
*/
Recorder.Support();//激活Recorder.Ctx


/*********注入界面******************/
(function(){
	reclog("<span style='color:#f60'>实时编码除wav格式外发送间隔尽量不要低于编码速度速度，除wav外其他格式编码结果可能会比实际的PCM结果音频时长略长或略短，如果涉及到实时解码应留意此问题，长了的时候可截断首尾使解码后的PCM长度和录音的PCM长度一致（可能会增加噪音）</span>");
	
	var i=0;
	reclog(['已开启实时编码传输模拟'
	,'<div style="color:#06c">**************'
	,'如果需要模拟语音通话聊天，开启步骤：'
	,(++i)+'. 准备局域网内两台设备(设备A、设备B)用最新版本浏览器(demo未适配低版本)分别打开本页面（也可以是同一台设备打开两个网页）'
	,(++i)+'. 在设备A上点击"新建连接"'
	,(++i)+'. 复制设备A"本机信息"到设备B的"远程信息"中，设备B中点击确定连接'
			+'，此时会生成设备B的本机信息'
	,(++i)+'. 复制设备B"本机信息"到设备A的"远程信息"中，设备A中点击确定连接'
	,(++i)+'. 连接已建立，任何一方都可随时开始录音，并且数据都会发送给另外一方'
	,''
	,'关于传输到对方播放时音质变差（有噪音）的问题，没找到这种小片段接续播放的现成实现，播放代码都是反复测试出来的，最差也就这样子了。两个播放模式的音质wav算是勉强最好，MP3差点。（16kbps,16khz）MP3开语音15分钟大概3M的流量，wav 15分钟要37M多流量。另外MP3编码出来的音频的播放时间比PCM原始数据要长一些，这个地方需要注意。'
	,''
	,'<span style="color:red">本demo仅支持局域网</span>（无需服务器支持），采用WebRTC P2P传输数据，如果要支持公网访问会异常复杂，实际使用时用WebSocket来进行数据传输数据会简单很多'
	,''
	,'IOS就不要用了，12.3.1 Safari还要到设置里面打开WebRTC ICE试验性功能'
	,''
	,'PC（设备A）和Android Hybrid App（设备B）进行测试正常，但手机如果作为Peer A未能连接成功。'
	,''
	,'本功能主要目的在于验证H5录音实时转码、传输的可行性，并验证实时转码mp3格式小片段文件接收后的可播放性。结果：单纯的接收播放移动端和pc端并无太大差异，如果同时录音和同时播放，移动端性能低下设备卡顿明显，原因在于播放方法中有个6毫秒的暴力定时器（最开始1毫秒卡的动都动不了），换合理的播放方法应该可以做到比较完美。'
	,'**************</div>'
	].join("<br>"));
	
	$(".webrtcView").html([""
,'<div class="webrtcSend">'
,'<div style="display:inline-block;vertical-align: top;border:1px solid #ddd;margin-top:6px">'
,'	<div style="color:#06c">（可选）开启H5语音通话（传输数据使用局域网WebRTC P2P）：</div>'
,'	<div>'
,'		接收端播放模式：'
,'		<label><input type="radio" name="webrtcPlayMode" class="webrtcPlayModeDecode" value="decode" checked>解码播放</label>'
,'		<label><input type="radio" name="webrtcPlayMode" value="audio">Audio连续播放</label>'
,'	</div>'
,'	<div>'
,'		本机信息：<textarea class="webrtcLocal" readonly style="width:160px;height:60px"></textarea>'
,'		<input type="button" onclick="webrtcCreate()" value="新建连接">'
,'	</div>'
,'	<div>'
,'		远程信息：<textarea class="webrtcRemote" style="width:160px;height:60px"></textarea>'
,'		<input type="button" onclick="webrtcConnect()" value="确定连接">'
,'	</div>'
,'	<audio class="webrtcPlay1"></audio>'
,'	<audio class="webrtcPlay2"></audio>'
,'	<div class="webrtcStatus"></div>'
,'</div>'

,'<div style="display:inline-block;border:1px solid #ddd;margin-top:6px">'
,'	<div style="color:#06c">（可选）语音和消息（简单演示）：</div>'
,'	<div style="border:2px solid #0b1">'
,'		<div style="border-bottom:2px solid #0b1; padding:3px;">'
,'			<div class="webrtcVoiceBtn" style="display: inline-block;padding:12px 0;width:110px;text-align: center;background: #0b1;color: #fff;border-radius: 6px;">按住发语音</div>'
,'			<textarea class="webrtcMsgInput" style="vertical-align: middle;width:130px;height:40px;padding:0"></textarea>'
,'			<input type="button" value="发消息" onclick="webrtcMessageSend()">'
,'		</div>'
,'		<style>'
,'			.webrtcMsgOut,.webrtcMsgIn{'
,'				display: inline-block;'
,'				max-width: 220px;'
,'				clear: both;'
,'				padding: 6px 10px;'
,'				border-radius: 10px;'
,'				word-break: break-all;'
,'				'
,'				float: right;'
,'				background: #0b1;'
,'				color: #fff;'
,'				margin: 3px 8px 0 0;'
,'			}'
,'			.webrtcMsgIn{'
,'				float: left;'
,'				background: #fff;'
,'				color: #000;'
,'				margin: 3px 0 0 8px;'
,'			}'
,'		</style>'
,'		<div style="min-height:100px;padding-bottom:10px;background: #f0f0f0;">'
,'			<div onclick="$(\'.webrtcMsgBox\').html(\'\')" style="text-align: right;">清屏</div>'
,'			<div class="webrtcMsgBox" style="overflow: hidden;"></div>'
,'		</div>'
,'	</div>'
,'</div>'
,'</div>'
	].join("\n"));
})();



var realTimeSendTryTime=0;
var realTimeSendTryEncBusy;
var realTimeSendTryChunk;
var realTimeSendTryChunks;
var realTimeSendTryChunkSampleRate;
var realTimeSendTryReset=function(){
	realTimeSendTryTime=0;
};
var realTimeSendTry=function(recSet,interval,pcmDatas,sampleRate){
	if(rtcVoiceStart){
		realTimeSendTryReset();
		return;
	};
	
	var t1=Date.now(),endT=0,recImpl=Recorder.prototype;
	if(realTimeSendTryTime==0){
		realTimeSendTryTime=t1;
		realTimeSendTryEncBusy=0;
		realTimeSendTryChunk=null;
		realTimeSendTryChunks=[];
		
		if(recSet.type=="wav"){
			reclog("<span style='color:#0b1'>实时编码wav格式很快，无需任何优化</span>");
		}else if(recImpl[recSet.type+"_start"]){
			reclog("<span style='color:#0b1'>实时编码"+recSet.type+"格式支持边录边转码(Worker)</span>");
		}else{
			reclog("<span style='color:#f60'>实时编码"+recSet.type+"格式采用UI线程转码，将会有明显卡顿</span>");
		};
	};
	if(t1-realTimeSendTryTime<interval){
		return;
	};
	realTimeSendTryTime=t1;
	
	//借用SampleData函数进行数据的连续处理，采样率转换是次要的
	var chunk=Recorder.SampleData(pcmDatas,sampleRate,recSet.sampleRate,realTimeSendTryChunk,{frameType:recSet.type});
	realTimeSendTryChunk=chunk;
	realTimeSendTryChunks.push(chunk.data);
	realTimeSendTryChunkSampleRate=chunk.sampleRate;
	
	var recMock=Recorder($.extend({},recSet));
	recMock.mock(chunk.data,chunk.sampleRate);
	
	if(recImpl[recSet.type+"_start"]){
		endT=Date.now();
	};
	
	if(realTimeSendTryEncBusy>=2){
		if(window.rtcChannelOpen){
			rtcSendSkip++;
			rtcStatusView();
		}else{
			reclog("编码队列阻塞，已丢弃一帧",1);
		};
		return;
	};
	realTimeSendTryEncBusy++;
	
	recstopFn(null,0,function(err,blob,duration){
		realTimeSendTryEncBusy&&(realTimeSendTryEncBusy--);
		
		//此处应伪装成发送blob数据
		//emmmm.... 发送给语音聊天webrtc
		if(blob&&window.rtcChannelOpen){
			webrtcStreamSend(blob,{
				duration:duration
				,interval:interval
			});
			return -1;
		};
		
		var ms=(endT||Date.now())-t1;
		var max=recImpl[recSet.type+"_start"]?99999:1000*pcmDatas[0].length/sampleRate-10;//录音回调1帧时长
		return realTimeSendTryChunks.length+"实时编码占用<span style='color:"+(ms>max?"red":"")+"'>"+ms+"ms</span>";
	},recMock);
};
var realTimeSendTryStop=function(recSet){
	if(!realTimeSendTryTime){
		return;
	}
	
	//借用SampleData函数把二维数据转成一维，采样率转换是次要的
	var chunk=Recorder.SampleData(realTimeSendTryChunks,realTimeSendTryChunkSampleRate,realTimeSendTryChunkSampleRate);
	
	var recMock=Recorder($.extend({},recSet));
	recMock.mock(chunk.data,chunk.sampleRate);
	recstopFn(null,0,function(err,blob,time){
		return "实时编码汇总结果";
	},recMock);
};


//按住发语音
var rtcVoiceStart,rtcVoiceDownEvent,rtcVoiceDownHit;
$("body").bind("mousedown touchstart",function(e){
	var elem=$(".webrtcVoiceBtn");
	if(e.target!=elem[0]){
		return;
	};
	rtcVoiceDownEvent=e;
	
	$("body").css("user-select","none");//kill all 免得渣渣浏览器里面复制搜索各种弹，这些浏览器单独给div设置是没有用的
	
	rtcVoiceDownHit=setTimeout(function(){
		rtcVoiceStart=true;
		
		//开始录音
		recstart(function(err){
			if(err){
				rtcVoiceStart=false;
				rtcMsgView("[错误]"+err,false);
				return;
			};
			
			if(rtcVoiceStart){//也许已经up了
				elem.css("background","#f60").text("松开结束录音");
			};
		});
	},300);
}).bind("mouseup touchend touchcancel",function(e){
	if(rtcVoiceDownHit || rtcVoiceStart){
		$("body").css("user-select","");
		clearTimeout(rtcVoiceDownHit);
		rtcVoiceDownHit=0;
		
		if(rtcVoiceStart){
			rtcVoiceStart=false;
			$(".webrtcVoiceBtn").css("background","#0b1").text("按住发语音");
			
			//结束录音
			recstop(function(err,data){
				if(e.type=="touchcancel"){
					rtcMsgView("[事件]touch事件被打断",false);
					return;
				};
				if(err){
					rtcMsgView("[错误]"+err,false);
					return;
				};
				
				webrtcVoiceSend(data);
			});
		};
	};
}).bind("mousemove touchmove",function(e){
	if(rtcVoiceDownHit){
		var a=rtcVoiceDownEvent.originalEvent;
		var b=e.originalEvent;
		if(Math.abs(a.screenX-b.screenX)+Math.abs(a.screenY-b.screenY)>3*2){
			$("body").css("user-select","");
			clearTimeout(rtcVoiceDownHit);
			rtcVoiceDownHit=0;
		};
	};
});












/*********接口********************/
function webrtcStreamSend(blob,info){
	if(!rtcChannelOpen){
		return;
	};
	
	var send=function(res){
		var data="stream##"+JSON.stringify(info)+"##"+res;
		if(rtcChannel.bufferedAmount>data.length*2){//发送队列阻塞了，丢弃当前的
			rtcSendSkip++;
			rtcStatusView();
			return;
		};
		rtcChannel.send(data);
		
		rtcSendCount++;
		rtcSendSize+=data.length;
		rtcSendMime=blob.type;
		rtcSendLen=data.length;
		rtcStatusView();
	};
	
	var reader = new FileReader();
	reader.onloadend = function() {
		send(reader.result);
	};
	reader.readAsDataURL(blob);
};

function webrtcMessageSend(txt){
	var input=$(".webrtcMsgInput");
	txt=txt||input.val();
	rtcMsgView(txt,false);
	
	if(rtcChannelOpen){
		rtcChannel.send("message##{}##txt:"+txt);
		input.val("");
	}else{
		rtcMsgView("[未发送]未连接到远程设备",true);
	};
};

function webrtcVoiceSend(data){
	var reader = new FileReader();
	reader.onloadend = function() {
		var info={duration:data.duration};
		rtcVoiceView(data,false);
		
		if(rtcChannelOpen){
			rtcChannel.send("voice##"+JSON.stringify(info)+"##"+reader.result);
		}else{
			rtcMsgView("[未发送]未连接到远程设备",true);
		};
	};
	reader.readAsDataURL(data.data);
};

function webrtcReceive(data){
	var m=/^(.+?)##(.+?)##(?:txt:([\S\s]*)|data:(.+?);\s*base64\s*,\s*(.+))?$/.exec(data);
	if(!m){
		console.warn("webrtc收到未知数据：",data);
		return;
	};
	var type=m[1];
	var info=JSON.parse(m[2]);
	var txt=m[3];
	var mime=m[4];
	var b64=m[5];
	
	if(type=="message"){
		rtcMsgView(txt,true);
		return;
	}else if(type=="voice"){
		var u8arr=rtcB64ToUInt8(b64);
		info.data=new Blob([u8arr.buffer],{type:mime});
		rtcVoiceView(info,true);
		return;
	};
	
	if(type!="stream"){
		console.warn("未知数据类型"+type,data);
		return;
	};
	
	rtcPlayBuffer.splice(0,0,{mime:mime,data:b64,duration:info.duration});
	var maxLen=Math.ceil(1000/info.interval);
	if(rtcPlayBuffer.length>maxLen){//播放队列延迟太大，直接重置队列
		rtcRecSkip+=rtcPlayBuffer.length-1;
		rtcPlayBuffer.length=1;
	};
	rtcPlay();
	
	
	rtcRecCount++;
	rtcRecSize+=data.length;
	rtcRecMime=mime;
	rtcRecLen=data.length;
	rtcStatusView();
};
var rtcB64ToUInt8=function(b64){
	var bstr=atob(b64),n=bstr.length,u8arr=new Uint8Array(n);
	while(n--){
		u8arr[n]=bstr.charCodeAt(n);
	};
	return u8arr;
};





function webrtcOpen(){
	if($(".realTimeSend").val()=="996"){
		$(".realTimeSend").val(500);
	};
	rtcStatusView();
};
function webrtcClose(){
	rtcStatusView();
};
function webrtcCloseClick(){
	if(rtcConn){
		rtcConn.close();
	};
};


var rtcMsgTime=function(){
	var d=new Date();
	return '<span style="font-size:12px;background:rgba(0,53,255,0.2);">'+("0"+d.getMinutes()).substr(-2)+"′"+("0"+d.getSeconds()).substr(-2)+"</span> ";
};
var rtcMsgView=function(msg,isIn){
	$(".webrtcMsgBox").prepend('<div class="'+(isIn?"webrtcMsgIn":"webrtcMsgOut")+'">'+rtcMsgTime()+msg.replace(/[<>&]/g,function(a){return "&#"+a.charCodeAt(0)+";"}).replace(/ /g,"&nbsp;").replace(/[\r\n]/g,"<br>")+'</div>');
};
var rtcVoiceView=function(data,isIn){
	var id=RandomKey(16);
	rtcVoiceDatas[id]=data;
	$(".webrtcMsgBox").prepend('<div class="'+(isIn?"webrtcMsgIn":"webrtcMsgOut")+'" onclick="rtcVoicePlay(\''+id+'\')">'+rtcMsgTime()+'<span style="color:#06c">语音</span> '+(data.duration/1000).toFixed(2)+'s</div>');
};
var rtcVoiceDatas={};
var rtcVoicePlay=function(id){
	var audio=$(".recPlay")[0];
	audio.controls=true;
	if(!(audio.ended || audio.paused)){
		audio.pause();
	};
	audio.src=(window.URL||webkitURL).createObjectURL(rtcVoiceDatas[id].data);
	audio.play();
};


var rtcStatusView=function(){
	var html=[];
	var ctrl;
	if(rtcChannelOpen){
		ctrl='<input type="button" onclick="webrtcCloseClick()" value="关闭连接">';
	}else{
		ctrl="<span style='color:#f60'>连接已关闭，停止数据收发</span>";
	};
	
	html.push('<div style="padding-top:10px">发送：'+rtcSendMime+" "+rtcSendLen+"b "+rtcSendCount+"片 共"+rtcBitF(rtcSendSize)+" Skip:"+rtcSendSkip+"片 "+ctrl+"</div>");
	html.push('<div>接收：'+rtcRecMime+" "+rtcRecLen+"b "+rtcRecCount+"片 共"+rtcBitF(rtcRecSize)+" Skip:"+rtcRecSkip+"片 PlayMode:"+rtcPlayMode+"</div>");
	
	rtcStatus.html(html.join("\n"));
};
var rtcBitF=function(size){
	if(size<1024*900){
		return (size/1024).toFixed(2)+"KB";
	}else{
		return (size/1024/1024).toFixed(2)+"MB";
	};
};
var rtcSendMime="-",rtcSendLen=0,rtcSendCount=0,rtcSendSize=0,rtcSendSkip=0;
var rtcRecMime="-",rtcRecLen=0,rtcRecCount=0,rtcRecSize=0,rtcRecSkip=0;
var rtcStatus=$(".webrtcStatus");






//*****语音流播放*****
var rtcPlayBuffer=[];
var rtcPlayModeDecode=$(".webrtcPlayModeDecode")[0];
var rtcPlayMode="-";
var rtcPlay=function(){
	if(rtcPlayModeDecode.checked){
		rtcPlayMode="decode";
		rtcDecodePlay();
	}else{
		rtcPlayMode="audio";
		rtcAuidoPlay();
	};
};

//方式一：解码播放
var rtcDecPlaySource;
var rtcDecPlayID=0;
var rtcDecPlayIDCur=0;
var rtcDecPlayNextTime;
var rtcDecPlayTime=0;
var rtcDecPlayTimeSkips=[0,0,0];
var rtcDecPlayTimeSkip=0;
var rtcDecodePlay=function(decode){
	if(!rtcPlayModeDecode.checked){
		return;
	};
	if(rtcPlayBuffer.length<1){
		return;
	};
	
	if(!rtcDecPlayTime){
		setInterval(function(){//暴力计算BufferSource播放时间
			if(rtcDecPlayNextTime<=Date.now()+3){
				rtcDecodePlay(1);
			};
		},6);
	}else if(!decode){
		return;
	};
	if(rtcDecPlayIDCur!=rtcDecPlayID){
		return;
	};
	rtcDecPlayID++;
	rtcDecPlayTime=Date.now();
	
	var itm=rtcPlayBuffer.pop();
	var u8arr=rtcB64ToUInt8(itm.data);
	
	var ctx=Recorder.Ctx;
	ctx.decodeAudioData(u8arr.buffer,function(raw){
		var pcm=raw.getChannelData(0);
		
		var sd=pcm.length/raw.sampleRate*1000;
		var pd=itm.duration;
		var duration=sd;
		var arr=pcm;
		if(pd<sd){//数据变多了，原因在于编码器并不一定精确时间的编码，此处只针对lamejs的mp3进行优化，因为mp3每帧固定时长，结尾可能存在填充
			duration=pd;
			
			//去掉多余的尾部
			var skip=Math.floor((sd-pd)/1000*raw.sampleRate/2);
			arr=new Float32Array(pcm.subarray(0,pcm.length-skip));//低版本没有slice
		}else{
			//数据少了不管
		};
		
		var buffer=ctx.createBuffer(1,arr.length,raw.sampleRate);
		buffer.getChannelData(0).set(arr);
		
		var source=ctx.createBufferSource();
		source.channelCount=1;
		source.buffer=buffer;
		source.connect(ctx.destination);
		if(source.start){source.start()}else{source.noteOn(0)};
		
		//不关闭上一个，让它继续播放完结尾，衔接起来好些
		//rtcDecPlaySource&&rtcDecPlaySource.stop();
		rtcDecPlaySource=source;
		
		rtcDecPlayTimeSkips.splice(0,0,Date.now()-rtcDecPlayTime);
		rtcDecPlayTime=Date.now();
		
		if(rtcDecPlayTimeSkips.length>3){
			rtcDecPlayTimeSkips.length=3;
		};
		
		rtcDecPlayTimeSkip=(rtcDecPlayTimeSkips[0]+rtcDecPlayTimeSkips[1]+rtcDecPlayTimeSkips[2])/3;
		
		
		rtcDecPlayIDCur=rtcDecPlayID;
		rtcDecPlayNextTime=Date.now()+duration-rtcDecPlayTimeSkip;
	},function(e){
		rtcDecPlayIDCur=rtcDecPlayID;
		rtcDecPlayNextTime=Date.now()+300;
		
		console.error("解码失败:"+itm.mime+" "+e.message);
		rtcRecSkip++;
	});
};

//方式二：直接audio播放
var rtcAudioPlay1;
var rtcAudioPlay2;
var rtcAudioPlayCur,rtcAudioPlayPrev;
var rtcAudioPlayItm;
var rtcAudioPlayNextTime;
var rtcAudioPlayID=0;
var rtcAudioPlayTime=0;
var rtcAudioPlayTimeSkips=[0,0,0];
var rtcAudioPlayTimeSkip=0;
var rtcAuidoPlay=function(){
	if(rtcPlayModeDecode.checked){
		return;
	};
	if(!rtcAudioPlay1){
		rtcAudioPlay1=$(".webrtcPlay1")[0];
		rtcAudioPlay2=$(".webrtcPlay2")[0];
		
		setInterval(function(){//audio currentTime精度太低，暴力计算
			var audio=rtcAudioPlayCur;
			if(audio.rtcPlayID!=rtcAudioPlayID){
				return;
			};
			if(rtcAudioPlayNextTime<=Date.now()+3){
				audio.rtcPlayID=-1;
				rtcAuidoPlay();
			};
		},6);
		//计算从开始播放到发出声音的延迟
		rtcAudioPlay1.onplaying=rtcAudioPlay2.onplaying=function(e){
			var audio=e.target;
			audio.rtcPlayID=rtcAudioPlayID;
			rtcAudioPlayTimeSkips.splice(0,0,Date.now()-rtcAudioPlayTime);
			rtcAudioPlayTime=Date.now();
			
			if(rtcAudioPlayTimeSkips.length>3){
				rtcAudioPlayTimeSkips.length=3;
			};
			
			rtcAudioPlayTimeSkip=(rtcAudioPlayTimeSkips[0]+rtcAudioPlayTimeSkips[1]+rtcAudioPlayTimeSkips[2])/3;
			
			//不关闭上一个，让它继续播放完结尾，衔接起来好些
			//rtcAudioPlayPrev&&rtcAudioPlayPrev.pause();
			
			var sd=audio.duration*1000;
			var pd=rtcAudioPlayItm.duration;
			var duration=sd;
			var skip=0;
			if(pd<sd){//编码器并不一定精确时间的编码，mp3首尾有静默但长度未知
				duration=pd;
				//分别跳过首尾（其实保留尾）
				skip=(sd-pd)/2;
			};
			
			rtcAudioPlayNextTime=Date.now()+duration-skip-rtcAudioPlayTimeSkip;
		};
	};
	
	
	if(rtcPlayBuffer.length<1){
		return;
	};
	if(rtcAudioPlayCur && rtcAudioPlayCur.rtcPlayID!=-1){
		return;
	};
	
	rtcAudioPlayCur=rtcAudioPlayCur==rtcAudioPlay1?rtcAudioPlay2:rtcAudioPlay1;
	rtcAudioPlayPrev=rtcAudioPlayCur==rtcAudioPlay2?rtcAudioPlay1:rtcAudioPlay2;
	
	rtcAudioPlayID++;
	rtcAudioPlayCur.rtcPlayID=0;
	
	rtcAudioPlayTime=Date.now();
	var itm=rtcPlayBuffer.pop();
	rtcAudioPlayItm=itm;
	rtcAudioPlayCur.src="data:"+itm.mime+";base64,"+itm.data;
	rtcAudioPlayCur.play();
};







//*****p2p连接*****
var rtcConn;
var rtcChannel,rtcChannelOpen;
function webrtcInitTry(){
	if(rtcConn){
		return;
	};
	var RTC=window.RTCPeerConnection||webkitRTCPeerConnection;
	if(!RTC){
		reclog("当前浏览器不支持RTCPeerConnection",1);
		return;
	};
	rtcConn=new RTC(null,null);
};
function webrtcInfoCreate(fn,msg){
	rtcConn.oniceconnectionstatechange=function(){
		var state=rtcConn.iceConnectionState;
		reclog("WebRTC Connect State: "+state);
		if(state=="disconnected"){
			rtcConn.close();
		};
	};
	rtcConn.onicecandidate=function(e){
		var v=e.candidate;
		if(v){
			//等待为null时结束
			console.log("ICE",v.candidate,[v]);
			return;
		};
		$(".webrtcLocal").val(JSON.stringify(rtcConn.localDescription));
		reclog(msg);
	};
	
	var r=0;
	var t=function(v){
		if(!v||r) return; r=1;//防止callback和then重入
		rtcConn.setLocalDescription(v);
		
		console.log(fn,v);
	};
	var f=function(e){
		reclog("出错啦:"+e,1);
	};
	var p=rtcConn[fn](t,f);
	p&&p.then&&p.then(t)["catch"](f);
};
function webrtcCreate(){
	webrtcInitTry();
	if(rtcChannel){
		reclog("连接已创建，请勿重复创建，刷新页面重试",1);
		return;
	};
	rtcConn.onnegotiationneeded=function(){
		webrtcInfoCreate("createOffer",'已新建连接，请将本机信息复制到另外一个设备的"远程信息"输入框中，并点击确定连接');
	};
	reclog("创建连接中...");
	rtcChannel=rtcConn.createDataChannel("REC RTC");
};
function webrtcConnect(){
	webrtcInitTry();
	
	var isLocal=$(".webrtcLocal").val();
	try{
		var remote=JSON.parse($(".webrtcRemote").val());
	}catch(e){
		reclog("请正确输入远程信息："+e.message,1);
		console.error("json解析错误",e);
		return;
	};
	console.log("远程信息",remote);
	
	var bind=function(){
		rtcChannel.onopen=function(){
			rtcChannelOpen=1;
			console.log("连接已建立");
			reclog("<span style='color:#0b1'>连接已建立，可以开始录音啦</span>");
			webrtcOpen();
			
			if(isLocal){
				setTimeout(function(){
					webrtcMessageSend("# Hello \n - 你可以随时开始录音，会以通话形式实时传送给我 \n - 按住发语音可以发送一个语音消息");
				},100);
			}else{
				webrtcMessageSend("Me too! 太长了就不copy了");
			};
		};
		rtcChannel.onclose=function(){
			rtcChannelOpen=0;
			rtcConn=null;
			rtcChannel=null;
			$(".webrtcLocal").val("");
			$(".webrtcRemote").val("");
			
			console.log("连接已关闭");
			reclog("连接已关闭");
			webrtcClose();
		};
		rtcChannel.onmessage=function(e){
			webrtcReceive(e.data);
		};
		rtcChannel.onerror=function(e){
			console.error("rtcChannel出现错误：",e);
			reclog("rtcChannel出现错误："+e,1);
		};
	};
	
	if(isLocal){
		//对方已确认连接
		if(remote.type!="answer"){
			reclog("远程信息不是通过确定连接创建的");
			return;
		};
		bind();
		rtcConn.setRemoteDescription(new RTCSessionDescription(remote));
	}else{
		//新创建远程连接
		if(remote.type!="offer"){
			reclog("远程信息不是通过新建连接创建的");
			return;
		};
		rtcConn.setRemoteDescription(new RTCSessionDescription(remote));
		
		rtcConn.ondatachannel=function(e){
			rtcChannel=e.channel;
			bind();
		};
		reclog("远程连接中...");
		webrtcInfoCreate("createAnswer",'已连接，请将本机信息复制到上一个设备的"远程信息"输入框中，并点击确定连接');
	};
};