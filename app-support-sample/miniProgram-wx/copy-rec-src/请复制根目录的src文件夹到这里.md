npm支持太差，手动copy Recorder根目录下的src文件夹到本目录即可

比如可用路径：/copy-rec-src/src/recorder-core.js

自己项目实际使用时，可按需copy仅你require引用到了的js文件到小程序项目中，免得小程序源码过大（一般编译时会忽略掉未引用到的js文件）。

微信开发者工具对npm支持太差，“构建 npm”功能没什么卵用，npm包内没被main文件引用的js会被全部丢弃，导致文件缺失；似乎也不允许手动`require`含`node_modules`的路径；因此请直接copy根目录内的src文件夹到本小程序源码的`copy-rec-src`文件夹内，直接当做小程序源码调用，好使。
