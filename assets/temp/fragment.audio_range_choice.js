/******************
《【Demo库】音频时长区间选择器》
作者：高坚果
时间：2020-2-12 11:36:18

文档：
DemoFragment.AudioRangeChoice(set)
	set={
		elem:"css selector" //自动显示到dom，并以此dom大小为显示大小
			//或者配置显示大小，手动把this.elem显示到别的地方
		,width:0 //显示宽度
		,height:0 //显示高度
		
		//以上配置二选一
		
		,pcm: [Int16,...] //必填，pcm数据，一维数组
		,sampleRate: 123 //必填，pcm采样率
		
		,start:0 //默认开始位置ms
		,end:123 //默认结束位置ms，不提供默认到结尾
		,onChange:function(start,end) //当选择范围发生变更时回调，参数为起止ms
		
		//更多颜色等配置请参考源码里面的，就不重复写了
	}

.view() 更新显示选择界面
.destroy() 销毁对象
.draw() 更新界面的绘制，如果修改set参数，可以立即调用更新

.setRange(start,end) 修改选择范围，会触发onChange

.windowDuration:123 窗口中绘制的可视波形持续时间ms
.setWindow(duration) 设置窗口可视的持续时间，默认为音频总时长，即显示所有的波形，减小这个设置值可以放大波形的显示

.current:123 当前播放位置
.setCurrent(time) 设置当前播放起始位置单位ms，这个位置是整个pcm中的位置
					，如果不在区间内会改成区间边界上
.play(loop) 播放当前区间，会从当前位置current开始播放，如果loop为true会循环播放
.stop() 停止播放，可反复调用

如果要正常使用播放功能，需要先引入DemoFragment.PlayBuffer库
******************/
(function(){

var AudioRangeChoice=(
window.DemoFragment||(window.DemoFragment={})
).AudioRangeChoice=function(set){
	return new AudioRangeChoiceFn(set);
};

var AudioRangeChoiceFn=function(set){
	var This=this;
	var Data=AudioRangeChoice.Data||{};
	AudioRangeChoice.Data=Data;
	var id=(AudioRangeChoice.ID||0)+1;
	AudioRangeChoice.ID=id;
	Data[id]=This;
	This.id=""+id;
	
	var o={
		onChange:function(){}
		
		,scale:2 //缩放系数，应为正整数，使用2(3? no!)倍宽高进行绘制，避免移动端绘制模糊
		
		//以下参数支持实时变更，draw调用时会立即生效
		,waveBgColor:"" //波形背景颜色，不提供为透明
		,waveSlcBgColor:"" //波形选择的背景颜色，不提供为透明
		,waveSlcColor:"#0B1" //选择的波形颜色
		,waveUnslcColor:"#000" //未选择的波形颜色
		
		,rangeCtrlColor:"#F60" //范围选择控制杆上的按钮颜色
		,rangeCtrlLineColor:"#F60" //范围选择控制杆上的竖向颜色
		,rangeCtrlEndColor:"" //如果提供结束控制杆将会使用不同颜色
		,rangeCtrlEndLineColor:"" //如果提供结束控制杆将会使用不同颜色
		
		,playCtrlColor:"#0B1" //播放位置控制杆上的按钮颜色
		,playCtrlLineColor:"#F00" //播放位置控制杆上的竖向颜色
		
		,timelineEnable:true //启用时间线
		,timelineBgColor:"" //时间线背景颜色，不提供为透明
		,timelineColor:"#999" //时间线上的文字颜色
		,timelineLineColor:"" //时间线上的竖线条颜色，不提供和文字相同
	};
	for(var k in set){
		o[k]=set[k];
	};
	This.set=set=o;
};
AudioRangeChoiceFn.prototype=AudioRangeChoice.prototype=function(){
	destroy:function(){
		this.stop();
		this.isView=false;
		delete AudioRangeChoice.Data[this.id];
	}
	,setWindow:function(duration){
		this.windowDuration=duration;
		this.draw();
	}
	,setCurrent:function(time){
		this.current=time;
		this.draw();
	}
	,setRange:function(start,end){
		this.start=start;
		this.end=end;
		this.draw();
	}
	,view:function(){
		var This=this,set=This.set;
		
		This.start=set.start;
		This.end=set.end;
		This.current=0;
		This.windowDuration=0;
		
		This.cursor="";
		This.cursorCur="";
		
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
		
		var toolsHeight=60;
		var scale=set.scale;
		var canvasWidth=set.width*scale;
		var canvasWrapHeight=set.height-toolsHeight;
		var canvasHeight=canvasWrapHeight*scale;
		
		var thisElem=This.elem=document.createElement("div");
		var lowerCss=["","transform-origin:0 0;","transform:scale("+(1/scale)+");"];
		lowerCss=lowerCss.join("-webkit-")+lowerCss.join("-ms-")+lowerCss.join("-moz-")+lowerCss.join("");
		thisElem.className="AudioRangeChoice AudioRangeChoice"+This.id;
		thisElem.innerHTML='\
<div class="AudioRangeChoiceBox" style="width:'+set.width+'px;height:'+set.height+'px;overflow:hidden">\
	<div class="AudioRangeChoiceWaveBox" style="width:'+set.width+'px;height:'+canvasWrapHeight+'px;overflow:hidden">\
		<div style="width:'+canvasWidth+'px;height:'+canvasHeight+'px;'+lowerCss+'">\
			<canvas/>\
		</div>\
	</div>\
	<div class="AudioRangeChoiceToolsBox" style="height:'+toolsHeight+'px;overflow:hidden">\
		\
	</div>\
</div>';
		
		var canvas=This.canvas=thisElem.querySelector("canvas");
		var ctx=This.ctx=canvas.getContext("2d");
		canvas.width=canvasWidth;
		canvas.height=canvasHeight;
		
		var canvas2=This.canvas2=document.createElement("canvas");
		var ctx2=This.ctx2=canvas2.getContext("2d");
		canvas2.width=width*3;//缓冲背景卷轴，含未选择波形、timeline，后台绘制画布能容纳3块窗口内容，进行无缝拖动
		canvas2.height=height;
		
		var canvas3=This.canvas3=document.createElement("canvas");
		var ctx3=This.ctx3=canvas3.getContext("2d");
		canvas3.width=width*3;//缓冲已选择波形卷轴，后台绘制画布能容纳3块窗口内容，进行无缝拖动
		canvas3.height=height;
		
		var bind=function(el,types,call){
			types=types.split(" ");
			el=thisElem.querySelector(el);
			for(var i=0;i<types.length;i++){
				el.addEventListener(types[i],call);
			};
		};
		
		if(elem){
			elem.innerHTML="";
			elem.appendChild(thisElem);
		};
		
		This.isView=true;
		This.draw();
	}
	
	
	,draw:function(){
		var This=this,set=This.set;
		var scale=set.scale;
		var width=set.width*scale;
		var height=set.height*scale;
		var waveLineWidth=1*scale;
		var timelineLineWidth=1*scale;
		
		var pcm=set.pcm;
		var sampleRate=set.sampleRate;
		var duration=Math.floor(pcm.length/sampleRate*1000);
		
		//规范化数据
		var end=This.end=Math.min(duration,This.end==0?0:(This.end||duration));
		var start=This.start=Math.min(end,This.start||0);
		var current=This.current=Math.min(end,Math.max(start,This.current));
		
		var widthMinDuration=Math.floor((width/waveLineWidth)/sampleRate*1000);
		var windowDuration=This.windowDuration=Math.max(widthMinDuration,This.windowDuration||duration);
		
		if(!This.isView){
			return;
		};
		
		//延迟更新DOM数据
		if(!This.domInt){
			This.domInt=setTimeout(function(){
				This.domInt=0;
				if(This.isView){
					if(This.cursor!=This.cursorCur){
						This.cursorCur=This.cursor;
						This.elem.style.cursor=This.cursor||"pointer";
					};
					
					
				};
			},200);
		};
		
		
	}
	
	
	
	
	,play:function(loop){
		
	}
	,stop:function(){
		
	}
};

})();