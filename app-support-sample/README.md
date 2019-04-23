# :open_book:RecordApp 最大限度的统一兼容PC、Android和IOS

在线测试：[<img src="../.assets/demo-recordapp.png" width="100px">](https://jiebian.life/web/h5/github/recordapp.aspx) https://jiebian.life/web/h5/github/recordapp.aspx

此demo页面为代理页面，受[微信JsSDK](https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421141115)的域名限制，直接在`github.io`上访问将导致`JsSDK`无法调用。

## 仅为兼容IOS而生

据[艾瑞移动设备指数](https://index.iresearch.com.cn/device)2019年4月1-7日上数据：

排名|厂商品牌|占比
:-:|:-:|:-:
1|苹果|22.64%
2|华为|18.61%
3|OPPO|16.03%
4|vivo|14.54%
5|小米|11.58%
6|三星|3.68%


`IOS 12`上`getUserMedia`功能表现特异，如果是都不支持也就无话可说了，但`Safari`又支持，[那是谁的问题](https://forums.developer.apple.com/thread/88052)！但不得不向大厂低头，于是就有了此最大限度的兼容方案；由于有些开发者比较关心此问题，于是就开源了。

当`IOS`那天开始支持`getUserMedia`录音功能时，本兼容方案就可以删除了，H5原生录音一把梭。


## 使用重要前提

本功能并非拿来就能用的，需要对源码进行调整配置，可参考[app-support-sample](../app-support-sample)目录内的配置文件。

使用本功能虽然可以最大限度的兼容`Android`和`IOS`，但使用[app-ios-weixin-support.js](../src/app-support/app-ios-weixin-support.js)需要后端提供支持，如果使用[app-native-support.js](../src/app-support/app-native-support.js)需要App端提供支持，具体情况查看这两个文件内的注释。

如果不能得到上面相应的支持，并且坚决要使用相关功能，那将会很困难。


## 支持功能

- 优先使用`Recorder` H5进行录音，如果浏览器不支持将使用下面选项。
- 默认开启`IOS-Weixin`支持，用于支持IOS的微信上的录音功能，需在[app.js](../src/app-support/app.js)中配置`IOS-Weixin`使用到的两个后端接口。
- 可选手动开启`Native`支持，用于支持IOS上的Hybrid App录音，如需使用需在[app.js](../src/app-support/app.js)中开启`Native`支持选项，并且实现[app-native-support.js](../src/app-support/app-native-support.js)中的`JsBridge`方法调用。


## 限制功能

- `IOS-Weixin`不支持实时回调，因此当在IOS微信上录音时，实时音量反馈、实时波形等功能不会有效果。
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
参考[Recorder](../)中的示例。

