// Original synthesized sound effects; no audio files or music licenses required.
export class SoundEngine {
 constructor(){this.ctx=null;this.enabled=false;}
 async toggle(){if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();await this.ctx.resume();this.enabled=!this.enabled;if(this.enabled)this.play('welcome');return this.enabled;}
 tone(freq,duration=.16,type='sine',gain=.055,offset=0){if(!this.enabled||!this.ctx)return;const c=this.ctx,osc=c.createOscillator(),vol=c.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,c.currentTime+offset);vol.gain.setValueAtTime(.0001,c.currentTime+offset);vol.gain.exponentialRampToValueAtTime(gain,c.currentTime+offset+.015);vol.gain.exponentialRampToValueAtTime(.0001,c.currentTime+offset+duration);osc.connect(vol).connect(c.destination);osc.start(c.currentTime+offset);osc.stop(c.currentTime+offset+duration+.03)}
 // Model a short contact transient, the body of the head and its decaying resonances.
 strike(club,power){
  const profiles={driver:[960,2380,4310,.155],wood:[810,1840,3280,.095],hybrid:[640,1490,2520,.065],putter:[390,1020,1840,.036]};
  const [low,mid,high,decay]=profiles[club]||[735,2150,3810,.052];
  const c=this.ctx,rate=c.sampleRate,buffer=c.createBuffer(1,Math.ceil(rate*decay*3),rate);
  const data=buffer.getChannelData(0),variation=.96+Math.random()*.08;
  let previous=0;
  for(let i=0;i<data.length;i++){
   const t=i/rate,noise=Math.random()*2-1;
   const attack=(noise-previous)*.28*Math.exp(-t/.003);
   const ring=(.27*Math.sin(6.283*low*variation*t)*Math.exp(-t/.015)
    +.19*Math.sin(6.283*mid*variation*t)*Math.exp(-t/decay)
    +.12*Math.sin(6.283*high*variation*t)*Math.exp(-t/(decay*.38)));
   data[i]=(attack+ring)*(.24+.65*power)*Math.min(1,t/.0005);previous=noise;
  }
  this.sample(buffer);
 }
 sample(buffer){const source=this.ctx.createBufferSource();source.buffer=buffer;source.connect(this.ctx.destination);source.start()}
 splash(speed){
  const c=this.ctx,rate=c.sampleRate,buffer=c.createBuffer(1,Math.floor(rate*.52),rate);
  const data=buffer.getChannelData(0);let smooth=0;
  for(let i=0;i<data.length;i++){
   const t=i/rate;smooth+=((Math.random()*2-1)-smooth)*(.12+.28*Math.exp(-t/.15));
   data[i]=(.46*smooth*Math.exp(-t/.14)+.2*Math.sin(6.283*(180*t-100*t*t))*Math.exp(-t/.046))*Math.min(1,t/.005)*Math.min(1,.35+speed/35);
  }this.sample(buffer);
 }
 play(event,detail={}){if(!this.enabled)return;switch(event){case 'strike':this.strike(detail.club,detail.power);break;case 'land':this.tone(110,.14,'sine',.05);break;case 'cup':for(let i=0;i<3;i++)this.tone([523,659,784][i],.22,'sine',.055,i*.11);break;case 'hazard':this.splash(detail.speed||12);break;case 'welcome':this.tone(440,.13,'sine',.025);this.tone(554,.18,'sine',.025,.1);break;case 'menu':this.tone(400,.045,'sine',.012);break;}}
}