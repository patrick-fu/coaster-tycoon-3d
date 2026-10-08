import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createArtContext,batchStatic,fitModel} from './art/runtime.js';
import {buildEnvironment,buildPath,buildScenery} from './art/environment.js';
import {buildFacility,buildAmenity} from './art/buildings.js';
import {buildTrack,buildPortal,createVehicles,createPeople} from './art/coaster.js';
import {steelRules} from './content/steel-coaster.js';
import {WORKER_PROTOCOL_VERSION} from './simulation/protocol.js';
import {createTreeAssets} from './art/tree-assets.js';
import {createSurfaceAssets} from './art/surface-assets.js';

export class ParkScene{
 constructor(container){
  this.container=container;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#c9dce3');this.scene.fog=new THREE.Fog('#c9dce3',240,560);
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});this.renderer.setPixelRatio(1);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;this.renderer.shadowMap.autoUpdate=false;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;container.append(this.renderer.domElement);
  this.camera=new THREE.OrthographicCamera(-100,100,60,-60,.1,700);this.camera.position.set(154,64,150);this.camera.zoom=1.18;
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(82,4,74);this.controls.enableDamping=true;this.controls.dampingFactor=.1;this.controls.minPolarAngle=.2;this.controls.maxPolarAngle=Math.PI/2.08;this.controls.minZoom=.5;this.controls.maxZoom=5;
  this.scene.add(new THREE.HemisphereLight('#eff6ff','#596d37',2));const sun=new THREE.DirectionalLight('#fff0ce',3);sun.position.set(30,135,45);sun.target.position.set(90,0,80);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-140;sun.shadow.camera.right=140;sun.shadow.camera.top=140;sun.shadow.camera.bottom=-140;sun.shadow.camera.near=1;sun.shadow.camera.far=330;sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;this.scene.add(sun,sun.target);
  this.staticGroup=new THREE.Group();this.scene.add(this.staticGroup);this.art=createArtContext(this);this.art.staticGroup=this.staticGroup;this.art.scene=this.scene;this.art.renderer=this.renderer;this.surfaceMap=new Map();
  this.treeAssets=createTreeAssets(this.renderer);this.art.treeAssets=this.treeAssets;this.art.treeLod=1;
  this.treeAssets.readyPromise.then(()=>{if(!this.disposed&&this.treeAssets.ready&&this.scenery)this.setStatic(this.scenery,this.entry);});
  this.surfaceAssets=createSurfaceAssets(this.renderer);
  this.surfaceAssets.readyPromise.then(()=>{
   if(this.disposed||!this.surfaceAssets.ready)return;
   const palette=this.surfaceAssets.palette;this.art.surfacePalette=palette;
   for(const [key,props]of[['mat-ground-turf',palette.ground],['mat-path-public-deck',palette.path],['mat-path-queue-deck',palette.queue]]){
    const material=this.art.material(key,props);material.setValues(props);material.needsUpdate=true;
   }
  });
  this.people=createPeople(this.art,10000);this.vehicles=createVehicles(this.art,10000);this.scene.add(this.people.group,this.vehicles.group);for(const factory of[this.people,this.vehicles])factory.group.traverse(o=>{if(o.isInstancedMesh)o.count=0;});
  this.litter=new THREE.InstancedMesh(this.art.geometry('litter-box',()=>new THREE.BoxGeometry(1,1,1)),this.art.material('litter',{color:'#fff0be',roughness:1}),10000);this.litter.count=0;this.scene.add(this.litter);
  this.ghost=new THREE.Group();this.scene.add(this.ghost);this.ghostMaterial=new THREE.MeshBasicMaterial({color:'#80bd53',transparent:true,opacity:.48,depthWrite:false});this.selection=new THREE.Mesh(new THREE.BoxGeometry(4.08,.06,4.08),new THREE.MeshBasicMaterial({color:'#ffd35e',transparent:true,opacity:.5,depthWrite:false}));this.selection.visible=false;this.scene.add(this.selection);
  this.ray=new THREE.Raycaster();this.mouse=new THREE.Vector2();this.transform=new THREE.Object3D();this.visibleFacilityState='';this.visibleAmenityState='';
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();this.renderer.setAnimationLoop(()=>{this.controls.update();this.updateTreeLOD();this.renderer.render(this.scene,this.camera);});
 }
 updateTreeLOD(){
  // A 7.1 m sphere encloses the measured near tree. Hysteresis keeps zoom
  // damping at a boundary from exchanging geometry every frame.
  const pixels=7.1*this.container.clientHeight*this.camera.zoom/(this.camera.top-this.camera.bottom),current=this.art.treeLod;
  let next=current;
  if(current===0&&pixels<95)next=pixels<32?2:1;
  else if(current===1){if(pixels>115)next=0;else if(pixels<32)next=2;}
  else if(current===2&&pixels>42)next=pixels>115?0:1;
  if(next!==current){this.art.treeLod=next;if(this.treeAssets.ready&&this.scenery){this.treeAssets.setLOD(this.staticGroup,next);this.renderer.shadowMap.needsUpdate=true;}}
 }
 resize(){const {clientWidth:w,clientHeight:h}=this.container;if(!w||!h)return;this.camera.left=-60*w/h;this.camera.right=60*w/h;this.camera.top=60;this.camera.bottom=-60;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
 clearStatic(){this.staticGroup.traverse(object=>{if(object.isInstancedMesh)object.dispose();});this.staticGroup.clear();this.art.releaseStatic();}
 setStatic(scenery,entry){
  this.clearStatic();this.elements=scenery.elements;this.scenery=scenery;this.entry=entry;this.surfaceMap.clear();for(let i=0;i<scenery.surfaces.length;i+=5)this.surfaceMap.set(`${scenery.surfaces[i]},${scenery.surfaces[i+1]}`,scenery.surfaces[i+2]/32*4);
  this.art.packet=this.packet;buildEnvironment(this.art,scenery,entry);
  for(const e of scenery.elements){const group=new THREE.Group();group.userData.selection={kind:'element',id:e.id};this.staticGroup.add(group);
   if(e.kind==='track')buildTrack(this.art,group,e,steelRules);
   else if(e.kind==='path')buildPath(this.art,group,e,scenery);
   else if(e.kind==='portal')buildPortal(this.art,group,e,this.packet?.rides.find(r=>r.id===e.ride));
   else if(e.kind==='facility')buildFacility(this.art,group,e,this.packet?.facilities.find(f=>f.id===e.facility));
   else if(e.kind==='amenity')buildAmenity(this.art,group,e,{...this.packet?.amenities.find(a=>a.id===e.id),capacity:steelRules.housekeeping.binCapacity});
   else if(e.kind==='scenery')buildScenery(this.art,group,e);
   if(['facility','portal','scenery'].includes(e.kind)&&!group.userData.detailedTree)fitModel(group,{x:e.tile.x*4+2,z:e.tile.y*4+2,low:e.height/8,height:e.kind==='scenery'?steelRules.scenery[e.sceneryType].height/8:2});
  }
  batchStatic(this.staticGroup);this.renderer.shadowMap.needsUpdate=true;
 }
 update(packet){
  if(packet.protocolVersion!==WORKER_PROTOCOL_VERSION||packet.contentVersion!==1)throw new Error('Unsupported park presentation version.');
  for(const ride of packet.rides)if(ride.presentation.kind!=='procedural-coaster'||ride.presentation.profileId!=='classic-candidate-v1')throw new Error('This ride has no supported presentation.');
  for(const facility of packet.facilities)if(facility.presentation.kind!=='procedural-facility'||facility.presentation.profileId!=='classic-candidate-v1'||facility.presentation.service!==facility.kind)throw new Error('This facility has no supported presentation.');
  if(packet.coordinates.metresPerTile!==steelRules.motion.tileMetres)throw new Error('Unsupported park coordinate profile.');
  this.packet=packet;this.art.packet=packet;
  const facilities=packet.facilities.map(f=>`${f.id}:${f.open}`).join(','),amenities=packet.amenities.map(a=>`${a.id}:${a.fill}`).join(',');
  if(packet.scenery)this.setStatic(packet.scenery,packet.entry);
  else if(this.scenery&&(facilities!==this.visibleFacilityState||amenities!==this.visibleAmenityState))this.setStatic(this.scenery,packet.entry);
  this.visibleFacilityState=facilities;this.visibleAmenityState=amenities;
  this.people.update(packet);this.vehicles.update(packet);
  let count=0;for(let i=0;i<packet.litter.length;i+=4){const [id,x,z,y]=packet.litter.slice(i,i+4);this.transform.position.set(x+2,y+.04,z+2);this.transform.scale.set(.2,.035,.15);this.transform.rotation.set(0,id%5,0);this.transform.updateMatrix();this.litter.setMatrixAt(count++,this.transform.matrix);}this.litter.count=count;this.litter.instanceMatrix.needsUpdate=true;this.litter.boundingSphere=null;this.renderer.shadowMap.needsUpdate=true;
 }
 pointer(event,height){const rect=this.renderer.domElement.getBoundingClientRect();this.mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.mouse,this.camera);const p=this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-height/8),new THREE.Vector3());return p?{x:Math.floor(p.x/4),y:Math.floor(p.z/4)}:null;}
 pick(event){
  const rect=this.renderer.domElement.getBoundingClientRect();this.mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.mouse,this.camera);
  for(const hit of this.ray.intersectObjects([this.staticGroup,...this.people.pickMeshes,...this.vehicles.pickMeshes],true)){
   for(const dynamic of [this.people,this.vehicles])if(dynamic.pickMeshes.includes(hit.object))return dynamic.selections[hit.instanceId]??null;
   if(hit.object.userData.selections){const selected=hit.object.userData.selections[hit.instanceId];if(selected)return selected;continue;}
   let object=hit.object;while(object){if(object.userData.selection)return object.userData.selection;object=object.parent;}
  }return null;
 }
 preview(cells,ok){this.ghost.clear();this.ghostMaterial.color.set(ok?'#9cdd53':'#d84831');for(const c of cells){const mesh=new THREE.Mesh(this.art.geometry('preview-box',()=>new THREE.BoxGeometry(1,1,1)),this.ghostMaterial);mesh.position.set(c.x*4+2,c.low/8+.12,c.y*4+2);mesh.scale.set(4,.18,4);this.ghost.add(mesh);}}
 highlight(point){this.selection.visible=!!point;if(point)this.selection.position.set(point.x*4+2,point.z/8+.2,point.y*4+2);}
 overview(){this.controls.target.set(82,4,74);this.camera.position.set(154,64,150);this.camera.zoom=1.18;this.camera.updateProjectionMatrix();}
 close(){this.controls.target.set(82,4,67);this.camera.position.set(124,40,113);this.camera.zoom=2.5;this.camera.updateProjectionMatrix();}
 dispose(){this.disposed=true;this.renderer.setAnimationLoop(null);this.resizeObserver.disconnect();this.controls.dispose();this.clearStatic();this.people.dispose();this.vehicles.dispose();this.litter.dispose();this.ghostMaterial.dispose();this.selection.geometry.dispose();this.selection.material.dispose();this.treeAssets.dispose();this.surfaceAssets.dispose();this.art.surfacePalette=null;this.art.dispose();this.renderer.dispose();}
}
