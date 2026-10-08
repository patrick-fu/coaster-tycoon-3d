import * as THREE from 'three';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';

export function createWoodenAssets(renderer){
 const geometries=new Set(),materials=new Set(),textures=new Set(),bitmaps=new Set(),templates=new Map(),depths=new Map(),abort=new AbortController();
 let disposed=false;
 const assets={ready:false,error:null,materials:{}};
 const ownTexture=texture=>{
  if(!texture)return;textures.add(texture);
  if(typeof ImageBitmap!=='undefined'&&texture.source?.data instanceof ImageBitmap)bitmaps.add(texture.source.data);
 };
 const own=root=>root.traverse(object=>{
  if(object.geometry)geometries.add(object.geometry);
  for(const material of [...[].concat(object.material??[]),object.customDepthMaterial].filter(Boolean)){
   materials.add(material);for(const value of Object.values(material))if(value?.isTexture)ownTexture(value);
  }
 });
 const release=()=>{
  for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();
  for(const texture of textures){texture.dispose();texture.image=null;}for(const bitmap of bitmaps)bitmap.close();
  geometries.clear();materials.clear();textures.clear();bitmaps.clear();templates.clear();depths.clear();assets.materials={};
 };
 const loader=new GLTFLoader();
 loader.register(parser=>({name:'ParkWoodenAssetOwnership',loadMesh:async index=>{
  // Preserve node-name allocation order while owning meshes as the loader creates them.
  const mesh=await parser.loadMesh(index);own(mesh);if(disposed||assets.error)release();return mesh;
 },beforeRoot:async()=>{
  // Own every successful dependency even when a sibling fails or parse is cancelled.
  const dependencies=await Promise.allSettled([
   ...Array.from({length:parser.json.textures?.length??0},(_,i)=>parser.getDependency('texture',i).then(ownTexture)),
   ...Array.from({length:parser.json.materials?.length??0},(_,i)=>parser.getDependency('material',i).then(material=>{materials.add(material);for(const value of Object.values(material))if(value?.isTexture)ownTexture(value);})),
  ]);
  if(disposed){release();throw new Error('Wooden asset loading was cancelled.');}
  const failure=dependencies.find(result=>result.status==='rejected');if(failure)throw failure.reason;
 }}));
 assets.readyPromise=Promise.allSettled(['car','link','station'].map(async kind=>{
  const url=new URL(`../models/wooden/${kind}.glb`,import.meta.url).href,response=await fetch(url,{signal:abort.signal});
  if(!response.ok)throw new Error(`Wooden ${kind} asset returned HTTP ${response.status}.`);
  const gltf=await loader.parseAsync(await response.arrayBuffer(),new URL('.',url).href);own(gltf.scene);
  if(disposed){release();return;}
  gltf.scene.traverse(object=>{
   if(!object.isMesh)return;object.castShadow=true;object.receiveShadow=true;
   if(Array.isArray(object.material))throw new Error('Wooden model primitives require a single material.');
   const material=object.material;
   for(const value of Object.values(material))if(value?.isTexture)value.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
   // Asset-owned depth materials retire shadow samplers with their decoded bitmap.
   if(!depths.has(material)){const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:material.side,map:material.map,alphaMap:material.alphaMap,alphaTest:material.alphaTest});depths.set(material,depth);materials.add(depth);}
   object.customDepthMaterial=depths.get(material);
  });
  gltf.scene.updateMatrixWorld(true);templates.set(kind,gltf.scene);
 })).then(results=>{
  const failure=results.find(result=>result.status==='rejected');
  if(disposed||failure){release();if(!disposed)assets.error=String(failure.reason?.message??failure.reason);return;}
  const required={car:['RailRoot','BogieFront','BogieRear','Seat_FrontLeft','Seat_FrontRight','Seat_RearLeft','Seat_RearRight','LapBar_Front','LapBar_Rear',...['BogieFront','BogieRear'].flatMap(bogie=>['Left','Right'].map(side=>'UpstopBracket_'+side+'_'+bogie))],link:['DrawbarRoot','Joint_EndA','Joint_EndB'],station:['StationRoot','RailIn','RailOut','QueueGate','ExitGate','QueueGate_Hinge','ExitGate_Hinge']};
  for(const [kind,names] of Object.entries(required))if(names.some(name=>!templates.get(kind).getObjectByName(name))){assets.error=`Wooden ${kind} asset has missing anchors.`;release();return;}
  templates.get('station').traverse(object=>{for(const material of [].concat(object.material??[])){const key=material.name.split('.')[0];if(['timber','boards','metal','brass','cream'].includes(key))assets.materials[key]=material;}});
  if(['timber','boards','metal','brass','cream'].some(key=>!assets.materials[key])){assets.error='Wooden station materials are incomplete.';release();return;}
  assets.ready=true;
 });
 const clone=kind=>{
  if(disposed||!assets.ready)throw new Error('Wooden assets are unavailable.');
  const template=templates.get(kind),model=template.clone(true),depths=[];template.traverse(object=>{if(object.isMesh)depths.push(object.customDepthMaterial);});let i=0;
  model.traverse(object=>{if(object.isMesh)object.customDepthMaterial=depths[i++];});return model;
 };
 assets.cloneCar=()=>clone('car');assets.cloneLink=()=>clone('link');assets.cloneStation=()=>clone('station');
 assets.stationAnchor=name=>{if(disposed||!assets.ready)throw new Error('Wooden station anchors are unavailable.');return templates.get('station').getObjectByName(name).getWorldPosition(new THREE.Vector3());};
 assets.depthMaterial=material=>depths.get(material);
 assets.status=()=>({ready:assets.ready,error:assets.error,disposed,geometries:geometries.size,materials:materials.size,textures:textures.size,bitmaps:bitmaps.size});
 assets.dispose=()=>{if(disposed)return;disposed=true;assets.ready=false;abort.abort();release();};
 return assets;
}
