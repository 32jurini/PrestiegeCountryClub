import * as T from 'three';
import JSZip from 'jszip';
const fittedModels=new Map();
export function loadFittedModel(frame) {
 if(!fittedModels.has(frame)){
  const url=new URL('../assets/characters/'+frame+'-golfer.zip',import.meta.url);
  fittedModels.set(frame,fetch(url).then(response=>{
   if(!response.ok)throw Error('Could not load fitted golfer');
   return response.arrayBuffer();
  }).then(bytes=>JSZip.loadAsync(bytes)).then(zip=>zip.file('mesh.json').async('string')).then(JSON.parse).catch(error=>{fittedModels.delete(frame);throw error}));
 }
 return fittedModels.get(frame);
}

export function fitToRig(actor,data,materials) {
 const bones=[...actor.basePose.keys()];
 const joints=data.bones.map(name=>bones.find(b=>b.name.replace(/^mixamorig\d*[:_]?/,'')===name));
 if(joints.some(b=>!b))throw Error('Golfer rig mismatch');
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(data.p.map(n=>n/10000),3));
 g.setAttribute('skinIndex',new T.Uint16BufferAttribute(data.j,4));
 g.setAttribute('skinWeight',new T.Float32BufferAttribute(data.w.map(n=>n/255),4));
 // Blend the collar into the shoulders and shorten the stretched back of the neck.
 const positions=g.getAttribute('position');
 const neck=joints.find(b=>b.name.endsWith('Neck')), neckY=actor.root.worldToLocal(neck.getWorldPosition(new T.Vector3())).y;
 for(let i=0;i<positions.count;i++){
  const y=positions.getY(i),x=positions.getX(i);
  if(Math.abs(x)>.19||y<neckY-.06)continue;
  const blend=T.MathUtils.smoothstep(y,neckY-.06,neckY+.12);
  positions.setXYZ(i,x,y-.048*blend,positions.getZ(i)-.028*blend);
 }
 let offset=0;
 for(const [i,group] of data.groups.entries()){if(group.length)g.addGroup(offset,group.length,i);offset+=group.length}
 g.setIndex(data.groups.flat());g.computeVertexNormals();
 const mesh=new T.SkinnedMesh(g,[materials.skin,materials.shirt,materials.pants,materials.belt,materials.lips]);
 actor.model.traverse(o=>{if(o.isSkinnedMesh)o.visible=false});
 actor.root.add(mesh);actor.model.attach(mesh);actor.root.updateMatrixWorld(true);
 mesh.bind(new T.Skeleton(joints));mesh.normalizeSkinWeights();
 mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.fitted=true;
 const head=bones.find(b=>b.name.endsWith('Head'));
 // Fit the crown to the fitted scalp before the swing changes the head pose.
 const cap=head.getObjectByName('Golfer cap');
 if(cap){
  const positions=g.getAttribute('position');
  let top=-Infinity;
  for(let i=0;i<positions.count;i++)top=Math.max(top,positions.getY(i));
  const skull=new T.Box3(),vertex=new T.Vector3();
  for(let i=0;i<positions.count;i++){
   vertex.fromBufferAttribute(positions,i);
   if(vertex.y>top-.085)skull.expandByPoint(vertex);
  }
  const center=skull.getCenter(new T.Vector3());
  actor.root.attach(cap);
  cap.position.set(center.x,top-.252,center.z-.002);
  cap.scale.set(1.17,1.19,1.23);
  head.attach(cap);
 }
 for(const [x,y,z] of data.eyes){
  for(const [offset,w,h,d,mat] of [[0,.013,.011,.013,materials.white],[.011,.006,.006,.003,materials.eyes],[.013,.003,.003,.002,materials.belt]]){
   const eye=new T.Mesh(new T.SphereGeometry(1,16,12),mat);
   actor.root.add(eye);eye.position.set(x,y-.048,z-.028+offset);eye.scale.set(w,h,d);head.attach(eye);
  }
 }
}
