import * as T from 'three';

const smooth=T.MathUtils.smoothstep;

// The fitted meshes duplicate vertices at UV seams. Keep the UVs separate but
// average the surface normals on each side of a seam within the same material.
export function smoothSeams(geometry,groups){
 const pos=geometry.attributes.position,norm=geometry.attributes.normal;
 for(const indices of groups){
  const seams=new Map();
  for(const i of new Set(indices)){
   const key=[pos.getX(i),pos.getY(i),pos.getZ(i)].join(',');
   const entry=seams.get(key);
   if(entry)entry.push(i);else seams.set(key,[i]);
  }
  const sum=new T.Vector3(),v=new T.Vector3();
  for(const vertices of seams.values()){
   if(vertices.length<2)continue;
   sum.set(0,0,0);
   for(const i of vertices)sum.add(v.fromBufferAttribute(norm,i));
   sum.normalize();for(const i of vertices)norm.setXYZ(i,sum.x,sum.y,sum.z);
  }
 }
}

// The collar and placket inherit skinning from the shirt directly underneath.
export function poloTrim(data){
 const p=[],uv=[],j=[],w=[],indices=[],buttons=[];
 const anchors=[...new Set(data.groups[1])].filter(i=>data.p[3*i+1]>13000&&Math.abs(data.p[3*i])<1350);
 function vertex(x,y,z){
  let closest=anchors[0],distance=Infinity;
  for(const i of anchors){
   const d=(x-data.p[3*i]/1e4)**2+(y-data.p[3*i+1]/1e4)**2+(z-data.p[3*i+2]/1e4)**2;
   if(d<distance){distance=d;closest=i}
  }
  j.push(...data.j.slice(closest*4,closest*4+4));w.push(...data.w.slice(closest*4,closest*4+4).map(n=>n/255));
  uv.push(x*8,y*8);p.push(x,y,z);return p.length/3-1;
 }
 for(let k=0;k<=48;k++){
  const a=.19+(Math.PI*2-.38)*k/48,front=Math.cos(a),side=Math.sin(a);
  const tip=Math.exp(-((Math.acos(front)-.55)**2)/.065);
  vertex(.061*side,1.534-.006*front,-.017+.067*front);
  vertex((.091+.008*tip)*side,1.501-.011*front-.037*tip,-.021+(.083+.017*tip)*front);
  if(k){const b=k*2;indices.push(b-2,b-1,b,b,b-1,b+1)}
 }
 function frontAt(y){
  const near=anchors.filter(i=>Math.abs(data.p[3*i])<240&&Math.abs(data.p[3*i+1]/1e4-y)<.014);
  return Math.max(.025,...near.map(i=>data.p[3*i+2]/1e4))+.005;
 }
 let prior;
 for(let k=0;k<=8;k++){
  const y=1.495-k*.011,z=frontAt(y);const b=vertex(-.008,y,z);vertex(.008,y,z);
  if(k)indices.push(prior,b,prior+1,prior+1,b,b+1);
  prior=b;
  if(k===3||k===6){
   const center=vertex(0,y,z+.002);
   for(let t=0;t<10;t++)vertex(.0038*Math.cos(t*Math.PI/5),y+.0038*Math.sin(t*Math.PI/5),z+.001);
   for(let t=0;t<10;t++)buttons.push(center,center+1+t,center+1+(t+1)%10);
  }
 }
 const geo=new T.BufferGeometry();
 for(const [key,array,size] of [['position',p,3],['uv',uv,2],['skinWeight',w,4]])geo.setAttribute(key,new T.Float32BufferAttribute(array,size));
 geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(j,4));geo.setIndex([...indices,...buttons]);
 geo.addGroup(0,indices.length,0);geo.addGroup(indices.length,buttons.length,1);geo.computeVertexNormals();return geo;
}

export function fitFace(data,geometry){
 const pos=geometry.attributes.position,weights=geometry.attributes.skinWeight,joints=geometry.attributes.skinIndex;
 const spine=data.bones.indexOf('Spine2'),neck=data.bones.indexOf('Neck'),head=data.bones.indexOf('Head');
 const blink=new Float32Array(pos.count*3);
 const skin=new Set(data.groups[0]);
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),ax=Math.abs(x);
  // Bring the jaw and cap down together while retaining a gradual neck-to-shoulder transition.
  pos.setY(i,y-.022*smooth(y,1.51,1.57));
  if(!skin.has(i))continue;
  if(y>1.51&&y<1.575&&ax<.067&&z<.085){
   const amount=smooth(y,1.51,1.53)*(1-smooth(ax,.048,.067))*(1-smooth(y,1.556,1.575));
   if(amount>.001){
    const lower=1-smooth(y,1.51,1.542),upper=smooth(y,1.533,1.572);
    const mix=new Map([[spine,amount*lower],[neck,amount*(1-lower)*(1-upper)],[head,amount*(1-lower)*upper]]);
    for(let k=0;k<4;k++){const b=joints.getComponent(i,k);mix.set(b,(mix.get(b)||0)+(1-amount)*weights.getComponent(i,k))}
    const top=[...mix].sort((a,b)=>b[1]-a[1]).slice(0,4);
    top.forEach(([b,v],k)=>{joints.setComponent(i,k,b);weights.setComponent(i,k,v)});
    for(let k=top.length;k<4;k++)weights.setComponent(i,k,0);
   }
  }
  if(ax<.013||ax>.054||z<.106||y<1.666||y>1.706)continue;
  const mask=(1-smooth(Math.abs(ax-.032),.010,.021))*smooth(z,.106,.119);
  const lid=y>1.688?-0.009*(1-smooth(y,1.693,1.706)):.003*(1-smooth(1.685-y,0,.019));
  blink[i*3+1]=mask*lid;blink[i*3+2]=mask*.0014;
 }
 geometry.morphTargetsRelative=true;geometry.morphAttributes.position=[new T.Float32BufferAttribute(blink,3)];
}
