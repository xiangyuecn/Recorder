/**WebSocket ws、wss服务

调用测试：
ws=new WebSocket("ws://127.0.0.1:9529/ws123")
ws.binaryType="arraybuffer"
ws.onmessage=(e)=>{ e=e.data; if(!(e instanceof ArrayBuffer)) return console.log(">>> ",e);
	e=new Uint8Array(e); s="";n=e.length; for(i=0;i<e.length;i++)if(e[i]==0x0A){ n=i+1;break; }else s+=String.fromCharCode(e[i]);
	txt=decodeURIComponent(escape(s));
	if(!/Frame/.test(JSON.parse(s).type))console.log(">>> ",txt,e.slice(n)); }

ws.send(JSON.stringify({type:"createFile",n:1,v:{mime:"xxx/txt"}}))
ws.send(await new Blob([JSON.stringify({type:"appendFile",n:1,v:{token:填token}})+"\n真好123"]).arrayBuffer())

ws.send(JSON.stringify({type:"audioStart",n:1,v:{readAudio:0}}))
ws.send(JSON.stringify({type:"audioStop",n:1,v:{token:填token}}))

ws.send(JSON.stringify({type:"setMeta",n:1,v:{uid:123}}))
ws.send(JSON.stringify({type:"queryMeta",n:1,v:{metaKey:"",metaValue:"",keys:["uid","xxx"]}}))
ws.send(await new Blob([JSON.stringify({type:"sendTo",n:1,v:{toMetaKey:"uid",toMetaValue:"123",sendType:"xxxtype",sendData:{xxx:"abc",fromxx:"123"}}})+"\n真好123"]).arrayBuffer())
**/
var fs = require("fs");
var fs2 = fs.promises;
var NodePath = require("path");
var NodeWS=require("nodejs-websocket");

var Recorder=require("recorder-core");
require("recorder-core/src/extensions/create-audio.nmn2pcm.js");

//=========提供接口===========
var Api={}; //async onMsg_type(client,data,binary,msgObj)

//创建文件和追加写入文件，比如：语音流保存到文件
Api.onMsg_createFile=async function(client,data,binary,msgObj){
	var mime=data.mime||"";
	var ext=(/\/(\w+)$/.exec(mime.toLowerCase())||[])[1]||"bin";
	
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
	var path="./upload/"+fileName;
	
	await fs2.mkdir("./upload", {recursive:true});
	await fs2.writeFile(path, new Uint8Array(0));
	
	var token="F"+Math.random(),store={path:path,count:0,size:0};
	client["_file_"+token]=store;
	client.sendMessage("",{token:token,fileName:fileName},null,{from:msgObj}); //返回结果
};
Api.onMsg_appendFile=async function(client,data,binary,msgObj){
	var token=data.token;
	var store=client["_file_"+token];
	if(!store){
		return client.sendMessage("",{},null,{from:msgObj,c:1,m:"参数无效"});
	};
	store.count++; store.size+=binary.length;
	await fs2.writeFile(store.path, binary, { flag:"a" });
	client.sendMessage("",{},null,{from:msgObj}); //返回结果
	
	//定时显示日志信息
	if(!store.timer){
		store.timer=setTimeout(()=>{
			store.timer=0;
			client.log("\x1B[33m保存文件appendFile统计\x1B[0m，path="+store.path+"，count="+store.count+"，size="+store.size);
		},3000);
	};
};


//设置客户端信息
Api.onMsg_setMeta=async function(client,data,binary,msgObj){
	for(var k in data){
		client["_meta_"+k]=data[k];
	}
	client.sendMessage("",{},null,{from:msgObj}); //返回结果
};
//查询客户端信息，可拉取在线的所有客户端信息
Api.onMsg_queryMeta=async function(client,data,binary,msgObj){
	var list=[],keys=data.keys||[];
	for(var k in Clients){
		var o=Clients[k];
		if(!data.metaKey || o["_meta_"+data.metaKey]==data.metaValue){
			var item={}; list.push(item);
			for(var i=0;i<keys.length;i++){
				var key=keys[i];
				item[key]=o["_meta_"+key]==undefined?null:o["_meta_"+key];
			}
		}
	}
	client.sendMessage("",{clients:list},null,{from:msgObj}); //返回结果
};
//给其他客户端（可多个）发送消息数据，比如：语音流
Api.onMsg_sendTo=async function(client,data,binary,msgObj){
	var count=0;
	for(var k in Clients){ //查找出对方客户端连接
		var toClient=Clients[k];
		if(!data.toMetaKey || toClient["_meta_"+data.toMetaKey]==data.toMetaValue){
			count++;
			toClient.sendMessage(data.sendType,data.sendData,binary);
		}
	}
	client.sendMessage("",{count:count},null,{from:msgObj}); //返回结果
	
	//定时显示日志信息
	var store=client._sendTo_=client._sendTo_||{count:0,size:0};
	store.count++; store.size+=binary.length;
	if(!store.timer){
		store.timer=setTimeout(()=>{
			store.timer=0;
			client.log("\x1B[33m发送消息数据sendTo统计\x1B[0m，count="+store.count+"，size="+store.size);
		},3000);
	};
};


//服务器实时将一个audio发送给客户端，语音流
Api.onMsg_audioStart=async function(client,data,binary,msgObj){
	var audioPcm=null;//准备pcm数据 16k采样率
	if(data.readAudio){//读取文件
		try{
			var buffer=await fs2.readFile("./upload/audio-16k.wav");
			audioPcm=new Int16Array(new Uint8Array(buffer.buffer).slice(44).buffer);
		}catch(e){
			return client.sendMessage("",{},null,{from:msgObj,c:1,m:"无法读取文件：./upload/audio-16k.wav，请在node-localServer服务器目录的upload文件夹内放一个16k采样率的wav文件（44字节wav头）"});
		}
	}else{//生成pcm
		audioPcm=Recorder.NMN2PCM.GetExamples().Canon_Right.get(16000).pcm
	}
	//定时发送数据
	var offset=0,pcmTimer=setInterval(()=>{
		var n=16000/1000*100; if(offset+n>audioPcm.length)offset=0;
		var subPcm=new Int16Array(audioPcm.subarray(offset,offset+n));
		client.sendMessage("audioFrame",{sampleRate:16000},new Uint8Array(subPcm.buffer));
		offset+=n;
		
		//定时显示日志信息
		store.count++; store.size+=subPcm.byteLength; store.dur+=100;
		if(store.dur%3000==0){ store.showLog(); }
	},100);
	
	var store={ count:0,size:0,dur:0 };
	store.showLog=()=>{
		client.log("\x1B[33m发送audio语音流统计\x1B[0m，count="+store.count+"，size="+store.size+"，时长"+store.dur+"ms");
	};
	store.stop=()=>{
		store.showLog();
		clearInterval(pcmTimer);
	};
	client.onCloseClear.push(()=>{ store.stop(); }); //断开连接时清理
	
	var token="A"+Math.random();
	client["_audio_"+token]=store;
	client.sendMessage("",{token:token},null,{from:msgObj}); //返回结果
};
Api.onMsg_audioStop=async function(client,data,binary,msgObj){
	var store=client["_audio_"+data.token];
	if(store){
		store.stop();
	};
	client.sendMessage("",{},null,{from:msgObj}); //返回结果
};




var Clients={},Cid=0;
/**单个客户端连接**/
var ConnClient=function(conn,port){
	this.id=++Cid; Clients[this.id]=this;
	this.port=port; this.ip=conn.socket.remoteAddress;
	this.conn=conn;
	conn.on("text",(str)=>{ this.receiveMessage(str) });
	conn.on("binary",(stream)=>{ this.receiveMessage(stream) });
	conn.on("close",(code, reason)=>{ this.onClose(code, reason) });
	conn.on("error",()=>{});
	
	//发送消息序号，每发出一条消息+1
	this.number=1;
	//是否已关闭，关闭后不会再发送出消息
	this.isClose=false;
	//当关闭连接时需要清理的资源，提供回调函数
	this.onCloseClear=[];
	
	this.log("客户端[ip="+this.ip+"]已连接 path="+conn.path);
	this.sendMessage("srvTestMsg",{id:this.id,path:conn.path},new Uint8Array([0,1,2,3]));
}
ConnClient.prototype={
	log:function(msg){
		console.log("["+new Date().toLocaleString()+"]:"+this.port+" id:"+this.id+" "+msg);
	}
	,disableLog:function(type){
		return /srvTestMsg|appendFile|sendTo|Frame|Buffer|Chunk/i.test(type);
	}
	,onClose:async function(code, reason){
		if(this.isClose)return;
		this.log("客户端已断开 code="+code+" reason="+reason);
		this.isClose=true;
		this.conn=null;
		delete Clients[this.id];
		
		//清理资源
		for(var i=0;i<this.onCloseClear.length;i++){
			this.onCloseClear[i]();
		}
	}
	,receiveMessage:async function(rawMsg){
		var binary=new Uint8Array(0),rawTxt=rawMsg;//纯文本消息
		if(typeof(rawMsg)!="string"){
			//二进制消息，提取json和二进制数据
			var bytes=await new Promise((resolve,reject)=>{
				var buffer = Buffer.alloc(0);
				rawMsg.on("readable", ()=>{
					try{ var chunk; while((chunk=rawMsg.read())!=null){
							buffer = Buffer.concat([buffer, chunk], buffer.length+chunk.length);
					} }catch(e){ reject(e); }
				});
				rawMsg.on("end",async ()=>{ resolve(new Uint8Array(buffer)) });
				rawMsg.on("error",e=>{ reject(e) });
			});
			var str="",bIdx=bytes.length;
			for(var i=0;i<bytes.length;i++){
				if(bytes[i]==10){ bIdx=i+1; break }
				else str+=String.fromCharCode(bytes[i]);
			}
			rawTxt=decodeURIComponent(escape(str));
			binary=new Uint8Array(bytes.buffer.slice(bIdx));
		}
		
		//解析json
		var msgErr="";
		if(!rawTxt){ msgErr="无JSON数据"; }else{
			try{
				var msgObj=JSON.parse(rawTxt);
				if(!msgObj.type || !msgObj.n){
					msgErr="JSON数据中无type或n："+rawTxt;
				}
			}catch(e){ msgErr="非JSON格式数据："+rawTxt; }
		}
		if(msgErr){
			this.log("receiveMessage错误: "+msgErr);
			return;
		}
		
		if(/^response\.(\d+)\.?/.test(msgObj.type)){//响应回调
			return;//目前没有需要处理的回调
		}
		
		//交给对应接口处理
		var fn=Api["onMsg_"+msgObj.type];
		if(fn){
			if(!this.disableLog(msgObj.type))this.log("receiveMessage."+msgObj.n+" type="+msgObj.type);
			try{
				await fn(this,msgObj.v||{},binary,msgObj);
			}catch(e){
				this.log("receiveMessage接口执行异常："+e.message);
				this.sendMessage("",{},null,{from:msgObj,c:1,m:"接口执行异常："+e.message});
			}
			return;
		};
		this.log("receiveMessage未知消息类型："+rawTxt);
		this.sendMessage("",{},null,{from:msgObj,c:1,m:"类型对应的接口不存在，type="+msgObj.type});
	}
	,sendMessage:async function(type,data,bytes,response){
		var msgNo=this.number++;
		if(response) type="response."+response.from.n+"."+response.from.type;
		var msgObj={type:type,n:msgNo};
		if(response){
			msgObj.c=response.c||0;
			msgObj.m=response.m||"";
		};
		msgObj.v=data||{};
		
		if(this.isClose){ return; }
		if(!this.disableLog(type))this.log("sendMessage."+msgNo+" type="+type);
		
		var rawTxt=JSON.stringify(msgObj);
		if(bytes && bytes.length){//换行拼接二进制内容
			var u8arr=new Uint8Array(Buffer.from(rawTxt));
			var arr=new Uint8Array(u8arr.length+1+bytes.length);
			arr.set(u8arr);
			arr[u8arr.length]=10;
			arr.set(bytes, u8arr.length+1);
			this.conn.sendBinary(Buffer.from(arr.buffer));
		}else{
			this.conn.sendText(rawTxt);
		}
	}
};


module.exports={ Start: async function(Port, SSL){

//========开启WebSocket服务==========
await new Promise(function(resolve,reject){
var UrlProtocol="ws";
var UrlPort=Port==80?"":":"+Port;
if(SSL && SSL.certFile){
	UrlProtocol="wss";
	UrlPort=Port==443?"":":"+Port;
}
console.log("正在创建"+UrlProtocol+"服务(port:"+Port+")...");

NodeWS.setMaxBufferLength(5*1024*1024); //最大5MB缓冲区，允许客户端发送大的内容
var server=NodeWS.createServer(SSL && SSL.certFile?{
	secure:true
	,cert: fs.readFileSync(SSL.certFile)
	,key: fs.readFileSync(SSL.keyFile)
}:{},function(conn){
	new ConnClient(conn,Port);
});
server.on("listening",function(){
	console.log("\x1B[32m"+UrlProtocol+"服务正在运行"+"\x1B[0m"
		+"  \x1B[33m"+"访问URL："+UrlProtocol+"://【127.0.0.1、局域网ip、域名】"+UrlPort+"/"+"\x1B[0m");
	resolve();
});
server.on("error",function(err){
	console.error("WebSocket启动失败："+err.message);
	reject(err);
});
server.listen(Port);

});

}
};