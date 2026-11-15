const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path'),dir=__dirname;
const code=fs.readFileSync(process.argv[2]||path.join(dir,'mall.html'),'utf8');
const functionText=code.slice(code.indexOf('function applyPhotoManifest()'),code.indexOf('\nconst store ='));
const dataRoot=process.argv[3]||path.join(dir,'site');
const base=JSON.parse(fs.readFileSync(path.join(dataRoot,'menu.json'))).items;
const manifest=JSON.parse(fs.readFileSync(path.join(dataRoot,'complex/shared/urc-products/manifest.json')));
function apply(items,photoManifest=manifest){const ctx={DATA:{items:structuredClone(items)},photoManifest};vm.createContext(ctx);vm.runInContext(functionText+'\napplyPhotoManifest();',ctx);return ctx.DATA.items;}
const result=apply(base);let corrected=0;
for(const row of result){const m=manifest.items[row.id];if(m.replacement){assert.equal(row.img,'complex/shared/urc-products/'+m.full);assert.equal(row.shelfImg,m.file);assert.equal(row.photoHeld,false);corrected++;}}
assert.equal(corrected,5);
assert.equal(result.find(x=>x.id==='ariel-oxyblue-2-kg-washing-pow').img,'');
assert.equal(result.filter(x=>x.photoHeld).length,1);
for(const original of base.filter(x=>!x.img))assert.equal(apply([original])[0].img,original.img);
const item=base.find(x=>x.id==='johnson-baby-lotion-200-ml');
for(const changed of [{...item,img:'new-stock-photo.jpg'},{...item,name:'Johnson Baby Lotion 500 ml'}]){const actual=apply([changed])[0];assert.equal(actual.img,changed.img);assert.equal(actual.shelfImg,undefined);}
for(const full of ['../../wrong.jpg','https://outside.invalid/photo.jpg','bad.webp']){const m=structuredClone(manifest);m.items[item.id].full=full;assert.equal(apply([item],m)[0].img,item.img);}
assert.equal(apply([item],null)[0].img,item.img);
const front=manifest.items[item.id].fullFrame;assert.equal(front.length,6);assert.deepEqual([...apply([item])[0].photoFrame],front);
const invalid=structuredClone(manifest);invalid.items[item.id].fullFrame=[0,0,1000,1000,1,1];assert.equal(apply([item],invalid)[0].photoFrame,undefined);
// Exercise the production face visibility through front, reverse, side and tilted views.
const turnText=code.slice(code.indexOf('function turn() {'),code.indexOf('\nfunction drawHand'));
for(const [x,y,visible] of [[0,0,[0]],[0,Math.PI,[1]],[0,-Math.PI/2,[2]],[0,Math.PI/2,[3]],[-Math.PI/4,0,[0,4]],[Math.PI/4,0,[0,5]]]){
 const faces=Array.from({length:6},()=>({style:{}})),object={style:{},dataset:{h:300,w:200,d:40},querySelectorAll:()=>faces};
 const ctx={rot:{x,y},zoom:1,$:id=>id==='#obj'?object:{style:{}}};vm.createContext(ctx);vm.runInContext(turnText+'\nturn();',ctx);
 assert.deepEqual(faces.map((f,i)=>f.style.visibility==='visible'?i:null).filter(i=>i!==null),visible);
}
// Preserve prices, stock and every unrelated property; only display metadata may differ.
for(let i=0;i<base.length;i++)for(const k of Object.keys(base[i]).filter(k=>k!=='img'))assert.equal(result[i][k],base[i][k]);
for(const match of code.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1].trim())new vm.Script(match[1]);
console.log(JSON.stringify({pass:true,items:result.length,corrected,withheld:1,missing:48,checks:['exact identity','stale name and source','invalid replacement paths','manifest absence','unchanged stock and prices','inline syntax']}));
