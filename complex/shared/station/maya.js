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
  let draft = Array.isArray(saved?.draft) ? saved.draft.filter(x=>(byId.has(x.id)||Object.hasOwn(stores,x.scene))&&Number.isFinite(x.q)&&x.q>0&&x.q<=99) : [];
  let hi = saved?.lang ? saved.lang==='hi' : params.get('lang')==='hi';
  let autoVoice=saved?.voiceOn!==false;
  let busy = false, recognition;
  let choices=Array.isArray(saved?.choices)?saved.choices.filter(x=>x?.row?.name&&Object.hasOwn(stores,x.scene)).slice(0,5):[];
  let lastVoice=[], heardQuestion=false;
  const sourceOf=x=>x.scene||byId.get(x.id)?.[0];
  const cache = new Map();
  const tr = (en,hindi) => hi ? hindi : en;
  const money = value => '₹' + Number(value.toFixed(2)).toLocaleString('en-IN',{maximumFractionDigits:2});
  const name = scene => scenes[scene][hi ? 1 : 0];
  function save() {
    try { sessionStorage.setItem(key,JSON.stringify({lang:hi?'hi':'en',history:history.slice(-8),draft,choices,voiceOn:autoVoice})); } catch {}
  }
  function say(text,question=false,scene=null,voice=null) {
    history.push({text,question,scene,voice});
    if (history.length>8) history.shift();
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
    $('voice-toggle').textContent=autoVoice?tr('Voice on','आवाज़ चालू'):tr('Voice off','आवाज़ बंद');
    $('voice-toggle').setAttribute('aria-pressed',String(autoVoice));
    $('send').disabled=busy;
    $('mic').disabled=busy;
    const messages=$('conversation'); messages.replaceChildren();
    const entries=history.length?history:[{text:guide()}];
    for(const m of entries){
      const p=document.createElement('p'); p.textContent=m.text;
      if(m.question)p.className='question';
      messages.append(p);
    }
    lastVoice=[...entries].reverse().find(m=>!m.question)?.voice || [hi?'hi-guide':'guide'];
    $('actions').replaceChildren();
    if(choices.length){
      for(const option of choices)chip(option.row.name+' · '+name(option.scene),()=>ask(option.row.name,option));
    }else if(draft.length){
      chip(tr('Add missing items','बाकी सामान जोड़ें'),addDraft,true);
      if(draft.some(x=>x.id==='tomato')){
        const q=draft.find(x=>x.id==='tomato').q===.5?.25:.5;
        chip(tr('Tomatoes · ','टमाटर · ')+(q*1000)+' g',()=>ask(tr('Tomatoes ','टमाटर ')+(q*1000)+' g'));
      }
      for(const scene of new Set(draft.map(sourceOf))) openShop(scene);
      chip(tr('Clear suggestion','सुझाव हटाएँ'),()=>{draft=[];save();draw();});
    }else{
      if(place==='sabzi')chip(tr('Brinjal price','बैंगन का दाम'),()=>ask(tr('What does brinjal cost?','बैंगन का दाम क्या है?')));
      chip(tr('Bread, greens & tomatoes','ब्रेड, पालक और टमाटर'),()=>ask(tr('Price bread, spinach and tomatoes','ब्रेड, पालक और टमाटर का दाम बताइए')));
      if(place!=='plaza'&&place!=='cinema') chip(tr('What’s here?','यहाँ क्या है?'),()=>ask(tr('What is here?','यहाँ क्या है?')));
      const stops=place==='plaza'?['counter','sabzi','grocery','shelf','cinema']:[place];
      for(const scene of stops)openShop(scene);
    }
    const suggested=history.at(-1)?.scene;
    if(Object.hasOwn(scenes,suggested)&&!Array.from($('actions').children).some(b=>b.textContent.endsWith(name(suggested))))openShop(suggested);
    if(history.length){
      const main=document.querySelector('main');
      main.scrollTop=main.scrollHeight;
    }
  }
  async function catalogue(scene) {
    if(!cache.has(scene)){
      const path=scene==='shelf'?'../../../menu.json':'../../'+stores[scene]+'/data.json';
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
      cache.set(scene,fetch(path,{signal:controller.signal}).then(async r=>{
        if(!r.ok)throw Error('catalogue');
        const data=await r.json();
        return new Map(data.items.map(row=>[row.id,row]));
      }).finally(()=>clearTimeout(timer)).catch(error=>{cache.delete(scene);throw error;}));
    }
    return cache.get(scene);
  }
  async function quoted(lines){
    return Promise.all(lines.map(async line=>{
      const scene=sourceOf(line);
      const row=(await catalogue(scene)).get(line.id);
      if(!row||!Number.isFinite(row.price)||row.status==='out'||row.qty===0)throw Error('catalogue');
      const product=byId.get(line.id)||[scene,line.id,row.name,(scene==='sabzi'&&MayaSearch.hindiProduce[line.id])||row.name];
      return {...line,product,row,amount:Math.round(row.price*100*line.q)/100};
    }));
  }
  function quantity(x){
    if(x.row.unit==='kg')return x.q<1?(1000*x.q)+' g':x.q+' kg';
    return String(x.q);
  }
  function summary(rows,budget){
    const total=rows.reduce((n,x)=>n+Math.round(x.amount*100),0)/100;
    const parts=rows.map(x=>x.product[hi?3:2]+' · '+money(x.row.price)+' / '+unitName(unitOf(x.row))+' × '+quantity(x)+' · '+money(x.amount));
    parts.push(tr('Estimated total ','अनुमानित कुल ')+money(total)+(budget!=null&&total>budget?tr(' · over budget',' · बजट से अधिक'):''));
    parts.push(tr('Confirm prices and availability at the counter.','दाम और उपलब्धता काउंटर पर पक्की करें।'));
    return parts.join('\n');
  }
  const smallCounts={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,एक:1,दो:2,तीन:3,चार:4,पाँच:5};
  function spokenWeights(text){
    return text.replace(/(?:\b(one|two|three|four|five|six|seven|eight|nine|ten)\b|(एक|दो|तीन|चार|पाँच))(?=\s+(?:kilos?|kilograms?|kg|किलो|grams?|ग्राम|packs?|pieces?|bunches|bottles?|jars?|loaves|tins?))/gi,word=>String(smallCounts[word.toLowerCase()]));
  }
  function weight(text){
    if(/half|आधा|आधे|aadha/i.test(text))return .5;
    if(/quarter|पाव भर/i.test(text))return .25;
    const m=text.match(/(\d+(?:\.\d+)?)\s*(kilograms?|kilos?|kgs?|किलो|grams?|g\b|ग्राम)/i);
    if(!m)return null;
    const q=Number(m[1])*(/^(g|ग्राम)/i.test(m[2])?.001:1);
    return q>0&&q<=99?Math.round(q*1000)/1000:null;
  }
  let rates;
  function diagnostic(event,detail=''){
    try{
      const k='kalimpong.maya.diagnostics.v1';
      const data=JSON.parse(sessionStorage.getItem(k)||'[]');
      data.push({at:new Date().toISOString(),event,detail});
      sessionStorage.setItem(k,JSON.stringify(data.slice(-24)));
    }catch{}
  }
  function speakReply(){
    MayaVoice.play(lastVoice,()=>{
      diagnostic('audio-unavailable');
      $('status').textContent=tr('Audio could not play. Your answer is above. Tap Read reply to retry.','आवाज़ नहीं चल सकी। जवाब ऊपर है। सुनने के लिए फिर दबाएँ।');
    },()=>diagnostic('audio-started',hi?'hi':'en'));
  }
  function reply(text,voice,scene=null){say(text,false,scene,voice);}
  const recorded=(en,hindi='hi-'+en)=>[hi?hindi:en];
  const unitOf=row=>row.unit||'pack';
  function unitName(u){
    const units={kg:['kg','किलो'],bunch:['bunch','गुच्छा'],piece:['piece','नग'],pack:['pack','पैक'],each:['item','नग'],dozen:['dozen','दर्जन'],jar:['jar','जार'],bottle:['bottle','बोतल'],tin:['tin','टिन']};
    return units[u]?.[hi?1:0]||u;
  }
  function usable(row){return row.status!=='out'&&row.qty!==0&&Number.isFinite(row.price)&&row.price>=0;}
  function budgetOf(text){
    const cap=text.match(/(?:under|below|budget(?: of)?|less than|तक|बजट)\s*(?:₹|rs\.?|rupees)?\s*(\d+(?:\.\d+)?)/i) || text.match(/(\d+)\s*(?:रुपये|रुपए)\s*(?:में|तक)/);
    return cap?Number(cap[1]):null;
  }
  function productLabel(entry){
    if(hi&&entry.scene==='sabzi'&&MayaSearch.hindiProduce[entry.id])return MayaSearch.hindiProduce[entry.id];
    if(entry.id==='brinjal')return 'Brinjal (baingan)';
    const known=byId.get(entry.id);
    return known?known[hi?3:2]:entry.row.name;
  }
  function suggestion(entry,q){
    return {id:entry.id,scene:entry.scene,unit:unitOf(entry.row),q};
  }
  async function answerItem(entry,quantityRequested,question=''){
    const {row,scene,id}=entry;
    choices=[];draft=[];
    if(!usable(row)){
      const out=row.status==='out'||row.qty===0;
      reply(productLabel(entry)+' · '+(out?tr('Listed as unavailable.','सूची में उपलब्ध नहीं है।'):tr('Price unconfirmed. Please check at the counter.','कीमत की पुष्टि काउंटर पर करें।')),recorded(out?'stock':'offline'),scene);
      return;
    }
    const unit=unitOf(row),q=quantityRequested??1;
    const price=row.price,subtotal=Math.round(price*q*100)/100;
    const rate=money(price)+' / '+unitName(unit);
    let line=productLabel(entry)+' · '+rate+' · '+name(scene)+'.';
    if(/availab|stock|in store|उपलब्ध|स्टॉक/i.test(question))
      line+='\n'+tr('Listed in the catalogue. The counter can confirm today’s stock.','सूची में दर्ज है। आज का स्टॉक काउंटर पर पक्का करें।');
    if(q!==1)line+='\n'+quantity({row,q})+' · '+money(subtotal);
    if(id==='brinjal'&&q===1)line+='\n'+tr('Half a kilo is ','आधा किलो ')+money(Math.round(price*50)/100)+'.';
    line+='\n'+tr('Catalogue estimate. Confirm at the counter.','सूची का अनुमानित दाम। काउंटर पर पुष्टि करें।');
    let voice;
    if(id==='brinjal'&&unit==='kg'&&price===50&&q===1)voice=[hi?'brinjal-hi':'brinjal-en'];
    else if(id==='brinjal'&&unit==='kg'&&price===50&&q===.5)voice=recorded('brinjal-half','brinjal-hi');
    else{
      if(!rates)rates=fetch('maya-audio/rates.json').then(r=>r.ok?r.json():{}).catch(()=>({}));
      const savedRate=(await rates)[id];
      const hasWholeLine=scene==='sabzi'&&q===1&&id!=='brinjal'&&savedRate?.[0]===price&&savedRate?.[1]===unit;
      voice=hasWholeLine?recorded('veg-'+id):[...recorded(q===1?'prefix':'total'),...MayaVoice.amount(subtotal),...(q===1?['unit-'+unit]:[])];
      if(hi&&!hasWholeLine&&q!==1&&hindiAmounts.has(subtotal))voice=['hi-money-'+subtotal];
    }
    draft=[suggestion(entry,q)];
    reply(line,voice,scene);
    diagnostic('catalogue-answer',scene);
  }
  const hindiAmounts=new Set([10,12,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,120,140,150,160,180,200,250,300,400,500]);
  function bundleVoice(rows){
    const value=rows.reduce((p,x)=>p+Math.round(x.amount*100),0)/100;
    const ids=rows.map(x=>x.id).sort().join('/');
    if(ids==='milk-bread-400g/spinach/tomato'&&[85,95].includes(value)&&rows.filter(x=>x.id!=='tomato').every(x=>x.q===1))return recorded('bundle'+value);
    if(hi&&hindiAmounts.has(value))return ['hi-money-'+value];
    return [...recorded('total'),...MayaVoice.amount(value)];
  }
  function options(hits,text,voice=recorded('choice')){
    choices=hits.slice(0,5).map(x=>({id:x.id,scene:x.scene,row:{id:x.id,name:x.row.name,unit:x.row.unit,price:x.row.price,status:x.row.status,qty:x.row.qty}}));draft=[];
    const labels=choices.map(x=>x.row.name+' · '+(usable(x.row)?money(x.row.price)+' / '+unitName(unitOf(x.row)):tr('check at counter','काउंटर पर पूछें')));
    reply(text+'\n'+labels.join('\n'),voice);
    diagnostic('clarification',String(choices.length));
  }
  function countRequested(text){
    const m=text.match(/\b(\d+)\s*(?:packs?|loaves|pieces?|bunch(?:es)?|jars?|bottles?|tins?)\b/i);
    if(m&&Number(m[1])>0&&Number(m[1])<=99)return Number(m[1]);
    return null;
  }
  async function ask(input,chosen=null){
    const question=String(input||'').trim().slice(0,240);
    if(!question||busy)return;
    MayaVoice.stop();
    heardQuestion=autoVoice;
    if(autoVoice)MayaVoice.unlock().catch(()=>diagnostic('audio-gesture-unavailable'));
    if(/[\u0900-\u097f]/.test(question))hi=true;
    const text=spokenWeights(question.replace(/[०-९]/g,c=>String(c.charCodeAt(0)-2406)));
    const previousChoices=choices;choices=[];
    busy=true;$('question').value='';$('status').textContent='';say(question,true);draw();
    try{
      if(/^(?:hi|hello|hey|namaste|नमस्ते|help|help me|what can you do)(?: maya| माया)?[?!. ]*$/i.test(text)){
        reply(tr('I’m Maya. Tell me what you’re looking for and I’ll check its price, compare options, or help with your basket.','नमस्ते। सामान का नाम बताइए, मैं दाम देख सकती हूँ, विकल्प बता सकती हूँ या आपकी टोकरी बनाने में मदद कर सकती हूँ।'),recorded('hello','hi-guide'));return;
      }
      const matches=products.filter(p=>p[4].test(text));
      const amount=weight(text),prior=draft.filter(x=>x.unit==='kg'||['tomato','iskus','sona-masoori-loose'].includes(x.id));
      if(!chosen&&draft.length===1&&/\b(?:where.*(?:it|that)|(?:it|that) (?:available|in stock)|which counter)\b|यह कहाँ|यह उपलब्ध/i.test(text)){
        const priorItem=draft[0],scene=sourceOf(priorItem),row=(await catalogue(scene)).get(priorItem.id);
        if(row){await answerItem({id:row.id,row,scene},null,text);return;}
      }
      const quantityOnly=/^(?:and |what about |how much (?:is|for) |और )?(?:(?:a |one |half |quarter |आधा |आधे |एक |पाव |a quarter |half a |\d+(?:\.\d+)?\s*)+(?:kilos?|kilograms?|kg|grams?|g|किलो|ग्राम))[?.!\s]*$/i.test(text);
      const follow=amount!==null&&prior.length===1&&(quantityOnly||matches.length===1&&matches[0][1]===prior[0].id||draft.length===1&&MayaSearch.clean(text).includes(MayaSearch.clean(prior[0].id)));
      if(follow&&!chosen){
        const rows=await quoted(draft.map(x=>({...x,q:x.id===prior[0].id?amount:x.q})));
        if(rows.length===1){const x=rows[0];await answerItem({id:x.id,row:x.row,scene:x.product[0]},x.q);}
        else{draft=rows.map(x=>suggestion({id:x.id,row:x.row,scene:x.product[0]},x.q));reply(summary(rows,budgetOf(text)),bundleVoice(rows));}
        return;
      }
      const ordinal=/^(?:the )?(first|second|third|fourth|fifth|[1-5])(?: one)?[.! ]*$/i.exec(text);
      if(!chosen&&ordinal){const o=ordinal[1].toLowerCase();chosen=previousChoices[Number(o)-1]||previousChoices[['first','second','third','fourth','fifth'].indexOf(o)];}
      if(chosen){
        const row=(await catalogue(chosen.scene)).get(chosen.id);
        if(!row)throw Error('catalogue');
        await answerItem({...chosen,row},unitOf(row)==='kg'?amount:countRequested(text),text);return;
      }
      if(/\band\b|\bwith\b|और|,|&/i.test(text) && !/compar|cheaper|vs\b|versus|तुलना/i.test(text)){
        const terms=text.split(/\s*(?:\band\b|\bwith\b|और|,|&)\s*/i).filter(Boolean);
        if(terms.length>1&&terms.length<=12){
          const lines=[];
          for(const term of terms){
            const found=await MayaSearch.search(term,place,catalogue);
            let item=found.hits.length===1?found.hits[0]:null;
            const familiar=products.filter(p=>p[4].test(term));
            if(!item&&familiar.length===1){
              const p=familiar[0],row=(await catalogue(p[0])).get(p[1]);
              if(row)item={id:p[1],scene:p[0],row};
            }
            if(!item){
              if(found.hits.length){options(found.hits,tr('Which item did you mean by “','कौन सा सामान · “')+term+'”?');}
              else{draft=[];reply(tr('I couldn’t match “','यह नाम नहीं मिला · “')+term+tr('”. Could you give me another name?','”। इसका दूसरा नाम क्या है?'),recorded('missing'));}
              return;
            }
            const q=unitOf(item.row)==='kg'?weight(term)??.25:countRequested(term)??1;
            const line=lines.find(x=>x.id===item.id);
            if(line)line.q+=q;else lines.push(suggestion(item,q));
          }
          const rows=await quoted(lines);draft=lines;
          reply(summary(rows,budgetOf(text)),bundleVoice(rows));return;
        }
      }
      if(/what.?s here|what is here|यहाँ क्या|यहां क्या/i.test(text)){reply(guide(),recorded('guide'));return;}
      // Compare the named items explicitly, without summing unlike pack sizes.
      const compare=/\bcompare\b|\bversus\b|\bvs\b|cheaper.*\bor\b|तुलना/i.test(text);
      if(compare){
        const terms=text.replace(/compare|तुलना/ig,'').split(/\s+(?:and|or|versus|vs\.?|with|और)\s+/i);
        if(terms.length>1){
          const found=await Promise.all(terms.slice(0,4).map(t=>MayaSearch.search(t,place,catalogue)));
          if(found.every(result=>result.hits.length===1)){
            const xs=found.map(result=>result.hits[0]);
            const sorted=xs.slice().sort((a,b)=>a.row.price-b.row.price);
            const comparable=sorted.every(x=>usable(x.row)&&unitOf(x.row)===unitOf(sorted[0].row));
            if(comparable&&sorted.length===2&&sorted[0].row.price<sorted[1].row.price){
              const gap=money(sorted[1].row.price-sorted[0].row.price);
              options(xs,productLabel(sorted[0])+tr(' costs ',' · ')+gap+tr(' less per ',' कम प्रति ')+unitName(unitOf(sorted[0].row))+'.',[...recorded('prefix'),...MayaVoice.amount(sorted[0].row.price),'unit-'+unitOf(sorted[0].row)]);
            }else options(xs,tr('Here are their catalogue rates and pack sizes.','ये सूची के दाम और पैक के आकार हैं।'));
            return;
          }
        }
      }
      const result=await MayaSearch.search(text,place,catalogue);
      let hits=result.hits;
      if(!hits.length&&matches.length===1){
        const p=matches[0],row=(await catalogue(p[0])).get(p[1]);
        if(row)hits=[{id:p[1],row,scene:p[0]}];
      }
      const cap=budgetOf(text);
      if(cap!==null&&hits.length){
        hits=hits.filter(x=>usable(x.row)&&x.row.price<=cap);
        if(!hits.length){draft=[];reply(tr('I found no listed option within ','इस बजट में कोई विकल्प नहीं मिला · ')+money(cap)+'.',recorded('missing'));return;}
      }
      const lowest=/cheapest|lowest|cheaper|affordable|सस्त/i.test(text);
      if(lowest)hits=hits.filter(x=>usable(x.row)).sort((a,b)=>a.row.price-b.row.price);
      if(hits.length===1){await answerItem(hits[0],unitOf(hits[0].row)==='kg'?amount:countRequested(text),text);return;}
      if(hits.length>1){
        if(lowest)options(hits,tr('Lowest listed prices, with their quantities.','कम दाम वाले विकल्प और उनकी मात्रा।'),[...recorded('prefix'),...MayaVoice.amount(hits[0].row.price),'unit-'+unitOf(hits[0].row)]);
        else options(hits,tr('Which of these did you mean?','इनमें से कौन सा चाहिए?'));
        return;
      }
      const stops=[['cinema',/cinema|film|movie|सिनेमा|फ़िल्म/i],['counter',/bakery|bakehouse|बेकरी/i],['grocery',/grocery|किराना/i],['sabzi',/sabzi|produce|सब्ज़ी|सब्जी/i],['shelf',/canteen|urc|कैंटीन/i]];
      const stop=stops.find(([,pattern])=>pattern.test(text));
      draft=[];
      if(stop)reply(tr('I can take you to ','यहाँ चलें · ')+name(stop[0])+'.',recorded('route'),stop[0]);
      else if(result.partial)reply(tr('Some catalogues could not be reached. Please try again.','कुछ सूचियाँ अभी नहीं खुलीं। फिर पूछें।'),recorded('offline'));
      else reply(tr('I couldn’t match that name in the plaza catalogues. What else is it called?','इस नाम से सामान नहीं मिला। क्या इसका कोई और नाम है?'),recorded('missing'));
    }catch{draft=[];choices=[];reply(tr('I couldn’t verify that catalogue price. Please check at the counter.','इस सामान का दाम अभी नहीं मिल सका। काउंटर पर पूछें।'),recorded('offline'));diagnostic('lookup-unavailable');}
    finally{busy=false;draw();if(autoVoice&&heardQuestion&&!document.hidden)speakReply();}
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
      reply(tr('Your basket now has at least these quantities.','आपकी टोकरी में अब कम से कम इतनी मात्रा है।'),recorded('basket'));
    }catch{say(tr('I couldn’t finish updating the basket. Check My basket or try again.','टोकरी पूरी तरह अपडेट नहीं हो सकी। टोकरी देखें या फिर कोशिश करें।'));}
    finally{busy=false;draw();}
  }
  function stopAudio(){
    heardQuestion=false;
    if(recognition){const mic=recognition;recognition=null;mic.abort();}
    MayaVoice.stop();
  }
  $('close').onclick=()=>{stopAudio();sendParent('close');};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();$('close').click();}});
  window.addEventListener('pagehide',stopAudio);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudio();});
  $('language').onclick=()=>{stopAudio();hi=!hi;save();draw();};
  $('voice-toggle').onclick=()=>{stopAudio();autoVoice=!autoVoice;save();draw();};
  document.querySelector('form').onsubmit=e=>{e.preventDefault();ask($('question').value);};
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  $('mic').hidden=!Recognition;
  $('mic').onclick=()=>{
    if(recognition){recognition.manualStop=true;recognition.stop();return;}
    stopAudio();
    if(autoVoice)MayaVoice.unlock().catch(()=>diagnostic('audio-gesture-unavailable'));
    const mic=new Recognition();recognition=mic;mic.lang=hi?'hi-IN':'en-IN';mic.continuous=false;
    let received=false;
    const help=(kind,message)=>{
      if(recognition!==mic||mic.manualStop)return;
      $('status').textContent=message;
      if(autoVoice&&!document.hidden)MayaVoice.play(recorded(kind),()=>diagnostic('audio-unavailable'));
    };
    const retry=()=>help('mic-empty',tr('I didn’t hear a product name. Tap Speak again or type it below.','नाम सुनाई नहीं दिया। फिर बोलें या नीचे लिखें।'));
    mic.onresult=e=>{
      const said=e.results?.[e.resultIndex||0]?.[0]?.transcript?.trim();
      if(recognition!==mic)return;
      if(!said){received=true;retry();return;}
      received=true;heardQuestion=true;diagnostic('speech-result',mic.lang);
      ask(said);
    };
    mic.onerror=e=>{
      received=true;
      if(recognition!==mic||mic.manualStop||e?.error==='aborted')return;
      diagnostic('microphone-error',e?.error||'unavailable');
      if(e?.error==='no-speech')retry();
      else help('mic-unavailable',tr('Voice input unavailable. You can type below.','आवाज़ उपलब्ध नहीं है। नीचे लिखें।'));
    };
    mic.onend=()=>{if(recognition===mic){if(!received)retry();recognition=null;draw();}};
    try{mic.start();draw();}catch{mic.onerror();recognition=null;draw();}
  };
  $('read').hidden=!(window.AudioContext||window.webkitAudioContext);
  $('read').onclick=()=>{
    stopAudio();speakReply();
  };
  draw();
})();
