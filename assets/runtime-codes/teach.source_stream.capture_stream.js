/******************
《【教程】【播放】【可视化】实时录制处理audio、video播放流》
作者：高坚果
时间：2021-07-31 20:46:21

Recorder支持处理audio、video标签dom节点的captureStream方法返回的流，只需提供set.sourceStream配置参数即可，对流内音频的录制和对麦克风录制没有区别；因此Recorder所有的实时处理功能都能在这个流上进行操作，比如：对正在播放的音频进行可视化绘制、变速变调。

使用AudioContext的createMediaElementSource可以获得和captureStream一样的流，此方法现代浏览器均支持，下面代码中已封装成了Recorder.CaptureStream方法，比captureStream复杂一点。audio、video自带的captureStream方法目前是一个实验特性，存在兼容性问题，并不是所有新浏览器都能支持的；另外不推荐带浏览器前缀使用，行为可能不一致（如mozCaptureStream）；参考文档: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/captureStream

除了可以处理captureStream得到的流，其他的MediaStream流（只要至少有一条音轨）均是按同样的方法进行录音和处理。
******************/

/**=====captureStream兼容函数，用完需close==========
参数：
	elem:HTMLMediaElement audio或video dom节点
	set:{
		play:true //是否播放声音，默认true，false将不会播放声音，只处理
		onDisconnect:fn() //当流被断开时回调，一般在移动端可能会被系统打断，收到回调后代表此流已非正常停止，需要重新获取流并重新处理
	}
	success:fn(result) 获取到流后回调
		result:{
			stream:object 获取到的流，可以传给Recorder的sourceStream参数
			close:fn() 用完后必须调用此方法关闭流，释放资源
		}
	fail:fn(errMsg) 出错回调
**/
Recorder.CaptureStream=function(elem,set,success,fail){
	var ctx=Recorder.GetContext(true); //获取一个新的
	if(!ctx || !ctx.createMediaStreamDestination){
		fail&&fail("浏览器版本太低，不支持"+(ctx?"MediaStreamDestination":"AudioContext"));
		return;
	}
	//elem.crossOrigin="anonymous"; //跨域资源可能要在开始播放前配置好才能访问
	
	var mes=ctx.createMediaElementSource(elem);
	var dest=ctx.createMediaStreamDestination();
	mes.connect(dest);
	if(set.play==null || set.play){
		mes.connect(ctx.destination);
	}
	
	var isClose=false;
	var close=function(){
		if(isClose)return; isClose=true;
		Recorder.CloseNewCtx(ctx);
		Recorder.StopS_(dest.stream);
		mes.disconnect();
		dest.disconnect();
	};
	var checkState=function(){
		if(isClose)return;
		if(ctx.state=="closed"){ //AudioContext挂了，无法恢复
			close();
			set.onDisconnect&&set.onDisconnect();
		};
	};
	if(ctx.addEventListener){
		ctx.addEventListener("statechange",function(){ checkState(); });
	};
	//AudioContext如果被暂停，尽量恢复
	Recorder.ResumeCtx(ctx,function(){ return !isClose; }
		,function(){
			success&&success({ stream:dest.stream, close:close, _c:ctx });
		}
		,function(err){
			fail&&fail(err);
		});
};
//=====END=========================



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
	captureObj&&captureObj.close();
	
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



var player,captureObj;
var audioStart=function(){
	sourceStart("audio",RootFolder+"/assets/audio/music-阿刁-张韶涵.mp3");
};
var videoStart=function(){
	sourceStart("video",RootFolder+"/assets/audio/movie-一代宗师-此一时彼一时.mp4.webm","video/mp4");
};
var fileStart=function(type,file){
	if(!file.files.length){
		return;
	}
	sourceStart(type,URL.createObjectURL(file.files[0]));
};
var sourceStart=function(type,src,mime){
	$(".sourceBox").html('\
<div>\
	切换播放本地'+type+'文件：<input type="file" accept="'+type+'/*"\
		onchange="fileStart(\''+type+'\',this)">\
</div>\
<div style="padding-top:10px">\
	<'+type+' class="sourcePlayer" controls autoplay webkit-playsinline playsinline x5-video-player-type="h5" style="width:80%">\
		<source src="'+src+'" '+(mime?'type="'+mime+'"':'')+'/>\
	</'+type+'>\
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
		//recStart(player.captureStream()); //直接captureStream，浏览器兼容性不好
		if(captureObj)captureObj.close();
		Recorder.CaptureStream(player,{
			onDisconnect:function(){
				Runtime.Log("CaptureStream断开了",1);
				recStop();
			}
		},function(obj){
			captureObj=obj;
			recStart(obj.stream);
		},function(err){
			Runtime.Log("CaptureStream错误："+err,1);
		});
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
