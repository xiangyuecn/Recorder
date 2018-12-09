/*
ogg编码器，bate版，需带上ogg-engine.js引擎使用
https://github.com/xiangyuecn/Recorder

当然最佳推荐使用mp3、wav格式，代码也是优先照顾这两种格式
浏览器支持情况
https://developer.mozilla.org/en-US/docs/Web/HTML/Supported_media_formats
*/
(function(){
"use strict";

Recorder.prototype.enc_ogg={
	stable:false
	,testmsg:"比特率16-100kbps，此编码引擎源码超级大，压缩完也有1.5M，gzip后大小感觉还过得去"
};
Recorder.prototype.ogg=function(res,True,False){
		var This=this,set=This.set,size=res.length,bitRate=set.bitRate;
		bitRate=Math.min(Math.max(bitRate,16),100);
		set.bitRate=bitRate;
		
		bitRate=Math.max(1.1*(bitRate-16)/(100-16)-0.1, -0.1);//取值-0.1-1，实际输出16-100kbps
		var ogg = new Recorder.OggVorbisEncoder(set.sampleRate, 1, bitRate);
		
		var blockSize=set.sampleRate;
		
		var idx=0;
		var run=function(){
			if(idx<size){
				var buf=res.subarray(idx,idx+blockSize);
				var floatBuf=new Float32Array(set.sampleRate);
				for(var j=0;j<size;j++){
					var s=buf[j];
					s=s<0?s/0x8000:s/0x7FFF;
					floatBuf[j]=s;
				};
				ogg.encode([floatBuf]);
				
				idx+=blockSize;
				setTimeout(run);//Worker? 复杂了
			}else{
				True(ogg.finish("audio/ogg"));
			};
		};
		run();
	}
	
})();