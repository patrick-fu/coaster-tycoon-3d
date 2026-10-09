import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../dist/simulation/index.js';
import {validateRules} from '../dist/simulation/geometry.js';
import {withConsumablesProfile,commerceProfileId,facilityStockCost} from '../dist/content/consumables.js';
import {withDetailedStallsProfile,detailedStallsProfileId} from '../dist/content/facility-profiles.js';
import {detailedFacilityContent,consumableFacilityContent,legacyFacilityContent,resolveContent} from '../dist/content/registry.js';
import {legacyRuleJSON,v9RuleJSON,v10RuleJSON,v11RuleJSON,v12RuleJSON} from '../dist/content/ride-profiles.js';
import {createHost} from '../dist/simulation/host.js';
import {rules,options,apply} from './fixtures.mjs';

const burger='independent.burger',drink='independent.soft-drink',tile={x:10,y:9};
const detailedRules=()=>withDetailedStallsProfile(withConsumablesProfile(structuredClone(rules)));
const make=(p=detailedRules(),world=options)=>new Engine(world,p);
const counter=(product=burger,more={})=>({type:'place-facility',name:'Detailed counter',kind:product===burger?'food':'drink',tile,height:16,direction:1,content:detailedFacilityContent(product),...more});
const path=(height,x=10,y=9)=>({type:'place-path',tile:{x,y},height,queueFor:null});
function refuse(e,c,code){
 const before=e.exportSave(),revision=e.revision,pending={type:'set-paused',paused:true},q=e.quote(pending);assert(q.ok);
 for(const result of [e.quote(c),e.execute(c,revision)]){assert.equal(result.ok,false);assert.equal(result.error.code,code);assert.equal(e.exportSave(),before);assert.equal(e.revision,q.value.revision);}
 assert.deepEqual(e.quote(pending),q);
}
function step(e,n){while(n){const count=Math.min(n,4096);assert.deepEqual(e.advance(count),{ok:true,value:count});n-=count;}}
const guest=(e,id=1)=>{const r=e.inspect('guest',id);assert(r.ok);return r.value;};
function until(e,condition,limit=8192){for(let n=0;!condition()&&n<limit;n++)step(e,1);assert(condition(),'Expected actual state within '+limit+' ticks.');}
function purchaseRules(){const p=detailedRules();Object.assign(p.guests,{spawnTicks:200,decisionTicks:1,walkTicks:1,initialHunger:900,initialThirst:900,needGrowth:0});Object.assign(p.services,{initialBladder:0,serviceTicks:2});return p;}
function actualBuyer(product){
 const p=purchaseRules(),e=make(p),facility=apply(e,counter(product)).id;
 apply(e,path(16,10,10));apply(e,{type:'set-facility-open',facility,open:true});apply(e,{type:'set-park-entrance',point:{x:10,y:10,z:16}});apply(e,{type:'set-park-open',open:true});step(e,200);apply(e,{type:'set-park-open',open:false});until(e,()=>guest(e).held!==null,32);return{e,p,facility};
}

test('optional numeric placement Rules normalize to empty and the five old helpers preserve16',()=>{
 const empty=new Engine(options,rules);assert.deepEqual(JSON.parse(empty.snapshot().rules).facilityProfiles,{});
 const e=make();for(const [i,content] of [legacyFacilityContent('food'),legacyFacilityContent('drink'),legacyFacilityContent('restroom'),consumableFacilityContent(burger),consumableFacilityContent(drink)].entries()){
  const service=resolveContent(content).capabilities.construction.service,c=counter(burger,{kind:service,content,tile:{x:5+i,y:5},height:32}),before=e.exportSave(),q=e.quote(c);assert(q.ok);assert.deepEqual(q.value.cells,[{x:5+i,y:5,low:32,high:48,mask:15}]);assert.equal(e.exportSave(),before);apply(e,c);
 }
 assert(e.restoreSave(e.exportSave()).ok);
 assert.deepEqual(consumableFacilityContent(burger),{familyId:'independent.food-facility',variantId:'independent.burger-stand',modeId:'independent.retail'});
});

test('the bounded placement profile requires exact32 complete commerce and tileMetres4',()=>{
 const bad=[p=>p.facilityProfiles=null,p=>p.facilityProfiles=[],p=>p.facilityProfiles={other:{height:32}},p=>p.facilityProfiles[detailedStallsProfileId]={},p=>p.facilityProfiles[detailedStallsProfileId].height=16,p=>p.facilityProfiles[detailedStallsProfileId].height='32',p=>p.facilityProfiles[detailedStallsProfileId].extra=1,p=>p.motion.tileMetres=5,p=>delete p.commerceProfiles,p=>delete p.commerceProfiles[commerceProfileId].products[drink]];
 for(const change of bad){const p=detailedRules();change(p);assert.throws(()=>make(p),error=>['INVALID_COMMAND','UNSUPPORTED_CONTENT'].includes(error.code));}
 const p=detailedRules(),e=make(p);p.facilityProfiles[detailedStallsProfileId].height=16;assert.equal(JSON.parse(e.snapshot().rules).facilityProfiles[detailedStallsProfileId].height,32);
 for(const codec of [legacyRuleJSON,v9RuleJSON,v10RuleJSON,v11RuleJSON,v12RuleJSON])assert(!Object.hasOwn(JSON.parse(codec(validateRules(detailedRules()))),'facilityProfiles'));
});

for(const product of [burger,drink])test(product+' detailed identity is available only in the actual numeric receiver and rejects incoherent service atomically',()=>{
 const e=make(),content=detailedFacilityContent(product),kind=product===burger?'food':'drink',resolved=resolveContent(content).capabilities;
 assert.deepEqual(resolved.construction,{kind:'facility',service:kind,profileId:detailedStallsProfileId,productId:product});assert.deepEqual(resolved.operation,{kind:'service',service:kind,profileId:commerceProfileId,productId:product});assert.deepEqual(resolved.presentation,{kind:'detailed-facility',service:kind,profileId:'detailed-consumable-stalls-v1'});
 assert.equal(e.catalogue().variants.find(v=>v.id===content.variantId).choices[0].runtimeAvailable,true);
 const plain=make(withConsumablesProfile(structuredClone(rules)));assert.equal(plain.catalogue().variants.find(v=>v.id===content.variantId).choices[0].runtimeAvailable,false);refuse(plain,counter(product),'UNSUPPORTED_CONTENT');
 refuse(e,counter(product,{kind:kind==='food'?'drink':'food'}),'INVALID_CONTENT');refuse(e,counter(product,{content:{...content,modeId:'unknown'}}),'UNKNOWN_CONTENT');
 const before=e.exportSave(),q=e.quote(counter(product));assert(q.ok);assert.deepEqual(q.value.cells,[{x:10,y:9,low:16,high:48,mask:15}]);assert.equal(e.exportSave(),before);const placed=apply(e,counter(product));assert.equal(placed.id,0);assert.equal(e.snapshot().facilities[0].instanceId,1);assert.equal(e.snapshot().nextInstance,2);
});

for(const product of [burger,drink])for(const first of ['facility','path'])test(product+' reserves32 against a path in '+first+' order while base+32 contact remains legal',()=>{
 const e=make();if(first==='facility'){apply(e,counter(product));refuse(e,path(40),'CLEARANCE');apply(e,path(48));}else{const above=apply(e,path(40));refuse(e,counter(product),'CLEARANCE');apply(e,{type:'remove-path',id:above.id});apply(e,path(48));apply(e,counter(product));}
 assert(e.restoreSave(e.exportSave()).ok);const f=e.snapshot().facilities[0];apply(e,{type:'remove-facility',facility:f.id});assert(e.restoreSave(e.exportSave()).ok);apply(e,counter(product));assert.equal(e.snapshot().facilities[0].id,f.id);
});

for(const first of ['facility','track'])test('steel station respects detailed32 in '+first+' order and old16 overpasses coexist',()=>{
 const e=make(),create=height=>({type:'create-ride',name:'Overpass',tile,height,direction:0}),station=ride=>({type:'append-track',ride,piece:'station'});
 if(first==='facility'){apply(e,counter());const low=apply(e,create(40)).id;refuse(e,station(low),'CLEARANCE');const contact=apply(e,create(48)).id;apply(e,station(contact));}
 else{const low=apply(e,create(40)).id;apply(e,station(low));refuse(e,counter(),'CLEARANCE');apply(e,{type:'remove-last-track',ride:low});const contact=apply(e,create(48)).id;apply(e,station(contact));apply(e,counter());}
 const oldTile={x:6,y:6};apply(e,counter(burger,{tile:oldTile,content:consumableFacilityContent(burger)}));const legacy=apply(e,{...create(32),tile:oldTile}).id;apply(e,station(legacy));assert(e.restoreSave(e.exportSave()).ok);
});

for(const direction of [0,1,2,3])test('native frontage '+direction+' uses the same dry foundation and reservation',()=>{
 const e=make(),q=e.quote(counter(drink,{direction}));assert(q.ok);assert.deepEqual(q.value.cells,[{x:10,y:9,low:16,high:48,mask:15}]);apply(e,counter(drink,{direction}));assert(e.restoreSave(e.exportSave()).ok);const view=e.view({bounds:{x0:0,y0:0,x1:31,y1:31},includeStatic:true});assert(view.ok);assert.equal(view.value.scenery.elements.find(e=>e.kind==='facility').direction,direction);
});

test('detailed dry grounding max-height and foundation-preserving terrain fail atomically with executable quotes',()=>{
 const e=make();refuse(e,counter(burger,{height:24}),'GEOMETRY');apply(e,{type:'set-terrain',tile,height:16,water:16});refuse(e,counter(),'GEOMETRY');apply(e,{type:'set-terrain',tile,height:16,water:0});apply(e,counter());apply(e,{type:'set-paused',paused:true});
 for(const [height,water] of [[0,0],[32,0],[16,16],[16,32]])refuse(e,{type:'set-terrain',tile,height,water},'GEOMETRY');
 const command=path(16,11,10),q=e.quote(command);assert(q.ok);refuse(e,{type:'set-terrain',tile,height:0,water:0},'GEOMETRY');assert(e.execute(command,q.value.revision).ok);assert.equal(e.advance(32).value,0);
 const p=detailedRules();p.maxHeight=32;refuse(make(p),counter(),'GEOMETRY');const contact=make(p,{...options,land:[{tile,height:0,water:0,owned:true}]});apply(contact,counter(burger,{height:0}));assert(contact.restoreSave(contact.exportSave()).ok);
 const poor=make(detailedRules(),{...options,cash:199});refuse(poor,counter(),'INSUFFICIENT_CASH');
});

test('legacy elevated facilities still permit lowered support ground and both facility forms coexist after save',()=>{
 const e=make();apply(e,counter(burger,{content:consumableFacilityContent(burger),height:32}));apply(e,{type:'set-terrain',tile,height:0,water:0});apply(e,counter(drink,{tile:{x:11,y:9}}));const saved=e.exportSave(),copy=make();assert(copy.restoreSave(saved).ok);assert.equal(copy.exportSave(),saved);assert.equal(copy.snapshot().facilities[0].content.variantId,'independent.burger-stand');assert.equal(copy.snapshot().facilities[1].content.variantId,'independent.detailed-soft-drink-stand');
});

test('loading uses incoming facility identities before collision and rejects missing or changed Rules and foundations atomically',()=>{
 const e=make();apply(e,counter());apply(e,path(48));const saved=e.exportSave(),copy=make();apply(copy,counter(drink,{tile:{x:11,y:9}}));assert(copy.restoreSave(saved).ok);assert.equal(copy.exportSave(),saved);
 const pending=path(16,11,10),q=copy.quote(pending);assert(q.ok);const before=copy.exportSave();
 for(const [change,code] of [[s=>s.elements.find(e=>e.kind==='path').height=40,'INVALID_SAVE'],[s=>s.terrain[9*256+10]=0,'INVALID_SAVE'],[s=>s.water[9*256+10]=16,'INVALID_SAVE'],[s=>s.facilities[0].content=consumableFacilityContent(drink),'INVALID_SAVE'],[s=>{const r=JSON.parse(s.rules);delete r.facilityProfiles;s.rules=JSON.stringify(r);},'WRONG_RULES'],[s=>{const r=JSON.parse(s.rules);r.facilityProfiles[detailedStallsProfileId].height=16;s.rules=JSON.stringify(r);},'WRONG_RULES']]){
  const bad=JSON.parse(saved);change(bad);assert.equal(copy.restoreSave(JSON.stringify(bad)).error.code,code);assert.equal(copy.exportSave(),before);assert.equal(copy.revision,q.value.revision);
 }
 assert(copy.execute(pending,q.value.revision).ok);
});

test('two real detailed buyers still book27 sales8 stock19 net and public product presentation',()=>{
 const p=purchaseRules(),e=make(p);for(const x of [10,11])apply(e,path(16,x,10));const food=apply(e,counter()).id,beverage=apply(e,counter(drink,{tile:{x:11,y:9}})).id;
 const before=e.snapshot().cash;apply(e,{type:'set-facility-open',facility:food,open:true});apply(e,{type:'set-park-entrance',point:{x:10,y:10,z:16}});apply(e,{type:'set-park-open',open:true});step(e,203);assert.equal(guest(e,1).held.productId,burger);apply(e,{type:'set-facility-open',facility:food,open:false});apply(e,{type:'set-facility-open',facility:beverage,open:true});step(e,197);apply(e,{type:'set-park-open',open:false});until(e,()=>guest(e,2).held!==null,32);
 const s=e.snapshot();assert.equal(s.ledger.shopSales,27);assert.equal(s.ledger.stock,8);assert.equal(s.cash,before+19);assert.equal(guest(e,1).spent,15);assert.equal(guest(e,2).spent,12);assert.equal(guest(e,2).held.productId,drink);assert(!guest(e,1).wrapper&&!guest(e,2).wrapper);assert.deepEqual(s.facilities.map(f=>facilityStockCost(f,p)),[5,3]);
 const view=e.view({bounds:{x0:0,y0:0,x1:31,y1:31},includeStatic:true}).value;assert.deepEqual(view.facilities.map(f=>[f.product.stockExpense,f.product.grossMargin,f.presentation.kind]),[[5,10,'detailed-facility'],[3,9,'detailed-facility']]);assert(e.restoreSave(e.exportSave()).ok);
});

for(const [product,price,stock,container] of [[burger,15,5,'emptyBurgerBox'],[drink,12,3,'emptyCan']])test(product+' actual held use container retirement and slot reuse preserve ownership and exact continuation',()=>{
 const {e,p,facility}=actualBuyer(product),held=guest(e).held,old=e.snapshot().facilities[0].instanceId;assert.equal(held.productId,product);const stale={type:'set-facility-price',facility,price:30},q=e.quote(stale);assert(q.ok);
 apply(e,{type:'remove-facility',facility});assert.deepEqual(guest(e).held,held);assert.equal(e.snapshot().retiredShopIncome,price);assert.equal(e.snapshot().retiredStock,stock);const replacement=apply(e,counter(product===burger?drink:burger)).id;assert.equal(replacement,facility);assert(e.snapshot().facilities[0].instanceId>old);assert.equal(e.execute(stale,q.value.revision).error.code,'STALE_REVISION');
 apply(e,{type:'set-paused',paused:true});const paused=e.exportSave();assert.deepEqual(e.advance(1200),{ok:true,value:0});assert.equal(e.exportSave(),paused);const copy=make(p);assert(copy.restoreSave(paused).ok);apply(e,{type:'set-paused',paused:false});apply(copy,{type:'set-paused',paused:false});step(e,1200);step(copy,17);step(copy,1183);assert.equal(copy.exportSave(),e.exportSave());assert.equal(guest(e).held.productId,product);until(e,()=>guest(e).held?.kind==='container');assert.equal(guest(e).held.containerId,container);assert(e.restoreSave(e.exportSave()).ok);until(e,()=>guest(e).held===null,512);assert.equal(e.snapshot().litter[0].containerId,container);assert.equal(e.snapshot().ledger.stock,stock);assert.equal(e.snapshot().ledger.shopSales,price);assert(e.restoreSave(e.exportSave()).ok);
});

test('protocol6 catalogue quote execute and load preserve detailed capability and reject protocol5 before mutation',()=>{
 const e=make(),host=createHost(e),command=counter(),send=(id,type,payload,protocolVersion=6)=>host({id,protocolVersion,request:{type,payload}}).value.result;
 assert.equal(send(0,'catalogue',null).value.variants.find(v=>v.id===command.content.variantId).choices[0].runtimeAvailable,true);const q=send(1,'quote',command);assert(q.ok);assert(send(2,'execute',{command,revision:q.value.revision}).ok);const before=e.exportSave();assert.equal(send(3,'execute',{command:{type:'set-loan',amount:100},revision:e.revision},5).error.code,'INVALID_COMMAND');assert.equal(e.exportSave(),before);assert(send(4,'load',before).ok);assert.equal(e.exportSave(),before);
});

test('v6 refuses smuggled facility profiles before any legacy normalization',()=>{
 const e=make(),s=JSON.parse(e.exportSave()),r=JSON.parse(legacyRuleJSON(validateRules(detailedRules())));delete r.scenery;r.facilityProfiles={};s.rules=JSON.stringify(r);s.version=6;delete s.contentVersion;delete s.nextInstance;delete s.carouselSessions;delete s.retiredRideIncome;delete s.boats;const before=e.exportSave(),q=e.quote({type:'set-paused',paused:true});assert(q.ok);assert.equal(e.restoreSave(JSON.stringify(s)).error.code,'INVALID_SAVE');assert.equal(e.exportSave(),before);assert.equal(e.revision,q.value.revision);
});

test('a geometrically valid current detailed stall cannot be smuggled into v12 even when the receiver enables it',()=>{
 const e=make();apply(e,counter());const current=e.exportSave(),old=JSON.parse(current);old.version=12;old.contentVersion=5;old.rules=v12RuleJSON(JSON.parse(old.rules));const q=e.quote({type:'set-paused',paused:true});assert(q.ok);
 assert.equal(e.restoreSave(JSON.stringify(old)).error.code,'INVALID_SAVE');assert.equal(e.exportSave(),current);assert.equal(e.revision,q.value.revision);const control=make();assert(control.restoreSave(current).ok);assert.equal(control.exportSave(),current);assert(e.execute({type:'set-paused',paused:true},q.value.revision).ok);
});
