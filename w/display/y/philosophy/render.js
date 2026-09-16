(() => {
'use strict';
const id='organism:philosophy';
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
function nodeAt(root,path){let n=root;for(const g of path){n=n?.children?.[g];if(!n)return null}return n}
function render({host,content,projection,path='',language='en'}={}){
  if(!host||!content||!projection?.root)return false;
  const node=path?nodeAt(projection.root,path):projection.root;
  host.hidden=false;
  content.className='interlocutor-content philosophy-content';
  content.replaceChildren();
  const copy=document.createElement('section');copy.className=path?'':'root';
  if(path){
    copy.innerHTML=`<div class="kicker">philosophy · inspect ${path}</div><h1>${node?.[language]||node?.noun||path}</h1><p>${node?.one?.[language]||''}${projection.occupancy?.[path]?.length?'<br><br>'+projection.occupancy[path].map(x=>'⟦ '+x+' : root ⟧').join('  '):''}</p>`;
  }else{
    copy.innerHTML=`<div class="kicker">organism:philosophy · entry interlocutor</div><h1>Form · Continuity · Care · Inquiry</h1><p>${language==='de'?'Dieser Interlocutor bringt seinen eigenen tetrahedralen Hintergrund mit. Hier ist er zusätzlich ein lokales Inspektionsinstrument für den realisierten globalen Adressraum. Die globale Minimap bewegt direkt zwischen tatsächlichen Site-Holons.':'This interlocutor brings its own tetrahedral background. Here it is additionally a local inspection instrument for the realized global address-space. The global minimap moves directly between actual site-holons.'}</p>`;
  }
  content.append(copy);return true;
}
function unmount({host,content}={}){if(host)host.hidden=true;if(content)content.replaceChildren()}
modules.set(id,Object.freeze({id,render,unmount,fieldProjection:projection=>projection}));
})();
