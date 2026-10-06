import test from 'node:test';
import assert from 'node:assert/strict';
import {newPark,steelRules} from '../dist/content/steel-coaster.js';
import {FixedClock} from '../dist/simulation/clock.js';
const request={bounds:{x0:0,y0:0,x1:47,y1:47},includeStatic:true};
test('the independent starter park has a legal measured train and continuing guest, service and finance state',()=>{
 const e=newPark(),view=e.view(request);assert(view.ok);assert.equal(view.value.rides[0].status,'open');assert(view.value.rides[0].measured.distance>0);assert.equal(view.value.cars.length,4);assert.equal(view.value.facilities.length,3);assert(e.advance(2400).ok);assert(e.restoreSave(e.exportSave()).ok);assert(e.snapshot().people.guests.length>0);assert(e.snapshot().ledger.wages>0);
});
test('presentation is bounded, copied, nonauthoritative and follows actual car motion',()=>{
 const e=newPark(),before=e.exportSave(),first=e.view(request);assert(first.ok);assert.equal(e.exportSave(),before);assert(first.value.scenery.surfaces.length<=64*64*5);first.value.scenery.elements[0].piece='corrupt';first.value.rides[0].measured.distance=0;assert.equal(e.exportSave(),before);const position=first.value.cars[0].position;assert(e.advance(320).ok);const next=e.view({...request,includeStatic:false});assert(next.ok);assert.equal(next.value.scenery,null);assert.notDeepEqual(next.value.cars[0].position,position);assert.equal(next.value.commandRevision,first.value.commandRevision);assert.equal(e.view({bounds:{x0:0,y0:0,x1:48,y1:47},includeStatic:true}).ok,false);
});
test('the worker clock preserves missed logical ticks, drains bounded backlog and discards paused wall time',()=>{
 const clock=new FixedClock(40,0);assert.deepEqual(clock.poll(2500,false),{ticks:40,backlog:60});assert.deepEqual(clock.poll(2500,false),{ticks:40,backlog:20});assert.deepEqual(clock.poll(2500,false),{ticks:20,backlog:0});assert.deepEqual(clock.poll(10000,true),{ticks:0,backlog:0});assert.deepEqual(clock.poll(10025,false),{ticks:1,backlog:0});clock.speed=4;assert.deepEqual(clock.poll(10050,false),{ticks:4,backlog:0});
});
