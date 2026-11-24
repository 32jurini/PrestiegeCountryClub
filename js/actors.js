import {loadFittedModel,fitToRig,tintGolfer} from './tour-golfer.js?v=humanportrait';
import {measureShot} from './shot-pose.js?v=approach2';
import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import JSZip from 'jszip';
const fbx=new FBXLoader();
const animationFiles={idle:'Breathing Idle.fbx',drive:'Golf Drive.fbx',chip:'Golf Chip.fbx',putt:'Golf Putt.fbx',walk:'Walking.fbx',run:'Running (1).fbx',tee:'Golf Tee Up.fbx',pick:'Picking Up.fbx',talk:'Talking.fbx',point:'Pointing Forward.fbx',pointGesture:'Pointing Gesture.fbx',cheer:'Cheering.fbx',clap:'Clapping.fbx',angry:'Angry.fbx',wave:'Waving.fbx',thumb:'Sitting Thumbs Up.fbx',dance:'Breakdance Uprock.fbx',footwork:'Breakdance Footwork To Idle.fbx',freeze:'Breakdance Freeze Var 3.fbx'};
const promiseLoad=(url,loader)=>new Promise((resolve,reject)=>loader.load(url,resolve,undefined,reject));
async function readPack(name, count) {
 const parts = await Promise.all(Array.from({length: count}, async (_, index) => {
  const url = new URL('../assets/pack/' + name + '.' + index, import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw Error('Could not load ' + name + ' part ' + (index + 1));
  return response.arrayBuffer();
 }));
 return new Blob(parts).arrayBuffer();
}
let archivePromise;
function getAnimationArchive() {
 return archivePromise ??= readPack('golf', 2).then(bytes => JSZip.loadAsync(bytes)).catch(error => {
  archivePromise = undefined;
  throw error;
 });
}
const clipCache = new Map();
function sourceClip(name) {
 if (!clipCache.has(name)) clipCache.set(name, (async () => {
  const entry = (await getAnimationArchive()).file(animationFiles[name]);
  return fbx.parse(await entry.async('arraybuffer'), './assets/animations/').animations.find(clip => clip.tracks.length);
 })().catch(error => { clipCache.delete(name); throw error; }));
 return clipCache.get(name);
}
export class Golfer{
 constructor(scene){this.root=new THREE.Group();scene.add(this.root);this.model=null;this.mixer=null;this.actions=new Map();this.mode='idle';this.club=null;this.humanSource='';this.nativeClips=[];this.appearance={};this.proceduralTime=0;this.proceduralName='idle';this.basePose=new Map();this.loadVersion=0;this.updateHandClub()}
 updateHandClub() {
  this.club=new THREE.Group();
  const metal=new THREE.MeshStandardMaterial({color:0xc1cbcb,metalness:.72,roughness:.25});
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.009,.012,.95,12),metal);
  shaft.position.y=-.5;
  const grip=new THREE.Mesh(new THREE.CylinderGeometry(.019,.015,.24,16),new THREE.MeshStandardMaterial({color:0x25322f}));
  grip.position.y=-.10;
  this.clubHead=new THREE.Mesh(new THREE.SphereGeometry(1,18,12),metal.clone());
  this.clubHead.scale.set(.09,.045,.07);
  this.clubHead.position.y=-1;
  this.club.add(shaft,grip,this.clubHead);
  this.root.add(this.club);
 }
 setClub(type) {
  this.clubHead.scale.set(type==='driver'?.095:.078,type==='putter'?.022:.044,type==='driver'?.075:.035);
 }
 alignShot(name, ball, direction, floor) {
  this.model.position.y=this.restHeight;
  if(!this.poses.has(name)) {
   const pose=measureShot(this,name,THREE);
   if(!pose)return;
   this.poses.set(name,pose);
  }
  const pose=this.poses.get(name);
  this.club.quaternion.copy(pose.grip);
  this.club.scale.setScalar(pose.scale);
  this.club.visible=name!=='tee';
  this.root.rotation.y=Math.atan2(direction.x,direction.z)-pose.yaw;
  const offset=pose.point.clone().applyQuaternion(this.root.quaternion);
  this.root.position.set(ball.x-offset.x,floor,ball.z-offset.z);
 }
 address(name) {
  this.endAt=0;
  const action=this.actions.get(name);
  if(!action)return;
  clearTimeout(this.returnTimer);
  this.mixer.stopAllAction();
  action.reset().play();action.paused=true;
  this.mixer.update(0);
  this.mode=name;this.proceduralName='none';
 }
 async loadLocal(url) {
  const coach = url.endsWith('/Timmy.fbx');
  const model = coach ? fbx.parse(await readPack('coach', 4), './assets/characters/') : await promiseLoad(url, fbx);
  this.nativeClips = model.animations || [];
  return this.installModel(model, coach ? 'Coach Timmy' : 'Local golfer');
 }
 installModel(model,source,fitted=null){if(this.model){this.club.removeFromParent();this.root.add(this.club);this.root.remove(this.model);this.mixer?.stopAllAction()}this.poses=new Map();this.model=model;this.model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{m.roughness=Math.max(.42,m.roughness??.7);if(m.transparent)m.depthWrite=true})}}});const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());model.scale.multiplyScalar(1.82/(size.y||1));const scaled=new THREE.Box3().setFromObject(model);model.position.y-=scaled.min.y;this.root.add(model);this.mixer=new THREE.AnimationMixer(model);this.actions.clear();this.basePose.clear();model.traverse(o=>{if(o.isBone)this.basePose.set(o,o.quaternion.clone())});this.outfit=fitted?fitToRig(this,fitted):null;const hand=model.getObjectByProperty('isBone',true) && [...this.basePose.keys()].find(b=>/RightHand$/.test(b.name));
 if(hand){
  hand.add(this.club);
  this.club.position.set(0,0,0);
  const unit=hand.getWorldScale(new THREE.Vector3()).x||1;
  this.clubBaseScale=1/unit;
  this.club.scale.setScalar(this.clubBaseScale);
  this.club.children[0].position.y=-.48;
  this.clubHead.position.y=-1;
 }
 this.restHeight=model.position.y;this.toes=[...this.basePose.keys()].filter(b=>/ToeBase$/.test(b.name));this.humanSource=source;this.animate('idle',true);this.applyAppearance(this.appearance);return source}
 async load(frame='male'){const version=++this.loadVersion,file=frame==='female'?'X Bot.fbx':'Y Bot.fbx';const [model,fitted]=await Promise.all([promiseLoad(`./assets/characters/${encodeURIComponent(file)}`,fbx),loadFittedModel(file[0])]);if(version!==this.loadVersion)return this.humanSource;this.nativeClips=model.animations||[];return this.installModel(model,frame==='female'?'Local female golfer model' :'Local male golfer model',fitted)}
 proceduralPose(dt){if(!this.model)return;this.proceduralTime+=dt;const t=this.proceduralTime,n=this.proceduralName;const swing=n==='drive'||n==='chip'||n==='putt';const period=n==='drive'?1.35:n==='chip'?1.15:1.05;const u=Math.min(1,t/period);const windup=u<.43?Math.sin(u/.43*Math.PI/2):Math.cos((u-.43)/.57*Math.PI/2);const follow=u<.43?0:Math.sin((u-.43)/.57*Math.PI/2);const moving=n==='walk'||n==='run';const phase=t*(n==='run'?10:6);this.model.traverse(o=>{if(!o.isBone)return;const q=this.basePose.get(o);if(!q)return;o.quaternion.copy(q);const name=o.name.toLowerCase().replace(/mixamorig[:_]?/g,'');const left=/left|_l\b/.test(name),right=/right|_r\b/.test(name);if(swing){if(/spine|chest/.test(name))o.rotateY((windup*.34-follow*.55)*(n==='putt'?.3:1));if(/upperarm|arm/.test(name)&&!/forearm/.test(name))o.rotateX((left?-1:1)*(windup*.55-follow*.75));if(/forearm/.test(name))o.rotateZ((left?1:-1)*(windup*.32-follow*.4));}else if(moving){if(/upleg|thigh/.test(name))o.rotateX(Math.sin(phase+(left?0:Math.PI))*.35);if(/upperarm|arm/.test(name)&&!/forearm/.test(name))o.rotateX(Math.sin(phase+(left?Math.PI:0))*.22)}else if(n==='wave'||n==='point'||n==='talk'||n==='cheer'||n==='clap'){if(/upperarm|arm/.test(name)&&!/forearm/.test(name))o.rotateZ((left?1:-1)*(n==='cheer'?1.1:n==='wave'?.8:.35));if(/forearm/.test(name))o.rotateX(Math.sin(t*5)*.18)}else if(/spine|chest/.test(name))o.rotateX(Math.sin(t*2)*.012)});if(swing&&u>=1){this.proceduralName='idle';this.proceduralTime=0}}
 async loadAnimation(name){if(!this.mixer||!animationFiles[name])return false;try{const mixer=this.mixer;let clip=await sourceClip(name);if(!clip||mixer!==this.mixer)return false;const bones=new Set();this.model.traverse(o=>{if(o.isBone)bones.add(o.name)});const norm=n=>n.toLowerCase().replace(/mixamorig[0-9]*/g,'').replace(/[^a-z0-9]/g,'');const names=[...bones];const tracks=clip.tracks.map(t=>{const dot=t.name.indexOf('.');if(dot<0)return null;const src=t.name.slice(0,dot),prop=t.name.slice(dot),dest=names.find(n=>norm(n)===norm(src));if(!dest)return null;if(prop!=='.quaternion')return null;const copy=t.clone();copy.name=dest+prop;return copy}).filter(Boolean);if(!tracks.some(track=>track.name.endsWith('.quaternion')))return false;clip=new THREE.AnimationClip(name,clip.duration,tracks);const action=this.mixer.clipAction(clip);this.actions.set(name,action);return true}catch(e){console.warn('Animation failed:',name,e);return false}}
 async loadAllAnimations(names=Object.keys(animationFiles)){const results={};for(const name of names){results[name]=await this.loadAnimation(name);this.onAnimationProgress?.({name,loaded:Object.keys(results).length,total:names.length,ok:results[name]})}if(this.actions.has('idle'))this.animate('idle',true);return results}
 applyAppearance(palette={}) {
  Object.assign(this.appearance, palette);
  const colors=this.appearance;
  tintGolfer(this.outfit,colors);
  if(!this.model || !colors.skin) return;
  const shades = Object.fromEntries(['skin','shirt','pants'].map(key=>[key,new THREE.Color(colors[key])]));
  this.model.traverse(mesh=>{
   if(!mesh.isSkinnedMesh || mesh.userData.fitted || !mesh.visible) return;
   const geometry=mesh.geometry;
   const indices=geometry.getAttribute('skinIndex');
   if(!indices) return;
   let tint=geometry.getAttribute('color');
   if(!mesh.userData.paletteRegions) {
    const weights=geometry.getAttribute('skinWeight');
    mesh.userData.paletteRegions=Array.from({length:indices.count},(_,i)=>{
     let slot=0;
     for(let j=1;j<4;j++) if(weights.getComponent(i,j)>weights.getComponent(i,slot)) slot=j;
     const bone=mesh.skeleton.bones[indices.getComponent(i,slot)]?.name || '';
     if(/leg|foot|toe|hips/i.test(bone)) return 'pants';
     return /head|neck|forearm|hand/i.test(bone)?'skin':'shirt';
    });
    tint=new THREE.Float32BufferAttribute(new Float32Array(indices.count*3),3);
    geometry.setAttribute('color',tint);
    for(const mat of [].concat(mesh.material)){
     mat.map=null;mat.metalness=0;mat.roughness=.9;mat.specular?.setScalar(.08);mat.shininess=7;mat.vertexColors=true;mat.color.set(0xffffff);mat.needsUpdate=true;
    }
   }
   mesh.userData.paletteRegions.forEach((region,i)=>{
    const c=shades[region];tint.setXYZ(i,c.r,c.g,c.b);
   });
   tint.needsUpdate=true;
  });
 }
 animate(name,force=false){this.endAt=0;if(!this.mixer)return;if(name===this.mode&&!force)return;let action=this.actions.get(name);if(!action)action=this.actions.get('idle');if(!action){this.proceduralName=name;this.proceduralTime=0;this.mode=name;return}this.proceduralName='none';const old=this.actions.get(this.mode);if(old&&old!==action)old.fadeOut(.18);action.reset().fadeIn(.18).play();action.setLoop(THREE.LoopRepeat,Infinity);action.clampWhenFinished=false;this.mode=this.actions.has(name)?name:'idle'}
 shot(name){this.club.visible=name!=='tee';clearTimeout(this.returnTimer);if(!this.actions.has(name)){this.proceduralName=name;this.proceduralTime=0;this.mode=name;return}this.proceduralName='none';const action=this.actions.get(name),old=this.actions.get(this.mode);if(old&&old!==action)old.fadeOut(.12);action.reset().fadeIn(.12).setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();this.mode=name;this.endAt=Math.min(action.getClip().duration,4.2)}
 update(dt){
  if(!this.model)return;
  this.model.position.y=this.restHeight;
  this.mixer.update(dt);
  if(this.proceduralName!=='none')this.proceduralPose(dt);
  const action=this.actions.get(this.mode);
  if(this.mode==='tee' && this.toes.length){
   const position=new THREE.Vector3();
   const height=Math.min(...this.toes.map(toe=>this.root.worldToLocal(toe.getWorldPosition(position)).y));
   this.model.position.y+=.04-height;
  }
  if(this.endAt && action && action.time>=this.endAt-.0001){
   this.endAt=0;
   if(this.onShotEnd)this.onShotEnd();else this.animate('idle',true);
  }
 }
 setVisible(v){this.root.visible=v}
}
export {animationFiles};
