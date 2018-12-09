/*
录音
https://github.com/xiangyuecn/Recorder
*/
(function(window){
"use strict";

//兼容环境
window.RecorderLM="2018-12-09 19:16";
var NOOP=function(){};
var $={
	extend:function(a,b){
		a||(a={});
		b||(b={});
		for(var k in b){
			a[k]=b[k];
		}
		return a;
	}
};
//end 兼容环境 ****从以下开始copy源码，到wav、mp3前面为止*****

function Recorder(set){
	return new initFn(set);
};
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
function initFn(set){
	this.set=$.extend({
		type:"mp3" //输出类型：mp3,wav，wav输出文件尺寸超大不推荐使用，但mp3编码支持会导致js文件超大，如果不需支持mp3可以使js文件大幅减小
		,bitRate:16 //比特率 wav:16或8位，MP3：8kbps 1k/s，8kbps 2k/s 录音文件很小
		
		,sampleRate:16000 //采样率，wav格式大小=sampleRate*时间；mp3此项对低比特率有影响，高比特率几乎无影响。
					//wav任意值，mp3取值范围：48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000
					//采样率参考https://www.cnblogs.com/devin87/p/mp3-recorder.html
		
		,bufferSize:8192 //AudioContext缓冲大小，相对于ctx.sampleRate=48000/秒：
				//取值256, 512, 1024, 2048, 4096, 8192, or 16384，会影响onProcess调用速度
		,onProcess:NOOP //fn(this.buffer,powerLevel,bufferDuration) buffer=[缓冲数据,...]，powerLevel：当前缓冲的音量级别0-100，bufferDuration：已缓冲时长
	},set);
};
Recorder.prototype=initFn.prototype={
	//打开录音资源True(),False(msg)，需要调用close。注意：此方法是异步的；一般使用时打开，用完立即关闭；可重复调用，可用来测试是否能录音
	open:function(True,False){
		True=True||NOOP;
		False=False||NOOP;
		
		if(Recorder.IsOpen()){
			True();
			return;
		};
		var notSupport="此浏览器不支持录音";
		var AC=window.AudioContext;
		if(!AC){
			AC=window.webkitAudioContext;
		};
		if(!AC){
			False(notSupport);
			return;
		};
		var scope=navigator.mediaDevices||{};
		if(!scope.getUserMedia){
			scope=navigator;
			scope.getUserMedia||(scope.getUserMedia=scope.webkitGetUserMedia||scope.mozGetUserMedia||scope.msGetUserMedia);
		};
		if(!scope.getUserMedia){
			False(notSupport);
			return;
		};
		
		Recorder.Ctx=Recorder.Ctx||new AC();//不能反复构造，number of hardware contexts reached maximum (6)
		var f1=function(stream){
			Recorder.Stream=stream;
			True();
		};
		var f2=function(e){
			var code=e.name||e.message||"";
			console.error(e);
			False(/Permission|Allow/i.test(code)?"用户拒绝了录音权限":"无法录音："+code);
		};
		var pro=scope.getUserMedia({audio:true},f1,f2);
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
		console.log("["+Date.now()+"]Start");
		var This=this,set=This.set;
		var buffer=This.buffer=[];//数据缓冲
		This.recSize=0;//数据大小
		This._stop();
		
		This.state=0;
		if(!Recorder.IsOpen()){
			return;
		};
		
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
			
			power/=size;
			var powerLevel=0;
			if(power>0){
				//https://blog.csdn.net/jody1989/article/details/73480259
				powerLevel=Math.round(Math.max(0,(20*Math.log10(power/0x7fff)+34)*100/34));
			};
			var duration=Math.round(This.recSize/Recorder.Ctx.sampleRate*1000);
			
			clearTimeout(onInt);
			onInt=setTimeout(function(){
				set.onProcess(buffer,powerLevel,duration);
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
		
		if(!This.state){
			False("未开始录音");
			return;
		};
		This._stop();
		var size=This.recSize;
		if(!size){
			False("未采集到录音");
			return;
		};
		
		var sampleRate=set.sampleRate
			,ctxSampleRate=Recorder.Ctx.sampleRate;
		//采样 https://www.cnblogs.com/blqw/p/3782420.html
		var step=ctxSampleRate/sampleRate;
		if(step>1){//新采样高于录音采样不处理，省去了插值处理，直接抽样
			size=Math.floor(size/step);
		}else{
			step=1;
			sampleRate=ctxSampleRate;
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