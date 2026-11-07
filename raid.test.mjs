import test from 'node:test';
import assert from 'node:assert/strict';
import {Raid} from './raid.mjs';
import {giftEvent} from './live.mjs';
test('one finalized combo, one cast, even when the final frame repeats',()=>{
 const seen=new Set(), packet={uniqueId:'abc',giftType:1,groupId:'x',diamondCount:10,repeatCount:2};
 assert.equal(giftEvent(packet,seen),undefined);
 packet.repeatEnd=true;
 const raid=new Raid();raid.input(giftEvent(packet,seen));
 assert.equal(raid.events.at(-1).text,'Vạn kiếm');
 assert.equal(giftEvent(packet,seen),undefined);
});
test('server enforces cooldown and resolves a full round',()=>{
 const raid=new Raid();
 const chat=text=>raid.input({type:'chat',id:'a',name:'A',text});
 chat('!linh');chat('!skill');chat('!skill');
 assert.equal(raid.events.length,2);
 for(let i=0;i<240&&!raid.result;i++)raid.tick();
 assert.ok(raid.result); assert.ok(raid.scores.get('a')>0);
 for(let i=0;i<12;i++)raid.tick();
 assert.equal(raid.round,2);assert.equal(raid.team,1000);
});
test('boss death ends a round and new inputs cannot award extra points',()=>{
 const raid=new Raid();raid.hp=2;
 raid.input({type:'gift',id:'a',name:'A',coins:500,count:1});
 assert.equal(raid.result,'Trấn ma thành công');const score=raid.scores.get('a');
 raid.input({type:'gift',id:'a',name:'A',coins:500,count:1});
 assert.equal(raid.scores.get('a'),score);
});
