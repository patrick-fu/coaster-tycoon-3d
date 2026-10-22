import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/loaders/GLTFLoader.js';
import { balloonColour } from '../balloon-colours.js';

export function balloonInstanceRows(packet, capacity = 10000) {
  if (packet === null) return [];
  const {guestBalloons, people} = packet;
  if (!Array.isArray(guestBalloons) || guestBalloons.length > capacity || !(people instanceof Float64Array || Array.isArray(people)) || people.length % 6 !== 0) throw new Error('Invalid held-balloon projection.');
  const peopleById = new Map();
  for (let i=0; i<people.length; i+=6) {
    const [id,x,z,elevation,phaseIndex,isStaff] = people.subarray ? people.subarray(i,i+6) : people.slice(i,i+6);
    if (!Number.isSafeInteger(id) || id<1 || peopleById.has(id) || ![x,z,elevation].every(Number.isFinite) || !Number.isInteger(phaseIndex) || phaseIndex<0 || phaseIndex>9 || ![0,1].includes(isStaff)) throw new Error('Invalid or duplicate held-balloon person.');
    peopleById.set(id,{x,z,elevation,phaseIndex,isStaff});
  }
  const seen = new Set();
  return guestBalloons.map(balloon => {
    if (!balloon || Array.isArray(balloon) || Object.keys(balloon).sort().join(',')!=='colour,id' || !Number.isSafeInteger(balloon.id) || balloon.id<1 || seen.has(balloon.id)) throw new Error('Invalid or duplicate held-balloon owner.');
    balloonColour(balloon.colour);
    const person = peopleById.get(balloon.id);
    if (!person || person.isStaff!==0 || [2,7,8].includes(person.phaseIndex)) throw new Error('Balloon owner has no matching visible guest.');
    seen.add(balloon.id);
    return {id:balloon.id,colour:balloon.colour,person};
  });
}

export function createHeldBalloonAssets({ capacity = 10000, half = 2 } = {}) {
  if (!Number.isSafeInteger(capacity) || capacity <= 0 || capacity > 10000) {
    throw new Error(`Held balloon capacity must be a positive safe integer <= 10000, got: ${capacity}.`);
  }
  if (!Number.isFinite(half)) {
    throw new Error(`Held balloon half must be a finite number, got: ${half}.`);
  }

  const group = new THREE.Group();
  group.name = 'HeldBalloonAssets';
  group.userData.selections = [];

  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const releasedTextures = new WeakSet();
  const bitmaps = new Set();

  const abort = new AbortController();
  let disposed = false;
  let isReady = false;
  let loadError = null;

  let skinInstancedMesh = null;
  let stringInstancedMesh = null;
  let currentPacket = null;

  const tempMatrix = new THREE.Matrix4();
  const tempColor = new THREE.Color();

  const ownTexture = texture => {
    if (!texture || releasedTextures.has(texture)) return;
    textures.add(texture);
    if (typeof ImageBitmap !== 'undefined') {
      if (texture.source?.data instanceof ImageBitmap) {
        bitmaps.add(texture.source.data);
      } else if (texture.image instanceof ImageBitmap) {
        bitmaps.add(texture.image);
      }
    }
    if (disposed || loadError) release();
  };

  const ownMaterial = material => {
    if (!material) return;
    materials.add(material);
    for (const value of Object.values(material)) {
      if (value?.isTexture) ownTexture(value);
    }
    if (disposed || loadError) release();
  };

  const own = root => {
    if (!root) return;
    root.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of [].concat(object.material ?? [])) {
        ownMaterial(material);
      }
    });
    if (disposed || loadError) release();
  };

  const release = () => {
    if (skinInstancedMesh) {
      group.remove(skinInstancedMesh);
      if (typeof skinInstancedMesh.dispose === 'function') {
        skinInstancedMesh.dispose();
      }
      skinInstancedMesh = null;
    }
    if (stringInstancedMesh) {
      group.remove(stringInstancedMesh);
      if (typeof stringInstancedMesh.dispose === 'function') {
        stringInstancedMesh.dispose();
      }
      stringInstancedMesh = null;
    }
    group.userData.selections = [];

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
  };

  function checkUnitTransform(obj, name) {
    if (!obj) {
      throw new Error(`Held balloon object '${name}' is missing.`);
    }
    const { position, scale, quaternion } = obj;
    if (
      !Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z) ||
      !Number.isFinite(scale.x) || !Number.isFinite(scale.y) || !Number.isFinite(scale.z) ||
      !Number.isFinite(quaternion.x) || !Number.isFinite(quaternion.y) ||
      !Number.isFinite(quaternion.z) || !Number.isFinite(quaternion.w)
    ) {
      throw new Error(`Held balloon '${name}' contains non-finite transform components.`);
    }

    if (Math.abs(quaternion.x)+Math.abs(quaternion.y)+Math.abs(quaternion.z)+Math.abs(quaternion.w-1)>1e-6) throw new Error(`Held balloon '${name}' rotation must be identity.`);
    const quatLen = Math.hypot(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    if (Math.abs(quatLen - 1) > 1e-6) {
      throw new Error(`Held balloon '${name}' quaternion length is not unit: ${quatLen}.`);
    }

    const posDist = Math.hypot(position.x, position.y, position.z);
    if (posDist > 1e-6) {
      throw new Error(`Held balloon '${name}' origin offset is not unit: ${posDist}.`);
    }

    const scaleDiff = Math.max(
      Math.abs(scale.x - 1),
      Math.abs(scale.y - 1),
      Math.abs(scale.z - 1)
    );
    if (scaleDiff > 1e-6) {
      throw new Error(`Held balloon '${name}' scale is not unit: diff=${scaleDiff}.`);
    }
  }

  function checkWorldUnitFrame(obj, name) {
    const m = obj.matrixWorld?.elements;
    if (!m || m.length !== 16) {
      throw new Error(`Held balloon '${name}' missing matrixWorld elements.`);
    }
    for (let i = 0; i < 16; i++) {
      if (!Number.isFinite(m[i])) {
        throw new Error(`Held balloon '${name}' world matrix contains non-finite element at index ${i}.`);
      }
    }

    const posDist = Math.hypot(m[12], m[13], m[14]);
    if (posDist > 1e-6) {
      throw new Error(`Held balloon '${name}' effective world origin distance is not zero: ${posDist}.`);
    }

    const len0 = Math.hypot(m[0], m[1], m[2]);
    const len1 = Math.hypot(m[4], m[5], m[6]);
    const len2 = Math.hypot(m[8], m[9], m[10]);
    if (Math.abs(len0 - 1) > 1e-6 || Math.abs(len1 - 1) > 1e-6 || Math.abs(len2 - 1) > 1e-6) {
      throw new Error(`Held balloon '${name}' effective world scale is not unit: (${len0}, ${len1}, ${len2}).`);
    }

    const dot01 = m[0] * m[4] + m[1] * m[5] + m[2] * m[6];
    const dot02 = m[0] * m[8] + m[1] * m[9] + m[2] * m[10];
    const dot12 = m[4] * m[8] + m[5] * m[9] + m[6] * m[10];
    if (Math.abs(dot01) > 1e-6 || Math.abs(dot02) > 1e-6 || Math.abs(dot12) > 1e-6) {
      throw new Error(`Held balloon '${name}' world frame has shear: (${dot01}, ${dot02}, ${dot12}).`);
    }

    const det = m[0] * (m[5] * m[10] - m[6] * m[9]) -
                m[4] * (m[1] * m[10] - m[2] * m[9]) +
                m[8] * (m[1] * m[6] - m[2] * m[5]);
    if (Math.abs(det - 1) > 1e-6) {
      throw new Error(`Held balloon '${name}' world frame determinant is not 1: ${det}.`);
    }
  }

  function inspectGlbJson(buffer) {
    if (!(buffer instanceof ArrayBuffer)) {
      throw new Error('GLB data must be an ArrayBuffer.');
    }
    if (buffer.byteLength < 20) {
      throw new Error('GLB buffer too small for header and chunk descriptor.');
    }
    const view = new DataView(buffer);
    const magic = view.getUint32(0, true);
    if (magic !== 0x46546C67) {
      throw new Error(`Invalid GLB magic header: 0x${magic.toString(16)}. Expected 0x46546c67.`);
    }
    const version = view.getUint32(4, true);
    if (version !== 2) {
      throw new Error(`Unsupported GLB version: ${version}. Expected 2.`);
    }
    const totalLength = view.getUint32(8, true);
    if (totalLength !== buffer.byteLength) {
      throw new Error(`GLB length header (${totalLength}) does not match buffer byteLength (${buffer.byteLength}).`);
    }

    const chunk0Length = view.getUint32(12, true);
    const chunk0Type = view.getUint32(16, true);
    if (chunk0Type !== 0x4E4F534A) {
      throw new Error(`First GLB chunk is not JSON chunk (0x4E4F534A), got 0x${chunk0Type.toString(16)}.`);
    }
    if (20 + chunk0Length > buffer.byteLength) {
      throw new Error('GLB JSON chunk exceeds buffer bounds.');
    }

    const jsonBytes = new Uint8Array(buffer, 20, chunk0Length);
    const jsonText = new TextDecoder('utf-8').decode(jsonBytes);
    let gltfJson;
    try {
      gltfJson = JSON.parse(jsonText);
    } catch (err) {
      throw new Error(`GLB JSON chunk failed parsing: ${err.message}`);
    }

    if (Array.isArray(gltfJson.images) && gltfJson.images.length > 0) {
      throw new Error('GLB metadata contains unapproved images.');
    }
    if (Array.isArray(gltfJson.textures) && gltfJson.textures.length > 0) {
      throw new Error('GLB metadata contains unapproved textures.');
    }
    if (Array.isArray(gltfJson.skins) && gltfJson.skins.length > 0) {
      throw new Error('GLB metadata contains unapproved skinning.');
    }
    if (Array.isArray(gltfJson.animations) && gltfJson.animations.length > 0) {
      throw new Error('GLB metadata contains unapproved animations.');
    }
    if (Array.isArray(gltfJson.extensionsUsed) && gltfJson.extensionsUsed.length > 0) {
      throw new Error(`GLB metadata contains unapproved extensionsUsed: [${gltfJson.extensionsUsed.join(', ')}].`);
    }
    if (Array.isArray(gltfJson.extensionsRequired) && gltfJson.extensionsRequired.length > 0) {
      throw new Error(`GLB metadata contains unapproved extensionsRequired: [${gltfJson.extensionsRequired.join(', ')}].`);
    }

    if (Array.isArray(gltfJson.buffers)) {
      for (const b of gltfJson.buffers) {
        if (b && b.uri !== undefined) {
          throw new Error(`GLB contains external buffer URI: '${b.uri}'.`);
        }
      }
    }

    if (Array.isArray(gltfJson.nodes)) {
      for (const node of gltfJson.nodes) {
        if (node?.skin !== undefined) {
          throw new Error('GLB node specifies skinning.');
        }
      }
    }

    if (!Array.isArray(gltfJson.materials) || gltfJson.materials.length !== 2) {
      throw new Error(`GLB requires exactly 2 materials, found ${gltfJson.materials?.length ?? 0}.`);
    }
    const materialNames = gltfJson.materials.map(m => m.name);
    if (!materialNames.includes('BalloonSkin') || !materialNames.includes('BalloonString')) {
      throw new Error(`GLB materials must be BalloonSkin and BalloonString, got [${materialNames.join(', ')}].`);
    }
    for (const mat of gltfJson.materials) {
      if (mat.alphaMode && mat.alphaMode !== 'OPAQUE') {
        throw new Error(`GLB material '${mat.name}' has non-OPAQUE alphaMode: ${mat.alphaMode}.`);
      }
      if (mat.transmissionFactor !== undefined || mat.extensions?.KHR_materials_transmission) {
        throw new Error(`GLB material '${mat.name}' specifies unapproved transmission.`);
      }
      const pbr = mat.pbrMetallicRoughness;
      if (pbr?.baseColorTexture || pbr?.metallicRoughnessTexture || mat.normalTexture || mat.occlusionTexture || mat.emissiveTexture) {
        throw new Error(`GLB material '${mat.name}' references texture channels.`);
      }
    }

    const primitiveCount = gltfJson.meshes?.reduce((sum, mesh) => sum + (mesh.primitives?.length ?? 0), 0) ?? 0;
    if (primitiveCount !== 2) {
      throw new Error(`GLB requires exactly 2 primitives total, found ${primitiveCount}.`);
    }
    for (const mesh of gltfJson.meshes ?? []) {
      for (const prim of mesh.primitives ?? []) {
        if (prim.targets || prim.extensions) throw new Error('Held balloon forbids morph targets and primitive extensions.');
      if (prim.mode !== undefined && prim.mode !== 4) {
          throw new Error(`GLB primitive mode must be TRIANGLES (4), found: ${prim.mode}.`);
        }
      }
    }

    return gltfJson;
  }

  function resolveBalloonColor(index, target) { return target.set(balloonColour(index).hex); }

  const objectURLs = new Set();
  const manager = new THREE.LoadingManager();
  manager.setURLModifier(url => {
    if (url.startsWith('blob:')) objectURLs.add(url);
    return url;
  });
  manager.onError = url => {
    if (objectURLs.delete(url)) URL.revokeObjectURL(url);
  };

  const loader = new GLTFLoader(manager);
  loader.register(parser => ({
    name: 'HeldBalloonAssetOwnership',
    loadMesh: async index => {
      const mesh = await parser.loadMesh(index);
      own(mesh);
      if (disposed || loadError) release();
      return mesh;
    },
    loadMaterial: async index => {
      const material = await parser.loadMaterial(index);
      ownMaterial(material);
      if (disposed || loadError) release();
      return material;
    }
  }));

  function validateGeometry(geometry, meshName) {
    const pos = geometry.attributes?.position;
    const normal = geometry.attributes?.normal;
    const uv = geometry.attributes?.uv;
    const indexAttr = geometry.index;

    if (!pos || typeof pos.count !== 'number' || pos.count === 0) {
      throw new Error(`Held balloon '${meshName}' has empty or missing position attribute.`);
    }
    if (!normal || normal.count !== pos.count) {
      throw new Error(`Held balloon '${meshName}' normal count does not match position count.`);
    }
    if (!uv || uv.count !== pos.count) {
      throw new Error(`Held balloon '${meshName}' UV count does not match position count.`);
    }

    for (let i = 0; i < pos.count; i++) {
      if (!Number.isFinite(pos.getX(i)) || !Number.isFinite(pos.getY(i)) || !Number.isFinite(pos.getZ(i))) {
        throw new Error(`Held balloon '${meshName}' has non-finite position at vertex ${i}.`);
      }
      if (!Number.isFinite(normal.getX(i)) || !Number.isFinite(normal.getY(i)) || !Number.isFinite(normal.getZ(i))) {
        throw new Error(`Held balloon '${meshName}' has non-finite normal at vertex ${i}.`);
      }
      if (Math.abs(normal.getX(i)**2+normal.getY(i)**2+normal.getZ(i)**2-1)>.005) throw new Error(`Held balloon '${meshName}' normal is not unit.`);
      if (!Number.isFinite(uv.getX(i)) || !Number.isFinite(uv.getY(i))) {
        throw new Error(`Held balloon '${meshName}' has non-finite UV at vertex ${i}.`);
      }
    }

    const indexCount = indexAttr ? indexAttr.count : pos.count;
    if (indexCount % 3 !== 0) {
      throw new Error(`Held balloon '${meshName}' triangle count is incomplete (indices count: ${indexCount}).`);
    }

    const va = new THREE.Vector3();
    const vb = new THREE.Vector3();
    const vc = new THREE.Vector3();

    for (let i = 0; i < indexCount; i += 3) {
      const i0 = indexAttr ? indexAttr.getX(i) : i;
      const i1 = indexAttr ? indexAttr.getX(i + 1) : i + 1;
      const i2 = indexAttr ? indexAttr.getX(i + 2) : i + 2;

      if (!Number.isInteger(i0) || i0 < 0 || i0 >= pos.count ||
          !Number.isInteger(i1) || i1 < 0 || i1 >= pos.count ||
          !Number.isInteger(i2) || i2 < 0 || i2 >= pos.count) {
        throw new Error(`Held balloon '${meshName}' contains out-of-range index at triangle ${i / 3}.`);
      }

      va.fromBufferAttribute(pos, i0);
      vb.fromBufferAttribute(pos, i1);
      vc.fromBufferAttribute(pos, i2);

      const triArea3d = vb.sub(va).cross(vc.sub(va)).length() * 0.5;
      if (!Number.isFinite(triArea3d) || triArea3d <= 1e-12) {
        throw new Error(`Held balloon '${meshName}' contains degenerate 3D triangle at index ${i / 3}.`);
      }

      const u0 = uv.getX(i0);
      const v0 = uv.getY(i0);
      const u1 = uv.getX(i1);
      const v1 = uv.getY(i1);
      const u2 = uv.getX(i2);
      const v2 = uv.getY(i2);
      const uvArea = Math.abs((u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0)) * 0.5;
      if (!Number.isFinite(uvArea) || uvArea <= 1e-12) {
        throw new Error(`Held balloon '${meshName}' contains degenerate/zero UV triangle area at index ${i / 3}.`);
      }
    }

    return indexCount / 3;
  }

  function validateAndBake(gltf) {
    checkUnitTransform(gltf.scene, 'scene');

    let groundRootCount = 0;
    let handAnchorCount = 0;
    const meshNodes = [];

    gltf.scene.traverse(obj => {
      if (obj.name === 'GroundRoot') groundRootCount++;
      if (obj.name === 'HandAnchor') handAnchorCount++;

      if (obj.isPoints || obj.isLine || (obj.geometry && !obj.isMesh)) {
        throw new Error(`Held balloon contains incompatible primitive: ${obj.type ?? 'non-Mesh'}.`);
      }
      if (obj.isMesh) {
        if (obj.isSkinnedMesh) {
          throw new Error('Held balloon forbids SkinnedMesh primitives.');
        }
        if (Array.isArray(obj.material)) {
          throw new Error('Held balloon forbids multi-material meshes.');
        }
        if (!obj.material) {
          throw new Error(`Held balloon mesh '${obj.name}' is missing material.`);
        }
        meshNodes.push(obj);
      }
    });

    if (groundRootCount !== 1) {
      throw new Error(`Held balloon requires exactly one 'GroundRoot', found ${groundRootCount}.`);
    }
    if (handAnchorCount !== 1) {
      throw new Error(`Held balloon requires exactly one 'HandAnchor', found ${handAnchorCount}.`);
    }
    if (meshNodes.length !== 2) {
      throw new Error(`Held balloon requires exactly two Mesh nodes, found ${meshNodes.length}.`);
    }

    const groundRoot = gltf.scene.getObjectByName('GroundRoot');
    const handAnchor = gltf.scene.getObjectByName('HandAnchor');
    checkUnitTransform(groundRoot, 'GroundRoot');
    checkUnitTransform(handAnchor, 'HandAnchor');

    gltf.scene.updateMatrixWorld(true);
    checkWorldUnitFrame(gltf.scene, 'scene');
    checkWorldUnitFrame(groundRoot, 'GroundRoot');
    checkWorldUnitFrame(handAnchor, 'HandAnchor');

    const skinMesh = gltf.scene.getObjectByName('BalloonSkinMesh');
    const stringMesh = gltf.scene.getObjectByName('BalloonStringMesh');
    if (!skinMesh || !skinMesh.isMesh) {
      throw new Error("Held balloon missing required Mesh node 'BalloonSkinMesh'.");
    }
    if (!stringMesh || !stringMesh.isMesh) {
      throw new Error("Held balloon missing required Mesh node 'BalloonStringMesh'.");
    }

    if (groundRoot.parent !== gltf.scene || handAnchor.parent !== groundRoot || skinMesh.parent !== groundRoot || stringMesh.parent !== groundRoot) throw new Error('Held balloon hierarchy differs from the authored hand frame.');
    for (const mesh of meshNodes) checkUnitTransform(mesh, mesh.name);

    const skinMaterial = skinMesh.material;
    const stringMaterial = stringMesh.material;
    if (skinMaterial.name !== 'BalloonSkin') {
      throw new Error(`BalloonSkinMesh material role must be 'BalloonSkin', got '${skinMaterial.name}'.`);
    }
    if (stringMaterial.name !== 'BalloonString') {
      throw new Error(`BalloonStringMesh material role must be 'BalloonString', got '${stringMaterial.name}'.`);
    }
    if (skinMaterial === stringMaterial) {
      throw new Error('Held balloon requires distinct skin and string materials.');
    }

    for (const [mat, label] of [[skinMaterial, 'Skin'], [stringMaterial, 'String']]) {
      if (mat.transparent || (mat.opacity !== undefined && mat.opacity < 1 - 1e-4)) {
        throw new Error(`Held balloon ${label} material must not use alpha/transparency.`);
      }
      if (mat.transmission !== undefined && mat.transmission > 1e-4) {
        throw new Error(`Held balloon ${label} material must not use transmission.`);
      }
    }

    if (Math.abs((skinMaterial.roughness ?? 0.3) - 0.30) > 0.08) {
      throw new Error(`BalloonSkin roughness must be approximately 0.30, got ${skinMaterial.roughness}.`);
    }
    if ((skinMaterial.metalness ?? 0) > 0.05) {
      throw new Error(`BalloonSkin must be nonmetal, got metalness ${skinMaterial.metalness}.`);
    }
    if (skinMaterial.color) {
      const { r, g, b } = skinMaterial.color;
      if (r < 0.90 || g < 0.90 || b < 0.90) {
        throw new Error(`BalloonSkin base color must be white, got RGB(${r}, ${g}, ${b}).`);
      }
    }
    skinMaterial.roughness = 0.30;
    skinMaterial.metalness = 0.0;
    skinMaterial.color.setRGB(1, 1, 1);

    if (Math.abs((stringMaterial.roughness ?? 0.85) - 0.85) > 0.08) {
      throw new Error(`BalloonString roughness must be approximately 0.85, got ${stringMaterial.roughness}.`);
    }
    if ((stringMaterial.metalness ?? 0) > 0.05) {
      throw new Error(`BalloonString must be nonmetal, got metalness ${stringMaterial.metalness}.`);
    }
    stringMaterial.roughness = 0.85;
    stringMaterial.metalness = 0.0;

    const skinTriangles = validateGeometry(skinMesh.geometry, 'BalloonSkinMesh');
    const stringTriangles = validateGeometry(stringMesh.geometry, 'BalloonStringMesh');
    const totalTriangles = skinTriangles + stringTriangles;
    if (totalTriangles > 1200) {
      throw new Error(`Held balloon triangle count ${totalTriangles} exceeds budget <= 1200.`);
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    const vertex = new THREE.Vector3();

    for (const mesh of [skinMesh, stringMesh]) {
      const pos = mesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        vertex.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mesh.matrixWorld);
        if (vertex.x < minX) minX = vertex.x;
        if (vertex.x > maxX) maxX = vertex.x;
        if (vertex.y < minY) minY = vertex.y;
        if (vertex.y > maxY) maxY = vertex.y;
        if (vertex.z < minZ) minZ = vertex.z;
        if (vertex.z > maxZ) maxZ = vertex.z;
      }
    }

    const TOL = 1e-4;
    if (minX < -0.25 - TOL || maxX > 0.25 + TOL ||
        minZ < -0.25 - TOL || maxZ > 0.25 + TOL ||
        minY < -TOL || maxY > 1.35 + TOL) {
      throw new Error(
        `Held balloon exceeds authored bounds [±0.25 X/Z, Y in [0, 1.35]]: ` +
        `min=(${minX.toFixed(4)}, ${minY.toFixed(4)}, ${minZ.toFixed(4)}), ` +
        `max=(${maxX.toFixed(4)}, ${maxY.toFixed(4)}, ${maxZ.toFixed(4)}).`
      );
    }

    const sharedSkinGeometry = skinMesh.geometry.clone();
    sharedSkinGeometry.applyMatrix4(skinMesh.matrixWorld);
    geometries.add(sharedSkinGeometry);

    const sharedStringGeometry = stringMesh.geometry.clone();
    sharedStringGeometry.applyMatrix4(stringMesh.matrixWorld);
    geometries.add(sharedStringGeometry);

    skinInstancedMesh = new THREE.InstancedMesh(sharedSkinGeometry, skinMaterial, capacity);
    skinInstancedMesh.name = 'HeldBalloonSkinInstanced';
    skinInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    skinInstancedMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    skinInstancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    skinInstancedMesh.count = 0;
    skinInstancedMesh.castShadow = true;
    skinInstancedMesh.receiveShadow = true;
    skinInstancedMesh.userData.selections = [];

    stringInstancedMesh = new THREE.InstancedMesh(sharedStringGeometry, stringMaterial, capacity);
    stringInstancedMesh.name = 'HeldBalloonStringInstanced';
    stringInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    stringInstancedMesh.count = 0;
    stringInstancedMesh.castShadow = true;
    stringInstancedMesh.receiveShadow = true;
    stringInstancedMesh.userData.selections = [];

    group.add(skinInstancedMesh);
    group.add(stringInstancedMesh);
  }

  async function loadModel() {
    const url = new URL('../models/balloons/held-balloon.glb', import.meta.url).href;
    const response = await fetch(url, { signal: abort.signal });
    if (!response.ok) {
      throw new Error(`Held balloon model returned HTTP ${response.status}.`);
    }
    const buffer = await response.arrayBuffer();
    if (disposed) {
      release();
      return;
    }

    inspectGlbJson(buffer);

    const gltf = await loader.parseAsync(buffer, new URL('.', url).href);
    own(gltf.scene);
    if (disposed) {
      release();
      return;
    }

    validateAndBake(gltf);
  }

  function update(packet) {
    if (disposed) return;
    const rows = balloonInstanceRows(packet, capacity);
    currentPacket = packet;
    if (!isReady) return;

    if (!packet) {
      if (skinInstancedMesh) {
        skinInstancedMesh.count = 0;
        skinInstancedMesh.instanceMatrix.needsUpdate = true;
        if (skinInstancedMesh.instanceColor) skinInstancedMesh.instanceColor.needsUpdate = true;
        skinInstancedMesh.userData.selections = [];
        skinInstancedMesh.computeBoundingBox();
        skinInstancedMesh.computeBoundingSphere();
      }
      if (stringInstancedMesh) {
        stringInstancedMesh.count = 0;
        stringInstancedMesh.instanceMatrix.needsUpdate = true;
        stringInstancedMesh.userData.selections = [];
        stringInstancedMesh.computeBoundingBox();
        stringInstancedMesh.computeBoundingSphere();
      }
      group.userData.selections = [];
      return;
    }

    const selections = [];
    let instanceCount = 0;
    for (const {id: guestId, colour, person} of rows) {
      const posX = person.x + half + 0.254;
      const posY = person.elevation + 0.60;
      const posZ = person.z + half;

      tempMatrix.makeTranslation(posX, posY, posZ);
      skinInstancedMesh.setMatrixAt(instanceCount, tempMatrix);
      stringInstancedMesh.setMatrixAt(instanceCount, tempMatrix);

      resolveBalloonColor(colour, tempColor);
      skinInstancedMesh.setColorAt(instanceCount, tempColor);

      selections[instanceCount] = { kind: 'guest', id: guestId };

      instanceCount++;
    }

    skinInstancedMesh.count = instanceCount;
    stringInstancedMesh.count = instanceCount;
    skinInstancedMesh.instanceMatrix.needsUpdate = true;
    stringInstancedMesh.instanceMatrix.needsUpdate = true;
    if (skinInstancedMesh.instanceColor) {
      skinInstancedMesh.instanceColor.needsUpdate = true;
    }

    skinInstancedMesh.userData.selections = selections;
    stringInstancedMesh.userData.selections = selections;
    group.userData.selections = selections;

    skinInstancedMesh.computeBoundingBox();
    skinInstancedMesh.computeBoundingSphere();
    stringInstancedMesh.computeBoundingBox();
    stringInstancedMesh.computeBoundingSphere();
  }

  function status() {
    return {
      ready: isReady,
      error: loadError,
      disposed,
      primitives: isReady && skinInstancedMesh && stringInstancedMesh ? 2 : 0,
      instances: isReady && skinInstancedMesh ? skinInstancedMesh.count : 0,
      geometries: geometries.size,
      materials: materials.size,
      textures: textures.size,
      bitmaps: bitmaps.size
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    isReady = false;
    abort.abort();
    release();
  }

  const readyPromise = loadModel()
    .then(() => {
      objectURLs.clear();
      if (disposed) {
        release();
        return;
      }
      isReady = true;
      if (currentPacket !== null) {
        update(currentPacket);
      } else {
        update(null);
      }
    })
    .catch(err => {
      isReady = false;
      objectURLs.clear();
      release();
      if (!disposed) {
        loadError = String(err?.message ?? err);
      }
    });

  return {
    group,
    get ready() {
      return isReady && !disposed && !loadError;
    },
    get error() {
      return loadError;
    },
    readyPromise,
    update,
    status,
    dispose
  };
}
