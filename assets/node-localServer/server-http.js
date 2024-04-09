/**http、https服务

调用测试：
xhr=new XMLHttpRequest();xhr.open("POST","/upload",false);f=new FormData();f.append("upfile_b64",btoa("1234"));f.append("mime","xxx/txt");f.append("upfile",new Blob(["真好123"]),"xxx.txt");xhr.send(f);xhr.responseText
**/
module.exports={ Start: async function(Port, SSL){
var fs = require("fs");
var fs2 = fs.promises;
var NodePath = require("path");

//=========提供接口===========
var Api={}; //async method_path0(ctx,args)

//内容回显
Api.GET_=Api.GET_echo=async function(ctx,args){
	ctx.setValue('<h1>LocalServer正在运行...</h1><a href="'+ctx.getUrl("/Recorder/")+'">'+ctx.getUrl("/Recorder/")+'</a><pre>'+JSON.stringify({url:ctx.getUrl(), method:ctx.req.method, headers:ctx.req.headers},null,"\t")+'</pre>','html');
};
Api.POST_=Api.POST_echo=async function(ctx,args){
	ctx.setValue({url:ctx.getUrl(), method:ctx.req.method, headers:ctx.req.headers, args:args});
};

//上传文件
Api.POST_upload=async function(ctx,args){
	var upfile=args.upfile;
	if(!upfile || !upfile.data){
		return ctx.error("upfile参数无效");
	}
	var savePath=await uploadSave(ctx,upfile.data,upfile.type||"",upfile.filename||"");
	ctx.endLog=()=> console.log("  \x1B[33m上传文件\x1B[0m，"+upfile.data.length+"字节，已保存在："+savePath+"，请求参数：", args);
};
Api.POST_uploadBase64=async function(ctx,args){
	var upfile_b64=args.upfile_b64||""; args.upfile_b64="<Base64 length="+upfile_b64.length+">";
	var mime=args.mime||"";
	
	var data=null;
	try{
		var data=Buffer.from(upfile_b64,"base64");
	}catch(e){ }
	if(!data || !upfile_b64){
		return ctx.error("upfile_b64参数无效");
	};
	var savePath=await uploadSave(ctx,data,mime,"");
	ctx.endLog=()=> console.log("  \x1B[33m上传文件Base64\x1B[0m，"+data.length+"字节，已保存在："+savePath+"，请求参数：", args);
};
var uploadSave=async function(ctx,data,mime,fileName){
	var ext=(/\.(\w+)$/.exec(fileName.toLowerCase())||[])[1];
	if(!ext){
		ext=(/\/(\w+)$/.exec(mime.toLowerCase())||[])[1];
	}
	ext=ext||"bin";
	
	var now=new Date();
	var fileName=""+now.getFullYear()
		+("0"+(now.getMonth()+1)).substr(-2)
		+("0"+now.getDate()).substr(-2)
		+"-"+("0"+now.getHours()).substr(-2)
		+("0"+now.getMinutes()).substr(-2)
		+("0"+now.getSeconds()).substr(-2)
		+"-"+("00"+now.getMilliseconds()).substr(-3)
		+(Math.random()+"").substr(2,6)
		+"."+ext;
	var savePath="./upload/"+fileName;
	
	await fs2.mkdir("./upload", {recursive:true});
	await fs2.writeFile(savePath, data);
	
	ctx.setValue({ url:ctx.getUrl("/Recorder/assets/node-localServer/upload/"+fileName) });
	return savePath;
};


//访问Recorder目录的静态文件
Api.GET_Recorder=async function(ctx,args){
	var path=/^\/Recorder\/?([^\?]*)(\?.*)?$/.exec(ctx.req.url);
	if(path){
		path="/"+decodeURIComponent(path[1]);
	}
	var root=NodePath.resolve("../../");
	
	var scope=Api.GET_Recorder;
	if(!scope.access){
		try{
			await fs2.access(root+"/dist/recorder-core.js");
			await fs2.access(root+"/src/recorder-core.js");
			scope.access=1;
		}catch(e){ scope.access=-1; }
	}
	if(scope.access!=1){
		ctx.status=500;
		ctx.setValue("<h1>请在clone的Recorder目录内开启本服务器，否则不允许访问Recorder路径下的静态文件</h1>","html");
		return;
	}
	
	//检测文件或目录是否存在
	var fullPath=NodePath.resolve(root,"."+path);
	if(!path || fullPath.indexOf(root)!=0){
		ctx.status=403;
		ctx.setValue("<h1>路径无效</h1>","html");
		return;
	}
	try{
		if((await fs2.stat(fullPath)).isDirectory()){
			if(!/\/(\?|$)/.test(ctx.req.url)){
				ctx.status=404;
				ctx.setValue("<h1>目录，没有编写301跳转代码</h1>","html");
				return;
			}
			fullPath+="/index.html";
			await fs2.stat(fullPath);
		}
	}catch(e){
		ctx.status=404;
		ctx.setValue("<h1>路径不存在</h1>","html");
		return;
	}
	
	//mime类型映射
	var ext=(/\.(\w+)$/.exec(fullPath.toLowerCase())||[])[1];
	var mime=({
		html:"text/html"
		,css:"text/css"
		,js:"application/javascript"
		,txt:"text/plain"
		,md:"text/plain"
		
		,jpg:"image/jpeg"
		,gif:"image/gif"
		,png:"image/png"
		
		,mp4:"video/mp4"
		,webm:"video/webm"
		,mp3:"audio/mp3"
		,wav:"audio/wav"
		,ogg:"audio/ogg"
		,amr:"audio/amr"
	})[ext]||"application/octet-stream";
	
	//读取文件内容返回
	ctx.setValue(await fs2.readFile(fullPath), mime);
};


//========开启http服务==========
await (async function(){
var http = require('http');
var https = require('https');
var querystring = require('querystring');
var multipart = require('parse-multipart-data');
var reqProcess=function(req, rep) {
	var ctx={
		req:req,rep:req
		,data:{c:0,m:"",v:""}
		,status:200,setCT:false,contentType:"text/json; charset=utf-8"
	};
	ctx.setValue=function(val,contentType){
		if(contentType!=null){
			ctx.setCT=true;
			ctx.contentType=!contentType||contentType=="html"?"text/html; charset=utf-8":contentType;
		};
		ctx.data.v=val;
	};
	ctx.error=function(msg){
		ctx.data.c=1;
		ctx.data.m=msg;
		return ctx;
	};
	ctx.isError=function(){
		return ctx.data.c!=0;
	};
	ctx.getMsg=function(){
		return ctx.data.m;
	};
	ctx.getUrl=function(path){
		var url=SSL && SSL.certFile?"https":"http";
		url+="://"+req.headers.host.replace(/:\d+/,"");
		if(Port!=80 && Port!=443){
			url+=":"+Port;
		}
		url+=path||req.url;
		return url;
	};
	ctx.endLog=function(){};
	
	var post = Buffer.alloc(0);
	req.on('data', function(chunk){
		post = Buffer.concat([post, chunk], post.length+chunk.length);
	});
	req.on('end', function(){
		(async function(){
			if(req.method!="GET" && req.method!="POST"){
				ctx.setValue("Method: "+req.method, "html");
			}else try{
				var mp=/^multipart\/form-data.*boundary=(.*)/i.exec(req.headers["content-type"]);
				if(mp){ //解析上传post表单，简单解析
					var arr = multipart.parse(post,mp[1]);
					var params = {};
					for(var i=0;i<arr.length;i++){
						var o=arr[i];
						if(o.filename||o.type){
							params[o.name]=o; //{filename:"",type:"xx/xx",data:Buffer}
						}else{
							params[o.name]=o.data.toString();
						}
					}
				}else{ //解析普通post表单
					var params = querystring.parse(post.toString());
				}
			
				var path0=(/^\/([^\/\?]+)/.exec(req.url)||[])[1]||"";
				var fn=Api[req.method+"_"+path0]
				if(fn){
					await fn(ctx, params);
				}else{
					ctx.status=404;
					ctx.error(req.method+"路径不存在："+req.url);
				};
			}catch(e){
				ctx.error("执行出错："+e.stack);
			};
			if(!ctx.setCT){
				try{
					var sendData=JSON.stringify(ctx.data);
				}catch(e){
					sendData=JSON.stringify({c:1,m:"返回数据失败："+e.stack});
				}
			}else{
				var sendData=ctx.data.v;
			}
			
			rep.writeHead(ctx.status, {
				'Content-Type': ctx.contentType
				, 'Access-Control-Allow-Origin':'*'
			});
			rep.end(sendData);
			
			console.log("["+new Date().toLocaleString()+"]:"+Port+" "+req.method+" "+ctx.status+" "+Buffer.byteLength(sendData)+" "+post.length+" "+req.url);
			ctx.endLog();
		})();
	});
};

var UrlProtocol="http";
var UrlPort=Port==80?"":":"+Port;
if(SSL && SSL.certFile){
	UrlProtocol="https";
	UrlPort=Port==443?"":":"+Port;
}

console.log("正在创建"+UrlProtocol+"服务(port:"+Port+")...");
if(SSL && SSL.certFile){
	https.createServer({
		cert: fs.readFileSync(SSL.certFile)
		,key: fs.readFileSync(SSL.keyFile)
	}, reqProcess).listen(Port);
}else{
	http.createServer(reqProcess).listen(Port);
}

console.log("\x1B[32m"+UrlProtocol.toUpperCase()+"服务正在运行"+"\x1B[0m"
	+"  \x1B[33m"+"访问URL："+UrlProtocol+"://【127.0.0.1、局域网ip、域名】"+UrlPort+"/"+"\x1B[0m");

})();

}
};