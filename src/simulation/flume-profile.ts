import type {ContentIdentity} from '../content/registry.js';
import {legacyRideContent,resolveContent} from '../content/registry.js';
import {flumeCandidate,flumePieces,flumeProfileId,type FlumeProfile} from '../content/log-flume.js';
import type {ChannelRideProfile,Rules} from './types.js';
import {validateRules} from './geometry.js';
import {ensure,integer,record} from './validation.js';

export function flumeProfile(content:ContentIdentity,rules:Rules):ChannelRideProfile|null{
 const {construction,operation}=resolveContent(content??legacyRideContent()).capabilities;
 if(construction.kind!=='channel')return null;
 ensure(operation.kind==='channel-circuit'&&construction.profileId===operation.profileId,'INVALID_CONTENT','The channel has no matching boat operation.');
 const profile=rules.channelProfiles?.[construction.profileId];
 ensure(profile,'UNSUPPORTED_CONTENT','The channel profile is unavailable in this receiving park.');
 return profile;
}

export function validateChannelProfiles(input:Rules['channelProfiles'],rules:Rules):Record<string,ChannelRideProfile>{
 const supplied=input===undefined?{}:input;
 ensure(supplied!==null&&typeof supplied==='object'&&!Array.isArray(supplied),'INVALID_COMMAND','Invalid channel profiles.');
 const ids=Object.keys(supplied);record(supplied,ids);
 ensure(ids.length<=1&&ids.every(id=>id===flumeProfileId),'UNSUPPORTED_CONTENT','Unavailable channel profile.');
 const profiles:Record<string,ChannelRideProfile>={};
 for(const id of ids){
  const value=supplied[id]!;record(value,['vehicle','pieces']);const p=value.vehicle;record(p,Object.keys(flumeCandidate));
  ensure(rules.motion.tileMetres===4&&rules.motion.tickHz===40,'INVALID_COMMAND','The Log Flume requires its authored4m/40Hz world.');
  for(const key of Object.keys(flumeCandidate) as (keyof FlumeProfile)[])if(key!=='seats')ensure(integer(p[key],1,1000000)&&p[key]===flumeCandidate[key],'INVALID_COMMAND','Channel parameter differs from the finite candidate.');
  ensure(Array.isArray(p.seats)&&p.seats.length===4,'INVALID_COMMAND','The boat requires four ordered hip datums.');
  for(let slot=0;slot<4;slot++){
   const seat=p.seats[slot]!,expected=flumeCandidate.seats[slot]!;record(seat,['x','y','z']);
   ensure(seat.x===expected.x&&seat.y===expected.y&&seat.z===expected.z,'INVALID_COMMAND','Boat hip datum differs from the unit asset.');
  }
  const selected=validateRules({...rules,pieces:value.pieces}),expected=validateRules({...rules,pieces:flumePieces});
  ensure(JSON.stringify(selected.pieces)===JSON.stringify(expected.pieces),'GEOMETRY','Channel pieces differ from the qualified finite geometry.');
  const vehicle=Object.fromEntries(Object.keys(flumeCandidate).map(key=>[key,key==='seats'?p.seats.map(s=>({x:s.x,y:s.y,z:s.z})):p[key as keyof FlumeProfile]])) as FlumeProfile;
  profiles[id]={vehicle,pieces:selected.pieces};
 }
 return profiles;
}
