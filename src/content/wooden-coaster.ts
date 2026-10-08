import type {PieceRule,RideProfile,Rules} from '../simulation/types.js';
import {woodenFootprints} from './wooden-footprints.js';

export const woodenPieces:Record<string,PieceRule>={};
for(const key of ['flat','left','right','station']){
 const curved=key==='left'||key==='right',sign=key==='left'?-1:1,count=curved?64:16;
 woodenPieces[key]={price:key==='station'?101:curved?160:61,station:key==='station',entry:{pitch:0,bank:0},end:{x:curved?128:32,y:curved?sign*128:0,z:0,turn:curved?sign:0,pitch:0,bank:0},cells:[{x:0,y:0,low:0,high:key==='station'?40:24,mask:15}],motion:{chain:false,brake:null,samples:Array.from({length:count+1},(_,i)=>{
  const angle=i*Math.PI/(2*count);return{x:curved?(i===count?128:128*Math.sin(angle)):32*i/count,y:curved?(i===count?sign*128:sign*128*(1-Math.cos(angle))):0,z:0};
 })}};
}

export function woodenProfileRecord(footprints:RideProfile['footprints']):RideProfile{
 return{motion:{tickHz:40,tileMetres:4,gravity:9810,rolling:0,drag:0,stationSpeed:200,chainSpeed:120,brakeDeceleration:8,carLength:2880,seatsPerCar:4,maxCars:2,waitTicks:160,unloadTicks:80,bankDegrees:0},pieces:structuredClone(woodenPieces),vehicle:{kind:'coupled-flat',originMm:{x:2000,y:2000,z:500},wheelbaseMm:1500,bogiePivotHeightMm:170,couplerHalfSpanMm:1340,couplerHeightMm:220,drawbarLengthMm:200,railHalfGaugeMm:480,stationDeckMm:820},footprints:structuredClone(footprints)};
}

export function withWoodenProfile(common:Rules,footprints:RideProfile['footprints']=woodenFootprints):Rules{
 return{...common,rideProfiles:{'independent.wooden-circuit-v1':woodenProfileRecord(footprints)}};
}
