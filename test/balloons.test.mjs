import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine,WORKER_PROTOCOL_VERSION} from '../dist/simulation/index.js';
import {createHost} from '../dist/simulation/host.js';
import {withBalloonProfile} from '../dist/content/balloons.js';
import {rules,options,apply,operatingPark} from './fixtures.mjs';

const request={bounds:{x0:0,y0:0,x1:31,y1:31},includeStatic:false};
const tile={x:9,y:7};
const ok=r=>{assert.equal(r.ok,true,JSON.stringify(r));return r.value;};
function tick(e,n){while(n){const k=Math.min(n,4096);assert.equal(ok(e.advance(k)),k);n-=k;}}
const inspect=c=>ok(c.e.inspect('guest',c.gid));
function until(c,predicate,limit=8192){
 for(let i=0;i<limit;i++){const g=inspect(c);if(predicate(g))return g;tick(c.e,1);}
 assert.fail('Ordinary guest did not reach the bounded outcome: '+JSON.stringify(inspect(c)));
}
function configuredRules(){
 const p=withBalloonProfile(structuredClone(rules));
 Object.assign(p.guests,{spawnTicks:200,decisionTicks:1,walkTicks:1,initialHunger:0,initialThirst:0,initialHappiness:1000,initialEnergy:1000,needGrowth:0,rideCooldownTicks:1,rideNausea:0});
 Object.assign(p.services,{initialBladder:0,serviceTicks:2});return p;
}
let naturalCheckpoint;
function ready(){
 if(!naturalCheckpoint){
  const p=configuredRules(),{engine:e,id:ride}=operatingPark(new Engine(options,p));
  for(const [x,y,queueFor]of [[10,7,null],[11,7,null],[11,8,null],[10,8,ride]])apply(e,{type:'place-path',tile:{x,y},height:32,queueFor});
  apply(e,{type:'set-terrain',tile,height:32,water:0});
  const facility=apply(e,{type:'place-facility',name:'Balloon Stall',kind:'balloon',tile,height:32,direction:0}).id;
  apply(e,{type:'set-facility-open',facility,open:true});apply(e,{type:'set-ride-price',ride,price:0});apply(e,{type:'set-ride-status',ride,status:'open'});
  tick(e,460);apply(e,{type:'set-park-entrance',point:{x:10,y:7,z:32}});apply(e,{type:'set-park-open',open:true});tick(e,140);apply(e,{type:'set-park-open',open:false});
  const gid=e.snapshot().people.guests[0].id,c={e,p,ride,facility,gid};assert.equal(inspect(c).ridesTaken,0);
  const milestones=[];
  for(let i=0;i<8192;i++){
   const g=inspect(c);
   if(milestones.at(-1)!==g.ridesTaken){milestones.push(g.ridesTaken);assert.equal(e.snapshot().facilities.find(f=>f.id===facility).sales,0);}
   assert.equal(g.balloonColour,null,'No ownership is injected into natural demand setup');
   if(g.ridesTaken<3)assert.equal(g.facility,null,'Balloon demand cannot precede three actual rides');
   if(g.phase==='buying'&&g.facility===facility){assert(g.ridesTaken>=3);naturalCheckpoint={raw:e.exportSave(),p,ride,facility,gid,milestones};break;}
   tick(e,1);
  }
  assert(naturalCheckpoint,'Actual riding must lead to a real balloon service attempt within8192 ticks');
  assert.deepEqual(milestones.slice(0,4),[0,1,2,3]);
 }
 const e=new Engine(options,naturalCheckpoint.p);ok(e.restoreSave(naturalCheckpoint.raw));
 return{...naturalCheckpoint,e};
}
const stall=c=>c.e.snapshot().facilities.find(f=>f.id===c.facility);
function receive(c,raw=c.e.exportSave()){const e=new Engine(options,c.p);ok(e.restoreSave(raw));assert.equal(e.exportSave(),raw);return e;}
function reject(c,mutate,code='INVALID_SAVE'){
 const original=c.e.exportSave(),bad=JSON.parse(original);mutate(bad);
 const host=createHost(c.e),command={type:'set-paused',paused:true},q=ok(c.e.quote(command));
 const envelope=ok(host({id:71,protocolVersion:WORKER_PROTOCOL_VERSION,request:{type:'load',payload:JSON.stringify(bad)}}));
 assert.equal(envelope.id,71);assert.equal(envelope.result.ok,false);assert.equal(envelope.result.error.code,code);assert.equal(c.e.exportSave(),original);
 ok(c.e.execute(command,q.revision));apply(c.e,{type:'set-paused',paused:false});
}

test('an ordinary autonomous guest completes three actual rides then pays once for a saved balloon',()=>{
 const c=ready(),before=c.e.snapshot(),g=until(c,g=>g.balloonColour!==null,8),after=c.e.snapshot();
 assert(g.ridesTaken>=3);assert.equal(g.balloonColour,11);assert.equal(g.cash,100-9);assert.equal(g.spent,9);
 assert.deepEqual([stall(c).sales,stall(c).income],[1,9]);assert.equal(after.ledger.shopSales-before.ledger.shopSales,9);assert.equal(after.ledger.stock-before.ledger.stock,3);assert.equal(after.cash-before.cash,6);
 assert.equal(after.ledger.rideSales,0);assert.equal(after.people.guests.length,1);assert.equal(receive(c).exportSave(),c.e.exportSave());
});

test('saved colour0 and completion repricing survive vendor demolition slot reuse and full continuation',()=>{
 const c=ready(),s=c.e.snapshot();
 // Controlled saved vendor colour exercises the valid zero boundary; guest demand/history is genuinely earned above.
 s.facilities.find(f=>f.id===c.facility).balloonColour=0;ok(c.e.restoreSave(JSON.stringify(s)));
 apply(c.e,{type:'set-facility-price',facility:c.facility,price:5});const before=c.e.snapshot();until(c,g=>g.balloonColour!==null,8);
 assert.equal(inspect(c).balloonColour,0);assert.equal(inspect(c).spent,5);assert.deepEqual([stall(c).price,stall(c).sales,stall(c).income],[5,1,5]);assert.equal(c.e.snapshot().cash-before.cash,2);
 const view=ok(c.e.view(request));assert.deepEqual(view.guestBalloons,[{id:c.gid,colour:0}]);view.guestBalloons[0].colour=31;assert.equal(inspect(c).balloonColour,0);
 const instance=stall(c).instanceId,ledger=c.e.snapshot().ledger;
 apply(c.e,{type:'remove-facility',facility:c.facility});assert.deepEqual(c.e.snapshot().retiredBalloon,{sales:1,income:5});assert.deepEqual(c.e.snapshot().ledger,ledger);assert.equal(inspect(c).balloonColour,0);
 const vendorless=receive(c);assert.equal(vendorless.snapshot().facilities.filter(f=>f.kind==='balloon').length,0);assert.equal(ok(vendorless.inspect('guest',c.gid)).balloonColour,0);assert.deepEqual(vendorless.snapshot().retiredBalloon,{sales:1,income:5});assert.deepEqual(ok(vendorless.view(request)).guestBalloons,ok(c.e.view(request)).guestBalloons);
 const replacement=apply(c.e,{type:'place-facility',name:'Replacement',kind:'balloon',tile,height:32,direction:0}).id;
 assert.equal(replacement,c.facility);assert(stall(c).instanceId>instance);apply(c.e,{type:'set-facility-open',facility:replacement,open:true});
 const copy=receive(c);tick(c.e,128);for(const n of [1,17,110])tick(copy,n);
 assert.equal(copy.exportSave(),c.e.exportSave());assert.equal(stall(c).sales,0,'A zero-colour owner must not buy a duplicate');assert.deepEqual(c.e.snapshot().retiredBalloon,{sales:1,income:5});assert.equal(inspect(c).balloonColour,0);
});

test('a free ordinary sale still books one owner one sale and the saved stock expense',()=>{
 const c=ready();apply(c.e,{type:'set-facility-price',facility:c.facility,price:0});const before=c.e.snapshot();until(c,g=>g.balloonColour!==null,8);
 const after=c.e.snapshot();assert.deepEqual([stall(c).sales,stall(c).income,inspect(c).spent],[1,0,0]);assert.equal(inspect(c).cash,100);assert.equal(after.cash,before.cash-3);assert.equal(after.ledger.shopSales,before.ledger.shopSales);assert.equal(after.ledger.stock,before.ledger.stock+3);receive(c);
});

test('a controlled personal refusal falls back to an actual ride instead of immediately visiting another souvenir',()=>{
 const c=ready();apply(c.e,{type:'set-facility-price',facility:c.facility,price:35});const s=c.e.snapshot();
 // Synthetic policy corner, not natural demand evidence: known saved happiness and RNG isolate refusal.
 s.people.guests.find(g=>g.id===c.gid).happiness=900;s.rng=0;ok(c.e.restoreSave(JSON.stringify(s)));tick(c.e,2);
 const g=inspect(c);assert.equal(g.balloonColour,null);assert.equal(g.facility,null);assert.equal(g.destination,c.ride);assert.equal(stall(c).sales,0);assert.equal(c.e.snapshot().rng,1196435762);receive(c);
});

for(const action of ['close','path','unaffordable'])test(action+' during an earned service attempt cancels without payment or a random draw',()=>{
 const c=ready(),before=c.e.snapshot();
 if(action==='close')apply(c.e,{type:'set-facility-open',facility:c.facility,open:false});
 else if(action==='path'){const path=before.elements.find(e=>e.kind==='path'&&e.tile.x===10&&e.tile.y===7);apply(c.e,{type:'remove-path',id:path.id});}
 else apply(c.e,{type:'set-facility-price',facility:c.facility,price:1000});
 tick(c.e,1);assert.equal(inspect(c).facility,null);assert.equal(inspect(c).balloonColour,null);assert.equal(inspect(c).spent,0);assert.equal(stall(c).sales,0);assert.equal(c.e.snapshot().ledger.shopSales,0);assert.equal(c.e.snapshot().ledger.stock,0);assert.equal(c.e.snapshot().rng,before.rng);receive(c);
});

test('strict receiving refuses corrupt colours unbacked ownership and active or retired finance tampering',()=>{
 const c=ready();until(c,g=>g.balloonColour!==null,8);
 reject(c,s=>{s.people.guests[0].balloonColour=32;});
 reject(c,s=>{s.facilities[0].balloonColour=-1;});
 reject(c,s=>{s.facilities[0].sales=0;});
 apply(c.e,{type:'remove-facility',facility:c.facility});
 reject(c,s=>{s.retiredBalloon.income++;});
 receive(c);
});

test('a synthetic late second-sale overflow rolls back the full save RNG and first owner while retaining a pending quote',()=>{
 const c=ready(),boundary=c.e.snapshot(),first=boundary.people.guests[0],second=structuredClone(first),limit=Number.MAX_SAFE_INTEGER;
 // Synthetic capacity fixture only: two legal buying records and balanced near-limit park funding.
 second.id=boundary.nextEntity++;boundary.people.guests.push(second);
 for(const g of boundary.people.guests)g.serviceProgress=c.p.services.serviceTicks-1;
 while((boundary.tick+1)%c.p.services.weekTicks===0)boundary.tick++;
 const net=boundary.ledger.rideSales+boundary.ledger.shopSales-boundary.ledger.stock-boundary.ledger.wages-boundary.ledger.upkeep-boundary.ledger.interest;
 boundary.initialCash=limit;boundary.loan=boundary.spent-boundary.refunded-net-10;boundary.cash=limit-10;boundary.rng=0;
 assert(boundary.loan>=0&&boundary.loan<=boundary.maxLoan);ok(c.e.restoreSave(JSON.stringify(boundary)));
 const one=structuredClone(boundary);one.people.guests.pop();const control=new Engine(options,c.p);ok(control.restoreSave(JSON.stringify(one)));tick(control,1);
 assert.equal(control.snapshot().cash,limit-4);assert.equal(control.snapshot().facilities[0].sales,1);assert.equal(control.inspect('guest',c.gid).value.balloonColour,11);assert.notEqual(control.snapshot().rng,boundary.rng);
 const original=c.e.exportSave(),command={type:'set-facility-open',facility:c.facility,open:false},quote=ok(c.e.quote(command)),failed=c.e.advance(1);
 assert.equal(failed.ok,false);assert.equal(failed.error.code,'CAPACITY');assert.equal(c.e.exportSave(),original);assert.equal(c.e.revision,quote.revision);
 ok(c.e.execute(command,quote.revision));assert.equal(stall(c).sales,0);assert(c.e.snapshot().people.guests.every(g=>g.balloonColour===null));receive(c);
});
