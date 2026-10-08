import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Engine} from '../dist/simulation/index.js';

const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v8-continuation.json.gz',import.meta.url))));
const wire=value=>JSON.parse(JSON.stringify(value,(_key,item)=>ArrayBuffer.isView(item)?Array.from(item):item));

function previousSave(state){
 assert.equal(state.version,10);assert.equal(state.contentVersion,3);
 const old=structuredClone(state),rules=JSON.parse(old.rules);assert.deepEqual(rules.rideProfiles,{});
 assert.deepEqual(rules.fixedProfiles,{});assert.deepEqual(old.carouselSessions,[]);assert.equal(old.retiredRideIncome,0);delete old.carouselSessions;delete old.retiredRideIncome;delete rules.rideProfiles;delete rules.fixedProfiles;old.rules=JSON.stringify(rules);old.version=8;old.contentVersion=1;return old;
}

function previousView(view,state,receivingRules){
 const old=wire(view);assert.equal(old.protocolVersion,3);assert.equal(old.contentVersion,3);
 for(const car of old.cars){
  const train=state.trains.find(t=>t.ride===car.ride),index=train.carIds.indexOf(car.id),seats=receivingRules.motion.seatsPerCar;
  assert.deepEqual(car.seatIds,train.seats.slice(index*seats,(index+1)*seats));assert.equal(car.rig,null);
  delete car.seatIds;delete car.rig;
 }
 for(const ride of old.rides){assert.equal(ride.trackProfile,null);delete ride.trackProfile;}
 assert.deepEqual(old.carouselSessions,[]);delete old.carouselSessions;old.protocolVersion=1;old.contentVersion=1;return old;
}

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
   const state=engine.snapshot();
   assert.deepEqual(previousSave(state),checkpoint.save,`${label}: all previous persisted fields`);
   assert.deepEqual(previousSave(JSON.parse(engine.exportSave())),checkpoint.save,`${label}: all previous exported fields`);
   const result=engine.view(c.viewRequest);assert.equal(result.ok,true,label);
   // This cryptographic quote token belongs to the receiving session, not the saved park.
   const {commandRevision,...view}=result.value;
   assert.deepEqual(previousView(view,state,c.receivingRules),checkpoint.view,`${label}: all previous public projection fields`);
  }
 });
}
