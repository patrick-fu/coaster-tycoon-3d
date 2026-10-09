import {beforeCommerceState,beforeCommerceView} from './consumables-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Engine} from '../dist/simulation/index.js';
import {initialWorld} from '../dist/content/steel-coaster.js';
import {withCarouselProfile} from '../dist/content/carousel.js';
import {apply} from './fixtures.mjs';

const frozen=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v9-mixed-continuation.json.gz',import.meta.url))));
function v9Save(text){
 const s=beforeCommerceState(JSON.parse(text));assert.equal(s.version,11);assert.equal(s.contentVersion,4);assert.deepEqual(s.boats,[]);delete s.boats;assert.deepEqual(s.carouselSessions,[]);assert.equal(s.retiredRideIncome,0);
 const rules=JSON.parse(s.rules);assert(Object.hasOwn(rules,'channelProfiles'));delete rules.channelProfiles;assert(Object.hasOwn(rules,'fixedProfiles'));delete rules.fixedProfiles;s.rules=JSON.stringify(rules);delete s.carouselSessions;delete s.retiredRideIncome;s.version=9;s.contentVersion=2;
 return JSON.stringify(s);
}
function v9View(view){
 const result=JSON.parse(JSON.stringify(beforeCommerceView(view),(_key,value)=>ArrayBuffer.isView(value)?{$typedArray:value.constructor.name,values:Array.from(value)}:value));
 assert.equal(result.protocolVersion,4);assert.equal(result.contentVersion,4);assert.deepEqual(result.boats,[]);assert.equal(result.counts.boats,0);delete result.boats;delete result.counts.boats;assert.deepEqual(result.carouselSessions,[]);delete result.carouselSessions;result.protocolVersion=2;result.contentVersion=2;
 const token=result.commandRevision.split(':');assert.equal(Number(token[2]),result.worldRevision);result.commandRevision=`<SESSION>:<RESTORE_GENERATION>:${token[2]}`;
 return result;
}

for(const c of frozen.cases)for(const fixed of [false,true])test(`actual pre-Carousel v9 ${c.id} preserves all paid mixed state and body/bogie/link trajectories with fixed profiles ${fixed}`,()=>{
 const engine=new Engine(initialWorld,fixed?withCarouselProfile(c.receivingRules):c.receivingRules);assert(engine.restoreSave(c.input).ok);assert.equal(v9Save(engine.exportSave()),c.input);apply(engine,{type:'set-paused',paused:false});
 let previous=0;
 for(const cp of c.checkpoints){
  for(let remaining=cp.offset-previous;remaining>0;){const ticks=Math.min(17,remaining);assert.deepEqual(engine.advance(ticks),{ok:true,value:ticks});remaining-=ticks;}previous=cp.offset;
  const saved=engine.exportSave();assert.equal(v9Save(saved),cp.save,`${c.id} offset ${cp.offset}: exact original state bytes`);
  const projected=engine.view(cp.request);assert(projected.ok);assert.deepEqual(v9View(projected.value),cp.view,`${c.id} offset ${cp.offset}: exact old public poses and state`);assert.equal(engine.exportSave(),saved);
 }
});

test('v9 mixed saves reject changed numeric Rules without losing the current park or quote',()=>{
 const c=frozen.cases[0],rules=withCarouselProfile(c.receivingRules);rules.motion.carLength++;
 const engine=new Engine(initialWorld,rules),before=engine.exportSave(),command={type:'set-paused',paused:true},quote=engine.quote(command);assert(quote.ok);
 assert.equal(engine.restoreSave(c.input).error.code,'WRONG_RULES');assert.equal(engine.exportSave(),before);assert.equal(engine.revision,quote.value.revision);assert(engine.execute(command,quote.value.revision).ok);
});
