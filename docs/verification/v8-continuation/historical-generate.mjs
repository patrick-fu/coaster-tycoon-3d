import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,statSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {Engine} from './app/dist/simulation/index.js';
import {steelRules} from './app/dist/content/steel-coaster.js';
import {compileCourse,carPose} from './app/dist/simulation/motion.js';

const root=fileURLToPath(new URL('.',import.meta.url));
const output=resolve(process.argv[2]??resolve(root,'evidence/generated'));
const sourceCommit='9ed66bacb964cb418810d8fe7f40064a18ec4800';
const archiveHash='37187ba89de1ec8c26a42632920c9cb916720ec44fd2eb673648e58986154bbf';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const clean=v=>ArrayBuffer.isView(v)?Array.from(v):Array.isArray(v)?v.map(clean):v!==null&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,clean(v[k])])):v;
const canonical=v=>JSON.stringify(clean(v));
const pretty=v=>JSON.stringify(v,null,2)+'\n';
const writeJSON=(name,v)=>writeFileSync(resolve(output,name),pretty(v));
const writeGzip=(name,bytes)=>writeFileSync(resolve(output,name),gzipSync(bytes,{level:9}));
const request={bounds:{x0:0,y0:0,x1:39,y1:39},includeStatic:true};
const options={side:40,cash:200000,maxLoan:50000,seed:20261007};
const steps=[0,1,17,400,1200];

function assertResult(result,label){assert.equal(result.ok,true,`${label}: ${JSON.stringify(result)}`);return result.value;}
function tick(e,n){while(n>0){const batch=Math.min(n,4096);assert.equal(assertResult(e.advance(batch),`advance(${batch})`),batch);n-=batch;}}
function canonicalView(e){const raw=assertResult(e.view(request),'view');const {commandRevision,...stable}=raw;return {raw:clean(raw),stable:clean(stable),commandRevision};}
function poses(s){
 const p=JSON.parse(s.rules),elements=new Map(s.elements.map(e=>[e.id,e]));
 return s.trains.map(t=>{
  const r=s.rides.find(r=>r.id===t.ride),course=compileCourse(r,elements,p,p.motion);
  return {ride:r.id,instanceId:r.instanceId,content:r.content,courseLengthMm:course.length,stationLengthMm:course.stationLength,stationEndMm:course.stationEnd,train:{phase:t.phase,positionMm:t.position,travelledMm:t.travelled,speedMmPerTick:t.speed,wait:t.wait,laps:t.laps},cars:t.carIds.map((id,i)=>({id,carIndex:i,centerOffsetMm:i*p.motion.carLength,seats:t.seats.slice(i*p.motion.seatsPerCar,(i+1)*p.motion.seatsPerCar),...carPose(course,t.position-i*p.motion.carLength)}))};
 });
}
function checkViewPoses(s,view,carPoses){
 assert.equal(view.tick,s.tick);assert.equal(view.worldRevision,s.revision);assert.equal(view.topologyRevision,s.topologyRevision);
 assert.equal(view.cash,s.cash);assert.equal(view.loan,s.loan);assert.deepEqual(view.ledger,clean(s.ledger));
 assert.equal(view.coordinates.metresPerTile,JSON.parse(s.rules).motion.tileMetres);
 assert.equal(view.cars.length,s.trains.reduce((n,t)=>n+t.carIds.length,0));
 for(const train of carPoses)for(const p of train.cars){
  const actual=view.cars.find(c=>c.id===p.id);assert(actual);
  for(const k of ['x','y','z'])assert(Math.abs(actual.position[k]-p.position[k]/1000)<1e-10,`car ${p.id} position ${k}`);
  assert.deepEqual(actual.direction,clean(p.direction));assert.deepEqual(actual.up,clean(p.up));
  assert.equal(actual.occupants,p.seats.filter(id=>id!==null).length);
  for(const v of [p.position,p.direction,p.up])assert(Object.values(v).every(Number.isFinite));
  assert(Math.abs(Math.hypot(...Object.values(p.direction))-1)<1e-9);
  assert(Math.abs(Math.hypot(...Object.values(p.up))-1)<1e-9);
  assert(Math.abs(p.direction.x*p.up.x+p.direction.y*p.up.y+p.direction.z*p.up.z)<1e-9);
 }
}
function profile(kind){
 const p=structuredClone(steelRules);
 p.id=`v8-golden-${kind}`;
 Object.assign(p.motion,{carLength:2300,seatsPerCar:3,maxCars:3,stationSpeed:137,chainSpeed:91,brakeDeceleration:5,waitTicks:47,unloadTicks:29});
 p.pieces.brake.motion.brake=37;
 Object.assign(p.guests,{spawnTicks:13,walkTicks:2,decisionTicks:3,needTicks:96,queueSlotsPerTile:4,patienceTicks:8192,rideCooldownTicks:600,defaultRidePrice:27,cashMin:600,cashMax:900,fareMin:80,fareMax:80,forceMin:20000,forceMax:20000,initialHunger:650,initialThirst:530,initialHappiness:900,initialEnergy:1000,needGrowth:3,rideHappiness:33,rideNausea:7});
 Object.assign(p.services,{buildPrice:223,defaultPrice:17,foodStock:5,drinkStock:7,serviceTicks:11,weekTicks:128,upkeepWeeks:3,mechanicMonthlyWage:173,handymanMonthlyWage:117,rideUpkeep:43,facilityUpkeep:31,interestPer10000:87,staffWalkTicks:3,repairTicks:41,inspectionTicks:23,inspectionInterval:333});
 Object.assign(p.housekeeping,{wrapperTicks:48,cleanupTicks:13,binCapacity:9});
 Object.assign(p,{pathPrice:19,portalPrice:73,terrainPrice:21,refundPerThousand:650});
 if(kind==='legacy-world-1m-1000hz'){
  Object.assign(p.motion,{tileMetres:1,tickHz:1000,carLength:700,stationSpeed:7,chainSpeed:5,brakeDeceleration:1});
  p.pieces.brake.motion.brake=3;
 }
 return p;
}

function buildPark(p){
 const e=new Engine(options,p),commands=[],progress=[];
 const apply=c=>{
  const quote=assertResult(e.quote(c),`quote ${c.type}`),receipt=assertResult(e.execute(c,quote.revision),`execute ${c.type}`);
  commands.push({tick:e.snapshot().tick,command:c,cost:receipt.cost,id:receipt.id??null});return receipt.id;
 };
 const ride=apply({type:'create-ride',name:'Frozen Copper Loop',tile:{x:18,y:18},height:32,direction:0}),stationIds=[];
 for(const piece of ['station','station','station','lift-start','lift','lift-end','right','flat','flat','flat','right','drop-start','drop','drop-end','brake','flat','flat','right','flat','flat','flat','right']){
  const id=apply({type:'append-track',ride,piece});if(piece==='station')stationIds.push(id);
 }
 for(const [station,role,x] of [[stationIds[0],'entrance',18],[stationIds[1],'exit',19]])apply({type:'place-portal',ride,station,role,tile:{x,y:17},height:32,direction:1});
 apply({type:'set-train-cars',ride,cars:3});
 const publicPaths=new Map();for(let y=10;y<=16;y++)publicPaths.set(`20,${y}`,apply({type:'place-path',tile:{x:20,y},height:32,queueFor:null}));
 publicPaths.set('19,16',apply({type:'place-path',tile:{x:19,y:16},height:32,queueFor:null}));
 for(const [x,y] of [[19,14],[18,14],[17,14],[17,15],[17,16],[18,16]])apply({type:'place-path',tile:{x,y},height:32,queueFor:ride});
 const food=apply({type:'place-facility',name:'Retired food vendor',kind:'food',tile:{x:21,y:12},height:32,direction:2});
 apply({type:'set-facility-open',facility:food,open:true});
 apply({type:'place-amenity',kind:'bin',path:publicPaths.get('20,15')});
 apply({type:'set-park-entrance',point:{x:20,y:10,z:32}});
 for(const role of ['mechanic','handyman'])apply({type:'hire-staff',role,point:{x:20,y:16,z:32}});
 apply({type:'set-loan',amount:7321});
 assert.equal(assertResult(e.circuit(ride),'circuit'),true);
 assert.equal(assertResult(e.operating(ride),'operating').issues.length,0);
 const access=assertResult(e.access(ride,{x:20,y:10,z:32}),'access');assert.equal(access.entrances.length,1);assert.equal(access.exits.length,1);
 apply({type:'set-ride-status',ride,status:'testing'});
 let s=e.snapshot();
 for(let elapsed=0;!s.trains[0].measured&&elapsed<16000;elapsed+=128){tick(e,128);s=e.snapshot();}
 assert(s.trains[0].measured,'Warm-up must complete an actual measured circuit.');
 progress.push({stage:'measured-empty-train',tick:s.tick,measured:s.trains[0].measured});
 apply({type:'set-ride-status',ride,status:'open'});apply({type:'set-park-open',open:true});
 let retired=false,replacement=null;
 for(let elapsed=0;elapsed<18000;elapsed+=4){
  tick(e,4);s=e.snapshot();
  if(!retired&&s.facilities.find(f=>f.id===food)?.sales>=3){
   const old=structuredClone(s.facilities.find(f=>f.id===food));
   apply({type:'remove-facility',facility:food});
   replacement=apply({type:'place-facility',name:'Replacement drink vendor',kind:'drink',tile:{x:21,y:12},height:32,direction:2});
   assert.equal(replacement,food);apply({type:'set-facility-price',facility:replacement,price:13});apply({type:'set-facility-open',facility:replacement,open:true});
   s=e.snapshot();const fresh=s.facilities.find(f=>f.id===replacement);assert(fresh.instanceId>old.instanceId);
   progress.push({stage:'sold-retired-and-slot-reused',tick:s.tick,retired:old,replacement:fresh,retiredShopIncome:s.retiredShopIncome,retiredStock:s.retiredStock});retired=true;
  }
  const t=s.trains[0],occupied=t.seats.filter(id=>id!==null).length;
  if(retired&&t.phase==='running'&&occupied>=4&&s.rides[0].queue.length>0&&s.facilities[0].sales>0&&s.ledger.wages>0&&s.ledger.upkeep>0&&s.ledger.interest>0)break;
 }
 s=e.snapshot();const t=s.trains[0],r=s.rides[0],occupied=t.seats.filter(id=>id!==null);
 assert.equal(s.version,8);assert.equal(s.contentVersion,1);assert.equal(t.phase,'running');assert.equal(t.carIds.length,3);assert.equal(t.seats.length,9);
 assert(occupied.length>=4,'At least two cars must contain passengers.');assert(r.queue.length>0,'The saved checkpoint must contain a waiting queue.');
 assert(s.ledger.rideSales>0&&s.ledger.shopSales>0&&s.ledger.stock>0&&s.ledger.wages>0&&s.ledger.upkeep>0&&s.ledger.interest>0);
 assert(s.retiredShopIncome>0&&s.retiredStock>0);assert.equal(s.loan,7321);assert.equal(s.nextInstance,4);assert.equal(r.instanceId,1);assert.equal(s.facilities[0].instanceId,3);
 assert.equal(r.content.variantId,'independent.steel-train');assert(s.rides.every(r=>r.content.familyId==='independent.circuit-coaster'));
 const guests=new Map(s.people.guests.map(g=>[g.id,g]));
 for(const id of occupied)assert.equal(guests.get(id).phase,'riding');
 for(const id of r.queue)assert.equal(guests.get(id).phase,'queued');
 assert(!occupied.some(id=>r.queue.includes(id)));
 return {e,commands,progress,preconditions:{version:s.version,contentVersion:s.contentVersion,tick:s.tick,revision:s.revision,topologyRevision:s.topologyRevision,rng:s.rng,cash:s.cash,loan:s.loan,ledger:s.ledger,nextInstance:s.nextInstance,ride:{id:r.id,instanceId:r.instanceId,content:r.content,cars:r.cars,price:r.price,income:r.income,queue:r.queue},train:{carIds:t.carIds,seats:t.seats,phase:t.phase,position:t.position,speed:t.speed,occupied:occupied.length,occupiedCars:t.carIds.map((id,i)=>({id,occupants:t.seats.slice(i*p.motion.seatsPerCar,(i+1)*p.motion.seatsPerCar).filter(id=>id!==null).length}))},retiredShopIncome:s.retiredShopIncome,retiredStock:s.retiredStock,facility:s.facilities[0],guests:s.people.guests.length}};
}

function runCase(name){
 const p=profile(name),{e,commands,progress,preconditions}=buildPark(p);
 const initialRaw=e.exportSave(),initial=JSON.parse(initialRaw),receivingRules=JSON.parse(initial.rules),checkpoints=[],restoreChecks=[];
 writeJSON(`${name}.receiving-rules.json`,receivingRules);writeJSON(`${name}.authored-rules.json`,p);writeJSON(`${name}.commands.json`,commands);writeJSON(`${name}.setup-progress.json`,progress);
 let previous=0;
 for(const afterTicks of steps){
  tick(e,afterTicks-previous);previous=afterTicks;
  const rawSave=e.exportSave(),save=JSON.parse(rawSave),{raw,stable}=canonicalView(e),carPoses=poses(save);
  checkViewPoses(save,stable,carPoses);
  const rawName=`${name}.t${afterTicks}.save.json.gz`;
  writeGzip(rawName,rawSave);writeJSON(`${name}.t${afterTicks}.raw-view.json`,raw);writeJSON(`${name}.t${afterTicks}.poses.json`,carPoses);
  const hashes={rawSave:digest(rawSave),canonicalSave:digest(canonical(save)),canonicalView:digest(canonical(stable)),canonicalPoses:digest(canonical(carPoses))};
  checkpoints.push({afterTicks,tick:save.tick,rawSaveFile:rawName,hashes,save,view:stable,poses:carPoses});
  const receiving=new Engine(options,receivingRules);assertResult(receiving.restoreSave(initialRaw),'restore frozen initial checkpoint');assert.equal(receiving.exportSave(),initialRaw);
  const batches=[];let remaining=afterTicks;
  for(const requested of [7,10,383,800]){const batch=Math.min(requested,remaining);if(batch){tick(receiving,batch);batches.push(batch);remaining-=batch;}}
  if(remaining){tick(receiving,remaining);batches.push(remaining);}
  assert.equal(receiving.exportSave(),rawSave,'Frozen restore must continue to exactly the same raw persisted bytes.');
  const restoredView=canonicalView(receiving).stable;assert.deepEqual(restoredView,stable);assert.deepEqual(poses(receiving.snapshot()),carPoses);
  restoreChecks.push({afterTicks,batches,rawSaveIdentical:true,canonicalViewIdentical:true,posesIdentical:true});
 }
 console.log(pretty({case:name,preconditions,continuationDigests:checkpoints.map(({afterTicks,tick,hashes})=>({afterTicks,tick,hashes})),restoreChecks}));
 return {name,sourceCommit,options,receivingRules,initial,initialRawSha256:digest(initialRaw),preconditions,setupProgress:progress,commands,viewRequest:request,checkpoints,restoreChecks};
}

function fileManifest(base){
 const found={};
 const visit=dir=>{for(const f of readdirSync(dir).sort()){if(['node_modules','dist'].includes(f))continue;const path=resolve(dir,f),s=statSync(path);if(s.isDirectory())visit(path);else if(s.isFile())found[relative(base,path)]=digest(readFileSync(path));}};
 visit(base);return found;
}
mkdirSync(output,{recursive:true});
assert.equal(digest(readFileSync(resolve(root,'source.tar'))),archiveHash,'The executing frozen archive must match the transferred archive.');
const sourceInputs=fileManifest(resolve(root,'app')),runtimeInputs={};
const visitRuntime=dir=>{for(const f of readdirSync(dir).sort()){const path=resolve(dir,f),s=statSync(path);if(s.isDirectory())visitRuntime(path);else if(s.isFile())runtimeInputs[relative(resolve(root,'app'),path)]=digest(readFileSync(path));}};
visitRuntime(resolve(root,'app/dist'));
writeJSON('source-inputs.json',sourceInputs);writeJSON('runtime-inputs.json',runtimeInputs);
const cases=[runCase('steel-custom'),runCase('legacy-world-1m-1000hz')];
const metadata={schema:1,purpose:'Frozen historical v8 save, view and car-pose continuation evidence for future migration regressions',sourceCommit,archiveHash,generatorSha256:digest(readFileSync(fileURLToPath(import.meta.url))),sourceInputsCanonicalSha256:digest(canonical(sourceInputs)),runtimeInputsCanonicalSha256:digest(canonical(runtimeInputs)),node:{version:process.version,versions:process.versions,platform:process.platform,arch:process.arch,executableSha256:digest(readFileSync(process.execPath))},excludedViewFields:{commandRevision:'Engine-session and restore-generation quote token; raw views retain it, but it is not a persisted park field.'},worldProfileOrigin:{path:'test/motion-regressions.test.mjs',line:7,existingValues:{tileMetres:1,tickHz:1000},secondaryAdaptations:{carLength:'700 mm permits the same three-car train to fit a 3000 mm three-tile platform; 2300 mm would require 6900 mm.',stationSpeed:'7 mm/tick gives 7 m/s at 1000 Hz and naturally acceptable guest forces.',chainSpeed:'5 mm/tick; valid nondefault receiving rule.',brakeDeceleration:'1 mm/tick squared; valid nondefault receiving rule.',brakeSpeed:'3 mm/tick; makes the same authored brake section meaningful.'}},limits:['These are independently authored project-candidate rules, not original RCT2 calibration.','The 1 m / 1000 Hz case uses an intentional legal world-metric boundary from existing tests, not a default shipping world.','No browser or GPU was used; this evidence covers the historical simulation, its actual projection and source car-pose function.','The historical frozen kernel cannot execute new per-ride profiles; no migration or production source was edited.']};
const fixture={metadata,cases};writeGzip('v8-continuation.json.gz',JSON.stringify(fixture));
writeJSON('summary.json',{...metadata,cases:cases.map(c=>({name:c.name,options:c.options,receivingRulesSha256:digest(canonical(c.receivingRules)),initialRawSha256:c.initialRawSha256,preconditions:c.preconditions,setupProgress:c.setupProgress,checkpoints:c.checkpoints.map(({afterTicks,tick,hashes})=>({afterTicks,tick,hashes})),restoreChecks:c.restoreChecks}))});
console.log(`PASS ${cases.length} historical-source cases; ${cases.length*steps.length} full-state/view/pose checkpoints; source ${sourceCommit}`);
