import {Effects} from './fx.js';
import {SoundBank} from './audio.js';

const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d',{alpha:false});
const W=540,H=960,TAU=Math.PI*2;
const BG=new Image();BG.src='/assets/arena-background.webp';
const BOSS=new Image();BOSS.src='/assets/boss-reference.webp';
const fx=new Effects(),audio=new SoundBank();
const COLORS={kiem:'#64bcff',huyen:'#cc76f9',linh:'#76f3bd',gold:'#ffdc8a',red:'#f15e86'};
const CLASS={kiem:'KIẾM TÔNG',huyen:'HUYỀN MÔN',linh:'LINH DƯỢC'};
const SKILLS=[['KIẾM KHÍ','1'],['LÔI KÍCH','2'],['PHONG ẤN','3'],['HỒI SINH','4'],['KIM LONG','5']];
let state=null,connected=false,lastEvent=0,lastRound=-1,frameAt=performance.now();
let anims=new Map(),activeMessage=null,notifyUntil=0;
const dummy=()=>{};
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
function drawBoss(t,s){
 const hpPct=s.hp/Math.max(1,s.maxHP),phase=s.phase,stun=s.bossState==='stun';
 const stateHit=fx.numbers.some(n=>n.x>300&&n.size>=18);
 const bob=Math.sin(t*2.7)*4;const cast=s.cast>0||s.bossState==='windup';
 const x=407+(stun?Math.sin(t*35)*3:0),y=442+bob;
 ctx.save();ctx.translate(x,y);
 glow(0,32,108,phase>=3?'#ff507f':'#b66cf5',.31);
 ctx.save();ctx.translate(0,48);ctx.scale(1,.32);ctx.strokeStyle=phase>=3?'#f95d7a':'#c67dfa';ctx.shadowBlur=24;ctx.shadowColor=ctx.strokeStyle;ctx.lineWidth=3;
 ctx.beginPath();ctx.arc(0,0,80+Math.sin(t*2)*5,0,TAU);ctx.stroke();
 for(let i=0;i<12;i++){const a=t*.35+i*TAU/12,r=70;glow(Math.cos(a)*r,Math.sin(a)*r,4,'#ffa1d9',.9)}ctx.restore();
 if(BOSS.complete&&BOSS.naturalWidth){
  const h=cast?300:296,w=h*.771;
  ctx.save();ctx.translate(-w*.55,-h*.95);ctx.rotate(cast?Math.sin(t*13)*.035:Math.sin(t*1.9)*.012);
  if(stateHit){ctx.shadowColor='#ff2c5a';ctx.shadowBlur=20}
  ctx.drawImage(BOSS,0,0,w,h);ctx.restore()
 }else{
  // Asset fallback is deliberate; state still lives independently.
  ctx.fillStyle='#8c284f';ctx.beginPath();ctx.ellipse(0,-83,55,92,-.2,0,TAU);ctx.fill();
  ctx.fillStyle='#d79b92';ctx.beginPath();ctx.arc(0,-142,24,0,TAU);ctx.fill();
 }
 // Separate floating lotus: this moves even though the boss character art is one source image.
 const lx=-59+Math.sin(t*1.3)*5,ly=-115+Math.sin(t*2.5)*7;
 ctx.save();ctx.translate(lx,ly);ctx.rotate(t*.35);
 for(let i=0;i<7;i++){ctx.rotate(TAU/7);ctx.fillStyle='#ed366e';ctx.shadowColor='#ff5d91';ctx.shadowBlur=15;ctx.beginPath();ctx.ellipse(0,-12,7,16,0,0,TAU);ctx.fill()}
 glow(0,0,13,'#ffe6bc',.8);ctx.restore();
 // Independently animated scythe weapon: charge, slash and recovery are phase/state driven.
 ctx.save();
 ctx.translate(56,-91);
 const phaseSwing=s.bossState==='windup'?-0.37:s.bossState==='impact'?.46:s.bossState==='stun'?.15:Math.sin(t*1.4)*.06;
 ctx.rotate(phaseSwing);
 ctx.shadowBlur=13;ctx.shadowColor='#ff538e';ctx.lineCap='round';
 const metal=ctx.createLinearGradient(-15,-145,55,115);metal.addColorStop(0,'#fce5a4');metal.addColorStop(.48,'#bd6480');metal.addColorStop(1,'#e8bc7f');
 ctx.strokeStyle='#4a1d34';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(13,122);ctx.quadraticCurveTo(30,10,31,-90);ctx.stroke();
 ctx.strokeStyle=metal;ctx.lineWidth=4;ctx.stroke();
 const blade=ctx.createLinearGradient(-60,-170,70,-80);blade.addColorStop(0,'#ffb1cf');blade.addColorStop(.45,'#ec3b75');blade.addColorStop(1,'#671a48');
 ctx.beginPath();ctx.moveTo(31,-92);ctx.bezierCurveTo(54,-183,-34,-193,-68,-171);ctx.bezierCurveTo(-25,-151,-6,-120,19,-106);ctx.bezierCurveTo(-29,-152,-46,-157,-42,-162);ctx.bezierCurveTo(5,-164,45,-130,31,-92);ctx.closePath();
 ctx.fillStyle=blade;ctx.fill();ctx.strokeStyle='#ffd9a0';ctx.lineWidth=2.6;ctx.stroke();
 ctx.restore();
 if(phase>=4){ctx.globalAlpha=.42+.18*Math.sin(t*7);glow(0,-100,125,'#fc2860',.45)}
 ctx.restore()
}
function robe(ctx,f){ctx.fillStyle=f==='kiem'?'#23649e':f==='huyen'?'#782d9e':'#25794f';ctx.strokeStyle=COLORS[f];ctx.lineWidth=1.2}
function fighter(p,t){
 const a=anims.get(p.id)||{x:p.x,y:p.y,rx:p.x,ry:p.y};
 const dt=clamp((performance.now()-a.received)/140);const x=lerp(a.x,a.rx,dt),y=lerp(a.y,a.ry,dt);
 const state=p.state,walk=state==='run',fight=state==='attack'||state==='cast';
 const k=Math.sin(t*(walk?18:3)+p.x*.1),amp=walk?6:1.8,scale=p.scale||.82;
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);if(state==='down'){ctx.translate(0,-4);ctx.rotate(-1.1)}
 const isLeader=p.leader,isGuardian=p.guardian;
 if(isGuardian||isLeader){glow(0,-23,isLeader?38:28,isLeader?'#ffe39e':COLORS[p.faction],.25);}
 ctx.fillStyle='#050915aa';ctx.beginPath();ctx.ellipse(0,2,18,4,0,0,TAU);ctx.fill();
 if(p.shield>0){ctx.strokeStyle='#9dd7ff';ctx.shadowColor='#93d9ff';ctx.shadowBlur=10;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,-21,20,33,0,0,TAU);ctx.stroke()}
 robe(ctx,p.faction);
 const leftLeg=walk?k*4:0,rightLeg=walk?-k*4:0;
 ctx.fillStyle='#161d33';ctx.fillRect(-7+leftLeg,-11,5,13);ctx.fillRect(2+rightLeg,-11,5,13);
 ctx.save();const r=ctx.createLinearGradient(0,-41,0,0);r.addColorStop(0,p.faction==='kiem'?'#b9d9ff':p.faction==='huyen'?'#ddaaf5':'#c0efca');r.addColorStop(.5,p.faction==='kiem'?'#286aa7':p.faction==='huyen'?'#873b9e':'#308d63');r.addColorStop(1,'#141b33');ctx.fillStyle=r;
 ctx.beginPath();ctx.moveTo(-9,-39);ctx.lineTo(10,-39);ctx.lineTo(12+amp*.7,-16);ctx.lineTo(20+amp,0);ctx.lineTo(-17+amp*.4,-1);ctx.lineTo(-13,-19);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.strokeStyle='#f4d69b';ctx.beginPath();ctx.moveTo(-11,-23);ctx.quadraticCurveTo(0,-16,13,-23);ctx.stroke();ctx.restore();
 const swing=fight?Math.sin((p.stateUntil-(state==='attack'?.42:.42))*8+t*13)*17:0;
 ctx.lineWidth=5;ctx.strokeStyle='#d3a8a2';ctx.beginPath();ctx.moveTo(-8,-36);ctx.lineTo(-15,-23+amp*.3);
 ctx.moveTo(8,-36);ctx.lineTo(13+swing*.7,-26-swing*.6);ctx.stroke();
 if(p.faction==='kiem'){
  ctx.save();ctx.translate(14+swing*.7,-28-swing*.6);ctx.rotate(-.42+(fight?swing*.032:0));
  ctx.strokeStyle='#bcefff';ctx.shadowColor='#57d9ff';ctx.shadowBlur=8;ctx.lineWidth=2.3;ctx.beginPath();ctx.moveTo(0,5);ctx.lineTo(5,-28);ctx.stroke();ctx.restore();
 }else if(p.faction==='huyen'){
  glow(16+swing*.7,-30-swing*.6,9,'#ca6cff',.65);ctx.fillStyle='#eeccff';ctx.fillRect(10+swing*.7,-36-swing*.6,9,12);
 }else{glow(16+swing*.7,-30-swing*.6,10,'#8af7b4',.8);}
 ctx.fillStyle='#ecc4ae';ctx.beginPath();ctx.ellipse(0,-46,8.2,10,0,0,TAU);ctx.fill();
 ctx.fillStyle='#14152a';ctx.beginPath();ctx.moveTo(-9,-45);ctx.quadraticCurveTo(-13,-60,0,-62);ctx.quadraticCurveTo(16,-61,8,-45);ctx.lineTo(6,-53);ctx.lineTo(-8,-49);ctx.fill();
 ctx.strokeStyle='#1c233c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-5,-55);ctx.quadraticCurveTo(-14,-42,-9+amp,-17);ctx.stroke();
 ctx.strokeStyle=COLORS[p.faction];ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(-8,-38);ctx.lineTo(8,-38);ctx.stroke();
 if(p.hp<100&&p.hp>0){ctx.fillStyle='#331c30';ctx.fillRect(-13,-69,26,3);ctx.fillStyle=COLORS[p.faction];ctx.fillRect(-13,-69,26*clamp(p.hp/100),3)}
 if(isLeader){text('♛',0,-77,19,'#ffdf88','center','Georgia',true)}
 if(isGuardian){glow(13,-65,5,'#ffe4a2',.8)}
 ctx.restore();
}
function namesAndLabels(s,t){
 const byFaction={kiem:0,huyen:0,linh:0};
 for(const p of s.players){if(!p.leader&&byFaction[p.faction]++>=2)continue;
  const a=anims.get(p.id)||{x:p.x,y:p.y,rx:p.x,ry:p.y};const k=clamp((performance.now()-a.received)/140),x=lerp(a.x,a.rx,k),y=lerp(a.y,a.ry,k)-69*(p.scale||.82);
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
  if(next.round!==lastRound){lastRound=next.round;lastEvent=next.events?.at(-1)?.id||0;fx.active=[];fx.particles=[];}
  else{
   const events=(next.events||[]).filter(ev=>ev.id>lastEvent).sort((a,b)=>a.id-b.id);
   for(const ev of events){fx.receive(ev);audio.effect(ev);if(ev.type==='SKILL_CAST'){
      activeMessage=ev.name+' ✦ '+ev.skill;notifyUntil=performance.now()/1000+2.3;
    }else if(ev.type==='PHASE'){activeMessage='BOSS BƯỚC VÀO GIAI ĐOẠN '+ev.phase;notifyUntil=performance.now()/1000+2.2}
   }
   lastEvent=next.events?.at(-1)?.id||lastEvent;
  }
  const prev=new Map((state?.players||[]).map(p=>[p.id,p]));
  for(const p of next.players||[]){const old=prev.get(p.id)||p;
   anims.set(p.id,{x:old.x,y:old.y,rx:p.x,ry:p.y,received:performance.now()})}
  for(const id of anims.keys())if(!(next.players||[]).some(p=>p.id===id))anims.delete(id);
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
