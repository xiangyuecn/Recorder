/******************
《【测试】PCM采样率转换测试》
作者：高坚果
时间：2020-1-9 20:48  更新：2024-9-21 11:12

老版本的Recorder.SampleData只提供降低采样率，未提供提升采样率，新版本已提供，本代码当前只用于采样率转换测试用。

老版本代码中提供的 SampleRaise 测试方法，此方法将简单的提升pcm的采样率，如果新采样率低于pcm采样率，将不会进行任何处理。采用的简单算法能力有限，会引入能感知到的轻微杂音（通过低通滤波后不明显）。

底下引入的第三方的采样率转换代码waveResampler，转换效果大部分情况下非常不错（很慢、且偶尔会出现爆音）；Recorder可以使用它的IIR低通滤波效果也会变得非常好，就是计算量偏大点。
******************/

var SampleRaise=function(pcmDatas,pcmSampleRate,newSampleRate){
	var size=0;
	for(var i=0;i<pcmDatas.length;i++){
		size+=pcmDatas[i].length;
	};
	
	var step=newSampleRate/pcmSampleRate;
	if(step<=1){//新采样不高于pcm采样率不处理
		step=1;
		newSampleRate=pcmSampleRate;
	}else{
		size=Math.floor(size*step);
	};
	
	var filterFn=0;//采样率差距比较大才开启低通滤波，最高频率用新采样率频率的3/4
	if(pcmSampleRate<=newSampleRate*3/4){
		filterFn=Recorder.IIRFilter(true,newSampleRate,pcmSampleRate/2 *3/4);
	};
	
	var res=new Int16Array(size);
	
	//处理数据
	var posFloat=0,prev=0;
	var F=filterFn&&filterFn.Embed,Fx=0,Fy=0;//低通滤波后的数据
	for (var index=0,nl=pcmDatas.length;index<nl;index++) {
		var arr=pcmDatas[index];
		for(var i=0;i<arr.length;i++){
			var cur=arr[i];
			
			var pos=Math.floor(posFloat);
			posFloat+=step;
			var end=Math.floor(posFloat);
			
			//简单的从prev平滑填充到cur，有效减少转换引入的杂音
			var n=(cur-prev)/(end-pos);
			for(var j=1;pos<end;pos++,j++){
				//res[pos]=cur;
				var s=Math.floor(prev+(j*n));
				if(F){//IIRFilter代码内置，比函数调用快4倍
					Fx=s;
					Fy=F.b0 * Fx + F.b1 * F.x1 + F.b0 * F.x2 - F.a1 * F.y1 - F.a2 * F.y2;
					F.x2 = F.x1; F.x1 = Fx; F.y2 = F.y1; F.y1 = Fy;
					s=Fy;
				}else{ s=filterFn?filterFn(s):s; }
				
				if(s>0x7FFF) s=0x7FFF; else if(s<-0x8000) s=-0x8000; //Int16越界处理
				res[pos]=s;
			};
			
			prev=cur;
		};
	};
	
	return {
		sampleRate:newSampleRate
		,data:res
	};
};



//************测试************
var callExec=function(impl,pcm,pcmSR,newSR){
	if(impl=="sd"){
		return Recorder.SampleData([pcm],pcmSR,newSR,{filter:sdFilter(pcmSR,newSR)}).data;
	}
	if(impl=="sr"){
		if(newSR<=pcmSR){
			return Recorder.SampleData([pcm],pcmSR,newSR,{filter:sdFilter(pcmSR,newSR)}).data;
		}
		return SampleRaise([pcm],pcmSR,newSR).data;
	}
	if(impl=="rs"){
		var arr=waveResampler.resample(pcm,pcmSR,newSR,Object.assign({},waveResamplerConfig));
		var arr2=new Int16Array(arr.length);
		for(var i=0;i<arr.length;i++) arr2[i]=Math.max(-0x8000, Math.min(0x7FFF, arr[i]));
		return arr2;
	}
	throw new Error("未知testImpl="+impl);
};

var sampleRaiseInfo=window.sampleRaiseInfo||{from:16000,to:44100};
var transform=function(buffers,sampleRate){
	initSet();
	sampleRaiseInfo.buffers=buffers;
	sampleRaiseInfo.sampleRate=sampleRate;
	if(!buffers){
		Runtime.Log("请先录个音",1);
		return;
	};
	var from=sampleRaiseInfo.from;
	var to=sampleRaiseInfo.to;
	
	//准备低采样率数据
	var len=0; for(var i=0;i<buffers.length;i++)len+=buffers[i].length;
	var pcm=new Int16Array(len);
	for(var i=0,n=0;i<buffers.length;i++){ pcm.set(buffers[i],n);n+=buffers[i].length; }
	var pcmFrom=callExec(testImplA,pcm,sampleRate,from);
	
	//转换成高采样率
	var pcmTo=callExec(testImplB,pcmFrom,from,to);
	
	var mockFrom=Recorder({type:"wav",sampleRate:from}).mock(pcmFrom,from);
	mockFrom.stop(function(blob1,duration1){
		
		var mockTo=Recorder({type:"wav",sampleRate:to}).mock(pcmTo,to);
		mockTo.stop(function(blob2,duration2){
			Runtime.Log(sampleRate+"-("+testNameA+")->"+from+"-("+testNameB+")->"+to,2);
			
			Runtime.LogAudio(blob1,duration1,mockFrom,"低采样");
			Runtime.LogAudio(blob2,duration2,mockTo,"高采样");
		});
		
	});
};
var k8k16=function(){
	sampleRaiseInfo.from=8000;
	sampleRaiseInfo.to=16000;
	
	transform(sampleRaiseInfo.buffers,sampleRaiseInfo.sampleRate);
};
var k16k441=function(){
	sampleRaiseInfo.from=16000;
	sampleRaiseInfo.to=44100;
	
	transform(sampleRaiseInfo.buffers,sampleRaiseInfo.sampleRate);
};

//循环转换采样率测试
var loopTest=function(useRnd){
	initSet();
	var pcms=sampleRaiseInfo.buffers;
	var pcmSR=sampleRaiseInfo.sampleRate;
	if(!pcms){
		Runtime.Log("请先录个音",1);
		return;
	};
	if(useRnd && (!/^SampleData/.test(testNameA) || !/^SampleData/.test(testNameB))){
		Runtime.Log("分块测试仅支持Recorder.SampleData，可搭配waveResampler的IIR低通滤波",1);
		return;
	};
	var cls=("a"+Math.random()).replace(".","");
	Runtime.Log("执行"+testLoopNum+'次'+(useRnd?'分块':'整块')+'循环互转... <span class="'+cls+'"></span>',"#aaa");
	Runtime.Log(pcmSR+"-(SampleData)->16000<-("+testNameA+")-("+testNameB+")->44100","#aaa");
	
	//先转16k
	var pcm16k=Recorder.SampleData(pcms,pcmSR,16000).data;
	var mockRec=Recorder({type:"wav",sampleRate:16000}).mock(pcm16k,16000);
	mockRec.stop(function(blob,duration){
		Runtime.LogAudio(blob,duration,mockRec,"原始16k");
	});
	
	var pcm=pcm16k,count=0,t1=Date.now();
	var run=function(){
		count++;
		$("."+cls).html(count+"/"+testLoopNum);
		if(useRnd){
			pcm=rndChunkTest(pcm,16000,44100);
			pcm=rndChunkTest(pcm,44100,16000);
		}else{
			pcm=callExec(testImplB,pcm,16000,44100);
			pcm=callExec(testImplA,pcm,44100,16000);
		}
		
		if(count<testLoopNum){ setTimeout(run); return; }
		//结束
		var msg="测试完成，耗时"+(Date.now()-t1)+"ms";
		var mockRec=Recorder({type:"wav",sampleRate:16000}).mock(pcm,16000);
		mockRec.stop(function(blob,duration){
			Runtime.LogAudio(blob,duration,mockRec,"结果16k");
			Runtime.Log(msg,"#aaa");
		},function(err){
			Runtime.Log(err,1);
			Runtime.Log(msg,"#aaa");
		});
	};
	run();
};
//随机分段转换采样率
var rndChunkTest=function(pcm,pcmSR,newSR){
	var size=~~(pcmSR/15+pcmSR/15*Math.random());
	console.log("分块信息 sr:"+pcmSR+" len:"+pcm.length+" / ", size, " = ", Math.ceil(pcm.length/size));
	var chunk={filter:sdFilter(pcmSR,newSR)};
	var arr=new Int16Array(0);
	for(var i=0;i<pcm.length;){
		var pcm2=new Int16Array(pcm.subarray(i, i+size));
		i+=pcm2.length;
		
		chunk.index=0;
		chunk=Recorder.SampleData([pcm2],pcmSR,newSR,chunk);
		
		var tmp=new Int16Array(arr.length+chunk.data.length);
		tmp.set(arr);
		tmp.set(chunk.data, arr.length);
		arr=tmp;
	}
	return arr;
};




//******音频数据源，采集原始音频用的******
//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
]);

//显示控制按钮
Runtime.Ctrls([
	{html:'<div><label><input class="in_sdFilterUse" type="checkbox">Recorder.SampleData使用waveResampler的IIR低通滤波</label></div>'}
	,{html:'<div style="padding-top:5px">降采样率实现: '
		+'<label><input class="in_implA_sd" name="in_implA" type="radio" checked>Recorder.SampleData</label>'
		+'<label><input class="in_implA_rs" name="in_implA" type="radio">第三方waveResampler</label>'
		+'</div>'}
	,{html:'<div style="padding-top:5px">升采样率实现: '
		+'<label><input class="in_implB_sd" name="in_implB" type="radio" checked>Recorder.SampleData</label>'
		+'<label><input class="in_implB_rs" name="in_implB" type="radio">第三方waveResampler</label>'
		+'<label><input class="in_implB_sr" name="in_implB" type="radio">上面的SampleRaise</label>'
		+'</div>'}
	,{html:"<hr/>"}
	,{name:"开始录音",click:"recStart"}
	,{name:"结束录音",click:"recStop"}
	,{html:"<hr/>"}
	,{name:"16k和44.1k整块互转",click:"loopTest(0);Date.now"}
	,{name:"分块互转",click:"loopTest(1);Date.now"}
	,{html:'循环<input class="loop_num" value="10" style="width:40px">次，测试转换代码对应音质的影响'}
	,{html:"<hr/>"}
	,{name:"8k转16k",click:"k8k16"}
	,{name:"16k转44.1k",click:"k16k441"}
	
	,{choiceFile:{
		process:function(fileName,arrayBuffer,filesCount,fileIdx,endCall){
			Runtime.DecodeAudio(fileName,arrayBuffer,function(data){
				Runtime.LogAudio(data.srcBlob,data.duration,{set:data},"已解码"+fileName);
				
				rec=null;
				transform([data.data],data.sampleRate);
				
				endCall();
			},function(msg){
				Runtime.Log(msg,1);
				endCall();
			});
		}
	}}
]);
var testImplA,testNameA,testImplB,testNameB,testLoopNum;
var sdFilterUse;
var initSet=function(){
	sdFilterUse=$(".in_sdFilterUse")[0].checked;
	
	testImplA=testNameA=testImplB=testNameB="-";
	var sdName="SampleData"+(sdFilter(16000,8000)?"#IIR":"");
	var rsName="Resampler#"+waveResamplerConfig.method+"#"+(waveResamplerConfig.LPF?"1":"0");
	if($(".in_implA_sd")[0].checked){ testImplA="sd"; testNameA=sdName; }
	if($(".in_implB_sd")[0].checked){ testImplB="sd"; testNameB=sdName; }
	
	if($(".in_implA_rs")[0].checked){ testImplA="rs"; testNameA=rsName; }
	if($(".in_implB_rs")[0].checked){ testImplB="rs"; testNameB=rsName; }
	
	if($(".in_implB_sr")[0].checked){ testImplB="sr"; testNameB="SampleRaise"; }
	
	testLoopNum=+$(".loop_num").val();
};


//调用录音
var rec;
function recStart(){
	rec=Recorder({
		type:"wav"
		,sampleRate:48000
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
		
		transform(rec.buffers,rec.srcSampleRate);
	},function(msg){
		Runtime.Log("录音失败:"+msg, 1);
	},true);
};



//https://github.com/rochars/wave-resampler
//https://unpkg.com/wave-resampler@1.0.0/dist/wave-resampler.js
(function(){
var l=window;
function m(n){function h(a,c,b){for(var d=[],e=0;e<a;e++)d.push(this.b({u:c,s:b,Q:.5/Math.sin(Math.PI/(2*a)*(e+.5))}));this.a=[];for(a=0;a<d.length;a++)this.a[a]={A:d[a].c[0],B:d[a].c[1],C:d[a].c[2],v:d[a].i[0],w:d[a].i[1],k:d[a].k,z:[0,0]}}function k(a,c,b){b=2*Math.PI*b/c;c=0;this.a=[];for(var d=0;d<=a;d++)0===d-a/2?this.a[d]=b:(this.a[d]=Math.sin(b*(d-a/2))/(d-a/2),this.a[d]*=.54-.46*Math.cos(2*Math.PI*d/a)),c+=this.a[d];for(b=0;b<=a;b++)this.a[b]/=c;this.z=this.b()}function g(a,c,b){this.G=a;
this.b=(a-1)/c;this.h=this.D;"point"===b.method?this.h=this.I:"linear"===b.method?this.h=this.H:"sinc"===b.method&&(this.h=this.J);this.K=1-Math.max(0,Math.min(1,b.tension||0));this.l=b.sincFilterSize||1;this.F=t(b.sincWindow||u)}function u(a){return Math.exp(-a/2*a/2)}function t(a){return function(c){return(0===c?1:Math.sin(Math.PI*c)/(Math.PI*c))*a(c)}}function p(a,c,b){for(var d=0,e=c.length;d<e;d++)c[d]=b.h(d,a)}g.prototype.I=function(a,c){return this.a(Math.round(this.b*a),c)};g.prototype.H=
function(a,c){a*=this.b;var b=Math.floor(a);a-=b;return(1-a)*this.a(b,c)+a*this.a(b+1,c)};g.prototype.D=function(a,c){a*=this.b;var b=Math.floor(a),d=[this.j(b,c),this.j(b+1,c)],e=[this.a(b,c),this.a(b+1,c)];a-=b;b=a*a;var f=a*b;return(2*f-3*b+1)*e[0]+(f-2*b+a)*d[0]+(-2*f+3*b)*e[1]+(f-b)*d[1]};g.prototype.J=function(a,c){a*=this.b;var b=Math.floor(a),d=b+this.l,e=0;for(b=b-this.l+1;b<=d;b++)e+=this.F(a-b)*this.a(b,c);return e};g.prototype.j=function(a,c){return this.K*(this.a(a+1,c)-this.a(a-1,c))/
2};g.prototype.a=function(a,c){return 0<=a&&a<this.G?c[a]:0};k.prototype.filter=function(a){this.z.g[this.z.m]=a;for(var c=a=0,b=this.z.g.length;c<b;c++)a+=this.a[c]*this.z.g[(this.z.m+c)%this.z.g.length];this.z.m=(this.z.m+1)%this.z.g.length;return a};k.prototype.reset=function(){this.z=this.b()};k.prototype.b=function(){for(var a=[],c=0;c<this.a.length-1;c++)a.push(0);return{g:a,m:0}};h.prototype.filter=function(a){for(var c=0,b=this.a.length;c<b;c++)a=this.l(c,a);return a};h.prototype.b=function(a){var c=
{z:[0,0],i:[],c:[]};a=this.j(a,c);c.k=1;c.c.push((1-a.o)/(2*a.f));c.c.push(2*c.c[0]);c.c.push(c.c[0]);return c};h.prototype.j=function(a,c){var b={},d=2*Math.PI*a.s/a.u;b.alpha=Math.sin(d)/(2*a.Q);b.o=Math.cos(d);b.f=1+b.alpha;c.f=b.f;c.i.push(-2*b.o/b.f);c.k=1;c.i.push((1-b.alpha)/b.f);return b};h.prototype.l=function(a,c){var b=c*this.a[a].k-this.a[a].v*this.a[a].z[0]-this.a[a].w*this.a[a].z[1],d=this.a[a].A*b+this.a[a].B*this.a[a].z[0]+this.a[a].C*this.a[a].z[1];this.a[a].z[1]=this.a[a].z[0];this.a[a].z[0]=
b;return d};h.prototype.reset=function(){for(var a=0;a<this.a.length;a++)this.a[a].z=[0,0]};var v={point:!1,linear:!1,cubic:!0,sinc:!0},q={IIR:16,FIR:71},w={IIR:h,FIR:k};
n.Filter=w;
n.resample=function(a,c,b,d){d=void 0===d?{}:d;var e=new Float64Array(a.length*((b-c)/c+1));d.method=d.method||"cubic";var f=new g(a.length,e.length,{method:d.method,tension:d.tension||0,sincFilterSize:d.sincFilterSize||6,sincWindow:d.sincWindow||void 0});void 0===d.LPF&&(d.LPF=v[d.method]);if(d.LPF){d.LPFType=d.LPFType||"IIR";var r=
w[d.LPFType];if(b>c){c=new r(d.LPFOrder||q[d.LPFType],b,c/2);b=0;for(d=e.length;b<d;b++)e[b]=c.filter(f.h(b,a));c.reset();for(a=e.length-1;0<=a;a--)e[a]=c.filter(e[a])}else{c=new r(d.LPFOrder||q[d.LPFType],c,b/2);b=0;for(d=a.length;b<d;b++)a[b]=c.filter(a[b]);c.reset();for(b=a.length-1;0<=b;b--)a[b]=c.filter(a[b]);p(a,e,f)}}else p(a,e,f);return e};Object.defineProperty(n,"__esModule",{value:!0})}
"object"===typeof exports&&"undefined"!==typeof module?m(exports):"function"===typeof define&&define.L?define(["exports"],m):(l=l||self,m(l.waveResampler={}));
})();

//可选method: point linear cubic sinc    LPF: 是否开启低通滤波
var waveResamplerConfig={method:"sinc", LPF:true};

//可选覆盖SampleData的filter，waveResampler的IIR低通滤波效果极佳（但计算量偏大点 butterworth-lpf.js）
var sdFilter=function(pcmSR,newSR){
	if(!sdFilterUse)return null;
	var fn=new waveResampler.Filter.IIR(16,Math.max(pcmSR,newSR),Math.min(pcmSR,newSR)/2);
	return {fn:fn.filter.bind(fn)};
}

Runtime.Log("结束录音转换格式以最后点击的哪个为准");