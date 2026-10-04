import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = process.env.EVIDENCE_DIR || '../evidence';
const base=process.env.PROTOTYPE_URL||'http://127.0.0.1:4173/prototype/park-construction/';
await mkdir(out,{recursive:true});
const browser = await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
const errors=[];page.on('pageerror',error=>errors.push(String(error)));
const checks=[];
const snapshot=()=>page.evaluate(()=>window.__prototype.snapshot());
const check=async(name,fn)=>{await fn();checks.push(name);};
const waitChange=(old,field)=>page.waitForFunction(({old,field})=>window.__prototype.snapshot()?.[field]!==old,{old,field});
try {
  await page.goto(`${base}?variant=studio`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__prototype?.snapshot()?.pieces.length===23);
  await page.waitForTimeout(1500);
  await page.screenshot({path:`${out}/studio-overview.png`});
  await check('Initial connected circuit and visible 3D canvas',async()=>{
    assert.equal(await page.evaluate(()=>window.__prototype.info().closed),true);
    assert.equal(await page.locator('#world canvas').count(),1);
    assert.equal((await snapshot()).guests.length,420);
  });
  await page.getByRole('button',{name:'Pause park',exact:true}).click();
  await page.waitForFunction(()=>window.__prototype.snapshot().paused);
  await check('Paused worker preserves simulation time',async()=>{
    const before=await snapshot();await page.waitForTimeout(250);assert.equal((await snapshot()).tick,before.tick);
  });
  await page.getByRole('button',{name:'Edit track',exact:true}).click();
  await page.waitForFunction(()=>!window.__prototype.snapshot().rideOpen);
  await page.locator('[data-action="undo"]').click();
  await page.waitForFunction(()=>window.__prototype.snapshot().pieces.length===22);
  await check('Explicit removal opens the circuit and right turn reconnects it',async()=>{
    assert.equal(await page.evaluate(()=>window.__prototype.info().closed),false);
    assert.equal(await page.locator('[data-action="place"]').isEnabled(),true);
    const before=await snapshot();await page.locator('[data-action="place"]').click();
    await page.waitForFunction(()=>window.__prototype.snapshot().pieces.length===23);
    assert.equal(await page.evaluate(()=>window.__prototype.info().closed),true);
    assert.equal((await snapshot()).cash,before.cash-140);
  });
  await check('Undo reverses placement charge and state',async()=>{
    const before=await snapshot();await page.locator('[data-action="undo"]').click();
    await page.waitForFunction(()=>window.__prototype.snapshot().pieces.length===22);
    assert.equal((await snapshot()).cash,before.cash+140);
  });
  await page.screenshot({path:`${out}/studio-construction.png`});
  await check('New coaster preserves the existing ride',async()=>{
    await page.locator('.park-note [data-action="new"]').click();
    await page.waitForFunction(()=>window.__prototype.snapshot().pieces.length===0);
    assert.equal((await snapshot()).archived.length,1);
    assert.equal(await page.locator('[data-piece="station"]').getAttribute('class').then(c=>c.includes('selected')),true);
    await page.locator('[data-action="place"]').click();
    await page.waitForFunction(()=>window.__prototype.snapshot().pieces.length===1);
    await page.locator('[data-piece="straight"]').click();
    await page.locator('[data-action="place"]').click();
    await page.waitForFunction(()=>window.__prototype.snapshot().pieces.length===2);
  });
  await check('Base-height controls update actual track and funds remain unchanged',async()=>{
    const before=await snapshot();await page.locator('[data-action="height-up"]').click();
    await page.waitForFunction(y=>window.__prototype.snapshot().pieces[0].start.y!==y,before.pieces[0].start.y);
    const after=await snapshot();assert.equal(after.pieces[0].start.y,before.pieces[0].start.y+.5);assert.equal(after.cash,before.cash);
  });
  const canvasTile=async(x,z)=>{
    const pixel=await page.evaluate(({x,z})=>window.__prototype.project(x,z),{x,z});
    const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.tagName,pixel);
    assert.equal(hit,'CANVAS',`Tile ${x},${z} at ${JSON.stringify(pixel)} obscured by ${hit}`);
    await page.mouse.click(pixel.x,pixel.y);
  };
  await check('Footpath stamping updates world state and charges £12',async()=>{
    await page.locator('.navigation [data-mode="path"]').click();const before=await snapshot();
    await canvasTile(8,-13);await page.waitForFunction(n=>window.__prototype.snapshot().paths.length>n,before.paths.length);
    const after=await snapshot();assert.equal(after.cash,before.cash-12);assert.equal(after.paths.at(-1).queue,false);
  });
  await check('Terrain raising updates tile height and charges £15',async()=>{
    await page.locator('.navigation [data-mode="terrain"]').click();const before=await snapshot();
    await canvasTile(8,-13);await page.waitForFunction(()=>Object.keys(window.__prototype.snapshot().terrain).length>0);
    const after=await snapshot();assert.equal(after.cash,before.cash-15);assert.equal(Object.values(after.terrain)[0],.25);
  });
  await check('Export and import round-trip park state through visible controls',async()=>{
    const before=await snapshot();const [download]=await Promise.all([page.waitForEvent('download'),page.locator('[data-action="save"]').first().click()]);
    const savePath=`${out}/roundtrip-save.json`;await download.saveAs(savePath);
    await page.locator('.navigation [data-mode="coaster"]').click();await page.locator('[data-action="undo"]').click();
    await page.waitForFunction(n=>window.__prototype.snapshot().pieces.length<n,before.pieces.length);
    await page.locator('#load-input').setInputFiles(savePath);await page.waitForFunction(n=>window.__prototype.snapshot().pieces.length===n,before.pieces.length);
    assert.deepEqual(await snapshot(),before);
  });
  await check('Malformed save is rejected without overwriting the park',async()=>{
    const before=await snapshot();await page.locator('#load-input').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"version":1}')});
    await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('not a valid'));
    assert.deepEqual(await snapshot(),before);
  });
  await check('Inherited catalogue keys and out-of-range geometry are rejected',async()=>{
    const before=await snapshot();
    for(const key of ['__proto__','toString']){
      const bad=structuredClone(before);bad.pieces[0].kind=key;
      await page.locator('#load-input').setInputFiles({name:'bad-kind.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
      await page.waitForTimeout(150);assert.deepEqual(await snapshot(),before);
    }
    const bad=structuredClone(before);bad.archived[0].pieces[0].start.y=1e100;
    await page.locator('#load-input').setInputFiles({name:'bad-geometry.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
    await page.waitForTimeout(150);assert.deepEqual(await snapshot(),before);
  });
  await check('Moving a coaster into an archived station is prevented',async()=>{
    await page.locator('.park-note [data-action="new"]').click();await page.waitForFunction(()=>window.__prototype.snapshot().pieces.length===0);
    await page.locator('[data-action="height-up"]').click();await page.waitForFunction(()=>window.__prototype.snapshot().anchor.y===2.5);
    await page.locator('[data-action="home"]').click();await page.locator('[data-action="camera-rotate"]').click();
    await page.waitForTimeout(750);
    await canvasTile(-10,8);await page.waitForFunction(()=>window.__prototype.snapshot().anchor.x===-10);
    await page.locator('[data-action="place"]').click();await page.waitForFunction(()=>window.__prototype.snapshot().pieces.length===1);
    const before=await snapshot();await page.locator('[data-action="height-down"]').click();
    await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('intersect another coaster'));
    assert.deepEqual(await snapshot(),before);
  });
  await check('Ride camera exits when the selected ride closes',async()=>{
    await page.locator('#load-input').setInputFiles(`${out}/roundtrip-save.json`);await page.waitForFunction(()=>window.__prototype.snapshot().pieces.length===2);
    await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__prototype?.snapshot()?.rideOpen);
    await page.locator('[data-action="ride-view"]').click();await page.waitForFunction(()=>!window.__prototype.scene.controls.enabled);
    await page.locator('[data-action="ride"]').click();await page.waitForFunction(()=>!window.__prototype.snapshot().rideOpen);
    assert.equal(await page.evaluate(()=>window.__prototype.scene.controls.enabled),true);
  });
  await check('Keyboard activation respects focused buttons and canvas placement',async()=>{
    await page.getByRole('button',{name:'Edit track',exact:true}).click();const before=await snapshot();
    await page.locator('[data-action="undo"]').focus();await page.keyboard.press('Enter');
    await page.waitForFunction(n=>window.__prototype.snapshot().pieces.length===n-1,before.pieces.length);
    await page.locator('[data-piece="right"]').click();await page.keyboard.press('Enter');
    await page.waitForFunction(n=>window.__prototype.snapshot().pieces.length===n,before.pieces.length);
    await page.locator('[data-action="pause"]').focus();await page.keyboard.press('Space');
    await page.waitForFunction(()=>window.__prototype.snapshot().paused);assert.equal((await snapshot()).pieces.length,before.pieces.length);
  });
  await check('Layouts are structurally different and reload-stable',async()=>{
    for(const variant of ['classic','immersive']){
      await page.goto(`${base}?variant=${variant}`,{waitUntil:'networkidle'});
      await page.waitForFunction(()=>window.__prototype?.snapshot());assert.equal(await page.locator('.park-app').getAttribute('data-variant'),variant);
      await page.screenshot({path:`${out}/${variant}-overview.png`});
      if(variant==='immersive'){const pixel=await page.evaluate(()=>window.__prototype.project(-10,8,2));await page.mouse.click(pixel.x,pixel.y);await page.waitForFunction(()=>window.__prototype.info().mode==='ride');assert.equal(await page.evaluate(()=>window.__prototype.info().mode),'ride');assert.equal(await page.locator('.inspector').isVisible(),true);}
      await page.getByRole('button',{name:'Coasters',exact:true}).click();
      await page.getByRole('button',{name:'Edit track',exact:true}).click();await page.waitForFunction(()=>!window.__prototype.snapshot().rideOpen);
      await page.locator('[data-action="undo"]').click();await page.waitForFunction(()=>window.__prototype.snapshot().pieces.length===22);
      await page.screenshot({path:`${out}/${variant}-construction.png`});
    }
  });
  await check('Guest and financial inspectors reflect worker-owned state',async()=>{
    await page.locator('.navigation [data-mode="guests"]').click();assert.match(await page.locator('#inspector-content').innerText(),/Pocket money/);
    await page.locator('.navigation [data-mode="finance"]').click();assert.match(await page.locator('#inspector-content').innerText(),/Available funds/);
  });
  assert.deepEqual(errors,[]);
  const result={passed:true,checks,pageErrors:errors,renderer:'Remote Chrome with SwiftShader; not a representative integrated-GPU performance test',finalInfo:await page.evaluate(()=>window.__prototype.info())};
  await writeFile(`${out}/interaction-results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
} catch(error){
  await page.screenshot({path:`${out}/failure.png`});await writeFile(`${out}/interaction-results.json`,JSON.stringify({passed:false,checks,pageErrors:errors,error:String(error)},null,2));console.error(error);process.exitCode=1;
} finally {await browser.close();}
