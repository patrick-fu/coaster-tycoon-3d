import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Engine} from '../dist/simulation/index.js';

const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v8-continuation.json.gz',import.meta.url))));
const wire=value=>JSON.parse(JSON.stringify(value,(_key,item)=>ArrayBuffer.isView(item)?Array.from(item):item));

function advance(engine,ticks){
 for(const size of [7,10,61]){
  const count=Math.min(size,ticks);if(count)assert.deepEqual(engine.advance(count),{ok:true,value:count});ticks-=count;
 }
 if(ticks)assert.deepEqual(engine.advance(ticks),{ok:true,value:ticks});
}

for(const name of ['steel-custom','legacy-world-1m-1000hz']){
 test(`historical v8 ${name} retains complete park state and projected car trajectories through 1200 ticks`,()=>{
  const c=fixture.cases.find(c=>c.name===name),engine=new Engine(c.options,c.receivingRules);
  assert.equal(engine.restoreSave(JSON.stringify(c.initial)).ok,true);
  let previous=0;
  for(const checkpoint of c.checkpoints){
   advance(engine,checkpoint.afterTicks-previous);previous=checkpoint.afterTicks;
   const label=`${name} offset ${checkpoint.afterTicks}`;
   assert.deepEqual(engine.snapshot(),checkpoint.save,`${label}: persisted park state`);
   assert.deepEqual(JSON.parse(engine.exportSave()),checkpoint.save,`${label}: exported park state`);
   const result=engine.view(c.viewRequest);assert.equal(result.ok,true,label);
   // This cryptographic quote token belongs to the receiving session, not the saved park.
   const {commandRevision,...view}=result.value;
   assert.deepEqual(wire(view),checkpoint.view,`${label}: complete public projection`);
  }
 });
}
