// Keep a collar of dry turf between each designed putting surface and its hazards.
// Positions in the layout use down-hole distance, prior to the renderer's Z conversion.
export function protectGreens(courses){
 for(const [course,{holes}] of Object.entries(courses)){
  for(const hole of holes){
   const pin=hole.route.at(-1),[rx,rz]=hole.green;
   // The shoreline never lies farther inland than x=35. Include the scalloped fringe.
   if(course==='ocean'){
    const shift=Math.max(0,pin[1]+1.17*(rx+1.25)+2-35);
    for(const station of hole.route){
     const approach=Math.max(0,1-(pin[0]-station[0])/40);
     station[1]-=shift*approach;
    }
   }
   for(const [features,scale] of [[hole.water,1],[hole.sand,1.24]]){
    for(const feature of features){
     const [x,d,w,l]=feature,dx=x-pin[1],dz=d-pin[0],dist=Math.hypot(dx,dz);
     const nx=dist?dx/dist:1,nz=dist?dz/dist:0;
     // Support radii on this axis guarantee a separating strip even for elongated pools.
     const need=1.17*Math.hypot((rx+1.25)*nx,(rz+1.25)*nz)+scale*Math.hypot(w*nx,l*nz)+2;
     if(dist<need){feature[0]=pin[1]+nx*need;feature[1]=pin[0]+nz*need}
    }
   }
  }
 }
}
