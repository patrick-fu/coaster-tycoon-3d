import type {Connector,Element,Rules,State,Vector} from './types.js';
import type {Course,Measurements} from './motion.js';
import {carPose} from './motion.js';
import {ensure,integer,record} from './validation.js';
import {endpoint} from './geometry.js';
import {resolveContent} from '../content/registry.js';
import {WORKER_PROTOCOL_VERSION} from './protocol.js';
export type ViewRequest={bounds:{x0:number,y0:number,x1:number,y1:number},includeStatic:boolean};
export function validateView(value:unknown,side:number):ViewRequest{
  record(value,['bounds','includeStatic']);record(value.bounds,['x0','y0','x1','y1']);const b=value.bounds;
  ensure(typeof value.includeStatic==='boolean'&&[b.x0,b.y0,b.x1,b.y1].every(n=>integer(n,0,side-1))&&Number(b.x1)>=Number(b.x0)&&Number(b.y1)>=Number(b.y0)&&Number(b.x1)-Number(b.x0)<64&&Number(b.y1)-Number(b.y0)<64,'INVALID_COMMAND','Invalid or oversized view bounds.');return value as ViewRequest;
}
export function project(s:State,rules:Rules,request:ViewRequest,elements:ReadonlyMap<number,Element>,course:(ride:number)=>Course){
  const b=request.bounds,visible=(x:number,y:number)=>x>=b.x0&&x<=b.x1&&y>=b.y0&&y<=b.y1,metres=rules.motion.tileMetres;
  const phases=['walking','queued','riding','stranded','leaving','buying','resting'];
  const people:number[]=[];
  for(const g of s.people.guests){if(g.phase==='riding')continue;const mix=g.next?g.walkProgress/rules.guests.walkTicks:0,x=g.point.x+(g.next?g.next.x-g.point.x:0)*mix,y=g.point.y+(g.next?g.next.y-g.point.y:0)*mix;if(visible(x,y))people.push(g.id,x*metres,y*metres,g.point.z/32*metres,phases.indexOf(g.phase),0);}
  for(const t of s.staff){const mix=t.next?t.progress/rules.services.staffWalkTicks:0,x=t.point.x+(t.next?t.next.x-t.point.x:0)*mix,y=t.point.y+(t.next?t.next.y-t.point.y:0)*mix;if(visible(x,y))people.push(t.id,x*metres,y*metres,t.point.z/32*metres,t.role==='mechanic'?0:1,1);}
  const cars:{id:number,ride:number,position:Vector,direction:Vector,up:Vector,occupants:number}[]=[];
  for(const t of s.trains){const c=course(t.ride);for(let i=0;i<t.carIds.length;i++){const pose=carPose(c,t.position-i*rules.motion.carLength);if(visible(pose.position.x/1000/metres,pose.position.y/1000/metres))cars.push({id:t.carIds[i]!,ride:t.ride,position:{x:pose.position.x/1000,y:pose.position.y/1000,z:pose.position.z/1000},direction:pose.direction,up:pose.up,occupants:t.seats.slice(i*rules.motion.seatsPerCar,(i+1)*rules.motion.seatsPerCar).filter(id=>id!==null).length});}}
  const rides=s.rides.map(r=>{const end=r.track.at(-1),e=end===undefined?undefined:elements.get(end);const tip:Connector=e?.kind==='track'?endpoint(e.origin,rules.pieces[e.piece]!):r.anchor;const t=s.trains.find(t=>t.ride===r.id);return{id:r.id,instanceId:r.instanceId,content:{...r.content},presentation:resolveContent(r.content).capabilities.presentation,name:r.name,status:r.status,cars:r.cars,price:r.price,income:r.income,broken:r.broken,queue:r.queue.length,tip:{...tip},trackCount:r.track.length,measured:t?.measured?{...t.measured}:null,trainPhase:t?.phase??null};});
  let scenery:{elements:Element[],surfaces:number[],truncated:boolean}|null=null;
  if(request.includeStatic){const surfaces:number[]=[];for(let y=b.y0;y<=b.y1;y++)for(let x=b.x0;x<=b.x1;x++){const i=y*256+x;surfaces.push(x,y,s.terrain[i]!,s.water[i]!,s.owned[i]?1:0);}const found=s.elements.filter(e=>{const x=e.kind==='track'?e.origin.x/32:e.tile.x,y=e.kind==='track'?e.origin.y/32:e.tile.y;return visible(x,y);});scenery={elements:structuredClone(found.slice(0,8192)),surfaces,truncated:found.length>8192};}
  return{protocolVersion:WORKER_PROTOCOL_VERSION,contentVersion:s.contentVersion,coordinates:{nativeUnitsPerTile:32,nativeHeightStep:8,nativeLandStep:16,metresPerTile:rules.motion.tileMetres,evidence:'project-candidate' as const},revision:`${s.revision}:${s.tick}`,worldRevision:s.revision,topologyRevision:s.topologyRevision,tick:s.tick,paused:s.paused,parkOpen:s.people.open,cash:s.cash,loan:s.loan,maxLoan:s.maxLoan,side:s.side,entry:s.people.entry?{...s.people.entry}:null,ledger:{...s.ledger},counts:{guests:s.people.guests.length,staff:s.staff.length,litter:s.litter.length,cars:s.trains.reduce((n,t)=>n+t.carIds.length,0)},people:new Float64Array(people),cars,rides,staff:s.staff.map(t=>({id:t.id,role:t.role,work:t.job?.kind??t.cleanup?.kind??null,completed:t.completed})),facilities:s.facilities.map(f=>({...f,content:{...f.content},presentation:resolveContent(f.content).capabilities.presentation})),amenities:s.amenities.map(a=>({...a})),litter:new Float64Array(s.litter.filter(l=>visible(l.point.x,l.point.y)).flatMap(l=>[l.id,l.point.x*metres,l.point.y*metres,l.point.z/32*metres])),scenery};
}
