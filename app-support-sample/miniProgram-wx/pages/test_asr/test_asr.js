// https://github.com/xiangyuecn/Recorder

/** npm支持太差，直接复制Recorder的src源码目录到小程序一个目录内，然后正常引用即可 **/
//先引入Recorder，和需要的格式编码器
var Recorder=require("../../copy-rec-src/src/recorder-core.js");
require("../../copy-rec-src/src/engine/wav.js");

//引入可视化插件
require("../../copy-rec-src/src/extensions/waveview.js");

//引入RecordApp
var RecordApp=require("../../copy-rec-src/src/app-support/app.js");
//引入RecordApp的微信小程序支持文件
require("../../copy-rec-src/src/app-support/app-miniProgram-wx-support.js");

//引入阿里云语音识别插件
require("../../copy-rec-src/src/extensions/asr.aliyun.short.js");



Page({
	onShow(){
		//当使用到录音的页面onShow时进行一次调用，用于恢复被暂停的录音（比如按了home键会暂停录音）
		RecordApp.MiniProgramWx_onShow();
	}
	
	
	
	//开始录音，然后开始语音识别
	,recStart(){
		var sid=++this.SyncID;
		if(!this.data.asrTokenApi){
			this.reclog("需要提供TokenApi",1);
			return;
		}
		if(this.asr){
			this.reclog("上次asr未关闭",1);
			return;
		}
		var player=this.selectComponent('.player');
		player.setPage(this); player.setPlayFile(null);
		
		this.reclog("正在请求录音权限...");
		RecordApp.RequestPermission(()=>{
			this.reclog("已获得录音权限",2);
			this.recStart__asrStart(sid);
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
	,recStart__2(sid){ //开始录音
		if(sid!=this.SyncID){ this.reclog("sync cancel recStart__2","#f60"); return;}
		
		this.reclog("正在打开录音...");
		RecordApp.Start({
			type:"wav",bitRate:16,sampleRate:16000
			,onProcess:(buffers,powerLevel,duration,sampleRate,newBufferIdx,asyncEnd)=>{
				if(sid!=this.SyncID) return;
				if(this.asr){ //已打开实时语音识别
					this.asr.input(buffers,sampleRate,newBufferIdx);
				}
				
				//可视化图形绘制
				this.setData({
					recpowerx:powerLevel
					,recpowert:this.formatTime(duration,1)+" / "+powerLevel
				});
				if(this.waveView){
					this.waveView.input(buffers[buffers.length-1],powerLevel,sampleRate);
				}
			}
		},()=>{
			this.reclog("已开始录音，请讲话（asrProcess中已限制最多识别60*2-5*(2-1)=115秒）...",2);
			
			//创建音频可视化图形绘制
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
			getCanvas(".recwave-WaveView",(canvas)=>{
				this.waveView=Recorder.WaveView({compatibleCanvas:canvas, width:300, height:100});
			});
		},(msg)=>{
			this.reclog("开始录音失败："+msg,1);
			this.recCancel("开始录音失败");//立即结束语音识别
		});
	}
	,recStart__asrStart(sid){ //开始语音识别
		if(sid!=this.SyncID){ this.reclog("sync cancel recStart__asrStart","#f60"); return;}
		
		//创建语音识别对象，每次识别都要新建，asr不能共用
		var asr=this.asr=Recorder.ASR_Aliyun_Short({
			tokenApi:this.data.asrTokenApi
			,apiArgs:{
				lang:this.data.asrLang
			}
			,apiRequest:wx_ApiRequest //tokenApi的请求实现方法
			,compatibleWebSocket:wx_WebSocket //返回兼容WebSocket的对象
			,asrProcess:(text,nextDuration,abortMsg)=>{
				/***实时识别结果，必须返回true才能继续识别，否则立即超时停止识别***/
				if(abortMsg){
					//语音识别中途出错
					this.reclog("[asrProcess回调]被终止："+abortMsg,1);
					this.recCancel("语音识别出错");//立即结束录音，就算继续录音也不会识别
					return false;
				};
				
				this.setData({
					asrTxt:text
					,asrTime:("识别时长: "+this.formatTime(asr.asrDuration())
					+" 已发送数据时长: "+this.formatTime(asr.sendDuration()))
				});
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
			var recSet=RecordApp.GetCurrentRecOrNull().set;
			this.reclog("已录制["+mime+"]："+duration+"ms "+aBuf.byteLength+"字节 "
				+recSet.sampleRate+"hz "+recSet.bitRate+"kbps",2);
			
			this.selectComponent('.player').setPlayFile(aBuf,duration,mime,recSet);
		},(msg)=>{
			this.reclog("结束录音失败："+msg,1);
		});
	}
	
	
	




	,data: {
		asrTokenApi:""
		,asrLang:"普通话"
		,asrTime:""
		,asrTxt:""
		
		,reclogs:[]
	}
	,onLoad(options) {
		this.reclog("本测试页面只提供阿里云版的语音识别（Recorder插件：/src/extensions/asr.aliyun.short.js），目前暂未提供其他版本的语音识别插件，比如腾讯云、讯飞等，搭配使用RecordApp的onProcess实时处理，可根据自己的业务需求选择对应厂家自行对接即可，如需定制开发请联系作者。");
		
		var defaultApi="http://你电脑局域网ip:9527/token";
		if(wx.getSystemInfoSync().platform=="devtools"){
			defaultApi="http://127.0.0.1:9527/token";
		}
		this.setData({ asrTokenApi: wx.getStorageSync("page_asr_asrTokenApi")||defaultApi });
		
		this.SyncID=0; //同步操作，如果同时操作多次，之前的操作全部终止
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
	,asrLangClick(res){
		var val=res.target.dataset.val;
		if(val){
			this.setData({ asrLang:val });
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

});





/*******************下面的接口实现代码可以直接copy到你的项目里面使用**********************/

/**实现apiRequest接口，tokenApi的请求实现方法**/
var wx_ApiRequest=function(url,args,success,fail){
	wx.setStorageSync("page_asr_asrTokenApi", url); //测试用的存起来
	
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
	wx.request({
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
var wx_WebSocket=function(url){
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
		var wsTask=store.wsTask=wx.connectSocket({
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



