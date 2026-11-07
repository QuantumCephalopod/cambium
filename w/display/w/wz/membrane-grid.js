/* Display's UI fields use the same recursive address algebra as site fields.
 * Readable tissue supplies a fit constraint; the realized addresses, never a
 * stored pixel edge or a viewport breakpoint, supply the resulting rectangles.
 */
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
  function clone(x){return JSON.parse(JSON.stringify(x))}
  function num(v){v=Number(v);return Number.isFinite(v)?v:0}
  function box(left,top,width,height){return {left,top,width,height,right:left+width,bottom:top+height}}
  function projection(b,parent){return box(parent.left+b.x*parent.width,parent.top+b.y*parent.height,b.w*parent.width,b.h*parent.height)}
  function address(x,y,depth){
    let out='';
    for(let i=depth-1;i>=0;i--){
      const div=2**i,qx=Math.floor(x/div)%2,qy=Math.floor(y/div)%2;
      out+=qy?(qx?'z':'y'):(qx?'x':'w');
    }
    return out;
  }
  function realize(base,changes){
    const s=clone(base),splits=new Set(s.splits);
    for(const [name,cells] of Object.entries(changes)){
      if(!s.fields[name])throw new Error('unaddressed membrane field '+name);
      for(const cell of cells)for(let i=0;i<cell.length;i++)splits.add(cell.slice(0,i));
      s.fields[name].cells=cells;
    }
    s.splits=[...splits];return UI.normalizeState(s);
  }
  function topBand(base,height,headerBottom,statusBottom,statusHeight,inset,limit,quantum){
    if(height<=0)return base;
    const seed=UI.spanInfo(base,base.fields.top.cells),seedTop=seed.bounds.y*height;
    const need=Math.max(0,headerBottom-seedTop)+Math.max(0,inset);
    if(need<=0)return base;
    let depth=seed.depth,unit=height/(2**depth),scale=1;
    // The next realized split is admitted while the actual reading body fits.
    // Floating point resolution is the carrier's finite bound, not a fixed rank.
    while(unit/2>=need&&unit/2>0&&Number.isSafeInteger(2**(depth+1))){unit/=2;depth++;scale*=2}
    const withStatus=Math.max(need,statusHeight>0?Math.max(0,statusBottom-seedTop)+Math.max(0,inset):0);
    let rows=Math.min((seed.maxY-seed.minY+1)*scale,Math.ceil(need/unit));
    if(withStatus>rows*unit){
      // The same fit relation recurs for the actual status tissue. Its own
      // height, not a viewport breakpoint or a fixed rank, earns refinement.
      while(statusHeight>0&&unit/2>=statusHeight&&unit/2>0&&Number.isSafeInteger(2**(depth+1))){unit/=2;depth++;scale*=2}
      rows=Math.min((seed.maxY-seed.minY+1)*scale,Math.ceil(withStatus/unit));
      // If a real neighbouring reading field would lose its first line,
      // refine the same span further until both actual bodies fit. The
      // rendered device pixel is the carrier's finite resolution.
      while(Number.isFinite(limit)&&seedTop+rows*unit>limit&&seedTop+withStatus<limit&&unit/2>=quantum&&Number.isSafeInteger(2**(depth+1))){
        unit/=2;depth++;scale*=2;rows=Math.min((seed.maxY-seed.minY+1)*scale,Math.ceil(withStatus/unit));
      }
    }
    const cells=[],firstX=seed.minX*scale,lastX=(seed.maxX+1)*scale,firstY=seed.minY*scale;
    for(let y=firstY;y<firstY+rows;y++)for(let x=firstX;x<lastX;x++)cells.push(address(x,y,depth));
    return realize(base,{top:cells});
  }
  function triggerState(base,compass,read){
    if(!read||read.width<=0||read.height<=0)return base;
    // The authored trigger span supplies the entrance. Descend along its
    // upper-right contact while the actual input target still fits.
    const seed=UI.spanInfo(base,base.fields.trigger.cells);
    let candidate=seed.cells.find(cell=>{const c=UI.coord(cell);return c.x===seed.maxX&&c.y===seed.minY}),chosen=null;
    for(;;){
      const b=UI.bounds(candidate);
      if(b.w*compass.width+1e-6<read.width||b.h*compass.height+1e-6<read.height)break;
      chosen=candidate;
      if(!Number.isSafeInteger(2**(candidate.length+1)))break;
      candidate+='x';
    }
    return chosen?realize(base,{trigger:[chosen]}):base;
  }
  function create(membrane,navigator){
    const base=UI.normalizeState(membrane),navBase=UI.normalizeState(navigator);
    for(const name of ['top','compass'])if(!base.fields[name])throw new Error('missing membrane field '+name);
    for(const name of ['pocket','help','trigger','legal'])if(!navBase.fields[name])throw new Error('missing navigator field '+name);
    const topSeed=UI.fieldInfo(base,'top').bounds;
    if(topSeed.x!==0||topSeed.y!==0||topSeed.w!==1)throw new Error('global top field must span the upper viewport');
    let outer=base,inner=navBase,viewport=box(0,0,0,0),compassInfo=null,compassState=null,topKey='',triggerKey='',fit={top:true,trigger:true};
    function useCompass(state,field){
      if(!state||!field)return;
      const check=UI.spanInfo(state,field.cells);
      if(!check.ok)throw new Error('global compass has no realized field');
      if(compassState===state&&compassInfo?.cells.join(',')===check.cells.join(','))return;
      compassState=state;compassInfo=check;
      outer=realize(outer,{compass:check.cells});
    }
    function rect(name){
      const own=UI.fieldInfo(outer,name).bounds;
      return projection(own,viewport);
    }
    function nested(name){return projection(UI.fieldInfo(inner,name).bounds,rect('compass'))}
    function relative(name){return {...UI.fieldInfo(inner,name).bounds}}
    function compassVariant(state,carrier,chrome=0){
      const field=state?.fields?.compass;
      if(!field)return '';
      if(carrier.h>carrier.w)return 'portrait';
      if(!field.variants?.compact)return '';
      const ordinary=UI.fieldInfo(state,'compass').bounds,expanded=UI.fieldInfo(state,'compass','compact').bounds;
      const pocket=UI.fieldInfo(navBase,'pocket').bounds;
      // Choose the owner's taller addressed carrier only when the real chrome
      // leaves the map less than half the ordinary field's width. The variant
      // remains an authored recursive span and needs to provide more room.
      const mapRoom=carrier.h*ordinary.h*pocket.h-Math.max(0,num(chrome));
      return expanded.h>ordinary.h&&mapRoom<carrier.w*ordinary.w/2?'compact':'';
    }
    function reconcile(input={}){
      viewport=box(0,0,Math.max(0,num(input.width)),Math.max(0,num(input.height)));
      const h=input.headerRect,s=input.statusRect,t=input.triggerRect;
      const limit=Number.isFinite(input.limit)?input.limit:Infinity,quantum=num(input.quantum)>0?num(input.quantum):Number.EPSILON;
      const key=[viewport.height,num(h?.bottom),s&&num(s.height)>0?num(s.bottom):0,num(s?.height),num(input.inset),limit,quantum].join('|');
      if(key!==topKey){
        outer=topBand(base,viewport.height,num(h?.bottom),s&&num(s.height)>0?num(s.bottom):0,num(s?.height),num(input.inset),limit,quantum);
        if(compassInfo)outer=realize(outer,{compass:compassInfo.cells});
        topKey=key;
      }
      const c=rect('compass'),inputKey=[c.width,c.height,num(t?.width),num(t?.height)].join('|');
      if(inputKey!==triggerKey){inner=triggerState(navBase,c,t);triggerKey=inputKey}
      const top=rect('top'),trigger=nested('trigger');
      fit={top:Math.max(num(h?.bottom),s&&num(s.height)>0?num(s.bottom):0)+num(input.inset)<=top.bottom,
        trigger:!t||(num(t.width)<=trigger.width&&num(t.height)<=trigger.height)};
      return snapshot();
    }
    function surfaceRect(el,raw){
      const name=el?.getAttribute?.('data-display-ui-field');
      if(name==='top')return rect('top');
      if(name==='pocket'||name==='help'||name==='trigger'||name==='legal')return nested(name);
      if(el?.dataset?.uiBounded==='true')return raw;
      throw new Error('Display surface lacks a realized recursive UI field');
    }
    function snapshot(){
      return {outer,inner,viewport:{...viewport},compassState,compassInfo,fit:{...fit},
        top:rect('top'),compass:rect('compass'),pocket:nested('pocket'),help:nested('help'),trigger:nested('trigger'),legal:nested('legal')};
    }
    return Object.freeze({useCompass,reconcile,rect,nested,relative,compassVariant,surfaceRect,snapshot});
  }
  return Object.freeze({create,address,topBand,triggerState});
});
