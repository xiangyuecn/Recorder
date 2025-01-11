//手撸播放器
var Recorder=require("../../copy-rec-src/src/recorder-core.js");

Component({

methods: {
	setPage(page){
		this.page=page;
	}
	,reclog(msg,color){
		if(this.page){
			this.page.reclog("[Player]"+msg,color);
		}
	}
	
	//保存文件，分享给自己
	,shareFile(){
		var sys=wx.getSystemInfoSync();
		if(sys.platform=="devtools"){
			wx.saveVideoToPhotosAlbum({//开发工具可以直接弹出保存对话框
				filePath:this.data.playUrl
				,success:()=>{
					this.reclog("保存文件成功");
				}
				,fail:(e)=>{
					this.reclog("保存文件失败："+e.errMsg,1);
				}
			});
			return;
		}
		wx.shareFileMessage({
			filePath:this.data.playUrl
			,success:()=>{
				this.reclog("分享文件成功，请到聊天中找到文件消息，保存即可");
			}
			,fail:(e)=>{
				this.reclog("分享文件失败："+e.errMsg,1);
			}
		});
	}

	// 手撸播放器
	,setPlayerPosition(e){ //跳到指定位置播放
		var val=e.detail.value;
		if(!this.audio)this.play();
		var time=Math.round(this.data.player_durationNum*val/100);
		this.audio.seek(time/1000);
		this.audio.play();
	}
	,play(){
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
			this.playStop();
		}
		this.audio=wx.createInnerAudioContext();
		this.audio.src=this.playUrl_wav||this.data.playUrl;
		this.audio.sid=sid;

		this.audio.onError((res)=>{
			this.reclog("onError 播放错误："+res.errMsg,1);
		});
		var lastCur=0,lastTime=0;
		this.audio.timer=setInterval(()=>{
			if(this.playSid!=sid)return;
			if(!this.audio.duration)return;
			var dur=Math.round(this.audio.duration*1000);
			var cur=Math.round(this.audio.currentTime*1000);
			if(lastCur && cur==lastCur){//自带的更新太慢，补偿当前播放时长
				if(!this.audio.paused){
					cur+=Date.now()-lastTime;
				}
			}else{
				lastCur=cur;
				lastTime=Date.now();
			};
			var pos=!dur?0:Math.min(100,Math.round(cur/dur*100));
			this.setData({
				playing:!this.audio.paused
				,player_durationNum:dur
				,player_duration:this.formatTime(dur)
				,player_currentTime:this.formatTime(cur)
				,player_position:pos
			});
		},100);//onTimeUpdate 没卵用

		this.audio.seek(0);
		this.audio.play();
		if(this.playUrl_wav){
			this.reclog("已转码成wav播放");
		}
	}
	,playStop(){
		if(this.audio){
			clearInterval(this.audio.timer);
			this.audio.stop();
			this.audio.destroy();
		}
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
	
	,setPlayPath(duration, path, toWavPath){
		this.playStop();
		this.playSid=(this.playSid||0)+1;
		
		this.playUrl_wav=toWavPath||"";
		this.setData({
			playUrl:path
			,playing:false
			,player_durationNum:duration||0
			,player_duration:this.formatTime(duration||0)
			,player_currentTime:"00:00"
			,player_position:0
		});
	}
	,setPlayFile(aBuf,duration,mime,recSet){
		this.playStop();
		this.playSid=(this.playSid||0)+1;
		var path="",wavPath="";
		var end=()=>{
			this.playUrl_wav=wavPath;
			this.setData({
				playUrl:path
				,playing:false
				,player_durationNum:duration||0
				,player_duration:this.formatTime(duration||0)
				,player_currentTime:"00:00"
				,player_position:0
			});
		}
		if(!aBuf)return end();
		var type=recSet.type;
		var file="recTest_play_"+Date.now()+"."+type;
		path=wx.env.USER_DATA_PATH+"/"+file;

		var mg=wx.getFileSystemManager();
		mg.readdir({
			dirPath:wx.env.USER_DATA_PATH
			,success:(res)=>{
				console.log("清理旧播放文件",res.files);
				for(var i=0;i<res.files.length;i++){
					var s=res.files[i];
					if(/^recTest_play/.test(s) && s.indexOf(file)==-1){
						mg.unlink({filePath:wx.env.USER_DATA_PATH+"/"+s});
					}
				}
			}
		});

		var toWav=()=>{//转码成wav播放
			var wav=Recorder[type+"2wav"];
			if(!wav) return end();
			var wavData=aBuf;
			if(type=="pcm"){
				wavData={
					sampleRate:recSet.sampleRate
					,bitRate:recSet.bitRate
					,blob:aBuf
				};
			};
			wav(wavData,function(buf2){
				var wpath=path+".wav";
				saveFile("转码成wav播放",()=>{
					wavPath=wpath;
					end();
				},end,wpath,buf2);
			},(msg)=>{
				this.reclog("转码成wav失败："+msg,1);
				end();
			});
		};
		var saveFile=(tag,True,False,sPath,sBuffer)=>{
			mg.writeFile({
				filePath:sPath
				,data:sBuffer
				,encoding:"binary"
				,success:()=>{
					this.reclog(tag+"文件已保存在："+sPath);
					True();
				}
				,fail:(e)=>{
					this.reclog(tag+"保存文件失败，将无法播放："+e.errMsg,1);
					False();
				}
			});
		};
		saveFile("",toWav,()=>{},path,aBuf);
	}
}

})
