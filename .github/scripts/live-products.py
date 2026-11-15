import concurrent.futures,hashlib,json,time,urllib.request
from pathlib import Path
rows=json.loads(Path('.github/scripts/live-products.json').read_text())
def check(row):
    url='https://dtensor.github.io/urc-kalimpong/'+row['path']+'?release=2afa7367'
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url,timeout=30) as r:
                data=r.read();status=r.status
            assert hashlib.sha256(data).hexdigest()==row['sha256'],'Content hash differs'
            return {'path':row['path'],'status':status,'bytes':len(data),'hashMatched':True}
        except Exception as e:
            if attempt==2:raise RuntimeError(row['path']+': '+str(e))
            time.sleep(3)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results=list(pool.map(check,rows))
Path('live-product-results.json').write_text(json.dumps(results,indent=2)+'\n')
print('LIVE_PRODUCTS '+json.dumps({'verified':len(results),'allHTTP200':all(r['status']==200 for r in results),'allHashesMatch':all(r['hashMatched'] for r in results),'release':'2afa736788efef678828aab7e5fc63bacd9b5df6'}))
