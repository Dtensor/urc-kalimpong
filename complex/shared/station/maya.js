(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const scenes = {
    plaza:['Station Plaza','स्टेशन प्लाज़ा'], counter:['Station Bakehouse','स्टेशन बेकहाउस'],
    sabzi:['Sabzi Mandi','सब्ज़ी मंडी'], grocery:['Station Grocery','स्टेशन किराना'],
    shelf:['URC provisions shelf','यूआरसी शेल्फ'], cinema:['Station Cinema','स्टेशन सिनेमा']
  };
  const alias = {urc:'shelf',hall:'shelf',catalogue:'shelf',bakery:'counter'};
  const requested = params.get('place');
  const place = alias[requested] || (Object.hasOwn(scenes,requested) ? requested : 'plaza');
  const stores = {counter:'bakery',sabzi:'sabzi',grocery:'grocery',shelf:'urc'};
  const products = [
    ['counter','milk-bread-400g','milk bread','मिल्क ब्रेड',/milk bread|\bbread\b|ब्रेड|डबल रोटी/i],
    ['counter','ladi-pav-6','ladi pav','लादी पाव',/\bpav\b|पाव/i],
    ['counter','hill-sourdough','sourdough','सावरडो',/sourdough|सावरडो/i],
    ['sabzi','spinach','spinach','पालक',/spinach|palak|पालक/i],
    ['sabzi','tomato','tomatoes','टमाटर',/tomat|tamatar|टमाटर/i],
    ['sabzi','iskus','iskus','इस्कुस',/iskus|squash|इस्कुस/i],
    ['grocery','sona-masoori-loose','loose rice','खुला चावल',/loose rice|sona|मसूरी|खुला चावल/i],
    ['grocery','hill-red-rice-1kg','hill red rice','लाल चावल',/red rice|लाल चावल/i],
    ['grocery','darjeeling-first-flush-100g','first-flush tea','फ़र्स्ट फ्लश चाय',/first.flush|फ्लश/i],
    ['shelf','lipton-darjeeling-tea-250-g','Lipton tea','लिप्टन चाय',/lipton|लिप्टन/i],
    ['shelf','coffee-nescafe-50g','Nescafé coffee','नेस्कैफे कॉफ़ी',/coffee|nescaf|कॉफी|कॉफ़ी/i],
    ['shelf','biscuit-parle-g','Parle-G biscuits','पारले जी बिस्कुट',/biscuit|parle|पारले|बिस्कुट/i]
  ];
  const byId = new Map(products.map(p=>[p[1],p]));
  const key = 'kalimpong.maya.visit.v1';
  let saved;
  try { saved = JSON.parse(sessionStorage.getItem(key) || '{}'); } catch {}
  const history = Array.isArray(saved?.history) ? saved.history.slice(-8).filter(m=>typeof m?.text==='string') : [];
  let draft = Array.isArray(saved?.draft) ? saved.draft.filter(x=>byId.has(x.id)&&Number.isFinite(x.q)&&x.q>0&&x.q<=99) : [];
  let hi = saved?.lang ? saved.lang==='hi' : params.get('lang')==='hi';
  let busy = false, recognition, spokenReply, lastAnswer = '';
  const cache = new Map();
  const tr = (en,hindi) => hi ? hindi : en;
  const money = value => '₹' + Number(value.toFixed(2)).toLocaleString('en-IN',{maximumFractionDigits:2});
  const name = scene => scenes[scene][hi ? 1 : 0];
  function save() {
    try { sessionStorage.setItem(key,JSON.stringify({lang:hi?'hi':'en',history:history.slice(-8),draft})); } catch {}
  }
  function say(text,question=false,scene=null) {
    history.push({text,question,scene});
    if (history.length>8) history.shift();
    if (!question) lastAnswer=text;
    save();
  }
  function sendParent(maya,scene) { parent.postMessage({maya,scene},location.origin); }
  function chip(label,fn,primary=false) {
    const b=document.createElement('button');
    b.type='button'; b.textContent=label; b.disabled=busy;
    if (primary) b.className='primary';
    b.onclick=fn; $('actions').append(b);
  }
  function openShop(scene) {
    chip(tr('Visit ','चलें · ')+name(scene),()=>sendParent('visit',scene));
  }
  function guide() {
    if (place==='cinema') return tr('The sample programme is at the ticket window. Open it to see films and showtimes.','फ़िल्मों और समय का नमूना कार्यक्रम टिकट खिड़की पर है।');
    if (place==='plaza') return tr('Where would you like to start? I can find a counter or price a basket.','कहाँ चलें? मैं काउंटर ढूँढ सकती हूँ या सामान का अनुमान बता सकती हूँ।');
    return tr('At this counter you can ask me about ','इस काउंटर पर आप इन चीज़ों के बारे में पूछ सकते हैं · ')+products.filter(p=>p[0]===place).map(p=>p[hi?3:2]).join(', ')+'.';
  }
  function draw() {
    document.documentElement.lang=hi?'hi':'en';
    $('place').textContent=name(place);
    $('identity').textContent=tr('Virtual plaza guide','प्लाज़ा की वर्चुअल सहायक');
    $('language').textContent=tr('हिन्दी','English');
    $('ask-label').textContent=tr('Ask Maya','माया से पूछें');
    $('send').textContent=tr('Ask','पूछें');
    $('mic').textContent=recognition?tr('Stop listening','सुनना रोकें'):tr('Speak','बोलें');
    $('read').textContent=tr('Read reply','जवाब सुनें');
    $('send').disabled=busy;
    const messages=$('conversation'); messages.replaceChildren();
    const entries=history.length?history:[{text:guide()}];
    for(const m of entries){
      const p=document.createElement('p'); p.textContent=m.text;
      if(m.question)p.className='question';
      messages.append(p);
    }
    lastAnswer=[...entries].reverse().find(m=>!m.question)?.text||'';
    $('actions').replaceChildren();
    if(draft.length){
      chip(tr('Add missing items','बाकी सामान जोड़ें'),addDraft,true);
      if(draft.some(x=>x.id==='tomato')){
        const q=draft.find(x=>x.id==='tomato').q===.5?.25:.5;
        chip(tr('Tomatoes · ','टमाटर · ')+(q*1000)+' g',()=>ask(tr('Tomatoes ','टमाटर ')+(q*1000)+' g'));
      }
      for(const scene of new Set(draft.map(x=>byId.get(x.id)[0]))) openShop(scene);
      chip(tr('Clear suggestion','सुझाव हटाएँ'),()=>{draft=[];save();draw();});
    }else{
      chip(tr('Bread, greens & tomatoes','ब्रेड, पालक और टमाटर'),()=>ask(tr('Price bread, spinach and tomatoes','ब्रेड, पालक और टमाटर का दाम बताइए')));
      if(place!=='plaza'&&place!=='cinema') chip(tr('What’s here?','यहाँ क्या है?'),()=>ask(tr('What is here?','यहाँ क्या है?')));
      const stops=place==='plaza'?['counter','sabzi','grocery','shelf','cinema']:[place];
      for(const scene of stops)openShop(scene);
    }
    const suggested=history.at(-1)?.scene;
    if(Object.hasOwn(scenes,suggested)&&!Array.from($('actions').children).some(b=>b.textContent.endsWith(name(suggested))))openShop(suggested);
    $('conversation').lastElementChild?.scrollIntoView({block:'nearest'});
  }
  async function catalogue(scene) {
    if(!cache.has(scene)){
      const path=scene==='shelf'?'../../../menu.json':'../../'+stores[scene]+'/data.json';
      cache.set(scene,fetch(path).then(async r=>{
        if(!r.ok)throw Error('catalogue');
        const data=await r.json();
        return new Map(data.items.map(row=>[row.id,row]));
      }).catch(error=>{cache.delete(scene);throw error;}));
    }
    return cache.get(scene);
  }
  async function quoted(lines){
    return Promise.all(lines.map(async line=>{
      const product=byId.get(line.id);
      const row=(await catalogue(product[0])).get(line.id);
      if(!row||!Number.isFinite(row.price)||row.status==='out'||row.qty===0)throw Error('catalogue');
      return {...line,product,row,amount:Math.round(row.price*100*line.q)/100};
    }));
  }
  function quantity(x){
    if(x.row.unit==='kg')return x.q<1?(1000*x.q)+' g':x.q+' kg';
    return String(x.q);
  }
  function summary(rows,budget){
    const total=rows.reduce((n,x)=>n+Math.round(x.amount*100),0)/100;
    const parts=rows.map(x=>x.product[hi?3:2]+' × '+quantity(x)+' · '+money(x.amount));
    parts.push(tr('Estimated total ','अनुमानित कुल ')+money(total)+(budget!=null&&total>budget?tr(' · over budget',' · बजट से अधिक'):''));
    parts.push(tr('Confirm prices and availability at the counter.','दाम और उपलब्धता काउंटर पर पक्की करें।'));
    return parts.join('\n');
  }
  function weight(text){
    if(/half|आधा|aadha/i.test(text))return .5;
    if(/quarter|पाव भर/i.test(text))return .25;
    const m=text.match(/(\d+(?:\.\d+)?)\s*(kilograms?|kilos?|kgs?|किलो|grams?|g\b|ग्राम)/i);
    if(!m)return null;
    const q=Number(m[1])*(/^(g|ग्राम)/i.test(m[2])?.001:1);
    return q>0&&q<=99?Math.round(q*1000)/1000:null;
  }
  async function ask(input){
    const question=input.trim().slice(0,240); if(!question||busy)return;
    if(/[\u0900-\u097f]/.test(question))hi=true;
    const text=question.replace(/[०-९]/g,c=>String(c.charCodeAt(0)-2406));
    busy=true;$('question').value='';$('status').textContent='';say(question,true);draw();
    try{
      const matches=products.filter(p=>p[4].test(text));
      const amount=weight(text);
      const weighed=['tomato','iskus','sona-masoori-loose'];
      const prior=draft.filter(x=>weighed.includes(x.id));
      const edit=amount!=null&&draft.length&&((matches.length===1&&draft.some(x=>x.id===matches[0][1])&&weighed.includes(matches[0][1]))||(!matches.length&&prior.length===1));
      if(matches.length||edit){
        const lines=edit?draft.map(x=>({...x})):matches.map(p=>({id:p[1],q:weighed.includes(p[1])?.25:1}));
        if(amount!=null){
          const id=matches.filter(p=>weighed.includes(p[1])).map(p=>p[1]);
          if(id.length===1||(!id.length&&edit))lines.find(x=>x.id===(id[0]||prior[0].id)).q=amount;
        }
        const rows=await quoted(lines);
        draft=lines;
        const budget=text.match(/(?:₹|under\s+|budget\s+)(\d+)/i)||text.match(/(\d+)\s*(?:रुपये|rupees)/i);
        say(summary(rows,budget?Number(budget[1]):null));
      }else if(/here|यहाँ|यहां/.test(text))say(guide());
      else{
        const stops=[['cinema',/cinema|film|movie|सिनेमा|फ़िल्म/i],['counter',/bakery|bakehouse|बेकरी/i],['grocery',/grocery|किराना/i],['sabzi',/sabzi|produce|सब्ज़ी|सब्जी/i],['shelf',/canteen|urc|कैंटीन/i]];
        const stop=stops.find(([,pattern])=>pattern.test(text));
        say(stop?tr('I can take you to ','यहाँ चलें · ')+name(stop[0])+'.':tr('I can price featured items, adjust a weight, or find a counter. Try “milk bread and spinach”.','मैं चुनिंदा सामान का दाम, वज़न और काउंटर बता सकती हूँ। जैसे, “ब्रेड और पालक”।'),false,stop?.[0]);
      }
    }catch{say(tr('I couldn’t verify that item’s catalogue price. Please check at the counter.','इस सामान का दाम अभी नहीं मिल सका। काउंटर पर पूछें।'));}
    finally{busy=false;draw();}
  }
  async function addDraft(){
    if(busy||!draft.length)return;
    busy=true;draw();
    try{
      const rows=await quoted(draft);
      function merge(){
        const groups=new Map();
        for(const x of rows){
          const shop=stores[x.product[0]], k=shop==='urc'?'bhandar.basket':'complex.cart.'+shop;
          if(!groups.has(k)){
            const raw=JSON.parse(localStorage.getItem(k)||'{}');
            if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('basket');
            groups.set(k,raw);
          }
          const cart=groups.get(k),previous=cart[x.id]??0;
          if(!Number.isFinite(previous)||previous<0||previous>99)throw Error('basket');
          cart[x.id]=Math.max(previous,x.q);
        }
        for(const [k,cart] of groups)localStorage.setItem(k,JSON.stringify(cart));
      }
      if(navigator.locks)await navigator.locks.request('kalimpong.maya.basket',merge);else merge();
      say(tr('Your basket now has at least these quantities.','आपकी टोकरी में अब कम से कम इतनी मात्रा है।'));
    }catch{say(tr('I couldn’t finish updating the basket. Check My basket or try again.','टोकरी पूरी तरह अपडेट नहीं हो सकी। टोकरी देखें या फिर कोशिश करें।'));}
    finally{busy=false;draw();}
  }
  function stopAudio(){
    if(recognition){recognition.abort();recognition=null;}
    if(spokenReply){speechSynthesis.cancel();spokenReply=null;}
  }
  $('close').onclick=()=>{stopAudio();sendParent('close');};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();$('close').click();}});
  window.addEventListener('pagehide',stopAudio);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudio();});
  $('language').onclick=()=>{stopAudio();hi=!hi;save();draw();};
  document.querySelector('form').onsubmit=e=>{e.preventDefault();ask($('question').value);};
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  $('mic').hidden=!Recognition;
  $('mic').onclick=()=>{
    if(recognition){recognition.stop();return;}
    stopAudio();
    const mic=new Recognition();recognition=mic;mic.lang=hi?'hi-IN':'en-IN';mic.continuous=false;
    mic.onresult=e=>{const said=e.results[0][0].transcript;ask(said);};
    mic.onerror=()=>{$('status').textContent=tr('Voice input unavailable. You can type below.','आवाज़ उपलब्ध नहीं है। नीचे लिखें।');};
    mic.onend=()=>{recognition=null;draw();};
    try{mic.start();draw();}catch{recognition=null;mic.onerror();draw();}
  };
  $('read').hidden=!window.speechSynthesis;
  $('read').onclick=()=>{
    stopAudio();const utterance=new SpeechSynthesisUtterance(lastAnswer);
    utterance.lang=hi?'hi-IN':'en-IN';
    spokenReply=utterance;
    utterance.onend=utterance.onerror=()=>{if(spokenReply===utterance)spokenReply=null;};
    speechSynthesis.speak(utterance);
  };
  draw();
})();
