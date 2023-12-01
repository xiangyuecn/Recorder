/******************
《【Demo库】PCM采样率提升》
作者：高坚果
时间：2020-1-9 20:48:39

文档：
Recorder.SampleRaise(pcmDatas,pcmSampleRate,newSampleRate)
		pcmDatas: [[Int16,...]] pcm片段列表，二维数组
		pcmSampleRate：pcm的采样率
		newSampleRate：要转换成的采样率
		
		返回值：{
			sampleRate:16000 结果的采样率，>=pcmSampleRate
			data:[Int16,...] 转换后的PCM结果
		}
		
本方法将简单的提升pcm的采样率，如果新采样率低于pcm采样率，将不会进行任何处理。采用的简单算法能力有限，会引入能感知到的轻微杂音（通过低通滤波后不明显）。

Recorder.SampleData只提供降低采样率，不提供提升采样率，因为由低的采样率转成高的采样率没有存在的意义。提升采样率的代码不会作为核心功能提供，但某些场合确实需要提升采样率，可自行编写代码转换一下即可。
******************/

//=====采样率提升核心函数==========
Recorder.SampleRaise=function(pcmDatas,pcmSampleRate,newSampleRate){
	var size=0;
	for(var i=0;i<pcmDatas.length;i++){
		size+=pcmDatas[i].length;
	};
	
	var step=newSampleRate/pcmSampleRate;
	if(step<=1){//新采样不高于pcm采样率不处理
		step=1;
		newSampleRate=pcmSampleRate;
	}else{
		size=Math.floor(size*step);
	};
	
	var filterFn=0;//采样率差距比较大才开启低通滤波，最高频率用新采样率频率的3/4
	if(pcmSampleRate<=newSampleRate*3/4){
		filterFn=Recorder.IIRFilter(true,newSampleRate,pcmSampleRate/2 *3/4);
	};
	
	var res=new Int16Array(size);
	
	//处理数据
	var posFloat=0,prev=0;
	var F=filterFn&&filterFn.Embed,Fx=0,Fy=0;//低通滤波后的数据
	for (var index=0,nl=pcmDatas.length;index<nl;index++) {
		var arr=pcmDatas[index];
		for(var i=0;i<arr.length;i++){
			var cur=arr[i];
			
			var pos=Math.floor(posFloat);
			posFloat+=step;
			var end=Math.floor(posFloat);
			
			//简单的从prev平滑填充到cur，有效减少转换引入的杂音
			var n=(cur-prev)/(end-pos);
			for(var j=1;pos<end;pos++,j++){
				//res[pos]=cur;
				var s=Math.floor(prev+(j*n));
				if(F){//IIRFilter代码内置，比函数调用快4倍
					Fx=s;
					Fy=F.b0 * Fx + F.b1 * F.x1 + F.b0 * F.x2 - F.a1 * F.y1 - F.a2 * F.y2;
					F.x2 = F.x1; F.x1 = Fx; F.y2 = F.y1; F.y1 = Fy;
					s=Fy;
				}else{ s=filterFn?filterFn(s):s; }
				res[pos]=s;
			};
			
			prev=cur;
		};
	};
	
	return {
		sampleRate:newSampleRate
		,data:res
	};
};



//************测试************
var sampleRaiseInfo=window.sampleRaiseInfo||{from:16000,to:44100};
var transform=function(buffers,sampleRate){
	sampleRaiseInfo.buffers=buffers;
	sampleRaiseInfo.sampleRate=sampleRate;
	if(!buffers){
		Runtime.Log("请先录个音",1);
		return;
	};
	var from=sampleRaiseInfo.from;
	var to=sampleRaiseInfo.to;
	
	//准备低采样率数据
	var pcmFrom=Recorder.SampleData(buffers,sampleRate,from).data;
	
	//转换成高采样率
	var pcmTo=Recorder.SampleRaise([pcmFrom],from,to).data;
	
	var mockFrom=Recorder({type:"wav",sampleRate:from}).mock(pcmFrom,from);
	mockFrom.stop(function(blob1,duration1){
		
		var mockTo=Recorder({type:"wav",sampleRate:to}).mock(pcmTo,to);
		mockTo.stop(function(blob2,duration2){
			Runtime.Log(from+"->"+to,2);
			
			Runtime.LogAudio(blob1,duration1,mockFrom,"低采样");
			Runtime.LogAudio(blob2,duration2,mockTo,"高采样");
		});
		
	});
};
var k8k16=function(){
	sampleRaiseInfo.from=8000;
	sampleRaiseInfo.to=16000;
	
	transform(sampleRaiseInfo.buffers,sampleRaiseInfo.sampleRate);
};
var k16k441=function(){
	sampleRaiseInfo.from=16000;
	sampleRaiseInfo.to=44100;
	
	transform(sampleRaiseInfo.buffers,sampleRaiseInfo.sampleRate);
};




//******音频数据源，采集原始音频用的******
//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
]);

//显示控制按钮
Runtime.Ctrls([
	{name:"开始录音",click:"recStart"}
	,{name:"结束录音",click:"recStop"}
	,{html:"<hr/>"}
	,{name:"8k转16k",click:"k8k16"}
	,{name:"16k转44.1k",click:"k16k441"}
	
	,{choiceFile:{
		process:function(fileName,arrayBuffer,filesCount,fileIdx,endCall){
			Runtime.DecodeAudio(fileName,arrayBuffer,function(data){
				Runtime.LogAudio(data.srcBlob,data.duration,{set:data},"已解码"+fileName);
				
				rec=null;
				transform([data.data],data.sampleRate);
				
				endCall();
			},function(msg){
				Runtime.Log(msg,1);
				endCall();
			});
		}
	}}
]);


//调用录音
var rec;
function recStart(){
	rec=Recorder({
		type:"wav"
		,sampleRate:48000
		,bitRate:16
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
		Runtime.LogAudio(blob,duration,rec);
		
		transform(rec.buffers,rec.srcSampleRate);
	},function(msg){
		Runtime.Log("录音失败:"+msg, 1);
	},true);
};



Runtime.Log("结束录音转换格式以最后点击的哪个为准");