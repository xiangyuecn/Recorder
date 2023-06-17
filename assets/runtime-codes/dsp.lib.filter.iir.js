/******************
《【Demo库】【信号处理】IIR低通、高通滤波》
作者：高坚果
时间：2023-01-11 16:32

移植java代码测试，测试结果： IIRFilter_DigitalAudio 比 IIRFilter_Minim 过滤的干净，需要的频率能量损失也更小

【文档】：
filter=Recorder.IIRFilter_DigitalAudio(useLowPass, sampleRate, freq) //【推荐使用】
filter=Recorder.IIRFilter_Minim(useLowPass, sampleRate, freq) //不推荐使用
		useLowPass: true或false，true为低通滤波，false为高通滤波
		sampleRate: 待处理pcm的采样率
		freq: 截止频率Hz，最大频率为sampleRate/2
				，低通时会切掉高于此频率的声音，高通时会切掉低于此频率的声音
				，注意滤波并非100%的切掉不需要的声音，而是减弱频率对应的声音
					，离截止频率越远对应声音减弱越厉害
					，离截止频率越近声音就几乎无衰减

创建好对应的filter，返回的是一个函数，用此函数对pcm的每个采样值按顺序进行处理即可：
	for(var i=0;i<pcm.length;i++){ //pcm: Int16Array
		newPcm[i]=filter( pcm[i] ); //对pcm的每个采样值处理一遍，即可得到滤波后的pcm数据
		//newPcm[i]=filter_highPass( newPcm[i] ); //低通+高通组合一下就成了带通滤波
	}
******************/

/******Java代码1******/
//https://gitee.com/52jian/digital-audio-filter/blob/master/src/main/java/com/zj/filter/AudioFilter.java
//https://blog.csdn.net/Janix520/article/details/118411734
Recorder.IIRFilter_DigitalAudio=function(useLowPass, sampleRate, freq){
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
Recorder.IIRFilter_Minim=function(useLowPass, sampleRate, freq){
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
	,{name:"或录一段音作为素材",click:"srcStart"}
	,{name:"结束素材录音",click:"srcStop"}
	,{html:`<hr />
<div>
	<div>低通：<input class="in_lowPassHz" style="width:100px">Hz，不填不滤波<span class="maxHz"></span></div>
	<div>高通：<input class="in_highPassHz" style="width:100px">Hz，不填不滤波<span class="maxHz"></span></div>
	<div>采样率：<input class="in_sampleRate" style="width:100px">，不填不转换采样率<span class="maxSampleRate"></span></div>
</div>`}
	,{name:"调用转换_DigitalAudio",click:"test(1);Date.now"}
	,{name:"调用转换_Minim",click:"test(2);Date.now"}
	,{name:"调用转换_Minim_FS",click:"test(2,true);Date.now"}
	
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

//调用录音
var srcRec;
function srcStart(){
	srcRec&&srcRec.close();
	
	srcRec=Recorder({
		type:"wav"
		,sampleRate:16000
		,bitRate:16
		,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate,newBufferIdx){
			Runtime.Process.apply(null,arguments);
			//支持实时滤波，在这里给buffers中的newBufferIdx开始的数据进行处理即可
		}
	});
	var t=setTimeout(function(){
		Runtime.Log("无法录音：权限请求被忽略（超时假装手动点击了确认对话框）",1);
	},8000);
	
	srcRec.open(function(){//打开麦克风授权获得相关资源
		clearTimeout(t);
		srcRec.start();//开始录音
	},function(msg,isUserNotAllow){//用户拒绝未授权或不支持
		clearTimeout(t);
		Runtime.Log((isUserNotAllow?"UserNotAllow，":"")+"无法录音:"+msg, 1);
	});
};
function srcStop(){
	if(!srcRec){
		Runtime.Log("未开始素材录音",1);
		return;
	}
	srcRec.stop(function(blob,duration){
		setPcmData({//不要blob，直接取录制的pcm数据
			pcm:Recorder.SampleData(srcRec.buffers,srcRec.srcSampleRate,srcRec.srcSampleRate).data
			,sampleRate:srcRec.srcSampleRate
			,isRec:true
		})
	},function(msg){
		Runtime.Log("录音失败:"+msg, 1);
	},true);
};

//设置待转换的pcm数据
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
		Runtime.LogAudio(blob,duration,rec,data.isRec?"":"文件解码成功");
		Runtime.Log("pcm数据已准备好，可以开始转换了，pcm.sampleRate="+data.sampleRate,2);
	});
};

//调用测试
var test=function(fn,useFS){
	if(!pcmData){
		Runtime.Log("请先录个素材或拖一个文件进来解码",1);
		return;
	}
	var srcSampleRate=pcmData.sampleRate;
	var lowPassHz=+$(".in_lowPassHz").val()||0;
	var highPassHz=+$(".in_highPassHz").val()||0;
	var newSampleRate=+$(".in_sampleRate").val()||0;
	
	var lowPass=null,highPass=null,fnName="";
	if(fn==1){
		fnName="IIRFilter_DigitalAudio";
	}else{
		fnName="IIRFilter_Minim";
	}
	if(useFS && (fnName!="IIRFilter_Minim" || !lowPassHz)){
		Runtime.Log("FS参数只支持 IIRFilter_Minim 低通滤波",1);
		return;
	}
	if(!lowPassHz && !highPassHz){
		Runtime.Log("至少要填一个滤波频率参数",1);
		return;
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
	
	if(!Recorder.__IIRFilterBak)Recorder.__IIRFilterBak=Recorder.IIRFilter;
	Recorder.IIRFilter=function(){return function(v){return v}};//禁用默认的滤波
	var rec=Recorder({
		type:"wav",bitRate:16,sampleRate:newSampleRate||srcSampleRate
	}).mock(pcm,srcSampleRate);
	rec.stop(function(blob,duration){
		Recorder.IIRFilter=Recorder.__IIRFilterBak;
		Runtime.LogAudio(blob,duration,rec,"已转换"+fn);
	});
};