/********************
【测试用的本地服务器】提供http上传接口、websocket接口

【运行】直接在当前文件夹内用命令
npm install
npm run start
********************/

//服务器配置
global.LocalServerConfig={
	port:{
		http:9528 //http端口，0不开启，不支持和ws使用同一个端口
		,ws:9529 //ws端口，0不开启，不支持和http使用同一个端口
		
		,https:9538 //https端口，0不开启，不支持和http使用同一个端口，需同时配置ssl才会开启
		,wss:9539 //wss端口，0不开启，不支持和ws使用同一个端口，需同时配置ssl才会开启
	}
	,ssl:{
		certFile:"" //cert.pem 证书路径，不为空将开启https wss
		,keyFile:"" //cert.key 密钥路径
	}
};

//如果提供了这个本地文件，就加载过来，可覆盖global下挂载的对象
var fs = require("fs");
var localFile="main__local.js";
fs.existsSync(localFile) && require("./"+localFile);

var httpServer=require("./server-http.js");
var wsServer=require("./server-websocket.js");

(async function(){
	var port=LocalServerConfig.port,ssl=LocalServerConfig.ssl;
	
	if(port.http){
		await httpServer.Start(port.http);
	}else console.log("\x1B[36m  未配置开启http \x1B[0m");
	if(port.https && ssl.certFile){
		await httpServer.Start(port.https, ssl);
	}else console.log("\x1B[36m  未配置开启https \x1B[0m");
	
	if(port.ws){
		await wsServer.Start(port.ws);
	}else console.log("\x1B[36m  未配置开启ws \x1B[0m");
	if(port.wss && ssl.certFile){
		await wsServer.Start(port.wss, ssl);
	}else console.log("\x1B[36m  未配置开启wss \x1B[0m");
	
	console.log("测试用的本地服务器已在运行中...");
})();
