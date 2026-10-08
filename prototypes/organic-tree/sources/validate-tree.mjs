import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.argv[2],require=createRequire(path.join(root,'checks/package.json')),validator=require('gltf-validator'),THREE=require('three'),records=[];
const currentSource=createHash('sha256').update(await readFile(path.join(root,'sources/organic-tree.py'))).digest('hex'),currentDriver=createHash('sha256').update(await readFile(path.join(root,'sources/export.py'))).digest('hex');
for(let lod=0;lod<3;lod++){
 const id=`organic-tree-lod${lod}`,bytes=await readFile(path.join(root,'outputs',id+'.glb')),metadata=JSON.parse(await readFile(path.join(root,'outputs',id+'.json'),'utf8'));
 const validation=await validator.validateBytes(new Uint8Array(bytes),{uri:id+'.glb',maxIssues:1000});
 await writeFile(path.join(root,'checks',id+'-validator.json'),JSON.stringify(validation,null,2)+'\n');
 const length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length)),binary=bytes.subarray(28+length),parents=new Map(),world=new Map(),bounds=new THREE.Box3();
 for(let i=0;i<gltf.nodes.length;i++)for(const child of gltf.nodes[i].children??[])parents.set(child,i);
 const matrix=i=>{if(world.has(i))return world.get(i);const n=gltf.nodes[i],m=n.matrix?new THREE.Matrix4().fromArray(n.matrix):new THREE.Matrix4().compose(new THREE.Vector3(...(n.translation??[0,0,0])),new THREE.Quaternion(...(n.rotation??[0,0,0,1])),new THREE.Vector3(...(n.scale??[1,1,1])));if(parents.has(i))m.premultiply(matrix(parents.get(i)));world.set(i,m);return m;};
 let triangles=0,vertices=0;const issues=[];
 if(metadata.sourceSha256!==currentSource||metadata.driverSha256!==currentDriver)issues.push('Stale source or exporter: delivered LOD does not match current authoring inputs');
 const foliage=gltf.materials.filter(material=>material.name.startsWith('foliage_'));
 if(foliage.length!==2||foliage.some(material=>material.alphaMode!=='MASK'||(material.alphaCutoff??0.5)!==0.5||material.doubleSided!==true||material.pbrMetallicRoughness?.baseColorTexture===undefined))issues.push('Missing real double-sided alpha-masked leaf atlas materials');
 for(let i=0;i<gltf.nodes.length;i++){
  const n=gltf.nodes[i];if((n.scale??[1,1,1]).some(x=>x!==1))issues.push('Nonidentity node scale: '+n.name);
  if(n.mesh===undefined)continue;
  for(const primitive of gltf.meshes[n.mesh].primitives){
   const a=gltf.accessors[primitive.attributes.POSITION],v=gltf.bufferViews[a.bufferView];
   if(a.componentType!==5126||a.type!=='VEC3')throw new Error('Unexpected position encoding');
   for(let j=0;j<a.count;j++){
    const offset=(v.byteOffset??0)+(a.byteOffset??0)+j*(v.byteStride??12),point=new THREE.Vector3(binary.readFloatLE(offset),binary.readFloatLE(offset+4),binary.readFloatLE(offset+8)).applyMatrix4(matrix(i));
    if(!point.toArray().every(Number.isFinite))issues.push('Nonfinite delivered vertex');bounds.expandByPoint(point);vertices++;
   }
   triangles+=(primitive.indices===undefined?a.count:gltf.accessors[primitive.indices].count)/3;
  }
 }
 if(validation.issues.numErrors)issues.push(`${validation.issues.numErrors} validator errors`);
 if(triangles!==metadata.geometry.trianglesEvaluated)issues.push('Exported triangle count differs from actual evaluated source');
 const budget=[[2000,6000],[800,2000],[250,700]][lod];if(triangles<budget[0]||triangles>budget[1])issues.push('Triangle budget exceeded');
 if(bounds.min.x< -1.9||bounds.min.z< -1.9||bounds.min.y< -1e-6||bounds.max.x>1.9||bounds.max.z>1.9||bounds.max.y>7.8)issues.push('Delivered vertex outside unchanged scenery envelope');
 const anchors={};for(const name of ['TreeRoot','GroundAnchor','CrownCenter']){const i=gltf.nodes.findIndex(n=>n.name===name);if(i<0)issues.push('Missing anchor '+name);else anchors[name]=new THREE.Vector3().setFromMatrixPosition(matrix(i)).toArray();}
 if(anchors.TreeRoot?.some(x=>Math.abs(x)>1e-6)||anchors.GroundAnchor?.some(x=>Math.abs(x)>1e-6))issues.push('Root/ground anchor moved');
 const record={asset:id,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,triangles,vertices,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},anchors,meshNodes:gltf.nodes.filter(n=>n.mesh!==undefined).length,materials:gltf.materials.length,images:gltf.images.length,errors:validation.issues.numErrors,warnings:validation.issues.numWarnings,warningCodes:[...new Set(validation.issues.messages.filter(x=>x.severity===1).map(x=>x.code))],issues};records.push(record);console.log(JSON.stringify(record));
}
const result={scope:'Actual remote GLB structure, full transformed vertex envelope, exact triangle budgets and anchors. No original or GPU/human qualification.',validatorVersion:validator.version(),threeRevision:THREE.REVISION,records,passed:records.every(r=>!r.issues.length)};
await writeFile(path.join(root,'checks/validation.json'),JSON.stringify(result,null,2)+'\n');if(!result.passed)process.exitCode=1;
