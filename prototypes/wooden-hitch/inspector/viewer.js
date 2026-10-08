import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const $=id=>document.getElementById(id);
const renderer=new THREE.WebGLRenderer({canvas:$('viewport'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.9;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#779485');
const environment=new RoomEnvironment();
const pmrem=new THREE.PMREMGenerator(renderer);
const environmentMap=pmrem.fromScene(environment,.035);
scene.environment=environmentMap.texture;
scene.environmentIntensity=.55;
environment.dispose();pmrem.dispose();
const camera=new THREE.PerspectiveCamera(35,1,.05,150);
const controls=new OrbitControls(camera,$('viewport'));
controls.enableDamping=true;controls.minDistance=1;controls.maxDistance=40;
controls.maxPolarAngle=Math.PI*.48;
const sun=new THREE.DirectionalLight('#fff5dc',2.0);
sun.position.set(-6,12,8);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-9;sun.shadow.camera.right=9;sun.shadow.camera.top=9;sun.shadow.camera.bottom=-9;
sun.shadow.camera.near=.1;sun.shadow.camera.far=40;
sun.shadow.bias=-.0002;sun.shadow.normalBias=.018;
scene.add(sun,new THREE.HemisphereLight('#d2e5f0','#3d4c36',.65));
const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:'#586e5a',roughness:1}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.025;floor.receiveShadow=true;scene.add(floor);
const grid=new THREE.GridHelper(32,8,'#738971','#637e6c');grid.position.y=-.017;
grid.material.opacity=.25;grid.material.transparent=true;scene.add(grid);
const loader=new GLTFLoader();
const cache=new Map();
let entries=[],current=null,currentEntry=null,requestedEntry=null,markers=null,radius=3,revision=0;
let frame=0,ready=false,errorCount=0;
const glErrors=[];
const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();
let pointerDown=null;

function dispose(root){
 const geometries=new Set(),materials=new Set(),textures=new Set(),bitmaps=new Set();
 root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const mat of [...[].concat(o.material??[]),o.customDepthMaterial].filter(Boolean)){materials.add(mat);for(const v of Object.values(mat))if(v?.isTexture){textures.add(v);if(typeof ImageBitmap!=='undefined'&&v.source?.data instanceof ImageBitmap)bitmaps.add(v.source.data);}}});
 for(const x of geometries)x.dispose();for(const x of materials)x.dispose();for(const x of textures)x.dispose();
 for(const x of bitmaps)x.close();
}
function reportError(error){errorCount++;$('load-error').hidden=false;$('load-error').textContent=String(error.message??error);$('asset-status').textContent='Load failed';}
function setView(view){
 if(!current)return;
 const box=new THREE.Box3().setFromObject(current),center=box.getCenter(new THREE.Vector3());
 const direction={front:[.9,.7,1.25],rear:[-.9,.7,-1.25],left:[-1.5,.5,.05],right:[1.5,.5,.05],overview:[1,.95,1]}[view]??[1,.95,1];
 camera.position.copy(center).add(new THREE.Vector3(...direction).normalize().multiplyScalar(radius*4.15));
 camera.near=Math.max(.015,radius/150);camera.far=radius*40;camera.updateProjectionMatrix();
 controls.target.copy(center);controls.update();
 for(const button of document.querySelectorAll('[data-view]'))button.classList.toggle('active',button.dataset.view===view);
}
function setWireframe(){if(current)current.traverse(o=>{if(o.isMesh)for(const mat of [].concat(o.material))mat.wireframe=$('wireframe').checked;});}
function setRestraints(){
 if(!current)return;
 for(const name of currentEntry.report.authoring.restraints??[]){const node=current.getObjectByName(name);if(!node)continue;node.userData.closedQuaternion??=node.quaternion.clone();node.quaternion.copy(node.userData.closedQuaternion);if($('restraints').checked)node.rotateX(Math.PI*.42);}
}
function setMarkers(){if(markers)markers.visible=$('anchors').checked;}
async function select(entry){
 requestedEntry=entry;$('reload').disabled=false;
 const own=++revision;ready=false;$('asset-status').textContent='Loading model…';$('load-error').hidden=true;
 try{
  let model=cache.get(entry.id);
  if(!model){const gltf=await loader.loadAsync(entry.glb);model=gltf.scene;if(own!==revision){dispose(model);return;}
   // Three's shared default depth material retains its previous map uniform.
   // An asset-owned depth material retires that reference with the bitmap.
   const depthMaterial=new THREE.MeshDepthMaterial();
   model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.customDepthMaterial=depthMaterial;}});cache.set(entry.id,model);}
  if(own!==revision)return;
  if(current)scene.remove(current);
  if(markers){scene.remove(markers);dispose(markers);}
  current=model;currentEntry=entry;scene.add(current);
  const bounds=new THREE.Box3().setFromObject(current),size=bounds.getSize(new THREE.Vector3());
  floor.position.y=bounds.min.y-.025;grid.position.y=bounds.min.y-.017;
  radius=Math.max(size.x,size.y,size.z)*.70;
  markers=new THREE.Group();
  current.updateMatrixWorld(true);
  for(const name of entry.report.authoring.anchors??[]){const node=current.getObjectByName(name);if(!node)continue;const sphere=new THREE.Mesh(new THREE.SphereGeometry(.045,10,8),new THREE.MeshBasicMaterial({color:name.startsWith('Seat')?'#ffbf55':'#d5f3ec',depthTest:false}));sphere.position.copy(node.getWorldPosition(new THREE.Vector3()));sphere.renderOrder=10;markers.add(sphere);}
  scene.add(markers);setMarkers();setWireframe();setRestraints();setView('front');
  $('asset-title').textContent=entry.title;$('asset-subtitle').textContent=entry.subtitle;
  $('asset-status').textContent='Actual GLB export · Candidate asset';
  $('asset-metrics').textContent=`${entry.report.geometry.trianglesEvaluated.toLocaleString()} triangles · ${(entry.report.glb.bytes/1048576).toFixed(1)} MB · ${entry.report.authoring.anchors.length} anchors`;
  $('asset-details').textContent=entry.report.authoring.geometryIntent??entry.report.authoring.notes??'Independently authored editable mesh.';
  $('selection-detail').textContent='Select a model part to inspect it.';
  for(const button of $('asset-list').querySelectorAll('button')){button.classList.toggle('active',button.dataset.asset===entry.id);button.setAttribute('aria-pressed',String(button.dataset.asset===entry.id));}
  ready=true;
 }catch(error){if(own===revision)reportError(error);}
}
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>setView(button.dataset.view));
$('anchors').addEventListener('change',setMarkers);$('wireframe').addEventListener('change',setWireframe);$('restraints').addEventListener('change',setRestraints);
$('reload').addEventListener('click',async()=>{if(!requestedEntry)return;const entry=requestedEntry;++revision;const owned=new Set(cache.values());if(current)owned.add(current);for(const model of owned){scene.remove(model);dispose(model);}cache.clear();current=null;await select(entry);});
$('viewport').addEventListener('pointerdown',event=>{pointerDown={x:event.clientX,y:event.clientY};});
$('viewport').addEventListener('pointerup',event=>{
 if(!ready||!pointerDown||Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y)>5)return;
 const rect=$('viewport').getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
 const hit=raycaster.intersectObject(current,true)[0];$('selection-detail').textContent=hit?`Selected: ${hit.object.name}`:'No model part selected.';
});
function resize(){const rect=$('viewport').getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe($('viewport'));
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);frame++;const gl=renderer.getContext();for(let i=0;i<16;i++){const code=gl.getError();if(code===gl.NO_ERROR)break;glErrors.push({frame,code});}});
window.assetLab={status:()=>({ready,asset:currentEntry?.id,frame,errorCount,glError:glErrors[0]?.code??0,glErrors:glErrors.slice(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,scale:current?.scale.toArray(),anchors:currentEntry?.report.authoring.anchors??[],camera:camera.position.toArray()}),select:id=>select(entries.find(e=>e.id===id)),view:setView};
try{
 const response=await fetch('./asset-index.json');if(!response.ok)throw new Error(`Asset manifest ${response.status}`);entries=await response.json();
 for(const entry of entries){const button=document.createElement('button');button.className='btn';button.textContent=entry.title;button.dataset.asset=entry.id;button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>select(entry));$('asset-list').append(button);}
 await select(entries[0]);
}catch(error){reportError(error);}
