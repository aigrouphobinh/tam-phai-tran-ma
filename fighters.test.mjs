import test from 'node:test';
import assert from 'node:assert/strict';
import {Raid} from './raid.mjs';

for (const faction of ['kiem','huyen','linh']) {
  test(faction+' walks into range, prepares and hits once through shield',()=>{
    const raid=new Raid();
    raid.join('viewer','Vân',faction);
    const p=raid.players.get('viewer');
    raid.tick();
    assert.ok(p.x>8);
    for(let ticks=0;ticks<12 && p.action!=='windup';ticks++)raid.tick();
    assert.equal(p.action,'windup');
    assert.equal(raid.hp,3000);
    assert.equal(p.score,0);
    raid.shield=2;
    raid.tick();
    assert.equal(p.action,'strike');
    assert.equal(raid.shield,0);
    assert.equal(p.score,3002-raid.hp);
    const hp=raid.hp;
    raid.tick();
    assert.equal(p.action,'recover');
    assert.equal(raid.hp,hp);
  });
}
