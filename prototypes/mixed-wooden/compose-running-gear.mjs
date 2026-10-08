import fs from 'node:fs';
import crypto from 'node:crypto';
import {Matrix4,Quaternion,Vector3} from 'three';

const SOURCE_SHA='7b6ae0f47746d4e8bd624ad2323f7cd20abec214711cbfb4e89329adc687202e';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const check=(value,message)=>{if(!value)throw new Error(message);};
const args=Object.fromEntries(Array.from({length:(process.argv.length-2)/2},(_,i)=>[process.argv[2+i*2],process.argv[3+i*2]]));
check(args['--source']&&args['--parts']&&args['--parts-sha']&&args['--output'],'Explicit frozen source, parts hash and output are required.');

function read(file,expected){
 const bytes=fs.readFileSync(file);check(hash(bytes)===expected,'Input hash differs: '+file);
 check(bytes.readUInt32LE(0)===0x46546c67&&bytes.readUInt32LE(4)===2&&bytes.readUInt32LE(8)===bytes.length,'Invalid GLB header.');
 const jsonSize=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+jsonSize).toString()),binStart=28+jsonSize;
 check(g.buffers.length===1&&!g.buffers[0].uri&&g.scenes.length===1&&!g.skins?.length&&!g.animations?.length,'Unsupported standalone GLB shape.');
 return{g,bin:bytes.subarray(binStart,binStart+g.buffers[0].byteLength),bytes};
}
const format={5123:[2,'readUInt16LE','writeUInt16LE'],5125:[4,'readUInt32LE','writeUInt32LE'],5126:[4,'readFloatLE']};
const dimensions={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
function accessor(model,id){
 const a=model.g.accessors[id],v=model.g.bufferViews[a.bufferView],[size,reader]=format[a.componentType]??[],dim=dimensions[a.type];
 check(size&&dim&&!a.sparse&&!a.normalized&&v.buffer===0,'Unsupported geometry accessor.');
 const offset=(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??size*dim;
 check(offset+(a.count-1)*stride+size*dim<=model.bin.length,'Accessor escapes its buffer.');
 return{a,size,values:Array.from({length:a.count},(_,i)=>Array.from({length:dim},(_,j)=>model.bin[reader](offset+i*stride+j*size)))};
}
function matrices(g){
 const result=new Map();
 const walk=(id,parent)=>{
  const n=g.nodes[id];check(n&&!result.has(id),'Repeated active node.');
  const local=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3().fromArray(n.translation??[0,0,0]),new Quaternion().fromArray(n.rotation??[0,0,0,1]),new Vector3().fromArray(n.scale??[1,1,1]));
  const world=parent.clone().multiply(local);check(Math.abs(world.determinant()-1)<1e-6,'Only unit rigid source frames are supported.');result.set(id,world);
  for(const child of n.children??[])walk(child,world);
 };
 for(const id of g.scenes[g.scene??0].nodes)walk(id,new Matrix4());return result;
}
function components(position,indices){
 const parent=Array.from({length:indices.length/3},(_,i)=>i),find=i=>parent[i]===i?i:parent[i]=find(parent[i]),at=new Map();
 for(let t=0;t<parent.length;t++)for(let j=0;j<3;j++){
  const point=position[indices[t*3+j]],key=point.map(n=>Math.round(n*1e7)).join(',');
  if(at.has(key))parent[find(t)]=find(at.get(key));else at.set(key,t);
 }
 const groups=new Map();for(let t=0;t<parent.length;t++){const k=find(t),group=groups.get(k)??[];group.push(t);groups.set(k,group);}return[...groups.values()];
}
const source=read(args['--source'],SOURCE_SHA),parts=read(args['--parts'],args['--parts-sha']);
const g=structuredClone(source.g),sourceWorld=matrices(source.g),partsWorld=matrices(parts.g),chunks=[source.bin];let length=source.bin.length;
const removals=[],changes=[],added=[];
function appendBytes(bytes){const padding=(4-length%4)%4;if(padding){chunks.push(Buffer.alloc(padding));length+=padding;}const offset=length;chunks.push(bytes);length+=bytes.length;return offset;}
const changedIndex=new Map();
for(const bogie of ['BogieFront','BogieRear']){
 const nodeId=g.nodes.findIndex(n=>n.name===bogie),meshNode=g.nodes.find(n=>n.name===bogie+'_Metal');check(nodeId>=0&&meshNode,'Frozen bogie nodes are missing.');
 const primitive=g.meshes[meshNode.mesh].primitives[0],original=source.g.meshes[meshNode.mesh].primitives[0],positions=accessor(source,original.attributes.POSITION),indices=accessor(source,original.indices),list=indices.values.map(v=>v[0]),groups=components(positions.values,list);
 check(groups.length===11&&groups[6].length===108&&groups[10].length===108,'Frozen bracket component inventory differs.');
 const removed=new Set([...groups[6],...groups[10]]),kept=list.filter((_,i)=>!removed.has(Math.floor(i/3)));
 for(const component of [6,10]){
  const points=groups[component].flatMap(t=>list.slice(t*3,t*3+3).map(i=>positions.values[i]));
  const min=[0,1,2].map(a=>Math.min(...points.map(p=>p[a]))),max=[0,1,2].map(a=>Math.max(...points.map(p=>p[a])));
  const side=component===6?-1:1;check(Math.abs((min[0]+max[0])/2-side*.48)<1e-6&&Math.abs(max[0]-min[0]-.04)<1e-6,'Removed component is not the frozen safety bracket.');
  removals.push({bogie,component,triangles:groups[component],bounds:{min,max}});
 }
 if(!changedIndex.has(original.indices)){
  const raw=Buffer.alloc(kept.length*indices.size),writer=format[indices.a.componentType][2];kept.forEach((v,i)=>raw[writer](v,i*indices.size));
  const view=g.bufferViews.length;g.bufferViews.push({buffer:0,byteOffset:appendBytes(raw),byteLength:raw.length,target:34963});const id=g.accessors.length;
  g.accessors.push({...structuredClone(indices.a),bufferView:view,byteOffset:0,count:kept.length,min:[Math.min(...kept)],max:[Math.max(...kept)]});changedIndex.set(original.indices,id);
 }
 primitive.indices=changedIndex.get(original.indices);changes.push({mesh:meshNode.mesh,primitive:0,oldIndices:original.indices,newIndices:primitive.indices});
 for(const side of ['Left','Right']){
  const name='UpstopBracket_'+side,id=parts.g.nodes.findIndex(n=>n.name===name);check(id>=0&&parts.g.nodes[id].mesh!==undefined,'Authored bracket is missing.');
  const input=parts.g.meshes[parts.g.nodes[id].mesh];check(input.primitives.length===1,'Each bracket must be one primitive.');
  const p=input.primitives[0];check((parts.g.materials[p.material].name.split('.')[0])==='metal','Authored bracket has the wrong material.');
  const views=new Map(),accessors=new Map(),copyAccessor=index=>{
   if(accessors.has(index))return accessors.get(index);const a=parts.g.accessors[index];accessor(parts,index);
   if(!views.has(a.bufferView)){const v=parts.g.bufferViews[a.bufferView];const bytes=parts.bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength),target=g.bufferViews.length;g.bufferViews.push({...structuredClone(v),buffer:0,byteOffset:appendBytes(bytes)});views.set(a.bufferView,target);}
   const target=g.accessors.length;g.accessors.push({...structuredClone(a),bufferView:views.get(a.bufferView)});accessors.set(index,target);return target;
  };
  const mesh=g.meshes.length;g.meshes.push({name:name+'_'+bogie,primitives:[{...structuredClone(p),attributes:Object.fromEntries(Object.entries(p.attributes).map(([key,value])=>[key,copyAccessor(value)])),indices:copyAccessor(p.indices),material:original.material}]});
  const sourcePivot=new Vector3().setFromMatrixPosition(sourceWorld.get(nodeId)),desired=new Matrix4().makeTranslation(...sourcePivot.toArray()).multiply(partsWorld.get(id)),local=sourceWorld.get(nodeId).clone().invert().multiply(desired),node=g.nodes.length;
  g.nodes.push({name:name+'_'+bogie,mesh,matrix:local.toArray()});g.nodes[nodeId].children.push(node);added.push({node,mesh,parent:nodeId,name:g.nodes[node].name,sourcePartNode:id,localMatrix:local.toArray(),sourceWorldMatrix:desired.toArray()});
 }
}
check(removals.reduce((n,r)=>n+r.triangles.length,0)===432,'Unexpected removed triangle count.');
const bin=Buffer.concat(chunks);check(bin.subarray(0,source.bin.length).equals(source.bin),'Original BIN prefix changed.');g.buffers[0].byteLength=bin.length;
const jsonRaw=Buffer.from(JSON.stringify(g)),json=Buffer.concat([jsonRaw,Buffer.alloc((4-jsonRaw.length%4)%4,0x20)]),binary=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]),header=Buffer.alloc(12),jhead=Buffer.alloc(8),bhead=Buffer.alloc(8);
header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+json.length+8+binary.length,8);jhead.writeUInt32LE(json.length,0);jhead.writeUInt32LE(0x4e4f534a,4);bhead.writeUInt32LE(binary.length,0);bhead.writeUInt32LE(0x004e4942,4);
const output=Buffer.concat([header,jhead,json,bhead,binary]);fs.writeFileSync(args['--output'],output);
const report={sourceSha256:SOURCE_SHA,partsSha256:args['--parts-sha'],outputSha256:hash(output),originalBinPrefixSha256:hash(source.bin),originalBinPrefixBytes:source.bin.length,removedTriangleCount:432,removals,primitiveChanges:changes,addedNodes:added,originalCounts:Object.fromEntries(['nodes','meshes','accessors','bufferViews','materials','textures','images','samplers'].map(k=>[k,source.g[k]?.length??0])),scope:'Frozen-input bracket replacement only; geometric compatibility and independent preservation checks remain required.'};
fs.writeFileSync(args['--output']+'.composition.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output:args['--output'],sha256:report.outputSha256,removedTriangles:432,addedNodes:added.length}));
