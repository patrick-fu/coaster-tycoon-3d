import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {batchStatic} from '../ui/art/runtime.js';

test('static batching preserves the visible shutter pose and element selection across open closed open',()=>{
 const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshStandardMaterial();
 for(const open of [true,false,true]){
  const root=new THREE.Group();
  for(let id=1;id<=2;id++){
   const building=new THREE.Group();building.position.x=(id-1)*4;building.userData.selection={kind:'element',id};root.add(building);
   building.add(new THREE.Mesh(geometry,material));
   for(const [name,active,y] of [['OpenShutter',open,2],['ClosedShutter',!open,1]]){
    const state=new THREE.Group();state.name=name;state.visible=active;building.add(state);
    const nested=new THREE.Group();state.add(nested);
    const mesh=new THREE.Mesh(geometry,material);mesh.position.y=y;nested.add(mesh);
   }
  }
  batchStatic(root);root.updateMatrixWorld(true);
  const visible=[],matrix=new THREE.Matrix4(),position=new THREE.Vector3();
  root.traverseVisible(object=>{
   if(object.isInstancedMesh){
    for(let i=0;i<object.count;i++){
     object.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);
     visible.push({position:position.toArray(),selection:object.userData.selections[i]});
    }
   }else if(object.isMesh){
    position.setFromMatrixPosition(object.matrixWorld);let parent=object;
    while(parent&&!parent.userData.selection)parent=parent.parent;
    visible.push({position:position.toArray(),selection:parent?.userData.selection});
   }
  });
  visible.sort((a,b)=>a.position[0]-b.position[0]||a.position[1]-b.position[1]);
  assert.deepEqual(visible,[
   {position:[0,0,0],selection:{kind:'element',id:1}},
   {position:[0,open?2:1,0],selection:{kind:'element',id:1}},
   {position:[4,0,0],selection:{kind:'element',id:2}},
   {position:[4,open?2:1,0],selection:{kind:'element',id:2}},
  ]);
  root.traverse(object=>{if(object.isInstancedMesh)object.dispose();});
 }
 geometry.dispose();material.dispose();
});
