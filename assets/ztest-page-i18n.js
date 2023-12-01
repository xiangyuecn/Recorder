/** 页面的国际化多语言支持
- 必须：相关开启支持的文件，需要到/src/package-i18n.js中进行声明并提取翻译处理
- js中用 Html_$T("key::中文") 来获取一个文本
- 如果要Recorder内置的文本也返回html，把函数放到 Html_$CallT(fn) 内调用（仅支持同步方法）
- html中使用：<x reclang="key">中文文本，不允许出现标签</x> 获得多语言支持
- html中使用：<x reclang acceptlang="zh,!zh,en-US"></x> 只切换不同语言下的显示和隐藏
- url中使用：?PageLang=xxx 指定需要显示的默认语言
**/
(function(){
"use strict";
var isMobile=/mobile/i.test(navigator.userAgent);
var Langs=[
	{name:"Chinese | 简体中文",key:"zh-CN",url:""}
	,{name:"English (US)",key:"en-US",url:"@en-US.js"}
	,{name:"Spanish | Español",key:"es",url:"@es.js"}
	,{name:"French | Français",key:"fr",url:"@fr.js"}
	/*,{name:"Arabic language",key:"ar",url:"@ar.js"}
	,{name:"German | Deutsch",key:"de",url:"@de.js"}
	,{name:"Hindi language",key:"hi",url:"@hi.js"}
	,{name:"Japanese| 日本語",key:"ja",url:"@ja.js"}
	,{name:"Korean | 한국어",key:"ko",url:"@ko.js"}
	,{name:"Malay| Bahasa Melayu",key:"ms",url:"@ms.js"}
	,{name:"Russian | Русский язык",key:"ru",url:"@ru.js"}*/
];
var Tag="[Recorder Page i18n]";

window.PageI18nWidget=function(set){
	PageI18nWidget.set=set;
	var el=document.querySelector(set.elem);
	var rootUrl=set.rootUrl; //根目录地址，/结尾
	var titleKey=set.titleKey; //标题字符串的key
	var onUpdate=set.onUpdate||function(item){}; //更新语言显示时回调
	var langs=set.langs||{}; //key:{urls:[""]} url @打头相对/src/i18n #打头相对/assets/page-i18n
	
	var getDescPageKey=function(url,lang){
		if(/#([^\/]+)\//.test(url)){
			return "desc-page-"+RegExp.$1+"$"+lang;
		}
		return "";
	};
	var getDescPageCheckFn=function(url,lang){
		var key=getDescPageKey(url,lang);
		if(!key)throw new Error(Tag+"not #url: "+url);
		return function(){
			return !Recorder.i18n.data[key];
		}
	};
	
	var tag=Tag;
	var langArr=[],langMP={};
	for(var i=0;i<Langs.length;i++){
		var o1=Langs[i],urlBAddEn=0;
		var o={name:o1.name,key:o1.key,urlsA:[o1.url],urlsB:[],sort:i,hasLocale:true};
		o.keyAs=Recorder.i18n.alias[o.key]||o.key;
		o.keyAsMP={};o.keyAsMP[o.key]=o.keyAs;o.keyAsMP[o.keyAs]=o.keyAs;
		langArr.push(o);
		
		if(o.key!="zh-CN" && o.key!="en-US"){
			o.urlsA.splice(0,0,{url:"@en-US.js",check:function(){ return !Recorder.i18n.data["desc$en"]; }});
			
			var enUrls=(langs["en-US"]||langs["en"]||{}).urls||[];
			for(var j=0;j<enUrls.length;j++){
				var url=enUrls[j]; if(!url)continue;
				var item=url;
				if(!item.check){
					item={ url:url, check:getDescPageCheckFn(url,"en") };
				};
				o.urlsB.push(item);
			}
		}
		
		var o2=langs[o.key]||langs[o.keyAs];
		if(!o2 && o.key=="zh-CN")o2={};
		
		o.name="["+o.key+"] "+o.name;
		if(!o2){
			o.sort+=999; o.hasLocale=false;
			o.name="[-] "+o.name;
			continue;
		};
		var arr=o2.urls||[];
		for(var j=0;j<arr.length;j++){
			var url=arr[j]; if(!url)continue;
			if(j==0)o.descPageKey=getDescPageKey(url.url||url,o.keyAs);
			o.urlsB.push(url);
		}
	}
	langArr.sort(function(a,b){return a.sort-b.sort});
	window.PageI18nLangList=langArr;
	var opts=[];
	for(var i=0;i<langArr.length;i++){
		var o=langArr[i];
		langMP[o.key]=o; if(o.key!=o.keyAs)langMP[o.keyAs]=o;
		opts.push('<option value="'+o.key+'">'+o.name+'</option>');
	}
	opts.push('<option value="more">More language support ...</option>');
	
	el.innerHTML='\
<div class="i18nLangsBox" style="position:'+(isMobile?'':'absolute')+';top:0;right:0;padding:5px 10px;font-size:14px;border-radius:0 0 0 10px;background:#f5f5f5;max-width:360px">\
	<div>Language:\
		<select style="padding:0 3px;margin:0;height:20px;border:none;outline:none;background:#eee;cursor:pointer;">\
		'+opts.join(' ')+'</select>\
	</div>\
	<div class="i18nLangsState"></div>\
</div>';
	var slcEl=el.querySelector("select");
	var stateEl=el.querySelector(".i18nLangsState");
	var State=function(msg,color){
		stateEl.innerHTML='<div style="color:'+(!color?"":color==1?"red":color==2?"#0b1":color)+'">'+msg+'</div>';
	};
	var SyncID=0;
	
	//加载需要的语言
	var loadLang=function(){
		var sid=++SyncID;
		var curLang=slcEl.value;
		var langItem=langMP[curLang],jsList=[],jsUrls=[];
		State("loading...");
		
		var addJs=function(arr,isB){
			for(var i=0;i<arr.length;i++){
				var url=arr[i]; if(!url)continue;
				var item=url;
				if(!item.check){
					item={ url:url,
						check:function(){ return !Recorder.i18n.data["desc$"+langItem.keyAs]; }
					};
					if(isB) item.check=getDescPageCheckFn(url,langItem.keyAs);
				};
				url=item.url;
				if(/@/.test(url)){ url=rootUrl+"src/i18n/"+url.substr(1); }
				if(/#/.test(url)){ url=rootUrl+"assets/page-i18n/"+url.substr(1); }
				item.url=url;
				jsUrls.push(url);
				jsList.push(item);
			}
		}
		addJs(langItem.urlsA,false);
		addJs(langItem.urlsB,true);
		
		var loadEnd=function(){
			if(sid!=SyncID)return;
			langItem.keyAs=Recorder.i18n.alias[langItem.key]||langItem.key;
			langItem.keyAsMP[langItem.keyAs]=langItem.keyAs;
			for(var k in Recorder.i18n.alias){
				if(Recorder.i18n.alias[k]==langItem.keyAs){
					langItem.keyAsMP[k]=langItem.keyAs;
				}
			}
			
			if(loadCount || Recorder.i18n.lang!=curLang){
				console.log(tag+"Set Recorder.i18n.lang=\""+curLang
					+"\" | Desc: "+(langItem.keyAs=="zh"?"Default language"
					:Recorder.i18n.data["desc$"+langItem.keyAs])
				);
				var desc2=Recorder.i18n.data[langItem.descPageKey];
				if(desc2){
					console.log(tag+"Page Using Lang="+curLang
						+" | Desc: "+desc2);
				}else if(langItem.keyAs!="zh"){
					desc2=Recorder.i18n.data[langMP["en"].descPageKey];
					console.log(tag+"Redirect Page Using Lang="+(desc2?"en-US":"zh-CN")+", this page does not support "+curLang+" language"
						+" | Desc: "+(desc2||"Default language"));
				}
			};
			Recorder.i18n.lang=curLang;
			
			//切换语言时，更新一下标题，中文先存起来
			Recorder.i18n.put({lang:"zh",overwrite:false},[titleKey+":"+document.title]);
			document.title=Recorder.i18n.get(titleKey);
			
			State("");
			if(!langItem.hasLocale){
				State(langItem.key+": Enabled on Recorder, this page does not support","#bbb");
			};
			
			reviewLang();
		};
		var loadCount=0;
		var load=function(idx){
			if(idx>=jsList.length){
				loadEnd();
				return;
			};
			var itm=jsList[idx];
			var url=itm.url;
			if(itm.check()===false){
				load(idx+1);
				return;
			};
			if(!loadCount)console.log(tag+"load lang: "+curLang,jsUrls);
			loadCount++;
			
			var elem=document.createElement("script");
			elem.setAttribute("type","text/javascript");
			elem.setAttribute("src",url);
			if(!("onload" in elem)){//IsLoser 古董浏览器
				elem.onreadystatechange=function(){
					if(elem.readyState=="loaded"){
						elem.onload();
					}
				}
			};
			var isload=0;
			elem.onload=function(){
				if(sid!=SyncID)return;
				if(!isload){
					isload=1;
					load(idx+1);
				}
			};
			elem.onerror=function(e){
				if(sid!=SyncID)return;
				console.error(tag+"Failed to load js, i18n["+curLang+"]: "+url);
				State("Failed to load js, i18n["+curLang+"]",1);
			};
			document.body.appendChild(elem);
		};
		load(0);
	};
	//重新显示这个dom下的所有带reclang属性的节点文字
	var reviewLang=window.PageI18nReview=function(el){
		el=el||"body";
		if(typeof el=="string")el=document.querySelector(el);
		var els=[]; if(!el)return; var isBody=el.tagName=="BODY";
		if(el.getAttribute("reclang"))els.push(el);
		else els=el.querySelectorAll("[reclang]");
		
		var curItem=langMP[Recorder.i18n.lang]||{};
		var curAsMP=curItem.keyAsMP||{};
		
		for(var i=0;i<els.length;i++){
			var el=els[i],key=el.getAttribute("reclang");
			
			var accepts=el.getAttribute("acceptlang");
			if(accepts){//控制显示隐藏
				var arr=accepts.split(","),a=",",d=",",val=0;
				for(var j=0;j<arr.length;j++){
					var v=arr[j].trim();
					if(v.indexOf("!")==0) d+=v.substr(1)+",";
					else a+=v+",";
				}
				for(var k in curAsMP){
					if(a.indexOf(","+k+",")+1){ val=1; break; }
					if(d.indexOf(","+k+",")+1){ val=2; break; }
				}
				if(!val && a.length==1) val=1; //没有被禁用，就显示
				el.style.display=val==1?null:"none";
			};
			
			if(!key)continue;
			var argsKey=el.getAttribute("reclangargs"),args=[];
			if(!argsKey){//第一次转换，把标签内的文本存入中文
				el.setAttribute("reclangargs","0");
				Recorder.i18n.put({lang:"zh",overwrite:false},[key+":"+el.innerText]);
			}else{
				args=PageI18nArgsData[argsKey]||[];
			}
			el.innerText=Recorder.i18n.get(key,args);
			el.style.direction=getLastLangRTL();
		}
		if(isBody){ onUpdate(curItem); }
	};
	
	var curObj=langMP[Recorder.i18n.lang];
	if(curObj){
		slcEl.value=curObj.key;
	};
	slcEl.onchange=function(){
		if(slcEl.value=="more"){
			State("Please copy /src/i18n/Template.js, rename it, and translate the text into the corresponding language, that's it.",2);
			return;
		};
		localStorage["i18nWidget_Lang"]=slcEl.value;
		loadLang();
	};
	loadLang();
};


window.PageI18nArgsData={ID:1000};
window.PageI18nReview=function(){
	//NOOP
};

//初始化语言
var initLang=localStorage["i18nWidget_Lang"];
if(!initLang && /[?#&]PageLang=([\w\-]+)/.test(location.href)){
	initLang=RegExp.$1; //从url中提取
}
initLang=initLang||(/\b(zh|cn)\b/i.test(navigator.language.replace(/_/g," "))?"zh-CN":"en-US");
Recorder.i18n.lang=initLang;

//当前语言是否是中文
window.PageLangIsZhCN=function(){
	var lang=Recorder.i18n.lang; lang=Recorder.i18n.alias[lang]||lang;
	return lang=="zh";
};




//函数调用过程中 $T 返回成html
var pageTv;
window.Html_$CallT=function(fn){
	pageTv=Recorder.i18n.v_T;
	Recorder.i18n.v_T=function(){
		return Html_$T.apply(null,arguments);
	};
	try{
		fn();
	}finally{
		Recorder.i18n.v_T=pageTv;
		pageTv=null;
	}
};

//调用$T返回一个国际化文本，用span包裹，支持切换语言
window.Html_$T=function(){
	var tag=Tag+"[Html_$T]";
	var a=arguments,key="",args=[],isArgs=0;
	var exp=/^([\w\-]*):/,m;
	for(var i=0;i<a.length;i++){
		var v=a[i];
		if(i==0){
			m=exp.exec(v); key=m&&m[1];
			if(!key)throw new Error(tag+"0 'key:'?");
		}
		if(isArgs===-1) args.push(v);
		else if(isArgs) throw new Error(tag+" bad args");
		else if(v===0) isArgs=-1;
		else if(typeof v=="number"){
			throw new Error(tag+" unsupported args "+v);
		}
	}
	var argsKey="0";
	if(args.length>0){
		argsKey="args"+(++PageI18nArgsData.ID);
		PageI18nArgsData[argsKey]=args;
	}
	
	var txt=(pageTv||Recorder.i18n.v_T).apply(null,arguments);
	return '<span reclang="'+key+'" reclangargs="'+argsKey+'" style="direction:'+getLastLangRTL()+'">'+FormatText(txt)+'</span>';
};
var getLastLangRTL=function(){
	var lang=Recorder.i18n.lastLang;
	return Recorder.i18n.data["rtl$"+lang]?"rtl":"ltr";
};
//去掉Html_$T包裹的html，返回里面的内容
window.Html_xT=function(str){
	str=str.replace(/<span[^>]+reclang=[^>]+>(.*?)<\/span>/g,"$1");
	str=str.replace(/&#(\d+);?/g,function(v,a){return String.fromCharCode(+a)});
	return str;
};
var FormatText=function(str){
	return str.replace(/[&<>='"]/g,function(a){ return "&#" + a.charCodeAt(0) + ";" });
};


})();