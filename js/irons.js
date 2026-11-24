export const IRONS=Object.freeze({
iron3:{name:'3 IRON',number:3,degrees:19,launch:14,carry:205,spin:2250,stop:.73},
iron4:{name:'4 IRON',number:4,degrees:22,launch:16,carry:194,spin:2850,stop:.68},
iron5:{name:'5 IRON',number:5,degrees:25,launch:18,carry:182,spin:3450,stop:.62},
iron6:{name:'6 IRON',number:6,degrees:28,launch:21,carry:169,spin:4200,stop:.55},
iron7:{name:'7 IRON',number:7,degrees:32,launch:24,carry:156,spin:5100,stop:.48},
iron8:{name:'8 IRON',number:8,degrees:36,launch:27,carry:143,spin:6100,stop:.40},
iron9:{name:'9 IRON',number:9,degrees:41,launch:30,carry:129,spin:7300,stop:.32}
});
export const IRON_KEYS=Object.keys(IRONS);
export function ironPhysics(spec){const angle=spec.launch*Math.PI/180;const speed=Math.sqrt((spec.carry/1.75)*9.81/Math.sin(2*angle));return {...spec,speed,loft:Math.sin(angle),range:spec.carry,isIron:true}}
export const CLUB_IRONS=Object.fromEntries(IRON_KEYS.map(key=>[key,ironPhysics(IRONS[key])]));
export function cycleIron(current,delta){const i=IRON_KEYS.indexOf(current);return IRON_KEYS[Math.max(0,Math.min(6,(i<0?4:i)+delta))]}
export function curveAcceleration(shape,velocity){const speed=Math.hypot(velocity.x,velocity.z);if(!shape||speed<.001)return {x:0,z:0};const magnitude=shape*Math.min(1.65,speed*.035);return {x:-velocity.z/speed*magnitude,z:velocity.x/speed*magnitude}}
