// Tam Phai Tran Ma — real bitmap strip-mesh deformation.
// Keeps the approved RGBA character art on screen while adding deterministic
// secondary movement. This is NOT a skeletal cutout rig or frame-painted animation.
// Client-side visual-only: HP / hit registration remain server authoritative.
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const smooth=x=>{const z=clamp(x);return z*z*(3-2*z)};
const noise=(x,t)=>Math.sin(x*8.7+t*2.35)*.63+Math.sin(x*16.4-t*1.63)*.37;
const loop=(age,duration)=>clamp(age/Math.max(.001,duration));

export function motionAt(state,age,t,style='kiem',duration=.55){
 const u=loop(age,duration);
 const windup=smooth(u/.27),swing=smooth((u-.27)/.29),recover=smooth((u-.56)/.44);
 const cast=smooth(u/.34)*(1-smooth((u-.69)/.31));
 const idle=Math.sin(t*2.3)*.48;
 let upper=idle*.23,mid=idle*.22,lower=noise(.35,t)*.34,flutter=.48;
 if(state==='run'){
  const stride=Math.sin(t*13);
  upper=1.45+stride*.3;mid=-stride*.45;lower=-stride*1.4;flutter=1.15;
 }else if(state==='attack'||state==='impact'){
  upper=(-1.2*windup+2.6*swing)*(1-recover);
  mid=(-.6*windup+1.6*swing)*(1-recover);
  lower=-upper*.70;flutter=.85+1.15*(1-recover);
 }else if(state==='cast'||state==='windup'||state==='phase'){
  upper=-1.7*cast;mid=.55*cast;lower=1.2*cast;flutter=.75+cast;
 }else if(state==='hit'||state==='stun'){
  const stagger=(1-smooth(u))*Math.sin(u*18);
  upper=3.5*stagger;mid=2.2*stagger;lower=-2.1*stagger;flutter=1.1;
 }else if(state==='down'){
  upper=0;mid=0;lower=0;flutter=.13;
 }else if(state==='revive'){
  const lift=1-smooth(age/1.1);
  upper=1.3*lift;mid=-.7*lift;lower=.6*lift;flutter=.45+lift;
 }else if(state==='victory'){
  upper=Math.sin(t*3.7)*.7;mid=.25;lower=-.75;flutter=.8;
 }
 const amplitude=style==='boss'?1.55:style==='huyen'?1.18:style==='linh'?1.12:1;
 return {upper:upper*amplitude,mid:mid*amplitude,lower:lower*amplitude,flutter};
}

// Draws from the original WebP texture in horizontal deformable strips.
// Shared bottom anchor means no jitter as costumes flutter.
// Source-overdraw of 1 source pixel prevents dark scan-line cracks at OBS scale.
export function drawDeformedSprite(g,image,x,y,width,height,anchor,model){
 if(!image||!(image.naturalWidth>0&&image.naturalHeight>0))return false;
 const sw=image.naturalWidth,sh=image.naturalHeight;
 const n=height>180?26:14,sourceStep=sh/n,destStep=height/n;
 const baseX=x-width*anchor[0],baseY=y-height*anchor[1];
 const state=model?.state||'idle',m=motionAt(state,model.age||0,model.t||0,
  model.style||'kiem',model.duration||.55);
 const dist=Math.min(12,Math.max(1.5,width*.035));
 const draw=(sx,sy,sWidth,sHeight,dx,dy,dWidth,dHeight)=>{
  g.drawImage(image,sx,sy,sWidth,sHeight,dx,dy,dWidth,dHeight);
 };
 for(let i=0;i<n;i++){
  const yy=(i+.5)/n,top=1-yy,hem=smooth((yy-.48)/.5);
  const torso=Math.exp(-Math.pow((yy-.44)/.24,2));
  const head=Math.exp(-Math.pow((yy-.14)/.15,2));
  const shifted=dist*(m.upper*head*.35+m.mid*torso*.3+
    m.lower*hem*.6+hem*m.flutter*.30*noise(yy,model.t||0));
  const breathing=state==='idle'?(1+Math.sin((model.t||0)*2.1)*.008*torso):1;
  const rowWidth=width*breathing;
  const srcY=i*sourceStep,srcH=Math.min(sh-srcY,sourceStep+1.1);
  if(srcH<=0)continue;
  const renderH=destStep*(srcH/sourceStep)+.35;
  draw(0,srcY,sw,srcH,
    baseX+(width-rowWidth)*.5+shifted,
    baseY+i*destStep-.17,rowWidth,renderH);
 }
 return true;
}
