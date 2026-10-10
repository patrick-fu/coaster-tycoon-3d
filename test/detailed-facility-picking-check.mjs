import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ParkScene} from '../web-dist/park-scene.js';

function picker(){
 const camera=new THREE.OrthographicCamera(-2,2,2,-2,.1,100);camera.position.set(0,0,10);camera.updateMatrixWorld(true);
 const group=new THREE.Group(),hidden=new THREE.Group();group.add(hidden);
 const mesh=(z,id)=>{const result=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial());result.position.z=z;result.userData.selection={kind:'element',id};return result;};
 const inactive=mesh(3,101),active=mesh(0,202);hidden.add(inactive);group.add(active);group.updateMatrixWorld(true);
 const scene=Object.assign(Object.create(ParkScene.prototype),{camera,ray:new THREE.Raycaster(),mouse:new THREE.Vector2(),staticGroup:group,renderer:{domElement:{getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})}},woodenVehicles:{group:new THREE.Group()},carousels:{group:new THREE.Group()},people:{pickMeshes:[]},vehicles:{pickMeshes:[]},boats:null});
 return{scene,hidden,inactive,cleanup(){for(const item of[inactive,active]){item.geometry.dispose();item.material.dispose();}}};
}
test('real raycasting retains the nearest visible mesh selection',()=>{const p=picker();try{assert.deepEqual(p.scene.pick({clientX:50,clientY:50}),{kind:'element',id:101});}finally{p.cleanup();}});
test('an inactive ancestor cannot intercept a visible element behind it',()=>{const p=picker();try{p.hidden.visible=false;assert.deepEqual(p.scene.pick({clientX:50,clientY:50}),{kind:'element',id:202});}finally{p.cleanup();}});
test('an inactive mesh cannot intercept a visible element behind it',()=>{const p=picker();try{p.inactive.visible=false;assert.deepEqual(p.scene.pick({clientX:50,clientY:50}),{kind:'element',id:202});}finally{p.cleanup();}});
