"""Run the actual app and IndexedDB recovery controls on Grok Bot only."""
import argparse
import asyncio
import hashlib
import json
import pathlib
import subprocess
import urllib.request
import websockets

MODE = argparse.ArgumentParser()
MODE.add_argument('--mode', choices=['green'], required=True)
mode = MODE.parse_args().mode
ROOT = pathlib.Path('/workspace/coaster-consumables/storage-check')
APP = ROOT / 'stage'
OUT = ROOT / 'evidence' / 'storage-r1'
CHROME = '/workspace/coaster-content-identity/chrome-linux64/chrome'
NEW_SHA = '6d429cff46bde002b0b2a9f984d3ed50953033ae6f5821fb51adf13f9ecb009a'
KEYS = ['showcase-classic-v12', 'showcase-classic-v11', 'showcase-classic-v10', 'showcase-classic-v9', 'showcase-classic']


async def main():
 OUT.mkdir(parents=True, exist_ok=True)
 game_file = APP / 'game.js'
 original_source = game_file.read_bytes()
 assert hashlib.sha256(original_source).hexdigest() == NEW_SHA
 probe = APP / 'storage-control.html'
 assert not probe.exists()
 probe.write_text('<!doctype html><link rel="icon" href="data:,"><title>Owned IndexedDB controls</title>')
 chrome_log = (OUT / 'chrome.log').open('w')
 server_log = (OUT / 'server.log').open('w')
 server = subprocess.Popen(['/usr/bin/python3', '-m', 'http.server', '8769', '--bind', '127.0.0.1', '--directory', str(APP)], stdout=server_log, stderr=subprocess.STDOUT)
 browser = subprocess.Popen([CHROME, '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-startup-window', '--user-data-dir=/home/box/.config/google-chrome', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=9237'], stdout=chrome_log, stderr=subprocess.STDOUT)
 proof = {'scope': 'Actual working save12/content5/protocol5 app/worker/IndexedDB, default Chrome profile and software rendering. Only the production 60s quiet callback is accelerated to 500ms. No Flume presentation, representative GPU, original or human acceptance.', 'mode': mode, 'gameSha256': NEW_SHA, 'checks': [], 'exceptions': [], 'consoleErrors': []}
 try:
  for _ in range(100):
   try:
    endpoint = json.load(urllib.request.urlopen('http://127.0.0.1:9237/json/version', timeout=1))
    break
   except Exception:
    await asyncio.sleep(.1)
  else:
   raise RuntimeError('Task-owned default-profile Chrome did not start')
  async with websockets.connect(endpoint['webSocketDebuggerUrl'], max_size=64*1024*1024) as ws:
   serial = 0
   async def call(method, params=None, session=None):
    nonlocal serial
    serial += 1
    current = serial
    message = {'id': current, 'method': method, 'params': params or {}}
    if session:
     message['sessionId'] = session
    await ws.send(json.dumps(message))
    while True:
     reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=60))
     event, data = reply.get('method'), reply.get('params', {})
     if event == 'Runtime.exceptionThrown':
      proof['exceptions'].append(data)
     if event == 'Runtime.consoleAPICalled' and data.get('type') == 'error':
      proof['consoleErrors'].append(data)
     if reply.get('id') == current:
      if 'error' in reply:
       raise RuntimeError(str(reply['error']))
      return reply.get('result', {})
   target = (await call('Target.createTarget', {'url': 'about:blank'}))['targetId']
   session = (await call('Target.attachToTarget', {'targetId': target, 'flatten': True}))['sessionId']
   for method in ['Page.enable', 'Runtime.enable', 'Network.enable']:
    await call(method, session=session)
   await call('Network.setCacheDisabled', {'cacheDisabled': True}, session)
   await call('Emulation.setDeviceMetricsOverride', {'width': 1440, 'height': 900, 'deviceScaleFactor': 1, 'mobile': False}, session)
   await call('Page.addScriptToEvaluateOnNewDocument', {'source': 'window.__quiet=0;const originalInterval=setInterval;window.setInterval=(fn,ms,...args)=>ms===60000?originalInterval(()=>{window.__quiet++;fn(...args)},500):originalInterval(fn,ms,...args);'}, session)
   async def evaluate(expression):
    reply = await call('Runtime.evaluate', {'expression': expression, 'awaitPromise': True, 'returnByValue': True}, session)
    if 'exceptionDetails' in reply:
     raise RuntimeError(str(reply['exceptionDetails']))
    return reply.get('result', {}).get('value')
   async def navigate(url, app=True):
    destination = 'http://127.0.0.1:8769/' + url
    await call('Page.navigate', {'url': destination}, session)
    for _ in range(300):
     if await evaluate('location.href===' + json.dumps(destination) + "&&document.readyState==='complete'" + ('&&!document.body.inert' if app else '')):
      if app:
       await evaluate("(async()=>{window.__game=await import('./game.js');return true})()")
      return
     await asyncio.sleep(.1)
    raise RuntimeError('Actual storage page did not become ready')
   async def records():
    return await evaluate("(async()=>{const d=await new Promise((res,rej)=>{const r=indexedDB.open('coaster-tycoon-3d',1);r.onupgradeneeded=()=>r.result.createObjectStore('parks');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}),s=d.transaction('parks').objectStore('parks'),all=await Promise.all(" + json.dumps(KEYS) + ".map(key=>new Promise((res,rej)=>{const r=s.get(key);r.onsuccess=()=>res(r.result===undefined?{missing:true}:{value:r.result});r.onerror=()=>rej(r.error)})));d.close();return all})()")
   async def all_records():
    return await evaluate("(async()=>{const d=await new Promise((a,b)=>{const r=indexedDB.open('coaster-tycoon-3d',1);r.onsuccess=()=>a(r.result);r.onerror=()=>b(r.error)}),s=d.transaction('parks').objectStore('parks'),get=r=>new Promise((a,b)=>{r.onsuccess=()=>a(r.result);r.onerror=()=>b(r.error)}),v=await Promise.all([get(s.getAllKeys()),get(s.getAll())]);d.close();return v[0].map((k,i)=>[k,v[1][i]])})()")
   async def set_records(values):
    await evaluate("(async()=>{const values=" + json.dumps(values) + ",d=await new Promise((res,rej)=>{const r=indexedDB.open('coaster-tycoon-3d',1);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});await new Promise((res,rej)=>{const t=d.transaction('parks','readwrite'),s=t.objectStore('parks');" + json.dumps(KEYS) + ".forEach((key,i)=>values[i].missing?s.delete(key):s.put(values[i].value,key));t.oncomplete=res;t.onerror=()=>rej(t.error)});d.close();return true})()")
   async def quiet():
    before = await evaluate('window.__quiet')
    for _ in range(100):
     if await evaluate('window.__quiet') >= before + 2:
      await asyncio.sleep(.2)
      return await evaluate('window.__quiet')
     await asyncio.sleep(.1)
    raise RuntimeError('Actual production quiet callbacks did not run')
   async def load_records(values):
    await navigate('storage-control.html', False)
    await set_records(values)
    await navigate('?showcase=classic')
   async def import_text(text):
    return await evaluate("(async()=>{const input=document.getElementById('import-file'),transfer=new DataTransfer();transfer.items.add(new File([" + json.dumps(text) + "],'park.json',{type:'application/json'}));input.files=transfer.files;await input.onchange({target:input});return document.getElementById('feedback').textContent})()")
   await navigate('storage-control.html', False)
   original_records = await records()
   original_all = await all_records()
   (OUT/'original-all-records.json').write_text(json.dumps(original_all,indent=2)+'\n')
   (OUT / 'original-records.json').write_text(json.dumps(original_records, indent=2) + '\n')
   missing = {'missing': True}
   invalid = {'value': '{"version":999}'}
   try:
    await load_records([missing]*5)
    await evaluate("__game.execute({type:'set-paused',paused:true})")
    valid = await evaluate("__game.request('save',null)")
    latest = json.loads(valid)
    assert latest['version'] == 12 and latest['contentVersion'] == 5 and latest['boats'] == []
    assert len(latest['rides']) == 5
    proof['checks'].append({'check': 'actual-five-ride-v12-worker', 'rides': 5})
    if mode == 'green':
     historical = await evaluate("(async()=>{const helper=await import('./browser-historical.js');return helper.runHistorical()})()")
     proof['historicalPair'] = historical['evidence']
     (OUT / 'historical-pair.json').write_text(json.dumps(historical['evidence'], indent=2) + '\n')
     for version, text in historical['fixtures'].items():
      (OUT / ('actual-current-chrome-v' + version + '.json')).write_text(text)
    corrupt = [invalid, {'value': valid}, {'value': valid}, {'value': valid}, {'value': 'preserve-legacy-opaque'}]
    await load_records(corrupt)
    assert (await evaluate("document.getElementById('feedback').textContent")).startswith('Saved park was not loaded:')
    await quiet()
    assert await records() == corrupt
    await evaluate("__game.execute({type:'set-paused',paused:true})")
    before = await evaluate("__game.request('save',null)")
    assert (await import_text('{"version":999}')).startswith('Import failed:')
    assert await evaluate("__game.request('save',null)") == before
    await quiet()
    assert await records() == corrupt
    proof['checks'].append({'check': 'corrupt-v12-no-fallback-and-failed-import-keeps-saving-disabled', 'preservedRecords': True})
    assert await import_text(valid) == 'Park imported successfully.'
    await quiet()
    observed = await records()
    recovered = observed == [{'value': valid}, *corrupt[1:]]
    proof['checks'].append({'check': 'valid-import-reenables-real-quiet-autosave', 'recovered': recovered, 'olderSlotsPreserved': observed[1:] == corrupt[1:]})
    assert recovered, 'Valid import left quiet autosave disabled after corrupt startup'
    assert mode == 'green', 'Old source unexpectedly passed the discriminating recovery control'
    for version in [11, 10, 9]:
     older = historical['fixtures'][str(version)]
     proof.setdefault('fixtures', {})['v' + str(version) + '-actual-current-chrome'] = hashlib.sha256(older.encode()).hexdigest()
     slot = 12 - version
     values = [missing]*slot + [{'value': older}] + [{'value': 'opaque-lower-' + str(i)} for i in range(slot+1, 5)]
     await load_records(values)
     saved = await evaluate("__game.request('save',null)")
     assert json.loads(saved)['version'] == 12
     assert await evaluate("(async()=>{const h=await import('./browser-historical.js');return h.projectLegacySave(await __game.request('save',null),"+str(version)+")})()")==older,'Actual worker migrated old fields differ'
     await quiet()
     observed = await records()
     expected = [{'value': saved}, *values[1:]]
     if observed != expected:
      (OUT / ('expected-v' + str(version) + '.json')).write_text(json.dumps(expected, indent=2) + '\n')
      (OUT / ('observed-v' + str(version) + '.json')).write_text(json.dumps(observed, indent=2) + '\n')
      proof['migrationDiagnostic'] = {'version': version, 'feedback': await evaluate("document.getElementById('feedback').textContent"), 'expectedLatestPresent': True, 'observedLatestPresent': not observed[0].get('missing'), 'olderSlotsPreserved': observed[1:] == values[1:]}
     assert observed == expected, 'Exact historical migration records differ; expected/observed retained'
     proof['checks'].append({'check': 'absence-only-real-v' + str(version) + '-migration-new-slot-only'})
    await load_records([missing, missing, missing, missing, {'value': valid}])
    await quiet()
    assert await records() == [{'value': valid}, missing, missing, missing, {'value': valid}]
    proof['checks'].append({'check': 'four-versioned-absent-unversioned-slot-read-new-slot-only'})
    corrupt_cases = [('defined-null-v12', [{'value':None}] + [{'value':valid}]*4)]
    for slot,version in [(1,11),(2,10),(3,9),(4,'unversioned')]:
     corrupt_cases.append(('defined-corrupt-'+str(version),[missing]*slot+[invalid]+[{'value':valid}]*(4-slot)))
    for label, values in corrupt_cases:
     await load_records(values)
     assert (await evaluate("document.getElementById('feedback').textContent")).startswith('Saved park was not loaded:')
     await quiet()
     assert await records() == values
     proof['checks'].append({'check': label, 'preservedRecords': True})
    await load_records([{'value': valid}, missing, missing, missing, missing])
    before = await evaluate("__game.request('save',null)")
    assert (await import_text('{"version":999}')).startswith('Import failed:')
    assert await evaluate("__game.request('save',null)") == before
    receipt = await evaluate("__game.execute({type:'set-park-open',open:false})")
    assert receipt is not None
    after = await evaluate("__game.request('save',null)")
    assert after != before
    await quiet()
    assert await records() == [{'value': after}, missing, missing, missing, missing]
    proof['checks'].append({'check': 'failed-manual-import-preserves-live-state-and-enabled-autosave'})
    assert not proof['exceptions'] and not proof['consoleErrors']
    proof['passed'] = True
   finally:
    await navigate('storage-control.html', False)
    await set_records(original_records)
    assert await records() == original_records
    restored_all=await all_records()
    (OUT/'restored-all-records.json').write_text(json.dumps(restored_all,indent=2)+'\n')
    assert restored_all==original_all
    proof['originalRecordsRestored'] = True
   await call('Target.closeTarget', {'targetId': target})
   await call('Browser.close')
 except Exception as error:
  proof['passed'] = False
  proof['failure'] = str(error)
  raise
 finally:
  probe.unlink()
  for name, child in [('chrome', browser), ('server', server)]:
   if child.poll() is None:
    child.terminate()
   try:
    child.wait(timeout=10)
   except subprocess.TimeoutExpired:
    child.kill()
    child.wait(timeout=10)
   proof[name + 'Exit'] = child.returncode
  chrome_log.close()
  server_log.close()
  proof['newSourceUnchanged'] = hashlib.sha256(game_file.read_bytes()).hexdigest() == NEW_SHA
  (OUT / 'result.json').write_text(json.dumps(proof, indent=2) + '\n')


asyncio.run(main())
