/* Play only the recorded AudioSmith voice. Unlock audio on the shopper's gesture for mobile browsers. */
window.MayaVoice=(()=>{
  let context, manifest, generation=0;
  const buffers=new Map(),sources=new Set();
  function unlock(){
    const Engine=window.AudioContext||window.webkitAudioContext;
    if(!Engine)return Promise.reject(Error('Audio unavailable'));
    context ||= new Engine();
    return context.state==='running'?Promise.resolve():context.resume();
  }
  function stop(){
    generation++;
    for(const s of sources){try{s.stop();}catch{}}
    sources.clear();
  }
  async function load(url,type){
    const r=await fetch('maya-audio/'+url);
    if(!r.ok)throw Error('Voice unavailable');
    return type==='json'?r.json():r.arrayBuffer();
  }
  async function play(keys,hint,onStarted){
    stop();
    const ticket=generation;
    try{
      await unlock();
      manifest ||= load('clips.json','json').catch(e=>{manifest=null;throw e;});
      const clips=await manifest;
      const parts=keys.map(key=>{
        if(!Object.hasOwn(clips,key))throw Error('Missing recording');
        return clips[key];
      });
      await Promise.all([...new Set(parts.map(p=>p[0]))].map(group=>{
        if(!buffers.has(group))buffers.set(group,load(group+'.mp3').then(b=>context.decodeAudioData(b)).catch(e=>{buffers.delete(group);throw e;}));
        return buffers.get(group);
      }));
      if(ticket!==generation)return;
      let start=context.currentTime+.03;
      for(const [group,offset,duration] of parts){
        const buffer=await buffers.get(group);
        if(ticket!==generation)return;
        const source=context.createBufferSource();
        source.buffer=buffer;source.connect(context.destination);sources.add(source);
        source.onended=()=>sources.delete(source);
        source.start(start,offset,duration);start+=duration+.04;
      }
      onStarted?.();
    }catch{if(ticket===generation)hint();}
  }
  function number(n){
    if(n<20||n<100&&n%10===0)return ['n'+n];
    if(n<100)return ['n'+(n-n%10),...number(n%10)];
    for(const [base,key] of [[100000,'lakh'],[1000,'thousand'],[100,'hundred']]){
      if(n>=base)return [...number(Math.floor(n/base)),key,...(n%base?number(n%base):[])];
    }
  }
  function amount(value){
    const p=Math.round(value*100),rs=Math.floor(p/100),fraction=p%100;
    return [...(rs||!fraction?[...number(rs),'rupees']:[]),...(fraction?[...(rs?['and']:[]),...number(fraction),'paise']:[])];
  }
  return {unlock,stop,play,amount};
})();
