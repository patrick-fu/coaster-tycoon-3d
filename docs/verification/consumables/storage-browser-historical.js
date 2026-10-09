const assert=(value,message)=>{if(!value)throw new Error(message);};
const unwrap=(result,label)=>{assert(result.ok,label+': '+JSON.stringify(result));return result.value;};
const apply=(engine,command)=>unwrap(engine.execute(command,unwrap(engine.quote(command),'quote').revision),'execute');
const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('');
const sort=value=>Array.isArray(value)?value.map(sort):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,sort(value[k])])):value;
function inverseSave(text,version){
 const s=JSON.parse(text);assert(s.version===12&&s.contentVersion===5,'Expected current authority');const newRules=JSON.parse(s.rules);delete newRules.commerceProfiles;s.rules=JSON.stringify(newRules);for(const g of s.people.guests){assert(g.held===null,'Historical buyer gained a new item');delete g.held;}if(version===11){s.version=11;s.contentVersion=4;return JSON.stringify(s);}assert(s.boats.length===0,'Unexpected Boat');delete s.boats;
 const rules=JSON.parse(s.rules);delete rules.channelProfiles;
 if(version===9){assert(s.carouselSessions.length===0&&s.retiredRideIncome===0,'Unexpected Carousel authority');delete s.carouselSessions;delete s.retiredRideIncome;delete rules.fixedProfiles;}
 s.rules=JSON.stringify(rules);s.version=version;s.contentVersion=version===9?2:3;return JSON.stringify(s);
}
function normalizedView(value,version,current){
 const view=JSON.parse(JSON.stringify(value,(_key,v)=>ArrayBuffer.isView(v)?{$typedArray:v.constructor.name,values:Array.from(v)}:v));
 if(current){assert(view.protocolVersion===5&&view.contentVersion===5,'Expected current projection');assert(view.litterTypes.length===0,'Historical typed litter');delete view.litterTypes;delete view.products;for(const f of view.facilities){assert(f.product===null,'Historical product reinterpretation');delete f.product;delete f.priceBounds;}if(version!==11){assert(view.boats.length===0&&view.counts.boats===0,'Unexpected boat projection');delete view.boats;delete view.counts.boats;if(version===9){assert(view.carouselSessions.length===0,'Unexpected Carousel projection');delete view.carouselSessions;}}view.protocolVersion=version===11?4:version===9?2:3;view.contentVersion=version===11?4:version===9?2:3;}
 const token=view.commandRevision.split(':');assert(token.length===3&&Number(token[2])===view.worldRevision,'Revision token mismatch');view.commandRevision='<SESSION>:<RESTORE_GENERATION>:'+token[2];return JSON.stringify(sort(view));
}

export async function runHistorical(){
 const [current,steel,mixed]=await Promise.all([import('./simulation/index.js'),import('./content/steel-coaster.js'),import('./content/mixed-park.js')]);
 const evidence={scope:'Real frozen historical factories and current Engine executed in this current Chrome. Separate matching-runtime migration/continuation evidence; it does not accept older-browser or Node-origin trajectory masters, universal portability, Flume visuals, GPU or original agreement.',cases:[]},fixtures={};
 const [{withFlumeProfile},{withConsumablesProfile}]=await Promise.all([import('./content/log-flume.js'),import('./content/consumables.js')]);const browserRules=withConsumablesProfile(withFlumeProfile(mixed.mixedRules));
 for(const version of [9,10,11]){
  const prefix='./old-v'+version+'/';
  const [old,oldSteel,oldMixed]=await Promise.all([import(prefix+'simulation/index.js'),import(prefix+'content/steel-coaster.js'),import(prefix+'content/mixed-park.js')]);
  const oldRules=version===11?(await import(prefix+'content/log-flume.js')).withFlumeProfile(oldMixed.mixedRules):oldMixed.mixedRules;const original=version===9?oldMixed.newMixedPark():oldMixed.newCarouselPark(oldRules);
  unwrap(original.advance(600),'historical fixture warmup');apply(original,{type:'set-paused',paused:true});
  const input=original.exportSave(),raw=JSON.parse(input);assert(raw.version===version,'Historical factory version mismatch');assert(raw.contentVersion===(version===11?4:version===9?2:3),'Historical factory content mismatch');
  fixtures[version]=input;
  const oldEngine=new old.Engine(oldSteel.initialWorld,oldRules),newEngine=new current.Engine(steel.initialWorld,browserRules);
  unwrap(oldEngine.restoreSave(input),'historical paired restore');unwrap(newEngine.restoreSave(input),'current paired restore');assert(inverseSave(newEngine.exportSave(),version)===input,'Initial migrated authority differs');
  const states=[];apply(oldEngine,{type:'set-paused',paused:false});apply(newEngine,{type:'set-paused',paused:false});let previous=0;
  for(const offset of [0,1,17,400,1200]){
   for(let remaining=offset-previous;remaining>0;){const ticks=Math.min(17,remaining);assert(unwrap(oldEngine.advance(ticks),'historical advance')===ticks,'Wrong old ticks');assert(unwrap(newEngine.advance(ticks),'current advance')===ticks,'Wrong current ticks');remaining-=ticks;}previous=offset;
   const before=oldEngine.exportSave(),after=newEngine.exportSave();assert(inverseSave(after,version)===before,'Exact authority continuation differs at '+version+'/'+offset);
   const request={bounds:{x0:0,y0:0,x1:47,y1:47},includeStatic:true};assert(normalizedView(unwrap(oldEngine.view(request),'old view'),version,false)===normalizedView(unwrap(newEngine.view(request),'current view'),version,true),'Complete public projection differs at '+version+'/'+offset);assert(oldEngine.exportSave()===before&&newEngine.exportSave()===after,'Projection mutated authority');
   states.push({offset,oldSaveSha256:await hash(before),inverseCurrentSaveSha256:await hash(inverseSave(after,version)),exactAuthority:true,exactPublicView:true});
  }
  const latest=JSON.parse(newEngine.exportSave());evidence.cases.push({version,inputSha256:await hash(input),rides:raw.rides.length,paidOwners:raw.people.guests.filter(g=>g.phase==='riding').length,paidSales:raw.ledger.rideSales,checkpoints:states,currentVersion:latest.version});
 }
 return{evidence,fixtures};
}

export {inverseSave as projectLegacySave};
