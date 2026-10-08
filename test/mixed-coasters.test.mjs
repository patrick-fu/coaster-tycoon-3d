import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../dist/simulation/engine.js';
import {initialWorld,steelRules} from '../dist/content/steel-coaster.js';
import {mixedRules,newMixedPark} from '../dist/content/mixed-park.js';
import {woodenRideContent} from '../dist/content/registry.js';
import {withWoodenProfile} from '../dist/content/wooden-coaster.js';
import {apply} from './fixtures.mjs';

const directions=[[1,0],[0,1],[-1,0],[0,-1]];
const request={bounds:{x0:0,y0:0,x1:47,y1:47},includeStatic:true};
const pieces=['station','station','flat','flat',...Array.from({length:3},()=>['right','flat','flat','flat','flat']).flat(),'right'];
const reverse=value=>Object.fromEntries(Object.entries(value).reverse());

function woodenLoop(engine,direction=0){
 const ride=apply(engine,{type:'create-ride',name:'Wooden candidate',tile:{x:20,y:20},height:32,direction,content:woodenRideContent()}).id;
 const stations=[];
 for(const piece of pieces){const id=apply(engine,{type:'append-track',ride,piece}).id;if(piece==='station')stations.push(id);}
 for(const [index,role] of [[0,'entrance'],[1,'exit']]){
  const station=engine.snapshot().elements.find(e=>e.id===stations[index]),facing=(direction+1)%4,[dx,dy]=directions[facing];
  const tile={x:station.origin.x/32-dx,y:station.origin.y/32-dy};
  apply(engine,{type:'place-portal',ride,station:station.id,role,tile,height:32,direction:facing});
  apply(engine,{type:'place-path',tile:{x:tile.x-dx,y:tile.y-dy},height:32,queueFor:role==='entrance'?ride:null});
 }
 apply(engine,{type:'set-train-cars',ride,cars:2});
 return ride;
}

test('wooden loops reserve actual quarter footprints, mount portals and restore in all four directions',()=>{
 for(let direction=0;direction<4;direction++){
  const engine=new Engine(initialWorld,mixedRules),ride=woodenLoop(engine,direction),before=engine.exportSave();
  assert.equal(engine.quote({type:'set-train-cars',ride,cars:3}).error.code,'OPERATING_REQUIREMENTS');
  assert.equal(engine.quote({type:'append-track',ride,piece:'lift'}).error.code,'GEOMETRY');
  assert.equal(engine.exportSave(),before);
  assert.equal(engine.quote({type:'place-path',tile:{x:20,y:20},height:32,queueFor:null}).error.code,'CLEARANCE');
  apply(engine,{type:'set-ride-status',ride,status:'testing'});assert(engine.advance(117).ok);
  const saved=engine.exportSave(),restored=new Engine(initialWorld,mixedRules);assert(restored.restoreSave(saved).ok);
  assert.equal(restored.exportSave(),saved);
  assert(restored.advance(1).ok);assert(restored.advance(16).ok);assert(engine.advance(17).ok);
  assert.equal(restored.exportSave(),engine.exportSave());
  const view=restored.view(request);assert(view.ok);assert.equal(view.value.cars.length,2);
  for(const car of view.value.cars){assert.equal(car.rig.kind,'wooden-coupled-flat');assert.deepEqual(car.seatIds,[null,null,null,null]);}
 }
});

test('equivalent wooden profile property and footprint ordering has the same canonical save identity',()=>{
 const changed=structuredClone(mixedRules),profile=changed.rideProfiles['independent.wooden-circuit-v1'];
 profile.vehicle=reverse({...profile.vehicle,originMm:reverse(profile.vehicle.originMm)});
 profile.footprints=reverse(Object.fromEntries(Object.entries(profile.footprints).map(([key,dirs])=>[key,dirs.map(cells=>cells.map(reverse).reverse())])));
 changed.rideProfiles=reverse(changed.rideProfiles);
 const source=new Engine(initialWorld,mixedRules),receiver=new Engine(initialWorld,changed);woodenLoop(source);
 assert.equal(receiver.snapshot().rules,source.snapshot().rules);
 assert(receiver.restoreSave(source.exportSave()).ok);assert.equal(receiver.exportSave(),source.exportSave());
 const altered=withWoodenProfile({...steelRules,motion:{...steelRules.motion,carLength:2300}}),different=new Engine(initialWorld,altered);
 assert.equal(different.restoreSave(source.exportSave()).error.code,'WRONG_RULES');
});

test('portals sharing one wooden bay cannot request conflicting physical mount rotations',()=>{
 const engine=new Engine(initialWorld,mixedRules),ride=woodenLoop(engine),station=engine.snapshot().rides[0].track[0],before=engine.exportSave();
 for(const result of [engine.quote({type:'place-portal',ride,station,role:'exit',tile:{x:20,y:19},height:32,direction:1}),engine.execute({type:'place-portal',ride,station,role:'exit',tile:{x:20,y:19},height:32,direction:1},engine.revision)]){
  assert.equal(result.ok,false);assert.equal(result.error.code,'GEOMETRY');assert.match(result.error.message,/physical bay orientation/);
 }
 assert.equal(engine.exportSave(),before);
});

test('the finite wooden candidate rejects elevated foundations and lowering land beneath built track atomically',()=>{
 const engine=new Engine(initialWorld,mixedRules),ride=apply(engine,{type:'create-ride',name:'High wooden candidate',tile:{x:20,y:20},height:64,direction:0,content:woodenRideContent()}).id;
 const before=engine.exportSave();
 assert.equal(engine.quote({type:'append-track',ride,piece:'station'}).error.code,'GEOMETRY');
 assert.equal(engine.execute({type:'append-track',ride,piece:'station'},engine.revision).error.code,'GEOMETRY');
 assert.equal(engine.exportSave(),before);
 const ground=new Engine(initialWorld,mixedRules),id=woodenLoop(ground),saved=ground.exportSave(),quote=ground.quote({type:'set-ride-price',ride:id,price:30});assert(quote.ok);
 for(const command of [{type:'set-terrain',tile:{x:22,y:20},height:16,water:0},{type:'set-terrain',tile:{x:20,y:20},height:48,water:0},{type:'set-terrain',tile:{x:22,y:20},height:32,water:32}]){
  assert.equal(ground.quote(command).error.code,'GEOMETRY');
  assert.equal(ground.execute(command,ground.revision).error.code,'GEOMETRY');
  assert.equal(ground.exportSave(),saved);assert.equal(ground.revision,quote.value.revision);
 }
 const elevated=JSON.parse(saved);
 for(const r of elevated.rides)r.anchor.z+=32;
 for(const e of elevated.elements)if(e.kind==='track')e.origin.z+=32;else e.height+=32;
 assert.equal(ground.restoreSave(JSON.stringify(elevated)).error.code,'INVALID_SAVE');
 assert.equal(ground.exportSave(),saved);assert.equal(ground.revision,quote.value.revision);
 const wet=JSON.parse(saved);wet.water[20*256+22]=32;
 assert.equal(ground.restoreSave(JSON.stringify(wet)).error.code,'INVALID_SAVE');assert.equal(ground.exportSave(),saved);
 const waterWorld=new Engine(initialWorld,mixedRules);apply(waterWorld,{type:'set-terrain',tile:{x:20,y:20},height:32,water:32});
 const waterRide=apply(waterWorld,{type:'create-ride',name:'Wet wooden candidate',tile:{x:20,y:20},height:32,direction:0,content:woodenRideContent()}).id,waterBefore=waterWorld.exportSave();
 assert.equal(waterWorld.quote({type:'append-track',ride:waterRide,piece:'station'}).error.code,'GEOMETRY');assert.equal(waterWorld.exportSave(),waterBefore);
 assert(ground.execute({type:'set-ride-price',ride:id,price:30},quote.value.revision).ok);
});

test('the playable mixed park boards actual wooden seats, charges once and preserves holes through save and projection',()=>{
 const engine=newMixedPark(),wood=engine.snapshot().rides.find(r=>r.content.familyId===woodenRideContent().familyId);assert(wood);
 assert.equal(engine.snapshot().rides.filter(r=>r.content.familyId!==wood.content.familyId).length,3);
 for(const ride of engine.snapshot().rides)if(ride.id!==wood.id)apply(engine,{type:'set-ride-status',ride:ride.id,status:'closed'});
 let occupied;
 for(let i=0;i<100;i++){
  assert(engine.advance(80).ok);
  const state=engine.snapshot(),train=state.trains.find(t=>t.ride===wood.id);
  if(train.seats.every(id=>id!==null)){occupied=state;break;}
 }
 assert(occupied,'eight actual guests must board the wooden train');
 const train=occupied.trains.find(t=>t.ride===wood.id),rider=occupied.people.guests.find(g=>g.id===train.seats[0]),paid=rider.spent;
 assert.equal(rider.seat.slot,0);assert(paid>=occupied.rides.find(r=>r.id===wood.id).price);
 apply(engine,{type:'set-park-open',open:false});assert(engine.advance(1).ok);
 assert.equal(engine.snapshot().people.guests.find(g=>g.id===rider.id).spent,paid);
 const state=engine.snapshot(),current=state.trains.find(t=>t.ride===wood.id);
 for(const slot of [1,5]){const id=current.seats[slot],guest=state.people.guests.find(g=>g.id===id);state.people.departedSpent+=guest.spent;state.people.guests=state.people.guests.filter(g=>g.id!==id);current.seats[slot]=null;}
 const receiver=new Engine(initialWorld,mixedRules);assert(receiver.restoreSave(JSON.stringify(state)).ok);
 const view=receiver.view(request);assert(view.ok);const cars=view.value.cars.filter(car=>car.ride===wood.id);
 assert.deepEqual(cars.map(car=>car.seatIds),[current.seats.slice(0,4),current.seats.slice(4,8)]);
 assert.equal(cars[0].seatIds[1],null);assert.equal(cars[1].seatIds[1],null);assert.equal(cars[0].occupants,3);assert.equal(cars[1].occupants,3);
 assert.equal(view.value.cars.filter(car=>car.ride!==wood.id).every(car=>car.rig===null),true);
 const saved=receiver.exportSave(),restored=new Engine(initialWorld,mixedRules);assert(restored.restoreSave(saved).ok);
 assert(receiver.advance(200).ok);for(let i=0;i<10;i++)assert(restored.advance(20).ok);
 assert.equal(restored.exportSave(),receiver.exportSave());
});
