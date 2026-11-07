const canvas=document.querySelector('canvas'),g=canvas.getContext('2d');
const art=new Image();art.src='/art.webp';
const colors={kiem:'#76caff',huyen:'#ca99ff',linh:'#89e7a9',warn:'#ff745e',end:'#ffe49a'};
const names={kiem:'Kiếm Tông',huyen:'Huyền Môn',linh:'Linh Dược'};
const glyph={kiem:'⚔',huyen:'✧',linh:'✿'};
let state,last=0,fx=[],audio,link=true;
const button=document.querySelector('button');
button.onclick=async()=>{audio??=new AudioContext();await audio.resume();button.hidden=true;};
function tone(kind,tier){
  if(audio?.state!=='running')return;
  const t=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
  const f={kiem:540,huyen:370,linh:680,warn:165,end:440}[kind]||290;
  osc.type=kind==='warn'?'triangle':'sine';osc.frequency.setValueAtTime(f,t);
  osc.frequency.exponentialRampToValueAtTime(f*(kind==='linh'?1.6:.52),t+.19+tier*.025);
  gain.gain.setValueAtTime(.065,t);gain.gain.exponentialRampToValueAtTime(.001,t+.38);
  osc.connect(gain).connect(audio.destination);osc.start();osc.stop(t+.4);
}
const stream=new EventSource('/events');
stream.onerror=()=>{link=false;};
stream.onmessage=e=>{
  const next=JSON.parse(e.data);link=true;
  if(state&&next.round===state.round){
    const fresh=next.events.filter(x=>x.id>last);
    fx.push(...fresh.slice(-4).map(x=>({...x,start:performance.now()})));
    fx=fx.slice(-5);if(fresh.length)tone(fresh.at(-1).type,fresh.at(-1).tier);
  }else{fx=[];}
  last=next.events.at(-1)?.id||0;state=next;
};
function label(value,x,y,size,color='#fff0c8',align='left',family='Georgia'){
  g.textAlign=align;g.fillStyle=color;g.font='bold '+size+'px '+family;g.fillText(value,x,y);
}
function bar(x,y,w,f,c){g.fillStyle='#332937';g.fillRect(x,y,w,9);g.fillStyle=c;g.fillRect(x,y,w*Math.max(0,Math.min(1,f)),9);}
function shape(points,fill){g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();if(fill){g.fillStyle=fill;g.fill();}}
const silhouette=[[655,354],[681,335],[710,339],[743,363],[769,386],[809,406],[844,432],[902,463],[935,501],[936,539],[878,516],[821,484],[789,473],[778,515],[760,562],[777,617],[808,666],[824,717],[777,698],[740,666],[707,717],[684,723],[691,667],[650,716],[617,722],[637,667],[614,690],[586,697],[616,621],[634,563],[645,510],[626,532],[603,570],[576,605],[546,626],[526,626],[552,580],[588,508],[615,450],[592,455],[556,448],[520,429],[502,414],[486,400],[497,395],[520,408],[552,421],[590,417],[627,400],[653,396],[647,380]];
function boss(t){
  g.save();g.translate(278,280+Math.sin(t*2)*4);g.scale(.56,.56);g.translate(-480,-330);
  shape(silhouette);g.clip();if(art.naturalWidth)g.drawImage(art,480,330);g.restore();
}
function fighter(p,i,t){
  const row=i%8,col=Math.floor(i/8),x=35+col*37+(row%2)*14+3*Math.sin(t*3+i),y=395+row*29;
  g.save();g.translate(x,y);g.fillStyle='#121724';g.fillRect(-6,7,15,4);
  shape([[-4,-17],[4,-18],[9,-9],[7,-4],[11,7],[-10,7],[-5,-6],[-9,-10]],colors[p.faction]);
  g.fillStyle='#ecc8a9';g.fillRect(-4,-24,8,8);g.fillStyle='#1b2033';g.fillRect(-6,-26,11,4);
  g.strokeStyle=colors[p.faction];g.beginPath();g.moveTo(4,-8);g.lineTo(20+Math.sin(t*5+i)*4,-21);g.stroke();
  if(i===state.players.length-1||i<3)label(p.name.slice(0,10),0,-29,11,'#fff','center','sans-serif');g.restore();
}
function frame(ms){
  requestAnimationFrame(frame);if(ms-prev<1000/30)return;prev=ms;
  const t=ms/1000;
  g.fillStyle='#111722';g.fillRect(0,0,540,960);
  const sky=g.createLinearGradient(0,175,0,690);sky.addColorStop(0,'#303049');sky.addColorStop(.53,'#68495b');sky.addColorStop(1,'#242b37');g.fillStyle=sky;g.fillRect(0,170,540,520);
  g.fillStyle='#eeb89a';g.beginPath();g.arc(422,250,38,0,7);g.fill();
  for(let i=0;i<8;i++)shape([[i*95-120,435],[i*95-30,265+50*Math.sin(i*2)],[i*95+99,435]],i%2?'#39344b':'#41384d');
  g.fillStyle='#33303d';g.fillRect(0,430,540,260);g.strokeStyle='#504550';
  for(let j=0;j<7;j++){const y=440+j*j*6;g.beginPath();g.moveTo(0,y);g.lineTo(540,y);g.stroke();}
  label('PHONG MA ĐÀI',24,42,16,'#d5ad6d');label('Tam Phái Trấn Ma',24,85,39);
  if(!state){label('Đang kết nối…',25,140,20);return;}
  const s=state;label('HỒNG LIÊN MA TƯỚNG',25,128,21);label(Math.ceil(s.hp/30)+'%',515,128,22,'#ffa496','right');bar(25,146,490,s.hp/3000,'#cf5e65');
  label('HỒI '+s.phase+'   ·   TRẬN '+s.round,24,199,15);label(Math.floor(s.time/60)+':'+String(s.time%60).padStart(2,'0'),515,199,21,'#fff0c8','right');
  boss(t);s.players.forEach((p,i)=>fighter(p,i,t));
  fx=fx.filter(e=>ms-e.start<1500);
  for(const e of fx){
    const k=(ms-e.start)/1500,col=colors[e.type]||'#e3c27a';g.save();g.globalAlpha=1-k;g.strokeStyle=col;g.lineWidth=2+e.tier;
    if(e.type==='kiem'){for(let j=0;j<e.tier*2;j++){g.beginPath();g.moveTo(80+k*245,490+j*6);g.lineTo(125+k*245,466+j*6);g.stroke();}}
    else {g.beginPath();g.ellipse(e.type==='linh'?120:376,510,20+55*k,8+22*k,0,0,7);g.stroke();}
    g.restore();
  }
  if(s.illusion){
    for(let i=1;i<=3;i++){const x=105*i+55;label(i===s.target?'✥':'✧',x,553,38,i===s.target?'#ff6b76':'#a990d4','center');label('!'+i,x,582,18,'#fff','center');}
  }
  const msg=s.result||(s.illusion?'Chọn ấn đỏ · !1 !2 !3':'')||(s.cast?'Phá khiên · '+s.cast+' giây':s.count?'':'Chờ đệ tử nhập môn');
  if(msg)label(msg,270,638,26,'#ffdbae','center');
  label('TRẬN PHÁP',24,724,15);bar(141,714,170,s.team/1000,'#94d9be');label(s.count+' đệ tử',514,725,18,'#efcf94','right');
  for(const [i,f] of Object.keys(names).entries()){const x=25+i*167;label(glyph[f]+' '+names[f],x,777,20,colors[f]);label('!'+f,x,802,17,'#d5c6ad');}
  const event=s.events.at(-1);label(s.result&&s.leaders.length?'MVP · '+s.leaders[0].name:event?event.name+' · '+event.text:'Bình luận để chọn môn phái',25,859,19);
  label('!skill   •   Nội lực '+s.energy+'/100',25,901,17,'#a7bec1');label(link?s.status:'Đang nối lại…',25,936,14,'#bdac9c');
}
let prev=-100;requestAnimationFrame(frame);
