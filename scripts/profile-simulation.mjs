import {newPark,steelRules} from '../dist/content/steel-coaster.js';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const percentile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))];
const results=[];
for(const population of [2000,5000])for(let repeat=0;repeat<3;repeat++){
 const e=newPark();if(!e.advance(80).ok)throw new Error('Initial arrivals failed');const s=e.snapshot(),template=s.people.guests[0];if(!template||template.spent!==0||template.phase!=='walking')throw new Error('Unexpected seed guest');
 s.people.open=false;s.people.guests=Array.from({length:population},(_,i)=>({...structuredClone(template),id:i+7,initialCash:100+i%201,cash:100+i%201,hunger:100+i%800,thirst:100+(i*7)%800,energy:100+(i*13)%901,forceTolerance:2000+(i*17)%6001}));s.nextEntity=population+7;
 const fixture=JSON.stringify(s),loaded=e.restoreSave(fixture);if(!loaded.ok)throw new Error(loaded.error.message);if(!e.advance(128).ok)throw new Error('Warmup failed');const tickTimes=[],viewTimes=[];let peakRSS=0,packetBytes=0;
 for(let i=0;i<600;i++){let begin=performance.now();const r=e.advance(1);tickTimes.push(performance.now()-begin);if(!r.ok)throw new Error(r.error.message);if(i%2===0){begin=performance.now();const v=e.view({bounds:{x0:0,y0:0,x1:47,y1:47},includeStatic:false});viewTimes.push(performance.now()-begin);if(!v.ok)throw new Error(v.error.message);packetBytes=Math.max(packetBytes,v.value.people.byteLength+v.value.litter.byteLength);}peakRSS=Math.max(peakRSS,process.memoryUsage().rss);}
 const current=e.snapshot(),exported=e.exportSave();if(!e.restoreSave(exported).ok)throw new Error('Own export failed semantic import');
 const item={population,repeat,fixtureSHA256:createHash('sha256').update(fixture).digest('hex'),profileSHA256:createHash('sha256').update(JSON.stringify(steelRules)).digest('hex'),seed:s.rng,initialTick:s.tick,endTick:current.tick,categories:{guests:current.people.guests.length,staff:current.staff.length,cars:current.trains.reduce((n,t)=>n+t.carIds.length,0),litter:current.litter.length},advanceMs:{p50:percentile(tickTimes,.5),p95:percentile(tickTimes,.95),max:Math.max(...tickTimes)},viewMs:{p50:percentile(viewTimes,.5),p95:percentile(viewTimes,.95),max:Math.max(...viewTimes)},packedEntityBytes:packetBytes,peakRSS,saveBytes:Buffer.byteLength(exported)};
 results.push(item);console.log(JSON.stringify(item));
}
await writeFile('../evidence/simulation-profile.json',JSON.stringify({scope:'Candidate production starter-park stress; synthetic colocated arrivals, flat routes; no renderer, organic demand, hardware or original fidelity qualification.',ticksPerRepeat:600,results},null,2));
