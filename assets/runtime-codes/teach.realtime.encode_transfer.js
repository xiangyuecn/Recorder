/******************
《【教程】【音频流】【上传】实时转码上传-通用转码旧版》
作者：高坚果
时间：2019-10-22 23:04:49

【这是老旧的示例代码】本示例是Recorder最早期的实时转码上传方案，每次上传的是数据都是使用rec.mock转码生成的独立完整小音频文件（会导致mp3等格式音质变差，wav、pcm等格式无此问题），好处是所有格式都支持。
大部分情况下优先推荐使用采用takeoffEncodeChunk实现的《实时转码上传-实时帧回调版》（已支持大部分格式，但不支持wav），不存在音质变差的问题。

通过onProcess回调可实现录音的实时处理；能做到边录音边转码，流式的将数据进行上传；本示例涉及Recorder两个核心方法：mock、SampleData。

如果不需要获得最终结果，可实时清理缓冲数据，避免占用过多内存，想录多久就录多久。

本例子是按固定发送间隔来转码和发送数据，如需每次发送固定大小的数据帧，请参考《实时转码上传-pcm固定帧大小》；其他格式如果也许发送固定大小的数据帧，请自行改造数据发送部分，将待发送数据缓冲起来，再按固定大小切分后发送。

【mp3拼接】mp3格式因为lamejs采用的CBR编码，因此后端接收到了mp3片段后，通过简单的二进制拼接就能得到完整的长mp3，和pcm的拼接相同；前端、后端实现拼接都可以参考mp3合并的demo代码。

【wav拼接】本库wav格式音频是用44字节wav头+PCM数据来构成的，因此只需要将所有片段去掉44字节后，通过简单的二进制拼接就能得到完整的长pcm数据，最后在加上新的44字节wav头就能得到完整的wav音频文件；前端、后端实现拼接都可以参考wav合并的demo代码。

【pcm拼接】两个参数相同的pcm文件直接二进制拼接在一起即可成为长的pcm文件，和mp3的拼接相同；前端、后端实现拼接都可以参考 实时转码并上传-pcm固定帧大小 的demo代码。

【引入杂音、停顿问题】除wav、pcm外其他格式编码结果可能会比实际的PCM结果音频时长略长或略短，如果涉及到实时解码应留意此问题，长了的时候可截断首尾使解码后的PCM长度和录音的PCM长度一致（可能会增加噪音）；
wav、pcm格式最终拼接出来的音频音质比mp3的要好很多，因为wav拼接出来的PCM数据和录音得到的PCM数据是相同的；
但mp3拼接出来的就不一样了，因为每次mp3编码时都会引入首尾的静默数据，使音频时长略微变长，这部分静默数据听起来就像有杂音和停顿一样，在实时转码间隔很短的情况下尤其明显（比如50ms），但只要转码间隔比较大时（比如500ms），mp3的这种停顿就会感知不到，音质几乎可以达到和wav一样。

【接收端要实时播放?】本示例代码上传过来的数据都是一小段一小段的数据片段文件（每一段均可独立正常播放），接收端可以进行缓冲，实时的解码成PCM进行播放，可以参考《【教程】【音频流】【播放】实时解码播放音频片段》使用BufferStreamPlayer插件来播放。
******************/
var testSampleRate=16000;
var testBitRate=16;

var SendInterval=300;/******
转码发送间隔（实际间隔比这个变量值偏大点，取决于BufferSize），单位毫秒。这个值可以设置很大，但不能设置很低，毕竟转码和传输还是要花费一定时间的，设备性能低下可能还处理不过来。

mp3格式下一般大于500ms就能保证能够正常转码处理，wav大于100ms，剩下的问题就是传输速度了。由于转码操作都是串行的，录制过程中转码生成出来mp3顺序都是能够得到保证，但结束时最后几段数据可能产生顺序问题，需要留意。由于传输通道不一定稳定，后端接收到的顺序可能错乱，因此可以携带编号进行传输，完成后进行一次排序以纠正顺序错乱的问题。

mp3格式在间隔太低的情况下中间的停顿会非常明显，可适当调大间隔以规避此影响，因为mp3编码时首尾出现了填充的静默数据（mp3.js编码器内已尽力消除了这些静默，但还是会有些许的静默停顿）；wav格式没有此问题，测试结束时可以对比播放音质。

当出现性能问题时，可能音频编码不过来，将采取丢弃部分帧的策略。
******/

//重置环境，每次开始录音时必须先调用此方法，清理环境
var RealTimeSendReset=function(type){
	send_type=type;
	send_pcmBuffer=new Int16Array(0);
	send_pcmSampleRate=testSampleRate;
	send_chunk=null;
	send_encBusy=0;
	send_number=0;
	send_numberMax=0;
};

var send_type; //转码音频类型
var send_pcmBuffer; //将pcm数据缓冲起来按指定时长发送
var send_pcmSampleRate; //pcm缓冲的采样率，等于testSampleRate，但取值过大时可能低于配置值
var send_chunk; //SampleData需要的上次转换结果，用于连续转换采样率

var send_encBusy; //转码队列是否阻塞
var send_number; //发送顺序编号
var send_numberMax; //发送编号最大值，一般是最后一次发送的编号，如果转码卡顿可能导致顺序错乱

//=====实时处理核心函数==========
var RealTimeSendTry=function(buffers,bufferSampleRate,isClose){
	//提取出新的pcm数据
	if(buffers.length>0){
		//借用SampleData函数进行数据的连续处理，采样率转换是顺带的，得到新的pcm数据
		var chunk=Recorder.SampleData(buffers,bufferSampleRate,testSampleRate,send_chunk,{frameType:isClose?"":send_type});
		send_chunk=chunk;
		
		var pcm=chunk.data; //此时的chunk.data就是原始的音频16位pcm数据（小端LE），直接保存即为16位pcm文件、加个wav头即为wav文件、丢给mp3编码器转一下码即为mp3文件
		send_pcmSampleRate=chunk.sampleRate;
		
		//将新的pcm写入缓冲，等时长够了再发送
		var tmp=new Int16Array(send_pcmBuffer.length+pcm.length);
		tmp.set(send_pcmBuffer,0);
		tmp.set(pcm,send_pcmBuffer.length);
		send_pcmBuffer=tmp;
	};
	
	var pcm=send_pcmBuffer,pcmSampleRate=send_pcmSampleRate;
	var pcmDuration=Math.round(pcm.length/pcmSampleRate*1000);
	if(!isClose && pcmDuration<SendInterval){
		return;//控制缓冲达到指定间隔才进行传输
	};
	send_pcmBuffer=new Int16Array(0); //清除缓冲
	var number=++send_number;
	
	//没有新数据，或结束时的数据量太小，不能进行mock转码
	if(pcm.length==0 || isClose&&pcm.length<2000){
		TransferUpload(number,null,0,null,isClose);
		return;
	};
	
	//实时编码队列阻塞处理
	if(!isClose){
		if(send_encBusy>=2){
			Runtime.Log("编码队列阻塞，已丢弃一帧",1);
			return;
		};
	};
	send_encBusy++;
	
	//通过mock方法实时转码成mp3、wav；16位pcm格式可以不经过此操作，直接发送new Blob([pcm.buffer],{type:"audio/pcm"}) 要8位的就必须转码
	var encStartTime=Date.now();
	var recMock=Recorder({
		type:send_type
		,sampleRate:testSampleRate //采样率
		,bitRate:testBitRate //比特率
	});
	recMock.mock(pcm,pcmSampleRate);
	//recMock.dataType="arraybuffer"; //下面stop默认返回blob文件，可以改成返回ArrayBuffer
	recMock.stop(function(blob,duration){
		send_encBusy&&(send_encBusy--);
		blob.encTime=Date.now()-encStartTime;
		
		//转码好就推入传输
		TransferUpload(number,blob,duration,recMock,isClose);
	},function(msg){
		send_encBusy&&(send_encBusy--);
		
		//转码错误？没想到什么时候会产生错误！
		Runtime.Log("不应该出现的错误:"+msg,1);
	});
	
	//测试结束时把所有pcm转成wav，方便对比音质
	testLogPcms(pcm);
};

//=====数据传输函数==========
var TransferUpload=function(number,blobOrNull,duration,blobRec,isClose){
	send_numberMax=Math.max(send_numberMax,number);
	if(blobOrNull){
		var blob=blobOrNull;
		var encTime=blob.encTime;
		
		//*********发送方式一：Base64文本发送***************
		var reader=new FileReader();
		reader.onloadend=function(){
			var base64=(/.+;\s*base64\s*,\s*(.+)$/i.exec(reader.result)||[])[1];
			
			//可以实现
			//WebSocket send(base64) ...
			//WebRTC send(base64) ...
			//XMLHttpRequest send(base64) ...
			
			//这里啥也不干
		};
		reader.readAsDataURL(blob);
		
		//*********发送方式二：Blob二进制发送***************
		//提示：用上面reader.readAsArrayBuffer读取的reader.result是ArrayBuffer，也可以直接发送二进制数据，ArrayBuffer更通用
		//可以实现
		//WebSocket send(blob or arrayBuffer) ...
		//WebRTC send(blob or arrayBuffer) ...
		//XMLHttpRequest send(blob or arrayBuffer) ...
		
		
		//****这里仅显示一个日志 意思意思****
		var numberFail=number<send_numberMax?'<span style="color:red">顺序错乱的数据，如果要求不高可以直接丢弃，或者调大SendInterval试试</span>':"";
		var logMsg="No."+(number<100?("000"+number).substr(-3):number)+numberFail;
		
		Runtime.LogAudio(blob,duration,blobRec,logMsg+"花"+("___"+encTime).substr(-3)+"ms");
		
		if(true && number%100==0){//emmm....
			Runtime.LogClear();
		};
	};
	
	if(isClose){
		Runtime.Log("No."+(number<100?("000"+number).substr(-3):number)+":已停止传输");
	};
	testLogFrames(blobOrNull,isClose);
};



//测试用
var testFrames,testPcms,testUseMerge;
//测试结束时把所有pcm转成wav，方便对比音质
var testLogPcms=function(pcm){
	if(testUseMerge){
		testPcms.push(pcm);
	}
};
//测试结束时把所有数据帧合并成一个完整音频
var testLogFrames=function(blobOrNull,isClose){
	if(testUseMerge){
		if(blobOrNull){
			var reader=new FileReader();
			reader.onloadend=function(){
				testFrames.push(new Uint8Array(reader.result));
				if(isClose){ testMergeFrames(); }
			}
			reader.readAsArrayBuffer(blobOrNull);
		}else if(isClose){
			testMergeFrames();
		}
	}
};
//测试合并所有数据帧成一个完整文件，会将所有pcm转码成wav对比音质
var testMergeFrames=function(){
	if(!testUseMerge){
		return Runtime.Log("未勾选合并成一个完整音频，不测试合并成完整音频文件","#aaa");
	}
	
	//所有pcm转码成wav对比音质，直接加个wav头即可
	var recSet={type:"wav",sampleRate:send_pcmSampleRate,bitRate:16};
	var size=0; for(var i=0;i<testPcms.length;i++)size+=testPcms[i].length;
	var pcm=new Int16Array(size);
	for(var i=0,offset=0;i<testPcms.length;i++){
		pcm.set(testPcms[i], offset);
		offset+=testPcms[i].length;
	}
	var pcmDur=Math.round(pcm.length/recSet.sampleRate*1000);
	var header=Recorder.wav_header(1,1,recSet.sampleRate,recSet.bitRate,pcm.byteLength);
	var bytes=new Uint8Array(header.length+pcm.byteLength);
	bytes.set(header);
	bytes.set(new Uint8Array(pcm.buffer), header.length);
	
	var blob=new Blob([bytes.buffer],{type:"audio/wav"});
	Runtime.LogAudio(blob,pcmDur,{set:recSet},'<span style="color:#aaa">'+testPcms.length+"帧原始pcm合并成一个wav对比音质</span>");
	
	//合并所有数据帧成一个完整文件
	var recSet={type:send_type,sampleRate:send_pcmSampleRate,bitRate:testBitRate};
	var size=0,frames=[];
	for(var i=0;i<testFrames.length;i++){
		var frame=testFrames[i];
		if(recSet.type=="wav"){
			frame=new Uint8Array(frame.subarray(44)); //生成的wav有固定44字节的头，去掉
		}
		frames.push(frame);
		size+=frame.length;
	}
	if(size==0){
		return Runtime.Log("未录制得到音频数据帧，不测试合并成完整音频文件",1);
	}
	if(recSet.type=="wav"){ //wav格式手动添加wav头，或者直接用上面的mock转码通用点
		var header=Recorder.wav_header(1,1,recSet.sampleRate,recSet.bitRate,size);
		size+=header.length;
		frames.splice(0,0,header);
	}
	var bytes=new Uint8Array(size);
	for(var i=0,offset=0;i<frames.length;i++){
		bytes.set(frames[i], offset);
		offset+=frames[i].length;
	}
	
	var blob=new Blob([bytes.buffer],{type:"audio/"+recSet.type});
	Runtime.LogAudio(blob,pcmDur,{set:recSet},testFrames.length+"帧数据合并成一个完整音频");
};



//=====以下代码为音频数据源，采集原始音频用的==================
//加载框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
	,{url:RootFolder+"/src/engine/mp3-engine.js",check:function(){return !Recorder.lamejs}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
	,{url:RootFolder+"/src/engine/pcm.js",check:function(){return !Recorder.prototype.pcm}}
]);

//显示控制按钮
Runtime.Ctrls([
	{html:'<div style="padding-bottom:8px"><label><input class="useMerge" type="checkbox" checked>测试结束时合并成一个完整音频（内存会持续变大，测试内存占用时要取消勾选）</label></div>'}
	,{name:"开始录音和传输mp3",click:"recStart('mp3');Date.now"}
	,{name:"开始录音和传输wav",click:"recStart('wav');Date.now"}
	,{name:"开始录音和传输pcm",click:"recStart('pcm');Date.now"}
	,{html:'<div />'}
	,{name:"停止录音",click:"recStop"}
]);


//调用录音
var rec;
function recStart(type){
	if(rec){
		rec.close();
	};
	//配置有效性检查
	if((type=="wav"||type=="pcm") && testBitRate!=16 && testBitRate!=8){
		Runtime.Log("wav和pcm的testBitRate取值只支持16或8",1);
		return;
	};
	
	var clearBufferIdx=0,processTime=0;
	var rec2=rec=Recorder({
		type:"unknown" //这里特意使用unknown格式，方便清理内存
		,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate,newBufferIdx,asyncEnd){
			Runtime.Process.apply(null,arguments);
			processTime=Date.now();
			
			//实时释放清理内存，用于支持长时间录音；在指定了有效的type时，编码器内部可能还会有其他缓冲，必须同时提供takeoffEncodeChunk才能清理内存，否则type需要提供unknown格式来阻止编码器内部缓冲
			//这里进行了延迟操作（必须要的操作），只清理上次到现在之前的buffer，新的还未推入编码器进行编码需保留
			//if(this.clearBufferIdx>newBufferIdx){ this.clearBufferIdx=0 } //变量改到this里面时，重新录音了，这样写可以重置this环境
			for(var i=clearBufferIdx;i<newBufferIdx;i++){
				buffers[i]=null;
			};
			clearBufferIdx=newBufferIdx;
			
			//【关键代码】推入实时处理
			RealTimeSendTry(buffers,bufferSampleRate,false);
		}
	});
	
	rec2.open(function(){//打开麦克风授权获得相关资源
		if(rec2!=rec) return; //sync
		rec2.start();//开始录音
		Runtime.Log("已开始录音");
		
		//【稳如老狗WDT】可选的，监控是否在正常录音有onProcess回调，如果长时间没有回调就代表录音不正常
		var wdt=rec.watchDogTimer=setInterval(function(){
			if(!rec || wdt!=rec.watchDogTimer){ clearInterval(wdt); return } //sync
			if(Date.now()<rec.wdtPauseT) return; //如果暂停录音了就不检测，此demo没有用到暂停。puase时赋值rec.wdtPauseT=Date.now()*2（永不监控），resume时赋值rec.wdtPauseT=Date.now()+1000（1秒后再监控）
			if(Date.now()-(processTime||startTime)>1500){ clearInterval(wdt);
				Runtime.Log(processTime?"录音被中断":"录音未能正常开始",1);
				// ... 错误处理，关闭录音，提醒用户
			}
		},1000);
		var startTime=Date.now(); rec.wdtPauseT=0;
	},function(msg,isUserNotAllow){
		if(rec2!=rec) return; //sync
		Runtime.Log((isUserNotAllow?"UserNotAllow，":"")+"无法录音:"+msg, 1);
	});
	
	testUseMerge=document.querySelector(".useMerge").checked;
	testFrames=[]; testPcms=[]; //测试打日志用的
	RealTimeSendReset(type);//重置环境，开始录音时必须调用一次
};
function recStop(){
	var rec2=rec; rec=null; if(!rec2) return Runtime.Log("未开始录音",1);
	rec2.watchDogTimer=0; //停止监控onProcess超时
	rec2.close();//直接close掉即可，这个例子不需要获得最终的音频文件。unknown、wav等不支持实时编码的格式无法调用stop，因为onProcess里面清理掉了内存数据
	
	RealTimeSendTry([],0,true);//最后一次发送
};