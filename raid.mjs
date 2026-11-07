import {advance, deploy} from './fighters.mjs';
import {skills,selectGiftSkill} from './combat.mjs';
export class Raid {
  constructor(scores={}) {
    this.scores=new Map(Object.entries(scores));
    this.round=0;
    this.start();
  }
  start() {
    this.round++;
    this.players=new Map();
    this.hp=3000; this.team=1000; this.time=240; this.energy=0;
    this.illusion=0; this.target=0; this.ward=0; this.regen=0; this.bleed=0; this.stun=0; this.revive=false; this.elapsed=0; this.shield=0; this.cast=0; this.rest=0; this.poison=0;
    this.events=[]; this.result=''; this.leaders=[];
  }
  note(name, text, type='join', tier=0) {
    this.seq=(this.seq||0)+1;
    this.events.push({id:this.seq,name,text,type,tier});
    if(this.events.length>8) this.events.shift();
  }
  join(id,name,faction) {
    if(!Object.hasOwn(skills,faction)||this.players.has(id)||this.players.size>=2000) return;
    this.players.set(id,{id,name:String(name).slice(0,24),faction,score:0,ready:0,...deploy(faction,this.players.size)});
    this.note(name,'Gia nhập môn phái');
  }
  input(e) {
    if(this.result||!e.id) return;
    if(e.type==='like'){this.energy=Math.min(100,this.energy+Math.min(20,e.count||1));return;}
    const cmd=String(e.text||'').trim().toLowerCase();
    if(e.type==='chat'&&cmd.startsWith('!')) this.join(e.id,e.name,cmd.slice(1));
    if(e.type==='gift'&&!this.players.has(e.id)) this.join(e.id,e.name,'kiem');
    const p=this.players.get(e.id);
    if(!p) return;
    if(e.type==='chat'&&this.illusion&&['!1','!2','!3'].includes(cmd)&&p.vote!==this.elapsed+this.illusion){
      p.vote=this.elapsed+this.illusion;
      if(Number(cmd.slice(1))===this.target){
        this.illusion=0;this.damage(125);p.score+=125;
        this.note(p.name,'Phá ảo ảnh','huyen',3);
        if(!this.hp)this.finish('Trấn ma thành công');
      }
    }
    if(e.type==='chat'&&cmd==='!skill'&&p.ready<=this.elapsed){
      p.ready=this.elapsed+8; this.apply(p,1);
    }
    if(e.type==='gift'){
      const skill=selectGiftSkill(p.faction,e.coins,e.count);
      if(skill) this.apply(p,skill.tier);
    }
  }
  damage(amount) {
    const before=this.hp+this.shield;
    const absorbed=Math.min(this.shield,amount);
    this.shield-=absorbed;
    this.hp=Math.max(0,this.hp-amount+absorbed);
    if(!this.shield) this.cast=0;
    return before-this.hp-this.shield;
  }
  apply(p,tier) {
    const power=[0,24,48,90,160,280][tier];
    if(p.faction==='kiem'){
      const hits=[1,2,5,1,3][tier-1];
      if(tier===4) this.shield=0;
      for(let i=0;i<hits;i++) this.damage(Math.ceil(power/hits));
      if(tier===5) this.bleed=5;
    }
    if(p.faction==='huyen'){
      this.damage(Math.ceil(power*.7));
      if(tier===2) this.bleed=3;
      if(tier===3&&this.cast) this.cast=Math.min(14,this.cast+4);
      if(tier>=4){this.cast=0;this.shield=0;this.stun=tier;}
      if(tier===5) this.energy=Math.min(100,this.energy+50);
    }
    if(p.faction==='linh'){
      this.team=Math.min(1000,this.team+power);
      if(tier===2) this.ward=Math.min(300,this.ward+power);
      if(tier>=3) this.poison=0;
      if(tier>=4) this.revive=true;
      if(tier===5) this.regen=8;
    }
    p.score+=power; this.note(p.name,skills[p.faction][tier-1],p.faction,tier);
    if(!this.hp) this.finish('Trấn ma thành công');
  }
  finish(result) {
    if(this.result) return;
    this.result=result; this.rest=12;
    this.leaders=[...this.players.values()].sort((a,b)=>b.score-a.score).slice(0,3);
    for(const p of this.players.values()) this.scores.set(p.id,(this.scores.get(p.id)||0)+p.score);
    this.note('Phong Ma Đài',result,'end');
  }
  tick() {
    if(this.result){if(--this.rest<=0){this.ward=0;this.start();}return;}
    if(!this.players.size) return;
    this.time--; this.elapsed++;
    const phase=this.phase();

    if(this.regen>0){this.regen--;this.team=Math.min(1000,this.team+12);}
    if(this.bleed>0){this.bleed--;this.damage(10);}
    if(this.stun>0)this.stun--;
    for(const p of this.players.values()){
      if(!this.hp) break;
      advance(p,this.elapsed,amount=>this.damage(amount));
    }
    if(this.energy>=100){this.energy=0;this.damage(80);this.note('Tam phái','Hợp kích','kiem',2);}
    if(!this.hp){this.finish('Trấn ma thành công');return;}
    if(this.illusion>0&&!--this.illusion)this.team-=70;
    if(phase===2&&this.elapsed%24===0){
      this.illusion=8;this.target=1+Math.floor(Math.random()*3);
      this.note('Hồng Liên','Tìm phân thân mang ấn đỏ','warn');
    }
    if(this.cast&&!--this.cast){this.team-=150;this.shield=0;this.poison=6;}
    if(this.elapsed%30===0){this.cast=10;this.shield=50+phase*20;this.note('Hồng Liên','Phá khiên trong 10 giây','warn');}
    if(!this.stun&&this.elapsed%4===0){
      const hit=6*phase,block=Math.min(this.ward||0,hit);
      this.ward=(this.ward||0)-block; this.team-=hit-block;
    }
    if(this.poison>0){this.poison--;this.team-=3;}
    if(this.team<=0&&this.revive){this.team=250;this.revive=false;this.note("Linh Dược","Hồi sinh trận pháp","linh",4);}
    if(this.team<=0||this.time===0) this.finish('Phong ấn tan vỡ');
  }
  phase(){return this.hp>2000?1:this.hp>900?2:3;}
  snapshot(){
    const players=[...this.players.values()];
    return {round:this.round,elapsed:this.elapsed,hp:this.hp,team:Math.max(0,this.team),time:this.time,phase:this.phase(),cast:this.cast,
      illusion:this.illusion,target:this.target,shield:this.shield,energy:this.energy,events:this.events,players:players.slice(-40),count:players.length,
      leaders:this.leaders,result:this.result,rest:this.rest};
  }
}
