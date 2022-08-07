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
            <a href="https://github.com/xiangyuecn/Recorder" target="_blank">GitHub</a>
			| <a href="https://gitee.com/xiangyuecn/Recorder" target="_blank">Gitee</a>
            
            <div style="padding-top:10px;color:#666">
			    更多Demo：
                <a class="lb" href="https://xiangyuecn.gitee.io/recorder/" target="_blank">Recorder H5</a>
                <a class="lb" href="https://xiangyuecn.gitee.io/recorder/QuickStart.html" target="_blank">H5 QuickStart</a>
				<a class="lb" href="https://xiangyuecn.gitee.io/recorder/assets/工具-代码运行和静态分发Runtime.html" target="_blank">Demo列表(可编辑)</a>
                <a class="lb" href="https://jiebian.life/web/h5/github/recordapp.aspx" target="_blank" style="text-decoration: line-through">RecordApp</a>
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


window.vue_vue=Vue;
window.vue_root=root;
window.vue_main=root.$refs.mainView;
console.log("Vue",Vue);
console.log("Recorder",vue_main.Rec);