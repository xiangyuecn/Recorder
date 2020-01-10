[Recorder](https://github.com/xiangyuecn/Recorder/) | RecordApp

  <a title="Stars" href="https://github.com/xiangyuecn/Recorder"><img src="https://img.shields.io/github/stars/xiangyuecn/Recorder?color=0b1&logo=github" alt="Stars"></a>
  <a title="Forks" href="https://github.com/xiangyuecn/Recorder"><img src="https://img.shields.io/github/forks/xiangyuecn/Recorder?color=0b1&logo=github" alt="Forks"></a>
  <a title="npm Version" href="https://www.npmjs.com/package/recorder-core"><img src="https://img.shields.io/npm/v/recorder-core?color=f60&logo=npm" alt="npm Version"></a>
  <a title="npm Downloads" href="https://www.npmjs.com/package/recorder-core"><img src="https://img.shields.io/npm/dt/recorder-core?color=f60&logo=npm" alt="npm Downloads"></a>
  <a title="cnpm" href="https://npm.taobao.org/package/recorder-core"><img src="https://img.shields.io/badge/cnpm-available-0b1" alt="cnpm"></a>
  <a title="License" href="https://github.com/xiangyuecn/Recorder/blob/master/LICENSE"><img src="https://img.shields.io/github/license/xiangyuecn/Recorder?color=0b1&logo=github" alt="License"></a>


# :open_book:RecordApp 最大限度的统一兼容PC、Android和IOS

[在线测试](https://jiebian.life/web/h5/github/recordapp.aspx)，`RecordApp`源码在[/src/app-support](https://github.com/xiangyuecn/Recorder/tree/master/src/app-support)目录，当前`/app-support-sample`目录为参考配置的演示目录。`RecordApp`由`Recorder`提供基础支持，所以`Recorder`的源码也是属于`RecordApp`的一部分。

## 【IOS】Hybrid App测试

[demo_ios](https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/demo_ios)目录内包含IOS App测试源码，和核心文件 [RecordAppJsBridge.swift](https://github.com/xiangyuecn/Recorder/blob/master/app-support-sample/demo_ios/recorder/RecordAppJsBridge.swift) ，详细的原生实现、权限配置等请阅读这个目录内的README；clone后用`xcode`打开后编译运行（没有Mac OS? [装个黑苹果](https://www.jianshu.com/p/cbde4ec9f742) ）。本demo为swift代码，兼容IOS 9.0+，已测试IOS 12.3。

**xcode测试项目clone后请修改`PRODUCT_BUNDLE_IDENTIFIER`，不然这个测试id被抢来抢去要闲置7天才能被使用，嫌弃苹果公司工程师水准**


## 【Android】Hybrid App测试

[demo_android](https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/demo_android)目录内包含Android App测试源码，和核心文件 [RecordAppJsBridge.java](https://github.com/xiangyuecn/Recorder/blob/master/app-support-sample/demo_android/app/src/main/java/com/github/xianyuecn/recorder/RecordAppJsBridge.java) ，详细的原生实现、权限配置等请阅读这个目录内的README；目录内 [app-debug.apk.zip](https://xiangyuecn.github.io/Recorder/app-support-sample/demo_android/app-debug.apk.zip) 为打包好的debug包（40kb，删掉.zip后缀），或者clone后自行用`Android Studio`编译打包。本demo为java代码，兼容API Level 15+，已测试Android 9.0。

## 【IOS微信】H5测试
[<img src="https://gitee.com/xiangyuecn/Recorder/raw/master/assets/demo-recordapp.png" width="100px">](https://jiebian.life/web/h5/github/recordapp.aspx) https://jiebian.life/web/h5/github/recordapp.aspx

此demo页面为代理页面（[源](https://xiangyuecn.github.io/Recorder/app-support-sample/)），受[微信JsSDK](https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421141115)的域名限制，直接在`github.io`上访问将导致`JsSDK`无法调用。

## 【IOS微信】小程序WebView测试
[<img src="https://gitee.com/xiangyuecn/Recorder/raw/master/assets/jiebian.life-xcx.png" width="100px">](https://jiebian.life/t/a)

1. 在小程序页面内，找任意一个文本输入框，输入`::apitest`，然后点一下别的地方让输入框失去焦点，此时会提示`命令已处理`。
2. 重启小程序，会发现丑陋的控制台已经显示出来了，在控制台命令区域输入`location.href="/web/h5/github/recordapp.aspx"`并运行。
3. 不出意外就进入了上面这个在线测试页面，开始愉快的测试吧。

> Android微信H5、WebView支持录音，无需特殊兼容，因此上面特意针对IOS微信。




# :open_book:快速使用

## 【1】加载框架

**方式一**：使用script标签引入

``` html
<!-- 可选的独立配置文件，提供这些文件时可免去修改app.js源码。
    【注意】：使用时应该使用自己编写的文件，而不是直接使用这个参考用的文件 -->
<!-- 可选开启native支持的相关配置 -->
<script src="app-support-sample/native-config.js"></script>
<!-- 可选开启ios weixin支持的相关配置 -->
<script src="app-support-sample/ios-weixin-config.js"></script>

<!-- 在需要录音功能的页面引入`app-support/app.js`文件（src内的为源码、dist内的为压缩后的）即可。
    app.js会自动加载实现文件、Recorder核心、编码引擎，应确保app.js内BaseFolder目录的正确性(参阅RecordAppBaseFolder)。
    （如何避免自动加载：使用时可以把所有支持文件全部手动引入，或者压缩时可以把所有支持文件压缩到一起，会检测到组件已加载，就不会再进行自动加载；会自动默认加载哪些文件，请查阅app.js内所有Platform的paths配置）
    （**注意：需要在https等安全环境下才能进行录音**） -->
<script src="src/app-support/app.js"></script>
```

**方式二**：通过import/require引入

通过npm进行安装 `npm install recorder-core` ，如果直接clone的源码下面文件路径调整一下即可 [​](?Ref=ImportCode&Start)
``` javascript
/********先加载RecordApp需要用到的支持文件*********/
//必须引入的app核心文件，换成require也是一样的。注意：app.js会自动往window下挂载名称为RecordApp对象，全局可调用window.RecordApp，也许可自行调整相关源码清除全局污染
import RecordApp from 'recorder-core/src/app-support/app'
//可选开启Native支持，需要引入此文件
import 'recorder-core/src/app-support/app-native-support'
//可选开启IOS上微信录音支持，需要引入此文件
import 'recorder-core/src/app-support/app-ios-weixin-support'

//这里放置可选的独立配置文件，提供这些文件时可免去修改app.js源码。这些配置文件需要自己编写，参考https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample 目录内的这两个测试用的配置文件代码。
        //import '你的配置文件目录/native-config.js' //可选开启native支持的相关配置
        //import '你的配置文件目录/ios-weixin-config.js' //可选开启ios weixin支持的相关配置

/*********然后加载Recorder需要的文件***********/
//必须引入的核心。所有文件都需要自行引入，否则app.js会尝试用script来请求需要的这些文件，进而导致错误，引入后会检测到组件已自动加载，就不会去请求了
import 'recorder-core'

//需要使用到的音频格式编码引擎的js文件统统加载进来
import 'recorder-core/src/engine/mp3'
import 'recorder-core/src/engine/mp3-engine'

//由于大部分情况下ios-weixin的支持需要用到amr解码器，应当把amr引擎也加载进来
import 'recorder-core/src/engine/beta-amr'
import 'recorder-core/src/engine/beta-amr-engine'

//可选的扩展支持项
import 'recorder-core/src/extensions/waveview'
```
[​](?RefEnd)

## 【2】调用录音
[​](?Ref=Codes&Start)然后使用，假设立即运行，只录3秒，会自动根据环境使用Native录音、微信JsSDK录音、H5录音
``` javascript
//var dialog=createDelayDialog(); 开启可选的弹框伪代码，需先于权限请求前执行，因为回调不确定是同步还是异步的
//请求录音权限
RecordApp.RequestPermission(function(){
    //dialog&&dialog.Cancel(); 如果开启了弹框，此处需要取消
    
    RecordApp.Start({
        type:"mp3",sampleRate:16000,bitRate:16 //mp3格式，指定采样率hz、比特率kbps，其他参数使用默认配置；注意：是数字的参数必须提供数字，不要用字符串；需要使用的type类型，需提前把支持文件到Platforms.Default内注册
        ,onProcess:function(buffers,powerLevel,bufferDuration,bufferSampleRate,newBufferIdx,asyncEnd){
            //如果当前环境支持实时回调（RecordApp.Current.CanProcess()），收到录音数据时就会实时调用本回调方法
            //可利用extensions/waveview.js扩展实时绘制波形
            //可利用extensions/sonic.js扩展实时变速变调，此扩展计算量巨大，onProcess需要返回true开启异步模式
        }
    },function(){
        setTimeout(function(){
            RecordApp.Stop(function(blob,duration){//到达指定条件停止录音和清理资源
                console.log(blob,(window.URL||webkitURL).createObjectURL(blob),"时长:"+duration+"ms");
                
                //已经拿到blob文件对象想干嘛就干嘛：立即播放、上传
            },function(msg){
                console.log("录音失败:"+msg);
            });
        },3000);
    },function(msg){
        console.log("开始录音失败："+msg);
    });
},function(msg,isUserNotAllow){//用户拒绝未授权或不支持
    //dialog&&dialog.Cancel(); 如果开启了弹框，此处需要取消
    
    console.log((isUserNotAllow?"UserNotAllow，":"")+"无法录音:"+msg);
});


//我们可以选择性的弹一个对话框：为了防止当移动端浏览器使用Recorder H5录音时存在第三种情况：用户忽略，并且（或者国产系统UC系）浏览器没有任何回调
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
```
[​](?RefEnd)

## 【附】录音立即播放、上传示例
参考[Recorder](https://github.com/xiangyuecn/Recorder)中的示例。


## 【QQ群】交流与支持

欢迎加QQ群：781036591，纯小写口令：`recorder`

<img src="https://gitee.com/xiangyuecn/Recorder/raw/master/assets/qq_group_781036591.png" width="220px">


## 【截图】运行效果图

<img src="https://gitee.com/xiangyuecn/Recorder/raw/master/assets/use_native_ios.gif" width="360px"> <img src="https://gitee.com/xiangyuecn/Recorder/raw/master/assets/use_native_android.gif" width="360px">





# :open_book:仅为兼容IOS而生

由于IOS上除了`Safari`可以H5录音外，[其他浏览器、WebView](https://forums.developer.apple.com/thread/88052)均不能进行H5录音，Android和PC上情况好很多；可以说是仅为兼容IOS上的微信而生。

据[艾瑞移动设备指数](https://index.iresearch.com.cn/device)2019年7月29日数据：苹果占比`23.29%`位居第一，华为以`19.74%`排名第二。不得不向大厂低头，于是就有了此最大限度的兼容方案；由于有些开发者比较关心此问题，于是就开源了。

当`IOS`哪天开始全面支持`getUserMedia`录音功能时，本兼容方案就可以删除了，H5原生录音一把梭。


> `RecordApp`单纯点来讲就是为了兼容IOS的，使用的复杂性比`Recorder`高了很多，到底用哪个，自己选

支持|[Recorder](https://github.com/xiangyuecn/Recorder/)|RecordApp
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


## 使用重要前提

本功能并非拿来就能用的，需要对源码进行调整配置，可参考[app-support-sample](../app-support-sample)目录内的配置文件。

使用本功能虽然可以最大限度的兼容`Android`和`IOS`，但使用[app-ios-weixin-support.js](../src/app-support/app-ios-weixin-support.js)需要后端提供支持，如果使用[app-native-support.js](../src/app-support/app-native-support.js)需要App端提供支持，具体情况查看这两个文件内的注释。

如果不能得到上面相应的支持，并且坚决要使用相关功能，那将会很困难。


## 支持功能

- 会自动加载`Recorder`，因此`Recorder`支持的功能，`RecordApp`基本上都能支持，包括语音通话聊天。
- 优先使用`Recorder` H5进行录音，如果浏览器不支持将使用`IOS-Weixin`选项。
- 默认开启`IOS-Weixin`支持，用于支持IOS中微信`H5`、`小程序WebView`的录音功能，参考[ios-weixin-config.js](ios-weixin-config.js)接入配置。
- 可选手动开启`Native`支持，用于支持IOS、Android上的Hybrid App录音，默认未开启支持，参考[native-config.js](native-config.js)开启`Native`支持配置，实现自己App的`JsBridge`接口调用；本方式优先级最高。


## 限制功能

- `IOS-Weixin`不支持实时回调，因此当在IOS微信上录音时，实时音量反馈、实时波形、实时转码等功能不会有效果；并且微信素材下载接口下载的amr音频音质勉强能听（总比没有好，自行实现时也许可以使用它的高清接口，不过需要服务器端转码）。
- `IOS-Weixin`使用的`微信JsSDK`单次调用录音最长为60秒，底层已屏蔽了这个限制，超时后会立即重启接续录音，因此当在IOS微信上录音时，超过60秒还未停止，将重启录音，中间可能会导致短暂的停顿感觉。
- `demo_ios`中swift代码使用的`AVAudioRecorder`来录音，由于录音数据是通过这个对象写入文件来获取的，可能是因为存在文件写入缓存的原因，数据并非实时的flush到文件的，因此实时发送给js的数据存在300ms左右的滞后；`AudioQueue`、`AudioUnit`之类的更强大的工具文章又少，代码又多，本质上是因为不会用，所以就成这样了。
- `Android WebView`本身是支持录音的(古董版本就算啦)，仅需处理网页授权即可，但Android里面使用网页的录音权限问题可能比原生的权限机制要复杂，为了简化js端的复杂性（出问题了好甩锅），不管是Android还是IOS都实现一下可能会简单很多；另外Android和IOS的音频编码并非易事，且不易更新，使用js编码引擎大大简化App的逻辑；因此就有了Android版的Hybrid App Demo。



# :open_book:方法文档

## 【静态方法】RecordApp.RequestPermission(success,fail)
请求录音权限，如果当前环境不支持录音或用户拒绝将调用错误回调；调用`RecordApp.Start`前需先至少调用一次此方法，用于准备好必要的环境；请求权限后如果不使用了，不管有没有调用`Start`，至少要调用一次`Stop`来清理可能持有的资源。

主要用于在`Start`前让用户授予权限，因为未获得权限时可能会弹出授权弹框让用户好去处理；App和大部分浏览器只需授权一次，后续就不会再弹框了；因为`Start`中已隐式包含了授权请求逻辑，对于少部分每次都会弹授权请求的浏览器，不调用本方法也能获得权限。

`success`: `fn()` 有权限时回调

`fail`: `fn(errMsg,isUserNotAllow)` 没有权限或者不能录音时回调，如果是用户主动拒绝的录音权限，除了有错误消息外，`isUserNotAllow=true`，方便程序中做不同的提示，提升用户主动授权概率


## 【静态方法】RecordApp.Start(set,success,fail)
开始录音，需先调用`RecordApp.RequestPermission`。

注：开始录音后如果底层支持实时返回PCM数据，将会回调`set.onProcess`事件方法，并非所有平台都支持实时回调，可以通过`RecordApp.Current.CanProcess()`方法来检测。

``` javascript
set配置默认值：
{
    type:"mp3"//最佳输出格式，如果底层实现能够支持就应当优先返回此格式
    sampleRate:16000//最佳采样率hz
    bitRate:16//最佳比特率kbps
    
    onProcess:NOOP//如果当前环境支持实时回调（RecordApp.Current.CanProcess()），接收到录音数据时的回调函数：fn(buffers,powerLevel,bufferDuration,bufferSampleRate,newBufferIdx,asyncEnd)，此回调和Recorder的回调行为完全一致
}
注意：此对象会被修改，因为平台实现时需要把实际使用的值存入此对象

IOS-Weixin底层会把从微信素材下载过来的原始音频信息存储在set.DownWxMediaData中。
```

`success`: `fn()` 打开录音时回调

`fail`: `fn(errMsg)` 开启录音出错时回调


## 【静态方法】RecordApp.Stop(success,fail)
结束录音和清理资源。

`success`: `fn(blob,duration)`    结束录音时回调，`blob:Blob` 录音数据`audio/mp3|wav...`格式，`duration`: `123` 音频持续时间。

`fail`: `fn(errMsg)` 录音出错时回调

如果不提供success参数=null时，将不会进行音频编码操作，只进行清理完可能持有的资源后走fail回调。


## 【静态方法】RecordApp.Install(success,fail)
对底层平台进行识别和加载相应的类库进行初始化，`RecordApp.RequestPermission`只是对此方法进行了一次封装，并且多了一个权限请求而已。如果你只想完成功能的加载，并不想调起权限请求，可手动调用此方法。此方法可以反复调用。

`success`: `fn()` 初始化成功回调

`fail`: `fn(errMsg)` 初始化失败回调




## 【全局方法】window.top.NativeRecordReceivePCM(pcmDataBase64,sampleRate)
开启了`Native`支持时，会有这个方法，用于原生App实时返回pcm数据。

此方法由Native Platform底层实现来调用，在开始录音后，需调用此方法传递数据给js。

`pcmDataBase64`: `Int16[] Base64` 当前单声道录音缓冲PCM片段Base64编码，正常情况下为上次回调本接口开始到现在的录音数据

`sampleRate` 缓冲PCM的采样率



## 【静态属性】RecordApp.Current
为`RecordApp.Install`初始化后识别到的底层平台，取值为`RecordApp.Platforms`之一。

## 【静态方法】RecordApp.Current.CanProcess()
识别的底层平台是否支持实时返回PCM数据，如果返回值为true，`set.onProcess`将可以被实时回调。

## 【静态方法】RecordApp.GetStartUsedRecOrNull()
获取底层平台录音过程中会使用用来处理实时数据的Recorder对象实例rec，如果底层录音过程中不实用Recorder进行数据的实时处理，将返回null。除了微信平台外，其他平台均会返回rec，但Start调用前和Stop调用后均会返回null，只有Start后和Stop彻底完成前之间才会返回rec。

rec中的方法不一定都能使用，主要用来获取内部缓冲用的，比如：实时清理缓冲，当缓冲被清理，Stop时永远会走fail回调。

## 【静态属性】RecordApp.Platforms
支持的平台列表，目前有三个：
1. `Native`: 原生App平台支持，底层由实际的`JsBridge`提供，此平台默认未开启
2. `IOS-Weixin`: IOS微信`浏览器`、`小程序web-view`支持，底层使用的`微信JsSDK` `+` `Recorder`，此平台默认开启
3. `Default`: H5原生支持，底层使用的`Recorder H5`，此平台默认开启且不允许关闭



# :open_book:底层平台配置和实现
底层平台为`RecordApp.Platforms`中定义的值。


## 统一实现
每个底层平台都实现了三个方法，`Native`在[app-native-support.js](https://github.com/xiangyuecn/Recorder/blob/master/src/app-support/app-native-support.js)中实现了，`IOS-Weixin`在[app-ios-weixin-support.js](https://github.com/xiangyuecn/Recorder/blob/master/src/app-support/app-ios-weixin-support.js)中实现了，`Default`在[app.js](https://github.com/xiangyuecn/Recorder/blob/master/src/app-support/app.js)中实现了。

### platform.RequestPermission(success,fail)
本底层具体的权限请求实现，参数和`RecordApp.RequestPermission`相同。

### platform.Start(set,success,fail)
本底层具体的开始录音实现，参数和`RecordApp.Start`相同。

### platform.Stop(success,fail)
本底层具体的开始录音实现，参数和`RecordApp.Stop`相同。


## 配置
每个底层平台都有一个`platform.Config`配置，这个配置是根据平台的需要什么我们这里面就要给什么；每个`platform.Config`内都有一个`paths`数组，里面包含了此平台初始化时需要加载的相关的实现文件、Recorder核心、编码引擎，可修改这些数组加载自己需要的格式编码引擎。另外还有一个全局配置`RecordAppBaseFolder`。

### 【全局变量】window.RecordAppBaseFolder
文件基础目录`BaseFolder`，用来定位加载类库，此目录可以是`/src/`或者`/dist/`，目录内应该包含`recorder-core.js、engine`等。实际取值需自行根据自己的网站目录调整，或者加载`app.js`前，设置此全局变量。

### 【Event】window.OnRecordAppInstalled()
可提供一个回调函数用来配置`RecordApp`，在`app.js`内代码执行完毕时回调，免得`RecordAppBaseFolder`要在`app.js`之前定义，其他配置又要在之后定义的麻烦。使用可以参考[app-support-sample/ios-weixin-config.js](https://github.com/xiangyuecn/Recorder/blob/master/app-support-sample/ios-weixin-config.js)配置。


### 【配置】RecordApp.Platforms.Default.Config
无需手动配置。


### 【配置】RecordApp.Platforms.Native.Config
可以参考[app-support-sample/native-config.js](https://github.com/xiangyuecn/Recorder/blob/master/app-support-sample/native-config.js)中的演示有效的配置。

需提供`IsApp`、`JsBridgeRequestPermission`、`JsBridgeStart`、`JsBridgeStop`方法，具体情况请查阅[src/app-support/app.js](https://github.com/xiangyuecn/Recorder/blob/master/src/app-support/app.js)内有详细的说明。


### 【配置】RecordApp.Platforms.Weixin(IOS-Weixin).Config
可以参考[app-support-sample/ios-weixin-config.js](https://github.com/xiangyuecn/Recorder/blob/master/app-support-sample/ios-weixin-config.js)中的演示有效的配置。

需提供`WxReady`、`DownWxMedia`方法，具体情况请查阅[src/app-support/app.js](https://github.com/xiangyuecn/Recorder/blob/master/src/app-support/app.js)内有详细的说明。

- `WxReady`: 对使用到的[微信JsSDK进行签名](https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421141115)，至少要包含`startRecord,stopRecord,onVoiceRecordEnd,uploadVoice`接口。签名操作需要后端支持。
- `DownWxMedia`: 对[微信录音素材进行下载](https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1444738727)，下载操作需要后端支持。

以上两个方法都是公众(订阅)号开发范畴，需要注册开通相应的微信服务账号。



# :star:捐赠
如果这个库有帮助到您，请 Star 一下。

您也可以使用支付宝或微信打赏作者：

![](https://gitee.com/xiangyuecn/Recorder/raw/master/assets/donate-alipay.png)  ![](https://gitee.com/xiangyuecn/Recorder/raw/master/assets/donate-weixin.png)