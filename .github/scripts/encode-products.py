"""Encode generated atlas PNGs to WebP and record alpha bounds; pixels are not retouched."""
from pathlib import Path
from PIL import Image
import hashlib,json
w=Path('.')
plan=json.loads((w/'photographic-source/plan.json').read_text());dest=w/'complex/shared/products';dest.mkdir(parents=True,exist_ok=True)
manifest={'version':'photographic-products-20261115','disclosure':'AI-generated product illustrations; appearance may differ from actual stock. Supplied product photos take precedence.','venues':{}}
for sheet in plan:
 if sheet['status']!='generated_reviewed':continue
 source=w/sheet['source'];im=Image.open(source).convert('RGBA');target=dest/(sheet['id']+'.webp')
 im.save(target,'WEBP',quality=82,method=6)
 alpha=im.getchannel('A');cw,ch=im.width//4,im.height//2
 venue=manifest['venues'].setdefault(sheet['venue'],{'sheets':[],'items':{}});venue['sheets'].append({'file':target.name,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest()})
 for idx,item in enumerate(sheet['items']):
  x,y=idx%4*cw,idx//4*ch
  box=alpha.crop((x,y,x+cw,y+ch)).point(lambda a:255 if a>32 else 0).getbbox()
  assert box,'Empty product '+item['id']
  l,t,r,b=box;venue['items'][item['id']]={'sheet':target.name,'rect':[x+l,y+t,r-l,b-t],'generated':True}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({v:{'items':len(d['items']),'sheets':len(d['sheets']),'bytes':sum(s['bytes'] for s in d['sheets'])} for v,d in manifest['venues'].items()}))
