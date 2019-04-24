/*
amr编码器，beta版，需带上amr-engine.js引擎使用。如果需要播放amr音频，需要额外带上wav.js引擎来把amr转成wav
https://github.com/xiangyuecn/Recorder

当然最佳推荐使用mp3、wav格式，代码也是优先照顾这两种格式
浏览器支持情况
https://developer.mozilla.org/en-US/docs/Web/HTML/Supported_media_formats
*/
(function(){
"use strict";

Recorder.prototype.enc_amr={
	stable:false
	,testmsg:"采样率比特率设置无效，只提供8000hz，AMR12.2(12.8kbps)"
};

//True(wavBlob,duration),False(msg)
Recorder.amr2wav=function(amrBlob,True,False){
	var reader=new FileReader();
	reader.onload=function(){
		var amr=new Uint8Array(reader.result);
		Recorder.AMR.decode(amr,function(pcm){
			Recorder({type:"wav"}).mock(pcm,8000).stop(function(wavBlob,duration){
				True(wavBlob,duration);
			},False);
		},False);
	};
	reader.readAsArrayBuffer(amrBlob);
};

Recorder.prototype.amr=function(res,True,False){
		var This=this,set=This.set,size=res.length;
		set.bitRate=12.8;
		var sampleRate=set.sampleRate;
		if(sampleRate!=8000){
			console.log("amr mock start")
			set.sampleRate=8000;
			Recorder(set).mock(res,sampleRate).stop(function(blob,d){
				console.log("amr mock end")
				True(blob);
			},False);
			return;
		};
		Recorder.AMR.encode(res,function(data){
			True(new Blob([data.buffer],{type:"audio/amr"}));
		});
	}
	
})();