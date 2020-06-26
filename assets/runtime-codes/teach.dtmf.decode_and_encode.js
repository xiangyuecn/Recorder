/******************
《【教程】DTMF（电话拨号按键信号）解码、编码》
作者：高坚果
时间：2020-6-24 22:54:41

通过DTMF（电话拨号按键信号）解码器扩展 /src/extensions/dtmf.decode.js，可实现实时从音频数据流中解码得到电话拨号按键信息。

通过DTMF（电话拨号按键信号）编码生成器扩展 /src/extensions/dtmf.encode.js，可实现生成按键对应的音频PCM信号。

解码使用场景：电话录音软解，软电话实时提取DTMF按键信号等
编码使用场景：DTMF按键信号生成，软电话实时发送DTMF按键信号等

其他工具参考：
	DTMF2NUM命令行工具: http://aluigi.altervista.org/mytoolz.htm#dtmf2num
******************/

var curPCM,curSampleRate;
var setPCM=function(pcm,sampleRate){
	curPCM=pcm;
	curSampleRate=sampleRate;
};

//*****DTMF解码得到按键信息*******
var decodeDTMF=function(){
	if(!curPCM){
		Runtime.Log("请先录个音",1);
		return;
	};
	Runtime.Log("开始识别DTMF...",2);
	
	//数据太长时应当分段延时处理，这顺带假装处理实时音频流
	var chunk,chunkSize=curSampleRate/12;
	var idx=0,finds=[];
	var run=function(){
		for(var n=0;idx<curPCM.length;n++,idx+=chunkSize){//分块处理，伪装成实时流
			chunk=decodeStream(curPCM.subarray(idx,idx+chunkSize),curSampleRate,chunk);
			for(var i=0;i<chunk.keys.length;i++){
				finds.push(chunk.keys[i].key);
			};
			
			if(n==12*10){//10秒数据量延时一下
				setTimeout(run);
				return;
			};
		};
		Runtime.Log("识别完毕，"+(finds.length?"发现按键："+finds.join(""):"未发现按键信息"),2);
	};
	run();
};
var decodeStream=function(pcm,sampleRate,chunk){
	chunk=Recorder.DTMF_Decode(pcm,sampleRate,chunk);
	for(var i=0;i<chunk.keys.length;i++){
		Runtime.Log("发现按键["+chunk.keys[i].key+"]，位于"+chunk.keys[i].time+"ms处");
	};
	return chunk;
};



//*****DTMF按键编码，混合到实时语音流中*******
var sendKeyClick=function(e){
	if(e.target.tagName=="TD"){
		sendKeys(e.target.innerHTML)
	};
};
var sendKeysClick=function(){
	sendKeys("*#1234567890#*");
};
var sendKeys=function(keys){
	if(!dtmfMix){
		dtmfMix=Recorder.DTMF_EncodeMix({
			duration:100 //按键信号持续时间 ms，最小值为30ms
			,mute:25 //按键音前后静音时长 ms，取值为0也是可以的
			,interval:200 //两次按键信号间隔时长 ms，间隔内包含了duration+mute*2，最小值为120ms
		});
	};
	if(!rec){
		Runtime.Log("没有开始录音，按键会存储到下次录音","#bbb");
	};
	dtmfMix.add(keys);
	//添加过去就不用管了，实时处理时会调用mix方法混入到pcm中。
};
var dtmfMix=null;





//******音频数据源，采集原始音频用的******
//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
	,{url:RootFolder+"/src/engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
	,{url:RootFolder+"/src/engine/mp3-engine.js",check:function(){return !Recorder.lamejs}}
	,{url:RootFolder+"/src/extensions/dtmf.encode.js",check:function(){return !Recorder.DTMF_Encode}}
	,{url:RootFolder+"/src/extensions/dtmf.decode.js",check:function(){return !Recorder.DTMF_Decode}}
	
	,{url:RootFolder+"/assets/runtime-codes/fragment.playbuffer.js",check:function(){return !window.DemoFragment||!DemoFragment.PlayBuffer}}//引入DemoFragment.PlayBuffer
]);

//显示控制按钮
Runtime.Ctrls([
	{name:"开始wav录音",click:"recStartWav"}
	,{name:"开始mp3录音",click:"recStartMp3"}
	,{name:"结束录音",click:"recStop"}
	,{name:"识别按键信号",click:"decodeDTMF"}
	,{html:'<hr>\
<div>混合按键信号到录音中（小提示：手机拨号设置了拨号按键音，可边录音边拿手机按拨号音，效果差不多）</div>\
<div>\
<style>\
.dtmfTab td{padding: 15px 25px;border: 3px solid #ddd;cursor: pointer;user-select: none;}\
.dtmfTab td:hover{background:#f60;opacity:.2;color:#fff}\
.dtmfTab td:active{opacity:1}\
</style>\
	<table onclick="sendKeyClick(event)" class="dtmfTab" style="border-collapse: collapse;text-align: center;border: 3px #ccc solid;">\
		<tr><td>1</td><td>2</td><td>3</td><td>A</td></tr>\
		<tr><td>4</td><td>5</td><td>6</td><td>B</td></tr>\
		<tr><td>7</td><td>8</td><td>9</td><td>C</td></tr>\
		<tr><td>*</td><td>0</td><td>#</td><td>D</td></tr>\
	</table>\
</div>\
'}
	,{name:"发送*#1234567890#*",click:"sendKeysClick"}
	
	,{choiceFile:{
		multiple:false
		,name:"带按键信号音的音频"
		,mime:"audio/*"
		,process:function(fileName,arrayBuffer,filesCount,fileIdx,endCall){
			Runtime.DecodeAudio(fileName,arrayBuffer,function(data){
				Runtime.LogAudio(data.srcBlob,data.duration,{set:data},"已解码"+fileName);
				
				setPCM(data.data,data.sampleRate);
				decodeDTMF();
				
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
function recStartMp3(){
	recStart("mp3");
};
function recStartWav(){
	recStart("wav");
};
function recStart(type){
	rec=Recorder({
		type:type
		,sampleRate:16000
		,bitRate:16
		,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate,newBufferIdx,asyncEnd){
			//实时混合按键信号
			if(dtmfMix){
				var val=dtmfMix.mix(buffers, bufferSampleRate, newBufferIdx);
				if(val.newEncodes.length>0){
					rec.PlayBufferDisable=true;
					DemoFragment.PlayBuffer(rec,val.newEncodes[0].data,bufferSampleRate);
				};
			};
			
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
		rec=null;
		
		Runtime.ReadBlob(blob,function(arr){
			Runtime.DecodeAudio("rec",arr,function(data){
				setPCM(data.data,data.sampleRate);
				decodeDTMF();
			},function(msg){
				Runtime.Log(msg,1);
			});
		});
	},function(msg){
		Runtime.Log("录音失败:"+msg, 1);
	});
};
