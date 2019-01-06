/*
录音 Recorder扩展，动态波形显示
https://github.com/xiangyuecn/Recorder
*/
(function(){

var WaveView=function(set){
	return new fn(set);
};
var fn=function(set){
	var This=this;
	var o={
		/*
		elem:"css selector" //自动显示到dom，并以此dom大小为显示大小
			//或者配置显示大小，手动把this.canvas显示到别的地方
		,width:0 //显示宽度
		,height:0 //显示高度
		
		以上配置二选一
		*/
		
		
		lineWidth:2 //线条粗细
		
		//渐变色配置：[位置，css颜色，...] 位置: 取值0.0-1.0之间
		,linear1:[0,"rgba(150,97,236,1)",1,"rgba(54,197,252,1)"] //线条渐变色1，从左到右
		,linear2:[0,"rgba(209,130,253,0.6)",1,"rgba(54,197,252,0.6)"] //线条渐变色2，从左到右
		,linearBg:[0,"rgba(255,255,255,0.2)",1,"rgba(54,197,252,0.2)"] //背景渐变色，从上到下
	};
	for(var k in set){
		o[k]=set[k];
	};
	This.set=set=o;
	
	var elem=set.elem;
	if(elem){
		if(typeof(elem)=="string"){
			elem=document.querySelector(elem);
		}else if(elem.length){
			elem=elem[0];
		};
	};
	if(elem){
		set.width=elem.offsetWidth;
		set.height=elem.offsetHeight;
	};
	
	var canvas=This.canvas=document.createElement("canvas");
	var ctx=This.ctx=canvas.getContext("2d");
	canvas.width=set.width;
	canvas.height=set.height;
	
	This.linear1=This.genLinear(ctx,set.width,set.linear1);
	This.linear2=This.genLinear(ctx,set.width,set.linear2);
	This.linearBg=This.genLinear(ctx,set.width,set.linearBg,true);
	
	if(elem){
		elem.innerHTML="";
		elem.appendChild(canvas);
	};
	
	This._phase=0;
};
fn.prototype=WaveView.prototype={
	genLinear:function(ctx,size,colors,top){
		var rtv=ctx.createLinearGradient(0,0,top?0:size,top?size:0);
		for(var i=0;i<colors.length;){
			rtv.addColorStop(colors[i++],colors[i++]);
		};
		return rtv;
	}
	,genPath:function(frequency,amplitude,phase){
		//曲线生成算法参考 https://github.com/HaloMartin/MCVoiceWave/blob/f6dc28975fbe0f7fc6cc4dbc2e61b0aa5574e9bc/MCVoiceWave/MCVoiceWaveView.m#L268
		var rtv=[];
		var This=this,set=This.set;
		var width=set.width;
		var maxAmplitude=set.height/2;
		
		for(var x=0;x<width;x+=1) {
			var scaling=(1+Math.cos(Math.PI+(x/width)*2*Math.PI))/2;
			var y=scaling*maxAmplitude*amplitude*Math.sin(2*Math.PI*(x/width)*frequency+phase)+maxAmplitude;
			rtv.push(y);
		}
		return rtv;
	}
	,input:function(pcmData,powerLevel,sampleRate){
		var This=this,set=This.set;
		var ctx=This.ctx;
		var width=set.width;
		
		var phase=This._phase-=0.22;//位移
		var amplitude=powerLevel/100;
		var path1=This.genPath(2,amplitude,phase);
		var path2=This.genPath(1.8,amplitude,phase+3);
		
		//开始绘制图形
		ctx.clearRect(0,0,set.width,set.height);
		
		//绘制包围背景
		ctx.beginPath();
		for(var x=0;x<width;x+=1) {
			if (x==0) {
				ctx.moveTo(x,path1[x]);
			}else {
				ctx.lineTo(x,path1[x]);
			};
		};
		for(var x=width-1;x>=0;x-=1) {
			ctx.lineTo(x,path2[x]);
		};
		ctx.closePath();
		ctx.fillStyle=This.linearBg;
		ctx.fill();
		
		//绘制线
		This.drawPath(path2,This.linear2);
		This.drawPath(path1,This.linear1);
	}
	,drawPath:function(path,linear){
		var This=this,set=This.set;
		var ctx=This.ctx;
		var width=set.width;
		
		ctx.beginPath();
		for(var x=0;x<width;x+=1) {
			if (x==0) {
				ctx.moveTo(x,path[x]);
			}else {
				ctx.lineTo(x,path[x]);
			};
		};
		ctx.lineWidth=set.lineWidth;
		ctx.strokeStyle=linear;
		ctx.stroke();
	}
};
Recorder.WaveView=WaveView;

	
})();