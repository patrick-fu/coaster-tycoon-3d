import {ensure,record} from '../simulation/validation.js';
import {referenceFamilies,referenceVariants} from './rct2-reference.js';
import type {ProductId} from './consumables.js';

export const CONTENT_VERSION=11 as const;
export type ContentIdentity={familyId:string,variantId:string,modeId:string};
type ServiceKind='food'|'drink'|'restroom';
type Construction={kind:'tracked',profileId:'independent-circuit-v1'|'independent.wooden-circuit-v1'|'independent.wooden-rise-return-v2'}|{kind:'channel',profileId:'independent.log-flume-v1'}|{kind:'fixed',profileId:'independent.carousel-v1'}|{kind:'facility',service:ServiceKind,profileId:'independent-services-v1'}|{kind:'facility',service:'food'|'drink',profileId:'independent.consumables-v1'|'independent.detailed-stalls-v1',productId:ProductId}|{kind:'facility',service:'restroom',profileId:'independent.gradual-restroom-v1'}|{kind:'facility',service:'information',profileId:'independent.information-kiosk-v1'}|{kind:'facility',service:'atm',profileId:'independent.atm-v1'}|{kind:'facility',service:'balloon',profileId:'independent.balloon-stall-v1'}|{kind:'unimplemented',referenceShape:string};
type Operation={kind:'circuit',profileId:'independent-circuit-v1'|'independent.wooden-circuit-v1'|'independent.wooden-rise-return-v2'}|{kind:'channel-circuit',profileId:'independent.log-flume-v1'}|{kind:'rotation',profileId:'independent.carousel-v1'}|{kind:'service',service:ServiceKind,profileId:'independent-services-v1'}|{kind:'service',service:'food'|'drink',profileId:'independent.consumables-v1',productId:ProductId}|{kind:'service',service:'restroom',profileId:'independent.gradual-restroom-service-v1'}|{kind:'service',service:'information',profileId:'independent.merchandise-v1'}|{kind:'service',service:'atm',profileId:'independent.atm-withdrawal-v1'}|{kind:'service',service:'balloon',profileId:'independent.balloon-v1'}|{kind:'unimplemented'};
export type Presentation={kind:'procedural-coaster',profileId:'classic-candidate-v1'}|{kind:'detailed-wooden-coaster',profileId:'detailed-wooden-candidate-v1'|'detailed-wooden-rise-return-v2'}|{kind:'detailed-carousel',profileId:'detailed-carousel-candidate-v1'}|{kind:'detailed-log-flume',profileId:'detailed-log-flume-candidate-v1'}|{kind:'detailed-facility',service:'food'|'drink',profileId:'detailed-consumable-stalls-v1'}|{kind:'detailed-facility',service:'restroom',profileId:'detailed-gradual-restroom-v1'}|{kind:'detailed-facility',service:'information',profileId:'detailed-information-kiosk-v1'}|{kind:'procedural-facility',service:ServiceKind,profileId:'classic-candidate-v1'}|{kind:'detailed-facility',service:'atm',profileId:'detailed-atm-v1'}|{kind:'detailed-facility',service:'balloon',profileId:'detailed-balloon-stall-v1'}|{kind:'unimplemented'};
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
const woodenRiseReturnIdentity:ContentIdentity={...woodenIdentity,variantId:'independent.wooden-rise-return-train'};
families.set(woodenIdentity.familyId,{id:woodenIdentity.familyId,label:'Independent wooden coaster',category:'rollerCoaster',reference:null});
variants.set(woodenIdentity.variantId,{id:woodenIdentity.variantId,label:'Detailed four-seat wooden train',reference:null,choices:[{familyId:woodenIdentity.familyId,modeIds:[woodenIdentity.modeId],capabilities:{construction:{kind:'tracked',profileId:'independent.wooden-circuit-v1'},operation:{kind:'circuit',profileId:'independent.wooden-circuit-v1'},presentation:{kind:'detailed-wooden-coaster',profileId:'detailed-wooden-candidate-v1'}}}]});
variants.set(woodenRiseReturnIdentity.variantId,{id:woodenRiseReturnIdentity.variantId,label:'Wooden rise-and-return train',reference:null,choices:[{familyId:woodenRiseReturnIdentity.familyId,modeIds:[woodenRiseReturnIdentity.modeId],capabilities:{construction:{kind:'tracked',profileId:'independent.wooden-rise-return-v2'},operation:{kind:'circuit',profileId:'independent.wooden-rise-return-v2'},presentation:{kind:'detailed-wooden-coaster',profileId:'detailed-wooden-rise-return-v2'}}}]});
const carouselIdentity:ContentIdentity={familyId:'independent.carousel',variantId:'independent.sixteen-seat-carousel',modeId:'independent.timed-rotation'};
families.set(carouselIdentity.familyId,{id:carouselIdentity.familyId,label:'Independent Carousel',category:'gentle',reference:null});
modes.set(carouselIdentity.modeId,{id:carouselIdentity.modeId,label:'Independent timed rotation',evidence:'project-candidate'});
variants.set(carouselIdentity.variantId,{id:carouselIdentity.variantId,label:'Sixteen-seat canopy Carousel',reference:null,choices:[{familyId:carouselIdentity.familyId,modeIds:[carouselIdentity.modeId],capabilities:{construction:{kind:'fixed',profileId:'independent.carousel-v1'},operation:{kind:'rotation',profileId:'independent.carousel-v1'},presentation:{kind:'detailed-carousel',profileId:'detailed-carousel-candidate-v1'}}}]});
const flumeIdentity:ContentIdentity={familyId:'independent.log-flume',variantId:'independent.four-seat-log',modeId:'independent.channel-circuit'};
families.set(flumeIdentity.familyId,{id:flumeIdentity.familyId,label:'Independent Log Flume',category:'water',reference:null});
modes.set(flumeIdentity.modeId,{id:flumeIdentity.modeId,label:'Independent channel circuit',evidence:'project-candidate'});
variants.set(flumeIdentity.variantId,{id:flumeIdentity.variantId,label:'Four-seat carved log boat',reference:null,choices:[{familyId:flumeIdentity.familyId,modeIds:[flumeIdentity.modeId],capabilities:{construction:{kind:'channel',profileId:'independent.log-flume-v1'},operation:{kind:'channel-circuit',profileId:'independent.log-flume-v1'},presentation:{kind:'detailed-log-flume',profileId:'detailed-log-flume-candidate-v1'}}}]});
for(const service of ['food','drink','restroom'] as const){
 const familyId=`independent.${service}-facility`,variantId=`independent.${service==='restroom'?'restroom':service+'-stand'}`,modeId=service==='restroom'?'independent.restroom-service':'independent.retail';
 families.set(familyId,{id:familyId,label:`Independent ${service} facility`,category:'commercial',reference:null});
 modes.set(modeId,{id:modeId,label:service==='restroom'?'Independent restroom service':'Independent retail service',evidence:'project-candidate'});
 variants.set(variantId,{id:variantId,label:`Independent ${service} facility`,reference:null,choices:[{familyId,modeIds:[modeId],capabilities:{construction:{kind:'facility',service,profileId:'independent-services-v1'},operation:{kind:'service',service,profileId:'independent-services-v1'},presentation:{kind:'procedural-facility',service,profileId:'classic-candidate-v1'}}}]});
}
for(const [service,variantId,productId,label] of [['food','independent.burger-stand','independent.burger','Independent Burger stand'],['drink','independent.soft-drink-stand','independent.soft-drink','Independent Soft-drink stand']] as const){
 const familyId='independent.'+service+'-facility',modeId='independent.retail',profileId='independent.consumables-v1' as const;
 variants.set(variantId,{id:variantId,label,reference:null,choices:[{familyId,modeIds:[modeId],capabilities:{construction:{kind:'facility',service,profileId,productId},operation:{kind:'service',service,profileId,productId},presentation:{kind:'procedural-facility',service,profileId:'classic-candidate-v1'}}}]});
}
for(const [service,variantId,productId,label] of [['food','independent.detailed-burger-stand','independent.burger','Detailed Burger stand'],['drink','independent.detailed-soft-drink-stand','independent.soft-drink','Detailed Soft-drink stand']] as const){
 const familyId='independent.'+service+'-facility',modeId='independent.retail';
 variants.set(variantId,{id:variantId,label,reference:null,choices:[{familyId,modeIds:[modeId],capabilities:{construction:{kind:'facility',service,profileId:'independent.detailed-stalls-v1',productId},operation:{kind:'service',service,profileId:'independent.consumables-v1',productId},presentation:{kind:'detailed-facility',service,profileId:'detailed-consumable-stalls-v1'}}}]});
}
const informationIdentity:ContentIdentity={familyId:'independent.information-facility',variantId:'independent.timber-information-kiosk',modeId:'independent.retail'};
families.set(informationIdentity.familyId,{id:informationIdentity.familyId,label:'Independent Information kiosk',category:'commercial',reference:null});
variants.set(informationIdentity.variantId,{id:informationIdentity.variantId,label:'Four-counter timber Information kiosk',reference:null,choices:[{familyId:informationIdentity.familyId,modeIds:[informationIdentity.modeId],capabilities:{construction:{kind:'facility',service:'information',profileId:'independent.information-kiosk-v1'},operation:{kind:'service',service:'information',profileId:'independent.merchandise-v1'},presentation:{kind:'detailed-facility',service:'information',profileId:'detailed-information-kiosk-v1'}}}]});
const restroomIdentity:ContentIdentity={familyId:'independent.restroom-facility',variantId:'independent.gradual-restroom',modeId:'independent.gradual-restroom-service'};
modes.set(restroomIdentity.modeId,{id:restroomIdentity.modeId,label:'Independent gradual restroom service',evidence:'project-candidate'});
variants.set(restroomIdentity.variantId,{id:restroomIdentity.variantId,label:'Detailed Victorian restroom',reference:null,choices:[{familyId:restroomIdentity.familyId,modeIds:[restroomIdentity.modeId],capabilities:{construction:{kind:'facility',service:'restroom',profileId:'independent.gradual-restroom-v1'},operation:{kind:'service',service:'restroom',profileId:'independent.gradual-restroom-service-v1'},presentation:{kind:'detailed-facility',service:'restroom',profileId:'detailed-gradual-restroom-v1'}}}]});
const atmIdentity:ContentIdentity={familyId:'independent.atm-facility',variantId:'independent.cash-machine',modeId:'independent.cash-withdrawal'};
families.set(atmIdentity.familyId,{id:atmIdentity.familyId,label:'Independent Cash machine',category:'commercial',reference:null});
modes.set(atmIdentity.modeId,{id:atmIdentity.modeId,label:'Independent cash withdrawal',evidence:'project-candidate'});
variants.set(atmIdentity.variantId,{id:atmIdentity.variantId,label:'Detailed park Cash machine',reference:null,choices:[{familyId:atmIdentity.familyId,modeIds:[atmIdentity.modeId],capabilities:{construction:{kind:'facility',service:'atm',profileId:'independent.atm-v1'},operation:{kind:'service',service:'atm',profileId:'independent.atm-withdrawal-v1'},presentation:{kind:'detailed-facility',service:'atm',profileId:'detailed-atm-v1'}}}]});
const balloonIdentity:ContentIdentity={familyId:'independent.balloon-facility',variantId:'independent.timber-balloon-stall',modeId:'independent.retail'};
families.set(balloonIdentity.familyId,{id:balloonIdentity.familyId,label:'Independent Balloon Stall',category:'commercial',reference:null});
variants.set(balloonIdentity.variantId,{id:balloonIdentity.variantId,label:'Detailed timber Balloon Stall',reference:null,choices:[{familyId:balloonIdentity.familyId,modeIds:[balloonIdentity.modeId],capabilities:{construction:{kind:'facility',service:'balloon',profileId:'independent.balloon-stall-v1'},operation:{kind:'service',service:'balloon',profileId:'independent.balloon-v1'},presentation:{kind:'detailed-facility',service:'balloon',profileId:'detailed-balloon-stall-v1'}}}]});
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
export function woodenRiseReturnRideContent():ContentIdentity{return{...woodenRiseReturnIdentity};}
export function carouselRideContent():ContentIdentity{return{...carouselIdentity};}
export function flumeRideContent():ContentIdentity{return{...flumeIdentity};}
export function consumableFacilityContent(product:ProductId):ContentIdentity{return{familyId:'independent.'+(product==='independent.burger'?'food':'drink')+'-facility',variantId:product==='independent.burger'?'independent.burger-stand':'independent.soft-drink-stand',modeId:'independent.retail'};}
export function detailedFacilityContent(product:ProductId):ContentIdentity{return{...consumableFacilityContent(product),variantId:product==='independent.burger'?'independent.detailed-burger-stand':'independent.detailed-soft-drink-stand'};}
export function legacyFacilityContent(service:ServiceKind):ContentIdentity{return{familyId:`independent.${service}-facility`,variantId:`independent.${service==='restroom'?'restroom':service+'-stand'}`,modeId:service==='restroom'?'independent.restroom-service':'independent.retail'};}

export function gradualRestroomContent():ContentIdentity{return{...restroomIdentity};}
export function atmContent():ContentIdentity{return{...atmIdentity};}
export function balloonContent():ContentIdentity{return{...balloonIdentity};}

export function informationFacilityContent():ContentIdentity{return{...informationIdentity};}

export function historicalContentAllowed(value:ContentIdentity,kind:'ride'|ServiceKind|'information'|'atm'|'balloon',version:number):boolean{
 const allowed:ContentIdentity[]=kind==='balloon'?(version>=18?[balloonIdentity]:[]):kind==='atm'?(version>=16?[atmIdentity]:[]):kind==='ride'?[rideIdentity,...(version>=9?[woodenIdentity]:[]),...(version>=10?[carouselIdentity]:[]),...(version>=11?[flumeIdentity]:[]),...(version>=17?[woodenRiseReturnIdentity]:[])]:kind==='information'?(version>=14?[informationIdentity]:[]):[legacyFacilityContent(kind)];
 if((kind==='food'||kind==='drink')&&version>=12){const product=kind==='food'?'independent.burger':'independent.soft-drink';allowed.push(consumableFacilityContent(product));if(version>=13)allowed.push(detailedFacilityContent(product));}
 if(kind==='restroom'&&version>=15)allowed.push(restroomIdentity);
 return allowed.some(c=>c.familyId===value?.familyId&&c.variantId===value?.variantId&&c.modeId===value?.modeId);
}

export function resolveContent(value:unknown):ResolvedContent{
 record(value,['familyId','variantId','modeId']);
 ensure([value.familyId,value.variantId,value.modeId].every(id=>typeof id==='string'&&id.length>0&&id.length<=160),'INVALID_CONTENT','Invalid content identity.');
 const content=value as ContentIdentity,family=families.get(content.familyId),variant=variants.get(content.variantId),mode=modes.get(content.modeId);
 ensure(family&&variant&&mode,'UNKNOWN_CONTENT','Unknown family, variant or operating mode.');
 const choice=variant.choices.find(c=>c.familyId===family.id);
 ensure(choice&&choice.modeIds.includes(mode.id),'INVALID_CONTENT','The selected variant does not support this family and operating mode.');
 return{content:{...content},capabilities:structuredClone(choice.capabilities),evidence:variant.reference?'reconstructed-reference':'project-candidate'};
}

export function executableContent(value:unknown,kind:'ride'|ServiceKind|'information'|'atm'|'balloon'):ContentIdentity{
 const resolved=resolveContent(value),{construction,operation,presentation}=resolved.capabilities;
 ensure(construction.kind!=='unimplemented'&&operation.kind!=='unimplemented'&&presentation.kind!=='unimplemented','UNSUPPORTED_CONTENT','This reference content has no executable construction, operation and presentation implementation yet.');
 ensure(kind==='ride'?(construction.kind==='tracked'&&operation.kind==='circuit'&&(presentation.kind==='procedural-coaster'||presentation.kind==='detailed-wooden-coaster'))||(construction.kind==='fixed'&&operation.kind==='rotation'&&presentation.kind==='detailed-carousel')||(construction.kind==='channel'&&operation.kind==='channel-circuit'&&presentation.kind==='detailed-log-flume'):construction.kind==='facility'&&construction.service===kind&&operation.kind==='service'&&operation.service===kind&&(presentation.kind==='procedural-facility'||presentation.kind==='detailed-facility')&&presentation.service===kind,'INVALID_CONTENT','Content capabilities do not match the requested instance kind.');
 return resolved.content;
}

export function catalogue(availableProfiles:ReadonlySet<string>=new Set()){
 return structuredClone({contentVersion:CONTENT_VERSION,families:[...families.values()],variants:[...variants.values()].map(v=>({...v,choices:v.choices.map(c=>({...c,runtimeAvailable:c.capabilities.construction.kind!=='unimplemented'&&c.capabilities.operation.kind!=='unimplemented'&&c.capabilities.presentation.kind!=='unimplemented'&&(c.capabilities.construction.profileId==='independent-circuit-v1'||c.capabilities.construction.profileId==='independent-services-v1'||availableProfiles.has(c.capabilities.construction.profileId))&&(c.capabilities.operation.kind!=='service'||(c.capabilities.operation.service!=='information'&&c.capabilities.operation.service!=='atm'&&c.capabilities.operation.service!=='balloon'&&c.capabilities.operation.profileId!=='independent.gradual-restroom-service-v1')||availableProfiles.has(c.capabilities.operation.profileId))}))})),modes:[...modes.values()]});
}
