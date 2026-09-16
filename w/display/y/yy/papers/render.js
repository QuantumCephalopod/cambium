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

function el(tag,cls,text){
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(text!==undefined)n.textContent=text;
  return n;
}
function rankOf(value){
  const m=String(value||'').match(/^(\d+)H\./);
  return m?`${m[1]}H`:'S';
}
function countAt(projection,gene,kind){
  const rows=projection?.[kind]?.[gene];
  return Array.isArray(rows)?rows.length:0;
}
function timestamp(value){
  return String(value||'').replace('T',' ').replace(/\.\d{3}Z$/,'Z');
}
function metric(label,value,detail){
  const n=el('div','papers-metric');
  n.append(el('span','papers-metric-value',String(value)),el('span','papers-metric-label',label));
  if(detail)n.append(el('span','papers-metric-detail',detail));
  return n;
}
function specimen(item,kind){
  const row=el('li',`papers-specimen papers-specimen-${kind}`);
  const code=el('span','papers-specimen-id',item.id);
  if(kind==='holon')code.dataset.rank=rankOf(item.id);
  row.append(code,el('span','papers-specimen-title',item.title));
  return row;
}
function layerBlock(label,items,kind){
  const block=el('div',`papers-layer papers-layer-${kind}`);
  const head=el('div','papers-layer-head');
  head.append(el('span','papers-layer-name',label),el('span','papers-layer-count',String(items.length).padStart(2,'0')));
  const list=el('ul','papers-specimens');
  for(const item of items)list.append(specimen(item,kind));
  if(!items.length)list.append(el('li','papers-empty','—'));
  block.append(head,list);
  return block;
}
function constitution(projection){
  const c=projection.constitution||{};
  const wrap=el('section','papers-constitution');
  const top=el('div','papers-constitution-top');
  top.append(el('span','papers-section-kicker','constitution'),el('strong','papers-metabolism',c['1T']||'Metabolism'));
  wrap.append(top);

  const vertices=el('div','papers-vertices');
  for(const g of GENES){
    const v=el('div','papers-vertex');
    v.dataset.gene=g;
    v.append(el('span','papers-vertex-gene',g),el('span','papers-vertex-name',c['4V']?.[g]||projection.phenotype?.[g]||g));
    vertices.append(v);
  }
  wrap.append(vertices);

  const relations=el('div','papers-relations');
  const edges=el('div','papers-relation-line');
  edges.append(el('span','papers-relation-rank','6E'));
  for(const [key,name] of Object.entries(c['6E']||{}))edges.append(el('span','papers-relation',`${key} ${name}`));
  const faces=el('div','papers-relation-line');
  faces.append(el('span','papers-relation-rank','4F'));
  for(const [key,name] of Object.entries(c['4F']||{}))faces.append(el('span','papers-relation',`${key} ${name}`));
  relations.append(edges,faces);wrap.append(relations);
  return wrap;
}
function controls(root){
  const nav=el('div','papers-layer-controls');
  nav.setAttribute('aria-label','Papers feed layer');
  const options=[['all','BODY'],['sources','SOURCES'],['holons','HOLONS']];
  for(const [value,label] of options){
    const b=el('button','papers-layer-button',label);
    b.type='button';b.dataset.layer=value;b.setAttribute('aria-pressed',value==='all'?'true':'false');
    b.addEventListener('click',()=>{
      root.dataset.layer=value;
      for(const peer of nav.querySelectorAll('button'))peer.setAttribute('aria-pressed',String(peer===b));
    });
    nav.append(b);
  }
  return nav;
}
function locus(projection,gene,path){
  const sources=Array.isArray(projection.groups?.[gene])?projection.groups[gene]:[];
  const holons=Array.isArray(projection.holons?.[gene])?projection.holons[gene]:[];
  const section=el('section','papers-locus');
  section.dataset.gene=gene;
  section.classList.toggle('is-view',path===gene);
  const head=el('div','papers-locus-head');
  const identity=el('div','papers-locus-identity');
  identity.append(el('span','papers-locus-gene',gene),el('h2','papers-locus-name',projection.phenotype?.[gene]||gene),el('span','papers-locus-dna',DNA[gene]));
  const counts=el('div','papers-locus-counts');
  counts.append(el('span','',`${sources.length} S`),el('span','',`${holons.length} H`));
  head.append(identity,counts);
  const layers=el('div','papers-locus-layers');
  layers.append(layerBlock('source boundary',sources,'source'),layerBlock('holon lineage',holons,'holon'));
  section.append(head,layers);
  return section;
}

function fieldProjection(d){
  const children={};
  for(const g of GENES){
    const sources=countAt(d,g,'groups'),holons=countAt(d,g,'holons'),noun=d?.phenotype?.[g]||g;
    children[g]={
      noun,de:noun,en:noun,gene:DNA[g],
      one:{de:`${sources} Quellenkörper · ${holons} Holons.`,en:`${sources} source bodies · ${holons} holons.`},
      children:{}
    };
  }
  return {source:{organism:'papers',home:d?.event_id||'papers'},root:{noun:'Papers',children},occupancy:{w:[],x:[],z:[],y:[]}};
}

function render({host,content,projection,path=''}={}){
  if(!host||!content||!projection?.groups||!projection?.phenotype)return false;
  content.className='interlocutor-content papers-content';content.replaceChildren();

  const root=el('article','papers-feed');root.dataset.layer='all';
  const mast=el('div','papers-mast');
  const identity=el('div','papers-title-block');
  identity.append(el('div','papers-kicker','organism:papers · _feed'),el('h1','papers-title','Papers'),el('p','papers-subtitle','frozen boundary observation of a living research metabolism'));
  const pulse=el('div','papers-pulse');
  pulse.append(el('span','papers-pulse-dot'),el('span','papers-pulse-state',projection.snapshot?.pulse_state||projection.refresh||'observed'));
  mast.append(identity,pulse);root.append(mast);

  const population=projection.population||{};
  const metrics=el('section','papers-population');
  metrics.append(
    metric('FIELD SOURCES',population.registry_sources??'—','registry population'),
    metric('BOUNDARY',population.boundary_sources??'—','resolved source bodies'),
    metric('HOLONS',population.holons??'—','recursive organisms'),
    metric('WOUNDED',population.wounded_sources??'—','paused sources')
  );
  root.append(metrics);

  const temporal=el('section','papers-temporal');
  const pulseTime=el('div','papers-time');pulseTime.append(el('span','papers-time-label','PULSE HOME'),el('span','papers-time-value',timestamp(projection.snapshot?.pulse_home_at_utc)));
  const observeTime=el('div','papers-time');observeTime.append(el('span','papers-time-label','BODY OBSERVED'),el('span','papers-time-value',timestamp(projection.observed_at_utc)));
  const uplink=el('div','papers-time papers-uplink');uplink.append(el('span','papers-time-label','UPLINK'),el('span','papers-time-value',projection.snapshot?.uplink||'—'));
  temporal.append(pulseTime,observeTime,uplink);root.append(temporal);

  root.append(constitution(projection));

  const rankStrip=el('section','papers-ranks');
  rankStrip.append(el('span','papers-section-kicker','holon ranks'));
  for(const rank of ['1H','2H','3H','4H','5H'])rankStrip.append(metric(rank,projection.population?.ranks?.[rank]??0));
  root.append(rankStrip);

  const bodyHead=el('div','papers-body-head');
  const bodyTitle=el('div');bodyTitle.append(el('span','papers-section-kicker','outer body'),el('strong','papers-body-title','realized feed tissue'));
  bodyHead.append(bodyTitle,controls(root));root.append(bodyHead);

  const loci=el('div','papers-loci');
  for(const gene of GENES)loci.append(locus(projection,gene,path));
  root.append(loci);

  const foot=el('footer','papers-feed-foot');
  foot.append(el('span','',projection.snapshot?.mode||'FROZEN FEED OBSERVATION'),el('span','',projection.boundary||''));
  root.append(foot);

  content.append(root);host.hidden=false;return true;
}
function unmount({host,content}={}){if(host)host.hidden=true;if(content)content.replaceChildren()}
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection}));
})();
