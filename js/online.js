// Peer-to-peer, private two-player rooms. PeerJS Cloud provides signaling only.
// No account verification, server-side scoring, persistent matchmaking or reconnection yet.
export class OnlineRoom {
 constructor({onStatus,onStart,onState,onDisconnect,onHosted,onParty,profile}) {
  this.onParty=onParty;this.profile=profile;
  this.onStatus=onStatus;this.onStart=onStart;this.onState=onState;this.onDisconnect=onDisconnect;this.onHosted=onHosted;
  this.peer=null;this.connection=null;this.role='';this.room='';this.connected=false;
 }
 status(value){this.onStatus?.(value)}
 async peerClass(){
  const module=await import('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/+esm');
  return module.Peer||module.default;
 }
 cleanup(){clearTimeout(this.joinTimer);this.generation=(this.generation||0)+1;const c=this.connection,p=this.peer;this.connection=null;this.peer=null;this.connected=false;this.inMatch=false;this.remoteName='';this.role='';this.room='';c?.close();p?.destroy()}
 startMatch(course=this.course){
  if(this.role!=='host'||!this.connected||!this.remoteName||this.inMatch)return;
  this.inMatch=true;this.send({type:'start',course});this.onStart?.(course,this.remoteName);
 }
 close(){const active=!!this.peer;this.cleanup();if(active)this.onDisconnect?.();this.status('Disconnected')}
 async host(course,name){
  this.cleanup();const generation=this.generation;this.role='host';this.course=course;this.name=name;
  this.room=Math.random().toString(36).slice(2,8).toUpperCase();
  this.status('Connecting to matchmaking server…');
  try{
   const Peer=await this.peerClass();if(generation!==this.generation)return;const peer=new Peer('pcc-room-'+this.room.toLowerCase(),{debug:0});this.peer=peer;
   peer.on('open',()=>{this.status('Hosting — friends can join from your profile');this.onHosted?.(this.room,this.course)});
   peer.on('connection',connection=>{
    if(this.connection){connection.on('open',()=>connection.send({type:'error',message:'Room full'}));connection.on('open',()=>connection.close());return}
    this.attach(connection);
   });
   peer.on('error',error=>this.status(error.type==='unavailable-id'?'Code collision — try hosting again':'Connection failed: '+error.message));
   peer.on('disconnected',()=>this.status('Signaling lost — current match may continue'));
  }catch(error){this.status('Cannot start multiplayer: '+error.message);this.cleanup()}
 }
 async join(room,name){
  this.cleanup();const generation=this.generation;this.role='guest';this.name=name;this.room=room.trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
  if(this.room.length!==6){this.status('Enter a six-character room code');return}
  this.status('Joining '+this.room+'…');
  this.joinTimer=setTimeout(()=>{
   if(generation!==this.generation||this.connected)return;
   this.cleanup();this.status('Could not reach the host. Check that their clubhouse is open, then try again.');
  },30000);
  try{
   const Peer=await this.peerClass();if(generation!==this.generation)return;const peer=new Peer(undefined,{debug:0});this.peer=peer;
   peer.on('open',()=>this.attach(peer.connect('pcc-room-'+this.room.toLowerCase(),{reliable:true})));
   peer.on('error',error=>this.status('Connection failed: '+error.message));
  }catch(error){this.status('Cannot join: '+error.message);this.cleanup()}
 }
 attach(connection){
  this.connection=connection;
  connection.on('open',()=>{
   if(connection!==this.connection)return;
   clearTimeout(this.joinTimer);this.connected=true;this.status('Connected to opponent');
   if(this.role==='guest')this.send({type:'hello',profile:this.profile()});
  });
  connection.on('data',data=>{
   if(!data||typeof data!=='object')return;
   if(connection!==this.connection)return;
   if((data.type==='hello'&&this.role==='host')||(data.type==='party'&&this.role==='guest')||data.type==='appearance'){
    if(!data.profile||typeof data.profile.name!=='string')return;
    this.remoteName=data.profile.name.slice(0,22)||'Friend';
    if(data.type==='hello')this.send({type:'party',profile:this.profile()});
    this.onParty?.(data.profile,data.type!=='appearance');
   } else if(data.type==='start'&&this.role==='guest'&&!this.inMatch&&['royal','ocean','summit','misty'].includes(data.course)){
    this.inMatch=true;this.onStart?.(data.course,this.remoteName);
   } else if(data.type==='state'&&this.connected)this.onState?.(data);
   else if(data.type==='error')this.status(String(data.message||'Room unavailable'));
  });
  connection.on('close',()=>{if(connection!==this.connection)return;this.connection=null;this.remoteName='';this.inMatch=false;this.connected=false;this.status('Opponent disconnected');this.onDisconnect?.()});
  connection.on('error',error=>this.status('Peer connection: '+error.message));
 }
 send(data){if(this.connection?.open){try{this.connection.send(data)}catch(error){this.status('Unable to send: '+error.message)}}}
 snapshot(game){
  return {type:'state',hole:game.index,position:[game.position.x,game.position.y,game.position.z],strokes:game.shots,scores:game.scores.slice(0,18),inFlight:game.swinging,finished:game.modal};
 }
}
