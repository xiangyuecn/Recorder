【其他录音库参考测试】
https://collab-project.github.io/videojs-record/demo/audio-only.html  https://github.com/collab-project/videojs-record
https://www.webrtc-experiment.com/RecordRTC/ https://github.com/muaz-khan/RecordRTC
https://recorder.zhuyuntao.cn/  https://github.com/2fps/recorder


【转码成aac】
wavBlob=recLogLast.blob //Recorder录制好的wav blob
if(!window.fdkAac){
	console.log("加载 https://github.com/salomvary/fdk-aac.js 有两个文件");
	window.fdkAacWasm="https://cdn.jsdelivr.net/gh/salomvary/fdk-aac.js@ad74652b5bfe08201e98a67e74d25acfef3729d1/aac-enc.wasm"
	await import("https://cdn.jsdelivr.net/gh/salomvary/fdk-aac.js@ad74652b5bfe08201e98a67e74d25acfef3729d1/fdk-aac.umd.js");
}
fdkAac(new Uint8Array(await wavBlob.arrayBuffer()), (err, aac)=>{
	if(err) return console.error(err);
	var blob=new Blob([aac.buffer],{type:"audio/aac"});
	console.log(aac,URL.createObjectURL(blob));
});


【定时开始录音】
tDur=15000;tTime="11:10:00";
tInt=setInterval(function(){
if(new Date().toLocaleTimeString().indexOf(tTime)==0){
	clearInterval(tInt); recstart();
	setTimeout(function(){ recstop() },tDur);
} },100);


【SampleData性能测试】
//最后一个未加滤波的版本，老版本性能最好：https://xiangyuecn.gitee.io/recorder/assets/工具-GitHub页面历史版本访问.html#ver=1.2.23061000&url=xiangyuecn%3ARecorder%2C%2F
var buffers=[],disableFilter=0;
for(var i1=0;i1<60;i1++){
	var pcm=new Int16Array(48000);
	for(var i=0;i<pcm.length;i++) pcm[i]=i%0x7fff;
	buffers.push(pcm);
}
console.time(1);
for(var i=0;i<10;i++){
	pcm=Recorder.SampleData(buffers,48000,16000,{filter:disableFilter?{}:null}).data;
}
console.timeEnd(1);
//校验计算结果
//filter开启: 46e43025e4314a08b366f879fdaee17f29803237
//filter禁用: 309a2de2531ef2b7bb617212b8d18d138cc065ef
crypto.subtle.digest("sha-1",pcm.buffer).then(v=>console.log(Array.from(new Uint8Array(v)).map(v=>("0"+v.toString(16)).substr(-2)).join("")))



【WebM长时间解析测试】
//Chrome 75.0.3770.100 64位 + Win7，未复现问题：录制超过1小时出现“WebM !Track4”错误消息
//进入代码运行页面，运行 实时转码并上传-mp3专版，先执行下面的代码
var TWebMBytes=new Uint8Array(50*1000*1000),TWebMOffset=0,TWebMIsEnd=false;
var TWebMAdd=function(bytes){
	if(TWebMIsEnd)return;
	if(TWebMOffset+bytes.length>TWebMBytes.length){
		var len=~~(TWebMOffset/2);
		var tmp=new Uint8Array(TWebMBytes.length);
		tmp.set(TWebMBytes.subarray(TWebMOffset-len));
		TWebMBytes=tmp;
		TWebMOffset=len;
	}
	TWebMBytes.set(bytes,TWebMOffset);
	TWebMOffset+=bytes.length;
};
var TWebMEnd=function(){
	if(!TWebMIsEnd){
		var bytes=TWebMBytes.slice(0,TWebMOffset);
		var blob=new Blob([bytes.buffer]);
		TWebMIsEnd=URL.createObjectURL(blob);
		console.log(blob);
	}
	console.error(new Date().toLocaleString()+" 已抓取到WebM解析错误数据");
	console.log(TWebMIsEnd);
};
//控制台源码中打开recorder-core.js
//在WebM_Extract中打断点，开头位置加上条件断点: TWebMAdd(inBytes);false
//在WebM_Extract中打断点，CLog("WebM !Track"位置加上条件断点: TWebMEnd();false

