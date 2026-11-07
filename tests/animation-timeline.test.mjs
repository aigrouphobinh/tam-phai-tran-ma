import test from 'node:test';
import assert from 'node:assert/strict';
import {RaidEngine} from '../engine.mjs';
import {ModelAnimator,getPose} from '../public/models2d.js';
import {SoundBank} from '../public/audio.js';

const step=(g,seconds)=>{for(let i=0;i<Math.ceil(seconds/.05);i++)g.tick(.05)};

test('basic weapon damage lands after the actor windup, not on state entry',()=>{
 const g=new RaidEngine(),p=g.join('sword','Kiếm Tông','kiem');
 let guard=0;
 while(!p.pendingStrike&&guard++<160)g.tick(.05);
 assert.ok(p.pendingStrike,'sword must schedule an authoritative collision');
 assert.equal(p.state,'attack');
 assert.equal(g.hp,g.maxHP,'no damage before strike');
 const started=p.actionAt,seq=p.actionSeq,impact=p.pendingStrike.at;
 assert.ok(impact>started);
 step(g,.10);
 assert.equal(g.hp,g.maxHP,'no premature hit');
 step(g,.20);
 assert.ok(g.hp<g.maxHP,'real damage happens at collision');
 assert.ok(g.events.some(e=>e.type==='BASIC_ATTACK_START'&&e.actionSeq===seq));
 assert.ok(g.events.some(e=>e.type==='DAMAGE'&&e.source==='basic'));
});

test('gift overrides a pending auto hit and restarts an identical attack animation',()=>{
 const g=new RaidEngine(),p=g.join('sword','Kiếm Tông','kiem');
 let tries=0;while(!p.pendingStrike&&tries++<160)g.tick(.05);
 const actionSeq=p.actionSeq;
 assert.equal(g.gift(p.id,p.name,500,1,'g1'),true);
 assert.equal(p.pendingStrike,null,'no phantom queued sword hit over a major gift cinematic');
 assert.ok(p.actionSeq>actionSeq,'a new attack starts even if state remains attack');
 assert.equal(p.state,'attack');assert.equal(p.actionDuration,1.15);
 assert.ok(g.events.some(e=>e.type==='SKILL_CAST'&&e.tier===5));
});

test('boss shield, stun, impact and hit each have independent action revisions',()=>{
 const g=new RaidEngine(),p=g.join('a','A','kiem');
 const seq=g.bossActionSeq;
 g.damage(15,p,'test');
 assert.equal(g.bossState,'hit');assert.ok(g.bossActionSeq>seq);
 g.hp=49000;g.tick(.05);
 g.nextShield=g.elapsed;g.tick(.05);
 assert.ok(g.cast);assert.equal(g.bossState,'windup');
 const shielding=g.bossActionSeq;
 g.damage(g.shield,p,'skill');
 assert.equal(g.bossState,'stun');assert.ok(g.bossActionSeq>shielding);
 assert.ok(g.events.some(e=>e.type==='SHIELD_BROKEN'));
});

test('repeated same-state rig actions replay from new action id, not SSE frequency',()=>{
 const m=new ModelAnimator();
 const p={id:'same',state:'attack',actionSeq:21,actionAt:15.2,actionDuration:.55};
 m.observe(p,10000,15.4);
 const original=m.states.get('same');
 assert.ok(Math.abs(original.since-9800)<.1,'client starts at server phase');
 m.observe({...p},10200,15.6);
 assert.equal(m.states.get('same').since,original.since);
 m.observe({...p,actionSeq:22,actionAt:15.6},10400,15.6);
 assert.equal(m.states.get('same').since,10400,'new cast resets arm motion');
});

test('anticipation, strike, and recovery are different real skeleton poses',()=>{
 const t=1,seed=.3;
 const wind=getPose('attack',.10,t,seed,.55);
 const hit=getPose('attack',.30,t,seed,.55);
 const recover=getPose('attack',.55,t,seed,.55);
 assert.ok(wind.armR<-.2,'arm raises before slash');
 assert.ok(hit.armR>0.6,'arm swings across target');
 assert.ok(Math.abs(recover.armR-.08)<.1,'arm returns to idle after slash');
 const cast=getPose('cast',.3,t,seed,1.15);
 assert.ok(cast.armL<-.6&&cast.armR<-.7,'casting uses both arms');
});

test('audible windup and impact select correct faction sound files',()=>{
 const bank=new SoundBank(),played=[];
 bank.play=(name)=>{played.push(name)};
 for(const f of ['kiem','huyen','linh']){
  bank.effect({type:'BASIC_ATTACK_START',faction:f,x:110});
  bank.effect({type:'DAMAGE',faction:f,source:'basic',x:410});
 }
 assert.deepEqual(played,['sword_whoosh','sword_impact','magic_seal','lightning','heal_lotus','magic_seal']);
});
