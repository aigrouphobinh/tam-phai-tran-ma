import {Effects} from './fx.js';
import {SoundBank} from './audio.js';
import {ModelAnimator} from './models2d.js';
import {SkinRenderer} from './skin-renderer.js';

const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d',{alpha:false});
const W=540,H=960,TAU=Math.PI*2;
const BG=new Image();BG.src='/assets/arena-background.webp';
const fx=new Effects(),audio=new SoundBank(),models=new ModelAnimator(),skins=new SkinRenderer();
skins.load().then(status=>{if(!status.ready)console.warn('[Tam Phai] Missing character sprites:',status.errors)});
const COLORS={kiem:'#64bcff',huyen:'#cc76f9',linh:'#76f3bd',gold:'#ffdc8a',red:'#f15e86'};
const CLASS={kiem:'KIẾM TÔNG',huyen:'HUYỀN MÔN',linh:'LINH DƯỢC'};
const SKILLS=[['KIẾM KHÍ','1'],['LÔI KÍCH','2'],['PHONG ẤN','3'],['HỒI SINH','4'],['KIM LONG','5']];
let state=null,connected=false,lastEvent=0,lastRound=-1,frameAt=performance.now();
let anims=new Map(),activeMessage=null,notifyUntil=0;
const rand=(a,b)=>Math.random()*(b-a)+a;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,k)=>a+(b-a)*k;
function roundRect(x,y,w,h,r=8){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function text(str,x,y,size=15,color='#f9eac5',align='left',font='Georgia',shadow=false){
 ctx.save();ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.font=`${size>=18?'bold':'600'} ${size}px ${font}`;ctx.fillStyle=color;
 if(shadow){ctx.shadowBlur=11;ctx.shadowColor=color}ctx.fillText(String(str),x,y);ctx.restore()
}
function panel(x,y,w,h,border='#b8935c',alpha=.92){
 ctx.save();ctx.fillStyle=`rgba(12,17,34,${alpha})`;roundRect(x,y,w,h,9);ctx.fill();
 const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,border);g.addColorStop(.45,'#4d405c');g.addColorStop(1,border);
 ctx.strokeStyle=g;ctx.lineWidth=1.6;roundRect(x+.7,y+.7,w-1.4,h-1.4,9);ctx.stroke();
 for(const xx of [x+8,x+w-8])for(const yy of [y+9,y+h-9]){ctx.fillStyle='#e3b870';ctx.beginPath();ctx.moveTo(xx,yy-3);ctx.lineTo(xx+3,yy);ctx.lineTo(xx,yy+3);ctx.lineTo(xx-3,yy);ctx.fill()}
 ctx.restore();
}
function progress(x,y,w,h,ratio,color){ctx.save();roundRect(x,y,w,h,Math.min(6,h/2));ctx.fillStyle='#111524';ctx.fill();ctx.strokeStyle='#7e6c78';ctx.lineWidth=1;ctx.stroke();ctx.shadowColor=color;ctx.shadowBlur=10;
 const width=Math.max(0,(w-4)*clamp(ratio));if(width>0){ctx.fillStyle=color;roundRect(x+2,y+2,width,h-4,Math.min(4,(h-4)/2));ctx.fill()};ctx.restore()}
function glow(x,y,r,color,alpha=.6){ctx.save();const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.globalAlpha=alpha;ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore()}
function floatingDust(t){ctx.save();ctx.globalCompositeOperation='screen';
 for(let i=0;i<45;i++){
  const x=((i*137.3+25+Math.sin(t*.6+i)*25)%550),y=((i*61.9+30-t*(3+i%4))%820+820)%820;
  ctx.globalAlpha=.11+(i%3)*.07;ctx.fillStyle=i%4?'#fda9a5':'#fce4b6';ctx.beginPath();ctx.arc(x,y,1+(i%3),0,TAU);ctx.fill();
 }ctx.restore()}
function drawBackground(t){
 ctx.save();if(BG.complete&&BG.naturalWidth)ctx.drawImage(BG,0,0,W,H);
 else{const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#2a1a43');g.addColorStop(.45,'#4f405f');g.addColorStop(1,'#111525');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
 const top=ctx.createLinearGradient(0,0,0,210);top.addColorStop(0,'rgba(9,12,33,.7)');top.addColorStop(1,'transparent');ctx.fillStyle=top;ctx.fillRect(0,0,W,210);
 const bottom=ctx.createLinearGradient(0,650,0,960);bottom.addColorStop(0,'transparent');bottom.addColorStop(.38,'rgba(8,13,29,.6)');bottom.addColorStop(1,'rgba(6,11,29,.97)');ctx.fillStyle=bottom;ctx.fillRect(0,640,W,320);
 floatingDust(t);ctx.restore()
}
// State-driven, articulated boss model: independent head, arms, scythe, skirt and ribbons.
function drawBoss(t,s){if(!skins.drawBoss(ctx,s,t,models))models.drawBoss(ctx,s,t);}
function fighter(p,t){
 const a=anims.get(p.id)||{x:p.x,y:p.y,rx:p.x,ry:p.y,received:performance.now()};
 const f=clamp((performance.now()-a.received)/Math.max(80,a.interval||120));
 const x=lerp(a.x,a.rx,f),y=lerp(a.y,a.ry,f);
 if(!skins.drawPlayer(ctx,p,t,x,y,models))models.drawPlayer(ctx,p,t,x,y);
}
function namesAndLabels(s,t){
 const byFaction={kiem:0,huyen:0,linh:0};
 for(const p of s.players){if(!p.leader&&byFaction[p.faction]++>=2)continue;
  const a=anims.get(p.id)||{x:p.x,y:p.y,rx:p.x,ry:p.y};const k=clamp((performance.now()-a.received)/Math.max(80,a.interval||120)),x=lerp(a.x,a.rx,k),y=lerp(a.y,a.ry,k)-69*(p.scale||.82);
  ctx.save();ctx.font='bold 11px sans-serif';const label=(p.leader?'♛ ':'')+p.name.slice(0,12),width=Math.min(110,ctx.measureText(label).width+17);
  panel(x-width/2,y-14,width,19,p.leader?'#ffdd82':COLORS[p.faction],.88);
  text(label,x,y,11,p.leader?'#ffe6a3':'#f9f5ed','center','sans-serif');ctx.restore();
 }
}
function scene(t,s){
 ctx.save();if(fx.shake>0)ctx.translate(rand(-5,5)*fx.shake,rand(-4,4)*fx.shake);
 fx.behind(ctx,s,t);drawBoss(t,s);
 // Live simulation position & state (never hardcoded demo characters).
 const players=[...(s.players||[])].sort((a,b)=>a.y-b.y);
 for(const p of players)fighter(p,t);
 fx.front(ctx,s,t);namesAndLabels(s,t);ctx.restore();
}
function hud(t,s){
 const hp=clamp(s.hp/Math.max(1,s.maxHP)),phase=s.phase||1,sec=Math.max(0,Math.ceil(s.time||0));
 panel(13,12,142,31,'#db7390');ctx.fillStyle='#bd244c';roundRect(20,17,68,21,4);ctx.fill();text('● LIVE',54,33,15,'#fff','center','sans-serif');
 text('◉ '+Number(s.viewerCount||0).toLocaleString('vi-VN')+' xem',95,33,12,'#e3efff','center','sans-serif');
 panel(164,12,362,51,'#d5ad68');text('TAM PHÁI TRẤN MA',345,44,25,'#ffdfa1','center','Georgia',true);
 panel(13,74,514,117,'#cf9b61');
 text('HỒNG LIÊN MA TƯỚNG',28,96,20,'#ffe1c3');
 panel(355,81,160,26,'#b76776');text('GIAI ĐOẠN '+phase,435,100,14,'#ffe3c5','center');
 progress(27,113,487,23,hp,'#e75578');
 text(`${(hp*100).toFixed(1)}%`,270,130,17,'#fff0ef','center');
 text('◷ '+Math.floor(sec/60).toString().padStart(2,'0')+':'+(sec%60).toString().padStart(2,'0'),32,165,24,'#fff0d2');
 text('TRẬN '+s.round+'   ·   '+s.count+' NGƯỜI THAM CHIẾN',511,165,12,'#ddc6ac','right','sans-serif');
 if(s.shield>0){panel(160,199,220,34,'#ce8ff5');text(`KHIÊN MA ${Math.ceil(s.shield)} · ${Math.ceil(s.cast)}s`,270,222,15,'#f6cbff','center', 'sans-serif',true)}
 if(s.warning){const time=Math.max(0,s.warning.impactAt-s.elapsed).toFixed(1);
   panel(109,679,322,51,'#e54f66');ctx.fillStyle='rgba(174,28,52,.52)';roundRect(114,683,312,43,6);ctx.fill();
   text('⚠  TRÁNH ĐÒN BOSS',270,704,19,'#fff4da','center','Georgia',true);
   text(`CÒN ${time} GIÂY`,270,721,13,'#ffcfcd','center','sans-serif')
 }else if(s.cast>0){panel(105,684,330,46,'#e45d80');text('⚠  PHÁ KHIÊN TRONG '+Math.ceil(s.cast)+' GIÂY',270,713,18,'#ffe4c1','center','Georgia',true)}
 if(s.result){panel(38,369,464,100,s.result.includes('THÀNH CÔNG')?'#e7bc69':'#d36586');
   text(s.result,270,423,27,s.result.includes('THÀNH CÔNG')?'#ffe8ad':'#ffc7d8','center','Georgia',true);
   text('TRẬN MỚI SAU '+s.rest+' GIÂY',270,451,14,'#fff4e5','center','sans-serif')}
 if(activeMessage&&notifyUntil>t){panel(77,240,386,35,'#d3ad6b',.94);text(activeMessage.slice(0,44),270,263,15,'#fff2c9','center','sans-serif')}
 panel(13,740,514,89,'#ad8659',.97);
 const fractions=['kiem','huyen','linh'],labels=['KIẾM TÔNG','HUYỀN MÔN','LINH DƯỢC'];
 fractions.forEach((f,i)=>{
  const x=23+i*169,c=COLORS[f],ct=s.factions?.[f]?.count||0;
  panel(x,749,157,71,c,.82);glow(x+26,776,18,c,.36);
  text(['⚔','☯','✿'][i],x+27,777,29,c,'center','Georgia',true);
  text(labels[i],x+53,769,13,'#fff0dc','left');text(`${ct} đệ tử`,x+53,785,11,'#d7d4e5','left','sans-serif');
  progress(x+16,796,125,10,clamp((s.energy||0)/100),c);
 });
 panel(13,836,514,72,'#c9a05d',.97);
 text('KỸ NĂNG THEO BONUS QUÀ TẶNG',270,856,16,'#ffdfa6','center');
 for(let i=0;i<5;i++){
  const x=23+i*103,col=['#5bafff','#ba67f2','#d68fff','#65e9a3','#ffbd61'][i];
  panel(x,865,91,34,col,.8);text(`B${i+1}  ${SKILLS[i][0]}`,x+46,885,11,col,'center','sans-serif',true);
 }
 panel(13,915,514,35,'#c9a065',.94);
 text('BÌNH LUẬN   !kiem  ·  !huyen  ·  !linh  ·  !skill',270,938,13,'#fff0d2','center','sans-serif');
 if(s.mode==='demo'){ctx.fillStyle='#fff1b8';text('SÂN LUYỆN · DEMO',270,677,11,'#fff1b8','center','sans-serif')}
 if(!connected){panel(95,334,350,49,'#d87c85');text('ĐANG KẾT NỐI SERVER…',270,367,18,'#fff0d2','center','sans-serif')}
}
function init(){
 const stream=new EventSource('/events');
 stream.onopen=()=>connected=true;stream.onerror=()=>connected=false;
 stream.onmessage=e=>{
  let next;try{next=JSON.parse(e.data)}catch{return}
  if(next.round!==lastRound){lastRound=next.round;lastEvent=next.events?.at(-1)?.id||0;fx.active=[];fx.particles=[];models.states.clear();anims.clear();}
  else{
   const events=(next.events||[]).filter(ev=>ev.id>lastEvent).sort((a,b)=>a.id-b.id);
   for(const ev of events){fx.receive(ev);audio.effect(ev);if(ev.type==='SKILL_CAST'){
      activeMessage=ev.name+' ✦ '+ev.skill;notifyUntil=performance.now()/1000+2.3;
    }else if(ev.type==='PHASE'){activeMessage='BOSS BƯỚC VÀO GIAI ĐOẠN '+ev.phase;notifyUntil=performance.now()/1000+2.2}
   }
   lastEvent=next.events?.at(-1)?.id||lastEvent;
  }
  const received=performance.now();
  models.observeBoss(next,received,next.elapsed);
  for(const p of next.players||[]){
   models.observe(p,received,next.elapsed);
   // Interpolate from the *rendered* position, not the last raw snapshot.
   // Prevents a visible backward jump every 100 ms when receiving new SSE frames.
   const old=anims.get(p.id);
   const elapsed=old?received-old.received:100;
   const f=old?clamp(elapsed/Math.max(80,old.interval||120)):1;
   const x=old?lerp(old.x,old.rx,f):p.x;
   const y=old?lerp(old.y,old.ry,f):p.y;
   anims.set(p.id,{x,y,rx:p.x,ry:p.y,received,interval:Math.max(80,Math.min(220,elapsed))});
  }
  const activeIds=new Set((next.players||[]).map(p=>p.id));models.dropInactive(activeIds);
  for(const id of anims.keys())if(!activeIds.has(id))anims.delete(id);
  state=next;
 };
}
let frames=0,lastTick=performance.now();
function render(now){requestAnimationFrame(render);
 // Delta is measured between frames actually drawn (not every RAF callback).
 if(now-lastTick<1000/60)return;const dt=clamp((now-lastTick)/1000,0,.065);lastTick=now;frameAt=now;
 const t=now/1000;fx.tick(dt);drawBackground(t);
 if(state){scene(t,state);hud(t,state)}else{text('ĐANG KẾT NỐI ĐẾN PHONG MA ĐÀI…',270,420,18,'#fff1c6','center')}
 if(fx.flash>0){ctx.fillStyle=`rgba(255,89,129,${fx.flash*.45})`;ctx.fillRect(0,190,540,540)}
 frames++;
}
const audioButton=document.querySelector('#audio-enable');
audioButton.addEventListener('click',async()=>{
 audioButton.disabled=true;audioButton.textContent='Đang nạp âm thanh…';
 try{const result=await audio.enable();audioButton.hidden=true;
  if(result.errors.length){document.querySelector('#audio-status').textContent='Thiếu file: '+result.errors.join(' · ');document.querySelector('#audio-status').hidden=false}}
 catch(err){audioButton.disabled=false;audioButton.textContent='Bật âm thanh';document.querySelector('#audio-status').textContent=err.message;document.querySelector('#audio-status').hidden=false}
});
init();requestAnimationFrame(render);
