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

var saveTag="test";
if(/"path(?:-(.+))?=([^"]+)"/.test('"'+process.argv.join('"')+'"')){
	saveTag=RegExp.$1; if(!saveTag) throw new Error("tag必填");
	var recJs=RegExp.$2; if(!/[\\\/]/.test(recJs)) recJs=jsDir+recJs;
	
	Object.Recorder=null;
	var Recorder=require(recJs);
	console.log('\x1B[33m'+'已加载'+recJs+" tag="+saveTag+'\x1B[0m');
}else{
	var Recorder=require(jsDir+"recorder-core.js");
	console.log('\x1B[2m'+'Tips: 可通过参数 "path-[tag]=recorder-core-v1.js|d:/xxx/recorder-core.js" 来加载需要的测试的版本，tag必填指定一个保存文件的前缀'+'\x1B[0m');
}
require(jsDir+"engine/wav.js");
require(jsDir+"engine/pcm.js");
require(jsDir+"engine/mp3.js");
require(jsDir+"engine/mp3-engine.js");


Recorder.DefaultDataType="arraybuffer";
Recorder.prototype.___setSrcSR=Recorder.prototype._setSrcSR;
var isUpsampleNewVer=Recorder.prototype._setSrcSR.toString().indexOf("allowUpsample")!=-1;
Recorder.prototype._setSrcSR=function(sampleRate){ //老版本不允许设置成高采样率，强制允许
	if(Recorder.SampleData.toString().indexOf("raisePrev")==-1){
		if(sampleRate<this.set.sampleRate) throw new Error("Recorder版本太低，没有内置升采样");
		this.___setSrcSR(sampleRate); //更老版本不支持提高采样率
	}else if(isUpsampleNewVer){
		this.set.allowUpsample=true; //新版本可配置，强制允许
		this.___setSrcSR(sampleRate);
	}else{
		this.srcSampleRate=sampleRate; //中间版本支持提高采样率，但不允许，强制允许
	}
};

var useToSR=16000, useFilter="", toType={type:"wav",typeP1:null,typeP2:null};
var printMenu=()=>{
	printInput("["+saveTag+"]请输入要测试的pcm数据wav格式文件路径 path [to 16000]，输入cls清屏 exit退出"
		+"\n- 输入 testMath [10] 测试Math调用和内联计算性能差异，可指定循环次数"
		+"\n- 输入 set type wav|mp3 [默认0自动bitRate] [默认0自动lowpassfreq -1禁用] 设置要转成的格式，当前值"+toType.type+(toType.typeP1!=null?" "+toType.typeP1:"")+(toType.typeP2!=null?" "+toType.typeP2:"")
		+"\n- 输入 set sr "+(useToSR<32000?44100:16000)+" 设置默认要转成的采样率，当前值"+useToSR
		+"\n- 输入 set f1|f2 0|阶数 使用waveResampler的IIR|FIR进行滤波，阶数需要>=3，其文档中为16|71，当前值"+(useFilter||"-")
		+"\n- 输入 rnd "+(useToSR<32000?44100:16000)+" [to 16000] [123] [df] [loop 10] 生成指定采样率的pcm测试，可选pcm长度 df禁用滤波 loop循环测试"
		+"\n- 输入 rnd all [123] [df] 生成pcm测试所有采样率组合，可选pcm长度 df禁用滤波"
	);
};
var printInput=(msg)=>{
	if(msg)console.log(msg);
	process.stdout.clearLine();
	process.stdout.write("\r> ");
};

printMenu();
process.stdin.on('data',async function(input){
	input=input.toString().trim();
	if(!input) return printInput();
	var INPUT=input.toUpperCase();
	if(INPUT=="EXIT"){
		console.log("\x1B[33m%s\x1B[0m","程序已退出");
		process.exit();
		return;
	}
	if(INPUT=="CLS" || INPUT=="CLEAR"){
		process.stdout.write('\x1b[2J\x1b[3J\x1b[H'); // 2J - 清除屏幕  3J - 清除滚动缓冲区  H - 光标移到左上角
		console.clear();
		printMenu();
		return;
	}
	if(/^set\s+sr[=\s]+(\d+)/i.test(input)){
		var num=+RegExp.$1;
		if(num<1||num>48000){
			console.log("\x1B[31m"+"采样率值无效"+"\x1B[0m");
			printInput();
		}else{
			useToSR=num;
			printMenu();
		}
		return;
	}
	if(/^set\s+f(1|2)[=\s]+(\d+)/i.test(input)){
		var num=+RegExp.$2||0;
		useFilter=num<3? "" : (RegExp.$1=="1"?"IIR":"FIR")+"-"+num;
		set_Recorder_IIRFilter();
		printMenu();
		return;
	}
	if(/^set\s+type[=\s]+(\w+)\s*(-?\d+)?\s*(-?\d+)?/i.test(input)){
		var type=RegExp.$1.toLowerCase(), num1=RegExp.$2, num2=RegExp.$3;
		if(type!="wav" && type!="mp3"){
			console.log("\x1B[31m"+"类型无效"+"\x1B[0m");
			printInput();
		}else{
			if(type!="mp3"){ num1="", num2=""; }
			toType={type:type, typeP1:num1?(+num1||0):null, typeP2:num2?(+num2||0):null };
			printMenu();
		}
		return;
	}
	try{
		if(/^testMath\s*(\d+)?/i.test(input)){
			await testMath(+RegExp.$1||10);
		}else if(/^rnd\s+(\d+|all)\s*(?:to\s+(\d+))?\s*(\d+)?\s*(df)?\s*(?:loop\s+(\d+))?/i.test(input)){
			if(RegExp.$1.toLowerCase()=="all"){
				await traceAll(+RegExp.$3||48000*10, !!RegExp.$4);
			}else{
				var toSR=+RegExp.$2||useToSR;
				await traceRun(+RegExp.$1, +RegExp.$3||+RegExp.$1*10, toSR, !!RegExp.$4, +RegExp.$5||1);
			}
		}else{
			var path=input, toSR=useToSR;
			if(/^(.+?)\s*(?:to\s+(\d+))?$/i.test(input)){
				path=RegExp.$1; toSR=+RegExp.$2||toSR;
			}
			await testRun(path, toSR, toType);
		}
		
		console.log("\x1B[32m测试完成\x1B[0m\n");
		printMenu();
	}catch(e){
		console.error(e);
		console.log("\x1B[31m"+e.message+"\x1B[0m");
		printInput();
	};
});


//↓↓↓↓ 这一段代码可以复制到浏览器执行测试 ↓↓↓↓
var isBrowser=typeof(window)=='object' && !!window.document;
var testMath=function(loop){
	console.log("循环"+loop+"次，测试Math数学函数调用性能和内联计算的性能差异，老js引擎内联会快20倍，现代js引擎差异很小（Math调用自动内联优化）");
	var n1=new Int8Array(10000000);
	var n11=new Int8Array(10000000);
	var n2=new Int8Array(10000000);
	var n3=new Int8Array(10000000);
	var n4=new Int8Array(n1.length*10); //100M
	
	var t=Date.now();
	for(var i0=0;i0<loop;i0++){
		console.time("testMath Math");
		for(var i=0,L=n1.length;i<L;i++){
			n1[i]=i; var val=n1[i];
			val=Math.max(-5,Math.min(5,val));
			val=Math.floor(val*0.333);
			n1[i]=val;
		};
		console.timeEnd("testMath Math");
	};
	var t1=Date.now()-t;
	
	var fn11=function(val){
		val=val<-5?-5 :val>5?5 :val;
		var val2=~~(val*0.333);
		return val2>val?val2-1 :val2; //负数-1
	};
	var t=Date.now();
	for(var i0=0;i0<loop;i0++){
		console.time("testMath Func");
		for(var i=0,L=n11.length;i<L;i++){
			n11[i]=i; n11[i]=fn11(n11[i]);
		};
		console.timeEnd("testMath Func");
	};
	var t11=Date.now()-t;
	
	var t=Date.now();
	for(var i0=0;i0<loop;i0++){
		console.time("testMath ?: ");
		for(var i=0,L=n2.length;i<L;i++){
			n2[i]=i; var val=n2[i];
			val=val<-5?-5 :val>5?5 :val;
			var val2=~~(val*0.333);
			n2[i]=val2>val?val2-1 :val2; //负数-1
		};
		console.timeEnd("testMath ?: ");
	};
	var t2=Date.now()-t;
	
	var t=Date.now();
	for(var i0=0;i0<loop;i0++){
		console.time("testMath ifelse");
		for(var i=0,L=n3.length;i<L;i++){
			n3[i]=i; var val=n3[i];
			if(val<-5) val=-5; else if(val>5) val=5;
			var val2=~~(val*0.333);
			if(val2>val) n3[i]=val2-1; else n3[i]=val2;
		};
		console.timeEnd("testMath ifelse");
	};
	var t3=Date.now()-t;
	
	var t=Date.now();
	for(var i0=0;i0<loop;i0++){
		console.time("TypedArray Set 100M");
		for(var i=0,L=n4.length;i<L;){
			n4.set(n1,i); i+=n1.length;
		};
		console.timeEnd("TypedArray Set 100M");
	};
	var t4=Date.now()-t;
	
	console.log("\x1B[32m"+"TypedArray Set 100M耗时 "+t4+"ms 平均 "+(t4/loop).toFixed(2)+"ms "+n4[n4.length-1]+"\x1B[0m");
	console.log("\x1B[32m"+" Math 耗时 "+t1+"ms 平均 "+(t1/loop).toFixed(2)+"ms"+"\x1B[0m");
	console.log("\x1B[32m"+" Func 耗时 "+t11+"ms 平均 "+(t11/loop).toFixed(2)+"ms"+"\x1B[0m");
	console.log("\x1B[32m"+"  ?:  耗时 "+t2+"ms 平均 "+(t2/loop).toFixed(2)+"ms"+"\x1B[0m");
	console.log("\x1B[32m"+"ifelse耗时 "+t3+"ms 平均 "+(t3/loop).toFixed(2)+"ms"+"\x1B[0m");
	for(var i=0,L=n3.length;i<L;i++){
		if(n1[i]!=n3[i] || n11[i]!=n3[i] || n2[i]!=n3[i]){
			throw new Error("计算错误 idx:"+i+" "+n1[i]+" "+n11[i]+" "+n2[i]+" "+n3[i]);
		};
	};
	console.log("\x1B[32m"+"结果一致"+"\x1B[0m");
};
//testMath(10)

var traceAll=function(len, df){
	if(len>16000*1000) throw new Error("all时长度限制最大16000*1000");
	var pcm=new Int16Array(len);
	for(var i=0;i<len;i++) pcm[i]=i+100;
		
	var errsLen=[],errsResize1=[],errsResize2=[],errsDown=[],errsUp=[], srArr=[8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000];
	for(var i0=0;i0<srArr.length;i0++){
		var isMin=len<=48000, i2L=isMin?40:srArr.length-1; //8000-48000 step:1000
		for(var i2=0;i2<=i2L;i2++){
			if(isMin){
				var sr=8000+i2*1000, newSr=srArr[i0];
			}else{
				var sr=srArr[i2], newSr=srArr[i0];
			};
			var tag=sr+" -> "+newSr+" len:"+len;
			
			var isOK=testTrace(pcm,sr,newSr,df);
			if(isOK.reCount!=null){
				if(isOK.reCount==-1) errsResize1.push(tag);
				if(isOK.reCount>0) errsResize2.push(tag+" resizeCount:"+isOK.reCount);
			}
			if(isOK.traceEq) continue;
			if(!isOK.allLenEq){
				errsLen.push(tag);
				tag+=" 长度不一致";
			}else{
				tag+=" 共"+isOK.neqCount+"块不一致";
			}
			if(sr<newSr) errsUp.push(tag); else errsDown.push(tag);
		}
	}
	console.log("\n\nall测试结果：\n");
	if(errsResize2.length){
		console.log("\x1B[33m有"+errsResize2.length+"个缓冲区有调整\n"+errsResize2.join("\n")+"\x1B[0m\n");
	}else{
		console.log("\x1B[32m缓冲区均无调整\x1B[0m\n");
	}
	if(errsResize1.length){
		console.log("\x1B[31m有"+errsResize1.length+"个缓冲区发生溢出\n"+errsResize1.join("\n")+"\x1B[0m\n");
	}else{
		console.log("\x1B[32m缓冲区均无溢出\x1B[0m\n");
	}
	if(errsLen.length){
		console.log("\x1B[31m有"+errsLen.length+"个结果长度不一致\n"+errsLen.join("\n")+"\x1B[0m\n");
	}else{
		console.log("\x1B[32m结果长度均一致\x1B[0m\n");
	}
	if(errsDown.length>0){
		console.log("\x1B[31m降采样完成，有"+errsDown.length+"个错误\n"+errsDown.join("\n")+"\x1B[0m\n");
	}else{
		console.log("\x1B[32m降采样完成，未发现错误\x1B[0m\n");
	}
	if(errsUp.length>0){
		console.log("\x1B[31m升采样完成，有"+errsUp.length+"个错误\n"+errsUp.join("\n")+"\x1B[0m\n");
	}else{
		console.log("\x1B[32m升采样完成，未发现错误\x1B[0m\n");
	}
	console.log("Tips: 指定长度<=48000时会测试采样率8000-48000+step:1000，否则只测试"+JSON.stringify(srArr)+"\n\n");
};
var traceRun=function(sr, len, toSR, df, loop, out_err){
	if(sr<1){
		console.log("\x1B[31m"+"采样率值无效"+"\x1B[0m");
	}else{
		var maxLen=isBrowser? 2*1024*1024*1024/2 : (os.freemem()-1*1024*1024*1024)/2/3; //2GB 或 空闲内存的1/3（留1GB）
		if(len>maxLen){
			throw new Error("长度最大为 "+Math.floor(maxLen)+" "+(isBrowser?"浏览器内测试已限制最大2GB":"已限制长度不超过空闲内存的1/3"));
		}
		var pcm=new Int16Array(len);
		for(var i=0;i<len;i++) pcm[i]=i+100;
		
		var times=0;
		for(var i=0;i<loop;i++){
			var out_time=[0];
			testTrace(pcm,sr,toSR,df,out_time);
			times+=out_time[0];
		}
		console.log("执行testTrace "+loop+" 次，耗时 "+times+"ms，平均 "+(times/loop).toFixed(1)+"ms\n\n");
	}
};
var testTrace=function(pcm, sampleRate, toSR, df, out_time){
	var blockSize=~~Math.max(2, sampleRate/2, sampleRate/12); //模拟1秒12次回调数据
	if(pcm.length<300) blockSize=10;
	
	var bigMode=false; //超长数据，假设不存在错误加速处理
	if(pcm.length>sampleRate*11){
		bigMode={ offset:0 };
	}
	
	var time1=Date.now();
	//完整单个转换
	console.time("testTrace single");
	var pcm2=Recorder.SampleData([pcm], sampleRate, toSR, { filter:df?{}:null }).data;
	console.timeEnd("testTrace single");
	
	//分段转换2种写法对比
	console.time("testTrace chunk");
	var logTime=0;
	var idx=0, pcms=[], chunk={}, list=[], blockCount=0, s1Count=0, s2Count=0;
	while(idx<pcm.length){
		var arr=pcm.slice(idx,idx+blockSize); idx+=blockSize;
		pcms.push(arr);
		var item={arr:arr};
		list.push(item);
		blockCount++;
		
		if(isBrowser && pcms.length==1) debugger;
		if(df) chunk.filter={};
		chunk=Recorder.SampleData(pcms, sampleRate, toSR, chunk);
		item.s1=chunk.data;
		s1Count+=chunk.data.length;
		
		if(!bigMode){ //pcm片段数组完整转换
			var s2=Recorder.SampleData(pcms, sampleRate, toSR, { filter:df?{}:null }); //完整转换，下面截取上次之后的新数据
			var s2Prev=list[list.length-2]; s2Prev=s2Prev?s2Prev.s2_d.length:0;
			item.s2=s2.data.slice(s2Prev) //完整转换 上次之后的新数据
			item.s2_d=s2.data
			s2Count=s2.data.length;
		}else{ //直接从单个完整转换里面截取
			item.s2=pcm2.slice(bigMode.offset, bigMode.offset+item.s1.length);
			bigMode.offset+=item.s1.length;
			s2Count=pcm2.length;
		}
		
		//进度
		if(!isBrowser && blockCount%100==0 && Date.now()-logTime>1000){
			logTime=Date.now();
			process.stdout.clearLine();
			process.stdout.write("\r>>> 计算中 "+(idx/pcm.length*100).toFixed(2)+"% "+blockCount+" "+idx+"/"+pcm.length);
		}
	};
	if(out_time) out_time[0]=Date.now()-time1;
	console.log("");
	console.timeEnd("testTrace chunk");
	var testInfo="pcmSize:"+pcm.length+" sampleRate:"+sampleRate+"->"+toSR
			+" 滤波:"+(chunk.filter.fn?(chunk.filter.fn.fName||"Default"):"禁用")
			+" bigMode:"+(!!bigMode);
	console.log("\x1B[32m"+"blockCount:"+blockCount+" s1Count:"+s1Count+" s2Count:"+s2Count+" "+testInfo+"\x1B[0m\n");
	
	//对比结果
	var logTime=0;
	var allEq=true, allEqOffset=0, allBadIdxTotal=0,allBadIdxs_30=[];
	for(var i0=0,L0=list.length;i0<L0;i0++){
		var item=list[i0];
		item.isEq=item.s1.join(",")==item.s2.join(",");
		
		//和单个完整的进行对比
		for(var i=0,L=item.s1.length;i<L;i++){
			var v1=item.s1[i], v2=pcm2[allEqOffset];
			if(v1!=v2){
				allEq=false; allBadIdxTotal++;
				if(allBadIdxTotal<30) allBadIdxs_30.push("["+allEqOffset+"] "+v1+" != "+v2+" "+(Math.abs(v1-v2)==1?"1":"xxxxxx"+Math.abs(v1-v2)))
			}
			allEqOffset++;
		}
		
		//进度
		if(!isBrowser && i0%100==0 && Date.now()-logTime>1000){
			logTime=Date.now();
			process.stdout.clearLine();
			process.stdout.write("\r>>> 对比结果 "+(i0/L0*100).toFixed(2)+"%");
		}
	};
	console.log("");
	
	var neqIdx=-1, neqCount=0;
	for(var i=0;i<list.length;i++){
		var o=list[i]; if(!o.isEq){ neqCount++; }
		if(!(i<5 || i>=list.length-5)){ //只显示首尾，或者中间不一致的
			if(neqIdx==-1){
				if(o.isEq) continue;
				neqIdx=i;
			}else if(i>=neqIdx+5){
				continue;
			}
		}
		console.log((o.s1.length==o.s2.length?"":"\x1B[31m")+"========== 数据["+i+"] "+"s1:"+o.s1.length+" s2:"+o.s2.length+"\x1B[0m");
		var eqs=o.isEq?"\x1B[32m":o.s1.length==o.s2.length?"\x1B[31m":"\x1B[33m";
		console.log(eqs+o.s1.slice(0,5).join(",")+" ... "+o.s1.slice(Math.max(o.s1.length,o.s2.length)-5).join(",")+"\x1B[0m");
		console.log(eqs+o.s2.slice(0,5).join(",")+" ... "+o.s2.slice(Math.max(o.s1.length,o.s2.length)-5).join(",")+"\x1B[0m");
	};
	console.log("\n"+testInfo);
	console.log((neqCount?"\x1B[31m":"\x1B[32m")+"共"+neqCount+"块不一致 blockCount:"+blockCount+"\x1B[0m"
		+"    "+(s1Count!=s2Count?"\x1B[31m":"\x1B[32m")+"s1Count:"+s1Count+" s2Count:"+s2Count+"\x1B[0m");
	
	var reCount=chunk.resizeCount;
	if(reCount!=null){ //老版本没有计数
		console.log("\n"+(reCount==-1?"\x1B[31m":reCount==0?"\x1B[32m":"\x1B[33m")+"resize "+reCount+" 次\x1B[0m")
	}
	
	//和完整转换对比结果
	allLenEq=s1Count==pcm2.length;
	if(!allLenEq) allEq=false;
	console.log("\n"+(!allLenEq?"\x1B[31m":"\x1B[32m")+"和完整结果对比长度"+(!allLenEq?"不":"")+"一致"
		+" 分块长度:"+s1Count+" 完整长度:"+pcm2.length+"\x1B[0m");
	console.log((allEq?"\x1B[32m": !allLenEq?"\x1B[31m":"\x1B[33m")+"和完整结果对比结果"+(allEq?"":"不")+"一致"
		+(allBadIdxTotal?"\n"+allBadIdxTotal+"个不一致:\n"+allBadIdxs_30.join("\n"):"")
		+"\x1B[0m\n");
	
	return {traceEq:neqCount==0&&allEq, neqCount:neqCount, allEq:allEq, allLenEq:allLenEq, reCount:reCount};
};
if(isBrowser) traceRun(48000,30,16000,true,1)
//# sourceURL=test-node.js
//↑↑↑↑ 这一段代码可以复制到浏览器执行测试 ↑↑↑↑


var os = require('os');
var fs=require("fs");
var testRun=async function(wavPath, toSR, toType){
	if(!fs.existsSync(wavPath)){
		throw new Error("路径不存在");
	}
	var BitRate=toSR>=44100?128 :toSR>=32000?64 :toSR>16000?32 :16; //mp3自动提供比特率
	
	//读取wav文件得到pcm
	var wavBytes=fs.readFileSync(wavPath).buffer;
	var { pcm,sampleRate }=await new Promise((resolve, reject)=>{
		if(!Recorder.wav_decode) return reject(new Error("请复制新版本的wav.js覆盖，来提供 wav_decode 方法"));
		Recorder.wav_decode(wavBytes,(pcm,sampleRate,wavInfo)=>{
			console.log("wavInfo",wavInfo);
			resolve({ pcm,sampleRate });
		},(err)=>{
			reject(new Error("wav提取pcm失败："+err));
		});
	});
	
	//打印转换数据
	await testTrace(pcm,sampleRate,toSR);
	
	//单次转换采样率
	var runOne=async (useType,typeName)=>{ await new Promise((resolve, reject)=>{
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
		
		var path=wavPath.replace(/^(.+[\\\/])(.+)$/g,function(t,a,b){
			var val=a+saveTag+"-"+b+"-one"+toSR+typeName+(useFilter?"-"+useFilter:"");
			if(toType.typeP2!=null) val+="-lpf"+toType.typeP2;
			return val;
		})+"."+toType.type;
		var endCall=()=>{
			console.log("\x1B[32m单次"+typeName+"转换成"+toSR+"已保存到：\x1B[33m"+path+"\x1B[0m");
			resolve();
		};
		
		if(toType.type=="wav"){
			var header=Recorder.wav_header(1,1,toSR,16,toPcm.byteLength);
			var bytes=new Uint8Array(header.length+toPcm.byteLength);
			bytes.set(header);
			bytes.set(new Uint8Array(toPcm.buffer), header.length);
			
			fs.writeFileSync(path, Buffer.from(bytes.buffer));
			endCall();
			return;
		};
		
		var mockRec=Recorder({ type:toType.type, sampleRate:toSR, bitRate:toType.typeP1||BitRate, engine_mp3_lowpassfreq:toType.typeP2==null?null:toType.typeP2 });
		mockRec.mock(toPcm,toSR);
		mockRec.stop(function(aBuf){
			fs.writeFileSync(path, Buffer.from(aBuf));
			endCall();
			return;
		},function(err){
			reject(new Error(err));
		});
	})};
	await runOne(1,"完整");
	await runOne(2,"切块单次");
	await runOne(3,"分段连续");
	
	//envIn连续转换
	var runEnvIn=async (disbaleFilter)=>{ await new Promise((resolve, reject)=>{
		var path=wavPath.replace(/^(.+[\\\/])(.+)$/g,function(t,a,b){
			var val=a+saveTag+"-"+b+"-envIn"+toSR+(disbaleFilter?"-禁用滤波":useFilter?"-"+useFilter:"");
			if(toType.typeP2!=null) val+="-lpf"+toType.typeP2;
			return val;
		})+"."+toType.type;
		
		var recEnd=function(aBuf){
			if(toType.type=="wav"){
				var toPcm=new Int16Array(aBuf);
				var header=Recorder.wav_header(1,1,toSR,16,toPcm.byteLength);
				var bytes=new Uint8Array(header.length+toPcm.byteLength);
				bytes.set(header);
				bytes.set(new Uint8Array(toPcm.buffer), header.length);
				
				fs.writeFileSync(path, Buffer.from(bytes.buffer));
			}else{
				fs.writeFileSync(path, Buffer.from(aBuf));
			};
			
			console.log("\x1B[32m连续envIn转换成"+toSR+"已保存到：\x1B[33m"+path+"\x1B[0m");
			resolve();
		};
		
		if(toType.type=="wav"){
			var rec=Recorder({ type:"pcm", sampleRate:toSR, bitRate:16 });
		}else{
			var rec=Recorder({ type:toType.type, sampleRate:toSR, bitRate:toType.typeP1||BitRate, engine_mp3_lowpassfreq:toType.typeP2==null?null:toType.typeP2 });
		}
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
			reject(new Error(msg));
		});
	})};
	await runEnvIn(false);
	await runEnvIn(true);
};











//https://github.com/rochars/wave-resampler
//https://unpkg.com/wave-resampler@1.0.0/dist/wave-resampler.js
var waveResampler={};
(function(){
var l={};
function m(n){function h(a,c,b){for(var d=[],e=0;e<a;e++)d.push(this.b({u:c,s:b,Q:.5/Math.sin(Math.PI/(2*a)*(e+.5))}));this.a=[];for(a=0;a<d.length;a++)this.a[a]={A:d[a].c[0],B:d[a].c[1],C:d[a].c[2],v:d[a].i[0],w:d[a].i[1],k:d[a].k,z:[0,0]}}function k(a,c,b){b=2*Math.PI*b/c;c=0;this.a=[];for(var d=0;d<=a;d++)0===d-a/2?this.a[d]=b:(this.a[d]=Math.sin(b*(d-a/2))/(d-a/2),this.a[d]*=.54-.46*Math.cos(2*Math.PI*d/a)),c+=this.a[d];for(b=0;b<=a;b++)this.a[b]/=c;this.z=this.b()}function g(a,c,b){this.G=a;
this.b=(a-1)/c;this.h=this.D;"point"===b.method?this.h=this.I:"linear"===b.method?this.h=this.H:"sinc"===b.method&&(this.h=this.J);this.K=1-Math.max(0,Math.min(1,b.tension||0));this.l=b.sincFilterSize||1;this.F=t(b.sincWindow||u)}function u(a){return Math.exp(-a/2*a/2)}function t(a){return function(c){return(0===c?1:Math.sin(Math.PI*c)/(Math.PI*c))*a(c)}}function p(a,c,b){for(var d=0,e=c.length;d<e;d++)c[d]=b.h(d,a)}g.prototype.I=function(a,c){return this.a(Math.round(this.b*a),c)};g.prototype.H=
function(a,c){a*=this.b;var b=Math.floor(a);a-=b;return(1-a)*this.a(b,c)+a*this.a(b+1,c)};g.prototype.D=function(a,c){a*=this.b;var b=Math.floor(a),d=[this.j(b,c),this.j(b+1,c)],e=[this.a(b,c),this.a(b+1,c)];a-=b;b=a*a;var f=a*b;return(2*f-3*b+1)*e[0]+(f-2*b+a)*d[0]+(-2*f+3*b)*e[1]+(f-b)*d[1]};g.prototype.J=function(a,c){a*=this.b;var b=Math.floor(a),d=b+this.l,e=0;for(b=b-this.l+1;b<=d;b++)e+=this.F(a-b)*this.a(b,c);return e};g.prototype.j=function(a,c){return this.K*(this.a(a+1,c)-this.a(a-1,c))/
2};g.prototype.a=function(a,c){return 0<=a&&a<this.G?c[a]:0};k.prototype.filter=function(a){this.z.g[this.z.m]=a;for(var c=a=0,b=this.z.g.length;c<b;c++)a+=this.a[c]*this.z.g[(this.z.m+c)%this.z.g.length];this.z.m=(this.z.m+1)%this.z.g.length;return a};k.prototype.reset=function(){this.z=this.b()};k.prototype.b=function(){for(var a=[],c=0;c<this.a.length-1;c++)a.push(0);return{g:a,m:0}};h.prototype.filter=function(a){for(var c=0,b=this.a.length;c<b;c++)a=this.l(c,a);return a};h.prototype.b=function(a){var c=
{z:[0,0],i:[],c:[]};a=this.j(a,c);c.k=1;c.c.push((1-a.o)/(2*a.f));c.c.push(2*c.c[0]);c.c.push(c.c[0]);return c};h.prototype.j=function(a,c){var b={},d=2*Math.PI*a.s/a.u;b.alpha=Math.sin(d)/(2*a.Q);b.o=Math.cos(d);b.f=1+b.alpha;c.f=b.f;c.i.push(-2*b.o/b.f);c.k=1;c.i.push((1-b.alpha)/b.f);return b};h.prototype.l=function(a,c){var b=c*this.a[a].k-this.a[a].v*this.a[a].z[0]-this.a[a].w*this.a[a].z[1],d=this.a[a].A*b+this.a[a].B*this.a[a].z[0]+this.a[a].C*this.a[a].z[1];this.a[a].z[1]=this.a[a].z[0];this.a[a].z[0]=
b;return d};h.prototype.reset=function(){for(var a=0;a<this.a.length;a++)this.a[a].z=[0,0]};var v={point:!1,linear:!1,cubic:!0,sinc:!0},q={IIR:16,FIR:71},w={IIR:h,FIR:k};
n.Filter=w; //直接导出 butterworth-lpf.js
n.resample=function(a,c,b,d){d=void 0===d?{}:d;var e=new Float64Array(a.length*((b-c)/c+1));d.method=d.method||"cubic";var f=new g(a.length,e.length,{method:d.method,tension:d.tension||0,sincFilterSize:d.sincFilterSize||6,sincWindow:d.sincWindow||void 0});void 0===d.LPF&&(d.LPF=v[d.method]);if(d.LPF){d.LPFType=d.LPFType||"IIR";var r=
w[d.LPFType];if(b>c){c=new r(d.LPFOrder||q[d.LPFType],b,c/2);b=0;for(d=e.length;b<d;b++)e[b]=c.filter(f.h(b,a));c.reset();for(a=e.length-1;0<=a;a--)e[a]=c.filter(e[a])}else{c=new r(d.LPFOrder||q[d.LPFType],c,b/2);b=0;for(d=a.length;b<d;b++)a[b]=c.filter(a[b]);c.reset();for(b=a.length-1;0<=b;b--)a[b]=c.filter(a[b]);p(a,e,f)}}else p(a,e,f);return e};/*Object.defineProperty(n,"__esModule",{value:!0})}
"object"===typeof exports&&"undefined"!==typeof module?m(exports):"function"===typeof define&&define.L?define(["exports"],m):(l=l||self,m(l.waveResampler={}));
*/}
m(waveResampler);
})();

//覆盖SampleData的filter，waveResampler的IIR低通滤波效果极佳（但计算量偏大点 butterworth-lpf.js）
var set_Recorder_IIRFilter=function(){
	if(!Recorder.__F2_IIRFilter)Recorder.__F2_IIRFilter=Recorder.IIRFilter;
	if(!useFilter){
		Recorder.IIRFilter=Recorder.__F2_IIRFilter;
		return;
	}
	Recorder.IIRFilter=(useLowPass, sampleRate, freq)=>{
		if(!useLowPass) return null;
		if(!isUpsampleNewVer) freq=freq/3*4; //老版本的频率为3/4 恢复成原值
		var m=/(\w+)-(\d+)/.exec(useFilter);
		var fn=new waveResampler.Filter[m[1]](+m[2],sampleRate,freq);
		fn=fn.filter.bind(fn);
		fn.fName=useFilter;
		return fn;
	};
};

})();
