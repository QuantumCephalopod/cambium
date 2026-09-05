/* URL state identifies the place; an independent camera changes how we see it.
 * Pointer capture belongs to the stable host, not to a replaced SVG child.
 */
(function(root){
 'use strict';
 const N=root.CambiumNavigation,V=root.CambiumView,$=id=>document.getElementById(id);
 const data=JSON.parse($('cambium-data').textContent);
 let state=N.resolve('site','',data.index),renderCount=0,gesture=null,suppressClickUntil=0,frame=0;
 function update(initial=false){
  try{
   const route=N.parse(location.hash);if(route.anchor)return;
   const next=N.resolve(route.mode,route.path,data.index);
   V.render(next,data);state=next;renderCount++;
   if(!initial){(document.querySelector('.active-trail a[aria-current="page"]')||$('page-title')).focus({preventScroll:true});
    $('announcer').textContent=N.namePath(state.path,data.index)+(state.aliases.length>1?'. two approaches meet here.':'.');}
  }catch(e){V.error(e.message);}
 }
 window.addEventListener('hashchange',()=>update());
 document.addEventListener('click',e=>{
  const a=e.target.closest('a[data-path]');
  if(a&&a.hash===location.hash&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){e.preventDefault();$('announcer').textContent='you are already here.';}
 });
 function hint(e){const t=e.target.closest('[data-hint]');if(t){$('navigation-hint').textContent=t.dataset.hint;V.highlight(t.dataset.locus);}}
 document.addEventListener('pointerover',hint);document.addEventListener('focusin',hint);
 function unhighlight(e){if(e.target.closest('[data-hint]'))V.highlight(null);}
 document.addEventListener('pointerout',unhighlight);document.addEventListener('focusout',unhighlight);
 const host=$('geometry');
 function ballAt(e){const r=host.getBoundingClientRect(),radius=Math.min(r.width,r.height)*.43;return V.ball((e.clientX-r.left-r.width/2)/radius,(r.top+r.height/2-e.clientY)/radius);}
 host.addEventListener('pointerdown',e=>{
  if(e.button!==0||!e.isPrimary)return;
  suppressClickUntil=0;gesture={id:e.pointerId,x:e.clientX,y:e.clientY,start:ballAt(e),pose:V.getPose(),dragged:false,latest:null};
 });
 host.addEventListener('pointermove',e=>{
  if(!gesture||e.pointerId!==gesture.id)return;
  if(!gesture.dragged){
   if(Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<5)return;
   gesture.dragged=true;host.setPointerCapture(e.pointerId);host.classList.add('is-dragging');host.focus({preventScroll:true});V.highlight(null);
  }
  e.preventDefault();gesture.latest=ballAt(e);
  if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(gesture?.latest)V.orbit(gesture.start,gesture.latest,gesture.pose);});
 });
 function finish(e){
  if(!gesture||e.pointerId!==gesture.id)return;
  if(frame){cancelAnimationFrame(frame);frame=0;}
  if(gesture.dragged){if(gesture.latest)V.orbit(gesture.start,gesture.latest,gesture.pose);suppressClickUntil=performance.now()+400;}
  const id=gesture.id;gesture=null;host.classList.remove('is-dragging');if(host.hasPointerCapture(id))host.releasePointerCapture(id);
 }
 host.addEventListener('pointerup',finish);host.addEventListener('pointercancel',finish);
 host.addEventListener('lostpointercapture',()=>{gesture=null;host.classList.remove('is-dragging');});
 host.addEventListener('click',e=>{if(e.detail>0&&performance.now()<suppressClickUntil){e.preventDefault();e.stopPropagation();}},true);
 host.addEventListener('keydown',e=>{
  const angles={ArrowLeft:[[0,1,0],-.15],ArrowRight:[[0,1,0],.15],ArrowUp:[[1,0,0],-.15],ArrowDown:[[1,0,0],.15],q:[[0,0,1],-.15],e:[[0,0,1],.15]};
  if(e.altKey||e.ctrlKey||e.metaKey)return;
  if(angles[e.key]){e.preventDefault();V.rotate(...angles[e.key]);}
  else if(e.key==='Home'){e.preventDefault();V.reset();}
 });
 $('reset-view').addEventListener('click',()=>{V.reset();$('announcer').textContent='view reset. your place is unchanged.';});
 window.addEventListener('resize',()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;V.repaint();});});
 root.Cambium=Object.freeze({getState:()=>({mode:'site',path:state.path,locus:state.locus,aliases:[...state.aliases]}),getRenderCount:()=>renderCount,getView:()=>V.getPose()});
 update(true);document.documentElement.classList.add('enhanced');
})(globalThis);
