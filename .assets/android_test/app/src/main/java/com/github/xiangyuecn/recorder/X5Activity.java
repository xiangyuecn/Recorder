package com.github.xiangyuecn.recorder;

import android.os.Build;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import com.tencent.smtt.sdk.WebChromeClient;
import com.tencent.smtt.sdk.WebSettings;
import com.tencent.smtt.sdk.WebView;

public class X5Activity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_x5);

        WebView webview= (WebView)findViewById(R.id.x5webview);
        WebSettings set=webview.getSettings();
        set.setJavaScriptEnabled(true);
        set.setDefaultTextEncodingName("utf-8");
        set.setDomStorageEnabled(true);
        set.setDatabaseEnabled(true);

        this.setTitle("Recorder测试 腾讯X5");

        webview.loadUrl("https://xiangyuecn.github.io/Recorder/");
    }
}
