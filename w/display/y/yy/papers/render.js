(() => {
'use strict';

const id='organism:papers';
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
const GENES=['w','x','z','y'];
const DNA={w:'CREATE',x:'COPY',z:'CONTROL',y:'CULTIVATE'};
const geneIndex={w:0,x:1,z:2,y:3};
const N=globalThis.SSSDisplayNavigation||null;
const W=globalThis.SSSWorldView||null;
const SCRIPT_BASE=(()=>{try{return new URL('.',document.currentScript?.src||location.href)}catch(_){return null}})();

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
let selectedField=null;
let selectionToken=0;
let focusMembers=null;
const inquiryCache=new Map();
const overlay={field:null,svg:null,structure:null,worldById:null,edges:[],lineEls:[],nodeEls:[],raf:0};

function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function locusName(projection,gene){return projection?.phenotype?.[gene]||gene}
function rankOf(value){const m=String(value||'').match(/^(\d+)H\./);return m?`${m[1]}H`:'S'}
function identityFor(projection,pointId){
  for(const g of GENES){
    for(const item of projection?.groups?.[g]||[])if(item.id===pointId)return {id:item.id,title:item.title,locus:g,rank:'S',kind:'source'};
    for(const item of projection?.holons?.[g]||[])if(item.id===pointId)return {id:item.id,title:item.title,locus:g,rank:rankOf(item.id),kind:'holon'};
  }
  return null;
}
function parentsOf(projection,pointId){const meta=projection?.holon_meta?.[pointId];return Array.isArray(meta)&&Array.isArray(meta[0])?meta[0]:(projection?.parents?.[pointId]||[])}
function childrenIndex(projection){
  const out=new Map();
  for(const [child,meta] of Object.entries(projection?.holon_meta||{})){
    const parents=Array.isArray(meta)&&Array.isArray(meta[0])?meta[0]:[];
    for(const parent of parents){if(!out.has(parent))out.set(parent,[]);out.get(parent).push(child)}
  }
  return out;
}
function lineageTrace(projection,pointId){
  const edges=[],nodes=new Map();
  if(!pointId)return {mode:'none',edges,nodes};
  const source=pointId.startsWith('S.');
  if(source){
    const children=childrenIndex(projection),seen=new Set();nodes.set(pointId,0);
    const walk=(parent,depth)=>{for(const child of children.get(parent)||[]){const key=child+'←'+parent;if(seen.has(key))continue;seen.add(key);edges.push({child,parent,depth});if(!nodes.has(child)||nodes.get(child)>depth+1)nodes.set(child,depth+1);walk(child,depth+1)}};
    walk(pointId,0);return {mode:'descendants',edges,nodes};
  }
  const seen=new Set();nodes.set(pointId,0);
  const walk=(child,depth,stack)=>{
    if(stack.has(child))return;
    const nextStack=new Set(stack);nextStack.add(child);
    for(const parent of parentsOf(projection,child)){
      const key=child+'→'+parent;if(!seen.has(key)){seen.add(key);edges.push({child,parent,depth})}
      if(!nodes.has(parent)||nodes.get(parent)>depth+1)nodes.set(parent,depth+1);
      if(!parent.startsWith('S.'))walk(parent,depth+1,nextStack);
    }
  };
  walk(pointId,0,new Set());return {mode:'ancestry',edges,nodes};
}
function lineageStats(projection,pointId){
  const trace=lineageTrace(projection,pointId),ids=[...trace.nodes.keys()].filter(x=>x!==pointId);
  let sources=0,holons=0,depth=0;for(const x of ids){if(x.startsWith('S.'))sources++;else holons++;depth=Math.max(depth,trace.nodes.get(x)||0)}
  return {mode:trace.mode,sources,holons,depth,total:ids.length};
}
function externalLabel(url,index){try{const u=new URL(url),host=u.hostname.replace(/^www\./,'');if(host==='doi.org')return 'DOI · published work';if(host==='arxiv.org')return 'arXiv · source';if(host==='github.com')return 'GitHub · upstream';if(host.includes('w3.org'))return 'W3C · canonical source';return `${host} · original source`}catch(_){return `original source ${index+1}`}}
function detailFor(projection,pointId){
  const base=identityFor(projection,pointId);if(!base)return null;
  if(base.kind==='source'){
    const meta=projection?.source_meta?.[pointId];
    if(Array.isArray(meta)){const urls=Array.isArray(meta[2])?meta[2]:[];return {...base,credit:meta[0]||'',metabolism:meta[1]||'tetrahedralized · 4V / 6E / 4F / 1T',externals:urls.map((url,i)=>({url,label:externalLabel(url,i)}))}}
    const credit=projection?.authors?.[pointId]||'',url=projection?.external?.[pointId]||'';return {...base,credit,metabolism:'tetrahedralized · 4V / 6E / 4F / 1T',externals:url?[{url,label:externalLabel(url,0)}]:[]};
  }
  const meta=projection?.holon_meta?.[pointId];
  if(Array.isArray(meta))return {...base,parents:meta[0]||[],metabolism:meta[1]||'recursive holon · 4V / 6E / 4F / 1T',feeling_signature:meta[2]||'',bound:meta[3]||''};
  return {...base,parents:projection?.parents?.[pointId]||[],metabolism:'recursive holon · 4V / 6E / 4F / 1T'};
}
function allPoints(projection){const points=[];for(const g of GENES){for(const s of projection?.groups?.[g]||[])points.push(Object.freeze({id:s.id,gene:g,kind:'source',label:s.title,meta:`source · ${locusName(projection,g)}`}));for(const h of projection?.holons?.[g]||[])points.push(Object.freeze({id:h.id,gene:g,kind:'holon',label:h.title,meta:`${rankOf(h.id)} holon · ${locusName(projection,g)}`}))}return points}
function countAt(projection,gene,kind){const rows=projection?.[kind]?.[gene];return Array.isArray(rows)?rows.length:0}
function fieldProjection(d){const children={};for(const g of GENES){const sources=countAt(d,g,'groups'),holons=countAt(d,g,'holons'),noun=d?.phenotype?.[g]||g;children[g]={noun,de:noun,en:noun,gene:DNA[g],one:{de:`${sources} Quellen · ${holons} Holons.`,en:`${sources} sources · ${holons} holons.`},children:{}}}return {source:{organism:'papers',home:d?.event_id||'papers'},root:{noun:'Papers',children},occupancy:{w:[],x:[],z:[],y:[]},points:allPoints(d)}}

function hash32(text){let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0}h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;h=Math.imul(h,0x846ca68b)>>>0;h^=h>>>16;return h>>>0}
function random01(text,salt){return (hash32(text+'·'+salt)+1)/4294967297}
function pointInTet(tet,spec){let weights=[0,1,2,3].map(i=>-Math.log(Math.max(1e-7,random01(spec.id,i))));const s=weights.reduce((a,b)=>a+b,0);weights=weights.map(v=>v/s);const inset=spec.kind==='holon'?.40:.22;weights=weights.map(v=>(1-inset)*v+inset*.25);return [0,1,2].map(k=>weights.reduce((sum,w,i)=>sum+w*tet[i][k],0))}
function sub(a,b){return a.map((x,i)=>x-b[i])}
function qMul(a,b){const[w,x,y,z]=a,[v,i,j,k]=b;return [w*v-x*i-y*j-z*k,w*i+x*v+y*k-z*j,w*j-x*k+y*v+z*i,w*k+x*j-y*i+z*v]}
function qRot(q,p){const r=qMul(qMul(q,[0,...p]),[q[0],-q[1],-q[2],-q[3]]);return r.slice(1)}
function buildWorldMap(field){
  if(!N||!field?.projection?.root)return null;const structure=N.collectStructure(field.projection.root),byGene=new Map(),map=new Map();
  for(const g of Object.keys(geneIndex)){const exact=structure.leaves.find(c=>c.path===g),first=structure.leaves.find(c=>c.path?.startsWith(g));if(exact||first)byGene.set(g,exact||first)}
  for(const spec of field.projection.points||[]){const cell=byGene.get(spec.gene);if(cell)map.set(spec.id,pointInTet(cell.tet,spec))}return {structure,map};
}
function projectWorld(field,structure,point,rect){if(!N||!W)return null;const path=W.scopeId===field.localScope?W.view:'',t=N.focusTarget(structure,path),q=qRot(W.orientation,sub(point,t.center)),scale=(rect.width<560?1.42:1.75)*t.scale,camZ=3.2,z=camZ-q[2]*scale,f=(rect.height/2)/Math.tan(Math.PI/6.6);return {x:rect.width/2+q[0]*scale*f/z,y:rect.height/2-q[1]*scale*f/z,z:q[2]}}
function ensureOverlay(field){
  if(!field?.element||!field?.canvas||!N||!W)return;
  if(overlay.field!==field){overlay.svg?.remove();overlay.field=field;overlay.svg=null;overlay.structure=null;overlay.worldById=null;overlay.edges=[];overlay.lineEls=[];overlay.nodeEls=[]}
  if(!overlay.svg){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('papers-lineage-overlay');svg.setAttribute('aria-hidden','true');field.element.append(svg);overlay.svg=svg;const built=buildWorldMap(field);overlay.structure=built?.structure||null;overlay.worldById=built?.map||null;if(!overlay.raf)overlay.raf=requestAnimationFrame(drawOverlay)}
}
function traceFocused(edge){if(!focusMembers||!focusMembers.size)return false;return focusMembers.has(edge.child)||focusMembers.has(edge.parent)}
function rebuildOverlay(projection){
  if(!selectedField)return;ensureOverlay(selectedField);if(!overlay.svg)return;overlay.svg.replaceChildren();overlay.edges=lineageTrace(projection,selectedId).edges;overlay.lineEls=[];overlay.nodeEls=[];
  for(const edge of overlay.edges){const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.classList.add('papers-lineage-edge');line.dataset.depth=String(edge.depth);if(edge.depth===0)line.classList.add('papers-lineage-edge-immediate');if(edge.parent.startsWith('S.'))line.classList.add('papers-lineage-edge-source');if(traceFocused(edge))line.classList.add('papers-lineage-edge-focus');overlay.svg.append(line);overlay.lineEls.push({edge,line})}
  const nodes=new Map();for(const e of overlay.edges){nodes.set(e.parent,e.depth+1);if(e.depth>0)nodes.set(e.child,e.depth)}
  for(const [nodeId,depth] of nodes){const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.classList.add('papers-lineage-node');if(nodeId.startsWith('S.'))c.classList.add('papers-lineage-node-source');if(focusMembers?.has(nodeId))c.classList.add('papers-lineage-node-focus');c.setAttribute('r',nodeId.startsWith('S.')?'2.1':depth<=1?'3.1':'2.5');overlay.svg.append(c);overlay.nodeEls.push({nodeId,c})}overlay.svg.hidden=!selectedId||!overlay.edges.length;
}
function drawOverlay(){
  overlay.raf=requestAnimationFrame(drawOverlay);const field=overlay.field,svg=overlay.svg;if(!field||!svg||svg.hidden||!overlay.structure||!overlay.worldById||!W)return;
  const cr=field.canvas.getBoundingClientRect(),er=field.element.getBoundingClientRect();if(!cr.width||!cr.height||!er.width||!er.height)return;svg.setAttribute('viewBox',`0 0 ${er.width} ${er.height}`);const ox=cr.left-er.left,oy=cr.top-er.top;
  const pos=(nodeId)=>{const w=overlay.worldById.get(nodeId);if(!w)return null;const p=projectWorld(field,overlay.structure,w,cr);return p?{x:p.x+ox,y:p.y+oy,z:p.z}:null};
  for(const {edge,line} of overlay.lineEls){const a=pos(edge.child),b=pos(edge.parent);if(!a||!b){line.hidden=true;continue}line.hidden=false;line.setAttribute('x1',a.x);line.setAttribute('y1',a.y);line.setAttribute('x2',b.x);line.setAttribute('y2',b.y)}
  for(const {nodeId,c} of overlay.nodeEls){const p=pos(nodeId);if(!p){c.hidden=true;continue}c.hidden=false;c.setAttribute('cx',p.x);c.setAttribute('cy',p.y)}
}
function setTraceFocus(members,projection){focusMembers=Array.isArray(members)&&members.length?new Set(members):null;rebuildOverlay(projection)}

function sectionLabel(text){return el('div','papers-detail-kicker',text)}
function row(label,value){if(value===undefined||value===null||value==='')return null;const n=el('div','papers-detail-row');n.append(el('span','papers-detail-label',label),el('span','papers-detail-value',String(value)));return n}
function safeBound(value){const s=String(value||'').trim();return s&&/[.!?…]$/.test(s)?s:''}
function selectPoint(pointId){const field=globalThis.SSSInterlocutorFields?.get(id);if(field&&typeof field.selectPoint==='function')field.selectPoint(pointId,true)}
function externalLink(item){const a=el('a','papers-external-link');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.append(el('span','papers-external-label',item.label||'original source'),el('span','papers-external-arrow','↗'));return a}
function sourceDetail(projection,d){
  const panel=el('article','papers-detail papers-detail-source');panel.dataset.organismId=d.id;const head=el('div','papers-detail-head'),identity=el('div','papers-detail-identity');identity.append(el('span','papers-detail-code',d.id),el('span','papers-detail-locus',`${d.locus} · ${locusName(projection,d.locus)}`));const close=el('button','papers-detail-close','×');close.type='button';close.setAttribute('aria-label','Close source');close.addEventListener('click',()=>selectPoint(''));head.append(identity,close);panel.append(head,el('h1','papers-detail-title',d.title));
  const original=el('section','papers-detail-section papers-original');original.append(sectionLabel('ORIGINAL WORK'),el('div','papers-source-credit',d.credit||'source credit unresolved'));if(d.type)original.append(el('p','papers-source-type',d.type));const links=el('div','papers-external-links');for(const item of d.externals||[])links.append(externalLink(item));if(links.childElementCount)original.append(links);panel.append(original);
  const metabolism=el('section','papers-detail-section papers-metabolism');metabolism.append(sectionLabel('PAPERS METABOLISM'));const receipt=row('closure',d.metabolism);if(receipt)metabolism.append(receipt);if(d.quickscope)metabolism.append(el('p','papers-metabolic-copy',d.quickscope));if(d.boundary)metabolism.append(sectionLabel('EPISTEMIC BOUNDARY'),el('p','papers-boundary-copy',d.boundary));panel.append(metabolism);const stats=lineageStats(projection,d.id);if(stats.total){const descendants=el('section','papers-detail-section papers-lineage');descendants.append(sectionLabel('WHAT GREW FROM THIS SOURCE'),el('p','papers-lineage-summary',`${stats.holons} descendant holons · ${stats.depth} relational generations`));panel.append(descendants)}return panel;
}
function parentButton(parentId,projection){const d=detailFor(projection,parentId),b=el('button','papers-parent');b.type='button';b.dataset.parentId=parentId;b.append(el('span','papers-parent-id',parentId),el('span','papers-parent-title',d?.title||parentId));b.addEventListener('click',()=>selectPoint(parentId));return b}
function holonDetail(projection,d){
  const panel=el('article','papers-detail papers-detail-holon');panel.dataset.organismId=d.id;const head=el('div','papers-detail-head'),identity=el('div','papers-detail-identity');identity.append(el('span','papers-detail-code',d.id),el('span','papers-detail-locus',`${d.rank||rankOf(d.id)} · ${d.locus} · ${locusName(projection,d.locus)}`));const close=el('button','papers-detail-close','×');close.type='button';close.setAttribute('aria-label','Close holon');close.addEventListener('click',()=>selectPoint(''));head.append(identity,close);panel.append(head,el('h1','papers-detail-title',d.title),el('div','papers-derived','DERIVED INSIDE PAPERS'));
  const metabolism=el('section','papers-detail-section papers-metabolism');metabolism.append(sectionLabel('PAPERS METABOLISM'));const receipt=row('closure',d.metabolism);if(receipt)metabolism.append(receipt);const feeling=row('feeling',d.feeling_signature);if(feeling)metabolism.append(feeling);const bound=safeBound(d.bound);if(bound)metabolism.append(el('p','papers-metabolic-copy',bound));panel.append(metabolism);
  const stats=lineageStats(projection,d.id),lineage=el('section','papers-detail-section papers-lineage');lineage.append(sectionLabel('LINEAGE · FOUR PARENTS'),el('p','papers-lineage-summary',`${stats.holons} ancestral holons · ${stats.sources} original sources · ${stats.depth} generations deep`));const parents=el('div','papers-parents');for(const parent of d.parents||[])parents.append(parentButton(parent,projection));lineage.append(parents);panel.append(lineage);const loading=el('section','papers-detail-section papers-inquiry-loading');loading.append(sectionLabel('INQUIRY'),el('p','papers-boundary-copy','Opening the selected organism’s public relational body…'));panel.append(loading);return panel;
}
function detailPanel(projection){if(!selectedId)return null;const d=detailFor(projection,selectedId);if(!d)return null;return selectedId.startsWith('S.')?sourceDetail(projection,d):holonDetail(projection,d)}
async function loadInquiry(pointId){
  if(inquiryCache.has(pointId))return inquiryCache.get(pointId);if(!SCRIPT_BASE)return null;const promise=fetch(new URL(`inquiry/${encodeURIComponent(pointId)}.json`,SCRIPT_BASE),{credentials:'same-origin',cache:'force-cache'}).then(async r=>{if(r.status===404)return null;if(!r.ok)throw new Error(`inquiry ${r.status}`);return r.json()}).catch(()=>null);inquiryCache.set(pointId,promise);return promise;
}
function traceButton(label,members,projection){const b=el('button','papers-trace',label);b.type='button';b.addEventListener('click',()=>{const same=focusMembers&&members.length===focusMembers.size&&members.every(x=>focusMembers.has(x));setTraceFocus(same?null:members,projection)});return b}
function relationCard(kind,item,projection){const n=el('article',`papers-relation papers-relation-${kind}`),head=el('div','papers-relation-head');head.append(el('span','papers-relation-id',item.id||''),el('strong','papers-relation-title',item.title||''));if(Array.isArray(item.members)&&item.members.length)head.append(traceButton('trace',item.members,projection));n.append(head);if(item.text)n.append(el('p','papers-relation-copy',item.text));if(item.removal){const details=el('details','papers-removal'),summary=el('summary','papers-removal-summary','removal witness');details.append(summary,el('p','papers-removal-copy',item.removal));n.append(details)}return n}
function volumeSection(body,projection){const v=body?.volume;if(!v)return null;const s=el('section','papers-detail-section papers-inquiry-volume');s.append(sectionLabel('WHOLE · 1T'),el('h2','papers-inquiry-title',v.title||body.title||'whole-four closure'));if(v.text)s.append(el('p','papers-inquiry-copy',v.text));if(v.invariant)s.append(el('p','papers-volume-invariant',v.invariant));if(Array.isArray(v.removal)&&v.removal.length){const d=el('details','papers-removal papers-removal-volume'),sum=el('summary','papers-removal-summary','four-way necessity');d.append(sum);for(const x of v.removal)d.append(el('p','papers-removal-copy',x));s.append(d)}if(Array.isArray(v.members)&&v.members.length)s.append(traceButton('trace whole earning body',v.members,projection));return s}
function relationsSection(body,projection){if(!(body?.edges?.length||body?.faces?.length))return null;const s=el('section','papers-detail-section papers-inquiry-relations');s.append(sectionLabel('RELATIONS · 6E / 4F'));if(body.edges?.length){s.append(el('div','papers-rank-label','SIX PAIR RELATIONS'));const grid=el('div','papers-relations-grid');for(const item of body.edges)grid.append(relationCard('edge',item,projection));s.append(grid)}if(body.faces?.length){s.append(el('div','papers-rank-label','FOUR TRIPLE CLOSURES'));const grid=el('div','papers-relations-grid papers-faces-grid');for(const item of body.faces)grid.append(relationCard('face',item,projection));s.append(grid)}return s}
function metabolitesSection(body,projection){if(!body?.metabolites?.length)return null;const s=el('section','papers-detail-section papers-inquiry-metabolites');s.append(sectionLabel('METABOLITES · SURVIVING WISDOM'));const list=el('div','papers-metabolites');for(const m of body.metabolites){const card=el('article','papers-metabolite'),head=el('div','papers-metabolite-head'),identity=el('div','papers-metabolite-identity');identity.append(el('span','papers-metabolite-id',m.id||''),el('strong','papers-metabolite-title',m.title||''));head.append(identity);if(m.members?.length)head.append(traceButton(`trace ${m.earning||'earning body'}`,m.members,projection));card.append(head);if(m.earning){const earned=row('earned by',m.strengthened_by?`${m.earning} · strengthened by ${m.strengthened_by}`:m.earning);if(earned)card.append(earned)}if(m.text)card.append(el('p','papers-metabolite-copy',m.text));if(m.compression)card.append(el('p','papers-metabolite-compression',m.compression));list.append(card)}s.append(list);return s}
async function hydrateInquiry(panel,projection,pointId,token){
  const body=await loadInquiry(pointId);if(token!==selectionToken||selectedId!==pointId||!panel.isConnected)return;panel.querySelector('.papers-inquiry-loading')?.remove();if(!body){const pending=el('section','papers-detail-section papers-inquiry-pending');pending.append(sectionLabel('INQUIRY PORE'),el('p','papers-boundary-copy','The lineage is fully traversable here. This organism’s readable 6E / 4F / 1T and metabolite body has not yet been admitted to the public site projection.'));panel.append(pending);return}const volume=volumeSection(body,projection),relations=relationsSection(body,projection),metabolites=metabolitesSection(body,projection);if(volume)panel.append(volume);if(relations)panel.append(relations);if(metabolites)panel.append(metabolites);if(body.boundary){const b=el('section','papers-detail-section papers-inquiry-boundary');b.append(sectionLabel('EPISTEMIC BOUNDARY'),el('p','papers-boundary-copy',body.boundary));panel.append(b)}
}
function hud(projection){const p=projection.population||{},n=el('div','papers-hud'),line=el('div','papers-hud-line');line.append(el('strong','papers-hud-title','Papers'),el('span','papers-hud-stat',`${p.registry_sources??0} sources · ${p.holons??0} holons`));const legend=el('div','papers-legend'),source=el('span','papers-legend-item');source.append(el('i','papers-legend-dot'),document.createTextNode(' source'));const holon=el('span','papers-legend-item');holon.append(el('i','papers-legend-diamond'),document.createTextNode(' holon'));legend.append(source,holon,el('span','papers-hud-help','hover · click to inquire'));n.append(line,legend);return n}
function paintSelection(){if(!renderContext)return;const {content,projection}=renderContext;const old=content.querySelector('.papers-detail');if(old)old.remove();focusMembers=null;rebuildOverlay(projection);const panel=detailPanel(projection);if(panel){content.append(panel);if(!selectedId.startsWith('S.')){const token=++selectionToken;hydrateInquiry(panel,projection,selectedId,token)}}}
function activateFieldPoint({point,field}={}){selectedField=field||globalThis.SSSInterlocutorFields?.get(id)||selectedField;selectedId=point?.id||'';if(selectedField)ensureOverlay(selectedField);paintSelection()}
function render({host,content,projection}={}){if(!host||!content||!projection?.groups||!projection?.phenotype)return false;host.hidden=false;content.className='interlocutor-content papers-content';content.replaceChildren();renderContext={host,content,projection};selectedField=globalThis.SSSInterlocutorFields?.get(id)||selectedField;if(selectedField)ensureOverlay(selectedField);content.append(hud(projection));paintSelection();return true}
function unmount({host,content}={}){selectionToken++;selectedId='';focusMembers=null;renderContext=null;if(overlay.svg){overlay.svg.hidden=true;overlay.svg.replaceChildren()}if(host)host.hidden=true;if(content)content.replaceChildren()}
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection,activateFieldPoint}));
})();
