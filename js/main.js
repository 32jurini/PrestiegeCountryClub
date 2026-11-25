import {poloTile} from './polo-patterns.js?v=playergear1';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {lightClubs} from './club-model.js?v=wedges1';
import * as THREE from 'three';
import {GolfGame} from './game.js?v=coast1';
import {SoundEngine} from './sound.js?v=coast1';
import {OnlineRoom} from './online.js?v=friends1';
import {FriendsService,isOnline} from './friends.js?v=friends1';
import {walletKey,wallet,catalog,itemById,award,buy,wear} from './locker.js?v=playergear1';
const $=id=>document.getElementById(id);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;$('viewport').appendChild(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(54,innerWidth/innerHeight,.1,1100);const sun=new THREE.DirectionalLight(0xffe7c7,2.1);sun.position.set(-65,100,42);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-14;sun.shadow.camera.right=14;sun.shadow.camera.top=14;sun.shadow.camera.bottom=-14;sun.shadow.camera.near=.5;sun.shadow.camera.far=320;sun.shadow.normalBias=.009;sun.shadow.bias=-.00012;scene.add(sun.target);scene.add(sun);scene.add(new THREE.HemisphereLight(0xc3e8ff,0x55513e,1.25));
lightClubs(renderer,new RoomEnvironment());
const game=new GolfGame(renderer,scene,camera),sound=new SoundEngine();game.onSfx=(event,detail)=>sound.play(event,detail);let page='home',accountMode='create',activeUser=null;
const preview = document.querySelector('#golfer .preview');
function sizeCanvas() {
 const box = renderer.domElement.parentElement.getBoundingClientRect();
 if (!box.width || !box.height) return;
 camera.aspect = box.width / box.height;
 camera.updateProjectionMatrix();
 renderer.setSize(box.width, box.height);
}
new ResizeObserver(sizeCanvas).observe(preview);
const showPage=id=>{if(id!=='playing'&&page==='playing'&&onlineActive)endOnline();page=id;document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('selected',b.dataset.page===id));document.body.classList.toggle('is-playing',id==='playing');(id==='golfer'?preview:$('viewport')).appendChild(renderer.domElement);sizeCanvas();if(id==='store'||id==='locker')renderGear();if(id!=='playing'){game.enterMenu();if(id==='golfer')game.enterPreview()}};
const showError=msg=>{$('accountFeedback').textContent=msg;$('accountFeedback').classList.remove('hidden')};
const hex=bytes=>Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');
async function hashPassword(password){if(!globalThis.crypto?.subtle)throw new Error('Secure sign-in requires HTTPS. Open the published GitHub Pages website.');const bytes=new TextEncoder().encode(password);return hex(await crypto.subtle.digest('SHA-256',bytes))}
function readAccount(){try{return JSON.parse(localStorage.getItem('prestiege-account')||'null')}catch{return null}}
function enterClub(user){activeUser=user;$('accountGate').classList.add('hidden');document.body.classList.remove('gated');$('accountBtn').textContent=user.username.toUpperCase();const saved=(()=>{try{return JSON.parse(localStorage.getItem('prestiege-golfer'))||null}catch{return null}})();if(!saved){showPage('golfer');game.enterPreview()}else showPage('home')}
window.addEventListener('pcc-account-ready',event=>enterClub(event.detail));
$('accountBtn').onclick=()=>{$('accountGate').classList.remove('hidden');document.body.classList.add('gated');window.dispatchEvent(new CustomEvent('pcc-account-mode',{detail:readAccount()?'signin':'create'}))};
const lessons=[
 ['WELCOME TO PRESTIEGE','I’m Coach Timmy. Welcome to the club! I’ll show you how to set up, aim, swing and putt.','talk'],
 ['SET UP YOUR BALL','First, place your tee and ball. Watch me demonstrate the setup.','tee'],
 ['CHOOSE YOUR CLUB','Press C to walk to your bag. Click a labeled club to take it back to the ball. The driver is for long tee shots. Irons cover approach shots, wedges are for short shots, and the putter is for the green.','pointGesture'],
 ['AIM YOUR SHOT','Use A / D or the arrow keys to aim. Keep the blue tracer on your target and check the wind before you swing.','point'],
 ['WATCH A FULL SWING','Hold SPACE to build power, then release near the highlighted timing zone. Watch the golfer complete the full swing before the camera follows the ball.','drive'],
 ['CHIPPING & PUTTING','Use your wedge around the green and the putter once you reach the putting surface. I’ll demonstrate both.','chip'],
 ['YOU’RE READY','That’s the basics. Your golfer is ready. Play the hole, keep your score, and I’ll be here if you need a hand.','clap']
];let lessonIndex=0;
const renderLesson=()=>{const [title,body,action]=lessons[lessonIndex];$('coachTitle').textContent=title;$('coachText').textContent=body;$('coachProgress').textContent=`LESSON ${lessonIndex+1} / ${lessons.length}`;$('coachNext').textContent=lessonIndex===lessons.length-1?'START PLAYING →':'NEXT →';game.coachAction(action);sound.play('menu')};
const closeTutorial=()=>{$('tutorialOverlay').classList.add('hidden');try{localStorage.setItem('prestiege-v4-tutorial-done','yes')}catch{}};
const openTutorial=()=>{lessonIndex=0;$('tutorialOverlay').classList.remove('hidden');renderLesson()};
$('coachNext').onclick=()=>{if(++lessonIndex>=lessons.length)closeTutorial();else renderLesson()};$('coachSkip').onclick=closeTutorial;
const start=async(name='royal',tutorial=false)=>{showPage('playing');$('loader').classList.remove('hidden');try{await game.begin(name,tutorial);$('loader').classList.add('hidden');if(tutorial)openTutorial()}catch(e){$('loader').classList.add('hidden');$('error').textContent='Could not start round: '+e.message;$('error').classList.remove('hidden')}};
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
$('heroPlay').onclick=()=>{if(!localStorage.getItem('prestiege-v4-tutorial-done'))start('royal',true);else showPage('courses')};document.querySelectorAll('[data-course]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.course,!localStorage.getItem('prestiege-v4-tutorial-done'))));$('rangeTab').onclick=()=>start('range',false);$('exitRound').onclick=()=>showPage('courses');$('toClubhouse').onclick=()=>showPage('courses');$('nextHole').onclick=()=>game.actionNext();$('resetAim').onclick=()=>{game.aimDelta(-game.aim)};$('openBag').onclick=()=>game.openBag();
$('closeBag').onclick=()=>game.returnFromBag(game.club);
$('bagContents').addEventListener('click',event=>{
 const button=event.target.closest('[data-pick]');
 if(button)game.returnFromBag(button.dataset.pick);
});
$('playing').addEventListener('pointermove',event=>{
 if(event.target.closest('button'))return;
 if(game.bagPhase==='select')game.highlightBagClub(game.clubUnderPointer(event));
});
$('playing').addEventListener('pointerleave',()=>game.highlightBagClub(null));
$('playing').addEventListener('click',event=>{
 if(event.target.closest('button'))return;
 const club=game.clubUnderPointer(event);if(club)game.returnFromBag(club);
});
document.querySelectorAll('[data-shape]').forEach(b=>b.onclick=()=>game.setShape(b.dataset.shape));
const saved=(()=>{try{return JSON.parse(localStorage.getItem('prestiege-golfer'))||{}}catch{return {}}})();$('golferName').value=saved.name||'ROOKIE';$('golferFrame').value=saved.frame||'male';$('shirtColor').value=saved.shirt||'#e9f0e9';$('hairColor').value=saved.hair||'#36261f';$('eyeColor').value=saved.eyes||'#4c8069';$('skinColor').value=saved.skin||'#ba8c70';$('pantsColor').value=saved.pants||'#1d3535';
const palette=()=>({shirt:$('shirtColor').value,pants:$('pantsColor').value,hair:$('hairColor').value,eyes:$('eyeColor').value,skin:$('skinColor').value});
function applyGear(){
 const {equipped}=wallet(),shirt=itemById(equipped.shirt),ball=itemById(equipped.ball);
 game.ball.material.color.set(ball.color);
 game.golfer.applyAppearance(palette());
 const fabric=game.golfer.outfit?.shirt;
 if(!fabric||fabric.userData.finish===shirt.id)return;
 fabric.userData.finish=shirt.id;
 fabric.customProgramCacheKey=()=>shirt.pattern||'club-solid';
 fabric.onBeforeCompile=shader=>{
  if(!shirt.pattern)return;
  shader.uniforms.poloMask={value:poloTile(shirt.pattern).map};
  shader.vertexShader='varying vec2 poloUV;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n poloUV=vec2(position.x + 0.6*position.z,position.y)*12.0;');
  shader.fragmentShader='uniform sampler2D poloMask; varying vec2 poloUV;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float ink=texture2D(poloMask,poloUV).a;
   float lightness=dot(diffuse,vec3(.2126,.7152,.0722));
   vec3 thread=mix(vec3(.91,.89,.80),vec3(.045,.065,.06),smoothstep(.14,.45,lightness));
   diffuseColor.rgb=mix(diffuseColor.rgb,thread,ink*.78);`);
 };
 fabric.needsUpdate=true;
}
function renderGear(){
 const state=wallet();
 $('creditBalance').textContent=state.credits+' CREDITS';
 $('creditBalance').ariaLabel=state.credits+' credits. Open Store';
 for(const view of ['locker','store']){
  const list=$(view+'Items');list.replaceChildren();
  for(const slot of ['shirt','ball']){
   const heading=document.createElement('h3');heading.textContent=slot==='shirt'?'Polos':'Golf balls';list.append(heading);
   for(const item of catalog.filter(i=>i.slot===slot)){
    const owned=state.owned.includes(item.id),wearing=state.equipped[slot]===item.id;
    if(view==='locker'?!owned:!item.price)continue;
    const card=document.createElement('div'),swatch=document.createElement('i'),name=document.createElement('strong'),action=document.createElement('button');
    card.className='gear-card';swatch.className='swatch '+slot;
    swatch.style.setProperty('--gear',item.color||$('shirtColor').value);
    if(item.pattern)swatch.style.setProperty('--pattern',poloTile(item.pattern).swatch);
    name.textContent=item.name;action.className='glass';
    action.textContent=view==='locker'?(wearing?'Equipped':'Equip'):(owned?'Owned':'Buy · '+item.price+' credits');
    action.disabled=view==='locker'?wearing:owned||state.credits<item.price;
    action.setAttribute('aria-label',action.textContent+' · '+item.name);
    action.onclick=async()=>{try{
     if(view==='locker')await wear(item.id);else await buy(item.id);
     renderGear();applyGear();$(view+'Status').textContent=item.name+(view==='locker'?' equipped.':' is in your Locker.');
    }catch(error){$(view+'Status').textContent=error.message}};
    card.append(swatch,name,action);list.append(card);
   }
  }
 }
}
game.onHoleComplete=async(round,hole,shots)=>{
 const sameHole=()=>game.roundId===round&&game.index===hole&&game.modal;
 try{
  const credits=await award(round,hole,shots);
  renderGear();
  if(credits&&sameHole())$('roundDescription').append(' · +'+credits+' CREDITS');
 }catch{if(sameHole())$('roundDescription').append(' · Credits could not be saved on this browser.')}
};
window.addEventListener('storage',e=>{if(e.key===walletKey||e.key?.startsWith(walletKey+'-')){renderGear();applyGear()}});
renderGear();

async function equip(){const frame=$('golferFrame').value;$('animationStatus').textContent='LOADING GOLF ANIMATIONS…';const source=await game.prepareGolfer(frame);applyGear();$('modelSource').textContent=source.toUpperCase();const ready=['idle','drive','chip','putt','walk','run','tee','pick'].filter(name=>game.golfer.actions.has(name)).length;$('animationStatus').textContent=ready===8?`8/8 GOLF ANIMATIONS READY · ${game.golfer.actions.size}/19 CLIPS LOADED`:`${ready}/8 GOLF ANIMATIONS · BUILT-IN SWING BACKUP`;return source}
$('saveGolfer').onclick=async()=>{const golfer={name:$('golferName').value.trim()||'ROOKIE',frame:$('golferFrame').value,...palette()};localStorage.setItem('prestiege-golfer',JSON.stringify(golfer));$('loader').classList.remove('hidden');try{await equip();$('loader').classList.add('hidden');showPage('home')}catch(e){$('loader').classList.add('hidden');$('error').textContent='Golfer could not load: '+e.message;$('error').classList.remove('hidden')}};
['shirtColor','pantsColor','hairColor','eyeColor','skinColor'].forEach(id=>$(id).addEventListener('input',()=>applyGear()));$('golferFrame').addEventListener('change',async()=>{$('golferFrame').disabled=true;$('loader').classList.remove('hidden');try{await equip()}catch(e){$('error').textContent='Golfer preview could not load: '+e.message;$('error').classList.remove('hidden')}finally{$('golferFrame').disabled=false;$('loader').classList.add('hidden')}});
$('soundBtn').onclick=async()=>{const on=await sound.toggle();$('soundBtn').textContent=on?'SOUND ON':'SOUND OFF'};

const onlinePanel=$('onlinePanel'),onlineStatus=$('onlineStatus'),onlineCode=$('onlineCode'),rivalStats=$('rivalStats');
const ghost=new THREE.Mesh(new THREE.SphereGeometry(.075,16,12),new THREE.MeshStandardMaterial({color:0xffca69,emissive:0x3c2500,emissiveIntensity:.2}));
ghost.castShadow=true;ghost.visible=false;scene.add(ghost);
let onlineActive=false,remoteState=null,lastSent=0;let remoteTarget=new THREE.Vector3();
let friendsReady=false;const friends=new FriendsService(()=>renderFriends());
const room=new OnlineRoom({
 onHosted:(code,course)=>friends.host(code,course).then(()=>{onlineStatus.textContent='Hosting '+course.toUpperCase()+' — friends can now join you'}).catch(err=>onlineStatus.textContent=err.message),
 onStatus:message=>{onlineStatus.textContent=message;onlineCode.textContent=room.role==='host'&&room.room?'ROOM CODE: '+room.room:'';},
 onStart:async(course,opponent)=>{
  onlineActive=true;remoteState=null;ghost.visible=false;onlinePanel.classList.add('hidden');
  $('rivalName').textContent=opponent.toUpperCase();rivalStats.hidden=false;
  await start(course,false);
 },
 onState:state=>{
  if(!onlineActive||!Array.isArray(state.position)||state.position.length!==3||state.position.some(n=>!Number.isFinite(n)||Math.abs(n)>1e5))return;
  remoteState=state;
  const sameHole=game.started&&game.index===state.hole;
  ghost.visible=sameHole;if(sameHole){remoteTarget.set(...state.position);if(!ghost.userData.initialized){ghost.position.copy(remoteTarget);ghost.userData.initialized=true}}
  else ghost.userData.initialized=false;
  const total=(Array.isArray(state.scores)?state.scores:[]).reduce((a,b)=>a+(Number(b)||0),0);
  $('rivalScore').textContent='HOLE '+(Number(state.hole)+1)+' · '+Number(state.strokes)+' SHOTS · '+total+' FINISHED';
 },
 onDisconnect:()=>{ghost.visible=false;if(onlineActive){$('rivalScore').textContent='FRIEND DISCONNECTED';onlineActive=false}}
});
function endOnline(){onlineActive=false;remoteState=null;ghost.visible=false;ghost.userData.initialized=false;rivalStats.hidden=true;room.close();friends.unhost().catch(()=>{})}
function renderFriends(){
 const login=$('friendsLogin'),content=$('friendsContent'),status=$('friendsStatus'),list=$('friendsList'),inbox=$('friendsInbox');
 if(!friendsReady){login.hidden=false;content.hidden=true;return}
 if(!friends.profile?.username){login.hidden=false;content.hidden=true;status.textContent='Choose a unique online username for this browser.';return}
 login.hidden=true;content.hidden=false;$('friendsMe').textContent='SIGNED IN AS @'+friends.profile.username;
 inbox.replaceChildren();
 for(const request of friends.requests){
  const item=document.createElement('div');item.className='friend-row';
  const label=document.createElement('span');label.textContent='@'+request.fromName+' sent a friend request';
  const yes=document.createElement('button');yes.textContent='ACCEPT';yes.onclick=()=>friends.accept(request.id).catch(showFriendsError);
  const no=document.createElement('button');no.textContent='DECLINE';no.onclick=()=>friends.reject(request.id).catch(showFriendsError);
  item.append(label,yes,no);inbox.append(item);
 }
 if(!friends.requests.length)inbox.textContent='No pending requests';
 list.replaceChildren();
 for(const friend of friends.friends){
  const item=document.createElement('div');item.className='friend-row';
  const name=document.createElement('span');name.textContent='@'+friend.username+' · '+(isOnline(friend)?friend.hosting?'HOSTING '+friend.course?.toUpperCase():'ONLINE':'OFFLINE');
  item.append(name);
  if(friend.hosting&&isOnline(friend)){
   const join=document.createElement('button');join.textContent='JOIN GAME';
   join.onclick=()=>room.join(friend.hosting,friends.profile.username);
   item.append(join);
  }
  list.append(item);
 }
 if(!friends.friends.length)list.textContent='Your friends will appear here';
}
function showFriendsError(error){onlineStatus.textContent=error.message||String(error)}
async function openFriends(){
 onlinePanel.classList.remove('hidden');
 try{
  if(!friendsReady){onlineStatus.textContent='Connecting to online friends…';await friends.init();friendsReady=true}
  renderFriends();onlineStatus.textContent=friends.profile?.username?'Search for a username or host a round':'Choose your online username';
 }catch(error){onlineStatus.textContent=error.message;friendsReady=false}
}
$('friendsRegister').onclick=async()=>{try{await friends.register($('friendsUsername').value);renderFriends();onlineStatus.textContent='Username registered — add your first friend!'}catch(error){showFriendsError(error)}};
$('friendsAdd').onclick=async()=>{try{const name=await friends.sendRequest($('friendsSearch').value);onlineStatus.textContent='Friend request sent to @'+name}catch(error){showFriendsError(error)}};
$('onlineOpen').onclick=()=>{showPage('home');openFriends()};
$('onlineClose').onclick=()=>onlinePanel.classList.add('hidden');
$('onlineHost').onclick=()=>{if(!friends.profile?.username){onlineStatus.textContent='Register your online username first';return}room.host($('onlineCourse').value,friends.profile.username)};
$('onlineJoin').onclick=()=>{if(!friends.profile?.username){onlineStatus.textContent='Register your online username first';return}room.join($('onlineJoinCode').value,friends.profile.username)};
$('onlineCopy').onclick=()=>{if(room.room){navigator.clipboard?.writeText(room.room);onlineStatus.textContent='Room code copied — send it to your friend'}};
const sunOffset=new THREE.Vector3(-39,53,27);
function loop(){requestAnimationFrame(loop);const dt=Math.min(game.clock.getDelta(),.05);game.update(dt);if(onlineActive&&room.connected&&game.started&&performance.now()-lastSent>110){lastSent=performance.now();room.send(room.snapshot(game))}if(ghost.visible)ghost.position.lerp(remoteTarget,Math.min(1,dt*13));const dusk=game.world.current==='misty';
 if(sun.userData.dusk!==dusk){
  sun.userData.dusk=dusk;sunOffset.set(...(dusk?[-24,12,-64]:[-39,53,27]));
  sun.color.setHex(dusk?0xffbb85:0xffe7c7);sun.intensity=dusk?1.75:2.1;
 }
 sun.target.position.copy(game.position);sun.position.copy(game.position).add(sunOffset);renderer.render(scene,camera)}window.addEventListener('resize',sizeCanvas);loop();
window.dispatchEvent(new Event('pcc-game-ready'));
(async()=>{$('loader').classList.add('hidden');const account=readAccount();if(account){activeUser=account;$('accountBtn').textContent=account.username.toUpperCase()}$('accountGate').classList.add('hidden');document.body.classList.remove('gated');try{await equip()}catch(e){console.warn('Golfer preview unavailable:',e);$('modelSource').textContent='MODEL WILL LOAD WHEN ASSETS ARE AVAILABLE'}})();
