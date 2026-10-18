import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createHeldBalloonAssets} from '../web-dist/art/held-balloon-assets.js';

const modelURL=new URL('../web-dist/models/balloons/held-balloon.glb',import.meta.url).href;
const authoredURL=new URL('../ui/models/balloons/held-balloon.glb',import.meta.url);
const packet=(rows=[[41,0],[42,11]])=>({
 guestBalloons:rows.map(([id,colour])=>({id,colour})),
 people:new Float64Array(rows.flatMap(([id],i)=>[id,10+i*4,20+i*4,4,0,0]))
});

async function bounded(promise,label){
 let timer;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' did not settle within 5 seconds.')),5000);})]);}
 finally{clearTimeout(timer);}
}

async function withRealModel(run,{delayed=false}={}){
 const bytes=await readFile(authoredURL),built=await readFile(new URL(modelURL));
 assert.deepEqual(built,bytes,'The built consumer must receive the exact authored GLB bytes.');
 const previous=Object.getOwnPropertyDescriptor(globalThis,'fetch');
 let releaseBody,markRequested;
 const gate=new Promise(resolve=>{releaseBody=resolve;});
 const bodyRequested=new Promise(resolve=>{markRequested=resolve;});
 const requests=[];
 Object.defineProperty(globalThis,'fetch',{configurable:true,writable:true,value:async(url,options)=>{
  assert.equal(url,modelURL,'No unowned model, external buffer or network request is permitted.');
  requests.push({url,signal:options?.signal});
  const response=new Response(bytes,{status:200,headers:{'Content-Type':'model/gltf-binary'}});
  if(delayed){
   const arrayBuffer=response.arrayBuffer.bind(response);
   response.arrayBuffer=async()=>{markRequested();await gate;return arrayBuffer();};
  }
  return response;
 }});
 let owner;
 try{
  owner=createHeldBalloonAssets({capacity:3});
  await run({owner,requests,bodyRequested,releaseBody});
 }finally{
  owner?.dispose();releaseBody();
  try{if(owner)await bounded(owner.readyPromise,'Owned model cleanup');}
  finally{if(previous)Object.defineProperty(globalThis,'fetch',previous);else delete globalThis.fetch;}
 }
 assert.equal(requests.length,1,'The owner must issue exactly one owned model request.');
}

function meshes(owner){
 const all=owner.group.children.filter(object=>object.isInstancedMesh);
 assert.equal(all.length,2);
 const skin=all.find(object=>object.material.name==='BalloonSkin');
 const string=all.find(object=>object.material.name==='BalloonString');
 assert(skin&&string,'Both real GLB material roles must reach instancing.');
 assert.notEqual(skin.geometry,string.geometry);assert.notEqual(skin.material,string.material);
 assert(skin.geometry.getAttribute('position').count>0&&string.geometry.getAttribute('position').count>0);
 return{skin,string};
}

function rendered(owner){
 return{selections:structuredClone(owner.group.userData.selections),meshes:owner.group.children.map(mesh=>({
  count:mesh.count,selections:structuredClone(mesh.userData.selections),
  matrices:Array.from(mesh.instanceMatrix.array.slice(0,mesh.count*16)),
  colours:mesh.instanceColor?Array.from(mesh.instanceColor.array.slice(0,mesh.count*3)):null
 }))};
}

function colourAt(mesh,index,hex){
 const actual=new THREE.Color(),expected=new THREE.Color(hex);mesh.getColorAt(index,actual);
 assert(Math.abs(actual.r-expected.r)<1e-6&&Math.abs(actual.g-expected.g)<1e-6&&Math.abs(actual.b-expected.b)<1e-6,
 'Saved palette colour must reach the real skin instance.');
}

test('real held GLB applies saved colour0, keeps string independent, and rejects malformed updates atomically',{timeout:15000},async()=>{
 await withRealModel(async({owner})=>{
  owner.update(packet());
  assert.equal(owner.ready,false);
  await bounded(owner.readyPromise,'Real GLB readiness');
  assert.equal(owner.error,null);assert.equal(owner.ready,true);assert.equal(owner.status().primitives,2);
  const {skin,string}=meshes(owner),stringColour=string.material.color.clone();
  assert.equal(skin.count,2);assert.equal(string.count,2);
  const selections=[{kind:'guest',id:41},{kind:'guest',id:42}];
  assert.deepEqual(owner.group.userData.selections,selections);
  assert.deepEqual(skin.userData.selections,selections);assert.deepEqual(string.userData.selections,selections);
  colourAt(skin,0,'#34343c');colourAt(skin,1,'#e6bd37');
  assert.equal(string.instanceColor,null,'The string must not inherit the skin tint.');
  const before=rendered(owner);
  for(const invalid of [
   {...packet(),guestBalloons:[{id:41,colour:32}]},
   {...packet(),guestBalloons:[{id:99,colour:0}]},
   {...packet(),guestBalloons:[{id:41,colour:0},{id:41,colour:11}]},
   packet([[41,0],[42,11],[43,0],[44,0]]),
   {...packet([[41,0]]),people:new Float64Array([41,10,20,4,0,1])},
   {...packet([[41,0]]),people:new Float64Array([41,10,20,4,2,0])}
  ]){assert.throws(()=>owner.update(invalid));assert.deepEqual(rendered(owner),before);}
  const moved=packet();moved.people[1]+=3;moved.people[2]-=4;moved.people[3]+=2;moved.guestBalloons[0].colour=31;
  owner.update(moved);colourAt(skin,0,'#9bd1ad');
  for(const mesh of [skin,string]){
   const position=new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(mesh.instanceMatrix.array));
   const old=new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(before.meshes[0].matrices));
   assert.deepEqual(position.sub(old).toArray(),[3,2,-4]);
  }
  assert(string.material.color.equals(stringColour));assert.equal(string.instanceColor,null);
  owner.update(null);assert.equal(skin.count,0);assert.equal(string.count,0);
  assert.deepEqual(owner.group.userData.selections,[]);assert.deepEqual(skin.userData.selections,[]);assert.deepEqual(string.userData.selections,[]);
  owner.update(packet([[43,0]]));assert.equal(skin.count,1);assert.equal(string.count,1);
  assert.deepEqual(owner.group.userData.selections,[{kind:'guest',id:43}]);colourAt(skin,0,'#34343c');
  owner.update(packet([]));assert.equal(skin.count,0);assert.equal(string.count,0);assert.deepEqual(owner.group.userData.selections,[]);
 });
});

test('real loaded meshes, geometries and materials emit one disposal event and a second dispose is harmless',{timeout:15000},async()=>{
 await withRealModel(async({owner})=>{
  await bounded(owner.readyPromise,'Real GLB readiness');assert.equal(owner.error,null);assert.equal(owner.ready,true);
  owner.update(packet());const {skin,string}=meshes(owner);
  const resources=new Set([skin,string,skin.geometry,string.geometry,skin.material,string.material]);
  const events=new Map([...resources].map(resource=>[resource,0]));
  for(const resource of resources)resource.addEventListener('dispose',()=>events.set(resource,events.get(resource)+1));
  owner.dispose();
  for(const resource of resources)assert.equal(events.get(resource),1,'Every published real resource must emit dispose.');
  assert.deepEqual(owner.group.children,[]);assert.deepEqual(owner.group.userData.selections,[]);
  assert.deepEqual(owner.status(),{ready:false,error:null,disposed:true,primitives:0,instances:0,geometries:0,materials:0,textures:0,bitmaps:0});
  owner.dispose();owner.update(packet());
  for(const resource of resources)assert.equal(events.get(resource),1,'Disposal must not repeat resource release.');
  assert.deepEqual(owner.group.children,[]);
 });
});

test('an owned real response arriving after dispose never attaches instances or reports ready',{timeout:15000},async()=>{
 await withRealModel(async({owner,requests,bodyRequested,releaseBody})=>{
  owner.update(packet());await bounded(bodyRequested,'Owned body request');
  assert.equal(requests.length,1);assert.equal(requests[0].signal.aborted,false);
  owner.dispose();assert.equal(requests[0].signal.aborted,true);
  releaseBody();await bounded(owner.readyPromise,'Disposed late response');
  assert.equal(owner.ready,false);assert.equal(owner.error,null);
  assert.deepEqual(owner.group.children,[]);assert.deepEqual(owner.group.userData.selections,[]);
  assert.deepEqual(owner.status(),{ready:false,error:null,disposed:true,primitives:0,instances:0,geometries:0,materials:0,textures:0,bitmaps:0});
 },{delayed:true});
});
