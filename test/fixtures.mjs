import {Engine} from '../dist/simulation/index.js';
export const flat={motion:{samples:[{x:0,y:0,z:0},{x:32,y:0,z:0}],chain:false,brake:null},price:61,station:false,end:{x:32,y:0,z:0,turn:0,pitch:0,bank:0},entry:{pitch:0,bank:0},cells:[{x:0,y:0,low:0,high:16,mask:15}]};
export const motionRules={tickHz:40,tileMetres:4,gravity:9810,rolling:0,drag:0,stationSpeed:100,chainSpeed:80,brakeDeceleration:4,carLength:2000,seatsPerCar:2,maxCars:8,waitTicks:40,unloadTicks:40,bankDegrees:30};
export const guestRules={spawnTicks:40,walkTicks:8,decisionTicks:32,needTicks:512,queueSlotsPerTile:2,patienceTicks:4096,rideCooldownTicks:256,defaultRidePrice:20,maxRidePrice:1000,cashMin:100,cashMax:100,fareMin:100,fareMax:100,forceMin:2000,forceMax:2000,initialHunger:100,initialThirst:100,initialHappiness:800,initialEnergy:1000,needGrowth:1,rideHappiness:20,rideNausea:50};
export const serviceRules={buildPrice:200,defaultPrice:10,maxPrice:1000,foodStock:3,drinkStock:2,needThreshold:500,relief:700,initialBladder:100,serviceTicks:20,weekTicks:4096,upkeepWeeks:2,mechanicMonthlyWage:80,handymanMonthlyWage:60,rideUpkeep:20,facilityUpkeep:10,interestPer10000:100,staffWalkTicks:8,repairTicks:40,inspectionTicks:24,inspectionInterval:8192};
export const rules={services:serviceRules,guests:guestRules,motion:motionRules,id:'kernel-tests-v1',evidence:'project-candidate',pathPrice:12,portalPrice:50,terrainPrice:15,refundPerThousand:500,maxSupport:128,maxHeight:256,pieces:{
 station:{...flat,price:101,station:true},flat,
 right:{...flat,motion:{samples:Array.from({length:17},(_,i)=>i===0?{x:0,y:0,z:0}:i===16?{x:32,y:32,z:0}:{x:32*Math.sin(i*Math.PI/32),y:32*(1-Math.cos(i*Math.PI/32)),z:0}),chain:false,brake:null},price:80,end:{x:32,y:32,z:0,turn:1,pitch:0,bank:0},cells:[{x:0,y:0,low:0,high:16,mask:15},{x:32,y:0,low:0,high:16,mask:15}]},
 transition:{...flat,motion:{...flat.motion,samples:[{x:0,y:0,z:0},{x:32,y:0,z:8}]},price:90,end:{x:32,y:0,z:8,turn:0,pitch:1,bank:0},cells:[{x:0,y:0,low:0,high:32,mask:15}]},
 up:{...flat,motion:{...flat.motion,samples:[{x:0,y:0,z:0},{x:32,y:0,z:16}]},price:70,entry:{pitch:1,bank:0},end:{x:32,y:0,z:16,turn:0,pitch:1,bank:0},cells:[{x:0,y:0,low:0,high:32,mask:15}]},
 banked:{...flat,entry:{pitch:0,bank:1}},
}};
export const options={side:32,cash:10000,maxLoan:20000,seed:1234};
export const create=(overrides={})=>new Engine({...options,...overrides},rules);
export function apply(engine,command){const quote=engine.quote(command);if(!quote.ok)throw new Error(JSON.stringify(quote));const result=engine.execute(command,quote.value.revision);if(!result.ok)throw new Error(JSON.stringify(result));return result.value;}
export const ride=(engine,{x=10,y=10,height=32,direction=0}={})=>apply(engine,{type:'create-ride',name:'Lake Runner',tile:{x,y},height,direction}).id;
export const append=(engine,id,piece)=>apply(engine,{type:'append-track',ride:id,piece});
export function loop(engine){const id=ride(engine);for(const piece of ['station','right','right','flat','right','right'])append(engine,id,piece);return id;}
export function operatingPark(engine=create()){
 const id=ride(engine);
 for(const piece of ['station','station','right','right','flat','flat','right','right'])append(engine,id,piece);
 for(const [station,role,x] of [[1,'entrance',10],[2,'exit',11]])apply(engine,{type:'place-portal',ride:id,station,role,tile:{x,y:9},height:32,direction:1});
 return{engine,id};
}
