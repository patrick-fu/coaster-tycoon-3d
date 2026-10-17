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
import {createWoodenAssets} from './art/wooden-assets.js';
import {createWoodenVehicles,buildWoodenTrack,buildWoodenPortal} from './art/wooden-coaster.js';
import {CONTENT_VERSION} from './content/registry.js';
import {createCarouselAssets} from './art/carousel-assets.js';
import {createCarousels} from './art/carousel.js';
import {buildCarouselPortal} from './art/carousel-portal.js';
import {createFlumeAssets} from './art/flume-assets.js';
import {createBoats} from './art/flume-boats.js';
import {buildFlumeChannel,setFlumeWaterTick} from './art/flume-channel.js';
import {createFlumePortal} from './art/flume-portal.js';
import {buildFlumeApproach} from './art/flume-approach.js';
import {flumeFrame} from './simulation/flume-native.js';
import {createConsumableWaste} from './consumable-waste.js';
import {createDetailedFacilityAssets} from './art/detailed-facility-assets.js';

function presentationFamily(p){
 if(p===null||typeof p!=='object'||Array.isArray(p))return null;
 const prototype=Object.getPrototypeOf(p),keys=Reflect.ownKeys(p);
 if(prototype!==Object.prototype&&prototype!==null||!Object.hasOwn(p,'kind')||!Object.hasOwn(p,'profileId')||keys.some(key=>!['kind','profileId','service'].includes(key)||!Object.hasOwn(Object.getOwnPropertyDescriptor(p,key),'value')))return null;
 if(p.kind==='procedural-coaster'&&p.profileId==='classic-candidate-v1'&&keys.length===2)return 'procedural';
 if(p.kind==='procedural-facility'&&p.profileId==='classic-candidate-v1'&&keys.length===3&&['food','drink','restroom'].includes(p.service))return 'procedural';
 if(keys.length===2){
  if(p.kind==='detailed-wooden-coaster'&&['detailed-wooden-candidate-v1','detailed-wooden-rise-return-v2'].includes(p.profileId))return 'wooden';
  if(p.kind==='detailed-carousel'&&p.profileId==='detailed-carousel-candidate-v1')return 'carousel';
  if(p.kind==='detailed-log-flume'&&p.profileId==='detailed-log-flume-candidate-v1')return 'flume';
 }
 if(p.kind==='detailed-facility'&&keys.length===3){
  if(p.profileId==='detailed-consumable-stalls-v1'&&['food','drink'].includes(p.service))return p.service;
  if(p.profileId==='detailed-information-kiosk-v1'&&p.service==='information')return 'information';
  if(p.profileId==='detailed-gradual-restroom-v1'&&p.service==='restroom')return 'restroom';
  if(p.profileId==='detailed-atm-v1'&&p.service==='atm')return 'atm';
 }
 return null;
}

export class ParkScene{
 constructor(container){
  this.container=container;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#c9dce3');this.scene.fog=new THREE.Fog('#c9dce3',240,560);
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});this.renderer.setPixelRatio(1);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;this.renderer.shadowMap.autoUpdate=false;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;container.append(this.renderer.domElement);
  this.camera=new THREE.OrthographicCamera(-100,100,60,-60,.1,700);this.camera.position.set(152,64,144);this.camera.zoom=1.18;
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(80,4,72);this.controls.enableDamping=true;this.controls.dampingFactor=.1;this.controls.minPolarAngle=.2;this.controls.maxPolarAngle=Math.PI/2.08;this.controls.minZoom=.5;this.controls.maxZoom=5;this.overviewActive=true;this.inputStart=null;this.nativeMovement=false;this.onPointerDown=e=>{this.pointerStart={x:e.clientX,y:e.clientY};this.nativeMovement=false;};this.onPointerMove=e=>{if(this.inputStart&&this.pointerStart&&(e.clientX!==this.pointerStart.x||e.clientY!==this.pointerStart.y))this.nativeMovement=true;};this.onWheelStart=()=>{this.wheelStartZoom=this.camera.zoom;};this.onWheel=()=>{if(Math.abs(this.camera.zoom-this.wheelStartZoom)>1e-6)this.overviewActive=false;};this.renderer.domElement.addEventListener('pointerdown',this.onPointerDown,{capture:true,passive:true});this.renderer.domElement.addEventListener('pointermove',this.onPointerMove,{capture:true,passive:true});this.renderer.domElement.addEventListener('wheel',this.onWheelStart,{capture:true,passive:true});this.renderer.domElement.addEventListener('wheel',this.onWheel,{passive:true});this.controls.addEventListener('start',()=>{this.inputStart={position:this.camera.position.clone(),target:this.controls.target.clone(),zoom:this.camera.zoom};});this.controls.addEventListener('change',()=>{if(this.nativeMovement&&this.inputStart&&(this.camera.position.distanceToSquared(this.inputStart.position)>1e-6||this.controls.target.distanceToSquared(this.inputStart.target)>1e-6||Math.abs(this.camera.zoom-this.inputStart.zoom)>1e-6)){this.overviewActive=false;this.inputStart=null;this.nativeMovement=false;}});this.controls.addEventListener('end',()=>{this.inputStart=null;this.nativeMovement=false;});
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
  this.woodenAssets=createWoodenAssets(this.renderer);this.woodenVehicles=createWoodenVehicles(this.art,this.woodenAssets);this.scene.add(this.woodenVehicles.group);
  this.woodenAssets.readyPromise.then(()=>{
   if(this.disposed)return;
   if(this.woodenAssets.error){this.onAssetError?.('Wooden models could not load: '+this.woodenAssets.error);return;}
   if(this.scenery)this.setStatic(this.scenery,this.entry);
   if(this.packet)this.woodenVehicles.update(this.packet);
  });
  this.carouselAssets=createCarouselAssets(this.renderer);this.carousels=createCarousels(this.art,this.carouselAssets);this.scene.add(this.carousels.group);
  this.carouselAssets.readyPromise.then(()=>{if(this.disposed)return;if(this.carouselAssets.error){this.onAssetError?.('Carousel models could not load: '+this.carouselAssets.error);return;}if(this.packet)this.carousels.update(this.packet,this.elements??[]);if(this.scenery)this.setStatic(this.scenery,this.entry);});
  this.flumeAssets=null;this.boats=null;this.foodAssets=null;this.drinkAssets=null;this.informationAssets=null;this.restroomAssets=null;this.atmAssets=null;this.detailedReflectionTarget=null;this.detailedLightingAttempted=false;
  this.litter=new THREE.InstancedMesh(this.art.geometry('litter-box',()=>new THREE.BoxGeometry(1,1,1)),this.art.material('litter',{color:'#fff0be',roughness:1}),10000);this.litter.count=0;this.scene.add(this.litter);
  this.waste=createConsumableWaste(this.scene);
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
 resize(){const {clientWidth:w,clientHeight:h}=this.container;if(!w||!h)return;const inspector=this.container.parentElement?.querySelector('#inspector')??document.getElementById('inspector'),inspectorWidth=inspector?.offsetWidth??0,reserved=inspectorWidth>0?Math.min(w-1,inspectorWidth+16):0;this.availableWidth=Math.max(1,w-reserved);this.camera.left=-60*w/h;this.camera.right=60*w/h;this.camera.top=60;this.camera.bottom=-60;if(reserved>0)this.camera.setViewOffset(w,h,reserved/2,0,w,h);else this.camera.clearViewOffset();if(this.overviewActive)this.overview();else this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
 clearStatic(){this.art.flumeWaterMap=null;this.staticGroup.traverse(object=>{if(object.isInstancedMesh)object.dispose();});this.staticGroup.clear();this.art.releaseStatic();}
 ensureFlumeAssets(){
  if(this.disposed||this.flumeAssets)return;
  this.flumeAssets=createFlumeAssets(this.renderer);this.boats=createBoats(this.flumeAssets);this.scene.add(this.boats.group);
  this.flumeAssets.readyPromise.then(()=>{if(this.disposed)return;if(this.flumeAssets.error){this.onAssetError?.('Log Flume models could not load: '+this.flumeAssets.error);return;}if(this.scenery)this.setStatic(this.scenery,this.entry);if(this.packet)this.boats.update(this.packet);});
 }
 ensureDetailedReflection(){
  if(this.disposed||this.detailedLightingAttempted)return;
  this.detailedLightingAttempted=true;
  const aux=new THREE.Scene();aux.background=this.scene.background.clone();
  const generator=new THREE.PMREMGenerator(this.renderer);
  try{
   this.detailedReflectionTarget=generator.fromScene(aux,0,.1,100,{size:64});
  }catch(error){
   this.detailedReflectionTarget=null;
   this.onAssetError?.('Detailed shop lighting could not load: '+(error?.message??error));
  }finally{
   generator.dispose();
  }
 }
 ensureDetailedFacilityAssets(service){
  if(service!==undefined&&!['food','drink'].includes(service))throw new Error('Choose a supported detailed food or drink presentation.');
  if(this.disposed)return;
  for(const kind of service===undefined?['food','drink']:[service]){
   const owner=kind==='food'?'foodAssets':'drinkAssets';if(this[owner])continue;
   this.ensureDetailedReflection();
   const assets=createDetailedFacilityAssets(this.renderer,{reflectionTexture:this.detailedReflectionTarget?.texture??null,product:kind==='food'?'burger':'soft-drink'});this[owner]=assets;
   assets.readyPromise.then(()=>{
    if(this.disposed||this[owner]!==assets)return;
    const status=assets.status();
    if(status.error){this.onAssetError?.((kind==='food'?'Burger':'Soft drink')+' model could not load: '+status.error);return;}
    if(status.ready&&!status.disposed&&this.packet&&this.scenery)this.setStatic(this.scenery,this.packet.entry);
   });
  }
 }
 ensureInformationAssets(){
  if(this.disposed||this.informationAssets)return;
  this.ensureDetailedReflection();
  this.informationAssets=createDetailedFacilityAssets(this.renderer,{reflectionTexture:this.detailedReflectionTarget?.texture??null,information:true});
  this.informationAssets.readyPromise.then(()=>{
   if(this.disposed)return;
   if(this.informationAssets.error){this.onAssetError?.('Information kiosk model could not load: '+this.informationAssets.error);return;}
   if(this.packet&&this.scenery)this.setStatic(this.scenery,this.packet.entry);
  });
 }
 informationPresentationReady(){const status=this.informationAssets?.status();return !this.disposed&&status?.ready===true&&!status.error&&!status.disposed;}
 async qualifyInformationPresentation(){
  this.ensureInformationAssets();const assets=this.informationAssets;let timer;
  if(assets&&!assets.status().disposed&&!assets.error&&!assets.ready){
   try{await Promise.race([assets.readyPromise,new Promise((resolve,reject)=>{timer=setTimeout(()=>{assets.dispose();reject(new Error('The information kiosk model did not load in time.'));},20000);})]);}
   finally{clearTimeout(timer);}
  }
  if(!this.informationPresentationReady())throw new Error('The information kiosk model is unavailable. This park was not changed.');
 }
 ensureRestroomAssets(){
  if(this.disposed||this.restroomAssets)return;
  this.ensureDetailedReflection();
  this.restroomAssets=createDetailedFacilityAssets(this.renderer,{reflectionTexture:this.detailedReflectionTarget?.texture??null,restroom:true});
  this.restroomAssets.readyPromise.then(()=>{
   if(this.disposed)return;
   if(this.restroomAssets.error){this.onAssetError?.('Restroom model could not load: '+this.restroomAssets.error);return;}
   if(this.packet&&this.scenery)this.setStatic(this.scenery,this.packet.entry);
  });
 }
 restroomPresentationReady(){const status=this.restroomAssets?.status();return !this.disposed&&status?.ready===true&&!status.error&&!status.disposed;}
 async qualifyRestroomPresentation(){
  this.ensureRestroomAssets();const assets=this.restroomAssets;let timer;
  if(assets&&!assets.status().disposed&&!assets.error&&!assets.ready){
   try{await Promise.race([assets.readyPromise,new Promise((resolve,reject)=>{timer=setTimeout(()=>{assets.dispose();reject(new Error('The restroom model did not load in time.'));},20000);})]);}
   finally{clearTimeout(timer);}
  }
  if(!this.restroomPresentationReady())throw new Error('The restroom model is unavailable. This park was not changed.');
 }
 ensureAtmAssets(){
  if(this.disposed||this.atmAssets)return;
  this.ensureDetailedReflection();
  this.atmAssets=createDetailedFacilityAssets(this.renderer,{reflectionTexture:this.detailedReflectionTarget?.texture??null,atm:true});
  this.atmAssets.readyPromise.then(()=>{
   if(this.disposed)return;
   if(this.atmAssets.error){this.onAssetError?.('Cash machine model could not load: '+this.atmAssets.error);return;}
   if(this.packet&&this.scenery)this.setStatic(this.scenery,this.packet.entry);
  });
 }
 atmPresentationReady(){const status=this.atmAssets?.status();return !this.disposed&&status?.ready===true&&!status.error&&!status.disposed;}
 async qualifyAtmPresentation(){
  this.ensureAtmAssets();const assets=this.atmAssets;let timer;
  if(assets&&!assets.status().disposed&&!assets.error&&!assets.ready){
   try{await Promise.race([assets.readyPromise,new Promise((resolve,reject)=>{timer=setTimeout(()=>{assets.dispose();reject(new Error('The cash machine model did not load in time.'));},20000);})]);}
   finally{clearTimeout(timer);}
  }
  if(!this.atmPresentationReady())throw new Error('The cash machine model is unavailable. This park was not changed.');
 }
 presentationReady(p){
  const family=presentationFamily(p);if(this.disposed||family===null)return false;
  if(family==='procedural')return true;
  const status=this[family+'Assets']?.status();return status?.ready===true&&!status.error&&!status.disposed;
 }
 async qualifyPresentation(p){
  const family=presentationFamily(p);
  if(this.disposed||family===null)throw new Error('This presentation is unavailable. This park was not changed.');
  if(family==='procedural')return;
  if(family==='flume')this.ensureFlumeAssets();
  else if(family==='food'||family==='drink')this.ensureDetailedFacilityAssets(family);
  else if(family==='information')this.ensureInformationAssets();
  else if(family==='restroom')this.ensureRestroomAssets();
  else if(family==='atm')this.ensureAtmAssets();
  const owner=family+'Assets',assets=this[owner],label={wooden:'Wooden ride',carousel:'Carousel',flume:'Log Flume',food:'Burger',drink:'Soft drink',information:'Information kiosk',restroom:'Restroom',atm:'Cash machine'}[family];let timer;
  const status=assets?.status();
  if(status&&!status.disposed&&!status.error&&!status.ready){
   try{await Promise.race([assets.readyPromise,new Promise((resolve,reject)=>{timer=setTimeout(()=>{assets.dispose();reject(new Error(label+' model did not load in time.'));},20000);})]);}
   finally{clearTimeout(timer);}
  }
  const final=assets?.status();
  if(this.disposed||this[owner]!==assets||!final?.ready||final.error||final.disposed)throw new Error(label+' model is unavailable. This park was not changed.');
 }
 flumeFrames(track,ride){
  const count=ride.channelProfile.pieces[track.piece].motion.samples.length;
  return Array.from({length:count},(_,i)=>{const frame=flumeFrame(track,i/(count-1)),ground=this.surfaceMap.get(`${Math.floor(frame.position.x/4000)},${Math.floor(frame.position.y/4000)}`);if(ground===undefined)throw new Error('Log Flume terrain is missing from the current view.');return{...frame,groundMm:ground*1000};});
 }
 setStatic(scenery,entry){
  if(this.disposed)return;
  this.clearStatic();this.elements=scenery.elements;this.scenery=scenery;this.entry=entry;this.surfaceMap.clear();for(let i=0;i<scenery.surfaces.length;i+=5)this.surfaceMap.set(`${scenery.surfaces[i]},${scenery.surfaces[i+1]}`,scenery.surfaces[i+2]/32*4);
  this.art.packet=this.packet;buildEnvironment(this.art,scenery,entry);
  const elements=new Map(scenery.elements.map(e=>[e.id,e])),terrain={surfaceHeight:(x,y)=>this.surfaceMap.get(`${Math.floor(x)},${Math.floor(y)}`)??null},approaches=new Map();
  for(const portal of scenery.elements)if(portal.kind==='portal'&&this.packet?.rides.some(r=>r.id===portal.ride&&r.presentation.kind==='detailed-log-flume')){const [dx,dy]=[[1,0],[0,1],[-1,0],[0,-1]][portal.direction],key=`${portal.tile.x-dx},${portal.tile.y-dy},${portal.height}`,list=approaches.get(key)??[];list.push(portal);approaches.set(key,list);}
  for(const e of scenery.elements){const group=new THREE.Group();group.userData.selection={kind:'element',id:e.id};this.staticGroup.add(group);
   const ride=(e.kind==='track'||e.kind==='portal')?this.packet?.rides.find(r=>r.id===e.ride):null,wooden=ride?.presentation.kind==='detailed-wooden-coaster',carousel=ride?.presentation.kind==='detailed-carousel',flume=ride?.presentation.kind==='detailed-log-flume';
   if(e.kind==='track'){if(flume){if(this.flumeAssets?.ready){const portal=scenery.elements.find(p=>p.kind==='portal'&&p.ride===e.ride&&p.station===e.id),ground=portal?terrain.surfaceHeight(portal.tile.x,portal.tile.y):null;if(portal&&ground===null)throw new Error('Log Flume shared terrain is missing.');buildFlumeChannel(this.art,group,e,this.flumeFrames(e,ride),this.flumeAssets.channelMaterials,portal?{portal,sharedGroundMm:ground*1000}:null,terrain);}}else if(wooden){if(this.woodenAssets.ready)buildWoodenTrack(this.art,group,e,ride,scenery,this.woodenAssets);}else buildTrack(this.art,group,e,steelRules,scenery);}
   else if(e.kind==='path'){buildPath(this.art,group,e,scenery);for(const portal of approaches.get(`${e.tile.x},${e.tile.y},${e.height}`)??[])buildFlumeApproach(this.art,group,e,portal,elements,this.packet.rides.find(r=>r.id===portal.ride));}
   else if(e.kind==='portal'){if(flume){const station=elements.get(e.station);if(this.flumeAssets?.ready&&station?.kind==='track'&&station.ride===e.ride&&station.piece==='station')createFlumePortal(this.art,group,e,station,this.flumeFrames(station,ride),this.flumeAssets.channelMaterials);}else if(carousel){if(this.carouselAssets.ready)buildCarouselPortal(this.art,group,e,ride,this.carouselAssets);}else if(wooden){if(this.woodenAssets.ready)buildWoodenPortal(this.art,group,e,ride,scenery,this.woodenAssets);}else buildPortal(this.art,group,e,ride);}
   else if(e.kind==='facility'){
    const facility=this.packet?.facilities.find(f=>f.id===e.facility);
    if(facility?.presentation.kind==='detailed-facility'){
     group.userData.detailedFacility=true;
     const assets=facility.kind==='atm'?this.atmAssets:facility.kind==='information'?this.informationAssets:facility.restroom?this.restroomAssets:facility.kind==='food'&&facility.product?.id==='independent.burger'?this.foodAssets:facility.kind==='drink'&&facility.product?.id==='independent.soft-drink'?this.drinkAssets:null;
     if(assets?.ready){const model=assets.cloneFacility(facility);model.position.set(e.tile.x*4+2,e.height/8,e.tile.y*4+2);model.rotation.y=Math.PI/2-e.direction*Math.PI/2;group.add(model);}
    }else buildFacility(this.art,group,e,facility);
   }
   else if(e.kind==='amenity')buildAmenity(this.art,group,e,{...this.packet?.amenities.find(a=>a.id===e.id),capacity:steelRules.housekeeping.binCapacity});
   else if(e.kind==='scenery')buildScenery(this.art,group,e);
   if(carousel&&this.carouselAssets.ready)group.traverse(object=>{if(object.isMesh)object.customDepthMaterial=this.carouselAssets.depthMaterial(object.material);});
   if(wooden&&this.woodenAssets.ready)group.traverse(object=>{if(object.isMesh)object.customDepthMaterial=this.woodenAssets.depthMaterial(object.material);});
   if(flume&&this.flumeAssets?.ready)group.traverse(object=>{if(object.isMesh)object.customDepthMaterial=this.flumeAssets.depthMaterial(object.material);});
   if(['facility','portal','scenery'].includes(e.kind)&&!wooden&&!carousel&&!flume&&!group.userData.detailedTree&&!group.userData.detailedFacility)fitModel(group,{x:e.tile.x*4+2,z:e.tile.y*4+2,low:e.height/8,height:e.kind==='scenery'?steelRules.scenery[e.sceneryType].height/8:2});
  }
  batchStatic(this.staticGroup);this.renderer.shadowMap.needsUpdate=true;
 }
 update(packet){
  if(this.disposed)return;
  if(packet.protocolVersion!==WORKER_PROTOCOL_VERSION||packet.contentVersion!==CONTENT_VERSION)throw new Error('Unsupported park presentation version.');
  for(const ride of packet.rides)if(!(ride.presentation.kind==='procedural-coaster'&&ride.presentation.profileId==='classic-candidate-v1'||ride.presentation.kind==='detailed-wooden-coaster'&&(ride.presentation.profileId==='detailed-wooden-candidate-v1'&&ride.trackProfile?.vehicle?.kind==='coupled-flat'||ride.presentation.profileId==='detailed-wooden-rise-return-v2'&&ride.trackProfile?.vehicle?.kind==='coupled-unbanked')||ride.presentation.kind==='detailed-carousel'&&ride.presentation.profileId==='detailed-carousel-candidate-v1'&&Number.isSafeInteger(ride.body)||ride.presentation.kind==='detailed-log-flume'&&ride.presentation.profileId==='detailed-log-flume-candidate-v1'&&ride.channelProfile&&ride.capacity===4))throw new Error('This ride has no supported presentation.');
  for(const car of packet.cars){const ride=packet.rides.find(ride=>ride.id===car.ride);if(ride?.presentation.kind==='detailed-wooden-coaster'){const expected=ride.trackProfile.vehicle.kind==='coupled-unbanked'?'wooden-coupled-unbanked':'wooden-coupled-flat';if(car.rig?.kind!==expected)throw new Error('Wooden vehicle rig differs from its presentation.');}else if(car.rig!==null)throw new Error('This vehicle has no supported rig.');}
  for(const facility of packet.facilities){
   const p=facility.presentation,legacy=facility.kind!=='atm'&&p.kind==='procedural-facility'&&p.profileId==='classic-candidate-v1'&&p.service===facility.kind,detailed=p.kind==='detailed-facility'&&p.profileId==='detailed-consumable-stalls-v1'&&p.service===facility.kind&&typeof facility.open==='boolean'&&(facility.kind==='food'&&facility.product?.id==='independent.burger'||facility.kind==='drink'&&facility.product?.id==='independent.soft-drink');
   const information=p.kind==='detailed-facility'&&p.profileId==='detailed-information-kiosk-v1'&&p.service==='information'&&facility.kind==='information'&&typeof facility.open==='boolean'&&facility.products&&Object.keys(facility.products).length===2&&['independent.map','independent.umbrella'].every(id=>Number.isSafeInteger(facility.products[id]?.price));
   const restroom=p.kind==='detailed-facility'&&p.profileId==='detailed-gradual-restroom-v1'&&p.service==='restroom'&&facility.kind==='restroom'&&facility.product===null&&typeof facility.open==='boolean'&&facility.restroom;
   const atm=p.kind==='detailed-facility'&&p.profileId==='detailed-atm-v1'&&p.service==='atm'&&facility.kind==='atm'&&typeof facility.open==='boolean'&&Number.isSafeInteger(facility.withdrawals)&&facility.withdrawals>=0&&Number.isSafeInteger(facility.cashDispensed)&&facility.cashDispensed===facility.withdrawals*500&&Number.isSafeInteger(facility.using)&&facility.using>=0&&Array.isArray(facility.guestIds)&&facility.guestIds.length===facility.using;
   if(!legacy&&!detailed&&!information&&!restroom&&!atm)throw new Error('This facility has no supported presentation.');
  }
  if(packet.coordinates.metresPerTile!==steelRules.motion.tileMetres)throw new Error('Unsupported park coordinate profile.');
  const frameOverview=!this.packet||this.overviewPending;this.packet=packet;this.art.packet=packet;if(frameOverview){this.overview();this.overviewPending=false;}
  if(packet.rides.some(ride=>ride.presentation.kind==='detailed-log-flume'))this.ensureFlumeAssets();
  if(packet.facilities.some(f=>f.presentation.kind==='detailed-facility'&&f.kind==='food'&&f.product?.id==='independent.burger'))this.ensureDetailedFacilityAssets('food');
  if(packet.facilities.some(f=>f.presentation.kind==='detailed-facility'&&f.kind==='drink'&&f.product?.id==='independent.soft-drink'))this.ensureDetailedFacilityAssets('drink');
  if(packet.facilities.some(f=>f.kind==='information'))this.ensureInformationAssets();
  if(packet.facilities.some(f=>f.restroom))this.ensureRestroomAssets();
  if(packet.facilities.some(f=>f.kind==='atm'))this.ensureAtmAssets();
  const facilities=packet.facilities.map(f=>`${f.id}:${f.open}`).join(','),amenities=packet.amenities.map(a=>`${a.id}:${a.fill}`).join(',');
  if(packet.scenery)this.setStatic(packet.scenery,packet.entry);
  else if(this.scenery&&(facilities!==this.visibleFacilityState||amenities!==this.visibleAmenityState))this.setStatic(this.scenery,packet.entry);
  this.visibleFacilityState=facilities;this.visibleAmenityState=amenities;
  setFlumeWaterTick(this.art,packet.tick);
  this.people.update(packet);this.vehicles.update(packet);
  if(this.woodenAssets.ready)this.woodenVehicles.update(packet);
  this.carousels.update(packet,this.elements??[]);
  this.boats?.update(packet);
  this.waste.update(packet,this.transform,this.litter);this.renderer.shadowMap.needsUpdate=true;
 }
 pointer(event,height){const rect=this.renderer.domElement.getBoundingClientRect();this.mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.mouse,this.camera);const p=this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-height/8),new THREE.Vector3());return p?{x:Math.floor(p.x/4),y:Math.floor(p.z/4)}:null;}
 pick(event){
  const rect=this.renderer.domElement.getBoundingClientRect();this.mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.mouse,this.camera);
  for(const hit of this.ray.intersectObjects([this.staticGroup,this.woodenVehicles.group,this.carousels.group,...(this.boats?[this.boats.group]:[]),...this.people.pickMeshes,...this.vehicles.pickMeshes],true)){
   let visible=true;for(let object=hit.object;object;object=object.parent)if(!object.visible){visible=false;break;}if(!visible)continue;
   for(const dynamic of [this.people,this.vehicles])if(dynamic.pickMeshes.includes(hit.object))return dynamic.selections[hit.instanceId]??null;
   if(hit.object.userData.selections){const selected=hit.object.userData.selections[hit.instanceId];if(selected)return selected;continue;}
   let object=hit.object;while(object){if(object.userData.selection)return object.userData.selection;object=object.parent;}
  }return null;
 }
 preview(cells,ok){this.ghost.clear();this.ghostMaterial.color.set(ok?'#9cdd53':'#d84831');for(const c of cells){const mesh=new THREE.Mesh(this.art.geometry('preview-box',()=>new THREE.BoxGeometry(1,1,1)),this.ghostMaterial);mesh.position.set(c.x*4+2,c.low/8+.12,c.y*4+2);mesh.scale.set(4,.18,4);this.ghost.add(mesh);}}
 highlight(point){this.selection.visible=!!point;if(point)this.selection.position.set(point.x*4+2,point.z/8+.2,point.y*4+2);}
 overview(){this.overviewActive=true;const mixed=!this.packet||this.packet.rides.some(r=>r.presentation.kind==='detailed-wooden-coaster')||this.packet.rides.length>=4;if(mixed){this.controls.target.set(80,4,72);this.camera.position.set(152,64,144);}else{this.controls.target.set(82,4,74);this.camera.position.set(154,64,150);}const availableWidth=this.availableWidth||this.container.clientWidth||960;this.camera.zoom=Math.max(this.controls.minZoom,1.18*Math.min(1,availableWidth/960));this.camera.updateProjectionMatrix();}
 requestOverview(){this.overviewPending=true;}
 close(){this.overviewActive=false;this.controls.target.set(87,4.5,50);this.camera.position.set(51,35,86);this.camera.zoom=2.6;this.camera.updateProjectionMatrix();}
 dispose(){this.disposed=true;this.renderer.setAnimationLoop(null);this.resizeObserver.disconnect();this.renderer.domElement.removeEventListener('pointerdown',this.onPointerDown,{capture:true});this.renderer.domElement.removeEventListener('pointermove',this.onPointerMove,{capture:true});this.renderer.domElement.removeEventListener('wheel',this.onWheelStart,{capture:true});this.renderer.domElement.removeEventListener('wheel',this.onWheel);this.controls.dispose();this.clearStatic();this.people.dispose();this.vehicles.dispose();this.woodenVehicles.dispose();this.carousels.dispose();this.boats?.dispose();this.litter.dispose();this.waste?.dispose();this.ghostMaterial.dispose();this.selection.geometry.dispose();this.selection.material.dispose();this.treeAssets.dispose();this.surfaceAssets.dispose();this.woodenAssets.dispose();this.carouselAssets.dispose();this.flumeAssets?.dispose();this.foodAssets?.dispose();this.drinkAssets?.dispose();this.informationAssets?.dispose();this.restroomAssets?.dispose();this.atmAssets?.dispose();this.detailedReflectionTarget?.dispose();this.detailedReflectionTarget=null;this.art.surfacePalette=null;this.art.dispose();this.renderer.dispose();}
}
