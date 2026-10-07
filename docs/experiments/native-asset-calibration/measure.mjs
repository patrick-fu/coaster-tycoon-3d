import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const args=new Map();
for(let i=2;i<process.argv.length;i+=2)args.set(process.argv[i],process.argv[i+1]);
const assetDir=args.get('--assets');
const runtime=args.get('--runtime');
const output=args.get('--output');
if(!assetDir||!runtime||!output)throw new Error('Required: --assets DIR --runtime THREE_MODULE --output JSON');
if(!path.resolve(output).startsWith(path.resolve(root)+path.sep))throw new Error('Outputs must stay inside the owned experiment workspace.');
const {Matrix4,Vector3,Quaternion,Box3,REVISION}=await import(pathToFileURL(runtime).href);
const epsilon=1e-4;
const originalUnknown='Unknown: no original executable/DAT/scenario observation; no original metric, collision, spacing, dispatch or seat-pose equality is asserted.';
const sha=b=>createHash('sha256').update(b).digest('hex');
const array=v=>v.toArray();
const bounds=b=>({min:array(b.min),max:array(b.max),size:array(b.getSize(new Vector3()))});
const facts={};
const sourceFiles={};
for(const name of ['steel-coaster.ts','view.ts','geometry.ts','engine.ts','coaster.js','runtime.js','park-scene.js','content-identities.md','authoring-contract.md','wooden-car.py','timber-station.py','information-kiosk.py','export.py']){
 const file=path.join(root,'pinned-source',name),bytes=await readFile(file);
 sourceFiles[name]={path:file,sha256:sha(bytes),bytes:bytes.length,text:bytes.toString('utf8')};
}
function fact(name,file,pattern){
 const source=sourceFiles[file],match=source.text.match(pattern);
 if(!match)throw new Error(`Source expression unavailable: ${name} in ${file}`);
 const record={value:Number(match[1]),source:file,line:source.text.slice(0,match.index).split('\n').length,expression:match[0],sourceSha256:source.sha256};
 facts[name]=record;
 return record.value;
}
const metres=fact('metresPerTile','steel-coaster.ts',/tileMetres:(\d+)/);
const native=fact('nativeUnitsPerTile','view.ts',/nativeUnitsPerTile:(\d+)/);
const heightStep=fact('nativeHeightStep','view.ts',/nativeHeightStep:(\d+)/);
const landStep=fact('nativeLandStep','view.ts',/nativeLandStep:(\d+)/);
const carPitchMm=fact('legacyCarPitchMm','steel-coaster.ts',/carLength:(\d+)/);
const legacySeatCount=fact('legacySeatsPerCar','steel-coaster.ts',/seatsPerCar:(\d+)/);
const half=fact('legacyHalfTileOffsetMetres','runtime.js',/tile:\d+,half:(\d+)/);
const railCenter=fact('legacyRailCenterOffsetMetres','coaster.js',/\(e\.origin\.z \+ v\.z\) \/ 32 \* tile \+ ([\d.]+)/);
const railRadius=fact('legacyRailRadiusMetres','coaster.js',/TubeGeometry\(leftCurve,\s*tubularSegments,\s*([\d.]+)/);
const carShellOffset=fact('legacyCarShellOffsetMetres','coaster.js',/posVec\.set\(c\.position\.x \+ half, c\.position\.z \+ ([\d.]+)/);
const reservationZ=fact('legacyFacilityReservationNativeZ','engine.ts',/high:e\.height\+\(e\.kind==='scenery'\?this\.rules\.scenery\[e\.sceneryType\]\.height:(\d+)\)/);

function check(name,actual,expected,tolerance=epsilon){
 const passed=typeof expected==='boolean'?actual===expected:Math.abs(actual-expected)<=tolerance;
 return{name,actual,expected,tolerance:typeof expected==='boolean'?null:tolerance,passed};
}
function finish(id,expectedRelationship,inputs,measurements,checks,decision,evidence){
 return{id,expectedRelationship,inputs,measurements,checks,passed:checks.every(c=>c.passed),decision,evidence:{...evidence,originalBehavior:originalUnknown}};
}

async function loadAsset(id){
 const file=path.join(assetDir,id+'.glb'),bytes=await readFile(file);
 if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw new Error(`Invalid GLB header: ${id}`);
 let gltf,bin;
 for(let cursor=12;cursor<bytes.length;){
  const length=bytes.readUInt32LE(cursor),type=bytes.readUInt32LE(cursor+4),chunk=bytes.subarray(cursor+8,cursor+8+length);
  if(type===0x4e4f534a)gltf=JSON.parse(chunk.toString('utf8'));
  else if(type===0x004e4942)bin=chunk;
  cursor+=8+length;
 }
 if(!gltf||!bin)throw new Error(`Missing JSON or BIN chunk: ${id}`);
 if(gltf.extensionsRequired?.length||gltf.skins?.length)throw new Error(`Unsupported compressed/skinned GLB for bounded rigid measurement: ${id}`);
 const reportFile=path.join(assetDir,id+'.json'),reportBytes=await readFile(reportFile),exportReport=JSON.parse(reportBytes.toString('utf8'));
 const actualHash=sha(bytes);
 if(actualHash!==exportReport.glb.sha256)throw new Error(`GLB does not match delivered export report: ${id}`);
 if(sha(Buffer.from(sourceFiles[id+'.py'].text))!==exportReport.sourceSha256)throw new Error(`Authoring source hash mismatch: ${id}`);
 if(sourceFiles['export.py'].sha256!==exportReport.driverSha256)throw new Error(`Export driver hash mismatch: ${id}`);
 const world=new Map(),parents=new Map(),names=new Map(),visited=new Set();
 for(let i=0;i<gltf.nodes.length;i++){
  const node=gltf.nodes[i];
  if(node.name){if(names.has(node.name))throw new Error(`Duplicate node name: ${id}/${node.name}`);names.set(node.name,i);}
  for(const child of node.children??[]){if(parents.has(child))throw new Error(`Multiple node parents: ${id}/${child}`);parents.set(child,i);}
 }
 const scene=gltf.scenes[gltf.scene??0];
 if(!scene)throw new Error(`No active GLB scene: ${id}`);
 function visit(index,parentMatrix){
  if(visited.has(index))throw new Error(`Repeated/cyclic active scene node: ${id}/${index}`);
  visited.add(index);
  const n=gltf.nodes[index];
  const local=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3(...(n.translation??[0,0,0])),new Quaternion(...(n.rotation??[0,0,0,1])),new Vector3(...(n.scale??[1,1,1])));
  const matrix=parentMatrix.clone().multiply(local);
  if(!matrix.elements.every(Number.isFinite))throw new Error(`Nonfinite node transform: ${id}/${index}`);
  world.set(index,matrix);
  for(const child of n.children??[])visit(child,matrix);
 }
 for(const index of scene.nodes??[])visit(index,new Matrix4());
 function anchor(name){
  const index=names.get(name);
  if(index===undefined||!world.has(index))throw new Error(`Missing active-scene anchor: ${id}/${name}`);
  return new Vector3().setFromMatrixPosition(world.get(index));
 }
 const anchors=Object.fromEntries(exportReport.authoring.anchors.map(name=>[name,array(anchor(name))]));
 const positions=new Map();
 function readPosition(index){
  if(positions.has(index))return positions.get(index);
  const a=gltf.accessors[index],view=gltf.bufferViews[a?.bufferView];
  if(!a||a.componentType!==5126||a.type!=='VEC3'||a.sparse||a.normalized||!view||view.buffer!==0)throw new Error(`Unsupported POSITION accessor: ${id}/${index}`);
  if(!a.min||!a.max)throw new Error(`POSITION bounds absent: ${id}/${index}`);
  const stride=view.byteStride??12,offset=(view.byteOffset??0)+(a.byteOffset??0),points=[],actual=new Box3();
  for(let i=0;i<a.count;i++){
   const start=offset+i*stride;
   if(start+12>bin.length||start+12>(view.byteOffset??0)+view.byteLength)throw new Error(`POSITION out of bounds: ${id}/${index}`);
   const p=new Vector3(bin.readFloatLE(start),bin.readFloatLE(start+4),bin.readFloatLE(start+8));
   if(!p.toArray().every(Number.isFinite))throw new Error(`Nonfinite POSITION: ${id}/${index}`);
   points.push(p);actual.expandByPoint(p);
  }
  const declared=new Box3(new Vector3(...a.min),new Vector3(...a.max));
  const residual=Math.max(...actual.min.toArray().map((v,i)=>Math.abs(v-a.min[i])),...actual.max.toArray().map((v,i)=>Math.abs(v-a.max[i])));
  if(residual>1e-5)throw new Error(`Accessor min/max disagree with binary vertices: ${id}/${index}: ${residual}`);
  const record={points,actual,declared,residual,index,count:a.count};positions.set(index,record);return record;
 }
 const vertexBounds=new Box3(),accessorBounds=new Box3(),meshes=[];
 for(const [index,matrix]of world){
  const node=gltf.nodes[index];if(node.mesh===undefined)continue;
  const mesh=gltf.meshes[node.mesh];
  if(mesh.weights?.length||mesh.primitives.some(p=>p.targets?.length))throw new Error(`Morphing mesh unsupported: ${id}/${node.name}`);
  const nodeVertices=new Box3(),nodeAccessors=new Box3(),accessors=[];
  for(const primitive of mesh.primitives){
   const position=readPosition(primitive.attributes.POSITION);accessors.push(position.index);
   for(const local of position.points)nodeVertices.expandByPoint(local.clone().applyMatrix4(matrix));
   nodeAccessors.union(position.declared.clone().applyMatrix4(matrix));
  }
  vertexBounds.union(nodeVertices);accessorBounds.union(nodeAccessors);
  meshes.push({node:node.name,nodeIndex:index,worldMatrix:matrix.toArray(),accessorIndices:accessors,vertexWorldBounds:bounds(nodeVertices),transformedAccessorBounds:bounds(nodeAccessors)});
 }
 if(vertexBounds.isEmpty())throw new Error(`No measured mesh positions: ${id}`);
 return{id,anchor,vertexBounds,record:{id,path:file,sha256:actualHash,bytes:bytes.length,exportReport:{path:reportFile,sha256:sha(reportBytes),sourceSha256:exportReport.sourceSha256,driverSha256:exportReport.driverSha256,scope:exportReport.scope,blender:exportReport.blender},activeScene:gltf.scene??0,activeNodes:world.size,meshNodes:meshes.length,positionAccessors:positions.size,positionVertices:[...positions.values()].reduce((n,p)=>n+p.count,0),maximumAccessorBoundResidual:Math.max(...[...positions.values()].map(p=>p.residual)),anchors,vertexWorldBounds:bounds(vertexBounds),transformedAccessorBounds:bounds(accessorBounds),meshes}};
}

const car=await loadAsset('wooden-car'),station=await loadAsset('timber-station'),kiosk=await loadAsset('information-kiosk');
const up=new Vector3(0,1,0);
const directions=[new Vector3(1,0,0),new Vector3(0,0,1),new Vector3(-1,0,0),new Vector3(0,0,-1)];
function placement(forward,origin,legacy=false){
 const right=up.clone().cross(forward);
 const matrix=legacy?new Matrix4().makeBasis(forward,up,forward.clone().cross(up)):new Matrix4().makeBasis(right,up,forward);
 matrix.setPosition(origin);
 return matrix;
}
function scaleOf(matrix){const p=new Vector3(),q=new Quaternion(),s=new Vector3();matrix.decompose(p,q,s);return array(s);}
const unitScaleResidual=matrix=>Math.max(...scaleOf(matrix).map(v=>Math.abs(v-1)));
const worldAnchor=(asset,name,matrix)=>asset.anchor(name).applyMatrix4(matrix);
const sourceEvidence=['steel-coaster.ts','view.ts','engine.ts','coaster.js','runtime.js','park-scene.js'].map(name=>({file:name,sha256:sourceFiles[name].sha256}));
const sampleEvidence=asset=>({asset:asset.id,sha256:asset.record.sha256,measurement:'Active-scene full parent transforms; float32 POSITION values and accessor bounds.'});
const cases=[];

const originNative={x:640,y:960,z:32};
const canonical=new Vector3(originNative.x/native*metres,originNative.z/native*metres,originNative.y/native*metres);
const legacyOrigin=canonical.clone().add(new Vector3(half,0,half));
const stationSeams=directions.map((forward,direction)=>{
 const firstCentre=legacyOrigin.clone().addScaledVector(forward,metres/2),nextCentre=firstCentre.clone().addScaledVector(forward,metres);
 const firstMatrix=placement(forward,firstCentre),nextMatrix=placement(forward,nextCentre);
 const aIn=worldAnchor(station,'RailIn',firstMatrix),aOut=worldAnchor(station,'RailOut',firstMatrix),bIn=worldAnchor(station,'RailIn',nextMatrix);
 const actualForward=aOut.clone().sub(aIn).normalize();
 const legacyMatrix=placement(forward,firstCentre,true),legacyForward=worldAnchor(station,'RailOut',legacyMatrix).sub(worldAnchor(station,'RailIn',legacyMatrix)).normalize();
 return{direction,forward:array(forward),firstMatrix:firstMatrix.toArray(),nextMatrix:nextMatrix.toArray(),scale:scaleOf(firstMatrix),railIn:array(aIn),railOut:array(aOut),nextRailIn:array(bIn),seamResidualMetres:aOut.distanceTo(bIn),pitchMetres:aIn.distanceTo(aOut),forwardDot:actualForward.dot(forward),legacyBasisForwardDot:legacyForward.dot(forward),unitScaleResidual:unitScaleResidual(firstMatrix),checks:[check('Station seam closes at candidate tile pitch',aOut.distanceTo(bIn),0),check('Authored socket pitch equals candidate tile pitch',aIn.distanceTo(aOut),metres),check('GLB +Z forward follows fixture direction',actualForward.dot(forward),1),check('Unit scale retained',unitScaleResidual(firstMatrix),0),check('Legacy local +X basis fails GLB forward alignment',Math.abs(legacyForward.dot(forward))<epsilon,true)]};
});
cases.push(finish('station-seams-four-directions','Unchanged GLB RailOut(A) and RailIn(B) coincide when unit-scale bay centres are separated by the candidate 4m tile; +Z forward follows all four directions. The legacy +X basis is a negative control.',{nativeOrigin:originNative,metresPerTile:metres,legacyOriginPolicy:'native metres plus half a tile in each horizontal axis',candidateBayPitchMetres:metres,scale:[1,1,1]},stationSeams,stationSeams.flatMap(v=>v.checks),{candidateFixture:'preserve unit geometry',legacyProceduralBasisForGLB:'reject: forward axis is orthogonal'}, {sourceFacts:sourceEvidence,measuredSamples:[sampleEvidence(station)],candidateFixture:'Right-handed +Y-up basis columns (up×forward,up,forward); ground-root bay centres are horizontal.'}));

const stationRoot=station.anchor('StationRoot'),railIn=station.anchor('RailIn'),railOut=station.anchor('RailOut');
const railDatum=railIn.y-stationRoot.y,legacyRailTop=railCenter+railRadius,datumResidual=railDatum-legacyRailTop;
const carRailRoot=car.anchor('RailRoot');
const railFixtureRoot=new Vector3(0,canonical.y,0);
const carRailPlacement=placement(directions[0],railFixtureRoot.clone().addScaledVector(up,railDatum-carRailRoot.y));
const contactResidual=worldAnchor(car,'RailRoot',carRailPlacement).y-(railFixtureRoot.y+railDatum);
cases.push(finish('rail-datum-residual','Measured station RailIn/Out are .5m above StationRoot; existing procedural rail centre+.058m radius is .358m above the native reference. Preserve both facts and report the .142m incompatibility. A candidate placement can align car RailRoot to the station datum without scaling.',{legacyRailCenterMetres:railCenter,legacyRailRadiusMetres:railRadius,legacyCarShellOffsetMetres:carShellOffset,groundReferenceMetres:canonical.y}, {stationRailInAboveRootMetres:railDatum,stationRailOutAboveRootMetres:railOut.y-stationRoot.y,legacyNominalRailTopMetres:legacyRailTop,datumResidualMetres:datumResidual,legacyShellOffsetMinusRailTopMetres:carShellOffset-legacyRailTop,candidateCarRailRootWorld:array(worldAnchor(car,'RailRoot',carRailPlacement)),candidateCarMatrix:carRailPlacement.toArray(),candidateCarRailContactResidualMetres:contactResidual},[check('Measured station datum matches .5m authored fixture',railDatum,.5),check('Both rail sockets share datum',railOut.y-stationRoot.y,railDatum),check('Legacy source-derived rail top matches .358m',legacyRailTop,.358),check('Datum mismatch detected',datumResidual,.142),check('Candidate car rail root contacts datum',contactResidual,0),check('Candidate placement retains unit scale',unitScaleResidual(carRailPlacement),0)],{samples:'preserve unit geometry and individual rail datums',legacyRailAttachment:'reject: explicit datum conversion or separately calibrated track profile required'}, {sourceFacts:sourceEvidence,measuredSamples:[sampleEvidence(station),sampleEvidence(car)],candidateFixture:'Measured station rail-top datum selected for this laboratory attachment only; no production track or collision changes.'}));

const carFront=car.anchor('Coupler_Front'),carRear=car.anchor('Coupler_Rear');
const measuredCouplerPitch=carFront.distanceTo(carRear),candidatePitchMm=Math.round(measuredCouplerPitch*1000);
const couplers=[carPitchMm,candidatePitchMm].map(pitchMm=>{
 const firstMatrix=placement(new Vector3(0,0,1),new Vector3()),secondMatrix=placement(new Vector3(0,0,1),new Vector3(0,0,-pitchMm/1000));
 const rearFirst=worldAnchor(car,'Coupler_Rear',firstMatrix),frontSecond=worldAnchor(car,'Coupler_Front',secondMatrix);
 return{pitchMm,firstRear:array(rearFirst),secondFront:array(frontSecond),residualVectorMetres:array(frontSecond.clone().sub(rearFirst)),residualMetres:rearFirst.distanceTo(frontSecond),decision:rearFirst.distanceTo(frontSecond)<=epsilon?'preserve candidate straight-fixture attachment':'reject legacy spacing for this mesh'};
});
cases.push(finish('car-couplers','An unchanged mesh at legacy 2000mm pitch has a .68m coupler residual; a candidate pitch rounded from the actual GLB coupler separation (2680mm) closes the straight-fixture anchors to export tolerance.',{legacyCarPitchMm:carPitchMm,candidatePitchMm,candidatePitchDerivation:'round(distance of actual full-world GLB coupler nodes × 1000)',scale:[1,1,1]}, {measuredCouplerPitchMetres:measuredCouplerPitch,placements:couplers,fullVisualLengthMetres:car.vertexBounds.getSize(new Vector3()).z},[check('Source legacy pitch is 2000mm',carPitchMm,2000,0),check('Measured candidate rounding gives 2680mm',candidatePitchMm,2680,0),check('Legacy residual is .68m',couplers[0].residualMetres,.68),check('Candidate coupler anchors close',couplers[1].residualMetres,0)],{legacyUniformTrainAttachment:'reject',candidateStraightFixture:'preserve',nativeReferenceSpacing:'unqualified: candidate 2680mm must not replace reconstructed native spacing'}, {sourceFacts:sourceEvidence,measuredSamples:[sampleEvidence(car)],candidateFixture:'Two rigid parallel cars on a straight track; does not certify curve articulation, visual-body nonintersection, swept bounds or train dispatch.'}));

const seatOrder=['Seat_FrontLeft','Seat_FrontRight','Seat_RearLeft','Seat_RearRight'];
const seatMatrix=placement(directions[0],new Vector3(82,4+railDatum,122));
const orderedStates=[[101,null,103,104],[101,102,103,null]].map(slots=>({slots,occupants:slots.filter(v=>v!==null).length,placements:slots.map((guestId,slot)=>({slot,anchor:seatOrder[slot],guestId,worldPosition:array(worldAnchor(car,seatOrder[slot],seatMatrix))})).filter(v=>v.guestId!==null),emptyAnchors:slots.map((guestId,slot)=>guestId===null?seatOrder[slot]:null).filter(Boolean)}));
const occupantSignature=state=>JSON.stringify(state.placements.map(p=>[p.guestId,p.anchor]));
cases.push(finish('ordered-four-seat-placement','Two four-slot states with equal count=3 must retain different empty anchors and guest-to-slot identity. Occupant count alone cannot distinguish them; the legacy 2-seat candidate must reject this 4-seat mesh contract.',{explicitCandidateSeatOrder:seatOrder,states:orderedStates.map(v=>v.slots),legacySeatsPerCar:legacySeatCount,scale:[1,1,1]}, {candidateMatrix:seatMatrix.toArray(),states:orderedStates,countOnlyPackets:orderedStates.map(v=>({occupants:v.occupants})),measuredSeats:Object.fromEntries(seatOrder.map(name=>[name,array(car.anchor(name))]))},[check('Four named active-scene seats measured',seatOrder.length,4,0),check('State A has three occupants',orderedStates[0].occupants,3,0),check('State B has three occupants',orderedStates[1].occupants,3,0),check('State A leaves FrontRight empty',orderedStates[0].emptyAnchors[0]==='Seat_FrontRight',true),check('State B leaves RearRight empty',orderedStates[1].emptyAnchors[0]==='Seat_RearRight',true),check('Guest-anchor placements distinguish equal counts',occupantSignature(orderedStates[0])!==occupantSignature(orderedStates[1]),true),check('Legacy seat-capacity mismatch is detected',legacySeatCount!==seatOrder.length,true),check('Seat placement matrix remains unit scale',unitScaleResidual(seatMatrix),0)],{orderedLabPlacements:'preserve',countOnlyProjection:'reject as insufficient for ordered seats',legacyTwoSeatCapability:'reject for this four-seat mesh'}, {sourceFacts:sourceEvidence,measuredSamples:[sampleEvidence(car)],candidateFixture:'Explicit front-left/front-right/rear-left/rear-right ordering chosen for this laboratory; not an original boarding-order claim or an implemented worker view.'}));

const kioskRoot=kiosk.anchor('GroundRoot'),kioskMatrix=new Matrix4().makeTranslation(legacyOrigin.x-kioskRoot.x,canonical.y-kioskRoot.y,legacyOrigin.z-kioskRoot.z);
const kioskWorld=kiosk.vertexBounds.clone().applyMatrix4(kioskMatrix),tileX=originNative.x/native,tileY=originNative.y/native;
const reservation=new Box3(new Vector3(tileX*metres,canonical.y,tileY*metres),new Vector3((tileX+1)*metres,canonical.y+reservationZ/native*metres,(tileY+1)*metres));
const overflow={min:kioskWorld.min.toArray().map((v,i)=>Math.max(0,reservation.min.getComponent(i)-v)),max:kioskWorld.max.toArray().map((v,i)=>Math.max(0,v-reservation.max.getComponent(i)))};
const kioskHeight=kioskWorld.max.y-kioskWorld.min.y;
const legacySquashScaleY=(reservation.max.y-reservation.min.y)/kioskHeight;
cases.push(finish('kiosk-visual-versus-native-reservation','Actual full POSITION bounds of the unchanged kiosk, rooted on native height32, exceed the legacy 4m tile and 16-native-Z (=2m candidate) vertical reservation. Detect the mismatch and reject compatibility without squashing or enlarging authoritative clearance.',{nativeOrigin:originNative,tile:{x:tileX,y:tileY},legacyReservationNativeZ:reservationZ,metresPerTile:metres,scale:[1,1,1]}, {kioskPlacementMatrix:kioskMatrix.toArray(),actualVisualWorldBounds:bounds(kioskWorld),legacyReservationWorldBounds:bounds(reservation),overflowMetres:overflow,containsVisualBounds:reservation.containsBox(kioskWorld),kioskHeightMetres:kioskHeight,legacyFitWouldScaleY:legacySquashScaleY,legacyFitScaleApplied:false},[check('Measured kiosk roof is 4.7m above ground root',kioskHeight,4.7),check('Legacy reservation is 2m candidate height',reservation.max.y-reservation.min.y,2),check('Vertical overflow is 2.7m',overflow.max[1],2.7),check('Visual bound is outside reservation',reservation.containsBox(kioskWorld),false),check('No nonuniform scale applied',unitScaleResidual(kioskMatrix),0),check('Horizontal overflow detected',overflow.min[0]>0&&overflow.max[0]>0&&overflow.min[2]>0&&overflow.max[2]>0,true)], {visualSample:'preserve measured unit bounds',legacyFacilityEnvelopeCompatibility:'reject',authority:'Do not alter worker reservations or invoke fitModel; separate qualified footprint/overhang/envelope contract is required.'}, {sourceFacts:sourceEvidence,measuredSamples:[sampleEvidence(kiosk)],candidateFixture:'Closed/default rigid GLB pose; POSITION bounds include detached inspection props. These are visual bounds, not native collision or swept passenger bounds.'}));

function isolatedProfileDecision({profileId,asset,metresPerTile,purpose,seatsPerCar,pitchMm}){
 const bindings={'lab.wooden-car-unit-v1':'wooden-car','lab.timber-station-unit-v1':'timber-station','lab.information-kiosk-unit-v1':'information-kiosk'};
 if(!Object.hasOwn(bindings,profileId)&&profileId!=='classic-candidate-v1')return{decision:'reject',reason:'Unknown or uncalibrated profile ID; no fallback to generic steel or geometry fitting.'};
 if(Object.hasOwn(bindings,profileId)&&bindings[profileId]!==asset)return{decision:'reject',reason:'Profile identity does not bind this measured sample.'};
 if(metresPerTile!==metres)return{decision:'reject',reason:'Unsupported coordinate contract for the unchanged 4m station sample.'};
 if(asset==='wooden-car'&&(seatsPerCar!==seatOrder.length||!Number.isFinite(pitchMm)||Math.abs(pitchMm/1000-measuredCouplerPitch)>epsilon))return{decision:'reject',reason:'Measured car seats/couplers do not match requested train capability.'};
 if(profileId==='classic-candidate-v1'&&asset==='information-kiosk'&&!reservation.containsBox(kioskWorld))return{decision:'reject',reason:'Measured visual bounds do not fit legacy reservation; fitting is forbidden.'};
 if(profileId==='classic-candidate-v1')return{decision:'reject',reason:'The existing procedural profile has no qualified binding to these GLB samples, including in a laboratory request.'};
 if(purpose!=='laboratory')return{decision:'reject',reason:'Laboratory calibration records are not executable production adapters.'};
 return{decision:'preserve',reason:'Unit-scale laboratory geometry and explicit candidate fixtures only; production implementation and original behavior remain unqualified.'};
}
const profileInputs=[
 {profileId:'lab.wooden-car-unit-v1',asset:'wooden-car',metresPerTile:metres,purpose:'laboratory',seatsPerCar:4,pitchMm:candidatePitchMm},
 {profileId:'lab.timber-station-unit-v1',asset:'timber-station',metresPerTile:metres,purpose:'laboratory'},
 {profileId:'lab.information-kiosk-unit-v1',asset:'information-kiosk',metresPerTile:metres,purpose:'laboratory'},
 {profileId:'classic-candidate-v1',asset:'wooden-car',metresPerTile:metres,purpose:'production',seatsPerCar:legacySeatCount,pitchMm:carPitchMm},
 {profileId:'classic-candidate-v1',asset:'information-kiosk',metresPerTile:metres,purpose:'production'},
 {profileId:'lab.wooden-car-unit-v999',asset:'wooden-car',metresPerTile:metres,purpose:'laboratory',seatsPerCar:4,pitchMm:candidatePitchMm},
 {profileId:'reference.rct2.variant.ptct1',asset:'wooden-car',metresPerTile:metres,purpose:'production',seatsPerCar:4,pitchMm:candidatePitchMm},
 {profileId:'lab.timber-station-unit-v1',asset:'timber-station',metresPerTile:6,purpose:'laboratory'},
 {profileId:'lab.wooden-car-unit-v1',asset:'wooden-car',metresPerTile:metres,purpose:'production',seatsPerCar:4,pitchMm:candidatePitchMm},
 {profileId:'classic-candidate-v1',asset:'timber-station',metresPerTile:metres,purpose:'laboratory'},
 {profileId:'lab.wooden-car-unit-v1',asset:'timber-station',metresPerTile:metres,purpose:'laboratory'},
 {profileId:'lab.wooden-car-unit-v1',asset:'wooden-car',metresPerTile:metres,purpose:'laboratory',seatsPerCar:4,pitchMm:carPitchMm},
 {profileId:'lab.wooden-car-unit-v1',asset:'wooden-car',metresPerTile:metres,purpose:'laboratory',seatsPerCar:legacySeatCount,pitchMm:candidatePitchMm}
];
const profileDecisions=profileInputs.map((input,index)=>({input,...isolatedProfileDecision(input),expected:index<3?'preserve':'reject'}));
const allPassed=cases.every(c=>c.passed)&&profileDecisions.every(d=>d.decision===d.expected);
const runtimeFiles={};
for(const file of [runtime,path.join(path.dirname(runtime),'three.core.js'),path.join(path.dirname(runtime),'..','package.json')]){const bytes=await readFile(file);runtimeFiles[file]={sha256:sha(bytes),bytes:bytes.length};}
const runnerBytes=await readFile(fileURLToPath(import.meta.url));
const result={schemaVersion:1,passed:allPassed,scope:'Isolated CPU-only GLB/matrix calibration experiment. Production source and delivered samples are unchanged. Preserve/reject decisions are this experiment\'s checks, not a new implemented production adapter.',originalBehavior:originalUnknown,execution:{host:os.hostname(),node:process.version,platform:process.platform,architecture:process.arch,threeRevision:REVISION,timeUtc:new Date().toISOString(),argv:process.argv,runnerSha256:sha(runnerBytes),runtimeFiles},sourcePins:{productionCommit:'2c19a1b214e7c3a5b58ec6f9982cb94d485ab867',sampleSourceCommit:'e17c646bc2d49781bd567054309d6c2096bd847c',method:'Pinned git-show source snapshots; actual GLB hash equals export report; authoring and driver hashes equal source snapshot bytes.',files:Object.fromEntries(Object.entries(sourceFiles).map(([name,{text,...record}])=>[name,record]))},sourceFacts:facts,assets:[car.record,station.record,kiosk.record],cases,profileDecisions,remaining:['Connector origin versus occupied quarter-cell geometry is not qualified by station seam checks.','Only default rigid sample poses and straight car coupling are measured; no swept passenger or curved bogie/coupler envelope.','The four-seat mapping is a fixture, not production per-seat worker integration or original boarding order.','No original runtime/metric equality, R01 family geometry, R02 suspended/inverted clearance, R03 nonuniform train/dispatch, S05 recipe/research/weather/objective, GPU or human visual acceptance.']};
await writeFile(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:result.passed,report:output,runnerSha256:result.execution.runnerSha256,assets:result.assets.map(a=>({id:a.id,sha256:a.sha256,positionVertices:a.positionVertices,accessorResidual:a.maximumAccessorBoundResidual})),cases:cases.map(c=>({id:c.id,passed:c.passed,decision:c.decision})),profileDecisions:profileDecisions.map(d=>({profileId:d.input.profileId,purpose:d.input.purpose,decision:d.decision,expected:d.expected}))}));
process.exitCode=allPassed?0:1;
