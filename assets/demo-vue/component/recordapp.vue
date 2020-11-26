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


.mainBtn{
    display: inline-block;
    cursor: pointer;
    border: none;
    border-radius: 3px;
    background: #0b1;
    color:#fff;
    padding: 0 15px;
    margin-right:20px;
    line-height: 36px;
    height: 36px;
    overflow: hidden;
    vertical-align: middle;
}
.mainBtn:active{
    background: #0a1;
}
.ctrlBtn{
    margin-top:10px;
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
        <div>
            类型：{{ type }}
            <span style="margin:0 20px">
            比特率: <input type="text" v-model="bitRate" style="width:60px"> kbps
            </span>
            采样率: <input type="text" v-model="sampleRate" style="width:60px"> hz
        </div>

        <div>
            <button class="mainBtn ctrlBtn" @click="recReq">请求权限</button>
            <button class="mainBtn ctrlBtn" @click="recStart">录制</button>
            <button class="mainBtn ctrlBtn" @click="recStop">停止</button>
        </div>
    </div>

    <div class="mainBox">
        <div style="height:100px;width:300px;border:1px solid #ccc;box-sizing: border-box;display:inline-block;vertical-align:bottom" class="ctrlProcessWave"></div>
        <div style="height:40px;width:300px;display:inline-block;background:#999;position:relative;vertical-align:bottom">
            <div class="ctrlProcessX" style="height:40px;background:#0B1;position:absolute;" :style="{width:powerLevel+'%'}"></div>
            <div class="ctrlProcessT" style="padding-left:50px; line-height:40px; position: relative;">{{ duration+"/"+powerLevel }}</div>
        </div>
        
        <!-- 功能配置区域 -->
		<div style="padding-top:10px">
			<div class="pd">
				<span class="lb">JsSDK :</span> <label><input type="checkbox" :checked="App.AlwaysUseWeixinJS" @click="setClick('RecordApp_AlwaysUseWeixinJS',$event)">Android微信内也用JsSDK</label>
			</div>
			<div>
				<span class="lb">AppUseJS :</span> <label><input type="checkbox" :checked="App.AlwaysAppUseJS" @click="setClick('RecordApp_AlwaysAppUseJS',$event)">App里面总是使用Recorder H5录音</label>
			</div>
		</div>
    </div>
    
    <div class="mainBox">
        <audio ref="LogAudioPlayer" style="width:100%"></audio>

        <div class="mainLog">
            <div v-for="obj in logs" :key="obj.idx">
                <div :style="{color:obj.color==1?'red':obj.color==2?'green':obj.color}">
                    <!-- <template v-once> 在v-for里存在的bug，参考：https://v2ex.com/t/625317 -->
                    <span v-once>[{{ getTime() }}]</span><span v-html="obj.msg"/>
                    
                    <template v-if="obj.res">
                        {{ intp(obj.res.rec.set.bitRate,3) }}kbps
                        {{ intp(obj.res.rec.set.sampleRate,5) }}hz
                        编码{{ intp(obj.res.blob.size,6) }}b
                        [{{ obj.res.rec.set.type }}]{{ intp(obj.res.duration,6) }}ms 
                        
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

    <div v-if="recOpenDialogShow" style="z-index:99999;width:100%;height:100%;top:0;left:0;position:fixed;background:rgba(0,0,0,0.3);">
        <div style="display:flex;height:100%;align-items:center;">
            <div style="flex:1;"></div>
            <div style="width:240px;background:#fff;padding:15px 20px;border-radius: 10px;">
                <div style="padding-bottom:10px;">录音功能需要麦克风权限，请允许；如果未看到任何请求，请点击忽略~</div>
                <div style="text-align:center;"><a @click="waitDialogClick" style="color:#0B1">忽略</a></div>
            </div>
            <div style="flex:1;"></div>
        </div>
    </div>

    <slot name="bottom"></slot>
</div>
</template>












<script>
//可选的独立配置文件，提供这些文件时可免去修改app.js源码。这些配置文件需要自己编写，参考https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample 目录内的这两个演示用的配置文件代码。
//你可以直接copy /app-support-sample 目录内的两个演示配置文件改改后，就能正常使用了
//【需修改成你自己的文件路径】【js文件里面的代码也需修改后才可用】
import '../copy/native-config.js' //可选开启native支持的相关配置
import '../copy/ios-weixin-config.js' //可选开启ios weixin支持的相关配置


/********加载RecordApp需要用到的支持文件*********/
//必须引入的app核心文件，换成require也是一样的。注意：app.js会自动往window下挂载名称为RecordApp对象，全局可调用window.RecordApp，也许可自行调整相关源码清除全局污染
import RecordApp from 'recorder-core/src/app-support/app'
//可选开启Native支持，需要引入此文件
import 'recorder-core/src/app-support/app-native-support'
//可选开启IOS上微信录音支持，需要引入此文件
import 'recorder-core/src/app-support/app-ios-weixin-support'


/*********加载Recorder需要的文件***********/
//必须引入的核心，所有需要的文件都应当引入，引入后会检测到组件已自动加载
//不引入也可以，app.js会去用script动态加载，应确保app.js内BaseFolder目录的正确性(参阅RecordAppBaseFolder)，否则会导致404 js加载失败
import Recorder from 'recorder-core'

//【要打包到一个js就解开注释】本demo是通过script动态引入这些引擎js文件
//需要使用到的音频格式编码引擎的js文件统统加载进来，这些引擎文件会比较大
//【解开】import 'recorder-core/src/engine/mp3'
//【解开】import 'recorder-core/src/engine/mp3-engine'

//由于大部分情况下ios-weixin的支持需要用到amr解码器，应当把amr引擎也加载进来，这些引擎文件会比较大
//【解开】import 'recorder-core/src/engine/beta-amr'
//【解开】import 'recorder-core/src/engine/beta-amr-engine'
//【解开】import 'recorder-core/src/engine/wav' //amr依赖了wav引擎

//可选的扩展支持项
import 'recorder-core/src/extensions/waveview'








RecordApp.AlwaysUseWeixinJS=!!(+localStorage["RecordApp_AlwaysUseWeixinJS"]||0);
RecordApp.AlwaysAppUseJS=!!(+localStorage["RecordApp_AlwaysAppUseJS"]||0);

//立即加载环境，自动把Recorder加载进来
RecordApp.Install(function(){
	console.log("RecordApp.Install成功");
},function(){
	var msg="RecordApp.Install出错："+err;
	console.log(msg);
	alert(msg);
});













module.exports={
    data(){
        return {
            App:RecordApp
            ,Rec:Recorder
            
            ,type:"mp3"
            ,bitRate:16
            ,sampleRate:16000

            ,rec:false
            ,duration:0
            ,powerLevel:0

            ,recOpenDialogShow:0
            ,logs:[]
        }
    }
    ,methods:{
        recReq:function(){
            var This=this;
            This.rec=false;

            This.dialogInt=setTimeout(function(){//定时8秒后打开弹窗，用于监测浏览器没有发起权限请求的情况
                This.showDialog();
            },8000);
            RecordApp.RequestPermission(function(){
                This.rec=true;
                This.dialogCancel();
                
                This.reclog("已打开录音，可以点击录制开始录音了",2);
            },function(err,isUserNotAllow){
                This.dialogCancel();
                This.reclog((isUserNotAllow?"UserNotAllow，":"")+"打开录音失败："+err,1);
            });
            This.waitDialogClickFn=function(){
                This.dialogCancel();
                This.reclog("打开失败：权限请求被忽略，用户主动点击的弹窗",1);
            };
        }
        ,recStart:function(){
            var This=this;
            if(!This.rec || !RecordApp.Current){
                This.reclog("未请求权限", 1);
                return;
            };
            
            if(RecordApp.Current==RecordApp.Platforms.Weixin){
                This.reclog("正在使用微信JsSDK，录音过程中不会有任何回调，不要惊慌");
            }else if(RecordApp.Current==RecordApp.Platforms.Native){
                This.reclog("正在使用Native录音，底层由App原生层提供支持");
            }else{
                This.reclog("正在使用H5录音，底层由Recorder直接提供支持");
            };
            
            var set={
                type:This.type
                ,bitRate:This.bitRate
                ,sampleRate:This.sampleRate
                ,onProcess:function(buffers,powerLevel,duration,sampleRate){
                    This.duration=duration;
                    This.powerLevel=powerLevel;

                    This.wave.input(buffers[buffers.length-1],powerLevel,sampleRate);
                }
            };
            
            RecordApp.Start(set,function(){
                This.reclog(RecordApp.Current.Key+"录制中:"+set.type+" "+set.bitRate+"kbps",2);
                
                //此处创建这些音频可视化图形绘制浏览器支持妥妥的
                This.wave=Recorder.WaveView({elem:".ctrlProcessWave"});
            },function(err){
                This.reclog(RecordApp.Current.Key+"开始录音失败："+err,1);
            });
        }
        ,recStop:function(){
            var This=this;
            var rec=This.rec;
            This.rec=false;
            if(!rec || !RecordApp.Current){
                This.reclog("未请求权限",1);
                return;
            }
            
            RecordApp.Stop(function(blob,duration){
                This.reclog("已录制:","",{
                    blob:blob
                    ,duration:duration
                    ,rec:RecordApp.GetStopUsedRec()
                });
            },function(msg){
                This.reclog("录音失败："+msg,1);
            });
        }










        ,reclog:function(msg,color,res){
            this.logs.splice(0,0,{
                idx:this.logs.length
                ,msg:msg
                ,color:color
                ,res:res

                ,playMsg:""
                ,down:0
                ,down64Val:""
            });
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
        ,intp:function(s,len){
            s=s==null?"-":s+"";
            if(s.length>=len)return s;
            return ("_______"+s).substr(-len);
        }


        ,showDialog:function(){
            //我们可以选择性的弹一个对话框：为了防止移动端浏览器存在第三种情况：用户忽略，并且（或者国产系统UC系）浏览器没有任何回调
            if(!/mobile/i.test(navigator.userAgent)){
                return;//只在移动端开启没有权限请求的检测
            };
            this.recOpenDialogShow=1;
        }
        ,dialogCancel:function(){
            clearTimeout(this.dialogInt);
            this.recOpenDialogShow=0;
        }
        ,waitDialogClick:function(){
            this.dialogCancel();
            this.waitDialogClickFn();
        }
        
        
        ,setClick:function(key,e){
            localStorage[key]=e.target.checked?1:0;
		    location.reload();
        }
    }
}
</script>