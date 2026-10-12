import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetailedFacilityAssets} from '../web-dist/art/detailed-facility-assets.js';

function glb(variant){
 const nodes=[{name:'GroundRoot',children:[1,2,3,4]},{name:'Entrance_Front',translation:[0,0,.49]},{name:'Service_Interior',translation:[0,.08,0]},{name:'Sign_Front',translation:[0,.57,.465]},{mesh:0}];
 const vertices=new Float32Array([-.4,0,0,.4,0,0,0,.6,0]),normals=new Float32Array([0,0,1,0,0,1,0,0,1]),uv=new Float32Array([0,0,1,0,.5,1]);
 if(variant==='wrong-door')nodes[1].translation=[.1,0,.49];
 if(variant==='missing-sign')nodes[3].name='MissingSign';
 if(variant==='duplicate-door'){nodes.push({...nodes[1]});nodes[0].children.push(5);}
 if(variant==='scaled-root')nodes[0].scale=[.5,.5,.5];
 if(variant==='bounds')vertices[3]=.8;
 if(variant==='nan-position')vertices[0]=NaN;
 if(variant==='degenerate')vertices.set(vertices.subarray(0,3),3);
 if(variant==='nan-normal')normals[0]=NaN;
 if(variant==='nan-uv')uv[0]=NaN;
 const buffers=[Buffer.from(vertices.buffer),Buffer.from(normals.buffer),Buffer.from(uv.buffer)];
 const primitive={attributes:{POSITION:0,NORMAL:1,TEXCOORD_0:2},material:0};
 if(variant==='missing-normal')delete primitive.attributes.NORMAL;
 if(variant==='missing-uv')delete primitive.attributes.TEXCOORD_0;
 const materials=[{name:'metal',pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.7}}];
 const primitives=[primitive];
 if(variant==='material-budget')for(let i=1;i<9;i++){materials.push({...materials[0],name:'material-'+i});primitives.push({...primitive,material:i});}
 const views=buffers.map((b,i)=>({buffer:0,byteOffset:buffers.slice(0,i).reduce((sum,b)=>sum+b.length,0),byteLength:b.length}));
 const accessors=[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[-.4,0,0],max:[.8,.6,0]},{bufferView:1,componentType:5126,count:3,type:'VEC3'},{bufferView:2,componentType:5126,count:3,type:'VEC2'}];
 if(variant==='triangle-budget'){
  const indices=new Uint16Array(8001*3);for(let i=0;i<indices.length;i++)indices[i]=i%3;
  const body=Buffer.from(indices.buffer);views.push({buffer:0,byteOffset:buffers.reduce((sum,b)=>sum+b.length,0),byteLength:body.length});buffers.push(body);accessors.push({bufferView:3,componentType:5123,count:indices.length,type:'SCALAR'});primitive.indices=3;
 }
 let bin=Buffer.concat(buffers);bin=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);
 const document={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes,meshes:[{primitives}],materials,buffers:[{byteLength:bin.length}],bufferViews:views,accessors};
 let json=Buffer.from(JSON.stringify(document));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);
 const bytes=Buffer.alloc(28+json.length+bin.length);bytes.writeUInt32LE(0x46546c67,0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);bytes.writeUInt32LE(json.length,12);bytes.writeUInt32LE(0x4e4f534a,16);json.copy(bytes,20);
 const offset=20+json.length;bytes.writeUInt32LE(bin.length,offset);bytes.writeUInt32LE(0x004e4942,offset+4);bin.copy(bytes,offset+8);return bytes;
}
async function load(variant,{reflectionTexture=null}={}){
 const original=globalThis.fetch,urls=[];globalThis.fetch=async url=>{urls.push(String(url));return new Response(glb(variant),{status:200});};
 const assets=createDetailedFacilityAssets({capabilities:{getMaxAnisotropy:()=>1}},{restroom:true,reflectionTexture});
 try{await assets.readyPromise;assert.equal(urls.length,1);assert(urls[0].endsWith('/models/restroom/restroom.glb'));return assets;}finally{globalThis.fetch=original;}
}
const facility={kind:'restroom',product:null,open:true,presentation:{kind:'detailed-facility',service:'restroom',profileId:'detailed-gradual-restroom-v1'},restroom:{using:1,exiting:1,guestIds:[2,3]}};
test('actual glTF parsing qualifies a normalized restroom and uniformly maps its anchors while preserving borrowed lighting',{timeout:5000},async()=>{
 let foreignDisposed=0;const reflection={isTexture:true,dispose:()=>foreignDisposed++},assets=await load('valid',{reflectionTexture:reflection});
 try{
  assert.equal(assets.ready,true);assert.equal(assets.error,null);
  for(const open of [true,false]){const model=assets.cloneFacility({...facility,open});assert.deepEqual(model.scale.toArray(),[4,4,4]);assert.deepEqual(model.position.toArray(),[0,0,0]);assert.deepEqual(model.getObjectByName('Entrance_Front').position.toArray(),[0,0,.49]);}
  assert.throws(()=>assets.cloneFacility({...facility,kind:'food'}));assert.throws(()=>assets.cloneFacility({...facility,product:{id:'independent.burger'}}));assert.throws(()=>assets.cloneFacility({...facility,restroom:{using:2,exiting:1,guestIds:[2,3]}}));
 }finally{assets.dispose();assets.dispose();}
 assert.equal(foreignDisposed,0);assert.equal(assets.status().disposed,true);assert.equal(assets.status().geometries,0);assert.equal(assets.status().materials,0);assert.equal(assets.status().textures,0);assert.throws(()=>assets.cloneFacility(facility));
});
for(const variant of ['wrong-door','missing-sign','duplicate-door','scaled-root','bounds','nan-position','degenerate','nan-normal','nan-uv','missing-normal','missing-uv','material-budget','triangle-budget'])test('restroom qualification rejects '+variant+' and releases owned resources',{timeout:5000},async()=>{
 const assets=await load(variant);try{assert.equal(assets.ready,false);assert.equal(typeof assets.error,'string');assert.equal(assets.status().geometries,0);assert.equal(assets.status().materials,0);}finally{assets.dispose();}
});
