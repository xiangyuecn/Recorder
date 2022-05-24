/******************
《【Demo库】【格式转换】-amr格式转成其他格式》
作者：高坚果
时间：2020-6-24 22:54:41

文档：
Recorder.AMR2Other(newSet,amrBlob,True,False)
		newSet：Recorder的set参数，用来生成新格式，注意：要先加载好新格式的编码引擎
		amrBlob：amr二进制数据，注意只支持AMR-NB编码（8000hz）
		True: fn(blob,duration,mockRec) 和Recorder的stop函数参数一致，mockRec为转码时用到的Recorder对象引用
		False: fn(errMsg) 和Recorder的stop函数参数一致
******************/

//=====amr转其他格式核心函数==========
Recorder.AMR2Other=function(newSet,amrBlob,True,False){
	var reader=new FileReader();
	reader.onload=function(){
		var amr=new Uint8Array(reader.result);
		Recorder.AMR.decode(amr,function(pcm){
			var rec=Recorder(newSet).mock(pcm,8000);
			rec.stop(function(blob,duration){
				True(blob,duration,rec);
			},False);
		},False);
	};
	reader.readAsArrayBuffer(amrBlob);
};
//=====END=========================



//转换测试
var test=function(amrBlob){
	if(!amrBlob){
		Runtime.Log("无数据源，请先录音",1);
		return;
	};
	var set={
		type:"mp3"
		,sampleRate:16000
		,bitRate:16
	};
	
	//数据格式一 Blob
	Recorder.AMR2Other(set,amrBlob,function(blob,duration,rec){
		console.log(blob,(window.URL||webkitURL).createObjectURL(blob));
		Runtime.Log("amr src blob 转换成 mp3...",2);
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
		
		Recorder.AMR2Other(set,new Blob([u8arr.buffer]),function(blob,duration,rec){
			Runtime.Log("amr as base64 转换成 mp3...",2);
			Runtime.LogAudio(blob,duration,rec);
		},function(msg){
			Runtime.Log(msg,1);
		});
	};
	reader.readAsDataURL(amrBlob);
};






//=====以下代码无关紧要，音频数据源，采集原始音频用的==================
//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/dist/engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
	,{url:RootFolder+"/dist/engine/beta-amr.js",check:function(){return !Recorder.prototype.amr}}
]);

//显示控制按钮
Runtime.Ctrls([
	{name:"开始amr录音",click:"recStart"}
	,{name:"结束录音并转换",click:"recStop"}
	
	,{choiceFile:{
		multiple:false
		,name:"amr"
		,mime:"audio/amr"
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
		type:"amr"
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
