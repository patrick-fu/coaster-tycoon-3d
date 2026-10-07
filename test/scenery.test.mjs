import test from 'node:test';
import assert from 'node:assert/strict';
import {create,apply} from './fixtures.mjs';
import {Engine} from '../dist/simulation/engine.js';
const scenery=(type='tree',x=5,y=5,height=16)=>({type:'place-scenery',sceneryType:type,tile:{x,y},height});
function rejects(e,c,code){const before=e.exportSave();for(const r of[e.quote(c),e.execute(c,e.revision)]){assert(!r.ok);assert.equal(r.error.code,code);}assert.equal(e.exportSave(),before);}
test('scenery charges integer candidate costs, obstructs its occupied height, persists and refunds on removal',()=>{
 const e=create(),before=e.snapshot().cash,placed=apply(e,scenery());assert.equal(e.snapshot().cash,before-60);
 rejects(e,{type:'place-path',tile:{x:5,y:5},height:32,queueFor:null},'CLEARANCE');
 assert(e.restoreSave(e.exportSave()).ok);apply(e,{type:'remove-scenery',id:placed.id});assert.equal(e.snapshot().cash,before-30);assert.equal(e.snapshot().refunded,30);apply(e,{type:'place-path',tile:{x:5,y:5},height:16,queueFor:null});
});
test('scenery ownership, funds, water, grounding and terrain changes reject atomically',()=>{
 const poor=create({cash:50});rejects(poor,scenery(),'INSUFFICIENT_CASH');const e=create();rejects(e,scenery('tree',0,5),'OFF_MAP');rejects(e,scenery('tree',5,5,32),'GEOMETRY');
 apply(e,{type:'set-terrain',tile:{x:5,y:5},height:16,water:32});rejects(e,scenery(),'CLEARANCE');apply(e,{type:'set-terrain',tile:{x:5,y:5},height:16,water:0});apply(e,scenery());rejects(e,{type:'set-terrain',tile:{x:5,y:5},height:0,water:0},'CLEARANCE');rejects(e,{type:'remove-scenery',id:999},'UNKNOWN_ELEMENT');
});
test('flower clearance covers its visible blooms while permitting a separated overhead path',()=>{
 const e=create();apply(e,scenery('flower'));rejects(e,{type:'place-path',tile:{x:5,y:5},height:24,queueFor:null},'CLEARANCE');apply(e,{type:'place-path',tile:{x:5,y:5},height:32,queueFor:null});assert(e.restoreSave(e.exportSave()).ok);
});
test('version six parks migrate without changing continuation, cash, membership or player construction',()=>{
 const e=create();apply(e,{type:'place-path',tile:{x:5,y:5},height:16,queueFor:null});const expected=e.snapshot(),legacy=structuredClone(expected),profile=JSON.parse(legacy.rules);delete profile.scenery;delete legacy.contentVersion;delete legacy.nextInstance;legacy.version=6;legacy.rules=JSON.stringify(profile);
 assert(e.restoreSave(JSON.stringify(legacy)).ok);assert.deepEqual(e.snapshot(),expected);assert(e.advance(60).ok);assert(e.restoreSave(e.exportSave()).ok);
});
test('invalid scenery and legacy metadata preserve the live park on failed import',()=>{
 const e=create();apply(e,scenery());const before=e.exportSave();for(const mutate of[s=>s.elements[0].sceneryType='unknown',s=>s.elements[0].height=32,s=>{s.version=6;},s=>{s.version=6;s.elements=[];s.rules='null';},s=>{s.version=6;s.elements=[];s.rules='{';}]){const s=JSON.parse(before);mutate(s);const r=e.restoreSave(JSON.stringify(s));assert(!r.ok);assert.equal(r.error.code,'INVALID_SAVE');assert.equal(e.exportSave(),before);}
});
test('malformed rule roots retain structured validation errors before scenery normalization',()=>{
 for(const rules of [null,undefined,[],false,'invalid'])assert.throws(()=>new Engine({side:15,cash:100000,maxLoan:100000,seed:42},rules),error=>error.code==='INVALID_COMMAND');
});
