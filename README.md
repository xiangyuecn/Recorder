# Recorder用于html5录音

**演示地址：https://xiangyuecn.github.io/Recorder/**

支持大部分已实现`getUserMedia`的浏览器，包括腾讯Android X5内核(QQ、微信)。

录音默认输出mp3格式，另外可选wav格式（此格式录音文件超大）；有限支持ogg(beta)、webm(beta)格式；支持任意格式扩展（前提有相应编码器）。

mp3默认16kbps的比特率，2kb每秒的录音大小，音质还可以（如果使用8kbps可达到1kb每秒，不过音质太渣）。

mp3使用lamejs编码，压缩后的recorder.mp3.min.js文件150kb左右（开启gzip后54kb）。如果对录音文件大小没有特别要求，可以仅仅使用录音核心+wav编码器，源码不足300行，压缩后的recorder.wav.min.js不足4kb。

[浏览器兼容性](https://developer.mozilla.org/en-US/docs/Web/HTML/Supported_media_formats#Browser_compatibility)mp3最好，wav还行，其他要么不支持播放，要么不支持编码。

IOS(11?、12?)上只有Safari支持getUserMedia，[其他就呵呵了，WKWebView(UIWebView?)相关资料](https://forums.developer.apple.com/thread/88052)。

# 已知问题
*2018-07-22* [mozilla](https://developer.mozilla.org/zh-CN/docs/Web/API/MediaDevices/getUserMedia) 和 [caniuse](https://caniuse.com/#search=getUserMedia) 注明的IOS 11以上Safari是支持调用getUserMedia的，但有用户反馈苹果手机IOS11 Safari和微信都不能录音，演示页面内两个关键指标：获取getUserMedia都是返回false（没有苹果手机未能复现）。但经测试桌面版Safari能获取到getUserMedia。原因不明。

*2018-09-19* [caniuse](https://caniuse.com/#search=getUserMedia) 注明IOS 12 Safari支持调用getUserMedia，经用户测试反馈IOS 12上chrome、UC都无法获取到，部分IOS 12 Safari可以获取到并且能正常录音，但部分不行，原因未知，参考[ios 12 支不支持录音了](https://www.v2ex.com/t/490695)

*2018-12-06* **【已修复】** [issues#1](https://github.com/xiangyuecn/Recorder/issues/1)不同OS上低码率mp3有可能无声，测试发现问题出在lamejs编码器有问题，此编码器本来就是精简版的，可能有地方魔改坏了，用lame测试没有这种问题。已对lamejs源码进行了改动，已通过基础测试，此问题未再次出现。

# 快速使用
在需要录音功能的页面引入压缩好的recorder.***.min.js文件即可，**对于https的要求不做解释**
``` html
<script src="recorder.mp3.min.js"></script>
```
或者直接使用源码（src内的为源码、dist内的为压缩后的），可以引用src目录中的recorder-core.js+相应类型的实现文件，比如要mp3录音：
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
		rec.stop(function(blob,duration){//到达指定条件停止录音，拿到blob对象想干嘛就干嘛：立即播放、上传
			console.log(URL.createObjectURL(blob),"时长:"+duration+"ms");
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

`success(blob,duration)`：`blob`：录音数据audio/mp3|wav...格式，`duration`：录音时长，单位毫秒

`fail(errMsg)`：录音出错回调

提示：stop时会进行音频编码，音频编码可能会很慢，10几秒录音花费2秒左右算是正常，编码并未使用Worker方案(文件多)，内部采取的是分段编码+setTimeout来处理，界面卡顿不明显。


### rec.pause()
暂停录音。

### rec.resume()
恢复继续录音。

### Recorder.IsOpen()
由于Recorder持有的录音资源是全局唯一的，可通过此方法检测是否有Recorder已调用过open打开了录音功能。


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
wav格式编码器时参考网上资料写的，会发现代码和别人家的差不多。源码2kb大小。

## mp3
采用的是[lamejs](https://github.com/zhuker/lamejs)这个库的代码，`https://github.com/zhuker/lamejs/blob/bfb7f6c6d7877e0fe1ad9e72697a871676119a0e/lame.all.js`这个版本的文件代码；已对lamejs源码进行了部分改动，用于修复发现的问题。源码518kb大小，压缩后150kb左右，开启gzip后50来k。

## beta-ogg
采用的是[ogg-vorbis-encoder-js](https://github.com/higuma/ogg-vorbis-encoder-js)，`https://github.com/higuma/ogg-vorbis-encoder-js/blob/7a872423f416e330e925f5266d2eb66cff63c1b6/lib/OggVorbisEncoder.js`这个版本的文件代码。此编码器源码2.2M，超级大，压缩后1.6M，开启gzip后327K左右。对录音的压缩率比lamejs高出一倍, 但Vorbis in Ogg好像Safari不支持（[真的假的](https://developer.mozilla.org/en-US/docs/Web/HTML/Supported_media_formats#Browser_compatibility)）。

## beta-webm
这个编码器时通过查阅MDN编写的一个玩意，没多大使用价值：录几秒就至少要几秒来编码。。。原因是：未找到对已有pcm数据进行快速编码的方法。数据导入到MediaRecorder，音频有几秒就要等几秒，类似边播放边收听形。(想接原始录音Stream？我不可能给的!)输出音频虽然可以通过比特率来控制文件大小，但音频文件中的比特率并非设定比特率，采样率由于是我们自己采样的，到这个编码器随他怎么搞。只有比较新的浏览器支持（需实现浏览器MediaRecorder），压缩率和mp3差不多。源码2kb大小。


# 兼容性
对于支持录音的浏览器能够正常录音并返回录音数据；对于不支持的浏览器，引入js和执行相关方法都不会产生异常，并且进入相关的fail回调。一般在open的时候就能检测到是否支持或者被用户拒绝，可在用户开始录音之前提示浏览器不支持录音或授权。


# 关于微信JsSDK
微信内浏览器他家的[JsSDK](https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421141115)也支持录音，涉及笨重难调的公众号开发（光sdk初始化就能阻碍很多新奇想法的产生，signature限制太多），只能满足最基本的使用（大部分情况足够了）。如果JsSDK录完音能返回音频数据，这个SDK将好用10000倍，如果能实时返回音频数据，将好用100000倍。关键是他们家是拒绝给这种简单好用的功能的，必须绕一个大圈：录好音了->上传到微信服务器->自家服务器请求微信服务器多进行媒体下载->保存录音（微信小程序以前也是二逼路子，现在稍微好点能实时拿到录音mp3数据），如果能升级：录好音了拿到音频数据->上传保存录音，目测对最终结果是没有区别的，还简单不少，对微信自家也算是非常经济实用。[2018]由于微信IOS上不支持原生JS录音，Android上又支持，为了兼容而去兼容的事情我是拒绝的（而且是仅仅为了兼容IOS上面的微信），其实也算不上去兼容，因为微信JsSDK中的接口完全算是另外一种东西，接入的话对整个录音流程都会产生完全不一样的变化，还不如没有进入录音流程之前就进行分支判断处理。

最后：如果是在微信上用的多，应优先直接接入他家的JsSDK（没有公众号开个订阅号又不要钱），基本上可以忽略兼容性问题，就是麻烦点。


# 其他音频格式支持办法
``` javascript
//比如增加aac格式支持 (可参考/src/engine/mp3.js实现)

//新增一个aac.js，编写以下格式代码即可实现这个类型
Recorder.prototype.aac=function(pcmData,successCall,failCall){
	//通过aac编码器把pcm数据转成aac格式数据，通过this.set拿到传入的配置数据
	... pcmData->aacData
	
	//返回数据
	successCall(new Blob(aacData,{type:"audio/aac"}));
}

//调用
Recorder({type:"aac"})
```