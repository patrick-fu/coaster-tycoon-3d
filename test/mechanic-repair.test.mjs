import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../dist/simulation/index.js';
import {apply,operatingPark,rules,options,ride,append} from './fixtures.mjs';

const accepted=result=>{assert.equal(result.ok,true,JSON.stringify(result));return result.value;};
function advance(e,ticks){while(ticks){const n=Math.min(ticks,4096);assert.equal(accepted(e.advance(n)),n);ticks-=n;}}
const staff=(e,id)=>accepted(e.inspect('staff',id));
const broken=(e,id)=>e.snapshot().rides.find(r=>r.id===id).broken;
function received(raw,p=rules,o=options){const e=new Engine(o,p);accepted(e.restoreSave(raw));assert.equal(e.exportSave(),raw);return e;}
function healthyInspector(){
 const {engine:e,id}=operatingPark();
 for(const [x,y] of [[10,7],[11,7],[11,8]])apply(e,{type:'place-path',tile:{x,y},height:32,queueFor:null});
 const mechanic=apply(e,{type:'hire-staff',role:'mechanic',point:{x:10,y:7,z:32}}).id;
 advance(e,8191);
 for(let n=0;n<128;n++){
  const s=staff(e,mechanic);
  if(s.job?.kind==='inspection'&&s.work===23){assert.equal(s.completed,0);assert.deepEqual(s.point,s.goal);return{e,id,mechanic};}
  advance(e,1);
 }
 assert.fail('Natural arrived inspection/work23 was not reached within8191+128 ticks.');
}
function cleared(s,prior){
 assert.equal(s.job,null);assert.equal(s.work,0);assert.equal(s.goal,null);assert.equal(s.next,null);assert.equal(s.progress,0);
 assert.equal(s.completed,prior.completed);assert.deepEqual(s.point,prior.point);
}

test('breakdown cancels a natural partial inspection immediately and existing repair completes once after40 ticks',()=>{
 const {e,id,mechanic}=healthyInspector(),checkpoint=e.exportSave(),restored=received(checkpoint),before=staff(e,mechanic);
 const healthyControl=received(checkpoint);advance(healthyControl,1);
 assert.equal(broken(healthyControl,id),false);assert.equal(staff(healthyControl,mechanic).completed,1);
 assert.equal(staff(healthyControl,mechanic).job,null);assert.equal(staff(healthyControl,mechanic).work,0);
 for(const subject of [e,restored]){
  apply(subject,{type:'set-ride-broken',ride:id,broken:true});
  cleared(staff(subject,mechanic),before);assert.equal(broken(subject,id),true);
  const clearedSave=subject.exportSave();assert.equal(received(clearedSave).exportSave(),clearedSave);
 }
 assert.equal(restored.exportSave(),e.exportSave());
 advance(e,1);advance(restored,1);
 assert.deepEqual(staff(e,mechanic).job,{ride:id,kind:'repair'});assert.equal(staff(e,mechanic).work,1);
 assert.equal(staff(e,mechanic).completed,0);assert.equal(broken(e,id),true);
 advance(e,38);advance(restored,17);advance(restored,21);
 assert.equal(staff(e,mechanic).work,39);assert.equal(broken(e,id),true);assert.equal(restored.exportSave(),e.exportSave());
 const partial=e.exportSave(),copy=received(partial);advance(e,1);advance(restored,1);advance(copy,1);
 assert.equal(restored.exportSave(),e.exportSave());assert.equal(copy.exportSave(),e.exportSave());
 const done=e.snapshot();assert.equal(broken(e,id),false);assert.equal(staff(e,mechanic).completed,1);
 assert.equal(done.rides.find(r=>r.id===id).lastInspection,done.tick);assert.equal(staff(e,mechanic).job,null);assert.equal(staff(e,mechanic).work,0);
 advance(e,1);assert.equal(staff(e,mechanic).completed,1);assert.equal(staff(e,mechanic).job,null);
});

test('accepted old inspection+broken receiver cancels at the first staff tick without converting inspection credit',()=>{
 const {e,id,mechanic}=healthyInspector(),s=e.snapshot(),originalStaff=staff(e,mechanic);
 // Exactly one controlled signal on a genuine Engine-produced checkpoint; not natural command recovery.
 s.rides.find(r=>r.id===id).broken=true;
 const raw=JSON.stringify(s),a=received(raw),b=received(raw);
 assert.deepEqual(staff(a,mechanic),originalStaff);assert.equal(broken(a,id),true);
 advance(a,1);const after=staff(a,mechanic);
 assert.deepEqual(after.job,{ride:id,kind:'repair'});assert.equal(after.work,1);assert.equal(after.completed,0);
 assert.deepEqual(after.point,originalStaff.point);assert.equal(broken(a,id),true);
 advance(a,38);assert.equal(staff(a,mechanic).work,39);assert.equal(broken(a,id),true);
 advance(a,1);advance(b,17);advance(b,23);assert.equal(a.exportSave(),b.exportSave());
 assert.equal(broken(a,id),false);assert.equal(staff(a,mechanic).completed,1);
});

test('a genuine later vehicle CAPACITY rolls back an already completed mechanic repair with the entire batch',()=>{
 // Reuse the real force-capacity course/rules from test/motion-regressions.test.mjs.
 const p=structuredClone(rules);Object.assign(p.motion,{tileMetres:1,tickHz:1000,gravity:1,stationSpeed:100000,carLength:1,waitTicks:1});
 const o={...options,side:128,cash:20000},e=new Engine(o,p),large=ride(e);
 for(const piece of ['station','station',...Array(99).fill('flat'),'right','right',...Array(101).fill('flat'),'right','right'])append(e,large,piece);
 for(const [station,role,x] of [[1,'entrance',10],[2,'exit',11]])apply(e,{type:'place-portal',ride:large,station,role,tile:{x,y:9},height:32,direction:1});
 const repairRide=ride(e,{x:5,y:20}),stations=[];
 for(const piece of ['station','station','right','right','flat','flat','right','right']){const section=append(e,repairRide,piece);if(piece==='station')stations.push(section.id);}
 for(const [station,role,x] of [[stations[0],'entrance',5],[stations[1],'exit',6]])apply(e,{type:'place-portal',ride:repairRide,station,role,tile:{x,y:19},height:32,direction:1});
 const approach={x:6,y:18,z:32};apply(e,{type:'place-path',tile:{x:approach.x,y:approach.y},height:32,queueFor:null});
 const mechanic=apply(e,{type:'hire-staff',role:'mechanic',point:approach}).id;
 apply(e,{type:'set-ride-broken',ride:repairRide,broken:true});advance(e,39);
 assert.deepEqual(staff(e,mechanic).job,{ride:repairRide,kind:'repair'});assert.equal(staff(e,mechanic).work,39);
 assert.equal(staff(e,mechanic).completed,0);assert.equal(broken(e,repairRide),true);
 apply(e,{type:'set-ride-status',ride:large,status:'testing'});
 const before=e.exportSave(),revision=e.revision,control=received(before,p,o),quote=accepted(e.quote({type:'set-paused',paused:true}));
 advance(control,1);const successful=control.snapshot();
 assert.equal(broken(control,repairRide),false);assert.equal(staff(control,mechanic).completed,1);assert.equal(staff(control,mechanic).job,null);
 assert.equal(successful.rides.find(r=>r.id===repairRide).lastInspection,successful.tick);
 assert.equal(successful.trains.find(t=>t.ride===large).phase,'running');
 const late=control.advance(1);assert.equal(late.ok,false);assert.equal(late.error.code,'CAPACITY');assert.equal(control.exportSave(),JSON.stringify(successful));
 const failed=e.advance(2);assert.equal(failed.ok,false);assert.equal(failed.error.code,'CAPACITY');
 assert.equal(e.exportSave(),before);assert.equal(e.revision,revision);assert.equal(quote.revision,revision);
 assert.equal(staff(e,mechanic).work,39);assert.equal(staff(e,mechanic).completed,0);assert.equal(broken(e,repairRide),true);
 accepted(e.execute({type:'set-paused',paused:true},quote.revision));
});
