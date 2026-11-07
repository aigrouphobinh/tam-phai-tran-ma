import test from 'node:test';
import assert from 'node:assert/strict';
import {drawDeformedSprite,motionAt} from '../public/sprite-mesh.js';

const image={naturalWidth:231,naturalHeight:300};
function context(){
 const calls=[];
 return {calls,drawImage(...args){calls.push(args)}};
}
test('all gameplay poses produce stable finite texture transforms',()=>{
 for(const faction of ['kiem','huyen','linh','boss'])
  for(const state of ['idle','run','attack','cast','hit','down','revive','victory','windup','impact','stun','phase']){
   const value=motionAt(state,.23,8.24,faction,.55);
   assert.ok(Object.values(value).every(Number.isFinite),faction+':'+state);
  }
});

test('same timestamp and state generate identical mesh frames',()=>{
 const a=context(),b=context();
 const params={state:'attack',age:.23,t:1.6,style:'kiem',duration:.55};
 assert.equal(drawDeformedSprite(a,image,55,120,77,100,[.5,.97],params),true);
 assert.equal(drawDeformedSprite(b,image,55,120,77,100,[.5,.97],params),true);
 assert.deepEqual(a.calls,b.calls);
 assert.ok(a.calls.length>=14,'draw actual texture multiple times');
 for(const item of a.calls){
  assert.equal(item[0],image);
  assert.ok(item.slice(1).every(Number.isFinite));
 }
});

test('ground anchor remains at same world position, even during attack',()=>{
 const idle=context(),attack=context();
 drawDeformedSprite(idle,image,150,320,80,103,[.5,.97],
  {state:'idle',t:1,age:1,duration:.55});
 drawDeformedSprite(attack,image,150,320,80,103,[.5,.97],
  {state:'attack',t:1,age:.31,duration:.55});
 assert.equal(idle.calls.length,attack.calls.length);
 // The mesh may move horizontally, but its bottom row stays on the original ground baseline.
 const fy=idle.calls.at(-1)[6]+idle.calls.at(-1)[8];
 const gy=attack.calls.at(-1)[6]+attack.calls.at(-1)[8];
 assert.ok(Math.abs(fy-gy)<1);
 const xs=idle.calls.map(a=>a[5]);const newXs=attack.calls.map(a=>a[5]);
 assert.ok(xs.some((n,i)=>Math.abs(n-newXs[i])>.4),'real source pixels have to deform during attack');
});

test('missing bitmap does not draw and can use legacy fallback safely',()=>{
 const c=context();
 assert.equal(drawDeformedSprite(c,{naturalWidth:0,naturalHeight:0},1,2,3,4,[.5,1],{}),false);
 assert.equal(c.calls.length,0);
});
