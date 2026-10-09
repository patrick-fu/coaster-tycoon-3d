import test from 'node:test';
import assert from 'node:assert/strict';
import {flumePieces} from '../dist/content/log-flume.js';
import {endpoint} from '../dist/simulation/geometry.js';
import {flumeGroundCells} from '../dist/simulation/flume-native.js';
import {flumePortalCells,flumePortalInterface,flumePortalSocket,validateFlumePortal} from '../dist/simulation/flume-portal.js';

function circuit(direction,turn){
 const ride={id:2,anchor:{x:320,y:320,z:32,direction,pitch:0,bank:0},track:[]},elements=new Map();let origin={...ride.anchor};
 for(const piece of ['station','station','lift-start','lift','lift-end',turn,'channel','channel',turn,'drop-start','drop','drop-end','splash','splash',turn,'channel','channel',turn]){
  const track={id:elements.size+1,kind:'track',ride:ride.id,piece,origin:{...origin}};elements.set(track.id,track);ride.track.push(track.id);origin=endpoint(origin,flumePieces[piece]);
 }return{ride,elements};
}
const overlaps=(a,b)=>a.x===b.x&&a.y===b.y&&(a.mask&b.mask)&&a.low<b.high&&b.low<a.high;
const land=()=>({height:16,water:0,owned:true});
const makePortal=(ride,elements,role='entrance',id=100,side)=>({id,kind:'portal',ride:ride.id,role,...flumePortalSocket(ride,elements,role,side)});

for(const turn of ['left','right'])for(let direction=0;direction<4;direction++)for(const offset of [1,3])test(`real ${turn} channel direction${direction} same-side${offset} gates share only their actual bay quarters`,()=>{
 const {ride,elements}=circuit(direction,turn),side=(direction+offset)%4,own=(offset===1?[4,8,1,2]:[2,4,8,1])[direction],previous=(offset===1?[8,1,2,4]:[1,2,4,8])[direction];
 for(const [i,role] of ['entrance','exit'].entries()){
  const portal=makePortal(ride,elements,role,100+i,side),pc=flumePortalCells(portal)[0];assert.equal(portal.station,i+1);assert.equal(pc.mask,15);assert.equal(pc.low,32);assert.equal(pc.high,56);
  validateFlumePortal(portal,ride,elements);let hits=0;
  for(const track of elements.values())if(track.kind==='track')for(const tc of flumeGroundCells(track,land,256))if(overlaps(pc,tc)){
   hits++;assert([i+1,...(role==='exit'?[1]:[])].includes(track.id));assert.equal(pc.mask&tc.mask,track.id===portal.station?own:previous);assert.equal(tc.low,16);
   assert(flumePortalInterface(portal,track,ride,elements,pc,tc));assert(flumePortalInterface(track,portal,ride,elements,tc,pc));
   assert.equal(flumePortalInterface(portal,track,ride,elements,pc,{...tc,mask:own|previous}),false);
  }assert.equal(hits,role==='entrance'?1:2);elements.set(portal.id,portal);
 }
});

test('a gate may be placed during editing, but role sockets and uniqueness remain exact',()=>{
 const {ride,elements}=circuit(0,'right');ride.track=[1];const first=elements.get(1),second=elements.get(2);elements.clear();elements.set(1,first);
 const portal=makePortal(ride,elements);validateFlumePortal(portal,ride,elements);
 for(const changed of [{height:40},{direction:3},{station:2},{ride:3},{tile:{x:10,y:11}},{role:'exit'}])assert.throws(()=>validateFlumePortal({...portal,...changed},ride,elements),e=>e.code==='GEOMETRY');
 elements.set(portal.id,portal);validateFlumePortal(portal,ride,elements);assert.throws(()=>validateFlumePortal({...portal,id:101},ride,elements),e=>e.code==='GEOMETRY');
 assert.throws(()=>makePortal(ride,elements,'exit',102),e=>e.code==='GEOMETRY');ride.track.push(2);elements.set(2,second);
 const exit=makePortal(ride,elements,'exit',102);validateFlumePortal(exit,ride,elements);assert.equal(exit.station,2);
 assert.throws(()=>validateFlumePortal({...exit,tile:{x:11,y:11},direction:3},ride,elements),e=>e.code==='GEOMETRY');
 assert.throws(()=>validateFlumePortal({...exit,station:1},ride,elements),e=>e.code==='GEOMETRY');
 elements.set(2,{...second,origin:{...second.origin,x:384}});assert.throws(()=>validateFlumePortal(exit,ride,elements),e=>e.code==='GEOMETRY');
});

test('portal clearance cannot admit wider quarters, stale stations or foreign elements',()=>{
 const {ride,elements}=circuit(0,'right'),portal=makePortal(ride,elements),station=elements.get(1),pc=flumePortalCells(portal)[0],tc=flumeGroundCells(station,land,256).find(c=>overlaps(pc,c));
 assert(flumePortalInterface(portal,station,ride,elements,pc,tc));
 for(const changed of [{mask:0},{mask:8},{mask:12},{x:11},{low:56},{high:32}])assert.equal(flumePortalInterface(portal,station,ride,elements,pc,{...tc,...changed}),false);
 for(const changed of [{mask:6},{low:31},{high:48},{y:10}])assert.equal(flumePortalInterface(portal,station,ride,elements,{...pc,...changed},tc),false);
 for(const changed of [{height:40},{direction:3},{role:'exit'},{station:2},{ride:3}])assert.equal(flumePortalInterface({...portal,...changed},station,ride,elements,pc,tc),false);
 assert.equal(flumePortalInterface(portal,{...station},ride,elements,pc,tc),false);
 for(const other of [elements.get(2),elements.get(18),{...station,ride:3},{...station,piece:'channel'},{id:9,kind:'path',tile:portal.tile,height:32,queueFor:2},{...portal,id:9}])assert.equal(flumePortalInterface(portal,other,ride,elements,pc,tc),false);
 const later={...portal,station:2,tile:{x:11,y:9}};assert.equal(flumePortalInterface(later,elements.get(2),ride,elements,pc,tc),false);
 assert.equal(flumePortalInterface(portal,station,{...ride,track:[2,1]},elements,pc,tc),false);
 assert.equal(flumePortalInterface(portal,station,{...ride,anchor:{...ride.anchor,z:40}},elements,pc,tc),false);
});
