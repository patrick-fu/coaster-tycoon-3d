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
  session=(await call('Target.attachToTarget',{'targetId':target,'flatten':True}))['sessionId']
  try:
   await call('Runtime.enable',{},session)
   await call('Emulation.setDeviceMetricsOverride',{'width':1920,'height':1080,'deviceScaleFactor':1,'mobile':False},session)
   await call('Page.navigate',{'url':'http://127.0.0.1:4175/check.html'},session)
   result=None
   for n in range(180):
    await asyncio.sleep(.25)
    reply=await call('Runtime.evaluate',{'expression':'document.getElementById("browser-check-result")?.textContent','returnByValue':True},session)
    value=reply.get('result',{}).get('value')
    if value:result=json.loads(value);break
   if result is None:
    diagnostic=await call('Runtime.evaluate',{'expression':'JSON.stringify({body:document.body.textContent,inert:document.body.inert,cash:document.getElementById("cash")?.textContent})','returnByValue':True},session)
    raise RuntimeError('Browser check produced no terminal result: '+str(diagnostic)+'; exceptions: '+str(page_errors))
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
   (evidence/'browser-check-result.json').write_text(json.dumps(result,indent=2))
   print('Actual IndexedDB page reload passed',flush=True)
  finally:await call('Target.closeTarget',{'targetId':target})
asyncio.run(run())
