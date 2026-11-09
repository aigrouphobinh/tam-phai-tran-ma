// Tam Phai Tran Ma — texture-backed 2D actors.
// All combat results remain authoritative in engine.mjs; this module only draws them.
// A single image is a high-quality sprite, NOT a fully articulated bone animation.
import {getPose} from './models2d.js';
import {sampleDirection} from './animation-direction.js';
import {drawDeformedSprite} from './sprite-mesh.js';
const FACTIONS=['kiem','huyen','linh','boss'],clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const safePath=s=>typeof s==='string'&&/^\/assets\/characters\/[a-z0-9_-]+\.(png|webp)$/.test(s);
const aliases={windup:'cast',impact:'attack',stun:'hit',phase:'cast'};
// Shared by the live renderer and the studio: seeking a thumbnail must select
// exactly the same source rectangle as the authoritative action timeline.
export function sampleAtlasFrame(clip,age=0,actionDuration=null){
 const duration=clip.syncToAction&&Number.isFinite(actionDuration)&&actionDuration>0
  ?actionDuration:clip.frames/clip.fps;
 const progress=clip.loop?(Math.max(0,age)/duration)%1:clamp(age/duration,0,1);
 let frame=Math.min(clip.frames-1,Math.floor(progress*clip.frames));
 if(clip.frameTimes){frame=0;for(let i=1;i<clip.frames;i++)if(progress+1e-9>=clip.frameTimes[i])frame=i;}
 const source=(clip.startFrame||0)+frame;
 return {frame,source,duration,progress,sx:(source%clip.columns)*clip.frameWidth,
  sy:Math.floor(source/clip.columns)*clip.frameHeight};
}
export function validateSkinManifest(m){
 if(!m||m.version!==1||!m.actors||typeof m.actors!=='object')throw Error('Skin manifest version 1 required');
 const actors={},bossForms={};
 const variants=Object.entries(m.bossForms||{});
 if(variants.length>8||variants.some(([id])=>!['honglien','bangnguyet','loianh','kimsa'].includes(id)))throw Error('Invalid boss form');
 const entries=[...FACTIONS.map(k=>[k,m.actors[k]]),...variants.map(([id,a])=>['boss:'+id,a])];
 for(const [k,a] of entries){
  if(!a)throw Error('Missing actor '+k);
  if(k.startsWith('boss:')&&a.baseCoverage!=='opaque-high-neck-tunic-leggings-boots')throw Error('Permanent covered boss base required');
  if(a.flipX!==undefined&&typeof a.flipX!=='boolean')throw Error('Invalid actor facing '+k);
  if(!Array.isArray(a.anchor)||a.anchor.length!==2||a.anchor.some(n=>!Number.isFinite(n)||n<0||n>1))throw Error('Invalid anchor '+k);
  if(!Number.isFinite(a.renderHeight)||a.renderHeight<32||a.renderHeight>500)throw Error('Invalid renderHeight '+k);
  const texture=a.texture||null,layers=Array.isArray(a.layers)?a.layers:[];
  if((!texture&&!layers.length)||(texture&&!safePath(texture))||layers.length>50)throw Error('Invalid textures '+k);
  const bones=['root','head','hair','torso','armL','armR','legL','legR','cape','weapon'];
  const states=['idle','run','attack','cast','hit','down','revive','victory','windup','impact','stun','phase'];
  const animations={};
  for(const [state,clip] of Object.entries(a.animations||{})){
   if(!states.includes(state)||!clip||!safePath(clip.texture))throw Error('Invalid animation '+k+':'+state);
   const {frames,columns,rows,frameWidth,frameHeight,fps}=clip;
   if(!Number.isSafeInteger(frames)||frames<1||frames>256||
      !Number.isSafeInteger(columns)||columns<1||columns>32||
      !Number.isSafeInteger(rows)||rows<1||rows>32||
      frames>columns*rows||!Number.isSafeInteger(frameWidth)||frameWidth<8||frameWidth>2048||
      !Number.isSafeInteger(frameHeight)||frameHeight<8||frameHeight>2048||
      !Number.isFinite(fps)||fps<=0||fps>60||
      (clip.renderScale!==undefined&&(!Number.isFinite(clip.renderScale)||clip.renderScale<.4||clip.renderScale>2.5)))
    throw Error('Invalid animation dimensions '+k+':'+state);
   if(clip.startFrame!==undefined&&(!Number.isSafeInteger(clip.startFrame)||clip.startFrame<0||clip.startFrame+frames>columns*rows))
    throw Error('Invalid animation start frame '+k+':'+state);
   if(clip.syncToAction!==undefined&&typeof clip.syncToAction!=='boolean')throw Error('Invalid animation sync '+k+':'+state);
   if(clip.frameTimes!==undefined&&(!Array.isArray(clip.frameTimes)||clip.frameTimes.length!==frames||clip.frameTimes[0]!==0||
    clip.frameTimes.some((n,i)=>!Number.isFinite(n)||n<0||n>=1||(i>0&&n<=clip.frameTimes[i-1]))))
    throw Error('Invalid animation frame times '+k+':'+state);
   animations[state]={texture:clip.texture,frames,columns,rows,frameWidth,frameHeight,
    fps,loop:clip.loop!==false,...(clip.renderScale!==undefined?{renderScale:clip.renderScale}:{}),
    ...(clip.startFrame!==undefined?{startFrame:clip.startFrame}:{}),
    ...(clip.syncToAction!==undefined?{syncToAction:clip.syncToAction}:{}),
    ...(clip.frameTimes!==undefined?{frameTimes:clip.frameTimes.slice()}: {})};
  }
  for(const l of layers){
   if(!safePath(l.texture)||!bones.includes(l.bone||'root'))throw Error('Invalid layer '+k);
   for(const f of ['x','y','rotation','width','height','pivotX','pivotY'])if(l[f]!==undefined&&!Number.isFinite(l[f]))throw Error('Nonfinite rig value '+k);
  }
  const actor={texture,anchor:a.anchor,renderHeight:a.renderHeight,flipX:a.flipX===true,
   layers:layers.map(l=>({bone:'root',x:0,y:0,rotation:0,width:.5,height:.5,pivotX:.5,pivotY:.5,...l})),
   sourceArt:typeof a.sourceArt==='string'?a.sourceArt:null,animations};
  if(k.startsWith('boss:'))bossForms[k.slice(5)]=actor;else actors[k]=actor;
 }
 let bossAccessories=null;
 if(m.bossAccessories){const b=m.bossAccessories;
  if(!safePath(b.texture)||b.columns!==4||b.rows!==4||b.frameWidth!==256||b.frameHeight!==256)throw Error('Invalid boss accessory atlas');
  bossAccessories={texture:b.texture,columns:4,rows:4,frameWidth:256,frameHeight:256};
 }
 return {version:1,actors,bossForms,bossAccessories};
}
export class SkinRenderer{
 constructor({fetchFn,ImageCtor=globalThis.Image,clock=()=>performance.now()}={}){
  // Browser fetch requires its native Window receiver. Extracting window.fetch
  // without binding throws "Illegal invocation" before the manifest loads.
  this.fetchFn=fetchFn??((...args)=>globalThis.fetch(...args));
  this.ImageCtor=ImageCtor;this.clock=clock;
  this.manifest=null;this.images=new Map();this.errors=[];this.ready=false;this.loading=null;
 }
 fetchImage(src){return new Promise((resolve,reject)=>{
  if(!this.ImageCtor)return reject(Error('Image API missing'));
  const img=new this.ImageCtor();
  img.onload=()=>img.naturalWidth>0&&img.naturalHeight>0?resolve(img):reject(Error('Invalid bitmap'));
  img.onerror=()=>reject(Error('Image load error'));
  img.src=src;
 })}
 async load(url='/assets/characters/manifest.json'){
  if(this.loading)return this.loading;
  this.loading=(async()=>{
   try{
    const res=await this.fetchFn(url,{cache:'no-cache'});
    if(!res.ok)throw Error('Manifest HTTP '+res.status);
    this.manifest=validateSkinManifest(await res.json());
    const paths=new Set();
    for(const a of [...Object.values(this.manifest.actors),...Object.values(this.manifest.bossForms)]){
     if(a.texture)paths.add(a.texture);
     for(const l of a.layers)paths.add(l.texture);
     for(const clip of Object.values(a.animations))paths.add(clip.texture);
    }
    if(this.manifest.bossAccessories)paths.add(this.manifest.bossAccessories.texture);
    const errors=[];
    await Promise.all([...paths].map(async path=>{
     try{this.images.set(path,await this.fetchImage(path))}catch(e){errors.push(path+': '+e.message)}
    }));
    this.errors=errors;this.ready=FACTIONS.every(k=>this.has(k));
   }catch(e){this.errors=[String(e.message||e)];this.ready=false}
   return this.status();
  })();
  return this.loading;
 }
 actorFor(key,formId=null){return key==='boss'&&formId&&this.manifest?.bossForms?.[formId]||this.manifest?.actors?.[key];}
 has(k,formId=null){
  const a=this.actorFor(k,formId);if(!a)return false;
  const paths=a.texture?[a.texture]:a.layers.map(l=>l.texture);
  return paths.length>0&&paths.every(p=>this.images.has(p));
 }
 getClip(key,state,formId=null){const clips=this.actorFor(key,formId)?.animations;return clips?.[state]||clips?.[aliases[state]]||null;}
 usableClip(clip){const img=clip&&this.images.get(clip.texture);return Boolean(img&&img.naturalWidth>=clip.columns*clip.frameWidth&&img.naturalHeight>=clip.rows*clip.frameHeight);}
 status(){
  const painted=Object.fromEntries(FACTIONS.map(k=>[k,Object.keys(this.manifest?.actors?.[k]?.animations||{}).filter(s=>this.usableClip(this.getClip(k,s)))]));
  return {ready:this.ready,loaded:this.images.size,actors:Object.fromEntries(FACTIONS.map(k=>[k,this.has(k)])),
   animationReady:FACTIONS.every(k=>['idle','run','attack','cast','hit','down','revive','victory'].every(s=>painted[k].includes(s))),
   bossForms:Object.fromEntries(Object.keys(this.manifest?.bossForms||{}).map(id=>[id,this.has('boss',id)&&['idle','attack','cast','hit'].every(s=>this.usableClip(this.getClip('boss',s,id)))])),
   painted,errors:this.errors.slice()};
 }
 drawActor(g,key,actor,t,x,y,animator,zoom=1){
  const formId=key==='boss'?actor.bossCycle?.form?.id:null;
  if(!this.has(key,formId))return false;
  const a=this.actorFor(key,formId),isBoss=key==='boss',track=isBoss?animator.boss:animator.states.get(actor.id);
  const state=track?.state||'idle',age=Math.max(0,t-(track?.since??this.clock())/1000);
  const displayState=state==='windup'?'cast':state==='impact'?'attack':state==='stun'?'hit':state;
  const p=getPose(displayState,age,t,track?.seed||.6,track?.duration||.55);
  const h=a.renderHeight*(isBoss?1:(actor.scale||.82)/.82)*zoom;
  // Non-looping combat clips respect the duration sent by RaidEngine.
  // Idle/run/phase keep their authored loop period instead of accidentally using 420 ms defaults.
  const combatClip=['attack','cast','hit','revive','impact','stun'].includes(state);
  const direction=sampleDirection(key,state,age,t,
    combatClip&&track?.duration>0?track.duration:null);
  g.save();g.globalAlpha=.35;g.fillStyle='#060918';g.beginPath();g.ellipse(x,y,Math.min(55,h*.26),Math.min(12,h*.07),0,0,Math.PI*2);g.fill();g.restore();
  if(!isBoss&&actor.hp>0&&(actor.leader||actor.guardian||actor.shield>0)){
   g.save();g.translate(x,y);g.lineWidth=1.4;
   if(actor.leader||actor.guardian){
    g.strokeStyle=actor.leader?'#ffce73':'#a2e8ff';g.globalAlpha=.8;
    g.beginPath();g.ellipse(0,0,h*.27,h*.065,0,0,Math.PI*2);g.stroke();
   }
   if(actor.shield>0){
    g.strokeStyle='#a3e5ff';g.globalAlpha=.55;g.beginPath();
    g.ellipse(0,-h*.47,h*.35,h*.52,0,0,Math.PI*2);g.stroke();
   }
   g.restore();
  }
  const clip=this.getClip(key,state,formId);
  const atlas=clip?this.images.get(clip.texture):null;
  const clipUsable=this.usableClip(clip);
  if(clipUsable){
   // A true frame-painted animation must not receive a second mesh/rig rotation.
   // The frames already contain their own anticipation, contact and follow-through.
   const {sx,sy}=sampleAtlasFrame(clip,age,track?.duration);
   const hh=h*(clip.renderScale||1),ww=hh*clip.frameWidth/clip.frameHeight;
   g.save();g.translate(x,y);if(a.flipX)g.scale(-1,1);g.globalAlpha*=p.opacity;
   g.drawImage(atlas,sx,sy,clip.frameWidth,clip.frameHeight,
    -ww*a.anchor[0],-hh*a.anchor[1],ww,hh);
   g.restore();
   return true;
  }
  // Only the fallback flat texture uses client-side body deformation.
  g.save();g.translate(x+direction.x*(isBoss?.94:.75),
   y+p.bob*(isBoss?2:1.3)+direction.y*(isBoss?1.15:.83));
  if(a.flipX)g.scale(-1,1);
  const downTilt=state==='down'?p.fall*(isBoss?.48:.68):p.fall*(isBoss?.6:1);
  g.rotate(downTilt+p.lean*.30+direction.tilt*(isBoss?.55:.75));
  const wave=state==='run'?1+.011*Math.sin(t*15):1;
  g.scale(wave*(1+direction.stretch*.16),(1/wave)*(1-direction.stretch*.11));
  g.globalAlpha*=p.opacity;
  if(a.layers.length){
   for(const l of a.layers){
    const img=this.images.get(l.texture);if(!img)continue;
    g.save();g.translate(l.x*h,l.y*h);
    let rot=l.rotation;
    if(l.bone==='armR'||l.bone==='weapon')rot+=p.armR;
    if(l.bone==='armL')rot+=p.armL;
    if(l.bone==='legL')rot+=p.legL;if(l.bone==='legR')rot+=p.legR;
    if(l.bone==='head')rot+=p.head;
    if(l.bone==='cape'||l.bone==='hair')rot+=Math.sin(t*2.7+l.x)*.07;
    g.rotate(rot);const w=h*l.width,hh=h*l.height;
    g.drawImage(img,-w*l.pivotX,-hh*l.pivotY,w,hh);g.restore();
   }
  }else{
   const img=this.images.get(a.texture),w=h*img.naturalWidth/img.naturalHeight;
   // Current four assets are approved RGBA cutouts, not individual bone textures.
   // Apply a light, timed strip-mesh deformation rather than rotating a flat poster.
   // Each strip samples the real original texture; gameplay remains server-side.
   if(!drawDeformedSprite(g,img,0,0,w,h,a.anchor,{
    state:displayState,age,t,style:key,duration:track?.duration||.55,motion:direction
   }))g.drawImage(img,-w*a.anchor[0],-h*a.anchor[1],w,h);
  }
  if(state==='hit'){g.globalCompositeOperation='screen';g.globalAlpha=Math.max(0,.25*(1-age/.42));g.fillStyle='#ff6985';g.fillRect(-h*.36,-h*.95,h*.72,h*.95)}
  g.restore();return true;
 }
 drawPlayer(g,p,t,x,y,animator,zoom=1){return this.drawActor(g,p.faction,p,t,x,y,animator,zoom)}
 drawBoss(g,s,t,animator){return this.drawActor(g,'boss',s,t,404,551,animator,1)}
}
