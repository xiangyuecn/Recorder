/******************
《【测试】【信号处理】FFT频域分析ECharts频谱曲线图》
作者：高坚果
时间：2023-02-16 21:58

综合测试 extensions/lib.fft.js dsp.lib.fft_exact.js AudioContext.createAnalyser FFT结果

对于测试音频，尽量选用有特定频率的声音，比如：频率发生器、乐器、特定频率噪音的声音，就能看到有规律的频谱曲线图，进而分析提取特征
******************/

//=====测试代码==================
//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
	,{url:RootFolder+"/assets/runtime-codes/fragment.decode.wav.js",check:function(){return !window.DemoFragment||!DemoFragment.DecodeWav}}//引入DemoFragment.DecodeWav
	
	,{url:RootFolder+"/src/extensions/lib.fft.js",check:function(){return !Recorder.LibFFT}}//LibFFT
	,{url:RootFolder+"/assets/runtime-codes/dsp.lib.fft_exact.js",check:function(){return !Recorder.LibFFT_Exact}}//LibFFT_Exact
]);

//显示控制按钮
Runtime.Ctrls([
	{html:'<hr /> <div class="testChoiceFile"></div>'}
	,{name:"或录一段音作为素材",click:"srcStart"}
	,{name:"结束素材录音",click:"srcStop"}
	,{html:`<hr /> <style>.main{max-width:unset}</style>
<div>
	<div>fftSize：<input value="256" class="in_fftSize" style="width:60px">，取值2的n次方，不同时长的信号需要使用不同的fftSize+sampleRate组合才能分辨出来</div>
	<div>sampleRate：<input value="4000" class="in_sampleRate" style="width:60px">，fft计算数据的采样率，决定了fft结果能识别到的最大频率</div>
	<div style="color:#999;padding-left:50px">
		每次fft转换出来的结果长度为fftSize/2；
		fftSize越大识别的频率精度越高，但每次计算需要的pcm长度越长，越难识别时长很短的信号，每次的计算量也会很大；
		fftSize越小识别的频率精度越低，越能识别时长很短的信号，每次的计算量也会越小。
		<br>结果中每位元素对应的频率是固定的，频率范围0~sampleRate/2Hz(Max)，每位的频率均分(Avg)计算，最后一位的频率为(Max-Avg)~Max。
		<br>结果每位的值为此频率的信号强度，越大代表这个频率的声音越大。
	</div>
	<hr />
	<div>滑动窗口大小：1/<input value="4" class="in_windowN" style="width:60px">，fft计算时，每次前进fftSize/n个采样，通过滑动窗口可避免漏掉信号</div>
	<div>只显示频率：<input value="" placeholder="all" class="in_showFreqs" style="width:300px">Hz，多个用逗号隔开，支持'110-150,200-900'范围写法，为空显示fft结果中所有频率数据</div>
	<hr />
	<div>截取起始时间：<input placeholder="0" class="in_subA" style="width:60px">ms，为0时从头开始计算</div>
	<div>截取结束时间：<input placeholder="0" class="in_subB" style="width:60px">ms，为0时计算到结尾，时长不要过长，不然绘图性能感人</div>
	<hr />
	<div>结果类型：
		<label><input type="radio" name="in_res" class="in_res_raw" checked>原始值（信号峰值明显）</label>
		<label><input type="radio" name="in_res" class="in_res_dB">dB（信号峰值不明显）</label>
	</div>
	<div>结果绘制：
		<label><input type="checkbox" class="in_draw_Exact" checked>dsp.lib.fft_exact.js</label>
		<label><input type="checkbox" class="in_draw_Fast">extensions/lib.fft.js(频率不大准)</label>
		<label><input type="checkbox" class="in_draw_Analyser">AudioContext.createAnalyser(浏览器接口，不可移植)</label>
		<label><input type="checkbox" class="in_draw_addPcm">叠加PCM峰值</label>
	</div>
	<hr />
</div>`}
	,{name:"调用FFT计算绘图",click:"test"}
	,{name:"清除曲线图",click:"clearScopes"}
	
	,{choiceFile:{multiple:false,title:"解码",
		process:function(fileName,arrayBuffer,filesCount,fileIdx,endCall){
			if(/\.wav$/i.test(fileName)){
				try{
					var data=DemoFragment.DecodeWav(new Uint8Array(arrayBuffer));
				}catch(e){
					Runtime.Log(fileName+"解码失败："+e.message,1);
					return endCall();
				}
				setPcmData({pcm:data.pcm,sampleRate:data.sampleRate});
				return endCall();
			}
			Runtime.DecodeAudio(fileName,arrayBuffer,function(data){
				setPcmData({pcm:data.data,sampleRate:data.sampleRate});
				
				endCall();
			},function(msg){
				Runtime.Log(msg,1);
				endCall();
			});
		}
	}}
]);

//加载echarts
var loadEcharts=function(end){
	var npm="echarts@5.4.1/dist/echarts.min.js";
	var load=function(cdn,url){
		if(window.echarts){ return end(); }
		
		var tips="正在从CDN:"+cdn+"加载echarts.min.js，请稍后...";
		console.log(tips); Runtime.Log(tips);
		var elem=document.createElement("script");
		elem.setAttribute("type","text/javascript");
		elem.setAttribute("src",url);
		elem.onload=function(){
			if(window.echarts){
				var tips="从CDN:"+cdn+"加载echarts.min.js 完成";
				console.log(tips); Runtime.Log(tips,2);
				return end();
			}
			Runtime.Log("echarts对象不存在，无法绘图",1);
		};
		elem.onerror=function(e){
			if(cdn=="unpkg"){
				load("jsdelivr","https://cdn.jsdelivr.net/npm/"+npm);
			}else{
				Runtime.Log("echarts加载失败，无法绘图",1);
			}
		};
		document.body.appendChild(elem);
	};
	load("unpkg","https://unpkg.com/"+npm);
};

//调用录音
var srcRec;
function srcStart(){
	srcRec&&srcRec.close();
	
	srcRec=Recorder({
		type:"wav"
		,sampleRate:16000
		,bitRate:16
		,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate,newBufferIdx){
			Runtime.Process.apply(null,arguments);
			//在这里支持实时进行FFT计算
		}
	});
	var t=setTimeout(function(){
		Runtime.Log("无法录音：权限请求被忽略（超时假装手动点击了确认对话框）",1);
	},8000);
	
	srcRec.open(function(){//打开麦克风授权获得相关资源
		clearTimeout(t);
		srcRec.start();//开始录音
	},function(msg,isUserNotAllow){//用户拒绝未授权或不支持
		clearTimeout(t);
		Runtime.Log((isUserNotAllow?"UserNotAllow，":"")+"无法录音:"+msg, 1);
	});
};
function srcStop(){
	if(!srcRec){
		Runtime.Log("未开始素材录音",1);
		return;
	}
	srcRec.stop(function(blob,duration){
		setPcmData({//不要blob，直接取录制的pcm数据
			pcm:Recorder.SampleData(srcRec.buffers,srcRec.srcSampleRate,srcRec.srcSampleRate).data
			,sampleRate:srcRec.srcSampleRate
			,isRec:true
		})
	},function(msg){
		Runtime.Log("录音失败:"+msg, 1);
	},true);
};

//设置待转换的pcm数据
$(".testChoiceFile").append($(".RuntimeChoiceFileBox"));
var pcmData;
var setPcmData=function(data){
	pcmData=data;
	$(".maxHz").html("最高"+(data.sampleRate/2)+"Hz");
	$(".maxSampleRate").html("最大"+data.sampleRate);
	
	var rec=Recorder({
		type:"wav",bitRate:16,sampleRate:data.sampleRate
	}).mock(data.pcm,data.sampleRate);
	rec.stop(function(blob,duration){
		Runtime.LogAudio(blob,duration,rec,data.isRec?"":"文件解码成功");
		Runtime.Log("pcm数据已准备好，可以开始FFT计算了，pcm.sampleRate="+data.sampleRate,2);
	});
};


var KeyFast="extensions/lib.fft.js",KeyExact="dsp.lib.fft_exact.js",KeyAnalyser="AudioContext.createAnalyser";
var KeysTxt={}; KeysTxt[KeyFast]="KeyFast";
KeysTxt[KeyExact]="KeyExact"; KeysTxt[KeyAnalyser]="KeyAnalyser";
var Keys=[KeyFast,KeyExact,KeyAnalyser];
var testScopes=[];
var clearScopes=function(){
	for(var n=0;n<testScopes.length;n++){
		for(var i=0;i<Keys.length;i++){
			var item=testScopes[n][Keys[i]];
			if(item.chart)item.chart.dispose();
		}
	}
	testScopes=[];
	$(".echartsBox").remove();
	testSyncID++;
};
var testSyncID=0;

//调用测试
var test=function(){
	if(!pcmData){
		Runtime.Log("请先录个素材或拖一个文件进来解码",1);
		return;
	}
	var srcSampleRate=pcmData.sampleRate;
	var fftSize=+$(".in_fftSize").val()||0;
	var fftSampleRate=+$(".in_sampleRate").val()||0;
	var windowN=+$(".in_windowN").val()||0;
	var showFreqs=$(".in_showFreqs").val()
			.replace(/(\d+)\-(\d+)/g,function(v,a,b){
				a=+a;b=+b; var s="";for(;a<=b;a++)s+=(s?',':'')+a; return s; })
			.replace(/[^\d]+/g,",");
	var subA=+$(".in_subA").val()||0;
	var subB=+$(".in_subB").val()||0;
	var useResRaw=$(".in_res_raw")[0].checked;
	var drawFast=$(".in_draw_Fast")[0].checked;
	var drawExact=$(".in_draw_Exact")[0].checked;
	var drawAnalyser=$(".in_draw_Analyser")[0].checked;
	var drawAddPcm=$(".in_draw_addPcm")[0].checked;
	
	var N=Math.round(Math.log(fftSize)/Math.log(2));
	if(!fftSize || fftSize!=Math.pow(2,N)){
		Runtime.Log("fftSize必须是2的n次方",1);
		return;
	}
	if(fftSampleRate<100 || fftSampleRate>srcSampleRate){
		Runtime.Log("sampleRate不能小于100，不能超过"+srcSampleRate,1);
		return;
	}
	if(windowN<1 || windowN>10 || windowN!=~~windowN){
		Runtime.Log("滑动窗口大小取值1-10，整数",1);
		return;
	}
	var windowSize=fftSize;
	var windowStep=~~(windowSize/windowN);
	
	//生成汉宁窗，降低矩形窗边缘的信号泄露影响
	var windowHann=[];
	for(var i=0;i<windowSize;i++){
		windowHann[i]=0.5-0.5*Math.cos(2*Math.PI*i/(windowSize-1));
	}
	
	//初始化数据
	var syncID=++testSyncID;
	Runtime.Log("正在计算... syncID="+syncID);
	var scope={}; testScopes.push(scope);
	for(var i=0;i<Keys.length;i++){
		var obj={key:Keys[i],offset:0,fftDatas:[],fftTimes:[],fftMax:0,pcmMaxs:[]};
		scope[Keys[i]]=obj;
		for(var j=0;j<fftSize/2;j++){
			obj.fftDatas.push([]);
		}
	}
	var fftFast=Recorder.LibFFT(fftSize);
	var fftExact=Recorder.LibFFT_Exact(fftSize);
	var hz0=fftSampleRate/fftSize;
	
	//转换需要显示的频率
	var arr1=[],arr2=showFreqs.split(",");
	for(var i=0;i<arr2.length;i++){
		var v=arr2[i];if(v){ v=+v; var v0=v/hz0;
			var v1=Math.round(hz0*Math.floor(v0)),v2=Math.round(hz0*Math.ceil(v0));
			v=v-v1>v2-v?v2:v1; if(arr1.indexOf(v)==-1)arr1.push(v);
		}
	}
	showFreqs=arr1.join(","); showFreqs&&console.log("showFreqs", showFreqs);
	
	//转换pcm的采样率到计算需要的采样率
	var buffer=Recorder.SampleData([pcmData.pcm],pcmData.sampleRate,fftSampleRate).data;
	if(subB<1)subB=Math.round(buffer.length/fftSampleRate*1000);
	
	
	//=============加载echarts绘图==============
	var isLoadEcharts=false;
	loadEcharts(function(){
		isLoadEcharts=true;
		for(var i=0;i<Keys.length;i++){
			var fn=scope[Keys[i]].onLoadEcharts;
			fn&&fn();
		}
	});
	//绘图
	var draw=function(key){
		if(syncID!=testSyncID){ Runtime.Log(key+" abort syncID="+syncID,"#fa0");return;}
		var item=scope[key],cls=KeysTxt[key]+syncID;
		var height=~~($(window).height()*0.7);
		
		Runtime.Log(`<span class="${cls}_title">${key}</span>
<div class="echartsBox">
	<div class="${cls}_chart" style="height:${height}px"></div>
	<hr />
</div>`);

var xArr=[],series=[];
for(var i=0;i<item.fftTimes.length;i++){
	xArr.push(item.fftTimes[i]);
}
var pcmMaxsName="PCM峰值",pcmMaxVals=[];
if(drawAddPcm){//叠加pcm峰值
	var arr=[],max=0;
	for(var i=0;i<item.pcmMaxs.length;i++) max=Math.max(max,item.pcmMaxs[i]);
	for(var i=0;i<item.pcmMaxs.length;i++){
		var v0=item.pcmMaxs[i],v=v0;
		if(item.fftMax && max<item.fftMax)//将值映射到fft的最大值，不然值太小看不见
			v=v*item.fftMax/max+item.fftMax*0.2;
		arr.push(Math.round(useResRaw?v:Math.max(-60, v-100)));
		pcmMaxVals.push(Math.round(useResRaw?v0:Math.max(-60, v0-100))+(useResRaw?"":"dB")) }
	series.push({name:pcmMaxsName, type: 'line', data:arr});
}
for(var i=0;i<item.fftDatas.length;i++){
	var arr0=item.fftDatas[i],arr=arr0;
	var hz=Math.round(i*hz0);
	if(!showFreqs || (","+showFreqs+",").indexOf(","+hz+",")+1){
		if(!useResRaw){ arr=[];
			for(var j=0,L=arr0.length;j<L;j++){
				arr[j]=Math.max(-60, arr0[j]-100);
			}}
		series.push({name:(i+1)+"| "+hz+"Hz", type: 'line', data:arr});
	}
}
var option={
	tooltip: { trigger: 'axis',formatter:function(arr){
			var vals=[]; for(var i=0;i<arr.length;i++){
				var o=arr[i];if(o.data){ var v=o.data,d=o.data;
					if(o.seriesName==pcmMaxsName){ v=1e99; d=pcmMaxVals[o.dataIndex] }
					vals.push({v:v,s:o.marker+o.seriesName+": "+d});
				}
			}; vals.sort((a,b)=>b.v-a.v); i=-1;
			if(vals.length>4+ 28+7)vals=[].concat(vals.slice(0,28)
				,[{s:"已折叠"+(vals.length-28-7)+"个数据"}],vals.slice(vals.length-7));
			vals=vals.map(a=>{i++;return "<i "+(i%4)+"></i>"+a.s;});
			vals.splice(0,0,arr[0].axisValue+"ms处的频域数据，由大到小排列，0值未显示");
			if(vals.length<10){ return vals.join("<br>") }
			return vals.join(" ").replace(/<i 0.+?>/g,'<br>');
		} },
	dataZoom: [ { type: 'inside' }, { type: 'slider' }, { yAxisIndex: 0,filterMode:"none" } ],
	xAxis: { type: 'category', data: xArr },
	yAxis: { type: 'value' },
	series: series
};
		var chart=echarts.init($("."+cls+"_chart")[0]);
		item.chart=chart;
		
		item.drawStart=Date.now();
		chart.setOption(option);
		item.drawEnd=Date.now();
		
		$("."+cls+"_title").html(key+' ['+(useResRaw?'原始值':'dB')+']'
			+' <span style="margin-left:30px">频率精度: '+hz0.toFixed(2)+'Hz 最大频率: '+(fftSampleRate/2)+'Hz</span>'
			+' <span style="margin-left:30px">fftSize: '+fftSize+'('+Math.round(fftSize/fftSampleRate*1000)+'ms)'
				+' 滑动窗口: '+windowStep+'('+Math.round(windowStep/fftSampleRate*1000)+'ms)</span>'
			+' <span style="margin-left:30px">截取范围: '+subA+'ms-'+subB+'ms 共'+(subB-subA)+'ms</span>'
			+'<br>'
			+' <span style="margin-left:30px">计算耗时: '+(item.endTime-item.startTime)+'ms</span>'
			+' <span style="margin-left:30px">绘制耗时: '+(item.drawEnd-item.drawStart)+'ms</span>'
		);
	};
	
	
	//========循环提取窗口大小的数据，进行滑动处理=========
	var processWindow=function(key){
		if(syncID!=testSyncID){ Runtime.Log(key+" abort syncID="+syncID,"#fa0");return;}
		var item=scope[key]; item.pn=(item.pn||0)+1;
		if(item.pn%100==0)return setTimeout(function(){ processWindow(key) });//跳出递归
		
		if(!item.startTime){
			item.startTime=Date.now();
			Runtime.Log(key+" 正在计算...");
		}
		if(item.offset+windowSize>=buffer.length){
			//全部处理完成，开始绘图
			item.endTime=Date.now();
			item.onLoadEcharts=function(){
				item.onLoadEcharts=null;
				setTimeout(function(){ draw(key) });
			};
			if(isLoadEcharts){
				item.onLoadEcharts();
			}else{
				Runtime.Log(key+" 计算完成，等待绘图...");
			}
			return;
		}
		var offset=item.offset;
		item.offset+=windowStep;//滑动一段距离
		
		//所在位置和时间计算
		var time=Math.round((offset+windowStep/2)/fftSampleRate*1000);
		if(time<subA || time>subB){
			return processWindow(key);
		}
		item.fftTimes.push(time);
		
		//提取窗口内的pcm数据
		var pcm=new Int16Array(windowSize),maxVal=0,maxA=(windowSize-windowStep)/2,maxB=maxA+windowStep;
		for(var i=0;i<pcm.length;i++){
			var s=buffer[offset++];
			s*=windowHann[i]; //使用汉宁窗滤波，虽然会降低信号强度，信号边缘更清晰，不滤波两个很近的信号不容易区分
			pcm[i]=s;
			if(i>=maxA && i<=maxB) //取中间的
				maxVal=Math.max(maxVal,s);
		}
		if(useResRaw){
			item.pcmMaxs.push(maxVal);
		}else{
			item.pcmMaxs.push(100+20*Math.log10(Math.max(0.327,maxVal)/0x7FFF));
		}
		
		//处理频域数据
		var analysis=function(freqsData){
			for(var i=0;i<fftSize/2;i++){
				var v=freqsData[i];
				if(key==KeyFast) v=Math.sqrt(v)*2; //LibFFT是输出模的平方
				if(!useResRaw){//转成dB
					v=v/fftSize*4; //测试得出的，比较接近0x7FFF
					v=Math.min(v, 0x7FFF);
					v=100+20*Math.log10(Math.max(0.327,v)/0x7FFF);
				}
				v=Math.round(v);
				item.fftDatas[i].push(v);
				item.fftMax=Math.max(item.fftMax,v);
			}
			//...这里可以做些实时分析
			//下一个窗口
			processWindow(key);
		};
		
		if(key==KeyFast){
			analysis(fftFast.transform(pcm));
		}else if(key==KeyExact){
			analysis(fftExact.transform(pcm));
		}else if(key==KeyAnalyser){
			analyserProcess(pcm,function(freqsData){
				analysis(freqsData);
			});
		}
	};
	
	if(drawFast)processWindow(KeyFast);
	if(drawExact)processWindow(KeyExact);
	
	
	//AudioContext.createAnalyser 延迟一下操作，等前面两个绘制完成了在计算
	while(drawAnalyser){
		//浏览器接口，这些代码无法移植，尝试把结果转换成和LibFFT一样
		var analyserCtx;
		var createAnalyserCtx=function(size){
			try{
				analyserCtx=new OfflineAudioContext(1,size,fftSampleRate);
			}catch(e){
				Runtime.Log(KeyAnalyser+" 的OfflineAudioContext无法创建，可能是设置的采样率"+fftSampleRate+"过低此浏览器不支持："+e.message,1);
				return;
			}
			if(analyserCtx.sampleRate!=fftSampleRate){
				Runtime.Log(KeyAnalyser+" 的OfflineAudioContext.sampleRate="+analyserCtx.sampleRate+"和设置的"+fftSampleRate+"不一致，不知道怎么调用计算，请尝试设置高一点的采样率",1);
				return;
			}
			return analyserCtx;
		}
		if(!createAnalyserCtx(fftSampleRate))break;
		
		var analyserProcess=function(pcm,call){
			createAnalyserCtx(pcm.length);
			
			var buffer=analyserCtx.createBuffer(1,pcm.length,fftSampleRate);
			var arr=buffer.getChannelData(0);
			for(var i=0,L=pcm.length;i<L;i++) arr[i]=pcm[i]/0x7FFF;
			
			var analyserNode=analyserCtx.createAnalyser();
			analyserNode.fftSize=fftSize;
			analyserNode.maxDecibels=0;
			analyserNode.minDecibels=-91; //20*Math.log10(1/0x7FFF)
			analyserNode.connect(analyserCtx.destination);
			var analyserSource=analyserCtx.createBufferSource();
			analyserSource.connect(analyserNode);
			analyserSource.buffer=buffer;
			analyserSource.start();
			
			analyserCtx.startRendering().then(function(){
				var dBArr=new Uint8Array(fftSize/2);
				analyserNode.getByteFrequencyData(dBArr); //float的不知道是什么值
				//dBFS转回幅值
				var arr=new Float64Array(dBArr.length);
				for(var i=0,L=dBArr.length;i<L;i++){
					var v=dBArr[i]-91;
					if(v<-90.31)v=0;
					else v=Math.pow(10,v/20)*0x7FFF;
					v=Math.sqrt(v/4*fftSize)*20; //尝试把结果转换成和LibFFT一样，测试出来的
					arr[i]=~~v;
				}
				call(arr);
			}).catch(function(e){
				console.error(e);
				Runtime.Log(KeyAnalyser+" 的OfflineAudioContext startRendering出错："+e.message,1);
			});
		}
		
		//延迟一下操作，等前面两个绘制完成了在计算
		scope[KeyAnalyser].onLoadEcharts=function(){
			scope[KeyAnalyser].onLoadEcharts=null;
			setTimeout(function(){
				processWindow(KeyAnalyser);
			});
		}
		if(isLoadEcharts){
			scope[KeyAnalyser].onLoadEcharts();
		}
		break;
	}
};