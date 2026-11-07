// Tam Phai Tran Ma — runtime 2D cutout rigs.
// Every model is constructed from separately animated limbs, cloth, head, hair, and equipment.
// Draw-time only: gameplay damage and player positions remain server authoritative.
export const ANIMATION_STATES=Object.freeze(['idle','run','attack','cast','hit','down','revive','victory']);
export const FACTION_ART=Object.freeze({
 kiem:{primary:'#276eae',light:'#83ddff',dark:'#152445',metal:'#f7d48e',hair:'#18263b',face:'#f7cfb4',role:'SWORD'},
 huyen:{primary:'#8737a4',light:'#dba0ff',dark:'#2b1948',metal:'#f1c779',hair:'#24152f',face:'#f4c1b0',role:'TALISMAN'},
 linh:{primary:'#258668',light:'#9df5c2',dark:'#133d39',metal:'#e8dfa0',hair:'#163b33',face:'#f7d6be',role:'LOTUS'}
});
const TAU=Math.PI*2,lim=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,f)=>a+(b-a)*f;
const ease=x=>{const v=lim(x);return v*v*(3-2*v)};
const pulse=(x,a,b)=>ease((x-a)/(b-a))* (1-ease((x-b)/(1-b)));
function path(g,pts,fill,stroke=null,width=1){
 g.beginPath();for(let i=0;i<pts.length;i++){const p=pts[i];if(i===0)g.moveTo(...p);else if(p.length===2)g.lineTo(...p);else if(p.length===6)g.bezierCurveTo(...p)}g.closePath();
 if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke()}
}
function oval(g,x,y,rx,ry,c){g.beginPath();g.ellipse(x,y,Math.max(.001,rx),Math.max(.001,ry),0,0,TAU);g.fillStyle=c;g.fill()}
function stroke(g,points,col,w=2,shadow=0){
 g.save();g.strokeStyle=col;g.lineWidth=w;g.lineCap='round';g.lineJoin='round';
 if(shadow){g.shadowColor=col;g.shadowBlur=shadow}g.beginPath();g.moveTo(...points[0]);
 for(const p of points.slice(1))g.lineTo(...p);g.stroke();g.restore()
}
function aura(g,x,y,r,col,opacity=.3){
 g.save();const grad=g.createRadialGradient(x,y,1,x,y,r);grad.addColorStop(0,col);grad.addColorStop(1,'transparent');
 g.fillStyle=grad;g.globalAlpha=opacity;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.restore()
}
function ornament(g,x,y,col,n=5,r=7,rotation=0){
 g.save();g.translate(x,y);g.rotate(rotation);
 for(let i=0;i<n;i++){g.save();g.rotate(i*TAU/n);g.beginPath();g.moveTo(0,-1);g.bezierCurveTo(-r*.35,-r*.75,-r*.35,-r*1.65,0,-r*1.95);g.bezierCurveTo(r*.35,-r*1.65,r*.35,-r*.75,0,-1);g.fillStyle=col;g.fill();g.restore()}
 oval(g,0,0,2.8,2.8,'#ffefc8');g.restore()
}
function spark(g,x,y,r,col){stroke(g,[[x-r,y],[x+r,y]],col,1.2,5);stroke(g,[[x,y-r],[x,y+r]],col,1.2,5);oval(g,x,y,1.4,1.4,'#fff')}
// All combat animation phases are deterministic curves, not random poses.
// Attack: 0–25% anticipation, 25–56% impact, 56–100% follow-through & recovery.
// Cast: 0–30% channel, 30–64% hold, 64–100% release and recovery.
export function getPose(state='idle',age=0,t=0,seed=0,duration=.42){
 const c=Math.sin(t*2.6+seed),step=Math.sin(t*15+seed);
 const d=duration>0?duration:.42,u=lim(age/d);
 const burst=(x,a,b,c)=>x<a?0:x<b?ease((x-a)/(b-a)):x<c?1-ease((x-b)/(c-b)):0;
 const idle={bob:c*.9,lean:c*.012,legL:c*.016,legR:-c*.016,armL:-.05,armR:.08,
  head:c*.015,coat:c*1.3,weapon:c*.07,fall:0,opacity:1,light:0};
 switch(state){
  case 'run':
   return {...idle,bob:Math.abs(step)*2.3,lean:.16,legL:step*.68,legR:-step*.68,
    armL:-step*.48,armR:step*.48,head:-.08,coat:step*4.5};
  case 'attack':{
   const anticipation=ease(u/.25),strike=ease((u-.25)/.31),recover=ease((u-.56)/.44);
   const armR=mix(mix(.08,-1.2,anticipation),1.5,strike);
   const blade=mix(-.6,1.1,strike);
   return {...idle,bob:-2.5*burst(u,.12,.48,.85),lean:-.19*burst(u,.06,.42,.92),
    legL:.25*(1-recover),legR:-.22*(1-recover),armL:-.4*(1-recover),
    armR:mix(armR,.08,recover),head:-.1*(1-recover),coat:9*burst(u,.2,.52,1),
    weapon:mix(blade,0,recover),light:burst(u,.3,.45,.78)};
  }
  case 'cast':
  case 'phase':{
   const raise=ease(u/.30),drop=ease((u-.64)/.36);
   const amount=state==='phase'?1.2:1;
   return {...idle,bob:-2.5*burst(u,.05,.32,.92),lean:-.09*amount,
    armL:mix(mix(-.05,-1.8*amount,raise),-.05,drop),
    armR:mix(mix(.08,-2.0*amount,raise),.08,drop),
    head:-.14*(1-drop),coat:4.5*burst(u,.1,.54,1),
    weapon:-.4*(1-drop),light:burst(u,.12,.46,.96)};
  }
  case 'hit':
   return {...idle,bob:2,lean:.33*(1-ease(u)),head:.18*(1-ease(u)),
    armL:.8*(1-ease(u)),armR:.6*(1-ease(u)),
    coat:-6*(1-ease(u)),light:1-ease(u)};
  case 'down':{
   const fall=ease(lim(age/.48));
   return {...idle,bob:mix(0,8,fall),fall:-1.28*fall,
    armR:mix(.08,1.4,fall),armL:mix(-.05,-.8,fall),
    legL:.6*fall,legR:-.4*fall,opacity:1-.22*fall};
  }
  case 'revive':{
   const rise=ease(lim(age/1.1));
   return {...idle,bob:mix(11,-3,rise),fall:mix(-1.28,0,rise),
    armR:mix(.8,-1.5,rise),armL:mix(-.7,-1.3,rise),
    opacity:mix(.45,1,rise),light:1-rise*.45};
  }
  case 'victory':
   return {...idle,bob:-2+Math.abs(Math.sin(t*5))*2,
    armR:-2.4+Math.sin(t*7)*.19,armL:-.9,legL:.1,light:.6};
  default:return idle;
 }
}
export class ModelAnimator{
 constructor(){this.states=new Map();this.boss={state:'idle',seq:0,since:0,duration:.42}}
 observe(p,at=performance.now(),serverElapsed=null){
  const old=this.states.get(p.id);
  const state=p.state||'idle',seq=p.actionSeq??state;
  // Preserve the pose across 10 Hz snapshots and restart it for repeated same-state attacks.
  if(!old||old.state!==state||old.seq!==seq){
   const offset=Number.isFinite(serverElapsed)&&Number.isFinite(p.actionAt)
     ?lim(serverElapsed-p.actionAt,0,4):0;
   this.states.set(p.id,{state,seq,since:at-offset*1000,
     duration:p.actionDuration>0?p.actionDuration:.42,seed:hash(p.id)*.1});
  }
 }
 observeBoss(s,at=performance.now(),serverElapsed=null){
  const next=s?.result?(s.hp<=0?'down':'victory'):
   (s?.bossState==='stun'?'stun':s?.cast>0?'windup':(s?.bossState||'idle'));
  const seq=s?.bossActionSeq??next;
  if(next!==this.boss.state||seq!==this.boss.seq){
   const offset=Number.isFinite(serverElapsed)&&Number.isFinite(s?.bossActionAt)
     ?lim(serverElapsed-s.bossActionAt,0,4):0;
   this.boss={state:next,seq,since:at-offset*1000,
     duration:s?.bossActionDuration>0?s.bossActionDuration:.55};
  }
 }
 dropInactive(ids){for(const id of this.states.keys())if(!ids.has(id))this.states.delete(id)}
 drawPlayer(g,p,t,x=p.x,y=p.y,zoom=1){
  this.observe(p);
  const track=this.states.get(p.id),age=Math.max(0,t-track.since/1000);
  const pose=getPose(track.state,age,t,track.seed,track.duration);
  const art=FACTION_ART[p.faction]||FACTION_ART.kiem;
  const sz=(p.scale??.82)*zoom;
  g.save();g.translate(x,y);g.scale(sz,sz);g.globalAlpha*=pose.opacity;
  if(p.hp<=0&&p.state==='down')oval(g,0,1,32,6,'#12102199');
  else oval(g,0,2,23,5,'#0b1120b0');
  if(p.shield>0){g.save();g.strokeStyle='#9cddff';g.globalAlpha=.57;g.shadowColor='#6ddfff';g.shadowBlur=9;g.lineWidth=1.5;
   g.beginPath();g.ellipse(0,-42,25,47,0,0,TAU);g.stroke();g.restore()}
  if(p.leader||p.guardian){aura(g,0,-50,55,p.leader?'#ffcc66':art.light,.4);
   g.save();g.strokeStyle=p.leader?'#f5c86a':art.light;g.globalAlpha=.6;g.lineWidth=1.5;
   g.beginPath();g.ellipse(0,0,23+Math.sin(t*4)*2,8,0,0,TAU);g.stroke();g.restore()}
  g.translate(0,pose.bob);
  g.rotate(pose.fall);
  g.rotate(pose.lean);
  // Distinct rear hair silhouettes, independent of head rotation.
  drawHairBack(g,art,p.faction,t,pose);
  drawCape(g,art,p.faction,pose,t);
  limbLeg(g,-7,-23,pose.legL,art,t);
  limbLeg(g,7,-23,pose.legR,art,t);
  // Back arm and robe; arm pivots at shoulder.
  limbArm(g,-13,-53,pose.armL,art,p.faction,false,pose,t);
  torso(g,art,p.faction,t,pose);
  head(g,art,p.faction,pose,t);
  limbArm(g,13,-53,pose.armR,art,p.faction,true,pose,t);
  if(p.faction==='huyen'&&track.state==='cast'){
   g.save();g.globalAlpha=.7+pose.light*.3;
   for(let i=0;i<3;i++){const q=t*2.4+i*TAU/3;drawTalisman(g,Math.cos(q)*29,-50+Math.sin(q)*13,art.light,q*.2)}
   g.restore();
  }
  if(p.faction==='linh'&&(track.state==='cast'||track.state==='revive')){aura(g,21,-61,24,art.light,.48);
   ornament(g,22,-62,'#c2ffda',6,7,t*.6)}
  if(track.state==='attack'&&p.faction==='kiem'&&pose.light>.1){
   g.save();g.globalAlpha=pose.light;stroke(g,[[3,-75],[35,-94],[56,-77]],'#72d8ff',2.8,11);g.restore()}
  if(track.state==='hit'){g.globalCompositeOperation='screen';g.globalAlpha=.25*(1-ease(lim(age/.42)));
   oval(g,0,-45,25,43,'#ff7a89')}
  if(p.leader){g.save();g.shadowColor='#f9bf54';g.shadowBlur=6;g.font='19px serif';g.textAlign='center';
    g.fillStyle='#ffdb72';g.fillText('♛',0,-100);g.restore()}
  if(p.guardian){spark(g,18,-91,5,'#ffdb82')}
  g.restore();
 }
 drawBoss(g,s,t){
  this.observeBoss(s);
  const age=Math.max(0,t-this.boss.since/1000),bossState=this.boss.state;
  const cast=bossState==='windup'||s.cast>0,stun=bossState==='stun';
  const impact=bossState==='impact';
  const state=bossState==='down'?'down':bossState==='victory'?'victory':bossState==='phase'?'phase':cast?'cast':stun||bossState==='hit'?'hit':impact?'attack':'idle';
  const p=getPose(state,age,t,.6,this.boss.duration);
  const enraged=s.phase>=4;
  const xx=404+(stun?Math.sin(t*32)*5:0),yy=551+p.bob*2;
  g.save();g.translate(xx,yy);
  // Multi-ring magic circle, explicitly tied to boss cast and phase.
  g.save();g.scale(1,.35);g.lineWidth=1.5;g.strokeStyle=enraged?'#ff4671':'#b679ee';
  g.shadowColor=g.strokeStyle;g.shadowBlur=16;
  for(let r=57;r<=90;r+=17){g.beginPath();g.ellipse(0,0,r+Math.sin(t*3)*2,r,0,0,TAU);g.stroke()}
  for(let i=0;i<12;i++){const a=i*TAU/12+t*.22;
   spark(g,Math.cos(a)*75,Math.sin(a)*75,3,'#ffc4db')}g.restore();
  if(cast)aura(g,0,-169,160,enraged?'#fc3677':'#dc3d93',.32+Math.sin(t*9)*.10);
  g.scale(2.24,2.24);g.rotate(p.fall*.55);
  // Animated ribbons, back hair, layered skirt/cape.
  for(let k=0;k<5;k++){
   const sway=Math.sin(t*2.2+k*1.7)*8,xx=-18-k*5;
   path(g,[[xx,-80],[xx-32+sway,-74],[xx-32+sway,-45],[xx-53+sway,4],
    [xx-5+sway,-35],[xx+10,-73]],k%2?'#b82351aa':'#e04c6daa','#fa779299',.7)}
  drawBossBackHair(g,t);
  bossLeg(g,-10,-37,t,.13);bossLeg(g,8,-38,t,-.09);
  // Flowing embroidered front skirt with actual oscillating hems.
  const skirt=g.createLinearGradient(0,-84,0,1);skirt.addColorStop(0,'#8c1e44');skirt.addColorStop(.5,'#dc3d61');skirt.addColorStop(1,'#43163d');
  path(g,[[-24,-83],[-25,-34],[-38+Math.sin(t*3)*5,0],[-9,-4],[3,-37],[13,0],[38+Math.sin(t*2.3)*7,1],[26,-54],[21,-81]],
   skirt,'#f2bd7a',1.2);
  stroke(g,[[-13,-82],[-18,-30],[-25,-9]],'#e6ad6c',1.2);
  stroke(g,[[12,-77],[20,-27],[28,-5]],'#d69758',1.4);
  // Torso breastplate separate from arms.
  const armor=g.createLinearGradient(-25,-118,24,-73);armor.addColorStop(0,'#351333');armor.addColorStop(.5,'#c63859');armor.addColorStop(1,'#621739');
  path(g,[[-20,-111],[0,-120],[20,-110],[17,-78],[2,-67],[-20,-82]],armor,'#ecb66e',1.6);
  for(const side of [-1,1]){path(g,[[side*3,-103],[side*15,-112],[side*20,-101],[side*9,-91]],'#ce3155','#f9c67c',1.1)}
  ornament(g,0,-82,'#ffcf79',4,3,t*.2);
  bossArm(g,-22,-110,cast?-1.35:Math.sin(t*1.9)*.18,false,t);
  bossHead(g,t,p,cast,enraged);
  bossArm(g,23,-111,impact?1.0:cast?-2.15:Math.sin(t*2.1)*.14,true,t);
  if(enraged){aura(g,0,-103,76,'#f51e64',.3);spark(g,25,-152,6,'#ffb1c9')}
  if(stun){g.save();g.globalAlpha=.6;for(let i=0;i<4;i++){const a=t*6+i*TAU/4;
   spark(g,Math.cos(a)*31,-136+Math.sin(a)*7,4,'#efd1ff')}g.restore()}
  g.restore();
 }
}
function hash(s){let v=0;for(const c of String(s))v=(Math.imul(v,31)+c.charCodeAt(0))|0;return Math.abs(v%1000)}
function limbLeg(g,hx,hy,rot,a,t){
 g.save();g.translate(hx,hy);g.rotate(rot);const grad=g.createLinearGradient(0,0,0,24);
 grad.addColorStop(0,a.primary);grad.addColorStop(1,a.dark);
 path(g,[[-5,-2],[5,-2],[6,18],[3,25],[-5,23]],grad,a.metal,.7);
 path(g,[[-5,19],[5,19],[8,25],[7,27],[-8,27]],a.dark,a.light,.7);
 stroke(g,[[-2,1],[-2,16]],a.light,.7);g.restore()
}
function drawCape(g,a,f,p,t){
 const w=Math.sin(t*3.1)*3+p.coat*.65;
 path(g,[[-12,-60],[-17,-58],[-21+w,-32],[-34+w,-4],[-8+w*.2,-13],[7,-42],[24+w,-7],
  [22,-38],[13,-59]],f==='kiem'?'#13396d':f==='huyen'?'#3e1c72':'#1b6954',a.light,.8);
 for(let i=0;i<3;i++)stroke(g,[[-15+i*14,-53],[-17+i*12+w*.35,-27],[-20+i*12+w,-8]],a.light,.65)
}
function drawHairBack(g,a,f,t,p){
 const w=Math.sin(t*3)*3+p.coat*.35;
 if(f==='kiem'){path(g,[[-7,-81],[9,-82],[7,-66],[13+w,-45],[3+w,-57],[-7,-69]],a.hair,'#50709a',1)}
 else if(f==='huyen'){path(g,[[-13,-83],[13,-85],[20+w,-23],[8+w,-31],[0,-62],[-10+w,-35],[-21+w,-22]],a.hair,a.primary,.8)}
 else{path(g,[[-11,-84],[12,-82],[19+w,-9],[5+w,-24],[0,-55],[-14+w,-18],[-20+w,-5]],a.hair,'#4eac92',.8)}
}
function torso(g,a,f,t,p){
 const body=g.createLinearGradient(-14,-65,15,-24);body.addColorStop(0,a.dark);body.addColorStop(.48,a.primary);body.addColorStop(1,a.dark);
 path(g,[[-13,-61],[12,-61],[14,-39],[15+p.coat*.35,-20],[0,-15],[-15+p.coat*.3,-20],[-14,-39]],body,a.light,1.2);
 path(g,[[-7,-59],[1,-47],[8,-59],[11,-55],[2,-37],[-5,-39],[-10,-56]],'#f0d9b5',a.metal,.6);
 if(f==='kiem'){
  path(g,[[-16,-61],[-7,-67],[-1,-59],[-11,-53]],'#cdb780','#fff0cb',1.2);
  path(g,[[8,-60],[16,-65],[21,-55],[10,-50]],'#cab072','#ffedb6',1.2);
  stroke(g,[[-6,-34],[7,-34]],'#fbd48b',2);
  path(g,[[-7,-38],[8,-38],[6,-25],[-8,-25]],'#183357','#e6b471',1.2);
 }else if(f==='huyen'){
  path(g,[[-5,-60],[0,-36],[5,-60]],'#e8c89b',a.metal,.7);
  for(let i=-1;i<=1;i++)oval(g,i*5,-29,1.3,1.3,'#e3a2ff');
  stroke(g,[[-10,-21],[8,-21]],'#a757cd',2);
 }else{
  path(g,[[-10,-58],[0,-47],[10,-58],[0,-35]],'#dbf4da',a.metal,1);
  ornament(g,0,-40,'#82ffc2',5,3,Math.sin(t)*.1);
  stroke(g,[[-11,-25],[11,-25]],'#e9dca2',1.7);
 }
}
function limbArm(g,x,y,angle,a,f,right,p,t){
 g.save();g.translate(x,y);g.rotate(angle);
 const handRight=right?1:-1;const sleeve=g.createLinearGradient(-7,0,10,24);
 sleeve.addColorStop(0,a.primary);sleeve.addColorStop(1,a.dark);
 path(g,[[-5,0],[5,0],[10,14],[11,21],[-9,20],[-11,14]],sleeve,a.light,1.1);
 path(g,[[-8,15],[11,15],[11,19],[-8,19]],a.metal,null);
 oval(g,0,23,4.2,5,a.face);
 if(right){
  if(f==='kiem'){
   g.save();g.translate(0,24);g.rotate(p.weapon-.12);
   path(g,[[-3,-3],[3,-3],[3,-15],[1,-17],[-1,-15]],'#cb9d61','#fdeab3',.7);
   stroke(g,[[-12,-14],[11,-14]],'#f1d38a',2.3);
   const blade=g.createLinearGradient(0,-44,0,-13);blade.addColorStop(0,'#edffff');blade.addColorStop(.5,'#5cceff');blade.addColorStop(1,'#346fc4');
   path(g,[[-3,-16],[3,-16],[4,-54],[0,-63],[-4,-54]],blade,'#daffff',1);
   aura(g,0,-37,11,'#4dc9ff',p.light*.85);g.restore();
  }else if(f==='huyen'){
   g.save();g.translate(0,24);g.rotate(p.weapon*.5);
   drawTalisman(g,0,-12,'#efceff',Math.sin(t*4)*.09);g.restore();
  }else{
   g.save();g.translate(0,25);g.rotate(p.weapon);
   stroke(g,[[0,0],[4,-38]],'#e3cc83',3.1);
   ornament(g,4,-39,'#a7ffcd',6,6,t*.2);
   g.restore()
  }
 }
 g.restore()
}
function drawTalisman(g,x,y,color,rot=0){
 g.save();g.translate(x,y);g.rotate(rot);g.shadowColor='#a85cff';g.shadowBlur=6;
 path(g,[[-6,-12],[6,-12],[6,12],[0,9],[-6,12]],'#d9a4ef',color,1);
 stroke(g,[[-2,-8],[2,-2],[-2,2],[3,7]],'#8c268d',1);g.restore()
}
function head(g,a,f,p,t){
 g.save();g.translate(0,-75);g.rotate(p.head);
 oval(g,0,1,10,12,a.face);
 oval(g,-3,0,1.3,1.2,'#352238');oval(g,4,0,1.3,1.2,'#352238');
 stroke(g,[[-1,7],[3,7]],'#b8657a',.9);
 const hair=a.hair;
 path(g,[[-11,-1],[-11,-11],[-6,-17],[5,-17],[12,-12],[12,1],[7,-10],[-2,-10]],hair,null);
 if(f==='kiem'){
  path(g,[[-9,-8],[-4,-18],[3,-21],[10,-13],[3,-14],[-5,-9]],hair,'#4f7096',.8);
  stroke(g,[[-8,-14],[9,-14]],'#f7c879',2.0);
  path(g,[[-1,-17],[4,-22],[7,-17]],'#f1d286',null);
 }else if(f==='huyen'){
  path(g,[[-15,-6],[-11,-19],[0,-24],[10,-18],[16,-5],[7,-13],[-3,-15]],hair,a.primary,.8);
  path(g,[[-12,-16],[0,-22],[12,-16]],'#a95fc8','#f7d993',1);
  spark(g,0,-24,4,'#eecbff');
 }else{
  path(g,[[-13,-4],[-9,-19],[5,-21],[13,-7],[7,-13],[-5,-10]],hair,'#4bb18c',1);
  ornament(g,5,-18,'#a0ffd0',5,4,t*.2);
  path(g,[[-12,-13],[-7,-21],[-3,-18]],'#a9d6a1',null);
 }
 g.restore()
}
function bossLeg(g,x,y,t,offset){
 g.save();g.translate(x,y);g.rotate(offset+Math.sin(t*1.9)*.03);
 path(g,[[-5,0],[5,0],[8,31],[4,40],[-6,41]],'#a92450','#f3b26d',.9);
 path(g,[[-5,36],[7,36],[10,41],[7,44],[-9,44]],'#3a1432','#efae68',.7);g.restore()
}
function drawBossBackHair(g,t){
 path(g,[[-23,-137],[-16,-161],[19,-162],[35,-139],[31,-102],
  [46+Math.sin(t*2)*5,-50],[25,-78],[9,-125],[-12,-90],[-31+Math.sin(t*2.1)*7,-41],[-34,-105]],
  '#1d122e','#b3446b',1.2);
 for(let k=0;k<4;k++){const x=-18+k*12;
  stroke(g,[[x,-145],[x+Math.sin(t*2.6+k)*6,-106],[x-9+Math.sin(t*2+k)*8,-45]],'#8b2f65',1.3)}
}
function bossArm(g,x,y,rot,right,t){
 g.save();g.translate(x,y);g.rotate(rot);
 const satin=g.createLinearGradient(-12,0,12,32);satin.addColorStop(0,'#811c46');satin.addColorStop(1,'#e64765');
 path(g,[[-8,-3],[8,0],[12,15],[21+Math.sin(t*2.4)*5,38],
  [-13,32],[-11,13]],satin,'#efae78',1.3);
 oval(g,2,29,5,6,'#e9aa9d');
 if(right){
  // Full scythe is rigged to the wrist, not painted into the boss portrait.
  g.save();g.translate(2,31);g.rotate(.12+Math.sin(t*1.2)*.05);
  stroke(g,[[0,52],[5,0],[14,-66]],'#251c2d',5);
  stroke(g,[[0,52],[5,0],[14,-66]],'#ffd69e',2);
  const metal=g.createLinearGradient(-41,-120,46,-54);
  metal.addColorStop(0,'#ffd9b8');metal.addColorStop(.4,'#ed4a81');metal.addColorStop(1,'#6e144b');
  path(g,[[14,-67],[38,-114],[-15,-131],[-47,-116],[-23,-114],[9,-102],[20,-81],
    [-24,-111],[-6,-105]],metal,'#ffbf99',1.7);
  aura(g,8,-80,19,'#f83975',.36);g.restore()
 }else{
  g.save();g.translate(0,30);ornament(g,0,0,'#f15089',8,11,t*.6);
  aura(g,0,0,19,'#ff529c',.65);g.restore()
 }
 g.restore()
}
function bossHead(g,t,p,cast,enraged){
 g.save();g.translate(0,-145);g.rotate(p.head+Math.sin(t*1.6)*.04);
 oval(g,0,0,14,18,'#f0b8aa');
 stroke(g,[[-8,-2],[-2,-4]],'#5f1d40',1.1);
 stroke(g,[[4,-4],[10,-2]],'#5f1d40',1.1);
 oval(g,-6,-2,1.8,1.3,'#6f1c41');oval(g,7,-2,1.8,1.3,'#6f1c41');
 stroke(g,[[-3,11],[6,10]],'#b03860',1.6);
 path(g,[[-15,-4],[-16,-23],[-9,-30],[6,-29],[19,-17],[16,3],[9,-16],[2,-22],[-8,-12]],'#24112c','#bb466d',1.2);
 // Ornamental gold blossom crown and red crystal.
 path(g,[[-18,-17],[-12,-32],[-6,-23],[1,-37],[6,-25],[14,-31],[18,-15]],'#e7a864','#ffe1a8',1.2);
 ornament(g,17,-23,'#f65283',6,5,-t*.3);
 spark(g,1,-22,4,enraged?'#ff5164':'#ffe4a6');
 if(cast){aura(g,-2,1,22,'#ff61a3',.2)}
 g.restore()
}
