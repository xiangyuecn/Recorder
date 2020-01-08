/******************
《【教程】变速变调音频转换》
作者：高坚果
时间：2020-1-8 10:53:23

通过extensions/sonic.js可实现：变调不变速（会说话的汤姆猫）、变速不变调（快放慢放）、变速变调、调节音量。

Recorder.Sonic有同步和异步两种调用方式，同步方法简单直接但处理量大时会消耗大量时间，主要用于一次性的处理；异步方法由WebWorker在后台进行运算处理，但异步方法不一定能成功开启（低版本浏览器），主要用于实时处理。

本示例是一次性完成转换，没有开启实时特性，因此采用同步方法来进行转换。实时异步处理的例子请参考在线测试完整demo中的sonicProcess方法。
******************/
var prevPcms,prevSampleRate;
var transform=function(pcms,pcmSampleRate){
	prevPcms=pcms;
	prevSampleRate=pcmSampleRate;
	
	var sampleRate=16000;
	var setSpeed=+$(".sonicCtrlSpeed").val();
	var setPitch=+$(".sonicCtrlPitch").val();
	var setRate=+$(".sonicCtrlRate").val();
	var setVolume=+$(".sonicCtrlVolume").val();
	
	var t1=Date.now();
	var chunk=Recorder.SampleData(pcms,pcmSampleRate,sampleRate);
	
	//核心的sonic同步调用
	var sonic=Recorder.Sonic({sampleRate:sampleRate});
	//进行sonic配置
	sonic.setSpeed(setSpeed);
	sonic.setPitch(setPitch);
	sonic.setRate(setRate);
	sonic.setVolume(setVolume);
	
	//进行同步转换处理，当pcm太大时使用切片+setTimeout异步化，避免界面卡住
	var buffers=[],newPcm,size=0,idx=0,blockLen=0;
	var run1=function(endCall){
		var blockSize=pcmSampleRate;//块大小尽量大些，避免引入杂音
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
			Runtime.Log("Pitch:"+/\d+\.\d+/.exec(setPitch+".0")[0]
				+" "+"Speed:"+/\d+\.\d+/.exec(setSpeed+".0")[0]
				+" "+"Rate:"+/\d+\.\d+/.exec(setRate+".0")[0]
				+" "+"Volume:"+/\d+\.\d+/.exec(setVolume+".0")[0]
				+" 转换耗时："+(t2-t1)+"ms 转码耗时："+(Date.now()-t2)+"ms");
			Runtime.LogAudio(blob,duration,mockRec,"已转换");
		},function(msg){
			Runtime.Log("转换失败:"+msg, 1);
		});
	};
	
	run1(run2);
};
var recTransform=function(){
	if(!rec||!rec.buffers){
		if(prevPcms){
			transform(prevPcms,prevSampleRate);
			return;
		};
		Runtime.Log("请先录个音",1);
		return;
	};
	transform(rec.buffers,rec.srcSampleRate);
};



//******音频数据源，采集原始音频用的******
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
</div>'}
	,{name:"重新转换",click:"recTransform"}
	,{name:"重置设置",click:"resetCtrl"}
]);

$(".sonicCtrlRange").bind("change",function(e){
	$(e.target).parent().find(".sonicCtrlInput").val(/\d+\.\d+/.exec(e.target.value+".0")[0]);
}).change();
var resetCtrl=function(){
	$(".sonicCtrlRange").val(1).change();
};


//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
	,{url:RootFolder+"/src/engine/mp3-engine.js",check:function(){return !Recorder.lamejs}}
	,{url:RootFolder+"/src/extensions/sonic.js",check:function(){return !Recorder.Sonic}}
]);

//调用录音
var rec;
function recStart(){
	rec=Recorder({
		type:"mp3"
		,sampleRate:16000
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
		
		recTransform();
	},function(msg){
		Runtime.Log("录音失败:"+msg, 1);
	},true);
};



//*****拖拽或者选择文件******
$(".choiceFileBox").remove();
Runtime.Log('<div class="choiceFileBox">\
	<div class="dropFile" onclick="$(\'.choiceFile\').click()" style="border: 3px dashed #a2a1a1;background:#eee; padding:30px 0; text-align:center;cursor: pointer;">\
	拖拽多个音乐文件到这里 / 点此选择，并转换\
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
	
	Runtime.Log("发现"+files.length+"个文件，开始转换...");
	
	var idx=-1;
	var run=function(){
		idx++;
		if(idx>=files.length){
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
var decodeAudio=function(name,arr,call){
	if(!Recorder.Support()){//强制激活Recorder.Ctx 不支持大概率也不支持解码
		Runtime.Log("浏览器不支持音频解码",1);
		return;
	};
	var srcBlob=new Blob([arr],{type:"audio/"+(/[^.]+$/.exec(name)||[])[0]});
	var ctx=Recorder.Ctx;
	ctx.decodeAudioData(arr,function(raw){
		var src=raw.getChannelData(0);
		var sampleRate=raw.sampleRate;
		console.log(name,raw,srcBlob);
		
		var pcm=new Int16Array(src.length);
		for(var i=0;i<src.length;i++){//floatTo16BitPCM 
			var s=Math.max(-1,Math.min(1,src[i]));
			s=s<0?s*0x8000:s*0x7FFF;
			pcm[i]=s;
		};
		
		Runtime.LogAudio(srcBlob,Math.round(src.length/sampleRate*1000),{set:{sampleRate:sampleRate}},"已解码"+name);
		
		rec=null;
		transform([pcm],sampleRate);
		
		call();
	},function(e){
		Runtime.Log("audio解码失败:"+e.message,1);
	});
};