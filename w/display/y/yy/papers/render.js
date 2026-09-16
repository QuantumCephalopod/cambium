(() => {
'use strict';

const id='organism:papers';
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
const GENES=['w','x','z','y'];
const DNA={w:'CREATE',x:'COPY',z:'CONTROL',y:'CULTIVATE'};

const shader=Object.freeze({
  id:'shader:organism:papers',
  clear:[0.004,0.007,0.009,1],
  fallbackAlpha:.11,
  state:Object.freeze({blend:false,depthTest:true,depthWrite:true}),
  decorate({element}){
    if(element.querySelector('.papers-optics'))return;
    const optics=document.createElement('div');optics.className='papers-optics';optics.setAttribute('aria-hidden','true');
    Object.assign(optics.style,{position:'absolute',inset:'0',zIndex:'1',overflow:'hidden',pointerEvents:'none'});
    const pane=(edge)=>{
      const n=document.createElement('i');n.className='papers-defocus papers-defocus-'+edge;
      Object.assign(n.style,{position:'absolute',left:'-8%',width:'116%',height:'48%',display:'block',background:'rgba(5,7,10,.025)',backdropFilter:'blur(7px) saturate(.86)',webkitBackdropFilter:'blur(7px) saturate(.86)',transform:'rotate(-2.2deg) scale(1.04)',transformOrigin:'50% 50%'});
      if(edge==='top'){n.style.top='-15%';n.style.maskImage='linear-gradient(to bottom,#000 0%,#000 32%,transparent 100%)';n.style.webkitMaskImage=n.style.maskImage}
      else{n.style.bottom='-15%';n.style.maskImage='linear-gradient(to top,#000 0%,#000 32%,transparent 100%)';n.style.webkitMaskImage=n.style.maskImage}
      return n;
    };
    optics.append(pane('top'),pane('bottom'));
    const labels=element.querySelector('.interlocutor-field-labels');element.insertBefore(optics,labels||null);
  },
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
float hash21(vec2 p){p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+19.19);return fract((p.x+p.y)*p.x);}
void main(){
  vec3 n=normalize(vN);
  vec3 eye=normalize(vec3(0.,0.,3.15)-vW);
  float fres=pow(1.-abs(dot(n,eye)),2.0);
  int ri=int(clamp(floor(vRegion+.5),0.,3.));
  vec3 c=uPalette[ri];
  vec2 uv=gl_FragCoord.xy/max(uResolution,vec2(1.));
  float focal=.53+(uv.x-.5)*.10;
  float distanceFromPlane=abs(uv.y-focal);
  float sharp=1.-smoothstep(.075,.31,distanceFromPlane);
  float selected=(uFocus<-.5||abs(vRegion-uFocus)<.2)?1.:.18;
  float structural=.5+.5*sin((vW.x*1.5+vW.y*2.1-vW.z*.7)*36.+vRegion*1.8);
  float micro=.5+.5*sin((vW.x-vW.z)*118.-uTime*.035);
  float grain=(hash21(gl_FragCoord.xy+floor(uTime*4.))-.5)*(.006+.012*sharp);
  vec3 base=mix(vec3(.004,.008,.010),c*.20,.17+.29*fres+.05*structural);
  base+=c*(.035*fres+.022*structural*micro*sharp)*selected;
  float luma=dot(base,vec3(.2126,.7152,.0722));
  base=mix(vec3(luma)*vec3(.86,.94,.96),base,.68+.32*sharp);
  base=mix(base,vec3(.008,.013,.015),(.12*(1.-sharp)));
  base+=grain;
  outColor=vec4(pow(max(base,0.),vec3(.93)),1.);
}`
});

let selectedId='';
let renderContext=null;

function el(tag,cls,text){
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(text!==undefined)n.textContent=text;
  return n;
}
function locusName(projection,gene){return projection?.phenotype?.[gene]||gene}
function rankOf(value){const m=String(value||'').match(/^(\d+)H\./);return m?`${m[1]}H`:'S'}
function identityFor(projection,pointId){
  for(const g of GENES){for(const item of projection?.groups?.[g]||[])if(item.id===pointId)return {id:item.id,title:item.title,locus:g,rank:'S',kind:'source'};for(const item of projection?.holons?.[g]||[])if(item.id===pointId)return {id:item.id,title:item.title,locus:g,rank:rankOf(item.id),kind:'holon'}}
  return null;
}
function externalLabel(url,index){
  try{
    const u=new URL(url),host=u.hostname.replace(/^www\./,'');
    if(host==='doi.org')return 'DOI · published work';
    if(host==='arxiv.org')return 'arXiv · source';
    if(host==='github.com')return 'GitHub · upstream';
    if(host.includes('w3.org'))return 'W3C · canonical source';
    return `${host} · original source`;
  }catch(_){return `original source ${index+1}`}
}
function detailFor(projection,pointId){
  const base=identityFor(projection,pointId);if(!base)return null;
  if(base.kind==='source'){
    const meta=projection?.source_meta?.[pointId];
    if(Array.isArray(meta)){
      const urls=Array.isArray(meta[2])?meta[2]:[];
      return {...base,credit:meta[0]||'',metabolism:meta[1]||'tetrahedralized · 4V / 6E / 4F / 1T',externals:urls.map((url,i)=>({url,label:externalLabel(url,i)}))};
    }
    const credit=projection?.authors?.[pointId]||'';
    const url=projection?.external?.[pointId]||'';
    return {...base,credit,metabolism:'tetrahedralized · 4V / 6E / 4F / 1T',externals:url?[{url,label:externalLabel(url,0)}]:[]};
  }
  const meta=projection?.holon_meta?.[pointId];
  if(Array.isArray(meta))return {...base,parents:meta[0]||[],metabolism:meta[1]||'recursive holon · 4V / 6E / 4F / 1T',feeling_signature:meta[2]||'',bound:meta[3]||''};
  return {...base,parents:projection?.parents?.[pointId]||[],metabolism:'recursive holon · 4V / 6E / 4F / 1T'};
}

function allPoints(projection){
  const points=[];
  for(const g of GENES){
    for(const s of projection?.groups?.[g]||[])points.push(Object.freeze({id:s.id,gene:g,kind:'source',label:s.title,meta:`source · ${locusName(projection,g)}`}));
    for(const h of projection?.holons?.[g]||[])points.push(Object.freeze({id:h.id,gene:g,kind:'holon',label:h.title,meta:`${rankOf(h.id)} holon · ${locusName(projection,g)}`}));
  }
  return points;
}
function countAt(projection,gene,kind){const rows=projection?.[kind]?.[gene];return Array.isArray(rows)?rows.length:0}
function fieldProjection(d){
  const children={};
  for(const g of GENES){
    const sources=countAt(d,g,'groups'),holons=countAt(d,g,'holons'),noun=d?.phenotype?.[g]||g;
    children[g]={noun,de:noun,en:noun,gene:DNA[g],one:{de:`${sources} Quellen · ${holons} Holons.`,en:`${sources} sources · ${holons} holons.`},children:{}};
  }
  return {source:{organism:'papers',home:d?.event_id||'papers'},root:{noun:'Papers',children},occupancy:{w:[],x:[],z:[],y:[]},points:allPoints(d)};
}
function sectionLabel(text){return el('div','papers-detail-kicker',text)}
function row(label,value){
  if(value===undefined||value===null||value==='')return null;
  const n=el('div','papers-detail-row');n.append(el('span','papers-detail-label',label),el('span','papers-detail-value',String(value)));return n;
}
function safeBound(value){const s=String(value||'').trim();return s&&/[.!?…]$/.test(s)?s:''}
function selectPoint(pointId){
  const field=globalThis.SSSInterlocutorFields?.get(id);
  if(field&&typeof field.selectPoint==='function')field.selectPoint(pointId,true);
}
function externalLink(item){
  const a=el('a','papers-external-link');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';
  a.append(el('span','papers-external-label',item.label||'original source'),el('span','papers-external-arrow','↗'));
  return a;
}
function sourceDetail(projection,d){
  const panel=el('article','papers-detail papers-detail-source');panel.dataset.organismId=d.id;
  const head=el('div','papers-detail-head');
  const identity=el('div','papers-detail-identity');identity.append(el('span','papers-detail-code',d.id),el('span','papers-detail-locus',`${d.locus} · ${locusName(projection,d.locus)}`));
  const close=el('button','papers-detail-close','×');close.type='button';close.setAttribute('aria-label','Close source');close.addEventListener('click',()=>selectPoint(''));
  head.append(identity,close);panel.append(head,el('h1','papers-detail-title',d.title));

  const original=el('section','papers-detail-section papers-original');original.append(sectionLabel('ORIGINAL WORK'));
  original.append(el('div','papers-source-credit',d.credit||'source credit unresolved'));
  if(d.type)original.append(el('p','papers-source-type',d.type));
  const links=el('div','papers-external-links');for(const item of d.externals||[])links.append(externalLink(item));
  if(links.childElementCount)original.append(links);panel.append(original);

  const metabolism=el('section','papers-detail-section papers-metabolism');metabolism.append(sectionLabel('PAPERS METABOLISM'));
  const receipt=row('closure',d.metabolism);if(receipt)metabolism.append(receipt);
  if(d.quickscope)metabolism.append(el('p','papers-metabolic-copy',d.quickscope));
  if(d.boundary){metabolism.append(sectionLabel('EPISTEMIC BOUNDARY'),el('p','papers-boundary-copy',d.boundary))}
  panel.append(metabolism);return panel;
}
function parentButton(parentId,projection){
  const d=detailFor(projection,parentId),b=el('button','papers-parent');b.type='button';b.dataset.parentId=parentId;
  b.append(el('span','papers-parent-id',parentId),el('span','papers-parent-title',d?.title||parentId));
  b.addEventListener('click',()=>selectPoint(parentId));return b;
}
function holonDetail(projection,d){
  const panel=el('article','papers-detail papers-detail-holon');panel.dataset.organismId=d.id;
  const head=el('div','papers-detail-head');
  const identity=el('div','papers-detail-identity');identity.append(el('span','papers-detail-code',d.id),el('span','papers-detail-locus',`${d.rank||rankOf(d.id)} · ${d.locus} · ${locusName(projection,d.locus)}`));
  const close=el('button','papers-detail-close','×');close.type='button';close.setAttribute('aria-label','Close holon');close.addEventListener('click',()=>selectPoint(''));
  head.append(identity,close);panel.append(head,el('h1','papers-detail-title',d.title),el('div','papers-derived','DERIVED INSIDE PAPERS'));

  const metabolism=el('section','papers-detail-section papers-metabolism');metabolism.append(sectionLabel('PAPERS METABOLISM'));
  const receipt=row('closure',d.metabolism);if(receipt)metabolism.append(receipt);
  const feeling=row('feeling',d.feeling_signature);if(feeling)metabolism.append(feeling);
  const bound=safeBound(d.bound);if(bound)metabolism.append(el('p','papers-metabolic-copy',bound));
  panel.append(metabolism);

  const lineage=el('section','papers-detail-section papers-lineage');lineage.append(sectionLabel('FOUR PARENTS'));
  const parents=el('div','papers-parents');for(const parent of d.parents||[])parents.append(parentButton(parent,projection));lineage.append(parents);panel.append(lineage);
  return panel;
}
function detailPanel(projection){
  if(!selectedId)return null;
  const d=detailFor(projection,selectedId);if(!d)return null;
  return selectedId.startsWith('S.')?sourceDetail(projection,d):holonDetail(projection,d);
}
function hud(projection){
  const p=projection.population||{},n=el('div','papers-hud');
  const line=el('div','papers-hud-line');line.append(el('strong','papers-hud-title','Papers'),el('span','papers-hud-stat',`${p.registry_sources??0} sources · ${p.holons??0} holons`));
  const legend=el('div','papers-legend');
  const source=el('span','papers-legend-item');source.append(el('i','papers-legend-dot'),document.createTextNode(' source'));
  const holon=el('span','papers-legend-item');holon.append(el('i','papers-legend-diamond'),document.createTextNode(' holon'));
  legend.append(source,holon,el('span','papers-hud-help','hover · click to open'));
  n.append(line,legend);return n;
}
function paintSelection(){
  if(!renderContext)return;
  const {content,projection}=renderContext;
  const old=content.querySelector('.papers-detail');if(old)old.remove();
  const panel=detailPanel(projection);if(panel)content.append(panel);
}
function activateFieldPoint({point}={}){
  selectedId=point?.id||'';
  paintSelection();
}
function render({host,content,projection}={}){
  if(!host||!content||!projection?.groups||!projection?.phenotype)return false;
  host.hidden=false;content.className='interlocutor-content papers-content';content.replaceChildren();
  renderContext={host,content,projection};
  content.append(hud(projection));paintSelection();return true;
}
function unmount({host,content}={}){renderContext=null;if(host)host.hidden=true;if(content)content.replaceChildren()}
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection,activateFieldPoint}));
})();
