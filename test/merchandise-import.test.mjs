import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../dist/simulation/index.js';
import {withMerchandiseProfile} from '../dist/content/merchandise.js';
import {withConsumablesProfile} from '../dist/content/consumables.js';
import {withDetailedStallsProfile,withInformationProfile} from '../dist/content/facility-profiles.js';
import {informationFacilityContent} from '../dist/content/registry.js';
import {createHost} from '../dist/simulation/host.js';
import {rules,options,apply} from './fixtures.mjs';

test('a malformed facility record returns a correlated load error and preserves authority and quote',()=>{
 const e=new Engine(options,withInformationProfile(rules)),host=createHost(e),command={type:'set-paused',paused:true},q=e.quote(command),before=e.exportSave();assert(q.ok);
 for(const value of [null,0,'information',[],false]){
  const bad=e.snapshot();bad.facilities=[value];
  const response=host({id:41,protocolVersion:8,request:{type:'load',payload:JSON.stringify(bad)}});
  assert(response.ok);assert.equal(response.value.id,41);assert.equal(response.value.result.ok,false);assert.equal(response.value.result.error.code,'INVALID_SAVE');
  assert.equal(e.exportSave(),before);assert.equal(e.revision,q.value.revision);
 }
 assert(e.execute(command,q.value.revision).ok);
});

test('a foreign information record cannot borrow a compact shop element to bypass receiving placement',()=>{
 const e=new Engine(options,withMerchandiseProfile(rules));
 const food=apply(e,{type:'place-facility',name:'Real food',kind:'food',tile:{x:10,y:10},height:16,direction:0}).id;
 const bad=e.snapshot(),f=bad.facilities.find(f=>f.id===food);
 bad.facilities.push({id:1,instanceId:bad.nextInstance++,content:informationFacilityContent(),name:'Phantom info',kind:'information',element:f.element,open:true,products:{'independent.map':{price:6,sales:0,income:0},'independent.umbrella':{price:25,sales:0,income:0}},umbrellaColour:11});
 const before=e.exportSave(),revision=e.revision,result=e.restoreSave(JSON.stringify(bad));
 assert.equal(result.ok,false);assert.equal(result.error.code,'INVALID_SAVE');assert.equal(e.exportSave(),before);assert.equal(e.revision,revision);
 assert.equal(e.snapshot().facilities.length,1);assert.equal(e.snapshot().elements.find(e=>e.id===f.element).facility,food);
});

test('equivalent two-placement receiving Rules load identically regardless of helper composition order',()=>{
 const a=new Engine(options,withInformationProfile(withDetailedStallsProfile(withConsumablesProfile(rules))));
 const b=new Engine(options,withDetailedStallsProfile(withInformationProfile(withConsumablesProfile(rules))));
 assert.equal(a.snapshot().rules,b.snapshot().rules);
 assert.deepEqual(b.restoreSave(a.exportSave()),{ok:true,value:undefined});assert.equal(b.exportSave(),a.exportSave());
 const id=apply(a,{type:'place-facility',name:'Real info',kind:'information',tile:{x:10,y:10},height:16,direction:0}).id;
 apply(a,{type:'set-merchandise-price',facility:id,productId:'independent.map',price:0});
 assert(b.restoreSave(a.exportSave()).ok);assert.equal(b.exportSave(),a.exportSave());
});
