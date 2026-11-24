import {contactTime} from './shot-pose.js';
import * as THREE from 'three';
import {World,COURSES} from './world.js?v=club5';
import {Golfer} from './actors.js?v=club5';
const clamp=THREE.MathUtils.clamp,$=id=>document.getElementById(id);
const BALL_RADIUS = .095;
const CLUBS={driver:{name:'DRIVER',speed:43,loft:.395,range:255},iron:{name:'7 IRON',speed:28,loft:.49,range:160},wedge:{name:'WEDGE',speed:21,loft:.78,range:75},putter:{name:'PUTTER',speed:11,loft:.015,range:35}};
export class GolfGame{
 constructor(renderer,scene,camera){this.renderer=renderer;this.scene=scene;this.camera=camera;this.world=new World(scene);this.golfer=new Golfer(scene);this.ball=this.makeBall();this.contactShadow=this.makeContactShadow();this.clock=new THREE.Clock();this.position=new THREE.Vector3();this.vel=new THREE.Vector3();this.swinging=false;this.swingTimer=0;this.ballLaunchDelay=.9;this.charge=0;this.charging=false;this.shots=0;this.scores=[];this.course='royal';this.index=0;this.started=false;this.aim=0;this.club='driver';this.wind=0;this.modal=false;this.cameraTarget=new THREE.Vector3();this.dragging=false;this.dragStart=0;this.orbit=0;this.coachActor=null;this.onSfx=()=>{};this.shotPreview=this.createShotPreview();this.listeners();this.enterMenu()}
 makeContactShadow() {
  const material=new THREE.ShaderMaterial({
   transparent:true,depthWrite:false,
   uniforms:{strength:{value:.3}},
   vertexShader:'varying vec2 coord;void main(){coord=uv-.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'varying vec2 coord;uniform float strength;void main(){gl_FragColor=vec4(.035,.047,.03,strength*(1.-smoothstep(.03,.49,length(coord))));}'
  });
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.52,.52),material);
  shadow.rotation.x=-Math.PI/2;this.scene.add(shadow);return shadow;
 }
 updateContactShadow() {
  const shadow=this.contactShadow;if(!shadow)return;
  const floor=this.world.ground(this.position.x,this.position.z);
  const lift=Math.max(0,this.position.y-floor-BALL_RADIUS);
  shadow.visible=this.started&&this.ball.visible&&lift<1.6;
  if(!shadow.visible)return;
  shadow.position.set(this.position.x,floor+.014,this.position.z);
  shadow.scale.setScalar(1+lift*.65);shadow.material.uniforms.strength.value=.4*(1-lift/1.6);
 }
 makeBall(){const b=new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS,24,20),new THREE.MeshStandardMaterial({color:0xf9f9f3,roughness:.48}));b.castShadow=true;this.scene.add(b);return b}
 prepareGolfer(frame) {
  if (this.equippedFrame === frame && this.golferReady) return this.golferReady;
  this.equippedFrame = frame;
  this.golferReady = (async () => {
   const source = await this.golfer.load(frame);
   if (this.equippedFrame === frame) await this.golfer.loadAllAnimations();
   return source;
  })().catch(error => { if(this.equippedFrame === frame) this.golferReady = null; throw error; });
  return this.golferReady;
 }
 async animations(){return this.golfer.loadAllAnimations()}
 async loadCoach(){if(this.coachActor){this.coachActor.setVisible(true);this.positionCoach();return this.coachActor}this.coachActor=new Golfer(this.scene);try{await this.coachActor.loadLocal('./assets/characters/Timmy.fbx')}catch(e){console.warn('Timmy model unavailable, using backup:',e);await this.coachActor.loadLocal('./assets/characters/Y Bot.fbx')}this.positionCoach();this.coachActor.animate('wave',true);this.coachAnimationsReady=await this.coachActor.loadAllAnimations(['idle','talk','point','pointGesture','wave','thumb','clap','cheer','drive','chip','putt','tee','pick']).catch(e=>{console.warn('Coach animations unavailable:',e);return {}});return this.coachActor}
 coachAction(action){if(!this.coachActor)return;const oneShot=['drive','chip','putt','tee','pick','clap','cheer','thumb','wave','angry','dance','footwork','freeze'];if(contactTime[action]){const spot=this.world.teePosition.clone();spot.x+=3;spot.y=this.world.ground(spot.x,spot.z)+.10;this.coachActor.alignShot(action,spot,this.shotDirection(),spot.y-.10)}else{this.positionCoach();this.coachActor.club.visible=false}if(oneShot.includes(action))this.coachActor.shot(action);else this.coachActor.animate(action,true)}
 positionCoach(){if(!this.coachActor)return;const p=this.world.teePosition;this.coachActor.root.position.set(p.x+4,this.world.ground(p.x+4,p.z-1),p.z-1);this.coachActor.root.rotation.y=Math.PI-.25;}
 createShotPreview(){const group=new THREE.Group();this.scene.add(group);const mat=new THREE.LineBasicMaterial({color:0x35d4ff,transparent:true,opacity:.9,depthTest:false});const line=new THREE.Line(new THREE.BufferGeometry(),mat);line.renderOrder=50;group.add(line);const marker=new THREE.Mesh(new THREE.RingGeometry(.8,1.07,48),new THREE.MeshBasicMaterial({color:0x50e9ff,transparent:true,opacity:.9,side:THREE.DoubleSide,depthTest:false}));marker.rotation.x=-Math.PI/2;marker.renderOrder=50;group.add(marker);group.visible=false;return{group,line,marker}}
 launchVelocity(power) {
  const club = CLUBS[this.club], lie = this.world.lie(this.position.x, this.position.z);
  const surface = lie === 'BUNKER' ? .68 : lie === 'ROUGH' ? .84 : 1;
  const speed = club.speed * Math.pow(power, .8) * surface;
  const velocity = this.shotDirection().multiplyScalar(speed * Math.sqrt(1 - club.loft ** 2));
  if (this.club === 'putter') velocity.multiplyScalar(.8);
  velocity.y = this.club === 'putter' ? 1.2 : speed * club.loft;
  return velocity;
 }
 advanceFlight(position, velocity, dt, airborne) {
  const driving = this.club === 'driver' && airborne;
  if (driving) {
   const drag = Math.exp(-.145 * dt);
   velocity.x *= drag;
   velocity.z *= drag;
  }
  if (airborne) velocity.x += this.wind * .18 * dt;
  velocity.y -= (driving ? 6.4 : 9.81) * dt;
  position.addScaledVector(velocity, dt);
 }
 updateShotPreview() {
  const {group, line, marker} = this.shotPreview;
  group.visible = this.started && !this.swinging && !this.modal;
  if (!group.visible) return;
  const power = this.charging ? clamp(this.charge,.11,1) : 1;
  const velocity = this.launchVelocity(power), point = this.position.clone();
  const points = [point.clone()];
  for (let step = 0; step < 960; step++) {
   this.advanceFlight(point, velocity, 1/120, true);
   const ground = this.world.ground(point.x,point.z) + BALL_RADIUS;
   if (point.y <= ground) {point.y = ground; break}
   if (step % 12 === 0) points.push(point.clone());
  }
  points.push(point.clone());
  line.geometry.dispose();
  line.geometry = new THREE.BufferGeometry().setFromPoints(points);
  marker.position.copy(point);
  marker.position.y += .07;
  const carry = Math.round(Math.hypot(point.x-this.position.x,point.z-this.position.z)*1.75);
  $('shotPreviewText').textContent = CLUBS[this.club].name + ' · ' + carry + ' YDS CARRY · ' + Math.round(this.aim) + '° AIM';
 }
 enterMenu(){this.started=false;this.previewMode=false;this.shotPreview.group.visible=false;this.world.create('royal',0);this.ball.visible=false;this.golfer.setVisible(false);this.coachActor?.setVisible(false);this.camera.position.set(39,37,110);this.camera.lookAt(-4,3,-45)}
 enterPreview(){this.previewMode=true;this.golfer.setVisible(true);this.golfer.root.position.set(0,this.world.ground(0,67),67);this.golfer.root.rotation.set(0,Math.PI,0);this.golfer.animate('idle',true)}
 async begin(course='royal',tutorial=false){await this.golferReady;this.tutorial=tutorial;this.course=course;this.scores=[];if(tutorial)await this.loadCoach();this.startHole(0);if(tutorial){this.coachActor?.setVisible(true);this.positionCoach()}}
 resetBallToTee() {
  this.position.copy(this.world.teePosition);
  this.position.y = this.world.ground(this.position.x, this.position.z) + BALL_RADIUS + .025;
  this.ball.position.copy(this.position);
 }
 startHole(index){this.index=index;this.world.create(this.course,index);const hole=this.world.hole;this.ball.visible=true;this.resetBallToTee();this.vel.set(0,0,0);this.swinging=false;this.charging=false;this.swingTimer=0;this.charge=0;this.shots=0;this.aim=0;this.club='driver';this.wind=(Math.random()-.5)*COURSES[this.course].wind*.5;this.started=true;this.modal=false;this.golfer.setVisible(true);this.placeGolfer();this.golfer.setClub('driver');this.golfer.onShotEnd=()=>{if(this.started&&!this.swinging&&!this.modal)this.placeGolfer()};this.placeGolfer('tee');this.golfer.shot('tee');this.orbit=0;this.moveCamera(0,true);if(this.coachActor){this.coachActor.setVisible(!!this.tutorial);this.positionCoach()}$('roundModal').classList.add('hidden');$('courseLabel').textContent=COURSES[this.course].name;$('holeLabel').textContent=`HOLE ${String(index+1).padStart(2,'0')} · ${hole.name.toUpperCase()}`;$('parLabel').textContent=hole.par;this.notify(this.tutorial&&index===0?'COACH TIMMY: LET’S SET UP YOUR FIRST SHOT':hole.hint.toUpperCase());this.refresh()}
 shotName(){return this.club==='putter'?'putt':this.club==='wedge'?'chip':'drive'}
 shotDirection(){
  const pin=this.world.holePosition.clone().sub(this.position);
  const angle=Math.atan2(pin.x,-pin.z)+this.aim*Math.PI/180;
  return new THREE.Vector3(Math.sin(angle),0,-Math.cos(angle));
 }
 placeGolfer(name=this.shotName()){
  this.golfer.alignShot(name,this.position,this.shotDirection(),this.position.y-.10);
  if(name!=='tee')this.golfer.address(name);
 }
 notify(t){$('banner').textContent=t}
 chooseClub(c){if(!CLUBS[c]||this.swinging||this.modal)return;this.club=c;this.golfer.setClub(c);this.placeGolfer();this.refresh()}
 aimDelta(d){if(this.swinging||this.modal)return;this.aim=clamp(this.aim+d,-65,65);this.placeGolfer();this.refresh()}
 refresh(){const c=CLUBS[this.club];$('clubLabel').textContent=c.name;$('windLabel').textContent=`${this.wind>0?'↗':'↖'} ${Math.abs(this.wind*2.2).toFixed(0)} MPH`;$('strokeLabel').textContent=this.shots+1;$('scoreLabel').textContent=this.shots===0?'E':(this.shots-this.world.hole.par)>0?'+'+(this.shots-this.world.hole.par):String(this.shots-this.world.hole.par);$('aimLabel').textContent=`${Math.round(this.aim)}°`;$('lieLabel').textContent=this.world.lie(this.position.x,this.position.z);$('distanceLabel').textContent=`${Math.round(this.position.distanceTo(this.world.holePosition)*1.75)} YDS TO PIN`;$('powerLabel').textContent=`${Math.round(this.charge*100)}%`;$('meterBar').style.width=`${this.charge*100}%`;document.querySelectorAll('[data-club]').forEach(b=>b.classList.toggle('active',b.dataset.club===this.club));this.updateShotPreview()}
 startCharge(){if(!this.started||this.swinging||this.modal||this.charging)return;this.placeGolfer();this.charging=true;this.orbit=0;this.moveCamera(0,true);this.charge=0;this.notify('HOLD SPACE FOR POWER · RELEASE TO SWING')}
 releaseShot(){if(!this.charging||this.swinging||this.modal)return;this.charging=false;const p=clamp(this.charge,.11,1);this.shots++;this.swinging=true;this.swingTimer=0;this.shotPreview.group.visible=false;this.onSfx('swing');this.cameraShotLine=this.shotDirection();this.shotOrigin=this.position.clone();this.carryYards=null;this.vel.copy(this.launchVelocity(p));this.ballLaunchDelay=contactTime[this.shotName()];this.golfer.shot(this.shotName());this.notify(p>.74&&p<.88?'PURE STRIKE':'SHOT IN PLAY');this.refresh()}
 update(dt){dt=Math.min(dt,.04);this.golfer.update(dt);this.coachActor?.update(dt);if(this.charging){this.charge=Math.min(1,this.charge+dt*.8);this.refresh()}if(this.started){if(this.swinging){this.swingTimer+=dt;const flightTime=Math.min(dt,this.swingTimer-this.ballLaunchDelay);for(let left=flightTime;left>1e-8&&this.swinging;left-=1/120)this.stepBall(Math.min(left,1/120))}this.moveCamera(dt)}else this.menuCamera(dt);this.updateContactShadow()}
 stepBall(dt){const airborne=this.carryYards===null||this.position.y>this.world.ground(this.position.x,this.position.z)+.11;this.advanceFlight(this.position,this.vel,dt,airborne);const g=this.world.ground(this.position.x,this.position.z)+BALL_RADIUS,lie=this.world.lie(this.position.x,this.position.z);if(lie==='WATER'&&this.position.y<=g+.015){this.shots++;this.position.copy(this.shotOrigin);this.vel.set(0,0,0);this.swinging=false;this.onSfx('hazard');this.notify('WATER · +1 PENALTY · REPLAY FROM LAST SPOT');this.ball.position.copy(this.position);this.placeGolfer();this.refresh();return}if(this.position.y<=g){this.position.y=g;if(this.carryYards===null)this.carryYards=this.travelYards();if(Math.abs(this.vel.y)>1.7&&this.club!=='putter'){this.onSfx('land');this.vel.y=Math.abs(this.vel.y)*.24;const retention=this.club==='driver'?.64:.75;this.vel.x*=retention;this.vel.z*=retention}else{this.vel.y=0;const friction=lie==='GREEN'?1.9:lie==='FAIRWAY'?2.8:lie==='BUNKER'?7.5:5.5,drag=Math.exp(-friction*dt);this.vel.x*=drag;this.vel.z*=drag}}this.ball.position.copy(this.position);this.ball.rotation.x+=this.vel.z*dt*1.6;this.ball.rotation.z+=this.vel.x*dt*1.6;const dist=Math.hypot(this.position.x-this.world.holePosition.x,this.position.z-this.world.holePosition.z);if(dist<.38&&this.position.y<g+.4&&this.vel.length()<9){this.finishHole();return}if(this.vel.length()<.13&&Math.abs(this.position.y-g)<.015){this.vel.set(0,0,0);this.swinging=false;this.position.y=g;this.onSfx('land');this.placeGolfer();this.refresh();this.notify(lie==='BUNKER'?'SAND TRAP · PLAY IT WHERE IT LIES':lie==='GREEN'?'ON THE GREEN · SWITCH TO PUTTER':`BALL AT REST · ${lie}`);if(this.club==='driver')this.notify(this.carryYards+' YDS CARRY · '+this.travelYards()+' YDS TOTAL · '+lie);if(lie==='GREEN'&&this.club!=='putter')this.chooseClub('putter')}}
 travelYards(){return Math.round(Math.hypot(this.position.x-this.shotOrigin.x,this.position.z-this.shotOrigin.z)*1.75)}
 moveCamera(dt, snap = false) {
  const tracking = this.swinging && this.swingTimer >= this.ballLaunchDelay;
  const desired = this.cameraTarget.clone();
  if (tracking) {
   // Ease the camera body, but keep the lens pointed exactly at the ball.
   desired.copy(this.position).addScaledVector(this.cameraShotLine, -4.5);
   desired.y += 1.15;
   desired.y = Math.max(desired.y, this.world.ground(desired.x, desired.z) + .5);
   this.cameraTarget.copy(this.ball.position);
  } else {
   const line = this.shotDirection();
   const shoulder = new THREE.Vector3(-line.z, 0, line.x);
   const offset = line.clone().multiplyScalar(-3.4).addScaledVector(shoulder, .55);
   if (!this.swinging && !this.charging) offset.applyAxisAngle(new THREE.Vector3(0,1,0), this.orbit);
   desired.copy(this.golfer.root.position).add(offset);
   desired.y = this.world.ground(desired.x, desired.z) + 1.55;
   this.cameraTarget.copy(this.golfer.root.position).lerp(this.position, .5);
   this.cameraTarget.y += .95;
  }
  this.camera.position.lerp(desired, snap ? 1 : 1 - Math.exp(-dt * 8));
  this.camera.lookAt(this.cameraTarget);
 }
 menuCamera(dt){if(this.previewMode){const target=this.golfer.root.position.clone().add(new THREE.Vector3(0,1,0)),desired=target.clone().add(new THREE.Vector3(.25,.15,2.7));this.camera.position.lerp(desired,Math.min(1,dt*4));this.camera.lookAt(target);this.golfer.root.rotation.y=Math.sin(performance.now()*.00025)*.24;return}const t=performance.now()*.0001,desired=new THREE.Vector3(36+Math.sin(t)*16,30,-5+Math.cos(t)*35);this.camera.position.lerp(desired,dt*.4);this.camera.lookAt(this.world.holePosition.clone().lerp(this.world.teePosition,.42).add(new THREE.Vector3(0,3,0)))}
 finishHole(){this.onSfx('cup');this.shotPreview.group.visible=false;this.swinging=false;this.charging=false;this.modal=true;this.scores.push(this.shots);const par=this.world.hole.par,d=this.shots-par;let title=d===-3?'ALBATROSS':d===-2?'EAGLE':d===-1?'BIRDIE':d===0?'PAR':d===1?'BOGEY':d===2?'DOUBLE BOGEY':`${d>0?'+':''}${d}`;if(this.shots===1)title='HOLE IN ONE';$('roundEyebrow').textContent='HOLE COMPLETE';$('roundTitle').textContent=title;$('roundDescription').textContent=`${this.shots} STROKES · PAR ${par} · ${COURSES[this.course].name}`;$('scorecard').textContent=this.scores.map((s,i)=>`H${i+1} ${s}`).join(' • ');$('nextHole').textContent=this.index===2?'VIEW FINAL SCORE →':'NEXT HOLE →';$('roundModal').classList.remove('hidden');if(d<0)this.golfer.shot('cheer')}
 next(){if(this.index<2){this.startHole(this.index+1);return}const total=this.scores.reduce((a,b)=>a+b,0),par=COURSES[this.course].holes.reduce((a,b)=>a+b.par,0),diff=total-par;$('roundEyebrow').textContent='ROUND COMPLETE';$('roundTitle').textContent=diff===0?'EVEN PAR':diff>0?`+${diff}`:String(diff);$('roundDescription').textContent=`${total} TOTAL STROKES · ${COURSES[this.course].name}`;$('scorecard').textContent=this.scores.map((s,i)=>`HOLE ${i+1}: ${s}`).join(' / ');$('nextHole').textContent='PLAY AGAIN ↻';this.index=3;const key='prestiege-records';try{const records=JSON.parse(localStorage.getItem(key)||'[]');records.push({course:this.course,total,par,date:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(records.slice(-50)))}catch{}}
 actionNext(){if(this.index===3){this.begin(this.course);return}this.next()}
 listeners(){window.addEventListener('keydown',e=>{if(!this.started||this.modal||e.target.matches('input,select'))return;if(['Space','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Space'&&!e.repeat)this.startCharge();if(e.code==='ArrowLeft'||e.code==='KeyA')this.aimDelta(-2);if(e.code==='ArrowRight'||e.code==='KeyD')this.aimDelta(2);if(/^Digit[1-4]$/.test(e.code))this.chooseClub(['driver','iron','wedge','putter'][Number(e.code.slice(-1))-1])});window.addEventListener('keyup',e=>{if(e.code==='Space')this.releaseShot()});window.addEventListener('blur',()=>{if(this.charging)this.releaseShot()});window.addEventListener('pointerdown',e=>{if(e.target.closest('.game-hud,nav,.modal,button,.account-gate'))return;this.dragging=true;this.dragStart=e.clientX});window.addEventListener('pointermove',e=>{if(this.dragging&&!this.swinging&&!this.charging)this.orbit+=(e.clientX-this.dragStart)*.003;this.dragStart=e.clientX});window.addEventListener('pointerup',()=>this.dragging=false)}
}
