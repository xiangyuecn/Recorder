<template>
<view>
	<view style="padding:5px 10px 0">
		<view style="font-size:24px;color:#f60">Recorder App uni-app测试</view>
		<view style="font-size:13px">本测试项目支持打包成：H5网页、Android App、iOS App、微信小程序，支持Vue2、Vue3</view>
	</view>
	
	<testMain ref="testMain"></testMain>
	
	<view style="margin-top:80px;height:10px;background:#eee"></view>
	<testPerfRenderjs></testPerfRenderjs>
	<view style="padding-top:80px"></view>
</view>
</template>

<script>
import testMain from './main_recTest.vue';
import testPerfRenderjs from './test_perf_renderjs___.vue';

export default {
	components:{
		testMain, testPerfRenderjs
	},
	mounted(){
		//onShow可能比mounted先执行，页面准备好了时再执行一次
		this.$refs.testMain.uniPage__onShow();
	},
	onShow(){
		//使用到录音的页面onShow时必须进行调用；如果是在组件中录音，就由页面转发进去
		if(this.$refs.testMain){//onShow可能比mounted先执行，页面可能还未准备好
			this.$refs.testMain.uniPage__onShow();
		}
	}
}
</script>
