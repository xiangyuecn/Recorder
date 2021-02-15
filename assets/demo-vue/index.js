//使用带模板编译的Vue构建UI
import Vue from 'vue/dist/vue.esm';
import MainView from './component/recorder.vue';

var root=new Vue({
    el: ".rootView"
    ,data:{}
    ,components:{
        MainView:MainView
    }
    ,template:`
<MainView ref="mainView">
    <template #top>
        <div class="mainBox">
            <span style="font-size:32px;color:#0b1;">Recorder H5 vue+webpack测试</span>
            <a href="https://github.com/xiangyuecn/Recorder">GitHub >></a>
            
            <div style="padding-top:10px;color:#666">
			    更多Demo：
                <a class="lb" href="https://xiangyuecn.gitee.io/recorder/">Recorder H5</a>
                <a class="lb" href="https://jiebian.life/web/h5/github/recordapp.aspx">RecordApp</a>
                <a class="lb" href="https://jiebian.life/web/h5/github/recordapp.aspx?path=/assets/demo-vue/recordapp.html">RecordApp vue</a>
            </div>
        </div>
    </template>

    <template #bottom>
        <div class="mainBox">
            <div>本测试的码源码在<a href="https://github.com/xiangyuecn/Recorder/tree/master/assets/demo-vue">/assets/demo-vue</a>目录内，主要的文件为<a href="https://github.com/xiangyuecn/Recorder/blob/master/assets/demo-vue/component/recorder.vue">/assets/demo-vue/component/recorder.vue</a></div>
            
            <div style="margin-top:15px">源码修改后测试方法：
<pre style="background:green;color:#fff;padding:10px;">
> cnpm install
> npm run build-dev
</pre>
            然后就可以打开index.html查看效果了。</div>
        </div>
    </template>
</MainView>
    `
});





//皮一下，这种难看调用逻辑验证
var mainRef=root.$refs.mainView;
mainRef.reclog('<span style="color:#f60;font-weight:bold;font-size:24px">RecordApp[即将废弃] 除Recorder支持的外，支持Hybrid App，低版本IOS上支持微信网页和小程序web-view'+unescape("%uD83C%uDF89")+"</span>");
mainRef.reclog('<span style="color:#0b1;font-weight:bold;font-size:24px">Recorder H5使用简单，功能丰富，支持PC、Android、IOS 14.3+'+unescape("%uD83D%uDCAA")+"</span>");

mainRef.reclog(`<span style="color:green">绿油油的一大片，真有食欲</span>${unescape('%uD83D%uDE02')} 当前浏览器<span style="color:${mainRef.Rec.Support()?'green">支持录音':'red">不支持录音'}</span>`);

var logMeta=function(n,v){
    mainRef.reclog('<span style="color:#f60">'+n+":</span> <span style='color:#999'>"+v+"</span>");
};
logMeta(`本页面修改时间（有可能修改了忘改）`,'2020-11-25 21:43:09');
logMeta(`Recorder库修改时间（有可能修改了忘改）`,mainRef.Rec.LM);
logMeta(`UA`,navigator.userAgent);
logMeta(`URL`,location.href.replace(/#.*/g,""));
logMeta(`Vue`,Vue.version);
mainRef.reclog("点击打开录音，然后再点击开始录音",2);


window.vue_root=root;
window.vue_main=mainRef;
console.log("Vue",Vue);
console.log("Recorder",mainRef.Rec);