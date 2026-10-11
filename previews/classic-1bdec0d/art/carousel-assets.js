import * as THREE from 'three';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';

export function createCarouselAssets(renderer){
 const geometries=new Set(),materials=new Set(),textures=new Set(),bitmaps=new Set(),depths=new Map(),abort=new AbortController();
 let disposed=false,template=null;
 const assets={ready:false,error:null,materials:{}};
 const ownTexture=texture=>{if(!texture)return;textures.add(texture);if(typeof ImageBitmap!=='undefined'&&texture.source?.data instanceof ImageBitmap)bitmaps.add(texture.source.data);};
 const ownMaterial=material=>{if(!material)return;materials.add(material);for(const value of Object.values(material))if(value?.isTexture)ownTexture(value);};
 const own=root=>root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const material of [].concat(object.material??[]))ownMaterial(material);});
 const release=()=>{
  for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const texture of textures){texture.dispose();texture.image=null;}for(const bitmap of bitmaps)bitmap.close();
  geometries.clear();materials.clear();textures.clear();bitmaps.clear();depths.clear();template=null;assets.materials={};
 };
 const loader=new GLTFLoader();
 loader.register(parser=>({name:'ParkCarouselAssetOwnership',loadMesh:async index=>{
  const mesh=await parser.loadMesh(index);own(mesh);if(disposed||assets.error)release();return mesh;
 },beforeRoot:async()=>{
  const dependencies=await Promise.allSettled([
   ...Array.from({length:parser.json.textures?.length??0},(_,i)=>parser.getDependency('texture',i).then(ownTexture)),
   ...Array.from({length:parser.json.materials?.length??0},(_,i)=>parser.getDependency('material',i).then(ownMaterial)),
  ]);
  if(disposed){release();throw new Error('Carousel loading was cancelled.');}const failure=dependencies.find(r=>r.status==='rejected');if(failure)throw failure.reason;
 }}));
 assets.readyPromise=(async()=>{
  try{
   const url=new URL('../models/carousel/body.glb',import.meta.url).href,response=await fetch(url,{signal:abort.signal});
   if(!response.ok)throw new Error(`Carousel model returned HTTP ${response.status}.`);
   const gltf=await loader.parseAsync(await response.arrayBuffer(),new URL('.',url).href);own(gltf.scene);
   if(disposed){release();return;}
   const root=gltf.scene.getObjectByName('CarouselRoot'),rotor=gltf.scene.getObjectByName('RotorRoot');
   if(!root||!rotor||rotor.parent!==root)throw new Error('Carousel static root or rotor is missing.');
   for(let slot=0;slot<16;slot++){const seat=gltf.scene.getObjectByName('Seat_'+String(slot).padStart(2,'0'));if(!seat||seat.parent!==rotor)throw new Error('Carousel ordered seat anchors are missing.');}
   for(const name of ['DeckRoot','EntranceBuildingRoot','ExitBuildingRoot','EntranceDeckInterface','ExitDeckInterface'])if(!gltf.scene.getObjectByName(name))throw new Error('Carousel interface anchors are missing.');
   gltf.scene.traverse(object=>{
    if(!object.isMesh)return;object.castShadow=true;object.receiveShadow=true;
    if(Array.isArray(object.material))throw new Error('Carousel primitives require one material.');
    const material=object.material;assets.materials[material.name]=material;
    for(const value of Object.values(material))if(value?.isTexture)value.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    if(!depths.has(material)){const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:material.side,map:material.map,alphaMap:material.alphaMap,alphaTest:material.alphaTest});depths.set(material,depth);materials.add(depth);}
    object.customDepthMaterial=depths.get(material);
   });
   gltf.scene.updateMatrixWorld(true);template=gltf.scene;assets.ready=true;
  }catch(error){release();if(!disposed)assets.error=String(error?.message??error);}
 })();
 assets.cloneBody=()=>{
  if(disposed||!assets.ready)throw new Error('Carousel assets are unavailable.');
  const model=template.clone(true),depth=[];template.traverse(o=>{if(o.isMesh)depth.push(o.customDepthMaterial);});let i=0;model.traverse(o=>{if(o.isMesh)o.customDepthMaterial=depth[i++];});return model;
 };
 assets.depthMaterial=material=>depths.get(material);
 assets.status=()=>({ready:assets.ready,error:assets.error,disposed,geometries:geometries.size,materials:materials.size,textures:textures.size,bitmaps:bitmaps.size});
 assets.dispose=()=>{if(disposed)return;disposed=true;assets.ready=false;abort.abort();release();};
 return assets;
}
