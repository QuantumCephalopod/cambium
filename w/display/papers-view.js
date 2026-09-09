/* Render the display-owned public projection of /papers/_feed.
 * papers loci remain in papers' address space; they are not philosophy destinations.
 */
(function(root){
  'use strict';
  const $=id=>document.getElementById(id);
  const GENES=['w','x','z','y'];
  function el(tag,cls,text){
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(text!==undefined)n.textContent=text;
    return n;
  }
  function render(visible=true){
    const carrier=$('cambium-data'),section=$('research-field'),host=$('papers-groups'),status=$('papers-status');
    if(!carrier||!section||!host||!status)return;
    if(!visible){section.hidden=true;return;}
    let data;
    try{data=JSON.parse(carrier.textContent);}catch(_){section.hidden=true;return;}
    const papers=data.papers;
    if(!papers||!papers.groups||!papers.phenotype){section.hidden=true;return;}
    host.replaceChildren();
    let total=0;
    for(const gene of GENES){
      const items=Array.isArray(papers.groups[gene])?papers.groups[gene]:[];
      total+=items.length;
      const group=el('section','papers-group');
      group.dataset.papersLocus=gene;
      group.setAttribute('aria-labelledby','papers-'+gene+'-title');
      const heading=el('div','papers-group-heading');
      const title=el('h3','papers-group-title',papers.phenotype[gene]||gene);
      title.id='papers-'+gene+'-title';
      const count=el('span','papers-count',String(items.length).padStart(2,'0'));
      count.setAttribute('aria-label',items.length+' source organisms');
      heading.append(title,count);
      const list=el('ul','papers-list');
      for(const item of items){
        const li=el('li','paper-item');
        li.append(el('span','paper-id',item.id),el('span','paper-title',item.title));
        list.append(li);
      }
      group.append(heading,list);
      host.append(group);
    }
    status.textContent=total+' source organisms · feed acknowledged';
    status.title=papers.event_id||'';
    section.hidden=false;
  }
  render(false);
  root.PapersDisplay=Object.freeze({render});
})(globalThis);
