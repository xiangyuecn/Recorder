/******************
《【Demo库】【文件合并】-wav多个片段文件合并》
作者：高坚果
时间：2019-11-3 23:36:18

文档：
Recorder.WavMerge(fileBytesList,True,False)
		fileBytesList：[Uint8Array,...] 所有wav文件列表，每项为一个文件Uint8Array二进制数组；仅支持raw pcm、单声道、8|16位格式wav，并且列表内的所有wav的位数和采样率必须一致
		True: fn(fileBytes,duration,info) 合并成功回调
				fileBytes：Uint8Array 为wav二进制文件
				duration：合并后的时长
				info：{
					sampleRate:123 //采样率
					,bitRate:8 16 //位数
				}
		False: fn(errMsg) 出错回调
	此函数可移植到后端使用
	
测试Tips：可先运行实时转码的demo代码，然后再运行本合并代码，免得人工不好控制片段大小

wav片段文件合并原理：本库wav格式音频是用44字节wav头+PCM数据来构成的，因此只需要将所有片段去掉44字节后，通过简单的二进制拼接就能得到完整的长pcm数据，最后在加上44字节wav头就能得到完整的wav音频文件。
******************/

//=====wav文件合并核心函数==========
Recorder.WavMerge=function(fileBytesList,True,False){
	var wavHead=new Uint8Array(fileBytesList[0].buffer.slice(0,44));
	
	//计算所有文件的长度、校验wav头
	var size=0,baseInfo;
	for(var i=0;i<fileBytesList.length;i++){
		var file=fileBytesList[i];
		var info=readWavInfo(file);
		if(!info){
			False&&False("第"+(i+1)+"个文件不是单声道wav raw pcm格式音频，无法合并");
			return;
		};
		baseInfo||(baseInfo=info);
		if(baseInfo.sampleRate!=info.sampleRate || baseInfo.bitRate!=info.bitRate){
			False&&False("第"+(i+1)+"个文件位数或采样率不一致");
			return;
		};
		
		size+=file.byteLength-44;
	};
	if(size>50*1024*1024){
		False&&False("文件大小超过限制");
		return;
	};
	
	//去掉wav头后全部拼接到一起
	var fileBytes=new Uint8Array(44+size);
	var pos=44;
	for(var i=0;i<fileBytesList.length;i++){
		var pcm=new Uint8Array(fileBytesList[i].buffer.slice(44));
		fileBytes.set(pcm,pos);
		pos+=pcm.byteLength;
	};
	
	//添加新的wav头，直接修改第一个的头就ok了
	write32(wavHead,4,36+size);
	write32(wavHead,40,size);
	fileBytes.set(wavHead,0);
	
	//计算合并后的总时长
	var duration=Math.round(size/info.sampleRate*1000/(info.bitRate==16?2:1));
	
	True(fileBytes,duration,baseInfo);
};
var write32=function(bytes,pos,int32){
	bytes[pos]=(int32)&0xff;
	bytes[pos+1]=(int32>>8)&0xff;
	bytes[pos+2]=(int32>>16)&0xff;
	bytes[pos+3]=(int32>>24)&0xff;
};
var readWavInfo=function(bytes){
	//检测wav文件头
	if(bytes.byteLength<44){
		return null;
	};
	var wavView=bytes;
	var eq=function(p,s){
		for(var i=0;i<s.length;i++){
			if(wavView[p+i]!=s.charCodeAt(i)){
				return false;
			};
		};
		return true;
	};
	if(eq(0,"RIFF")&&eq(8,"WAVEfmt ")){
		if(wavView[20]==1 && wavView[22]==1){//raw pcm 单声道
			var sampleRate=wavView[24]+(wavView[25]<<8)+(wavView[26]<<16)+(wavView[27]<<24);
			var bitRate=wavView[34]+(wavView[35]<<8);
			return {
				sampleRate:sampleRate
				,bitRate:bitRate
			};
		};
	};
	return null;
};
//=====END=========================




//合并测试
var test=function(){
	var audios=Runtime.LogAudios;
	
	var idx=-1 +1,files=[],exclude=0;
	var read=function(){
		idx++;
		if(idx>=audios.length){
			if(!files.length){
				Runtime.Log("至少需要录1段wav"+(exclude?"，已排除"+exclude+"个非wav文件":""),1);
				return;
			};
			Recorder.WavMerge(files,function(file,duration,info){
				Runtime.Log("合并"+files.length+"个成功"+(exclude?"，排除"+exclude+"个非wav文件":""),2);
				info.type="wav";
				Runtime.LogAudio(new Blob([file.buffer],{type:"audio/wav"}),duration,{set:info});
			},function(msg){
				Runtime.Log(msg+"，请清除日志后重试",1);
			});
			return;
		};
		if(!/wav/.test(audios[idx].blob.type)){
			exclude++;
			read();
			return;
		};
		var reader=new FileReader();
		reader.onloadend=function(){
			files.push(new Uint8Array(reader.result));
			read();
		};
		reader.readAsArrayBuffer(audios[idx].blob);
	};
	read();
};






//=====以下代码无关紧要，音频数据源，采集原始音频用的==================
//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
]);

//显示控制按钮
Runtime.Ctrls([
	{name:"16位wav录音",click:"recStart16"}
	,{name:"8位wav录音",click:"recStart8"}
	,{name:"结束录音",click:"recStop"}
	,{name:"合并日志中所有wav",click:"test"}
]);


//调用录音
var rec;
function recStart16(){
	recStart(16);
};
function recStart8(){
	recStart(8);
};
function recStart(bitRate){
	rec=Recorder({
		type:"wav"
		,sampleRate:16000
		,bitRate:bitRate
		,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate){
			Runtime.Process.apply(null,arguments);
		}
	});
	var t=setTimeout(function(){
		Runtime.Log("无法录音：权限请求被忽略（超时假装手动点击了确认对话框）",1);
	},8000);
	
	rec.open(function(){//打开麦克风授权获得相关资源
		clearTimeout(t);
		rec.start();//开始录音
	},function(msg,isUserNotAllow){//用户拒绝未授权或不支持
		clearTimeout(t);
		Runtime.Log((isUserNotAllow?"UserNotAllow，":"")+"无法录音:"+msg, 1);
	});
};
function recStop(){
	rec.stop(function(blob,duration){
		rec.close();//释放录音资源
		
		Runtime.LogAudio(blob,duration,rec);
	},function(msg){
		Runtime.Log("录音失败:"+msg, 1);
	});
};