//打赏挂件，创意来自：https://github.com/TangSY/echarts-map-demo
(function(){
"use strict";

var BaseUrl="https://xiangyuecn.github.io/Recorder";
if(/gitee\.io/i.test(location.host)){ //2024-05-01 pages无通知下线
	BaseUrl="https://xiangyuecn.gitee.io/recorder";
}
var ImgAlipay=BaseUrl+"/assets/donate-alipay.png";
var ImgWeixin=BaseUrl+"/assets/donate-weixin.png";
var ImgPayPal=BaseUrl+"/assets/donate-paypal.png";
var ImgLibera=BaseUrl+"/assets/donate-liberapay.png";

var IsMobile=/mobile/i.test(navigator.userAgent);
var IsCN=/\b(zh|cn)\b/i.test(navigator.language.replace(/_/g," "));

//调用$T返回一个国际化文本，如果支持的话
var Html_$T=function(zh,z,v){
	if(window.Html_$T)return window.Html_$T.apply(null,arguments);
	return zh.replace(/^.+?::/,"").replace("{1}",v);
};

var DonateWidget=function(set){
	return new Fn(set);
};
var Fn=function(set){
	this.set={
		log:function(htmlMsg){} //自定义显示日志消息，返回false禁止控制台输出
		,mobElem:null //移动端时显示到这个dom对象里，空不显示
		
		,viewOnly:false //仅显示，不提供关闭，点击页面按钮不弹框
		,getTitle:function(title){} //自定义大标题html，返回空将使用默认
		,getBtn:function(btn,val){} //自定义按钮名称html，返回空间使用默认；btn=0关闭 1已打赏
		,onBtnClick:function(btn,isDialog,isFloat){} //当点击按钮时回调，返回false阻止默认动作
	};
	for(var k in set){
		this.set[k]=set[k];
	};
	
	var This=this;
	DonateWidget.cur=This;
	
	This.view();
	/*if(!this.set.viewOnly&&window.addEventListener){
		document.body.addEventListener("click",function(e){
			if(/button/i.test(e.target.tagName) || /btn/i.test(e.target.className)){
				try{
					This.dialog();
				}catch(e){}
			};
		});
	};*/
};
Fn.prototype=DonateWidget.prototype={
	log:function(htmlMsg){
		htmlMsg='['+Html_$T("4AP9::打赏挂件")+']'+htmlMsg;
		var val=this.set.log(htmlMsg);
		if(val!==false){
			console.log(htmlMsg.replace(/<[^<>]+?>/g,""));
		}
	}
	,view:function(){
		if(IsMobile){
			if(this.set.mobElem){
				this._render(false,false,this.set.mobElem);
			};
		}else{
			if(!this.set.viewOnly){
				var dis=localStorage["DonateWidget_SetDisable"];
				if(dis && Date.now()-new Date(dis).getTime()<24*60*60*1000){
					this.log(Html_$T("NOaR::已禁用打赏挂件一天，可通过命令开启：")+'DonateWidget.SetDisable(0)  <a href="" onclick="DonateWidget.SetDisable(0);return false">exec</a>');
					return;
				};
			};
			
			this.dialog(0,"Float");
		};
	}
	,dialog:function(showNow,_f){
		if(!_f){
			//点击了按钮后一天后再开启
			var time=localStorage["DonateWidget_Close"];
			if(!showNow && time && Date.now()-new Date(time).getTime()<24*60*60*1000){
				return;
			};
		};
		
		DonateWidget.cur.close(0,"Float",1);
		DonateWidget.cur.close(0,"Box",1);
		
		var zIndex=1;
		var all=document.querySelectorAll("*");
		for(var i=0;window.getComputedStyle&&i<all.length;i++){
			var v=+getComputedStyle(all[i]).zIndex||0;
			if(v>zIndex){
				zIndex=v+1;
			};
		};
		
		var fixedElem=document.createElement("div");
		fixedElem.innerHTML='\
<div class="DonateWidget_dialog'+(_f||"Box")+'" style="z-index:'+zIndex+';position: fixed;display:flex;align-items:center;justify-content:center;'+(_f?'top:20%;right:5px':'left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.3)')+'">\
	<div onclick="DonateWidget.cur.close(1,\''+(_f||"Box")+'\')" style="position: absolute;font-size:32px;cursor: pointer;top: 0;right:8px;color:#fff;" class="DonateWidget_XCloseBtn">'+(_f&&!this.set.viewOnly?'×':'')+'</div>\
	<div class="DonateWidget_dialogRender"></div>\
</div>';
		document.body.appendChild(fixedElem);
		
		this._render(!_f,!!_f,fixedElem.querySelector(".DonateWidget_dialogRender"));
	}
	,_render:function(isDialog,isFloat,elem){
		var title="",times=["2023/01/22","2024/02/10","2025/01/29","2026/02/17","2027/02/06","2028/01/26","2029/02/13","2030/02/03"];//大年初一
		//调试: DonateWidgetDateNow=function(){return new Date("2030/02/17").getTime()};DonateWidget.SetDisable(0)
		var now=(window.DonateWidgetDateNow||Date.now)();
		for(var i=0;!title&&i<times.length;i++){
			var time=new Date(times[i]).getTime();
			var td=Math.ceil((time-now)/24/60/60/1000);
			if(td<=20&&td>-20){
				if(td>0){
					title=Html_$T("e4F2::剩余{1}天就过年了，给大伙拜个早年吧~ 赏包辣条？",0,td);
				}else{
					title="";
					if(td>-14){
						title+=Html_$T("qwYd::新年快乐，给大伙拜年啦~ 赏个红包？");
					}else if(td==-14){
						title+=Html_$T("rZ6r::元宵节快乐~ 赏个红包？");
					}else{
						title+=Html_$T("yA8s::新年快乐，给大伙拜个晚年~ 赏包辣条？");
					};
				};
			};
		};
		title=title||Html_$T("x2q9::赏包辣条？");
		title=this.set.getTitle(title)||title;
		var btn0=(isDialog?Html_$T("Fyh4::再看吧，关掉先"):Html_$T("TQ2d::算了吧"))+unescape("%uD83D%uDE36");
		btn0=this.set.getBtn(0,btn0)||btn0;
		var btn1=Html_$T("1LpD::已打赏~ 壕气")+unescape("%uD83D%uDE18");
		btn1=this.set.getBtn(1,btn1)||btn1;
		
		var min=IsMobile?true:isDialog?false:true;
		elem.innerHTML='\
<div class="DonateWidget_render" style="border-radius:12px;background:linear-gradient(160deg, rgba(0,179,255,'+(isFloat?".7":"1")+') 20%, rgba(177,0,255,'+(isFloat?".7":"1")+') 80%);max-width:'+(min?300:520)+'px;padding:'+(min?20:30)+'px;text-align: center;">\
	<div style="font-size:18px;color:#fff;" class="DonateWidget_Title">'+title+'</div>\
	<div style="padding-top:14px">\
		<span reclang acceptlang="zh" style="display:'+(IsCN?'':'none')+'">\
			<img src="'+ImgAlipay+'" style="width:'+(min?145:220)+'px">\
			<img src="'+ImgWeixin+'" style="width:'+(min?145:220)+'px">\
		</span>\
		<span reclang acceptlang="!zh" style="display:'+(IsCN?'none':'')+'">\
			<a href="https://paypal.me/xiangyuecn" target="_blank" title="Go to the PayPal donation page" ><img src="'+ImgPayPal+'" style="width:'+(min?145:220)+'px"></a>\
			<a href="https://liberapay.com/xiangyuecn" target="_blank" title="Go to the Liberapay donation page" ><img src="'+ImgLibera+'" style="width:'+(min?145:220)+'px"></a>\
		</span>\
	</div>\
	<div style="padding-top:10px">\
		<button onclick="DonateWidget.cur.click(0,'+(isDialog?1:0)+','+(isFloat?1:0)+')" class="DonateWidget_Btn DonateWidget_Btn_0" style="margin-right:'+(min?10:40)+'px">'+btn0+'</button>\
		<button onclick="DonateWidget.cur.click(1,'+(isDialog?1:0)+','+(isFloat?1:0)+')" class="DonateWidget_Btn DonateWidget_Btn_1">'+btn1+'</button>\
	</div>\
<style>\
.DonateWidget_Btn{\
	display: inline-block;\
	cursor: pointer;\
	border: none;\
	border-radius: 3px;\
	background: #f60;\
	color:#fff;\
	padding: 0 15px;\
	line-height: 36px;\
	height: 36px;\
	overflow: hidden;\
	vertical-align: middle;\
}\
.DonateWidget_Btn:active{\
	background: #f00;\
}\
</style>\
</div>';
	}
	,click:function(ok,isDialog,isFloat){
		localStorage["DonateWidget_Close"]=new Date().toDateString();
		if(this.set.onBtnClick(ok,isDialog,isFloat)===false){
			return;
		}
		if(isDialog){
			this.close(1,"Box");
		}else if(isFloat){
			this.close(!ok,"Float");
			if(!this.set.viewOnly){
				ok&&DonateWidget.SetDisable(1);
			}
		};
		
		if(ok){
			this.log(Html_$T("NGKc::谢谢支持，看好你哟~"));
		}else{
			this.log(Html_$T("6ifH::emmm... 加油~"));
		};
	}
	,close:function(user,cls,disableView){
		var elems=document.querySelectorAll(".DonateWidget_dialog"+cls);
		for(var i=0;i<elems.length;i++){
			var elem=elems[i];
			elem.parentNode.removeChild(elem);
		};
		if(!disableView && cls!="Float"){
			this.view();
		};
		if(user && cls=="Float"){
			this.log(Html_$T("NSbf::通过命令可禁用侧边打赏挂件一天: ")+'DonateWidget.SetDisable(1) <a href="" onclick="DonateWidget.SetDisable(1);return false">exec</a>');
		};
	}
};

DonateWidget.SetDisable=function(disable){
	localStorage["DonateWidget_SetDisable"]=disable?new Date().toDateString():"";
	if(disable){
		DonateWidget.cur.log(Html_$T("NaUj::emmm...已禁用打赏挂件，禁用时长为一天"));
	}else{
		DonateWidget.cur.view();
	};
};
window.DonateWidget=DonateWidget;

})();