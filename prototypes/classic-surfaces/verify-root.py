"""Verify the regular public entry's actual source and live surface materials."""
import asyncio,hashlib,json,pathlib,subprocess,urllib.request
import websockets

ROOT=pathlib.Path('/workspace/coaster-surface-materials')
OUT=ROOT/'evidence/public'
CHROME='/workspace/coaster-content-identity/chrome-linux64/chrome'
URL='https://patrick-fu.github.io/coaster-tycoon-3d/?showcase=classic'

async def run():
 process=subprocess.Popen([CHROME,'--headless=new','--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-startup-window','--user-data-dir=/home/box/.config/google-chrome','--remote-debugging-address=127.0.0.1','--remote-debugging-port=9227'],stdout=(OUT/'root-chrome.log').open('w'),stderr=subprocess.STDOUT)
 try:
  for _ in range(100):
   try:browser=json.load(urllib.request.urlopen('http://127.0.0.1:9227/json/version',timeout=1));break
   except Exception:await asyncio.sleep(.1)
  else:raise RuntimeError('Default-profile Chrome unavailable')
  async with websockets.connect(browser['webSocketDebuggerUrl'],max_size=16*1024*1024) as ws:
   seq=0;errors=[]
   async def call(method,params=None,session=None):
    nonlocal seq
    seq+=1;current=seq;message={'id':current,'method':method,'params':params or {}}
    if session:message['sessionId']=session
    await ws.send(json.dumps(message))
    while True:
     response=json.loads(await asyncio.wait_for(ws.recv(),60))
     if response.get('method')=='Runtime.exceptionThrown':errors.append(response['params'])
     if response.get('id')==current:
      if 'error' in response:raise RuntimeError(response['error'])
      return response.get('result',{})
   if any(t['type']=='page' for t in (await call('Target.getTargets'))['targetInfos']):raise RuntimeError('Existing default-profile page must be preserved')
   target=(await call('Target.createTarget',{'url':'about:blank'}))['targetId']
   session=(await call('Target.attachToTarget',{'targetId':target,'flatten':True}))['sessionId']
   await call('Runtime.enable',session=session);await call('Network.enable',session=session);await call('Network.setCacheDisabled',{'cacheDisabled':True},session)
   await call('Emulation.setDeviceMetricsOverride',{'width':1280,'height':800,'deviceScaleFactor':1,'mobile':False},session)
   await call('Page.navigate',{'url':URL},session)
   async def evaluate(expression):
    result=await call('Runtime.evaluate',{'expression':expression,'returnByValue':True,'awaitPromise':True},session)
    if 'exceptionDetails' in result:raise RuntimeError(result['exceptionDetails'])
    return result.get('result',{}).get('value')
   for _ in range(200):
    if await evaluate('document.readyState==="complete"&&!document.body.inert'):break
    await asyncio.sleep(.1)
   else:raise RuntimeError('Regular public park failed to become ready')
   result=await evaluate("""(async()=>{const g=await import('./game.js');await Promise.all([g.scene.surfaceAssets.readyPromise,g.scene.treeAssets.readyPromise]);if(!g.scene.surfaceAssets.ready||!g.scene.treeAssets.ready)throw Error('Actual surface/tree resources failed');const build=await(await fetch('./build.json',{cache:'no-store'})).json(),directory=await g.request('catalogue',null),saved=JSON.parse(await g.request('save',null));g.scene.renderer.render(g.scene.scene,g.scene.camera);const bindings=['ground','path','queue'].map(role=>{const key={ground:'mat-ground-turf',path:'mat-path-public-deck',queue:'mat-path-queue-deck'}[role],m=g.scene.art.material(key),p=g.scene.surfaceAssets.palette[role];let users=0;g.scene.staticGroup.traverse(o=>{if(o.isMesh&&o.material===m)users+=o.isInstancedMesh?o.count:1;});return {role,users,bound:m.map===p.map&&m.normalMap===p.normalMap&&m.roughnessMap===p.roughnessMap};});return {build,saveVersion:saved.version,contentVersion:saved.contentVersion,protocolVersion:g.scene.packet.protocolVersion,metresPerTile:g.scene.packet.coordinates.metresPerTile,assets:g.scene.surfaceAssets.status(),bindings,catalogueVersion:directory.contentVersion,glError:g.scene.renderer.getContext().getError(),triangles:g.scene.renderer.info.render.triangles};})()""")
   assert result['build']['sourceCommit']=='9e944dd798584af3d2619e05fc39d5ba60f20e28'
   assert result['saveVersion']==8 and result['contentVersion']==1 and result['protocolVersion']==1 and result['metresPerTile']==4
   assert result['assets']=={'ready':True,'error':None,'textures':6,'bitmaps':6,'disposed':False}
   assert all(b['users']>0 and b['bound'] for b in result['bindings']) and result['glError']==0 and result['triangles']>0
   assert not errors
   result.update({'passed':True,'url':URL,'browserVersion':browser['Browser'],'exceptions':errors,'scope':'Actual regular public bootstrap, source/version/geometry-profile and live materials; softwareWebGL only'})
   (OUT/'root.json').write_text(json.dumps(result,indent=2)+'\n')
   print(json.dumps({'passed':True,'sourceCommit':result['build']['sourceCommit'],'actualLiveBindings':result['bindings'],'exceptions':len(errors)}),flush=True)
   await call('Target.closeTarget',{'targetId':target});await call('Browser.close')
 finally:
  if process.poll() is None:
   process.terminate()
   try:process.wait(timeout=5)
   except subprocess.TimeoutExpired:process.kill();process.wait()

asyncio.run(run())
