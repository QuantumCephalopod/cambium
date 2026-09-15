(() => {
'use strict';
const host=document.getElementById('papers-interlocutor');
const groups=document.getElementById('papers-groups');
const status=document.getElementById('papers-status');
if(!host||!groups||!status) throw new Error('papers interlocutor surface missing');
const GENES=['w','x','z','y'];
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function render({projection,path=''}={}){
  if(!projection?.groups||!projection?.phenotype){host.hidden=true;return false;}
  groups.replaceChildren();let total=0;
  for(const gene of GENES){
    const items=Array.isArray(projection.groups[gene])?projection.groups[gene]:[];total+=items.length;
    const group=el('section','papers-group');group.dataset.papersLocus=gene;group.classList.toggle('is-view',path===gene);
    const heading=el('div','papers-group-heading');const title=el('h3','papers-group-title',projection.phenotype[gene]||gene);const count=el('span','papers-count',String(items.length).padStart(2,'0'));heading.append(title,count);
    const list=el('ul','papers-list');for(const item of items){const li=el('li','paper-item');li.append(el('span','paper-id',item.id),el('span','paper-title',item.title));list.append(li)}
    group.append(heading,list);groups.append(group);
  }
  status.textContent=total+' source organisms · '+(path?('view '+path):'local root');
  host.hidden=false;return true;
}
function unmount(){host.hidden=true;groups.replaceChildren();status.textContent='';}
globalThis.SSSPapersView=Object.freeze({render,unmount,element:host});
})();
