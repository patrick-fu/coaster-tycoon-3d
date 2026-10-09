import * as THREE from 'three';

/**
 * Creates physical material property definitions for ground lawn and park paths.
 * Returns plain MeshStandardMaterial parameter objects for consumption by ctx.material.
 *
 * @param {object} textureSets - Texture bundles containing grass and paving maps.
 * @param {object} textureSets.grass - { color, normal, roughness }
 * @param {object} textureSets.paving - { color, normal, roughness }
 * @returns {{ ground: object, path: object, queue: object }}
 */
export function createSurfacePalette(textureSets) {
  if (!textureSets || typeof textureSets !== 'object') {
    throw new TypeError('createSurfacePalette: textureSets must be an object');
  }

  const { grass, paving } = textureSets;

  if (!grass || typeof grass !== 'object') {
    throw new TypeError('createSurfacePalette: missing grass texture set');
  }
  if (!grass.color || !grass.normal || !grass.roughness) {
    throw new TypeError('createSurfacePalette: grass texture set must contain color, normal, and roughness textures');
  }

  if (!paving || typeof paving !== 'object') {
    throw new TypeError('createSurfacePalette: missing paving texture set');
  }
  if (!paving.color || !paving.normal || !paving.roughness) {
    throw new TypeError('createSurfacePalette: paving texture set must contain color, normal, and roughness textures');
  }

  return {
    ground: {
      color: new THREE.Color(1.25, 1.35, 1.15),
      roughness: 0.86,
      metalness: 0.0,
      map: grass.color,
      normalMap: grass.normal,
      roughnessMap: grass.roughness,
      normalScale: new THREE.Vector2(0.35, 0.35)
    },
    path: {
      color: '#dfd4c4',
      roughness: 0.82,
      metalness: 0.0,
      map: paving.color,
      normalMap: paving.normal,
      roughnessMap: paving.roughness,
      normalScale: new THREE.Vector2(0.45, 0.45)
    },
    queue: {
      color: '#7e93a6',
      roughness: 0.80,
      metalness: 0.0,
      map: paving.color,
      normalMap: paving.normal,
      roughnessMap: paving.roughness,
      normalScale: new THREE.Vector2(0.45, 0.45)
    }
  };
}
