import test from 'node:test';
import assert from 'node:assert/strict';
import {apply,append,create,ride} from './fixtures.mjs';

function platform(){
 const e=create(),id=ride(e);
 for(const piece of ['station','station','right','right','flat','flat','right','right'])append(e,id,piece);
 return{e,id};
}
const portal=(e,id,station,role,x)=>apply(e,{type:'place-portal',ride:id,station,role,tile:{x,y:9},height:32,direction:1});
function ready(){const {e,id}=platform();const entrance=portal(e,id,1,'entrance',10),exit=portal(e,id,2,'exit',11);return{e,id,entrance,exit};}
const path=(e,x,y,queueFor=null)=>apply(e,{type:'place-path',tile:{x,y},height:32,queueFor});
const denied=(e,c,code)=>{const before=e.exportSave(),q=e.quote(c);assert.equal(q.ok,false);assert.equal(q.error.code,code);assert.equal(e.exportSave(),before);assert.equal(e.execute(c,e.revision).error.code,code);assert.equal(e.exportSave(),before);};

test('testing and opening require a circuit, station and entrance/exit without charging rejected commands',()=>{
 const e=create(),id=ride(e);denied(e,{type:'set-ride-status',ride:id,status:'testing'},'OPERATING_REQUIREMENTS');
 append(e,id,'station');portal(e,id,1,'entrance',10);denied(e,{type:'set-ride-status',ride:id,status:'open'},'OPERATING_REQUIREMENTS');
 const p=ready();assert.equal(p.e.operating(p.id).value.issues.length,0);assert.deepEqual(p.e.operating(p.id).value.stations,[{id:1,track:[1,2]}]);apply(p.e,{type:'set-ride-status',ride:p.id,status:'testing'});assert.equal(p.e.snapshot().rides[0].status,'testing');
});
test('portal height, station side, occupancy and duplicate station roles are authoritative',()=>{
 const {e,id}=platform();
 denied(e,{type:'place-portal',ride:id,station:1,role:'entrance',tile:{x:10,y:9},height:16,direction:1},'GEOMETRY');
 denied(e,{type:'place-portal',ride:id,station:1,role:'entrance',tile:{x:9,y:10},height:32,direction:0},'GEOMETRY');
 const c={type:'place-portal',ride:id,station:1,role:'entrance',tile:{x:10,y:9},height:32,direction:1};const q=e.quote(c);assert.equal(q.value.cost,50);const receipt=e.execute(c,q.value.revision);assert(receipt.ok);
 denied(e,{...c,station:2,tile:{x:11,y:9}},'GEOMETRY');denied(e,{...c,role:'exit'},'CLEARANCE');
});
test('active rides reject geometry edits, and station removal cannot strand a portal',()=>{
 const {e,id,exit}=ready();apply(e,{type:'set-ride-status',ride:id,status:'open'});
 denied(e,{type:'remove-last-track',ride:id},'RIDE_ACTIVE');denied(e,{type:'remove-portal',id:exit.id},'RIDE_ACTIVE');
 apply(e,{type:'set-ride-status',ride:id,status:'closed'});for(let i=0;i<6;i++)apply(e,{type:'remove-last-track',ride:id});
 denied(e,{type:'remove-last-track',ride:id},'OPERATING_REQUIREMENTS');apply(e,{type:'remove-portal',id:exit.id});assert.equal(apply(e,{type:'remove-last-track',ride:id}).cost,-50);
});
test('operating legality and reachable guest access remain distinct; path edits change access immediately',()=>{
 const {e,id,entrance,exit}=ready(),from={x:10,y:7,z:32};
 apply(e,{type:'set-ride-status',ride:id,status:'open'});assert.deepEqual(e.access(id,from).value,{entrances:[],exits:[]});
 path(e,10,7);const queue=path(e,10,8,id);path(e,11,7);path(e,11,8);
 assert.deepEqual(e.access(id,from).value,{entrances:[entrance.id],exits:[exit.id]});assert.deepEqual(e.access(id,{x:10,y:8,z:32}).value,{entrances:[],exits:[]});
 apply(e,{type:'remove-path',id:queue.id});assert.deepEqual(e.access(id,from).value,{entrances:[],exits:[exit.id]});assert.equal(e.snapshot().rides[0].status,'open');
 const foreign=ride(e);path(e,10,8,foreign);assert.deepEqual(e.access(id,from).value,{entrances:[],exits:[exit.id]});
});
test('portals refund the explicit profile fraction and preserve continuation and import integrity',()=>{
 const {e,id,entrance}=ready(),other=create();apply(e,{type:'set-ride-status',ride:id,status:'testing'});
 assert(other.restoreSave(e.exportSave()).ok);assert.deepEqual(other.snapshot(),e.snapshot());
 const before=e.exportSave();for(const mutate of [s=>s.elements.find(v=>v.kind==='portal').station=3,s=>s.elements.find(v=>v.kind==='portal').direction=0,s=>s.elements.find(v=>v.kind==='portal').role='unknown',s=>s.elements=s.elements.filter(v=>v.kind!=='portal')]){const s=e.snapshot();mutate(s);assert.equal(e.restoreSave(JSON.stringify(s)).ok,false);assert.equal(e.exportSave(),before);}
 for(const world of [e,other]){apply(world,{type:'set-ride-status',ride:id,status:'closed'});assert.equal(apply(world,{type:'remove-portal',id:entrance.id}).cost,-25);}
 assert.equal(e.exportSave(),other.exportSave());
});

test('closing a circuit cannot merge station groups with duplicate portal roles',()=>{
 const e=create(),id=ride(e);for(const piece of ['station','right','right','flat','flat','flat','right','right','station'])append(e,id,piece);
 portal(e,id,1,'entrance',10);portal(e,id,9,'entrance',8);
 denied(e,{type:'append-track',ride:id,piece:'station'},'GEOMETRY');assert(e.restoreSave(e.exportSave()).ok);
});
