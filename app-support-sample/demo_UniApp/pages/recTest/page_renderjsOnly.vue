<template>
<view class="mainView"></view>
</template>

<script>
//这是逻辑层，不需要做什么事情
export default {
	methods:{
		renderjsCallThis(data){
			var aBuf=uni.base64ToArrayBuffer(data.base64),duration=data.duration,mime=data.mime;
			console.log("renderjsCallThis: "+aBuf.byteLength+"字节 "+duration+"ms "+mime);
		}
	}
}
</script>

<!-- #ifdef APP || H5 -->
<script module="test_1" lang="renderjs">
/** 先引入Recorder **/
import Recorder from 'recorder-core';

//按需引入需要的录音格式编码器，用不到的不需要引入，减少程序体积；H5、renderjs中可以把编码器放到static文件夹里面用动态创建script来引入，免得这些文件太大
import 'recorder-core/src/engine/mp3.js'
import 'recorder-core/src/engine/mp3-engine.js'

//可选引入可视化插件
import 'recorder-core/src/extensions/waveview.js'

/** 引入RecordApp **/
import RecordApp from 'recorder-core/src/app-support/app.js'
//【必须引入】uni-app支持文件
import '../../uni_modules/Recorder-UniCore/app-uni-support.js'

export default {
	mounted(){
		this.pageId=("page_"+Math.random()).replace(".","");
		console.log("renderjsOnly mounted  "+this.pageId);
		window[this.pageId]=this;
		initUI(this.pageId,this.$ownerInstance.$el);
	},
	/*#ifdef VUE3*/unmounted()/*#endif*/ /*#ifndef VUE3*/destroyed()/*#endif*/ {
		var tag=/*#ifdef VUE3*/"unmounted"/*#endif*/ /*#ifndef VUE3*/"destroyed"/*#endif*/;
		//h5有这个回调进行清理，app里面不需要，因为整个webview都被干掉了
		delete window[this.pageId];
		console.log("renderjsOnly "+tag+"  "+this.pageId);
	},
	methods: {
		recReq(){
			this.reclog("开始请求授权...");
			RecordApp.RequestPermission(()=>{
				this.reclog(RecordApp.Current.Key+" 已授权",2);
			},(err,isUserNotAllow)=>{
				this.reclog((RecordApp.Current&&RecordApp.Current.Key||"[?]")
					+(isUserNotAllow?" UserNotAllow, ":"")
					+" 授权失败："+err,1);
			});
		}
		,recStart(){
			if(!RecordApp.Current){
				this.reclog("未请求权限", 1);
				return;
			};
			
			var set={
				type:"mp3"
				,bitRate:16
				,sampleRate:16000
				,onProcess:(buffers,powerLevel,bufferDuration,bufferSampleRate,newBufferIdx,asyncEnd)=>{
					//录音实时回调，大约1秒调用12次本回调
					this.$ownerInstance.$el.querySelector(".recpowerx").style.width=powerLevel+"%";
					this.$ownerInstance.$el.querySelector(".recpowert").innerText=this.formatMs(bufferDuration,1)+" / "+powerLevel;
					
					//可视化图形绘制
					this.wave.input(buffers[buffers.length-1],powerLevel,bufferSampleRate);
				}
			};
			
			this.wave=null;
			this.recBlob=null;
			this.reclog("正在打开...");
			RecordApp.Start(set,()=>{
				this.reclog(RecordApp.Current.Key+" 录制中："+set.type+" "+set.sampleRate+" "+set.bitRate+"kbps",2);
				
				//此处创建这些音频可视化图形绘制浏览器支持妥妥的
				this.wave=Recorder.WaveView({elem:this.$ownerInstance.$el.querySelector(".recwave")});
			},(err)=>{
				this.reclog(RecordApp.Current.Key+" 开始录音失败："+err,1);
			});
		}
		,recStop(){
			if(!RecordApp.Current){
				this.reclog("未请求权限", 1);
				return;
			};
			
			RecordApp.Stop((aBuf,duration,mime)=>{
				var blob=new Blob([aBuf],{type:mime});
				console.log(blob,(window.URL||webkitURL).createObjectURL(blob),"duration:"+duration+"ms");
				
				this.recBlob=blob;
				this.reclog("已录制mp3："+this.formatMs(duration)+"ms "+blob.size+"字节，可以点击播放了",2);
				
				//将录音数据传递给逻辑层
				this.$ownerInstance.callMethod("renderjsCallThis",{base64:RecordApp.UniBtoa(aBuf),duration:duration,mime:mime});
			},(msg)=>{
				this.reclog("录音失败："+msg,1);
			});
		}
		,recPlay(){
			if(!this.recBlob){
				this.reclog("请先录音，然后停止后再播放",1);
				return;
			};
			var cls=("a"+Math.random()).replace(".","");
			this.reclog('播放中: <span class="'+cls+'"></span>');
			var audio=document.createElement("audio");
			audio.controls=true;
			document.querySelector("."+cls).appendChild(audio);
			//简单利用URL生成播放地址，注意不用了时需要revokeObjectURL，否则霸占内存
			audio.src=(window.URL||webkitURL).createObjectURL(this.recBlob);
			audio.play();
			
			setTimeout(function(){
				(window.URL||webkitURL).revokeObjectURL(audio.src);
			},5000);
		}
		
		,formatMs(ms,all){
			var ss=ms%1000;ms=(ms-ss)/1000;
			var s=ms%60;ms=(ms-s)/60;
			var m=ms%60;ms=(ms-m)/60;
			var h=ms;
			var t=(h?h+":":"")
				+(all||h+m?("0"+m).substr(-2)+":":"")
				+(all||h+m+s?("0"+s).substr(-2)+"″":"")
				+("00"+ss).substr(-3);
			return t;
		}
		,reclog(s,color){
			var now=new Date();
			var t=("0"+now.getHours()).substr(-2)
				+":"+("0"+now.getMinutes()).substr(-2)
				+":"+("0"+now.getSeconds()).substr(-2);
			var div=document.createElement("div");
			var elem=this.$ownerInstance.$el.querySelector(".reclog");
			elem.insertBefore(div,elem.firstChild);
			div.innerHTML='<div style="color:'+(!color?"":color==1?"red":color==2?"#0b1":color)+'">['+t+']'+s+'</div>';
		}
	}
}

var initUI=function(pageId,el){
	el.innerHTML=`
<div>
	<div style="padding:5px 10px 0;color:#0b0">renderjs是在WebView环境中运行，和编写普通的H5页面没有区别</div>
	
	<!-- 控制按钮 -->
	<div style="padding:5px 0 0 10px">
		<button onclick="${pageId}.recReq()">请求录音权限</button>
		<button onclick="${pageId}.recStart()">开始录音</button>
		<button onclick="${pageId}.recStop()">停止录音</button>
		<button onclick="${pageId}.recPlay()">播放</button>
	</div>
	
	<!-- 可视化绘制 -->
	<div style="padding:5px 0 0 10px">
		<div style="height:40px;width:300px;background:#999;position:relative;">
			<div class="recpowerx" style="height:40px;background:#0B1;position:absolute;"></div>
			<div class="recpowert" style="padding-left:50px; line-height:40px; position: relative;"></div>
		</div>
		
		<div style="padding-top:5px"></div>
		<div style="border:1px solid #ccc;display:inline-block"><div style="height:100px;width:300px;" class="recwave"></div></div>
	</div>
	
	<!-- 日志输出区域 -->
	<div style="padding-top:10px">
		<div class="reclog"></div>
	</div>
</div>`;
}
</script>
<!-- #endif -->