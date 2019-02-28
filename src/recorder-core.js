/*
录音
https://github.com/xiangyuecn/Recorder
*/
(function(window){
"use strict";

//兼容环境
window.RecorderLM="2019-01-06 21:38:00";
var NOOP=function(){};
//end 兼容环境 ****从以下开始copy源码，到wav、mp3前面为止*****

function Recorder(set){
	return new initFn(set);
};
//是否已经打开了录音，所有工作都已经准备好了，就等接收音频数据了
Recorder.IsOpen=function(){
	var stream=Recorder.Stream;
	if(stream){
		var tracks=stream.getTracks();
		if(tracks.length>0){
			return tracks[0].readyState=="live";
		};
	};
	return false;
};
//判断浏览器是否支持录音，随时可以调用。注意：仅仅是检测浏览器支持情况，不会判断和调起用户授权，不会判断是否支持特定格式录音。
Recorder.Support=function(){
	var AC=window.AudioContext;
	if(!AC){
		AC=window.webkitAudioContext;
	};
	if(!AC){
		return false;
	};
	var scope=navigator.mediaDevices||{};
	if(!scope.getUserMedia){
		scope=navigator;
		scope.getUserMedia||(scope.getUserMedia=scope.webkitGetUserMedia||scope.mozGetUserMedia||scope.msGetUserMedia);
	};
	if(!scope.getUserMedia){
		return false;
	};
	
	Recorder.Scope=scope;
	if(!Recorder.Ctx||Recorder.Ctx.state=="closed"){
		//不能反复构造，低版本number of hardware contexts reached maximum (6)
		Recorder.Ctx=new AC();
	};
	return true;
};
function initFn(set){
	var o={
		type:"mp3" //输出类型：mp3,wav，wav输出文件尺寸超大不推荐使用，但mp3编码支持会导致js文件超大，如果不需支持mp3可以使js文件大幅减小
		,bitRate:16 //比特率 wav:16或8位，MP3：8kbps 1k/s，8kbps 2k/s 录音文件很小
		
		,sampleRate:16000 //采样率，wav格式大小=sampleRate*时间；mp3此项对低比特率有影响，高比特率几乎无影响。
					//wav任意值，mp3取值范围：48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000
					//采样率参考https://www.cnblogs.com/devin87/p/mp3-recorder.html
		
		,bufferSize:4096//AudioContext缓冲大小。会影响onProcess调用速度，相对于AudioContext.sampleRate=48000时，4096接近12帧/s，调节此参数可生成比较流畅的回调动画。
				//取值256, 512, 1024, 2048, 4096, 8192, or 16384
				//注意，取值不能过低，2048开始不同浏览器可能回调速率跟不上造成音质问题（低端浏览器→说的就是腾讯X5）
		,onProcess:NOOP //fn(this.buffer,powerLevel,bufferDuration,bufferSampleRate) buffer=[缓冲PCM数据,...]，powerLevel：当前缓冲的音量级别0-100，bufferDuration：已缓冲时长，bufferSampleRate：缓冲使用的采样率
	};
	
	for(var k in set){
		o[k]=set[k];
	};
	this.set=o;
};
Recorder.prototype=initFn.prototype={
	//打开录音资源True(),False(msg,isUserNotAllow)，需要调用close。注意：此方法是异步的；一般使用时打开，用完立即关闭；可重复调用，可用来测试是否能录音
	open:function(True,False){
		True=True||NOOP;
		False=False||NOOP;
		
		if(Recorder.IsOpen()){
			True();
			return;
		};
		if(!Recorder.Support()){
			False("此浏览器不支持录音",false);
			return;
		};
		
		var f1=function(stream){
			Recorder.Stream=stream;
			
			//https://github.com/xiangyuecn/Recorder/issues/14 获取到的track.readyState!="live"，刚刚回调时可能是正常的，但过一下可能就被关掉了，原因不明。延迟一下保证真异步。对正常浏览器不影响
			setTimeout(function(){
				if(Recorder.IsOpen()){
					True();
				}else{
					False("录音功能无效：无音频流");
				};
			},100);
		};
		var f2=function(e){
			var code=e.name||e.message||"";
			console.error(e);
			var notAllow=/Permission|Allow/i.test(code);
			False(notAllow?"用户拒绝了录音权限":"无法录音："+code,notAllow);
		};
		var pro=Recorder.Scope.getUserMedia({audio:true},f1,f2);
		if(pro&&pro.then){
			pro.then(f1)["catch"](f2);
		};
	}
	//关闭释放录音资源
	,close:function(call){
		call=call||NOOP;
		
		var This=this;
		This._stop();
		
		var stream=Recorder.Stream;
		if(stream){
			var tracks=stream.getTracks();
			for(var i=0;i<tracks.length;i++){
				tracks[i].stop();
			};
		};
		
		Recorder.Stream=0;
		call();
	}
	
	
	//开始录音，需先调用open；不支持、错误，不会有任何提示，stop时自然能得到错误
	,start:function(){
		var This=this,ctx=Recorder.Ctx;
		var buffer=This.buffer=[];//数据缓冲
		This.recSize=0;//数据大小
		This._stop();
		
		This.state=0;
		if(!Recorder.IsOpen()){
			return;
		};
		console.log("["+Date.now()+"]Start");
		This.srcSampleRate=ctx.sampleRate;
		This.isMock=0;
		
		if(ctx.state=="suspended"){
			ctx.resume().then(function(){
				console.log("ctx resume");
				This._start();
			});
		}else{
			This._start();
		};
	}
	,_start:function(){
		var This=this,set=This.set,buffer=This.buffer;
		var ctx=Recorder.Ctx;
		var media=This.media=ctx.createMediaStreamSource(Recorder.Stream);
		var process=This.process=(ctx.createScriptProcessor||ctx.createJavaScriptNode).call(ctx,set.bufferSize,1,1);//单声道，省的数据处理复杂
		
		var onInt;
		process.onaudioprocess=function(e){
			if(This.state!=1){
				return;
			};
			var o=e.inputBuffer.getChannelData(0);//块是共享的，必须复制出来
			var size=o.length;
			This.recSize+=size;
			
			var res=new Int16Array(size);
			var power=0;
			for(var j=0;j<size;j++){//floatTo16BitPCM 
				//var s=Math.max(-1,Math.min(1,o[j]*8));//PCM 音量直接放大8倍，失真还能接受
				var s=Math.max(-1,Math.min(1,o[j]));
				s=s<0?s*0x8000:s*0x7FFF;
				res[j]=s;
				power+=Math.abs(s);
			};
			buffer.push(res);
			
			/*https://blog.csdn.net/jody1989/article/details/73480259
			更高灵敏度算法:
				限定最大感应值10000
					线性曲线：低音量不友好
						power/10000*100 
					对数曲线：低音量友好，但需限定最低感应值
						(1+Math.log10(power/10000))*100
			*/
			power/=size;
			var powerLevel;
			if(power<1251){//1250的结果10%，更小的音量采用线性取值
				powerLevel=Math.round(power/1250*10);
			}else{
				powerLevel=Math.round(Math.min(100,Math.max(0,(1+Math.log10(power/10000))*100)));
			}
			
			var bufferSampleRate=This.srcSampleRate;
			var duration=Math.round(This.recSize/bufferSampleRate*1000);
			
			clearTimeout(onInt);
			onInt=setTimeout(function(){
				set.onProcess(buffer,powerLevel,duration,bufferSampleRate);
			});
		};
		
		media.connect(process);
		process.connect(ctx.destination);
		This.state=1;
	}
	,_stop:function(){
		var This=this;
		if(This.state){
			This.state=0;
			This.media.disconnect();
			This.process.disconnect();
		};
	}
	/*暂停录音*/
	,pause:function(_resume){
		var This=this;
		if(This.state){
			This.state=_resume||2;
		};
	}
	/*恢复录音*/
	,resume:function(){
		this.pause(1);
	}
	/*模拟一段录音数据，后面可以调用stop进行编码，需提供pcm数据[1,2,3...]，pcm的采样率*/
	,mock:function(pcmData,pcmSampleRate){
		var This=this;
		This.isMock=1;
		This.buffer=[pcmData];
		This.recSize=pcmData.length;
		This.srcSampleRate=pcmSampleRate;
		return This;
	}
	/*
	结束录音并返回录音数据blob对象
		True(blob,duration) blob：录音数据audio/mp3|wav格式
							duration：录音时长，单位毫秒
		False(msg)
	*/
	,stop:function(True,False){
		console.log("["+Date.now()+"]Stop");
		True=True||NOOP;
		False=False||NOOP;
		var This=this,set=This.set;
		
		if(!This.isMock){
			if(!This.state){
				False("未开始录音");
				return;
			};
			This._stop();
		};
		var size=This.recSize;
		if(!size){
			False("未采集到录音");
			return;
		};
		
		var sampleRate=set.sampleRate
			,srcSampleRate=This.srcSampleRate;
		//采样 https://www.cnblogs.com/blqw/p/3782420.html
		var step=srcSampleRate/sampleRate;
		if(step>1){//新采样高于录音采样不处理，省去了插值处理，直接抽样
			size=Math.floor(size/step);
		}else{
			step=1;
			sampleRate=srcSampleRate;
			set.sampleRate=sampleRate;
		};
		//准备数据
		var res=new Int16Array(size);
		var last=0,idx=0;
		for (var n=0,nl=This.buffer.length;n<nl;n++) {
			var o=This.buffer[n];
			var i=last,il=o.length;
			while(i<il){
				res[idx]=o[Math.round(i)];
				idx++;
				i+=step;//抽样
			};
			last=i-il;
		};
		var duration=Math.round(size/sampleRate*1000);
		
		setTimeout(function(){
			var t1=Date.now();
			This[set.type](res,function(blob){
				console.log("["+Date.now()+"]End",blob,duration,"编码耗时:"+(Date.now()-t1));
				True(blob,duration);
			},function(msg){
				False(msg);
			});
		});
	}
//end ****copy源码结束，到wav、mp3前面为止*****




};

window.Recorder=Recorder;

})(window);