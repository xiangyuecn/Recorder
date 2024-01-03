<!-- uni-app内使用RecordApp录音
GitHub: https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/demo_UniApp
DCloud 插件市场下载组件: https://ext.dcloud.net.cn/plugin?name=Recorder-UniCore
-->

<template>
<view>
	<!-- 语言选择 -->
	<view style="padding:10px 10px 0">
		Language: 
		<checkbox :checked="lang=='zh-CN'" @click="langClick" data-lang="zh-CN">简体中文</checkbox>
		<checkbox :checked="lang=='en-US'" @click="langClick" data-lang="en-US">English</checkbox>
		<text style="font-size:12px;color:#999">{{moreLangs}}</text>
	</view>
	
	<!-- 录音格式选择 -->
	<view style="padding:10px 10px 0">
		{{T_Type}}: {{recType}}
		{{T_SampleRate}}: <input type="number" v-model.number="recSampleRate" style="width:60px;display:inline-block;border:1px solid #ddd"/>hz
		{{T_BitRate}}：<input type="number" v-model.number="recBitRate" style="width:60px;display:inline-block;border:1px solid #ddd"/>kbps
	</view>

	<!-- 控制按钮 -->
	<view style="display: flex;padding-top:10px">
		<view style="width:10px"></view>
		<view style="flex:1">
			<button type="warn" @click="recReq" style="font-size:16px;line-height:1.2;padding:10px 15px" :style="{padding:T_req.length>10?'0 15px':''}">{{T_req}}</button>
		</view>
		<view style="width:10px"></view>
		<view style="flex:1">
			<button type="primary" @click="recStart" style="font-size:16px;line-height:1.2;padding:10px 15px">{{T_start}}</button>
		</view>
		<view style="width:10px"></view>
		<view style="flex:1">
			<button @click="recStop" style="font-size:16px;line-height:1.2;padding:10px 15px">{{T_stop}}</button>
		</view>
		<view style="width:10px"></view>
	</view>
	<view style="padding:10px 10px 0">
		<button size="mini" type="default" @click="recPause">{{T_pause}}</button>
		<button size="mini" type="default" @click="recResume">{{T_resume}}</button>
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
import Recorder from 'recorder-core';

/** H5、小程序环境中：引入需要的格式编码器、可视化插件，App环境中在renderjs中引入 **/
// #ifdef H5 || MP-WEIXIN
	//按需引入需要的录音格式编码器，用不到的不需要引入，减少程序体积；H5、renderjs中可以把编码器放到static文件夹里面用动态创建script来引入，免得这些文件太大
	import 'recorder-core/src/engine/mp3.js'
	import 'recorder-core/src/engine/mp3-engine.js'

	//可选引入可视化插件
	import 'recorder-core/src/extensions/waveview.js'
// #endif

/** 引入RecordApp **/
import RecordApp from 'recorder-core/src/app-support/app.js'
//【所有平台必须引入】uni-app支持文件
import '../../uni_modules/Recorder-UniCore/app-uni-support.js'

// #ifdef MP-WEIXIN
//可选引入微信小程序支持文件
import 'recorder-core/src/app-support/app-miniProgram-wx-support.js'
// #endif

//引入语言支持文件
import 'recorder-core/src/i18n/en-US.js'
import '../../uni_modules/Recorder-UniCore/i18n/en-US.js'


var $T=Recorder.i18n.$T;
export default {
	components: { TestPlayer },
	data() {
		return {
			...this.getTexts()
			,lang:""
			
			,recType:"mp3"
			,recSampleRate:16000
			,recBitRate:16
	
			,recpowerx:0
			,recpowert:""
			,reclogs:[]
		}
	},
	mounted() {
		//初始化根据当前语言设置lang
		try{ var lang=uni.getStorageSync("test_page_lang"); }catch(e){}
		lang=lang||(/\b(zh|cn)\b/i.test(uni.getLocale().replace(/_/g," "))?"zh-CN":"en-US");
		this.setLang(lang);
		
		this.reclog($T("I2MO::页面mounted",":Page mounted ")
			+"("+$T("t795::{1}层",":{1} pages",0,getCurrentPages().length)+")"
			+"，Recorder.LM="+Recorder.LM
			+"，RecordApp.LM="+RecordApp.LM
			+"，UniSupportLM="+RecordApp.UniSupportLM
			+"，UniJsSource="+RecordApp.UniJsSource.IsSource);
		this.isMounted=true; this.uniPage__onShow(); //onShow可能比mounted先执行，页面准备好了时再执行一次
		
		//可选，立即显示出环境信息
		this.reclog($T("ry5v::正在执行Install，请勿操作...",":Install is in progress, please do not operate..."),"#f60");
		RecordApp.Install(()=>{
			this.reclog($T("Cix5::Install成功，环境：",":Install successfully, environment: ")+this.currentKeyTag(),2);
			this.reclog($T("K0HW::请先请求录音权限，然后再开始录音",":Please request recording permission before starting recording"));
		},(err)=>{
			this.reclog("RecordApp.Install"+$T("qrjB::出错：",": error: ")+err,1);
		});
	},
	/*#ifdef VUE3*/unmounted()/*#endif*/ /*#ifndef VUE3*/destroyed()/*#endif*/ {
		RecordApp.Stop(); //清理资源，如果打开了录音没有关闭，这里将会进行关闭
		Recorder.i18n.lang="zh-CN"; //还原默认值
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
			/****【在App内使用app-uni-support.js的授权许可】编译到App平台时仅供测试用（App平台包括：Android App、iOS App），不可用于正式发布或商用，正式发布或商用需先联系作者获得授权许可（编译到其他平台时无此授权限制，比如：H5、小程序，均为免费授权）
			获得授权许可后，请解开下面这行注释，并且将**部分改成你的uniapp项目的appid，即可解除所有限制；使用配套的原生录音插件或uts插件时可不进行此配置
			****/
			//RecordApp.UniAppUseLicense='我已获得UniAppID=*****的商用授权';
			
			this.reclog($T("k6jG::正在请求录音权限...",":Requesting recording permission..."));
			RecordApp.UniWebViewActivate(this); //App环境下必须先切换成当前页面WebView
			RecordApp.RequestPermission(()=>{
				this.reclog(this.currentKeyTag()+" "+$T("ueCL::已获得录音权限，可以开始录音了",":The recording permission has been obtained and you can start recording."),2);
			},(msg,isUserNotAllow)=>{
				if(isUserNotAllow){//用户拒绝了录音权限
					//这里你应当编写代码进行引导用户给录音权限，不同平台分别进行编写
				}
				this.reclog(this.currentKeyTag()+" "
					+(isUserNotAllow?"isUserNotAllow,":"")+$T("cZuo::请求录音权限失败：",":Requesting recording permission failed: ")+msg,1);
			});
		}
		,recStart(){
			this.$refs.player.setPlayBytes(null);
			
			this.reclog(this.currentKeyTag()+" "+$T("HbiG::正在打开...",":Starting..."));
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
					if(this.waveView){
						this.waveView.input(buffers[buffers.length-1],powerLevel,sampleRate);
					}
					// #endif
				}
				,onProcess_renderjs:`function(buffers,powerLevel,duration,sampleRate,newBufferIdx,asyncEnd){
					//App中在这里修改buffers才会改变生成的音频文件
					//App中是在renderjs中进行的可视化图形绘制，因此需要写在这里，this是renderjs模块的this（也可以用This变量）；如果代码比较复杂，请直接在renderjs的methods里面放个方法xxxFunc，这里直接使用this.xxxFunc(args)进行调用
					if(this.waveView){
						this.waveView.input(buffers[buffers.length-1],powerLevel,sampleRate);
					}
				}`
				
				,takeoffEncodeChunk:!this.takeoffEncodeChunkSet?null:(chunkBytes)=>{
					//全平台通用：实时接收到编码器编码出来的音频片段数据，chunkBytes是Uint8Array二进制数据，可以实时上传（发送）出去
					//App中如果未配置RecordApp.UniWithoutAppRenderjs时，建议提供此回调，因为录音结束后会将整个录音文件从renderjs传回逻辑层，由于uni-app的逻辑层和renderjs层数据交互性能实在太拉跨了，大点的文件传输会比较慢，提供此回调后可避免Stop时产生超大数据回传
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
				this.reclog(this.currentKeyTag()+" "+$T("jCWZ::录制中：",":Recording: ")+this.recType
					+" "+this.recSampleRate+" "+this.recBitRate+"kbps",2);
				
				//创建音频可视化图形绘制，App环境下是在renderjs中绘制，H5、小程序等是在逻辑层中绘制，因此需要提供两段相同的代码（宽高值需要和canvas style的宽高一致）
				RecordApp.UniFindCanvas(this,[".recwave-WaveView"],`
					this.waveView=Recorder.WaveView({compatibleCanvas:canvas1, width:300, height:100});
				`,(canvas1)=>{
					this.waveView=Recorder.WaveView({compatibleCanvas:canvas1, width:300, height:100});
				});
			},(msg)=>{
				this.reclog(this.currentKeyTag()+" "+$T("hgDD::开始录音失败：",":Failed to start recording: ")+msg,1);
			});
		}
		,recPause(){
			if(RecordApp.GetCurrentRecOrNull()){
				RecordApp.Pause();
				this.reclog($T("BuDV::已暂停",":Paused"));
			}
		}
		,recResume(){
			if(RecordApp.GetCurrentRecOrNull()){
				RecordApp.Resume();
				this.reclog($T("eWM8::继续录音中...",":Resumed"));
			}
		}
		,recStop(){
			this.reclog($T("xmjS::正在结束录音...",":Stopping recording..."));
			RecordApp.Stop((aBuf,duration,mime)=>{
				//全平台通用：aBuf是ArrayBuffer音频文件二进制数据，可以保存成文件或者发送给服务器
				//App中如果在Start参数中提供了stop_renderjs，renderjs中的函数会比这个函数先执行
				
				var recSet=(RecordApp.GetCurrentRecOrNull()||{set:{type:this.recType}}).set;
				this.reclog($T("nIyX::已录制[{1}]：{2} {3}字节",":Recorded [{1}]: {2} {3}bytes",0,mime,this.formatTime(duration,1),aBuf.byteLength)
						+" "+recSet.sampleRate+"hz "+recSet.bitRate+"kbps",2);
				
				var aBuf_renderjs="this.audioData";
				
				//播放，部分格式会转码成wav播放
				this.$refs.player.setPlayBytes(aBuf,aBuf_renderjs,duration,mime,recSet,Recorder);
			},(msg)=>{
				this.reclog($T("5VqK::结束录音失败：",":Failed to end recording:")+msg,1);
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
		
		
		,getTexts(){
			uni.setNavigationBarTitle({
				title:$T("IkUi::RecordApp国际化多语言",":RecordApp internationalization in multiple languages")+" - uni-app"
			});
			return {
				moreLangs:$T("hAh0::其他语言支持办法：复制Recorder和插件的i18n目录内的Template.js文件，改个文件名，然后翻译成对应的语言，然后在页面中引入此文件即可",":Other language support methods: Copy the Template.js file in the i18n directory of the Recorder and plug-in, change the file name, then translate it into the corresponding language, and then import this file into the page.")
				,T_Type:$T("hLSC::类型",":Type")
				,T_SampleRate:$T("3EHL::采样率",":SampleRate")
				,T_BitRate:$T("L2Co::比特率",":BitRate")
				,T_req:$T("9bU5::请求录音权限",":Request recording permission")
				,T_start:$T("JUOj::开始录音",":Start recording")
				,T_stop:$T("aod9::停止录音",":Stop recording")
				,T_pause:$T("J45w::暂停",":Pause")
				,T_resume:$T("npYY::继续",":Resume")
			}
		}
		,langClick(e){
			var val=e.target.dataset.lang;
			if(val){
				var old=this.lang;
				this.setLang(val);
				if(val!=old){
					this.reclog($T("7nbd::已切换语言为：",":The language has been switched to: ")+val);
				}
			}
		}
		,setLang(val){
			uni.setStorageSync("test_page_lang",val);
			Recorder.i18n.lang=val;
			//App中传送给renderjs里面，同样赋值
			if(RecordApp.UniIsApp()){
				RecordApp.UniWebViewEval(this,'Recorder.i18n.lang="'+val+'"');
			}
			this.lang=val;
			var o=this.getTexts();
			for(var k in o){
				this[k]=o[k];
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

//可选引入可视化插件
import 'recorder-core/src/extensions/waveview.js'

/** 引入RecordApp **/
import RecordApp from 'recorder-core/src/app-support/app.js'
//【必须引入】uni-app支持文件
import '../../uni_modules/Recorder-UniCore/app-uni-support.js'

//引入语言支持文件
import 'recorder-core/src/i18n/en-US.js'
import '../../uni_modules/Recorder-UniCore/i18n/en-US.js'

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
