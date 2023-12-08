<!-- uni-app内使用RecordApp录音
GitHub: https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/demo_UniApp
DCloud 插件市场下载组件: https://ext.dcloud.net.cn/plugin?name=Recorder-UniCore
-->

<template>
<view>
	<view style="padding:5px 10px 0">
		<text style="vertical-align: top;"></text>
		
		<navigator :url="pageNewPath" style="display: inline;">
			<button size="mini" type="default">新开页面({{pageDeep}})</button>
		</navigator>
		
		<navigator url="page_i18n" style="display: inline;">
			<button size="mini" type="default">国际化多语言</button>
		</navigator>
		
		<navigator url="page_asr" style="display: inline;">
			<button size="mini" type="default">asr语音识别</button>
		</navigator>
		
<!-- #ifdef APP || H5 -->
		<navigator url="page_nvue" style="display: inline;">
			<button size="mini" type="default">nvue原生页面</button>
		</navigator>
		<navigator url="page_renderjsOnly" style="display: inline;">
			<button size="mini" type="default">纯renderjs调用</button>
		</navigator>
<!-- #endif -->
		
		<button size="mini" type="default" @click="reloadPage">刷新当前页</button>
	</view>
	<view style="margin-top:5px;height:10px;background:#eee"></view>
	
	<!-- 录音格式选择 -->
	<view style="padding:10px 10px 0">
		类型：
		<checkbox @click="recTypeClick" :checked="recType=='mp3'" data-type="mp3">mp3</checkbox>
		<checkbox @click="recTypeClick" :checked="recType=='wav'" data-type="wav">wav</checkbox>
		<checkbox @click="recTypeClick" :checked="recType=='pcm'" data-type="pcm">pcm</checkbox>
		<checkbox @click="recTypeClick" :checked="recType=='amr'" data-type="amr">amr</checkbox>
		<checkbox @click="recTypeClick" :checked="recType=='g711a'" data-type="g711a">g711a</checkbox>
		<checkbox @click="recTypeClick" :checked="recType=='g711u'" data-type="g711u">g711u</checkbox>
		<checkbox @click="recTypeClick" :checked="recType=='ogg'" data-type="ogg" :disabled="disableOgg">ogg{{disableOgg?'(js太大)':''}}</checkbox>
	</view>
	<view style="padding:10px 10px 0">
		采样率：<input type="number" v-model.number="recSampleRate" style="width:60px;display:inline-block;border:1px solid #ddd"/>hz
		比特率：<input type="number" v-model.number="recBitRate" style="width:60px;display:inline-block;border:1px solid #ddd"/>kbps
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
		<button size="mini" type="default" @click="recStopX" style="padding:0 5px;margin-left:10px">停止(仅清理)</button>
		<button size="mini" type="default" @click="recEnvIn60" style="padding:0 5px">注入60秒数据</button>
	</view>
	
	<!-- 可视化绘制 -->
	<view style="padding:5px 0 0 10px">
		<view style="height:40px;width:300px;background:#999;position:relative;">
			<view style="height:40px;background:#0B1;position:absolute;" :style="{width:recpowerx+'%'}"></view>
			<view style="padding-left:50px; line-height:40px; position: relative;">{{recpowert}}</view>
		</view>
		
		<!-- 不同的波形样式，只需创建需要用到的canvas就行，canvas需要指定宽高（下面style里指定了300*100） -->
		<view style="padding-top:5px"></view>
		<view>
			<view class="recwave" :style="{display:recwaveChoiceKey!='WaveView'?'none':''}">
				<canvas type="2d" class="recwave-WaveView"></canvas>
			</view>
			<view class="recwave" :style="{display:recwaveChoiceKey!='SurferView'?'none':''}">
				<canvas type="2d" class="recwave-SurferView"></canvas>
				<canvas type="2d" class="recwave-SurferView-2x" style="width:600px;display:none"></canvas>
			</view>
			<view class="recwave" :style="{display:recwaveChoiceKey!='Histogram1'?'none':''}">
				<canvas type="2d" class="recwave-Histogram1"></canvas>
			</view>
			<view class="recwave" :style="{display:recwaveChoiceKey!='Histogram2'?'none':''}">
				<canvas type="2d" class="recwave-Histogram2"></canvas>
			</view>
			<view class="recwave" :style="{display:recwaveChoiceKey!='Histogram3'?'none':''}">
				<canvas type="2d" class="recwave-Histogram3"></canvas>
			</view>
		</view>

		<view style="padding-top:5px" @click="recwaveChoice">
			<view class="recwaveChoice" :class="recwaveChoiceKey=='WaveView'?'slc':''" data-key="WaveView">WaveView</view>
			<view class="recwaveChoice" :class="recwaveChoiceKey=='SurferView'?'slc':''" data-key="SurferView">SurferView</view>
			<view class="recwaveChoice" :class="recwaveChoiceKey=='Histogram1'?'slc':''" data-key="Histogram1">Histogram1</view>
			<view class="recwaveChoice" :class="recwaveChoiceKey=='Histogram2'?'slc':''" data-key="Histogram2">H...2</view>
			<view class="recwaveChoice" :class="recwaveChoiceKey=='Histogram3'?'slc':''" data-key="Histogram3">H...3</view>
		</view>
	</view>
	
	<view style="padding:5px 10px 0">
		<view><checkbox :checked="takeoffEncodeChunkSet" @click="takeoffEncodeChunkSet=!takeoffEncodeChunkSet">接管编码器输出（takeoffEncodeChunk，App端推荐开启）</checkbox> {{takeoffEncodeChunkMsg}}</view>
		<view><checkbox :checked="appUseH5Rec" @click="appUseH5RecClick">App里面总是使用Recorder H5录音（勾选后不启用原生录音插件和uts插件）</checkbox></view>
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
	<view style="padding-top:80px"></view>
	
	<!-- 更多功能按钮 -->
	<view style="padding:10px 10px">
		<button size="mini" type="default" @click="loadVConsole">显示vConsole</button>
	</view>
	
	<!-- 文档地址提示 -->
	<view style="height:10px;background:#eee"></view>
	<view style="padding:10px 10px">
		<view style="padding-bottom: 10px;color:#02a2ff;word-break:break-all;">
			<view style="padding-bottom:10px">DCloud 插件市场下载本组件: https://ext.dcloud.net.cn/plugin?name=Recorder-UniCore</view>
			<view>RecordApp的uni-app支持文档和示例: https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/demo_UniApp (github可以换成gitee)</view>
		</view>
		<view style="color:#0ab;font-size:22px;font-weight:bold">
			如需录音功能定制开发，网站、App、小程序、前端后端开发等需求，请加QQ群：①群 781036591、②群 748359095，口令recorder，联系群主（即作者），谢谢~
		</view>
	</view>
	
	<!-- 组件说明 -->
	<view style="margin-bottom:5px;height:10px;background:#eee"></view>
	<view style="padding:0 10px">
		<view style="font-size:17px;font-weight: bold;color:#f60">关于Recorder-UniCore组件中的 app-uni-support.js 支持文件</view>
		
		<view style="font-size:14px;padding-top:10px">
			<view>Recorder-UniCore组件中给RecordApp提供uni-app适配的代码在app-uni-support.js文件内，此文件为压缩版（功能和源码版一致），如果已获得商用授权、或者付费购买了配套的原生录音插件或uts插件后，可在VIP支持QQ群的群文件中下载到此js文件最新源码。</view>
			<view style="color:#f60">app-uni-support.js文件在uni-app中编译到App平台时仅供测试用（App平台包括：Android App、iOS App），<text style="font-weight: bold">不可用于正式发布或商用，正式发布或商用需先联系作者获得授权许可</text>（如何获取授权请阅读Recorder-UniCore组件文档）。</view>
			<view style="color:#0b0">编译到其他平台时无此授权限制，比如：H5、小程序，均为免费授权。</view>
		</view>
	</view>
	
<!-- #ifdef APP || H5 -->
	<!-- Eval执行代码，方便调试 -->
	<view style="padding-top:80px"></view>
	<view style="height:10px;background:#eee"></view>
	<view style="padding:10px 10px">
		<view>
			<text style="font-size:17px;font-weight: bold;color:#f60">在逻辑层中执行代码</text>
			<button size="mini" type="default" @click="evalExecClick">执行</button>
		</view>
		<textarea v-model="evalExecCode" maxlength="-1" style="display:block;border:1px solid #ddd;box-sizing:border-box;width:100%;" placeholder="this为当前页面或组件的this"></textarea>
	</view>
<!-- #endif -->
	
</view>
</template>


<script>
import TestPlayer from './test_player___.vue'; //手撸的一个跨平台播放器


/** 先引入Recorder （ 需先 npm install recorder-core ）**/
import Recorder from 'recorder-core';

/** H5、小程序环境中：引入需要的格式编码器、可视化插件，App环境中在renderjs中引入 **/
// #ifdef H5 || MP-WEIXIN
	//按需引入需要的录音格式编码器，用不到的不需要引入，减少程序体积；H5、renderjs中可以把编码器放到static文件夹里面用动态创建script来引入，免得这些文件太大
	import 'recorder-core/src/engine/mp3.js'
	import 'recorder-core/src/engine/mp3-engine.js'
	import 'recorder-core/src/engine/wav.js'
	import 'recorder-core/src/engine/pcm.js'
	import 'recorder-core/src/engine/g711x'

	//可选引入可视化插件
	import 'recorder-core/src/extensions/waveview.js'
	import 'recorder-core/src/extensions/wavesurfer.view.js'

	import 'recorder-core/src/extensions/frequency.histogram.view.js'
	import 'recorder-core/src/extensions/lib.fft.js'
	
	//测试用根据简谱生成一段音乐
	import 'recorder-core/src/extensions/create-audio.nmn2pcm.js'
// #endif

/** 引入RecordApp **/
import RecordApp from 'recorder-core/src/app-support/app.js'
//【所有平台必须引入】uni-app支持文件
import '../../uni_modules/Recorder-UniCore/app-uni-support.js'

var disableOgg=false;
// #ifdef MP-WEIXIN
	//可选引入微信小程序支持文件
	import 'recorder-core/src/app-support/app-miniProgram-wx-support.js'
	disableOgg=true; //小程序不测试ogg js文件太大
// #endif


// #ifdef H5 || MP-WEIXIN
	//H5、renderjs中可以把编码器放到static文件夹里面用动态创建script来引入，免得这些文件太大
	import 'recorder-core/src/engine/beta-amr'
	import 'recorder-core/src/engine/beta-amr-engine'
// #endif
// #ifdef H5
	//app、h5测试ogg，小程序不测试ogg js文件太大
	import 'recorder-core/src/engine/beta-ogg'
	import 'recorder-core/src/engine/beta-ogg-engine'
// #endif


/** 可选：App中引入原生录音插件来进行录音，兼容性和体验更好 **/
var RecNativePlugin=null;
// #ifdef APP
	var RecUtsPlugin=null; //【使用uts插件时先删除这句再解开下一句的注释】
	// import * as RecUtsPlugin from "../../uni_modules/Recorder-UtsPlugin" 【uts插件开发中，暂不支持解开这行注释】
	// var RecNativePlugin={nativePlugin:true}; //使用原生录音插件就解开这个注释，跟uts插件二选一
// #endif
// #ifndef APP
	var RecUtsPlugin=null; //非App，给个变量
// #endif


export default {
	components: { TestPlayer },
	data() {
		return {
			recType:"mp3"
			,recSampleRate:16000
			,recBitRate:16
			
			,takeoffEncodeChunkSet:false
			,takeoffEncodeChunkMsg:""
			,appUseH5Rec:false
	
			,recwaveChoiceKey:"WaveView"
			,recpowerx:0
			,recpowert:""
			,pageDeep:0,pageNewPath:"main_recTest"
			,disableOgg:disableOgg
			,evalExecCode:""
			,reclogs:[]
		}
	},
	mounted() {
		var vueVer=[];
		var vv=typeof(Vue)!="undefined" && Vue && Vue.version; if(vv) vueVer.push("Vue.version:"+vv);
		var v3=(((this.$||{}).appContext||{}).app||{}).version; if(v3) vueVer.push("appContext.app.version:"+v3);
		var v2=(((this.$root||{}).constructor||{}).super||{}).version; if(v2) vueVer.push("constructor.super:"+v2);
		this.reclog("页面mounted("+getCurrentPages().length+"层)"
			+"，Vue="+vueVer.join("/")
			+"，WebViewId="+(this.$root.$page&&this.$root.$page.id||"?")
			+"，ComponentId=_$id:"+(this._$id||"?")+"/"+"$.uid:"+(this.$&&this.$.uid||"?")
			+"，Recorder.LM="+Recorder.LM
			+"，RecordApp.LM="+RecordApp.LM
			+"，UniSupportLM="+RecordApp.UniSupportLM
			+"，UniJsSource="+RecordApp.UniJsSource.IsSource);
		this.pageDeep=getCurrentPages().length;
		this.pageNewPath=/main_recTest/.test(this.getRouteStr())?"page_index2":"main_recTest";
		
		this.isMounted=true; this.uniPage__onShow(); //onShow可能比mounted先执行，页面准备好了时再执行一次
		
		//可选，立即显示出环境信息
		this.reclog("正在执行Install，请勿操作...","#f60");
		RecordApp.UniNativeUtsPlugin=RecNativePlugin||RecUtsPlugin; //提取设置一下，仅用于打日志
		RecordApp.Install(()=>{
			this.reclog("Install成功，环境："+this.currentKeyTag(),2);
			this.reclog("请先请求录音权限，然后再开始录音");
		},(err)=>{
			this.reclog("RecordApp.Install出错："+err,1);
		});
	},
	/*#ifdef VUE3*/unmounted()/*#endif*/ /*#ifndef VUE3*/destroyed()/*#endif*/ {
		RecordApp.Stop(); //清理资源，如果打开了录音没有关闭，这里将会进行关闭
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
			//默认尝试启用原生录音插件支持，可以判断一下只在iOS上或Android上启用，不判断就都启用，比如判断iOS：RecordApp.UniIsApp()==2
			RecordApp.UniNativeUtsPlugin=RecNativePlugin||RecUtsPlugin;
			
			if(this.appUseH5Rec){//明确使用h5录音
				RecordApp.UniNativeUtsPlugin=null;
			}
			
			/****【在App内使用app-uni-support.js的授权许可】编译到App平台时仅供测试用（App平台包括：Android App、iOS App），不可用于正式发布或商用，正式发布或商用需先联系作者获得授权许可（编译到其他平台时无此授权限制，比如：H5、小程序，均为免费授权）
			获得授权许可后，请解开下面这行注释，并且将**部分改成你的uniapp项目的appid，即可解除所有限制；使用配套的原生录音插件或uts插件时可不进行此配置
			****/
			//RecordApp.UniAppUseLicense='我已获得UniAppID=*****的商用授权';
			
			//使用renderjs时提示一下iOS有弹框
			if(RecordApp.UniIsApp() && !RecordApp.UniNativeUtsPlugin){
				this.reclog("当前是在App的renderjs中使用H5进行录音，iOS上只支持14.3以上版本，且iOS上每次进入页面后第一次请求录音权限时、或长时间无操作再请求录音权限时WebView均会弹出录音权限对话框，不同旧iOS版本（低于iOS17）下H5录音可能存在的问题在App中同样会存在；使用配套的原生录音插件或uts插件时无以上问题和版本限制，Android也无以上问题","#f60");
			}
			
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
			this.takeoffEncodeChunkMsg="";var takeEcCount=0,takeEcSize=0;
			this.takeEcChunks=this.takeoffEncodeChunkSet?[]:null;
			
			this.reclog(this.currentKeyTag()+" 正在打开...");
			RecordApp.UniWebViewActivate(this); //App环境下必须先切换成当前页面WebView
			RecordApp.Start({
				type:this.recType
				,sampleRate:this.recSampleRate
				,bitRate:this.recBitRate
				
				,onProcess:(buffers,powerLevel,duration,sampleRate,newBufferIdx,asyncEnd)=>{
					//全平台通用：可实时上传（发送）数据，配合Recorder.SampleData方法，将buffers中的新数据连续的转换成pcm上传，或使用mock方法将新数据连续的转码成其他格式上传，可以参考Recorder文档里面的：Demo片段列表 -> 实时转码并上传-通用版；基于本功能可以做到：实时转发数据、实时保存数据、实时语音识别（ASR）等
					
					//注意：App里面是在renderjs中进行实际的音频格式编码操作，此处的buffers数据是renderjs实时转发过来的，修改此处的buffers数据不会改变renderjs中buffers，所以不会改变生成的音频文件，可在onProcess_renderjs中进行修改操作就没有此问题了；如需清理buffers内存，此处和onProcess_renderjs中均需要进行清理，H5、小程序中无此限制
					//注意：如果你要用只支持在浏览器中使用的Recorder扩展插件，App里面请在renderjs中引入此扩展插件，然后在onProcess_renderjs中调用这个插件；H5可直接在这里进行调用，小程序不支持这类插件；如果调用插件的逻辑比较复杂，建议封装成js文件，这样逻辑层、renderjs中直接import，不需要重复编写
					
					this.recpowerx=powerLevel;
					this.recpowert=this.formatTime(duration,1)+" / "+powerLevel;
					
					//H5、小程序等可视化图形绘制，直接运行在逻辑层；App里面需要在onProcess_renderjs中进行这些操作
					// #ifdef H5 || MP-WEIXIN
					var wave=this.waveStore&&this.waveStore[this.recwaveChoiceKey];
					if(wave){
						wave.input(buffers[buffers.length-1],powerLevel,sampleRate);
					}
					// #endif
				}
				,onProcess_renderjs:`function(buffers,powerLevel,duration,sampleRate,newBufferIdx,asyncEnd){
					//App中在这里修改buffers才会改变生成的音频文件
					//App中是在renderjs中进行的可视化图形绘制，因此需要写在这里，this是renderjs模块的this（也可以用This变量）；如果代码比较复杂，请直接在renderjs的methods里面放个方法xxxFunc，这里直接使用this.xxxFunc(args)进行调用
					var wave=this.waveStore&&this.waveStore[this.recwaveChoiceKey];
					if(wave){
						wave.input(buffers[buffers.length-1],powerLevel,sampleRate);
					}
				}`
				
				,takeoffEncodeChunk:!this.takeoffEncodeChunkSet?null:(chunkBytes)=>{
					//全平台通用：实时接收到编码器编码出来的音频片段数据，chunkBytes是Uint8Array二进制数据，可以实时上传（发送）出去
					//App中如果未配置Recorder.UniWithoutAppRenderjs时，建议提供此回调，因为录音结束后会将整个录音文件从renderjs传回逻辑层，由于uni-app的逻辑层和renderjs层数据交互性能实在太拉跨了，大点的文件传输会比较慢，提供此回调后可避免Stop时产生超大数据回传
					takeEcCount++; takeEcSize+=chunkBytes.byteLength;
					this.takeoffEncodeChunkMsg="已接收到"+takeEcCount+"块，共"+takeEcSize+"字节";
					this.takeEcChunks.push(chunkBytes);
				}
				,takeoffEncodeChunk_renderjs:!this.takeoffEncodeChunkSet?null:`function(chunkBytes){
					//App中这里可以做一些仅在renderjs中才生效的事情，不提供也行，this是renderjs模块的this（也可以用This变量）
				}`
				
				,start_renderjs:`function(){
					//App中可以放一个函数，在Start成功时renderjs中会先调用这里的代码，this是renderjs模块的this（也可以用This变量）
					//放一些仅在renderjs中才生效的事情，比如初始化，不提供也行
				}`
				,stop_renderjs:`function(aBuf,duration,mime){
					//App中可以放一个函数，在Stop成功时renderjs中会先调用这里的代码，this是renderjs模块的this（也可以用This变量）
					this.audioData=aBuf; //留着给Stop时进行转码成wav播放
				}`
			},()=>{
				this.reclog(this.currentKeyTag()+" 录制中："+this.recType
					+" "+this.recSampleRate+" "+this.recBitRate+"kbps"
					+(this.takeoffEncodeChunkSet?" takeoffEncodeChunk":"")
					+(this.appUseH5Rec?" appUseH5Rec":""),2);
				//创建音频可视化图形绘制
				this.initWaveStore();
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
				//全平台通用：aBuf是ArrayBuffer音频文件二进制数据，可以保存成文件或者发送给服务器
				//App中如果在Start参数中提供了stop_renderjs，renderjs中的函数会比这个函数先执行
				
				var recSet=(RecordApp.GetCurrentRecOrNull()||{set:{type:this.recType}}).set;
				this.reclog("已录制["+mime+"]："+this.formatTime(duration,1)+" "+aBuf.byteLength+"字节 "
						+recSet.sampleRate+"hz "+recSet.bitRate+"kbps",2);
				
				var aBuf_renderjs="this.audioData";
				if(this.takeEcChunks){
					aBuf_renderjs=""; //renderjs的数据是空的
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
				
				//播放，部分格式会转码成wav播放
				this.$refs.player.setPlayBytes(aBuf,aBuf_renderjs,duration,mime,recSet,Recorder);
			},(msg)=>{
				this.reclog("结束录音失败："+msg,1);
			});
		}
		
		
		
		,reclog(msg,color){
			var now=new Date();
			var t=("0"+now.getHours()).substr(-2)
				+":"+("0"+now.getMinutes()).substr(-2)
				+":"+("0"+now.getSeconds()).substr(-2);
			var txt="["+t+"]"+msg;
			console.log(txt);
			this.reclogs.splice(0,0,{txt:txt,color:color});
		}
		,recTypeClick(e){
			var type=e.target.dataset.type;
			if(type){
				this.recType=type;
			}
		}
		,appUseH5RecClick(){
			this.appUseH5Rec=!this.appUseH5Rec;
			RecordApp.Current=null;
			this.reclog('切换了appUseH5Rec='+this.appUseH5Rec+'，重新请求录音权限后生效',"#f60");
		}
		
		// 可视化波形，这里是一次性创建多个波形，可以参考page_i18n.vue只创建一个波形会简单一点
		,initWaveStore(){
			if(this.waveStore)return;
			var store=this.waveStore=this.waveStore||{};
			var webStore=`var store=this.waveStore=this.waveStore||{};`;//在renderjs中执行，this是renderjs模块的this
			webStore+=`this.recwaveChoiceKey="${this.recwaveChoiceKey}";`;//把当前选中的波形也传过去
			
			//App环境下是在renderjs中绘制，H5、小程序等是在逻辑层中绘制，因此需要提供两段相同的代码（宽高值需要和canvas style的宽高一致）
			RecordApp.UniFindCanvas(this,[".recwave-WaveView"],`${webStore}
				store.WaveView=Recorder.WaveView({compatibleCanvas:canvas1, width:300, height:100});
			`,(canvas1)=>{
				store.WaveView=Recorder.WaveView({compatibleCanvas:canvas1, width:300, height:100});
			});
			
			RecordApp.UniFindCanvas(this,[".recwave-SurferView",".recwave-SurferView-2x"],`${webStore}
				store.SurferView=Recorder.WaveSurferView({compatibleCanvas:canvas1,compatibleCanvas_2x:canvas2, width:300, height:100});
			`,(canvas1,canvas2)=>{
				store.SurferView=Recorder.WaveSurferView({compatibleCanvas:canvas1,compatibleCanvas_2x:canvas2, width:300, height:100});
			});
			
			RecordApp.UniFindCanvas(this,[".recwave-Histogram1"],`${webStore}
				store.Histogram1=Recorder.FrequencyHistogramView({compatibleCanvas:canvas1, width:300, height:100});
			`,(canvas1)=>{
				store.Histogram1=Recorder.FrequencyHistogramView({compatibleCanvas:canvas1, width:300, height:100});
			});
			RecordApp.UniFindCanvas(this,[".recwave-Histogram2"],`${webStore}
				store.Histogram2=Recorder.FrequencyHistogramView({compatibleCanvas:canvas1, width:300, height:100
					 ,lineCount:90,position:0,minHeight:1,stripeEnable:false});
			`,(canvas1)=>{
				store.Histogram2=Recorder.FrequencyHistogramView({compatibleCanvas:canvas1, width:300, height:100
					 ,lineCount:90,position:0,minHeight:1,stripeEnable:false});
			});
			RecordApp.UniFindCanvas(this,[".recwave-Histogram3"],`${webStore}
				store.Histogram3=Recorder.FrequencyHistogramView({compatibleCanvas:canvas1, width:300, height:100
					,lineCount:20,position:0,minHeight:1,fallDuration:400,stripeEnable:false,mirrorEnable:true
					,linear:[0,"#0ac",1,"#0ac"]});
			`,(canvas1)=>{
				store.Histogram3=Recorder.FrequencyHistogramView({compatibleCanvas:canvas1, width:300, height:100
					,lineCount:20,position:0,minHeight:1,fallDuration:400,stripeEnable:false,mirrorEnable:true
					,linear:[0,"#0ac",1,"#0ac"]});
			});
		}
		,recwaveChoice(e){
			var key=e.target.dataset.key;
			if(key){
				if(key!=this.recwaveChoiceKey){
					this.reclog("已切换波形显示为："+key);
				}
				this.recwaveChoiceKey=key;
				//App中传送给renderjs里面，同样赋值
				if(RecordApp.UniIsApp()){
					RecordApp.UniWebViewVueCall(this,'this.recwaveChoiceKey="'+key+'"');
				}
			}
		}
		
		//注入60秒数据，方便测试
		,recEnvIn60(){
			var rec=RecordApp.GetCurrentRecOrNull();
			if(!rec){
				this.reclog("未开始录音，无法注入",1);
				return;
			}
			if(RecordApp.UniIsApp()){
				//App中到renderjs里面里面注入
				RecordApp.UniWebViewVueCall(this,`
					var rec=RecordApp.GetCurrentRecOrNull();
					var sampleRate=rec.srcSampleRate,t1=Date.now();
					var canon=Recorder.NMN2PCM.GetExamples().Canon.get(sampleRate).pcm;
					var len=sampleRate*60,offset=0;
					while(offset<len){
						rec.envIn(canon.subarray(0,Math.min(canon.length,len-offset)),0);
						offset+=canon.length;
					}
					this.$ownerInstance.callMethod("reclog","已注入60秒Canon简谱生成的音乐，耗时"+(Date.now()-t1)+"ms");
				`);
				return;
			}
			var sampleRate=rec.srcSampleRate,t1=Date.now();
			var canon=Recorder.NMN2PCM.GetExamples().Canon.get(sampleRate).pcm;
			var len=sampleRate*60,offset=0;
			while(offset<len){
				rec.envIn(canon.subarray(0,Math.min(canon.length,len-offset)),0);
				offset+=canon.length;
			}
			this.reclog("已注入60秒Canon简谱生成的音乐，耗时"+(Date.now()-t1)+"ms");
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
		,getRouteStr(){
			var url=this.$page&&this.$page.route||this.$root.route; //vue2 || vue3
			if(!url && this.$root.$scope){//wx
				url=this.$root.$scope.route;
			}
			return "/"+url;
		}
		,reloadPage(){
			var url=this.getRouteStr();
			console.log("刷新页面 url="+url);
			if(getCurrentPages().length==1){
				uni.reLaunch({ url:url })
			}else{
				uni.navigateBack({animationDuration:0,success:()=>{ setTimeout(()=>{
					uni.navigateTo({url:url})
				},300); }});
			}
		}
		,evalExecClick(){
			if(!this.evalExecCode){
				this.reclog("请填写要执行的代码",1);
				return;
			}
			// #ifdef APP || H5
			try{
				new Function("Recorder,RecordApp",this.evalExecCode).call(this,Recorder,RecordApp);
				this.reclog("代码已执行",2);
			}catch(e){
				this.reclog("代码执行异常："+e.message,1);
			}
			// #endif
		}
		,loadVConsole(){
			var isApp=false, isH5=false;
			/*#ifdef APP*/ isApp=true; /*#endif*/
			/*#ifdef H5*/ isH5=true; /*#endif*/
			var jsCode=`(function(){
				var isApp=${isApp}, isH5=${isH5};
				var ok=function(){
					if(isApp){
						This.$ownerInstance.callMethod("reclog","vConsole已加载");
					}else{
						This.reclog("vConsole已加载");
					}
				}
				if(window.VConsole)return ok();
				var elem=document.createElement("script");
				elem.setAttribute("type","text/javascript");
				elem.setAttribute("src","https://xiangyuecn.gitee.io/recorder/assets/ztest-vconsole.js");
				document.body.appendChild(elem);
				elem.onload=function(){
					new VConsole(); ok()
				};
			})()`;
			this.reclog("正在renderjs中加载vConsole...");
			if(isApp){
				RecordApp.UniWebViewVueCall(this,jsCode);
			}else if(isH5){// #ifdef H5
				eval("var This=this;"+jsCode); // #endif
			}else{
				this.reclog("非app环境，不加载vConsole",1)
			}
		}
	}
}
</script>




<!-- #ifdef APP -->
<script module="testMainVue" lang="renderjs">
/**============= App中在renderjs中引入RecordApp，这样App中也能使用H5录音、音频可视化 =============**/
/** 先引入Recorder **/
import Recorder from 'recorder-core';

//按需引入需要的录音格式编码器，用不到的不需要引入，减少程序体积；H5、renderjs中可以把编码器放到static文件夹里面用动态创建script来引入，免得这些文件太大
import 'recorder-core/src/engine/mp3.js'
import 'recorder-core/src/engine/mp3-engine.js'
import 'recorder-core/src/engine/wav.js'
import 'recorder-core/src/engine/pcm.js'
import 'recorder-core/src/engine/g711x'
import 'recorder-core/src/engine/beta-amr'
import 'recorder-core/src/engine/beta-amr-engine'
import 'recorder-core/src/engine/beta-ogg'
import 'recorder-core/src/engine/beta-ogg-engine'

//可选引入可视化插件
import 'recorder-core/src/extensions/waveview.js'
import 'recorder-core/src/extensions/wavesurfer.view.js'

import 'recorder-core/src/extensions/frequency.histogram.view.js'
import 'recorder-core/src/extensions/lib.fft.js'

//测试用根据简谱生成一段音乐
import 'recorder-core/src/extensions/create-audio.nmn2pcm.js'

/** 引入RecordApp **/
import RecordApp from 'recorder-core/src/app-support/app.js'
//【必须引入】uni-app支持文件
import '../../uni_modules/Recorder-UniCore/app-uni-support.js'

export default {
	mounted(){
		//App的renderjs必须调用的函数，传入当前模块this
		RecordApp.UniRenderjsRegister(this);
		
		this.$ownerInstance.callMethod("reclog","renderjs mounted"
			+"，WebViewId="+window.__WebVieW_Id__
			+"，ComponentId=_$id:"+(this._$id||"?")+"/$vm.ownerId:"+(this.$ownerInstance.$vm.ownerId||"?"));
	},
	methods: {
		//这里定义的方法，在逻辑层中可通过 RecordApp.UniWebViewVueCall(this,'this.xxxFunc()') 直接调用
		//调用逻辑层的方法，请直接用 this.$ownerInstance.callMethod("xxxFunc",{args}) 调用，二进制数据需转成base64来传递
	}
}
</script>
<!-- #endif -->




<style>
.recwaveChoice{
	cursor: pointer;
	display:inline-block;
	vertical-align: bottom;
	border-right:1px solid #ccc;
	background:#ddd;
	line-height:28px;
	font-size:12px;
	color:#666;
	padding:0 5px;
}
.recwaveChoice:first-child{
	border-radius: 99px 0 0 99px;
}
.recwaveChoice:last-child{
	border-radius: 0 99px 99px 0;
	border-right:none;
}
.recwaveChoice.slc,.recwaveChoice:hover{
	background:#f60;
	color:#fff;
}



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
