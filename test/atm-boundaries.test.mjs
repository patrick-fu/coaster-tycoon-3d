import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../dist/simulation/index.js';
import {rules,options,apply} from './fixtures.mjs';

const content={familyId:'independent.atm-facility',variantId:'independent.cash-machine',modeId:'independent.cash-withdrawal'};
const maxCount=Math.floor(Number.MAX_SAFE_INTEGER/500);
function counterPark({cash=90,energy=1000,happiness=1000,direction=3,guests=1,growth=0}={}){
 const p=structuredClone(rules);
 p.atmProfiles={'independent.atm-withdrawal-v1':{amount:500}};
 p.facilityProfiles={'independent.atm-v1':{height:32}};
 Object.assign(p.guests,{spawnTicks:1,decisionTicks:1,walkTicks:1,needTicks:1,initialHunger:0,initialThirst:0,initialHappiness:happiness,initialEnergy:energy,cashMin:cash,cashMax:cash,needGrowth:growth});
 p.services.initialBladder=0;
 const e=new Engine(options,p),[dx,dy]=[[1,0],[0,1],[-1,0],[0,-1]][direction],tile={x:10-dx,y:10-dy};
 apply(e,{type:'set-terrain',tile,height:32,water:0});
 apply(e,{type:'place-path',tile:{x:10,y:10},height:32,queueFor:null});
 const atm=apply(e,{type:'place-facility',name:'Cash machine',kind:'atm',tile,height:32,direction,content}).id;
 apply(e,{type:'set-facility-open',facility:atm,open:true});
 apply(e,{type:'set-park-entrance',point:{x:10,y:10,z:32}});apply(e,{type:'set-park-open',open:true});
 assert(e.advance(guests).ok);apply(e,{type:'set-park-open',open:false});
 return{e,p,atm,tile};
}
function waitFor(e,predicate,limit=128){
 for(let i=0;i<limit&&!predicate(e.snapshot());i++)assert(e.advance(1).ok);
 assert(predicate(e.snapshot()),'The bounded fixture must reach the required action.');
}
const withdrawing=s=>s.people.guests.every(g=>g.phase==='withdrawing');
const completed=s=>s.people.guests.every(g=>g.withdrawn===500);
function rejectWithoutChange(e,s){
 const original=e.exportSave(),quote=e.quote({type:'set-paused',paused:true});assert(quote.ok);
 const result=e.restoreSave(JSON.stringify(s));assert.equal(result.ok,false);assert.equal(result.error.code,'INVALID_SAVE');
 assert.equal(e.exportSave(),original);assert(e.execute({type:'set-paused',paused:true},quote.value.revision).ok);
}

test('all four ATM frontages use their real adjacent public counter',()=>{
 for(const direction of [0,1,2,3]){
  const {e}=counterPark({direction});waitFor(e,withdrawing);
  assert.deepEqual(e.snapshot().people.guests[0].point,{x:10,y:10,z:32});
  waitFor(e,completed);assert.equal(e.snapshot().facilities[0].withdrawals,1);
 }
});

test('cash and happiness seek thresholds select without sampling the admission RNG',()=>{
 let expectedRng;
 for(const [cash,happiness,selected] of [[90,1000,true],[91,1000,false],[90,411,false],[90,412,true]]){
  const {e,atm}=counterPark({cash,happiness});const g=e.snapshot().people.guests[0];
  if(expectedRng===undefined)expectedRng=e.snapshot().rng;else assert.equal(e.snapshot().rng,expectedRng);
  assert.equal(g.facility,selected?atm:null);assert.equal(g.withdrawn,0);assert.equal(g.phase,'walking');
 }
});

test('cash201 cannot enter by a forged action and ordinary arrival refuses without RNG',()=>{
 const {e,atm}=counterPark({cash:201});const forged=e.snapshot(),g=forged.people.guests[0];
 Object.assign(g,{facility:atm,phase:'withdrawing',goal:null,next:null,walkProgress:0,serviceProgress:0});
 rejectWithoutChange(e,forged);
 apply(e,{type:'set-paused',paused:false});
 const walking=e.snapshot();Object.assign(walking.people.guests[0],{facility:atm,goal:{x:10,y:10,z:32}});
 assert(e.restoreSave(JSON.stringify(walking)).ok);const before=e.snapshot();assert(e.advance(1).ok);const after=e.snapshot();
 assert.equal(after.rng,before.rng);assert.equal(after.people.guests[0].cash,201);assert.equal(after.people.guests[0].withdrawn,0);
 assert.deepEqual(after.people.guests[0].atmRefusal,{instanceId:after.facilities[0].instanceId,tick:after.tick});
});

test('energy624 refuses after the same one admission sample that accepts625',()=>{
 const refused=counterPark({energy:624}),accepted=counterPark({energy:625});
 assert(refused.e.advance(1).ok);assert(accepted.e.advance(1).ok);
 const a=refused.e.snapshot(),b=accepted.e.snapshot();
 assert.equal(a.rng,b.rng);assert.equal(a.people.guests[0].withdrawn,0);assert.equal(a.people.guests[0].phase,'walking');
 assert.equal(b.people.guests[0].phase,'withdrawing');assert.notEqual(a.people.guests[0].atmRefusal,null);
 assert(refused.e.advance(128).ok);assert.equal(refused.e.snapshot().facilities[0].withdrawals,0);
});

test('accepted energy632 to624 survives pause, strict save receiving and split completion',()=>{
 const {e,p}=counterPark({energy:634,growth:1});waitFor(e,withdrawing);
 assert.equal(e.snapshot().people.guests[0].energy,632);assert(e.advance(8).ok);
 assert.equal(e.snapshot().people.guests[0].energy,624);assert.equal(e.snapshot().people.guests[0].phase,'withdrawing');
 apply(e,{type:'set-paused',paused:true});const paused=e.exportSave();assert.equal(e.advance(100).value,0);assert.equal(e.exportSave(),paused);
 apply(e,{type:'set-paused',paused:false});const saved=e.exportSave(),full=new Engine(options,p),split=new Engine(options,p);
 assert(full.restoreSave(saved).ok);assert(split.restoreSave(saved).ok);
 assert(full.advance(12).ok);assert(split.advance(5).ok);assert(split.advance(7).ok);
 assert.equal(full.exportSave(),split.exportSave());assert.equal(full.snapshot().people.guests[0].withdrawn,500);
 assert.equal(full.snapshot().facilities[0].withdrawals,1);assert.equal(full.snapshot().people.guests[0].cash,590);
});

test('concurrent guests share the public frontage and each completion pays once',()=>{
 const {e,p}=counterPark({guests:2});waitFor(e,withdrawing);
 const view=e.view({bounds:{x0:0,y0:0,x1:31,y1:31},includeStatic:false});assert(view.ok);
 assert.equal(view.value.facilities[0].using,2);assert.equal(view.value.facilities[0].guestIds.length,2);
 const saved=e.exportSave(),receiver=new Engine(options,p);assert(receiver.restoreSave(saved).ok);waitFor(receiver,completed);
 assert.equal(receiver.snapshot().facilities[0].withdrawals,2);assert.equal(receiver.snapshot().ledger.shopSales,0);
 assert.equal(receiver.snapshot().facilities[0].withdrawals*500,1000);
});

test('closing or removing an unfinished ATM cancels before payout and reused slots start fresh',()=>{
 for(const remove of [false,true]){
  const {e,p,atm,tile}=counterPark();waitFor(e,withdrawing);assert(e.advance(8).ok);const before=e.snapshot();
  apply(e,remove?{type:'remove-facility',facility:atm}:{type:'set-facility-open',facility:atm,open:false});
  const after=e.snapshot(),g=after.people.guests[0];assert.equal(g.withdrawn,0);assert.equal(g.cash,90);assert.equal(g.facility,null);assert.equal(g.serviceProgress,0);
  assert.deepEqual(g.point,before.people.guests[0].point);assert.equal(after.retiredAtmWithdrawals,0);assert.deepEqual(after.ledger,before.ledger);
  if(remove){const reused=apply(e,{type:'place-facility',name:'Replacement cash machine',kind:'atm',tile,height:32,direction:3,content}).id;
   assert.equal(reused,atm);assert.notEqual(e.snapshot().facilities[0].instanceId,before.facilities[0].instanceId);assert.equal(e.snapshot().facilities[0].withdrawals,0);}
  assert(e.advance(32).ok);assert.equal(e.snapshot().people.guests[0].withdrawn,0);
  const receiver=new Engine(options,p);assert(receiver.restoreSave(e.exportSave()).ok);
 }
});

test('losing the actual frontage cancels without teleporting or dispensing',()=>{
 const {e}=counterPark();waitFor(e,withdrawing);const before=e.snapshot(),path=before.elements.find(v=>v.kind==='path');
 apply(e,{type:'remove-path',id:path.id});const after=e.snapshot();
 assert.deepEqual(after.people.guests[0].point,before.people.guests[0].point);assert.equal(after.people.guests[0].facility,null);
 assert.equal(after.people.guests[0].withdrawn,0);assert.equal(after.facilities[0].withdrawals,0);
});

test('aggregate conservation cannot hide individual withdrawn1 and499',()=>{
 const {e}=counterPark({guests:2});waitFor(e,completed);const forged=e.snapshot();forged.facilities[0].withdrawals=1;
 for(const [i,amount] of [[0,1],[1,499]])Object.assign(forged.people.guests[i],{withdrawn:amount,cash:90+amount});
 rejectWithoutChange(e,forged);
});

test('concurrent exhaustion preserves the complete advance entry and its pending quote',()=>{
 const {e,p,atm}=counterPark({guests:2});waitFor(e,withdrawing);const boundary=e.snapshot(),large=(maxCount-1)*500;
 boundary.facilities[0].withdrawals=maxCount-1;Object.assign(boundary.people.guests[0],{withdrawn:large,spent:large});
 for(const g of boundary.people.guests)g.serviceProgress=p.services.serviceTicks-1;
 boundary.retiredShopIncome=large;boundary.ledger.shopSales=large;boundary.spent+=large;
 assert(e.restoreSave(JSON.stringify(boundary)).ok);const original=e.exportSave(),command={type:'set-facility-open',facility:atm,open:false},quote=e.quote(command);assert(quote.ok);
 const result=e.advance(1);assert.equal(result.ok,false);assert.equal(result.error.code,'CAPACITY');assert.equal(e.exportSave(),original);
 assert(e.execute(command,quote.value.revision).ok);assert(e.advance(1).ok);assert.equal(e.snapshot().facilities[0].withdrawals,maxCount-1);
});

test('BigInt conservation supports multiple safe history fields without a Number aggregate',()=>{
 const {e,atm}=counterPark({guests:2});waitFor(e,completed);const boundary=e.snapshot(),large=maxCount*500;
 Object.assign(boundary.people.guests[0],{withdrawn:large,spent:large,cash:90});
 boundary.facilities[0].withdrawals=1;boundary.retiredAtmWithdrawals=maxCount;
 boundary.retiredShopIncome=large;boundary.ledger.shopSales=large;boundary.spent+=large;
 assert(e.restoreSave(JSON.stringify(boundary)).ok);const view=e.view({bounds:{x0:0,y0:0,x1:31,y1:31},includeStatic:false});assert(view.ok);
 assert.equal(view.value.facilities[0].cashDispensed,500);assert(Number.isSafeInteger(view.value.facilities[0].cashDispensed));
 const original=e.exportSave(),result=e.quote({type:'remove-facility',facility:atm});assert.equal(result.ok,false);assert.equal(result.error.code,'CAPACITY');assert.equal(e.exportSave(),original);
});
