const $ = selector => document.querySelector(selector);
const scenes = [
  {id:'plaza',crumb:'Plaza',name:'Station Plaza',hint:'Visit the bakery window or step through the canteen doors.',alt:'Wet cobbles, the plaza clock and the red bakery awning to its left.',trail:[0],points:[
    ['Enter the canteen',50,53,1],['Visit the bakery',21,52,3]]},
  {id:'hall',crumb:'Hall',name:'The canteen hall',hint:'Walk around the fountain to the food and provisions counter.',alt:'A round fountain beneath brass chandeliers, with provisions shelves straight ahead.',trail:[0,1],points:[['Walk to the shelf',50,50,2]]},
  {id:'shelf',crumb:'Shelf',name:'The provisions shelf',hint:'Pick up a pack to see its size and catalogue price.',alt:'Darjeeling tea on the left, coffee jars in the middle and biscuits on the right.',trail:[0,1,2],points:[
    ['Darjeeling tea',17,65,featured[0]],['Coffee',47,65,featured[1]],['Parle-G',80,65,featured[2]]]},
  {id:'bakery',crumb:'Bakery window',venue:'bakery',name:'Station Bakehouse',hint:'Three breads sit in the window. The open door is just to their right.',alt:'A striped awning above the arched window. A round sourdough sits on blue cloth and a brass bell hangs inside the door.',trail:[0,3],points:[['Step inside',72,49,4]]},
  {id:'counter',crumb:'Bread counter',venue:'bakery',name:'At the bread counter',hint:'Choose a loaf, or a pack of six pav. The clock is just across the glass.',alt:'Through the bakery window, the plaza clock. Pav rolls, milk bread and a sourdough boule line the counter from left to right.',trail:[0,3,4],points:[
    ['Ladi pav',31,61,'ladi-pav-6'],['Milk bread',53,58,'milk-bread-400g'],['Hill sourdough',79,56,'hill-sourdough']]}
];
let place=0, motion=!matchMedia('(prefers-reduced-motion: reduce)').matches, walkAnimation;
const world=$('#world'), viewport=$('#viewport'), sheet=$('#sheet'), detail=$('#detail');
function button(text,fn,cls='action'){
  const b=document.createElement('button'); b.textContent=text; b.className=cls; b.onclick=fn; return b;
}
function visit(index,animate=true){
  if(sheet.open)sheet.close();
  place=index;const s=scenes[index];world.dataset.scene=s.id;$('#scene').src=s.id+'.webp';$('#scene').alt=s.alt;
  $('h1').textContent=s.name;$('#hint').textContent=s.hint;
  const nav=$('nav');nav.replaceChildren();
  for(const j of s.trail){
    if(nav.childNodes.length)nav.append(document.createTextNode(' / '));
    nav.append(j===index?document.createTextNode(s.crumb):button(scenes[j].crumb,()=>navigate(j),''));
  }
  showVenue(s.venue || 'urc');
  $('#pins').replaceChildren();$('#actions').replaceChildren();
  s.points.forEach(([label,x,y,target],i)=>{
    const doorway=typeof target==='number';
    const act=doorway?()=>navigate(target):()=>pick(target,i);
    const pin=button(doorway?'↑':'+',act,'pin');
    pin.setAttribute('aria-label',label+' in scene');
    pin.style.left=x+'%';pin.style.top=y+'%';$('#pins').append(pin);
    $('#actions').append(button(label,act));
  });
  viewport.scrollLeft=(world.offsetWidth-viewport.offsetWidth)/2;
  walkAnimation?.cancel();
  if(animate){$('h1').focus({preventScroll:true});if(motion)walkAnimation=world.animate([{opacity:.55,transform:'scale(1.045)'},{opacity:1,transform:'scale(1)'}],{duration:600,easing:'ease-out'});}
  if(index===1 || index===3){const next=new Image();next.src=scenes[index+1].id+'.webp';}
  if(index===4 && animate && audio && soundOn){tone(audio.currentTime,890,884,.25,.027);tone(audio.currentTime+.015,1670,1660,.34,.012);}
  refreshLife();
  tuneAmbience();
}
// Fine wind ripples are sampled from the flag line itself. Fountain highlights stay within the jet.
const canvas=$('#life'),ctx=canvas.getContext('2d');canvas.width=1536;canvas.height=1024;
let frame=0,last=0;
function draw(time){
  if(time-last>=45){
    last=time;ctx.clearRect(0,0,1536,1024);const t=time/1000;
    if(place===1){
      for(let i=0;i<32;i++){
        const phase=(t*.8+i*.381966)%1, spread=Math.sin(i*2.4);
        const x=790+spread*(8+23*phase),y=641-170*phase*(1-phase);
        ctx.fillStyle='rgba(255,253,235,'+.48*Math.sin(Math.PI*phase)+')';ctx.fillRect(x,y,1.5,2.8);
      }
    }else if(place===0 && $('#scene').complete && $('#scene').naturalWidth){
      // Local, feather-light motion across the right-hand span of cloth.
      for(let x=850;x<1250;x+=3){
        const y=139-(x-850)*.175;
        const shift=1.7*Math.sin(t*2.4+x*.038)*Math.sin(Math.PI*(x-850)/400);
        ctx.drawImage($('#scene'),x,y,3,37,x,y+shift,3,37);
      }
    }
  }
  frame=requestAnimationFrame(draw);
}
function refreshLife(){
  cancelAnimationFrame(frame);ctx.clearRect(0,0,1536,1024);$('#motion').textContent=motion?'Motion on':'Motion off';$('#motion').setAttribute('aria-pressed',motion);
  if(motion && !document.hidden && place<2)frame=requestAnimationFrame(draw);
}
$('#motion').onclick=()=>{motion=!motion;walkAnimation?.cancel();refreshLife();};
document.addEventListener('visibilitychange',refreshLife);$('#basket').onclick=openBasket;
sheet.onclick=e=>{if(e.target===sheet){const r=sheet.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)sheet.close();}};
let audio, ambience, filter, birdTimer, soundOn=false;
function tone(start,frequency,endFrequency,duration,volume){
  const voice=audio.createOscillator(), envelope=audio.createGain();
  voice.frequency.setValueAtTime(frequency,start);
  voice.frequency.exponentialRampToValueAtTime(endFrequency,start+duration);
  envelope.gain.setValueAtTime(.0001,start);
  envelope.gain.exponentialRampToValueAtTime(volume,start+.015);
  envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
  voice.connect(envelope).connect(audio.destination);
  voice.start(start);voice.stop(start+duration+.03);
}
function tuneAmbience(){
  clearTimeout(birdTimer);
  if(!audio)return;
  const active=soundOn&&!document.hidden, now=audio.currentTime;
  ambience.gain.setTargetAtTime(active?[.022,.043,.009,.018,.012][place]:0,now,.15);
  filter.frequency.setTargetAtTime([850,1600,500,800,470][place],now,.22);
  function birdsong(){
    if(!soundOn || document.hidden || place!==0)return;
    const t=audio.currentTime, f=1900+Math.random()*350;
    tone(t,f,f*1.38,.13,.018);tone(t+.18,f*1.15,f*.86,.18,.014);
    birdTimer=setTimeout(birdsong,3400+Math.random()*4100);
  }
  if(active && place===0)birdTimer=setTimeout(birdsong,600);
}
$('#sound').onclick=async()=>{
  if(!audio){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    audio=new Audio();const buffer=audio.createBuffer(1,audio.sampleRate*3,audio.sampleRate);
    const samples=buffer.getChannelData(0);let smooth=0;
    for(let i=0;i<samples.length;i++){smooth=.84*smooth+.16*(Math.random()*2-1);samples[i]=smooth*2;}
    const noise=audio.createBufferSource();noise.buffer=buffer;noise.loop=true;
    filter=audio.createBiquadFilter();filter.type='lowpass';ambience=audio.createGain();ambience.gain.value=0;
    noise.connect(filter).connect(ambience).connect(audio.destination);noise.start();
  }
  await audio.resume();soundOn=!soundOn;$('#sound').textContent=soundOn?'Sound on':'Sound off';$('#sound').setAttribute('aria-pressed',soundOn);tuneAmbience();
};
document.addEventListener('visibilitychange',tuneAmbience);
function navigate(index){ location.hash=scenes[index].id; }
function followHash(animate){
  const index=scenes.findIndex(s=>s.id===location.hash.slice(1));
  if(index>=0 || !location.hash){visit(Math.max(0,index),animate);window.scrollTo(0,0);}
}
window.addEventListener('hashchange',()=>followHash(true));
startShop();
visit(Math.max(0,scenes.findIndex(s=>s.id===location.hash.slice(1))),false);
