import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../dist/simulation/index.js';
import {withConsumablesProfile,commerceProfileId} from '../dist/content/consumables.js';
import {consumableFacilityContent} from '../dist/content/registry.js';
import {apply,operatingPark,rules,options} from './fixtures.mjs';

const burger='independent.burger',drink='independent.soft-drink';
const request={bounds:{x0:0,y0:0,x1:31,y1:31},includeStatic:true};
function profile(){
 const p=withConsumablesProfile(structuredClone(rules));
 Object.assign(p.guests,{spawnTicks:200,decisionTicks:1,walkTicks:1,initialHunger:900,initialThirst:900,needGrowth:0});
 Object.assign(p.services,{initialBladder:0,serviceTicks:2});return p;
}
function tick(e,n){while(n){const count=Math.min(n,4096);assert.deepEqual(e.advance(count),{ok:true,value:count});n-=count;}}
const guest=(e,id=1)=>{const r=e.inspect('guest',id);assert(r.ok);return r.value;};
function until(e,predicate,limit=8192){let n=0;while(!predicate()&&n<limit){tick(e,1);n++;}assert(predicate(),'Expected real state was not reached within '+limit+' ticks.');}
function counter(id=burger,configure=()=>{},world={}){
 const p=profile();configure(p);const e=new Engine({...options,...world},p);
 const path=apply(e,{type:'place-path',tile:{x:10,y:10},height:32,queueFor:null}).id;
 const facility=apply(e,{type:'place-facility',name:'Candidate counter',kind:id===burger?'food':'drink',tile:{x:10,y:9},height:32,direction:1,content:consumableFacilityContent(id)}).id;
 apply(e,{type:'set-facility-open',facility,open:true});apply(e,{type:'set-park-entrance',point:{x:10,y:10,z:32}});apply(e,{type:'set-park-open',open:true});tick(e,200);apply(e,{type:'set-park-open',open:false});return{e,p,facility,path};
}
function sold(id=burger,configure=()=>{},world={}){const c=counter(id,configure,world);until(c.e,()=>guest(c.e).held!==null,32);return c;}

test('two actual buyers own different unfinished products and book27 revenue8 stock and19 net receipts',()=>{
 const p=profile(),e=new Engine(options,p);
 for(const x of [10,11])apply(e,{type:'place-path',tile:{x,y:10},height:32,queueFor:null});
 const food=apply(e,{type:'place-facility',name:'Burger',kind:'food',tile:{x:10,y:9},height:32,direction:1,content:consumableFacilityContent(burger)}).id;
 const beverage=apply(e,{type:'place-facility',name:'Drink',kind:'drink',tile:{x:11,y:9},height:32,direction:1,content:consumableFacilityContent(drink)}).id;
 const before=e.snapshot().cash;apply(e,{type:'set-facility-open',facility:food,open:true});apply(e,{type:'set-park-entrance',point:{x:10,y:10,z:32}});apply(e,{type:'set-park-open',open:true});tick(e,203);
 assert.equal(guest(e,1).held.productId,burger);apply(e,{type:'set-facility-open',facility:food,open:false});apply(e,{type:'set-facility-open',facility:beverage,open:true});tick(e,197);apply(e,{type:'set-park-open',open:false});until(e,()=>guest(e,2).held!==null,32);
 const s=e.snapshot();assert.equal(s.ledger.shopSales,27);assert.equal(s.ledger.stock,8);assert.equal(s.cash,before+19);assert.equal(s.ledger.upkeep,0);assert.equal(guest(e,1).spent,15);assert.equal(guest(e,2).spent,12);assert.equal(guest(e,2).held.productId,drink);assert(!guest(e,1).wrapper&&!guest(e,2).wrapper);
 const view=e.view(request).value;assert.deepEqual(view.facilities.map(f=>[f.product.label,f.product.stockExpense,f.product.grossMargin]),[['Burger',5,10],['Soft drink',3,9]]);assert(e.restoreSave(e.exportSave()).ok);
});

for(const [id,units,firstHunger,firstThirst,firstBladder,container] of [[burger,150,873,912,8,'emptyBurgerBox'],[drink,100,900,873,0,'emptyCan']])test(id+' applies eligible need effects during use and becomes its actual empty container',()=>{
 const {e,facility}=sold(id);assert.deepEqual(guest(e).held,{kind:'consumable',productId:id,remaining:units});assert.equal(guest(e).hunger,900);assert.equal(guest(e).thirst,900);assert.equal(guest(e).bladder,0);assert.equal(guest(e).wrapper,false);apply(e,{type:'set-facility-open',facility,open:false});
 tick(e,52);assert.equal(guest(e).held.remaining,units-3);assert.equal(guest(e).hunger,firstHunger);assert.equal(guest(e).thirst,firstThirst);assert.equal(guest(e).bladder,firstBladder);
 until(e,()=>guest(e).held.kind==='container');assert.deepEqual(guest(e).held,{kind:'container',containerId:container,sinceTick:e.snapshot().tick});assert.equal(id===burger?guest(e).hunger:guest(e).thirst,0);assert.equal(guest(e).wrapper,false);assert.equal(e.snapshot().litter.length,0);assert(e.restoreSave(e.exportSave()).ok);
});

test('actual use survives vendor retirement and reuse without transferring ownership to the replacement',()=>{
 const {e,facility}=sold(),held=guest(e).held,old=e.snapshot().facilities[0].instanceId;
 const staleCommand={type:'set-facility-price',facility,price:30},q=e.quote(staleCommand);assert(q.ok);
 apply(e,{type:'remove-facility',facility});assert.deepEqual(guest(e).held,held);assert.equal(e.snapshot().retiredShopIncome,15);assert.equal(e.snapshot().retiredStock,5);
 const replacement=apply(e,{type:'place-facility',name:'Replacement drink',kind:'drink',tile:{x:10,y:9},height:32,direction:1,content:consumableFacilityContent(drink)}).id;assert.equal(replacement,facility);assert(e.snapshot().facilities[0].instanceId>old);const before=e.exportSave();assert.equal(e.execute(staleCommand,q.value.revision).error.code,'STALE_REVISION');assert.equal(e.exportSave(),before);assert.deepEqual(guest(e).held,held);assert(e.restoreSave(before).ok);
 tick(e,128);assert.equal(guest(e).held.productId,burger);assert.equal(guest(e).held.remaining,147);
});

test('pause and non-time commands retain exact unfinished use and continuation is batch-independent',()=>{
 const {e,p,facility}=sold();apply(e,{type:'set-facility-open',facility,open:false});tick(e,52);const held=guest(e).held;
 apply(e,{type:'set-paused',paused:true});const paused=e.exportSave();assert.deepEqual(e.advance(1200),{ok:true,value:0});assert.equal(e.exportSave(),paused);apply(e,{type:'set-facility-price',facility,price:20});assert.deepEqual(guest(e).held,held);
 const copy=new Engine(options,p);assert(copy.restoreSave(e.exportSave()).ok);apply(e,{type:'set-paused',paused:false});apply(copy,{type:'set-paused',paused:false});tick(e,1200);for(const n of [1,16,383,800])tick(copy,n);assert.equal(copy.exportSave(),e.exportSave());
});

test('a real paid rider retains the unfinished item while riding and resumes after actual unloading',()=>{
 const p=profile(),{engine:e,id}=operatingPark(new Engine(options,p));
 for(const [x,y,queueFor] of [[10,7,null],[11,7,null],[11,8,null],[10,8,id]])apply(e,{type:'place-path',tile:{x,y},height:32,queueFor});
 const facility=apply(e,{type:'place-facility',name:'Trackside burger',kind:'food',tile:{x:10,y:6},height:32,direction:1,content:consumableFacilityContent(burger)}).id;apply(e,{type:'set-facility-open',facility,open:true});apply(e,{type:'set-ride-status',ride:id,status:'open'});apply(e,{type:'set-park-entrance',point:{x:10,y:7,z:32}});apply(e,{type:'set-park-open',open:true});tick(e,200);apply(e,{type:'set-park-open',open:false});const gid=e.snapshot().people.guests[0].id;until(e,()=>guest(e,gid).held!==null);apply(e,{type:'set-facility-open',facility,open:false});until(e,()=>guest(e,gid).phase==='riding');const held=guest(e,gid).held;
 apply(e,{type:'set-ride-broken',ride:id,broken:true});tick(e,256);assert.equal(guest(e,gid).phase,'riding');assert.deepEqual(guest(e,gid).held,held);const saved=e.exportSave();assert(e.restoreSave(saved).ok);
 apply(e,{type:'set-ride-status',ride:id,status:'closed'});apply(e,{type:'set-ride-broken',ride:id,broken:false});until(e,()=>guest(e,gid).phase!=='riding');assert.equal(guest(e,gid).held.kind,'consumable');const remaining=guest(e,gid).held.remaining;tick(e,128);assert(guest(e,gid).held.remaining<remaining);
});

test('a stranded buyer retains the item until the actual public path is restored',()=>{
 const {e,path,facility}=sold();apply(e,{type:'set-facility-open',facility,open:false});const held=guest(e).held;apply(e,{type:'remove-path',id:path});assert.equal(guest(e).phase,'stranded');tick(e,256);assert.deepEqual(guest(e).held,held);assert(e.restoreSave(e.exportSave()).ok);
 apply(e,{type:'place-path',tile:{x:10,y:10},height:32,queueFor:null});tick(e,128);assert.equal(guest(e).phase,'walking');assert(guest(e).held.remaining<held.remaining);
});

test('a completed box remains saved until disposal then becomes typed ground litter without reversing its sale',()=>{
 const {e,p,facility}=sold();apply(e,{type:'set-facility-open',facility,open:false});until(e,()=>guest(e).held.kind==='container');const before=e.snapshot(),copy=new Engine(options,p);assert(copy.restoreSave(e.exportSave()).ok);tick(e,512);tick(copy,17);tick(copy,495);assert.equal(copy.exportSave(),e.exportSave());const s=e.snapshot();assert.equal(guest(e).held,null);assert.equal(s.litter.length,1);assert.equal(s.litter[0].containerId,'emptyBurgerBox');assert.equal(s.ledger.shopSales,before.ledger.shopSales);assert.equal(s.ledger.stock,before.ledger.stock);assert.deepEqual(e.view(request).value.litterTypes,[{id:s.litter[0].id,containerId:'emptyBurgerBox'}]);const saved=e.exportSave();assert(e.restoreSave(saved).ok);const bad=JSON.parse(saved);bad.litter[0].containerId='unknown';assert.equal(e.restoreSave(JSON.stringify(bad)).error.code,'INVALID_SAVE');assert.equal(e.exportSave(),saved);
});

test('a real bin accepts the finished can without allocating ground waste',()=>{
 const {e,path,facility}=sold(drink);apply(e,{type:'set-facility-open',facility,open:false});apply(e,{type:'place-amenity',kind:'bin',path});until(e,()=>guest(e).held.kind==='container');const next=e.snapshot().nextEntity;until(e,()=>guest(e).held===null,32);assert.equal(e.snapshot().amenities[0].fill,1);assert.equal(e.snapshot().litter.length,0);assert.equal(e.snapshot().nextEntity,next);assert(e.restoreSave(e.exportSave()).ok);
});

test('an exhausted entity identifier retains its owned box and still permits an allocation-free bin deposit',()=>{
 const {e,facility,path}=sold();apply(e,{type:'set-facility-open',facility,open:false});until(e,()=>guest(e).held.kind==='container');const s=e.snapshot();s.nextEntity=Number.MAX_SAFE_INTEGER;assert(e.restoreSave(JSON.stringify(s)).ok);tick(e,512);assert.equal(guest(e).held.kind,'container');assert.equal(e.snapshot().litter.length,0);assert.equal(e.snapshot().nextEntity,Number.MAX_SAFE_INTEGER);
 apply(e,{type:'place-amenity',kind:'bin',path});until(e,()=>guest(e).held===null,32);assert.equal(e.snapshot().amenities[0].fill,1);assert.equal(e.snapshot().nextEntity,Number.MAX_SAFE_INTEGER);assert(e.restoreSave(e.exportSave()).ok);
});

test('the completion price is current and closed unaffordable demolished or pathless purchases book nothing',()=>{
 const {e,facility}=counter();tick(e,1);assert.equal(guest(e).phase,'buying');apply(e,{type:'set-facility-price',facility,price:30});tick(e,2);assert.equal(guest(e).spent,30);assert.equal(e.snapshot().ledger.stock,5);
 for(const mutation of ['close','price','remove','path']){const {e,facility,path}=counter();tick(e,1);apply(e,mutation==='close'?{type:'set-facility-open',facility,open:false}:mutation==='price'?{type:'set-facility-price',facility,price:200}:mutation==='remove'?{type:'remove-facility',facility}:{type:'remove-path',id:path});tick(e,20);assert.equal(e.snapshot().ledger.shopSales,0);assert.equal(e.snapshot().ledger.stock,0);assert.equal(guest(e).spent,0);assert.equal(guest(e).held,null);assert(e.restoreSave(e.exportSave()).ok);}
});

test('a free product still charges actual stock exactly once',()=>{
 const {e,facility}=counter();apply(e,{type:'set-facility-price',facility,price:0});const cash=e.snapshot().cash;until(e,()=>guest(e).held!==null,32);assert.equal(guest(e).spent,0);assert.equal(e.snapshot().facilities[0].sales,1);assert.equal(e.snapshot().ledger.shopSales,0);assert.equal(e.snapshot().ledger.stock,5);assert.equal(e.snapshot().cash,cash-5);assert(e.restoreSave(e.exportSave()).ok);
});

test('unavailable or changed profiles and malformed held items reject without changing park pause or quote',()=>{
 const p=profile(),plain=new Engine(options,rules),command={type:'place-facility',name:'Unavailable',kind:'food',tile:{x:10,y:9},height:32,direction:1,content:consumableFacilityContent(burger)},beforePlain=plain.exportSave();assert.equal(plain.quote(command).error.code,'UNSUPPORTED_CONTENT');assert.equal(plain.execute(command,plain.revision).error.code,'UNSUPPORTED_CONTENT');assert.equal(plain.exportSave(),beforePlain);assert.equal(plain.catalogue().variants.find(v=>v.id==='independent.burger-stand').choices[0].runtimeAvailable,false);
 const {e}=sold();apply(e,{type:'set-paused',paused:true});const original=e.exportSave(),q=e.quote({type:'set-paused',paused:false});
 for(const mutate of [s=>s.people.guests[0].held.productId='unknown',s=>s.people.guests[0].held.remaining=148,s=>s.people.guests[0].held.remaining=151,s=>s.people.guests[0].wrapper=true,s=>s.people.guests[0].held={kind:'container',containerId:'unknown',sinceTick:s.tick},s=>s.people.guests[0].held={kind:'container',containerId:'emptyCan',sinceTick:s.tick+1},s=>s.facilities[0].stockExpense=5]){const bad=JSON.parse(original);mutate(bad);assert.equal(e.restoreSave(JSON.stringify(bad)).error.code,'INVALID_SAVE');assert.equal(e.exportSave(),original);assert.equal(e.revision,q.value.revision);}
 p.commerceProfiles[commerceProfileId].products[burger].stockCost=6;const other=new Engine(options,p),otherBefore=other.exportSave();assert.equal(other.restoreSave(original).error.code,'WRONG_RULES');assert.equal(other.exportSave(),otherBefore);assert(e.execute({type:'set-paused',paused:false},q.value.revision).ok);
});

test('a legacy wrapper cannot target a product counter in a current save',()=>{
 for(const id of [burger,drink]){
  const {e}=counter(id);until(e,()=>guest(e).phase==='buying');
  const before=e.exportSave(),bad=JSON.parse(before),revision=e.revision;
  bad.people.guests[0].wrapper=true;bad.people.guests[0].wrapperTick=bad.tick;
  const result=e.restoreSave(JSON.stringify(bad));assert.equal(result.ok,false);assert.equal(result.error.code,'INVALID_SAVE');
  assert.equal(e.exportSave(),before);assert.equal(e.revision,revision);
 }
});

test('a later compulsory-finance failure rolls back earlier held consumption time needs RNG and the whole batch',()=>{
 const {e,facility}=sold(burger,p=>{p.services.weekTicks=1000;p.services.mechanicMonthlyWage=4;});apply(e,{type:'set-facility-open',facility,open:false});apply(e,{type:'hire-staff',role:'mechanic',point:{x:10,y:10,z:32}});
 const s=e.snapshot(),extra=BigInt(Number.MAX_SAFE_INTEGER)-BigInt(s.ledger.wages);s.ledger.wages=Number.MAX_SAFE_INTEGER;s.cash=Number(BigInt(s.cash)-extra);assert(e.restoreSave(JSON.stringify(s)).ok);const before=e.exportSave();assert.equal(e.advance(1000).error.code,'CAPACITY');assert.equal(e.exportSave(),before);assert.equal(guest(e).held.remaining,150);
});

test('full real shared capacity permits finishing use retains ground containers and permits allocation-free bin deposits',()=>{
 const p=profile();p.guests.spawnTicks=1;p.commerceProfiles[commerceProfileId].consumeTicks=32;p.commerceProfiles[commerceProfileId].products[burger].useUnits=3;p.housekeeping.wrapperTicks=1;
 const e=new Engine({...options,cash:1000000},p),path=apply(e,{type:'place-path',tile:{x:10,y:10},height:32,queueFor:null}).id,facility=apply(e,{type:'place-facility',name:'Capacity burger',kind:'food',tile:{x:10,y:9},height:32,direction:1,content:consumableFacilityContent(burger)}).id;apply(e,{type:'set-facility-open',facility,open:true});apply(e,{type:'set-park-entrance',point:{x:10,y:10,z:32}});apply(e,{type:'set-park-open',open:true});
 let s=e.snapshot();for(let n=0;s.people.guests.length+s.litter.length<10000&&n<5000;n+=64){tick(e,64);s=e.snapshot();}assert.equal(s.people.guests.length+s.litter.length,10000);apply(e,{type:'set-facility-open',facility,open:false});const next=s.nextEntity,litter=s.litter.length;tick(e,64);s=e.snapshot();assert(s.people.guests.some(g=>g.held?.kind==='container'));assert.equal(s.nextEntity,next);assert.equal(s.litter.length,litter);assert(e.restoreSave(e.exportSave()).ok);
 apply(e,{type:'place-amenity',kind:'bin',path});tick(e,5);s=e.snapshot();assert.equal(s.amenities[0].fill,8);assert.equal(s.nextEntity,next);assert.equal(s.litter.length,litter);assert(s.people.guests.some(g=>g.held?.kind==='container'));assert(e.restoreSave(e.exportSave()).ok);
});
