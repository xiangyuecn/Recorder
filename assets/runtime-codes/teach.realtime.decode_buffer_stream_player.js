/******************
《【教程】【音频流】实时解码播放音频片段》
作者：高坚果
时间：2021-08-03 22:08:06

本教程是 BufferStreamPlayer扩展 (src/extensions/buffer_stream.player.js) 的使用示例 。

BufferStreamPlayer可以通过input方法一次性输入整个音频文件，或者实时输入音频片段文件，然后播放出来；输入支持格式：pcm、wav、mp3等浏览器支持的音频格式，非pcm格式会自动解码成pcm（播放音质效果比pcm、wav格式差点）；输入前输入后都可进行处理要播放的音频，比如：混音、变速、变调；输入的音频会写入到内部的MediaStream流中，完成将连续的音频片段文件转换成流。

BufferStreamPlayer可以用于：
	1. Recorder onProcess等实时处理中，将实时处理好的音频片段转直接换成MediaStream，此流可以作为WebRTC的local流发送到对方，或播放出来；
	2. 接收到的音频片段文件的实时播放，比如：WebSocket接收到的录音片段文件播放、WebRTC remote流（Recorder支持对这种流进行实时处理）实时处理后的播放。
******************/

var testAllPcm,testSampleRate,testInfo;
var testType,testDecode,testTransform;
var startMp3=function(){
	testType="mp3";
	testDecode=true;
	testTransform=function(pcm,sampleRate,True,False){
		True(pcm,sampleRate);
	};
	start();
};
var startWav=function(){
	testType="wav";
	testDecode=true;
	testTransform=function(pcm,sampleRate,True,False){
		True(pcm,sampleRate);
	};
	start();
};
var startPcm=function(){
	testType="pcm";
	testDecode=false;//pcm无需解码，但必须将输入转换成pcm[Int16,...]
	testTransform=function(arrayBuffer,sampleRate,True,False){
		//pcm需指定sampleRate，为传输过来pcm的采样率
		True(new Int16Array(arrayBuffer), loadPcmSampleRate);
	};
	start();
};


var stream;
var start=function(){
	if(stream){
		stop();
	}
	
	WS_Open();
	testAllPcm=[];
	testInfo={};
	
	stream=Recorder.BufferStreamPlayer({
		decode:testDecode //传输过来的不是pcm就需要开启解码
		,onInputError:function(errMsg, inputIndex){
			Runtime.Log("第"+inputIndex+"次的音频片段input输入出错: "+errMsg,1);
		}
		,transform:function(pcm,sampleRate,True,False){
			testTransform(pcm,sampleRate,function(pcm,sampleRate){
				True(pcm,sampleRate);
				
				testSampleRate=sampleRate;
				testAllPcm.push(pcm);//另存一份 结束时转成一个完整音频 对比接收到的数据音质
			},False);
		}
	});
	
	stream.start(function(){
		Runtime.Log("stream已打开["+testType+"]，正在播放中",2);
		
		recStart();//调用Recorder连接到这个stream进行可视化绘制
	},function(err){
		Runtime.Log("开始失败："+err,1);
	});
};
var stop=function(){
	WS_Close();
	recStop();
	
	if(stream){
		stream.stop();
	}
	stream=0;
	Runtime.Log("已结束");
	
	//生成一份完整的音频，对比音质
	var oldType=testType;
	var data=Recorder.SampleData(testAllPcm,testSampleRate,testSampleRate);
	var recMock=Recorder({type:"wav",sampleRate:testSampleRate});
	recMock.mock(data.data,testSampleRate);
	recMock.stop(function(blob,duration){
		Runtime.LogAudio(blob,duration,recMock,"接收到的所有"+oldType+"数据生成的完整文件");
	});
};

var setRealtimeOn=function(){
	if(stream){
		stream.set.realtime=true;
		Runtime.Log("切换成了实时模式，如果缓冲中积压的未播放数据量过大，会直接丢弃数据或者加速播放，达到尽快播放新输入的数据的目的，可有效降低播放延迟");
	}
};
var setRealtimeOff=function(){
	if(stream){
		stream.set.realtime=false;
		Runtime.Log("切换成了非实时模式，所有输入的数据都会按顺序完整的播放");
	}
};

//实时的接收到了音频片段文件，通过input方法输入到流里面
var receiveAudioChunk=function(arrayBuffer){
	if(stream){
		testInfo.count=(testInfo.count||0)+1;
		var allSize=testInfo.allSize=(testInfo.allSize||0)+arrayBuffer.byteLength;
		if(allSize<1024*900){
			allSize=(allSize/1024).toFixed(2)+"KB";
		}else{
			allSize=(allSize/1024/1024).toFixed(2)+"MB";
		};
		
		$(".receiveInfo").html(""
			+"第"+testInfo.count+"次收到"+testType+"片段"+arrayBuffer.byteLength+"字节"
			+"，共收到"+allSize);
			
		stream.input(arrayBuffer);
	}
};


//调用Recorder对MediaStream进行实时处理：可视化绘制
var rec;
var recStart=function(){
	rec=Recorder({
		sourceStream:stream.getMediaStream() //明确指定录制处理的流
		,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate){
			Runtime.Process.apply(null,arguments);
		}
	});
	
	rec.open(function(){
		rec.start();//开始实时处理
		Runtime.Log("Recorder已连接上stream["+testType+"]，正在进行可视化绘制",2);
	},function(err){
		Runtime.Log("Recorder可视化绘制open失败："+err,1);
	});
};
function recStop(){
	var oldType=testType;
	if(rec){
		//rec.close(); 可以直接close，丢弃结果
		rec.stop(function(blob,duration){
			Runtime.LogAudio(blob,duration,rec,"可视化绘制从stream["+oldType+"]中录了一个音");
		},function(msg){
			Runtime.Log("录音失败:"+msg, 1);
		},true);
	};
};





//=====以下代码无关紧要，音频数据源==================
//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
	,{url:RootFolder+"/src/engine/mp3-engine.js",check:function(){return !Recorder.lamejs}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
	
	,{url:RootFolder+"/src/extensions/buffer_stream.player.js",check:function(){return !Recorder.BufferStreamPlayer}}
]);

//显示控制按钮
Runtime.Ctrls([
	{name:"WebSocket接收播放mp3",click:"startMp3"}
	,{name:"接收播放wav",click:"startWav"}
	,{name:"接收播放pcm",click:"startPcm"}
	
	,{html:"片段时长<input class='sendInterval' style='width:50px' value='300'>ms<div/>"}
	
	,{name:"结束接收停止播放",click:"stop"}
	
	,{html:"<span class='receiveInfo'></span><hr/>"}
	
	,{name:"实时模式，卡了就丢",click:"setRealtimeOn"}
	,{name:"非实时模式，完整播放",click:"setRealtimeOff"}
	,{html:"<div/>"}
	,{name:"模拟网络不畅，断网",click:"setNetworkFail"}
	,{name:"恢复网络",click:"setNetworkOk"}
	
	,{html:"<hr/>"}
]);








/************模拟WebSocket实时接收到音频片段**************/
var WS_OnMessage=function(e){
	var data=e.data;
	if(data instanceof ArrayBuffer) {
		//binary message
		receiveAudioChunk(data);
	}else{
		//text message
	}
};
var WS_Open=function(){
	//ws.binaryType="arraybuffer";
	WS_Close();
	
	//模拟收到数据，这里直接简单的进行一下音频片段数据的生成
	var idx=0,netBuffer=[];
	var getSendInterval=function(){//音频片段时长ms
		return +$(".sendInterval").val()||300;
	};
	var addMessage=function(bytes){
		if(!bytes.length)return;
		netBuffer.push(bytes.buffer);
		//开闸放水，简单点 有网了一次性放光
		if(networkOk){
			for(var i=0;i<netBuffer.length;i++){
				WS_OnMessage({data:netBuffer[i]});
			}
			netBuffer=[];
		}
	};
	window.wsInt=setTimeout(function(){
		if(testType=="mp3"){
			mp3Message();
		}else if(testType=="wav"){
			wavMessage();
		}else if(testType=="pcm"){
			pcmMessage();
		}
	},500);
	
	
	
	var mp3Message=function(){
		var SendInterval=getSendInterval();
		if(!mp3Meta){
			Runtime.Log("未读取到mp3Meta",1);
			window.wsInt=setTimeout(mp3Message,SendInterval);
			return;
		}
		
		//直接将MP3文件分帧，凑够间隔就算一段
		var bytes=0;
		for(var i=idx;i<mp3Bytes.length;i++){
			if(mp3Bytes[i]==0xff && mp3Bytes[i+1]>=7){
				var len=i-idx;
				if(len*8/mp3Meta.bitRate>SendInterval){
					bytes=new Uint8Array(mp3Bytes.subarray(idx,i));
					idx=i;
					break;
				}
				i+=mp3Meta.frameSize-1;
			}
		}
		if(!bytes){
			bytes=[];
			idx=0;
		}
		window.wsInt=setTimeout(mp3Message,bytes.length*8/mp3Meta.bitRate);
		
		addMessage(bytes);
	}
	
	
	var pcmEncode;
	var pcmMessage=function(){
		var SendInterval=getSendInterval();
		if(!loadPcm){
			window.wsInt=setTimeout(pcmMessage,SendInterval);
			return;
		}
		
		//直接将pcm切成段
		var size=~~(SendInterval*loadPcmSampleRate/1000);
		if(idx+size>loadPcm.length){
			idx=0;
		}
		var bytes=new Int16Array(size);
		for(var i=0;i<size;i++,idx++){
			bytes[i]=loadPcm[idx];
		};
		window.wsInt=setTimeout(pcmMessage,SendInterval);
		
		if(!pcmEncode){
			addMessage(bytes);
		}else{
			pcmEncode(bytes);
		}
	};
	
	
	
	var wavMessage=function(){
		//在pcmMessage的基础上，加一个wav编码，生成wav片段
		pcmEncode=function(arr){
			var pcm=new Int16Array(arr);
			var recMock=Recorder({
				type:"wav"
				,sampleRate:loadPcmSampleRate
				,bitRate:16
			});
			recMock.mock(pcm, loadPcmSampleRate);
			recMock.stop(function(blob){
				Runtime.ReadBlob(blob,function(arr){
					addMessage(new Uint8Array(arr));
				});
			});
		};
		
		pcmMessage();
	};
	
	
	
	Runtime.Log("简单模拟了一个WebSocket onmessage");
};
var WS_Close=function(){
	clearTimeout(window.wsInt);
};


var networkOk=true;
var setNetworkFail=function(){
	Runtime.Log("模拟网络不畅：直接断网");
	networkOk=false;
};
var setNetworkOk=function(){
	Runtime.Log("模拟恢复网络");
	networkOk=true;
};




//加载和解码模拟用的素材
var loadPcm=0,loadPcmSampleRate=0
var mp3Bytes=0,mp3Meta=0;
var loadWait=0;
var load=function(name,bgName,call){
	Runtime.Log("开始加载模拟用的音频素材"+name+"，<span style='color:red'>请勿操作...</span>");
	loadWait++;
	var xhr=new XMLHttpRequest();
	xhr.onloadend=function(){
		if(xhr.status==200){
			loadWait--;
			var arr=xhr.response;
			
			//将下载的文件明确的转码成CBR格式的mp3
			Runtime.DecodeAudio(name,arr,function(data){
				loadPcm=data.data;
				loadPcmSampleRate=data.sampleRate;
				
				recMock=Recorder({
					type:"mp3"
					,sampleRate:loadPcmSampleRate
					,bitRate:64
				});
				recMock.mock(loadPcm,loadPcmSampleRate).stop(function(blob,duration){
					Runtime.LogAudio(blob,duration,recMock,"已生成素材");
					
					Runtime.ReadBlob(blob,function(arr){
						mp3Meta=Recorder.mp3ReadMeta([arr],arr.byteLength);
						mp3Bytes=new Uint8Array(arr);
						call();
					});
				});
			},function(msg){
				Runtime.Log(msg,1);
				call();
			});
		}else{
			Runtime.Log("加载音频失败["+xhr.status+"]:"+name,1);
		};
	};
	xhr.open("GET",RootFolder+"/assets/audio/"+name,true);
	//xhr.timeout=16000;
	xhr.responseType="arraybuffer";
	xhr.send();
};
var loadAll=function(){
	load("movie-一代宗师-此一时彼一时.mp4.webm",0,function(){
		Runtime.Log("模拟用的音频素材已准备完毕，可以开始操作了",2);
	});
};

//加载素材
setTimeout(loadAll);
