var Recorder=require("../../copy-rec-src/src/recorder-core.js");
var RecordApp=require("../../copy-rec-src/src/app-support/app.js");
require("../../copy-rec-src/src/extensions/create-audio.nmn2pcm.js");

var Test={}; module.exports=Test;

/**部分底层功能测试*/
Test.testMethods=function(This){
	runTest(This, async function(){
		This.addTestMsg("开始底层功能测试...");
		
		await testWriteFile(This);
		
		This.addTestMsg("底层功能测试完成",2);
	});
};
/**pcm数据实时写入到wav文件测试*/
Test.testWritePcm2Wav=function(This){
	runTest(This, async function(){
		await realtimeWritePcm2Wav(This);
	});
};

var runTest=async function(This, exec){
	if(TestLock && Date.now()-TestLock<60*1000){
		This.addTestMsg("上次测试还未完成，请稍后再开始新一轮测试",1);
		return;
	}
	TestLock=Date.now();
	
	This.setData({ testMsgs:[] });
	await exec();
	
	TestLock=0;
};
var TestLock=0;






/**实时写入pcm数据到wav文件，最后添加wav头变成可播放wav文件*/
var realtimeWritePcm2Wav=function(This){ return new Promise(function(resolve,reject){
	This.addTestMsg("实时写入pcm数据到wav文件测试开始...");
	This.addTestMsg("参考源码在 pages/test_other__/test_other__.js 中的 realtimeWritePcm2Wav 方法","#aaa");
	
	//===开始录音前初始化===
	var file="testRtPcm.wav"; //生成一个文件名
	var pcmSize=0;
	var pcmSampleRate=16000; //保存pcm的采样率
	//新创建文件，在文件开头预留44字节wav头的位置
	RecordApp.MiniProgramWx_WriteLocalFile(file,new Uint8Array(44).buffer);
	
	//===录音onProcess中实时写入pcm数据===
	var chunk;
	var onProcess=function(buffers,powerLevel,duration,sampleRate){
		chunk=Recorder.SampleData(buffers,sampleRate,pcmSampleRate,chunk);
		var pcm=chunk.data;
		
		//直接将pcm追加写入到文件
		pcmSize+=pcm.byteLength;
		RecordApp.MiniProgramWx_WriteLocalFile({ fileName:file, append:true }, pcm.buffer);
	};
	
	//===录音结束后生成wav头===
	var onStop=function(){
		var header=Recorder.wav_header(1,1,pcmSampleRate,16,pcmSize); //可import engine/wav.js，也可以直接从wav.js中复制wav_header整个函数过来使用
		//将wav头写入到文件开头位置
		RecordApp.MiniProgramWx_WriteLocalFile({ fileName:file, seekOffset:0 }, header.buffer, function(path){
			//wav文件已经保存完毕，播放测试
			testEnd(path);
		});
	};
	
	
	//模拟测试数据
	var testPcm=Recorder.NMN2PCM.GetExamples().Canon.get(48000).pcm;
	var testBlock=100000,testOffset=0,testBuffers=[];
	while(testOffset<testPcm.length){
		testBuffers.push(testPcm.slice(testOffset, testOffset+testBlock));
		testOffset+=testBlock;
		
		onProcess(testBuffers,0,0,48000);
	}
	var testEnd=function(path){
		var duration=Math.round(testPcm.length/48000*1000);
		This.addTestMsg("在上面可以播放 wav:"+duration+"ms "+path);
		This.addTestMsg("实时写入pcm数据到wav文件OK",2);
		
		var player=This.selectComponent('.player');
		player.setPage(This); player.setPlayPath(duration,path);
		This.reclog("功能测试已实时写入pcm数据到了一个wav文件，可播放试听");
		resolve();
	};
	onStop();
})};









/**测试文件写入功能*/
var testWriteFile=async function(This){
	This.addTestMsg("MiniProgramWx_WriteLocalFile测试开始...");
	try{
		//生成2MB的数据
		var str="",i=0;while(str.length<2*1024*1024)str+=++i;
		var bytes=new Uint8Array(str.length);
		for(var i=0;i<str.length;i++)bytes[i]=str.charCodeAt(i);
		var buffer=bytes.buffer;
		
		//串行写入
		var file1="testWriteFile1.txt",offset=0;
		var path1=await __writeFile(file1, buffer.slice(offset, (offset=offset+1024)));
		while(offset<bytes.length){
			await __writeFile({fileName:file1, append:true}, buffer.slice(offset, (offset=offset+1024*128)));
		}
		
		var arr=new Uint8Array(await __readFile(path1));
		var isEq=arr.length==bytes.length;
		for(var i=0,L=arr.legnth;i<L;i++){ if(arr[i]!=bytes[i]) isEq=false; }
		if(isEq) This.addTestMsg("串行写入结果一致 "+arr.length+"字节 "+path1);
		else This.addTestMsg("串行写入结果不一致",1);
		
		
		//并发写入
		var waits=0,waitErr;
		var file2="testWriteFile2.txt",offset=0;
		var path2; waits++; __writeFile(file2, buffer.slice(offset, (offset=offset+1024)))
			.then(function(v){ waits--; path2=v; })
			.catch(function(e){ waits--; if(!waitErr)waitErr=e });
		while(offset<bytes.length){
			waits++; __writeFile({fileName:file2, append:true}, buffer.slice(offset, (offset=offset+1024*128)))
				.then(function(v){ waits--; })
				.catch(function(e){ waits--; if(!waitErr)waitErr=e });
		}
		while(waits) await Sleep(100);
		if(waitErr) throw waitErr;
		
		var arr=new Uint8Array(await __readFile(path2));
		var isEq=arr.length==bytes.length;
		for(var i=0,L=arr.legnth;i<L;i++){ if(arr[i]!=bytes[i]) isEq=false; }
		if(isEq) This.addTestMsg("并发写入结果一致 "+arr.length+"字节 "+path2);
		else This.addTestMsg("并发写入结果不一致",1);
		
		//seek写入位置
		var byte2=new Uint8Array([10,71,72,73,74,75,10]);
		await __writeFile({fileName:file2, seekOffset:123}, byte2.buffer);
		bytes.set(byte2,123);
		
		var arr=new Uint8Array(await __readFile(path2));
		var isEq=arr.length==bytes.length;
		for(var i=0,L=arr.legnth;i<L;i++){ if(arr[i]!=bytes[i]) isEq=false; }
		if(isEq) This.addTestMsg("seek写入结果一致 "+arr.length+"字节 "+path2);
		else This.addTestMsg("seek写入结果不一致",1);
		
		
		This.addTestMsg("MiniProgramWx_WriteLocalFile测试OK",2);
	}catch(e){
		console.error(e);
		This.addTestMsg("MiniProgramWx_WriteLocalFile测试异常："+e.message,1);
	}
};

var Sleep=function(ms){return new Promise(function(resolve,reject){
	setTimeout(resolve,ms);
})};
var __writeFile=function(fileName,buffer){ return new Promise(function(resolve,reject){
	RecordApp.MiniProgramWx_WriteLocalFile(fileName,buffer,function(path){
		resolve(path);
	},function(err){
		reject(new Error(err));
	});
})};
var __readFile=function(path){ return new Promise(function(resolve,reject){
	wx.getFileSystemManager().readFile({
		filePath:path
		,success:function(res){
			resolve(res.data);
		}
		,fail:function(res){
			reject(new Error(res.errMsg));
		}
	});
})};
