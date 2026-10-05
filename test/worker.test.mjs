import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {create} from './fixtures.mjs';
import {createHost} from '../dist/simulation/host.js';
test('real worker messages preserve ordering and refuse stale commands and corrupt loads',async()=>{
 const worker=new Worker(new URL('./worker-host.mjs',import.meta.url));let id=0;
 const send=(type,payload)=>new Promise((resolve,reject)=>{const requestId=id++;const receive=response=>{if(response.ok&&response.value.id===requestId){worker.off('message',receive);worker.off('error',fail);resolve(response.value.result);}};const fail=e=>{worker.off('message',receive);reject(e);};worker.on('message',receive);worker.once('error',fail);worker.postMessage({id:requestId,request:{type,payload}});});
 try{
  const c={type:'place-path',tile:{x:5,y:5},height:16,queueFor:null};const q=await send('quote',c);assert(q.ok);
  const [a,b]=await Promise.all([send('execute',{command:c,revision:q.value.revision}),send('execute',{command:{...c,tile:{x:6,y:5}},revision:q.value.revision})]);assert(a.ok);assert.equal(b.error.code,'STALE_REVISION');
  const before=await send('save',null);assert.equal(JSON.parse(before.value).elements.length,1);assert.equal(JSON.parse(before.value).cash,9988);
  assert.equal((await send('load','{"version":999}')).error.code,'INVALID_SAVE');assert.equal((await send('save',null)).value,before.value);
 }finally{await worker.terminate();}
});
test('invalid worker correlation data cannot commit a valid mutation',()=>{
 const e=create(),handle=createHost(e),before=e.exportSave();const r=handle({id:()=>0,request:{type:'execute',payload:{command:{type:'set-loan',amount:100},revision:0}}});assert.equal(r.ok,false);assert.equal(e.exportSave(),before);
});
test('a valid-id malformed request receives a correlated error without committing',async()=>{
 const worker=new Worker(new URL('./worker-host.mjs',import.meta.url));
 try{const response=await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);worker.postMessage({id:77,request:{type:'execute',payload:{command:{type:'set-loan',amount:100}}}});});assert.equal(response.ok,true);assert.equal(response.value.id,77);assert.equal(response.value.result.ok,false);assert.equal(response.value.result.error.code,'INVALID_COMMAND');}
 finally{await worker.terminate();}
});
