/******************
《测试Recorder的envIn内的采样率转换》
作者：高坚果
时间：2025-3-6 13:38:52

运行： node test-SampleData-envIn.js

编写本测试的原因：一个高采样率的pcm数据进行降低采样率时，如果是单次完整转换，没有问题，但如果是分段调用envIn录制，在两个采样率不是倍数关系时（44100和16000互转），内部的每次转换会引入杂音，导致最终的录制结果有杂音；本代码将测试这两种情况。新版本的采样率转换可能已经修复此问题。
测试后，将转换后的结果文件拖入Adobe Audition内对比频谱差异。
******************/
(function(){
require("./-global-.js");
var jsDir=RootDir+"src/";

var Recorder=require(jsDir+"recorder-core.js");
require(jsDir+"engine/wav.js");
require(jsDir+"engine/pcm.js");

var printMenu=()=>{
	printInput("请输入要测试的pcm数据wav格式文件路径（wav采样率>30000时测试降低采样率到16k，采样率<=30000时测试提升采样率到48k，输入exit退出）：");
};
var printInput=(msg)=>{
	if(msg)console.log(msg);
	process.stdout.clearLine();
	process.stdout.write("\r> ");
};

printMenu();
process.stdin.on('data',function(input){
	input=input.toString().trim();
	var INPUT=input.toUpperCase();
	if(INPUT=="EXIT"){
		console.log("\x1B[33m%s\x1B[0m","程序已退出");
		process.exit();
		return;
	}
	
	
	testRun(input,()=>{
		console.log("\x1B[32m测试完成\x1B[0m\n");
		printMenu();
	},(err)=>{
		console.log("\x1B[31m"+err+"\x1B[0m");
		printInput();
	});
});

var fs=require("fs");
var testRun=function(wavPath,True,False){
	if(!fs.existsSync(wavPath)){
		return False("路径不存在");
	}
	
	//检测wav文件头
	var wavView=new Uint8Array(fs.readFileSync(wavPath).buffer);
	var eq=function(p,s){
		for(var i=0;i<s.length;i++){
			if(wavView[p+i]!=s.charCodeAt(i)){
				return false;
			};
		};
		return true;
	};
	var pcm;
	if(eq(0,"RIFF")&&eq(8,"WAVEfmt ")){
		var numCh=wavView[22];
		if(wavView[20]==1 && (numCh==1||numCh==2)){//raw pcm 单或双声道
			var sampleRate=wavView[24]+(wavView[25]<<8)+(wavView[26]<<16)+(wavView[27]<<24);
			var bitRate=wavView[34]+(wavView[35]<<8);
			//搜索data块的位置
			var dataPos=0; // 44 或有更多块
			for(var i=12,iL=wavView.length-8;i<iL;){
				if(wavView[i]==100&&wavView[i+1]==97&&wavView[i+2]==116&&wavView[i+3]==97){//eq(i,"data")
					dataPos=i+8;break;
				}
				i+=4;
				i+=4+wavView[i]+(wavView[i+1]<<8)+(wavView[i+2]<<16)+(wavView[i+3]<<24);
			}
			console.log("wav info",sampleRate,bitRate,numCh,dataPos);
			if(dataPos){
				if(bitRate==16){
					pcm=new Int16Array(wavView.buffer.slice(dataPos));
				}else if(bitRate==8){
					pcm=new Int16Array(wavView.length-dataPos);
					//8位转成16位
					for(var j=dataPos,d=0;j<wavView.length;j++,d++){
						var b=wavView[j];
						pcm[d]=(b-128)<<8;
					};
				};
			};
			if(pcm && numCh==2){//双声道简单转单声道
				var pcm1=new Int16Array(pcm.length/2);
				for(var i=0;i<pcm1.length;i++){
					pcm1[i]=(pcm[i*2]+pcm[i*2+1])/2;
				}
				pcm=pcm1;
			};
		};
	};
	if(!pcm){
		False("非单或双声道wav raw pcm格式音频，无法转码");
		return;
	};
	
	var toSR=16000;
	if(sampleRate<=30000){
		toSR=48000;
	};
	
	//打印转换数据
	var testTrace=function(){
		var blockSize=~~(sampleRate/12); //模拟1秒12次回调数据
		var idx=0, pcms=[], chunk=null, list=[], blockCount=0, s1Count=0, s2Count=0;
		while(idx<pcm.length){
			var arr=pcm.slice(idx,idx+blockSize); idx+=blockSize;
			pcms.push(arr);
			chunk=Recorder.SampleData(pcms, sampleRate, toSR, chunk);
			var s2=Recorder.SampleData(pcms, sampleRate, toSR);
			
			if(list.length<20){
				var s2Prev=list[list.length-1]; s2Prev=s2Prev?s2Prev.s2_d.length:0;
				list.push({
					arr:arr
					,s1:chunk.data
					,s2:s2.data.slice(s2Prev)
					,s2_d:s2.data
				});
			}
			s1Count+=chunk.data.length;
			s2Count=s2.data.length;
			blockCount++;
		};
		for(var i=list.length-10;i<list.length;i++){
			var o=list[i];
			console.log("========== 中间数据 "+(o.s1.length==o.s2.length?"":"\x1B[31m")+"s1:"+o.s1.length+" s2:"+o.s2.length+"\x1B[0m");
			var eqs=o.s1.join(",")==o.s2.join(",")?"\x1B[32m":o.s1.length==o.s2.length?"\x1B[31m":"";
			console.log(eqs+o.s1.slice(0,5).join(",")+" ... "+o.s1.slice(Math.max(o.s1.length,o.s2.length)-5).join(",")+"\x1B[0m");
			console.log(eqs+o.s2.slice(0,5).join(",")+" ... "+o.s2.slice(Math.max(o.s1.length,o.s2.length)-5).join(",")+"\x1B[0m");
		};
		console.log("=== \x1B[33m"+"blockCount:"+blockCount+" s1Count:"+s1Count+" s2Count:"+s2Count+"\x1B[0m\n\n");
	};
	testTrace();
	
	//单次转换采样率
	var runOne=function(useType){
		var toPcm;
		if(useType==1){ //单次完整转换
			var pcms=[pcm];
			toPcm=Recorder.SampleData(pcms, sampleRate, toSR).data;
		}else if(useType==2){ //单次切块转换
			var blockSize=~~(sampleRate/12); //模拟1秒12次回调数据
			var idx=0, pcms=[];
			while(idx<pcm.length){
				var arr=pcm.slice(idx,idx+blockSize); idx+=blockSize;
				pcms.push(arr);
			};
			toPcm=Recorder.SampleData(pcms, sampleRate, toSR).data;
		}else{ //连续分段转换
			var blockSize=~~(sampleRate/12); //模拟1秒12次回调数据
			var idx=0, pcms=[], chunk=null; toPcm=new Int16Array(0);
			while(idx<pcm.length){
				var arr=pcm.slice(idx,idx+blockSize); idx+=blockSize;
				pcms.push(arr);
				chunk=Recorder.SampleData(pcms, sampleRate, toSR, chunk);
				var tmp=new Int16Array(toPcm.length+chunk.data.length);
				tmp.set(toPcm); tmp.set(chunk.data, toPcm.length);
				toPcm=tmp;
			};
		}
		var header=Recorder.wav_header(1,1,toSR,16,toPcm.byteLength);
		var bytes=new Uint8Array(header.length+toPcm.byteLength);
		bytes.set(header);
		bytes.set(new Uint8Array(toPcm.buffer), header.length);
		
		var typeName=useType==2?"切块单次":useType==3?"分段连续":"完整";
		var path=wavPath.replace(/^(.+[\\\/])(.+)$/g,function(t,a,b){
			return a+"test-"+b+"-one"+toSR+typeName;
		})+".wav";
		fs.writeFileSync(path, Buffer.from(bytes.buffer));
		console.log("\x1B[32m单次"+typeName+"转换成"+toSR+"已保存到：\x1B[33m"+path+"\x1B[0m");
		if(useType!=3){
			runOne(useType+1);
		}
	};
	runOne(1);
	
	//envIn连续转换
	var runEnvIn=function(disbaleFilter){
		var recEnd=function(aBuf){
			var toPcm=new Int16Array(aBuf);
			var header=Recorder.wav_header(1,1,toSR,16,toPcm.byteLength);
			var bytes=new Uint8Array(header.length+toPcm.byteLength);
			bytes.set(header);
			bytes.set(new Uint8Array(toPcm.buffer), header.length);
			
			var path=wavPath.replace(/^(.+[\\\/])(.+)$/g,function(t,a,b){
				return a+"test-"+b+"-envIn"+toSR+(disbaleFilter?"禁用滤波":"");
			})+".wav";
			fs.writeFileSync(path, Buffer.from(bytes.buffer));
			console.log("\x1B[32m连续envIn转换成"+toSR+"已保存到：\x1B[33m"+path+"\x1B[0m");
			
			if(!disbaleFilter){
				runEnvIn(true);
				return;
			}
			True();
		};
		
		var rec=Recorder({ type:"pcm",sampleRate:toSR,bitRate:16 });
		rec.envStart({ envName:"nodejs",canProcess:true },sampleRate);
		if(disbaleFilter){ //禁用滤波
			rec.engineCtx.chunkInfo={filter:{}};
		}
		var blockSize=~~(sampleRate/12); //模拟1秒12次回调数据
		var idx=0;
		while(idx<pcm.length){
			var arr=pcm.slice(idx,idx+blockSize); idx+=blockSize;
			rec.envIn(arr,0);
		};
		rec.stop(function(aBuf){
			recEnd(aBuf);
		},function(msg){
			False(msg);
		});
	}
	if(toSR==16000){
		runEnvIn(false);
	}else{
		console.log("不测试envIn将"+sampleRate+"转成"+toSR+"，因为不支持");
		True();
	}
};

})();
