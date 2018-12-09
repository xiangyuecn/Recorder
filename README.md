# Recorder用于html5录音
支持大部分已实现`getUserMedia`的浏览器，包括腾讯X5内核(QQ、微信)，演示地址：https://xiangyuecn.github.io/Recorder/

录音默认输出mp3格式，另外可选wav格式（此格式录音文件超大）；有限支持ogg(bate)、webm(bate)格式；支持任意格式扩展（前提有相应编码器）。

mp3默认16kbps的比特率，2kb每秒的录音大小，音质还可以（如果使用8kbps可达到1kb每秒，不过音质太渣）。

mp3使用lamejs编码，压缩后的recorder.mp3.min.js文件150kb左右。如果对录音文件大小没有特别要求，可以仅仅使用录音核心+wav编码器，源码不足300行，压缩后的recorder.wav.min.js不足4kb。

[浏览器兼容性](https://developer.mozilla.org/en-US/docs/Web/HTML/Supported_media_formats)mp3最好，wav还行，其他要么不支持播放，要么不支持编码。

# 已知问题
*2018-07-22* [mozilla](https://developer.mozilla.org/zh-CN/docs/Web/API/MediaDevices/getUserMedia) 和 [caniuse](https://caniuse.com/#search=getUserMedia) 注明的IOS 11以上Safari是支持调用getUserMedia的，但有用户反馈苹果手机IOS11 Safari和微信都不能录音，演示页面内两个关键指标：获取getUserMedia都是返回false（没有苹果手机未能复现）。但经测试桌面版Safari能获取到getUserMedia。原因不明。

*2018-09-19* [caniuse](https://caniuse.com/#search=getUserMedia) 注明IOS 12 Safari支持调用getUserMedia，经用户测试反馈IOS 12上chrome、UC都无法获取到，部分IOS 12 Safari可以获取到并且能正常录音，但部分不行，原因未知，参考[ios 12 支不支持录音了](https://www.v2ex.com/t/490695)

*2018-12-06* **【已修复】** [issues#1](https://github.com/xiangyuecn/Recorder/issues/1)不同OS上低码率mp3有可能无声，测试发现问题出在lamejs编码器有问题，此编码器本来就是精简版的，可能有地方魔改坏了，用lame测试没有这种问题。已对lamejs源码进行了改动，已通过基础测试，此问题未再次出现。

# 快速使用
在需要录音功能的页面引入压缩好的recorder.***.min.js文件即可，**对于https的要求不做解释**
``` html
<script src="recorder.mp3.min.js"></script>
```
或者直接使用源码，可以引用src目录中的recorder-core.js+相应类型的实现文件，比如要mp3录音：
``` html
<script src="src/recorder-core.js"></script> <!--必须引入的录音核心-->
<script src="src/engine/mp3.js"></script> <!--相应格式支持文件-->
<script src="src/engine/mp3-engine.js"></script> <!--如果此格式有额外的编码引擎的话，也要加上-->
```

然后使用，假设立即运行，只录3秒
``` javascript
var rec=Recorder();
rec.open(function(){//打开麦克风授权获得相关资源
	rec.start();//开始录音
	
	setTimeout(function(){
		rec.stop(function(blob){//到达指定条件停止录音，拿到blob对象想干嘛就干嘛：立即播放、上传
			console.log(URL.createObjectURL(blob));
			rec.close();//释放录音资源
		},function(msg){
			console.log("录音失败:"+msg);
		});
	},3000);
},function(msg){//未授权或不支持
	console.log("无法录音:"+msg);
});
```


# 方法文档

### rec=Recorder(set)

拿到`Recorder`的实例，然后可以进行请求获取麦克风权限和录音。

`set`参数为配置对象，默认配置值如下：
``` javascript
set={
	type:"mp3" //输出类型：mp3,wav等，使用一个类型前需要先引入对应的编码引擎
	,bitRate:16 //比特率 wav:16或8位，MP3：8kbps 1k/s，16kbps 2k/s 录音文件很小
	
	,sampleRate:16000 //采样率，wav格式大小=sampleRate*时间；mp3此项对低比特率有影响，高比特率几乎无影响。
				//wav任意值，mp3取值范围：48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000
	
	,bufferSize:8192 //AudioContext缓冲大小
					//取值256, 512, 1024, 2048, 4096, 8192, or 16384，会影响onProcess调用速度
	
	,onProcess:NOOP //接收到录音数据时的回调函数：fn(buffer,powerLevel,bufferDuration) 
				//buffer=[缓冲数据,...]，powerLevel：当前缓冲的音量级别0-100，bufferDuration：已缓冲时长
				//如果需要绘制波形之类功能，需要实现此方法即可，使用以计算好的powerLevel可以实现音量大小的直观展示，使用buffer可以达到更高级效果
}
```

### rec.open(success,fail)
请求打开录音资源，如果用户拒绝麦克风权限将会调用`fail`，打开后需要调用`close`。

注意：此方法是异步的；一般使用时打开，用完立即关闭；可重复调用，可用来测试是否能录音。

`success`=fn();

`fail`=fn(errMsg);


### rec.close(success)
关闭释放录音资源，释放完成后会调用`success()`回调

### rec.start()
开始录音，需先调用`open`；如果不支持、错误，不会有任何提示，因为stop时自然能得到错误。

### rec.stop(success,fail)
结束录音并返回录音数据`blob对象`，拿到blob对象就可以为所欲为了，不限于立即播放、上传

`success(blob,duration)`：`blob`：录音数据audio/mp3|wav格式，`duration`：录音时长，单位毫秒

`fail(errMsg)`：录音出错回调

提示：stop时会进行音频编码，音频编码可能会很慢，10几秒录音花费2秒左右算是正常，编码并未使用Worker方案(文件多)，内部采取的是分段编码+setTimeout来处理，界面卡顿不明显。


### rec.pause()
暂停录音。

### rec.resume()
恢复继续录音。

### Recorder.IsOpen()
由于Recorder持有的录音资源是全局唯一的，可通过此方法检测是否有Recorder已调用过open打开了录音功能。

### Recorder.lamejs
lamejs的引用


# 压缩合并一个自己需要的js文件
可参考/src/package-build.js中如何合并的一个文件，比如mp3是由`recorder-core.js`,`engine/mp3.js`,`engine/mp3-engine.js`组成的。

除了`recorder-core.js`其他引擎文件都是可选的，可以把全部编码格式合到一起也，也可以只合并几种，然后就可以支持相应格式的录音了。

可以修改/src/package-build.js后，在src目录内执行压缩：
``` javascript
cnpm install
npm start
```

# 关于现有编码器
如果你有其他格式的编码器并且想贡献出来，可以提交新增格式文件的pull（文件放到/src/engine中），我们升级它。

## wav
wav格式编码器时参考网上资料写的，会发现代码和别人家的差不多。

## mp3
采用的是[lamejs](https://github.com/zhuker/lamejs)这个库的代码，`https://github.com/zhuker/lamejs/blob/bfb7f6c6d7877e0fe1ad9e72697a871676119a0e/lame.all.js`这个版本的文件代码；已对lamejs源码进行了部分改动，用于修复发现的问题。

## ogg
还未实现。

## webm
还未实现。


# 兼容性
对于支持录音的浏览器能够正常录音并返回录音数据；对于不支持的浏览器，引入js和执行相关方法都不会产生异常，并且进入相关的fail回调。一般在open的时候就能检测到是否支持或者被用户拒绝，可在用户开始录音之前提示浏览器不支持录音或授权。


# 其他音频格式支持办法
``` javascript
//直接在源码中增加代码，比如增加aac格式支持 (可参考/src/engine/mp3.js实现)

RecorderFn.prototype.aac=function(pcmData,successCall,failCall){
	//通过aac编码器把pcm数据转成aac格式数据，通过this.set拿到传入的配置数据
	... pcmData->aacData
	
	//返回数据
	successCall(new Blob(aacData,{type:"audio/aac"}));
}

//调用
Recorder({type:"aac"})
```