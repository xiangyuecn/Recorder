<!-- uni-app内使用RecordApp录音
GitHub: https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/demo_UniApp
DCloud 插件市场下载组件: https://ext.dcloud.net.cn/plugin?name=Recorder-UniCore
-->

<template>
<view> <!-- 最外层最好是有唯一个view，否则可能会出现各种莫名其妙的bug -->
<view style="padding:5px 10px 0">
	<view><text style="font-size:24px;color:#0b1">页面内使用vue3组合式API的编写方法</text></view>
	<view><text style="font-size:13px;color:#f60">在组合式 API (Composition API) 中使用 getCurrentInstance().proxy 拿到当前组件的this，使用上就和选项式 API (Options API) 没有任何区别了。</text></view>
</view>

<view v-if="!isVue3" style="font-size:32px;color:#aaa">
	非vue3，不测试
</view>

<!-- #ifdef VUE3 -->
<view v-if="isVue3">
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
	
	<view style="padding:5px 10px 0">
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
	
	<!-- 测试 -->
	<view style="padding-top:10px">
		<view style="color:#f60" v-if="HBuilder_4_28V">{{HBuilder_4_28Tips}}</view>
		<view>
			<button size="mini" @click="traceThis">显示vue3This可用属性</button>
		</view>
		<view class="testPerfRJsLogs" v-html="traceThisHtml"></view>
	</view>
	
	<view style="padding-top:80px"></view>
</view>
<!-- #endif -->

</view>
</template>

<!-- #ifdef VUE3 -->
<script setup>
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


import { ref, getCurrentInstance, onMounted, onUnmounted } from 'vue';
import { onShow } from '@dcloudio/uni-app'
const isVue3=ref(true);
const appUseH5Rec=ref(false);
const recpowerx=ref(0);
const recpowert=ref("");
const reclogs=ref([]);

var vue3This=getCurrentInstance().proxy; //必须定义到最外面，getCurrentInstance得到的就是当前实例this


onMounted(()=>{
	reclog("onMounted");
	vue3This.isMounted=true; RecordApp.UniPageOnShow(vue3This); //onShow可能比mounted先执行，页面准备好了时再执行一次
});
onUnmounted(()=>{
	RecordApp.Stop(); //清理资源，如果打开了录音没有关闭，这里将会进行关闭
});
onShow(()=>{
	reclog("onShow");
	if(vue3This.isMounted) RecordApp.UniPageOnShow(vue3This); //onShow可能比mounted先执行，页面可能还未准备好
});


var appUseH5RecClick=()=>{
	appUseH5Rec.value=!appUseH5Rec.value;
	RecordApp.Current=null;
	reclog('切换了appUseH5Rec='+appUseH5Rec.value+'，重新请求录音权限后生效',"#f60");
};
var currentKeyTag=()=>{
	if(!RecordApp.Current) return "[?]";
	// #ifdef APP
	var tag2="Renderjs+H5";
	if(RecordApp.UniNativeUtsPlugin){
		tag2=RecordApp.UniNativeUtsPlugin.nativePlugin?"NativePlugin":"UtsPlugin";
	}
	return RecordApp.Current.Key+"("+tag2+")";
	// #endif
	return RecordApp.Current.Key;
};




var recReq=()=>{
	if(appUseH5Rec.value){//测试时指定使用h5录音
		RecordApp.UniNativeUtsPlugin=null;
	}else{
		RecordApp.UniNativeUtsPlugin={nativePlugin:true}; //恢复原生插件配置值
	}
	
	/****【在App内使用app-uni-support.js的授权许可】编译到App平台时仅供测试用（App平台包括：Android App、iOS App），不可用于正式发布或商用，正式发布或商用需先联系作者获得授权许可（编译到其他平台时无此授权限制，比如：H5、小程序，均为免费授权）
	获得授权许可后，请解开下面这行注释，并且将**部分改成你的uniapp项目的appid，即可解除所有限制；使用配套的原生录音插件或uts插件时可不进行此配置
	****/
	//RecordApp.UniAppUseLicense='我已获得UniAppID=*****的商用授权';
	
	if(RecordApp.UniIsApp()){
		RecordApp.UniWebViewVueCall(vue3This,'this.testCall("这里测试一下直接调用renderjs中的方法")')
	}
	reclog("正在请求录音权限...");
	RecordApp.UniWebViewActivate(vue3This); //App环境下必须先切换成当前页面WebView
	RecordApp.RequestPermission(()=>{
		reclog(currentKeyTag()+" 已获得录音权限，可以开始录音了",2);
	},(msg,isUserNotAllow)=>{
		if(isUserNotAllow){//用户拒绝了录音权限
			//这里你应当编写代码进行引导用户给录音权限，不同平台分别进行编写
		}
		reclog(currentKeyTag()+" "
			+(isUserNotAllow?"isUserNotAllow,":"")+"请求录音权限失败："+msg,1);
	});
}
var recStart=()=>{
	vue3This.$refs.player.setPlayBytes(null);
	
	reclog(currentKeyTag()+" 正在打开...");
	RecordApp.UniWebViewActivate(vue3This); //App环境下必须先切换成当前页面WebView
	RecordApp.Start({
		type:"mp3"
		,sampleRate:16000
		,bitRate:16
		
		,onProcess:(buffers,powerLevel,duration,sampleRate,newBufferIdx,asyncEnd)=>{
			//全平台通用：可实时上传（发送）数据，配合Recorder.SampleData方法，将buffers中的新数据连续的转换成pcm上传，或使用mock方法将新数据连续的转码成其他格式上传，可以参考Recorder文档里面的：Demo片段列表 -> 实时转码并上传-通用版；基于本功能可以做到：实时转发数据、实时保存数据、实时语音识别（ASR）等
			
			//注意：App里面是在renderjs中进行实际的音频格式编码操作，此处的buffers数据是renderjs实时转发过来的，修改此处的buffers数据不会改变renderjs中buffers，所以不会改变生成的音频文件，可在onProcess_renderjs中进行修改操作就没有此问题了；如需清理buffers内存，此处和onProcess_renderjs中均需要进行清理，H5、小程序中无此限制
			//注意：如果你要用只支持在浏览器中使用的Recorder扩展插件，App里面请在renderjs中引入此扩展插件，然后在onProcess_renderjs中调用这个插件；H5可直接在这里进行调用，小程序不支持这类插件；如果调用插件的逻辑比较复杂，建议封装成js文件，这样逻辑层、renderjs中直接import，不需要重复编写
			
			recpowerx.value=powerLevel;
			recpowert.value=formatTime(duration,1)+" / "+powerLevel;
			
			//H5、小程序等可视化图形绘制，直接运行在逻辑层；App里面需要在onProcess_renderjs中进行这些操作
			// #ifdef H5 || MP-WEIXIN
			if(vue3This.waveView){
				vue3This.waveView.input(buffers[buffers.length-1],powerLevel,sampleRate);
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
		
		,takeoffEncodeChunk:!vue3This.takeoffEncodeChunkSet?null:(chunkBytes)=>{
			//全平台通用：实时接收到编码器编码出来的音频片段数据，chunkBytes是Uint8Array二进制数据，可以实时上传（发送）出去
			//App中如果未配置RecordApp.UniWithoutAppRenderjs时，建议提供此回调，因为录音结束后会将整个录音文件从renderjs传回逻辑层，由于uni-app的逻辑层和renderjs层数据交互性能实在太拉跨了，大点的文件传输会比较慢，提供此回调后可避免Stop时产生超大数据回传
		}
		,takeoffEncodeChunk_renderjs:!vue3This.takeoffEncodeChunkSet?null:`function(chunkBytes){
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
		reclog(currentKeyTag()+" 录制中 mp3"+(appUseH5Rec.value?" appUseH5Rec":""),2);
		
		//创建音频可视化图形绘制，App环境下是在renderjs中绘制，H5、小程序等是在逻辑层中绘制，因此需要提供两段相同的代码（宽高值需要和canvas style的宽高一致）
		RecordApp.UniFindCanvas(vue3This,[".recwave-WaveView"],`
			this.waveView=Recorder.WaveView({compatibleCanvas:canvas1, width:300, height:100});
		`,(canvas1)=>{
			vue3This.waveView=Recorder.WaveView({compatibleCanvas:canvas1, width:300, height:100});
		});
	},(msg)=>{
		reclog(currentKeyTag()+" 开始录音失败："+msg,1);
	});
}
var recStop=()=>{
	reclog("正在结束录音...");
	RecordApp.Stop((aBuf,duration,mime)=>{
		//全平台通用：aBuf是ArrayBuffer音频文件二进制数据，可以保存成文件或者发送给服务器
		//App中如果在Start参数中提供了stop_renderjs，renderjs中的函数会比这个函数先执行
		
		var recSet=(RecordApp.GetCurrentRecOrNull()||{set:{type:"mp3"}}).set;
		reclog("已录制["+mime+"]："+formatTime(duration,1)+" "+aBuf.byteLength+"字节 "
				+recSet.sampleRate+"hz "+recSet.bitRate+"kbps",2);
		
		var aBuf_renderjs="this.audioData";
		
		//播放，部分格式会转码成wav播放
		vue3This.$refs.player.setPlayBytes(aBuf,aBuf_renderjs,duration,mime,recSet,Recorder);
	},(msg)=>{
		reclog("结束录音失败："+msg,1);
	});
}




var reclog=vue3This.reclog=(msg,color)=>{ //别的地方会读取this.reclog
	var now=new Date();
	var t=("0"+now.getHours()).substr(-2)
		+":"+("0"+now.getMinutes()).substr(-2)
		+":"+("0"+now.getSeconds()).substr(-2);
	var txt="["+t+"]"+msg;
	console.log(txt);
	reclogs.value.splice(0,0,{txt:txt,color:color});
}
var formatTime=(ms,showSS)=>{
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

//测试用，兼容性问题
var isHBuilder_4_28=false;
if((!vue3This.$root || !vue3This.$root.$scope) && vue3This.$scope){
	isHBuilder_4_28=true;
}
const HBuilder_4_28V=ref(isHBuilder_4_28);
const HBuilder_4_28Tips=ref('是否存在兼容问题：'+(isHBuilder_4_28?'存在':'不存在')+'，已知：仅限于使用vue3的组合式API写法时(setup)，在HBuilder 4.28.2024092502上存在和老版本不兼容问题（4.29已修复，其他新的版本未知），无法获取到vue3This.$root下面的属性，老版本4.24无此问题，使用选项式API也无此问题，新版本组件已做好了兼容适配。注意：当存在兼容问题时，别的测试页面中使用到的this.$XXX属性在组合式API中一样可能无法使用，比如this.$parent就不好使了');
if(isHBuilder_4_28) console.warn(HBuilder_4_28Tips.value); else console.log(HBuilder_4_28Tips.value);

//测试用，打印this里面的对象
var traceThis=(function(){
	var vals=["逻辑层可用：<pre style='white-space:pre-wrap'>"];
	var trace=(val)=>{
		if(/func/i.test(typeof val))val="[Func]";
		try{ val=""+val;}catch(e){val="[?"+(typeof val)+"]"}
		return '<span style="color:#bbb">='+val.substr(0,50)+'</span>';
	}
	for(var k in globalThis){
		//vals.push('globalThis.'+k);
	}
	for(var k in this){
		vals.push('this.'+k+trace(this[k]));
	}
	for(var k in this.$){
		vals.push('this.$.'+k+trace(this.$[k]));
	}
	vals.push('this.$root'+trace(this.$root));
	for(var k in this.$root){
		vals.push('this.$root.'+k+trace(this.$root[k]));
	}
	vals.push('this.$root.$vm'+trace(this.$root.$vm));
	vals.push('this.$vm'+trace(this.$vm));
	for(var k in this.$root.$vm){
		vals.push('this.$root.$vm.'+k+trace(this.$root.$vm[k]));
	}
	vals.push('this.$root.$scope'+trace(this.$root.$scope));
	vals.push('this.$scope'+trace(this.$scope));
	if(this.$root.$scope){
		for(var k in this.$root.$scope){
			vals.push('this.$root.$scope.'+k+trace(this.$root.$scope[k]));
		}
		for(var k in this.$root.$scope.$page){
			vals.push('this.$root.$scope.$page.'+k+trace(this.$root.$scope.$page[k]));
		}
	}else{
		if(this.$scope){
			for(var k in this.$scope){
				vals.push('this.$scope.'+k+trace(this.$scope[k]));
			}
			for(var k in this.$scope.$page){
				vals.push('this.$scope.$page.'+k+trace(this.$scope.$page[k]));
			}
		}
		for(var k in this.$page){
			vals.push('this.$page.'+k+trace(this.$page[k]));
		}
	}
	vals.push("</pre>");
	traceThisHtml.value=vals.join("\n	");
	
	setTimeout(()=>{
		RecordApp.UniWebViewEval(this,'traceThis__vue3_capi()');
	});
}).bind(vue3This);
const traceThisHtml=ref('');
</script>
<!-- #endif -->


<!-- #ifndef VUE3 -->
<script> //vue2
export default {
	data() {
		return {
			isVue3:false
		}
	}
}
</script>
<!-- #endif -->







<!-- #ifdef APP -->
<script module="testMainVue" lang="renderjs"> //这地方就别用组合式api了，可能不能import vue
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

export default {
	mounted(){
		//App的renderjs必须调用的函数，传入当前模块this
		RecordApp.UniRenderjsRegister(this);
		//测试用
		rjsThis=this;
	},
	methods: {
		//这里定义的方法，在逻辑层中可通过 RecordApp.UniWebViewVueCall(this,'this.xxxFunc()') 直接调用
		//调用逻辑层的方法，请直接用 this.$ownerInstance.callMethod("xxxFunc",{args}) 调用，二进制数据需转成base64来传递
		testCall(val){
			this.$ownerInstance.callMethod("reclog",'逻辑层调用renderjs中的testCall结果：'+val);
		}
	}
}

//测试用，打印this里面的对象
var rjsThis;
window.traceThis__vue3_capi=function(){
	var obj=rjsThis;
	var str="renderjs可用：<pre style='white-space:pre-wrap'>";
	var trace=(val)=>{
		if(/func/i.test(typeof val))val="[Func]";
		try{ val=""+val;}catch(e){val="[?"+(typeof val)+"]"}
		return '<span style="color:#bbb">='+val.substr(0,50)+'</span>';
	}
	for(var k in obj){
		str+='\n	this.'+k+trace(obj[k]);
	}
	for(var k in obj.$ownerInstance){
		str+='\n	this.$ownerInstance.'+k+trace(obj.$ownerInstance[k]);
	}
	for(var k in obj.$ownerInstance.$vm){
		str+='\n	this.$ownerInstance.$vm.'+k+trace(obj.$ownerInstance.$vm[k]);
	}
	for(var k in uni){
		str+='\n	uni.'+k+trace(uni[k]);
	}
	str+='</pre>';
	var el=document.querySelector('.testPerfRJsLogs');
	el.innerHTML+=str;
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
