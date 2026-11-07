export function pointInWarning(w,x,y){
 if(w.kind==='circle')return Math.hypot(x-w.x,(y-w.y)/.42)<=w.radius;
 if(w.kind==='sweep')return x>=45&&x<=515&&y>=w.y-30&&y<=w.y+50;
 const [a,b,c]=w.points||[[409,390],[170,570],[460,685]];
 const cross=(p,q)=>(x-q[0])*(p[1]-q[1])-(p[0]-q[0])*(y-q[1]);
 const d=[cross(a,b),cross(b,c),cross(c,a)];return !(d.some(v=>v<0)&&d.some(v=>v>0));
}
export function conePoints(x,y){const dx=x-404,dy=y-440,len=Math.max(1,Math.hypot(dx,dy)),ux=dx/len,uy=dy/len;
 return [[404,440],[404+ux*320-uy*100,440+uy*320+ux*100],[404+ux*320+uy*100,440+uy*320-ux*100]];
}
