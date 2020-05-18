

# 接口定义
入口URL只有一个（默认为`https://xxx/paas/recordsdk`），通过请求action参数区分不同接口。接口调用方式为两种：GET(jsonp)，POST(xhr)。


## getConfig
### GET参数
无

### 响应
``` javascript
{
	limit:"" //是否受限，如果不为空将限制使用
	,logMsg:"" //控制台提示消息
	,url_RecordAppConfigFolder:"https://cdn.jsdelivr.net/gh/xiangyuecn/Recorder@latest/asset-record-sdk/record-sdk/dist/" //RecordApp配置目录，里面包含ios-weixin-config.js、native-config.js文件，必须为完整https url /结尾
	,url_RecordAppBaseFolder:"https://cdn.jsdelivr.net/gh/xiangyuecn/Recorder@latest/dist/" //Recorder目录，会从里面加载RecordApp和Recorder，必须为完整https url /结尾
}
```