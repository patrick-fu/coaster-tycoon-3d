import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';

// Independently authored, CPU-only geometry replay. It reads the delivered GLB
// and reproduces a bounded pose fixture; it does not run production simulation.
const root=path.dirname(fileURLToPath(import.meta.url));
const argumentsMap=new Map();
for(let i=2;i<process.argv.length;i+=2)argumentsMap.set(process.argv[i],process.argv[i+1]);
const output=argumentsMap.get('--output')??path.join(root,'curved-counterexample-result.json');
if(!path.resolve(output).startsWith(path.resolve(root)+path.sep)||!path.basename(output).startsWith('curved-counterexample'))throw new Error('Output must use the curved-counterexample prefix in the owned workspace.');
const assetPath='/workspace/coaster-detailed-assets/outputs/wooden-car.glb';
const descriptorPath=path.join(root,'pinned-source/steel-coaster.ts');
const runtimePath='/workspace/coaster-classic-game/app/node_modules/three/build/three.module.js';
const expectedAssetHash='fc988c55ed60dcd5abf7c5e02ecbc1ac3a8cd828cfe7fe4bb8f30bcf21699b59';
const expectedDescriptorHash='8000bd186760ef3893898ce6b5710bffa7207a021bb8f7bb563da1e88116ecef';
const tolerances={separatingAxisProjectionMetres:1e-9,ignoredAxisLengthSquared:1e-16,strictInteriorFraction:1e-6,reportedScalarReplayMetres:1e-10,reportedWitnessReplayFraction:1e-10};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const originalUnknown='No original RCT2 dimensional, motion, spacing, collision or gameplay equality is asserted.';

async function replay(){
 const {Matrix4,Vector3,Quaternion,Box3,Triangle,Ray,REVISION}=await import(pathToFileURL(runtimePath).href);
 const runnerBytes=await readFile(fileURLToPath(import.meta.url));
 const assetBytes=await readFile(assetPath),assetHash=hash(assetBytes);
 if(assetHash!==expectedAssetHash)throw new Error('Delivered model hash differs from the exact reported sample.');
 const descriptorBytes=await readFile(descriptorPath),descriptorHash=hash(descriptorBytes),descriptor=descriptorBytes.toString('utf8');
 if(descriptorHash!==expectedDescriptorHash)throw new Error('Pinned candidate curve descriptor differs from the inspected production source.');
 const curveSource=descriptor.slice(descriptor.indexOf('function curve('),descriptor.indexOf('export const steelRules'));
 const radiusNative=Number(curveSource.match(/const radius=(\d+)/)?.[1]);
 const sampleSegments=Number(curveSource.match(/length:(\d+)/)?.[1])-1;
 const angularDivisor=Number(curveSource.match(/i\*Math\.PI\/(\d+)/)?.[1]);
 const tileMetres=Number(descriptor.match(/tileMetres:(\d+)/)?.[1]);
 if(radiusNative!==64||sampleSegments!==32||angularDivisor!==64||tileMetres!==4)throw new Error('Source-derived fixture no longer describes the exact 8m/32-chord counterexample.');
 const radius=radiusNative/32*tileMetres;
 const buffer=assetBytes;
 if(buffer.readUInt32LE(0)!==0x46546c67||buffer.readUInt32LE(4)!==2||buffer.readUInt32LE(8)!==buffer.length)throw new Error('Invalid GLB header.');
 let gltf,binary;
 for(let cursor=12;cursor<buffer.length;){
  const length=buffer.readUInt32LE(cursor),type=buffer.readUInt32LE(cursor+4),chunk=buffer.subarray(cursor+8,cursor+8+length);
  if(type===0x4e4f534a)gltf=JSON.parse(chunk.toString('utf8'));
  if(type===0x004e4942)binary=chunk;
  cursor+=8+length;
 }
 if(!gltf||!binary||gltf.extensionsRequired?.length||gltf.skins?.length)throw new Error('GLB requires an unsupported bounded rigid-geometry input.');
 const worlds=new Map(),visited=new Set();
 function walk(index,parent){
  if(visited.has(index))throw new Error('Repeated or cyclic scene node.');
  visited.add(index);
  const node=gltf.nodes[index];
  const local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(new Vector3(...(node.translation??[0,0,0])),new Quaternion(...(node.rotation??[0,0,0,1])),new Vector3(...(node.scale??[1,1,1])));
  const world=parent.clone().multiply(local);worlds.set(index,world);
  for(const child of node.children??[])walk(child,world);
 }
 for(const index of gltf.scenes[gltf.scene??0].nodes)walk(index,new Matrix4());
 function nodeIndex(name){
  const matches=gltf.nodes.map((node,index)=>node.name===name?index:-1).filter(index=>index>=0);
  if(matches.length!==1||!worlds.has(matches[0]))throw new Error(`Anchor/component missing or ambiguous: ${name}`);
  return matches[0];
 }
 function anchor(name){return new Vector3().setFromMatrixPosition(worlds.get(nodeIndex(name)));}
 function accessor(index){
  const a=gltf.accessors[index],view=gltf.bufferViews[a.bufferView];
  const dimensions={SCALAR:1,VEC3:3}[a.type],size={5123:2,5125:4,5126:4}[a.componentType];
  if(!dimensions||!size||a.sparse||a.normalized||view.buffer!==0)throw new Error(`Unsupported accessor ${index}`);
  const offset=(view.byteOffset??0)+(a.byteOffset??0),stride=view.byteStride??dimensions*size;
  const read={5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[a.componentType];
  return Array.from({length:a.count},(_,i)=>Array.from({length:dimensions},(_,j)=>{
   const position=offset+i*stride+j*size;
   if(position+size>binary.length||position+size>(view.byteOffset??0)+view.byteLength)throw new Error('Accessor exceeds input buffer.');
   const value=binary[read](position);if(!Number.isFinite(value))throw new Error('Nonfinite accessor value.');return value;
  }));
 }
 function meshTriangles(name){
  const index=nodeIndex(name),node=gltf.nodes[index],triangles=[],accessorIndices=[];
  for(const primitive of gltf.meshes[node.mesh].primitives){
   if((primitive.mode??4)!==4||primitive.targets?.length)throw new Error('Expected unchanged triangle primitives without morph targets.');
   const positions=accessor(primitive.attributes.POSITION).map(v=>new Vector3(...v).applyMatrix4(worlds.get(index)));
   const indices=primitive.indices===undefined?positions.map((_,i)=>i):accessor(primitive.indices).flat();
   if(indices.length%3)throw new Error('Incomplete triangle primitive.');
   accessorIndices.push({position:primitive.attributes.POSITION,indices:primitive.indices??null});
   for(let i=0;i<indices.length;i+=3){
    const vertices=[positions[indices[i]],positions[indices[i+1]],positions[indices[i+2]]];
    if(vertices.some(v=>!v))throw new Error('Triangle index outside POSITION accessor.');
    triangles.push(vertices);
   }
  }
  return{triangles,nodeIndex:index,accessorIndices,worldMatrix:worlds.get(index).toArray()};
 }
 const component=meshTriangles('CarBody_Tub'),local=component.triangles;
 const segments=[];let length=0;
 for(let i=0;i<sampleSegments;i++){
  const point=new Vector3(radius*Math.sin(i*Math.PI/angularDivisor),0,radius*(1-Math.cos(i*Math.PI/angularDivisor)));
  const next=new Vector3(radius*Math.sin((i+1)*Math.PI/angularDivisor),0,radius*(1-Math.cos((i+1)*Math.PI/angularDivisor)));
  const delta=next.clone().sub(point),mm=Math.round(delta.length()*1000);
  segments.push({begin:length,length:mm,point,tangent:delta.normalize()});length+=mm;
 }
 function pose(mm){
  const segment=segments.findLast(s=>s.begin<=mm);
  if(!segment||mm>=length)throw new Error('Pose outside the finite quarter-curve fixture.');
  return{position:segment.point.clone().addScaledVector(segment.tangent,(mm-segment.begin)/1000),forward:segment.tangent.clone()};
 }
 function matrix(p){
  const up=new Vector3(0,1,0);
  return new Matrix4().makeBasis(up.clone().cross(p.forward),up,p.forward).setPosition(p.position);
 }
 function placed(m){return local.map(vertices=>{const v=vertices.map(p=>p.clone().applyMatrix4(m));return{vertices:v,bounds:new Box3().setFromPoints(v)};});}
 function intersects(a,b){
  if(!a.bounds.intersectsBox(b.bounds))return false;
  const av=a.vertices,bv=b.vertices;
  const ea=[av[1].clone().sub(av[0]),av[2].clone().sub(av[1]),av[0].clone().sub(av[2])];
  const eb=[bv[1].clone().sub(bv[0]),bv[2].clone().sub(bv[1]),bv[0].clone().sub(bv[2])];
  const na=ea[0].clone().cross(ea[1]),nb=eb[0].clone().cross(eb[1]),axes=[na,nb];
  for(const x of ea)for(const y of eb)axes.push(x.clone().cross(y));
  for(const x of ea)axes.push(na.clone().cross(x));
  for(const x of eb)axes.push(nb.clone().cross(x));
  for(const axis of axes){
   if(axis.lengthSq()<tolerances.ignoredAxisLengthSquared)continue;
   axis.normalize();
   const ap=av.map(v=>v.dot(axis)),bp=bv.map(v=>v.dot(axis));
   if(Math.max(...ap)<Math.min(...bp)-tolerances.separatingAxisProjectionMetres||Math.max(...bp)<Math.min(...ap)-tolerances.separatingAxisProjectionMetres)return false;
  }
  return true;
 }
 function collisions(a,b){
  let pairs=0,broadphase=0,first=null;
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
   if(!a[i].bounds.intersectsBox(b[j].bounds))continue;
   broadphase++;
   if(intersects(a[i],b[j])){
    pairs++;
    first??={leadTriangle:i,followingTriangle:j,leadVertices:a[i].vertices.map(v=>v.toArray()),followingVertices:b[j].vertices.map(v=>v.toArray())};
   }
  }
  return{triangleBroadphasePairs:broadphase,shellSurfaceIntersectionPairs:pairs,firstIntersectingPair:first};
 }
 const leadingPositionMm=6000,followingPositionMm=3320,straightPitchMm=2680;
 const lead=pose(leadingPositionMm),following=pose(followingPositionMm),leadMatrix=matrix(lead),followingMatrix=matrix(following);
 const curved=collisions(placed(leadMatrix),placed(followingMatrix));
 const straightLead=matrix({position:new Vector3(0,0,straightPitchMm/1000),forward:new Vector3(0,0,1)}),straightFollowing=new Matrix4();
 const straight=collisions(placed(straightLead),placed(straightFollowing));
 const rear=anchor('Coupler_Rear').applyMatrix4(leadMatrix),front=anchor('Coupler_Front').applyMatrix4(followingMatrix);
 const first=curved.firstIntersectingPair;
 let witness={strictInteriorCrossing:false,edgeIntersections:[]};
 if(first){
  const a=first.leadVertices.map(v=>new Vector3(...v)),b=first.followingVertices.map(v=>new Vector3(...v));
  const triangle=new Triangle(...b),normal=triangle.getNormal(new Vector3()),distances=a.map(v=>normal.dot(v.clone().sub(b[0]))),hits=[];
  for(let edge=0;edge<3;edge++){
   const start=a[edge],end=a[(edge+1)%3],delta=end.clone().sub(start),edgeLength=delta.length();
   if(!edgeLength)continue;
   const ray=new Ray(start,delta.clone().normalize()),hit=ray.intersectTriangle(...b,false,new Vector3());
   if(hit){
    const fraction=hit.distanceTo(start)/edgeLength,barycentric=triangle.getBarycoord(hit,new Vector3());
    if(fraction>0&&fraction<1)hits.push({edge,segmentFraction:fraction,otherTriangleBarycentrics:barycentric.toArray(),point:hit.toArray()});
   }
  }
  witness={leadTriangle:first.leadTriangle,followingTriangle:first.followingTriangle,signedDistancesToFollowingPlaneMetres:distances,edgeIntersections:hits,strictInteriorCrossing:hits.some(h=>h.segmentFraction>tolerances.strictInteriorFraction&&h.segmentFraction<1-tolerances.strictInteriorFraction&&h.otherTriangleBarycentrics.every(v=>v>tolerances.strictInteriorFraction))};
 }
 const expected={bodyTriangles:2132,roundedQuarterLengthMm:12576,straightShellSurfaceIntersectionPairs:0,curvedTriangleBroadphasePairs:1859,curvedShellSurfaceIntersectionPairs:30,curvedAngleDegrees:19.687500000000068,curvedCouplerResidualMetres:.030718982413461864,firstPair:{leadTriangle:87,followingTriangle:11},strictWitness:{edge:0,segmentFraction:.9455778566636841,otherTriangleBarycentrics:[.20729934465877922,.0045391413622160835,.7881615139790047]}};
 const actualAngle=Math.acos(lead.forward.dot(following.forward))*180/Math.PI,actualCouplerResidual=rear.distanceTo(front),actualHit=witness.edgeIntersections.find(h=>h.edge===expected.strictWitness.edge);
 const checks=[];
 function exact(name,actual,target){checks.push({name,actual,expected:target,tolerance:0,passed:actual===target});}
 function near(name,actual,target,tolerance){checks.push({name,actual:actual??null,expected:target,tolerance,passed:Number.isFinite(actual)&&Math.abs(actual-target)<=tolerance});}
 exact('Actual component triangle count',local.length,expected.bodyTriangles);
 exact('Rounded quarter-course length',length,expected.roundedQuarterLengthMm);
 exact('Straight shell control',straight.shellSurfaceIntersectionPairs,expected.straightShellSurfaceIntersectionPairs);
 exact('Curved triangle broadphase count',curved.triangleBroadphasePairs,expected.curvedTriangleBroadphasePairs);
 exact('Curved surface intersection count',curved.shellSurfaceIntersectionPairs,expected.curvedShellSurfaceIntersectionPairs);
 exact('First lead triangle',first?.leadTriangle??null,expected.firstPair.leadTriangle);
 exact('First following triangle',first?.followingTriangle??null,expected.firstPair.followingTriangle);
 exact('Strict edge-interior crossing',witness.strictInteriorCrossing,true);
 near('Curved orientation angle',actualAngle,expected.curvedAngleDegrees,1e-10);
 near('Curved coupler residual',actualCouplerResidual,expected.curvedCouplerResidualMetres,tolerances.reportedScalarReplayMetres);
 near('Witness edge fraction',actualHit?.segmentFraction,expected.strictWitness.segmentFraction,tolerances.reportedWitnessReplayFraction);
 for(let i=0;i<3;i++)near(`Witness barycentric ${i}`,actualHit?.otherTriangleBarycentrics[i],expected.strictWitness.otherTriangleBarycentrics[i],tolerances.reportedWitnessReplayFraction);
 const runtimeFiles={};
 for(const file of [runtimePath,path.join(path.dirname(runtimePath),'three.core.js'),path.join(path.dirname(runtimePath),'..','package.json')]){const bytes=await readFile(file);runtimeFiles[file]={sha256:hash(bytes),bytes:bytes.length};}
 const bodyBounds=new Box3().setFromPoints(local.flat());
 return{
  schemaVersion:1,reproducesReportedWitness:checks.every(c=>c.passed),
  scope:'Independently authored read-only CPU replay of the exact 8m curved shell counterexample and straight2680 control. No production simulation, asset modification, rendering, or broader-curve acceptance.',
  originalBehavior:originalUnknown,tolerances,expected,checks,
  execution:{host:os.hostname(),platform:process.platform,architecture:process.arch,node:process.version,threeRevision:REVISION,timeUtc:new Date().toISOString(),argv:process.argv,runnerPath:fileURLToPath(import.meta.url),runnerSha256:hash(runnerBytes),runtimeFiles},
  inputs:{asset:{path:assetPath,sha256:assetHash,bytes:assetBytes.length},curveDescriptor:{path:descriptorPath,sha256:descriptorHash,productionSourceCommit:'2c19a1b214e7c3a5b58ec6f9982cb94d485ab867',currentProductionCommit:'a8e5527fe443b69753b8263821f71e73e5f7cbf8',unchangedCurrentDescriptorHash:expectedDescriptorHash},motionMethod:{inspectedFile:'/Volumes/WD/code/workspaces/coaster-content-library/coaster-tycoon-3d/src/simulation/motion.ts',inspectedSha256:'d04c3e11d06d57353ee8abfe0a1d761f65fc5cc07a2a27be31174af90b68ff58',lines:'31-36,66-68',method:'Manually reproduced project-authored rounded-chord/tangent fixture, not an import or execution of production simulation.'},fixture:{radiusNative,tileMetres,nativeUnitsPerTile:32,radiusMetres:radius,sampleSegments,angularDivisor,roundedQuarterLengthMm:length,chords:segments.map(s=>({beginMm:s.begin,lengthMm:s.length,pointMetres:s.point.toArray(),tangent:s.tangent.toArray()})),leadingPositionMm,followingPositionMm,nominalStraightPitchMm:straightPitchMm,posePolicy:'Current centre-point tangent with unit-scale +Z-forward/+Y-up rigid root. Common vertical translation is zero and cancels in both intersection and coupling residuals.'},component:{name:'CarBody_Tub',nodeIndex:component.nodeIndex,accessorIndices:component.accessorIndices,sceneParentWorldMatrix:component.worldMatrix,triangles:local.length,boundsMetres:{min:bodyBounds.min.toArray(),max:bodyBounds.max.toArray()}},couplers:{front:anchor('Coupler_Front').toArray(),rear:anchor('Coupler_Rear').toArray()}},
  straight:{pitchMm:straightPitchMm,leadMatrix:straightLead.toArray(),followingMatrix:straightFollowing.toArray(),...straight},
  curve:{leadPositionMetres:lead.position.toArray(),followingPositionMetres:following.position.toArray(),leadForward:lead.forward.toArray(),followingForward:following.forward.toArray(),leadMatrix:leadMatrix.toArray(),followingMatrix:followingMatrix.toArray(),angleDegrees:actualAngle,couplerRearLeadMetres:rear.toArray(),couplerFrontFollowingMetres:front.toArray(),couplerResidualMetres:actualCouplerResidual,...curved,witness},
  limits:['Default rigid CarBody_Tub only; not full chassis, couplers, passengers, bogies or swept contact qualification.','Triangle SAT may include coplanar/touching pairs; the retained witness separately proves a strict finite edge-through-triangle-interior crossing.','One selected 8m quarter-curve pose and one straight control; no safe minimum radius or 16m acceptance claim.','No production adapter, train physics or save schema was changed or executed.']
 };
}

try{
 const result=await replay();
 await writeFile(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({reproducesReportedWitness:result.reproducesReportedWitness,result:output,runnerSha256:result.execution.runnerSha256,assetSha256:result.inputs.asset.sha256,straightShellIntersectionPairs:result.straight.shellSurfaceIntersectionPairs,curvedShellIntersectionPairs:result.curve.shellSurfaceIntersectionPairs,curvedCouplerResidualMetres:result.curve.couplerResidualMetres,witness:result.curve.witness,failedChecks:result.checks.filter(c=>!c.passed)}));
 process.exitCode=result.reproducesReportedWitness?0:1;
}catch(error){
 const result={schemaVersion:1,reproducesReportedWitness:false,scope:'Counterexample replay failed before complete measurement.',error:{name:error.name,message:error.message,stack:error.stack},originalBehavior:originalUnknown};
 await writeFile(output,JSON.stringify(result,null,2)+'\n');
 console.error(error.stack);
 process.exitCode=2;
}
