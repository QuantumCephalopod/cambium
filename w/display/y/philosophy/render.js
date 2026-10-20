(() => {
'use strict';
const id='organism:philosophy';
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
const W=globalThis.SSSWorldView||null,Fields=globalThis.SSSInterlocutorFields||null;
const shader=Object.freeze({
  id:'shader:organism:philosophy',
  clear:[0.006,0.009,0.014,1],
  fallbackAlpha:.16,
  /* The overview keeps a quiet coarse body until liquid reveals its owner's
   * admitted representation. Display owns the mask, Philosophy this material. */
  bodyPlaceholder:Object.freeze({state:Object.freeze({blend:false,depthTest:true,depthWrite:true}),fragment:`#version 300 es
precision highp float;
in vec3 vN;in float vRegion;uniform vec3 uPalette[4];out vec4 outColor;
void main(){float light=.5+.5*dot(normalize(vN),normalize(vec3(-.35,.6,.72)));
  vec3 c=uPalette[int(clamp(floor(vRegion+.5),0.,3.))];
  outColor=vec4(mix(vec3(.045,.055,.065),c*.42,.25+.55*light),1.);}`}),
  state:Object.freeze({blend:true,depthTest:true,depthWrite:false}),
  fragment:`#version 300 es
precision highp float;
in vec3 vN;
in vec3 vW;
in float vRegion;
uniform float uTime;
uniform float uFocus;
uniform vec2 uResolution;
uniform vec3 uPalette[4];
out vec4 outColor;
float hash21(vec2 p){p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
float dotScreen(vec2 p,float radius){vec2 q=fract(p/6.0)-.5;float d=length(q);return 1.-smoothstep(radius,radius+.09,d);}
void main(){
  vec3 n=normalize(vN);
  vec3 eye=normalize(vec3(0.,0.,3.15)-vW);
  float facing=.5+.5*dot(n,normalize(vec3(.28,.52,.81)));
  float fres=pow(1.-abs(dot(n,eye)),1.65);
  int ri=int(clamp(floor(vRegion+.5),0.,3.));
  vec3 c=uPalette[ri];
  float selected=(uFocus<-.5||abs(vRegion-uFocus)<.2)?1.:.42;
  float drift=.5+.5*sin((vW.x*1.9-vW.y*2.7+vW.z*1.15)*24.+uTime*.08+vRegion*2.3);
  float tone=clamp(.22+.52*facing+.18*fres+.08*drift,0.,1.);
  float dots=dotScreen(gl_FragCoord.xy+vec2(vRegion*2.4,uTime*.18),mix(.11,.34,1.-tone));
  float grain=hash21(gl_FragCoord.xy+floor(uTime*8.)*vec2(7.1,3.7))-.5;
  float crosshatch=.5+.5*sin(gl_FragCoord.x*.31+gl_FragCoord.y*.17+vRegion*1.7);
  vec3 ink=mix(vec3(.008,.011,.017),c*.63,.24+.40*fres+.12*facing);
  ink*=.72+.22*tone;
  ink+=c*(.035*dots+.025*crosshatch*fres);
  ink+=grain*.032;
  float alpha=(.10+.15*fres+.055*dots+.045*drift)*mix(.68,1.,selected);
  outColor=vec4(pow(max(ink,0.),vec3(.94)),clamp(alpha,.075,.34));
}`
});
let markerLayer=null,markerHost=null;
function nodeAt(root,path){let n=root;for(const g of path){n=n?.children?.[g];if(!n)return null}return n}
function titleMap(){
  const el=document.getElementById('site-registry');if(!el)return new Map();
  try{const r=JSON.parse(el.textContent);return new Map((r.interlocutors||[]).map(s=>[s.id,s.title||s.id.replace(/^organism:/,'')]))}catch(_){return new Map()}
}
function targets(){
  if(!W)return [];
  const titles=titleMap();
  return W.globalTargets.filter(t=>t.path).map(t=>({target:t,address:t.path||'ε',label:(t.interlocutorIds||[]).map(x=>titles.get(x)||x.replace(/^organism:/,'')).join(' + ')}));
}
function ensureMarkers(host){
  if(markerLayer&&markerHost===host)return markerLayer;
  markerLayer?.remove();markerHost=host;markerLayer=document.createElement('div');
  markerLayer.className='philosophy-global-sites';markerLayer.setAttribute('aria-label','Mounted global site addresses');host.append(markerLayer);return markerLayer;
}
function positionMarkers(){
  if(!markerLayer||!markerHost||markerHost.hidden||!Fields)return;
  const field=Fields.get(id);if(!field?.projectAddressCenter)return;
  for(const b of markerLayer.querySelectorAll('.philosophy-global-site')){
    const p=field.projectAddressCenter(b.dataset.address||'');
    b.style.left=p.x+'px';b.style.top=p.y+'px';b.style.opacity=String(p.z<-.18?.42:.96);
    b.dataset.active=String((b.dataset.address||'')===(W?.activeGlobalAddress||''));
  }
}
function renderMarkers(host){
  const layer=ensureMarkers(host);layer.hidden=false;layer.replaceChildren();
  for(const row of targets()){
    const b=document.createElement('button');b.type='button';b.className='philosophy-global-site';b.dataset.address=row.target.path||'';
    const a=document.createElement('small');a.textContent=row.address;
    const label=document.createElement('span');label.textContent='['+row.label.toLowerCase()+']';
    b.append(a,label);
    b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();W?.requestGlobalTarget(row.target,'philosophy-mounted-site',{x:e.clientX,y:e.clientY})});
    layer.append(b);
  }
  requestAnimationFrame(positionMarkers);
}
addEventListener('sss:orientation',positionMarkers);addEventListener('resize',positionMarkers);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
let describe=null;const lockIds=new Set();
/* Philosophy lends the shared droplette its lockable tissue: the Description field and the mounted
 * site-holon bodies in its field. Display owns the lock; Philosophy only says what is present. */
function offerLocks(host){
  const Lens=globalThis.SSSDisplayLens;if(!Lens?.offer)return;
  for(const x of lockIds)Lens.withdraw(x);lockIds.clear();
  const live=()=>host&&!host.hidden&&host.isConnected!==false;
  lockIds.add(Lens.offer(id+'|Description',{kind:'field',r:14,rect:()=>live()&&describe?.el?.isConnected?describe.el.getBoundingClientRect():null}));
  for(const row of targets())for(const site of row.target.interlocutorIds||[]){
    if(site===id)continue;
    lockIds.add(Lens.offer(id+'|'+site,{kind:'body',point:()=>{if(!live())return null;const f=Fields?.get(id),b=f?.projectBody?.(site);if(!b||!f.canvas)return null;const r=f.canvas.getBoundingClientRect();return {x:r.left+b.x,y:r.top+b.y,r:b.r}}}));
  }
}
function withdrawLocks(){const Lens=globalThis.SSSDisplayLens;for(const x of lockIds)Lens?.withdraw(x);lockIds.clear()}
function fitDescription(){if(!describe?.el?.isConnected)return;const c=describe.ui.carrier,b=describe.ui.field('Description').bounds;describe.el.style.inlineSize=b.w*c.w+'px';describe.el.style.blockSize=b.h*c.h+'px';describe.ui.refresh()}
addEventListener('resize',fitDescription);
function render({host,content,projection,path='',language='en',ui=null}={}){
  if(!host||!content||!projection?.root)return false;
  const node=path?nodeAt(projection.root,path):projection.root,said=projection.expression?.[path]?.[language]||{};
  host.hidden=false;content.className='interlocutor-content philosophy-content';content.replaceChildren();
  const copy=el('section',path?'locus':'root');copy.lang=language;
  if(path){
    copy.append(el('div','kicker','philosophy · '+path),el('h1',null,node?.[language]||node?.noun||path),el('p','question',node?.one?.[language]||''));
    for(const para of said.body||[])copy.append(el('p',null,para));
    for(const encounter of said.encounters||[]){
      const available=W?.globalTargets?.some(t=>(t.interlocutorIds||[]).includes(encounter.interlocutor));
      if(!available||!encounter.label)continue;
      const button=el('button','philosophy-project',encounter.label);button.type='button';
      button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();dispatchEvent(new CustomEvent('sss:enter-body',{detail:{from:id,id:encounter.interlocutor,origin:{x:e.clientX,y:e.clientY}}}))});copy.append(button);
    }
  }else{
    copy.append(el('div','kicker','organism:philosophy'),el('h1',null,['w','x','z','y'].map(g=>projection.root.children?.[g]?.[language]||projection.root.children?.[g]?.noun||g).join(' · ')));
    if(said.mission)copy.append(el('p','mission',said.mission));
    if(said.position)copy.append(el('p',null,said.position));
    copy.append(el('p','hint',language==='de'?'Die Flächen fokussieren rekursive Adresszellen. Echte globale Site-Holons erscheinen an ihren tree-derived Adressen; ihre Marker wechseln direkt den Encounter.':'Faces focus recursive address cells. Actual global site-holons appear at their tree-derived addresses; their markers switch encounters directly.'));
  }
  content.append(copy);
  if(ui){describe={el:copy,ui};fitDescription();ui.bind(copy,'Description')}
  offerLocks(host);markerLayer?.remove();markerLayer=null;return true; /* site labels are now Display body labels */
}
function unmount({host,content}={}){withdrawLocks();if(markerLayer)markerLayer.hidden=true;if(host)host.hidden=true;if(content)content.replaceChildren()}
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection:projection=>projection}));
})();
