/******************
《【测试】G711、G72X编码和解码播放》
作者：高坚果
时间：2023-05-04 19:46

G711标准（1988）： https://www.itu.int/rec/T-REC-G.711/en
G72X：	https://www.itu.int/rec/T-REC-G.721/en
		https://www.itu.int/rec/T-REC-G.723/en
		https://www.itu.int/rec/T-REC-G.726/en
		https://www.itu.int/rec/T-REC-G.729/en

FFmpeg转码：
[ wav->pcma] ffmpeg -i test.wav -acodec pcm_alaw -f alaw -ac 1 -ar 8000 test.pcma
[ wav->pcmu] ffmpeg -i test.wav -acodec pcm_mulaw -f mulaw -ac 1 -ar 8000 test.pcmu
[ wav->pcm ] ffmpeg -i test.wav -f s16le -ac 1 -ar 16000 test.pcm
[ pcm->pcma] ffmpeg -f s16le -ac 1 -ar 16000 -i test.pcm -acodec pcm_alaw -f alaw -ac 1 -ar 8000 test.pcm.pcma

FFmpeg播放：
	ffplay -f alaw -ac 1 -ar 8000 test.pcma
	ffplay -f mulaw -ac 1 -ar 8000 test.pcmu
	ffplay -f s16le -ac 1 -ar 16000 test.pcm
	
FFmpeg下载，解压得到 ffmpeg ffplay
	https://ffmpeg.org/download.html https://www.gyan.dev/ffmpeg/builds/
FFmpeg命令行参数：
	ffmpeg [infile options] -i infile [outfile options] outfile
******************/

var regEngine=function(key,enc,dec){
	Recorder.prototype[key]=function(res,True,False){
		var This=this,set=This.set,srcSampleRate=set.sampleRate,sampleRate=8000;
		set.bitRate=16;
		if(srcSampleRate!=sampleRate){
			set.sampleRate=sampleRate;
			res=Recorder.SampleData([res],srcSampleRate,sampleRate).data;
		}
		var bytes=enc(res);
		True(new Blob([bytes.buffer],{type:"audio/"+key}));
	};
	Recorder[key+"2wav"]=function(blob,True,False){
		var reader=new FileReader();
		reader.onloadend=function(){
			var bytes=new Uint8Array(reader.result);
			try{ var pcm=dec(bytes) }
			catch(e){ return False(e.message) }
			Recorder({
				type:"wav",sampleRate:8000,bitRate:16
			}).mock(pcm,8000).stop(function(wavBlob,duration){
				True(wavBlob,duration);
			},False);
		};
		reader.readAsArrayBuffer(blob);
	};
};

//https://github.com/dystopiancode/pcm-g711/blob/master/pcm-g711/g711.c
regEngine("g711a_1",function(pcm){
	var buffer=new Int8Array(pcm.length);
	for(var i=0;i<pcm.length;i++){
		var number=pcm[i];
		var ALAW_MAX = 0xFFF;
		var mask = 0x800;
		var sign = 0;
		var position = 11;
		var lsb = 0;
		if (number < 0) { number = -number; sign = 0x80; }
		if (number > ALAW_MAX) { number = ALAW_MAX; }
		for (; ((number & mask) != mask && position >= 5); mask >>= 1, position--);
		lsb = (number >> ((position == 4) ? (1) : (position - 4))) & 0x0f;
		buffer[i] = (sign | ((position - 4) << 4) | lsb) ^ 0x55;
	}
	return new Uint8Array(buffer.buffer);
},function(bytes){ return g711aDec(bytes) });

//https://blog.csdn.net/u012758497/article/details/113197704
regEngine("g711a_2",function(pcm){
	var aLawCompressTable=[1, 1, 2, 2, 3, 3, 3,
            3, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
            5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
            6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7,
            7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
            7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
            7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7];
	var cClip = 32635;

	var buffer=new Uint8Array(pcm.length);
	for(var i=0;i<pcm.length;i++){
		var sample = pcm[i],s;

		var sign = ((~sample) >> 8) & 0x80;
		if (!(sign == 0x80)) {
			sample = -sample;
		}
		if (sample > cClip) {
			sample = cClip;
		}
		if (sample >= 256) {
			var exponent = aLawCompressTable[(sample >> 8) & 0x7F];
			var mantissa = (sample >> (exponent + 3)) & 0x0F;
			s = (exponent << 4) | mantissa;
		} else {
			s = sample >> 4;
		}
		s ^= (sign ^ 0x55);
		buffer[i] = s;
	}
	return buffer;
},function(bytes){ return g711aDec(bytes) });

//https://github.com/twstx1/codec-for-audio-in-G72X-G711-G723-G726-G729/blob/master/G711_G721_G723/g711.c
var Tab=[1,2,3,3,4,4,4,4,5,5,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7];
regEngine("g711a",function(pcm){
	/*var seg_end=[0xFF, 0x1FF, 0x3FF, 0x7FF, 0xFFF, 0x1FFF, 0x3FFF, 0x7FFF];
		//生成Tab
		var tab=[];
		for(var i=0;i<=0x7fff;i++){
			var seg=8;
			for (var i2 = 0; i2 < 8; i2++) { if(i<=seg_end[i2]) { seg=i2; break; }  }
			var v=i>>8&0x7F;
			if(tab[v]==null) tab[v]=seg;
			else if(tab[v]!=seg) throw new Error("")
		}
		console.log(tab,JSON.stringify(tab));
		tab=tab.map(a=>a+1).filter(a=>a!=8);
		console.log(tab,JSON.stringify(tab));
	*/

	var buffer=new Uint8Array(pcm.length);
	for(var i=0;i<pcm.length;i++){
		var pcm_val=pcm[i];
		var mask,seg,aval;

		if (pcm_val >= 0) {
			mask = 0xD5;		/* sign (7th) bit = 1 */
		} else {
			mask = 0x55;		/* sign bit = 0 */
			pcm_val = -pcm_val - 1;
		}

		/* Convert the scaled magnitude to segment number. */
		//for (var i2 = 0; i2 < 8; i2++) { if(pcm_val<=seg_end[i2]) { seg=i2; break; }  }
		seg = (Tab[pcm_val>>8&0x7F]||8)-1;
		

		/* Combine the sign, segment, and quantization bits. */
		aval = seg << 4;
		if (seg < 2)
			aval |= (pcm_val >> 4) & 15;
		else
			aval |= (pcm_val >> (seg + 3)) & 15;
		buffer[i] = (aval ^ mask);
	}
	return buffer;
},function(bytes){ return g711aDec(bytes) });
var g711aDec=function(bytes){
	var buffer=new Int16Array(bytes.length);
	for(var i=0;i<bytes.length;i++){
		var a_val=bytes[i]^0x55;
		var t = (a_val & 15) << 4;
		var seg = (a_val & 0x70) >> 4;
		switch (seg) {
		case 0:
			t += 8; break;
		case 1:
			t += 0x108; break;
		default:
			t += 0x108;
			t <<= seg - 1;
		}
		buffer[i] = ((a_val & 0x80) ? t : -t);
	}
	return buffer;
};

regEngine("g711u",function(pcm){
	var buffer=new Uint8Array(pcm.length);
	for(var i=0;i<pcm.length;i++){
		var pcm_val=pcm[i];
		var mask,seg,uval;
		
		/* Get the sign and the magnitude of the value. */
		if (pcm_val < 0) {
			pcm_val = 0x84 - pcm_val;
			mask = 0x7F;
		} else {
			pcm_val += 0x84;
			mask = 0xFF;
		}
		
		/* Convert the scaled magnitude to segment number. */
		seg = (Tab[pcm_val>>8&0x7F]||8)-1;
		
		uval = (seg << 4) | ((pcm_val >> (seg + 3)) & 0xF);
		buffer[i] = (uval ^ mask);
	}
	return buffer;
},function(bytes){
	var buffer=new Int16Array(bytes.length);
	for(var i=0;i<bytes.length;i++){
		var u_val= ~bytes[i];
		
		var t = ((u_val & 15) << 3) + 0x84;
		t <<= (u_val & 0x70) >> 4;

		buffer[i] = ((u_val & 0x80) ? (0x84 - t) : (t - 0x84));
	}
	return buffer;
});






//=====测试代码==================
//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
	
	,{url:RootFolder+"/assets/runtime-codes/fragment.decode.wav.js",check:function(){return !window.DemoFragment||!DemoFragment.DecodeWav}}
]);

//显示控制按钮
Runtime.Ctrls([
	{html:'<div class="testChoiceFileDec"></div>'}
	,{html:'<div class="testChoiceFileEnc" style="margin-top:5px"></div>'}
	,{name:"开始录音",click:"recStart"}
	,{name:"结束录音",click:"recStop"}
	
	,{choiceFile:{cls:"choiceFileDec",
		multiple:true
		,name:"g7xx",title:"解码播放G7XX"
		,mime:"*/*"
		,process:function(fileName,arrayBuffer,filesCount,fileIdx,endCall){
			var type=(/\.([^\.]+)/.exec(fileName)[1]||"error").toLowerCase();
			if(type=="pcma") type="g711a";
			if(type=="pcmu") type="g711u";
			var blob=new Blob([arrayBuffer]);
			var duration=blob.size/8000*1000;
			Runtime.LogAudio(blob,duration,{set:{type:type,bitRate:16,sampleRate:8000}},"播放文件");
			endCall();
		}
	}}
	,{choiceFile:{ cls:"choiceFileEnc",keepOther:true,
		multiple:false
		,name:"wav",title:"转码成G7XX"
		,mime:"audio/wav"
		,process:function(fileName,arrayBuffer,filesCount,fileIdx,endCall){
			try{
				var data=DemoFragment.DecodeWav(new Uint8Array(arrayBuffer));
			}catch(e){
				Runtime.Log(fileName+"解码失败："+e.message,1);
				return endCall();
			}
			test(data.pcm,data.sampleRate);
			Runtime.Log("文件测试完成");
			endCall();
		}
	}}
]);
$(".testChoiceFileDec").append($(".choiceFileDec"));
$(".testChoiceFileEnc").append($(".choiceFileEnc"));


//调用录音
var rec;
function recStart(){
	rec=Recorder({
		type:"wav"
		,sampleRate:8000
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
	if(!rec){
		Runtime.Log("未开始录音",1);
		return;
	}
	rec.stop(function(blob,duration){
		Runtime.LogAudio(blob,duration,rec);
		
		test(Recorder.SampleData(rec.buffers,rec.srcSampleRate,rec.srcSampleRate).data,rec.srcSampleRate);
	},function(msg){
		Runtime.Log("录音失败:"+msg, 1);
	},true);
};



var test=function(pcm,sampleRate){
	console.log(new Uint8Array(pcm.buffer));
	var run=function(type){
		var rec=Recorder({type:type});
		rec.mock(pcm,sampleRate);
		rec.stop(function(blob,duration){
			Runtime.LogAudio(blob,duration,rec,type);
		});
	}
	var rec=Recorder({type:"wav",sampleRate:16000});
	rec.mock(pcm,sampleRate);
	rec.stop(function(blob,duration){
		Runtime.LogAudio(blob,duration,rec,"wav16k");
		
		rec=Recorder({type:"wav",sampleRate:8000,bitRate:8});
		rec.mock(pcm,sampleRate);
		rec.stop(function(blob,duration){
			Runtime.LogAudio(blob,duration,rec,"wav8k8");
			
			rec=Recorder({type:"wav",sampleRate:8000});
			rec.mock(pcm,sampleRate);
			rec.stop(function(blob,duration){
				Runtime.LogAudio(blob,duration,rec,"wav8k");
				
				//run("g711a_1");
				//run("g711a_2");
				run("g711a");
				run("g711u");
			});
		});
	});
};
Runtime.Log("测试方法：<br>① 拖入或录制wav文件转码成g7xx，下载后用ffmpeg播放试听<br>② ffmpeg生成g7xx文件拖入页面播放进行解码测试");
//test(new Int16Array([0x1000,0x6000,0x60,0x7000,0x3000,-0x60,-0x7000,-0x3000].concat(new Array(992))),8000);
