import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine,LIMITS} from '../dist/simulation/index.js';
import {apply,append,create,ride,loop,rules,options} from './fixtures.mjs';
const rejected=(engine,command,code)=>{const before=engine.exportSave();const q=engine.quote(command);assert.equal(q.ok,false);assert.equal(q.error.code,code);assert.equal(engine.exportSave(),before);const r=engine.execute(command,engine.revision);assert.equal(r.ok,false);assert.equal(r.error.code,code);assert.equal(engine.exportSave(),before);};
const path=(engine,x,y,height=16,queueFor=null)=>apply(engine,{type:'place-path',tile:{x,y},height,queueFor});

test('quotes never allocate identifiers or mutate authoritative state and execution charges its quoted price',()=>{
 const e=create(),id=ride(e),before=e.exportSave();const c={type:'append-track',ride:id,piece:'station'};
 const q=e.quote(c);assert(q.ok);assert.equal(q.value.cost,101);assert.equal(e.exportSave(),before);
 q.value.cells[0].low=-999;const r=e.execute(c,q.value.revision);assert(r.ok);assert.equal(r.value.id,1);assert.equal(e.snapshot().cash,9899);assert.equal(e.snapshot().spent,101);assert.equal(e.snapshot().elements[0].origin.z,32);
});
test('stale quotes are rejected without charging or allocating',()=>{
 const e=create(),id=ride(e),c={type:'append-track',ride:id,piece:'station'},q=e.quote(c);
 apply(e,{type:'set-loan',amount:100});const before=e.exportSave();assert.equal(e.execute(c,q.value.revision).error.code,'STALE_REVISION');assert.equal(e.exportSave(),before);
});
test('insufficient funds, unowned land and boundary placement reject atomically',()=>{
 const e=create({cash:100}),id=ride(e);rejected(e,{type:'append-track',ride:id,piece:'station'},'INSUFFICIENT_CASH');
 rejected(e,{type:'place-path',tile:{x:0,y:10},height:16,queueFor:null},'OFF_MAP');
 const locked=create({land:[{tile:{x:5,y:5},height:16,water:0,owned:false}]});rejected(locked,{type:'place-path',tile:{x:5,y:5},height:16,queueFor:null},'NOT_OWNED');
});
test('connector pitch and bank determine compatible continuation',()=>{
 const e=create(),id=ride(e);append(e,id,'station');rejected(e,{type:'append-track',ride:id,piece:'up'},'GEOMETRY');rejected(e,{type:'append-track',ride:id,piece:'banked'},'GEOMETRY');
 append(e,id,'transition');rejected(e,{type:'append-track',ride:id,piece:'flat'},'GEOMETRY');append(e,id,'up');assert.equal(e.snapshot().elements.at(-1).origin.pitch,1);
});
test('a connected circuit blocks extension until explicit removal, which refunds the configured amount',()=>{
 const e=create(),id=loop(e);assert.deepEqual(e.circuit(id),{ok:true,value:true});rejected(e,{type:'append-track',ride:id,piece:'flat'},'CIRCUIT_CLOSED');
 const before=e.snapshot();const refund=apply(e,{type:'remove-last-track',ride:id});assert.equal(refund.cost,-40);assert.equal(e.snapshot().cash,before.cash+40);assert.equal(e.snapshot().refunded,40);assert.equal(e.circuit(id).value,false);append(e,id,'right');assert.equal(e.circuit(id).value,true);
});
test('multi-cell clearances reject intersecting rides but allow vertically separated paths',()=>{
 const e=create(),id=ride(e);append(e,id,'station');append(e,id,'right');rejected(e,{type:'place-path',tile:{x:12,y:10},height:32,queueFor:null},'CLEARANCE');
 path(e,12,10,16);const other=ride(e,{x:10,y:10});rejected(e,{type:'append-track',ride:other,piece:'station'},'CLEARANCE');
});
test('terrain and water edits cannot bury paths or leave supports beyond their limit',()=>{
 const e=create();path(e,5,5);rejected(e,{type:'set-terrain',tile:{x:5,y:5},height:32,water:0},'CLEARANCE');rejected(e,{type:'set-terrain',tile:{x:5,y:5},height:16,water:32},'CLEARANCE');
 path(e,6,5,144);rejected(e,{type:'set-terrain',tile:{x:6,y:5},height:0,water:0},'SUPPORT');const r=apply(e,{type:'set-terrain',tile:{x:7,y:5},height:32,water:0});assert.equal(r.cost,15);assert.equal(e.snapshot().terrain[5*256+7],32);
});
test('path removal invalidates connectivity and foreign queues cannot act as public shortcuts',()=>{
 const e=create(),id=ride(e);path(e,5,5);const bridge=path(e,6,5);path(e,7,5,16,id);
 const from={x:5,y:5,z:16},to={x:7,y:5,z:16};assert.equal(e.route(from,to).value.length,0);assert.equal(e.route(from,to,id).value.length,3);
 const rev=e.snapshot().topologyRevision;apply(e,{type:'remove-path',id:bridge.id});assert.equal(e.snapshot().topologyRevision,rev+1);assert.equal(e.route(from,to,id).value.length,0);path(e,6,5);assert.equal(e.route(from,to,id).value.length,3);
});
test('loan changes preserve cash minus principal and do not enter construction expenses',()=>{
 const e=create(),before=e.snapshot();apply(e,{type:'set-loan',amount:20000});let s=e.snapshot();assert.equal(s.cash-s.loan,before.cash);assert.equal(s.spent,0);apply(e,{type:'set-loan',amount:0});assert.equal(e.snapshot().cash,before.cash);
 const poor=create({cash:0});apply(poor,{type:'set-loan',amount:101});const id=ride(poor);append(poor,id,'station');rejected(poor,{type:'set-loan',amount:0},'INSUFFICIENT_CASH');
 const full=create({cash:Number.MAX_SAFE_INTEGER});rejected(full,{type:'set-loan',amount:1},'INSUFFICIENT_CASH');
});
test('pause suppresses ticks and restored state continues the same ordered commands',()=>{
 const e=create(),id=loop(e);path(e,4,4);e.advance(512);apply(e,{type:'set-paused',paused:true});assert.equal(e.advance(100).value,0);
 const restored=create();assert(restored.restoreSave(e.exportSave()).ok);assert.deepEqual(restored.snapshot(),e.snapshot());
 for(const engine of [e,restored]){apply(engine,{type:'set-paused',paused:false});engine.advance(1024);apply(engine,{type:'set-loan',amount:500});apply(engine,{type:'remove-last-track',ride:id});append(engine,id,'right');}
 assert.equal(restored.exportSave(),e.exportSave());
});
test('hostile commands and inherited piece names cannot mutate the park',()=>{
 const e=create(),id=ride(e);for(const piece of ['__proto__','toString','constructor'])rejected(e,{type:'append-track',ride:id,piece},'GEOMETRY');
 for(const c of [null,{},Object.create({type:'set-loan',amount:100}),{type:'set-loan',amount:1.5},{type:'set-loan',amount:NaN},{type:'set-paused',paused:true,extra:'x'}])rejected(e,c,'INVALID_COMMAND');
});
test('malformed saves preserve live state and reject inconsistent references, ledgers and geometry',()=>{
 const e=create(),id=loop(e);path(e,4,4);const pristine=e.exportSave();
 const bad=[];bad.push('{');bad.push(JSON.stringify({...e.snapshot(),version:999}));
 for(const mutate of [s=>s.cash++,s=>s.elements[0].origin.z=1,s=>s.rides[0].track.reverse(),s=>s.elements[0].piece='__proto__',s=>s.elements[0].ride=200,s=>s.owned[0]=true,s=>s.rides[0].track.pop(),s=>s.elements[0].id=s.elements[1].id,s=>s.elements.find(v=>v.kind==='path').queueFor=200]){const s=e.snapshot();mutate(s);bad.push(JSON.stringify(s));}
 bad.push(pristine.slice(0,-1)+',"__proto__":{"cash":1}}');
 for(const json of bad){const r=e.restoreSave(json);assert.equal(r.ok,false);assert.equal(r.error.code,'INVALID_SAVE');assert.equal(e.exportSave(),pristine);}
});
test('saved profile identity covers prices and external rules/snapshots cannot alter the live engine',()=>{
 const custom=structuredClone(rules),e=new Engine(options,custom),id=ride(e);custom.pieces.station.price=0;assert.equal(e.quote({type:'append-track',ride:id,piece:'station'}).value.cost,101);
 const s=e.snapshot();s.cash=0;s.rides[0].anchor.z=200;assert.equal(e.snapshot().cash,10000);assert.equal(e.snapshot().rides[0].anchor.z,32);
 const changed=structuredClone(rules);changed.pieces.station.price=102;const other=new Engine(options,changed);assert.equal(other.restoreSave(e.exportSave()).error.code,'WRONG_RULES');
});
test('loading a different park invalidates old quotes even when persisted revisions match',()=>{
 const a=create(),b=create(),tile={x:5,y:5};apply(a,{type:'set-terrain',tile,height:32,water:0});apply(b,{type:'set-paused',paused:true});
 const c={type:'set-terrain',tile,height:48,water:0},q=a.quote(c);assert.equal(q.value.cost,15);
 assert(a.restoreSave(b.exportSave()).ok);const before=a.exportSave();const r=a.execute(c,q.value.revision);assert.equal(r.ok,false);assert.equal(r.error.code,'STALE_REVISION');assert.equal(a.exportSave(),before);
});
test('a save cannot pre-refund construction that remains active',()=>{
 const e=create();path(e,5,5);const before=e.exportSave(),s=e.snapshot();s.refunded=12;s.cash=s.initialCash;
 const r=e.restoreSave(JSON.stringify(s));assert.equal(r.ok,false);assert.equal(r.error.code,'INVALID_SAVE');assert.equal(e.exportSave(),before);
});
test('the 255 shared instance budget accepts its last slot and refuses another atomically',()=>{
 const e=create();for(let i=0;i<255;i++)ride(e);assert.equal(e.snapshot().rides.at(-1).id,254);rejected(e,{type:'create-ride',name:'Overflow',tile:{x:10,y:10},height:32,direction:0},'CAPACITY');assert.equal(LIMITS.rideSlots,255);
});
test('multi-record placement observes the reconstructed tile threshold, including the fixed surface backing',()=>{
 const e=create({side:256,cash:10000000}),s=e.snapshot(),capacity=LIMITS.tileElements-LIMITS.surfaceRecords;
 for(let i=0;i<capacity;i++){const tileIndex=i%(254*254),layer=Math.floor(i/(254*254));s.elements.push({id:i+1,kind:'path',tile:{x:1+tileIndex%254,y:1+Math.floor(tileIndex/254)},height:16+layer*16,queueFor:null});}
 s.nextElement=capacity+1;s.spent=capacity*rules.pathPrice;s.cash=s.initialCash-s.spent;
 assert(e.restoreSave(JSON.stringify(s)).ok);const before=e.exportSave();const r=e.execute({type:'place-path',tile:{x:250,y:250},height:64,queueFor:null},e.revision);assert.equal(r.error.code,'CAPACITY');assert.equal(e.exportSave(),before);
 const removed=apply(e,{type:'remove-path',id:1});assert.equal(removed.cost,-6);const id=ride(e,{x:250,y:250,height:96});rejected(e,{type:'append-track',ride:id,piece:'right'},'GEOMETRY');append(e,id,'station');rejected(e,{type:'append-track',ride:id,piece:'right'},'CAPACITY');
});

test('rejected loads preserve pending quotes while new engine instances cannot reuse them',()=>{
 const a=create(),b=create(),command={type:'place-path',tile:{x:5,y:5},height:16,queueFor:null},q=a.quote(command);
 assert.equal(b.execute(command,q.value.revision).error.code,'STALE_REVISION');
 assert.equal(a.restoreSave('{').ok,false);assert(a.execute(command,q.value.revision).ok);assert.equal(a.snapshot().cash,9988);
});

test('command accessors are rejected before they can execute user code',()=>{
 const e=create(),before=e.exportSave();let invoked=false;const c={amount:100};Object.defineProperty(c,'type',{enumerable:true,get(){invoked=true;throw new Error('Accessor ran.');}});assert.equal(e.quote(c).error.code,'INVALID_COMMAND');assert.equal(invoked,false);assert.equal(e.exportSave(),before);
});
