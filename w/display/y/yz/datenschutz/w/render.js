(() => {
'use strict';
const id='organism:datenschutz';
const surface=globalThis.SSSOrthogonalText.create();
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
(function exposeLegalLink(){
  let nav=document.getElementById('legal-links');
  if(!nav){nav=document.createElement('nav');nav.id='legal-links';nav.setAttribute('aria-label','Legal');document.body.append(nav)}
  if(!document.getElementById('legal-link-privacy')){
    const a=document.createElement('a');a.id='legal-link-privacy';nav.append(a);
  }
  function localise(){const de=globalThis.SSSWorldView?.language==='de',a=document.getElementById('legal-link-privacy');a.href=de?'/privacy/':'/privacy/en/';a.textContent=de?'Datenschutz':'Privacy policy';a.hreflang=de?'de':'en'}
  localise();addEventListener('sss:language',localise);
})();
const shader=Object.freeze({
  id:'shader:organism:datenschutz',
  view:Object.freeze({rest:Object.freeze([1,0,0,0]),projection:'orthographic'}),
  afterDraw:surface.draw,
  focus:surface.focus,
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
const fieldProjection=projection=>Object.freeze({
  root:Object.freeze({noun:'Datenschutz',...projection.title,children:Object.freeze({})}),
  points:Object.freeze([])
});
function render({host,content,projection,language='de',ui=null}={}){
  if(!host||!content||!projection?.controller)return false;
  host.hidden=false; content.className='interlocutor-content datenschutz-content'; content.replaceChildren();
  const article=document.createElement('article');article.lang=language;
  const h=document.createElement('h1'); h.textContent=projection.title?.[language]||projection.title?.en||'Privacy policy';
  const mail=document.createElement('a'); mail.href='mailto:'+projection.contact.email; mail.textContent=language==='de'?'E-Mail':'Email';mail.setAttribute('aria-label',projection.contact.email);
  const notice=document.createElement('a'); notice.href=language==='de'?'/privacy/':'/privacy/en/'; notice.textContent=language==='de'?'Datenschutzerklärung':'Full privacy policy';
  article.append(h,mail,notice);surface.mount({url:notice.href,language,controls:article}); content.append(article); if(ui)ui.bind(article,'article'); return true;
}
function unmount({host,content}={}){surface.unmount();if(host)host.hidden=true;if(content)content.replaceChildren()}
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection}));
})();
