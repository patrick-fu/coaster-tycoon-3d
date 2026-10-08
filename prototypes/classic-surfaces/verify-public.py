"""Check source-pinned root/preview HTTP bytes, then the real public material scene."""
import concurrent.futures,hashlib,json,pathlib,subprocess,urllib.request

ROOT=pathlib.Path('/workspace/coaster-surface-materials')
OUT=ROOT/'evidence/public';OUT.mkdir(exist_ok=True)
manifest=json.loads((ROOT/'evidence/public-files.json').read_text())

def check(record):
 url=manifest['base']+record['path']+'?source='+manifest['sourceCommit']
 with urllib.request.urlopen(url,timeout=60) as response:
  data=response.read();observed={'path':record['path'],'status':response.status,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
 if observed['status']!=200 or observed['bytes']!=record['bytes'] or observed['sha256']!=record['sha256']:
  raise RuntimeError('Public file mismatch: '+json.dumps(observed))
 return observed

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 records=list(pool.map(check,manifest['files']))
result={'passed':True,'sourceCommit':manifest['sourceCommit'],'sourceMergeCommit':manifest['sourceMergeCommit'],
        'base':manifest['base'],'pinned':manifest['pinned'],'files':records,'bytes':sum(r['bytes'] for r in records)}
(OUT/'http.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'httpPassed':True,'files':len(records),'bytes':result['bytes']}),flush=True)
subprocess.run(['/workspace/coaster-content-library/check-venv/bin/python',str(ROOT/'capture-public.py')],check=True)
