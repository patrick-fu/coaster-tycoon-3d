import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildPath} from '../ui/art/environment.js';

const sides=[[1,0],[0,1],[-1,0],[0,-1]];
function edgeHeight(direction,side,{kind='information',height=32,queueFor=null,projected=true}={}) {
 const [dx,dy]=sides[side];
 const facility={id:2,kind:'facility',facility:7,tile:{x:8,y:8},height:32,direction};
 const path={id:3,kind:'path',tile:{x:8+dx,y:8+dy},height,queueFor};
 const root=new THREE.Group();
 buildPath({packet:{facilities:projected?[{id:7,kind,element:2}]:[]}},root,path,{elements:[facility,path]});
 root.updateMatrixWorld(true);
 const inward=queueFor===null?1.9:1.72;
 const ray=new THREE.Raycaster(new THREE.Vector3(path.tile.x*4+2-dx*inward,10,path.tile.y*4+2-dy*inward),new THREE.Vector3(0,-1,0));
 const hits=ray.intersectObject(root,true);
 assert(hits.length>0,'The actual paving must be present under the border probe.');
 const top=hits[0].point.y;
 const geometries=new Set(),materials=new Set();
 root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of[o.material].flat())materials.add(m);}});
 for(const g of geometries)g.dispose();
 for(const m of materials)m.dispose();
 return top;
}

test('all rotated information counters have open paving while ordinary shop sides retain their kerbs',()=>{
 for(let direction=0;direction<4;direction++)for(let side=0;side<4;side++){
  assert(Math.abs(edgeHeight(direction,side)-4.14)<1e-6,`Information counter ${direction}/${side} is fenced.`);
  const ordinary=edgeHeight(direction,side,{kind:'food'});
  assert(Math.abs(ordinary-(direction===side?4.14:4.2))<1e-6,`Ordinary shop frontage ${direction}/${side} changed.`);
 }
});

test('information border openings require a projected facility and a public same-height path',()=>{
 assert(Math.abs(edgeHeight(0,2,{projected:false})-4.2)<1e-6);
 assert(Math.abs(edgeHeight(0,2,{height:48})-6.2)<1e-6);
 for(let side=0;side<4;side++)assert(edgeHeight(side,side,{queueFor:0})>5,'An information counter must not cut its adjacent queue rail.');
});
