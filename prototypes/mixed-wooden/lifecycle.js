import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {createWoodenAssets} from './art/wooden-assets.js';

export async function verifyWoodenLifetimes(renderer){
 const red=await import('./art/wooden-assets-late-red.js'),results=[];
 const empty=status=>['geometries','materials','textures','bitmaps'].every(key=>status[key]===0);
 async function check(name,factory,cancel,expectLeak){
  let enter,release,complete;
  const entered=new Promise(resolve=>enter=resolve),gate=new Promise(resolve=>release=resolve),completed=new Promise(resolve=>complete=resolve);
  const parse=GLTFLoader.prototype.parse;
  let assets;
  GLTFLoader.prototype.parse=function(...args){
   this.register(parser=>{
    if(parser.json.nodes.some(node=>node.name==='RailRoot')){
     const load=parser.loadMesh.bind(parser);
     parser.loadMesh=async index=>{
      if(index===0){enter();await gate;const mesh=await load(index);complete();return mesh;}
      if(!cancel&&index===1)throw new Error('CONTROL: failed mesh sibling');
      return load(index);
     };
    }
    return{name:'ParkWoodenLifetimeControl'};
   });
   return parse.apply(this,args);
  };
  try{
   assets=factory(renderer);await entered;
   if(cancel)assets.dispose();else await assets.readyPromise;
   const terminal=assets.status();
   if(!empty(terminal)||cancel&&!terminal.disposed||!cancel&&!terminal.error?.includes('CONTROL: failed mesh sibling'))throw new Error(name+': incorrect initial terminal status');
   release();await completed;await assets.readyPromise;
   // Drain the owner continuation after the deliberately delayed mesh resolves.
   await new Promise(resolve=>setTimeout(resolve,0));
   const late=assets.status();
   if(expectLeak?empty(late):!empty(late))throw new Error(name+': unexpected delayed-resource ownership');
   assets.dispose();const disposed=assets.status();if(!empty(disposed)||!disposed.disposed)throw new Error(name+': disposal failed');
   results.push({name,terminal,late,disposed,expectedLeakRejected:expectLeak});
  }finally{
   release();assets?.dispose();GLTFLoader.prototype.parse=parse;
  }
 }
 await check('old-owner-delayed-failure',red.createWoodenAssets,false,true);
 await check('repaired-owner-delayed-failure',createWoodenAssets,false,false);
 await check('repaired-owner-cancel-during-load',createWoodenAssets,true,false);
 return results;
}
