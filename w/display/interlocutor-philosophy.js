(() => {
'use strict';
const copy=document.getElementById('page-copy');
if(!copy) throw new Error('philosophy interlocutor surface missing');
function nodeAt(root,path){let n=root;for(const g of path){n=n?.children?.[g];if(!n)return null}return n}
function render({projection,path='',language='en'}={}){
  if(!projection?.root){copy.hidden=true;return false;}
  const node=path?nodeAt(projection.root,path):projection.root;
  copy.hidden=false;
  copy.className=path?'':'root';
  if(path){
    copy.innerHTML=`<div class="kicker">philosophy · inspect ${path}</div><h1>${node?.[language]||node?.noun||path}</h1><p>${node?.one?.[language]||''}${projection.occupancy?.[path]?.length?'<br><br>'+projection.occupancy[path].map(x=>'⟦ '+x+' : root ⟧').join('  '):''}</p>`;
  }else{
    copy.innerHTML=`<div class="kicker">organism:philosophy · entry interlocutor</div><h1>Form · Continuity · Care · Inquiry</h1><p>${language==='de'?'Der große Körper ist hier selbst ein lokales Navigationsinstrument: ziehen zum Orientieren, einen realisierten Ort direkt im Feld auswählen oder jederzeit die globale Minimap benutzen. Auswahl bleibt VIEW; Eintritt bleibt eine eigene Entscheidung.':'Here the large body is itself a local navigation instrument: drag to orient, select a realized place directly in the field, or use the global minimap from anywhere. Selection remains VIEW; entering remains a separate decision.'}</p>`;
  }
  return true;
}
function unmount(){copy.hidden=true;copy.innerHTML='';}
globalThis.SSSPhilosophyView=Object.freeze({render,unmount,element:copy});
})();
