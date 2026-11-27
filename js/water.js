import * as T from 'three';

export function shoreX(z){return 38+1.8*Math.sin(z*.083)+1.2*Math.cos(z*.19)}

// The same shoreline coordinates drive shading and the playable hazard boundary.
export function waterMaterial(clock,coastal,area){
 const material=new T.MeshBasicMaterial({color:0xffffff});
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{tide:clock,bank:{value:new T.Vector4(area?.x||0,area?.z||0,area?.rx||1,area?.rz||1)},openSea:{value:area?0:1},swell:{value:coastal?1:.28}});
  shader.vertexShader='varying vec3 waterPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwaterPoint=(modelMatrix*vec4(position,1.)).xyz;');
  shader.fragmentShader='varying vec3 waterPoint;uniform float tide,openSea,swell;uniform vec4 bank;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 p=waterPoint.xz;
   float depth=openSea>.5 ? max(0.,p.x-(38.+1.8*sin(p.y*.083)+1.2*cos(p.y*.19))) : max(0.,(1.-length((p-bank.xy)/bank.zw))*min(bank.z,bank.w));
   vec2 warped=p+vec2(sin(p.y*.12+p.x*.05),cos(p.x*.14-p.y*.06))*1.7;
   float a=dot(warped,vec2(.72,.38))+tide*1.5,b=dot(warped,vec2(-1.12,1.52))-tide*1.8;
   float fineFade=1.-smoothstep(.04,.65,length(fwidth(p)));
   vec2 slope=swell*(vec2(.10,.05)*cos(a)+vec2(-.065,.09)*cos(b)+fineFade*.035*vec2(sin(3.*b+a),cos(4.*a-b)));
   slope+=fineFade*swell*.075*vec2(sin(dot(p,vec2(7.4,2.7))+1.4*sin(b)+tide*3.1),cos(dot(p,vec2(3.2,5.4))+sin(a)-tide*2.6));
   slope*=mix(.12,1.,1.-smoothstep(.12,1.7,length(fwidth(p))));
   vec3 n=normalize(vec3(-slope.x,1.,-slope.y)),eye=normalize(cameraPosition-waterPoint);
   float fres=.05+.88*pow(1.-clamp(dot(n,eye),0.,1.),4.);
   float sandRipple=.5+.5*sin(p.x*8.+sin(p.y*.9)*2.);
   float caustic=pow(max(0.,1.-abs(sin(a)+.7*sin(b))),9.);
   vec3 bed=vec3(.35,.32,.18)*(.86+.14*sandRipple*fineFade)+vec3(.10,.15,.12)*caustic;
   vec3 body=mix(bed,mix(vec3(.025,.14,.105),vec3(.009,.092,.12),swell),1.-exp(-depth*.35));
   vec3 reflected=reflect(-eye,n);
   vec3 sky=mix(vec3(.38,.56,.63),vec3(.12,.31,.44),clamp(reflected.y,0.,1.));
   float shine=pow(max(0.,1.-abs(dot(slope,normalize(eye.xz+vec2(.001))))*6.),5.);
   body+=vec3(.025,.049,.048)*shine*fineFade;
   float glint=pow(max(0.,dot(reflect(-eye,n),normalize(vec3(-.45,.45,.68)))),85.);
   float foam=swell*(1.-smoothstep(.12,1.7,depth))*smoothstep(.1,.9,sin(depth*4.-tide*1.5+2.2*sin(p.y*.9)+sin(p.x*2.1)));
   diffuseColor.rgb=mix(mix(body,sky,fres)+glint*vec3(.9,.8,.58),vec3(.70,.80,.73),foam*.46);
  `);
 };
 return material;
}

export class WaterSplash{
 constructor(scene){
  this.group=new T.Group();scene.add(this.group);this.group.visible=false;
  this.drops=new T.InstancedMesh(new T.SphereGeometry(.042,6,4),new T.MeshStandardMaterial({color:0xd4f2f1,roughness:.25}),36);
  this.group.add(this.drops);this.drops.frustumCulled=false;
  this.rings=Array.from({length:3},()=>{
   const ring=new T.Mesh(new T.RingGeometry(.92,1,64),new T.MeshBasicMaterial({color:0xc6e5df,transparent:true,depthWrite:false,side:T.DoubleSide}));
   ring.rotation.x=-Math.PI/2;this.group.add(ring);return ring;
  });
  // Thin scalloped sheet thrown up around the entry cavity before it collapses.
  const vertices=[],indices=[],steps=44;
  for(let i=0;i<=steps;i++){
   const a=2*Math.PI*i/steps,x=Math.cos(a),z=Math.sin(a);
   const tip=.55+.24*Math.sin(a*7)+.18*Math.cos(a*11);
   vertices.push(.25*x,0,.25*z,.43*x,tip,.43*z);
   if(i<steps){const k=2*i;indices.push(k,k+1,k+2,k+1,k+3,k+2)}
  }
  const sheet=new T.BufferGeometry();sheet.setAttribute('position',new T.Float32BufferAttribute(vertices,3));sheet.setIndex(indices);sheet.computeVertexNormals();
  this.crown=new T.Mesh(sheet,new T.MeshBasicMaterial({color:0xaee1dd,side:T.DoubleSide,transparent:true,opacity:.52,depthWrite:false}));this.group.add(this.crown);
  this.pose=new T.Object3D();this.velocities=[];this.age=0;
 }
 start(position,velocity){
  this.group.position.copy(position);this.group.visible=true;this.age=0;
  const fall=Math.min(26,Math.abs(velocity.y)),lateral=Math.hypot(velocity.x,velocity.z);
  this.crown.rotation.y=Math.atan2(velocity.x,velocity.z);this.skew=Math.min(1,lateral/(fall+1));
  this.strength=Math.min(1,.25+velocity.length()/32);
  this.velocities=Array.from({length:this.drops.count},(_,i)=>{
   const angle=i*2.39996,r=.6+Math.random();
   return new T.Vector3(Math.cos(angle)*r*(1+.06*lateral)+velocity.x*.10,(1.5+.13*fall)*(.5+Math.random()),Math.sin(angle)*r*(1+.06*lateral)+velocity.z*.10);
  });this.update(0);
 }
 update(dt){
  if(!this.group.visible)return;
  const t=this.age+=dt;
  if(t>1.45){this.group.visible=false;return}
  this.crown.visible=t<.38;
  const radius=.28+2*t,height=Math.max(0,Math.sin(Math.PI*t/.38))*this.strength;
  this.crown.scale.set(radius,height,radius*(1+.7*this.skew));this.crown.material.opacity=.52*Math.max(0,1-t/.38);
  this.velocities.forEach((v,i)=>{
   const h=v.y*t-4.9*t*t;
   this.pose.position.set(v.x*t,Math.max(.01,h),v.z*t);
   const scale=h>=0?this.strength:0;
   this.pose.scale.set(scale,scale*1.65,scale);this.pose.updateMatrix();this.drops.setMatrixAt(i,this.pose.matrix);
  });
  this.drops.instanceMatrix.needsUpdate=true;
  this.rings.forEach((r,i)=>{
   const age=t-i*.13;r.visible=age>=0;r.position.y=.022+i*.003;
   r.scale.setScalar(.08+Math.max(0,age)*(1.2+this.strength));r.material.opacity=.53*Math.max(0,1-age/1.45);
  });
 }
}

export function coastalBank(world,clock){
 const rocks=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({roughness:.96}),94);
 const grassGeo=new T.BufferGeometry(),blades=[],tints=[];
 let seed=173+world.holeIndex*137;
 const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 const pose=new T.Object3D(),color=new T.Color();
 for(let i=0;i<rocks.count;i++){
  const z=92-rand()*(world.length+60),x=shoreX(z)+(rand()-.35)*7;
  pose.position.set(x,world.groundHeight(x,z)-.13,z);pose.scale.set(.45+rand()*1.1,.25+rand()*.55,.55+rand()*.95);pose.rotation.set(rand()*.4,rand()*6,rand()*.35);pose.updateMatrix();
  rocks.setMatrixAt(i,pose.matrix);rocks.setColorAt(i,color.setHSL(.10,.08,.27+rand()*.16));
  const bx=shoreX(z)-3-rand()*3;
  if(world.lie(bx,z)!=='ROUGH')continue;
  for(let j=0;j<28;j++){
   const x=bx+rand()*1.4,z1=z+rand()*1.4,y=world.groundHeight(x,z1),h=.25+rand()*.48;
   blades.push(x-.035,y,z1,x+.035,y,z1,x+.18,y+h,z1+.06);
   tints.push(.11,.15,.047,.13,.15,.055,.44,.40,.17);
  }
 }
 rocks.userData.rocks=true;world.root.add(rocks);grassGeo.setAttribute('position',new T.Float32BufferAttribute(blades,3));grassGeo.setAttribute('color',new T.Float32BufferAttribute(tints,3));
 const grass=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide});
 grass.onBeforeCompile=s=>{s.uniforms.tide=clock;s.vertexShader='uniform float tide;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x+=step(.3,color.r)*.11*sin(tide*2.+position.z*.7);');};
 world.root.add(new T.Mesh(grassGeo,grass));
}
