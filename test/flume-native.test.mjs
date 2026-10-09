import test from 'node:test';
import assert from 'node:assert/strict';
import {flumeLocalFrame,flumePieces} from '../dist/content/log-flume.js';
import {compileFlumeCourse,flumeCells,flumeCourseFrame,flumeFrame,flumeGroundCells,flumeInterface} from '../dist/simulation/flume-native.js';
import {endpoint} from '../dist/simulation/geometry.js';

const track=(piece,direction=0,z=32,id=1)=>({id,kind:'track',ride:2,piece,origin:{x:320,y:320,z,direction,pitch:piece==='lift'||piece==='lift-end'?1:piece==='drop'||piece==='drop-end'?-1:0,bank:0}});
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} differs from ${b}`);
const vector=(a,b)=>{for(const key of ['x','y','z'])near(a[key],b[key]);};
const circuit=(direction=0,turn='right')=>{
 const ride={id:2,anchor:{x:320,y:320,z:32,direction,pitch:0,bank:0},track:[]},elements=new Map();let origin={...ride.anchor};
 for(const piece of ['station','station','lift-start','lift','lift-end',turn,'channel','channel',turn,'drop-start','drop','drop-end','splash','splash',turn,'channel','channel',turn]){
  const item={...track(piece,direction,32,elements.size+1),origin:{...origin}};elements.set(item.id,item);ride.track.push(item.id);origin=endpoint(origin,flumePieces[piece]);
 }
 return{ride,elements};
};

test('R8 channel turns preserve the fixed world half-tile offset and native handedness',()=>{
 const left=flumeFrame(track('left'),.5);vector(left.position,{x:(336+64/Math.sqrt(2))*125,y:(336-64*(1-1/Math.sqrt(2)))*125,z:4000});vector(left.direction,{x:Math.SQRT1_2,y:-Math.SQRT1_2,z:0});vector(left.up,{x:0,y:0,z:1});
 const expected=[[384,256,3],[384,384,0],[256,384,1],[256,256,2]];
 for(let d=0;d<4;d++){const e=endpoint(track('left',d).origin,flumePieces.left);assert.deepEqual([e.x,e.y,e.direction],expected[d]);}
 assert.throws(()=>flumeLocalFrame('channel',1.1),e=>e.code==='GEOMETRY');
});

test('lift and drop transitions join at the specified half-unit slope without bank',()=>{
 for(const [prefix,sign] of [['lift',1],['drop',-1]]){
  const start=flumeLocalFrame(prefix+'-start',1),core=flumeLocalFrame(prefix,0),end=flumeLocalFrame(prefix+'-end',0);
  near(start.point.z,sign*8);near(start.direction.z/start.direction.x,sign*.5);vector(start.direction,core.direction);vector(core.direction,end.direction);near(flumeLocalFrame(prefix+'-end',1).direction.z,0);
 }
});

for(const turn of ['left','right'])for(let d=0;d<4;d++)test(`complete ${turn} channel orientation ${d} has a real 8m dock and continuous closed frames`,()=>{
 const {ride,elements}=circuit(d,turn),course=compileFlumeCourse(ride,elements);assert.equal(course.stationEnd,8000);assert.equal(course.dock,6100);
 // Eight 4m flats, four R8 quarter turns and paired rise/drop transitions total about 107.85m before per-span rounding.
 assert(Math.abs(course.length-107853)<200);
 const first=elements.get(1),last=elements.get(ride.track.at(-1));vector(flumeCourseFrame(course,0).position,flumeFrame(last,1).position);vector(flumeCourseFrame(course,course.length).position,flumeFrame(first,0).position);
 for(let i=1;i<ride.track.length;i++){const a=flumeFrame(elements.get(ride.track[i-1]),1),b=flumeFrame(elements.get(ride.track[i]),0);vector(a.position,b.position);vector(a.direction,b.direction);vector(a.up,b.up);}
 for(const span of course.spans){const a=flumeCourseFrame(course,span.begin-1e-6),b=flumeCourseFrame(course,span.begin+1e-6);assert(Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y,a.position.z-b.position.z)<1e-5);for(const axis of ['direction','up'])assert(Math.hypot(a[axis].x-b[axis].x,a[axis].y-b[axis].y,a[axis].z-b[axis].z)<1e-6);}
 if(d===0)vector(flumeCourseFrame(course,course.dock).position,{x:48100,y:42000,z:4000});
 const broken={...ride,track:ride.track.slice(0,-1)};assert.throws(()=>compileFlumeCourse(broken,elements),e=>e.code==='OPERATING_REQUIREMENTS');
});

test('quarter reservations cover between-sample channel and station cross sections in every native direction',()=>{
 const mod=n=>(n%2+2)%2;
 for(const piece of Object.keys(flumePieces))for(let d=0;d<4;d++){
  const item=track(piece,d,64),cells=flumeCells(item),half=piece==='station'?2200:1200;
  for(const t of [.003,.137,.503,.913,.997]){
   const f=flumeFrame(item,t),right={x:f.direction.y,y:-f.direction.x},size=Math.hypot(right.x,right.y);
   for(const lateral of [-half*.999,0,half*.999])for(const height of [1,2999]){
    const p={x:(f.position.x+right.x/size*lateral+f.up.x*height)/125,y:(f.position.y+right.y/size*lateral+f.up.y*height)/125,z:(f.position.z+f.up.z*height)/125},qx=Math.floor(p.x/16),qy=Math.floor(p.y/16),mask=1<<[[0,1],[3,2]][mod(qy)][mod(qx)];
    assert(cells.some(c=>c.x===Math.floor(qx/2)&&c.y===Math.floor(qy/2)&&(c.mask&mask)&&c.low<=p.z&&c.high>=p.z),`${piece}/${d}/${t} misses actual cross-section point`);
   }
  }
 }
});

test('support limit checks the highest channel base before expanding columns to terrain',()=>{
 const land=()=>({height:16,water:0,owned:true}),flat=flumeGroundCells(track('channel',0,64),land,256);assert(flat.every(c=>c.low===16));assert.throws(()=>flumeGroundCells(track('lift-start',0,64),land,256),e=>e.code==='SUPPORT');
 assert.throws(()=>flumeGroundCells(track('channel'),()=>({height:16,water:32,owned:true}),256),e=>e.code==='CLEARANCE');assert.throws(()=>flumeGroundCells(track('channel'),()=>({height:16,water:0,owned:false}),256),e=>e.code==='NOT_OWNED');
});

for(let d=0;d<4;d++)test(`same-ride orientation ${d} clearance permission is limited to a verified local connected seam`,()=>{
 const a=track('lift-start',d),b={...track('lift',d,32,2),origin:endpoint(a.origin,flumePieces['lift-start'])},ride={id:2,anchor:a.origin,track:[1,2]},elements=new Map([[1,a],[2,b]]);let overlaps=0;
 for(const ca of flumeCells(a))for(const cb of flumeCells(b))if(ca.x===cb.x&&ca.y===cb.y&&(ca.mask&cb.mask)){overlaps++;assert(flumeInterface(a,b,ride,elements,ca,cb));assert(flumeInterface(b,a,ride,elements,cb,ca));}
 assert(overlaps>0);
 const wrong={...b,origin:{...a.origin}},bad=new Map([[1,a],[2,wrong]]),ca=flumeCells(a)[0];assert.equal(flumeInterface(a,wrong,ride,bad,ca,ca),false);
 const distant={...ca,x:ca.x+20};assert.equal(flumeInterface(a,b,ride,elements,distant,distant),false);assert.equal(flumeInterface(a,{...b,ride:9},ride,elements,ca,ca),false);
 const nonadjacent={...ride,track:[1,99,2,98]};assert.equal(flumeInterface(a,b,nonadjacent,elements,ca,ca),false);
 for(const turn of ['left','right']){const closed=circuit(d,turn),first=closed.elements.get(1),last=closed.elements.get(closed.ride.track.at(-1));assert.deepEqual(endpoint(last.origin,flumePieces[last.piece]),first.origin);let shared=0;for(const x of flumeCells(first))for(const y of flumeCells(last))if(x.x===y.x&&x.y===y.y&&(x.mask&y.mask))shared++;assert.equal(shared,0);}
});
