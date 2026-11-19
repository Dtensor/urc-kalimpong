/* Resolve ordinary shopping questions against the shop exports, including names heard by a microphone. */
window.MayaSearch = (() => {
  const venues = ['sabzi','counter','grocery','shelf'];
  const hindiProduce={
    "tomato":"टमाटर","potato":"आलू","onion":"प्याज़","cauliflower":"फूलगोभी",
    "cabbage":"पत्तागोभी","carrot":"गाजर","brinjal":"बैंगन","okra":"भिंडी",
    "green-peas":"हरे मटर","french-beans":"फ्रेंच बीन्स","cucumber":"खीरा","capsicum":"शिमला मिर्च",
    "bottle-gourd":"लौकी","pumpkin":"कद्दू","radish":"मूली","beetroot":"चुकंदर",
    "spinach":"पालक","methi":"मेथी","mustard-greens":"सरसों का साग","lettuce":"लेटस",
    "pak-choi":"पाक चोई","spring-onion":"हरा प्याज़","amaranth":"लाल साग","broccoli":"ब्रोकली",
    "iskus":"इस्कुस","dalle":"डल्ले मिर्च","ginger":"अदरक","large-cardamom":"बड़ी इलायची",
    "rayo-saag":"रायो साग","bamboo-shoot":"बाँस की कोंपल","yam":"तरुल","ningro":"निंग्रो",
    "bhatmas":"स्थानीय सोयाबीन","mandarin":"दार्जिलिंग का संतरा","kiwi":"कीवी","banana":"केला",
    "apple":"सेब","pear":"नाशपाती","papaya":"पपीता","pineapple":"अनानास",
    "guava":"अमरूद","pomegranate":"अनार","lemon":"नींबू","coriander":"धनिया",
    "mint":"पुदीना","curry-leaf":"करी पत्ता","green-chilli":"हरी मिर्च","garlic":"लहसुन",
    "lemongrass":"लेमनग्रास","timur":"तिमूर","toor-dal":"तूर दाल","masoor-dal":"मसूर दाल",
    "rajma":"राजमा","chana":"काला चना","groundnut":"मूँगफली","dry-chilli":"सूखी लाल मिर्च"
  };
  const synonyms = {
    brinjal:['prinjal','pranjal','brinjal','brinjol','bringal','brinjals','eggplant','aubergine','baingan','baigan','बैंगन','बेंगन','भंटा'],
    potato:['potatoes','aloo','alu','आलू'],onion:['onions','pyaaz','pyaz','प्याज','प्याज़'],okra:['lady finger','ladies finger','भिंडी','भिन्डी'],
    cabbage:['पत्ता गोभी','बंद गोभी'],cauliflower:['phool gobhi','फूलगोभी','फूल गोभी'],carrot:['gajar','गाजर'],
    'green-peas':['matar','मटर'],coriander:['धनिया'],mint:['पुदीना'],lemon:['nimbu','नींबू'],banana:['kela','केला'],
    apple:['seb','सेब'],ginger:['adrak','अदरक'],garlic:['lahsun','लहसुन'],cucumber:['kheera','खीरा'],
    spinach:['palak','पालक'],tomato:['tomatoes','tamatar','टमाटर'], 'bottle-gourd':['लौकी'], 'green-chilli':['हरी मिर्च'],
    'milk-bread-400g':['milk loaf','milk bread','दूध वाली ब्रेड'], 'ladi-pav-6':['पाव'], 'hill-sourdough':['सावरडो'],
    'sona-masoori-loose':['खुला चावल'], 'hill-red-rice-1kg':['लाल चावल'], 'darjeeling-first-flush-100g':['फर्स्ट फ्लश']
  };
  const stop=new Set(('what s is are the of at do does how much many can could would will you tell me please kindly be be costing there your looking look buying a an i want need would like buy get for my to in per costs cost price pricing priced prices rate rates have has available availability stock some any cheapest cheapest least expensive lowest cheaper cheap affordable most budget under below less than between show find compare versus with and half quarter one two three four five kilo kilos kilogram kilograms kg g gm grams gram rupee rupees rs pack packs each unit bunch quarter more another also about much it that this them those these sell sells selling today current total which best in stock catalogue '+
    'क्या है का की के में कितने कितनी कितना भाव दाम कीमत मूल्य बता बताओ बताइए मुझे चाहिए और एक दो आधा आधे किलो ग्राम रुपये रुपए सबसे सस्ता सस्ती कम तहत मिलेगा मिलेगी उपलब्ध ka ki ke kya hai kitna kitne kitni daam bhav rate batao').split(/\s+/));
  const clean=s=>String(s).toLowerCase().normalize('NFKC').replace(/[०-९]/g,c=>String(c.charCodeAt(0)-2406)).replace(/[^\p{L}\p{M}\d]+/gu,' ').trim().replace(/\s+/g,' ');
  function singular(s){return s.length>4&&s.endsWith('ies')?s.slice(0,-3)+'y':s.length>3&&s.endsWith('s')&&!s.endsWith('ss')?s.slice(0,-1):s;}
  const tokens=s=>clean(s).split(' ').filter(Boolean).map(singular);
  function near(a,b){
    if(a.length<5||Math.abs(a.length-b.length)>1)return false;
    let i=0,j=0,errors=0;
    while(i<a.length&&j<b.length){
      if(a[i]===b[j]){i++;j++;continue;}
      if(++errors>1)return false;
      if(a.length>=b.length)i++;
      if(b.length>=a.length)j++;
    }
    return errors+(a.length-i)+(b.length-j)<=1;
  }
  let pending;
  async function index(catalogue){
    if(!pending)pending=(async()=>{
      const results=await Promise.allSettled(venues.map(catalogue));
      const entries=[];
      results.forEach((result,i)=>{
        if(result.status!=='fulfilled')return;
        for(const row of result.value.values()){
          const full=clean(row.name);
          const phrases=[full,clean(row.name.split(' (')[0]),...((synonyms[row.id]||[]).map(clean))];
          if(venues[i]==='sabzi'&&hindiProduce[row.id])phrases.push(clean(hindiProduce[row.id]));
          const hints=[row.id,row.category||'',row.section||''].join(' ');
          entries.push({id:row.id,scene:venues[i],row,phrases,words:new Set(tokens(phrases.join(' '))),hints:new Set(tokens(hints))});
        }
      });
      if(!entries.length)throw Error('no catalogue');
      return {entries,partial:results.some(r=>r.status!=='fulfilled')};
    })().catch(e=>{pending=null;throw e;});
    const result=await pending;
    if(result.partial)pending=null;
    return result;
  }
  async function search(text,place,catalogue){
    const {entries,partial}=await index(catalogue);
    const locationHints={sabzi:/\b(?:vegetables?|produce|sabzi mandi)\b|सब्ज़ियाँ|सब्जियां|सब्जी मंडी/i,counter:/\b(?:bakery|bakehouse)\b|बेकरी/i,
      grocery:/\b(?:grocery|groceries)\b|किराना/i,shelf:/\b(?:urc|canteen)\b|कैंटीन/i};
    const location=Object.entries(locationHints).find(([,re])=>re.test(text));
    const rest=location?text.replace(location[1],' '):text;
    const query=clean(rest).split(' ').filter(t=>t&&!stop.has(t)&&!/^\d+(?:kg|gm|g)?$/.test(t)).map(singular);
    if(!query.length){
      const range=/cheapest|cheaper|under|below|budget|सस्त|बजट/i.test(text);
      const scope=location?.[0]||place;
      return {hits:range?entries.filter(e=>scope==='plaza'||e.scene===scope):[],partial};
    }
    const key=query.join(' ');
    const ranked=[];
    for(const e of entries){
      if(location&&e.scene!==location[0])continue;
      const exact=e.phrases.includes(key);
      let score=0,matched=0;
      for(const word of query){
        const points=e.words.has(word)?8:e.hints.has(word)?4:[...e.words].some(w=>near(w,word))?3:0;
        if(points){matched++;score+=points;}
      }
      if(!exact&&matched!==query.length)continue;
      ranked.push({e,exact,score:score+(exact?60:0)+(e.scene===place?1:0)});
    }
    ranked.sort((a,b)=>b.score-a.score||a.e.row.name.localeCompare(b.e.row.name));
    const exact=ranked.some(r=>r.exact);
    return {hits:ranked.filter(r=>!exact||r.exact).map(r=>r.e),partial};
  }
  return {search,index,clean,hindiProduce};
})();
