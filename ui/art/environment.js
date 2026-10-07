import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Coaster Tycoon 3D - Environment Art Module
// Independently authored under MIT. Observational visual reference only.
// ---------------------------------------------------------------------------

/**
 * Deterministic hash returning [0, 1) for stable pseudorandom variation.
 * Avoids Math.random() to guarantee frame-to-frame and load-to-load stability.
 */
function hash2D(x, y, seed = 0) {
  let h = (Math.floor(x) * 374761393 + Math.floor(y) * 668265263 + seed * 961748941) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// Procedural CanvasTexture Painters (Cached via ctx.texture)
// ---------------------------------------------------------------------------

/**
 * Authored deterministic lawn canvas texture.
 * Periodic mottling and turf grain wrap across tile borders.
 */
function paintTurf(ctx2d, width, height) {
  // Rich manicured park lawn base
  ctx2d.fillStyle = '#4c7a36';
  ctx2d.fillRect(0, 0, width, height);

  const pi2 = Math.PI * 2;

  // Layered harmonic tone fields for broad natural organic mottling (seamlessly periodic)
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const nx = x / width;
      const ny = y / height;
      const s1 = Math.sin(nx * pi2) * Math.cos(ny * pi2);
      const s2 = Math.cos(nx * pi2 * 2 + 0.4) * Math.sin(ny * pi2 * 2 + 0.6);
      const wave = s1 * 0.6 + s2 * 0.4;
      if (wave > 0.08) {
        ctx2d.fillStyle = `rgba(96, 148, 62, ${0.12 + wave * 0.16})`;
        ctx2d.fillRect(x, y, 4, 4);
      } else if (wave < -0.08) {
        ctx2d.fillStyle = `rgba(54, 92, 38, ${0.1 + (-wave) * 0.14})`;
        ctx2d.fillRect(x, y, 4, 4);
      }
    }
  }

  // Soft organic circular dapples wrapping across borders
  const dapples = [
    { qx: 0.22, qy: 0.28, r: 16, color: 'rgba(92, 144, 58, 0.22)' },
    { qx: 0.72, qy: 0.68, r: 18, color: 'rgba(56, 96, 40, 0.2)' },
    { qx: 0.35, qy: 0.78, r: 14, color: 'rgba(98, 152, 64, 0.18)' },
    { qx: 0.82, qy: 0.22, r: 15, color: 'rgba(52, 90, 36, 0.18)' },
    { qx: 0.5, qy: 0.5, r: 20, color: 'rgba(84, 134, 54, 0.16)' }
  ];
  for (const d of dapples) {
    for (const ox of [-1, 0, 1]) {
      for (const oy of [-1, 0, 1]) {
        const cx = (d.qx + ox) * width;
        const cy = (d.qy + oy) * height;
        ctx2d.fillStyle = d.color;
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, d.r, 0, pi2);
        ctx2d.fill();
      }
    }
  }

  // Fine delicate lawn blade grain (low-contrast, soft organic stipples)
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const h = hash2D(x, y, 19);
      if (h > 0.52) {
        const alpha = 0.08 + (h - 0.52) * 0.25;
        ctx2d.fillStyle = h > 0.76 ? `rgba(104, 158, 68, ${alpha})` : `rgba(58, 98, 42, ${alpha})`;
        ctx2d.fillRect(x, y, 1, 2);
      }
    }
  }
}

/**
 * Authored deterministic vertical bark grain texture.
 * Adds tactile fibrous ridges, vertical furrow channels, and natural timber warmth.
 */
function paintBarkGrain(ctx2d, width, height) {
  ctx2d.fillStyle = '#443020';
  ctx2d.fillRect(0, 0, width, height);

  const pi2 = Math.PI * 2;
  // Continuous vertical fibrous bark ridges and shadow furrows
  for (let x = 0; x < width; x += 3) {
    const h = hash2D(x, 7, 41);
    const isFurrow = h > 0.5;
    for (let y = 0; y < height; y += 2) {
      const ny = y / height;
      const dx = Math.sin(ny * pi2 * 3 + h * 5) * 1.5;
      const px = (x + dx + width) % width;
      const alpha = 0.15 + hash2D(x, y, 53) * 0.35;
      ctx2d.fillStyle = isFurrow ? `rgba(32, 20, 12, ${alpha})` : `rgba(110, 80, 55, ${alpha * 0.8})`;
      ctx2d.fillRect(px, y, 2, 2);
    }
  }

  // Fine organic wood grain fibers
  for (let y = 0; y < height; y += 4) {
    const h = hash2D(13, y, 67);
    const alpha = 0.06 + h * 0.12;
    ctx2d.fillStyle = h > 0.5 ? `rgba(128, 96, 68, ${alpha})` : `rgba(24, 15, 9, ${alpha})`;
    ctx2d.fillRect(0, y, width, 1);
  }
}

/**
 * Authored deterministic leaf canopy cluster texture.
 * Softens foliage geometry with tactile leaf rosettes and organic stippling.
 */
function paintFoliageCluster(ctx2d, width, height) {
  ctx2d.fillStyle = '#44782c';
  ctx2d.fillRect(0, 0, width, height);

  const pi2 = Math.PI * 2;
  // Dappled leaf rosette clusters periodic in X and Y
  for (let i = 0; i < 24; i++) {
    const qx = hash2D(i, 3, 71);
    const qy = hash2D(i, 5, 71);
    const r = 4 + hash2D(i, 7, 71) * 8;
    const isHighlight = hash2D(i, 9, 71) > 0.45;
    for (const ox of [-1, 0, 1]) {
      for (const oy of [-1, 0, 1]) {
        const cx = (qx + ox) * width;
        const cy = (qy + oy) * height;
        ctx2d.fillStyle = isHighlight ? 'rgba(102, 164, 62, 0.28)' : 'rgba(46, 82, 30, 0.26)';
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, r, 0, pi2);
        ctx2d.fill();
      }
    }
  }

  // Micro leaf flecks
  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const h = hash2D(x, y, 83);
      if (h > 0.6) {
        ctx2d.fillStyle = h > 0.82 ? 'rgba(118, 184, 72, 0.35)' : 'rgba(38, 70, 24, 0.35)';
        ctx2d.fillRect(x, y, 2, 2);
      }
    }
  }
}

/**
 * Authored deterministic Caribbean water ripple texture.
 * Seamless periodic wavelets and turquoise foam crests without square grid seams.
 */
function paintWaterRipples(ctx2d, width, height) {
  ctx2d.fillStyle = '#257888';
  ctx2d.fillRect(0, 0, width, height);

  const pi2 = Math.PI * 2;
  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x += 2) {
      const nx = x / width;
      // Two integer periodic harmonics guarantee 100% seamless tile-to-tile continuity
      const wave1 = Math.sin(ny * pi2 * 4 + Math.sin(nx * pi2 * 2) * 1.2);
      const wave2 = Math.cos(ny * pi2 * 8 + Math.cos(nx * pi2 * 4) * 0.8);
      const wave = wave1 * 0.6 + wave2 * 0.4;

      if (wave > 0.72) {
        ctx2d.fillStyle = 'rgba(215, 248, 255, 0.45)';
        ctx2d.fillRect(x, y, 2, 1);
      } else if (wave > 0.35) {
        // Sunlit turquoise ripple crest
        const alpha = 0.15 + (wave - 0.35) * 0.45;
        ctx2d.fillStyle = `rgba(90, 208, 224, ${alpha})`;
        ctx2d.fillRect(x, y, 2, 1);
      } else if (wave < -0.3) {
        // Deeper trough shadow
        const alpha = 0.12 + (-wave - 0.3) * 0.35;
        ctx2d.fillStyle = `rgba(20, 80, 92, ${alpha})`;
        ctx2d.fillRect(x, y, 2, 1);
      }
    }
  }
}

/**
 * Authored deterministic rich compost loam and mulch bed texture.
 */
function paintFlowerBedSoil(ctx2d, width, height) {
  ctx2d.fillStyle = '#2c1b10';
  ctx2d.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const h = hash2D(x, y, 61);
      if (h > 0.45) {
        if (h > 0.85) {
          ctx2d.fillStyle = 'rgba(64, 94, 42, 0.35)'; // Tiny moss/clover flecks
        } else if (h > 0.65) {
          ctx2d.fillStyle = 'rgba(72, 48, 30, 0.4)';  // Peat fibers
        } else {
          ctx2d.fillStyle = 'rgba(20, 12, 7, 0.45)';  // Deep soil voids
        }
        ctx2d.fillRect(x, y, 2, 2);
      }
    }
  }
}

function paintSoilStrata(ctx2d, width, height) {
  // Layered geological cliff strata: dark organic topsoil -> clay/loam -> gravel
  const grad = ctx2d.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0.0, '#362315');
  grad.addColorStop(0.18, '#432d1c');
  grad.addColorStop(0.26, '#5a3d27');
  grad.addColorStop(0.55, '#684a30');
  grad.addColorStop(0.68, '#543b24');
  grad.addColorStop(0.85, '#70553a');
  grad.addColorStop(1.0, '#463422');
  ctx2d.fillStyle = grad;
  ctx2d.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += 3) {
    const h = hash2D(y, 11, 47);
    const alpha = 0.08 + h * 0.12;
    ctx2d.fillStyle = h > 0.5 ? `rgba(205, 175, 135, ${alpha})` : `rgba(22, 14, 8, ${alpha})`;
    ctx2d.fillRect(0, y, width, 2);
  }
}

function paintPublicPaving(ctx2d, width, height) {
  ctx2d.fillStyle = '#d1c4a5';
  ctx2d.fillRect(0, 0, width, height);

  const slabSize = width / 4;
  ctx2d.strokeStyle = '#b2a17e';
  ctx2d.lineWidth = 2;
  for (let x = 0; x <= width; x += slabSize) {
    ctx2d.beginPath();
    ctx2d.moveTo(x, 0);
    ctx2d.lineTo(x, height);
    ctx2d.stroke();
  }
  for (let y = 0; y <= height; y += slabSize) {
    ctx2d.beginPath();
    ctx2d.moveTo(0, y);
    ctx2d.lineTo(width, y);
    ctx2d.stroke();
  }

  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const h = hash2D(x, y, 73);
      if (h > 0.55) {
        ctx2d.fillStyle = h > 0.8 ? 'rgba(235, 226, 206, 0.42)' : 'rgba(138, 122, 92, 0.28)';
        ctx2d.fillRect(x, y, 2, 2);
      }
    }
  }
}

function paintQueuePaving(ctx2d, width, height) {
  ctx2d.fillStyle = '#7a94aa';
  ctx2d.fillRect(0, 0, width, height);

  const slabSize = width / 4;
  ctx2d.strokeStyle = '#637a8c';
  ctx2d.lineWidth = 2;
  for (let x = 0; x <= width; x += slabSize) {
    ctx2d.beginPath();
    ctx2d.moveTo(x, 0);
    ctx2d.lineTo(x, height);
    ctx2d.stroke();
  }
  for (let y = 0; y <= height; y += slabSize) {
    ctx2d.beginPath();
    ctx2d.moveTo(0, y);
    ctx2d.lineTo(width, y);
    ctx2d.stroke();
  }

  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const h = hash2D(x, y, 97);
      if (h > 0.6) {
        ctx2d.fillStyle = h > 0.8 ? 'rgba(155, 185, 205, 0.32)' : 'rgba(75, 95, 115, 0.32)';
        ctx2d.fillRect(x, y, 2, 2);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Shared Context Primitives and Fallbacks
// ---------------------------------------------------------------------------

function getMat(ctx, key, props) {
  if (typeof ctx.material === 'function') {
    return ctx.material(key, props);
  }
  return new THREE.MeshStandardMaterial(props);
}

function getTex(ctx, key, width, height, paint) {
  if (typeof ctx.texture === 'function') {
    const tex = ctx.texture(key, width, height, paint);
    if (tex) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
    }
    return tex;
  }
  return null;
}

function boxMesh(ctx, parent, material, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  if (typeof ctx.box === 'function') {
    const m = ctx.box(parent, material, x, y, z, sx, sy, sz);
    if (m && (rx || ry || rz)) m.rotation.set(rx, ry, rz);
    return m;
  }
  const geo = typeof ctx.geometry === 'function'
    ? ctx.geometry('unit-box', () => new THREE.BoxGeometry(1, 1, 1))
    : new THREE.BoxGeometry(1, 1, 1);
  if (typeof ctx.add === 'function') {
    return ctx.add(parent, geo, material, [x, y, z], [sx, sy, sz], [rx, ry, rz]);
  }
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  if (rx || ry || rz) mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (parent) parent.add(mesh);
  return mesh;
}

function cylinderMesh(ctx, parent, material, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  if (typeof ctx.cylinder === 'function') {
    const m = ctx.cylinder(parent, material, x, y, z, sx, sy, sz);
    if (m && (rx || ry || rz)) m.rotation.set(rx, ry, rz);
    return m;
  }
  const geo = typeof ctx.geometry === 'function'
    ? ctx.geometry('unit-cylinder', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 12))
    : new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  if (typeof ctx.add === 'function') {
    return ctx.add(parent, geo, material, [x, y, z], [sx, sy, sz], [rx, ry, rz]);
  }
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  if (rx || ry || rz) mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (parent) parent.add(mesh);
  return mesh;
}

function sphereMesh(ctx, parent, material, x, y, z, sx, sy, sz) {
  if (typeof ctx.sphere === 'function') {
    return ctx.sphere(parent, material, x, y, z, sx, sy, sz);
  }
  const geo = typeof ctx.geometry === 'function'
    ? ctx.geometry('unit-sphere', () => new THREE.SphereGeometry(0.5, 12, 8))
    : new THREE.SphereGeometry(0.5, 12, 8);
  if (typeof ctx.add === 'function') {
    return ctx.add(parent, geo, material, [x, y, z], [sx, sy, sz]);
  }
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (parent) parent.add(mesh);
  return mesh;
}

function coneMesh(ctx, parent, material, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  if (typeof ctx.cone === 'function') {
    const m = ctx.cone(parent, material, x, y, z, sx, sy, sz);
    if (m && (rx || ry || rz)) m.rotation.set(rx, ry, rz);
    return m;
  }
  const geo = typeof ctx.geometry === 'function'
    ? ctx.geometry('unit-cone', () => new THREE.ConeGeometry(0.5, 1, 12))
    : new THREE.ConeGeometry(0.5, 1, 12);
  if (typeof ctx.add === 'function') {
    return ctx.add(parent, geo, material, [x, y, z], [sx, sy, sz], [rx, ry, rz]);
  }
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  if (rx || ry || rz) mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (parent) parent.add(mesh);
  return mesh;
}

function getElevation(ctx, x, y, fallback = 4) {
  if (typeof ctx.surfaceHeight === 'function') {
    return ctx.surfaceHeight(x, y);
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// 1. buildEnvironment
// ---------------------------------------------------------------------------

/**
 * Builds terrain, water, cliff strata, boundary planting and park entrance gate.
 * Returns the ground InstancedMesh direct staticGroup child with row-major matrices.
 *
 * @param {object} ctx - Scene context.
 * @param {object} scenery - Static scenery packet with surfaces and elements.
 * @param {object|null} entry - Authoritative park entrance coordinate {x, y, z}.
 * @returns {THREE.InstancedMesh} The ground instanced mesh.
 */
export function buildEnvironment(ctx, scenery, entry) {
  const tile = ctx.tile ?? 4;
  const half = ctx.half ?? 2;
  const staticParent = ctx.staticGroup || ctx.parent || ctx.scene;

  // Textures
  const turfTex = getTex(ctx, 'tex-turf-mottled', 128, 128, paintTurf);
  const soilTex = getTex(ctx, 'tex-soil-strata', 64, 128, paintSoilStrata);
  const waterTex = getTex(ctx, 'tex-water-ripples', 128, 128, paintWaterRipples);
  const barkTex = getTex(ctx, 'tex-bark-grain', 64, 128, paintBarkGrain);
  const foliageTex = getTex(ctx, 'tex-foliage-leaf', 64, 64, paintFoliageCluster);

  // Materials
  const groundMat = getMat(ctx, 'mat-ground-turf', {
    map: turfTex,
    roughness: 0.86,
    metalness: 0.02
  });

  // Opaque water material with authored ripple texture enables static batching
  // and eliminates interior terrain grid lines showing through from below.
  const waterMat = getMat(ctx, 'mat-water-surface', {
    map: waterTex,
    color: '#3490a0',
    roughness: 0.16,
    metalness: 0.06
  });

  const shoreRimMat = getMat(ctx, 'mat-water-shore-rim', {
    color: '#8e7f67',
    roughness: 0.85
  });

  const soilStrataMat = getMat(ctx, 'mat-terrain-soil-strata', {
    map: soilTex,
    color: '#947257',
    roughness: 0.9,
    metalness: 0.02
  });

  const surfaces = scenery.surfaces || [];
  const tileCount = Math.floor(surfaces.length / 5);

  // Unit Box Geometry for Ground InstancedMesh
  const boxGeo = typeof ctx.geometry === 'function'
    ? ctx.geometry('unit-box-ground', () => new THREE.BoxGeometry(1, 1, 1))
    : new THREE.BoxGeometry(1, 1, 1);

  const ground = new THREE.InstancedMesh(boxGeo, groundMat, tileCount);
  ground.receiveShadow = true;
  ground.userData.ground = true;

  // Fast surface lookup for neighbor slope & water adjacency
  const surfaceMap = new Map();
  for (let i = 0; i < surfaces.length; i += 5) {
    const x = surfaces[i];
    const y = surfaces[i + 1];
    const height = surfaces[i + 2];
    const water = surfaces[i + 3];
    const owned = surfaces[i + 4];
    surfaceMap.set(`${x},${y}`, { height, water, owned, heightM: (height / 32) * tile });
  }

  const transform = new THREE.Object3D();
  const color = new THREE.Color();

  // 1. Ground InstancedMesh population (row-major order)
  for (let i = 0; i < surfaces.length; i += 5) {
    const idx = i / 5;
    const x = surfaces[i];
    const y = surfaces[i + 1];
    const height = surfaces[i + 2];
    const water = surfaces[i + 3];
    const owned = surfaces[i + 4];
    const h = (height / 32) * tile;

    // Exact required row-major center Y: terrainHeight / 32 * 4 / 2
    transform.position.set(x * tile + half, h / 2, y * tile + half);
    transform.scale.set(tile, Math.max(0.01, h), tile);
    transform.rotation.set(0, 0, 0);
    transform.updateMatrix();
    ground.setMatrixAt(idx, transform.matrix);

    // Subtle, gentle organic grass tone variation across park tiles
    if (owned) {
      const v = hash2D(x, y, 43);
      color.setRGB(0.34 + (v - 0.5) * 0.035, 0.54 + (v - 0.5) * 0.045, 0.26 + (v - 0.5) * 0.025);
    } else {
      const v = hash2D(x, y, 47);
      color.setRGB(0.28 + (v - 0.5) * 0.025, 0.44 + (v - 0.5) * 0.035, 0.22 + (v - 0.5) * 0.02);
    }
    ground.setColorAt(idx, color);

    // 2. Water surface & shore rims
    if (water > 0 && staticParent) {
      const waterH = (water / 32) * tile;
      const waterY = waterH + 0.03;

      // Check adjacency to eliminate micro-gaps and internal seams between water tiles
      const hasEastWater = surfaceMap.get(`${x + 1},${y}`)?.water === water;
      const hasWestWater = surfaceMap.get(`${x - 1},${y}`)?.water === water;
      const hasSouthWater = surfaceMap.get(`${x},${y + 1}`)?.water === water;
      const hasNorthWater = surfaceMap.get(`${x},${y - 1}`)?.water === water;

      const ox = (hasEastWater ? 0.01 : 0) - (hasWestWater ? 0.01 : 0);
      const oz = (hasSouthWater ? 0.01 : 0) - (hasNorthWater ? 0.01 : 0);
      const sx = tile + (hasEastWater ? 0.02 : 0) + (hasWestWater ? 0.02 : 0);
      const sz = tile + (hasSouthWater ? 0.02 : 0) + (hasNorthWater ? 0.02 : 0);

      // Water slab overlapping slightly with neighbor water tiles guarantees seamless surface
      boxMesh(ctx, staticParent, waterMat, x * tile + half + ox, waterY, y * tile + half + oz, sx, 0.06, sz);

      // Shore rim on adjacent dry land edges strictly
      const neighbors = [
        { dx: 1, dy: 0, rx: x * tile + tile - 0.09, rz: y * tile + half, sx: 0.18, sz: tile },
        { dx: -1, dy: 0, rx: x * tile + 0.09, rz: y * tile + half, sx: 0.18, sz: tile },
        { dx: 0, dy: 1, rx: x * tile + half, rz: y * tile + tile - 0.09, sx: tile, sz: 0.18 },
        { dx: 0, dy: -1, rx: x * tile + half, rz: y * tile + 0.09, sx: tile, sz: 0.18 }
      ];
      for (const n of neighbors) {
        const neighbor = surfaceMap.get(`${x + n.dx},${y + n.dy}`);
        if (!neighbor || neighbor.water === 0 || neighbor.heightM >= waterH) {
          boxMesh(ctx, staticParent, shoreRimMat, n.rx, waterY + 0.02, n.rz, n.sx, 0.06, n.sz);
        }
      }
    }

    // 3. Cliff exposed soil strata where adjacent tile drops
    if (staticParent) {
      const cliffDirs = [
        { dx: 1, dy: 0, cx: x * tile + tile - 0.04, cz: y * tile + half, sx: 0.08, sz: tile },
        { dx: -1, dy: 0, cx: x * tile + 0.04, cz: y * tile + half, sx: 0.08, sz: tile },
        { dx: 0, dy: 1, cx: x * tile + half, cz: y * tile + tile - 0.04, sx: tile, sz: 0.08 },
        { dx: 0, dy: -1, cx: x * tile + half, cz: y * tile + 0.04, sx: tile, sz: 0.08 }
      ];
      for (const cd of cliffDirs) {
        const neighbor = surfaceMap.get(`${x + cd.dx},${y + cd.dy}`);
        const nH = neighbor ? neighbor.heightM : 0;
        if (h > nH + 0.08) {
          const drop = h - nH;
          const centerY = h - drop / 2;
          boxMesh(ctx, staticParent, soilStrataMat, cd.cx, centerY, cd.cz, cd.sx, drop, cd.sz);
        }
      }
    }
  }

  ground.instanceMatrix.needsUpdate = true;
  if (ground.instanceColor) ground.instanceColor.needsUpdate = true;

  if (staticParent) {
    staticParent.add(ground);
  }

  // 4. Park boundary planting (strictly on unowned boundary land, outside construction area)
  if (staticParent) {
    const barkMat = getMat(ctx, 'mat-scenery-bark', { map: barkTex, color: '#beab8e', roughness: 0.9 });
    const leafSun = getMat(ctx, 'mat-foliage-sunlit', { map: foliageTex, color: '#eef5c8', roughness: 0.82 });
    const leafMid = getMat(ctx, 'mat-foliage-mid', { map: foliageTex, color: '#c6d8a3', roughness: 0.84 });
    const leafShade = getMat(ctx, 'mat-foliage-shade', { map: foliageTex, color: '#9db582', roughness: 0.86 });
    const leafDeep = getMat(ctx, 'mat-foliage-deep', { map: foliageTex, color: '#7b9269', roughness: 0.88 });

    const pineSun = getMat(ctx, 'mat-pine-sunlit', { color: '#4b7e41', roughness: 0.84 });
    const pineMid = getMat(ctx, 'mat-pine-mid', { color: '#3c6d36', roughness: 0.85 });
    const pineShade = getMat(ctx, 'mat-pine-shade', { color: '#2d522c', roughness: 0.87 });

    for (let i = 0; i < surfaces.length; i += 5) {
      const x = surfaces[i];
      const y = surfaces[i + 1];
      const height = surfaces[i + 2];
      const water = surfaces[i + 3];
      const owned = surfaces[i + 4];

      // Strictly unowned, dry perimeter tiles only
      if (owned !== 0 || water > 0) continue;

      // Keep clear of the park entrance corridor
      if (entry && Math.hypot(x - entry.x, y - entry.y) < 2.8) continue;

      const densityH = hash2D(x, y, 101);
      if (densityH > 0.38) {
        const jx = (hash2D(x, y, 102) - 0.5) * 1.5;
        const jz = (hash2D(x, y, 103) - 0.5) * 1.5;
        const tx = x * tile + half + jx;
        const tz = y * tile + half + jz;
        const th = (height / 32) * tile;

        const isDeciduous = hash2D(x, y, 104) > 0.48;
        if (isDeciduous) {
          // Deciduous boundary tree: bark-grained trunk, boughs, asymmetrical multi-shade foliage
          cylinderMesh(ctx, staticParent, barkMat, tx, th + 1.8, tz, 0.42, 3.6, 0.42);
          cylinderMesh(ctx, staticParent, barkMat, tx + 0.38, th + 2.8, tz + 0.28, 0.2, 1.3, 0.2, 0.35, 0.2, -0.4);

          // Clustered asymmetrical foliage clumps in multiple shades
          sphereMesh(ctx, staticParent, leafDeep, tx - 0.25, th + 3.4, tz + 0.25, 1.35, 0.95, 1.25);
          sphereMesh(ctx, staticParent, leafMid, tx + 0.7, th + 4.1, tz + 0.45, 1.55, 1.3, 1.5);
          sphereMesh(ctx, staticParent, leafShade, tx - 0.7, th + 4.2, tz - 0.4, 1.45, 1.25, 1.4);
          sphereMesh(ctx, staticParent, leafSun, tx + 0.2, th + 5.3, tz - 0.15, 1.6, 1.35, 1.5);
          sphereMesh(ctx, staticParent, leafSun, tx - 0.1, th + 6.1, tz + 0.1, 1.1, 0.95, 1.05);
        } else {
          // Tiered conifer boundary tree with multi-shade needle skirts
          cylinderMesh(ctx, staticParent, barkMat, tx, th + 2.5, tz, 0.32, 5.0, 0.32);
          coneMesh(ctx, staticParent, pineShade, tx, th + 2.4, tz, 2.1, 1.6, 2.1);
          coneMesh(ctx, staticParent, pineMid, tx, th + 3.7, tz, 1.7, 1.6, 1.7);
          coneMesh(ctx, staticParent, pineSun, tx, th + 4.9, tz, 1.3, 1.5, 1.3);
          coneMesh(ctx, staticParent, pineSun, tx, th + 6.0, tz, 0.75, 1.3, 0.75);
        }

        // Boundary understory shrub
        if (hash2D(x, y, 105) > 0.55) {
          sphereMesh(ctx, staticParent, leafMid, tx + 0.7, th + 0.45, tz - 0.7, 0.8, 0.55, 0.8);
        }
      }
    }
  }

  // 5. Grand readable cedar/cream park entrance arch and turnstiles/ticket boxes
  if (entry && staticParent) {
    const ex = entry.x * tile + half;
    const ez = entry.y * tile + half;
    const eh = (entry.z / 32) * tile;

    const cedarMat = getMat(ctx, 'mat-gate-cedar', { color: '#61422b', roughness: 0.76 });
    const creamMat = getMat(ctx, 'mat-gate-cream', { color: '#ebe1cb', roughness: 0.7 });
    const roofMat = getMat(ctx, 'mat-gate-roof', { color: '#2b4d37', roughness: 0.65 });
    const metalMat = getMat(ctx, 'mat-gate-metal', { color: '#88939c', roughness: 0.35, metalness: 0.65 });
    const goldMat = getMat(ctx, 'mat-gate-gold', { color: '#c7a350', roughness: 0.3, metalness: 0.7 });
    const beaconMat = getMat(ctx, 'mat-gate-beacon', { color: '#56cf72', emissive: '#3aa552' });

    for (const off of [-2.2, 2.2]) {
      boxMesh(ctx, staticParent, creamMat, ex + off, eh + 0.5, ez, 0.72, 1.0, 0.72);
      boxMesh(ctx, staticParent, cedarMat, ex + off, eh + 2.6, ez, 0.5, 3.2, 0.5);
      boxMesh(ctx, staticParent, creamMat, ex + off, eh + 4.3, ez, 0.66, 0.24, 0.66);
      coneMesh(ctx, staticParent, cedarMat, ex + off, eh + 4.75, ez, 0.36, 0.65, 0.36);
    }

    boxMesh(ctx, staticParent, cedarMat, ex, eh + 4.25, ez, 4.9, 0.45, 0.52);
    boxMesh(ctx, staticParent, creamMat, ex, eh + 4.6, ez, 4.5, 0.25, 0.46);
    boxMesh(ctx, staticParent, roofMat, ex, eh + 5.0, ez, 4.2, 0.55, 0.62);

    boxMesh(ctx, staticParent, creamMat, ex, eh + 4.25, ez - 0.28, 2.6, 0.65, 0.08);
    if (typeof ctx.text === 'function') {
      ctx.text(staticParent, 'PARK ENTRANCE', {
        x: ex,
        y: eh + 4.25,
        z: ez + 0.33,
        width: 2.4,
        height: 0.55,
        color: '#382516',
        background: 'transparent'
      });
    }

    for (const off of [-1.35, 1.35]) {
      boxMesh(ctx, staticParent, roofMat, ex + off, eh + 0.48, ez, 0.32, 0.96, 0.6);
      boxMesh(ctx, staticParent, goldMat, ex + off, eh + 0.98, ez, 0.36, 0.06, 0.64);
      cylinderMesh(ctx, staticParent, metalMat, ex + off * 0.75, eh + 0.85, ez, 0.08, 0.25, 0.08);
      boxMesh(ctx, staticParent, metalMat, ex + off * 0.55, eh + 0.85, ez, 0.35, 0.04, 0.04);
      boxMesh(ctx, staticParent, beaconMat, ex + off, eh + 1.03, ez - 0.22, 0.08, 0.04, 0.08);
    }
  }

  return ground;
}

// ---------------------------------------------------------------------------
// 2. buildPath
// ---------------------------------------------------------------------------

/**
 * Builds path tile with warm paving, true adjacent-edge cut kerbs, queue railings,
 * and elevated trestle supports down to authoritative surface height.
 *
 * @param {object} ctx - Scene context.
 * @param {THREE.Group} parent - Parent group holding this path element.
 * @param {object} element - Path element record { tile, height, queueFor }.
 * @param {object} scenery - Full scenery state containing elements.
 */
export function buildPath(ctx, parent, element, scenery) {
  const tile = ctx.tile ?? 4;
  const half = ctx.half ?? 2;
  const x = element.tile.x * tile + half;
  const z = element.tile.y * tile + half;
  const h = (element.height / 32) * tile;
  const isQueue = element.queueFor !== null;

  // Textures
  const publicPavingTex = getTex(ctx, 'tex-paving-public', 128, 128, paintPublicPaving);
  const queuePavingTex = getTex(ctx, 'tex-paving-queue', 128, 128, paintQueuePaving);

  // Materials
  const deckMat = isQueue
    ? getMat(ctx, 'mat-path-queue-deck', {
        map: queuePavingTex,
        roughness: 0.72,
        metalness: 0.04
      })
    : getMat(ctx, 'mat-path-public-deck', {
        map: publicPavingTex,
        roughness: 0.76,
        metalness: 0.04
      });

  const kerbMat = getMat(ctx, 'mat-path-kerb', {
    color: isQueue ? '#768a9c' : '#a69578',
    roughness: 0.82
  });

  const railWhiteMat = getMat(ctx, 'mat-path-queue-rail', {
    color: '#f6f6f2',
    roughness: 0.42,
    metalness: 0.05
  });

  const supportMat = getMat(ctx, 'mat-path-trestle-wood', {
    color: '#5a4f42',
    roughness: 0.86
  });

  const footingMat = getMat(ctx, 'mat-path-footing-concrete', {
    color: '#8e8982',
    roughness: 0.9
  });

  // Query actual path connectivity in 4 directions
  const elements = scenery.elements || [];
  const hasNeighbor = (dx, dy) => {
    const nx = element.tile.x + dx;
    const ny = element.tile.y + dy;
    return elements.some(p =>
      p.kind === 'path' &&
      p.tile.x === nx &&
      p.tile.y === ny &&
      p.height === element.height &&
      (!isQueue || p.queueFor === null || p.queueFor === element.queueFor)
    );
  };

  const connectsEntrance = (dx, dy) => {
    const nx = element.tile.x + dx;
    const ny = element.tile.y + dy;
    return elements.some(p =>
      (p.kind === 'portal' || p.kind === 'facility') &&
      p.tile.x === nx &&
      p.tile.y === ny &&
      p.height === element.height &&
      (() => {
        const [fx, fy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][p.direction];
        const sign = p.kind === 'portal' ? -1 : 1;
        return p.tile.x + fx * sign === element.tile.x && p.tile.y + fy * sign === element.tile.y;
      })()
    );
  };

  const east = hasNeighbor(1, 0) || connectsEntrance(1, 0);
  const west = hasNeighbor(-1, 0) || connectsEntrance(-1, 0);
  const south = hasNeighbor(0, 1) || connectsEntrance(0, 1);
  const north = hasNeighbor(0, -1) || connectsEntrance(0, -1);

  // 1. Main paving deck
  boxMesh(ctx, parent, deckMat, x, h + 0.07, z, 3.86, 0.14, 3.86);

  // 2. Edge kerbs (true adjacent-edge cuts: omit kerb where paths connect)
  if (!east) boxMesh(ctx, parent, kerbMat, x + 1.93, h + 0.1, z, 0.14, 0.2, 3.86);
  if (!west) boxMesh(ctx, parent, kerbMat, x - 1.93, h + 0.1, z, 0.14, 0.2, 3.86);
  if (!south) boxMesh(ctx, parent, kerbMat, x, h + 0.1, z + 1.93, 3.86, 0.2, 0.14);
  if (!north) boxMesh(ctx, parent, kerbMat, x, h + 0.1, z - 1.93, 3.86, 0.2, 0.14);

  // 3. Queue white rail and post sections on edges absent path neighbors
  if (isQueue) {
    const queueEdges = [
      { absent: !east, px: x + 1.72, pz: z, isX: false },
      { absent: !west, px: x - 1.72, pz: z, isX: false },
      { absent: !south, px: x, pz: z + 1.72, isX: true },
      { absent: !north, px: x, pz: z - 1.72, isX: true }
    ];

    for (const qe of queueEdges) {
      if (!qe.absent) continue;

      if (qe.isX) {
        for (const dx of [-1.6, 0, 1.6]) {
          boxMesh(ctx, parent, railWhiteMat, qe.px + dx, h + 0.55, qe.pz, 0.08, 1.1, 0.08);
        }
        boxMesh(ctx, parent, railWhiteMat, qe.px, h + 0.96, qe.pz, 3.8, 0.06, 0.06);
        boxMesh(ctx, parent, railWhiteMat, qe.px, h + 0.52, qe.pz, 3.8, 0.05, 0.05);
      } else {
        for (const dz of [-1.6, 0, 1.6]) {
          boxMesh(ctx, parent, railWhiteMat, qe.px, h + 0.55, qe.pz + dz, 0.08, 1.1, 0.08);
        }
        boxMesh(ctx, parent, railWhiteMat, qe.px, h + 0.96, qe.pz, 0.06, 0.06, 3.8);
        boxMesh(ctx, parent, railWhiteMat, qe.px, h + 0.52, qe.pz, 0.05, 0.05, 3.8);
      }
    }
  }

  // 4. Actual-height elevated supports
  const groundY = getElevation(ctx, element.tile.x, element.tile.y);
  const supportHeight = h - groundY;

  if (supportHeight > 0.35) {
    const columnH = Math.max(0.1, supportHeight - 0.16);
    const columnCenterY = groundY + 0.16 + columnH / 2;

    for (const ox of [-1.45, 1.45]) {
      for (const oz of [-1.45, 1.45]) {
        boxMesh(ctx, parent, footingMat, x + ox, groundY + 0.08, z + oz, 0.36, 0.16, 0.36);
        boxMesh(ctx, parent, supportMat, x + ox, columnCenterY, z + oz, 0.16, columnH, 0.16);
      }
    }

    boxMesh(ctx, parent, supportMat, x, h - 0.07, z - 1.45, 3.1, 0.14, 0.18);
    boxMesh(ctx, parent, supportMat, x, h - 0.07, z + 1.45, 3.1, 0.14, 0.18);
  }
}

// ---------------------------------------------------------------------------
// 3. buildScenery
// ---------------------------------------------------------------------------

/**
 * Builds independently modelled selectable scenery on a single tile.
 * Supports sceneryType: tree, flower, hedge, lamp, fountain, rock.
 *
 * Strict spatial bounds:
 * - Footprint: strictly within 4m tile footprint ([-1.9, 1.9] from tile center)
 * - Height: tree <= 8m, flower <= 2m, hedge <= 2m, lamp <= 5m, fountain <= 3m, rock <= 2m.
 * - Performance: reusable cached materials & geometries for static batching.
 *
 * @param {object} ctx - Scene context.
 * @param {THREE.Group} parent - Parent group holding this element.
 * @param {object} e - Scenery element { id, tile, height, sceneryType, direction }.
 */
export function buildScenery(ctx, parent, e) {
  const tile = ctx.tile ?? 4;
  const half = ctx.half ?? 2;
  const x = e.tile.x * tile + half;
  const z = e.tile.y * tile + half;
  const h = (e.height / 32) * tile;
  const type = e.sceneryType || 'tree';

  // Seed for stable intra-type variety
  const seed = e.id ?? Math.floor(hash2D(e.tile.x, e.tile.y, 88) * 1000);

  // Common authored procedural textures
  const barkTex = getTex(ctx, 'tex-bark-grain', 64, 128, paintBarkGrain);
  const foliageTex = getTex(ctx, 'tex-foliage-leaf', 64, 64, paintFoliageCluster);
  const flowerSoilTex = getTex(ctx, 'tex-flowerbed-soil', 64, 64, paintFlowerBedSoil);
  const waterTex = getTex(ctx, 'tex-water-ripples', 128, 128, paintWaterRipples);

  if (type === 'tree') {
    const isOak = seed % 2 === 0;

    // Shared cached bark materials
    const barkMat = getMat(ctx, 'mat-scenery-bark', {
      map: barkTex,
      color: '#beab8e',
      roughness: 0.9
    });
    const pineBarkMat = getMat(ctx, 'mat-scenery-pine-bark', {
      map: barkTex,
      color: '#463426',
      roughness: 0.9
    });

    // Multi-shade foliage materials (opaque, enabling instanced static batching)
    const leafSun = getMat(ctx, 'mat-foliage-sunlit', {
      map: foliageTex,
      color: '#eef5c8',
      roughness: 0.82
    });
    const leafMid = getMat(ctx, 'mat-foliage-mid', {
      map: foliageTex,
      color: '#c6d8a3',
      roughness: 0.84
    });
    const leafShade = getMat(ctx, 'mat-foliage-shade', {
      map: foliageTex,
      color: '#9db582',
      roughness: 0.86
    });
    const leafDeep = getMat(ctx, 'mat-foliage-deep', {
      map: foliageTex,
      color: '#7b9269',
      roughness: 0.88
    });

    const pineSun = getMat(ctx, 'mat-pine-sunlit', {
      color: '#4b7e41',
      roughness: 0.84
    });
    const pineMid = getMat(ctx, 'mat-pine-mid', {
      color: '#3c6d36',
      roughness: 0.85
    });
    const pineShade = getMat(ctx, 'mat-pine-shade', {
      color: '#2d522c',
      roughness: 0.87
    });

    if (isOak) {
      // Grand park broadleaf oak:
      // Authored bark grain, flared base, 3 spreading scaffold boughs,
      // and asymmetrical interlocking foliage clouds in 4 distinct shades.

      // 1. Trunk and root flare
      cylinderMesh(ctx, parent, barkMat, x, h + 1.6, z, 0.44, 3.2, 0.44);
      boxMesh(ctx, parent, barkMat, x + 0.38, h + 0.25, z + 0.1, 0.34, 0.5, 0.24, 0, 0.3, -0.2);
      boxMesh(ctx, parent, barkMat, x - 0.34, h + 0.25, z + 0.24, 0.28, 0.5, 0.3, 0.2, -0.4, 0.15);
      boxMesh(ctx, parent, barkMat, x + 0.1, h + 0.25, z - 0.36, 0.32, 0.5, 0.26, -0.2, 0.5, 0);

      // 2. Visible spreading scaffold boughs (angled timber limbs)
      cylinderMesh(ctx, parent, barkMat, x + 0.48, h + 2.7, z + 0.28, 0.22, 1.4, 0.22, 0.35, 0.2, -0.45);
      cylinderMesh(ctx, parent, barkMat, x - 0.42, h + 2.8, z - 0.32, 0.2, 1.3, 0.2, -0.4, 0.3, 0.4);
      cylinderMesh(ctx, parent, barkMat, x - 0.3, h + 2.9, z + 0.45, 0.18, 1.2, 0.18, 0.45, -0.2, 0.3);

      // 3. Asymmetrical multi-shade foliage cloud clusters
      // Under-canopy deep recess shadows
      sphereMesh(ctx, parent, leafDeep, x - 0.3, h + 3.4, z + 0.4, 1.3, 0.9, 1.2);
      sphereMesh(ctx, parent, leafDeep, x + 0.4, h + 3.3, z - 0.3, 1.2, 0.85, 1.3);

      // Spreading lateral mid-canopy clumps
      sphereMesh(ctx, parent, leafMid, x + 0.75, h + 4.1, z + 0.5, 1.6, 1.35, 1.55);
      sphereMesh(ctx, parent, leafMid, x - 0.8, h + 4.2, z - 0.45, 1.5, 1.3, 1.45);
      sphereMesh(ctx, parent, leafShade, x - 0.45, h + 3.9, z + 0.8, 1.4, 1.2, 1.35);
      sphereMesh(ctx, parent, leafMid, x + 0.5, h + 4.3, z - 0.75, 1.45, 1.25, 1.4);

      // Central canopy volume
      sphereMesh(ctx, parent, leafMid, x - 0.1, h + 4.8, z + 0.1, 1.9, 1.6, 1.85);

      // Sunlit crowning apex clumps (asymmetrical sunward lift)
      sphereMesh(ctx, parent, leafSun, x + 0.25, h + 5.6, z - 0.2, 1.6, 1.4, 1.55);
      sphereMesh(ctx, parent, leafSun, x - 0.35, h + 5.2, z + 0.35, 1.3, 1.15, 1.25);
      sphereMesh(ctx, parent, leafSun, x + 0.1, h + 6.3, z + 0.05, 1.1, 0.95, 1.05);
      // Total oak height: ~6.8m <= 8m; horizontal radius ~1.6m <= 1.9m
    } else {
      // Tiered conifer pine:
      // Tapered bark trunk, flared base, 5 tiered drooping needle shelves in 3 shades.

      // 1. Straight tapered pine trunk
      cylinderMesh(ctx, parent, pineBarkMat, x, h + 2.5, z, 0.34, 5.0, 0.34);
      boxMesh(ctx, parent, pineBarkMat, x + 0.3, h + 0.2, z, 0.26, 0.4, 0.22);
      boxMesh(ctx, parent, pineBarkMat, x - 0.25, h + 0.2, z + 0.25, 0.24, 0.4, 0.26);

      // 2. Tier 1 (Lowest spreading skirt)
      coneMesh(ctx, parent, pineShade, x, h + 2.1, z, 2.15, 1.5, 2.15);
      coneMesh(ctx, parent, pineMid, x, h + 2.6, z, 2.05, 1.6, 2.05);

      // 3. Tier 2 (Mid-low shelf, slight organic offset)
      coneMesh(ctx, parent, pineShade, x + 0.05, h + 3.4, z - 0.04, 1.75, 1.5, 1.75);
      coneMesh(ctx, parent, pineMid, x - 0.03, h + 3.9, z + 0.05, 1.65, 1.5, 1.65);

      // 4. Tier 3 (Mid-high shelf)
      coneMesh(ctx, parent, pineMid, x + 0.04, h + 4.8, z + 0.02, 1.35, 1.4, 1.35);
      coneMesh(ctx, parent, pineSun, x - 0.02, h + 5.2, z - 0.03, 1.2, 1.4, 1.2);

      // 5. Tier 4 (Upper shelf)
      coneMesh(ctx, parent, pineSun, x, h + 6.0, z, 0.85, 1.3, 0.85);

      // 6. Tier 5 (Apex needle spire)
      coneMesh(ctx, parent, pineSun, x, h + 6.8, z, 0.45, 1.1, 0.45);
      // Total pine height: ~7.35m <= 8m; horizontal radius ~1.1m <= 1.9m
    }
  } else if (type === 'flower') {
    // Formal Victorian raised flower bed:
    // Low stone kerb border with corner boss stones, rich compost loam bed,
    // undulating leafy groundcover cushions, and delicate flowering stems with colorful blossoms.
    const stoneKerbMat = getMat(ctx, 'mat-flower-stone-kerb', { color: '#baa990', roughness: 0.82 });
    const soilBedMat = getMat(ctx, 'mat-flower-soil-bed', { map: flowerSoilTex, color: '#322013', roughness: 0.92 });
    const leafBaseMat = getMat(ctx, 'mat-flower-leaf-base', { color: '#386324', roughness: 0.85 });
    const leafCushionMat = getMat(ctx, 'mat-flower-leaf-cushion', { color: '#487d2f', roughness: 0.84 });
    const stemMat = getMat(ctx, 'mat-flower-stem', { color: '#2c541e', roughness: 0.86 });

    // Shared vivid petal materials (opaque for instanced batching)
    const redBloomMat = getMat(ctx, 'mat-flower-red', { color: '#c92222', roughness: 0.65 });
    const yellowBloomMat = getMat(ctx, 'mat-flower-yellow', { color: '#ebb521', roughness: 0.65 });
    const purpleBloomMat = getMat(ctx, 'mat-flower-purple', { color: '#7d3a94', roughness: 0.65 });
    const pinkBloomMat = getMat(ctx, 'mat-flower-pink', { color: '#e5678a', roughness: 0.65 });
    const whiteBloomMat = getMat(ctx, 'mat-flower-white', { color: '#f5f3e8', roughness: 0.68 });
    const stamenMat = getMat(ctx, 'mat-flower-stamen', { color: '#d69e18', roughness: 0.7 });

    // 1. Low Victorian kerb border (height 0.14m)
    boxMesh(ctx, parent, stoneKerbMat, x, h + 0.07, z, 3.6, 0.14, 3.6);
    // Raised corner boss stones
    boxMesh(ctx, parent, stoneKerbMat, x - 1.65, h + 0.11, z - 1.65, 0.32, 0.22, 0.32);
    boxMesh(ctx, parent, stoneKerbMat, x + 1.65, h + 0.11, z - 1.65, 0.32, 0.22, 0.32);
    boxMesh(ctx, parent, stoneKerbMat, x - 1.65, h + 0.11, z + 1.65, 0.32, 0.22, 0.32);
    boxMesh(ctx, parent, stoneKerbMat, x + 1.65, h + 0.11, z + 1.65, 0.32, 0.22, 0.32);

    // 2. Dark compost loam bed
    boxMesh(ctx, parent, soilBedMat, x, h + 0.11, z, 3.24, 0.12, 3.24);

    // 3. Low lush leafy groundcover bed cushions
    sphereMesh(ctx, parent, leafBaseMat, x, h + 0.18, z, 2.2, 0.22, 2.2);
    sphereMesh(ctx, parent, leafCushionMat, x + 0.85, h + 0.2, z + 0.85, 1.25, 0.24, 1.25);
    sphereMesh(ctx, parent, leafCushionMat, x - 0.85, h + 0.2, z + 0.85, 1.25, 0.24, 1.25);
    sphereMesh(ctx, parent, leafCushionMat, x + 0.85, h + 0.2, z - 0.85, 1.25, 0.24, 1.25);
    sphereMesh(ctx, parent, leafCushionMat, x - 0.85, h + 0.2, z - 0.85, 1.25, 0.24, 1.25);

    // 4. Low flowering stems and delicate blossom heads (finite deterministic variants)
    const variant = seed % 3;

    // Helper to add delicate flowering plant (stem + petals + stamen)
    const plantFlower = (ox, oz, bloomMat, stemHeight = 0.24) => {
      const fx = x + ox;
      const fz = z + oz;
      cylinderMesh(ctx, parent, stemMat, fx, h + 0.2 + stemHeight / 2, fz, 0.05, stemHeight, 0.05);
      sphereMesh(ctx, parent, bloomMat, fx, h + 0.2 + stemHeight + 0.08, fz, 0.26, 0.18, 0.26);
      sphereMesh(ctx, parent, stamenMat, fx, h + 0.2 + stemHeight + 0.15, fz, 0.1, 0.08, 0.1);
    };

    if (variant === 0) {
      // Variant 0: Formal Parterre (Scarlet Roses & Golden Marigolds with central Urn)
      cylinderMesh(ctx, parent, stoneKerbMat, x, h + 0.32, z, 0.44, 0.38, 0.44);
      sphereMesh(ctx, parent, leafCushionMat, x, h + 0.52, z, 0.5, 0.25, 0.5);
      sphereMesh(ctx, parent, whiteBloomMat, x, h + 0.65, z, 0.32, 0.2, 0.32);

      plantFlower(0.65, 0, redBloomMat);
      plantFlower(-0.65, 0, redBloomMat);
      plantFlower(0, 0.65, redBloomMat);
      plantFlower(0, -0.65, redBloomMat);

      plantFlower(1.05, 1.05, yellowBloomMat);
      plantFlower(-1.05, 1.05, purpleBloomMat);
      plantFlower(1.05, -1.05, purpleBloomMat);
      plantFlower(-1.05, -1.05, yellowBloomMat);

      plantFlower(1.15, 0, whiteBloomMat, 0.2);
      plantFlower(-1.15, 0, whiteBloomMat, 0.2);
      plantFlower(0, 1.15, whiteBloomMat, 0.2);
      plantFlower(0, -1.15, whiteBloomMat, 0.2);
    } else if (variant === 1) {
      // Variant 1: Cottage Garden Bed (Royal Violet, Coral Pink and Gold)
      cylinderMesh(ctx, parent, stoneKerbMat, x, h + 0.28, z, 0.36, 0.3, 0.36);
      sphereMesh(ctx, parent, yellowBloomMat, x, h + 0.48, z, 0.35, 0.22, 0.35);

      plantFlower(0.55, 0.55, pinkBloomMat);
      plantFlower(-0.55, 0.55, pinkBloomMat);
      plantFlower(0.55, -0.55, pinkBloomMat);
      plantFlower(-0.55, -0.55, pinkBloomMat);

      plantFlower(1.1, 0.4, purpleBloomMat);
      plantFlower(-1.1, 0.4, purpleBloomMat);
      plantFlower(1.1, -0.4, purpleBloomMat);
      plantFlower(-1.1, -0.4, purpleBloomMat);
      plantFlower(0.4, 1.1, yellowBloomMat);
      plantFlower(-0.4, 1.1, yellowBloomMat);
      plantFlower(0.4, -1.1, yellowBloomMat);
      plantFlower(-0.4, -1.1, yellowBloomMat);
    } else {
      // Variant 2: Parterre Ribbon Bed (Vibrant Scarlet, Purple and White ribbons)
      for (const ox of [-0.95, 0, 0.95]) {
        plantFlower(ox, -0.9, redBloomMat);
        plantFlower(ox, 0, purpleBloomMat);
        plantFlower(ox, 0.9, yellowBloomMat);
      }
      plantFlower(-0.5, -0.45, whiteBloomMat, 0.2);
      plantFlower(0.5, -0.45, whiteBloomMat, 0.2);
      plantFlower(-0.5, 0.45, pinkBloomMat, 0.2);
      plantFlower(0.5, 0.45, pinkBloomMat, 0.2);
    }
    // Total flower bed height: ~0.72m <= 2m; width 3.6m <= 4m
  } else if (type === 'hedge') {
    // English manicured boxwood hedge
    const hedgeMat = getMat(ctx, 'mat-scenery-hedge-leaf', { map: foliageTex, color: '#c6d8a3', roughness: 0.88 });
    const plinthMat = getMat(ctx, 'mat-scenery-hedge-plinth', { color: '#8e826e', roughness: 0.84 });

    boxMesh(ctx, parent, plinthMat, x, h + 0.06, z, 3.7, 0.12, 1.3);
    boxMesh(ctx, parent, hedgeMat, x, h + 0.7, z, 3.5, 1.25, 1.15);
    boxMesh(ctx, parent, hedgeMat, x, h + 1.35, z, 3.3, 0.18, 0.95);
    sphereMesh(ctx, parent, hedgeMat, x - 1.45, h + 1.48, z, 0.4, 0.4, 0.4);
    sphereMesh(ctx, parent, hedgeMat, x + 1.45, h + 1.48, z, 0.4, 0.4, 0.4);
    // Total hedge height: ~1.68m <= 2m
  } else if (type === 'lamp') {
    // Victorian heritage cast-iron park lantern
    const ironMat = getMat(ctx, 'mat-scenery-lamp-iron', { color: '#2b3135', roughness: 0.45, metalness: 0.75 });
    const glassMat = getMat(ctx, 'mat-scenery-lamp-glass', {
      color: '#fff5d4',
      emissive: '#f0c86e',
      emissiveIntensity: 0.85,
      roughness: 0.2
    });

    boxMesh(ctx, parent, ironMat, x, h + 0.2, z, 0.55, 0.4, 0.55);
    cylinderMesh(ctx, parent, ironMat, x, h + 1.5, z, 0.14, 2.2, 0.14);
    cylinderMesh(ctx, parent, ironMat, x, h + 2.5, z, 0.24, 0.12, 0.24);
    boxMesh(ctx, parent, glassMat, x, h + 2.85, z, 0.38, 0.5, 0.38);
    coneMesh(ctx, parent, ironMat, x, h + 3.22, z, 0.44, 0.36, 0.44);
    cylinderMesh(ctx, parent, ironMat, x, h + 3.48, z, 0.05, 0.22, 0.05);
    // Total lamp height: ~3.7m <= 5m
  } else if (type === 'fountain') {
    // Two-tier carved stone park fountain with ripple-textured basin water
    const stoneMat = getMat(ctx, 'mat-scenery-fountain-stone', { color: '#c7bea8', roughness: 0.78 });
    const basinWaterMat = getMat(ctx, 'mat-scenery-fountain-water', {
      map: waterTex,
      color: '#3490a0',
      roughness: 0.14,
      metalness: 0.06
    });
    const jetMat = getMat(ctx, 'mat-scenery-fountain-jet', {
      color: '#e2f7fa',
      roughness: 0.1,
      transparent: true,
      opacity: 0.65
    });

    cylinderMesh(ctx, parent, stoneMat, x, h + 0.25, z, 1.85, 0.5, 1.85);
    cylinderMesh(ctx, parent, basinWaterMat, x, h + 0.38, z, 1.68, 0.1, 1.68);
    cylinderMesh(ctx, parent, stoneMat, x, h + 0.8, z, 0.42, 0.9, 0.42);
    cylinderMesh(ctx, parent, stoneMat, x, h + 1.25, z, 0.95, 0.22, 0.95);
    cylinderMesh(ctx, parent, basinWaterMat, x, h + 1.34, z, 0.82, 0.08, 0.82);
    cylinderMesh(ctx, parent, stoneMat, x, h + 1.5, z, 0.2, 0.32, 0.2);

    coneMesh(ctx, parent, jetMat, x, h + 1.85, z, 0.2, 0.65, 0.2);
    for (const [dx, dz] of [[0.55, 0], [-0.55, 0], [0, 0.55], [0, -0.55]]) {
      cylinderMesh(ctx, parent, jetMat, x + dx, h + 0.85, z + dz, 0.06, 0.85, 0.06, dz ? 0.35 : 0, 0, dx ? -0.35 : 0);
    }
    // Total fountain height: ~2.5m <= 3m
  } else if (type === 'rock') {
    // Weathered granite rock formation with moss patina
    const rockMat = getMat(ctx, 'mat-scenery-rock-granite', { color: '#7a7366', roughness: 0.92 });
    const mossMat = getMat(ctx, 'mat-scenery-rock-moss', { color: '#636c4f', roughness: 0.9 });

    boxMesh(ctx, parent, rockMat, x + 0.2, h + 0.65, z - 0.1, 1.7, 1.3, 1.5, 0.12, 0.38, -0.08);
    boxMesh(ctx, parent, mossMat, x + 0.2, h + 1.28, z - 0.1, 1.3, 0.18, 1.1, 0.12, 0.38, -0.08);
    boxMesh(ctx, parent, rockMat, x - 0.85, h + 0.42, z + 0.55, 1.15, 0.84, 1.05, -0.1, -0.42, 0.12);
    boxMesh(ctx, parent, rockMat, x + 0.75, h + 0.22, z + 0.8, 0.62, 0.44, 0.55, 0.18, 0.22, 0.15);
    // Total rock height: ~1.46m <= 2m
  }
}
