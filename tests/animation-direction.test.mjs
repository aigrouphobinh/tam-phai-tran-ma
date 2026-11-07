import test from 'node:test';
import assert from 'node:assert/strict';
import {ANIMATION_TRACKS,validateDirectionTracks,profileFor,sampleDirection}
 from '../public/animation-direction.js';

test('direction profiles cover 4 real characters and all core animation states',()=>{
 assert.equal(validateDirectionTracks(),true);
 const main=['idle','run','attack','cast','hit','down','revive','victory'];
 for(const actor of ['kiem','huyen','linh','boss']){
  for(const state of main){
   const clip=profileFor(actor,state);
   assert.ok(clip.duration>0&&clip.keys.length>=2,actor+':'+state);
   assert.equal(clip.keys[0].at,0);
   assert.equal(clip.keys.at(-1).at,1);
   for(const k of clip.keys)for(const field of
    ['x','y','tilt','upper','mid','lower','stretch','glow'])
    assert.ok(Number.isFinite(k[field]),actor+':'+state+':'+field);
  }
 }
 for(const bossState of ['windup','impact','stun','phase'])
  assert.ok(profileFor('boss',bossState).keys.length>=2);
});

test('sword attack has obvious prep, impact and recovery poses',()=>{
 const clip=profileFor('kiem','attack');
 const prep=sampleDirection('kiem','attack',.28*clip.duration,0);
 const contact=sampleDirection('kiem','attack',.44*clip.duration,0);
 const end=sampleDirection('kiem','attack',clip.duration,0);
 assert.ok(prep.upper<-.8,'windup draws weapon back');
 assert.ok(contact.upper>2,'contact thrusts forward');
 assert.ok(contact.x>prep.x,'character follows through');
 assert.ok(Math.abs(end.tilt)<.01,'returns to baseline');
 assert.ok(clip.cues.some(c=>c.type==='sword-contact'&&Math.abs(c.at-.44)<.01));
});

test('mage, healer and boss use their own spell timings and silhouettes',()=>{
 const mage=profileFor('huyen','cast'),heal=profileFor('linh','cast'),boss=profileFor('boss','windup');
 assert.notEqual(mage.duration,heal.duration);
 assert.ok(mage.cues.some(c=>c.type==='seal-lock'));
 assert.ok(heal.cues.some(c=>c.type==='heal-pulse'));
 assert.ok(boss.cues.some(c=>c.type==='boss-telegraph-full'));
 const lightning=sampleDirection('huyen','cast',.66*mage.duration,5);
 const bloom=sampleDirection('linh','cast',.65*heal.duration,5);
 assert.ok(lightning.upper<0&&bloom.glow>.75);
});

test('state loop wraps smoothly and nonloops hold final pose',()=>{
 const idle=profileFor('kiem','idle');
 const a=sampleDirection('kiem','idle',.25*idle.duration,0);
 const b=sampleDirection('kiem','idle',1.25*idle.duration,0);
 assert.equal(a.progress,b.progress);
 const attack=profileFor('kiem','attack');
 const c=sampleDirection('kiem','attack',5*attack.duration,0);
 assert.equal(c.progress,1);
 assert.ok(Math.abs(c.x)<.01);
});

test('manifests have ordered keyframes; malformed tracks are rejected',()=>{
 const clone=structuredClone(ANIMATION_TRACKS);
 clone.kiem.attack.keys[2].at=clone.kiem.attack.keys[1].at;
 assert.throws(()=>validateDirectionTracks(clone),/unordered keys/);
 const clone2=structuredClone(ANIMATION_TRACKS);
 clone2.linh.cast.keys[1].upper=Infinity;
 assert.throws(()=>validateDirectionTracks(clone2),/invalid value/);
});

test('animation direction is visual-only and does not change raid damage',async()=>{
 const {RaidEngine}=await import('../engine.mjs');
 const g=new RaidEngine(),actor=g.join('p','P','kiem');
 const hp=g.hp,pose=sampleDirection('kiem','attack',.35,1);
 assert.equal(g.hp,hp);
 assert.equal(actor.hp,100);
 assert.ok(pose.upper!==0);
});
