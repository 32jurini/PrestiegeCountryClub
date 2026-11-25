import * as THREE from 'three';

const tiles=new Map();
export function poloTile(pattern){
 if(tiles.has(pattern))return tiles.get(pattern);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
 const ctx=canvas.getContext('2d');ctx.fillStyle=ctx.strokeStyle='white';
 function line(points,width){
  ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...points[0]);
  for(const p of points.slice(1))ctx.lineTo(...p);
  ctx.stroke();
 }
 switch(pattern){
  case 'pinstripe':ctx.fillRect(0,47,96,4);break;
  case 'breton':ctx.fillRect(0,20,96,18);ctx.fillRect(0,52,96,4);break;
  case 'twin':ctx.fillRect(0,36,96,5);ctx.fillRect(0,48,96,5);break;
  case 'windowpane':ctx.fillRect(0,45,96,5);ctx.fillRect(45,0,5,96);break;
  case 'argyle':
   line([[0,0],[48,48],[96,0]],4);line([[0,96],[48,48],[96,96]],4);
   ctx.beginPath();ctx.moveTo(48,25);ctx.lineTo(68,48);ctx.lineTo(48,71);ctx.lineTo(28,48);ctx.fill();break;
  case 'dot':
   for(const [x,y] of [[24,24],[72,72]]){ctx.beginPath();ctx.arc(x,y,6,0,2*Math.PI);ctx.fill()}break;
 }
 const map=new THREE.CanvasTexture(canvas);
 map.wrapS=map.wrapT=THREE.RepeatWrapping;
 const tile={map,swatch:'url('+canvas.toDataURL()+')'};tiles.set(pattern,tile);return tile;
}
