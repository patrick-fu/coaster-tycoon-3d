import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetailedFacilityAssets} from '../web-dist/art/detailed-facility-assets.js';

function glb(variant='valid'){
 const values=new Float32Array([-.4,0,0,.4,0,0,0,1,0]);
 if(variant==='nan')values[0]=NaN;
 if(variant==='edge')values[3]=1.955;
 const nodes=[{name:'GroundRoot',children:[1,2,3,4,5,6]},
  {name:'CounterFront'},{name:'ProductSign'},{name:'MenuPanel'},
  {name:'OpenShutter',children:[7]},{name:'ClosedShutter',children:[8]},
  {mesh:0},{mesh:0},{mesh:0}];
 const meshes=[{primitives:[{attributes:{POSITION:0},material:0}]}];
 if(variant==='points'){
  meshes.push({primitives:[{attributes:{POSITION:0},material:0,mode:0}]});
  nodes.push({mesh:1,translation:[4,0,0]});nodes[0].children.push(9);
 }
 const document={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes,meshes,
  materials:[{pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.7}}],
  buffers:[{byteLength:values.byteLength}],bufferViews:[{buffer:0,byteOffset:0,byteLength:values.byteLength}],
  accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[-.4,0,0],max:[1,1,0]}]};
 if(variant==='scaled-parent'||variant==='translated-parent'){
  nodes.push({name:'PlacementParent',children:[0],...(variant==='scaled-parent'?{scale:[.5,.5,.5]}:{translation:[.2,0,0]})});document.scenes[0].nodes=[nodes.length-1];
 }
 if(variant==='nonunit-quaternion')nodes[0].rotation=[0,0,0,2];
 if(variant==='axis')nodes[0].rotation=[Math.SQRT1_2,0,0,Math.SQRT1_2];
 if(variant==='duplicate-shutter'){
  nodes.push({name:'OpenShutter',mesh:0});nodes[0].children.push(nodes.length-1);
 }
 let json=Buffer.from(JSON.stringify(document));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);
 const bytes=Buffer.alloc(12+8+json.length+8+values.byteLength);bytes.writeUInt32LE(0x46546c67,0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);
 bytes.writeUInt32LE(json.length,12);bytes.writeUInt32LE(0x4e4f534a,16);json.copy(bytes,20);
 const offset=20+json.length;bytes.writeUInt32LE(values.byteLength,offset);bytes.writeUInt32LE(0x004e4942,offset+4);Buffer.from(values.buffer).copy(bytes,offset+8);
 return bytes;
}
async function load(variant){
 const original=globalThis.fetch;
 globalThis.fetch=async url=>new Response(glb(String(url).endsWith('/burger.glb')?variant:'valid'),{status:200});
 const assets=createDetailedFacilityAssets({capabilities:{getMaxAnisotropy:()=>1}});
 try{await assets.readyPromise;return assets;}finally{globalThis.fetch=original;}
}
const facility={kind:'food',presentation:{kind:'detailed-facility',service:'food',profileId:'detailed-consumable-stalls-v1'},product:{id:'independent.burger'},open:true};
test('the actual glTF parser accepts a valid unit model and clones exclusive shutter states',async()=>{
 const assets=await load('valid');assert.equal(assets.error,null);assert.equal(assets.ready,true);
 for(const open of [true,false,true]){
  const model=assets.cloneFacility({...facility,open});assert.deepEqual(model.scale.toArray(),[1,1,1]);
  assert.equal(model.getObjectByName('OpenShutter').visible,open);assert.equal(model.getObjectByName('ClosedShutter').visible,!open);
 }
 assets.dispose();assert.equal(assets.status().geometries,0);assert.equal(assets.status().materials,0);
});
for(const [variant,name] of [['nan','nonfinite positions'],['points','non-Mesh drawable primitives'],['edge','geometry beyond the frozen envelope']])test('asset qualification rejects '+name,async()=>{
 const assets=await load(variant);try{assert.equal(assets.ready,false);assert.equal(typeof assets.error,'string');assert.equal(assets.status().geometries,0);assert.equal(assets.status().materials,0);}finally{assets.dispose();}
});

test('legitimate authored axis conversion remains accepted',async()=>{const assets=await load('axis');try{assert.equal(assets.ready,true);assert.equal(assets.error,null);}finally{assets.dispose();}});
for(const [variant,name] of [['scaled-parent','effective GroundRoot scale'],['translated-parent','effective GroundRoot origin'],['nonunit-quaternion','nonunit root quaternion'],['duplicate-shutter','duplicate original shutter roots']])test('asset qualification rejects '+name,async()=>{
 const assets=await load(variant);try{assert.equal(assets.ready,false);assert.equal(typeof assets.error,'string');assert.equal(assets.status().geometries,0);assert.equal(assets.status().materials,0);}finally{assets.dispose();}
});
