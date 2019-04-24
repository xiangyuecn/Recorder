[Recorder](https://github.com/xiangyuecn/Recorder/) | RecordApp

# :open_book:RecordApp 最大限度的统一兼容PC、Android和IOS

## 在线测试
[<img src="../.assets/demo-recordapp.png" width="100px">](https://jiebian.life/web/h5/github/recordapp.aspx) https://jiebian.life/web/h5/github/recordapp.aspx

此demo页面为代理页面，受[微信JsSDK](https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421141115)的域名限制，直接在`github.io`上访问将导致`JsSDK`无法调用。

## 小程序web-view测试
[<img src="../.assets/jiebian.life-xcx.png" width="100px">](https://jiebian.life/t/a)

1. 在小程序页面内，找任意一个文本输入框，输入`::apitest`，然后点一下别的地方让输入框失去焦点，此时会提示`命令已处理`。
2. 重启小程序，会发现丑陋的控制台已经显示出来了，在控制台命令区域输入`location.href="/web/h5/github/recordapp.aspx"`并运行。
3. 不出意外就进入了上面这个在线测试页面，开始愉快的测试吧。



## 仅为兼容IOS而生

如果忽略`Native`支持，可以说是仅为兼容IOS上的微信而生。

据[艾瑞移动设备指数](https://index.iresearch.com.cn/device)2019年4月1-7日上数据：

排名|厂商品牌|占比
:-:|:-:|:-:
1|苹果|22.64%
2|华为|18.61%
3|OPPO|16.03%
4|vivo|14.54%
5|小米|11.58%
6|三星|3.68%


`IOS 12`上`getUserMedia`功能表现特异，如果是都不支持也就无话可说了，但`Safari`又支持，[那是谁的问题](https://forums.developer.apple.com/thread/88052)！但不得不向大厂低头，于是就有了此最大限度的兼容方案（能兼容一点是一点，枪打微信出头鸟）；由于有些开发者比较关心此问题，于是就开源了。

当`IOS`哪天开始支持`getUserMedia`录音功能时，本兼容方案就可以删除了，H5原生录音一把梭。


> `RecordApp`单纯点来讲就是为了兼容IOS的，使用的复杂性比`Recorder`高了很多，到底用哪个，自己选

支持|[Recorder](https://github.com/xiangyuecn/Recorder/)|RecordApp
-:|:-:|:-:
PC浏览器|√|√
Android浏览器|√|√
Android微信(含小程序)|√|√
Android Hybrid App|√|√
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

- 优先使用`Recorder` H5进行录音，如果浏览器不支持将使用下面选项。
- 默认开启`IOS-Weixin`支持，用于支持IOS的微信`浏览器`、`小程序web-view`的录音功能，需在[app.js](../src/app-support/app.js)中配置`IOS-Weixin`使用到的两个后端接口。
- 可选手动开启`Native`支持，用于支持IOS上的Hybrid App录音，如需使用需在[app.js](../src/app-support/app.js)中开启`Native`支持选项，并且实现[app-native-support.js](../src/app-support/app-native-support.js)中的`JsBridge`方法调用。


## 限制功能

- `IOS-Weixin`不支持实时回调，因此当在IOS微信上录音时，实时音量反馈、实时波形等功能不会有效果；并且微信素材下载接口下载的amr音频音质勉强能听（总比没有好，自行实现时也许可以使用它的高清接口，不过需要服务器端转码）。
- `IOS-Weixin`使用的`微信JsSDK`单次调用录音最长为60秒，底层已屏蔽了这个限制，超时后会立即重启接续录音，因此当在IOS微信上录音时，超过60秒还未停止，将重启录音，中间可能会导致短暂的停顿感觉。
- 如果开启了`Native`支持，并且环境支持App原生录音，`Recorder`对象将不可用，因为不会加载`Recorder`库。



# :open_book:快速使用

本处提供`IOS-Weixin`支持的开启配置，`Native`的由于不确定性太多，请自行查阅源码。

## 【1】加载框架
``` html
<!-- 可选的独立配置文件，提供此文件时无需修改app.js源码，不然需要修改。注意：使用时应该使用自己编写的文件，而不是使用这个参考用的文件 -->
<script src="app-support-sample/ios-weixin-config.js"></script>

<!-- 在需要录音功能的页面引入`app-support/app.js`文件（src内的为源码、dist内的为压缩后的）即可 （**注意：需要在https等安全环境下才能进行录音**） -->
<script src="src/app-support/app.js"></script>
```

## 【2】调用录音
然后使用，假设立即运行，只录3秒
``` javascript
//请求录音权限
RecordApp.RequestPermission(function(){
    RecordApp.Start({},function(){//使用默认配置开始录音，mp3格式
        setTimeout(function(){
            RecordApp.Stop(function(blob,duration){//到达指定条件停止录音
                console.log(URL.createObjectURL(blob),"时长:"+duration+"ms");
                
                //已经拿到blob文件对象想干嘛就干嘛：立即播放、上传
            },function(msg){
                console.log("录音失败:"+msg);
            });
        },3000);
    },function(msg){
        console.log("开始录音失败："+msg);
    });
},function(msg,isUserNotAllow){//用户拒绝未授权或不支持
    console.log((isUserNotAllow?"UserNotAllow，":"")+"无法录音:"+msg);
});


RecordApp.OnProcess=function(pcmData,powerLevel,duration,sampleRate){
    //console.log("PCM实时回调",powerLevel,duration,sampleRate);
};
```

## 【附】录音立即播放、上传示例
参考[Recorder](https://github.com/xiangyuecn/Recorder)中的示例。




# :open_book:方法文档

## 【静态方法】RecordApp.RequestPermission(success,fail)
请求录音权限，如果当前环境不支持录音或用户拒绝将调用错误回调，调用`RecordApp.Start`前需先至少调用一次此方法。

`success`: `fn()` 有权限时回调

`fail`: `fn(errMsg,isUserNotAllow)` 没有权限或者不能录音时回调，如果是用户主动拒绝的录音权限，除了有错误消息外，`isUserNotAllow=true`，方便程序中做不同的提示，提升用户主动授权概率


## 【静态方法】RecordApp.Start(set,success,fail)
开始录音，需先调用`RecordApp.RequestPermission`。

注：开始录音后如果底层支持实时返还数据，将会回调`RecordApp.OnProcess`事件方法，只需要给他赋一个值。

``` javascript
set配置默认值：
{
    type:"mp3"//最佳输出格式，如果底层实现能够支持就应当优先返回此格式
    sampleRate:16000//最佳采样率hz
    bitRate:16//最佳比特率kbps
}
注意：此对象会被修改，因为平台实现时需要把实际使用的值存入此对象

IOS-Weixin底层会把从微信素材下载过来的原始音频信息存储在set.DownWxMediaData中。
```

`success`: `fn()` 打开录音时回调

`fail`: `fn(errMsg)` 开启录音出错时回调


## 【静态方法】RecordApp.Stop(success,fail)
结束录音。

`success`: `fn(blob,duration)`    结束录音时回调，`blob:Blob` 录音数据`audio/mp3|wav...`格式，`duration`: `123` 音频持续时间。

`fail`: `fn(errMsg)` 录音出错时回调


## 【静态方法】RecordApp.Install(success,fail)
对底层平台进行识别和加载相应的类库进行初始化，`RecordApp.RequestPermission`只是对此方法进行了一次封装，并且多了一个权限请求而已。如果你只想完成功能的加载，并不想调起权限请求，可手动调用此方法。此方法可以反复调用。

`success`: `fn()` 初始化成功回调

`fail`: `fn(errMsg)` 初始化失败回调


## 【Event】RecordApp.OnProcess(pcmDatas,powerLevel,duration,sampleRate)
录音实时数据回调，如果底层会实时调用`RecordApp.ReceivePCM`返回数据，就会触发执行此方法，在需回调的地方绑定一个函数即可，注意：新函数会覆盖旧的函数。这个方法和`Recorder.set.onProcess`完全相同。

`pcmDatas`: [[int,int,...]] 当前单声道录音缓冲PCM片段（数组的第一维长度始终为1，是为了和`Recorder`兼容）

`powerLevel`：当前缓冲的音量级别0-100

`bufferDuration`：录音持续总时长

`sampleRate`：缓冲使用的采样率

如果需要绘制波形之类功能，需要实现此方法即可，使用以计算好的`powerLevel`可以实现音量大小的直观展示，使用`pcmDatas`可以达到更高级效果。



## 【静态方法】RecordApp.ReceivePCM(pcmData,powerLevel,duration,sampleRate)
此方法由底层实现来调用，在开始录音后，底层如果能实时返还pcm数据，则会调用此方法。

`pcmData`: `int[]` 当前单声道录音缓冲PCM片段，正常情况下为上次回调本接口开始到现在的录音数据

`powerLevel,duration,sampleRate` 和`RecordApp.OnProcess`参数意义相同


## 【全局方法】window.top.NativeRecordReceivePCM(pcmData,duration,sampleRate)
开启了`Native`支持时，会有这个方法，用于原生App实时返还pcm数据。里面其实是封装了对`RecordApp.ReceivePCM`的调用，参数除了`powerLevel`外和它相同。


## 【静态属性】RecordApp.Current
为`RecordApp.Install`初始化后识别到的底层平台，取值为`RecordApp.Platforms`之一。

## 【静态属性】RecordApp.Platforms
支持的平台列表，目前有三个：
1. `Native`: 原生App平台支持，底层由实际的`JsBridge`提供，此平台默认未开启
2. `IOS-Weixin`: IOS微信`浏览器`、`小程序web-view`支持，底层使用的`微信JsSDK` `+` `Recorder`，此平台默认开启
3. `Default`: H5原生支持，底层使用的`Recorder`，此平台默认开启且不允许关闭



# :open_book:底层平台配置和实现
底层平台为`RecordApp.Platforms`中定义的值。


## 统一实现
每个底层平台都实现了三个方法，`Native`在[app-native-support.js](https://github.com/xiangyuecn/Recorder/blob/master/src/app-support/app-native-support.js)中实现了（其实是空的函数，需要自己来写），`IOS-Weixin`在[app-ios-weixin-support.js](https://github.com/xiangyuecn/Recorder/blob/master/src/app-support/app-ios-weixin-support.js)中实现了，`Default`在[app.js](https://github.com/xiangyuecn/Recorder/blob/master/src/app-support/app.js)中实现了。

### platform.RequestPermission(success,fail)
本底层具体的权限请求实现，参数和`RecordApp.RequestPermission`相同。

### platform.Start(set,success,fail)
本底层具体的开始录音实现，参数和`RecordApp.Start`相同。

### platform.Stop(success,fail)
本底层具体的开始录音实现。

`success`: `fn(obj)` 结束录音时回调返回数据
``` javascript
    obj={
        mime:"audio/mp3" //录音数据格式，注意：不一定要和start传入的set.type相同，可能为其他值
        ,duration:123 //音频持续时间
        ,data:"base64" //音频数据，base64编码后的纯文本格式
    }
```

`fail`: `fn(errMsg)` 录音失败回调


## 配置
每个底层平台都有一个`platform.Config`配置，这个配置是根据平台的需要什么我们这里面就要给什么。另外还有一个全局配置`RecordAppBaseFolder`。

### 【全局变量】window.RecordAppBaseFolder
文件基础目录，用来定位加载类库，此目录可以是`/src/`或者`/dist/`，目录内应该包含`recorder-core.js、engine`等。实际取值需自行根据自己的网站目录调整，或者加载`app.js`前，设置此全局变量。

### 【Event】window.OnRecordAppInstalled()
可提供一个回调函数用来配置`RecordApp`，在`app.js`内代码执行完毕时回调，免得`RecordAppBaseFolder`要在`app.js`之前定义，其他配置又要在之后定义的麻烦。使用可以参考[app-support-sample/ios-weixin-config.js](https://github.com/xiangyuecn/Recorder/blob/master/app-support-sample/ios-weixin-config.js)配置。

### 【配置】RecordApp.Platforms.Native.Config
需要自行实现`Native`的三个统一方法，具体实现的时候才知道需要什么实际的配置。

### 【配置】RecordApp.Platforms.Default.Config
无需手动配置。

### 【配置】RecordApp.Platforms.Weixin(IOS-Weixin).Config
可以参考[app-support-sample/ios-weixin-config.js](https://github.com/xiangyuecn/Recorder/blob/master/app-support-sample/ios-weixin-config.js)中的演示有效的配置。

需提供`WxReady`、`DownWxMedia`方法，具体情况请查阅[src/app-support/app.js](https://github.com/xiangyuecn/Recorder/blob/master/src/app-support/app.js)内有详细的说明。

- `WxReady`: 对使用到的[微信JsSDK进行签名](https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421141115)，至少要包含`startRecord,stopRecord,onVoiceRecordEnd,uploadVoice`接口。签名操作需要后端支持。
- `DownWxMedia`: 对[微信录音素材进行下载](https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1444738727)，下载操作需要后端支持。

以上两个方法都是公众(订阅)号开发范畴，需要注册开通相应的微信服务账号。



# :open_book:关于RecordApp
[2018]由于微信IOS上不支持原生JS录音，Android上又支持，为了兼容而去兼容的事情我是拒绝的（而且是仅仅为了兼容IOS上面的微信），其实也算不上去兼容，因为微信JsSDK中的接口完全算是另外一种东西，接入的话对整个录音流程都会产生完全不一样的变化，还不如没有进入录音流程之前就进行分支判断处理。

[2019]大动干戈，仅为兼容IOS而生，不得不向大厂低头，我还是为兼容而去兼容了IOS微信，对不支持录音的IOS微信`浏览器`、`小程序web-view`进行了兼容，使用微信JsSDK来录音，并以前未开源的兼容代码基础上重写了`RecordApp`，源码在`app-support-sample`、`src/app-support`内。

最后：如果要兼容IOS，可以自行接入JsSDK或使用`RecordApp`（没有公众号开个订阅号又不要钱），基本上可以忽略兼容性问题，就是麻烦点。


# :star:捐赠
如果这个库有帮助到您，请 Star 一下。

你也可以选择使用支付宝或微信给我捐赠：

![](../.assets/donate-alipay.png)  ![](../.assets/donate-weixin.png)