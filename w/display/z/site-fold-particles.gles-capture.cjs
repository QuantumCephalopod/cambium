'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {gl,commands}=require('../w/gles-transport.cjs').createTransport(),G=require('../w/goo-material.js');
const [width=1280,height=800]=process.argv.slice(2).map(Number),canvas={width:1,height:1,className:'',setAttribute(){},getContext:()=>gl,addEventListener(){},remove(){}};
gl.FRAMEBUFFER_COMPLETE=36053;gl.checkFramebufferStatus=()=>gl.FRAMEBUFFER_COMPLETE;
const layer={dataset:{},style:{setProperty(){}},ownerDocument:{createElement:()=>canvas},appendChild(){}};let clock=0;const context={SSSGooMaterial:G,Float32Array,performance:{now:()=>clock},document:layer.ownerDocument};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'site-fold-particles.js'),'utf8'),context);const P=context.SSSSiteFoldParticles,effect=P.create(layer);effect.prepare(width,height,{x:width*.37,y:height*.42});assert(effect.count<=P.LIMIT);assert.equal(layer.dataset.particleVertices,'12');
for(const progress of [0,.25,.5,.75,1,.5,0,.62,.62,0]){clock+=400;effect.paint(progress);commands.push({name:'readback',width:canvas.width,height:canvas.height,lens:{progress}});}
assert.equal(commands.filter(c=>c.name==='bufferSubData').length,1,'particle state was uploaded again during animation');
const draws=commands.filter(c=>c.name==='drawArraysInstanced');assert(draws.every(c=>c.args[2]===12&&c.args[3]===effect.count));
process.stdout.write(JSON.stringify({width:canvas.width,height:canvas.height,css:[width,height],count:effect.count,commands}));
