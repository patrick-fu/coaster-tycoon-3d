import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Engine} from '../dist/simulation/index.js';
import {initialWorld} from '../dist/content/steel-coaster.js';
import {withConsumablesProfile} from '../dist/content/consumables.js';
import {beforeCommerceState,beforeCommerceView} from './consumables-fixtures.mjs';
import {apply} from './fixtures.mjs';

const bytes=readFileSync(new URL('./fixtures/v11-consumables-legacy-continuation.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(bytes).digest('hex'),'2ac88098d81d8fdf747aedaca8eb3caf8f7fd48e592e9a6e2e9d7d64af4c0ef1');
const frozen=JSON.parse(gunzipSync(bytes));
const wire=value=>JSON.parse(JSON.stringify(value,(_key,item)=>ArrayBuffer.isView(item)?{$typedArray:item.constructor.name,values:Array.from(item)}:item));
function oldView(view){
 const copy=wire(beforeCommerceView(view)),token=copy.commandRevision.split(':');
 assert.match(token[0],/^[a-f0-9]{32}$/);assert.match(token[1],/^\d+$/);assert.equal(Number(token[2]),copy.worldRevision);
 copy.commandRevision='<SESSION>:<RESTORE_GENERATION>:'+token[2];return copy;
}

for(const c of frozen.cases)for(const commerce of [false,true])for(const batch of [17,1200])test('actual old v11 '+c.id+' retains complete running authority and view with commerce '+commerce+' and '+batch+' tick batches',()=>{
 const receiver=JSON.parse(c.rulesText),engine=new Engine(initialWorld,commerce?withConsumablesProfile(receiver):receiver);
 assert.deepEqual(engine.restoreSave(c.initialAuthority),{ok:true,value:undefined});assert.equal(JSON.stringify(beforeCommerceState(engine.snapshot())),c.initialAuthority);
 apply(engine,c.unpauseCommand.command);assert.equal(JSON.stringify(beforeCommerceState(engine.snapshot())),c.initialPostCommandAuthority);
 let previous=0;
 for(const cp of c.checkpoints){
  for(let remaining=cp.offset-previous;remaining>0;){const ticks=Math.min(batch,remaining);assert.deepEqual(engine.advance(ticks),{ok:true,value:ticks});remaining-=ticks;}previous=cp.offset;
  const saved=engine.exportSave();assert.equal(JSON.stringify(beforeCommerceState(JSON.parse(saved))),cp.authority,'all old authority bytes at '+cp.offset);
  const projected=engine.view({bounds:{x0:0,y0:0,x1:47,y1:47},includeStatic:true});assert(projected.ok);assert.deepEqual(oldView(projected.value),cp.view,'all old projection fields at '+cp.offset);assert.equal(engine.exportSave(),saved);
 }
});

test('v11 rejects later commerce fields and facilities before migration and preserves the existing quote and pause',()=>{
 const c=frozen.cases[0],engine=new Engine(initialWorld,withConsumablesProfile(JSON.parse(c.rulesText)));assert(engine.restoreSave(c.initialAuthority).ok);
 const before=engine.exportSave(),quote=engine.quote({type:'set-paused',paused:false});assert(quote.ok);
 for(const mutate of [s=>s.people.guests[0].held=null,s=>s.litter.push({id:s.nextEntity++,point:{...s.people.entry},containerId:'emptyCan'}),s=>{s.facilities.find(f=>f.kind==='drink').content.variantId='independent.soft-drink-stand';},s=>{const r=JSON.parse(s.rules);r.commerceProfiles={};s.rules=JSON.stringify(r);}]){
  const s=JSON.parse(c.initialAuthority);mutate(s);const result=engine.restoreSave(JSON.stringify(s));assert.equal(result.ok,false);assert.equal(result.error.code, Object.hasOwn(JSON.parse(s.rules),'commerceProfiles')?'WRONG_RULES':'INVALID_SAVE');assert.equal(engine.exportSave(),before);assert.equal(engine.revision,quote.value.revision);
 }
 assert(engine.execute({type:'set-paused',paused:false},quote.value.revision).ok);
});
