import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/loaders/GLTFLoader.js';

export function createDetailedFacilityAssets(renderer, {reflectionTexture = null} = {}) {
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

  const REQUIRED_ANCHORS = [
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
    const url = new URL(`../models/detailed-stalls/${kind}.glb`, import.meta.url).href;
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
    let totalVertices = 0;
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

    const TOLERANCE = 1e-6;
    if (
      minX < -1.95 - TOLERANCE ||
      maxX > 1.95 + TOLERANCE ||
      minZ < -1.95 - TOLERANCE ||
      maxZ > 1.95 + TOLERANCE ||
      minY < -TOLERANCE ||
      maxY > 3.85 + TOLERANCE
    ) {
      throw new Error(
        `Detailed facility ${kind} geometry exceeds bounds [±1.95m X/Z, Y in [0, 3.85]]: ` +
        `min=(${minX.toFixed(6)}, ${minY.toFixed(6)}, ${minZ.toFixed(6)}), ` +
        `max=(${maxX.toFixed(6)}, ${maxY.toFixed(6)}, ${maxZ.toFixed(6)}).`
      );
    }

    templates.set(kind, gltf.scene);
  }

  assets.readyPromise = Promise.allSettled(['burger', 'soft-drink'].map(loadModel)).then(results => {
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
    if (kind !== 'food' && kind !== 'drink') {
      throw new Error(`Detailed facility requires kind to be 'food' or 'drink', got '${kind}'.`);
    }

    const presentation = facility.presentation;
    if (!presentation || typeof presentation !== 'object') {
      throw new Error('Detailed facility requires presentation object.');
    }

    if (presentation.kind !== 'detailed-facility') {
      throw new Error(`Detailed facility requires presentation.kind to be 'detailed-facility', got '${presentation.kind}'.`);
    }

    if (presentation.profileId !== 'detailed-consumable-stalls-v1') {
      throw new Error(`Detailed facility requires presentation.profileId to be 'detailed-consumable-stalls-v1', got '${presentation.profileId}'.`);
    }

    if (presentation.service !== kind) {
      throw new Error(`Detailed facility requires presentation.service '${presentation.service}' to match kind '${kind}'.`);
    }

    const product = facility.product;
    if (!product || typeof product !== 'object') {
      throw new Error('Detailed facility requires product object.');
    }

    let templateKey;
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

    const template = templates.get(templateKey);
    if (!template) {
      throw new Error(`Detailed facility template '${templateKey}' is unavailable.`);
    }

    const model = template.clone(true);

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
