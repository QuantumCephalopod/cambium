(() => {
'use strict';
const id='organism:papers';
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
const GENES=['w','x','z','y'],DNA={w:'CREATE',x:'COPY',z:'CONTROL',y:'CULTIVATE'};
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function fieldProjection(d){const children={};for(const g of GENES){const items=d?.groups?.[g]||[],noun=d?.phenotype?.[g]||g;children[g]={noun,de:noun,en:noun,gene:DNA[g],one:{de:`${items.length} realisierte Forschungsorganismen.`,en:`${items.length} realized research organisms.`},children:{}}}return {source:{organism:'papers',home:d?.event_id||'papers'},root:{noun:'Papers',children},occupancy:{w:[],x:[],z:[],y:[]}}}
function render({host,content,projection,path=''}={}){
  if(!host||!content||!projection?.groups||!projection?.phenotype)return false;
  content.className='interlocutor-content papers-content';content.replaceChildren();
  const head=el('div','papers-embedded-head');const left=el('div');left.append(el('div','kicker','organism:papers · local root'),el('h1','', 'Papers'));const status=el('div','papers-status');head.append(left,status);
  const groups=el('div','papers-groups');let total=0;
  for(const gene of GENES){const items=Array.isArray(projection.groups[gene])?projection.groups[gene]:[];total+=items.length;const group=el('section','papers-group');group.dataset.papersLocus=gene;group.classList.toggle('is-view',path===gene);const heading=el('div','papers-group-heading');heading.append(el('h3','papers-group-title',projection.phenotype[gene]||gene),el('span','papers-count',String(items.length).padStart(2,'0')));const list=el('ul','papers-list');for(const item of items){const li=el('li','paper-item');li.append(el('span','paper-id',item.id),el('span','paper-title',item.title));list.append(li)}group.append(heading,list);groups.append(group)}
  status.textContent=total+' source organisms · '+(path?('view '+path):'local root');content.append(head,groups);host.hidden=false;return true;
}
function unmount({host,content}={}){if(host)host.hidden=true;if(content)content.replaceChildren()}
modules.set(id,Object.freeze({id,render,unmount,fieldProjection}));
})();
