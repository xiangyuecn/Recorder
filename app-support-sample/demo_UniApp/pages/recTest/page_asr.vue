<!-- uni-app内使用RecordApp录音
GitHub: https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/demo_UniApp
DCloud 插件市场下载组件: https://ext.dcloud.net.cn/plugin?name=Recorder-UniCore
-->

<template>
<view>
	<view style="color:#f60;font-weight:bold;padding:10px">实时语音识别 [阿里云版] - /src/extensions/asr.aliyun.short.js</view>
	<view style="padding:0 10px">
		<text>识别语言模型：</text>
		<checkbox @click="asrLang='普通话'" :checked="asrLang=='普通话'">普通话</checkbox>
		<checkbox @click="asrLang='粤语'" :checked="asrLang=='粤语'">粤语</checkbox>
		<checkbox @click="asrLang='英语'" :checked="asrLang=='英语'">英语</checkbox>
		<checkbox @click="asrLang='日语'" :checked="asrLang=='日语'">日语</checkbox>
	</view>
	<view style="padding:0px 10px 0">
		<text>Token Api：</text>
		<input v-model="asrTokenApi" style="width:200px;display:inline-block;border:1px solid #ddd"/>
		<view style="font-size:13px;color:#999">你可以在电脑上运行Recorder仓库/assets/demo-asr内的nodejs服务器端脚本，然后填写你电脑局域网ip即可测试（H5时用127.0.0.1）</view>
		<view style="font-size:13px;color:#999">如果无法访问此api地址，比如手机上，你可以根据服务器脚本中的提示在电脑上打http地址，手动复制或自行提供 {appkey:"...",token:"..."} ，先删掉上面输入框中的url再粘贴json进去即可使用</view>
		<view style="font-size:13px;color:#fa0">如果你要在小程序中使用，需要将阿里云的ws地址也加入白名单</view>
	</view>
	
	<!-- 控制按钮 -->
	<view style="display: flex;padding-top:10px">
		<view style="width:10px"></view>
		<view style="flex:1">
			<button type="primary" @click="recStart" style="font-size:16px;padding:0">开始录音+语音识别</button>
		</view>
		<view style="width:10px"></view>
		<view style="width:120px">
			<button type="warn" @click="recStop" style="font-size:16px;padding:0">停止</button>
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
	
	<!-- 显示语音识别结果 -->
	<view style="padding:10px">
		<view style="margin:0 0 6px;font-size:12px">实时识别结果: {{asrTime}}</view>
		<view style="padding:15px 10px;min-height:50px;border:3px dashed #a2a1a1">{{asrTxt}}</view>
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
	import 'recorder-core/src/engine/wav.js'

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

//引入阿里云语音识别插件
import 'recorder-core/src/extensions/asr.aliyun.short.js'



export default {
	components: { TestPlayer },
	data() {
		return {
			asrTokenApi:""
			,asrLang:"普通话"
			,asrTime:""
			,asrTxt:""
			
			,SyncID:0 //同步操作，如果同时操作多次，之前的操作全部终止
			
			,recpowerx:0
			,recpowert:""
			,reclogs:[]
		}
	},
	mounted() {
		this.isMounted=true; RecordApp.UniPageOnShow(this); //onShow可能比mounted先执行，页面准备好了时再执行一次
		this.reclog("本测试页面只提供阿里云版的语音识别（Recorder插件：/src/extensions/asr.aliyun.short.js），目前暂未提供其他版本的语音识别插件，比如腾讯云、讯飞等，搭配使用RecordApp的onProcess实时处理，可根据自己的业务需求选择对应厂家自行对接即可，如需定制开发请联系作者。");
		
		var defaultApi="http://你电脑局域网ip:9527/token";
		// #ifdef H5
			defaultApi="http://127.0.0.1:9527/token";
		// #endif
		this.asrTokenApi=uni.getStorageSync("page_asr_asrTokenApi")||defaultApi;
	},
	/*#ifdef VUE3*/unmounted()/*#endif*/ /*#ifndef VUE3*/destroyed()/*#endif*/ {
		RecordApp.Stop(); //清理资源，如果打开了录音没有关闭，这里将会进行关闭
	},
	onShow() { //当组件用时没这个回调
		if(this.isMounted) RecordApp.UniPageOnShow(this); //onShow可能比mounted先执行，页面可能还未准备好
	},
	methods:{
		currentKeyTag(){
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
		
		
		
		//开始录音，然后开始语音识别
		,recStart(){
			var sid=++this.SyncID;
			if(!this.asrTokenApi){
				this.reclog("需要提供TokenApi",1);
				return;
			}
			if(this.asr){
				this.reclog("上次asr未关闭",1);
				return;
			}
			
			this.reclog("正在请求录音权限...");
			RecordApp.UniWebViewActivate(this); //App环境下必须先切换成当前页面WebView
			RecordApp.RequestPermission(()=>{
				this.reclog(this.currentKeyTag()+" 已获得录音权限",2);
				this.recStart__asrStart(sid);
			},(msg,isUserNotAllow)=>{
				if(isUserNotAllow){//用户拒绝了录音权限
					//这里你应当编写代码进行引导用户给录音权限，不同平台分别进行编写
				}
				this.reclog(this.currentKeyTag()+" "
					+(isUserNotAllow?"isUserNotAllow,":"")+"请求录音权限失败："+msg,1);
			});
		}
		,recStart__2(sid){ //开始录音
			if(sid!=this.SyncID){ this.reclog("sync cancel recStart__2","#f60"); return;}
			
			this.reclog(this.currentKeyTag()+" 正在打开录音...");
			RecordApp.UniWebViewActivate(this); //App环境下必须先切换成当前页面WebView
			RecordApp.Start({
				type:"wav",bitRate:16,sampleRate:16000
				,onProcess:(buffers,powerLevel,duration,sampleRate,newBufferIdx,asyncEnd)=>{
					if(sid!=this.SyncID) return;
					if(this.asr){ //已打开实时语音识别
						this.asr.input(buffers,sampleRate,newBufferIdx);
					}
					
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
					//App中是在renderjs中进行的可视化图形绘制
					if(this.waveView){
						this.waveView.input(buffers[buffers.length-1],powerLevel,sampleRate);
					}
				}`
				,stop_renderjs:`function(aBuf,duration,mime){
					//App中可以放一个函数，在Stop成功时renderjs中会先调用这里的代码，this是renderjs模块的this（也可以用This变量）
					this.audioData=aBuf; //留着给Stop时进行转码成wav播放
				}`
			},()=>{
				this.reclog(this.currentKeyTag()+" 已开始录音，请讲话（asrProcess中已限制最多识别60*2-5*(2-1)=115秒）...",2);
				
				//创建音频可视化图形绘制，App环境下是在renderjs中绘制，H5、小程序等是在逻辑层中绘制，因此需要提供两段相同的代码（宽高值需要和canvas style的宽高一致）
				RecordApp.UniFindCanvas(this,[".recwave-WaveView"],`
					this.waveView=Recorder.WaveView({compatibleCanvas:canvas1, width:300, height:100});
				`,(canvas1)=>{
					this.waveView=Recorder.WaveView({compatibleCanvas:canvas1, width:300, height:100});
				});
			},(msg)=>{
				this.reclog(this.currentKeyTag()+" 开始录音失败："+msg,1);
				this.recCancel("开始录音失败");//立即结束语音识别
			});
		}
		,recStart__asrStart(sid){ //开始语音识别
			if(sid!=this.SyncID){ this.reclog("sync cancel recStart__asrStart","#f60"); return;}
			
			//创建语音识别对象，每次识别都要新建，asr不能共用
			var asr=this.asr=Recorder.ASR_Aliyun_Short({
				tokenApi:this.asrTokenApi
				,apiArgs:{
					lang:this.asrLang
				}
				,apiRequest:uni_ApiRequest //tokenApi的请求实现方法
				,compatibleWebSocket:uni_WebSocket //返回兼容WebSocket的对象
				,asrProcess:(text,nextDuration,abortMsg)=>{
					/***实时识别结果，必须返回true才能继续识别，否则立即超时停止识别***/
					if(abortMsg){
						//语音识别中途出错
						this.reclog("[asrProcess回调]被终止："+abortMsg,1);
						this.recCancel("语音识别出错");//立即结束录音，就算继续录音也不会识别
						return false;
					};
					
					this.asrTxt=text;
					this.asrTime=("识别时长: "+this.formatTime(asr.asrDuration())
						+" 已发送数据时长: "+this.formatTime(asr.sendDuration()));
					return nextDuration<=2*60*1000;//允许识别2分钟的识别时长（比录音时长小5秒）
				}
				,log:(msg,color)=>{ this.reclog(msg,color==1?"#faa":"#aaa"); }
			});
			this.reclog("语言："+asr.set.apiArgs.lang+"，tokenApi："+asr.set.tokenApi+"，正在打开语音识别...");
			//打开语音识别，建议先打开asr，成功后再开始录音
			asr.start(()=>{//无需特殊处理start和stop的关系，只要调用了stop，会阻止未完成的start，不会执行回调
				this.reclog("已开始语音识别",2);
				this.recStart__2(sid);
			},(errMsg)=>{
				this.reclog("语音识别开始失败，请重试："+errMsg,1);
				
				this.recCancel("语音识别开始失败");
			});
		}
		
		
		
		//停止录音，结束语音识别
		,recStop(){
			++this.SyncID;
			
			this.recCancel();
		}
		,recCancel(cancelMsg){
			this.reclog("正在停止...");
			
			var asr2=this.asr;this.asr=null;//先干掉asr，防止重复stop
			if(!asr2){
				this.reclog("未开始识别",1);
			}else{
				//asr.stop 和 rec.stop 无需区分先后，同时执行就ok了
				asr2.stop((text,abortMsg)=>{
					if(abortMsg){
						abortMsg="发现识别中途被终止(一般无需特别处理)："+abortMsg;
					};
					this.reclog("语音识别完成"+(abortMsg?"，"+abortMsg:""),abortMsg?"#f60":2);
					this.reclog("识别最终结果："+text, 2);
				},(errMsg)=>{
					this.reclog("语音识别"+(cancelMsg?"被取消":"结束失败")+"："+errMsg, 1);
				});
			};
			
			RecordApp.Stop((aBuf,duration,mime)=>{
				//得到录音数据，可以试听参考
				var recSet=(RecordApp.GetCurrentRecOrNull()||{set:{type:"wav"}}).set;
				this.reclog("已录制["+mime+"]："+this.formatTime(duration,1)+" "+aBuf.byteLength+"字节 "
						+recSet.sampleRate+"hz "+recSet.bitRate+"kbps",2);
				
				var aBuf_renderjs="this.audioData";
				
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
	}
}







/*******************下面的接口实现代码可以直接copy到你的项目里面使用**********************/

/**实现apiRequest接口，tokenApi的请求实现方法**/
var uni_ApiRequest=function(url,args,success,fail){
	uni.setStorageSync("page_asr_asrTokenApi", url); //测试用的存起来
	
	//如果你已经获得了token数据，直接success回调即可，不需要发起api请求
	if(/^\s*\{.*\}\s*$/.test(url)){ //这里是输入框里面填的json数据解析直接返回
		var data; try{ data=JSON.parse(url); }catch(e){};
		if(!data || !data.appkey || !data.token){
			fail("填写的json数据"+(!data?"解析失败":"中缺少appkey或token"));
		}else{
			success({ appkey:data.appkey, token:data.token });
		}
		return;
	}
	
	//请求url获得token数据，然后通过success返回结果
	uni.request({
		url:url, data:args, method:"POST", dataType:"text"
		,header:{"content-type":"application/x-www-form-urlencoded"}
		,success:(e)=>{
			if(e.statusCode!=200){
				fail("请求出错["+e.statusCode+"]");
				return;
			}
			try{
				var data=JSON.parse(e.data);
			}catch(e){
				fail("请求结果不是json格式："+e.data);
				return;
			}
			
			//【自行修改】根据自己的接口格式提取出数据并回调
			if(data.c!==0){
				fail("接口调用错误："+data.m);
				return;
			}
			data=data.v;
			success({ appkey:data.appkey, token:data.token });
		}
		,fail:(e)=>{
			fail(e.errMsg||"请求出错");
		}
	});
};

/**实现compatibleWebSocket接口**/
var uni_WebSocket=function(url){
	//事件回调
	var ws={
		onopen:()=>{}
		,onerror:(event)=>{}
		,onclose:(event)=>{}
		,onmessage:(event)=>{}
	};
	var store=ws.storeData={};
	
	//发送数据，data为字符串或者arraybuffer
	ws.send=(data)=>{
		store.wsTask.send({ data:data });
	};
	//进行连接
	ws.connect=()=>{
		var wsTask=store.wsTask=uni.connectSocket({
			url:url
			,success:()=>{ }
			,fail:(res)=>{
				if(store.isError)return; store.isError=1;
				ws.onerror({message:"创建连接出现错误："+res.errMsg});
			}
		});
		wsTask.onOpen(()=>{
			if(store.isOpen)return; store.isOpen=1;
			ws.onopen();
		});
		wsTask.onClose((e)=>{
			if(store.isClose)return; store.isClose=1;
			ws.onclose({ code:e.code||-1, reason:e.reason||"" });
		});
		wsTask.onError((e)=>{
			if(store.isError)return; store.isError=1;
			ws.onerror({ message:e.errMsg||"未知错误" });
		});
		wsTask.onMessage((e)=>{ ws.onmessage({data:e.data}); });
	};
	//关闭连接
	ws.close=(code,reason)=>{
		var obj={};
		if(code!=null)obj.code=code;
		if(reason!=null)obj.reason=reason;
		store.wsTask.close(obj);
	};
	return ws;
};
</script>




<!-- #ifdef APP -->
<script module="testMainVue" lang="renderjs">
/**============= App中在renderjs中引入RecordApp，这样App中也能使用H5录音、音频可视化 =============**/
/** 先引入Recorder **/
import Recorder from 'recorder-core';

//按需引入需要的录音格式编码器，用不到的不需要引入，减少程序体积；H5、renderjs中可以把编码器放到static文件夹里面用动态创建script来引入，免得这些文件太大
import 'recorder-core/src/engine/wav.js'

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
