<!-- 上传保存录音文件 -->
<template>
<view style="padding:0 3px">

<view style="border: 1px #666 dashed; padding:8px">
	<view>
		<text style="font-size:17px;font-weight: bold;color:#f60">保存文件本地播放</text>
		<text style="font-size:13px;color:#999;margin-left:10px">源码:test_upload_saveFile.vue</text>
	</view>
	<view>
		<button size="mini" type="default" @click="audioPlayClick">用InnerAudioContext播放</button>
		<button size="mini" type="default" @click="saveLocalFileClick">保存当前录音到本地文件</button>
	</view>
	<view>{{audioPlayMsg}}</view>
</view>

<view style="border: 1px #666 dashed; padding:8px; margin-top:8px">
	<view>
		<text style="font-size:17px;font-weight: bold;color:#f60">上传到服务器</text>
		<text style="font-size:13px;color:#999;margin-left:10px">源码:test_upload_saveFile.vue</text>
	</view>
	<view>
		<text>http(s)：</text>
		<input v-model="httpApi" style="width:260px;display:inline-block;border:1px solid #ddd"/>
	</view>
	<view style="font-size:13px;color:#999">需要先在电脑上运行Recorder仓库/assets/node-localServer内的nodejs服务器端脚本，然后填写你电脑局域网ip即可测试（H5时用127.0.0.1），支持http、https测试</view>
	
	<button size="mini" type="default" @click="uploadClick">上传当前录音到服务器</button>
	<button size="mini" type="default" @click="uploadBase64Click">使用base64格式上传</button>
</view>

</view>
</template>

<script>
import 'recorder-core';
import RecordApp from 'recorder-core/src/app-support/app.js';

//================保存文件到本地===================
/**App、小程序支持保存文件到本地，方便后续播放、上传；H5不支持，可用H5DownloadLocalFile通过Blob进行下载保存。
arrayBuffer和type：RecordApp.Stop得到的录音文件数据和录音类型；type也可以用对象直接提供一个固定的文件名
success：fn(savePath) 保存成功后返回保存的路径；app保存的路径为 / 打头本地文件绝对路径；小程序为 wx.env.USER_DATA_PATH 路径
fail: fn(errMsg) 保存失败回调
*/
var SaveLocalFile=function(arrayBuffer,type,success,fail){
	//生成一个文件名
	var fileName=type.fileName||__LocalFileName(type);
	
	//直接使用封装好的接口保存，app内部调用的plus.io接口，小程序内部调用的FileSystemManager.writeFile
	RecordApp.UniSaveLocalFile(fileName,arrayBuffer,(savePath)=>{
		success(savePath);
	},fail);
};
/**H5不支持直接将文件保存到本地，可以通过Blob下载保存
arrayBuffer和type：RecordApp.Stop得到的录音文件数据和录音类型
*/
var H5DownloadLocalFile=function(arrayBuffer,type){
	var downA=document.createElement("A");
	downA.href=URL.createObjectURL(new Blob([arrayBuffer],{type:"audio/"+type}));
	downA.download=__LocalFileName(type);
	downA.click();
};
/**生成一个文件名*/
var __LocalFileName=function(type){
	var now=new Date();
	var fileName="local-"+now.getFullYear()
		+("0"+(now.getMonth()+1)).substr(-2)
		+("0"+now.getDate()).substr(-2)
		+("0"+now.getHours()).substr(-2)
		+("0"+now.getMinutes()).substr(-2)
		+("0"+now.getSeconds()).substr(-2)
		+("00"+now.getMilliseconds()).substr(-3)
		+(Math.random()+"").substr(2,6)
		+"."+(type||"bin");
	return fileName;
};
/**删除SaveLocalFile保存到本地的文件。
savePath：SaveLocalFile得到的保存路径
*/
var DeleteLocalFile=function(savePath){
	// #ifdef APP
	var failCall=(e)=>{
		console.error("DeleteLocalFile 删除文件失败："+e.message+" path="+savePath);
	};
	plus.io.resolveLocalFileSystemURL(savePath, (file)=>{
		file.remove(()=>{
			console.log("DeleteLocalFile 已删除文件 path="+savePath);
		},failCall);
	},failCall);
	// #endif
	// #ifdef MP-WEIXIN
	wx.getFileSystemManager().unlink({
		filePath:savePath
		,success:()=>{ console.log("DeleteLocalFile 已删除文件 path="+savePath); }
		,fail:(e)=>{ console.error("DeleteLocalFile 删除文件失败："+e.errMsg+" path="+savePath); }
	});
	// #endif
};





//================使用上传表单上传文件 multipart/form-data===================
/**通用的上传文件数据到服务器，App、小程序、H5均支持，使用上传表单进行上传（multipart/form-data）。
api：上传接口地址
formData：上传除文件外的其他表单参数，比如 {uid:123}
formKey：表单中文件对应的表单参数key，比如 upfile
arrayBuffer和type：RecordApp.Stop得到的录音文件数据和录音类型
success：fn(data) 上传成功回调，参数为服务器响应中提取的内容
fail：fn(errMsg) 上传失败回调
*/
var UploadFile=function(api,formData,formKey,arrayBuffer,type,success,fail){
	//解析服务器返回的结果，需要按你自己api的格式去解析数据
	var endResult=(text)=>{
		var data={}; try{ data=JSON.parse(text) }catch(e){ }
		if(data.c!==0){
			fail(data.m||"未识别上传接口返回结果");
			return;
		}
		success(data.v);
	};
	
	//H5中直接使用浏览器提供的File接口构造一个文件
	// #ifdef H5
	uni.uploadFile({
		url: api
		,file: new File([arrayBuffer], "recorder."+type)
		,name: formKey
		,formData: formData
		,success: (e) => { endResult(e.data); }
		,fail: (e)=>{ fail(e.errMsg||"-"); }
	});
	return;
	// #endif
	
	//App、微信中需要将二进制数据保存到本地临时文件，然后再上传
	// #ifdef APP || MP-WEIXIN
	SaveLocalFile(arrayBuffer,type,(savePath)=>{
		var delFile=()=>{ DeleteLocalFile(savePath) }; //上传结束就删除掉临时文件
		uni.uploadFile({
			url: api
			,filePath: savePath
			,name: formKey
			,formData: formData
			,success: (e) => { delFile(); endResult(e.data); }
			,fail: (e)=>{ delFile(); fail(e.errMsg||"-"); }
		});
	},fail);
	return;
	// #endif
	
	fail("当前环境未支持上传文件");
};










export default {
	data(){
		return {
			httpApi:""
			,audioPlayMsg:""
		}
	},
	mounted() {
		var httpApi="http://你电脑局域网ip:9528/";
		// #ifdef H5
			httpApi="http://127.0.0.1:9528/";
		// #endif
		this.httpApi=uni.getStorageSync("page_test_upsf_httpApi")||httpApi;
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
		,log(){
			var p=this.getPage();
			p.reclog.apply(p,arguments);
		}
		,checkSet(api){
			if(!api || api==1){
				this.audioABuffer=this.getPage().lastRecBuffer;
				this.audioType=this.getPage().lastRecType;
				if(!this.audioABuffer){
					this.log("请先录个音",1);
					return false;
				}
			}
			if(api==1){
				if(!/^https?:\/\/.+\/$/i.test(this.httpApi) || /局域网/.test(this.httpApi)){
					this.log("请配置http地址（/结尾），比如填写：http://127.0.0.1:9528/",1);
					return false;
				}
				uni.setStorageSync("page_test_upsf_httpApi", this.httpApi); //测试用的存起来
			}
			return true;
		}
		
		
		
		//================【播放】===================
		//播放录音文件
		,audioPlayClick(){
			if(this.audioCtx){
				this.audioCtx.destroy(); this.audioCtx=null;
				this.audioPlayMsg="本次点击只关闭老播放器，请重新点击播放";
				return;
			}
			var __play=(url)=>{
				var msg="使用uni.createInnerAudioContext播放："+url;
				this.audioPlayMsg=msg;
				
				var ctx=this.audioCtx=uni.createInnerAudioContext();
				ctx.src=url;
				ctx.onError((res)=>{
					this.audioPlayMsg="播放失败：["+res.errCode+"]"+res.errMsg+"，"+msg;
				});
				ctx.onEnded(()=>{
					this.audioPlayMsg="已播放结束，"+msg;
					this.audioCtx.destroy(); this.audioCtx=null;
				});
				ctx.onPlay(()=>{
					this.audioPlayMsg="正在播放，"+msg
				});
				ctx.play();
			};
			
			if(!this.checkSet())return;
			this.audioPlayMsg="正在生成本地播放地址...";
			
			//H5通过Blob来播放
			// #ifdef H5
			var blob=new Blob([this.audioABuffer],{type:"audio/"+this.audioType});
			__play(URL.createObjectURL(blob));
			return;
			// #endif
			
			//App、小程序 保存成本地临时文件再播放
			SaveLocalFile(this.audioABuffer,{fileName:"temp-audio-upsf."+this.audioType},(savePath)=>{
				__play(savePath);
			},(err)=>{
				this.audioPlayMsg="无法播放，保存文件失败："+err;
			});
		}
		//将录音文件保存到本地
		,saveLocalFileClick(){
			if(!this.checkSet())return;
			
			//H5通过Blob来直接下载
			// #ifdef H5
			H5DownloadLocalFile(this.audioABuffer,this.audioType);
			return;
			// #endif
			
			//App、小程序 保存成本地文件
			SaveLocalFile(this.audioABuffer,this.audioType,(savePath)=>{
				this.log("文件已保存到："+savePath,2);
			},(err)=>{
				this.log("保存文件失败："+err,1);
			});
		}
		
		
		
		//================【上传】===================
		//录音转成base64文本，使用普通表单进行上传（application/x-www-form-urlencoded）
		,uploadBase64Click(){
			if(!this.checkSet(1))return;
			this.log("正在base64上传...");
			uni.request({
				url: this.httpApi+"uploadBase64"
				,method: "POST"
				,header: { "content-type":"application/x-www-form-urlencoded" }
				,data: {
					upfile_b64: uni.arrayBufferToBase64(this.audioABuffer)
					,mime:"audio/"+this.audioType
				}
				,fail: (e)=>{ this.log("base64上传出错："+e.errMsg,1); }
				,success: (e) => {
					if(e.data.c!==0){
						this.log("base64上传错误："+(e.data.m||"未识别上传接口返回结果"),1);
						return;
					}
					this.log("base64上传成功："+JSON.stringify(e.data.v),2);
				}
			});
		}
		//录音文件使用上传表单进行上传（multipart/form-data）
		,uploadClick(){
			if(!this.checkSet(1))return;
			this.log("正在上传...");
			UploadFile(this.httpApi+"upload"
				,{},"upfile"
				,this.audioABuffer,this.audioType
				,(data)=>{ this.log("上传成功："+JSON.stringify(data),2); }
				,(err)=>{ this.log("上传出错："+err,1); }
			);
		}
	}
}
</script>