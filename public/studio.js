import {GameSession,STATIC_PREVIEW} from './session.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const factions={kiem:'Kiếm Tông',huyen:'Huyền Môn',linh:'Linh Dược'};
const skills={kiem:['Kiếm Khí','Liên Trảm','Vạn Kiếm Quy Tông','Phá Giáp Kiếm Trận','Triệu Hồi Kim Long'],huyen:['Hỏa Phù','Lôi Kích','Phong Ấn','Cửu Thiên Lôi','Thiên Kiếp Trấn Ma'],linh:['Liên Hoa Hồi Phục','Thanh Ngọc Hộ Thuẫn','Cam Lộ Giải Chú','Liên Hoa Hồi Sinh','Phượng Hoàng Niết Bàn']};
const icons={kiem:['⚔','╱','✧','◇','龍'],huyen:['☯','ϟ','符','⚡','✹'],linh:['✿','❖','❧','✦','鳳']};
const fmt=n=>Number(n||0).toLocaleString('vi-VN'),thresholds=[1,5,20,100,500];
let faction='kiem',latest=null,lastEvent=0,lastRound=-1,lastRoster=0,toastTimer;
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,5000);}
function skillList(){const list=$('#skill-list');list.replaceChildren();skills[faction].forEach((name,i)=>{
 const button=document.createElement('button');button.className='skill-button';button.dataset.tier=i+1;
 const icon=document.createElement('span');icon.className='skill-icon';icon.textContent=icons[faction][i];
 const label=document.createElement('span'),title=document.createElement('span'),hint=document.createElement('small'),price=document.createElement('span');
 title.className='skill-name';title.textContent=name;hint.textContent='BẬC '+(i+1)+(i===4?' · TUYỆT KỸ':'');label.append(title,hint);price.className='skill-threshold';price.textContent=thresholds[i]+' ◆';
 button.append(icon,label,price);button.onclick=()=>send({action:'skill',faction,tier:i+1});list.append(button);
 });}
function roster(s){const list=$('#roster-list');list.replaceChildren();$('#roster-total').textContent=s.count;
 if(!s.players.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='Chưa có đệ tử. Thêm đội hình trong sân luyện hoặc bình luận nhập môn trên TikTok.';list.append(empty);}
 for(const p of s.players){const row=document.createElement('div');row.className='roster-entry';const img=new Image();img.src='/assets/characters/'+p.faction+'.webp';img.alt='';
 const info=document.createElement('div'),name=document.createElement('b'),meta=document.createElement('small'),hp=document.createElement('span');name.textContent=(p.leader?'♛ ':'')+p.name;meta.textContent=factions[p.faction]+' · '+(p.cloth?'Vải '+p.cloth+' · ':'')+(p.hp<=0?'Đang hồi sinh':p.state==='run'?'Vào vị trí':'Đang chiến đấu');hp.textContent=Math.ceil(p.hp)+' HP';info.append(name,meta);row.append(img,info,hp);list.append(row);}
 const leaders=$('#leaders');leaders.replaceChildren();if(!s.leaders?.length){leaders.textContent='Chiến công được tính từ sát thương, hỗ trợ và phá khiên thực tế.';leaders.className='muted';}
 for(const [i,p] of (s.leaders||[]).entries()){const row=document.createElement('div');row.className='roster-entry';const rank=document.createElement('span'),name=document.createElement('div'),score=document.createElement('span');rank.textContent='0'+(i+1);name.textContent=p.name;score.textContent=fmt(p.score);row.append(rank,name,score);leaders.append(row);}
}
const labels={BOSS_CLOTH_DROP:e=>e.name+' rơi mảnh trang trí · còn '+e.remaining+'/4',BOSS_LOOT_COLLECTED:e=>e.name+' nhặt '+e.material,BOSS_TRANSFORM_START:e=>'Boss biến hình thành '+e.name,BOSS_TRANSFORMED:e=>'Dạng '+e.wave+' · '+e.name,JOIN:e=>e.name+' gia nhập '+factions[e.faction],SKILL_CAST:e=>e.name+' · '+e.skill,PHASE:e=>'Hồng Liên chuyển giai đoạn '+e.phase,BOSS_TELEGRAPH:()=> 'Boss chuẩn bị tung đòn · !ne để né',BOSS_IMPACT:()=> 'Đòn boss chạm đất',BOSS_SHIELD:()=> 'Khiên ma xuất hiện · phá trong 8 giây',SHIELD_BROKEN:()=> 'Khiên ma đã bị phá',SHIELD_EXPLODE:()=> 'Khiên ma phát nổ',ILLUSION:()=> 'Ảo ảnh xuất hiện · tìm ấn đỏ bằng !1 / !2 / !3',ILLUSION_BROKEN:e=>e.name+' phá ảo ảnh',ILLUSION_EXPIRE:()=> 'Ảo ảnh hết thời gian',ADD_SPAWN:()=> 'Hồng Liên triệu hồi ma ảnh',ADD_DOWN:()=> 'Một ma ảnh đã bị tiêu diệt',REVIVE:()=> 'Đệ tử trở lại chiến trường',TEAM_STRIKE:()=> 'Tam phái hợp kích!',RESULT:e=>e.result,DODGE:()=> 'Đệ tử né đòn',ARRIVAL:e=>e.name+' vào phòng LIVE',GIFT_BONUS:e=>e.name+' · '+e.bonus,GIFT_QUEUED:e=>e.name+' · quà chờ trận tiếp theo'};
function receive(s){latest=s;
 const cycle=s.bossCycle;$('#boss-cycle-card').hidden=!cycle;
 $('#boss-name').textContent=cycle?.form.name||'Hồng Liên Ma Tướng';
 if(cycle){$('#boss-wave').textContent='DẠNG '+cycle.wave;$('#cloth-total').textContent=fmt(cycle.loot.total);$('#boss-next').textContent='Tiếp theo: '+cycle.next.name;
  $('#boss-cycle-status').textContent=cycle.transform?'Đang biến hình · quà được giữ để dùng ở dạng kế tiếp.':'Còn '+cycle.remaining+'/4 lớp ngoài · đổi dạng khi còn 12% HP.';
  [...$('#armor-pieces').children].forEach((el,i)=>{el.classList.toggle('broken',i<cycle.stage);el.style.setProperty('--boss-color',cycle.form.color);});
 }
const pct=Math.max(0,s.hp/s.maxHP*100),team=Math.max(0,s.team/s.maxTeam*100);
 $('#live-status').textContent=s.mode==='bridge'&&s.bridge?.lastFrame&&!s.bridge?.connected?'Chưa nhận frame mới · kiểm tra tab TikTok':s.status;
 $('#source-tag').textContent=s.mode==='demo'?'LUYỆN TẬP':s.mode==='bridge'?'CHROME':s.mode==='live'?'DIRECT':'LOCAL';
 $('#stage-mode').textContent=s.mode==='demo'?'SÂN LUYỆN':s.mode==='stop'?'TẠM DỪNG':s.bridge?.connected||s.mode==='live'&&s.status.startsWith('Đã kết nối')?'TIKTOK LIVE':'CHỜ TIKTOK';
 $('#boss-percent').textContent=pct.toFixed(1)+'%';$('#boss-bar').style.width=pct+'%';$('#team-percent').textContent=team.toFixed(0)+'%';$('#team-bar').style.width=team+'%';$('#phase').textContent='GĐ '+s.phase;
 $('#round').textContent=s.round;$('#timer').textContent=Math.floor(s.time/60).toString().padStart(2,'0')+':'+(s.time%60).toString().padStart(2,'0');
 $('#player-count').textContent=fmt(s.count);$('#viewer-count').textContent=['bridge','live'].includes(s.mode)?fmt(s.viewerCount):'—';$('#nav-count').textContent=fmt(s.count);$('#energy').textContent=s.energy;
 $('#objective').textContent=s.result?s.result+' · Trận mới sau '+s.rest+' giây':s.illusion?'Tìm phân thân mang ấn đỏ: !1, !2 hoặc !3 · '+Math.ceil(s.illusion.remaining)+'s':s.cast?'Phá khiên ma trong '+Math.ceil(s.cast)+' giây!':s.warning?'Boss đang lấy đà · bình luận !ne để né đòn.':s.adds?.length?'Tiêu diệt ma ảnh để trở lại tấn công boss.':s.count?'Đệ tử tự động vào tầm và tấn công. !skill để hỗ trợ.':'Bình luận chọn môn phái để xuất trận.';
 $('#ingestion-stat').textContent=fmt(s.ingestion?.accepted)+' sự kiện nhận · '+fmt(s.ingestion?.duplicates)+' trùng đã chặn';
 if(s.round!==lastRound){lastRound=s.round;lastEvent=0;$('#events').replaceChildren();}
 for(const e of (s.events||[]).filter(e=>e.id>lastEvent)){const label=labels[e.type];if(label){const row=document.createElement('div');row.className='event-row';const time=document.createElement('time'),dot=document.createElement('span'),text=document.createElement('span');time.textContent=Math.floor(e.t/60).toString().padStart(2,'0')+':'+Math.floor(e.t%60).toString().padStart(2,'0');dot.className='event-type'+(/BOSS|EXPIRE|EXPLODE/.test(e.type)?' danger':'');text.textContent=label(e);row.append(time,dot,text);$('#events').prepend(row);}lastEvent=Math.max(lastEvent,e.id);}
 while($('#events').children.length>60)$('#events').lastChild.remove();
 if(performance.now()-lastRoster>1000){roster(s);lastRoster=performance.now();}
 $('#start-practice').textContent=s.mode==='demo'?'↻ Làm mới sân luyện':'▷ Bắt đầu sân luyện';
 if(s.storageError)$('#footer-state').textContent='Không lưu được trạng thái: '+s.storageError;
}
const session=new GameSession(receive,connected=>{$('#connection-dot').classList.toggle('off',!connected);$('#connection-label').textContent=connected?(STATIC_PREVIEW?'Sân luyện trên web':'Server local sẵn sàng'):'Mất kết nối server';});
async function send(payload){try{await session.send(payload);}catch(e){toast(e.message);}}
for(const btn of $$('[data-action]'))btn.onclick=()=>send({action:btn.dataset.action});
$('#connect-live').onclick=()=>send({action:'bridge',room:$('#room').value});
$('#room').addEventListener('keydown',e=>{if(e.key==='Enter')$('#connect-live').click();});
$('#add-player').onclick=()=>send({action:'join',faction:$('#join-faction').value,name:$('#player-name').value});
$('#player-name').onkeydown=e=>{if(e.key==='Enter')$('#add-player').click();};
$('#try-like').onclick=()=>send({action:'like',faction,count:15});
for(const btn of $$('[data-chat]'))btn.onclick=()=>send({action:'chat',faction,text:btn.dataset.chat});
for(const btn of $$('[data-faction]'))btn.onclick=()=>{faction=btn.dataset.faction;for(const b of $$('[data-faction]')){b.classList.toggle('selected',b===btn);b.setAttribute('aria-selected',String(b===btn));}skillList();};
for(const btn of $$('[data-view]'))btn.onclick=()=>{for(const b of $$('[data-view]'))b.classList.toggle('active',b===btn);for(const el of $$('.inspector-view'))el.hidden=el.id!=='view-'+btn.dataset.view;if(latest)roster(latest);};
async function copy(text){try{await navigator.clipboard.writeText(text);toast('Đã sao chép.');}catch{toast('Không sao chép tự động được: '+text);}}
$('#copy-obs').onclick=()=>copy(location.origin+'/obs.html');
$('#copy-pair').onclick=async()=>{if(STATIC_PREVIEW){toast('Mở game local bằng start.cmd để lấy mã ghép nối.');return;}try{const r=await fetch('/api/bridge'),d=await r.json();if(!r.ok)throw Error(d.error);await copy(d.token);}catch(e){toast(e.message);}};
$('#reset-round').onclick=()=>$('#confirm-reset').showModal();$('#confirm-reset').addEventListener('close',()=>{if($('#confirm-reset').returnValue==='reset')send({action:'reset'});});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==$('#arena').contentWindow||e.data?.type!=='raid-metrics')return;$('#footer-state').textContent=e.data.fps+' FPS · '+e.data.assets+' tài nguyên nhân vật đã nạp';});
$('#preview-notice').hidden=!STATIC_PREVIEW;
if(STATIC_PREVIEW)$('#source-tag').textContent='WEB';
skillList();
