import * as THREE from 'three';
import {createSurfacePalette} from './surface-palette.js';

export function createSurfaceAssets(renderer){
 const controller=new AbortController(),textures=new Set(),bitmaps=new Set();
 const assets={ready:false,error:null,palette:null};
 let disposed=false;
 const release=()=>{
  for(const texture of textures){texture.dispose();texture.image=null;}
  for(const bitmap of bitmaps)bitmap.close();
  textures.clear();bitmaps.clear();assets.palette=null;assets.ready=false;
 };
 const sets={grass:{},paving:{}};
 assets.readyPromise=Promise.allSettled(['grass','paving'].flatMap(role=>['color','normal','roughness'].map(async kind=>{
  const url=new URL(`../textures/surfaces/${role}-${kind}.png`,import.meta.url);
  const response=await fetch(url,{signal:controller.signal});
  if(!response.ok)throw new Error(`${role} ${kind}: HTTP ${response.status}`);
  // Bitmap decoding skips browser colour conversion for linear data maps.
  // Flip rows here: WebGL ignores Texture.flipY for an ImageBitmap source.
  const bitmap=await createImageBitmap(await response.blob(),{imageOrientation:'flipY',premultiplyAlpha:'none',colorSpaceConversion:'none'});
  if(disposed||controller.signal.aborted){bitmap.close();throw new Error('Surface loading was cancelled.');}
  bitmaps.add(bitmap);
  const texture=new THREE.Texture(bitmap);textures.add(texture);
  texture.name=`${role}-${kind}`;texture.flipY=false;
  texture.colorSpace=kind==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  // Whole repeats preserve existing per-tile UV seams without geometry changes.
  texture.repeat.setScalar(role==='grass'?3:4);
  texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate=true;sets[role][kind]=texture;
 }))).then(results=>{
  const failure=results.find(result=>result.status==='rejected');
  if(disposed||failure){
   if(!disposed)assets.error=String(failure?.reason?.message??'Surface loading failed.');
   release();return;
  }
  assets.palette=createSurfacePalette(sets);assets.ready=true;
 });
 assets.dispose=()=>{if(disposed)return;disposed=true;controller.abort();release();};
 assets.status=()=>({ready:assets.ready,error:assets.error,textures:textures.size,bitmaps:bitmaps.size,disposed});
 return assets;
}
