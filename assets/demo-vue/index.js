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
        <div class="topHead"></div>
    </template>

    <template #bottom>
		<div class="bottomBox"></div>
    </template>
</MainView>
    `
});


window.vue_vue=Vue;
window.vue_root=root;
window.vue_main=root.$refs.mainView;
console.log("mainView",vue_main);
console.log("Vue",Vue);
console.log("Recorder",vue_main.Rec);