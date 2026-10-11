import * as THREE from 'three';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';

export function createTreeAssets(renderer){
 const templates=new Map(),components=new Map(),geometries=new Set(),materials=new Set(),textures=new Set(),bitmaps=new Set();
 let disposed=false;
 const assets={ready:false,error:null};
 const ownTexture=texture=>{
  if(!texture)return;
  textures.add(texture);
  if(typeof ImageBitmap!=='undefined'&&texture.source?.data instanceof ImageBitmap)bitmaps.add(texture.source.data);
 };
 const own=root=>root.traverse(object=>{
  if(object.geometry)geometries.add(object.geometry);
  for(const material of [...[].concat(object.material??[]),object.customDepthMaterial].filter(Boolean)){
   materials.add(material);
   for(const value of Object.values(material))if(value?.isTexture)ownTexture(value);
  }
 });
 const release=()=>{
  for(const value of geometries)value.dispose();
  for(const value of materials)value.dispose();
  for(const value of textures)value.dispose();
  for(const value of bitmaps)value.close();
  geometries.clear();materials.clear();textures.clear();bitmaps.clear();templates.clear();components.clear();
 };
 const failedResources=[],manager=new THREE.LoadingManager();
 manager.onError=url=>failedResources.push(url);
 const loader=new GLTFLoader(manager);
 loader.register(parser=>({name:'ParkTreeTextureOwnership',beforeRoot:async()=>{
  // Own images before mesh parsing: a later buffer failure otherwise loses
  // bitmaps created by the loader's parallel material dependencies.
  for(const texture of await parser.getDependencies('texture'))ownTexture(texture);
  if(disposed){release();throw new Error('Tree loading was cancelled.');}
 }}));
 assets.readyPromise=Promise.allSettled([0,1,2].map(async lod=>{
  const gltf=await loader.loadAsync(new URL(`../models/trees/organic-tree-lod${lod}.gltf`,import.meta.url).href);
  const model=gltf.scene;
  own(model);
  if(disposed){release();return;}
  model.traverse(object=>{
   if(!object.isMesh)return;
   if(Array.isArray(object.material))throw new Error('Tree primitives require a single material.');
   const material=object.material;
   for(const value of Object.values(material))if(value?.isTexture)value.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
   // Retire shadow samplers together with their source bitmap, including alpha masks.
   object.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,
    side:material.side,map:material.map,alphaMap:material.alphaMap,alphaTest:material.alphaTest});
   materials.add(object.customDepthMaterial);
   object.castShadow=true;object.receiveShadow=true;object.geometry.userData.treeLod=lod;
  });
  model.updateMatrixWorld(true);
  const primitives=new Map();
  model.traverse(object=>{if(object.isMesh){
   const key=object.material.name;
   if(primitives.has(key))throw new Error('Tree LOD primitives require unique material names.');
   object.userData.treePrimitive=key;primitives.set(key,object);
  }});
  own(model);templates.set(lod,model);components.set(lod,primitives);
 })).then(results=>{
  const failure=results.find(result=>result.status==='rejected');
  if(disposed||failure||failedResources.length){release();if(!disposed){if(failure)assets.error=String(failure.reason?.message??failure.reason);else if(failedResources.length)assets.error='Tree resources failed to load: '+failedResources.join(', ');}return;}
  // Geometry can be exchanged in place only when primitive poses agree.
  const reference=components.get(0);
  for(const primitives of components.values()){
   if(primitives.size!==reference.size||[...reference].some(([key,mesh])=>!primitives.get(key)?.matrixWorld.equals(mesh.matrixWorld))){
    assets.error='Tree LOD primitives require identical source poses.';release();return;
   }
  }
  assets.ready=true;
 });
 assets.add=(parent,x,y,z,seed,lod)=>{
  if(!assets.ready||disposed)return false;
  const template=templates.get(lod),model=template.clone(true),sourceMeshes=[];
  template.traverse(object=>{if(object.isMesh)sourceMeshes.push(object);});
  let index=0;
  // Mesh.clone shares geometry/material but omits customDepthMaterial.
  model.traverse(object=>{if(object.isMesh){object.customDepthMaterial=sourceMeshes[index++].customDepthMaterial;object.userData.treePlacement=parent.userData.selection?.kind==='element';}});
  model.position.set(x,y,z);model.rotation.y=(seed%4)*Math.PI/2;
  parent.add(model);parent.userData.detailedTree=true;
  return true;
 };
 assets.setLOD=(root,lod)=>{
  if(!assets.ready||disposed)return;
  root.traverse(mesh=>{
   if(!mesh.isMesh||!mesh.userData.treePlacement)return;
   const source=components.get(lod).get(mesh.userData.treePrimitive);
   mesh.geometry=source.geometry;mesh.material=source.material;mesh.customDepthMaterial=source.customDepthMaterial;
   if(mesh.isInstancedMesh){mesh.boundingSphere=null;mesh.boundingBox=null;}
  });
 };
 assets.dispose=()=>{disposed=true;assets.ready=false;release();};
 return assets;
}
