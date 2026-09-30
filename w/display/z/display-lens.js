/* Display-owned goo lens.
 * A lens is a piece of glass pulled off the global compass: half as wide and as tall as the compass, joined to it by a
 * thinning neck of goo. Pulled past the tear distance it lets go and stays wherever it was released; brought back inside
 * the magnet's reach it is pulled home and docks. Held, it turns round; moving fast, it stretches along its motion; it
 * shivers when it stops. This module owns the physics (pure, testable) and the pointer surface; the drawing is the
 * glass pass in w/locus-shader.js, which reads snapshot().
 */
(function(root,factory){
  'use strict';
  const api=factory(root);
  if(typeof module==='object'&&module.exports) module.exports=api;
  else{root.SSSDisplayLens=api;if(typeof document==='object')api.start()}
})(typeof globalThis==='object'?globalThis:this,function(root){
  'use strict';
  /* first drafts in CSS px at a compass 240 px tall (U = 1); every distance scales with the compass */
  const K=Object.freeze({stiff:130,damp:15,magnet:170,breakAt:230,neck:34,wobble:1,round:.78,mk:260,gap:8});
  const REF_H=120; // half-height of the reference compass
  const n=v=>Number.isFinite(+v)?+v:0;

  function scaleOf(home){return home?Math.max(.4,Math.min(1.6,n(home.hy)/REF_H)):1}
  function dockPoint(home,U){return {x:home.cx-home.hx-home.hx/2-K.gap*U,y:home.cy}}
  function create(home){
    const U=scaleOf(home),d=home?dockPoint(home,U):{x:0,y:0};
    return {x:d.x,y:d.y,vx:0,vy:0,held:false,pid:null,gx:0,gy:0,px:d.x,py:d.y,round:0,roundV:0,stretch:0,stretchV:0,ang:0,wob:0,wph:0,docked:true,hx:home?home.hx/2:60,hy:home?home.hy:120,U};
  }
  /* one step of the physics; home = {cx,cy,hx,hy} of the compass in CSS px, or null when there is none to dock to */
  function step(L,home,dt,view){
    dt=Math.min(Math.max(n(dt),0),.033);if(!dt)return L;
    const U=home?scaleOf(home):L.U;L.U=U;
    if(home){L.hx=home.hx/2;L.hy=home.hy}
    let ax=0,ay=0;
    const dock=home?dockPoint(home,U):null,dist=dock?Math.hypot(dock.x-L.x,dock.y-L.y)||1e-3:Infinity,mag=K.magnet*U;
    if(L.held){ax=K.stiff*(L.px-L.gx-L.x)-K.damp*L.vx;ay=K.stiff*(L.py-L.gy-L.y)-K.damp*L.vy}
    else if(dock&&dist<mag){const f=1-dist/mag,ks=K.stiff*.9*(K.mk/260)*f;ax=ks*(dock.x-L.x)-K.damp*.75*L.vx;ay=ks*(dock.y-L.y)-K.damp*.75*L.vy}
    else{ax=-K.damp*1.4*L.vx;ay=-K.damp*1.4*L.vy}
    L.vx+=ax*dt;L.vy+=ay*dt;L.x+=L.vx*dt;L.y+=L.vy*dt;
    /* the lens never leaves the screen: it stops against the border */
    if(view&&view.w>0&&view.h>0){
      const mx=Math.min(L.hx,view.w/2),my=Math.min(L.hy,view.h/2);
      if(L.x<mx){L.x=mx;if(L.vx<0)L.vx=0}else if(L.x>view.w-mx){L.x=view.w-mx;if(L.vx>0)L.vx=0}
      if(L.y<my){L.y=my;if(L.vy<0)L.vy=0}else if(L.y>view.h-my){L.y=view.h-my;if(L.vy>0)L.vy=0}
    }
    const d2=dock?Math.hypot(dock.x-L.x,dock.y-L.y):Infinity,sp=Math.hypot(L.vx,L.vy);
    if(dock&&!L.held&&d2<4*U&&sp<30*U){L.x=dock.x;L.y=dock.y;L.vx=L.vy=0;L.docked=true}
    else if(!dock||d2>6*U)L.docked=false;
    if(sp>40*U){const ta=Math.atan2(-L.vy,L.vx),da=Math.atan2(Math.sin(ta-L.ang),Math.cos(ta-L.ang));L.ang+=da*Math.min(1,dt*12)}
    const st=Math.min(.55,sp/(1100*U));L.stretchV+=(260*(st-L.stretch)-9*L.stretchV)*dt;L.stretch+=L.stretchV*dt;
    L.roundV+=(200*((L.held?1:0)-L.round)-16*L.roundV)*dt;L.round+=L.roundV*dt;
    const acc=Math.hypot(ax,ay);
    L.wob=Math.max(L.wob*Math.exp(-dt*4),Math.min(7*U,acc*.0024*U+Math.abs(L.roundV)*2.2*U)*K.wobble);L.wph+=dt*14;
    return L;
  }
  /* what the glass pass needs: the lens body, and the neck that joins it to the compass while they are near */
  function geometry(L,home){
    const U=L.U,r=Math.max(0,Math.min(1,L.round)),rr=K.round*.7*L.hy,hx=L.hx*(1-r)+rr*r,hy=L.hy*(1-r)+rr*r;
    let neck=0,smooth=Math.max(6*U,K.neck*U*.4),thin=1;
    if(home){
      const dock=dockPoint(home,U),gap=Math.hypot(dock.x-L.x,dock.y-L.y);
      thin=Math.max(0,1-gap/(K.breakAt*U));
      neck=thin>.02?K.neck*U*1.3*Math.pow(thin,1.5):0;
      smooth=Math.max(6*U,K.neck*U*(.4+.6*thin));
    }
    return {x:L.x,y:L.y,hx,hy,round:r,angle:L.ang,wobble:L.wob,phase:L.wph,stretch:Math.max(0,L.stretch),neck,smooth,thin,docked:L.docked,held:L.held};
  }
  function grab(L,x,y,pid){L.held=true;L.pid=pid;L.gx=x-L.x;L.gy=y-L.y;L.px=x;L.py=y;return L}
  function move(L,x,y,pid){if(L.held&&L.pid===pid){L.px=x;L.py=y}return L}
  function release(L,pid){if(L.held&&L.pid===pid){L.held=false;L.pid=null}return L}
  function contains(L,x,y){const g=geometry(L,null),s=Math.max(g.round,0);return Math.abs(x-L.x)<=g.hx+6&&Math.abs(y-L.y)<=g.hy+6&&s>=0}

  /* ---- the page: one state, one pointer surface, one loop ---- */
  let state=null,el=null,started=false,last=0,homeNow=null,visible=false,reduced=false;
  function compass(){
    const doc=root.document;if(!doc)return null;
    const mini=doc.getElementById('mini'),pocket=doc.getElementById('mini-pocket');
    if(!mini||!pocket)return null;
    const comp=doc.documentElement.dataset.composition||'single';
    if(comp==='split'||comp==='grid')return {off:true};
    if(mini.dataset.aperture!=='open')return {closed:true};
    const r=pocket.getBoundingClientRect();
    return r.width<8||r.height<8?{closed:true}:{cx:r.left+r.width/2,cy:r.top+r.height/2,hx:r.width/2,hy:r.height/2};
  }
  function loop(ms){
    const dt=last?(ms-last)/1000:0;last=ms;
    const c=compass(),G=root.SSSDisplayGlass;
    reduced=!(G&&G.enabled());
    const off=!c||c.off||reduced;
    homeNow=c&&c.cx!==undefined?c:null;
    if(!state&&homeNow)state=create(homeNow);
    if(state){
      if(off){state.held=false}
      else step(state,homeNow,dt,{w:root.innerWidth,h:root.innerHeight});
      /* closed compass with a docked lens: nothing to show; a free lens stays where it was put */
      visible=!off&&!(c&&c.closed&&state.docked);
      if(el){
        const g=geometry(state,homeNow);
        el.style.display=visible?'block':'none';
        el.style.left=(state.x-g.hx-6)+'px';el.style.top=(state.y-g.hy-6)+'px';el.style.width=(g.hx*2+12)+'px';el.style.height=(g.hy*2+12)+'px';
        el.style.borderRadius=(g.round>.5?'50%':'22px');
      }
    }
    root.requestAnimationFrame(loop);
  }
  function snapshot(){
    if(!state||!visible)return null;
    return {lens:geometry(state,homeNow),home:homeNow};
  }
  function start(){
    if(started||typeof document!=='object')return;started=true;
    state=null;
    el=document.createElement('div');el.id='display-lens';el.setAttribute('aria-hidden','true');
    el.style.cssText='position:fixed;z-index:39;display:none;touch-action:none;cursor:grab;background:transparent;pointer-events:auto';
    document.body.appendChild(el);
    el.addEventListener('pointerdown',e=>{if(e.button!==0||!state)return;grab(state,e.clientX,e.clientY,e.pointerId);el.style.cursor='grabbing';try{el.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
    el.addEventListener('pointermove',e=>{if(state)move(state,e.clientX,e.clientY,e.pointerId)});
    const up=e=>{if(state)release(state,e.pointerId);el.style.cursor='grab'};
    el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
    root.requestAnimationFrame(loop);
  }
  return Object.freeze({K,create,step,geometry,grab,move,release,contains,snapshot,start,scaleOf,dockPoint});
});
