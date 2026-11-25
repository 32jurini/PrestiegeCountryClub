import * as T from 'three';

const finish=(color,metalness,roughness)=>new T.MeshStandardMaterial({color,metalness,roughness});
const nickel=finish(0xc5cdd1,.57,.28),face=finish(0xadb9bf,.43,.38),carbon=finish(0x22313b,.42,.25);
const sole=finish(0x545e68,.58,.34),insert=finish(0x34454d,.36,.4),paint=finish(0xe8ebdf,.12,.42);
const templates=new Map();
export function lightClubs(renderer,environment){
 const pmrem=new T.PMREMGenerator(renderer),map=pmrem.fromScene(environment,.045);
 for(const material of [nickel,face,carbon,sole,insert,paint]){
  material.envMap=map.texture;material.envMapIntensity=.75;material.needsUpdate=true;
 }
 environment.dispose();pmrem.dispose();
}
function roundedOutline(points){
 const path=new T.Shape(),last=points.at(-1),first=points[0];
 path.moveTo((last[0]+first[0])/2,(last[1]+first[1])/2);
 for(let i=0;i<points.length;i++){
  const [x,y]=points[i],next=points[(i+1)%points.length];
  path.quadraticCurveTo(x,y,(x+next[0])/2,(y+next[1])/2);
 }
 return path;
}
function plate(parent,outline,depth,material,z=0,bevel=.0014){
 const path=roundedOutline(outline);
 const geometry=new T.ExtrudeGeometry(path,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,steps:1});
 const mesh=new T.Mesh(geometry,material);mesh.position.z=z;parent.add(mesh);return mesh;
}
function pin(parent,a,b,r1,r2,material){
 const start=new T.Vector3(...a),end=new T.Vector3(...b),line=end.clone().sub(start);
 const mesh=new T.Mesh(new T.CylinderGeometry(r2,r1,line.length(),12),material);
 mesh.position.copy(start).lerp(end,.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),line.normalize());parent.add(mesh);
}
function stripes(parent,rows,x0,x1,y0,dy,z,material){
 for(let i=0;i<rows;i++){
  const m=new T.Mesh(new T.BoxGeometry(x1-x0,.00085,.00055),material);
  m.position.set((x0+x1)/2,y0+dy*i,z);parent.add(m);
 }
}
// Cut each stroke through a satin-metal badge. The dark cavity shows inside the numeral.
function ironStamp(blade,number){
 const badge=roundedOutline([[-.008,-.010],[.008,-.010],[.008,.010],[-.008,.010]]);
 const segments=[
  [0,-.007,true],[.004,-.0035,false],[.004,.0035,false],[0,.007,true],
  [-.004,.0035,false],[-.004,-.0035,false],[0,0,true]
 ];
 const digits={3:'01623',4:'5612',5:'05623',6:'056423',7:'012',8:'0123456',9:'015623'};
 for(const segment of digits[number]){
  const [x,y,horizontal]=segments[segment];
  const dx=horizontal?.0034:.00085,dy=horizontal?.00085:.00265;
  const cut=new T.Path();cut.moveTo(x-dx,y-dy);cut.lineTo(x+dx,y-dy);
  cut.lineTo(x+dx,y+dy);cut.lineTo(x-dx,y+dy);cut.closePath();badge.holes.push(cut);
 }
 const relief=new T.ExtrudeGeometry(badge,{depth:.0007,bevelEnabled:false});
 const stamp=new T.Mesh(relief,nickel);stamp.name='Engraved '+number+' iron';
 stamp.position.set(.024,.001,-.0163);blade.add(stamp);
}
export function clubModel(id){
 if(templates.has(id))return templates.get(id).clone();
 const head=new T.Group(),wood=['driver','wood','hybrid'].includes(id),putt=id==='putter';
 if(wood){
  const corners=[[-.052,-.014],[-.035,-.024],[.021,-.027],[.052,-.014],[.060,-.002],[.059,.011],[.046,.022],[.006,.029],[-.033,.025],[-.054,.011]];
  const profile=roundedOutline(corners).getSpacedPoints(54).slice(0,-1).map(p=>[p.x,p.y]);
  // A broad, flat titanium face closes a swept-back, tapered crown.
  const rings=[[1,0],[1.05,-.016],[1,-.039],[.78,-.067],[.38,-.084],[.05,-.09]];
  const verts=[],idx=[];
  for(const [scale,z] of rings){
   // The crown broadens behind the toe and tapers away from the shaft at the heel.
   const toeOffset=.013*(z/.09)**2;
   for(const [x,y] of profile)verts.push(x*scale-toeOffset,y*scale+.005*Math.sin(-z*32),z);
  }
  for(let r=0;r<rings.length-1;r++)for(let i=0;i<profile.length;i++){
   const a=r*profile.length+i,b=r*profile.length+(i+1)%profile.length;
   idx.push(a,b,a+profile.length,b,b+profile.length,a+profile.length);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();
  carbon.side=T.DoubleSide;head.add(new T.Mesh(g,carbon));
  plate(head,profile,.002,face);stripes(head,5,-.037,.041,-.014,.006,.004,sole);
  const size=id==='driver'?1:id==='wood'?.84:.72;head.scale.set(size,id==='driver'?1:size*.88,size);
 }else if(putt){
  plate(head,[[-.057,-.014],[.056,-.014],[.057,.010],[.049,.016],[-.051,.016]],.025,nickel,-.023);
  for(const x of [-.042,.042]){
   const rail=new T.Mesh(new T.BoxGeometry(.024,.025,.056),sole);
   rail.position.set(x,-.001,-.042);head.add(rail);
  }
  plate(head,[[-.04,-.010],[.04,-.010],[.04,.010],[-.04,.010]],.0015,insert,.004);
  const mark=new T.Mesh(new T.BoxGeometry(.003,.001,.022),paint);mark.position.set(0,.018,-.012);head.add(mark);
 }else{
  const wedge=!id.startsWith('iron'),n=Number(id.slice(4))||7;
  const toe=wedge?.039:.023+(n-3)*.0014;
  const outline=[[-.051,-.014],[-.041,-.021],[.035,-.020],[.053,-.014],[.058,.001],[.055,toe-.005],[.043,toe],[.018,toe-.002],[-.039,.012],[-.051,.005]];
  const blade=new T.Group();head.add(blade);blade.rotation.x=-(wedge?.65:.23+(n-3)*.045);
  plate(blade,outline,wedge?.014:.010,nickel,-.010);
  stripes(blade,6,-.030,.042,-.014,.0044,wedge?.006:.002,sole);
  plate(blade,[[-.035,-.012],[.041,-.012],[.045,.011],[.028,.014],[-.03,.003]],.002,insert,-.0135);
  plate(blade,[[-.038,-.016],[.046,-.015],[.044,-.008],[.019,-.005],[-.036,-.010]],.004,nickel,-.019);
  if(!wedge)ironStamp(blade,n);
 }
 const group=new T.Group();group.add(head);
 group.traverse(o=>{if(o.isMesh)o.castShadow=true});templates.set(id,group);return group.clone();
}
// Socket centers lie inside the heel casting so the shaft enters the head directly.
export function heelSocket(id){
 const size=id==='wood'?.84:id==='hybrid'?.72:1;
 if(['driver','wood','hybrid'].includes(id))return new T.Vector3(.055*size,.006*(id==='driver'?1:size*.88),-.010*size);
 return id==='putter'?new T.Vector3(-.041,.002,-.013):new T.Vector3(-.039,0,-.004);
}
export function makeShaft(){
 const shaft=new T.Group();
 pin(shaft,[0,0,0],[0,-1,0],.008,.0058,nickel);
 pin(shaft,[0,.027,0],[0,-.215,0],.015,.011,insert);
 for(let i=0;i<7;i++){
  const k=i/7,y=.012-.20*k;
  pin(shaft,[0,y,0],[0,y-.002,0],.0145-.003*k,.0145-.003*k,sole);
 }
 return shaft;
}
