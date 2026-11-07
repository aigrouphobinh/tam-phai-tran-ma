import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateSkinManifest,SkinRenderer} from '../public/skin-renderer.js';
import {ModelAnimator} from '../public/models2d.js';
const manifest=JSON.parse(readFileSync(new URL('../public/assets/characters/manifest.json',import.meta.url),'utf8'));
const clone=()=>JSON.parse(JSON.stringify(manifest));
const clip={texture:'/assets/characters/kiem-attack.webp',
 frames:4,columns:4,rows:1,frameWidth:50,frameHeight:100,fps:10,loop:false};
class FakeImage{
 naturalWidth=200;naturalHeight=300;
 set src(url){this.url=url;queueMicrotask(()=>this.onload?.())}
}
function context(){
 const draws=[];
 const canvas=new Proxy({globalAlpha:1},{
  get(target,key){
   if(key==='drawImage')return(...args)=>draws.push(args);
   return key in target?target[key]:()=>{};
  },
  set(target,key,value){target[key]=value;return true;}
 });
 return {canvas,draws};
}
test('atlas manifest clips validate frame layout and disallow external sources',()=>{
 const data=clone();data.actors.kiem.animations={attack:clip};
 const accepted=validateSkinManifest(data);
 assert.deepEqual(accepted.actors.kiem.animations.attack,clip);
 for(const bad of [
  {texture:'https://evil.invalid/t.webp'},
  {fps:0},{columns:0},{frames:1000},{frameWidth:0},
  {rows:0},{frames:8},{frameHeight:20000},
 ]){
  const next=clone();
  next.actors.kiem.animations={attack:{...clip,...bad}};
  assert.throws(()=>validateSkinManifest(next),/Invalid animation/);
 }
});

test('timeline atlas draws correct 9-argument source rectangle at 200ms',async()=>{
 const data=clone();data.actors.kiem.animations={attack:clip};
 const skins=new SkinRenderer({
  ImageCtor:FakeImage,clock:()=>1000,
  fetchFn:async()=>({ok:true,json:async()=>data})
 });
 const loaded=await skins.load();
 assert.equal(loaded.ready,true);
 assert.equal(loaded.loaded,5);
 const animator=new ModelAnimator();
 const p={id:'k',state:'attack',actionSeq:3,actionAt:0,
  actionDuration:.7,scale:.82,faction:'kiem',hp:100};
 animator.observe(p,1000);
 const {canvas,draws}=context();
 assert.equal(skins.drawPlayer(canvas,p,1.23,100,400,animator),true);
 const draw=draws.at(-1);
 assert.equal(draw.length,9,'cropped atlas frame must use the source rect overload');
 assert.equal(draw[1],100,'frame 3 begins at source x 100');
 assert.equal(draw[2],0);
 assert.equal(draw[3],50);
 assert.equal(draw[4],100);
});

test('non-looping animation holds last frame instead of wrapping',async()=>{
 const data=clone();data.actors.kiem.animations={attack:clip};
 const skin=new SkinRenderer({ImageCtor:FakeImage,clock:()=>1000,
  fetchFn:async()=>({ok:true,json:async()=>data})});
 await skin.load();
 const p={id:'k2',faction:'kiem',state:'attack',actionSeq:1,
  actionDuration:.7,scale:.82,hp:100};
 const m=new ModelAnimator();m.observe(p,1000);
 const {canvas,draws}=context();
 skin.drawPlayer(canvas,p,2.23,100,400,m);
 assert.equal(draws.at(-1)[1],150,'last frame source x 150');
});
