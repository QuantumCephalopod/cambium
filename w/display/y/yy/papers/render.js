(() => {
'use strict';

const id='organism:papers';
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
const GENES=['w','x','z','y'];
const DNA={w:'CREATE',x:'COPY',z:'CONTROL',y:'CULTIVATE'};

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
modules.set(id,Object.freeze({id,render,unmount,fieldProjection}));
})();
