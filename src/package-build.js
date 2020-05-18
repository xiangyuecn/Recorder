/*
js压缩合并用的nodejs代码

源码内支持编译指令（去掉*前后的空格）：
	```
	/ *=:=* /
		源码时执行的js代码
	/ *<@
		编译后执行的js代码
	@>* /
	```
*/

var fs = require("fs");
var crypto = require('crypto');
var UglifyJS = require("uglify-js");

console.log("\x1B[32m%s\x1B[0m","请选择操作：(1)压缩js (2)生成npm包 (回车)所有");
process.stdin.on('data',function(input){
	input=input.toString().trim();
	if(!input||input=="1"){
		Run_minify();
	};
	if(!input||input=="2"){
		Run_npm();
	};
	console.log("\x1B[33m%s\x1B[0m","程序已退出");
	process.exit();
});




function Run_minify(){
	deleteFolder("../dist");
	!fs.existsSync("../dist")&&fs.mkdirSync("../dist");
	fs.mkdirSync("../dist/engine");
	fs.mkdirSync("../dist/extensions");
	fs.mkdirSync("../dist/app-support");

	console.log("\x1B[33m%s\x1B[0m","开始minify处理文件...");

	minify("../dist/app-support/app.js",["app-support/app.js","app-support/app-ios-weixin-support.js","app-support/app-native-support.js"]);


	minify("../recorder.mp3.min.js",["recorder-core.js","engine/mp3.js","engine/mp3-engine.js"]);
	minify("../recorder.wav.min.js",["recorder-core.js","engine/wav.js"]);

	minify("../dist/recorder-core.js",["recorder-core.js"]);
	minify("../dist/engine/mp3.js",["engine/mp3.js","engine/mp3-engine.js"]);
	minify("../dist/engine/wav.js",["engine/wav.js"]);

	minify("../dist/engine/beta-webm.js",["engine/beta-webm.js"]);
	minify("../dist/engine/beta-ogg.js",["engine/beta-ogg.js","engine/beta-ogg-engine.js"]);
	minify("../dist/engine/beta-amr.js",["engine/beta-amr.js","engine/beta-amr-engine.js","engine/wav.js"]);

	minify("../dist/extensions/waveview.js",["extensions/waveview.js"]);
	minify("../dist/extensions/wavesurfer.view.js",["extensions/wavesurfer.view.js"]);
	minify("../dist/extensions/lib.fft.js",["extensions/lib.fft.js"]);
	minify("../dist/extensions/frequency.histogram.view.js",["extensions/frequency.histogram.view.js"]);
	minify("../dist/extensions/sonic.js",["extensions/sonic.js"]);

	console.log("\x1B[33m%s\x1B[0m","处理完成");
};


function minify(output,srcs){
	console.log("正在生成"+output);
	var codes=[];
	for(var i=0;i<srcs.length;i++){
		codes.push(fs.readFileSync(srcs[i],"utf-8"));
	};
	var code=codes.join("\n").replace(
		/\/\*=:=\*\/([\S\s]+?)\/\*<@([\S\s]+?)@>\*\//g
		,function(a,b,c){
			console.log("*******使用编译指令：\n"+a+"\n\n");
			return c;
		});
	
	var res=UglifyJS.minify(code);
	if(res.error){
		throw new Error(res.error);
	};
	
	code=
`/*
录音
https://github.com/xiangyuecn/Recorder
src: ${srcs.join(",")}
*/
`;
	code+=res.code;
	fs.writeFileSync(output,code);
};






function deleteFolder(path,deep){
	if(fs.existsSync(path)){
		var files=fs.readdirSync(path);
		files.forEach(function(file){
			var p=path+"/"+file;
			if(fs.statSync(p).isDirectory()){
				deleteFolder(p,(deep||0)+1);
			} else {
				fs.unlinkSync(p);
			}
		});
		if(deep){
			fs.rmdirSync(path);
		};
	};
};







function Run_npm(){
	console.log("\x1B[33m%s\x1B[0m","制作作者需要上传的npm包文件...");
	var npmHome="../assets/npm-home";
	var npmFiles=npmHome+"/npm-files";
	var npmSrc=npmFiles+"/src";
	deleteFolder(npmFiles);
	!fs.existsSync(npmFiles)&&fs.mkdirSync(npmFiles);
	fs.mkdirSync(npmSrc);
	var srcDirs=["engine","extensions","app-support"];

	var rootREADME=fs.readFileSync("../README.md","utf-8");
	var appREADME=fs.readFileSync("../app-support-sample/README.md","utf-8");
	var npmREADME=fs.readFileSync(npmHome+"/README.md","utf-8");
	var npmPackage=fs.readFileSync(npmHome+"/package.json","utf-8");
	var hashHistory=fs.readFileSync(npmHome+"/hash-history.txt","utf-8");
	var versionPatch=fs.existsSync(npmHome+"/version.patch.txt")&&fs.readFileSync(npmHome+"/version.patch.txt","utf-8")||"";
		
	var sha1Obj=crypto.createHash('sha1');
	var writeHashFile=function(path,data){
		fs.writeFileSync(path, data);
		sha1Obj.update(data);
	};

	var refsData={"README.Raw":rootREADME,"编辑提醒":"[​](?本文件为动态生成文件，请勿直接编辑，需要编辑请修改npm-home中的README)"};
	var exp=/\(\?Ref=(.+?)&Start\)([\S\s]+?)\[.*?\]\(\?RefEnd/g,m;
	while(m=exp.exec(rootREADME)){
		refsData["README."+m[1]]=m[2].trim();
	};
	exp.lastIndex=0;
	while(m=exp.exec(appREADME)){
		refsData["RecordApp.README."+m[1]]=m[2].trim();
	};
	console.log("Ref已定义项",Object.keys(refsData));

	var exp=/@@Ref (.+?)@@/g;
	npmREADME=npmREADME.replace(exp,function(s,a){
		var v=refsData[a];
		if(!v){
			throw new Error("npm README中"+s+"不存在");
		};
		return v;
	});
	npmREADME=npmREADME.replace(/@@Remove Start@@[\S\s]+@@Remove End@@/g,"");
	writeHashFile(npmFiles+"/README.md",npmREADME);
	console.log("已生成"+npmFiles+"/README.md");

	var npmVer=0;
	var npmPatch=0;
	npmPackage=npmPackage.replace(/"([\d\.]+)123456.9999"/g,function(s,a){
		var d=new Date();
		var v=(""+d.getFullYear()).substr(-2);
		v+=("0"+(d.getMonth()+1)).substr(-2);
		v+=("0"+d.getDate()).substr(-2);
		
		var patch="00";
		if(versionPatch){
			var obj=JSON.parse(versionPatch);
			var day=obj.date.replace(/-/g,"");
			if(day.length!=8){
				throw new Error("versionPatch.date无效");
			};
			if(day.substr(-6)==v){
				patch=("0"+obj.patch).substr(-2);
			};
		};
		
		v='"'+a+v+patch+'"';
		npmVer=v;
		npmPatch=patch;
		return npmVer;
	});
	console.log("\x1B[32m%s\x1B[0m","package version:"+npmVer+" patch:"+npmPatch+'，如果需要修改patch，请新建version.patch.txt，格式{"date":"2010-01-01","patch":12}patch取值0-99当日有效');
	fs.writeFileSync(npmFiles+"/package.json",npmPackage);
	console.log("已生成"+npmFiles+"/package.json");
	
	var copyFile=function(src,dist){
		var byts=fs.readFileSync(src);
		writeHashFile(dist, byts);
		console.log("已复制"+dist);
	};
	copyFile("../recorder.mp3.min.js",npmFiles+"/recorder.mp3.min.js");
	copyFile("../recorder.wav.min.js",npmFiles+"/recorder.wav.min.js");
	copyFile("recorder-core.js",npmSrc+"/recorder-core.js");
	srcDirs.forEach(function(dir){
		var files=fs.readdirSync(dir);
		fs.mkdirSync(npmSrc+"/"+dir);
		files.forEach(function(file){
			copyFile(dir+"/"+file,npmSrc+"/"+dir+"/"+file);
		});
	});
	
	//记录代码是否有变更
	var sha1=sha1Obj.digest("hex");
	var hashArr=JSON.parse(hashHistory||"[]");
	var hasChange=0;
	if(!hashArr[0]||hashArr[0].sha1!=sha1){
		hasChange=1;
		hashArr.splice(0,0,{sha1:sha1,time:new Date().toLocaleString()});
		hashArr.length=Math.min(hashArr.length,5);
		fs.writeFileSync(npmHome+"/hash-history.txt",JSON.stringify(hashArr,null,"\t"));
	};

	var msg="请记得到"+npmFiles+"目录中上传npm包"+(hasChange?"，已发生变更":"");
	console.log("\x1B["+(hasChange?31:32)+"m%s\x1B[0m",msg);
	
	console.log("\x1B[33m%s\x1B[0m","处理完成");
};