import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import path from 'node:path';

const root=path.resolve(process.argv[2]),require=createRequire(path.join(root,'checks/package.json'));
const validator=require('gltf-validator'),THREE=require('three'),records=[];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

function positions(json,binary){
 const parents=new Map(),world=new Map(),points=[];
 for(let i=0;i<json.nodes.length;i++)for(const child of json.nodes[i].children??[])parents.set(child,i);
 function matrix(i){
  if(world.has(i))return world.get(i);
  const n=json.nodes[i],m=n.matrix?new THREE.Matrix4().fromArray(n.matrix):new THREE.Matrix4().compose(new THREE.Vector3(...(n.translation??[0,0,0])),new THREE.Quaternion(...(n.rotation??[0,0,0,1])),new THREE.Vector3(...(n.scale??[1,1,1])));
  if(parents.has(i))m.premultiply(matrix(parents.get(i)));
  world.set(i,m);return m;
 }
 for(let i=0;i<json.nodes.length;i++){
  const node=json.nodes[i];if(node.mesh===undefined)continue;
  for(const primitive of json.meshes[node.mesh].primitives){
   const accessor=json.accessors[primitive.attributes.POSITION],view=json.bufferViews[accessor.bufferView];
   if(accessor.componentType!==5126||accessor.type!=='VEC3')throw new Error('Unexpected vertex encoding');
   for(let j=0;j<accessor.count;j++){
    const offset=(view.byteOffset??0)+(accessor.byteOffset??0)+j*(view.byteStride??12);
    points.push(...new THREE.Vector3(binary.readFloatLE(offset),binary.readFloatLE(offset+4),binary.readFloatLE(offset+8)).applyMatrix4(matrix(i)).toArray());
   }
  }
 }
 return points;
}

for(const lod of [0,1,2]){
 const id=`organic-tree-lod${lod}`,file=path.join(root,'outputs',id+'.gltf'),text=await readFile(file,'utf8'),json=JSON.parse(text);
 const external=async uri=>{
  const target=path.resolve(path.dirname(file),uri);
  if(!target.startsWith(path.join(root,'outputs')+path.sep))throw new Error('Resource outside export directory');
  return new Uint8Array(await readFile(target));
 };
 const check=await validator.validateString(text,{uri:id+'.gltf',externalResourceFunction:external,maxIssues:1000});
 const binary=Buffer.from(await external(json.buffers[0].uri)),glb=await readFile(path.join(root,'outputs',id+'.glb'));
 const length=glb.readUInt32LE(12),embedded=JSON.parse(glb.subarray(20,20+length)),embeddedBinary=glb.subarray(28+length);
 const actual=positions(json,binary),reference=positions(embedded,embeddedBinary),issues=[];
 const vertexResidual=actual.length===reference.length?Math.max(0,...actual.map((value,i)=>Math.abs(value-reference[i]))):Infinity;
 if(!Number.isFinite(vertexResidual)||vertexResidual>1e-9)issues.push('Separate-runtime vertices differ from inspected GLB');
 const images=[];
 for(let i=0;i<json.images.length;i++){
  const delivered=Buffer.from(await external(json.images[i].uri)),view=embedded.bufferViews[embedded.images[i].bufferView];
  const inspected=embeddedBinary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
  const matches=hash(delivered)===hash(inspected);
  if(!matches)issues.push('Separate-runtime image differs from inspected GLB: '+json.images[i].uri);
  images.push({uri:json.images[i].uri,bytes:delivered.length,sha256:hash(delivered),matchesInspectedGlb:matches});
 }
 if(check.issues.numErrors)issues.push('Structural validator errors');
 const record={asset:id,sha256:hash(Buffer.from(text)),vertexCoordinates:actual.length,vertexResidual,images,
  validatorErrors:check.issues.numErrors,validatorWarnings:check.issues.numWarnings,issues};
 records.push(record);console.log(JSON.stringify(record));
}
const result={scope:'Actual separate runtime exports versus inspected GLBs: full transformed vertices and exact embedded/external image bytes. No original or real-GPU qualification.',records,passed:records.every(record=>!record.issues.length)};
await writeFile(path.join(root,'checks/runtime-validation.json'),JSON.stringify(result,null,2)+'\n');
if(!result.passed)process.exitCode=1;
