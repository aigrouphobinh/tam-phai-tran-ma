// Shared rules for the endless boss encounter. All inventory and transitions
// are server-authoritative. Only decorative outer accessories are detachable.
export const BREAK_THRESHOLDS=Object.freeze([.75,.50,.25]);
export const TRANSFORM_AT=.12;
export const TRANSFORM_SECONDS=1.6;
export const BOSS_FORMS=Object.freeze([
 {id:'honglien',name:'Hồng Liên Ma Tướng',element:'Huyết liên',color:'#f56b86',material:'Lụa Hồng Liên',asset:'boss-red',row:0,hp:80000,pattern:['cone','sweep','circle'],telegraph:2.2,interval:6.5,power:1},
 {id:'bangnguyet',name:'Băng Nguyệt Thương Cơ',element:'Băng nguyệt',color:'#83d6ff',material:'Lụa Băng Nguyệt',asset:'boss-ice',row:1,hp:86000,pattern:['circle','circle','cone'],telegraph:2.6,interval:6.9,power:1.1},
 {id:'loianh',name:'Lôi Ảnh Pháp Vương',element:'Lôi ảnh',color:'#c19aff',material:'Gấm Lôi Ảnh',asset:'boss-storm',row:2,hp:90000,pattern:['cone','circle','cone'],telegraph:1.8,interval:5.8,power:1.05},
 {id:'kimsa',name:'Kim Sa Hộ Pháp',element:'Kim sa',color:'#efc56e',material:'Gấm Kim Sa',asset:'boss-gold',row:3,hp:94000,pattern:['sweep','sweep','circle'],telegraph:2.4,interval:7.1,power:1.25}
]);
export const formFor=index=>BOSS_FORMS[((index%BOSS_FORMS.length)+BOSS_FORMS.length)%BOSS_FORMS.length];
export const breakStage=(hp,maxHP)=>BREAK_THRESHOLDS.filter(t=>hp<=maxHP*t).length;
const publicForm=f=>({id:f.id,name:f.name,element:f.element,color:f.color,material:f.material,row:f.row});
const emptyLoot=()=>({total:0,byForm:{honglien:0,bangnguyet:0,loianh:0,kimsa:0}});
export function resetBossCycle(g,retainLoot=false){
 const loot=retainLoot&&g.bossCycle?.loot?structuredClone(g.bossCycle.loot):emptyLoot();
 g.bossCycle={index:0,wave:1,stage:0,startedAt:0,defeated:0,transform:null,pendingDrops:[],loot};
}
export function bossStats(g){
 const c=g.bossCycle,f=formFor(c?.index||0),lap=Math.floor(((c?.wave||1)-1)/BOSS_FORMS.length);
 return {...f,maxHP:Math.round(f.hp*(1+Math.min(7,lap)*.05))};
}
export function collectBossLoot(g){
 if(!g.bossLoop)return;
 const c=g.bossCycle,waiting=[];
 for(const drop of c.pendingDrops){
  if(drop.collectAt>g.elapsed){waiting.push(drop);continue;}
  c.loot.total++;c.loot.byForm[drop.formId]=(c.loot.byForm[drop.formId]||0)+1;
  const p=g.players.get(drop.ownerId);
  if(p){p.cloth=(p.cloth||0)+1;p.clothByForm??={};p.clothByForm[drop.formId]=(p.clothByForm[drop.formId]||0)+1;}
  g.emit('BOSS_LOOT_COLLECTED',{lootId:drop.id,actorId:drop.ownerId,name:p?.name||'Tam phái',formId:drop.formId,material:drop.material,total:c.loot.total,x:drop.x,y:drop.y});
 }
 c.pendingDrops=waiting;
}
export function observeBossDamage(g,actor){
 if(!g.bossLoop||g.result||g.bossCycle.transform)return;
 const c=g.bossCycle,f=bossStats(g),stage=breakStage(g.hp,g.maxHP);
 while(c.stage<stage){
  const piece=c.stage++,id=`${g.round}:${c.wave}:${piece}`;
  const drop={id,formId:f.id,row:f.row,piece,material:f.material,ownerId:actor?.id||'',
   droppedAt:g.elapsed,collectAt:g.elapsed+1.25,x:404,y:551};
  c.pendingDrops.push(drop);
  g.emit('BOSS_CLOTH_DROP',{...drop,stage:c.stage,remaining:4-c.stage,name:f.name,color:f.color});
 }
 if(g.hp<=Math.ceil(g.maxHP*TRANSFORM_AT)){
  const next=formFor(c.index+1);
  c.transform={from:f.id,to:next.id,startedAt:g.elapsed,until:g.elapsed+TRANSFORM_SECONDS};
  g.warning=null;g.cast=null;g.shield=0;g.adds=[];g.illusion=null;g.bossStun=0;
  g.bossAction('phase',TRANSFORM_SECONDS,true);
  for(const p of g.players.values()){p.pendingStrike=null;p.poison=0;g.animate(p,p.hp>0?'idle':'down',0,true);p.stateUntil=g.elapsed;}
  g.emit('BOSS_TRANSFORM_START',{from:f.id,to:next.id,name:next.name,color:next.color,duration:TRANSFORM_SECONDS,x:404,y:430});
 }
}
export function advanceBossCycle(g){
 if(!g.bossLoop)return false;
 const c=g.bossCycle;collectBossLoot(g);
 if(!c.transform)return false;
 if(g.elapsed<c.transform.until)return true;
 c.index=(c.index+1)%BOSS_FORMS.length;c.wave++;c.defeated++;c.stage=0;c.startedAt=g.elapsed;c.transform=null;
 const f=bossStats(g);g.maxHP=f.maxHP;g.hp=f.maxHP;g.phase=1;g.time=240;
 g.team=Math.min(g.maxTeam,g.team+180);g.warning=null;g.cast=null;g.shield=0;g.adds=[];g.illusion=null;
 g.nextAttack=g.elapsed+4;g.nextShield=g.elapsed+30;g.nextIllusion=g.elapsed+22;g.nextAdds=g.elapsed+18;
 g.bossStun=0;g.bossStateUntil=g.elapsed;g.bossLastReaction=-Infinity;g.bossHitUntil=0;g.bossAction('idle',0,true);
 for(const p of g.players.values()){p.pendingStrike=null;p.poison=0;p.nextAttack=Math.max(p.nextAttack,g.elapsed+.4);}
 g.emit('BOSS_TRANSFORMED',{formId:f.id,name:f.name,color:f.color,wave:c.wave,x:404,y:430});
 // These gifts were already added to the replay ledger when first received.
 // If a queued gift triggers another transformation, later gifts queue again.
 const queued=g.pendingGifts.splice(0);for(const q of queued)g.gift(q.id,q.name,q.coins,q.count,null,q.bonus);
 return true;
}
export function snapshotBossCycle(g){
 if(!g.bossLoop)return null;
 const c=g.bossCycle,f=bossStats(g);
 return {form:publicForm(f),next:publicForm(formFor(c.index+1)),wave:c.wave,lap:Math.floor((c.wave-1)/4)+1,
  stage:c.stage,remaining:4-c.stage,defeated:c.defeated,transform:c.transform?{...c.transform}:null,
  loot:structuredClone(c.loot),drops:c.pendingDrops.map(d=>({...d})),permanentBase:true};
}
export function validateBossCycle(g){
 if(!g.bossLoop)return;
 const c=g.bossCycle;
 if(!c||!Number.isSafeInteger(c.index)||c.index<0||c.index>=4||!Number.isSafeInteger(c.wave)||c.wave<1||
  !Number.isSafeInteger(c.stage)||c.stage<0||c.stage>3||!Number.isFinite(c.startedAt)||
  !Array.isArray(c.pendingDrops)||c.pendingDrops.length>12||!Number.isSafeInteger(c.loot?.total)||c.loot.total<0||!c.loot.byForm)
  throw Error('Checkpoint vòng boss không hợp lệ');
 if(BOSS_FORMS.some(f=>!Number.isSafeInteger(c.loot.byForm[f.id])||c.loot.byForm[f.id]<0)||
  BOSS_FORMS.reduce((sum,f)=>sum+c.loot.byForm[f.id],0)!==c.loot.total)throw Error('Checkpoint túi vật liệu không hợp lệ');
 const ids=new Set();
 for(const d of c.pendingDrops){
  if(typeof d.id!=='string'||ids.has(d.id)||!BOSS_FORMS.some(f=>f.id===d.formId)||
   !Number.isFinite(d.collectAt)||!Number.isFinite(d.droppedAt)||!Number.isSafeInteger(d.piece)||d.piece<0||d.piece>2)throw Error('Checkpoint loot không hợp lệ');
  ids.add(d.id);
 }
 if(c.transform&&(!Number.isFinite(c.transform.until)||!Number.isFinite(c.transform.startedAt)||
  c.transform.from!==formFor(c.index).id||c.transform.to!==formFor(c.index+1).id))throw Error('Checkpoint biến hình không hợp lệ');
}
