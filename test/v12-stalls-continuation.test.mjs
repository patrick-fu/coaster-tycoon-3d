import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Engine} from '../dist/simulation/index.js';
import {initialWorld} from '../dist/content/steel-coaster.js';
import {withDetailedStallsProfile} from '../dist/content/facility-profiles.js';
import {detailedFacilityContent} from '../dist/content/registry.js';
import {apply} from './fixtures.mjs';

const pins=[['v12-stalls-continuation.json.gz','a71477b2ee9cfaa21ed8e6fe1246912de189eae83a94ef9252229fd968884070'],['v12-held-product-retirement-reuse.json.gz','3efc6638b8938dfc4a2069ae5284ebdb05ff80ff97aaa6219423c9c4ef171fff']];
const cases=pins.flatMap(([name,sha])=>{
 const bytes=readFileSync(new URL('./fixtures/'+name,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),sha);
 const packed=JSON.parse(gunzipSync(bytes));assert.equal(packed.pins.engineSha256,'71966822cbcd3b6f84fad25d4193f8fcd9d025717e3f17fcf9a340168bad1e7e');assert.equal(packed.pins.node,'v20.19.2');assert.deepEqual(packed.targets,[0,1,17,400,1200]);return packed.cases;
});
assert.equal(cases.length,5);
const wire=value=>JSON.parse(JSON.stringify(value,(_key,item)=>ArrayBuffer.isView(item)?{$typedArray:item.constructor.name,values:Array.from(item)}:item));
function v12Authority(text){
 const s=JSON.parse(text);assert.equal(s.version,13);assert.equal(s.contentVersion,6);s.version=12;s.contentVersion=5;
 const r=JSON.parse(s.rules);assert(Object.hasOwn(r,'facilityProfiles'));delete r.facilityProfiles;s.rules=JSON.stringify(r);return JSON.stringify(s);
}
function v12View(view){
 const s=wire(view);assert.equal(s.protocolVersion,6);assert.equal(s.contentVersion,6);s.protocolVersion=5;s.contentVersion=5;
 const token=s.commandRevision.split(':');assert.equal(token.length,3);assert.match(token[0],/^[a-f0-9]{32}$/);assert.match(token[1],/^\d+$/);assert.equal(Number(token[2]),s.worldRevision);
 s.commandRevision='<SESSION>:<RESTORE_GENERATION>:'+token[2];return s;
}
for(const c of cases)for(const detailed of [false,true])for(const batch of [17,1200])test('actual old v12 '+c.id+' preserves complete authority and view with detailed receiver '+detailed+' and '+batch+' tick batches',()=>{
 const rules=JSON.parse(c.rules),e=new Engine(initialWorld,detailed?withDetailedStallsProfile(rules):rules);
 assert.deepEqual(e.restoreSave(c.input),{ok:true,value:undefined});assert.equal(v12Authority(e.exportSave()),c.input,'complete paused input');assert.deepEqual(e.advance(1200),{ok:true,value:0});assert.equal(v12Authority(e.exportSave()),c.input);
 apply(e,c.unpause.command);let previous=0;
 for(const cp of c.checkpoints){
  for(let remaining=cp.offset-previous;remaining>0;){const n=Math.min(batch,remaining);assert.deepEqual(e.advance(n),{ok:true,value:n});remaining-=n;}previous=cp.offset;
  const saved=e.exportSave();assert.equal(v12Authority(saved),cp.authority,'complete old authority bytes at '+cp.offset);
  const view=e.view(cp.request);assert(view.ok);assert.deepEqual(v12View(view.value),cp.view,'complete old projection at '+cp.offset);assert.equal(e.exportSave(),saved);
 }
});

test('v12 rejects detailed capabilities and later Rules before migration while retaining pause and an executable quote',()=>{
 const c=cases[0],e=new Engine(initialWorld,withDetailedStallsProfile(JSON.parse(c.rules)));assert(e.restoreSave(c.input).ok);
 const before=e.exportSave(),command={type:'set-paused',paused:false},q=e.quote(command);assert(q.ok);
 for(const [mutate,code] of [[s=>s.facilities.find(f=>f.kind==='food').content=detailedFacilityContent('independent.burger'),'INVALID_SAVE'],[s=>{const r=JSON.parse(s.rules);r.facilityProfiles={};s.rules=JSON.stringify(r);},'WRONG_RULES'],[s=>{s.contentVersion=6;},'INVALID_SAVE'],[s=>delete s.people.guests[0].held,'INVALID_SAVE'],[s=>s.ledger.stock++,'INVALID_SAVE']]){
  const s=JSON.parse(c.input);mutate(s);const result=e.restoreSave(JSON.stringify(s));assert.equal(result.ok,false);assert.equal(result.error.code,code);assert.equal(e.exportSave(),before);assert.equal(e.revision,q.value.revision);
 }
 assert(e.execute(command,q.value.revision).ok);
});

test('v12 retains its commerce wrapper-target guard before migration',()=>{
 const c=cases[0],e=new Engine(initialWorld,withDetailedStallsProfile(JSON.parse(c.rules)));assert(e.restoreSave(c.input).ok);const before=e.exportSave(),revision=e.revision;
 const s=JSON.parse(c.input),f=s.facilities.find(f=>f.content.variantId==='independent.burger-stand'),element=s.elements.find(e=>e.id===f.element),g=s.people.guests.find(g=>g.held?.kind==='consumable');
 assert(f&&element&&g);f.open=true;const dirs=[[1,0],[0,1],[-1,0],[0,-1]],d=dirs[element.direction];
 Object.assign(g,{held:null,wrapper:true,wrapperTick:s.tick,phase:'buying',point:{x:element.tile.x+d[0],y:element.tile.y+d[1],z:element.height},facility:f.id,goal:null,next:null,walkProgress:0,serviceProgress:0,amenity:null,destination:null,queueRide:null,seat:null,entrance:null,exit:null});
 const control=structuredClone(s);control.people.guests.find(item=>item.id===g.id).wrapper=false;control.people.guests.find(item=>item.id===g.id).wrapperTick=0;const other=new Engine(initialWorld,withDetailedStallsProfile(JSON.parse(c.rules)));assert.deepEqual(other.restoreSave(JSON.stringify(control)),{ok:true,value:undefined},'same product target without wrapper is valid');
 assert.equal(e.restoreSave(JSON.stringify(s)).error.code,'INVALID_SAVE');assert.equal(e.exportSave(),before);assert.equal(e.revision,revision);
});
