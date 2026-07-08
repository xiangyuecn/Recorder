//允许给Recorder配置全局变量名（主要针对浏览器环境）
//import优先于所有代码执行，因此需要在 import recorder-core 前面，先import改名代码的js文件

Object["Recorder-Core-IsBrowser"]=null; //当环境被误判时，可以强制指定是否是浏览器，赋值true或false
Object["Recorder-Core-Alias"]="MyRecorder"; //将不会有全局的window.Recorder变量，全局的变为window.MyRecorder
Object["Recorder-App-Alias"]="MyRecordApp"; //将不会有全局的window.RecordApp变量，全局的变为window.MyRecordApp

