/******************
《【测试】音乐合成-用波形函数将歌曲简谱文本转成PCM》
作者：高坚果
时间：2023-07-20 20:27:13

使用 src/extensions/create-audio.nmn2pcm.js 将一段音乐简谱转换成pcm，在转成wav播放
******************/

var createClick=function(){
	var setCode=nmnSetEdit.getValue();
	var name,timbre,volume,waveType,meterDuration,texts,muteDuration,beginDuration,endDuration,sampleRate;
	try{
		eval(setCode+"\n//@ sourceURL=Eval.js");
	}catch(e){
		console.error(e);
		var m=/Eval\.js:(\d+)/.exec(e.stack);
		Runtime.Log("简谱配置错误["+(m?"第"+m[1]+"行":"未知位置")+"]："+e.message,1);
		return;
	}
	
	//合成
	var t1=Date.now();
	try{
		var data=Recorder.NMN2PCM({
			timbre:timbre,meterDuration:meterDuration,texts:texts
			,muteDuration:muteDuration,beginDuration:beginDuration
			,endDuration:endDuration,sampleRate:sampleRate
			,volume:volume,waveType:waveType
		});
		if(data.duration==0){
			throw new Error("合成音频的时长为0，请检查texts是否填写");
		}
	}catch(e){
		console.error(e);
		Runtime.Log("合成出现异常："+e.message,1);
		return;
	}
	delete data.set.texts;
	Runtime.Log("合成《"+name+"》耗时："+(Date.now()-t1)+"ms 合成配置："+JSON.stringify(data.set),"#aaa");
	if(data.warns.length){
		Runtime.Log("合成提示消息: "+JSON.stringify(data.warns),"#f60");
	};
	
	//转码成wav
	var sampleRate=data.set.sampleRate;
	var rec=Recorder({type:"wav",sampleRate:sampleRate,bitRate:16});
	rec.mock(data.pcm,sampleRate);
	rec.stop(function(blob,duration){
		Runtime.LogAudio(blob,duration,rec,"已合成");
	});
};


//=====以下代码无关紧要，音频数据源，采集原始音频用的==================
//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/wav.js",check:function(){return !Recorder.prototype.wav}}
	,{url:RootFolder+"/src/extensions/create-audio.nmn2pcm.js",check:function(){return !Recorder.NMN2PCM}}
	
	,{url:RootFolder+"/assets/runtime-codes/test.create-audio.nmn2pcm__texts.js",check:function(){return !window["test.create-audio.nmn2pcm__texts"]}}//预定义简谱
]);

//显示控制按钮
Runtime.Ctrls([
	{html:`
<div>
	<div>
		<div style="padding-bottom:10px;font-weight:bold;">点击一个预定义简谱填充：</div>
		<div class="nmn_tp_a" style="padding-left:30px;"></div>
	</div>
	<div style="padding:10px 0" class="nmn_tp_pos">
		<span style="font-weight:bold;">简谱配置：</span>
	</div>
	<div style="border:1px solid #ddd">
		<textarea class="nmn_set" style="width:100%"></textarea>
	</div>
	<div style="padding:10px 0">
		<select class="nmn_tp_s"></select>
	</div>
</div>
	`}
	,{name:"合成PCM，再转成wav播放",click:"createClick"}
]);

var nmnSetEl=$(".nmn_set")[0];
/*nmnSetEl.oninput=function(){ nmnSetChange() };
var nmnSetChange=function(){
	nmnSetEl.style.height="1px";
	nmnSetEl.style.height=Math.max(100, nmnSetEl.scrollHeight)+"px";
};*/
var nmnSetEdit=CodeMirror.fromTextArea(nmnSetEl,{
	mode:"javascript"
	,lineNumbers:true
	,lineWrapping:true
});
nmnSetEdit.setSize("auto","auto");
var nmnSetVal=function(set,fromTp){
	var Default=Recorder.NMN2PCM({sampleRate:-1}).set;
	var txts=[];
	var put=function(key,desc,val){
		txts.push('//'+desc);
		txts.push(key+'='+val+';');
	};
	put("name","简谱名称，此简谱参考地址："+(set.url||"无"),JSON.stringify(set.name||""));
	
	txts.push("");
	txts.push(`/** 简谱格式化文本，如果格式不符合要求，将会抛异常
texts格式：单个文本，或文本数组
	- 四分音符(一拍)：低音: 1.-7. 中音: 1-7 高音: 1'-7' 休止符(静音)：0
	- 音符后面用 "." 表示低音（尽量改用"."：".." 倍低音，"..." 超低音）
	- 音符后面用 "'" 表示高音（尽量改用"'"："''" 倍高音，"'''" 超高音）
	- 音符之间用 "|" 或 " " 分隔一拍
	- 一拍里面多个音符用 "," 分隔，每个音按权重分配这一拍的时长占比，如：“6,7”为一拍，6、7各占1/2拍，相当于八分音符
	
	- 音符后面用 "-" 表示二分音符，简单计算为1+1=2拍时长，几个-就加几拍
	- 音符后面用 "_" 表示八分音符；两两在一拍里面的音符可以免写_，自动会按1/2分配；一拍里面只有一个音时这拍会被简单计算为1/2=0.5拍；其他情况计算会按权重分配这一拍的时长(复杂)，如：“6,7_”为1/2+1/2/2=0.75拍（“6*,7_”才是(1+0.5)/2+1/2/2=1拍），其中6权重1分配1/2=0.5拍，7权重0.5分配1/2/2=0.25拍；多加一个"_"就多除个2：“6_,7_”是1/2+1/2=1拍（等同于“6,7”可免写_）；“6__,7__”是1/2/2+1/2/2=0.5拍；只要权重加起来是整数就算作完整的1拍
	- 音符后面用 "*" 表示1+0.5=1.5拍，多出来的1/2计算和_相同(复杂)，"**"两个表示加0.25
	
	- 可以使用 "S"(sine) "Q"(square) "A"(sawtooth) "T"(triangle) 来切换后续波形发生器类型（按一拍来书写，但不占用时长），类型后面可以接 "(2.0)" 来设置音色，接 "[0.5]" 来设置音量（为set.volume*0.5）；特殊值 "R"(reset) 可重置类型成set配置值，如果R后面没有接音色或音量也会被重置；比如："1 2|A(4.0)[0.6] 3 4 R|5 6"，其中12 56使用set配置的类型和音色音量，34使用锯齿波、音色4.0、音量0.18=0.3*0.6
	
	- 如果同时有多个音，必须提供数组格式，每个音单独提供一个完整简谱（必须同步对齐）**/`);
	var texts=set.texts;
	if(!texts)texts=["",""];
	if(typeof(texts)=="string")texts=[texts];
	var txtN="",txtC="",arrs=[],codes=[];
	for(var i=0;i<texts.length;i++){
		txtN+=(txtN?", ":"")+"txt"+(i+1)+'=""';
		txtC+=(txtC?", ":"")+"txt"+(i+1);
		var arr=texts[i].replace(/^[\s\|]+|[\s\|]$/g,"").split("|");
		arrs.push(arr);
		arr.forEach(a=>{
			a=a.trim(); if(a)codes.push(a);
		});
	}
	codes.sort((a,b)=>a.length-b.length);
	var len80=(codes[~~(codes.length*0.8)]||"").length;
	var lineSize=len80<10?5:len80<15?4:len80<25?3:len80<35?2:1;
	codes=[];
	for(var offset=0,n=0;;n++){
		var next=0,vals=[];
		for(var i=0;i<arrs.length;i++){
			var arr=arrs[i], val="";
			if(offset<arr.length){ next=1;
				for(var j=offset;j<arr.length&&j<offset+lineSize;j++){
					val+=arr[j]+(j==arr.length-1?"":"|");
				}
			};
			vals[i]=val;
		};
		if(!next)break;
		codes.push("// "+(n+1)+"");
		for(var i=0;i<arrs.length;i++){
			codes.push('txt'+(i+1)+'+='+JSON.stringify(vals[i])+';');
		}
		offset+=lineSize;
	};
	
	txts.push('var '+txtN+';');
	txts.push(codes.join("\n"));
	txts.push('');
	txts.push('texts=['+txtC+'];');
	
	txts.push("");
	put("muteDuration","音符之间的静默，毫秒，0时无静默，默认meterDur/4（最大50ms）",set.muteDuration||"null");
	put("beginDuration","开头的静默时长，毫秒，0时无静默，默认为200ms",set.beginDuration||"null");
	put("endDuration","结尾的静默时长，毫秒，0时无静默，默认为200ms",set.endDuration||"null");
	put("sampleRate","生成pcm的采样率，默认48000；取值不能过低，否则会削除高音",set.sampleRate||Default.sampleRate);
	put("volume","音量，默认0.3，取值范围0.0-1.0（最大值1）",set.volume||Default.volume);
	txts.push("");
	put("waveType",'波形发生器类型，默认"sine"，取值：sine(正弦波)、square(方波，volume应当减半)、sawtooth(锯齿波)、triangle(三角波)','"'+(set.waveType||Default.waveType)+'"');
	put("timbre","音色，默认2.0（使用音符对应频率的一个倍频），取值>=1.0",set.timbre||Default.timbre);
	put("meterDuration","一拍时长，毫秒，默认600ms",set.meterDuration||Default.meterDuration);
	
	if(fromTp){
		txts.push("");
		txts.push("//以上配置使用《"+set.name+"》填充");
	}
	var sTop1=$(".nmn_tp_s").offset().top;
	var sTopPos=$(".nmn_tp_pos").offset().top;
	
	nmnSetEdit.setValue(txts.join("\n")); nmnSetEdit.refresh();
	Runtime.Log("已填充《"+set.name+"》，请点击合成按钮合成后播放",2);
	
	if(fromTp){ //页面滚动到合适位置
		var sTop2=$(".nmn_tp_s").offset().top;
		var sTop=document.documentElement.scrollTop;
		var topVal=sTop+sTop2-sTop1;
		if(sTop<sTopPos){
			$("html").animate({ scrollTop: sTop2-100});
		}else{
			document.documentElement.scrollTop=topVal;
		}
	}
};
nmnSetVal({});

var buildTp=function(){
	var as=[];
	var html=[`<option value="">======= 选择一个预定义简谱填充 =======</option>`];
	for(var i=0;i<Templates.length;i++){
		var o=Templates[i];
		html.push(`<option value="${i+1}">${o.name}</option>`);
		as.push(`<div>${i+1}. <a onclick="nmnSetVal(Templates[${i}],1)">${o.name}</a></div>`);
	}
	$(".nmn_tp_a").html(as.join(''));
	$(".nmn_tp_s").html(html.join("")).bind("change",function(){
		var val=+this.value; this.value="";
		if(val){
			nmnSetVal(Templates[val-1],1);
		}
	});
};


var Templates=[];
//读取预定义简谱
var arr=window["test.create-audio.nmn2pcm__texts"];
for(var i=0;i<arr.length;i++){
	Templates.push(arr[i]);
};
//读取插件内置简谱
var exps=Recorder.NMN2PCM.GetExamples();
for(var k in exps){
	var o=exps[k];
	var set=o.get(-1).set;
	set.name="[插件内置] "+o.name;
	Templates.push(set);
}

buildTp();
