import type {ContentIdentity} from './registry.js';
import {resolveContent} from './registry.js';
import type {Cell,Connector,PieceRule,RideProfile,Rules} from '../simulation/types.js';
import {ensure} from '../simulation/validation.js';
import {footprint} from '../simulation/geometry.js';

export function woodenProfile(content:ContentIdentity,rules:Rules):RideProfile|null{
 const {construction,operation}=resolveContent(content).capabilities;
 ensure(construction.kind==='tracked'&&operation.kind==='circuit'&&construction.profileId===operation.profileId,'INVALID_CONTENT','The ride has no compatible tracked operation profile.');
 if(construction.profileId==='independent-circuit-v1')return null;
 const profile=rules.rideProfiles?.[construction.profileId];
 ensure(profile,'UNSUPPORTED_CONTENT','The selected ride profile is unavailable in this receiving park.');
 return profile;
}

export function resolveRideRules(content:ContentIdentity,rules:Rules):Rules{
 const profile=woodenProfile(content,rules);
 return profile?{...rules,motion:profile.motion,pieces:profile.pieces}:rules;
}

export function rideFootprint(origin:Connector,piece:PieceRule,profile:RideProfile|null,pieceId:string):Cell[]{
 if(!profile)return footprint(origin,piece);
 return profile.footprints[pieceId]![origin.direction].map(c=>({x:(origin.x+c.x)/32,y:(origin.y+c.y)/32,low:origin.z+c.low,high:origin.z+c.high,mask:c.mask}));
}

export function legacyRuleJSON(rules:Rules):string{
 const {rideProfiles,...common}=rules;return JSON.stringify(common);
}
