/*
录音
https://github.com/xiangyuecn/Recorder
src: app-support/app-miniProgram-wx-support.js
*/
!function(e){var n="object"==typeof window&&!!window.document,r=(n?window:Object).Recorder,t=r.i18n;!function(o,e,n,i){"use strict";var f="object"==typeof wx&&!!wx.getRecorderManager,_=o.RecordApp,b=_.CLog,c={Support:function(e){if(f&&i){var n=window,r=n.document,t=n.location,a=r.body;if(t&&t.href&&t.reload&&a&&a.appendChild)return b("识别是浏览器但又检测到wx",3),void e(!1)}e(f)},CanProcess:function(){return!0}};_.RegisterPlatform("miniProgram-wx",c),_.MiniProgramWx_onShow=function(){r()},c.RequestPermission=function(e,n,r){t(n,r)},c.Start=function(e,n,r,t){M.param=n;var a=o(n);a.set.disableEnvInFix=!0,a.dataType="arraybuffer",M.rec=a,_.__Rec=a,p(r,t)},c.Stop=function(n,t,r){d();var a=function(e){_.__Sync(n)&&(M.rec=null),r(e)},o=M.rec;M.rec=null;var e=t?"":_.__StopOnlyClearMsg();if(o){b("rec encode: pcm:"+o.recSize+" srcSR:"+o.srcSampleRate+" set:"+JSON.stringify(M.param));var i=function(){if(_.__Sync(n))for(var e in o.set)M.param[e]=o.set[e]};if(!t)return i(),void a(e);o.stop(function(e,n,r){i(),t(e,n,r)},function(e){i(),a(e)})}else a("未开始录音"+(e?" ("+e+")":""))};var s,M=function(e,n){var r=M.rec;if(r){r._appStart||r.envStart({envName:c.Key,canProcess:c.CanProcess()},n),r._appStart=1;for(var t=0,a=0;a<e.length;a++)t+=Math.abs(e[a]);r.envIn(e,t)}else b("未开始录音，但收到wx PCM数据",3)},u=!1,t=function(e,r){if(d(),y(),u)e();else{var t=wx.getRecorderManager(),a=1;t.onStart(function(){u=!0,a&&(a=0,v(t),e())}),t.onError(function(e){var n="请求录音权限出现错误："+e.errMsg;b(n+"。"+l,1,e),a&&(a=0,v(t),r(n,!0))}),m("req",t)}},l="请自行检查wx.getSetting中的scope.record录音权限，如果用户拒绝了权限，请引导用户到小程序设置中授予录音权限。",g=0,d=function(){var e=s;s=null,e&&v(e)},v=function(e){g=Date.now(),e.stop()},m=function(e,n){var r={duration:6e5,sampleRate:48e3,encodeBitRate:32e4,numberOfChannels:1,format:"PCM",frameSize:h?1:4},t=M.param||{},a=(t.audioTrackSet||{}).echoCancellation;if("android"==w.platform){var o=t.android_audioSource,i="";null==o&&a&&(o=7),null==o&&(o=_.Default_Android_AudioSource),1==o&&(i="mic"),5==o&&(i="camcorder"),6==o&&(i="voice_recognition"),7==o&&(i="voice_communication"),i&&(r.audioSource=i)}a&&b("mg注意：iOS下无法配置回声消除，Android无此问题，建议都启用听筒播放避免回声：wx.setInnerAudioOption({speakerOn:false})",3),b("["+e+"]mg.start obj",r),n.start(r)},r=function(){s&&s.__pause&&(b("mg onShow 录音开始恢复...",3),s.resume())},p=function(n,r){d(),y(),R={},h&&b("RecorderManager.onFrameRecorded 在开发工具中测试返回的是webm格式音频，将会尝试进行解码。开发工具中录音偶尔会非常卡，建议使用真机测试（各种奇奇怪怪的毛病就都正常了）",3);var a=!1,o=1,i=function(e){a||(a=!0,e?(d(),r(e)):n())},f=s=wx.getRecorderManager();f.onInterruptionEnd(function(){f==s&&(b("mg onInterruptionEnd 录音开始恢复...",3),f.resume())}),f.onPause(function(){f==s&&(f.__pause=Date.now(),b("mg onPause 录音被打断",3))}),f.onResume(function(){if(f==s){var e=f.__pause?Date.now()-f.__pause:0,n=0;f.__pause=0,300<e&&(n=Math.min(1e3,e),M(new Int16Array(48*n),48e3)),b("mg onResume 恢复录音，填充了"+n+"ms静默",3)}}),f.onError(function(e){if(f==s){var n=e.errMsg,r="mg onError 开始录音出错：";if(!a&&!f._srt&&/fail.+is.+recording/i.test(n)){var t=600-(Date.now()-g);if(0<t)return t=Math.max(100,t),b(r+"等待"+t+"ms重试",3,e),void setTimeout(function(){f==s&&(f._srt=1,b(r+"正在重试",3),m("retry start",f))},t)}b(1<o?r+"可能无法继续录音["+o+"]。"+n:r+n+"。"+l,1,e),i("开始录音出错："+n)}}),f.onStart(function(){f==s&&(b("mg onStart 已开始录音"),f._srt=0,f._st=Date.now(),i())}),f.onStop(function(e){b("mg onStop 请勿尝试使用此原始结果中的文件路径（此原始文件的格式、采样率等和录音配置不相同）；如需本地文件：可在RecordApp.Stop回调中将得到的ArrayBuffer（二进制音频数据）用RecordApp.MiniProgramWx_WriteLocalFile接口保存到本地，即可得到有效路径。res:",e),f==s&&(!f._st||Date.now()-f._st<600?b("mg onStop但已忽略",3):(b("mg onStop 已停止录音，正在重新开始录音..."),o++,f._st=0,m("restart",f)))});var e=function(){f.onFrameRecorded(function(e){if(f==s){a||b("mg onStart未触发，但收到了onFrameRecorded",3),i();var n=e.frameBuffer;n&&n.byteLength&&(h?A(new Uint8Array(n)):M(new Int16Array(n),48e3))}}),m("start",f)},t=600-(Date.now()-g);0<t?(t=Math.max(100,t),b("mg.start距stop太近需等待"+t+"ms",3),setTimeout(function(){f==s&&e()},t)):e()};_.MiniProgramWx_WriteLocalFile=function(e,r,n,t){var a=e;"string"==typeof a&&(a={fileName:e}),e=a.fileName;var o=a.append,i=a.seekOffset,f=+i||0;i||0===i||(f=-1);var c=wx.env.USER_DATA_PATH,s=e;-1==e.indexOf(c)&&(s=c+"/"+e);var u=S[s]=S[s]||[],l=u[0],g={a:a,b:r,c:n,d:t};if(l&&l._r)return b("wx文件等待写入"+s,3),a._tk=1,void u.push(g);a._tk&&b("wx文件继续写入"+s),u.splice(0,0,g),g._r=1;var d=wx.getFileSystemManager(),v=0,m=function(){v&&d.close({fd:v}),setTimeout(function(){u.shift();var e=u.shift();e&&_.MiniProgramWx_WriteLocalFile(e.a,e.b,e.c,e.d)})},p=function(){m(),n&&n(s)},h=function(e){m();var n=e.errMsg||"-";b("wx文件"+s+"写入出错："+n,1),t&&t(n)};-1<f||o?d.open({filePath:s,flag:-1<f?"r+":"a",success:function(e){var n={fd:v=e.fd,data:r,success:p,fail:h};-1<f&&(n.position=f),d.write(n)},fail:h}):d.writeFile({filePath:s,encoding:"binary",data:r,success:p,fail:h})};var h,w,S={};_.MiniProgramWx_DeleteLocalFile=function(e,n,r){wx.getFileSystemManager().unlink({filePath:e,success:function(){n&&n()},fail:function(e){r&&r(e.errMsg||"-")}})};var x,R,y=function(){w||(w=wx.getSystemInfoSync(),(h="devtools"==w.platform?1:0)&&(x=wx.createWebAudioContext()))},A=function(e){var n=R;n.pos||(n.pos=[0],n.tracks={},n.bytes=[]);var r=n.tracks,t=[n.pos[0]],a=function(){n.pos[0]=t[0]},o=n.bytes.length,i=new Uint8Array(o+e.length);i.set(n.bytes),i.set(e,o),n.bytes=i;var f=function(){n.bytes=[],M(new Int16Array(i),48e3)};if(n.isNotWebM)f();else{if(!n._ht){for(var c=0,s=0;s<i.length;s++)if(26==i[s]&&69==i[s+1]&&223==i[s+2]&&163==i[s+3]){c=s,t[0]=s+4;break}if(!t[0])return void(5120<i.length&&(b("未识别到WebM数据，开发工具可能已支持PCM",3),n.isNotWebM=!0,f()));if(k(i,t),!P(W(i,t),[24,83,128,103]))return;for(W(i,t);t[0]<i.length;){var u=W(i,t),l=k(i,t);if(!l)return;if(P(u,[22,84,174,107])){n._ht=i.slice(c,t[0]),b("WebM Tracks",r),a();break}}}for(var g=[],d=0;t[0]<i.length;){var v=t[0],m=W(i,t),p=(t[0],k(i,t));if(!p)break;if(P(m,[163])){var h=i.slice(v,t[0]);d+=h.length,g.push(h)}a()}if(d){var _=new Uint8Array(i.length-n.pos[0]);_.set(i.subarray(n.pos[0])),n.bytes=_,n.pos[0]=0;var w=[31,67,182,117,1,255,255,255,255,255,255,255];w.push(231,129,0),d+=w.length,g.splice(0,0,w),d+=n._ht.length,g.splice(0,0,n._ht);for(var S=new Uint8Array(d),s=0,y=0;s<g.length;s++)S.set(g[s],y),y+=g[s].length;x.decodeAudioData(S.buffer,function(e){for(var n=e.getChannelData(0),r=new Int16Array(n.length),t=0;t<n.length;t++){var a=Math.max(-1,Math.min(1,n[t]));a=a<0?32768*a:32767*a,r[t]=a}M(r,e.sampleRate)},function(){b("WebM解码失败",1)})}}},P=function(e,n){if(!e||e.length!=n.length)return!1;if(1==e.length)return e[0]==n[0];for(var r=0;r<e.length;r++)if(e[r]!=n[r])return!1;return!0},W=function(e,n,r){var t=n[0];if(!(t>=e.length)){var a=e[t],o=("0000000"+a.toString(2)).substr(-8),i=/^(0*1)(\d*)$/.exec(o);if(i){var f=i[1].length,c=[];if(!(t+f>e.length)){for(var s=0;s<f;s++)c[s]=e[t],t++;return r&&(c[0]=parseInt(i[2]||"0",2)),n[0]=t,c}}}},k=function(e,n){var r=W(e,n,1);if(r){var t=function(e){for(var n="",r=0;r<e.length;r++){var t=e[r];n+=(t<16?"0":"")+t.toString(16)}return parseInt(n,16)||0}(r),a=n[0],o=[];if(t<2147483647){if(a+t>e.length)return;for(var i=0;i<t;i++)o[i]=e[a],a++}return n[0]=a,o}}}(r,0,t.$T,n)}();