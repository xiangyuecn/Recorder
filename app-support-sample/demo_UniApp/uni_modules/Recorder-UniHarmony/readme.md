# 使用方法文档
本UTS插件为[跨平台Recorder录音插件Recorder-UniCore](https://ext.dcloud.net.cn/plugin?name=Recorder-UniCore)的配套组件，提供鸿蒙App下的权限请求、文件保存原生功能。

插件默认配置了 `麦克风` 权限，对应权限声明为 `正在申请使用麦克风权限，以便为您提供相应的服务`，也可用于更多权限的声明和请求；请参考下面的权限请求方法，可以到json5配置文件中自行添加修改。

## import
``` js
import { Harmony_RequestPermissionAsync, Harmony_SaveLocalFile } from '@/uni_modules/Recorder-UniHarmony';
```

## Harmony_RequestPermissionAsync(permissions : Array<string>)
请求权限，参数有几个权限，异步返回的结果对应的就有几个值。非鸿蒙app调用会直接抛异常。
``` js
var res=await Harmony_RequestPermissionAsync(["ohos.permission.MICROPHONE","ohos.permission.CAMERA"]);
//res=[1,3] 返回结果：1 有权限、3 无权限、2 （未用到）

// 权限需要先到 @/uni_modules/Recorder-UniHarmony/utssdk/app-harmony/module.json5 内声明，可阅读此json5配置文件自行添加修改
// 权限字符串参考 https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/permissions-for-all-user
```

## Harmony_SaveLocalFile(fileName : string, base64 : string)
保存base64任意二进制数据到此文件名下，返回保存的完整路径。非鸿蒙app调用会直接抛异常。
``` js
var path=Harmony_SaveLocalFile("test.txt", "dGVzdDEyMw==");
//path=Context.filesDir+"/RecUniSaveFiles"+"/test.txt" 返回保存的完整路径
```


