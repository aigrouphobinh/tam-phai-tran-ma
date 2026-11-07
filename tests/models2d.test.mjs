import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelAnimator,getPose,ANIMATION_STATES,FACTION_ART} from '../public/models2d.js';

function canvasStub(){
 const gradient=()=>({addColorStop(){}});
 return new Proxy({globalAlpha:1},{
  get(t,k){if(k==='createLinearGradient'||k==='createRadialGradient')return gradient;
   return k in t?t[k]:()=>{};},
  set(t,k,v){t[k]=v;return true}
 });
}

test('every 2D animation state has meaningful, distinct rig movement',()=>{
 assert.deepEqual(ANIMATION_STATES,['idle','run','attack','cast','hit','down','revive','victory']);
 const idle=getPose('idle',.23,1.4,0),run=getPose('run',.23,1.4,0),
  attack=getPose('attack',.23,1.4,0),cast=getPose('cast',.23,1.4,0),
  hit=getPose('hit',.15,1.4,0),down=getPose('down',2,1.4,0),
  revive=getPose('revive',.3,1.4,0);
 assert.notEqual(idle.legL,run.legL);
 assert.notEqual(attack.armR,idle.armR);
 assert.notEqual(cast.armL,idle.armL);
 assert.ok(hit.lean>.1);
 assert.ok(down.fall<-.9);
 assert.ok(revive.fall<0&&revive.fall>down.fall);
 assert.ok(Object.values(FACTION_ART).every(c=>c.primary&&c.light&&c.dark&&c.hair));
});

test('state observer resets the animation clock only on state changes',()=>{
 const m=new ModelAnimator(),p={id:'u1',state:'idle'};
 m.observe(p,1000);assert.equal(m.states.get('u1').since,1000);
 m.observe(p,1500);assert.equal(m.states.get('u1').since,1000);
 p.state='attack';m.observe(p,1600);assert.equal(m.states.get('u1').since,1600);
 m.dropInactive(new Set());assert.equal(m.states.size,0);
});

test('all 3 faction cutout models draw in all 8 animation states',()=>{
 const ctx=canvasStub();
 for(const faction of Object.keys(FACTION_ART))for(const state of ANIMATION_STATES){
  const rig=new ModelAnimator(),p={id:faction+'_'+state,faction,state,scale:.9,hp:100,shield:0,leader:true,guardian:true};
  assert.doesNotThrow(()=>rig.drawPlayer(ctx,p,1.5,100,400,2),faction+' '+state);
  assert.doesNotThrow(()=>rig.drawPlayer(ctx,p,1.8,120,410,2),faction+' '+state+' second frame');
 }
});

test('boss has independent rig drawing across all phases and combat states',()=>{
 const ctx=canvasStub();
 for(let phase=1;phase<=4;phase++)for(const state of ['idle','windup','impact','stun','down']){
  const model=new ModelAnimator(),s={phase,bossState:state,cast:0,hp:state==='down'?0:80000,result:state==='down'?'victory':''};
  assert.doesNotThrow(()=>model.drawBoss(ctx,s,1.5),phase+' '+state);
 }
});
