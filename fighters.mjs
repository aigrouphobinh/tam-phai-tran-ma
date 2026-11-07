// Ground positions in the 540 × 960 arena. Distances include lane depth.
const boss = { x: 370, y: 465 };
const styles = {
  kiem:  { reach: 64,  speed: 80, cooldown: 2, power: 9 },
  huyen: { reach: 165, speed: 60, cooldown: 3, power: 12 },
  linh:  { reach: 215, speed: 52, cooldown: 3, power: 6 }
};

export function deploy(faction, slot) {
  const lane = slot % 8;
  const angle = (lane - 3.5) * 0.18;
  const distance = styles[faction].reach - 4 - (Math.floor(slot / 8) % 5) * 5;
  return {
    x: 8, y: 420 + lane * 16,
    destX: boss.x - Math.cos(angle) * distance,
    destY: boss.y + Math.sin(angle) * distance,
    action: 'walk', nextStrike: 0, lastHit: 0
  };
}

export function advance(p, second, damage) {
  p.lastHit = 0;
  const style = styles[p.faction];
  const dx = p.destX - p.x, dy = p.destY - p.y;
  const distance = Math.hypot(dx, dy);
  if (distance > 0.01) {
    const step = Math.min(1, style.speed / distance);
    p.x += dx * step;
    p.y += dy * step;
    p.action = 'walk';
    return;
  }
  if (Math.hypot(p.x - boss.x, p.y - boss.y) > style.reach) return;
  if (p.action === 'windup') {
    p.lastHit = damage(style.power);
    p.score += p.lastHit;
    p.nextStrike = second + style.cooldown;
    p.action = 'strike';
  } else {
    p.action = second >= p.nextStrike ? 'windup' : 'recover';
  }
}
