var Recorder=require("../../copy-rec-src/src/recorder-core.js");
var RecordApp=require("../../copy-rec-src/src/app-support/app.js");
Recorder.a=1;

// 上传保存录音文件
Component({
	data: {
		httpApi:""
	},
	attached(){
		var httpApi="http://你电脑局域网ip:9528/";
		httpApi=wx.getStorageSync("page_test_upsf_httpApi")||httpApi;
		this.setData({ httpApi:httpApi });
		
		var ps=getCurrentPages();
		this.parentPage=ps[ps.length-1];
		console.log({test_upload_saveFile__:this});
	},
	methods: {
		inputSet(e){
			var val=e.detail.value;
			var data=e.target.dataset;
			if(val && data.type=="number"){ val=+val||0; }
			var obj={}; obj[data.key]=val;
			this.setData(obj);
		}
		,getPage(){
			return this.parentPage;
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
				if(!/^https?:\/\/.+\/$/i.test(this.data.httpApi) || /局域网/.test(this.data.httpApi)){
					this.log("请配置http地址（/结尾），比如填写：http://127.0.0.1:9528/",1);
					return false;
				}
				wx.setStorageSync("page_test_upsf_httpApi", this.data.httpApi); //测试用的存起来
			}
			return true;
		}
		
		
		//================【上传】===================
		//录音转成base64文本，使用普通表单进行上传（application/x-www-form-urlencoded）
		,uploadBase64Click(){
			if(!this.checkSet(1))return;
			this.log("正在base64上传...");
			wx.request({
				url: this.data.httpApi+"uploadBase64"
				,method: "POST"
				,header: { "content-type":"application/x-www-form-urlencoded" }
				,data: {
					upfile_b64: wx.arrayBufferToBase64(this.audioABuffer)
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
			this.log("正在上传... url:"+this.data.httpApi+"upload");
			
			SaveLocalFile(this.audioABuffer, this.audioType, (savePath)=>{
				var delFile=()=>{ DeleteLocalFile(savePath) }; //上传结束就删除掉临时文件
				wx.uploadFile({
					url: this.data.httpApi+"upload"
					,filePath: savePath
					,name: "upfile"
					,formData: {  }
					,fail: (e)=>{
						delFile();
						this.log("上传出错："+e.errMsg,1);
						if(/-109/.test(e.errMsg) && /ERR_ADDRESS_UNREACHABLE/.test(e.errMsg)){
							this.log("无法上传。如果是iOS，可能由于iOS上不允许App访问本地网络，请到“系统设置 > 隐私 > 本地网络”中打开权限，方便本地测试",1);
						}
					}
					,success: (e) => {
						delFile();
						var data={}; try{ data=JSON.parse(e.data) }catch(e){ }
						if(data.c!==0){
							this.log(data.m||"未识别上传接口返回结果",1);
							return;
						}
						this.log("上传成功："+JSON.stringify(data),2);
					}
				});
			}, (err)=>{
				this.log("无法上传："+err,1);
			});
		}
	}
});



//================保存文件到本地===================
/**小程序支持保存文件到本地，方便后续播放、上传
arrayBuffer和type：RecordApp.Stop得到的录音文件数据和录音类型；type也可以用对象直接提供一个固定的文件名
success：fn(savePath) 保存成功后返回保存的路径；小程序为 wx.env.USER_DATA_PATH 路径
fail: fn(errMsg) 保存失败回调
*/
var SaveLocalFile=function(arrayBuffer,type,success,fail){
	//生成一个文件名
	var fileName=type.fileName||__LocalFileName(type);
	
	RecordApp.MiniProgramWx_WriteLocalFile(fileName, arrayBuffer, (path)=>{
		success(path);
	}, (errMsg)=>{
		fail("保存文件"+fileName+"失败："+errMsg);
	});
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
	RecordApp.MiniProgramWx_DeleteLocalFile(savePath,()=>{
		console.log("DeleteLocalFile 已删除文件 path="+savePath);
	},(errMsg)=>{
		console.error("DeleteLocalFile 删除文件失败："+errMsg+" path="+savePath);
	});
};

