/******************
《【测试】IIR低通、高通滤波》
作者：高坚果
时间：2023-01-11 16:32

移植java代码测试，测试结果： DigitalAudioFilter 比 MinimIIRFilter 过滤的干净，需要的频率能量损失也更小
******************/

/******Java代码1******/
//https://gitee.com/52jian/digital-audio-filter/blob/master/src/main/java/com/zj/filter/AudioFilter.java
//https://blog.csdn.net/Janix520/article/details/118411734
Recorder.DigitalAudioFilter=function(useLowPass, sampleRate, freq){
	var Q=1;
	var ov = 2 * Math.PI * freq / sampleRate;
	var sn = Math.sin(ov);
	var cs = Math.cos(ov);
	var alpha = sn / (2 * Q);
	
	var a0 = 1 + alpha;
	var a1 = (-2 * cs) / a0;
	var a2 = (1 - alpha) / a0;
	if(useLowPass){
		var b0 = (1 - cs) / 2 / a0;
		var b1 = (1 - cs) / a0;
		var b2 = (1 - cs) / 2 / a0;
	}else{
		var b0 = (1 + cs) / 2 / a0;
		var b1 = -(1 + cs) / a0;
		var b2 = (1 + cs) / 2 / a0;
	}
	
	var x1=0,x2=0,y=0,y1=0,y2=0;
	return function(x){
		y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
		x2 = x1;
		x1 = x;
		y2 = y1;
		y1 = y;
		return y;
	};
};


/******Java代码2******/
//https://github.com/ddf/Minim/tree/master/src/main/java/ddf/minim/effects
Recorder.MinimIIRFilter=function(useLowPass, sampleRate, freq){
	var freqFrac = freq/sampleRate;
	if(useLowPass=="FS"){ //LowPassFS.java
		var x = Math.exp(-14.445 * freqFrac);
		var a = [ Math.pow(1 - x, 4) ];
		var b = [ 4 * x, -6 * x * x, 4 * x * x * x, -x * x * x * x ];
	}else if(useLowPass){ //LowPassSP.java
		var x = Math.exp(-2*Math.PI*freqFrac);
		var a=[ 1 - x ];
		var b=[ x ];
	}else{ //HighPassSP.java
		var x = Math.exp(-2 * Math.PI * freqFrac);
		var a = [ (1+x)/2, -(1+x)/2 ];
		var b = [ x ];
	}
	
	var out=[],ins=[];
	for(var i=0,L=Math.max(a.length,b.length);i<L;i++){
		out[i]=0; ins[i]=0;
	}
	return function(x){ //IIRFilter.java uGenerate
		ins.splice(0,0,x);
		ins.length--;

		var y = 0;
		for(var ci = 0; ci < a.length; ci++) {
			y += a[ci] * ins[ci];
		}
		for(var ci = 0; ci < b.length; ci++) {
			y += b[ci] * out[ci];
		}
		out.splice(0,0,y);
		out.length--;
		return y;
	};
};






//=====测试代码==================
//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
	,{url:RootFolder+"/assets/runtime-codes/fragment.decode.wav.js",check:function(){return !window.DemoFragment||!DemoFragment.DecodeWav}}//引入DemoFragment.DecodeWav
]);

//显示控制按钮
Runtime.Ctrls([
	{html:'<div class="testChoiceFile"></div>'}
	,{html:`
<div>
	<div>低通：<input class="in_lowPassHz" style="width:100px">Hz，不填不滤波<span class="maxHz"></span></div>
	<div>高通：<input class="in_highPassHz" style="width:100px">Hz，不填不滤波<span class="maxHz"></span></div>
	<div>采样率：<input class="in_sampleRate" style="width:100px">，不填不转换采样率<span class="maxSampleRate"></span></div>
</div>`}
	,{name:"开始转换1",click:"test(1);Date.now"}
	,{name:"开始转换2",click:"test(2);Date.now"}
	,{name:"开始转换2_FS",click:"test(2,true);Date.now"}
	
	,{choiceFile:{multiple:false,title:"解码",
		process:function(fileName,arrayBuffer,filesCount,fileIdx,endCall){
			if(/\.wav$/i.test(fileName)){
				try{
					var data=DemoFragment.DecodeWav(new Uint8Array(arrayBuffer));
				}catch(e){
					Runtime.Log(fileName+"解码失败："+e.message,1);
					return endCall();
				}
				setPcmData({pcm:data.pcm,sampleRate:data.sampleRate});
				return endCall();
			}
			Runtime.DecodeAudio(fileName,arrayBuffer,function(data){
				setPcmData({pcm:data.data,sampleRate:data.sampleRate});
				
				endCall();
			},function(msg){
				Runtime.Log(msg,1);
				endCall();
			});
		}
	}}
]);

$(".testChoiceFile").append($(".RuntimeChoiceFileBox"));
var pcmData;
var setPcmData=function(data){
	pcmData=data;
	$(".maxHz").html("最高"+(data.sampleRate/2)+"Hz");
	$(".maxSampleRate").html("最大"+data.sampleRate);
	
	var rec=Recorder({
		type:"wav",bitRate:16,sampleRate:data.sampleRate
	}).mock(data.pcm,data.sampleRate);
	rec.stop(function(blob,duration){
		Runtime.LogAudio(blob,duration,rec,"文件解码成功");
		Runtime.Log("pcm数据已准备好，可以开始转换了，pcm.sampleRate="+data.sampleRate,2);
	});
};

var test=function(fn,useFS){
	if(!pcmData){
		Runtime.Log("请先拖一个文件进来解码",1);
		return;
	}
	var srcSampleRate=pcmData.sampleRate;
	var lowPassHz=+$(".in_lowPassHz").val()||0;
	var highPassHz=+$(".in_highPassHz").val()||0;
	var newSampleRate=+$(".in_sampleRate").val()||0;
	
	var lowPass=null,highPass=null,fnName="";
	if(fn==1){
		fnName="DigitalAudioFilter";
	}else{
		fnName="MinimIIRFilter";
	}
	if(lowPassHz)
		lowPass=Recorder[fnName](useFS?"FS":true,srcSampleRate,lowPassHz);
	if(highPassHz)
		highPass=Recorder[fnName](false,srcSampleRate,highPassHz);
	
	var pcm=new Int16Array(pcmData.pcm.length);
	for(var i=0;i<pcm.length;i++){
		var v=pcmData.pcm[i];
		if(lowPass)v=lowPass(v);
		if(highPass)v=highPass(v);
		pcm[i]=v;
	}
	
	Runtime.Log("开始转换"+fn+" "+fnName+(useFS?".FS":"")+"："+JSON.stringify({lowPass:lowPassHz,highPass:highPassHz,sampleRate:newSampleRate,srcSampleRate:srcSampleRate}),"#aaa");
	var rec=Recorder({
		type:"wav",bitRate:16,sampleRate:newSampleRate||srcSampleRate
	}).mock(pcm,srcSampleRate);
	rec.stop(function(blob,duration){
		Runtime.LogAudio(blob,duration,rec,"已转换"+fn);
	});
};