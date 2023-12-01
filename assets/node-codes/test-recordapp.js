/******************
《测试RecordApp》
作者：高坚果
时间：2023-09-01 19:53:26

运行： node test-recordapp.js
******************/
(async function(){
require("./-global-.js");
var jsDir=RootDir+"src/";

var Recorder=require(jsDir+"recorder-core.js");
require(jsDir+"engine/mp3.js");
require(jsDir+"engine/mp3-engine.js");
require(jsDir+"extensions/create-audio.nmn2pcm.js");

var RecordApp=require(jsDir+"app-support/app.js");
require(jsDir+"app-support/app-native-support.js");
require(RootDir+"app-support-sample/native-nodejs-test-config.js");


var okMsgs=[],errMsgs=[];

var sampleRate=48000,testPcm=[];
(function(){
Log("正在生成测试PCM...");
var addPcm=function(item){
	var obj=item.get(sampleRate);
	var pcm=new Int16Array(testPcm.length+obj.pcm.length);
	pcm.set(testPcm);
	pcm.set(obj.pcm,testPcm.length);
	testPcm=pcm;
	Log("已生成PCM："+item.name,2);
};
var pcms=Recorder.NMN2PCM.GetExamples();
addPcm(pcms.ForElise);
addPcm(pcms.DFH);
addPcm(pcms.Canon);
})();


/*************实时处理测试******************/
var testProcess=function(idx){ return new Promise(function(resolve,reject){
	Log("----------- testProcess."+idx+" -----------");
	var errTxt="";
	var Mic=RecordApp.NativeNodeJsTest_Microphone;
	if(idx==1){
		Log("已设置模拟麦克风数据源",2);
		Mic.setBuffer(testPcm,sampleRate);
	}else if(idx==2){
		errTxt="test reqErr"; Log("已设置模拟麦克风错误消息："+errTxt,2);
		Mic.setBuffer(testPcm,sampleRate,errTxt);
	}else if(idx==3){
		errTxt="test startErr"; Log("已设置模拟麦克风错误消息："+errTxt,2);
		Mic.setBuffer(testPcm,sampleRate,"",errTxt);
	}else if(idx==4){
		errTxt="test stopErr"; Log("已设置模拟麦克风错误消息："+errTxt,2);
		Mic.setBuffer(testPcm,sampleRate,"","",errTxt);
	}else{
		reject(idx+"无效"); return
	};
	var durS=10; if(errTxt)durS=2;
	
	var fail=function(err){
		if(errTxt && err.indexOf(errTxt)!=-1){
			var msg="OK 符合预期出现错误："+err;
			okMsgs.push("testProcess."+idx+": "+msg); Log(msg,2);
			resolve();
			return;
		}
		var msg="Err："+err;
		errMsgs.push("testProcess."+idx+": "+msg); Log(msg,1);
		resolve();
	};
	var stop=function(){
		Log("正在结束录音...");
		RecordApp.Stop(function(aBuf,duration,mime){
			var path=ArrayBufferSaveTempFile("test-recordapp-process.mp3", aBuf);
			var msg="OK "+path+" "+duration+"ms "+aBuf.byteLength+"字节 回调"+procCount+"次";
			okMsgs.push("testProcess."+idx+": "+msg); Log(msg,2);
			resolve();
		},fail);
	};
	var procCount=0;
	RecordApp.RequestPermission(function(){
		RecordApp.Start({
			type:"mp3",sampleRate:32000,bitRate:32
			,onProcess:function(buffers,powerLevel,duration){
				procCount++;
			}
		},function(){
			Log("正在录音，定时"+durS+"秒...");
			setTimeout(stop,durS*1000);
		},fail);
	},fail);
})};



//执行测试
await testProcess(1);
await testProcess(2);
await testProcess(3);
await testProcess(4);



//========测试结束===========
console.log("");
console.log("---------------------");
Log("RecordApp.LM:"+RecordApp.LM+" 测试结果：");
Log("\n"+okMsgs.join("\n"),2);
console.log("-----");
if(errMsgs.length) Log("\n"+errMsgs.join("\n"),1);

})();