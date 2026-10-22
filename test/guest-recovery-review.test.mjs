import test from 'node:test';
import assert from 'node:assert/strict';
import {apply,create,operatingPark} from './fixtures.mjs';
function candidate(paths,entry){const {engine:e,id}=operatingPark();for(const [x,y,q] of paths)apply(e,{type:'place-path',tile:{x,y},height:32,queueFor:q?id:null});apply(e,{type:'set-park-entrance',point:{...entry,z:32}});apply(e,{type:'set-ride-status',ride:id,status:'open'});assert(e.advance(460).ok);apply(e,{type:'set-park-open',open:true});assert(e.advance(20).ok);apply(e,{type:'set-park-open',open:false});return{e,id};}
function intended(s,id,point,queued=false){const g=s.people.guests[0],entrance=s.elements.find(e=>e.kind==='portal'&&e.role==='entrance'),exit=s.elements.find(e=>e.kind==='portal'&&e.role==='exit');Object.assign(g,{phase:queued?'queued':'walking',point:{...point,z:32},goal:queued?null:{x:10,y:8,z:32},next:null,walkProgress:0,destination:id,entrance:entrance.id,exit:exit.id,queueRide:queued?id:null,queuedAt:s.tick});if(queued)s.rides[0].queue=[g.id];return g;}
test('cancelled ride intent retains the same own-queue permission until the guest reaches the public entry',()=>{
 const {e,id}=candidate([[10,5,0],[10,6,1],[10,7,0],[10,8,1],[11,8,0],[12,8,0],[12,7,0],[12,6,0],[12,5,0],[11,5,0]],{x:10,y:5}),s=e.snapshot(),g=intended(s,id,{x:10,y:7});assert(e.restoreSave(JSON.stringify(s)).ok);apply(e,{type:'set-ride-status',ride:id,status:'closed'});assert(e.advance(8).ok);assert(e.restoreSave(e.exportSave()).ok);assert(e.advance(8).ok);const after=e.snapshot().people.guests.find(t=>t.id===g.id);assert.deepEqual(after.point,{x:10,y:5,z:32});assert.equal(after.phase,'walking');assert.equal(after.navigationRide,null);assert(e.restoreSave(e.exportSave()).ok);
});
test('a new public shortcut synchronously releases guests excluded from the new queue body',()=>{
 const paths=[[8,7,0],[8,6,1],[9,6,1],[10,6,1],[10,7,1],[10,8,1],[11,8,0],[11,7,0],[11,6,0],[11,5,0],[10,5,0],[9,5,0],[8,5,0],[7,5,0],[7,6,0],[7,7,0]],{e,id}=candidate(paths,{x:8,y:7}),s=e.snapshot(),g=intended(s,id,{x:8,y:6},true);assert(e.restoreSave(JSON.stringify(s)).ok);apply(e,{type:'place-path',tile:{x:9,y:7},height:32,queueFor:null});assert.equal(e.snapshot().rides[0].queue.includes(g.id),false);assert.equal(e.snapshot().people.guests[0].phase,'walking');assert(e.restoreSave(e.exportSave()).ok);
});
test('moving the public entry during evacuation cannot overlap escape permission and a new ride intent',()=>{
 const {e,id}=candidate([[10,5,0],[10,6,1],[10,7,0],[10,8,1],[11,8,0],[12,8,0],[12,7,0],[12,6,0],[12,5,0],[11,5,0]],{x:10,y:5}),s=e.snapshot();intended(s,id,{x:10,y:7});assert(e.restoreSave(JSON.stringify(s)).ok);apply(e,{type:'set-ride-status',ride:id,status:'closed'});apply(e,{type:'set-park-entrance',point:{x:11,y:5,z:32}});apply(e,{type:'set-ride-status',ride:id,status:'open'});assert(e.advance(32).ok);assert(e.restoreSave(e.exportSave()).ok);for(const g of e.snapshot().people.guests)assert(g.destination===null||g.navigationRide===null);
});
test('a walking nonmember on a queue must explicitly own its evacuation permission in an imported save',()=>{
 const {e,id}=candidate([[10,7,0],[11,7,0],[11,8,0],[10,8,1],[9,8,1],[8,8,1]],{x:10,y:7}),s=e.snapshot(),g=s.people.guests[0];Object.assign(g,{phase:'walking',point:{x:8,y:8,z:32},goal:{x:11,y:8,z:32},next:null,walkProgress:0,destination:null,queueRide:null,navigationRide:null,entrance:null,exit:null,seat:null});s.rides[0].queue=[];const before=e.exportSave();assert.equal(e.restoreSave(JSON.stringify(s)).ok,false);assert.equal(e.exportSave(),before);g.navigationRide=id;g.goal={...s.people.entry};assert(e.restoreSave(JSON.stringify(s)).ok);assert(e.advance(24).ok);assert(e.restoreSave(e.exportSave()).ok);
});
test('evacuation imports cannot finish permission at an arbitrary queue-internal goal',()=>{
 const {e,id}=candidate([[10,7,0],[11,7,0],[11,8,0],[10,8,1],[9,8,1],[8,8,1]],{x:10,y:7}),s=e.snapshot(),g=s.people.guests[0];Object.assign(g,{phase:'walking',point:{x:8,y:8,z:32},goal:{x:8,y:8,z:32},next:null,walkProgress:0,destination:null,queueRide:null,navigationRide:id,entrance:null,exit:null,seat:null});s.rides[0].queue=[];assert.equal(e.restoreSave(JSON.stringify(s)).ok,false);
});
test('removing and restoring the park entry preserves a waiting evacuation without inventing queue intent',()=>{
 const {e,id}=candidate([[10,7,0],[11,7,0],[11,8,0],[10,8,1],[9,8,1],[8,8,1]],{x:10,y:7}),s=e.snapshot();intended(s,id,{x:10,y:8},true);assert(e.restoreSave(JSON.stringify(s)).ok);apply(e,{type:'set-ride-status',ride:id,status:'closed'});apply(e,{type:'set-park-entrance',point:null});assert.equal(e.snapshot().people.guests[0].phase,'stranded');assert(e.restoreSave(e.exportSave()).ok);apply(e,{type:'set-park-entrance',point:{x:10,y:7,z:32}});assert(e.advance(8).ok);assert(e.restoreSave(e.exportSave()).ok);assert.equal(e.snapshot().people.guests[0].navigationRide,null);
});

test('a leaving guest survives entrance relocation and later shop availability with reloadable saves',()=>{
 const {e,id}=candidate([[10,7,0],[11,7,0],[12,7,0],[13,7,0],[14,7,0],[11,8,0],[10,8,1]],{x:10,y:7});
 apply(e,{type:'set-ride-status',ride:id,status:'closed'});
 const restroom=apply(e,{type:'place-facility',name:'Departure restroom',kind:'restroom',tile:{x:12,y:6},height:32,direction:1}).id;
 const food=apply(e,{type:'place-facility',name:'Later food',kind:'food',tile:{x:13,y:6},height:32,direction:1}).id;
 apply(e,{type:'set-facility-open',facility:restroom,open:true});
 const setup=e.snapshot(),g=setup.people.guests[0];assert.equal(setup.people.guests.length,1);assert.equal(g.phase,'walking');assert.equal(g.goal,null);assert.equal(g.destination,null);
 Object.assign(g,{point:{x:12,y:7,z:32},hunger:900,thirst:0,bladder:900,happiness:0});
 assert(e.restoreSave(JSON.stringify(setup)).ok);
 const receiver=create(),receive=()=>{
  const s=e.snapshot(),save=e.exportSave(),received=receiver.restoreSave(save),guest=s.people.guests[0];
  assert(received.ok,JSON.stringify({tick:s.tick,phase:guest?.phase,facility:guest?.facility,amenity:guest?.amenity,received}));
  assert.equal(receiver.exportSave(),save);return s;
 };
 receive();
 let leaving;
 for(let i=0;i<96;i++){
  assert(e.advance(1).ok);const s=receive();
  if(s.people.guests[0]?.phase==='leaving'){leaving=s;break;}
 }
 assert(leaving,'The ordinary restroom completion must reach a leaving decision.');
 const departing=leaving.people.guests[0];assert.equal(departing.spent,10);assert.equal(departing.cash,90);assert.equal(departing.facility,null);assert.deepEqual(departing.point,{x:12,y:7,z:32});assert.deepEqual(departing.goal,{x:10,y:7,z:32});
 assert.equal(leaving.facilities.find(f=>f.id===restroom).sales,1);assert.equal(leaving.ledger.shopSales,10);
 const entry={x:14,y:7,z:32};apply(e,{type:'set-park-entrance',point:entry});apply(e,{type:'set-facility-open',facility:food,open:true});receive();
 let retargeted=false,after;
 for(let i=0;i<128;i++){
  assert(e.advance(1).ok);after=receive();const current=after.people.guests.find(t=>t.id===departing.id);
  if(!current)break;
  assert.equal(current.phase,'leaving');assert.equal(current.facility,null);assert.equal(current.amenity,null);assert.equal(current.destination,null);
  if(current.goal?.x===entry.x&&current.goal.y===entry.y&&current.goal.z===entry.z)retargeted=true;
 }
 assert(retargeted,'Leaving must target the relocated entry after the old goal clears.');
 assert.equal(after.people.guests.length,0);assert.equal(after.people.departedSpent,leaving.people.departedSpent+departing.spent);assert.equal(after.people.departedWithdrawn,leaving.people.departedWithdrawn+departing.withdrawn);
 assert.equal(after.facilities.find(f=>f.id===food).sales,0);assert.deepEqual(after.ledger,leaving.ledger);assert.equal(after.cash,leaving.cash);
 assert(e.advance(64).ok);const settled=receive();assert.equal(settled.people.guests.length,0);assert.equal(settled.people.departedSpent,after.people.departedSpent);assert.equal(settled.people.departedWithdrawn,after.people.departedWithdrawn);assert.deepEqual(settled.ledger,after.ledger);
});
