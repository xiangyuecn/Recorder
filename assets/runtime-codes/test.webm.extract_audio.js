/******************
《【测试】WebM格式解析并提取音频》
作者：高坚果
时间：2022-08-03 20:28

Matroska开源多媒体容器标准，WebM格式（.webm、.weba）使用此标准，另外还有常见的.mkv视频格式也是使用此标准，惊不惊喜意不意外。

编写本测试代码的意图是验证从webm片段数据中提取pcm数据的可行性，结果：只要浏览器支持录pcm编码的webm，就能很容易提取出pcm数据。

Matroska封装格式官方文档：
	https://www.matroska.org/index.html
参考文章：
	webM文件解析--基于Matroska和EBML
		https://blog.csdn.net/newchenxf/article/details/112567406
	多媒体封装格式详解---MKV【1】【2】【3】
		http://blog.csdn.net/tx3344/article/details/8162656
		http://blog.csdn.net/tx3344/article/details/8176288
		http://blog.csdn.net/tx3344/article/details/8203260
	Matroska文件解析之SimpleBlock
		https://blog.csdn.net/weixin_30500289/article/details/97829650
	
====================================================
WebM文件分解（16进制显示）：
	- 数据统一套娃格式：EBML_ID+数据长度+数据，ID和长度均为VINT格式
	- VINT：可变长Int，首字节2进制下左侧 `0000001`开头的长度，就代表有几个字节，0可能有0-7个，值为1后面的所有2进制内容
	- SimpleBlock 另外有格式定义

1A45DFA3 9F //【EBML Header】 Header+Segment【Array】可存在多个
	4286 81 01
	42F7 81 01
	42F2 81 04
	42F3 81 08
	4282 84 7765626D //webm
	4287 81 04
	4285 81 02
18538067 01FFFFFFFFFFFFFF //【Segment】
	1549A966 99 //【Segment Information】
		2AD7B1 83 0F4240 //1000000 int
		4D80 86 4368726F6D65 //Chrome
		5741 86 4368726F6D65
	1654AE6B EA //【Track】轨道信息
		AE BD //【TrackEntry】【Array】 TrackEntry是数组，出现一次就代表一条轨道
			D7 81 01 //Track Number: 1
			73C5 87 DF91DCD55C648E
			83 81 02 //TrackType 1: video, 2: audio, 3: complex, 0x10: logo, 0x11: subtitle, 0x12: buttons, 0x20: control
			86 86 415F4F505553 //A_OPUS
			63A2 93 4F707573486561640101000080BB0000000000
			E1 8D //【Audio】
				B5 84 473B8000  //48000.0hz
				9F 81 01 //1声道
				6264 81 20 //32位
		AE A9 //【TrackEntry】【Array】 
			D7 81 02
			73C5 87 FCE6B23D2C8F28
			83 81 01
			55EE 81 01
			86 85 565F565038 //V_VP8
			E0 8C //【Video】
				B0 82 0280 //视频宽度 640
				BA 82 01E0 //视频高度 480
				53C0 81 01
	1F43B675 01FFFFFFFFFFFFFF //【Cluster】【Array】 Cluster是数组，会出现多次
		E7 81 00 //Cluster的时间偏移量 0ms
		A3 206733 //【SimpleBlock】【Array】 一条数据，会出现多次
			82 //Track Number: 2，对应的轨道是视频
			0000 //时间偏移量 0ms+0ms
			80 //the Block contains only keyframes
			... 剩余0x6733-4字节视频数据...
		A3 414E //【SimpleBlock】【Array】
			81 0000 80 //轨道1，对应的轨道是音频，时间偏移量 0ms+0ms
			... 剩余0x14E-4字节音频频数据...
		A3 4148 //【SimpleBlock】【Array】
			81 003B 80 //轨道1，对应的轨道是音频，时间偏移量 0ms+59ms
			... 剩余0x148-4字节音频频数据...
	1F43B675 01FFFFFFFFFFFFFF //【Cluster】【Array】
		E7 82 3137 //Cluster的时间偏移量 12599ms
		A3 41B3 //【SimpleBlock】【Array】
			81 0000 80 //轨道1，对应的轨道是音频，时间偏移量 12599ms+0ms
		......到文件结尾......
******************/

//=====WebM格式解析并提取音频 核心函数==========
Recorder.WebM_Extract_Audio=function(webmBlob,True,False){
	True=True||function(){};
	False=False||function(){};
	
	var HeaderEID=[0x1A,0x45,0xDF,0xA3];
	var SegmentEID=[0x18,0x53,0x80,0x67];
	var ClusterEID=[0x1F,0x43,0xB6,0x75];
	
	var reader=new FileReader();
	reader.onloadend=function(){
		try{
			var fileBytes=new Uint8Array(reader.result);
			var multiHeader=0,tracks={},audioTrackIdx=0,audioTrack0={};
			var duration=[0],duration2=[0];
			var rawData=[],playData=[],isPcm=0;
			var position=[0];
			
			//循环读取 Header+Segment
			HeaderLoop:while(true){
				if(position[0]>=fileBytes.length)break;
				
//EBML Header
var eid=readMatroskaVInt(fileBytes, position);
if(!BytesEq(eid, HeaderEID)){
	return False("未识别到此WebM文件Header");
};
multiHeader++;
//跳过EBML Header内容
readMatroskaBlock(fileBytes, position);

//Segment
var eid=readMatroskaVInt(fileBytes, position);
if(!BytesEq(eid, SegmentEID)){
	return False("未识别到此WebM文件Segment");
};
//跳过Segment长度值
readMatroskaVInt(fileBytes, position);

//循环读取Cluster
while(true){
	if(position[0]>=fileBytes.length)break;
	var eid0=readMatroskaVInt(fileBytes, position);
	
	//Cluster
	if(BytesEq(eid0, ClusterEID)){
		//跳过Cluster长度值
		readMatroskaVInt(fileBytes, position);
		
		var ablockIdx=0;
		var bytes0=fileBytes;
		var pos0=position;
		var bytesTime0=[];
		
		//循环读取SimpleBlock
		while(true){
			if(pos0[0]>=bytes0.length)break;
			var eid1=readMatroskaVInt(bytes0, pos0);
			if(BytesEq(eid1, HeaderEID)){//下一个Header+Segment
				position[0]-=HeaderEID.length;//退回一下
				continue HeaderLoop;
			};
			if(BytesEq(eid1, ClusterEID)){//下一个Cluster
				position[0]-=ClusterEID.length;//退回一下
				break;
			};
			
			var pos0_=pos0[0];
			var bytes1Len=[];
			var bytes1=readMatroskaBlock(bytes0, pos0, bytes1Len);
			var pos1=[0];
			if(BytesEq(eid1, [0xE7])){//Cluster 的当前时间
				bytesTime0=[0xE7];
				for(var i=pos0_;i<pos0[0];i++){
					bytesTime0.push(bytes0[i]);
				}
				duration[multiHeader]=BytesInt(bytes1);
				duration2[multiHeader]=0;
				continue;
			};
			
			//SimpleBlock
			if(BytesEq(eid1, [0xA3])){
				var trackNo=bytes1[0]&0xf;
				var track=tracks[trackNo];
				if(!track)throw new Error("轨道#"+trackNo+"的信息不存在");
				if(track.type=="audio" && track.audioTrackIdx===0){
					duration2[multiHeader]=BytesInt([bytes1[1],bytes1[2]]);
					var uint8=new Uint8Array(bytes1.length-4);
					for(var i=4;i<bytes1.length;i++){
						rawData.push(bytes1[i]);
						uint8[i-4]=bytes1[i];
					}
					
					if(isPcm || /(\b|_)PCM\b/i.test(track.codec) && track.channels>0 && track.bitDepth==32){
						//pcm数据转换成16位播放
						isPcm=true;
						var floatArr=new Float32Array(uint8.buffer);
						for(var i=0;i<floatArr.length;){ 
							var s=Math.max(-1,Math.min(1,floatArr[i]));
							s=s<0?s*0x8000:s*0x7FFF;
							playData.push(s&0xff);
							playData.push((s>>8)&0xff);
							
							i+=track.channels;
						}
					}else{
						//非pcm就用webm重新封装一下播放
						if(playData.length==0){
							Hex2Bytes(
'1A45DFA3 9F 4286 81 01\
	42F7 81 01 42F2 81 04 42F3 81 08 4282 84 7765626D 4287 81 04 4285 81 02\
18538067 01FFFFFFFFFFFFFF\
	1549A966 99 2AD7B1 83 0F4240 4D80 86 4368726F6D65 5741 86 4368726F6D65 1654AE6B', playData);
							playData.push(parseInt("1"+("0000000"+track.srcBytes.length.toString(2)).substr(-7),2));
							for(var i=0;i<track.srcBytes.length;i++){
								var b=track.srcBytes[i];
								playData.push(b);
								if(b==0xD7 && track.srcBytes[i+1]==0x81){//修正轨道编号
									playData.push(0x81);i++
									playData.push(0x01);i++
								}
							}
						};
						if(ablockIdx==0){
							Hex2Bytes('1F43B675 01FFFFFFFFFFFFFF', playData);
							playData.push.apply(playData, bytesTime0);
						};
						playData.push(0xA3);
						playData.push.apply(playData, bytes1Len);
						playData.push(0x81);
						for(var i=1;i<bytes1.length;i++){
							playData.push(bytes1[i]);
						}
					};
					ablockIdx++;
				}
			};
			//End SimpleBlock
		}
		continue;
	}
	//End Cluster
	
	var bytes0=readMatroskaBlock(fileBytes, position);
	var pos0=[0];
	
	//Track
	if(BytesEq(eid0, [0x16,0x54,0xAE,0x6B])){
		//循环读取TrackEntry
		while(true){
			if(pos0[0]>=bytes0.length)break;
			var eid1=readMatroskaVInt(bytes0, pos0);
			var bytes1Len=[];
			var bytes1=readMatroskaBlock(bytes0, pos0, bytes1Len);
			var pos1=[0];
			//TrackEntry
			if(BytesEq(eid1, [0xAE])){
				var track={};
				while(true){
					if(pos1[0]>=bytes1.length)break;
					var eid2=readMatroskaVInt(bytes1, pos1);
					var bytes2=readMatroskaBlock(bytes1, pos1);
					var pos2=[0];
					if(BytesEq(eid2, [0xD7])){//Track Number
						var val=BytesInt(bytes2);
						track.number=val;
						if(multiHeader==1){
							tracks[val]=track;
						};
					}else if(BytesEq(eid2, [0x83])){//Track Type
						var val=BytesInt(bytes2);
						if(val==1) track.type="video";
						else if(val==2) {
							track.type="audio";
							if(multiHeader==1){
								track.audioTrackIdx=audioTrackIdx++;
								if(track.audioTrackIdx==0){
									audioTrack0=track;
								}
							}
							
							track.srcBytes=[0xAE];
							[].push.apply(track.srcBytes, bytes1Len);
							[].push.apply(track.srcBytes, bytes1);
						} else track.type="Type-"+val;
					}else if(BytesEq(eid2, [0x86])){//Track Codec
						track.codec=BytesStr(bytes2);
					}else if(BytesEq(eid2, [0xE0]) || BytesEq(eid2, [0xE1])){
						//循环读取 Video 或 Audio 属性
						while(true){
							if(pos2[0]>=bytes2.length)break;
							var eid3=readMatroskaVInt(bytes2, pos2);
							var bytes3=readMatroskaBlock(bytes2, pos2);
							//采样率、位数、声道数
							if(BytesEq(eid3, [0xB5])) track.sampleRate=Math.round(BytesFloat(bytes3));
							else if(BytesEq(eid3, [0x62,0x64])) track.bitDepth=BytesInt(bytes3);
							else if(BytesEq(eid3, [0x9F])) track.channels=BytesInt(bytes3);
							//宽高
							else if(BytesEq(eid3, [0xB0])) track.width=BytesInt(bytes3);
							else if(BytesEq(eid3, [0xBA])) track.height=BytesInt(bytes3);
						}
					}
				}
				if(multiHeader>1){//多个Header时，不支不同持轨道参数
					var tk=tracks[track.number];
					if(!tk || tk.type!=track.type || tk.codec!=track.codec
						|| tk.sampleRate!=track.sampleRate
						|| tk.bitDepth!=track.bitDepth
						|| tk.channels!=track.channels){
						console.log(tk, track);
						throw new Error("WebM中有多个header时，不支持不一致的轨道参数");
					}
				}
				continue;
			}
			//End TrackEntry
			//不认识的，忽略
		}
		continue;
	}
	//End Track
	
	//不认识的，忽略
};
//End Cluster
			}
			//End Header+Segment
		}catch(e){
			console.error(e);
			return False("解析WebM文件提取音频异常："+e.message);
		}
		if(!rawData.length){
			return False("未提取到此WebM文件的音频数据");
		}
		
		var dur=0;
		for(var i=1;i<=multiHeader;i++){
			dur+=duration[i]||0;
			dur+=duration2[i]||0;
		}
		True({
			rawData:new Uint8Array(rawData)
			,rawTrack:audioTrack0
			
			,playBlob:new Blob([new Uint8Array(playData).buffer],{type:isPcm?"audio/pcm":"audio/webm"})
			,playType:isPcm?"pcm":"webm"
			,playSampleRate:audioTrack0.sampleRate||0
			,playBitRate:isPcm?16:0
			
			,webmTracks:tracks
			,multiHeader:multiHeader
			,duration:dur
		});
	};
	reader.readAsArrayBuffer(webmBlob);
};
//两个字节数组内容是否相同
var BytesEq=function(bytes1,bytes2){
	if(bytes2.length==1){
		if(bytes1.length==1){
			return bytes1[0]==bytes2[0];
		}
		return false;
	}
	if(bytes1.length!=bytes2.length){
		return false;
	}
	for(var i=0;i<bytes1.length;i++){
		if(bytes1[i]!=bytes2[i]){
			return false;
		}
	}
	return true;
};
//16进制串转成字节数组
var Hex2Bytes=function(hex,val){
	val=val||[];
	hex=hex.replace(/[\s\r\n]/g,"");
	for(var i=0;i<hex.length;){
		val.push(parseInt(hex[i++]+hex[i++],16));
	}
	return val;
};
//字节数组转成ASCII字符串
var BytesStr=function(bytes){
	var str="";
	for(var i=0;i<bytes.length;i++){
		str+=String.fromCharCode(bytes[i]);
	}
	return str;
};
//字节数组BE转成int数字
var BytesInt=function(bytes){
	var s="";//0-8字节，js位运算只支持4字节
	for(var i=0;i<bytes.length;i++){
		var n=bytes[i];
		s+=(n<16?"0":"")+n.toString(16);
	};
	return parseInt(s,16)||0;
};
//字节数组BE转成4|8字节浮点数
var BytesFloat=function(bytes){
	if(bytes.length==4){
		return new Float32Array(new Uint8Array(bytes.reverse()).buffer)[0];
	}else if(bytes.length==8){
		return new Float64Array(new Uint8Array(bytes.reverse()).buffer)[0];
	}
	throw new Error("浮点数长度必须为4或8");
};
//读取一个可变长数值字节数组
var readMatroskaVInt=function(arr,pos,trimArr){
	var i=pos[0];
	var b0=arr[i],b2=("0000000"+b0.toString(2)).substr(-8);
	var m=/^(0*1)(\d*)$/.exec(b2);
	if(!m)throw new Error("readMatroskaVInt首字节无效: "+i);
	var len=m[1].length;
	var val=[];
	for(var i2=0;i2<len && i<arr.length;i2++){
		val[i2]=arr[i];
		if(trimArr)trimArr[i2]=arr[i];
		i++;
	}
	if(trimArr){
		trimArr[0]=parseInt(m[2]||'0',2);
	}
	pos[0]=i;
	return val;
};
//读取一个自带长度的内容字节数组
var readMatroskaBlock=function(arr,pos,lenBytes){
	var lenVal=[];
	var lenBytes2=readMatroskaVInt(arr,pos,lenVal);
	if(lenBytes)lenBytes.push.apply(lenBytes,lenBytes2);
	
	var len=BytesInt(lenVal);
	var i=pos[0];
	var val=[];
	if(len<0x7FFFFFFF){ //超大值代表没有长度
		for(var i2=0;i2<len && i<arr.length;i2++){
			val[i2]=arr[i];
			i++;
		}
	}
	pos[0]=i;
	return val;
};
//=====END=========================



//测试提取
var test=function(webmBlob){
	Runtime.LogAudio(webmBlob,0,{set:{type:"webm"}},"源WebM");
	
	Recorder.WebM_Extract_Audio(webmBlob,function(data){
		console.log("webm data",data);
		for(var k in data.webmTracks){
			var track=data.webmTracks[k];
			var msg="WebM轨道#"+track.number;
			if(track.type=="audio"){
				msg+="【音频】";
				msg+=", 采样率: "+(track.sampleRate||"-")+"hz";
				msg+=", 位深: "+(track.bitDepth||"-");
				msg+=", 声道数: "+(track.channels||"-");
			}else if(track.type=="video"){
				msg+="【视频】";
				msg+=", 宽: "+(track.width||"-");
				msg+=", 高: "+(track.height||"-");
			}else{
				msg+=" "+track.type;
			}
			msg+=", codec:"+(track.codec||"-");
			Runtime.Log(msg,"#aaa");
		}
		
		Runtime.Log("已提取音频："+data.rawData.length+"b 源轨道#"+data.rawTrack.number);
		Runtime.LogAudio(data.playBlob,data.duration,{set:{type:data.playType,sampleRate:data.playSampleRate,bitRate:data.playBitRate}},"提取转播放");
		
		//顺带转码 16khz 试听音质
		Runtime.ReadBlob(data.playBlob,function(arr){
			var end=function(pcm,sampleRate){
				var mockRec=new Recorder({ type:"wav",sampleRate:16000,bitRate:16 });
				mockRec.mock(pcm, sampleRate);
				mockRec.stop(function(blob,duration){
					Runtime.LogAudio(blob,duration,mockRec,"提取转wav");
				});
			};
			if(data.playType=="pcm"){
				end(new Int16Array(arr), data.playSampleRate);
			}else{
				Runtime.DecodeAudio("",arr,function(obj){
					end(obj.data, obj.sampleRate);
				});
			};
		});
	},function(msg){
		Runtime.Log(msg,1);
	});
};




//=====以下代码无关紧要，音频数据源，采集原始音频用的==================
//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
	,{url:RootFolder+"/src/engine/pcm.js",check:function(){return !Recorder.prototype.pcm}}
]);

//显示控制按钮
Runtime.Ctrls([
	{name:"开始WebM录音",click:"recStart"}
	,{name:"结束录音",click:"recStop"}
	,{choiceFile:{
		multiple:false
		,name:"webm"
		,mime:"audio/webm"
		,title:"提取音频"
		,process:function(fileName,arrayBuffer,filesCount,fileIdx,endCall){
			test(new Blob([arrayBuffer]));
			endCall();
		}
	}}
]);


//调用录音
var rec,mRec,webmChunks;
function recStart(){
	if(mRec){
		mRec.stop();
		mRec.kill=true;
		mRec=null;
	}
	webmChunks=[];
	var webmType="audio/webm; codecs=pcm";
	if(!window.MediaRecorder || !MediaRecorder.prototype.requestData){
		Runtime.Log("此浏览器不支持MediaRecorder",1);
		return;
	}
	if(!MediaRecorder.isTypeSupported(webmType)){
		var t="audio/webm";
		Runtime.Log("此浏览器不支持"+webmType+"，已换成"+t+"录制","#bbb");
		webmType=t;
	}
	
	rec=Recorder({
		type:"wav"
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
		
		var mr=new MediaRecorder(Recorder.Stream, {mimeType:webmType});
		mr.ondataavailable=function(e){
			Runtime.ReadBlob(e.data,function(arr){
				if(mr.kill)return;
				webmChunks.push(new Uint8Array(arr));
				
				//结束录音了，提取音频数据
				if(mRec!=mr){
					mr.kill=true;
					var blob=new Blob(webmChunks, {type:"audio/webm"});
					test(blob);
				};
			});
		};
		mr.start(~~(1000/(48000/4096)));
		mRec=mr;
	},function(msg,isUserNotAllow){//用户拒绝未授权或不支持
		clearTimeout(t);
		Runtime.Log((isUserNotAllow?"UserNotAllow，":"")+"无法录音:"+msg, 1);
	});
};
function recStop(){
	var mr=mRec;mRec=null;
	mr&&mr.stop();
	
	if(!rec){
		Runtime.Log("未开始录音",1);
		return;
	}
	rec.stop(function(blob,duration){
		Runtime.LogAudio(blob,duration,rec);
	},function(msg){
		Runtime.Log("录音失败:"+msg, 1);
	},true);
};
