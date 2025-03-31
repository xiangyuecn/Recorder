<!-- 原生插件的pcmPlayer播放器测试 -->
<template>
<view style="padding:10px 0;"><view style="padding:8px;border:1px dashed #aaa">
	<view style="padding-bottom:6px">
		<input v-model="in_pcmPlay_path" style="width:95%;display:inline-block;border:1px solid #ddd" placeholder="填写wav文件路径，不填自动生成">
	</view>
	<view style="padding-bottom:6px;font-size:12px">
		<checkbox @click="in_pcmPlay_rt=!in_pcmPlay_rt" :checked="in_pcmPlay_rt">实时</checkbox>
		,最大延迟<input v-model="in_pcmPlay_maxDelay" style="width:40px;display:inline-block;border:1px solid #ddd" placeholder="毫秒">
		,时间回调<input v-model="in_pcmPlay_timeInt" style="width:40px;display:inline-block;border:1px solid #ddd" placeholder="毫秒">
		,<checkbox @click="in_pcmPlay_saveFile=!in_pcmPlay_saveFile" :checked="in_pcmPlay_saveFile">保存到文件</checkbox>
	</view>
	<view style="padding-bottom:6px">
		<button size="mini" type="default" @click="startClick()">打开PcmPlayer流式播放</button>
		<button size="mini" type="default" @click="destroyClick(1)">销毁全部</button>
	</view>
	
	<view>
		<view v-for="item0 in playerList" :key="item0.player" style="font-size:12px;border-top:1px dashed #aaa;padding-bottom:10px">
			<view>
				[{{item0.startTime}}]{{item0.player}} {{item0.txtStatus}} {{item0.txtArgs}}
			</view>
			<view v-if="!item0.hideBtn">
				<view style="padding-bottom:6px">
					<button size="mini" type="default" @click="pauseClick(item0)">暂停</button>
					<button size="mini" type="default" @click="resumeClick(item0)">继续</button>
					<button size="mini" type="default" @click="destroyClick(0,item0)">销毁</button>
				</view>
				<view style="padding-bottom:6px">
					<button size="mini" type="default" @click="clearInputClick(item0)">清除未播</button>
					<button size="mini" type="default" @click="inputSet(item0, 2)">断网丢包</button>
					<button size="mini" type="default" @click="inputSet(item0, 1)">卡了缓冲</button>
				</view>
				<view style="padding-bottom:6px">
					<button size="mini" type="default" @click="inputSet(item0, 901)">每次发1秒</button>
					<button size="mini" type="default" @click="inputSet(item0, 910)">每次发10秒</button>
					<button size="mini" type="default" @click="inputSet(item0, 0)">恢复</button>
				</view>
				<view style="padding-bottom:6px">
					<button size="mini" type="default" @click="clearLogClick(item0)">清除日志</button>
					<input v-model="in_pcmPlay_setVolume" style="width:40px;display:inline-block;border:1px solid #ddd" placeholder="音量">
					<button size="mini" type="default" @click="setVolume(item0)">设置音量</button>
				</view>
			</view>
			<view>{{item0.txtInput}}</view>
			<view>{{item0.txtTime}}</view>
			<view style="padding-left:30px;"><view style="max-height:200px;overflow-y:auto">
				<div style="border-top:1px dashed #ddd">
					<view v-for="(item1,index) in item0.msgs" :key="index" :style="{color:item1.color==1?'#f00':item1.color}">
						{{item1.msgTxt}}
					</view>
				</div>
			</view></view>
		</view>
	</view>
	
</view></view>
</template>
<style scoped>
button{ vertical-align: middle; margin-right:5px; }
input{ vertical-align: middle; }
</style>

<script>
import Recorder from 'recorder-core';
import RecordApp from 'recorder-core/src/app-support/app.js';
import 'recorder-core/src/extensions/create-audio.nmn2pcm.js'

export default {
	data(){
		return {
			in_pcmPlay_path:"",
			in_pcmPlay_rt:true,
			in_pcmPlay_maxDelay:"",
			in_pcmPlay_timeInt:"",
			in_pcmPlay_saveFile:false,
			
			in_pcmPlay_setVolume:"",
			
			playerList:[]
		}
	},
	/*#ifdef VUE3*/unmounted()/*#endif*/ /*#ifndef VUE3*/destroyed()/*#endif*/ {
		//【必须】解除绑定
		RecordApp.UniNativeUtsPlugin_OnJsCall(this.jsCallKey, "onPcmPlayerEvent", null);
		//销毁未关闭的播放器
		this.destroyClick(true);
	},
	mounted(){
		//页面创建时生成一个唯一的key，用来绑定原生插件jsCall回调的播放器事件
		this.jsCallKey=""+Math.random();
		RecordApp.UniNativeUtsPlugin_OnJsCall(this.jsCallKey, "onPcmPlayerEvent", (data)=>{
			var item=null; for(var i=0;i<this.playerList.length;i++){var o=this.playerList[i]; if(o.player==data.player)item=o; }
			if(!item) this.addLog("不存在的PcmPlayer的事件: "+JSON.stringify(data),"#fa0");
			if(data.type=="time"){
				item.txtTime="["+this.NowTime()+"]time "+this.FormatTime(data.duration)+" 缓冲"+this.FormatTime(data.bufferMs)+" 字节"+data.bufferSize+" 已播"+this.FormatTime(data.current)+" 音量"+data.volume;
				return;
			}
			this.addMsg(item, "Event["+data.type+"]: "+JSON.stringify(data));
		});
		
		//初始化页面表单
		var rt=uni.getStorageSync("in_pcmPlay_rt");
		this.in_pcmPlay_rt=rt?rt=="1":true;
		
		this.in_pcmPlay_path=uni.getStorageSync("in_pcmPlay_path")||"";
		this.in_pcmPlay_maxDelay=uni.getStorageSync("in_pcmPlay_maxDelay")||"";
		this.in_pcmPlay_timeInt=uni.getStorageSync("in_pcmPlay_timeInt")||"100";
		this.in_pcmPlay_saveFile=uni.getStorageSync("in_pcmPlay_saveFile")=="1";
		
		this.saveInputs=()=>{
			uni.setStorageSync("in_pcmPlay_rt", this.in_pcmPlay_rt?"1":"0");
			uni.setStorageSync("in_pcmPlay_path", this.in_pcmPlay_path);
			uni.setStorageSync("in_pcmPlay_maxDelay", this.in_pcmPlay_maxDelay);
			uni.setStorageSync("in_pcmPlay_timeInt", this.in_pcmPlay_timeInt);
			uni.setStorageSync("in_pcmPlay_saveFile", this.in_pcmPlay_saveFile?"1":"0");
		};
	},
	methods:{
		getPage(){
			var p=this.$parent;
			while(p){
				if(p.reclog) break;
				p=p.$parent;
			}
			return p;
		},
		addLog(msg,color){
			this.getPage().addTestMsg(msg,color);
		},
		
		
		startClick(){
			this.saveInputs();
			this.readPcmFile(this.in_pcmPlay_path, (pcm,sampleRate)=>{
				var args={
					sampleRate:sampleRate
					,realtime:this.in_pcmPlay_rt?{ maxDelay:+this.in_pcmPlay_maxDelay||0 }:false
					,timeUpdateInterval:+this.in_pcmPlay_timeInt||0
					,debug_writeToFile:this.in_pcmPlay_saveFile?"testPcmPlayer-"+sampleRate+"-"+Date.now()+".pcm":""
				};
				this.addLog("pcmPlayer参数："+JSON.stringify(args),"#aaa");
				RecordApp.UniNativeUtsPluginCallAsync("pcmPlayer_create", args).then((data)=>{
					this.addLog("pcmPlayer_create成功："+JSON.stringify(data));
					var player=data.player;
					var item={player:player,msgs:[],startTime:this.NowTime(),txtArgs:JSON.stringify(args)
						,txtInput:"",txtTime:"",txtStatus:"",hideBtn:false};
					this.playerList.unshift(item);
					//实时输入pcm数据
					this.newPlayer(this.playerList[0],pcm,sampleRate);
				}).catch(e=>{
					this.addLog("pcmPlayer_create出错："+e.message,1)
				});
			});
		},
		pauseClick(item){
			item.txtStatus="暂停";
			RecordApp.UniNativeUtsPluginCallAsync("pcmPlayer_pause",{player:item.player}).then((data)=>{
				this.addMsg(item, "pause OK:"+JSON.stringify(data));
			}).catch(e=>{
				this.addMsg(item, "pause出错："+e.message, 1);
			});
		},
		resumeClick(item){
			item.txtStatus="继续播放中...";
			RecordApp.UniNativeUtsPluginCallAsync("pcmPlayer_resume",{player:item.player}).then((data)=>{
				this.addMsg(item, "resume OK:"+JSON.stringify(data));
			}).catch(e=>{
				this.addMsg(item, "resume出错："+e.message, 1);
			});
		},
		clearInputClick(item){
			RecordApp.UniNativeUtsPluginCallAsync("pcmPlayer_clearInput",{player:item.player}).then((data)=>{
				this.addMsg(item, "clearInput OK:"+JSON.stringify(data));
			}).catch(e=>{
				this.addMsg(item, "clearInput出错："+e.message, 1);
			});
		},
		setVolume(item){
			RecordApp.UniNativeUtsPluginCallAsync("pcmPlayer_setVolume",{player:item.player,volume:+this.in_pcmPlay_setVolume||0}).then((data)=>{
				this.addMsg(item, "setVolume OK:"+JSON.stringify(data));
			}).catch(e=>{
				this.addMsg(item, "setVolume出错："+e.message, 1);
			});
		},
		destroyClick(all,item){
			if(!all){
				RecordApp.UniNativeUtsPluginCallAsync("pcmPlayer_destroy",{player:item.player}).then((data)=>{
					this.addMsg(item, "playerDestory OK:"+JSON.stringify(data));
					item.txtStatus="已销毁";
					item.hideBtn=true;
				}).catch(e=>{
					this.addMsg(item, "playerDestory出错："+e.message, 1);
				});
				clearInterval(item.timer);
				return;
			}
			
			RecordApp.UniNativeUtsPluginCallAsync("pcmPlayer_destroy",{all:true,player:""}).then((data)=>{
				this.addLog("playerDestory all OK: "+JSON.stringify(data));
				this.playerList=[];
			}).catch(e=>{
				this.addLog("playerDestory all出错: "+e.message);
			});
			
			for(var k in this.playerList){
				clearInterval(this.playerList[k].timer);
			}
		},
		clearLogClick(item){
			item.msgs=[];
		},
		inputSet(item, type){
			item.inputSet=type;
		},
		
		addMsg(item,msg,color){
			item.msgs.unshift({msgTxt:'['+this.NowTime()+"]"+msg, color:color});
		},
		newPlayer(item,pcm,sampleRate){
			var idx=0,dur=85,count=0,startTime=Date.now(),sendSize=0;
			item.timer=setInterval(()=>{
				if(item.inputSet==1)return; //缓冲数据
				var sendDur=~~(sendSize/sampleRate*1000);
				var curDur=dur+Math.max(0, Date.now()-startTime-sendDur+dur);
				if(item.inputSet==901) curDur=1000; //每次发1秒
				if(item.inputSet==910) curDur=10000; //每次发10秒
				
				var len=~~(curDur*sampleRate/1000);
				if(idx+len>pcm.length)idx=0;
				var pcm2=pcm.slice(idx,idx+len);
				idx+=len;
				sendSize+=len;
				
				if(item.inputSet==2)return; //丢弃数据
				
				var b64=RecordApp.UniBtoa(pcm2.buffer);
				RecordApp.UniNativeUtsPluginCallAsync("pcmPlayer_input", {player:item.player,pcmDataBase64:b64})
				.then((data)=>{
					count++;
					item.txtInput="["+this.NowTime()+"]input "+this.FormatTime(sendDur)+" 缓冲"+this.FormatTime(data.bufferMs)+" 字节"+data.bufferSize;
				}).catch(e=>{
					this.addMsg(item,"input err:"+e.message,1);
				});
			},dur);
		},
		readPcmFile(path,True){
			this.addLog((path?"读取wav文件":"生成pcm")+"来模拟实时pcm流...","#aaa");
			setTimeout(()=>{
				//读取wav文件
				if(path){
					var args={path:path};
					RecordApp.UniNativeUtsPluginCallAsync("readFile", args).then((data)=>{
						if(!data.data) return this.addLog("wav文件读取到的长度为0，请检查App是否有文件读取权限和文件是否存在："+JSON.stringify(data),1);
						var bytes=new Uint8Array(RecordApp.UniAtob(data.data));
						var wav=this.ParseWav(bytes);
						if(wav.errMsg) return this.addLog(wav.errMsg,1);
						var pcm=wav.pcm; delete wav.pcm;
						this.addLog("wav文件["+bytes.length+"]信息："+JSON.stringify(wav),"#aaa");
						True(pcm,wav.sampleRate);
					}).catch((e)=>{
						this.addLog("读取wav文件出错："+e.message,1);
					});
					return;
				}
				//生成pcm
				var sampleRate=16000;
				var pcm=Recorder.NMN2PCM.GetExamples().Canon.get(sampleRate).pcm;
				True(pcm,sampleRate);
			},100);
		},
		
		
		ParseWav(bytes){
			var wavView=bytes;
			var eq=(p,s)=>{
				for(var i=0;i<s.length;i++){
					if(wavView[p+i]!=s.charCodeAt(i)){
						return false;
					};
				};
				return true;
			};
			var pcm,sampleRate,bitRate,numCh,dataPos;
			if(eq(0,"RIFF")&&eq(8,"WAVEfmt ")){
				numCh=wavView[22];
				if(wavView[20]==1 && (numCh==1||numCh==2)){//raw pcm 单或双声道
					sampleRate=wavView[24]+(wavView[25]<<8)+(wavView[26]<<16)+(wavView[27]<<24);
					bitRate=wavView[34]+(wavView[35]<<8);
					//搜索data块的位置
					dataPos=0; // 44 或有更多块
					for(var i=12,iL=wavView.length-8;i<iL;){
						if(wavView[i]==100&&wavView[i+1]==97&&wavView[i+2]==116&&wavView[i+3]==97){//eq(i,"data")
							dataPos=i+8;break;
						}
						i+=4;
						i+=4+wavView[i]+(wavView[i+1]<<8)+(wavView[i+2]<<16)+(wavView[i+3]<<24);
					}
					if(dataPos){
						if(bitRate==16){
							pcm=new Int16Array(wavView.buffer.slice(dataPos));
						}else if(bitRate==8){
							pcm=new Int16Array(wavView.length-dataPos);
							//8位转成16位
							for(var j=dataPos,d=0;j<wavView.length;j++,d++){
								var b=wavView[j];
								pcm[d]=(b-128)<<8;
							};
						};
					};
					if(pcm && numCh==2){//双声道简单转单声道
						var pcm1=new Int16Array(pcm.length/2);
						for(var i=0;i<pcm1.length;i++){
							pcm1[i]=(pcm[i*2]+pcm[i*2+1])/2;
						}
						pcm=pcm1;
					};
				};
			};
			if(!pcm){
				return {errMsg:"wav文件["+bytes.length+"]解码失败：非单或双声道wav raw pcm格式音频"};
			};
			return {pcm:pcm,sampleRate:sampleRate,wavFile:{bitRate:bitRate,numCh:numCh,dataPos:dataPos}};
		},
		NowTime(){
			var now=new Date();
			var t=("0"+now.getMinutes()).substr(-2)
				+":"+("0"+now.getSeconds()).substr(-2)
				+"."+("00"+now.getMilliseconds()).substr(-3);
			return t;
		},
		FormatTime(ms,showH){
			var ss=ms%1000;ms=(ms-ss)/1000;
			var s=ms%60;ms=(ms-s)/60;
			var m=ms%60;ms=(ms-m)/60;
			var h=ms, v="";
			if(showH || h>0) v+=(h<10?"0":"")+h+":";
			v+=(m<10?"0":"")+m+":";
			v+=(s<10?"0":"")+s;
			v+="."+("00"+ss).substr(-3);;
			return v;
		}
		
	}
}
</script>
