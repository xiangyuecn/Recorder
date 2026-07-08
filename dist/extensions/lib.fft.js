/*
录音
https://github.com/xiangyuecn/Recorder
src: extensions/lib.fft.js
*/
!function(r){var o=Object[Object["Recorder-Core-Alias"]||"Recorder-Core-Export"];if(!o)throw new Error("Must import recorder-core first");!function(r,o,t){"use strict";r.LibFFT=function(r){var M,v,d,b,l,w,F,g;return function(r){var o,t,e,n;for(M=Math.round(Math.log(r)/Math.log(2)),d=((v=1<<M)<<2)*Math.sqrt(2),b=[],l=[],w=[0],F=[0],g=[],o=0;o<v;o++){for(e=o,n=t=0;t!=M;t++)n<<=1,n|=1&e,e>>>=1;g[o]=n}var a,f=2*Math.PI/v;for(o=(v>>1)-1;0<o;o--)a=o*f,F[o]=Math.cos(a),w[o]=Math.sin(a)}(r),{transform:function(r){var o,t,e,n,a,f,i,c,u=1,s=M-1;for(o=0;o!=v;o++)b[o]=r[g[o]],l[o]=0;for(o=M;0!=o;o--){for(t=0;t!=u;t++)for(a=F[t<<s],f=w[t<<s],e=t;e<v;e+=u<<1)i=a*b[n=e+u]-f*l[n],c=a*l[n]+f*b[n],b[n]=b[e]-i,l[n]=l[e]-c,b[e]+=i,l[e]+=c;u<<=1,s--}t=v>>1;var h=new Float64Array(t);for(a=-(f=d),o=t;0!=o;o--)i=b[o],c=l[o],h[o-1]=a<i&&i<f&&a<c&&c<f?0:Math.round(i*i+c*c);return h},bufferSize:v}}}(o,o.i18n.$T,o.IsBrowser)}();