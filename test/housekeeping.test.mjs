import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../dist/simulation/index.js';
import {apply,create,rules,options} from './fixtures.mjs';
function tick(e,n){while(n>0){const count=Math.min(n,4096),r=e.advance(count);assert(r.ok,JSON.stringify(r));n-=count;}}
function service({bin=false,energy=1000,wrapperTicks=20}={}){
 const p=structuredClone(rules);p.guests.spawnTicks=200;p.guests.decisionTicks=1;p.guests.walkTicks=2;p.guests.needGrowth=0;p.guests.initialHunger=900;p.guests.initialThirst=0;p.guests.initialEnergy=energy;p.services.initialBladder=0;p.services.serviceTicks=10;p.housekeeping.wrapperTicks=wrapperTicks;p.housekeeping.binCapacity=1;
 const e=new Engine(options,p),paths=[10,11].map(x=>apply(e,{type:'place-path',tile:{x,y:10},height:32,queueFor:null}).id);
 const f=apply(e,{type:'place-facility',name:'Food',kind:'food',tile:{x:10,y:9},height:32,direction:1}).id;apply(e,{type:'set-facility-open',facility:f,open:true});const binID=bin?apply(e,{type:'place-amenity',kind:'bin',path:paths[1]}).id:null;
 apply(e,{type:'set-park-entrance',point:{x:10,y:10,z:32}});apply(e,{type:'set-park-open',open:true});tick(e,200);apply(e,{type:'set-park-open',open:false});return{e,p,paths,binID};
}
function lowEnergy(){
 const p=structuredClone(rules);p.guests.spawnTicks=200;p.guests.decisionTicks=1;p.guests.walkTicks=2;p.guests.needGrowth=0;p.guests.initialEnergy=100;p.housekeeping.restTicks=40;
 const e=new Engine(options,p),path=apply(e,{type:'place-path',tile:{x:10,y:10},height:32,queueFor:null}).id,bench=apply(e,{type:'place-amenity',kind:'bench',path}).id;
 apply(e,{type:'set-park-entrance',point:{x:10,y:10,z:32}});apply(e,{type:'set-park-open',open:true});tick(e,200);apply(e,{type:'set-park-open',open:false});tick(e,1);return{e,p,path,bench};
}

test('a reachable bin receives an actual purchased wrapper without allocating ground litter',()=>{
 const {e,binID}=service({bin:true});tick(e,16);const s=e.snapshot();assert.equal(s.people.guests[0].spent,10);assert.equal(s.people.guests[0].wrapper,false);assert.equal(s.amenities.find(a=>a.id===binID).fill,1);assert.equal(s.litter.length,0);assert(e.restoreSave(e.exportSave()).ok);
});
test('no available bin produces persistent ground litter with a unique shared entity identity',()=>{
 const {e}=service();tick(e,32);const s=e.snapshot();assert.equal(s.litter.length,1);assert.equal(s.people.guests[0].wrapper,false);assert.notEqual(s.litter[0].id,s.people.guests[0].id);assert.equal(s.nextEntity,3);assert.equal(s.litter[0].point.x,10);assert(e.restoreSave(e.exportSave()).ok);
});
test('a full bin remains full and a subsequent wrapper becomes ground litter',()=>{
 const {e,binID}=service({bin:true});tick(e,16);const s=e.snapshot();s.people.guests[0].hunger=900;assert(e.restoreSave(JSON.stringify(s)).ok);tick(e,40);const after=e.snapshot();assert.equal(after.amenities.find(a=>a.id===binID).fill,1);assert.equal(after.people.guests[0].spent,20);assert.equal(after.litter.length,1);assert(e.restoreSave(e.exportSave()).ok);
});
test('a handyman needs patrol access and work duration to remove a litter entity',()=>{
 const {e}=service();tick(e,32);const staff=apply(e,{type:'hire-staff',role:'handyman',point:{x:11,y:10,z:32}}).id;apply(e,{type:'set-staff-patrol',staff,tiles:[{x:11,y:10}]});tick(e,40);assert.equal(e.snapshot().litter.length,1);assert.equal(e.snapshot().staff[0].cleanup,null);
 apply(e,{type:'set-staff-patrol',staff,tiles:[{x:10,y:10},{x:11,y:10}]});tick(e,31);assert.equal(e.snapshot().litter.length,1);tick(e,1);const s=e.snapshot();assert.equal(s.litter.length,0);assert.equal(s.staff[0].completed,1);assert(e.restoreSave(e.exportSave()).ok);
});
test('a handyman empties a used bin after arrival and actual cleanup work',()=>{
 const {e,binID}=service({bin:true});tick(e,16);apply(e,{type:'hire-staff',role:'handyman',point:{x:11,y:10,z:32}});tick(e,23);assert.equal(e.snapshot().amenities.find(a=>a.id===binID).fill,1);tick(e,1);assert.equal(e.snapshot().amenities.find(a=>a.id===binID).fill,0);assert.equal(e.snapshot().staff[0].completed,1);assert(e.restoreSave(e.exportSave()).ok);
});
test('bench occupation is exclusive and timed rest restores energy and reduces nausea',()=>{
 const {e,bench}=lowEnergy();let s=e.snapshot();assert.equal(s.people.guests[0].phase,'resting');assert.equal(s.amenities.find(a=>a.id===bench).occupant,s.people.guests[0].id);s.people.guests[0].nausea=800;assert(e.restoreSave(JSON.stringify(s)).ok);tick(e,39);assert.equal(e.snapshot().people.guests[0].energy,100);tick(e,1);s=e.snapshot();assert.equal(s.people.guests[0].energy,600);assert.equal(s.people.guests[0].nausea,300);assert.equal(s.people.guests[0].phase,'walking');assert.equal(s.amenities[0].occupant,null);assert(e.restoreSave(e.exportSave()).ok);
});
test('removing an occupied bench releases its guest and attached amenities protect path deletion',()=>{
 const {e,path,bench}=lowEnergy();const before=e.exportSave();assert.equal(e.quote({type:'remove-path',id:path}).error.code,'OPERATING_REQUIREMENTS');assert.equal(e.exportSave(),before);apply(e,{type:'remove-amenity',id:bench});assert.equal(e.snapshot().people.guests[0].phase,'walking');assert.equal(e.snapshot().people.guests[0].amenity,null);assert(e.restoreSave(e.exportSave()).ok);apply(e,{type:'remove-path',id:path});assert.equal(e.snapshot().people.guests[0].phase,'stranded');assert(e.restoreSave(e.exportSave()).ok);
});
test('removed bin jobs release their cleaner immediately and a disconnected litter job cannot finish',()=>{
 const {e,binID}=service({bin:true});tick(e,16);apply(e,{type:'hire-staff',role:'handyman',point:{x:10,y:10,z:32}});tick(e,4);assert(e.snapshot().staff[0].cleanup);apply(e,{type:'remove-amenity',id:binID});assert.equal(e.snapshot().staff[0].cleanup,null);assert(e.restoreSave(e.exportSave()).ok);
 const {e:park,paths}=service();tick(park,32);apply(park,{type:'hire-staff',role:'handyman',point:{x:11,y:10,z:32}});tick(park,4);apply(park,{type:'remove-path',id:paths[0]});tick(park,40);assert.equal(park.snapshot().litter.length,1);assert.equal(park.snapshot().staff[0].completed,0);assert(park.restoreSave(park.exportSave()).ok);
});
test('partial bench and cleanup work continue identically through saves and different tick batches',()=>{
 for(const variant of ['bench','cleanup']){const {e,p}=variant==='bench'?lowEnergy():service();if(variant==='cleanup'){tick(e,32);apply(e,{type:'hire-staff',role:'handyman',point:{x:11,y:10,z:32}});}tick(e,4);const restored=new Engine(options,p);assert(restored.restoreSave(e.exportSave()).ok);tick(e,100);tick(restored,17);tick(restored,83);assert.equal(restored.exportSave(),e.exportSave());}
});
test('malformed bench occupancy, litter IDs and cleanup work cannot replace the current park',()=>{
 const {e}=lowEnergy(),before=e.exportSave();for(const mutate of [s=>s.amenities[0].occupant=999,s=>s.people.guests[0].amenity=null,s=>s.amenities[0].fill=1,s=>s.litter=[{id:s.people.guests[0].id,point:{x:10,y:10,z:32}}]]){const s=JSON.parse(before);mutate(s);assert.equal(e.restoreSave(JSON.stringify(s)).ok,false);assert.equal(e.exportSave(),before);}
 const {e:park}=service();tick(park,32);apply(park,{type:'hire-staff',role:'handyman',point:{x:11,y:10,z:32}});tick(park,1);const original=park.exportSave(),bad=JSON.parse(original);bad.staff[0].work=1;assert.equal(park.restoreSave(JSON.stringify(bad)).ok,false);assert.equal(park.exportSave(),original);
});
test('litter consumes the shared entity pool and a full registry retains the wrapper without losing it',()=>{
 const {e}=service();tick(e,12);const s=e.snapshot(),g=s.people.guests[0];assert(g.wrapper);s.litter=Array.from({length:9999},(_,i)=>({id:i+2,point:{x:10,y:10,z:32}}));s.nextEntity=10001;assert(e.restoreSave(JSON.stringify(s)).ok);tick(e,20);const after=e.snapshot();assert.equal(after.litter.length,9999);assert.equal(after.people.guests[0].wrapper,true);assert.equal(after.nextEntity,10001);assert.equal(e.quote({type:'hire-staff',role:'handyman',point:{x:10,y:10,z:32}}).error.code,'CAPACITY');assert(e.restoreSave(e.exportSave()).ok);
});
test('walking amenity imports cannot substitute a missing goal to use a remote bench',()=>{
 const {e,p}=lowEnergy();const s=e.snapshot(),g=s.people.guests[0];g.phase='walking';g.restProgress=0;g.goal=null;s.amenities[0].occupant=null;const before=e.exportSave();assert.equal(e.restoreSave(JSON.stringify(s)).ok,false);assert.equal(e.exportSave(),before);
});
test('200 full-map patrols remain compact enough for a legal park to export and import',()=>{
 const e=create({side:256});apply(e,{type:'place-path',tile:{x:10,y:10},height:32,queueFor:null});for(let i=0;i<200;i++)apply(e,{type:'hire-staff',role:'handyman',point:{x:10,y:10,z:32}});
 const s=e.snapshot(),words=Array(2048).fill(0);for(let y=1;y<255;y++)for(let x=1;x<255;x++){const bit=y*256+x;words[bit>>>5]=(words[bit>>>5]|(1<<(bit&31)))>>>0;}for(const t of s.staff)t.patrol=[...words];assert(e.restoreSave(JSON.stringify(s)).ok);const exported=e.exportSave();assert(exported.length<8*1024*1024);assert(e.restoreSave(exported).ok);
});
