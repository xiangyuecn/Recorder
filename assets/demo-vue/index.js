//加载必须要的core，demo简化起见采用的直接加载类库，实际使用时应当采用异步按需加载
import Import_Recorder from 'recorder-core'
//需要使用到的音频格式编码引擎的js文件统统加载进来
import 'recorder-core/src/engine/mp3'
import 'recorder-core/src/engine/mp3-engine'
//可选的扩展
import 'recorder-core/src/extensions/waveview'


//使用带模板编译的Vue构建UI
import Vue from 'vue/dist/vue.esm';
import MainView from './component/main.vue';

var root=new Vue({
    el: ".rootView"
    ,data:{
        Rec:Import_Recorder
    }
    ,components:{
        MainView:MainView
    }
    ,template:`
<MainView ref="mainView">
    <template #top>
        <div class="mainBox">
            <span style="font-size:32px;color:#0b1;">Recorder vue+webpack测试</span>
            <a href="https://github.com/xiangyuecn/Recorder">GitHub >></a>
        </div>
    </template>

    <template #bottom>
        <div class="mainBox">
            <div>本测试的码源码在<a href="https://github.com/xiangyuecn/Recorder/tree/master/assets/demo-vue">/assets/demo-vue</a>目录内，主要的文件为<a href="https://github.com/xiangyuecn/Recorder/blob/master/assets/demo-vue/component/main.vue">/assets/demo-vue/component/main.vue</a></div>
            
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
mainRef.reclog(`<span style="color:green">绿油油的一大片，真有食欲</span>${unescape('%uD83D%uDE02')} 当前浏览器<span style="color:${root.Rec.Support()?'green">支持录音':'red">不支持录音'}</span>`);
var logMeta=function(n,v){
    mainRef.reclog('<span style="color:#f60">'+n+":</span> <span style='color:#999'>"+v+"</span>");
};
logMeta(`Vue`,Vue.version);
logMeta(`UA`,navigator.userAgent);
logMeta(`URL`,location.href.replace(/#.*/g,""));
mainRef.reclog("点击打开录音，然后再点击开始录音",2);


window.vue_root=root;
window.vue_main=mainRef;
console.log("Vue",Vue);
console.log("Recorder",Import_Recorder);