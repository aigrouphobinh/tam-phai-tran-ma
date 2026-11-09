import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {SkinRenderer,validateSkinManifest} from '../public/skin-renderer.js';
import {ModelAnimator} from '../public/models2d.js';
const folder=new URL('../public/assets/characters/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',folder),'utf-8'));
const names=['kiem','huyen','linh','boss'];
function fakeCanvas(){
 const trace={images:0};
 const g=new Proxy({globalAlpha:1},{
  get(t,k){if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>({addColorStop(){}});
   if(k==='drawImage')return()=>trace.images++;
   return k in t?t[k]:()=>{}},
  set(t,k,v){t[k]=v;return true}
 });
 return {g,trace};
}
class TestImage{
 naturalWidth=200;naturalHeight=330;
 set src(value){this.url=value;if(value.includes('-states-v2.')){this.naturalWidth=1024;this.naturalHeight=2048;}queueMicrotask(()=>this.onload())}
}
function createSkin(actors=manifest.actors){
 const mock=new SkinRenderer({
  fetchFn:async()=>({ok:true,json:async()=>({version:1,actors})}),
  ImageCtor:TestImage,clock:()=>1000
 });
 return mock;
}
test('real generated RGBA asset files are in main for all 4 schools/boss',()=>{
 const valid=validateSkinManifest(manifest);
 assert.deepEqual(Object.keys(valid.actors).sort(),names.slice().sort());
 for(const k of names){
  const a=valid.actors[k],name=a.texture.split('/').at(-1);
  const url=new URL(name,folder);
  assert.ok(existsSync(url),'missing sprite '+k);
  const bytes=readFileSync(url);
  assert.ok(bytes.byteLength>15000,'unexpected tiny placeholder '+k);
  assert.equal(bytes.subarray(0,4).toString(),'RIFF');
  assert.equal(bytes.subarray(8,12).toString(),'WEBP');
 }
});
test('manifest refuses missing assets, invalid anchors, unsafe sources, non-finite layer values',()=>{
 const copy=()=>JSON.parse(JSON.stringify(manifest));
 const a=copy();delete a.actors.boss;assert.throws(()=>validateSkinManifest(a),/Missing actor/);
 const b=copy();b.actors.kiem.texture='https://other.site/track.png';assert.throws(()=>validateSkinManifest(b),/Invalid textures/);
 const c=copy();c.actors.huyen.anchor=[-1,.5];assert.throws(()=>validateSkinManifest(c),/Invalid anchor/);
 const d=copy();d.actors.linh.layers=[{texture:'/assets/characters/linh.webp',bone:'armL',rotation:Infinity}];
 assert.throws(()=>validateSkinManifest(d),/Nonfinite rig value/);
});
test('live and model lab share the same skin renderer and draw actual bitmaps',async()=>{
 const skin=createSkin(),loaded=await skin.load();
 assert.equal(loaded.ready,true);
 assert.equal(loaded.loaded,8);
 assert.equal(loaded.animationReady,true);
 const m=new ModelAnimator(),{g,trace}=fakeCanvas();
 for(const [i,k] of names.entries()){
  if(k==='boss'){
   const state={bossState:'windup',cast:2,hp:56000,phase:2};
   m.observeBoss(state,1000);
   assert.equal(skin.drawBoss(g,state,1.2,m),true);
  }else{
   const p={id:k,scale:.95,faction:k,state:'attack',actionSeq:4,actionDuration:.55};
   m.observe(p,1000);
   assert.equal(skin.drawPlayer(g,p,1.2,100+i*60,400,m,1),true);
  }
 }
 assert.equal(trace.images,4,'each actor crops its authored atlas once, without extra mesh deformation');
});
test('missing texture safely falls back without lying that rig is production ready',async()=>{
 class BrokenImage{set src(x){queueMicrotask(()=>this.onerror(Error('no file')))}}
 const skin=new SkinRenderer({ImageCtor:BrokenImage,fetchFn:async()=>({ok:true,json:async()=>manifest})});
 const r=await skin.load();assert.equal(r.ready,false);assert.ok(r.errors.length>=4);
 const {g,trace}=fakeCanvas();
 assert.equal(skin.drawPlayer(g,{faction:'kiem'},1,1,1,new ModelAnimator()),false);
 assert.equal(trace.images,0);
});


test('default browser fetch retains Window receiver and loads all four real sprites',async()=>{
 const original=globalThis.fetch;
 const called=[];
 globalThis.fetch=function(url,options){
  assert.equal(this,globalThis,'native fetch must retain Window/globalThis receiver');
  called.push({url,options});
  return Promise.resolve({ok:true,json:async()=>manifest});
 };
 try{
  // No injected fetchFn: this is the exact production initialization path.
  const skin=new SkinRenderer({ImageCtor:TestImage});
  const status=await skin.load();
  assert.equal(status.ready,true,JSON.stringify(status.errors));
  assert.equal(status.loaded,15);
  assert.deepEqual(Object.values(status.actors),[true,true,true,true]);
  assert.equal(called.length,1);
  assert.equal(called[0].url,'/assets/characters/manifest.json');
  assert.equal(called[0].options.cache,'no-cache');
  const {g,trace}=fakeCanvas();
  const animator=new ModelAnimator();
  for(const k of names){
   if(k==='boss'){
    const state={bossState:'windup',cast:2,hp:50000,phase:2};
    animator.observeBoss(state,1000);
    assert.equal(skin.drawBoss(g,state,1.2,animator),true);
   }else{
    const player={id:'player-'+k,faction:k,state:'attack',actionSeq:1,scale:.82,hp:100};
    animator.observe(player,1000);
    assert.equal(skin.drawPlayer(g,player,1.2,160,450,animator),true);
   }
  }
  assert.ok(trace.images>0,'character textures must actually reach canvas drawImage');
 }finally{globalThis.fetch=original}
});
