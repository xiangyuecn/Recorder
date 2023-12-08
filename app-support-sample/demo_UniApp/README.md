[Recorder](https://github.com/xiangyuecn/Recorder/) | [RecordApp](https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample)

# :open_book:uni-app内使用RecordApp录音

本目录内包含uni-app的测试项目源码，主要文件请参考 [main_recTest.vue](pages/recTest/main_recTest.vue) ；本测试项目是使用[app-uni-support.js](uni_modules/Recorder-UniCore/app-uni-support.js)来给`RecordApp`提供uni-app支持的，此文件在 `uni_modules/Recorder-UniCore` 组件内，copy即可使用，或者到[DCloud 插件市场下载此组件](https://ext.dcloud.net.cn/plugin?name=Recorder-UniCore)。

- 支持vue2、vue3、nvue
- 支持编译成：H5、Android App、iOS App、微信小程序
- 支持已有的大部分录音格式：mp3、wav、pcm、amr、ogg、g711a、g711u等
- 支持实时处理，包括变速变调、实时上传、ASR语音转文字
- 支持可视化波形显示
- App端另有配套的原生录音插件、uts插件可供选择，兼容性和体验更好

**[AD]app-uni-support.js文件在uni-app中编译到App平台时仅供测试用（App平台包括：Android App、iOS App），不可用于正式发布或商用，正式发布或商用需先联系作者获得授权许可**；编译到其他平台时无此授权限制，比如：H5、小程序，均为免费授权；详情参考本文档下面的授权许可章节。



## 测试方法
1. 在测试项目根目录执行 `npm install` ，完成`recorder-core`依赖的安装
2. 在HBuilder中打开本测试项目文件夹
3. 在HBuilder中运行到浏览器、手机、微信小程序，即可在不同环境下测试


## 截图
![](use-uni-app.png)




[​](?)

[​](?)

[​](?)

[​](?)

# 集成到自己项目中

## 一、引入js文件
1. 在你的项目根目录安装`recorder-core`：`npm install recorder-core`
2. 导入Recorder-UniCore组件：直接复制本目录下的`uni_modules/Recorder-UniCore`组件到你项目中，或者到[DCloud 插件市场下载此组件](https://ext.dcloud.net.cn/plugin?name=Recorder-UniCore)
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
                //App中如果未配置Recorder.UniWithoutAppRenderjs时，建议提供此回调，因为录音结束后会将整个录音文件从renderjs传回逻辑层，由于uni-app的逻辑层和renderjs层数据交互性能实在太拉跨了，大点的文件传输会比较慢，提供此回调后可避免Stop时产生超大数据回传
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

更多细节请参考 [miniProgram-wx](../miniProgram-wx) 测试项目文档。


[​](?)

## 编译成App时录音和权限
编译成App录音时，分两种情况：
1. 默认未配置`RecordApp.UniNativeUtsPlugin`（未使用原生录音插件和uts插件）时，会在renderjs中使用Recorder H5进行录音，录音数据会实时回传到逻辑层。
2. 配置了`RecordApp.UniNativeUtsPlugin`使用原生录音插件或uts插件时，会直接调用原生插件进行录音；录音数据默认会传递到renderjs中进行音频编码处理（WebWorker加速），然后再实时回传到逻辑层，如果配置了`RecordApp.UniWithoutAppRenderjs=true`时，音频编码处理将会在逻辑层中直接处理。

**当App是在renderjs中使用H5进行录音时（未使用原生录音插件和uts插件），iOS上只支持14.3以上版本，且iOS上每次进入页面后第一次请求录音权限时、或长时间无操作再请求录音权限时WebView均会弹出录音权限对话框，不同旧iOS版本（低于iOS17）下H5录音可能存在的问题在App中同样会存在；使用配套的原生录音插件或uts插件时无以上问题和版本限制（uts插件开发中暂不可用），Android也无以上问题。**

**当音频编码是在renderjs中进行处理时，录音结束后会将整个录音文件传回逻辑层，由于uni-app的逻辑层和renderjs层数据交互性能实在太拉跨了，大点的文件传输会比较慢，建议Start时使用takeoffEncodeChunk实时获取音频文件数据可避免Stop时产生超大数据回传；配置了`RecordApp.UniWithoutAppRenderjs=true`后，因为音频编码直接是在逻辑层中进行，将不存在传输性能损耗，但会影响逻辑层的性能（正常情况轻微不明显），需要配套使用原生录音插件才可以进行此项配置。**

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

# :open_book:国际化多语言支持（i18n）
RecordApp共用`Recorder.i18n`实现，因此只需配置Recorder的语言即可；支持的语言文件在 [/src/i18n](../../src/i18n) 目录内，详细使用请参考Recorder文档。

比如切换成英文：先`import "recorder-core/src/i18n/en-US.js"`，Recorder-UniCore组件内也有一个`i18n`目录 `import "@/uni_modules/Recorder-UniCore/i18n/en-US.js"`，然后配置`Recorder.i18n.lang="en-US"`即可。






[​](?)

[​](?)

[​](?)

[​](?)

# RecordApp增加的属性和方法文档
RecordApp基础的属性和方法请阅读[RecordApp文档](../)，比如`RequestPermission`、`Start`、`Stop`这些方法。下面的属性和方法是uni-app支持文件给RecordApp增加的，引入`app-uni-support.js`文件后才可以使用。

**下面的方法中，如果写了`App 逻辑层中调用`，就只能在App环境下，并且只能在逻辑层中调用，在H5、renderjs等环境下调用将返回错误或显示错误日志，但不会抛异常；写了`renderjs层中调用`只能在App环境下的renderjs中进行调用；未写类似字样的，一般没有调用限制，在哪调用都行。**

## 【静态方法】RecordApp.UniIsApp()
判断当前环境是否是app，非app返回0，Android返回1，iOS返回2

## 【静态方法】RecordApp.UniPageOnShow(componentThis)
所有平台逻辑层中调用，当使用到录音的页面onShow时反复进行调用，传入当前页面或组件的this对象；如果是微信小程序环境，还会自动调用`RecordApp.MiniProgramWx_onShow`

## 【静态方法】RecordApp.UniWebViewActivate(componentThis)
App 逻辑层中调用，切换使用当前页面或组件的WebView，传入当前页面或组件的this对象，App环境中在调用本方法后才可以进行RecordApp.RequestPermission、RecordApp.Start操作

## 【静态方法】RecordApp.UniRenderjsRegister(moduleThis)
App renderjs中的mounted内调用，传入当前模块的this，一个renderjs模块只需调用一次即可

## 【静态方法】RecordApp.UniWebViewEval(componentThis,jsCode,bigBytes)
App 逻辑层中直接调用此页面或组件的WebView renderjs中的eval（componentThis为null时使用UniWebViewActivate切换的页面或组件），jsCode里一般需要用个自调用函数包裹；要调用renderjs模块vue组件内的方法请用UniWebViewVueCall；如果需要传递大的数据请用bigBytes参数传入一个ArrayBuffer，jsCode中使用BigBytes变量得到这个数据

``` javascript
//调用示例代码
var cb=RecordApp.UniMainCallBack((data)=>{ //可选的，renderjs执行完成后回调
    uni.showModal({title:"收到了renderjs回调", content:JSON.stringify(data)});
});

var dataMB=new Uint8Array(1*1024*1024); //可选的，假设同时需要传递1MB的数据到renderjs中

RecordApp.UniWebViewEval(this,`(function(){
    var dataMB=BigBytes; //接收到了逻辑层的二进制数据
    console.log("renderjs已执行 "+dataMB.byteLength); //这里是WebView浏览器环境，随便调用
    
    //处理完后，可以回调结果给逻辑层
    RecordApp.UniWebViewSendToMain({action:"${cb}", abc:dataMB.byteLength});
})()`, dataMB.buffer);
```

## 【静态方法】RecordApp.UniWebViewVueCall(componentThis,jsCode,bigBytes)
App 逻辑层中直接调用此页面或组件的renderjs模块vue组件内的方法（componentThis为null时使用UniWebViewActivate切换的页面或组件），jsCode中的this为renderjs模块的this（也可以用This变量）（如需renderjs中调用逻辑层vue实例方法，请直接用$ownerInstance.callMethod即可）；如果需要传递大的数据请用bigBytes参数传入一个ArrayBuffer，jsCode中使用BigBytes变量得到这个数据

``` javascript
//调用示例代码
var cb=RecordApp.UniMainCallBack((data)=>{ //可选的，renderjs执行完成后回调
    uni.showModal({title:"收到了renderjs回调", content:JSON.stringify(data)});
});

RecordApp.UniWebViewVueCall(this,`
    console.log("renderjs已执行 "+typeof(this.$ownerInstance));
    //调用逻辑层vue的方法
    //this.$ownerInstance.callMethod("test",{data:{}});
    
    //处理完后，可以回调结果给逻辑层
    RecordApp.UniWebViewSendToMain({action:"${cb}", abc:typeof(this.$ownerInstance)});
`);
```

## 【静态方法】RecordApp.UniMainCallBack(callback)
App 逻辑层中生成一个回调，renderjs层通过这个回调返回数据给逻辑层，函数参数为renderjs层返回的数据，数据应当是个对象，错误消息统一用errMsg属性，主要和UniWebViewSendToMain一块搭配使用，请参考上面的UniWebViewEval

## 【静态方法】RecordApp.UniWebViewSendToMain(data)
renderjs层中调用本方法，将数据传回给逻辑层回调，`data={action:"UniMainCallBack等",...需要返回的数据, errMsg:"错误消息"}`，使用请参考上面的UniWebViewEval

## 【静态方法】RecordApp.UniWebViewSendBigBytesToMain(arrayBuffer,True,False)
renderjs层调用本方法，将超过512KB的二进制数据传回逻辑层，一次性发送1MB以上的数据UniApp太卡，传入arrayBuffer，True(dataID), False(errMsg)，成功后可在逻辑层中通过UniMainTakeBigBytes(dataID)来取到数据

## 【静态方法】RecordApp.UniMainTakeBigBytes(dataID)
App 逻辑层取走接收到的二进制数据，返回arrayBuffer，不可重复提取否则返回null

## 【静态方法】RecordApp.UniSaveLocalFile(fileName,buffer,True,False)
App 逻辑层保存文件到本地，提供文件名和arrayBuffer，True(savePath)成功保存后回调完整保存路径，False(errMsg)；保存的文件夹为`plus.io.PUBLIC_DOWNLOADS`

## 【静态方法】RecordApp.UniFindCanvas(componentThis,selectorList,renderjsFunc,mainFunc)
所有平台逻辑层中均可调用，查找用于可视化绘制的canvas实例

> App、H5会在原位置添加新的html canvas节点，并且隐藏老的canvas，原因是uni创建的canvas不可以使用：如果是隐藏的uni-canvas没法初始化，到显示的时候会篡改canvas已设置的宽高，App中uni-canvas显示有问题 似乎设置了缩放 导致显示不全，重新建一个省心还高效

``` javascript
// componentThis:this 当前页面或当前组件this
// selectorList:[".class"] 要查找的canvas列表，提供css选择器，查找得到canvas1 canvas2...
// renderjsFunc:"eval js" App环境下在renderjs中进行绘制时执行的js代码，可以使用结果变量canvas1 canvas2...，代码中的this为renderjs模块的this
// mainFunc:fn(canvas1,canvas2...) 逻辑层中进行绘制时调用函数（H5、小程序等），参数为查找到的canvas

/**调用示例代码，App、H5、小程序通用
假设有以下2个canvas的view，可以一次性查找到这两个canvas，canvas需要指定宽高（下面style里指定了300*100）
<view>
    <canvas type="2d" class="recwave-SurferView" style="width:300px;height:100px"></canvas>
    <canvas type="2d" class="recwave-SurferView-2x" style="width:600px;height:100px;display:none"></canvas>
</view>**/

//App环境下是在renderjs中绘制，H5、小程序等是在逻辑层中绘制，因此需要提供两段相同的代码（宽高值需要和canvas style的宽高一致）
RecordApp.UniFindCanvas(this,[".recwave-SurferView",".recwave-SurferView-2x"],`
    this.surferView=Recorder.WaveSurferView({compatibleCanvas:canvas1,compatibleCanvas_2x:canvas2, width:300, height:100});
`,(canvas1,canvas2)=>{
    this.surferView=Recorder.WaveSurferView({compatibleCanvas:canvas1,compatibleCanvas_2x:canvas2, width:300, height:100});
});
```

## 【静态方法】RecordApp.UniBtoa(arrayBuffer)
base64编码，将arrayBuffer二进制数据转为base64字符串

## 【静态方法】RecordApp.UniAtob(b64)
base64解码，将base64字符串转为arrayBuffer二进制数据

## 【静态方法】RecordApp.UniB64Enc(str)
base64编码，将字符串转为base64字符串

## 【静态方法】RecordApp.UniB64Dec(b64)
base64解码，将base64字符串转为字符串

## 【静态方法】RecordApp.UniStr2Buf(str)
将文本转成arrayBuffer

## 【静态方法】RecordApp.UniBuf2Str(arrayBuffer)
将arrayBuffer转成文本

## 【静态属性】RecordApp.UniJsSource.IsSource
当前`app-uni-support.js`文件是否是源码版，true为源码版，false为压缩版

## 【静态属性】RecordApp.UniWithoutAppRenderjs
仅App环境下设置，在不要使用或没有renderjs时，应当设为true，此时App中RecordApp完全运行在逻辑层，比如nvue页面，此时音频编码之类的操作全部在逻辑层，需要提供UniNativeUtsPlugin配置由原生插件进行录音，可视化绘制依旧可以在renderjs中进行。默认为false，RecordApp将在renderjs中进行实际的工作，然后将处理好的数据传回逻辑层，数据比较大时传输会比较慢（可通过Start时使用takeoffEncodeChunk实时获取音频文件数据可避免Stop时产生超大数据回传）。

## 【静态属性】RecordApp.UniAppUseLicense
仅App环境下设置，`app-uni-support.js`文件在App中使用的授权许可，默认为空字符串，获得授权后请赋值为"我已获得UniAppID=***的商用授权"（星号为你项目的uni-app应用标识），设置了UniNativeUtsPlugin时默认为已授权；如果未授权，将会在App打开后第一次调用`RecordApp.RequestPermission`请求录音权限时，弹出“未获得商用授权时，App上仅供测试”提示框。



## 【静态属性】RecordApp.UniNativeUtsPlugin
仅App环境下设置，App中启用原生录音插件或uts插件，由App提供原生录音，将原生插件或uts插件赋值给这个变量即可开启支持；使用原生录音插件只需赋值为`{nativePlugin:true}`即可（提供`nativePluginName`可指定插件名字，默认为`RecorderNativePlugin`），使用uts插件只需import插件后赋值即可（uts插件开发中，暂不可用）；如果未提供任何插件，App中将使用H5录音（在renderjs中提供H5录音）。

**在App中引入原生录音插件来进行录音，兼容性和体验更好，在iOS上的体现更为明显（请参考上面的录音权限描述）。**

`Recorder-UniCore`组件支持uni-app的`App原生语言插件`和`uts插件`两种类型的插件，两种均为原生插件，功能是相同的；根据你的项目需求选择一种插件使用即可，据uni-app官网来看，目前的趋势更偏向于对uts插件的支持。

### 集成原生录音插件
原生录音插件暂未上架DCloud插件市场，请阅读下面的授权许可章节，联系客服获取到Android的`.aar module 25KB`、iOS的`.a library 200KB`两个文件，和参考demo项目。

1. 项目根目录创建 nativeplugins 目录
2. 复制demo项目 nativeplugins 目录内的插件到你的项目 nativeplugins 目录
3. 配置项目manifest.json，在`App原生插件配置`项下点击`选择本地插件`，把插件勾选上
4. 调试需要先打一个自定义基座，然后使用自定义基座进行调试；打包可以自己进行离线打包，或者提交云端打包

详细请参考uni-app官方文档：[HBuilderX中使用本地插件](https://nativesupport.dcloud.net.cn/NativePlugin/use/use_local_plugin.html)

### 集成uts插件
uts插件还在开发中，暂时不可集成。

### 使用原生插件
``` javascript
var RecNativePlugin=null;
// #ifdef APP
    import * as RecUtsPlugin from "@/uni_modules/Recorder-UtsPlugin" //使用uts插件，如果不用uts插件就删掉这行并加上 var RecUtsPlugin=null
    var RecNativePlugin={//使用原生录音插件，跟uts插件二选一
        nativePlugin:true
        ,nativePluginName:"xxx" //可指定插件名字，默认为RecorderNativePlugin
    };
// #endif
// #ifndef APP
    var RecUtsPlugin=null; //非App，给个变量
// #endif

//在调用RecordApp.RequestPermission之前进行配置，可以判断一下只在iOS上或Android上启用，不判断就都启用，比如判断iOS：RecordApp.UniIsApp()==2
RecordApp.UniNativeUtsPlugin=RecNativePlugin||RecUtsPlugin;
```






[​](?)

[​](?)

[​](?)

[​](?)

# 使用Recorder-UniCore组件的授权许可
**[AD]app-uni-support.js文件在uni-app中编译到App平台时仅供测试用（App平台包括：Android App、iOS App），不可用于正式发布或商用，正式发布或商用需先联系作者获得授权许可**；编译到其他平台时无此授权限制，比如：H5、小程序，均为免费授权。

[​](?)

## 获取商用授权和购买原生录音插件
客服联系方式：QQ 1251654593 ，或者直接联系作者QQ 753610399 （回复可能没有客服及时）。
- 方式一：联系客服加入VIP支持QQ群，入群费用**¥199元**，入群后即获得授权，在群文件中可下载`app-uni-support.js`文件最新源码。
- 方式二：联系客服或到DCloud插件市场购买配套的原生录音插件或uts插件，购买后即获得授权；购买后可联系客服，同时提供订单信息，客服拉你进入VIP支持QQ群。

> 目前uts插件还在开发中不可购买；原生录音插件已开发好，但还未上架到DCloud插件市场，如果需要请联系客服付费购买，原生录音插件价格为：**¥499元**（可买单个平台¥299元，已付费入群可补差价购买），购买后客服会发送Android的`.aar module 25KB`、iOS的`.a library 200KB`两个文件给你，和demo项目供参考，集成到项目的`nativeplugins`目录中，详细使用请参考上面的`RecordApp.UniNativeUtsPlugin`属性文档。

> 注：VIP支持群的主要作用是代表你已获得授权许可，可以随时获得`app-uni-support.js`文件最新版源码；不作为问答或售后群使用，当然如果你有问题也可以直接群里问，花费时间不多的，作者免费顺带就解答了，如果复杂花费比较久时间的，可能要适当收点人工费用，或者选择进行付费指导。
> 
> `Recorder-UniCore`组件中自带的`app-uni-support.js`文件是压缩版，功能和源码版一致，在VIP支持群中下载得到此文件源码后，可以直接替换组件中的这个文件，也可以不替换。


[​](?)

## 解除组件限制
如果未获得授权许可，将会在App打开后第一次调用`RecordApp.RequestPermission`请求录音权限时，弹出“未获得商用授权时，App上仅供测试”提示框。

获得作者的授权许可后，请在调用`RecordApp.RequestPermission`请求录音权限前，赋值`RecordApp.UniAppUseLicense="我已获得UniAppID=***的商用授权"`（星号为你项目的uni-app应用标识），就不会弹提示框了；或者购买了配套的原生录音插件或uts插件，直接设置`RecordApp.UniNativeUtsPlugin`参数，也不会弹提示框。

插件开发维护不易，感谢支持~


[​](?)

## 许可及服务协议

**您（以下称“用户”）下载、使用我（以下称“作者”）提供的Recorder-UniCore组件（含原生录音插件、uts插件，以下统称“本组件”），应当阅读并遵守本许可协议。请用户务必审慎阅读、充分理解各条款内容，特别是免除或者限制责任的条款，并选择接受或不接受。除非用户已阅读并接受本协议所有条款，否则用户无权下载、使用本组件及相关服务，用户的下载、使用等行为即视为用户已阅读并同意本许可协议的约束。**

1. 用户应当直接从作者许可的途径，如作者的GitHub、Gitee仓库、已上架的DCloud插件市场、QQ群等途径中获取本组件；其他途径获取到的组件代码是未经过作者授权的，存在安全隐患，可能会导致你的程序、资产受到侵害，作者对因此给用户造成的损失不予负责。

2. 作者将积极并采取措施保护用户的信息和隐私；组件本身不会搜集存储任何用户信息。

3. 除法律法规有明确规定外，作者将尽最大努力确保本组件及其所涉及的技术及信息安全、有效、准确、可靠，但受限于现有技术，用户理解作者不能对此进行担保。

4. 用户理解，对于不可抗力及第三方原因导致的您的直接或间接损失，作者无法承担责任。

5. 用户因使用本组件进行生成、处理数据，由此引起或与有关的包括但不限于利润损失、资料损失、业务中断的损害赔偿或其它商业损害赔偿或损失，需由用户自行承担。

6. 如若发生赔偿、退款等行为，赔偿、退款等累计金额不得超过用户实际支付给作者的总金额。

7. 已授予的授权许可，包括免费授权，和已购买的原生录音插件、uts插件，均仅限在授权指定的uni-app的应用标识（AppID）对应的项目上使用，不可在其他项目上使用；用户不得对本组件及其中的相关信息擅自出租、出借、销售、逆向工程、破解，不得在未取得作者授权的情况下借助本组件发展与本组件有关联的衍生软件产品、服务、插件、外挂等。

8. 用户不得使用本组件从事违反法律法规政策、破坏公序良俗、损害公共利益的行为。



