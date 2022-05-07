/*******************************************
ASR 阿里云-智能语音交互-一句话识别 生成Token的api接口，本地测试http后端服务
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
		"普通话":"" //【必填】至少创建一个普通话语言模型的项目用于测试
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


/***************一句话识别Token生成***************/
var GetAsrToken=async function(ctx, args){
	var lang=args.lang;//unsafe
	var rtv={};
	var errTag="[GetAsrToken]";
	
	if(!Config.AccessKey || !Config.Secret){
		return ctx.error(errTag+"未配置AccessKey");
	}
	
	//根据前端需要的语言获得appkey，一种语言模型对应一个项目
	var appkey=Config.Langs[lang];
	if(!appkey){
		return ctx.error(errTag+"lang["+lang+"]未配置Appkey");
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
	
	ctx.v=rtv;
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






/***************开启http服务***********************/
var http = require('http');
var https = require('https');
var querystring = require('querystring');
var reqProcess=function(req, rep) {
	var ctx={c:0,m:"",v:""},status=200;
	ctx.error=function(msg){
		ctx.c=1;
		ctx.m=msg;
		return ctx;
	};
	ctx.isError=function(){
		return ctx.c!=0;
	};
	ctx.getMsg=function(){
		return ctx.m;
	};
	
	var post = '';
	req.on('data', function(chunk){
		post += chunk;
	});
	req.on('end', function(){
		(async function(){
			try{
				var params = querystring.parse(post);
				var isPost=req.method=="POST";
			
				var path0=(/^\/([^\/]+)/.exec(req.url)||[])[1]||"";
				if(path0=="echo"){
					ctx.v=params;
				}else if(path0=="token" && isPost){
					await GetAsrToken(ctx, params);
				}else{
					status=404;
					ctx.error(req.method+"路径不存在");
				};
			}catch(e){
				ctx.error("执行出错："+e.stack);
			};
			try{
				var sendData=JSON.stringify(ctx);
			}catch(e){
				ctx={c:1,m:"返回数据失败："+e.stack};
				sendData=JSON.stringify(ctx);
			}
			
			rep.writeHead(status, {
				'Content-Type': 'text/json; charset=utf-8'
				, 'Access-Control-Allow-Origin':'*'
			});
			rep.end(sendData);
			
			console.log("["+new Date().toLocaleString()+"] "+req.method+" "+req.url+" "+status+" "+Buffer.byteLength(sendData));
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
\x1B[0m`);
