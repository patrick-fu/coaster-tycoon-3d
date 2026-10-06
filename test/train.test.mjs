import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../dist/simulation/index.js';
import {carPose,compileCourse} from '../dist/simulation/motion.js';
import {apply,append,create,operatingPark,rules,options} from './fixtures.mjs';
const train=e=>e.snapshot().trains[0];
const start=e=>{const {id}=operatingPark(e);apply(e,{type:'set-ride-status',ride:id,status:'testing'});return id;};

test('testing runs an actual station/track cycle and records geometry-dependent motion',()=>{
 const e=create();start(e);assert.equal(e.advance(2000).value,2000);const t=train(e);
 assert(t.laps>=2);assert(t.measured.ticks>100);assert(t.measured.distance>30000);assert.equal(t.measured.maxSpeed,100);assert(t.measured.maxLateralG>0);assert.equal(t.measured.maxVerticalG,1000);
 const s=e.snapshot(),course=compileCourse(s.rides[0],new Map(s.elements.map(v=>[v.id,v])),rules,rules.motion),pose=carPose(course,t.position);
 assert(Number.isFinite(pose.position.x));assert(Math.abs(Math.hypot(pose.direction.x,pose.direction.y,pose.direction.z)-1)<1e-9);
});
test('higher actual speed shortens measured duration and increases curve forces',()=>{
 const slow=create(),fastRules=structuredClone(rules);fastRules.motion.stationSpeed=200;const fast=new Engine(options,fastRules);start(slow);start(fast);slow.advance(2000);fast.advance(2000);
 const a=train(slow).measured,b=train(fast).measured;assert.equal(b.distance,a.distance);assert(b.ticks<a.ticks*0.6);assert(b.maxLateralG>a.maxLateralG*3.5);
});
test('a closed moving ride completes its current cycle, suppresses new dispatch and prevents unsafe edits',()=>{
 const e=create(),id=start(e);e.advance(80);assert.equal(train(e).phase,'running');apply(e,{type:'set-ride-status',ride:id,status:'closed'});
 const before=e.exportSave();assert.equal(e.execute({type:'remove-last-track',ride:id},e.revision).error.code,'RIDE_ACTIVE');assert.equal(e.exportSave(),before);
 e.advance(2000);assert.equal(train(e).phase,'waiting');assert.equal(train(e).laps,1);const stopped=JSON.stringify(train(e));e.advance(2000);assert.equal(JSON.stringify(train(e)),stopped);
 apply(e,{type:'remove-last-track',ride:id});assert.equal(e.snapshot().trains.length,0);assert.equal(e.quote({type:'set-ride-status',ride:id,status:'open'}).error.code,'OPERATING_REQUIREMENTS');append(e,id,'right');apply(e,{type:'set-ride-status',ride:id,status:'testing'});assert.equal(train(e).measured,null);
});
test('configured cars must fit the platform before allocation and preserve unique shared car identities',()=>{
 const {engine:e,id}=operatingPark();apply(e,{type:'set-train-cars',ride:id,cars:5});const before=e.exportSave();assert.equal(e.execute({type:'set-ride-status',ride:id,status:'testing'},e.revision).error.code,'OPERATING_REQUIREMENTS');assert.equal(e.exportSave(),before);
 apply(e,{type:'set-train-cars',ride:id,cars:4});apply(e,{type:'set-ride-status',ride:id,status:'testing'});assert.deepEqual(train(e).carIds,[1,2,3,4]);assert.equal(e.snapshot().nextEntity,5);
});
test('pause and save continuation preserve moving trains across different tick batches',()=>{
 const e=create();start(e);e.advance(123);apply(e,{type:'set-paused',paused:true});const paused=e.exportSave();assert.equal(e.advance(512).value,0);assert.equal(e.exportSave(),paused);apply(e,{type:'set-paused',paused:false});
 const restored=create();assert(restored.restoreSave(e.exportSave()).ok);assert.equal(restored.exportSave(),e.exportSave());e.advance(1600);for(const batch of [13,400,17,770,400])restored.advance(batch);assert.equal(restored.exportSave(),e.exportSave());
});
test('invalid shared identities, motion phases and measurements cannot replace a live park',()=>{
 const e=create(),{id}=operatingPark(e);apply(e,{type:'set-train-cars',ride:id,cars:2});apply(e,{type:'set-ride-status',ride:id,status:'testing'});e.advance(800);const before=e.exportSave();
 for(const mutate of [s=>s.trains[0].carIds[1]=s.trains[0].carIds[0],s=>s.trains[0].position++,s=>s.trains[0].phase='teleporting',s=>s.trains[0].stats.distance++,s=>s.trains[0].measured.distance=1,s=>s.trains=[],s=>s.nextEntity=1]){const s=e.snapshot();mutate(s);assert.equal(e.restoreSave(JSON.stringify(s)).ok,false);assert.equal(e.exportSave(),before);}
});
test('gravity, lift chains and brakes affect legal profile-driven motion rather than displayed scores',()=>{
 const coastRules=structuredClone(rules);coastRules.pieces.right.motion.samples=coastRules.pieces.right.motion.samples.map((p,i,all)=>({...p,z:i===0||i===all.length-1?0:16*Math.sin(i*Math.PI/(all.length-1))}));coastRules.pieces.right.cells.forEach(c=>c.high=32);
 const liftRules=structuredClone(coastRules);liftRules.pieces.right.motion.chain=true;liftRules.motion.chainSpeed=200;
 const brakeRules=structuredClone(rules);brakeRules.pieces.right.motion.brake=20;
 const coast=new Engine(options,coastRules),lift=new Engine(options,liftRules),braked=new Engine(options,brakeRules);
 for(const e of [coast,lift,braked]){start(e);e.advance(70);assert(e.restoreSave(e.exportSave()).ok);}
 assert(train(coast).speed<rules.motion.stationSpeed);assert(train(lift).speed>=200);assert(train(braked).speed>=20&&train(braked).speed<rules.motion.stationSpeed);
});

test('a stopped train cannot be imported halfway around the circuit as if it were in its station',()=>{
 const e=create();start(e);e.advance(80);const before=e.exportSave(),s=e.snapshot();s.trains[0].phase='waiting';s.trains[0].speed=0;
 assert.equal(e.restoreSave(JSON.stringify(s)).ok,false);assert.equal(e.exportSave(),before);
});

test('station length includes a platform crossing the circuit origin and a closed stalled test train can be reset',()=>{
 const e=create(),id=apply(e,{type:'create-ride',name:'Wrapped platform',tile:{x:10,y:10},height:32,direction:0}).id;
 for(const piece of ['station','right','right','flat','flat','flat','right','right','station','station'])append(e,id,piece);
 for(const [station,role,x] of [[1,'entrance',10],[9,'exit',8]])apply(e,{type:'place-portal',ride:id,station,role,tile:{x,y:9},height:32,direction:1});
 apply(e,{type:'set-train-cars',ride:id,cars:6});apply(e,{type:'set-ride-status',ride:id,status:'testing'});assert.equal(train(e).carIds.length,6);assert(e.restoreSave(e.exportSave()).ok);
 const slowRules=structuredClone(rules);slowRules.motion.rolling=200;const stalled=new Engine(options,slowRules),stalledId=start(stalled);stalled.advance(1000);assert.equal(train(stalled).phase,'stalled');
 assert.equal(stalled.quote({type:'reset-train',ride:stalledId}).error.code,'RIDE_ACTIVE');apply(stalled,{type:'set-ride-status',ride:stalledId,status:'closed'});apply(stalled,{type:'reset-train',ride:stalledId});assert.equal(stalled.snapshot().trains.length,0);apply(stalled,{type:'remove-last-track',ride:stalledId});assert(stalled.restoreSave(stalled.exportSave()).ok);
});

test('equivalent motion profile data has stable identity regardless of input key order',()=>{
 const e=create();start(e);e.advance(60);const reordered=structuredClone(rules);reordered.motion=Object.fromEntries(Object.entries(reordered.motion).reverse());const other=new Engine(options,reordered);assert(other.restoreSave(e.exportSave()).ok);assert.equal(other.exportSave(),e.exportSave());
});
