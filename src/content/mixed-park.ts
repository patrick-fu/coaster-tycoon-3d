import {newPark,steelRules} from './steel-coaster.js';
import {withWoodenProfile} from './wooden-coaster.js';
import {woodenRideContent} from './registry.js';
import {carouselRideContent} from './registry.js';
import {withCarouselProfile} from './carousel.js';
import type {Command,Rules} from '../simulation/types.js';

export const mixedRules=withCarouselProfile(withWoodenProfile(steelRules));

export function newMixedPark(rules:Rules=mixedRules){
 const engine=newPark(rules);
 const apply=(command:Command)=>{
  const quote=engine.quote(command);if(!quote.ok)throw new Error(quote.error.message);
  const receipt=engine.execute(command,quote.value.revision);if(!receipt.ok)throw new Error(receipt.error.message);
  return receipt.value.id!;
 };
 const path=(x:number,y:number,queueFor:number|null)=>{
  const existing=engine.snapshot().elements.find(e=>e.kind==='path'&&e.tile.x===x&&e.tile.y===y&&e.height===32);
  if(existing)return;
  for(const e of engine.snapshot().elements)if(e.kind==='scenery'&&e.tile.x===x&&e.tile.y===y)apply({type:'remove-scenery',id:e.id});
  apply({type:'place-path',tile:{x,y},height:32,queueFor});
 };
 for(let x=2;x<=6;x++)path(x,13,null);
 for(let y=14;y<=30;y++)path(2,y,null);
 for(let x=3;x<=7;x++)path(x,29,null);
 path(3,30,null);path(7,30,null);path(7,31,null);
 const ride=apply({type:'create-ride',name:'Cedar Timber Run',tile:{x:6,y:33},height:32,direction:0,content:woodenRideContent()}),stations:number[]=[];
 for(const piece of ['station','station','flat','flat','right','flat','flat','flat','flat','right','flat','flat','flat','flat','right','flat','flat','flat','flat','right']){
  const id=apply({type:'append-track',ride,piece});if(piece==='station')stations.push(id);
 }
 apply({type:'set-train-cars',ride,cars:2});
 apply({type:'place-portal',ride,station:stations[0]!,role:'entrance',tile:{x:6,y:32},height:32,direction:1});
 apply({type:'place-portal',ride,station:stations[1]!,role:'exit',tile:{x:7,y:32},height:32,direction:1});
 for(const [x,y] of [[4,30],[5,30],[6,30],[6,31]])path(x!,y!,ride);
 for(const [sceneryType,x,y] of [
  ['tree',9,38],['tree',11,38],['rock',10,39],['tree',8,40],['tree',12,40],['hedge',9,41],['rock',11,41],
  ['flower',3,31],['flower',8,30],['hedge',8,31],['tree',1,30],['flower',5,28],['hedge',3,28],
  ['tree',14,46],['rock',17,44],['tree',18,39],['tree',18,35],
 ] as const)apply({type:'place-scenery',sceneryType,tile:{x,y},height:32});
 apply({type:'set-ride-status',ride,status:'testing'});
 const warm=engine.advance(2400);if(!warm.ok)throw new Error(warm.error.message);
 apply({type:'set-ride-status',ride,status:'open'});
 return engine;
}

export function newCarouselPark(rules:Rules=mixedRules){
 const engine=newMixedPark(rules);
 const apply=(command:Command)=>{const q=engine.quote(command);if(!q.ok)throw new Error(q.error.message);const r=engine.execute(command,q.value.revision);if(!r.ok)throw new Error(r.error.message);return r.value.id!;};
 const clear=(x:number,y:number)=>{for(const e of engine.snapshot().elements)if(e.kind==='scenery'&&e.tile.x===x&&e.tile.y===y)apply({type:'remove-scenery',id:e.id});};
 for(let x=27;x<=30;x++)for(let y=5;y<=7;y++)clear(x,y);
 const ride=apply({type:'create-ride',name:'Golden Carousel',tile:{x:27,y:5},height:32,direction:2,content:carouselRideContent()}),body=engine.snapshot().rides.find(r=>r.id===ride)!.body!;
 apply({type:'place-portal',ride,station:body,role:'entrance',tile:{x:30,y:7},height:32,direction:2});
 apply({type:'place-portal',ride,station:body,role:'exit',tile:{x:30,y:5},height:32,direction:2});
 const path=(x:number,y:number,queueFor:number|null)=>{if(engine.snapshot().elements.some(e=>e.kind==='path'&&e.tile.x===x&&e.tile.y===y&&e.height===32))return;clear(x,y);apply({type:'place-path',tile:{x,y},height:32,queueFor});};
 for(let x=31;x<=34;x++)path(x,14,null);for(let y=5;y<=13;y++)path(34,y,null);for(let x=31;x<=33;x++)path(x,5,null);for(let x=31;x<=33;x++)path(x,7,ride);
 apply({type:'set-ride-status',ride,status:'open'});
 return engine;
}
