// https://github.com/xiangyuecn/Recorder

/** npm支持太差，直接复制Recorder的src源码目录到小程序一个目录内，然后正常引用即可 **/
//先引入Recorder，和需要的格式编码器
var Recorder=require("../../copy-rec-src/src/recorder-core.js");
require("../../copy-rec-src/src/engine/mp3.js");
require("../../copy-rec-src/src/engine/mp3-engine.js");
require("../../copy-rec-src/src/engine/wav.js");
require("../../copy-rec-src/src/engine/pcm.js");
require("../../copy-rec-src/src/engine/g711x");
require("../../copy-rec-src/src/engine/beta-amr");
require("../../copy-rec-src/src/engine/beta-amr-engine");
/*require("../../copy-rec-src/src/engine/beta-ogg"); //小程序文件超过2M限制，不测试ogg
require("../../copy-rec-src/src/engine/beta-ogg-engine");*/

//引入可视化插件
require("../../copy-rec-src/src/extensions/waveview.js");
require("../../copy-rec-src/src/extensions/wavesurfer.view.js");

require("../../copy-rec-src/src/extensions/frequency.histogram.view.js");
require("../../copy-rec-src/src/extensions/lib.fft.js");

//引入RecordApp
var RecordApp=require("../../copy-rec-src/src/app-support/app.js");
//引入RecordApp的微信小程序支持文件
require("../../copy-rec-src/src/app-support/app-miniProgram-wx-support.js");


//仅测试用的
var TestOther__=require("../test_other__/test_other__.js");


Page({
	onShow(){
		//当使用到录音的页面onShow时进行一次调用，用于恢复被暂停的录音（比如按了home键会暂停录音）
		RecordApp.MiniProgramWx_onShow();
	}
	,recReq(){
		this.reclog("正在请求录音权限...");
		RecordApp.RequestPermission(()=>{
			this.reclog("已获得录音权限，可以开始录音了",2);
			if(this.reqOkCall)this.reqOkCall(); this.reqOkCall=null; //留别的组件内调用的回调
		},(msg,isUserNotAllow)=>{
			if(isUserNotAllow){//用户拒绝了录音权限
				//这里你应当编写代码检查wx.getSetting中的scope.record录音权限，引导用户进行授权
				wx.showModal({
					title:"需要录音权限"
					,content:"请到设置中允许小程序访问麦克风"
					,confirmText:"打开设置"
					,success:(res)=>{
						if(res.confirm) wx.openSetting();
					}
				});
			}

			this.reclog((isUserNotAllow?"isUserNotAllow,":"")+"请求录音权限失败："+msg,1);
		});
	}
	,recStart(){
		var player=this.selectComponent('.player');
		player.setPage(this); player.setPlayFile(null);
		
		var takeEcCount=0,takeEcSize=0; this.setData({takeoffEncodeChunkMsg:""});
		this.takeEcChunks=this.data.takeoffEncodeChunkSet?[]:null;
		this.watchDogTimer=0; this.wdtPauseT=0; var processTime=0;
		
		this.reclog("正在开始录音...");
		RecordApp.Start({
			type:this.data.recType
			,sampleRate:this.data.recSampleRate
			,bitRate:this.data.recBitRate
			,audioTrackSet:!this.data.useAEC?null:{ //配置回声消除，小程序的只在Android生效，iOS不支持
				noiseSuppression:true,echoCancellation:true,autoGainControl:true
			}
			,onProcess:(buffers,powerLevel,duration,sampleRate,newBufferIdx,asyncEnd)=>{
				processTime=Date.now();
				//可视化图形绘制
				this.setData({
					recpowerx:powerLevel
					,recpowert:this.formatTime(duration,1)+" / "+powerLevel
				});
				var wave=this.waveStore[this.data.recwaveChoiceKey];
				if(wave){
					wave.input(buffers[buffers.length-1],powerLevel,sampleRate);
				}
				//实时语音通话对讲，实时处理录音数据
				if(this.wsVoiceProcess) this.wsVoiceProcess(buffers,powerLevel,duration,sampleRate,newBufferIdx);
				
				//实时释放清理内存，用于支持长时间录音；在指定了有效的type时，编码器内部可能还会有其他缓冲，必须同时提供takeoffEncodeChunk才能清理内存，否则type需要提供unknown格式来阻止编码器内部缓冲
				if(this.takeEcChunks){
					if(this.clearBufferIdx>newBufferIdx){ this.clearBufferIdx=0 } //重新录音了就重置
					for(var i=this.clearBufferIdx||0;i<newBufferIdx;i++) buffers[i]=null;
					this.clearBufferIdx=newBufferIdx;
				}
			}
			,takeoffEncodeChunk:!this.data.takeoffEncodeChunkSet?null:(chunkBytes)=>{
				//实时接收到编码器编码出来的音频片段数据，chunkBytes是Uint8Array二进制数据，可以实时上传（发送）出去
				takeEcCount++; takeEcSize+=chunkBytes.byteLength;
				this.setData({takeoffEncodeChunkMsg:"已接收到"+takeEcCount+"块，共"+takeEcSize+"字节"});
				this.takeEcChunks.push(chunkBytes);
				
				//可以实时写入到文件
				var isFirst=takeEcCount==1;
				if(isFirst) this.takeEcFile="recTest_takeEc_"+Date.now()+"."+this.data.recType;
				RecordApp.MiniProgramWx_WriteLocalFile({
					fileName:this.takeEcFile
					,append:!isFirst //第一帧新建文件，后面的帧append到文件
				},chunkBytes.buffer,(savePath)=>{
					if(isFirst) this.reclog("实时写入到文件："+savePath);
				},(errMsg)=>{
					this.reclog("实时写入文件出错："+errMsg,1);
				});
			}
		},()=>{
			var iosSpeakerOff=false;
			if(this.data.useAEC){
				this.reclog("小程序的回声消除只在Android中生效，iOS不支持，iOS上将使用听筒播放，大幅减弱回声","#fa0");
				if(wx.getSystemInfoSync().platform=="ios"){
					iosSpeakerOff=true;
					wx.setInnerAudioOption({ speakerOn:false });
				}
			}
			if(!iosSpeakerOff && this.iosSpeakerOff){
				wx.setInnerAudioOption({ speakerOn:true });
			}
			this.iosSpeakerOff=iosSpeakerOff;
			
			this.reclog("录音中   type="+this.data.recType
				+" "+this.data.recSampleRate+" "+this.data.recBitRate+"kbps"
				+(this.data.useAEC?" useAEC":"")
				+(this.data.takeoffEncodeChunkSet?" takeoffEncodeChunk":""),2);
			//创建音频可视化图形绘制
			this.initWaveStore();
			
			//【稳如老狗WDT】可选的，监控是否在正常录音有onProcess回调，如果长时间没有回调就代表录音不正常
			if(RecordApp.Current.CanProcess()){
				var wdt=this.watchDogTimer=setInterval(()=>{
					if(wdt!=this.watchDogTimer){ clearInterval(wdt); return } //sync
					if(Date.now()<this.wdtPauseT) return; //如果暂停录音了就不检测：puase时赋值this.wdtPauseT=Date.now()*2（永不监控），resume时赋值this.wdtPauseT=Date.now()+1000（1秒后再监控）
					if(Date.now()-(processTime||startTime)>1500){ clearInterval(wdt);
						this.reclog(processTime?"录音被中断":"录音未能正常开始",1);
						// ... 错误处理，关闭录音，提醒用户
					}
				},1000);
			}else{
				this.reclog("当前环境不支持onProcess回调，不启用watchDogTimer","#aaa"); //目前都支持回调
			}
			var startTime=Date.now();
		},(msg)=>{
			this.reclog("开始录音失败："+msg,1);
		});
	}
	,recPause(){
		if(RecordApp.GetCurrentRecOrNull()){
			RecordApp.Pause();
			this.wdtPauseT=Date.now()*2; //永不监控onProcess超时
			this.reclog("已暂停");
		}
	}
	,recResume(){
		if(RecordApp.GetCurrentRecOrNull()){
			RecordApp.Resume();
			this.wdtPauseT=Date.now()+1000; //1秒后再监控onProcess超时
			this.reclog("继续录音中...");
		}
	}
	,__stopClear(){
		//恢复AEC设置的外放
		if(this.iosSpeakerOff){
			this.iosSpeakerOff=false;
			wx.setInnerAudioOption({ speakerOn:true });
		}
		this.watchDogTimer=0; //停止监控onProcess超时
	}
	,recStopX(){
		this.__stopClear();
		RecordApp.Stop(
			null //success传null就只会清理资源，不会进行转码
			,(msg)=>{
				this.reclog("已清理，错误信息："+msg);
			}
		);
	}
	,recStop(){
		this.reclog("正在结束录音...");
		this.__stopClear();
		RecordApp.Stop((aBuf,duration,mime)=>{
			var recSet=RecordApp.GetCurrentRecOrNull().set;
			this.reclog("已录制["+mime+"]："+duration+"ms "+aBuf.byteLength+"字节 "
				+recSet.sampleRate+"hz "+recSet.bitRate+"kbps",2);
			
			if(this.takeEcChunks){
				this.reclog("启用takeoffEncodeChunk后Stop返回的blob长度为0不提供音频数据");
				var len=0; for(var i=0;i<this.takeEcChunks.length;i++)len+=this.takeEcChunks[i].length;
				var chunkData=new Uint8Array(len);
				for(var i=0,idx=0;i<this.takeEcChunks.length;i++){
					var itm=this.takeEcChunks[i]; chunkData.set(itm,idx); idx+=itm.length;
				};
				aBuf=chunkData.buffer;
				this.reclog("takeoffEncodeChunk接收到的音频片段，已合并成一个音频文件 "+aBuf.byteLength+"字节");
			}
			//用变量保存起来，别的地方调用
			this.lastRecType=recSet.type;
			this.lastRecBuffer=aBuf;
			
			this.selectComponent('.player').setPlayFile(aBuf,duration,mime,recSet);
		},(msg)=>{
			this.reclog("结束录音失败："+msg,1);
		});
	}




	,data: {
		recType:"mp3"
		,recSampleRate:16000
		,recBitRate:16
		
		,takeoffEncodeChunkSet:false
		,takeoffEncodeChunkMsg:""
		,useAEC:false
		,showUpload:false

		,recwaveChoiceKey:"WaveView"
		,testMsgs:[],reclogs:[],reclogLast:""
	}
	,onLoad(options) {
		this.reclog("页面onLoad Recorder.LM="+Recorder.LM+" RecordApp.LM="+RecordApp.LM);
		this.reclog("请先请求录音权限，然后再开始录音");
	}
	,clearLogs(){ this.setData({ testMsgs:[], reclogs:[] }) }
	,addTestMsg(msg,color){
		var now=new Date();
		var t=("0"+now.getHours()).substr(-2)
			+":"+("0"+now.getMinutes()).substr(-2)
			+":"+("0"+now.getSeconds()).substr(-2);
		var txt="["+t+"]"+msg;
		console.log(txt);
		this.data.testMsgs.splice(0,0,{msg:txt,color:color});
		this.setData({ testMsgs:this.data.testMsgs });
	}
	,reclog(msg,color){
		var now=new Date();
		var t=("0"+now.getHours()).substr(-2)
			+":"+("0"+now.getMinutes()).substr(-2)
			+":"+("0"+now.getSeconds()).substr(-2);
		var txt="["+t+"]"+msg;
		console.log(txt);
		this.data.reclogs.splice(0,0,{txt:txt,color:color});
		this.setData({reclogs:this.data.reclogs, reclogLast:{txt:txt,color:color}});
	}
	,inputSet(e){
		var val=e.detail.value;
		var data=e.target.dataset;
		if(val && data.type=="number"){ val=+val||0; }
		var obj={}; obj[data.key]=val;
		this.setData(obj);
	}
	,takeoffEncodeChunkSetClick(){
		this.setData({ takeoffEncodeChunkSet:!this.data.takeoffEncodeChunkSet });
	}
	,useAEC_Click(){
		this.setData({ useAEC:!this.data.useAEC });
	}
	,showUploadClick(){
		this.setData({ showUpload:!this.data.showUpload });
	}
	,recTypeClick(res){
		var type=res.target.dataset.type;
		if(type){
			this.setData({ recType:type });
		}
	}

	// 可视化波形，这里是一次性创建多个波形，可以参考test_asr页面只创建一个波形会简单一点
	,initWaveStore(){
		if(this.waveStore)return;
		var getCanvas=(slc,call)=>{
			this.createSelectorQuery().select(slc)
			.fields({ node: true }).exec((res)=>{
				try{
					call(res[0].node);
				}catch(e){
					console.error(e);
					this.reclog("["+slc+"]发生异常："+e.message,1);
				}
			});
		};
		var store=this.waveStore={};

		getCanvas(".recwave-WaveView",(canvas)=>{
			store.WaveView=Recorder.WaveView({compatibleCanvas:canvas, width:300, height:100});
		});
		getCanvas(".recwave-SurferView",(canvas)=>{
			getCanvas(".recwave-SurferView-2x",(canvas_2x)=>{
				//注意：iOS上微信小程序基础库存在bug，canvas.drawImage(canvas)可能无法绘制，可能会导致WaveSurferView在iOS小程序上不能正确显示，其他环境下无此兼容性问题
				store.SurferView=Recorder.WaveSurferView({compatibleCanvas:canvas,compatibleCanvas_2x:canvas_2x, width:300, height:100});
			});
		});
		getCanvas(".recwave-Histogram1",(canvas)=>{
			store.Histogram1=Recorder.FrequencyHistogramView({compatibleCanvas:canvas, width:300, height:100});
		});
		getCanvas(".recwave-Histogram2",(canvas)=>{
			store.Histogram2=Recorder.FrequencyHistogramView({compatibleCanvas:canvas, width:300, height:100
				,lineCount:200,widthRatio:1
				,position:0
				,minHeight:1
				,fallDuration:600
				,stripeEnable:false
				,mirrorEnable:true
			});
		});
		getCanvas(".recwave-Histogram3",(canvas)=>{
			store.Histogram3=Recorder.FrequencyHistogramView({compatibleCanvas:canvas, width:300, height:100
				,lineCount:20
				,position:0
				,minHeight:1
				,fallDuration:400
				,stripeEnable:false
				,mirrorEnable:true
				,linear:[0,"#0ac",1,"#0ac"]
			});
		});
	}
	,recwaveChoice(res){
		var key=res.target.dataset.key;
		if(key){
			if(key!=this.data.recwaveChoiceKey){
				this.reclog("已切换波形显示为："+key);
				if(key=="SurferView"){
					this.reclog("注意：iOS上微信小程序基础库存在bug，canvas.drawImage(canvas)可能无法绘制，可能会导致WaveSurferView在iOS小程序上不能正确显示，其它可视化插件无此兼容性问题","#fa0");
				}
			}
			this.setData({ recwaveChoiceKey:key });
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
	
	//一些功能测试
	,testMethods(){
		TestOther__.testMethods(this);
	}
	,testWritePcm2Wav(){
		TestOther__.testWritePcm2Wav(this);
	}
	,reloadPage(){
		var url="/"+this.route;
		console.log("刷新页面 url="+url);
		if(getCurrentPages().length==1){
			wx.reLaunch({ url:url })
		}else{
			wx.navigateBack({success:()=>{ setTimeout(()=>{
				wx.navigateTo({url:url})
			},300); }});
		}
	}

})