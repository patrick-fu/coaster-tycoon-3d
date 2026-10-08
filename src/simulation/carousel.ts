import type {Cell,Direction,FixedBody,FixedRideProfile,Portal,Ride,Rules,Vector} from './types.js';
import {carouselProfile,carouselProfileId} from '../content/carousel.js';
import {legacyRideContent,resolveContent} from '../content/registry.js';
import {ensure,integer,record} from './validation.js';

export type CarouselSession={ride:number,seats:(number|null)[],phase:'loading'|'running'|'unloading',phaseTick:number,completedCycles:number};

export function fixedProfile(content:Ride['content'],rules:Rules):FixedRideProfile|null{
 const {construction,operation}=resolveContent(content??legacyRideContent()).capabilities;
 if(construction.kind!=='fixed')return null;
 ensure(operation.kind==='rotation'&&construction.profileId===operation.profileId,'INVALID_CONTENT','The fixed ride has no matching rotation operation.');
 const profile=rules.fixedProfiles?.[construction.profileId];
 ensure(profile,'UNSUPPORTED_CONTENT','This fixed ride profile is unavailable in the receiving park.');
 return profile;
}

export function validateFixedProfiles(input:Rules['fixedProfiles'],rules:Rules):Record<string,FixedRideProfile>{
 const supplied=input===undefined?{}:input;
 ensure(supplied!==null&&typeof supplied==='object'&&!Array.isArray(supplied),'INVALID_COMMAND','Invalid fixed ride profiles.');
 const ids=Object.keys(supplied);record(supplied,ids);
 ensure(ids.length<=1&&ids.every(id=>id===carouselProfileId),'UNSUPPORTED_CONTENT','Unavailable fixed ride profile.');
 const profiles:Record<string,FixedRideProfile>={};
 for(const id of ids){
  const p=supplied[id]!;record(p,Object.keys(carouselProfile));
  ensure(rules.motion.tileMetres===4&&rules.motion.tickHz===40,'INVALID_COMMAND','The Carousel requires its authored 4 m, 40 Hz world.');
  for(const key of Object.keys(carouselProfile) as (keyof FixedRideProfile)[]){
   if(key==='seats')continue;
   ensure(integer(p[key],1,1000000),'INVALID_COMMAND','Invalid Carousel profile value.');
   ensure(p[key]===carouselProfile[key],'INVALID_COMMAND','Carousel profile differs from the finite candidate contract.');
  }
  ensure(Array.isArray(p.seats)&&p.seats.length===16,'INVALID_COMMAND','The Carousel requires sixteen ordered seat datums.');
  for(let i=0;i<16;i++){
   const seat=p.seats[i]!,expected=carouselProfile.seats[i]!;record(seat,['x','y','z','yaw']);
   ensure(['x','y','z','yaw'].every(k=>seat[k as keyof typeof seat]===expected[k as keyof typeof seat]),'INVALID_COMMAND','Carousel seat datums differ from the authored model.');
  }
  profiles[id]=Object.fromEntries(Object.keys(carouselProfile).map(key=>[key,key==='seats'?p.seats.map(s=>({x:s.x,y:s.y,z:s.z,yaw:s.yaw})):p[key as keyof FixedRideProfile]])) as FixedRideProfile;
 }
 return profiles;
}

export function newCarouselSession(ride:number):CarouselSession{
 return{ride,seats:Array<number|null>(16).fill(null),phase:'loading',phaseTick:0,completedCycles:0};
}

export function carouselCycleTicks(p:FixedRideProfile){return p.accelTicks+p.cruiseTicks+p.decelTicks;}
export function carouselAngle(session:CarouselSession,p:FixedRideProfile):number{
 if(session.phase!=='running')return 0;
 const t=session.phaseTick,accel=p.accelTicks,cruise=p.cruiseTicks,peak=p.peakUnitsPerTick;
 if(t<=accel)return Math.floor(peak*t*t/(2*accel))%p.angleUnits;
 const ramp=peak*accel/2;
 if(t<=accel+cruise)return(ramp+peak*(t-accel))%p.angleUnits;
 const u=t-accel-cruise;
 return(ramp+peak*cruise+peak*u-Math.floor(peak*u*u/(2*p.decelTicks)))%p.angleUnits;
}

export function carouselEditable(session:CarouselSession){return session.phase==='loading'&&session.seats.every(id=>id===null);}
export function fixedBodyCells(body:FixedBody,p:FixedRideProfile):Cell[]{
 return Array.from({length:p.size*p.size},(_,i)=>({x:body.tile.x+i%p.size,y:body.tile.y+Math.floor(i/p.size),low:body.height,high:body.height+p.bodyHeight,mask:15}));
}

function rotate(x:number,y:number,direction:Direction){
 const [dx,dy]=[[1,0],[0,1],[-1,0],[0,-1]][direction]!;
 return{x:x*dx!-y*dy!,y:x*dy!+y*dx!};
}

export function carouselPortal(body:FixedBody,role:Portal['role']){
 const offset=rotate(-2,role==='entrance'?-1:1,body.direction);
 return{tile:{x:body.tile.x+1+offset.x,y:body.tile.y+1+offset.y},height:body.height,direction:body.direction};
}

export function carouselSeatFrame(body:FixedBody,seat:FixedRideProfile['seats'][number],angle:number,p:FixedRideProfile):{position:Vector,direction:Vector,up:Vector}{
 const theta=angle*Math.PI*2/p.angleUnits,c=Math.cos(theta),s=Math.sin(theta);
 const x=seat.x*c+seat.z*s,z=-seat.x*s+seat.z*c,offset=rotate(z,-x,body.direction);
 const facing=rotate(Math.cos((seat.yaw+angle)*Math.PI*2/p.angleUnits),-Math.sin((seat.yaw+angle)*Math.PI*2/p.angleUnits),body.direction);
 return{position:{x:(body.tile.x+1.5)*4+offset.x/1000,y:(body.tile.y+1.5)*4+offset.y/1000,z:body.height/8+seat.y/1000},direction:{...facing,z:0},up:{x:0,y:0,z:1}};
}
