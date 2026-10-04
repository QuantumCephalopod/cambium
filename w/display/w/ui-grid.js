(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SSSUIGrid=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SCHEMA='sss.display.ui-grid.v2';
  const LEGACY_SCHEMA='sss.display.ui-grid.v1';
  const ADDRESS_SYMBOLS=Object.freeze(['w','x','y','z']);
  const ADDRESS_INDEX=Object.freeze({w:0,x:1,y:2,z:3});
  const QUADRANT=Object.freeze({w:[0,0],x:[1,0],y:[0,1],z:[1,1]});
  const KINDS=new Set(['panel','text','symbol']);
  const ANCHORS=new Set(['fill','north','south','west','east','center']);
  const ID_RE=/^[A-Za-z][A-Za-z0-9_-]*$/;

  const clone=x=>JSON.parse(JSON.stringify(x));
  const rootLabel=a=>a||'ε';
  const addressOk=a=>typeof a==='string'&&/^[wxyz]*$/.test(a);
  const parentOf=a=>a?a.slice(0,-1):null;
  const childrenOf=a=>ADDRESS_SYMBOLS.map(g=>a+g);

  function compareAddress(a,b){
    if(a.length!==b.length)return a.length-b.length;
    for(let i=0;i<a.length;i++){
      const d=ADDRESS_INDEX[a[i]]-ADDRESS_INDEX[b[i]];
      if(d)return d;
    }
    return 0;
  }
  function canonicalCells(cells){return [...new Set(cells)].sort(compareAddress)}
  function spanText(cells){return canonicalCells(cells).map(rootLabel).join('+')}
  function sameCells(a,b){return spanText(a)===spanText(b)}
  function emptyState(name='layout'){return {schema:SCHEMA,meta:{name},splits:[],fields:{},elements:{}}}

  function bounds(address){
    if(!addressOk(address))throw new Error('invalid address '+address);
    let x=0,y=0,w=1,h=1;
    for(const g of address){
      const [qx,qy]=QUADRANT[g];
      w/=2;h/=2;x+=qx*w;y+=qy*h;
    }
    return {x,y,w,h};
  }
  function coord(address){
    if(!addressOk(address))throw new Error('invalid address '+address);
    let x=0,y=0;
    for(const g of address){const [qx,qy]=QUADRANT[g];x=x*2+qx;y=y*2+qy}
    return {x,y,depth:address.length};
  }
  function validateSplitSet(splits){
    const set=new Set(splits);
    if(set.size!==splits.length)throw new Error('duplicate split address');
    for(const a of splits){
      if(!addressOk(a))throw new Error('invalid split address '+a);
      if(a!==''&&!set.has(parentOf(a)))throw new Error('split '+rootLabel(a)+' has unsplit parent '+rootLabel(parentOf(a)));
    }
  }
  function leafSet(state){
    const splits=new Set(state.splits),out=[];
    function walk(a){if(splits.has(a))childrenOf(a).forEach(walk);else out.push(a)}
    walk('');return out.sort(compareAddress);
  }
  function isRealized(state,address){
    if(!addressOk(address))return false;
    if(address==='')return true;
    let p='';
    for(const g of address){if(!state.splits.includes(p))return false;p+=g}
    return true;
  }
  function isLeaf(state,address){return isRealized(state,address)&&!state.splits.includes(address)}
  function spanInfo(state,cells){
    cells=canonicalCells(cells);
    if(!cells.length)return {ok:false,reason:'empty span'};
    const depth=cells[0].length;
    if(cells.some(c=>c.length!==depth))return {ok:false,reason:'span cells must have equal rank'};
    if(cells.some(c=>!isLeaf(state,c)))return {ok:false,reason:'span cells must be current leaves'};
    const cs=cells.map(coord),xs=cs.map(c=>c.x),ys=cs.map(c=>c.y);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const want=(maxX-minX+1)*(maxY-minY+1);
    if(want!==cells.length)return {ok:false,reason:'span must be one contiguous rectangle'};
    const set=new Set(cs.map(c=>c.x+','+c.y));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(!set.has(x+','+y))return {ok:false,reason:'span has a hole'};
    const scale=2**depth;
    return {ok:true,depth,minX,minY,maxX,maxY,cells,bounds:{x:minX/scale,y:minY/scale,w:(maxX-minX+1)/scale,h:(maxY-minY+1)/scale}};
  }

  function normalizeField(id,f,state){
    if(!ID_RE.test(id))throw new Error('invalid field id '+id);
    const cells=canonicalCells(Array.isArray(f?.cells)?f.cells:[]),info=spanInfo(state,cells);
    if(!info.ok)throw new Error('field '+id+': '+info.reason);
    return {cells:info.cells,label:String(f?.label??id)};
  }
  function normalizeElement(id,e,state){
    if(!ID_RE.test(id))throw new Error('invalid element id '+id);
    let field=e?.field==null||e.field===''?null:String(e.field);
    if(field!==null&&!state.fields[field])throw new Error('element '+id+': unknown field '+field);
    let cells=field?state.fields[field].cells:canonicalCells(Array.isArray(e?.cells)?e.cells:[]);
    const info=spanInfo(state,cells);
    if(!info.ok)throw new Error('element '+id+': '+info.reason);
    return {
      kind:KINDS.has(e?.kind)?e.kind:'panel',
      field,
      cells:info.cells,
      anchor:ANCHORS.has(e?.anchor)?e.anchor:'fill',
      rank:Number.isInteger(e?.rank)?e.rank:0,
      label:String(e?.label??id)
    };
  }
  function normalizeState(input){
    const raw=clone(input||emptyState());
    if(raw.schema&&raw.schema!==SCHEMA&&raw.schema!==LEGACY_SCHEMA)throw new Error('unsupported schema '+raw.schema);
    const s={schema:SCHEMA,meta:{name:String(raw.meta?.name||'layout')},splits:canonicalCells(Array.isArray(raw.splits)?raw.splits:[]),fields:{},elements:{}};
    validateSplitSet(s.splits);
    const fieldSpans=new Map();
    for(const id of Object.keys(raw.fields||{}).sort()){
      const f=normalizeField(id,raw.fields[id],s),key=spanText(f.cells);
      if(fieldSpans.has(key))throw new Error('fields '+fieldSpans.get(key)+' and '+id+' share one span');
      fieldSpans.set(key,id);s.fields[id]=f;
    }
    for(const id of Object.keys(raw.elements||{}).sort())s.elements[id]=normalizeElement(id,raw.elements[id],s);
    return s;
  }

  function initialState(){
    return normalizeState({schema:SCHEMA,meta:{name:'site-holon-layout'},splits:['','w'],fields:{
      header:{cells:['ww','wx'],label:'HEADER'},
      body:{cells:['wy','wz'],label:'BODY'},
      signal:{cells:['x'],label:'SIGNAL'}
    },elements:{
      title:{kind:'text',field:'header',anchor:'north',rank:0,label:'SELF-SIMILAR SYSTEMS'},
      bodyPanel:{kind:'panel',field:'body',anchor:'fill',rank:-1,label:'SITE-HOLON BODY'},
      signalGlyph:{kind:'symbol',field:'signal',anchor:'center',rank:1,label:'⊛'}
    }});
  }

  function occupiedUnder(state,address){
    state=normalizeState(state);
    return Object.values(state.elements).some(e=>e.cells.some(c=>c===address||c.startsWith(address)));
  }
  function split(state,address){
    state=normalizeState(state);
    if(!isLeaf(state,address))throw new Error(rootLabel(address)+' is not a splittable leaf');
    if(occupiedUnder(state,address))throw new Error(rootLabel(address)+' is occupied; move its tissue before split');
    state.splits=canonicalCells([...state.splits,address]);return normalizeState(state);
  }
  function coalesce(state,address){
    state=normalizeState(state);
    if(!state.splits.includes(address))throw new Error(rootLabel(address)+' is not split');
    const kids=childrenOf(address);
    if(kids.some(k=>state.splits.includes(k)))throw new Error(rootLabel(address)+' has differentiated children');
    if(kids.some(k=>occupiedUnder(state,k)))throw new Error(rootLabel(address)+' has occupied children');
    if(Object.values(state.fields).some(f=>f.cells.some(c=>kids.includes(c))))throw new Error(rootLabel(address)+' has named child fields');
    state.splits=state.splits.filter(a=>a!==address);return normalizeState(state);
  }

  function defineField(state,id,cells,label=id){
    state=normalizeState(state);
    const probe={...state,fields:{...state.fields}};
    delete probe.fields[id];
    const f=normalizeField(id,{cells,label},probe),key=spanText(f.cells);
    for(const [other,of] of Object.entries(probe.fields))if(spanText(of.cells)===key)throw new Error('field span already named @'+other);
    state.fields[id]=f;
    for(const e of Object.values(state.elements))if(e.field===id)e.cells=f.cells;
    return normalizeState(state);
  }
  function removeField(state,id){
    state=normalizeState(state);
    if(!state.fields[id])throw new Error('unknown field '+id);
    for(const e of Object.values(state.elements))if(e.field===id){e.field=null;e.cells=[...state.fields[id].cells]}
    delete state.fields[id];return normalizeState(state);
  }
  function resolveSpan(state,ref){
    state=normalizeState(state);
    ref=String(ref||'').trim();
    if(ref.startsWith('@')){
      const id=ref.slice(1);if(!state.fields[id])throw new Error('unknown field '+ref);
      return {cells:[...state.fields[id].cells],field:id,ref};
    }
    const cells=canonicalCells(ref.split('+').filter(Boolean));
    const info=spanInfo(state,cells);if(!info.ok)throw new Error(info.reason);
    return {cells:info.cells,field:null,ref:spanText(info.cells)};
  }

  function place(state,id,spec){
    state=normalizeState(state);if(state.elements[id])throw new Error('element '+id+' already exists');
    let field=spec?.field==null?null:String(spec.field),cells=spec?.cells;
    if(field!==null){if(!state.fields[field])throw new Error('unknown field '+field);cells=state.fields[field].cells}
    state.elements[id]=normalizeElement(id,{...spec,field,cells},state);return normalizeState(state);
  }
  function move(state,id,target){
    state=normalizeState(state);if(!state.elements[id])throw new Error('unknown element '+id);
    const resolved=Array.isArray(target)?{cells:target,field:null}:resolveSpan(state,target);
    const info=spanInfo(state,resolved.cells);if(!info.ok)throw new Error('element '+id+': '+info.reason);
    state.elements[id].field=resolved.field;state.elements[id].cells=info.cells;return normalizeState(state);
  }
  function remove(state,id){state=normalizeState(state);if(!state.elements[id])throw new Error('unknown element '+id);delete state.elements[id];return normalizeState(state)}
  function updateElement(state,id,patch){
    state=normalizeState(state);if(!state.elements[id])throw new Error('unknown element '+id);
    const current=state.elements[id];
    let next={...current,...patch};
    if(Object.prototype.hasOwnProperty.call(patch,'field')){
      const field=patch.field==null||patch.field===''?null:String(patch.field);
      next.field=field;next.cells=field?(state.fields[field]?.cells||[]):current.cells;
    }
    state.elements[id]=normalizeElement(id,next,state);return normalizeState(state);
  }
  function formatState(state){return JSON.stringify(normalizeState(state),null,2)+'\n'}
  function parseState(text){return normalizeState(JSON.parse(text))}

  function command(state,line){
    state=normalizeState(state);const raw=String(line||'').trim();if(!raw)return {state,log:''};
    const rootAddr=s=>s==='ε'?'':s;let m;
    if((m=raw.match(/^split\s+(ε|[wxyz]+)$/i))){const a=rootAddr(m[1].toLowerCase());return {state:split(state,a),log:'split '+rootLabel(a)}}
    if((m=raw.match(/^coalesce\s+(ε|[wxyz]+)$/i))){const a=rootAddr(m[1].toLowerCase());return {state:coalesce(state,a),log:'coalesce '+rootLabel(a)}}
    if((m=raw.match(/^field\s+([A-Za-z][\w-]*)\s*=\s*([wxyz]+(?:\+[wxyz]+)*)$/))){const id=m[1],cells=m[2].split('+');return {state:defineField(state,id,cells,id),log:`field @${id} = ${spanText(cells)}`}}
    if((m=raw.match(/^unfield\s+([A-Za-z][\w-]*)$/))){return {state:removeField(state,m[1]),log:'unfield @'+m[1]}}
    if((m=raw.match(/^remove\s+([A-Za-z][\w-]*)$/))){return {state:remove(state,m[1]),log:'remove '+m[1]}}
    if((m=raw.match(/^place\s+([A-Za-z][\w-]*)\s+(@[A-Za-z][\w-]*|[wxyz]+(?:\+[wxyz]+)*)\s+(panel|text|symbol)\s+(fill|north|south|west|east|center)(?:\s+(-?\d+))?$/))){
      const id=m[1],target=resolveSpan(state,m[2]),kind=m[3],anchor=m[4],rank=m[5]===undefined?0:Number(m[5]);
      return {state:place(state,id,{kind,field:target.field,cells:target.cells,anchor,rank,label:id}),log:`place ${id} ${target.ref} ${kind} ${anchor} ${rank}`};
    }
    if((m=raw.match(/^move\s+([A-Za-z][\w-]*)\s+(@[A-Za-z][\w-]*|[wxyz]+(?:\+[wxyz]+)*)\s*->\s*(@[A-Za-z][\w-]*|[wxyz]+(?:\+[wxyz]+)*)$/))){
      const id=m[1],from=resolveSpan(state,m[2]),to=resolveSpan(state,m[3]);if(!state.elements[id])throw new Error('unknown element '+id);
      if(!sameCells(state.elements[id].cells,from.cells))throw new Error('move source does not match current '+id+' span');
      return {state:move(state,id,to.ref),log:`move ${id} ${from.ref} -> ${to.ref}`};
    }
    throw new Error('unknown command');
  }

  return Object.freeze({SCHEMA,LEGACY_SCHEMA,ADDRESS_SYMBOLS,rootLabel,parentOf,childrenOf,compareAddress,canonicalCells,spanText,sameCells,emptyState,initialState,normalizeState,bounds,coord,leafSet,isLeaf,spanInfo,defineField,removeField,resolveSpan,split,coalesce,place,move,remove,updateElement,formatState,parseState,command});
});
