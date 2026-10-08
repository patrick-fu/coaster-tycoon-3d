import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {woodenTrainPoses,qualifyWoodenCourse} from '../dist/simulation/wooden-motion.js';
import {compileCourse} from '../dist/simulation/motion.js';
import {endpoint} from '../dist/simulation/geometry.js';
import {woodenPieces} from '../dist/content/wooden-coaster.js';

const frozen=JSON.parse(gunzipSync(readFileSync(new URL('../docs/experiments/wooden-hitch/frozen-poses.json.gz',import.meta.url))));
const profile={motion:{carLength:2880},vehicle:{originMm:{x:2000,y:2000,z:500},wheelbaseMm:1500,bogiePivotHeightMm:170,couplerHalfSpanMm:1340,couplerHeightMm:220,drawbarLengthMm:200}};
const fromGL=(p,mm=true)=>({x:p[0]*(mm?1000:1),y:p[2]*(mm?1000:1),z:p[1]*(mm?1000:1)});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

function course(source){
 const points=source.points.map(p=>{const v=fromGL(p);return{x:v.x-2000,y:v.y-2000,z:v.z-500};});
 return{length:source.lengthMm,stationLength:8000,stationEnd:8000,segments:source.roundedChords.map((chord,i)=>{
  const start=points[i],end=points[i+1],size=distance(start,end);
  return{begin:chord.beginMm,length:chord.lengthMm,point:start,tangent:{x:(end.x-start.x)/size,y:(end.y-start.y)/size,z:0},normal:{x:0,y:0,z:1},curvature:{x:0,y:0,z:0},station:i<32,chain:false,brake:null};
 })};
}

test('worker-derived wooden bodies and links agree with the independently frozen flat articulation poses',()=>{
 for(const c of frozen.cases){
  const source=frozen.sampling.courses.find(s=>c.id.startsWith(s.turn))??frozen.sampling.courses[0];
  const actual=woodenTrainPoses({position:c.lead.frontContactCourseMm-750,carIds:[1,2]},course(source),profile);
  for(const [index,expected] of [[0,c.lead],[1,c.following]]){
   assert(distance(actual[index].body.position,fromGL(expected.root))<.01,`${c.id}: car ${index} body datum`);
   assert(distance(actual[index].body.direction,fromGL(expected.forward,false))<1e-5,`${c.id}: car ${index} orientation`);
  }
  const link=actual[1].link;assert(link);
  assert(distance(link.position,fromGL(c.joint.linkFrame.slice(12,15)))<.01,`${c.id}: link centre`);
 }
});

test('rounded curve clocks do not create wooden body jumps at internal chord joins',()=>{
 const source=frozen.sampling.courses[0],track=course(source);
 for(const chord of source.roundedChords.slice(1,-1)){
  if(chord.beginMm<5000||chord.beginMm>track.length-1000)continue;
  const before=woodenTrainPoses({position:chord.beginMm-750-.00001,carIds:[1,2]},track,profile);
  const after=woodenTrainPoses({position:chord.beginMm-750+.00001,carIds:[1,2]},track,profile);
  for(let i=0;i<2;i++)assert(distance(before[i].body.position,after[i].body.position)<.001,`join ${chord.beginMm}: car ${i}`);
 }
});

function closedCourse(pieces){
 const elements=new Map(),anchor={x:640,y:640,z:32,direction:0,pitch:0,bank:0};let origin=anchor;
 for(const piece of pieces){const id=elements.size+1;elements.set(id,{id,kind:'track',ride:0,piece,origin});origin=endpoint(origin,woodenPieces[piece]);}
 assert.deepEqual(origin,anchor);const ride={track:[...elements.keys()],cars:2};
 return{ride,track:compileCourse(ride,elements,{pieces:woodenPieces},{tileMetres:4,bankDegrees:0})};
}

test('a wooden train qualifies closed four-turn loops and rejects a closed mixed-direction six-turn route',()=>{
 const normal=closedCourse(['station','station','flat','flat',...Array.from({length:3},()=>['right','flat','flat','flat','flat']).flat(),'right']);
 qualifyWoodenCourse(normal.ride,normal.track,profile);
 const left=closedCourse(['station','station','flat','flat',...Array.from({length:3},()=>['left','flat','flat','flat','flat']).flat(),'left']);
 qualifyWoodenCourse(left.ride,left.track,profile);
 const mixed=closedCourse(['station','station',...Array(18).fill('flat'),'right',...Array(6).fill('flat'),'right',...Array(6).fill('flat'),'left',...Array(6).fill('flat'),'right',...Array(6).fill('flat'),'right',...Array(20).fill('flat'),'right']);
 assert.throws(()=>qualifyWoodenCourse(mixed.ride,mixed.track,profile),error=>error.code==='OPERATING_REQUIREMENTS'&&error.message.includes('reverse its curve direction'));
});
