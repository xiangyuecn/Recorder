/******************
《【Demo库】实现一个长按功能的按钮》
作者：高坚果
时间：2020-7-22 22:37:09

文档：
DemoFragment.BindTouchButton(btnCls,text1,text2 ,option ,onStart,onEnd)
		btnCls:"class" 按钮中的一个class值，用来定位到这个元素，此class页面中应当是唯一的，随时可以进行绑定，就算按钮不存在（后面按存出现时就会自动处理）
		text1:"未按时的按钮文字" 为空时会读取按钮内的文本作为初始化参数，给的值应当和按钮显示时的文字相同
		text2:"按下时的按钮文字" 必填
		
		option:{ 其他可选项
			upBG:"#f60" 按钮未按下时的背景色
			downBG:"#0b1" 按钮按下时的背景色
			errBG:"#f00" 调用cancel返回了错误信息时的背景色
			killUserSelect:true 按下时在body上禁用用户选择，默认true禁用，在松手时取消禁用
		}
		
		onStart:fn(cancel,btn) 按下时处理
				cancel=fn(textErr)出现状况时可以取消长按（已结束时调用不会做任何事情），会立即触发onEnd，可选显示错误文字（不可过长），无textErr时会立即恢复按钮到未按下状态；cancel可存起来，onEnd触发前可随时调用
		onEnd:fn(isCancel,isUser,btn) 结束长按时处理
				isCancel=true代表调用了cancel方法取消了长按，此时非用户操作isUser==false
				isUser=true代表是用户松开了手，此时isCancel==false
				isUser=false代表非用户操作，isCancel==true或者是touchcancel
		
		onFinally:fn() 最终回调，一般用不到，调用了cancel时会在用户松手时执行，否则会在onEnd后立即执行
******************/
(
window.DemoFragment||(window.DemoFragment={})
).BindTouchButton=function(btnCls,text1,text2,option,onStart,onEnd,onFinally){
	option=option||{};
	var upBG=option.upBG||"#f60";
	var downBG=option.downBG||"#0b1";
	var errBG=option.errBG||"#f00";
	var killUS=option.killUserSelect;killUS=killUS==null?1:!!killUS;
	if(!/^[\w\-]+$/.test(btnCls)){
		throw new Error(btnCls+"无效");
	}
	
	var bind=function(elem,types,fn){
		var Binds=elem.BindTouchButton__Binds||{};
		elem.BindTouchButton__Binds=Binds;
		var binds=Binds[btnCls]||[];
		Binds[btnCls]=binds;
		
		for(var i=0;i<types.length;i++){
			var type=types[i];
			var old=binds[type];
			if(old){
				elem.removeEventListener(type,old);
			}
			
			binds[type]=fn;
			elem.addEventListener(type,fn);
		};
	};
	
	var btn;
	var getBtn=function(){
		btn=document.querySelector("."+btnCls);
		return btn;
	};
	getBtn();
	if(btn){
		if(text1){
			btn.innerText=text1;
		}else{
			text1=btn.innerText;
		}
	};
	
	var usStyle=document.createElement("style");//强力禁用所有元素的选择，不然有些沙雕元素可能是设置了auto，某些沙雕浏览器里面长按会选到这些auto的元素
	usStyle.innerHTML='*{'+['-webkit-','-ms-','-moz-','',''].join('user-select:none !important;')+'}';
	
	var body=document.body;
	var store=DemoFragment.BindTouchButton;
	var needCall,needFinal,needUp,needUS,downHit,downEvent;
	bind(body,["mousedown","touchstart"],function(e){
		var p=e.target,hit;
		do{
			hit=(" "+p.className+" ").indexOf(" "+btnCls+" ")+1;
			p=p.parentNode;
		}while(p && !hit);
		if(!hit){
			return;	
		};
		downEvent=e;
		
		needUS=true;
		killUS&&body.appendChild(usStyle);//kill all 免得渣渣浏览器里面复制搜索各种弹，这些浏览器单独给div设置是没有用的
		
		var idx=store.downIdx=(store.downIdx||0)+1;
		downHit=setTimeout(function(){
			downHit=0;
			needCall=true;
			needFinal=true;
			needUp=true;
			
			getBtn();
			btn.style.background=downBG;
			btn.innerText=text2;
			
			onStart&&onStart(function(textErr){//可能结束长按了才回调 idx控制时序
				if(idx==store.downIdx && needCall){//阻止二次进入 或 早已取消
					if(textErr){
						btn.style.background=errBG;
						btn.innerText=textErr;
					};
					cancel(true,false,textErr);
				}else{
					console.warn(btnCls+"重复调用cancel");
				}
			},btn);
		},300);
	});
	var cancel=function(isCancel,isUser,keepBtn){
		getBtn();
		if(!keepBtn){
			needUS&&killUS&&body.removeChild(usStyle);
			needUS=0;
			if(needUp){//恢复按钮为未按状态
				needUp=0;
				btn.style.background=upBG;
				btn.innerText=text1;
			}
		}
		if(downHit){
			clearTimeout(downHit);
			downHit=0;
		}
		if(needCall){
			needCall=0;
			onEnd&&onEnd(isCancel,isUser,btn);
		}
	};
	bind(body,["mouseup","touchend","touchcancel"],function(e){
		store.downIdx++;
		cancel(false,e.type!="touchcancel");
		
		if(needFinal){
			needFinal=0;
			onFinally&&onFinally();
		}
	});
	bind(body,["mousemove","touchmove"],function(e){
		if(downHit){//移动检测，判断不是长按
			var a=downEvent;
			var b=e;
			if(Math.abs(a.screenX-b.screenX)+Math.abs(a.screenY-b.screenY)>3*2){
				cancel();
			};
		};
	});
};