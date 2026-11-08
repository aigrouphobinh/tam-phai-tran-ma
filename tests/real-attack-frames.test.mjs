import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SkinRenderer,validateSkinManifest,sampleAtlasFrame} from '../public/skin-renderer.js';
import {ModelAnimator} from '../public/models2d.js';
import {RaidEngine} from '../engine.mjs';

const manifest=JSON.parse(readFileSync(new URL('../public/assets/characters/manifest.json',import.meta.url),'utf8'));
const states=['idle','run','attack','cast','hit','down','revive','victory'];
class AtlasImage{
 naturalWidth=200;naturalHeight=300;
 set src(url){this.url=url;if(url.includes('-states-v2.webp')){this.naturalWidth=1024;this.naturalHeight=2048;}queueMicrotask(()=>this.onload?.());}
}
function drawingContext(){
 const calls=[];
 const context=new Proxy({globalAlpha:1},{
  get(o,k){if(k==='drawImage')return(...args)=>calls.push(args);return k in o?o[k]:()=>{}},
  set(o,k,v){o[k]=v;return true}
 });return {context,calls};
}
const createSkin=()=>new SkinRenderer({fetchFn:async()=>({ok:true,json:async()=>manifest}),ImageCtor:AtlasImage});

test('four character sheets each provide eight separately registered painted clips',()=>{
 const valid=validateSkinManifest(manifest);
 for(const [key,actor] of Object.entries(valid.actors)){
  const rows=new Set();
  for(const state of states){
   const clip=actor.animations[state];assert.ok(clip,key+':'+state);
   assert.equal(clip.frames,4);rows.add(clip.startFrame);
   for(let i=0;i<4;i++){
    const age=(clip.frameTimes?.[i]??i/4)*(4/clip.fps)+1e-7;
    const f=sampleAtlasFrame(clip,age);
    assert.equal(f.source,clip.startFrame+i);
    assert.ok(f.sx+clip.frameWidth<=1024&&f.sy+clip.frameHeight<=2048);
   }
  }
  assert.equal(rows.size,8,'states must reference distinct rows, not the same picture');
  const bytes=readFileSync(new URL('../public'+actor.animations.idle.texture,import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.ok(bytes.byteLength>30000,'sheet must contain authored art');
 }
});

test('every player state and all boss aliases draw one real crop at the expected atlas row',async()=>{
 const skin=createSkin(),status=await skin.load();assert.equal(status.animationReady,true);
 assert.equal(status.loaded,8,'shared state sheets load once per actor');
 const rig=new ModelAnimator(),{context,calls}=drawingContext();
 for(const key of Object.keys(manifest.actors))for(const state of Object.keys(manifest.actors[key].animations)){
  const p={id:key,faction:key,state,scale:.82,hp:100,actionSeq:state,actionDuration:.55};
  if(key==='boss')rig.boss={state,since:1000,duration:.55};else rig.observe(p,1000);
  const before=calls.length;skin.drawActor(context,key,p,1,200,400,rig);
  assert.equal(calls.length,before+1,key+':'+state+' must not fall back to mesh');
  const clip=skin.getClip(key,state),f=sampleAtlasFrame(clip,0,.55),draw=calls.at(-1);
  assert.equal(draw.length,9);assert.deepEqual(draw.slice(1,5),[f.sx,f.sy,256,256]);
 }
});

test('basic contact frame follows the actual server windup for all three factions',()=>{
 for(const faction of ['kiem','huyen','linh']){
  const raid=new RaidEngine(),p=raid.join(faction,faction,faction);p.x=p.tx;p.y=p.ty;p.nextAttack=0;
  raid.tick(.05);assert.ok(p.pendingStrike);
  const contact=p.pendingStrike.at-p.actionAt,clip=manifest.actors[faction].animations[p.state];
  const expected=faction==='kiem'?1:2;
  assert.equal(sampleAtlasFrame(clip,contact-.001,p.actionDuration).frame,expected-1);
  assert.equal(sampleAtlasFrame(clip,contact,p.actionDuration).frame,expected);
 }
});

test('boss impact begins on scythe contact, windup holds, and collapse stays down',async()=>{
 const skin=createSkin();await skin.load();
 assert.equal(skin.getClip('boss','impact').startFrame,10,'exact boss clip precedes attack alias');
 assert.equal(sampleAtlasFrame(skin.getClip('boss','impact'),0,.55).source,10);
 assert.equal(sampleAtlasFrame(skin.getClip('boss','windup'),7).source,13,'keep the weapon raised until server impact');
 for(const actor of Object.values(manifest.actors)){
  assert.equal(sampleAtlasFrame(actor.animations.down,17).source,23,'hold collapsed pose while dead');
  assert.equal(sampleAtlasFrame(actor.animations.revive,1.1,1.1).source,27,'stand on final revive frame');
 }
});

test('manifest rejects row overflow, unordered timing and nonboolean action sync',()=>{
 for(const value of [{startFrame:30},{startFrame:-1},{startFrame:1.5},{frameTimes:[0,.7,.4,.9]},{frameTimes:[0,.5]},{syncToAction:'yes'}]){
  const copy=structuredClone(manifest);Object.assign(copy.actors.kiem.animations.attack,value);
  assert.throws(()=>validateSkinManifest(copy),/Invalid animation/);
 }
});
