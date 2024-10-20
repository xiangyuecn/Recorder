<!-- 要播放录音请直接参考 test_upload_saveFile.vue 中的 audioPlayClick，代码更简单，这个不适合参考使用 -->
<template>
<view>
<view :class="Class" :style="{display:show?'':'none'}">
	<view v-if="show" style="padding:0 10px;display:flex;flex-direction:row;">
		<view>
			<button size="mini" @click="playStart">{{playing?T_pause:T_play}}</button>
		</view>
		<view style="flex:1"></view>
		<view>
			<button size="mini" @click="shareFile">{{T_download}}</button>
		</view>
	</view>
	<view class="shareFileMsg"></view>
	
	<view v-if="show && showControlUI">
		<view style="padding-top:10px">
			<slider :value="player_position" @change="setPlayerPosition" step="1" max="100" min="0"></slider>
		</view>
		<view style="padding:0 10px;display:flex;flex-direction:row;">
			<view style="flex:1">{{player_currentTime}}</view>
			<view style="flex:1;text-align: right;">{{player_duration}}</view>
		</view>
	</view>
	
	<view class="h5Audio"></view>
</view>
<view style="color:#f60">{{statusMsg}}</view>
</view>
</template>

<script>
var RecordApp,$T;
export default {
	data(){
		return {
			...this.getTexts()
			,show:false, statusMsg:"", Class:("a"+Math.random()).replace(".","")
			,showControlUI:false, useNvuePlayer:false, useAppRenderjs:false
			,playing:false
			,player_position:0
			,player_currentTime:"00:00"
			,player_duration:"00:00"
			,player_durationNum:0
		}
	},
	methods:{
		shareFile(){
			this.saveFileFn();
		}
		,playStart(){
			this.playFn();
		}
		,playStop(){
			this.stopFn&&this.stopFn();
		}
		,setPlayerPosition(e){
			this.setPosFn(e);
		}
		
		
		,getPage(){
			var p=this.$parent;
			while(p){
				if(p.reclog) break;
				p=p.$parent;
			}
			if(!p){ //HBuilder X 4.28.2024092502，vue3组合式API和老版本不一致 $parent不好使了
				var ps=getCurrentPages();
				p=ps[ps.length-1];
			}
			return p;
		}
		,reclog(){
			var p=this.getPage();
			p.reclog.apply(p,arguments);
		}
		,getTexts(){
			return {
				T_pause:$T?$T("oozQ::暂停播放",":Pause"):""
				,T_play:$T?$T("PPxS::播放",":Play"):""
				,T_download:$T?$T("jtJH::下载保存",":Download and save"):""
			}
		}
		,status(msg){
			msg=msg?$T("w7J2::播放器创建中：",":Player is being created: ")+msg:"";
			this.statusMsg=msg;
			if(msg)RecordApp.CLog(msg);
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
		
		
		//创建要播放的音频
		,createAudio(type,aBuf0,mime0,aBuf,duration,mime){
			this.show=false;
			this.status("");
			this.playing=false;
			this.player_durationNum=duration;
			this.player_duration=this.formatTime(duration);
			this.player_currentTime="00:00";
			this.player_position=0;
			var fileName="recordapp-"+Date.now()+"."+type;
			
			var okEnd=()=>{
				this.show=true;
				this.status("");
				RecordApp.CLog($T("GXCV::播放器创建完成，可以播放了",":The player is created and can be played"));
			}
			
			
			//使用uni自带的播放器播放，nvue里面不支持h5播放
			if(this.useNvuePlayer){
				this.showControlUI=true;
				var saveBuf=(tag,sPath,sBuffer,next)=>{
					RecordApp.UniSaveLocalFile(sPath,sBuffer,(path)=>{
						this.reclog(tag+$T("FtgC::文件已保存在：",":File has been saved at: ")+path); next(path);
					},(err)=>{
						this.status(tag+$T("9AGy::保存文件失败，将无法播放：",":Failed to save the file and will not be able to play it: ")+err);
					});
				}
				this.status($T("4xcp::正在将数据保存成本地文件以供播放...",":Saving data to local file for playback..."));
				var path="",wavPath="";
				var saveOk=()=>{
					this.playUrl=path;
					this.playUrl_wav=wavPath;
					okEnd();
				}
				saveBuf("",fileName,aBuf0,(p)=>{
					path=p;
					if(aBuf==aBuf0){ saveOk(); return; }
					saveBuf($T("fU7N::[转码成wav播放]",":[Transcode to wav for playback]"),fileName+".wav",aBuf,(p)=>{
						wavPath=p;
						saveOk();
					});
				});
				this.setPosFn=(e)=>{
					var val=e.detail.value;
					if(!this.audio)this.playFn();
					var time=Math.round(this.player_durationNum*val/100);
					this.audio.seek(time/1000);
					this.audio.play();
				}
				this.playFn=()=>{
					var sid=this.playSid;
					if(this.audio){
						if(this.audio.sid==sid){
							if(this.audio.paused){
								this.audio.play();
							}else{
								this.audio.pause();
							}
							return;
						}
						this.stopFn();
					}
					this.audio=uni.createInnerAudioContext();
					this.audio.src=this.playUrl_wav||this.playUrl;
					this.audio.sid=sid;
					
					this.audio.onError((res)=>{
						this.reclog($T("JRu4::onError 播放错误：",":onError Playback error: ")+res.errMsg,1);
					});
					this.audio.timer=setInterval(()=>{
						if(this.playSid!=sid)return;
						if(!this.audio.duration)return;
						var dur=Math.round(this.audio.duration*1000);
						var cur=Math.round(this.audio.currentTime*1000);
						var pos=!dur?0:Math.min(100,Math.round(cur/dur*100));
						this.playing=!this.audio.paused;
						this.player_durationNum=dur;
						this.player_duration=this.formatTime(dur);
						this.player_currentTime=this.formatTime(cur);
						this.player_position=pos;
					},100);//onTimeUpdate 没卵用
						
					this.audio.seek(0);
					this.audio.play();
					if(this.playUrl_wav){
						this.status($T("7ity::使用转码的wav播放",":Play using transcoded wav"));
					}
				}
				this.stopFn=()=>{
					if(this.audio){
						clearInterval(this.audio.timer);
						try{ this.audio.stop(); }catch(e){ }
						this.audio.destroy();
					}
				}
				this.saveFileFn=()=>{
					this.reclog($T("OAiD::{1}字节文件已保存在：",":The {1} byte file has been saved at: ",0,aBuf0.byteLength)+path,2);
				}
				return;
			}
			
// #ifdef MP-WEIXIN
			this.showControlUI=true;
			var saveBuf=(tag,sPath,sBuffer,next)=>{
				wx.getFileSystemManager().writeFile({
					filePath:sPath
					,data:sBuffer
					,encoding:"binary"
					,success:()=>{ this.reclog(tag+$T("Nfi4::文件已保存在：",":File has been saved at: ")+sPath); next(); }
					,fail:(e)=>{ this.status(tag+$T("CLur::保存文件失败，将无法播放：",":Failed to save the file and will not be able to play it: ")+e.errMsg); }
				});
			}
			this.status($T("FeWl::正在将数据保存成本地文件以供播放...",":Saving data to local file for playback..."));
			var path=wx.env.USER_DATA_PATH+"/"+fileName,wavPath="";
			var saveOk=()=>{
				this.playUrl=path;
				this.playUrl_wav=wavPath;
				okEnd();
			}
			saveBuf("",path,aBuf0,()=>{
				if(aBuf==aBuf0){ saveOk(); return; }
				wavPath=path+".wav";
				saveBuf($T("5rCL::[转码成wav播放]",":[Transcode to wav for playback]"),wavPath,aBuf,()=>{
					saveOk();
				});
			});
			this.setPosFn=(e)=>{
				var val=e.detail.value;
				if(!this.audio)this.playFn();
				var time=Math.round(this.player_durationNum*val/100);
				this.audio.seek(time/1000);
				this.audio.play();
			}
			this.playFn=()=>{
				var sid=this.playSid;
				if(this.audio){
					if(this.audio.sid==sid){
						if(this.audio.paused){
							this.audio.play();
						}else{
							this.audio.pause();
						}
						return;
					}
					this.stopFn();
				}
				this.audio=wx.createInnerAudioContext();
				this.audio.src=this.playUrl_wav||this.playUrl;
				this.audio.sid=sid;
				
				this.audio.onError((res)=>{
					this.reclog($T("v37D::onError 播放错误：",":onError Playback error: ")+res.errMsg,1);
				});
				this.audio.timer=setInterval(()=>{
					if(this.playSid!=sid)return;
					if(!this.audio.duration)return;
					var dur=Math.round(this.audio.duration*1000);
					var cur=Math.round(this.audio.currentTime*1000);
					var pos=!dur?0:Math.min(100,Math.round(cur/dur*100));
					this.playing=!this.audio.paused;
					this.player_durationNum=dur;
					this.player_duration=this.formatTime(dur);
					this.player_currentTime=this.formatTime(cur);
					this.player_position=pos;
				},100);//onTimeUpdate 没卵用
		
				this.audio.seek(0);
				this.audio.play();
				if(this.playUrl_wav){
					this.status($T("ozU4::使用转码的wav播放",":Play using transcoded wav"));
				}
			}
			this.stopFn=()=>{
				if(this.audio){
					clearInterval(this.audio.timer);
					this.audio.stop();
					this.audio.destroy();
				}
			}
			this.saveFileFn=()=>{
				var sys=wx.getSystemInfoSync();
				if(sys.platform=="devtools"){
					wx.saveVideoToPhotosAlbum({//开发工具可以直接弹出保存对话框
						filePath:this.playUrl
						,success:()=>{
							this.reclog($T("bWZ1::保存文件成功",":File saved successfully"));
						}
						,fail:(e)=>{
							this.reclog($T("3v4Y::保存文件失败：",":Failed to save file: ")+e.errMsg);
						}
					});
					return;
				}
				wx.shareFileMessage({
					filePath:this.playUrl
					,success:()=>{
						this.reclog($T("5Zi2::分享文件成功，请到聊天中找到文件消息，保存即可",":File sharing is successful. Please find the file message in the chat and save it."));
					}
					,fail:(e)=>{
						this.reclog($T("nSDU::分享文件失败：",":Failed to share file: ")+e.errMsg);
					}
				});
			}
			return;
// #endif
// #ifdef H5
			if(this.playUrl)URL.revokeObjectURL(this.playUrl);
			this.playUrl=URL.createObjectURL(new Blob([aBuf],{type:mime}));
			document.querySelector("."+this.Class+" .h5Audio").innerHTML='<audio style="width:100%" />';
			this.playEl=document.querySelector("."+this.Class+" .h5Audio audio");
			this.playEl.controls=true;
			this.playEl.src=this.playUrl;
			this.playEl.onerror=(e)=>{ this.status($T("A0us::播放发生错误：",":An error occurred during playback: ")+e.message); }
			this.playEl.onpause=()=>{ this.playing=false; }
			okEnd();
			this.playFn=()=>{
				if(this.playEl.paused){
					this.playing=true;
					this.playEl.play();
				}else{
					this.stopFn();
				}
			}
			this.stopFn=()=>{
				this.playing=false;
				this.playEl.pause();
			}
			document.querySelector("."+this.Class+" .shareFileMsg").innerHTML="";
			this.saveFileFn=()=>{
				var cls=("a"+Math.random()).replace(".","");
				document.querySelector("."+this.Class+" .shareFileMsg").innerHTML='<div>'
					+$T('TDqm::点击 ',":Click ")+'<span class="'+cls+'"></span>'+$T('nZrq:: 下载，或复制文本',": to download, or copy the text")
					+'<button onclick="'+cls+'B64(\''+cls+'\')">'+$T('y1ys::生成Base64文本',":Generate Base64 text")+'</button><span class="'+cls+'_b64"></span>'
					+'</div>';
				window[cls+"B64"]=function(){
					var el=document.querySelector("."+cls+"_b64");
					el.innerHTML='<textarea></textarea>';
					el.querySelector("textarea").value=RecordApp.UniBtoa(aBuf0);
				}
				var downA=document.createElement("A");
				downA.innerHTML=$T("G0qS::下载 ",":Download ")+fileName;
				downA.href=URL.createObjectURL(new Blob([aBuf0],{type:mime0}));
				downA.download=fileName;
				document.querySelector("."+cls).appendChild(downA);
				if(/mobile/i.test(navigator.userAgent)){
					alert($T("Zkq9::因移动端绝大部分国产浏览器未适配Blob Url的下载，所以本demo代码在移动端未调用downA.click()。请尝试点击日志中显示的下载链接下载",":Since most domestic browsers on the mobile side are not adapted to downloading Blob URLs, this demo code does not call downA.click() on the mobile side. Please try to download by clicking the download link shown in the log"));
				}else{
					downA.click();
				}
			}
			return;
// #endif
// #ifdef APP
			RecordApp.UniWebViewVueCall(this.getPage(),`
				if(this.playUrl)URL.revokeObjectURL(this.playUrl);
				this.playUrl=URL.createObjectURL(new Blob([this.player_buffer],{type:"${mime}"}));
				document.querySelector(".${this.Class} .h5Audio").innerHTML='<audio style="width:100%" />';
				this.playEl=document.querySelector(".${this.Class} .h5Audio audio");
				this.playEl.controls=true;
				this.playEl.src=this.playUrl;
				this.playEl.onerror=function(e){ This.$ownerInstance.callMethod("status","${$T("8NWB::播放发生错误：",":An error occurred during playback: ")}"+e.message); }
				this.playEl.onpause=function(){ This.$ownerInstance.callMethod("player_stopFn",""); }
			`);
			okEnd();
			this.playFn=()=>{
				this.playing=true;
				RecordApp.UniWebViewVueCall(this.getPage(),`
					if(this.playEl.paused){
						this.playEl.play();
					}else{
						this.playEl.onpause();
					}
				`);
			}
			this.stopFn=()=>{
				this.playing=false;
				RecordApp.UniWebViewVueCall(this.getPage(),`this.playEl.pause();`);
			}
			this.getPage().player_stopFn=this.stopFn;
			this.saveFileFn=()=>{
				this.reclog($T("2Hr1::正在保存文件...",":Saving file..."));
				RecordApp.UniSaveLocalFile(fileName,aBuf0,(path)=>{
					this.reclog($T("GW1Q::{1}字节文件已保存在：",":The {1} byte file has been saved at: ",0,aBuf0.byteLength)+path,2);
				},(err)=>{
					this.reclog(err);
				});
			}
			return;
// #endif
			
			this.show=false;
			this.reclog($T("B1fH::当前环境未适配播放方式",":The current environment does not adapt to the playback method"),1);
		}
		
		
		//直接设置播放数据 或 转码成wav播放
		,setPlayBytes(aBuf,aBuf_renderjs,duration,mime,recSet,Recorder){
			this.show=false;
			this.playStop();
			this.playSid=(this.playSid||0)+1;
			this.status("");
			var aBuf0=aBuf, mime0=mime;
			if(!aBuf){
				return;
			}
			RecordApp=Recorder.RecordApp; $T=Recorder.i18n.$T;
			var o=this.getTexts();
			for(var k in o){
				this[k]=o[k];
			}
			
			var end=()=>{
				this.createAudio(recSet.type,aBuf0,mime0,aBuf,duration,mime)
			}
			if(!RecordApp.UniIsApp() || RecordApp.UniWithoutAppRenderjs && !this.useAppRenderjs){
				var wav=Recorder[recSet.type+"2wav"],t1=Date.now();
				if(!wav) return end();
				var wavData=aBuf;
				if(recSet.type=="pcm") wavData={ sampleRate:recSet.sampleRate,bitRate:recSet.bitRate,blob:aBuf };
				this.status($T("bHhO::正在转码成wav...",":Converting to wav..."));
				wav(wavData,(wavBuf,dur,mie)=>{
					aBuf=wavBuf; duration=dur; mime=mie;
					this.reclog($T("MhM5::已转码成wav以供播放，耗时{1}ms",":Transcoded to wav for playback, takes {1}ms",0,Date.now()-t1));
					end();
				},(msg)=>{
					this.reclog($T("oSeh::转码成wav失败：",":Transcoding to wav failed: ")+msg,1);
					end();
				});
			}else{
				//App里面到renderjs中进行转码，如果逻辑层加载了编码器，可以去掉这段代码直接走上面的逻辑
				var cb=RecordApp.UniMainCallBack((val)=>{ //接收renderjs数据回调
					if(val.errMsg){ this.reclog($T("LU2T::转码成wav失败：",":Transcoding to wav failed: ")+val.errMsg,1); end(); return; }
					if(val.ok==2){ end(); return; } //未转码
					this.reclog($T("65fk::已转码成wav以供播放，耗时{1}ms",":Transcoded to wav for playback, takes {1}ms",0,Date.now()-cbT1));
					aBuf=RecordApp.UniMainTakeBigBytes(val.dataId); duration=val.dur; mime=val.mie;
					end();
				});
				var bigBytes=null,bt1=0,cbT1=Date.now();
				if(!aBuf_renderjs){
					bigBytes=aBuf0; bt1=Date.now();
					aBuf_renderjs="BigBytes";
					RecordApp.CLog("[播放器]正在将"+aBuf0.byteLength+"字节音频数据发送到renderjs，因为可能需要转码成wav，可能会比较慢");
				}
				this.status($T("XkoT::正在调用renderjs处理音频数据，此格式如果提供了{1}2wav，将会转码成wav，会比较耗时...",":Renderjs is being called to process audio data. If {1}2wav is provided in this format, it will be transcoded into wav, which will be more time-consuming...",0,recSet.type));
				RecordApp.UniWebViewVueCall(this.getPage(),`
					if(${bt1})RecordApp.CLog("[播放器]完成传输${aBuf0.byteLength}字节的数据到renderjs，耗时"+(Date.now()-${bt1})+"ms");
					var recSet=${JSON.stringify(recSet)}, aBuf0=${aBuf_renderjs}, aBuf=aBuf0, duration, mime;
					var end=function(err){
						This.player_buffer=aBuf,t1=Date.now();
						if(err) return RecordApp.UniWebViewSendToMain({action:"${cb}",errMsg:err});
						if(aBuf==aBuf0) return RecordApp.UniWebViewSendToMain({action:"${cb}",ok:2});
						RecordApp.CLog("[播放器]开始传输"+aBuf.byteLength+"字节的数据回逻辑层，可能会比较慢");
						RecordApp.UniWebViewSendBigBytesToMain(aBuf,function(dataId){//数据可能很大
							RecordApp.CLog("[播放器]完成传输"+aBuf.byteLength+"字节的数据回逻辑层，耗时"+(Date.now()-t1)+"ms");
							RecordApp.UniWebViewSendToMain({action:"${cb}",ok:1,dataId:dataId,dur:duration,mie:mime});
						},end);
					};
					var wav=Recorder[recSet.type+"2wav"];
					if(!wav) return end();
					var wavData=aBuf;
					if(recSet.type=="pcm") wavData={ sampleRate:recSet.sampleRate,bitRate:recSet.bitRate,blob:aBuf };
					wav(wavData,function(wavBuf,dur,mie){
						aBuf=wavBuf; duration=dur; mime=mie;
						end();
					},function(msg){
						end("${$T("mzxq::转码成wav失败：",":Transcoding to wav failed: ")}"+msg);
					});
				`,bigBytes);
			}
		}
		
		
	}
}
</script>

<style>
</style>