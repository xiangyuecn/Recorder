/**
压缩Emscripten编译出来的静态内存初始化代码，减小js文件体积
	- 使用63或127或255个词的压缩字典，2字节表达一个字典替换位置（63: 10bit标识符，6bit索引位置；127: 9bit标识符，7bit索引位置；255: 8bit标识符，8bit索引位置）
	- 不压缩、字典压缩压缩，取最小的作为最终结果
**/
setTimeout(async ()=>{
	await run("./temp/emcc-zip-amr-engine.js");
	await run("./temp/emcc-zip-engine-ogg.js");
	Log("=================");
	Log("压缩完成，请打开生成的js，复制代码到相应源文件中进行替换",2);
});

require("./-global-.js");
var fs = require("fs");
var run=async function(file){
	Log("===== 开始处理: "+file+" =====");
	var srcTxt=fs.readFileSync(file,"utf-8");
	var allocateList=[],listSize=0,srcLen=0,useZipCount=0;
	var exp=/^[\r\n]*((?:\s*|\s*\/\*.*?\*\/\s*)allocate\()(\[[^\]]+\])(.+;\s*)[\r\n]*$/mg,m;
	while(m=exp.exec(srcTxt)){
		var bytes=eval(m[2]);
		for(var i=0;i<bytes.length;i++){
			var v=bytes[i];
			if(typeof(v)!="number" || v<0 || v>255){
				throw new Error("第"+(allocateList.length+1)+"个allocate，数字"+v+"无效");
			}
		}
		srcLen+=m[0].length;
		
		var useZip=!(m[2].length<100 || m[2].length<bytes.length/3*4); //base64之后更大了，就不要压缩
		allocateList.push({
			bytes:bytes,match:["",m[1],m[2],m[3]]
			,offset:useZip?listSize:-1,useZip:useZip
		});
		if(useZip){
			listSize+=bytes.length;
			useZipCount++;
		}
	}
	Log("发现"+(allocateList.length)+"个allocate调用，"+useZipCount+"个需要压缩，"+srcLen+"字节，正在压缩...");
	
	var srcBytes=new Uint8Array(listSize);
	for(var i=0,n=0;i<allocateList.length;i++){
		var v=allocateList[i];
		if(v.useZip){
			srcBytes.set(v.bytes,n); n+=v.bytes.length;
		}
	}
	
	var zipNone=warpNone(allocateList);
	Log("zipNone: "+zipNone.length+"字节 压缩率: "+(zipNone.length/srcLen*100).toFixed(2)+"%");
	var save=zipNone,saveName="zipNone",saveZip=null;
	
	var zip63Obj=Zip(srcBytes,6);
	var zip63=warpZip(allocateList,zip63Obj);
	Log("  zip63: "+zip63.length+"字节 压缩率: "+(zip63.length/srcLen*100).toFixed(2)+"%");
	if(zip63.length<save.length) { save=zip63; saveName="zip63"; saveZip=zip63Obj; }
	
	var zip127Obj=Zip(srcBytes,7);
	var zip127=warpZip(allocateList,zip127Obj);
	Log(" zip127: "+zip127.length+"字节 压缩率: "+(zip127.length/srcLen*100).toFixed(2)+"%");
	if(zip127.length<save.length) { save=zip127; saveName="zip127"; saveZip=zip127Obj; }
	
	var zip255Obj=Zip(srcBytes,8);
	var zip255=warpZip(allocateList,zip255Obj);
	Log(" zip255: "+zip255.length+"字节 压缩率: "+(zip255.length/srcLen*100).toFixed(2)+"%");
	if(zip255.length<save.length) { save=zip255; saveName="zip255"; saveZip=zip255Obj; }
	
	var saveBytes=save;
	if(saveZip){
		var addStr=["\n\n\n\n"];
		addStr.push("b0信息：");
		addStr.push(JSON.stringify(saveZip.b0Info)); addStr.push("");
		addStr.push("字典统计信息：\n[");
		for(var i=0;i<saveZip.bsInfo.length;i++){
			addStr.push("\t"+(i?",":" ")+JSON.stringify(saveZip.bsInfo[i]));
		}
		addStr.push("];"); addStr.push("");
		
		var addBytes=Text2Bytes(addStr.join("\n"));
		var buf=new Uint8Array(save.length+addBytes.length);
		buf.set(save);
		buf.set(addBytes,save.length);
		saveBytes=buf;
	}
	
	var saveFile=file+"-zip.js";
	fs.writeFileSync(saveFile, Buffer.from(saveBytes.buffer));
	Log("使用"+saveName+" "+save.length+"字节  压缩率: "+(save.length/srcLen*100).toFixed(2)+"%，已保存"+saveFile,2);
};

var warpNone=function(list){
var codes=[`Module.b64Dec=function(str){//本代码由assets/node-codes/emcc-memory-zip.js生成
	//低版本Worker里面没有atob https://developer.mozilla.org/en-US/docs/Web/API/atob
	var s=atob(str),a=new Uint8Array(s.length);
	for(var i=0;i<s.length;i++)a[i]=s.charCodeAt(i);
	return a;
};`];
	for(var i0=0;i0<list.length;i0++){
		var item=list[i0],m=item.match;
		var b64='Module.b64Dec("'+Bytes2B64(item.bytes)+'")';
		if(b64.length>m[2].length){
			b64=m[2];//base64之后更大了，保持原样
		}
		codes.push(m[1]+b64+m[3]);
	}
	return Text2Bytes(codes.join("\n"));
};
var warpZip=function(list,zip){
var codes=[`Module.b64Zip="${zip.b64}";
Module.b64Dic=${JSON.stringify(zip.dic)};
Module.b64Bytes=0;
//本代码由assets/node-codes/emcc-memory-zip.js生成，强力压缩Emscripten编译出来的静态内存初始化数据
//低版本Worker里面没有atob https://developer.mozilla.org/en-US/docs/Web/API/atob
Module.b64UnZip=${UnZip.toString()};
if(!Module.b64Bytes)Module.b64Bytes=Module.b64UnZip(Module.b64Zip,Module.b64Dic);
Module.b64Val=function(offset,size){
	if(offset+size>Module.b64Bytes.length)throw "b64Val OB";
	return Module.b64Bytes.subarray(offset,offset+size);
};`];
	for(var i0=0;i0<list.length;i0++){
		var item=list[i0],m=item.match;
		var b64=m[2];
		if(item.useZip){
			b64='Module.b64Val('+item.offset+','+item.bytes.length+')';
		}
		codes.push(m[1]+b64+m[3]);
	}
	return Text2Bytes(codes.join("\n"));
};




//=========简单压缩实现=============
var Zip=function(bytes,bits){
	var dic={
		size:bytes.length //解压数据总长度
		, bits:bits //标识符索引值比特数，6、7、8
		, b0:-1 //选取作为标识的一个数，占用一个字节，为出现次数最少的一个数
		, bs:[] //0-255:[] 标识符数值对应的字节内容，数组长度不定
	};
	if(bits!=6 && bits!=7 && bits!=8) throw "bits: "+bits;
	var b2=(bits==8?0:bits==7?128:192)-1;// 0b00000000 0b10000000 0b11000000，标识符第二个字节必须大于这个值
	var mask=bits==8?255:bits==7?127:63;// 0b11111111 0b1111111 0b111111，标识符第二个字节索引值mask
	
	//生成字典树
	var tree=new TrieNode('',0,null),allNode=[];
	var MaxDeep=15;//搜索最大字节长度
	var deepStack=[],byteMp={};
	for(var i=0;i<=0xff;i++)byteMp[i]=0;
	for(var i=0;i<bytes.length;i++){
		var v=bytes[i]; byteMp[v]+=1;
		if(deepStack.length>=MaxDeep)deepStack.shift();
		for(var j=0;j<deepStack.length;j++){
			var node=deepStack[j].put(v);
			if(node.hit==null){node.hit=0;allNode.push(node);}
			node.hit++;
			deepStack[j]=node;
		}
		var node=tree.put(v);
		if(node.hit==null){node.hit=0;allNode.push(node);}
		node.hit++;
		deepStack.push(node);
	}
	//出现次数最少的一个字节
	var byteMinCount=bytes.length;
	for(var k in byteMp){
		if(byteMp[k]<byteMinCount){
			dic.b0=+k; byteMinCount=byteMp[k]
		}
	}
	tree.put(dic.b0);
	//console.log("zip"+mask+"选中"+dic.b0+"作为标识符，出现次数："+byteMinCount);
	
	//找到压缩率最高的字节串
	var topNode=[];
TopLoop: for(var TopLoop=0;TopLoop<2;TopLoop++){
	var allLink=[];
	for(var i=0;i<allNode.length;i++){
		var node=allNode[i];
		node.cpHit=node.hit;
		node.cpNum=node.cpHit*(node.deep-2);
		delete node.isEnd;
		delete node.cpIdx;
		if(node.childCount==0){
			var link=[],p=node;
			while(p){
				link.push(p);
				p=p.parent;
			}
			allLink.push(link);
		}
	}
	if(TopLoop==0){
		//b0 添加到开头
		var b0Node=tree.childs[dic.b0]; topNode.push(b0Node);
	}
	while(TopLoop==0){//每次从所有链中选一个最高的，直到选够数量
		var maxCpNum=0,maxNode=null,maxLink=null;
		for(var i=0;i<allLink.length;i++){
			var link=allLink[i];
			for(var j=link.length-1;j>=0;j--){
				var node=link[j];
				if(node.isEnd)break;//子级节点全部丢弃
				if(node.cpHit>1 && node.deep>2 && node.cpNum>maxCpNum){
					maxCpNum=node.cpNum;
					maxNode=node;
					maxLink=link;
				}
			}
		}
		if(!maxCpNum)break;
		topNode.push(maxNode);
		maxNode.isEnd=1;
		
		//减掉上级路径元素的权重
		var link=maxLink;
		for(var j=link.length-1;j>=0;j--){
			var node=link[j];
			if(node.isEnd)break;
			node.cpHit=node.cpHit-maxNode.cpHit;
			node.cpNum=node.cpHit*(node.deep-2);
		}
		
		if(topNode.length>mask*2)break;//够数了
	};
	//将这些字节串存入字典，分配编号
	dic.bs=[];
	for(var i=0;i<topNode.length;i++){
		var node=topNode[i];
		node.cpIdx=i;
		node.isEnd=1;
		
		//计算出完整路径
		var vals=[],p=node;
		while(p){ vals.push(p.val); p=p.parent; }
		vals.reverse();
		
		dic.bs[i]=vals;
	}
	if(isWeb)console.log(tree,topNode);
	
	//对数据进行编码
	var hitCounts={};
	var outBuf=new Uint8Array(bytes.length*2),outOffset=0;
	for(var i=0,prevIsB0=false;i<bytes.length;i++){
		//先匹配到最大长度的字节串
		var lastNode=tree,findNode=null;
		for(var j=i;j<bytes.length;j++){
			var v=bytes[j];
			lastNode=lastNode.childs[v];
			if(!lastNode)break;
			if(lastNode.isEnd)findNode=lastNode;
		};
		if(findNode!=null){
			i+=findNode.deep-1;
			if(prevIsB0) outBuf[outOffset++]=b0Node.cpIdx+b2+1;
			outBuf[outOffset++]=dic.b0;
			outBuf[outOffset++]=findNode.cpIdx+b2+1;
			prevIsB0=false;
			hitCounts[findNode.cpIdx]=(hitCounts[findNode.cpIdx]||0)+1;
			continue;
		};
		var v=bytes[i];
		//没有匹配，进行单个字节编码
		if(v==dic.b0){//单字节和后一字节刚好凑成标识符，这字节进行转义处理
			var v2=bytes[i+1]||0;
			if(v2>b2){
				if(prevIsB0) outBuf[outOffset++]=b0Node.cpIdx+b2+1;
				outBuf[outOffset++]=dic.b0;
				outBuf[outOffset++]=b0Node.cpIdx+b2+1;
				prevIsB0=false;
				continue;
			}
		}
		prevIsB0=v==dic.b0;
		outBuf[outOffset++]=v;
	};
	
	//统计字节串使用次数
	var bsInfo=[];
	for(var i=0;i<dic.bs.length;i++){
		bsInfo.push({ i:i,count:hitCounts[i]||0,bs:dic.bs[i] });
	}
	bsInfo.sort(function(a,b){return b.count-a.count});
	var b0Info={b0:dic.b0,count:byteMinCount,size:bytes.length};
	
	//重新计算压缩率最高的字节串，取够mask数量的值
	if(TopLoop==0){
		for(var i=0;i<bsInfo.length;i++){
			var o=bsInfo[i];
			o.num=o.count*(o.bs.length-2);
		}
		bsInfo.sort(function(a,b){return b.num-a.num});
		var arr=[topNode[0]];
		for(var i=1;i<=mask;i++){
			var o=topNode[bsInfo[i-1].i];
			if(o&&o!=arr[0])arr.push(o);
		}
		topNode=arr;
	}
}; //End TopLoop
	
	//测试能否正常解压
	var b64=Bytes2B64(outBuf.subarray(0,outOffset));
	var unzip=UnZip(b64,dic);
	if(!BytesEq(bytes,unzip)){
		console.log(bytes.length,unzip.length,BytesEq.index,dic.b0);
		console.log(bytes.subarray(BytesEq.index,BytesEq.index+10));
		console.log(unzip.subarray(BytesEq.index,BytesEq.index+10));
		console.warn("解压后的数据和原始数据不一致");
	}
	
	return {b64:b64,dic:dic,bsInfo:bsInfo,b0Info:b0Info}
};
//字典数节点
var TrieNode=function(val,deep,parent){
	this.childs={};
	this.childCount=0;
	this.parent=parent&&parent.deep?parent:null;
	this.val=val;
	this.deep=deep;
};
TrieNode.prototype={
	put:function(val){
		var cur=this.childs[val];
		if(!cur){
			cur=new TrieNode(val,this.deep+1,this);
			this.childs[val]=cur;
			this.childCount++;
		}
		return cur;
	}
};

var Bytes2B64=function(arr){
	var str="";
	for(var i=0;i<arr.length;i++)str+=String.fromCharCode(arr[i]);
	return btoa(str);
};
var Text2Bytes=function(txt){
	var str=unescape(encodeURIComponent(txt)),bytes=new Uint8Array(str.length);
	for(var i=0;i<str.length;i++)bytes[i]=str.charCodeAt(i);
	return bytes;
};
var BytesEq=function(a,b){
	BytesEq.index=-1;
	if(a.length!=b.length)return false;
	for(var i=0;i<a.length;i++){
		if(a[i]!=b[i]){
			BytesEq.index=i;
			return false;
		}
	}
	return true;
};


//实现解压
var UnZip=function(b64,dic){
	var b0=dic.b0,bits=dic.bits,b2=(bits==8?0:bits==7?128:192)-1,mask=bits==8?255:bits==7?127:63;
	var s=atob(b64),buf=new Uint8Array(dic.size),n=0;
	for(var i=0;i<s.length;i++){
		var v=s.charCodeAt(i);
		if(v==b0){
			var v2=s.charCodeAt(i+1)||0;
			if(v2>b2){//查找字典替换
				var iD=v2&mask,vD=dic.bs[iD];
				for(var j=0;j<vD.length;j++){
					buf[n++]=vD[j];
				}
				i++; continue;
			}
		}
		buf[n++]=v;
	}
	return buf;
};


//丢到浏览器测试
var isWeb=typeof window=="object";
if(isWeb){
	var bytes=[1,2,3, 1,2,3, 1,2,3, 1,2,3, 1,2,3, 0,9,0 ,4,5,6 ,4,5,6 ,0,8,0 ,5,6,7,8 ,5,6,7,8 ,5,6,7,8];
	var zip=Zip(bytes,6);
	console.log(zip);
	var unzip=UnZip(zip.b64,zip.dic);
	var isOk=BytesEq(bytes,unzip);
	if(isOk){
		console.log("解压成功");
	}else{
		console.error("解压失败");
		console.log(bytes,unzip);
	}
}
//=========Zip End=============
