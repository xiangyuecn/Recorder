[​](?)

[​](?)

# Recorder-UniCore组件：uni-app内使用RecordApp录音

本组件使用`Recorder`开源库来进行录音和音频数据处理，使用`RecordApp`和本组件内的`app-uni-support.js`来适配到不同平台环境下进行录音。

- 支持vue2、vue3、nvue
- 支持编译成：H5、Android App、iOS App、微信小程序
- 支持已有的大部分录音格式：mp3、wav、pcm、amr、ogg、g711a、g711u等
- 支持实时处理，包括变速变调、实时上传、ASR语音转文字
- 支持可视化波形显示
- App端另有配套的原生录音插件、uts插件可供选择，兼容性和体验更好

**Recorder开源库地址：** [https://github.com/xiangyuecn/Recorder](https://github.com/xiangyuecn/Recorder)

**组件文档和Demo项目：** [https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/demo_UniApp](https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/demo_UniApp)

如果github打不开，可以将上面链接中的 `github.com` 换成 `gitee.com` 。



[​](?)

[​](?)

# 集成到自己项目中

你可以直接参考插件市场中下载的Demo项目，或者上面GitHub链接上的Demo项目，上手更简单；由于RecordApp实现机制复杂，简单使用可直接照抄Demo代码，高级使用请阅读：[Recorder文档](https://github.com/xiangyuecn/Recorder)、[RecordApp文档](https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample)、[demo_UniApp文档](https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/demo_UniApp) 这三个文档（均为完整的一个README.md文档），Recorder文档中包含了更丰富的示例代码：基础录音、实时处理、格式转码、音频分析、音频混音、音频生成 等等。


## 一、引入js文件
1. 在你的项目根目录安装`recorder-core`：`npm install recorder-core`
2. 导入Recorder-UniCore组件：插件市场下载本组件，然后添加到你的项目中 `/uni_modules/Recorder-UniCore`
3. 在需要录音的vue文件内编写以下代码，按需引入需要的js

``` html
<script> /**这里是逻辑层**/
//必须引入的Recorder核心（文件路径是 /src/recorder-core.js 下同）
import Recorder from 'recorder-core' //使用import、require都行

//必须引入的RecordApp核心文件（文件路径是 /src/app-support/app.js）
import RecordApp from 'recorder-core/src/app-support/app'

//所有平台必须引入的uni-app支持文件（如果编译出现路径错误，请把@换成 ../../ 这种）
import '@/uni_modules/Recorder-UniCore/app-uni-support.js'

/** 需要编译成微信小程序时，引入微信小程序支持文件 **/
// #ifdef MP-WEIXIN
    import 'recorder-core/src/app-support/app-miniProgram-wx-support.js'
// #endif


/** H5、小程序环境中：引入需要的格式编码器、可视化插件，App环境中在renderjs中引入 **/
// #ifdef H5 || MP-WEIXIN
    //按需引入你需要的录音格式支持文件，如果需要多个格式支持，把这些格式的编码引擎js文件统统引入进来即可
    import 'recorder-core/src/engine/mp3'
    import 'recorder-core/src/engine/mp3-engine' //如果此格式有额外的编码引擎（*-engine.js）的话，必须要加上
    
    //可选的插件支持项
    import 'recorder-core/src/extensions/waveview'
// #endif
</script>
```

``` html
<!-- #ifdef APP -->
<script module="yourModuleName" lang="renderjs">
/**需要编译成App时，你需要添加一个renderjs模块，然后一模一样的import上面那些js（微信的js除外）
    ，因为App中默认是在renderjs（WebView）中进行录音和音频编码**/
import 'recorder-core'
import RecordApp from 'recorder-core/src/app-support/app'
import '../../uni_modules/Recorder-UniCore/app-uni-support.js' //renderjs中似乎不支持"@/"打头的路径，如果编译路径错误请改正路径即可

//按需引入你需要的录音格式支持文件，和插件
import 'recorder-core/src/engine/mp3'
import 'recorder-core/src/engine/mp3-engine' 

import 'recorder-core/src/extensions/waveview'

export default {
    mounted(){
        //App的renderjs必须调用的函数，传入当前模块this
        RecordApp.UniRenderjsRegister(this);
    },
    methods: {
        //这里定义的方法，在逻辑层中可通过 RecordApp.UniWebViewVueCall(this,'this.xxxFunc()') 直接调用
        //调用逻辑层的方法，请直接用 this.$ownerInstance.callMethod("xxxFunc",{args}) 调用，二进制数据需转成base64来传递
    }
}
</script>
<!-- #endif -->
```


[​](?)

[​](?)

## 二、调用录音
``` javascript
/**在逻辑层中编写**/
//import ... 上面那些import代码

export default {
data() { return {} } //视图没有引用到的变量无需放data里，直接this.xxx使用

,mounted() {
    this.isMounted=true;
    //页面onShow时【必须调用】的函数，传入当前组件this
    RecordApp.UniPageOnShow(this);
}
,onShow(){ //onShow可能比mounted先执行，页面可能还未准备好
    if(this.isMounted) RecordApp.UniPageOnShow(this);
}

,methods:{
    //请求录音权限
    recReq(){
        //编译成App时提供的授权许可（编译成H5、小程序为免费授权可不填写）；如果未填写授权许可，将会在App打开后第一次调用请求录音权限时，弹出“未获得商用授权时，App上仅供测试”提示框
        //RecordApp.UniAppUseLicense='我已获得UniAppID=*****的商用授权';
        
        RecordApp.UniWebViewActivate(this); //App环境下必须先切换成当前页面WebView
        RecordApp.RequestPermission(()=>{
            console.log("已获得录音权限，可以开始录音了");
        },(msg,isUserNotAllow)=>{
            if(isUserNotAllow){//用户拒绝了录音权限
                //这里你应当编写代码进行引导用户给录音权限，不同平台分别进行编写
            }
            console.error("请求录音权限失败："+msg);
        });
    }
    
    //开始录音
    ,recStart(){
        //录音配置信息
        var set={
            type:"mp3",sampleRate:16000,bitRate:16 //mp3格式，指定采样率hz、比特率kbps，其他参数使用默认配置；注意：是数字的参数必须提供数字，不要用字符串；需要使用的type类型，需提前把格式支持文件加载进来，比如使用wav格式需要提前加载wav.js编码引擎
            ,onProcess:(buffers,powerLevel,duration,sampleRate,newBufferIdx,asyncEnd)=>{
                //全平台通用：可实时上传（发送）数据，配合Recorder.SampleData方法，将buffers中的新数据连续的转换成pcm上传，或使用mock方法将新数据连续的转码成其他格式上传，可以参考Recorder文档里面的：Demo片段列表 -> 实时转码并上传-通用版；基于本功能可以做到：实时转发数据、实时保存数据、实时语音识别（ASR）等
                
                //注意：App里面是在renderjs中进行实际的音频格式编码操作，此处的buffers数据是renderjs实时转发过来的，修改此处的buffers数据不会改变renderjs中buffers，所以不会改变生成的音频文件，可在onProcess_renderjs中进行修改操作就没有此问题了；如需清理buffers内存，此处和onProcess_renderjs中均需要进行清理，H5、小程序中无此限制
                //注意：如果你要用只支持在浏览器中使用的Recorder扩展插件，App里面请在renderjs中引入此扩展插件，然后在onProcess_renderjs中调用这个插件；H5可直接在这里进行调用，小程序不支持这类插件；如果调用插件的逻辑比较复杂，建议封装成js文件，这样逻辑层、renderjs中直接import，不需要重复编写
                
                //H5、小程序等可视化图形绘制，直接运行在逻辑层；App里面需要在onProcess_renderjs中进行这些操作
                // #ifdef H5 || MP-WEIXIN
                if(this.waveView) this.waveView.input(buffers[buffers.length-1],powerLevel,sampleRate);
                // #endif
            }
            ,onProcess_renderjs:`function(buffers,powerLevel,duration,sampleRate,newBufferIdx,asyncEnd){
                //App中在这里修改buffers才会改变生成的音频文件
                //App中是在renderjs中进行的可视化图形绘制，因此需要写在这里，this是renderjs模块的this（也可以用This变量）；如果代码比较复杂，请直接在renderjs的methods里面放个方法xxxFunc，这里直接使用this.xxxFunc(args)进行调用
                if(this.waveView) this.waveView.input(buffers[buffers.length-1],powerLevel,sampleRate);
            }`
            
            ,takeoffEncodeChunk:true?null:(chunkBytes)=>{
                //全平台通用：实时接收到编码器编码出来的音频片段数据，chunkBytes是Uint8Array二进制数据，可以实时上传（发送）出去
                //App中如果未配置RecordApp.UniWithoutAppRenderjs时，建议提供此回调，因为录音结束后会将整个录音文件从renderjs传回逻辑层，由于uni-app的逻辑层和renderjs层数据交互性能实在太拉跨了，大点的文件传输会比较慢，提供此回调后可避免Stop时产生超大数据回传
            }
            ,takeoffEncodeChunk_renderjs:true?null:`function(chunkBytes){
                //App中这里可以做一些仅在renderjs中才生效的事情，不提供也行，this是renderjs模块的this（也可以用This变量）
            }`
            
            ,start_renderjs:`function(){
                //App中可以放一个函数，在Start成功时renderjs中会先调用这里的代码，this是renderjs模块的this（也可以用This变量）
                //放一些仅在renderjs中才生效的事情，比如初始化，不提供也行
            }`
            ,stop_renderjs:`function(arrayBuffer,duration,mime){
                //App中可以放一个函数，在Stop成功时renderjs中会先调用这里的代码，this是renderjs模块的this（也可以用This变量）
                //放一些仅在renderjs中才生效的事情，不提供也行
            }`
        };
        
        RecordApp.UniWebViewActivate(this); //App环境下必须先切换成当前页面WebView
        RecordApp.Start(set,()=>{
            console.log("已开始录音");
            
            //创建音频可视化图形绘制，App环境下是在renderjs中绘制，H5、小程序等是在逻辑层中绘制，因此需要提供两段相同的代码
            //view里面放一个canvas，canvas需要指定宽高（下面style里指定了300*100）
            //<canvas type="2d" class="recwave-WaveView" style="width:300px;height:100px"></canvas>
            RecordApp.UniFindCanvas(this,[".recwave-WaveView"],`
                this.waveView=Recorder.WaveView({compatibleCanvas:canvas1, width:300, height:100});
            `,(canvas1)=>{
                this.waveView=Recorder.WaveView({compatibleCanvas:canvas1, width:300, height:100});
            });
        },(msg)=>{
            console.error("开始录音失败："+msg);
        });
    }
    
    //暂停录音
    ,recPause(){
        if(RecordApp.GetCurrentRecOrNull()){
            RecordApp.Pause();
            console.log("已暂停");
        }
    }
    //继续录音
    ,recResume(){
        if(RecordApp.GetCurrentRecOrNull()){
            RecordApp.Resume();
            console.log("继续录音中...");
        }
    }
    
    //停止录音
    ,recStop(){
        RecordApp.Stop((arrayBuffer,duration,mime)=>{
            //全平台通用：arrayBuffer是音频文件二进制数据，可以保存成文件或者发送给服务器
            //App中如果在Start参数中提供了stop_renderjs，renderjs中的函数会比这个函数先执行
            
            //注意：当Start时提供了takeoffEncodeChunk后，你需要自行实时保存录音文件数据，因此Stop时返回的arrayBuffer的长度将为0字节
            
            //如果当前环境支持Blob，也可以直接构造成Blob文件对象，和Recorder使用一致
            if(typeof(Blob)!="undefined" && typeof(window)=="object"){
                var blob=new Blob([arrayBuffer],{type:mime});
                console.log(blob, (window.URL||webkitURL).createObjectURL(blob));
            }
        },(msg)=>{
            console.error("结束录音失败："+msg);
        });
    }
    
}
}
```






[​](?)

[​](?)

[​](?)

[​](?)

# 部分原理和需要注意的细节
## 编译成H5时录音和权限
编译成H5时，录音功能由Recorder H5提供，无需额外处理录音权限。


[​](?)

## 编译成微信小程序时录音和权限
编译成微信小程序时，录音功能由小程序的`RecorderManager`提供，屏蔽了微信原有的底层细节（无录音时长限制）。

小程序录音需要用户授予录音权限，调用`RecordApp.RequestPermission`的时候会检查是否能正常录音，如果用户拒绝了录音权限，会进入错误回调，回调里面你应当编写代码检查`wx.getSetting`中的`scope.record`录音权限，然后引导用户进行授权（可调用`wx.openSetting`打开设置页面，方便用户给权限）。

更多细节请参考 [miniProgram-wx](https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/miniProgram-wx) 测试项目文档。


[​](?)

## 编译成App时录音和权限
编译成App录音时，分两种情况：
1. 默认未配置`RecordApp.UniNativeUtsPlugin`（未使用原生录音插件和uts插件）时，会在renderjs中使用Recorder H5进行录音，录音数据会实时回传到逻辑层。
2. 配置了`RecordApp.UniNativeUtsPlugin`使用原生录音插件或uts插件时，会直接调用原生插件进行录音；录音数据默认会传递到renderjs中进行音频编码处理（WebWorker加速），然后再实时回传到逻辑层，如果配置了`RecordApp.UniWithoutAppRenderjs=true`时，音频编码处理将会在逻辑层中直接处理。

**当App是在renderjs中使用H5进行录音时（未使用原生录音插件和uts插件），iOS上只支持14.3以上版本，且iOS上每次进入页面后第一次请求录音权限时、或长时间无操作再请求录音权限时WebView均会弹出录音权限对话框，不同旧iOS版本（低于iOS17）下H5录音可能存在的问题在App中同样会存在；使用配套的原生录音插件或uts插件时无以上问题和版本限制（uts插件开发中暂不可用），Android也无以上问题。**

**当音频编码是在renderjs中进行处理时，录音结束后会将整个录音文件传回逻辑层，由于uni-app的逻辑层和renderjs层大点的文件传输会比较慢，建议Start时使用takeoffEncodeChunk实时获取音频文件数据可避免Stop时产生超大数据回传；配置了`RecordApp.UniWithoutAppRenderjs=true`后，因为音频编码直接是在逻辑层中进行，将不存在传输性能损耗，但会影响逻辑层的性能（正常情况轻微不明显），需要配套使用原生录音插件才可以进行此项配置。**

在调用`RecordApp.RequestPermission`的时候，`Recorder-UniCore`组件会自动处理好App的系统录音权限，只需要在uni-app项目的 `manifest.json` 中配置好Android和iOS的录音权限声明。
```
//Android需要勾选的权限，第二个必须勾选，不然使用H5录音时将没法打开麦克风
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>

//iOS需要声明的权限
NSMicrophoneUsageDescription
```




[​](?)

[​](?)

[​](?)

# 本组件的授权许可限制
**本组件内的app-uni-support.js文件在uni-app中编译到App平台时仅供测试用（App平台包括：Android App、iOS App），不可用于正式发布或商用，正式发布或商用需先联系作者获得授权许可**；编译到其他平台时无此授权限制，比如：H5、小程序。

在App中，如果未获得授权许可，将会在App打开后第一次调用`RecordApp.RequestPermission`请求录音权限时，弹出“未获得商用授权时，App上仅供测试”提示框。

获得作者的授权许可后，请在调用`RecordApp.RequestPermission`请求录音权限前，赋值`RecordApp.UniAppUseLicense="我已获得UniAppID=***的商用授权"`（星号为你项目的uni-app应用标识），就不会弹提示框了；或者到DCloud插件市场购买了配套的原生录音插件或uts插件，直接设置`RecordApp.UniNativeUtsPlugin`参数，也不会弹提示框。

在DCloud插件市场购买了配套的原生录音插件或uts插件并配置后（uts插件开发中暂不可购买），将自动获得授权，其他情况请联系作者咨询，更多细节请参考[本组件的GitHub文档](https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/demo_UniApp)。

获取授权、需要技术支持、或有不清楚的地方可以联系我们，客服联系方式：QQ 1251654593 ，或者直接联系作者QQ 753610399 （回复可能没有客服及时）。

插件开发维护不易，感谢支持~


[​](?)

[​](?)


