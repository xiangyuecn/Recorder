/******************
《【Demo库】PCM时长范围裁剪》
作者：高坚果
时间：2020-2-12 11:36:18

文档：
Recorder.RangeCut(pcm,sampleRate,cutDuration,cutStart)
		pcm: [Int16,...] pcm数据，一维数组
		sampleRate：123 pcm的采样率
		cutDuration: 123 需要裁剪出来的时长ms
		cutStart：0 需要裁剪的起始时间位置ms，默认从开头裁剪
		
		返回值：[Int16,...] 裁剪后的PCM结果
		

刚录的音可以使用Recorder.SampleData把rec.buffers转换成一维的pcm，然后进行裁剪。

对于已经进行了转码的音频blob文件（如mp3、wav），可以先进行解码后得到pcm在进行裁剪，然后再转码成需要的格式，解码可参考另外两个demo库：mp3、wav格式转成其他格式，里面包含解码逻辑。
******************/

//=====PCM时长范围裁剪核心函数==========
Recorder.RangeCut=function(pcm,sampleRate,cutDuration,cutStart){
	var start=0,end=pcm.length;
	if(cutStart){
		start=Math.floor(cutStart/1000*sampleRate);
	};
	if(cutDuration){
		end=Math.min(end, start+Math.ceil(cutDuration/1000*sampleRate));
	};
	
	var rtv=new Int16Array(end-start);
	var subPcm=(pcm.subarray||pcm.slice).call(pcm,start,end);
	rtv.set(subPcm);
	return rtv;
};



//************测试************
var testType,testData;
var testPcm,testSampleRate,testRangeStart,testRangeEnd;
var test=function(){
	if(!testPcm){
		Runtime.Log("请先录个音",1);
		return;
	};
	
	var cutDuration=testRangeEnd-testRangeStart;
	var cutPcm=Recorder.RangeCut(testPcm,testSampleRate,cutDuration,testRangeStart);
	
	var mockRec=Recorder({type:"wav",sampleRate:48000,bitRate:16});
	mockRec.mock([cutPcm],testSampleRate);
	mockRec.stop(function(blob,duration){
		Runtime.LogAudio(blob,duration,rec,"裁剪结果");
	},function(err){
		Runtime.Log("裁剪后转码失败："+err,1);
	});
};

var testAny2Pcm=function(call){
	testPcm=0;
	testSampleRate=0;
	if(!testType){//rec，需要将buffers转成一维的pcm
		var rec=testData;
		var data=Recorder.SampleData(rec.buffers,rec.srcSampleRate);
		testPcm=data.data;
		testSampleRate=data.sampleRate;
		call();
		return;
	};
	
	var bufferEnd=function(arrayBuffer,fileName){//将arrayBuffer解码成pcm
		Runtime.DecodeAudio(fileName,arrayBuffer,function(data){
			Runtime.LogAudio(data.srcBlob,data.duration,{set:data},"已解码"+fileName+"成PCM");
			
			testPcm=data.data;
			testSampleRate=data.sampleRate;
			call();
		},function(msg){
			Runtime.Log(msg,1);
		});
	};
	
	if(testType=="buffer"){
		bufferEnd(testData,testData.fileName);
	}else{//blob读取出ArrayBuffer
		var blob=testData;
		var reader=new FileReader();
		reader.onloadend=function(){
			bufferEnd(reader.result,"录音."+testType);
		};
		reader.readAsArrayBuffer(blob);
	};
};

var testViewRange=function(){
	testRangeStart=0;
	testRangeEnd=0;
	testAny2Pcm(function(){
		DemoFragment.AudioRangeChoice({
			elem:$(".rangeSet")
			,pcm:testPcm
			,sampleRate:testSampleRate
			,onChange:function(start,end){
				testRangeStart=start;
				testRangeEnd=end;
			}
		}).view();
	});
};




//******音频数据源，采集原始音频用的******
//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
	,{url:RootFolder+"/src/engine/mp3-engine.js",check:function(){return !Recorder.lamejs}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
	
	,{url:RootFolder+"/assets/runtime-codes/fragment.audio_range_choice.js",check:function(){return !window.DemoFragment||!DemoFragment.PlayBuffer}}//引入DemoFragment.AudioRangeChoice
	,{url:RootFolder+"/assets/runtime-codes/fragment.playbuffer.js",check:function(){return !window.DemoFragment||!DemoFragment.PlayBuffer}}//引入AudioRangeChoice的依赖项DemoFragment.PlayBuffer
]);

//显示控制按钮
Runtime.Ctrls([
	{name:"PCM录音",click:"recStart('');Date.now"}
	,{name:"MP3录音",click:"recStart('mp3');Date.now"}
	,{name:"WAV录音",click:"recStart('wav');Date.now"}
	,{name:"结束录音",click:"recStop"}
	,{html:"<hr/><span class='rangeSet'></span>"}
	,{name:"裁剪",click:"test"}
	
	,{choiceFile:{
		multiple:false
		,process:function(fileName,arrayBuffer,filesCount,fileIdx,endCall){
			testType="buffer";
			testData=arrayBuffer;
			arrayBuffer.fileName=fileName;
			testViewRange();
			endCall();
		}
	}}
]);


//调用录音
var rec;
function recStart(type){
	testType=type;
	rec=Recorder({
		type:type||"wav"
		,sampleRate:48000
		,bitRate:64
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
		
		if(testType){
			testData=blob;
		}else{
			testData=rec;
		};
		testViewRange();
	},function(msg){
		Runtime.Log("录音失败:"+msg, 1);
	},true);
};

