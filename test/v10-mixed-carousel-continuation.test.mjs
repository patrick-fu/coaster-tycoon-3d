import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Engine} from '../dist/simulation/index.js';
import {initialWorld} from '../dist/content/steel-coaster.js';
import {apply} from './fixtures.mjs';

const frozen=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v10-mixed-carousel-continuation.json.gz',import.meta.url))));
function normalizeView(view){
 const copy=JSON.parse(JSON.stringify(view,(_key,value)=>ArrayBuffer.isView(value)?{$typedArray:value.constructor.name,values:Array.from(value)}:value));
 const token=copy.commandRevision.split(':');assert.equal(token.length,3);assert.match(token[0],/^[a-f0-9]{32}$/);assert.match(token[1],/^\d+$/);assert.match(token[2],/^\d+$/);assert.equal(Number(token[2]),copy.worldRevision);copy.commandRevision=`<SESSION>:<RESTORE_GENERATION>:${token[2]}`;return copy;
}
for(const c of frozen.cases)for(const batch of [17,1200])test(`actual pre-Flume v10 ${c.id} preserves paid coasters and Carousel with ${batch}-tick continuation`,()=>{
 const engine=new Engine(initialWorld,c.receivingRules);assert(engine.restoreSave(c.input).ok);assert.equal(engine.exportSave(),c.input);apply(engine,{type:'set-paused',paused:false});let previous=0;
 for(const cp of c.checkpoints){
  for(let remaining=cp.offset-previous;remaining>0;){const ticks=Math.min(batch,remaining);assert.deepEqual(engine.advance(ticks),{ok:true,value:ticks});remaining-=ticks;}previous=cp.offset;
  const saved=engine.exportSave();assert.equal(saved,cp.save,`${c.id} offset${cp.offset}: all authority bytes`);const projected=engine.view(cp.request);assert(projected.ok);assert.deepEqual(normalizeView(projected.value),cp.view,`${c.id} offset${cp.offset}: exact actual riders, phases and poses`);assert.equal(engine.exportSave(),saved);
 }
});
