/*
i18n 简版国际化语言支持，nodejs处理代码
	- 校验源码中 $T 调用正确性
	- 提取源码中的 i18n key，生成对应的语言支持文件（合并已有的翻译，新文字需手动翻译）

src源码如果要增加新语言，请到 i18n 目录内新建一个语言对应的js空文件，然后重新生成语言包，再打开那个js进行手动翻译

页面如果需要增加新语言，请在下面定义好包含的页面文件，并且在assets/page-i18n中创建相应文件夹和语言对应的js空文件，然后重新生成语言包，再打开那个js进行手动翻译

支持从源码中提取的文本：
	- 任何 `$T(` 将会被识别为 $T 调用，包括 xx$T()，不可换行，如果调用参数错误会提示
	- 页面内任何 `reclang=` 将会识别成需要翻译的文本，如：<x reclang="key">中文文本，不允许出现标签，不允许换行</x>
*/
var fs = require("fs");

module.exports=function(){
	var existsKeys={};
	//处理src源码
	Run_src(existsKeys);
	
	//处理demo页面和相关js文件
	console.log("\x1B[33m%s\x1B[0m","开始生成assets的i18n语言包...");
	Run_assets(existsKeys,"index_html",["../index.html"]);
	Run_assets(existsKeys,"widget_donate",["../assets/zdemo.widget.donate.js"]);
	Run_assets(existsKeys,"QuickStart_html",["../QuickStart.html"]);
	Run_assets(existsKeys,"app_index_html",["../app-support-sample/index.html"]);
	Run_assets(existsKeys,"app_QuickStart_html",["../app-support-sample/QuickStart.html"]);
	
	var uniDir="../app-support-sample/demo_UniApp/uni_modules/Recorder-UniCore/";
	var uniPage="../app-support-sample/demo_UniApp/pages/recTest/";
	if(global.UniSupportI18nSrcList){ //额外提供组件路径进行处理
		Run_assets(existsKeys,"Recorder_UniCore",global.UniSupportI18nSrcList,uniDir+"i18n");
	};
	
	//不作使用，仅用于代码检查，这些文件内全部自带翻译
	var checks=[];
	fs.readdirSync("../app-support-sample").forEach((file)=>{
		if(/-config\.js$/i.test(file)) checks.push("../app-support-sample/"+file);
	});
	checks.push(uniPage+"page_i18n.vue");
	checks.push(uniPage+"test_player___.vue");
	Run_assets(existsKeys,"temp_check",checks);
};

var Run_src=function(existsKeys){
	console.log("\x1B[33m%s\x1B[0m","开始生成src的i18n语言包...");
	
	//源文件列表
	var srcFiles=["recorder-core.js"];
	["engine","extensions","app-support"].forEach((dir)=>{
		var arr=[];
		fs.readdirSync(dir).forEach((file)=>{
			arr.push(dir+"/"+file);
		});
		arr.sort();
		srcFiles=srcFiles.concat(arr);
	});
	
	//读取源码中的 $T 文本内容，校验调用是否正确
	var srcFileTexts=[];
	srcFiles.forEach((file)=>{
		var srcTxt=fs.readFileSync(file,"utf-8");
		srcFileTexts.push({
			file:file
			,texts:extractAndCheckSrcFile(file,srcTxt,existsKeys)
		});
	});
	
	//读取要生成的文件列表
	var outFiles=[];
	fs.readdirSync("i18n").forEach((file)=>{
		if(file!="en-US.js") outFiles.push("i18n/"+file);
	});
	
	//生成文件
	var set={
		descKey:"desc$"
	};
	createLangFile(set,"i18n/en-US.js",srcFileTexts,{});
	var srcLocaleEn=createLangFile(set,"i18n/en-US.js",srcFileTexts,{},true);
	outFiles.forEach((file)=>{
		createLangFile(set,file,srcFileTexts,srcLocaleEn);
	});
};


var Run_assets=function(existsKeys,folder,srcFiles,baseDir){
	if(!baseDir)baseDir="../assets/page-i18n/"+folder;
	if(!fs.existsSync(baseDir)){
		fs.mkdirSync(baseDir);
		fs.writeFileSync(baseDir+"/en-US.js","");
	}
	//读取源码中的 $T 文本内容，校验调用是否正确
	var srcFileTexts=[];
	srcFiles.forEach((file)=>{
		var srcTxt=fs.readFileSync(file,"utf-8");
		srcFileTexts.push({
			file:file
			,texts:extractAndCheckHtmlFile(file,srcTxt,existsKeys)
		});
	});
	
	//读取要生成的文件列表
	var outFiles=[];
	fs.readdirSync(baseDir).forEach((file)=>{
		if(file!="en-US.js") outFiles.push(baseDir+"/"+file);
	});
	
	//生成文件
	var set={
		isPage:true
		,pageFolder:folder
		,descKey:"desc-page-"+folder+"$"
	};
	createLangFile(set,baseDir+"/en-US.js",srcFileTexts,{});
	var srcLocaleEn=createLangFile(set,baseDir+"/en-US.js",srcFileTexts,{},true);
	outFiles.forEach((file)=>{
		createLangFile(set,file,srcFileTexts,srcLocaleEn);
	});
};



var extractAndCheckHtmlFile=function(file,srcTxt,existsKeys){
	//html文本中的 reclang 转换成 $T 形式
	var lines=srcTxt.split("\n");
	for(var iL=0;iL<lines.length;iL++){
		var tag=file+" 第"+(iL+1)+"行的reclang：";
		var tArr=lines[iL].split(/reclang=/);
		var texts=[]; texts.push(tArr[0]);
for(var iT=1;iT<tArr.length;iT++){
	var code=tArr[iT];
	var m=/^(['"])([^>]+)\1([^>]*)>([^<]*)(<\/\w+>)/.exec(code);
	if(!m)throw new Error(tag+'格式不匹配 '+code);
	var key=m[2],txt=m[4];
	texts.push("reclang="+m[1]+m[2]+m[1]+m[3]+">");
	texts.push(' $T('+WrapStr(key+"::"+txt)+') ');
	texts.push(m[5]+code.substr(m[0].length));
}
		lines[iL]=texts.join("")
	}
	
	srcTxt=lines.join("\n");
	return extractAndCheckSrcFile(file,srcTxt,existsKeys);
};
var extractAndCheckSrcFile=function(file,srcTxt,existsKeys){
	var lines=srcTxt.split("\n"),allTexts=[];
	for(var iL=0;iL<lines.length;iL++){
		var tag=file+" 第"+(iL+1)+"行的$T：";
		var tArr=lines[iL].split(/\$T\(/);
for(var iT=1;iT<tArr.length;iT++){
	var code=tArr[iT].trim(),rawCode="$T"+"("+code,texts=[];
	
	//第一个字符串
	var m1=/^(['"])([\w\-]+):([\w\-]*):/.exec(code);
	if(!m1)throw new Error(tag+'不是 $T("key:lang:text" 形式');
	var key=m1[2],lang=m1[3]||"zh";
	if(lang!="zh")throw new Error(tag+'第一个字符串lang不是zh');
	if(existsKeys[key])throw new Error(tag+'key已存在：'+key);
	existsKeys[key]=1;
	
	var tEnd=code.indexOf(m1[1],1);
	if(tEnd<1)throw new Error(tag+'第一个字符串不在一行闭合');
	texts.push({txt:code.substring(m1[0].length,tEnd),lang:lang});
	code=code.substr(tEnd+1).trim();
	
	//提取后面的字符串
	var hasArgs=true,strN=0;
	while(true){
		strN++;
		if(code[0]==")"){
			hasArgs=false;
			break; //没有更多文本和参数
		}else if(!code||code[0]!=","){
			throw new Error(tag+'第'+strN+'个字符串后面不是 ,或) 结尾');
		}else{
			code=code.substr(1).trim();
			if(/^\d/.test(code)){
				break; //后面是变量
			}else if(/^['"]/.test(code)){
				//后面是字符串
				var m2=/^(['"])([\w\-]*):/.exec(code);
				if(!m2)throw new Error(tag+'第'+(strN+1)+'个字符串不是 "lang:text" 格式');
				var lang=m2[2];
				if(strN==1){
					lang=lang||"en";
					if(lang!="en")console.log("\x1B[33m%s\x1B[0m",tag+'第2个字符串lang不是en');
				}else if(!lang){
					throw new Error(tag+'第'+(strN+1)+'个字符串必须提供lang');
				}
				
				var tEnd=code.indexOf(m2[1],1);
				if(tEnd<1)throw new Error(tag+'第'+(strN+1)+'个字符串不在一行闭合');
				texts.push({txt:code.substring(m2[0].length,tEnd),lang:lang});
				code=code.substr(tEnd+1).trim();
			}else{
				throw new Error(tag+'第'+strN+'个字符串后面这个参数未知格式');
			}
		}
	}
	
	//有变量
	var argsLen=0;
	if(hasArgs){
		while(/\([^\)]*\)/.test(code)){//去掉成对的括号
			code=code.replace(/\([^\)]*\)/," ");
		}
		var cEnd=code.indexOf(")");
		if(cEnd<1)throw new Error(tag+"函数调用未闭合");
		
		code=code.substring(0,cEnd).trim();
		var arr=code.split(",");
		if(arr.length==1){//指定了数量，这种只返回key不传args
			if(+arr[0]+""!==arr[0])throw new Error(tag+"文本后面的参数不是一个数字（只返回key）");
			if(+arr[0]<1)throw new Error(tag+"文本后面的参数数量值不能小于1（只返回key）");
			argsLen=+arr[0];
		}else{
			if(arr[0]!=="0")throw new Error(tag+"文本后面的参数必须是一个0，0后面再放args");
			argsLen=arr.length-1;
		}
	}
	//计算文本中的变量是否一致
	for(var i=0;i<texts.length;i++){
		var txt=texts[i].txt;
		var err=CheckTxtArgsLen(txt,argsLen);
		if(err)throw new Error(tag+err);
	}
	
	//提取完成
	allTexts.push({
		key:key,argsLen:argsLen
		,lineNo:iL+1,rawCode:rawCode
		,texts:texts
	});
}
	};
	return allTexts;
}


var CheckTxtArgsLen=function(txt,argsLen){
	var mps={},nums=[],exp=/\{(\d+)(\!?)\}/g,m;
	while(m=exp.exec(txt)) mps[m[1]]=1;
	for(var k in mps)nums.push(+k);
	nums.sort();
	if(nums.length!=argsLen)return "参数数量不一致";
	if(argsLen && argsLen!=nums[nums.length-1])return "参数位置的最大值不一致";
	for(var j=1;j<nums.length;j++){
		if(nums[j]-1!=nums[j-1]) return "字符串中参数位置不连续";
	}
	return "";
};
var WrapStr=function(str){
	str=(str==null?"":str)+"";
	str=str.replace(/\\/g,"\\\\");
	str=str.replace(/\n/g,"\\n");
	if(/"/.test(str)){
		if(str.indexOf("'")+1) throw new Error("WrapStr ': "+str);
		return "'"+str+"'"
	}
	if(str.indexOf("\"")+1) throw new Error("WrapStr \": "+str);
	return '"'+str+'"';
}

var createLangFile=function(config,file,srcFileTexts,srcLocaleEn,readLocale){
	var tag="生成文件["+file+"]：";
	var PageHide=config.isPage?"//@@Exec ":"";
	
	var oldTxt=fs.readFileSync(file,"utf-8"),oldCode=oldTxt,oldTxt1="",oldTxt2="";
	var m=/\/\/@@User Code-1 Begin.+?@@([\S\s]+)\/\/@@User Code-1 End.+?@@/.exec(oldTxt);
	if(m){
		oldCode=oldTxt.substring(0,m.index);
		oldCode+=new Array(m[1].split("\n").length).join("\n");//保持行数
		oldCode+=oldTxt.substring(m.index+m[0].length);
		oldTxt=oldCode;
		oldTxt1=m[1].trim();
	}
	var m=/\/\/@@User Code-2 Begin.+?@@([\S\s]+)\/\/@@User Code-2 End.+?@@/.exec(oldTxt);
	if(m){
		oldCode=oldTxt.substring(0,m.index);
		oldCode+=new Array(m[1].split("\n").length).join("\n");
		oldCode+=oldTxt.substring(m.index+m[0].length);
		oldTxt=oldCode;
		oldTxt2=m[1].trim();
	}
	
	//提供临时环境，提取出老的数据
	var Recorder={CLog:function(){}},localeCur={},localeZh={},localeOk={};
	Object.Recorder=Recorder;
	var i18n=Recorder.i18n={
		lang:(/([^\/\\]+)\.js$/i.exec(file)||[])[1]||""
		,alias:{},data:{}
		,put:function(set,texts){
			i18n.lang=set.lang;
			for(var i=0;i<texts.length;i++){
				var v=texts[i],zhTxt="",okTxt="";
				if(!v && i==0)continue;
				if(v===9){
					i++; v=texts[i];
					zhTxt=v;
					i++; v=texts[i];
				}
				if(v===8){
					i++; v=texts[i];
					i++; v=texts[i];
				}
				if(v===7){
					i++; v=texts[i];
					okTxt=v;
					i++; v=texts[i];
				}
				
				var m=/^([\w\-]+):/.exec(v);
				if(!m)throw new Error("无法提取key："+v);
				var key=m[1],v=v.substr(key.length+1);
				localeCur[key]=v;
				localeZh[key]=zhTxt;
				localeOk[key]=okTxt;
			}
		}
	};
	try{
		oldCode=oldCode.replace(/\/\/@@Exec/g," ");
		oldCode=oldCode.replace(/\/\/@@PutList/g,"''");
		oldCode=oldCode.replace(/\/\/@@Put0/g,",");
		oldCode=oldCode.replace(/\/\/@@zh=/g,",9,");
		oldCode=oldCode.replace(/\/\/@@en=/g,",8,");
		oldCode=oldCode.replace(/\/\/@@OK=/g,",7,");
		oldCode+="\n//@ sourceURL="+file;
		eval(oldCode); //unsafe?
	}catch(e){
		console.log("\x1B[31m%s\x1B[0m",tag+"执行老文件中的内容失败");
		console.error(e);
		throw new Error(tag+"执行老文件中的内容失败");
	};
	if(readLocale){
		return localeCur;
	};
	
	var desc=((/(.+?)。/.exec(i18n.data[config.descKey+i18n.lang])||[])[1]||"-").substr(0,50);
	var langs=[];
	for(var k in i18n.alias) langs.push('"'+k+'"');
	langs.push('"'+i18n.lang+'"');
	
	//生成新文件内容
	var codes=[];
	codes.push(
`/*
Recorder ${file}
https://github.com/xiangyuecn/Recorder

Usage: Recorder.i18n.lang=${langs.join(" or ")}

Desc: ${i18n.data[config.descKey+i18n.lang]||""}

注意：请勿修改//@@打头的文本行；以下代码结构由/src/package-i18n.js自动生成，只允许在字符串中填写翻译后的文本，请勿改变代码结构；翻译的文本如果需要明确的空值，请填写"=Empty"；文本中的变量用{n}表示（n代表第几个变量），所有变量必须都出现至少一次，如果不要某变量用{n!}表示

Note: Do not modify the text lines starting with //@@; The following code structure is automatically generated by /src/package-i18n.js, only the translated text is allowed to be filled in the string, please do not change the code structure; If the translated text requires an explicit empty value, please fill in "=Empty"; Variables in the text are represented by {n} (n represents the number of variables), all variables must appear at least once, if a variable is not required, it is represented by {n!}
*/
(function(factory){
	var browser=typeof window=="object" && !!window.document;
	var win=browser?window:Object; //非浏览器环境，Recorder挂载在Object下面
	factory(win.Recorder,browser);
}(function(Recorder,isBrowser){
"use strict";
var i18n=Recorder.i18n;
`);
	codes.push('//@@User Code-1 Begin 手写代码放这里 Put the handwritten code here @@');
	codes.push(oldTxt1);
	codes.push('//@@User Code-1 End @@');
	
	codes.push('');
	codes.push('//@@Exec i18n.lang='+langs[0]+';');
	if(PageHide){
		codes.push('Recorder.CLog(\'Import Page['+config.pageFolder+'] lang='+langs[0]+'\');');
	}else{
		codes.push('Recorder.CLog(\'Import Recorder i18n lang='+langs[0]+'\');');
	}
	
	codes.push('');
	var hasAlias=0;
	for(var k in i18n.alias){
		hasAlias=1;
		codes.push(PageHide+'i18n.alias["'+k+'"]="'+i18n.alias[k]+'";');
	};
	if(!hasAlias){
		codes.push((PageHide||"")+'//i18n.alias["other-lang-key"]="'+i18n.lang+'";');
	};
	
	codes.push('');
	codes.push('var putSet={lang:"'+i18n.lang+'"};');
	
	codes.push('');
	codes.push(PageHide+'i18n.data["rtl$'+i18n.lang+'"]='+(!!i18n.data["rtl$"+i18n.lang])+';');
	codes.push('i18n.data["'+config.descKey+i18n.lang+'"]='+WrapStr(i18n.data[config.descKey+i18n.lang]||"")+';');
	codes.push('//@@Exec i18n.GenerateDisplayEnglish='+(i18n.GenerateDisplayEnglish?"true":"false")+';');
	
	var iF=0,totalCount=0,emptyCount=0,clearCount=0;
	if(file.indexOf("zh-CN.js")+1){ //中文无需翻译
		iF=srcFileTexts.length;
		codes.push('//@@Exec i18n.put(putSet,[]);');
	};
	for(;iF<srcFileTexts.length;iF++){
		var srcFile=srcFileTexts[iF].file;
		var allTexts=srcFileTexts[iF].texts;
		if(!allTexts.length)continue;
		
		codes.push('');
		codes.push('');
		codes.push('');
		codes.push('//*************** Begin srcFile='+srcFile+' ***************');
		codes.push('i18n.put(putSet,');
		codes.push('[ //@@PutList ');
		for(var tF=0;tF<allTexts.length;tF++){
			//源文件中的文本数据
			var keyItem=allTexts[tF],key=keyItem.key,argsLen=keyItem.argsLen;
			var texts=keyItem.texts,zhTxt="",okTxt="";
			for(var i=0;i<texts.length;i++){
				var o=texts[i];
				if(o.lang=="zh")zhTxt=o.txt;
				if(o.lang==i18n.lang)okTxt=o.txt;
			}
			//源文件数据保持到语言文件中
			codes.push('');
			codes.push('//@@zh='+WrapStr(zhTxt));
			if(i18n.GenerateDisplayEnglish){
				codes.push('//@@en='+WrapStr(srcLocaleEn[key]||""));
			}
			if(okTxt){
				codes.push('//@@OK='+WrapStr(okTxt));
			}
			//从老文件中提取出有效的翻译结果
			var curTxt="";
			if(localeCur[key] && localeZh[key]==zhTxt){//有老结果，且新老源文字相同
				if(!localeOk[key] || localeOk[key]==okTxt){//有老源的翻译，新源未变更，如果新的变更了就直接丢弃老的
					curTxt=localeCur[key];
				}
			}
			if(curTxt){//校验参数个数是否正确
				var err=CheckTxtArgsLen(curTxt,argsLen);
				if(err)curTxt="";
			}
			if(!curTxt && localeCur[key]) clearCount++;
			curTxt=curTxt||okTxt;
			if(!curTxt) emptyCount++;
			totalCount++;
			
			if(!tF)codes.push('//@@Put0');
			codes.push(
				(tF?',':' ')
				+('"'+key+':"+ //'+(argsLen?"args: {1}"+(argsLen>1?"-{"+argsLen+"}":""):"no args")+'\n')
				+"       "+WrapStr(curTxt)
				+(curTxt?"":" /** TODO: translate to "+i18n.lang+" **/")
			);
		}
		codes.push('');
		codes.push(']);');
		codes.push('//*************** End srcFile='+srcFile+' ***************');
	}
	
	codes.push('');
	codes.push('//@@User Code-2 Begin 手写代码放这里 Put the handwritten code here @@');
	codes.push(oldTxt2);
	codes.push('//@@User Code-2 End @@');
	codes.push('');
	codes.push('}));');
	
	fs.writeFileSync(file,codes.join("\n"));
	if(/Template.js$/.test(file))emptyCount=0;
	console.log("已生成："+file
		+(emptyCount?"，\x1B[31m有"+emptyCount+"条未翻译\x1B[0m":"，OK")
		+(clearCount?"，有"+clearCount+"条因变更重置":"")
		+"      "+totalCount+" | "+i18n.lang+" |"+desc);
};

