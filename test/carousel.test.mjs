import test from 'node:test';
import {beforeCommerceState} from './consumables-fixtures.mjs';
import assert from 'node:assert/strict';
import {Engine} from '../dist/simulation/index.js';
import {initialWorld,steelRules} from '../dist/content/steel-coaster.js';
import {withCarouselProfile} from '../dist/content/carousel.js';
import {carouselRideContent} from '../dist/content/registry.js';
import {apply} from './fixtures.mjs';

const request={bounds:{x0:0,y0:0,x1:47,y1:47},includeStatic:true};
function park({direction=0,guests=false}={}){
 const rules=withCarouselProfile(steelRules);
 if(guests){Object.assign(rules.guests,{spawnTicks:1,walkTicks:1,decisionTicks:1,cashMin:100,cashMax:100,fareMin:100,fareMax:100,initialHunger:0,initialThirst:0,initialEnergy:1000});rules.services.initialBladder=0;}
 const engine=new Engine(initialWorld,rules),ride=apply(engine,{type:'create-ride',name:'Golden Carousel',tile:{x:12,y:12},height:32,direction,content:carouselRideContent()}).id;
 const body=engine.snapshot().rides.find(r=>r.id===ride).body;
 const turn=(x,y)=>{const [dx,dy]=[[1,0],[0,1],[-1,0],[0,-1]][direction];return{x:13+x*dx-y*dy,y:13+x*dy+y*dx};};
 const portals=[];
 for(const [role,y] of [['entrance',-1],['exit',1]])portals.push(apply(engine,{type:'place-portal',ride,station:body,role,tile:turn(-2,y),height:32,direction}).id);
 if(guests){
  for(const [x,y,queue] of [[-3,-1,true],[-4,-1,true],[-5,-1,true],[-6,-1,false],[-6,0,false],[-6,1,false],[-5,1,false],[-4,1,false],[-3,1,false]])apply(engine,{type:'place-path',tile:turn(x,y),height:32,queueFor:queue?ride:null});
  const entry=turn(-6,-1);apply(engine,{type:'set-park-entrance',point:{...entry,z:32}});apply(engine,{type:'set-ride-status',ride,status:'open'});apply(engine,{type:'set-park-open',open:true});
 }
 return{engine,ride,body,portals,rules,turn};
}
function until(engine,predicate,limit=4096){for(let i=0;i<limit;i++){assert.equal(engine.advance(1).ok,true);if(predicate(engine.snapshot()))return;}assert.fail('The actual park did not reach the required state.');}
const session=(engine)=>engine.snapshot().carouselSessions[0];
function restore(engine,rules){const saved=engine.exportSave(),copy=new Engine(initialWorld,rules),result=copy.restoreSave(saved);assert.equal(result.ok,true,JSON.stringify(result));assert.equal(copy.exportSave(),saved);return copy;}

test('Carousel construction reserves nine dry level cells and four exact portal orientations without fake cars',()=>{
 for(const direction of [0,1,2,3]){
  const {engine,ride,body,rules}=park({direction});const state=engine.snapshot(),r=state.rides[0];
  assert.equal(state.spent,2100);assert.equal(r.price,10);assert.equal(r.body,body);assert.equal(Object.hasOwn(r,'track'),false);assert.equal(Object.hasOwn(r,'cars'),false);assert.equal(state.trains.length,0);assert.deepEqual(session(engine).seats,Array(16).fill(null));
  assert.equal(engine.operating(ride).value.issues.length,0);assert.equal(engine.circuit(ride).value,false);
  assert.equal(engine.quote({type:'append-track',ride,piece:'station'}).error.code,'INVALID_CONTENT');
  assert.equal(engine.quote({type:'set-train-cars',ride,cars:1}).error.code,'INVALID_CONTENT');
  const saved=engine.exportSave();for(const [x,y] of [[12,12],[13,13],[14,14]]){
   assert.equal(engine.quote({type:'place-path',tile:{x,y},height:32,queueFor:null}).error.code,'CLEARANCE');
   assert.equal(engine.quote({type:'set-terrain',tile:{x,y},height:32,water:32}).error.code,'GEOMETRY');
  }
  assert.equal(engine.exportSave(),saved);restore(engine,rules);
 }
 const rules=withCarouselProfile(steelRules),dry=new Engine(initialWorld,rules),command={type:'create-ride',name:'Dry only',tile:{x:12,y:12},height:32,direction:0,content:carouselRideContent()};
 apply(dry,{type:'set-terrain',tile:{x:14,y:14},height:32,water:32});const before=dry.exportSave();assert.equal(dry.quote(command).error.code,'GEOMETRY');assert.equal(dry.execute(command,dry.revision).error.code,'GEOMETRY');assert.equal(dry.exportSave(),before);
 const poor=new Engine({...initialWorld,cash:1999},rules),saved=poor.exportSave();assert.equal(poor.quote(command).error.code,'INSUFFICIENT_CASH');assert.equal(poor.execute(command,poor.revision).error.code,'INSUFFICIENT_CASH');assert.equal(poor.exportSave(),saved);
});

test('empty open wait begins at the first paid seat and each real FIFO board charges once',()=>{
 const {engine,ride,rules}=park({guests:true});apply(engine,{type:'set-park-open',open:false});assert(engine.advance(300).ok);assert.equal(session(engine).phaseTick,0);
 apply(engine,{type:'set-park-open',open:true});until(engine,s=>s.carouselSessions[0].seats.some(id=>id!==null));apply(engine,{type:'set-park-open',open:false});
 const first=session(engine);assert.equal(first.phase,'loading');assert.equal(first.phaseTick,1);assert.equal(first.seats[0],engine.snapshot().people.guests.find(g=>g.phase==='riding').id);
 const paid=engine.snapshot();assert.equal(paid.ledger.rideSales,10);assert.equal(paid.rides[0].income,10);assert.equal(paid.people.guests.reduce((n,g)=>n+g.spent,0),10);
 apply(engine,{type:'set-ride-price',ride,price:37});const before=engine.snapshot();assert.equal(before.people.guests.find(g=>g.id===first.seats[0]).spent,10);
 assert.equal(engine.quote({type:'set-ride-price',ride,price:101}).error.code,'CAPACITY');
 restore(engine,rules);until(engine,s=>s.carouselSessions[0].phase==='running');assert.equal(session(engine).seats[0],first.seats[0]);
});

test('a paid closed session completes its indexed cycle and retains owners while the public exit is absent',()=>{
 const {engine,ride,portals,rules,turn}=park({guests:true});until(engine,s=>s.carouselSessions[0].phase==='running'&&s.carouselSessions[0].seats.every(id=>id!==null));apply(engine,{type:'set-park-open',open:false});apply(engine,{type:'set-ride-status',ride,status:'closed'});
 const initial=session(engine),paid=engine.snapshot().ledger.rideSales;assert.equal(initial.seats.length,16);assert.equal(new Set(initial.seats).size,16);
 const blocked=engine.snapshot().elements.find(e=>e.kind==='path'&&e.tile.x===turn(-3,1).x&&e.tile.y===turn(-3,1).y);apply(engine,{type:'remove-path',id:blocked.id});
 for(const command of [{type:'remove-portal',id:portals[1]},{type:'remove-ride',ride}])assert.equal(engine.quote(command).error.code,'RIDE_ACTIVE');
 assert(engine.advance(1200).ok);const waiting=session(engine);assert.equal(waiting.phase,'unloading');assert.equal(waiting.phaseTick,40);assert.equal(waiting.completedCycles,1);assert.deepEqual(waiting.seats,initial.seats);assert.equal(engine.snapshot().ledger.rideSales,paid);
 const copy=restore(engine,rules);assert(copy.advance(17).ok);assert.deepEqual(session(copy),waiting);
 apply(engine,{type:'place-path',tile:turn(-3,1),height:32,queueFor:null});assert(engine.advance(1).ok);const empty=session(engine);assert.equal(empty.phase,'loading');assert.equal(empty.phaseTick,0);assert.deepEqual(empty.seats,Array(16).fill(null));
 for(const id of initial.seats){const g=engine.snapshot().people.guests.find(g=>g.id===id);assert.equal(g.ridesTaken,1);assert.equal(g.lastRide,ride);assert.equal(g.seat,null);assert.equal(g.nausea,0);}
 const oldInstance=engine.snapshot().rides[0].instanceId;apply(engine,{type:'remove-ride',ride});const retired=engine.snapshot();assert.equal(retired.retiredRideIncome,paid);assert.equal(retired.ledger.rideSales,paid);assert.equal(retired.rides.length,0);assert.equal(retired.carouselSessions.length,0);assert(retired.elements.filter(e=>e.kind==='path').every(e=>e.queueFor===null));
 for(const g of retired.people.guests)for(const field of ['lastRide','destination','queueRide','navigationRide','entrance','exit'])assert.equal(g[field],null);
 restore(engine,rules);const replacement=apply(engine,{type:'create-ride',name:'Replacement',tile:{x:12,y:12},height:32,direction:0,content:carouselRideContent()}).id;assert.equal(replacement,ride);assert(engine.snapshot().rides[0].instanceId>oldInstance);assert.equal(engine.snapshot().rides[0].income,0);
});

test('breakdown, pause and uneven tick batches preserve every paid Carousel owner and trajectory',()=>{
 const {engine,ride,rules}=park({guests:true});until(engine,s=>s.carouselSessions[0].phase==='running');apply(engine,{type:'set-park-open',open:false});apply(engine,{type:'set-ride-status',ride,status:'closed'});assert(engine.advance(79).ok);
 apply(engine,{type:'set-ride-broken',ride,broken:true});const frozen=session(engine);assert(engine.advance(17).ok);assert.deepEqual(session(engine),frozen);
 apply(engine,{type:'set-ride-broken',ride,broken:false});apply(engine,{type:'set-paused',paused:true});const paused=engine.exportSave();assert.equal(engine.advance(80).value,0);assert.equal(engine.exportSave(),paused);apply(engine,{type:'set-paused',paused:false});
 const copy=restore(engine,rules);for(const ticks of [1,80,799,80,40]){assert(engine.advance(ticks).ok);for(let n=0;n<ticks;){const step=Math.min(17,ticks-n);assert(copy.advance(step).ok);n+=step;}assert.equal(copy.exportSave(),engine.exportSave());assert.deepEqual(copy.view(request).value.carouselSessions,engine.view(request).value.carouselSessions);}
});

test('duplicate or missing Carousel seat owners and old-version fixed capabilities reject atomically',()=>{
 const {engine,rules}=park({guests:true});until(engine,s=>s.carouselSessions[0].seats.filter(id=>id!==null).length>=2);const before=engine.exportSave();
 for(const mutate of [s=>s.carouselSessions[0].seats[1]=s.carouselSessions[0].seats[0],s=>s.carouselSessions[0].seats.push(null),s=>s.carouselSessions=[],s=>s.trains.push({ride:s.rides[0].id}),s=>s.rides[0].cars=1,s=>s.retiredRideIncome=1]){const bad=engine.snapshot();mutate(bad);const r=engine.restoreSave(JSON.stringify(bad));assert.equal(r.ok,false);assert.equal(r.error.code,'INVALID_SAVE');assert.equal(engine.exportSave(),before);}
 const old=beforeCommerceState(engine.snapshot()),receiving=JSON.parse(old.rules);delete receiving.fixedProfiles;delete receiving.channelProfiles;old.rules=JSON.stringify(receiving);old.version=9;old.contentVersion=2;delete old.boats;delete old.carouselSessions;delete old.retiredRideIncome;assert.equal(new Engine(initialWorld,rules).restoreSave(JSON.stringify(old)).error.code,'INVALID_SAVE');
 const view=engine.view(request).value;assert.equal(view.carouselSessions[0].seats.length,16);view.carouselSessions[0].seatIds.fill(null);assert.notDeepEqual(session(engine).seats,Array(16).fill(null));
});

test('changing an empty test to open or closed saves a valid zero wait even while paused or broken',()=>{
 for(const status of ['open','closed'])for(const stop of ['paused','broken']){
  const {engine,ride,rules}=park();apply(engine,{type:'set-ride-status',ride,status:'testing'});assert(engine.advance(1).ok);assert.equal(session(engine).phaseTick,1);
  if(stop==='paused')apply(engine,{type:'set-paused',paused:true});else apply(engine,{type:'set-ride-broken',ride,broken:true});
  apply(engine,{type:'set-ride-status',ride,status});assert.equal(session(engine).phase,'loading');assert.equal(session(engine).phaseTick,0);restore(engine,rules);
 }
});

test('an arrived mechanic inspects only an empty home session and fire releases boarding',()=>{
 const {engine,ride,rules,turn}=park({guests:true});apply(engine,{type:'set-park-open',open:false});assert(engine.advance(4096).ok);assert(engine.advance(4096).ok);assert(engine.advance(4096).ok);assert(engine.advance(4096).ok);
 const staff=apply(engine,{type:'hire-staff',role:'mechanic',point:{...turn(-3,1),z:32}}).id;assert(engine.advance(1).ok);const work=engine.snapshot().staff.find(s=>s.id===staff);assert.equal(work.job.kind,'inspection');assert.equal(work.work,1);assert.equal(session(engine).phaseTick,0);
 const restored=restore(engine,rules);assert(restored.advance(159).ok);assert(engine.advance(159).ok);assert.equal(restored.exportSave(),engine.exportSave());assert.equal(engine.snapshot().staff.find(s=>s.id===staff).completed,1);
 assert(engine.advance(4096).ok);assert(engine.advance(4096).ok);assert(engine.advance(4096).ok);assert(engine.advance(4096).ok);assert.equal(engine.snapshot().staff.find(s=>s.id===staff).job.kind,'inspection');
 apply(engine,{type:'set-park-open',open:true});assert(engine.advance(12).ok);assert.deepEqual(session(engine).seats,Array(16).fill(null));assert.equal(engine.snapshot().ledger.rideSales,0);
 apply(engine,{type:'fire-staff',staff});until(engine,s=>s.carouselSessions[0].seats.some(id=>id!==null));assert(engine.snapshot().ledger.rideSales>=10);restore(engine,rules);
});

test('a reachable mechanic repairs an occupied broken mid-cycle session without evacuating paid riders',()=>{
 const {engine,ride,rules,turn}=park({guests:true});until(engine,s=>s.carouselSessions[0].phase==='running');apply(engine,{type:'set-park-open',open:false});apply(engine,{type:'set-ride-status',ride,status:'closed'});assert(engine.advance(81).ok);apply(engine,{type:'set-ride-broken',ride,broken:true});
 const frozen=session(engine),sales=engine.snapshot().ledger.rideSales,staff=apply(engine,{type:'hire-staff',role:'mechanic',point:{...turn(-3,1),z:32}}).id;
 assert(engine.advance(199).ok);assert.deepEqual(session(engine),frozen);assert.equal(engine.snapshot().staff.find(s=>s.id===staff).work,199);const copy=restore(engine,rules);
 assert(engine.advance(1).ok);assert(copy.advance(1).ok);assert.equal(copy.exportSave(),engine.exportSave());assert.equal(engine.snapshot().rides[0].broken,false);assert.equal(engine.snapshot().staff.find(s=>s.id===staff).completed,1);assert.equal(session(engine).phaseTick,frozen.phaseTick+1);assert.deepEqual(session(engine).seats,frozen.seats);assert.equal(engine.snapshot().ledger.rideSales,sales);
});

test('ordered Carousel null slots at both ring ends retain real guest, slot and public-pose correspondence',()=>{
 const {engine,ride,rules}=park({guests:true});until(engine,s=>s.carouselSessions[0].phase==='running'&&s.carouselSessions[0].seats.every(id=>id!==null));apply(engine,{type:'set-park-open',open:false});apply(engine,{type:'set-ride-status',ride,status:'closed'});
 for(const slots of [[1,14],[0,15]]){
  const sparse=engine.snapshot(),owners=sparse.carouselSessions[0].seats,removed=slots.map(slot=>owners[slot]),spent=sparse.people.guests.filter(g=>removed.includes(g.id)).reduce((sum,g)=>sum+g.spent,0);
  for(const slot of slots)owners[slot]=null;sparse.people.guests=sparse.people.guests.filter(g=>!removed.includes(g.id));sparse.people.departedSpent+=spent;
  const receiver=new Engine(initialWorld,rules),loaded=receiver.restoreSave(JSON.stringify(sparse));assert.equal(loaded.ok,true,JSON.stringify(loaded));assert.deepEqual(session(receiver).seats,owners);
  assert(receiver.advance(81).ok);const view=receiver.view(request).value.carouselSessions[0];assert.deepEqual(view.seatIds,owners);for(let slot=0;slot<16;slot++){assert.equal(view.seats[slot].slot,slot);assert.equal(view.seats[slot].guest,owners[slot]);assert(Object.values(view.seats[slot].position).every(Number.isFinite));if(owners[slot]!==null)assert.deepEqual(receiver.snapshot().people.guests.find(g=>g.id===owners[slot]).seat,{ride,slot});}
 }
});

test('a complete operating Train and Carousel cannot claim the same actual paid guest across owner arrays',()=>{
 const {engine,ride,rules}=park({guests:true});until(engine,s=>s.carouselSessions[0].phase==='running'&&s.carouselSessions[0].seats[0]!==null);apply(engine,{type:'set-park-open',open:false});
 const steel=apply(engine,{type:'create-ride',name:'Steel beside Carousel',tile:{x:28,y:28},height:32,direction:0}).id,stations=[];
 for(const piece of ['station','station','station','right','flat','flat','flat','right','flat','flat','flat','right','flat','flat','flat','right']){const id=apply(engine,{type:'append-track',ride:steel,piece}).id;if(piece==='station')stations.push(id);}
 for(const [role,x,station] of [['entrance',28,stations[0]],['exit',29,stations[1]]])apply(engine,{type:'place-portal',ride:steel,station,role,tile:{x,y:27},height:32,direction:1});apply(engine,{type:'set-ride-status',ride:steel,status:'testing'});assert(engine.advance(1).ok);restore(engine,rules);
 const before=engine.exportSave(),bad=engine.snapshot(),guest=bad.carouselSessions[0].seats[0],train=bad.trains.find(t=>t.ride===steel),person=bad.people.guests.find(g=>g.id===guest);assert.equal(person.seat.ride,ride);assert.equal(train.seats.length,2);train.seats[0]=guest;person.seat={ride:steel,slot:0};person.entrance=bad.elements.find(e=>e.kind==='portal'&&e.ride===steel&&e.role==='entrance').id;person.exit=bad.elements.find(e=>e.kind==='portal'&&e.ride===steel&&e.role==='exit').id;
 const command={type:'set-paused',paused:true},quote=engine.quote(command);assert(quote.ok);const result=engine.restoreSave(JSON.stringify(bad));assert.equal(result.error.code,'INVALID_SAVE');assert.match(result.error.message,/duplicate seat ownership/);assert.equal(engine.exportSave(),before);assert.equal(engine.revision,quote.value.revision);assert(engine.execute(command,quote.value.revision).ok);
});

test('the declared two-turn cycle reaches literal ramp boundaries and an angle-zero running pose remains uneditable',()=>{
 const {engine,ride,portals,rules}=park();apply(engine,{type:'set-ride-status',ride,status:'testing'});assert(engine.advance(80).ok);assert.equal(session(engine).phase,'running');assert.equal(session(engine).phaseTick,0);
 let previous=0;for(const [tick,angle] of [[1,0],[79,468],[80,480],[81,492],[520,0],[959,5268],[960,5280],[961,5292],[1039,0]]){
  assert(engine.advance(tick-previous).ok);previous=tick;assert.equal(session(engine).phaseTick,tick);assert.equal(engine.view(request).value.carouselSessions[0].angle,angle);restore(engine,rules);
  if(tick===520){apply(engine,{type:'set-ride-status',ride,status:'closed'});assert.equal(engine.quote({type:'remove-portal',id:portals[0]}).error.code,'RIDE_ACTIVE');}
 }
 assert(engine.advance(1).ok);assert.equal(session(engine).phase,'unloading');assert.equal(session(engine).phaseTick,0);assert.equal(session(engine).completedCycles,1);assert.equal(engine.view(request).value.carouselSessions[0].angle,0);
 assert(engine.advance(40).ok);assert.equal(session(engine).phase,'loading');assert.equal(session(engine).completedCycles,1);assert.equal(engine.quote({type:'remove-portal',id:portals[0]}).ok,true);
});

test('visible fixed bodies survive clipped static budgets and partial-footprint viewport intersections',()=>{
 const rules=withCarouselProfile(steelRules),engine=new Engine(initialWorld,rules);
 let paths=0;for(const height of [32,48,64,80,96])for(let y=1;y<=44&&paths<8192;y++)for(let x=1;x<=42&&paths<8192;x++){apply(engine,{type:'place-path',tile:{x,y},height,queueFor:null});paths++;}
 assert.equal(paths,8192);const ride=apply(engine,{type:'create-ride',name:'Body after8192paths',tile:{x:43,y:43},height:32,direction:0,content:carouselRideContent()}).id,body=engine.snapshot().rides[0].body;
 const all=engine.view(request).value;assert.equal(all.scenery.truncated,true);assert.equal(all.scenery.elements.length,8192);assert(all.scenery.elements.some(e=>e.id===body&&e.kind==='fixed-body'));assert.equal(all.carouselSessions[0].ride,ride);
 const clipped=engine.view({bounds:{x0:45,y0:45,x1:45,y1:45},includeStatic:true}).value;assert(clipped.scenery.elements.some(e=>e.id===body));assert.equal(clipped.carouselSessions.length,1);
});
