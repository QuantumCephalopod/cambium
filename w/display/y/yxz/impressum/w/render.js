(() => {
'use strict';
const id='organism:impressum';
const surface=globalThis.SSSOrthogonalText.create();
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
(function exposeLegalLink(){
  let nav=document.getElementById('legal-links');
  if(!nav){nav=document.createElement('nav');nav.id='legal-links';nav.setAttribute('aria-label','Legal');document.body.append(nav)}
  if(!document.getElementById('legal-link-impressum')){
    const a=document.createElement('a');a.id='legal-link-impressum';nav.append(a);
  }
  function localise(){const de=globalThis.SSSWorldView?.language==='de',a=document.getElementById('legal-link-impressum');a.href=de?'/impressum/':'/impressum/en/';a.textContent=de?'Impressum':'Legal notice';a.hreflang=de?'de':'en'}
  localise();addEventListener('sss:language',localise);
})();
const shader=Object.freeze({
  id:'shader:organism:impressum',
  view:Object.freeze({rest:Object.freeze([1,0,0,0]),projection:'orthographic'}),
  afterDraw:surface.draw,
  focus:surface.focus,
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
const fieldProjection=projection=>Object.freeze({
  root:Object.freeze({noun:'Impressum',...projection.title,children:Object.freeze({})}),
  points:Object.freeze([])
});
function tr(v,lang){return v&&typeof v==='object'?(v[lang]||v.de||v.en||''):(v||'')}
function render({host,content,projection,language='de',ui=null}={}){
  if(!host||!content||!projection?.operator)return false;
  host.hidden=false;
  content.className='interlocutor-content impressum-content';
  content.replaceChildren();
  const article=document.createElement('article');article.lang=language;
  const h=document.createElement('h1'); h.textContent=tr(projection.title,language)||'Impressum';
  const mail=document.createElement('a'); mail.href='mailto:'+projection.contact.email; mail.textContent=language==='de'?'E-Mail':'Email';mail.setAttribute('aria-label',projection.contact.email);
  const notice=document.createElement('a');notice.href=language==='de'?'/impressum/':'/impressum/en/';notice.textContent=language==='de'?'Vollständiges Impressum':'Full legal notice';
  article.append(h,mail,notice);
  surface.mount({url:notice.href,language,controls:article});
  content.append(article);if(ui)ui.bind(article,'article');
  return true;
}
function unmount({host,content}={}){surface.unmount();if(host)host.hidden=true;if(content)content.replaceChildren()}
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection}));
})();
