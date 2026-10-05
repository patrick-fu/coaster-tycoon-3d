import {Engine} from '../dist/simulation/index.js';
export const flat={price:61,station:false,end:{x:32,y:0,z:0,turn:0,pitch:0,bank:0},entry:{pitch:0,bank:0},cells:[{x:0,y:0,low:0,high:16,mask:15}]};
export const rules={id:'kernel-tests-v1',evidence:'project-candidate',pathPrice:12,terrainPrice:15,refundPerThousand:500,maxSupport:128,maxHeight:256,pieces:{
 station:{...flat,price:101,station:true},flat,
 right:{...flat,price:80,end:{x:32,y:32,z:0,turn:1,pitch:0,bank:0},cells:[{x:0,y:0,low:0,high:16,mask:15},{x:32,y:0,low:0,high:16,mask:15}]},
 transition:{...flat,price:90,end:{x:32,y:0,z:8,turn:0,pitch:1,bank:0},cells:[{x:0,y:0,low:0,high:32,mask:15}]},
 up:{...flat,price:70,entry:{pitch:1,bank:0},end:{x:32,y:0,z:16,turn:0,pitch:1,bank:0},cells:[{x:0,y:0,low:0,high:32,mask:15}]},
 banked:{...flat,entry:{pitch:0,bank:1}},
}};
export const options={side:32,cash:10000,maxLoan:20000,seed:1234};
export const create=(overrides={})=>new Engine({...options,...overrides},rules);
export function apply(engine,command){const quote=engine.quote(command);if(!quote.ok)throw new Error(JSON.stringify(quote));const result=engine.execute(command,quote.value.revision);if(!result.ok)throw new Error(JSON.stringify(result));return result.value;}
export const ride=(engine,{x=10,y=10,height=32,direction=0}={})=>apply(engine,{type:'create-ride',name:'Lake Runner',tile:{x,y},height,direction}).id;
export const append=(engine,id,piece)=>apply(engine,{type:'append-track',ride:id,piece});
export function loop(engine){const id=ride(engine);for(const piece of ['station','right','right','flat','right','right'])append(engine,id,piece);return id;}
