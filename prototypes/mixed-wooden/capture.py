"""Run the actual mixed-park browser check on Grok Bot, using its default Chrome profile."""
import asyncio,base64,hashlib,json,os,pathlib,subprocess,urllib.request
import websockets

ROOT=pathlib.Path("/workspace/coaster-mixed-wooden")
OUT=ROOT/"evidence"/os.environ.get('COASTER_BROWSER_EVIDENCE','browser')
CHROME=pathlib.Path("/workspace/coaster-content-identity/chrome-linux64/chrome")
PORT=4297
CDP=9237

async def main():
    OUT.mkdir(parents=True,exist_ok=True)
    server_log=(OUT/"server.log").open("w")
    chrome_log=(OUT/"chrome.log").open("w")
    server=subprocess.Popen(["python3","-m","http.server",str(PORT),"--bind","127.0.0.1","--directory",str(ROOT/"app/web-dist")],stdout=server_log,stderr=subprocess.STDOUT)
    chrome=subprocess.Popen([str(CHROME),"--headless=new","--no-sandbox","--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--no-startup-window","--user-data-dir=/home/box/.config/google-chrome","--remote-debugging-address=127.0.0.1","--remote-debugging-port="+str(CDP)],stdout=chrome_log,stderr=subprocess.STDOUT)
    evidence={"scope":"Actual software WebGL mixed-park loading, controls, saves and resource ownership; no original agreement, continuous triangle or representative GPU/human qualification.","captures":[],"exceptions":[],"consoleErrors":[],"assetResponses":[],"states":[]}
    try:
        endpoint=None
        for _ in range(100):
            try:endpoint=json.load(urllib.request.urlopen(f"http://127.0.0.1:{CDP}/json/version",timeout=1));break
            except Exception:await asyncio.sleep(.1)
        if endpoint is None:raise RuntimeError("Default-profile Chrome did not expose CDP")
        evidence["browser"]=endpoint
        evidence["browserSha256"]=hashlib.sha256(CHROME.read_bytes()).hexdigest()
        async with websockets.connect(endpoint["webSocketDebuggerUrl"],max_size=64*1024*1024) as socket:
            serial=0;responses={}
            async def call(method,params=None,session=None):
                nonlocal serial
                serial+=1;current=serial;message={"id":current,"method":method,"params":params or {}}
                if session:message["sessionId"]=session
                await socket.send(json.dumps(message))
                while True:
                    value=json.loads(await asyncio.wait_for(socket.recv(),timeout=60))
                    event=value.get("method");data=value.get("params",{})
                    if event=="Runtime.exceptionThrown":evidence["exceptions"].append(data)
                    if event=="Runtime.consoleAPICalled" and data.get("type")=="error":evidence["consoleErrors"].append(data)
                    if event=="Network.responseReceived" and "/models/wooden/" in data["response"]["url"]:responses[data["requestId"]]=data["response"]
                    if value.get("id")==current:
                        if "error" in value:raise RuntimeError(str(value["error"]))
                        return value.get("result",{})
            targets=(await call("Target.getTargets"))["targetInfos"]
            if any(t["type"]=="page" for t in targets):raise RuntimeError("Default-profile page already exists; leave it untouched")
            target=(await call("Target.createTarget",{"url":"about:blank"}))["targetId"]
            session=(await call("Target.attachToTarget",{"targetId":target,"flatten":True}))["sessionId"]
            for method in ["Runtime.enable","Page.enable","Network.enable"]:await call(method,session=session)
            await call("Network.enable",{"maxTotalBufferSize":96*1024*1024,"maxResourceBufferSize":24*1024*1024},session)
            await call("Network.setCacheDisabled",{"cacheDisabled":True},session)
            await call("Emulation.setDeviceMetricsOverride",{"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False},session)
            await call("Page.addScriptToEvaluateOnNewDocument",{"source":"window.__mixedGL={contexts:[],errors:[]};const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args){const c=old.apply(this,args);if(c&&args[0].startsWith('webgl')&&!__mixedGL.contexts.includes(c))__mixedGL.contexts.push(c);return c;};setInterval(()=>{for(const c of __mixedGL.contexts){let e;while((e=c.getError())!==c.NO_ERROR)__mixedGL.errors.push(e);}},100);"},session)
            await call("Page.addScriptToEvaluateOnNewDocument",{"source":"window.__quietSaveAttempts=0;if(sessionStorage.getItem('coaster-storage-controls')==='1'){const original=setInterval;window.setInterval=(fn,ms,...args)=>ms===60000?original(()=>{window.__quietSaveAttempts++;fn(...args)},1000):original(fn,ms,...args);}"},session)
            async def evaluate(expression):
                result=await call("Runtime.evaluate",{"expression":expression,"awaitPromise":True,"returnByValue":True},session)
                if "exceptionDetails" in result:raise RuntimeError(str(result["exceptionDetails"]))
                return result.get("result",{}).get("value")
            await call("Page.navigate",{"url":f"http://127.0.0.1:{PORT}/?showcase=classic"},session)
            async def ready():
                for _ in range(240):
                    if await evaluate("document.readyState!=='loading'&&!!document.getElementById('viewport')&&!document.body.inert"):
                        await evaluate("(async()=>{window.__game=await import('./game.js');return true})()")
                        assets=await evaluate("({wooden:__game.scene.woodenAssets.status(),trees:__game.scene.treeAssets.ready,surfaces:__game.scene.surfaceAssets.ready})")
                        if assets['wooden']['error']:raise RuntimeError('Wooden model loading failed: '+assets['wooden']['error'])
                        if assets['wooden']['ready'] and assets['trees'] and assets['surfaces']:return
                    await asyncio.sleep(.25)
                raise RuntimeError("Mixed park did not become ready: "+str(await evaluate("({feedback:document.getElementById('feedback')?.textContent,inert:document.body.inert})")))
            await ready()
            await evaluate("window.confirm=()=>true;document.getElementById('new').click();true")
            for _ in range(100):
                if await evaluate("document.getElementById('feedback').textContent==='A new park is ready.'"):break
                await asyncio.sleep(.1)
            else:raise RuntimeError('Initial New park handler did not finish')
            await evaluate("__game.execute({type:'set-paused',paused:true})")
            async def state():
                return await evaluate("(async()=>{const g=__game,p=await g.request('view',{bounds:{x0:0,y0:0,x1:47,y1:47},includeStatic:true});return{protocol:p.protocolVersion,content:p.contentVersion,tick:p.tick,cash:p.cash,sceneTick:g.scene.packet.tick,camera:{position:g.scene.camera.position.toArray(),target:g.scene.controls.target.toArray(),zoom:g.scene.camera.zoom},rides:p.rides.map(r=>({id:r.id,name:r.name,family:r.content.familyId,phase:r.trainPhase,status:r.status,cars:r.cars})),cars:p.cars.map(c=>({id:c.id,ride:c.ride,position:c.position,seats:c.seatIds,rig:c.rig?.kind??null})),assets:g.scene.woodenAssets.status(),wooden:g.scene.woodenVehicles.status(),renderer:g.scene.renderer.info.memory,drawCalls:g.scene.renderer.info.render.calls,glErrors:__mixedGL.errors,feedback:document.getElementById('feedback').textContent}})()")
            async def capture(name):
                await evaluate("(async()=>{const g=__game;g.scene.update(await g.request('view',{bounds:{x0:0,y0:0,x1:47,y1:47},includeStatic:false}));g.scene.controls.update();g.scene.camera.updateMatrixWorld(true);g.scene.renderer.render(g.scene.scene,g.scene.camera);g.scene.renderer.getContext().finish();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return true})()")
                await asyncio.sleep(.2);s=await state();evidence["states"].append({"name":name,"state":s});data=await call("Page.captureScreenshot",{"format":"png"},session);file=OUT/(name+".png");file.write_bytes(base64.b64decode(data["data"]));evidence["captures"].append({"file":file.name,"sha256":hashlib.sha256(file.read_bytes()).hexdigest()});return s
            async def record_assets():
                for request,response in responses.items():
                    body=await call("Network.getResponseBody",{"requestId":request},session);raw=base64.b64decode(body["body"]) if body.get("base64Encoded") else body["body"].encode();name=pathlib.Path(response["url"]).name;expected=(ROOT/"app/ui/models/wooden"/name).read_bytes();assert raw==expected;evidence["assetResponses"].append({"url":response["url"],"status":response["status"],"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()})
                responses.clear()
            async def storage_records():
                return await evaluate("(async()=>{const d=await new Promise((resolve,reject)=>{const r=indexedDB.open('coaster-tycoon-3d',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)}),t=d.transaction('parks'),s=t.objectStore('parks'),read=key=>new Promise((resolve,reject)=>{const r=s.get(key);r.onsuccess=()=>resolve(r.result===undefined?{missing:true}:{value:r.result});r.onerror=()=>reject(r.error)}),records=await Promise.all(['showcase-classic-v9','showcase-classic'].map(read));d.close();return records})()")
            async def set_storage(current,legacy):
                values=json.dumps([current,legacy])
                return await evaluate("(async()=>{const values="+values+",d=await new Promise((resolve,reject)=>{const r=indexedDB.open('coaster-tycoon-3d',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise((resolve,reject)=>{const t=d.transaction('parks','readwrite'),s=t.objectStore('parks');['showcase-classic-v9','showcase-classic'].forEach((key,i)=>values[i].missing?s.delete(key):s.put(values[i].value,key));t.oncomplete=resolve;t.onerror=()=>reject(t.error)});d.close();return true})()")
            async def storage_reload():
                responses.clear()
                await call('Page.reload',{'ignoreCache':True},session);await ready()
                await evaluate('__game.scene.renderer.setAnimationLoop(null);true')
            async def quiet_callbacks():
                before=await evaluate('window.__quietSaveAttempts')
                for _ in range(80):
                    if await evaluate('window.__quietSaveAttempts')>=before+2:return await evaluate('window.__quietSaveAttempts')
                    await asyncio.sleep(.1)
                raise RuntimeError('Actual quiet-save timer callbacks did not run')
            async def save_button():
                await evaluate("document.getElementById('save').click();true")
                for _ in range(100):
                    if await evaluate("document.getElementById('feedback').textContent==='Your park has been saved in this browser.'"):return
                    await asyncio.sleep(.1)
                raise RuntimeError('Save button did not complete its IndexedDB transaction')
            async def storage_controls(saved):
                original_records=await storage_records()
                built_game=ROOT/'app/web-dist/game.js';green_game=built_game.read_text()
                invalid=json.loads(saved);invalid['version']=999;invalid=json.dumps(invalid,separators=(',',':'))
                storage={'scope':'Real IndexedDB records and page reloads; only the quiet-save 60000 ms timer interval is shortened to 1000 ms. Other timers and worker rules remain unchanged.'}
                try:
                    await evaluate("sessionStorage.setItem('coaster-storage-controls','1');true")
                    await set_storage({'missing':True},{'value':saved});await storage_reload()
                    fallback=await evaluate("__game.request('save',null)");assert fallback==saved
                    count=await quiet_callbacks();records=await storage_records()
                    assert records==[{'value':saved},{'value':saved}]
                    storage['absentNewSlot']={'saveSha256':hashlib.sha256(fallback.encode()).hexdigest(),'callbacks':count,'legacyRetained':True,'v9Written':True}
                    await set_storage({'value':invalid},{'value':saved});await storage_reload()
                    message=await evaluate("document.getElementById('feedback').textContent")
                    assert message.startswith('Saved park was not loaded:')
                    await evaluate("__game.execute({type:'set-paused',paused:true})")
                    count=await quiet_callbacks();records=await storage_records()
                    assert records==[{'value':invalid},{'value':saved}]
                    storage['invalidNewSlot']={'feedback':message,'callbacks':count,'newRecordRetained':True,'validLegacyNotUsed':True}
                    await save_button();manual=await evaluate("__game.request('save',null)");count=await quiet_callbacks();records=await storage_records()
                    assert records==[{'value':manual},{'value':saved}]
                    storage['explicitSave']={'saveSha256':hashlib.sha256(manual.encode()).hexdigest(),'callbacks':count,'legacyRetained':True}
                    three=ROOT/'evidence/camera-three-park.json'
                    await evaluate("__game.request('load',"+json.dumps(three.read_text())+")");await evaluate('__game.refresh(true);__game.scene.overview();true')
                    await evaluate("(async()=>{__game.scene.update(await __game.request('view',{bounds:{x0:0,y0:0,x1:47,y1:47},includeStatic:true}));__game.scene.overview();return true})()")
                    old_camera=await state();storage['cameraProbeBeforeAssertions']=old_camera['camera'];assert len(old_camera['rides'])==3
                    assert max(abs(a-b) for a,b in zip(old_camera['camera']['target'],[82,4,74]))<1e-8
                    await evaluate('__game.scene.controls.enableDamping=false;__game.scene.controls.target.set(11,12,13);__game.scene.camera.position.set(22,33,44);true');await evaluate('__game.refresh()')
                    assert max(abs(a-b) for a,b in zip((await state())['camera']['target'],[11,12,13]))<1e-8
                    await evaluate("window.confirm=()=>true;document.getElementById('new').click();true")
                    for _ in range(100):
                        if await evaluate("document.getElementById('feedback').textContent==='A new park is ready.'"):break
                        await asyncio.sleep(.1)
                    else:raise RuntimeError('Confirmed New park handler did not finish')
                    new_camera=await state();assert len(new_camera['rides'])==4
                    assert max(abs(a-b) for a,b in zip(new_camera['camera']['target'],[74,4,80]))<1e-8 and max(abs(a-b) for a,b in zip(new_camera['camera']['position'],[146,64,156]))<1e-8 and new_camera['camera']['zoom']==.98
                    storage['newParkCamera']={'previous':old_camera['camera'],'new':new_camera['camera'],'ordinaryRefreshRetainedOrbit':True,'confirmedHandlerUsed':True}
                    marker='if(quiet&&!localSaveAllowed)return;';assert green_game.count(marker)==1
                    built_game.write_text(green_game.replace(marker,''))
                    await set_storage({'value':invalid},{'value':saved});await storage_reload()
                    await evaluate("__game.execute({type:'set-paused',paused:true})")
                    count=await quiet_callbacks();records=await storage_records()
                    assert not records[0].get('missing') and records[0]['value']!=invalid and json.loads(records[0]['value'])['version']==9 and records[1]=={'value':saved}
                    storage['unguardedNegative']={'callbacks':count,'invalidRecordOverwritten':True,'builtGreenSha256':hashlib.sha256(green_game.encode()).hexdigest(),'builtRedSha256':hashlib.sha256(built_game.read_bytes()).hexdigest()}
                finally:
                    evidence['storageControls']=storage
                    built_game.write_text(green_game)
                    await set_storage(*original_records)
                    await evaluate("sessionStorage.removeItem('coaster-storage-controls');true")
                    await storage_reload()
                    assert await evaluate("__game.request('save',null)")==saved
                    assert (await storage_records())[1]==original_records[1]
                evidence['storageControls']=storage
                await record_assets()
            if os.environ.get('COASTER_STORAGE_ONLY'):
                control_file=ROOT/'evidence/browser-final-issue62/park.json'
                saved=control_file.read_text()
                await evaluate("__game.request('load',"+json.dumps(saved)+")")
                await evaluate('__game.refresh(true)')
                evidence['controlSave']={'path':str(control_file),'sha256':hashlib.sha256(saved.encode()).hexdigest()}
                await storage_controls(saved)
                assert not evidence['exceptions'] and not evidence['consoleErrors']
                evidence['passed']=True
                await call('Target.closeTarget',{'targetId':target})
                return
            if os.environ.get('COASTER_CLASSIC_ONLY') or os.environ.get('COASTER_LIBRARY_ONLY'):
                await call('Emulation.setDeviceMetricsOverride',{'width':1920,'height':1080,'deviceScaleFactor':1,'mobile':False},session)
                if os.environ.get('COASTER_LIBRARY_ONLY'):
                    previous=ROOT/'evidence/browser-classic-final/result.json'
                    result=json.loads(previous.read_text())['classic'];assert result.get('ok')
                    evidence['reusedClassic']={'path':str(previous),'sha256':hashlib.sha256(previous.read_bytes()).hexdigest(),'scope':'The27 actual product checks already passed; no replay of those checks.'}
                    responses.clear()
                    await call('Page.navigate',{'url':f'http://127.0.0.1:{PORT}/'},session);await ready()
                else:
                    responses.clear()
                    await call('Page.navigate',{'url':f'http://127.0.0.1:{PORT}/check.html'},session)
                    for _ in range(600):
                        raw=await evaluate("document.getElementById('browser-check-result')?.textContent")
                        if raw:break
                        await asyncio.sleep(.25)
                    else:raise RuntimeError('Classic checks did not finish: '+str(await evaluate('window.browserCheckEvidence')))
                    result=json.loads(raw);assert result.get('ok'),result.get('failure')
                    await evaluate("(async()=>{window.__game=await import('./game.js');return true})()")
                evidence['classic']=result
                actual=await evaluate("__game.request('save',null)")
                await record_assets()
                await call('Page.navigate',{'url':f'http://127.0.0.1:{PORT}/'},session);await ready()
                assert await evaluate("__game.request('save',null)")==actual
                evidence['classic']['checks'].append('Actual page reload restores the exact saved Classic park')
                await capture('classic-checked')
                await evaluate("__game.contentLibrary.open();true")
                for _ in range(100):
                    if await evaluate("document.querySelector('.content-library-card')!==null"):break
                    await asyncio.sleep(.1)
                source=(ROOT/'app/test/content-library-browser.js').read_text()
                library=await evaluate(source);evidence['library']=library;assert library.get('ok'),library.get('failure')
                player=await evaluate("__game.request('save',null)")
                await save_button()
                await call('Page.navigate',{'url':f'http://127.0.0.1:{PORT}/?showcase=classic'},session);await ready()
                await evaluate("__game.request('new-park',null)")
                await evaluate("__game.execute({type:'set-paused',paused:true})");await save_button()
                showcase=await storage_records();assert showcase[0].get('value') is not None
                await call('Page.navigate',{'url':f'http://127.0.0.1:{PORT}/'},session);await ready()
                assert await evaluate("__game.request('save',null)")==player
                evidence['classic']['checks'].extend(['Showcase writes only its versioned slot','Returning to player park resumes exact saved state'])
                assert not evidence['exceptions'] and not evidence['consoleErrors']
                evidence['passed']=True
                await call('Target.closeTarget',{'targetId':target})
                return
            initial=await capture("overview")
            assert initial["protocol"]==2 and initial["content"]==2
            assert len(initial["rides"])==4 and initial["wooden"]=={"activeCars":2,"activeLinks":1}
            assert sum(c["rig"]=="wooden-coupled-flat" for c in initial["cars"])==2
            await evaluate("__game.scene.controls.target.set(31,4.8,136);__game.scene.camera.position.set(64,28,169);__game.scene.camera.zoom=4;__game.scene.camera.updateProjectionMatrix();__game.scene.controls.update();true")
            await capture("wooden-station")
            await evaluate("__game.scene.controls.target.set(38,4.7,164);__game.scene.camera.position.set(64,25,190);__game.scene.camera.zoom=3.5;__game.scene.camera.updateProjectionMatrix();__game.scene.controls.update();true")
            await capture("wooden-course")
            await evaluate("__game.request('speed',4)")
            await evaluate("__game.execute({type:'set-paused',paused:false})")
            for _ in range(160):
                current=await state();wood=next(r for r in current['rides'] if r['family']=='independent.wooden-circuit-coaster')
                view=await evaluate("__game.request('view',{bounds:{x0:0,y0:0,x1:47,y1:47},includeStatic:false})")
                car=next(c for c in view['cars'] if c['rig'])
                if wood['phase']=='running' and all(c['seats'].count(None)==0 for c in current['cars'] if c['rig']) and ((car['position']['x']-30)**2+(car['position']['y']-134)**2)>144:break
                await asyncio.sleep(.1)
            else:raise RuntimeError('Occupied wooden train did not leave its station')
            await evaluate("__game.execute({type:'set-paused',paused:true})")
            checkpoint=os.environ.get('COASTER_RUNNING_CHECKPOINT')
            if checkpoint:
                actual=pathlib.Path(checkpoint).read_text();await evaluate("__game.request('load',"+json.dumps(actual)+")")
                evidence['runningCheckpoint']={'path':checkpoint,'sha256':hashlib.sha256(actual.encode()).hexdigest(),'scope':'Complete real Engine-advanced park with exact saved Rules; no injected renderer pose.'}
            await evaluate("(async()=>{const p=await __game.request('view',{bounds:{x0:0,y0:0,x1:47,y1:47},includeStatic:false}),c=p.cars.find(c=>c.rig),s=__game.scene;window.__woodCarId=c.id;s.update(p);s.controls.target.set(c.position.x,c.position.z+.55,c.position.y);s.camera.position.set(c.position.x+12,c.position.z+8,c.position.y-14);s.camera.zoom=5;s.camera.updateProjectionMatrix();s.controls.update();return true})()")
            await capture("wooden-car")
            point=await evaluate("(async()=>{const THREE=await import('three'),s=__game.scene,c=s.woodenVehicles.group.getObjectByName('WoodenCar_'+__woodCarId),r=s.renderer.domElement.getBoundingClientRect(),candidates=[];c.updateMatrixWorld(true);s.camera.updateMatrixWorld(true);c.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();const p=o.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(o.matrixWorld).project(s.camera);candidates.push({clientX:r.left+(p.x+1)*r.width/2,clientY:r.top+(1-p.y)*r.height/2,mesh:o.name})}});for(const event of candidates){const pick=s.pick(event);if(pick?.kind==='ride'&&pick.id===c.userData.selection.id)return{...event,pick,wrapperPosition:c.getWorldPosition(new THREE.Vector3()).toArray()}}return{pick:null,candidates}})()")
            evidence['pickingProbe']=point
            assert point['pick']=={'kind':'ride','id':wood['id']}
            for kind in ['mousePressed','mouseReleased']:await call('Input.dispatchMouseEvent',{'type':kind,'x':point['clientX'],'y':point['clientY'],'button':'left','clickCount':1},session)
            await asyncio.sleep(.2)
            inspection=await evaluate("document.getElementById('inspection').textContent")
            assert wood['name'] in inspection
            assert await evaluate("document.getElementById('car-count').max") == '2'
            evidence['picking']={'point':point,'inspection':inspection}
            saved=await evaluate("__game.request('save',null)");evidence["saveSha256"]=hashlib.sha256(saved.encode()).hexdigest();(OUT/"park.json").write_text(saved)
            selection_files=[ROOT/'evidence/selection-park-a.json',ROOT/'evidence/selection-park-b.json']
            selection_packets=[]
            for file in selection_files:
                await evaluate("__game.request('load',"+json.dumps(file.read_text())+")");await evaluate('__game.refresh(true)')
                selection_packets.append(await evaluate("__game.request('view',{bounds:{x0:0,y0:0,x1:47,y1:47},includeStatic:false})"))
                if len(selection_packets)==1:await evaluate('window.__selectionWrapper=__game.scene.woodenVehicles.group.getObjectByName("WoodenCar_1");true')
            selections=await evaluate("({sameWrapper:__selectionWrapper===__game.scene.woodenVehicles.group.getObjectByName('WoodenCar_1'),cars:__game.scene.woodenVehicles.group.children.map(o=>({name:o.name,selection:o.userData.selection}))})")
            assert selections['sameWrapper'] and len(selections['cars'])==3 and all(c['selection']=={'kind':'ride','id':1} for c in selections['cars'])
            old_packets=json.dumps(selection_packets)
            old_selections=await evaluate("(async()=>{const {createWoodenVehicles}=await import('./art/wooden-selection-red.js'),f=createWoodenVehicles(__game.scene.art,__game.scene.woodenAssets);for(const p of "+old_packets+")f.update(p);const result=f.group.children.map(o=>({name:o.name,selection:o.userData.selection}));f.dispose();return result})()")
            assert len(old_selections)==3 and all(c['selection']=={'kind':'ride','id':0} for c in old_selections)
            evidence['crossSaveVehicleSelection']={'green':selections,'oldNegative':old_selections,'inputs':[{'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in selection_files]}
            await evaluate("(async()=>{const p=await __game.request('view',{bounds:{x0:0,y0:0,x1:47,y1:47},includeStatic:false}),c=p.cars[0],s=__game.scene;s.update(p);s.controls.target.set(c.position.x,c.position.z+.55,c.position.y);s.camera.position.set(c.position.x+12,c.position.z+8,c.position.y-14);s.camera.zoom=5;s.camera.updateProjectionMatrix();s.controls.update();return true})()")
            selection_point=await evaluate("(async()=>{const THREE=await import('three'),s=__game.scene,c=s.woodenVehicles.group.getObjectByName('WoodenCar_1'),r=s.renderer.domElement.getBoundingClientRect(),points=[];s.scene.updateMatrixWorld(true);s.camera.updateMatrixWorld(true);c.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();const p=o.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(o.matrixWorld).project(s.camera);points.push({clientX:r.left+(p.x+1)*r.width/2,clientY:r.top+(1-p.y)*r.height/2})}});for(const e of points){const pick=s.pick(e);if(pick?.kind==='ride'&&pick.id===1)return{...e,pick}}return null})()")
            assert selection_point is not None
            for kind in ['mousePressed','mouseReleased']:await call('Input.dispatchMouseEvent',{'type':kind,'x':selection_point['clientX'],'y':selection_point['clientY'],'button':'left','clickCount':1},session)
            await asyncio.sleep(.2)
            assert 'Saved wooden selection' in await evaluate("document.getElementById('inspection').textContent")
            evidence['crossSaveVehicleSelection']['actualPick']=selection_point
            await evaluate("__game.request('load',"+json.dumps(saved)+")");await evaluate('__game.refresh(true)')
            await evaluate("__game.request('new-park',null)")
            await evaluate("__game.request('load',"+json.dumps(saved)+")")
            restored=await evaluate("__game.request('save',null)")
            assert restored==saved
            await evaluate("__game.refresh(true)")
            sparse=json.loads(saved);train=next(t for t in sparse['trains'] if t['ride']==wood['id']);removed={train['seats'][1],train['seats'][5]}
            assert None not in removed and len(removed)==2
            train['seats'][1]=train['seats'][5]=None
            departed=[g for g in sparse['people']['guests'] if g['id'] in removed]
            assert len(departed)==2
            sparse['people']['guests']=[g for g in sparse['people']['guests'] if g['id'] not in removed]
            sparse['people']['departedSpent']+=sum(g['spent'] for g in departed)
            await evaluate("__game.request('load',"+json.dumps(json.dumps(sparse,separators=(',',':')))+")")
            await evaluate("__game.refresh(true)");await asyncio.sleep(.2)
            seats=await evaluate("__game.scene.packet.cars.filter(c=>c.rig).map(c=>({id:c.id,expected:c.seatIds,rendered:['FrontLeft','FrontRight','RearLeft','RearRight'].map(n=>{const a=__game.scene.woodenVehicles.group.getObjectByName('WoodenCar_'+c.id).getObjectByName('Canonical_Seat_'+n);return a.children[0]?Number(a.children[0].name.replace('Passenger_','')):null})}))")
            assert len(seats)==2 and all(c['expected']==c['rendered'] and c['rendered'][1] is None for c in seats)
            evidence['orderedNullSeats']=seats
            await capture('wooden-car-null-slots')
            await evaluate("__game.request('load',"+json.dumps(saved)+")");await evaluate("__game.refresh(true)")
            await save_button()
            await record_assets()
            await evaluate("__game.scene.dispose();true")
            evidence['preReloadDisposed']=await evaluate("__game.scene.woodenAssets.status()")
            await call('Page.reload',{'ignoreCache':True},session);await ready()
            reloaded=await evaluate("__game.request('save',null)");assert reloaded==saved
            evidence['indexedDBReloadSha256']=hashlib.sha256(reloaded.encode()).hexdigest()
            await capture('reloaded-overview')
            await call("Emulation.setDeviceMetricsOverride",{"width":900,"height":700,"deviceScaleFactor":1,"mobile":False},session)
            await capture("narrow")
            await record_assets()
            assert len(evidence["assetResponses"])>=6 and {pathlib.Path(r['url']).name for r in evidence['assetResponses']}=={'car.glb','link.glb','station.glb'}
            await storage_controls(saved)
            assert not evidence["exceptions"] and not evidence["consoleErrors"] and all(not s["state"]["glErrors"] for s in evidence["states"])
            evidence['lifecycleControls']=await evaluate("(async()=>{const {verifyWoodenLifetimes}=await import('./lifecycle-check.js');return verifyWoodenLifetimes(__game.scene.renderer)})()")
            await evaluate("__game.scene.dispose();true")
            await evaluate("__game.scene.woodenAssets.readyPromise.then(()=>true)")
            disposed=await evaluate("({assets:__game.scene.woodenAssets.status(),wooden:__game.scene.woodenVehicles.status(),glErrors:__mixedGL.errors})")
            assert disposed["assets"]["disposed"] and all(disposed["assets"][k]==0 for k in ["geometries","materials","textures","bitmaps"])
            assert disposed["wooden"]=={"activeCars":0,"activeLinks":0}
            await evaluate("__game.refresh(true)");await asyncio.sleep(.2)
            assert await evaluate("__game.scene.woodenAssets.status()") == disposed['assets']
            evidence["disposed"]=disposed;evidence["passed"]=True
            await call("Target.closeTarget",{"targetId":target})
    except Exception as error:
        evidence["passed"]=False;evidence["failure"]=str(error)
        raise
    finally:
        (OUT/"result.json").write_text(json.dumps(evidence,indent=2)+"\n")
        for process in [chrome,server]:
            process.terminate()
            try:process.wait(timeout=10)
            except subprocess.TimeoutExpired:process.kill();process.wait(timeout=10)
        chrome_log.close();server_log.close()

asyncio.run(main())
