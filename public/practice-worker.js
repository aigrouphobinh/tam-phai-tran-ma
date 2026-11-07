// One simulation shared by the controller, OBS iframe and additional same-origin tabs.
import {RaidEngine} from '/engine.mjs';
const raid=new RaidEngine(),ports=new Set();let mode='stop',seq=0,status='Sân luyện web · chưa bắt đầu';
function state(){return {...raid.snapshot(),mode,status,room:'',viewerCount:0,ingestion:{accepted:0,duplicates:0,ignored:0},preview:true};}
function post(port,payload){try{port.postMessage(payload);}catch{ports.delete(port);}}
function broadcast(){const s=state();for(const port of ports)post(port,{type:'state',state:s});}
function act(a){
 if(a.action==='bridge'||a.action==='live')throw Error('LIVE chạy trên máy của bạn. Tải mã nguồn và mở start.cmd để kết nối.');
 if(a.action==='demo'){raid.start();mode='demo';status='Sân luyện web · thao tác thử';}
 else if(a.action==='stop'){mode='stop';status='Sân luyện đã tạm dừng';}
 else if(a.action==='reset')raid.start({retainPlayers:true});
 else{
  if(mode!=='demo')throw Error('Bắt đầu sân luyện trước');
  if(a.action==='squad')for(const [i,f] of ['kiem','huyen','linh'].entries())raid.join('practice-'+(++seq),['Kiếm khách','Phù sư','Dược sư'][i]+' '+seq,f);
  else if(a.action==='join'){if(!['kiem','huyen','linh'].includes(a.faction))throw Error('Môn phái không hợp lệ');raid.join('practice-'+(++seq),a.name||'Đệ tử '+seq,a.faction);}
  else{const p=raid.players.get(a.id)||[...raid.players.values()].find(p=>p.faction===a.faction)||[...raid.players.values()][0];if(!p)throw Error('Thêm đệ tử trước');
   if(a.action==='skill')raid.gift(p.id,p.name,[1,5,20,100,500][Math.min(4,Math.max(0,Number(a.tier)-1))],1,'practice-gift-'+(++seq));
   else if(a.action==='like')raid.like(p.id,a.count||15);
   else if(a.action==='chat')raid.chat(p.id,p.name,a.text);
   else throw Error('Lệnh không hợp lệ');
  }
 }
 broadcast();return {ok:true,status};
}
onconnect=e=>{const port=e.ports[0];ports.add(port);port.onmessage=({data:d})=>{if(d.type==='command'){try{post(port,{type:'reply',id:d.id,result:act(d.payload)});}catch(error){post(port,{type:'reply',id:d.id,error:error.message});}}else post(port,{type:'state',state:state()});};port.start();post(port,{type:'state',state:state()});};
let prev=performance.now(),last=0;
setInterval(()=>{const now=performance.now();if(mode==='demo'){let remaining=Math.min(3,(now-prev)/1000);while(remaining>0){const dt=Math.min(.05,remaining);raid.tick(dt);remaining-=dt;}raid.demo=true;}prev=now;if(now-last>=100){last=now;broadcast();}},50);
