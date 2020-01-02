/******************
《【教程】实时多路音频混音》
作者：高坚果
时间：2020-1-2 18:19:43

通过onProcess回调可实现实时的多路音频混音处理，简单的将其他音频pcm叠加到当前buffers中实现混音；另外直接修改buffers将内容数据统统设置为0即可实现静音效果。
******************/
var musics=[];//混音素材列表
var musicPercent=1/5;//混音素材音量降低这么多，免得把主要的录音混的听不清

//*****简单混音*******
var mixProcess=function(buffers,sampleRate,chunk){
	var idx=chunk.idx||0;
	for(;idx<buffers.length;idx++){
		mixProcessWork(buffers[idx],sampleRate,chunk)
	};
	chunk.idx=idx;
	return chunk;
};
var mixProcessWork=function(buffer,sampleRate,chunk){
	if(loadWait){
		console.log("素材还在加载");
		return;
	};
	
	var poss=chunk.poss||[];
	chunk.poss=poss;
	
	var sum;
	//将所有music混入到buffer中
	for(var i=0;i<musics.length;i++){
		var music=musics[i];
		sum=0;
		var step=music.sampleRate/sampleRate;
		var curFloat=poss[i]||0,curInt=-1;
		for(var j=0;j<buffer.length;j++){
			var cur=Math.floor(curFloat);
			if(cur>curInt){
				var data_mix,data1=buffer[j],data2=music.pcm[cur]*musicPercent;
				if(!voiceIsStart && i==0){
					//未开始说话，将采样数据设置为0，即静音
					data1=0;
				};
				
				//简单混音算法 https://blog.csdn.net/dancing_night/article/details/53080819
				if(data1<0 && data2<0){
					data_mix = data1+data2 - (data1 * data2 / -(Math.pow(2,16-1)-1));  
				}else{
					data_mix = data1+data2 - (data1 * data2 / (Math.pow(2,16-1)-1));
				};
				
				buffer[j]=data_mix;
			};
			curInt=cur;
			curFloat+=step;
			if(curFloat>=music.pcm.length){
				curFloat=0;
				curInt=-1;//洗脑循环 直接回到开头可否 ????
			};
			
			sum+=Math.abs(buffer[j]);
		};
		poss[i]=curFloat;
	};
	
	chunk.powerLevel=Recorder.PowerLevel(sum,buffer.length);
};

var voiceIsStart=0;
var voiceStart=function(){
	if(!rec){Runtime.Log("未开始混音",1);return}
	voiceIsStart=1;
	Runtime.Log("开始混入语音...");
};
var voiceStop=function(){
	if(!rec){Runtime.Log("未开始混音",1);return}
	voiceIsStart=0;
	Runtime.Log("结束混入语音");
};



//******音频数据源，采集原始音频用的******
//显示控制按钮
Runtime.Ctrls([
	{name:"开始混音",click:"recStart"}
	,{name:"结束混音",click:"recStop"}
	
	,{html:"<div>默认自己的麦克风是静音的，要插入你的语音，点下面这两个按钮</div>"}
	
	,{name:"开始混入语音",click:"voiceStart"}
	,{name:"结束混入语音",click:"voiceStop"}
]);


//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
	,{url:RootFolder+"/src/engine/mp3-engine.js",check:function(){return !Recorder.lamejs}}
]);


//调用录音
var rec;
function recStart(){
	voiceIsStart=0;
	var mixChunk={};
	rec=Recorder({
		type:"mp3"
		,sampleRate:32000
		,bitRate:96
		,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate){
			mixChunk=mixProcess(buffers,bufferSampleRate,mixChunk);
			powerLevel=mixChunk.powerLevel;
			
			Runtime.Process(buffers,powerLevel,bufferDuration,bufferSampleRate);
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
	rec.stop(function(blob1,duration1){
		//因为是mp3格式录音，buffers编码引擎内部的buffer，因此rec.buffers未被篡改
		var pcm=Recorder.SampleData(rec.buffers,rec.srcSampleRate,rec.srcSampleRate);
		rec.mock(pcm.data,rec.srcSampleRate);
		rec.stop(function(blob2,duration2){
			Runtime.LogAudio(blob2,duration2,rec,"原始录音");
			Runtime.LogAudio(blob1,duration1,rec,"混音结果");
			rec=null;
		},function(msg){
			Runtime.Log("生成原始音频失败:"+msg, 1);
		});
	},function(msg){
		Runtime.Log("录音失败:"+msg, 1);
	},1);
};


//*****拖拽或者选择文件******
$(".choiceFileBox").remove();
Runtime.Log('<div class="choiceFileBox">\
	<div class="dropFile" onclick="$(\'.choiceFile\').click()" style="border: 3px dashed #a2a1a1;background:#eee; padding:30px 0; text-align:center;cursor: pointer;">\
	拖拽多个音乐文件到这里 / 点此选择，替换混音素材\
	</div>\
	<input type="file" class="choiceFile" style="display:none" accept="audio/*" multiple="multiple">\
</div>');
$(".dropFile").bind("dragover",function(e){
	e.preventDefault();
}).bind("drop",function(e){
	e.preventDefault();
	
	readChoiceFile(e.originalEvent.dataTransfer.files);
});
$(".choiceFile").bind("change",function(e){
	readChoiceFile(e.target.files);
});
function readChoiceFile(files){
	if(!files.length){
		return;
	};
	
	Runtime.Log("发现"+files.length+"个文件，开始替换素材...");
	loadWait=0;
	musics=[];
	
	var idx=-1;
	var run=function(){
		idx++;
		if(idx>=files.length){
			Runtime.Log("素材替换完毕，可以开始录音了",2);
			return;
		};
		
		var file = files[idx];
		var reader = new FileReader();
		reader.onload = function(e){
			decodeAudio(file.name,e.target.result,run);
		}
		reader.readAsArrayBuffer(file);
	};
	run();
};



//*****加载和解码素材********
var loadWait=0;
var load=function(name,call){
	Runtime.Log("开始加载混音音频素材"+name+"，请勿操作...");
	loadWait++;
	var xhr=new XMLHttpRequest();
	xhr.onloadend=function(){
		if(xhr.status==200){
			loadWait--;
			decodeAudio(name,xhr.response,call);
		}else{
			Runtime.Log("加载音频失败["+xhr.status+"]:"+name,1);
		};
	};
	xhr.open("GET",RootFolder+"/assets/audio/"+name,true);
	xhr.timeout=16000;
	xhr.responseType="arraybuffer";
	xhr.send();
};
var decodeAudio=function(name,arr,call){
	if(!Recorder.Support()){//强制激活Recorder.Ctx 不支持大概率也不支持解码
		Runtime.Log("浏览器不支持音频解码",1);
		return;
	};
	var srcBlob=new Blob([arr]);
	var ctx=Recorder.Ctx;
	ctx.decodeAudioData(arr,function(raw){
		var src=raw.getChannelData(0);
		var sampleRate=raw.sampleRate;
		console.log(name,raw);
		
		var pcm=new Int16Array(src.length);
		for(var i=0;i<src.length;i++){//floatTo16BitPCM 
			var s=Math.max(-1,Math.min(1,src[i]));
			s=s<0?s*0x8000:s*0x7FFF;
			pcm[i]=s;
		};
		
		Runtime.LogAudio(srcBlob,Math.round(src.length/sampleRate*1000),{set:{sampleRate:sampleRate}},"已解码"+name);
		musics.push({pcm:pcm,sampleRate:sampleRate});
		call();
	},function(e){
		Runtime.Log("audio解码失败:"+e.message,1);
	});
};
var loadAll=function(){
	load("music-阿刁-张韶涵.mp3",function(){
		load("music-在人间-张韶涵.mp3",function(){
			Runtime.Log("待混音音频素材已准备完毕，可以开始录音了",2);
		});
	});
};

//加载素材
setTimeout(loadAll);