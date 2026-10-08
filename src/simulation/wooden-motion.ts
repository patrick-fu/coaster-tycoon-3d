import type {Course,Train} from './motion.js';
import type {TrackedRide,RideProfile,Vector} from './types.js';
import {ensure} from './validation.js';

export type PoseFrame={position:Vector,direction:Vector,up:Vector};
export type WoodenCarPose={body:PoseFrame,bogieFront:PoseFrame,bogieRear:PoseFrame,link:PoseFrame|null,frontCourseMm:number,rearCourseMm:number};
const plus=(a:Vector,b:Vector):Vector=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const minus=(a:Vector,b:Vector):Vector=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const times=(a:Vector,n:number):Vector=>({x:a.x*n,y:a.y*n,z:a.z*n});
const length=(a:Vector)=>Math.hypot(a.x,a.y,a.z);
const up={x:0,y:0,z:1};
function unit(a:Vector){const size=length(a);ensure(Number.isFinite(size)&&size>1e-9,'GEOMETRY','Wooden pose has no finite direction.');return times(a,1/size);}

function sample(course:Course,distance:number){
 const wrapped=((distance%course.length)+course.length)%course.length;
 let low=0,high=course.segments.length-1;
 while(low<high){const middle=Math.ceil((low+high)/2);if(course.segments[middle]!.begin<=wrapped)low=middle;else high=middle-1;}
 const segment=course.segments[low]!,next=course.segments[(low+1)%course.segments.length]!,delta=minus(next.point,segment.point);
 // Rounded integer chord clocks must interpolate the actual endpoints continuously.
 return{position:plus(segment.point,times(delta,(wrapped-segment.begin)/segment.length)),direction:unit(delta)};
}

export function woodenTrainPoses(train:Pick<Train,'position'|'carIds'>,course:Course,profile:RideProfile):WoodenCarPose[]{
 const v=profile.vehicle,frame=(position:Vector,direction:Vector):PoseFrame=>({position,direction,up:{...up}});
 const bodyAt=(frontMm:number)=>{
  const front=sample(course,frontMm);let low=frontMm-v.wheelbaseMm*1.5,high=frontMm;
  ensure(length(minus(front.position,sample(course,low).position))>=v.wheelbaseMm,'GEOMETRY','Wooden wheelbase has no rear-contact bracket.');
  for(let i=0;i<64;i++){const middle=(low+high)/2;if(length(minus(front.position,sample(course,middle).position))>v.wheelbaseMm)low=middle;else high=middle;}
  const rearMm=(low+high)/2,rear=sample(course,rearMm),direction=unit(minus(front.position,rear.position));
  const body=frame(plus(times(plus(front.position,rear.position),.5),v.originMm),direction);
  const pivotOffset=plus(v.originMm,times(up,v.bogiePivotHeightMm));
  return{body,bogieFront:frame(plus(front.position,pivotOffset),front.direction),bogieRear:frame(plus(rear.position,pivotOffset),rear.direction),link:null,frontCourseMm:frontMm,rearCourseMm:rearMm} as WoodenCarPose;
 };
 const hinge=(body:PoseFrame,sign:number)=>plus(plus(body.position,times(up,v.couplerHeightMm)),times(body.direction,sign*v.couplerHalfSpanMm));
 const result:WoodenCarPose[]=[];
 for(let i=0;i<train.carIds.length;i++){
  if(i===0){result.push(bodyAt(train.position+v.wheelbaseMm/2));continue;}
  const leading=result[i-1]!,leadHinge=hinge(leading.body,-1),pitch=profile.motion.carLength;
  const residual=(distance:number)=>length(minus(leadHinge,hinge(bodyAt(distance).body,1)))-v.drawbarLengthMm;
  const start=leading.frontCourseMm-pitch*1.5,end=leading.frontCourseMm-pitch*.5,brackets:{low:number,high:number}[]=[];
  let previous=start,before=residual(previous);
  for(let step=1;step<=24;step++){
   const current=start+(end-start)*step/24,after=residual(current);
   if(before>=0&&after<0)brackets.push({low:previous,high:current});
   previous=current;before=after;
  }
  ensure(brackets.length===1,'GEOMETRY','Wooden fixed-link position is unsolved or ambiguous.');
  let {low,high}=brackets[0]!;
  for(let step=0;step<64;step++){const middle=(low+high)/2;if(residual(middle)>0)low=middle;else high=middle;}
  const following=bodyAt((low+high)/2),followHinge=hinge(following.body,1),span=minus(leadHinge,followHinge);
  ensure(Math.abs(length(span)-v.drawbarLengthMm)<=.1&&span.x*leading.body.direction.x+span.y*leading.body.direction.y>0,'GEOMETRY','Wooden drawbar does not close behind its leading car.');
  following.link=frame(times(plus(leadHinge,followHinge),.5),unit(span));result.push(following);
 }
 return result;
}

export function qualifyWoodenCourse(ride:TrackedRide,course:Course,profile:RideProfile){
 ensure(course.segments.every(s=>s.tangent.z===0),'OPERATING_REQUIREMENTS','This wooden candidate supports flat unbanked courses only.');
 let turn=0,sign=0;
 for(let i=0;i<course.segments.length;i++){
  const before=course.segments[(i+course.segments.length-1)%course.segments.length]!.tangent,after=course.segments[i]!.tangent;
  const angle=Math.atan2(before.x*after.y-before.y*after.x,before.x*after.x+before.y*after.y);
  if(Math.abs(angle)>1e-10){ensure(sign===0||Math.sign(angle)===sign,'OPERATING_REQUIREMENTS','The wooden candidate cannot reverse its curve direction.');sign=Math.sign(angle);turn+=angle;}
 }
 ensure(Math.abs(Math.abs(turn)-Math.PI*2)<1e-8&&course.segments.filter(s=>s.station).reduce((n,s)=>n+s.length,0)===course.stationLength,'OPERATING_REQUIREMENTS','The wooden candidate requires one station and four turns in a single direction.');
 const positions=new Set([0,course.length-1]);
 for(const segment of course.segments){positions.add(segment.begin);positions.add((segment.begin+course.length-1)%course.length);}
 for(const position of positions)woodenTrainPoses({position,carIds:Array.from({length:ride.cars},(_,i)=>i)},course,profile);
}
