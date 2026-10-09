import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../dist/simulation/index.js';
import {withFlumeProfile,flumeCandidate,flumePieces,flumeProfileId} from '../dist/content/log-flume.js';
import {flumeRideContent} from '../dist/content/registry.js';
import {flumePortalSocket} from '../dist/simulation/flume-portal.js';
import {turn} from '../dist/simulation/geometry.js';
import {flumeFrame} from '../dist/simulation/flume-native.js';
import {rules as baseRules,options,apply} from './fixtures.mjs';

const world={...options,side:40,cash:100000};
const request={bounds:{x0:0,y0:0,x1:39,y1:39},includeStatic:true};
const build={type:'create-ride',name:'Timber Splash',tile:{x:18,y:18},height:32,direction:0,content:flumeRideContent()};
function park({direction=0,curve='left',guests=false,cash=world.cash,stations=2}={}){
 const rules=withFlumeProfile(structuredClone(baseRules));
 if(guests){Object.assign(rules.guests,{spawnTicks:1,walkTicks:1,decisionTicks:1,initialHunger:0,initialThirst:0,initialEnergy:1000,needGrowth:0});rules.services.initialBladder=0;}
 const engine=new Engine({...world,cash},rules),ride=apply(engine,{...build,direction}).id;
 for(const piece of [...Array(stations).fill('station'),'lift-start','lift','lift-end',curve,'channel','channel',curve,'drop-start','drop','drop-end',...Array(stations).fill('splash'),curve,'channel','channel',curve])apply(engine,{type:'append-track',ride,piece});
 const s=engine.snapshot(),r=s.rides[0],map=new Map(s.elements.map(e=>[e.id,e]));
 const portals={};for(const role of ['entrance','exit'])portals[role]=apply(engine,{type:'place-portal',ride,role,...flumePortalSocket(r,map,role)}).id;
 const side=curve==='right'?-1:1,point=(x,y)=>{const p=turn(x,y,direction);return{x:18+p.x,y:18+p.y,z:32};};
 if(guests){
  for(const [x,y,queue] of [[0,2*side,true],[1,2*side,false],[0,3*side,false],[1,3*side,false]]){const p=point(x,y);apply(engine,{type:'place-path',tile:{x:p.x,y:p.y},height:32,queueFor:queue?ride:null});}
  apply(engine,{type:'set-park-entrance',point:point(0,3*side)});assert.equal(engine.access(ride,point(0,3*side)).value.entrances.length,1);assert.equal(engine.access(ride,point(0,3*side)).value.exits.length,1);
  apply(engine,{type:'set-ride-status',ride,status:'testing'});assert(engine.advance(2336).ok);apply(engine,{type:'set-ride-status',ride,status:'open'});apply(engine,{type:'set-park-open',open:true});
 }
 return{engine,ride,rules,portals,out:point(1,2*side)};
}
function restored(engine,rules){const saved=engine.exportSave(),copy=new Engine(world,rules),result=copy.restoreSave(saved);assert.equal(result.ok,true,JSON.stringify(result));assert.equal(copy.exportSave(),saved);return copy;}
function reject(engine,command,code){const saved=engine.exportSave(),revision=engine.revision;for(const result of [engine.quote(command),engine.execute(command,revision)]){assert.equal(result.ok,false);assert.equal(result.error.code,code);}assert.equal(engine.exportSave(),saved);assert.equal(engine.revision,revision);}
function until(engine,predicate,limit=400,batch=1){for(let i=0;i<limit;i++){assert(engine.advance(batch).ok);if(predicate(engine.snapshot()))return;}assert.fail('The actual channel park did not reach the required state.');}

for(const stations of [3,4])test(`a ${stations*4} metre station keeps Boat boarding and return at the second exit bay`,()=>{
 const {engine,ride,rules,portals}=park({stations});apply(engine,{type:'set-ride-status',ride,status:'testing'});
 const state=engine.snapshot(),exit=state.elements.find(e=>e.id===portals.exit),station=state.elements.find(e=>e.id===exit.station);
 assert.equal(exit.station,state.rides[0].track[1]);assert.equal(state.boats[0].position,6100);
 const start=flumeFrame(station,0),boat=engine.view(request).value.boats[0];
 for(const seat of boat.seats){const along=(seat.position.x-start.position.x/1000)*start.direction.x+(seat.position.y-start.position.y/1000)*start.direction.y;assert(along>=0&&along<=4,'Every real Hip stays above the exit station bay.');}
 until(engine,s=>s.boats[0].phase==='unloading',200,16);assert.equal(engine.snapshot().boats[0].position,6100);restored(engine,rules);
 until(engine,s=>s.boats[0].phase==='loading',40);assert.equal(engine.snapshot().boats[0].position,6100);assert.equal(engine.snapshot().rides[0].track.length,18+2*(stations-2));restored(engine,rules);
});

test('an unpublished extended-station save using the old remote dock rejects atomically',()=>{
 const {engine,ride,rules}=park({stations:3});apply(engine,{type:'set-ride-status',ride,status:'testing'});const old=engine.snapshot();old.boats[0].position=10100;
 const receiver=new Engine(world,rules),before=receiver.exportSave(),revision=receiver.revision,result=receiver.restoreSave(JSON.stringify(old));
 assert.equal(result.ok,false);assert.equal(result.error.code,'INVALID_SAVE');assert.equal(receiver.exportSave(),before);assert.equal(receiver.revision,revision);
});

test('a successful test keeps its qualified dock ready for delayed opening until an explicit new Test',()=>{
 const {engine,ride,rules}=park();apply(engine,{type:'set-ride-status',ride,status:'testing'});assert(engine.advance(2336).ok);
 const completed=engine.snapshot().boats[0];assert.equal(completed.phase,'loading');assert(completed.measured);
 assert(engine.advance(4000).ok);assert.deepEqual(engine.snapshot().boats[0],completed);restored(engine,rules);
 apply(engine,{type:'set-ride-status',ride,status:'open'});assert.equal(engine.snapshot().rides[0].status,'open');
 apply(engine,{type:'set-paused',paused:true});apply(engine,{type:'set-ride-status',ride,status:'testing'});assert.equal(engine.snapshot().boats[0].measured,null);assert.equal(engine.snapshot().boats[0].wait,0);restored(engine,rules);
});

test('a failed empty qualification still retries under the same testing intent',()=>{
 const {engine,ride,rules}=park();apply(engine,{type:'set-ride-status',ride,status:'testing'});until(engine,s=>s.boats[0].phase==='unloading',200,16);
 const failed=engine.snapshot();failed.boats[0].stats.maxSpeed=301;failed.boats[0].measured=null;
 const receiver=new Engine(world,rules);assert(receiver.restoreSave(JSON.stringify(failed)).ok);assert(receiver.advance(160).ok);
 const retried=receiver.snapshot().boats[0];assert.equal(retried.phase,'running');assert.equal(retried.mode,'testing');assert.equal(retried.measured,null);assert(retried.stats.distance>0&&retried.stats.distance<failed.boats[0].stats.distance);
});

test('the finite channel needs an explicit compatible receiver and copies its complete profile',()=>{
 const absent=new Engine(world,baseRules);reject(absent,build,'UNSUPPORTED_CONTENT');
 const rules=withFlumeProfile(structuredClone(baseRules)),engine=new Engine(world,rules),choice=engine.catalogue().variants.find(v=>v.id==='independent.four-seat-log').choices[0];
 assert.equal(choice.runtimeAvailable,true);assert.equal(choice.capabilities.construction.kind,'channel');assert.equal(choice.capabilities.operation.kind,'channel-circuit');
 const price=flumeCandidate.defaultPrice;rules.channelProfiles[flumeProfileId].vehicle.defaultPrice++;
 const id=apply(engine,build).id;assert.equal(engine.snapshot().rides[0].price,price);assert.equal(id,0);assert.equal(Object.hasOwn(engine.snapshot().rides[0],'cars'),false);assert.deepEqual(engine.snapshot().trains,[]);assert.deepEqual(engine.snapshot().boats,[]);
 for(const change of [r=>r.motion.tickHz=1000,r=>r.motion.tileMetres=1,r=>r.channelProfiles[flumeProfileId].vehicle.liftSpeed++,r=>r.channelProfiles[flumeProfileId].vehicle.seats[0].y++,r=>r.channelProfiles[flumeProfileId].pieces.station.price++]){const changed=withFlumeProfile(structuredClone(baseRules));change(changed);assert.throws(()=>new Engine(world,changed),error=>['INVALID_COMMAND','GEOMETRY'].includes(error.code));}
});

for(const direction of [0,1,2,3])for(const curve of ['left','right'])test(`actual ${curve} channel construction, sockets and empty test ${direction} restore all phases`,()=>{
 const {engine,ride,rules}=park({direction,curve});assert.deepEqual(engine.operating(ride).value.issues,[]);assert.equal(engine.circuit(ride).value,true);
 reject(engine,{type:'set-ride-status',ride,status:'open'},'OPERATING_REQUIREMENTS');reject(engine,{type:'reset-train',ride},'INVALID_CONTENT');reject(engine,{type:'set-train-cars',ride,cars:1},'INVALID_CONTENT');
 restored(engine,rules);const next=engine.snapshot().nextEntity;apply(engine,{type:'set-ride-status',ride,status:'testing'});let boat=engine.snapshot().boats[0];assert.equal(boat.id,next);assert.equal(engine.snapshot().nextEntity,next+1);assert.equal(boat.position,6100);assert.deepEqual(boat.seats,[null,null,null,null]);
 assert.deepEqual(engine.advance(79),{ok:true,value:79});assert.equal(engine.snapshot().boats[0].phase,'loading');restored(engine,rules);
 assert.deepEqual(engine.advance(1),{ok:true,value:1});boat=engine.snapshot().boats[0];assert.equal(boat.phase,'running');assert.equal(boat.mode,'testing');assert.equal(boat.travelled,50);assert.equal(boat.speed,50);restored(engine,rules);
 assert.deepEqual(engine.advance(2216),{ok:true,value:2216});boat=engine.snapshot().boats[0];assert.equal(boat.phase,'unloading');assert.equal(boat.position,6100);assert.equal(boat.speed,0);assert.equal(boat.travelled,107776);assert.equal(boat.laps,1);assert.equal(boat.measured.ticks,2217);assert.equal(boat.measured.maxSpeed,231);assert.equal(boat.measured.distance,107776);restored(engine,rules);
 assert.deepEqual(engine.advance(40),{ok:true,value:40});boat=engine.snapshot().boats[0];assert.equal(boat.phase,'loading');assert.equal(boat.wait,0);assert.equal(boat.mode,null);assert.equal(boat.travelled,107776);restored(engine,rules);
 apply(engine,{type:'set-ride-status',ride,status:'open'});assert(engine.advance(600).ok);assert.deepEqual(engine.snapshot().boats[0],boat);assert.equal(engine.snapshot().ledger.rideSales,0);assert.equal(engine.snapshot().trains.length,0);
 const saved=engine.exportSave(),view=engine.view(request).value;assert.equal(view.protocolVersion,6);assert.equal(view.contentVersion,6);assert.equal(view.counts.boats,1);assert.equal(view.cars.length,0);assert.equal(view.boats[0].id,boat.id);assert.equal(view.boats[0].seats.length,4);assert.deepEqual(view.boats[0].seatIds,boat.seats);assert.equal(view.rides[0].capacity,4);assert.equal(Object.hasOwn(view.rides[0],'cars'),false);
 view.boats[0].seatIds[0]=999;view.boats[0].seats[0].position.z=999;view.rides[0].channelProfile.vehicle.maxSpeed=999;assert.equal(engine.exportSave(),saved);
});

test('closing a departed empty test retains its captured mode and exact completed measurements',()=>{
 const {engine,ride,rules}=park();apply(engine,{type:'set-ride-status',ride,status:'testing'});assert(engine.advance(700).ok);apply(engine,{type:'set-ride-status',ride,status:'closed'});const mode=engine.snapshot().boats[0].mode;assert.equal(mode,'testing');
 const copy=restored(engine,rules);assert(engine.advance(3000).ok);for(const ticks of [1,17,400,1200,1382])assert(copy.advance(ticks).ok);assert.equal(copy.exportSave(),engine.exportSave());const boat=engine.snapshot().boats[0];assert.equal(boat.phase,'loading');assert.equal(boat.mode,null);assert.equal(boat.wait,0);assert.equal(boat.laps,1);assert.equal(boat.measured.maxSpeed,231);
 apply(engine,{type:'set-ride-status',ride,status:'open'});restored(engine,rules);
});

test('fresh testing invalidates an earlier witness immediately while paused or broken and close clears empty wait',()=>{
 for(const stop of ['paused','broken']){
  const {engine,ride,rules}=park();apply(engine,{type:'set-ride-status',ride,status:'testing'});assert(engine.advance(2336).ok);apply(engine,{type:'set-ride-status',ride,status:'open'});assert(engine.snapshot().boats[0].measured);
  apply(engine,stop==='paused'?{type:'set-paused',paused:true}:{type:'set-ride-broken',ride,broken:true});apply(engine,{type:'set-ride-status',ride,status:'testing'});assert.equal(engine.snapshot().boats[0].measured,null);reject(engine,{type:'set-ride-status',ride,status:'open'},'OPERATING_REQUIREMENTS');restored(engine,rules);
 }
 const {engine,ride,rules}=park();apply(engine,{type:'set-ride-status',ride,status:'testing'});assert(engine.advance(17).ok);assert.equal(engine.snapshot().boats[0].wait,17);apply(engine,{type:'set-paused',paused:true});apply(engine,{type:'set-ride-status',ride,status:'closed'});assert.equal(engine.snapshot().boats[0].wait,0);restored(engine,rules);
});

test('Boat motion, phase, witness, container and owner corruptions preserve current authority and live quotes',()=>{
 const {engine,ride}=park();apply(engine,{type:'set-ride-status',ride,status:'testing'});assert(engine.advance(2296).ok);apply(engine,{type:'set-paused',paused:true});const saved=engine.exportSave(),command={type:'set-ride-price',ride,price:30},quote=engine.quote(command);assert(quote.ok);
 for(const change of [s=>s.boats=[],s=>s.boats.push(structuredClone(s.boats[0])),s=>s.boats[0].id=s.nextEntity,s=>s.boats[0].ride=254,s=>s.boats[0].seats.push(null),s=>s.boats[0].seats[0]=999,s=>s.boats[0].position++,s=>s.boats[0].wait=41,s=>s.boats[0].stats.distance--,s=>s.boats[0].measured.courseKey='stale',s=>s.boats[0].measured.maxSpeed=301,s=>s.boats[0].mode='paid',s=>s.rides[0].cars=1,s=>s.trains.push({ride}),s=>s.carouselSessions.push({ride})]){
  const bad=engine.snapshot();change(bad);const result=engine.restoreSave(JSON.stringify(bad));assert.equal(result.ok,false);assert.equal(result.error.code,'INVALID_SAVE');assert.equal(engine.exportSave(),saved);assert.equal(engine.revision,quote.value.revision);
 }
 assert(engine.execute(command,quote.value.revision).ok);assert.equal(engine.advance(40).value,0);
});

test('closed channel demolition refunds each retained piece and portal, then allocates a fresh lifecycle in the reused slot',()=>{
 const {engine,ride,rules}=park();apply(engine,{type:'set-ride-status',ride,status:'testing'});assert(engine.advance(700).ok);reject(engine,{type:'remove-ride',ride},'RIDE_ACTIVE');apply(engine,{type:'set-ride-status',ride,status:'closed'});reject(engine,{type:'remove-ride',ride},'RIDE_ACTIVE');assert(engine.advance(3000).ok);
 const state=engine.snapshot(),instance=state.rides[0].instanceId,cost=state.spent,receipt=apply(engine,{type:'remove-ride',ride});assert.equal(receipt.cost,-cost/2);assert.deepEqual(engine.snapshot().rides,[]);assert.deepEqual(engine.snapshot().boats,[]);assert.deepEqual(engine.snapshot().elements,[]);assert.equal(engine.snapshot().retiredRideIncome,0);restored(engine,rules);
 const id=apply(engine,build).id;assert.equal(id,ride);assert(engine.snapshot().rides[0].instanceId>instance);assert.equal(engine.snapshot().rides[0].income,0);
});

for(const direction of [0,1,2,3])for(const curve of ['left','right'])test(`actual paid ${curve} channel${direction} holds four owners through close/exit loss and unloads each once`,()=>{
 const {engine,ride,rules,out}=park({direction,curve,guests:true});until(engine,s=>s.boats[0].phase==='running'&&s.boats[0].seats.every(id=>id!==null));apply(engine,{type:'set-park-open',open:false});apply(engine,{type:'set-ride-status',ride,status:'closed'});
 const boat=engine.snapshot().boats[0],paid=engine.snapshot().ledger.rideSales;assert.equal(boat.mode,'paid');assert.equal(new Set(boat.seats).size,4);assert.equal(paid,80);assert.notEqual(boat.stats.distance,boat.measured.distance);restored(engine,rules);
 const packet=engine.view(request).value.boats[0];assert.deepEqual(packet.seatIds,boat.seats);assert.deepEqual(packet.seats.map(s=>s.guest),boat.seats);
 const path=engine.snapshot().elements.find(e=>e.kind==='path'&&e.tile.x===out.x&&e.tile.y===out.y);apply(engine,{type:'remove-path',id:path.id});assert(engine.advance(3000).ok);const held=engine.snapshot().boats[0];assert.equal(held.phase,'unloading');assert.equal(held.wait,40);assert.equal(held.speed,0);assert.equal(held.position,6100);assert.deepEqual(held.seats,boat.seats);assert.deepEqual(held.measured,boat.measured);assert.equal(engine.snapshot().ledger.rideSales,paid);
 reject(engine,{type:'remove-ride',ride},'RIDE_ACTIVE');reject(engine,{type:'remove-last-track',ride},'RIDE_ACTIVE');const copy=restored(engine,rules);assert(copy.advance(17).ok);assert.deepEqual(copy.snapshot().boats[0],held);
 apply(engine,{type:'place-path',tile:{x:out.x,y:out.y},height:32,queueFor:null});assert(engine.advance(1).ok);const empty=engine.snapshot().boats[0];assert.equal(empty.phase,'loading');assert.equal(empty.mode,null);assert.equal(empty.wait,0);assert.deepEqual(empty.seats,[null,null,null,null]);assert.equal(empty.laps,2);assert.deepEqual(empty.measured,boat.measured);
 for(const id of boat.seats){const guest=engine.snapshot().people.guests.find(g=>g.id===id);assert.equal(guest.seat,null);assert.equal(guest.lastRide,ride);assert.equal(guest.ridesTaken,1);assert.equal(guest.spent,20);assert.equal(guest.cash,80);assert.equal(guest.happiness,840);assert.equal(guest.nausea,20);assert.equal(guest.point.x,out.x);assert.equal(guest.point.y,out.y);}
 assert.equal(engine.snapshot().ledger.rideSales,paid);restored(engine,rules);apply(engine,{type:'remove-ride',ride});assert.equal(engine.snapshot().retiredRideIncome,paid);assert.equal(engine.snapshot().ledger.rideSales,paid);assert.equal(engine.snapshot().boats.length,0);for(const guest of engine.snapshot().people.guests)for(const key of ['lastRide','destination','queueRide','navigationRide','entrance','exit'])assert.equal(guest[key],null);restored(engine,rules);
});

test('paid Boat pause/breakdown and uneven batches preserve actual owners and retained test witness',()=>{
 const {engine,ride,rules}=park({guests:true});until(engine,s=>s.boats[0].phase==='running');apply(engine,{type:'set-park-open',open:false});apply(engine,{type:'set-ride-status',ride,status:'closed'});apply(engine,{type:'set-ride-broken',ride,broken:true});const boat=engine.snapshot().boats[0];assert(engine.advance(80).ok);assert.deepEqual(engine.snapshot().boats[0],boat);restored(engine,rules);
 apply(engine,{type:'set-ride-broken',ride,broken:false});apply(engine,{type:'set-paused',paused:true});const paused=engine.exportSave();assert.equal(engine.advance(100).value,0);assert.equal(engine.exportSave(),paused);apply(engine,{type:'set-paused',paused:false});const copy=restored(engine,rules);
 for(const count of [1,80,1200,900,400]){assert(engine.advance(count).ok);for(let remaining=count;remaining>0;){const step=Math.min(17,remaining);assert(copy.advance(step).ok);remaining-=step;}assert.equal(copy.exportSave(),engine.exportSave());assert.deepEqual(copy.view(request).value.boats,engine.view(request).value.boats);}
});

test('real Boat payment capacity refusal preserves the guest wallet, ordered slots and park sales',()=>{
 const {engine,ride,rules}=park({guests:true,cash:Number.MAX_SAFE_INTEGER});apply(engine,{type:'set-loan',amount:engine.snapshot().spent});assert.equal(engine.snapshot().cash,Number.MAX_SAFE_INTEGER);
 until(engine,s=>s.people.guests.some(g=>g.thought==='payment-blocked'));const state=engine.snapshot();assert.equal(state.cash,Number.MAX_SAFE_INTEGER);assert.equal(state.ledger.rideSales,0);assert.equal(state.rides[0].income,0);assert.deepEqual(state.boats[0].seats,[null,null,null,null]);for(const guest of state.people.guests){assert.equal(guest.spent,0);assert.equal(guest.cash,100);}
 restored(engine,rules);apply(engine,{type:'set-loan',amount:state.loan-20});until(engine,s=>s.boats[0].seats.some(id=>id!==null));const admitted=engine.snapshot();assert.equal(admitted.boats[0].seats.filter(id=>id!==null).length,1);assert.equal(admitted.ledger.rideSales,20);assert.equal(admitted.rides[0].income,20);assert.equal(admitted.cash,Number.MAX_SAFE_INTEGER);assert.equal(admitted.people.guests.find(g=>g.seat?.ride===ride).spent,20);
});

test('early same-side station gates preserve bay removal dependencies and load under reordered elements',()=>{
 for(const order of [['entrance','exit'],['exit','entrance']]){
  const rules=withFlumeProfile(structuredClone(baseRules)),engine=new Engine(world,rules),ride=apply(engine,build).id;apply(engine,{type:'append-track',ride,piece:'station'});
  if(order[0]==='entrance'){const s=engine.snapshot();apply(engine,{type:'place-portal',ride,role:'entrance',...flumePortalSocket(s.rides[0],new Map(s.elements.map(e=>[e.id,e])),'entrance')});restored(engine,rules);}
  apply(engine,{type:'append-track',ride,piece:'station'});
  for(const role of order){if(engine.snapshot().elements.some(e=>e.kind==='portal'&&e.role===role))continue;const s=engine.snapshot();apply(engine,{type:'place-portal',ride,role,...flumePortalSocket(s.rides[0],new Map(s.elements.map(e=>[e.id,e])),role)});}
  reject(engine,{type:'remove-last-track',ride},'OPERATING_REQUIREMENTS');restored(engine,rules);const saved=engine.snapshot();saved.elements.reverse();const copy=new Engine(world,rules),loaded=copy.restoreSave(JSON.stringify(saved));assert.equal(loaded.ok,true,JSON.stringify(loaded));assert.equal(copy.exportSave(),JSON.stringify(saved));
  const exit=engine.snapshot().elements.find(e=>e.kind==='portal'&&e.role==='exit');apply(engine,{type:'remove-portal',id:exit.id});apply(engine,{type:'remove-last-track',ride});assert.equal(engine.snapshot().rides[0].track.length,1);restored(engine,rules);
 }
});

test('channel editing cancels an arrived inspection before removing its Boat and preserves reload',()=>{
 const {engine,ride,rules,out}=park({guests:true});apply(engine,{type:'set-park-open',open:false});apply(engine,{type:'set-ride-status',ride,status:'closed'});
 for(const count of [4096,4096,4096,1760])assert(engine.advance(count).ok);assert.equal(engine.snapshot().tick,16384);
 const staff=apply(engine,{type:'hire-staff',role:'mechanic',point:out}).id;assert(engine.advance(1).ok);assert.equal(engine.snapshot().staff[0].work,1);restored(engine,rules);
 apply(engine,{type:'remove-last-track',ride});const edited=engine.snapshot().staff.find(s=>s.id===staff);assert.equal(edited.job,null);assert.equal(edited.work,0);assert.equal(edited.goal,null);assert.equal(edited.next,null);restored(engine,rules);
 assert(engine.advance(200).ok);assert.equal(engine.snapshot().staff[0].work,0);assert.equal(engine.snapshot().staff[0].job,null);restored(engine,rules);
});

test('a closed paid loading Boat still requires its qualified witness before import or dispatch',()=>{
 const {engine,ride,rules}=park({guests:true});until(engine,s=>s.boats[0].phase==='loading'&&s.boats[0].seats.some(id=>id!==null));apply(engine,{type:'set-park-open',open:false});apply(engine,{type:'set-ride-status',ride,status:'closed'});const saved=engine.exportSave();restored(engine,rules);
 const invalid=engine.snapshot();invalid.boats[0].measured=null;const result=engine.restoreSave(JSON.stringify(invalid));assert.equal(result.ok,false);assert.equal(result.error.code,'INVALID_SAVE');assert.equal(engine.exportSave(),saved);
 assert(engine.advance(240).ok);assert.equal(engine.snapshot().boats[0].mode,'paid');restored(engine,rules);
});

test('a completed current test witness equals current stats while failed tests and later fresh testing remain valid',()=>{
 const {engine,ride,rules}=park();apply(engine,{type:'set-ride-status',ride,status:'testing'});assert(engine.advance(2296).ok);const saved=engine.exportSave();
 for(const change of [s=>s.boats[0].measured=null,s=>s.boats[0].measured.maxSpeed=0,s=>s.boats[0].measured.maxSpeed=100,s=>s.boats[0].measured.ticks--]){const bad=engine.snapshot();change(bad);const result=engine.restoreSave(JSON.stringify(bad));assert.equal(result.ok,false);assert.equal(result.error.code,'INVALID_SAVE');assert.equal(engine.exportSave(),saved);}
 const failed=engine.snapshot();failed.boats[0].stats.maxSpeed=301;failed.boats[0].measured=null;const copy=new Engine(world,rules);assert(copy.restoreSave(JSON.stringify(failed)).ok);assert(copy.advance(40).ok);apply(copy,{type:'set-ride-status',ride,status:'closed'});restored(copy,rules);
 assert(engine.advance(40).ok);apply(engine,{type:'set-ride-status',ride,status:'testing'});assert.equal(engine.snapshot().boats[0].measured,null);restored(engine,rules);
});

test('finite exported channel definitions cannot mutate an existing private receiver or native clearance',()=>{
 const rules=withFlumeProfile(structuredClone(baseRules)),engine=new Engine(world,rules),ride=apply(engine,build).id,command={type:'append-track',ride,piece:'station'},quote=engine.quote(command),before=engine.exportSave();
 const width=flumeCandidate.stationWidthMm;try{assert.throws(()=>{flumeCandidate.stationWidthMm=400;},TypeError);}finally{if(flumeCandidate.stationWidthMm!==width)flumeCandidate.stationWidthMm=width;}
 assert.throws(()=>{flumeCandidate.seats[0].y=0;},TypeError);assert.throws(()=>{flumePieces.station.motion.samples[0].x=32;},TypeError);assert.throws(()=>{flumePieces.station.end.x=64;},TypeError);assert.throws(()=>{flumePieces.station.cells.push({x:0,y:0,low:0,high:16,mask:15});},TypeError);assert.throws(()=>{flumePieces.station=flumePieces.channel;},TypeError);
 assert.deepEqual(engine.quote(command).value,quote.value);assert.equal(engine.exportSave(),before);assert(engine.execute(command,quote.value.revision).ok);
});
