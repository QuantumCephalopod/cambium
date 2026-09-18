(() => {
'use strict';
const id='organism:crawlerbait';
const GENES=Object.freeze(['w','x','z','y']);
const modules=globalThis.SSSInterlocutorModules||(globalThis.SSSInterlocutorModules=new Map());
const EMPTY_NODE=Object.freeze({noun:'open',de:'offen',en:'open',children:Object.freeze({})});
const TRACE_NODE=Object.freeze({noun:'Traces',de:'Spuren',en:'Traces',gene:'COPY',children:Object.freeze({})});
const MEMBRANE_NODE=Object.freeze({noun:'Membrane',de:'Membran',en:'Membrane',gene:'CONTROL',children:Object.freeze({})});
const TIDE_NODE=Object.freeze({noun:'Tide',de:'Tide',en:'Tide',gene:'CULTIVATE',children:Object.freeze({})});
let activeProjection=null,inspectorHost=null,selectedAddress='';

const shader=Object.freeze({
  id:'shader:organism:crawlerbait',
  clear:[0.004,0.012,0.018,1],
  fallbackAlpha:.2,
  state:Object.freeze({blend:true,depthTest:true,depthWrite:false}),
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
float hash21(vec2 p){p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
void main(){
  vec3 n=normalize(vN);
  vec3 eye=normalize(vec3(0.,0.,3.15)-vW);
  float fres=pow(1.-abs(dot(n,eye)),1.55);
  float a=sin((gl_FragCoord.x+gl_FragCoord.y*.57735)*.19+uTime*.035);
  float b=sin((gl_FragCoord.x-gl_FragCoord.y*.57735)*.19-uTime*.027);
  float c=sin(gl_FragCoord.y*.219+uTime*.018);
  float moire=pow(abs(a*b*c),1.7);
  float grain=hash21(gl_FragCoord.xy+floor(uTime*5.)*vec2(3.7,7.1))-.5;
  int ri=int(clamp(floor(vRegion+.5),0.,3.));
  vec3 coral=mix(vec3(.38,.09,.035),uPalette[ri],.42);
  vec3 deep=vec3(.004,.016,.023);
  float selected=(uFocus<-.5||abs(vRegion-uFocus)<.2)?1.:.48;
  float baitRegion=ri==0?1.:.0;
  vec3 ink=mix(deep,coral,.08+.28*moire+.19*fres+.07*baitRegion);
  ink+=grain*.022;
  float alpha=(.07+.13*moire+.12*fres+.045*baitRegion)*mix(.68,1.,selected);
  outColor=vec4(max(ink,0.),clamp(alpha,.055,.34));
}`
});

function el(tag,cls,text){
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(text!==undefined)n.textContent=text;
  return n;
}
function freezeNode(node){
  if(node.children){
    for(const g of Object.keys(node.children))node.children[g]=freezeNode(node.children[g]);
    Object.freeze(node.children);
  }
  return Object.freeze(node);
}
function baitTree(routes){
  const byAddress=new Map();
  const prefixes=new Set(['']);
  for(const route of routes){
    if(!route||typeof route.address!=='string'||!route.address||!new RegExp('^[wxzy]+$').test(route.address))continue;
    byAddress.set(route.address,route);
    for(let i=0;i<route.address.length;i++)prefixes.add(route.address.slice(0,i));
  }
  function branch(prefix){
    const route=byAddress.get(prefix);
    if(route){
      return {
        noun:route.path,
        de:route.path,
        en:route.path,
        bait:true,
        address:route.address,
        children:{}
      };
    }
    if(!prefixes.has(prefix))return {noun:'open',de:'offen',en:'open',children:{}};
    const children={};
    for(const g of GENES)children[g]=branch(prefix+g);
    return {
      noun:prefix?'Bait branch':'Baits',
      de:prefix?'Köderzweig':'Köder',
      en:prefix?'Bait branch':'Baits',
      gene:prefix?'CREATE':'CREATE',
      children
    };
  }
  return branch('');
}
function fieldProjection(projection={}){
  const routes=Array.isArray(projection.routes)?projection.routes:[];
  const root=freezeNode({
    noun:'Crawlerbait',
    children:{
      w:baitTree(routes),
      x:{...TRACE_NODE},
      z:{...MEMBRANE_NODE},
      y:{...TIDE_NODE}
    }
  });
  const points=routes
    .filter(route=>route&&typeof route.address==='string'&&/^[wxzy]+$/.test(route.address))
    .map(route=>Object.freeze({
      id:`bait:${route.address}`,
      gene:'w',
      path:`w${route.address}`,
      kind:'bait',
      label:route.path,
      meta:`${route.address} · ${route.observed_404} observations · ${route.signatures?.length||0} claimed UAs`,
      address:route.address,
      route
    }));
  return Object.freeze({root,points});
}
function metric(label,value){
  const n=el('span','crawlerbait-metric');
  n.append(el('b','',String(value)),el('small','',label));
  return n;
}
function prettyTime(value){
  if(!value)return '—';
  return String(value).replace('T',' ').replace('Z',' UTC');
}
function renderInspector(route){
  if(!inspectorHost)return;
  inspectorHost.replaceChildren();
  if(!route){
    const empty=el('div','crawlerbait-inspector-empty');
    empty.append(el('strong','', 'the bait-space is the map'));
    empty.append(el('span','', 'hover for a trace · click a luminous bait to inspect it'));
    inspectorHost.append(empty);
    return;
  }
  const head=el('div','crawlerbait-inspector-head');
  head.append(el('span','crawlerbait-address',`bait:${route.address}`));
  const receipt=el('a','crawlerbait-receipt','open static receipt ↗');
  receipt.href=route.href;receipt.target='_blank';receipt.rel='noopener';
  head.append(receipt);
  inspectorHost.append(head);

  const title=el('code','crawlerbait-path',route.path);
  inspectorHost.append(title);

  const facts=el('div','crawlerbait-facts');
  facts.append(
    metric('observations',route.observed_404),
    metric('claimed UAs',route.signatures?.length||0),
    metric('sampled',route.sampled?'yes':'no')
  );
  inspectorHost.append(facts);

  const time=el('div','crawlerbait-time');
  time.append(
    el('span','',`first materialized · ${prettyTime(route.materialized_at)}`),
    el('span','',`last window · ${prettyTime(route.last_observed_window?.end)}`)
  );
  inspectorHost.append(time);

  const signatures=el('div','crawlerbait-signatures');
  signatures.append(el('h3','', 'claimed user-agents'));
  const list=el('div','crawlerbait-signature-list');
  for(const sig of route.signatures||[]){
    const row=el('div','crawlerbait-signature');
    row.append(el('code','',sig.claimed_user_agent||'∅'));
    row.append(el('span','',String(sig.observed_404)));
    list.append(row);
  }
  if(!(route.signatures||[]).length)list.append(el('span','crawlerbait-none','no retained user-agent claim'));
  signatures.append(list);
  inspectorHost.append(signatures);
}
function render({host,content,projection}={}){
  if(!host||!content||!projection?.summary)return false;
  activeProjection=projection;
  host.hidden=false;
  content.className='interlocutor-content crawlerbait-content';
  content.replaceChildren();

  const panel=el('section','crawlerbait-panel');
  const title=el('div','crawlerbait-title');
  title.append(el('h1','', 'Crawlerbait'),el('span','', 'live address anatomy'));
  panel.append(title);

  const routes=projection.routes||[];
  const depths=routes.map(r=>String(r.address||'').length).filter(Boolean);
  const stats=el('div','crawlerbait-stats');
  stats.append(
    metric('baits',projection.summary.baits ?? routes.length),
    metric('observations',projection.summary.observed_404 ?? 0),
    metric('claimed UAs',projection.summary.observed_signatures ?? 0),
    metric('max depth',depths.length?Math.max(...depths):0)
  );
  panel.append(stats);

  const note=el('p','crawlerbait-note',
    'Every luminous point is one real bait body. Its position comes from the actual recursive w-address, not a synthetic layout.'
  );
  panel.append(note);

  inspectorHost=el('section','crawlerbait-inspector');
  panel.append(inspectorHost);

  const foot=el('div','crawlerbait-foot');
  foot.append(el('span','',projection.updated_at?`through ${prettyTime(projection.updated_at)}`:'waiting for first tide'));
  const machine=el('a','','machine-readable reef ↗');machine.href='/crawlerbait/';machine.target='_blank';machine.rel='noopener';
  foot.append(machine);
  panel.append(foot);

  content.append(panel);
  const selected=selectedAddress?routes.find(r=>r.address===selectedAddress):null;
  renderInspector(selected||null);
  return true;
}
function activateFieldPoint({point}={}){
  const route=point?.route||null;
  selectedAddress=route?.address||'';
  renderInspector(route);
}
function unmount({host,content}={}){
  if(host)host.hidden=true;
  if(content)content.replaceChildren();
  inspectorHost=null;
}
modules.set(id,Object.freeze({id,shader,render,unmount,fieldProjection,activateFieldPoint}));
})();
