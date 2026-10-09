import asyncio, base64, datetime, hashlib, json, pathlib, socket, subprocess, sys, traceback, urllib.parse, urllib.request
import websockets

ROOT = pathlib.Path('/workspace/coaster-consumables/public-browser-sol')
PUBLICATION = pathlib.Path('/workspace/coaster-consumables/publication')
CHROME = '/workspace/coaster-content-identity/chrome-linux64/chrome'
PROFILE = '/home/box/.config/google-chrome'
ORIGIN = 'https://patrick-fu.github.io'
NEUTRAL = ORIGIN + '/coaster-tycoon-3d/__public-consumer-neutral.html'
NEUTRAL_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>Bounded public storage preservation</title></head><body>Task-owned neutral storage document.</body></html>'
CRITICAL = ['game.js','consumable-controls.js','consumable-waste.js','park-scene.js','simulation/browser-worker.js','simulation/engine.js','content/consumables.js','simulation/protocol.js']
TAG = sys.argv[1] if len(sys.argv) > 1 else 'r1'
ONLY = sys.argv[2] if len(sys.argv) > 2 else None

def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(data): return hashlib.sha256(data).hexdigest()
def dump(path, value): path.write_text(json.dumps(value, indent=2)+'\n')

INIT = """(()=>{
 const originalInterval=window.setInterval;window.setInterval=(fn,ms,...args)=>originalInterval(ms===60000?()=>{}:fn,ms,...args);
 window.__publicTraffic=[];window.__publicExports=[];const requests=new Map(),tracked=new WeakSet(),old=Worker.prototype.postMessage;
 Worker.prototype.postMessage=function(message,...args){
  if(!tracked.has(this)){tracked.add(this);this.addEventListener('message',e=>{const m=e.data,type=requests.get(m?.id);if(type){window.__publicTraffic.push({direction:'reply',type,message:m});requests.delete(m.id);}else if(m?.event)window.__publicTraffic.push({direction:'event',message:m});});}
  if(['quote','execute','advance','load','speed','new-park','inspect'].includes(message?.request?.type)){requests.set(message.id,message.request.type);window.__publicTraffic.push({direction:'request',message});}
  return old.call(this,message,...args);
 };
 const make=URL.createObjectURL.bind(URL);URL.createObjectURL=function(blob){const url=make(blob);if(blob?.type==='application/json')window.__publicExports.push({blob,url});return url;};
})();"""

async def main():
    out = ROOT / TAG
    out.mkdir(exist_ok=False, parents=True)
    contract = json.loads((ROOT/'release-contract.json').read_text())
    expected = json.loads((ROOT/'expected-build-input.json').read_text())
    proof = {'startUTC':now(),'scope':contract['scope'],'routes':[],'ownedProcesses':[], 'checks':[]}
    child = None
    log = None
    current = None
    try:
        readiness_path = PUBLICATION/'public-ready.json'
        ready = json.loads(readiness_path.read_text())
        dump(out/'public-ready-input.json',ready)
        proof['readySha256'] = sha(readiness_path.read_bytes())
        assert proof['readySha256'] == '2128b095f052501e9ab7636260a9a8df8056847afc8d76cd25b31df963f03384'
        assert ready['sourceCommit'] == contract['sourceCommit'] == expected['sourceCommit']
        assert ready['httpAllFilesPassed'] is True, 'Root every-file HTTP acceptance is required'
        assert ready['httpFileCount'] == 242 and ready['httpPerFileRetries'] == 0
        assert ready['rootURL'] == contract['routes']['root'] and ready['pinURL'] == contract['routes']['pin']
        assert ready['saveVersion'] == 12 and ready['contentVersion'] == 5 and ready['protocolVersion'] == 5
        assert ready['pagesCommit'] == '524c8a9d224ea5eeda2ddc9a257bd748a34ccb5e'
        assert ready['deployment']['status'] == 'completed' and ready['deployment']['conclusion'] == 'success' and ready['deployment']['headSha'] == ready['pagesCommit']
        assert expected['qualifiedCorrespondence']['passed'] and expected['buildExit'] == 0
        files = expected['files']
        assert all(ready['files'].get(path) == digest for path,digest in files.items())
        assert files['simulation/engine.js'] == contract['engineSha256']
        assert files['content/consumables.js'] == contract['productSha256']
        assert files['consumable-waste.js'] == contract['wasteSha256']
        proof['release'] = {'sourceCommit':contract['sourceCommit'],'pagesCommit':ready['pagesCommit'],'expectedBuildSha256':sha((ROOT/'expected-build-input.json').read_bytes()),'rulesSha256':contract['receiverRulesSha256'],'criticalPins':{r:files[r] for r in CRITICAL}}
        proof['prelaunchProcessState'] = subprocess.run(['ps','-eo','pid,ppid,args'],capture_output=True,text=True,check=True).stdout
        occupied = [line for line in proof['prelaunchProcessState'].splitlines() if CHROME in line and 'run-public.py' not in line]
        assert not occupied, 'An existing Chrome actor owns the default profile: '+str(occupied)
        proof['prelaunchPorts'] = {}
        for port in [8769,9237]:
            with socket.socket() as sock: proof['prelaunchPorts'][str(port)] = sock.connect_ex(('127.0.0.1',port)) == 0
        assert not any(proof['prelaunchPorts'].values()), 'Task ports are already occupied'
        assert pathlib.Path(CHROME).is_file() and pathlib.Path(PROFILE).is_dir()
        log = (out/'chrome.log').open('w')
        command = [CHROME,'--headless=new','--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-startup-window','--user-data-dir='+PROFILE,'--remote-debugging-address=127.0.0.1','--remote-debugging-port=9237']
        child = subprocess.Popen(command,stdout=log,stderr=subprocess.STDOUT)
        proof['ownedProcesses'].append({'pid':child.pid,'command':command,'startUTC':now()})
        for _ in range(150):
            try: endpoint = json.load(urllib.request.urlopen('http://127.0.0.1:9237/json/version',timeout=1)); break
            except Exception: await asyncio.sleep(.1)
        else: raise RuntimeError('Actual Chrome startup failed')
        proof['browserVersion'] = endpoint
        dump(out/'running-state.json',{'utc':now(),'process':proof['ownedProcesses'][0],'browser':endpoint,'profile':PROFILE})
        print(json.dumps({'checkpoint':'profile-owned','utc':now(),'chromePid':child.pid,'version':endpoint['Browser']}),flush=True)
        selected_routes = {k:v for k,v in contract['routes'].items() if ONLY is None or k == ONLY}
        assert selected_routes, 'No declared route was selected'
        for label,url in selected_routes.items():
            route_out = out/label
            route_out.mkdir()
            (route_out/'downloads').mkdir()
            current = {'route':label,'url':url,'startUTC':now(),'groups':[],'checks':[],'exceptions':[],'consoleErrors':[],'failedRequests':[],'httpErrors':[],'snapshots':[],'sources':[],'dialogs':[]}
            proof['routes'].append(current)
            await run_route(route_out, current, endpoint, contract, files)
            if not current.get('passed'): raise RuntimeError('Public route failed: '+label+' '+str(current.get('failure')))
        proof['passed'] = True
    except Exception as error:
        proof['passed'] = False
        proof['failure'] = str(error)
        proof['traceback'] = traceback.format_exc()
        print(json.dumps({'checkpoint':'run-failure','utc':now(),'failure':str(error)}),flush=True)
    finally:
        if child is not None:
            child.terminate()
            try: child.wait(timeout=10)
            except subprocess.TimeoutExpired: child.kill(); child.wait(timeout=10)
            proof['ownedProcesses'][0].update(returncode=child.returncode,endUTC=now())
        if log is not None: log.close()
        proof['terminalPorts'] = {}
        for port in [8769,9237]:
            with socket.socket() as sock: proof['terminalPorts'][str(port)] = sock.connect_ex(('127.0.0.1',port)) == 0
        proof['terminalProcessState'] = subprocess.run(['ps','-eo','pid,ppid,args'],capture_output=True,text=True,check=True).stdout
        proof['endUTC'] = now()
        proof['unexecutedRoutes'] = [k for k in contract['routes'] if not any(r['route']==k for r in proof['routes'])]
        proof['runnerExit'] = 0 if proof.get('passed') and not any(proof['terminalPorts'].values()) and all(r.get('originalRecordsRestored') for r in proof['routes']) else 1
        dump(out/'result.json',proof)
        print(json.dumps({k:proof.get(k) for k in ['passed','failure','runnerExit','terminalPorts','endUTC']}),flush=True)
    return proof['runnerExit']

async def run_route(out, proof, endpoint, contract, files):
    url = proof['url']
    base = url.split('?',1)[0]
    saved = None
    target = None
    session = None
    read_task = None
    raw = (out/'raw-cdp.jsonl').open('w')
    helper = (ROOT/'player-helpers.js').read_text()
    storage = (ROOT/'storage-helpers.js').read_text()
    for name in ['run-public.py','player-helpers.js','storage-helpers.js','release-contract.json','expected-build-input.json']:
        (out/('input-'+name)).write_bytes((ROOT/name).read_bytes())
    async with websockets.connect(endpoint['webSocketDebuggerUrl'],max_size=64*1024*1024) as ws:
        serial = 0
        futures, scripts, sessions, pending_auto = {}, {}, {}, []
        async def call(method,params=None,sid=None):
            nonlocal serial
            serial += 1
            message = {'id':serial,'method':method,'params':params or {}}
            if sid: message['sessionId'] = sid
            future = asyncio.get_running_loop().create_future(); futures[serial] = future
            raw.write(json.dumps({'utc':now(),'direction':'send','message':message})+'\n'); raw.flush()
            await ws.send(json.dumps(message))
            reply = await asyncio.wait_for(future,60)
            if 'error' in reply: raise RuntimeError(method+' '+str(reply['error']))
            return reply.get('result',{})
        async def enable_worker(sid):
            for method in ['Runtime.enable','Debugger.enable','Network.enable']: await call(method,sid=sid)
            await call('Network.setCacheDisabled',{'cacheDisabled':True},sid)
        async def neutral_response(params,sid):
            assert params['request']['url'] == NEUTRAL
            await call('Fetch.fulfillRequest',{'requestId':params['requestId'],'responseCode':200,'responseHeaders':[{'name':'Content-Type','value':'text/html; charset=utf-8'},{'name':'Cache-Control','value':'no-store'}],'body':base64.b64encode(NEUTRAL_HTML.encode()).decode()},sid)
        async def accept_dialog(params,sid):
            proof['dialogs'].append({'utc':now(),**params})
            assert params['type']=='confirm' and params['message'].startswith('Start a new Copper Meadows park?')
            await call('Page.handleJavaScriptDialog',{'accept':True},sid)
        async def reader():
            async for wire in ws:
                data = json.loads(wire)
                raw.write(json.dumps({'utc':now(),'direction':'receive','message':data})+'\n');raw.flush()
                if 'id' in data:
                    future = futures.pop(data['id'],None)
                    if future and not future.done(): future.set_result(data)
                    continue
                method,params,sid = data.get('method'),data.get('params',{}),data.get('sessionId')
                if method == 'Target.attachedToTarget':
                    attached = params['sessionId']; sessions[attached] = params['targetInfo']
                    if params['targetInfo']['type']=='worker': pending_auto.append(asyncio.create_task(enable_worker(attached)))
                if method == 'Fetch.requestPaused': pending_auto.append(asyncio.create_task(neutral_response(params,sid)))
                if method == 'Page.javascriptDialogOpening': pending_auto.append(asyncio.create_task(accept_dialog(params,sid)))
                if method == 'Debugger.scriptParsed' and params.get('url','').startswith(base): scripts[(sid,params['scriptId'])] = params
                if method == 'Runtime.exceptionThrown': proof['exceptions'].append({'sessionId':sid,**params})
                if method == 'Runtime.consoleAPICalled' and params.get('type')=='error': proof['consoleErrors'].append({'sessionId':sid,**params})
                if method == 'Network.loadingFailed': proof['failedRequests'].append({'sessionId':sid,**params})
                if method == 'Network.responseReceived' and params.get('response',{}).get('status',0)>=400: proof['httpErrors'].append({'sessionId':sid,**params})
        read_task = asyncio.create_task(reader())
        async def ev(expression):
            result = await call('Runtime.evaluate',{'expression':expression,'returnByValue':True,'awaitPromise':True},session)
            if 'exceptionDetails' in result: raise RuntimeError('Actual evaluate exception '+json.dumps(result['exceptionDetails']))
            return result.get('result',{}).get('value')
        async def wait(expression,label):
            for _ in range(250):
                if await ev(expression): return
                await asyncio.sleep(.1)
            raise RuntimeError('Actual checkpoint unavailable: '+label)
        async def check(name,condition,data=None):
            proof['checks'].append({'name':name,'passed':bool(condition),'data':data})
            assert condition, name
        async def group(name):
            proof['groups'].append({'name':name,'passed':True,'utc':now()})
            print(json.dumps({'checkpoint':'public-group','route':proof['route'],'name':name,'utc':now()}),flush=True)
        async def snap(name,screenshot=False):
            actual = await ev('__publicPlayer.summary()')
            dump(out/(name+'.json'),actual)
            proof['snapshots'].append({'name':name,'tick':actual['state']['tick'],'utc':now(),'completeStateSha256':sha(json.dumps(actual['state'],separators=(',',':')).encode())})
            if screenshot:
                image = await call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False},session)
                (out/(name+'.png')).write_bytes(base64.b64decode(image['data']))
            print(json.dumps({'checkpoint':name,'route':proof['route'],'utc':now(),'tick':actual['state']['tick'],'cash':actual['state']['cash'],'ledger':actual['state']['ledger'],'held':[{'id':g['id'],'held':g['held']} for g in actual['state']['people']['guests']]}),flush=True)
            return actual
        async def pointer(point,kind='tile',expected=None):
            await call('Input.dispatchMouseEvent',{'type':'mouseMoved','x':point['x'],'y':point['y']},session)
            await asyncio.sleep(.12)
            if kind=='tile':
                hover = await ev('({tile:__publicPlayer.game.scene.pointer({clientX:'+str(point['x'])+',clientY:'+str(point['y'])+'},'+str(point['height'])+'),position:document.getElementById("position").textContent,canvas:document.elementFromPoint('+str(point['x'])+','+str(point['y'])+')===__publicPlayer.game.scene.renderer.domElement})')
                await check('Actual post-hover pointer retains declared tile/canvas',hover['tile']==expected and hover['canvas'],hover)
            else:
                pick = await ev('__publicPlayer.game.scene.pick({clientX:'+str(point['x'])+',clientY:'+str(point['y'])+'})')
                await check('Actual pre-click guest anchor still resolves owner',pick==expected,pick)
            for kind in ['mousePressed','mouseReleased']:
                await call('Input.dispatchMouseEvent',{'type':kind,'x':point['x'],'y':point['y'],'button':'left','clickCount':1},session)
            await ev('__publicPlayer.refresh()')
        async def tile(x,y):
            point = await ev(f'__publicPlayer.tile({x},{y})')
            await check('Actual projected tile lands on canvas and declared anchor',point['tile']=={'x':x,'y':y} and point['element']['tag']=='CANVAS',point)
            await pointer(point,expected={'x':x,'y':y})
        async def file_input(path):
            document = (await call('DOM.getDocument',{},session))['root']['nodeId']
            node = (await call('DOM.querySelector',{'nodeId':document,'selector':'#import-file'},session))['nodeId']
            await call('DOM.setFileInputFiles',{'nodeId':node,'files':[str(path)]},session)
        async def load_file(path,expected):
            before = await ev('__publicTraffic.filter(e=>e.direction==="reply"&&e.type==="load").length')
            await file_input(path)
            await wait('__publicTraffic.filter(e=>e.direction==="reply"&&e.type==="load").length>'+str(before)+'&&document.getElementById("feedback").textContent==="Park imported successfully."','actual File input import')
            actual = await ev('__publicPlayer.game.request("save",null)')
            await check('Actual UI File input preserves complete authority '+path.name,actual==expected,{'expectedSha256':sha(expected.encode()),'actualSha256':sha(actual.encode())})
        async def export_file(name):
            count = await ev('__publicExports.length')
            await ev('document.getElementById("export").click();true')
            await wait('__publicExports.length>'+str(count)+'&&document.getElementById("feedback").textContent.startsWith("Park exported.")','actual Export button')
            text = await ev('(async()=>__publicExports.at(-1).blob.text())()')
            await check('Actual export Blob equals current complete worker save',text==await ev('__publicPlayer.game.request("save",null)'))
            path = out/(name+'-actual-export.json');path.write_text(text)
            return path,text
        async def capture_sources(phase):
            await asyncio.gather(*pending_auto)
            records = []
            directory = out/'executed-sources';directory.mkdir(exist_ok=True)
            for (sid,script),info in list(scripts.items()):
                rel = info['url'].removeprefix(base)
                if rel not in files or not rel.endswith('.js'): continue
                body = (await call('Debugger.getScriptSource',{'scriptId':script},sid))['scriptSource']
                digest = sha(body.encode());path = directory/(digest+'.js');path.write_text(body)
                records.append({'url':info['url'],'relativePath':rel,'sessionId':sid,'target':sessions.get(sid,{'type':'page'}),'scriptId':script,'sha256':digest,'expectedSha256':files[rel],'retainedFile':'executed-sources/'+path.name})
            dump(out/('executed-source-'+phase+'.json'),records)
            for rel in CRITICAL:
                matches = [r for r in records if r['relativePath']==rel]
                await check('Actual parsed '+phase+' '+rel+' matches committed build/readiness',bool(matches) and all(r['sha256']==files[rel] for r in matches),matches)
            await check('Actual Engine and Product execute in worker session',all(any(r['relativePath']==rel and r['target']['type']=='worker' for r in records) for rel in ['simulation/engine.js','content/consumables.js']))
            await check('Every retained parsed module matches committed build',all(r['sha256']==r['expectedSha256'] for r in records),{'count':len(records)})
            proof['sources'].append({'phase':phase,'recordFile':'executed-source-'+phase+'.json','count':len(records)})
        try:
            target = (await call('Target.createTarget',{'url':'about:blank'}))['targetId']
            session = (await call('Target.attachToTarget',{'targetId':target,'flatten':True}))['sessionId']
            for method in ['Page.enable','Runtime.enable','Debugger.enable','Network.enable']: await call(method,sid=session)
            await call('Network.setCacheDisabled',{'cacheDisabled':True},session)
            await call('Emulation.setDeviceMetricsOverride',{'width':1920,'height':1080,'deviceScaleFactor':1,'mobile':False},session)
            await call('Target.setAutoAttach',{'autoAttach':True,'waitForDebuggerOnStart':False,'flatten':True},session)
            await call('Fetch.enable',{'patterns':[{'urlPattern':NEUTRAL,'requestStage':'Request'}]},session)
            await call('Browser.setDownloadBehavior',{'behavior':'allow','downloadPath':str(out/'downloads'),'eventsEnabled':True})
            await call('Page.addScriptToEvaluateOnNewDocument',{'source':INIT},session)
            await call('Page.navigate',{'url':NEUTRAL},session)
            await wait('document.readyState==="complete"&&location.href==='+json.dumps(NEUTRAL),'task-owned neutral public-origin storage document')
            await ev(storage)
            saved = await ev('__publicStorage.snapshot()')
            dump(out/'protected-original-databases.json',saved)
            proof['originalDatabaseCount'] = len(saved)
            proof['storageScope'] = 'All public-origin existing IndexedDB databases/stores, schema and complete key/value records; existence is preserved. Only the game database may be restored or deleted if this task created it. Other database changes are refused.'
            proof['neutralScope'] = 'Only the task-specific neutral URL is fulfilled locally with data favicon. Actual app HTML/modules/assets and worker are public HTTP resources; no LICENSE/download or host-root favicon page is used.'
            await call('Page.navigate',{'url':url},session)
            await wait('document.readyState==="complete"&&!document.body.inert','actual public application startup')
            frame = (await call('Page.getResourceTree',{},session))['frameTree']['frame']
            html = await call('Page.getResourceContent',{'frameId':frame['id'],'url':url},session)
            html_bytes = base64.b64decode(html['content']) if html.get('base64Encoded') else html['content'].encode()
            (out/'actual-loaded-index.html').write_bytes(html_bytes)
            await check('Actual loaded public HTML equals the committed index',sha(html_bytes)==files['index.html'],{'actualSha256':sha(html_bytes),'expectedSha256':files['index.html'],'frameUrl':frame['url']})
            await ev(helper)
            await ev('__publicPlayer.pause(true)')
            await capture_sources('initial')
            await ev('document.getElementById("new").click();true')
            await wait('document.getElementById("feedback").textContent==="A new park is ready."','real confirmed New park')
            await ev('__publicPlayer.pause(true)')
            new = await snap('00-real-new-park',True)
            protocol = await ev('(async()=>{const p=await import("./simulation/protocol.js");return p.WORKER_PROTOCOL_VERSION})()')
            await check('Actual New park emits12/5/5 and the existing five rides',new['state']['version']==12 and new['state']['contentVersion']==5 and protocol==5 and len(new['state']['rides'])==5 and len(proof['dialogs'])==1,{'version':new['state']['version'],'contentVersion':new['state']['contentVersion'],'protocol':protocol,'rides':[{'name':r['name'],'content':r['content']} for r in new['state']['rides']]})
            await check('Actual New park receiving Rules retain exact shipping authority',sha(new['state']['rules'].encode())==contract['receiverRulesSha256'])
            await group('Real New park / versions / five rides / parsed public source')
            baseline = await ev('(async()=>{const receiving=JSON.parse(await __publicPlayer.game.request("save",null)),{Engine}=await import("./simulation/engine.js"),{initialWorld}=await import("./content/steel-coaster.js");const engine=new Engine(initialWorld,JSON.parse(receiving.rules)),command={type:"set-paused",paused:true},quote=engine.quote(command);if(!quote.ok)throw Error(quote.error.message);const receipt=engine.execute(command,quote.value.revision);if(!receipt.ok)throw Error(receipt.error.message);return {save:engine.exportSave(),command,quote,receipt};})()')
            dump(out/'declared-empty-constructor-actions.json',{k:v for k,v in baseline.items() if k!='save'})
            empty = json.loads(baseline['save']);start_path=out/'declared-empty-start.json';start_path.write_text(baseline['save'])
            await check('Declared current-Engine empty baseline has no fabricated guest/object/Rules',empty['tick']==0 and empty['paused'] and not empty['people']['guests'] and not empty['elements'] and not empty['rides'] and empty['rules']==new['state']['rules'])
            await load_file(start_path,baseline['save'])
            await ev('__publicPlayer.focus(12,10)')
            await ev('document.querySelector("[data-tool=path]").click();true')
            for x in range(10,15): await tile(x,10)
            await ev('document.querySelector("[data-sub=park-entry]").click();true')
            await tile(12,10)
            for family,variant,x in [('independent.food-facility','independent.burger-stand',10),('independent.drink-facility','independent.soft-drink-stand',14)]:
                await ev('__publicPlayer.choose('+json.dumps(family)+','+json.dumps(variant)+')')
                await ev('document.getElementById("direction").value="1";document.getElementById("direction").dispatchEvent(new Event("change",{bubbles:true}));true')
                await tile(x,9)
            built = await snap('01-real-library-stalls',True)
            facilities = built['state']['facilities'];burger,drink = facilities[0]['id'],facilities[1]['id']
            await check('Both actual Library/pointer stalls keep exact identities and defaults',len(facilities)==2 and [(f['content']['familyId'],f['content']['variantId'],f['content']['modeId'],f['price']) for f in facilities]==[('independent.food-facility','independent.burger-stand','independent.retail',15),('independent.drink-facility','independent.soft-drink-stand','independent.retail',12)])
            await ev(f'__publicPlayer.price({drink},13)');await ev(f'__publicPlayer.price({drink},12)')
            await ev(f'__publicPlayer.toggle({drink},true)')
            await ev('document.getElementById("park-toggle").click();true')
            await wait('__publicPlayer.pulse().then(s=>s.open)','actual park opens')
            arrived = await ev('__publicPlayer.advance(160)')
            await check('Only two real unchanged-default arrivals establish wallets',len(arrived['guests'])==2 and [g['id'] for g in arrived['guests']]==[1,2] and sorted(g['cash'] for g in arrived['guests'])==[128,193],arrived)
            await ev('document.getElementById("park-toggle").click();true')
            await wait('__publicPlayer.pulse().then(s=>!s.open)','real closed gate stops arrivals')
            spawned = await snap('02-two-real-arrivals')
            cash_before_sales = spawned['state']['cash']
            await group('Real Library construction / prices / opening / two default-wallet arrivals')
            await ev(f'__publicPlayer.price({drink},130)')
            await ev('__publicPlayer.advance(2900)')
            selected = None
            for _ in range(150):
                pulse = await ev('__publicPlayer.pulse()')
                if any(g['phase']=='buying' and g['facility']==drink and g['serviceProgress']>=40 for g in pulse['guests']): selected=pulse;break
                await ev('__publicPlayer.advance(8)')
            await check('Actual temporary130 price selects affordable wallet before payment at12',selected is not None and next(f for f in selected['facilities'] if f['id']==drink)['sales']==0 and sum(g['facility']==drink for g in selected['guests'])==1,selected)
            legitimate = await ev('__publicPlayer.game.request("save",null)')
            malformed = json.loads(legitimate)
            target_guest = next(g for g in malformed['people']['guests'] if g['facility']==drink)
            await check('Strict-import diagnostic starts from genuine target with no wrapper/held',not target_guest['wrapper'] and target_guest['held'] is None)
            target_guest['wrapper'] = True
            malformed_text = json.dumps(malformed,separators=(',',':'))
            malformed_path = out/'declared-malformed-wrapper-product-target.json';malformed_path.write_text(malformed_text)
            rejected = await ev('(async()=>{try{await __publicPlayer.game.request("load",'+json.dumps(malformed_text)+');return {rejected:false};}catch(error){return {rejected:true,message:error.message};}})()')
            await check('Actual repaired worker rejects crafted wrapper/product target atomically',rejected=={'rejected':True,'message':'Guest targets an unavailable service.'} and await ev('__publicPlayer.game.request("save",null)')==legitimate,rejected)
            await file_input(malformed_path)
            await wait('document.getElementById("feedback").textContent==="Import failed: Guest targets an unavailable service."','actual malformed UI File rejection')
            after_reject = await ev('__publicPlayer.game.request("save",null)')
            await check('Actual UI rejects the same crafted target and preserves whole live state',after_reject==legitimate)
            (out/'strict-import-before.json').write_text(legitimate);(out/'strict-import-after.json').write_text(after_reject)
            dump(out/'strict-import-observed-result.json',{'worker':rejected,'ui':await ev('document.getElementById("feedback").textContent'),'guestId':target_guest['id'],'onlyCraftedField':'wrapper:false→true','diagnosticScope':'Malformed current save, not a genuine chooser state','beforeSha256':sha(legitimate.encode()),'afterSha256':sha(after_reject.encode())})
            await group('Current malformed wrapper/product import refusal / complete state preservation')
            await ev(f'__publicPlayer.price({drink},12)')
            first = None
            for _ in range(400):
                pulse = await ev('__publicPlayer.pulse()')
                if next(f for f in pulse['facilities'] if f['id']==drink)['sales']>0:first=pulse;break
                near = any(g['phase']=='buying' and g['serviceProgress']>=65 for g in pulse['guests'])
                await ev('__publicPlayer.advance('+('1' if near else '8')+')')
            await check('First real drink payment is isolated exactly once',first is not None and next(f for f in first['facilities'] if f['id']==drink)['sales']==1,first)
            await ev(f'__publicPlayer.toggle({drink},false)')
            drink_sale = await snap('03-drink-paid')
            drink_owner = next(g['id'] for g in drink_sale['state']['people']['guests'] if g['held'] and g['held'].get('productId')=='independent.soft-drink')
            await check('Actual drink payment books12 revenue/3 stock/9 net and held ownership',drink_sale['state']['ledger']['shopSales']==12 and drink_sale['state']['ledger']['stock']==3 and drink_sale['state']['cash']==cash_before_sales+9 and all(not g['wrapper'] for g in drink_sale['state']['people']['guests']))
            await ev(f'__publicPlayer.toggle({burger},true)')
            tick = (await ev('__publicPlayer.pulse()'))['tick']
            if tick<6100:await ev(f'__publicPlayer.advance({6100-tick})')
            second = None
            for _ in range(400):
                pulse=await ev('__publicPlayer.pulse()')
                if next(f for f in pulse['facilities'] if f['id']==burger)['sales']>0:second=pulse;break
                await ev('__publicPlayer.advance('+('1' if any(g['phase']=='buying' for g in pulse['guests']) else '8')+')')
            await check('The other real guest buys exactly one Burger while first still owns drink',second is not None and next(f for f in second['facilities'] if f['id']==burger)['sales']==1 and sum(g['held'] is not None for g in second['guests'])==2,second)
            await ev(f'__publicPlayer.toggle({burger},false)')
            paid = await snap('04-two-paid-products',True)
            burger_owner = next(g['id'] for g in paid['state']['people']['guests'] if g['held'] and g['held'].get('productId')=='independent.burger')
            await check('Two buyers transfer15+12 revenue/5+3 stock/net19 separately from construction/operations',paid['state']['ledger']=={'rideSales':0,'shopSales':27,'stock':8,'wages':0,'upkeep':0,'interest':0} and paid['state']['cash']==cash_before_sales+19 and sorted(g['spent'] for g in paid['state']['people']['guests'])==[12,15] and drink_owner!=burger_owner,{'beforeCash':cash_before_sales,'afterCash':paid['state']['cash'],'constructionSpent':paid['state']['spent'],'refunds':paid['state']['refunded'],'ledger':paid['state']['ledger']})
            proof['actualOwners']={'drink':drink_owner,'burger':burger_owner}
            await group('Separate real12/15 sales / stock3/5 / net19 / wallets / held ownership')
            for owner,label in [(drink_owner,'drink'),(burger_owner,'burger')]:
                await ev('document.querySelector("[data-tool=inspect]").click();true')
                point = await ev(f'__publicPlayer.guestPoint({owner})')
                await pointer(point,'guest',point['picked'])
                inspection = await ev(f'__publicPlayer.guestInspection({owner})')
                dump(out/(label+'-actual-inspection.json'),inspection)
                descriptor = next(p for p in paid['view']['products'] if p['id']==inspection['data']['held']['productId'])
                await check('Real scene-picked held inspector shows owner/descriptor/remaining progress',inspection['data']['id']==owner and inspection['bar'] is not None and inspection['bar']['value']==round(inspection['data']['held']['remaining']/descriptor['useUnits']*100),inspection)
                await snap('05-'+label+'-held-inspector',True)
            before_pause = await ev('__publicPlayer.game.request("save",null)')
            await ev('__publicPlayer.game.request("advance",256)');await asyncio.sleep(.25)
            await check('Actual paused advance suspends all authoritative use/time',await ev('__publicPlayer.game.request("save",null)')==before_pause)
            mid_path,mid_text = await export_file('mid-use')
            await load_file(mid_path,mid_text)
            await ev('document.getElementById("save").click();true')
            await wait('document.getElementById("feedback").textContent==="Your park has been saved in this browser."','real browser Save')
            await ev(storage)
            stored = await ev('__publicStorage.snapshot()');dump(out/'mid-use-complete-public-store.json',stored)
            game_store = next(d for d in stored if d['name']=='coaster-tycoon-3d')
            actual_records = next(s for s in game_store['stores'] if s['name']=='parks')['records']
            await check('Actual public Save writes complete showcase-classic-v12 authority',dict(actual_records).get('showcase-classic-v12')==mid_text)
            retained_driver = await ev('__publicPlayer.summary(true)');dump(out/'pre-reload-actual-driver.json',retained_driver)
            scripts.clear()
            await call('Page.reload',{'ignoreCache':True},session)
            await wait('document.readyState==="complete"&&!document.body.inert','actual public reload continuation')
            await ev(helper)
            await check('Actual manual reload restores exact paused paid checkpoint',await ev('__publicPlayer.game.request("save",null)')==mid_text)
            await ev('__publicPlayer.focus(12,10)')
            await snap('06-paid-manual-reload',True)
            await group('Real held inspectors / pause / export Blob / UI import / save / manual reload')
            container = None
            for _ in range(100):
                pulse = await ev('__publicPlayer.pulse()');held = next(g for g in pulse['guests'] if g['id']==drink_owner)['held']
                if held and held['kind']=='container':container=pulse;break
                await ev('__publicPlayer.advance(64)')
            await check('Real drink use becomes owned can while Burger use remains unfinished',container is not None and next(g for g in container['guests'] if g['id']==burger_owner)['held']['kind']=='consumable',container)
            await snap('07-owned-can-checkpoint')
            container_path,container_text = await export_file('mid-container')
            await ev('document.querySelector("[data-tool=amenity]").click();document.querySelector("[data-sub=bin]").click();true')
            await tile(14,10)
            bin_state = await ev('__publicPlayer.pulse()')
            deposited = None
            for _ in range(12):
                pulse=await ev('__publicPlayer.advance(32)')
                if any(a['kind']=='bin' and a['fill']==1 for a in pulse['amenities']):deposited=pulse;break
            await check('Real bin deposits can / clears ownership / no litter or entity allocation',deposited is not None and next(g for g in deposited['guests'] if g['id']==drink_owner)['held'] is None and not deposited['litter'] and deposited['nextEntity']==bin_state['nextEntity'],deposited)
            await snap('08-can-in-real-bin',True)
            await load_file(container_path,container_text)
            ground = None
            for _ in range(45):
                pulse=await ev('__publicPlayer.advance(64)')
                if any(l.get('containerId')=='emptyCan' for l in pulse['litter']):ground=pulse;break
            await check('No-bin branch from genuine checkpoint creates one typed can/entity',ground is not None and len(ground['litter'])==1 and ground['nextEntity']==container['nextEntity']+1,ground)
            for _ in range(130):
                pulse=await ev('__publicPlayer.pulse()')
                if any(l.get('containerId')=='emptyBurgerBox' for l in pulse['litter']):ground=pulse;break
                await ev('__publicPlayer.advance(128)')
            await check('Real Burger completion creates its typed box/entity',ground is not None and sorted(l.get('containerId') for l in ground['litter'])==['emptyBurgerBox','emptyCan'] and ground['nextEntity']==container['nextEntity']+2,ground)
            typed = await snap('09-real-typed-ground')
            await check('Actual authority/view/meshes are one-to-one and legacy generic absent',typed['meshCounts']=={'can':1,'box':1,'generic':0} and sorted(l['containerId'] for l in typed['view']['litterTypes'])==['emptyBurgerBox','emptyCan'] and all(g['held'] is None and not g['wrapper'] for g in typed['state']['people']['guests']))
            await group('Owned container / real bin deposit / restored no-bin branch / typed can and box')
            for x in [11,13]:
                await ev('document.querySelector("[data-tool=amenity]").click();document.querySelector("[data-sub=bench]").click();true')
                await tile(x,10)
            await ev('__publicPlayer.advance(4096)')
            await ev('document.querySelector("[data-tool=inspect]").click();document.getElementById("clear-selection").click();true')
            final = await snap('10-real-owners-away')
            await check('Actual Inspect removes ghost and real need navigation moves owners off props',await ev('__publicPlayer.game.scene.ghost.children.length===0') and all((g['point']['x'],g['point']['y']) not in [(l['point']['x'],l['point']['y']) for l in final['state']['litter']] for g in final['state']['people']['guests']))
            bounds=[]
            for label,container_id,mesh in [('can','emptyCan','canMesh'),('box','emptyBurgerBox','boxMesh')]:
                actual = next(l for l in final['state']['litter'] if l['containerId']==container_id)
                await ev('__publicPlayer.macro('+json.dumps(actual['point'])+','+json.dumps(label)+')')
                await asyncio.sleep(.3)
                camera = await ev('__publicPlayer.camera()')
                await check('Observed public macro field0.48m / no ghost / owners away',abs(camera['verticalFieldMetres']-.48)<.000001 and camera['horizontalFieldMetres']<1.1 and camera['ghostCount']==0,camera)
                await snap('11-'+label+'-visible-macro',True)
                witness = await ev('''(()=>{const p=__publicPlayer,s=p.game.scene,m=s.waste.'''+mesh+''',T=p.THREE,mat=new T.Matrix4();m.getMatrixAt(0,mat);const a=m.geometry.attributes.position,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<a.count;i++){const q=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(mat).applyMatrix4(m.matrixWorld);for(let j=0;j<3;j++){const v=q.getComponent(j);min[j]=Math.min(min[j],v);max[j]=Math.max(max[j],v);}}const point='''+json.dumps(actual['point'])+''',ray=new T.Raycaster(new T.Vector3(point.x*4+2,point.z/8+3,point.y*4+2),new T.Vector3(0,-1,0)),hits=ray.intersectObject(s.staticGroup,true);return {count:m.count,min,max,point,opaqueHits:hits.slice(0,3).map(h=>({point:h.point.toArray(),type:h.object.type,opacity:h.object.material.opacity})),material:{color:m.material.color.getHexString(),metalness:m.material.metalness,roughness:m.material.roughness,opacity:m.material.opacity},vertexCount:a.count,indexCount:m.geometry.index.count,instanceMatrix:Array.from(m.instanceMatrix.array.slice(0,16))};})()''')
                witness.update(container=container_id,entityId=actual['id'],camera=camera)
                bounds.append(witness)
                await check('Actual typed prop base clears opaque paving by2mm',witness['count']==1 and witness['min'][1]-witness['opaqueHits'][0]['point'][1]>.0015,witness)
            dump(out/'actual-public-ground-geometry.json',bounds)
            complete_final = await ev('__publicPlayer.summary(true)');dump(out/'final-actual-player-observations.json',complete_final)
            await check('Actual final complete ledger/wallet reconciliation retains27 revenue/8 stock',complete_final['state']['ledger']=={'rideSales':0,'shopSales':27,'stock':8,'wages':0,'upkeep':0,'interest':0} and all(g['initialCash']-g['spent']==g['cash'] for g in complete_final['state']['people']['guests']) and complete_final['meshCounts']=={'can':1,'box':1,'generic':0})
            await capture_sources('continuation')
            await group('No-ghost actual visible prop pixels / current height bytes / whole accounting')
            disposal = await ev('(()=>{const s=__publicPlayer.game.scene,w=s.waste,events={};for(const[key,value]of Object.entries({canMesh:w.canMesh,canGeometry:w.canMesh.geometry,canMaterial:w.canMesh.material,boxMesh:w.boxMesh,boxGeometry:w.boxMesh.geometry,boxMaterial:w.boxMesh.material})){events[key]=0;value.addEventListener("dispose",()=>events[key]++);}const before={counts:{can:w.canMesh.count,box:w.boxMesh.count},memory:{...s.renderer.info.memory}};s.dispose();return {before,events,disposed:s.disposed,canAbsent:!s.scene.children.includes(w.canMesh),boxAbsent:!s.scene.children.includes(w.boxMesh),memoryAfter:{...s.renderer.info.memory}};})()')
            dump(out/'actual-public-resource-disposal.json',disposal)
            await check('Actual scene.dispose emits all six typed resource events once/removes meshes',disposal['disposed'] and disposal['canAbsent'] and disposal['boxAbsent'] and len(disposal['events'])==6 and all(v==1 for v in disposal['events'].values()),disposal)
            proof['driverChecks'] = retained_driver['checks']+complete_final['checks']
            proof['actualAdvances'] = retained_driver['advances']+complete_final['advances']
            proof['actualFinalTick'] = complete_final['state']['tick']
            proof['accounting'] = {'cashBeforeSales':cash_before_sales,'cashAfterSales':paid['state']['cash'],'cashAfterBinRestoredBenches':complete_final['state']['cash'],'constructionSpent':complete_final['state']['spent'],'refunded':complete_final['state']['refunded'],'ledger':complete_final['state']['ledger'],'wallets':[{'id':g['id'],'initial':g['initialCash'],'cash':g['cash'],'spent':g['spent']} for g in complete_final['state']['people']['guests']]}
            await check('Actual route has no runtime/console/network/HTTP errors',not any(proof[k] for k in ['exceptions','consoleErrors','failedRequests','httpErrors']))
            await group('Actual resource release / zero runtime and public HTTP errors')
            proof['passed'] = True
        except Exception as error:
            proof['passed'] = False;proof['failure'] = str(error);proof['traceback'] = traceback.format_exc()
            print(json.dumps({'checkpoint':'route-failure','route':proof['route'],'utc':now(),'failure':str(error)}),flush=True)
            if session:
                try:
                    diagnostic=await ev('({location:location.href,feedback:document.getElementById("feedback")?.textContent,inspector:document.getElementById("inspection")?.textContent,helper:!!window.__publicPlayer})')
                    dump(out/'failure-diagnostic.json',diagnostic)
                    if diagnostic['helper']:dump(out/'failure-actual-player.json',await ev('__publicPlayer.summary()'))
                    image=await call('Page.captureScreenshot',{'format':'png'},session);(out/'failure.png').write_bytes(base64.b64decode(image['data']))
                except Exception as diagnostic_error:proof['failureDiagnosticError']=str(diagnostic_error)
        finally:
            if saved is not None:
                try:
                    await call('Page.navigate',{'url':NEUTRAL},session)
                    await wait('document.readyState==="complete"&&location.href==='+json.dumps(NEUTRAL),'neutral original storage restoration')
                    await ev(storage)
                    restored = await ev('__publicStorage.restore('+json.dumps(saved)+')')
                    dump(out/'restored-original-databases.json',restored)
                    proof['originalRecordsRestored'] = saved==restored
                    proof['originalRecordsRestoredUTC'] = now()
                    assert proof['originalRecordsRestored'], 'Public original full stores/existence were not exactly restored'
                except Exception as cleanup_error:
                    proof['passed']=False;proof['storageCleanupFailure']=str(cleanup_error)
            if target:
                try: await call('Target.closeTarget',{'targetId':target})
                except Exception as target_error:proof['targetCleanupFailure']=str(target_error);proof['passed']=False
            proof['endUTC'] = now()
            dump(out/'summary.json',proof)
    if read_task:
        reader_result=await asyncio.gather(read_task,return_exceptions=True)
        proof['CDPReaderTerminal']=[str(r) if isinstance(r,Exception) else r for r in reader_result]
    raw.close()
    dump(out/'summary.json',proof)

if __name__=='__main__': sys.exit(asyncio.run(main()))
