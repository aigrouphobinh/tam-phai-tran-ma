import http from 'node:http';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {RaidEngine} from './engine.mjs';

const ROOT=resolve(fileURLToPath(new URL('./public/',import.meta.url)));
const PORT=Number(process.env.PORT||8788);
const raid=new RaidEngine();
const clients=new Set();
let mode='stop',status='Chờ kết nối',disconnect=()=>{},viewerCount=0,seq=0;
const loopback=['127.0.0.1','::1'];
const names=['BaoLong','MinhAnh','ThanhVy','AiNhi','HoangNam','AnhKiet','TuyetNhi','TieuDao','YenNhi','PhongVan','HaiYen','LinhNhi','NhatLong','HuyenVu','ThienTam','BachLien','TienDao','ThanhLam'];
function demoJoin(){
 raid.start();raid.demo=true;
 names.forEach((name,i)=>raid.join('demo-'+i,name,['kiem','huyen','linh'][i%3]));
 raid.rank();status='Đang chạy sân luyện thật (DEMO)';
}
function postGift(){
 if(mode!=='demo')throw Error('Chỉ thử quà trên chế độ luyện tập');
 const n=seq++,p=raid.players.get('demo-'+n%names.length);
 raid.gift(p.id,p.name,[1,5,20,100,500][n%5],1,'demo-gift-'+n);
}
const streamData=()=>JSON.stringify({...raid.snapshot(),status,mode,viewerCount});
function sendAll(){const payload='data: '+streamData()+'\n\n';for(const res of clients)try{if(res.writableEnded){clients.delete(res);continue}res.write(payload)}catch{clients.delete(res)}}
let previous=performance.now();let broadcastAt=0;let storedRound=0;
setInterval(()=>{
 const now=performance.now(),dt=Math.min(.2,(now-previous)/1000);previous=now;
 if(mode!=='stop'){raid.tick(dt);raid.demo=mode==='demo'}
 if(raid.result&&storedRound!==raid.round){storedRound=raid.round;
   const out=JSON.stringify(raid.scores);writeFile(new URL('./scores.json.tmp',import.meta.url),out)
     .then(()=>rename(new URL('./scores.json.tmp',import.meta.url),new URL('./scores.json',import.meta.url)))
     .catch(err=>console.error('score storage:',err.message));
 }
 if(now-broadcastAt>=100){sendAll();broadcastAt=now}
},50);

function sendLive(room){
 let stop=false,connection=null,attempt=0,timer=null;
 const seenGifts=new Map();
 const normalizedUser=d=>({id:String(d.user?.uniqueId||d.uniqueId||d.userId||''),name:d.user?.nickname||d.nickname||d.uniqueId||'Người xem'});
 async function connect(){
  try{
   const {TikTokLiveConnection,WebcastEvent,ControlEvent}=await import('tiktok-live-connector');
   if(stop)return;
   const instance=new TikTokLiveConnection(room,{processInitialData:false,authenticateWs:false});connection=instance;
   const valid=()=>!stop&&instance===connection;
   instance.on(WebcastEvent.CHAT,d=>{if(!valid())return;const u=normalizedUser(d);raid.chat(u.id,u.name,d.comment)});
   instance.on(WebcastEvent.LIKE,d=>{if(!valid())return;const u=normalizedUser(d);raid.like(u.id,d.likeCount)});
   instance.on(WebcastEvent.GIFT,d=>{
    if(!valid())return;
    const u=normalizedUser(d),gift=d.giftDetails||d.gift||{};
    const kind=Number(d.giftType??gift.giftType??d.gift?.type),streak=kind===1;
    if(streak&&!['true','1'].includes(String(d.repeatEnd??d.repeat_end)))return;
    const price=Number(d.diamondCount??gift.diamondCount??d.extendedGiftInfo?.diamondCount??0);
    const count=Number(d.repeatCount??d.comboCount??1);
    if(!Number.isSafeInteger(price)||price<=0)return;
    const key=String(d.groupId||d.common?.msgId||d.msgId||`${u.id}-${Date.now()}`);
    if(seenGifts.has(key))return;seenGifts.set(key,Date.now());
    if(seenGifts.size>12000)seenGifts.delete(seenGifts.keys().next().value);
    raid.gift(u.id,u.name,price,count,key);
   });
   if(WebcastEvent.MEMBER)instance.on(WebcastEvent.MEMBER,d=>{if(!valid())return;
      // Joiners are logged but not assigned a faction before a chat/gift event.
      const u=normalizedUser(d);if(u.id)raid.emit('ARRIVAL',{actorId:u.id,name:u.name})});
   if(WebcastEvent.ROOM_USER)instance.on(WebcastEvent.ROOM_USER,d=>{if(valid())viewerCount=Number(d.viewerCount)||viewerCount});
   const retry=e=>{
    if(!valid())return;connection=null;status='Mất LIVE: '+String(e?.message||e).slice(0,85);
    try{Promise.resolve(instance.disconnect()).catch(()=>{})}catch{}
    clearTimeout(timer);timer=setTimeout(connect,Math.min(30000,2000*2**Math.min(attempt++,4)));
   };
   instance.on(ControlEvent.DISCONNECTED,()=>retry('đã ngắt kết nối'));
   instance.on(ControlEvent.ERROR,e=>{if(valid())status='LIVE error: '+String(e?.message||e).slice(0,85)});
   await instance.connect();if(valid()){status='LIVE @'+room;attempt=0}
  }catch(err){status='Kết nối thất bại: '+err.message;clearTimeout(timer);
    if(!stop)timer=setTimeout(connect,Math.min(30000,2000*2**Math.min(attempt++,4)))}
 }
 connect();return()=>{stop=true;clearTimeout(timer);try{Promise.resolve(connection?.disconnect()).catch(()=>{})}catch{}}
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.wav':'audio/wav','.mp3':'audio/mpeg','.json':'application/json'};
http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,`http://127.0.0.1:${PORT}`);
  if(u.pathname==='/events'){
   res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
   clients.add(res);req.on('close',()=>clients.delete(res));res.write('data: '+streamData()+'\n\n');return;
  }
  if(u.pathname==='/api/control'&&req.method==='POST'){
   const expectedOrigins=[`http://127.0.0.1:${PORT}`,`http://localhost:${PORT}`];
   const host=String(req.headers.host||'');
   if(!['127.0.0.1:'+PORT,'localhost:'+PORT].includes(host)||
      (req.headers.origin&&!expectedOrigins.includes(req.headers.origin))||
      !String(req.headers['content-type']||'').startsWith('application/json')){res.writeHead(403).end('Forbidden');return}
   let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw Error('Body quá dài')}
   const {action,room,faction,id,name,coins}=JSON.parse(body);
   if(!['live','demo','stop','gift','join','skill','reset'].includes(action))throw Error('Lệnh không hợp lệ');
   if(action==='demo'){disconnect();disconnect=()=>{};mode='demo';demoJoin()}
   else if(action==='live'){
    if(!/^[a-zA-Z0-9_.]{1,32}$/.test(room||''))throw Error('Tên TikTok không hợp lệ');
    disconnect();raid.start();mode='live';status='Đang kết nối LIVE';disconnect=sendLive(room)
   }else if(action==='stop'){disconnect();disconnect=()=>{};mode='stop';status='Đã dừng kết nối'}
   else if(action==='reset'){raid.start();raid.demo=mode==='demo';status='Đã reset trận'}
   else if(mode!=='demo')throw Error('Chỉ sử dụng các thao tác kiểm thử khi DEMO đang bật');
   else if(action==='gift')postGift();
   else if(action==='join'){
     if(!['kiem','huyen','linh'].includes(faction))throw Error('Môn phái không hợp lệ');
     raid.join('manual-'+(++seq),name||'Đệ tử mới',faction)
   }else if(action==='skill'){
     const p=raid.players.get(String(id))||[...raid.players.values()].find(x=>x.faction===faction);
     if(!p)throw Error('Chưa có người chơi');const unit=[1,5,20,100,500][Math.min(4,Math.max(0,Number(coins)-1))];
     raid.gift(p.id,p.name,unit,1,'preview-'+(++seq));
   }
   sendAll();res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({ok:true,status,round:raid.round}));return;
  }
  let pathname=(u.pathname==='/'||u.pathname==='/admin')?'/admin.html':u.pathname==='/obs'?'/obs.html':u.pathname;
  if(pathname.includes('\0')||pathname.includes('\\')){res.writeHead(400).end();return}
  const abs=resolve(ROOT,'.'+pathname);
  if(!abs.startsWith(ROOT+sep)){res.writeHead(403).end();return}
  const type=mime[extname(abs)];if(!type){res.writeHead(404).end();return}
  const bytes=await readFile(abs);res.writeHead(200,{'Content-Type':type,'Cache-Control':(/\.(wav|mp3|webp)$/.test(pathname))?'public,max-age=604800':'no-store'}).end(bytes)
 }catch(err){const status=err.code==='ENOENT'?404:400;res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8'}).end(err.message)}
}).listen(PORT,'127.0.0.1',()=>console.log(`Tam Phái Trấn Ma Product: http://127.0.0.1:${PORT}/admin · OBS: /obs`));
