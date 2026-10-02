(() => {
'use strict';
const id='organism:datenschutz';
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
const shader=Object.freeze({
  id:'shader:organism:datenschutz',
  clear:[0.009,0.013,0.018,1],
  fallbackAlpha:.12,
  state:Object.freeze({blend:true,depthTest:true,depthWrite:false}),
  fragment:`#version 300 es
precision highp float;
in vec3 vN; in vec3 vW; in float vRegion;
uniform float uFocus; uniform vec3 uPalette[4];
out vec4 outColor;
void main(){
  vec3 n=normalize(vN);
  float rim=pow(1.-abs(n.z),1.8);
  int ri=int(clamp(floor(vRegion+.5),0.,3.));
  vec3 c=mix(vec3(.01,.016,.024),uPalette[ri],.18+.17*rim);
  float a=(uFocus<-.5||abs(vRegion-uFocus)<.2)?.19:.08;
  outColor=vec4(c,a+.09*rim);
}`
});
const fieldProjection=()=>Object.freeze({
  root:Object.freeze({noun:'Datenschutz',de:'Datenschutz',en:'Privacy',children:Object.freeze({})}),
  points:Object.freeze([])
});
function render({host,content,projection,language='de'}={}){
  if(!host||!content||!projection?.controller)return false;
  host.hidden=false; content.className='interlocutor-content datenschutz-content'; content.replaceChildren();
  const article=document.createElement('article');
  const kicker=document.createElement('p'); kicker.className='datenschutz-kicker'; kicker.textContent='organism:datenschutz';
  const h=document.createElement('h1'); h.textContent=language==='de'?'Datenschutz':'Privacy';
  const p=document.createElement('p');
  p.textContent=language==='de'
    ?'Die öffentliche Datenschutzerklärung wird erst nach gewitnessed Kontakt-Route und finaler Quellprüfung freigegeben.'
    :'The public privacy notice is released only after the contact route and final source review are witnessed.';
  const mail=document.createElement('a'); mail.href='mailto:'+projection.contact.email; mail.textContent=projection.contact.email;
  article.append(kicker,h,p,mail); content.append(article); return true;
}
function unmount({host,content}={}){if(host)host.hidden=true;if(content)content.replaceChildren()}
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection}));
})();