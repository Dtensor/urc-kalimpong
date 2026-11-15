"""Build small mobile derivatives from accepted source pixels, with provenance."""
from pathlib import Path
from PIL import Image
import hashlib,json,sys
root=Path(sys.argv[1]).resolve();out=root/'complex/shared/easy-products';out.mkdir(exist_ok=True)
assets=root/'complex/shared/products';atlas=json.loads((assets/'manifest.json').read_text());manifest={'version':'easy-plaza-20261115','items':{}}
for venue in ('bakery','sabzi','grocery'):
 data=json.loads((root/'complex'/venue/'data.json').read_text());spec=atlas['venues'][venue]
 for it in data['items']:
  original=it.get('photo');generated=not bool(original)
  if original:
   src=(root/'complex'/venue/original).resolve();assert src.is_relative_to(root/'complex'/venue);rect=None
  else:
   cell=spec['items'].get(it['id'])
   if not cell:continue
   src=assets/cell['sheet'];rect=cell['rect']
  sourceHash=hashlib.sha256(src.read_bytes()).hexdigest()
  if generated:
   sheet=next(s for s in spec['sheets'] if s['file']==src.name);assert sourceHash==sheet['sha256']
  identity=hashlib.sha256((sourceHash+json.dumps(rect)).encode()).hexdigest()[:20];filename=identity+'.webp'
  with Image.open(src) as im:
   image=im.convert('RGBA')
   if rect:
    x,y,w,h=rect;assert x>=0 and y>=0 and x+w<=image.width and y+h<=image.height;image=image.crop((x,y,x+w,y+h))
   image.thumbnail((256,256),Image.Resampling.LANCZOS);image.save(out/filename,'WEBP',quality=82,method=3)
  manifest['items'][venue+'/'+it['id']]={'name':it['name'],'original':original,'file':filename,'generated':generated,'sourceSha256':sourceHash,'rect':rect,'bytes':(out/filename).stat().st_size}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps({'products':len(manifest['items']),'bytes':sum(x['bytes'] for x in manifest['items'].values()),'suppliedPhotos':sum(not x['generated'] for x in manifest['items'].values())}))
