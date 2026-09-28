// Replays bait-space birth order under tide.py's own law: address = shortest unique prefix of sha256(path) as a w/x/z/y stream.
const fs=require('fs'),crypto=require('crypto');
const A='wxzy';
function block(path,b){ const raw=Buffer.from(path,'utf8'); const d=b===0?crypto.createHash('sha256').update(raw).digest():crypto.createHash('sha256').update(Buffer.concat([raw,Buffer.from('\x00crawlerbait-address-v1\x00'),Buffer.from(String(b))])).digest();
  let s=''; for(const byte of d) for(const sh of [6,4,2,0]) s+=A[(byte>>sh)&3]; return s; }
const stream=p=>block(p,0)+block(p,1);
global.window={}; require.cache={}; require(require('path').resolve('crawlerbait-proto/data.js')); const D=window.CRAWLERBAIT;
// first whole-traffic sighting per bait; baits known only from legacy 404 evidence exist before the clock starts
const first=new Array(D.baits.length).fill(-1);
for(const b of D.beings) for(const [t,i] of b.s) if(first[i]<0||t<first[i]) first[i]=t;
const order=D.baits.map((b,i)=>i).sort((a,b)=>first[a]-first[b]||(D.baits[a].p<D.baits[b].p?-1:1));
const S=D.baits.map(b=>stream(b.p)), cur=new Array(D.baits.length).fill(null), hist=D.baits.map(()=>[]);
const lcp=(a,b)=>{let i=0;while(i<a.length&&a[i]===b[i])i++;return i};
const live=[]; let divisions=0;
for(const i of order){ const t=first[i];
  // the one living bait whose address is a prefix of the newcomer's stream must deepen (mitosis); nobody else moves
  let depth=1, parent=-1;
  for(const j of live){ const k=lcp(S[i],S[j]); depth=Math.max(depth,k+1);
    if(k>=cur[j].length){ hist[j].push([t,S[j].slice(0,k+1),-2,cur[j]]); cur[j]=S[j].slice(0,k+1); parent=j; divisions++; } }
  cur[i]=S[i].slice(0,depth); hist[i].push([t,cur[i],parent]); live.push(i); }
let match=0; D.baits.forEach((b,i)=>{ if(cur[i]===b.a) match++; });
console.log({baits:D.baits.length,legacyOnly:first.filter(x=>x<0).length,divisions,finalMatchesRepo:match});
D.growth=hist; fs.writeFileSync('crawlerbait-proto/data.js','window.CRAWLERBAIT='+JSON.stringify(D)+';\n');
