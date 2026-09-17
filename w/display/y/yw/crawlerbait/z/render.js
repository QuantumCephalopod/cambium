(() => {
'use strict';
const id='organism:crawlerbait';
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
const FIELD_ROOT=Object.freeze({
  noun:'Crawlerbait',
  children:Object.freeze({
    w:Object.freeze({noun:'Baits',de:'Köder',en:'Baits',gene:'CREATE',children:Object.freeze({})}),
    x:Object.freeze({noun:'Traces',de:'Spuren',en:'Traces',gene:'COPY',children:Object.freeze({})}),
    z:Object.freeze({noun:'Membrane',de:'Membran',en:'Membrane',gene:'CONTROL',children:Object.freeze({})}),
    y:Object.freeze({noun:'Tide',de:'Tide',en:'Tide',gene:'CULTIVATE',children:Object.freeze({})})
  })
});
const shader=Object.freeze({
  id:'shader:organism:crawlerbait',
  clear:[0.004,0.012,0.018,1],
  fallbackAlpha:.2,
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
void main(){
  vec3 n=normalize(vN);
  vec3 eye=normalize(vec3(0.,0.,3.15)-vW);
  float fres=pow(1.-abs(dot(n,eye)),1.55);
  float a=sin((gl_FragCoord.x+gl_FragCoord.y*.57735)*.19+uTime*.035);
  float b=sin((gl_FragCoord.x-gl_FragCoord.y*.57735)*.19-uTime*.027);
  float c=sin(gl_FragCoord.y*.219+uTime*.018);
  float moire=pow(abs(a*b*c),1.7);
  float grain=hash21(gl_FragCoord.xy+floor(uTime*5.)*vec2(3.7,7.1))-.5;
  int ri=int(clamp(floor(vRegion+.5),0.,3.));
  vec3 coral=mix(vec3(.38,.09,.035),uPalette[ri],.42);
  vec3 deep=vec3(.004,.016,.023);
  float selected=(uFocus<-.5||abs(vRegion-uFocus)<.2)?1.:.48;
  vec3 ink=mix(deep,coral,.10+.28*moire+.18*fres);
  ink+=grain*.022;
  float alpha=(.085+.13*moire+.12*fres)*mix(.68,1.,selected);
  outColor=vec4(max(ink,0.),clamp(alpha,.065,.31));
}`
});
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function render({host,content,projection}={}){
  if(!host||!content||!projection?.summary)return false;
  host.hidden=false;
  content.className='interlocutor-content crawlerbait-content';
  content.replaceChildren();
  const panel=el('section','crawlerbait-panel');
  panel.append(el('h1','', 'Crawlerbait'));
  panel.append(el('p','', 'passive 404 field · periodic tide · static bait-space'));
  const stats=el('div','crawlerbait-stats');
  stats.append(el('span','',`${projection.summary.baits ?? projection.routes?.length ?? 0} baits`));
  stats.append(el('span','',`${projection.summary.observed_signatures ?? 0} claimed identities`));
  stats.append(el('span','',`${projection.summary.observed_404 ?? 0} observations`));
  stats.append(el('span','',projection.updated_at?`tide ${projection.updated_at}`:'tide not armed yet'));
  panel.append(stats);
  const reef=el('div','crawlerbait-routes');
  for(const route of projection.routes||[]){
    const a=el('a','crawlerbait-route');a.href=route.href;
    a.append(el('code','',`${route.address ?? '?'} · ${route.path}`));
    a.append(el('small','',`${route.observed_404} observations · ${route.signatures?.length||0} claimed identities`));
    reef.append(a);
  }
  if(!projection.routes?.length)reef.append(el('div','crawlerbait-empty','no observed baits'));
  panel.append(reef);
  const machine=el('a','crawlerbait-machine','machine-readable reef →');machine.href='/crawlerbait/';
  panel.append(machine);
  content.append(panel);
  return true;
}
function unmount({host,content}={}){if(host)host.hidden=true;if(content)content.replaceChildren()}
function fieldProjection(){return Object.freeze({root:FIELD_ROOT})}
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection}));
})();
