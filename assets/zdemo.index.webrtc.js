/*index.html 中的 webrtc 局域网点对点传输
参考https://blog.csdn.net/zhhaogen/article/details/54908455
	https://blog.csdn.net/caoshangpa/article/details/53306992
*/
Recorder.Support();//激活Recorder.Ctx

(function(){
	var i=0;
	reclog([
	'<div style="color:#06c">**************'
	,'如果需要模拟语音通话聊天，开启步骤：'
	,(++i)+'. 准备局域网内两台设备(设备A、设备B)用最新版本浏览器(demo未适配低版本)分别打开本页面（也可以是同一台设备打开两个网页）'
	,(++i)+'. 在设备A上点击"新建连接"'
	,(++i)+'. 复制设备A"本机信息"到设备B的"远程信息"中，设备B中点击确定连接'
			+'，此时会生成设备B的本机信息'
	,(++i)+'. 复制设备B"本机信息"到设备A的"远程信息"中，设备A中点击确定连接'
	,(++i)+'. 连接已建立，任何一方都可随时开始录音，并且数据都会发送给另外一方'
	,''
	,'关于传输到对方播放时音质变差（有噪音）的问题，没找到这种小片段接续播放的现成实现，播放代码都是反复测试出来的，最差也就这样子了。两个播放模式的音质wav算是可以的，MP3次之。（16kbps,16khz）MP3开语音15分钟大概3M的流量，wav 15分钟要37M多流量'
	,''
	,'<span style="color:red">本demo仅支持局域网</span>（无需服务器支持），采用WebRTC P2P传输数据，如果要支持公网访问会异常复杂，实际使用时用WebSocket来进行数据传输数据会简单很多'
	,''
	,'IOS就不要用了，12.3.1 Safari还要到设置里面打开WebRTC ICE试验性功能'
	,''
	,'本功能主要目的在于验证H5录音实时转码、传输的可行性，并验证实时转码mp3格式小片段文件接收后的可播放性。结果：单纯的接收播放移动端和pc端并无太大差异，如果同时录音和同时播放，移动端性能低下设备卡顿明显，原因在于播放方法中有个6毫秒的暴力定时器（最开始1毫秒卡的动都动不了），换合理的播放方法应该可以做到比较完美。'
	,'**************</div>'
	].join("<br>"));
})();

function webrtcSend(blob,info){
	if(!rtcChannelOpen){
		return;
	};
	
	var reader = new FileReader();
	reader.onloadend = function() {
		var data=JSON.stringify(info)+"##"+reader.result;
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
	reader.readAsDataURL(blob);
};
function webrtcReceive(data){
	var m=/(.+?)##.+?:(.+?);\s*base64\s*,\s*(.+)$/.exec(data);
	if(!m){
		console.log("webrtc收到未知数据：",data);
		return;
	};
	var info=JSON.parse(m[1]);
	var mime=m[2];
	
	
	rtcPlayBuffer.splice(0,0,{mime:mime,data:m[3],duration:info.duration});
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


var rtcStatusView=function(){
	var html=[];
	if(rtcChannelOpen){
		html.push('<div><input type="button" onclick="webrtcCloseClick()" value="关闭连接"></div>');
	}else{
		html.push("连接已关闭，停止数据收发");
	};
	
	html.push('<div>发送：'+rtcSendMime+" "+rtcSendLen+"b "+rtcSendCount+"片 共"+rtcBitF(rtcSendSize)+" Skip:"+rtcSendSkip+"片</div>");
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
	var bstr=atob(itm.data),n=bstr.length,u8arr=new Uint8Array(n);
	while(n--){
		u8arr[n]=bstr.charCodeAt(n);
	};
	
	var ctx=Recorder.Ctx;
	ctx.decodeAudioData(u8arr.buffer,function(raw){
		var pcm=raw.getChannelData(0);
		
		var sd=pcm.length/raw.sampleRate*1000;
		var pd=itm.duration;
		var duration=sd;
		var arr=pcm;
		if(pd<sd){//数据变多了，原因在于编码器并不一定精确时间的编码，mp3首尾有静默但长度未知
			duration=pd;
			//分别去掉首尾，（尾并保留一点，方便衔接）
			var skip=Math.floor((sd-pd)/1000*raw.sampleRate/2);
			arr=pcm.slice(skip,pcm.length-skip/2);
		}else{
			//数据少了不管
		};
		
		var buffer=ctx.createBuffer(1,arr.length,raw.sampleRate);
		buffer.getChannelData(0).set(arr);
		
		var source=ctx.createBufferSource();
		source.channelCount=1;
		source.buffer=buffer;
		source.connect(ctx.destination);
		source.start();
		
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
		
		console.error("解码失败",itm,e);
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