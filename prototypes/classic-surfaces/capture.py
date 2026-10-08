"""Compare real baseline/candidate surfaces and exercise owned browser resources."""
import asyncio,base64,hashlib,json,pathlib,subprocess,urllib.request
import websockets

ROOT=pathlib.Path('/workspace/coaster-surface-materials')
OUT=ROOT/'evidence/browser';OUT.mkdir(exist_ok=True)
BASE='https://patrick-fu.github.io/coaster-tycoon-3d/previews/classic-98939b7/?showcase=classic'
CANDIDATE='http://127.0.0.1:4175/?showcase=classic'
CHROME='/workspace/coaster-content-identity/chrome-linux64/chrome'
fingerprint="""(async()=>{
 const {scene}=await import('./game.js'),enc=new TextEncoder(),hash=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(v=>v.toString(16).padStart(2,'0')).join('');
 const geometries=new Map(),meshes=[];scene.staticGroup.updateMatrixWorld(true);
 const objects=[];scene.staticGroup.traverse(o=>{if(o.isMesh)objects.push(o);});
 for(const object of objects){
  const geometry=object.geometry;if(!geometries.has(geometry)){
   const buffers=[];for(const [name,a]of Object.entries({...geometry.attributes,index:geometry.index}).sort(([a],[b])=>a.localeCompare(b))){if(a)buffers.push({name,count:a.count,itemSize:a.itemSize,normalized:a.normalized,type:a.array.constructor.name,sha256:await hash(a.array)});}
   geometries.set(geometry,await hash(enc.encode(JSON.stringify(buffers))));
  }
  meshes.push({geometry:geometries.get(geometry),matrix:object.matrixWorld.toArray(),count:object.count??null,instances:object.instanceMatrix?await hash(object.instanceMatrix.array):null,colours:object.instanceColor?await hash(object.instanceColor.array):null,selection:object.userData.selection??null,selections:object.userData.selections??null,ground:!!object.userData.ground});
 }
 const canonical=meshes.map(m=>JSON.stringify(m)).sort();
 return{sha256:await hash(enc.encode(JSON.stringify(canonical))),meshes:objects.length,geometries:geometries.size};
})()"""

async def run():
 server=subprocess.Popen(['python3','-m','http.server','4175','--bind','127.0.0.1','--directory',str(ROOT/'app/web-dist')],stdout=(OUT/'server.log').open('w'),stderr=subprocess.STDOUT)
 chrome=subprocess.Popen([CHROME,'--headless=new','--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-startup-window','--user-data-dir=/home/box/.config/google-chrome','--remote-debugging-address=127.0.0.1','--remote-debugging-port=9227'],stdout=(OUT/'chrome.log').open('w'),stderr=subprocess.STDOUT)
 try:
  for _ in range(100):
   try:browser=json.load(urllib.request.urlopen('http://127.0.0.1:9227/json/version',timeout=1));break
   except Exception:await asyncio.sleep(.1)
  else:raise RuntimeError('Default-profile Chrome unavailable')
  async with websockets.connect(browser['webSocketDebuggerUrl'],max_size=64*1024*1024) as ws:
   seq=0;errors=[];responses={};fault=None;report={'browserVersion':browser['Browser'],'scope':'Software-WebGL source comparison and resource lifecycle; no representative GPU FPS or human visual acceptance','captures':[],'checks':[]}
   async def call(method,params=None,session=None):
    nonlocal seq
    seq+=1;current=seq;message={'id':current,'method':method,'params':params or {}}
    if session:message['sessionId']=session
    await ws.send(json.dumps(message))
    while True:
     response=json.loads(await asyncio.wait_for(ws.recv(),60))
     if response.get('method')=='Runtime.exceptionThrown':errors.append(response['params'])
     if response.get('method')=='Network.responseReceived':
      item=response['params'];responses[item['response']['url']]=item['requestId']
     if response.get('method')=='Fetch.requestPaused':
      seq+=1;p=response['params'];code=404 if fault=='http' else 200
      body=base64.b64encode(b'Intentional finite surface failure fixture').decode()
      await ws.send(json.dumps({'id':seq,'sessionId':response['sessionId'],'method':'Fetch.fulfillRequest','params':{'requestId':p['requestId'],'responseCode':code,'responseHeaders':[{'name':'Content-Type','value':'image/png'}],'body':body}}))
     if response.get('id')==current:
      if 'error' in response:raise RuntimeError(response['error'])
      return response.get('result',{})
   targets=(await call('Target.getTargets'))['targetInfos']
   if any(t['type']=='page' for t in targets):raise RuntimeError('Default profile has an existing page; preserve it')
   target=(await call('Target.createTarget',{'url':'about:blank'}))['targetId']
   session=(await call('Target.attachToTarget',{'targetId':target,'flatten':True}))['sessionId']
   async def evaluate(expression):
    result=await call('Runtime.evaluate',{'expression':expression,'returnByValue':True,'awaitPromise':True},session)
    if 'exceptionDetails' in result:raise RuntimeError(result['exceptionDetails'])
    return result.get('result',{}).get('value')
   async def wait(expression):
    for _ in range(300):
     if await evaluate(expression):return
     await asyncio.sleep(.1)
    raise RuntimeError('Browser condition timed out: '+expression)
   async def capture(name):
    data=await call('Page.captureScreenshot',{'format':'png'},session);raw=base64.b64decode(data['data']);file=OUT/(name+'.png');file.write_bytes(raw)
    report['captures'].append({'file':file.name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
   await call('Runtime.enable',session=session);await call('Page.enable',session=session)
   await call('Network.enable',{'maxTotalBufferSize':64000000,'maxResourceBufferSize':16000000},session)
   await call('Network.setCacheDisabled',{'cacheDisabled':True},session)
   await call('Page.addScriptToEvaluateOnNewDocument',{'source':"""window.surfaceResponses=[];const originalFetch=window.fetch;window.fetch=async(...args)=>{const response=await originalFetch(...args);if(response.url.includes('/textures/surfaces/')){const data=await response.clone().arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',data);window.surfaceResponses.push({url:response.url,status:response.status,bytes:data.byteLength,sha256:Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join('')});}return response;};"""},session)
   await call('Emulation.setDeviceMetricsOverride',{'width':1920,'height':1080,'deviceScaleFactor':1,'mobile':False},session)
   await call('Page.navigate',{'url':BASE},session)
   await wait('document.readyState==="complete"&&!document.body.inert')
   frozen=await evaluate("(async()=>{const g=await import('./game.js');await g.scene.treeAssets.readyPromise;if(!g.scene.treeAssets.ready)throw Error(g.scene.treeAssets.error);await g.execute({type:'set-paused',paused:true});await g.refresh(true);g.scene.overview();g.scene.controls.enableDamping=false;g.scene.controls.update();g.scene.updateTreeLOD();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return await g.request('save',null);})()")
   report['baseline']=await evaluate(fingerprint)
   report['baseline']['render']=await evaluate("(async()=>{const {scene:s}=await import('./game.js');s.renderer.render(s.scene,s.camera);return {memory:{...s.renderer.info.memory},calls:s.renderer.info.render.calls,triangles:s.renderer.info.render.triangles,programs:s.renderer.info.programs.length};})()")
   await capture('baseline-overview')
   await evaluate("(async()=>{const g=await import('./game.js');g.scene.close();g.scene.controls.update();g.scene.updateTreeLOD();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));})()")
   await capture('baseline-close')
   await call('Page.navigate',{'url':CANDIDATE},session)
   await wait('document.readyState==="complete"&&!document.body.inert')
   await evaluate("(async()=>{window.surfaceGame=await import('./game.js');await Promise.all([surfaceGame.scene.surfaceAssets.readyPromise,surfaceGame.scene.treeAssets.readyPromise]);if(!surfaceGame.scene.surfaceAssets.ready)throw Error(surfaceGame.scene.surfaceAssets.error);})()")
   await evaluate("(async()=>{const g=surfaceGame;await g.request('load',"+json.dumps(frozen)+");await g.refresh(true);g.scene.overview();g.scene.controls.enableDamping=false;g.scene.controls.update();g.scene.updateTreeLOD();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));})()")
   assert await evaluate("surfaceGame.request('save',null)")==frozen,'Candidate changed the frozen simulation'
   report['candidate']=await evaluate(fingerprint)
   assert report['candidate']=={k:v for k,v in report['baseline'].items() if k!='render'},'Static geometry/placement/selection correspondence failed'
   report['checks'].append('Exact frozen version8 save plus full static vertex/index/instance colour/matrix/selection correspondence with published baseline')
   report['candidate']['render']=await evaluate("(()=>{const s=surfaceGame.scene;s.renderer.render(s.scene,s.camera);const maps=[s.surfaceAssets.palette.ground,s.surfaceAssets.palette.path,s.surfaceAssets.palette.queue].map(m=>({colour:m.color,metalness:m.metalness,normalScale:m.normalScale.toArray(),maps:[m.map,m.normalMap,m.roughnessMap].map(t=>({name:t.name,colourSpace:t.colorSpace,repeat:t.repeat.toArray(),flipY:t.flipY,width:t.image.width,height:t.image.height}))}));return {memory:{...s.renderer.info.memory},calls:s.renderer.info.render.calls,triangles:s.renderer.info.render.triangles,programs:s.renderer.info.programs.length,assets:s.surfaceAssets.status(),maps,glError:s.renderer.getContext().getError()};})()")
   report['candidate']['liveBindings']=await evaluate("""(()=>{const s=surfaceGame.scene,gl=s.renderer.getContext(),roles=[['ground','mat-ground-turf'],['path','mat-path-public-deck'],['queue','mat-path-queue-deck']],bindings=roles.map(([role,key])=>{const m=s.art.material(key),p=s.surfaceAssets.palette[role];let users=0;s.staticGroup.traverse(o=>{if(o.isMesh&&o.material===m)users+=o.isInstancedMesh?o.count:1;});const bound=m.map===p.map&&m.normalMap===p.normalMap&&m.roughnessMap===p.roughnessMap&&m.normalScale.equals(p.normalScale);if(!users||!bound)throw Error('Live material binding missing: '+role);return {role,users,bound,colour:m.color.toArray()};});const shaders=s.renderer.info.programs.map(p=>({linked:gl.getProgramParameter(p.program,gl.LINK_STATUS),compiled:gl.getAttachedShaders(p.program).map(shader=>gl.getShaderParameter(shader,gl.COMPILE_STATUS))}));if(!shaders.every(p=>p.linked&&p.compiled.every(Boolean)))throw Error('Actual surface shader failed to compile/link');return {bindings,shaders};})()""")
   assert report['candidate']['render']['glError']==0
   assert report['candidate']['render']['assets']=={'ready':True,'error':None,'textures':6,'bitmaps':6,'disposed':False}
   report['checks'].append('All six actual maps bind with sRGB albedo, linear normal/roughness and integer tiled repeats')
   report['checks'].append('All three live mesh material roles use the actual maps; every rendered shader compiles and links')
   await capture('candidate-overview')
   await evaluate("(async()=>{surfaceGame.scene.close();surfaceGame.scene.controls.update();surfaceGame.scene.updateTreeLOD();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));})()")
   await capture('candidate-close')
   await call('Emulation.setDeviceMetricsOverride',{'width':1280,'height':800,'deviceScaleFactor':1,'mobile':False},session)
   await evaluate("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))")
   await capture('candidate-narrow')
   report['rebuild']=await evaluate("""(async()=>{const g=surfaceGame,s=g.scene,before=await g.request('save',null),values=[];for(let i=0;i<4;i++){s.setStatic(s.scenery,s.entry);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));values.push({memory:{...s.renderer.info.memory},assets:s.surfaceAssets.status()});}if(await g.request('save',null)!==before)throw Error('Surface rebuild changed saved data');if(!values.every(v=>JSON.stringify(v)===JSON.stringify(values[0])))throw Error('Surface rebuild grew GPU/owned resources');return values;})()""")
   report['checks'].append('Four actual static rebuilds preserve the paused save and warmed GPU/owned resource counts')
   loaded=[]
   for item in json.loads((ROOT/'prepared/manifest.json').read_text())['files']:
    url='http://127.0.0.1:4175/textures/surfaces/'+item['path']
    matches=await evaluate('surfaceResponses.filter(r=>r.url==='+json.dumps(url)+')')
    assert len(matches)==1 and matches[0]['status']==200 and matches[0]['bytes']==item['bytes'] and matches[0]['sha256']==item['sha256'],matches
    loaded.append(matches[0])
   report['loadedNetworkMaps']=loaded
   report['checks'].append('Actual loader fetch Response.clone bytes match all six SHA-pinned derived PNGs')
   for failure in ['http','decode']:
    fault=failure
    await call('Fetch.enable',{'patterns':[{'urlPattern':'*textures/surfaces/grass-normal.png','requestStage':'Request'}]},session)
    await evaluate("(async()=>{const {createSurfaceAssets}=await import('./art/surface-assets.js');window.failedSurfaces=createSurfaceAssets(surfaceGame.scene.renderer);window.surfaceFailureDone=false;failedSurfaces.readyPromise.then(()=>{window.surfaceFailureDone=true;});})()")
    await wait('window.surfaceFailureDone')
    state=await evaluate('failedSurfaces.status()');assert not state['ready'] and state['error'] and state['textures']==0 and state['bitmaps']==0,state
    report[failure+'Failure']=state
    await evaluate('failedSurfaces.dispose()');await call('Fetch.disable',session=session);fault=None
   report['checks'].append('Injected HTTP404 and invalid-PNG responses leave no partially owned textures or bitmaps')
   await call('Network.emulateNetworkConditions',{'offline':False,'latency':1000,'downloadThroughput':15000,'uploadThroughput':1000000},session)
   report['fetchCancellation']=await evaluate("(async()=>{const {createSurfaceAssets}=await import('./art/surface-assets.js');const a=createSurfaceAssets(surfaceGame.scene.renderer);a.dispose();await a.readyPromise;return a.status();})()")
   await call('Network.emulateNetworkConditions',{'offline':False,'latency':0,'downloadThroughput':-1,'uploadThroughput':-1},session)
   assert report['fetchCancellation']=={'ready':False,'error':None,'textures':0,'bitmaps':0,'disposed':True}
   report['decodeCancellation']=await evaluate("""(async()=>{const {createSurfaceAssets}=await import('./art/surface-assets.js');const original=createImageBitmap,pending=[];let open;const gate=new Promise(r=>open=r);window.createImageBitmap=async(...args)=>{const b=await original(...args);pending.push(b);await gate;return b;};let a;try{a=createSurfaceAssets(surfaceGame.scene.renderer);for(let i=0;i<300&&pending.length!==6;i++)await new Promise(r=>setTimeout(r,20));if(pending.length!==6)throw Error('Actual six PNG decodes did not finish');a.dispose();open();await a.readyPromise;const result={status:a.status(),decoded:pending.length,allClosed:pending.every(b=>b.width===0&&b.height===0)};if(!result.allClosed)throw Error('Late decoded bitmap remained open');return result;}finally{open();a?.dispose();window.createImageBitmap=original;}})()""")
   report['checks'].append('Immediate fetch cancellation and artificially delayed real bitmap completions release every owned resource')
   report['sceneDisposal']=await evaluate("""(()=>{const s=surfaceGame.scene,p=s.surfaceAssets.palette,textures=[...new Set([p.ground,p.path].flatMap(m=>[m.map,m.normalMap,m.roughnessMap]))],bitmaps=textures.map(t=>t.image);let count=0;for(const t of textures)t.addEventListener('dispose',()=>count++);s.dispose();s.surfaceAssets.dispose();return {status:s.surfaceAssets.status(),disposedTextures:count,imagesCleared:textures.every(t=>t.image===null),bitmapsClosed:bitmaps.every(b=>b.width===0&&b.height===0)};})()""")
   assert report['sceneDisposal']=={'status':{'ready':False,'error':None,'textures':0,'bitmaps':0,'disposed':True},'disposedTextures':6,'imagesCleared':True,'bitmapsClosed':True}
   report['checks'].append('Real ParkScene destruction disposes all six bound textures and closes all six actual bitmaps exactly once')
   report['exceptions']=errors;report['passed']=not errors
   (OUT/'browser.json').write_text(json.dumps(report,indent=2)+'\n')
   print(json.dumps({'passed':report['passed'],'checks':len(report['checks']),'captures':len(report['captures']),'exceptions':len(errors),'baselineGeometry':report['baseline']['sha256'],'candidateGeometry':report['candidate']['sha256']}),flush=True)
   await call('Target.closeTarget',{'targetId':target});await call('Browser.close')
   if not report['passed']:raise RuntimeError('Actual browser exceptions occurred')
 finally:
  for child in [chrome,server]:
   if child.poll() is None:
    child.terminate()
    try:child.wait(timeout=5)
    except subprocess.TimeoutExpired:child.kill();child.wait()

asyncio.run(run())
