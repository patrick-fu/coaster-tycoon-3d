import test from 'node:test';
import assert from 'node:assert/strict';
import {apply,create,operatingPark} from './fixtures.mjs';

test('an accepted high-speed save cannot produce an unrepresentable measurement on the next tick',()=>{
 const e=create(),{id}=operatingPark(e);apply(e,{type:'set-ride-status',ride:id,status:'testing'});e.advance(100);const s=e.snapshot();assert.equal(s.trains[0].phase,'running');s.trains[0].speed=1000000000;s.trains[0].stats.maxSpeed=1000000000;
 assert(e.restoreSave(JSON.stringify(s)).ok);const before=e.exportSave(),next=e.advance(1);assert.equal(next.ok,false);assert.equal(next.error.code,'CAPACITY');assert.equal(e.exportSave(),before);assert(e.restoreSave(e.exportSave()).ok);
});
