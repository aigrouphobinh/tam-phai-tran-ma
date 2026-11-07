import {STATIC_PREVIEW} from './runtime-config.js';
export {STATIC_PREVIEW};
export class GameSession{
 constructor(onState,onConnection=()=>{}){
  this.pending=new Map();this.seq=0;this.onState=onState;
  if(STATIC_PREVIEW){
   if(!globalThis.SharedWorker){onConnection(false);throw Error('Trình duyệt chưa hỗ trợ sân luyện chia sẻ. Hãy dùng Chrome hoặc bản local.');}
   this.worker=new SharedWorker('/practice-worker.js',{type:'module',name:'tam-phai-v3.0.1'});this.port=this.worker.port;
   this.port.onmessage=({data:d})=>{if(d.type==='state'){onConnection(true);onState(d.state);}else if(d.type==='reply'){const p=this.pending.get(d.id);if(p){clearTimeout(p.timer);this.pending.delete(d.id);d.error?p.reject(Error(d.error)):p.resolve(d.result);}}};
   this.port.start();this.port.postMessage({type:'state'});
  }else{
   this.stream=new EventSource('/events');this.stream.onopen=()=>onConnection(true);this.stream.onerror=()=>onConnection(false);
   this.stream.onmessage=e=>{try{onState(JSON.parse(e.data));}catch(err){console.error('Invalid state',err);}};
  }
 }
 async send(payload){
  if(!STATIC_PREVIEW){const r=await fetch('/api/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw Error(d.error||'Không thực hiện được');return d;}
  return new Promise((resolve,reject)=>{const id=String(++this.seq);const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Sân luyện không phản hồi. Tải lại trang.'));},4000);this.pending.set(id,{resolve,reject,timer});this.port.postMessage({type:'command',id,payload});});
 }
 close(){this.stream?.close();this.port?.close();}
}
