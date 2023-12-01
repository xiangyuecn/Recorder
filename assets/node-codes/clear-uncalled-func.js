/**
统计大js文件内没有调用到的函数，统计完成后手工进行清除

运行： node clear-uncalled-func.js [func|ifel]
**/
setTimeout(async ()=>{
	var type=process.argv[2];
	var calls={
		createFunc:{
			desc:"仅生成统计函数调用次数的js文件，使用此文件覆盖原始文件进行调用后即可得出统计数据"
			,exec:createCount
		}
		,func:{
			desc:"调用test-all-type-min.js运行并进行函数调用统计，得到结果后手工去除未调用的函数"
			,exec:callTest
		}
		,ifel:{
			desc:"调用test-all-type-min.js运行并进行if else统计，得到结果后手工去除未调用的分支"
			,exec:async function(){
				IF_EL=true;
				await callTest();
			}
		}
	};
	var call=calls[type];
	if(!call){
		Log("请在脚本后面提供要调用的命令，支持的命令：",1);
		console.log(calls);
		return;
	}
	
	Log(call.desc,2);
	await call.exec();
	Log("=================");
	Log("函数调用统计命令"+type+"执行完成",2);
});

require("./-global-.js");
var fs = require("fs");
var Path = require('path');
var IF_EL=false;

var callTest=async function(){
	await createCount();
	
	global.UseClearCount=true;
	require("./test-all-type.js");
};

var createCount=async function(){
	await createCountExec(SrcDir+"engine/mp3-engine.js");
	await createCountExec(SrcDir+"engine/beta-amr-engine.js");
	await createCountExec(SrcDir+"engine/beta-ogg-engine.js");
};
var createCountExec=async function(file){
	var fileName=Path.basename(file);
	Log("===== 开始处理: "+file+" =====");
	var srcTxt=fs.readFileSync(file,"utf-8");
	
	//屏蔽字符串干扰
	var strArr=[];
	srcTxt=srcTxt.replace(/"(\\"|[^"\r\n])*"/g,function(a){
		strArr.push(a); return "__STR__:"+(strArr.length-1)+":"
	});
	srcTxt=srcTxt.replace(/'(\\'|[^'\r\n])*'/g,function(a){
		strArr.push(a); return "__STR__:"+(strArr.length-1)+":"
	});
	//去掉注释
	srcTxt=srcTxt.replace(/\/\*[\S\s]*?\*\//g,function(t){
		var t3="",t2=t.replace(/\n+/g,""),n=t.length-t2.length;
		for(var i=0;i<n;i++)t3+="\n";
		return t3;
	});
	srcTxt=srcTxt.replace(/\/\/.*$/mg,"");
	//恢复字符串
	srcTxt=srcTxt.replace(/__STR__:(\d+):/g,function(a,b){
		return strArr[+b];
	});
	
	//去掉函数定义里面的换行
	srcTxt=srcTxt.replace(/\([\w,\s]*\n[\w,\s]*\)/g,function(t){
		var t2=t.replace(/\r\n/," ").replace(/\n+/g,""),n=t.length-t2.length;
		for(var i=0;i<n;i++)t2+="\n";
		return t2;
	});
	srcTxt=srcTxt.replace(/\([\w,\s]*\)\s*\n\s*\{/g,function(t){
		var t2=t.replace(/\r\n/," ").replace(/\n+/g,""),n=t.length-t2.length;
		for(var i=0;i<n;i++)t2+="\n";
		return t2;
	});
	
	var lines=srcTxt.split("\n");
	var codes=[],fnMp={},fnCount=0;
	var lineIdx=0;
	var exp=/\bfunction([^\(\{]*)\([^\{]+\{/;
	if(IF_EL) exp=/\b(if|else)(?:(?!switch).)*\{/; //不管没有{的简短分支
	while(lineIdx<lines.length){
		var txt=lines[lineIdx]; lineIdx++;
		var m=exp.exec(txt);
		if(m){
			//寻找}结尾
			var body=0,stack=1,str=txt.substr(m.index+m[0].length);
			f1:for(var i=0;i<lines.length;i++){
				if(i){ str=lines[i]; body++} else i=lineIdx-1;
				var exp2=/\{|\}/g,m2;
				while(m2=exp2.exec(str)){
					if(m2[0]=="{"){ stack++; continue }
					stack--; if(stack==0){ body+=m2.index;break f1; }
				}
				body+=str.length;
			}
			
			fnCount++;
			fnMp[lineIdx]={c:0,n:m[1].trim(),b:body};
			txt=txt.replace(exp,function(a){
				return a+"ClearFunc$Call("+lineIdx+',"'+fileName+'");';
			});
		}
		codes.push(txt);
	}
	
	codes.splice(0,0,`if(!globalThis.ClearFunc$Call){
	globalThis.ClearFunc$Call=function(line,file){
		if(!ClearFunc$Call.open[file])return;
		ClearFunc$Call.mp[file][line].c++;
	}
	ClearFunc$Call.open={};
	ClearFunc$Call.mp={};
};
ClearFunc$Call.mp["${fileName}"]=${JSON.stringify(fnMp)};
`);
	codes.push(`
ClearFunc$Call.open["${fileName}"]=1;
ClearFunc$Call.Save=function(){
	for(var file in ClearFunc$Call.mp){
		var mp=ClearFunc$Call.mp[file];
		var totalCount=0,zeroCount=0,zeroArr=[],hasArr=[];
		for(var k in mp){
			var o={line:+k,val:mp[k].c,name:mp[k].n,body:mp[k].b};
			totalCount++;
			if(!o.val){ zeroCount++; zeroArr.push(o) }
			else hasArr.push(o);
		}
		hasArr.sort((a,b)=>{return a.val-b.val || a.line-b.line});
		
		//没有调用的提取前100个大的排前面
		zeroArr.sort((a,b)=>{return b.body-a.body || a.line-b.line});
		var zeroArr1=[],zeroArr2=[],z100=Math.min(100,~~(zeroArr.length/2));
		var bodyMax1=0,bodyMax2=0;
		for(var i=0;i<zeroArr.length;i++){
			if(i<z100){
				bodyMax1=Math.max(bodyMax1,zeroArr[i].body);
				zeroArr1.push(zeroArr[i]);
			}else{
				bodyMax2=Math.max(bodyMax2,zeroArr[i].body);
				zeroArr2.push(zeroArr[i]);
			}
		}
		zeroArr1.sort((a,b)=>{return a.line-b.line});
		zeroArr2.sort((a,b)=>{return a.line-b.line});
		
		var txts=[];
		var add=function(vals){
			for(var i=0;i<vals.length;i++){
				var o=vals[i];
				txts.push((o.line+"").padStart(6)+" : "
					+(o.val+"").padStart(8).padEnd(12)
					+"B: "+(o.body+"").padStart(6).padEnd(10)
					+"N: "+o.name+"  ");
			}
		}
		txts.push("【前"+z100+"个body最大未调用的函数】"+zeroArr1.length+"个，最大Body值"+bodyMax1);
		add(zeroArr1);
		txts.push("");txts.push("【剩余未调用的函数】"+zeroArr2.length+"个，最大Body值"+bodyMax2);
		add(zeroArr2);
		txts.push("");txts.push("【有调用的函数】"+hasArr.length+"个");
		add(hasArr);
		
		if(typeof(window)=="object"){
			console.log("===函数调用统计："+file+"===");
			console.log("共统计"+totalCount+"个函数，"+zeroCount+"个没有调用");
			console.log(txts.join("\\n"));
		}else{
			var saveFile=ArrayBufferSaveTempFile("clearUncalledFunc/"+file+"-count${IF_EL?'-ifel':''}.txt",Buffer.from(txts.join("\\n")));
			Log("===函数调用统计："+file+"===");
			Log("共统计"+totalCount+"个函数，"+zeroCount+"个没有调用");
			Log("已保存："+saveFile,2);
		}
	}
};
`);
	
	var saveFile=ArrayBufferSaveTempFile("clearUncalledFunc/"+fileName,Buffer.from(codes.join("\n")));
	Log(fnCount+"个函数已注入统计");
	Log("已保存："+saveFile,2);
};
