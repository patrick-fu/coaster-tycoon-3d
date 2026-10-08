import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import * as THREE from 'three';
import {buildWoodenTrack as before} from '../../web-dist/art/wooden-coaster-before.js';
import {buildWoodenTrack as after} from '../../web-dist/art/wooden-coaster.js';
import {createArtContext} from '../../web-dist/art/runtime.js';
import {mixedRules} from '../../dist/content/mixed-park.js';

const cases=[],profile=mixedRules.rideProfiles['independent.wooden-circuit-v1'];
function capture(build,element){
 const ctx=createArtContext({renderer:{capabilities:{getMaxAnisotropy:()=>4}},surfaceMap:new Map()}),group=new THREE.Group();
 const materials={timber:new THREE.MeshStandardMaterial(),metal:new THREE.MeshStandardMaterial()},buckets={head:[],structure:[],timber:[]};
 build(ctx,group,element,{trackProfile:profile},{elements:[]},{materials});group.updateMatrixWorld(true);
 let meshes=0;
 group.traverse(mesh=>{
  if(!mesh.isMesh)return;meshes++;
  const geometry=mesh.geometry,position=geometry.attributes.position,normal=geometry.attributes.normal,uv=geometry.attributes.uv,index=geometry.index;
  assert(index&&normal&&uv);assert.equal(index.count%3,0);
  const bucket=mesh.material===materials.timber?'timber':mesh.material===materials.metal?(geometry.parameters.width===.07?'head':'structure'):mesh.material===ctx.material('wooden:track:rail-head')?'head':'structure';
  const target=buckets[bucket],normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  for(let i=0;i<index.count;i++){
   const vertex=index.getX(i),p=new THREE.Vector3().fromBufferAttribute(position,vertex).applyMatrix4(mesh.matrixWorld),n=new THREE.Vector3().fromBufferAttribute(normal,vertex).applyMatrix3(normalMatrix).normalize();
   target.push([...p.toArray(),...n.toArray(),uv.getX(vertex),uv.getY(vertex)]);
  }
 });
 ctx.dispose();materials.timber.dispose();materials.metal.dispose();return{meshes,buckets};
}
for(const direction of [0,1,2,3])for(const piece of ['flat','left','right'])for(const z of [32,64]){
 const element={id:1,kind:'track',piece,origin:{x:640,y:640,z,direction,pitch:0,bank:0}},a=capture(before,element),b=capture(after,element),residuals={position:0,normal:0,uv:0};
 assert.equal(b.meshes,3);
 for(const key of Object.keys(a.buckets)){
  const old=a.buckets[key],current=b.buckets[key];assert.equal(current.length,old.length,key+' indexed triangle vertices');
  for(let i=0;i<old.length;i++)for(let axis=0;axis<8;axis++){
   const field=axis<3?'position':axis<6?'normal':'uv';residuals[field]=Math.max(residuals[field],Math.abs(old[i][axis]-current[i][axis]));
  }
 }
 assert(residuals.position<=.000016,'Float32 world-position correspondence');assert(residuals.normal<=.000001,'normal correspondence');assert.equal(residuals.uv,0);
 cases.push({direction,piece,z,oldMeshes:a.meshes,newMeshes:b.meshes,triangleVertices:Object.fromEntries(Object.entries(a.buckets).map(([k,v])=>[k,v.length])),residuals});
}
const result={scope:'Actual indexed triangle/normal/metre-UV correspondence for generated flat/left/right track, four directions, ground and elevated supports; no station, dynamics or GPU qualification.',cases,passed:true};
await writeFile('/workspace/coaster-mixed-wooden/evidence/merged-track-correspondence.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({cases:cases.length,maxPositionResidual:Math.max(...cases.map(c=>c.residuals.position)),maxNormalResidual:Math.max(...cases.map(c=>c.residuals.normal)),passed:true}));
