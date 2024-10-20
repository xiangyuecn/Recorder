# Recorder：recorder-core 用于html5录音

GitHub: [https://github.com/xiangyuecn/Recorder](https://github.com/xiangyuecn/Recorder)

Gitee: [https://gitee.com/xiangyuecn/Recorder](https://gitee.com/xiangyuecn/Recorder)

文档和详细使用方法请参考上面两个Recorder仓库。npm recorder这个名字已被使用，因此在Recorder基础上增加后缀-core，就命名为recorder-core，和Recorder核心文件同名。


# 如何使用

## 使用npm安装
```
npm install recorder-core
```

## 引入Recorder库
@@Ref RecordApp.README.ImportCode@@

## Recorder调用录音
@@Ref README.Codes@@

## RecordApp调用录音
@@Ref RecordApp.README.Codes@@




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
npm config set registry https://registry.npmmirror.com/
//换成原来的源
npm config set registry https://registry.npmjs.org/
```
@@Remove End@@