import * as T from 'three';

// Build in golfer-sized coordinates, then bind each piece to its animated bone.
export function dressGolfer(actor) {
 const bones=[...actor.basePose.keys()];
 const bone=suffix=>bones.find(b=>b.name.endsWith(suffix));
 const mat=(color)=>new T.MeshStandardMaterial({color,roughness:.88});
 const skin=mat('#ba8c70'),hair=mat('#36261f'),eyes=mat('#4c8069'),white=mat('#f5f2df');
 const ink=mat('#263037'), suede=mat('#283d39'), gold=mat('#cead6f');
 const polo=mat('#e9f0e9');
 const retain=(anchor,build)=>{
  const joint=bone(anchor);if(!joint)return;
  const group=new T.Group();actor.root.add(group);
  group.position.copy(actor.root.worldToLocal(joint.getWorldPosition(new T.Vector3())));
  const oval=(x,y,z,w,h,d,material)=>{
   const m=new T.Mesh(new T.SphereGeometry(1,24,16),material);
   m.position.set(x,y,z);m.scale.set(w,h,d);group.add(m);return m;
  };
  const seam=(points,r,material)=>{
   const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
   group.add(new T.Mesh(new T.TubeGeometry(curve,12,r,6,false),material));
  };
  build(oval,seam);joint.attach(group);
 };
 retain('Head',(oval,seam)=>{
  oval(0,.094,.012,.105,.134,.105,skin);
  oval(0,.063,.114,.021,.032,.028,skin);
  for(const side of [-1,1]){
   oval(side*.102,.084,.012,.018,.032,.015,skin);
   oval(side*.040,.105,.104,.022,.010,.009,white);
   oval(side*.040,.105,.113,.008,.009,.004,eyes);
   oval(side*.040,.105,.117,.0038,.006,.002,ink);
   seam([[side*.018,.126,.108],[side*.041,.132,.108],[side*.063,.126,.096]],.0045,hair);
   oval(side*.089,.116,-.010,.018,.047,.064,hair);
  }
  seam([[-.030,.037,.100],[0,.033,.111],[.030,.037,.100]],.0028,mat('#915e51'));
  oval(0,.166,-.019,.109,.074,.107,hair);
  oval(0,.174,.002,.117,.080,.117,suede);
  oval(0,.169,.103,.128,.012,.100,suede);
  oval(0,.249,.002,.012,.009,.012,gold);
  for(const side of [-1,1])seam([[0,.247,.008],[side*.047,.230,.057],[side*.076,.184,.087]],.0019,gold);
  oval(0,.207,.104,.017,.020,.004,white);
  seam([[-.006,.201,.109],[-.006,.216,.109],[.007,.212,.109]],.0025,suede);
 });
 retain('Spine2',(oval,seam)=>{
  for(const side of [-1,1]){
   const collar=oval(side*.049,.095,.065,.067,.014,.043,polo);
   collar.rotation.z=side*.48;
  }
  seam([[0,.09,.085],[0,.054,.107],[0,.012,.11]],.005,suede);
  for(const y of [.057,.034])oval(0,y,.111,.004,.004,.003,white);
  oval(.085,.034,.087,.014,.016,.005,gold);
 });
 for(const side of ['Left','Right'])retain(side+'Foot',(oval,seam)=>{
  oval(0,-.038,.066,.059,.044,.137,suede);
  oval(0,-.068,.070,.061,.014,.139,white);
  for(let i=0;i<3;i++)seam([[-.032,-.001-i*.004,.045+i*.022],[0,.007-i*.003,.052+i*.022],[.032,-.001-i*.004,.045+i*.022]],.003,white);
 });
 return {skin,hair,eyes,shirt:polo};
}
