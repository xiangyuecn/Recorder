/******************
《【教程】实时录制处理audio、video标签的captureStream流》
作者：高坚果
时间：2021-07-31 20:46:21

Recorder支持处理audio、video标签dom节点的captureStream方法返回的流，只需提供set.sourceStream配置参数即可，对流内音频的录制和对麦克风录制没有区别；因此Recorder所有的实时处理功能都能在这个流上进行操作，比如：对正在播放的音频进行可视化绘制、变速变调。

captureStream方法目前是一个实验特性，并不是所有新浏览器都能支持的；另外不推荐带浏览器前缀使用，行为可能不一致（如mozCaptureStream）；参考文档: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/captureStream

除了可以处理captureStream得到的流，其他的MediaStream流（只要至少有一条音轨）均是按同样的方法进行录音和处理。
******************/

var rec;
function recStart(stream){
	if(rec){//清理掉已有的
		rec.close();
	};
	
	rec=Recorder({
		type:"mp3"
		,sampleRate:16000
		,bitRate:16
		,sourceStream:stream //明确指定从这个流中录制音频
		,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate){
			Runtime.Process.apply(null,arguments);
		}
	});
	
	rec.open(function(){//打开这个流
		rec.start();//开始录制
	},function(msg){
		Runtime.Log("无法打开音频流:"+msg, 1);
	});
};
function recStop(){
	player&&player.pause();
	
	var rec2=rec;
	rec=0;
	if(!rec2){
		Runtime.Log("未开始录音",1);
		return;
	};
	
	rec2.stop(function(blob,duration){
		rec2.close();//释放录音资源
		
		Runtime.LogAudio(blob,duration,rec2);
	},function(msg){
		Runtime.Log("录音失败:"+msg, 1);
	});
};



var player;
var audioStart=function(){
	sourceStart("audio",RootFolder+"/assets/audio/music-阿刁-张韶涵.mp3");
};
var videoStart=function(){
	sourceStart("video",RootFolder+"/assets/audio/movie-一代宗师-此一时彼一时.mp4.webm");
};
var fileStart=function(type,file){
	if(!file.files.length){
		return;
	}
	sourceStart(type,URL.createObjectURL(file.files[0]));
};
var sourceStart=function(type,src){
	$(".sourceBox").html('\
<div>\
	切换播放本地'+type+'文件：<input type="file" accept="'+type+'/*"\
		onchange="fileStart(\''+type+'\',this)">\
</div>\
<div style="padding-top:10px">\
	<'+type+' class="sourcePlayer" controls autoplay src="'+src+'" style="width:80%"/>\
</div>\
	');
	var elem=$(".sourcePlayer");
	if(type=="video"){
		elem.css("height",elem.width()*0.6+"px");
		elem.css("background","#000");
	}
	
	player=elem[0];
	player.onerror=function(e){
		Runtime.Log('播放失败['+player.error.code+']'+player.error.message,1);
	};
	
	
	if(!player.captureStream){
		Runtime.Log("浏览器版本太低，不支持"+type+".captureStream()方法",1);
		return;
	};
	if(rec){//清理掉已打开的
		rec.close();
		rec=0;
	};
	player.onplay=function(){
		if(rec){
			rec.resume();
			return;
		};
		//必须等待到可以开始播放后（onloadedmetadata），流内才会有音轨，在onplay内很安全
		recStart(player.captureStream());
	};
	player.onpause=function(){
		if(rec){
			rec.pause();
		};
	};
	player.onended=function(){
		recStop();
	};
};




//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
	,{url:RootFolder+"/src/engine/mp3-engine.js",check:function(){return !Recorder.lamejs}}
]);

//显示控制按钮
Runtime.Ctrls([
	{name:"处理audio标签",click:"audioStart"}
	,{name:"处理video标签",click:"videoStart"}
	,{name:"结束处理",click:"recStop"}
	,{html:'<hr/><div class="sourceBox"></div><hr/>'}
]);
