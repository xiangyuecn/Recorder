/*
mp3编码器，需带上mp3-engine.js引擎使用
https://github.com/xiangyuecn/Recorder

当然最佳推荐使用mp3、wav格式，代码也是优先照顾这两种格式
浏览器支持情况
https://developer.mozilla.org/en-US/docs/Web/HTML/Supported_media_formats
*/
(function(){
"use strict";

Recorder.prototype.enc_mp3={
	stable:true
	,testmsg:"采样率范围48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000"
};



//*******标准UI线程转码支持函数************

Recorder.prototype.mp3=function(res,True,False){
		var This=this,set=This.set,size=res.length;
		
		//优先采用worker编码，太低版本下面用老方法提供兼容
		var ctx=This.mp3_start(set);
		if(ctx){
			This.mp3_encode(ctx,res);
			This.mp3_complete(ctx,True,False,1);
			return;
		};
		
		//https://github.com/wangpengfei15975/recorder.js
		//https://github.com/zhuker/lamejs bug:采样率必须和源一致，不然8k时没有声音，有问题fix：https://github.com/zhuker/lamejs/pull/11
		var mp3=new Recorder.lamejs.Mp3Encoder(1,set.sampleRate,set.bitRate);
		
		var blockSize=57600;
		var data=[];
		
		var idx=0;
		var run=function(){
			if(idx<size){
				var buf=mp3.encodeBuffer(res.subarray(idx,idx+blockSize));
				if(buf.length>0){
					data.push(buf.buffer);
				};
				idx+=blockSize;
				setTimeout(run);//Worker? 复杂了
			}else{
				var buf=mp3.flush();
				if(buf.length>0){
					data.push(buf.buffer);
				};
				
				True(new Blob(data,{type:"audio/mp3"}));
			};
		};
		run();
	}


//********边录边转码(Worker)支持函数，如果提供就代表可能支持，否则只支持标准转码*********

var openList={id:0};
Recorder.prototype.mp3_start=function(set){//如果返回null代表不支持
	try{
		var onmsg=function(e){
			var ed=e.data;
			switch(ed.action){
			case "encode":
				var buf=encObj.encodeBuffer(ed.pcm);
				if(buf.length>0){
					encArr.push(buf.buffer);
				};
				break;
			case "complete":
				var buf=encObj.flush();
				if(buf.length>0){
					encArr.push(buf.buffer);
				};
				self.postMessage({
					action:ed.action,
					blob:new Blob(encArr,{type:"audio/mp3"})
				});
				break;
			};
		};
		var jsCode=");lameFn();var encObj=new lameFn.Mp3Encoder(1,"+set.sampleRate+","+set.bitRate+"),encArr=[];self.onmessage="+onmsg;
		
		var worker=new Worker((window.URL||webkitURL).createObjectURL(new Blob(["var lameFn=("+Recorder.lamejs.toString()+jsCode], {type:"text/javascript"})));
		worker.onmessage=function(e){
			ctx.call&&ctx.call(e.data);
			ctx.call=null;
		};
		worker.postMessage({x:new Int16Array(5)});//低版本浏览器不支持序列化TypeArray
		
		var ctx={worker:worker};
		
		ctx.id=++openList.id;
		openList[ctx.id]=ctx;
		
		return ctx;
	}catch(e){//出错了就不要提供了
		console.error(e);
		return null;
	};
};
Recorder.prototype.mp3_stop=function(startCtx){
	if(startCtx&&startCtx.worker){
		startCtx.worker.terminate();
		startCtx.worker=null;
		delete openList[startCtx.id];
		
		//疑似泄露检测 排除id
		var opens=-1;
		for(var k in openList){
			opens++;
		};
		if(opens){
			console.warn("mp3 worker剩"+opens+"个未释放");
		};
	};
};
Recorder.prototype.mp3_encode=function(startCtx,pcm){
	if(startCtx&&startCtx.worker){
		startCtx.worker.postMessage({
			action:"encode"
			,pcm:pcm
		});
	};
};
Recorder.prototype.mp3_complete=function(startCtx,True,False,autoStop){
	var This=this;
	if(startCtx&&startCtx.worker){
		startCtx.call=function(data){
			True(data.blob);
			
			if(autoStop){
				This.mp3_stop(startCtx);
			};
		};
		startCtx.worker.postMessage({
			action:"complete"
		});
	}else{
		False("mp3编码器未打开");
	};
};


	
})();