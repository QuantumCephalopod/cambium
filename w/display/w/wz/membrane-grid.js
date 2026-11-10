/* Display-owned screen fields and the navigator's nested fields are authored
 * in the same recursive grid. Observation never resizes or replaces an address. */
(function(root,factory){
  'use strict';
  const UI=typeof module==='object'&&module.exports?require('./ui-grid.js'):root.SSSUIGrid;
  const api=factory(UI);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else {
    const node=root.document?.getElementById('display-ui-grids');
    if(!node)throw new Error('Display membrane UI grids are missing');
    const raw=JSON.parse(node.textContent);
    root.SSSDisplayMembraneGrid=api.create(raw.membrane,raw.navigator);
  }
})(typeof globalThis==='object'?globalThis:this,function(UI){
  'use strict';
  if(!UI)throw new Error('recursive UI-grid algebra is required');
  const clone=x=>JSON.parse(JSON.stringify(x));
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const box=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
  const projection=(b,p)=>box(p.left+b.x*p.width,p.top+b.y*p.height,b.w*p.width,b.h*p.height);
  function address(x,y,depth){
    let out='';
    for(let i=depth-1;i>=0;i--){const div=2**i,qx=Math.floor(x/div)%2,qy=Math.floor(y/div)%2;out+=qy?(qx?'z':'y'):(qx?'x':'w')}
    return out;
  }
  function realize(base,name,cells){
    const s=clone(base),splits=new Set(s.splits);
    if(!s.fields[name])throw new Error('unaddressed membrane field '+name);
    for(const cell of cells)for(let i=0;i<cell.length;i++)splits.add(cell.slice(0,i));
    s.fields[name].cells=cells;s.splits=[...splits];return UI.normalizeState(s);
  }
  function create(membrane,navigator){
    const base=UI.normalizeState(membrane),inner=UI.normalizeState(navigator);
    const headerNames=['brand','status','language','brand-mark','brand-name','language-invert','language-dot','language-de','language-slash','language-en'];
    for(const name of ['top','compass','ascent','type-unit',...headerNames])if(!base.fields[name])throw new Error('missing membrane field '+name);
    const pocketFields=['state','map','axis-y','axis-x','hint','help','trigger'];
    for(const name of ['pocket','legal','guide','original-reserve-left','original-reserve-right',...pocketFields])if(!inner.fields[name])throw new Error('missing navigator field '+name);
    const typeRef=UI.fieldInfo(base,'type-unit');
    if(typeRef.cells.length!==1)throw new Error('the shared type reference must be one realized cell');
    const typeUnitRatio=typeRef.bounds.w;
    const headerCells=['brand','status','language'].flatMap(name=>base.fields[name].cells);
    if(headerCells.length!==16||new Set(headerCells).size!==16||headerCells.some(c=>!base.fields.top.cells.includes(c)))throw new Error('header fields must exactly partition the authored top');
    function partition(parent,names){
      const p=UI.fieldInfo(base,parent).bounds,rs=names.map(n=>UI.fieldInfo(base,n).bounds);
      const inside=r=>r.x>=p.x&&r.y>=p.y&&r.x+r.w<=p.x+p.w&&r.y+r.h<=p.y+p.h;
      const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
      if(rs.some(r=>!inside(r))||rs.some((a,i)=>rs.slice(i+1).some(b=>overlaps(a,b)))||rs.reduce((s,r)=>s+r.w*r.h,0)!==p.w*p.h)throw new Error(parent+' children must exactly partition their parent');
    }
    partition('brand',['brand-mark','brand-name']);
    partition('language',['language-invert','language-dot','language-de','language-slash','language-en']);
    // The pocket is a declared partition; the guide deliberately overlays map.
    const cells=pocketFields.flatMap(name=>inner.fields[name].cells);
    if(cells.some(c=>c.length!==3)||new Set(cells).size!==64||cells.length!==64)throw new Error('navigator pocket must explicitly partition every rank-three cell');
    const originalCells=['pocket','legal','original-reserve-left','original-reserve-right'].flatMap(name=>inner.fields[name].cells);
    if(originalCells.some(c=>c.length!==2)||originalCells.length!==16||new Set(originalCells).size!==16)throw new Error('original navigator field must explicitly account for every rank-two cell');
    if(inner.fields.guide.cells.join(',')!==inner.fields.map.cells.join(',')||inner.fields.guide.z<=inner.fields.map.z)throw new Error('navigator guide must explicitly overlay its map');
    let outer=base,viewport=box(0,0,0,0),compassInfo=null,compassState=null;
    const mode=()=>UI.orientation(viewport.width,viewport.height);
    function useCompass(state,field){
      if(!state||!field)return;
      const check=UI.spanInfo(state,field.cells);
      if(!check.ok)throw new Error('global compass has no realized field');
      if(compassState===state&&compassInfo?.cells.join(',')===check.cells.join(','))return;
      compassState=state;compassInfo=check;outer=realize(base,'compass',check.cells);
    }
    function authoredRect(name){return projection(UI.orientBounds(UI.fieldInfo(outer,name).bounds,mode()),viewport)}
    function pocketRelative(name){return UI.orientBounds(UI.fieldInfo(inner,name).bounds,mode())}
    function authoredNested(name){return projection(pocketRelative(name),authoredRect('compass'))}
    function rect(name){return name==='ascent'?authoredNested('pocket'):authoredRect(name)}
    function nested(name){
      if(name==='pocket')return authoredRect('ascent');
      if(name==='legal')return authoredNested(name);
      if(pocketFields.includes(name)||name==='guide')return projection(pocketRelative(name),authoredRect('ascent'));
      throw new Error('unknown navigator field '+name);
    }
    function container(){
      const a=authoredRect('compass'),b=authoredRect('ascent'),left=Math.min(a.left,b.left),top=Math.min(a.top,b.top);
      return box(left,top,Math.max(a.right,b.right)-left,Math.max(a.bottom,b.bottom)-top);
    }
    function relative(name){const a=nested(name),b=container();return {x:b.width?(a.left-b.left)/b.width:0,y:b.height?(a.top-b.top)/b.height:0,w:b.width?a.width/b.width:0,h:b.height?a.height/b.height:0}}
    function topCapacity(width,height){const area=box(0,0,Math.max(0,num(width)),Math.max(0,num(height)));return projection(UI.orientBounds(UI.fieldInfo(base,'top').bounds,UI.orientation(area.width,area.height)),area)}
    function role(value){return UI.orientEdges(value,mode())}
    function reconcile(input={}){viewport=box(0,0,Math.max(0,num(input.width)),Math.max(0,num(input.height)));return snapshot()}
    function surfaceRect(el,raw){
      const name=el?.getAttribute?.('data-display-ui-field');
      if(['top','ascent',...headerNames].includes(name))return rect(name);
      if(name==='pocket'||name==='legal'||pocketFields.includes(name)||name==='guide')return nested(name);
      if(el?.dataset?.uiBounded==='true')return raw;
      throw new Error('Display surface lacks a realized recursive UI field');
    }
    function snapshot(){return {outer,inner,viewport:{...viewport},orientation:mode(),compassState,compassInfo,top:rect('top'),compass:rect('compass'),container:container(),ascent:rect('ascent'),pocket:nested('pocket'),help:nested('help'),trigger:nested('trigger'),legal:nested('legal')}}
    return Object.freeze({typeUnitRatio,useCompass,reconcile,rect,topCapacity,nested,pocketRelative,relative,role,surfaceRect,snapshot});
  }
  return Object.freeze({create,address});
});
