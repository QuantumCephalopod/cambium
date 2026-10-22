/* Display's four-child fold carrier. Owners supply exact mass and opaque leaves;
 * source clocks, identity, collision law and presentation remain with them. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SSSRecursiveFold=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const GENES=Object.freeze(['w','x','z','y']);
  const validPath=path=>typeof path==='string'&&/^[wxzy]*$/.test(path);
  function create(){
    // One instance is one acquired source generation. A foreign node cannot
    // silently replace tissue from this generation, even with the same path.
    const owned=new WeakSet();
    const own=node=>{owned.add(node);return Object.freeze(node)};
    const empty=own({count:0,value:null,children:null});
    function check(node){if(!node||!owned.has(node))throw new TypeError('foreign fold generation')}
    function leaf(value,count=1){
      if(!(typeof count==='bigint'?count>0n:Number.isSafeInteger(count)&&count>0))throw new TypeError('exact positive fold count required');
      return own({count,value,children:null});
    }
    function branch(children){
      const big=GENES.some(g=>typeof children[g].count==='bigint');let count=big?0n:0;
      for(const g of GENES)count+=big?BigInt(children[g].count):children[g].count;
      if(!big&&!Number.isSafeInteger(count))throw new RangeError('fold count needs BigInt precision');
      return count?own({count,value:null,children:Object.freeze(children)}):empty;
    }
    function replace(root,path,next=empty){
      check(root);check(next);if(!validPath(path))throw new TypeError('invalid fold path');
      const spine=[];let n=root;
      for(const g of path){
        if(n.count&&!n.children)throw new Error('fold path continues an occupied leaf');
        spine.push([n,g]);n=n.children?.[g]||empty;
      }
      if(n===next)return {root,edits:0};
      let edits=0;
      for(let i=spine.length-1;i>=0;i--){
        const [parent,g]=spine[i],children={};
        for(const k of GENES)children[k]=k===g?next:(parent.children?.[k]||empty);
        next=branch(children);edits++;
      }
      return {root:next,edits};
    }
    function at(root,path){
      check(root);if(!validPath(path))throw new TypeError('invalid fold path');
      let n=root;for(const g of path){n=n.children?.[g];if(!n)return null}return n;
    }
    function view(root,{container='',ranks=2,project=record=>({...record})}={}){
      check(root);if(!validPath(container))throw new TypeError('invalid fold container');
      if(!Number.isSafeInteger(ranks)||ranks<0)throw new TypeError('invalid fold resolution');
      if(typeof project!=='function')throw new TypeError('fold projector required');
      const limit=container.length+ranks,terminals=[],tasks=[{node:root,path:'',parent:null,g:null}];
      let result,visited=0;
      while(tasks.length){
        const {node:n,path,parent,g}=tasks.pop();visited++;
        const within=path.startsWith(container),ancestor=container.startsWith(path);
        const open=!!n.children&&(ancestor&&path.length<container.length||within&&path.length<limit)||(!path&&!n.count);
        // Closed parents lend their exact count, never their hidden leaves.
        const record={path,count:n.count,value:n.children?null:n.value,fold:!!n.children&&!open,open,within};
        const body=project(record);
        if(!body||typeof body!=='object'||Array.isArray(body))throw new TypeError('fold projection must be an object');
        body.children={};
        if(parent)parent[g]=body;else result=body;
        if(open){for(let i=GENES.length-1;i>=0;i--){const k=GENES[i];tasks.push({node:n.children?.[k]||empty,path:path+k,parent:body.children,g:k})}}
        else if(within&&n.count)terminals.push({...record,body});
      }
      return {root:result,terminals,visited,container};
    }
    return Object.freeze({empty,leaf,replace,at,view});
  }
  return Object.freeze({GENES,create});
});
