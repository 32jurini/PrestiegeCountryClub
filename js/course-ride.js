import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {World} from './world.js?v=rockpath1';

const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const ease=t=>t*t*(3-2*t);
const themes={royal:[44,10,0x194638],ocean:[54,-12,0x296474],summit:[52,15,0x343e37],misty:[61,-16,0x514754]};

function clip(world,plane){
 world.root.traverse(o=>{
  if(o===world.sky||!o.material)return;
  for(const m of [].concat(o.material)){m.clippingPlanes=[plane];m.clipShadows=true}
 });
}

// Seat the fitted character using bone directions in cart space. The live swing rig stays independent.
function rider(actor,passenger,owned,caddie=false){
 const figure=clone(actor.model),source=[],copies=[];
 actor.model.traverse(o=>source.push(o));figure.traverse(o=>copies.push(o));
 figure.position.set(0,0,0);figure.quaternion.identity();
 const bones=new Map();
 copies.forEach((o,i)=>{
  if(o.isBone){
   const rest=actor.basePose.get(source[i]);if(rest)o.quaternion.copy(rest);
   const name=o.name.replace(/^mixamorig\d*[:_]?/,'');if(!bones.has(name))bones.set(name,o);
  }
  if(caddie&&Array.isArray(o.material)&&o.material.includes(actor.outfit?.shirt)){
   const mats=o.material.slice(),idx=mats.indexOf(actor.outfit.shirt);
   mats[idx]=mats[idx].clone();mats[idx].color.setHex(0xe7deb9);owned.push(mats[idx]);o.material=mats;
  }
 });
 // The hand-mounted club is also a child of the animated model.

 const held=source.indexOf(actor.club);if(held>=0)copies[held].visible=false;
 function point(from,to,direction){
  const a=bones.get(from),b=bones.get(to);if(!a||!b)return;
  const cur=b.getWorldPosition(v()).sub(a.getWorldPosition(v())).normalize();
  const q=a.getWorldQuaternion(new T.Quaternion()).premultiply(new T.Quaternion().setFromUnitVectors(cur,direction.normalize()));
  a.quaternion.copy(a.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));
 }
 for(const [s,k] of [['Left',1],['Right',-1]]){
  point(s+'Arm',s+'ForeArm',v(k*.16,-1,.06));point(s+'ForeArm',s+'Hand',v(0,-1,.22));
 }
 const rest=new Map([...bones.values()].map(b=>[b,b.quaternion.clone()]));
 for(const [s,k] of [['Left',1],['Right',-1]]){
  point(s+'UpLeg',s+'Leg',v(k*.10,-.12,1));point(s+'Leg',s+'Foot',v(0,-1,.20));
  point(s+'Arm',s+'ForeArm',v(k*.26,-.84,.45));point(s+'ForeArm',s+'Hand',passenger?v(k*.12,.3,.9):v(-k*.22,.16,1));
 }
 const hip=bones.get('Hips');if(hip)figure.position.sub(hip.getWorldPosition(v()));
 const seat=new T.Group();seat.add(figure);
 const seated=new Map([...bones.values()].map(b=>[b,b.quaternion.clone()]));
 function pose(mix){
  for(const [bone,q] of rest)bone.quaternion.copy(q).slerp(seated.get(bone),mix);
 }
 function reach(target,weight){
  const shoulder=bones.get('RightArm'),elbow=bones.get('RightForeArm'),hand=bones.get('RightHand');
  if(!shoulder||!elbow||!hand||!weight)return;
  const startArm=shoulder.quaternion.clone(),startElbow=elbow.quaternion.clone();
  const a=shoulder.getWorldPosition(v()),b=elbow.getWorldPosition(v()),c=hand.getWorldPosition(v());
  const upper=a.distanceTo(b),lower=b.distanceTo(c),axis=target.clone().sub(a);
  const dist=T.MathUtils.clamp(axis.length(),Math.abs(upper-lower)+.001,upper+lower-.001);
  axis.normalize();
  const along=(upper*upper-lower*lower+dist*dist)/(2*dist);
  const pole=v(0,-1,0);pole.addScaledVector(axis,-axis.dot(pole)).normalize();
  const arm=axis.multiplyScalar(along).addScaledVector(pole,Math.sqrt(Math.max(0,upper*upper-along*along)));
  point('RightArm','RightForeArm',arm);
  point('RightForeArm','RightHand',target.clone().sub(elbow.getWorldPosition(v())));
  shoulder.quaternion.slerp(startArm,1-weight);elbow.quaternion.slerp(startElbow,1-weight);
 }
 return {seat,pose,reach};
}

// The second bag shares the existing club geometry and materials, without copying interaction state.
function bagDisplay(source){
 const copy=source.isMesh?new T.Mesh(source.geometry,source.material):new T.Group();
 copy.position.copy(source.position);copy.quaternion.copy(source.quaternion);copy.scale.copy(source.scale);
 copy.castShadow=source.castShadow;copy.receiveShadow=source.receiveShadow;
 for(const part of source.children)copy.add(bagDisplay(part));
 return copy;
}

function cart(game,party){
 const root=new T.Group(),owned=[];
 const part=(geo,color,x,y,z)=>{
  const mat=new T.MeshStandardMaterial({color,roughness:.68});owned.push(mat,geo);
  const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;root.add(m);return m;
 };
 const box=(x,y,z,w,h,d,c)=>part(new RoundedBoxGeometry(w,h,d,2,Math.min(.075,h*.34,w*.25,d*.25)),c,x,y,z);
 const color=themes[game.course][2];
 box(0,.40,0,1.7,.19,2.55,color);box(0,.78,.91,1.67,.48,.55,color);
 box(0,.68,-.38,1.48,.19,.62,0xdcd5be);box(0,.96,-.71,1.49,.42,.12,0xdcd5be);
 for(const x of [-.77,.77])for(const z of [-.86,.89]){
  box(x,1.37,z,.055,1.82,.055,0x27332e);
  const tire=part(new T.CylinderGeometry(.30,.30,.19,20),0x242927,x,.32,z);tire.rotation.z=Math.PI/2;
  const hub=part(new T.CylinderGeometry(.15,.15,.2,16),0xaaafa6,x,.32,z);hub.rotation.z=Math.PI/2;
 }
 box(0,2.3,0,1.89,.12,2.4,0xe4dfcb);
 box(0,.56,-1.04,1.60,.29,.44,color);box(0,.38,-1.29,1.54,.10,.12,0x292e2c);
 for(const x of [-.59,.59]){
  box(x,.60,-1.262,.22,.09,.026,0x9a2921);box(x,.87,1.194,.26,.11,.03,0xeae2c7);
  box(x,.47,.02,.34,.09,1.08,0x3c423d);
 }
 const glass=box(0,1.52,.91,1.47,.89,.025,0xcbdedb);
 glass.material.transparent=true;glass.material.opacity=.14;glass.material.depthWrite=false;glass.castShadow=false;
 const wheel=part(new T.TorusGeometry(.20,.023,8,28),0x252d29,-.40,1.07,.40);wheel.rotation.x=-.65;
 box(-.4,.89,.51,.055,.38,.055,0x303532).rotation.x=-.45;
 const remote=party?.remote?.model?party.remote:game.golfer;
 const guest=party?.role==='guest';
 const driver=rider(guest?remote:game.golfer,false,owned);
 const passenger=rider(guest||!party?game.golfer:remote,true,owned,!party);
 root.add(driver.seat,passenger.seat);
 driver.seat.position.set(-.4,.83,-.42);passenger.seat.position.set(.4,.83,-.42);
 const bag=game.bag;game.showBagClubs(null);bag.visible=true;
 const bags=party?[guest?bagDisplay(bag):bag,guest?bag:bagDisplay(bag)]:[bag];
 const handlers=party?[driver,passenger]:[passenger];
 box(0,.56,-1.23,1.4,.08,.5,0x313a34);
 root.add(...bags);game.scene.add(root);
 const phase=(t,a,b)=>ease(T.MathUtils.clamp((t-a)/(b-a),0,1));
 function loadBags(t,ground){
  for(let i=0;i<bags.length;i++){
   const side=handlers[i]===driver?-1:1,person=handlers[i],item=bags[i];
   const lift=phase(t,.16,.57),board=phase(t,.64,1),bend=Math.sin(Math.PI*phase(t,0,.65));
   const rackX=side*.40,groundZ=-2.12;
   item.position.set(rackX,.60*lift+.18*Math.sin(Math.PI*lift),T.MathUtils.lerp(groundZ,-1.24,lift));
   const spot=root.localToWorld(v(rackX,0,groundZ));
   item.position.y+=(ground(spot.x,spot.z)-root.position.y)*(1-lift);
   item.rotation.set(-.09*lift,0,0);
   person.pose(board);
   const z=T.MathUtils.lerp(groundZ-.30,-1.66,lift);
   person.seat.position.set(rackX+.19*(1-board)+side*.68*Math.sin(Math.PI*board),
    T.MathUtils.lerp(.95-.13*bend,.83,board),
    T.MathUtils.lerp(z,-.42,board));
   const feet=root.localToWorld(person.seat.position.clone());
   person.seat.position.y+=(ground(feet.x,feet.z)-root.position.y)*(1-board);
   person.seat.rotation.x=.30*bend;
   if(t<.74){
    const target=item.localToWorld(v(.035,.77,-.10));
    person.reach(target,phase(t,.01,.15)*(1-phase(t,.59,.73)));
   }
  }
 }
 return {root,bags,loadBags,dispose(){
  game.scene.add(bag);bag.rotation.set(0,0,0);bag.visible=false;root.removeFromParent();owned.forEach(o=>o.dispose());
  root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose()});
 }};
}

// Reserve the swept footprint, including full steering lock and the cart corners.
const steeringLimit=.43;
function clearRocks(world,track){
 const transform=new T.Matrix4(),bounds=new T.Sphere(),color=new T.Color();
 const clearance=Math.hypot(1.36,.95)+steeringLimit+.35;
 world.root.updateMatrixWorld(true);
 world.root.traverse(batch=>{
  if(!batch.userData.rocks||!batch.count)return;
  batch.geometry.computeBoundingSphere();
  let kept=0;
  for(let i=0;i<batch.count;i++){
   batch.getMatrixAt(i,transform);
   bounds.copy(batch.geometry.boundingSphere).applyMatrix4(transform).applyMatrix4(batch.matrixWorld);
   const reach=(bounds.radius+clearance)**2;
   if(track.some(p=>(p.x-bounds.center.x)**2+(p.z-bounds.center.z)**2<=reach))continue;
   if(kept!==i){
    batch.setMatrixAt(kept,transform);
    if(batch.instanceColor){batch.getColorAt(i,color);batch.setColorAt(kept,color)}
   }
   kept++;
  }
  if(kept===batch.count)return;
  batch.count=kept;batch.instanceMatrix.needsUpdate=true;
  if(batch.instanceColor)batch.instanceColor.needsUpdate=true;
  batch.computeBoundingSphere();
 });
}

export class CourseRide{
 constructor(g,index){
  this.game=g;this.from=g.world;this.to=new World(g.scene,g.course,index,this.from);
  const [distance,bend]=themes[g.course],pin=this.from.holePosition;
  const side=g.course==='ocean'?-1:(index%2?1:-1);
  const spread=distance+5*Math.sin(index*1.91),dx=side*(8+Math.abs(bend)*.6);
  this.offset=v(pin.x+dx,0,pin.z-spread-70);this.seam=pin.z-spread*.5;
  const center=pin.x+dx*.52;
  this.offset.y=this.from.groundHeight(center,this.seam)-this.to.groundHeight(center-this.offset.x,this.seam-this.offset.z);
  this.to.root.position.copy(this.offset);this.to.sky.visible=false;
  this.before=new T.Plane(v(0,0,1),-this.seam);this.after=new T.Plane(v(0,0,-1),this.seam);
  clip(this.from,this.before);clip(this.to,this.after);
  // Grade both terrain meshes to the same cross-section behind the green.
  for(const world of [this.from,this.to]){
   const shift=world.root.position,geo=world.terrain.geometry,pts=geo.attributes.position;
   for(let i=0;i<pts.count;i++){
    const z=pts.getZ(i)+shift.z;
    if(Math.abs(z-this.seam)<10)pts.setY(i,this.grade(pts.getX(i)+shift.x,z)-shift.y);
   }
   pts.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();
  }
  this.curve=new T.CatmullRomCurve3([v(pin.x+side*(this.from.green.rx+3),0,pin.z),v(pin.x+side*(this.from.green.rx+3),0,pin.z-10),
   v(center+bend*.35,0,this.seam),v(this.offset.x+side*6,0,this.offset.z+80),v(this.offset.x+side*8.6,0,this.offset.z+71)]);
  this.length=this.curve.getLength();this.distance=0;this.speed=0;
  const track=this.curve.getSpacedPoints(Math.ceil(this.length/.4));
  clearRocks(this.from,track);clearRocks(this.to,track);
  const vertices=[],indices=[],colors=[];
  const gravel=new T.Color(g.course==='ocean'?0xc3b897:0xa39d88);
  for(let i=0;i<=96;i++){
   const t=i/96,p=this.curve.getPointAt(t),d=this.curve.getTangentAt(t);
   for(const [k,shade] of [[-1.35,.67],[-1.16,.86],[-.80,1.04],[-.51,1],[.51,1],[.80,1.04],[1.16,.86],[1.35,.67]]){
    const x=p.x+d.z*k,z=p.z-d.x*k;
    vertices.push(x,this.height(x,z)+.025,z);colors.push(gravel.r*shade,gravel.g*shade,gravel.b*shade);
   }
   if(i)for(let k=0;k<7;k++){const a=i*8+k;indices.push(a-8,a,a-7,a-7,a,a+1)}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
  this.road=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}));
  this.road.receiveShadow=true;g.scene.add(this.road);
 }
 board(party){
  const g=this.game;this.party=party;this.loading=0;this.unloading=0;this.lane=0;this.cart=cart(g,party);this.origin=g.camera.position.clone();this.initialRotation=g.camera.quaternion.clone();this.elapsed=0;
 }
 grade(x,z){
  const a=this.from.groundHeight(x,z),b=this.to.groundHeight(x-this.offset.x,z-this.offset.z)+this.offset.y;
  const t=ease(T.MathUtils.clamp((this.seam+9-z)/18,0,1));
  return T.MathUtils.lerp(a,b,t);
 }
 height(x,z){return this.grade(x,z)+.085}
 update(dt){
  this.elapsed+=dt;const g=this.game;
  if(this.party?.role==='guest'){
   if(this.remoteState){
    const state=this.remoteState,mix=1-Math.exp(-dt*32);
    this.loading=state.loading===1?1:T.MathUtils.lerp(this.loading,state.loading,mix);
    this.distance=state.distance===this.length?this.length:T.MathUtils.lerp(this.distance,state.distance,mix);
    this.lane=T.MathUtils.lerp(this.lane,state.lane,mix);
    this.unloading=state.unloading===1?1:T.MathUtils.lerp(this.unloading,state.unloading,mix);
   }
  }else if(this.loading<1)this.loading=Math.min(1,this.loading+dt/3.4);
  else if(this.distance>=this.length)this.unloading=Math.min(1,this.unloading+dt/3.4);
  else{
  const speed=Math.min(g.cartBoost?11:6.7,Math.sqrt(7*(this.length-this.distance))+.65);
  this.speed=T.MathUtils.damp(this.speed,speed,2,dt);this.distance=Math.min(this.length,this.distance+dt*this.speed);
  this.lane=T.MathUtils.damp(this.lane||0,(Number(!!g.cartRight)-Number(!!g.cartLeft))*steeringLimit,4,dt);
  }
  const t=this.distance/this.length,p=this.curve.getPointAt(t),dir=this.curve.getTangentAt(t);
  p.x-=dir.z*this.lane;p.z+=dir.x*this.lane;
  p.y=this.height(p.x,p.z);this.cart.root.position.copy(p);this.cart.root.rotation.y=Math.atan2(dir.x,dir.z);
  const loading=this.loading<1||this.unloading>0;
  if(loading||!this.seated){this.cart.loadBags(this.loading-this.unloading,(x,z)=>this.grade(x,z));this.seated=!loading}
  const eye=this.cart.root.localToWorld(v(-2.6,2.42,-5.15)),focus=this.cart.root.localToWorld(v(0,1,-.55));
  eye.y=Math.max(eye.y,this.height(eye.x,eye.z)+1.4);
  const blend=ease(Math.min(1,this.elapsed/1.1));g.camera.position.lerpVectors(this.origin,eye,blend);
  g.camera.lookAt(focus);g.camera.quaternion.slerp(this.initialRotation,1-blend);g.position.copy(p);
  return this.unloading===1;
 }
 arrive(){
  // Rebase both sectors and the camera together so shot physics can keep tee-local coordinates.
  this.to.root.position.set(0,0,0);this.from.root.position.sub(this.offset);this.road.position.sub(this.offset);
  this.before.constant+=this.offset.z;this.after.constant-=this.offset.z;
  this.to.sky.visible=true;this.from.sky.visible=false;this.game.camera.position.sub(this.offset);
  this.drop=this.game.bag.getWorldPosition(v()).sub(this.offset);
  this.cart.dispose();this.cart=null;
 }
 releaseRoad(){this.road.removeFromParent();this.road.geometry.dispose();this.road.material.dispose()}
}
