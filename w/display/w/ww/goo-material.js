/* Shared material extracted from Crawlerbait's witnessed density/ink pipeline.
 * Consumers own their geometry, clock and palette; the material owns no source schema. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SSSGooMaterial=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const densityGLSL=`float gooDensity(float r2){float f=1.-r2;return f*f*f;}`;
const SPLAT_V=`#version 300 es
precision highp float;
in vec3 aPos;in float aRad;in float aW;in float aPh;in float aCoh;
uniform mat4 uProj,uView,uModel;uniform float uPx,uMaxPt;
out float vW;out float vPh;out float vCoh;
void main(){vec4 mv=uView*uModel*vec4(aPos,1.);gl_Position=uProj*mv;gl_PointSize=min(uMaxPt,2.*aRad*uPx/max(-mv.z,.01));vW=aW;vPh=aPh;vCoh=aCoh;}`;
const SPLAT_F=`#version 300 es
precision highp float;
in float vW;in float vPh;in float vCoh;out vec4 o;
${densityGLSL}
void main(){vec2 p=gl_PointCoord*2.-1.;float r2=dot(p,p);if(r2>1.)discard;float f=gooDensity(r2)*vW;o=vec4(f*vCoh*cos(vPh),f*vCoh*sin(vPh),f,0.);}`;
const INK_V=`#version 300 es
precision highp float;
void main(){vec2 p=gl_VertexID==0?vec2(-1.,-1.):(gl_VertexID==1?vec2(3.,-1.):vec2(-1.,3.));gl_Position=vec4(p,0.,1.);}`;
const coverageGLSL=`float gooCoverage(float d){float fw=max(fwidth(d),1e-4);return smoothstep(.5-fw,.5+fw,d);}`;
const INK_F=`#version 300 es
precision highp float;
uniform sampler2D tGoo;uniform vec2 uRes;uniform vec2 uTexel;uniform float uCell;uniform vec3 uInk,uBg;uniform vec3 uKinds[4];
out vec4 o;
${coverageGLSL}
vec3 riso(float ph){vec3 c=vec3(0.);float s=0.;for(int k=0;k<4;k++){float w=max(0.,cos(ph-float(k)*1.5707963));w*=w*w;c+=w*uKinds[k];s+=w;}return c/max(s,1e-4);}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  vec4 f=texture(tGoo,uv);float d=f.b,T=.5;
  float dx=texture(tGoo,uv+vec2(uTexel.x,0.)).b-texture(tGoo,uv-vec2(uTexel.x,0.)).b;
  float dy=texture(tGoo,uv+vec2(0.,uTexel.y)).b-texture(tGoo,uv-vec2(0.,uTexel.y)).b;
  vec3 n=normalize(vec3(-dx,-dy,.28)),L=normalize(vec3(-.45,.55,.7));
  float diff=clamp(dot(n,L),0.,1.),spec=pow(clamp(dot(reflect(-L,n),vec3(0.,0.,1.)),0.,1.),22.);
  float ph=atan(f.g,f.r),coh=clamp(length(f.rg)/max(d,1e-4),0.,1.);
  float fw=max(fwidth(d),1e-4),m=gooCoverage(d),outline=1.-smoothstep(0.,fw*1.3,abs(d-T));
  float tone=clamp(.04+.78*diff*mix(.25,1.,coh)+spec*.9,0.,1.);
  float a=.46;vec2 q=mat2(cos(a),-sin(a),sin(a),cos(a))*gl_FragCoord.xy/uCell+.22*vec2(cos(ph),sin(ph));
  float r=length(fract(q)-.5),rad=sqrt(tone)*.58,dotv=1.-smoothstep(rad-.07,rad+.07,r);
  float band=abs(fract(ph/6.2831853*3.)-.5)*2.,line=(1.-smoothstep(0.,.07,band))*smoothstep(.2,.5,coh);
  // hue is the argument of the field: each kind prints in its own ink; where strangers mix, phases cancel and the ink falls back to bone
  vec3 kink=mix(uInk,riso(ph),smoothstep(.3,.85,coh)*.92);
  // topographic lines of density carve each body out of a merged mass, so a colony shows what it contains
  float lv=log2(max(d,1e-3))*2.2,topo=(1.-smoothstep(0.,.1,abs(fract(lv)-.5)*2.))*smoothstep(T*1.3,T*2.,d);
  vec3 col=mix(uBg,kink,dotv*m);
  col=mix(col,uBg,topo*m*.7);col=mix(col,kink*1.1,line*m*.35);col=mix(col,uInk,outline*.85);
  o=vec4(col,max(m,outline));
}`;
const BLACK=`#version 300 es
precision highp float;uniform sampler2D tGoo;uniform vec2 uRes;out vec4 o;
${coverageGLSL}
void main(){float d=texture(tGoo,gl_FragCoord.xy/uRes).b;o=vec4(vec3(0.),gooCoverage(d));}`;

return Object.freeze({densityGLSL,coverageGLSL,pointVertex:SPLAT_V,pointFragment:SPLAT_F,screenVertex:INK_V,inkFragment:INK_F,blackInkFragment:BLACK});
});
