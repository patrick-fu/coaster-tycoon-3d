import * as THREE from 'three';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';

export function createFlumeAssets(renderer){
 const geometries=new Set(),materials=new Set(),textures=new Set(),bitmaps=new Set(),templates=new Map(),depths=new Map(),abort=new AbortController();
 let disposed=false;
 const assets={ready:false,error:null,channelMaterials:{}};
 const ownTexture=texture=>{if(!texture)return;textures.add(texture);if(typeof ImageBitmap!=='undefined'&&texture.source?.data instanceof ImageBitmap)bitmaps.add(texture.source.data);};
 const ownMaterial=material=>{if(!material)return;materials.add(material);for(const value of Object.values(material))if(value?.isTexture)ownTexture(value);};
 const own=root=>root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const material of [].concat(object.material??[]))ownMaterial(material);});
 const release=()=>{
  for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const texture of textures){texture.dispose();texture.image=null;}for(const bitmap of bitmaps)bitmap.close();
  geometries.clear();materials.clear();textures.clear();bitmaps.clear();templates.clear();depths.clear();assets.channelMaterials={};
 };
 const loader=new GLTFLoader();
 loader.register(parser=>({name:'ParkFlumeAssetOwnership',loadMesh:async index=>{
  const mesh=await parser.loadMesh(index);own(mesh);if(disposed||assets.error)release();return mesh;
 },beforeRoot:async()=>{
  const dependencies=await Promise.allSettled([
   ...Array.from({length:parser.json.textures?.length??0},(_,i)=>parser.getDependency('texture',i).then(texture=>{if(!texture)throw new Error('Flume model texture could not decode.');ownTexture(texture);})),
   ...Array.from({length:parser.json.materials?.length??0},(_,i)=>parser.getDependency('material',i).then(ownMaterial)),
  ]);
  if(disposed){release();throw new Error('Flume loading was cancelled.');}const failure=dependencies.find(r=>r.status==='rejected');if(failure)throw failure.reason;
 }}));
 const depthFor=material=>{
  if(!depths.has(material)){const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:material.side,map:material.map,alphaMap:material.alphaMap,alphaTest:material.alphaTest});depths.set(material,depth);materials.add(depth);}
  return depths.get(material);
 };
 const unit=(object,position=new THREE.Vector3())=>object.position.distanceTo(position)<1e-6&&object.scale.distanceTo(new THREE.Vector3(1,1,1))<1e-6&&object.quaternion.angleTo(new THREE.Quaternion())<1e-6;
 async function model(kind){
  const url=new URL(`../models/flume/${kind}.glb`,import.meta.url).href,response=await fetch(url,{signal:abort.signal});
  if(!response.ok)throw new Error(`Flume ${kind} model returned HTTP ${response.status}.`);
  const gltf=await loader.parseAsync(await response.arrayBuffer(),new URL('.',url).href);own(gltf.scene);
  if(disposed){release();return;}
  const root=gltf.scene.getObjectByName(kind==='boat'?'BoatRoot':'RiderRoot');
  if(!root||root.parent!==gltf.scene||gltf.scene.children.length!==1||!unit(gltf.scene)||!unit(root))throw new Error(`Flume ${kind} unit root is missing or transformed.`);
  if(kind==='boat'){
   for(let slot=0;slot<4;slot++){const seat=root.getObjectByName('Seat_'+String(slot).padStart(2,'0'));if(!seat||seat.parent!==root||!unit(seat,new THREE.Vector3(0,.6,1.05-slot*.7)))throw new Error('Flume ordered Hip anchors differ from the unit datum.');}
  }else{const hip=root.getObjectByName('Hip');if(!hip||hip.parent!==root||!unit(hip))throw new Error('Flume rider Hip datum is missing or transformed.');}
  gltf.scene.traverse(object=>{
   if(!object.isMesh)return;if(object.isSkinnedMesh||Array.isArray(object.material))throw new Error('Flume models require static single-material primitives.');
   object.castShadow=true;object.receiveShadow=true;object.customDepthMaterial=depthFor(object.material);
   for(const value of Object.values(object.material))if(value?.isTexture)value.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  });
  templates.set(kind,gltf.scene);
 }
 const mapLoader=new THREE.TextureLoader();
 async function channelMaterial(key,id,color,metalness=0){
  const maps=await Promise.allSettled(['Color','NormalGL','Roughness'].map(async suffix=>{
   const url=new URL(`../textures/flume/${id}/${id}_1K-PNG_${suffix}.png`,import.meta.url).href,texture=await mapLoader.loadAsync(url);ownTexture(texture);
   if(disposed){release();return texture;}
   texture.colorSpace=suffix==='Color'?THREE.SRGBColorSpace:THREE.NoColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return texture;
  }));
  const failure=maps.find(r=>r.status==='rejected');if(failure)throw failure.reason;
  if(disposed)return;
  const material=new THREE.MeshStandardMaterial({color,map:maps[0].value,normalMap:maps[1].value,normalScale:new THREE.Vector2(.55,.55),roughnessMap:maps[2].value,roughness:1,metalness});ownMaterial(material);depthFor(material);assets.channelMaterials[key]=material;
 }
 assets.readyPromise=Promise.allSettled([
  model('boat'),model('rider'),channelMaterial('timber','Wood096','#c9b79c'),channelMaterial('boards','WoodFloor043','#d0bc9e'),channelMaterial('metal','Metal049A','#70756b',.65),channelMaterial('concrete','Concrete034','#d5cfbe'),channelMaterial('roof','RoofingTiles013A','#d0c2a5'),
 ]).then(results=>{
  const failure=results.find(r=>r.status==='rejected');if(disposed||failure){release();if(!disposed)assets.error=String(failure.reason?.message??failure.reason);return;}assets.ready=true;
 });
 const clone=kind=>{
  if(disposed||!assets.ready)throw new Error('Flume assets are unavailable.');
  const model=templates.get(kind).clone(true);model.traverse(object=>{if(object.isMesh)object.customDepthMaterial=depthFor(object.material);});return model;
 };
 assets.cloneBoat=()=>clone('boat');assets.cloneRider=()=>clone('rider');assets.depthMaterial=material=>depths.get(material);
 assets.status=()=>({ready:assets.ready,error:assets.error,disposed,geometries:geometries.size,materials:materials.size,textures:textures.size,bitmaps:bitmaps.size});
 assets.dispose=()=>{if(disposed)return;disposed=true;assets.ready=false;abort.abort();release();};
 return assets;
}
