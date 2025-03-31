<!-- uni-app内使用RecordApp录音
GitHub: https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/demo_UniApp
DCloud 插件市场下载组件: https://ext.dcloud.net.cn/plugin?name=Recorder-UniCore
-->

<template>
<view> <!-- 建议template下只有一个根节点（最外面套一层view），如果不小心踩到了vue3的Fragments(multi-root 多个根节点)特性（vue2编译会报错，vue3不会），可能会出现奇奇怪怪的兼容性问题 -->
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
		<view><checkbox :checked="takeoffEncodeChunkSet" @click="takeoffEncodeChunkSet=!takeoffEncodeChunkSet">接管编码器输出（takeoffEncodeChunk，App端推荐开启）同时清理内存来长时间录音</checkbox> {{takeoffEncodeChunkMsg}}</view>
		<view><checkbox :checked="appUseH5Rec" @click="appUseH5RecClick">App里面总是使用Recorder H5录音（勾选后不启用原生录音插件和uts插件）</checkbox></view>
		
		<view><checkbox :checked="useAEC" @click="useAEC=!useAEC">尝试启用回声消除（echoCancellation）</checkbox></view>
		
		<view><checkbox :checked="showUpload" @click="showUpload=!showUpload">录音上传、保存本地文件+播放、实时语音通话聊天对讲（WebSocket）</checkbox></view>
	</view>
	
	<!-- 手撸播放器 -->
	<view style="padding-top:10px">
		<TestPlayer ref="player" />
	</view>
	
	<!-- 上传、语音通话等功能 -->
	<view v-show="showUpload">
		<TestUploadView />
		<TestRtVoiceView />
	</view>
	
	<!-- 日志输出 -->
	<view style="padding-top:10px">
		<view v-for="obj in reclogs" :key="obj.idx" style="border-bottom:1px dashed #666;padding:5px 0;">
			<view :style="{color:obj.color==1?'red':obj.color==2?'green':obj.color}">
				{{obj.txt}}
			</view>
		</view>
		<view v-if="reclogLast" style="position:fixed;z-index:2;width:20vw;min-width:200px;max-height:100px;overflow:auto;right:0;bottom:0;background:#fff;padding:5px 10px;border-radius:6px 0 0 0;box-shadow:-1px -1px 3px #ddd;font-size:13px">
			<view :style="{color:reclogLast.color==1?'red':reclogLast.color==2?'green':reclogLast.color}">
				{{reclogLast.txt}}
			</view>
		</view>
	</view>
	<view style="padding-top:80px"></view>
	
	<!-- 更多功能按钮 -->
	<view style="padding:10px 10px">
		<view>
			<navigator url="page_vue3____composition_api" style="display: inline;">
				<button size="mini" type="default">vue3组合式api页面</button>
			</navigator>
			
			<button size="mini" type="default" @click="loadVConsole">显示vConsole</button>
		</view>
<!-- #ifdef APP -->
		<view>
			<navigator url="page_renderjsWithout" style="display: inline;">
				<button size="mini" type="default">逻辑层编码UniWithoutAppRenderjs后台录音更稳</button>
			</navigator>
		</view>
		<view>
			<button size="mini" type="default" @click="testRenderjsFunc">测试renderjs功能调用</button>
			<TestPageRenderjsView ref="testRF" />
		</view>
		
		<view style="margin:10px 0; border-top:1px dashed #666"></view>
		<view style="padding-top:10px">
			<button size="mini" type="default" @click="testShowNotifyService">显示后台录音保活通知(Android)</button>
			<button size="mini" type="default" @click="testCloseNotifyService">关闭通知</button>
		</view>
		<view style="font-size:14px">
			<checkbox :checked="useANotifySrv" @click="useANotifySrv=!useANotifySrv">本页面录音时自动尝试打开保活(Android)</checkbox>
		</view>
<!-- #endif -->

		<view style="margin:10px 0; border-top:1px dashed #666"></view>
		<view>
			<button size="mini" type="default" @click="speakerOnClick">切换成扬声器外放</button>
			<button size="mini" type="default" @click="speakerOffClick">切换成听筒播放</button>
		</view>
<!-- #ifdef APP -->
		<view style="font-size:14px">
			<checkbox :checked="recStart_setSpeaker" @click="recStartSetSpeaker(1)">打开录音时默认：</checkbox>{
			<text style="color:blue" @click="recStartSetSpeaker(2)">{{recStart_speakerOff?'off:true':'off:false'}}</text>,
			<text style="color:blue" @click="recStartSetSpeaker(3)">{{recStart_speakerHds?'headset:true':'headset:false'}}</text>
			}
		</view>
<!-- #endif -->
		<view style="margin:5px 0; border-top:1px dashed #666"></view>
		
<!-- #ifdef APP -->
		<view>
			<button size="mini" type="default" @click="testNativePlugin">测试原生插件调用</button>
			<button size="mini" type="default" @click="testShowMemoryUsage">显示内存占用</button>
			<TestNativePluginView ref="testNP" />
		</view>
		
		<view style="font-size:13px">
			pcm数据实时写入到wav文件测试(原生插件)<button size="mini" type="default" @click="testWritePcm2Wav" style="vertical-align: middle;">测试</button>
		</view>
		
		<view style="margin:5px 0; border-top:1px dashed #666"></view>
		<view>
			<button size="mini" type="default" @click="testNP_PcmPlayerShow=!testNP_PcmPlayerShow">测试原生插件PcmPlayer流式播放器</button>
		</view>
		<TestNativePluginPcmPlayerView v-if="testNP_PcmPlayerShow"></TestNativePluginPcmPlayerView>
<!-- #endif -->
<!-- #ifdef APP || H5 -->
		<view>
			<button size="mini" type="default" @click="testH5Play5F">播放5分钟wav(h5)</button>
			<button size="mini" type="default" @click="testUniPlay5F">播放5分钟wav(uni)</button>
		</view>
<!-- #endif -->
		<view style="margin:5px 0; border-top:1px dashed #666"></view>
		<view>
			<button size="mini" type="default" @click="clearLogs">清除日志</button>
		</view>
		
		<view class="testUniPlay5FView"></view>
		<view class="testH5Play5FView"></view>
		<view>
			<view v-for="item in testMsgs" style="border-top:1px dashed #eee; padding:5px 0" :style="{color:item.color==1?'red':item.color==2?'green':item.color}">
				{{item.msg}}
			</view>
		</view>
	</view>
	
	<!-- 文档地址提示 -->
	<view style="height:10px;background:#eee"></view>
	<view style="padding:10px 10px">
		<view style="padding-bottom: 10px;color:#02a2ff;word-break:break-all;">
			<view style="padding-bottom:10px">DCloud 插件市场下载本组件: https://ext.dcloud.net.cn/plugin?name=Recorder-UniCore</view>
			<view>RecordApp的uni-app支持文档和示例: https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/demo_UniApp (github可以换成gitee)</view>
		</view>
		<view style="color:#0ab;font-size:22px;font-weight:bold">
			如需录音功能定制开发，网站、App、小程序、前端后端开发等需求，请加QQ群：①群 781036591、②群 748359095、③群 450721519，口令recorder，联系群主（即作者），谢谢~
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


<script> /**这里是逻辑层**/
/**本例子是VUE的选项式 API (Options API)风格，vue2 vue3均支持，如果你使用的vue3 setup组合式 API (Composition API) 编写时，请在import后面取到当前实例this，在需要this的地方传vue3This变量即可，具体调用可以参考 page_vue3____composition_api.vue
import { getCurrentInstance } from 'vue';
var vue3This=getCurrentInstance().proxy; //必须定义到最外面，放import后面即可 */

import TestPlayer from './test_player___.vue'; //手撸的一个跨平台播放器
import TestUploadView from './test_upload_saveFile.vue'; //上传功能界面
import TestRtVoiceView from './test_realtime_voice.vue'; //实时语音通话聊天对讲
import TestNativePluginView from './test_native_plugin.vue'; //测试原生插件功能
import TestNativePluginPcmPlayerView from './test_player_nativePlugin_pcmPlayer.vue'; //测试pcmPlayer播放器
import TestPageRenderjsView from './test_page_renderjs.vue'; //测试renderjs功能调用


/** 先引入Recorder （ 需先 npm install recorder-core ）**/
import Recorder from 'recorder-core'; //注意如果未引用Recorder变量，可能编译时会被优化删除（如vue3 tree-shaking），请改成 import 'recorder-core'，或随便调用一下 Recorder.a=1 保证强引用

/** H5、小程序环境中：引入需要的格式编码器、可视化插件，App环境中在renderjs中引入 **/
// 注意：如果App中需要在逻辑层中调用Recorder的编码/转码功能，需要去掉此条件编译，否则会报未加载编码器的错误
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
	
	//实时播放语音，仅支持h5
	import 'recorder-core/src/extensions/buffer_stream.player.js'
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


/** 可选：App中引入原生录音插件来进行录音，兼容性和体验更好，原生插件市场地址: https://ext.dcloud.net.cn/plugin?name=Recorder-NativePlugin （试用无任何限制）
	在调用RecordApp.RequestPermission之前进行配置，建议放到import后面直接配置（全局生效）
	也可以判断一下只在iOS上或Android上启用，不判断就都启用，比如判断iOS：RecordApp.UniIsApp()==2 */
RecordApp.UniNativeUtsPlugin={nativePlugin:true}; //目前仅支持原生插件，uts插件不可用

//App中提升后台录音的稳定性：配置了原生插件后，可配置 `RecordApp.UniWithoutAppRenderjs=true` 禁用renderjs层音频编码（WebWorker加速），变成逻辑层中直接编码（但会降低逻辑层性能），后台运行时可避免部分手机WebView运行受限的影响

//App中提升后台录音的稳定性：需要启用后台录音保活服务（iOS不需要），Android 9开始，锁屏或进入后台一段时间后App可能会被禁止访问麦克风导致录音静音、无法录音（renderjs中H5录音也受影响），请调用配套原生插件的`androidNotifyService`接口，或使用第三方保活插件




export default {
	components: { TestPlayer,TestUploadView,TestRtVoiceView,TestNativePluginView,TestNativePluginPcmPlayerView,TestPageRenderjsView },
	data() {
		return {
			recType:"mp3"
			,recSampleRate:16000
			,recBitRate:16
			
			,takeoffEncodeChunkSet:false
			,takeoffEncodeChunkMsg:""
			,useAEC:false
			,useANotifySrv:true
			,appUseH5Rec:false
			,showUpload:false
	
			,recwaveChoiceKey:"WaveView"
			,recpowerx:0
			,recpowert:""
			,pageDeep:0,pageNewPath:"main_recTest"
			,disableOgg:disableOgg
			,evalExecCode:""
			,recStart_setSpeaker:false, recStart_speakerOff:false, recStart_speakerHds:true
			,testNP_PcmPlayerShow:false
			,testMsgs:[],reclogs:[],reclogLast:""
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
			if(this.appUseH5Rec){//测试时指定使用h5录音
				RecordApp.UniNativeUtsPlugin=null;
			}else{
				RecordApp.UniNativeUtsPlugin={nativePlugin:true}; //恢复原生插件配置值
				RecordApp.UniCheckNativeUtsPluginConfig(); //可以检查一下原生插件配置是否有效
				RecordApp.UniNativeUtsPlugin_JsCall=(data)=>{ //可以绑定原生插件的jsCall回调
					if(data.action=="onLog"){ //显示原生插件日志信息
						this.reclog("[Native.onLog]["+data.tag+"]"+data.message, data.isError?1:"#bbb", {noLog:1});
					}
				};
			}
			
			/****【在App内使用app-uni-support.js的授权许可】编译到App平台时仅供测试用（App平台包括：Android App、iOS App），不可用于正式发布或商用，正式发布或商用需先联系作者获得授权许可（编译到其他平台时无此授权限制，比如：H5、小程序，均为免费授权）
			获得授权许可后，请解开下面这行注释，并且将**部分改成你的uniapp项目的appid，即可解除所有限制；使用配套的原生录音插件或uts插件时可不进行此配置
			****/
			//RecordApp.UniAppUseLicense='我已获得UniAppID=*****的商用授权';
			
			//使用renderjs时提示一下iOS有弹框
			if(RecordApp.UniIsApp() && !RecordApp.UniNativeUtsPlugin){
				this.reclog("当前是在App的renderjs中使用H5进行录音，iOS上只支持14.3以上版本，且iOS上每次进入页面后第一次请求录音权限时、或长时间无操作再请求录音权限时WebView均会弹出录音权限对话框，不同旧iOS版本（低于iOS17）下H5录音可能存在的问题在App中同样会存在；使用配套的原生录音插件或uts插件时无以上问题和版本限制，Android也无以上问题","#f60");
			}
			
			if(this.useAEC){ //这个是Start中的audioTrackSet配置，在h5（H5、App+renderjs）中必须提前配置，因为h5中RequestPermission会直接打开录音
				RecordApp.RequestPermission_H5OpenSet={ audioTrackSet:{ noiseSuppression:true,echoCancellation:true,autoGainControl:true } };
			}
			
			this.reclog("正在请求录音权限...");
			RecordApp.UniWebViewActivate(this); //App环境下必须先切换成当前页面WebView
			RecordApp.RequestPermission(()=>{
				this.reclog(this.currentKeyTag()+" 已获得录音权限，可以开始录音了",2);
				if(this.reqOkCall)this.reqOkCall(); this.reqOkCall=null; //留别的组件内调用的回调
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
			this.watchDogTimer=0; this.wdtPauseT=0; var processTime=0;
			
			if(this.useANotifySrv) this.tryStart_androidNotifyService(); //Android App+原生插件环境下，如需后台或锁屏录音，就必须启用后台录音保活服务（iOS不需要），Android 9开始，锁屏或进入后台一段时间后App可能会被禁止访问麦克风导致录音静音、无法录音（renderjs中H5录音、原生插件录音均受影响），因此需要调用原生插件的`androidNotifyService`接口保活，或使用第三方保活插件
			
			this.reclog(this.currentKeyTag()+" 正在打开...");
			RecordApp.UniWebViewActivate(this); //App环境下必须先切换成当前页面WebView
			RecordApp.Start({
				type:this.recType
				,sampleRate:this.recSampleRate
				,bitRate:this.recBitRate
				,audioTrackSet:!this.useAEC?null:{ //配置回声消除，H5、App、小程序均可用，但并不一定会生效；注意：H5、App+renderjs中需要在请求录音权限前进行相同配置RecordApp.RequestPermission_H5OpenSet后此配置才会生效
					noiseSuppression:true,echoCancellation:true,autoGainControl:true
				}
				
				,setSpeakerOff:!this.recStart_setSpeaker? null : { //使用原生录音插件时，可以提供一个扬声器外放和听筒播放的切换默认配置
					off:this.recStart_speakerOff, headset:this.recStart_speakerHds
				}
				
				,onProcess:(buffers,powerLevel,duration,sampleRate,newBufferIdx,asyncEnd)=>{
					//全平台通用：可实时上传（发送）数据，配合Recorder.SampleData方法，将buffers中的新数据连续的转换成pcm上传，或使用mock方法将新数据连续的转码成其他格式上传，可以参考Recorder文档里面的：Demo片段列表 -> 实时转码并上传-通用版；基于本功能可以做到：实时转发数据、实时保存数据、实时语音识别（ASR）等
					
					//注意：App里面是在renderjs中进行实际的音频格式编码操作，此处的buffers数据是renderjs实时转发过来的，修改此处的buffers数据不会改变renderjs中buffers，所以不会改变生成的音频文件，可在onProcess_renderjs中进行修改操作就没有此问题了；如需清理buffers内存，此处和onProcess_renderjs中均需要进行清理，H5、小程序中无此限制
					//注意：如果你要用只支持在浏览器中使用的Recorder扩展插件，App里面请在renderjs中引入此扩展插件，然后在onProcess_renderjs中调用这个插件；H5可直接在这里进行调用，小程序不支持这类插件；如果调用插件的逻辑比较复杂，建议封装成js文件，这样逻辑层、renderjs中直接import，不需要重复编写
					
					this.recpowerx=powerLevel;
					this.recpowert=this.formatTime(duration,1)+" / "+powerLevel;
					processTime=Date.now();
					
					//H5、小程序等可视化图形绘制，直接运行在逻辑层；App里面需要在onProcess_renderjs中进行这些操作
					// #ifdef H5 || MP-WEIXIN
					var wave=this.waveStore&&this.waveStore[this.recwaveChoiceKey];
					if(wave){
						wave.input(buffers[buffers.length-1],powerLevel,sampleRate);
					}
					// #endif
					//实时语音通话对讲，实时处理录音数据
					if(this.wsVoiceProcess) this.wsVoiceProcess(buffers,powerLevel,duration,sampleRate,newBufferIdx);
					
					//实时释放清理内存，用于支持长时间录音；在指定了有效的type时，编码器内部可能还会有其他缓冲，必须同时提供takeoffEncodeChunk才能清理内存，否则type需要提供unknown格式来阻止编码器内部缓冲，App的onProcess_renderjs中需要进行相同操作
					if(this.takeEcChunks){
						if(this.clearBufferIdx>newBufferIdx){ this.clearBufferIdx=0 } //重新录音了就重置
						for(var i=this.clearBufferIdx||0;i<newBufferIdx;i++) buffers[i]=null;
						this.clearBufferIdx=newBufferIdx;
					}
				}
				,onProcess_renderjs:`function(buffers,powerLevel,duration,sampleRate,newBufferIdx,asyncEnd){
					//App中在这里修改buffers才会改变生成的音频文件
					//App中是在renderjs中进行的可视化图形绘制，因此需要写在这里，this是renderjs模块的this（也可以用This变量）；如果代码比较复杂，请直接在renderjs的methods里面放个方法xxxFunc，这里直接使用this.xxxFunc(args)进行调用
					var wave=this.waveStore&&this.waveStore[this.recwaveChoiceKey];
					if(wave) wave.input(buffers[buffers.length-1],powerLevel,sampleRate);
					
					//和onProcess中一样进行释放清理内存，用于支持长时间录音
					if(${this.takeEcChunks?1:0}){
						if(this.clearBufferIdx>newBufferIdx){ this.clearBufferIdx=0 } //重新录音了就重置
						for(var i=this.clearBufferIdx||0;i<newBufferIdx;i++) buffers[i]=null;
						this.clearBufferIdx=newBufferIdx;
					}
				}`
				
				,takeoffEncodeChunk:!this.takeoffEncodeChunkSet?null:(chunkBytes)=>{
					//全平台通用：实时接收到编码器编码出来的音频片段数据，chunkBytes是Uint8Array二进制数据，可以实时上传（发送）出去
					//App中如果未配置RecordApp.UniWithoutAppRenderjs时，建议提供此回调，因为录音结束后会将整个录音文件从renderjs传回逻辑层，由于uni-app的逻辑层和renderjs层数据交互性能实在太拉跨了，大点的文件传输会比较慢，提供此回调后可避免Stop时产生超大数据回传
					takeEcCount++; takeEcSize+=chunkBytes.byteLength;
					this.takeoffEncodeChunkMsg="已接收到"+takeEcCount+"块，共"+takeEcSize+"字节";
					this.takeEcChunks.push(chunkBytes);
					
					//App中使用原生插件时，可方便的将数据实时保存到同一文件，第一帧时append:false新建文件，后面的append:true追加到文件
					//RecordApp.UniNativeUtsPluginCallAsync("writeFile",{path:"xxx.mp3",append:回调次数!=1, dataBase64:RecordApp.UniBtoa(chunkBytes.buffer)}).then(...).catch(...)
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
					+(this.useAEC?" useAEC":"")
					+(this.appUseH5Rec?" appUseH5Rec":""),2);
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
		,recStopX(){
			this.tryClose_androidNotifyService(); //关闭后台录音保活服务
			this.watchDogTimer=0; //停止监控onProcess超时
			RecordApp.Stop(
				null //success传null就只会清理资源，不会进行转码
				,(msg)=>{
					this.reclog("已清理，错误信息："+msg);
				}
			);
		}
		,recStop(){
			this.reclog("正在结束录音...");
			this.tryClose_androidNotifyService(); //关闭后台录音保活服务
			this.watchDogTimer=0; //停止监控onProcess超时
			
			RecordApp.Stop((aBuf,duration,mime)=>{
				//全平台通用：aBuf是ArrayBuffer音频文件二进制数据，可以保存成文件或者发送给服务器
				//App中如果在Start参数中提供了stop_renderjs，renderjs中的函数会比这个函数先执行
				
				var recSet=(RecordApp.GetCurrentRecOrNull()||{set:{type:this.recType}}).set;
				var testPlay_aBuf_renderjs="this.audioData";
				this.reclog("已录制["+mime+"]："+this.formatTime(duration,1)+" "+aBuf.byteLength+"字节 "
						+recSet.sampleRate+"hz "+recSet.bitRate+"kbps",2);
				
				//如果使用了takeoffEncodeChunk，Stop的aBuf长度是0，数据早已存到了takeEcChunks数组里面，直接合并成完整音频文件
				if(this.takeEcChunks){
					testPlay_aBuf_renderjs=""; //renderjs的数据是空的
					this.reclog("启用takeoffEncodeChunk后Stop返回的blob长度为0不提供音频数据");
					var len=0; for(var i=0;i<this.takeEcChunks.length;i++)len+=this.takeEcChunks[i].length;
					var chunkData=new Uint8Array(len);
					for(var i=0,idx=0;i<this.takeEcChunks.length;i++){
						var itm=this.takeEcChunks[i]; chunkData.set(itm,idx); idx+=itm.length;
					}
					aBuf=chunkData.buffer;
					this.reclog("takeoffEncodeChunk接收到的音频片段，已合并成一个音频文件 "+aBuf.byteLength+"字节");
				}
				
				
				/**【保存文件】【上传】示例，详细请参考 test_upload_saveFile.vue 文件
				//如果是H5环境，也可以直接构造成Blob/File文件对象，和Recorder使用一致
				// #ifdef H5
					var blob=new Blob([arrayBuffer],{type:mime});
					console.log(blob, (window.URL||webkitURL).createObjectURL(blob));
					var file=new File([arrayBuffer],"recorder.mp3");
					//uni.uploadFile({file:file, ...}) //直接上传
				// #endif
				
				//如果是App、小程序环境，可以直接保存到本地文件，然后调用相关网络接口上传
				// #ifdef APP || MP-WEIXIN
					RecordApp.UniSaveLocalFile("recorder.mp3",arrayBuffer,(savePath)=>{
						console.log(savePath); //app保存的文件夹为`plus.io.PUBLIC_DOWNLOADS`，小程序为 `wx.env.USER_DATA_PATH` 路径
						//uni.uploadFile({filePath:savePath, ...}) //直接上传
					},(errMsg)=>{ console.error(errMsg) });
				// #endif
				**/
				
				
				//【测试】用变量保存起来，别的地方调用
				this.lastRecType=recSet.type;
				this.lastRecBuffer=aBuf;
				
				//【测试】播放，部分格式会转码成wav播放
				this.$refs.player.setPlayBytes(aBuf,testPlay_aBuf_renderjs,duration,mime,recSet,Recorder);
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
		
		
		,clearLogs(){ this.testMsgs=[]; this.reclogs=[]; }
		,addTestMsg(msg,color){
			var now=new Date();
			var t=("0"+now.getHours()).substr(-2)
				+":"+("0"+now.getMinutes()).substr(-2)
				+":"+("0"+now.getSeconds()).substr(-2);
			var txt="["+t+"]"+msg;
			this.testMsgs.splice(0,0,{msg:txt,color:color});
			this.reclogLast={txt:txt,color:color};
		}
		,reclog(msg,color,set){
			var now=new Date();
			var t=("0"+now.getHours()).substr(-2)
				+":"+("0"+now.getMinutes()).substr(-2)
				+":"+("0"+now.getSeconds()).substr(-2);
			var txt="["+t+"]"+msg;
			if(!set||!set.noLog)console.log(txt);
			this.reclogs.splice(0,0,{txt:txt,color:color});
			this.reclogLast={txt:txt,color:color};
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
			//if(isWx && this.waveStore)return;//可以限制初始化一次；如果你的canvas所在的view存在v-if之类的会重新创建了对应的view，必须将波形重新进行初始化才能使用；如果使用的是同一个view，重新初始化后如果上次的动画没有完成时，小程序中开头部分新的波形会和老的波形相互干扰，老动画完成后恢复正常，App、H5无此问题
			var store=this.waveStore=this.waveStore||{};//这个测试demo会创建多个可视化，所以用个对象存起来，只有一个的时候请直接用个变量存一下即可 不用搞这么复杂
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
				//注意：iOS上微信小程序基础库存在bug，canvas.drawImage(canvas)可能无法绘制，可能会导致WaveSurferView在iOS小程序上不能正确显示，其他环境下无此兼容性问题
			});
			
			RecordApp.UniFindCanvas(this,[".recwave-Histogram1"],`${webStore}
				store.Histogram1=Recorder.FrequencyHistogramView({compatibleCanvas:canvas1, width:300, height:100});
			`,(canvas1)=>{
				store.Histogram1=Recorder.FrequencyHistogramView({compatibleCanvas:canvas1, width:300, height:100});
			});
			RecordApp.UniFindCanvas(this,[".recwave-Histogram2"],`${webStore}
				store.Histogram2=Recorder.FrequencyHistogramView({compatibleCanvas:canvas1, width:300, height:100
					,lineCount:200,widthRatio:1,position:0,minHeight:1
					,fallDuration:600,stripeEnable:false,mirrorEnable:true});
			`,(canvas1)=>{
				store.Histogram2=Recorder.FrequencyHistogramView({compatibleCanvas:canvas1, width:300, height:100
					,lineCount:200,widthRatio:1,position:0,minHeight:1
					,fallDuration:600,stripeEnable:false,mirrorEnable:true});
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
					if(key=="SurferView"){
						// #ifdef MP-WEIXIN
						this.reclog("注意：iOS上微信小程序基础库存在bug，canvas.drawImage(canvas)可能无法绘制，可能会导致WaveSurferView在iOS小程序上不能正确显示，其它可视化插件无此兼容性问题","#fa0");
						// #endif
					}
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
		
		//测试renderjs功能调用
		,testRenderjsFunc(){
			this.$refs.testRF.showTest();
		}
		//pcm数据实时写入到wav文件测试(原生插件)
		,testWritePcm2Wav(){
			this.$refs.testNP.realtimeWritePcm2Wav();
		}
		//测试原生插件功能
		,testNativePlugin(){
			this.$refs.testNP.showTest();
		}
		//显示内存占用
		,testShowMemoryUsage(){
			this.$refs.testNP.showMemoryUsage();
		}
		//显示Android后台录音保活通知服务
		,testShowNotifyService(){
			this.$refs.testNP.showNotifyService(true);
		}
		,testCloseNotifyService(){
			this.$refs.testNP.showNotifyService(false);
		}
		//打开录音时原生插件默认外放和听筒播放设置
		,recStartSetSpeaker(type){
			var err=RecordApp.UniCheckNativeUtsPluginConfig();
			if(err) return this.reclog("打开录音时默认setSpeakerOff配置需要原生插件支持："+err,1);
			if(type==1){ this.recStart_setSpeaker=!this.recStart_setSpeaker; return; }
			this.recStart_setSpeaker=true;
			if(type==2)this.recStart_speakerOff=!this.recStart_speakerOff;
			else this.recStart_speakerHds=!this.recStart_speakerHds;
		}
		//切换扬声器外放和听筒播放
		,speakerOnClick(){
			this.__setSpeakerOff(false);
		}
		,speakerOffClick(){
			this.__setSpeakerOff(true);
		}
		,__setSpeakerOff(off){
			// #ifdef APP
			RecordApp.UniNativeUtsPluginCallAsync("setSpeakerOff",{off:off,headset:off}).then(()=>{
				this.reclog("已切换成"+(off?"听筒播放":"外放"),2);
			}).catch((e)=>{
				this.reclog("切换"+(off?"听筒播放":"外放")+"失败："+e.message,1);
			});
			return;
			// #endif
			// #ifdef MP-WEIXIN
			wx.setInnerAudioOption({ speakerOn:!off, success:()=>{
				this.reclog("已切换成"+(off?"听筒播放":"外放"),2);
			}, fail:(e)=>{
				this.reclog("切换"+(off?"听筒播放":"外放")+"失败："+e.errMsg,1);
			}});
			return;
			// #endif
			return this.reclog("目前仅App或小程序支持支持切换外放和听筒播放",1);
		}
		
		//显示测试用的H5播放器
		,showH5Player(url,play){
			var jsCode=`
				var el=document.querySelector(".testH5Play5FView");
				el.innerHTML='<div style="padding-top:8px"><audio class="testH5Play5FAudio" controls style="width:100%"></audio></div>';
				var audio=document.querySelector(".testH5Play5FAudio");
				audio.src=${JSON.stringify(url||"")};
				if(${!!play}) audio.play();
			`;
			/*#ifdef H5*/ eval(jsCode); return; /*#endif*/
			/*#ifdef APP*/ RecordApp.UniWebViewEval(this,jsCode); return; /*#endif*/
		}
		//H5播放5分钟wav
		,testH5Play5F(){
			var jsCode=`(function(log){
				var scope=window.testH5Play5FScope=window.testH5Play5FScope||{};
				var el=document.querySelector(".testH5Play5FView");
				if(!scope.init){ scope.init=1;
					el.innerHTML='<div style="padding-top:8px"><audio class="testH5Play5FAudio" controls style="width:100%"></audio></div>';
				}
				var audio=document.querySelector(".testH5Play5FAudio");
				audio.onerror=function(e){ log('播放失败['+audio.error.code+']'+audio.error.message,1) };
				audio.onpause=function(e){ log('已停止播放') };
				audio.onplay=function(e){ log("正在播放5分钟wav",2) };
				var urlOk=function(){
					if(!(audio.ended || audio.paused)){ audio.pause(); return }
					audio.src=scope.url; audio.play();
				}; if(scope.url){ urlOk(); }else{
					log("正在合成5分钟音频..."); setTimeout(function(){ var sr=16000;
					var pcm=Recorder.NMN2PCM.GetExamples().Canon.get(sr).pcm;
					var pcm5=new Int16Array(5*60*sr),n=0;
					while(n<pcm5.length){
						var s=Math.min(pcm.length, pcm5.length-n);
						pcm5.set(s==pcm.length?pcm:pcm.subarray(0,s),n); n+=pcm.length
					} log("正在转码5分钟wav...");
					var mock=Recorder({ type:"wav",sampleRate:sr,bitRate:16 }); mock.mock(pcm5, sr);
					mock.stop(function(blob){
						scope.url=(window.URL||webkitURL).createObjectURL(blob); urlOk();
					},function(err){ log(err,1); });
				}); }
			})`;
			var logFn=(msg,color)=>{ this.addTestMsg("[H5Play5F]"+msg,color) };
			/*#ifdef H5*/ eval(jsCode)(logFn); return; /*#endif*/
			/*#ifdef APP*/
			var cb=RecordApp.UniMainCallBack_Register("H5Play5F",(data)=>{ logFn(data.msg,data.color) });
			RecordApp.UniWebViewEval(this,jsCode+`(function(msg,color){
				RecordApp.UniWebViewSendToMain({action:"${cb}",msg:msg,color:color});
			})`);
			return;
			/*#endif*/
			this.reclog("当前环境未适配播放",1)
		}
		//uniapp innerAudioContext播放5分钟wav 
		,testUniPlay5F(){
			var statusFn=(msg)=>{ RecordApp.UniWebViewEval(this,`var el=document.querySelector(".testUniPlay5FView"); el.innerHTML=${JSON.stringify(msg)}`) };
			var logFn=(msg,color)=>{ this.addTestMsg("[UniPlay5F]"+msg,color) };
			var clearFn=()=>{ this.audioCtx.destroy(); this.audioCtx=null; };
			if(this.audioCtx){
				this.audioCtx.showDur("已关闭"," "); clearFn();
				logFn("本次点击只关闭老播放器，请重新点击播放");
				return;
			}
			statusFn("");
			var minutes=+uni.getStorageSync("testUniPlay5FSaveTime")?2:5;
			logFn("正在合成"+minutes+"分钟音频...");
			var pcm5=new Int16Array(16000*60*minutes);
			
			//这个测试页面逻辑层没有import对应的文件，绕一下，import了就直接写
			RecordApp.UniWebViewCallAsync(this,{tag:"生成wav"},`
				var sr=16000;
				var pcm=Recorder.NMN2PCM.GetExamples().Canon.get(sr).pcm;
				var header=Recorder.wav_header(1,1,sr,16,${pcm5.byteLength});
				CallSuccess({header:RecordApp.UniBtoa(header.buffer)}, pcm.buffer);
			`).then((data)=>{
				//直接pcm前面拼接一个wav头即可
				var header=new Uint8Array(RecordApp.UniAtob(data.value.header));
				var pcm=new Int16Array(data.bigBytes), n=0;
				while(n<pcm5.length){
					var s=Math.min(pcm.length, pcm5.length-n);
					pcm5.set(s==pcm.length?pcm:pcm.subarray(0,s),n); n+=pcm.length
				}
				var bytes=new Uint8Array(header.length+pcm5.byteLength);
				bytes.set(header);
				bytes.set(new Uint8Array(pcm5.buffer), header.length);
				
				uni.setStorageSync("testUniPlay5FSaveTime", ""+Date.now());
				//保存到本地文件
				RecordApp.UniSaveLocalFile("temp-audio-UniPlay5F.wav",bytes.buffer,(savePath)=>{
					logFn("再次点击按钮停止播放，正在使用uni.createInnerAudioContext播放wav文件: "+savePath);
					if(minutes!=2)uni.setStorageSync("testUniPlay5FSaveTime", "0");
					
					var ctx=this.audioCtx=uni.createInnerAudioContext();
					ctx.src=savePath;
					var showDur=ctx.showDur=(msg,color)=>{ if(ctx==this.audioCtx)statusFn('<div style="color:'+(color==1?"red":(color||"#46a965"))+';text-align:center">'+msg+" "+this.formatTime(ctx.currentTime*1000)+"/"+this.formatTime(ctx.duration*1000)+"</div>") };
					ctx.onError((res)=>{ clearFn(); showDur("播放失败：["+res.errCode+"]"+res.errMsg, 1); });
					ctx.onEnded(()=>{
						clearFn(); showDur("已播放结束");
					});
					ctx.onPlay(()=>{ showDur("UniPlay5F正在播放"); });
					ctx.onTimeUpdate(()=>{ showDur("UniPlay5F正在播放"); });
					ctx.play();
				},(err)=>{
					logFn("无法播放，保存文件失败："+err);
				});
			}).catch(e=>{
				logFn("错误："+e.message,1);
			});
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
				elem.setAttribute("src","https://xiangyuecn.github.io/Recorder/assets/ztest-vconsole.js");
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
<script module="testMainVue" lang="renderjs"> //此模块内部只能用选项式API风格，vue2、vue3均可用，请照抄这段代码；不可改成setup组合式API风格，否则可能不能import vue导致编译失败
/**需要编译成App时，你需要添加一个renderjs模块，然后一模一样的import上面那些js（微信的js除外）
	，因为App中默认是在renderjs（WebView）中进行录音和音频编码
	。如果配置了 RecordApp.UniWithoutAppRenderjs=true 且未调用依赖renderjs的功能时（如nvue、可视化、仅H5中可用的插件）
	，可不提供此renderjs模块，同时逻辑层中需要将相关import的条件编译去掉**/

/**============= App中在renderjs中引入RecordApp，这样App中也能使用H5录音、音频可视化 =============**/
/** 先引入Recorder **/
import Recorder from 'recorder-core'; //注意如果未引用Recorder变量，可能编译时会被优化删除（如vue3 tree-shaking），请改成 import 'recorder-core'，或随便调用一下 Recorder.a=1 保证强引用

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

//实时播放语音，仅支持h5
import 'recorder-core/src/extensions/buffer_stream.player.js'
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
