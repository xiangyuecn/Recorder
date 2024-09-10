<!-- uni-app内使用RecordApp录音
GitHub: https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/demo_UniApp
DCloud 插件市场下载组件: https://ext.dcloud.net.cn/plugin?name=Recorder-UniCore
-->

<template>
<view>
	<view style="padding:5px 10px 0">
		<view><text style="font-size:24px;color:#0b1">逻辑层编码UniWithoutAppRenderjs</text></view>
		<view style="font-size:13px;color:#f60">
			<view>App环境下，设置RecordApp.UniWithoutAppRenderjs=true后，RecordApp完全运行在逻辑层，此时录音和音频编码之类的操作全部在逻辑层，在后台录音时不受renderjs的WebView运行受限的影响录音更稳定，但会影响逻辑层的性能（正常情况轻微不明显），需要提供UniNativeUtsPlugin配置由原生插件进行录音，可视化绘制依旧可以在renderjs中进行。</view>
			<view>搭配了原生插件，且需要在后台录音时，建议进行配置为true，可避免受renderjs的WebView在后台运行受限的影响，录音会更稳定。</view>
		</view>
	</view>

	<!-- 控制按钮 -->
	<view style="display: flex;padding-top:10px">
		<view style="width:10px"></view>
		<view style="flex:1">
			<button type="warn" @click="recReq" style="font-size:16px;padding:0">请求录音权限</button>
		</view>
		<view style="width:10px"></view>
		<view style="flex:1">
			<button type="primary" @click="recStart" style="font-size:16px;padding:0">开始录音</button>
		</view>
		<view style="width:10px"></view>
		<view style="flex:1">
			<button @click="recStop" style="font-size:16px;padding:0">停止录音</button>
		</view>
		<view style="width:10px"></view>
	</view>
	<view style="padding:10px 10px 0">
		<button size="mini" type="default" @click="recPause">暂停</button>
		<button size="mini" type="default" @click="recResume">继续</button>
		<button size="mini" type="default" @click="recEnvIn60" style="padding:0 5px;margin-left:10px">注入1小时数据</button>
		<button size="mini" type="default" @click="testShowMemoryUsage" style="padding:0 5px">显示内存占用</button>
	</view>
	
	<!-- 可视化绘制 -->
	<view style="padding:5px 0 0 10px">
		<view style="height:40px;width:300px;background:#999;position:relative;">
			<view style="height:40px;background:#0B1;position:absolute;" :style="{width:recpowerx+'%'}"></view>
			<view style="padding-left:50px; line-height:40px; position: relative;">{{recpowert}}</view>
		</view>
		
		<!-- 可视化波形，只需创建需要用到的canvas就行，canvas需要指定宽高（下面style里指定了300*100） -->
		<view style="padding-top:5px"></view>
		<view class="recwave">
			<canvas type="2d" class="recwave-WaveView"></canvas>
		</view>
	</view>
	
	<!-- 手撸播放器 -->
	<view style="padding-top:10px">
		<TestPlayer ref="player" />
	</view>
	
	<!-- 日志输出 -->
	<view style="padding-top:10px">
		<view v-for="obj in reclogs" :key="obj.idx" style="border-bottom:1px dashed #666;padding:5px 0;">
			<view :style="{color:obj.color==1?'red':obj.color==2?'green':obj.color}">
				{{obj.txt}}
			</view>
		</view>
	</view>
	
</view>
</template>


<script>
import TestPlayer from './test_player___.vue'; //手撸的一个跨平台播放器


/** 先引入Recorder （ 需先 npm install recorder-core ）**/
import Recorder from 'recorder-core'; //注意如果未引用Recorder变量，可能编译时会被优化删除（如vue3 tree-shaking），请改成 import 'recorder-core'，或随便调用一下 Recorder.a=1 保证强引用

/** App逻辑层中引入需要的格式编码器，可视化功能在renderjs中引入 **/
import 'recorder-core/src/engine/mp3.js'
import 'recorder-core/src/engine/mp3-engine.js'

/** 引入RecordApp **/
import RecordApp from 'recorder-core/src/app-support/app.js'
//【所有平台必须引入】uni-app支持文件
import '../../uni_modules/Recorder-UniCore/app-uni-support.js'

//测试用根据简谱生成一段音乐
import 'recorder-core/src/extensions/create-audio.nmn2pcm.js'


/** 引入原生录音插件，原生插件市场地址: https://ext.dcloud.net.cn/plugin?name=Recorder-NativePlugin （试用无任何限制）
	在调用RecordApp.RequestPermission之前进行配置，建议放到import后面直接配置（全局生效） */
RecordApp.UniNativeUtsPlugin={nativePlugin:true}; //目前仅支持原生插件，uts插件不可用


export default {
	components: { TestPlayer },
	data() {
		return {
			recType:"mp3"
			,recSampleRate:16000
			,recBitRate:16
			
			,recpowerx:0
			,recpowert:""
			,reclogs:[]
		}
	},
	mounted() {
		RecordApp.Current=null;
		RecordApp.UniWithoutAppRenderjs=true; //逻辑层进行录音和音频编码，需要原生录音插件支持
		RecordApp.UniNativeUtsPlugin={nativePlugin:true}; //启用原生插件配置
		
		this.reclog("页面mounted");
		this.isMounted=true; this.uniPage__onShow(); //onShow可能比mounted先执行，页面准备好了时再执行一次
	},
	/*#ifdef VUE3*/unmounted()/*#endif*/ /*#ifndef VUE3*/destroyed()/*#endif*/ {
		var tag=/*#ifdef VUE3*/"unmounted"/*#endif*/ /*#ifndef VUE3*/"destroyed"/*#endif*/;
		//清理资源，如果打开了录音没有关闭，这里将会进行关闭
		RecordApp.Stop(null,()=>{
			RecordApp.Current=null; //恢复环境
			RecordApp.UniWithoutAppRenderjs=false; //恢复环境
			console.log(tag+" 已恢复环境");
		});
	},
	onShow() { //当组件用时没这个回调
		if(this.isMounted) this.uniPage__onShow(); //onShow可能比mounted先执行，页面可能还未准备好
	},
	methods:{
		uniPage__onShow(){ //页面onShow时【必须调用】的函数，传入当前组件this
			RecordApp.UniPageOnShow(this);
		}
		,currentKeyTag(){
			if(!RecordApp.Current) return "[?]";
			// #ifdef APP
			var tag2="Renderjs+H5";
			if(RecordApp.UniNativeUtsPlugin){
				tag2=RecordApp.UniNativeUtsPlugin.nativePlugin?"NativePlugin":"UtsPlugin";
			}
			return RecordApp.Current.Key+"("+tag2+")";
			// #endif
			return RecordApp.Current.Key;
		}
		
		,recReq(){
			var err=RecordApp.UniCheckNativeUtsPluginConfig();//可以检查一下原生插件配置是否有效
			if(err){
				this.reclog(err,1);
				return;
			}
			RecordApp.UniNativeUtsPlugin_JsCall=(data)=>{ //可以绑定原生插件的jsCall回调
				if(data.action=="onLog"){ //显示原生插件日志信息
					this.reclog("[Native.onLog]["+data.tag+"]"+data.message, data.isError?1:"#bbb", {noLog:1});
				}
			};
			
			this.reclog("正在请求录音权限...");
			RecordApp.UniWebViewActivate(this); //App环境下必须先切换成当前页面WebView
			RecordApp.RequestPermission(()=>{
				this.reclog(this.currentKeyTag()+" 已获得录音权限，可以开始录音了",2);
			},(msg,isUserNotAllow)=>{
				if(isUserNotAllow){//用户拒绝了录音权限
					//这里你应当编写代码进行引导用户给录音权限，不同平台分别进行编写
				}
				this.reclog(this.currentKeyTag()+" "
					+(isUserNotAllow?"isUserNotAllow,":"")+"请求录音权限失败："+msg,1);
			});
		}
		,recStart(){
			this.$refs.player.setPlayBytes(null);
			this.takeEcChunks=[];
			
			this.reclog(this.currentKeyTag()+" 正在打开...");
			RecordApp.UniWebViewActivate(this); //App环境下必须先切换成当前页面WebView
			RecordApp.Start({
				type:this.recType
				,sampleRate:this.recSampleRate
				,bitRate:this.recBitRate
				
				,onProcess:(buffers,powerLevel,duration,sampleRate,newBufferIdx,asyncEnd)=>{
					if(buffers[newBufferIdx].length>=sampleRate/4)return;//测试注入的60秒数据，不显示动画
					
					//实时处理
					this.recpowerx=powerLevel;
					this.recpowert=this.formatTime(duration,1)+" / "+powerLevel;
					
					//可视化绘制要在renderjs中进行，必须手动到renderjs中执行，将pcm数据传送到renderjs
					RecordApp.UniWebViewVueCall(this,`
						if(this.waveView){
							this.waveView.input(new Int16Array(BigBytes),${powerLevel},${sampleRate});
						}
					`,buffers[buffers.length-1].buffer);
					
					//实时释放清理内存，用于支持长时间录音；在指定了有效的type时，编码器内部可能还会有其他缓冲，必须同时提供takeoffEncodeChunk才能清理内存，否则type需要提供unknown格式来阻止编码器内部缓冲，App的onProcess_renderjs中需要进行相同操作
					if(this.takeEcChunks){
						if(this.clearBufferIdx>newBufferIdx){ this.clearBufferIdx=0 } //重新录音了就重置
						for(var i=this.clearBufferIdx||0;i<newBufferIdx;i++) buffers[i]=null;
						this.clearBufferIdx=newBufferIdx;
					}
				}
				,onProcess_renderjs:`function(buffers,powerLevel,duration,sampleRate,newBufferIdx,asyncEnd){
					//此处代码不会执行，因为设置UniWithoutAppRenderjs后，录音操作均在逻辑层中
				}`
				
				,takeoffEncodeChunk:(chunkBytes)=>{
					this.takeEcChunks.push(chunkBytes);
				}
				,takeoffEncodeChunk_renderjs:`function(chunkBytes){
					//此处代码不会执行，因为设置UniWithoutAppRenderjs后，录音操作均在逻辑层中
				}`
			},()=>{
				this.reclog(this.currentKeyTag()+" 录制中："+this.recType
					+" "+this.recSampleRate+" "+this.recBitRate+"kbps",2);
				
				//创建音频可视化图形绘制，App环境下是在renderjs中绘制，H5、小程序等是在逻辑层中绘制，因此需要提供两段相同的代码（宽高值需要和canvas style的宽高一致）
				RecordApp.UniFindCanvas(this,[".recwave-WaveView"],`
					this.waveView=Recorder.WaveView({compatibleCanvas:canvas1, width:300, height:100});
				`,(canvas1)=>{
					this.waveView=Recorder.WaveView({compatibleCanvas:canvas1, width:300, height:100});
				});
			},(msg)=>{
				this.reclog(this.currentKeyTag()+" 开始录音失败："+msg,1);
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
		,recStop(){
			this.reclog("正在结束录音...");
			RecordApp.Stop((aBuf,duration,mime)=>{
				//全平台通用：aBuf是ArrayBuffer音频文件二进制数据，可以保存成文件或者发送给服务器
				//App中如果在Start参数中提供了stop_renderjs，renderjs中的函数会比这个函数先执行
				
				this.reclog("启用takeoffEncodeChunk后Stop返回的blob长度为0不提供音频数据");
				var len=0; for(var i=0;i<this.takeEcChunks.length;i++)len+=this.takeEcChunks[i].length;
				var chunkData=new Uint8Array(len);
				for(var i=0,idx=0;i<this.takeEcChunks.length;i++){
					var itm=this.takeEcChunks[i];
					chunkData.set(itm,idx);
					idx+=itm.length;
				};
				aBuf=chunkData.buffer;
				
				var recSet=(RecordApp.GetCurrentRecOrNull()||{set:{type:"mp3"}}).set;
				this.reclog("已录制["+mime+"]："+this.formatTime(duration,1)+" "+aBuf.byteLength+"字节 "
						+recSet.sampleRate+"hz "+recSet.bitRate+"kbps",2);
				
				//播放，部分格式会转码成wav播放
				this.$refs.player.useAppRenderjs=true; //在renderjs中播放
				this.$refs.player.setPlayBytes(aBuf,"",duration,mime,recSet,Recorder);
			},(msg)=>{
				this.reclog("结束录音失败："+msg,1);
			});
		}
		
		
		
		,reclog(msg,color,set){
			var now=new Date();
			var t=("0"+now.getHours()).substr(-2)
				+":"+("0"+now.getMinutes()).substr(-2)
				+":"+("0"+now.getSeconds()).substr(-2);
			var txt="["+t+"]"+msg;
			if(!set||!set.noLog)console.log(txt);
			this.reclogs.splice(0,0,{txt:txt,color:color});
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
		
		//注入60分钟数据，方便测试
		,recEnvIn60(){
			var rec=RecordApp.GetCurrentRecOrNull();
			if(!rec){
				this.reclog("未开始录音，无法注入",1);
				return;
			}
			if(this.eRec==rec) return;
			this.eRec=rec;
			var sampleRate=rec.srcSampleRate,t1=Date.now();
			var canon=this.canonPcm=this.canonPcm||Recorder.NMN2PCM.GetExamples().Canon.get(sampleRate).pcm;
			this.showMemoryUsage("1小时数据注入中... 当前");
			var len=sampleRate*60*60,size=0,offset=0, tn=0, t1=Date.now();
			var run=()=>{
				rec=RecordApp.GetCurrentRecOrNull();
				if(this.eRec!=rec){
					if(!rec) this.eRec=null;
					return;
				}
				var n=sampleRate;
				if(offset+n>canon.length)offset=0;
				size+=n;
				if(size<len){
					rec.envIn(canon.subarray(offset,offset+n),0);
					offset+=n;
					var delay=20; if(Date.now()-t1>RecordApp.UniIsApp()==2?3000:10000){ delay=300; t1=Date.now() }
					setTimeout(run, delay);
					if(size-tn>=sampleRate*60){
						tn=size;
						this.showMemoryUsage("已注入"+~~(size/sampleRate/60)+"分钟，当前");
					}
				}else{
					this.reclog("已按1秒间隔注入了1小时Canon简谱生成的音乐，耗时"+(Date.now()-t1)+"ms");
					this.eRec=null;
				}
			};
			run();
		}
		
		//显示内存占用
		,testShowMemoryUsage(){
			this.showMemoryUsage("");
		}
		,showMemoryUsage(msg){
			RecordApp.UniNativeUtsPluginCallAsync("debugInfo",{}).then((data)=>{
				var val=data.appMemoryUsage;
				if(val>0) val=(val/1024/1024).toFixed(2)+" MB";
				this.reclog(msg+"占用内存大小："+val+" (不一定准)");
			}).catch((e)=>{
				this.reclog(msg+"原生插件的debugInfo接口调用出错："+e.message,1);
			});
		}
		
	}
}
</script>




<!-- #ifdef APP -->
<script module="testMainVue" lang="renderjs">
/**============= App中在renderjs中引入RecordApp，这里只进行音频可视化，不需要录音和编码 =============**/
/** 先引入Recorder **/
import Recorder from 'recorder-core'; //注意如果未引用Recorder变量，可能编译时会被优化删除（如vue3 tree-shaking），请改成 import 'recorder-core'，或随便调用一下 Recorder.a=1 保证强引用

//可选引入可视化插件
import 'recorder-core/src/extensions/waveview.js'

/** 引入RecordApp **/
import RecordApp from 'recorder-core/src/app-support/app.js'
//【必须引入】uni-app支持文件
import '../../uni_modules/Recorder-UniCore/app-uni-support.js'

export default {
	mounted(){
		//App的renderjs必须调用的函数，传入当前模块this
		RecordApp.UniRenderjsRegister(this);
	},
	methods: {
		//这里定义的方法，在逻辑层中可通过 RecordApp.UniWebViewVueCall(this,'this.xxxFunc()') 直接调用
		//调用逻辑层的方法，请直接用 this.$ownerInstance.callMethod("xxxFunc",{args}) 调用，二进制数据需转成base64来传递
	}
}
</script>
<!-- #endif -->




<style>
.recwave{
	border:1px solid #ccc;
	height:100px;
	width:300px;
}
.recwave canvas{
	height:100px;
	width:300px;
}
</style>
