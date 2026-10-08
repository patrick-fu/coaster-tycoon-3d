"""Verify the existing remote Chrome tab environment without creating a profile."""
import asyncio,base64,json,pathlib,urllib.request
import websockets
root=pathlib.Path.cwd();evidence=root.parent/'evidence'
async def run():
 browser=json.load(urllib.request.urlopen('http://127.0.0.1:9227/json/version'))
 async with websockets.connect(browser['webSocketDebuggerUrl'],max_size=8*1024*1024) as ws:
  seq=0;page_errors=[]
  async def call(method,params={},session=None):
   nonlocal seq
   seq+=1;current=seq;message={'id':current,'method':method,'params':params}
   if session:message['sessionId']=session
   await ws.send(json.dumps(message))
   while True:
    response=json.loads(await asyncio.wait_for(ws.recv(),timeout=15))
    if response.get('method')=='Runtime.exceptionThrown':page_errors.append(response.get('params'))
    if response.get('id')==current:
     if 'error' in response:raise RuntimeError(response['error'])
     return response.get('result',{})
  target=(await call('Target.createTarget',{'url':'about:blank'}))['targetId']
  closed=0
  for n in range(20):
   targets=(await call('Target.getTargets'))['targetInfos']
   restored=[t for t in targets if t['type']=='page' and t['targetId']!=target and (t['url'].startswith('http://127.0.0.1:4175/') or t['url'].startswith('https://patrick-fu.github.io/coaster-tycoon-3d/'))]
   for t in restored:
    await call('Target.closeTarget',{'targetId':t['targetId']});closed+=1
   if n>=3 and not restored:break
   await asyncio.sleep(.25)
  print('Closed restored task-owned preview tabs: '+str(closed),flush=True)
  session=(await call('Target.attachToTarget',{'targetId':target,'flatten':True}))['sessionId']
  try:
   await call('Runtime.enable',{},session)
   await call('Network.enable',{},session)
   await call('Network.setCacheDisabled',{'cacheDisabled':True},session)
   await call('Emulation.setDeviceMetricsOverride',{'width':1920,'height':1080,'deviceScaleFactor':1,'mobile':False},session)
   await call('Page.navigate',{'url':'http://127.0.0.1:4175/check.html'},session)
   result=None
   for n in range(600):
    await asyncio.sleep(.25)
    reply=await call('Runtime.evaluate',{'expression':'document.getElementById("browser-check-result")?.textContent','returnByValue':True},session)
    value=reply.get('result',{}).get('value')
    if value:result=json.loads(value);break
   if result is None:
    diagnostic=await call('Runtime.evaluate',{'expression':'JSON.stringify({check:window.browserCheckEvidence,body:document.body.textContent,inert:document.body.inert,cash:document.getElementById("cash")?.textContent})','returnByValue':True},session)
    raise RuntimeError('Browser check produced no terminal result: '+str(diagnostic)+'; exceptions: '+str(page_errors))
   result['closedRestoredTaskTabs']=closed
   (evidence/'browser-check-result.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2),flush=True)
   image=await call('Page.captureScreenshot',{'format':'png'},session)
   (evidence/'classic-checked.png').write_bytes(base64.b64decode(image['data']))
   if not result.get('ok'):raise RuntimeError(result.get('failure'))
   await call('Page.navigate',{'url':'http://127.0.0.1:4175/'},session)
   recovered=False
   expression='''(async()=>{const game=await import('./game.js');const s=JSON.parse(await game.request('save',null));return {paused:s.paused,probe:s.rides.some(r=>r.name==='Browser Probe'),path:s.elements.some(e=>e.kind==='path'&&e.tile.x===23&&e.tile.y===12),rendered:game.scene.elements?.some(e=>e.kind==='path'&&e.tile.x===23&&e.tile.y===12),feedback:document.getElementById('feedback').textContent};})()'''
   for n in range(100):
    await asyncio.sleep(.1)
    reply=await call('Runtime.evaluate',{'expression':expression,'returnByValue':True,'awaitPromise':True},session)
    observed=reply.get('result',{}).get('value')
    if observed and observed.get('paused') and observed.get('probe') and observed.get('path') and observed.get('rendered'):
     recovered=True;break
   if not recovered:raise RuntimeError('Actual IndexedDB reload did not recover static scenery: '+str(observed))
   result['checks'].append('Actual page reload restores IndexedDB buildings and live state')
   async def evaluate(expression):
    reply=await call('Runtime.evaluate',{'expression':expression,'returnByValue':True,'awaitPromise':True},session)
    if 'exceptionDetails' in reply:raise RuntimeError(reply['exceptionDetails'])
    return reply.get('result',{}).get('value')
   read_slot="(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('coaster-tycoon-3d',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const value=await new Promise((resolve,reject)=>{const r=db.transaction('parks').objectStore('parks').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();return value;})()"
   original=await evaluate(read_slot)
   await call('Page.navigate',{'url':'http://127.0.0.1:4175/?showcase=classic'},session)
   for n in range(150):
    await asyncio.sleep(.1)
    if await evaluate('document.readyState==="complete"&&!document.body.inert'):break
   else:raise RuntimeError('Showcase startup did not complete')
   # The default profile may contain an earlier saved showcase.
   demo=await evaluate("(async()=>{const game=await import('./game.js');await game.request('new-park',null);await game.execute({type:'set-paused',paused:true});await game.refresh(true);const s=JSON.parse(await game.request('save',null));document.getElementById('save').click();return {rides:s.rides.length,probe:s.rides.some(r=>r.name==='Browser Probe'),scenery:s.elements.filter(e=>e.kind==='scenery').length};})()")
   for n in range(100):
    await asyncio.sleep(.1)
    if await evaluate("document.getElementById('feedback').textContent==='Your park has been saved in this browser.'"):break
   else:raise RuntimeError('Showcase save did not finish')
   if demo!={'rides':3,'probe':False,'scenery':116} or await evaluate(read_slot)!=original:raise RuntimeError('Showcase replaced the saved player park: '+str(demo))
   result['checks'].append('Fresh showcase and its save preserve the existing player park')
   await call('Page.navigate',{'url':'http://127.0.0.1:4175/'},session)
   for n in range(150):
    await asyncio.sleep(.1)
    if await evaluate('document.readyState==="complete"&&!document.body.inert'):break
   else:raise RuntimeError('Player park startup did not complete')
   if await evaluate("(async()=>{const game=await import('./game.js');return game.request('save',null);})()")!=original:raise RuntimeError('Player park did not resume after the showcase')
   result['checks'].append('Leaving the showcase resumes the unchanged saved player park')
   (evidence/'browser-check-result.json').write_text(json.dumps(result,indent=2))
   print('Actual IndexedDB reload and separate showcase save passed',flush=True)
  finally:await call('Target.closeTarget',{'targetId':target})
asyncio.run(run())
