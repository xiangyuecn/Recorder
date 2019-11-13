package com.github.xianyuecn.recorder;

import android.annotation.SuppressLint;
import android.content.Context;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Build;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.Closeable;
import java.io.File;
import java.io.FileOutputStream;
import java.util.HashMap;
import java.util.Timer;
import java.util.TimerTask;

/* 录音Hybrid App核心支持文件 https://github.com/xiangyuecn/Recorder

 【使用】
     1. copy本文件即可使用，其他文件都是多余的
     2. 在manifest中配置麦克风的权限声明：RECORD_AUDIO、MODIFY_AUDIO_SETTINGS
     3. 把WebView传进来进行对象注入；实现一个录音权限请求接口；实现一个Log接口，简单内部调用一下android.util.Log.i|e即可
     4. 调用close进行清理资源和销毁对象

 【为什么不用UserAgent来识别App环境】
    通过修改WebView的UA来让H5、服务器判断是不是在App里面运行的，此方法非常简单而且实用。但有一个致命缺陷，当UA数据很敏感的场景下，虽然方便了我方H5、服务器来识别这个App，但也同时也暴露给了任何在此WebView中发起的请求，不可避免的会将我们的标识信息随请求而发送给第三方（虽然可通过额外编程把信息抹掉，但代价太大了）。IOS不动UA基本上别人的服务器几乎不太可能识别出我们的App，Android神一样的把包名添加到了X-Requested-With请求头中，还能不能讲理了。
*/
public class RecordAppJsBridge implements Closeable {
    //js中定义的名称
    static private final String JsBridgeName="RecordAppJsBridge";
    static private final String JsRequestName="AppJsBridgeRequest";

    //默认会把录音数据额外存储到app外部存储的cache目录中，仅供分析调试之用
    static private final boolean SavePCM_ToLogFile=true;

    static private final String LogTag="RecordAppJsBridge";



    /**
     * 录音JsBridge，本文件定义了js如何和Android交互，和js可以调用的接口列表
     * @param webView 要注入的webview
     * @param usesPermission 权限由外部调用进行处理，本文件不处理这种渣渣
     * @param log 一个可控的log
     */
    @SuppressLint({"AddJavascriptInterface", "JavascriptInterface"})
    public RecordAppJsBridge(Context context, WebView webView, UsesPermission usesPermission, ILog log){
        this.context=context;
        this.webView=webView;
        this.usesPermission=usesPermission;
        this.Log=log;
        jsObject=new JsObject();

        //注入js对象
        webView.addJavascriptInterface(jsObject, JsBridgeName);
    }



    private Context context;
    private WebView webView;
    private UsesPermission usesPermission;
    private ILog Log;
    private JsObject jsObject;
    @Override
    public void close() {
        context=null;
        webView=null;
        usesPermission=null;
        jsObject=null;
    }


    /**
     * 执行js代码
     */
    public void runScript(final String code){
        webView.post(new Runnable() {
            @Override
            public void run() {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    webView.evaluateJavascript(code, null);
                }else {
                    webView.loadUrl("javascript:" + code);
                }
            }
        });
    }



    public class JsObject {
        /**
         * 只需提供一个方法，接受请求，然后同步或异步返回响应
         */
        @JavascriptInterface
        public String request(String data) {
            JSONObject json;
            try {
                json = new JSONObject(data);
            } catch (JSONException e) {
                JSONObject response = new JSONObject();
                try {
                    response.put("status", "");
                    response.put("message", "请求数据json无效：" + e.getMessage());
                }catch (JSONException ig){
                    //NOOP
                }
                return response.toString();
            }


            JSONObject response = new Request(RecordAppJsBridge.this, json).exec();
            return response.toString();
        }
    }












    //**********工具类****************************
    public interface UsesPermission {
        /**
         * 请求用户权限，如果keys全部有权限，回调True，任何一个没有权限回调False
         */
        void Request(String[] keys, Runnable True, Runnable False);
    }
    public interface ILog {
        void i(String tag, String msg);
        void e(String tag, String msg);
    }
    public interface Callback<T,V> {
        T Call(V result, Exception hasError);
    }
    static private void JSONSet(JSONObject json, String key, Object val){
        try{
            json.put(key, val);
        }catch (JSONException e){
            //NOOP
        }
    }
    static private JSONObject GetJSONObject(JSONObject json, String key){
        JSONObject rtv=json.optJSONObject(key);
        if(rtv==null){
            return new JSONObject();
        }
        return rtv;
    }






















    //*****Request.java**处理js请求**************************
    static private class Request{
        //接口命名规则：同步方法加Sync前缀，异步加Async，这里几个就手写调用一下，量多用反射调用
        public JSONObject exec(){
            try {
                switch (action) {
                    case "recordPermission":
                        isAsync=true;
                        RecordApis.Async_recordPermission(this);
                        break;
                    case "recordStart":
                        isAsync=true;
                        RecordApis.Async_recordStart(this);
                        break;
                    case "recordStop":
                        isAsync=true;
                        RecordApis.Async_recordStop(this);
                        break;
                    case "recordAlive":
                        isAsync=false;
                        RecordApis.Sync_recordAlive(this);
                        break;
                    default:
                        jsBridge.Log.e(LogTag, "request." + action + "不存在");
                        JSONSet(json, "message", "request." + action + "不存在");
                        __callback(true);
                        return json;
                }
            }catch (Exception e){
                jsBridge.Log.e(LogTag,"request."+action+"执行出错: "+e.getMessage());
                JSONSet(json,"message", "request."+action+"执行出错");
                __callback(true);
            }

            return json;
        }



        public Request(RecordAppJsBridge jsBridge, JSONObject msg){
            this.jsBridge=jsBridge;
            try {
                this.args = GetJSONObject(msg, "args");
                this.action = msg.optString("action");

                json = new JSONObject();
                json.put("status", "");
                json.put("message", "");
                json.put("action", action);
                json.put("callback", msg.optString("callback"));
            } catch (JSONException ig){
                //NOOP
            }
        }
        public RecordAppJsBridge jsBridge;
        private JSONObject json;
        public JSONObject args;
        private String action;
        private boolean isAsync;



        /**
         * 设置接口返回的value，并设置status为success
         */
        public void setValue(Object val){
            JSONSet(json,"status", "success");
            _setVal(val);
        }
        private void _setVal(Object val){
            JSONSet(json,"value", val);
        }

        /**
         * 仅仅设置返回的message数据
         */
        public void setMsg(String msg){
            JSONSet(json,"message", msg);
        }
        /**
         * 异步方法调用最终执行完毕时调用，异步方法专用
         */
        public void callback(Object val, String errOrNull){
            if(errOrNull!=null){
                _setVal(val);
                setMsg(errOrNull);
            }else{
                setValue(val);
            }

            __callback(false);
        }
        private void __callback(boolean isExecCall){
            jsBridge.runScript(JsRequestName+".Call(" + json.toString() + ");");

            if(!isExecCall && !isAsync){
                jsBridge.Log.e(LogTag,action+"不是异步方法，但调用了回调");
            }
            if(isSend){
                jsBridge.Log.e(LogTag,action+"重复回调");
            }
            isSend=true;
        }
        private boolean isSend=false;
    }








































    //*****RecordApis.java*****************************************
    static public class RecordApis {
        static private final String LogTag="RecordApis";

        static public void Async_recordPermission(final Request req) {
            checkPermission(req, new Callback<Object, Object>() {
                public Object Call(Object result, Exception hasError) {
                    if(result!=null){
                        req.callback(1, null);
                    }else{
                        req.callback(3, null);
                    }
                    return null;
                }
            });
        }
        static private void checkPermission(final Request req, final Callback<Object, Object> callback){
            req.jsBridge.usesPermission.Request(new String[]{"android.permission.RECORD_AUDIO"}, new Runnable() {
                @Override
                public void run() {
                    callback.Call("ok", null);
                }
            }, new Runnable() {
                @Override
                public void run() {
                    req.jsBridge.Log.e(LogTag, "用户拒绝了录音权限");
                    callback.Call(null, null);
                }
            });
        }



        static public void Sync_recordAlive(Request req){
            if(Current!=null){
                Current.alive();
                req.setValue(null);
            }else{
                req.setMsg("未开始任何录音");
            }
        }
        static public void Async_recordStart(final Request req){
            DestroyCurrent();

            checkPermission(req, new Callback<Object, Object>() {
                public Object Call(Object result, Exception hasError) {
                    if(result==null){
                        req.callback(null, "没有录音权限");
                        return null;
                    }

                    ThreadX.Run(new Runnable() {
                        @Override
                        public void run() {
                            _Start(req);
                        }
                    });
                    return null;
                }
            });
        }
        static private void _Start(final Request req){
            JSONObject param=GetJSONObject(req.args, "param");
            int sampleRate=param.optInt("sampleRate");
            if(sampleRate==0){
                sampleRate=16000;
            }

            new RecordApis().init(req.jsBridge, sampleRate, new Callback<Object, Object>() {
                public Object Call(Object result, Exception hasError) {
                    if(hasError!=null){
                        req.jsBridge.Log.e(LogTag, "开始录音失败"+hasError.toString());
                        req.callback(null, "无法开始录音："+hasError.getMessage());
                        DestroyCurrent();
                        return null;
                    }
                    req.callback(new JSONObject(), null);
                    return null;
                }
            });
        }


        static public void Async_recordStop(final Request req){
            if(Current==null){
                req.callback(null, "未开始任何录音");
                return;
            }

            Current.stop(new Callback<Object, Object>(){
                public Object Call(Object result, Exception hasError) {
                    if(hasError!=null){
                        req.jsBridge.Log.e(LogTag, "停止录音失败"+hasError.toString());
                        req.callback(null, "结束录音出错："+hasError.getMessage());
                        DestroyCurrent();//成功的不要Destroy还要打log
                        return null;
                    }
                    req.callback(new JSONObject(), null);
                    return null;
                }
            });
        }










        static private void DestroyCurrent(){
            if(Current!=null){
                Current.destroy();
            }
        }
        static private RecordApis Current;
        static private final int SampleRate=44100;




        synchronized private void init(RecordAppJsBridge main_, int sampleRateReq, Callback<Object, Object> ready){
            Current=this;
            this.main=main_;
            this.logData= RecordAppJsBridge.SavePCM_ToLogFile;
            this.sampleRateReq=sampleRateReq;

            if(logData){
                logStreamFull=new ByteArrayOutputStream();
                logStreamVal=new ByteArrayOutputStream();
            }
            try {
                rec = new AudioRecord(
                        MediaRecorder.AudioSource.MIC
                        , SampleRate
                        , AudioFormat.CHANNEL_IN_MONO
                        , AudioFormat.ENCODING_PCM_16BIT
                        , AudioRecord.getMinBufferSize(
                        SampleRate
                        , AudioFormat.CHANNEL_IN_MONO
                        , AudioFormat.ENCODING_PCM_16BIT)
                );

                rec.startRecording();
            }catch (Exception e){
                ready.Call(null, e);
                return;
            }

            if(rec.getRecordingState()!=AudioRecord.RECORDSTATE_RECORDING){
                ready.Call(null, new Exception("开启录音失败"));
                return;
            }

            ready.Call(null, null);

            isRec=true;
            alive();
            main.Log.i(LogTag, "开始录音："+sampleRateReq);
            startTime=System.currentTimeMillis();

            ThreadX.Run(new Runnable() {
                @Override
                public void run() {
                    if(isRec) {//Sync Check
                        readThread = Thread.currentThread();
                        try {
                            readAsync();
                        } catch (Exception e) {
                            if(main!=null) {//Sync Check
                                main.Log.e(LogTag, "录音中途出现异常:" + e.toString());
                            }
                        }
                        readThread = null;
                    }
                }
            });
        }
        private RecordAppJsBridge main;
        private int sampleRateReq;
        private AudioRecord rec;
        private boolean isRec;
        private int aliveInt;
        private long startTime;
        private Thread readThread;

        private boolean logData;
        private ByteArrayOutputStream logStreamFull;
        private ByteArrayOutputStream logStreamVal;

        synchronized private void destroy(){
            Current=null;

            isRec=false;
            main=null;

            ThreadX.ClearTimeout(aliveInt);

            if(readThread!=null){
                readThread.interrupt();
                readThread=null;
            }

            if(logStreamFull!=null){
                try {
                    logStreamFull.close();
                    logStreamVal.close();
                }catch (Exception e){
                    //NOOP
                }
                logStreamFull=null;
                logStreamVal=null;
            }

            if(rec!=null){
                try {
                    rec.stop();
                }catch (Exception e){
                    //NOOP
                }
                try {
                    rec.release();
                }catch (Exception e){
                    //NOOP
                }
                rec=null;
            }
        }

        private void alive(){
            ThreadX.ClearTimeout(aliveInt);
            aliveInt=ThreadX.SetTimeout(10 * 1000, new Runnable() {
                @Override
                public void run() {
                    if(main!=null) {//Sync Check
                        main.Log.e(LogTag, "录音超时自动停止：超过10秒未调用alive");
                    }
                    destroy();
                }
            });
        }

        private void stop(Callback<Object, Object> callback){
            if(!isRec){
                callback.Call(null, new Exception("未开始录音"));
                return;
            }
            if(readTotal==0){
                callback.Call(null, new Exception("未获得任何录音数据"));
                return;
            }

            isRec=false;
            main.Log.i(LogTag, "结束录音，已录制："+sendCount+"段 "+duration+"ms start到stop："+(System.currentTimeMillis()-startTime)+"ms");

            callback.Call(null, null);

            if(logData) {
                try {
                    byte[] fullArr=logStreamFull.toByteArray();
                    savePcmLogFile("record-full.pcm", fullArr);

                    lostBytes=new byte[0];
                    savePcmLogFile("record-full2.pcm", sampleData(fullArr, fullArr.length, sampleRateReq, rec.getSampleRate()));

                    savePcmLogFile("record-val.pcm", logStreamVal.toByteArray());
                } catch (Exception e) {
                    main.Log.e(LogTag, "保存文件失败"+e.toString());
                }
            }
            destroy();
        }
        private void savePcmLogFile(String name, byte[] data) throws Exception{
            File folder = main.context.getExternalCacheDir();
            if (folder == null) {
                folder = main.context.getCacheDir();
            }
            File file=new File(folder, "/recorder/"+name);
            file.getParentFile().mkdirs();

            FileOutputStream out = new FileOutputStream(file);

            try {
                out.write(data);
            }finally {
                out.close();
            }
        }




        private int readTotal=0;
        private int duration=0;
        private int sendCount=0;
        private void readAsync(){
            int sampleRateSrc=rec.getSampleRate();
            int bufferLen=(sampleRateSrc/12)*2;//每秒返回12次，按Int16需要乘2
            bufferLen+=bufferLen%2;//保证16位
            byte[] buffer=new byte[bufferLen];

            boolean firstLog=false;

            while (isRec && !Thread.currentThread().isInterrupted()){
                int count=rec.read(buffer, 0, buffer.length);
                if(!isRec || Thread.currentThread().isInterrupted()){
                    return;
                }
                if(count<1){
                    ThreadX.Sleep(5);
                    continue;
                }
                if(logData) {
                    logStreamFull.write(buffer, 0, count);
                }
                readTotal+=count;
                duration=readTotal/(sampleRateSrc/1000)/2;


                int sampleRate;
                byte[] data;
                //需要的数据小于源采样，重新采样
                if(sampleRateSrc>sampleRateReq){
                    sampleRate=sampleRateReq;

                    data=sampleData(buffer, count, sampleRate, sampleRateSrc);
                }else{
                    sampleRate=sampleRateSrc;
                    data=new byte[count];
                    System.arraycopy(buffer, 0, data, 0, count);
                }

                if(logData) {
                    logStreamVal.write(data, 0, data.length);
                }
                sendCount++;
                main.runScript(JsRequestName+".Record(\""+ Base64.encodeToString(data, Base64.NO_WRAP)+"\","+sampleRate+")");

                if(!firstLog){
                    main.Log.i(LogTag, "获取到了第一段录音数据：len:"+data.length+" lenSrc:"+count+" bufferLen:"+bufferLen+" sampleRateReq:"+sampleRateReq+" sampleRateSrc:"+sampleRateSrc+" sampleRateCallback:"+sampleRate);
                    firstLog=true;
                }
            }
        }


        private byte[] lostBytes=new byte[0];
        /**
         * 对采样率进行转换
         */
        private byte[] sampleData(byte[] data, int count, int newSampleRate, int oldSampleRate){
            //先把字节转成Int16Array（注意是有符号n<<16>>16），省的拼接的麻烦还绕
            int arrLen=(lostBytes.length+count)/2;
            int[] arr=new int[arrLen];
            int dataStart=0,arrIdx=0;
            for(int i=0,il=lostBytes.length-1;i<=il;){
                if(i==il){
                    dataStart=1;
                    arr[arrIdx++]=(( (lostBytes[i++]&0xff) | (data[0]&0xff)<<8)<<16)>>16;
                }else{
                    arr[arrIdx++]=(( (lostBytes[i++]&0xff) |(lostBytes[i++]&0xff)<<8 )<<16)>>16;
                }
            }
            for(int i=dataStart;arrIdx<arrLen;){
                arr[arrIdx++]=(( (data[i++]&0xff) | (data[i++]&0xff)<<8 )<<16)>>16;
            }


            // https://www.cnblogs.com/xiaoqi/p/6993912.html
            // 当前点=当前点+到后面一个点之间的增量，音质比直接简单抽样好些
            double step=1d*oldSampleRate / newSampleRate;

            int size=(int)Math.floor(arr.length/step)*2;
            byte[] rtv = new byte[size];

            int idx=0;
            double i=0;
            while(idx<size){
                int before = (int)Math.floor(i);
                int after = (int)Math.ceil(i);
                double atPoint = i - before;

                int beforeVal=arr[before];
                int afterVal=arr[after];
                int newVal=(int)(beforeVal+(afterVal-beforeVal)*atPoint);

                rtv[idx++] = (byte) (newVal & 0xff);
                rtv[idx++] = (byte) ((newVal >> 8) & 0xff);

                i+=step;//抽样
            }

            //把剩余的扔给下一回合
            int lost=count+lostBytes.length-(int)Math.ceil(i)*2;
            if(lost>0){
                lostBytes=new byte[lost];
                System.arraycopy(data,count-lost, lostBytes, 0, lost);
            }else{
                lostBytes=new byte[0];
            }

            return rtv;
        }
    }































    //********ThreadX.java***************************
    static public class ThreadX {
        static public void Sleep(int millisecond){
            try {
                Thread.sleep(millisecond);
            } catch (InterruptedException e) {
                //NOOP
            }
        }
        /**
         * 定时在后台执行任务，返回值可通过ClearTimeout来终止定时任务
         */
        static public int SetTimeout(int timeoutMillisecond, Runnable run){
            Timeout time=new Timeout(run);

            int idx;
            synchronized (intTimes){
                idx=++intIdx;
                intTimes.put(idx+"",time);
            }

            time.idx=idx;
            if(timeoutMillisecond<0){
                timeoutMillisecond=0;
            }
            time.Schedule(timeoutMillisecond);
            return idx;
        }

        /**
         * 取消定时任务
         */
        static public void ClearTimeout(int set){
            synchronized (intTimes){
                Timeout time=intTimes.get(set+"");
                if(time!=null){
                    time.Cancel();
                }
                intTimes.remove(set+"");
            }
        }

        static private int intIdx=100;
        static private final HashMap<String, Timeout> intTimes=new HashMap<>();
        private static class Timeout extends TimerTask implements Runnable {
            public Timeout(Runnable run){
                this.run=run;
            }

            private Runnable run;
            private int idx;
            private boolean isCancel;
            private Timer scheduleTimer;

            public void Cancel(){
                run=null;
                isCancel=true;

                if(scheduleTimer !=null){
                    scheduleTimer.cancel();
                    scheduleTimer =null;
                }
            }
            public void Schedule(int timeoutMillisecond){
                scheduleTimer =new Timer();
                scheduleTimer.schedule(this, timeoutMillisecond);
            }

            @Override
            public void run() {
                if(isCancel){
                    return;
                }
                Runnable fn=run;
                ClearTimeout(idx);

                fn.run();
            }
        }

        /**
         * 后台运行任务
         */
        static public void Run(Runnable run){
            new Thread(run).start();
        }
    }
}
