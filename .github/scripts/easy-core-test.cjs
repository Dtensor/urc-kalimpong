const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=process.argv[2]||path.join(__dirname,'site'),C=require(path.resolve(base,'complex/shared/easy-core.js'));
const data=JSON.parse(fs.readFileSync(path.join(base,'menu.json'))),manifest=JSON.parse(fs.readFileSync(path.join(base,'complex/shared/urc-products/manifest.json'))),cats=Object.fromEntries(data.categories.map(c=>[c.id,c.label]));
assert.equal(data.items.length,1715);const publicRoot=fs.readFileSync(path.join(base,'index.html'),'utf8');assert(!/\.ts\.net/.test(publicRoot));assert.equal((publicRoot.match(/<script\s+defer\s+src="https:\/\/shala-stats\.shalas\.workers\.dev\/k\.js"><\/script>/g)||[]).length,1);assert(!/shala-stats\.shalas\.workers\.dev\/(?:s|f)\.js/.test(publicRoot));assert(publicRoot.includes('if (!API) return;'));
assert.deepEqual(C.parse('two soaps and toothpaste'),[{raw:'two soaps',query:'soaps',quantity:2,maxPrice:null},{raw:'toothpaste',query:'toothpaste',quantity:1,maxPrice:null}]);
assert.equal(C.parse('मुझे दो साबुन और टूथपेस्ट चाहिए')[0].quantity,2);
assert.equal(C.parse('२ साबुन')[0].quantity,2);assert.equal(C.parse('2 kg atta')[0].quantity,1);
assert.equal(C.parse('tea under ₹200')[0].maxPrice,200);assert.equal(C.parse('साबुन 100 रुपये से कम')[0].maxPrice,100);
assert.equal(C.parse('Head and Shoulders shampoo and soap').length,2);assert.equal(C.parse('Clean & Clear face wash').length,1);assert.equal(C.parse('')[0],undefined);assert.equal(C.parse('soap, tea\nbiscuits').length,3);
for(const q of ['soaps','sabun','साबुन'])assert(C.search(data.items,{query:q},cats).some(x=>x.category==='soap'));
assert(C.search(data.items,{query:'टूथपेस्ट'},cats).some(x=>/toothpaste/i.test(x.name)));
assert(C.search(data.items,{query:'tea',maxPrice:100},cats).every(x=>x.price<=100));
assert.equal(C.search(data.items,{query:'zzzzunknown'},cats).length,0);
const henko=data.items.find(x=>x.id==='henko-detergent-bar');assert(C.photo(henko,manifest,true).endsWith('-full.png'));
assert.equal(C.photo({...henko,name:'other'},manifest,true),'');assert.equal(C.photo({...henko,img:'new.jpg'},manifest,true),'');assert.equal(C.photo(henko,null,true),'');
const ox=data.items.find(x=>x.id==='ariel-oxyblue-2-kg-washing-pow');assert.equal(C.photo(ox,manifest,true),'');
const bad=structuredClone(manifest);bad.items[henko.id].file='../private';assert.equal(C.photo(henko,bad,false),'');
assert.deepEqual({...C.cleanBasket({a:2,b:-2,c:'3',d:101})},{a:2});assert.deepEqual({...C.cleanBasket([])},{});
assert.deepEqual(C.total([{id:'a',price:0.1},{id:'b',price:0.2}],{a:3,b:1}),{paise:50,unknown:0,count:4});assert.equal(C.total([],{a:2}).unknown,1);
for(const name of ['index.html','mall/index.html','complex/shared/easy.html','complex/index.html',...['bakery','sabzi','grocery','cinema'].map(v=>'complex/'+v+'/index.html')]){const html=fs.readFileSync(path.join(base,name),'utf8');for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);}
if(process.env.NODE_PATH){const acorn=require('acorn');for(const name of ['easy-core.js','easy.js'])acorn.parse(fs.readFileSync(path.join(base,'complex/shared',name),'utf8'),{ecmaVersion:2018});}
for(const name of ['easy-core.js','easy.js'])new vm.Script(fs.readFileSync(path.join(base,'complex/shared',name),'utf8'));
assert.deepEqual(C.parseWeighted('500 g potatoes')[0],{raw:'500 g potatoes',query:'potatoes',quantity:.5,maxPrice:null,unit:'kg'});
assert.equal(C.parseWeighted('2 kg rice')[0].quantity,2);assert.equal(C.cleanBasket({a:.5},true).a,.5);assert.equal(C.total([{id:'p',price:30}],{p:.25}).paise,750);assert.deepEqual(C.routes('bread and potatoes').map(r=>r.venue),['bakery','sabzi']);
for(const v of ['bakery','sabzi','grocery']){const raw=JSON.parse(fs.readFileSync(path.join(base,'complex',v,'data.json'))),n=C.normalizeShop(raw);assert.equal(n.sample,true);assert.equal(n.items.length,raw.items.length);for(let i=0;i<raw.items.length;i++)for(const k of Object.keys(raw.items[i]))assert.deepEqual(n.items[i][k],raw.items[i][k]);}
console.log('PASS: catalogue unchanged, phrase parsing, Hindi aliases, price ceiling, pack identity, rejected-photo guard, basket validation, paise totals and scripts.');
