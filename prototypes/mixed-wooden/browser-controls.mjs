import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {Engine} from '../../dist/simulation/engine.js';
import {initialWorld,newPark} from '../../dist/content/steel-coaster.js';
import {woodenRideContent} from '../../dist/content/registry.js';

const output='/workspace/coaster-mixed-wooden/evidence';
const rules=JSON.parse(JSON.parse(await readFile(output+'/browser-car-view/park.json','utf8')).rules);
const apply=(engine,command)=>{const result=engine.execute(command,engine.revision);assert(result.ok,JSON.stringify(result));return result.value.id;};
const pieces=['station','station','flat','flat',...Array.from({length:3},()=>['right','flat','flat','flat','flat']).flat(),'right'];
const controls=[];
for(const extraSteel of [false,true]){
 const engine=new Engine(initialWorld,rules);
 if(extraSteel)apply(engine,{type:'create-ride',name:'Different saved steel ride',tile:{x:5,y:5},height:32,direction:0});
 const ride=apply(engine,{type:'create-ride',name:'Saved wooden selection',tile:{x:20,y:20},height:32,direction:0,content:woodenRideContent()});
 const stations=[];
 for(const piece of pieces){const id=apply(engine,{type:'append-track',ride,piece});if(piece==='station')stations.push(id);}
 for(const [index,role]of [[0,'entrance'],[1,'exit']]){
  const station=engine.snapshot().elements.find(e=>e.id===stations[index]),tile={x:station.origin.x/32,y:station.origin.y/32-1};
  apply(engine,{type:'place-portal',ride,station:station.id,role,tile,height:32,direction:1});
  apply(engine,{type:'place-path',tile:{x:tile.x,y:tile.y-1},height:32,queueFor:role==='entrance'?ride:null});
 }
 apply(engine,{type:'set-train-cars',ride,cars:2});
 apply(engine,{type:'set-ride-status',ride,status:'testing'});
 assert(engine.advance(800).ok);
 apply(engine,{type:'set-paused',paused:true});
 const save=engine.exportSave(),receiver=new Engine(initialWorld,rules);
 assert(receiver.restoreSave(save).ok);assert.equal(receiver.exportSave(),save);
 const file=extraSteel?'selection-park-b.json':'selection-park-a.json';
 await writeFile(output+'/'+file,save);
 const projected=engine.view({bounds:{x0:0,y0:0,x1:47,y1:47},includeStatic:true});assert(projected.ok);
 controls.push({file,ride,carIds:projected.value.cars.map(c=>c.id),positions:projected.value.cars.map(c=>c.position),paused:engine.snapshot().paused});
}
assert.deepEqual(controls.map(c=>c.ride),[0,1]);
assert.deepEqual(controls[0].carIds,controls[1].carIds);
const three=newPark(rules);apply(three,{type:'set-paused',paused:true});
assert.equal(three.snapshot().rides.length,3);
await writeFile(output+'/camera-three-park.json',three.exportSave());
await writeFile(output+'/browser-control-inputs.json',JSON.stringify({scope:'Actual Engine-built matching-rule saves; no renderer pose or selection injection.',controls,threeRides:three.snapshot().rides.map(r=>r.id)},null,2)+'\n');
