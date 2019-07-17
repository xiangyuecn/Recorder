package com.github.xiangyuecn.recorder;

import android.content.Intent;
import android.os.Build;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.tencent.smtt.sdk.QbSdk;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        WebView webview= (WebView)findViewById(R.id.webview);
        WebSettings set=webview.getSettings();
        set.setJavaScriptEnabled(true);
        set.setDefaultTextEncodingName("utf-8");
        set.setDomStorageEnabled(true);
        set.setDatabaseEnabled(true);

        this.setTitle("Recorder测试 系统WebView");

        webview.setWebChromeClient(new WebChromeClient(){
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    request.grant(request.getResources());
                }
            }
        });

        webview.loadUrl("https://xiangyuecn.github.io/Recorder/");

        //后台准备X5内核
        QbSdk.initX5Environment(getApplicationContext(),  null);
    }


    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        MenuInflater inflater = getMenuInflater();
        inflater.inflate(R.layout.menu_main, menu);
        return true;
    }
    @Override
    public boolean onOptionsItemSelected(MenuItem item){
        switch (item.getItemId()) {
            case R.id.action_x5:
                Intent view=new Intent(this, X5Activity.class);
                startActivity(view);
                break;
        }
        return super.onOptionsItemSelected(item);
    }
}
