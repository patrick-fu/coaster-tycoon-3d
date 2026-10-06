import type {Element,Ride,Rules,Track,Vector} from './types.js';
import {turn} from './geometry.js';
import {ensure,integer} from './validation.js';

export type MotionRules={tickHz:number,tileMetres:number,gravity:number,rolling:number,drag:number,stationSpeed:number,chainSpeed:number,brakeDeceleration:number,carLength:number,seatsPerCar:number,maxCars:number,waitTicks:number,unloadTicks:number,bankDegrees:number};
type Segment={begin:number,length:number,point:Vector,tangent:Vector,normal:Vector,curvature:Vector,station:boolean,chain:boolean,brake:number|null};
export type Course={segments:Segment[],length:number,stationLength:number,stationEnd:number};
export type Measurements={ticks:number,distance:number,maxSpeed:number,minVerticalG:number,maxVerticalG:number,maxLateralG:number};
export type Train={ride:number,carIds:number[],phase:'waiting'|'running'|'unloading'|'stalled',position:number,travelled:number,speed:number,wait:number,laps:number,stats:Measurements,measured:Measurements|null};
const dot=(a:Vector,b:Vector)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a:Vector,b:Vector):Vector=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const scale=(a:Vector,n:number):Vector=>({x:a.x*n,y:a.y*n,z:a.z*n});
const add=(a:Vector,b:Vector):Vector=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const subtract=(a:Vector,b:Vector):Vector=>add(a,scale(b,-1));
const unit=(a:Vector)=>scale(a,1/Math.hypot(a.x,a.y,a.z));
function rotate(v:Vector,axis:Vector,angle:number){return add(add(scale(v,Math.cos(angle)),scale(cross(axis,v),Math.sin(angle))),scale(axis,dot(axis,v)*(1-Math.cos(angle))));}
const stats=():Measurements=>({ticks:0,distance:0,maxSpeed:0,minVerticalG:1000,maxVerticalG:1000,maxLateralG:0});


export function compileCourse(ride:Ride,elements:Map<number,Element>,rules:Rules,motion:MotionRules):Course{
  const segments:Segment[]=[],banks:number[]=[];
  let length=0,stationLength=0,initialStation=true;
  for(const id of ride.track){
    const e=elements.get(id) as Track,p=rules.pieces[e.piece]!;
    if(!p.station)initialStation=false;
    for(let i=1;i<p.motion.samples.length;i++){
      const a=p.motion.samples[i-1]!,b=p.motion.samples[i]!,ar=turn(a.x,a.y,e.origin.direction),br=turn(b.x,b.y,e.origin.direction),factor=motion.tileMetres*1000/32;
      const point={x:(e.origin.x+ar.x)*factor,y:(e.origin.y+ar.y)*factor,z:(e.origin.z+a.z)*factor};
      const delta={x:(br.x-ar.x)*factor,y:(br.y-ar.y)*factor,z:(b.z-a.z)*factor};
      const distance=Math.round(Math.hypot(delta.x,delta.y,delta.z));
      ensure(distance>0&&integer(length+distance),'GEOMETRY','Motion segment length is invalid.');
      segments.push({begin:length,length:distance,point,tangent:unit(delta),normal:{x:0,y:0,z:1},curvature:{x:0,y:0,z:0},station:p.station,chain:p.motion.chain,brake:p.motion.brake});
      banks.push((p.entry.bank+(p.end.bank-p.entry.bank)*(i-0.5)/(p.motion.samples.length-1))*motion.bankDegrees*Math.PI/180);
      length+=distance;if(initialStation)stationLength+=distance;
    }
  }
  ensure(segments.length>1&&stationLength>0,'OPERATING_REQUIREMENTS','A measurable station and track are required.');
  const stationEnd=stationLength;
  if(!initialStation){for(let i=segments.length-1;i>=0&&segments[i]!.station;i--)stationLength+=segments[i]!.length;}
  let normal={x:0,y:0,z:1},previous=segments[0]!.tangent;
  for(let i=0;i<segments.length;i++){
    const segment=segments[i]!,axis=cross(previous,segment.tangent),sin=Math.hypot(axis.x,axis.y,axis.z),cos=dot(previous,segment.tangent);
    if(sin>1e-12)normal=rotate(normal,scale(axis,1/sin),Math.atan2(sin,cos));
    else ensure(cos>0,'GEOMETRY','Motion cannot reverse at a sample.');
    normal=unit(subtract(normal,scale(segment.tangent,dot(normal,segment.tangent))));
    segment.normal=rotate(normal,segment.tangent,banks[i]!);
    const before=segments[(i+segments.length-1)%segments.length]!,after=segments[(i+1)%segments.length]!;
    segment.curvature=scale(subtract(after.tangent,before.tangent),2/(before.length+2*segment.length+after.length));
    previous=segment.tangent;
  }
  return{segments,length,stationLength,stationEnd};
}

function locate(course:Course,position:number):Segment{
  const p=((position%course.length)+course.length)%course.length;
  let low=0,high=course.segments.length-1;
  while(low<high){const middle=Math.ceil((low+high)/2);if(course.segments[middle]!.begin<=p)low=middle;else high=middle-1;}
  return course.segments[low]!;
}

export function carPose(course:Course,position:number){
  const p=((position%course.length)+course.length)%course.length,segment=locate(course,p);
  return{position:add(segment.point,scale(segment.tangent,p-segment.begin)),direction:{...segment.tangent},up:{...segment.normal}};
}

export function createTrain(ride:number,carIds:number[],course:Course,rules:MotionRules):Train{
  const cars=carIds.length;ensure(new Set(carIds).size===cars&&carIds.every(id=>integer(id,1)),'INVALID_COMMAND','Invalid car identifiers.');
  ensure(integer(cars,1,rules.maxCars)&&cars*rules.carLength<=course.stationLength,'OPERATING_REQUIREMENTS','The configured train does not fit the station.');
  return{ride,carIds:[...carIds],phase:'waiting',position:((Math.floor(course.stationEnd-rules.carLength/2)%course.length)+course.length)%course.length,travelled:0,speed:0,wait:0,laps:0,stats:stats(),measured:null};
}

export function stepTrain(train:Train,course:Course,rules:MotionRules,dispatch:boolean):void{
  if(train.phase==='stalled')return;
  if(train.phase==='unloading'){
    train.wait++;
    if(train.wait>=rules.unloadTicks){train.phase='waiting';train.wait=0;}
    return;
  }
  if(train.phase==='waiting'){
    if(!dispatch){train.wait=0;return;}
    train.wait++;
    if(train.wait<rules.waitTicks)return;
    train.phase='running';train.speed=rules.stationSpeed;train.travelled=0;train.wait=0;train.stats=stats();
  }
  const front=locate(course,train.position);
  let slope=0;
  for(let i=0;i<train.carIds.length;i++)slope+=locate(course,train.position-i*rules.carLength).tangent.z/train.carIds.length;
  train.speed=Math.max(0,train.speed-Math.round(rules.gravity*slope/(rules.tickHz*rules.tickHz))-rules.rolling-Math.round(rules.drag*train.speed*train.speed/1e9));
  if(front.chain)train.speed=Math.max(train.speed,rules.chainSpeed);
  if(front.station)train.speed=train.speed<rules.stationSpeed?Math.min(rules.stationSpeed,train.speed+rules.brakeDeceleration):Math.max(rules.stationSpeed,train.speed-rules.brakeDeceleration);
  if(front.brake!==null&&train.speed>front.brake)train.speed=Math.max(front.brake,train.speed-rules.brakeDeceleration);
  if(train.speed===0){train.phase='stalled';return;}
  const acceleration=scale(front.curvature,train.speed*train.speed*rules.tickHz*rules.tickHz);
  acceleration.z+=rules.gravity;
  const vertical=Math.round(dot(acceleration,front.normal)/rules.gravity*1000),lateral=Math.round(dot(acceleration,cross(front.tangent,front.normal))/rules.gravity*1000);
  const distance=Math.min(train.speed,course.length-train.travelled);
  train.stats.ticks++;train.stats.distance+=distance;train.stats.maxSpeed=Math.max(train.stats.maxSpeed,train.speed);
  train.stats.minVerticalG=Math.min(train.stats.minVerticalG,vertical);train.stats.maxVerticalG=Math.max(train.stats.maxVerticalG,vertical);train.stats.maxLateralG=Math.max(train.stats.maxLateralG,Math.abs(lateral));
  train.position=(train.position+distance)%course.length;train.travelled+=distance;
  if(train.travelled===course.length){train.laps++;train.measured={...train.stats};train.phase='unloading';train.speed=0;train.wait=0;}
}
