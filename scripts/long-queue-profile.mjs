import {Engine} from '../dist/simulation/index.js';
import {rules,options,apply} from '../test/fixtures.mjs';
import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const result=[];
for(const count of [400,1600]){
 const p=structuredClone(rules);p.guests.walkTicks=1000000;p.guests.queueSlotsPerTile=64;p.guests.patienceTicks=1000000;p.motion.waitTicks=100000;
 const e=new Engine({...options,side:64,cash:100000},p),id=apply(e,{type:'create-ride',name:'Long queue',tile:{x:10,y:10},height:32,direction:0}).id,stations=[];
 for(const name of [...Array(8).fill('station'),'right','right',...Array(8).fill('flat'),'right','right']){const piece=apply(e,{type:'append-track',ride:id,piece:name});if(name==='station')stations.push(piece.id);}
 for(const [station,role,x] of [[stations[0],'entrance',10],[stations[7],'exit',17]])apply(e,{type:'place-portal',ride:id,station,role,tile:{x,y:9},height:32,direction:1});
 const queue=[...Array.from({length:8},(_,i)=>({x:10,y:8-i})),...Array.from({length:26},(_,i)=>({x:11+i,y:1}))];for(const tile of queue)apply(e,{type:'place-path',tile,height:32,queueFor:id});
 for(const [x,y] of [...Array.from({length:20},(_,i)=>[17+i,8]),...Array.from({length:6},(_,i)=>[36,7-i])])apply(e,{type:'place-path',tile:{x,y},height:32,queueFor:null});
 apply(e,{type:'set-park-entrance',point:{x:36,y:2,z:32}});apply(e,{type:'set-ride-status',ride:id,status:'open'});apply(e,{type:'set-park-open',open:true});assert(e.advance(40).ok);apply(e,{type:'set-park-open',open:false});const s=e.snapshot(),g=s.people.guests[0],train=s.trains[0],entrance=s.elements.find(e=>e.kind==='portal'&&e.role==='entrance'),exit=s.elements.find(e=>e.kind==='portal'&&e.role==='exit');train.laps=1;train.measured={ticks:20,distance:train.stats.distance=0,maxSpeed:100,minVerticalG:1000,maxVerticalG:1000,maxLateralG:1000};
 // A complete prior measurement is acquired from the independently legal course.
 const {compileCourse}=await import('../dist/simulation/motion.js');train.measured.distance=compileCourse(s.rides[0],new Map(s.elements.map(e=>[e.id,e])),p,p.motion).length;
 s.people.guests=Array.from({length:count},(_,i)=>({...structuredClone(g),id:i+2,phase:'queued',point:{...queue[Math.min(queue.length-1,Math.floor(i/64))],z:32},destination:id,entrance:entrance.id,exit:exit.id,queueRide:id,queuedAt:s.tick,goal:null,next:null,walkProgress:0}));s.rides[0].queue=s.people.guests.map(g=>g.id);s.nextEntity=count+2;const fixture=JSON.stringify(s),loaded=e.restoreSave(fixture);if(!loaded.ok)throw new Error(loaded.error.message);
 const times=[];for(let i=0;i<200;i++){const start=performance.now(),r=e.advance(1);if(!r.ok)throw new Error(r.error.message);times.push(performance.now()-start);}times.sort((a,b)=>a-b);result.push({queueGuests:count,queueTiles:queue.length,hash:createHash('sha256').update(fixture).digest('hex'),p50:times[100],p95:times[190],max:times[199]});console.log(JSON.stringify(result.at(-1)));
}
await writeFile('../evidence/long-queue-profile.json',JSON.stringify(result,null,2));
function assert(value){if(!value)throw new Error('Fixture preparation failed');}
