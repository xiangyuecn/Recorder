//请求数据封装
var LoadFn=module.exports=function(url){
	return new Load(url);
};

var QueryString = require('querystring');
var Http=require('http');
var Https=require('https');

var Load=function(url){
	this.response={//响应数据
		url:"" //最终响应的url，如果发生了30x跳转为跳转后的地址
		,status:0
		,statusDesc:"" //Not Found
		,headers:[] //["k: v",...] k大小写未知
		,data:null //string或buffer
	};
	
	this.params={};//表单参数 GET或POST表单
	this.rawPost=null;//POST数据 string或buffer
	this.headers={};
	this.contentType="application/x-www-form-urlencoded";
	this.timeout=15019;//默认GET的，POST为30000
	this.redirect=true;//是否允许重定向
	this.debug=false;//调试模式，会忽略证书的校验
	
	this._url=url;
	var m=/((\w+:)?\/\/([^\/:]+)(\:\d+)?)(.*)/.exec(url)||[];
	this._url_left=m[1];
	this._url_protocol=(m[2]||"http:").toLowerCase();
	this._url_isHttps=this._url_protocol=="https:";
	this._url_host=m[3]||"";
	this._url_port=+(m[4]||":"+(this._url_isHttps?443:80)).substr(1);
	this._url_pq=m[5]||"";
};
Load.prototype={

_redirect:async function(url,checkSuccessStatus,method,encode){
	if(/(^https?:\/\/)|(^\/)/i.test(url)){
		if(RegExp.$2){
			url=this._url_left+url;
		};
	}else{
		throw new Error("未支持的重定向地址格式："+url);
	};
	
	var redirectCount=this.redirectCount||0;
	if(redirectCount>=10){
		throw new Error("重定向超过次数");
	};
	var load=new Load(url);
	
	load.params=this.params;
	load.rawPost=this.rawPost;
	load.headers=this.headers;
	load.contentType=this.contentType;
	load.timeout=this.timeout;
	load.redirect=this.redirect;
	load.debug=this.debug;
	
	
	load.redirectCount=redirectCount+1;
	await load.send(checkSuccessStatus,method,encode);
	return load;
}




,set:function(k,v){
	this[k]=v;
	return this;
}

,send:async function(checkSuccessStatus,method,encode){
	var This=this;
	return await new Promise(function(resolve, reject){
		var isGET=method=="GET";
		var url=This._url_pq;
		var params=QueryString.stringify(This.params);
		if(isGET && params){
			if(url.indexOf("?")+1){
				url+="&"+params;
			}else{
				url+="?"+params;
			};
		};
		if(!isGET){
			This.headers["Content-Length"]=Buffer.byteLength(This.rawPost||params);
			if(!This.headers["Content-Type"]){
				This.headers["Content-Type"]=This.contentType;
			};
		};
		
		var scope=This._url_isHttps?Https:Http;
		var obj={
			method:method
			,headers:This.headers
			,timeout:This.timeout!=15019?This.timeout:isGET?15000:30000
			,rejectUnauthorized:This.debug?false:true
			
			,protocol:This._url_protocol
			,host:This._url_host
			,port:This._url_port
			,path:url
		};
		var req=scope.request(obj,function(resp){
			var status=resp.statusCode;
			var headers=[],location="";
			var arr=resp.rawHeaders;
			for(var i=0;i<arr.length;i+=2){
				var k=arr[i], v=arr[i+1];
				headers.push(k+": "+v);
				
				if(k.toLowerCase()=="location"){
					location=v;
				};
			};
			This.response={
				url:This._url
				,status:status
				,statusDesc:resp.statusMessage
				,headers:headers
			};
			if((status==301||status==302) && This.redirect){
				This._redirect(location,checkSuccessStatus,method,encode)
					.then(function(o){
						This.response=o.response;
						resolve(This.response.data);
					},reject);
				return;
			};
			
			var buffers=[];
			resp.on('data',function(buffer){
				buffers.push(buffer);
			});
			resp.on('end',function(){
				if(checkSuccessStatus!==false){
					if(!( status>=200 && status<300 )){
						reject(new Error("请求失败["+status+"]"));
						return;
					};
				};
				
				This.response.data=Buffer.concat(buffers);
				if(encode!=null){
					var enc=(encode=="json"?"":encode)||'utf8';
					var val=This.response.data.toString(enc);
					if(encode=="json"){
						try{
							val=JSON.parse(val);
						}catch(e){
							reject(new Error("请求结果解析失败"));
							return;
						};
					};
					This.response.data=val;
				};
				
				resolve(This.response.data);
			});
		});
		req.on("error",function(e){
			reject(new Error("请求错误："+e.message));
		});
		
		if(!isGET){
			if(This.rawPost){
				req.write(This.rawPost);
			}else if(params){
				req.write(params);
			};
		};
		req.end();
	});
}

,getBytes:async function(checkSuccessStatus){
	return await this.send(checkSuccessStatus,"GET");
}
,getString:async function(checkSuccessStatus){
	return await this.send(checkSuccessStatus,"GET","");
}
,getJson:async function(checkSuccessStatus){
	return await this.send(checkSuccessStatus,"GET","json");
}

,postBytes:async function(checkSuccessStatus){
	return await this.send(checkSuccessStatus,"POST");
}
,postString:async function(checkSuccessStatus){
	return await this.send(checkSuccessStatus,"POST","");
}
,postJson:async function(checkSuccessStatus){
	return await this.send(checkSuccessStatus,"POST","json");
}

};
