import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectGiftSkill } from './combat.mjs';
test('gift combo uses total value and selects faction ability', () => {
  assert.deepEqual(selectGiftSkill('linh', 10, 2), { tier: 3, name: 'Giải độc', coins: 20 });
  assert.equal(selectGiftSkill('kiem', 499, 1).tier, 4);
  assert.equal(selectGiftSkill('kiem', 500, 1).name, 'Kim Long');
  assert.equal(selectGiftSkill('huyen', 10, 0), null);
});
