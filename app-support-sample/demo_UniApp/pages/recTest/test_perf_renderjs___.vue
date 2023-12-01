<template>
<view style="padding:0 5px">
<!-- #ifdef APP || H5 -->
	<view :evalrjs0="evalRJs0" :change:evalrjs0="testPerfRJs.evalRJs"></view>
	<view :evalrjs1="evalRJs1" :change:evalrjs1="testPerfRJs.evalRJs"></view>
	<view :evalrjs2="evalRJs2" :change:evalrjs2="testPerfRJs.evalRJs"></view>
	<view :evalrjs3="evalRJs3" :change:evalrjs3="testPerfRJs.evalRJs"></view>
	<view :evalrjs4="evalRJs4" :change:evalrjs4="testPerfRJs.evalRJs"></view>
	<view :evalrjs5="evalRJs5" :change:evalrjs5="testPerfRJs.evalRJs"></view>
	<view :evalrjs6="evalRJs6" :change:evalrjs6="testPerfRJs.evalRJs"></view>
	<view :evalrjs7="evalRJs7" :change:evalrjs7="testPerfRJs.evalRJs"></view>
	<view :evalrjs8="evalRJs8" :change:evalrjs8="testPerfRJs.evalRJs"></view>
	<view :evalrjs9="evalRJs9" :change:evalrjs9="testPerfRJs.evalRJs"></view>
<!-- #endif -->
	
	<view style="padding-top:5px;font-size:17px;font-weight: bold;color:#f60">App逻辑层与renderjs数据交互性能测试</view>
	<view style="padding-bottom:5px;font-size:12px">多种情况下不停测试：静止不动、胡乱操作、退到后台、锁屏</view>
	<view>
		点击:{{clickCount}}
		<button size="mini" @click="clickXXX">随便点击</button>
		<button size="mini" @click="traceThis">显示this可用属性</button>
	</view>
	<view>
		数据大小 <input v-model="dataSizeKB" style="width:60px;display:inline-block;border:1px solid #ddd"/>KB
		<button size="mini" @click="setDataSize10KB">10KB</button>
		<button size="mini" @click="setDataSize1MB">1MB</button>
		<button size="mini" @click="setDataSize5MB">5MB</button>
	</view>
	
	<view v-if="!canTest">
		非App或H5，不测试
	</view>
	<view v-else>
		<view>
			<button size="mini" @click="testVue">逻辑层默认vue方式发送(不可靠)</button>
			<button size="mini" @click="testStopVue">结束</button>
		</view>
		<view>
			<button size="mini" @click="testWebView">逻辑层给WebView直接发送</button>
			<button size="mini" @click="testStopWebView">结束</button>
		</view>
		<view>
			<button size="mini" @click="testRenderJS_Descriptor">renderjs ComponentDescriptor发送给 逻辑层 </button>
			<button size="mini" @click="testStopRenderJS_Descriptor">结束</button>
		</view>
		<view>
			<button size="mini" @click="testRenderJS_Bridge">renderjs UniViewJSBridge发送给 逻辑层 </button>
			<button size="mini" @click="testStopRenderJS_Bridge">结束</button>
		</view>
		<view class="testPerfRJsLogs"></view>
	</view>
</view>
</template>

<script>
export default {
data() {
	return {
		canTest:canTest,dataSizeKB:10,clickCount:0
		,evalRJs0:"",evalRJs1:"",evalRJs2:"",evalRJs3:"",evalRJs4:""
		,evalRJs5:"",evalRJs6:"",evalRJs7:"",evalRJs8:"",evalRJs9:""
	}
},
mounted(){
	if(!canTest)return;
	CallWebView('testPerfRJsLog("逻辑层btoa: '+(btoa("AB\u00ce\u00a6CD")=='QULOpkNE'?"OK":"Fail")+'")');
	this.callVue('callTestVue(-1,'+Date.now()+',"")');
	CallWebView('callTestWebView(-1,'+Date.now()+',"")');
},
methods: {
	setDataSize10KB(){
		this.dataSizeKB=10;
	}
	,setDataSize1MB(){
		this.dataSizeKB=1024;
	}
	,setDataSize5MB(){
		this.dataSizeKB=5*1024;
	}
	,clickXXX(){
		this.clickCount++;
	}
	,traceThis(){
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
		for(var k in this.$root){
			vals.push('this.$root.'+k+trace(this.$root[k]));
		}
		for(var k in this.$root.$vm){
			vals.push('this.$root.$vm.'+k+trace(this.$root.$vm[k]));
		}
		if(this.$root.$scope){
			for(var k in this.$root.$scope){
				vals.push('this.$root.$scope.'+k+trace(this.$root.$scope[k]));
			}
			for(var k in this.$root.$scope.$page){
				vals.push('this.$root.$scope.$page.'+k+trace(this.$root.$scope.$page[k]));
			}
		}
		for(var k in this.$root.$page){
			vals.push('this.$root.$page.'+k+trace(this.$root.$page[k]));
		}
		vals.push("</pre>");
		CallWebView('renderjsTraceThis(); testPerfRJsLog(`'+vals.join("\n	")+'`)');
	}
	
	,callVue(code){
		this.evalRJsIdx=(this.evalRJsIdx||0)+1;
		var idx=this.evalRJsIdx%10;
		//var idx=0;
		this["evalRJs"+idx]=code;
		//this.$forceUpdate();
	}
	
	
	,testRenderJSOnMsg(o){
		testRenderJSOnMsgFn(o);
	}
	,testRenderJS_Descriptor(){
		this.clickCount++;
		this.testStopRenderJS_Descriptor();
		CallWebView('testRenderJSStart(false,'+this.dataSizeKB+')');
		this.testStart("testRenderJS_Descriptor");
	}
	,testStopRenderJS_Descriptor(){
		this.clickCount++;
		clearInterval(this["testRenderJS_DescriptorInt"]);
	}
	,testRenderJS_Bridge(){
		this.clickCount++;
		this.testStopRenderJS_Bridge();
		CallWebView('testRenderJSStart(true,'+this.dataSizeKB+')');
		this.testStart("testRenderJS_Bridge");
	}
	,testStopRenderJS_Bridge(){
		this.clickCount++;
		clearInterval(this["testRenderJS_BridgeInt"]);
	}
	
	,testVue(){
		this.clickCount++;
		this.testStopVue();
		this.testStart("callTestVue");
	}
	,testStopVue(){
		this.clickCount++;
		clearInterval(this["callTestVueInt"]);
	}
	,testWebView(){
		this.clickCount++;
		this.testStopWebView();
		this.testStart("callTestWebView");
	}
	,testStopWebView(){
		this.clickCount++;
		clearInterval(this["callTestWebViewInt"]);
	}
	,testStart(fn){
		var txt=new Array(1024+1).join("*");
		while(txt.length<this.dataSizeKB*1024){
			txt=txt+txt;
		}
		txt=txt.substr(0,this.dataSizeKB*1024);
		var sid=0,lastTime=0;
		this[fn+"Int"]=setInterval(()=>{
			if(Date.now()-lastTime<19)return;
			lastTime=Date.now();
			sid++;
			if(fn.indexOf("testRenderJS")+1){
				CallWebView(fn+'__setInterval()');
			}else if(fn=="callTestVue"){
				this.callVue(fn+'('+sid+','+Date.now()+',"'+txt+'")');
			}else{
				CallWebView(fn+'('+sid+','+Date.now()+',"'+txt+'")');
			}
		},1);
	}
}
}


var isApp=false,isH5=false;
// #ifdef APP
isApp=true;
// #endif
// #ifdef H5
isH5=true;
// #endif
var canTest=isApp || isH5;


if(canTest){
	var testRenderJSOnMsgFn=function(o){
		CallWebView('testRenderJSOnMsgOK('+o.useBridge+','+o.sid+','+o.t1+','+Date.now()+','+o.txt.length+')');
	}
	UniServiceJSBridge.subscribe("testRenderJSOnMsg",function(val){
		testRenderJSOnMsgFn(val);
	});
	UniServiceJSBridge.subscribe("testMainOnMsg",function(val){
		CallWebView("testPerfRJsLog('UniServiceJSBridge.subscribe: "+JSON.stringify(val)+"')");
	});
}
var CallWebView=function(code){
	if(isH5){
		eval.call(window, code); return
	}
	var obj=getWebView();
	if(!obj) throw new Error("不是App环境不可调用Webview执行js");
	obj.evalJS(code);
}
var getWebView=function(){
	if(!isApp)return null;
	var pages=getCurrentPages();
	var webview=pages[pages.length-1].$getAppWebview();
	//webview=plus.webview.getLaunchWebview();
	return webview;
}
</script>










<!-- #ifdef APP || H5 -->
<script module="testPerfRJs" lang="renderjs">
export default {
mounted() {
	rjsThis=this;
	checkRJsFunc(this);
	UniViewJSBridge.publishHandler("testMainOnMsg",{msg:"UniViewJSBridge.publishHandler: renderjs mounted"});
},
methods: {
	evalRJs(code,old,owner){
		if(!code)return;
		eval.call(window, code);
	}
}
}
var rjsThis;

window.testRenderJSStart=function(useBridge,kb){
	var txt=new Array(1024+1).join("*");
	while(txt.length<kb*1024){
		txt=txt+txt;
	}
	txt=txt.substr(0,kb*1024);
	
	var sid=0;
	window["testRenderJS_"+(useBridge?"Bridge":"Descriptor")+"__setInterval"]=()=>{
		//视图层的setInterval没有逻辑层的稳定，逻辑层定时进行调用
		sid++;
		var obj={useBridge:useBridge,sid:sid,t1:Date.now(),txt:txt};
		if(useBridge){
			UniViewJSBridge.publishHandler("testRenderJSOnMsg",obj);
		}else{
			rjsThis.$ownerInstance.callMethod("testRenderJSOnMsg",obj);
		}
	};
}
window.testRenderJSOnMsgOK=function(useBridge,idx,t1,t2,strLen){
	testDraw("testRenderJSSendMsg_"+(useBridge?"Bridge":"Descriptor"), idx, t1, t2, strLen);
}


window.callTestVue=function(idx,t1,str){
	if(idx==-1){ log("调用callTestVue "+(Date.now()-t1)+"ms"); return; }
	testDraw("callTestVue", idx, t1, Date.now(), str.length);
}
window.callTestWebView=function(idx,t1,str){
	if(idx==-1){ log("调用callTestWebView "+(Date.now()-t1)+"ms"); return; }
	testDraw("callTestWebView", idx, t1, Date.now(), str.length);
}
var testDraw=function(key,idx,t1,t2,strLen){
	var scope=testDraw[key];
	if(!scope || idx==1){
		testDraw.id=(testDraw.id||0)+1;
		scope=testDraw[key]={};
		scope.lastIdx=0;
		scope.total=0;
		scope.lost=0;
		scope.list=[];
		scope.maxDur=0;
		scope.minDur=99;
		scope.maxFps=0;
		scope.minFps=99;
		scope.lastTime=0;
		scope.cls="draw"+testDraw.id;
		log(key+`性能测试：<div>
			<div style="border:1px solid #ddd;line-height:0">
				<canvas class="${scope.cls}-canvas" style="width:100%;height:120px"/>
			</div>
			<div class="${scope.cls}-state"></div>
		</div>`);
		scope.state=document.querySelector("."+scope.cls+"-state");
		scope.canvas=document.querySelector("."+scope.cls+"-canvas");
		scope.ctx=scope.canvas.getContext("2d");
		
		scope.scale=2;
		scope.canvas.width=scope.canvas.offsetWidth*scope.scale;
		scope.canvas.height=scope.canvas.offsetHeight*scope.scale;
	}
	scope.total++;
	if(idx<=scope.lastIdx){
		return;
	}
	if(scope.lastIdx+1!=idx){
		scope.lost+=idx-1-scope.lastIdx;
	}
	scope.lastIdx=idx;
	var now=t2,curTs=Math.floor(t1/1000),MaxLen=60;
	if(curTs!=Math.floor(now/1000)){
		if(1000-t1%1000<now%1000){
			curTs=Math.floor(now/1000);
		}
	}
	var last=scope.list[scope.list.length-1];
	while(!last || last.ts+1<=curTs){
		if(scope.list.length>5){
			scope.minFps=Math.min(scope.minFps,last.times.length);
		}
		last={ts:last?last.ts+1:curTs,times:[]};
		scope.list.push(last);
		if(scope.list.length>MaxLen+2)scope.list.shift();
	}
	last.times.push({t1:t1,t2:now});
	scope.maxDur=Math.max(scope.maxDur,now-t1);
	scope.minDur=Math.min(scope.minDur,now-t1);
	scope.maxFps=Math.max(scope.maxFps,last.times.length);
	if(now-scope.lastTime<200)return;
	scope.lastTime=now;
	
	scope.state.innerHTML=`${scope.total}
		<span style="color:${scope.lost?'red':'#0b1'}">错乱丢失:${scope.lost}</span>
		fps最小:${scope.minFps==99?'?':scope.minFps}
		最大:${scope.maxFps}
		fps:${(scope.list[scope.list.length-2]||last).times.length}
		数据:${Math.round(strLen/1024)}KB
		耗时最小:${scope.minDur}ms
		最大:${scope.maxDur}ms
		当前:${now-t1}ms
	`;
	
	var W=scope.canvas.width,H=scope.canvas.height;
	var ctx=scope.ctx,Left=25*scope.scale,Top=1*scope.scale,MaxFps=50;
	ctx.clearRect(0,0,W,H);
	ctx.beginPath();
	var step=(W-Left)/(MaxLen-1);
	for(var i=1,x=Left,L=scope.list.length-1;i<L;i++,x+=step) {
		var y=scope.list[i].times.length;
		y=H-Math.round((H-Top)/MaxFps*Math.min(MaxFps,y));
		if (x==Left) {
			ctx.moveTo(Math.round(x),y);
			if(i==L-1)ctx.lineTo(Math.round(x+step/2),y);
		}else {
			ctx.lineTo(Math.round(x),y);
		};
	};
	ctx.lineWidth=2*scope.scale;
	ctx.strokeStyle="#0b1";
	ctx.stroke();
	
	ctx.lineWidth=1*scope.scale;
	ctx.strokeStyle="#ddd";
	var fontSize=13*scope.scale;
	ctx.font=fontSize+'px serif';
	ctx.fillStyle='#666';
	ctx.beginPath();
	ctx.moveTo(Left,H/2);
	ctx.lineTo(W,H/2);
	ctx.stroke();
	ctx.fillText(""+MaxFps/2, 2, H/2+fontSize/3);
	
	ctx.beginPath();
	ctx.moveTo(Left,H/4);
	ctx.lineTo(W,H/4);
	ctx.stroke();
	ctx.fillText(""+MaxFps/4*3, 2, H/4+fontSize/3);
	
	ctx.beginPath();
	ctx.moveTo(Left,H/4*3);
	ctx.lineTo(W,H/4*3);
	ctx.stroke();
	ctx.fillText(""+MaxFps/4, 2, H/4*3+fontSize/3);
	ctx.fillText("0fps", 2, H-fontSize/4);
	ctx.fillText(""+MaxFps, 2, fontSize-fontSize/4);
}



var isApp=false;
// #ifdef APP
isApp=true;
// #endif

var checkRJsFunc=function(obj){
	var str="检测功能是否可用：<pre style='white-space:pre-wrap'>"+`
isApp: ${isApp}
location: ${location.href}
UA: ${navigator.userAgent}
window: ${typeof window}
uni: ${typeof uni}
uni.requireNativePlugin: ${!!uni.requireNativePlugin}
plus: ${typeof plus!="undefined"}
plus.os.name: ${typeof plus!="undefined" && plus.os.name}
UniViewJSBridge: ${typeof UniViewJSBridge}
WebViewId: ${window.__WebVieW_Id__}
btoa: ${btoa("AB\u00ce\u00a6CD")=='QULOpkNE'}
		`.trim();
	str+='</pre>';
	log(str);
}
window.renderjsTraceThis=function(){
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
	log(str);
}

var log=window.testPerfRJsLog=function(s,color){
	var now=new Date();
	var t=("0"+now.getMinutes()).substr(-2)
		+":"+("0"+now.getSeconds()).substr(-2)
		+"."+("00"+now.getMilliseconds()).substr(-3);
	var div=document.createElement("div");
	var elem=document.querySelector(".testPerfRJsLogs");
	if(!elem){ console.error("testPerfRJsLogs页面上还未准备，无法显示log："+s);return; }
	elem.insertBefore(div,elem.firstChild);
	div.innerHTML='<div style="border-top:1px dashed #666;padding:5px 0;color:'+(!color?"":color==1?"red":color==2?"#0b1":color)+'">['+t+']'+s+'</div>';
}
var div=document.createElement("div");
div.innerHTML=`
<style>
body,html{
	-webkit-user-select: auto;
	user-select: auto;
}
body{
	word-wrap: break-word;
	word-break: break-all;
}
pre{
	white-space:pre-wrap;
}
</style>
`;
document.body.appendChild(div);
</script>
<!-- #endif -->
