# Recorder：recorder-core 用于html5录音

GitHub: [https://github.com/xiangyuecn/Recorder](https://github.com/xiangyuecn/Recorder)，详细使用方法和支持请参考Recorder的GitHub仓库。npm recorder这个名字已被使用，因此在Recorder基础上增加后缀-core，就命名为recorder-core，和Recorder核心文件同名。                                  @@Ref 编辑提醒@@                                  @@Ref 编辑提醒@@                   @@Ref 编辑提醒@@

@@Ref README.Desc@@


# 如何使用

**注意：[需要在https等安全环境下才能进行录音](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#Privacy_and_security)**

## 【1】通过npm安装
```
npm install recorder-core
```

## 【2】引入Recorder库
**方式一**：通过import/require引入

@@Ref README.ImportCode@@

**方式二**：使用script标签引入

这种方式和GitHub上的代码使用没有差别，请阅读[GitHub仓库](https://github.com/xiangyuecn/Recorder)获得更详细的使用文档。
``` html
<script src="你项目中的路径/src/recorder-core.js"></script> <!--必须引入的录音核心-->
<script src="你项目中的路径/src/engine/mp3.js"></script> <!--相应格式支持文件-->
<script src="你项目中的路径/src/engine/mp3-engine.js"></script> <!--如果此格式有额外的编码引擎的话，也要加上-->

<script src="你项目中的路径/src/extensions/waveview.js"></script>  <!--可选的扩展支持项-->
```

或者在需要录音功能的页面引入压缩好的recorder.xxx.min.js文件减小代码体积
``` html
<script src="你项目中的路径/recorder.mp3.min.js"></script> <!--已包含recorder-core和mp3格式支持-->
```

## 【3】调用录音
@@Ref README.Codes@@


## WaveView的调用方式
引入`src/extensions/waveview.js`，再通过Recorder.WaveView调用即可，录音时动态显示波形，详细的使用请参考下面详细的README。

@@Ref README.WaveView.Codes@@

【附】部分扩展使用效果图：

![](https://gitee.com/xiangyuecn/Recorder/raw/master/assets/use_wave.gif)


## WaveSurferView的调用方式
引入`src/extensions/wavesurfer.view.js`，再通过Recorder.WaveSurferView调用即可，录音时动态显示波形，详细的使用请参考下面详细的README。


## FrequencyHistogramView的调用方式
引入`src/extensions/frequency.histogram.view.js`+`lib.fft.js`，再通过Recorder.FrequencyHistogramView调用即可，音频可视化频率直方图显示，详细的使用请参考下面详细的README。


## Sonic的调用方式
引入`src/extensions/sonic.js`，再通过Recorder.Sonic调用即可，音频变速变调转换，详细的使用请参考下面详细的README。


## RecordApp的调用方式
**方式一**：通过import/require引入

@@Ref RecordApp.README.ImportCode@@

**方式二**：使用script标签引入

这种方式和GitHub上的代码使用没有差别，请阅读[GitHub仓库内RecordApp](https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample)获得更详细的使用文档。
``` html
<!-- 可选的独立配置文件，参考上面import的解释 -->
<script src="你的配置文件目录/native-config.js"></script>
<script src="你的配置文件目录/ios-weixin-config.js"></script>

<!-- 在需要录音功能的页面引入`app-support/app.js`文件即可。
    app.js会自动加载实现文件、Recorder核心、编码引擎，应确保app.js内BaseFolder目录的正确性(参阅RecordAppBaseFolder)。
    （如何避免自动加载：使用时可以把所有支持文件全部手动引入，或者压缩时可以把所有支持文件压缩到一起，会检测到组件已加载，就不会再进行自动加载；会自动默认加载哪些文件，请查阅app.js内所有Platform的paths配置）
    （**注意：需要在https等安全环境下才能进行录音**） -->
<script src="你项目中的路径/src/app-support/app.js"></script>
```

### 调用录音
@@Ref RecordApp.README.Codes@@


--------
> 以下文档为GitHub仓库内的README原文，可能更新不及时，请到[GitHub仓库](https://github.com/xiangyuecn/Recorder)内查看最新文档

@@Ref README.Raw@@


@@Remove Start@@
# 作者自用：本npm包如何编写提交

1. 运行根目录/src：npm start，进行文件copy
2. 进入assets/npm-home/npm-files目录，进行提交

```
//登录，注意一定要使用npmjs的源
npm login

//发布包
npm publish

//查询当前配置的源
npm get registry
//设置成淘宝源
npm config set registry http://registry.npm.taobao.org/
//换成原来的源
npm config set registry https://registry.npmjs.org/
```
@@Remove End@@