/******************
一些功能测试代码

运行： node test.js
******************/
(async function(){
require("./-global-.js");
var jsDir=RootDir+"src/";

var Recorder=require(jsDir+"recorder-core.js");
require(jsDir+"engine/wav.js");

//SampleData用不同方法调用测试，结果存在差异
var testSampleData=function(dur){ return new Promise(function(resolve,reject){
	Log("testSampleData "+dur+"s",3);
	var sr=48000,sr2=44100;
	var pcm=new Int16Array(sr*dur);
	for(var i=0;i<pcm.length;i++)pcm[i]=i;
	
	var arr2=Recorder.SampleData([pcm],sr,sr2).data;
	
	var arr3=new Int16Array(pcm.length),idx=0,offset=0,chunk=null;
	var block=pcm.length/10,bfs=[];
	while(idx<pcm.length){
		bfs.push(pcm.subarray(idx,idx+block));
		chunk=Recorder.SampleData(bfs,sr,sr2,chunk);
		arr3.set(chunk.data,offset);
		offset+=chunk.data.length;
		idx+=block;
	}
	arr3=arr3.slice(0,offset);
	
	var arr4=Recorder.SampleData(bfs,sr,sr2).data;
	
	var val2=require('crypto').createHash("sha1").update(arr2).digest('hex');
	var val3=require('crypto').createHash("sha1").update(arr3).digest('hex');
	var val4=require('crypto').createHash("sha1").update(arr4).digest('hex');
	Log(arr2.length+" "+val2);
	Log(arr3.length+" "+val3,val3==val2?2:1);
	Log(arr4.length+" "+val4,val4==val2?2:1);
	resolve();
})};
await testSampleData(1);
await testSampleData(15);



})();