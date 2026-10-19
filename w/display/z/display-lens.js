/* A round glass drop belongs to one UI kind/layer. Its pointer surface and
 * derived geometry are separate from the UI's own controls and field topology.
 * Soft-lock: a site may offer lock targets by identity (offer/withdraw). Released over one, the drop
 * locks: a `field` target lends its exact rectangle (rounded), a `body` target keeps the released
 * circle and is followed. A vanished target unlocks the drop where it is; pulling it unlocks it. */
(function(root,factory){
  'use strict';const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.SSSDisplayLens=api;if(typeof document==='object')api.start()}
})(typeof globalThis==='object'?globalThis:this,function(root){
  'use strict';
  /* The centre never follows the cursor: a nearby cursor only makes the flesh reach (a lobe from the anchored centre);
   * connected tissue draws a free drop home slowly. */
  const K=Object.freeze({stiff:180,damp:24,cursorReach:155,reach:.95,lobe:.42,reachStiff:140,reachDamp:17,homePull:.07,holdSlop:5,magnify:1.13,magnet:80,breakAt:185,neck:28,capture:38,released:1.32,docked:.86});
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
      kind:h?.kind||'hud',layer:h?.layer||'hud',ax:d.x,ay:d.y,round:1,stretch:0,fx:0,fy:0,fvx:0,fvy:0,
      lock:null,hxV:0,hyV:0,corner:0};
  }
  /* resolved targets: {id,kind:'field'|'body',cx,cy,hx,hy,r?} in viewport pixels */
  function candidateAt(L,targets){
    let best=null;
    for(const t of targets||[]){
      if(!t||!Number.isFinite(t.cx)||!Number.isFinite(t.cy))continue;
      const d=Math.hypot(L.x-t.cx,L.y-t.cy);
      const hit=t.kind==='field'?Math.abs(L.x-t.cx)<=t.hx&&Math.abs(L.y-t.cy)<=t.hy:d<=L.radius+(t.hx||0);
      if(hit&&(!best||d<best.d))best={t,d};
    }return best?best.t:null;
  }
  function lockTo(L,t){if(!t)return L;L.lock={id:t.id,kind:t.kind};L.attached=false;L.docked=false;L.homeId=null;L.fx=L.fy=L.fvx=L.fvy=0;return L}
  function unlock(L){if(!L.lock)return L;L.lock=null;L.aperture=false;L.radius=clamp(Math.min(L.hx,L.hy),8,120);L.radiusV=0;L.hxV=L.hyV=0;L.corner=0;L.hx=L.hy=L.radius;return L}
  function stepLocked(L,t,d,view){
    const f=t.kind==='body'&&t.frame,shape=f||t;L.aperture=!!f;
    L.vx+=(K.stiff*(shape.cx-L.x)-K.damp*L.vx)*d;L.vy+=(K.stiff*(shape.cy-L.y)-K.damp*L.vy)*d;L.x+=L.vx*d;L.y+=L.vy*d;
    L.fvx=L.fvy=0;L.fx+=(0-L.fx)*Math.min(1,d*12);L.fy+=(0-L.fy)*Math.min(1,d*12);
    if(t.kind==='field'||f){
      L.hxV+=(K.stiff*(shape.hx-L.hx)-K.damp*L.hxV)*d;L.hyV+=(K.stiff*(shape.hy-L.hy)-K.damp*L.hyV)*d;
      L.hx=Math.max(8,L.hx+L.hxV*d);L.hy=Math.max(8,L.hy+L.hyV*d);
      L.corner=Math.min(Number.isFinite(shape.r)?Math.max(0,shape.r):14*L.U,L.hx,L.hy);L.radius=Math.min(L.hx,L.hy);
      if(f&&view){L.hx=Math.min(L.hx,Math.max(1,view.w/2));L.hy=Math.min(L.hy,Math.max(1,view.h/2));L.x=clamp(L.x,L.hx,Math.max(L.hx,view.w-L.hx));L.y=clamp(L.y,L.hy,Math.max(L.hy,view.h-L.hy));L.corner=Math.min(L.corner,L.hx,L.hy)}
    }else{
      const target=L.baseR*K.released;L.radiusV+=(180*(target-L.radius)-24*L.radiusV)*d;L.radius=clamp(L.radius+L.radiusV*d,8,120);L.hx=L.hy=L.radius;L.corner=0;
    }
  }
  function nearest(L,hs){let best=null;for(const h of hs){if(!compatible(L,h))continue;const p=edgePoint(h,L.x,L.y);if(!best||p.distance<best.p.distance)best={h,p}}return best}
  function step(L,home,dt,view,cursor,target){
    const hs=homesOf(home);dt=clamp(n(dt),0,.06);if(!dt)return L;
    if(view)L.baseR=radiusOf(null,view);L.U=L.baseR/60;
    if(L.lock&&!L.held&&!(target&&target.id===L.lock.id))unlock(L);
    const parts=Math.max(1,Math.ceil(dt/(1/120))),d=dt/parts;
    if(L.lock&&!L.held){for(let i=0;i<parts;i++)stepLocked(L,target,d,view);return L}
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
    const locked=L.lock?.kind||null,field=locked==='field',shaped=field||!!(locked&&L.aperture);
    return {x:L.x,y:L.y,hx:shaped?L.hx:L.radius,hy:shaped?L.hy:L.radius,round:shaped?0:1,corner:shaped?L.corner:0,angle:0,wobble:0,phase:0,stretch:0,ax:a?.x??L.x,ay:a?.y??L.y,
      neck:K.neck*L.U*Math.pow(thin,1.6),smooth:18*L.U,rx:locked?0:n(L.fx),ry:locked?0:n(L.fy),reachR:locked?0:L.radius*K.lobe,mag:locked?0:1-1/K.magnify,focus:field?1:0,lock:L.lock?{...L.lock}:null,thin,docked:L.docked,held:L.held,attached:!!a,homeId:L.homeId,kind:L.kind,layer:L.layer};
  }
  function grab(L,x,y,pid){if(L.held&&L.pid!==pid)return L;unlock(L);L.held=true;L.pid=pid;L.px=x;L.py=y;L.docked=false;return L}
  function move(L,x,y,pid){if(L.held&&L.pid===pid){L.px=x;L.py=y}return L}
  function release(L,pid){if(L.held&&L.pid===pid){L.held=false;L.pid=null;L.docked=false}return L}
  function contains(L,x,y){const edge=L.lock?(root.SSSDisplayGlass?.readInset?.()??8):6;if(L.lock&&(L.lock.kind==='field'||L.aperture)){const r=Math.min(L.corner||0,L.hx,L.hy),dx=Math.max(0,Math.abs(x-L.x)-L.hx+r),dy=Math.max(0,Math.abs(y-L.y)-L.hy+r);return Math.hypot(dx,dy)<=r+edge}return Math.hypot(x-L.x,y-L.y)<=L.radius+edge}
  function pullFrom(L,h,x,y,pid){
    if(!compatible(L,h))return false;
    const p=edgePoint(h,x,y);L.homeId=idOf(h);L.edge=p.edge;L.u=along(h,p);L.attached=true;L.docked=true;
    const d=dockPoint(h,L.U,L.edge,L.u,L.baseR);L.x=d.x;L.y=d.y;L.vx=L.vy=0;grab(L,x,y,pid);return true;
  }

  let state=null,el=null,started=false,last=0,homeNow=null,visible=false,cursor={active:false,x:0,y:0},pores=[];
  const offers=new Map();
  /* A site lends identity-bound targets; Display never learns what they mean. spec.kind 'field' gives rect(),
   * 'body' gives point() (+ optional r); a getter returning null means the target is not present now. */
  function offer(id,spec){
    if(typeof id!=='string'||!id)throw new TypeError('lock target id required');
    if(!spec||(spec.kind==='field'?typeof spec.rect!=='function':spec.kind==='body'?typeof spec.point!=='function':true))throw new TypeError('lock target '+id+' needs kind field+rect() or body+point()');
    offers.set(id,spec);return id;
  }
  function withdraw(id){return offers.delete(id)}
  function resolveTargets(lockedId=state?.lock?.id){
    const out=[];
    for(const [id,spec] of offers){
      try{
        if(spec.kind==='field'){const r=spec.rect();if(r&&r.width>0&&r.height>0)out.push({id,kind:'field',cx:r.left+r.width/2,cy:r.top+r.height/2,hx:r.width/2,hy:r.height/2,r:spec.r})}
        else{const p=spec.point();if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)){
          const t={id,kind:'body',cx:p.x,cy:p.y,hx:Number.isFinite(p.r)?p.r:24};
          /* Readable extent is lent only by the contacted body. It is never a
           * second hit area, a site-selected mode, or work for every candidate. */
          if(id===lockedId&&typeof spec.frame==='function'){try{const r=spec.frame();if(r&&Number.isFinite(r.left)&&Number.isFinite(r.top)&&Number.isFinite(r.width)&&Number.isFinite(r.height)&&r.width>0&&r.height>0)t.frame={cx:r.left+r.width/2,cy:r.top+r.height/2,hx:r.width/2,hy:r.height/2,r:r.r}}catch(_){/* retain the valid ordinary body if its finer extent is unavailable */}}
          out.push(t);
        }}
      }catch(_){/* a failing getter means absent */}
    }return out;
  }
  function surfaces(){
    const G=root.SSSDisplayGlass,doc=root.document;if(!G||!doc)return [];
    const comp=doc.documentElement.dataset.composition||'single';if(comp==='split'||comp==='grid')return [];
    const entries=G.collect(doc,root.getComputedStyle);
    const outer=entries.filter((e,i)=>!entries.some((p,j)=>j!==i&&p.kind===e.kind&&p.layer===e.layer&&
      p.rect.left<=e.rect.left&&p.rect.top<=e.rect.top&&p.rect.right>=e.rect.right&&p.rect.bottom>=e.rect.bottom&&
      (p.rect.width>e.rect.width||p.rect.height>e.rect.height||j<i)));
    return outer.map(e=>({id:e.id,ids:e.ids||[e.id],rect:e.rect,readRect:e.readRect,inset:e.inset,cx:e.rect.left+e.rect.width/2,
      cy:e.rect.top+e.rect.height/2,hx:e.rect.width/2,hy:e.rect.height/2,kind:e.kind||'hud',layer:e.layer||'hud',
      edge:e.role?.split(/\s+/).includes('top')?'bottom':'left'}));
  }
  /* The drop lets the world through: hover is never blocked and a direct click passes to whatever
   * lies under it. Pressing on the drop and pulling takes it at once (or pulls it from a reservoir edge). */
  let pending=null,replaying=false;
  function underDrop(x,y){
    if(!state||!visible)return null;
    if(contains(state,x,y))return {pore:null};
    if(state.docked)for(const p of pores){if(p.node.style.display==='none')continue;const r=p.box;if(r&&x>=r.l&&x<=r.r&&y>=r.t&&y<=r.b)return {pore:p}}
    return null;
  }
  function replay(target,type,src,x,y){
    if(!target||typeof root.PointerEvent!=='function')return;
    replaying=true;
    try{target.dispatchEvent(new root.PointerEvent(type,{bubbles:true,cancelable:true,composed:true,pointerId:src.pointerId,pointerType:src.pointerType||'mouse',isPrimary:src.isPrimary!==false,button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:y}))}
    finally{replaying=false}
  }
  function activate(){
    const p=pending;pending=null;if(!p||!state)return;
    if(p.pore){if(!state.docked||!pullFrom(state,p.pore.h,p.x,p.y,p.id))return}else grab(state,p.x,p.y,p.id);
    cursor={active:true,x:p.x,y:p.y};paintPhase();
  }
  function onDown(e){
    if(replaying||e.button!==0||!state||state.held)return;
    const hit=underDrop(e.clientX,e.clientY);if(!hit)return;
    pending={id:e.pointerId,x:e.clientX,y:e.clientY,t0:last,target:e.target,src:e,pore:hit.pore};
    e.stopPropagation();e.preventDefault();
  }
  function onMove(e){
    if(replaying)return;
    if(pending&&pending.id===e.pointerId&&Math.hypot(e.clientX-pending.x,e.clientY-pending.y)>K.holdSlop)activate();
    if(state)move(state,e.clientX,e.clientY,e.pointerId);
    const own=state?.held&&state.pid===e.pointerId;
    const controls=!own&&e.target?.closest?.('button,a,input,label,[role="slider"],[data-display-occupancy]');
    cursor={active:!controls&&e.pointerType!=='touch',x:e.clientX,y:e.clientY};
  }
  function onUp(e){
    if(replaying)return;
    if(pending&&pending.id===e.pointerId){const p=pending;pending=null;if(e.type==='pointerup')replay(p.target,'pointerdown',p.src,p.x,p.y);return}
    endPointer(e);
  }
  function paintPhase(){if(el&&state){el.dataset.phase=state.held?'held':state.lock?'locked':state.docked?'stored':state.attached?'joining':'free';el.dataset.lock=state.lock?.kind||'';
    const de=root.document?.documentElement;if(de){if(state.lock){de.dataset.displayLensLock=state.lock.kind;de.dataset.displayLensTarget=state.lock.id}else{delete de.dataset.displayLensLock;delete de.dataset.displayLensTarget}}}}
  function endPointer(e){
    if(!state?.held||state.pid!==e.pointerId)return;
    release(state,e.pointerId);cursor.active=false;
    const t=candidateAt(state,resolveTargets());if(t)lockTo(state,t);
    paintPhase();
  }
  function updatePores(hs){
    const wanted=new Set();
    for(const h of hs){if(!state||!compatible(state,h))continue;
      for(const side of ['left','right','top','bottom']){
        const key=h.id+':'+side;wanted.add(key);let p=pores.find(v=>v.key===key);
        if(!p){const node=document.createElement('div');node.className='display-glass-edge';node.setAttribute('aria-hidden','true');
          node.style.cssText='position:fixed;z-index:38;touch-action:none;background:transparent;pointer-events:none';
          document.body.append(node);p={key,node,h,side};pores.push(p)}
        p.h=h;const r=h.rect,w=14;p.node.style.display=visible&&state.docked?'block':'none';
        let l,t,W,H;
        if(side==='left'||side==='right'){l=side==='left'?r.left-w:r.left+r.width;t=r.top;W=w;H=r.height}
        else{l=r.left;t=side==='top'?r.top-w:r.top+r.height;W=r.width;H=w}
        p.node.style.left=l+'px';p.node.style.top=t+'px';p.node.style.width=W+'px';p.node.style.height=H+'px';p.box={l,t,r:l+W,b:t+H};
      }
    }for(const p of pores)if(!wanted.has(p.key))p.node.style.display='none';
  }
  function loop(ms){
    const dt=last?(ms-last)/1000:0;last=ms;const G=root.SSSDisplayGlass,hs=surfaces(),off=!(G&&G.enabled())||!hs.length;
    if(!state&&hs.length)state=create(hs.find(h=>h.id==='mini-pocket')||hs[0],{w:root.innerWidth,h:root.innerHeight});
    if(state){
      const target=state.lock?resolveTargets().find(t=>t.id===state.lock.id)||null:null;
      if(off){pending=null;release(state,state.pid);unlock(state);cursor.active=false}else step(state,hs,dt,{w:root.innerWidth,h:root.innerHeight},cursor,target);
      homeNow=state.attached?hs.find(h=>h.id===state.homeId&&compatible(state,h))||null:null;visible=!off;
      if(el){const g=geometry(state,hs);el.style.display=visible?'block':'none';
        el.style.left=(state.x-g.hx)+'px';el.style.top=(state.y-g.hy)+'px';el.style.width=(g.hx*2)+'px';el.style.height=(g.hy*2)+'px';el.style.borderRadius=g.round?'50%':g.corner+'px';
        paintPhase();el.dataset.layer=state.layer}
    }updatePores(hs);root.requestAnimationFrame(loop);
  }
  function snapshot(){return state&&visible?{lens:geometry(state,homeNow),home:homeNow}:null}
  function start(){
    if(started||typeof document!=='object')return;started=true;
    el=document.createElement('div');el.id='display-lens';el.setAttribute('aria-label','Glass drop');el.setAttribute('role','button');el.tabIndex=0;
    el.style.cssText='position:fixed;z-index:39;display:none;touch-action:none;background:transparent;pointer-events:none;border-radius:50%';
    document.body.append(el);
    root.addEventListener('pointerdown',onDown,{capture:true});
    root.addEventListener('pointermove',onMove,{capture:true,passive:true});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(type,onUp,{capture:true});
    root.addEventListener('blur',()=>{pending=null;cursor.active=false;if(state){release(state,state.pid);paintPhase()}});
    el.addEventListener('keydown',e=>{if(!state)return;const a={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[e.key];
      if(a){state.docked=false;state.attached=false;state.x+=a[0];state.y+=a[1];e.preventDefault()}});
    root.requestAnimationFrame(loop);
  }
  return Object.freeze({K,create,step,geometry,grab,move,release,contains,snapshot,start,scaleOf,dockPoint,edgePoint,compatible,pullFrom,candidateAt,lockTo,unlock,offer,withdraw,resolveTargets});
});
