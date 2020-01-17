/******************
《【教程】变速变调音频转换》
作者：高坚果
时间：2020-1-8 10:53:23

通过extensions/sonic.js可实现：变调不变速（会说话的汤姆猫）、变速不变调（快放慢放）、变速变调、调节音量。

Recorder.Sonic有同步和异步两种调用方式，同步方法简单直接但处理量大时会消耗大量时间，主要用于一次性的处理；异步方法由WebWorker在后台进行运算处理，但异步方法不一定能成功开启（低版本浏览器），主要用于实时处理。
******************/
var prevPcms,prevSampleRate;
/***使用同步方法一次性处理全部PCM****/
var transformAll=function(pcms,pcmSampleRate){
	prevPcms=pcms;
	prevSampleRate=pcmSampleRate;
	
	var sampleRate=16000;
	
	var t1=Date.now();
	var chunk=Recorder.SampleData(pcms,pcmSampleRate,sampleRate);
	
	//核心的sonic同步调用
	var sonic=Recorder.Sonic({sampleRate:sampleRate});
	//进行sonic配置
	sonic.setPitch(sonicCtrlSet.pitch);
	sonic.setRate(sonicCtrlSet.rate);
	sonic.setSpeed(sonicCtrlSet.speed);
	sonic.setVolume(sonicCtrlSet.volume);
	
	//进行同步转换处理，当pcm太大时使用切片+setTimeout异步化，避免界面卡住
	var buffers=[],newPcm,size=0,idx=0,blockLen=0;
	var run1=function(endCall){
		var blockSize=sampleRate/1000*sonicCtrlSet.buffer;//切成0-1000ms的数据进行处理，200ms以上可避免引入大量杂音
		var pcm=chunk.data,buffer;
		if(idx>=pcm.length){
			buffer=sonic.flush();//把剩余的内容输出，如果有的话
		}else{
			//切片
			blockLen++;
			var arr=new Int16Array(idx+blockSize>=pcm.length?pcm.length-idx:blockSize);
			for(var i=0,pos=idx;i<blockSize&&pos<pcm.length;i++,pos++){
				arr[i]=pcm[pos];
			};
			buffer=sonic.input(arr);
		};
		if(buffer.length>0){
			buffers.push(buffer);
			size+=buffer.length;
		};
		
		if(idx>=pcm.length){
			if(blockLen>0){
				Runtime.Log("共切分"+blockLen+"片异步处理");
			};
			//所有分片都处理完成，结果拼接到一起
			newPcm=new Int16Array(size);
			for(var i=0,pos=0;i<buffers.length;i++){
				newPcm.set(buffers[i],pos);
				pos+=buffers[i].length;
			};
			endCall();
			return;
		};
		
		//接续切片，并开始异步
		idx+=blockSize;
		setTimeout(function(){run1(endCall)});
	};
	
	//把pcm转成指定的音频格式
	var run2=function(){
		var t2=Date.now();
		
		var mockRec=Recorder({
			type:"mp3"
			,sampleRate:sampleRate
			,bitRate:16
		});
		mockRec.mock(newPcm,sampleRate);
		mockRec.stop(function(blob,duration){
			Runtime.Log("Pitch:"+/\d+\.\d+/.exec(sonicCtrlSet.pitch+".0")[0]
				+" "+"Speed:"+/\d+\.\d+/.exec(sonicCtrlSet.speed+".0")[0]
				+" "+"Rate:"+/\d+\.\d+/.exec(sonicCtrlSet.rate+".0")[0]
				+" "+"Volume:"+/\d+\.\d+/.exec(sonicCtrlSet.volume+".0")[0]
				+" 转换耗时："+(t2-t1)+"ms 转码耗时："+(Date.now()-t2)+"ms");
			Runtime.LogAudio(blob,duration,mockRec,"已转换");
		},function(msg){
			Runtime.Log("转换失败:"+msg, 1);
		});
	};
	
	run1(run2);
};
var recTransformAll=function(){
	if(!rec||!rec.buffers){
		if(prevPcms){
			transformAll(prevPcms,prevSampleRate);
			return;
		};
		Runtime.Log("请先录个音",1);
		return;
	};
	transformAll(rec.buffers,rec.srcSampleRate);
};




/***使用异步方法实时处理buffer，此处仅仅用作实时播放反馈****/
var sonicInfo;
var transformBufferPlayOnly=function(buffers,sampleRate,newBufferIdx,asyncEnd){
	if(sonicCtrlSet.pitch==1
		&&sonicCtrlSet.rate==1
		&&sonicCtrlSet.speed==1
		&&sonicCtrlSet.volume==1){//不存在变速变调设置
		return;
	};
	
	if(sonicAsync==-1){
		return;
	};
	if(!sonicAsync||sonicAsync.set.sampleRate!=sampleRate){
		//实时处理只能用异步操作，不能用同步方法，否则必然卡顿
		sonicAsync=Recorder.Sonic.Async({sampleRate:sampleRate});
		sonicInfo={};
		if(!sonicAsync){
			sonicAsync=-1;
			reclog("不能开启Sonic.Async，浏览器不支持WebWorker操作，降级不变速变调",1);
			return;
		};
	};
	
	sonicAsync.setPitch(sonicCtrlSet.pitch);
	sonicAsync.setRate(sonicCtrlSet.rate);
	sonicAsync.setSpeed(sonicCtrlSet.speed);
	sonicAsync.setVolume(sonicCtrlSet.volume);
	
	var newBuffers=sonicInfo.buffers||[];
	var newBufferSize=sonicInfo.bufferSize||0;
	var blockSize=sampleRate/1000*sonicCtrlSet.buffer;//缓冲0-1000ms的数据进行处理，200ms以上可避免引入大量杂音
	var lastIdx=buffers.length-1;
	for(var i=newBufferIdx;i<=lastIdx;i++){
		newBuffers.push(buffers[i]);//copy出来，异步onProcess会清空这些数组
		newBufferSize+=buffers[i].length;
	};
	
	if(newBufferSize<blockSize){
		setTimeout(function(){
			asyncEnd();//缓冲未满，此时并未处理，但也需要进行异步回调
		});
	}else{
		var buffer=newBuffers[0]||[];
		if(newBuffers.length>1){
			buffer=Recorder.SampleData(newBuffers,sampleRate,sampleRate).data;
		};
		newBuffers=[];
		newBufferSize=0;
		var sizeOld=buffer.length,sizeNew=0;
		
		//推入后台异步转换
		sonicAsync.input(buffer,function(pcm){
			buffers[lastIdx]=buffer;//pcm;此处不篡改buffers，仅仅用于播放 //写回buffers，放到调用时的最后一个位置即可 ，其他内容已在开启异步模式时已经被自动替换成了空数组
			
			if(sonicCtrlSet.play){
				DemoFragment.PlayBuffer(sonicInfo,pcm,sampleRate);
			};
			
			asyncEnd();//完成处理必须进行回调
		});
	};
	
	sonicInfo.buffers=newBuffers;
	sonicInfo.bufferSize=newBufferSize;
	
	return true;
};



//******音频数据源，采集原始音频用的******
//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
	,{url:RootFolder+"/src/engine/mp3-engine.js",check:function(){return !Recorder.lamejs}}
	,{url:RootFolder+"/src/extensions/sonic.js",check:function(){return !Recorder.Sonic}}
	
	,{url:RootFolder+"/assets/runtime-codes/fragment.playbuffer.js",check:function(){return !window.DemoFragment||!DemoFragment.PlayBuffer}}//引入DemoFragment.PlayBuffer
]);

//显示控制按钮
Runtime.Ctrls([
	{name:"开始录音",click:"recStart"}
	,{name:"结束录音并转换",click:"recStop"}
	,{html:'<hr><div style="font-size:12px">控制选项，同一时间应该只控制一个，否则叠加作用；请填写0.1-2.0的数字，1.0为不调整，当然超过2.0也是可以的（需手动输入）</div>\
<div class="sonicCtrlBox" style="margin:5px 0 16px">\
<style>\
	.sonicCtrlBox span{display:inline-block;width:80px;text-align:right;}\
	.sonicCtrlBox input{text-align:right;}\
</style>\
	<div><span>Pitch:</span><input class="sonicCtrlInput sonicCtrlPitch" style="width:60px"> 男声<input type="range" class="sonicCtrlRange" min="0.1" max="2" step="0.1" value="1.0">女声，变调不变速（会说话的汤姆猫）</div>\
	<div><span>Speed:</span><input class="sonicCtrlInput sonicCtrlSpeed" style="width:60px"> 慢放<input type="range" class="sonicCtrlRange" min="0.1" max="2" step="0.1" value="1.0">快放，变速不变调（快放慢放）</div>\
	<div><span>Rate:</span><input class="sonicCtrlInput sonicCtrlRate" style="width:60px"> 缓重<input type="range" class="sonicCtrlRange" min="0.1" max="2" step="0.1" value="1.0">尖锐，变速变调</div>\
	<div><span>Volume:</span><input class="sonicCtrlInput sonicCtrlVolume" style="width:60px"> 调低<input type="range" class="sonicCtrlRange" min="0.1" max="2" step="0.1" value="1.0">调高，调整音量</div>\
	\
	<div style="border-top: 1px solid #eee;margin-top: 10px;"><span>处理缓冲:</span><input class="sonicCtrlInput sonicCtrlBuffer" style="width:60px">ms 0ms<input type="range" class="sonicCtrlRange sonicCtrlBufferRange" min="0" max="1000" step="100" value="200">1000ms，控制缓冲大小减少转换引入的杂音，0不缓冲</div>\
	<div><span>播放反馈:</span><input class="sonicCtrlInput sonicCtrlPlay" style="width:60px"> 不播放 <input type="range" class="sonicCtrlRange" min="0" max="1" step="1" value="1">实时播放反馈</div>\
</div>'}
	,{name:"重新转换",click:"recTransformAll"}
	,{name:"重置设置",click:"resetCtrl"}
	
	,{choiceFile:{
		process:function(fileName,arrayBuffer,filesCount,fileIdx,endCall){
			Runtime.DecodeAudio(fileName,arrayBuffer,function(data){
				Runtime.LogAudio(data.srcBlob,data.duration,{set:data},"已解码"+fileName);
				
				rec=null;
				transformAll([data.data],data.sampleRate);
				
				endCall();
			},function(msg){
				Runtime.Log(msg,1);
				endCall();
			});
		}
	}}
]);

var sonicCtrlSet={};
$(".sonicCtrlInput").bind("change",function(e){
	sonicCtrlSet[/sonicCtrl([^ ]+)$/.exec(e.target.className)[1].toLowerCase()]=+e.target.value;
});
$(".sonicCtrlRange").bind("change",function(e){
	$(e.target).parent().find(".sonicCtrlInput").val(/\d+\.\d+/.exec(e.target.value+".0")[0]).change();
}).change();
var resetCtrl=function(){
	$(".sonicCtrlRange").val(1).change();
	$(".sonicCtrlBufferRange").val(200).change();
};



//调用录音
var rec;
function recStart(){
	window.sonicAsync&&sonicAsync.flush();
	window.sonicAsync=null;
	
	rec=Recorder({
		type:"mp3"
		,sampleRate:16000
		,bitRate:16
		,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate,newBufferIdx,asyncEnd){
			Runtime.Process.apply(null,arguments);
			
			return transformBufferPlayOnly(buffers,bufferSampleRate,newBufferIdx,asyncEnd);
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
		
		recTransformAll();
	},function(msg){
		Runtime.Log("录音失败:"+msg, 1);
	},true);
};
