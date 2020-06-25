/*
录音 Recorder扩展，DTMF（电话拨号按键信号）解码器，解码得到按键值
使用本扩展需要引入lib.fft.js支持

使用场景：电话录音软解，软电话实时提取DTMF按键信号等
https://github.com/xiangyuecn/Recorder
*/
(function(){
"use strict";

/*
参数：
	pcmData:[Int16,...] pcm一维数组，原则上一次处理的数据量不要超过10秒，太长的数据应当分段延时处理
	sampleRate: 123 pcm的采样率
	prevChunk: null || {} 上次的返回值，用于连续识别
	
返回:
	chunk:{
		keys:[keyItem,...] 识别到的按键，如果未识别到数组长度为0
				keyItem:{
					key:"" //按键值 0-9 #*
					time:123 //所在的时间位置，ms
				}
		
		//以下用于下次接续识别
		lastIs:"" "":mute {}:match 结尾处是什么
		lastCheckCount:0 结尾如果是key，此时的检查次数
		totalLen:0 总采样数，相对4khz
		pcm:[Int16,...] 4khz pcm数据
	}
*/
Recorder.DTMF_Decode=function(pcmData,sampleRate,prevChunk){
	prevChunk||(prevChunk={});
	var lastIs=prevChunk.lastIs||"";
	var lastCheckCount=prevChunk.lastCheckCount==null?99:prevChunk.lastCheckCount;
	var totalLen=prevChunk.totalLen||0;
	var prevPcm=prevChunk.pcm;
	
	var keys=[];
	
	if(!Recorder.LibFFT){
		throw new Error("需要lib.fft.js支持");
	};
	var bufferSize=256;//小一点每次处理的时长不会太长，也不要太小影响分辨率
	var fft=Recorder.LibFFT(bufferSize);
	
	
	/****初始值计算****/
	var windowSize=bufferSize/4;//滑动窗口大小，取值为4的原因：64/4=16ms，16ms*(3-1)=32ms，保证3次取值判断有效性
	var checkCount=3;//只有3次连续窗口内计算结果相同判定为有效信号或间隔
	var startTotal=totalLen;
	
	/****将采样率降低到4khz，单次fft处理1000/(4000/256)=64ms，分辨率4000/256=15.625hz，允许连续dtmf信号间隔128ms****/
	var stepFloat=sampleRate/4000;
	
	var newSize=Math.floor(pcmData.length/stepFloat);
	totalLen+=newSize;
	var pos=0;
	if(prevPcm&&prevPcm.length>bufferSize){//接上上次的数据，继续滑动
		pos=windowSize*(checkCount+1);
		newSize+=pos;
		startTotal-=pos;
	};
	var arr=new Int16Array(newSize);
	if(pos){
		arr.set(prevPcm.subarray(prevPcm.length-pos));//接上上次的数据，继续滑动
	};
	
	for(var idxFloat=0;idxFloat<pcmData.length;pos++,idxFloat+=stepFloat){
		//简单抽样
		arr[pos]=pcmData[Math.round(idxFloat)];
	};
	pcmData=arr;
	sampleRate=4000;
	
	
	var freqStep=sampleRate/bufferSize;//分辨率
	
	var Y0=1 << (Math.round(Math.log(bufferSize)/Math.log(2) + 3) << 1);
	var logY0 = Math.log(Y0)/Math.log(10);
	var logMin=Math.log(0x7fff*0.5)+logY0;//粗略计算信号强度最小值
	
	
	/****循环处理所有数据，识别出所有按键信号****/
	for(var i0=0; i0+bufferSize<=pcmData.length; i0+=windowSize){
		var arr=pcmData.subarray(i0,i0+bufferSize);
		var freqs=fft.transform(arr);
		
		var fv1=0,fv0=0,v1=0,v0=0;//查找高群和低群
		for(var i2=0;i2<freqs.length;i2++){
			var fv=freqs[i2];
			var v=(i2+1)*freqStep;
			if(fv>fv0 && v<1050){
				if(Math.log(fv)>logMin){//粗略计算信号强度
					fv0=fv;
					v0=v;
				};
			}else if(fv>fv1 && v>1050){
				if(Math.log(fv)>logMin){
					fv1=fv;
					v1=v;
				};
			};
		};
		var pv0 = FindIndex(v0, DTMF_Freqs[0], freqStep);
		var pv1 = FindIndex(v1, DTMF_Freqs[1], freqStep);
		
		
		var key="";
		if (pv0 >= 0 && pv1 >= 0) {
			key = DTMF_Chars[pv0][pv1];
			
			if(lastIs){
				if(lastIs.key==key){//有效，增加校验次数
					lastCheckCount++;
				}else{//异常数据，恢复间隔计数
					key="";
					lastCheckCount=lastIs.old+lastCheckCount;
				};
			}else if(lastCheckCount>=checkCount){//间隔够了，开始按键识别计数
				lastIs={key:key,old:lastCheckCount,start:i0,use:0};
				lastCheckCount=1;
			}else{//上次识别以来间隔不够，重置间隔计数
				key="";
				lastCheckCount=0;
			};
		}else{
			if(lastIs){//下一个，恢复间隔计数
				lastCheckCount=lastIs.old+lastCheckCount;
			};
		};
		
		if(key){
			//按键有效，并且未push过
			if(lastCheckCount>=checkCount && !lastIs.use){
				lastIs.use=1;
				keys.push({
					key:key
					,time:Math.round((startTotal+lastIs.start)/sampleRate*1000)
				});
			};
			//重置间隔数据
			if(lastIs.use){
				lastIs.old=0;
				lastCheckCount=0;
			};
		}else{
			//未发现按键
			lastIs="";
			lastCheckCount++;
		};
	};
	
	return {
		keys:keys
		
		,lastIs:lastIs
		,lastCheckCount:lastCheckCount
		,totalLen:totalLen
		,pcm:pcmData
	};
};



var DTMF_Freqs = [
	[697, 770, 852, 941],
	[1209, 1336, 1477, 1633]
];
var DTMF_Chars = [
	["1", "2", "3", "A"],
	["4", "5", "6", "B"],
	["7", "8", "9", "C"],
	["*", "0", "#", "D"],
];
var FindIndex=function(freq, freqs, freqStep){
	var idx=-1,idxb=1000;
	for(var i=0;i<freqs.length;i++){
		var xb=Math.abs(freqs[i]-freq);
		if(idxb>xb){
			idxb=xb;
			if(xb<freqStep*2){//2个分辨率内误差
				idx=i;
			};
		};
	};
	return idx;
};
	
})();