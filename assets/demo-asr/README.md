# 测试用的本地ASR相关接口服务器
目前已提供：
- 阿里云-智能语音交互-一句话识别 生成token的api接口，本地测试http后端服务



## 阿里云一句话识别TokenApi
### 如何运行
双击`运行服务.cmd`选择对应菜单运行即可，或直接命令行执行 `node NodeJsServer_asr.aliyun.short.js` 运行服务，**注意：需要先在js文件内配置密钥**。

### 如何配置
用编辑器打开 `NodeJsServer_asr.aliyun.short.js` 文件，文件开头有 `【必填】` 项，根据注释完成配置：`AccessKey`、`Secret`、`Appkey`，可提供多个Appkey对应不同的语言模型。

http访问端口默认`9527`，如果配置了ssl证书可以使用https访问。



## 跨域问题、http无法访问？
非本机浏览器中测试H5页面时，比如手机，由于必须https访问（本机可用127.0.0.1、localhost地址无此问题，其他地址必须https才能录音），可能会存在跨域或https无法访问http的问题。因此建议均适用https方便测试；或者直接本机上打开http的接口地址，获得对应token然后手动复制json到页面中使用也是可以的。

本地测试时建议使用一个域名解析到本地服务器局域网ip，比如：192-168-1-123.xxx.com 解析到 192.168.1.123，用这个域名申请免费的https通配符证书，[在线免费申请（ZeroSSL、Let’s Encrypt）](https://xiangyuecn.github.io/ACME-HTML-Web-Browser-Client/ACME-HTML-Web-Browser-Client.html) 
