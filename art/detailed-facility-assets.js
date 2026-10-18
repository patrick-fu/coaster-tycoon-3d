import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/loaders/GLTFLoader.js';
import {balloonColour} from '../balloon-colours.js';

export function createDetailedFacilityAssets(renderer, {reflectionTexture = null, information = false, restroom = false, atm = false, balloon = false, product: selectedProduct} = {}) {
  if([information,restroom,atm,balloon].filter(Boolean).length>1)throw new Error('Choose one detailed facility asset family.');
  if(selectedProduct!==undefined&&!['burger','soft-drink'].includes(selectedProduct))throw new Error('Detailed stall product must be burger or soft-drink.');
  if(selectedProduct!==undefined&&(information||restroom||atm||balloon))throw new Error('A detailed stall product cannot select another facility asset family.');
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const releasedTextures = new WeakSet();
  const bitmaps = new Set();
  const templates = new Map();
  const depths = new Map();
  const abort = new AbortController();
  let disposed = false;

  const assets = {
    ready: false,
    error: null
  };

  const ownTexture = texture => {
    if (!texture || texture === reflectionTexture || releasedTextures.has(texture)) return;
    textures.add(texture);
    if (typeof ImageBitmap !== 'undefined') {
      if (texture.source?.data instanceof ImageBitmap) {
        bitmaps.add(texture.source.data);
      } else if (texture.image instanceof ImageBitmap) {
        bitmaps.add(texture.image);
      }
    }
    if (disposed || assets.error) release();
  };

  const ownMaterial = material => {
    if (!material) return;
    materials.add(material);
    for (const value of Object.values(material)) {
      if (value?.isTexture) ownTexture(value);
    }
    if (disposed || assets.error) release();
  };

  const own = root => {
    root.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of [].concat(object.material ?? [])) {
        ownMaterial(material);
      }
      if (object.customDepthMaterial) {
        materials.add(object.customDepthMaterial);
      }
    });
    if (disposed || assets.error) release();
  };

  const release = () => {
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) {
      releasedTextures.add(texture);
      texture.dispose();
      texture.image = null;
      if (texture.source) texture.source.data = null;
    }
    for (const bitmap of bitmaps) {
      if (typeof bitmap?.close === 'function') bitmap.close();
    }
    geometries.clear();
    materials.clear();
    textures.clear();
    bitmaps.clear();
    templates.clear();
    depths.clear();
  };

  const INFORMATION_ANCHORS = {
    GroundRoot: [0, 0, 0],
    Counter_Front: [0, .88, 1.52],
    Counter_Back: [0, .88, -1.52],
    Counter_Left: [-1.52, .88, 0],
    Counter_Right: [1.52, .88, 0],
    Sign_Front: [0, 2.33, 1.73],
    PropMap: [.30, .88, 1.40],
    PropUmbrella: [-1.64, .22, 1.64]
  };
  const RESTROOM_ANCHORS = {GroundRoot:[0,0,0],Entrance_Front:[0,0,.49],Service_Interior:[0,.08,0],Sign_Front:[0,.57,.465]};
  const ATM_ANCHORS={GroundRoot:[0,0,0],Counter_Front:[0,.35,.48],Sign_Front:[0,.66,.44]};
  const BALLOON_ANCHORS={GroundRoot:[0,0,0],CounterFront:[0,1,1.50],ProductSign:[0,2.42,1.65],MenuPanel:[-1.10,1.75,1.66],OpenShutter:[0,0,0],ClosedShutter:[0,0,0]};
  const REQUIRED_ANCHORS = balloon ? Object.keys(BALLOON_ANCHORS) : atm ? Object.keys(ATM_ANCHORS) : restroom ? Object.keys(RESTROOM_ANCHORS) : information ? Object.keys(INFORMATION_ANCHORS) : [
    'OpenShutter',
    'ClosedShutter',
    'GroundRoot',
    'CounterFront',
    'ProductSign',
    'MenuPanel'
  ];

  const objectURLs = new Set();
  const manager = new THREE.LoadingManager();
  manager.setURLModifier(url => {
    if (url.startsWith('blob:')) objectURLs.add(url);
    return url;
  });
  // GLTFLoader revokes embedded image URLs only after successful decoding.
  manager.onError = url => {
    if (objectURLs.delete(url)) URL.revokeObjectURL(url);
  };
  const loader = new GLTFLoader(manager);
  loader.register(parser => ({
    name: 'ParkDetailedFacilityAssetOwnership',
    loadMesh: async index => {
      const mesh = await parser.loadMesh(index);
      own(mesh);
      if (disposed || assets.error) release();
      return mesh;
    },
    beforeRoot: async () => {
      const nodes = parser.json.nodes ?? [];
      const anchorCounts = new Map(REQUIRED_ANCHORS.map(name => [name, 0]));
      for (const node of nodes) {
        if (typeof node?.name === 'string' && anchorCounts.has(node.name)) {
          anchorCounts.set(node.name, anchorCounts.get(node.name) + 1);
        }
      }
      for (const [name, count] of anchorCounts.entries()) {
        if (count !== 1) {
          throw new Error(`Detailed facility glTF node definition requires exactly one '${name}', found ${count}.`);
        }
      }

      const dependencies = await Promise.allSettled([
        ...Array.from({ length: parser.json.textures?.length ?? 0 }, (_, i) =>
          parser.getDependency('texture', i).then(texture => {
            if (!texture) throw new Error('Detailed facility texture could not decode.');
            ownTexture(texture);
          })
        ),
        ...Array.from({ length: parser.json.materials?.length ?? 0 }, (_, i) =>
          parser.getDependency('material', i).then(ownMaterial)
        )
      ]);
      if (disposed) {
        release();
        throw new Error('Detailed facility asset loading was cancelled.');
      }
      const failure = dependencies.find(r => r.status === 'rejected');
      if (failure) throw failure.reason;
    }
  }));

  function checkUnitTransform(obj, kind, name) {
    if (
      !Number.isFinite(obj.position.x) ||
      !Number.isFinite(obj.position.y) ||
      !Number.isFinite(obj.position.z) ||
      !Number.isFinite(obj.scale.x) ||
      !Number.isFinite(obj.scale.y) ||
      !Number.isFinite(obj.scale.z) ||
      !Number.isFinite(obj.quaternion.x) ||
      !Number.isFinite(obj.quaternion.y) ||
      !Number.isFinite(obj.quaternion.z) ||
      !Number.isFinite(obj.quaternion.w)
    ) {
      throw new Error(`Detailed facility ${kind} ${name} contains non-finite transform components.`);
    }

    const quatLen = Math.hypot(obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w);
    if (Math.abs(quatLen - 1) > 1e-6) {
      throw new Error(`Detailed facility ${kind} ${name} quaternion length is not unit: length=${quatLen}.`);
    }

    const posDist = Math.hypot(obj.position.x, obj.position.y, obj.position.z);
    if (posDist > 1e-6) {
      throw new Error(`Detailed facility ${kind} ${name} origin is not unit: distance=${posDist}.`);
    }

    const scaleDiff = Math.max(
      Math.abs(obj.scale.x - 1),
      Math.abs(obj.scale.y - 1),
      Math.abs(obj.scale.z - 1)
    );
    if (scaleDiff > 1e-6) {
      throw new Error(`Detailed facility ${kind} ${name} scale is not unit: diff=${scaleDiff}.`);
    }
  }

  function checkWorldUnitFrame(obj, kind, name) {
    const m = obj.matrixWorld?.elements;
    if (!m || m.length !== 16) {
      throw new Error(`Detailed facility ${kind} ${name} missing matrixWorld elements.`);
    }
    for (let i = 0; i < 16; i++) {
      if (!Number.isFinite(m[i])) {
        throw new Error(`Detailed facility ${kind} ${name} world matrix contains non-finite element at index ${i}.`);
      }
    }

    const posDist = Math.hypot(m[12], m[13], m[14]);
    if (posDist > 1e-6) {
      throw new Error(`Detailed facility ${kind} ${name} effective world origin is not 0: distance=${posDist}.`);
    }

    const len0 = Math.hypot(m[0], m[1], m[2]);
    const len1 = Math.hypot(m[4], m[5], m[6]);
    const len2 = Math.hypot(m[8], m[9], m[10]);
    if (Math.abs(len0 - 1) > 1e-6 || Math.abs(len1 - 1) > 1e-6 || Math.abs(len2 - 1) > 1e-6) {
      throw new Error(`Detailed facility ${kind} ${name} effective world scale is not unit: lengths=(${len0}, ${len1}, ${len2}).`);
    }

    const dot01 = m[0] * m[4] + m[1] * m[5] + m[2] * m[6];
    const dot02 = m[0] * m[8] + m[1] * m[9] + m[2] * m[10];
    const dot12 = m[4] * m[8] + m[5] * m[9] + m[6] * m[10];
    if (Math.abs(dot01) > 1e-6 || Math.abs(dot02) > 1e-6 || Math.abs(dot12) > 1e-6) {
      throw new Error(`Detailed facility ${kind} ${name} world frame has shear: dots=(${dot01}, ${dot02}, ${dot12}).`);
    }

    const det = m[0] * (m[5] * m[10] - m[6] * m[9]) - m[4] * (m[1] * m[10] - m[2] * m[9]) + m[8] * (m[1] * m[6] - m[2] * m[5]);
    if (Math.abs(det - 1) > 1e-6) {
      throw new Error(`Detailed facility ${kind} ${name} world frame determinant is not 1: det=${det}.`);
    }


  }

  async function loadModel(kind) {
    const url = new URL(balloon ? '../models/balloons/balloon-stall.glb' : atm ? '../models/atm/atm.glb' : restroom ? '../models/restroom/restroom.glb' : information ? '../models/information/information-kiosk.glb' : `../models/detailed-stalls/${kind}.glb`, import.meta.url).href;
    const response = await fetch(url, { signal: abort.signal });
    if (!response.ok) {
      throw new Error(`Detailed facility ${kind} model returned HTTP ${response.status}.`);
    }
    const gltf = await loader.parseAsync(await response.arrayBuffer(), new URL('.', url).href);
    own(gltf.scene);
    if (disposed) {
      release();
      return;
    }

    checkUnitTransform(gltf.scene, kind, 'scene');

    const runtimeAnchorCounts = new Map(REQUIRED_ANCHORS.map(name => [name, 0]));
    gltf.scene.traverse(object => {
      if (runtimeAnchorCounts.has(object.name)) {
        runtimeAnchorCounts.set(object.name, runtimeAnchorCounts.get(object.name) + 1);
      }
    });
    for (const [name, count] of runtimeAnchorCounts.entries()) {
      if (count !== 1) {
        throw new Error(`Detailed facility ${kind} runtime scene requires exactly one '${name}', found ${count}.`);
      }
    }

    const groundRoot = gltf.scene.getObjectByName('GroundRoot');
    checkUnitTransform(groundRoot, kind, 'GroundRoot');
    if (information||restroom||atm||balloon) {
      gltf.scene.updateMatrixWorld(true);
      for (const [name, expected] of Object.entries(balloon?BALLOON_ANCHORS:atm?ATM_ANCHORS:restroom?RESTROOM_ANCHORS:INFORMATION_ANCHORS)) {
        const anchor = gltf.scene.getObjectByName(name), point = anchor.getWorldPosition(new THREE.Vector3());
        if (point.toArray().some((value, i) => !Number.isFinite(value) || Math.abs(value - expected[i]) > 1e-4)) {
          throw new Error(`Detailed facility anchor '${name}' does not match its authored counter frame.`);
        }
      }
    }

    const maxAnisotropy = renderer?.capabilities?.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;

    gltf.scene.traverse(object => {
      if (object.isPoints || object.isLine || (object.geometry && !object.isMesh)) {
        throw new Error(`Detailed facility ${kind} contains incompatible non-Mesh primitive: ${object.type ?? 'non-Mesh'}.`);
      }
      if (!object.isMesh) return;
      if (object.isSkinnedMesh || Array.isArray(object.material)) {
        throw new Error(`Detailed facility ${kind} requires static single-material primitives.`);
      }
      if (!object.material) {
        throw new Error(`Detailed facility ${kind} mesh is missing material.`);
      }
      if (!object.geometry || !object.geometry.attributes?.position || object.geometry.attributes.position.count === 0) {
        throw new Error(`Detailed facility ${kind} contains malformed geometry.`);
      }

      object.castShadow = true;
      object.receiveShadow = true;
      const material = object.material;
      for (const value of Object.values(material)) {
        if (value?.isTexture && value !== reflectionTexture) {
          value.anisotropy = Math.min(4, maxAnisotropy);
        }
      }

      if (reflectionTexture && (material.name === 'metal' || material.name === 'brass')) {
        material.envMap = reflectionTexture;
        material.envMapIntensity = .35;
        material.needsUpdate = true;
      }

      if (!depths.has(material)) {
        const depth = new THREE.MeshDepthMaterial({
          depthPacking: THREE.RGBADepthPacking,
          side: material.side,
          map: material.map,
          alphaMap: material.alphaMap,
          alphaTest: material.alphaTest
        });
        depths.set(material, depth);
        materials.add(depth);
      }
      object.customDepthMaterial = depths.get(material);
    });

    gltf.scene.updateMatrixWorld(true);

    checkWorldUnitFrame(gltf.scene, kind, 'scene');
    checkWorldUnitFrame(groundRoot, kind, 'GroundRoot');

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let totalVertices = 0, normalizedTriangles=0, normalizedPrimitives=0;
    const normalizedMaterials=new Set();
    const v = new THREE.Vector3();

    gltf.scene.traverse(object => {
      const elements = object.matrixWorld?.elements;
      if (elements) {
        for (let i = 0; i < 16; i++) {
          if (!Number.isFinite(elements[i])) {
            throw new Error(`Detailed facility ${kind} contains non-finite matrixWorld component.`);
          }
        }
      }

      if (object.isPoints || object.isLine || (object.geometry && !object.isMesh)) {
        throw new Error(`Detailed facility ${kind} contains incompatible non-Mesh primitive: ${object.type ?? 'non-Mesh'}.`);
      }
      if (!object.isMesh) return;

      const pos = object.geometry?.attributes?.position;
      if (!pos || typeof pos.count !== 'number' || pos.count === 0) {
        throw new Error(`Detailed facility ${kind} contains malformed geometry.`);
      }

      if(restroom||atm||balloon){
        const normal=object.geometry.attributes.normal,uv=object.geometry.attributes.uv,indices=object.geometry.index;
        if(!normal||!uv||normal.count!==pos.count||uv.count!==pos.count)throw new Error((atm?'ATM':balloon?'Balloon stall':'Restroom')+' geometry needs complete normals and UVs.');
        for(let i=0;i<pos.count;i++)if(!Number.isFinite(normal.getX(i))||!Number.isFinite(normal.getY(i))||!Number.isFinite(normal.getZ(i))||!Number.isFinite(uv.getX(i))||!Number.isFinite(uv.getY(i)))throw new Error((atm?'ATM':balloon?'Balloon stall':'Restroom')+' geometry has non-finite normals or UVs.');
        const count=indices?.count??pos.count;if(count%3!==0)throw new Error((atm?'ATM':balloon?'Balloon stall':'Restroom')+' geometry has incomplete triangles.');
        const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
        for(let i=0;i<count;i+=3){
          const ids=[0,1,2].map(j=>indices?indices.getX(i+j):i+j);
          if(ids.some(id=>!Number.isInteger(id)||id<0||id>=pos.count))throw new Error((atm?'ATM':balloon?'Balloon stall':'Restroom')+' triangle index is invalid.');
          a.fromBufferAttribute(pos,ids[0]);b.fromBufferAttribute(pos,ids[1]);c.fromBufferAttribute(pos,ids[2]);
          const area=b.sub(a).cross(c.sub(a)).length();if(!Number.isFinite(area)||area<=2e-12)throw new Error((atm?'ATM':balloon?'Balloon stall':'Restroom')+' geometry has a degenerate triangle.');
        }
        normalizedTriangles+=count/3;normalizedPrimitives++;normalizedMaterials.add(object.material);
        if(balloon)for(let i=0;i<count;i+=3){const ids=[0,1,2].map(j=>indices?indices.getX(i+j):i+j),[a,b,c]=ids.map(id=>[uv.getX(id),uv.getY(id)]);if(Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))<=1e-15)throw new Error('Balloon stall has a degenerate UV triangle.');}
      }

      for (let i = 0; i < pos.count; i++) {
        const rx = pos.getX(i);
        const ry = pos.getY(i);
        const rz = pos.getZ(i);
        if (!Number.isFinite(rx) || !Number.isFinite(ry) || !Number.isFinite(rz)) {
          throw new Error(`Detailed facility ${kind} contains non-finite raw vertex position at index ${i}.`);
        }

        v.set(rx, ry, rz).applyMatrix4(object.matrixWorld);
        if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z)) {
          throw new Error(`Detailed facility ${kind} contains non-finite transformed vertex position at index ${i}.`);
        }

        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
        if (v.z < minZ) minZ = v.z;
        if (v.z > maxZ) maxZ = v.z;
        totalVertices++;
      }
    });

    if (totalVertices === 0) {
      throw new Error(`Detailed facility ${kind} contains no mesh vertices.`);
    }

    if (
      !Number.isFinite(minX) || !Number.isFinite(maxX) ||
      !Number.isFinite(minY) || !Number.isFinite(maxY) ||
      !Number.isFinite(minZ) || !Number.isFinite(maxZ)
    ) {
      throw new Error(`Detailed facility ${kind} computed non-finite bounding envelope.`);
    }

    if((restroom||atm||balloon)&&(normalizedTriangles>(atm?4200:8000)||normalizedMaterials.size>(balloon?10:8)||balloon&&normalizedPrimitives>10))throw new Error((atm?'ATM':balloon?'Balloon stall':'Restroom')+' model exceeds its geometry or material budget.');
    const horizontal=restroom||atm ? .49 : balloon ? 1.90 : 1.95, vertical=restroom||atm ? .90 : balloon ? 3.80 : 3.85;
    const TOLERANCE = 1e-6;
    if (
      minX < -horizontal - TOLERANCE ||
      maxX > horizontal + TOLERANCE ||
      minZ < -horizontal - TOLERANCE ||
      maxZ > horizontal + TOLERANCE ||
      minY < -TOLERANCE ||
      maxY > vertical + TOLERANCE
    ) {
      throw new Error(
        `Detailed facility ${kind} geometry exceeds authored bounds [±${horizontal} X/Z, Y in [0, ${vertical}]]: ` +
        `min=(${minX.toFixed(6)}, ${minY.toFixed(6)}, ${minZ.toFixed(6)}), ` +
        `max=(${maxX.toFixed(6)}, ${maxY.toFixed(6)}, ${maxZ.toFixed(6)}).`
      );
    }

    templates.set(kind, gltf.scene);
  }

  assets.readyPromise = Promise.allSettled((balloon ? ['balloon-stall'] : atm ? ['atm'] : restroom ? ['restroom'] : information ? ['information-kiosk'] : selectedProduct === undefined ? ['burger', 'soft-drink'] : [selectedProduct]).map(loadModel)).then(results => {
    objectURLs.clear();
    const failure = results.find(result => result.status === 'rejected');
    if (disposed || failure) {
      release();
      if (!disposed) {
        assets.error = String(failure.reason?.message ?? failure.reason);
      }
      return;
    }
    assets.ready = true;
  });

  const cloneFacility = facility => {
    if (disposed || !assets.ready) {
      throw new Error('Detailed facility assets are unavailable.');
    }

    if (!facility || typeof facility !== 'object') {
      throw new Error('Detailed facility requires an actual projected facility object.');
    }

    if (typeof facility.open !== 'boolean') {
      throw new Error('Detailed facility requires open to be a boolean.');
    }

    const kind = facility.kind;
    if (balloon ? kind !== 'balloon' : atm ? kind !== 'atm' : restroom ? kind !== 'restroom' : information ? kind !== 'information' : kind !== 'food' && kind !== 'drink') {
      throw new Error(`Detailed facility requires kind to be 'food' or 'drink', got '${kind}'.`);
    }

    const presentation = facility.presentation;
    if (!presentation || typeof presentation !== 'object') {
      throw new Error('Detailed facility requires presentation object.');
    }

    if (presentation.kind !== 'detailed-facility') {
      throw new Error(`Detailed facility requires presentation.kind to be 'detailed-facility', got '${presentation.kind}'.`);
    }

    if (presentation.profileId !== (balloon ? 'detailed-balloon-stall-v1' : atm ? 'detailed-atm-v1' : restroom ? 'detailed-gradual-restroom-v1' : information ? 'detailed-information-kiosk-v1' : 'detailed-consumable-stalls-v1')) {
      throw new Error(`Detailed facility requires presentation.profileId to be 'detailed-consumable-stalls-v1', got '${presentation.profileId}'.`);
    }

    if (presentation.service !== kind) {
      throw new Error(`Detailed facility requires presentation.service '${presentation.service}' to match kind '${kind}'.`);
    }

    let templateKey;
    if (balloon) {
      if(facility.product?.id!=='independent.balloon')throw new Error('Balloon stall requires its actual projected product.');
      balloonColour(facility.balloonColour);templateKey='balloon-stall';
    } else if (atm) {
      if(!Number.isSafeInteger(facility.withdrawals)||facility.withdrawals<0||!Number.isSafeInteger(facility.cashDispensed)||facility.cashDispensed!==facility.withdrawals*500||!Number.isSafeInteger(facility.using)||facility.using<0||!Array.isArray(facility.guestIds)||facility.guestIds.length!==facility.using||new Set(facility.guestIds).size!==facility.using||facility.guestIds.some(id=>!Number.isSafeInteger(id)||id<1)||['price','income','sales','products','product'].some(key=>Object.hasOwn(facility,key)))throw new Error('ATM requires its actual projected withdrawals and public-counter owners.');
      templateKey='atm';
    } else if (restroom) {
      const visit=facility.restroom;
      if(facility.product!==null||!visit||!Number.isSafeInteger(visit.using)||visit.using<0||!Number.isSafeInteger(visit.exiting)||visit.exiting<0||!Array.isArray(visit.guestIds)||visit.guestIds.length!==visit.using+visit.exiting)throw new Error((atm?'ATM':balloon?'Balloon stall':'Restroom')+' requires its actual projected service ownership.');
      templateKey='restroom';
    } else if (information) {
      const products = facility.products;
      if (!products || Object.keys(products).length !== 2 || !['independent.map', 'independent.umbrella'].every(id => products[id] && Number.isSafeInteger(products[id].price))) {
        throw new Error('Information kiosk requires both projected merchandise products.');
      }
      templateKey = 'information-kiosk';
    } else {
      const product = facility.product;
      if (!product || typeof product !== 'object') {
        throw new Error('Detailed facility requires product object.');
      }

      if (kind === 'food') {
        if (product.id !== 'independent.burger') {
          throw new Error(`Detailed facility food requires product.id 'independent.burger', got '${product.id}'.`);
        }
        templateKey = 'burger';
      } else {
        if (product.id !== 'independent.soft-drink') {
          throw new Error(`Detailed facility drink requires product.id 'independent.soft-drink', got '${product.id}'.`);
        }
        templateKey = 'soft-drink';
      }
    }

    if(selectedProduct!==undefined&&templateKey!==selectedProduct)throw new Error(`Detailed stall assets select '${selectedProduct}', not '${templateKey}'.`);
    const template = templates.get(templateKey);
    if (!template) {
      throw new Error(`Detailed facility template '${templateKey}' is unavailable.`);
    }

    const model = template.clone(true);
    // The authoring unit tile maps uniformly to the receiving four-metre tile.
    if(restroom||atm)model.scale.setScalar(4);

    model.traverse(object => {
      if (object.isMesh) {
        object.customDepthMaterial = depths.get(object.material);
      }
    });

    const isOpen = facility.open;
    const openShutter = model.getObjectByName('OpenShutter');
    const closedShutter = model.getObjectByName('ClosedShutter');

    if (openShutter) {
      openShutter.visible = isOpen;
      openShutter.traverse(child => {
        child.visible = isOpen;
      });
    }

    if (closedShutter) {
      closedShutter.visible = !isOpen;
      closedShutter.traverse(child => {
        child.visible = !isOpen;
      });
    }

    return model;
  };

  assets.cloneFacility = cloneFacility;
  assets.depthMaterial = material => depths.get(material);
  assets.status = () => ({
    ready: assets.ready,
    error: assets.error,
    disposed,
    geometries: geometries.size,
    materials: materials.size,
    textures: textures.size,
    bitmaps: bitmaps.size
  });
  assets.dispose = () => {
    if (disposed) return;
    disposed = true;
    assets.ready = false;
    abort.abort();
    release();
  };

  return assets;
}
