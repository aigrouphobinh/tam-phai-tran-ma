import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {RaidEngine} from './engine.mjs';
import {InputGate} from './input.mjs';
import {CheckpointStore} from './persistence.mjs';

export async function createGameServer({port=Number(process.env.PORT||8788),dataDir=resolve(fileURLToPath(new URL('./.runtime/',import.meta.url))),restore=true}={}){
 const ROOT=resolve(fileURLToPath(new URL('./public/',import.meta.url)));
 const raid=new RaidEngine(),store=new CheckpointStore(resolve(dataDir,'checkpoint.json'));
 const recovered=restore&&await store.load(raid);
 const gate=new InputGate(raid);
 await mkdir(dataDir,{recursive:true});
 let token;try{token=(await readFile(resolve(dataDir,'bridge-token'),'utf8')).trim();}catch{token=randomBytes(24).toString('hex');await writeFile(resolve(dataDir,'bridge-token'),token,{mode:0o600});}
 let mode='stop',room='',status=recovered?'Đã khôi phục trận · chọn nguồn LIVE để tiếp tục':'Chờ chọn nguồn phát',viewers=0,seq=Date.now(),lastFrame=0,frames=0,lastDecodeError='',disconnect=()=>{};
 const clients=new Set();
 const state=()=>({...raid.snapshot(),mode,status,room,viewerCount:viewers,ingestion:gate.snapshot(),
  bridge:{frames,lastFrame,error:lastDecodeError,connected:mode==='bridge'&&Date.now()-lastFrame<20000},storageError:store.error});
 const broadcast=()=>{const payload='data: '+JSON.stringify(state())+'\n\n';for(const res of clients){if(res.writableEnded||res.destroyed||res.writableLength>1e6){clients.delete(res);res.destroy();continue;}res.write(payload);}};
 function training(){raid.pendingGifts=[];raid.start();raid.eventLedger.clear();gate.seen.clear();raid.sessionRoom='';raid.sessionSource='practice';mode='demo';room='';status='Sân luyện · chỉ nhận thao tác thử';}
 function command({action,faction,name,id,tier,coins,room:requestedRoom,text,count}){
  if(!['bridge','demo','stop','reset','join','skill','gift','chat','like','squad'].includes(action))throw Error('Lệnh không hợp lệ');
  if(action==='bridge'){
   const nextRoom=String(requestedRoom||'').trim().replace(/^@/,'');if(!/^[a-zA-Z0-9_.]{1,32}$/.test(nextRoom))throw Error('Nhập tên kênh TikTok, không kèm đường link');
   disconnect();disconnect=()=>{};
   if(raid.sessionSource==='practice'||raid.sessionRoom&&raid.sessionRoom!==nextRoom){raid.pendingGifts=[];raid.start();raid.eventLedger.clear();gate.seen.clear();viewers=0;}
   room=nextRoom;raid.sessionRoom=nextRoom;raid.sessionSource='live';mode=action;raid.demo=false;lastDecodeError='';
   status='Chờ tab TikTok @'+room;
  }else if(action==='demo'){disconnect();disconnect=()=>{};training();}
  else if(action==='stop'){disconnect();disconnect=()=>{};mode='stop';status='Đã tạm dừng';}
  else if(action==='reset'){raid.start({retainPlayers:true});status=mode==='demo'?'Sân luyện · trận mới':'Đã mở trận mới';}
  else{
   if(mode!=='demo')throw Error('Thao tác thử chỉ dùng trong sân luyện');
   if(action==='join'){
    if(!['kiem','huyen','linh'].includes(faction))throw Error('Chọn môn phái hợp lệ');
    raid.join('practice-'+(++seq),name||'Đệ tử luyện tập '+seq,faction);
   }else if(action==='squad'){
    for(const [i,f] of ['kiem','huyen','linh'].entries())raid.join('practice-'+(++seq),['Kiếm khách','Phù sư','Dược sư'][i]+' '+String(seq).slice(-3),f);
   }else{
    const p=raid.players.get(String(id))||[...raid.players.values()].find(p=>p.faction===faction)||[...raid.players.values()][0];
    if(!p)throw Error('Thêm đệ tử trước khi thử kỹ năng');
    if(action==='skill'||action==='gift'){
     const t=Math.min(5,Math.max(1,Math.trunc(Number(tier||coins)||1)));raid.gift(p.id,p.name,[1,5,20,100,500][t-1],1,'practice-'+(++seq));
    }else if(action==='chat')raid.chat(p.id,p.name,text);
    else if(action==='like')raid.like(p.id,count||15);
   }
  }
  broadcast();store.save(raid);return {ok:true,status,round:raid.round};
 }
 const json=(res,code,obj)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj));};
 async function body(req,max=16000){const parts=[];let n=0;for await(const chunk of req){n+=chunk.length;if(n>max)throw Error('Dữ liệu vượt giới hạn');parts.push(chunk);}return JSON.parse(Buffer.concat(parts).toString('utf8'));}
 const sameOrigin=req=>{const host=req.headers.host||'',origin=req.headers.origin;return /^(localhost|127\.0\.0\.1):\d+$/.test(host)&&(!origin||origin===`http://${host}`);};
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg','.json':'application/json','.zip':'application/zip'};
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/api/tiktok/frame'){
   const origin=req.headers.origin||'';if(/^chrome-extension:\/\/[a-p]{32}$/.test(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');}
   if(req.method==='OPTIONS'){res.writeHead(204).end();return;}
   if(req.method!=='POST'){json(res,405,{error:'POST required'});return;}
   const supplied=Buffer.from(String(req.headers.authorization||'').replace(/^Bearer /,'')),expected=Buffer.from(token);
   if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){json(res,401,{error:'Mã ghép nối không đúng'});return;}
   if(mode!=='bridge'){json(res,409,{error:'Chọn kết nối qua trình duyệt trên bảng điều khiển'});return;}
   const data=await body(req,3_000_000);
   if(String(data.room||'').toLowerCase()!==room.toLowerCase()){json(res,409,{error:'Tab TikTok khác kênh đã chọn'});return;}
   if(typeof data.frame!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(data.frame))throw Error('Frame không hợp lệ');
   try{const {decodeFrame}=await import('./bridge.mjs');const events=await decodeFrame(Buffer.from(data.frame,'base64'));
    for(const e of events){if(e.type==='viewers')viewers=e.data.count;else gate.receive(e.type,e.data);}
    frames++;lastFrame=Date.now();lastDecodeError='';status='Đang nhận TikTok @'+room;
    json(res,200,{ok:true,received:events.length});
   }catch(e){lastDecodeError=String(e.message).slice(0,180);json(res,422,{error:'Không giải mã được frame TikTok: '+lastDecodeError});}return;
  }
  if(url.pathname==='/api/control'){
   if(req.method!=='POST'||!sameOrigin(req)||!String(req.headers['content-type']).startsWith('application/json')){json(res,403,{error:'Chỉ điều khiển trên máy đang chạy game'});return;}
   json(res,200,command(await body(req)));return;
  }
  if(url.pathname==='/api/bridge'){
   if(!sameOrigin(req)||req.headers['sec-fetch-site']==='cross-site'){json(res,403,{error:'Local only'});return;}
   json(res,200,{token,endpoint:`http://127.0.0.1:${server.address().port}/api/tiktok/frame`});return;
  }
  if(url.pathname==='/api/health'){json(res,200,{ok:true,version:'3.0.0',recovered,mode});return;}
  if(url.pathname==='/api/state'){json(res,200,state());return;}
  if(url.pathname==='/events'){
   res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
   clients.add(res);res.write('data: '+JSON.stringify(state())+'\n\n');req.on('close',()=>clients.delete(res));return;
  }
  if(url.pathname==='/engine.mjs'){res.writeHead(200,{'Content-Type':mime['.mjs']});res.end(await readFile(new URL('./engine.mjs',import.meta.url)));return;}
  const routes={'/':'/index.html','/admin':'/index.html','/admin/':'/index.html','/obs':'/obs.html','/obs/':'/obs.html','/models':'/models.html','/models/':'/models.html','/animation-studio':'/animation-studio.html'};
  const path=decodeURIComponent(routes[url.pathname]||url.pathname);
  if(path.includes('\0')||path.includes('\\'))throw Error('Đường dẫn không hợp lệ');
  const abs=resolve(ROOT,'.'+path);if(!abs.startsWith(ROOT+sep)||!mime[extname(abs)]){res.writeHead(404).end();return;}
  const bytes=await readFile(abs);res.writeHead(200,{'Content-Type':mime[extname(abs)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(bytes);
 }catch(e){json(res,e.code==='ENOENT'?404:400,{error:e.message});}});
 let previous=performance.now(),lastBroadcast=0,lastSave=0;
 const timer=setInterval(()=>{const now=performance.now(),dt=Math.min(.2,(now-previous)/1000);previous=now;
  if(mode!=='stop'){raid.tick(dt);raid.demo=mode==='demo';}
  if(now-lastBroadcast>100){broadcast();lastBroadcast=now;}
  if(now-lastSave>3000&&mode!=='stop'){lastSave=now;store.save(raid);}
 },50);
 server.on('close',()=>{clearInterval(timer);disconnect();for(const res of clients)res.end();});
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',ok);});
 return {server,raid,gate,command,state,store,token,close:async()=>{clearInterval(timer);disconnect();for(const res of clients)res.end();await store.save(raid);await new Promise(ok=>server.close(ok));}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const app=await createGameServer();console.log(`Tam Phái Trấn Ma · http://127.0.0.1:${app.server.address().port} · OBS /obs`);
 if(process.argv.includes('--open')){
  const {spawn}=await import('node:child_process'),url=`http://127.0.0.1:${app.server.address().port}`;
  const [command,args]=process.platform==='win32'?['cmd.exe',['/d','/s','/c','start','""',url]]:process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];
  const browser=spawn(command,args,{stdio:'ignore',detached:true,windowsHide:true});
  browser.on('error',()=>console.log('Mở trình duyệt tại '+url));browser.unref();
 }
 for(const sig of ['SIGINT','SIGTERM'])process.once(sig,()=>app.close().then(()=>process.exit()));
}
