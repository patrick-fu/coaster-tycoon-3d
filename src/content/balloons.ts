import type {ContentIdentity} from './registry.js';
import {resolveContent} from './registry.js';
import type {Rules} from '../simulation/types.js';
import {ensure,integer,record} from '../simulation/validation.js';

export const balloonProfileId='independent.balloon-v1' as const;
export const balloonPlacementId='independent.balloon-stall-v1' as const;
export const defaultBalloonColour=11;
export type BalloonProfile={stockCost:number,defaultPrice:number,maxPrice:number,value:number};
export type BalloonAccount={sales:number,income:number};
// Reconstructed project seeds, in integer tenths; original demand and prices remain unverified.
export const defaultBalloonProfile:BalloonProfile={stockCost:3,defaultPrice:9,maxPrice:1000,value:14};

export function withBalloonProfile(base:Rules):Rules{return{...base,balloonProfiles:{...base.balloonProfiles,[balloonProfileId]:{...defaultBalloonProfile}},facilityProfiles:{...base.facilityProfiles,[balloonPlacementId]:{height:32}}};}
export function withoutBalloonProfile(base:Rules):Rules{return{...base,facilityProfiles:Object.fromEntries(Object.entries(base.facilityProfiles??{}).filter(([id])=>id!==balloonPlacementId)),balloonProfiles:{}};}
export function hasBalloonProfile(rules:Rules):boolean{return Object.hasOwn(rules.balloonProfiles??{},balloonProfileId);}
export function balloonProfile(rules:Rules):BalloonProfile{const p=rules.balloonProfiles?.[balloonProfileId];ensure(p,'UNSUPPORTED_CONTENT','The receiving park has no balloon profile.');return p;}
export function validateBalloonProfiles(input:Rules['balloonProfiles']):Record<string,BalloonProfile>{
 const supplied=input===undefined?{}:input;
 ensure(supplied!==null&&typeof supplied==='object'&&!Array.isArray(supplied),'INVALID_COMMAND','Invalid balloon profiles.');const ids=Object.keys(supplied);record(supplied,ids);
 ensure(ids.length<=1&&ids.every(id=>id===balloonProfileId),'UNSUPPORTED_CONTENT','Unavailable balloon profile.');
 if(!ids.length)return{};
 const p=supplied[balloonProfileId]!;record(p,['stockCost','defaultPrice','maxPrice','value']);
 ensure(integer(p.stockCost,0,1000000)&&integer(p.defaultPrice,0,p.maxPrice)&&integer(p.maxPrice,0,1000)&&integer(p.value,0,1000000),'INVALID_COMMAND','Invalid balloon price or value profile.');
 return{[balloonProfileId]:{stockCost:p.stockCost,defaultPrice:p.defaultPrice,maxPrice:p.maxPrice,value:p.value}};
}
export function facilityBalloon(content:ContentIdentity,rules:Rules):BalloonProfile|null{
 const {construction:c,operation:o}=resolveContent(content).capabilities;
 if(c.kind!=='facility'||c.service!=='balloon')return null;
 ensure(c.profileId===balloonPlacementId&&o.kind==='service'&&o.service==='balloon'&&o.profileId===balloonProfileId,'INVALID_CONTENT','The balloon stall requires compatible product and placement profiles.');
 return balloonProfile(rules);
}
