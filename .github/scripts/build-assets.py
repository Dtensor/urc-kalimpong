"""Reproducible display derivatives. Originals, catalogue, prices and stock are never edited."""
from pathlib import Path
from PIL import Image
import json, hashlib, sys, collections

root=Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()
out=root/'complex/shared/urc-products';out.mkdir(parents=True,exist_ok=True)
items=json.loads((root/'menu.json').read_text())['items']
policy=json.loads((Path(__file__).parent/'photo-policy.json').read_text())
manifest={'version':'urc-products-20261115','items':{}}
original_bytes=0;derivative_bytes=0;seen=set();counts=collections.Counter()
for it in items:
    row={'original':it.get('img','')}
    if it['id'] in policy['withheld']:
        row.update(status='withheld',reason=policy['withheld'][it['id']]);counts['withheld']+=1
    elif not it.get('img'):
        row['status']='missing';counts['missing']+=1
    else:
        src=root/it['img'].split('?')[0].lstrip('/')
        if not src.is_file():raise FileNotFoundError(src)
        raw=src.read_bytes();original_bytes+=len(raw)
        digest=hashlib.sha256(raw).hexdigest()[:20];name=digest+'.webp';target=out/name
        with Image.open(src) as source:
            im=source.convert('RGBA')
            alpha=im.getchannel('A');bbox=alpha.getbbox();transparent=alpha.getextrema()[0]<230
            if transparent and bbox:im=im.crop(bbox)
            im.thumbnail((256,256),Image.Resampling.LANCZOS)
            pixels=list(im.getdata());opaque=[px for px in pixels if px[3]>230]
            rectangular=transparent and len(opaque)/len(pixels)>.90
            color='#'+''.join(f'{int(sum(px[c] for px in opaque)/len(opaque)):02x}' for c in range(3)) if opaque else '#ddd5c4'
            im.save(target,format='WEBP',quality=82,method=3)
            width,height=im.size
        row.update(status='reference',file=name,width=width,height=height,bytes=target.stat().st_size,rect=rectangular,color=color)
        if name not in seen:derivative_bytes+=row['bytes'];seen.add(name)
        counts['reference']+=1
    manifest['items'][it['id']]=row
manifest['summary']={**counts,'catalogueItems':len(items),'uniqueDerivatives':len(seen),'originalReferencedBytes':original_bytes,'derivativeBytes':derivative_bytes}
(out/'manifest.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
report={'version':manifest['version'],'summary':manifest['summary'],'policy':policy,'method':'All public references checked for file existence, dimensions, hashes, source metadata and local OCR. Suspect duplicate groups reviewed visually. Reference status does not certify brand, variant or pack-size accuracy. Originals preserved. 256px WebP shelf derivatives; original image only in product detail.','guidance':['https://web.dev/articles/fetch-priority','https://threejs.org/manual/en/cleanup.html']}
(out/'audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(manifest['summary']))
