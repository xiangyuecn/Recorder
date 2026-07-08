<!-- uni-app内使用RecordApp录音
GitHub: https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/demo_UniApp
DCloud 插件市场下载组件: https://ext.dcloud.net.cn/plugin?name=Recorder-UniCore
-->

<template>
<view>
	<view style="padding:5px 10px 0">
		<view><text style="font-size:24px;color:#0b1">后台录音更稳：逻辑层编码UniWithoutAppRenderjs</text></view>
		<view style="font-size:13px">
			<view style="color:#f60">App环境下，设置RecordApp.UniWithoutAppRenderjs=true后，RecordApp完全运行在逻辑层，此时录音和音频编码之类的操作全部在逻辑层，在后台录音时不受renderjs的WebView运行受限的影响录音更稳定，但会影响逻辑层的性能（正常情况轻微不明显），需要提供UniNativeUtsPlugin配置由配套的原生插件进行录音，可视化绘制依旧可以在renderjs中进行。</view>
			<view style="color:#0b1">搭配了配套的原生插件，且需要在后台录音时，建议进行配置为true，可避免受renderjs的WebView在后台运行受限的影响，录音会更稳定。</view>
			<view>App中提升后台录音的稳定性：需要启用后台录音保活服务（iOS不需要，参考文档中的录音权限配置），Android 9开始，锁屏或进入后台一段时间后App可能会被禁止访问麦克风导致录音静音、无法录音（renderjs中H5录音也受影响），请调用配套原生插件的androidNotifyService接口，或使用第三方保活插件。</view>
		</view>
	</view>

	<!-- 录音格式选择 -->
	<view style="padding:10px 10px 0">
		类型：
		<checkbox @click="recType='mp3'" :checked="recType=='mp3'" data-type="mp3">mp3</checkbox>
		<checkbox @click="recType='pcm'" :checked="recType=='pcm'" data-type="pcm">pcm</checkbox>
	</view>
	<view style="padding:10px 10px 0">
		采样率：<input type="number" v-model.number="recSampleRate" style="width:60px;display:inline-block;border:1px solid #ddd"/>hz
		比特率：<input type="number" v-model.number="recBitRate" style="width:60px;display:inline-block;border:1px solid #ddd"/>kbps
	</view>
	<view style="padding:10px 10px 0">
		<checkbox @click="recShowWave=!recShowWave" :checked="recShowWave">显示波形</checkbox>
		<checkbox @click="recNoSave=!recNoSave" :checked="recNoSave">丢弃数据</checkbox>
		<checkbox @click="recClearBuffer=!recClearBuffer" :checked="recClearBuffer">释放内存</checkbox>
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
		<button size="mini" type="default" @click="recEnvIn60Cancel">停止注入</button>
	</view>
	<view style="padding:5px 10px 0">
		<button size="mini" type="default" @click="testShowMemoryUsage" style="padding:0 5px">显示内存占用</button>
		<button size="mini" type="default" @click="testMemUse" style="padding:0 5px;margin-left:10px">占用100M内存</button>
		<button size="mini" type="default" @click="testMemUseClear" style="padding:0 5px">解除占用</button>
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
import 'recorder-core/src/engine/pcm.js'

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
			
			,recShowWave:true ,recClearBuffer:true ,recNoSave:false
			
			,recpowerx:0
			,recpowert:""
			,reclogs:[]
		}
	},
	mounted() {
		RecordApp.Current=null;
		RecordApp.UniWithoutAppRenderjs=true; //逻辑层进行录音和音频编码，需要原生录音插件支持【实际用时建议放到import后面】
		RecordApp.UniNativeUtsPlugin={nativePlugin:true}; //启用原生插件配置【实际用时建议放到import后面】
		
		this.reclog("页面mounted");
		this.isMounted=true; this.uniPage__onShow(); //onShow可能比mounted先执行，页面准备好了时再执行一次
	},
	/*#ifdef VUE3*/unmounted()/*#endif*/ /*#ifndef VUE3*/destroyed()/*#endif*/ {
		var tag=/*#ifdef VUE3*/"unmounted"/*#endif*/ /*#ifndef VUE3*/"destroyed"/*#endif*/;
		//清理资源，如果打开了录音没有关闭，这里将会进行关闭
		RecordApp.Stop(null,()=>{
			RecordApp.Current=null; //恢复环境，测试用的
			RecordApp.UniWithoutAppRenderjs=false; //恢复环境，测试用的
			console.log(tag+" 已恢复环境");
		});
	},
	onShow() { //当组件用时没这个回调
		if(this.isMounted) this.uniPage__onShow(); //onShow可能比mounted先执行，页面可能还未准备好
		this.testCheckLog("onShow"); this.isHide=false;
	},
	onHide(){
		this.testCheckLog("onHide"); this.isHide=true;
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
			/****【在App内使用app-uni-support.js的授权许可】编译到App平台时仅供测试用（App平台包括：Android App、iOS App、鸿蒙App），不可用于正式发布或商用，正式发布或商用需先联系作者获得授权许可（编译到其他平台时无此授权限制，比如：H5、小程序，均为免费授权）
			获得授权许可后，请解开下面这行注释，并且将**部分改成你的uniapp项目的appid，即可解除所有限制；使用配套的原生录音插件或uts插件时可不进行此配置
			****/
			//RecordApp.UniAppUseLicense='我已获得UniAppID=*****的商用授权';
			
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
				if(!RecordApp.UniNativeUtsPlugin){
					this.reclog("请在项目manifest.json原生插件配置中勾选云端插件（先到插件市场 https://ext.dcloud.net.cn/plugin?name=Recorder-NativePlugin 点试用，试用无任何限制），然后打包自定义基座后再测试（暂不支持鸿蒙）","#fa0");
				}
			});
		}
		,recStart(){
			this.$refs.player.setPlayBytes(null);
			this.takeEcChunks=[]; this.takeEcSize=0;
			this.testCheckStart=Date.now(); this.testCheckLast=0; this.testCheckDur=0; this.testCheckMem=0;
			this.watchDogTimer=0; this.wdtPauseT=0; var processTime=0;
			
			this.tryStart_androidNotifyService(); //Android App+原生插件环境下，如需后台或锁屏录音，就必须启用后台录音保活服务（iOS不需要），Android 9开始，锁屏或进入后台一段时间后App可能会被禁止访问麦克风导致录音静音、无法录音（renderjs中H5录音、原生插件录音均受影响），因此需要调用原生插件的`androidNotifyService`接口保活，或使用第三方保活插件
			
			this.reclog(this.currentKeyTag()+" 正在打开...");
			//var prevChunk=null; //提供一个变量，在onProcess中实时提取得到pcm数据，注意开始新的转换时需要重置为null
			
			RecordApp.UniWebViewActivate(this); //App环境下必须先切换成当前页面WebView
			RecordApp.Start({
				type:this.recType
				,sampleRate:this.recSampleRate
				,bitRate:this.recBitRate
				
				,onProcess:(buffers,powerLevel,duration,sampleRate,newBufferIdx,asyncEnd)=>{
					//全平台通用：可实时上传（发送）数据，配合Recorder.SampleData方法，将buffers中的新数据连续的转换成pcm上传，或使用mock方法将新数据连续的转码成其他格式上传，可以参考Recorder文档里面的：Demo片段列表 -> 实时转码并上传-通用版；基于本功能可以做到：实时转发数据、实时保存数据、实时语音识别（ASR）等
					//prevChunk=Recorder.SampleData(buffers,sampleRate,16000,prevChunk); //buffers的采样率不是固定的，要明确转换成需要的采样率
					//var newPCM=prevChunk.data; //这个就是最新的pcm数据Int16Array，可以发送、保存等，参考下面takeoffEncodeChunk配置一样实时写入文件
					
					//可以同时得到mp3+pcm两种格式：takeoffEncodeChunk实时保存mp3、onProcess实时保存pcm
					
					if(buffers[newBufferIdx].length>=sampleRate/4 && this.eRec)return;//测试注入的60秒数据，不显示动画
					
					//实时处理
					this.recpowerx=powerLevel;
					this.recpowert=this.formatTime(duration,1)+" / "+powerLevel;
					this.testCheckDur=duration;
					this.testCheckLog();
					processTime=Date.now();
					
					//可视化绘制要在renderjs中进行，必须手动到renderjs中执行，将pcm数据传送到renderjs
					if(!this.isHide){ //此处应当判断一下，如果app不在前台(onHide)，就不传送数据，否则WebView切换到前台恢复运行时可能收到大量积压的数据导致app崩溃
						if(this.recShowWave){
							RecordApp.UniWebViewVueCall(this,`
								if(this.waveView){
									this.waveView.input(new Int16Array(BigBytes),${powerLevel},${sampleRate});
								}
							`,buffers[buffers.length-1].buffer);
						};
					};
					
					//实时释放清理内存，用于支持长时间录音；在指定了有效的type时，编码器内部可能还会有其他缓冲，必须同时提供takeoffEncodeChunk才能清理内存，否则type需要提供unknown格式来阻止编码器内部缓冲，App的onProcess_renderjs中需要进行相同操作
					if(this.recClearBuffer){
						if(this.clearBufferIdx>newBufferIdx){ this.clearBufferIdx=0 } //重新录音了就重置
						for(var i=this.clearBufferIdx||0;i<newBufferIdx;i++) buffers[i]=null;
						this.clearBufferIdx=newBufferIdx;
					}
				}
				,onProcess_renderjs:`function(buffers,powerLevel,duration,sampleRate,newBufferIdx,asyncEnd){
					//此处代码不会执行，因为设置UniWithoutAppRenderjs后，录音操作均在逻辑层中
				}`
				
				,takeoffEncodeChunk:(chunkBytes)=>{
					//全平台通用：实时接收到编码器编码出来的音频片段数据，chunkBytes是Uint8Array二进制数据，可以实时上传（发送）出去
					//App中如果未配置RecordApp.UniWithoutAppRenderjs时，建议提供此回调，因为录音结束后会将整个录音文件从renderjs传回逻辑层，由于uni-app的逻辑层和renderjs层数据交互性能实在太拉跨了，大点的文件传输会比较慢，提供此回调后可避免Stop时产生超大数据回传
					if(!this.recNoSave){
						this.takeEcChunks.push(chunkBytes);
						this.takeEcSize+=chunkBytes.length;
					};
					
					//App中使用原生插件时，可方便的将数据实时保存到同一文件，第一帧时append:false新建文件，后面的append:true追加到文件
					//参考demo中的 test_native_plugin.vue 的 realtimeWritePcm2Wav 方法，有用到实时写入pcm数据，并在结束时在文件开头写入wav头，即可生成wav文件，mp3没有文件头直接append即可
					//RecordApp.UniNativeUtsPluginCallAsync("writeFile",{path:"xxx.mp3",append:回调次数!=1, dataBase64:RecordApp.UniBtoa(chunkBytes.buffer)}).then(...).catch(...)
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
				this.reclog(this.currentKeyTag()+" 开始录音失败："+msg,1);
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
		,recStop(){
			this.tryClose_androidNotifyService(); //关闭后台录音保活服务
			this.watchDogTimer=0; //停止监控onProcess超时
			
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
				this.$refs.player.parentPage=this;
				this.$refs.player.setPlayBytes(aBuf,"",duration,mime,recSet,Recorder);
			},(msg)=>{
				this.reclog("结束录音失败："+msg,1);
			});
		}
		
		
		//Android App启用后台录音保活服务，需要原生插件支持，注意必须RecordApp.RequestPermission得到权限后调用
		,tryStart_androidNotifyService(){
			if(RecordApp.UniIsApp() && !this._tips_anfs){ this._tips_anfs=1;
				this.reclog("App中提升后台录音的稳定性：需要启用后台录音保活服务（iOS不需要），Android 9开始，锁屏或进入后台一段时间后App可能会被禁止访问麦克风导致录音静音、无法录音（App中H5录音也受影响），需要原生层提供搭配常驻通知的Android后台录音保活服务（Foreground services）；可调用配套原生插件的androidNotifyService接口，或使用第三方保活插件","#4face6");
			}
			if(RecordApp.UniIsApp()!=1) return; //非Android App不处理
			if(!RecordApp.UniNativeUtsPlugin) return; //未使用原生插件
			
			this._NotifyService=false;
			RecordApp.UniNativeUtsPluginCallAsync("androidNotifyService",{
				title:"正在录音"
				,content:"正在录音中，请勿关闭App运行"
			}).then((data)=>{
				this._NotifyService=true;
				var nCode=data.notifyPermissionCode, nMsg=data.notifyPermissionMsg;
				this.reclog("搭配常驻通知的Android后台录音保活服务已打开，ForegroundService已运行(通知可能不显示或会延迟显示，并不影响服务运行)，通知显示状态(1有通知权限 3可能无权限)code="+nCode+" msg="+nMsg,2);
			}).catch((e)=>{
				this.reclog("原生插件的androidNotifyService接口调用出错："+e.message,1);
				this.reclog("如果你已集成了配套的原生录音插件，并且是打包自定义基座运行，请检查本项目根目录的AndroidManifest.xml里面是否已经解开了注释，否则被注释掉的service不会包含在App中",1);
			});
		}
		,tryClose_androidNotifyService(){
			if(!this._NotifyService) return;   this._NotifyService=false;
			RecordApp.UniNativeUtsPluginCallAsync("androidNotifyService",{
				close:true
			}).then(()=>{
				this.reclog("已关闭搭配常驻通知的Android后台录音保活服务");
			}).catch((e)=>{
				this.reclog("原生插件的androidNotifyService接口调用出错："+e.message,1);
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
					var delay=20; if(Date.now()-t1>(RecordApp.UniIsApp()==2?3000:10000)){ delay=300; t1=Date.now() }
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
		,recEnvIn60Cancel(){
			if(this.eRec){
				this.reclog("已停止注入");
				this.eRec=null;
			}else{
				this.reclog("未开始注入",1);
			}
		}
		
		//检查录音时间和内存占用，显示日志
		,testCheckLog(nowMsg){
			var now=Date.now();
			if(!nowMsg && now-this.testCheckLast<60*1000-100) return; //1分钟输出一次
			this.testCheckLast=now;
			
			var startDur=this.testCheckStart? now-this.testCheckStart : 0, recDur=this.testCheckDur||0;
			this.showMemoryUsage("",(mem)=>{
				if(!this.testCheckMem) this.testCheckMem=mem;
				
				this.reclog((nowMsg||"Check")
					+" | "+this.formatTime(startDur,1)
					+" | "+this.formatTime(recDur,1)
					+" | "+((this.takeEcSize||0)/1024/1024).toFixed(2)+"MB/"+(this.takeEcChunks&&this.takeEcChunks.length||0)
					+" | "+(this.testCheckMem/1024/1024).toFixed(2)
					+" "+(mem<this.testCheckMem?'':'+')+((mem-this.testCheckMem)/1024/1024).toFixed(2)
					+" ="+(mem/1024/1024).toFixed(2)+"MB"
				);
			});
		}
		
		//手动占用内存，测试逻辑层的内存占用和释放是否正常
		,testMemUse(){
			var store=RecordApp.__testMemUse=RecordApp.__testMemUse||{list:[],size:0};
			var arr=new Uint8Array(100*1024*1024);
			for(var i=0,L=arr.length;i<L;i++) arr[i]=i;
			store.list.push(arr); store.size+=arr.length;
			setTimeout(()=>{
				this.testCheckLog("已占用"+(store.size/1024/1024).toFixed(2)+"MB内存");
			}, 1000);
		}
		,testMemUseClear(){
			var store=RecordApp.__testMemUse||{}; store.size=0;
			if(store.list){ //模拟Recorder的buffers释放
				for(var i=0;i<store.list.length;i++) store.list[i]=null;
			}
			setTimeout(()=>{ this.testCheckLog("已解除占用"); }, 1000);
		}
		
		//显示内存占用
		,testShowMemoryUsage(){
			this.testCheckLog("Memory");
			this.showMemoryUsage("");
		}
		,showMemoryUsage(msg,call){
			RecordApp.UniNativeUtsPluginCallAsync("debugInfo",{}).then((data)=>{
				var mem=data.appMemoryUsage, val=mem;
				if(val>0) val=(mem/1024/1024).toFixed(2)+" MB"; else mem=0;
				this.memLast=mem;
				if(call){ call(mem) }else this.reclog(msg+"占用内存大小："+val+" (不一定准)");
			}).catch((e)=>{
				if(call){ call(0) }else this.reclog(msg+"原生插件的debugInfo接口调用出错："+e.message,1);
			});
		}
		
	}
}
</script>




<!-- #ifdef APP -->
<script module="recModule" lang="renderjs"> //此模块内部只能用选项式API风格，vue2、vue3均可用，请照抄这段代码；不可改成setup组合式API风格，否则可能不能import vue导致编译失败
/**需要编译成App时，你需要添加一个renderjs模块，然后一模一样的import上面那些js（微信的js除外）
	，因为App中默认是在renderjs（WebView）中进行录音和音频编码
	。如果配置了 RecordApp.UniWithoutAppRenderjs=true 且未调用依赖renderjs的功能时（如nvue、可视化、仅H5中可用的插件）
	，可不提供此renderjs模块，同时逻辑层中需要将相关import的条件编译去掉**/

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
