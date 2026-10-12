import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetailedFacilityAssets} from '../web-dist/art/detailed-facility-assets.js';

function glb(variant){
 const names=['GroundRoot','Counter_Front','Counter_Back','Counter_Left','Counter_Right','Sign_Front','PropMap','PropUmbrella'];
 const positions=[[0,0,0],[0,.88,1.52],[0,.88,-1.52],[-1.52,.88,0],[1.52,.88,0],[0,2.33,1.73],[.30,.88,1.40],[-1.64,.22,1.64]];
 const nodes=names.map((name,i)=>({name,translation:positions[i]}));nodes[0].children=[1,2,3,4,5,6,7,8];nodes.push({mesh:0});
 const values=new Float32Array([-.4,0,0,.4,0,0,0,1,0]);
 if(variant==='wrong-counter')nodes[1].translation=[.1,.88,1.52];
 if(variant==='missing-map')nodes[6].name='MissingMap';
 if(variant==='duplicate-counter'){nodes.push({...nodes[1]});nodes[0].children.push(9);}
 if(variant==='scaled-root')nodes[0].scale=[.5,.5,.5];
 if(variant==='bounds')values[3]=2;
 if(variant==='nan')values[0]=NaN;
 const document={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes,meshes:[{primitives:[{attributes:{POSITION:0},material:0}]}],materials:[{name:'brass',pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.7}}],buffers:[{byteLength:values.byteLength}],bufferViews:[{buffer:0,byteOffset:0,byteLength:values.byteLength}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[-.4,0,0],max:[2,1,0]}]};
 let json=Buffer.from(JSON.stringify(document));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);
 const bytes=Buffer.alloc(28+json.length+values.byteLength);bytes.writeUInt32LE(0x46546c67,0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);bytes.writeUInt32LE(json.length,12);bytes.writeUInt32LE(0x4e4f534a,16);json.copy(bytes,20);
 const offset=20+json.length;bytes.writeUInt32LE(values.byteLength,offset);bytes.writeUInt32LE(0x004e4942,offset+4);Buffer.from(values.buffer).copy(bytes,offset+8);return bytes;
}
async function load(variant,{reflectionTexture=null}={}){
 const original=globalThis.fetch,urls=[];globalThis.fetch=async url=>{urls.push(String(url));return new Response(glb(variant),{status:200});};
 const assets=createDetailedFacilityAssets({capabilities:{getMaxAnisotropy:()=>1}},{information:true,reflectionTexture});
 try{await assets.readyPromise;assert.equal(urls.length,1);assert(urls[0].endsWith('/models/information/information-kiosk.glb'));return assets;}finally{globalThis.fetch=original;}
}
const facility={kind:'information',open:true,presentation:{kind:'detailed-facility',service:'information',profileId:'detailed-information-kiosk-v1'},products:{'independent.map':{price:6},'independent.umbrella':{price:25}}};
test('the actual glTF parser qualifies a fixed information owner and preserves borrowed lighting through disposal',{timeout:5000},async()=>{
 let foreignDisposed=0;const reflection={isTexture:true,dispose:()=>foreignDisposed++},assets=await load('valid',{reflectionTexture:reflection});
 try{assert.equal(assets.ready,true);assert.equal(assets.error,null);for(const open of [true,false]){const model=assets.cloneFacility({...facility,open});assert.deepEqual(model.scale.toArray(),[1,1,1]);assert(model.getObjectByName('Counter_Front'));assert(model.getObjectByName('PropUmbrella'));}
  assert.throws(()=>assets.cloneFacility({...facility,kind:'food'}));assert.throws(()=>assets.cloneFacility({...facility,products:{'independent.map':{price:6}}}));
 }finally{assets.dispose();assets.dispose();}
 assert.equal(foreignDisposed,0);assert.equal(assets.status().disposed,true);assert.equal(assets.status().geometries,0);assert.equal(assets.status().materials,0);assert.equal(assets.status().textures,0);assert.throws(()=>assets.cloneFacility(facility));
});
for(const variant of ['wrong-counter','missing-map','duplicate-counter','scaled-root','bounds','nan'])test('information qualification rejects '+variant+' and releases owned resources',{timeout:5000},async()=>{
 const assets=await load(variant);try{assert.equal(assets.ready,false);assert.equal(typeof assets.error,'string');assert.equal(assets.status().geometries,0);assert.equal(assets.status().materials,0);}finally{assets.dispose();}
});
