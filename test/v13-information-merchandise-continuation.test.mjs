import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Engine} from '../dist/simulation/index.js';
import {withInformationProfile} from '../dist/content/facility-profiles.js';
import {withMerchandiseProfile} from '../dist/content/merchandise.js';
import {informationFacilityContent} from '../dist/content/registry.js';
import {beforeMerchandiseState,beforeMerchandiseGuest,beforeMerchandiseView} from './merchandise-fixtures.mjs';
import {apply} from './fixtures.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const bytes=readFileSync(new URL('./fixtures/v13-information-merchandise-continuation.json.gz',import.meta.url));
assert.equal(bytes.length,2014972);assert.equal(sha(bytes),'ee72f3f1913c138ff0841a94d75c20f308d5cdddece45205465983262881935e');
const decoded=gunzipSync(bytes);assert.equal(decoded.length,69857305);assert.equal(sha(decoded),'3a9780b63114e9231c02aea940884152000681886328ae41eab625a1b5a0b254');
const frozen=JSON.parse(decoded);assert.equal(frozen.cases.length,11);
const wire=value=>JSON.parse(JSON.stringify(value,(_key,item)=>ArrayBuffer.isView(item)?{$typedArray:item.constructor.name,values:Array.from(item)}:item));
function oldView(value){
 const old=wire(beforeMerchandiseView(value)),token=old.commandRevision.split(':');
 assert.equal(token.length,3);assert.match(token[0],/^[a-f0-9]{32}$/);assert.match(token[1],/^\d+$/);assert.equal(Number(token[2]),old.worldRevision);
 old.commandRevision='<SESSION>:<RESTORE_GENERATION>:'+token[2];return old;
}
function reconcile(old){
 const sum=values=>values.reduce((n,v)=>n+BigInt(v),0n),ledger=old.ledger;
 assert.equal(sum(old.people.guests.map(g=>g.spent))+BigInt(old.people.departedSpent),BigInt(ledger.rideSales)+BigInt(ledger.shopSales));
 assert.equal(sum(old.rides.map(r=>r.income))+BigInt(old.retiredRideIncome),BigInt(ledger.rideSales));
 assert.equal(sum(old.facilities.map(f=>f.income))+BigInt(old.retiredShopIncome),BigInt(ledger.shopSales));
 assert.equal(BigInt(old.initialCash)+BigInt(old.loan)-BigInt(old.spent)+BigInt(old.refunded)+BigInt(ledger.rideSales)+BigInt(ledger.shopSales)-BigInt(ledger.stock)-BigInt(ledger.wages)-BigInt(ledger.upkeep)-BigInt(ledger.interest),BigInt(old.cash));
}
for(const c of frozen.cases)for(const enriched of [false,true])for(const batch of [17,1200])test('genuine old13 '+c.id+' retains whole authority/view/inspections with enriched receiver '+enriched+' and '+batch+' tick batches',()=>{
 assert.equal(sha(c.input),c.inputSHA256);assert.equal(sha(c.rules),c.rulesSHA256);
 assert.deepEqual(c.checkpoints.map(cp=>cp.offset),[0,1,17,400,1200]);
 const prior=JSON.parse(c.rules),rules=enriched?(prior.motion.tileMetres===4?withInformationProfile(prior):withMerchandiseProfile(prior)):prior;
 const e=new Engine(c.world,rules);
 assert.deepEqual(e.restoreSave(c.input),{ok:true,value:undefined});
 assert.equal(JSON.stringify(beforeMerchandiseState(e.snapshot())),c.input,'complete paused input');
 const paused=e.exportSave();assert.deepEqual(e.advance(1200),{ok:true,value:0});assert.equal(e.exportSave(),paused);
 apply(e,c.unpause.command);let previous=0;
 for(const cp of c.checkpoints){
  for(let remaining=cp.offset-previous;remaining>0;){const n=Math.min(batch,remaining);assert.deepEqual(e.advance(n),{ok:true,value:n});remaining-=n;}previous=cp.offset;
  for(const member of ['authority','rawView','view','audit','inspections'])assert.equal(sha(member==='authority'?cp[member]:JSON.stringify(cp[member])),cp.hashes[member]);
  const saved=e.exportSave(),old=beforeMerchandiseState(JSON.parse(saved));
  assert.equal(JSON.stringify(old),cp.authority,'all old authority bytes at '+cp.offset);reconcile(old);
  const projected=e.view(cp.request);assert(projected.ok);assert.deepEqual(oldView(projected.value),cp.view,'all old projection fields at '+cp.offset);
  assert.deepEqual(e.snapshot().people.guests.map(g=>{const result=e.inspect('guest',g.id);assert(result.ok);return beforeMerchandiseGuest(result.value);}),cp.inspections,'all old guest inspection fields');
  assert.equal(e.exportSave(),saved,'all reads preserve authority');
 }
});

test('old13 rejects new fields, identities and Rules before migration without losing pause or an existing quote',()=>{
 const c=frozen.cases.find(c=>c.id==='current-detailed-mid-buy'),rules=withInformationProfile(JSON.parse(c.rules)),e=new Engine(c.world,rules);
 assert(e.restoreSave(c.input).ok);const before=e.exportSave(),command={type:'set-paused',paused:false},q=e.quote(command);assert(q.ok);
 const mutations=[
  [s=>s.people.guests[0].merchandise={map:false,umbrellaColour:null},'INVALID_SAVE'],
  [s=>s.people.guests[0].informationCounter=null,'INVALID_SAVE'],
  [s=>s.retiredMerchandise={'independent.map':{sales:0,income:0},'independent.umbrella':{sales:0,income:0}},'INVALID_SAVE'],
  [s=>{const f=s.facilities[0];f.kind='information';f.content=informationFacilityContent();},'INVALID_SAVE'],
  [s=>{const r=JSON.parse(s.rules);r.merchandiseProfiles={};s.rules=JSON.stringify(r);},'WRONG_RULES'],
  [s=>{const r=JSON.parse(s.rules);r.facilityProfiles['independent.information-kiosk-v1']={height:32};s.rules=JSON.stringify(r);},'WRONG_RULES'],
  [s=>s.contentVersion=7,'INVALID_SAVE'],
  [s=>s.facilities=[null],'INVALID_SAVE']
 ];
 for(const [mutate,code] of mutations){const bad=JSON.parse(c.input);mutate(bad);const result=e.restoreSave(JSON.stringify(bad));assert.equal(result.ok,false);assert.equal(result.error.code,code);assert.equal(e.exportSave(),before);assert.equal(e.revision,q.value.revision);}
 assert(e.execute(command,q.value.revision).ok);
});
