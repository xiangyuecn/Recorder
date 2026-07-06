/*
大部分环境下无需使用本文件，如node.js、vue，均支持默认UMD导出的 app.js
只有在导出时必须使用export关键字才认为是合法模块的ES Module中时，必须使用：
	import RecordApp from "recorder-core/src/app-support/app.js.esm.js"

为什么不用 .mjs 后缀：nginx需要手动添加mime映射（2026-06-28），不然返回application/octet-stream浏览器不认
https://github.com/xiangyuecn/Recorder
*/
import Recorder from "../recorder-core.js.esm.js";
import "./app.js";

const RecordApp=Recorder.RecordApp;
export default RecordApp;
