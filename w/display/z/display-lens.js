/* A round glass drop belongs to one UI kind/layer. Its pointer surface and
 * derived geometry are separate from the UI's own controls and field topology. */
(function(root,factory){
  'use strict';const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.SSSDisplayLens=api;if(typeof document==='object')api.start()}
})(typeof globalThis==='object'?globalThis:this,function(root){
  'use strict';
  /* The centre never follows the cursor: a nearby cursor only makes the flesh reach (a lobe from the anchored centre);
   * connected tissue draws a free drop home slowly. */
  const K=Object.freeze({stiff:180,damp:24,cursorReach:155,reach:.95,lobe:.42,reachStiff:140,reachDamp:17,homePull:.07,magnet:80,breakAt:185,neck:28,capture:38,released:1.32,docked:.86});
  const n=v=>Number.isFinite(+v)?+v:0,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function scaleOf(h){return h?clamp(Math.min(n(h.hx),n(h.hy))/100,.6,1.2):1}
  function radiusOf(h,v){return v?clamp(Math.min(v.w,v.h)*.15,36,72):clamp(Math.min(h?.hx||100,h?.hy||100)*.62,36,72)}
  function homesOf(h){return (Array.isArray(h)?h:h?[h]:[]).filter(q=>q&&q.hx>0&&q.hy>0)}
  const idOf=h=>h.id||'surface';
  function compatible(L,h){return (h.kind||'hud')===L.kind&&(h.layer||'hud')===L.layer}
  function edgePoint(h,x,y){
    const l=h.cx-h.hx,r=h.cx+h.hx,t=h.cy-h.hy,b=h.cy+h.hy;
    const ps=[{x:l,y:clamp(y,t,b),nx:-1,ny:0,edge:'left'},{x:r,y:clamp(y,t,b),nx:1,ny:0,edge:'right'},
      {x:clamp(x,l,r),y:t,nx:0,ny:-1,edge:'top'},{x:clamp(x,l,r),y:b,nx:0,ny:1,edge:'bottom'}];
    ps.sort((a,c)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(c.x-x,c.y-y));
    ps[0].distance=Math.hypot(ps[0].x-x,ps[0].y-y);return ps[0];
  }
  function anchor(h,edge,u){
    const l=h.cx-h.hx,r=h.cx+h.hx,t=h.cy-h.hy,b=h.cy+h.hy;u=clamp(n(u),0,1);
    if(edge==='right')return {x:r,y:t+2*h.hy*u,nx:1,ny:0};
    if(edge==='top')return {x:l+2*h.hx*u,y:t,nx:0,ny:-1};
    if(edge==='bottom')return {x:l+2*h.hx*u,y:b,nx:0,ny:1};
    return {x:l,y:t+2*h.hy*u,nx:-1,ny:0};
  }
  function along(h,p){return p.edge==='left'||p.edge==='right'?clamp((p.y-h.cy+h.hy)/(2*h.hy),0,1):clamp((p.x-h.cx+h.hx)/(2*h.hx),0,1)}
  function dockPoint(h,U=1,edge=h?.edge||'left',u=.5,radius=60*U){const a=anchor(h,edge,u);return {x:a.x+a.nx*radius*.12,y:a.y+a.ny*radius*.12}}
  function create(home,view){
    const h=homesOf(home)[0]||null,base=radiusOf(h,view),d=h?dockPoint(h,base/60,h.edge||'left',.5,base):{x:(view?.w||600)/2,y:(view?.h||400)/2};
    return {x:d.x,y:d.y,vx:0,vy:0,baseR:base,radius:base*K.docked,radiusV:0,hx:base*K.docked,hy:base*K.docked,U:base/60,
      held:false,pid:null,px:d.x,py:d.y,docked:!!h,attached:!!h,homeId:h?idOf(h):null,edge:h?.edge||'left',u:.5,
      kind:h?.kind||'hud',layer:h?.layer||'hud',ax:d.x,ay:d.y,round:1,stretch:0,fx:0,fy:0,fvx:0,fvy:0};
  }
  function nearest(L,hs){let best=null;for(const h of hs){if(!compatible(L,h))continue;const p=edgePoint(h,L.x,L.y);if(!best||p.distance<best.p.distance)best={h,p}}return best}
  function step(L,home,dt,view,cursor){
    const hs=homesOf(home);dt=clamp(n(dt),0,.06);if(!dt)return L;
    if(view)L.baseR=radiusOf(null,view);L.U=L.baseR/60;
    const parts=Math.max(1,Math.ceil(dt/(1/120))),d=dt/parts;
    for(let i=0;i<parts;i++){
      let h=hs.find(q=>idOf(q)===L.homeId&&compatible(L,q))||null;
      if(!h){L.attached=false;L.docked=false}
      const near=nearest(L,hs);
      if(!L.attached&&near&&near.p.distance<(L.held?K.capture:K.magnet)*L.U){
        h=near.h;L.homeId=idOf(h);L.edge=near.p.edge;L.u=along(h,near.p);L.attached=true;
      }
      const cd=cursor?.active?Math.hypot(cursor.x-L.x,cursor.y-L.y):Infinity,hover=!L.held&&cd<K.cursorReach*L.U;
      if(h&&L.attached&&L.held){const p=edgePoint(h,L.px,L.py);L.edge=p.edge;L.u=along(h,p)}
      const a=h&&L.attached?anchor(h,L.edge,L.u):null;
      if(a){L.ax=a.x;L.ay=a.y;if(Math.hypot(L.x-a.x,L.y-a.y)>K.breakAt*L.U){L.attached=false;L.docked=false}}
      let ax=-K.damp*L.vx,ay=-K.damp*L.vy;
      if(L.held){ax+=K.stiff*(L.px-L.x);ay+=K.stiff*(L.py-L.y)}
      let dock=null;
      if(h&&L.attached){
        dock=dockPoint(h,L.U,L.edge,L.u,L.baseR);
        if(view){dock.x=clamp(dock.x,L.radius,Math.max(L.radius,view.w-L.radius));dock.y=clamp(dock.y,L.radius,Math.max(L.radius,view.h-L.radius))}
        const f=clamp(1-Math.hypot(dock.x-L.x,dock.y-L.y)/(K.breakAt*L.U),.1,1),k=L.held?K.stiff*.12:L.docked?K.stiff*.85:K.stiff*K.homePull*f;
        ax+=k*(dock.x-L.x);ay+=k*(dock.y-L.y);
      }
      L.vx+=ax*d;L.vy+=ay*d;L.x+=L.vx*d;L.y+=L.vy*d;
      if(dock&&!L.held&&Math.hypot(L.x-dock.x,L.y-dock.y)<2*L.U&&Math.hypot(L.vx,L.vy)<22*L.U){
        L.docked=true;L.x=dock.x;L.y=dock.y;L.vx=L.vy=0;
      }else if(L.held||!L.attached)L.docked=false;
      const target=L.baseR*(L.held?1:L.docked?K.docked:K.released);
      {let tx=0,ty=0;if(hover){const vx=cursor.x-L.x,vy=cursor.y-L.y,len=Math.hypot(vx,vy)||1,f=1-cd/(K.cursorReach*L.U),w=f*f*(3-2*f),m=Math.min(len,K.reach*L.radius)*w;tx=vx/len*m;ty=vy/len*m}
        L.fvx+=(K.reachStiff*(tx-L.fx)-K.reachDamp*L.fvx)*d;L.fvy+=(K.reachStiff*(ty-L.fy)-K.reachDamp*L.fvy)*d;L.fx+=L.fvx*d;L.fy+=L.fvy*d}
      L.radiusV+=(180*(target-L.radius)-24*L.radiusV)*d;L.radius=clamp(L.radius+L.radiusV*d,8,120);L.hx=L.hy=L.radius;
      if(view&&view.w>0&&view.h>0){
        const rx=Math.min(L.radius,view.w/2),ry=Math.min(L.radius,view.h/2),x=clamp(L.x,rx,view.w-rx),y=clamp(L.y,ry,view.h-ry);
        if(x!==L.x)L.vx=0;if(y!==L.y)L.vy=0;L.x=x;L.y=y;
      }
    }return L;
  }
  function geometry(L,home){
    const h=homesOf(home).find(q=>idOf(q)===L.homeId&&compatible(L,q)),a=h&&L.attached?anchor(h,L.edge,L.u):null;
    const thin=a?clamp(1-Math.hypot(L.x-a.x,L.y-a.y)/(K.breakAt*L.U),0,1):0;
    return {x:L.x,y:L.y,hx:L.radius,hy:L.radius,round:1,angle:0,wobble:0,phase:0,stretch:0,ax:a?.x??L.x,ay:a?.y??L.y,
      neck:K.neck*L.U*Math.pow(thin,1.6),smooth:18*L.U,rx:n(L.fx),ry:n(L.fy),reachR:L.radius*K.lobe,thin,docked:L.docked,held:L.held,attached:!!a,homeId:L.homeId,kind:L.kind,layer:L.layer};
  }
  function grab(L,x,y,pid){if(L.held&&L.pid!==pid)return L;L.held=true;L.pid=pid;L.px=x;L.py=y;L.docked=false;return L}
  function move(L,x,y,pid){if(L.held&&L.pid===pid){L.px=x;L.py=y}return L}
  function release(L,pid){if(L.held&&L.pid===pid){L.held=false;L.pid=null;L.docked=false}return L}
  function contains(L,x,y){return Math.hypot(x-L.x,y-L.y)<=L.radius+6}
  function pullFrom(L,h,x,y,pid){
    if(!compatible(L,h))return false;
    const p=edgePoint(h,x,y);L.homeId=idOf(h);L.edge=p.edge;L.u=along(h,p);L.attached=true;L.docked=true;
    const d=dockPoint(h,L.U,L.edge,L.u,L.baseR);L.x=d.x;L.y=d.y;L.vx=L.vy=0;grab(L,x,y,pid);return true;
  }

  let state=null,el=null,started=false,last=0,homeNow=null,visible=false,cursor={active:false,x:0,y:0},pores=[];
  function surfaces(){
    const G=root.SSSDisplayGlass,doc=root.document;if(!G||!doc)return [];
    const comp=doc.documentElement.dataset.composition||'single';if(comp==='split'||comp==='grid')return [];
    const entries=G.collect(doc,root.getComputedStyle);
    const outer=entries.filter((e,i)=>!entries.some((p,j)=>j!==i&&p.kind===e.kind&&p.layer===e.layer&&
      p.rect.left<=e.rect.left&&p.rect.top<=e.rect.top&&p.rect.right>=e.rect.right&&p.rect.bottom>=e.rect.bottom&&
      (p.rect.width>e.rect.width||p.rect.height>e.rect.height||j<i)));
    return outer.map(e=>({id:e.id,ids:e.ids||[e.id],rect:e.rect,cx:e.rect.left+e.rect.width/2,
      cy:e.rect.top+e.rect.height/2,hx:e.rect.width/2,hy:e.rect.height/2,kind:e.kind||'hud',layer:e.layer||'hud',
      edge:e.role?.split(/\s+/).includes('top')?'bottom':'left'}));
  }
  function beginPointer(e,h){
    if(e.button!==0||!state||(state.held&&state.pid!==e.pointerId))return;
    if(h){if(!state.docked||!pullFrom(state,h,e.clientX,e.clientY,e.pointerId))return}else grab(state,e.clientX,e.clientY,e.pointerId);
    cursor={active:true,x:e.clientX,y:e.clientY};try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
    e.preventDefault();e.stopPropagation();
  }
  function paintPhase(){if(el&&state){el.dataset.phase=state.held?'held':state.docked?'stored':state.attached?'joining':'free';el.style.cursor=state.held?'grabbing':'grab'}}
  function endPointer(e){
    if(!state?.held||state.pid!==e.pointerId)return;
    release(state,e.pointerId);cursor.active=false;paintPhase();
  }
  function connectPointer(target,home){
    target.addEventListener('pointerdown',e=>beginPointer(e,typeof home==='function'?home():null));
    target.addEventListener('pointermove',e=>{if(state)move(state,e.clientX,e.clientY,e.pointerId)});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])target.addEventListener(type,endPointer);
  }
  function updatePores(hs){
    const wanted=new Set();
    for(const h of hs){if(!state||!compatible(state,h))continue;
      for(const side of ['left','right','top','bottom']){
        const key=h.id+':'+side;wanted.add(key);let p=pores.find(v=>v.key===key);
        if(!p){const node=document.createElement('div');node.className='display-glass-edge';node.setAttribute('aria-hidden','true');
          node.style.cssText='position:fixed;z-index:38;touch-action:none;background:transparent;cursor:grab';
          document.body.append(node);p={key,node,h,side};pores.push(p);connectPointer(node,()=>p.h)}
        p.h=h;const r=h.rect,w=14;p.node.style.display=visible&&state.docked?'block':'none';
        if(side==='left'||side==='right'){p.node.style.left=((side==='left'?r.left-w:r.left+r.width))+'px';p.node.style.top=r.top+'px';p.node.style.width=w+'px';p.node.style.height=r.height+'px'}
        else{p.node.style.left=r.left+'px';p.node.style.top=((side==='top'?r.top-w:r.top+r.height))+'px';p.node.style.width=r.width+'px';p.node.style.height=w+'px'}
      }
    }for(const p of pores)if(!wanted.has(p.key))p.node.style.display='none';
  }
  function loop(ms){
    const dt=last?(ms-last)/1000:0;last=ms;const G=root.SSSDisplayGlass,hs=surfaces(),off=!(G&&G.enabled())||!hs.length;
    if(!state&&hs.length)state=create(hs.find(h=>h.id==='mini-pocket')||hs[0],{w:root.innerWidth,h:root.innerHeight});
    if(state){
      if(off){release(state,state.pid);cursor.active=false}else step(state,hs,dt,{w:root.innerWidth,h:root.innerHeight},cursor);
      homeNow=state.attached?hs.find(h=>h.id===state.homeId&&compatible(state,h))||null:null;visible=!off;
      if(el){const g=geometry(state,hs);el.style.display=visible?'block':'none';el.style.cursor=state.held?'grabbing':'grab';
        el.style.left=(state.x-g.hx)+'px';el.style.top=(state.y-g.hy)+'px';el.style.width=(g.hx*2)+'px';el.style.height=(g.hy*2)+'px';el.style.borderRadius='50%';
        paintPhase();el.dataset.layer=state.layer}
    }updatePores(hs);root.requestAnimationFrame(loop);
  }
  function snapshot(){return state&&visible?{lens:geometry(state,homeNow),home:homeNow}:null}
  function start(){
    if(started||typeof document!=='object')return;started=true;
    el=document.createElement('div');el.id='display-lens';el.setAttribute('aria-label','Glass drop');el.setAttribute('role','button');el.tabIndex=0;
    el.style.cssText='position:fixed;z-index:39;display:none;touch-action:none;cursor:grab;background:transparent;pointer-events:auto;border-radius:50%';
    document.body.append(el);connectPointer(el);
    for(const type of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(type,endPointer,{capture:true});
    root.addEventListener('pointermove',e=>{
      if(state)move(state,e.clientX,e.clientY,e.pointerId);
      const own=e.target===el||e.target?.classList?.contains('display-glass-edge');
      const controls=!own&&e.target?.closest?.('button,a,input,label,[role="slider"],[data-display-occupancy]');
      cursor={active:!controls&&e.pointerType!=='touch',x:e.clientX,y:e.clientY};
    },{passive:true});
    root.addEventListener('blur',()=>{cursor.active=false;if(state){release(state,state.pid);paintPhase()}});
    el.addEventListener('pointerleave',()=>{if(!state?.held)cursor.active=false});
    el.addEventListener('keydown',e=>{if(!state)return;const a={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[e.key];
      if(a){state.docked=false;state.attached=false;state.x+=a[0];state.y+=a[1];e.preventDefault()}});
    root.requestAnimationFrame(loop);
  }
  return Object.freeze({K,create,step,geometry,grab,move,release,contains,snapshot,start,scaleOf,dockPoint,edgePoint,compatible,pullFrom});
});
