import {beforeCommerceState,beforeCommerceView} from './consumables-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../dist/simulation/index.js';
import {create,apply,ride,operatingPark,rules,options} from './fixtures.mjs';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

function legacy(state,version=7){
 const s=beforeCommerceState(state);assert.deepEqual(s.boats,[]);delete s.boats;s.version=version;delete s.contentVersion;delete s.nextInstance;delete s.carouselSessions;delete s.retiredRideIncome;
 for(const r of [...s.rides,...s.facilities]){delete r.content;delete r.instanceId;}
 const profile=JSON.parse(s.rules);delete profile.channelProfiles;delete profile.rideProfiles;delete profile.fixedProfiles;if(version===6)delete profile.scenery;s.rules=JSON.stringify(profile);
 return s;
}
const tick=(e,n)=>{while(n){const count=Math.min(n,4096);assert(e.advance(count).ok);n-=count;}};

test('v7 imports receive independent content identities without changing their original rules or park state',()=>{
 const e=create();ride(e);apply(e,{type:'place-facility',name:'Old food',kind:'food',tile:{x:5,y:5},height:32,direction:0});
 const original=legacy(e.snapshot()),restored=create();assert(restored.restoreSave(JSON.stringify(original)).ok);
 const s=restored.snapshot();assert.equal(s.version,12);assert.equal(s.contentVersion,5);assert.equal(s.rides[0].content.familyId,'independent.circuit-coaster');assert.equal(s.facilities[0].content.variantId,'independent.food-stand');
 assert.deepEqual(legacy(s),original);assert.equal(s.rides[0].instanceId,1);assert.equal(s.facilities[0].instanceId,2);assert.equal(s.nextInstance,3);
 const saved=restored.exportSave();assert(restored.restoreSave(saved).ok);assert.equal(restored.exportSave(),saved);
});

test('v7 passenger and queue migration preserves exact continuation with nondefault motion and finance rules',()=>{
 const {engine:e,id}=operatingPark();for(const [x,y,queueFor] of [[10,7,null],[11,7,null],[11,8,null],[10,8,id]])apply(e,{type:'place-path',tile:{x,y},height:32,queueFor});
 apply(e,{type:'set-park-entrance',point:{x:10,y:7,z:32}});apply(e,{type:'set-ride-status',ride:id,status:'open'});tick(e,400);apply(e,{type:'set-park-open',open:true});
 let populated=false;for(let n=0;n<1000;n+=4){tick(e,4);const s=e.snapshot();if(s.trains[0].seats.some(id=>id!==null)&&s.rides[0].queue.length){populated=true;break;}}assert(populated,'The fixture must exercise both occupied seats and a queue.');
 const original=legacy(e.snapshot()),restored=create();assert(restored.restoreSave(JSON.stringify(original)).ok);assert.deepEqual(legacy(restored.snapshot()),original);
 tick(e,900);tick(restored,17);tick(restored,883);assert.deepEqual(legacy(restored.snapshot()),legacy(e.snapshot()));assert.equal(restored.snapshot().contentVersion,5);
});

test('v7 shop migration preserves retired income and stock when a demolished slot was reused for drinks',()=>{
 const p=structuredClone(rules);p.guests.spawnTicks=200;p.guests.decisionTicks=1;p.guests.walkTicks=2;p.guests.initialHunger=900;p.guests.initialThirst=900;p.services.serviceTicks=10;
 const e=new Engine(options,p);apply(e,{type:'place-path',tile:{x:10,y:10},height:32,queueFor:null});const id=apply(e,{type:'place-facility',name:'Food',kind:'food',tile:{x:10,y:9},height:32,direction:1}).id;
 apply(e,{type:'set-facility-open',facility:id,open:true});apply(e,{type:'set-park-entrance',point:{x:10,y:10,z:32}});apply(e,{type:'set-park-open',open:true});tick(e,200);apply(e,{type:'set-park-open',open:false});tick(e,12);
 assert.equal(e.snapshot().facilities[0].sales,1);apply(e,{type:'remove-facility',facility:id});const replacement=apply(e,{type:'place-facility',name:'Drinks',kind:'drink',tile:{x:10,y:9},height:32,direction:1}).id;assert.equal(replacement,id);
 apply(e,{type:'set-facility-open',facility:id,open:true});tick(e,600);const original=legacy(e.snapshot()),restored=new Engine(options,p);assert(restored.restoreSave(JSON.stringify(original)).ok);const s=restored.snapshot();assert.deepEqual(legacy(s),original);assert.equal(s.retiredShopIncome,10);assert.equal(s.retiredStock,3);assert.equal(s.facilities[0].content.variantId,'independent.drink-stand');
 tick(e,400);tick(restored,13);tick(restored,387);assert.deepEqual(legacy(restored.snapshot()),legacy(e.snapshot()));
});

test('legacy content fields, malformed ledgers and changed numeric rules are rejected without losing quotes or pause',()=>{
 const e=create();ride(e);apply(e,{type:'set-paused',paused:true});const original=legacy(e.snapshot()),before=e.exportSave(),c={type:'place-path',tile:{x:5,y:5},height:16,queueFor:null},q=e.quote(c);assert(q.ok);
 for(const mutate of [s=>s.cash++,s=>s.rides[0].content={familyId:'reference.rct2.family.wooden-rc'},s=>s.nextInstance=2,s=>s.version=5,s=>s.version=9]){const bad=structuredClone(original);mutate(bad);assert.equal(e.restoreSave(JSON.stringify(bad)).error.code,'INVALID_SAVE');assert.equal(e.exportSave(),before);assert.equal(e.revision,q.value.revision);}
 const bad=structuredClone(original),p=JSON.parse(bad.rules);p.pieces.station.price++;bad.rules=JSON.stringify(p);assert.equal(e.restoreSave(JSON.stringify(bad)).error.code,'WRONG_RULES');assert.equal(e.exportSave(),before);assert(e.execute(c,q.value.revision).ok);assert.equal(e.advance(40).value,0);
});

test('legal v6 scenery normalization reaches v12 while forbidden v6 scenery is rejected',()=>{
 const e=create();ride(e);const old=legacy(e.snapshot(),6),restored=create();assert(restored.restoreSave(JSON.stringify(old)).ok);assert.equal(restored.snapshot().version,12);assert.deepEqual(legacy(restored.snapshot(),6),old);
 apply(e,{type:'place-scenery',sceneryType:'tree',tile:{x:5,y:5},height:16});const before=restored.exportSave();assert.equal(restored.restoreSave(JSON.stringify(legacy(e.snapshot(),6))).error.code,'INVALID_SAVE');assert.equal(restored.exportSave(),before);
});

test('actual previous-kernel v7 exports continue identically after v12 migration with different tick batches',()=>{
 const cases=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v7-continuation.json.gz',import.meta.url))));
 for(const c of cases){const e=new Engine(options,c.profile);assert.equal(c.initial.version,7);assert(e.restoreSave(JSON.stringify(c.initial)).ok,c.name);assert.deepEqual(legacy(e.snapshot()),c.initial,c.name);tick(e,17);tick(e,c.ticks-17);assert.deepEqual(legacy(e.snapshot()),c.continuation,c.name);}
});
