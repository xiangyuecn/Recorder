/*
wav编码器+编码引擎
https://github.com/xiangyuecn/Recorder

当然最佳推荐使用mp3、wav格式，代码也是优先照顾这两种格式
浏览器支持情况
https://developer.mozilla.org/en-US/docs/Web/HTML/Supported_media_formats

编码原理：给pcm数据加上一个44字节的wav头即成wav文件；pcm数据就是Recorder中的buffers原始数据（重新采样），16位时为LE小端模式（Little Endian），实质上是未经过任何编码处理

注意：其他wav编码器可能不是44字节的头，要从任意wav文件中提取pcm数据，请参考：assets/runtime-codes/fragment.decode.wav.js
*/
(function(factory){
	var rec=Object[Object["Recorder-Core-Alias"]||"Recorder-Core-Export"]; //Recorder挂载在Object下面
	if(!rec) throw new Error("Must import recorder-core first");
	factory(rec, rec.i18n.$T, rec.IsBrowser);
}(function(Recorder,$T,isBrowser){
"use strict";

Recorder.prototype.enc_wav={
	stable:true,fast:true
	,getTestMsg:function(){
		return $T("gPSE::支持位数8位、16位（填在比特率里面），采样率取值无限制；此编码器仅在pcm数据前加了一个44字节的wav头，编码出来的16位wav文件去掉开头的44字节即可得到pcm（注：其他wav编码器可能不是44字节）");
	}
};

var NormalizeSet=function(set){
	var bS=set.bitRate,b=bS==8?8:16;
	if(bS!=b) Recorder.CLog($T("wyw9::WAV Info: 不支持{1}位，已更新成{2}位",0,bS,b),3);
	set.bitRate=b;
};

Recorder.prototype.wav=function(res,True,False){
	var This=this,set=This.set;
	
	NormalizeSet(set);
	var size=res.length,sampleRate=set.sampleRate,bitRate=set.bitRate;
	var dataLength=size*(bitRate/8);
	
	//生成wav头
	var header=Recorder.wav_header(1,1,sampleRate,bitRate,dataLength);
	var offset=header.length;
	var bytes=new Uint8Array(offset+dataLength);
	bytes.set(header);
	
	// 写入采样数据
	if(bitRate==8) {
		for(var i=0;i<size;i++) {
			//16转8据说是雷霄骅的 https://blog.csdn.net/sevennight1989/article/details/85376149 细节比blqw的按比例的算法清晰点
			var val=(res[i]>>8)+128;
			bytes[offset++]=val;
		};
	}else{
		bytes=new Int16Array(bytes.buffer);//长度一定是偶数
		bytes.set(res,offset/2);
	};
	
	True(bytes.buffer,"audio/wav");
};

/**
根据参数生成wav文件头，返回Uint8Array（format=1时固定返回44字节，其他返回46字节）
format: 1 (raw pcm) 2 (ADPCM) 3 (IEEE Float) 6 (g711a) 7 (g711u)
numCh: 声道数
dataLength: wav中的音频数据二进制长度
**/
Recorder.wav_header=function(format,numCh,sampleRate,bitRate,dataLength){
	//文件头 http://soundfile.sapp.org/doc/WaveFormat/ https://www.jianshu.com/p/63d7aa88582b https://github.com/mattdiamond/Recorderjs https://www.cnblogs.com/blqw/p/3782420.html https://www.cnblogs.com/xiaoqi/p/6993912.html
	var extSize=format==1?0:2;
	var buffer=new ArrayBuffer(44+extSize);
	var data=new DataView(buffer);
	
	var offset=0;
	var writeString=function(str){
		for (var i=0;i<str.length;i++,offset++) {
			data.setUint8(offset,str.charCodeAt(i));
		};
	};
	var write16=function(v){
		data.setUint16(offset,v,true);
		offset+=2;
	};
	var write32=function(v){
		data.setUint32(offset,v,true);
		offset+=4;
	};
	
	/* RIFF identifier */
	writeString('RIFF');
	/* RIFF chunk length */
	write32(36+extSize+dataLength);
	/* RIFF type */
	writeString('WAVE');
	/* format chunk identifier */
	writeString('fmt ');
	/* format chunk length */
	write32(16+extSize);
	/* audio format */
	write16(format);
	/* channel count */
	write16(numCh);
	/* sample rate */
	write32(sampleRate);
	/* byte rate (sample rate * block align) */
	write32(sampleRate*(numCh*bitRate/8));// *1 声道
	/* block align (channel count * bytes per sample) */
	write16(numCh*bitRate/8);// *1 声道
	/* bits per sample */
	write16(bitRate);
	if(format!=1){// ExtraParamSize 0
		write16(0);
	}
	/* data chunk identifier */
	writeString('data');
	/* data chunk length */
	write32(dataLength);
	
	return new Uint8Array(buffer);
};


/**解码wav得到pcm，16位单声道
wavBlob: wav音频文件blob对象 或 ArrayBuffer，仅支持raw pcm格式的wav，单声道、双声道，8位、16位、24位、和32位浮点数
True(pcm,sampleRate,wavInfo) pcm为Int16Array，16位单声道，采样率为sampleRate
	wavInfo:{
		bitRate:8 16 24 32 //wav文件位数
		numChannels:1 2 //声道数
		dataPos:44 //数据开始位置，等于wav头长度
	}
False(msg)
**/
Recorder.wav_decode=function(wavBlob,True,False){
	var loadOk=function(aBuf){
		//检测wav文件头
		var wavView=new Uint8Array(aBuf);
		var eq=function(p,s){
			for(var i=0;i<s.length;i++){
				if(wavView[p+i]!=s.charCodeAt(i)){
					return false;
				};
			};
			return true;
		};
		var pcm, sampleRate, bitRate, numCh, dataPos;
		if(eq(0,"RIFF")&&eq(8,"WAVEfmt ")){
			numCh=wavView[22]; var isRaw=wavView[20]==1, isFloat=wavView[20]==3;
			if((isRaw||isFloat) && (numCh==1||numCh==2)){//1 raw pcm，3 IEEE Float
				sampleRate=wavView[24]+(wavView[25]<<8)+(wavView[26]<<16)+(wavView[27]<<24);
				bitRate=wavView[34]+(wavView[35]<<8);
				//搜索data块的位置
				dataPos=0; // 44 或有更多块
				for(var i=12,iL=wavView.length-8;i<=iL;){
					if(wavView[i]==100&&wavView[i+1]==97&&wavView[i+2]==116&&wavView[i+3]==97){//eq(i,"data")
						dataPos=i+8;break;
					}
					i+=4;
					i+=4+wavView[i]+(wavView[i+1]<<8)+(wavView[i+2]<<16)+(wavView[i+3]<<24);
				}
				if(dataPos){
					var wLen=wavView.length-dataPos;
					if(isRaw && bitRate==16){
						pcm=new Int16Array(wavView.buffer.slice(dataPos));
					}else if(isRaw && bitRate==8){ //8位转成16位
						pcm=new Int16Array(wLen);
						for(var j=dataPos,d=0,L=wavView.length;j<L;j++,d++){
							var b=wavView[j];
							pcm[d]=(b-128)<<8;
						};
					}else if(isRaw && bitRate==24){ //24bit pcm转成浮点数
						pcm=new Int16Array(wLen/3);
						for(var j=dataPos,d=0,L=wavView.length;j<L;){
							var n=((wavView[j++] | (wavView[j++]<<8) | (wavView[j++]<<16))<<8)>>8;
							n=n/16777216;
							pcm[d++]=n<0?n*0x8000:n*0x7FFF; //浮点数转成16位
						};
					}else if(isFloat && bitRate==32){
						var f32=new Float32Array(wavView.buffer.slice(dataPos,dataPos+(wLen-wLen%4)));
						pcm=new Int16Array(f32.length);
						for(var j=0,L=f32.length;j<L;j++){//floatTo16BitPCM 
							var s=Math.max(-1,Math.min(1,f32[j]));
							s=s<0?s*0x8000:s*0x7FFF;
							pcm[j]=s;
						};
					}
				};
				if(pcm && numCh==2){//双声道简单转单声道
					var pcm1=new Int16Array(pcm.length/2);
					for(var i=0,L=pcm1.length;i<L;i++){
						pcm1[i]=(pcm[i*2]+pcm[i*2+1])/2;
					}
					pcm=pcm1;
				};
			};
		};
		if(!pcm){
			False&&False($T("jXp3::非单或双声道wav raw pcm格式wav，不支持解码"));
			return;
		};
		True&&True(pcm,sampleRate,{ bitRate:bitRate, numChannels:numCh, dataPos:dataPos });
	};
	
	if(wavBlob instanceof ArrayBuffer){
		loadOk(wavBlob);
	}else{
		var reader=new FileReader();
		reader.onloadend=function(){
			loadOk(reader.result);
		};
		reader.readAsArrayBuffer(wavBlob);
	};
};

}));