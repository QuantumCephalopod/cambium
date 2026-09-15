(() => {
'use strict';
const host=document.getElementById('philosophy-interlocutor'),copy=document.getElementById('page-copy');
if(!host||!copy) throw new Error('philosophy interlocutor surface missing');
function nodeAt(root,path){let n=root;for(const g of path){n=n?.children?.[g];if(!n)return null}return n}
function render({projection,path='',language='en'}={}){
  if(!projection?.root){unmount();return false;}
  const node=path?nodeAt(projection.root,path):projection.root;
  host.hidden=false;copy.hidden=false;copy.className=path?'':'root';
  if(path){copy.innerHTML=`<div class="kicker">philosophy · inspect ${path}</div><h1>${node?.[language]||node?.noun||path}</h1><p>${node?.one?.[language]||''}${projection.occupancy?.[path]?.length?'<br><br>'+projection.occupancy[path].map(x=>'⟦ '+x+' : root ⟧').join('  '):''}</p>`}
  else{copy.innerHTML=`<div class="kicker">organism:philosophy · entry interlocutor</div><h1>Form · Continuity · Care · Inquiry</h1><p>${language==='de'?'Dieser Interlocutor bringt seinen eigenen tetrahedralen Hintergrund mit. Hier ist er zusätzlich ein lokales Navigationsinstrument: direkt ziehen zum Orientieren und einen realisierten Ort im Hintergrund auswählen. Die globale Minimap bleibt überall verfügbar.':'This interlocutor brings its own tetrahedral background. Here it is additionally a local navigation instrument: drag it directly to orient and select a realized locus in the background. The global minimap remains available everywhere.'}</p>`}
  return true
}
function unmount(){host.hidden=true;copy.hidden=true;copy.innerHTML=''}
globalThis.SSSPhilosophyView=Object.freeze({render,unmount,element:host});
})();
