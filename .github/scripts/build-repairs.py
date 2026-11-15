"""Add reviewed photo corrections to an existing export; never rewrite its catalogue."""
from pathlib import Path
import collections
import hashlib
import json
import shutil
import subprocess
import sys

from PIL import Image

root = Path(sys.argv[1]).resolve()
here = Path(__file__).resolve().parent
review = json.loads((here / 'reviewed-replacements.json').read_text())
source_dir = here / 'sources'
source_dir.mkdir(exist_ok=True)
assets = root / 'complex/shared/urc-products'
manifest = json.loads((assets / 'manifest.json').read_text())
catalogue = root / 'menu.json'
before = hashlib.sha256(catalogue.read_bytes()).hexdigest()
items = {it['id']: it for it in json.loads(catalogue.read_text())['items']}
assert len(items) == 1715
for correction in review['items']:
    assert correction['approved'] is True
    item = items[correction['id']]
    assert item['name'] == correction['name']
    assert item.get('img', '') == correction['original']
    source = source_dir / correction['sourceFile']
    if not source.exists():
        subprocess.run(['curl', '-fsSL', '--max-time', '30', correction['sourceUrl'], '-o', str(source)], check=True)
    raw = source.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == correction['sha256'], f'Source changed: {source.name}'
    digest = correction['sha256'][:20]
    # Preserve the full reference bytes and label. Only the shelf derivative is resized.
    with Image.open(source) as original:
        extension = {'PNG': '.png', 'JPEG': '.jpg', 'WEBP': '.webp'}[original.format]
        full = digest + '-full' + extension
        shutil.copyfile(source, assets / full)
        image = original.convert('RGBA')
        alpha = image.getchannel('A')
        if alpha.getextrema()[0] < 230 and alpha.getbbox():
            image = image.crop(alpha.getbbox())
        image.thumbnail((256, 256), Image.Resampling.LANCZOS)
        name = digest + '.webp'
        image.save(assets / name, format='WEBP', quality=82, method=3)
        width, height = image.size
    manifest['items'][correction['id']] = {
        'original': correction['original'], 'name': correction['name'],
        'status': 'reference', 'replacement': True, 'file': name, 'full': full,
        'width': width, 'height': height, 'bytes': (assets / name).stat().st_size,
        'rect': False, 'color': '#ddd5c4', 'source': correction['productPage'],
        'sourceSha256': correction['sha256'], 'review': correction['visualReview'],
    }
manifest['version'] = review['version']
counts = collections.Counter(row['status'] for row in manifest['items'].values())
names = {row['file'] for row in manifest['items'].values() if row.get('file')}
manifest['summary'].update({**counts, 'reviewedReplacements': len(review['items']),
    'uniqueDerivatives': len(names), 'derivativeBytes': sum((assets / n).stat().st_size for n in names)})
# The old original-byte figure describes the pre-correction audit, not this mixed source set.
manifest['summary']['originalReferencedBytesAtInitialAudit'] = manifest['summary'].pop(
    'originalReferencedBytes', manifest['summary'].get('originalReferencedBytesAtInitialAudit'))
(assets / 'manifest.json').write_text(json.dumps(manifest, separators=(',', ':')) + '\n')
audit = json.loads((assets / 'audit.json').read_text())
audit.update(version=review['version'], summary=manifest['summary'], corrections=review)
audit.setdefault('initialPolicy', audit['policy'])
audit['policy'] = {
    'reviewedAt': review['reviewedAt'],
    'withheld': {key: row['reason'] for key, row in manifest['items'].items() if row['status'] == 'withheld'},
    'reviewedReplacements': [item['id'] for item in review['items']],
    'coverage': {'catalogueItems': len(items), 'missingPhotos': counts['missing'], 'newReferencesVisuallyReviewed': len(review['items'])},
    'limits': review['limits'] + ' Other reference photographs have not all been independently certified for exact variant and pack size.',
}
(assets / 'audit.json').write_text(json.dumps(audit, indent=2) + '\n')
assert hashlib.sha256(catalogue.read_bytes()).hexdigest() == before
print(json.dumps({'summary': manifest['summary'], 'catalogueSha256': before}))
