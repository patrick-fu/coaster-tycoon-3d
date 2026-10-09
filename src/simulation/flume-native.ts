import type {Cell,Connector,Element,Track,Vector} from './types.js';
import {endpoint,same,turn} from './geometry.js';
import {ensure,integer} from './validation.js';
import {flumeCandidate,flumeLocalFrame,flumePieces,type FlumePieceId} from '../content/log-flume.js';

type CourseRide={id:number,anchor:Connector,track:number[]};
type Span={begin:number,length:number,track:Track,piece:FlumePieceId,t0:number,t1:number};
export type FlumeCourse={spans:Span[],length:number,stationEnd:number,dock:number,key:string};
const mod=(n:number,d:number)=>(n%d+d)%d;
const width=(piece:string)=>(piece==='station'?flumeCandidate.stationWidthMm:flumeCandidate.outerWidthMm)/250;

export function flumeFrame(track:Track,t:number){
 const local=flumeLocalFrame(track.piece as FlumePieceId,t),point=turn(local.point.x,local.point.y,track.origin.direction),direction=turn(local.direction.x,local.direction.y,track.origin.direction),up=turn(local.up.x,local.up.y,track.origin.direction);
 return{position:{x:(track.origin.x+point.x+16)*125,y:(track.origin.y+point.y+16)*125,z:(track.origin.z+local.point.z)*125},direction:{...direction,z:local.direction.z},up:{...up,z:local.up.z}};
}

export function compileFlumeCourse(ride:CourseRide,elements:Pick<ReadonlyMap<number,Element>,'get'>):FlumeCourse{
 const spans:Span[]=[],pieces:FlumePieceId[]=[];let connector=ride.anchor,length=0,stationEnd=0,initialStation=true;
 ensure(ride.track.length>0&&new Set(ride.track).size===ride.track.length,'OPERATING_REQUIREMENTS','A unique channel circuit is required.');
 for(const id of ride.track){
  const track=elements.get(id);ensure(track?.kind==='track'&&track.ride===ride.id&&Object.hasOwn(flumePieces,track.piece),'GEOMETRY','Unknown or foreign channel piece.');
  const kind=track.piece as FlumePieceId,piece=flumePieces[kind];
  ensure(same(track.origin,connector)&&connector.pitch===piece.entry.pitch&&connector.bank===0,'GEOMETRY','Channel connectors must join with matching pitch and zero bank.');
  pieces.push(kind);if(!piece.station)initialStation=false;else ensure(initialStation,'OPERATING_REQUIREMENTS','The candidate has one initial contiguous station.');
  for(let i=1;i<piece.motion.samples.length;i++){
   const a=piece.motion.samples[i-1]!,b=piece.motion.samples[i]!,distance=Math.round(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)*125);
   ensure(distance>0&&integer(length+distance),'GEOMETRY','Invalid channel segment length.');
   spans.push({begin:length,length:distance,track,piece:kind,t0:(i-1)/(piece.motion.samples.length-1),t1:i/(piece.motion.samples.length-1)});
   length+=distance;if(initialStation)stationEnd=length;
  }
  connector=endpoint(connector,piece);
 }
 ensure(same(connector,ride.anchor),'OPERATING_REQUIREMENTS','The channel must return to its exact anchor.');
 ensure(stationEnd>=8000,'OPERATING_REQUIREMENTS','A contiguous station of at least eight metres is required.');
 const turns=pieces.filter(p=>p==='left'||p==='right');ensure(turns.length===4&&turns.every(p=>p===turns[0]),'OPERATING_REQUIREMENTS','Four matching-direction R8 turns are required.');
 for(const group of [['lift-start','lift','lift-end'],['drop-start','drop','drop-end']] as const){
  const start=pieces.indexOf(group[0]);ensure(start>=0&&group.every((p,i)=>pieces[start+i]===p&&pieces.filter(q=>q===p).length===1),'OPERATING_REQUIREMENTS','One exact four-metre lift and drop are required.');
 }
 const drop=pieces.indexOf('drop-end');ensure(pieces[drop+1]==='splash'&&pieces[drop+2]==='splash','OPERATING_REQUIREMENTS','At least eight metres of splash channel must follow the drop.');
 const connectorKey=(c:Connector)=>[c.x,c.y,c.z,c.direction,c.pitch,c.bank];
 const key=JSON.stringify([ride.id,connectorKey(ride.anchor),ride.track.map(id=>{const t=elements.get(id) as Track;return[id,t.piece,connectorKey(t.origin)];})]);
 // The finite exit stays on the second bay when the contiguous station is extended.
 return{spans,length,stationEnd,dock:8000-flumeCandidate.hullHalfLengthMm,key};
}

export function flumeCourseFrame(course:FlumeCourse,position:number){
 ensure(Number.isFinite(position),'GEOMETRY','Invalid channel position.');const p=mod(position,course.length);
 let low=0,high=course.spans.length-1;
 while(low<high){const middle=Math.ceil((low+high)/2);if(course.spans[middle]!.begin<=p)low=middle;else high=middle-1;}
 const span=course.spans[low]!,t=span.t0+(span.t1-span.t0)*(p-span.begin)/span.length;
 return{...flumeFrame(span.track,t),piece:span.piece};
}

function reservations(track:Track):{cell:Cell,supportHigh:number}[]{
 ensure(Object.hasOwn(flumePieces,track.piece),'GEOMETRY','Unknown channel piece.');
 const piece=flumePieces[track.piece as FlumePieceId],cells=new Map<string,{cell:Cell,supportHigh:number}>();
 for(let i=1;i<piece.motion.samples.length;i++){
  const points:Vector[]=[],bases:number[]=[];
  for(const t of [(i-1)/(piece.motion.samples.length-1),i/(piece.motion.samples.length-1)]){
   const frame=flumeFrame(track,t),right={x:frame.direction.y,y:-frame.direction.x,z:0},rlen=Math.hypot(right.x,right.y);
   bases.push(frame.position.z/125);
   for(const lateral of [-width(track.piece),width(track.piece)])for(const vertical of [0,flumeCandidate.envelopeUnits])points.push({x:frame.position.x/125+right.x/rlen*lateral+frame.up.x*vertical,y:frame.position.y/125+right.y/rlen*lateral+frame.up.y*vertical,z:frame.position.z/125+frame.up.z*vertical});
  }
  const low=Math.floor((Math.min(...points.map(p=>p.z))+1e-9)/8)*8,high=Math.ceil((Math.max(...points.map(p=>p.z))-1e-9)/8)*8;
  const x0=Math.floor((Math.min(...points.map(p=>p.x))+1e-9)/16),x1=Math.ceil((Math.max(...points.map(p=>p.x))-1e-9)/16),y0=Math.floor((Math.min(...points.map(p=>p.y))+1e-9)/16),y1=Math.ceil((Math.max(...points.map(p=>p.y))-1e-9)/16);
  for(let x=x0;x<x1;x++)for(let y=y0;y<y1;y++){
   const tx=Math.floor(x/2),ty=Math.floor(y/2),key=`${tx},${ty}`,bit=1<<[[0,1],[3,2]][mod(y,2)]![mod(x,2)]!;
   const entry=cells.get(key)??{cell:{x:tx,y:ty,low,high,mask:0},supportHigh:0},cell=entry.cell;cell.mask|=bit;cell.low=Math.min(cell.low,low);cell.high=Math.max(cell.high,high);entry.supportHigh=Math.max(entry.supportHigh,...bases);cells.set(key,entry);
  }
 }
 return[...cells.values()].sort((a,b)=>a.cell.x-b.cell.x||a.cell.y-b.cell.y);
}

export function flumeCells(track:Track):Cell[]{return reservations(track).map(entry=>entry.cell);}

export function flumeGroundCells(track:Track,ground:(tile:Cell)=>{height:number,water:number,owned:boolean},maxHeight:number):Cell[]{
 return reservations(track).map(({cell,supportHigh})=>{
  const terrain=ground(cell);ensure(terrain.owned,'NOT_OWNED','Channel construction requires owned land.');
  ensure(terrain.water===0&&cell.low>=terrain.height,'CLEARANCE','The candidate channel requires dry terrain below its base.');
  ensure(supportHigh-terrain.height<=flumeCandidate.maxSupport+1e-9,'SUPPORT','Channel support height exceeds the candidate limit.');
  ensure(cell.high<=maxHeight,'GEOMETRY','Channel envelope exceeds the park height limit.');
  return{...cell,low:terrain.height};
 });
}

export function flumeInterface(a:Track,b:Track,ride:CourseRide,elements:ReadonlyMap<number,Element>,cellA:Cell,cellB:Cell):boolean{
 if(a.ride!==b.ride||a.ride!==ride.id||cellA.x!==cellB.x||cellA.y!==cellB.y)return false;
 const i=ride.track.indexOf(a.id),j=ride.track.indexOf(b.id);if(i<0||j<0||i===j||elements.get(a.id)!==a||elements.get(b.id)!==b)return false;
 const connects=(first:Track,second:Track,from:number,to:number)=>{
  if(!(to===from+1||from===ride.track.length-1&&to===0)||!Object.hasOwn(flumePieces,first.piece)||!Object.hasOwn(flumePieces,second.piece))return false;
  const start=flumePieces[first.piece as FlumePieceId],finish=flumePieces[second.piece as FlumePieceId];
  return same(endpoint(first.origin,start),second.origin)&&second.origin.pitch===finish.entry.pitch&&second.origin.bank===finish.entry.bank;
 };
 let first:Track,second:Track;
 if(connects(a,b,i,j)){first=a;second=b;}
 else if(connects(b,a,j,i)){first=b;second=a;}else return false;
 const shared=cellA.mask&cellB.mask,joint=second.origin,centre={x:joint.x+16,y:joint.y+16},direction=turn(1,0,joint.direction),lateralLimit=Math.ceil(Math.max(width(a.piece),width(b.piece))/16)*16;
 for(let bit=0;bit<4;bit++)if(shared&(1<<bit)){
  const [qx,qy]=[[0,0],[1,0],[1,1],[0,1]][bit]!;
  for(const dx of [0,16])for(const dy of [0,16]){
   const x=cellA.x*32+qx!*16+dx-centre.x,y=cellA.y*32+qy!*16+dy-centre.y;
   if(Math.abs(x*direction.x+y*direction.y)>16||Math.abs(-x*direction.y+y*direction.x)>lateralLimit)return false;
  }
 }
 return shared!==0;
}
