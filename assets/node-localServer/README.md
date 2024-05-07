# 测试用的本地服务器
提供http上传接口、websocket接口

## 运行
1. 先执行 `npm install --registry=https://registry.npmmirror.com/` 安装依赖
2. 执行 `npm run start` 运行服务

## 配置
- http端口默认 `9528`
- https端口默认 `9538`
- ws端口默认 `9529`
- wss端口默认 `9539`

在`main.js`中可以修改端口，如果要开启https、wss，需先在`main.js`中配置ssl证书文件路径；本地测试时建议使用一个域名解析到本地服务器局域网ip，比如：192-168-1-123.xxx.com 解析到 192.168.1.123，用这个域名申请免费的https通配符证书，[在线免费申请（ZeroSSL、Let’s Encrypt）](https://xiangyuecn.github.io/ACME-HTML-Web-Browser-Client/ACME-HTML-Web-Browser-Client.html) 


## 可用的http接口
http接口在`server-http.js`文件内实现，文件开头有测试代码。
``` js
接口统一返回结果：
{
    c:0 //code，0正常，其他错误
    ,m:"" //message，错误消息
    ,v:any //value，返回的结果值，一般是对象
}


/upload    使用上传文件表单上传，POST multipart/form-data
    参数：upfile 上传的文件
    返回：{ url:"文件访问url" }
/uploadBase64    使用普通表单上传，POST application/x-www-form-urlencoded
    参数：upfile_b64 上传的文件base64字符串，mime 文件类型
    返回：{ url:"文件访问url" }

/Recorder/***    使用GET请求访问Recorder目录内的静态文件
```


## 可用的websocket接口
ws接口在`server-websocket.js`文件内实现，文件开头有测试代码。
``` js
数据包格式：`JSON参数 + \n + Binary`，Binary是可选的二进制数据（如：语音流），JSON和Binary之间用换行符(0x0A)分隔

    JSON参数：{
        type:"sendTo" //消息类型，服务器或客户端都会调用对应的接口处理此消息；如果此消息为响应结果，type为`response.456.msgType`这种特殊格式
        ,n:123 //消息编号，number，服务器或客户端自行维护此编号，每发送出一条消息编号+1
        ,c:0 //此消息是响应结果时会有此参数，code，0接口调用正常，其他为错误
        ,m:"" //此消息是响应结果时会有此参数，message，接口调用错误消息
        ,v:any //消息参数值value，一般是对象，此消息类型定义的参数都放这个对象里面
    }

    有些消息类型会携带二进制数据，就是上面的Binary，拼接到JSON参数后面即可

    有些消息类型对方收到后需要返回响应结果，比如A发送了msgA给B，B处理完此消息后，就将结果msgB返回给A，此时msgB.type="response."+msgA.n+"."+msgA.type，方便回调处理


========================================
下面是可用的消息类型，消息参数是JSON参数中的v值，返回结果是response消息中的v值，【均为对象】


createFile    创建文件和追加写入文件，比如：语音流保存到文件
    消息参数：mime:"audio/mp3"    创建文件的类型
    返回结果：token:"abcd"    后续appendFile写入数据需要用到的token
                fileName:fileName    新创建的文件名，文件在当前目录的upload文件夹内，创建后是空文件，appendFile写入数据后可通过http接口访问："http://127.0.0.1:9528/Recorder/assets/node-localServer/upload/"+fileName

appendFile    追加写入文件
    消息参数：token:"abcd"    createFile创建文件时返回的token值
    Binary：此消息类型需要提供二进制数据，此二进制数据会追加写入到token对应的文件
    返回结果：空对象


setMeta    设置客户端信息
    消息参数：key:value    任意键值对，可以一次性设置多个信息
    返回结果：空对象

queryMeta    查询客户端信息，可拉取在线的所有客户端信息
    消息参数：metaKey:"uid"    客户端setMeta设置过的信息的key，为空时匹配所有客户端
                metaValue:any    客户端setMeta设置过的信息值，匹配就会读取这个客户端信息
                keys:["uid","xx"]    需要返回的setMeta设置过的信息的key列表
    返回结果：clients:[{uid:123,xx:"xx"},...]    查询到的所有客户端信息

sendTo    给其他客户端（可多个）发送消息数据，比如：语音流
    消息参数：toMetaKey:"uid"    对方客户端setMeta设置过的信息的key，为空时匹配所有客户端
                toMetaValue:any    对方客户端setMeta设置过的信息值，匹配就会发送给这个客户端
                sendType:"xxx"    要发送的消息类型，对方会收到此类型的消息
                sendData:any    要发送的消息参数值，一般是对象，并且包含fromMetaKey、fromMetaValue信息
    Binary：可选的提供二进制数据，会原封不动的发送给对方
    返回结果：count:123    发送到了几个客户端，如果没有客户端在线count=0


audioStart    服务器实时将一个audio发送给客户端，语音流
    消息参数：readAudio:false    可选，是否读取一个语音文件，true时读取当前目录下的upload/audio-16k.wav文件（此文件必须是16000采样率，44字节wav头，如果文件不存在会返回错误信息），false时临时生成一个16k采样率的pcm
    返回结果：token:"abcd"    后续audioStop时需要用到的token

audioFrame    当audioStart后，客户端会收到服务器的此消息，为音频pcm数据帧
    消息参数：sampleRate:16000    pcm的采样率
    Binary：此消息会提供二进制数据，为pcm数据
    返回结果：无需返回结果
    
audioStop    结束发送audio语音流
    消息参数：token:"abcd"    audioStart时返回的token值
    返回结果：空对象
```
