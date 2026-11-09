import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SkinRenderer,validateSkinManifest} from '../public/skin-renderer.js';
import {BossWardrobe} from '../public/boss-wardrobe.js';
import {ModelAnimator} from '../public/models2d.js';
import {RaidEngine} from '../engine.mjs';
import {BOSS_FORMS} from '../boss-cycle.mjs';
const manifest=JSON.parse(readFileSync(new URL('../public/assets/characters/manifest.json',import.meta.url)));
class ImageMock{
 naturalWidth=256;naturalHeight=256;
 set src(value){this.url=value;if(value.includes('states-v2')){this.naturalWidth=1024;this.naturalHeight=2048;}else if(value.includes('accessories')){this.naturalWidth=1024;this.naturalHeight=1024;}queueMicrotask(()=>this.onload());}
}
function context(){const draws=[],operations=[];const g=new Proxy({globalAlpha:1},{get(o,k){if(k==='drawImage')return(...args)=>draws.push(args);if(k==='clearRect')return()=>operations.push(k);return k in o?o[k]:()=>{};},set(o,k,v){if(k==='globalCompositeOperation')operations.push(v);o[k]=v;return true;}});return {g,draws,operations};}
async function setup(){const skin=new SkinRenderer({ImageCtor:ImageMock,fetchFn:async()=>({ok:true,json:async()=>manifest})});await skin.load();return {skin,wardrobe:new BossWardrobe(skin)};}

test('four covered boss bases load their own real atlas while shared resources are cached once',async()=>{
 const {skin}=await setup();assert.deepEqual(Object.values(skin.status().bossForms),[true,true,true,true]);
 assert.equal(skin.status().loaded,15);
 for(const f of BOSS_FORMS){assert.match(skin.getClip('boss','attack',f.id).texture,new RegExp(f.asset));assert.equal(manifest.bossForms[f.id].baseCoverage,'opaque-high-neck-tunic-leggings-boots');}
});
test('breaking outer layers removes accessories only; the full same base crop is still drawn at every stage',async()=>{
 const {skin,wardrobe}=await setup(),engine=new RaidEngine({bossLoop:true}),animator=new ModelAnimator();
 const base=[];
 for(let stage=0;stage<=3;stage++){
  engine.bossCycle.stage=stage;const state=engine.snapshot();animator.observeBoss(state,1000);const {g,draws,operations}=context();
  wardrobe.drawBoss(g,state,1,animator);
  const bodies=draws.filter(d=>d[0].url.includes('boss-red-states-v2'));assert.equal(bodies.length,1);
  assert.equal(draws.filter(d=>d[0].url.includes('accessories')).length,4-stage);
  base.push(bodies[0].slice(1));assert.deepEqual(operations,[],'no erase, mask or transparency operation on any body region');
 }
 for(const crop of base)assert.deepEqual(crop,base[0]);
});
test('falling loot uses the original form accessory row even after the visible form changes',async()=>{
 const {wardrobe}=await setup(),engine=new RaidEngine({bossLoop:true});engine.join('a','A','kiem');engine.damage(20000,engine.players.get('a'));
 const state=engine.snapshot();state.bossCycle.form=state.bossCycle.next;wardrobe.observe(state,1);
 const {g,draws}=context();wardrobe.drawDrops(g,state,1.3);assert.equal(draws.length,1);assert.equal(draws[0][2],0,'loot came from red row, not the new ice row');
});
test('boss form schema refuses a base missing its permanent opaque clothing declaration',()=>{
 const copy=structuredClone(manifest);delete copy.bossForms.honglien.baseCoverage;assert.throws(()=>validateSkinManifest(copy),/Permanent covered/);
 const other=structuredClone(manifest);other.bossForms.unknown=other.bossForms.honglien;assert.throws(()=>validateSkinManifest(other),/Invalid boss form/);
});
test('storm boss faces left toward the players without changing its authored frame registration',async()=>{
 const {skin}=await setup(),engine=new RaidEngine({bossLoop:true});engine.bossCycle.index=2;
 const state=engine.snapshot(),animator=new ModelAnimator();animator.observeBoss(state,1000);
 const {g,draws}=context(),scales=[];g.scale=(...args)=>scales.push(args);
 skin.drawBoss(g,state,1,animator);assert.ok(scales.some(s=>s[0]===-1&&s[1]===1));
 assert.match(draws[0][0].url,/boss-storm-states/);assert.deepEqual(draws[0].slice(1,5),[0,0,256,256]);
});
