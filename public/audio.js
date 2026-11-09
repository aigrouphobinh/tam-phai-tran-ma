// Spatial sound mixer. 15 locally authored audio tracks are served as compressed MP3.
const NAMES=['temple_ambience','sword_whoosh','sword_impact','sword_rain','lightning','magic_seal','heal_lotus','shield_bloom','shield_break','dragon_roar','warning','boss_cast','boss_impact','revive','victory'];
export class SoundBank{
 constructor(){this.context=null;this.buffers=new Map();this.master=null;this.music=null;this.sfx=null;this.ambience=null;this.enabled=false;
   this.voiceCount=new Map();this.lastPlay=new Map();this.loadErrors=[];this.masterLevel=.63}
 async enable(){
  this.context??=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
  await this.context.resume();
  if(!this.master){
   const c=this.context;this.master=c.createGain();this.master.gain.value=this.masterLevel;
   const limiter=c.createDynamicsCompressor();limiter.threshold.value=-15;limiter.knee.value=16;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.3;
   this.music=c.createGain();this.music.gain.value=.16;this.sfx=c.createGain();this.sfx.gain.value=.85;
   this.music.connect(limiter);this.sfx.connect(limiter);limiter.connect(this.master);this.master.connect(c.destination);
  }
  await Promise.all(NAMES.map(async name=>{
   if(this.buffers.has(name))return;
   try{const r=await fetch(`/assets/audio/${name}.mp3`);if(!r.ok)throw Error(`${name}: HTTP ${r.status}`);
    this.buffers.set(name,await this.context.decodeAudioData(await r.arrayBuffer()));
   }catch(err){this.loadErrors.push(err.message)}
  }));
  this.enabled=true;
  if(!this.ambience)this.ambience=this.play('temple_ambience',{volume:.7,loop:true,music:true});
  return {ok:this.buffers.size,errors:this.loadErrors.slice()};
 }
 setVolume(v){this.masterLevel=Math.min(1,Math.max(0,v));if(this.master)this.master.gain.setTargetAtTime(this.masterLevel,this.context.currentTime,.05)}
 play(name,{volume=1,x=270,loop=false,music=false,rate=1}={}){
  if(!this.enabled||!this.context||!this.buffers.has(name))return null;
  const now=performance.now(),last=this.lastPlay.get(name)||0;
  // Prevent 30 simultaneous basic attacks from overwhelming a livestream.
  if(!music&&now-last<(name==='sword_impact'?120:75))return null;
  this.lastPlay.set(name,now);
  const active=this.voiceCount.get(name)||0;
  if(!music&&active>=4)return null;
  const c=this.context,source=c.createBufferSource();source.buffer=this.buffers.get(name);source.loop=loop;source.playbackRate.value=rate;
  const gain=c.createGain();gain.gain.value=Math.min(1.2,Math.max(0,volume));
  const stereo=c.createStereoPanner();stereo.pan.value=Math.max(-.8,Math.min(.8,(x-270)/320));
  source.connect(gain);gain.connect(stereo);stereo.connect(music?this.music:this.sfx);
  this.voiceCount.set(name,active+1);
  source.onended=()=>{this.voiceCount.set(name,Math.max(0,(this.voiceCount.get(name)||1)-1));source.disconnect();gain.disconnect();stereo.disconnect();if(this.ambience===source)this.ambience=null};
  source.start();return source;
 }
 stop(){if(this.ambience){this.ambience.stop();this.ambience=null}this.enabled=false}
 effect(event){
  const f=event.faction,t=event.tier||1;
  if(event.type==='SKILL_CAST'){
   const name=f==='kiem'?(t===5?'dragon_roar':t>=3?'sword_rain':'sword_whoosh'):
     f==='huyen'?(t>=2?'lightning':'magic_seal'):
     t>=4?'revive':t>=2?'shield_bloom':'heal_lotus';
   this.play(name,{volume:Math.min(.9,.3+t*.12),x:event.x??270});
  }else if(event.type==='BASIC_ATTACK_START'){
    // Windup audible as the model starts its swing/cast, before server-validated impact.
    this.play(f==='kiem'?'sword_whoosh':f==='huyen'?'magic_seal':'heal_lotus',
      {volume:.12,x:event.x??270});
  }else if(event.type==='DAMAGE'&&event.source==='basic'){
    this.play(f==='kiem'?'sword_impact':f==='huyen'?'lightning':'magic_seal',
      {volume:.14,x:event.x??420});
  }
  else if(event.type==='BOSS_TELEGRAPH')this.play('warning',{volume:.54,x:410});
  else if(event.type==='BOSS_SHIELD')this.play('boss_cast',{volume:.65,x:410});
  else if(event.type==='SHIELD_BROKEN'||event.type==='SHIELD_EXPLODE')this.play('shield_break',{volume:.77,x:420});
  else if(event.type==='BOSS_IMPACT')this.play('boss_impact',{volume:.8,x:event.x});
  else if(event.type==='RESULT'&&event.result?.includes('THÀNH CÔNG'))this.play('victory',{volume:.9});
  else if(event.type==='REVIVE')this.play('revive',{volume:.5,x:event.x});
  else if(event.type==='BOSS_CLOTH_DROP')this.play('shield_break',{volume:.3,x:404});
  else if(event.type==='BOSS_LOOT_COLLECTED')this.play('magic_seal',{volume:.12,x:350});
  else if(event.type==='BOSS_TRANSFORM_START')this.play('boss_cast',{volume:.6,x:404});
  else if(event.type==='BOSS_TRANSFORMED')this.play('revive',{volume:.45,x:404});
 }
}
