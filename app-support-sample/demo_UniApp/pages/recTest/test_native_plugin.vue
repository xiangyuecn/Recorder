<template>
<view></view>
</template>

<script>
import 'recorder-core';
import RecordApp from 'recorder-core/src/app-support/app.js';

export default {
	data(){ return { } },
	methods:{
		getPage(){
			var p=this.$parent;
			while(p){
				if(p.reclog) break;
				p=p.$parent;
			}
			return p;
		}
		,reclog(){
			var p=this.getPage();
			p.reclog.apply(p,arguments);
		}
		,showTest(){
			this.getPage().testMsgs=[];
			RecordApp.UniNativeUtsPlugin={nativePlugin:true}; //启用原生插件
			RecordApp.UniNativeUtsPluginCallAsync("resolvePath",{path:""}).then((data)=>{
				this.test();
			}).catch((e)=>{
				this.addMsg("err","测试原生插件调用失败，不可以进行原生插件测试："+e.message,1);
			});
		}
		,showMemoryUsage(){
			RecordApp.UniNativeUtsPluginCallAsync("debugInfo",{}).then((data)=>{
				var val=data.appMemoryUsage;
				if(val>0) val=(val/1024/1024).toFixed(2)+" MB";
				this.addMsg("占用内存大小", val+" (不一定准)");
			}).catch((e)=>{
				this.addMsg("原生插件的debugInfo接口调用出错", e.message,1);
			});
		}
		//Android后台录音保活通知的显示和关闭，Android在后台录音需要开启通知，否则可能无法正常录音或录到的都是静音
		,showNotifyService(show){
			var args=show?{
				title:"正在录音的标题"
				,content:"正在录音的内容文本"
			}:{
				close:true
			};
			if(show) this.getPage().addTestMsg("App中提升后台录音的稳定性：需要启用后台录音保活服务（iOS不需要），Android 9开始，锁屏或进入后台一段时间后App可能会被禁止访问麦克风导致录音静音、无法录音（App中H5录音也受影响），需要原生层提供搭配常驻通知的Android后台录音保活服务（Foreground services）；可调用配套原生插件的androidNotifyService接口，或使用第三方保活插件","#4face6");
			RecordApp.UniNativeUtsPluginCallAsync("androidNotifyService",args).then((data)=>{
				if(show){
					var nCode=data.notifyPermissionCode, nMsg=data.notifyPermissionMsg;
					this.getPage().addTestMsg("搭配常驻通知的Android后台录音保活服务已打开，ForegroundService已运行(通知可能不显示或会延迟显示，并不影响服务运行)，通知显示状态(1有通知权限 3可能无权限)code="+nCode+" msg="+nMsg,2);
				}else{
					this.getPage().addTestMsg("已关闭搭配常驻通知的Android后台录音保活服务");
				}
			}).catch((e)=>{
				this.addMsg("原生插件的androidNotifyService接口调用出错", e.message,1);
			});
		}
		,addMsg(tag,msg,err){
			this.getPage().addTestMsg((err?"[Error]":"[OK]")+" "+tag+"："+msg,err?1:2);
		}
		
		
		,async exec(tag,tasks){
			try{
				var msg="";
				for(var i=0;i<tasks.length;i++){
					var action=tasks[i][0],args=tasks[i][1],process=tasks[i][2],isErr=tasks[i][3];
					try{
						var data=await RecordApp.UniNativeUtsPluginCallAsync(action,args);
					}catch(e){
						if(isErr){
							data=e; isErr=2;
							console.log(action+"错误调用返回错误："+e.message);
						}else throw e;
					}
					if(isErr && isErr!=2){
						throw new Error(action+"错误调用但未报错");
					}
					if(!isErr && /Path|File/.test(action)){
						if(!data.fullPath) throw new Error(action+"接口没有返回fullPath");
					}
					msg=process&&process(data)||msg;
				}
				this.addMsg(tag,msg||"符合预期");
			}catch(e){
				this.addMsg(tag,"执行出错："+e.message,1);
			}
		}
		,async test(){
			this.reclog("开始测试原生插件调用...");
			
			var testFile="test.txt";
			var b64Txt="测试😜123\n";
			var b64=RecordApp.UniB64Enc(b64Txt);
			var b64Len=RecordApp.UniAtob(b64).byteLength;
			var a1,a2,a3;
			
			await this.exec("插件信息",[["getInfo",{},(data)=>{
				return data.info;
			}]]);
			await this.exec("内存信息",[["debugInfo",{},(data)=>{
				var val=data.appMemoryUsage;
				if(val>0) val=(val/1024/1024).toFixed(2)+" MB";
				return "占用内存大小："+val+" (不一定准)";
			}]]);
			await this.exec("调用未知方法",[["abc123",{},null,true]]);
			await this.exec("路径解析测试",[
				["resolvePath",{path:"xxx://xxx.png"},null,true], //错误调用
				["resolvePath",{path:"store:///xxx.png"},null,true],
				["resolvePath",{path:"file://xxx.png"},null,true],
				
				["resolvePath",{path:testFile},(data)=>{ a1=data.fullPath }],
				["resolvePath",{path:"store://"+testFile},(data)=>{
					a2=data.fullPath;
					if(a2!=a1) throw new Error("store和简写不一致");
					if(a2.length<10 || !/^\//.test(a2)) throw new Error("store路径错误");
				}],
				
				["resolvePath",{path:"__doc://"+testFile},(data)=>{
					a1=data.fullPath;
					if(a1.length<10 || !/^\//.test(a1) || !/\/__doc|\/Documents/.test(a1)) throw new Error("__doc路径错误");
					a2+=" | "+a1;
				}],
				
				["resolvePath",{path:"cache://"+testFile},(data)=>{
					a1=data.fullPath;
					if(a1.length<10 || !/^\//.test(a1) || !/\/cache|\/Caches/.test(a1)) throw new Error("cache路径错误");
					a2+=" | "+a1;
				}],
				
				["resolvePath",{path:"/"+testFile},(data)=>{ a3=data.fullPath }],
				["resolvePath",{path:"file://"+"/"+testFile},(data)=>{
					a1=data.fullPath;
					if(a1!=a3) throw new Error("file和简写不一致");
					if(a1.length!=testFile.length+1 || !/^\//.test(a1)) throw new Error("file路径错误");
					a2+=" | "+a1;
					return a2;
				}],
			]);
			
			await this.exec("请求录音权限",[["recordPermission",{},(data)=>{
				return (data==1?"有权限":data==3?"用户拒绝":"未知结果")+" "+data;
			}]]);
			await this.exec("听筒播放",[["setSpeakerOff",{off:true}]]);
			await this.exec("扬声器播放",[["setSpeakerOff",{off:false}]]);
			
			await this.exec("读写整个文件",[
				["writeFile",{path:testFile,dataBase64:null},null,true], //错误调用
				["writeFile",{path:null,dataBase64:b64},null,true],
				["writeFile",{path:"",dataBase64:b64},null,true],
				["readFile",{path:""},null,true],
				
				["writeFile",{path:testFile,dataBase64:""}], //只创建空文件
				["readFile",{path:testFile,type:"text"},(data)=>{
					if(!data.isExists || data.data!="")throw new Error("读取空文件结果不一致");
				}],
				
				["writeFile",{path:testFile,dataBase64:b64}],
				["readFile",{path:testFile,type:"text"},(data)=>{
					if(data.data!=b64Txt)throw new Error("读取结果不一致");
				}]
			]);
			
			await this.exec("文件seek位置写入",[
				["deleteFile",{path:testFile}],
				["writeFile",{path:testFile,dataBase64:b64,append:true}],
				["writeFile",{path:testFile,dataBase64:b64,append:true}],
				["writeFile",{path:testFile,dataBase64:RecordApp.UniB64Enc("新值"),seekOffset:0}],
				["writeFile",{path:testFile,dataBase64:RecordApp.UniB64Enc("NEW\n"),seekOffset:b64Len-4}],
				["writeFile",{path:testFile,dataBase64:RecordApp.UniB64Enc("add"),seekOffset:9999999}],
				["readFile",{path:testFile,type:"text"},(data)=>{
					var str=b64Txt.substr(2); str=str.substr(0, str.length-4);
					str="新值"+str+"NEW\n"+b64Txt+"add";
					if(data.data!=str)throw new Error("读取结果不一致");
				}],
				
				["deleteFile",{path:testFile}], //文件不存在时seek，只会写到新文件开头
				["writeFile",{path:testFile,dataBase64:b64,seekOffset:99999}],
				["readFile",{path:testFile,type:"text"},(data)=>{
					if(data.data!=b64Txt)throw new Error("读取结果不一致");
				}]
			]);
			
			await this.exec("文件分段读写",[
				["deleteFile",{path:testFile}],
				["writeFile",{path:testFile,dataBase64:b64,append:true}],
				["writeFile",{path:testFile,dataBase64:b64,append:true}],
				["writeFile",{path:testFile,dataBase64:b64,append:true}],
				["readFile",{path:testFile,type:"base64"},(data)=>{
					if(data.data!=RecordApp.UniB64Enc(b64Txt+b64Txt+b64Txt))throw new Error("读取结果不一致");
				}],
				
				["readFile",{path:testFile,type:"base64",chunkSize:b64Len,chunkOffset:b64Len*0},(data)=>{
					if(data.data!=b64)throw new Error("读取0结果不一致");
				}],
				["readFile",{path:testFile,type:"base64",chunkSize:b64Len,chunkOffset:b64Len*1},(data)=>{
					if(data.data!=b64)throw new Error("读取1结果不一致");
				}],
				["readFile",{path:testFile,type:"base64",chunkSize:b64Len,chunkOffset:b64Len*2},(data)=>{
					if(data.data!=b64)throw new Error("读取2结果不一致");
				}]
			]);
			
			await this.exec("重命名和复制文件",[
				["writeFile",{path:testFile+"2",dataBase64:b64}], //文件已存在
				["writeFile",{path:testFile+"3",dataBase64:b64}], //文件已存在
				
				["moveFile",{fromPath:testFile,path:testFile+"2"}],
				["copyFile",{fromPath:testFile+"2",path:testFile+"3"}],
				["readFile",{path:testFile+"3",type:"text"},(data)=>{
					if(data.data!=b64Txt+b64Txt+b64Txt)throw new Error("读取结果不一致");
				}]
			]);
			
			await this.exec("读取文件信息",[
				["resolvePath",{path:null},null,true], //错误调用
				
				["resolvePath",{path:testFile+"3",pathInfo:true},(data)=>{
					data=data.pathInfo;
					if(!data.isExists)throw new Error("文件不存在");
					if(data.size!=b64Len*3)throw new Error("文件大小不正确");
					if(!data.date || Date.now()-data.date>10000)throw new Error("文件时间不正确");
				}]
			]);
			await this.exec("读取文件列表",[
				["listPath",{path:null},null,true], //错误调用
				
				["listPath",{path:""},(data)=>{
					if(!data.dirs || data.dirs==null)throw new Error("没有dirs");
					var count=0;
					for(var i=0;i<data.files.length;i++){
						var o=data.files[i];
						if(o.name==testFile ||o.name==testFile+"2" ||o.name==testFile+"3"){
							count++;
						}
						if(o.size!=b64Len*3)throw new Error("文件大小不正确");
						if(!o.date || Date.now()-o.date>10000)throw new Error("文件时间不正确");
					}
					if(count!=2)throw new Error("已知的文件数量不对");
					return "文件"+data.files.length+"个，文件夹"+data.dirs.length+"个"+JSON.stringify(data.dirs);
				}]
			]);
			await this.exec("删除文件",[
				["deleteFile",{path:""},null,true], //错误调用
				
				["writeFile",{path:testFile+"4/aa.txt",dataBase64:b64}], //文件夹
				["writeFile",{path:testFile+"4/bb.txt",dataBase64:b64}],
				["resolvePath",{path:testFile+"4",pathInfo:true},(data)=>{
					data=data.pathInfo;
					if(!data.isExists)throw new Error("文件夹不存在");
					if(data.isFile!==false)throw new Error("文件夹isFile!=false");
				}],
				["deleteFile",{path:testFile+"4"},null,true], //文件夹无法当做文件删除
				["deleteFile",{path:testFile+"4",isDir:true}], //删除文件夹
				["resolvePath",{path:testFile+"4",pathInfo:true},(data)=>{
					data=data.pathInfo;
					if(data.isExists)throw new Error("文件夹未删除");
				}],
				
				["deleteFile",{path:testFile+"noop"}], //删除不存在的路径
				["deleteFile",{path:testFile+"noop",isDir:true}],
				["deleteFile",{path:testFile}],
				["deleteFile",{path:testFile+"2"}],
				["deleteFile",{path:testFile+"3"}],
				["resolvePath",{path:testFile+"3",pathInfo:true},(data)=>{
					if(data.isExists)throw new Error("文件未删除");
				}]
			]);
			
			if(RecordApp.UniIsApp()==1){
				await this.exec("请求安卓存储权限",[["androidStoragePermission__limited",{},(data)=>{
					return "code:"+data.code
				}]]);
			}
			if(RecordApp.UniIsApp()==2){
				await this.exec("iOS设置categoryOptions",[
					["iosSetDefault_categoryOptions",{value:0x7fffffff}],
					["iosSetDefault_categoryOptions",{value:0}],
					["iosSetDefault_categoryOptions",{value:0x1 | 0x2 | 0x4 | 0x8 | 0x20 | 0x40 | 0x80}],
					["iosSetDefault_categoryOptions",{value:0x1 | 0x4}]
				]);
			}
			
			this.getPage().addTestMsg("原生插件调用测试完成");
			this.reclog("原生插件调用测试完成");
		}
	}
}
</script>