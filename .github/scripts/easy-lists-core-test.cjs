const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const base=path.resolve(process.argv[2]||path.join(__dirname,'site'));
const C=require(path.join(base,'complex/shared/easy-lists-core.js'));
const old={id:'soap',name:'Soap 125 g',unit:'pack',price:25,status:'in',quantity:2};
const current={...old};
assert.deepEqual({...C.cart({soap:2,x:-1,y:100,z:'2',half:.5},'urc')},{soap:2});
assert.equal(C.cart({rice:.75},'grocery').rice,.75);
assert.equal(Object.keys(C.cart(JSON.parse('{"__proto__":2,"constructor":1}'),'urc')).length,0);
assert.equal(C.cleanRows([old,old,null,{id:'x',quantity:NaN}],'urc').length,1);
const review=C.compare([old],[current],{soap:1},'urc');assert.equal(review[0].checked,true);assert.equal(review[0].target,2);
assert.equal(C.merge({soap:1},review,['soap'],'urc').soap,2);
assert.equal(C.merge({soap:9},review,['soap'],'urc').soap,9);
assert(C.same(C.merge({soap:2},review,['soap'],'urc'),{soap:2},'urc'));
const price=C.compare([old],[{...current,price:30}],{},'urc')[0];assert.equal(price.reason,'price');assert.equal(price.checked,false);assert.equal(price.eligible,true);
for(const [items,reason] of [[[],'missing'],[[{...current,name:'Soap 100 g'}],'identity'],[[{...current,status:'out'}],'unavailable']]){const row=C.compare([old],items,{},'urc')[0];assert.equal(row.reason,reason);assert.equal(row.eligible,false);assert.equal(Object.keys(C.merge({},[row],['soap'],'urc')).length,0);}
assert.equal(C.compare([old],[{...current,price:null}],{},'urc')[0].checked,false);assert.equal(C.compare([old],[{...current,qty:0}],{},'urc')[0].eligible,false);assert.equal(C.compare([old],[{...current,unit:'each'}],{},'grocery')[0].reason,'identity');
const rice={id:'rice',name:'Rice loose',unit:'kg',price:31.17,status:'in',quantity:.75};
assert.equal(C.total([rice]).paise,2338);assert.equal(C.merge({},C.compare([rice],[rice],{},'grocery'),['rice'],'grocery').rice,.75);
assert.equal(C.total([{...rice,price:null}]).unknown,1);
const saved={id:'one',name:' Monthly essentials ',createdAt:'2026-11-15T10:00:00Z',shops:{urc:[old],grocery:[rice]}};
assert.equal(C.cleanSaved([saved,saved,null])[0].name,'Monthly essentials');assert.equal(C.cleanSaved([saved,saved]).length,1);assert.equal(C.cleanSaved([{...saved,shops:{}}]).length,0);assert.equal(C.cleanSaved({}).length,0);
for(const f of ['easy.js','easy-lists-core.js','easy-lists.js','easy-offline.js']){const code=fs.readFileSync(path.join(base,'complex/shared',f),'utf8');new vm.Script(code);if(process.env.NODE_PATH)require('acorn').parse(code,{ecmaVersion:2018});}
console.log('PASS: named-list validation, identity and availability review, changed-price consent, idempotent missing-quantity merge, fractional totals and ES2018 syntax.');

const digest=require('node:crypto').createHash('sha256');for(const name of ['easy.html','easy-core.js','easy-lists-core.js','easy-lists.js','easy.js']){digest.update(name+'\0');digest.update(fs.readFileSync(path.join(base,'complex/shared',name)));digest.update('\0');}const version=digest.digest('hex').slice(0,20);assert(fs.readFileSync(path.join(base,'complex/shared/easy-offline.js'),'utf8').includes("kalimpong-easy-shell-"+version), 'Offline shell changed: run python .github/scripts/easy-stamp-offline.py .');
