import test from 'node:test';
import assert from 'node:assert/strict';
import {flumeCandidate,flumePieces} from '../dist/content/log-flume.js';
import {compileFlumeCourse,flumeCourseFrame} from '../dist/simulation/flume-native.js';
import {endpoint} from '../dist/simulation/geometry.js';
import {boatEditable,boatFrame,boatQualified,boatSeatFrames,createBoat,finishBoatUnloading,stepBoat} from '../dist/simulation/boat.js';

function course(direction=0,turn='right'){
 const ride={id:2,anchor:{x:320,y:320,z:32,direction,pitch:0,bank:0},track:[]},elements=new Map();let origin={...ride.anchor};
 for(const piece of ['station','station','lift-start','lift','lift-end',turn,'channel','channel',turn,'drop-start','drop','drop-end','splash','splash',turn,'channel','channel',turn]){
  const item={id:elements.size+1,kind:'track',ride:2,piece,origin:{...origin}};elements.set(item.id,item);ride.track.push(item.id);origin=endpoint(origin,flumePieces[piece]);
 }
 return{ride,elements,course:compileFlumeCourse(ride,elements)};
}
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} differs from ${b}`);
const vector=(a,b)=>{for(const key of ['x','y','z'])near(a[key],b[key]);};
function lap(c,p=flumeCandidate,occupants=[],stopDispatch=false){
 const boat=createBoat(70,2,c),trace=[],mode=occupants.length?'paid':'testing';for(let i=0;i<occupants.length;i++)boat.seats[i]=occupants[i];
 let ticks=0;while(boat.phase!=='unloading'){
  assert(ticks++<6000,'Real circuit did not return to dock.');
  const frame=flumeCourseFrame(c,boat.position),wasRunning=boat.phase==='running';
  stepBoat(boat,c,p,stopDispatch&&wasRunning?null:mode);
  if(boat.stats.ticks)trace.push({piece:frame.piece,speed:boat.speed,docking:boat.docking,position:boat.position});
 }
 return{boat,trace};
}

test('boat entity, ordered hips and reflected asset right use the actual native dock',()=>{
 const c=course().course,b=createBoat(70,2,c);assert.equal(b.id,70);assert.deepEqual(b.seats,[null,null,null,null]);assert(boatEditable(b,c));
 vector(boatFrame(b,c).position,{x:48100,y:42000,z:4600});const seats=boatSeatFrames(b,c);assert.deepEqual(seats.map(s=>s.slot),[0,1,2,3]);
 for(let i=0;i<4;i++){vector(seats[i].position,{x:48100+[1050,350,-350,-1050][i],y:42000,z:5200});vector(seats[i].direction,{x:1,y:0,z:0});vector(seats[i].up,{x:0,y:0,z:1});}
 // Probe canonical model +X; executable receiving profiles retain the literal seat.x=0 contract.
 const probe={...flumeCandidate,seats:flumeCandidate.seats.map(s=>({...s,x:100}))};vector(boatSeatFrames(b,c,probe)[0].position,{x:49150,y:41900,z:5200});
 assert.throws(()=>createBoat(0,2,c),e=>e.code==='INVALID_COMMAND');
});

test('empty/full loading waits80 and partial waits240 from the first occupied tick',()=>{
 const c=course().course,empty=createBoat(70,2,c);for(let i=0;i<300;i++)stepBoat(empty,c,flumeCandidate,null);assert.equal(empty.phase,'loading');assert.equal(empty.wait,0);
 for(const [owners,mode,wait] of [[[],'testing',80],[[11,12,13,14],'paid',80],[[11],'paid',240]]){
  const b=createBoat(70,2,c);for(let i=0;i<owners.length;i++)b.seats[i]=owners[i];for(let i=1;i<wait;i++)stepBoat(b,c,flumeCandidate,mode);
  assert.equal(b.phase,'loading');assert.equal(b.wait,wait-1);assert.equal(b.position,c.dock);stepBoat(b,c,flumeCandidate,mode);assert.equal(b.phase,'running');assert.equal(b.travelled,50);assert.equal(b.stats.ticks,1);assert.equal(b.mode,mode);
 }
 const occupied=createBoat(70,2,c);occupied.seats[0]=11;assert.throws(()=>stepBoat(occupied,c,flumeCandidate,'testing'),e=>e.code==='OPERATING_REQUIREMENTS');
});

for(const turn of ['left','right'])for(let d=0;d<4;d++)test(`real ${turn} circuit direction${d} climbs drops splashes brakes and returns to its exact dock`,t=>{
 const c=course(d,turn).course,{boat,trace}=lap(c),seen=new Set(trace.map(x=>x.piece));
 for(const piece of ['station',turn,'channel','lift-start','lift','lift-end','drop-start','drop','drop-end','splash'])assert(seen.has(piece),`Missing real movement through ${piece}`);
 assert(trace.filter(x=>x.piece==='lift').every(x=>x.speed===25));const peak=Math.max(...trace.map(x=>x.speed));assert(peak>150&&peak<=300);assert(trace.some(x=>x.piece==='splash'&&x.speed===50));
 const docking=trace.filter(x=>x.docking);assert(docking.length>20);for(let i=1;i<docking.length;i++)assert(docking[i].speed<=docking[i-1].speed);assert.equal(docking.at(-2).speed,1);
 assert.equal(boat.position,c.dock);assert.equal(boat.travelled,c.length);assert.equal(boat.stats.distance,c.length);assert.equal(boat.laps,1);assert.equal(boat.phase,'unloading');assert.equal(boat.mode,'testing');assert.equal(boat.speed,0);assert.equal(boat.wait,0);assert(boatQualified(boat,c));assert.deepEqual(boat.measured,{...boat.stats,courseKey:c.key});
 if(d===0&&turn==='right')t.diagnostic(JSON.stringify({courseMm:c.length,dockMm:c.dock,stats:boat.stats,dockingTicks:docking.length,lastMovingSpeed:docking.at(-2).speed}));
});

test('qualification-bound ablation preserves physical travel and failed-test return evidence',()=>{
 const c=course().course,passed=lap(c).boat,failed=lap(c,{...flumeCandidate,maxSpeed:100}).boat;
 assert.deepEqual(failed.stats,passed.stats);assert.equal(failed.position,c.dock);assert.equal(failed.laps,1);assert.equal(failed.phase,'unloading');assert.equal(failed.measured,null);assert(failed.stats.maxSpeed>100);assert(!boatQualified(failed,c));
 for(let i=0;i<80;i++)stepBoat(failed,c,flumeCandidate,null);assert.equal(failed.wait,40);const evidence={...failed.stats};finishBoatUnloading(failed,c);assert.deepEqual(failed.stats,evidence);assert.equal(failed.phase,'loading');assert(!boatQualified(failed,c));
});

test('captured testing mode survives later no-dispatch ticks and its witness is current-course only',()=>{
 const {ride,elements,course:c}=course(),normal=lap(c).boat,closed=lap(c,flumeCandidate,[],true).boat;assert.deepEqual(closed,normal);
 const reordered=new Map([...elements].map(([id,e])=>[id,{...e,origin:{bank:e.origin.bank,pitch:e.origin.pitch,direction:e.origin.direction,z:e.origin.z,y:e.origin.y,x:e.origin.x}}]));assert.equal(compileFlumeCourse(ride,reordered).key,c.key);
 assert(!boatQualified(closed,course(1).course));assert(!boatQualified(closed,course(0,'left').course));
 for(let i=0;i<40;i++)stepBoat(closed,c,flumeCandidate,null);finishBoatUnloading(closed,c);const retained={...closed.measured};closed.seats=[11,12,13,14];while(closed.phase!=='unloading')stepBoat(closed,c,flumeCandidate,'paid');assert.deepEqual(closed.measured,retained);assert.equal(closed.mode,'paid');
});

test('unloading saturates40 and cannot release owner slots or become editable without transfer',()=>{
 const c=course().course,{boat:b}=lap(c,flumeCandidate,[11,null,13,null]);assert.equal(b.measured,null);
 for(let i=0;i<100;i++)stepBoat(b,c,flumeCandidate,null);assert.equal(b.wait,40);assert.deepEqual(b.seats,[11,null,13,null]);assert(!boatEditable(b,c));const retained=JSON.stringify(b);
 assert.throws(()=>finishBoatUnloading(b,c),e=>e.code==='OPERATING_REQUIREMENTS');assert.equal(JSON.stringify(b),retained);
 b.seats.fill(null);finishBoatUnloading(b,c);assert(boatEditable(b,c));assert.equal(b.mode,null);assert.equal(b.docking,false);assert.equal(b.wait,0);assert.equal(b.laps,1);
});

test('final millimetre lap-capacity rejection preserves the entire running state',()=>{
 const c=course().course,b=createBoat(70,2,c);let ticks=0;
 while(b.phase!=='running'||b.travelled!==c.length-1){assert(ticks++<6000);stepBoat(b,c,flumeCandidate,'testing');}
 b.laps=Number.MAX_SAFE_INTEGER;const before=JSON.stringify(b);for(let i=0;i<2;i++){assert.throws(()=>stepBoat(b,c,flumeCandidate,null),e=>e.code==='CAPACITY');assert.equal(JSON.stringify(b),before);}
});

test('fresh testing clears prior witness and opposite running dispatch cannot change captured mode',()=>{
 const c=course().course,{boat:b}=lap(c);for(let i=0;i<40;i++)stepBoat(b,c,flumeCandidate,null);finishBoatUnloading(b,c);
 assert(boatQualified(b,c));stepBoat(b,c,flumeCandidate,'testing');assert.equal(b.wait,1);assert.equal(b.measured,null);while(b.phase==='loading')stepBoat(b,c,flumeCandidate,'testing');
 stepBoat(b,c,flumeCandidate,'paid');assert.equal(b.mode,'testing');while(b.phase==='running')stepBoat(b,c,flumeCandidate,'paid');assert(boatQualified(b,c));
 for(let i=0;i<40;i++)stepBoat(b,c,flumeCandidate,null);finishBoatUnloading(b,c);b.seats=[11,12,13,14];const witness={...b.measured};while(b.phase==='loading')stepBoat(b,c,flumeCandidate,'paid');
 stepBoat(b,c,flumeCandidate,'testing');assert.equal(b.mode,'paid');assert.deepEqual(b.measured,witness);
});
