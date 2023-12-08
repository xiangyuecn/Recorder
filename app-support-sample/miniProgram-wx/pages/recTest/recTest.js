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



Page({
	onShow(){
		//当使用到录音的页面onShow时进行一次调用，用于恢复被暂停的录音（比如按了home键会暂停录音）
		RecordApp.MiniProgramWx_onShow();
	}
	,recReq(){
		this.reclog("正在请求录音权限...");
		RecordApp.RequestPermission(()=>{
			this.reclog("已获得录音权限，可以开始录音了",2);
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
		
		this.reclog("正在开始录音...");
		RecordApp.Start({
			type:this.data.recType
			,sampleRate:this.data.recSampleRate
			,bitRate:this.data.recBitRate
			,onProcess:(buffers,powerLevel,duration,sampleRate,newBufferIdx,asyncEnd)=>{
				//可视化图形绘制
				this.setData({
					recpowerx:powerLevel
					,recpowert:this.formatTime(duration,1)+" / "+powerLevel
				});
				var wave=this.waveStore[this.data.recwaveChoiceKey];
				if(wave){
					wave.input(buffers[buffers.length-1],powerLevel,sampleRate);
				}
			}
			,takeoffEncodeChunk:!this.data.takeoffEncodeChunkSet?null:(chunkBytes)=>{
				//实时接收到编码器编码出来的音频片段数据，chunkBytes是Uint8Array二进制数据，可以实时上传（发送）出去
				takeEcCount++; takeEcSize+=chunkBytes.byteLength;
				this.setData({takeoffEncodeChunkMsg:"已接收到"+takeEcCount+"块，共"+takeEcSize+"字节"});
				this.takeEcChunks.push(chunkBytes);
			}
		},()=>{
			this.reclog("录音中   type="+this.data.recType
				+" "+this.data.recSampleRate+" "+this.data.recBitRate+"kbps"
				+(this.data.takeoffEncodeChunkSet?" takeoffEncodeChunk":""),2);
			//创建音频可视化图形绘制
			this.initWaveStore();
		},(msg)=>{
			this.reclog("开始录音失败："+msg,1);
		});
	}
	,recPause(){
		if(RecordApp.GetCurrentRecOrNull()){
			RecordApp.Pause();
			this.reclog("已暂停");
		}
	}
	,recResume(){
		if(RecordApp.GetCurrentRecOrNull()){
			RecordApp.Resume();
			this.reclog("继续录音中...");
		}
	}
	,recStopX(){
		RecordApp.Stop(
			null //success传null就只会清理资源，不会进行转码
			,(msg)=>{
				this.reclog("已清理，错误信息："+msg);
			}
		);
	}
	,recStop(){
		this.reclog("正在结束录音...");
		RecordApp.Stop((aBuf,duration,mime)=>{
			var recSet=RecordApp.GetCurrentRecOrNull().set;
			this.reclog("已录制["+mime+"]："+duration+"ms "+aBuf.byteLength+"字节 "
				+recSet.sampleRate+"hz "+recSet.bitRate+"kbps",2);
			
			if(this.takeEcChunks){
				this.reclog("启用takeoffEncodeChunk后Stop返回的blob长度为0不提供音频数据");
				var len=0; for(var i=0;i<this.takeEcChunks.length;i++)len+=this.takeEcChunks[i].length;
				var chunkData=new Uint8Array(len);
				for(var i=0,idx=0;i<this.takeEcChunks.length;i++){
					var itm=this.takeEcChunks[i];
					chunkData.set(itm,idx);
					idx+=itm.length;
				};
				aBuf=chunkData.buffer;
				this.reclog("takeoffEncodeChunk接收到的音频片段，已合并成一个音频文件 "+aBuf.byteLength+"字节");
			}
			
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

		,recwaveChoiceKey:"WaveView"
		,reclogs:[]
	}
	,onLoad(options) {
		this.reclog("页面onLoad Recorder.LM="+Recorder.LM+" RecordApp.LM="+RecordApp.LM);
		this.reclog("请先请求录音权限，然后再开始录音");
	}
	,reclog(msg,color){
		var now=new Date();
		var t=("0"+now.getHours()).substr(-2)
			+":"+("0"+now.getMinutes()).substr(-2)
			+":"+("0"+now.getSeconds()).substr(-2);
		var txt="["+t+"]"+msg;
		console.log(txt);
		this.data.reclogs.splice(0,0,{txt:txt,color:color});
		this.setData({reclogs:this.data.reclogs});
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
				store.SurferView=Recorder.WaveSurferView({compatibleCanvas:canvas,compatibleCanvas_2x:canvas_2x, width:300, height:100});
			});
		});
		getCanvas(".recwave-Histogram1",(canvas)=>{
			store.Histogram1=Recorder.FrequencyHistogramView({compatibleCanvas:canvas, width:300, height:100});
		});
		getCanvas(".recwave-Histogram2",(canvas)=>{
			store.Histogram2=Recorder.FrequencyHistogramView({compatibleCanvas:canvas, width:300, height:100
				,lineCount:90
				,position:0
				,minHeight:1
				,stripeEnable:false
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