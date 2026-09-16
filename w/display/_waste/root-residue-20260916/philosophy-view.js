/* Philosophy encounter layer.
 * The tetrahedron is the invariant navigational object; language changes expression,
 * never semantic address. The lateral 4-step surface names one locus four ways:
 * address -> CCCC -> concept -> question.
 */
(function(root){
  'use strict';
  const A=root.CambiumAddress, N=root.CambiumNavigation;
  const $=id=>document.getElementById(id);
  const GENES={w:'CREATE',x:'COPY',z:'CONTROL',y:'CULTIVATE'};
  let language='de';

  function currentExpression(data,path){
    if(!path){
      return data.encounter?.expressions?.[language] || data.encounter?.expressions?.[data.encounter?.default_language] || {};
    }
    const page=data.pages?.[path];
    return page?.expressions?.[language] || page?.expressions?.[data.encounter?.default_language] || {};
  }

  function concept(data,path){
    if(!path)return currentExpression(data,'').title || data.index.name;
    return currentExpression(data,path).concept || N.registry(data.index).nodes.get(path)?.name || path;
  }

  function question(data,path){
    return currentExpression(data,path).question || '';
  }

  function frame(state,data){
    const registry=N.registry(data.index);
    const base=state.children.length ? state.path : (state.node.parent || '');
    const node=registry.nodes.get(base);
    return {base,node,children:(node?.children||[]).map(path=>registry.nodes.get(path)).filter(Boolean)};
  }

  function cell(cls,text){
    const n=document.createElement('span');
    n.className='lateral-cell '+cls;
    n.textContent=text;
    return n;
  }

  function lateral(state,data){
    const host=$('lateral-grid');
    if(!host)return;
    host.replaceChildren();
    const f=frame(state,data);
    for(const node of f.children){
      const gene=node.path.at(-1);
      const row=document.createElement('a');
      row.className='lateral-row'+(state.path===node.path?' is-current':'');
      row.href=N.url('site',node.path);
      row.dataset.path=node.path;
      row.dataset.locus=node.locus;
      row.dataset.hint=(language==='de'?'öffne ':'open ')+concept(data,node.path);
      if(state.path===node.path)row.setAttribute('aria-current','page');
      const address=A.display(node.path)||node.path;
      const q=question(data,node.path);
      row.append(
        cell('lateral-address',address),
        cell('lateral-gene',GENES[gene]||gene),
        cell('lateral-concept',concept(data,node.path)),
        cell('lateral-question',q)
      );
      const arrow=document.createElement('span');
      arrow.className='lateral-arrow';
      arrow.setAttribute('aria-hidden','true');
      arrow.textContent='↗';
      row.querySelector('.lateral-question').append(arrow);
      host.append(row);
    }
    const title=$('lateral-title');
    if(title)title.textContent=language==='de'
      ?'Adresse → CCCC → Begriff → Frage'
      :'address → CCCC → concept → question';
    const label=document.querySelector('.lateral-heading .section-label');
    if(label)label.textContent=language==='de'
      ?'derselbe ort · vier auflösungen'
      :'same locus · four resolutions';
  }

  function relabel(state,data){
    document.querySelectorAll('.map-node[data-path]').forEach(anchor=>{
      const path=anchor.dataset.path;
      const name=concept(data,path);
      const label=anchor.querySelector('.node-label');
      const title=anchor.querySelector('title');
      if(label)label.textContent=name;
      if(title)title.textContent=name;
      anchor.setAttribute('aria-label',(language==='de'?'öffne ':'open ')+name);
      anchor.dataset.hint=name;
    });
    document.querySelectorAll('.next-place[data-path],.crumb[data-path]').forEach(link=>{
      const path=link.dataset.path;
      const name=concept(data,path);
      link.textContent=name;
      link.dataset.hint=name;
      link.title=name;
    });
    const home=document.querySelector('.home-crumb');
    if(home){
      const rootName=concept(data,'');
      home.textContent=rootName;
      home.dataset.hint=rootName;
      home.title=rootName;
    }
    const f=frame(state,data);
    const context=$('map-context');
    if(context){
      const names=f.base ? [concept(data,f.base)] : [concept(data,'')];
      context.textContent=(language==='de'?'in ':'within ')+names.join(' · ');
    }
    const tools=document.querySelector('.map-tools > span');
    if(tools)tools.textContent=language==='de'
      ?'drehe das ganze, dann betrete einen ort'
      :'turn the whole, then enter a locus';
    const action=document.querySelector('.map-action-hint');
    if(action)action.textContent=language==='de'?'ziehen zum drehen':'drag to turn';

    const rootExp=currentExpression(data,'');
    if(!state.path){
      const description=$('main-description');
      if(description)description.textContent=rootExp.mission||'';
      const practice=$('practice-copy');
      if(practice)practice.textContent=rootExp.position||'';
    }else{
      const exp=currentExpression(data,state.path);
      const practice=$('practice-copy');
      if(practice && Array.isArray(exp.body))practice.textContent=exp.body.join('\n\n');
    }

    const title=state.path?concept(data,state.path):rootExp.title;
    document.title=(title||data.copy?.brand||'self-similar-systems saar')+' · self-similar-systems saar';
    document.documentElement.lang=language;
    document.body.dataset.language=language;
  }

  function research(state){
    const section=$('research-field');
    if(!section)return;
    if(state.path==='y' && root.PapersDisplay){
      root.PapersDisplay.render();
    }else{
      section.hidden=true;
    }
  }

  function render(state,data){
    lateral(state,data);
    relabel(state,data);
    research(state);
    document.querySelectorAll('[data-language]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.language===language));
    });
  }

  function setLanguage(data,next){
    if(!data?.translations?.[next])return false;
    language=next;
    data.copy=data.translations[next];
    document.documentElement.lang=next;
    return true;
  }

  root.PhilosophyDisplay=Object.freeze({
    render,
    setLanguage,
    getLanguage:()=>language
  });
})(globalThis);
