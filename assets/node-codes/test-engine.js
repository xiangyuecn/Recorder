/******************
《测试几个带engine的编码器》
作者：高坚果
时间：2023-09-25 20:51:06

运行： node test-engine.js [type=mp3] [br=16] [dist] [full][fast][save] [big][loop]
			type=mp3|ogg|amr
			br=16 只测试这个比特率
			dist 使用压缩版js进行测试
			full 进行完整测试，会测试时长为1小时的音频编码，测试会很慢
			fast 进行快速测试，最长测试1秒的音频编码，测试会很快
			big 只进行超长时间编码测试
			loop 循环进行测试，不结束
			oggFullFast ogg全采样率测试
			save 保存一个文件，然后退出，用于检查音频内容
******************/
(async function(){
require("./-global-.js");
var argv=" "+process.argv.join(" ");
var FastTest=global.FastTest||process.argv.indexOf("fast")!=-1;
if(FastTest) Log("FastTest",3);

var FullTest=global.FullTest||process.argv.indexOf("full")!=-1;
if(FullTest) Log("FullTest",3);

var TestBig=process.argv.indexOf("big")!=-1;
if(TestBig) Log("TestBig",3);
var TestLoop=process.argv.indexOf("loop")!=-1;
if(TestLoop) Log("TestLoop",3);
var TestSave=process.argv.indexOf("save")!=-1;
if(TestSave) Log("TestSave",3);
var OggFullFast=process.argv.indexOf("oggFullFast")!=-1;
if(OggFullFast) Log("OggFullFast",3);

var TestType=""; if(/ type=(\w+)/.test(argv))TestType=RegExp.$1;
if(TestType) Log("TestType="+TestType,3);

var TestBitRate=0; if(/ br=([\d\.]+)/.test(argv))TestBitRate=+RegExp.$1;
if(TestBitRate) Log("TestBitRate="+TestBitRate,3);

var UseDistJs=global.UseDistJs||process.argv.indexOf("dist")!=-1;
if(UseDistJs) Log("UseDistJs",3);
var jsDir=RootDir+(UseDistJs?"dist/":"src/");

var Recorder=require(jsDir+"recorder-core.js");
require(jsDir+"engine/wav.js");
require(jsDir+"engine/mp3.js");
if(!UseDistJs)require(jsDir+"engine/mp3-engine.js");
require(jsDir+"engine/beta-amr.js");
if(!UseDistJs)require(jsDir+"engine/beta-amr-engine.js");
require(jsDir+"engine/beta-ogg.js");
if(!UseDistJs)require(jsDir+"engine/beta-ogg-engine.js");
		Recorder.OggVorbisEncoder.Module.StaticSeed=true;//让ogg每次生成文件相同

require(jsDir+"extensions/create-audio.nmn2pcm.js");

var fs=require("fs");
var sampleRate=48000,testPcmFile=[],testPcm=[],noisePcm=[];
(function(){
var file="temp/test-engine-48k.wav";
if(fs.existsSync(file)){
	var buf=fs.readFileSync(file).buffer;
	testPcmFile=new Int16Array(buf).subarray(44/2);
	
	testPcm=new Int16Array(testPcmFile.length);
	var bLen=~~(testPcmFile.length/2);
	testPcm.set(testPcmFile.subarray(bLen),0);
	testPcm.set(testPcmFile.subarray(0,bLen),testPcmFile.length-bLen);
	Log("已读取PCM："+file+" "+FormatMs(~~(testPcm.length/sampleRate*1000)),2);
}else{
	Log("正在生成测试PCM（未找到"+file+"）...");
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
};

noisePcm=new Int16Array(testPcm.length);
for(var i=0;i<noisePcm.length;i++){
	noisePcm[i]=0x7fff-Math.random()*0x7fff*2;
}
})();
Log("3秒后开始测试...");
await Sleep(3000);



var testEngine=async function(type,sr,br,fast){
	await testExec(type,sr,br,testPcm,100);
	await testExec(type,sr,br,noisePcm,100);
	
	await testExec(type,sr,br,testPcm,500);
	await testExec(type,sr,br,noisePcm,500);
	
	await testExec(type,sr,br,testPcm,1000);
	await testExec(type,sr,br,noisePcm,1000);
	
	if(fast || FastTest)return;
	await testExec(type,sr,br,testPcm,5000);
	await testExec(type,sr,br,noisePcm,5000);
	
	await testExec(type,sr,br,testPcm,10000);
	await testExec(type,sr,br,noisePcm,10000);
	
	await testExec(type,sr,br,testPcm,30000);
	await testExec(type,sr,br,noisePcm,30000);
	
	await testExec(type,sr,br,testPcm,60000,1);
	await testExec(type,sr,br,noisePcm,60000,1);
	
	if(!FullTest)return;
	await testExec(type,sr,br,testPcm,2*60000,1);
	await testExec(type,sr,br,noisePcm,2*60000,1);
	
	await testExec(type,sr,br,testPcm,10*60000,1);
	await testExec(type,sr,br,noisePcm,10*60000,1);
	
	await testExec(type,sr,br,testPcm,60*60000,1);
	await testExec(type,sr,br,noisePcm,60*60000,1);
};
var getPcm=function(pcm,dur){
	var size=~~(sampleRate/1000*dur);
	if(size<pcm.length){
		return pcm.slice(0,size);
	}
	var val=new Int16Array(size),idx=0;
	while(idx<size){
		if(idx+pcm.length<=size){
			val.set(pcm,idx);
		}else{
			val.set(pcm.subarray(0,size-idx),idx);
		}
		idx+=pcm.length;
	}
	return val;
};
var StartTime=Date.now();
var testExec=function(type,sr,br,srcPcm,dur,fast){ return new Promise(function(resolve,reject){
	var Tag="testExec "+type+" "+sr+" "+br
		+" "+(dur<60000?dur/1000+"秒":dur/60000+"分钟")
		+" "+(srcPcm==noisePcm?"noisePcm":"testPcm");
	Log("------ "+Tag+(TestLoop?" loop:"+LoopCount:"")
		+" 已耗时："+FormatMs(Date.now()-StartTime)+" ------",3);
	dur=dur>1000?dur+123:dur+3;
	var pcm=getPcm(srcPcm,dur);
	
	var testMock=function(next){
		var rec=Recorder({type:type,sampleRate:sr,bitRate:br});
		rec.mock(pcm,sampleRate);
		rec.stop(function(blob){
			if(TestSave && dur==60123){
				var path=ArrayBufferSaveTempFile("test-engine-save-"+(srcPcm==noisePcm?"noisePcm":"testPcm")+"."+type,blob);
				Log("文件已保存在："+path,2);
				if(srcPcm==noisePcm){
					process.exit(0);
				}
			};
			var val=require('crypto').createHash("sha1").update(new Uint8Array(blob)).digest('hex');
			if(!Recorder[type+"2wav"]){
				next(blob,val); return;
			}
			Recorder[type+"2wav"](blob,function(b,duration){
				if(Math.abs(duration-dur)>100){
					var msg="转码成wav时长错误："+FormatMs(duration);
					errMsgs.push("Err "+Tag+" "+msg); Log("Err "+msg,1);
				}else{
					Log("已转码成wav："+FormatMs(duration));
				}
				next(blob,val); return;
			},function(msg){ throw msg });
		},function(msg){ throw msg });
	};
	var testEnvIn=function(next){
		if(fast){  next();return}
		pcm=Recorder.SampleData([pcm],sampleRate,sr).data;//和mock一样一次性进行采样率转换，避免分段转换有差异
		var rec=Recorder({type:type,sampleRate:sr,bitRate:br});
		rec.envStart({ envName:"nodejs",canProcess:true },sr);
		
		var idx=0;
		while(idx<pcm.length){
			var endIdx=~~(idx+sr/10),idx2=Math.min(pcm.length,endIdx);
			if(type=="ogg"){
				endIdx=~~(idx+sr);idx2=Math.min(pcm.length,endIdx);//不同大小会导致第一个数据页头不一致
			}
			var chunk=pcm.slice(idx,idx2);
			idx=endIdx;
			rec.envIn(chunk,0);
		};
		
		rec.stop(function(blob){
			var val=require('crypto').createHash("sha1").update(new Uint8Array(blob)).digest('hex');
			next(blob,val);
		},function(msg){ throw msg });
	};
	
	var t1=Date.now();
	testMock(function(aBuf1,val1){
		testEnvIn(function(aBuf2,val2){
			var msg="mock编码出："+aBuf1.byteLength+"字节";
			msg+=" envIn编码出："+(aBuf2?aBuf2.byteLength:"null")+"字节";
			msg+=" 耗时："+FormatMs(Date.now()-t1);
			if(!val2 || val1==val2){
				Log("OK "+msg,2);
			}else{
				errMsgs.push("Err "+Tag+" "+msg); Log("Err "+msg,1);
			}
			resolve();
		});
	});
})};
var bigTestEngine=function(type,sr,br){ return new Promise(function(resolve,reject){
	var dur=24*60*60000;
	var Tag="bigTestEngine "+type+" "+sr+" "+br+" "+dur/60000/60+"小时";
	Log("------ "+Tag+(TestLoop?" loop:"+LoopCount:"")
		+" 已耗时："+FormatMs(Date.now()-StartTime)+" ------",3);
	
	if(TestSave){
		var path=ArrayBufferSaveTempFile("test-engine-big-save-"+sr+"-"+br+"."+type,new Uint8Array(0).buffer);
		Log("保存文件到："+path,2);
	}
	
	var t1=Date.now();
	var encSize=0,lastDur=0;
	var rec=Recorder({
		type:type,sampleRate:sr,bitRate:br
		,onProcess:function(buffers,powerLevel,duration){
			lastDur=duration;
			for(var i=buffers.length-2;i>=0;i--){
				if(!buffers[i]) break;
				buffers[i]=null;//清除缓冲数据
			}
		}
		,takeoffEncodeChunk:function(bytes){
			encSize+=bytes.byteLength;
			if(TestSave){
				fs.writeFileSync(path, Buffer.from(bytes.buffer), { flag:"a" });
			}
		}
	});
	rec.envStart({ envName:"nodejs",canProcess:true },sampleRate);
	
	var size=sampleRate/1000*dur;
	var idx=0;
	while(idx<size){
		var pcm=testPcm; idx+=pcm.length; rec.envIn(pcm,0);
		pcm=new Int16Array(pcm.length); var vol=Math.random();
		for(var i=0;i<pcm.length;i++){
			pcm[i]=vol*(0x7fff-Math.random()*0x7fff*2);
		}
		idx+=pcm.length; rec.envIn(pcm,0);
		
		process.stdout.clearLine();
		process.stdout.write("\r>>> "+(idx/size*100).toFixed(2)+"%"
			+" "+FormatMs(lastDur)
			+" "+FormatSize(encSize)
			+" | 预估:"+FormatSize(encSize/idx*size)
			+" 耗时:"+FormatMs(Date.now()-t1)
			+" 还需:"+FormatMs(~~((Date.now()-t1)/idx*(size-idx))));
	};
	console.log("");
	
	rec.stop(function(blob){
		var msg="envIn编码出："+encSize+"字节";
		msg+=" 耗时："+FormatMs(Date.now()-t1);
		Log("OK "+msg,2);
		resolve();
	},function(msg){ throw msg });
})};



var LoopCount=0;
do{
	var okMsgs=[],errMsgs=[];
	if(TestLoop){
		var len=testPcm.length;
		var vol=Math.random();
		if(testPcmFile.length){
			len=~~(testPcmFile.length/4);
			var idx=~~(Math.random()*(testPcmFile.length-len));
			testPcm=testPcmFile.subarray(idx,idx+len);
		}else{
			testPcm=new Int16Array(len);
			for(var i=0;i<len;i++){
				testPcm[i]=vol*(0x7fff-Math.random()*0x7fff*2);
			}
		}
		noisePcm=new Int16Array(len);
		for(var i=0;i<len;i++){
			noisePcm[i]=vol*(0x7fff-Math.random()*0x7fff*2);
		}
	}
	LoopCount++;
	
	while(!TestType || TestType=="mp3"){
		if(TestBig){
			if(!TestBitRate||TestBitRate<=16)await bigTestEngine("mp3",16000,16);
			if(!TestBitRate||TestBitRate>16)await bigTestEngine("mp3",48000,TestBitRate||320);
			okMsgs.push("test mp3 big"); break;
		};
		var mp3BitRate=TestBitRate?[TestBitRate]
			:[8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 192, 224, 256, 320];
		for(var i=0;i<mp3BitRate.length;i++){
			var br=mp3BitRate[i], fast=br!=TestBitRate&&br!=16&&br!=48&&br!=96;
			await testEngine("mp3",8000,br,1);
			await testEngine("mp3",16000,br,fast);
			await testEngine("mp3",22050,br,1);
			await testEngine("mp3",24000,br,1);
			await testEngine("mp3",32000,br,1);
			await testEngine("mp3",44100,br,1);
			await testEngine("mp3",48000,br,fast);
		}
		okMsgs.push("test mp3"); break;
	}
	while(!TestType || TestType=="ogg"){
		if(TestBig){
			if(!TestBitRate||TestBitRate<=16)await bigTestEngine("ogg",16000,16);
			if(!TestBitRate||TestBitRate>16)await bigTestEngine("ogg",48000,TestBitRate||100);
			okMsgs.push("test ogg big"); break;
		};
		var oggBitRate=TestBitRate?[TestBitRate]
			:[16, 30, 40, 50, 60, 70, 80, 90, 100];
		if(OggFullFast){
			for(var i0=0;i0<3;i0++){
				for(var j=8000;j<=48000;j+=123){
					for(var i=0;i<oggBitRate.length;i++){
						var br=oggBitRate[i];
						var dur=i0==0?100:i0==1?500:5000;
						await testExec("ogg",j,br,testPcm,dur,1);
					}
				}
			}
		}else
		for(var i=0;i<oggBitRate.length;i++){
			var br=oggBitRate[i], fast=br!=TestBitRate&&br!=16&&br!=48&&br!=96;
			await testEngine("ogg",8000,br,1);
			await testEngine("ogg",16000,br,fast);
			await testEngine("ogg",22050,br,1);
			await testEngine("ogg",24000,br,1);
			await testEngine("ogg",32000,br,1);
			await testEngine("ogg",44100,br,1);
			await testEngine("ogg",48000,br,fast);
		}
		okMsgs.push("test ogg"); break;
	}
	while(!TestType || TestType=="amr"){
		if(TestBig){
			if(!TestBitRate||TestBitRate<12.2)await bigTestEngine("amr",16000,4.75);
			if(!TestBitRate||TestBitRate>=12.2)await bigTestEngine("amr",48000,TestBitRate||12.2);
			okMsgs.push("test amr big"); break;
		};
		var amrBitRate=TestBitRate?[TestBitRate]
			:[4.75, 5.15, 5.9, 6.7, 7.4, 7.95, 10.2, 12.2];
		for(var i=0,L=amrBitRate.length-1;i<=L;i++){
			await testEngine("amr",8000,amrBitRate[i],i!=0&&i!=L);
		}
		okMsgs.push("test amr"); break;
	}
}while(TestLoop);

//========测试结束===========
console.log("");
console.log("---------------------");
Log("测试结果：");
Log("\n"+okMsgs.join("\n"),2);
console.log("-----");
if(errMsgs.length) Log("\n"+errMsgs.join("\n"),1);

})();