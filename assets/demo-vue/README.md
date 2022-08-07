# vue+webpack测试

- [Recorder H5在线测试](https://xiangyuecn.gitee.io/recorder/assets/demo-vue)，主要文件为 [component/recorder.vue](https://github.com/xiangyuecn/Recorder/blob/master/assets/demo-vue/component/recorder.vue)，支持PC、Android、IOS 14.3+。
- [RecordApp 在线测试](https://jiebian.life/web/h5/github/recordapp.aspx?path=/assets/demo-vue/recordapp.html)，主要文件为 [component/recordapp.vue](https://github.com/xiangyuecn/Recorder/blob/master/assets/demo-vue/component/recordapp.vue) [即将废弃] ，RecordApp除了Recorder支持的外，支持Hybrid App，低版本IOS上支持微信网页和小程序web-view。

# 运行方法
## 【1】编译vue源码
```
npm install
npm run build-dev
```
## 【2】浏览器访问
然后就可以打开`index.html`查看集成`Recorder`的效果，打开`recordapp.html`查看集成`RecordApp`的效果。