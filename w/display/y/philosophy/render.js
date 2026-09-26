(() => {
'use strict';
const id='organism:philosophy';
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
const W=globalThis.SSSWorldView||null,Fields=globalThis.SSSInterlocutorFields||null;
const shader=Object.freeze({
  id:'shader:organism:philosophy',
  clear:[0.006,0.009,0.014,1],
  fallbackAlpha:.16,
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
function render({host,content,projection,path='',language='en'}={}){
  if(!host||!content||!projection?.root)return false;
  const node=path?nodeAt(projection.root,path):projection.root;
  host.hidden=false;content.className='interlocutor-content philosophy-content';content.replaceChildren();
  const copy=document.createElement('section');copy.className=path?'':'root';
  if(path)copy.innerHTML=`<div class="kicker">philosophy · inspect ${path}</div><h1>${node?.[language]||node?.noun||path}</h1><p>${node?.one?.[language]||''}</p>`;
  else copy.innerHTML=`<div class="kicker">organism:philosophy · global address witness</div><h1>Form · Continuity · Care · Inquiry</h1><p>${language==='de'?'Die Flächen fokussieren rekursive Adresszellen. Echte globale Site-Holons erscheinen an ihren tree-derived Adressen; ihre Marker wechseln direkt den Encounter.':'Faces focus recursive address cells. Actual global site-holons appear at their tree-derived addresses; their markers switch encounters directly.'}</p>`;
  content.append(copy);renderMarkers(host);return true;
}
function unmount({host,content}={}){if(markerLayer)markerLayer.hidden=true;if(host)host.hidden=true;if(content)content.replaceChildren()}
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection:projection=>projection}));
})();