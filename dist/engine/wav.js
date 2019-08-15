/*
录音
https://github.com/xiangyuecn/Recorder
src: engine/wav.js
*/
!function(){"use strict";Recorder.prototype.enc_wav={stable:!0,testmsg:"比特率取值范围8位、16位"},Recorder.prototype.wav=function(t,e,n){var r=this.set,a=t.length,o=r.sampleRate,s=8==r.bitRate?8:16,f=a*(s/8),i=new ArrayBuffer(44+f),c=new DataView(i),u=0,p=function(t){for(var e=0;e<t.length;e++,u++)c.setUint8(u,t.charCodeAt(e))},v=function(t){c.setUint16(u,t,!0),u+=2},w=function(t){c.setUint32(u,t,!0),u+=4};if(p("RIFF"),w(36+f),p("WAVE"),p("fmt "),w(16),v(1),v(1),w(o),w(o*(s/8)),v(s/8),v(s),p("data"),w(f),8==s)for(var l=0;l<a;l++,u++){var d=t[l];d=parseInt(255/(65535/(d+32768))),c.setInt8(u,d,!0)}else for(l=0;l<a;l++,u+=2)c.setInt16(u,t[l],!0);e(new Blob([c.buffer],{type:"audio/wav"}))}}();