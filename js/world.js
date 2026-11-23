import * as THREE from 'three';
export const COURSES={royal:{name:'THE ROYAL CLASSIC',type:'parkland',sky:0x93bed0,fog:0xb4c5a7,grass:0x507849,rough:0x3e6140,fairway:0x7aa65e,trees:0x254b2b,wind:3,holes:[
 {"name":"Orchard Bend","par":4,"hint":"Favor the left landing area to open the turn.","route":[[0,0,10,0],[55,-13,20,0],[118,-37,16,0],[184,8,9,0]],"green":[11,10],"sand":[[-12,112,9,12],[0,174,5,4]],"water":[]},
 {"name":"The Postage Stamp","par":3,"hint":"Fly the front bunker to a shallow green.","route":[[0,0,8,0],[35,2,8,0],[64,9,8,0],[89,17,6,0]],"green":[12,6],"sand":[[15,79,11,4],[30,90,4,7]],"water":[]},
 {"name":"Captain’s Corner","par":5,"hint":"Lay up before the cross bunkers or take on the corner.","route":[[0,0,10,0],[65,22,17,0],[145,54,22,0],[207,18,13,0],[265,-4,10,0]],"green":[10,13],"sand":[[35,136,9,7],[49,139,5,6],[11,253,6,9]],"water":[]}
]},
ocean:{name:"OCEAN'S EDGE",type:'coastal',sky:0x8abdd4,fog:0xa5c3bf,grass:0x4e826b,rough:0x467769,fairway:0x86a881,trees:0x385d4c,wind:12,holes:[
 {"name":"Shoreline Run","par":4,"hint":"Carry the tidal cut. The left fairway stays dry past the inlet.","route":[[0,0,11,0],[70,-16,14,0],[130,-18,12,0],[192,15,9,0]],"green":[9,13],"sand":[[-29,120,5,12]],"water":[[16,119,17,33],[-2,66,16,8],[24,175,13,15]]},
 {"name":"Tidepool Carry","par":3,"hint":"Carry the front pool. Water guards the right side and the back of the green.","route":[[0,0,9,0],[28,-5,10,0],[54,-14,9,0],[81,-21,8,0]],"green":[10,9],"sand":[[-33,77,4,8]],"water":[[-13,48,31,19],[1,75,12,11],[-22,98,18,8]]},
 {"name":"The Peninsula","par":5,"hint":"Drive toward the left shelf. Split the two coves on the approach.","route":[[0,0,10,0],[80,-31,21,0],[152,-42,18,0],[212,-17,13,0],[259,21,7,0]],"green":[8,11],"sand":[[-52,149,6,13]],"water":[[7,189,28,42],[1,260,11,20],[-6,125,22,19],[-30,207,12,12]]}
]},
summit:{name:'SUMMIT PINES',type:'mountain',sky:0x9dc2d4,fog:0xa4b8af,grass:0x3f6547,rough:0x355940,fairway:0x72966a,trees:0x1e4133,wind:6,holes:[
 {"name":"Ridge Walk","par":4,"hint":"Find the broad saddle before the uphill approach.","route":[[0,0,10,0],[64,12,15,1],[128,29,18,1],[187,38,9,7]],"green":[10,9],"sand":[[15,129,6,11],[24,184,5,6]],"water":[]},
 {"name":"The Drop","par":3,"hint":"Club down from the high tee to the valley green.","route":[[0,0,9,11],[30,-6,9,6],[68,-16,10,1],[106,-29,8,-2]],"green":[9,12],"sand":[[-16,101,6,7],[-39,119,5,6]],"water":[]},
 {"name":"Switchback","par":4,"hint":"Aim right to the high shelf before turning back left.","route":[[0,0,9,0],[57,25,13,3],[108,49,17,7],[152,20,11,5],[208,-18,8,2]],"green":[9,10],"sand":[[27,104,11,15],[2,168,6,9],[-29,201,4,7]],"water":[]}]}};
const clamp=THREE.MathUtils.clamp;
const rand=(n)=>{const x=Math.sin(n*178.126+78.77)*42375.935;return x-Math.floor(x)};
export class World{
 constructor(scene){this.scene=scene;this.root=new THREE.Group();scene.add(this.root);this.tmp=new THREE.Vector3();this.current='royal';this.holeIndex=0;this.hole={yards:278,par:4,curve:0};this.length=158;this.holePosition=new THREE.Vector3(0,0,0);this.teePosition=new THREE.Vector3(0,0,0);this.fairways=[];this.bunkers=[];this.water=[];this.green=null;this.flag=null;this.grassTexture=this.makeGrassTexture(false);this.fairwayTexture=this.makeGrassTexture(true);this.create('royal',0)}
 makeGrassTexture(fairway=false){const c=document.createElement('canvas');c.width=512;c.height=512;const x=c.getContext('2d');x.fillStyle=fairway?'#6f9857':'#3e6840';x.fillRect(0,0,512,512);let seed=fairway?91:27;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};for(let i=0;i<12500;i++){const a= fairway?`rgba(${80+Math.floor(rnd()*55)},${112+Math.floor(rnd()*60)},${48+Math.floor(rnd()*34)},${.08+rnd()*.2})`:`rgba(${20+Math.floor(rnd()*50)},${55+Math.floor(rnd()*55)},${24+Math.floor(rnd()*30)},${.08+rnd()*.24})`;x.fillStyle=a;const w=1+rnd()*3;x.fillRect(rnd()*512,rnd()*512,w,.7+rnd()*2)}if(fairway){x.fillStyle='rgba(216,233,165,.12)';x.fillRect(0,0,512,256)}const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(fairway?2:22,fairway?3:22);tex.anisotropy=8;return tex}
 mat(color,rough=1){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:0})}
 mesh(geo,mat,par=this.root){const m=new THREE.Mesh(geo,mat);m.receiveShadow=true;m.castShadow=true;par.add(m);return m}
 // Stations describe the center, playable width and height at each distance from the tee.
 station(z, column) {
  const route=this.hole.route, distance=70-z;
  const end=route.findIndex(row=>row[0]>=distance);
  if(end<0)return route.at(-1)[column];
  if(end===0)return route[0][column];
  const a=route[end-1], b=route[end];
  return THREE.MathUtils.lerp(a[column],b[column],(distance-a[0])/(b[0]-a[0]));
 }
 groundHeight(x,z){return this.station(z,3)+.5*Math.sin(x*.053)*Math.sin(z*.025)+.26*Math.sin(z*.049+x*.017)}
 getGreenZ(){return 70-this.length}
 fairwayX(z){return this.station(z,1)}
 surfaceEllipse(x,z,rx,rz,material,lift) {
  const geometry=new THREE.RingGeometry(.0001,1,56,8);
  const vertices=geometry.attributes.position;
  for(let i=0;i<vertices.count;i++){
   const px=x+vertices.getX(i)*rx, pz=z-vertices.getY(i)*rz;
   vertices.setXYZ(i,px,this.groundHeight(px,pz)+lift,pz);
  }
  geometry.computeVertexNormals();this.mesh(geometry,material).castShadow=false;
 }
 create(name,idx){this.scene.remove(this.root);this.root=new THREE.Group();this.scene.add(this.root);this.current=name;this.holeIndex=idx;const c=COURSES[name], h=c.holes[idx];this.hole=h;this.length=h.route.at(-1)[0];this.scene.background=new THREE.Color(c.sky);
 const dome=new THREE.Mesh(new THREE.SphereGeometry(820,40,20),new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,uniforms:{horizon:{value:new THREE.Color(c.sky).lerp(new THREE.Color(0xffecc9),.42)},zenith:{value:new THREE.Color(0x518ac0)}},
  vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform vec3 horizon,zenith;varying vec3 direction;
   void main(){vec3 d=normalize(direction);float h=pow(max(d.y,0.),.55);
   float glow=pow(max(dot(d,normalize(vec3(-200.,90.,-310.))),0.),60.);
   gl_FragColor=vec4(mix(horizon,zenith,h)+vec3(.35,.25,.12)*glow,1.);
   #include <colorspace_fragment>
   }`
 }));dome.renderOrder=-1;this.root.add(dome);this.scene.fog=new THREE.FogExp2(c.fog,.0044);this.fairways=[];this.bunkers=[];this.water=[];const gmat=this.mat(c.grass);gmat.map=this.grassTexture;gmat.color.set(c.grass);const terrain=new THREE.PlaneGeometry(750,650,110,100);terrain.rotateX(-Math.PI/2);const p=terrain.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,this.groundHeight(x,z)-.13)}terrain.computeVertexNormals();const base=this.mesh(terrain,gmat);base.castShadow=false;
 const fair=this.mat(c.fairway);fair.map=this.fairwayTexture;fair.color.set(c.fairway);const roughMat=this.mat(c.rough);const greenMat=this.mat(0x91b979);const teeMat=this.mat(0x6da461);const sand=this.mat(0xd5c5a0);const lakeMat=new THREE.MeshPhysicalMaterial({color:0x327c91,metalness:.05,roughness:.2,transparent:true,opacity:.88,clearcoat:.9});
 this.teePosition.set(0,this.groundHeight(0,70)+.04,70);this.holePosition.set(this.fairwayX(this.getGreenZ()),0,this.getGreenZ());this.holePosition.y=this.groundHeight(this.holePosition.x,this.holePosition.z)+.035;
 const strips=96,lanes=8,verts=[],uv=[],indices=[];
 for(let i=0;i<=strips;i++){
  const t=i/strips,z=70-t*this.length,x=this.fairwayX(z),w=this.station(z,2);
  for(let j=0;j<=lanes;j++){
   const px=x+w*(2*j/lanes-1);
   verts.push(px,this.groundHeight(px,z)+.035,z);uv.push(j/lanes,t*5);
   if(i<strips&&j<lanes){const a=i*(lanes+1)+j;indices.push(a,a+1,a+lanes+1,a+1,a+lanes+2,a+lanes+1)}
  }
 }
 const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));fg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));fg.setIndex(indices);fg.computeVertexNormals();this.mesh(fg,fair);
 this.surfaceEllipse(0,70,8,6,teeMat,.05);
 this.green={x:this.holePosition.x,z:this.holePosition.z,rx:h.green[0],rz:h.green[1]};
 this.surfaceEllipse(this.green.x,this.green.z,...h.green,greenMat,.055);
 this.holePosition.y=this.groundHeight(this.green.x,this.green.z)+.06;
 const holeRing=this.mesh(new THREE.RingGeometry(.12,.29,28),this.mat(0xe5e5de));holeRing.rotation.x=-Math.PI/2;holeRing.position.copy(this.holePosition).add(new THREE.Vector3(0,.016,0));const cup=this.mesh(new THREE.CircleGeometry(.12,24),this.mat(0x101715));cup.rotation.x=-Math.PI/2;cup.position.copy(this.holePosition).add(new THREE.Vector3(0,.02,0));
 for(const [features,collection,material] of [[h.sand,this.bunkers,sand],[h.water,this.water,lakeMat]]){
  for(const [x,distance,rx,rz] of features){
   const z=70-distance;collection.push({x,z,rx,rz});this.surfaceEllipse(x,z,rx,rz,material,.08);
  }
 }
 if(name==='ocean'){
  const sea=this.mesh(new THREE.PlaneGeometry(338,650,40,90),lakeMat);
  sea.geometry.rotateX(-Math.PI/2);
  const v=sea.geometry.attributes.position;
  for(let i=0;i<v.count;i++){const x=v.getX(i)+207,z=v.getZ(i);v.setXYZ(i,x,this.groundHeight(x,z)+.08,z)}
  sea.geometry.computeVertexNormals();sea.castShadow=false;
 }
 const treeCount=name==='ocean'?65:145;for(let i=0;i<treeCount;i++){let z=90-rand(i+44)*this.length*1.65;let x=(rand(i+500)*2-1)*190;if(Math.abs(x-this.fairwayX(z))<27)continue;if(name==='ocean'&&x>35)continue;this.tree(x,z,c.trees,name==='summit');}
 for(let i=0;i<28;i++){const x=(rand(i+123)*2-1)*240,z=-rand(i+421)*350;if(Math.abs(x-this.fairwayX(z))<35)continue;this.tree(x,z,c.trees,name==='summit',.55)}
 this.flag=new THREE.Group();const pole=this.mesh(new THREE.CylinderGeometry(.035,.045,5,8),this.mat(0xf1f1df),this.flag);pole.position.y=2.5;const cloth=this.mesh(new THREE.BufferGeometry(),this.mat(name==='ocean'?0xf4b768:0xd5a861),this.flag);const flagVertices=new Float32Array([0,4.85,0,2,4.38,0,0,4.05,0]);cloth.geometry.setAttribute('position',new THREE.BufferAttribute(flagVertices,3));cloth.geometry.computeVertexNormals();cloth.material.side=THREE.DoubleSide;cloth.castShadow=false;this.flag.position.copy(this.holePosition);this.root.add(this.flag);
 const skyGlow=this.mesh(new THREE.SphereGeometry(11,16,12),new THREE.MeshBasicMaterial({color:0xffeccb}),this.root);skyGlow.position.set(-200,90,-310);skyGlow.castShadow=false;
 if(name==='summit')for(let i=0;i<12;i++){const m=this.mesh(new THREE.ConeGeometry(50+rand(i)*40,72+rand(i+90)*45,5),this.mat(i%2?0x82958d:0x697d78));m.position.set((i-6)*90,20,-390);m.castShadow=false}
 if(name==='royal')this.clubhouse();return this;
 }
 clubhouse(){const pos=new THREE.Vector3(-70,this.groundHeight(-70,82)+1,80);const wall=this.mesh(new THREE.BoxGeometry(26,12,16),this.mat(0xd0c5a9));wall.position.copy(pos);wall.castShadow=true;const roof=this.mesh(new THREE.ConeGeometry(20,8,4),this.mat(0x334342));roof.rotation.y=Math.PI/4;roof.position.copy(pos).add(new THREE.Vector3(0,10,0));for(let i=-3;i<=3;i++){const window=this.mesh(new THREE.PlaneGeometry(1.7,3),this.mat(0x314c54,.2));window.position.copy(pos).add(new THREE.Vector3(i*3.3,1.3,8.03));}}
 tree(x,z,col,pine=false,scale=1){const seed=rand(x*13+z*3);const height=(7+seed*9)*scale;const trunk=this.mesh(new THREE.CylinderGeometry(.35,.55,height*.55,6),this.mat(0x554a35));trunk.position.set(x,this.groundHeight(x,z)+height*.24,z);const crown=this.mesh(pine?new THREE.ConeGeometry(2.9*scale,height*.94,7):new THREE.IcosahedronGeometry((3.2+seed*2)*scale,1),this.mat(col));crown.position.set(x,this.groundHeight(x,z)+height*.8,z);crown.castShadow=scale>.7}
 lie(x,z){
  const inside=area=>((x-area.x)/area.rx)**2+((z-area.z)/area.rz)**2<1;
  if((this.current==='ocean'&&x>=38)||this.water.some(inside))return 'WATER';
  if(this.bunkers.some(inside))return 'BUNKER';
  if(inside(this.green))return 'GREEN';
  if(z<=76&&z>=this.getGreenZ()&&Math.abs(x-this.fairwayX(z))<=this.station(z,2))return 'FAIRWAY';
  return 'ROUGH';
 }
 ground(x,z){return this.groundHeight(x,z)+.065}
}