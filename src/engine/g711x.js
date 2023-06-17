/*
g711x编码器+解码器
https://github.com/xiangyuecn/Recorder

可用type：
	g711a: G.711 A-law (pcma)
	g711u: G.711 μ-law (pcmu、mu-law)

编解码源码移植自：https://github.com/twstx1/codec-for-audio-in-G72X-G711-G723-G726-G729/blob/master/G711_G721_G723/g711.c
移植相关测试代码（FFmpeg转码、播放命令）：assets/runtime-codes/test.g7xx.engine.js
*/
(function(){
"use strict";

var regEngine=function(key,desc,enc,dec){

Recorder.prototype["enc_"+key]={
	stable:true,fast:true
	,testmsg:desc+"；"+key+"音频文件无法直接播放，可用Recorder."+key+"2wav()转码成wav播放；采样率比特率设置无效，固定为8000hz采样率、16位，每个采样压缩成8位存储，音频文件大小为8000字节/秒"
};
Recorder.prototype[key]=function(res,True,False){
	var This=this,set=This.set,srcSampleRate=set.sampleRate,sampleRate=8000;
	set.bitRate=16;
	set.sampleRate=sampleRate;
	if(srcSampleRate>sampleRate){
		res=Recorder.SampleData([res],srcSampleRate,sampleRate).data;
	}else if(srcSampleRate<sampleRate){
		False("数据采样率低于"+sampleRate); return;
	};
	var bytes=enc(res);
	True(new Blob([bytes.buffer],{type:"audio/"+key}));
};

/**解码g711x得到pcm
bytes: Uint8Array，g711x二进制数据
返回Int16Array，为8000采样率、16位的pcm数据
**/
Recorder[key+"_decode"]=function(bytes){
	return dec(bytes);
};

/**g711x直接转码成wav，可以直接用来播放；需同时引入wav.js
g711xBlob: g711x音频文件blob对象
True(wavBlob,duration)
False(msg)
**/
Recorder[key+"2wav"]=function(g711xBlob,True,False){
	if(!Recorder.prototype.wav){
		False(key+"2wav必须先加载wav编码器wav.js");
		return;
	};
	
	var reader=new FileReader();
	reader.onloadend=function(){
		var bytes=new Uint8Array(reader.result);
		var pcm=dec(bytes);
		Recorder({
			type:"wav",sampleRate:8000,bitRate:16
		}).mock(pcm,8000).stop(function(wavBlob,duration){
			True(wavBlob,duration);
		},False);
	};
	reader.readAsArrayBuffer(g711xBlob);
};

};



var Tab=[1,2,3,3,4,4,4,4,5,5,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7];

regEngine("g711a","G.711 A-law (pcma)"
,function(pcm){//编码
	var buffer=new Uint8Array(pcm.length);
	for(var i=0;i<pcm.length;i++){
		var pcm_val=pcm[i],mask;

		if (pcm_val >= 0) {
			mask = 0xD5;		/* sign (7th) bit = 1 */
		} else {
			mask = 0x55;		/* sign bit = 0 */
			pcm_val = -pcm_val - 1;
		}

		/* Convert the scaled magnitude to segment number. */
		var seg = (Tab[pcm_val>>8&0x7F]||8)-1;
		
		/* Combine the sign, segment, and quantization bits. */
		var aval = seg << 4;
		if (seg < 2)
			aval |= (pcm_val >> 4) & 15;
		else
			aval |= (pcm_val >> (seg + 3)) & 15;
		buffer[i] = (aval ^ mask);
	}
	return buffer;
}
,function(bytes){//解码
	var buffer=new Int16Array(bytes.length);
	for(var i=0;i<bytes.length;i++){
		var a_val=bytes[i]^0x55;
		var t = (a_val & 15) << 4;
		var seg = (a_val & 0x70) >> 4;
		switch (seg) {
		case 0:
			t += 8; break;
		case 1:
			t += 0x108; break;
		default:
			t += 0x108;
			t <<= seg - 1;
		}
		buffer[i] = ((a_val & 0x80) ? t : -t);
	}
	return buffer;
});


regEngine("g711u","G.711 μ-law (pcmu、mu-law)"
,function(pcm){//编码
	var buffer=new Uint8Array(pcm.length);
	for(var i=0;i<pcm.length;i++){
		var pcm_val=pcm[i],mask;
		
		/* Get the sign and the magnitude of the value. */
		if (pcm_val < 0) {
			pcm_val = 0x84 - pcm_val;
			mask = 0x7F;
		} else {
			pcm_val += 0x84;
			mask = 0xFF;
		}
		
		/* Convert the scaled magnitude to segment number. */
		var seg = (Tab[pcm_val>>8&0x7F]||8)-1;
		
		var uval = (seg << 4) | ((pcm_val >> (seg + 3)) & 0xF);
		buffer[i] = (uval ^ mask);
	}
	return buffer;
}
,function(bytes){//解码
	var buffer=new Int16Array(bytes.length);
	for(var i=0;i<bytes.length;i++){
		var u_val= ~bytes[i];
		
		var t = ((u_val & 15) << 3) + 0x84;
		t <<= (u_val & 0x70) >> 4;

		buffer[i] = ((u_val & 0x80) ? (0x84 - t) : (t - 0x84));
	}
	return buffer;
});


})();