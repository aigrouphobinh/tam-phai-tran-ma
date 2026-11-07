import test from 'node:test';import assert from 'node:assert/strict';
import {RaidEngine} from '../engine.mjs';
const join=(g,id='1',f='kiem')=>g.join(id,id,f);
test('players have real individual slots, names, schools and entry states',()=>{
 const g=new RaidEngine(),a=join(g),b=join(g,'2','huyen'),c=join(g,'3','linh');
 assert.equal(g.players.size,3);assert.notDeepEqual([a.tx,a.ty],[b.tx,b.ty]);assert.notDeepEqual([c.tx,c.ty],[b.tx,b.ty]);
 for(let i=0;i<150;i++)g.tick(.05);assert.equal(a.state==='run',false);
});
test('tier5 sword casts real skill damage on boss and awards correct donation',()=>{
 const g=new RaidEngine();join(g);const hp=g.hp;
 g.gift('1','1',500,1,'tx-1');assert.ok(g.hp<hp);const after=g.hp;
 assert.equal(g.gift('1','1',500,1,'tx-1'),false);assert.equal(g.hp,after);
 assert.equal(g.players.get('1').diamonds,500);
 assert.ok(g.events.some(e=>e.skillId==='kiem_t5'));
 assert.equal(g.players.get('1').state,'attack','skill 5 must animate the sword actor');
});
test('support class heals real team/actors, no imaginary effects',()=>{
 const g=new RaidEngine();join(g,'1','linh');const p=join(g,'2','kiem');p.hp=25;
 g.gift('1','1',500,1,'support');assert.ok(p.hp>25);assert.ok(g.players.get('1').healing>0);
 assert.equal(g.players.get('1').state,'cast','healer skill must animate the support actor');
});
test('boss phase thresholds exact and fight can end',()=>{
 const g=new RaidEngine();const p=join(g);
 g.hp=49000;g.tick(.05);assert.equal(g.phase,2);
 g.hp=30000;g.tick(.05);assert.equal(g.phase,3);
 g.hp=10000;g.tick(.05);assert.equal(g.phase,4);
 g.damage(10000,p);assert.match(g.result,/THÀNH CÔNG/);
});
test('shield absorbs real damage, over-damage changes boss HP',()=>{
 const g=new RaidEngine();const p=join(g);
 g.shield=100;const hp=g.hp;g.damage(70,p);assert.equal(g.hp,hp);assert.equal(g.shield,30);
 g.damage(90,p);assert.equal(g.shield,0);assert.equal(g.hp,hp-60);
});
test('game loop actually attacks players and boss',()=>{
 const g=new RaidEngine();join(g);const start=g.hp;
 for(let i=0;i<300;i++)g.tick(.05);
 assert.ok(g.hp<start);assert.ok(g.events.some(e=>e.type==='BOSS_IMPACT'));
});
test('leader and donor effects are computed separately',()=>{
 const g=new RaidEngine();let a=join(g),b=join(g,'2');
 g.damage(1100,a);g.gift('2','2',20,1,'gift-2');g.rank();
 assert.equal(a.leader,true);assert.equal(b.guardian,true);
});
