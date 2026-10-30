'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const body=path.dirname(__dirname),manifest=JSON.parse(fs.readFileSync(path.join(body,'site.json')));
const projection=JSON.parse(fs.readFileSync(path.join(body,manifest.projection),'utf8'));
const privacy=Boolean(projection.controller),route=privacy?'privacy':'impressum',id='organism:'+(privacy?'datenschutz':'impressum');
const nodes=[],events=new Map(),world={language:'en'};
function node(tag){const n={tag,children:[],attrs:{},append(...xs){this.children.push(...xs)},replaceChildren(...xs){this.children=xs},setAttribute(k,v){this.attrs[k]=v}};nodes.push(n);return n}
const document={body:node('body'),getElementById:id=>nodes.find(n=>n.id===id),createElement:node};
const context={document,SSSWorldView:world,SSSOrthogonalText:{create:()=>({mount(){},unmount(){},draw(){}})},addEventListener(k,fn){const list=events.get(k)||[];list.push(fn);events.set(k,list)}};
vm.runInNewContext(fs.readFileSync(path.join(body,manifest.renderer),'utf8'),context);
const renderer=context.SSSInterlocutorModules.get(id);assert.equal(renderer.id,id);
const host=node('host'),content=node('content');
const footer=document.getElementById(privacy?'legal-link-privacy':'legal-link-impressum');
for(const language of ['en','de','en']){
 world.language=language;for(const fn of events.get('sss:language'))fn();
 const href='/'+route+'/'+(language==='en'?'en/':'');
 assert.equal(footer.href,href);assert.equal(footer.textContent,projection.title[language]);
 assert.equal(footer.hreflang,language);
 assert.equal(renderer.render({host,content,projection,language}),true);assert.equal(host.hidden,false);
 const article=content.children[0];assert.equal(article.lang,language);
 assert.equal(article.children.find(n=>n.tag==='h1').textContent,projection.title[language]);
 assert(article.children.some(n=>n.tag==='a'&&n.href===href),'mounted full notice follows language');
 assert(article.children.some(n=>n.tag==='a'&&n.href==='mailto:'+projection.contact.email));
 assert.equal(renderer.fieldProjection(projection).root[language],projection.title[language]);
 assert.equal(renderer.shader.view.projection,'orthographic');assert.deepEqual(Array.from(renderer.shader.view.rest),[1,0,0,0]);
}
renderer.unmount({host,content});assert(host.hidden);assert.equal(content.children.length,0);
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
