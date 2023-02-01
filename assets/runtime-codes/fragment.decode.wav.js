/******************
《【Demo库】WAV文件解码》
作者：高坚果
时间：2023-01-11 16:37

文档：
DemoFragment.DecodeWav(u8arr)
		u8arr: wav的二进制数据Uint8Array
		返回：{
			pcm:[Int16,...] 解码出来的pcm数据Int16Array
			sampleRate:16000 wav的采样率，也是pcm的采样率
			duration:123 时长
			
			bitRate:16 wav的位数，注意：pcm固定16位
			numChannels:1 wav的声道数，注意：pcm固定单声道
		}
		解码失败会抛异常
******************/
(
window.DemoFragment||(window.DemoFragment={})
).DecodeWav=function(u8arr){
	var eq=function(p,s){
		for(var i=0;i<s.length;i++){
			if(u8arr[p+i]!=s.charCodeAt(i)){
				return false;
			};
		};
		return true;
	};
	if(eq(0,"RIFF")&&eq(8,"WAVEfmt ")){
		var numCh=u8arr[22];
		if(u8arr[20]==1 && (numCh==1||numCh==2)){//raw pcm
			var sampleRate=u8arr[24]+(u8arr[25]<<8)+(u8arr[26]<<16)+(u8arr[27]<<24);
			var bitRate=u8arr[34]+(u8arr[35]<<8);
			
			//搜索data块的位置
			var dataPos=0; // 44 或有更多块
			for(var i=12,iL=u8arr.length-4;i<iL;){
				if(u8arr[i]==100&&u8arr[i+1]==97&&u8arr[i+2]==116&&u8arr[i+3]==97){//eq(i,"data")
					dataPos=i+8;break;
				}
				i+=4;
				i+=4+u8arr[i]+(u8arr[i+1]<<8)+(u8arr[i+2]<<16)+(u8arr[i+3]<<24);
			}
			if(!dataPos){
				throw new Error("未找到wav的data块");
			}
			
			//统一转成16位
			if(bitRate==16){
				var pcm=new Int16Array(u8arr.buffer.slice(dataPos));
			}else if(bitRate==8){//8位转成16位
				var pcm=new Int16Array(u8arr.length-dataPos);
				for(var i=dataPos,j=0;j<pcm.length;i++,j++){
					pcm[j]=(u8arr[i]-128)<<8;
				};
			}else{
				throw new Error("只支持8位或16位的wav格式");
			}
			//转成单声道
			if(numCh==2){
				var pcm1=new Int16Array(pcm.length/2);
				for(var i=0;i<pcm1.length;i++){
					pcm1[i]=pcm[i*2];
				}
				pcm=pcm1;
			}
			var duration=Math.round(pcm.length/sampleRate*1000);
			
			console.log("DecodeWav",sampleRate,bitRate,numCh
				,pcm.length
				,duration+"ms @"+dataPos);
			return {
				pcm:pcm
				,duration:duration
				,sampleRate:sampleRate
				,bitRate:bitRate
				,numChannels:numCh
			};
		};
		throw new Error("只支持单声道或双声道wav格式");
	};
	throw new Error("非wav格式音频");
};