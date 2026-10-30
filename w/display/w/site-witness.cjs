'use strict';
// Test transports acquire current owner declarations without fixing a mount or
// treating a body's internals/lifecycle stores as another Population directory.
const fs=require('node:fs'),path=require('node:path');
function discoverSites(root=path.join(__dirname,'../y')){
  const sites=new Map(),pending=[root];
  while(pending.length){
    const directory=pending.pop(),manifestPath=path.join(directory,'site.json');
    if(fs.existsSync(manifestPath)){
      const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
      if(sites.has(manifest.id))throw Error('Duplicate site witness identity: '+manifest.id);
      sites.set(manifest.id,{manifest,directory,file(member){
        if(typeof manifest[member]!=='string')throw Error(manifest.id+' has no declared '+member);
        const file=path.resolve(directory,manifest[member]);
        if(!file.startsWith(directory+path.sep))throw Error(manifest.id+' witness member escapes its body');
        return file;
      }});
      continue;
    }
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
      if(entry.isDirectory()&&!entry.name.startsWith('_')&&!entry.name.startsWith('.')&&entry.name!=='RITUALS')pending.push(path.join(directory,entry.name));
    }
  }
  return sites;
}
module.exports={discoverSites};
