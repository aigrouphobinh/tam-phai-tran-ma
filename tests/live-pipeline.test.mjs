import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {RaidEngine} from '../engine.mjs';
import {InputGate,normalizeEvent} from '../input.mjs';
import {serializeRaid,restoreRaid} from '../persistence.mjs';
import {pointInWarning,conePoints} from '../combat-geometry.mjs';
import {createGameServer} from '../server.mjs';
import {decodeFrame} from '../bridge.mjs';
import {WebcastPushFrame,ProtoMessageFetchResult,BaseProtoMessage,WebcastChatMessage,WebcastGiftMessage,CommonMessageData,User,Gift} from 'tiktok-live-connector';
const empty=s=>s.decode(new Uint8Array()),encode=(s,v)=>s.encode({...empty(s),...v}).finish();
function frame(type,overrides,msgId='1234567890123456789'){
 const schema=type==='chat'?WebcastChatMessage:WebcastGiftMessage;
 const payload=encode(schema,{common:{...empty(CommonMessageData),msgId},user:{...empty(User),displayId:'viewer_nhi',nickname:'Nhi',id:'99'},...overrides});
 const message={...empty(BaseProtoMessage),method:type==='chat'?'WebcastChatMessage':'WebcastGiftMessage',msgId,payload};
 const response=encode(ProtoMessageFetchResult,{messages:[message]});
 return encode(WebcastPushFrame,{payloadEncoding:'pb',payload:gzipSync(response)});
}
const gift=(id='g1')=>({user:{uniqueId:'viewer_nhi',nickname:'Nhi'},gift:{type:1,diamondCount:5},repeatCount:4,repeatEnd:1,groupId:id,common:{msgId:'987'}});
test('only final combo awards one actual skill; replay is idempotent',()=>{
 const g=new RaidEngine(),gate=new InputGate(g);
 assert.equal(gate.receive('gift',{...gift(),repeatEnd:0}),false);assert.equal(g.players.size,0);
 assert.equal(gate.receive('gift',gift()),true);assert.equal(g.players.get('viewer_nhi').diamonds,20);
 assert.equal(g.events.filter(e=>e.type==='SKILL_CAST').length,1);
 assert.equal(gate.receive('gift',gift()),false);assert.equal(g.players.get('viewer_nhi').diamonds,20);
 assert.equal(gate.duplicates,1);
});
test('valuable events need stable ids, integer values, real identities',()=>{
 assert.equal(normalizeEvent('gift',{...gift(),groupId:'',common:{}}),null);
 assert.equal(normalizeEvent('gift',{...gift(),repeatCount:-1}),null);
 assert.equal(normalizeEvent('chat',{comment:'!kiem'}),null);
 const g=new RaidEngine(),gate=new InputGate(g);gate.receive('member',{user:{uniqueId:'seen_only'}});assert.equal(g.players.size,0);
 gate.receive('chat',{user:{uniqueId:'viewer'},comment:'!huyen',msgId:'a'});assert.equal(g.players.get('viewer').faction,'huyen');
});
test('raw gzip Webcast frames decode real protobuf structure and preserve 64-bit ids',async()=>{
 const events=await decodeFrame(frame('chat',{content:'!linh'}));assert.equal(events.length,1);
 assert.equal(events[0].data.msgId,'1234567890123456789');
 const g=new RaidEngine(),gate=new InputGate(g);for(const e of events)gate.receive(e.type,e.data);
 assert.equal(g.players.get('99').faction,'linh');
 const raw=frame('gift',{gift:{...empty(Gift),type:1,diamondCount:5},groupId:'9123',repeatEnd:1,repeatCount:4},'456');
 const gifts=await decodeFrame(raw);assert.equal(normalizeEvent('gift',gifts[0].data).coins,5);
 gate.receive('gift',gifts[0].data);assert.equal(g.players.get('99').diamonds,20);
});
test('new rounds retain real roster and gift replay protection',()=>{
 const g=new RaidEngine();g.join('nhi','Nhi','huyen');g.gift('nhi','Nhi',20,1,'x');
 g.finish('TRẤN MA THÀNH CÔNG');for(let i=0;i<65;i++)g.tick(.2);
 assert.equal(g.players.get('nhi').faction,'huyen');assert.equal(g.gift('nhi','Nhi',20,1,'x'),false);assert.equal(g.players.get('nhi').diamonds,20);
});
test('gifts received during results wait for next round and are awarded once',()=>{
 const g=new RaidEngine();g.join('nhi','Nhi','kiem');g.finish('TRẤN MA THÀNH CÔNG');
 assert.equal(g.gift('nhi','Nhi',500,1,'after'),true);assert.equal(g.gift('nhi','Nhi',500,1,'after'),false);
 assert.equal(g.pendingGifts.length,1);g.start({retainPlayers:true});assert.equal(g.players.get('nhi').diamonds,500);assert.equal(g.pendingGifts.length,0);
});
test('checkpoint restores positions, pending attacks, scores and gift ledger',()=>{
 const g=new RaidEngine();g.join('nhi','Nhi','linh');g.gift('nhi','Nhi',100,1,'persist');for(let i=0;i<50;i++)g.tick(.1);
 const copy=restoreRaid(new RaidEngine(),JSON.parse(JSON.stringify(serializeRaid(g))));assert.deepEqual(copy.snapshot(),g.snapshot());assert.equal(copy.gift('nhi','Nhi',100,1,'persist'),false);
});
test('boss collision uses the exact displayed warning shape and dodge window',()=>{
 const cone={kind:'cone',points:conePoints(200,500)};assert.equal(pointInWarning(cone,200,500),true);assert.equal(pointInWarning(cone,500,700),false);
 const w={kind:'circle',x:200,y:500,radius:100};assert.equal(pointInWarning(w,200,550),false);assert.equal(pointInWarning(w,200,530),true);
 const g=new RaidEngine(),p=g.join('nhi','Nhi','kiem');p.x=200;p.y=500;p.tx=200;p.ty=500;
 g.warning={...w,impactAt:.1,damage:40,teamDamage:0};g.chat(p.id,p.name,'!ne');g.tick(.1);assert.equal(p.hp,100);
 g.elapsed=9;g.warning={...w,impactAt:9.1,damage:40,teamDamage:0};g.tick(.1);assert.equal(p.hp,60);
});
test('illusion and minions have authoritative consequences',()=>{
 const g=new RaidEngine(),p=g.join('nhi','Nhi','huyen');g.hp=30000;g.elapsed=23;g.tick(.05);
 assert.equal(g.phase,3);assert.equal(g.adds.length,2);assert.ok(g.illusion);const hp=g.hp;
 g.chat(p.id,p.name,'!'+g.illusion.target);assert.equal(g.illusion,null);assert.equal(g.hp,hp-900);
});
test('local HTTP bridge authenticates, filters channel and feeds engine once',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tam-phai-http-'));let app;
 try{
  app=await createGameServer({port:0,dataDir:dir});const base='http://127.0.0.1:'+app.server.address().port;
  const control=async payload=>fetch(base+'/api/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  assert.equal((await control({action:'bridge',room:'test_room'})).status,200);
  const send=async(token,room,bytes)=>fetch(base+'/api/tiktok/frame',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({room,frame:bytes.toString('base64')})});
  const bytes=Buffer.from(frame('chat',{content:'!kiem'}));
  assert.equal((await send('wrong','test_room',bytes)).status,401);
  assert.equal((await send(app.token,'other_room',bytes)).status,409);
  assert.equal((await send(app.token,'test_room',bytes)).status,200);assert.equal(app.raid.players.size,1);
  await send(app.token,'test_room',bytes);assert.equal(app.gate.duplicates,1);
  assert.equal((await control({action:'squad'})).status,400,'practice inputs must not pollute real LIVE');
  const cross=await fetch(base+'/api/control',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://example.com'},body:'{"action":"demo"}'});assert.equal(cross.status,403);
  await app.close();app=null;
  app=await createGameServer({port:0,dataDir:dir});assert.equal(app.raid.players.size,1);assert.equal(app.raid.sessionRoom,'test_room');
  app.command({action:'bridge',room:'test_room'});assert.equal(app.raid.players.size,1);
  app.command({action:'bridge',room:'new_room'});assert.equal(app.raid.players.size,0);
 }finally{if(app)await app.close();await rm(dir,{recursive:true,force:true});}
});
test('practice roster is cleared when changing to real LIVE even after pause',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tam-phai-mode-'));let app;
 try{app=await createGameServer({port:0,dataDir:dir});app.command({action:'demo'});app.command({action:'squad'});assert.equal(app.raid.players.size,3);app.command({action:'stop'});app.command({action:'bridge',room:'test'});assert.equal(app.raid.players.size,0);}finally{if(app)await app.close();await rm(dir,{recursive:true,force:true});}
});
test('chat and like message ids remain deduplicated after a checkpoint',()=>{
 const g=new RaidEngine(),gate=new InputGate(g);gate.receive('chat',{user:{uniqueId:'nhi'},comment:'!kiem',msgId:'chat1'});
 const like={user:{uniqueId:'nhi'},likeCount:10,msgId:'like1'};gate.receive('like',like);assert.equal(g.energy,10);
 const copy=restoreRaid(new RaidEngine(),JSON.parse(JSON.stringify(serializeRaid(g)))),after=new InputGate(copy);
 assert.equal(after.receive('like',like),false);assert.equal(copy.energy,10);
});
test('2000 real participants stay bounded while renderer receives only 40',()=>{
 const g=new RaidEngine();for(let i=0;i<2000;i++)g.join('u'+i,'Người xem '+i,['kiem','huyen','linh'][i%3]);
 assert.equal(g.join('overflow','x','kiem'),null);for(let i=0;i<200;i++)g.tick(.05);
 const s=g.snapshot();assert.equal(s.count,2000);assert.equal(s.players.length,40);assert.ok(Number.isFinite(s.hp));assert.equal(s.factions.kiem.count+s.factions.huyen.count+s.factions.linh.count,2000);
});
test('all 15 faction skills change combat state and emit their actual skill id',()=>{
 for(const f of ['kiem','huyen','linh'])for(let tier=1;tier<=5;tier++){
  const g=new RaidEngine(),p=g.join('caster','Caster',f),target=g.join('ally','Ally','kiem');target.hp=tier>=4?0:20;g.team=500;g.shield=1000;g.cast={remaining:5};
  const hp=g.hp,shield=g.shield;g.gift(p.id,p.name,[1,5,20,100,500][tier-1],1,'skill');
  assert.ok(g.events.some(e=>e.type==='SKILL_CAST'&&e.skillId===f+'_t'+tier));
  if(f==='linh'){assert.ok(target.hp>20||g.team>500||target.shield>0);if(tier>=4)assert.equal(target.hp,55);}
  else assert.ok(g.hp<hp||g.shield<shield);
 }
});
test('Donut buff has an expiry and Rocket really breaks a shield',()=>{
 const g=new RaidEngine(),p=g.join('caster','Caster','huyen');g.gift(p.id,p.name,1,1,'donut','Doughnut');
 const hp=g.hp;g.damage(100,p);assert.equal(hp-g.hp,130);g.elapsed=11;const after=g.hp;g.damage(100,p);assert.equal(after-g.hp,100);
 g.shield=2000;g.cast={remaining:8};g.gift(p.id,p.name,1,1,'rocket','Tên Lửa');assert.equal(g.shield,0);assert.equal(g.cast,null);
});
