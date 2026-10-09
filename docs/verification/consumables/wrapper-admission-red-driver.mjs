import assert from 'node:assert/strict';
import {Engine} from '/workspace/coaster-consumables/app/dist/simulation/index.js';
import {withConsumablesProfile} from '/workspace/coaster-consumables/app/dist/content/consumables.js';
import {consumableFacilityContent} from '/workspace/coaster-consumables/app/dist/content/registry.js';
import {apply,rules,options} from '/workspace/coaster-consumables/app/test/fixtures.mjs';
const rows=[];
for(const id of ['independent.burger','independent.soft-drink']){
 const p=withConsumablesProfile(structuredClone(rules));
 Object.assign(p.guests,{spawnTicks:200,decisionTicks:1,walkTicks:1,initialHunger:900,initialThirst:900,needGrowth:0});Object.assign(p.services,{initialBladder:0,serviceTicks:2});
 const e=new Engine(options,p);apply(e,{type:'place-path',tile:{x:10,y:10},height:32,queueFor:null});
 const facility=apply(e,{type:'place-facility',name:'Candidate counter',kind:id.endsWith('burger')?'food':'drink',tile:{x:10,y:9},height:32,direction:1,content:consumableFacilityContent(id)}).id;
 apply(e,{type:'set-facility-open',facility,open:true});apply(e,{type:'set-park-entrance',point:{x:10,y:10,z:32}});apply(e,{type:'set-park-open',open:true});assert(e.advance(200).ok);apply(e,{type:'set-park-open',open:false});
 while(e.inspect('guest',1).value.phase!=='buying')assert(e.advance(1).ok);
 const generated=JSON.parse(e.exportSave());assert.equal(generated.people.guests[0].wrapper,false);assert.equal(generated.people.guests[0].held,null);
 generated.people.guests[0].wrapper=true;generated.people.guests[0].wrapperTick=generated.tick;
 const imported=e.restoreSave(JSON.stringify(generated));assert(imported.ok);
 assert(e.advance(2).ok);const exported=JSON.parse(e.exportSave()),g=exported.people.guests[0];assert(g.wrapper&&g.held?.kind==='consumable');
 const restored=e.restoreSave(JSON.stringify(exported));assert.equal(restored.ok,false);assert.equal(restored.error.code,'INVALID_SAVE');
 rows.push({product:id,craftedInput:'Only wrapper=true and wrapperTick=current tick added to a genuine Engine-generated buying save',imported,buyingTick:generated.tick,resultTick:exported.tick,wrapper:g.wrapper,held:g.held,shopSales:exported.ledger.shopSales,stock:exported.ledger.stock,reload:restored});
}
console.log(JSON.stringify({confirmed:true,scope:'Crafted current-v12 import, not normal chooser-generated state',rows},null,2));
