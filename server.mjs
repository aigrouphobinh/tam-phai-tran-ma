import http from 'node:http';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {Raid} from './raid.mjs';
import {live} from './live.mjs';
const port=Number(process.env.PORT||8788), save=new URL('./save.json',import.meta.url);
let scores={};
try{scores=JSON.parse(await readFile(save));}catch(e){if(e.code!=='ENOENT')console.warn('Không đọc được bảng điểm:',e.message);}
const raid=new Raid(scores), clients=new Set();
let training=false;
let status='Chờ kết nối',stop=()=>{},demo=false,sequence=0;
const factions=['kiem','huyen','linh'];
function simulate(){
  const n=sequence++,i=n%12,id='demo'+i,name=['Minh','Lan','An','Vân'][i%4]+(i+1);
  raid.input({type:'chat',id,name,text:'!'+factions[i%3]});
  raid.input({type:'gift',id,name,coins:[1,5,20,100,500][n%5],count:1});
}
function snapshot(){return JSON.stringify({...raid.snapshot(),status,demo});}
function broadcast(){const data='data: '+snapshot()+'\n\n';for(const c of clients)if(!c.write(data))c.destroy();}
setInterval(()=>{
  if(demo&&raid.elapsed%3===0)simulate();
  const previous=raid.result;
  raid.tick();
  if(!previous&&raid.result){
    writeFile(new URL('./save.json.tmp',import.meta.url),JSON.stringify(Object.fromEntries(raid.scores)))
      .then(()=>rename(new URL('./save.json.tmp',import.meta.url),save)).catch(console.error);
  }
  broadcast();
},1000);
const routes={'/':'admin.html','/admin':'admin.html','/obs':'obs.html','/arena.js':'arena.js','/art.webp':'art.webp'};
http.createServer(async(req,res)=>{
  const address='http://127.0.0.1:'+port;
  const path=new URL(req.url,address).pathname;
  if(path==='/events'){
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store'});
    clients.add(res);res.on('close',()=>clients.delete(res));res.write('data: '+snapshot()+'\n\n');return;
  }
  if(path==='/control'&&req.method==='POST'){
    if(req.headers.host!==new URL(address).host&&req.headers.host!=='localhost:'+port ||
       req.headers.origin&&req.headers.origin!=='http://'+req.headers.host ||
       req.headers['content-type']!=='application/json'){res.writeHead(403).end();return;}
    try{
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>2048)throw Error('Dữ liệu quá dài');}
      const {action,room,faction}=JSON.parse(raw);
      if(action==='live'&&!/^[\w.]{1,32}$/.test(room||''))throw Error('Tên kênh không hợp lệ');
      if(!['live','demo','stop','gift','train','join'].includes(action))throw Error('Lệnh không hợp lệ');
      if(action==='join'){
        if(!training||!factions.includes(faction))throw Error('Chọn chế độ luyện tập và môn phái');
        const id='practice'+(++sequence);
        raid.input({type:'chat',id,name:'Đệ tử '+sequence,text:'!'+faction});
      }else if(action==='gift'){if(!demo)throw Error('Hãy bật giả lập trước');simulate();}
      else{
        stop();training=action==='train';demo=action==='demo';status=training?'Luyện tập':demo?'Giả lập':action==='live'?'Đang kết nối':'Đã ngắt';
        raid.start();raid.ward=0;
        if(action==='live')stop=live(room,e=>raid.input(e),s=>{status=s;broadcast();});
      }
      broadcast();res.end('OK');
    }catch(e){res.writeHead(400).end(e.message);}return;
  }
  if(!Object.hasOwn(routes,path)){res.writeHead(404).end();return;}
  try{const file=routes[path];res.setHeader('Content-Type',file.endsWith('js')?'text/javascript':file.endsWith('webp')?'image/webp':'text/html; charset=utf-8');res.end(await readFile(new URL('./public/'+file,import.meta.url)));}catch{res.writeHead(500).end();}
}).listen(port,'127.0.0.1',()=>console.log('Điều khiển: http://127.0.0.1:'+port+'   OBS: /obs'));
