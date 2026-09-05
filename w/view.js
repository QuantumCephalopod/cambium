/* The view consumes named, resolved places. Camera pose is presentation state,
 * never an address. No geometric proximity is used to merge semantic identity.
 */
(function (root) {
  'use strict';
  const A=root.CambiumAddress, N=root.CambiumNavigation;
  const norm=v=>Math.hypot(...v);
  function normalize(q){const m=norm(q);return m>1e-14?q.map(v=>v/m):[1,0,0,0];}
  function multiply(a,b){
    const [w,x,y,z]=a,[v,i,j,k]=b;
    return [w*v-x*i-y*j-z*k,w*i+x*v+y*k-z*j,w*j-x*k+y*v+z*i,w*k+x*j-y*i+z*v];
  }
  function axisQuaternion(axis,angle){const s=Math.sin(angle/2);return [Math.cos(angle/2),...axis.map(v=>v*s)];}
  function rotateVector(q,p){const r=multiply(multiply(q,[0,...p]),[q[0],-q[1],-q[2],-q[3]]);return r.slice(1);}
  function between(a,b){
    const dot=Math.max(-1,Math.min(1,a.reduce((v,n,i)=>v+n*b[i],0)));
    let cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    if(dot < -1+1e-9){
      const h=Math.abs(a[0])<.8?[1,0,0]:[0,1,0];
      cross=[a[1]*h[2]-a[2]*h[1],a[2]*h[0]-a[0]*h[2],a[0]*h[1]-a[1]*h[0]];
      return normalize([0,...cross]);
    }
    return normalize([1+dot,...cross]);
  }
  function ball(x,y){const d=x*x+y*y;return d<=1?[x,y,Math.sqrt(1-d)]:[x/Math.sqrt(d),y/Math.sqrt(d),0];}
  const INITIAL=normalize(multiply(axisQuaternion([1,0,0],.17),axisQuaternion([0,1,0],.28)));
  const math=Object.freeze({normalize,multiply,axisQuaternion,rotateVector,between,ball,initial:()=>[...INITIAL]});
  if(typeof module==='object'&&module.exports){module.exports=math;return;}
  const $=id=>document.getElementById(id);
  function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
  function svg(tag,attrs={}){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;}
  function link(p,text,cls,label){
    const a=el('a',cls,text);a.href=N.url('site',p);a.dataset.path=p;a.dataset.locus=A.key(p);
    if(label){a.setAttribute('aria-label',label);a.title=label;a.dataset.hint=label;}return a;
  }
  function breadcrumbs(s,index){
    const box=$('address-trails'),registry=N.registry(index);box.replaceChildren();
    const home=link('',registry.nodes.get('').name,'home-crumb','return to cambium');
    if(!s.path)home.setAttribute('aria-current','page');box.append(home);
    if(!s.path)return;
    const group=el('div','trails-group');box.append(group);
    for(const[i,trail]of N.trails(s,index).entries()){
      if(i){const sep=el('span','trail-separator','|');sep.setAttribute('aria-hidden','true');group.append(sep);}
      const ol=el('ol','trail'+(trail.active?' active-trail':''));ol.dataset.witness=trail.path;
      ol.setAttribute('aria-label','approach through '+N.namePath(trail.path,index));
      for(const step of trail.steps){
        const li=el('li','crumb-step'),a=link(step.path,step.label,'crumb',N.namePath(step.path,index));
        if(step.current)a.setAttribute('aria-current','page');li.append(a);ol.append(li);
      }
      group.append(ol);
    }
  }
  function choices(s,index){
    const host=$('next-places');host.replaceChildren();
    host.hidden=!s.children.length;host.setAttribute('aria-label','within '+s.node.name);
    const seen=new Set();
    for(const child of s.children){
      const p=child.path;if(seen.has(p))continue;seen.add(p);
      const a=link(p,child.name,'next-place',N.namePath(p,index));host.append(a);
    }
    if(!host.childElementCount)host.hidden=true;
  }
  function headline(lines){
    const h=$('page-title');h.replaceChildren();
    const first=el('span','title-main');first.append(document.createTextNode(lines[0]),el('br'),document.createTextNode(lines[1]),el('span','dash','—'));
    const last=el('em','title-answer');last.append(document.createTextNode(lines[2]),el('br'),document.createTextNode(lines[3]));h.append(first,last);
  }
  function content(s,data){
    document.body.dataset.path=s.path;document.body.dataset.locus=s.locus;
    $('source-block').hidden=true;$('page-title').className=s.path?'organ-title':'';
    if(!s.path){
      headline(data.copy.headline);$('eyebrow-text').textContent=data.copy.eyebrow;$('main-description').textContent='';
      $('practice-label').textContent=data.copy.practice_label;$('practice-copy').textContent=data.copy.practice;
    }else{
      const c=data.copy.organs[s.path];
      $('page-title').textContent=c.title;$('eyebrow-text').textContent=s.node.name;
      $('main-description').textContent=c.lead;$('practice-label').textContent='within '+s.node.name;$('practice-copy').textContent=c.detail;
      const files=$('source-files');files.replaceChildren();
      for(const carrier of Object.values(s.node.tissue||{})){
        const li=el('li'),a=el('a','source-link',carrier);a.href=carrier;li.append(a);files.append(li);
      }
      $('source-block').hidden=!files.childElementCount;
    }
    $('main-description').hidden=!$('main-description').textContent;
    document.title=(s.path?s.node.name:data.copy.brand)+' · cambium';
  }
  const V=[[0,Math.sqrt(2/3),0],[-.5,0,-Math.sqrt(3)/6],[.5,0,-Math.sqrt(3)/6],[0,0,Math.sqrt(3)/3]];
  const EDGES=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
  let pose=[...INITIAL],scene=null;
  const xyz=b=>b.reduce((r,n,i)=>r.map((v,j)=>v+n*V[i][j]),[0,0,0]);
  function geometry(s,data){
    const host=$('geometry'),registry=N.registry(data.index);host.replaceChildren();
    const canvas=svg('svg',{viewBox:'0 0 560 500',class:'geometry',role:'group','aria-label':'named places in '+s.node.name});
    canvas.append(svg('circle',{cx:280,cy:242,r:212,class:'map-field','aria-hidden':'true'}));
    let frames=s.children.length?[s.path]:[...new Set(s.aliases.map(p=>registry.nodes.get(p).parent??''))];
    frames=frames.filter(p=>registry.nodes.get(p)?.children.length).sort(A.compare);if(!frames.length)frames=[''];
    const deep=frames.some(p=>p.length>0),power=deep?Math.max(...frames.map(p=>p.length)):0;
    const point=p=>xyz(deep?A.relative(p,s.path,power):A.barycentric(p).map(v=>v-.25));
    const candidates=new Map();
    for(const f of frames)for(const p of registry.nodes.get(f).children){
      const k=A.key(p);
      if(!candidates.has(k)||p===s.path)candidates.set(k,{path:p,pos:point(p)});
    }
    const maxRadius=Math.max(.001,...[...candidates.values()].map(v=>norm(v.pos)));
    scene={canvas,segments:[],nodes:[],scale:174/maxRadius,center:[280,242],current:s.locus};
    const addFrame=(paths,cls)=>{
      const group=svg('g',{class:cls,'aria-hidden':'true'});canvas.append(group);const pts=paths.map(point);
      for(const[i,j]of EDGES){const line=svg('line');group.append(line);scene.segments.push({line,a:pts[i],b:pts[j]});}
    };
    // Unlabelled weave is a visual study, not extra indexed destinations.
    if(!deep){let prefixes=[''];for(let d=0;d<3;d++)prefixes=prefixes.flatMap(p=>A.GENES.map(g=>p+g));
      for(const f of prefixes)addFrame(A.GENES.map(g=>f+g),'map-mesh');}
    for(const f of frames)addFrame(registry.nodes.get(f).children,'map-frame'+(f!==s.node.parent&&frames.length>1?' other-frame':''));
    for(const[k,item]of candidates){
      const p=item.path,name=registry.nodes.get(p).name;
      const anchor=svg('a',{href:N.url('site',p),'data-path':p,'data-locus':k,tabindex:'0',class:'map-node'+(k===s.locus?' current-node':''),'aria-label':'open '+name,'data-hint':N.namePath(p,data.index)});
      const title=svg('title');title.textContent=N.namePath(p,data.index);anchor.append(title);
      const leader=svg('line',{class:'label-leader'}),hit=svg('rect',{class:'node-target',rx:5}),dot=svg('circle',{r:k===s.locus?7:4.5,class:'node-dot'}),text=svg('text',{class:'node-label'});
      text.textContent=name;anchor.append(leader,hit,dot,text);canvas.append(anchor);
      scene.nodes.push({...item,key:k,anchor,leader,hit,dot,text});
    }
    if(deep){const ring=svg('circle',{cx:280,cy:242,r:13,class:'focus-ring','data-focus-locus':s.locus});canvas.append(ring);}
    host.append(canvas);
    $('map-context').textContent='within '+frames.map(p=>registry.nodes.get(p).name).join(' · ');
    $('map-figure').hidden=false;paint();
  }
  function project(p){const v=rotateVector(pose,p);return [scene.center[0]+v[0]*scene.scale,scene.center[1]-v[1]*scene.scale,v[2]];}
  function overlap(a,b){return Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));}
  function paint(){
    if(!scene)return;
    for(const s of scene.segments){const a=project(s.a),b=project(s.b);for(const[k,v]of Object.entries({x1:a[0],y1:a[1],x2:b[0],y2:b[1]}))s.line.setAttribute(k,v);}
    const placed=[];
    // Stable order prevents label jitter; collision handling never affects addresses.
    for(const n of scene.nodes){
      const[x,y]=project(n.pos);n.dot.setAttribute('cx',x);n.dot.setAttribute('cy',y);
      const size=parseFloat(getComputedStyle(n.text).fontSize)||17;
      const width=n.text.getComputedTextLength()||n.text.textContent.length*size*.62;
      const ratio=scene.canvas.getBoundingClientRect().width/560||1,minH=44/ratio;
      const h=Math.max(size+12,minH)+4,spacing=Math.max(32,h+2);
      const desiredX=x<280?x-width-17:x+17;
      const left=Math.max(12,Math.min(548-width,desiredX));const desiredY=y<242?y-18:y+30;
      let best=null,bestScore=Infinity;
      for(const step of [0,-1,1,-2,2,-3,3,-4,4]){
        const delta=step*spacing;
        const baseline=Math.max(h/2+size/2+8,Math.min(492-h/2+size/2,desiredY+delta));
        const r={x:left-9,y:baseline-size/2-h/2,w:width+18,h};
        const score=placed.reduce((s,b)=>s+overlap(r,b)*200,0)+Math.abs(delta);
        if(score<bestScore){best={...r,baseline};bestScore=score;}
      }
      placed.push(best);n.text.setAttribute('x',left);n.text.setAttribute('y',best.baseline);
      const near=Math.max(left,Math.min(left+width,x));
      for(const[k,v]of Object.entries({x1:x,y1:y,x2:near,y2:best.baseline-5}))n.leader.setAttribute(k,v);
      // Every labelled destination has a target at least 44 CSS pixels high.
      const rect={x:left-7,y:best.baseline-size/2-minH/2,w:width+14,h:minH};
      for(const[k,v]of Object.entries({x:rect.x,y:rect.y,width:rect.w,height:rect.h}))n.hit.setAttribute(k,v);
    }
  }
  function render(s,data){breadcrumbs(s,data.index);choices(s,data.index);content(s,data);geometry(s,data);$('place-navigation').hidden=false;$('error-message').hidden=true;}
  function error(message){const e=$('error-message');e.replaceChildren(document.createTextNode(message+'. '),link('','return to cambium','', 'return to cambium'));e.hidden=false;}
  function highlight(locus){document.querySelectorAll('[data-locus]').forEach(n=>n.classList.toggle('is-highlighted',!!locus&&n.dataset.locus===locus));}
  root.CambiumView=Object.freeze({render,error,highlight,repaint:paint,getPose:()=>[...pose],
    rotate(axis,angle){pose=normalize(multiply(axisQuaternion(axis,angle),pose));paint();},
    orbit(start,current,initial){pose=normalize(multiply(between(start,current),initial));paint();},
    ball,reset(){pose=[...INITIAL];paint();}});
})(globalThis);
