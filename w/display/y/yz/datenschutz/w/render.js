(() => {
'use strict';
const id='organism:datenschutz',Surface=globalThis.SSSTetraText;
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
(function exposeLegalLink(){
  let nav=document.getElementById('legal-links');
  if(!nav){nav=document.createElement('nav');nav.id='legal-links';nav.setAttribute('aria-label','Legal');document.body.append(nav)}
  if(!document.getElementById('legal-link-privacy')){
    const a=document.createElement('a');a.id='legal-link-privacy';nav.append(a);
  }
  function localise(){const de=globalThis.SSSWorldView?.language==='de',a=document.getElementById('legal-link-privacy');a.href=de?'/privacy/':'/privacy/en/';a.textContent=de?'Datenschutz':'Privacy policy';a.hreflang=de?'de':'en'}
  localise();addEventListener('sss:language',localise);
})();

let state=null,pretext=null;
const fieldProjection=projection=>Object.freeze({root:Object.freeze({noun:'datenschutz',...projection.title,children:Object.freeze({})}),points:Object.freeze([])});
async function prepareFieldProjection(projection,{dependency}={}){pretext=await Surface.prepare(dependency)}
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
function syncReading(){
 if(!state)return;const s=state,m=s.material;s.spacer.style.height=(s.scroller.clientHeight+m.maxScroll)+'px';s.scroller.scrollTop=m.offset;s.range.max=String(m.maxScroll);s.range.value=String(m.offset);
 const current=[...m.sections].reverse().find(part=>part.y<=m.offset+1)||m.sections[0];if(current)s.sections.value=String(current.index);
 s.scroller.dataset.offset=String(Math.round(m.offset));s.scroller.dataset.extent=String(Math.round(m.maxScroll));
}
function afterDraw(args){
 if(!state)return;const s=state,{rect,viewRect:v,model,proj,frame,dpr}=args,pad=SSSDisplayType.rankPx(0),size=Math.max(1,Math.min(v.width,v.height)-2*pad),extent=Math.max(...SSSDisplayNavigation.V0.map(p=>Math.abs(p[0]))),scale=Math.hypot(model[0],model[1],model[2]);
 const projected=2*extent*scale*Math.abs(proj[0])*rect.width/2;s.fit=frame.scale*size/Math.max(1e-6,projected);
 const bx=v.x+(v.width-size)/2,by=v.y+(v.height-size)/2,base={x:bx+pad,y:by+pad,w:Math.max(1,size-2*pad),h:Math.max(1,size-2*pad)};
 const occupied=(globalThis.SSSDisplaySafeArea?.snapshot()?.occupied||[]).map(o=>({x:o.rect.left-rect.left-pad,y:o.rect.top-rect.top-pad,w:o.rect.width+2*pad,h:o.rect.height+2*pad}));
 const free=Surface.freeRectangle(base,occupied),region={x:free.x-bx,y:free.y-by,w:free.w,h:free.h};
 const changed=s.material.layout({size,region,dpr});
 const points=s.material.draw(args),hull=Surface.hull(points),left=Math.min(...hull.map(p=>p.x)),top=Math.min(...hull.map(p=>p.y)),width=Math.max(...hull.map(p=>p.x))-left,height=Math.max(...hull.map(p=>p.y))-top;
 const geometry=[left,top,width,height,...hull.flatMap(p=>[p.x,p.y])].map(x=>x.toFixed(2)).join(',');
 if(geometry!==s.geometry){s.geometry=geometry;Object.assign(s.scroller.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px',clipPath:'polygon('+hull.map(p=>(p.x-left)+'px '+(p.y-top)+'px').join(',')+')'})}
 if(changed||s.height!==s.scroller.clientHeight){s.height=s.scroller.clientHeight;syncReading()}
}
const shader=Object.freeze({id:'shader:organism:datenschutz',clear:[.012,.018,.015,1],fallbackAlpha:.12,view:Object.freeze({rest:[1,0,0,0],projection:'orthographic'}),state:Object.freeze({blend:true,depthTest:true,depthWrite:false}),
 fragment:`#version 300 es
precision highp float;
in vec3 vN; in vec3 vW; in float vRegion;
uniform float uFocus; uniform vec3 uPalette[4];
out vec4 outColor;
void main(){
  vec3 n=normalize(vN);
  float rim=pow(1.-abs(n.z),1.8);
  int ri=int(clamp(floor(vRegion+.5),0.,3.));
  vec3 c=mix(vec3(.01,.016,.024),uPalette[ri],.18+.17*rim);
  float a=(uFocus<-.5||abs(vRegion-uFocus)<.2)?.19:.08;
  outColor=vec4(c,a+.09*rim);
}`,
 afterDraw,focus:()=>state?{center:[0,0,0],scale:state.fit}:null});
function semanticText(blocks,language){
 const article=el('article','datenschutz-source');article.lang=language;article.setAttribute('data-type-fold','off');let list=null;
 for(const block of blocks){const p=el(block.tag);let cursor=0;for(const link of block.links){const at=block.text.indexOf(link.text,cursor);if(at<0)throw new Error('Source link missing from approved block');p.append(document.createTextNode(block.text.slice(cursor,at)));const a=el('a','',link.text);a.href=link.href;a.tabIndex=-1;p.append(a);cursor=at+link.text.length}p.append(document.createTextNode(block.text.slice(cursor)));if(block.tag==='li'){if(!list){list=el('ul');article.append(list)}list.append(p)}else{list=null;article.append(p)}}return article;
}
function render({host,content,projection,language='de',ui}={}){
 if(!host||!content||!projection?.notices?.[language]||!pretext)return false;
 if(state)state.material.release();host.hidden=false;content.className='interlocutor-content datenschutz-content';content.replaceChildren();
 const blocks=projection.notices[language],de=language==='de',heading=el('div','datenschutz-heading');heading.lang=language;
 const title=el('h1','',projection.title[language]),links=el('div','datenschutz-apertures'),full=el('a','',de?'Fließtext ↗':'Full text ↗'),contact=el('a','',de?'Kontakt ↗':'Contact ↗');
 full.href=de?'/privacy/':'/privacy/en/';contact.href='mailto:'+projection.contact.email;links.append(full,contact);heading.append(title,links);
 const controls=el('div','datenschutz-controls'),sections=el('select','datenschutz-sections');sections.setAttribute('aria-label',de?'Abschnitt':'Section');
 blocks.forEach((b,i)=>{if(b.tag==='h1'||b.tag==='h2'){const option=el('option','',b.text);option.value=String(i);sections.append(option)}});
 const transport=el('div','datenschutz-transport'),range=el('input','datenschutz-position');range.type='range';range.min='0';range.max='0';range.step='1';range.value='0';range.setAttribute('aria-label',de?'Leseposition':'Reading position');
 const reset=el('button','datenschutz-orthogonal','⊥');reset.type='button';reset.title=de?'Orthogonale Leseansicht':'Orthographic reading view';reset.setAttribute('aria-label',reset.title);reset.addEventListener('click',()=>SSSWorldView.easeTo([1,0,0,0]));transport.append(range,reset);controls.append(sections,transport);
 const scroller=el('div','datenschutz-scroll'),spacer=el('div');scroller.tabIndex=0;scroller.setAttribute('role','region');scroller.setAttribute('aria-label',de?'Text auf dem Tetraeder — scrollen; Abschnitte unten':'Text on the tetrahedron — scroll; sections below');spacer.setAttribute('aria-hidden','true');scroller.append(spacer);
 state={host,language,material:Surface.create({blocks,pretext}),scroller,spacer,range,sections,fit:1};
 scroller.addEventListener('scroll',()=>{if(!state||state.scroller!==scroller)return;state.material.scroll(scroller.scrollTop);syncReading()},{passive:true});
 sections.addEventListener('change',()=>{const part=state.material.sections.find(p=>p.index===Number(sections.value));if(part){state.material.scroll(part.y);syncReading()}});
 range.addEventListener('input',()=>{state.material.scroll(range.value);syncReading()});
 content.append(heading,controls,scroller,semanticText(blocks,language));ui.bind(heading,'description');ui.bind(controls,'controls');return true;
}
function unmount({host,content}={}){if(host)host.hidden=true;if(content)content.replaceChildren();state?.material.release();state=null}
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection,prepareFieldProjection}));
})();
