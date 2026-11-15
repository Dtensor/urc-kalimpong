from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import urlsplit
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,path):
  path=urlsplit(path).path
  if path.startswith('/baseline/'):
   path=path[len('/baseline'):]
   if path=='/mall/' or path=='/mall/index.html':path='/.github/scripts/baseline.html'
  return super().translate_path(path)
ThreadingHTTPServer(('127.0.0.1',8765),Handler).serve_forever()
