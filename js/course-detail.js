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

export function detailSurface(material, water=false) {
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 coursePoint;\n'+shader.vertexShader
   .replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ncoursePoint=(modelMatrix*vec4(transformed,1.)).xyz;');
  const shading=water
   ? 'float waves=sin(p.x*2.7+p.y*.9+sin(p.y*.8))*sin(p.y*5.1+sin(p.x*1.4)); diffuseColor.rgb*=.90+.18*waves; diffuseColor.rgb+=vec3(.055,.072,.075)*smoothstep(.52,.92,waves);'
   : 'float grain=fract(sin(dot(floor(p*64.),vec2(37.7,91.4)))*4375.13)-.5; float blades=1.-smoothstep(.5,3.,length(fwidth(p)*64.)); diffuseColor.rgb*=1.+.16*grain*blades+.045*sin(p.y*.84+p.x*.23);';
  shader.fragmentShader='varying vec3 coursePoint;\n'+shader.fragmentShader
   .replace('#include <color_fragment>','#include <color_fragment>\n{ vec2 p=coursePoint.xz; '+shading+' }');
 };
 material.customProgramCacheKey=()=>water?'coastal-water':'cut-turf';
 return material;
}
