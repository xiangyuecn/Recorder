/******************
《【Demo库】WAV文件解码》
作者：高坚果
时间：2023-01-11 16:37

2026-06-28 已封装到了 Recorder.wav_decode 中，不需要使用本代码

文档：
DemoFragment.DecodeWav(u8arr)
		u8arr: wav的二进制数据Uint8Array
		返回：{
			pcm:[Int16,...] 解码出来的pcm数据Int16Array
			sampleRate:16000 wav的采样率，也是pcm的采样率
			duration:123 时长
			
			bitRate:16 wav的位数，注意：pcm固定16位
			numChannels:1 wav的声道数，注意：pcm固定单声道
		}
		解码失败会抛异常
******************/
(
window.DemoFragment||(window.DemoFragment={})
).DecodeWav=function(u8arr){
	if(!Recorder.wav_decode) throw new Error("需要导入wav.js");
	var err="", pcm, sampleRate, bitRate, numCh, dataPos;
	Recorder.wav_decode(u8arr.buffer, function(pcm_,sampleRate_,wavInfo){
		pcm=pcm_; sampleRate=sampleRate_;
		bitRate=wavInfo.bitRate;
		numCh=wavInfo.numChannels;
		dataPos=wavInfo.dataPos;
	},function(msg){ err=msg; });
	
	if(err) throw new Error(err);
	var duration=Math.round(pcm.length/sampleRate*1000);
	
	console.log("DecodeWav",sampleRate,bitRate,numCh
		,pcm.length
		,duration+"ms @"+dataPos);
	return {
		pcm:pcm
		,duration:duration
		,sampleRate:sampleRate
		,bitRate:bitRate
		,numChannels:numCh
	};
};