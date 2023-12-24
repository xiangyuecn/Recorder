if(typeof global!="object" || typeof process!="object"){
	throw new Error("非nodejs环境");
};

global.TempDir="./temp/";
global.RootDir="../../";
global.SrcDir=RootDir+"src/";

var fs=require("fs");
var Path=require('path'); 
var Recorder=require(SrcDir+"recorder-core.js");

//更改默认返回值类型，node没有Blob
Recorder.DefaultDataType="arraybuffer";

global.Log=function(msg,err){
	var now=new Date();
	var t=("0"+now.getHours()).substr(-2)
		+":"+("0"+now.getMinutes()).substr(-2)
		+":"+("0"+now.getSeconds()).substr(-2)
		+"."+("00"+now.getMilliseconds()).substr(-3);
	var arr=["["+t+" Log]"+msg];
	var a=arguments;
	var i=2,fn=console.log;
	if(typeof(err)=="number"){
		fn=err==1?console.error:err==3?console.warn:fn;
		var color=err==1?"31":err==2?"32":err==3?"33":err;
		var tag="["+t+" "+(err==1?"Err":err==2?"Log":err==3?"Warn":"Log")+"]";
		if(+color){
			arr[0]="\x1B["+color+"m"+tag+msg+"\x1B[0m";
		}
	}else{
		i=1;
	};
	for(;i<a.length;i++){
		arr.push(a[i]);
	};
	fn.apply(console,arr);
};
global.FormatMs=function(ms){
	var ss=ms%1000;ms=(ms-ss)/1000;
	var s=ms%60;ms=(ms-s)/60;
	var m=ms%60;ms=(ms-m)/60;
	var h=ms;
	var t=(h?h+":":"")
		+(h+m?("0"+m).substr(-2)+":":"")
		+(h+m+s?("0"+s).substr(-2)+"″":"")
		+("00"+ss).substr(-3);
	return t;
};
global.FormatSize=function(num){
	var size=+num||0,s="B";
	if(size>1023){ s="KB"; size/=1024; }
	if(size>1023){ s="MB"; size/=1024; }
	if(size>1023){ s="GB"; size/=1024; }
	var txt=+size.toFixed(1)+" "+s;
	if(size>9)txt=Math.round(size)+" "+s;
	return txt;
};
global.Sleep=function(ms){ return new Promise(function(resolve,reject){
	setTimeout(resolve,ms);
}) };


/**保存ArrayBuffer到文件**/
global.ArrayBufferSaveTempFile=function(file,buffer){
	if(buffer instanceof ArrayBuffer){
		buffer=Buffer.from(buffer);
	}else if(!(buffer instanceof Buffer)){
		throw new Error("保存的数据不是Buffer或ArrayBuffer");
	}
	
	var path=TempDir+file;
	var dir=Path.dirname(path);
	!fs.existsSync(dir)&&fs.mkdirSync(dir);
	
	fs.writeFileSync(path, buffer);
	return path;
};

