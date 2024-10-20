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
本方法默认会缓冲播放，如果缓冲未满将不会进行播放，小片段偶尔播放应当禁用此特性store.PlayBufferDisable=true。

升级：新增的 BufferStreamPlayer 扩展(src/extensions/buffer_stream.player.js)，完全包含了本功能，并且播放音质效果更佳，可参考 teach.realtime.decode_buffer_stream_player.js 中的示例；不过对于仅仅播放PCM数据，本方法还是不错的选择，简单小巧。
******************/
(
window.DemoFragment||(window.DemoFragment={})
).PlayBuffer=function(store,buffer,sampleRate){
	var size=store.PlayBufferSize||0;
	var arr=store.PlayBufferArr||[];
	var st=store.PlayBufferDisable?0:sampleRate/1000*300;//缓冲播放，不然间隔太短接续爆音明显
	
	var ctx=store.PlayBufferCtx; //自动管理一个AudioContext的释放
	if(!ctx){
		Recorder.CLog("PlayBuffer new ctx");
		ctx=Recorder.GetContext(true);
		store.PlayBufferCtx=ctx;
		var ctxInt=setInterval(function(){ //长时间未使用，就自动释放掉
			if(Date.now()-ctx._useTime<5000)return;
			clearInterval(ctxInt);
			Recorder.CLog("PlayBuffer close ctx");
			Recorder.CloseNewCtx(ctx);
			store.PlayBufferCtx=0;
		},1000);
	}
	ctx._useTime=Date.now();
	
	size+=buffer.length;
	arr.push(buffer);
	if(size>=st){
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