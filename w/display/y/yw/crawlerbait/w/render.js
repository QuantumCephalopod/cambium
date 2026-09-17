(() => {
'use strict';
const id='organism:crawlerbait';
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
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
  panel.append(el('p','', 'The web touches us and we grow. Cloudflare listens at the membrane; a bounded tide later turns recurring 404 pressure into static bait. Nothing executes merely because a crawler reads it.'));
  const stats=el('div','crawlerbait-stats');
  stats.append(el('span','',`${projection.summary.grown_routes} grown routes`));
  stats.append(el('span','',`${projection.summary.unresolved_candidates} unresolved candidates`));
  stats.append(el('span','',`${projection.summary.observed_404} sedimented 404 observations`));
  stats.append(el('span','',projection.updated_at?`tide ${projection.updated_at}`:'tide not armed yet'));
  panel.append(stats);
  const reef=el('div','crawlerbait-routes');
  if(!projection.routes?.length){
    reef.append(el('div','crawlerbait-empty','The pots are empty. Good. Put them in the ocean.'));
  }else{
    for(const route of projection.routes){
      const a=el('a','crawlerbait-route');a.href=route.href;
      a.append(el('code','',route.path));
      a.append(el('small','',`${route.observed_404} prior 404 observations · ${route.signatures?.length||0} retained signatures`));
      reef.append(a);
    }
  }
  panel.append(reef);
  const machine=el('a','crawlerbait-machine','machine-readable static reef →');machine.href='/crawlerbait/';
  panel.append(machine);
  content.append(panel);
  return true;
}
function unmount({host,content}={}){if(host)host.hidden=true;if(content)content.replaceChildren()}
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection:projection=>projection}));
})();
