<template>
<view></view>
</template>

<script>
import Recorder from 'recorder-core';
import RecordApp from 'recorder-core/src/app-support/app.js';
import 'recorder-core/src/engine/wav.js';
import 'recorder-core/src/extensions/create-audio.nmn2pcm.js'

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
		,addMsg(tag,msg,err){
			this.getPage().addTestMsg((err?"[Error]":"[OK]")+" "+tag+"："+msg,err?1:2);
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
		
		
		//实时写入pcm数据到wav文件，最后添加wav头变成可播放wav文件
		,async realtimeWritePcm2Wav(){
			this.getPage().testMsgs=[];
			this.getPage().addTestMsg("实时写入pcm数据到wav文件测试开始...");
			this.getPage().addTestMsg("参考源码在 pages/recTest/test_native_plugin.vue 中的 realtimeWritePcm2Wav 方法","#aaa");
			
			//===开始录音前初始化===
			var file="testRtPcm.wav"; //生成一个文件名
			var pcmSize=0;
			var pcmSampleRate=16000; //保存pcm的采样率
			//新创建文件，在文件开头预留44字节wav头的位置
			try{
				//如果直接对接的原生插件没有import RecordApp，请直接调用RecNP.request或自己封装的RecNP_CallAsync
					//RecordApp.UniBtoa可换成uni.arrayBufferToBase64
				await RecordApp.UniNativeUtsPluginCallAsync("writeFile",{ path:file, dataBase64:RecordApp.UniBtoa(new Uint8Array(44).buffer) });
			}catch(e){
				this.getPage().addTestMsg("测试出现异常："+e.message,1);
				return;
			}
			
			//===录音onProcess中实时写入pcm数据===
			var chunk;
			var onProcess=(buffers,powerLevel,duration,sampleRate)=>{
				chunk=Recorder.SampleData(buffers,sampleRate,pcmSampleRate,chunk);
				var pcm=chunk.data;
				
				//直接将pcm追加写入到文件
				pcmSize+=pcm.byteLength; onProcPcm(pcm);
				RecordApp.UniNativeUtsPluginCallAsync("writeFile",{ path:file, append:true, dataBase64:RecordApp.UniBtoa(pcm.buffer) });
			};
			
			//===录音结束后生成wav头===
			var onStop=()=>{
				var header=Recorder.wav_header(1,1,pcmSampleRate,16,pcmSize); //可import engine/wav.js，也可以直接从wav.js中复制wav_header整个函数过来使用
				//将wav头写入到文件开头位置
				RecordApp.UniNativeUtsPluginCallAsync("writeFile",{ path:file, seekOffset:0, dataBase64:RecordApp.UniBtoa(header.buffer) })
				.then((data)=>{
					//wav文件已经保存完毕，播放测试
					testEnd(data.fullPath, header);
				});
			};
			
			//模拟测试数据
			var onProcPcm, testEnd, savePcms=[];
			setTimeout(()=>{
				onProcPcm=(pcm)=>{ savePcms.push(new Uint8Array(pcm.buffer)); };
				var testPcm=Recorder.NMN2PCM.GetExamples().Canon.get(48000).pcm;
				var testBlock=100000,testOffset=0,testBuffers=[];
				while(testOffset<testPcm.length){
					testBuffers.push(testPcm.slice(testOffset, testOffset+testBlock));
					testOffset+=testBlock;
					
					onProcess(testBuffers,0,0,48000);
				}
				testEnd=async (path, header)=>{
					//读取出来校验一下文件内容是否一致
					var fileB64=(await RecordApp.UniNativeUtsPluginCallAsync("readFile",{ path:file })).data;
					savePcms.splice(0,0,header); var size=0;
					for(var i=0;i<savePcms.length;i++)size+=savePcms[i].length;
					var bytes=new Uint8Array(size);
					for(var i=0,n=0;i<savePcms.length;i++){
						bytes.set(savePcms[i], n); n+=savePcms[i].length;
					}
					var bytesB64=RecordApp.UniBtoa(bytes.buffer);
					if(fileB64!=bytesB64){
						this.getPage().addTestMsg("文件内容校验不一致 "+fileB64.length+" "+bytesB64.length,1);
					}
					
					var duration=Math.round(testPcm.length/48000*1000);
					this.getPage().addTestMsg("在上面可以播放 wav:"+duration+"ms "+bytes.length+"字节 "+path);
					this.getPage().addTestMsg("实时写入pcm数据到wav文件OK",2);
					
					this.getPage().showH5Player(path);
				};
				onStop();
			},300);
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
							if(o.size!=b64Len*3)throw new Error("文件大小不正确");
							if(!o.date || Date.now()-o.date>10000)throw new Error("文件时间不正确");
						}
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