import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../dist/simulation/index.js';
import {rules,options,apply} from './fixtures.mjs';

const content={familyId:'independent.atm-facility',variantId:'independent.cash-machine',modeId:'independent.cash-withdrawal'};
function park(){
 const p=structuredClone(rules);
 p.atmProfiles={'independent.atm-withdrawal-v1':{amount:500}};
 p.facilityProfiles={'independent.atm-v1':{height:32}};
 Object.assign(p.guests,{spawnTicks:1,decisionTicks:1,walkTicks:1,initialHunger:900,initialThirst:0,initialHappiness:1000,needGrowth:0});
 Object.assign(p.services,{initialBladder:0,relief:0});p.housekeeping.wrapperTicks=1;
 const e=new Engine(options,p);
 for(const y of [9,11])apply(e,{type:'set-terrain',tile:{x:10,y},height:32,water:0});
 apply(e,{type:'place-path',tile:{x:10,y:10},height:32,queueFor:null});
 const food=apply(e,{type:'place-facility',name:'Paid snack',kind:'food',tile:{x:10,y:9},height:32,direction:1}).id;
 apply(e,{type:'set-facility-price',facility:food,price:20});apply(e,{type:'set-facility-open',facility:food,open:true});
 const atm=apply(e,{type:'place-facility',name:'Cash machine',kind:'atm',tile:{x:10,y:11},height:32,direction:3,content}).id;
 apply(e,{type:'set-facility-open',facility:atm,open:true});
 apply(e,{type:'set-park-entrance',point:{x:10,y:10,z:32}});apply(e,{type:'set-park-open',open:true});
 assert(e.advance(1).ok);apply(e,{type:'set-park-open',open:false});
 return{e,p,atm,food};
}
const money=s=>({cash:s.cash,spent:s.spent,refunded:s.refunded,ledger:s.ledger});

test('actual snack spending leads to two completed free withdrawals without a lifetime visit flag',()=>{
 const {e,p,atm,food}=park();let paid=0;
 for(let i=0;i<2048&&paid<2;i++){
  const before=e.snapshot(),g=before.people.guests[0];
  assert(e.advance(1).ok);const after=e.snapshot(),guest=after.people.guests[0],machine=after.facilities.find(f=>f.id===atm);
  if(g.phase==='withdrawing'&&g.serviceProgress===p.services.serviceTicks-1){
   paid++;
   assert.deepEqual(money(after),money(before),'Dispensing guest money is not a park sale.');
   assert.equal(guest.cash,g.cash+500);assert.equal(guest.withdrawn,g.withdrawn+500);
   assert.equal(guest.spent,g.spent);assert.equal(machine.withdrawals,paid);assert.equal(guest.phase,'walking');
  }
 }
 assert.equal(paid,2,'The same unedited guest must spend real money and become eligible again.');
 const s=e.snapshot(),g=s.people.guests[0],shop=s.facilities.find(f=>f.id===food),machine=s.facilities.find(f=>f.id===atm);
 assert.equal(s.people.guests.length,1);assert(shop.sales>=30);assert.equal(g.spent,shop.income);
 assert.equal(g.initialCash,100);assert.equal(g.withdrawn,1000);assert.equal(g.initialCash+g.withdrawn-g.spent,g.cash);
 assert.equal(s.ledger.shopSales,g.spent);assert.equal(s.ledger.stock,shop.sales*3);
 assert.equal(machine.withdrawals,2);for(const field of ['price','income','sales','products'])assert.equal(Object.hasOwn(machine,field),false);
 const saved=e.exportSave(),receiver=new Engine(options,p);assert(receiver.restoreSave(saved).ok);assert.equal(receiver.exportSave(),saved);
});

test('a cash machine rejects pricing and retires completed history independently of shop accounts',()=>{
 const {e,atm}=park();
 for(let i=0;i<2048&&e.snapshot().facilities.find(f=>f.id===atm).withdrawals===0;i++)assert(e.advance(1).ok);
 assert.equal(e.snapshot().facilities.find(f=>f.id===atm).withdrawals,1);
 const saved=e.exportSave(),price={type:'set-facility-price',facility:atm,price:1};
 assert.equal(e.quote(price).ok,false);assert.equal(e.exportSave(),saved);
 const before=e.snapshot();apply(e,{type:'remove-facility',facility:atm});const after=e.snapshot();
 assert.equal(after.retiredAtmWithdrawals,1);assert.equal(after.people.guests[0].withdrawn,500);
 assert.equal(after.retiredShopIncome,before.retiredShopIncome);assert.equal(after.retiredStock,before.retiredStock);
 assert.deepEqual(after.ledger,before.ledger);assert(e.restoreSave(e.exportSave()).ok);
});
