(() => {
'use strict';
const id='organism:impressum';
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
(function exposeLegalLink(){
  let nav=document.getElementById('legal-links');
  if(!nav){nav=document.createElement('nav');nav.id='legal-links';nav.setAttribute('aria-label','Legal');document.body.append(nav)}
  if(!document.getElementById('legal-link-impressum')){
    const a=document.createElement('a');a.id='legal-link-impressum';a.href='/impressum/';a.textContent='Impressum';nav.append(a);
  }
})();
const shader=Object.freeze({
  id:'shader:organism:impressum',
  clear:[0.012,0.016,0.014,1],
  fallbackAlpha:.12,
  state:Object.freeze({blend:true,depthTest:true,depthWrite:false}),
  fragment:`#version 300 es
precision highp float;
in vec3 vN; in vec3 vW; in float vRegion;
uniform float uFocus; uniform vec3 uPalette[4];
out vec4 outColor;
void main(){
  vec3 n=normalize(vN);
  float edge=pow(1.-abs(n.z),1.5);
  int ri=int(clamp(floor(vRegion+.5),0.,3.));
  vec3 c=mix(vec3(.02,.025,.022),uPalette[ri],.22+.16*edge);
  float a=(uFocus<-.5||abs(vRegion-uFocus)<.2)?.20:.09;
  outColor=vec4(c,a+.08*edge);
}`
});
const fieldProjection=()=>Object.freeze({
  root:Object.freeze({noun:'Impressum',de:'Impressum',en:'Imprint',children:Object.freeze({})}),
  points:Object.freeze([])
});
let last=null;
function tr(v,lang){return v&&typeof v==='object'?(v[lang]||v.de||v.en||''):(v||'')}
function render({host,content,projection,language='de'}={}){
  if(!host||!content||!projection?.operator)return false;
  last={host,content,projection,language};
  host.hidden=false;
  content.className='interlocutor-content impressum-content';
  content.replaceChildren();
  const article=document.createElement('article');
  const kicker=document.createElement('p'); kicker.className='impressum-kicker'; kicker.textContent='organism:impressum';
  const h=document.createElement('h1'); h.textContent=tr(projection.title,language)||'Impressum';
  const name=document.createElement('p'); name.className='impressum-operator'; name.textContent=projection.operator.name;
  const address=document.createElement('address'); address.textContent=(projection.operator.address||[]).join('\n');
  const mail=document.createElement('a'); mail.href='mailto:'+projection.contact.email; mail.textContent=projection.contact.email;
  const gate=document.createElement('p'); gate.className='impressum-gate';
  gate.textContent=projection.contact.status==='live'?'':(language==='de'?'Kontakt-Route wird vor Veröffentlichung gewitnessed.':'Contact route is witnessed before publication.');
  article.append(kicker,h,name,address,mail,gate);
  content.append(article);
  return true;
}
function unmount({host,content}={}){if(host)host.hidden=true;if(content)content.replaceChildren();last=null}
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection}));
})();