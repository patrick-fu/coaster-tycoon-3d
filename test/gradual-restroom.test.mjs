import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../dist/simulation/index.js';
import {withGradualRestroomProfile} from '../dist/content/gradual-restroom.js';
import {gradualRestroomContent} from '../dist/content/registry.js';
import {rules,options,apply} from './fixtures.mjs';

function park(configure=()=>{}){
 const p=withGradualRestroomProfile(structuredClone(rules));
 Object.assign(p.guests,{spawnTicks:1,decisionTicks:1,walkTicks:1,initialHunger:0,initialThirst:0,needGrowth:0});
 Object.assign(p.services,{initialBladder:40,needThreshold:1});configure(p);
 const e=new Engine(options,p),point={x:10,y:10,z:32};
 apply(e,{type:'set-terrain',tile:{x:10,y:9},height:32,water:0});
 const facility=apply(e,{type:'place-facility',name:'Restroom',kind:'restroom',tile:{x:10,y:9},height:32,direction:1,content:gradualRestroomContent()}).id;
 const path=apply(e,{type:'place-path',tile:{x:10,y:10},height:32,queueFor:null}).id;
 apply(e,{type:'set-facility-open',facility,open:true});
 apply(e,{type:'set-park-entrance',point});apply(e,{type:'set-park-open',open:true});
 return{e,p,facility,path,point};
}
const tick=(e,n=1)=>assert.deepEqual(e.advance(n),{ok:true,value:n});
function admitted(count=2,configure){
 const c=park(configure);tick(c.e,count);apply(c.e,{type:'set-park-open',open:false});tick(c.e);
 assert.equal(c.e.snapshot().people.guests.length,count);
 assert(c.e.snapshot().people.guests.every(g=>g.phase==='using-restroom'));
 return c;
}

test('a gradual restroom places projects and restores as a service without a product',()=>{
 const {e,facility}=park(),saved=e.exportSave();
 const shown=e.view({bounds:{x0:0,y0:0,x1:31,y1:31},includeStatic:true});assert(shown.ok);
 const f=shown.value.facilities.find(f=>f.id===facility);
 assert.equal(f.price,0);assert.equal(f.product,null);
 assert.deepEqual(f.restroom,{using:0,exiting:0,guestIds:[]});assert(e.restoreSave(saved).ok);
 assert.equal(e.exportSave(),saved);
});

test('free admitted owners cannot outnumber the booked admissions in a restored park',()=>{
 const {e,facility}=admitted(),valid=e.exportSave();
 assert.equal(e.snapshot().facilities.find(f=>f.id===facility).sales,2);
 assert(e.restoreSave(valid).ok);
 const command={type:'set-paused',paused:true},quote=e.quote(command);assert(quote.ok);
 for(const sales of [1,0]){
  const invalid=e.snapshot();invalid.facilities.find(f=>f.id===facility).sales=sales;
  const result=e.restoreSave(JSON.stringify(invalid));
  assert.equal(result.ok,false,'Each admitted owner requires a booked admission, including a free one.');
  assert.equal(result.error.code,'INVALID_SAVE');assert.equal(e.exportSave(),valid);assert.equal(e.revision,quote.value.revision);
 }
 assert(e.execute(command,quote.value.revision).ok);
});


test('admission charges the live entry price once before gradual relief despite later closure and repricing',()=>{
 const {e,facility}=park();tick(e);const waiting=e.snapshot().people.guests[0];
 assert.equal(waiting.phase,'walking');assert.equal(waiting.bladder,40);assert.equal(waiting.spent,0);
 apply(e,{type:'set-park-open',open:false});apply(e,{type:'set-facility-price',facility,price:17});
 const cash=e.snapshot().cash;tick(e);let state=e.snapshot(),guest=state.people.guests[0],f=state.facilities[0];
 assert.equal(guest.phase,'using-restroom');assert.equal(guest.bladder,40);assert.equal(guest.cash,83);assert.equal(guest.spent,17);
 assert.equal(state.cash,cash+17);assert.equal(state.ledger.shopSales,17);assert.equal(state.ledger.stock,0);assert.equal(f.sales,1);assert.equal(f.income,17);
 apply(e,{type:'set-facility-open',facility,open:false});apply(e,{type:'set-facility-price',facility,price:1000});tick(e);
 assert.equal(e.snapshot().people.guests[0].bladder,36);assert(e.restoreSave(e.exportSave()).ok);
 tick(e,9);guest=e.snapshot().people.guests[0];assert.equal(guest.bladder,0);assert.equal(guest.phase,'restroom-exit');
 tick(e);state=e.snapshot();guest=state.people.guests[0];assert.equal(guest.phase,'walking');assert.equal(guest.facility,null);
 assert.deepEqual(guest.point,{x:10,y:10,z:32});assert.equal(guest.cash,83);assert.equal(state.facilities[0].sales,1);assert.equal(state.ledger.shopSales,17);
});

test('six concurrent admitted guests have no fabricated capacity and use detached occupancy instead of pedestrian pixels',()=>{
 const {e,facility}=admitted(6),view=()=>e.view({bounds:{x0:0,y0:0,x1:31,y1:31},includeStatic:true}).value;
 let packet=view(),f=packet.facilities.find(f=>f.id===facility);assert.equal(packet.counts.guests,6);assert.equal(packet.people.length,0);
 assert.equal(f.sales,6);assert.equal(f.restroom.using,6);assert.equal(f.restroom.exiting,0);assert.deepEqual(f.restroom.guestIds,e.snapshot().people.guests.map(g=>g.id));
 f.restroom.guestIds.pop();f.restroom.using=0;f=view().facilities.find(f=>f.id===facility);assert.equal(f.restroom.using,6);assert.equal(f.restroom.guestIds.length,6);
 assert(e.restoreSave(e.exportSave()).ok);
});

test('using a restroom completes despite rapid need growth and a blocked exit resumes normal bladder growth',()=>{
 for(const growth of [4,5]){
  const {e,p,facility,path,point}=admitted(1,p=>{
   Object.assign(p.guests,{needTicks:1,needGrowth:growth});
   p.restroomProfiles['independent.gradual-restroom-service-v1'].defaultPrice=17;
  });
  const admittedGuest=e.snapshot().people.guests[0];
  assert.equal(admittedGuest.bladder,growth===4?48:50);assert.equal(admittedGuest.cash,83);assert.equal(admittedGuest.spent,17);
  apply(e,{type:'set-facility-open',facility,open:false});apply(e,{type:'set-facility-price',facility,price:1000});apply(e,{type:'remove-path',id:path});
  const saved=e.exportSave(),split=new Engine(options,p);assert(split.restoreSave(saved).ok);
  const useTicks=growth===4?12:13;
  tick(e,useTicks);tick(split,1);tick(split,useTicks-1);assert.equal(split.exportSave(),e.exportSave());
  const completed=e.snapshot().people.guests[0];
  assert.equal(completed.phase,'restroom-exit');assert.equal(completed.bladder,0);
  assert.equal(completed.hunger,admittedGuest.hunger+growth*useTicks);assert.equal(completed.thirst,admittedGuest.thirst+growth*useTicks);
  assert.equal(completed.energy,admittedGuest.energy-growth*useTicks);assert.equal(completed.cash,83);assert.equal(completed.spent,17);
  tick(e,3);const blocked=e.snapshot().people.guests[0];assert.equal(blocked.phase,'restroom-exit');assert.equal(blocked.bladder,3*growth);
  assert.equal(e.quote({type:'remove-facility',facility}).ok,false);
  const receiving=new Engine(options,p);assert(receiving.restoreSave(e.exportSave()).ok);
  apply(receiving,{type:'place-path',tile:{x:point.x,y:point.y},height:point.z,queueFor:null});tick(receiving);
  const released=receiving.snapshot(),guest=released.people.guests[0];assert.equal(guest.phase,'walking');assert.equal(guest.facility,null);assert.equal(guest.bladder,4*growth);
  assert.deepEqual(guest.point,point);assert.equal(guest.cash,83);assert.equal(guest.spent,17);assert.equal(released.facilities[0].sales,1);assert.equal(released.facilities[0].income,17);assert.equal(released.ledger.shopSales,17);
 }
});

test('a disconnected front exit keeps paid guests inside across closed paused save restoration until a legal path returns',()=>{
 const {e,p,facility,path}=admitted(2);apply(e,{type:'set-facility-open',facility,open:false});apply(e,{type:'remove-path',id:path});tick(e,12);
 const before=e.snapshot();assert(before.people.guests.every(g=>g.phase==='restroom-exit'&&g.facility===facility));
 const failed=e.quote({type:'remove-facility',facility});assert.equal(failed.ok,false);assert.equal(e.exportSave(),JSON.stringify(before));
 apply(e,{type:'set-paused',paused:true});const saved=e.exportSave(),receiving=new Engine(options,p);assert(receiving.restoreSave(saved).ok);
 assert.deepEqual(receiving.advance(100),{ok:true,value:0});assert.equal(receiving.exportSave(),saved);
 apply(receiving,{type:'place-path',tile:{x:10,y:10},height:32,queueFor:null});apply(receiving,{type:'set-paused',paused:false});tick(receiving);
 const after=receiving.snapshot();assert(after.people.guests.every(g=>g.phase==='walking'&&g.facility===null&&g.point.x===10&&g.point.y===10&&g.point.z===32));
 assert.equal(after.facilities[0].sales,2);assert.equal(after.ledger.shopSales,0);
});

test('occupied demolition retires paid revenue releases partial visits and clears ownership before facility slot reuse',()=>{
 const {e,facility}=admitted(3,p=>{p.restroomProfiles['independent.gradual-restroom-service-v1'].defaultPrice=17;});
 const before=e.snapshot(),needs=before.people.guests.map(g=>g.bladder);assert.equal(before.ledger.shopSales,51);assert(needs.every(n=>n>0));
 apply(e,{type:'remove-facility',facility});let after=e.snapshot();assert.equal(after.cash,before.cash+100);assert.equal(after.retiredShopIncome,51);assert.equal(after.retiredStock,0);
 assert.equal(after.ledger.shopSales,51);assert.equal(after.ledger.stock,0);assert.deepEqual(after.people.guests.map(g=>g.bladder),needs);
 assert(after.people.guests.every(g=>g.facility===null&&g.phase==='walking'&&g.goal===null&&g.next===null&&g.cash===83));assert.equal(after.facilities.length,0);
 const reused=apply(e,{type:'place-facility',name:'Replacement',kind:'restroom',tile:{x:10,y:9},height:32,direction:1,content:gradualRestroomContent()}).id;
 after=e.snapshot();assert.equal(reused,facility);assert(after.facilities[0].instanceId>before.facilities[0].instanceId);assert.equal(after.facilities[0].sales,0);assert(after.people.guests.every(g=>g.facility===null));assert(e.restoreSave(e.exportSave()).ok);
});

test('partial paid restroom visits preserve whole authority across full and split advances',()=>{
 const {e,p,facility}=admitted(2,p=>{p.restroomProfiles['independent.gradual-restroom-service-v1'].defaultPrice=17;});
 apply(e,{type:'set-facility-open',facility,open:false});const saved=e.exportSave(),split=new Engine(options,p);assert(split.restoreSave(saved).ok);
 tick(e,15);for(const n of [1,4,2,8])tick(split,n);assert.equal(split.exportSave(),e.exportSave());
 assert.equal(e.snapshot().facilities[0].sales,2);assert.equal(e.snapshot().ledger.shopSales,34);
});


test('forged admitted phases positions and navigation preserve authority and pending commands on rejection',()=>{
 const {e,facility}=admitted(2),valid=e.exportSave(),command={type:'set-paused',paused:true},quote=e.quote(command);assert(quote.ok);
 for(const mutate of [
  g=>g.facility=null,g=>g.point.x++,g=>g.point.z+=8,g=>g.goal={x:10,y:10,z:32},
  g=>g.next={x:10,y:10,z:32},g=>g.walkProgress=1,g=>g.serviceProgress=1,g=>g.phase='buying',
  g=>g.informationCounter=0,g=>g.amenity=999,
 ]){
  const invalid=e.snapshot();mutate(invalid.people.guests[0]);const result=e.restoreSave(JSON.stringify(invalid));assert.equal(result.ok,false);assert.equal(result.error.code,'INVALID_SAVE');assert.equal(e.exportSave(),valid);assert.equal(e.revision,quote.value.revision);
 }
 assert.equal(e.snapshot().facilities.find(f=>f.id===facility).sales,2);assert(e.execute(command,quote.value.revision).ok);
});


test('a later payroll overflow rolls back an earlier real admission relief time and pending quote',()=>{
 const {e,p,facility,point}=park(p=>{p.services.weekTicks=8;p.restroomProfiles['independent.gradual-restroom-service-v1'].defaultPrice=17;});
 apply(e,{type:'hire-staff',role:'mechanic',point});tick(e);apply(e,{type:'set-park-open',open:false});
 // This explicit capacity fixture preserves the full finance equation; guest visit history is genuine.
 const capacity=e.snapshot(),extra=BigInt(Number.MAX_SAFE_INTEGER)-BigInt(capacity.ledger.wages);
 capacity.ledger.wages=Number.MAX_SAFE_INTEGER;capacity.cash=Number(BigInt(capacity.cash)-extra);assert(e.restoreSave(JSON.stringify(capacity)).ok);
 const before=e.exportSave(),quote=e.quote({type:'set-paused',paused:true});assert(quote.ok);
 const earlier=new Engine(options,p);assert(earlier.restoreSave(before).ok);tick(earlier);
 assert.equal(earlier.snapshot().people.guests[0].phase,'using-restroom');assert.equal(earlier.snapshot().people.guests[0].spent,17);assert.equal(earlier.snapshot().facilities.find(f=>f.id===facility).sales,1);
 const result=e.advance(7);assert.equal(result.ok,false);assert.equal(result.error.code,'CAPACITY');assert.equal(e.exportSave(),before);assert.equal(e.revision,quote.value.revision);
 assert(e.execute({type:'set-paused',paused:true},quote.value.revision).ok);
});
