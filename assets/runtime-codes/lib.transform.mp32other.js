/******************
《【Demo库】【格式转换】-mp3格式转成其他格式》
作者：高坚果
时间：2019-10-22 15:20:57

文档：
Recorder.Mp32Other(newSet,mp3Blob,True,False)
		newSet：Recorder的set参数，用来生成新格式，注意：要先加载好新格式的编码引擎
		mp3Blob：mp3二进制数据
		True: fn(blob,duration,mockRec) 和Recorder的stop函数参数一致，mockRec为转码时用到的Recorder对象引用
		False: fn(errMsg) 和Recorder的stop函数参数一致
******************/

//=====mp3转其他格式核心函数==========
Recorder.Mp32Other=function(newSet,mp3Blob,True,False){
	if(!Recorder.Support()){//强制激活Recorder.Ctx 不支持大概率也不支持解码
		False&&False("浏览器不支持mp3解码");
		return;
	};
	
	var reader=new FileReader();
	reader.onloadend=function(){
		var ctx=Recorder.Ctx;
		ctx.decodeAudioData(reader.result,function(raw){
			var src=raw.getChannelData(0);
			var sampleRate=raw.sampleRate;
			
			var pcm=new Int16Array(src.length);
			for(var i=0;i<src.length;i++){//floatTo16BitPCM 
				var s=Math.max(-1,Math.min(1,src[i]));
				s=s<0?s*0x8000:s*0x7FFF;
				pcm[i]=s;
			};
			
			var rec=Recorder(newSet).mock(pcm,sampleRate);
			rec.stop(function(blob,duration){
				True(blob,duration,rec);
			},False);
		},function(e){
			False&&False("mp3解码失败:"+e.message);
		});
	};
	reader.readAsArrayBuffer(mp3Blob);
};
//=====END=========================



//转换测试
var test=function(mp3Blob){
	if(!mp3Blob){
		Runtime.Log("无数据源，请先录音",1);
		return;
	};
	var set={
		type:"wav"
		,sampleRate:48000
		,bitRate:16
	};
	
	//数据格式一 Blob
	Recorder.Mp32Other(set,mp3Blob,function(blob,duration,rec){
		console.log(blob,(window.URL||webkitURL).createObjectURL(blob));
		Runtime.Log("mp3 src blob 转换成 wav...",2);
		Runtime.LogAudio(blob,duration,rec);
	},function(msg){
		Runtime.Log(msg,1);
	});
	
	//数据格式二 Base64 模拟
	var reader=new FileReader();
	reader.onloadend=function(){
		var base64=(/.+;\s*base64\s*,\s*(.+)$/i.exec(reader.result)||[])[1];
		
		//数据格式二核心代码，以上代码无关紧要
		var bstr=atob(base64),n=bstr.length,u8arr=new Uint8Array(n);
		while(n--){
			u8arr[n]=bstr.charCodeAt(n);
		};
		
		Recorder.Mp32Other(set,new Blob([u8arr.buffer]),function(blob,duration,rec){
			Runtime.Log("mp3 as base64 转换成 wav...",2);
			Runtime.LogAudio(blob,duration,rec);
		},function(msg){
			Runtime.Log(msg,1);
		});
	};
	reader.readAsDataURL(mp3Blob);
};






//=====以下代码无关紧要，音频数据源，采集原始音频用的==================
//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
	,{url:RootFolder+"/src/engine/mp3-engine.js",check:function(){return !Recorder.lamejs}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
]);

//显示控制按钮
Runtime.Ctrls([
	{name:"开始mp3录音",click:"recStart"}
	,{name:"结束录音并转换",click:"recStop"}
	
	,{choiceFile:{
		multiple:false
		,name:"mp3"
		,mime:"audio/mp3"
		,process:function(fileName,arrayBuffer,filesCount,fileIdx,endCall){
			test(new Blob([arrayBuffer]));
			endCall();
		}
	}}
]);


//调用录音
var rec;
function recStart(){
	rec=Recorder({
		type:"mp3"
		,sampleRate:32000
		,bitRate:96
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
		
		test(blob);
	},function(msg){
		Runtime.Log("录音失败:"+msg, 1);
	});
};
