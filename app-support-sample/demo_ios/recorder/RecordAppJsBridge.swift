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
    public func runScript_JsBridge(_ commJs:String,_ funCall:String,_ postMessage:String){
        //如果顶层window没有JsBridge的请求对象，就通过postMessage进行转发，可能是iframe跨域
        runScript("(function(){\n" +
                commJs +
                "\n;if(window['" + RecordAppJsBridge.JsRequestName + "']){\n" +
                    funCall +
                "\n}else{" +
                    "\nvar iframes=document.querySelectorAll('iframe');" +
                    "\nfor(var i=0;i<iframes.length;i++){" +
                        "\niframes[i].contentWindow.postMessage(" + postMessage + ",'*')" +
                    "\n}" +
                "\n}\n})()"
        );
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
            jsBridge?.runScript_JsBridge(
                    "var json=" + Code.ToJson(json) + ";" +
                            "var postMsg={type:'" + RecordAppJsBridge.JsRequestName + "',action:'Call',data:json};"
                    , RecordAppJsBridge.JsRequestName + ".Call(json);"
                    , "postMsg"
            );
            
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
                req.jsBridge.Log.i(LogTag, "录音参数: "+Code.ToJson(param));
                
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
    , "Async_debugInfo":{ req in
        //获取app的内存占用大小
        var memoryUsage = Int64(-1);
        var vmInfo = task_vm_info_data_t();
        var count = mach_msg_type_number_t(MemoryLayout<task_vm_info>.size)/4;
        let result: kern_return_t = withUnsafeMutablePointer(to: &vmInfo) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
            }
        }
        if result == KERN_SUCCESS {
            memoryUsage = Int64(vmInfo.phys_footprint);
        }
        
        var rtv=[:];
        rtv["appMemoryUsage"]=memoryUsage;
        req.callback(rtv, nil);
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
            
            RecordApis.Current=self;
            
            let session = AVAudioSession.sharedInstance()
            do {
                try session.setCategory(AVAudioSession.Category.playAndRecord, options:[.mixWithOthers, .allowBluetooth]);
                //try session.setPreferredIOBufferDuration(0.093); //指定录音帧时长，会导致蓝牙耳机录音不正常，0.005正常
                try session.setActive(true);
                SessionActive=true;
            } catch let err {
                main.Log.e(RecordApis.LogTag, "设置录音环境出错:"+err.localizedDescription);
                ready("设置录音环境出错:"+err.localizedDescription);
                return;
            }
            
            //初始化AudioUnit
            var aDesc=AudioComponentDescription();
            aDesc.componentType = kAudioUnitType_Output;
            aDesc.componentSubType = kAudioUnitSubType_RemoteIO;
            //aDesc.componentSubType = kAudioUnitSubType_VoiceProcessingIO //回声消除AEC
            aDesc.componentManufacturer = kAudioUnitManufacturer_Apple;
            aDesc.componentFlags = 0;
            aDesc.componentFlagsMask = 0;
            let aComp = AudioComponentFindNext(nil, &aDesc);
            var aState = AudioComponentInstanceNew(aComp!, &AUnit);
            if(aState == 0){
                //打开音频输入
                var enableFlag: UInt32 = 1;
                aState=AudioUnitSetProperty(AUnit, kAudioOutputUnitProperty_EnableIO, kAudioUnitScope_Input, 1, &enableFlag, UInt32(MemoryLayout<UInt32>.size))
            }
            if(aState == 0){
                //音频参数
                var aFormat=AudioStreamBasicDescription();
                aFormat.mSampleRate = Double(sampleRate);
                aFormat.mFormatID = kAudioFormatLinearPCM;
                aFormat.mFormatFlags = kAudioFormatFlagIsSignedInteger | kAudioFormatFlagIsPacked;
                aFormat.mChannelsPerFrame = 1;//单声道
                aFormat.mBitsPerChannel = 16;//16位
                aFormat.mFramesPerPacket = 1;//每个包有多少帧
                aFormat.mBytesPerFrame = 2;//每一帧有多少字节
                aFormat.mBytesPerPacket = 2;//每一包有多少字节
                aState = AudioUnitSetProperty(AUnit, kAudioUnitProperty_StreamFormat, kAudioUnitScope_Output, 1, &aFormat, UInt32(MemoryLayout<AudioStreamBasicDescription>.size));
                if(aState==0){
                    aState = AudioUnitSetProperty(AUnit, kAudioUnitProperty_StreamFormat, kAudioUnitScope_Input, 0, &aFormat, UInt32(MemoryLayout<AudioStreamBasicDescription>.size));
                }
            }
            if(aState == 0){
                //音频数据回调
                var aCB = AURenderCallbackStruct(
                    inputProc: self.onRecFrame,
                    inputProcRefCon: UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque())
                );
                aState = AudioUnitSetProperty(AUnit, kAudioOutputUnitProperty_SetInputCallback, kAudioUnitScope_Output, 1, &aCB, UInt32(MemoryLayout<AURenderCallbackStruct>.size));
            }
            if(aState == 0){
                //开始录音
                aState = AudioUnitInitialize(AUnit);
                if(aState==0){
                    aState = AudioOutputUnitStart(AUnit);
                }
            }
            if(!(aState==0)){
                main.Log.e(RecordApis.LogTag, "初始化AudioUnit出错["+String(aState)+"]");
                ready("初始化AudioUnit出错["+String(aState)+"]");
                return;
            }
            
            ready(nil);
            
            isRec=true;
            alive();
            main.Log.i(RecordApis.LogTag, "开始录音："+String(sampleRate));
            startTime=Code.GetMS();
        }
        private var main:RecordAppJsBridge!;
        private var sampleRate:Int;
        private var AUnit:AudioComponentInstance!;
        private var SessionActive=false;
        private var isRec=false;
        private var aliveInt=0;
        private var startTime=Int64(0);
        
        private func destroy(){
            objc_sync_enter(Lock);
            defer{
                objc_sync_exit(Lock);
            }
            
            RecordApis.Current=nil;
            
            isRec=false;
            main=nil;
            
            ThreadX.ClearTimeout(aliveInt);
            
            if(AUnit != nil){
                AudioOutputUnitStop(AUnit);
                AudioUnitUninitialize(AUnit);
                AudioComponentInstanceDispose(AUnit);
                AUnit=nil;
            }
            if(SessionActive){
                SessionActive=false;
                try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation);
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
            main.Log.i(RecordApis.LogTag, "结束录音，(cb:"+String(recCbCount)+") 已录制："+String(sendCount)+"段 "+String(duration)+"ms start到stop："+String(Code.GetMS()-startTime)+"ms");
            
            callback(nil);
            
            destroy();
        }
        
        private var readTotal=0;
        private var duration=0;
        private var recCbCount=0;
        private var sendCount=0;
        private var sendBuffer=NSMutableData();
        private var firstLog=false;
        private let onRecFrame: AURenderCallback = { (inRefCon, ioActionFlags, inTimeStamp, inBusNumber, inNumberFrames, ioData ) -> OSStatus in
            if(Current==nil || !Current.isRec){ return 0; }
            let size = inNumberFrames * 2;
            let buffer = AudioBuffer(mNumberChannels:1, mDataByteSize: size, mData: malloc(Int(size)));
            var bufferList = AudioBufferList(mNumberBuffers: 1, mBuffers: buffer);
            
            let status = AudioUnitRender(Current.AUnit, ioActionFlags, inTimeStamp, 1, inNumberFrames, &bufferList);
            if(!(status==0)){
                free(buffer.mData);
                Current.main.Log.e("录音实时处理", "AudioUnitRender错误["+String(status)+"]");
                return 0;
            }
            
            let data=Data.init(bytes: buffer.mData!, count: Int(buffer.mDataByteSize));
            free(buffer.mData);
            Current.onRecFrame__Exec(data);
            return 0;
        }
        private func onRecFrame__Exec(_ data:Data){
            recCbCount+=1;
            //先写入缓冲，未配置setPreferredIOBufferDuration回调太快
            sendBuffer.append(data);
            let frameSize=max(data.count, sampleRate*2/12); //录音帧时长 1000/12
            if(sendBuffer.count<frameSize){
                return;
            }
            let d1=sendBuffer.subdata(with: NSMakeRange(0, frameSize));
            let d2=sendBuffer.subdata(with: NSMakeRange(frameSize, sendBuffer.count-frameSize));
            sendBuffer.setData(d2);
            
            readTotal+=d1.count;
            duration=readTotal/(sampleRate/1000)/2;
            sendCount+=1;
            main.runScript_JsBridge(
            "var b64=\"" + d1.base64EncodedString() + "\";" +
                    "var sampleRate=\(sampleRate);" +
                    "var postMsg={type:'" + RecordAppJsBridge.JsRequestName + "',action:'Record',data:{pcmDataBase64:b64,sampleRate:sampleRate}};"
            , RecordAppJsBridge.JsRequestName + ".Record(b64,sampleRate)"
            , "postMsg" );
            
            if(!firstLog){
                main.Log.i(RecordApis.LogTag, "获取到了第一段录音数据：len:\(d1.count) sampleRate:\(sampleRate)");
                firstLog=true;
            }
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
