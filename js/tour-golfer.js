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
 // The cap band and polo neckline follow the same skinned surface as the head and shoulders.
 const groups=data.groups.map(group=>group.slice());
 const exposed=groups[0];groups[0]=[];
 let crown=-Infinity;
 for(let i=0;i<positions.count;i++)crown=Math.max(crown,positions.getY(i));
 for(let i=0;i<exposed.length;i+=3){
  const a=exposed[i],b=exposed[i+1],c=exposed[i+2];
  const y=(positions.getY(a)+positions.getY(b)+positions.getY(c))/3;
  const z=(positions.getZ(a)+positions.getZ(b)+positions.getZ(c))/3;
  const x=(positions.getX(a)+positions.getX(b)+positions.getX(c))/3;
  let region=0;
  if(y>crown-.095+z*.18)region=3;
  else if(y>crown-.177 && z<.018+.20*(y-crown+.177))region=5;
  else if(Math.abs(x)<.17 && y>neckY-.09 && y<neckY+.023-z*.32)region=1;
  groups[region].push(a,b,c);
 }
 let offset=0;
 for(const [i,group] of groups.entries()){if(group.length)g.addGroup(offset,group.length,i);offset+=group.length}
 g.setIndex(groups.flat());g.computeVertexNormals();
 const mesh=new T.SkinnedMesh(g,[materials.skin,materials.shirt,materials.pants,materials.belt,materials.lips,materials.hair]);
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
  // Follow the actual scalp profile so the rear panels cover it in the bent address pose.
  const rings=12,sectors=48,verts=[],indices=[];
  for(let row=0;row<=rings;row++){
   const t=row/rings,y=top-.099+t*.106;
   const slice=new T.Box3();
   for(let i=0;i<positions.count;i++){
    vertex.fromBufferAttribute(positions,i);
    if(Math.abs(vertex.y-y)<.014)slice.expandByPoint(vertex);
   }
   const c=slice.isEmpty()?center:slice.getCenter(new T.Vector3());
   const size=slice.getSize(new T.Vector3());
   for(let j=0;j<=sectors;j++){
    const a=j*2*Math.PI/sectors;
    verts.push(c.x+Math.cos(a)*(size.x*.56+.005),y+(1-t)*.014*Math.sin(a),c.z+Math.sin(a)*(size.z*.56+.007));
    if(row<rings&&j<sectors){const k=row*(sectors+1)+j;indices.push(k,k+sectors+1,k+1,k+1,k+sectors+1,k+sectors+2)}
   }
  }
  const shell=new T.BufferGeometry();shell.setAttribute('position',new T.Float32BufferAttribute(verts,3));shell.setIndex(indices);shell.computeVertexNormals();
  const crownMesh=new T.Mesh(shell,materials.belt);
  actor.root.add(crownMesh);head.attach(crownMesh);crownMesh.castShadow=true;

 }
 for(const [x,y,z] of data.eyes){
  for(const [offset,w,h,d,mat] of [[0,.013,.011,.013,materials.white],[.011,.006,.006,.003,materials.eyes],[.013,.003,.003,.002,materials.belt]]){
   const eye=new T.Mesh(new T.SphereGeometry(1,16,12),mat);
   actor.root.add(eye);eye.position.set(x,y-.048,z-.028+offset);eye.scale.set(w,h,d);head.attach(eye);
  }
 }
}
