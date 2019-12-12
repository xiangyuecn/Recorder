//打赏挂件，创意来自：https://github.com/TangSY/echarts-map-demo
(function(){

var ImgAlipay="https://gitee.com/xiangyuecn/Recorder/raw/master/assets/donate-alipay.png";
var ImgWeixin="https://gitee.com/xiangyuecn/Recorder/raw/master/assets/donate-weixin.png";

var IsMobile=/mobile/i.test(navigator.userAgent);

var DonateWidget=function(set){
	return new Fn(set);
};
var Fn=function(set){
	this.set={
		log:function(htmlMsg){}
		,mobElem:null
	};
	for(var k in set){
		this.set[k]=set[k];
	};
	
	var This=this;
	DonateWidget.cur=This;
	
	This.view();
	document.body.addEventListener("click",function(e){
		if(/button/i.test(e.target.tagName) || /btn/i.test(e.target.className)){
			try{
				This.dialog();
			}catch(e){}
		};
	});
};
Fn.prototype=DonateWidget.prototype={
	log:function(htmlMsg){
		htmlMsg='[打赏挂件]'+htmlMsg;
		console.log(htmlMsg.replace(/<[^<>]+?>/g,""));
		this.set.log(htmlMsg);
	}
	,view:function(){
		if(IsMobile){
			if(this.set.mobElem){
				this._render(false,false,this.set.mobElem);
			};
		}else{
			var dis=localStorage["DonateWidget_SetDisable"];
			if(dis && Date.now()-new Date(dis).getTime()<24*60*60*1000){
				this.log('已禁用打赏挂件一天，可通过命令开启：DonateWidget.SetDisable(0)  <a href="" onclick="DonateWidget.SetDisable(0);return false">exec</a>');
				return;
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
		for(var i=0;i<all.length;i++){
			var v=+getComputedStyle(all[i]).zIndex||0;
			if(v>zIndex){
				zIndex=v+1;
			};
		};
		
		var fixedElem=document.createElement("div");
		fixedElem.innerHTML='\
<div class="DonateWidget_dialog'+(_f||"Box")+'" style="z-index:'+zIndex+';position: fixed;display:flex;align-items:center;justify-content:center;'+(_f?'top:20%;right:5px':'left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.3)')+'">\
	<div onclick="DonateWidget.cur.close(1,\''+(_f||"Box")+'\')" style="position: absolute;font-size:32px;cursor: pointer;top: 0;right:8px;color:#fff;">'+(_f?'×':'')+'</div>\
	<div class="DonateWidget_dialogRender"></div>\
</div>';
		document.body.appendChild(fixedElem);
		
		this._render(!_f,!!_f,fixedElem.querySelector(".DonateWidget_dialogRender"));
	}
	,_render:function(isDialog,isFloat,elem){
		var title="赏包辣条？";
		var time=new Date("2020/01/25").getTime();//大年初一
		var td=Math.ceil((time-Date.now())/24/60/60/1000);
		if(td>0){
			title="剩余"+td+"天就过年了，给大伙拜个早年吧~ 赏包辣条？";
		}else if(td>-30){
			tiltle="春节快乐，给大伙拜年啦~ 赏个红包？";
		};
		
		var min=IsMobile?true:isDialog?false:true;
		elem.innerHTML='\
<div style="border-radius:12px;background:linear-gradient(160deg, rgba(0,179,255,'+(isFloat?".7":"1")+') 20%, rgba(177,0,255,'+(isFloat?".7":"1")+') 80%);max-width:'+(min?300:520)+'px;padding:'+(min?20:30)+'px;text-align: center;">\
	<div style="font-size:18px;color:#fff;">'+title+'</div>\
	<div style="padding-top:14px">\
		<img src="'+ImgAlipay+'" style="width:'+(min?145:220)+'px">\
		<img src="'+ImgWeixin+'" style="width:'+(min?145:220)+'px">\
	</div>\
	<div style="padding-top:10px">\
		<button onclick="DonateWidget.cur.click(0,'+(isDialog?1:0)+','+(isFloat?1:0)+')" class="DonateWidget_Btn" style="margin-right:'+(min?10:40)+'px">'+(isDialog?"再看吧，关掉先":"算了吧")+unescape("%uD83D%uDE36")+'</button>\
		<button onclick="DonateWidget.cur.click(1,'+(isDialog?1:0)+','+(isFloat?1:0)+')" class="DonateWidget_Btn">已打赏~ 壕气'+unescape("%uD83D%uDE18")+'</button>\
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
		if(isDialog){
			this.close(1,"Box");
		}else if(isFloat){
			this.close(!ok,"Float");
			ok&&DonateWidget.SetDisable(1);
		};
		
		if(ok){
			this.log("谢谢支持，看好你哟~");
		}else{
			this.log("emmm... 加油~");
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
			this.log('通过命令可禁用侧边打赏挂件一天: DonateWidget.SetDisable(1) <a href="" onclick="DonateWidget.SetDisable(1);return false">exec</a>');
		};
	}
};

DonateWidget.SetDisable=function(disable){
	localStorage["DonateWidget_SetDisable"]=disable?new Date().toDateString():"";
	if(disable){
		DonateWidget.cur.log("emmm...已禁用打赏挂件，禁用时长为一天");
	}else{
		DonateWidget.cur.view();
	};
};
window.DonateWidget=DonateWidget;

})();