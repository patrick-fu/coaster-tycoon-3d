import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../dist/simulation/index.js';
import {apply,create,operatingPark,rules,options} from './fixtures.mjs';
function advance(e,n){while(n>0){const batch=Math.min(4096,n),result=e.advance(batch);assert(result.ok,JSON.stringify(result));n-=batch;}}
function shop(kind='food'){
 const p=structuredClone(rules);p.guests.spawnTicks=200;p.guests.decisionTicks=1;p.guests.walkTicks=2;p.guests.initialHunger=kind==='food'?900:0;p.guests.initialThirst=kind==='drink'?900:0;p.services.initialBladder=kind==='restroom'?900:0;p.services.serviceTicks=10;
 const e=new Engine(options,p),path=apply(e,{type:'place-path',tile:{x:10,y:10},height:32,queueFor:null}).id;
 const id=apply(e,{type:'place-facility',name:'Service',kind,tile:{x:10,y:9},height:32,direction:1}).id;
 apply(e,{type:'set-facility-open',facility:id,open:true});apply(e,{type:'set-park-entrance',point:{x:10,y:10,z:32}});apply(e,{type:'set-park-open',open:true});advance(e,200);apply(e,{type:'set-park-open',open:false});return{e,id,path,p};
}
function maintenance(){
 const {engine:e,id}=operatingPark();for(const [x,y] of [[10,7],[11,7],[11,8]])apply(e,{type:'place-path',tile:{x,y},height:32,queueFor:null});
 const staff=apply(e,{type:'hire-staff',role:'mechanic',point:{x:10,y:7,z:32}}).id;apply(e,{type:'set-ride-broken',ride:id,broken:true});return{e,id,staff};
}

test('food, drink and restroom motives cause an actual counter visit and reconciled purchase',()=>{
 for(const [kind,need,stock] of [['food','hunger',3],['drink','thirst',2],['restroom','bladder',0]]){
  const {e}=shop(kind),before=e.snapshot();advance(e,12);const s=e.snapshot(),g=s.people.guests[0];assert.equal(g[need],200);assert.equal(g.cash,90);assert.equal(g.spent,10);assert.equal(s.facilities[0].sales,1);assert.equal(s.facilities[0].income,10);assert.equal(s.ledger.shopSales,10);assert.equal(s.ledger.stock,stock);assert.equal(s.cash,before.cash+10-stock);assert(e.restoreSave(e.exportSave()).ok);
 }
});
test('current shop prices are charged at service completion and unavailable purchases recover without payment',()=>{
 const {e,id}=shop();advance(e,2);assert.equal(e.snapshot().people.guests[0].phase,'buying');apply(e,{type:'set-facility-price',facility:id,price:30});advance(e,10);assert.equal(e.snapshot().people.guests[0].spent,30);
 for(const mutation of ['close','reprice','remove']){const {e,id}=shop();advance(e,2);apply(e,mutation==='close'?{type:'set-facility-open',facility:id,open:false}:mutation==='reprice'?{type:'set-facility-price',facility:id,price:200}:{type:'remove-facility',facility:id});advance(e,20);assert.equal(e.snapshot().ledger.shopSales,0);assert.equal(e.snapshot().people.guests[0].spent,0);assert(e.restoreSave(e.exportSave()).ok);}
});
test('demolishing a used shop retains historical income and stock while permitting slot reuse',()=>{
 const {e,id}=shop();advance(e,12);apply(e,{type:'remove-facility',facility:id});assert.equal(e.snapshot().retiredShopIncome,10);assert.equal(e.snapshot().retiredStock,3);assert(e.restoreSave(e.exportSave()).ok);const replacement=apply(e,{type:'place-facility',name:'Replacement',kind:'drink',tile:{x:10,y:9},height:32,direction:1});assert.equal(replacement.id,id);assert(e.restoreSave(e.exportSave()).ok);
});
test('the shared 255-instance pool includes facilities and prevents coaster over-allocation',()=>{
 const e=create({side:32,cash:100000});for(let i=0;i<255;i++)apply(e,{type:'place-facility',name:'Slot',kind:'food',tile:{x:1+i%29,y:1+Math.floor(i/29)},height:32,direction:0});const before=e.exportSave();assert.equal(e.quote({type:'create-ride',name:'Overflow',tile:{x:29,y:29},height:32,direction:0}).error.code,'CAPACITY');assert.equal(e.exportSave(),before);assert(e.restoreSave(e.exportSave()).ok);
});
test('weekly wages and interest and fortnightly upkeep are separate compulsory expenses',()=>{
 const p=structuredClone(rules);p.services.weekTicks=100;p.services.mechanicMonthlyWage=400;p.services.handymanMonthlyWage=200;
 const e=new Engine({...options,cash:100},p);apply(e,{type:'place-path',tile:{x:10,y:10},height:32,queueFor:null});for(const role of ['mechanic','handyman'])apply(e,{type:'hire-staff',role,point:{x:10,y:10,z:32}});apply(e,{type:'set-loan',amount:1000});advance(e,99);assert.equal(e.snapshot().ledger.wages,0);advance(e,1);let s=e.snapshot();assert.equal(s.ledger.wages,150);assert.equal(s.ledger.interest,10);assert.equal(s.cash,928);advance(e,600);s=e.snapshot();assert.equal(s.cash,-32);assert.equal(s.ledger.wages,1050);assert.equal(s.ledger.interest,70);assert(e.restoreSave(e.exportSave()).ok);assert.equal(e.quote({type:'place-path',tile:{x:11,y:10},height:32,queueFor:null}).error.code,'INSUFFICIENT_CASH');apply(e,{type:'set-loan',amount:1100});assert.equal(e.snapshot().cash,68);assert.equal(e.snapshot().ledger.wages,1050);
 const {e:park}=shop();apply(park,{type:'set-park-open',open:false});advance(park,8192-park.snapshot().tick);assert.equal(park.snapshot().ledger.upkeep,10);apply(park,{type:'set-facility-open',facility:0,open:false});advance(park,4096);advance(park,4096);assert.equal(park.snapshot().ledger.upkeep,10);
});
test('an operating coaster pays upkeep without ticket sales and a closed one stops that charge',()=>{
 const {engine:e,id}=operatingPark();apply(e,{type:'set-ride-status',ride:id,status:'testing'});advance(e,4096);advance(e,4096);assert.equal(e.snapshot().ledger.rideSales,0);assert.equal(e.snapshot().ledger.upkeep,20);apply(e,{type:'set-ride-status',ride:id,status:'closed'});advance(e,4096);advance(e,4096);assert.equal(e.snapshot().ledger.upkeep,20);assert(e.restoreSave(e.exportSave()).ok);
});
test('a mechanic must reach a station inside patrol and complete work before releasing breakdown',()=>{
 const {e,id,staff}=maintenance();apply(e,{type:'set-staff-patrol',staff,tiles:[{x:10,y:7}]});advance(e,100);assert.equal(e.snapshot().rides[0].broken,true);assert.equal(e.snapshot().staff[0].job,null);
 apply(e,{type:'set-staff-patrol',staff,tiles:[{x:10,y:7},{x:11,y:7},{x:11,y:8}]});advance(e,16);let s=e.snapshot();assert.equal(s.rides[0].broken,true);assert.equal(s.staff[0].point.x,11);assert.equal(s.staff[0].point.y,8);advance(e,39);assert.equal(e.snapshot().rides[0].broken,true);advance(e,1);s=e.snapshot();assert.equal(s.rides[0].broken,false);assert.equal(s.staff[0].completed,1);assert.equal(s.rides[0].lastInspection,s.tick);assert(e.restoreSave(e.exportSave()).ok);
});
test('a disconnected mechanic job cancels, then a restored route permits repair',()=>{
 const {e,id}=maintenance();advance(e,4);assert(e.snapshot().staff[0].job);const path=e.snapshot().elements.find(t=>t.kind==='path'&&t.tile.x===11&&t.tile.y===7);apply(e,{type:'remove-path',id:path.id});assert.equal(e.snapshot().staff[0].job,null);advance(e,100);assert.equal(e.snapshot().rides[0].broken,true);assert(e.restoreSave(e.exportSave()).ok);apply(e,{type:'place-path',tile:{x:11,y:7},height:32,queueFor:null});advance(e,56);assert.equal(e.snapshot().rides[0].broken,false);
});
test('scheduled inspection is actual staff work and survives a partial-job save',()=>{
 const {e,id}=maintenance();apply(e,{type:'set-ride-broken',ride:id,broken:false});advance(e,4096);advance(e,4096);assert.equal(e.snapshot().staff[0].job.kind,'inspection');advance(e,3);const restored=create();assert(restored.restoreSave(e.exportSave()).ok);advance(e,80);advance(restored,17);advance(restored,63);assert.equal(restored.exportSave(),e.exportSave());assert.equal(e.snapshot().staff[0].completed,1);
});
test('shop service continuation and finance boundaries do not depend on advance batch sizes',()=>{
 const {e,p}=shop();advance(e,4);const restored=new Engine(options,p);assert(restored.restoreSave(e.exportSave()).ok);advance(e,4000);advance(restored,13);advance(restored,3987);assert.equal(restored.exportSave(),e.exportSave());
});
test('staff records reject shared ID collisions, impossible jobs and inconsistent shop stock',()=>{
 const {e}=maintenance();advance(e,3);const original=e.exportSave();for(const mutate of [s=>s.staff[0].id=s.nextEntity,s=>s.staff[0].goal={x:10,y:7,z:32},s=>s.staff[0].patrol=[{x:10,y:7}],s=>s.ledger.stock++]){const bad=JSON.parse(original);mutate(bad);assert.equal(e.restoreSave(JSON.stringify(bad)).ok,false);assert.equal(e.exportSave(),original);}
});
test('payroll cannot overflow cash and a failing multi-tick batch rolls back time and all services',()=>{
 const p=structuredClone(rules);p.services.weekTicks=100;p.services.mechanicMonthlyWage=4;const e=new Engine({...options,cash:12},p);apply(e,{type:'place-path',tile:{x:10,y:10},height:32,queueFor:null});apply(e,{type:'hire-staff',role:'mechanic',point:{x:10,y:10,z:32}});const s=e.snapshot();s.cash=-Number.MAX_SAFE_INTEGER;s.ledger.wages=Number.MAX_SAFE_INTEGER;assert(e.restoreSave(JSON.stringify(s)).ok);const before=e.exportSave();assert.equal(e.advance(100).error.code,'CAPACITY');assert.equal(e.exportSave(),before);
});
test('the legacy 200-staff cap is additional to the shared entity budget and firing permits replacement',()=>{
 const e=create();apply(e,{type:'place-path',tile:{x:10,y:10},height:32,queueFor:null});for(let n=0;n<200;n++)apply(e,{type:'hire-staff',role:'handyman',point:{x:10,y:10,z:32}});const command={type:'hire-staff',role:'mechanic',point:{x:10,y:10,z:32}},before=e.exportSave();assert.equal(e.quote(command).error.code,'CAPACITY');assert.equal(e.execute(command,e.revision).error.code,'CAPACITY');assert.equal(e.exportSave(),before);apply(e,{type:'fire-staff',staff:1});assert.equal(apply(e,command).id,201);assert(e.restoreSave(e.exportSave()).ok);
});

test('removing a job portal or manually clearing breakdown immediately releases stale mechanic work',()=>{
 for(const action of ['portal','repair']){const {e,id}=maintenance();advance(e,4);assert(e.snapshot().staff[0].job);if(action==='portal'){const portal=e.snapshot().elements.find(t=>t.kind==='portal'&&t.role==='exit');apply(e,{type:'remove-portal',id:portal.id});}else apply(e,{type:'set-ride-broken',ride:id,broken:false});assert.equal(e.snapshot().staff[0].job,null);assert(e.restoreSave(e.exportSave()).ok);}
});
