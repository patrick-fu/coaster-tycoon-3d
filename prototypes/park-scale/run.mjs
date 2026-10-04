import {chromium} from 'playwright-core';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.EVIDENCE_DIR||'../evidence';await mkdir(out,{recursive:true});
const base=process.env.EXPERIMENT_URL||'http://127.0.0.1:4174/prototype/park-scale/';
const runs=Number(process.env.REPEATS||3),ticks=Number(process.env.TICKS||1440);
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-precise-memory-info','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const results=[];
const cdp=await browser.newBrowserCDPSession();
const rss=async()=>{const p=await cdp.send('SystemInfo.getProcessInfo');let sum=0;for(const proc of p.processInfo){try{const text=await readFile(`/proc/${proc.id}/status`,'utf8');sum+=Number(text.match(/^VmRSS:\s+(\d+)/m)?.[1]||0)*1024;}catch{}}return sum;};
try{
  for(let repeat=0;repeat<runs;repeat++)for(const tier of ['ordinary','large']) {
    for(const variant of ['simulation-only','uncached-routing','message-only','full','packed-clone','packed-transfer']) {
      const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
      await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__experiment);
      const measured=variant==='simulation-only'||variant==='uncached-routing';
      const options={tier,render:!measured&&variant!=='message-only',snapshot:measured?'none':variant==='message-only'?'packed-clone':variant,routing:variant==='uncached-routing'?'uncached':'cached',realtime:!measured,ticks,warmup:240};
      const memorySamples=[{phase:'before',rssBytes:await rss()}];let sampling=false;
      const sampler=setInterval(async()=>{if(sampling)return;sampling=true;try{memorySamples.push({phase:'during',rssBytes:await rss()});}finally{sampling=false;}},5000);
      let result;try{result=await page.evaluate(options=>window.__experiment.run(options),options);}finally{clearInterval(sampler);}
      memorySamples.push({phase:'after',rssBytes:await rss()});result.chromeProcessRss=memorySamples;
      assert.deepEqual(errors,[]);assert.equal(result.inspection.moneyConserved,true);assert.equal(result.inspection.tick,ticks);
      assert.equal(result.inspection.counts.guests,tier==='ordinary'?2000:5000);
      assert(result.inspection.counters.boarded>0);assert(result.inspection.counters.purchases>0);assert.equal(result.inspection.counters.edits,4);
      if(!measured){assert.equal(result.received,Math.floor(ticks/4));assert.equal(result.dropped,0);}
      result.repeat=repeat;result.variant=variant;result.browser=browser.version();results.push(result);
      await writeFile(`${out}/run-${repeat}-${tier}-${variant}.json`,JSON.stringify(result,null,2));
      console.log(JSON.stringify({repeat,tier,variant,stepP95:result.stepMs.p95,frameP95:result.frameMs.p95,lagMax:result.backlogTicks.max,elapsedMs:result.elapsedMs,checksum:result.inspection.checksum}));
      if(repeat===0&&variant==='packed-transfer')await page.screenshot({path:`${out}/${tier}.png`});
      await page.evaluate(()=>window.__experiment.cleanup());
      await context.close();
    }
  }
  for(const tier of ['ordinary','large']){const checks=results.filter(r=>r.options.tier===tier).map(r=>r.inspection.checksum);assert.equal(new Set(checks).size,1,`${tier} rendering or routing changed authoritative state`);}
  await writeFile(`${out}/results.json`,JSON.stringify({passed:true,date:'2026-10-05',softwareRendererOnly:true,runs:results},null,2));
}finally{await browser.close();}
