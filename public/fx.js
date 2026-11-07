// Real-time VFX rendering, driven only by authoritative RaidEngine events.
const TAU=Math.PI*2;
const C={kiem:'#68d7ff',huyen:'#cf71ff',linh:'#8fffc0',boss:'#ff547c',gold:'#ffca5c'};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const rand=(a,b)=>a+Math.random()*(b-a);
const gradient=(ctx,x,y,r,c)=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,c);g.addColorStop(1,'transparent');return g};
function line(ctx,points,color,width=2,blur=12){ctx.save();ctx.shadowColor=color;ctx.shadowBlur=blur;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();for(let i=0;i<points.length;i++){let [x,y]=points[i];i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();ctx.restore()}
function star(ctx,x,y,r,color,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.shadowBlur=11;ctx.shadowColor=color;ctx.beginPath();ctx.moveTo(x,y-r);ctx.quadraticCurveTo(x+r*.14,y-r*.14,x+r,y);ctx.quadraticCurveTo(x+r*.14,y+r*.14,x,y+r);ctx.quadraticCurveTo(x-r*.14,y+r*.14,x-r,y);ctx.quadraticCurveTo(x-r*.14,y-r*.14,x,y-r);ctx.fill();ctx.restore()}
function ring(ctx,x,y,r,col,alpha=1,ell=.35,width=2){ctx.save();ctx.globalAlpha=alpha;ctx.shadowColor=col;ctx.shadowBlur=14;ctx.strokeStyle=col;ctx.lineWidth=width;ctx.beginPath();ctx.ellipse(x,y,r,Math.max(3,r*ell),0,0,TAU);ctx.stroke();ctx.restore()}
function lotus(ctx,x,y,r,col,t,opacity=1){
 ctx.save();ctx.translate(x,y);ctx.rotate(.07*Math.sin(t*1.5));ctx.globalAlpha=opacity;
 for(let k=0;k<2;k++){
  for(let i=0;i<8;i++){
   const a=i*TAU/8+k*.3;
   ctx.save();ctx.rotate(a);ctx.fillStyle=k?`${col}70`:`${col}a0`;ctx.strokeStyle=col;ctx.shadowBlur=16;ctx.shadowColor=col;
   ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(r*.37,-r*.18,r*.85,0);ctx.quadraticCurveTo(r*.37,r*.19,0,0);ctx.fill();ctx.stroke();ctx.restore();
  }
 }
 star(ctx,0,0,r*.20,'#fff1c8');ctx.restore()
}
function runeCircle(ctx,x,y,r,t,col,alpha=1){
 ctx.save();ctx.translate(x,y);ctx.scale(1,.35);ctx.globalAlpha=alpha;ctx.shadowColor=col;ctx.shadowBlur=13;
 for(const f of [.6,.83,1]){ctx.strokeStyle=col;ctx.lineWidth=f===.83?2:1;ctx.beginPath();ctx.arc(0,0,r*f,0,TAU);ctx.stroke()}
 ctx.rotate(t*.2);for(let i=0;i<20;i++){const a=i*TAU/20;ctx.save();ctx.rotate(a);ctx.translate(r*.82,0);ctx.strokeStyle=col;ctx.lineWidth=1.4;
  ctx.beginPath();ctx.moveTo(-3,-5);ctx.lineTo(3,5);ctx.moveTo(-4,0);ctx.lineTo(4,0);ctx.stroke();ctx.restore()}
 ctx.restore();
}
function lightning(ctx,x1,y1,x2,y2,col,seed,t,scale=1){
 const segs=13,points=[];
 for(let i=0;i<=segs;i++){
  const k=i/segs,side=Math.sin(i*13.17+seed*19+t*35)*((1-k)*12+3)*scale;
  points.push([lerp(x1,x2,k)+side,lerp(y1,y2,k)+Math.cos(i*7.1+seed*2)*side*.5]);
 }
 line(ctx,points,col,5,18);line(ctx,points,'#fff8ff',1.6,3);
 for(let i=3;i<segs;i+=4){const p=points[i];line(ctx,[p,[p[0]+rand(-28,28),p[1]+rand(18,50)]],col,1,6)}
}
function dragon(ctx,x,y,p,size=1){
 // The golden dragon is an animated procedural actor, not a static flash/image.
 const headX=lerp(-70,x,p),headY=y-90+Math.sin(p*8)*19;
 ctx.save();ctx.globalCompositeOperation='lighter';
 const body=[];for(let i=0;i<=21;i++){
  const q=i/21,xx=headX-q*235*size,yy=headY+Math.sin(q*12-p*9)*35*size+q*70;
  body.push([xx,yy]);
 }
 line(ctx,body,'#ff942d',18*size,20);line(ctx,body,'#ffe093',7*size,28);line(ctx,body,'#fff5b9',2.5*size,5);
 ctx.shadowColor='#ffb039';ctx.shadowBlur=20;
 for(let i=2;i<body.length-1;i+=2){const [xx,yy]=body[i];
  ctx.save();ctx.translate(xx,yy);ctx.rotate(Math.sin(i+p*18)*.5);
  ctx.fillStyle=i%4?'#ffb74f':'#fff0b2';ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(-17,-13);ctx.lineTo(1,-5);ctx.closePath();ctx.fill();ctx.restore()}
 ctx.save();ctx.translate(headX,headY);ctx.rotate(.04*Math.sin(p*9));
 ctx.fillStyle='#ffd273';ctx.beginPath();ctx.moveTo(-20,-12);ctx.quadraticCurveTo(8,-27,30,-7);ctx.lineTo(42,7);ctx.lineTo(14,17);ctx.quadraticCurveTo(-4,4,-18,12);ctx.fill();
 ctx.strokeStyle='#fff3ca';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(-8,-31);ctx.lineTo(3,-20);ctx.lineTo(11,-37);ctx.stroke();
 star(ctx,19,-7,5,'#fffef0');
 ctx.beginPath();ctx.moveTo(34,5);ctx.quadraticCurveTo(58,3,69,11);ctx.moveTo(32,9);ctx.quadraticCurveTo(57,24,69,18);ctx.stroke();ctx.restore();ctx.restore();
}
function phoenix(ctx,x,y,p,col){
 const yy=y-70-Math.sin(p*5)*15;
 ctx.save();ctx.translate(lerp(-45,x,p),yy);ctx.globalCompositeOperation='lighter';ctx.shadowBlur=20;ctx.shadowColor=col;
 ctx.fillStyle=col;ctx.strokeStyle='#f1ffe6';ctx.lineWidth=2;
 const wing=Math.sin(p*16)*18;
 for(const dir of [-1,1]){
  ctx.save();ctx.scale(dir,1);ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(40,-35+wing,74,-73+wing,102,-58+wing);ctx.quadraticCurveTo(53,-28+wing,15,12);
  ctx.closePath();ctx.fill();ctx.stroke();
  for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(10,10);ctx.quadraticCurveTo(30+i*10,30+i*13,18+i*7,60+i*8);ctx.stroke()}
  ctx.restore();
 }
 ctx.beginPath();ctx.moveTo(-12,-8);ctx.quadraticCurveTo(0,-36,14,-8);ctx.quadraticCurveTo(0,24,-12,-8);ctx.fill();
 ctx.beginPath();ctx.moveTo(12,-14);ctx.lineTo(33,-20);ctx.lineTo(14,-6);ctx.fill();ctx.restore();
}
export class Effects{
 constructor(){this.active=[];this.particles=[];this.numbers=[];this.shake=0;this.flash=0;this.count=0}
 addParticles(x,y,color,n=20,spd=70,direction=0,spread=TAU){
  const room=Math.max(0,600-this.particles.length);n=Math.min(n,room);
  for(let i=0;i<n;i++){
   const a=direction+(Math.random()-.5)*spread,v=rand(spd*.3,spd);
   this.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.35,1.35),age:0,r:rand(1.4,4.1),color});
  }
 }
 receive(e){if(!e||!e.type)return;let x=e.x??e.targetX??420,y=e.y??e.targetY??420;
  if(e.type==='SKILL_CAST'){
   const dur=e.tier===5?2.5:e.tier===4?1.75:1.1;
   this.active.push({kind:'skill',event:e,age:0,dur});
   this.addParticles(e.x,e.y,C[e.faction],10+e.tier*7,100);
   if(e.tier>=4)this.flash=Math.max(this.flash,.11);
  }else if(e.type==='DAMAGE'){
   if(e.source==='basic'){this.active.push({kind:'strike',event:e,age:0,dur:.3})}
   if(e.amount>0){this.numbers.push({x:415+rand(-22,25),y:370+rand(-15,25),age:0,life:1.05,
     text:'−'+Number(e.amount).toLocaleString('vi-VN'),color:e.shieldDamage?'#ffe08b':e.faction==='kiem'?'#ffe098':'#f7c9f5',size:e.source==='skill'?25:14});}
   this.addParticles(420,420,e.shieldDamage?'#b3c6ff':'#ff6786',e.source==='skill'?20:4,65);
  }else if(e.type==='BOSS_IMPACT'||e.type==='SHIELD_EXPLODE'){
   this.active.push({kind:'impact',event:e,age:0,dur:.9});this.addParticles(x,y,C.boss,75,235);this.shake=.9;this.flash=.17;
  }else if(e.type==='SHIELD_BROKEN'){
   this.active.push({kind:'break',event:e,age:0,dur:1});this.addParticles(x,y,'#caa3ff',95,180);this.shake=.52;
  }else if(['HEAL','AUTO_HEAL','REVIVE'].includes(e.type)){
   this.addParticles(x,y,C.linh,e.type==='REVIVE'?55:12,80);
   this.numbers.push({x,y,age:0,life:1.3,text:'+'+(e.amount||55),color:C.linh,size:17});
   if(e.type==='REVIVE')this.active.push({kind:'revive',event:e,age:0,dur:1.3});
  }else if(e.type==='PLAYER_HIT'){
   this.addParticles(x,y,'#ff6b9b',10,90);this.numbers.push({x,y:y-28,age:0,life:1.0,text:'−'+e.amount,color:'#ff98ab',size:13});
  }else if(e.type==='TEAM_STRIKE'){
   this.active.push({kind:'team',event:e,age:0,dur:1.5});this.shake=.35;
  }else if(e.type==='PHASE'){
   this.active.push({kind:'phase',event:e,age:0,dur:2.2});this.flash=.4;this.shake=.45;
  }else if(e.type==='RESULT'){
   this.active.push({kind:'result',event:e,age:0,dur:3});this.addParticles(270,420,'#ffdc90',150,190);
  }
  this.active=this.active.slice(-36);
 }
 tick(dt){this.shake=Math.max(0,this.shake-dt*1.6);this.flash=Math.max(0,this.flash-dt*.9);
  for(const p of this.particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.35,dt);p.vy+=18*dt}
  this.particles=this.particles.filter(p=>p.age<p.life);
  for(const v of this.active)v.age+=dt;
  this.active=this.active.filter(v=>v.age<v.dur);
  for(const n of this.numbers){n.age+=dt;n.y-=29*dt}
  this.numbers=this.numbers.filter(n=>n.age<n.life);
 }
 behind(ctx,state,t){
  if(state?.warning){const w=state.warning,remaining=Math.max(0,w.impactAt-state.elapsed),p=clamp(1-remaining/2.2);
   ctx.save();ctx.globalAlpha=.18+.20*Math.abs(Math.sin(t*6));ctx.fillStyle='#f33a69';ctx.strokeStyle='#ff5267';ctx.lineWidth=2.5;ctx.shadowColor='#ff4f7b';ctx.shadowBlur=16;
   if(w.kind==='circle'){ctx.beginPath();ctx.ellipse(w.x,w.y,w.radius,w.radius*.42,0,0,TAU);ctx.fill();ctx.stroke();}
   else if(w.kind==='sweep'){ctx.fillRect(45,w.y-30,470,80);ctx.strokeRect(45,w.y-30,470,80)}
   else{ctx.beginPath();ctx.moveTo(409,390);ctx.lineTo(170,570);ctx.lineTo(460,685);ctx.closePath();ctx.fill();ctx.stroke()}
   ctx.restore();ring(ctx,w.x,w.y,20+p*100,'#ff4c78',.9, .35,3);
  }
  if(state?.shield>0){const r=58+Math.sin(t*8)*2;ring(ctx,418,452,r,'#c77dff',.75,.28,3);runeCircle(ctx,418,460,80,t,'#b77aff',.38)}
  for(const v of this.active){if(v.kind==='skill'){
    const e=v.event,p=clamp(v.age/v.dur),col=C[e.faction];
    if(e.faction==='huyen')runeCircle(ctx,420,495,55+p*20,t,col,(1-p)*.9);
    if(e.faction==='linh'){lotus(ctx,e.x||155,e.y||640,20+p*30,col,t,(1-p)*.85);
      ring(ctx,e.x,e.y,33+p*45,col,(1-p)*.75,.24,3)}
    if(e.faction==='kiem'&&e.tier>=4)runeCircle(ctx,420,476,57+p*37,t,'#ffd36e',(1-p)*.9);
   }else if(v.kind==='revive'){ring(ctx,v.event.x,v.event.y,10+v.age*55,C.linh,1-v.age/v.dur,.3,4)}
  }
 }
 front(ctx,state,t){
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const v of this.active){const e=v.event||{},p=clamp(v.age/v.dur),fade=clamp((1-p)*2);
   if(v.kind==='skill'){
    const col=C[e.faction],sx=e.x||175,sy=(e.y||510)-25,tx=e.targetX||420,ty=e.targetY||420;
    if(e.faction==='kiem'){
     if(e.tier===5){dragon(ctx,tx,ty,p,1.05);if(p>.65)ring(ctx,tx,ty,25+(p-.65)*240,'#ffca64',fade,.5,5)}
     else{
      const project=Math.min(1,p*2.1),n=e.tier===3?8:e.tier===4?12:e.tier===2?3:1;
      for(let i=0;i<n;i++){
       const off=(i-(n-1)/2)*Math.min(10,70/n);
       const x=lerp(sx,tx,clamp(project-i*.025)),y=lerp(sy,ty,clamp(project-i*.025))+off+Math.sin(p*10+i)*8;
       line(ctx,[[x-25,y+7],[x+13,y-11]],i%2?'#7de2ff':'#edfdff',e.tier>=3?3:4,20);
       star(ctx,x+10,y-11,6,col,fade);
      }
     }
    }else if(e.faction==='huyen'){
      if(e.tier===1){star(ctx,lerp(sx,tx,p),lerp(sy,ty,p)-40,26,'#dd7cff',fade)}
      else{
       const cnt=e.tier>=5?7:e.tier>=4?4:e.tier===2?1:2;
       for(let j=0;j<cnt;j++){
        const xx=tx+(j-(cnt-1)/2)*20;
        lightning(ctx,xx-35,-30,xx,ty,'#e198ff',j*.3,p,1.1);
       }
       runeCircle(ctx,tx,ty+58,65+p*35,p*8,'#b96aff',fade);
      }
    }else{
      if(e.tier>=5)phoenix(ctx,tx,ty,p,col);
      else {lotus(ctx,lerp(sx,240,p),lerp(sy,580,p),25+p*50,col,t,fade);
       for(let i=0;i<5;i++){let a=t*1.2+i*TAU/5;star(ctx,170+Math.cos(a)*70,600+Math.sin(a)*30,7,col,fade)}}
    }
   }else if(v.kind==='impact'||v.kind==='break'){
    const cc=v.kind==='break'?'#bc96ff':'#ff4e78';
    ring(ctx,e.x??420,e.y??420,20+p*170,cc,fade,.36,6*(1-p)+1);
    for(let i=0;i<9;i++){const a=i*TAU/9+t*2,r=p*145;star(ctx,(e.x??420)+Math.cos(a)*r,(e.y??420)+Math.sin(a)*r*.5,12*(1-p),cc,fade)}
   }else if(v.kind==='strike'){
    const ex=420,ey=422;ring(ctx,ex,ey,8+p*18,C[e.faction]||C.kiem,fade,.5,2.3);
   }else if(v.kind==='team'){
    for(let i=0;i<3;i++)lightning(ctx,120+i*80,720,415,420,[C.kiem,C.huyen,C.linh][i],i,p,1.25);
   }else if(v.kind==='phase'){
    ring(ctx,420,430,30+p*200,'#fa538a',fade,.35,8);
   }
  }
  for(const p of this.particles){const k=1-p.age/p.life;ctx.globalAlpha=k;ctx.shadowBlur=12;ctx.shadowColor=p.color;ctx.fillStyle=p.color;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r*k,0,TAU);ctx.fill();}
  ctx.restore();
  for(const n of this.numbers){const a=clamp(1-n.age/n.life);ctx.save();ctx.globalAlpha=a;ctx.font=`bold ${n.size}px Georgia`;ctx.textAlign='center';ctx.lineWidth=2;ctx.strokeStyle='#20162c';ctx.strokeText(n.text,n.x,n.y);ctx.fillStyle=n.color;ctx.shadowColor=n.color;ctx.shadowBlur=11;ctx.fillText(n.text,n.x,n.y);ctx.restore()}
 }
}
