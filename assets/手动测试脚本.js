【其他录音库参考测试】
https://collab-project.github.io/videojs-record/demo/audio-only.html  https://github.com/collab-project/videojs-record
https://www.webrtc-experiment.com/RecordRTC/ https://github.com/muaz-khan/RecordRTC
https://recorder.zhuyuntao.cn/  https://github.com/2fps/recorder



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


