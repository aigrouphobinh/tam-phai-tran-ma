// One normalization boundary for direct TikTok LIVE and browser-captured Webcast.
const positive=(v,max=1e7)=>{const n=Number(v);return Number.isSafeInteger(n)&&n>0&&n<=max?n:0};
const identifier=(...xs)=>xs.map(x=>String(x||'')).find(x=>x&&x!=='0')||'';
export function normalizeEvent(type,data){
 const u=data.user||{},id=identifier(u.idStr,u.userId,u.id,data.userId,u.uniqueId,u.displayId,data.uniqueId);
 if(!id||id.length>100)return null;
 const name=String(u.nickname||data.nickname||id).slice(0,60),msg=identifier(data.common?.msgId,data.msgId,data.messageId);
 const base={type,id,name,key:msg?`${type}:${id}:${msg}`:null};
 if(type==='chat')return {...base,text:String(data.comment||data.content||'').slice(0,300)};
 if(type==='like')return {...base,count:positive(data.likeCount,1e6)||1};
 if(type==='member')return base;
 if(type!=='gift')return null;
 const g=data.giftDetails||data.gift||{},raw=data.gift||{},streak=Number(data.giftType??g.giftType??g.type??raw.type)===1;
 if(streak&&!['true','1'].includes(String(data.repeatEnd??data.repeat_end)))return null;
 const key=streak?identifier(data.groupId,msg):msg;
 // Never invent ids for valuable events: a replay must not award a second skill.
 if(!key)return null;
 const coins=positive(data.diamondCount??g.diamondCount??raw.diamondCount??data.extendedGiftInfo?.diamondCount),count=positive(data.repeatCount??data.comboCount??1,10000);
 if(!coins||!count)return null;
 return {...base,key:`gift:${id}:${key}`,coins,count,giftName:String(data.giftName||g.name||raw.name||''),giftId:String(data.giftId||g.id||'')};
}
export class InputGate{
 constructor(engine){this.engine=engine;this.seen=engine.inputLedger;this.accepted=0;this.duplicates=0;this.ignored=0;this.latest=null;}
 receive(type,data){const e=normalizeEvent(type,data);if(!e){this.ignored++;return false;}
  if(e.key&&this.seen.has(e.key)){this.duplicates++;return false;}
  if(e.key){this.seen.set(e.key,true);if(this.seen.size>20000)this.seen.delete(this.seen.keys().next().value);}
  const g=this.engine;
  if(type==='chat')g.chat(e.id,e.name,e.text);
  else if(type==='like')g.like(e.id,e.count);
  else if(type==='gift'){if(!g.gift(e.id,e.name,e.coins,e.count,e.key,e.giftName)){this.duplicates++;return false;}}
  else if(type==='member')g.emit('ARRIVAL',{actorId:e.id,name:e.name});
  this.accepted++;this.latest={type,name:e.name,at:Date.now()};return true;
 }
 snapshot(){return {accepted:this.accepted,duplicates:this.duplicates,ignored:this.ignored,latest:this.latest};}
}
