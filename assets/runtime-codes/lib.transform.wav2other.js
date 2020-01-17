/******************
《【Demo库】【格式转换】-wav格式转成其他格式》
作者：高坚果
时间：2019-10-22 13:48:35

文档：
Recorder.Wav2Other(newSet,wavBlob,True,False)
		newSet：Recorder的set参数，用来生成新格式，注意：要先加载好新格式的编码引擎
		wavBlob：wav二进制数据
		True: fn(blob,duration,mockRec) 和Recorder的stop函数参数一致，mockRec为转码时用到的Recorder对象引用
		False: fn(errMsg) 和Recorder的stop函数参数一致
******************/

//=====wav转其他格式核心函数==========
Recorder.Wav2Other=function(newSet,wavBlob,True,False){
	var reader=new FileReader();
	reader.onloadend=function(){
		//检测wav文件头
		var wavView=new Uint8Array(reader.result);
		var eq=function(p,s){
			for(var i=0;i<s.length;i++){
				if(wavView[p+i]!=s.charCodeAt(i)){
					return false;
				};
			};
			return true;
		};
		var pcm;
		if(eq(0,"RIFF")&&eq(8,"WAVEfmt ")){
			if(wavView[20]==1 && wavView[22]==1){//raw pcm 单声道
				var sampleRate=wavView[24]+(wavView[25]<<8)+(wavView[26]<<16)+(wavView[27]<<24);
				var bitRate=wavView[34]+(wavView[35]<<8);
				console.log("wav info",sampleRate,bitRate);
				if(bitRate==16){
					pcm=new Int16Array(wavView.buffer.slice(44));
				}else if(bitRate==8){
					pcm=new Int16Array(wavView.length-44);
					//8位转成16位
					for(var j=44,d=0;j<wavView.length;j++,d++){
						var b=wavView[j];
						pcm[d]=(b-128)<<8;
					};
				};
			};
		};
		if(!pcm){
			False&&False("非单声道wav raw pcm格式音频，无法转码");
			return;
		};
		
		var rec=Recorder(newSet).mock(pcm,sampleRate);
		rec.stop(function(blob,duration){
			True(blob,duration,rec);
		},False);
	};
	reader.readAsArrayBuffer(wavBlob);
};
//=====END=========================



//转换测试
var test=function(wavBlob){
	if(!wavBlob){
		Runtime.Log("无数据源，请先录音",1);
		return;
	};
	var set={
		type:"mp3"
		,sampleRate:48000
		,bitRate:96
	};
	
	//数据格式一 Blob
	Recorder.Wav2Other(set,wavBlob,function(blob,duration,rec){
		console.log(blob,(window.URL||webkitURL).createObjectURL(blob));
		Runtime.Log("wav src blob 转换成 mp3...",2);
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
		
		Recorder.Wav2Other(set,new Blob([u8arr.buffer]),function(blob,duration,rec){
			Runtime.Log("wav as base64 转换成 mp3...",2);
			Runtime.LogAudio(blob,duration,rec);
		},function(msg){
			Runtime.Log(msg,1);
		});
	};
	reader.readAsDataURL(wavBlob);
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
	{name:"16位wav录音",click:"recStart16"}
	,{name:"8位wav录音",click:"recStart8"}
	,{name:"结束录音并转换",click:"recStop"}
	
	,{choiceFile:{
		multiple:false
		,name:"wav"
		,mime:"audio/wav"
		,process:function(fileName,arrayBuffer,filesCount,fileIdx,endCall){
			test(new Blob([arrayBuffer]));
			endCall();
		}
	}}
]);


//调用录音
var rec;
function recStart16(){
	recStart(16);
};
function recStart8(){
	recStart(8);
};
function recStart(bitRate){
	rec=Recorder({
		type:"wav"
		,bitRate:bitRate
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
