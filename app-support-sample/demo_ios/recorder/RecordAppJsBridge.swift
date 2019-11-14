import WebKit
import AVFoundation

/* 录音Hybrid App核心支持文件 https://github.com/xiangyuecn/Recorder
 
 【使用】
     1. copy本文件即可使用，其他文件都是多余的
     2. 在plist中配置麦克风的权限声明：NSMicrophoneUsageDescription
     3. 把WKWebView的configuration传进来进行对象注入；实现一个麦克风权限请求接口；实现一个Log接口，简单内部调用一下print即可
     4. 重写WKWebView的prompt弹框，函数内部调用一下acceptPrompt进行请求识别和处理
 
 【为什么不用UserAgent来识别App环境】
    通过修改WebView的UA来让H5、服务器判断是不是在App里面运行的，此方法非常简单而且实用。但有一个致命缺陷，当UA数据很敏感的场景下，虽然方便了我方H5、服务器来识别这个App，但也同时也暴露给了任何在此WebView中发起的请求，不可避免的会将我们的标识信息随请求而发送给第三方（虽然可通过额外编程把信息抹掉，但代价太大了）。IOS不动UA基本上别人的服务器几乎不太可能识别出我们的App，Android神一样的把包名添加到了X-Requested-With请求头中，还能不能讲理了。
*/
public class RecordAppJsBridge {
    //js中定义的名称
    static private let JsBridgeName="RecordAppJsBridge";
    static private let JsRequestName="AppJsBridgeRequest";
    
    //默认会把录音数据额外存储到app的cache目录中，仅供分析调试之用
    static private let SavePCM_ToLogFile=true;
    
    static private let LogTag="RecordAppJsBridge";
    
    public typealias MicrophoneUsesPermission = (@escaping (Bool)->Void)->Void;
    
    public init(_ config:WKWebViewConfiguration, _ microphoneUsesPermission:@escaping MicrophoneUsesPermission, _ log:RecordApp_ILog, _ runScript:@escaping (String)->Void){
        Log=log;
        microphoneUsesPermissionFn=microphoneUsesPermission;
        runScriptFn=runScript;
        
        //底层识别，浏览器通过判断是否存在这个对象来识别app环境。这里不承载数据交互功能。数据交互在通过重写浏览器的prompt，并在prompt中调用下面的acceptPrompt方法
        config.userContentController.add(WebViewJsMatchObj(), name: RecordAppJsBridge.JsBridgeName+"IsSet");
    }
    public class WebViewJsMatchObj:NSObject, WKScriptMessageHandler{
        public func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            //NOOP
        }
    }
    
    
    private var Log:RecordApp_ILog!;
    public var microphoneUsesPermissionFn:MicrophoneUsesPermission!;
    private var runScriptFn:((String)->Void)!;
    
    public func runScript(_ code:String){
        ThreadX.UI {
            self.runScriptFn?(code);
        }
    }
    public func close(){
        Log=nil;
        microphoneUsesPermissionFn=nil;
        runScriptFn=nil;
    }
    
    /*如果prompt弹窗提示内容为json格式，就接管*/
    public func acceptPrompt(_ prompt:String)->String?{
        if prompt.hasPrefix("{") && prompt.hasSuffix("}") {
            let json=Code.ParseDic(prompt);
            let res=Request(self, json).exec();
            return Code.ToJson(res);
        }
        
        return nil;
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    //*****Request.swift**处理js请求**************************
    public class Request{
        static private let LogTag="Request";
        
        //api定义在哪些类里面，省的去查找类，都在这里统一进行静态初始化
        static private var IsInit=false;
        public typealias Api=(Request)->Void;
        static private var ActionMethodMapping:[String: Api]=[:];
        static public func Init(){
            if(IsInit){
                return;
            }
            objc_sync_enter(LogTag);
            defer{
                objc_sync_exit(LogTag);
            }
            if(IsInit){
                return;
            }
            
            Add(RecordApis.Init());
            
            IsInit=true;
        }
        static private func Add(_ apis:[String: Api]){
            for (k,v) in apis {
                if ActionMethodMapping.index(forKey: k) != nil {
                    print(LogTag+":重复接口："+k);
                }
                ActionMethodMapping[k]=v;
            }
        }
        
        
        weak public var jsBridge:RecordAppJsBridge!;
        private var json:[String:Any?]!;
        public var args:[String:Any?]!;
        private var action:String!;
        private var isAsync:Bool!;
        
        
        
        /**
         * 设置接口返回的value，并设置status为success
         */
        public func setValue(_ val:Any?){
            json["status"]="success";
            _setVal(val);
        }
        private func _setVal(_ val:Any?){
            json["value"]=val;
        }
        
        /**
         * 仅仅设置返回的message数据
         */
        public func setMsg(_ msg:String){
            json["message"]=msg;
        }
        /**
         * 异步方法调用最终执行完毕时调用，异步方法专用
         */
        public func callback(_ val:Any?, _ errOrNull:String?){
            if(errOrNull != nil){
                _setVal(val);
                setMsg(errOrNull!);
            }else{
                setValue(val);
            }
            __callback(false);
        }
        private func __callback(_ isExecCall:Bool){
            jsBridge?.runScript(RecordAppJsBridge.JsRequestName+".Call("+Code.ToJson(json)+")");
            
            if !isExecCall && !isAsync {
                jsBridge?.Log?.e(Request.LogTag,action+"不是异步方法，但调用了回调");
            }
            if isSend {
                jsBridge?.Log?.e(Request.LogTag,action+"重复回调");
            }
            isSend=true;
        }
        private var isSend=false;
        
        
        
        public init(_ jsBridge:RecordAppJsBridge, _ msg:[String:Any?]){
            Request.Init();
            self.jsBridge=jsBridge;
            args=Code.GetDic(msg,"args");
            action=Code.GetString(msg,"action");
            
            json=[:];
            json["status"]="";
            json["message"]="";
            json["action"]=action;
            json["callback"]=Code.GetString(msg,"callback");
        }
        public func exec()->[String:Any?]{
            let syncName="Sync_"+action;
            let asyncName="Async_"+action;
            
            var findMethodName:String?=nil;
            var fn:Api?=nil;
            if Request.ActionMethodMapping.index(forKey: syncName) != nil {
                isAsync=false;
                findMethodName=syncName;
                fn = Request.ActionMethodMapping[findMethodName!];
            }else if Request.ActionMethodMapping.index(forKey: asyncName) != nil {
                isAsync=true;
                findMethodName=asyncName;
                fn = Request.ActionMethodMapping[findMethodName!];
            }
            if fn==nil {
                jsBridge?.Log?.e(Request.LogTag,"request."+action+"不存在");
                json["message"]="request."+action+"不存在";
                __callback(true);
                return json;
            }
            
            fn!(self);
            return json;
        }
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    public class RecordApis{
        static private let LogTag="RecordApis"
        static public func Init()->[String:Request.Api]{
return [
    "Async_recordPermission":{ req in
        req.jsBridge.microphoneUsesPermissionFn(){ has in
            if(has){
                req.callback(1, nil);
            }else{
                req.callback(3, nil);
            }
        };
    }
    , "Sync_recordAlive":{ req in
        if(Current != nil){
            Current.alive();
            req.setValue(nil);
        }else{
            req.setMsg("未开始任何录音");
        }
    }
    , "Async_recordStart":{ req in
        DestroyCurrent();
        
        req.jsBridge.microphoneUsesPermissionFn(){ has in
            if !has {
                req.callback(nil, "没有录音权限");
                return
            }
            
            ThreadX.Run {
                let param=Code.GetDic(req.args,"param");
                var sampleRate=Code.GetInt(param,"sampleRate");
                if(sampleRate==0){
                    sampleRate=16000;
                }
                
                _=RecordApis(req.jsBridge, sampleRate){ err in
                    if err != nil {
                        req.jsBridge.Log.e(LogTag, "开始录音失败:"+err!);
                        req.callback(nil, "无法开始录音："+err!);
                        DestroyCurrent();
                        return;
                    }
                    
                    req.callback(Dictionary<String,Any?>(), nil);
                };
            }
        };
    }
    , "Async_recordStop":{ req in
        if(Current==nil){
            req.callback(nil, "未开始任何录音");
            return;
        }
        
        Current.stop({ err in
            if(err != nil){
                req.jsBridge.Log.e(LogTag, "停止录音失败:"+err!);
                req.callback(nil, "结束录音出错："+err!);
                DestroyCurrent();//成功的不要Destroy还要打log
                return;
            }
            req.callback(Dictionary<String,Any?>(), nil);
        });
    }
];
        }
        
        
        
        
        
        static private func DestroyCurrent(){
            if(Current != nil){
                Current.destroy();
            }
        }
        static private var Current:RecordApis!;
        
        private let Lock="";
        private init(_ main_:RecordAppJsBridge, _ sampleRateReq:Int, _ ready:@escaping (String?)->Void){
            objc_sync_enter(Lock);
            defer{
                objc_sync_exit(Lock);
            }
            
            self.main=main_;
            sampleRate=sampleRateReq;
            logData=RecordAppJsBridge.SavePCM_ToLogFile;
            if logData {
                logStreamFull=NSMutableData();
            }
            
            RecordApis.Current=self;
            
            cacheFile=NSTemporaryDirectory() + "/record.tmp.pcm"
            try? FileManager.default.removeItem(atPath: cacheFile);
            
            let session = AVAudioSession.sharedInstance()
            do {
                try session.setCategory(AVAudioSession.Category.playAndRecord)
                try session.setActive(true)
            } catch let err {
                main.Log.e(RecordApis.LogTag, "设置录音环境出错:"+err.localizedDescription);
                ready("设置录音环境出错:"+err.localizedDescription);
                return;
            }
            
            let sets: [String: Any] = [
                AVSampleRateKey: NSNumber(value: sampleRate),//采样率
                AVFormatIDKey: NSNumber(value: kAudioFormatLinearPCM),//音频格式
                AVLinearPCMBitDepthKey: NSNumber(value: 16),//采样位数
                AVNumberOfChannelsKey: NSNumber(value: 1),//通道数
                AVEncoderAudioQualityKey: NSNumber(value: AVAudioQuality.high.rawValue)//录音质量
            ];
            //开始录音
            do {
                let url = URL(fileURLWithPath: cacheFile)
                rec = try AVAudioRecorder.init(url: url, settings: sets)
                rec.prepareToRecord()
                rec.record()
            } catch let err {
                main.Log.e(RecordApis.LogTag, "开始录音出错:"+err.localizedDescription);
                ready("开始录音出错:"+err.localizedDescription);
                return;
            }
            
            ready(nil);
            
            isRec=true;
            alive();
            main.Log.i(RecordApis.LogTag, "开始录音："+String(sampleRate));
            startTime=Code.GetMS();
            
            ThreadX.Run {
                self.readAsync();
            }
        }
        private var main:RecordAppJsBridge!;
        private var sampleRate:Int;
        private var rec:AVAudioRecorder!;
        private var isRec=false;
        private var aliveInt=0;
        private var startTime=Int64(0);
        
        private var cacheFile:String!;
        
        private var logData:Bool;
        private var logStreamFull:NSMutableData!;
        
        private func destroy(){
            objc_sync_enter(Lock);
            defer{
                objc_sync_exit(Lock);
            }
            
            RecordApis.Current=nil;
            
            isRec=false;
            main=nil;
            
            ThreadX.ClearTimeout(aliveInt);
            
            logStreamFull=nil;
            
            if(rec != nil){
                rec.stop();
                rec=nil;
            }
        }
        private func alive(){
            ThreadX.ClearTimeout(aliveInt);
            aliveInt=ThreadX.SetTimeout(10 * 1000){
                if self.main != nil {//Sync Check
                    self.main.Log.e(RecordApis.LogTag, "录音超时自动停止：超过10秒未调用alive");
                }
                self.destroy();
            };
        }
        
        private func stop(_ callback:@escaping (String?)->Void){
            if(!isRec){
                callback("未开始录音");
                return;
            }
            if(readTotal==0){
                callback("未获得任何录音数据");
                return;
            }
            
            isRec=false;
            main.Log.i(RecordApis.LogTag, "结束录音，已录制："+String(sendCount)+"段 "+String(duration)+"ms start到stop："+String(Code.GetMS()-startTime)+"ms");
            
            callback(nil);
            
            if(logData) {
                let dir = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true).last!
                let fullFile=dir+"/record-full.pcm";
                
                if !logStreamFull.write(toFile: fullFile, atomically: false) {
                    main.Log.e(RecordApis.LogTag, "保存文件失败"+fullFile);
                }
            }
            destroy();
        }
        
        private var readTotal=0;
        private var duration=0;
        private var sendCount=0;
        private func readAsync(){
            let sampleRateSrc=sampleRate;
            var bufferLen=(sampleRateSrc/12)*2;//每秒返回12次，按Int16需要乘2
            bufferLen+=bufferLen%2;//保证16位
            
            let itemMs=1000/12;
            var prevTime=Int64(0);
            
            let cache=NSMutableData();
            
            let input=FileHandle.init(forReadingAtPath: cacheFile);
            var skiped=false;
            let skipLen=4*1024;//照抄的别人的
            var firstLog=false;
            while isRec {
                var data=input!.readData(ofLength: 256);
                
                if data.count==0 {
                    ThreadX.Sleep(5);
                    continue;
                }
                if !isRec {
                    break;
                }
                
                cache.append(data);
                if skiped {
                    //读取到了回调数量的数据
                    if cache.count>=bufferLen {
                        let d1=cache.subdata(with: NSMakeRange(0, bufferLen));
                        let d2=cache.subdata(with: NSMakeRange(bufferLen, cache.count-bufferLen));
                        cache.setData(d2);
                        
                        if(logData) {
                            logStreamFull.append(d1);
                        }
                        readTotal+=d1.count;
                        duration=readTotal/(sampleRateSrc/1000)/2;
                        sendCount+=1;
                        main.runScript(RecordAppJsBridge.JsRequestName+".Record(\"\(d1.base64EncodedString())\",\(sampleRateSrc))");
                        
                        if(!firstLog){
                            main.Log.i(RecordApis.LogTag, "获取到了第一段录音数据：len:\(d1.count) bufferLen:\(bufferLen) sampleRate:\(sampleRateSrc)");
                            firstLog=true;
                        }
                        
                        
                        //进行匀速回调，因为AVAudioRecorder写入的数据有蛮大延迟，所以最终结果也会有蛮大延迟，用AudioQueue、AudioUnit低级OC api会好很多，但太低级了，复杂难用。
                        let delay=Int64(itemMs-10) - (Code.GetMS()-prevTime)
                        if delay>0 {
                            ThreadX.Sleep(Int(delay));
                        }
                        prevTime=Code.GetMS();
                    }
                }else{
                    //跳过caf文件头
                    if cache.count>=skipLen {
                        skiped=true;
                        let d2=cache.subdata(with: NSMakeRange(skipLen, cache.count-skipLen));
                        cache.setData(d2);
                    }
                }
            }
            input?.closeFile();
        }
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    /****Code.swift 公共函数****/
    private class Code{
        static public func GetMS(_ date:Date=Date())->Int64{
            return Int64(round(date.timeIntervalSince1970*1000));
        }
        
        static public func ParseDic(_ json:String)->Dictionary<String,Any?>{
            var rtv:[String:Any?]?=nil;
            let data = json.data(using: .utf8)!
            
            let dic = try? JSONSerialization.jsonObject(with: data, options: .mutableContainers)
            if dic != nil {
                rtv=dic as? [String:Any?];
            }
            return rtv ?? [:];
        }
        
        
        //****extension Dictionary where Key == String*****
        
        static public func ToJson<T>(_ Self:Dictionary<String,T>)->String{
            var rtv:String?=nil;
            do {
                let data=try JSONSerialization.data(withJSONObject: Self, options:[]);
                rtv=String.init(data: data, encoding: .utf8);
            } catch {
                //NOOP
            }
            return rtv ?? "{}";
        }
        
        static public func GetDic<T>(_ Self:Dictionary<String,T>, _ key:String)->Dictionary<String, Any?>{
            let valO:Any?=Self[key];
            if let val=valO {
                return (val as? Dictionary<String, Any?>) ?? [:];
            }else{
                return [:];
            }
        }
        
        static public func GetString<T>(_ Self:Dictionary<String,T>, _ key:String)->String{
            let val=Self[key];
            if val != nil {
                let obj=val as AnyObject;
                return "\(obj)";
            }else{
                return "";
            }
        }
        static public func GetInt<T>(_ Self:Dictionary<String,T>, _ key:String)->Int{
            let valO:Any?=Self[key];
            if let val = valO {
                if val is Int {
                    return val as! Int;
                }
                if val is Int32 {
                    return Int(val as! Int32);
                }
                
                return Int(GetString(Self, key)) ?? 0;
            }else{
                return 0;
            }
        }
    }
    
    
    
    
    
    
    
    
    //*********ThreadX.swift******************
    public class ThreadX{
        private init(){};
        
        static public func Sleep(_ millisecond:Int){
            Thread.sleep(forTimeInterval: TimeInterval(Double(millisecond)/1000.0));
        }
        
        /**
         * 后台运行任务
         */
        static public func Run(_ run:@escaping ()->Void){
            DispatchQueue.global().async {
                run();
            }
        }
        
        /**
         * 在主ui线程执行
         */
        static public func UI(_ run:@escaping ()->Void){
            DispatchQueue.main.async {
                run();
            }
        }
        
        /**
         * 定时在后台执行任务，返回值可通过ClearTimeout来终止定时任务
         */
        static public func SetTimeout(_ timeoutMillisecond:Int, _ run:@escaping ()->Void)->Int{
            return __SetTimeout(DispatchQueue.global(), timeoutMillisecond, run);
        }
        static private func __SetTimeout(_ queue:DispatchQueue, _ timeoutMillisecond:Int, _ run:@escaping ()->Void)->Int{
            let timer=DispatchSource.makeTimerSource(flags: [], queue: queue);
            
            objc_sync_enter(Lock);
            defer{
                objc_sync_exit(Lock);
            }
            let obj=Timeout();
            obj.timer=timer;
            intIdx+=1;
            obj.idx=intIdx;
            intTimes.updateValue(obj, forKey: obj.idx);
            
            timer.schedule(deadline: .now()+Double(timeoutMillisecond)/1000);
            timer.setEventHandler{
                obj.timer?.cancel();
                obj.timer=nil;
                if(obj.isCancel){
                    return;
                }
                ClearTimeout(obj.idx);
                
                run();
            };
            timer.resume();
            return obj.idx;
        }
        /**
         * 取消定时任务
         */
        static public func ClearTimeout(_ set:Int){
            objc_sync_enter(Lock);
            defer{
                objc_sync_exit(Lock);
            }
            
            if let obj=intTimes.removeValue(forKey: set) {
                obj.timer?.cancel();
                obj.timer=nil;
                obj.isCancel=true;
            }
        }
        
        static private var intIdx=100;
        static private let Lock="";
        static private var intTimes: [Int:Timeout]=[:];
        private class Timeout{
            public var timer:DispatchSourceTimer? = nil;
            public var isCancel:Bool = false;
            public var idx:Int=0;
        }
    }
}

public protocol RecordApp_ILog{
    func i(_ tag:String, _ msg:String);
    func e(_ tag:String, _ msg:String);
}
