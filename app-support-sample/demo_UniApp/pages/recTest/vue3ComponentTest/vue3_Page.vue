<!-- uni-app内使用RecordApp录音
GitHub: https://github.com/xiangyuecn/Recorder/tree/master/app-support-sample/demo_UniApp
DCloud 插件市场下载组件: https://ext.dcloud.net.cn/plugin?name=Recorder-UniCore
-->

<template>
<view> <!-- 最外层最好是有唯一个view，否则可能会出现各种莫名其妙的bug -->
	<view style="padding:5px 10px 0">
		<view><text style="font-size:24px;color:#0b1">vue3子组件内可用性测试</text></view>
		<view><text style="font-size:13px;color:#f60">测试不同类型的子组件：组合式 API (Composition API) 、选项式 API (Options API) ，是否能正确获取到renderjs所在的WebView和页面实例。</text></view>
	</view>
	
	<view style="height:20px"></view>
	<view style="background:#e8fffe;padding:20px 0">
		<view style="font-weight:bold;padding:0 10px">组合式Composition API子组件测试</view>
		<CompositionAPI />
	</view>
	
	<view style="height:20px"></view>
	<view style="background:#e8f4ff;padding:20px 0">
		<view style="font-weight:bold;padding:0 10px">选项式Options API子组件测试</view>
		<OptionsAPI />
	</view>

</view>
</template>

<script setup>
import CompositionAPI from './component_CompositionAPI.vue';
import OptionsAPI from './component_OptionsAPI.vue';
</script>

