import {merchandiseIds,merchandiseProfile,type MerchandiseId,type MerchandiseRule} from '../content/merchandise.js';
import type {Rules,State} from './types.js';
import type {Guest,PathPoint,Routing} from './people.js';
import {facilityApproach,type InformationFacility,type ServiceIndex} from './services.js';
import {random} from './random.js';
import {ensure} from './validation.js';

const pointKey=(p:PathPoint)=>`${p.x},${p.y},${p.z}`;
const same=(a:PathPoint,b:PathPoint)=>a.x===b.x&&a.y===b.y&&a.z===b.z;
function excess(g:Guest,price:number,r:MerchandiseRule){let difference=Math.max(0,price-r.value),h=Math.floor(g.happiness*255/1000);if(h>=128)difference=Math.floor(difference/2);if(h>=180)difference=Math.floor(difference/2);return difference;}
function canEverPass(g:Guest,f:InformationFacility,id:MerchandiseId,r:MerchandiseRule){
 if((id==='independent.map'?g.merchandise.map:g.merchandise.umbrellaColour!==null)||g.cash<f.products[id].price)return false;
 if(id==='independent.umbrella'&&(g.ridesTaken<3||Math.floor(g.happiness*255/1000)<115))return false;
 return excess(g,f.products[id].price,r)<=7;
}
export function chooseInformation(g:Guest,s:State,rules:Rules,index:ServiceIndex,route:Routing):{facility:number,counter:number,goal:PathPoint}|null{
 if(!rules.merchandiseProfiles||!Object.keys(rules.merchandiseProfiles).length)return null;
 const p=merchandiseProfile(rules);let choice:{facility:number,counter:number,goal:PathPoint,distance:number}|null=null;
 for(const f of s.facilities){
  if(f.kind!=='information'||!f.open||!merchandiseIds.some(id=>canEverPass(g,f,id,p.products[id])))continue;
  const e=index.elements.get(f.element);if(e?.kind!=='facility'||e.facility!==f.id)continue;
  for(let counter=0;counter<4;counter++){const goal=facilityApproach(e,counter);if(index.paths.get(pointKey(goal))?.queueFor!==null)continue;const distance=route.distance(g.point,goal,null);if(distance===null)continue;
   if(!choice||distance<choice.distance||distance===choice.distance&&(f.id<choice.facility||f.id===choice.facility&&counter<choice.counter))choice={facility:f.id,counter,goal,distance};
  }
 }
 return choice;
}
export function buyInformation(g:Guest,s:State,rules:Rules,index:ServiceIndex):'purchased'|'refused'|'unavailable'{
 const f=g.facility===null?undefined:index.facilities.get(g.facility),e=f?index.elements.get(f.element):undefined;
 if(f?.kind!=='information'||!f.open||e?.kind!=='facility'||e.facility!==f.id||g.informationCounter===null||!rules.merchandiseProfiles||!Object.keys(rules.merchandiseProfiles).length)return'unavailable';
 const counter=facilityApproach(e,g.informationCounter);
 if(!same(g.point,counter)||index.paths.get(pointKey(counter))?.queueFor!==null)return'unavailable';
 const p=merchandiseProfile(rules);
 for(const id of ['independent.umbrella','independent.map'] as const){
  const rule=p.products[id];if(!canEverPass(g,f,id,rule))continue;
  if(id==='independent.umbrella'&&115+random(s,0,127)>Math.floor(g.happiness*255/1000))continue;
  const account=f.products[id],difference=excess(g,account.price,rule);if(account.price>rule.value&&difference>random(s,0,7))continue;
  const price=BigInt(account.price),stock=BigInt(rule.stockCost),limit=BigInt(Number.MAX_SAFE_INTEGER),cash=BigInt(s.cash)+price-stock;
  ensure(cash>=-limit&&cash<=limit&&BigInt(s.ledger.shopSales)+price<=limit&&BigInt(s.ledger.stock)+stock<=limit&&BigInt(account.income)+price<=limit&&BigInt(account.sales)+1n<=limit&&BigInt(g.spent)+price<=limit,'CAPACITY','Merchandise accounting capacity exhausted.');
  g.cash-=account.price;g.spent+=account.price;s.cash=Number(cash);s.ledger.shopSales+=account.price;s.ledger.stock+=rule.stockCost;
  // Replacing nested values keeps a later failed advance isolated from its source.
  f.products={...f.products,[id]:{price:account.price,sales:account.sales+1,income:account.income+account.price}};
  g.merchandise=id==='independent.map'?{...g.merchandise,map:true}:{...g.merchandise,umbrellaColour:f.umbrellaColour};
  g.facility=null;g.informationCounter=null;g.serviceProgress=0;g.phase='walking';g.thought='none';return'purchased';
 }
 g.facility=null;g.informationCounter=null;g.serviceProgress=0;g.phase='walking';g.thought='none';return'refused';
}
