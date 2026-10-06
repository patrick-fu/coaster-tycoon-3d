import test from 'node:test';
import assert from 'node:assert/strict';
import {apply,create,ride} from './fixtures.mjs';
test('imported next steps cannot bypass foreign-queue permissions or an unreachable goal',()=>{
 const e=create(),id=ride(e);for(const [x,queueFor] of [[5,null],[6,id],[7,null]])apply(e,{type:'place-path',tile:{x,y:5},height:16,queueFor});apply(e,{type:'set-park-entrance',point:{x:5,y:5,z:16}});apply(e,{type:'set-park-open',open:true});assert(e.advance(40).ok);
 const s=e.snapshot(),g=s.people.guests[0];s.people.open=false;Object.assign(g,{phase:'walking',point:{x:5,y:5,z:16},goal:{x:7,y:5,z:16},next:{x:6,y:5,z:16},walkProgress:7,destination:null,queueRide:null,entrance:null,exit:null,seat:null});const before=e.exportSave();assert.deepEqual(e.route(g.point,g.goal).value,[]);assert.equal(e.restoreSave(JSON.stringify(s)).ok,false);assert.equal(e.exportSave(),before);
});
