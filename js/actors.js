import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const fbx=new FBXLoader();const gltf=new GLTFLoader();
const animationPaths={idle:'idle',drive:'drive',chip:'chip',putt:'putt',walk:'walk',tee:'tee',talk:'talk',point:'point',cheer:'cheer',clap:'clap',angry:'angry',run:'run',pick:'pick',wave:'wave',pointGesture:'pointGesture',thumb:'thumb',dance:'dance',freeze:'freeze'};
const promiseLoad=(url,loader)=>new Promise((resolve,reject)=>loader.load(url,resolve,undefined,reject));
export class Golfer{
 constructor(scene){this.root=new THREE.Group();scene.add(this.root);this.model=null;this.mixer=null;this.actions=new Map();this.mode='idle';this.club=null;this.humanSource='';this.updateHandClub();}
 updateHandClub(){if(this.club)this.root.remove(this.club);const group=new THREE.Group();const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,1.3,8),new THREE.MeshStandardMaterial({color:0xb7c6bb,metalness:.8,roughness:.3}));shaft.rotation.z=.32;group.add(shaft);const head=new THREE.Mesh(new THREE.BoxGeometry(.24,.12,.14),new THREE.MeshStandardMaterial({color:0x263d3d,metalness:.45}));head.position.set(-.2,-.61,0);group.add(head);group.position.set(-.53,1.03,.26);this.root.add(group);this.club=group;this.club.visible=false}
 async loadLocal(url){const model=await promiseLoad(url,fbx);this.nativeClips=model.animations||[];this.installModel(model,'Coach Timmy / local FBX');return 'Coach Timmy / local FBX'}
 installModel(model,source){
  if(this.model){this.root.remove(this.model);this.mixer?.stopAllAction()}this.model=model;this.model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m.transparent)m.depthWrite=true})}}});
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());const height=size.y||1;model.scale.multiplyScalar(1.8/height);box.setFromObject(model);model.position.y-=box.min.y;this.root.add(model);this.mixer=new THREE.AnimationMixer(model);this.actions.clear();this.humanSource=source;
  for(const clip of this.nativeClips){const n=clip.name.toLowerCase();const key=n.includes('walk')?'walk':n.includes('idle')?'idle':n.includes('clap')?'clap':n.includes('cheer')?'cheer':n.includes('talk')?'talk':null;if(key&&!this.actions.has(key))this.actions.set(key,this.mixer.clipAction(clip))}
  this.animate('idle');return source;
 }
 async load(frame='male'){
  let model,source='';const choices=frame==='female'?['sophia','mia']:['daniel','ryan'];
  for(const name of choices){try{const data=await Promise.race([promiseLoad(`https://cdn.jsdelivr.net/gh/memoriesrohit/avatar-studio@main/models/${name}.glb`,gltf),new Promise((_,rej)=>setTimeout(()=>rej(new Error('remote model timeout')),3500))]);model=data.scene;this.nativeClips=data.animations||[];source=`Rocketbox / ${name}`;break}catch(e){}}
  if(!model){model=await promiseLoad(`./assets/characters/${frame==='female'?'X Bot':'Y Bot'}.fbx`,fbx);this.nativeClips=model.animations||[];source='Mixamo bot fallback'}
  return this.installModel(model,source);
 }
 applyAppearance(palette){if(!this.model)return;const colors={hair:palette.hair,eyes:palette.eyes,skin:palette.skin,shirt:palette.shirt,pants:palette.pants};this.model.traverse(o=>{if(!o.isMesh||!o.material)return;const name=(o.name+' '+(o.material.name||'')).toLowerCase();let key=null;if(/hair|eyebrow/.test(name))key='hair';else if(/iris|eye(?!lash)/.test(name))key='eyes';else if(/skin|face|head|arm|hand|neck/.test(name))key='skin';else if(/shirt|polo|top|jersey|sweater/.test(name))key='shirt';else if(/pant|trouser|short|skirt/.test(name))key='pants';if(!key||!colors[key])return;const material=o.material.clone();if(material.color)material.color.set(colors[key]);o.material=material;});}
 async loadAnimation(name){if(!this.mixer||!animationPaths[name])return false;try{const anim=await promiseLoad(`./assets/animations/${animationPaths[name]}.fbx`,fbx);if(!anim.animations?.length)return false;let clip=anim.animations[0]; // Mixamo FBX clips target bone names. Verify expected tracks before applying.
 const bones=new Set();this.model.traverse(o=>{if(o.isBone)bones.add(o.name)});const normalized=n=>n.toLowerCase().replace(/mixamorig/g,'').replace(/[^a-z0-9]/g,'');
 const boneNames=[...bones];const tracks=clip.tracks.map(t=>{const dot=t.name.indexOf('.');if(dot<0)return null;const source=t.name.slice(0,dot),property=t.name.slice(dot);const dest=boneNames.find(n=>normalized(n)===normalized(source));if(!dest)return null;const cloned=t.clone();cloned.name=dest+property;return cloned}).filter(Boolean);if(!tracks.length)return false;
 clip=new THREE.AnimationClip(name,clip.duration,tracks);const a=this.mixer.clipAction(clip);a.setLoop(THREE.LoopRepeat);this.actions.set(name,a);if(name==='idle'&&this.mode==='idle')this.animate('idle',true);return true;}catch(e){return false}}
 animate(name,force=false){if(!this.mixer)return;if(name===this.mode&&!force)return;let a=this.actions.get(name);if(!a){a=this.actions.get('idle');if(!a)return}const old=this.actions.get(this.mode);if(old&&old!==a)old.fadeOut(.22);a.reset().fadeIn(.22).play();a.clampWhenFinished=false;this.mode=name}
 shot(name){this.animate(name,true);const a=this.actions.get(name);if(a){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;setTimeout(()=>this.animate('idle',true),Math.min((a.getClip().duration||2)*950,3300))}else{this.root.rotation.z=.05;setTimeout(()=>this.root.rotation.z=0,250)}}
 update(dt){this.mixer?.update(dt)}
 setVisible(v){this.root.visible=v}
}