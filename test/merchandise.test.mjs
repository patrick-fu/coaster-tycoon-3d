import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../dist/simulation/index.js';
import {withInformationProfile} from '../dist/content/facility-profiles.js';
import {withMerchandiseProfile,merchandiseProfileId} from '../dist/content/merchandise.js';
import {withConsumablesProfile,commerceProfileId} from '../dist/content/consumables.js';
import {withGradualRestroomProfile} from '../dist/content/gradual-restroom.js';
import {consumableFacilityContent,informationFacilityContent,gradualRestroomContent} from '../dist/content/registry.js';
import {rules,options,apply,operatingPark} from './fixtures.mjs';

const map='independent.map',umbrella='independent.umbrella',dirs=[[1,0],[0,1],[-1,0],[0,-1]];
const viewRequest={bounds:{x0:0,y0:0,x1:31,y1:31},includeStatic:true};
function profile(configure=()=>{}){
 const p=withInformationProfile(structuredClone(rules));
 Object.assign(p.guests,{spawnTicks:200,decisionTicks:1,walkTicks:1,initialHunger:0,initialThirst:0,needGrowth:0});
 Object.assign(p.services,{initialBladder:0,serviceTicks:2});configure(p);return p;
}
function tick(e,n){while(n){const count=Math.min(n,4096);assert.deepEqual(e.advance(count),{ok:true,value:count});n-=count;}}
const guest=c=>{const r=c.e.inspect('guest',c.gid);assert(r.ok);return r.value;};
function until(c,predicate,limit=64){let n=0;while(!predicate(guest(c))&&n++<limit)tick(c.e,1);assert(predicate(guest(c)),'Expected guest outcome within '+limit+' ticks.');}
function emptyCounter(p=profile(),direction=0,side=0,pathHeight=16){
 const e=new Engine(options,p),[dx,dy]=dirs[side],point={x:10+dx,y:10+dy,z:pathHeight};
 const facility=apply(e,{type:'place-facility',name:'Information',kind:'information',tile:{x:10,y:10},height:16,direction}).id;
 const path=apply(e,{type:'place-path',tile:{x:point.x,y:point.y},height:point.z,queueFor:null}).id;
 apply(e,{type:'set-facility-open',facility,open:true});return{e,p,facility,path,point};
}
function arrive(c,n=c.p.guests.spawnTicks){
 apply(c.e,{type:'set-park-entrance',point:c.point});apply(c.e,{type:'set-park-open',open:true});tick(c.e,n);apply(c.e,{type:'set-park-open',open:false});
 c.gid=c.e.snapshot().people.guests[0].id;return c;
}
function buyer(configure=()=>{}){const c=arrive(emptyCounter(profile(configure)));until(c,g=>g.phase==='buying');return c;}
function controlled(c,patch,rng=0){
 // Legal saved decision inputs isolate policy; genuine ride history is tested separately below.
 const s=c.e.snapshot();Object.assign(s.people.guests.find(g=>g.id===c.gid),patch);s.rng=rng;
 assert.deepEqual(c.e.restoreSave(JSON.stringify(s)),{ok:true,value:undefined});return c;
}
const product=(c,id)=>c.e.snapshot().facilities.find(f=>f.id===c.facility).products[id];
function rideCounter({p=profile(),mapPrice=6,open=true,food=false}={}){
 const {engine:e,id:ride}=operatingPark(new Engine(options,p));
 for(const [x,y,queueFor] of [[10,7,null],[11,7,null],[11,8,null],[10,8,ride]])apply(e,{type:'place-path',tile:{x,y},height:32,queueFor});
 if(food){const facility=apply(e,{type:'place-facility',name:'Burger',kind:'food',tile:{x:10,y:6},height:32,direction:1,content:consumableFacilityContent('independent.burger')}).id;apply(e,{type:'set-facility-open',facility,open:true});}
 apply(e,{type:'set-terrain',tile:{x:9,y:7},height:32,water:0});
 const facility=apply(e,{type:'place-facility',name:'Information',kind:'information',tile:{x:9,y:7},height:32,direction:0}).id;
 apply(e,{type:'set-facility-open',facility,open});apply(e,{type:'set-merchandise-price',facility,productId:map,price:mapPrice});
 apply(e,{type:'set-ride-price',ride,price:0});apply(e,{type:'set-ride-status',ride,status:'open'});
 tick(e,460);const c={e,p,facility,ride,point:{x:10,y:7,z:32}};return arrive(c,140);
}

test('one autonomous guest buys both products after three actual rides and retains unfinished food through retirement reuse and save batching',()=>{
 const p=withConsumablesProfile(profile(p=>Object.assign(p.guests,{initialHunger:900,initialHappiness:1000,rideCooldownTicks:1,rideNausea:0})));
 p.commerceProfiles[commerceProfileId].consumeTicks=512;
 const c=rideCounter({p,food:true}),{e,facility}=c,builtCash=e.snapshot().cash;
 until(c,g=>g.held?.kind==='consumable');until(c,g=>g.merchandise.map);
 for(let count=1;count<=3;count++)until(c,g=>g.ridesTaken>=count,2048);
 until(c,g=>g.merchandise.umbrellaColour!==null);
 const owned=guest(c);assert.equal(owned.merchandise.map,true);assert.equal(owned.merchandise.umbrellaColour,11);assert.equal(owned.held.productId,'independent.burger');assert(owned.held.remaining>0);
 assert.deepEqual(e.snapshot().ledger,{rideSales:0,shopSales:46,stock:26,wages:0,upkeep:0,interest:0});assert.equal(e.snapshot().cash,builtCash+20);
 assert.equal(product(c,map).income+product(c,umbrella).income,31);assert.equal(guest(c).spent,46);
 const shown=e.view(viewRequest).value.facilities.find(f=>f.id===facility).products;
 assert.deepEqual([shown[map].stockExpense,shown[umbrella].stockExpense,shown[map].grossMargin+shown[umbrella].grossMargin],[1,20,10]);
 apply(e,{type:'set-paused',paused:true});const saved=e.exportSave(),copy=new Engine(options,p);assert(copy.restoreSave(saved).ok);assert.equal(copy.exportSave(),saved);assert.deepEqual(e.advance(600),{ok:true,value:0});assert.equal(e.exportSave(),saved);
 const oldInstance=e.snapshot().facilities.find(f=>f.id===facility).instanceId,items={held:owned.held,merchandise:owned.merchandise};
 apply(e,{type:'remove-facility',facility});assert.deepEqual({held:guest(c).held,merchandise:guest(c).merchandise},items);
 const replacement=apply(e,{type:'place-facility',name:'Replacement',kind:'information',tile:{x:9,y:7},height:32,direction:0}).id;
 assert.equal(replacement,facility);assert(e.snapshot().facilities.find(f=>f.id===facility).instanceId>oldInstance);apply(e,{type:'set-facility-open',facility,open:true});
 assert.deepEqual(e.snapshot().retiredMerchandise,{[map]:{sales:1,income:6},[umbrella]:{sales:1,income:25}});
 assert(copy.restoreSave(e.exportSave()).ok);apply(e,{type:'set-paused',paused:false});apply(copy,{type:'set-paused',paused:false});tick(e,1200);for(const n of [1,17,400,782])tick(copy,n);
 assert.equal(copy.exportSave(),e.exportSave());assert.deepEqual({held:guest(c).held,merchandise:guest(c).merchandise},items);
 assert.equal(product(c,map).sales,0);assert.equal(product(c,umbrella).sales,0);assert(e.restoreSave(e.exportSave()).ok);
});

test('an autonomous owner retains bought food map and umbrella through a paid partial restroom visit and safe demolition',()=>{
 const p=withGradualRestroomProfile(withConsumablesProfile(profile(p=>{
  Object.assign(p.guests,{initialHunger:900,initialHappiness:1000,rideCooldownTicks:1,rideNausea:0});
  p.services.initialBladder=600;
 })));
 p.commerceProfiles[commerceProfileId].consumeTicks=512;
 const c=rideCounter({p,food:true}),{e}=c;
 until(c,g=>g.held?.kind==='consumable');until(c,g=>g.merchandise.map);
 for(let count=1;count<=3;count++)until(c,g=>g.ridesTaken>=count,2048);
 until(c,g=>g.merchandise.umbrellaColour!==null);
 const owned=guest(c);assert.equal(owned.merchandise.map,true);assert.equal(owned.merchandise.umbrellaColour,11);
 assert.equal(owned.held.productId,'independent.burger');assert(owned.held.remaining>0);
 for(const facility of e.snapshot().facilities)apply(e,{type:'set-facility-open',facility:facility.id,open:false});
 apply(e,{type:'set-terrain',tile:{x:11,y:6},height:32,water:0});
 const facility=apply(e,{type:'place-facility',name:'Owned-item restroom',kind:'restroom',tile:{x:11,y:6},height:32,direction:1,content:gradualRestroomContent()}).id;
 apply(e,{type:'set-facility-price',facility,price:17});apply(e,{type:'set-facility-open',facility,open:true});
 until(c,g=>g.phase==='using-restroom',256);const admitted=guest(c);
 assert.equal(admitted.cash,owned.cash-17);assert.equal(admitted.spent,owned.spent+17);
 assert.deepEqual(admitted.merchandise,owned.merchandise);assert.equal(admitted.held.productId,'independent.burger');assert(admitted.held.remaining>0);
 assert.equal(e.snapshot().facilities.find(f=>f.id===facility).income,17);assert.equal(e.snapshot().facilities.find(f=>f.id===facility).sales,1);
 apply(e,{type:'set-facility-open',facility,open:false});apply(e,{type:'set-facility-price',facility,price:1000});
 apply(e,{type:'set-paused',paused:true});const saved=e.exportSave(),copy=new Engine(options,p);
 assert(copy.restoreSave(saved).ok);assert.equal(copy.exportSave(),saved);assert.deepEqual(copy.advance(100),{ok:true,value:0});assert.equal(copy.exportSave(),saved);
 const before=copy.snapshot(),items={held:admitted.held,merchandise:admitted.merchandise};
 apply(copy,{type:'remove-facility',facility});const released=copy.inspect('guest',c.gid).value,after=copy.snapshot();
 assert.equal(released.phase,'walking');assert.equal(released.facility,null);assert.deepEqual(released.point,{x:11,y:7,z:32});
 assert.equal(released.bladder,admitted.bladder);assert.equal(released.cash,admitted.cash);assert.equal(released.spent,admitted.spent);
 assert.deepEqual({held:released.held,merchandise:released.merchandise},items);
 assert.equal(after.cash,before.cash+100);assert.deepEqual(after.ledger,before.ledger);assert.equal(after.retiredShopIncome,before.retiredShopIncome+17);
 assert(copy.restoreSave(copy.exportSave()).ok);
});

for(let direction=0;direction<4;direction++)for(let side=0;side<4;side++)test('rotated kiosk '+direction+' serves public side '+side+' using its saved local counter',()=>{
 const c=arrive(emptyCounter(profile(),direction,side));until(c,g=>g.phase==='buying');assert.equal(guest(c).informationCounter,(side-direction+4)%4);
 assert.deepEqual(guest(c).point,c.point);assert(c.e.restoreSave(c.e.exportSave()).ok);until(c,g=>g.merchandise.map);
 assert.deepEqual(product(c,map),{price:6,sales:1,income:6});assert.equal(guest(c).informationCounter,null);assert.equal(c.e.snapshot().ledger.stock,1);
});

test('an Umbrella demand refusal falls back to exactly one Map sale and one saved RNG sample',()=>{
 const c=controlled(buyer(),{ridesTaken:3,happiness:800});tick(c.e,2);
 assert.deepEqual(guest(c).merchandise,{map:true,umbrellaColour:null});assert.deepEqual(product(c,map),{price:6,sales:1,income:6});assert.equal(product(c,umbrella).sales,0);
 assert.equal(c.e.snapshot().rng,1013904223);assert.equal(guest(c).happiness,800);assert.equal(guest(c).spent,6);assert.equal(c.e.snapshot().ledger.stock,1);
});

test('complete personal refusal saves an ordinary ride goal without immediately revisiting information',()=>{
 const c=rideCounter({mapPrice:35});until(c,g=>g.phase==='buying');controlled(c,{},1);tick(c.e,2);
 const g=guest(c);assert.equal(g.destination,c.ride);assert.deepEqual(g.goal,{x:10,y:8,z:32});assert.equal(g.facility,null);assert.equal(g.informationCounter,null);
 assert.deepEqual(g.merchandise,{map:false,umbrellaColour:null});assert.equal(c.e.snapshot().rng,1015568748);assert.equal(c.e.snapshot().ledger.shopSales,0);
 const saved=c.e.exportSave(),other=new Engine(options,c.p);assert(other.restoreSave(saved).ok);assert.equal(other.exportSave(),saved);tick(c.e,1);assert.equal(guest(c).facility,null);assert.equal(guest(c).destination,c.ride);
});

test('Map39 prefilter consumes no commerce RNG and leaves an actual available ride reachable',()=>{
 const c=rideCounter({mapPrice:39}),control=rideCounter({mapPrice:39,open:false});
 assert.equal(guest(c).ridesTaken,0);assert.equal(guest(c).cash,100);assert.equal(guest(c).facility,null);assert.equal(guest(c).destination,c.ride);
 assert.deepEqual(guest(c),guest(control));assert.equal(c.e.snapshot().rng,control.e.snapshot().rng);assert.equal(c.e.snapshot().ledger.shopSales,0);
});

for(const [happiness,price,bought,next] of [[501,21,false,0],[502,21,true,1013904223],[705,35,false,0],[706,35,true,1013904223],[800,8,true,1013904223],[800,39,false,0]])test('Map decision maps happiness '+happiness+' and current price '+price+' with exact independent sample timing',()=>{
 const c=buyer();apply(c.e,{type:'set-merchandise-price',facility:c.facility,productId:map,price});controlled(c,{happiness});tick(c.e,2);
 assert.equal(guest(c).merchandise.map,bought);assert.equal(c.e.snapshot().rng,next);assert.equal(guest(c).happiness,happiness);assert.equal(product(c,map).sales,bought?1:0);
});

test('current completion price free sales and immutable receiving stock cost book actual accounts once',()=>{
 const c=buyer(p=>p.merchandiseProfiles[merchandiseProfileId].products[map].stockCost=3);
 apply(c.e,{type:'set-merchandise-price',facility:c.facility,productId:map,price:5});const cash=c.e.snapshot().cash;tick(c.e,2);
 assert.deepEqual(product(c,map),{price:5,sales:1,income:5});assert.equal(c.e.snapshot().cash,cash+2);assert.equal(c.e.snapshot().ledger.stock,3);
 apply(c.e,{type:'set-merchandise-price',facility:c.facility,productId:map,price:100});tick(c.e,20);assert.equal(product(c,map).income,5);assert(c.e.restoreSave(c.e.exportSave()).ok);
 const free=buyer();apply(free.e,{type:'set-merchandise-price',facility:free.facility,productId:map,price:0});const before=free.e.snapshot().cash;tick(free.e,2);
 assert.equal(guest(free).merchandise.map,true);assert.equal(guest(free).spent,0);assert.equal(product(free,map).sales,1);assert.equal(product(free,map).income,0);assert.equal(free.e.snapshot().cash,before-1);assert(free.e.restoreSave(free.e.exportSave()).ok);
});

test('concurrent real buyers each receive one Map without sharing account or ownership objects',()=>{
 const c=arrive(emptyCounter(profile(p=>p.guests.spawnTicks=1)),8);tick(c.e,12);
 const s=c.e.snapshot();assert.equal(s.people.guests.length,8);assert(s.people.guests.every(g=>g.merchandise.map&&g.spent===6));assert.deepEqual(product(c,map),{price:6,sales:8,income:48});assert.equal(s.ledger.stock,8);assert(c.e.restoreSave(c.e.exportSave()).ok);
 const view=c.e.view(viewRequest).value,inspection=c.e.inspect('guest',c.gid).value,before=c.e.exportSave();
 view.facilities.find(f=>f.id===c.facility).products[map].sales=100;inspection.merchandise.map=false;assert.equal(c.e.exportSave(),before);
});

test('a purchased colour0 Umbrella remains owned after vendor recoloring demolition and slot reuse',()=>{
 const c=controlled(buyer(),{ridesTaken:3,happiness:1000});const s=c.e.snapshot();s.facilities[0].umbrellaColour=0;assert(c.e.restoreSave(JSON.stringify(s)).ok);tick(c.e,2);
 assert.deepEqual(guest(c).merchandise,{map:false,umbrellaColour:0});assert.equal(product(c,umbrella).income,25);assert.equal(product(c,map).sales,0);assert.equal(c.e.snapshot().rng,1013904223);
 const changed=c.e.snapshot();changed.facilities[0].umbrellaColour=31;assert(c.e.restoreSave(JSON.stringify(changed)).ok);assert.equal(guest(c).merchandise.umbrellaColour,0);
 apply(c.e,{type:'remove-facility',facility:c.facility});const id=apply(c.e,{type:'place-facility',name:'Replacement',kind:'information',tile:{x:10,y:10},height:16,direction:0}).id;assert.equal(id,c.facility);assert.equal(guest(c).merchandise.umbrellaColour,0);assert(c.e.restoreSave(c.e.exportSave()).ok);
});

for(const change of ['close','demolish','path','unaffordable'])test(change+' during a genuine service attempt grants no item accounts or stock',()=>{
 const c=buyer(),before=c.e.snapshot().rng;
 apply(c.e,change==='close'?{type:'set-facility-open',facility:c.facility,open:false}:change==='demolish'?{type:'remove-facility',facility:c.facility}:change==='path'?{type:'remove-path',id:c.path}:{type:'set-merchandise-price',facility:c.facility,productId:map,price:200});
 tick(c.e,8);assert.equal(guest(c).merchandise.map,false);assert.equal(guest(c).spent,0);assert.equal(c.e.snapshot().ledger.shopSales,0);assert.equal(c.e.snapshot().ledger.stock,0);assert.equal(c.e.snapshot().rng,before);assert(c.e.restoreSave(c.e.exportSave()).ok);
});

test('queue-only and wrong-height paths cannot become information counters',()=>{
 const wrong=arrive(emptyCounter(profile(),0,0,32));tick(wrong.e,16);assert.equal(guest(wrong).facility,null);assert.equal(wrong.e.snapshot().ledger.shopSales,0);
 const p=profile(),e=new Engine(options,p),ride=apply(e,{type:'create-ride',name:'Queue owner',tile:{x:4,y:4},height:16,direction:0}).id;
 const facility=apply(e,{type:'place-facility',name:'Queue kiosk',kind:'information',tile:{x:10,y:10},height:16,direction:0}).id;
 apply(e,{type:'place-path',tile:{x:11,y:10},height:16,queueFor:ride});apply(e,{type:'place-path',tile:{x:12,y:10},height:16,queueFor:null});apply(e,{type:'set-facility-open',facility,open:true});
 const c=arrive({e,p,facility,point:{x:12,y:10,z:16}});tick(e,16);assert.equal(guest(c).facility,null);assert.equal(e.snapshot().ledger.stock,0);assert(e.restoreSave(e.exportSave()).ok);
});

test('missing receiving profiles dry-ground and reserved clearance reject placement atomically',()=>{
 const command={type:'place-facility',name:'Information',kind:'information',tile:{x:10,y:10},height:16,direction:0,content:informationFacilityContent()};
 for(const p of [rules,withMerchandiseProfile(rules)]){const e=new Engine(options,p),before=e.exportSave();assert.equal(e.catalogue().variants.find(v=>v.id===command.content.variantId).choices[0].runtimeAvailable,false);assert.equal(e.quote(command).error.code,'UNSUPPORTED_CONTENT');assert.equal(e.execute(command,e.revision).error.code,'UNSUPPORTED_CONTENT');assert.equal(e.exportSave(),before);}
 const c=emptyCounter(),before=c.e.exportSave();assert.equal(c.e.quote({type:'place-path',tile:{x:10,y:10},height:32,queueFor:null}).error.code,'CLEARANCE');assert.equal(c.e.exportSave(),before);
 const e=new Engine(options,profile());assert.equal(e.quote({...command,height:32}).error.code,'GEOMETRY');
});

test('malformed ownership product accounts and wrong saved counter reject without losing a pending quote',()=>{
 const c=buyer(),before=c.e.exportSave(),command={type:'set-paused',paused:true},q=c.e.quote(command);assert(q.ok);
 for(const mutate of [s=>s.people.guests[0].informationCounter=1,s=>s.people.guests[0].merchandise.map=true,s=>s.people.guests[0].merchandise.umbrellaColour=32,s=>s.people.guests[0].merchandise.extra=true,s=>s.facilities[0].income=0,s=>s.facilities[0].products[map].sales=-1,s=>s.facilities[0].products[map].price=1001,s=>s.retiredMerchandise[umbrella].income=1]){
  const bad=c.e.snapshot();mutate(bad);const result=c.e.restoreSave(JSON.stringify(bad));assert.equal(result.ok,false);assert.equal(result.error.code,'INVALID_SAVE');assert.equal(c.e.exportSave(),before);assert.equal(c.e.revision,q.value.revision);
 }
 assert(c.e.execute(command,q.value.revision).ok);
});

for(const refusal of [false,true])test('a later compulsory-finance failure rolls back earlier '+(refusal?'refusal ordinary goal and RNG':'purchase account and permanent ownership')+' with the entire advance',()=>{
 const p=profile(p=>Object.assign(p.services,{weekTicks:1000,mechanicMonthlyWage:4})),c=rideCounter({p,mapPrice:refusal?35:6});until(c,g=>g.phase==='buying');controlled(c,{},1);
 apply(c.e,{type:'hire-staff',role:'mechanic',point:c.point});const s=c.e.snapshot(),extra=BigInt(Number.MAX_SAFE_INTEGER)-BigInt(s.ledger.wages);s.ledger.wages=Number.MAX_SAFE_INTEGER;s.cash=Number(BigInt(s.cash)-extra);assert(c.e.restoreSave(JSON.stringify(s)).ok);
 const before=c.e.exportSave(),revision=c.e.revision,control=new Engine(options,p);assert(control.restoreSave(before).ok);tick(control,2);
 const g=control.inspect('guest',c.gid).value;if(refusal){assert.equal(g.destination,c.ride);assert.equal(g.facility,null);assert.equal(g.merchandise.map,false);}else assert.equal(g.merchandise.map,true);
 assert.equal(c.e.advance(1000).error.code,'CAPACITY');assert.equal(c.e.exportSave(),before);assert.equal(c.e.revision,revision);
});

test('retiring an individually valid account whose aggregate sales overflow fails before any demolition',()=>{
 const c=emptyCounter(profile(p=>p.merchandiseProfiles[merchandiseProfileId].products[map].stockCost=0)),s=c.e.snapshot();s.retiredMerchandise[map].sales=Number.MAX_SAFE_INTEGER;s.facilities[0].products[map].sales=1;assert(c.e.restoreSave(JSON.stringify(s)).ok);
 const before=c.e.exportSave(),command={type:'remove-facility',facility:c.facility};assert.equal(c.e.quote(command).error.code,'CAPACITY');assert.equal(c.e.execute(command,c.e.revision).error.code,'CAPACITY');assert.equal(c.e.exportSave(),before);
});
