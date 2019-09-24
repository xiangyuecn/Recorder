/*
录音
https://github.com/xiangyuecn/Recorder
*/
(function(window){
"use strict";

//兼容环境
Recorder.LM="2019-9-9 21:09:34";
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
/*对pcm数据的采样率进行转换
pcmDatas: [[Int16,...]] pcm片段列表
pcmSampleRate:48000 pcm数据的采样率
newSampleRate:16000 需要转换成的采样率，newSampleRate>=pcmSampleRate时不会进行任何处理，小于时会进行重新采样
prevChunkInfo:{} 可选，上次调用时的返回值，用于连续转换，本次调用将从上次结束位置开始进行处理。或可自行定义一个ChunkInfo从pcmDatas指定的位置开始进行转换

返回ChunkInfo:{
	//可定义，从指定位置开始转换到结尾
	index:0 pcmDatas已处理到的索引
	offset:0.0 已处理到的index对应的pcm中的偏移的下一个位置
	
	//仅作为返回值
	sampleRate:16000 结果的采样率，<=newSampleRate
	data:[Int16,...] 结果
}
*/
Recorder.SampleData=function(pcmDatas,pcmSampleRate,newSampleRate,prevChunkInfo){
	prevChunkInfo||(prevChunkInfo={});
	var index=prevChunkInfo.index||0;
	var offset=prevChunkInfo.offset||0;
	
	var size=0;
	for(var i=index;i<pcmDatas.length;i++){
		size+=pcmDatas[i].length;
	};
	size=Math.max(0,size-Math.floor(offset));
	
	//采样 https://www.cnblogs.com/blqw/p/3782420.html
	var step=pcmSampleRate/newSampleRate;
	if(step>1){//新采样高于录音采样不处理，省去了插值处理，直接抽样
		size=Math.floor(size/step);
	}else{
		step=1;
		newSampleRate=pcmSampleRate;
	};
	//准备数据
	var res=new Int16Array(size);
	var idx=0;
	for (var nl=pcmDatas.length;index<nl;index++) {
		var o=pcmDatas[index];
		var i=offset,il=o.length;
		while(i<il){
			//res[idx]=o[Math.round(i)]; 直接简单抽样
			
			//https://www.cnblogs.com/xiaoqi/p/6993912.html
			//当前点=当前点+到后面一个点之间的增量，音质比直接简单抽样好些
			var before = Math.floor(i);
			var after = Math.ceil(i);
			var atPoint = i - before;
			res[idx]=o[before]+(o[after]-o[before])*atPoint;
			
			idx++;
			i+=step;//抽样
		};
		offset=i-il;
	};
	
	return {
		index:index
		,offset:offset
		
		,sampleRate:newSampleRate
		,data:res
	};
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
		,onProcess:NOOP //fn(buffers,powerLevel,bufferDuration,bufferSampleRate) buffers=[[Int16,...],...]：缓冲的PCM数据，为从开始录音到现在的所有pcm片段；powerLevel：当前缓冲的音量级别0-100，bufferDuration：已缓冲时长，bufferSampleRate：缓冲使用的采样率（当type支持边录边转码(Worker)时，此采样率和设置的采样率相同，否则不一定相同）
	};
	
	for(var k in set){
		o[k]=set[k];
	};
	this.set=o;
	
	this._S=9;//stop同步锁，stop可以阻止open过程中还未运行的start
};
//同步锁，控制对Stream的竞争；用于close时中断异步的open；一个对象open如果变化了都要阻止close，Stream的控制权交个新的对象
Recorder.Sync={/*open*/O:9,/*close*/C:9};

Recorder.prototype=initFn.prototype={
	//打开录音资源True(),False(msg,isUserNotAllow)，需要调用close。注意：此方法是异步的；一般使用时打开，用完立即关闭；可重复调用，可用来测试是否能录音
	open:function(True,False){
		var This=this;
		True=True||NOOP;
		False=False||NOOP;
		
		var ok=function(){
			True();
			
			This._SO=0;//解除stop对open中的start调用的阻止
		};
		
		//同步锁
		var Lock=Recorder.Sync;
		var lockOpen=++Lock.O,lockClose=Lock.C;
		This._O=This._O_=lockOpen;//记住当前的open，如果变化了要阻止close，这里假定了新对象已取代当前对象并且不再使用
		This._SO=This._S;//记住open过程中的stop，中途任何stop调用后都不能继续open中的start
		var lockFail=function(){
			//允许多次open，但不允许任何一次close，或者自身已经调用了关闭
			if(lockClose!=Lock.C || !This._O){
				var err="open被取消";
				if(lockOpen==Lock.O){
					//无新的open，已经调用了close进行取消，此处应让上次的close明确生效
					This.close();
				}else{
					err="open被中断";
				};
				False(err);
				return true;
			};
		};
		
		var checkSecure=function(){
			if(window.isSecureContext===false){
				False("无权录音(需https)");
				return 1;
			};
		};
		
		
		//如果已打开就不要再打开了
		if(Recorder.IsOpen()){
			ok();
			return;
		};
		if(!Recorder.Support()){
			checkSecure() || False("此浏览器不支持录音");
			return;
		};
		
		
		//请求权限，如果从未授权，一般浏览器会弹出权限请求弹框
		var f1=function(stream){
			Recorder.Stream=stream;
			if(lockFail())return;
			
			//https://github.com/xiangyuecn/Recorder/issues/14 获取到的track.readyState!="live"，刚刚回调时可能是正常的，但过一下可能就被关掉了，原因不明。延迟一下保证真异步。对正常浏览器不影响
			setTimeout(function(){
				if(lockFail())return;
				
				if(Recorder.IsOpen()){
					ok();
				}else{
					False("录音功能无效：无音频流");
				};
			},100);
		};
		var f2=function(e){
			var code=e.name||e.message||"";
			console.error(e);
			var notAllow=/Permission|Allow/i.test(code);
			
			checkSecure() || False(notAllow?"用户拒绝了录音权限":"无法录音："+code,notAllow);
		};
		var pro=Recorder.Scope.getUserMedia({audio:true},f1,f2);
		if(pro&&pro.then){
			pro.then(f1)[True&&"catch"](f2); //fix 关键字，保证catch压缩时保持字符串形式
		};
	}
	//关闭释放录音资源
	,close:function(call){
		call=call||NOOP;
		
		var This=this;
		This._stop();
		
		var Lock=Recorder.Sync;
		This._O=0;
		if(This._O_!=Lock.O){
			//唯一资源Stream的控制权已交给新对象，这里不能关闭。此处在每次都弹权限的浏览器内可能存在泄漏，新对象被拒绝权限可能不会调用close，忽略这种不处理
			console.warn("close被忽略");
			call();
			return;
		};
		Lock.C++;//获得控制权
		
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
	
	
	
	
	
	/*模拟一段录音数据，后面可以调用stop进行编码，需提供pcm数据[1,2,3...]，pcm的采样率*/
	,mock:function(pcmData,pcmSampleRate){
		var This=this;
		This._stop();//清理掉已有的资源
		
		This.isMock=1;
		This.buffers=[pcmData];
		This.recSize=pcmData.length;
		This.srcSampleRate=pcmSampleRate;
		return This;
	}
	,envStart:function(mockEnv,sampleRate){//和平台环境无关的start调用
		var This=this,set=This.set;
		This.isMock=mockEnv?1:0;//非H5环境需要启用mock
		This.buffers=[];//数据缓冲
		This.recSize=0;//数据大小
		
		set.sampleRate=Math.min(sampleRate,set.sampleRate);//engineCtx需要提前确定最终的采样率
		This.srcSampleRate=sampleRate;
		
		This.engineCtx=0;
		//此类型有边录边转码(Worker)支持
		if(This[set.type+"_start"]){
			var engineCtx=This.engineCtx=This[set.type+"_start"](set);
			if(engineCtx){
				engineCtx.pcmDatas=[];
				engineCtx.pcmSize=0;
			};
		};
	}
	,envIn:function(pcm,sum){//和平台环境无关的pcm[Int16]输入
		var This=this,set=This.set,engineCtx=This.engineCtx;
		var size=pcm.length;
		This.recSize+=size;
		
		var buffers=This.buffers;
		buffers.push(pcm);
		
		/*计算音量 https://blog.csdn.net/jody1989/article/details/73480259
		更高灵敏度算法:
			限定最大感应值10000
				线性曲线：低音量不友好
					power/10000*100 
				对数曲线：低音量友好，但需限定最低感应值
					(1+Math.log10(power/10000))*100
		*/
		var power=sum/size;
		var powerLevel;
		if(power<1251){//1250的结果10%，更小的音量采用线性取值
			powerLevel=Math.round(power/1250*10);
		}else{
			powerLevel=Math.round(Math.min(100,Math.max(0,(1+Math.log(power/10000)/Math.log(10))*100)));
		}
		
		var bufferSampleRate=This.srcSampleRate;
		var bufferSize=This.recSize;
		
		//此类型有边录边转码(Worker)支持，开启实时转码
		if(engineCtx){
			//转换成set的采样率
			var chunkInfo=Recorder.SampleData(buffers,bufferSampleRate,set.sampleRate,engineCtx.chunkInfo);
			engineCtx.chunkInfo=chunkInfo;
			
			engineCtx.pcmSize+=chunkInfo.data.length;
			bufferSize=engineCtx.pcmSize;
			buffers=engineCtx.pcmDatas;
			buffers.push(chunkInfo.data);
			bufferSampleRate=chunkInfo.sampleRate;
			
			//推入后台转码
			This[set.type+"_encode"](engineCtx,chunkInfo.data);
		};
		
		var duration=Math.round(bufferSize/bufferSampleRate*1000);
		
		set.onProcess(buffers,powerLevel,duration,bufferSampleRate);
	}
	
	
	
	
	//开始录音，需先调用open；只要open成功时，调用此方法是安全的，如果未open强行调用导致的内部错误将不会有任何提示，stop时自然能得到错误
	,start:function(){
		if(!Recorder.IsOpen()){
			console.error("未open");
			return;
		};
		console.log("["+Date.now()+"]Start");
		
		var This=this,set=This.set,ctx=Recorder.Ctx;
		This._stop();
		This.state=0;
		This.envStart(0,ctx.sampleRate);
		
		//检查open过程中stop是否已经调用过
		if(This._SO&&This._SO+1!=This._S){//上面调用过一次 _stop
			//open未完成就调用了stop，此种情况终止start。也应尽量避免出现此情况
			console.warn("start被中断");
			return;
		};
		This._SO=0;
		
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
		var This=this,set=This.set;
		
		var engineCtx=This.engineCtx;
		var ctx=Recorder.Ctx;
		var media=This.media=ctx.createMediaStreamSource(Recorder.Stream);
		var process=This.process=(ctx.createScriptProcessor||ctx.createJavaScriptNode).call(ctx,set.bufferSize,1,1);//单声道，省的数据处理复杂
		
		process.onaudioprocess=function(e){
			if(This.state!=1){
				return;
			};
			var o=e.inputBuffer.getChannelData(0);//块是共享的，必须复制出来
			var size=o.length;
			
			var pcm=new Int16Array(size);
			var sum=0;
			for(var j=0;j<size;j++){//floatTo16BitPCM 
				var s=Math.max(-1,Math.min(1,o[j]));
				s=s<0?s*0x8000:s*0x7FFF;
				pcm[j]=s;
				sum+=Math.abs(s);
			};
			
			This.envIn(pcm,sum);
		};
		
		media.connect(process);
		process.connect(ctx.destination);
		This.state=1;
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
	
	
	
	
	,_stop:function(keepEngine){
		var This=this,set=This.set;
		if(!This.isMock){
			This._S++;
		};
		if(This.state){
			This.state=0;
			This.media.disconnect();
			This.process.disconnect();
		};
		if(!keepEngine && This[set.type+"_stop"]){
			This[set.type+"_stop"](This.engineCtx);
			This.engineCtx=0;
		};
	}
	/*
	结束录音并返回录音数据blob对象
		True(blob,duration) blob：录音数据audio/mp3|wav格式
							duration：录音时长，单位毫秒
		False(msg)
		autoClose:false 可选，是否自动调用close，默认为false
	*/
	,stop:function(True,False,autoClose){
		console.log("["+Date.now()+"]Stop");
		var This=this,set=This.set,t1;
		
		var end=function(){
			This._stop();//彻底关掉engineCtx
			if(autoClose){
				This.close();
			};
		};
		var err=function(msg){
			False&&False(msg);
			end();
		};
		var ok=function(blob,duration){
			console.log("["+Date.now()+"]End",duration,"编码耗时:"+(Date.now()-t1),blob);
			if(blob.size<Math.max(100,duration/2)){//1秒小于0.5k？
				err("生成的"+set.type+"无效");
				return;
			};
			True&&True(blob,duration);
			end();
		};
		if(!This.isMock){
			if(!This.state){
				err("未开始录音");
				return;
			};
			This._stop(true);
		};
		var size=This.recSize;
		if(!size){
			err("未采集到录音");
			return;
		};
		if(!This[set.type]){
			err("未加载"+set.type+"编码器");
			return;
		};
		
		//此类型有边录边转码(Worker)支持
		var engineCtx=This.engineCtx;
		if(This[set.type+"_complete"]&&engineCtx){
			var pcmDatas=engineCtx.pcmDatas;
			var duration=Math.round(engineCtx.pcmSize/set.sampleRate*1000);//采用后的数据长度和buffers的长度可能微小的不一致，是采样率连续转换的精度问题
			
			t1=Date.now();
			This[set.type+"_complete"](engineCtx,function(blob){
				ok(blob,duration);
			},err);
			return;
		};
		
		//标准UI线程转码，调整采样率
		t1=Date.now();
		var chunk=Recorder.SampleData(This.buffers,This.srcSampleRate,set.sampleRate);
		
		set.sampleRate=chunk.sampleRate;
		var res=chunk.data;
		var duration=Math.round(res.length/set.sampleRate*1000);
		
		console.log("采样"+size+"->"+res.length+" 花:"+(Date.now()-t1)+"ms");
		
		setTimeout(function(){
			t1=Date.now();
			This[set.type](res,function(blob){
				ok(blob,duration);
			},function(msg){
				err(msg);
			});
		});
	}
//end ****copy源码结束，到wav、mp3前面为止*****




};

window.Recorder=Recorder;

})(window);