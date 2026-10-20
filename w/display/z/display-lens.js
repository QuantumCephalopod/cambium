/* A capillary glass drop belongs to one UI kind/layer. Its pointer surface and
 * derived geometry are separate from the UI's own controls and field topology.
 * Soft-lock: a site may offer lock targets by identity (offer/withdraw). Released over one, the drop
 * locks: a `field` target lends its exact rectangle (rounded), a `body` target keeps the released
 * circle and is followed. Offers own lifetime; getters lend current geometry. Withdrawal and
 * pulling release the same moving flesh toward the nearest compatible reservoir. */
(function(root,factory){
  'use strict';const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.SSSDisplayLens=api;if(typeof document==='object')api.start()}
})(typeof globalThis==='object'?globalThis:this,function(root){
  'use strict';
  /* The centre never follows the cursor: a nearby cursor strains the flesh without adding a second lobe;
   * released, unlocked flesh returns home without a distant capillary bridge. */
  const K=Object.freeze({stiff:180,damp:24,cursorReach:155,reach:.95,reachStiff:140,reachDamp:17,homePull:.07,returnPull:.18,holdSlop:5,magnify:1.13,magnet:80,breakAt:185,capture:38,released:1.32,docked:.86,capillary:110,viscosity:18,maxStrain:Math.log(1.28)});
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
  function boundedDock(L,h,edge,u,view){
    const p=dockPoint(h,L.U,edge,u,L.baseR);
    if(view){const e=extent(L);p.x=clamp(p.x,e.x,Math.max(e.x,view.w-e.x));p.y=clamp(p.y,e.y,Math.max(e.y,view.h-e.y))}
    return p;
  }
  function create(home,view){
    const h=homesOf(home)[0]||null,base=radiusOf(h,view),d=h?dockPoint(h,base/60,h.edge||'left',.5,base):{x:(view?.w||600)/2,y:(view?.h||400)/2};
    return {x:d.x,y:d.y,vx:0,vy:0,baseR:base,radius:base*K.docked,hx:base*K.docked,hy:base*K.docked,U:base/60,
      held:false,pid:null,px:d.x,py:d.y,docked:!!h,attached:!!h,homeId:h?idOf(h):null,edge:h?.edge||'left',u:.5,
      kind:h?.kind||'hud',layer:h?.layer||'hud',ax:d.x,ay:d.y,round:1,stretch:0,fx:0,fy:0,fvx:0,fvy:0,
      lock:null,hxV:0,hyV:0,corner:base*K.docked,cornerV:0,protect:0,focus:0,join:h?1:0,strain:0,strainV:0,angle:0,angleV:0};
  }
  /* resolved targets: {id,kind:'field'|'body',cx,cy,hx,hy,r?} in viewport pixels */
  function candidateAt(L,targets){
    let best=null;const g=geometry(L,null),c=Math.cos(g.angle),s=Math.sin(g.angle);
    for(const t of targets||[]){
      if(!t||!Number.isFinite(t.cx)||!Number.isFinite(t.cy))continue;
      const d=Math.hypot(L.x-t.cx,L.y-t.cy);
      const dx=t.cx-L.x,dy=t.cy-L.y,r=t.hx||0;
      const hit=t.kind==='field'?Math.abs(dx)<=t.hx&&Math.abs(dy)<=t.hy:Math.hypot((c*dx+s*dy)/(g.hx+r),(-s*dx+c*dy)/(g.hy+r))<=1;
      if(hit&&(!best||d<best.d))best={t,d};
    }return best?best.t:null;
  }
  function lockTo(L,t){if(!t)return L;L.departure=null;L.lock={id:t.id,kind:t.kind};L.attached=false;L.docked=false;L.homeId=null;L.fx=L.fy=L.fvx=L.fvy=0;return L}
  function unlock(L){L.lock=null;return L}
  /* A declared membrane departure is different from a temporarily missing
   * projection. The same unheld world drop leaves contact under the camera's
   * closing cover. Its measured outward route ends at the viewport boundary. */
  function depart(L,origin,view,duration=.38){
    if(!L||L.held||L.lock?.kind!=='body'||!view||view.w<=0||view.h<=0)return L;
    const e=extent(L);let x=L.x-n(origin?.x??view.w/2),y=L.y-n(origin?.y??view.h/2);
    if(Math.hypot(x,y)<1){x=L.vx;y=L.vy}
    if(Math.hypot(x,y)<1){
      const edges=[{d:L.x-e.x,x:-1,y:0},{d:view.w-e.x-L.x,x:1,y:0},{d:L.y-e.y,x:0,y:-1},{d:view.h-e.y-L.y,x:0,y:1}];
      edges.sort((a,b)=>a.d-b.d);({x,y}=edges[0]);
    }
    const length=Math.hypot(x,y);x/=length;y/=length;
    const dx=x>0?(view.w-e.x-L.x)/x:x<0?(e.x-L.x)/x:Infinity,dy=y>0?(view.h-e.y-L.y)/y:y<0?(e.y-L.y)/y:Infinity;
    const distance=Math.max(0,Math.min(dx,dy)),seconds=Math.max(.04,n(duration));
    unlock(L);L.attached=L.docked=false;L.homeId=null;
    L.departure={x:L.x+x*distance,y:L.y+y*distance,left:seconds,duration:seconds};
    return L;
  }
  function ease(value,target,d){const next=target+(value-target)*Math.exp(-12*d);return Math.abs(next-target)<1e-5?target:next}
  function spring(L,key,want,d){
    const v=key+'V';L[v]+=(K.stiff*(want-L[key])-K.damp*L[v])*d;L[key]+=L[v]*d;
    if(Math.abs(L[key]-want)<1e-5&&Math.abs(L[v])<1e-4){L[key]=want;L[v]=0}
  }
  function shapeStep(L,hx,hy,corner,d){
    spring(L,'hx',hx,d);spring(L,'hy',hy,d);spring(L,'corner',corner,d);
    L.hx=Math.max(1,L.hx);L.hy=Math.max(1,L.hy);L.corner=clamp(L.corner,0,Math.min(L.hx,L.hy));L.radius=Math.min(L.hx,L.hy);
  }
  function opticsStep(L,d){L.protect=ease(L.protect,L.lock?1:0,d);L.focus=ease(L.focus,L.lock?.kind==='field'?1:0,d);L.join=ease(L.join,L.attached?1:0,d)}
  /* A bounded second shape mode: surface tension restores the circle; viscosity
   * damps strain and orientation. Reciprocal axes conserve area under stretch.
   * Position/reading accommodation remain their existing, separate constraints. */
  function capillaryStep(L,a,d){
    const speed=Math.hypot(L.vx,L.vy),pull=a?Math.hypot(L.x-a.x,L.y-a.y):0;
    let x=L.vx,y=L.vy,want=.1*speed/Math.max(1,L.baseR*3);
    if(a&&pull>L.radius*.4){x=L.x-a.x;y=L.y-a.y;want=Math.max(want,.2*clamp(pull/L.radius-.4,0,1))}
    if(Math.hypot(L.fx,L.fy)>1&&speed<L.baseR){x=L.fx;y=L.fy;want=Math.max(want,.13*Math.hypot(x,y)/L.radius)}
    if(L.lock){want=0;x=1;y=0}
    want=clamp(want,0,K.maxStrain);
    L.strainV+=(K.capillary*(want-L.strain)-K.viscosity*L.strainV)*d;L.strain=clamp(L.strain+L.strainV*d,0,K.maxStrain);
    if(Math.abs(L.strain-want)<1e-6&&Math.abs(L.strainV)<1e-5){L.strain=want;L.strainV=0}
    const aim=Math.hypot(x,y)>1e-4?Math.atan2(y,x):L.angle;
    const delta=.5*Math.atan2(Math.sin(2*(aim-L.angle)),Math.cos(2*(aim-L.angle)));
    L.angleV+=(60*delta-16*L.angleV)*d;L.angle+=L.angleV*d;
  }
  function extent(L){const stretch=Math.exp(L.strain),hx=L.hx*stretch,hy=L.hy/stretch,c=Math.abs(Math.cos(L.angle)),s=Math.abs(Math.sin(L.angle)),shaped=Math.abs(L.hx-L.hy)>1e-4||L.corner<Math.min(L.hx,L.hy)-1e-4,r=Math.min(L.corner,hx,hy);return {hx,hy,x:shaped?(hx-r)*c+(hy-r)*s+r:Math.hypot(hx*c,hy*s),y:shaped?(hx-r)*s+(hy-r)*c+r:Math.hypot(hx*s,hy*c)}}
  function boundBody(L,view){
    if(!view)return;let e=extent(L);const fit=Math.min(1,view.w/(2*e.x),view.h/(2*e.y));
    if(fit<1){L.hx*=fit;L.hy*=fit;e=extent(L)}
    const x=clamp(L.x,e.x,Math.max(e.x,view.w-e.x)),y=clamp(L.y,e.y,Math.max(e.y,view.h-e.y));
    if(x!==L.x)L.vx=0;if(y!==L.y)L.vy=0;L.x=x;L.y=y;L.radius=Math.min(L.hx,L.hy);L.corner=Math.min(L.corner,L.radius);
  }
  function stepLocked(L,t,d,view){
    if(t.pending){
      /* No invented camera frame: damp the last actual motion until this
       * still-offered identity has a projection again. */
      const decay=Math.exp(-K.damp*d);L.vx*=decay;L.vy*=decay;L.x+=L.vx*d;L.y+=L.vy*d;
      L.hxV*=decay;L.hyV*=decay;L.cornerV*=decay;if(t.kind==='body')boundBody(L,view);return;
    }
    const f=t.kind==='body'&&t.frame,shape=f||t;
    L.vx+=(K.stiff*(shape.cx-L.x)-K.damp*L.vx)*d;L.vy+=(K.stiff*(shape.cy-L.y)-K.damp*L.vy)*d;L.x+=L.vx*d;L.y+=L.vy*d;
    L.fvx=L.fvy=0;L.fx+=(0-L.fx)*Math.min(1,d*12);L.fy+=(0-L.fy)*Math.min(1,d*12);
    if(t.kind==='field'||f){
      shapeStep(L,shape.hx,shape.hy,Math.min(Number.isFinite(shape.r)?Math.max(0,shape.r):14*L.U,shape.hx,shape.hy),d);
    }else{
      const target=L.baseR*K.released;shapeStep(L,target,target,target,d);
    }
    if(t.kind==='body')boundBody(L,view);
  }
  function nearest(L,hs){let best=null;for(const h of hs){if(!compatible(L,h))continue;const p=edgePoint(h,L.x,L.y);if(!best||p.distance<best.p.distance)best={h,p}}return best}
  function step(L,home,dt,view,cursor,target,reduced=false){
    const hs=homesOf(home);dt=clamp(n(dt),0,.06);if(!dt)return L;
    if(view)L.baseR=radiusOf(null,view);L.U=L.baseR/60;
    if(L.lock&&!L.held&&!(target&&target.id===L.lock.id&&target.kind===L.lock.kind))unlock(L);
    const parts=Math.max(1,Math.ceil(dt/(1/120))),d=dt/parts;
    if(reduced&&L.departure){L.departure=null;settle(L,hs,view,null);return L}
    if(L.lock&&!L.held){for(let i=0;i<parts;i++){stepLocked(L,target,d,view);capillaryStep(L,null,d);if(target.kind==='body')boundBody(L,view);opticsStep(L,d)}if(reduced)settle(L,hs,view,target);return L}
    for(let i=0;i<parts;i++){
      if(L.departure&&!L.held){
        const flow=L.departure,w=6/flow.duration,decay=Math.exp(-w*d);
        for(const [position,velocity] of [['x','vx'],['y','vy']]){const delta=L[position]-flow[position],c=L[velocity]+w*delta;L[position]=flow[position]+(delta+c*d)*decay;L[velocity]=(L[velocity]-w*c*d)*decay}
        const radius=L.baseR*K.released;shapeStep(L,radius,radius,radius,d);capillaryStep(L,null,d);opticsStep(L,d);boundBody(L,view);
        flow.left-=d;if(flow.left<=1e-6)L.departure=null;
        continue;
      }
      let h=hs.find(q=>idOf(q)===L.homeId&&compatible(L,q))||null;
      if(!h){L.attached=false;L.docked=false}
      const near=nearest(L,hs);
      if(!L.attached&&near&&near.p.distance<(L.held?K.capture:K.magnet)*L.U){
        h=near.h;L.homeId=idOf(h);L.edge=near.p.edge;L.u=along(h,near.p);L.attached=true;
      }
      const cd=cursor?.active?Math.hypot(cursor.x-L.x,cursor.y-L.y):Infinity,hover=!L.held&&cd<K.cursorReach*L.U;
      if(h&&L.attached&&L.held){const p=edgePoint(h,L.px,L.py);L.edge=p.edge;L.u=along(h,p)}
      const a=h&&L.attached?anchor(h,L.edge,L.u):null;
      if(a){L.ax=a.x;L.ay=a.y;const e=extent(L),dx=L.x-a.x,dy=L.y-a.y,len=Math.hypot(dx,dy)||1,c=Math.cos(L.angle),s=Math.sin(L.angle),support=Math.hypot(e.hx*(c*dx+s*dy)/len,e.hy*(-s*dx+c*dy)/len);if(len>support+Math.min(L.radius*.25,24*L.U)){L.attached=false;L.docked=false}}
      let ax=-K.damp*L.vx,ay=-K.damp*L.vy;
      if(L.held){ax+=K.stiff*(L.px-L.x);ay+=K.stiff*(L.py-L.y)}
      let dock=null;
      if(h&&L.attached){
        dock=boundedDock(L,h,L.edge,L.u,view);
        const f=clamp(1-Math.hypot(dock.x-L.x,dock.y-L.y)/(K.breakAt*L.U),.1,1),k=L.held?K.stiff*.12:L.docked?K.stiff*.85:K.stiff*K.homePull*f;
        ax+=k*(dock.x-L.x);ay+=k*(dock.y-L.y);
      }
      /* Free-space return is attraction, not contact. Only nearby physical
       * surfaces may set attached/join; held and locked relations take priority. */
      if(!L.held&&!L.attached&&near){
        const p=boundedDock(L,near.h,near.p.edge,along(near.h,near.p),view),k=K.stiff*K.returnPull;
        ax+=k*(p.x-L.x);ay+=k*(p.y-L.y);
      }
      L.vx+=ax*d;L.vy+=ay*d;L.x+=L.vx*d;L.y+=L.vy*d;
      if(dock&&!L.held&&Math.hypot(L.x-dock.x,L.y-dock.y)<2*L.U&&Math.hypot(L.vx,L.vy)<22*L.U){
        L.docked=true;L.x=dock.x;L.y=dock.y;L.vx=L.vy=0;
      }else if(L.held||!L.attached)L.docked=false;
      const target=L.baseR*(L.held?1:L.docked?K.docked:K.released);
      {let tx=0,ty=0;if(hover){const vx=cursor.x-L.x,vy=cursor.y-L.y,len=Math.hypot(vx,vy)||1,f=1-cd/(K.cursorReach*L.U),w=f*f*(3-2*f),m=Math.min(len,K.reach*L.radius)*w;tx=vx/len*m;ty=vy/len*m}
        L.fvx+=(K.reachStiff*(tx-L.fx)-K.reachDamp*L.fvx)*d;L.fvy+=(K.reachStiff*(ty-L.fy)-K.reachDamp*L.fvy)*d;L.fx+=L.fvx*d;L.fy+=L.fvy*d}
      shapeStep(L,target,target,target,d);capillaryStep(L,L.attached?a:null,d);opticsStep(L,d);
      if(view&&view.w>0&&view.h>0){
        boundBody(L,view);
      }
    }if(reduced)settle(L,hs,view,target);return L;
  }
  function settle(L,hs,view,t){
    L.strain=L.strainV=L.angle=L.angleV=0;
    if(L.lock&&t.pending){L.vx=L.vy=L.hxV=L.hyV=L.cornerV=0;L.protect=1;L.focus=L.lock.kind==='field'?1:0;L.join=0;return}
    if(!L.lock&&!L.held&&!L.attached){const near=nearest(L,hs);if(near){L.homeId=idOf(near.h);L.edge=near.p.edge;L.u=along(near.h,near.p);L.attached=true}}
    const f=L.lock&&(t.frame||t),framed=f&&(t.kind==='field'||t.frame),h=hs.find(q=>idOf(q)===L.homeId&&compatible(L,q));
    const p=f?{x:f.cx,y:f.cy}:L.held?{x:L.px,y:L.py}:L.attached&&h?dockPoint(h,L.U,L.edge,L.u,L.baseR):L;
    const radius=L.baseR*(L.held?1:L.attached?K.docked:K.released);
    L.hx=framed?f.hx:radius;L.hy=framed?f.hy:radius;L.corner=framed?Math.min(Number.isFinite(f.r)?Math.max(0,f.r):14*L.U,L.hx,L.hy):radius;
    L.x=p.x;L.y=p.y;if(view){L.hx=Math.min(L.hx,view.w/2);L.hy=Math.min(L.hy,view.h/2);L.x=clamp(L.x,L.hx,view.w-L.hx);L.y=clamp(L.y,L.hy,view.h-L.hy)}
    L.radius=Math.min(L.hx,L.hy);L.corner=Math.min(L.corner,L.radius);L.docked=!L.held&&!L.lock&&L.attached;
    L.vx=L.vy=L.hxV=L.hyV=L.cornerV=L.fx=L.fy=L.fvx=L.fvy=0;L.protect=L.lock?1:0;L.focus=L.lock?.kind==='field'?1:0;L.join=L.attached?1:0;
  }
  function geometry(L,home){
    const h=homesOf(home).find(q=>idOf(q)===L.homeId&&compatible(L,q)),a=h&&L.attached?anchor(h,L.edge,L.u):null;
    const thin=a?clamp(1-Math.hypot(L.x-a.x,L.y-a.y)/(K.breakAt*L.U),0,1):0;
    const locked=L.lock?.kind||null,shaped=Math.abs(L.hx-L.hy)>1e-4||L.corner<Math.min(L.hx,L.hy)-1e-4,e=extent(L);
    return {x:L.x,y:L.y,hx:e.hx,hy:e.hy,boundX:e.x,boundY:e.y,round:shaped?0:1,corner:Math.min(L.corner,e.hx,e.hy),angle:L.angle,wobble:0,phase:0,stretch:Math.exp(L.strain),ax:a?.x??L.x,ay:a?.y??L.y,
      neck:0,smooth:Math.min(L.radius*.5,48*L.U),rx:locked?0:n(L.fx),ry:locked?0:n(L.fy),reachR:0,mag:(1-L.protect)*(1-1/K.magnify),protect:L.protect,focus:L.focus,lock:L.lock?{...L.lock}:null,thin,docked:L.docked,held:L.held,attached:!!a,homeId:L.homeId,kind:L.kind,layer:L.layer};
  }
  function grab(L,x,y,pid){if(L.held&&L.pid!==pid)return L;L.departure=null;unlock(L);L.held=true;L.pid=pid;L.px=x;L.py=y;L.docked=false;return L}
  function move(L,x,y,pid){if(L.held&&L.pid===pid){L.px=x;L.py=y}return L}
  function release(L,pid){if(L.held&&L.pid===pid){L.held=false;L.pid=null;L.docked=false}return L}
  function contains(L,x,y){const g=geometry(L,null),edge=Math.max(6,(root.SSSDisplayGlass?.readInset?.()??8)*(L.lock?1:L.protect)),c=Math.cos(g.angle),s=Math.sin(g.angle),vx=x-g.x,vy=y-g.y,qx=c*vx+s*vy,qy=-s*vx+c*vy;if(g.round)return Math.hypot(qx/(g.hx+edge),qy/(g.hy+edge))<=1;const r=g.corner,dx=Math.max(0,Math.abs(qx)-g.hx+r),dy=Math.max(0,Math.abs(qy)-g.hy+r);return Math.hypot(dx,dy)<=r+edge}
  function pullFrom(L,h,x,y,pid){
    if(!compatible(L,h))return false;
    const p=edgePoint(h,x,y);L.homeId=idOf(h);L.edge=p.edge;L.u=along(h,p);L.attached=true;L.docked=true;
    const d=dockPoint(h,L.U,L.edge,L.u,L.baseR);L.x=d.x;L.y=d.y;L.vx=L.vy=0;grab(L,x,y,pid);return true;
  }

  let state=null,el=null,started=false,last=0,homeNow=null,visible=false,cursor={active:false,x:0,y:0},pores=[];
  const offers=new Map();
  /* A site lends identity-bound targets; Display never learns what they mean. spec.kind 'field' gives rect(),
   * 'body' gives point() (+ optional r). A missing projection cannot acquire a new lock;
   * a contacted offer retains its identity until withdraw(), including across same-frame renewal. */
  function offer(id,spec){
    if(typeof id!=='string'||!id)throw new TypeError('lock target id required');
    if(!spec||(spec.kind==='field'?typeof spec.rect!=='function':spec.kind==='body'?typeof spec.point!=='function':true))throw new TypeError('lock target '+id+' needs kind field+rect() or body+point()');
    offers.set(id,spec);return id;
  }
  function withdraw(id){return offers.delete(id)}
  function resolveTargets(lockedId=state?.lock?.id){
    const out=[];
    for(const [id,spec] of offers){
      const before=out.length;
      try{
        if(spec.kind==='field'){const r=spec.rect();if(r&&Number.isFinite(r.left)&&Number.isFinite(r.top)&&Number.isFinite(r.width)&&Number.isFinite(r.height)&&r.width>0&&r.height>0)out.push({id,kind:'field',cx:r.left+r.width/2,cy:r.top+r.height/2,hx:r.width/2,hy:r.height/2,r:spec.r})}
        else{const p=spec.point();if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)){
          const t={id,kind:'body',cx:p.x,cy:p.y,hx:Number.isFinite(p.r)?p.r:24};
          /* Readable extent is lent only by the contacted body. It is never a
           * second hit area, a site-selected mode, or work for every candidate. */
          if(id===lockedId&&typeof spec.frame==='function'){try{const r=spec.frame();if(r&&Number.isFinite(r.left)&&Number.isFinite(r.top)&&Number.isFinite(r.width)&&Number.isFinite(r.height)&&r.width>0&&r.height>0)t.frame={cx:r.left+r.width/2,cy:r.top+r.height/2,hx:r.width/2,hy:r.height/2,r:r.r}}catch(_){/* retain the valid ordinary body if its finer extent is unavailable */}}
          out.push(t);
        }}
      }catch(_){/* geometry unavailable; the owner still controls lifetime */}
      if(id===lockedId&&out.length===before)out.push({id,kind:spec.kind,pending:true});
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
    el.setAttribute('aria-pressed',String(state.held));
    const de=root.document?.documentElement;if(de){if(state.lock){de.dataset.displayLensLock=state.lock.kind;de.dataset.displayLensTarget=state.lock.id}else{delete de.dataset.displayLensLock;delete de.dataset.displayLensTarget}}}}
  function endPointer(e){
    if(!state?.held||state.pid!==e.pointerId)return;
    release(state,e.pointerId);cursor.active=false;
    if(e.type==='pointerup'){const t=candidateAt(state,resolveTargets());if(t)lockTo(state,t)}
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
      if(off){pending=null;release(state,state.pid);unlock(state);cursor.active=false}else step(state,hs,dt,{w:root.innerWidth,h:root.innerHeight},cursor,target,!!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
      homeNow=state.attached?hs.find(h=>h.id===state.homeId&&compatible(state,h))||null:null;visible=!off;
      if(el){const g=geometry(state,hs);el.style.display=visible?'block':'none';
        el.style.left=(state.x-g.hx)+'px';el.style.top=(state.y-g.hy)+'px';el.style.width=(g.hx*2)+'px';el.style.height=(g.hy*2)+'px';el.style.borderRadius=g.round?'50%':g.corner+'px';
        el.style.transform='rotate('+g.angle+'rad)';
        paintPhase();el.dataset.layer=state.layer}
    }updatePores(hs);root.requestAnimationFrame(loop);
  }
  function snapshot(){return state&&visible?{lens:geometry(state,homeNow),home:homeNow}:null}
  function departFrom(origin,duration=380){
    if(!state||!visible||state.held||state.lock?.kind!=='body')return false;
    pending=null;cursor.active=false;depart(state,origin,{w:root.innerWidth,h:root.innerHeight},duration/1000);paintPhase();return true;
  }
  function start(){
    if(started||typeof document!=='object')return;started=true;
    el=document.createElement('div');el.id='display-lens';el.setAttribute('aria-label','Glass drop');el.setAttribute('role','button');el.tabIndex=0;
    el.setAttribute('aria-description','Enter or Space to take or release; arrow keys to pull while held; Escape to let go. Pointer: press and pull to take; a plain click passes through.');
    el.style.cssText='position:fixed;z-index:39;display:none;touch-action:none;background:transparent;pointer-events:none;border-radius:50%';
    document.body.append(el);
    root.addEventListener('pointerdown',onDown,{capture:true});
    root.addEventListener('pointermove',onMove,{capture:true,passive:true});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(type,onUp,{capture:true});
    root.addEventListener('blur',()=>{pending=null;cursor.active=false;if(state){release(state,state.pid);paintPhase()}});
    el.addEventListener('blur',()=>{if(state?.pid==='keyboard'){release(state,'keyboard');paintPhase()}});
    el.addEventListener('keydown',e=>{
      if(!state||!visible||e.altKey||e.ctrlKey||e.metaKey)return;
      if(e.repeat&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();return}
      const a={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[e.key];
      if(e.key==='Enter'||e.key===' '){
        if(!state.held){pending=null;cursor.active=false;grab(state,state.x,state.y,'keyboard')}
        else if(state.pid==='keyboard'){release(state,'keyboard');const t=candidateAt(state,resolveTargets());if(t)lockTo(state,t)}
        else return;
      }else if(e.key==='Escape'&&state.pid==='keyboard')release(state,'keyboard');
      else if(a&&state.pid==='keyboard')move(state,state.px+a[0],state.py+a[1],'keyboard');else return;
      e.preventDefault();e.stopPropagation();paintPhase();
    });
    root.requestAnimationFrame(loop);
  }
  return Object.freeze({K,create,step,geometry,grab,move,release,contains,snapshot,start,scaleOf,dockPoint,edgePoint,compatible,pullFrom,candidateAt,lockTo,unlock,depart,departFrom,offer,withdraw,resolveTargets});
});
