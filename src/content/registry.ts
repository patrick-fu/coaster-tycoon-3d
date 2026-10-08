import {ensure,record} from '../simulation/validation.js';
import {referenceFamilies,referenceVariants} from './rct2-reference.js';

export const CONTENT_VERSION=3 as const;
export type ContentIdentity={familyId:string,variantId:string,modeId:string};
type ServiceKind='food'|'drink'|'restroom';
type Construction={kind:'tracked',profileId:'independent-circuit-v1'|'independent.wooden-circuit-v1'}|{kind:'fixed',profileId:'independent.carousel-v1'}|{kind:'facility',service:ServiceKind,profileId:'independent-services-v1'}|{kind:'unimplemented',referenceShape:string};
type Operation={kind:'circuit',profileId:'independent-circuit-v1'|'independent.wooden-circuit-v1'}|{kind:'rotation',profileId:'independent.carousel-v1'}|{kind:'service',service:ServiceKind,profileId:'independent-services-v1'}|{kind:'unimplemented'};
export type Presentation={kind:'procedural-coaster',profileId:'classic-candidate-v1'}|{kind:'detailed-wooden-coaster',profileId:'detailed-wooden-candidate-v1'}|{kind:'detailed-carousel',profileId:'detailed-carousel-candidate-v1'}|{kind:'procedural-facility',service:ServiceKind,profileId:'classic-candidate-v1'}|{kind:'unimplemented'};
type Capabilities={construction:Construction,operation:Operation,presentation:Presentation};
type Family={id:string,label:string,category:string,reference:{originalSlot:number,sourceUrl:string}|null};
type Choice={familyId:string,modeIds:string[],capabilities:Capabilities};
type Variant={id:string,label:string,choices:Choice[],reference:{id:string,sourceUrl:string}|null};
type Mode={id:string,label:string,evidence:'project-candidate'|'reconstructed-reference'};
export type ResolvedContent={content:ContentIdentity,capabilities:Capabilities,evidence:'project-candidate'|'reconstructed-reference'};

const rideIdentity:ContentIdentity={familyId:'independent.circuit-coaster',variantId:'independent.steel-train',modeId:'independent.continuous-circuit'};
const families=new Map<string,Family>(),variants=new Map<string,Variant>(),modes=new Map<string,Mode>();
families.set(rideIdentity.familyId,{id:rideIdentity.familyId,label:'Independent circuit coaster',category:'rollerCoaster',reference:null});
modes.set(rideIdentity.modeId,{id:rideIdentity.modeId,label:'Independent continuous circuit',evidence:'project-candidate'});
variants.set(rideIdentity.variantId,{id:rideIdentity.variantId,label:'Independent uniform steel train',reference:null,choices:[{familyId:rideIdentity.familyId,modeIds:[rideIdentity.modeId],capabilities:{construction:{kind:'tracked',profileId:'independent-circuit-v1'},operation:{kind:'circuit',profileId:'independent-circuit-v1'},presentation:{kind:'procedural-coaster',profileId:'classic-candidate-v1'}}}]});
const woodenIdentity:ContentIdentity={familyId:'independent.wooden-circuit-coaster',variantId:'independent.wooden-four-seat-train',modeId:rideIdentity.modeId};
families.set(woodenIdentity.familyId,{id:woodenIdentity.familyId,label:'Independent wooden coaster',category:'rollerCoaster',reference:null});
variants.set(woodenIdentity.variantId,{id:woodenIdentity.variantId,label:'Detailed four-seat wooden train',reference:null,choices:[{familyId:woodenIdentity.familyId,modeIds:[woodenIdentity.modeId],capabilities:{construction:{kind:'tracked',profileId:'independent.wooden-circuit-v1'},operation:{kind:'circuit',profileId:'independent.wooden-circuit-v1'},presentation:{kind:'detailed-wooden-coaster',profileId:'detailed-wooden-candidate-v1'}}}]});
const carouselIdentity:ContentIdentity={familyId:'independent.carousel',variantId:'independent.sixteen-seat-carousel',modeId:'independent.timed-rotation'};
families.set(carouselIdentity.familyId,{id:carouselIdentity.familyId,label:'Independent Carousel',category:'gentle',reference:null});
modes.set(carouselIdentity.modeId,{id:carouselIdentity.modeId,label:'Independent timed rotation',evidence:'project-candidate'});
variants.set(carouselIdentity.variantId,{id:carouselIdentity.variantId,label:'Sixteen-seat canopy Carousel',reference:null,choices:[{familyId:carouselIdentity.familyId,modeIds:[carouselIdentity.modeId],capabilities:{construction:{kind:'fixed',profileId:'independent.carousel-v1'},operation:{kind:'rotation',profileId:'independent.carousel-v1'},presentation:{kind:'detailed-carousel',profileId:'detailed-carousel-candidate-v1'}}}]});
for(const service of ['food','drink','restroom'] as const){
 const familyId=`independent.${service}-facility`,variantId=`independent.${service==='restroom'?'restroom':service+'-stand'}`,modeId=service==='restroom'?'independent.restroom-service':'independent.retail';
 families.set(familyId,{id:familyId,label:`Independent ${service} facility`,category:'commercial',reference:null});
 modes.set(modeId,{id:modeId,label:service==='restroom'?'Independent restroom service':'Independent retail service',evidence:'project-candidate'});
 variants.set(variantId,{id:variantId,label:`Independent ${service} facility`,reference:null,choices:[{familyId,modeIds:[modeId],capabilities:{construction:{kind:'facility',service,profileId:'independent-services-v1'},operation:{kind:'service',service,profileId:'independent-services-v1'},presentation:{kind:'procedural-facility',service,profileId:'classic-candidate-v1'}}}]});
}
for(const f of referenceFamilies)families.set(f.id,{id:f.id,label:f.label,category:f.category,reference:{originalSlot:f.originalSlot,sourceUrl:f.sourceUrl}});
for(const v of referenceVariants){
 const choices:Choice[]=v.choices.map(c=>{
  for(const modeId of c.modeIds)modes.set(modeId,{id:modeId,label:modeId.split('.').at(-1)!,evidence:'reconstructed-reference'});
  const family=referenceFamilies.find(f=>f.id===c.familyId)!;
  return{familyId:c.familyId,modeIds:[...c.modeIds],capabilities:{construction:{kind:'unimplemented',referenceShape:family.startPiece},operation:{kind:'unimplemented'},presentation:{kind:'unimplemented'}}};
 });
 variants.set(v.id,{id:v.id,label:v.label,choices,reference:{id:v.referenceId,sourceUrl:v.sourceUrl}});
}

export function legacyRideContent():ContentIdentity{return{...rideIdentity};}
export function woodenRideContent():ContentIdentity{return{...woodenIdentity};}
export function carouselRideContent():ContentIdentity{return{...carouselIdentity};}
export function legacyFacilityContent(service:ServiceKind):ContentIdentity{return{familyId:`independent.${service}-facility`,variantId:`independent.${service==='restroom'?'restroom':service+'-stand'}`,modeId:service==='restroom'?'independent.restroom-service':'independent.retail'};}

export function resolveContent(value:unknown):ResolvedContent{
 record(value,['familyId','variantId','modeId']);
 ensure([value.familyId,value.variantId,value.modeId].every(id=>typeof id==='string'&&id.length>0&&id.length<=160),'INVALID_CONTENT','Invalid content identity.');
 const content=value as ContentIdentity,family=families.get(content.familyId),variant=variants.get(content.variantId),mode=modes.get(content.modeId);
 ensure(family&&variant&&mode,'UNKNOWN_CONTENT','Unknown family, variant or operating mode.');
 const choice=variant.choices.find(c=>c.familyId===family.id);
 ensure(choice&&choice.modeIds.includes(mode.id),'INVALID_CONTENT','The selected variant does not support this family and operating mode.');
 return{content:{...content},capabilities:structuredClone(choice.capabilities),evidence:variant.reference?'reconstructed-reference':'project-candidate'};
}

export function executableContent(value:unknown,kind:'ride'|ServiceKind):ContentIdentity{
 const resolved=resolveContent(value),{construction,operation,presentation}=resolved.capabilities;
 ensure(construction.kind!=='unimplemented'&&operation.kind!=='unimplemented'&&presentation.kind!=='unimplemented','UNSUPPORTED_CONTENT','This reference content has no executable construction, operation and presentation implementation yet.');
 ensure(kind==='ride'?(construction.kind==='tracked'&&operation.kind==='circuit'&&(presentation.kind==='procedural-coaster'||presentation.kind==='detailed-wooden-coaster'))||(construction.kind==='fixed'&&operation.kind==='rotation'&&presentation.kind==='detailed-carousel'):construction.kind==='facility'&&construction.service===kind&&operation.kind==='service'&&operation.service===kind&&presentation.kind==='procedural-facility'&&presentation.service===kind,'INVALID_CONTENT','Content capabilities do not match the requested instance kind.');
 return resolved.content;
}

export function catalogue(availableProfiles:ReadonlySet<string>=new Set()){
 return structuredClone({contentVersion:CONTENT_VERSION,families:[...families.values()],variants:[...variants.values()].map(v=>({...v,choices:v.choices.map(c=>({...c,runtimeAvailable:c.capabilities.construction.kind!=='unimplemented'&&c.capabilities.operation.kind!=='unimplemented'&&c.capabilities.presentation.kind!=='unimplemented'&&(!(c.capabilities.construction.kind==='tracked'||c.capabilities.construction.kind==='fixed')||c.capabilities.construction.profileId==='independent-circuit-v1'||availableProfiles.has(c.capabilities.construction.profileId))}))})),modes:[...modes.values()]});
}
