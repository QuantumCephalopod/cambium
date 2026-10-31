'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const body=path.dirname(__dirname),manifest=JSON.parse(fs.readFileSync(path.join(body,'site.json'))),projection=JSON.parse(fs.readFileSync(path.join(body,manifest.projection),'utf8'));
const privacy=Boolean(projection.controller),route=privacy?'privacy':'impressum',name=privacy?'datenschutz':'impressum',id='organism:'+name;
const grid=JSON.parse(fs.readFileSync(path.join(body,manifest.ui_grid),'utf8'));assert.equal(grid.meta.extent,'bounded');for(const role of ['compass','header'])assert(!(role in grid.fields),'global '+role+' inherits Display geometry');for(const role of ['description','controls','viewport'])assert(role in grid.fields);
const nodes=[],events=new Map(),world={language:'en',easeTo:q=>assert.deepEqual(Array.from(q),[1,0,0,0])};let released=0,admitted=[];
function node(tag){const n={tag,children:[],attrs:{},style:{},listeners:{},append(...xs){this.children.push(...xs)},replaceChildren(...xs){this.children=xs},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,fn){this.listeners[k]=fn}};nodes.push(n);return n}
const document={body:node('body'),getElementById:id=>nodes.find(n=>n.id===id),createElement:node,createTextNode:text=>({tag:'#text',textContent:text})};
const Surface={prepare:async dependency=>{assert.equal(dependency('fixture','member'),'fixture/member');return {}},create:({blocks})=>{admitted.push(blocks);return {release(){released++}}}};
const context={document,SSSTetraText:Surface,SSSWorldView:world,addEventListener(k,fn){const list=events.get(k)||[];list.push(fn);events.set(k,list)}};
vm.runInNewContext(fs.readFileSync(path.join(body,manifest.renderer),'utf8'),context);
const renderer=context.SSSInterlocutorModules.get(id),host=node('host'),content=node('content'),ui={bind(n,field){n.field=field}};
assert.equal(renderer.id,id);assert.equal(renderer.render({host,content,projection,language:'de',ui}),false,'unprepared source cannot appear as ready');
const descendants=n=>[n,...(n.children||[]).flatMap(descendants)];
(async()=>{
 await renderer.prepareFieldProjection(projection,{dependency:(id,member)=>id+'/'+member});
 const footer=document.getElementById(privacy?'legal-link-privacy':'legal-link-impressum');
 for(const language of ['en','de','en']){
  world.language=language;for(const fn of events.get('sss:language'))fn();const href='/'+route+'/'+(language==='en'?'en/':'');
  assert.equal(footer.href,href);assert.equal(footer.textContent,projection.title[language]);assert.equal(footer.hreflang,language);
  assert.equal(renderer.render({host,content,projection,language,ui}),true);assert.equal(host.hidden,false);
  const all=descendants(content),heading=content.children[0];assert.equal(heading.lang,language);assert.equal(heading.field,'description');assert.equal(heading.children[0].textContent,projection.title[language]);
  assert(all.some(n=>n.tag==='a'&&n.href===href));assert(all.some(n=>n.tag==='a'&&n.href==='mailto:'+projection.contact.email));assert.equal(renderer.fieldProjection(projection).root[language],projection.title[language]);
  assert.equal(renderer.shader.view.projection,'orthographic');assert.deepEqual(Array.from(renderer.shader.view.rest),[1,0,0,0]);
  assert.equal(admitted.at(-1),projection.notices[language],'actual full approved source is handed to neutral material');
  const article=all.find(n=>n.tag==='article');assert.equal(article.children.flatMap(n=>n.tag==='ul'?n.children:[n]).length,projection.notices[language].length);assert.equal(article.attrs['data-type-fold'],'off');
  const sections=all.find(n=>n.tag==='select');assert.equal(sections.children.length,privacy?16:4);assert.equal(sections.attrs['aria-label'],language==='de'?'Abschnitt':'Section');
  all.find(n=>n.tag==='button').listeners.click();
 }
 renderer.unmount({host,content});assert(host.hidden);assert.equal(content.children.length,0);assert.equal(released,3,'every retired material releases its context resources');
const read=lang=>fs.readFileSync(path.join(body,path.dirname(manifest.projection),'public',route,lang==='en'?'en/index.html':'index.html'),'utf8');
const de=read('de'),en=read('en');
for(const [lang,s] of [['de',de],['en',en]]){
 assert(!/font(?:-size)?\s*:[^;}]*?(?:\d+(?:\.\d+)?(?:px|rem)|clamp\()/i.test(s),'static notice typography stays on the shared rank lattice');
 assert(s.includes('<html lang="'+lang+'">'));assert(s.includes('href="/?lang='+lang+'"'));
 assert(s.includes('href="/'+route+'/" lang="de" hreflang="de"'));assert(s.includes('href="/'+route+'/en/" lang="en" hreflang="en"'));
 assert(!/<script\b/i.test(s),'static notice and language switch need no scripts');
 const legal=s.match(/<nav class="legal-nav"[^>]*>(.*?)<\/nav>/s)[1];
 for(const r of ['impressum','privacy'])assert(legal.includes('href="/'+r+'/'+(lang==='en'?'en/':'')+'"'));
}
const structure=s=>Array.from(s.matchAll(/<(h1|h2|h3|p|ul|li|address)(?:\s[^>]*)?>/g),m=>m[1]);
assert.deepEqual(structure(en),structure(de),'translation retains every heading, paragraph and list item in source order');
const refs=s=>Array.from(s.matchAll(/href="((?:https:|mailto:)[^"]+)"/g),m=>m[1]);
assert.deepEqual(refs(en),refs(de),'translation retains ordered external references and contacts');
if(privacy){
 assert.equal((en.match(/<h2>/g)||[]).length,15);
 // Check the notice dates, not the older event dates in its historical section.
 const deDates=Array.from(de.matchAll(/<p class="meta">Stand: (\d{2})\.(\d{2})\.(\d{4})<\/p>/g),m=>m.slice(1));
 const enDates=Array.from(en.matchAll(/<p class="meta">As of: ([^<]+)<\/p>/g),m=>m[1]);
 assert.equal(deDates.length,2);assert.deepEqual(deDates[0],deDates[1]);
 const [day,month,year]=deDates[0],months=['January','February','March','April','May','June','July','August','September','October','November','December'];
 const translatedDate=Number(day)+' '+months[Number(month)-1]+' '+year;
 assert.deepEqual(enDates,[translatedDate,translatedDate],'both English notice dates follow the German source');
 // The merged publication source and projection now record completed provider cleanup.
 assert(projection.draft.status.includes('provider-gc-closed-described'));
 assert(de.includes('GitHub Support hat das zugehörige Ticket geschlossen.'));
 assert(en.includes('GitHub Support has closed the corresponding ticket.'));
 assert(!de.includes('Bis GitHub diese Bereinigung bestätigt'));
 assert(!en.includes('Until GitHub confirms this cleanup'));
 assert(en.includes('Independent copies or clones made by third parties'));
 assert(en.includes('no fixed calendar-based deletion period'));
}
console.log('PASS — '+id+' mounted/footer switching, complete static languages and contact/reference continuity');

for(const lang of ['de','en']){
 const s=read(lang),authored=s.slice(s.indexOf('<h1>'),s.indexOf('<nav class="legal-nav"')),plain=s=>s.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
 const blocks=Array.from(authored.matchAll(/<(h1|h2|h3|p|address|li)(?:\s[^>]*)?>(.*?)<\/\1>/gs),m=>({tag:m[1],text:plain(m[2]),links:Array.from(m[2].matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gs),a=>({text:plain(a[2]),href:a[1]}))}));
 assert.deepEqual(projection.notices[lang],blocks,'independent HTML extraction retains all approved blocks, words, ordered contacts and references');
}
})().catch(e=>{console.error(e);process.exitCode=1});
