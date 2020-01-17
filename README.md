# :open_book:Recorder用于html5录音

[​](?Ref=Desc&Start)[在线测试](https://xiangyuecn.github.io/Recorder/)，支持大部分已实现`getUserMedia`的移动端、PC端浏览器；主要包括：Chrome、Firefox、Safari、Android WebView、腾讯Android X5内核(QQ、微信)；不支持：UC系内核（典型的支付宝，大部分国产手机厂商的浏览器），IOS上除Safari外的其他任何形式的浏览器（含PWA、WebClip、任何App内网页）。快捷方式: [【RecordApp测试】](https://jiebian.life/web/h5/github/recordapp.aspx)，[【vue+webpack测试】](https://xiangyuecn.github.io/Recorder/assets/demo-vue)，[【Android、IOS App Demo】](https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample)，[【工具】Recorder代码运行和静态分发](https://xiangyuecn.github.io/Recorder/assets/%E5%B7%A5%E5%85%B7-%E4%BB%A3%E7%A0%81%E8%BF%90%E8%A1%8C%E5%92%8C%E9%9D%99%E6%80%81%E5%88%86%E5%8F%91Runtime.html)，[【工具】裸(RAW、WAV)PCM转WAV播放测试和转码](https://xiangyuecn.github.io/Recorder/assets/%E5%B7%A5%E5%85%B7-%E8%A3%B8PCM%E8%BD%ACWAV%E6%92%AD%E6%94%BE%E6%B5%8B%E8%AF%95.html) ，[无用户操作测试](https://xiangyuecn.github.io/Recorder/assets/ztest_no_user_operation.html)，[【Can I Use】查看浏览器支持情况](https://caniuse.com/#search=getUserMedia)。

录音默认输出mp3格式，另外可选wav格式；有限支持ogg(beta)、webm(beta)、amr(beta)格式；支持任意格式扩展（前提有相应编码器）。

mp3默认16kbps的比特率，2kb每秒的录音大小，音质还可以（如果使用8kbps可达到1kb每秒，不过音质太渣）。主要用于语音录制，双声道语音没有意义，特意仅对单声道进行支持。mp3和wav格式支持边录边转码，录音结束时转码速度极快，支持实时转码成小片段文件和实时传输，demo中已实现一个语音通话聊天，下面有介绍；其他格式录音结束时可能需要花费比较长的时间进行转码。

mp3使用lamejs编码(CBR)，压缩后的recorder.mp3.min.js文件150kb左右（开启gzip后54kb）。如果对录音文件大小没有特别要求，可以仅仅使用录音核心+wav编码器(raw pcm format录音文件超大)，压缩后的recorder.wav.min.js不足5kb。录音得到的mp3(CBR)、wav(PCM)，均可简单拼接小的二进制录音片段文件来生成长的音频文件，具体参考下面这两种编码器的详细介绍。

如需在Hybrid App内使用（支持IOS、Android），或提供IOS微信的支持，请参阅[app-support-sample](https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample)目录。

*IOS、国产厂商系统浏览器上的使用限制等问题和兼容请参阅下面的知识库部分；打开录音后对音频播放的影响、录音中途来电话等问题也参阅下面的知识库。*

<p align="center"><a href="https://github.com/xiangyuecn/Recorder"><img width="100" src="https://gitee.com/xiangyuecn/Recorder/raw/master/assets/icon.png" alt="Recorder logo"></a></p>

<p align="center">
  <a title="Stars" href="https://github.com/xiangyuecn/Recorder"><img src="https://img.shields.io/github/stars/xiangyuecn/Recorder?color=0b1&logo=github" alt="Stars"></a>
  <a title="Forks" href="https://github.com/xiangyuecn/Recorder"><img src="https://img.shields.io/github/forks/xiangyuecn/Recorder?color=0b1&logo=github" alt="Forks"></a>
  <a title="npm Version" href="https://www.npmjs.com/package/recorder-core"><img src="https://img.shields.io/npm/v/recorder-core?color=f60&logo=npm" alt="npm Version"></a>
  <a title="npm Downloads" href="https://www.npmjs.com/package/recorder-core"><img src="https://img.shields.io/npm/dt/recorder-core?color=f60&logo=npm" alt="npm Downloads"></a>
  <a title="cnpm" href="https://npm.taobao.org/package/recorder-core"><img src="https://img.shields.io/badge/cnpm-available-0b1" alt="cnpm"></a>
  <a title="License" href="https://github.com/xiangyuecn/Recorder/blob/master/LICENSE"><img src="https://img.shields.io/github/license/xiangyuecn/Recorder?color=0b1&logo=github" alt="License"></a>
</p>

[​](?RefEnd)


# :open_book:快速使用

## 【1】加载框架

注意：[需要在https等安全环境下才能进行录音](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#Privacy_and_security)

**方式一**：使用script标签引入，[JsDelivr CDN](https://www.jsdelivr.com/features)

在需要录音功能的页面引入压缩好的recorder.xxx.min.js文件即可
``` html
<script src="recorder.mp3.min.js"></script> <!--已包含recorder-core和mp3格式支持, CDN: https://cdn.jsdelivr.net/gh/xiangyuecn/Recorder@latest/recorder.mp3.min.js-->
```
或者直接使用源码（src内的为源码、dist内的为压缩后的），可以引用src目录中的recorder-core.js+相应类型的实现文件，比如要mp3录音：
``` html
<script src="src/recorder-core.js"></script> <!--必须引入的录音核心，CDN: https://cdn.jsdelivr.net/gh/xiangyuecn/Recorder@latest/dist/recorder-core.js-->

<script src="src/engine/mp3.js"></script> <!--相应格式支持文件；如果需要多个格式支持，把这些格式的编码引擎js文件放到后面统统加载进来即可-->
<script src="src/engine/mp3-engine.js"></script> <!--如果此格式有额外的编码引擎的话，也要加上-->

<script src="src/extensions/waveview.js"></script>  <!--可选的扩展支持项-->
```

**方式二**：通过import/require引入

通过 npm/cnpm 进行安装 `npm install recorder-core` ，如果直接clone的源码下面文件路径调整一下即可 [​](?Ref=ImportCode&Start)
``` javascript
//必须引入的核心，换成require也是一样的。注意：recorder-core会自动往window下挂载名称为Recorder对象，全局可调用window.Recorder，也许可自行调整相关源码清除全局污染
import Recorder from 'recorder-core'

//需要使用到的音频格式编码引擎的js文件统统加载进来
import 'recorder-core/src/engine/mp3'
import 'recorder-core/src/engine/mp3-engine'

//以上三个也可以合并使用压缩好的recorder.xxx.min.js
//比如 import Recorder from 'recorder-core/recorder.mp3.min' //已包含recorder-core和mp3格式支持

//可选的扩展支持项
import 'recorder-core/src/extensions/waveview'
```
[​](?RefEnd)

## 【2】调用录音
[​](?Ref=Codes&Start)这里假设只录3秒，录完后立即播放，[运行此代码>>](https://xiangyuecn.github.io/Recorder/assets/%E5%B7%A5%E5%85%B7-%E4%BB%A3%E7%A0%81%E8%BF%90%E8%A1%8C%E5%92%8C%E9%9D%99%E6%80%81%E5%88%86%E5%8F%91Runtime.html?idf=self_base_demo)
``` javascript
//简单控制台直接测试方法：在任意(无CSP限制)页面内加载Recorder，加载成功后再执行一次本代码立即会有效果，import("https://xiangyuecn.github.io/Recorder/recorder.mp3.min.js").then(function(s){console.log("import ok")}).catch(function(e){console.error("import fail",e)})

var rec;
/**调用open打开录音请求好录音权限**/
var recOpen=function(success){//一般在显示出录音按钮或相关的录音界面时进行此方法调用，后面用户点击开始录音时就能畅通无阻了
    rec=Recorder({
        type:"mp3",sampleRate:16000,bitRate:16 //mp3格式，指定采样率hz、比特率kbps，其他参数使用默认配置；注意：是数字的参数必须提供数字，不要用字符串；需要使用的type类型，需提前把格式支持文件加载进来，比如使用wav格式需要提前加载wav.js编码引擎
        ,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate,newBufferIdx,asyncEnd){
            //录音实时回调，大约1秒调用12次本回调
            //可利用extensions/waveview.js扩展实时绘制波形
            //可利用extensions/sonic.js扩展实时变速变调，此扩展计算量巨大，onProcess需要返回true开启异步模式
        }
    });

    //var dialog=createDelayDialog(); 我们可以选择性的弹一个对话框：为了防止移动端浏览器存在第三种情况：用户忽略，并且（或者国产系统UC系）浏览器没有任何回调，此处demo省略了弹窗的代码
    rec.open(function(){//打开麦克风授权获得相关资源
        //dialog&&dialog.Cancel(); 如果开启了弹框，此处需要取消
        //rec.start() 此处可以立即开始录音，但不建议这样编写，因为open是一个延迟漫长的操作，通过两次用户操作来分别调用open和start是推荐的最佳流程
        
        success&&success();
    },function(msg,isUserNotAllow){//用户拒绝未授权或不支持
        //dialog&&dialog.Cancel(); 如果开启了弹框，此处需要取消
        console.log((isUserNotAllow?"UserNotAllow，":"")+"无法录音:"+msg);
    });
};

/**开始录音**/
function recStart(){//打开了录音后才能进行start、stop调用
    rec.start();
};

/**结束录音**/
function recStop(){
    rec.stop(function(blob,duration){
        console.log(blob,(window.URL||webkitURL).createObjectURL(blob),"时长:"+duration+"ms");
        rec.close();//释放录音资源，当然可以不释放，后面可以连续调用start；但不释放时系统或浏览器会一直提示在录音，最佳操作是录完就close掉
        rec=null;
        
        //已经拿到blob文件对象想干嘛就干嘛：立即播放、上传
        
        /*** 【立即播放例子】 ***/
        var audio=document.createElement("audio");
        audio.controls=true;
        document.body.appendChild(audio);
        //简单利用URL生成播放地址，注意不用了时需要revokeObjectURL，否则霸占内存
        audio.src=(window.URL||webkitURL).createObjectURL(blob);
        audio.play();
    },function(msg){
        console.log("录音失败:"+msg);
        rec.close();//可以通过stop方法的第3个参数来自动调用close
        rec=null;
    });
};


//我们可以选择性的弹一个对话框：为了防止移动端浏览器存在第三种情况：用户忽略，并且（或者国产系统UC系）浏览器没有任何回调
/*伪代码：
function createDelayDialog(){
    if(Is Mobile){//只针对移动端
        return new Alert Dialog Component
            .Message("录音功能需要麦克风权限，请允许；如果未看到任何请求，请点击忽略~")
            .Button("忽略")
            .OnClick(function(){//明确是用户点击的按钮，此时代表浏览器没有发起任何权限请求
                //此处执行fail逻辑
                console.log("无法录音：权限请求被忽略");
            })
            .OnCancel(NOOP)//自动取消的对话框不需要任何处理
            .Delay(8000); //延迟8秒显示，这么久还没有操作基本可以判定浏览器有毛病
    };
};
*/


//这里假设立即运行，只录3秒，录完后立即播放，本段代码copy到控制台内可直接运行
recOpen(function(){
    recStart();
    setTimeout(recStop,3000);
});
```

## 【附】录音上传示例
``` javascript
var TestApi="/test_request";//用来在控制台network中能看到请求数据，测试的请求结果无关紧要
var rec=Recorder();rec.open(function(){rec.start();setTimeout(function(){rec.stop(function(blob,duration){
//-----↓↓↓以下才是主要代码↓↓↓-------

//本例子假设使用jQuery封装的请求方式，实际使用中自行调整为自己的请求方式
//录音结束时拿到了blob文件对象，可以用FileReader读取出内容，或者用FormData上传
var api=TestApi;

/***方式一：将blob文件转成base64纯文本编码，使用普通application/x-www-form-urlencoded表单上传***/
var reader=new FileReader();
reader.onloadend=function(){
    $.ajax({
        url:api //上传接口地址
        ,type:"POST"
        ,data:{
            mime:blob.type //告诉后端，这个录音是什么格式的，可能前后端都固定的mp3可以不用写
            ,upfile_b64:(/.+;\s*base64\s*,\s*(.+)$/i.exec(reader.result)||[])[1] //录音文件内容，后端进行base64解码成二进制
            //...其他表单参数
        }
        ,success:function(v){
            console.log("上传成功",v);
        }
        ,error:function(s){
            console.error("上传失败",s);
        }
    });
};
reader.readAsDataURL(blob);

/***方式二：使用FormData用multipart/form-data表单上传文件***/
var form=new FormData();
form.append("upfile",blob,"recorder.mp3"); //和普通form表单并无二致，后端接收到upfile参数的文件，文件名为recorder.mp3
//...其他表单参数
$.ajax({
    url:api //上传接口地址
    ,type:"POST"
    ,contentType:false //让xhr自动处理Content-Type header，multipart/form-data需要生成随机的boundary
    ,processData:false //不要处理data，让xhr自动处理
    ,data:form
    ,success:function(v){
        console.log("上传成功",v);
    }
    ,error:function(s){
        console.error("上传失败",s);
    }
});

//-----↑↑↑以上才是主要代码↑↑↑-------
},function(msg){console.log("录音失败:"+msg);});},3000);},function(msg){console.log("无法录音:"+msg);});
```
[​](?RefEnd)

## 【附】问题排查
- 打开[Demo页面](https://xiangyuecn.github.io/Recorder/)试试看，是不是也有同样的问题。
- 检查是不是在https之类的安全环境下调用的。
- 检查是不是IOS系统，确认[caniuse](https://caniuse.com/#search=getUserMedia)IOS对`getUserMedia`的支持情况。
- 检查上面第1步是否把框架加载到位，在[Demo页面](https://xiangyuecn.github.io/Recorder/)有应该加载哪些js的提示。
- 提交Issue，热心网友帮你解答。



## 【QQ群】交流与支持

欢迎加QQ群：781036591，纯小写口令：`recorder`

<img src="https://gitee.com/xiangyuecn/Recorder/raw/master/assets/qq_group_781036591.png" width="220px">



## 案例演示

### 【在线Demo完整版】
[<img src="https://gitee.com/xiangyuecn/Recorder/raw/master/assets/demo.png" width="100px">](https://xiangyuecn.github.io/Recorder/) https://xiangyuecn.github.io/Recorder/

> `2019-3-27` 在QQ和微信打开时，发现这个网址被屏蔽了，尝试申诉了一下。`2019-4-7`晚上又发现被屏蔽了，小米浏览器也一样报危险网站，尝试打开一下别人的`github.io`发现全是这样，看来是`github.io`的问题，被波及了，不过第二天又自己好了。


### 【Demo片段列表】
1. [【Demo库】【格式转换】-mp3格式转成其他格式](https://xiangyuecn.github.io/Recorder/assets/工具-代码运行和静态分发Runtime.html?jsname=lib.transform.mp32other)
2. [【Demo库】【格式转换】-wav格式转成其他格式](https://xiangyuecn.github.io/Recorder/assets/工具-代码运行和静态分发Runtime.html?jsname=lib.transform.wav2other)
3. [【教程】实时转码并上传](https://xiangyuecn.github.io/Recorder/assets/工具-代码运行和静态分发Runtime.html?jsname=teach.realtime.encode_transfer)
4. [【Demo库】【文件合并】-mp3多个片段文件合并](https://xiangyuecn.github.io/Recorder/assets/工具-代码运行和静态分发Runtime.html?jsname=lib.merge.mp3_merge)
5. [【Demo库】【文件合并】-wav多个片段文件合并](https://xiangyuecn.github.io/Recorder/assets/工具-代码运行和静态分发Runtime.html?jsname=lib.merge.wav_merge)
6. [【教程】实时多路音频混音](https://xiangyuecn.github.io/Recorder/assets/工具-代码运行和静态分发Runtime.html?jsname=teach.realtime.mix_multiple)
7. [【教程】变速变调音频转换](https://xiangyuecn.github.io/Recorder/assets/工具-代码运行和静态分发Runtime.html?jsname=teach.sonic.transform)
8. [【Demo库】PCM采样率提升](https://xiangyuecn.github.io/Recorder/assets/工具-代码运行和静态分发Runtime.html?jsname=lib.samplerate.raise)
9. [【测试】音频可视化相关扩展测试](https://xiangyuecn.github.io/Recorder/assets/工具-代码运行和静态分发Runtime.html?jsname=test.extensions.visualization)



#### 【祝福贺卡助手】
使用到这个库用于祝福语音的录制，已开通网页版和微信小程序版。专门针对IOS的微信中进行了兼容处理，IOS上微信环境中调用的微信的api（小程序、公众号api）。小程序地址：[<img src="https://gitee.com/xiangyuecn/Recorder/raw/master/assets/jiebian.life-xcx.png" width="100px">](https://jiebian.life/t/a)；网页地址：[<img src="https://gitee.com/xiangyuecn/Recorder/raw/master/assets/jiebian.life-web.png" width="100px">](https://jiebian.life/t/a)

#### 【注】
如果你的项目用到了这个库也想展示到这里，可以发个isuse，注明使用介绍和访问方式，我们收录在这里。





# :open_book:知识库

本库期待的使用场景是语音录制，因此音质只要不比高品质的感觉差太多就行；1分钟的语音进行编码是很快的，但如果录制超长的录音，比如10分钟以上，不同类型的编码可能会花费比较长的时间，因为只有边录边转码(Worker)支持的类型才能进行极速转码。另外未找到双声道语音录制存在的意义（翻倍录音数据大小，并且拉低音质），因此特意仅对单声道进行支持。


浏览器Audio Media[兼容性](https://developer.mozilla.org/en-US/docs/Web/HTML/Supported_media_formats#Browser_compatibility)mp3最好，wav还行，其他要么不支持播放，要么不支持编码；因此本库最佳推荐使用mp3、wav格式，代码也是优先照顾这两种格式。

**特别注**：`IOS(11.X、12.X)`上只有`Safari`支持`getUserMedia`，IOS上其他浏览器均不支持，参考下面的已知问题。

**特别注**：大部分国产手机厂商的浏览器（系统浏览器，都用的UC内核？）虽然支持`getUserMedia`方法，但并不能使用，表现为直接返回拒绝或者干脆没有任何回调；UC系列目测全部阵亡（含支付宝）。

**留意中途来电话**：在移动端录音时，如果录音中途来电话，或者通话过程中打开录音，是不一定能进行录音的；经过简单测试发现，IOS上Safari将暂停返回音频数据，直到通话结束才开始继续有音频数据返回；小米上Chrome不管是来电还是通话中开始录音都能对麦克风输入的声音进行录音（听筒中的并不能录到，扬声器外放的会被明显降噪）；只是简单测试，更多机器和浏览器并未做测试，不过整体上来看来电话或通话中进行录音的可行性并不理想，也不赞成在这种过程中进行录音；但只要通话结束后录音还是会正常进行，影响基本不大。

**录音时对播放音频的影响**：仅在移动端，录音过程中尽量不要去播放音频，正在播放的也应该暂停播放，否则不同手机系统、浏览器环境可能表现会出乎意料；已知IOS Safari上录音打开后，如果播放音频，声音会[变得非常小](https://www.cnblogs.com/cocoajin/p/7591068.html)；Android上也有可能声音被切换到听筒播放，而不是扬声器大喇叭上播放导致声音也会变小；更多可能的情况需要更多设备、浏览器的测试数据才能发掘；PC上似乎无此影响。

**特别注**：如果在`iframe`里面调用的录音功能，并且和上层的网页是不同的域（跨域了），如果未设置相应策略，权限永远是被拒绝的，[参考此处](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#Privacy_and_security)。另外如果要在`非跨域的iframe`里面使用，最佳实践应该是让window.top去加载Recorder（异步加载js），iframe里面使用top.Recorder，免得各种莫名其妙（比如微信里面的各种渣渣功能，搞多了就习惯了）。

> 如果需要最大限度的兼容IOS（仅增加微信支持），可以使用`RecordApp`，它已包含`Recorder`，源码在`src/app-support`、`app-support-sample`中，但此兼容库需要服务器端提供微信JsSDK的签名、下载素材接口，涉及微信公众（订阅）号的开发。

支持|Recorder|[RecordApp](https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample)
-:|:-:|:-:
PC浏览器|√|√
Android Chrome Firefox|√|√
Android微信(含小程序)|√|√
Android Hybrid App|√|√
Android其他浏览器|未知|未知
IOS Safari|√|√
IOS微信(含小程序)||√
IOS Hybrid App||√
IOS其他浏览器||
开发难度|简单|复杂
第三方依赖|无|依赖微信公众号





## 已知问题
*2018-09-19* [caniuse](https://caniuse.com/#search=getUserMedia) 注明`IOS` `11.X - 12.X` 上 只有`Safari`支持调用`getUserMedia`，其他App下WKWebView(UIWebView?)([相关资料](https://forums.developer.apple.com/thread/88052))均不支持。经用户测试验证IOS 12上chrome、UC都无法录音，部分IOS 12 Safari可以获取到并且能正常录音，但部分不行，原因未知，参考[ios 12 支不支持录音了](https://www.v2ex.com/t/490695)。在IOS上不支持录音的环境下应该采用其他解决方案，参考`案例演示`、`关于微信JsSDK`部分。

*2019-02-28* [issues#14](https://github.com/xiangyuecn/Recorder/issues/14) 如果`getUserMedia`返回的[`MediaStreamTrack.readyState == "ended"`，`"ended" which indicates that the input is not giving any more data and will never provide new data.`](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack) ，导致无法录音。如果产生这种情况，目前在`rec.open`方法调用时会正确检测到，并执行`fail`回调。造成`issues#14` `ended`原因是App源码中`AndroidManifest.xml`中没有声明`android.permission.MODIFY_AUDIO_SETTINGS`权限，导致腾讯X5不能正常录音。

*2019-03-09* 在Android上QQ、微信里，请求授权使用麦克风的提示，经过长时间观察发现，他们的表现很随机、很奇特。可能每次在调用`getUserMedia`时候都会弹选择，也可能选择一次就不会再弹提示，也可能重启App后又会弹。如果用户拒绝了，可能第二天又会弹，或者永远都不弹了，要么重置(装)App。使用腾讯X5内核的App测试也是一样奇特表现，拒绝权限后可能必须要重置(装)。这个问题貌似跟X5内核自动升级的版本有关。QQ浏览器更加惨不忍睹，2019-08-16测试发现卸载重装、拒绝权限后永远无法弹出授权，通过浏览器设置-清理-清理地理位置授权才能恢复，重启、重装、清理系统垃圾、删除根目录文件夹（腾讯那个大文件不敢删，毒瘤）垃圾均无效，奇葩。

*2019-06-14* 经[#29](https://github.com/xiangyuecn/Recorder/issues/29)反馈，稍微远程真机测试了部分厂商的比较新的Android手机系统浏览器的录音支持情况；华为：直接返回拒绝，小米：没有回调，OPPO：好像是没有回调，vivo：好像是没有回调；另外专门测试了一下UC最新版（支付宝）：直接返回拒绝。另[参考](https://www.jianshu.com/p/6cd5a7fa562c)。也许他们都商量好了或者本身都是用的UC？至于没有任何回调的，此种浏览器没有良心。

*2019-07-22* 对[#34](https://github.com/xiangyuecn/Recorder/issues/34)反馈研究后发现，问题一：macOS、IOS的Safari对连续调用录音（中途未调用close）是有问题的，但只要调用close后再重复录音就没有问题。问题二：IOS上如果录音之前先播放了任何Audio，录音过程可能会变得很诡异，但如果先录音，就不存在此问题（19-09-18 Evan:QQ1346751357反馈发现本问题并非必现，[功能页面](https://hft.bigdatahefei.com/LocateSearchService/sfc/index)，但本库的Demo内却必现，原因不明）。chrome、firefox正常的很。目测这两个问题是非我等屌丝能够解决的，于是报告给苹果家程序员看看，因此发了个[帖子](https://forums.developer.apple.com/message/373108)，顺手在`Feedback Assistant`提交了`bug report`，但好几天过去了没有任何回应（顺带给微软一个好评）。问题一目前已通过全局共享一个MediaStream连接来解决，原因在于Safari上MediaStream断开后就无法再次进行连接使用（表现为静音），改成了全局只连接一次就避免了此问题；全局处理也有利于屏蔽底层细节，start时无需再调用底层接口，提升兼容、可靠性。

*2019-10-26* 针对[#51](https://github.com/xiangyuecn/Recorder/issues/51)的问题研究后发现，如果录音时设备偶尔出现很卡的情况下（CPU被其他程序大量占用），浏览器采集到的音频是断断续续的，导致10秒的录音可能就只返回了5秒的数据量，这个时候最终编码得到的音频时长明显变短，播放时的效果就像快放一样。此问题能够稳定复现（使用别的程序大量占用CPU来模拟），目前已在`envIn`内部函数中进行了补偿处理，在浏览器两次传入PCM数据之间填充一段静默数据已弥补丢失的时长；最终编码得到的音频时长将和实际录音时长基本一致，消除了快放效果，但由于丢失的音频已被静默数据代替，听起来就是数据本身的断断续续的效果。在设备不卡时录音没有此问题。

*2019-11-03* lamejs原版编码器编码出来的mp3文件首尾存在填充数据并且会占据一定时长（这种数据播放时静默，记录的信息数据或者填充），同一录音mp3格式的时长会比wav格式的时长要长0-100ms左右，大部分情况下不会有影响，但如果涉及到实时转码并传输的话，这些数据将会造成多段mp3片段的总时长比实际录音要长，最终播放时会均匀的感觉到停顿，并且mp3片段越小越明显。本库已对lamejs编码出来的mp3文件进行了处理，去掉了头部的非音频数据，但由于编码出来的mp3每一帧数据都有固定时长，文件结尾最后一帧可能录音的时长不能刚好填满，就会产生填充数据；因此本库编码出来的mp3文件会比wav格式长0-30ms左右，多出来的时长在mp3的结尾处；mp3解码出来的pcm数据直接去掉结尾多出来的部分，就和wav中的pcm数据基本一致了；另外可以通过调节待编码的pcm数据长度以达到刚好填满最后一帧来规避此问题，参考`Recorder.SampleData`方法提供的连续转码针对此问题的处理。[参考wiki](https://github.com/xiangyuecn/Recorder/wiki/lamejs编码出来的mp3时长修正)。







# :open_book:方法文档

### 【构造】rec=Recorder(set)

构造函数，拿到`Recorder`的实例，然后可以进行请求获取麦克风权限和录音。

`set`参数为配置对象，默认配置值如下：
``` javascript
set={
    type:"mp3" //输出类型：mp3,wav等，使用一个类型前需要先引入对应的编码引擎
    ,bitRate:16 //比特率，必须是数字 wav(位):16、8，MP3(单位kbps)：8kbps时文件大小1k/s，16kbps 2k/s，录音文件很小
    
    ,sampleRate:16000 //采样率，必须是数字，wav格式（8位）文件大小=sampleRate*时间；mp3此项对低比特率文件大小有影响，高比特率几乎无影响。
                //wav任意值，mp3取值范围：48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000
    
    ,onProcess:NOOP //接收到录音数据时的回调函数：fn(buffers,powerLevel,bufferDuration,bufferSampleRate,newBufferIdx,asyncEnd)
                //返回值：onProcess如果返回true代表开启异步模式，在某些大量运算的场合异步是必须的，必须在异步处理完成时调用asyncEnd(不能真异步时需用setTimeout包裹)；返回其他值或者不返回为同步模式（需避免在回调内执行耗时逻辑）；如果开启异步模式，在onProcess执行后新增的buffer会全部替换成空数组，因此本回调开头应立即将newBufferIdx到本次回调结尾位置的buffer全部保存到另外一个数组内，处理完成后写回buffers中本次回调的结尾位置。
                //buffers=[[Int16,...],...]：缓冲的PCM数据，为从开始录音到现在的所有pcm片段，每次回调可能增加0-n个不定量的pcm片段。
                //powerLevel：当前缓冲的音量级别0-100。
                //bufferDuration：已缓冲时长。
                //bufferSampleRate：缓冲使用的采样率（当type支持边录边转码(Worker)时，此采样率和设置的采样率相同，否则不一定相同）。
                //newBufferIdx:本次回调新增的buffer起始索引。
                //asyncEnd：fn() 如果onProcess是异步的(返回值为true时)，处理完成时需要调用此回调，如果不是异步的请忽略此参数，此方法回调时必须是真异步（不能真异步时需用setTimeout包裹）。
                //如果需要绘制波形之类功能，需要实现此方法即可，使用以计算好的powerLevel可以实现音量大小的直观展示，使用buffers可以达到更高级效果
                //注意，buffers数据的采样率和set.sampleRate不一定相同，可能为浏览器提供的原始采样率rec.srcSampleRate，也可能为已转换好的采样率set.sampleRate；如需浏览器原始采样率的数据，请使用rec.buffers原始数据，而不是本回调的参数；如需明确和set.sampleRate完全相同采样率的数据，请在onProcess中自行连续调用采样率转换函数Recorder.SampleData()，配合mock方法可实现实时转码和压缩语音传输；修改或替换buffers内的数据将会改变最终生成的音频内容（注意不能改变第一维数组长度），比如简单有限的实现实时静音、降噪、混音等处理，详细参考下面的rec.buffers
}
```

**注意：set内是数字的明确传数字**，不要传字符串之类的导致不可预测的异常，其他有配置的地方也是一样（感谢`214282049@qq.com`19-01-10发的反馈邮件）。

*注：如果录音结束后生成的音频文件的比特率和采样率和set中的不同，将会把set中的bitRate、sampleRate更新成音频文件的。*

### 【方法】rec.open(success,fail)
请求打开录音资源，如果浏览器不支持录音、用户拒绝麦克风权限、或者非安全环境（非https、file等）将会调用`fail`；打开后需要调用`close`来关闭，因为浏览器或设备的系统可能会显示正在录音。

注意：此方法回调是可能是同步的（异常、或者已持有资源时）也可能是异步的（浏览器弹出权限请求时）；一般使用时打开，用完立即关闭；可重复调用，可用来测试是否能录音。

另外：因为此方法会调起用户授权请求，如果仅仅想知道浏览器是否支持录音（比如：如果浏览器不支持就走另外一套录音方案），应使用`Recorder.Support()`方法。

> **特别注**: 鉴于UC系浏览器（大部分国产手机厂商系统浏览器）大概率表面支持录音但永远不会有任何回调、或者此浏览器支持第三种情况（用户忽略 并且 此浏览器认为此种情况不需要回调 并且程序员完美实现了）；如果当前环境是移动端，可以在调用此方法`8秒`后如果未收到任何回调，弹出一个自定义提示框（只需要一个按钮），提示内容范本：`录音功能需要麦克风权限，请允许；如果未看到任何请求，请点击忽略~`，按钮文本：`忽略`；当用户点击了按钮，直接手动执行`fail`逻辑，因为此时浏览器压根就没有弹移动端特有的模态话权限请求对话框；但如果收到了回调（可能是同步的，因此弹框必须在`rec.open`调用前准备好随时取消），需要把我们弹出的提示框自动关掉，不需要用户做任何处理。pc端的由于不是模态化的请求对话框，可能会被用户误点，所以尽量要判断一下是否是移动端。

`success`=fn();

`fail`=fn(errMsg,isUserNotAllow); 如果是用户主动拒绝的录音权限，除了有错误消息外，isUserNotAllow=true，方便程序中做不同的提示，提升用户主动授权概率


### 【方法】rec.close(success)
关闭释放录音资源，释放完成后会调用`success()`回调。如果正在录音或者stop调用未完成前调用了close将会强制终止当前录音。

注意：如果创建了多个Recorder对象并且调用了open（应避免同时有多个对象进行了open），只有最后一个新建的才有权限进行实际的资源释放（和多个对象close调用顺序无关），浏览器或设备的系统才会不再显示正在录音的提示。

### 【方法】rec.start()
开始录音，需先调用`open`；未close之前可以反复进行调用开始新的录音。

只要open成功后，调用此方法是安全的，如果未open强行调用导致的内部错误将不会有任何提示，stop时自然能得到错误；另外open操作可能需要花费比较长时间，如果中途调用了stop，open完成时（同步）的任何start调用将会被自动阻止，也是不会有提示的。

### 【方法】rec.stop(success,fail,autoClose)
结束录音并返回录音数据`blob对象`，拿到blob对象就可以为所欲为了，不限于立即播放、上传

`success(blob,duration)`：`blob`：录音数据audio/mp3|wav...格式，`duration`：录音时长，单位毫秒

`fail(errMsg)`：录音出错回调

`autoClose`：`false` 可选，是否自动调用`close`，默认为`false`不调用

提示：stop时会进行音频编码，根据类型的不同音频编码花费的时间也不相同。对于支持边录边转码(Worker)的类型，将极速完成编码并回调；对于不支持的10几秒录音花费2秒左右算是正常，但内部采用了分段编码+setTimeout来处理，界面卡顿不明显。


### 【方法】rec.pause()
暂停录音。

### 【方法】rec.resume()
恢复继续录音。


### 【属性】rec.buffers
此数据为从开始录音到现在为止的所有已缓冲的PCM片段列表，`buffers` `=` `[[Int16,...],...]` 为二维数组；在没有边录边转码的支持时（mock调用、非mp3等），录音stop时会使用此完整数据进行转码成指定的格式。

buffers中的PCM数据为浏览器采集的原始音频数据，采样率为浏览器提供的原始采样率`rec.srcSampleRate`；在`rec.set.onProcess`回调中`buffers`参数就是此数据或者此数据重新采样后的新数据；修改或替换`onProcess`回调中`buffers`参数可以改变最终生成的音频内容，但修改`rec.buffers`不一定会有效，因此你可以在`onProcess`中修改或替换`buffers`参数里面的内容，注意只能修改或替换上次回调以来新增的buffer（不允许修改已处理过的，不允许增删第一维数组，允许将第二维数组任意修改替换成空数组也可以）；以此可以简单有限的实现实时静音、降噪、混音等处理。

如果你需要长时间实时录音（如长时间语音通话），并且不需要得到最终完整编码的音频文件，Recorder初始化时应当使用一个未知的类型进行初始化（如: type:"unknown"，仅仅用于初始化而已，实时转码可以手动转成有效格式，因为有效格式可能内部还有其他类型的缓冲），并且实时在`onProcess`中修改`rec.buffers`数组，只保留最后两个元素，其他元素设为null（代码：`rec.buffers[rec.buffers.length-3]=null`），以释放占用的内存，并且录音结束时可以不用调用`stop`，直接调用`close`丢弃所有数据即可。只要buffers[0]==null时调用`stop`永远会直接走fail回调。

### 【属性】rec.srcSampleRate
浏览器提供的原始采样率，只有start或mock调用后才会有值，此采样率就是rec.buffers数据的采样率。


### 【方法】rec.mock(pcmData,pcmSampleRate)
模拟一段录音数据，后面可以调用stop进行编码。需提供pcm数据 `pcmData` `=` `[Int16,...]` 为一维数组，和pcm数据的采样率 `pcmSampleRate`。

提示：在录音实时回调中配合`Recorder.SampleData()`方法使用效果更佳，可实时生成小片段语音文件。

**注意：pcmData为一维数组，如果提供二维数组将会产生不可预料的错误**；如果需要使用类似`onProcess`回调的`buffers`或者`rec.buffers`这种pcm列表（二维数组）时，可自行展开成一维，或者使用`Recorder.SampleData()`方法转换成一维。

本方法可用于将一个音频解码出来的pcm数据方便的转换成另外一个格式：
``` javascript
var amrBlob=...;//amr音频blob对象
var amrSampleRate=8000;//amr音频采样率

//解码amr得到pcm数据
var reader=new FileReader();
reader.onload=function(){
    Recorder.AMR.decode(new Uint8Array(reader.result),function(pcm){
        transformOgg(pcm);
    });
};
reader.readAsArrayBuffer(amrBlob);

//将pcm转成ogg
function transformOgg(pcmData){
    Recorder({type:"ogg",bitRate:64,sampleRate:32000})
        .mock(pcmData,amrSampleRate)
        .stop(function(blob,duration){
            //我们就得到了新采样率和比特率的ogg文件
            console.log(blob,duration);
        });
};
```



### 【静态方法】Recorder.Support()
判断浏览器是否支持录音，随时可以调用。注意：仅仅是检测浏览器支持情况，不会判断和调起用户授权（rec.open()会判断用户授权），不会判断是否支持特定格式录音。

### 【静态方法】Recorder.IsOpen()
由于Recorder持有的录音资源是全局唯一的，可通过此方法检测是否有Recorder已调用过open打开了录音功能。

### 【静态方法】Recorder.Destroy()
销毁已持有的所有全局资源（AudioContext、Worker），当要彻底移除Recorder时需要显式的调用此方法。大部分情况下不调用Destroy也不会造成问题。

### 【静态属性】Recorder.TrafficImgUrl
流量统计用1像素图片地址，在Recorder首次被实例化时将往这个地址发送一个请求，请求是通过Image对象来发送，安全可靠；默认开启统计，url为本库的51la统计用图片地址，为空响应流量消耗非常小，因此对使用几乎没有影响。

设置为空字符串后将不参与统计，大部分情况下无需关闭统计，如果你网页的url私密性要求很高，请在调用Recorder之前将此url设为空字符串；本功能于2019-11-09添加，[点此](https://www.51.la/?20469973)前往51la查看统计概况。

### 【静态属性】Recorder.BufferSize
录音时的AudioContext缓冲大小，默认值为4096。会影响H5录音时的onProcess调用速率，相对于AudioContext.sampleRate=48000时，4096接近12帧/s，调节此参数可生成比较流畅的回调动画。

取值256, 512, 1024, 2048, 4096, 8192, or 16384

注意：取值不能过低，2048开始不同浏览器可能回调速率跟不上造成音质问题。一般无需调整，调整后需要先close掉已打开的录音，再open时才会生效。

*这个属性在旧版Recorder中是放在已废弃的set.bufferSize中，后面因为兼容处理Safari上MediaStream断开后就无法再次进行连接使用的问题（表现为静音），把MediaStream连接也改成了全局只连接一次，因此set.bufferSize就移出来变成了Recorder的属性*

### 【静态方法】Recorder.SampleData(pcmDatas,pcmSampleRate,newSampleRate,prevChunkInfo,option)
对pcm数据的采样率进行转换，配合mock方法使用效果更佳，比如实时转换成小片段语音文件。

注意：本方法只会将高采样率的pcm转成低采样率的pcm，当newSampleRate>pcmSampleRate想转成更高采样率的pcm时，本方法将不会进行转换处理（由低的采样率转成高的采样率没有存在的意义）；在特殊场合下如果确实需要提升采样率，比如8k必须转成16k，可参考[【Demo库】PCM采样率提升](https://xiangyuecn.github.io/Recorder/assets/工具-代码运行和静态分发Runtime.html?jsname=lib.samplerate.raise)自行编写代码转换一下即可。

`pcmDatas`: [[Int16,...]] pcm片段列表，二维数组

`pcmSampleRate`:48000 pcm数据的采样率

`newSampleRate`:16000 需要转换成的采样率，newSampleRate>=pcmSampleRate时不会进行任何处理，小于时会进行重新采样

`prevChunkInfo`:{} 可选，上次调用时的返回值，用于连续转换，本次调用将从上次结束位置开始进行处理。或可自行定义一个ChunkInfo从pcmDatas指定的位置开始进行转换

`option`:
``` javascript
    option:{ 可选，配置项
        frameSize:123456 帧大小，每帧的PCM Int16的数量，采样率转换后的pcm长度为frameSize的整数倍，用于连续转换。目前仅在mp3格式时才有用，frameSize取值为1152，这样编码出来的mp3时长和pcm的时长完全一致，否则会因为mp3最后一帧录音不够填满时添加填充数据导致mp3的时长变长。
        frameType:"" 帧类型，一般为rec.set.type，提供此参数时无需提供frameSize，会自动使用最佳的值给frameSize赋值，目前仅支持mp3=1152(MPEG1 Layer3的每帧采采样数)，其他类型=1。
            以上两个参数用于连续转换时使用，最多使用一个，不提供时不进行帧的特殊处理，提供时必须同时提供prevChunkInfo才有作用。最后一段数据处理时无需提供帧大小以便输出最后一丁点残留数据。
    }
```

返回值ChunkInfo
``` javascript
{
    //可定义，从指定位置开始转换到结尾
    index:0 pcmDatas已处理到的索引
    offset:0.0 已处理到的index对应的pcm中的偏移的下一个位置
    
    //仅作为返回值
    frameNext:null||[Int16,...] 下一帧的部分数据，frameSize设置了的时候才可能会有
    sampleRate:16000 结果的采样率，<=newSampleRate
    data:[Int16,...] 转换后的PCM结果，为一维数组；如果是连续转换，并且pcmDatas中并没有新数据时，data的长度可能为0
}
```

### 【静态方法】Recorder.PowerLevel(pcmAbsSum,pcmLength)
计算音量百分比的一个方法，返回值：0-100，主要当做百分比用；注意：这个不是分贝，因此没用volume当做名称。

`pcmAbsSum`: pcm Int16所有采样的绝对值的和

`pcmLength`: pcm长度


# :open_book:压缩合并一个自己需要的js文件
可参考/src/package-build.js中如何合并的一个文件，比如mp3是由`recorder-core.js`,`engine/mp3.js`,`engine/mp3-engine.js`组成的。

除了`recorder-core.js`其他引擎文件都是可选的，可以把全部编码格式合到一起也，也可以只合并几种，然后就可以支持相应格式的录音了。

可以修改/src/package-build.js后，在src目录内执行压缩：
``` javascript
cnpm install
npm start
```

# :open_book:关于现有编码器
如果你有其他格式的编码器并且想贡献出来，可以提交新增格式文件的PR（文件放到/src/engine中），我们升级它。

## wav (raw pcm format)
wav格式编码器时参考网上资料写的，会发现代码和别人家的差不多。源码2kb大小。[wav转其他格式参考和测试](https://xiangyuecn.github.io/Recorder/assets/工具-代码运行和静态分发Runtime.html?jsname=lib.transform.wav2other)

### wav转pcm
生成的wav文件内音频数据的编码为未压缩的pcm数据（raw pcm），只是在pcm数据前面加了一个44字节的wav头；因此直接去掉前面44字节就能得到原始的pcm数据，如：`blob.slice(44,blob.size,"audio/pcm")`;

### 简单将多段小的wav片段合成长的wav文件
由于RAW格式的wav内直接就是pcm数据，因此将小的wav片段文件去掉wav头后得到的原始pcm数据合并到一起，再加上新的wav头即可合并出长的wav文件；要求待合成的所有wav片段的采样率和位数需一致。[wav合并参考和测试+可移植源码](https://xiangyuecn.github.io/Recorder/assets/工具-代码运行和静态分发Runtime.html?jsname=lib.merge.wav_merge)

## mp3 (CBR)
采用的是[lamejs](https://github.com/zhuker/lamejs)(LGPL License)这个库的代码，`https://github.com/zhuker/lamejs/blob/bfb7f6c6d7877e0fe1ad9e72697a871676119a0e/lame.all.js`这个版本的文件代码；已对lamejs源码进行了部分改动，用于精简代码和修复发现的问题。LGPL协议涉及到的文件：`mp3-engine.js`；这些文件也采用LGPL授权，不适用MIT协议。源码518kb大小，压缩后150kb左右，开启gzip后50来k。[mp3转其他格式参考和测试](https://xiangyuecn.github.io/Recorder/assets/工具-代码运行和静态分发Runtime.html?jsname=lib.transform.mp32other)

### 简单将多段小的mp3片段合成长的mp3文件
由于lamejs CBR编码出来的mp3二进制数据从头到尾全部是大小相同的数据帧（采样率44100等无法被8整除的部分帧可能存在额外多1字节填充），没有其他任何多余信息，通过文件长度可计算出mp3的时长`fileSize*8/bitRate`（[参考](https://blog.csdn.net/u010650845/article/details/53520426)），数据帧之间可以直接拼接。因此将小的mp3片段文件的二进制数据全部合并到一起即可得到长的mp3文件；要求待合成的所有mp3片段的采样率和比特率需一致。[mp3合并参考和测试+可移植源码](https://xiangyuecn.github.io/Recorder/assets/工具-代码运行和静态分发Runtime.html?jsname=lib.merge.mp3_merge)

*注：CBR编码由于每帧数据的时长是固定的，mp3文件结尾最后这一帧的录音可能不能刚好填满，就会产生填充数据，多出来的这部分数据会导致mp3时长变长一点点，在实时转码传输时应当留意，解码成pcm后可直接去掉结尾的多余；另外可以通过调节待编码的pcm数据长度以达到刚好填满最后一帧来规避此问题，参考`Recorder.SampleData`方法提供的连续转码针对此问题的处理。首帧或前两帧可能是lame记录的信息帧，本库已去除，参考上面的已知问题。*


## beta-ogg (Vorbis)
采用的是[ogg-vorbis-encoder-js](https://github.com/higuma/ogg-vorbis-encoder-js)(MIT License)，`https://github.com/higuma/ogg-vorbis-encoder-js/blob/7a872423f416e330e925f5266d2eb66cff63c1b6/lib/OggVorbisEncoder.js`这个版本的文件代码。此编码器源码2.2M，超级大，压缩后1.6M，开启gzip后327K左右。对录音的压缩率比lamejs高出一倍, 但Vorbis in Ogg好像Safari不支持（[真的假的](https://developer.mozilla.org/en-US/docs/Web/HTML/Supported_media_formats#Browser_compatibility)）。

## beta-webm
这个编码器时通过查阅MDN编写的一个玩意，没多大使用价值：录几秒就至少要几秒来编码。。。原因是：未找到对已有pcm数据进行快速编码的方法。数据导入到MediaRecorder，音频有几秒就要等几秒，类似边播放边收听形。(想接原始录音Stream？我不可能给的!)输出音频虽然可以通过比特率来控制文件大小，但音频文件中的比特率并非设定比特率，采样率由于是我们自己采样的，到这个编码器随他怎么搞。只有比较新的浏览器支持（需实现浏览器MediaRecorder），压缩率和mp3差不多。源码2kb大小。

## beta-amr
采用的是[benz-amr-recorder](https://github.com/BenzLeung/benz-amr-recorder)(MIT License)优化后的[amr.js](https://github.com/jpemartins/amr.js)(Unknown License)，`https://github.com/BenzLeung/benz-amr-recorder/blob/462c6b91a67f7d9f42d0579fb5906fad9edb2c9d/src/amrnb.js`这个版本的文件代码，已对此代码进行过调整更方便使用。支持编码和解码操作。由于最高只有12.8kbps的码率，音质和同比配置的mp3、ogg差一个档次。由于支持解码操作，理论上所有支持Audio的浏览器都可以播放（需要自己写代码实现）。源码1M多，蛮大，压缩后445K，开启gzip后136K。优点：录音文件小。

### Recorder.amr2wav(amrBlob,True,False)
已实现的一个把amr转成wav格式来播放的方法，`True=fn(wavBlob,duration)`。要使用此方法需要带上上面的`wav`格式编码器。仿照此方法可轻松转成别的格式，参考`mock`方法介绍那节。



# :open_book:其他音频格式支持办法
``` javascript
//比如增加aac格式支持 (可参考/src/engine/wav.js的简单实现；如果要实现边录边转码应该参考mp3的实现，需实现的接口比较多)

//新增一个aac.js，编写以下格式代码即可实现这个类型
Recorder.prototype.aac=function(pcmData,successCall,failCall){
    //通过aac编码器把pcm[Int16,...]数据转成aac格式数据，通过this.set拿到传入的配置数据
    ... pcmData->aacData
    
    //返回数据
    successCall(new Blob([aacData.buffer],{type:"audio/aac"}));
}

//调用
Recorder({type:"aac"})
```


# :open_book:扩展
在`src/extensions`目录内为扩展支持库，这些扩展库默认都没有合并到生成代码中，需单独引用(`dist`或`src`中的)才能使用。

【附】部分扩展使用效果图：

![](https://gitee.com/xiangyuecn/Recorder/raw/master/assets/use_wave.gif)


## `WaveView`扩展
[waveview.js](https://github.com/xiangyuecn/Recorder/blob/master/src/extensions/waveview.js)，4kb大小源码，录音时动态显示波形，具体样子参考演示地址页面。此扩展参考[MCVoiceWave](https://github.com/HaloMartin/MCVoiceWave)库编写的，具体代码在`https://github.com/HaloMartin/MCVoiceWave/blob/f6dc28975fbe0f7fc6cc4dbc2e61b0aa5574e9bc/MCVoiceWave/MCVoiceWaveView.m`中。

此扩展是在录音时`onProcess`回调中使用；`Recorder.BufferSize`会影响绘制帧率，越小越流畅（但越消耗cpu），默认配置的大概12帧/s。基础使用方法：[​](?Ref=WaveView.Codes&Start)
``` javascript
var wave;
var rec=Recorder({
    onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate){
        wave.input(buffers[buffers.length-1],powerLevel,bufferSampleRate);//输入音频数据，更新显示波形
    }
});
rec.open(function(){
    wave=Recorder.WaveView({elem:".elem"}); //创建wave对象，写这里面浏览器妥妥的
    
    rec.start();
});
```

[​](?RefEnd)

### 【构造】wave=Recorder.WaveView(set)
构造函数，`set`参数为配置对象，默认配置值如下：
``` javascript
set={
    elem:"css selector" //自动显示到dom，并以此dom大小为显示大小
        //或者配置显示大小，手动把waveviewObj.elem显示到别的地方
    ,width:0 //显示宽度
    ,height:0 //显示高度
    
    //以上配置二选一
    
    scale:2 //缩放系数，应为正整数，使用2(3? no!)倍宽高进行绘制，避免移动端绘制模糊
    ,speed:8 //移动速度系数，越大越快
    
    ,lineWidth:3 //线条基础粗细
            
    //渐变色配置：[位置，css颜色，...] 位置: 取值0.0-1.0之间
    ,linear1:[0,"rgba(150,96,238,1)",0.2,"rgba(170,79,249,1)",1,"rgba(53,199,253,1)"] //线条渐变色1，从左到右
    ,linear2:[0,"rgba(209,130,255,0.6)",1,"rgba(53,199,255,0.6)"] //线条渐变色2，从左到右
    ,linearBg:[0,"rgba(255,255,255,0.2)",1,"rgba(54,197,252,0.2)"] //背景渐变色，从上到下
}
```

### 【方法】wave.input(pcmData,powerLevel,sampleRate)
输入音频数据，更新波形显示，这个方法调用的越快，波形越流畅。pcmData `[Int16,...]` 一维数组，为当前的录音数据片段，其他参数和`onProcess`回调相同。


## `WaveSurferView`扩展
[wavesurfer.view.js](https://github.com/xiangyuecn/Recorder/blob/master/src/extensions/wavesurfer.view.js)，7kb大小源码，音频可视化波形显示，具体样子参考演示地址页面。

此扩展的使用方式和`WaveView`扩展完全相同，请参考上面的`WaveView`来使用；本扩展的波形绘制直接简单的使用PCM的采样数值大小来进行线条的绘制，同一段音频绘制出的波形和Audition内显示的波形外观上几乎没有差异。

### 【构造】surfer=Recorder.WaveSurferView(set)
构造函数，`set`参数为配置对象，默认配置值如下：
``` javascript
set={
    elem:"css selector" //自动显示到dom，并以此dom大小为显示大小
        //或者配置显示大小，手动把frequencyObj.elem显示到别的地方
    ,width:0 //显示宽度
    ,height:0 //显示高度
    
    //以上配置二选一
    
    scale:2 //缩放系数，应为正整数，使用2(3? no!)倍宽高进行绘制，避免移动端绘制模糊
    
    ,fps:50 //绘制帧率，不可过高，50-60fps运动性质动画明显会流畅舒适，实际显示帧率达不到这个值也并无太大影响
    
    ,duration:2500 //当前视图窗口内最大绘制的波形的持续时间，此处决定了移动速率
    ,direction:1 //波形前进方向，取值：1由左往右，-1由右往左
    ,position:0 //绘制位置，取值-1到1，-1为最底下，0为中间，1为最顶上，小数为百分比
    
    ,centerHeight:1 //中线基础粗细，如果为0不绘制中线，position=±1时应当设为0
    
    //波形颜色配置：[位置，css颜色，...] 位置: 取值0.0-1.0之间
    ,linear:[0,"rgba(0,187,17,1)",0.7,"rgba(255,215,0,1)",1,"rgba(255,102,0,1)"]
    ,lineColor:"" //中线css颜色，留空取波形第一个渐变颜色
}
```

### 【方法】surfer.input(pcmData,powerLevel,sampleRate)
输入音频数据，更新波形显示。pcmData `[Int16,...]` 一维数组，为当前的录音数据片段，其他参数和`onProcess`回调相同。



## `FrequencyHistogramView`扩展
[frequency.histogram.view.js](https://github.com/xiangyuecn/Recorder/blob/master/src/extensions/frequency.histogram.view.js) + [lib.fft.js](https://github.com/xiangyuecn/Recorder/blob/master/src/extensions/lib.fft.js)，12kb大小源码，音频可视化频率直方图显示，具体样子参考演示地址页面。此扩展核心算法参考Java开源库[jmp123](https://sourceforge.net/projects/jmp123/files/)的代码编写的，`jmp123`版本`0.3`；直方图特意优化主要显示0-5khz语音部分，其他高频显示区域较小，不适合用来展示音乐频谱。

此扩展的使用方式和`WaveView`扩展完全相同，请参考上面的`WaveView`来使用；请注意：必须同时引入`lib.fft.js`才能正常工作。


### 【构造】histogram=Recorder.FrequencyHistogramView(set)
构造函数，`set`参数为配置对象，默认配置值如下：
``` javascript
set={
    elem:"css selector" //自动显示到dom，并以此dom大小为显示大小
        //或者配置显示大小，手动把frequencyObj.elem显示到别的地方
    ,width:0 //显示宽度
    ,height:0 //显示高度
    
    //以上配置二选一
    
    scale:2 //缩放系数，应为正整数，使用2(3? no!)倍宽高进行绘制，避免移动端绘制模糊
    
    ,fps:20 //绘制帧率，不可过高
    
    ,lineCount:30 //直方图柱子数量，数量的多少对性能影响不大，密集运算集中在FFT算法中
    ,lineWidth:6 //柱子线条基础粗细，当视图可以容下lineCount这么多时才会生效，否则自适应
    ,minHeight:0 //柱子保留基础高度，position不为±1时应该保留点高度
    ,position:-1 //绘制位置，取值-1到1，-1为最底下，0为中间，1为最顶上，小数为百分比
    
    ,stripeEnable:true //是否启用柱子顶上的峰值小横条，position不是-1时应当关闭，否则会很丑
    ,stripeHeight:3 //峰值小横条基础高度
    ,stripeMargin:6 //峰值小横条和柱子保持的基础距离
    
    ,fallDuration:1000 //柱子从最顶上下降到最底部最长时间ms
    ,stripeFallDuration:3500 //峰值小横条从最顶上下降到底部最长时间ms
    
    //柱子颜色配置：[位置，css颜色，...] 位置: 取值0.0-1.0之间
    ,linear:[0,"rgba(0,187,17,1)",0.5,"rgba(255,215,0,1)",1,"rgba(255,102,0,1)"]
    //峰值小横条渐变颜色配置，取值格式和linear一致，留空为柱子的渐变颜色
    ,stripeLinear:null
    
    ,shadowBlur:0 //柱子阴影基础大小，设为0不显示阴影，如果柱子数量太多时请勿开启，非常影响性能
    ,shadowColor:"#bbb" //柱子阴影颜色
    ,stripeShadowBlur:-1 //峰值小横条阴影基础大小，设为0不显示阴影，-1为柱子的大小，如果柱子数量太多时请勿开启，非常影响性能
    ,stripeShadowColor:"" //峰值小横条阴影颜色，留空为柱子的阴影颜色
    
    //当发生绘制时会回调此方法，参数为当前绘制的频率数据和采样率，可实现多个直方图同时绘制，只消耗一个input输入和计算时间
    ,onDraw:function(frequencyData,sampleRate){}
}
```

### 【方法】histogram.input(pcmData,powerLevel,sampleRate)
输入音频数据，更新直方图显示。pcmData `[Int16,...]` 一维数组，为当前的录音数据片段，其他参数和`onProcess`回调相同。


## `Sonic`扩展
[sonic.js](https://github.com/xiangyuecn/Recorder/blob/master/src/extensions/sonic.js)，37kb大小源码(压缩版gzip后4.5kb)，音频变速变调转换，[参考此demo片段在线测试使用](https://xiangyuecn.github.io/Recorder/assets/工具-代码运行和静态分发Runtime.html?jsname=teach.sonic.transform)。此扩展从[Sonic.java](https://github.com/waywardgeek/sonic/blob/71c51195de71627d7443d05378c680ba756545e8/Sonic.java)移植，并做了适当精简。

可到[assets/sonic-java](https://github.com/xiangyuecn/Recorder/tree/master/assets/sonic-java)目录运行java代码测试原版效果。

### 本扩展支持
1. `Pitch`：变调不变速（会说话的汤姆猫），男女变声，只调整音调，不改变播放速度
2. `Speed`：变速不变调（快放慢放），只调整播放速度，不改变音调
3. `Rate`：变速变调，会改变播放速度和音调
4. `Volume`：支持调整音量
5. 支持实时处理，可在onProcess中实时处理PCM（需开启异步），配合SampleData方法使用更佳

### Sonic文档
Sonic有两个构造方法，一个是同步方法，Sonic.Async是异步方法，同步方法简单直接但处理量大时会消耗大量时间，主要用于一次性的处理；异步方法由WebWorker在后台进行运算处理，但异步方法不一定能成功开启（低版本浏览器），主要用于实时处理。异步方法调用后必须调用flush方法，否则会产生内存泄露。

注意：由于同步方法转换操作需要占用比较多的CPU（但比转码小点），因此实时处理时在低端设备上可能会导致性能问题；在一次性处理大量pcm时，可采取切片+setTimeout进行处理，参考上面的demo片段。

注意：变速变调会大幅增减PCM数据长度，如果需要在onProcess中实时处理PCM，需要在rec.set中设置内部参数`rec.set.disableEnvInFix=true`来禁用设备卡顿时音频输入丢失补偿功能，否则可能导致错误的识别为设备卡顿。

注意：每次input输入的数据量应该尽量的大些，太少容易产生杂音，每次传入200ms以上的数据量就几乎没有影响了。

``` javascript
//【构造初始化】
var sonic=Recorder.Sonic(set) //同步调用，用于一次性处理
var sonic=Recorder.Sonic.Async(set) //异步调用，用于实时处理，调用后必须调用flush方法，否则会产生内存泄露。
    /*set:{
        sampleRate:待处理pcm的采样率，就是input输入的buffer的采样率
    }*/

//【功能配置调用函数】同步异步通用，以下num取值正常为0.1-2.0，超过这个范围也是可以的，但不推荐
sonic.setPitch(num)  //num:0.1-n，变调不变速（会说话的汤姆猫），男女变声，只调整音调，不改变播放速度，默认为1.0不调整
sonic.setSpeed(num)  //num:0.1-n，变速不变调（快放慢放），只调整播放速度，不改变音调，默认为1.0不调整
sonic.setRate(num)  //num:0.1-n，变速变调，越小越缓重，越大越尖锐，会改变播放速度和音调，默认为1.0不调整
sonic.setVolume(num)  //num:0.1-n，调整音量，默认为1.0不调整
sonic.setChordPitch(bool)  //bool:默认false，作用未知，不推荐使用
sonic.setQuality(num)  //num:0或1，默认0时会减小输入采样率来提供处理速度，变调时才会用到，不推荐使用

//【同步调用方法】
sonic.input(buffer)  //buffer:[Int16,...] 一维数组，输入pcm数据，返回转换后的部分pcm数据，完整输出需要调用flush；返回值[Int16,...]长度可能为0，代表没有数据被转换；此方法是耗时的方法，一次性处理大量pcm需要切片+setTimeout优化
sonic.flush()  //将残余的未转换的pcm数据完成转换并返回；返回值[Int16,...]长度可能为0，代表没有数据被转换

//【异步调用方法】
sonic.input(buffer,callback) //callback:fn(pcm)，和同步方法相同，只是返回值通过callback返回
sonic.flush(callback) //callback:fn(pcm)，和同步方法相同，只是返回值通过callback返回
```




# :open_book:兼容性
对于支持录音的浏览器能够正常录音并返回录音数据；对于不支持的浏览器，引入js和执行相关方法都不会产生异常，并且进入相关的fail回调。一般在open的时候就能检测到是否支持或者被用户拒绝，可在用户开始录音之前提示浏览器不支持录音或授权。




# :open_book:Android Hybrid App中录音示例
在Android Hybrid App中使用本库来录音，需要在App源码中实现以下两步分：

1. 在`AndroidManifest.xml`声明需要用到的两个权限
``` xml
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>
```

2. `WebChromeClient`中实现`onPermissionRequest`网页授权请求
``` java
@Override
public void onPermissionRequest(PermissionRequest request) {
    ...此处应包裹一层系统权限请求
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        request.grant(request.getResources());
    }
}
```

> 注：如果应用的`腾讯X5内核`，除了上面两个权限外，还必须提供`android.permission.CAMERA`权限。另外无法重写此`onPermissionRequest`方法，他会自己弹框询问，如果被拒绝了就看X5脸色了（随着X5不停更新什么时候恢复弹框天知地知就是你不知），参考已知问题部分。

如果不出意外，App内显示的网页就能正常录音了。

### 备忘小插曲
排查 [#46](https://github.com/xiangyuecn/Recorder/issues/46) `Android WebView`内长按录音不能收到`touchend`问题时，发现touch事件会被打断，反复折腾，最终发现是每次检测权限都会调用`Activity.requestPermissions`，而`requestPermissions`会造成WebView打断touch事件，进而产生H5、AppNative原生录都会产生此问题；最后老实把精简掉的`checkSelfPermission`加上检测一下是否已授权，就没有此问题了，囧。

### 附带测试项目
[app-support-sample/demo_android](https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/demo_android)目录中提供了Android测试源码（如果不想自己打包可以用打包好的apk来测试，文件名为`app-debug.apk.zip`，自行去掉.zip后缀）。




# :open_book:IOS Hybrid App中录音示例
纯粹的H5录音在IOS WebView中是不支持的，需要有Native层的支持，具体参考RecordApp中的[app-support-sample/demo_ios](https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/demo_ios)，含IOS App源码。



# :open_book:语音通话聊天demo：实时编码、传输与播放验证
在[线测试Demo](https://xiangyuecn.github.io/Recorder/)中包含了一个语音通话聊天的测试功能，没有服务器支持所以仅支持局域网内一对一语音。用两个设备（浏览器打开两个标签也可以）打开demo，勾选H5版语音通话聊天，按提示交换两个设备的信息即可成功进行P2P连接，然后进行语音。实际使用时数据传输可以用WebSocket，会简单好多。

编写本语音测试的目的在于验证H5录音实时转码、传输的可行性，并验证实时转码mp3格式小片段文件接收后的可播放性。经测试发现：除了移动端可能存在设备性能低下的问题以外，录音后实时转码mp3并传输给对方是可行的，对方接收后播放也能连贯的播放（效果还是要看播放代码写的怎么样，目前没有比较完美的播放代码）。另外（16kbps,16khz）MP3开语音15分钟大概3M的流量，wav 15分钟要37M多流量。

另外除wav外MP3等格式编码出来的音频的播放时间比PCM原始数据要长一些或短一些，如果涉及到解码或拼接时，这个地方需要注意。

![](https://gitee.com/xiangyuecn/Recorder/raw/master/assets/use_webrtc.png)


# :open_book:工具：代码运行和静态分发Runtime
[在线访问](https://xiangyuecn.github.io/Recorder/assets/%E5%B7%A5%E5%85%B7-%E4%BB%A3%E7%A0%81%E8%BF%90%E8%A1%8C%E5%92%8C%E9%9D%99%E6%80%81%E5%88%86%E5%8F%91Runtime.html)，本工具提供在线运行和测试代码的能力，本库的大部分小demo将由此工具来进行开发和承载。本工具提供代码片段的分发功能，代码存储在url中，因此简单可靠；额外提供了一套源码作者的身份认证机制。

我们不传输、不存储数据，我们只是代码的可靠搬运工。看图：

![](https://gitee.com/xiangyuecn/Recorder/raw/master/assets/use_runtime.gif)


# :open_book:工具：裸(RAW、WAV)PCM转WAV播放测试和转码
[在线访问](https://xiangyuecn.github.io/Recorder/assets/%E5%B7%A5%E5%85%B7-%E8%A3%B8PCM%E8%BD%ACWAV%E6%92%AD%E6%94%BE%E6%B5%8B%E8%AF%95.html)，本工具用来对原始的PCM音频数据进行封装、播放、转码，操作极其简单，免去了动用二进制编辑工具操作的麻烦。比如加工一下Android AudioRecord(44100)采集的音频。源码在`assets/工具-裸PCM转WAV播放测试.html`;

![](https://gitee.com/xiangyuecn/Recorder/raw/master/assets/use_pcm_tool.png)


# :open_book:关于微信JsSDK和RecordApp
微信内浏览器他家的[JsSDK](https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421141115)也支持录音，涉及笨重难调的公众号开发（光sdk初始化就能阻碍很多新奇想法的产生，signature限制太多），只能满足最基本的使用（大部分情况足够了）。获取音频数据必须绕一个大圈：录好音了->上传到微信服务器->自家服务器请求微信服务器多进行媒体下载->保存录音（微信小程序以前也是二逼路子，现在稍微好点能实时拿到录音mp3数据）。

[2018]由于微信IOS上不支持原生JS录音，Android上又支持，为了兼容而去兼容的事情我是拒绝的（而且是仅仅为了兼容IOS上面的微信），其实也算不上去兼容，因为微信JsSDK中的接口完全算是另外一种东西，接入的话对整个录音流程都会产生完全不一样的变化，还不如没有进入录音流程之前就进行分支判断处理。

[2019]大动干戈，仅为兼容IOS而生，不得不向大厂低头，我还是为兼容而去兼容了IOS微信，对不支持录音的IOS微信`浏览器`、`小程序web-view`进行了兼容，使用微信JsSDK来录音，并以前未开源的兼容代码基础上重写了`RecordApp`，源码在`app-support-sample`、`src/app-support`内。

最后：如果要兼容IOS，可以自行接入JsSDK或使用`RecordApp`（没有公众号开个订阅号又不要钱），基本上可以忽略兼容性问题，就是麻烦点。


# :star:捐赠
如果这个库有帮助到您，请 Star 一下。

您也可以使用支付宝或微信打赏作者：

![](https://gitee.com/xiangyuecn/Recorder/raw/master/assets/donate-alipay.png)  ![](https://gitee.com/xiangyuecn/Recorder/raw/master/assets/donate-weixin.png)