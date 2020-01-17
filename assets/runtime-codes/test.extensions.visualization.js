/******************
《【测试】音频可视化相关扩展测试》
作者：高坚果
时间：2020-1-17 11:59:47

本测试将测试Recorder所有音频可视化相关的扩展。
******************/
var waveConfigs={
	WaveView:[
		{testTitle:"颜色"
			,linear1:[0,"#0b1",1,"#0b1"]
			,linear2:[0,"#0b1",1,"#0b1"]
			,linearBg:[0,"gold",1,"#0b1"]}
	]
	,WaveSurferView:[
		{testTitle:"底部显示+慢速"
			,position:-1
			,duration:10000
			,linear:[0,"#666",1,"#666"]}
		,{testTitle:"由右到左+快速"
			,direction:-1
			,duration:1000
			,linear:[0,"#f00",1,"#f00"]}
	]
	,FrequencyHistogramView:[
		{testTitle:"中部显示"
			,lineCount:70
			,position:0
			,minHeight:1
			,stripeEnable:false
			,linear:[0,"#06c",1,"#06c"]}
		,{testTitle:"顶部显示+粗大"
			,lineCount:15
			,position:1
			,lineWidth:999
			,stripeEnable:false
			,linear:[0,"#ab00ff",1,"#ab00ff"]}
	]
};
var waveStore={};
var visualizationInput=function(buffers,powerLevel,duration,sampleRate){
	var buffer=buffers[buffers.length-1];
	for(var k in waveStore){
		var o=waveStore[k];
		if(o&&o.wave){
			(function(o){
				setTimeout(function(){
					o.wave.input(buffer,powerLevel,sampleRate);
				});
			})(o);
		};
	};
};
var visualizationCreate=function(){
	if(waveStore.width==ctrlSet.width&&waveStore.height==ctrlSet.height){
		//配置无变化
		return;
	};
	waveStore={width:ctrlSet.width,height:ctrlSet.height};
	var box=$(".visualizationBox").html("");
	
	for(var k in Recorder){
		var o=Recorder[k];
		if(!(/view/i.test(k)&&o&&o.prototype&&o.prototype.input)){
			continue;
		};
		box.append('<div style="font-size:16px;font-weight: bold;">'+k+'</div>');
		
		var configs=$.merge([{testTitle:"默认配置"}],waveConfigs[k]);
		for(var i=0;i<configs.length;i++){
			var config=$.extend({},configs[i]);
			var cls="view"+k+i;
			box.append('<div style="display:inline-block;margin:0 6px 6px 0;vertical-align:top">\
	<div style="font-size:12px;width:'+waveStore.width+'px;overflow: hidden;text-overflow: ellipsis;white-space: nowrap;">'+config.testTitle+'</div>\
	<div style="height:'+waveStore.height+'px;width:'+waveStore.width+'px;border:1px solid #ccc;box-sizing:border-box;" class="'+cls+'"></div>\
</div>');
			
			//实例化可视化对象
			config.elem="."+cls;
			waveStore[cls]={wave:o(config),config:config};
		};
	};
};




//******音频数据源，采集原始音频用的******
//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
	,{url:RootFolder+"/src/engine/mp3-engine.js",check:function(){return !Recorder.lamejs}}
	
	,{url:RootFolder+"/assets/runtime-codes/fragment.playbuffer.js",check:function(){return !window.DemoFragment||!DemoFragment.PlayBuffer}}//引入DemoFragment.PlayBuffer
]);

//显示控制按钮
Runtime.Ctrls([
	{name:"打开音频输入",click:"recStart"}
	,{name:"结束",click:"recStop"}
	
	,{html:'<hr/><div style="margin-bottom:8px;font-size:12px">音效控制\
<style>\
.mixMinBtn{\
	height: 30px;\
	line-height: 30px;\
	padding: 0 10px;\
	font-size: 13px;\
}\
.mixMinBtnOff{\
	background:#999;\
}\
</style>\
</div>'}
	
	,{name:"麦克风静音",click:"muteChange",cls:"mixMinBtn mixMinBtnOff mixBtn-mute"}
	,{name:"BGM静音",click:"muteChange('BGM');Date.now",cls:"mixMinBtn mixMinBtnOff mixBtn-muteBGM"}
	,{name:"爆笑音效",click:"bgmSet('xiao');Date.now",cls:"mixMinBtn mixMinBtnOff mixBtn-xiao"}
	,{name:"晕倒音效",click:"bgmSet('yun');Date.now",cls:"mixMinBtn mixMinBtnOff mixBtn-yun"}
	,{name:"转场音效",click:"bgmSet('scene');Date.now",cls:"mixMinBtn mixMinBtnOff mixBtn-scene"}
	
	,{choiceFile:{
		title:"替换混音BGM"
		,process:function(fileName,arrayBuffer,filesCount,fileIdx,endCall){
			if(fileIdx==0){
				loadWait=0;
				musics=[];
			};
			decodeAudio(fileName,arrayBuffer,function(){
				if(fileIdx+1>=filesCount){
					Runtime.Log("素材替换完毕，可以开始录音了",2);
				};
				endCall();
			});
		}
	}}
	
	,{html:'<hr/><div style="margin-bottom:8px;font-size:12px">音频可视化 <button onclick="resetCtrl()">重置设置</button></div>\
<div class="ctrlBox" style="margin:5px 0 16px">\
<style>\
	.ctrlBox span{display:inline-block;width:80px;text-align:right;}\
	.ctrlBox input{text-align:right;}\
</style>\
	<div><span>Width:</span><input class="ctrlInput" key="width" style="width:60px"> <input type="range" class="ctrlRange" min="10" max="640" step="10" value="180">显示区域宽度</div>\
	<div><span>Height:</span><input class="ctrlInput" key="height" style="width:60px"> <input type="range" class="ctrlRange" min="10" max="260" step="10" value="60">显示区域高度</div>\
</div>\
\
<hr/><div class="visualizationBox"></div>'}
]);

var ctrlSet={};
$(".ctrlInput").bind("change",function(e){
	ctrlSet[$(e.target).attr("key")]=+e.target.value;
	setTimeout(function(){visualizationCreate()},300);
});
$(".ctrlRange").bind("change",function(e){
	$(e.target).parent().find(".ctrlInput").val(e.target.value).change();
}).change();
var resetCtrl=function(){
	$(".ctrlRange").each(function(k,v){
		$(v).val($(v).attr("value")).change();
	});
};




//调用录音
var rec;
function recStart(){
	voiceSet={};
	$(".mixMinBtn").addClass("mixMinBtnOff");
	var mixChunk={};
	
	rec=Recorder({
		type:"mp3"
		,sampleRate:32000
		,bitRate:96
		,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate){
			mixChunk=mixProcess(buffers,bufferSampleRate,mixChunk);
			powerLevel=mixChunk.powerLevel;
			
			Runtime.Process(buffers,powerLevel,bufferDuration,bufferSampleRate);
			
			visualizationInput(buffers,powerLevel,bufferDuration,bufferSampleRate);
		}
	});
	var t=setTimeout(function(){
		Runtime.Log("无法录音：权限请求被忽略（超时假装手动点击了确认对话框）",1);
	},8000);
	
	rec.open(function(){//打开麦克风授权获得相关资源
		clearTimeout(t);
		rec.start();//开始录音
		Runtime.Log("正在进行录音，随时猛击音效控制按钮添加音效...");
	},function(msg,isUserNotAllow){//用户拒绝未授权或不支持
		clearTimeout(t);
		Runtime.Log((isUserNotAllow?"UserNotAllow，":"")+"无法录音:"+msg, 1);
	});
};
function recStop(){
	Runtime.Log("正在进行编码...");
	rec.stop(function(blob,duration){
		Runtime.LogAudio(blob,duration,rec,"混音结果");
		rec=null;
	},function(msg){
		Runtime.Log("录音失败:"+msg, 1);
	},1);
};








//copy自teach.realtime.mix_multiple.js

var musics=[];//混音BGM素材列表
var musicBGs={};//音效素材列表
var musicPercent=1/1;//混音素材音量降低这么多，免得把主要的录音混的听不清

//*****简单混音*******
var Mix=function(buffer,sampleRate,mute,bgm,posFloat,loop){
	var step=bgm.sampleRate/sampleRate;
	var curInt=-1,sum=0;
	for(var j=0;j<buffer.length;j++){		
		if(mute){
			buffer[j]=0;//置为0即为静音
		};
		
		var cur=Math.floor(posFloat);
		if(cur>curInt){
			var data_mix,data1=buffer[j],data2=(bgm.pcm[cur]||0)*musicPercent;
			
			//简单混音算法 https://blog.csdn.net/dancing_night/article/details/53080819
			if(data1<0 && data2<0){
				data_mix = data1+data2 - (data1 * data2 / -0x7FFF);  
			}else{
				data_mix = data1+data2 - (data1 * data2 / 0x7FFF);
			};
			
			buffer[j]=data_mix;
		};
		curInt=cur;
		posFloat+=step;
		if(loop && posFloat>=bgm.pcm.length){
			posFloat=0;
			curInt=-1;//洗脑循环 直接回到开头可否 ????
		};
		
		sum+=Math.abs(buffer[j]);
	};
	return {pos:posFloat,sum:sum};
};
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
	
	//新建一个空白音轨
	var bgmBuffer=new Int16Array(buffer.length);
	
	//将所有music混入到bgmBuffer中
	var poss=chunk.poss||[];
	chunk.poss=poss;
	if(!voiceSet.muteBGM){
		for(var i=0;i<musics.length;i++){
			poss[i]=Mix(bgmBuffer,sampleRate,false,musics[i],poss[i]||0,true).pos;
		};
	};
	//将所有音效混入到bgmBuffer中
	var bgms=voiceSet.bgms||[];
	for(var i=0;i<bgms.length;i++){
		var bgm=musicBGs[bgms[i].key];
		var pos=Mix(bgmBuffer,sampleRate,false,bgm,bgms[i].pos||0,false).pos;
		bgms[i].pos=pos;
		
		//此音效已混完
		if(pos>=bgm.pcm.length){
			bgms.splice(i,1);
			i--;
		};
	};
	
	//播放bgmBuffer，录制端能听到实时bgm反馈
	DemoFragment.PlayBuffer(chunk,bgmBuffer,sampleRate);
	
	//将bgmBuffer混入buffer中
	var info=Mix(buffer,sampleRate,voiceSet.mute,{pcm:bgmBuffer,sampleRate:sampleRate},0,false);
	
	chunk.powerLevel=Recorder.PowerLevel(info.sum,buffer.length);
};

var voiceSet={};
var muteChange=function(bgm){
	if(!rec){
		Runtime.Log("未开始混音",1);
		return
	};
	bgm=bgm||"";
	voiceSet["mute"+bgm]=!voiceSet["mute"+bgm];
	$(".mixBtn-mute"+bgm)[voiceSet["mute"+bgm]?"removeClass":"addClass"]("mixMinBtnOff");
};
var bgmSet=function(bgm){
	if(!rec){
		Runtime.Log("未开始混音",1);
		return
	};
	var bgms=voiceSet.bgms=voiceSet.bgms||[];
	bgms.push({key:bgm});
};


//*****加载和解码素材********
var loadWait=0;
var load=function(name,bgName,call){
	Runtime.Log("开始加载混音音频素材"+name+"，<span style='color:red'>请勿操作...</span>");
	loadWait++;
	var xhr=new XMLHttpRequest();
	xhr.onloadend=function(){
		if(xhr.status==200){
			loadWait--;
			decodeAudio(name,xhr.response,call,bgName);
		}else{
			Runtime.Log("加载音频失败["+xhr.status+"]:"+name,1);
		};
	};
	xhr.open("GET",RootFolder+"/assets/audio/"+name,true);
	//xhr.timeout=16000;
	xhr.responseType="arraybuffer";
	xhr.send();
};
var decodeAudio=function(name,arr,call,bgName){
	Runtime.DecodeAudio(name,arr,function(data){
		Runtime.LogAudio(data.srcBlob,data.duration,{set:data},"已解码"+name);
		
		if(bgName){
			musicBGs[bgName]={pcm:data.data,sampleRate:data.sampleRate};
		}else{
			musics.push({pcm:data.data,sampleRate:data.sampleRate});
		};
		call();
	},function(msg){
		Runtime.Log(msg,1);
		call();
	});
};
var loadAll=function(){
	load("music-在人间-张韶涵.mp3",0,function(){
		load("bgm-爆笑.mp3","xiao",function(){
			load("bgm-晕倒.mp3","yun",function(){
				load("bgm-转场.mp3","scene",function(){
					Runtime.Log("待混音音频素材已准备完毕，可以开始录音了",2);
				});
			});
		});
	});
};

//加载素材
setTimeout(loadAll);