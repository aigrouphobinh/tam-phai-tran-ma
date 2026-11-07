// Tam Phai Tran Ma — authoritative deterministic (except seeded raid variation) combat simulation.
// Rendering receives snapshots/events; it never computes game damage.
const CLASSES={
  kiem:{name:'Kiếm Tông',speed:78,range:155,damage:155,cooldown:2.1},
  huyen:{name:'Huyền Môn',speed:65,range:225,damage:205,cooldown:2.8},
  linh:{name:'Linh Dược',speed:58,range:250,damage:85,cooldown:2.6}
};
export const SKILLS={
  kiem:['Kiếm Khí','Liên Trảm','Vạn Kiếm Quy Tông','Phá Giáp Kiếm Trận','Triệu Hồi Kim Long'],
  huyen:['Hỏa Phù','Lôi Kích','Phong Ấn','Cửu Thiên Lôi','Thiên Kiếp Trấn Ma'],
  linh:['Liên Hoa Hồi Phục','Thanh Ngọc Hộ Thuẫn','Cam Lộ Giải Chú','Liên Hoa Hồi Sinh','Phượng Hoàng Niết Bàn']
};
export const GIFT_THRESHOLDS=[1,5,20,100,500];
const choose=(arr,n)=>arr[n%arr.length],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const normName=x=>String(x||'Ẩn danh').replace(/[\u0000-\u001f<>]/g,'').slice(0,28);
const round=n=>Math.round(n*10)/10;
export class RaidEngine{
 constructor(){this.round=0;this.scores={};this.seq=0;this.start()}
 start(){this.round++;this.players=new Map();this.events=[];this.hp=80000;this.maxHP=80000;
  this.shield=0;this.team=1000;this.maxTeam=1000;this.time=240;this.elapsed=0;this.phase=1;
  this.energy=0;this.warning=null;this.cast=null;this.nextAttack=5;this.nextShield=30;
  this.result='';this.rest=0;this.bossStun=0;this.bossState='idle';this.counters={kiem:0,huyen:0,linh:0};
  this.comboLedger=new Map();this.eventLedger=new Map();this.clock=0;this.leaders=[];this.bossHitUntil=0;this.demo=false;
  this.bossActionSeq=1;this.bossActionAt=0;this.bossActionDuration=0;this.bossStateUntil=0;this.bossLastReaction=-Infinity;
 }
 emit(type,extra={}){const ev={id:++this.seq,type,t:this.elapsed,...extra};this.events.push(ev);if(this.events.length>45)this.events.shift();return ev}
 // Discrete authoritative action revision: repeated casts must replay from frame 0.
 animate(p,state,duration=0,force=false){
  if(force||p.state!==state){p.state=state;p.actionSeq=(p.actionSeq||0)+1;
   p.actionAt=this.elapsed;p.actionDuration=duration}
  if(duration>0)p.stateUntil=Math.max(p.stateUntil,this.elapsed+duration);
 }
 bossAction(state,duration=0,force=false){
  if(force||this.bossState!==state){this.bossState=state;this.bossActionSeq++;
   this.bossActionAt=this.elapsed;this.bossActionDuration=duration}
  if(duration>0)this.bossStateUntil=Math.max(this.bossStateUntil,this.elapsed+duration);
 }
 user(id,name){const p=this.players.get(String(id));if(p&&name)p.name=normName(name);return p}
 join(id,name,faction='kiem'){
  id=String(id||'');if(!id||!Object.hasOwn(CLASSES,faction))return null;
  const old=this.players.get(id);if(old)return old;
  if(this.players.size>=2000)return null;
  const slot=this.counters[faction]++,lane=slot%10,row=Math.floor(slot/10)%6;
  const x={kiem:205,huyen:162,linh:150}[faction]+(lane%5)*13+row*5;
  const y={kiem:392,huyen:508,linh:625}[faction]+(lane%5)*13+(Math.floor(lane/5)*8);
  const p={id,name:normName(name||id),faction,x:10,y:480+(lane-5)*8,tx:x,ty:y,
    hp:100,maxHP:100,state:'run',stateUntil:0,actionSeq:1,actionAt:this.elapsed,actionDuration:0,pendingStrike:null,nextAttack:1+slot*.08,score:0,damage:0,healing:0,mitigated:0,
    diamonds:0,level:1,scale:0.82,lastHit:0,nextSkillAt:0,leader:false,guardian:false,shield:0};
  this.players.set(id,p);this.emit('JOIN',{actorId:id,name:p.name,faction,x,y});return p
 }
 like(id,count=1){if(!this.players.has(String(id)))return;this.energy=clamp(this.energy+clamp(Math.floor(Number(count)||1),1,15),0,100)}
 chat(id,name,text){
  const cmd=String(text||'').trim().toLowerCase();const match=/^!(kiem|huyen|linh)$/.exec(cmd);
  if(match){this.join(id,name,match[1]);return}
  const p=this.user(id,name);if(!p)return;
  if(cmd==='!skill'&&p.nextSkillAt<=this.elapsed){p.nextFreeSkill=false;p.nextSkillAt=this.elapsed+12;this.skill(p,1,'chat')}
 }
 gift(id,name,coins,count=1,key=null){
  if(this.result)return false;id=String(id||'');if(!id)return false;
  const unit=Math.trunc(Number(coins)),qty=Math.trunc(Number(count));
  if(!Number.isSafeInteger(unit)||unit<=0||!Number.isSafeInteger(qty)||qty<1||qty>10000)return false;
  const stamp=key?`${id}:${key}`:null;
  if(stamp&&this.eventLedger.has(stamp))return false;
  if(stamp){this.eventLedger.set(stamp,this.elapsed);if(this.eventLedger.size>16000)this.eventLedger.delete(this.eventLedger.keys().next().value)}
  const total=Math.min(unit*qty,5_000_000),p=this.join(id,name,'kiem');
  if(!p)return false;
  p.diamonds+=total;p.level=clamp(1+Math.floor(p.diamonds/500),1,10);
  const donorBonus=p.diamonds>=5000?.2:p.diamonds>=1000?.15:p.diamonds>=100?.1:p.diamonds>=20?.05:0;
  p.scale=Math.min(1.3,.82+donorBonus+Math.min(.06,(p.level-1)*.01)+(p.leader?.14:0));
  const tier=GIFT_THRESHOLDS.filter(v=>total>=v).length;
  this.skill(p,tier,'gift',total);this.rank();return true;
 }
 damage(amount,actor=null,source='attack'){
  amount=Math.max(0,Math.round(amount));let left=amount;
  const block=Math.min(this.shield,left);this.shield-=block;left-=block;
  const hit=Math.min(this.hp,left);this.hp-=hit;
  if(actor){actor.score+=hit+block*.6;actor.damage+=hit;actor.lastHit=hit+block;}
  if(hit+block)this.emit('DAMAGE',{actorId:actor?.id||'team',faction:actor?.faction||'kiem',amount:hit,shieldDamage:block,x:420,y:410,source});
  // Brief boss reaction on real HP loss; rate limited so many players do not jitter the boss.
  if(hit>0&&this.hp>0&&!this.warning&&!this.cast&&!this.bossStun&&
     this.elapsed-this.bossLastReaction>=.72&&this.bossStateUntil<=this.elapsed){
    this.bossLastReaction=this.elapsed;this.bossAction('hit',.24,true);
  }
  if(this.shield===0&&this.cast){this.emit('SHIELD_BROKEN',{x:415,y:420});this.cast=null;this.bossStun=2;this.bossAction('stun',.4,true)}
  if(this.hp<=0)this.finish('TRẤN MA THÀNH CÔNG');return hit+block;
 }
 heal(p,amount,area=false){
  let actual=0;let pool=[...this.players.values()].filter(x=>x.hp>0&&x.hp<x.maxHP).sort((a,b)=>(a.hp/a.maxHP)-(b.hp/b.maxHP));
  if(!area)pool=pool.slice(0,4);
  for(const q of pool){const raw=Math.min(q.maxHP-q.hp,amount/(area?Math.max(1,pool.length):Math.min(4,pool.length)));q.hp+=raw;actual+=raw;
    this.emit('HEAL',{actorId:p.id,targetId:q.id,amount:Math.ceil(raw),x:q.x,y:q.y})}
  if(actual===0){const raw=Math.min(this.maxTeam-this.team,amount/4);this.team+=raw;actual=raw}
  p.healing+=actual;p.score+=actual*.7;
  return actual;
 }
 skill(p,tier,source='gift',value=0){
  if(this.result||!p)return;const name=SKILLS[p.faction]?.[tier-1];if(!name)return;
  const power=[0,190,390,750,1450,2850][tier];
  // The sender's actual model enters a cast/attack state; visible on /obs and /models.
  // This state is part of the authoritative snapshot, not an unrelated visual effect.
  if(p.hp>0){p.pendingStrike=null;
    this.animate(p,p.faction==='kiem'?'attack':'cast',tier>=5?1.15:tier>=3?.84:.55,true);}
  const ev={actorId:p.id,name:p.name,faction:p.faction,tier,skill:name,skillId:`${p.faction}_t${tier}`,source,value,
    x:p.x,y:p.y,targetX:422,targetY:420};
  this.emit('SKILL_CAST',ev);
  if(p.faction==='kiem'){
    if(tier===4)this.shield=0;
    this.damage(power,p,'skill');
    if(tier===5)this.bossHitUntil=this.elapsed+3;
  }else if(p.faction==='huyen'){
    this.damage(power*.72,p,'skill');
    if(tier>=3&&this.cast){this.cast.remaining+=tier===3?2:5;this.emit('BOSS_INTERRUPTED',{actorId:p.id,tier});}
    if(tier>=4){this.bossStun=tier===5?3:2;this.bossAction('stun',.6,true);this.cast=null;this.shield=0}
  }else{
    this.heal(p,power,tier>=3);
    if(tier>=2){for(const q of this.players.values())q.shield=Math.min(110,q.shield+(tier===2?45:35));}
    if(tier>=3){for(const q of this.players.values())q.poison=0;}
    if(tier>=4){const down=[...this.players.values()].filter(x=>x.hp<=0).slice(0,tier===5?10:3);
      for(const q of down){q.hp=55;this.animate(q,'revive',1.1,true);p.score+=80;this.emit('REVIVE',{actorId:p.id,targetId:q.id,x:q.x,y:q.y})}}
  }
  this.rank();
 }
 rank(){
  const list=[...this.players.values()];
  for(const f of Object.keys(CLASSES)){
    const xs=list.filter(p=>p.faction===f).sort((a,b)=>b.score-a.score);
    const lead=xs[0]?.id;const donor=[...xs].sort((a,b)=>b.diamonds-a.diamonds)[0]?.id;
    for(const p of xs){const was=p.leader;p.leader=p.id===lead&&p.score>0;p.guardian=p.id===donor&&p.diamonds>0;
      const donorBonus=p.diamonds>=5000?.2:p.diamonds>=1000?.15:p.diamonds>=100?.1:p.diamonds>=20?.05:0;
      p.scale=Math.min(1.3,.82+donorBonus+Math.min(.06,(p.level-1)*.01)+(p.leader?.14:0));
      if(!was&&p.leader)this.emit('LEADER',{actorId:p.id,name:p.name,faction:p.faction});
    }
  }
  this.leaders=list.sort((a,b)=>b.score-a.score).slice(0,3).map(p=>({id:p.id,name:p.name,faction:p.faction,score:Math.round(p.score)}));
 }
 phaseFor(hp){const pct=hp/this.maxHP;return pct>.7?1:pct>.4?2:pct>.15?3:4}
 tick(dt=.05){
  if(this.result){this.rest-=dt;if(this.rest<=0){this.start()}return}
  if(!this.players.size)return;
  dt=Math.min(.2,Math.max(0,dt));this.clock+=dt;this.elapsed+=dt;this.time=Math.max(0,240-this.elapsed);
  const phase=this.phaseFor(this.hp);
  if(phase!==this.phase){this.phase=phase;this.emit('PHASE',{phase,hp:this.hp});this.bossAction('phase',.7,true);this.nextAttack=Math.min(this.nextAttack,this.elapsed+1.2)}
  if(this.bossStun>0){this.bossStun=Math.max(0,this.bossStun-dt);this.bossAction('stun');}
  else if(this.bossStateUntil<=this.elapsed)this.bossAction((this.warning||this.cast)?'windup':'idle');
  for(const p of this.players.values()){
    if(p.hp<=0){p.pendingStrike=null;this.animate(p,'down');continue}
    // Server schedules the real collision 240 ms after the attack starts.
    // This aligns model swing, VFX impact, SFX and HP loss.
    if(p.pendingStrike&&this.elapsed>=p.pendingStrike.at){
      p.pendingStrike=null;
      if(p.faction==='linh'&&this.team<900){
        this.team=Math.min(1000,this.team+7);p.healing+=7;p.score+=4.9;
        this.emit('AUTO_HEAL',{actorId:p.id,faction:p.faction,x:p.x,y:p.y,amount:7});
      }else this.damage(CLASSES[p.faction].damage,p,'basic');
    }
    if(this.result)break;
    if(p.stateUntil>this.elapsed)continue;
    const dx=p.tx-p.x,dy=p.ty-p.y,dist=Math.hypot(dx,dy),spd=CLASSES[p.faction].speed*dt;
    if(dist>2){p.x+=dx/dist*Math.min(dist,spd);p.y+=dy/dist*Math.min(dist,spd);
      this.animate(p,'run');continue}
    if(this.elapsed>=p.nextAttack){
      const action=p.faction==='kiem'?'attack':'cast';
      this.animate(p,action,.55,true);
      p.pendingStrike={at:this.elapsed+.24};
      p.nextAttack=this.elapsed+CLASSES[p.faction].cooldown;
      this.emit('BASIC_ATTACK_START',{actorId:p.id,faction:p.faction,x:p.x,y:p.y,impactAt:p.pendingStrike.at,actionSeq:p.actionSeq});
    }else this.animate(p,'idle');
  }
  if(this.energy>=100){this.energy=0;this.damage(900,null,'team');this.emit('TEAM_STRIKE',{x:420,y:420})}
  if(this.cast){this.cast.remaining-=dt;if(this.cast.remaining<=0){this.team=Math.max(0,this.team-210);this.emit('SHIELD_EXPLODE',{x:420,y:420,damage:210});this.shield=0;this.cast=null}}
  if(this.warning&&this.elapsed>=this.warning.impactAt){
    const w=this.warning;this.warning=null;this.bossAction('impact',.55,true);
    for(const p of this.players.values()){
      if(p.hp<=0)continue;
      const hit=w.kind==='circle'?Math.hypot(p.x-w.x,p.y-w.y)<w.radius:
        w.kind==='sweep'?p.y>=w.y-20&&p.y<=w.y+50:p.x>200;
      if(hit){let amount=w.damage;const absorb=Math.min(amount,p.shield);p.shield-=absorb;amount-=absorb;
        p.hp=Math.max(0,p.hp-amount);p.pendingStrike=null;this.animate(p,p.hp===0?'down':'hit',p.hp===0?0:.5,true);
        this.emit('PLAYER_HIT',{actorId:p.id,x:p.x,y:p.y,amount})}
    }
    this.team=Math.max(0,this.team-w.teamDamage);this.emit('BOSS_IMPACT',{x:w.x,y:w.y,kind:w.kind,damage:w.teamDamage});
  }
  if(!this.warning&&!this.cast&&!this.bossStun&&this.elapsed>=this.nextAttack){
    const kind=choose(['circle','sweep','cone'],Math.floor(this.elapsed/4)+this.phase);
    const y=kind==='sweep'?470:550;
    this.warning={kind,x:kind==='circle'?220:370,y,radius:100+(phase-1)*8,impactAt:this.elapsed+2.2,
      damage:12+(phase-1)*5,teamDamage:phase===4?24:12};
    this.bossAction('windup',0,true);this.nextAttack=this.elapsed+(phase===4?4.2:6.5);
    this.emit('BOSS_TELEGRAPH',{...this.warning,duration:2.2,phase});
  }
  if(phase>=2&&!this.cast&&this.elapsed>=this.nextShield){
    this.shield=1500+phase*350;this.cast={remaining:8};this.nextShield=this.elapsed+28;this.bossAction('windup',0,true);
    this.emit('BOSS_SHIELD',{shield:this.shield,seconds:8});
  }
  if(this.time===0||this.team<=0)this.finish('PHONG ẤN TAN VỠ');
  if(Math.floor(this.elapsed*2)%10===0&&this.clock>=5){this.clock=0;this.rank()}
 }
 finish(result){if(this.result)return;this.result=result;this.rest=12;
  this.bossAction(result.includes('THÀNH CÔNG')?'down':'victory',1,true);
  for(const p of this.players.values()){p.pendingStrike=null;
   this.animate(p,result.includes('THÀNH CÔNG')?(p.hp>0?'victory':'down'):'down',0,true)}
  this.rank();this.emit('RESULT',{result});
  for(const p of this.players.values())this.scores[p.id]=(this.scores[p.id]||0)+p.score;
 }
 snapshot(){
  const everyone=[...this.players.values()];
  // Prioritize leader, donating and most recently active; game logic remains authoritative for all.
  const visible=[...everyone].sort((a,b)=>(Number(b.leader)-Number(a.leader))||b.diamonds-a.diamonds||b.score-a.score).slice(0,40);
  const count={kiem:0,huyen:0,linh:0};for(const p of everyone)count[p.faction]++;
  const fac=Object.fromEntries(Object.keys(count).map(k=>[k,{count:count[k],energy:this.energy}]));
  return {round:this.round,seq:this.seq,time:Math.ceil(this.time),elapsed:round(this.elapsed),hp:this.hp,maxHP:this.maxHP,
   team:this.team,maxTeam:this.maxTeam,phase:this.phase,shield:this.shield,cast:this.cast?.remaining||0,
   bossState:this.bossState,bossActionSeq:this.bossActionSeq,bossActionAt:this.bossActionAt,bossActionDuration:this.bossActionDuration,bossHitUntil:this.bossHitUntil,warning:this.warning,energy:this.energy,
   players:visible.map(p=>({...p,x:round(p.x),y:round(p.y),hp:round(p.hp)})),count:everyone.length,
   factions:fac,leaders:this.leaders,events:this.events,result:this.result,rest:Math.ceil(this.rest),demo:this.demo};
 }
}
