"""Capture and exercise the actual asset viewer remotely using the default profile."""

import asyncio
import argparse
import base64
import hashlib
import json
import pathlib
import subprocess
import urllib.request

import websockets

ROOT = pathlib.Path("/workspace/coaster-detailed-assets")
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url", default="http://127.0.0.1:4181/")
parser.add_argument("--output", type=pathlib.Path, default=ROOT / "checks")
options = parser.parse_args()
CHECKS = options.output
CHECKS.mkdir(parents=True, exist_ok=True)
URL = options.url
CHROME = str(ROOT / "chrome-linux64/chrome")


async def run():
    server = subprocess.Popen(["python3", "-m", "http.server", "4181", "--bind", "127.0.0.1",
                               "--directory", str(ROOT / "site")],
                              stdout=(CHECKS / "server.log").open("w"), stderr=subprocess.STDOUT)
    process = subprocess.Popen([CHROME, "--headless=new", "--no-sandbox", "--disable-dev-shm-usage",
                                "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
                                "--no-startup-window", "--user-data-dir=/home/box/.config/google-chrome",
                                "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=9227"],
                               stdout=(CHECKS / "chrome.log").open("w"), stderr=subprocess.STDOUT)
    try:
        browser = None
        for _ in range(100):
            try:
                browser = json.load(urllib.request.urlopen("http://127.0.0.1:9227/json/version", timeout=1))
                break
            except Exception:
                await asyncio.sleep(0.1)
        if browser is None:
            raise RuntimeError("Default-profile Chrome CDP unavailable")
        async with websockets.connect(browser["webSocketDebuggerUrl"], max_size=32 * 1024 * 1024) as socket:
            serial = 0
            errors = []
            captures = []
            states = []

            async def call(method, params=None, session=None):
                nonlocal serial
                serial += 1
                current = serial
                message = {"id": current, "method": method, "params": params or {}}
                if session:
                    message["sessionId"] = session
                await socket.send(json.dumps(message))
                while True:
                    response = json.loads(await asyncio.wait_for(socket.recv(), timeout=60))
                    if response.get("method") == "Runtime.exceptionThrown":
                        errors.append(response["params"])
                    if response.get("id") == current:
                        if "error" in response:
                            raise RuntimeError(response["error"])
                        return response.get("result", {})

            initial = (await call("Target.getTargets"))["targetInfos"]
            if any(t["type"] == "page" for t in initial):
                raise RuntimeError("Default profile contains an existing page; leave it untouched")
            target = (await call("Target.createTarget", {"url": "about:blank"}))["targetId"]
            session = (await call("Target.attachToTarget", {"targetId": target, "flatten": True}))["sessionId"]
            await call("Runtime.enable", session=session)
            await call("Page.enable", session=session)
            await call("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 900,
                                                               "deviceScaleFactor": 1, "mobile": False}, session)

            async def evaluate(expression):
                result = await call("Runtime.evaluate", {"expression": expression, "returnByValue": True,
                                                          "awaitPromise": True}, session)
                if "exceptionDetails" in result:
                    raise RuntimeError(result["exceptionDetails"])
                return result.get("result", {}).get("value")

            async def wait_ready():
                for _ in range(160):
                    status = await evaluate("window.assetLab?.status()")
                    if status and status["ready"]:
                        await asyncio.sleep(0.25)
                        return await evaluate("assetLab.status()")
                    await asyncio.sleep(0.1)
                diagnostic = {"exceptions": errors, "page": await evaluate("({error:document.getElementById('load-error')?.textContent,html:document.documentElement.outerHTML.slice(0,1200)})")}
                (CHECKS / "browser-failure.json").write_text(json.dumps(diagnostic, indent=2) + "\n")
                raise RuntimeError("Actual GLB viewer did not become ready: " + json.dumps(diagnostic)[0:2500])

            async def capture(name):
                state = await wait_ready()
                image = await call("Page.captureScreenshot", {"format": "png"}, session)
                file = CHECKS / (name + ".png")
                file.write_bytes(base64.b64decode(image["data"]))
                captures.append({"file": file.name, "sha256": hashlib.sha256(file.read_bytes()).hexdigest(), "state": state})

            await call("Network.enable", session=session)
            await call("Network.emulateNetworkConditions", {"offline": False, "latency": 100,
                                                              "downloadThroughput": 250000,
                                                              "uploadThroughput": 1000000}, session)
            await call("Page.navigate", {"url": URL}, session)
            for _ in range(300):
                initial_loading = await evaluate("!!(window.assetLab && !assetLab.status().ready && !document.getElementById('reload').disabled)")
                if initial_loading:
                    break
                await asyncio.sleep(0.1)
            else:
                raise RuntimeError("Initial loading state was not exercised")
            reload_point = await evaluate("(()=>{const r=document.getElementById('reload').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()")
            for event_type in ["mousePressed", "mouseReleased"]:
                await call("Input.dispatchMouseEvent", {"type": event_type, **reload_point,
                                                        "button": "left", "clickCount": 1}, session)
            await call("Network.emulateNetworkConditions", {"offline": False, "latency": 0,
                                                              "downloadThroughput": -1,
                                                              "uploadThroughput": -1}, session)
            states.append(await wait_ready())
            pointer = await evaluate("(()=>{const r=document.getElementById('viewport').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()")
            await call("Input.dispatchMouseEvent", {"type": "mousePressed", **pointer, "button": "left", "clickCount": 1}, session)
            await call("Input.dispatchMouseEvent", {"type": "mouseReleased", **pointer, "button": "left", "clickCount": 1}, session)
            picking = await evaluate("document.getElementById('selection-detail').textContent")
            if not picking.startswith("Selected:"):
                raise RuntimeError("Actual pointer selection failed: " + picking)
            before_orbit = await evaluate("assetLab.status().camera")
            await call("Input.dispatchMouseEvent", {"type": "mousePressed", **pointer, "button": "left", "clickCount": 1}, session)
            moved = {"x": pointer["x"] + 130, "y": pointer["y"] + 40}
            await call("Input.dispatchMouseEvent", {"type": "mouseMoved", **moved, "button": "left", "buttons": 1}, session)
            await call("Input.dispatchMouseEvent", {"type": "mouseReleased", **moved, "button": "left", "clickCount": 1}, session)
            await asyncio.sleep(0.3)
            after_orbit = await evaluate("assetLab.status().camera")
            if before_orbit == after_orbit:
                raise RuntimeError("Actual pointer orbit failed")
            await evaluate("assetLab.view('front')")
            await capture("wooden-car-front")
            await evaluate("assetLab.view('rear')")
            await capture("wooden-car-rear")
            for angle in ["left", "right", "overview"]:
                await evaluate(f"assetLab.view({json.dumps(angle)})")
                await capture("wooden-car-" + angle)
            await evaluate("assetLab.view('front')")
            await call("Input.dispatchMouseEvent", {"type": "mouseWheel", **pointer,
                                                     "deltaX": 0, "deltaY": -800}, session)
            await asyncio.sleep(0.5)
            await capture("wooden-car-close")
            await evaluate("assetLab.view('front')")
            await evaluate("document.getElementById('restraints').click();document.getElementById('anchors').click()")
            await capture("wooden-car-open")
            await evaluate("document.getElementById('restraints').click();document.getElementById('anchors').click()")
            for asset in ["timber-station", "information-kiosk"]:
                await evaluate(f"assetLab.select({json.dumps(asset)})")
                states.append(await wait_ready())
                for angle in ["front", "rear", "left", "right", "overview"]:
                    await evaluate(f"assetLab.view({json.dumps(angle)})")
                    await capture(asset + "-" + angle)
            await evaluate("document.getElementById('wireframe').click()")
            await capture("information-kiosk-wireframe")
            await evaluate("document.getElementById('wireframe').click()")
            await call("Emulation.setDeviceMetricsOverride", {"width": 850, "height": 720,
                                                               "deviceScaleFactor": 1, "mobile": False}, session)
            await capture("workshop-narrow")
            narrow_layout = await evaluate("(()=>{const p=document.querySelector('.inspector-panel').getBoundingClientRect();const v=document.getElementById('viewport').getBoundingClientRect();return {canvasClear:v.right<=p.left,buttonsClear:[...document.querySelectorAll('#asset-list button')].every(b=>{const r=b.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=p.top})}})()")
            if not all(narrow_layout.values()):
                raise RuntimeError("Narrow viewport hides model/asset controls: " + json.dumps(narrow_layout))
            await call("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 900,
                                                               "deviceScaleFactor": 1, "mobile": False}, session)
            await evaluate("document.getElementById('reload').click();document.getElementById('reload').click();document.getElementById('reload').click()")
            await wait_ready()
            await asyncio.sleep(1)
            states.append(await evaluate("assetLab.status()"))
            await evaluate("document.getElementById('reload').click()")
            states.append(await wait_ready())
            targets = (await call("Target.getTargets"))["targetInfos"]
            result = {"scope": "Actual remote model viewer and software WebGL; not original gameplay or real GPU qualification",
                      "browserVersion": browser["Browser"], "url": URL, "states": states,
                      "captures": captures, "exceptions": errors, "pointerSelection": picking,
                      "reloadDuringInitialLoad": initial_loading,
                      "narrowLayout": narrow_layout,
                      "orbitChangedCamera": before_orbit != after_orbit,
                      "pageCount": sum(t["type"] == "page" for t in targets),
                      "passed": not errors and all(s["errorCount"] == 0 and s["glError"] == 0 and
                                                    s["scale"] == [1, 1, 1] for s in states) and
                                states[-1]["geometries"] == states[-2]["geometries"] and
                                states[-1]["textures"] == states[-2]["textures"]}
            (CHECKS / "browser.json").write_text(json.dumps(result, indent=2) + "\n")
            print(json.dumps({"passed": result["passed"], "captures": len(captures), "exceptions": len(errors),
                              "states": states, "pageCount": result["pageCount"]}))
            await call("Target.closeTarget", {"targetId": target})
            await call("Browser.close")
            if not result["passed"]:
                raise RuntimeError("Model browser checks failed")
    finally:
        for child in [process, server]:
            if child.poll() is None:
                child.terminate()
                try:
                    child.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    child.kill()
                    child.wait()


asyncio.run(run())
