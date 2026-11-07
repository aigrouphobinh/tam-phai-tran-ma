// Tam Phai Tran Ma — animation design tracks for real RGBA cutout models.
// The tracks specify staging, timing, silhouette, fabric response and cue markers.
// Combat state, damage and elapsed time remain authoritative on Node.js.
// With approved hand-painted sprite strips, SkinRenderer uses those frames first.
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const p=(at,x=0,y=0,tilt=0,upper=0,mid=0,lower=0,stretch=0,glow=0)=>(
 {at,x,y,tilt,upper,mid,lower,stretch,glow});
const track=(duration,loop,keys,cues=[])=>({duration,loop,keys,cues});
// The key values are modest normalized offsets, not false claims of skeletal animation.
// X,Y are design units (converted to visible pixels by the renderer).
// Pose geometry is expressed from anticipation to contact to recovery.
const IDLE=track(2.1,true,[
 p(0),p(.25,0,-.3,.004,.12,.05,.1,.005),p(.5,0,-.9,-.005,.06,.12,.17,.01),p(.75,0,-.3,.002,.1,0,.08),p(1)
]);
const RUN=track(.72,true,[
 p(0,-.7,-.5,-.022,-.8,-.4,-.55,-.018),
 p(.25,0,-3,-.075,1.2,.45,1.0,.024),
 p(.5,.65,-.2,.03,-.85,-.42,-.7,-.016),
 p(.75,0,-2.7,-.07,1.25,.5,1,.024),
 p(1,-.7,-.5,-.022,-.8,-.4,-.55,-.018)
],[{at:.25,type:'footstep'},{at:.75,type:'footstep'}]);
const HIT=track(.48,false,[
 p(0),p(.16,-3,1,-.12,-2,1.2,.4,-.025,.55),
 p(.36,-5,2,-.22,-3,1.4,.8,-.045,.9),
 p(.68,-2,1,-.07,-.5,.35,.24,-.008,.30),p(1)
],[{at:.18,type:'hurt'}]);
const DOWN=track(.65,false,[
 p(0),p(.25,-3,4,-.24,-1.5,.8,.7,-.05),
 p(.6,-7,13,-.65,-2.1,1.4,.3,-.12),
 p(1,-10,17,-.83,-.7,0,0,-.13)
],[{at:.6,type:'down-impact'}]);
const REVIVE=track(1.1,false,[
 p(0,-10,17,-.83,-.7,0,0,-.13,.9),
 p(.25,-8,10,-.55,0,.4,.2,-.07,.85),
 p(.65,-2,-3,-.08,.4,.15,.5,.045,1),
 p(1,0,0,0,0,0,0,0,.36)
],[{at:.1,type:'heal-start'},{at:.64,type:'revive-rise'}]);
const VICTORY=track(1.9,true,[
 p(0,0,0,0),p(.25,0,-2,-.035,.4,.12,.3,.02,.3),
 p(.55,0,-4,-.04,1.2,.4,.65,.04,.65),
 p(.8,0,-2,-.035,.8,.1,.35,.01,.4),p(1,0,0,0)
],[{at:.48,type:'victory-pose'}]);
const KIEM_ATTACK=track(.58,false,[
 p(0),p(.15,-2,1,-.07,-1.2,-.55,.6,-.018),
 p(.28,-4,1,-.16,-2.0,-.8,.9,-.045,.22),
 p(.44,7,-1,.19,3.2,1.5,-1.6,.095,1),
 p(.62,8,-2,.16,2.2,1.0,-1.2,.065,.7),
 p(.84,3,0,.035,.4,.3,-.3,.012,.2),p(1)
],[{at:.12,type:'sword-windup'},{at:.44,type:'sword-contact'},{at:.62,type:'sword-followthrough'}]);
const KIEM_CAST=track(1.15,false,[
 p(0),p(.18,-1,-2,-.08,-.8,-.4,.4,0,.2),
 p(.36,-2,-3,-.12,-1.8,-.8,.9,-.015,.6),
 p(.63,4,-5,.1,2.8,1.1,-1.4,.06,1),
 p(.76,5,-4,.08,1.1,.6,-.8,.025,.6),p(1)
],[{at:.25,type:'sword-summon'},{at:.63,type:'sword-release'}]);
const HUYEN_ATTACK=track(.82,false,[
 p(0),p(.18,-2,-1,-.06,-1.1,-.5,.3,-.01,.32),
 p(.4,-2,-3,-.08,-2.5,-.8,1.5,-.015,.75),
 p(.61,1,-1,.025,2.4,1.3,-1.4,.025,1),
 p(.78,1,0,0,.8,.5,-.7,0,.55),p(1)
],[{at:.23,type:'talisman-raise'},{at:.61,type:'talisman-release'}]);
const HUYEN_CAST=track(1.24,false,[
 p(0),p(.18,0,-2,-.04,-1.5,-.4,.6,0,.35),
 p(.43,0,-5,-.08,-2.7,-.9,1.9,.035,.7),
 p(.66,0,-6,-.04,-2.6,-1.3,2.2,.045,1),
 p(.81,3,-2,.11,2.3,1.1,-1.5,.05,.85),p(1)
],[{at:.2,type:'seal-form'},{at:.62,type:'seal-lock'},{at:.81,type:'seal-release'}]);
const LINH_ATTACK=track(.78,false,[
 p(0),p(.2,0,-1,.03,-.65,-.2,.45,.01,.25),
 p(.44,1,-3,.04,-1.6,.4,.9,.025,.8),
 p(.66,0,-4,-.01,1.1,.7,-.5,.018,1),p(1)
],[{at:.34,type:'lotus-open'},{at:.66,type:'heal-release'}]);
const LINH_CAST=track(1.14,false,[
 p(0),p(.17,0,-2,.02,-.8,-.3,.6,.015,.4),
 p(.39,0,-5,0,-1.7,.3,1.2,.025,.75),
 p(.65,0,-7,0,-1.0,.2,1.5,.045,1),
 p(.83,0,-2,-.02,.8,.55,.3,0,.7),p(1)
],[{at:.19,type:'lotus-grow'},{at:.65,type:'heal-pulse'},{at:.83,type:'petal-fall'}]);
const BOSS_IDLE=track(2.65,true,[
 p(0),p(.28,0,-1,.01,.35,.18,.9,.012,.3),
 p(.54,0,-2,-.015,-.15,-.4,-.8,-.014,.5),p(.78,0,-1,.01,.23,.2,.9,.008,.25),p(1)
]);
const BOSS_WINDUP=track(2.2,false,[
 p(0),p(.16,-1,-2,-.03,-.6,-.3,.5,-.02,.3),
 p(.4,-2,-7,-.055,-2.2,-.7,1.2,.015,.64),
 p(.72,-3,-8,-.08,-3.2,-1.0,1.7,.035,1),
 p(1,-2,-8,-.07,-3.0,-.95,1.5,.03,1)
],[{at:.12,type:'boss-charge'},{at:.72,type:'boss-telegraph-full'}]);
const BOSS_IMPACT=track(.72,false,[
 p(0,-2,-8,-.07,-3,-.9,1.5,.03,.85),
 p(.2,7,-3,.2,3,1.6,-2,.13,1),
 p(.5,8,-2,.16,2.3,.9,-1.4,.1,.9),
 p(.75,1,0,.02,.5,.4,-.4,.015,.55),p(1)
],[{at:.2,type:'scythe-impact'},{at:.5,type:'blood-lotus-wave'}]);
const BOSS_STUN=track(.9,false,[
 p(0),p(.16,-4,1,-.17,-2.3,.7,.6,-.04,.6),
 p(.44,-3,3,-.2,-1.6,.6,.2,-.045,.7),
 p(.78,-1,1,-.06,-.3,.3,0,-.01,.25),p(1)
],[{at:.2,type:'shield-break'}]);
const BOSS_PHASE=track(1.45,false,[
 p(0,0,0,0,0,0,0,0,.4),p(.22,0,-5,-.04,-1.5,-.3,1,.015,.7),
 p(.49,0,-11,0,-3,-1,2.7,.065,1),
 p(.7,0,-8,.025,1,.7,2,.04,1),p(1,0,-1,0,.2,.2,.1,0,.6)
],[{at:.25,type:'phase-chant'},{at:.49,type:'phase-shockwave'}]);
export const ANIMATION_TRACKS=Object.freeze({
 kiem:{idle:IDLE,run:RUN,attack:KIEM_ATTACK,cast:KIEM_CAST,hit:HIT,down:DOWN,revive:REVIVE,victory:VICTORY},
 huyen:{idle:IDLE,run:RUN,attack:HUYEN_ATTACK,cast:HUYEN_CAST,hit:HIT,down:DOWN,revive:REVIVE,victory:VICTORY},
 linh:{idle:IDLE,run:RUN,attack:LINH_ATTACK,cast:LINH_CAST,hit:HIT,down:DOWN,revive:REVIVE,victory:VICTORY},
 boss:{idle:BOSS_IDLE,run:RUN,attack:BOSS_IMPACT,cast:BOSS_WINDUP,hit:BOSS_STUN,
  down:DOWN,revive:REVIVE,victory:VICTORY,windup:BOSS_WINDUP,impact:BOSS_IMPACT,
  stun:BOSS_STUN,phase:BOSS_PHASE}
});
export function profileFor(actor,state){
 return ANIMATION_TRACKS[actor]?.[state]||ANIMATION_TRACKS[actor]?.idle||IDLE;
}
export function sampleDirection(actor,state,age=0,clock=0){
 const track=profileFor(actor,state),duration=track.duration;
 const time=track.loop?((Math.max(0,age)%duration)/duration):clamp(age/duration);
 const keys=track.keys;
 let left=keys[0],right=keys[keys.length-1];
 for(let i=0;i<keys.length-1;i++)if(time>=keys[i].at&&time<=keys[i+1].at){left=keys[i];right=keys[i+1];break}
 const w=smooth((time-left.at)/Math.max(1e-6,right.at-left.at));
 const interpolate=k=>left[k]+(right[k]-left[k])*w;
 return {duration,progress:time,loop:track.loop,cues:track.cues,
  x:interpolate('x'),y:interpolate('y'),tilt:interpolate('tilt'),
  upper:interpolate('upper'),mid:interpolate('mid'),lower:interpolate('lower'),
  stretch:interpolate('stretch'),glow:interpolate('glow'),
  cloth:Math.sin(clock*2.2+time*Math.PI*2)*(actor==='boss'?1.3:.7)};
}
export function validateDirectionTracks(tracks=ANIMATION_TRACKS){
 const actors=['kiem','huyen','linh','boss'], states=['idle','run','attack','cast','hit','down','revive','victory'];
 for(const actor of actors){
  const group=tracks[actor];if(!group)throw Error('missing actor '+actor);
  for(const state of states){
   const item=group[state];if(!item||!Number.isFinite(item.duration)||item.duration<=0)
    throw Error('missing or invalid state '+actor+':'+state);
   if(item.keys.length<2||item.keys[0].at!==0||item.keys.at(-1).at!==1)
    throw Error('invalid endpoints '+actor+':'+state);
   for(let i=0;i<item.keys.length;i++){
    const key=item.keys[i];if(i&&key.at<=item.keys[i-1].at)throw Error('unordered keys '+actor+':'+state);
    for(const f of ['at','x','y','tilt','upper','mid','lower','stretch','glow'])
     if(!Number.isFinite(key[f]))throw Error('invalid value '+actor+':'+state+':'+f);
   }
   if(item.cues.some(c=>!(c.at>=0&&c.at<=1&&typeof c.type==='string')))
    throw Error('invalid cue '+actor+':'+state);
  }
 }
 return true;
}
