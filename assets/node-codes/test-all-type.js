/******************
《测试所有音频编码类型》
作者：高坚果
时间：2023-07-20 21:11:49

运行： node test-all-type.js [dist]
******************/
(async function(){
require("./-global-.js");
var UseDistJs=global.UseDistJs||process.argv.indexOf("dist")!=-1;
if(UseDistJs) Log("UseDistJs",3);
var jsDir=RootDir+(UseDistJs?"dist/":"src/");

var UseClearCount=global.UseClearCount;
var ccDir="./temp/clearUncalledFunc/";

var Recorder=require(jsDir+"recorder-core.js");
require(jsDir+"engine/mp3.js");
if(UseClearCount)require(ccDir+"mp3-engine.js");
else if(!UseDistJs)require(jsDir+"engine/mp3-engine.js");
require(jsDir+"engine/pcm.js");
require(jsDir+"engine/wav.js");
require(jsDir+"engine/g711x.js");
require(jsDir+"engine/beta-webm.js");
require(jsDir+"engine/beta-amr.js");
if(UseClearCount)require(ccDir+"beta-amr-engine.js");
else if(!UseDistJs)require(jsDir+"engine/beta-amr-engine.js");
require(jsDir+"engine/beta-ogg.js");
if(UseClearCount)require(ccDir+"beta-ogg-engine.js");
else if(!UseDistJs)require(jsDir+"engine/beta-ogg-engine.js");
		Recorder.OggVorbisEncoder.Module.StaticSeed=true;//让ogg每次生成文件相同

require(jsDir+"extensions/create-audio.nmn2pcm.js");
require(jsDir+"extensions/buffer_stream.player.js");
require(jsDir+"extensions/sonic.js");

var okMsgs=[],errMsgs=[];

var sampleRate=48000,testPcm=[],test2Pcm=[];
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

var hbd=pcms.HappyBirthday.get(sampleRate);
Log("已生成PCM："+pcms.HappyBirthday.name,2);
while(test2Pcm.length<testPcm.length){
	var pcm=new Int16Array(test2Pcm.length+hbd.pcm.length);
	pcm.set(test2Pcm);
	pcm.set(hbd.pcm,test2Pcm.length);
	test2Pcm=pcm;
}
})();

/*************音频编码测试******************/
var testEncode=async function(type,hash,hashSr,hashBr,notSupport){
	Log("----------- testEncode:"+type+(hashSr?" "+hashSr+" "+hashBr:"")+" -----------");
	//====验证编码结果hash====
await new Promise(function(resolve,reject){ if(!hash){ resolve(); return; }
	//生成一段正弦波，可以copy下面代码到浏览器里面生成hash
	var isWeb=typeof window=="object";
	if(isWeb){ type="";
		var sampleRate=16000,bitRate=16,dur=90;
		if(!type)throw "type?";
		if(Date._now)Date.now=Date._now; Date._now=Date.now;
		if(type=="ogg"){Date.now=()=>{return 1262390400000}; Recorder.OggVorbisEncoder.Module&&(Recorder.OggVorbisEncoder.Module.StaticSeed=true);}
	}else{
		var dur=90;
		if(/^([\d\.]+)s_(\w+)/.test(hash)){
			dur=+RegExp.$1; hash=RegExp.$2;
		}
		var sampleRate=hashSr||16000,bitRate=hashBr||16;
	}
	if(type=="amr")sampleRate=8000;
	var pcm=new Int16Array(sampleRate*dur);
	for(var i=0;i<pcm.length;i++){
		pcm[i]=~~(Math.sin((2 * Math.PI) * 600 * (i / sampleRate))*0x7FFF);
	}
	var rec=Recorder({type:type,bitRate:bitRate,sampleRate:sampleRate});
	rec.envStart({ envName:"nodejs",canProcess:true },sampleRate);
	
	var idx=0;
	while(idx<pcm.length){
		var endIdx=~~(idx+sampleRate/10),idx2=Math.min(pcm.length,endIdx);
		if(type=="ogg"){
			endIdx=~~(idx+sampleRate);idx2=Math.min(pcm.length,endIdx);//老版本一次输入1秒数据，不同大小会导致第一个数据页头不一致
			if(idx2>=pcm.length && Recorder.OggVorbisEncoder.Module){ idx2--; }//老版本bug:少一个采样数据
		}
		var chunk=pcm.slice(idx,idx2);
		idx=endIdx;
		rec.envIn(chunk,0);
	};
	rec.stop(function(blob){
		if(!isWeb){
			var val=require('crypto').createHash("sha1").update(new Uint8Array(blob)).digest('hex').substr(0,8);
			if(val.toLowerCase()==hash.toLowerCase()){
				var msg="OK "+type+" "+sampleRate+" "+bitRate+" "+dur+"s hash："+val;
				Log(msg,2);
			}else{
				var msg="Err "+type+" "+sampleRate+" "+bitRate+" "+dur+"s hash："+val+" != "+hash;
				errMsgs.push("testEncode: "+msg); Log(msg,1);
			}
			if(!Recorder[type+"2wav"]){
				resolve(); return;
			}
			var toWavSet=blob;
			if(type=="pcm"){
				toWavSet={blob:blob,sampleRate:sampleRate,bitRate:bitRate};
			}
			Recorder[type+"2wav"](toWavSet,function(aBuf,duration){
				if(Math.abs(duration-dur*1000)>100){
					var msg="Err "+type+" "+sampleRate+" "+bitRate+" "+dur+"s 转码成wav时长错误："+duration+"ms";
					errMsgs.push("testEncode: "+msg); Log(msg,1);
				}else{
					Log("已转码成wav："+duration+"ms",2);
				}
				resolve();
			},function(msg){ throw msg });
			return;
		}
		console.log(URL.createObjectURL(blob));
		blob.arrayBuffer().then(buf=>{
			var bytes=new Uint8Array(buf),b0Len=0;
			for(var i=bytes.length-1;i>=0;i--){ if(bytes[i]==0)b0Len++;else break; }
			if(type=="amr" && b0Len>3){//老版本bug:去掉amr结尾错误的0
				buf=buf.slice(0,bytes.length-b0Len);
			}
			crypto.subtle.digest("sha-1",buf).then(v=>{
				var val=Array.from(new Uint8Array(v))
					.map(v=>("0"+v.toString(16)).substr(-2))
					.join("");
				console.log(type+" "+sampleRate+" "+bitRate+" "+dur+"s: "+val.substr(0,8));
			});
		});
	},function(msg){ throw msg });
	//copy到这为止
});
	if(hashSr)return;
	
	//====编码文件保存====
await new Promise(function(resolve,reject){
	var t1=Date.now();
	var rec=Recorder({type:type,bitRate:16,sampleRate:16000});
	rec.mock(testPcm,sampleRate);
	rec.stop(function(blob,duration){
		var t2=Date.now();
		var path=ArrayBufferSaveTempFile("test-type-encode-"+type+"."+type, blob);
		var msg="OK "+type+" "+path+" "+duration+"ms "+blob.byteLength+"字节 耗时"+(t2-t1)+"ms";
		okMsgs.push("testEncode: "+msg); Log(msg,2);
		
		if(!Recorder[type+"2wav"]){
			resolve(); return;
		}
		t1=Date.now();
		Recorder[type+"2wav"](blob,function(blob,duration){
			t2=Date.now();
			var path=ArrayBufferSaveTempFile("test-type-encode-"+type+"2wav.wav", blob);
			var msg="OK "+type+"2wav "+path+" "+duration+"ms "+blob.byteLength+"字节 耗时"+(t2-t1)+"ms";
			okMsgs.push("testEncode: "+msg); Log(msg,2);
			resolve();
		},function(err){
			var msg="Err "+type+"2wav："+err;
			errMsgs.push("testEncode: "+msg); Log(msg,1);
			resolve();
		});
	},function(err){
		if(notSupport){
			var msg="OK "+type+" 符合预期不支持："+err;
			okMsgs.push("testEncode: "+msg); Log(msg,2);
		}else{
			var msg="Err "+type+"："+err;
			errMsgs.push("testEncode: "+msg); Log(msg,1);
		}
		resolve();
	});
})};


/*************实时处理测试******************/
var testWebProcess=function(){ return new Promise(function(resolve,reject){
	Log("----------- testWebProcess -----------");
	var rec=Recorder();
	rec.open(function(){
		var msg="Err open成功，不符合预期";
		errMsgs.push("testWebProcess: "+msg); Log(msg,1);
		resolve();
	},function(err){
		var msg="OK 符合预期不能open："+err;
		okMsgs.push("testWebProcess: "+msg); Log(msg,2);
		resolve();
	});
})};
var testProcess=function(){ return new Promise(function(resolve,reject){
	Log("----------- testProcess -----------");
	var nextRun=function(run){
		nextCalls.push(run);
		clearTimeout(nextInt);
		nextInt=setTimeout(function(){
			var arr=nextCalls; nextCalls=[];
			for(var i=0;i<arr.length;i++){
				arr[i]();
			}
		});
	};
	var nextCalls=[],nextInt;
	
	var end=function(){
		thread--;
		if(thread==0) resolve();
	};
	var thread=0;
	
	thread++; procExec("mp3",1,nextRun,end);//同时进行多个编码测试，检测编码器是否正常
	thread++; procExec("mp3",2,nextRun,end);
	
	thread++; procExec("pcm",1,nextRun,end);
	thread++; procExec("pcm",2,nextRun,end);
	
	thread++; procExec("g711a",1,nextRun,end);
	thread++; procExec("g711a",2,nextRun,end);
	
	thread++; procExec("amr",1,nextRun,end);
	thread++; procExec("amr",2,nextRun,end);
	
	thread++; procExec("ogg",1,nextRun,end);
	thread++; procExec("ogg",2,nextRun,end);
})};
var procExec=function(type,test2,nextRun,end){
	Log("-- procExec "+type+" --");
	var envInfo={ envName:"nodejs",canProcess:true };
	
	var chunks=new Uint8Array(0),procCount=0,takeCount=0;
	var rec=Recorder({type:type,bitRate:16,sampleRate:16000,disableEnvInFix:true
		,onProcess:function(buffers,powerLevel,duration){
			procCount++;
		}
		,takeoffEncodeChunk:function(bytes){
			takeCount++;
			var arr=new Uint8Array(chunks.length+bytes.length);
			arr.set(chunks);
			arr.set(bytes,chunks.length);
			chunks=arr;
		}
	});
	rec.envStart(envInfo,sampleRate);
	var recStop=function(){
		rec.stop(function(blob,duration){
			blob=chunks.buffer;
			var path=ArrayBufferSaveTempFile("test-type-process-"+type+"-"+test2+"."+type, blob);
			var msg="OK "+type+"-"+test2+" "+path+" "+duration+"ms "+blob.byteLength+"字节 回调"+procCount+"次 "+takeCount+"片";
			okMsgs.push("testProcess: "+msg); Log(msg,2);
			end();
		},function(err){
			var msg="Err "+type+"-"+test2+"："+err;
			errMsgs.push("testProcess: "+msg); Log(msg,1);
			end();
		});
	};
	
	//模拟实时音频数据输入
	var idx=0;
	var run=function(){
		var pcm=test2==1?testPcm:test2Pcm;
		if(idx>=pcm.length){
			recStop();
			return;
		};
		var endIdx=~~(idx+sampleRate/10);
		var chunk=pcm.slice(idx,endIdx);
		idx=endIdx;
		rec.envIn(chunk,0);
		
		nextRun(run);
	};
	run();
};


/*************插件测试******************/
var testBufferStreamPlayer=function(){ return new Promise(function(resolve,reject){
	Log("----------- testBufferStreamPlayer -----------");
	var stream=Recorder.BufferStreamPlayer();
	stream.start(function(){
		var msg="Err start成功，不符合预期";
		errMsgs.push("testBufferStreamPlayer: "+msg); Log(msg,1);
		resolve();
	},function(err){
		var msg="OK 符合预期不能start："+err;
		okMsgs.push("testBufferStreamPlayer: "+msg); Log(msg,2);
		resolve();
	});
})};
var testSonic=function(){ return new Promise(function(resolve,reject){
	Log("----------- testSonic -----------");
	var sonic=Recorder.Sonic.Async({sampleRate:sampleRate});
	if(sonic!=null){
		var msg="Err Sonic.Async创建成功，不符合预期";
		errMsgs.push("testSonic: "+msg); Log(msg,1);
	}else{
		var msg="OK Sonic.Async符合预期不能创建";
		okMsgs.push("testSonic: "+msg); Log(msg,2);
	}
	
	var t1=Date.now();
	var sonic=Recorder.Sonic({sampleRate:sampleRate});
	sonic.setPitch(0.5);
	var pcm1=sonic.input(testPcm);
	var pcm2=sonic.flush();
	var t2=Date.now();
	var pcm=new Int16Array(pcm1.length+pcm2.length);
	pcm.set(pcm1);
	pcm.set(pcm2,pcm1.length);
	if(pcm.length!=testPcm.length){
		var msg="Err 处理结果数据长度错误："+pcm.length+"!="+testPcm.length;
		errMsgs.push("testSonic: "+msg); Log(msg,1);
	}
	
	var rec=Recorder({type:"wav",bitRate:16,sampleRate:16000});
	rec.mock(pcm,sampleRate);
	rec.stop(function(blob,duration){
		var path=ArrayBufferSaveTempFile("test-type-sonic.wav", blob);
		var msg="OK Sonic "+path+" "+duration+"ms "+blob.byteLength+"字节 耗时"+(t2-t1)+"ms";
		okMsgs.push("testSonic: "+msg); Log(msg,2);
		resolve();
	});
})};


//执行测试
if(1){
	await testEncode("mp3","b209dc67");
	await testEncode("mp3","530584d4",8000,8);
	await testEncode("mp3","d61d1d18",8000,96);
	await testEncode("mp3","444fb268",16000,32);
	await testEncode("mp3","ca9f1435",16000,56);
	await testEncode("mp3","9ace82c4",32000,64);
	await testEncode("mp3","d8c2b12a",48000,96);
	await testEncode("mp3","eeee6f23",48000,56);
	await testEncode("mp3","acd13450",48000,16);
	await testEncode("mp3","0.1s_b18a6d3b",16000,16);
	await testEncode("mp3","0.1s_a5c69708",48000,56);
	await testEncode("mp3","0.1s_49b8934b",48000,96);
	await testEncode("mp3","0.5s_66c6230b",8000,8);
	await testEncode("mp3","0.5s_4a70d3e7",16000,56);
	await testEncode("mp3","0.5s_ed740b5e",48000,96);
	
	await testEncode("wav","7564b0e1");
	await testEncode("wav","e3351f37",8000,8);
	await testEncode("pcm","68734486");
	await testEncode("pcm","e89ff730",8000,8);
	
	await testEncode("g711a","05af4d69",8000);
	await testEncode("g711u","738015dd",8000);
	await testEncode("webm","",0,0,1);
	
	await testEncode("amr","3da0ed48");
	await testEncode("amr","3da0ed48",8000,12.2);
	await testEncode("amr","52eb6b77",8000,10.2);
	await testEncode("amr","112c06c1",8000,7.95);
	await testEncode("amr","e33dfccb",8000,7.4);
	await testEncode("amr","5c4ed9f8",8000,6.7);
	await testEncode("amr","81525d55",8000,5.9);
	await testEncode("amr","ba2b9a84",8000,5.15);
	await testEncode("amr","b9dd66ed",8000,4.75);
	await testEncode("amr","0.1s_b47ef795",16000,16);
	await testEncode("amr","0.5s_5266e677",16000,16);
	
	await testEncode("ogg","e3616938");
	await testEncode("ogg","4447adc3",8000,8);
	await testEncode("ogg","b625c073",8000,96);
	await testEncode("ogg","5fec9a43",16000,32);
	await testEncode("ogg","fe1e4f30",16000,56);
	await testEncode("ogg","dd92dbed",32000,64);
	await testEncode("ogg","dd338501",48000,96);
	await testEncode("ogg","2f6952f4",48000,56);
	await testEncode("ogg","e0ac22e5",48000,16);
	await testEncode("ogg","0.1s_92622d8b",16000,16);
	await testEncode("ogg","0.1s_fb886b30",48000,56);
	await testEncode("ogg","0.1s_cbca8923",48000,96);
	await testEncode("ogg","0.5s_f1a670a2",8000,8);
	await testEncode("ogg","0.5s_2c7e3b3e",16000,56);
	await testEncode("ogg","0.5s_fc5e890d",48000,96);
}
if(1){
	await testWebProcess();
	await testProcess();
}
if(1){
	await testBufferStreamPlayer();
	await testSonic();
}



//========测试结束===========
console.log("");
console.log("---------------------");
Log("Recorder.LM:"+Recorder.LM+" 测试结果：");
Log("\n"+okMsgs.join("\n"),2);
console.log("-----");
if(errMsgs.length) Log("\n"+errMsgs.join("\n"),1);


//调用的代码中存在函数调用次数统计，保存统计结果
if(global.ClearFunc$Call){
	console.log("");
	console.log("-------函数调用次数统计-------");
	ClearFunc$Call.Save();
}

})();