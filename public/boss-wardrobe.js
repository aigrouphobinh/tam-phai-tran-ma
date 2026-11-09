// Decorative layers only. The opaque character atlas is always drawn in full;
// this renderer never masks, erases or removes any part of the base costume.
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)};
export const ACCESSORY_SLOTS=Object.freeze([
 {x:.04,y:-.72,w:.82,h:.67,px:.86,py:.08,front:false},
 {x:-.09,y:-.43,w:.31,h:.47,px:.5,py:.03,front:true},
 {x:.14,y:-.43,w:.31,h:.47,px:.5,py:.03,front:true},
 {x:-.11,y:-.72,w:.43,h:.65,px:.5,py:.1,front:false}
]);
export class BossWardrobe{
 constructor(skins){this.skins=skins;this.received=0;this.serverTime=0;this.paused=false;}
 observe(s,at=performance.now()/1000){this.received=at;this.serverTime=s.elapsed||0;this.paused=s.mode==='stop';}
 time(t){return this.serverTime+(this.paused?0:Math.min(.3,Math.max(0,t-this.received)));}
 image(){const clip=this.skins.manifest?.bossAccessories,img=clip&&this.skins.images.get(clip.texture);return img&&img.naturalWidth>=1024&&img.naturalHeight>=1024?{clip,img}:null;}
 drawPiece(g,row,piece,x,y,w,h,rotation=0,alpha=1){
  const source=this.image();if(!source)return false;
  const {clip,img}=source,slot=ACCESSORY_SLOTS[piece];
  g.save();g.translate(x,y);g.rotate(rotation);g.globalAlpha*=alpha;
  g.drawImage(img,piece*clip.frameWidth,row*clip.frameHeight,clip.frameWidth,clip.frameHeight,-w*slot.px,-h*slot.py,w,h);g.restore();return true;
 }
 drawLayers(g,s,t,front=false){
  const c=s.bossCycle;if(!c||!this.image())return;
  const h=this.skins.actorFor('boss',c.form.id)?.renderHeight||305;
  for(let piece=c.stage;piece<4;piece++){
   const slot=ACCESSORY_SLOTS[piece];if(slot.front!==front)continue;
   const sway=Math.sin(t*2+piece)*.025;
   this.drawPiece(g,c.form.row,piece,404+slot.x*h,551+slot.y*h,slot.w*h,slot.h*h,sway);
  }
 }
 drawBoss(g,s,t,animator){
  const c=s.bossCycle;
  const draw=state=>{this.drawLayers(g,state,t,false);const ok=this.skins.drawBoss(g,state,t,animator);this.drawLayers(g,state,t,true);return ok;};
  if(!c?.transform)return draw(s);
  const tr=c.transform,u=clamp((this.time(t)-tr.startedAt)/(tr.until-tr.startedAt));
  g.save();g.globalAlpha*=1-ease(u);const old=draw(s);g.restore();
  const next={...s,bossCycle:{...c,form:c.next,stage:0,transform:null}};
  g.save();g.globalAlpha*=ease((u-.2)/.8);draw(next);g.restore();
  g.save();g.globalAlpha=.75*Math.sin(Math.PI*u);g.strokeStyle=c.next.color;g.lineWidth=3;
  g.beginPath();g.ellipse(404,430,45+u*90,80+u*85,0,0,Math.PI*2);g.stroke();
  g.beginPath();g.ellipse(404,548,35+u*85,12+u*25,0,0,Math.PI*2);g.stroke();g.restore();return old;
 }
 drawDrops(g,s,t){
  if(!s.bossCycle)return;
  const now=this.time(t);
  for(const drop of s.bossCycle.drops){
   const slot=ACCESSORY_SLOTS[drop.piece];if(!slot)continue;
   const age=Math.max(0,now-drop.droppedAt),u=clamp(age/(drop.collectAt-drop.droppedAt));
   const fall=ease(u/.7),x=404+slot.x*305+(drop.piece%2?-1:1)*55*fall;
   const y=(551+slot.y*305)*(1-fall)+(593+drop.piece*8)*fall;
   const shrink=1-.45*ease((u-.75)/.25);
   this.drawPiece(g,drop.row,drop.piece,x,y,slot.w*235*shrink,slot.h*235*shrink,Math.sin(age*5)*.35+age*.6,1-ease((u-.88)/.12));
  }
 }
}
