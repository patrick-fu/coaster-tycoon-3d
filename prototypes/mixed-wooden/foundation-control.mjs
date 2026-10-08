import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {Engine} from '../../dist/simulation/engine.js';
import {Engine as Before} from '../../dist/simulation/engine-elevated-red.js';
import {initialWorld} from '../../dist/content/steel-coaster.js';
import {mixedRules} from '../../dist/content/mixed-park.js';
import {woodenRideContent} from '../../dist/content/registry.js';

const apply=(engine,command)=>{const result=engine.execute(command,engine.revision);assert(result.ok,JSON.stringify(result));return result.value.id;};
const elevated=EngineClass=>{
 const engine=new EngineClass(initialWorld,mixedRules),ride=apply(engine,{type:'create-ride',name:'Foundation control',tile:{x:20,y:20},height:64,direction:0,content:woodenRideContent()});
 return {engine,ride};
};
const red=elevated(Before);
for(const piece of ['station','station','flat'])apply(red.engine,{type:'append-track',ride:red.ride,piece});
const path={type:'place-path',tile:{x:22,y:20},height:32,queueFor:null},oldQuote=red.engine.quote(path);assert(oldQuote.ok);
apply(red.engine,path);
const green=elevated(Engine),before=green.engine.exportSave(),rejection=green.engine.quote({type:'append-track',ride:green.ride,piece:'station'});
assert.equal(rejection.error.code,'GEOMETRY');assert.equal(green.engine.exportSave(),before);
const restore=new Engine(initialWorld,mixedRules),receiverBefore=restore.exportSave(),rejectedSave=restore.restoreSave(red.engine.exportSave());
assert.equal(rejectedSave.error.code,'INVALID_SAVE');assert.match(rejectedSave.error.message,/level, dry ground/);assert.equal(restore.exportSave(),receiverBefore);
const result={scope:'Actual old Engine admits elevated native intervals without foundations; finite candidate rejects construction and matching legacy-unpublished saved geometry atomically.',old:{pathAccepted:true,trackOrigin:red.engine.snapshot().elements.filter(e=>e.kind==='track').at(-1).origin,pathQuote:oldQuote.value.cells},green:{rejection:rejection.error,saveRejection:rejectedSave.error,atomic:true},passed:true};
await writeFile('/workspace/coaster-mixed-wooden/evidence/foundation-control.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
