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

  function canonicalCells(cells){
    return [...new Set(cells)].sort(compareAddress);
  }

  function emptyState(){
    return {schema:SCHEMA,meta:{name:'layout'},splits:[],fields:{},elements:{}};
  }

  function initialState(){
    return normalizeState({
      schema:SCHEMA,
      meta:{name:'specimen'},
      splits:['','w'],
      fields:{},
      elements:{
        title:{kind:'text',cells:['ww','wx'],anchor:'north',rank:0,label:'SELF-SIMILAR SYSTEMS'},
        body:{kind:'panel',cells:['wy','wz'],anchor:'fill',rank:-1,label:'SITE-HOLON BODY'},
        signal:{kind:'symbol',cells:['x'],anchor:'center',rank:1,label:'⊛'}
      }
    });
  }

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
    for(const g of address){
      const [qx,qy]=QUADRANT[g];
      x=x*2+qx;y=y*2+qy;
    }
    return {x,y,depth:address.length};
  }

  function leafSet(state){
    const splits=new Set(state.splits),out=[];
    function walk(a){
      if(splits.has(a))childrenOf(a).forEach(walk);
      else out.push(a);
    }
    walk('');
    return out.sort(compareAddress);
  }

  function isRealized(state,address){
    if(!addressOk(address))return false;
    if(address==='')return true;
    let p='';
    for(const g of address){
      if(!state.splits.includes(p))return false;
      p+=g;
    }
    return true;
  }

  function isLeaf(state,address){
    return isRealized(state,address)&&!state.splits.includes(address);
  }

  function occupiedUnder(state,address){
    const inCells=cells=>(cells||[]).some(c=>c===address||c.startsWith(address));
    return Object.values(state.fields||{}).some(f=>inCells(f.cells))
      ||Object.values(state.elements||{}).some(e=>inCells(e.cells));
  }

  function validateSplitSet(splits){
    const set=new Set(splits);
    if(set.size!==splits.length)throw new Error('duplicate split address');
    for(const a of splits){
      if(!addressOk(a))throw new Error('invalid split address '+a);
      if(a!==''&&!set.has(parentOf(a)))throw new Error('split '+rootLabel(a)+' has unsplit parent '+rootLabel(parentOf(a)));
    }
  }

  function spanInfo(state,cells){
    cells=canonicalCells(cells);
    if(!cells.length)return {ok:false,reason:'empty span'};
    const depth=cells[0].length;
    if(cells.some(c=>c.length!==depth))return {ok:false,reason:'span cells must have equal rank'};
    if(cells.some(c=>!isLeaf(state,c)))return {ok:false,reason:'span cells must be current leaves'};
    const coords=cells.map(coord);
    const xs=coords.map(c=>c.x),ys=coords.map(c=>c.y);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    if((maxX-minX+1)*(maxY-minY+1)!==cells.length)return {ok:false,reason:'span must be one contiguous rectangle'};
    const set=new Set(coords.map(c=>c.x+','+c.y));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(!set.has(x+','+y))return {ok:false,reason:'span has a hole'};
    const scale=2**depth;
    return {ok:true,depth,minX,minY,maxX,maxY,cells,bounds:{x:minX/scale,y:minY/scale,w:(maxX-minX+1)/scale,h:(maxY-minY+1)/scale}};
  }

  function normalizeField(id,f,state){
    if(!/^[A-Za-z][A-Za-z0-9_-]*$/.test(id))throw new Error('invalid field id '+id);
    const out={cells:canonicalCells(Array.isArray(f?.cells)?f.cells:[]),label:String(f?.label??id)};
    const info=spanInfo(state,out.cells);
    if(!info.ok)throw new Error('field '+id+': '+info.reason);
    out.cells=info.cells;
    return out;
  }

  function normalizeElement(id,e,state,fields){
    if(!/^[A-Za-z][A-Za-z0-9_-]*$/.test(id))throw new Error('invalid element id '+id);
    const field=typeof e?.field==='string'&&e.field?e.field:null;
    if(field&&!fields[field])throw new Error('element '+id+': unknown field '+field);
    const cells=field?[...fields[field].cells]:canonicalCells(Array.isArray(e?.cells)?e.cells:[]);
    const info=spanInfo(state,cells);
    if(!info.ok)throw new Error('element '+id+': '+info.reason);
    const out={
      kind:KINDS.has(e?.kind)?e.kind:'panel',
      cells:info.cells,
      anchor:ANCHORS.has(e?.anchor)?e.anchor:'fill',
      rank:Number.isInteger(e?.rank)?e.rank:0,
      label:String(e?.label??id)
    };
    if(field)out.field=field;
    return out;
  }

  function normalizeState(input){
    const raw=clone(input||emptyState());
    const schema=raw.schema||SCHEMA;
    if(schema!==SCHEMA&&schema!==LEGACY_SCHEMA)throw new Error('unsupported UI-grid schema '+schema);
    const s={
      schema:SCHEMA,
      meta:{name:String(raw.meta?.name||'layout')},
      splits:canonicalCells(Array.isArray(raw.splits)?raw.splits:[]),
      fields:{},
      elements:{}
    };
    validateSplitSet(s.splits);
    const base={schema:SCHEMA,meta:s.meta,splits:s.splits,fields:{},elements:{}};
    const spans=new Map();
    for(const id of Object.keys(raw.fields||{}).sort()){
      const f=normalizeField(id,raw.fields[id],base),key=spanText(f.cells);
      if(spans.has(key))throw new Error('duplicate field span '+id+' / '+spans.get(key));
      spans.set(key,id);
      s.fields[id]=f;
    }
    for(const id of Object.keys(raw.elements||{}).sort()){
      s.elements[id]=normalizeElement(id,raw.elements[id],base,s.fields);
    }
    return s;
  }

  function split(state,address){
    state=normalizeState(state);
    if(!isLeaf(state,address))throw new Error(rootLabel(address)+' is not a splittable leaf');
    if(occupiedUnder(state,address))throw new Error(rootLabel(address)+' is occupied; move its tissue before split');
    state.splits=canonicalCells([...state.splits,address]);
    return normalizeState(state);
  }

  function coalesce(state,address){
    state=normalizeState(state);
    if(!state.splits.includes(address))throw new Error(rootLabel(address)+' is not split');
    const kids=childrenOf(address);
    if(kids.some(k=>state.splits.includes(k)))throw new Error(rootLabel(address)+' has differentiated children');
    if(kids.some(k=>occupiedUnder(state,k)))throw new Error(rootLabel(address)+' has occupied children');
    state.splits=state.splits.filter(a=>a!==address);
    return normalizeState(state);
  }

  function defineField(state,id,cells,label=id){
    state=normalizeState(state);
    const info=spanInfo(state,cells);
    if(!info.ok)throw new Error('field '+id+': '+info.reason);
    const key=spanText(info.cells);
    for(const [other,f] of Object.entries(state.fields)){
      if(other!==id&&spanText(f.cells)===key)throw new Error('field '+id+': span already @'+other);
    }
    state.fields[id]={cells:info.cells,label:String(label??id)};
    for(const e of Object.values(state.elements)){
      if(e.field===id)e.cells=[...info.cells];
    }
    return normalizeState(state);
  }

  function removeField(state,id){
    state=normalizeState(state);
    const f=state.fields[id];
    if(!f)throw new Error('unknown field '+id);
    for(const e of Object.values(state.elements)){
      if(e.field===id){delete e.field;e.cells=[...f.cells]}
    }
    delete state.fields[id];
    return normalizeState(state);
  }

  function refineField(state,id){
    state=normalizeState(state);
    const f=state.fields[id];
    if(!f)throw new Error('unknown field '+id);
    const kids=[];
    for(const c of f.cells){
      if(!isLeaf(state,c))throw new Error(c+' is not a current leaf');
      const blockedByField=Object.entries(state.fields).some(([other,v])=>other!==id&&(v.cells||[]).includes(c));
      const blockedByElement=Object.values(state.elements).some(e=>e.field!==id&&(e.cells||[]).includes(c));
      if(blockedByField||blockedByElement)throw new Error(c+' has independently bound tissue');
      state.splits.push(c);
      kids.push(...childrenOf(c));
    }
    state.splits=canonicalCells(state.splits);
    state.fields[id].cells=canonicalCells(kids);
    for(const e of Object.values(state.elements)){
      if(e.field===id)e.cells=[...state.fields[id].cells];
    }
    return normalizeState(state);
  }

  function fieldInfo(state,id){
    state=normalizeState(state);
    const f=state.fields[id];
    if(!f)throw new Error('unknown field '+id);
    return {...spanInfo(state,f.cells),id,label:f.label};
  }

  function place(state,id,spec){
    state=normalizeState(state);
    if(state.elements[id])throw new Error('element '+id+' already exists');
    state.elements[id]=normalizeElement(id,spec,state,state.fields);
    return normalizeState(state);
  }

  function move(state,id,cells){
    state=normalizeState(state);
    if(!state.elements[id])throw new Error('unknown element '+id);
    const info=spanInfo(state,cells);
    if(!info.ok)throw new Error('element '+id+': '+info.reason);
    delete state.elements[id].field;
    state.elements[id].cells=info.cells;
    return normalizeState(state);
  }

  function bindElement(state,id,field){
    state=normalizeState(state);
    if(!state.elements[id])throw new Error('unknown element '+id);
    if(!state.fields[field])throw new Error('unknown field '+field);
    state.elements[id].field=field;
    state.elements[id].cells=[...state.fields[field].cells];
    return normalizeState(state);
  }

  function remove(state,id){
    state=normalizeState(state);
    if(!state.elements[id])throw new Error('unknown element '+id);
    delete state.elements[id];
    return normalizeState(state);
  }

  function updateElement(state,id,patch){
    state=normalizeState(state);
    if(!state.elements[id])throw new Error('unknown element '+id);
    state.elements[id]=normalizeElement(id,{...state.elements[id],...patch},state,state.fields);
    return normalizeState(state);
  }

  function spanText(cells){
    return canonicalCells(cells).map(rootLabel).join('+');
  }

  function formatState(state){
    return JSON.stringify(normalizeState(state),null,2)+'\n';
  }

  function parseState(text){
    return normalizeState(JSON.parse(text));
  }

  function command(state,line){
    state=normalizeState(state);
    const raw=String(line||'').trim();
    if(!raw)return {state,log:''};
    const rootAddr=s=>s==='ε'?'':s;
    let m;
    if((m=raw.match(/^split\s+(ε|[wxyz]+)$/i))){
      const a=rootAddr(m[1].toLowerCase());
      return {state:split(state,a),log:'split '+rootLabel(a)};
    }
    if((m=raw.match(/^coalesce\s+(ε|[wxyz]+)$/i))){
      const a=rootAddr(m[1].toLowerCase());
      return {state:coalesce(state,a),log:'coalesce '+rootLabel(a)};
    }
    if((m=raw.match(/^remove\s+([A-Za-z][\w-]*)$/))){
      return {state:remove(state,m[1]),log:'remove '+m[1]};
    }
    if((m=raw.match(/^place\s+([A-Za-z][\w-]*)\s+([wxyz]+(?:\+[wxyz]+)*)\s+(panel|text|symbol)\s+(fill|north|south|west|east|center)(?:\s+(-?\d+))?$/))){
      const id=m[1],cells=m[2].split('+'),kind=m[3],anchor=m[4],rank=m[5]===undefined?0:Number(m[5]);
      return {state:place(state,id,{kind,cells,anchor,rank,label:id}),log:`place ${id} ${spanText(cells)} ${kind} ${anchor} ${rank}`};
    }
    if((m=raw.match(/^move\s+([A-Za-z][\w-]*)\s+([wxyz]+(?:\+[wxyz]+)*)\s*->\s*([wxyz]+(?:\+[wxyz]+)*)$/))){
      const id=m[1],from=canonicalCells(m[2].split('+')),to=canonicalCells(m[3].split('+'));
      if(!state.elements[id])throw new Error('unknown element '+id);
      if(spanText(state.elements[id].cells)!==spanText(from))throw new Error('move source does not match current '+id+' span');
      return {state:move(state,id,to),log:`move ${id} ${spanText(from)} -> ${spanText(to)}`};
    }
    throw new Error('unknown command');
  }

  return Object.freeze({
    SCHEMA,LEGACY_SCHEMA,ADDRESS_SYMBOLS,rootLabel,parentOf,childrenOf,compareAddress,canonicalCells,
    emptyState,initialState,normalizeState,bounds,coord,leafSet,isLeaf,spanInfo,fieldInfo,
    split,coalesce,defineField,removeField,refineField,place,move,bindElement,remove,updateElement,
    spanText,formatState,parseState,command
  });
});
