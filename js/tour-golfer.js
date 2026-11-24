import * as T from 'three';
import JSZip from 'jszip';

const models=new Map(), textures=new Map();
const asset=name=>new URL('../assets/characters/tour/'+name,import.meta.url).href;
function texture(name) {
 if(!textures.has(name)){
  const ready=new T.TextureLoader().loadAsync(asset(name+'.webp')).then(map=>{
   map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map;
  }).catch(error=>{textures.delete(name);throw error});
  textures.set(name,ready);
 }
 return textures.get(name);
}
export function loadFittedModel(frame) {
 if(!models.has(frame)){
  const geometry=fetch(asset(frame+'.zip')).then(response=>{
   if(!response.ok)throw Error('Could not load golfer geometry');
   return response.arrayBuffer();
  }).then(bytes=>JSZip.loadAsync(bytes)).then(zip=>zip.file('mesh.json').async('string')).then(JSON.parse);
  const maps=Promise.all([frame+'-skin','knit','shoes','eye','brow',frame+'-hair'].map(texture));
  models.set(frame,Promise.all([geometry,maps]).catch(error=>{models.delete(frame);throw error}));
 }
 return models.get(frame);
}

export function fitToRig(actor,[data,maps]) {
 const bones=[...actor.basePose.keys()];
 const joints=data.bones.map(name=>bones.find(b=>b.name.replace(/^mixamorig\d*[:_]?/,'')===name));
 if(joints.some(b=>!b))throw Error('Golfer rig mismatch');
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(data.p.map(n=>n/10000),3));
 geometry.setAttribute('uv',new T.Float32BufferAttribute(data.uv.map(n=>n/10000),2));
 geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(data.j,4));
 geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(data.w.map(n=>n/255),4));
 let offset=0;
 data.groups.forEach((group,index)=>{
  geometry.addGroup(offset,group.length,index);offset+=group.length;
 });
 geometry.setIndex(data.groups.flat());geometry.computeVertexNormals();
 const surface=(map,roughness,extra={})=>new T.MeshStandardMaterial({map,roughness,...extra});
 const skin=surface(maps[0],.73),shirt=surface(maps[1],.94),pants=surface(maps[1],.95);
 const shoes=surface(maps[2],.78),eyes=surface(maps[3],.32);
 const strands={side:T.DoubleSide,alphaTest:.28};
 const brows=surface(maps[4],.92,strands),hair=surface(maps[5],.84,strands);
 const mesh=new T.SkinnedMesh(geometry,[skin,shirt,pants,shoes,eyes,brows,hair]);
 actor.model.traverse(o=>{if(o.isSkinnedMesh)o.visible=false});
 actor.root.add(mesh);actor.model.attach(mesh);actor.root.updateMatrixWorld(true);
 mesh.bind(new T.Skeleton(joints));mesh.normalizeSkinWeights();
 mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.fitted=true;
 return {skin,shirt,pants,eyes,hair,brows};
}

export function tintGolfer(materials,colors) {
 if(!materials)return;
 for(const part of ['skin','shirt','pants','hair','eyes']){
  if(!colors[part])continue;
  const c=new T.Color(colors[part]);
  // Preserve the diffuse portrait's highlights and natural lip color while tinting complexion.
  if(part==='skin'){c.r/=0.54;c.g/=0.34;c.b/=0.24}
  if(part==='eyes')c.lerp(new T.Color(0xffffff),.55);
  materials[part].color.copy(c);
 }
 materials.brows.color.copy(materials.hair.color);
}
