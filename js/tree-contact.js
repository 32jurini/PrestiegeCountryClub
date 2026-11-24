// Index the wood and foliage separately. Gaps below the canopy stay playable.
const cellSize=16;
const key=(x,z)=>Math.floor(x/cellSize)+','+Math.floor(z/cellSize);
export class TreeContact {
 constructor(){this.cells=new Map()}
 add(x,base,z,height,species){
  const pine=species==='pine';
  this.volume(x,base+height*.29,z,height*.021,height*.33,true);
  this.volume(x,base+height*(pine?.57:.73),z,height*(pine?.18:.32),height*(pine?.39:.23),false);
 }
 volume(x,y,z,r,h,wood){
  const shape={x,y,z,r:r+.029,h:h+.029,wood};
  // Include one physics step of padding so entering from a neighboring cell is detected.
  const reach=r+1;
  for(let i=Math.floor((x-reach)/cellSize);i<=Math.floor((x+reach)/cellSize);i++)
   for(let j=Math.floor((z-reach)/cellSize);j<=Math.floor((z+reach)/cellSize);j++){
    const id=i+','+j;if(!this.cells.has(id))this.cells.set(id,[]);this.cells.get(id).push(shape);
   }
 }
 deflect(p,v,dt){
  const candidates=this.cells.get(key(p.x,p.z));if(!candidates)return;
  let first=1,hit=null;
  for(const s of candidates){
   const x=(p.x-s.x)/s.r,y=(p.y-s.y)/s.h,z=(p.z-s.z)/s.r;
   const dx=v.x*dt/s.r,dy=v.y*dt/s.h,dz=v.z*dt/s.r;
   const a=dx*dx+dy*dy+dz*dz,b=x*dx+y*dy+z*dz,c=x*x+y*y+z*z-1;
   const disc=b*b-a*c;
   if(c<0||b>=0||a<1e-12||disc<0)continue;
   const t=(-b-Math.sqrt(disc))/a;
   if(t>=0&&t<first){first=t;hit=s}
  }
  if(!hit)return;
  p.addScaledVector(v,first*dt);
  if(hit.wood){
   const nx=(p.x-hit.x)/(hit.r**2),ny=(p.y-hit.y)/(hit.h**2),nz=(p.z-hit.z)/(hit.r**2);
   const impulse=1.55*(v.x*nx+v.y*ny+v.z*nz)/(nx*nx+ny*ny+nz*nz);
   v.set(v.x-impulse*nx,v.y-impulse*ny,v.z-impulse*nz).multiplyScalar(.57);
  }else{
   v.multiplyScalar(.35);v.y=Math.min(-.55,v.y);
  }
  p.addScaledVector(v,(1-first)*dt);
  return true;
 }
}
