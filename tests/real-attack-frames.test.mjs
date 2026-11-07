import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SkinRenderer,validateSkinManifest} from '../public/skin-renderer.js';
import {ModelAnimator} from '../public/models2d.js';

const manifest=JSON.parse(readFileSync(new URL('../public/assets/characters/manifest.json',import.meta.url),'utf8'));

class AtlasImage{
 naturalWidth=200; naturalHeight=300;
 set src(url){
  if(url==='/assets/characters/kiem-attack.webp'){this.naturalWidth=512;this.naturalHeight=384}
  queueMicrotask(()=>this.onload?.());
 }
}
function drawingContext(){
 const calls=[];
 const context=new Proxy({globalAlpha:1},{
  get(o,k){if(k==='drawImage')return(...args)=>calls.push(args);
   return k in o?o[k]:()=>{}},
  set(o,k,v){o[k]=v;return true}
 });
 return {context,calls};
}
test('12 independent painted animation frame slots are present as a real WebP resource',()=>{
 const clip=manifest.actors.kiem.animations?.attack;
 assert.ok(clip,'Kiếm Tông must have a dedicated attack atlas');
 assert.deepEqual([clip.frames,clip.columns,clip.rows,clip.frameWidth,clip.frameHeight,clip.fps],
  [12,4,3,128,128,20]);
 assert.equal(clip.loop,false);
 assert.equal(clip.renderScale,1.5);
 assert.equal(validateSkinManifest(manifest).actors.kiem.animations.attack.renderScale,1.5);
 const bytes=readFileSync(new URL('../public/assets/characters/kiem-attack.webp',import.meta.url));
 assert.ok(bytes.byteLength>18000,'atlas should not be a tiny dummy');
 assert.equal(bytes.toString('ascii',0,4),'RIFF');
 assert.equal(bytes.toString('ascii',8,12),'WEBP');
});
test('attack mode picks sequential source frames, not one picture/mesh strips',async()=>{
 const skin=new SkinRenderer({
  fetchFn:async()=>({ok:true,json:async()=>manifest}),ImageCtor:AtlasImage
 });
 const info=await skin.load();
 assert.equal(info.ready,true,JSON.stringify(info.errors));
 assert.equal(info.loaded,5);
 const rig=new ModelAnimator();
 const p={id:'visual-test',state:'attack',actionSeq:1,actionAt:0,actionDuration:.6,
  faction:'kiem',hp:100,scale:.82};
 rig.observe(p,1000);
 const {context,calls}=drawingContext();
 assert.equal(skin.drawPlayer(context,p,1.0,200,400,rig),true);
 assert.equal(skin.drawPlayer(context,p,1.15,200,400,rig),true);
 assert.equal(skin.drawPlayer(context,p,1.41,200,400,rig),true);
 assert.equal(calls.length,3,'each atlas draw uses one bitmap crop, no mesh fallback');
 for(const args of calls)assert.equal(args.length,9,'sprite-sheet must crop source rectangle');
 assert.deepEqual(calls.map(c=>[c[1],c[2]]),[
  [0,0], [384,0], [0,256]
 ]);
 assert.equal(calls[0][7],138,'clip renderScale enlarges hand-painted art to game size');
});
