(async()=>{
 const game=await import('./game.js'),THREE=await import('three'),checks=[],bounds=[];
 window.oakProgress={checks,zoomSteps:[]};
 const assert=(value,message)=>{if(!value)throw new Error(message);};
 const wait=async test=>{for(let i=0;i<160;i++){if(await test())return;await new Promise(resolve=>setTimeout(resolve,75));}throw new Error('Tree scene did not settle.');};
 const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 await game.scene.treeAssets.readyPromise;
 assert(game.scene.treeAssets.ready&&!game.scene.treeAssets.error,'Detailed trees did not load.');
 checks.push('Actual separate glTF and shared atlas resources load successfully');
 await game.request('new-park',null);await game.execute({type:'set-paused',paused:true});await game.refresh(true);
 const saved=JSON.parse(await game.request('save',null)),tiles=[];
 for(let i=game.scene.scenery.surfaces.length-5;i>=0&&tiles.length<4;i-=5){
  const [x,y,height,water,owned]=game.scene.scenery.surfaces.slice(i,i+5);
  if(!owned||water||x<10||y<10||x>38||y>38||tiles.some(t=>t.x===x&&t.y===y))continue;
  try{await game.request('quote',{type:'place-scenery',sceneryType:'tree',tile:{x,y},height});tiles.push({x,y,height});}catch{}
 }
 assert(tiles.length===4,'Four legal tree placements were not found.');
 const ids=[];
 for(const {x,y,height} of tiles){const receipt=await game.execute({type:'place-scenery',sceneryType:'tree',tile:{x,y},height});assert(receipt&&receipt.cost===60,'Tree placement changed the authoritative price.');ids.push(receipt.id);}
 await wait(()=>ids.every(id=>game.scene.elements.some(element=>element.id===id)));await frames();
 const worldBounds=id=>{
  const box=new THREE.Box3();game.scene.staticGroup.updateMatrixWorld(true);
  game.scene.staticGroup.traverse(mesh=>{
   if(!mesh.isMesh||mesh.geometry.userData.treeLod===undefined)return;
   const attribute=mesh.geometry.attributes.position;
   const add=matrix=>{for(let j=0;j<attribute.count;j++)box.expandByPoint(new THREE.Vector3().fromBufferAttribute(attribute,j).applyMatrix4(matrix));};
   if(mesh.isInstancedMesh){for(let j=0;j<mesh.count;j++)if(mesh.userData.selections[j]?.id===id){const matrix=new THREE.Matrix4();mesh.getMatrixAt(j,matrix);add(matrix.premultiply(mesh.matrixWorld));}}
   else{let parent=mesh;while(parent&&!parent.userData.selection)parent=parent.parent;if(parent?.userData.selection.id===id)add(mesh.matrixWorld);}
  });return box;
 };
 assert(new Set(ids.map(id=>id%4)).size===4,'Cardinal tree variation was not exercised.');
 for(let i=0;i<ids.length;i++){
  const box=worldBounds(ids[i]),tile=tiles[i];assert(!box.isEmpty(),'A placed tree has no delivered mesh.');
  assert(box.min.x>=tile.x*4&&box.max.x<=(tile.x+1)*4&&box.min.z>=tile.y*4&&box.max.z<=(tile.y+1)*4,'Actual tree vertices cross their occupied tile.');
  assert(Math.abs(box.min.y-tile.height/8)<1e-6&&box.max.y<=tile.height/8+8,'Actual tree ground or height differs from its reservation.');
  bounds.push({id:ids[i],tile,min:box.min.toArray(),max:box.max.toArray()});
 }
 checks.push('All actual placed vertices fit four cardinal unit poses and the existing ground/height reservation');
 const batches=[];
 game.scene.staticGroup.traverse(mesh=>{if(mesh.isMesh&&mesh.geometry.userData.treeLod!==undefined){
  assert(mesh.isInstancedMesh,'Repeated tree meshes were not batched.');
  assert(mesh.customDepthMaterial,'A tree clone lost its owned depth material.');
  if(mesh.material.alphaTest){assert(mesh.material.alphaTest===0.5&&!mesh.material.transparent&&mesh.material.map,'Leaf cards lost the actual mask.');assert(mesh.customDepthMaterial.alphaTest===0.5&&mesh.customDepthMaterial.map===mesh.material.map,'Instancing lost the leaf shadow mask.');}
  batches.push({lod:mesh.geometry.userData.treeLod,instances:mesh.count,material:mesh.material.name,mask:mesh.material.alphaTest});
 }});
 assert(batches.length>0&&batches.length<=6,'Tree batches exceed their six actual primitive groups.');
 checks.push('Placed trees and perimeter trees share at most six batches with owned alpha-mask shadow materials');
 const before=await game.request('save',null),memory=[];
 for(let i=0;i<4;i++){game.scene.setStatic(game.scene.scenery,game.scene.entry);await frames();memory.push({...game.scene.renderer.info.memory});}
 assert(memory.every(m=>m.geometries===memory[0].geometries&&m.textures===memory[0].textures),'Repeated static rebuild leaked GPU resources.');
 assert(await game.request('save',null)===before,'Art rebuilding changed the saved simulation.');
 checks.push('Four real static rebuilds keep GPU resource counts and the paused save unchanged');
 await game.request('load',before);await game.refresh(true);await wait(()=>ids.every(id=>game.scene.elements.some(e=>e.id===id)));await frames();
 assert(await game.request('save',null)===before,'Reloading art changed version 8 park data.');
 for(const id of ids)assert(!worldBounds(id).isEmpty(),'A saved tree failed to render after load.');
 checks.push('Actual worker save/load preserves planted trees and current version 8 park data');
 const lodStates=[],cadence=[],rebuilds=[],exchanges=[],originalSetStatic=game.scene.setStatic,originalSetLOD=game.scene.treeAssets.setLOD;
 const identitySnapshot=()=>{const result=[];game.scene.staticGroup.traverse(mesh=>{if(mesh.isMesh&&mesh.userData.treePlacement)result.push({uuid:mesh.uuid,matrix:mesh.instanceMatrix?Array.from(mesh.instanceMatrix.array):mesh.matrixWorld.toArray(),selections:mesh.userData.selections??null});});return JSON.stringify(result);};
 const instanceIdentity=identitySnapshot();
 game.scene.setStatic=function(...args){const start=performance.now();try{return originalSetStatic.apply(this,args);}finally{rebuilds.push({lod:this.art.treeLod,milliseconds:performance.now()-start});}};
 game.scene.treeAssets.setLOD=function(...args){const start=performance.now();try{return originalSetLOD.apply(this,args);}finally{exchanges.push({lod:args[1],milliseconds:performance.now()-start});}};
 const zoom=async value=>{
  window.oakProgress.zoomSteps.push({zoom:value,state:'started'});
  const start=performance.now();game.scene.camera.zoom=value;game.scene.camera.updateProjectionMatrix();await frames();
  cadence.push(performance.now()-start);
  game.scene.renderer.shadowMap.needsUpdate=true;game.scene.renderer.render(game.scene.scene,game.scene.camera);
  const lod=game.scene.art.treeLod,visible=new Set();game.scene.staticGroup.traverse(mesh=>{if(mesh.isMesh&&mesh.geometry.userData.treeLod!==undefined&&mesh.userData.selections?.some(selection=>selection?.kind==='element'))visible.add(mesh.geometry.userData.treeLod);});
  assert(visible.size===1&&visible.has(lod),'Placed tree instances do not follow the camera LOD.');
  assert(identitySnapshot()===instanceIdentity,'LOD exchange changed existing instance matrices, selections or mesh identity.');
  game.scene.staticGroup.traverse(mesh=>{if(mesh.isMesh&&mesh.userData.treePlacement===false)assert(mesh.geometry.userData.treeLod===2,'Boundary tree changed its fixed distant LOD.');});
  for(let i=0;i<ids.length;i++){const box=worldBounds(ids[i]),t=tiles[i];assert(!box.isEmpty()&&box.min.x>=t.x*4&&box.max.x<=(t.x+1)*4&&box.min.z>=t.y*4&&box.max.z<=(t.y+1)*4&&Math.abs(box.min.y-t.height/8)<1e-6&&box.max.y<=t.height/8+8,'Exchanged LOD vertices crossed a cardinal reservation.');}
  const result={zoom:value,lod,memory:{...game.scene.renderer.info.memory},triangles:game.scene.renderer.info.render.triangles,drawCalls:game.scene.renderer.info.render.calls};lodStates.push(result);window.oakProgress.zoomSteps.at(-1).state='completed';return result;
 };
 const firstNear=await zoom(4),firstFar=await zoom(.5),firstPark=await zoom(1.18);
 assert(firstNear.lod===0&&firstFar.lod===2&&firstPark.lod===1,'Actual zoom did not exercise all three levels.');
 assert(firstPark.triangles<firstNear.triangles&&firstFar.triangles<firstPark.triangles,'Reduced camera LODs do not reduce actual rendered triangles.');
 const sourceBeforeZoom=await game.request('save',null);
 for(let i=0;i<3;i++){const near=await zoom(4),far=await zoom(.5),park=await zoom(1.18);for(const sample of [near,far,park])assert(sample.memory.geometries===firstPark.memory.geometries&&sample.memory.textures===firstPark.memory.textures,'Zoom transitions grow the warmed GPU cache.');}
 assert(await game.request('save',null)===sourceBeforeZoom,'Camera LOD transitions changed the saved park.');
 const height=game.scene.container.clientHeight,stableZoom=105*120/(7.1*height);
 await zoom(4);const highBand=await zoom(stableZoom);assert(highBand.lod===0,'Near-level hysteresis was lost.');
 await zoom(.5);const lowBand=await zoom(stableZoom);assert(lowBand.lod===1,'Middle-level hysteresis was lost.');
 checks.push('Real zoom selects all three unit LODs, reduces draw triangles and preserves the warmed GPU cache and saved park');
 checks.push('The same actual projected size retains different stable LODs inside the measured hysteresis band');
 await zoom(1.18);
 assert(rebuilds.length===0&&exchanges.length>0,'Zoom rebuilt the full static park instead of exchanging tree geometry.');
 checks.push('Actual zoom exchanges tree primitives in place without rebuilding the static park');
 checks.push('Every exchanged LOD preserves mesh identity, exact instance matrices and selections, fixed boundary LOD and all four cardinal reservations');
 game.scene.setStatic=originalSetStatic;
 game.scene.treeAssets.setLOD=originalSetLOD;
 for(const id of ids)assert(await game.execute({type:'remove-scenery',id}),'Tree removal failed.');
 await wait(()=>ids.every(id=>!game.scene.elements.some(e=>e.id===id)));await frames();
 for(const id of ids)assert(worldBounds(id).isEmpty(),'A removed tree remains in a selectable instance.');
 const after=JSON.parse(await game.request('save',null));assert(saved.cash-after.cash===120,'Planting/removing four trees changed the existing half-refund policy.');
 checks.push('Demolition removes real selectable instances and preserves authoritative half refunds');
 return{ok:true,checks,bounds,batches,memory,lodStates,rebuildCpuMilliseconds:rebuilds,transitionTwoFrameMilliseconds:cadence,
  treeExchangeCpuMilliseconds:exchanges,
  cadenceScope:'Observed software-WebGL transition plus two frame waits, not isolated CPU rebuild time or representative hardware FPS',drawCalls:game.scene.renderer.info.render.calls,triangles:game.scene.renderer.info.render.triangles};
})()
