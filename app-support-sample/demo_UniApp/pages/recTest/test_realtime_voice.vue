<!-- 实时语音通话聊天对讲，websocket实时传输数据 -->
<template>
<view style="padding:0 3px">

<view style="border: 1px #666 dashed; padding:8px; margin-top:8px">
	<view>
		<text style="font-size:17px;font-weight: bold;color:#f60">实时语音通话对讲</text>
		<text style="font-size:13px;color:#999;margin-left:10px">源码:test_realtime_voice.vue</text>
	</view>
	<view>
		<text>ws(s)：</text>
		<input v-model="wsApi" style="width:260px;display:inline-block;border:1px solid #ddd"/>
	</view>
	<view style="font-size:13px;color:#999">需要先在电脑上运行Recorder仓库/assets/node-localServer内的nodejs服务器端脚本，然后填写你电脑局域网ip即可测试（H5时用127.0.0.1可用ws），支持ws、wss测试WebSocket地址</view>
	
	<view>
		<text>我的标识</text>
		<input v-model="wsID1" style="width:50px;display:inline-block;border:1px solid #ddd;vertical-align:middle"/>
		<button size="mini" type="default" @click="wsConnClick" style="margin-left:10px;vertical-align:middle">连接服务器</button>
		<button size="mini" type="default" @click="wsDisconnClick" style="margin-left:10px;vertical-align:middle">断开</button>
	</view>
	<view style="border-top: 1px #ccc dashed;margin:5px 0"></view>
	<view>
		<view style="font-size:13px;color:#999">服务器将pcm片段实时发送给客户端，模拟播放语音流</view>
		<checkbox :checked="ws_readAudioSet" @click="ws_readAudioSet=!ws_readAudioSet" style="font-size:14px">读audio-16k.wav</checkbox>
		<button size="mini" type="default" @click="wsAudioStartClick" style="margin:0 10px;vertical-align:middle">播放语音流</button>
		<button size="mini" type="default" @click="wsAudioStopClick" style="vertical-align:middle">结束</button>
		<view v-if="ws_audioFrameDurTxt">
			{{ws_audioFrameDurTxt}}，{{ws_audioFrameCount}}帧，{{ws_audioFrameSize}}字节
		</view>
	</view>
	
	<view style="border-top: 1px #ccc dashed;margin:5px 0"></view>
	<view>
		<view style="font-size:13px;color:#999">语音通话聊天对讲，请在上面进行录音操作，音频数据会实时传送给对方播放（实时pcm）</view>
		<text>对方标识</text>
		<input v-model="wsID2" style="width:50px;display:inline-block;border:1px solid #ddd;vertical-align:middle"/>
		<button size="mini" type="default" @click="wsOpenVoiceClick" style="margin-left:10px;vertical-align:middle">开始通话</button>
		<button size="mini" type="default" @click="wsCloseVoiceClick" style="margin-left:10px;vertical-align:middle">结束</button>
		<view v-if="ws_voiceSendDurTxt||ws_voiceReceiveDurTxt">
			<view>接收：{{ws_voiceReceiveDurTxt}}，{{ws_voiceReceiveCount}}帧，{{ws_voiceReceiveSize}}字节</view>
			<view>发送：{{ws_voiceSendDurTxt}}，{{ws_voiceSendUserCount}}人接收，OK {{ws_voiceSendOKCount}}帧，Err {{ws_voiceSendErrCount}}帧，{{ws_voiceSendSize}}字节</view>
		</view>
	</view>
</view>

</view>
</template>

<script>
import Recorder from 'recorder-core';
import RecordApp from 'recorder-core/src/app-support/app.js';

export default {
	data(){
		return {
			wsApi:"", wsID1:"", wsID2:""
			, ws_readAudioSet:false, ws_audioFrameCount:0, ws_audioFrameSize:0, ws_audioFrameDur:0, ws_audioFrameDurTxt:""
			
			,ws_voiceSendUserCount:0,ws_voiceSendOKCount:0,ws_voiceSendErrCount:0,ws_voiceSendSize:0,ws_voiceSendDur:0,ws_voiceSendDurTxt:""
			,ws_voiceReceiveCount:0,ws_voiceReceiveSize:0,ws_voiceReceiveDur:0,ws_voiceReceiveDurTxt:""
		}
	},
	mounted() {
		this.wsID1=uni.getStorageSync("page_test_upsf_wsID1")||"1";
		this.wsID2=uni.getStorageSync("page_test_upsf_wsID2")||"2";
		
		var wsApi="ws://你电脑局域网ip:9529/ws123";
		// #ifdef H5
			wsApi="ws://127.0.0.1:9529/ws123";
		// #endif
		this.wsApi=uni.getStorageSync("page_test_upsf_wsApi")||wsApi;
	},
	/*#ifdef VUE3*/unmounted()/*#endif*/ /*#ifndef VUE3*/destroyed()/*#endif*/ {
		clearInterval(this.spWxTimer);
		this.getPage().wsVoiceProcess=null;
		if(this.socket) this.socket.close();
	},
	methods:{
		getPage(){
			var p=this.$parent;
			while(p){
				if(p.reclog) break;
				p=p.$parent;
			}
			return p;
		}
		,log(){
			var p=this.getPage();
			p.reclog.apply(p,arguments);
		}
		,formatTime(ms,showSS){
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
		,checkSet(api){
			if(api==2){
				if(!/^wss?:\/\/.+/i.test(this.wsApi) || /局域网/.test(this.wsApi)){
					this.log("请配置ws地址，比如填写：ws://127.0.0.1:9529/",1);
					return false;
				}
				uni.setStorageSync("page_test_upsf_wsApi", this.wsApi); //测试用的存起来
				
				if(!this.wsID1){
					this.log("请填写我的标识");
					return false;
				}
				uni.setStorageSync("page_test_upsf_wsID1", this.wsID1); //测试用的存起来
			}
			return true;
		}
		
		
		
		//连接websocket
		,wsConnClick(){
			if(!this.checkSet(2))return;
			this.log("正在连接"+this.wsApi+"...");
			if(this.socket) this.socket.close();
			var sid=this.SID=(this.SID||0)+1; //同步操作
			
			this.socketIsOpen=false;
			this.socket=uni.connectSocket({
				url:this.wsApi
				,success:()=>{}
				,fail:(e)=>{ this.log("ws连接fail："+e.errMsg,1) }
			});
			this.socket.onClose(()=>{
				if(sid!=this.SID) return;
				this.socketIsOpen=false;
				this.destroyStreamPlay();
				this.log("ws已断开");
			});
			this.socket.onError((e)=>{
				if(sid!=this.SID) return;
				this.socketIsOpen=false;
				this.destroyStreamPlay();
				this.log("ws因为错误已断开："+e.errMsg,1);
			});
			this.socket.onOpen(()=>{
				if(sid!=this.SID) return;
				this.socketIsOpen=true;
				this.socket.number=1;
				this.socket.sendCalls={};
				this.log("ws已连接",2);
				
				this.ws__sendMessage("setMeta",{uid:this.wsID1},null,null,()=>{
					this.log("ws已绑定标识："+this.wsID1,2);
				},(err)=>{
					this.log("ws绑定标识出错："+err,1);
				});
				
				this.ws_voiceReceiveCount=0;
				this.ws_voiceReceiveSize=0;
				this.ws_voiceReceiveDur=0;
				this.ws_voiceReceiveDurTxt="00:00";
				this.resetWsSendVoice();
				this.initStreamPlay(); //先初始化播放器
			});
			this.socket.onMessage((e)=>{
				if(sid!=this.SID) return;
				this.ws__receiveMessage(e.data);
			});
		}
		,wsDisconnClick(){
			if(this.socketIsOpen)this.log("ws正在断开...");
			else this.log("ws未连接");
			if(this.socket) this.socket.close();
		}
		//解析处理服务器消息
		,ws__receiveMessage(rawMsg){
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
		,ws__sendMessage(type,data,bytes,response,onSuccess,onFail){
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
				var timer=setTimeout(()=>{
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
				this.socket.send({data:arr.buffer});
			}else{
				this.socket.send({data:rawTxt});
			}
		}
		
		
		//服务器将pcm片段发送给客户端，模拟播放语音流
		,wsAudioStartClick(){
			var socket=this.socket;
			if(!this.socketIsOpen) return this.log("ws未连接",1);
			if(socket.audioStartToken) return this.log("请先audioStop",1);
			this.ws_audioFrameCount=0;
			this.ws_audioFrameSize=0;
			this.ws_audioFrameDur=0;
			this.ws_audioFrameDurTxt="00:00";
			this.ws__sendMessage("audioStart",{readAudio:!!this.ws_readAudioSet},null,null,(data)=>{
				socket.audioStartToken=data.token;
				this.log("已打开服务器端语音流 readAudio="+(!!this.ws_readAudioSet)+" token="+data.token,2);
			},(err)=>{
				this.log("打开服务器端语音流出错："+err,1);
			});
		}
		//结束模拟播放语音流
		,wsAudioStopClick(){
			var socket=this.socket;
			var token=socket && socket.audioStartToken;
			if(token){
				this.ws__sendMessage("audioStop",{token:token},null,null,()=>{
					socket.audioStartToken="";
					this.log("已停止服务器端语音流");
				},(err)=>{
					this.log("停止服务器端语音流出错："+err,1);
				});
			}
		}
		//收到服务器模拟语音流片段数据，进行播放
		,onMsg__audioFrame(data,binary,msgObj){
			var pcm=new Int16Array(binary.buffer);
			this.ws_audioFrameCount++;
			this.ws_audioFrameSize+=binary.length;
			this.ws_audioFrameDur=Math.round(this.ws_audioFrameSize/2/data.sampleRate*1000);
			this.ws_audioFrameDurTxt=this.formatTime(this.ws_audioFrameDur);
			
			this.streamPlay(pcm,data.sampleRate);
		}
		
		
		//语音通话对讲
		,wsOpenVoiceClick(){
			if(!this.socketIsOpen) return this.log("ws未连接",1);
			if(!this.wsID2) return this.log("请填写对方标识",1);
			if(this.wsID1==this.wsID2) return this.log("对方标识不能和我的标识相同",1);
			uni.setStorageSync("page_test_upsf_wsID2", this.wsID2); //测试用的存起来
			this.log("我方已开始语音发送，请在上面进行录音操作",2);
			
			//调用 main_recTest.vue 页面中的录音功能
			var page=this.getPage();
			page.reqOkCall=()=>{ //重新开始录音
				page.useAEC=true; //启用回声消除
				page.recStart();
			};
			page.recReq();
			
			var lastIdx=1e9,chunk=null;
			//在录音onProcess里面直接实时处理，这里的参数就是onProcess的参数
			page.wsVoiceProcess=(buffers,powerLevel,duration,sampleRate,newBufferIdx)=>{
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
				},bytes,null,(data)=>{
					this.ws_voiceSendUserCount=data.count;
					if(data.count){
						this.ws_voiceSendOKCount++;
					}else{ //没有接收方
						this.ws_voiceSendErrCount++;
					}
					this.ws_voiceSendSize+=pcm.byteLength;
					this.ws_voiceSendDur=Math.round(this.ws_voiceSendSize/2/16000*1000);
					this.ws_voiceSendDurTxt=this.formatTime(this.ws_voiceSendDur);
				});
			};
			this.resetWsSendVoice();
		}
		,resetWsSendVoice(){
			this.ws_voiceSendUserCount=0;
			this.ws_voiceSendOKCount=0;
			this.ws_voiceSendErrCount=0;
			this.ws_voiceSendSize=0;
			this.ws_voiceSendDur=0;
			this.ws_voiceSendDurTxt="00:00";
		}
		//结束语音通话对讲
		,wsCloseVoiceClick(){
			this.getPage().wsVoiceProcess=null;
			this.log("我方已结束语音发送");
		}
		//收到对方发来的自定义类型的语音数据
		,onMsg__custom_voiceFrame(data,binary,msgObj){
			var pcm=new Int16Array(binary.buffer);
			this.ws_voiceReceiveCount++;
			this.ws_voiceReceiveSize+=binary.length;
			this.ws_voiceReceiveDur=Math.round(this.ws_voiceReceiveSize/2/data.sampleRate*1000);
			this.ws_voiceReceiveDurTxt=this.formatTime(this.ws_voiceReceiveDur);
			
			this.streamPlay(pcm,data.sampleRate);
		}
		
		
		//播放实时的语音流
		,streamPlay(pcm,sampleRate){
			this.initStreamPlay();
			if(sampleRate!=16000){ console.warn("未适配非16000采样率的pcm播放：initStreamPlay中手写的16000采样率，使用其他采样率需要修改初始化代码"); return; }
			
			// #ifdef MP-WEIXIN
			//微信环境，单独创建的播放器播放
			this.addWxPlayBuffer && this.addWxPlayBuffer(pcm);
			return;
			// #endif
			
			//App、H5 时使用BufferStreamPlayer播放
			var funcCode=`(function(pcm16k){ //这里需要独立执行
				var sp=window.wsStreamPlay;
				if(!sp || !sp.__isStart) return;
				//if(播放新的) sp.clearInput(); //清除已输入但还未播放的数据，一般用于非实时模式打断老的播放
				sp.input(pcm16k);
			})`;
			// #ifdef H5
			eval(funcCode)(pcm);
			return;
			// #endif
			RecordApp.UniWebViewEval(this.getPage(), funcCode+'(new Int16Array(BigBytes))',pcm.buffer);
		}
		//初始化播放器
		,initStreamPlay(){
			// #ifdef MP-WEIXIN
			//微信环境，单独创建播放器
			this.initWxStreamPlay();
			return;
			// #endif
			
			//App、H5 时使用BufferStreamPlayer播放
			if(this.spIsInit)return; //已初始化完成
			if(this.spInit_time && Date.now()-this.spInit_time<2000)return; //等待播放器初始化完成
			var stime=this.spInit_time=Date.now();
			
			var funcCode=`(function(True,False){ //这里需要独立执行
				if(window.wsStreamPlay) return True();
				var Tag="wsStreamPlay";
				if(!Recorder.BufferStreamPlayer){
					var err="H5需要在逻辑层中、App需要在renderjs模块中 imp"+"ort 'recorder-core/src/extensions/buffer_stream.player.js'";
					window["console"].error(Tag+"缺少文件："+err); False(err); return;
				}
				var sp=Recorder.BufferStreamPlayer({
					decode:false,sampleRate:16000
					//,realtime:false //默认为true实时模式，设为false为非实时模式。要连续完整播放时要设为false，否则实时模式会丢弃延迟过大的数据并加速播放
					,onInputError:function(errMsg, inputIndex){
						window["console"].error(Tag+"第"+inputIndex+"次的音频片段input输入出错: "+errMsg);
					}
					,onPlayEnd:function(){
						// 没有可播放的数据了，缓冲中 或者 已播放完成
					}
				});
				sp.start(function(){
					window["console"].log(Tag+"已打开播放");
					sp.__isStart=true;
					window.wsStreamPlay=sp;
					True();
				},function(err){
					window["console"].error(Tag+"开始失败："+err);
					False(err);
				});
			})`;
			var initOk=()=>{
				if(stime!=this.spInit_time) return; //可能调用了destroy
				this.spIsInit=true;
				this.spInit_time=0;
				this.log("streamPlay已打开",2);
			};
			var initErr=(err)=>{
				if(stime!=this.spInit_time) return; //可能调用了destroy
				this.spInit_time=0;
				this.log("streamPlay初始化错误："+err,1);
			};
			
			// #ifdef H5
			eval(funcCode)(initOk,initErr);
			return;
			// #endif
			var cb=RecordApp.UniMainCallBack((data)=>{
				if(data.ok)initOk();
				else initErr(data.errMsg);
			});
			RecordApp.UniWebViewEval(this.getPage(), funcCode+`(function(){
				RecordApp.UniWebViewSendToMain({action:"${cb}",ok:1});
			},function(err){
				RecordApp.UniWebViewSendToMain({action:"${cb}",errMsg:err||'-'});
			})`);
		}
		//销毁播放器
		,destroyStreamPlay(){
			// #ifdef MP-WEIXIN
			//微信环境，单独销毁播放器
			if(this.spWxCtx){
				this.spWxCtx.close();
				this.spWxCtx=null;
			}
			return;
			// #endif
			
			//App、H5 时销毁
			this.spIsInit=false;
			this.spInit_time=0;
			
			var funcCode=`if(window.wsStreamPlay){ wsStreamPlay.stop(); wsStreamPlay=null; }`;
			// #ifdef H5
			eval(funcCode); return;
			// #endif
			RecordApp.UniWebViewEval(this.getPage(), funcCode);
		}
		//微信环境，单独创建播放器
		,initWxStreamPlay(){
			if(this.spWxCtx && this.spWxCtx.state=="running") return;
			if(this.spWxCtx){
				if(Date.now()-this.spWxCtx.__time<2000) return;//wait running
				this.spWxCtx.close();
			};
			var playBuffers=[], playBufferLen=0;
			this.addWxPlayBuffer=(pcm)=>{
				playBuffers.push(pcm);
				playBufferLen+=pcm.length;
			};
			try{
				this.spWxCtx=wx.createWebAudioContext();
				if(!this.spWxCtx)throw new Error("");
			}catch(e){
				this.log("微信版本太低，无法创建WebAudioContext",1);
				return;
			}
			this.spWxCtx.__time=Date.now();
			this.log("微信streamPlay已打开（播放效果一般，听个响）",2);
			
			if(this.spWxTimer)clearInterval(this.spWxTimer);
			this.spWxTimer=setInterval(()=>{
				this.spWxPlay();
			},300);
			this.spWxPlay=()=>{
				// 参考Recorder源码 /assets/runtime-codes/fragment.playbuffer.js
				var ctx=this.spWxCtx;
				var sampleRate=16000,dur=300;
				var audioSize=sampleRate/1000*dur;
				
				var arr=playBuffers,arrSize=playBufferLen; playBuffers=[]; playBufferLen=0;
				var more=new Int16Array(Math.max(0, arrSize-audioSize)),moreOffset=0;
				
				var audio=ctx.createBuffer(1, audioSize, sampleRate);
				var channel=audio.getChannelData(0);
				var sd=sampleRate/1000*1;//1ms的淡入淡出 大幅减弱爆音
				var sd2=audioSize-sd;
				for(var j=0,idx=0;j<arr.length;j++){
					var buf=arr[j];
					for(var i=0,l=buf.length;i<l;i++){
						var factor=1;//淡入淡出因子
						if(idx<sd){
							factor=idx/sd;
						}else if(idx>sd2){
							factor=(audioSize-idx)/sd;
						};
						if(idx<audioSize){
							channel[idx++]=buf[i]/0x7FFF*factor;
						}else{
							more[moreOffset++]=buf[i];
						}
					};
				};
				//剩余数据存回去
				if(more.length>0){
					if(more.length>arrSize/2){
						more=more.subarray(~~(more.length-arrSize/2));
					}
					this.addWxPlayBuffer(more);
				}
				
				//播放
				var source=ctx.createBufferSource();
				source.buffer=audio;
				source.connect(ctx.destination)
				source.start();
				
				if(this.lastSource2)this.lastSource2.disconnect();
				this.lastSource2=this.lastSource1;
				this.lastSource1=source;
			};
		}
		
		
	}
}
</script>