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
			//或者配置显示大小，手动把waveviewObj.elem显示到别的地方
		,width:0 //显示宽度
		,height:0 //显示高度
		
		以上配置二选一
		*/
		
		scale:2 //缩放系数，因为正整数，使用2(3? no!)倍宽高进行绘制，避免移动端绘制模糊
		,speed:8 //移动速度系数，越大越快
		
		,lineWidth:3 //线条基础粗细
		
		//渐变色配置：[位置，css颜色，...] 位置: 取值0.0-1.0之间
		,linear1:[0,"rgba(150,96,238,1)",0.2,"rgba(170,79,249,1)",1,"rgba(53,199,253,1)"] //线条渐变色1，从左到右
		,linear2:[0,"rgba(209,130,255,0.6)",1,"rgba(53,199,255,0.6)"] //线条渐变色2，从左到右
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
	
	var scale=set.scale;
	var width=set.width*scale;
	var height=set.height*scale;
	
	var thisElem=This.elem=document.createElement("div");
	thisElem.innerHTML='<div style="width:'+set.width+'px;height:'+set.height+'px;overflow:hidden"><div style="width:'+width+'px;height:'+height+'px;transform-origin:0 0;transform:scale('+(1/1/scale)+')"><canvas/></div></div>';
	
	var canvas=This.canvas=thisElem.querySelector("canvas");
	var ctx=This.ctx=canvas.getContext("2d");
	canvas.width=width;
	canvas.height=height;
	
	This.linear1=This.genLinear(ctx,width,set.linear1);
	This.linear2=This.genLinear(ctx,width,set.linear2);
	This.linearBg=This.genLinear(ctx,height,set.linearBg,true);
	
	if(elem){
		elem.innerHTML="";
		elem.appendChild(thisElem);
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
		var scale=set.scale;
		var width=set.width*scale;
		var maxAmplitude=set.height*scale/2;
		
		for(var x=0;x<width;x+=scale) {
			var scaling=(1+Math.cos(Math.PI+(x/width)*2*Math.PI))/2;
			var y=scaling*maxAmplitude*amplitude*Math.sin(2*Math.PI*(x/width)*frequency+phase)+maxAmplitude;
			rtv.push(y);
		}
		return rtv;
	}
	,input:function(pcmData,powerLevel,sampleRate){
		var This=this,set=This.set;
		var ctx=This.ctx;
		var scale=set.scale;
		var width=set.width*scale;
		var height=set.height*scale;
		
		var speedx=set.speed*pcmData.length/sampleRate;
		var phase=This._phase-=speedx;//位移速度
		var amplitude=powerLevel/100;
		var path1=This.genPath(2,amplitude,phase);
		var path2=This.genPath(1.8,amplitude,phase+speedx*5);
		
		//开始绘制图形
		ctx.clearRect(0,0,width,height);
		
		//绘制包围背景
		ctx.beginPath();
		for(var i=0,x=0;x<width;i++,x+=scale) {
			if (x==0) {
				ctx.moveTo(x,path1[i]);
			}else {
				ctx.lineTo(x,path1[i]);
			};
		};
		i--;
		for(var x=width-1;x>=0;i--,x-=scale) {
			ctx.lineTo(x,path2[i]);
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
		var scale=set.scale;
		var width=set.width*scale;
		
		ctx.beginPath();
		for(var i=0,x=0;x<width;i++,x+=scale) {
			if (x==0) {
				ctx.moveTo(x,path[i]);
			}else {
				ctx.lineTo(x,path[i]);
			};
		};
		ctx.lineWidth=set.lineWidth*scale;
		ctx.strokeStyle=linear;
		ctx.stroke();
	}
};
Recorder.WaveView=WaveView;

	
})();