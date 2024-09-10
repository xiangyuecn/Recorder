<template>
<view></view>
</template>

<script>
import 'recorder-core';
import RecordApp from 'recorder-core/src/app-support/app.js';

export default {
	data(){ return { } },
	methods:{
		getPage(){
			var p=this.$parent;
			while(p){
				if(p.reclog) break;
				p=p.$parent;
			}
			return p;
		}
		,reclog(){
			var p=this.getPage();
			p.reclog.apply(p,arguments);
		}
		,showTest(){
			this.getPage().testMsgs=[];
			this.test().catch((e)=>{
				console.error(e);
				this.addMsg("测试出现异常："+e.message, 1);
			});
		}
		,addMsg(msg,color){
			this.getPage().addTestMsg(msg,color);
		}
		
		//测试renderjs功能调用
		,async test(){
			this.reclog("开始测试renderjs功能调用...");
			
			var runTest=(tag, timeout, asyncRun)=>{
				return new Promise((resolve, reject)=>{
					var t1=Date.now();
					this.addMsg("["+tag+"]测试中...");
					var fail=(e)=>{
						this.addMsg("["+tag+" "+(Date.now()-t1)+"ms]"+(e.message||e||"-"), 1);
						clearTimeout(timer);
						resolve()
					};
					var timer=setTimeout(()=>{ fail("测试超时") },timeout);
					asyncRun(this.getPage(), (msg)=>{
						this.addMsg("["+tag+" "+(Date.now()-t1)+"ms]"+msg, 2);
						clearTimeout(timer);
						resolve()
					},fail).catch(fail);
				});
			};
			var Sleep=(time)=>{
				return new Promise((resolve, reject)=>{
					setTimeout(resolve, time);
				});
			};
			
			
			this.addMsg('renderjs中调用逻辑层的方法，可直接用 this.$ownerInstance.callMethod("xxxFunc",{args}) 调用，二进制数据需转成base64来传递',"#aaa");
			await runTest("调用$ownerInstance", 1000, async (page__this, resolve, reject)=>{
				var list=[];
				page__this.testFunc1_main=(data)=>{
					var val=data && data.val && data.val.abc;
					list.push(val);
					if(val==456){
						if(list.join("")=="123456") resolve("OK "+list.join(""));
						else reject("值不一致");
					}
				};
				await RecordApp.UniWebViewCallAsync(page__this, {timeout:600}, `
					this.testFunc1_rjs=function(data){
						this.$ownerInstance.callMethod("testFunc1_main",{val:data});
					}
					this.testFunc1_rjs({abc:123});
					CallSuccess(); //处理成功时回调
				`);
				try{
					await RecordApp.UniWebViewCallAsync(page__this, {timeout:600}, `
						CallFail("abc123"); //处理失败时回调
					`);
					return reject("未抛异常");
				}catch(e){ console.log(e);
					if(e.message!="abc123") return reject("异常消息不一致");
				}
				RecordApp.UniWebViewVueCall(page__this, `this.testFunc1_rjs({abc:456})`);
			});
			
			
			this.addMsg('逻辑层中可通过 RecordApp.UniWebViewEval、UniWebViewVueCall、UniWebViewCallAsync 方法来调用renderjs中的方法、或在WebView中执行js代码，然后renderjs中通过RecordApp.UniWebViewSendToMain将结果返回逻辑层',"#aaa");
			await runTest("调用UniMainCallBack", 1000, async (page__this, resolve, reject)=>{
				var list=[];
				var cb1=RecordApp.UniMainCallBack((data)=>{ //一次性回调
					list.push(data.val);
				});
				var cb2=RecordApp.UniMainCallBack_Register("testFunc2",(data)=>{ //多次回调
					list.push(data.val);
					if(data.val==4){
						if(list.join("")=="124") resolve("OK "+list.join(""));
						else reject("值不一致");
					}
				});
				RecordApp.UniWebViewEval(page__this, `
					RecordApp.UniWebViewSendToMain({action:"${cb2}",val:1});
					RecordApp.UniWebViewSendToMain({action:"${cb1}",val:2}); //这个会回调
					RecordApp.UniWebViewSendToMain({action:"${cb1}",val:3}); //这个不会回调
					RecordApp.UniWebViewSendToMain({action:"${cb2}",val:4});
				`);
			});
			
			
			this.addMsg('逻辑层中可通过 RecordApp.UniWebViewEval 等方法的bigBytes参数来传递大的二进制数据到renderjs中，renderjs中可调用 RecordApp.UniWebViewSendBigBytesToMain 方法将二进制数据传回逻辑层；注意：传递大点的二进制数据会很慢',"#aaa");
			await runTest("简单二进制数据互传", 1000, async (page__this, resolve, reject)=>{
				var bytes=new Int32Array(1024/4); for(var i=0;i<bytes.length;i++)bytes[i]=i;
				var result=await RecordApp.UniWebViewCallAsync(page__this, {timeout:1000}, `
					var bytes=new Uint8Array(BigBytes);
					CallSuccess({size:bytes.byteLength}, bytes.buffer);
				`, bytes.buffer);
				var bytes2=new Int32Array(result.bigBytes);
				var ok=bytes.byteLength==bytes2.byteLength; for(var i=0;i<bytes2.length;i++)if(i!=bytes2[i])ok=false;
				if(ok) resolve("OK "+result.value.size+"字节");
				else reject("值不一致");
			});
			
			for(var i0=0;i0<3;i0++){
				var Len=i0==0?1024:i0==1?1024*1024:20*1024*1024;
				var Tag=i0==0?"1KB":i0==1?"1MB":"20MB(很慢)";
				var Timeout=i0==0?1000:i0==1?10000:90000;
				await runTest(Tag+"二进制数据互传", Timeout, async (page__this, resolve, reject)=>{
					await Sleep(1);
					var bytes=new Int32Array(Len/4); for(var i=0;i<bytes.length;i++)bytes[i]=i;
					var cb=RecordApp.UniMainCallBack((data)=>{
						var bytes2=new Int32Array(RecordApp.UniMainTakeBigBytes(data.dataID));
						var ok=bytes2.byteLength==Len; for(var i=0;i<bytes2.length;i++)if(i!=bytes2[i])ok=false;
						if(ok) resolve("OK "+data.size+"字节 "+data.timeMsg);
						else reject("值不一致");
					});
					RecordApp.UniWebViewEval(page__this, `
						var t1=Date.now();
						var bytes=new Uint8Array(BigBytes);
						var buffer=${i0}==0?bytes/*应当用bytes.buffer*/ : bytes.buffer;
						RecordApp.UniWebViewSendBigBytesToMain(buffer,function(dataID){
							var timeMsg="收"+(t1-${Date.now()})+"ms 发"+(Date.now()-t1)+"ms";
							RecordApp.UniWebViewSendToMain({action:"${cb}", timeMsg:timeMsg, size:bytes.byteLength, dataID:dataID});
						});
					`, i0==0?bytes/*应当用bytes.buffer*/ : bytes.buffer);
				});
			};
			
			
			this.addMsg("renderjs功能调用测试完成");
			this.reclog("renderjs功能调用测试完成");
		}
	}
}
</script>