/*index.html 中的 webrtc 局域网点对点传输
参考https://blog.csdn.net/zhhaogen/article/details/54908455
	https://blog.csdn.net/caoshangpa/article/details/53306992
*/


/*********注入界面******************/
(function(){

reclog("请稍后，正在加载需要的js...");
loadJsList([//加载依赖的js
	{url:"src/extensions/buffer_stream.player.js"
		,check:function(){return !Recorder.BufferStreamPlayer}}
	,{url:"assets/runtime-codes/fragment.touch_button.js"
		,check:function(){return !window.DemoFragment||!DemoFragment.BindTouchButton}}
],function(){
	reclog("需要的js加载完成");
	bindTouch();
	rtConnModeClick();
},function(err){
	reclog(err,1);
});
window.rtConnModeIsWS=true;
window.rtConnModeClick=function(){
	var isWS=$(".rtConnMode_ws")[0].checked;
	rtConnModeIsWS=isWS;
	$(".rtVoiceView")[isWS?"show":"hide"]();
	$(".webrtcView")[!isWS?"show":"hide"]();
	
	if(isWS){
		rtVoiceOnShow();
	}else{
		webrtcTips(); webrtcTips=function(){};
	}
};

var webrtcTips=function(){
	reclog("<span style='font-size:30px;color:#0b1'>↑↑↑WebRTC按上面的步骤使用↑↑↑</span>");
	
	reclog("<span style='color:#f60'>实时编码未使用takeoffEncodeChunk实现时：除wav、pcm格式外发送间隔尽量不要低于编码速度速度，除wav、pcm外其他格式编码结果可能会比实际的PCM结果音频时长略长或略短，如果涉及到实时解码应留意此问题，长了的时候可截断首尾使解码后的PCM长度和录音的PCM长度一致（可能会增加噪音）</span>，<span style='color:#0b1'>使用takeoffEncodeChunk实现时无此限制（在上面勾选“接管编码器输出”即可开启使用）</span>；参考<a target='_blank' href='https://xiangyuecn.github.io/Recorder/assets/工具-代码运行和静态分发Runtime.html?jsname=teach.realtime.encode_transfer_mp3'>【教程】【音频流】【上传】实时转码并上传-mp3专版</a>。");
	
	reclog("<span style='color:#0b1'>BufferStreamPlayer扩展：是专门用来实时播放音频片段文件的；源码在 src/extensions/buffer_stream.player.js ，参考<a target='_blank' href='https://xiangyuecn.github.io/Recorder/assets/工具-代码运行和静态分发Runtime.html?jsname=teach.realtime.decode_buffer_stream_player'>【教程】【音频流】【播放】实时解码播放音频片段</a>。</span>");
	
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
	,'关于传输到对方播放时音质变差（有杂音）的问题，没找到这种小片段接续播放的现成实现，播放代码都是反复测试出来的，最差也就这样子了（有了BufferStreamPlayer插件加持，对音频片段的播放支持稍微友好很多）。两个播放模式的音质wav、pcm格式是最好的，mp3差很多。（16kbps,16khz）mp3开语音15分钟大概3M的流量，wav 15分钟要37M多流量。另外mp3编码出来的音频的播放时间比PCM原始数据要长一些（解码mp3也会引入静默），这个地方需要注意，可通过调大发送间隔来大幅减轻停顿杂音（但会增加语音延迟）；本例子默认采用的是onProcess+mock实现，因此会有明显的停顿杂音，如果开启takeoffEncodeChunk实现会好很多，在上面勾选上“接管编码器输出”即可开启。'
	,''
	,'<span style="color:red">本demo仅支持局域网</span>（无需服务器支持），采用WebRTC P2P传输数据，如果要支持公网访问会异常复杂，实际使用时用WebSocket来进行数据传输数据会简单很多'
	,'**************</div>'
	].join("<br>"));
	
	reclog("<span style='font-size:30px;color:#0b1'>↓↓↓WebRTC按下面的步骤使用↓↓↓</span>");
};

	$(".realTimeSendView").html([""
,'<div onclick="rtConnModeClick()" style="margin-top:6px;padding:8px;color:#fff;font-weight: bold;background:#5e97d0;border-radius:6px 6px 0 0;">'
,'	传输通道：'
,'	<label><input type="radio" name="rtConnMode" class="rtConnMode_ws" value="ws" checked>WebSocket(连服务器)</label>'
,'	<label><input type="radio" name="rtConnMode" class="rtConnMode_rtc" value="rtc">WebRTC(局域网P2P)</label>'
,'</div>'
,'<div style="padding:8px;background:#f3f7fc;border-radius:0 0 6px 6px;">'

,'<div class="rtVoiceView" style="display:none"></div>'

,'<div class="webrtcView" style="display:none">'

,'<div class="webrtcSend">'
,'<div style="border:1px solid #ddd;background:#fff">'
,'	<div style="background:#f5f5f5;color:#06c;font-weight:bold;border-bottom:1px solid #ddd;padding:10px 5px">WebRTC语音通话聊天（上面录音时会自动通过局域网WebRTC P2P传输给对方）</div>'

,'	<div style="border-bottom:1px solid #ddd;padding:5px">'
,'		<div class="webrtcStatus"></div>'
,'		<div class="webrtcWaveBox" style="display:none;margin-top:5px">'
,'			<div style="border:1px solid #ccc;display:inline-block"><div style="height:100px;width:300px;" class="webrtcWave"></div></div>'
,'			<span class="webrtcWaveTime"></span>'
,'		</div>'
,'	</div>'

,'	<div style="color:#888;border-bottom:1px solid #ddd;padding:5px">'
,'		接收端播放模式：'
,'		<label><input type="radio" name="webrtcPlayMode" class="webrtcPlayModeDecode" value="decode" checked>BufferStreamPlayer解码播放</label>'
,'		<label><input type="radio" name="webrtcPlayMode" value="audio">原生Audio播放</label>'
,'	</div>'
,'	<div style="border-bottom:1px solid #ddd;padding:5px">'
,'		本机信息：<textarea class="webrtcLocal" readonly style="width:40%;height:40px;vertical-align: middle;"></textarea>'
,'		<input type="button" onclick="webrtcCreate()" value="新建连接">'
,'	</div>'
,'	<div style="padding:5px">'
,'		远程信息：<textarea class="webrtcRemote" style="width:40%;height:40px;vertical-align: middle;"></textarea>'
,'		<input type="button" onclick="webrtcConnect()" value="确定连接">'
,'	</div>'
,'	<audio class="webrtcPlay1"></audio>'
,'	<audio class="webrtcPlay2"></audio>'
,'</div>'

,'<div style="margin-top:15px"><div style="display:inline-block;">'
,'	<div style="border:1px solid #ddd;background:#f5f5f5;color:#06c;font-weight:bold;padding:10px 5px">发语音和文本消息（简单演示，需先连接）</div>'
,'	<div style="border:2px solid #0b1">'
,'		<div style="border-bottom:2px solid #0b1; padding:3px; background:#fff">'
,'			<div class="webrtcVoiceBtn" style="display: inline-block;padding:12px 0;width:110px;text-align: center;background: #0b1;color: #fff;border-radius: 6px;cursor: pointer;">按住发语音</div>'
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
,'</div></div>'
,'</div>'

,'</div>'
,'</div>'
	].join("\n"));
	
	
//长按发语音
var bindTouch=function(){
	window.rtcVoiceStart=false;
	DemoFragment.BindTouchButton("webrtcVoiceBtn"
		,"按住发语音"
		,"松开结束录音"
		,{upBG:"#0b1",downBG:"#fa0"}
		,function(cancel){//按下回调
			rtcVoiceStart=true;
			
			//开始录音
			var openFn=window.recreq||recopen;
			var errEnd=function(err){
				if(err){
					rtcVoiceStart=false;
					rtcMsgView("[错误]"+err,false);
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
			if(rtcVoiceStart && !isCancel){
				//结束录音
				recstop(function(err,data){
					rtcVoiceStart=false;
					if(!isUser){
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
		}
	);
};

})();



var realTimeSendTryTime=0;
var realTimeSendTryEncBusy;
var realTimeSendTryChunk;
var realTimeSendTryChunks;
var realTimeSendTryChunkSampleRate;
var realTimeSendTryTakeoffChunksIdx;
var realTimeSendTryReset=function(recSet){
	realTimeSendTryTime=0;
	if(!rtcVoiceStart){//给对方发送重置信号，初始化播放环境
		webrtcStatusSend("reset",recSet);
	};
};
var realTimeSendTry=function(recSet,pcmDatas,sampleRate){
	if(rtConnModeIsWS){//websocket，不处理
		return;
	};
	if(rtcVoiceStart){//长按发语音，不实时发送语音
		realTimeSendTryReset();
		return;
	};
	
	var interval=window.realTimeSendTime||500;
	var t1=Date.now(),endT=0,recImpl=Recorder.prototype;
	if(realTimeSendTryTime==0){
		realTimeSendTryTime=t1;
		realTimeSendTryEncBusy=0;
		realTimeSendTryChunk=null;
		realTimeSendTryChunks=[];
		realTimeSendTryTakeoffChunksIdx=0;
		
		if(recSet.type=="wav"){
			reclog("<span style='color:#0b1'>实时编码wav格式很快，无需任何优化</span>");
		}else if(recImpl[recSet.type+"_start"]){
			reclog("<span style='color:#0b1'>实时编码"+recSet.type+"格式支持边录边转码(Worker)</span>");
		}else{
			reclog("<span style='color:#f60'>实时编码"+recSet.type+"格式采用UI线程转码，将会有明显卡顿</span>");
		};
		
		if(recSet.takeoffEncodeChunk){
			reclog("已开启takeoffEncodeChunk实现，通过接管实时编码输出，避免了音频片段首尾的静默停顿导致的杂音",2);
			if(recSet.type!="mp3"){
				reclog("当前测试代码只提供了mp3格式的takeoffEncodeChunk处理，请升级代码",1);
			};
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
	
	
	if(recImpl[recSet.type+"_start"]){
		endT=Date.now();
	};
	
	var st1=Date.now();
	var encodeEnd=function(tag,blob,duration){
		//此处应伪装成发送blob数据
		//emmmm.... 发送给语音聊天webrtc
		if(window.rtcChannelOpen){
			webrtcStreamSend(blob,{
				duration:duration
				,interval:interval
				
				,type:recSet.type
				,bitRate:recSet.bitRate
				,sampleRate:chunk.sampleRate
			});
			return;
		};
		
		addRecLog(duration,tag,blob,recSet,st1);
	};
	
	//已接管编码器输出
	if(recSet.takeoffEncodeChunk && recSet.type=="mp3"){
		//合并所有的音频片段
		var len=0;
		for(var i=realTimeSendTryTakeoffChunksIdx;i<takeoffChunks.length;i++){
			len+=takeoffChunks[i].length;
		};
		var chunkData=new Uint8Array(len);
		for(var i=realTimeSendTryTakeoffChunksIdx,idx=0;i<takeoffChunks.length;i++){
			var itm=takeoffChunks[i];
			chunkData.set(itm,idx);
			idx+=itm.length;
		};
		realTimeSendTryTakeoffChunksIdx=takeoffChunks.length;
		
		//生成完整blob音频文件
		var blob=new Blob([chunkData],{type:"audio/"+recSet.type});
		var meta=Recorder.mp3ReadMeta([chunkData.buffer],len)||{};
		
		var tag=realTimeSendTryChunks.length+"接管音频输出";
		encodeEnd(tag,blob,meta.duration);
		return;
	};
	
	//mock转码
	var mockSet=$.extend({},recSet);
	mockSet.takeoffEncodeChunk=null;
	var recMock=Recorder(mockSet);
	recMock.mock(chunk.data,chunk.sampleRate);
	
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
	
	recMock.stop(function(blob,duration){
		realTimeSendTryEncBusy&&(realTimeSendTryEncBusy--);
		
		var ms=(endT||Date.now())-t1;
		var max=recImpl[recSet.type+"_start"]?99999:1000*pcmDatas[0].length/sampleRate-10;//录音回调1帧时长
		
		var tag=realTimeSendTryChunks.length+"实时编码占用<span style='color:"+(ms>max?"red":"")+"'>"+ms+"ms</span>";
		encodeEnd(tag,blob,duration);
	},function(err){
		realTimeSendTryEncBusy&&(realTimeSendTryEncBusy--);
		
		reclog("实时编码失败："+err,1);
	});
};
var realTimeSendTryStop=function(recSet){
	if(!realTimeSendTryTime){
		return;
	}
	if(!rtcVoiceStart){//给对方发送结束信号，停止播放
		webrtcStatusSend("stop");
	};
	
	//借用SampleData函数把二维数据转成一维，采样率转换是次要的
	var chunk=Recorder.SampleData(realTimeSendTryChunks,realTimeSendTryChunkSampleRate,realTimeSendTryChunkSampleRate);
	
	var mockSet=$.extend({},recSet);
	mockSet.takeoffEncodeChunk=null;
	var recMock=Recorder(mockSet);
	recMock.mock(chunk.data,chunk.sampleRate);
	var mockT=Date.now();
	recMock.stop(function(blob,duration){
		addRecLog(duration,"实时编码汇总结果",blob,mockSet,mockT);
	},function(err){
		reclog("实时编码汇总失败："+err,1);
	});
};












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
function webrtcStatusSend(status,info){
	if(!rtcChannelOpen){
		return;
	};
	rtcChannel.send(status+"##"+JSON.stringify(info||{})+"##");
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
		rtcMsgView("webrtc收到未知数据："+data,true);
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
	}else if(type=="reset"){
		console.log("收到对方发来的reset信号",data);
		rtcPlayReset(info);
		return;
	}else if(type=="stop"){
		console.log("收到对方发来的stop信号",data);
		rtcPlayStop();
		return;
	};
	
	if(type!="stream"){
		console.warn("未知数据类型"+type,data);
		return;
	};
	
	rtcPlayBuffer.splice(0,0,{mime:mime,data:b64,info:info});
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
	$(".webrtcMsgBox").prepend('<div class="'+(isIn?"webrtcMsgIn":"webrtcMsgOut")+'" onclick="rtcVoicePlay(\''+id+'\')" style="cursor: pointer;">'+rtcMsgTime()+'<span style="color:#06c">语音</span> '+(data.duration/1000).toFixed(2)+'s</div>');
};
var rtcVoiceDatas={};
var rtcVoicePlay=function(id){
	var audio=$(".recPlay")[0];
	audio.style.display="inline-block";
	if(!(audio.ended || audio.paused)){
		audio.pause();
	};
	audio.src=(window.URL||webkitURL).createObjectURL(rtcVoiceDatas[id].data);
	audio.play();
};


var rtcStatusView=function(){
	var html=[];
	if(rtcChannelOpen){
		html.push('<span style="color:#0b1">连接已建立，请在上面进行录音操作，音频数据会实时传送给对方播放（录音切换到wav、pcm格式对方播放的音质会好很多，mp3启用takeoffEncodeChunk也可改善音质）</span> <input type="button" onclick="webrtcCloseClick()" value="关闭连接">');
	}else{
		html.push('<span style="color:#f60">连接已关闭，停止数据收发，请重新建立连接</span>');
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
var webrtcWaveBox=$(".webrtcWaveBox"),webrtcWave=$(".webrtcWave");
var rtcStatusStepLog=function(msg){
	rtcStatus.html('<div style="color: #f60;"><span style="font-weight: bold">请操作：</span>'+msg
		+'</div><div class="rtcStatusStep_Err" style="color:red"></div>');
	return msg;
};
var rtcStatusStepErr=function(msg){
	$(".rtcStatusStep_Err").html(msg);
	return msg
};






//*****语音流播放*****
var rtcPlayBuffer=[];
var rtcPlayModeDecode=$(".webrtcPlayModeDecode")[0];
var rtcPlayMode="-",rtcPlayRecSet;
var rtcPlay=function(){
	if(rtcPlayModeDecode.checked){
		rtcPlayMode="decode";
		webrtcWaveBox.show();
		rtcDecodePlay();
	}else{
		rtcPlayMode="audio";
		webrtcWaveBox.hide();
		rtcAuidoPlay();
	};
};
//重置播放环境，初始化播放器，远端发送reset信号触发调用
var rtcPlayReset=function(recSet){
	rtcPlayRecSet=recSet;
	
	rtcDecodePlayInit();
	
	reclog("对方开始了录音，正在播放传输过来的音频数据...");
};
//关闭播放器，远端发送stop信号触发调用
var rtcPlayStop=function(){
	rtcDecodePlayStop();
	
	var type=Recorder.prototype.wav?"wav":Recorder.prototype.mp3?"mp3":"";
	reclog("对方结束了录音，正在合成已播放数据汇总文件...");
	if(!rtcDecPlayBuffers.length){
		reclog("本端可能未解码播放过，不合成已播放数据汇总文件了","#bbb");
	}else if(!type){
		reclog("本端未加载wav或mp3编码器，不合成已播放数据汇总文件了","#bbb");
	}else{
		var pcms=[],sampleRate;
		for(var i=0;i<rtcDecPlayBuffers.length;i++){
			var o=rtcDecPlayBuffers[i];
			sampleRate=o.sampleRate;
			pcms.push(o.pcm);
		}
		var pcm=Recorder.SampleData(pcms,sampleRate,sampleRate).data;
		var recMock=Recorder({
			type:type
			,sampleRate:sampleRate
		});
		recMock.mock(pcm,sampleRate);
		var mockT=Date.now();
		recMock.stop(function(blob,duration){
			addRecLog(duration,"已播放数据汇总结果",blob,recMock.set,mockT);
		},function(err){
			reclog("已播放数据汇总失败："+err,1);
		});
	}
};



//方式一：解码播放 BufferStreamPlayer
var rtcDecPlayer,rtcDecPlayRec,rtcDecPlayBuffers=[];
var rtcDecodePlayStop=function(){
	rtcDecPlayer&&rtcDecPlayer.stop();
	rtcDecPlayer=0;
	rtcDecPlayRec&&rtcDecPlayRec.close();
	rtcDecPlayRec=0;
};
var rtcDecodePlayInit=function(){
	rtcDecodePlayStop();//先清理了再说
	rtcDecPlayBuffers=[];
	
	//16位pcm无需任何操作就能直接播放，其他格式需要解码
	var isPcm16=rtcPlayRecSet.type=="pcm" && rtcPlayRecSet.bitRate==16;
	
	var player=rtcDecPlayer=new Recorder.BufferStreamPlayer({
		decode:isPcm16?false:true
		,onUpdateTime:function(){
			var n=~~(player.currentTime/1000);
			var s=n%60;
			var m=(n-s)/60;
			n=m+":"+("0"+s).substr(-2);
			$(".webrtcWaveTime").html(n);
		}
		,transform:function(inputData,sampleRate,True,False){
			if(isPcm16){//原始16位pcm数据，直接播放
				inputData=new Int16Array(inputData);
				sampleRate=rtcPlayRecSet.sampleRate;
				True(inputData, sampleRate);
			}else{//已解码
				True(inputData,sampleRate);
			}
			rtcDecPlayBuffers.push({//存起来，结束时合并成一个大的，对比音质
				pcm:inputData,sampleRate:sampleRate
			});
		}
	});
	player.start(function(){
		console.log("rtcDecPlayer已初始化");
		
		//打开可视化绘制
		if(player==rtcDecPlayer){
			var rec=rtcDecPlayRec=Recorder({
				type:"unknown" //可提供unknown格式，方便清理内存
				,sourceStream:player.getMediaStream() //明确指定录制处理的流
				,onProcess:function(buffers,powerLevel,duration,sampleRate,newBufferIdx){
					if(rec!=rtcDecPlayRec)return;
					var waveStore=rec.waveStore=rec.waveStore||{};
					if(!waveStore.init){
						waveStore.init=true;
						webrtcWaveBox.show();
						initWaveStore(waveStore,webrtcWave);
					};
					if(waveStore.choice!=recwaveChoiceKey){
						waveStore.choice=recwaveChoiceKey;
						webrtcWave.html("").append(waveStore[recwaveChoiceKey].elem);
					};
					waveStore[recwaveChoiceKey].input(buffers[buffers.length-1],powerLevel,sampleRate);
					
					for(var i=newBufferIdx;i<buffers.length;i++){
						buffers[i]=null; //因为是unknown格式，buffers和rec.buffers是完全相同的，只需清理buffers就能释放内存，其他格式不一定有此特性。
					}
				}
			});
			rec.open(function(){
				if(rec!=rtcDecPlayRec)return;
				rec.start();
			});
		};
	});
};
var rtcDecodePlay=function(){
	if(!rtcPlayModeDecode.checked){
		return;
	};
	while(rtcDecPlayer && rtcPlayBuffer.length){
		var itm=rtcPlayBuffer.pop(),info=itm.info;
		if(info.type=="pcm" && info.bitRate!=16){
			console.warn("rtcDecodePlay未提供支持8位pcm格式的播放（只支持16位的pcm），其实只需要加载pcm编码器，然后调用Recorder.pcm2wav即可转成wav格式播放，但因为这只是一个特例，懒得写代码，所以没有提供支持");
			rtcRecSkip++;
			return;
		}
	
		var u8arr=rtcB64ToUInt8(itm.data);
		rtcDecPlayer.input(u8arr.buffer);
	};
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
	var itm=rtcPlayBuffer.pop(),info=itm.info;
	if(info.type=="pcm"){
		console.warn("rtcAuidoPlay未提供支持pcm格式的播放，其实只需要加载pcm编码器，然后调用Recorder.pcm2wav即可转成wav格式播放，但因为这只是一个特例，懒得写代码，所以没有提供支持");
		rtcRecSkip++;
		rtcAudioPlayCur.rtcPlayID=-1;
		return;
	}
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
		var state=rtcConn&&rtcConn.iceConnectionState;
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
rtcStatusStepLog('先在局域网内两台设备(设备A、设备B)分别打开本页面（同一浏览器打开两个标签页也行），然后在设备A上点击"新建连接"');
function webrtcCreate(){
	webrtcInitTry();
	if(rtcChannel){
		reclog(rtcStatusStepErr("连接已创建，请勿重复创建，刷新页面重试"),1);
		return;
	};
	rtcConn.onnegotiationneeded=function(){
		webrtcInfoCreate("createOffer",rtcStatusStepLog('已新建连接，请将本机信息复制到另外一个设备的"远程信息"输入框中，并点击确定连接'));
	};
	reclog(rtcStatusStepLog("创建连接中..."));
	rtcChannel=rtcConn.createDataChannel("REC RTC");
};
function webrtcConnect(){
	webrtcInitTry();
	
	var isLocal=$(".webrtcLocal").val();
	try{
		var remote=JSON.parse($(".webrtcRemote").val());
	}catch(e){
		reclog(rtcStatusStepErr("请正确输入远程信息："+e.message),1);
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
			reclog(rtcStatusStepErr("远程信息不是通过确定连接创建的"));
			return;
		};
		bind();
		rtcConn.setRemoteDescription(new RTCSessionDescription(remote));
	}else{
		//新创建远程连接
		if(remote.type!="offer"){
			reclog(rtcStatusStepErr("远程信息不是通过新建连接创建的"));
			return;
		};
		rtcConn.setRemoteDescription(new RTCSessionDescription(remote));
		
		rtcConn.ondatachannel=function(e){
			rtcChannel=e.channel;
			bind();
		};
		reclog(rtcStatusStepLog("远程连接中..."));
		webrtcInfoCreate("createAnswer",rtcStatusStepLog('已连接，请将本机信息复制到上一个设备的"远程信息"输入框中，并点击确定连接'));
	};
};