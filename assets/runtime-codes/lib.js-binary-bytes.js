/******************
《【Demo库】js二进制转换-Base64/Hex/Int16Array/ArrayBuffer/Blob》
作者：高坚果
时间：2024-01-11 21:12

本代码封装了一些js中二进制数据的相互转换方法，需要使用哪个转换方法直接copy对应的方法代码即可。

【部分转换调用】 Recorder中16位的pcm为Int16Array格式，pcm.byteLength是偶数
	pcm=new Int16Array([1,2,3,0x7fff,-0x8000]); pcm=rec.buffers[rec.buffers.length-1]

	pcm转成ArrayBuffer: arrayBuffer=pcm.buffer
	ArrayBuffer转成pcm: new Int16Array(arrayBuffer)

	pcm转成Blob: blob=new Blob([pcm.buffer],{type:"audio/pcm"})
	Blob转成pcm: new Int16Array(await blob.arrayBuffer())

	pcm转成Base64: base64=Recorder.ArrayBufferToBase64(pcm.buffer) //YWJjZA==
	Base64转成pcm: new Int16Array(Recorder.Base64ToArrayBuffer(base64))

	pcm转成Hex: hex=Recorder.ArrayBufferToHex(pcm.buffer) //0F1E2D3C...
	Hex转成pcm: new Int16Array(Recorder.HexToArrayBuffer(hex))

【教程】
ArrayBuffer是内存中的原始二进制数据缓冲区，ArrayBuffer中的元素可以使用TypedArray或DataView来进行访问。其中DataView不是很容易上手，和其他语言的字节数组差异巨大，因此本示例未使用DataView；TypedArray(抽象类)和普通Array数组极为相似，TypedArray有很多子类，其中无符号的Uint8Array或有符号的Int8Array就类似其他语言的字节数组（byte[]），可直接通过下标进行访问二进制数据。

Recorder常用到的TypedArray子类有两个：Uint8Array、Int16Array
	Uint8Array：一个元素在ArrayBuffer中占用一个字节，Recorder中用作字节数组bytes
	Int16Array：一个元素在ArrayBuffer中占用两个字节，Recorder中用作16位的pcm

- 使用Uint8Array可以很方便的和Base64、Hex等格式相互转换。

- TypedArray和ArrayBuffer的关系：以`var int16Array=new Int16Array([1,2,3])`为例，int16Array.buffer属性为此数据的底层ArrayBuffer二进制对象；`var uint8Array=new Uint8Array(int16Array.buffer)`可以通过ArrayBuffer构造出一个TypedArray，此时uint8Array.buffer和int16Array.buffer是同一个对象（同一个内存区域），修改uint8Array数组内的值，int16Array内的值也会变化，反之亦然。

- Blob和ArrayBuffer的关系：通过`new Blob([arrayBuffer],{type:"xx/xx"})`可以将ArrayBuffer转成Blob，Blob可以通过FileReader的readAsArrayBuffer方法读取成ArrayBuffer。

- File：File对象是Blob的一个特例（子类），常见的是通过`input[type=file]`DOM元素选取到的文件就是File对象，有些极个别的特殊场合必须需使用File对象时，可以使用`new File([blob],"fileName.mp3")`、`new File([arrayBuffer],"fileName.mp3")`来构造。


小问题：TypedArray存在一个现代几乎忽略不计的问题，当多字节表示一个数的时候（Int16及以上），会存在字节序的问题，此问题取决于CPU是大端序（big-endian）还是小端序（little-endian），会导致ArrayBuffer中的字节顺序不一致，比如：`int a=1` 在大端序时字节是`00 00 00 01`，小端序时是`01 00 00 00`，好在大端序的CPU似乎已经销声匿迹了。

【参考】
ArrayBuffer参考：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
TypedArray参考：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
Blob参考：https://developer.mozilla.org/zh-CN/docs/Web/API/Blob
Endianness（字节序）参考：https://developer.mozilla.org/zh-CN/docs/Glossary/Endianness
******************/
(function(){
"use strict";

var Export=Recorder; //可以整个代码复制过去使用，删掉这句（结尾的测试代码也删掉），解开下面这句注释
//var Export={}; export default Export; //import使用：import JsBinary from './copy.js'


//=======TypedArray二进制拼接合并======
	/*直接创建一个大的数组，调用set方法将两个小数组填充进去即可，下面Int16Array换成Uint8Array等其他TypedArray也是一样的
		var pcm1=new Int16Array([1,2]),pcm2=new Int16Array([3,4,5,6]); //待合并的两个数组
		var pcm=new Int16Array(pcm1.length+pcm2.length); //创建一个新的大数组
		pcm.set(pcm1,0); //写入pcm1到开头位置
		pcm.set(pcm2,pcm1.length); //写入pcm2到pcm1后面，完成拼接
	*/

//=======ArrayBuffer 和 TypedArray 互转（Uint8Array Int8Array Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array）======
	//【用 arr=new Int16Array(arrayBuffer) 就能创建TypedArray】无需编写转换函数
	//【用 arr.buffer 就是 ArrayBuffer】无需编写转换函数
			//注意：使用同一个arrayBuffer创建的多个TypedArray会共享同一块内存，修改一个TypedArray中的值，其他TypedArray中的值也会改变；如果不希望共享，可以使用arrayBuffer.slice(0)截取出一个新的ArrayBuffer再来创建TypedArray



//=======ArrayBuffer、String 和 Base64 互转==========
/**
Base64编码，将ArrayBuffer转成Base64字符串
	参数：ArrayBuffer对象
	返回值：string，base64字符串
*/
Export.ArrayBufferToBase64=function(arrayBuffer){
	var u8arr=new Uint8Array(arrayBuffer),str="";
	for(var i=0,L=u8arr.length;i<L;i++){
		str+=String.fromCharCode(u8arr[i]);
	};
	return btoa(str);
};
/**
Base64解码，将Base64字符串转成ArrayBuffer
	参数：string，base64字符串
	返回值：ArrayBuffer对象，如果Base64解码失败将会抛异常
*/
Export.Base64ToArrayBuffer=function(base64){
	var str=atob(base64),u8arr=new Uint8Array(str.length);
	for(var i=0,L=u8arr.length;i<L;i++){
		u8arr[i]=str.charCodeAt(i);
	};
	return u8arr.buffer;
};

/**
Base64编码，将文本字符串转成Base64字符串
	参数：string，文本字符串（utf-8）
	返回值：string，base64字符串
*/
Export.TextToBase64=function(str){
	return btoa(unescape(encodeURIComponent(str)));
};
/**
Base64解码，将Base64字符串转成文本字符串
	参数：string，base64字符串
	返回值：string，文本字符串（utf-8），如果Base64解码失败或二进制无法编码成utf-8字符串将会抛异常
*/
Export.Base64ToText=function(base64){
	return decodeURIComponent(escape(atob(base64)));
};

/**
将文本字符串转成ArrayBuffer
	参数：string，文本字符串（utf-8）
	返回值：ArrayBuffer对象
*/
Export.TextToArrayBuffer=function(str){
	var s=unescape(encodeURIComponent(str));
	var u8arr=new Uint8Array(s.length);
	for(var i=0,L=s.length;i<L;i++) u8arr[i]=s.charCodeAt(i);
	return u8arr.buffer;
};
/**
将ArrayBuffer转成文本字符串
	参数：ArrayBuffer对象
	返回值：string，文本字符串（utf-8），如果二进制无法编码成utf-8字符串将会抛异常
*/
Export.ArrayBufferToText=function(arrayBuffer){
	var u8arr=new Uint8Array(arrayBuffer),s="";
	for(var i=0,L=u8arr.length;i<L;i++) s+=String.fromCharCode(u8arr[i]);
	return decodeURIComponent(escape(s));
};



//=======ArrayBuffer 和 Hex（16进制） 互转==========
/**
Hex编码，将ArrayBuffer转成Hex字符串
	参数：ArrayBuffer对象
	返回值：string，Hex字符串（小写）
*/
Export.ArrayBufferToHex=function(arrayBuffer){
	var u8arr=new Uint8Array(arrayBuffer),s="";
	for(var i=0,L=u8arr.length,v;i<L;i++){
		v=u8arr[i];
		if(v<16) s+="0";
		s+=v.toString(16);
	};
	return s;
};
/**
Hex解码，将Hex字符串转成ArrayBuffer
	参数：string，Hex字符串（不区分大小写）
	返回值：ArrayBuffer对象，如果hex长度不是2的倍数或出现0-9A-F以外字符将会抛异常
*/
Export.HexToArrayBuffer=function(hex){
	if(hex.length%2) throw new Error("HexToArrayBuffer hex.length="+hex.length);
	var u8arr=new Uint8Array(hex.length/2),errAt=-1;
	for(var i=0,i0=0,L=u8arr.length,v1,v2;i<L;i++,i0+=2){
		v1=hex.charCodeAt(i0); v2=hex.charCodeAt(i0+1);
		//u8arr[i]=parseInt("0x"+v1+v2); //不带字符检测
		
		if(v1>=48&&v1<=57)v1-=48; //0-9
		else if(v1>=97&&v1<=102)v1-=97-10; //a-f
		else if(v1>=65&&v1<=70)v1-=65-10; //A-F
		else{ errAt=i0; break; }
		
		if(v2>=48&&v2<=57)v2-=48; //0-9
		else if(v2>=97&&v2<=102)v2-=97-10; //a-f
		else if(v2>=65&&v2<=70)v2-=65-10; //A-F
		else{ errAt=i0+1; break; }
		
		u8arr[i]=v1*16+v2;
	};
	if(errAt!=-1) throw new Error("HexToArrayBuffer hex["+errAt+"]="+hex.charAt(errAt));
	return u8arr.buffer;
};



//=======Blob（File） 和 ArrayBuffer Base64 互转==========
	//【blob=new Blob([arrayBuffer],{type:"xx/xx"}) 就能创建Blob】无需编写转换函数
	//【file=new File([arrayBuffer],"fileName.mp3") 就能创建File】无需编写转换函数
/**
将blob转成ArrayBuffer
	参数：Blob对象，或File对象
	返回值：异步 ArrayBuffer对象
*/
Export.BlobToArrayBuffer=async function(blob){
	//return await blob.arrayBuffer();
	return new Promise(function(resolve){
		var reader=new FileReader();
		reader.onloadend=function(){
			resolve(reader.result);
		};
		reader.readAsArrayBuffer(blob);
	});
};
/**
将blob转成Base64字符串
	参数：Blob对象，或File对象
	返回值：异步 string，base64字符串
*/
Export.BlobToBase64=async function(blob){
	return new Promise(function(resolve){
		var reader=new FileReader();
		reader.onloadend=function(){
			resolve((/.+;\s*base64\s*,\s*(.+)$/i.exec(reader.result)||[])[1]);
		};
		reader.readAsDataURL(blob);
	});
};



//=======其他功能函数==========
/**
计算ArrayBuffer的Hash哈希值
	参数：algorithm string：哈希算法（取值：SHA-1 SHA-256 SHA-384 SHA-512）
			arrayBuffer：ArrayBuffer对象
	返回值：异步 string，哈希值（hex 小写）
*/
Export.ArrayBufferHash=async function(algorithm,arrayBuffer){
	var buf=await crypto.subtle.digest(algorithm,arrayBuffer);
	var u8arr=new Uint8Array(buf),s="";
	for(var i=0,L=u8arr.length,v;i<L;i++){
		v=u8arr[i];
		if(v<16) s+="0";
		s+=v.toString(16);
	};
	return s;
};

/**整数数字转成字节
	参数：num number：任意整数数字
			len：指定要返回的低位字节数，默认8字节，最高8字节
			be boolean：true大端序，默认小端序
	返回值：ArrayBuffer对象
*/
Export.NumberToArrayBuffer=function(num,len,be){
	var hex4="00000000",isF=0;
	if(num<0){ //负数转正数-1
		num=-(num+1); isF=1;
	};
	var hex=num.toString(16);
	hex=(hex4+hex4+hex).substr(-16);
	if(!be){
		hex=hex.split("");
		hex=hex[14]+hex[15]+hex[12]+hex[13]+hex[10]+hex[11]+hex[8]+hex[9]
			+hex[6]+hex[7]+hex[4]+hex[5]+hex[2]+hex[3]+hex[0]+hex[1];
	}
	var arr=Export.HexToArrayBuffer(hex);
	if(len && len<8){
		if(be){
			arr=arr.slice(8-len);
		}else{
			arr=arr.slice(0, len);
		}
	}
	if(isF){ //负数取反
		arr=new Uint8Array(arr);
		for(var i=0,L=arr.length;i<L;i++) arr[i]=~arr[i];
		arr=arr.buffer;
	}
	return arr;
};
/**字节转成数字
	参数：arrayBuffer对象，支持1-8字节（4、8字节时有符号，其他无符号）
			be boolean：true大端序，默认小端序
	返回值：number整数数字
*/
Export.ArrayBufferToNumber=function(arrayBuffer,be){
	var arr=[],bytes=new Uint8Array(arrayBuffer);
	var size=bytes.length,isF=0;
	if(size<1)return 0;
	for(var i=0;i<size;i++)arr.push(bytes[i]);
	if(!be) arr.reverse();
	
	arr=new Uint8Array(arr);
	if((size==4 || size==8) && arr[0]>0x7F){ //负数取反
		isF=1;
		for(var i=0;i<size;i++){
			arr[i]=~arr[i];
		}
	}
	
	var hex=Export.ArrayBufferToHex(arr.buffer);
	var num=parseInt("0x"+hex);
	if(isF) num=-num-1; //转负数-1
	return num;
};

/**
检测CPU的字节端序，判断是大端序（big-endian）还是小端序（little-endian）的CPU，端序会影响Int16及以上的TypedArray数组的字节顺序，当你担心TypedArray在客户机上会出现不符合预期的行为时，可以检测一下CPU端序，发现几乎不可能出现的大端序时，可以在出现错误之前终止处理逻辑的运行
	参数：无
	返回值：boolean，true为大端序，false为小端序
*/
Export.Check_CPU_BE=function(){
	return !new Int8Array(new Int32Array([1]).buffer)[0];
};



})();











//全部复制到文件使用时，请删除下面的测试代码

//************测试************
(function(){
if(typeof(Recorder)=="undefined") return;
if(typeof(Runtime)=="undefined" || !Runtime.Ctrls) return;
var JsBinary=Recorder;

window.testArrayBuffer=null; //待处理ArrayBuffer，优先级比待处理文本低
window.testLastArrayBuffer=null; //最后一次处理时得到的ArrayBuffer
var setTestAB=async function(tag,ab){
	$(".testInTxt").val("");
	testArrayBuffer=ab; cls=("r"+Math.random()).replace(".","")
	Runtime.Log('<span class="'+cls+'"></span>');
	var sha1=await JsBinary.ArrayBufferHash("sha-1",ab);
	$("."+cls).html('<span style="color:#0b1">已设为待处理ArrayBuffer</span> '+tag+' '+ab.byteLength+"字节 sha1="+sha1);
};
var getTestAB=function(){
	$(".testInRes").val("").css("color","");
	$(".testResTag").html("");
	var txt=$(".testInTxt").val(),ab=testArrayBuffer;
	if(txt){
		ab=JsBinary.TextToArrayBuffer(txt);
	};
	if(!ab || ab.byteLength==0){
		errResult('读取待处理数据出错','待处理内容长度为0字节');
		return false;
	};
	if(txt){
		console.log(new Date().toLocaleString()+" 读取数据 从待处理文本",{text:txt,arrayBuffer:ab});
	}else{
		console.log(new Date().toLocaleString()+" 读取数据 从待处理ArrayBuffer",{arrayBuffer:ab});
	}
	getTestAB.from=txt?1:2;
	getTestAB.ab=ab;
	getTestAB.txt=txt;
	return true;
};
var errResult=function(tag,msg,e){
	var now=new Date().toLocaleString();
	console.error(now+" "+tag,msg,e);
	$(".testResTag").html(now+' <span style="color:#f00">'+tag+'</span>');
	$(".testInRes").val(msg+(e?"\n"+e.stack:"")).css("color","#f00");
};
var setResult=async function(tag,txt,ab){
	var now=new Date().toLocaleString();
	if(txt==null){
		var sha1=await JsBinary.ArrayBufferHash("sha-1",ab);
		txt="<ArrayBuffer> "+ab.byteLength+"字节 sha1="+sha1;
	}
	if(ab==null){
		ab=JsBinary.TextToArrayBuffer(txt);
	}
	testLastArrayBuffer=ab;
	$(".testInRes").val(txt);
	$(".testResTag").html(now+' <span style="color:#0b1">'+tag+'</span>');
	console.log(now+" 转换结果",tag,{text:txt,arrayBuffer:ab});
};

//按钮定义
window.testBtnClick={id:0};
var btns=[];
var addBtn=function(name,click){
	var fn=++testBtnClick.id;
	btns.push({name:name,click:"testBtnClick["+fn+"]"});
	testBtnClick[fn]=function(){ click(name); };
};

addBtn("Base64编码",function(tag){
	if(!getTestAB())return; var ab=getTestAB.ab;
	setResult(tag,JsBinary.ArrayBufferToBase64(ab));
});
addBtn("Base64ToArrayBuffer",function(tag){
	if(!getTestAB())return; var ab=getTestAB.ab;
	try{ var b64=JsBinary.ArrayBufferToText(ab); }catch(e){
		errResult(tag,"ArrayBufferToText 异常",e); return;
	}
	try{ var val=JsBinary.Base64ToArrayBuffer(b64); }catch(e){
		errResult(tag,"Base64ToArrayBuffer 异常",e); return;
	}
	setResult(tag,null,val);
});
addBtn("Base64解码成文本",function(tag){
	if(!getTestAB())return; var ab=getTestAB.ab;
	try{ var b64=JsBinary.ArrayBufferToText(ab); }catch(e){
		errResult(tag,"ArrayBufferToText 异常",e); return;
	}
	try{ var txt=JsBinary.Base64ToText(b64); }catch(e){
		errResult(tag,"Base64ToText 异常",e); return;
	}
	setResult(tag,txt);
});

btns.push({html:'计算<select class="hashName"><option value="SHA-1">SHA-1</option><option value="SHA-256">SHA-256</option><option value="SHA-384">SHA-384</option><option value="SHA-512">SHA-512</option></select>'})
addBtn("计算",async function(tag){
	var hn=$(".hashName").val(); tag+=hn;
	if(!getTestAB())return; var ab=getTestAB.ab;
	var val=await JsBinary.ArrayBufferHash(hn,ab);
	setResult(tag,val);
});


btns.push({html:"<div></div>"});
addBtn("Hex编码",function(tag){
	if(!getTestAB())return; var ab=getTestAB.ab;
	setResult(tag,JsBinary.ArrayBufferToHex(ab));
});
addBtn("HexToArrayBuffer",function(tag){
	if(!getTestAB())return; var ab=getTestAB.ab;
	try{ var hex=JsBinary.ArrayBufferToText(ab); }catch(e){
		errResult(tag,"ArrayBufferToText 异常",e); return;
	}
	try{ var val=JsBinary.HexToArrayBuffer(hex); }catch(e){
		errResult(tag,"HexToArrayBuffer 异常",e); return;
	}
	setResult(tag,null,val);
});
addBtn("Hex解码成文本",function(tag){
	if(!getTestAB())return; var ab=getTestAB.ab;
	try{ var hex=JsBinary.ArrayBufferToText(ab); }catch(e){
		errResult(tag,"ArrayBufferToText 异常",e); return;
	}
	try{ var val=JsBinary.HexToArrayBuffer(hex); }catch(e){
		errResult(tag,"HexToArrayBuffer 异常",e); return;
	}
	try{ var txt=JsBinary.ArrayBufferToText(val); }catch(e){
		errResult(tag,"hex->buffer->txt ArrayBufferToText 异常",e); return;
	}
	setResult(tag,txt);
});

addBtn("测试Blob读取",async function(tag){
	if(!getTestAB())return; var ab=getTestAB.ab;
	var abSHA1=await JsBinary.ArrayBufferHash("SHA-1",ab);
	var blob=new Blob([ab]),txt=[abSHA1];
	
	var ab1=await JsBinary.BlobToArrayBuffer(blob);
	var ab1SHA1=await JsBinary.ArrayBufferHash("SHA-1",ab1);
	txt.push(ab1SHA1+" 测试"+(ab1SHA1==abSHA1?"通过":"未通过")+" BlobToArrayBuffer");
	
	var b64=await JsBinary.BlobToBase64(blob);
	var ab2=JsBinary.Base64ToArrayBuffer(b64);
	var ab2SHA1=await JsBinary.ArrayBufferHash("SHA-1",ab2);
	txt.push(ab2SHA1+" 测试"+(ab2SHA1==abSHA1?"通过":"未通过")+" BlobToBase64");
	
	setResult(tag,txt.join("\n"));
});
addBtn("转成Blob下载",async function(tag){
	if(!getTestAB())return; var ab=getTestAB.ab;
	var blob=new Blob([ab]);
	
	Runtime.LogAudio(blob,-1,{set:{type:"bin"}},tag);
	setResult(tag,"下载链接已显示到下面日志");
});


btns.push({html:"<hr/>"});

addBtn("Base64是pcm，转成Int16Array，再转成mp3",function(tag){
	if(!getTestAB())return; var ab=getTestAB.ab;
	try{ var b64=JsBinary.ArrayBufferToText(ab); }catch(e){ //这是输入的base64字符串（输入框填写、选的文件）
		errResult(tag,"ArrayBufferToText 异常",e); return;
	}
	//base64解码成arrayBuffer
	try{ ab=JsBinary.Base64ToArrayBuffer(b64); }catch(e){
		errResult(tag,"Base64ToArrayBuffer 异常",e); return;
	}
	
	if(ab.byteLength%2){ errResult(tag,"Base64解码后的长度为"+ab.byteLength+"，不是偶数，无法构造成Int16Array"); return; }
	
	//16位pcm二进制数据直接用Int16Array表示即可
	var pcm=new Int16Array(ab);
	
	//pcm转码成mp3
	var sampleRate=+prompt("填写此pcm的采样率","16000")||16000;
	var rec=Recorder({type:"mp3",sampleRate:sampleRate,bitRate:16});
	rec.mock(pcm,sampleRate);
	rec.stop(function(blob,duration){
		Runtime.LogAudio(blob,duration,rec,"已转码");
		setResult(tag,"已转码，mp3已显示到下面日志中");
	},function(err){
		errResult(tag,"转码失败："+err);
	});
});

addBtn("Hex是pcm，转成Int16Array，再转成mp3",function(tag){
	if(!getTestAB())return; var ab=getTestAB.ab;
	try{ var hex=JsBinary.ArrayBufferToText(ab); }catch(e){//这是输入的hex字符串（输入框填写、选的文件）
		errResult(tag,"ArrayBufferToText 异常",e); return;
	}
	//hex解码成arrayBuffer
	try{ ab=JsBinary.HexToArrayBuffer(hex); }catch(e){
		errResult(tag,"HexToArrayBuffer 异常",e); return;
	}
	
	if(ab.byteLength%2){ errResult(tag,"Hex解码后的长度为"+ab.byteLength+"，不是偶数，无法构造成Int16Array"); return; }
	
	//16位pcm二进制数据直接用Int16Array表示即可
	var pcm=new Int16Array(ab);
	
	//pcm转码成mp3
	var sampleRate=+prompt("填写此pcm的采样率","16000")||16000;
	var rec=Recorder({type:"mp3",sampleRate:sampleRate,bitRate:16});
	rec.mock(pcm,sampleRate);
	rec.stop(function(blob,duration){
		Runtime.LogAudio(blob,duration,rec,"已转码");
		setResult(tag,"已转码，mp3已显示到下面日志中");
	},function(err){
		errResult(tag,"转码失败："+err);
	});
});

addBtn("ArrayBuffer是pcm，转成Int16Array，再转成mp3",function(tag){
	if(!getTestAB())return; var ab=getTestAB.ab;
	if(getTestAB.from==1){ errResult(tag,"请清空填写的文本（因为文本优先级更高）"); return; }
	if(ab.byteLength%2){ errResult(tag,"ArrayBuffer的长度为"+ab.byteLength+"，不是偶数，无法构造成Int16Array"); return; }
	
	//16位pcm二进制数据直接用Int16Array表示即可
	var pcm=new Int16Array(ab);
	
	//pcm转码成mp3
	var sampleRate=+prompt("填写此pcm的采样率","16000")||16000;
	var rec=Recorder({type:"mp3",sampleRate:sampleRate,bitRate:16});
	rec.mock(pcm,sampleRate);
	rec.stop(function(blob,duration){
		Runtime.LogAudio(blob,duration,rec,"已转码");
		setResult(tag,"已转码，mp3已显示到下面日志中");
	},function(err){
		errResult(tag,"转码失败："+err);
	});
});
addBtn("ArrayBuffer转文本",function(tag){
	if(!getTestAB())return; var ab=getTestAB.ab;
	if(getTestAB.from==1){ errResult(tag,"请清空填写的文本（因为文本优先级更高）"); return; }
	try{ var txt=JsBinary.ArrayBufferToText(ab); }catch(e){
		errResult(tag,"ArrayBufferToText 异常",e); return;
	}
	setResult(tag,txt);
});
addBtn("文本转ArrayBuffer",function(tag){
	if(!getTestAB())return; var ab=getTestAB.ab;
	if(getTestAB.from!=1){ errResult(tag,"请填写文本"); return; }
	//ab=JsBinary.TextToArrayBuffer("文本"); //getTestAB已经将输入框文本转好了
	setResult(tag,null,ab);
});


btns.push({html:"<hr/>"});
var testIntToHex=function(tag,len,be){
	if(!getTestAB())return; var num=getTestAB.txt;
	if(!num || +num+""!=num){ errResult(tag,"需填写一个整数文本"); return; }
	var ab=JsBinary.NumberToArrayBuffer(+num,len,!!be);
	setResult(tag,JsBinary.ArrayBufferToHex(ab));
};
addBtn("Int32转Hex",function(tag){
	testIntToHex(tag,4,0);
});
addBtn("Int64转Hex",function(tag){
	testIntToHex(tag,8,0);
});
addBtn("Hex转Int*",function(tag){
	if(!getTestAB())return; var ab=getTestAB.ab,hex=getTestAB.txt;
	if(hex) try{ var ab=JsBinary.HexToArrayBuffer(hex); }catch(e){
		errResult(tag,"HexToArrayBuffer 异常",e); return;
	}
	if(ab.byteLength>8){ errResult(tag,"最大支持8字节转Int"); return; }
	setResult(tag,JsBinary.ArrayBufferToNumber(ab));
});
addBtn("Int64转Hex(大端)",function(tag){
	testIntToHex(tag,8,1);
});
addBtn("Hex(大端)转Int*",function(tag){
	if(!getTestAB())return; var ab=getTestAB.ab,hex=getTestAB.txt;
	if(hex) try{ var ab=JsBinary.HexToArrayBuffer(hex); }catch(e){
		errResult(tag,"HexToArrayBuffer 异常",e); return;
	}
	if(ab.byteLength>8){ errResult(tag,"最大支持8字节转Int"); return; }
	setResult(tag,JsBinary.ArrayBufferToNumber(ab,true));
});


btns.push({html:'<hr/> <div class="testResTagBox"></div>'});
addBtn("将结果填入待处理文本",function(tag){
	var val=$(".testInRes").val();
	if(/^<ArrayBuffer> \d+字节 sha1=/.test(val)){
		errResult(tag,"ArrayBuffer结果不支持填写为文本");
		return;
	};
	$(".testInTxt").val(val);
	if(val){
		Runtime.Log("已将结果填入待处理文本",2);
	}else{
		Runtime.Log("结果为空，已清空待处理文本","#ddd");
	}
});
addBtn("将结果设为待处理ArrayBuffer",function(){
	$(".testInTxt").val("");
	if(testLastArrayBuffer){
		setTestAB("从转换结果", testLastArrayBuffer);
	}else{
		Runtime.Log("还没有转换结果，不可以设置",1);
	}
});

//加载录音框架
Runtime.Import([
	{url:RootFolder+"/src/recorder-core.js",check:function(){return !window.Recorder}}
	,{url:RootFolder+"/src/engine/mp3.js",check:function(){return !Recorder.prototype.mp3}}
	,{url:RootFolder+"/src/engine/mp3-engine.js",check:function(){return !Recorder.lamejs}}
]);
//显示控制按钮
Runtime.Ctrls([
	{html:`
		<div>待处理文本和文件二选一，填了文本时优先使用文本：</div>
		<div style="display:flex">
			<div style="flex:1">
				<textarea style="width:100%;height:100%;box-sizing:border-box;"
					class="testInTxt" placeholder="待处理文本"></textarea>
			</div>
			<div class="testChoiceFile" style="flex:1"></div>
		</div>
	`}
	
	,...btns
	
	,{html:`
		<div class="testResTagBox1">转换结果：<span class="testResTag"></span></div>
		<div>
			<textarea style="width:100%;height:100px;box-sizing:border-box;border-color:#ddd"
				class="testInRes" readonly></textarea>
		</div>
	`}
	,{name:"数值转换测试",click:"numberTestClick"}
	,{name:"当前时间Long转8字节",click:"showNowTimeClick"}
	,{choiceFile:{cls:"choiceFile1"
		,multiple:false,name:"",title:"设为待处理ArrayBuffer"
		,process:function(fileName,arrayBuffer,filesCount,fileIdx,endCall){
			setTestAB(fileName, arrayBuffer);
			endCall();
		}
	}}
]);
$(".testChoiceFile").append($(".choiceFile1"));
$(".testResTagBox").append($(".testResTagBox1"));

//当前时间long值
window.showNowTimeClick=function(){
	var now=Date.now();
	var be=JsBinary.NumberToArrayBuffer(now,8,true);
	var beNum=JsBinary.ArrayBufferToNumber(be,true);
	var le=JsBinary.NumberToArrayBuffer(now);
	var leNum=JsBinary.ArrayBufferToNumber(le);
	Runtime.Log("当前时间(大端)："+JsBinary.ArrayBufferToHex(be).toUpperCase()+" -> "+beNum+" "+(beNum==now?"==":"!=")+" "+now);
	Runtime.Log("当前时间(小端)："+JsBinary.ArrayBufferToHex(le).toUpperCase()+" -> "+leNum+" "+(leNum==now?"==":"!=")+" "+now);
};
//各种数值转换，int long两种
window.numberTestClick=function(){
	var run=function(zNum, fNum, len){
		var zAB=JsBinary.NumberToArrayBuffer(zNum,len,true);
		var fAB=JsBinary.NumberToArrayBuffer(fNum,len,true);
		var zVal=JsBinary.ArrayBufferToNumber(zAB,true);
		var fVal=JsBinary.ArrayBufferToNumber(fAB,true);
		Runtime.Log("byte"+len+": "+JsBinary.ArrayBufferToHex(zAB).toUpperCase()+" +"+zNum+(zNum==zVal?'==':'!=')+zVal);
		Runtime.Log("byte"+len+": "+JsBinary.ArrayBufferToHex(fAB).toUpperCase()+" "+(fNum<0?"":"-")+fNum+(fNum==fVal?'==':'!=')+fVal);
		
		var isOF=false, isOk=zNum==zVal && fNum==fVal;
		if(len==4 && typeof(BigInt)!='undefined'){ //计算是否溢出，使用高版本API来验证
			var zOF=new Int32Array(new BigInt64Array([BigInt(zNum)]).buffer)[0];
			var fOF=new Int32Array(new BigInt64Array([BigInt(fNum)]).buffer)[0];
			isOF=zOF==zVal && fOF==fVal;
		}
		Runtime.Log(isOk?"OK":isOF?"溢出 OK":"Error", isOk?2:isOF?"#fa0":1);
	};
	run(+0, -0, 4);
	run(+1, -1, 4);
	run(+1234, -1234, 4);
	run(+123456789, -123456789, 4);
	run(+2147483647, -2147483648, 4); //Integer.MAX_VALUE
	run(+2147483648, -2147483649, 4); //溢出
	run(+2147483648, -2147483649, 8);
	run(+4278190080, -4278190080, 4); //溢出
	run(+4278190080, -4278190080, 8);
	run(+1234567890123456, -1234567890123456, 8);
	run(+9007199254740991, -9007199254740991, 8); //Number.MAX_SAFE_INTEGER
};

})();