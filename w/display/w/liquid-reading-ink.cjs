'use strict';
// Native texture fixture: actual SpriteSheet glyphs and shared shadow, encoded
// as premultiplied bottom-up upload bytes (the browser's unpack result).
const fs=require('fs'),path=require('path'),{createCanvas,GlobalFonts}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas'));
const [w,h,rawFrame,output]=process.argv.slice(2),width=+w,height=+h,r=JSON.parse(rawFrame);
if(!GlobalFonts.registerFromPath(path.join(__dirname,'spritesheet/SpriteSheet-Mono.ttf'),'SpriteSheet Mono'))throw Error('font unavailable');
const c=createCanvas(width,height),ctx=c.getContext('2d');ctx.font='16px "SpriteSheet Mono"';ctx.textBaseline='top';if(process.argv[6]!=='plain')require('./display-type.js').shadow(ctx);ctx.fillStyle='#eef5df';ctx.fillText('Every request',r.left+14,r.top+18);ctx.fillText('to this site',r.left+14,r.top+42);ctx.fillText('is an encounter.',r.left+14,r.top+66);ctx.shadowBlur=0;ctx.shadowOffsetX=ctx.shadowOffsetY=0;ctx.fillStyle='#f06548';ctx.fillRect(r.left+30,r.top+96,54,10);
const raw=ctx.getImageData(0,0,width,height).data,out=Buffer.alloc(raw.length);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,j=((height-1-y)*width+x)*4,a=raw[i+3]/255;for(let k=0;k<3;k++)out[j+k]=Math.round(raw[i+k]*a);out[j+3]=raw[i+3]}
fs.writeFileSync(output,out);
