import UIKit
import WebKit
import AVFoundation

/* 录音Hybrid App Demo界面 https://github.com/xiangyuecn/Recorder
 没什么有用的东西 */
class MainView: UIViewController {
    static private let LogTag="MainView";
    
    //实现prompt webview uiDelegate
    public class WebUI:NSObject,WKUIDelegate {
        weak var View:MainView?;
        public init(_ view:MainView){
            View=view;
        }
        
        public func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
            //如果是js bridge的请求，就接管并处理它
            if let data=View?.jsBridge.acceptPrompt(prompt) {
                completionHandler(data);
                return;
            }
            
            //此方法还需实现prompt弹框
            completionHandler(nil);
        }
        //此类还需实现alert，confirm弹框
    }
    
    
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        Log=LogX(self);
        let microphoneUsesPermission:RecordAppJsBridge.MicrophoneUsesPermission={ [weak self] call in
            self?.reqMicrophonePermission(call);
        };
        let config=WKWebViewConfiguration();
        
        //******调用核心方法*********************
        //注入JsBridge, 实现api接口
        jsBridge=RecordAppJsBridge(config, microphoneUsesPermission, Log){ [weak self] code in
            self?.webView.evaluateJavaScript(code, completionHandler: nil);
        };
        //*******以下内容无关紧要*****************
        
        
        config.requiresUserActionForMediaPlayback=false;
        config.allowsInlineMediaPlayback=true;
        config.allowsAirPlayForMediaPlayback=true;
        
        webView=WKWebView(frame: CGRect(x: 0, y: 0, width:self.view.bounds.width,height:self.view.bounds.height), configuration: config);
        webViewBox.addSubview(webView);
        
        webView.scrollView.bounces=false;
        webView.isOpaque=false;
        webView.backgroundColor=UIColor(red: 0xff/0xff, green: 0x66/0xff, blue: 0x00/0xff, alpha: 0xff/0xff);
        
        webUI=WebUI(self);
        webNav=WebNav(self);
        webView.uiDelegate = webUI;
        webView.navigationDelegate = webNav;
        
        let url="https://xiangyuecn.github.io/Recorder/app-support-sample/";
        webView.load(URLRequest(url: URL(string: url)!));
        
        
        
        logs.text="日志输出已开启\n"+MainView.cmds;
        logsChange=LogsChange(self);
        logs.delegate=logsChange;
    }
    
    
    
    
    @IBOutlet weak var logs: UITextView!
    @IBOutlet weak var webViewBox: UIView!
    
    public var webView: WKWebView!;
    private var webUI: WebUI!;
    private var webNav: WebNav!;
    private var logsChange: LogsChange!;
    private var jsBridge: RecordAppJsBridge!;
    private var Log: RecordApp_ILog!;
    
    deinit {
        jsBridge?.close();
    }
    
    
    
    
    
    //输入命令处理
    static let cmds="支持命令(首行输入，不含引号)：\n`:url:网址::`导航到此地址\n`:reload:::`重新加载当前页面\n`:js:js代码::`执行js";
    public class LogsChange:NSObject, UITextViewDelegate{
        public init(_ view:MainView){
            View=view;
        }
        weak private var View:MainView!;
        
        public func textViewDidChange(_ textView: UITextView) {
            let s=textView.text!;
            if s.count>0 && s.starts(with: ":") {
                var txt="\n\n命令已执行，"+MainView.cmds+"\n\n";
                let exp=try! NSRegularExpression(pattern: "^:(.+?):(.*)::", options: []);
                let match=exp.firstMatch(in: s, options: [], range: NSRange(location: 0, length:s.count));
                if let m=match {
                    let r1=m.range(at: 1),r2=m.range(at: 2);
                    let m1=String(s[s.index(s.startIndex, offsetBy: r1.location)..<s.index(s.startIndex, offsetBy: r1.location+r1.length)]);
                    let m2=String(s[s.index(s.startIndex, offsetBy:r2.location)..<s.index(s.startIndex, offsetBy:r2.location+r2.length)]);
                    switch(m1) {
                    case "url":
                        if let url=URL(string: m2) {
                            View.webView.load(URLRequest(url: url));
                        }
                        break;
                    case "reload":
                        View.webView.reload();
                        break;
                    case "js":
                        View.webView.evaluateJavaScript(m2, completionHandler: nil);
                        break;
                    default:
                         txt+="，未知命令"+m1;
                    }
                    txt+="\n"+s;
                    textView.text=txt;
                }
            }
        }
    }
    
    
    
    
    
    
    //录音权限处理
    private func reqMicrophonePermission(_ call:@escaping (Bool)->Void){
        let statues = AVAudioSession.sharedInstance().recordPermission
        if statues == .undetermined {
            AVAudioSession.sharedInstance().requestRecordPermission { [weak self] (granted) in
                if granted {
                    call(true);
                } else {
                    self?.reqMicrophonePermission(call);
                }
            }
        } else if statues == .granted {
            call(true);
        } else {
            self.Log.e(MainView.LogTag, "没有录音权限，请到设置中允许访问麦克风，demo就不弹到设置的对话框了");
            
            call(false);
        }
    }
    
    
    
    //日志输出
    public class LogX:RecordApp_ILog{
        weak var View:MainView?;
        public init(_ view:MainView){
            View=view;
        }
        
        public func i(_ tag: String, _ msg: String) {
            printX("[i]["+tag+"]"+msg);
        }
        public func e(_ tag: String, _ msg: String) {
            printX("[e]["+tag+"]"+msg);
        }
        
        var msgs="";
        var waitInt=0;
        private func printX(_ s:String){
            let msg="["+time()+"]"+s;
            print(msg);
            
            msgs+="\n\n"+msg;
            
            //延迟在主线程更新日志文本框
            if(waitInt==0) {
                waitInt = RecordAppJsBridge.ThreadX.SetTimeout(500){
                    self.waitInt=0;
                    RecordAppJsBridge.ThreadX.UI {
                        var txt=self.View?.logs.text ?? "";
                        if(txt.count>250*1024){
                            txt=String(txt.suffix(200*1024));
                        }
                        txt=txt+self.msgs;
                        self.msgs="";
                        
                        self.View?.logs.text=txt;
                        self.View?.logs.scrollRangeToVisible(NSRange.init(location:txt.count, length: 0));
                    }
                }
            }
        }
        var f:DateFormatter?;
        private func time()->String{
            if(f==nil){
                f = DateFormatter();
                f!.locale = Locale.init(identifier: "zh_CN");
                f!.dateFormat = "HH:mm:ss";
            }
            return f!.string(from: Date());
        }
    }
    
    
    
    //监控网页请求
    public class WebNav:NSObject, WKNavigationDelegate{
        public init(_ main:MainView){
            view=main;
        }
        weak var view:MainView!;
        
        public func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            view.Log.i(MainView.LogTag, "打开网页："+(webView.url?.absoluteString ?? ""));
        }
        public func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            view.Log.e(MainView.LogTag, "打开网页失败："+error.localizedDescription+" url:"+(webView.url?.absoluteString ?? ""));
        }
    }
}

