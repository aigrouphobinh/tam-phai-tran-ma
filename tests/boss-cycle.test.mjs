import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {RaidEngine} from '../engine.mjs';
import {BOSS_FORMS} from '../boss-cycle.mjs';
import {serializeRaid,restoreRaid} from '../persistence.mjs';
import {createGameServer} from '../server.mjs';
function setup(){const g=new RaidEngine({bossLoop:true}),p=g.join('viewer','Ái Nhi','kiem');p.x=p.tx;p.y=p.ty;p.nextAttack=99999;return {g,p};}
function advance(g,seconds){for(let t=0;t<seconds-1e-6;t+=.05)g.tick(.05);}

test('only real HP damage drops each outer piece once, while one decoration and the base remain',()=>{
 const {g,p}=setup();g.shield=1000;g.damage(1000,p);assert.equal(g.bossCycle.stage,0);
 g.damage(20000,p);assert.equal(g.bossCycle.stage,1);assert.equal(g.bossCycle.pendingDrops.length,1);
 g.damage(0,p);assert.equal(g.bossCycle.pendingDrops.length,1);
 g.damage(20000,p);g.damage(20000,p);const c=g.snapshot().bossCycle;
 assert.equal(c.stage,3);assert.equal(c.remaining,1);assert.equal(c.permanentBase,true);
 assert.equal(g.events.filter(e=>e.type==='BOSS_CLOTH_DROP').length,3);
 assert.equal(new Set(c.drops.map(d=>d.id)).size,3);
});
test('drops are picked up after falling and credited exactly once to team and actual damage owner',()=>{
 const {g,p}=setup();g.damage(20000,p);advance(g,1);assert.equal(p.cloth,0);
 advance(g,.3);assert.equal(p.cloth,1);assert.equal(g.bossCycle.loot.total,1);
 advance(g,2);assert.equal(p.cloth,1);assert.equal(g.bossCycle.loot.byForm.honglien,1);
 assert.equal(g.events.filter(e=>e.type==='BOSS_LOOT_COLLECTED').length,1);
});
test('overkill starts only one transformation and cannot harm the next form during morph',()=>{
 const {g,p}=setup();g.damage(1e9,p);assert.equal(g.hp,9600);assert.ok(g.bossCycle.transform);
 const seq=g.bossActionSeq;assert.equal(g.damage(1e9,p),0);assert.equal(g.bossActionSeq,seq);
 advance(g,1.7);assert.equal(g.bossCycle.wave,2);assert.equal(g.hp,86000);assert.equal(g.result,'');
});
test('four distinct bosses loop back with bounded growth, retained roster, scores and material inventory',()=>{
 const {g,p}=setup();p.diamonds=123;const ids=[];
 for(let i=0;i<4;i++){
  ids.push(g.snapshot().bossCycle.form.id);g.damage(1e6,p);advance(g,1.7);
  assert.equal(g.players.get(p.id),p);assert.equal(p.diamonds,123);assert.equal(g.result,'');
 }
 assert.deepEqual(ids,BOSS_FORMS.map(f=>f.id));assert.equal(g.bossCycle.wave,5);
 assert.equal(g.snapshot().bossCycle.form.id,'honglien');assert.equal(g.maxHP,84000);
 assert.equal(g.bossCycle.loot.total,12);assert.equal(p.cloth,12);assert.ok(p.score>0);assert.equal(g.snapshot().time,240);
});
test('gifts received mid-morph survive a checkpoint and are consumed once after the new form arrives',()=>{
 const {g,p}=setup();g.damage(1e6,p);g.gift(p.id,p.name,500,1,'same-gift');
 assert.equal(g.gift(p.id,p.name,500,1,'same-gift'),false);assert.equal(g.pendingGifts.length,1);assert.equal(p.diamonds,0);
 const copy=restoreRaid(new RaidEngine({bossLoop:true}),JSON.parse(JSON.stringify(serializeRaid(g))));
 advance(copy,1.7);assert.equal(copy.players.get(p.id).diamonds,500);assert.equal(copy.pendingGifts.length,0);
 assert.equal(copy.gift(p.id,p.name,500,1,'same-gift'),false);assert.equal(copy.bossCycle.loot.total,3);
 assert.ok(copy.hp<86000);assert.equal(copy.bossCycle.wave,2);
});
test('restoring pending cloth pickups does not duplicate them or reset the current form',()=>{
 const {g,p}=setup();g.damage(20000,p);advance(g,.5);
 const copy=restoreRaid(new RaidEngine({bossLoop:true}),JSON.parse(JSON.stringify(serializeRaid(g))));
 advance(copy,1);assert.equal(copy.bossCycle.loot.total,1);assert.equal(copy.players.get(p.id).cloth,1);
 const again=restoreRaid(new RaidEngine({bossLoop:true}),JSON.parse(JSON.stringify(serializeRaid(copy))));
 advance(again,1);assert.equal(again.bossCycle.loot.total,1);assert.equal(again.bossCycle.stage,1);
});
test('new form checkpoints above 80000 HP are valid; inconsistent inventory is rejected',()=>{
 const {g,p}=setup();g.damage(1e6,p);advance(g,1.7);
 const record=JSON.parse(JSON.stringify(serializeRaid(g)));
 assert.equal(restoreRaid(new RaidEngine({bossLoop:true}),record).hp,86000);
 record.state.bossCycle.loot.total++;assert.throws(()=>restoreRaid(new RaidEngine({bossLoop:true}),record),/túi vật liệu/);
});
test('defeat settles earned falling loot and retains it across the next round',()=>{
 const {g,p}=setup();g.damage(20000,p);g.finish('PHONG ẤN TAN VỠ');
 assert.equal(p.cloth,1);advance(g,12.1);assert.equal(g.players.get(p.id).cloth,1);assert.equal(g.bossCycle.loot.total,1);
});
test('each form authors its own warning timings and attack pattern',()=>{
 for(const [index,form] of BOSS_FORMS.entries()){
  const {g}=setup();g.bossCycle.index=index;g.bossCycle.wave=index+1;g.nextAttack=0;g.tick(.05);
  assert.ok(form.pattern.includes(g.warning.kind));assert.ok(Math.abs(g.warning.impactAt-g.elapsed-form.telegraph)<1e-6);
 }
});
test('the real local server defaults to the boss loop; preview controls are rejected outside practice',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tam-phai-boss-loop-'));let app;
 try{
  app=await createGameServer({port:0,dataDir:dir});assert.equal(app.state().bossCycle.form.id,'honglien');
  assert.throws(()=>app.command({action:'boss-hit'}),/sân luyện/);
  app.command({action:'demo'});app.command({action:'squad'});app.command({action:'boss-hit'});assert.equal(app.raid.bossCycle.stage,1);
  app.command({action:'boss-transform'});assert.ok(app.raid.bossCycle.transform);app.command({action:'bridge',room:'test_room'});
  assert.throws(()=>app.command({action:'boss-transform'}),/sân luyện/);
 }finally{if(app)await app.close();await rm(dir,{recursive:true,force:true});}
});
