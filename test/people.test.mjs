import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../dist/simulation/index.js';
import {apply,create,operatingPark,rules,options} from './fixtures.mjs';
function park(e=create()){
 const {id}=operatingPark(e),paths=[];
 for(const [x,y,queueFor] of [[10,7,null],[11,7,null],[11,8,null],[10,8,id]])paths.push(apply(e,{type:'place-path',tile:{x,y},height:32,queueFor}).id);
 apply(e,{type:'set-park-entrance',point:{x:10,y:7,z:32}});apply(e,{type:'set-ride-status',ride:id,status:'open'});e.advance(460);apply(e,{type:'set-park-open',open:true});return{e,id,paths};
}
function until(e,predicate,limit=2048){for(let ticks=0;ticks<limit;ticks+=4){const result=e.advance(4);assert(result.ok,JSON.stringify(result));const s=e.snapshot();if(predicate(s))return s;}assert.fail('Expected production state transition did not occur.');}
const guest=(s,id)=>s.people.guests.find(g=>g.id===id);
function memberships(s){const ids=[...s.rides.flatMap(r=>r.queue),...s.trains.flatMap(t=>t.seats.filter(id=>id!==null))];assert.equal(new Set(ids).size,ids.length);for(const g of s.people.guests)assert.equal(ids.includes(g.id),g.phase==='queued'||g.phase==='riding');}

test('individual arrivals walk into a real queue and boarding transfers exactly one current ticket payment',()=>{
 const {e,id}=park(),initial=e.snapshot().cash,s=until(e,s=>s.people.guests.some(g=>g.phase==='riding')),g=s.people.guests.find(g=>g.phase==='riding');memberships(s);
 assert.equal(g.cash,g.initialCash-s.rides[0].price);assert.equal(g.spent,s.rides[0].price);assert.equal(s.rides[0].queue.includes(g.id),false);assert.equal(s.ledger.rideSales,s.rides[0].income);assert.equal(s.cash,initial+s.ledger.rideSales);
 apply(e,{type:'set-park-open',open:false});const paid=g.spent;e.advance(80);assert.equal(guest(e.snapshot(),g.id).spent,paid);assert(e.restoreSave(e.exportSave()).ok);
});
test('repricing evicts unaffordable queued guests without charging them or disturbing existing passengers',()=>{
 const {e,id}=park(),s=until(e,s=>s.rides[0].queue.length>0&&s.people.guests.some(g=>g.phase==='riding')),queued=guest(s,s.rides[0].queue[0]),riding=s.people.guests.find(g=>g.phase==='riding');
 apply(e,{type:'set-ride-price',ride:id,price:200});const after=e.snapshot();assert.equal(after.rides[0].queue.length,0);assert.equal(guest(after,queued.id).cash,queued.cash);assert.equal(guest(after,queued.id).spent,0);assert.equal(guest(after,queued.id).thought,'price-changed');assert.equal(guest(after,riding.id).spent,riding.spent);memberships(after);assert(e.restoreSave(e.exportSave()).ok);
});
test('an affordable fare change is rechecked at boarding rather than charging the earlier intent price',()=>{
 const {e,id}=park(),s=until(e,s=>s.rides[0].queue.length>0),queued=guest(s,s.rides[0].queue[0]);apply(e,{type:'set-park-open',open:false});apply(e,{type:'set-ride-price',ride:id,price:50});
 const boarded=until(e,s=>guest(s,queued.id)?.phase==='riding');assert.equal(guest(boarded,queued.id).spent,50);assert.equal(guest(boarded,queued.id).cash,queued.initialCash-50);memberships(boarded);assert(e.restoreSave(e.exportSave()).ok);
});
test('removing an occupied queue clears membership and rebuilding its path explicitly recovers stranded guests',()=>{
 const {e,id,paths}=park(),s=until(e,s=>s.rides[0].queue.length>0),queued=guest(s,s.rides[0].queue[0]),income=s.ledger.rideSales;
 apply(e,{type:'remove-path',id:paths[3]});const removed=e.snapshot();assert.equal(removed.rides[0].queue.length,0);assert.equal(guest(removed,queued.id).phase,'stranded');assert.equal(guest(removed,queued.id).spent,0);assert.equal(removed.ledger.rideSales,income);memberships(removed);assert(e.restoreSave(e.exportSave()).ok);
 apply(e,{type:'place-path',tile:{x:10,y:8},height:32,queueFor:id});assert.equal(guest(e.snapshot(),queued.id).phase,'walking');assert(e.restoreSave(e.exportSave()).ok);
});
test('closing a ride stops admission while paid passengers finish and unload safely',()=>{
 const {e,id}=park(),s=until(e,s=>s.people.guests.some(g=>g.phase==='riding')),rider=s.people.guests.find(g=>g.phase==='riding');apply(e,{type:'set-park-open',open:false});apply(e,{type:'set-ride-status',ride:id,status:'closed'});
 assert.equal(e.snapshot().rides[0].queue.length,0);assert.equal(e.quote({type:'reset-train',ride:id}).error.code,'RIDE_ACTIVE');
 const unloaded=until(e,s=>guest(s,rider.id)?.ridesTaken===1);assert.equal(guest(unloaded,rider.id).seat,null);assert.equal(guest(unloaded,rider.id).spent,rider.spent);memberships(unloaded);assert(e.restoreSave(e.exportSave()).ok);
});
test('a missing exit holds passengers and their seats until safe path access is restored',()=>{
 const {e,paths}=park(),s=until(e,s=>s.people.guests.some(g=>g.phase==='riding')),rider=s.people.guests.find(g=>g.phase==='riding');apply(e,{type:'set-park-open',open:false});apply(e,{type:'remove-path',id:paths[2]});e.advance(1200);
 const held=e.snapshot();assert.equal(held.trains[0].phase,'unloading');assert.equal(guest(held,rider.id).phase,'riding');assert.equal(guest(held,rider.id).ridesTaken,0);memberships(held);assert(e.restoreSave(e.exportSave()).ok);
 apply(e,{type:'place-path',tile:{x:11,y:8},height:32,queueFor:null});const recovered=until(e,s=>guest(s,rider.id)?.ridesTaken===1);assert.equal(guest(recovered,rider.id).seat,null);assert(e.restoreSave(e.exportSave()).ok);
});
test('cash and force preferences produce different individual ride choices',()=>{
 for(const [property,value,thought] of [['cash',0,'not-enough-cash'],['force',100,'too-intense']]){const profile=structuredClone(rules);profile.guests[property+'Min']=value;profile.guests[property+'Max']=value;const {e}=park(new Engine(options,profile));e.advance(1000);const s=e.snapshot();assert(s.people.guests.length>0);assert.equal(s.ledger.rideSales,0);assert(s.people.guests.some(g=>g.thought===thought));assert(e.restoreSave(e.exportSave()).ok);}
});
test('guest, queue, seat, cash and RNG state continue identically across save and different tick batches',()=>{
 const {e,id}=park();e.advance(700);const restored=create();assert(restored.restoreSave(e.exportSave()).ok);for(const game of [e,restored])apply(game,{type:'set-ride-price',ride:id,price:30});e.advance(1600);for(const n of [13,400,17,770,400])restored.advance(n);assert.equal(restored.exportSave(),e.exportSave());memberships(e.snapshot());
});
test('duplicate queue/seat ownership and inconsistent guest payments cannot replace a live park',()=>{
 const {e}=park(),s=until(e,s=>s.rides[0].queue.length>0&&s.people.guests.some(g=>g.phase==='riding')),before=e.exportSave();
 for(const mutate of [s=>s.rides[0].queue.push(s.rides[0].queue[0]),s=>s.trains[0].seats[1]=s.trains[0].seats[0],s=>s.people.guests[0].cash++,s=>s.ledger.rideSales++,s=>s.people.guests[0].id=s.trains[0].carIds[0],s=>s.people.guests.find(g=>g.phase==='riding').seat.slot=99]){const bad=structuredClone(s);mutate(bad);assert.equal(e.restoreSave(JSON.stringify(bad)).ok,false);assert.equal(e.exportSave(),before);}
});

test('the shared registry counts live guests and cars together and refuses another train atomically',()=>{
 const {e}=park();e.advance(20);apply(e,{type:'set-park-open',open:false});const s=e.snapshot(),template=s.people.guests[0];assert(template);assert.equal(template.spent,0);
 s.people.guests=Array.from({length:9999},(_,i)=>({...structuredClone(template),id:i+2}));s.nextEntity=10001;assert(e.restoreSave(JSON.stringify(s)).ok);
 assert.equal(e.snapshot().people.guests.length+e.snapshot().trains[0].carIds.length,10000);assert(e.exportSave().length<16*1024*1024);assert(e.restoreSave(e.exportSave()).ok);
 const second=apply(e,{type:'create-ride',name:'Capacity probe',tile:{x:20,y:20},height:32,direction:0}).id,stations=[];
 for(const piece of ['station','station','right','right','flat','flat','right','right']){const section=apply(e,{type:'append-track',ride:second,piece});if(piece==='station')stations.push(section.id);}
 for(const [station,role,x] of [[stations[0],'entrance',20],[stations[1],'exit',21]])apply(e,{type:'place-portal',ride:second,station,role,tile:{x,y:19},height:32,direction:1});
 const before=e.exportSave(),command={type:'set-ride-status',ride:second,status:'testing'};assert.equal(e.quote(command).error.code,'CAPACITY');assert.equal(e.execute(command,e.revision).error.code,'CAPACITY');assert.equal(e.exportSave(),before);
});
test('saving midway through a walking leg preserves movement and future payment after load',()=>{
 const {e}=park(),s=until(e,s=>s.people.guests.some(g=>g.phase==='walking'&&g.next!==null&&g.walkProgress>0)),restored=create();assert(s.people.guests.some(g=>g.next));assert(restored.restoreSave(e.exportSave()).ok);
 e.advance(1000);restored.advance(37);restored.advance(963);assert.equal(restored.exportSave(),e.exportSave());memberships(restored.snapshot());
});
