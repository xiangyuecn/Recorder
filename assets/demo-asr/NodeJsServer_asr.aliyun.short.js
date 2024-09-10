/*******************************************
ASR 阿里云-智能语音交互-一句话识别 生成token的api接口，本地测试http后端服务
https://github.com/xiangyuecn/Recorder

【运行】直接在当前文件夹内用命令行执行命令，即可运行：
	node NodeJsServer_asr.aliyun.short.js

【运行前先修改以下配置必填项】：
*******************************************/
global.Config={
	//请到阿里云开通 一句话识别 服务（可试用一段时间，正式使用时应当开通商用版，很便宜），得到AccessKey、Secret，参考：https://help.aliyun.com/document_detail/324194.html
	AccessKey:"" //【必填】根据文档创建RAM用户，分配好权限，生成访问密钥
	,Secret:"" //【必填】
	
	//请到阿里云智能语音交互控制台创建相应的语音识别项目，每个项目可以设置一种语言模型，要支持多种语言就创建多个项目，然后填写每个项目对应的Appkey到这里，前端调用本接口的时候传入lang参数来获取到对应的Appkey
	,Langs:{
		"普通话":"" //【必填】至少创建一个普通话语言模型的项目用于测试，填对应的Appkey
		,"粤语":""
		,"英语":""
		,"日语":""
		//...... 按需提供语言对应的项目Appkey
	}
};

global.Port=9527;//http服务端口
global.SSL={
	CertFile:"" //cert.pem 证书路径，不为空将开启https
	,KeyFile:"" //cert.key 密钥路径
};


//如果提供了这个本地文件，就加载过来，可覆盖global下挂载的对象
var fs = require("fs");
var localFile="NodeJsServer_asr.aliyun.short__local.js";
fs.existsSync(localFile) && require("./"+localFile);

var GetLangKeys=function(){
	var keys=[];
	for(var k in Config.Langs) if(Config.Langs[k])keys.push(k);
	return keys;
};

/***************一句话识别Token生成***************/
var GetAsrToken=async function(ctx, args){
	var lang=args.lang;//unsafe
	var rtv={};
	ctx.setValue(rtv);
	var errTag="[GetAsrToken]";
	
	if(!Config.AccessKey || !Config.Secret){
		return ctx.error(errTag+"未配置AccessKey");
	}
	
	//根据前端需要的语言获得appkey，一种语言模型对应一个项目
	var appkey=Config.Langs[lang];
	if(!appkey){
		var errMsg="lang["+lang+"]未配置Appkey";
		if(!lang) errMsg="请求需要提供lang参数";
		return ctx.error(errTag+errMsg+"，已配置的可用lang值"+JSON.stringify(GetLangKeys()));
	}
	rtv.appkey=appkey;
	
	//获得Access Token，Token有效期内可以重复使用，实际使用时应当全局共享，并做好并发控制
	var cache=AccessToken_RedisCache;//假装读取Redis缓存数据
	if(!cache || cache.ExpireTime-Date.now()/1000<60){//缓存无效
		/*RedisLock()*/{ //假装加锁，得到锁的允许更新Token
			cache=AccessToken_RedisCache;//假装得到锁后，二次确认是否抢占到更新机会
			if(!cache || cache.ExpireTime-Date.now()/1000<60){
				cache=await NewAccessToken(ctx);
				if(ctx.isError()){
					return ctx.error(errTag+ctx.getMsg());
				}
				console.log("NewAccessToken", cache);
				AccessToken_RedisCache=cache;//假装写入Redis缓存
			}
		}
	}
	rtv.token=cache.Id;
	
	ctx.endLog=function(){
		console.log("    \x1B[32m"+lang+"token:"+JSON.stringify(rtv)+"\x1B[0m"
			+"\n    此token可重复使用，有效期到："+new Date(cache.ExpireTime*1000).toLocaleString());
	};
	return ctx;
};


var AccessToken_RedisCache=null;
//调用阿里云接口，获得新的Access Token，文档：https://help.aliyun.com/document_detail/113251.html
var NewAccessToken=async function(ctx){
	var params={
		AccessKeyId:Config.AccessKey
		,Action:"CreateToken"
		,Version:"2019-02-28"
		,Format:"JSON"
		,RegionId:"cn-shanghai"
		,Timestamp:JSON.stringify(new Date()).replace(/"/g,"")
		,SignatureMethod:"HMAC-SHA1"
		,SignatureVersion:"1.0"
		,SignatureNonce:RandomHEX(32).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/,"$1-$2-$3-$4-$5")
	};
	
	var arr=[];
	for(var k in params){
		arr.push(urlEncodeX(k)+"="+urlEncodeX(params[k]));
	};
	arr.sort();
	params=arr.join("&");
	var signStr="GET&"+urlEncodeX("/")+"&"+urlEncodeX(params);
	var sign=HMAC('sha1',Config.Secret+"&",signStr,'base64');
	params="Signature="+urlEncodeX(sign)+"&"+params;
	
	//直接发起get请求
	var load=LoadRequest("http://nls-meta.cn-shanghai.aliyuncs.com/?"+params);
	await load.getString(false);
	var respTxt=load.response.data;
	
	var data={};
	try{
		data=JSON.parse(respTxt);
	}catch(e){}
	if(!data.Token){
		ctx.error("获取Token失败["+data.Code+"]:"+data.Message);
		return null;
	};
	
	return data.Token;
};

//一些函数
var LoadRequest=require("./lib.load.js");
var Crypto=require('crypto');
var urlEncodeX=function(val){
	return encodeURIComponent(val).replace(/[^\w\-\.\~\%]/g,function(a){
		return "%"+("0"+a.charCodeAt(0).toString(16)).substr(-2).toUpperCase();
	});
};
var RandomHEX=function(len){
	var s=[];
	for(var i=0,r;i<len;i++){
		r=Math.floor(Math.random()*16);
		if(r<10){
			s.push(String.fromCharCode(r+48));
		}else{
			s.push(String.fromCharCode(r-10+97));
		};
	};
	return s.join("");
};
var HMAC=function(hash,key,data,resType){
	var hmac = Crypto.createHmac(hash, key);
	hmac.update(data);
	return hmac.digest(resType===null?null:(resType||'hex'));
};




/***************提供接口***************/
var Api={}; //async method_path0(ctx,args)

//内容回显
Api.GET_=Api.GET_echo=async function(ctx,args){
	ctx.setValue('<h1>阿里云一句话识别TokenApi服务正在运行...</h1>','html');
};
Api.POST_=Api.POST_echo=async function(ctx,args){
	ctx.setValue({url:ctx.req.url, method:ctx.req.method, headers:ctx.req.headers, args:args});
};

//token接口
Api.GET_token=Api.POST_token=async function(ctx,args){
	await GetAsrToken(ctx,args);
};

/***开启http服务***/
var http = require('http');
var https = require('https');
var querystring = require('querystring');
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
				//解析url查询参数 和 post表单
				var params = querystring.parse((/\?(.+)/.exec(req.url)||[])[1]||"");
				params = Object.assign(params, querystring.parse(post.toString()));
				
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
			if(ctx.isError()){
				console.log("    \x1B[31m"+ctx.getMsg()+"\x1B[0m");
			}
			ctx.endLog();
		})();
	});
};

var UrlProtocol="http";
var UrlPort=Port==80?"":":"+Port;
if(SSL.CertFile){
	UrlProtocol="https";
	UrlPort=Port==443?"":":"+Port;
}

console.log("正在创建"+UrlProtocol+"服务(port:"+Port+")...");
if(SSL.CertFile){
	https.createServer({
		cert: fs.readFileSync(SSL.CertFile)
		,key: fs.readFileSync(SSL.KeyFile)
	}, reqProcess).listen(Port);
}else{
	http.createServer(reqProcess).listen(Port);
}

console.log("\x1B[32m%s\x1B[0m",UrlProtocol.toUpperCase()+"服务正在运行...");
console.log(`
请在语音识别测试页面填写接口地址: \x1B[33m
    ${UrlProtocol}://127.0.0.1${UrlPort}/token
    ${UrlProtocol}://localhost${UrlPort}/token
    ${UrlProtocol}://你的局域网IP${UrlPort}/token
    ${UrlProtocol}://你的域名${UrlPort}/token
\x1B[0m
如果你的测试页面\x1B[35m无法访问http地址\x1B[0m或\x1B[35m存在跨域问题\x1B[0m时，请在本电脑上直接访问 \x1B[33m${UrlProtocol}://127.0.0.1${UrlPort}/token?lang=你需要lang语言\x1B[0m
然后手动复制 \x1B[33m{appkey:'...',token:'...'}\x1B[0m json到页面中使用，复制的token可以重复使用，本控制台中会显示有效期
    已配置的可用lang语言\x1B[33m${JSON.stringify(GetLangKeys())}\x1B[0m
`);
