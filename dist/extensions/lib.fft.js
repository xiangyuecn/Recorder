/*
录音
https://github.com/xiangyuecn/Recorder
src: extensions/lib.fft.js
*/
!function(r){var o="object"==typeof window&&!!window.document,t=(o?window:Object).Recorder,n=t.i18n;!function(r,o,t,n){"use strict";r.LibFFT=function(r){var d,w,s,v,b,l,F,g;return function(r){var o,t,n,a;for(d=Math.round(Math.log(r)/Math.log(2)),s=((w=1<<d)<<2)*Math.sqrt(2),v=[],b=[],l=[0],F=[0],g=[],o=0;o<w;o++){for(n=o,a=t=0;t!=d;t++)a<<=1,a|=1&n,n>>>=1;g[o]=a}var f,i=2*Math.PI/w;for(o=(w>>1)-1;0<o;o--)f=o*i,F[o]=Math.cos(f),l[o]=Math.sin(f)}(r),{transform:function(r){var o,t,n,a,f,i,e,u,c=1,h=d-1;for(o=0;o!=w;o++)v[o]=r[g[o]],b[o]=0;for(o=d;0!=o;o--){for(t=0;t!=c;t++)for(f=F[t<<h],i=l[t<<h],n=t;n<w;n+=c<<1)e=f*v[a=n+c]-i*b[a],u=f*b[a]+i*v[a],v[a]=v[n]-e,b[a]=b[n]-u,v[n]+=e,b[n]+=u;c<<=1,h--}t=w>>1;var M=new Float64Array(t);for(f=-(i=s),o=t;0!=o;o--)e=v[o],u=b[o],M[o-1]=f<e&&e<i&&f<u&&u<i?0:Math.round(e*e+u*u);return M},bufferSize:w}}}(t,0,n.$T)}();