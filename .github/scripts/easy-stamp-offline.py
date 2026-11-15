"""Refresh the offline shell version whenever any cached application file changes."""
from pathlib import Path
import hashlib
import re
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / 'site'
shared = root / 'complex/shared'
names = ['easy.html', 'easy-core.js', 'easy-lists-core.js', 'easy-lists.js', 'easy.js']
digest = hashlib.sha256()
for name in names:
    digest.update(name.encode() + b'\0' + (shared / name).read_bytes() + b'\0')
version = digest.hexdigest()[:20]
worker = shared / 'easy-offline.js'
source, count = re.subn(r"const CACHE='kalimpong-easy-shell-[^']+';",
                       "const CACHE='kalimpong-easy-shell-" + version + "';",
                       worker.read_text())
assert count == 1
worker.write_text(source)
print(version)
