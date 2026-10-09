import {LIMITS,type Element,type Path,type Portal,type Ride,type Rules,type Tile,type State} from './types.js';
import {amenityAvailable,chooseAmenity,dropLitter,releaseAmenity,rest,useAmenity} from './housekeeping.js';
import {buy,chooseFacility,recoverFacility,sharedCount,type ServiceIndex} from './services.js';
import type {Train} from './motion.js';
import {carouselEditable,type CarouselSession} from './carousel.js';
import type {Boat} from './boat.js';
import {flumeProfile} from './flume-profile.js';
import {portalApproach,stationGroups} from './operation.js';
import {integer} from './validation.js';

export type PathPoint={readonly x:number,readonly y:number,readonly z:number};
export type GuestRules={spawnTicks:number,walkTicks:number,decisionTicks:number,needTicks:number,queueSlotsPerTile:number,patienceTicks:number,rideCooldownTicks:number,defaultRidePrice:number,maxRidePrice:number,cashMin:number,cashMax:number,fareMin:number,fareMax:number,forceMin:number,forceMax:number,initialHunger:number,initialThirst:number,initialHappiness:number,initialEnergy:number,needGrowth:number,rideHappiness:number,rideNausea:number};
export type Ledger={rideSales:number,shopSales:number,stock:number,wages:number,upkeep:number,interest:number};
export type Guest={id:number,navigationRide:number|null,amenity:number|null,restProgress:number,wrapper:boolean,wrapperTick:number,facility:number|null,serviceProgress:number,bladder:number,point:PathPoint,phase:'walking'|'queued'|'riding'|'stranded'|'leaving'|'buying'|'resting',goal:PathPoint|null,next:PathPoint|null,walkProgress:number,destination:number|null,entrance:number|null,exit:number|null,queueRide:number|null,seat:{ride:number,slot:number}|null,initialCash:number,cash:number,spent:number,fareLimit:number,forceTolerance:number,hunger:number,thirst:number,nausea:number,happiness:number,energy:number,queuedAt:number,lastRide:number|null,lastRideTick:number,ridesTaken:number,thought:'none'|'not-enough-cash'|'too-intense'|'path-lost'|'ride-closed'|'queue-too-long'|'price-changed'|'payment-blocked'|'leaving'};
export type PeopleState={entry:PathPoint|null,open:boolean,guests:Guest[],departedSpent:number};
type Access={entrance:Portal,exit:Portal,front:PathPoint,out:PathPoint,body:PathPoint[]};
export type PeopleIndex={elements:Map<number,Element>,paths:Map<string,Path>,rides:Map<number,Ride>,trains:Map<number,Train>,carouselSessions:Map<number,CarouselSession>,boats:Map<number,Boat>,guests:Map<number,Guest>,accessCache:Map<number,{stamp:string,value:Access|null}>};
export type Routing={find:(from:PathPoint,to:PathPoint,ride:number|null,patrol?:readonly number[])=>PathPoint[],next:(from:PathPoint,to:PathPoint,ride:number|null,patrol?:readonly number[])=>PathPoint|null,distance:(from:PathPoint,to:PathPoint,ride:number|null,patrol?:readonly number[])=>number|null};
const key=(p:PathPoint)=>`${p.x},${p.y},${p.z}`;
const equal=(a:PathPoint,b:PathPoint)=>a.x===b.x&&a.y===b.y&&a.z===b.z;
const clamp=(n:number)=>Math.max(0,Math.min(1000,n));
const due=(tick:number,id:number,period:number)=>(tick%period+id%period)%period===0;

function random(state:State,min:number,max:number){state.rng=(state.rng*1664525+1013904223)>>>0;return min+state.rng%(max-min+1);}
function navigate(guest:Guest,goal:PathPoint|null){guest.goal=goal;if(guest.walkProgress===0)guest.next=null;}
function clearNavigation(guest:Guest){guest.navigationRide=null;guest.goal=null;guest.next=null;guest.walkProgress=0;}
function move(guest:Guest,rules:GuestRules,index:PeopleIndex,route:Routing):boolean{
  if(guest.goal===null)return true;
  if(guest.next===null){
    if(equal(guest.point,guest.goal)){guest.goal=null;guest.navigationRide=null;guest.walkProgress=0;return true;}
    guest.next=route.next(guest.point,guest.goal,guest.queueRide??guest.destination??guest.navigationRide??index.paths.get(key(guest.point))?.queueFor??null);
    if(guest.next===null)return false;
  }
  guest.walkProgress++;
  if(guest.walkProgress>=rules.walkTicks){guest.point={...guest.next};guest.next=null;guest.walkProgress=0;if(equal(guest.point,guest.goal)){guest.goal=null;guest.navigationRide=null;}}
  return true;
}
function releaseQueue(guest:Guest,index:PeopleIndex){
  if(guest.queueRide!==null){const ride=index.rides.get(guest.queueRide);if(ride)ride.queue=ride.queue.filter(id=>id!==guest.id);}
  guest.queueRide=null;
}
function recover(guest:Guest,state:State,index:ServiceIndex,route:Routing,thought:Guest['thought']){
  const previous=guest.queueRide??guest.destination??guest.navigationRide??index.paths.get(key(guest.point))?.queueFor??null;releaseQueue(guest,index);releaseAmenity(guest,index);guest.facility=null;guest.serviceProgress=0;guest.destination=null;guest.entrance=null;guest.exit=null;guest.thought=thought;
  const path=index.paths.get(key(guest.point));guest.phase=path?'walking':'stranded';
  clearNavigation(guest);guest.navigationRide=previous;if(previous!==null&&!state.people.entry)guest.phase='stranded';if(path&&state.people.entry){const distance=route.distance(guest.point,state.people.entry,previous);if(distance===null)guest.phase='stranded';else navigate(guest,state.people.entry);}
}

export function detachRideGuests(ride:number,state:State,index:ServiceIndex,route:Routing){
  for(const guest of state.people.guests){
    if(guest.lastRide===ride)guest.lastRide=null;
    if(guest.destination!==ride&&guest.queueRide!==ride&&guest.navigationRide!==ride)continue;
    releaseQueue(guest,index);guest.destination=null;guest.entrance=null;guest.exit=null;clearNavigation(guest);guest.thought='ride-closed';
    guest.phase=index.paths.has(key(guest.point))?'walking':'stranded';
    if(guest.phase==='walking'&&state.people.entry){if(route.distance(guest.point,state.people.entry,null)===null)guest.phase='stranded';else navigate(guest,state.people.entry);}
  }
}

function access(ride:Ride,state:State,index:PeopleIndex,rules:Rules,route:Routing){
  const entry=state.people.entry;if(!entry||index.paths.get(key(entry))?.queueFor!==null)return null;
  const stamp=`${key(entry)}:${state.topologyRevision}:${ride.body??ride.track.length}:${ride.body??ride.track.at(-1)}`;
  const cached=index.accessCache.get(ride.id);if(cached?.stamp===stamp)return cached.value;
  const calculate=():Access|null=>{
  const stations=ride.body===undefined?stationGroups(ride,index.elements,rules)[0]?.track:index.elements.get(ride.body)?.kind==='fixed-body'?[ride.body]:undefined;if(!stations)return null;
  const portals=[...index.elements.values()].filter(e=>e.kind==='portal'&&e.ride===ride.id&&stations.includes(e.station));
  const entrance=portals.find(e=>e.kind==='portal'&&e.role==='entrance'),exit=portals.find(e=>e.kind==='portal'&&e.role==='exit');
  if(entrance?.kind!=='portal'||exit?.kind!=='portal')return null;
  const front=portalApproach(entrance),out=portalApproach(exit);
  if(index.paths.get(key(front))?.queueFor!==ride.id||index.paths.get(key(out))?.queueFor!==null)return null;
  const inbound=route.find(entry,front,ride.id),outbound=route.distance(out,entry,null);
  if(!inbound.length||outbound===null)return null;
  const body:PathPoint[]=[];
  for(let i=inbound.length-1;i>=0&&index.paths.get(key(inbound[i]!))?.queueFor===ride.id;i--)body.push(inbound[i]!);
    return{entrance,exit,front,out,body};
  };
  const value=calculate();index.accessCache.set(ride.id,{stamp,value});return value;
}
function accepts(guest:Guest,ride:Ride,index:ServiceIndex,rules:Rules){
  if(flumeProfile(ride.content,rules)){
    const boat=index.boats.get(ride.id),inspecting=boat?.phase==='loading'&&boat.seats.every(id=>id===null)&&[...index.staff.values()].some(t=>t.job?.ride===ride.id&&t.job.kind==='inspection'&&t.goal&&equal(t.point,t.goal));
    return ride.status==='open'&&!ride.broken&&!!boat?.measured&&!inspecting&&guest.cash>=ride.price&&guest.fareLimit>=ride.price;
  }
  if(ride.body!==undefined){
    const session=index.carouselSessions.get(ride.id);
    const inspecting=session&&carouselEditable(session)&&[...index.staff.values()].some(t=>t.job?.ride===ride.id&&t.job.kind==='inspection'&&t.goal&&equal(t.point,t.goal));
    return ride.status==='open'&&!ride.broken&&!!session&&!inspecting&&guest.cash>=ride.price&&guest.fareLimit>=ride.price;
  }
  const train=index.trains.get(ride.id);
  return ride.status==='open'&&!ride.broken&&!!train?.measured&&guest.cash>=ride.price&&guest.fareLimit>=ride.price&&Math.max(Math.abs(train.measured.minVerticalG),train.measured.maxVerticalG,train.measured.maxLateralG)<=guest.forceTolerance;
}

export function recoverPeople(state:State,rules:Rules,index:ServiceIndex,route:Routing){
  if(state.people.open&&(!state.people.entry||index.paths.get(key(state.people.entry))?.queueFor!==null))state.people.open=false;
  for(const guest of state.people.guests){
    if(guest.phase==='riding')continue;
    if(guest.navigationRide!==null&&(!state.people.entry||guest.goal===null||!equal(guest.goal,state.people.entry))){recover(guest,state,index,route,guest.thought);continue;}
    if(!amenityAvailable(guest,rules,index)){recover(guest,state,index,route,'path-lost');continue;}
    if(!recoverFacility(guest,index)){recover(guest,state,index,route,'price-changed');continue;}
    const ride=guest.destination===null?undefined:index.rides.get(guest.destination);
    const portals=ride?access(ride,state,index,rules,route):null;
    if(ride&&(!accepts(guest,ride,index,rules)||!portals)){
      recover(guest,state,index,route,ride.status!=='open'||ride.broken?'ride-closed':guest.cash<ride.price||guest.fareLimit<ride.price?'price-changed':'path-lost');continue;
    }
    if(guest.phase==='queued'&&portals&&!portals.body.some(p=>equal(p,guest.point))){recover(guest,state,index,route,'path-lost');continue;}
    const path=index.paths.get(key(guest.point));
    if(!path||guest.next!==null&&!index.paths.has(key(guest.next))||guest.goal!==null&&route.distance(guest.point,guest.goal,guest.queueRide??guest.destination??guest.navigationRide??path.queueFor)===null)recover(guest,state,index,route,'path-lost');
    else if(guest.phase==='stranded')recover(guest,state,index,route,'none');
  }
}

function choose(guest:Guest,state:State,rules:Rules,index:ServiceIndex,route:Routing){
  if(!index.paths.has(key(guest.point))||guest.phase==='riding'||guest.phase==='queued')return;
  const amenity=chooseAmenity(guest,state,rules,index,route);
  if(amenity){guest.navigationRide=null;guest.amenity=amenity.amenity;guest.thought='none';navigate(guest,amenity.goal);return;}
  const service=chooseFacility(guest,state,rules,index,route);
  if(service){guest.navigationRide=null;guest.facility=service.facility;guest.destination=null;guest.entrance=null;guest.exit=null;guest.thought='none';navigate(guest,service.goal);return;}
  let choice:{ride:Ride,portals:NonNullable<ReturnType<typeof access>>,distance:number}|undefined;
  for(const ride of state.rides){
    if(!accepts(guest,ride,index,rules)||guest.lastRide===ride.id&&state.tick-guest.lastRideTick<rules.guests.rideCooldownTicks)continue;
    const portals=access(ride,state,index,rules,route);if(!portals||ride.queue.length>=portals.body.length*rules.guests.queueSlotsPerTile)continue;
    const distance=route.distance(guest.point,portals.front,ride.id);if(distance!==null&&(!choice||distance<choice.distance))choice={ride,portals,distance};
  }
  if(choice){
    guest.navigationRide=null;guest.destination=choice.ride.id;guest.entrance=choice.portals.entrance.id;guest.exit=choice.portals.exit.id;guest.phase='walking';guest.thought='none';navigate(guest,choice.portals.front);return;
  }
  releaseAmenity(guest,index);guest.facility=null;guest.serviceProgress=0;guest.destination=null;guest.entrance=null;guest.exit=null;
  if(guest.cash<rules.guests.defaultRidePrice)guest.thought='not-enough-cash';
  else if(guest.forceTolerance<1000)guest.thought='too-intense';
  if(guest.happiness===0&&state.people.entry){guest.phase='leaving';guest.thought='leaving';navigate(guest,state.people.entry);}
}

export function stepPeople(state:State,rules:Rules,index:ServiceIndex,route:Routing){
  const entry=state.people.entry;
  if(state.people.open&&entry&&state.tick%rules.guests.spawnTicks===0&&index.paths.get(key(entry))?.queueFor===null&&sharedCount(state)<LIMITS.sharedEntities&&integer(state.nextEntity+1)){
    const cash=random(state,rules.guests.cashMin,rules.guests.cashMax);
    const guest:Guest={id:state.nextEntity++,navigationRide:null,amenity:null,restProgress:0,wrapper:false,wrapperTick:0,facility:null,serviceProgress:0,bladder:rules.services.initialBladder,point:{...entry},phase:'walking',goal:null,next:null,walkProgress:0,destination:null,entrance:null,exit:null,queueRide:null,seat:null,initialCash:cash,cash,spent:0,fareLimit:random(state,rules.guests.fareMin,rules.guests.fareMax),forceTolerance:random(state,rules.guests.forceMin,rules.guests.forceMax),hunger:rules.guests.initialHunger,thirst:rules.guests.initialThirst,nausea:0,happiness:rules.guests.initialHappiness,energy:rules.guests.initialEnergy,queuedAt:0,lastRide:null,lastRideTick:0,ridesTaken:0,thought:'none'};
    state.people.guests.push(guest);index.guests.set(guest.id,guest);
  }
  const departing:number[]=[];
  for(const guest of state.people.guests){
    if(due(state.tick,guest.id,rules.guests.needTicks)){guest.hunger=clamp(guest.hunger+rules.guests.needGrowth);guest.thirst=clamp(guest.thirst+rules.guests.needGrowth);guest.bladder=clamp(guest.bladder+rules.guests.needGrowth);guest.energy=clamp(guest.energy-rules.guests.needGrowth);guest.nausea=clamp(guest.nausea-1);if(guest.hunger===1000||guest.thirst===1000||guest.bladder===1000)guest.happiness=clamp(guest.happiness-rules.guests.needGrowth);}
    if(guest.phase==='riding')continue;
    if(!amenityAvailable(guest,rules,index)){recover(guest,state,index,route,'path-lost');continue;}
    dropLitter(guest,state,rules,index);
    if(guest.phase==='resting'){rest(guest,rules,index);continue;}
    if(guest.facility!==null&&!recoverFacility(guest,index)){recover(guest,state,index,route,'price-changed');continue;}
    if(guest.phase==='buying'){guest.serviceProgress++;if(guest.serviceProgress>=rules.services.serviceTicks)buy(guest,state,rules,index);continue;}
    if(guest.phase==='queued'){
      const ride=index.rides.get(guest.queueRide!)!,portals=access(ride,state,index,rules,route);
      if(!portals||!accepts(guest,ride,index,rules)||state.tick-guest.queuedAt>=rules.guests.patienceTicks){recover(guest,state,index,route,!portals?'path-lost':state.tick-guest.queuedAt>=rules.guests.patienceTicks?'queue-too-long':ride.status!=='open'||ride.broken?'ride-closed':'price-changed');continue;}
      const position=ride.queue.indexOf(guest.id),target=portals.body[Math.min(portals.body.length-1,Math.floor(position/rules.guests.queueSlotsPerTile))]!;
      navigate(guest,target);
      if(guest.next===null&&!equal(guest.point,target)){
        const from=portals.body.findIndex(p=>equal(p,guest.point)),to=portals.body.findIndex(p=>equal(p,target));
        if(from<0){recover(guest,state,index,route,'path-lost');continue;}
        guest.next=portals.body[from+Math.sign(to-from)]!;
      }
      if(!move(guest,rules.guests,index,route))recover(guest,state,index,route,'path-lost');continue;
    }
    if(guest.phase==='stranded'){if(due(state.tick,guest.id,rules.guests.decisionTicks))recover(guest,state,index,route,'none');continue;}
    if(guest.destination!==null){
      const ride=index.rides.get(guest.destination)!,portals=access(ride,state,index,rules,route);
      if(!portals||!accepts(guest,ride,index,rules)){recover(guest,state,index,route,!portals?'path-lost':'price-changed');continue;}
      if(index.paths.get(key(guest.point))?.queueFor===ride.id&&portals.body.some(p=>equal(p,guest.point))){
        if(ride.queue.length>=portals.body.length*rules.guests.queueSlotsPerTile){recover(guest,state,index,route,'queue-too-long');continue;}
        releaseQueue(guest,index);ride.queue.push(guest.id);guest.queueRide=ride.id;guest.phase='queued';guest.queuedAt=state.tick;clearNavigation(guest);continue;
      }
    }
    if(!move(guest,rules.guests,index,route)){recover(guest,state,index,route,'path-lost');continue;}
    if(guest.amenity!==null&&guest.goal===null&&guest.next===null){useAmenity(guest,rules,index);continue;}
    if(guest.facility!==null&&guest.goal===null&&guest.next===null){guest.phase='buying';guest.serviceProgress=0;continue;}
    if(entry&&equal(guest.point,entry)&&guest.walkProgress===0)guest.navigationRide=null;
    if(guest.phase==='leaving'&&entry&&equal(guest.point,entry)&&guest.walkProgress===0&&integer(state.people.departedSpent+guest.spent)){departing.push(guest.id);state.people.departedSpent+=guest.spent;continue;}
    if(guest.destination===null&&guest.goal===null&&guest.next===null&&due(state.tick,guest.id,rules.guests.decisionTicks))choose(guest,state,rules,index,route);
  }
  if(departing.length){const gone=new Set(departing);state.people.guests=state.people.guests.filter(g=>!gone.has(g.id));for(const id of departing)index.guests.delete(id);}
}

export function boardGuests(train:Train,state:State,rules:Rules,index:ServiceIndex,route:Routing){
  const ride=index.rides.get(train.ride)!,portals=access(ride,state,index,rules,route);
  if(train.phase!=='waiting'||!portals||ride.status!=='open'||ride.broken)return;
  for(let slot=0;slot<train.seats.length&&ride.queue.length;slot++){
    if(train.seats[slot]!==null)continue;
    const guest=index.guests.get(ride.queue[0]!)!;
    if(!equal(guest.point,portals.front)||guest.walkProgress!==0)break;
    if(!accepts(guest,ride,index,rules)){recover(guest,state,index,route,'price-changed');slot--;continue;}
    const price=ride.price;
    if(!integer(state.cash+price,-Number.MAX_SAFE_INTEGER)||!integer(state.ledger.rideSales+price)||!integer(ride.income+price)||!integer(guest.spent+price)){recover(guest,state,index,route,'payment-blocked');slot--;continue;}
    releaseQueue(guest,index);train.seats[slot]=guest.id;guest.phase='riding';guest.seat={ride:ride.id,slot};guest.destination=null;clearNavigation(guest);guest.cash-=price;guest.spent+=price;state.cash+=price;state.ledger.rideSales+=price;ride.income+=price;
  }
}

export function boardCarousel(session:Pick<CarouselSession,'ride'|'seats'|'phase'>,state:State,rules:Rules,index:ServiceIndex,route:Routing):boolean{
  const ride=index.rides.get(session.ride)!,portals=access(ride,state,index,rules,route);
  if(session.phase!=='loading'||!portals||!ride.queue.length)return false;
  const slot=session.seats.indexOf(null);if(slot<0)return false;
  const guest=index.guests.get(ride.queue[0]!)!;
  if(!equal(guest.point,portals.front)||guest.walkProgress!==0)return false;
  if(!accepts(guest,ride,index,rules)){recover(guest,state,index,route,'price-changed');return false;}
  const price=ride.price;
  if(!integer(state.cash+price,-Number.MAX_SAFE_INTEGER)||!integer(state.ledger.rideSales+price)||!integer(ride.income+price)||!integer(guest.spent+price)){recover(guest,state,index,route,'payment-blocked');return false;}
  releaseQueue(guest,index);session.seats[slot]=guest.id;guest.phase='riding';guest.seat={ride:ride.id,slot};guest.destination=null;clearNavigation(guest);guest.cash-=price;guest.spent+=price;state.cash+=price;state.ledger.rideSales+=price;ride.income+=price;
  return true;
}

export function boardBoat(boat:Boat,state:State,rules:Rules,index:ServiceIndex,route:Routing){return boardCarousel(boat,state,rules,index,route);}

export function unloadBoat(boat:Boat,state:State,rules:Rules,index:PeopleIndex,route:Routing){
  const p=flumeProfile(index.rides.get(boat.ride)!.content,rules)!.vehicle;
  return unloadGuests({ride:boat.ride,seats:boat.seats},state,rules,index,route,{happiness:p.happiness,nausea:p.nausea});
}

export function unloadGuests(train:Pick<Train,'ride'|'seats'> & {measured?:Train['measured']},state:State,rules:Rules,index:PeopleIndex,route:Routing,effects?:{happiness:number,nausea:number}):boolean{
  if(!train.seats.some(id=>id!==null))return true;
  const passengers=train.seats.filter((id):id is number=>id!==null).map(id=>index.guests.get(id)!);
  const exits=passengers.map(g=>g.exit===null?undefined:index.elements.get(g.exit));
  if(exits.some(e=>e?.kind!=='portal'||index.paths.get(key(portalApproach(e)))?.queueFor!==null))return false;
  for(const guest of passengers){
    const exit=index.elements.get(guest.exit!)!;if(exit.kind!=='portal')continue;
    guest.point=portalApproach(exit);guest.phase='walking';guest.seat=null;guest.queueRide=null;guest.lastRide=train.ride;guest.lastRideTick=state.tick;guest.ridesTaken++;guest.happiness=clamp(guest.happiness+(effects?.happiness??rules.guests.rideHappiness));guest.nausea=clamp(guest.nausea+(effects?.nausea??Math.round((train.measured?.maxLateralG??0)*rules.guests.rideNausea/1000)));guest.entrance=null;guest.exit=null;guest.thought='none';
    clearNavigation(guest);if(state.people.entry){const distance=route.distance(guest.point,state.people.entry,null);if(distance===null)guest.phase='stranded';else navigate(guest,state.people.entry);}
  }
  train.seats.fill(null);return true;
}
