import * as THREE from 'three';

export function createArtContext(scene){
 const materials=new Map(),geometries=new Map(),textures=new Map(),owned=new Set();
 const material=(key,props)=>{if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial(props));return materials.get(key);};
 const geometry=(key,create)=>{if(!geometries.has(key))geometries.set(key,create());return geometries.get(key);};
 const unit={box:geometry('unit-box',()=>new THREE.BoxGeometry(1,1,1)),cylinder:geometry('unit-cylinder',()=>new THREE.CylinderGeometry(.5,.5,1,12)),sphere:geometry('unit-sphere',()=>new THREE.SphereGeometry(.5,12,8)),cone:geometry('unit-cone',()=>new THREE.ConeGeometry(.5,1,12))};
 const add=(parent,geo,mat,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0])=>{const mesh=new THREE.Mesh(geo,mat);mesh.position.fromArray(position);mesh.scale.fromArray(scale);mesh.rotation.set(...rotation);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const texture=(key,width,height,paint)=>{if(!textures.has(key)){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;paint(canvas.getContext('2d'),width,height);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(4,scene.renderer.capabilities.getMaxAnisotropy());textures.set(key,t);}return textures.get(key);};
 const ctx={tile:4,half:2,packet:null,material,geometry,texture,add,ownGeometry:g=>(owned.add(g),g),surfaceHeight:(x,y)=>scene.surfaceMap?.get(`${Math.floor(x)},${Math.floor(y)}`)??4};
 for(const kind of ['box','cylinder','sphere','cone'])ctx[kind]=(parent,mat,x,y,z,sx,sy,sz)=>add(parent,unit[kind],mat,[x,y,z],[sx,sy,sz]);
 ctx.segment=(parent,mat,from,to,radius)=>{const delta=to.clone().sub(from),length=delta.length();if(length<.00001)return null;const mesh=ctx.cylinder(parent,mat,...from.clone().add(to).multiplyScalar(.5).toArray(),radius*2,length,radius*2);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;};
 ctx.text=(parent,text,{x=0,y=0,z=0,width=2,height=.6,color='#fff3d5',background='#234932',rotation=[0,0,0]}={})=>{const value=String(text).slice(0,80),key=`label:${value}:${color}:${background}`;const map=texture(key,512,128,(c,w,h)=>{c.fillStyle=background;c.fillRect(0,0,w,h);c.strokeStyle=color;c.lineWidth=5;c.strokeRect(8,8,w-16,h-16);c.fillStyle=color;c.font='bold 52px Georgia, serif';c.textAlign='center';c.textBaseline='middle';c.fillText(value,w/2,h/2,w-32);});const mat=material(key,{map,roughness:.8,side:THREE.DoubleSide,transparent:background==='transparent',depthWrite:background!=='transparent'});return add(parent,geometry('label-plane',()=>new THREE.PlaneGeometry(1,1)),mat,[x,y,z],[width,height,1],rotation);};
 ctx.releaseStatic=()=>{for(const g of owned)g.dispose();owned.clear();};
 ctx.dispose=()=>{ctx.releaseStatic();for(const g of geometries.values())g.dispose();for(const m of materials.values())m.dispose();for(const t of textures.values())t.dispose();geometries.clear();materials.clear();textures.clear();};
 return ctx;
}

export function fitModel(group,{x,z,low,height,tile=4}){
 group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(group);
 if(bounds.isEmpty())return;
 const size=bounds.getSize(new THREE.Vector3()),scale=new THREE.Vector3(Math.min(1,(tile-.02)/size.x),Math.min(1,height/Math.max(height,bounds.max.y-low)),Math.min(1,(tile-.02)/size.z));
 group.scale.copy(scale);group.position.set(x*(1-scale.x),low*(1-scale.y),z*(1-scale.z));group.updateMatrixWorld(true);
 bounds.setFromObject(group);
 for(const [axis,center]of[['x',x],['z',z]]){
  const min=center-tile/2+.01,max=center+tile/2-.01;
  if(bounds.min[axis]<min)group.position[axis]+=min-bounds.min[axis];
  else if(bounds.max[axis]>max)group.position[axis]+=max-bounds.max[axis];
 }
 group.updateMatrixWorld(true);
}

export function batchStatic(root){
 root.updateMatrixWorld(true);const buckets=new Map();
 root.traverse(mesh=>{if(!mesh.isMesh||mesh.isInstancedMesh||Array.isArray(mesh.material)||mesh.material.transparent||mesh.matrixWorld.determinant()<0)return;for(let ancestor=mesh;ancestor;ancestor=ancestor.parent)if(!ancestor.visible)return;const key=`${mesh.geometry.uuid}:${mesh.material.uuid}:${mesh.castShadow}:${mesh.receiveShadow}:${mesh.customDepthMaterial?.uuid??''}:${mesh.userData.treePlacement??''}`,batch=buckets.get(key)??[];let parent=mesh,selection=null;while(parent&&parent!==root){if(parent.userData.selection){selection=parent.userData.selection;break;}parent=parent.parent;}batch.push({mesh,selection});buckets.set(key,batch);});
 for(const batch of buckets.values()){
  if(batch.length<2)continue;const first=batch[0].mesh,instances=new THREE.InstancedMesh(first.geometry,first.material,batch.length);instances.castShadow=first.castShadow;instances.receiveShadow=first.receiveShadow;instances.userData.selections=[];
  instances.customDepthMaterial=first.customDepthMaterial;
  instances.userData.treePlacement=first.userData.treePlacement;instances.userData.treePrimitive=first.userData.treePrimitive;
  for(let i=0;i<batch.length;i++){const {mesh,selection}=batch[i];instances.setMatrixAt(i,mesh.matrixWorld);instances.userData.selections.push(selection);mesh.removeFromParent();}
  instances.instanceMatrix.needsUpdate=true;instances.computeBoundingSphere();root.add(instances);
 }
}
