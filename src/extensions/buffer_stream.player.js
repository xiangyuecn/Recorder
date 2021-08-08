/*
录音 Recorder扩展，实时播放录音片段文件，把片段文件转换成MediaStream流

https://github.com/xiangyuecn/Recorder

BufferStreamPlayer可以通过input方法一次性输入整个音频文件，或者实时输入音频片段文件，然后播放出来；输入支持格式：pcm、wav、mp3等浏览器支持的音频格式，非pcm格式会自动解码成pcm（播放音质效果比pcm、wav格式差点）；输入前输入后都可进行处理要播放的音频，比如：混音、变速、变调；输入的音频会写入到内部的MediaStream流中，完成将连续的音频片段文件转换成流。

BufferStreamPlayer可以用于：
	1. Recorder onProcess等实时处理中，将实时处理好的音频片段转直接换成MediaStream，此流可以作为WebRTC的local流发送到对方，或播放出来；
	2. 接收到的音频片段文件的实时播放，比如：WebSocket接收到的录音片段文件播放、WebRTC remote流（Recorder支持对这种流进行实时处理）实时处理后的播放。

调用示例：
	var stream=Recorder.BufferStreamPlayer(set)
	//创建好后第一件事就是start打开流，打开后就会开始播放input输入的音频
	stream.start(()=>{
		//如果不要默认的播放，可以设置set.play为false，这种情况下只拿到MediaStream来用
		stream.getMediaStream() //通过getMediaStream方法得到MediaStream流，此流可以作为WebRTC的local流发送到对方，或者自己拿来作为audio.srcObject来播放（有提供更简单的getAudioSrc方法）；未start时调用此方法将会抛异常
		
		stream.getAudioSrc() //得到MediaStream流的字符串播放地址，可赋值给audio标签的src，直接播放音频；未start时调用此方法将会抛异常
	},(errMsg)=>{
		//start失败，无法播放
	});

	//随时都能调用input，会等到start成功后播放出来，不停的调用input，就能持续的播放出声音了，需要暂停播放就不要调用input就行了
	stream.input(anyData);

	//不要播放了就调用stop停止播放，关闭所有资源
	stream.stop();
	


注意：已知Firefox的AudioBuffer没法动态修改数据，所以对于带有这种特性的浏览器将采用先缓冲后再播放（类似assets/runtime-codes/fragment.playbuffer.js），音质会相对差一点；其他浏览器测试Android、IOS、Chrome无此问题；start方法中有一大段代码给浏览器做了特性检测并进行兼容处理。
*/
(function(){
"use strict";

var BufferStreamPlayer=function(set){
	return new fn(set);
};
var fn=function(set){
	var This=this;
	var o={
		play:true //要播放声音，设为false不播放，只提供MediaStream
		,realtime:true /*默认为true实时模式，设为false为非实时模式
			实时模式：
				如果有新的input输入数据，但之前输入的数据还未播放完，如果积压的数据量过大则积压的数据将会被直接丢弃，少量积压会和新数据一起加速播放，最终达到尽快播放新输入的数据的目的；这在网络不流畅卡顿时会发挥很大作用，可有效降低播放延迟
			非实时模式：
				连续完整的播放完所有input输入的数据，之前输入的还未播放完又有新input输入会加入队列排队播放，比如用于：一次性同时输入几段音频完整播放
			*/
				
		
		//,onInputError:fn(errMsg, inputIndex) //当input输入出错时回调，参数为input第几次调用和错误消息
		
		//,decode:false //input输入的数据在调用transform之前是否要进行一次音频解码成pcm [Int16,...]
			//mp3、wav等都可以设为true，会自动解码成pcm
		
		//transform:fn(inputData,sampleRate,True,False)
			//将input输入的data（如果开启了decode将是解码后的pcm）转换处理成要播放的pcm数据；如果没有解码也没有提供本方法，input的data必须是[Int16,...]并且设置set.sampleRate
			//inputData:any input方法输入的任意格式数据，只要这个转换函数支持处理
			//sampleRate:123 如果设置了decode为解码后的采样率，否则为set.sampleRate || null
			//True([Int16,...],sampleRate) 回调处理好的pcm数据和pcm的采样率
			//False(errMsg) 处理失败回调
			
		//sampleRate:16000 //可选input输入的数据默认的采样率，当没有设置解码也没有提供transform时应当明确设置采样率
	};
	for(var k in set){
		o[k]=set[k];
	};
	This.set=set=o;
	
	if(!set.onInputError){
		set.onInputError=function(err,n){
			console.error("[BufferStreamPlayer]"+err);
		};
	}
};
fn.prototype=BufferStreamPlayer.prototype={
	/**获取MediaStream的audio播放地址，未start将会抛异常**/
	getAudioSrc:function(){
		if(!this._src){
			this._src=(window.URL||webkitURL).createObjectURL(this.getMediaStream());
		}
		return this._src;
	}
	/**获取MediaStream流对象，未start将会抛异常**/
	,getMediaStream:function(){
		if(!this._dest){
			throw new Error("BufferStreamPlayer未start");
		}
		return this._dest.stream;
	}
	
	
	/**打开音频流，打开后就会开始播放input输入的音频
	 * True() 打开成功回调
	 * False(errMsg) 打开失败回调**/
	,start:function(True,False){
		var This=this;
		This.inputN=0;//第n次调用input
		
		This.inputQueueIdx=0;//input调用队列当前已处理到的位置
		This.inputQueue=[];//input调用队列，用于纠正执行顺序
		
		This.bufferSampleRate=0;//audioBuffer的采样率，首次input后就会固定下来
		This.audioBuffer=0;
		This.pcmBuffer=[[],[]];//未推入audioBuffer的pcm数据缓冲
		
		var fail=function(msg){
			False&&False("浏览器不支持打开BufferStreamPlayer"+(msg?"："+msg:""));
		};
		
		var support=1;
		if(!Recorder.Support()){
			support=0;
		}else{
			var source=Recorder.Ctx.createBufferSource();
			if(!source.start || source.onended===undefined){
				support=0;//createBufferSource版本太低，难兼容
			}
		};
		if(!support){
			fail("");
			return;
		};
		
		
		var end=function(){
			//创建MediaStream
			var dest=Recorder.Ctx.createMediaStreamDestination();
			dest.channelCount=1;
			This._dest=dest;
						
			True&&True();
			
			This._inputProcess();//处理未完成start前的input调用
			
			//定时在没有input输入时，将未写入buffer的数据写进去
			if(!badAB){
				This._writeInt=setInterval(function(){
					This._writeBuffer();
				},500);
			}else{
				console.warn("BufferStreamPlayer：此浏览器的AudioBuffer实现不支持动态特性，采用兼容模式");
				This._writeInt=setInterval(function(){
					This._writeBad();
				},10);//定时调用进行数据写入播放
			}
		};
		
		var badAB=BufferStreamPlayer.BadAudioBuffer;
		if(This.__abTest || badAB!=null){
			setTimeout(end); //应当setTimeout一下强转成异步，统一调用代码时的行为
		}else{
			//浏览器实现检测，已知Firefox的AudioBuffer没法在_writeBuffer中动态修改数据；检测方法：直接新开一个，输入一段测试数据，看看能不能拿到流中的数据
			var testStream=BufferStreamPlayer({ play:false,sampleRate:8000 });
			testStream.__abTest=1;
			testStream.start(function(){
				var testRec=Recorder({
					type:"unknown"
					,sourceStream:testStream.getMediaStream()
					,onProcess:function(buffers){	
						var bf=buffers[buffers.length-1],all0=1;
						for(var i=0;i<bf.length;i++){
							if(bf[i]!=0){ all0=0; break; }
						}
						if(all0 && buffers.length<5){
							return;//再等等看，最长约等500ms
						}
						testRec.close();
						testStream.stop();
						
						//全部是0就是浏览器不行，要缓冲一次性播放进行兼容
						badAB=all0;
						BufferStreamPlayer.BadAudioBuffer=badAB;
						end();
					}
				});
				testRec.open(function(){
					testRec.start();
				},fail);
			},fail);
			
			//随机生成1秒的数据，rec有一次回调即可
			var data=new Int16Array(8000);
			for(var i=0;i<8000;i++){
				data[i]=~~(Math.random()*0x7fff*2-0x7fff);
			}
			testStream.input(data);
		}
	}
	/**停止播放，关闭所有资源**/
	,stop:function(){
		var This=this;
		clearInterval(This._writeInt);
		This.inputQueue=0;
		
		if(This._src){
			(window.URL||webkitURL).revokeObjectURL(This._src);
			This._src=0;
		}
		
		var source=This.bufferSource;
		if(source){
			source.disconnect();
			source.stop();
		}
		This.bufferSource=0;
		This.audioBuffer=0;
	}
	
	
	
	/**输入任意格式的音频数据，未完成start前调用会等到start成功后生效
		anyData: any 具体类型取决于：
			set.decode为false时:
				未提供set.transform，数据必须是pcm[Int16,...]，此时的set必须提供sampleRate；
				提供了set.transform，数据为transform方法支持的任意格式。
			set.decode为true时:
				数据必须是ArrayBuffer，会自动解码成pcm[Int16,...]；注意输入的每一片数据都应该是完整的一个音频片段文件，否则可能会解码失败。
				
		关于anyData的二进制长度：
			如果是提供的pcm、wav格式数据，数据长度对播放无太大影响，很短的数据也能很好的连续播放。
			如果是提供的mp3这种必须解码才能获得pcm的数据，数据应当尽量长点，测试发现片段有300ms以上解码后能很好的连续播放，低于100ms解码后可能会有明显的杂音，更低的可能会解码失败；当片段确实太小时，可以将本来会多次input调用的数据缓冲起来，等数据量达到了300ms再来调用一次input，能比较显著的改善播放音质。
	 **/
	,input:function(anyData){
		var This=this,set=This.set;
		var inputN=++This.inputN;
		if(!This.inputQueue){
			throw new Error("未调用start方法");
		}
		
		if(set.decode){
			//先解码
			DecodeAudio(anyData, function(data){
				if(!This.inputQueue)return;//stop了
				
				FadeInOut(data.data, data.sampleRate);//解码后的数据进行一下淡入淡出处理，减少爆音
				This._input2(inputN, data.data, data.sampleRate);
			},function(err){
				This._inputErr(err, inputN);
			});
		}else{
			This._input2(inputN, anyData, set.sampleRate);
		}
	}
	//transform处理
	,_input2:function(inputN, anyData, sampleRate){
		var This=this,set=This.set;
		
		if(set.transform){
			set.transform(anyData, sampleRate, function(pcm, sampleRate2){
				if(!This.inputQueue)return;//stop了
				
				sampleRate=sampleRate2||sampleRate;
				This._input3(inputN, pcm, sampleRate);
			},function(err){
				This._inputErr(err, inputN);
			});
		}else{
			This._input3(inputN, anyData, sampleRate);
		}
	}
	//转换好的pcm加入input队列，纠正调用顺序，未start时等待
	,_input3:function(inputN, pcm, sampleRate){
		var This=this;
		
		if(!pcm || !pcm.subarray){
			This._inputErr("input调用失败：非pcm[Int16,...]输入时，必须解码或者使用transform转换", inputN);
			return;
		}
		if(!sampleRate){
			This._inputErr("input调用失败：未提供sampleRate", inputN);
			return;
		}
		if(This.bufferSampleRate && This.bufferSampleRate!=sampleRate){
			This._inputErr("input调用失败：data的sampleRate="+sampleRate+"和之前的="+This.bufferSampleRate+"不同", inputN);
			return;
		}
		if(!This.bufferSampleRate){
			This.bufferSampleRate=sampleRate;//首次处理后，固定下来，后续的每次输入都是相同的
		}
		
		//加入队列，纠正input执行顺序，解码、transform均有可能会导致顺序不一致
		This.inputQueue[inputN]=pcm;
		
		if(This._dest){//已start，可以开始处理队列
			This._inputProcess();
		}
	}
	,_inputErr:function(errMsg, inputN){
		this.inputQueue[inputN]=1;//出错了，队列里面也要占个位
		this.set.onInputError(errMsg, inputN);
	}
	//处理input队列
	,_inputProcess:function(){
		var This=this;
		if(!This.bufferSampleRate){
			return;
		}
		
		var queue=This.inputQueue;
		for(var i=This.inputQueueIdx+1;i<queue.length;i++){
			var pcm=queue[i];
			if(pcm==1){
				This.inputQueueIdx=i;//跳过出错的input
				continue;
			}
			if(!pcm){
				return;//之前的input还未进入本方法，退出等待
			}
			
			This.inputQueueIdx=i;
			queue[i]=null;
			
			//推入缓冲，最多两个元素 [堆积的，新的]
			var pcms=This.pcmBuffer;
			var pcm0=pcms[0],pcm1=pcms[1];
			if(pcm0.length){
				if(pcm1.length){
					var tmp=new Int16Array(pcm0.length+pcm1.length);
					tmp.set(pcm0);
					tmp.set(pcm1,pcm0.length);
					pcms[0]=tmp;
				}
			}else{
				pcms[0]=pcm1;
			}
			pcms[1]=pcm;
		}
		
		if(!BufferStreamPlayer.BadAudioBuffer){
			if(!This.audioBuffer){
				This._createBuffer(true);
			}else{
				This._writeBuffer();
			}
		}else{
			This._writeBad();
		}
	}
	
	
	
	
	
	
	/****************正常的播放处理****************/
	//创建播放buffer
	,_createBuffer:function(init){
		var This=this,set=This.set;
		if(!init && !This.audioBuffer){
			return;
		}
		
		var ctx=Recorder.Ctx;
		var sampleRate=This.bufferSampleRate;
		var bufferSize=sampleRate*60;//建一个可以持续播放60秒的buffer，循环写入数据播放，大点好简单省事
		var buffer=ctx.createBuffer(1, bufferSize,sampleRate);
		
		var source=ctx.createBufferSource();
		source.channelCount=1;
		source.buffer=buffer;
		source.connect(This._dest);
		if(set.play){//播放出声音
			source.connect(ctx.destination);
		}
		source.onended=function(){
			source.disconnect();
			source.stop();
			
			This._createBuffer();//重新创建buffer
		};
		source.start();//古董 source.noteOn(0) 不支持onended 放弃支持
		
		This.bufferSource=source;
		This.audioBuffer=buffer;
		This.audioBufferIdx=0;
		This._createBufferTime=Date.now();
		
		This._writeBuffer();
	}
	,_writeBuffer:function(){
		var This=this,set=This.set;
		var buffer=This.audioBuffer;
		var sampleRate=This.bufferSampleRate;
		var oldAudioBufferIdx=This.audioBufferIdx;
		if(!buffer){
			return;
		}
		
		//计算已播放的量，可能已播放过头了，卡了没有数据
		var playSize=Math.floor((Date.now()-This._createBufferTime)/1000*sampleRate);
		if(This.audioBufferIdx+0.005*sampleRate<playSize){//5ms动态区间
			This.audioBufferIdx=playSize;//将写入位置修正到当前播放位置
		}
		//写进去了，但还未被播放的量
		var wnSize=Math.max(0, This.audioBufferIdx-playSize);
		
		//这次最大能写入多少；不能超过800ms（定时器是500ms），包括写入了还未播放的
		var maxSize=buffer.length-This.audioBufferIdx;
		maxSize=Math.min(maxSize, ~~(0.8*sampleRate)-wnSize);
		if(maxSize<1){//写不下了，退出
			return;
		}
		
		var pcms=This.pcmBuffer;
		var pcm0=pcms[0],pcm1=pcms[1];
		if(pcm0.length+pcm1.length==0){//无可用数据，退出
			return;
		}
		
		var pcmSize=0,speed=1;
		var realMode=set.realtime;
		while(realMode){
			//************实时模式************
			//尽量同步播放，避免过大延迟，但始终保持延迟150ms播放新数据，这样每次添加进新数据都是接到还未播放到的最后面，减少引入的杂音，减少网络波动的影响
			var delaySecond=0.15;
			
			//计算当前堆积的量
			var dSize=wnSize+pcm0.length;
			
			//堆积的在300ms内按正常播放
			if(dSize<delaySecond*2 *sampleRate){
				//至少要延迟播放新数据
				var d150Size=Math.floor(delaySecond*sampleRate-dSize);
				if(oldAudioBufferIdx==0 && d150Size>0){
					//开头加上少了的延迟
					This.audioBufferIdx=Math.max(This.audioBufferIdx, d150Size);
				}
				
				realMode=false;//切换成顺序播放
				break;
			}
			
			//堆积的太多，要加速播放了，最多播放积压最后3秒的量，超过的直接丢弃
			var pcmNs=3*sampleRate-wnSize;
			if(pcm0.length>pcmNs){//丢弃超过秒数的
				pcm0=pcm0.subarray(pcm0.length-pcmNs);
				pcms[0]=pcm0;
			}
			
			speed=1.6;//倍速，重采样
			//计算要截取出来量
			pcmSize=Math.min(maxSize, Math.floor((pcm0.length+pcm1.length)/speed));
			break;
		}
		if(!realMode){
			//*******按顺序取数据播放*********
			//计算要截取出来量
			pcmSize=Math.min(maxSize, pcm0.length+pcm1.length);
		}
		if(!pcmSize){
			return;
		}
		
		//截取数据并写入到audioBuffer中
		This.audioBufferIdx=This._subWrite(buffer,pcmSize,This.audioBufferIdx,speed);
	}
	
	
	/****************兼容播放处理，播放音质略微差点****************/
	,_writeBad:function(){
		var This=this,set=This.set;
		var buffer=This.audioBuffer;
		var sampleRate=This.bufferSampleRate;
		var ctx=Recorder.Ctx;
		
		//正在播放，5ms不能结束就等待播放完，定时器是10ms
		if(buffer){
			var ms=buffer.length/sampleRate*1000;
			if(Date.now()-This._createBufferTime<ms-5){
				return;
			}
		}
		
		//这次最大能写入多少；限制到800ms
		var maxSize=~~(0.8*sampleRate);
		var st=set.PlayBufferDisable?0:sampleRate/1000*300;//缓冲播放，不然间隔太短接续爆音明显
		
		var pcms=This.pcmBuffer;
		var pcm0=pcms[0],pcm1=pcms[1];
		var allSize=pcm0.length+pcm1.length;
		if(allSize==0 || allSize<st){//无可用数据 不够缓冲量，退出
			return;
		}
		
		var pcmSize=0,speed=1;
		var realMode=set.realtime;
		while(realMode){
			//************实时模式************
			//计算当前堆积的量
			var dSize=pcm0.length;
			
			//堆积的在300ms内按正常播放
			if(dSize<0.3 *sampleRate){
				realMode=false;//切换成顺序播放
				break;
			}
			
			//堆积的太多，要加速播放了，最多播放积压最后3秒的量，超过的直接丢弃
			var pcmNs=3*sampleRate;
			if(pcm0.length>pcmNs){//丢弃超过秒数的
				pcm0=pcm0.subarray(pcm0.length-pcmNs);
				pcms[0]=pcm0;
			}
			
			speed=1.6;//倍速，重采样
			//计算要截取出来量
			pcmSize=Math.min(maxSize, Math.floor((pcm0.length+pcm1.length)/speed));
			break;
		}
		if(!realMode){
			//*******按顺序取数据播放*********
			//计算要截取出来量
			pcmSize=Math.min(maxSize, pcm0.length+pcm1.length);
		}
		if(!pcmSize){
			return;
		}
		
		//新建buffer，一次性完整播放当前的数据
		buffer=ctx.createBuffer(1,pcmSize,sampleRate);
		
		//截取数据并写入到audioBuffer中
		This._subWrite(buffer,pcmSize,0,speed);
		
		//首尾进行1ms的淡入淡出 大幅减弱爆音
		FadeInOut(buffer.getChannelData(0), sampleRate);
		
		var source=ctx.createBufferSource();
		source.channelCount=1;
		source.buffer=buffer;
		source.connect(This._dest);
		if(set.play){//播放出声音
			source.connect(ctx.destination);
		}
		source.start();//古董 source.noteOn(0) 不支持onended 放弃支持
		
		This.bufferSource=source;
		This.audioBuffer=buffer;
		This._createBufferTime=Date.now();
	}
	
	
	
	
	
	
	,_subWrite:function(buffer, pcmSize, offset, speed){
		var This=this;
		var pcms=This.pcmBuffer;
		var pcm0=pcms[0],pcm1=pcms[1];
		
		//截取数据
		var pcm=new Int16Array(pcmSize);
		var i=0,n=0;
		for(var j=0;n<pcmSize && j<pcm0.length;){//简单重采样
			pcm[n++]=pcm0[i];
			j+=speed; i=Math.round(j);
		}
		if(i>=pcm0.length){//堆积的消耗完了
			pcm0=new Int16Array(0);
			
			for(j=0,i=0;n<pcmSize && j<pcm1.length;){
				pcm[n++]=pcm1[i];
				j+=speed; i=Math.round(j);
			}
			if(i>=pcm1.length){
				pcm1=new Int16Array(0);
			}else{
				pcm1=pcm1.subarray(i);
			}
			pcms[1]=pcm1;
		}else{
			pcm0=pcm0.subarray(i);
		}
		pcms[0]=pcm0;
		
		
		//写入到audioBuffer中
		var channel=buffer.getChannelData(0);
		for(var i=0;i<pcmSize;i++,offset++){
			channel[offset]=pcm[i]/0x7FFF;
		}
		return offset;
	}
	
};



/**pcm数据进行首尾1ms淡入淡出处理，播放时可以大幅减弱爆音**/
var FadeInOut=BufferStreamPlayer.FadeInOut=function(arr,sampleRate){
	var sd=sampleRate/1000*1;
	for(var i=0;i<sd;i++){
		arr[i]*=i/sd;
	}
	for(var l=arr.length,i=l-sd;i<l;i++){
		arr[i]*=(l-i)/sd;
	}
};

/**解码音频文件成pcm**/
var DecodeAudio=BufferStreamPlayer.DecodeAudio=function(arrayBuffer,True,False){
	if(!Recorder.Support()){//强制激活Recorder.Ctx 不支持大概率也不支持解码
		False&&False("浏览器不支持音频解码");
		return;
	};
	
	var ctx=Recorder.Ctx;
	ctx.decodeAudioData(arrayBuffer,function(raw){
		var src=raw.getChannelData(0);
		var sampleRate=raw.sampleRate;
		
		var pcm=new Int16Array(src.length);
		for(var i=0;i<src.length;i++){//floatTo16BitPCM 
			var s=Math.max(-1,Math.min(1,src[i]));
			s=s<0?s*0x8000:s*0x7FFF;
			pcm[i]=s;
		};
		
		True&&True({
			sampleRate:sampleRate
			,duration:Math.round(src.length/sampleRate*1000)
			,data:pcm
		});
	},function(e){
		False&&False("音频解码失败:"+(e&&e.message||"-"));
	});
};

Recorder.BufferStreamPlayer=BufferStreamPlayer;

	
})();