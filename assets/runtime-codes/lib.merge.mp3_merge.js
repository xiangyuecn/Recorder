/******************
《【Demo库】【文件合并】-mp3多个片段文件合并》
作者：高坚果
时间：2019-11-3 23:36:18

文档：
Recorder.Mp3Merge(fileBytesList,True,False)
		fileBytesList：[Uint8Array,...] 所有mp3文件列表，每项为一个文件Uint8Array二进制数组；仅支持lamejs CBR编码出来的mp3，并且列表内的所有mp3的比特率和采样率必须一致
		True: fn(fileBytes,duration,info) 合并成功回调
				fileBytes：Uint8Array 为mp3二进制文件
				duration：合并后的时长
				info：{
					sampleRate:123 //采样率
					,bitRate:8 16 //比特率
				}
		False: fn(errMsg) 出错回调

测试Tips：可先运行实时转码的demo代码，然后再运行本合并代码，免得人工不好控制片段大小

mp3片段文件合并原理：mp3格式因为lamejs采用的CBR编码，因此将所有mp3文件片段，通过简单的二进制拼接就能得到完整的长mp3。

Mp3Merge函数可移植到后端使用。
******************/

//=====mp3文件合并核心函数==========
Recorder.Mp3Merge=function(fileBytesList,True,False){
	//计算所有文件的长度、校验mp3信息
	var size=0,baseInfo;
	for(var i=0;i<fileBytesList.length;i++){
		var file=fileBytesList[i];
		var info=readMp3Info(file);
		if(!info){
			False&&False("第"+(i+1)+"个文件不是lamejs mp3格式音频，无法合并");
			return;
		};
		baseInfo||(baseInfo=info);
		if(baseInfo.sampleRate!=info.sampleRate || baseInfo.bitRate!=info.bitRate){
			False&&False("第"+(i+1)+"个文件比特率或采样率不一致");
			return;
		};
		
		size+=file.byteLength;
	};
	if(size>50*1024*1024){
		False&&False("文件大小超过限制");
		return;
	};
	
	//全部直接拼接到一起
	var fileBytes=new Uint8Array(size);
	var pos=0;
	for(var i=0;i<fileBytesList.length;i++){
		var bytes=fileBytesList[i];
		fileBytes.set(bytes,pos);
		pos+=bytes.byteLength;
	};
	
	//计算合并后的总时长
	var duration=Math.round(size*8/baseInfo.bitRate);
	
	True(fileBytes,duration,baseInfo);
};
var readMp3Info=function(bytes){
	if(bytes.byteLength<4){
		return null;
	};
	var byteAt=function(idx,u8){
		return ("0000000"+((u8||bytes)[idx]||0).toString(2)).substr(-8);
	};
	var b2=byteAt(0)+byteAt(1);
	var b4=byteAt(2)+byteAt(3);
	
	if(!/^1{11}/.test(b2)){//未发现帧同步
		return null;
	};
	var version=({"00":2.5,"10":2,"11":1})[b2.substr(11,2)];
	var layer=({"01":3})[b2.substr(13,2)];//仅支持Layer3
	var sampleRate=({ //lamejs -> Tables.samplerate_table
		"1":[44100, 48000, 32000]
		,"2":[22050, 24000, 16000]
		,"2.5":[11025, 12000, 8000]
	})[version];
	sampleRate&&(sampleRate=sampleRate[parseInt(b4.substr(4,2),2)]);
	var bitRate=[ //lamejs -> Tables.bitrate_table
		[0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] //MPEG 2 2.5
		,[0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]//MPEG 1
	][version==1?1:0][parseInt(b4.substr(0,4),2)];
	
	if(!version || !layer || !bitRate || !sampleRate){
		return null;
	};
	
	return {
		version:version //1 2 2.5 -> MPEG1 MPEG2 MPEG2.5
		,layer:layer//3 -> Layer3
		,sampleRate:sampleRate //采样率 hz
		,bitRate:bitRate //比特率 kbps
	};
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
				Runtime.Log("至少需要录1段mp3"+(exclude?"，已排除"+exclude+"个非mp3文件":""),1);
				return;
			};
			Recorder.Mp3Merge(files,function(file,duration,info){
				Runtime.Log("合并"+files.length+"个成功"+(exclude?"，已排除"+exclude+"个非mp3文件":""),2);
				info.type="mp3";
				Runtime.LogAudio(new Blob([file.buffer],{type:"audio/mp3"}),duration,{set:info});
			},function(msg){
				Runtime.Log(msg+"，请清除日志后重试",1);
			});
			return;
		};
		if(!/mp3/.test(audios[idx].blob.type)){
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
	,{url:RootFolder+"/src/engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
	,{url:RootFolder+"/src/engine/mp3-engine.js",check:function(){return !Recorder.lamejs}}
]);

//显示控制按钮
Runtime.Ctrls([
	{name:"mp3录音16khz",click:"recStart16"}
	,{name:"mp3录音32khz",click:"recStart32"}
	,{name:"结束录音",click:"recStop"}
	,{name:"合并日志中所有mp3",click:"test"}
]);


//调用录音
var rec;
function recStart16(){
	recStart(16);
};
function recStart32(){
	recStart(32);
};
function recStart(num){
	rec=Recorder({
		type:"mp3"
		,sampleRate:num*1000
		,bitRate:num
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