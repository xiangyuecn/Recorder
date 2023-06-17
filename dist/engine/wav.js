/*
录音
https://github.com/xiangyuecn/Recorder
src: engine/wav.js
*/
!function(){"use strict";Recorder.prototype.enc_wav={stable:!0,fast:!0,testmsg:"支持位数8位、16位（填在比特率里面），采样率取值无限制；此编码器仅在pcm数据前加了一个44字节的wav头，编码出来的16位wav文件去掉开头的44字节即可得到pcm（注：其他wav编码器可能不是44字节）"},Recorder.prototype.wav=function(t,e,a){var n=this.set,r=t.length,o=n.sampleRate,f=8==n.bitRate?8:16,s=r*(f/8),i=new ArrayBuffer(44+s),c=new DataView(i),v=0,w=function(t){for(var e=0;e<t.length;e++,v++)c.setUint8(v,t.charCodeAt(e))},u=function(t){c.setUint16(v,t,!0),v+=2},p=function(t){c.setUint32(v,t,!0),v+=4};if(w("RIFF"),p(36+s),w("WAVE"),w("fmt "),p(16),u(1),u(1),p(o),p(o*(f/8)),u(f/8),u(f),w("data"),p(s),8==f)for(var l=0;l<r;l++,v++){var d=128+(t[l]>>8);c.setInt8(v,d,!0)}else for(l=0;l<r;l++,v+=2)c.setInt16(v,t[l],!0);e(new Blob([c.buffer],{type:"audio/wav"}))}}();