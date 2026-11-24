import * as THREE from 'three';

const textures = new Map();
function foliage(species) {
 if (!textures.has(species)) {
  const map = new THREE.TextureLoader().load(new URL('../assets/course/'+species+'.webp',import.meta.url).href);
  map.colorSpace = THREE.SRGBColorSpace;
  textures.set(species,map);
 }
 return textures.get(species);
}

export function plantTrees(world, trees, species) {
 if (!trees.length) return;
 const material = new THREE.MeshStandardMaterial({map:foliage(species),alphaTest:.45,side:THREE.DoubleSide,roughness:1});
 const geometry = new THREE.PlaneGeometry(1,1);
 geometry.translate(0,.5,0);
 const stand = new THREE.InstancedMesh(geometry,material,trees.length*3);
 const transform = new THREE.Object3D();
 const tint = new THREE.Color();
 trees.forEach(([x,z,height,seed],i)=>{
  transform.position.set(x,world.groundHeight(x,z)-.12,z);
  transform.scale.set(height*(species==='pine'?.50:.88),height,1);
  for(let face=0;face<3;face++){
   transform.rotation.y=seed*3+face*Math.PI/3;
   transform.updateMatrix();
   stand.setMatrixAt(i*3+face,transform.matrix);
   stand.setColorAt(i*3+face,tint.setRGB(.75+.22*seed,.78+.17*seed,.7+.18*seed));
  }
 });
 stand.castShadow=true;stand.receiveShadow=true;world.root.add(stand);
}

export function horizon(world) {
 const cols=230,rows=12,verts=[],colors=[],indices=[];
 const mountain=world.current==='summit';
 for(let j=0;j<=rows;j++){
  for(let i=0;i<=cols;i++){
   const a=i/cols*Math.PI*2,t=j/rows,r=285+130*t;
   const ridge=18+9*Math.sin(5*a)+7*Math.cos(9*a)+5*Math.sin(19*a)+2*Math.sin(41*a);
   const h=-8+Math.sin(t*Math.PI*.8)*ridge*(mountain?2.7:world.current==='royal'?.65:.32);
   verts.push(r*Math.sin(a),h,-65+r*Math.cos(a));
   const shade=.83+.10*Math.cos(9*a)+.06*Math.sin(19*a);
   const c=new THREE.Color(mountain?0x697864:0x596f51).multiplyScalar(shade);
   colors.push(c.r,c.g,c.b);
   if(j<rows&&i<cols){const k=j*(cols+1)+i;indices.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1)}
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
 world.root.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})));
}

let turf;
export function detailSurface(material, water=false) {
 if(!water&&!turf){
  turf=new THREE.TextureLoader().load(new URL('../assets/course/cut-grass.webp',import.meta.url).href);
  turf.wrapS=turf.wrapT=THREE.RepeatWrapping;turf.anisotropy=8;
 }
 material.onBeforeCompile=shader=>{
  if(!water)shader.uniforms.turfPhoto={value:turf};
  shader.vertexShader='varying vec3 coursePoint;\n'+shader.vertexShader
   .replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ncoursePoint=(modelMatrix*vec4(transformed,1.)).xyz;');
  const shading=water
   ? 'float waves=sin(p.x*2.7+p.y*.9+sin(p.y*.8))*sin(p.y*5.1+sin(p.x*1.4)); diffuseColor.rgb*=.90+.18*waves; diffuseColor.rgb+=vec3(.055,.072,.075)*smoothstep(.52,.92,waves);'
   : 'float photo=dot(texture2D(turfPhoto,p*.73).rgb,vec3(.25,.55,.20)); diffuseColor.rgb*=.66+.82*photo;float grain=fract(sin(dot(floor(p*64.),vec2(37.7,91.4)))*4375.13)-.5; float blades=1.-smoothstep(.5,3.,length(fwidth(p)*64.)); diffuseColor.rgb*=1.+.16*grain*blades+.045*sin(p.y*.84+p.x*.23);';
  shader.fragmentShader=(water?'':'uniform sampler2D turfPhoto;')+'varying vec3 coursePoint;\n'+shader.fragmentShader
   .replace('#include <color_fragment>','#include <color_fragment>\n{ vec2 p=coursePoint.xz; '+shading+' }');
 };
 material.customProgramCacheKey=()=>water?'coastal-water':'cut-turf';
 return material;
}

export function frameHole(world) {
 const ocean=world.current==='ocean', summits=world.current==='summit';
 const geometry=ocean?new THREE.IcosahedronGeometry(1,1):new THREE.BufferGeometry();
 if(!ocean){
  const tips=[];
  for(let j=0;j<7;j++){
   const a=j*2.4,x=.26*Math.cos(a),z=.26*Math.sin(a);
   tips.push(x-.033,0,z,x+.033,0,z,x*1.55,.55+.4*Math.abs(Math.sin(a+1)),z*1.55);
  }
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(tips,3));geometry.computeVertexNormals();
 }
 const material=new THREE.MeshStandardMaterial({color:ocean?0x837e70:0x667547,roughness:.96,side:THREE.DoubleSide});
 const count=ocean?110:2000;
 const mesh=new THREE.InstancedMesh(geometry,material,count);
 const pose=new THREE.Object3D(),color=new THREE.Color();
 const noise=n=>{const v=Math.sin(n*74.49+world.holeIndex*61)*6871.7;return v-Math.floor(v)};
 for(let i=0;i<count;i++){
  const t=noise(i+13),z=70-t*world.length;
  let x,depth=z;
  if(ocean){
   const pool=world.water[i%world.water.length],angle=t*2*Math.PI;
   x=pool.x+Math.cos(angle)*(pool.rx+1.5);depth=pool.z+Math.sin(angle)*(pool.rz+1.5);
   if(world.lie(x,depth)!=='ROUGH'){x=38+noise(i+6)*3;depth=z}
   const r=.20+noise(i+85)*.85;pose.scale.set(r*1.9,r*.70,r);
  }else{
   const side=i%2===0?-1:1;
   x=world.fairwayX(z)+side*(world.station(z,2)+(summits?4:1.5)+18*noise(i+41));
   pose.scale.set(.22,.06+noise(i+49)*.10,.22);
  }
  pose.position.set(x,world.groundHeight(x,depth)+(ocean?.07:0),depth);
  pose.rotation.set(ocean?.18:0,noise(i+777)*6.28,(noise(i+32)-.5)*.6);
  pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
  const tint=.61+.38*noise(i+62);mesh.setColorAt(i,color.setRGB(tint,tint,tint*.93));
 }
 mesh.castShadow=ocean;mesh.receiveShadow=true;world.root.add(mesh);
 // A second stand just outside the dogleg frames the downhill target.
 if(summits){
  const stand=[];
  for(let i=0;i<38;i++){
   const z=70-(.4+noise(i+21)*.72)*world.length;
   const x=world.fairwayX(z)+(i%2?-1:1)*(world.station(z,2)+10+noise(i+43)*18);
   stand.push([x,z,7+noise(i+9)*10,noise(i+77)]);
  }
  plantTrees(world,stand,'pine');
 }
}

// Cut the turf out of the bunker footprint even where neighboring terrain triangles span the lip.
export function cutBunkers(material,holes) {
 const previous=material.onBeforeCompile.bind(material);
 const key=material.customProgramCacheKey();
 material.onBeforeCompile=shader=>{
  previous(shader);
  shader.uniforms.sandAreas={value:holes.map(([x,d,rx,rz])=>new THREE.Vector4(x,70-d,rx,rz))};
  shader.vertexShader='varying vec2 sandXZ;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nsandXZ=(modelMatrix*vec4(transformed,1.)).xz;');
  shader.fragmentShader='varying vec2 sandXZ;uniform vec4 sandAreas['+holes.length+'];\n'+shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
   for(int i=0;i<${holes.length};i++){vec4 area=sandAreas[i];vec2 q=(sandXZ-area.xy)/area.zw;float a=atan(q.y,q.x);if(length(q)<.996*(1.+.14*sin(3.*a+.5)+.08*cos(5.*a)))discard;}`);
 };
 material.customProgramCacheKey=()=>key+'-sand-'+holes.length;
}
