import test from 'node:test';
import assert from 'node:assert/strict';
import {create,apply,ride} from './fixtures.mjs';
import {createHost} from '../dist/simulation/host.js';
import {legacyRideContent,legacyFacilityContent} from '../dist/content/registry.js';

const wood={familyId:'reference.rct2.family.wooden-rc',variantId:'reference.rct2.variant.ptct1',modeId:'reference.rct2.mode.continuousCircuit'};
const build=content=>({type:'create-ride',name:'Selected coaster',tile:{x:10,y:10},height:32,direction:0,content});
const request={bounds:{x0:0,y0:0,x1:31,y1:31},includeStatic:true};

test('the content directory preserves base variant crosswalks and separates unimplemented reference capabilities',()=>{
 const directory=create().catalogue(),families=directory.families.filter(f=>f.reference),variants=directory.variants.filter(v=>v.reference);
 assert.equal(families.length,79);assert.equal(variants.length,155);assert.equal(new Set(variants.map(v=>v.reference.id)).size,155);assert.equal(families.filter(f=>f.category==='rollerCoaster').length,33);
 for(const v of variants)for(const choice of v.choices){assert(families.some(f=>f.id===choice.familyId));assert.equal(choice.capabilities.construction.kind,'unimplemented');assert.equal(choice.capabilities.operation.kind,'unimplemented');assert.equal(choice.capabilities.presentation.kind,'unimplemented');}
 assert.equal(variants.find(v=>v.reference.id==='rct2.ride.arrt2').choices[0].familyId,'reference.rct2.family.corkscrew-rc');assert.equal(variants.find(v=>v.reference.id==='rct2.ride.bmrb').choices[0].familyId,'reference.rct2.family.twister-rc');assert(!families.some(f=>f.id.includes('hyper-twister')));
 assert(!variants.some(v=>v.reference.id.startsWith('rct2ww.')||v.reference.id.startsWith('openrct2.')));
});

test('unknown, cross-family and unimplemented ride selections reject both quote and execution without consuming any resource',()=>{
 const e=create(),before=e.exportSave(),revision=e.revision;
 const cases=[
  [{...wood,variantId:'unknown'},'UNKNOWN_CONTENT'],
  [{...wood,familyId:'reference.rct2.family.log-flume'},'INVALID_CONTENT'],
  [{...legacyRideContent(),modeId:wood.modeId},'INVALID_CONTENT'],
  [wood,'UNSUPPORTED_CONTENT'],
  [{...wood,familyId:'__proto__'},'UNKNOWN_CONTENT'],
  [{familyId:wood.familyId},'INVALID_COMMAND'],
 ];
 for(const [content,code] of cases){for(const r of [e.quote(build(content)),e.execute(build(content),e.revision)]){assert.equal(r.ok,false);assert.equal(r.error.code,code);}assert.equal(e.exportSave(),before);assert.equal(e.revision,revision);}
 const id=apply(e,build(legacyRideContent())).id;assert.equal(id,0);assert.equal(e.snapshot().rides[0].instanceId,1);assert.equal(e.snapshot().nextInstance,2);
});

test('a facility selection must implement the requested service and cannot borrow the coaster adapter',()=>{
 const e=create(),command={type:'place-facility',name:'Counter',kind:'food',tile:{x:5,y:5},height:32,direction:0},before=e.exportSave();
 for(const [content,code] of [[legacyFacilityContent('drink'),'INVALID_CONTENT'],[legacyRideContent(),'INVALID_CONTENT'],[{familyId:'reference.rct2.family.information-kiosk',variantId:'reference.rct2.variant.infok',modeId:'reference.rct2.mode.shopStall'},'UNSUPPORTED_CONTENT']]){for(const r of [e.quote({...command,content}),e.execute({...command,content},e.revision)])assert.equal(r.error.code,code);assert.equal(e.exportSave(),before);}
 assert.equal(apply(e,{...command,content:legacyFacilityContent('food')}).cost,200);
});

test('instance identities survive save and distinguish a replacement using the same facility slot',()=>{
 const e=create(),command={type:'place-facility',name:'Food',kind:'food',tile:{x:5,y:5},height:32,direction:0},first=apply(e,command).id,old=e.snapshot().facilities[0].instanceId;
 apply(e,{type:'remove-facility',facility:first});const replacement=apply(e,{...command,kind:'drink'}).id;assert.equal(replacement,first);assert(e.snapshot().facilities[0].instanceId>old);const current=e.exportSave(),restored=create();assert(restored.restoreSave(current).ok);assert.equal(restored.exportSave(),current);
 const next=apply(restored,build(legacyRideContent())).id;assert.equal(restored.snapshot().rides.find(r=>r.id===next).instanceId,3);assert.equal(restored.snapshot().nextInstance,4);
});

test('invalid current identity, duplicate instance and unavailable content imports leave the live park and pending quote intact',()=>{
 const e=create();ride(e);apply(e,{type:'place-facility',name:'Food',kind:'food',tile:{x:5,y:5},height:32,direction:0});apply(e,{type:'set-paused',paused:true});const before=e.exportSave(),command={type:'place-path',tile:{x:6,y:5},height:16,queueFor:null},q=e.quote(command);
 for(const mutate of [s=>s.contentVersion=5,s=>s.nextInstance=2,s=>s.rides[0].instanceId=0,s=>s.facilities[0].instanceId=s.rides[0].instanceId,s=>delete s.rides[0].content,s=>s.rides[0].content=wood,s=>s.rides[0].content.modeId='unknown',s=>s.facilities[0].content=legacyFacilityContent('drink'),s=>s.rides[0].content.extra=true]){const s=e.snapshot();mutate(s);const r=e.restoreSave(JSON.stringify(s));assert.equal(r.error.code,'INVALID_SAVE');assert.equal(e.exportSave(),before);assert.equal(e.revision,q.value.revision);}
 assert(e.execute(command,q.value.revision).ok);assert.equal(e.advance(40).value,0);
});

test('nested identity accessors are rejected without invoking them or mutating the park',()=>{
 const e=create(),content=legacyRideContent(),before=e.exportSave();let called=false;Object.defineProperty(content,'familyId',{enumerable:true,get(){called=true;throw new Error('Accessor executed');}});assert.equal(e.quote(build(content)).error.code,'INVALID_COMMAND');assert.equal(called,false);assert.equal(e.exportSave(),before);
});

test('caller changes to content directories, identities and presentation capabilities cannot alter authority',()=>{
 const e=create();ride(e);apply(e,{type:'place-facility',name:'Food',kind:'food',tile:{x:5,y:5},height:32,direction:0});const before=e.exportSave(),directory=e.catalogue(),view=e.view(request);assert(view.ok);
 directory.variants[0].choices[0].capabilities.operation.kind='unimplemented';directory.variants[0].choices[0].modeIds.length=0;view.value.rides[0].content.variantId='unknown';view.value.rides[0].presentation.profileId='unknown';view.value.facilities[0].content.familyId='unknown';view.value.facilities[0].presentation.service='drink';
 assert.equal(e.exportSave(),before);assert(e.quote(build(legacyRideContent())).ok);assert.equal(e.view(request).value.facilities[0].presentation.service,'food');assert.equal(e.catalogue().variants[0].choices[0].capabilities.operation.kind,'circuit');
});

test('versioned worker requests reject missing or incompatible protocols with correlated errors before mutation',()=>{
 const e=create(),handle=createHost(e),before=e.exportSave(),request={type:'execute',payload:{command:{type:'set-loan',amount:100},revision:e.revision}};
 for(const envelope of [{id:7,request},{id:7,protocolVersion:1,request},{id:7,protocolVersion:2,request},{id:7,protocolVersion:3,request}]){const response=handle(envelope);assert(response.ok);assert.equal(response.value.id,7);assert.equal(response.value.protocolVersion,4);assert.equal(response.value.result.error.code,'INVALID_COMMAND');assert.equal(e.exportSave(),before);}
 const response=handle({id:8,protocolVersion:4,request:{type:'catalogue',payload:null}});assert(response.value.result.ok);assert.equal(response.value.result.value.contentVersion,4);assert.equal(response.value.result.value.variants.length,162);
});

test('native station geometry and car seats retain their own units in the versioned presentation',()=>{
 const e=create(),id=ride(e);apply(e,{type:'append-track',ride:id,piece:'station'});const view=e.view(request).value;assert.equal(view.protocolVersion,4);assert.equal(view.coordinates.nativeUnitsPerTile,32);assert.equal(view.coordinates.nativeHeightStep,8);assert.equal(view.coordinates.nativeLandStep,16);assert.equal(view.coordinates.evidence,'project-candidate');assert.equal(view.rides[0].tip.x,352);assert.equal(view.rides[0].tip.z,32);assert.equal(view.scenery.elements[0].origin.x,320);assert.equal(view.rides[0].content.variantId,'independent.steel-train');
 const circuit=e.quote({type:'set-ride-status',ride:id,status:'testing'});assert.equal(circuit.error.code,'OPERATING_REQUIREMENTS');assert.equal(e.snapshot().trains.length,0);
});
