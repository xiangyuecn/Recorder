var fs = require("fs");
var UglifyJS = require("uglify-js");

!fs.existsSync("../dist")&&fs.mkdirSync("../dist");
!fs.existsSync("../dist/engine")&&fs.mkdirSync("../dist/engine");
!fs.existsSync("../dist/extensions")&&fs.mkdirSync("../dist/extensions");

console.log("开始处理文件...");

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
	var code=codes.join("\n");
	
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