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
var UglifyJS = require("uglify-js");

!fs.existsSync("../dist")&&fs.mkdirSync("../dist");
!fs.existsSync("../dist/engine")&&fs.mkdirSync("../dist/engine");
!fs.existsSync("../dist/extensions")&&fs.mkdirSync("../dist/extensions");
!fs.existsSync("../dist/app-support")&&fs.mkdirSync("../dist/app-support");

console.log("开始处理文件...");

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

console.log("处理完成");


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