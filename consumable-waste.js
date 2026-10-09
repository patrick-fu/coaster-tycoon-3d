import * as THREE from 'three';

/**
 * Coaster Tycoon 3D - Consumable Ground Waste Module
 *
 * Implements compact, distinct, readable 3D silhouettes for ground litter:
 * - Empty metal can with tab (emptyCan)
 * - Folded carton box / takeaway clamshell (emptyBurgerBox)
 * - Retains exact existing form and material for generic legacy litter
 *
 * Manages resource allocation, instancing, and complete disposal teardown.
 */

function mergeBufferGeometries(geometries) {
  let totalVertices = 0;
  let totalIndices = 0;
  for (const g of geometries) {
    totalVertices += g.attributes.position.count;
    totalIndices += g.index ? g.index.count : g.attributes.position.count;
  }
  const posArray = new Float32Array(totalVertices * 3);
  const normArray = new Float32Array(totalVertices * 3);
  const uvArray = new Float32Array(totalVertices * 2);
  const indexArray = new Uint32Array(totalIndices);

  let vertexOffset = 0;
  let indexOffset = 0;

  for (const g of geometries) {
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    const uv = g.attributes.uv;
    posArray.set(pos.array, vertexOffset * 3);
    if (norm) normArray.set(norm.array, vertexOffset * 3);
    if (uv) uvArray.set(uv.array, vertexOffset * 2);

    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        indexArray[indexOffset + i] = g.index.array[i] + vertexOffset;
      }
      indexOffset += g.index.count;
    } else {
      for (let i = 0; i < pos.count; i++) {
        indexArray[indexOffset + i] = vertexOffset + i;
      }
      indexOffset += pos.count;
    }
    vertexOffset += pos.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normArray, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
  merged.setIndex(new THREE.BufferAttribute(indexArray, 1));
  return merged;
}

function buildCanGeometry() {
  // Cylindrical metal beverage can lying on ground with open pull-tab
  const body = new THREE.CylinderGeometry(0.065, 0.065, 0.17, 12);
  body.rotateZ(Math.PI / 2);
  body.translate(0, 0.065, 0);

  const tab = new THREE.BoxGeometry(0.016, 0.04, 0.024);
  tab.rotateZ(0.4);
  tab.translate(0.075, 0.095, 0);

  const merged = mergeBufferGeometries([body, tab]);
  body.dispose();
  tab.dispose();
  return merged;
}

function buildBurgerBoxGeometry() {
  // Folded kraft carton clamshell burger box slightly open
  const base = new THREE.BoxGeometry(0.20, 0.045, 0.18);
  base.translate(0, 0.0225, 0);

  const lid = new THREE.BoxGeometry(0.205, 0.035, 0.185);
  lid.rotateX(-0.16);
  lid.translate(0, 0.062, -0.015);

  const merged = mergeBufferGeometries([base, lid]);
  base.dispose();
  lid.dispose();
  return merged;
}

export function createConsumableWaste(scene, maxCount = 10000) {
  const canGeometry = buildCanGeometry();
  const canMaterial = new THREE.MeshStandardMaterial({
    color: '#7e9cb6',
    metalness: 0.85,
    roughness: 0.28
  });
  const canMesh = new THREE.InstancedMesh(canGeometry, canMaterial, maxCount);
  canMesh.count = 0;
  canMesh.castShadow = true;
  canMesh.receiveShadow = true;
  scene.add(canMesh);

  const boxGeometry = buildBurgerBoxGeometry();
  const boxMaterial = new THREE.MeshStandardMaterial({
    color: '#c49e6d',
    roughness: 0.85,
    metalness: 0.05
  });
  const boxMesh = new THREE.InstancedMesh(boxGeometry, boxMaterial, maxCount);
  boxMesh.count = 0;
  boxMesh.castShadow = true;
  boxMesh.receiveShadow = true;
  scene.add(boxMesh);

  function update(packet, transform, genericLitterMesh) {
    const typeMap = new Map();
    if (Array.isArray(packet.litterTypes)) {
      for (let j = 0; j < packet.litterTypes.length; j++) {
        const item = packet.litterTypes[j];
        if (item && item.id != null) {
          typeMap.set(item.id, item.containerId);
        }
      }
    }

    let genericCount = 0;
    let canCount = 0;
    let boxCount = 0;

    for (let i = 0; i < packet.litter.length; i += 4) {
      const id = packet.litter[i];
      const x = packet.litter[i + 1];
      const z = packet.litter[i + 2];
      const y = packet.litter[i + 3];

      const containerId = typeMap.get(id);

      if (containerId === 'emptyCan') {
        // +0.14m public deck top + 0.002m presentation clearance against z-fighting
        transform.position.set(x + 2, y + 0.142, z + 2);
        transform.scale.set(1, 1, 1);
        transform.rotation.set(0, (id % 8) * 0.785, 0);
        transform.updateMatrix();
        canMesh.setMatrixAt(canCount++, transform.matrix);
      } else if (containerId === 'emptyBurgerBox') {
        transform.position.set(x + 2, y + 0.142, z + 2);
        transform.scale.set(1, 1, 1);
        transform.rotation.set(0, (id % 7) * 0.9, 0);
        transform.updateMatrix();
        boxMesh.setMatrixAt(boxCount++, transform.matrix);
      } else {
        // Generic legacy litter wrapper: exact original form, position, and scale
        transform.position.set(x + 2, y + 0.04, z + 2);
        transform.scale.set(0.2, 0.035, 0.15);
        transform.rotation.set(0, id % 5, 0);
        transform.updateMatrix();
        genericLitterMesh.setMatrixAt(genericCount++, transform.matrix);
      }
    }

    genericLitterMesh.count = genericCount;
    genericLitterMesh.instanceMatrix.needsUpdate = true;
    genericLitterMesh.boundingSphere = null;

    canMesh.count = canCount;
    canMesh.instanceMatrix.needsUpdate = true;
    canMesh.boundingSphere = null;

    boxMesh.count = boxCount;
    boxMesh.instanceMatrix.needsUpdate = true;
    boxMesh.boundingSphere = null;
  }

  function dispose() {
    scene.remove(canMesh);
    canMesh.dispose();
    canGeometry.dispose();
    canMaterial.dispose();

    scene.remove(boxMesh);
    boxMesh.dispose();
    boxGeometry.dispose();
    boxMaterial.dispose();
  }

  return {
    canMesh,
    boxMesh,
    update,
    dispose
  };
}
