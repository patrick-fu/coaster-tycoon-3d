import type {ContentIdentity} from './registry.js';
import {resolveContent} from './registry.js';
import type {Cell,Connector,PieceRule,RideProfile,Rules} from '../simulation/types.js';
import {ensure} from '../simulation/validation.js';
import {footprint} from '../simulation/geometry.js';
import {flumeProfile} from '../simulation/flume-profile.js';
import {piecesWithCurveBank,type CurveBank} from './curve-samples.js';

export function woodenProfile(content:ContentIdentity,rules:Rules):RideProfile|null{
 const {construction,operation}=resolveContent(content).capabilities;
 if(construction.kind==='fixed'||construction.kind==='channel')return null;
 ensure(construction.kind==='tracked'&&operation.kind==='circuit'&&construction.profileId===operation.profileId,'INVALID_CONTENT','The ride has no compatible tracked operation profile.');
 if(construction.profileId==='independent-circuit-v1')return null;
 const profile=rules.rideProfiles?.[construction.profileId];
 ensure(profile,'UNSUPPORTED_CONTENT','The selected ride profile is unavailable in this receiving park.');
 return profile;
}

export function resolveRideRules(content:ContentIdentity,rules:Rules):Rules{
 const channel=flumeProfile(content,rules);if(channel)return{...rules,pieces:channel.pieces};
 const profile=woodenProfile(content,rules);
 return profile?{...rules,motion:profile.motion,pieces:profile.pieces}:rules;
}

export function rideFootprint(origin:Connector,piece:PieceRule,profile:RideProfile|null,pieceId:string):Cell[]{
 if(!profile)return footprint(origin,piece);
 return profile.footprints[pieceId]![origin.direction].map(c=>({x:(origin.x+c.x)/32,y:(origin.y+c.y)/32,low:origin.z+c.low,high:origin.z+c.high,mask:c.mask}));
}

export function legacyRuleJSON(rules:Rules):string{
 const {rideProfiles,fixedProfiles,channelProfiles,commerceProfiles,facilityProfiles,merchandiseProfiles,restroomProfiles,atmProfiles,...common}=rules;return JSON.stringify(common);
}

export function v9RuleJSON(rules:Rules):string{
 const {fixedProfiles,channelProfiles,commerceProfiles,facilityProfiles,merchandiseProfiles,restroomProfiles,atmProfiles,...previous}=rules;return JSON.stringify(previous);
}

export function v10RuleJSON(rules:Rules):string{
 const {channelProfiles,commerceProfiles,facilityProfiles,merchandiseProfiles,restroomProfiles,atmProfiles,...previous}=rules;return JSON.stringify(previous);
}

export function v11RuleJSON(rules:Rules):string{
 const {commerceProfiles,facilityProfiles,merchandiseProfiles,restroomProfiles,atmProfiles,...previous}=rules;return JSON.stringify(previous);
}

export function v12RuleJSON(rules:Rules):string{
 const {facilityProfiles,merchandiseProfiles,restroomProfiles,atmProfiles,...previous}=rules;return JSON.stringify(previous);
}

export function v13RuleJSON(rules:Rules):string{
 const {merchandiseProfiles,restroomProfiles,atmProfiles,...previous}=rules;
 // Historical13 has only the delivered stall placement profile.
 return JSON.stringify({...previous,facilityProfiles:Object.fromEntries(Object.entries(rules.facilityProfiles??{}).filter(([id])=>id==='independent.detailed-stalls-v1'))});
}

export function v14RuleJSON(rules:Rules):string{
 const {restroomProfiles,atmProfiles,...previous}=rules;
 return JSON.stringify({...previous,facilityProfiles:Object.fromEntries(Object.entries(rules.facilityProfiles??{}).filter(([id])=>id==='independent.detailed-stalls-v1'||id==='independent.information-kiosk-v1'))});
}

export function v15RuleJSON(rules:Rules):string{
 const {atmProfiles,...previous}=rules;
 return JSON.stringify({...previous,facilityProfiles:Object.fromEntries(Object.entries(rules.facilityProfiles??{}).filter(([id])=>id!=='independent.atm-v1'))});
}

function curveRules(rules:Rules,bank:CurveBank):Rules{
 const selected=structuredClone(rules);
 selected.pieces=piecesWithCurveBank(selected.pieces,32,64,bank);
 const wooden=selected.rideProfiles?.['independent.wooden-circuit-v1'];
 if(wooden)wooden.pieces=piecesWithCurveBank(wooden.pieces,64,128,bank);
 const channel=selected.channelProfiles?.['independent.log-flume-v1'];
 if(channel)channel.pieces=piecesWithCurveBank(channel.pieces,64,64,bank);
 return selected;
}

export function savedCurveRules(rules:Rules,serialized:string,version:15|16):Rules{
 const encode=version===15?v15RuleJSON:JSON.stringify;
 if(encode(rules)===serialized)return rules;
 const stable=curveRules(rules,'stable'),legacy=curveRules(rules,'legacy-browser');
 // Only complete observed banks can alias; custom or mixed receiving samples stay exact-only.
 const current=JSON.stringify(rules);
 if(current!==JSON.stringify(stable)&&current!==JSON.stringify(legacy))return rules;
 if(encode(stable)===serialized)return stable;
 if(encode(legacy)===serialized)return legacy;
 return rules;
}
