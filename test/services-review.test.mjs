import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../dist/simulation/index.js';
import {apply,operatingPark,rules,options} from './fixtures.mjs';
test('mechanics can use a longer public route entirely inside patrol instead of an excluded shortcut',()=>{
 const {engine:e,id}=operatingPark();for(const [x,y] of [[13,8],[12,8],[11,8],[13,7],[12,7],[11,7]])apply(e,{type:'place-path',tile:{x,y},height:32,queueFor:null});const staff=apply(e,{type:'hire-staff',role:'mechanic',point:{x:13,y:8,z:32}}).id;apply(e,{type:'set-staff-patrol',staff,tiles:[[13,8],[13,7],[12,7],[11,7],[11,8]].map(([x,y])=>({x,y}))});apply(e,{type:'set-ride-broken',ride:id,broken:true});assert(e.advance(100).ok);assert.equal(e.snapshot().rides[0].broken,false);assert(e.restoreSave(e.exportSave()).ok);
});
test('saved staff steps cannot leave patrol despite a valid in-patrol goal route',()=>{
 const {engine:e,id}=operatingPark();for(const [x,y] of [[10,7],[11,7],[11,8],[9,7]])apply(e,{type:'place-path',tile:{x,y},height:32,queueFor:null});const staff=apply(e,{type:'hire-staff',role:'mechanic',point:{x:10,y:7,z:32}}).id;apply(e,{type:'set-staff-patrol',staff,tiles:[{x:10,y:7},{x:11,y:7},{x:11,y:8}]});apply(e,{type:'set-ride-broken',ride:id,broken:true});assert(e.advance(3).ok);const before=e.exportSave(),s=e.snapshot();s.staff[0].next={x:9,y:7,z:32};assert.equal(e.restoreSave(JSON.stringify(s)).ok,false);assert.equal(e.exportSave(),before);
});
function counter(cash=10000,price=10,stock=3){const p=structuredClone(rules);p.guests.spawnTicks=200;p.guests.decisionTicks=1;p.guests.walkTicks=2;p.guests.initialHunger=900;p.guests.initialThirst=0;p.services.initialBladder=0;p.services.serviceTicks=10;p.services.defaultPrice=price;p.services.foodStock=stock;const e=new Engine({...options,cash},p);for(const x of [10,11])apply(e,{type:'place-path',tile:{x,y:10},height:32,queueFor:null});const id=apply(e,{type:'place-facility',name:'Food',kind:'food',tile:{x:10,y:9},height:32,direction:1}).id;apply(e,{type:'set-facility-open',facility:id,open:true});return e;}
test('a saved walking facility guest must retain the real counter goal rather than buying remotely',()=>{
 const e=counter();apply(e,{type:'set-park-entrance',point:{x:11,y:10,z:32}});apply(e,{type:'set-park-open',open:true});assert(e.advance(200).ok);const before=e.exportSave(),s=e.snapshot();assert(s.people.guests[0].facility!==null);Object.assign(s.people.guests[0],{goal:null,next:null,walkProgress:0});assert.equal(e.restoreSave(JSON.stringify(s)).ok,false);assert.equal(e.exportSave(),before);
});
test('shop net receipts use exact safe-integer arithmetic before committing an advance',()=>{
 const e=counter(Number.MAX_SAFE_INTEGER,2,1);apply(e,{type:'set-loan',amount:224});assert.equal(e.snapshot().cash,Number.MAX_SAFE_INTEGER);apply(e,{type:'set-park-entrance',point:{x:10,y:10,z:32}});apply(e,{type:'set-park-open',open:true});assert(e.advance(200).ok);apply(e,{type:'set-park-open',open:false});const before=e.exportSave(),result=e.advance(12);assert.equal(result.ok,false);assert.equal(result.error.code,'CAPACITY');assert.equal(e.exportSave(),before);
});
