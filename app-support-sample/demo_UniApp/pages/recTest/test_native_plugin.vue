<template>
<view v-if="show">
	<view v-for="item in msgs" style="border-top:1px dashed #eee; padding:5px 10px" :style="{color:item.err?'#f00':'#0a0'}">
		{{item.msg}}
	</view>
</view>
</template>

<script>
import 'recorder-core';
import RecordApp from 'recorder-core/src/app-support/app.js';

export default {
	data(){
		return {
			show:false
			,msgs:[]
		}
	},
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
			this.show=true;
			this.msgs=[];
			RecordApp.UniNativeUtsPlugin={nativePlugin:true}; //启用原生插件
			RecordApp.UniNativeUtsPluginCallAsync("resolvePath",{path:""}).then((data)=>{
				this.test();
			}).catch((e)=>{
				this.addMsg("err","测试原生插件调用失败，不可以进行原生插件测试："+e.message,1);
			});
		}
		,addMsg(tag,msg,err){
			this.msgs.splice(0,0,{msg:(err?"[Error]":"[OK]")+" "+tag+"："+msg,err:err});
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
			var testFile="test.txt";
			var b64Txt="测试😜123\n";
			var b64=RecordApp.UniB64Enc(b64Txt);
			var b64Len=RecordApp.UniAtob(b64).byteLength;
			var a1,a2,a3;
			
			await this.exec("插件信息",[["getInfo",{},(data)=>{
				return data.info;
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
			
			await this.exec("分段读写",[
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
			
			this.reclog("测试完成");
		}
	}
}
</script>