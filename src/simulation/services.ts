import type {Amenity,Litter,CleanupJob} from './housekeeping.js';
import {inPatrol} from './patrol.js';
import {LIMITS,type Direction,type Element,type State,type Rules,type Tile} from './types.js';
import type {Guest,PathPoint,PeopleIndex,Routing} from './people.js';
import {portalApproach} from './operation.js';
import {ensure,integer,record} from './validation.js';
import type {ContentIdentity} from '../content/registry.js';
import {carouselEditable,fixedProfile} from './carousel.js';
import {flumeProfile} from './flume-profile.js';
import {boatEditable} from './boat.js';
import {compileFlumeCourse} from './flume-native.js';
import {commerceProfileId,facilityProduct,facilityStockCost,productRule} from '../content/consumables.js';

export type FacilityKind='food'|'drink'|'restroom';
export type Facility={id:number,instanceId:number,content:ContentIdentity,name:string,kind:FacilityKind,element:number,open:boolean,price:number,income:number,sales:number};
export type FacilityElement={id:number,kind:'facility',facility:number,tile:Tile,height:number,direction:Direction};
export type Staff={id:number,role:'mechanic'|'handyman',point:PathPoint,next:PathPoint|null,goal:PathPoint|null,progress:number,patrol:number[],job:{ride:number,kind:'repair'|'inspection'}|null,work:number,completed:number,cleanup:CleanupJob|null};
export type ServiceRules={buildPrice:number,defaultPrice:number,maxPrice:number,foodStock:number,drinkStock:number,needThreshold:number,relief:number,initialBladder:number,serviceTicks:number,weekTicks:number,upkeepWeeks:number,mechanicMonthlyWage:number,handymanMonthlyWage:number,rideUpkeep:number,facilityUpkeep:number,interestPer10000:number,staffWalkTicks:number,repairTicks:number,inspectionTicks:number,inspectionInterval:number};
export type ServiceIndex=PeopleIndex&{amenities:Map<number,Amenity>,litter:Map<number,Litter>,facilities:Map<number,Facility>,staff:Map<number,Staff>};
const same=(a:PathPoint,b:PathPoint)=>a.x===b.x&&a.y===b.y&&a.z===b.z;
const key=(p:PathPoint)=>`${p.x},${p.y},${p.z}`;
export function validateServiceRules(input:ServiceRules):ServiceRules{
  const keys=['buildPrice','defaultPrice','maxPrice','foodStock','drinkStock','needThreshold','relief','initialBladder','serviceTicks','weekTicks','upkeepWeeks','mechanicMonthlyWage','handymanMonthlyWage','rideUpkeep','facilityUpkeep','interestPer10000','staffWalkTicks','repairTicks','inspectionTicks','inspectionInterval'] as const;
  record(input,[...keys]);for(const k of keys)ensure(integer(input[k],0,1000000),'INVALID_COMMAND','Invalid service profile.');
  for(const k of ['serviceTicks','weekTicks','upkeepWeeks','staffWalkTicks','repairTicks','inspectionTicks','inspectionInterval'] as const)ensure(input[k]>0,'INVALID_COMMAND','Invalid service cadence.');
  ensure(input.needThreshold<=1000&&input.relief<=1000&&input.initialBladder<=1000&&input.defaultPrice<=input.maxPrice&&input.interestPer10000<=10000,'INVALID_COMMAND','Invalid service range.');
  return Object.fromEntries(keys.map(k=>[k,input[k]])) as ServiceRules;
}
export function facilityApproach(e:FacilityElement):PathPoint{
  const [dx,dy]=[[1,0],[0,1],[-1,0],[0,-1]][e.direction]!;return{x:e.tile.x+dx!,y:e.tile.y+dy!,z:e.height};
}
export function sharedCount(s:State){return s.people.guests.length+s.staff.length+s.litter.length+s.trains.reduce((n,t)=>n+t.carIds.length,0)+s.boats.length;}
export function chooseFacility(g:Guest,s:State,rules:Rules,index:ServiceIndex,route:Routing):{facility:number,goal:PathPoint}|null{
  const motive=(f:Facility)=>f.kind==='food'?g.hunger:f.kind==='drink'?g.thirst:g.bladder;
  let choice:{facility:number,goal:PathPoint,need:number,distance:number}|null=null;
  for(const f of s.facilities){
    if(!f.open||g.cash<f.price||(g.wrapper||g.held)&&f.kind!=='restroom'||motive(f)<rules.services.needThreshold)continue;
    const e=index.elements.get(f.element);if(e?.kind!=='facility')continue;const goal=facilityApproach(e);
    if(!publicPath(goal,index))continue;const distance=route.distance(g.point,goal,null);if(distance===null)continue;
    if(!choice||motive(f)>choice.need||motive(f)===choice.need&&distance<choice.distance)choice={facility:f.id,goal,need:motive(f),distance};
  }
  return choice;
}
export function recoverFacility(g:Guest,index:ServiceIndex):boolean{
  if(g.facility===null)return true;
  const f=index.facilities.get(g.facility),e=f?index.elements.get(f.element):undefined;
  return !!f&&f.open&&g.cash>=f.price&&(f.kind==='restroom'||!g.held)&&e?.kind==='facility'&&publicPath(facilityApproach(e),index);
}
export function buy(g:Guest,s:State,rules:Rules,index:ServiceIndex){
  const f=index.facilities.get(g.facility!)!,r=rules.services,product=facilityProduct(f.content,rules),stock=facilityStockCost(f,rules),price=f.price;
  const cash=BigInt(s.cash)+BigInt(price)-BigInt(stock);
  ensure(cash>=BigInt(-Number.MAX_SAFE_INTEGER)&&cash<=BigInt(Number.MAX_SAFE_INTEGER)&&integer(s.ledger.shopSales+price)&&integer(s.ledger.stock+stock)&&integer(f.income+price)&&integer(f.sales+1)&&integer(g.spent+price),'CAPACITY','Shop accounting capacity exhausted.');
  g.cash-=price;g.spent+=price;s.cash=Number(cash);s.ledger.shopSales+=price;s.ledger.stock+=stock;f.income+=price;f.sales++;
  if(product)g.held={kind:'consumable',productId:product.id,remaining:product.rule.useUnits};
  else{
    if(f.kind!=='restroom'){g.wrapper=true;g.wrapperTick=s.tick;}
    if(f.kind==='food')g.hunger=Math.max(0,g.hunger-r.relief);else if(f.kind==='drink')g.thirst=Math.max(0,g.thirst-r.relief);else g.bladder=Math.max(0,g.bladder-r.relief);
  }
  g.facility=null;g.serviceProgress=0;g.phase='walking';g.thought='none';
}
export function consume(g:Guest,s:State,rules:Rules){
 const held=g.held;if(held?.kind!=='consumable'||g.phase==='riding'||g.phase==='stranded')return;
 const profile=rules.commerceProfiles![commerceProfileId]!;
 if((s.tick%profile.consumeTicks+g.id%profile.consumeTicks)%profile.consumeTicks!==0)return;
 const p=productRule(held.productId,rules),remaining=Math.max(0,held.remaining-profile.unitsPerCall);
 for(const need of ['hunger','thirst','bladder'] as const)g[need]=Math.max(0,Math.min(1000,g[need]+p.effects[need]));
 // Replace nested ownership so a later failed advance cannot alter the original guest.
 g.held=remaining?{...held,remaining}:{kind:'container',containerId:p.containerId,sinceTick:s.tick};
}
function publicPath(p:PathPoint,index:PeopleIndex){return index.paths.get(key(p))?.queueFor===null;}
function allowed(staff:Staff,p:PathPoint){return inPatrol(staff.patrol,p);}
export function accessible(staff:Staff,goal:PathPoint,index:PeopleIndex,route:Routing){
  if(!publicPath(staff.point,index)||!publicPath(goal,index)||!allowed(staff,staff.point))return false;
  const path=route.find(staff.point,goal,null,staff.patrol);return path.length>0&&path.every(p=>allowed(staff,p));
}
function clear(staff:Staff){staff.next=null;staff.goal=null;staff.progress=0;staff.job=null;staff.work=0;}
export function recoverStaff(s:State,index:ServiceIndex,route:Routing){
  for(const staff of s.staff){
    if(staff.role!=='mechanic')continue;
    const ride=staff.job?index.rides.get(staff.job.ride):undefined;
    const station=staff.goal&&staff.job&&[...index.elements.values()].some(e=>e.kind==='portal'&&e.ride===staff.job!.ride&&same(portalApproach(e),staff.goal!));
    if(staff.goal&&(!station||!ride||staff.job!.kind==='repair'&&!ride.broken||!accessible(staff,staff.goal,index,route)||staff.next&&!publicPath(staff.next,index)))clear(staff);
  }
}
export function stepStaff(s:State,rules:Rules,index:ServiceIndex,route:Routing){
  const claimed=new Set(s.staff.filter(t=>t.job).map(t=>t.job!.ride));
  for(const staff of s.staff){
    if(staff.role!=='mechanic')continue;
    if(staff.job){const ride=index.rides.get(staff.job.ride);if(!ride||staff.job.kind==='repair'&&!ride.broken){claimed.delete(staff.job.ride);clear(staff);}}
    if(staff.goal&&!accessible(staff,staff.goal,index,route)){if(staff.job)claimed.delete(staff.job.ride);clear(staff);}
    if(!staff.job){
      let choice:{ride:number,kind:'repair'|'inspection',goal:PathPoint,distance:number}|undefined;
      for(const ride of s.rides){
        const profile=fixedProfile(ride.content,rules)??flumeProfile(ride.content,rules)?.vehicle;
        if(!ride.broken&&flumeProfile(ride.content,rules)&&!index.boats.has(ride.id))continue;
        if(claimed.has(ride.id)||(ride.body===undefined&&!ride.track.length)||!ride.broken&&s.tick-ride.lastInspection<(profile?.inspectionInterval??rules.services.inspectionInterval))continue;
        for(const e of index.elements.values())if(e.kind==='portal'&&e.ride===ride.id){const goal=portalApproach(e);if(!accessible(staff,goal,index,route))continue;const distance=route.distance(staff.point,goal,null,staff.patrol)!;
          const kind=ride.broken?'repair':'inspection';if(!choice||kind==='repair'&&choice.kind!=='repair'||kind===choice.kind&&distance<choice.distance)choice={ride:ride.id,kind,goal,distance};}
      }
      if(choice){staff.job={ride:choice.ride,kind:choice.kind};staff.goal=choice.goal;staff.work=0;claimed.add(choice.ride);}
    }
    if(!staff.job||!staff.goal)continue;
    if(!same(staff.point,staff.goal)){
      staff.next??=route.next(staff.point,staff.goal,null,staff.patrol);if(!staff.next){claimed.delete(staff.job.ride);clear(staff);continue;}
      staff.progress++;if(staff.progress>=rules.services.staffWalkTicks){staff.point={...staff.next};staff.next=null;staff.progress=0;}continue;
    }
    const ride=index.rides.get(staff.job.ride)!,channel=flumeProfile(ride.content,rules),profile=fixedProfile(ride.content,rules)??channel?.vehicle;
    if(profile&&staff.job.kind==='inspection'){
      if(ride.broken){claimed.delete(ride.id);clear(staff);continue;}
      if(channel){const boat=index.boats.get(ride.id);if(ride.body!==undefined||!boat||!boatEditable(boat,compileFlumeCourse(ride,index.elements)))continue;}
      else{const session=index.carouselSessions.get(ride.id);if(!session||!carouselEditable(session))continue;}
    }
    staff.work++;const duration=staff.job.kind==='repair'?(profile?.repairTicks??rules.services.repairTicks):(profile?.inspectionTicks??rules.services.inspectionTicks);
    if(staff.work>=duration){const ride=index.rides.get(staff.job.ride)!;ensure(integer(staff.completed+1),'CAPACITY','Staff service counter exhausted.');if(staff.job.kind==='repair')ride.broken=false;ride.lastInspection=s.tick;staff.completed++;claimed.delete(ride.id);clear(staff);}
  }
}
export function stepFinance(s:State,rules:Rules){
  const r=rules.services;if(s.tick%r.weekTicks!==0)return;
  // Integer division occurs once per employee, preserving quarter-month rounding.
  const wages=s.staff.reduce((n,t)=>n+BigInt(Math.floor((t.role==='mechanic'?r.mechanicMonthlyWage:r.handymanMonthlyWage)/4)),0n);
  const interest=BigInt(s.loan)*BigInt(r.interestPer10000)/10000n;
  const upkeep=(s.tick/r.weekTicks)%r.upkeepWeeks===0?s.rides.filter(t=>t.status!=='closed').reduce((total,t)=>total+BigInt(fixedProfile(t.content,rules)?.upkeep??flumeProfile(t.content,rules)?.vehicle.upkeep??r.rideUpkeep),0n)+BigInt(s.facilities.filter(f=>f.open).length)*BigInt(r.facilityUpkeep):0n;
  const charges={wages,interest,upkeep};let total=0n;
  for(const [k,v] of Object.entries(charges) as ['wages'|'interest'|'upkeep',bigint][]){ensure(BigInt(s.ledger[k])+v<=BigInt(Number.MAX_SAFE_INTEGER),'CAPACITY','Operating ledger capacity exhausted.');total+=v;}
  const cash=BigInt(s.cash)-total;ensure(cash>=BigInt(-Number.MAX_SAFE_INTEGER),'CAPACITY','Cash capacity exhausted.');
  s.cash=Number(cash);for(const [k,v] of Object.entries(charges) as ['wages'|'interest'|'upkeep',bigint][])s.ledger[k]+=Number(v);
}
