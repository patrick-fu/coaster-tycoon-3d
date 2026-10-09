import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Engine} from '../dist/simulation/index.js';
import {initialWorld} from '../dist/content/steel-coaster.js';
import {withFlumeProfile} from '../dist/content/log-flume.js';
import {apply} from './fixtures.mjs';

const frozen=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v10-mixed-carousel-continuation.json.gz',import.meta.url))));
function v10Save(text){
 const s=JSON.parse(text);assert.equal(s.version,11);assert.equal(s.contentVersion,4);assert.deepEqual(s.boats,[]);delete s.boats;
 const rules=JSON.parse(s.rules);assert(Object.hasOwn(rules,'channelProfiles'));delete rules.channelProfiles;s.rules=JSON.stringify(rules);s.version=10;s.contentVersion=3;return JSON.stringify(s);
}
function normalizeView(view){
 const copy=JSON.parse(JSON.stringify(view,(_key,value)=>ArrayBuffer.isView(value)?{$typedArray:value.constructor.name,values:Array.from(value)}:value));
 assert.equal(copy.protocolVersion,4);assert.equal(copy.contentVersion,4);assert.deepEqual(copy.boats,[]);assert.equal(copy.counts.boats,0);delete copy.boats;delete copy.counts.boats;copy.protocolVersion=3;copy.contentVersion=3;
 const token=copy.commandRevision.split(':');assert.equal(token.length,3);assert.match(token[0],/^[a-f0-9]{32}$/);assert.match(token[1],/^\d+$/);assert.match(token[2],/^\d+$/);assert.equal(Number(token[2]),copy.worldRevision);copy.commandRevision=`<SESSION>:<RESTORE_GENERATION>:${token[2]}`;return copy;
}
for(const c of frozen.cases)for(const channel of [false,true])for(const batch of [17,1200])test(`actual pre-Flume v10 ${c.id} preserves paid coasters and Carousel with ${batch}-tick continuation and channel profile ${channel}`,()=>{
 const engine=new Engine(initialWorld,channel?withFlumeProfile(c.receivingRules):c.receivingRules);assert(engine.restoreSave(c.input).ok);assert.equal(v10Save(engine.exportSave()),c.input);apply(engine,{type:'set-paused',paused:false});let previous=0;
 for(const cp of c.checkpoints){
  for(let remaining=cp.offset-previous;remaining>0;){const ticks=Math.min(batch,remaining);assert.deepEqual(engine.advance(ticks),{ok:true,value:ticks});remaining-=ticks;}previous=cp.offset;
  const saved=engine.exportSave();assert.equal(v10Save(saved),cp.save,`${c.id} offset${cp.offset}: all authority bytes`);const projected=engine.view(cp.request);assert(projected.ok);assert.deepEqual(normalizeView(projected.value),cp.view,`${c.id} offset${cp.offset}: exact actual riders, phases and poses`);assert.equal(engine.exportSave(),saved);
 }
});
