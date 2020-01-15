/******************
《【Demo库】PCM Buffer播放》
作者：高坚果
时间：2020-1-10 19:51:18

文档：
DemoFragment.PlayBuffer(store,buffer,sampleRate)
		store: {} 随便定义一个空对象即可，每次调用的时候传入，用于存储上下文数据
		buffer：[Int16,...] pcm数据，一维数组
		sampleRate：buffer的采样率
		
调用本方法前，应当确保Recorder.Support()是支持的。
******************/
(
window.DemoFragment||(window.DemoFragment={})
).PlayBuffer=function(store,buffer,sampleRate){
	var size=store.PlayBufferSize||0;
	var arr=store.PlayBufferArr||[];
	var st=sampleRate/1000*300;//缓冲播放，不然间隔太短接续爆音明显
	
	size+=buffer.length;
	arr.push(buffer);
	if(size>=st){
		var ctx=Recorder.Ctx;
		var audio=ctx.createBuffer(1,size,sampleRate);
		var channel=audio.getChannelData(0);
		var sd=sampleRate/1000*1;//1ms的淡入淡出 大幅减弱爆音
		for(var j=0,idx=0;j<arr.length;j++){
			var buf=arr[j];
			for(var i=0,l=buf.length,buf_sd=l-sd;i<l;i++){
				var factor=1;//淡入淡出因子
				if(i<sd){
					factor=i/sd;
				}else if(i>buf_sd){
					factor=(l-i)/sd;
				};
				
				channel[idx++]=buf[i]/0x7FFF*factor;
			};
		};
		var source=ctx.createBufferSource();
		source.channelCount=1;
		source.buffer=audio;
		source.connect(ctx.destination);
		if(source.start){source.start()}else{source.noteOn(0)};
		
		size=0;
		arr=[];
	};
	store.PlayBufferSize=size;
	store.PlayBufferArr=arr;
};