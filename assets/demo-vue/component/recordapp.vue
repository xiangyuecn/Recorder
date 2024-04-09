<style>
body{
	word-wrap: break-word;
	background:#f5f5f5 center top no-repeat;
	background-size: auto 680px;
}
pre{
	white-space:pre-wrap;
}
a{
	text-decoration: none;
	color:#06c;
}
a:hover{
	color:#f00;
}

.main{
	max-width:700px;
	margin:0 auto;
	padding-bottom:80px
}

.mainBox{
	margin-top:12px;
	padding: 12px;
	border-radius: 6px;
	background: #fff;
	--border: 1px solid #0b1;
	box-shadow: 2px 2px 3px #aaa;
}


.btns button{
	display: inline-block;
	cursor: pointer;
	border: none;
	border-radius: 3px;
	background: #0b1;
	color:#fff;
	padding: 0 15px;
	margin:3px 20px 3px 0;
	line-height: 36px;
	height: 36px;
	overflow: hidden;
	vertical-align: middle;
}
.btns button:active{
	background: #0a1;
}
.pd{
	padding:0 0 6px 0;
}
.lb{
	display:inline-block;
	vertical-align: middle;
	background:#00940e;
	color:#fff;
	font-size:14px;
	padding:2px 8px;
	border-radius: 99px;
}
</style>


<template>
<div class="main">
	<slot name="top"></slot>

	<div class="mainBox">
		<div class="pd">
			类型：{{ type }}
			<span style="margin:0 20px">
			比特率: <input type="text" v-model="bitRate" style="width:60px"> kbps
			</span>
			采样率: <input type="text" v-model="sampleRate" style="width:60px"> hz
		</div>

		<div class="btns">
			<button @click="recReq">请求权限</button>
			<button @click="recStart">录制</button>
			<button @click="recStop">停止</button>
		</div>
		<div class="btns">
			<span style="display: inline-block;margin-right: 36px;">
				<button @click="recPause">暂停</button>
				<button @click="recResume">继续</button>
				<button @click="recStopX">停止(仅清理)</button>
			</span>
			
			<span style="display: inline-block;">
				<button @click="recPlayLast">播放</button>
				<button @click="recUploadLast">上传</button>
				<button @click="recDownLast">本地下载</button>
			</span>
		</div>
	</div>

	<div class="mainBox">
		<div style="height:100px;width:300px;border:1px solid #ccc;box-sizing: border-box;display:inline-block;vertical-align:bottom" class="ctrlProcessWave"></div>
		<div style="height:40px;width:300px;display:inline-block;background:#999;position:relative;vertical-align:bottom">
			<div class="ctrlProcessX" style="height:40px;background:#0B1;position:absolute;" :style="{width:powerLevel+'%'}"></div>
			<div class="ctrlProcessT" style="padding-left:50px; line-height:40px; position: relative;">{{ durationTxt+"/"+powerLevel }}</div>
		</div>
		
		<!-- 功能配置区域 -->
		<div style="padding-top:10px">
			<div>
				<span class="lb">AppUseH5 :</span> <label><input type="checkbox" @click="setAppUseH5($event)">App里面总是使用Recorder H5录音</label>
			</div>
		</div>
	</div>
	
	<div class="mainBox">
		<!-- 放一个 <audio ></audio> 播放器，标签名字大写，阻止uniapp里面乱编译 -->
		<AUDIO ref="LogAudioPlayer" style="width:100%"></AUDIO>

		<div class="mainLog">
			<div v-for="obj in logs" :key="obj.idx">
				<div :style="{color:obj.color==1?'red':obj.color==2?'green':obj.color}">
					<!-- <template v-once> 在v-for里存在的bug，参考：https://v2ex.com/t/625317 -->
					<span v-once>[{{ getTime() }}]</span><span v-html="obj.msg"/>
					
					<template v-if="obj.res">
						{{ intp(obj.res.rec.set.bitRate,3) }}kbps
						{{ intp(obj.res.rec.set.sampleRate,5) }}hz
						编码{{ intp(obj.res.blob.size,6) }}b
						[{{ obj.res.rec.set.type }}]{{ obj.res.durationTxt }}ms 
						
						<button @click="recdown(obj.idx)">下载</button>
						<button @click="recplay(obj.idx)">播放</button>

						<span v-html="obj.playMsg"></span>
						<span v-if="obj.down">
							<span style="color:red">{{ obj.down }}</span>
							
							没弹下载？试一下链接或复制文本<button @click="recdown64(obj.idx)">生成Base64文本</button>

							<textarea v-if="obj.down64Val" v-model="obj.down64Val"></textarea>
						</span>
					</template>
				</div>
			</div>
		</div>
	</div>

	<slot name="bottom"></slot>
</div>
</template>












<script>
/*********加载Recorder需要的文件***********/
//引入核心文件，换成require也是一样的
import Recorder from 'recorder-core' //注意如果未引用Recorder变量，可能编译时会被优化删除（如vue3 tree-shaking），请改成 import 'recorder-core'，或随便调用一下 Recorder.a=1 保证强引用

//引入相应格式支持文件；如果需要多个格式支持，把这些格式的编码引擎js文件放到后面统统加载进来即可
import 'recorder-core/src/engine/mp3'
import 'recorder-core/src/engine/mp3-engine'

//可选的扩展支持项
import 'recorder-core/src/extensions/waveview'


/********加载RecordApp需要用到的支持文件*********/
//引入RecordApp
import RecordApp from 'recorder-core/src/app-support/app'

//引入Native支持文件，用于在Android、iOS App中调用原生录音
import 'recorder-core/src/app-support/app-native-support'

//引入Native测试配置文件（实现Hybrid App的JsBridge调用），提供这些文件时可免去修改app.js源码。这些配置文件需要自己编写，参考 app-support-sample 目录内演示用的配置文件代码
import '../copy/native-config.js'




module.exports={
	data(){
		return {
			type:"mp3"
			,bitRate:16
			,sampleRate:16000

			,duration:0
			,durationTxt:"0"
			,powerLevel:0

			,logs:[]
		}
	}
	,created:function(){
		var This=this;
		this.App=RecordApp;
		this.Rec=Recorder;
		
		//立即加载环境
		RecordApp.Install(function(){
			This.reclog("Install成功，环境："+RecordApp.Current.Key,2);
		},function(err){
			This.reclog("RecordApp.Install出错："+err,1);
		});
	}
	,methods:{
		recReq:function(){
			var This=this;
			This.reclog("开始请求授权...");

			RecordApp.RequestPermission(function(){
				This.reclog(RecordApp.Current.Key+"已授权",2);
			},function(err,isUserNotAllow){
				This.reclog((RecordApp.Current&&RecordApp.Current.Key||"[?]")
						+(isUserNotAllow?" UserNotAllow, ":"")
						+" 授权失败："+err,1);
			});
		}
		,recStart:function(){
			var This=this;
			if(!RecordApp.Current){
				This.reclog("未请求权限", 1);
				return;
			};
			
			if(RecordApp.Current==RecordApp.Platforms.Native){
				This.reclog("正在使用Native录音，底层由App原生层提供支持");
			}else{
				This.reclog("正在使用H5录音，底层由Recorder直接提供支持");
			};
			
			var set={
				type:This.type
				,bitRate:+This.bitRate
				,sampleRate:+This.sampleRate
				//,audioTrackSet:{echoCancellation:true,noiseSuppression:true,autoGainControl:true} //配置回声消除，注意：H5中需要在请求录音权限前进行相同配置RecordApp.RequestPermission_H5OpenSet后此配置才会生效
				,onProcess:function(buffers,powerLevel,duration,sampleRate){
					This.duration=duration;
					This.durationTxt=This.formatMs(duration,1);
					This.powerLevel=powerLevel;

					This.wave.input(buffers[buffers.length-1],powerLevel,sampleRate);
				}
			};
			
			This.reclog(RecordApp.Current.Key+" 正在打开...");
			RecordApp.Start(set,function(){
				This.reclog(RecordApp.Current.Key+"录制中:"+set.type+" "+set.bitRate+"kbps",2);
				
				//此处创建这些音频可视化图形绘制浏览器支持妥妥的
				This.wave=Recorder.WaveView({elem:".ctrlProcessWave"});
			},function(err){
				This.reclog(RecordApp.Current.Key+"开始录音失败："+err,1);
			});
		}
		,recPause:function(){
			if(RecordApp.GetCurrentRecOrNull()){
				RecordApp.Pause();
				this.reclog("已暂停");
			}
		}
		,recResume:function(){
			if(RecordApp.GetCurrentRecOrNull()){
				RecordApp.Resume();
				this.reclog("继续录音中...");
			}
		}
		,recStop:function(){
			var This=this;
			if(!RecordApp.Current){
				This.reclog("未请求权限",1);
				return;
			}
			
			RecordApp.Stop(function(aBuf,duration,mime){
				var blob=new Blob([aBuf],{type:mime});
				This.reclog("已录制:","",{
					blob:blob
					,duration:duration
					,durationTxt:This.formatMs(duration)
					,rec:{set:RecordApp.GetCurrentRecOrNull().set}
				});
			},function(msg){
				This.reclog("录音失败："+msg,1);
			});
		}
		,recStopX:function(){
			var This=this;
			RecordApp.Stop(
				null //success传null就只会清理资源，不会进行转码
				,function(msg){
					This.reclog("已清理，错误信息："+msg);
				}
			);
		}







		,recPlayLast:function(){
			if(!this.recLogLast){
				this.reclog("请先录音，然后停止后再播放",1);
				return;
			};
			this.recplay(this.recLogLast.idx);
		}
		,recUploadLast:function(){
			if(!this.recLogLast){
				this.reclog("请先录音，然后停止后再上传",1);
				return;
			};
			var This=this;
			var blob=this.recLogLast.res.blob;
			
			//本例子假设使用原始XMLHttpRequest请求方式，实际使用中自行调整为自己的请求方式
			//录音结束时拿到了blob文件对象，可以用FileReader读取出内容，或者用FormData上传
			var api="http://127.0.0.1:9528";
			var onreadystatechange=function(xhr,title){
				return function(){
					if(xhr.readyState==4){
						if(xhr.status==200){
							This.reclog(title+"上传成功"+' <span style="color:#999">response: '+xhr.responseText+'</span>',2);
						}else{
							This.reclog(title+"没有完成上传，演示上传地址无需关注上传结果，只要浏览器控制台内Network面板内看到的请求数据结构是预期的就ok了。", "#d8c1a0");
							
							console.error(title+"上传失败",xhr.status,xhr.responseText);
						};
					};
				};
			};
			This.reclog("开始上传到"+api+"，请稍候... （你可以先到源码 /assets/node-localServer 目录内执行 npm run start 来运行本地测试服务器）");

			/***方式一：将blob文件转成base64纯文本编码，使用普通application/x-www-form-urlencoded表单上传***/
			var reader=new FileReader();
			reader.onloadend=function(){
				var postData="";
				postData+="mime="+encodeURIComponent(blob.type);//告诉后端，这个录音是什么格式的，可能前后端都固定的mp3可以不用写
				postData+="&upfile_b64="+encodeURIComponent((/.+;\s*base64\s*,\s*(.+)$/i.exec(reader.result)||[])[1]) //录音文件内容，后端进行base64解码成二进制
				//...其他表单参数
				
				var xhr=new XMLHttpRequest();
				xhr.open("POST", api+"/uploadBase64");
				xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
				xhr.onreadystatechange=onreadystatechange(xhr,"上传方式一【Base64】");
				xhr.send(postData);
			};
			reader.readAsDataURL(blob);

			/***方式二：使用FormData用multipart/form-data表单上传文件***/
			var form=new FormData();
			form.append("upfile",blob,"recorder.mp3"); //和普通form表单并无二致，后端接收到upfile参数的文件，文件名为recorder.mp3
			//...其他表单参数
			
			var xhr=new XMLHttpRequest();
			xhr.open("POST", api+"/upload");
			xhr.onreadystatechange=onreadystatechange(xhr,"上传方式二【FormData】");
			xhr.send(form);
		}
		,recDownLast:function(){
			if(!this.recLogLast){
				this.reclog("请先录音，然后停止后再下载",1);
				return;
			};
			this.recdown(this.recLogLast.idx);
		}










		,reclog:function(msg,color,res){
			var obj={
				idx:this.logs.length
				,msg:msg
				,color:color
				,res:res

				,playMsg:""
				,down:0
				,down64Val:""
			};
			if(res&&res.blob){
				this.recLogLast=obj;
			};
			this.logs.splice(0,0,obj);
		}
		,recplay:function(idx){
			var This=this;
			var o=this.logs[this.logs.length-idx-1];
			o.play=(o.play||0)+1;
			var logmsg=function(msg){
				o.playMsg='<span style="color:green">'+o.play+'</span> '+This.getTime()+" "+msg;
			};
			logmsg("");

			var audio=this.$refs.LogAudioPlayer;
			audio.controls=true;
			if(!(audio.ended || audio.paused)){
				audio.pause();
			};
			audio.onerror=function(e){
				logmsg('<span style="color:red">播放失败['+audio.error.code+']'+audio.error.message+'</span>');
			};
			audio.src=(window.URL||webkitURL).createObjectURL(o.res.blob);
			audio.play();
		}
		,recdown:function(idx){
			var This=this;
			var o=this.logs[this.logs.length-idx-1];
			o.down=(o.down||0)+1;

			o=o.res;
			var name="rec-"+o.duration+"ms-"+(o.rec.set.bitRate||"-")+"kbps-"+(o.rec.set.sampleRate||"-")+"hz."+(o.rec.set.type||(/\w+$/.exec(o.blob.type)||[])[0]||"unknown");
			var downA=document.createElement("A");
			downA.href=(window.URL||webkitURL).createObjectURL(o.blob);
			downA.download=name;
			downA.click();
		}
		,recdown64:function(idx){
			var This=this;
			var o=this.logs[this.logs.length-idx-1];
			var reader = new FileReader();
			reader.onloadend = function() {
				o.down64Val=reader.result;
			};
			reader.readAsDataURL(o.res.blob);
		}
		,getTime:function(){
			var now=new Date();
			var t=("0"+now.getHours()).substr(-2)
				+":"+("0"+now.getMinutes()).substr(-2)
				+":"+("0"+now.getSeconds()).substr(-2);
			return t;
		}
		,formatMs:function(ms,all){
			var ss=ms%1000;ms=(ms-ss)/1000;
			var s=ms%60;ms=(ms-s)/60;
			var m=ms%60;ms=(ms-m)/60;
			var h=ms;
			var t=(h?h+":":"")
				+(all||h+m?("0"+m).substr(-2)+":":"")
				+(all||h+m+s?("0"+s).substr(-2)+"″":"")
				+("00"+ss).substr(-3);
			return t;
		}
		,intp:function(s,len){
			s=s==null?"-":s+"";
			if(s.length>=len)return s;
			return ("_______"+s).substr(-len);
		}
		
		
		,setAppUseH5:function(e){
			RecordApp.AlwaysAppUseH5=e.target.checked;
			RecordApp.Current=null;
			this.reclog("AppUseH5选项变更，已重置RecordApp，请先进行权限测试");
		}
	}
}
</script>