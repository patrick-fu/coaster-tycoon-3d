import * as THREE from 'three';
import {fitModel} from './runtime.js';
import {
  GUEST_HAIR_BASE_HEX,
  GUEST_HEAD_BASE_HEX,
  GUEST_MATERIAL_FINISH,
  GUEST_TORSO_BASE_HEX,
  STAFF_APPEARANCE_COLORS,
  getGuestAppearance,
} from './guest-appearance.js';

// Coordinate helpers and game conventions
const rotate = (x, y, d) => [[x, y], [-y, x], [-x, -y], [y, -x]][d];

function getTerrainHeight(ctx, wx, wz) {
  if (ctx && typeof ctx.surfaceHeight === 'function') {
    const tile = ctx.tile || 4;
    const tx = Math.floor(wx / tile);
    const ty = Math.floor(wz / tile);
    const th = ctx.surfaceHeight(tx, ty);
    if (typeof th === 'number' && !Number.isNaN(th)) return th;
    const wh = ctx.surfaceHeight(wx, wz);
    if (typeof wh === 'number' && !Number.isNaN(wh)) return wh;
  }
  return 4.0;
}

function getMaterial(ctx, key, props) {
  if (ctx && typeof ctx.material === 'function') {
    return ctx.material(key, props);
  }
  return new THREE.MeshStandardMaterial(props);
}

function getGeometry(ctx, key, createFn) {
  if (ctx && typeof ctx.geometry === 'function') {
    return ctx.geometry(key, createFn);
  }
  return createFn();
}

function ownGeometry(ctx, geom) {
  if (ctx && typeof ctx.ownGeometry === 'function') {
    ctx.ownGeometry(geom);
  }
  return geom;
}

function addMesh(ctx, parent, geom, mat, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) {
  if (ctx && typeof ctx.add === 'function') {
    return ctx.add(parent, geom, mat, pos, scale, rot);
  }
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(...pos);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rot);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBox(ctx, parent, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  if (ctx && typeof ctx.box === 'function') {
    const m = ctx.box(parent, mat, x, y, z, sx, sy, sz);
    if (rx || ry || rz) m.rotation.set(rx, ry, rz);
    return m;
  }
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function addCylinder(ctx, parent, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  if (ctx && typeof ctx.cylinder === 'function') {
    const m = ctx.cylinder(parent, mat, x, y, z, sx, sy, sz);
    if (rx || ry || rz) m.rotation.set(rx, ry, rz);
    return m;
  }
  const geo = new THREE.CylinderGeometry(1, 1, 1, 8);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function addLabel(ctx, parent, text, opts) {
  if (ctx && typeof ctx.text === 'function') {
    return ctx.text(parent, text, opts);
  }
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const c2d = canvas.getContext('2d');
  if (!c2d) return null;
  c2d.fillStyle = opts.background || '#1e3d29';
  c2d.fillRect(0, 0, 256, 64);
  c2d.strokeStyle = '#e6cf8b';
  c2d.lineWidth = 4;
  c2d.strokeRect(2, 2, 252, 60);
  c2d.fillStyle = opts.color || '#fff4d6';
  c2d.font = 'bold 20px "Trebuchet MS", sans-serif';
  c2d.textAlign = 'center';
  c2d.textBaseline = 'middle';
  c2d.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(opts.width || 1.6, opts.height || 0.42), mat);
  mesh.position.set(opts.x || 0, opts.y || 0, opts.z || 0);
  if (opts.rotation) mesh.rotation.set(...opts.rotation);
  parent.add(mesh);
  return mesh;
}

// Cached station roof shingle texture
function getStationRoofMaterial(ctx) {
  let roofTexture = null;
  if (ctx && typeof ctx.texture === 'function') {
    roofTexture = ctx.texture('station_roof_shingles_v2', 256, 256, (c2d, w, h) => {
      const rows = 10;
      const cols = 6;
      const rh = h / rows;
      const cw = w / cols;
      c2d.fillStyle = '#142e1f';
      c2d.fillRect(0, 0, w, h);

      for (let r = 0; r < rows; r++) {
        const y = r * rh;
        const offset = (r % 2) * (cw / 2);
        for (let c = -1; c <= cols + 1; c++) {
          const x = c * cw + offset;
          const hVal = ((r * 13 + c * 7 + (r * c)) % 5 + 5) % 5;
          const shingleColors = ['#244f37', '#29573d', '#204932', '#2c5d42', '#26533a'];
          c2d.fillStyle = shingleColors[hVal];
          c2d.fillRect(x + 1, y + 1, cw - 2, rh - 2);

          // Restrained top lap highlight (1px gentle weather edge)
          c2d.fillStyle = '#36724e';
          c2d.fillRect(x + 1, y + 1, cw - 2, 1);

          // Bottom course lap shadow (depth under overlapping shingle course)
          c2d.fillStyle = '#0f2417';
          c2d.fillRect(x, y + rh - 2, cw, 2);

          // Subtle vertical keyway slit shadow (no bright opposite highlight)
          c2d.fillStyle = '#0d1f14';
          c2d.fillRect(x, y + 1, 1, rh - 2);

          // Subtle shingle grain texture
          c2d.fillStyle = 'rgba(255, 255, 255, 0.04)';
          c2d.fillRect(x + Math.floor(cw * 0.35), y + 2, 1, rh - 4);
          c2d.fillStyle = 'rgba(0, 0, 0, 0.06)';
          c2d.fillRect(x + Math.floor(cw * 0.68), y + 2, 1, rh - 4);
        }
      }
    });
  }
  if (roofTexture) {
    roofTexture.wrapS = THREE.RepeatWrapping;
    roofTexture.wrapT = THREE.RepeatWrapping;
  }
  return getMaterial(ctx, 'coaster_station_roof', {
    map: roofTexture,
    color: '#ffffff',
    roughness: 0.46,
    metalness: 0.08
  });
}

// Cached station wooden plank deck texture
function getStationDeckMaterial(ctx) {
  let deckTexture = null;
  if (ctx && typeof ctx.texture === 'function') {
    deckTexture = ctx.texture('station_deck_planks_v2', 256, 256, (c2d, w, h) => {
      const rows = 16;
      const rh = h / rows;
      c2d.fillStyle = '#644727';
      c2d.fillRect(0, 0, w, h);

      for (let r = 0; r < rows; r++) {
        const y = r * rh;
        const pVal = (r * 7) % 4;
        const plankColors = ['#c5a778', '#ba9d6e', '#cfb283', '#b39565'];
        c2d.fillStyle = plankColors[pVal];
        c2d.fillRect(0, y + 1, w, rh - 2);

        // Top edge bevel highlight
        c2d.fillStyle = '#e4ceaa';
        c2d.fillRect(0, y + 1, w, 1);

        // Bottom groove shadow between planks
        c2d.fillStyle = '#563c1f';
        c2d.fillRect(0, y + rh - 2, w, 2);

        // Subtle longitudinal wood grain striations
        c2d.fillStyle = 'rgba(255, 255, 255, 0.05)';
        c2d.fillRect(0, y + 5, w, 1);
        c2d.fillStyle = 'rgba(0, 0, 0, 0.07)';
        c2d.fillRect(0, y + 10, w, 1);

        // Transverse plank joints with nail/peg fasteners every 64px
        for (let bx = ((r * 48) % 64); bx < w; bx += 64) {
          c2d.fillStyle = '#483118';
          c2d.fillRect(bx, y + 1, 2, rh - 2);
          c2d.fillStyle = '#dec7a3';
          c2d.fillRect(bx + 2, y + 1, 1, rh - 2);

          // Fastener peg dots
          c2d.fillStyle = '#3a2712';
          c2d.fillRect(bx - 6, y + 3, 2, 2);
          c2d.fillRect(bx - 6, y + rh - 6, 2, 2);
        }
      }
    });
  }
  if (deckTexture) {
    deckTexture.wrapS = THREE.RepeatWrapping;
    deckTexture.wrapT = THREE.RepeatWrapping;
  }
  return getMaterial(ctx, 'coaster_station_deck', {
    map: deckTexture,
    color: '#ffffff',
    roughness: 0.74,
    metalness: 0.04
  });
}

// Cached station railing opaque lattice texture
function getStationLatticeMaterial(ctx) {
  let latticeTexture = null;
  if (ctx && typeof ctx.texture === 'function') {
    latticeTexture = ctx.texture('station_railing_lattice_v2', 128, 128, (c2d, w, h) => {
      // Warm dark backing depth behind Victorian ivory/cream diagonal diamond lattice
      c2d.fillStyle = '#322116';
      c2d.fillRect(0, 0, w, h);

      // Diagonal diamond criss-cross lattice woodwork
      const step = 16;
      c2d.lineWidth = 3;

      // First diagonal direction (\)
      for (let d = -w; d <= w * 2; d += step) {
        c2d.strokeStyle = '#22150d';
        c2d.beginPath();
        c2d.moveTo(d + 1, 0);
        c2d.lineTo(d + h + 1, h);
        c2d.stroke();

        c2d.strokeStyle = '#f4eee0';
        c2d.beginPath();
        c2d.moveTo(d, 0);
        c2d.lineTo(d + h, h);
        c2d.stroke();

        c2d.strokeStyle = '#ffffff';
        c2d.lineWidth = 1;
        c2d.beginPath();
        c2d.moveTo(d - 1, 0);
        c2d.lineTo(d + h - 1, h);
        c2d.stroke();
        c2d.lineWidth = 3;
      }

      // Opposite diagonal direction (/)
      for (let d = -w; d <= w * 2; d += step) {
        c2d.strokeStyle = '#22150d';
        c2d.beginPath();
        c2d.moveTo(d + 1, h);
        c2d.lineTo(d + h + 1, 0);
        c2d.stroke();

        c2d.strokeStyle = '#f4eee0';
        c2d.beginPath();
        c2d.moveTo(d, h);
        c2d.lineTo(d + h, 0);
        c2d.stroke();

        c2d.strokeStyle = '#ffffff';
        c2d.lineWidth = 1;
        c2d.beginPath();
        c2d.moveTo(d - 1, h);
        c2d.lineTo(d + h - 1, 0);
        c2d.stroke();
        c2d.lineWidth = 3;
      }

      // Molded framing borders top and bottom
      c2d.fillStyle = '#ede5d4';
      c2d.fillRect(0, 0, w, 4);
      c2d.fillRect(0, h - 4, w, 4);
      c2d.fillStyle = '#ffffff';
      c2d.fillRect(0, 0, w, 1);
      c2d.fillRect(0, h - 4, w, 1);
      c2d.fillStyle = '#22150d';
      c2d.fillRect(0, 3, w, 1);
      c2d.fillRect(0, h - 1, w, 1);
    });
  }
  if (latticeTexture) {
    latticeTexture.wrapS = THREE.RepeatWrapping;
    latticeTexture.wrapT = THREE.RepeatWrapping;
  }
  return getMaterial(ctx, 'coaster_station_lattice', {
    map: latticeTexture,
    color: '#ffffff',
    roughness: 0.60,
    metalness: 0.04
  });
}

// ---------------------------------------------------------------------------
// 1. buildTrack
// ---------------------------------------------------------------------------
export function buildTrack(ctx, parent, e, rules, scenery) {
  const p = rules?.pieces?.[e.piece];
  if (!p || !p.motion || !Array.isArray(p.motion.samples) || p.motion.samples.length < 2) return;

  const tile = ctx?.tile ?? 4.0;
  const half = ctx?.half ?? (tile / 2);
  const samples = p.motion.samples;

  // Derive world points from motion samples and origin
  const points = samples.map(v => {
    const [rx, rz] = rotate(v.x, v.y, e.origin.direction);
    return new THREE.Vector3(
      (e.origin.x + rx) / 32 * tile + half,
      (e.origin.z + v.z) / 32 * tile + 0.3,
      (e.origin.y + rz) / 32 * tile + half
    );
  });

  const numPoints = points.length;
  const tangents = [];
  const normals = [];
  const ups = [];
  const worldUp = new THREE.Vector3(0, 1, 0);

  // Derive true forward, up, and banked normals along the track
  for (let i = 0; i < numPoints; i++) {
    let f;
    if (i === 0) {
      f = points[1].clone().sub(points[0]);
    } else if (i === numPoints - 1) {
      f = points[i].clone().sub(points[i - 1]);
    } else {
      f = points[i + 1].clone().sub(points[i - 1]);
    }
    f.normalize();
    tangents.push(f);

    let side0 = new THREE.Vector3().crossVectors(f, worldUp);
    if (side0.lengthSq() < 0.0001) {
      side0 = new THREE.Vector3(1, 0, 0);
    } else {
      side0.normalize();
    }
    const up0 = new THREE.Vector3().crossVectors(side0, f).normalize();

    const bankDegrees = rules?.motion?.bankDegrees ?? 30;
    const t = numPoints > 1 ? i / (numPoints - 1) : 0;
    const entryBank = p.entry?.bank ?? 0;
    const endBank = p.end?.bank ?? 0;
    const bankRad = (entryBank + (endBank - entryBank) * t) * bankDegrees * Math.PI / 180;

    const normal = side0.clone().multiplyScalar(Math.cos(bankRad)).addScaledVector(up0, Math.sin(bankRad)).normalize();
    const up = side0.clone().multiplyScalar(-Math.sin(bankRad)).addScaledVector(up0, Math.cos(bankRad)).normalize();

    normals.push(normal);
    ups.push(up);
  }

  // Materials
  const railMat = getMaterial(ctx, `coaster_rail_${e.ride%3}`, {
    color: ['#be1e2d','#168096','#d08c22'][e.ride%3],
    roughness: 0.32,
    metalness: 0.22
  });
  const spineMat = getMaterial(ctx, 'coaster_spine_cream', {
    color: '#eee9da',
    roughness: 0.48,
    metalness: 0.16
  });
  const supportMat = getMaterial(ctx, 'coaster_support_green', {
    color: '#214732',
    roughness: 0.50,
    metalness: 0.18
  });
  const footerMat = getMaterial(ctx, 'coaster_footer_concrete', {
    color: '#9aa095',
    roughness: 0.88,
    metalness: 0.05
  });
  const collarMat = getMaterial(ctx, 'coaster_footer_collar', {
    color: '#1a3827',
    roughness: 0.52,
    metalness: 0.22
  });

  const railGauge = 0.52;
  const spineDepth = 0.22;

  const leftRailPoints = points.map((pt, i) => pt.clone().addScaledVector(normals[i], -railGauge));
  const rightRailPoints = points.map((pt, i) => pt.clone().addScaledVector(normals[i], railGauge));
  const spinePoints = points.map((pt, i) => pt.clone().addScaledVector(ups[i], -spineDepth));

  function makeCurvePath(pts) {
    const cp = new THREE.CurvePath();
    for (let i = 1; i < pts.length; i++) {
      cp.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
    }
    return cp;
  }

  // Twin ruby-red rails TubeGeometry
  const tubularSegments = Math.max(16, Math.min(64, numPoints * 2));
  const leftCurve = makeCurvePath(leftRailPoints);
  const rightCurve = makeCurvePath(rightRailPoints);
  const spineCurve = makeCurvePath(spinePoints);

  const leftRailGeo = ownGeometry(ctx, new THREE.TubeGeometry(leftCurve, tubularSegments, 0.058, 6, false));
  const rightRailGeo = ownGeometry(ctx, new THREE.TubeGeometry(rightCurve, tubularSegments, 0.058, 6, false));
  const spineGeo = ownGeometry(ctx, new THREE.TubeGeometry(spineCurve, tubularSegments, 0.076, 6, false));

  const leftRailMesh = new THREE.Mesh(leftRailGeo, railMat);
  leftRailMesh.castShadow = true;
  parent.add(leftRailMesh);

  const rightRailMesh = new THREE.Mesh(rightRailGeo, railMat);
  rightRailMesh.castShadow = true;
  parent.add(rightRailMesh);

  const spineMesh = new THREE.Mesh(spineGeo, spineMat);
  spineMesh.castShadow = true;
  parent.add(spineMesh);

  // Cross ties: sampling max ~12 per straight (length 4m -> spacing ~0.35m)
  let totalLength = 0;
  for (let i = 1; i < numPoints; i++) {
    totalLength += points[i].distanceTo(points[i - 1]);
  }
  const tieCount = Math.max(3, Math.min(36, Math.round(totalLength / 0.35)));

  // Shared tie unit geometry
  const tieGeom = getGeometry(ctx, 'coaster_tie_unit_v1', () => {
    const tg = new THREE.BufferGeometry();
    const posArr = [];
    const normArr = [];

    function addBoxVertices(cx, cy, cz, sx, sy, sz) {
      const hx = sx / 2, hy = sy / 2, hz = sz / 2;
      const faces = [
        // front (+Z)
        { norm: [0, 0, 1], quad: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]] },
        // back (-Z)
        { norm: [0, 0, -1], quad: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]] },
        // top (+Y)
        { norm: [0, 1, 0], quad: [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]] },
        // bottom (-Y)
        { norm: [0, -1, 0], quad: [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]] },
        // right (+X)
        { norm: [1, 0, 0], quad: [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]] },
        // left (-X)
        { norm: [-1, 0, 0], quad: [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]] }
      ];
      for (const f of faces) {
        const [a, b, c, d] = f.quad;
        posArr.push(
          cx + a[0], cy + a[1], cz + a[2],
          cx + b[0], cy + b[1], cz + b[2],
          cx + c[0], cy + c[1], cz + c[2],
          cx + a[0], cy + a[1], cz + a[2],
          cx + c[0], cy + c[1], cz + c[2],
          cx + d[0], cy + d[1], cz + d[2]
        );
        for (let k = 0; k < 6; k++) {
          normArr.push(...f.norm);
        }
      }
    }

    // Top crossbar connecting rails
    addBoxVertices(0, -0.01, 0, 1.16, 0.05, 0.11);
    // Vertical strut down to spine
    addBoxVertices(0, -0.11, 0, 0.09, 0.19, 0.09);
    // Left diagonal strut
    addBoxVertices(-0.25, -0.10, 0, 0.06, 0.16, 0.07);
    // Right diagonal strut
    addBoxVertices(0.25, -0.10, 0, 0.06, 0.16, 0.07);

    tg.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    tg.setAttribute('normal', new THREE.Float32BufferAttribute(normArr, 3));
    return tg;
  });

  const rotMatrix = new THREE.Matrix4();
  const tieGroup = new THREE.Group();
  parent.add(tieGroup);

  for (let k = 0; k <= tieCount; k++) {
    const frac = k / tieCount;
    const indexF = frac * (numPoints - 1);
    const i0 = Math.floor(indexF);
    const i1 = Math.min(numPoints - 1, i0 + 1);
    const mix = indexF - i0;

    const pPos = points[i0].clone().lerp(points[i1], mix);
    const pNorm = normals[i0].clone().lerp(normals[i1], mix).normalize();
    const pUp = ups[i0].clone().lerp(ups[i1], mix).normalize();
    const pF = tangents[i0].clone().lerp(tangents[i1], mix).normalize();

    rotMatrix.makeBasis(pNorm, pUp, pF.clone().negate());
    rotMatrix.setPosition(pPos);

    const tieMesh = new THREE.Mesh(tieGeom, spineMat);
    tieMesh.applyMatrix4(rotMatrix);
    tieMesh.castShadow = true;
    tieGroup.add(tieMesh);
  }

  // Lift piece chain & rack detail
  const isLift = Boolean(p.motion?.chain || e.piece?.startsWith('lift'));
  if (isLift) {
    const chainTroughMat = getMaterial(ctx, 'coaster_chain_trough', {
      color: '#2b2d30',
      roughness: 0.65,
      metalness: 0.45
    });
    const chainLinkMat = getMaterial(ctx, 'coaster_chain_link', {
      color: '#e2b33c',
      roughness: 0.35,
      metalness: 0.60
    });

    const chainPoints = points.map((pt, i) => pt.clone().addScaledVector(ups[i], -0.06));
    const chainCurve = makeCurvePath(chainPoints);
    const troughGeo = ownGeometry(ctx, new THREE.TubeGeometry(chainCurve, Math.max(12, numPoints), 0.038, 4, false));
    const troughMesh = new THREE.Mesh(troughGeo, chainTroughMat);
    troughMesh.castShadow = true;
    parent.add(troughMesh);

    // Chain teeth / dog catchers along lift
    for (let k = 0; k < tieCount; k++) {
      const frac = (k + 0.5) / tieCount;
      const indexF = frac * (numPoints - 1);
      const i0 = Math.floor(indexF);
      const i1 = Math.min(numPoints - 1, i0 + 1);
      const mix = indexF - i0;
      const pPos = points[i0].clone().lerp(points[i1], mix).addScaledVector(ups[i0], -0.03);
      const pNorm = normals[i0].clone().lerp(normals[i1], mix).normalize();
      const pUp = ups[i0].clone().lerp(ups[i1], mix).normalize();
      const pF = tangents[i0].clone().lerp(tangents[i1], mix).normalize();

      rotMatrix.makeBasis(pNorm, pUp, pF.clone().negate());
      rotMatrix.setPosition(pPos);

      const toothMesh = addBox(ctx, parent, chainLinkMat, 0, 0, 0, 0.09, 0.06, 0.16);
      toothMesh.applyMatrix4(rotMatrix);
    }
  }

  // Brake piece friction fins detail
  const isBrake = Boolean(p.motion?.brake !== null && p.motion?.brake !== undefined || e.piece === 'brake');
  if (isBrake) {
    const brakeFinMat = getMaterial(ctx, 'coaster_brake_fin', {
      color: '#824c28',
      roughness: 0.48,
      metalness: 0.40
    });
    const brakeBracketMat = getMaterial(ctx, 'coaster_brake_mount', {
      color: '#34373b',
      roughness: 0.65,
      metalness: 0.30
    });

    for (let k = 1; k < tieCount; k += 2) {
      const frac = k / tieCount;
      const indexF = frac * (numPoints - 1);
      const i0 = Math.floor(indexF);
      const i1 = Math.min(numPoints - 1, i0 + 1);
      const mix = indexF - i0;
      const pPos = points[i0].clone().lerp(points[i1], mix);
      const pNorm = normals[i0].clone().lerp(normals[i1], mix).normalize();
      const pUp = ups[i0].clone().lerp(ups[i1], mix).normalize();
      const pF = tangents[i0].clone().lerp(tangents[i1], mix).normalize();

      rotMatrix.makeBasis(pNorm, pUp, pF.clone().negate());

      // Dual copper/bronze friction fins
      for (const side of [-0.08, 0.08]) {
        const finPos = pPos.clone().addScaledVector(pNorm, side).addScaledVector(pUp, 0.08);
        const fin = addBox(ctx, parent, brakeFinMat, 0, 0, 0, 0.024, 0.18, 0.55);
        rotMatrix.setPosition(finPos);
        fin.applyMatrix4(rotMatrix);
      }

      // Mounting bracket on cross tie
      const mountPos = pPos.clone().addScaledVector(pUp, -0.05);
      const mount = addBox(ctx, parent, brakeBracketMat, 0, 0, 0, 0.28, 0.08, 0.22);
      rotMatrix.setPosition(mountPos);
      mount.applyMatrix4(rotMatrix);
    }
  }

  // Supports: tubular green columns with flanged bases & bracing at actual terrain height
  const supportStep = Math.max(1, Math.floor(numPoints / 3));
  for (let i = 0; i < numPoints; i += supportStep) {
    const v = points[i];
    const spineBot = v.clone().addScaledVector(ups[i], -spineDepth);
    const terrainH = getTerrainHeight(ctx, v.x, v.z);
    const columnHeight = spineBot.y - terrainH;

    if (columnHeight > 0.45) {
      const colY = terrainH + columnHeight / 2;
      addCylinder(ctx, parent, supportMat, v.x, colY, v.z, 0.28, columnHeight, 0.28);

      // Flanged base at terrain level: concrete footer + steel collar
      addCylinder(ctx, parent, footerMat, v.x, terrainH + 0.12, v.z, 0.65, 0.24, 0.65);
      addCylinder(ctx, parent, collarMat, v.x, terrainH + 0.27, v.z, 0.46, 0.08, 0.46);

      // Structural diagonal bracing for elevated track
      if (columnHeight > 3.8) {
        const braceY = terrainH + columnHeight * 0.55;
        const norm = normals[i];
        for (const side of [-1, 1]) {
          const topBrace = spineBot.clone().addScaledVector(norm, side * 0.48);
          const botBrace = new THREE.Vector3(v.x, braceY, v.z);
          const dir = topBrace.clone().sub(botBrace);
          const braceLen = dir.length();
          const mid = botBrace.clone().addScaledVector(dir, 0.5);

          const braceMesh = addCylinder(ctx, parent, supportMat, mid.x, mid.y, mid.z, 0.13, braceLen, 0.13);
          const q = new THREE.Quaternion().setFromUnitVectors(worldUp, dir.clone().normalize());
          braceMesh.quaternion.copy(q);
        }
      }
    }
  }

  // Station: deck, yellow safety markings, cedar posts, deep green pitched canopy
  if (p.station) {
    const [rx, rz] = rotate(16, 0, e.origin.direction);
    const stationX = (e.origin.x + rx) / 32 * tile + half;
    const stationZ = (e.origin.y + rz) / 32 * tile + half;
    const deckBaseY = e.origin.z / 32 * tile;
    const deckY = deckBaseY + 0.14;

    const deckMat = getStationDeckMaterial(ctx);
    const deckTrimMat = getMaterial(ctx, 'coaster_station_deck_trim', {
      color: '#764524',
      roughness: 0.70,
      metalness: 0.06
    });
    const yellowHazardMat = getMaterial(ctx, 'coaster_safety_yellow', {
      color: '#f5c324',
      roughness: 0.36
    });
    const hazardStripeMat = getMaterial(ctx, 'coaster_safety_stripe', {
      color: '#2a261c',
      roughness: 0.74
    });
    const cedarPostMat = getMaterial(ctx, 'coaster_cedar_post', {
      color: '#834e2c',
      roughness: 0.68
    });
    const cedarTrimMat = getMaterial(ctx, 'coaster_cedar_trim', {
      color: '#925832',
      roughness: 0.64
    });
    const latticeMat = getStationLatticeMaterial(ctx);
    const roofMat = getStationRoofMaterial(ctx);
    const stoneMat = getMaterial(ctx, 'coaster_plinth_stone', {
      color: '#aca493',
      roughness: 0.86,
      metalness: 0.05
    });
    const brassMat = getMaterial(ctx, 'coaster_brass_accent', {
      color: '#d4af37',
      roughness: 0.32,
      metalness: 0.78
    });
    const paintedCreamMat = getMaterial(ctx, 'coaster_painted_cream', {
      color: '#eee8d7',
      roughness: 0.60
    });
    const ironMat = getMaterial(ctx, 'coaster_station_iron_bracket', {
      color: '#34383c',
      roughness: 0.54,
      metalness: 0.65
    });

    const rotY = -e.origin.direction * Math.PI / 2;

    const stationWrapper = new THREE.Group();
    parent.add(stationWrapper);
    const stationGroup = new THREE.Group();
    stationGroup.position.set(stationX, deckY, stationZ);
    stationGroup.rotation.y = rotY;
    stationWrapper.add(stationGroup);

    // 1. Platform deck: wooden plank boarding platform
    addBox(ctx, stationGroup, deckMat, 0, -0.06, 0, 3.96, 0.16, 3.82);

    // Finished dark cedar perimeter curb framing the platform footprint
    addBox(ctx, stationGroup, deckTrimMat, 0, 0.03, -1.88, 3.96, 0.06, 0.08);
    addBox(ctx, stationGroup, deckTrimMat, 0, 0.03, 1.88, 3.96, 0.06, 0.08);
    addBox(ctx, stationGroup, deckTrimMat, -1.94, 0.03, 0, 0.08, 0.06, 3.82);
    addBox(ctx, stationGroup, deckTrimMat, 1.94, 0.03, 0, 0.08, 0.06, 3.82);

    // Restrained iron corner plates joining the perimeter curb framing (4 boxes)
    for (const px of [-1.94, 1.94]) {
      for (const pz of [-1.88, 1.88]) {
        addBox(ctx, stationGroup, ironMat, px, 0.032, pz, 0.09, 0.064, 0.09);
      }
    }

    // Yellow safety markings along track boarding edges with hazard border
    for (const zSide of [-0.95, 0.95]) {
      addBox(ctx, stationGroup, yellowHazardMat, 0, 0.025, zSide, 3.96, 0.02, 0.14);
      addBox(ctx, stationGroup, hazardStripeMat, 0, 0.026, zSide + (zSide > 0 ? 0.08 : -0.08), 3.96, 0.02, 0.03);
    }

    // 2. Structural cedar timber posts with plinths, capitals, knee braces & restrained accents
    const postHeight = 3.35;
    for (const px of [-1.82, 1.82]) {
      for (const pz of [-1.75, 1.75]) {
        // Stone plinth footer
        addBox(ctx, stationGroup, stoneMat, px, 0.10, pz, 0.30, 0.20, 0.30);
        // Restrained structural iron plinth collar
        addBox(ctx, stationGroup, ironMat, px, 0.21, pz, 0.24, 0.03, 0.24);
        // Cedar timber post shaft
        addBox(ctx, stationGroup, cedarPostMat, px, 0.22 + (postHeight - 0.28) / 2, pz, 0.20, postHeight - 0.28, 0.20);
        // Timber capital block at top of post
        addBox(ctx, stationGroup, cedarTrimMat, px, postHeight - 0.04, pz, 0.26, 0.10, 0.26);
        // Restrained brass capital collar
        addBox(ctx, stationGroup, brassMat, px, postHeight - 0.10, pz, 0.22, 0.03, 0.22);
      }
    }

    // Diagonal knee braces (corbels) connecting posts to longitudinal roof plate beam
    for (const pz of [-1.75, 1.75]) {
      addBox(ctx, stationGroup, cedarTrimMat, -1.55, postHeight - 0.25, pz, 0.38, 0.08, 0.12, 0, 0, Math.PI / 4);
      addBox(ctx, stationGroup, cedarTrimMat, 1.55, postHeight - 0.25, pz, 0.38, 0.08, 0.12, 0, 0, -Math.PI / 4);
    }

    // 3. Platform Railings & Boarding Gates
    let openNegZ = false;
    let openPosZ = false;
    if (Array.isArray(scenery?.elements)) {
      const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      for (const portal of scenery.elements) {
        if (
          portal?.kind === 'portal' &&
          portal.ride === e.ride &&
          portal.station === e.id &&
          (portal.role === 'entrance' || portal.role === 'exit') &&
          portal.height === e.origin.z &&
          (portal.direction % 2) !== (e.origin.direction % 2)
        ) {
          const offset = directions[portal.direction];
          if (
            offset &&
            portal.tile &&
            (portal.tile.x + offset[0]) * 32 === e.origin.x &&
            (portal.tile.y + offset[1]) * 32 === e.origin.y
          ) {
            const relDir = (portal.direction - e.origin.direction + 4) % 4;
            if (relDir === 1) openNegZ = true;
            else if (relDir === 3) openPosZ = true;
          }
        }
      }
    }

    for (const zSide of [1.75, -1.75]) {
      const open = zSide > 0 ? openPosZ : openNegZ;
      if (open) {
        for (const wx of [-1.35, 1.35]) {
          addBox(ctx, stationGroup, latticeMat, wx, 0.62, zSide, 0.74, 0.98, 0.05);
          addBox(ctx, stationGroup, cedarPostMat, wx, 1.18, zSide, 0.88, 0.08, 0.12);
          addBox(ctx, stationGroup, cedarTrimMat, wx, 0.12, zSide, 0.88, 0.08, 0.10);
          const postX = wx < 0 ? -0.90 : 0.90;
          addBox(ctx, stationGroup, cedarPostMat, postX, 0.65, zSide, 0.10, 1.15, 0.10);
          addBox(ctx, stationGroup, brassMat, postX, 1.25, zSide, 0.07, 0.07, 0.07);
        }
      } else {
        addBox(ctx, stationGroup, latticeMat, 0, 0.62, zSide, 3.30, 0.98, 0.05);
        addBox(ctx, stationGroup, cedarPostMat, 0, 1.18, zSide, 3.44, 0.08, 0.12);
        addBox(ctx, stationGroup, cedarTrimMat, 0, 0.12, zSide, 3.44, 0.08, 0.10);
        for (const rpx of [-0.90, 0, 0.90]) {
          addBox(ctx, stationGroup, cedarPostMat, rpx, 0.65, zSide, 0.10, 1.15, 0.10);
          addBox(ctx, stationGroup, brassMat, rpx, 1.25, zSide, 0.07, 0.07, 0.07);
        }
      }
    }

    // 4. Roof Structure, Timber Trusses & Finished Cornice
    const canopyBaseY = postHeight + 0.10;
    const roofRidgeY = canopyBaseY + 0.95;

    // Longitudinal eaves plate beams connecting posts along X
    for (const pz of [-1.75, 1.75]) {
      addBox(ctx, stationGroup, cedarPostMat, 0, canopyBaseY - 0.06, pz, 3.96, 0.14, 0.18);
    }
    // Transverse tie beams spanning across at post lines
    for (const px of [-1.82, 0, 1.82]) {
      addBox(ctx, stationGroup, cedarPostMat, px, canopyBaseY - 0.06, 0, 0.14, 0.14, 3.60);
    }
    // Restrained structural iron bracket plates joining posts, eaves beams and tie beams (4 boxes)
    for (const px of [-1.82, 1.82]) {
      for (const pz of [-1.75, 1.75]) {
        addBox(ctx, stationGroup, ironMat, px, canopyBaseY - 0.06, pz, 0.18, 0.16, 0.20);
      }
    }

    // Open Timber Gable Trusses at the station ends (px = -1.90 and 1.90)
    for (const px of [-1.90, 1.90]) {
      // King post at center apex rising from tie beam to ridge
      addBox(ctx, stationGroup, cedarTrimMat, px, canopyBaseY + 0.44, 0, 0.10, 0.88, 0.10);
      // Restrained structural iron collar plate at apex
      addBox(ctx, stationGroup, ironMat, px, canopyBaseY + 0.86, 0, 0.12, 0.05, 0.12);
      // Diagonal collar strut braces
      addBox(ctx, stationGroup, cedarTrimMat, px, canopyBaseY + 0.40, -0.65, 0.08, 0.58, 0.08, Math.PI / 4, 0, 0);
      addBox(ctx, stationGroup, cedarTrimMat, px, canopyBaseY + 0.40, 0.65, 0.08, 0.58, 0.08, -Math.PI / 4, 0, 0);
    }

    // Finished cornice molding and painted fascia trim under the eaves
    for (const pz of [-1.92, 1.92]) {
      addBox(ctx, stationGroup, paintedCreamMat, 0, canopyBaseY + 0.04, pz, 3.96, 0.10, 0.06);
      addBox(ctx, stationGroup, cedarTrimMat, 0, canopyBaseY - 0.02, pz, 3.96, 0.05, 0.08);
    }

    // Sloped roof panels (left & right slope) with authored vibrant shingle texture
    const roofSlopeLen = Math.hypot(1.95, 0.95);
    const roofAngle = Math.atan2(0.95, 1.95);

    // Left pitched shingle plane
    const leftRoof = addBox(ctx, stationGroup, roofMat, 0, canopyBaseY + 0.48, -0.98, 4.00, 0.08, roofSlopeLen);
    leftRoof.rotation.x = -roofAngle;

    // Right pitched shingle plane
    const rightRoof = addBox(ctx, stationGroup, roofMat, 0, canopyBaseY + 0.48, 0.98, 4.00, 0.08, roofSlopeLen);
    rightRoof.rotation.x = roofAngle;

    // Finished gable bargeboards along the angled roof edges
    for (const px of [-1.96, 1.96]) {
      const bLeft = addBox(ctx, stationGroup, cedarTrimMat, px, canopyBaseY + 0.50, -0.98, 0.06, 0.10, roofSlopeLen);
      bLeft.rotation.x = -roofAngle;
      const bRight = addBox(ctx, stationGroup, cedarTrimMat, px, canopyBaseY + 0.50, 0.98, 0.06, 0.10, roofSlopeLen);
      bRight.rotation.x = roofAngle;
    }

    // Ridge cap along apex with restrained brass end finials
    addBox(ctx, stationGroup, cedarTrimMat, 0, roofRidgeY + 0.05, 0, 4.00, 0.10, 0.28);
    for (const fpx of [-1.96, 1.96]) {
      addBox(ctx, stationGroup, brassMat, fpx, roofRidgeY + 0.14, 0, 0.08, 0.12, 0.08);
    }

    // 5. Correctly facing ride name sign using ctx.text
    const ride = ctx?.packet?.rides?.find(r => r.id === e.ride);
    const rideName = (ride?.name ?? 'Coaster').toUpperCase();
    const trackIdx = ride?.track ? ride.track.indexOf(e.id) : -1;
    const isMarqueeTile = (trackIdx === 1) || (trackIdx === 0 && (!ride?.track || ride.track.length <= 2)) || (trackIdx === -1);

    if (isMarqueeTile) {
      // Approach / queue side marquee sign (-Z side, facing approaching guests):
      // In Three.js, a PlaneGeometry rotated by [0, Math.PI, 0] has normal pointing towards -Z,
      // with left (U=0) at +X and right (U=1) at -X, perfectly readable left-to-right for a viewer at -Z.
      addBox(ctx, stationGroup, cedarTrimMat, 0, canopyBaseY + 0.12, -1.95, 2.30, 0.50, 0.06);
      addBox(ctx, stationGroup, brassMat, 0, canopyBaseY + 0.12, -1.96, 2.36, 0.54, 0.04);
      addLabel(ctx, stationGroup, rideName, {
        x: 0,
        y: canopyBaseY + 0.12,
        z: -1.99,
        width: 2.20,
        height: 0.42,
        color: '#fff5d4',
        background: '#1d462b',
        rotation: [0, Math.PI, 0]
      });

      // Camera / overview side marquee sign (+Z side, facing south overview):
      // Rotation [0, 0, 0] has normal pointing towards +Z, perfectly readable left-to-right for a viewer at +Z.
      addBox(ctx, stationGroup, cedarTrimMat, 0, canopyBaseY + 0.12, 1.95, 2.30, 0.50, 0.06);
      addBox(ctx, stationGroup, brassMat, 0, canopyBaseY + 0.12, 1.96, 2.36, 0.54, 0.04);
      addLabel(ctx, stationGroup, rideName, {
        x: 0,
        y: canopyBaseY + 0.12,
        z: 1.99,
        width: 2.20,
        height: 0.42,
        color: '#fff5d4',
        background: '#1d462b',
        rotation: [0, 0, 0]
      });
    }
    fitModel(stationWrapper,{x:e.origin.x/32*tile+half,z:e.origin.y/32*tile+half,low:deckBaseY,height:2,tile});
  }
}

// ---------------------------------------------------------------------------
// 2. buildPortal
// ---------------------------------------------------------------------------
export function buildPortal(ctx, parent, e, ride) {
  const tile = ctx?.tile ?? 4.0;
  const half = ctx?.half ?? (tile / 2);

  const posX = e.tile.x * tile + half;
  const posZ = e.tile.y * tile + half;
  const posY = e.height / 32 * tile;
  const isEntrance = (e.role === 'entrance');

  const rotY = -e.direction * Math.PI / 2;
  const portalGroup = new THREE.Group();
  portalGroup.position.set(posX, posY, posZ);
  portalGroup.rotation.y = rotY;
  parent.add(portalGroup);

  const hutMat = getMaterial(ctx, isEntrance ? 'portal_hut_entrance' : 'portal_hut_exit', {
    color: isEntrance ? '#c87928' : '#336a46',
    roughness: 0.65,
    metalness: 0.10
  });
  const cedarMat = getMaterial(ctx, 'portal_cedar_timber', {
    color: '#824c29',
    roughness: 0.70
  });
  const cedarTrimMat = getMaterial(ctx, 'coaster_cedar_trim', {
    color: '#925832',
    roughness: 0.64
  });
  const trellisMat = getStationLatticeMaterial(ctx);
  const roofMat = getStationRoofMaterial(ctx);
  const deckMat = getStationDeckMaterial(ctx);
  const deckTrimMat = getMaterial(ctx, 'coaster_station_deck_trim', {
    color: '#764524',
    roughness: 0.70,
    metalness: 0.06
  });
  const stoneMat = getMaterial(ctx, 'coaster_plinth_stone', {
    color: '#aca493',
    roughness: 0.86,
    metalness: 0.05
  });
  const brassMat = getMaterial(ctx, 'coaster_brass_accent', {
    color: '#d4af37',
    roughness: 0.32,
    metalness: 0.78
  });
  const metalMat = getMaterial(ctx, 'portal_turnstile_metal', {
    color: '#869096',
    roughness: 0.35,
    metalness: 0.75
  });

  // 1. Foundation & Flooring
  addBox(ctx, portalGroup, stoneMat, 0, 0.02, 0, 2.38, 0.05, 2.38);
  addBox(ctx, portalGroup, deckMat, 0, 0.06, 0, 2.30, 0.10, 2.30);
  addBox(ctx, portalGroup, deckTrimMat, 0, 0.11, -1.10, 2.30, 0.04, 0.08);
  addBox(ctx, portalGroup, deckTrimMat, 0, 0.11, 1.10, 2.30, 0.04, 0.08);
  const thresholdLen = (Number.isFinite(ctx?.tile) && ctx.tile > 0 ? ctx.tile : 4.0) / 2 - 1.15;
  if (thresholdLen > 0) {
    addBox(ctx, portalGroup, deckMat, -1.15 - thresholdLen / 2, 0.06, 0, thresholdLen, 0.10, 1.75);
  }

  // 2. Corner Posts with stone plinths, brass collars and capitals
  const postH = 2.85;
  for (const px of [-0.95, 0.95]) {
    for (const pz of [-0.95, 0.95]) {
      addBox(ctx, portalGroup, stoneMat, px, 0.10, pz, 0.24, 0.20, 0.24);
      addBox(ctx, portalGroup, brassMat, px, 0.20, pz, 0.20, 0.03, 0.20);
      addBox(ctx, portalGroup, cedarMat, px, 0.21 + (postH - 0.26) / 2, pz, 0.16, postH - 0.26, 0.16);
      addBox(ctx, portalGroup, cedarTrimMat, px, postH - 0.04, pz, 0.22, 0.08, 0.22);
      addBox(ctx, portalGroup, brassMat, px, postH - 0.09, pz, 0.18, 0.03, 0.18);
    }
  }

  // 3. Side Walls (Z = -0.95 and +0.95): molded wainscot below, authored lattice above
  for (const pz of [-0.95, 0.95]) {
    addBox(ctx, portalGroup, cedarTrimMat, 0, 0.14, pz, 1.75, 0.08, 0.10);
    addBox(ctx, portalGroup, hutMat, 0, 0.38, pz, 1.75, 0.50, 0.08);
    addBox(ctx, portalGroup, cedarTrimMat, 0, 0.65, pz, 1.75, 0.06, 0.10);
    addBox(ctx, portalGroup, trellisMat, 0, 1.48, pz, 1.75, 1.58, 0.05);
    addBox(ctx, portalGroup, cedarMat, 0, 2.30, pz, 1.75, 0.08, 0.12);
  }

  // 4. Open Approach & Station Passages (BOTH ENDS REMAIN FULLY OPEN)
  // Public approach lintel at px = -0.95 (facing approaching guests):
  addBox(ctx, portalGroup, hutMat, -0.95, 2.45, 0, 0.14, 0.70, 1.75);
  addBox(ctx, portalGroup, cedarMat, -0.95, 2.10, 0, 0.18, 0.10, 1.75);
  addBox(ctx, portalGroup, cedarTrimMat, -0.95, 1.95, -0.72, 0.14, 0.22, 0.10);
  addBox(ctx, portalGroup, cedarTrimMat, -0.95, 1.95, 0.72, 0.14, 0.22, 0.10);

  // Station doorway lintel at px = +0.95 (facing station platform):
  addBox(ctx, portalGroup, hutMat, 0.95, 2.45, 0, 0.14, 0.70, 1.75);
  addBox(ctx, portalGroup, cedarMat, 0.95, 2.10, 0, 0.18, 0.10, 1.75);
  addBox(ctx, portalGroup, cedarTrimMat, 0.95, 1.95, -0.72, 0.14, 0.22, 0.10);
  addBox(ctx, portalGroup, cedarTrimMat, 0.95, 1.95, 0.72, 0.14, 0.22, 0.10);

  // 5. Restrained Mechanical Turnstile / Gate Detail
  if (isEntrance) {
    // Mechanical turnstile stanchion with polished brass finial
    addCylinder(ctx, portalGroup, metalMat, 0.85, 0.48, 0, 0.12, 0.84, 0.12);
    addCylinder(ctx, portalGroup, brassMat, 0.85, 0.92, 0, 0.14, 0.06, 0.14);
    addBox(ctx, portalGroup, brassMat, 0.85, 0.98, 0, 0.08, 0.08, 0.08);
    // 3-arm turnstile rotor
    addBox(ctx, portalGroup, metalMat, 0.85, 0.78, 0, 0.58, 0.05, 0.05);
    addBox(ctx, portalGroup, metalMat, 0.85, 0.78, 0, 0.05, 0.05, 0.58);

    // Static operator nook against south side wall (Z = +0.95), preserving open passage (6 boxes)
    const nookIronMat = getMaterial(ctx, 'coaster_station_iron_bracket', {
      color: '#34383c',
      roughness: 0.54,
      metalness: 0.65
    });
    const nookConsoleMat = getMaterial(ctx, 'portal_operator_console', {
      color: '#262f28',
      roughness: 0.44,
      metalness: 0.32
    });
    addBox(ctx, portalGroup, cedarTrimMat, -0.05, 0.48, 0.83, 0.72, 0.62, 0.16);
    addBox(ctx, portalGroup, cedarMat, -0.05, 0.81, 0.81, 0.80, 0.04, 0.20);
    addBox(ctx, portalGroup, nookConsoleMat, -0.05, 0.88, 0.82, 0.44, 0.10, 0.16);
    addBox(ctx, portalGroup, brassMat, -0.05, 0.89, 0.73, 0.36, 0.06, 0.02);
    addBox(ctx, portalGroup, cedarTrimMat, -0.05, 1.38, 0.91, 0.84, 0.76, 0.04);
    addBox(ctx, portalGroup, nookIronMat, -0.22, 1.45, 0.87, 0.22, 0.16, 0.08);
  } else {
    // Exit one-way swinging gate stanchion and barrier arm
    addCylinder(ctx, portalGroup, metalMat, 0.85, 0.48, 0, 0.10, 0.84, 0.10);
    addBox(ctx, portalGroup, cedarTrimMat, 0.85, 0.78, 0, 0.58, 0.06, 0.05);
    addBox(ctx, portalGroup, brassMat, 0.85, 0.78, 0, 0.12, 0.08, 0.08);
  }

  // 6. Peaked Canopy Roof with Authored Shingles, Bargeboards and Finials
  const roofBaseY = postH;
  const roofRidgeY = roofBaseY + 0.90;

  const slopeLen = Math.hypot(1.30, 0.90);
  const slopeAngle = Math.atan2(0.90, 1.30);

  const frontRoof = addBox(ctx, portalGroup, roofMat, 0, roofBaseY + 0.45, 0.68, 2.50, 0.08, slopeLen);
  frontRoof.rotation.x = slopeAngle;

  const backRoof = addBox(ctx, portalGroup, roofMat, 0, roofBaseY + 0.45, -0.68, 2.50, 0.08, slopeLen);
  backRoof.rotation.x = -slopeAngle;

  // Finished cedar bargeboards along roof slopes
  for (const px of [-1.22, 1.22]) {
    const fR = addBox(ctx, portalGroup, cedarTrimMat, px, roofBaseY + 0.47, 0.68, 0.06, 0.10, slopeLen);
    fR.rotation.x = slopeAngle;
    const bR = addBox(ctx, portalGroup, cedarTrimMat, px, roofBaseY + 0.47, -0.68, 0.06, 0.10, slopeLen);
    bR.rotation.x = -slopeAngle;
  }

  // Roof gable caps
  addBox(ctx, portalGroup, hutMat, 0.95, roofBaseY + 0.40, 0, 0.10, 0.80, 1.70);
  addBox(ctx, portalGroup, hutMat, -0.95, roofBaseY + 0.40, 0, 0.10, 0.80, 1.70);

  // Ridge cap and brass finials
  addBox(ctx, portalGroup, cedarTrimMat, 0, roofRidgeY + 0.04, 0, 2.50, 0.08, 0.24);
  for (const px of [-1.22, 1.22]) {
    addBox(ctx, portalGroup, brassMat, px, roofRidgeY + 0.12, 0, 0.06, 0.10, 0.06);
  }

  // 7. Finished Signage facing both approach and station
  const rideName = (ride?.name ?? 'Coaster').toUpperCase();
  const roleLabel = isEntrance ? 'ENTRANCE' : 'EXIT';
  const signText = `${rideName} · ${roleLabel}`;

  // Public approach sign (px = -1.02): faces incoming queuing guests!
  // Normal points towards -X (rotation [0, -Math.PI / 2, 0]), perfectly readable left-to-right!
  addBox(ctx, portalGroup, cedarTrimMat, -0.99, 2.52, 0, 0.08, 0.54, 1.86);
  addBox(ctx, portalGroup, brassMat, -1.00, 2.52, 0, 0.09, 0.58, 1.90);
  addLabel(ctx, portalGroup, signText, {
    x: -1.04,
    y: 2.52,
    z: 0,
    width: 1.80,
    height: 0.46,
    color: '#fff5d4',
    background: isEntrance ? '#7d2217' : '#1f482d',
    rotation: [0, -Math.PI / 2, 0]
  });

  // Station side sign (px = +1.02): faces guests exiting portal onto station platform!
  // Normal points towards +X (rotation [0, Math.PI / 2, 0]), perfectly readable left-to-right!
  addBox(ctx, portalGroup, cedarTrimMat, 0.99, 2.52, 0, 0.08, 0.54, 1.86);
  addBox(ctx, portalGroup, brassMat, 1.00, 2.52, 0, 0.09, 0.58, 1.90);
  addLabel(ctx, portalGroup, signText, {
    x: 1.04,
    y: 2.52,
    z: 0,
    width: 1.80,
    height: 0.46,
    color: '#fff5d4',
    background: isEntrance ? '#7d2217' : '#1f482d',
    rotation: [0, Math.PI / 2, 0]
  });
}

// ---------------------------------------------------------------------------
// 3. createVehicles
// ---------------------------------------------------------------------------
export function createVehicles(ctx, capacity) {
  const group = new THREE.Group();
  const maxCars = Math.min(Math.max(capacity || 2048, 64), 10000);
  const maxRiders = maxCars * 2;

  // Shared chamfered car shell geometry
  const shellGeo = getGeometry(ctx, 'coaster_car_shell_geo_v1', () => {
    const geo = new THREE.BufferGeometry();
    const pos = [];
    const norm = [];
    const col = [];

    function quad(v0, v1, v2, v3, color = 1.0) {
      pos.push(...v0, ...v1, ...v2, ...v0, ...v2, ...v3);
      const ab = new THREE.Vector3(v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]);
      const ac = new THREE.Vector3(v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]);
      const n = new THREE.Vector3().crossVectors(ab, ac).normalize();
      for (let k = 0; k < 6; k++) {
        norm.push(n.x, n.y, n.z);
      }
      const rgb = Array.isArray(color) ? color : [color, color, color];
      for (let k = 0; k < 6; k++) {
        col.push(rgb[0], rgb[1], rgb[2]);
      }
    }

    const xB = -0.92, xDash = 0.72, xN = 1.10;
    const yB = 0.00, ySill = 0.10, yT = 0.52, yChamf = 0.45;
    const zW = 0.60, zChamf = 0.54;
    const xTubF = 0.65, xTubB = -0.72, yFloor = 0.16, zTub = 0.44;
    const cBottom = 0.68, cSill = 0.74, cBody = 0.86, cBelt = 1.00;
    const cRim = 0.92, cHood = 0.95, cGrille = 0.30;
    const cTubWall = 0.74, cTubFloor = 0.62;

    // Shared ring vertices keep the raked hood, shoulders and nose closed at each join.
    const sections = [
      { x: xB, top: yT, shoulder: yChamf, width: zW, crown: zChamf },
      { x: xDash, top: yT, shoulder: yChamf, width: zW, crown: zChamf },
      { x: 0.88, top: 0.40, shoulder: 0.34, width: 0.54, crown: 0.38 },
      { x: xN, top: 0.26, shoulder: 0.20, width: 0.24, crown: 0.18 }
    ];
    const rings = sections.map(s => [
      [s.x, yB, s.width], [s.x, ySill, s.width],
      [s.x, s.shoulder, s.width], [s.x, s.top, s.crown],
      [s.x, s.top, -s.crown], [s.x, s.shoulder, -s.width],
      [s.x, ySill, -s.width], [s.x, yB, -s.width]
    ]);
    const edgeColors = [cSill, cBody, cBelt, cHood, cBelt, cBody, cSill, cBottom];
    for (let section = 0; section < rings.length - 1; section++) {
      const back = rings[section], front = rings[section + 1];
      for (let edge = 0; edge < 8; edge++) {
        if (section === 0 && edge === 3) continue; // Keep the original cockpit open.
        const next = (edge + 1) % 8;
        quad(back[edge], front[edge], front[next], back[next], edgeColors[edge]);
      }
    }

    quad([xB, yB, -zW], [xB, yB, zW], [xB, ySill, zW], [xB, ySill, -zW], cSill);
    quad([xB, ySill, -zW], [xB, ySill, zW], [xB, yChamf, zW], [xB, yChamf, -zW], cBody);
    quad([xB, yChamf, -zW], [xB, yChamf, zW], [xB, yT, zChamf], [xB, yT, -zChamf], cBelt);

    const nose = rings.at(-1);
    quad(nose[0], nose[7], nose[6], nose[1], cSill);
    quad(nose[1], nose[6], nose[5], nose[2], cGrille);
    quad(nose[2], nose[5], nose[4], nose[3], cBelt);

    quad([xTubB, yT, -zChamf], [xB, yT, -zChamf], [xB, yT, zChamf], [xTubB, yT, zChamf], cRim);
    quad([xDash, yT, -zChamf], [xTubF, yT, -zChamf], [xTubF, yT, zChamf], [xDash, yT, zChamf], cRim);
    quad([xTubF, yT, zTub], [xTubB, yT, zTub], [xTubB, yT, zChamf], [xTubF, yT, zChamf], cRim);
    quad([xTubB, yT, -zTub], [xTubF, yT, -zTub], [xTubF, yT, -zChamf], [xTubB, yT, -zChamf], cRim);

    // Cockpit opening tub (wound so normals point inward into tub & floor points UP)
    quad([xTubF, yFloor, -zTub], [xTubB, yFloor, -zTub], [xTubB, yFloor, zTub], [xTubF, yFloor, zTub], cTubFloor); // floor (+Y)
    quad([xTubF, yFloor, zTub], [xTubB, yFloor, zTub], [xTubB, yT, zTub], [xTubF, yT, zTub], cTubWall); // left wall (-Z)
    quad([xTubB, yFloor, -zTub], [xTubF, yFloor, -zTub], [xTubF, yT, -zTub], [xTubB, yT, -zTub], cTubWall); // right wall (+Z)
    quad([xTubF, yFloor, -zTub], [xTubF, yFloor, zTub], [xTubF, yT, zTub], [xTubF, yT, -zTub], cTubWall); // front wall (-X)
    quad([xTubB, yFloor, zTub], [xTubB, yFloor, -zTub], [xTubB, yT, -zTub], [xTubB, yT, zTub], cTubWall); // rear wall (+X)

    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    return geo;
  });

  // Shared undercarriage bogie & wheels geometry
  const undercarriageGeo = getGeometry(ctx, 'coaster_undercarriage_geo_v1', () => {
    const geo = new THREE.BufferGeometry();
    const pos = [];
    const norm = [];

    function addBox(cx, cy, cz, sx, sy, sz) {
      const hx = sx / 2, hy = sy / 2, hz = sz / 2;
      const faces = [
        { n: [0, 0, 1], q: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]] },
        { n: [0, 0, -1], q: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]] },
        { n: [0, 1, 0], q: [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]] },
        { n: [0, -1, 0], q: [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]] },
        { n: [1, 0, 0], q: [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]] },
        { n: [-1, 0, 0], q: [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]] }
      ];
      for (const f of faces) {
        const [a, b, c, d] = f.q;
        pos.push(
          cx + a[0], cy + a[1], cz + a[2],
          cx + b[0], cy + b[1], cz + b[2],
          cx + c[0], cy + c[1], cz + c[2],
          cx + a[0], cy + a[1], cz + a[2],
          cx + c[0], cy + c[1], cz + c[2],
          cx + d[0], cy + d[1], cz + d[2]
        );
        for (let k = 0; k < 6; k++) norm.push(...f.n);
      }
    }

    function addBeveledGuide(cx, cy, cz, sx, sy, sz) {
      const hxT = sx / 2, hzT = sz / 2;
      const hxB = hxT * 0.75, hzB = hzT * 0.65;
      const hy = sy / 2;
      const yT = cy + hy, yB = cy - hy;

      function quadFace(a, b, c, d) {
        pos.push(
          ...a, ...b, ...c,
          ...a, ...c, ...d
        );
        const ab = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        const ac = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
        const n = new THREE.Vector3().crossVectors(ab, ac).normalize();
        for (let k = 0; k < 6; k++) norm.push(n.x, n.y, n.z);
      }

      // Top face (+Y normal)
      quadFace([cx - hxT, yT, cz + hzT], [cx + hxT, yT, cz + hzT], [cx + hxT, yT, cz - hzT], [cx - hxT, yT, cz - hzT]);
      // Bottom face (-Y normal)
      quadFace([cx - hxB, yB, cz - hzB], [cx + hxB, yB, cz - hzB], [cx + hxB, yB, cz + hzB], [cx - hxB, yB, cz + hzB]);
      // Front (+X normal)
      quadFace([cx + hxB, yB, cz - hzB], [cx + hxT, yT, cz - hzT], [cx + hxT, yT, cz + hzT], [cx + hxB, yB, cz + hzB]);
      // Back (-X normal)
      quadFace([cx - hxB, yB, cz + hzB], [cx - hxT, yT, cz + hzT], [cx - hxT, yT, cz - hzT], [cx - hxB, yB, cz - hzB]);
      // Outer side (+Z normal)
      quadFace([cx - hxB, yB, cz + hzB], [cx + hxB, yB, cz + hzB], [cx + hxT, yT, cz + hzT], [cx - hxT, yT, cz + hzT]);
      // Inner side (-Z normal)
      quadFace([cx + hxB, yB, cz - hzB], [cx - hxB, yB, cz - hzB], [cx - hxT, yT, cz - hzT], [cx + hxT, yT, cz - hzT]);
    }

    function addWheel(cx, cy, cz, r, width, isOutPositive) {
      const segs = 8;
      const hw = width / 2;
      const zOut = cz + (isOutPositive ? hw : -hw);
      const zIn = cz + (isOutPositive ? -hw : hw);
      const outNormZ = isOutPositive ? 1 : -1;
      const inNormZ = -outNormZ;

      const pts = [];
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        pts.push([Math.cos(a), Math.sin(a)]);
      }

      // 8-segment cylindrical tread (16 triangles)
      for (let i = 0; i < segs; i++) {
        const next = (i + 1) % segs;
        const [c0, s0] = pts[i];
        const [c1, s1] = pts[next];
        const x0 = cx + c0 * r, y0 = cy + s0 * r;
        const x1 = cx + c1 * r, y1 = cy + s1 * r;

        if (isOutPositive) {
          pos.push(
            x0, y0, zIn,  x1, y1, zIn,  x1, y1, zOut,
            x0, y0, zIn,  x1, y1, zOut, x0, y0, zOut
          );
          norm.push(
            c0, s0, 0,  c1, s1, 0,  c1, s1, 0,
            c0, s0, 0,  c1, s1, 0,  c0, s0, 0
          );
        } else {
          pos.push(
            x1, y1, zIn,  x0, y0, zIn,  x0, y0, zOut,
            x1, y1, zIn,  x0, y0, zOut, x1, y1, zOut
          );
          norm.push(
            c1, s1, 0,  c0, s0, 0,  c0, s0, 0,
            c1, s1, 0,  c0, s0, 0,  c1, s1, 0
          );
        }
      }

      // Outer hub face (perimeter triangulation from vertex 0, n-2 = 6 triangles)
      for (let i = 1; i < segs - 1; i++) {
        const [c0, s0] = pts[0];
        const [ci, si] = pts[i];
        const [cn, sn] = pts[i + 1];
        if (isOutPositive) {
          pos.push(
            cx + c0 * r, cy + s0 * r, zOut,
            cx + ci * r, cy + si * r, zOut,
            cx + cn * r, cy + sn * r, zOut
          );
        } else {
          pos.push(
            cx + c0 * r, cy + s0 * r, zOut,
            cx + cn * r, cy + sn * r, zOut,
            cx + ci * r, cy + si * r, zOut
          );
        }
        for (let k = 0; k < 3; k++) norm.push(0, 0, outNormZ);
      }

      // Inner hub face (perimeter triangulation from vertex 0, n-2 = 6 triangles)
      for (let i = 1; i < segs - 1; i++) {
        const [c0, s0] = pts[0];
        const [ci, si] = pts[i];
        const [cn, sn] = pts[i + 1];
        if (isOutPositive) {
          pos.push(
            cx + c0 * r, cy + s0 * r, zIn,
            cx + cn * r, cy + sn * r, zIn,
            cx + ci * r, cy + si * r, zIn
          );
        } else {
          pos.push(
            cx + c0 * r, cy + s0 * r, zIn,
            cx + ci * r, cy + si * r, zIn,
            cx + cn * r, cy + sn * r, zIn
          );
        }
        for (let k = 0; k < 3; k++) norm.push(0, 0, inNormZ);
      }
    }

    // Chassis base
    addBox(0, -0.08, 0, 1.65, 0.08, 1.05);

    // Four wheel assemblies: round wheel disc + axle housing + beveled guide block inside frozen bounds
    for (const bx of [-0.60, 0.60]) {
      for (const bz of [-0.52, 0.52]) {
        // Axle housing connecting bogie to chassis within envelope (0.22 x 0.16 x 0.08)
        addBox(bx, -0.14, bz, 0.20, 0.06, 0.05);

        // 8-segment round wheel disc (axis Z, radius 0.076 <= 0.08, thickness 0.06 <= 0.08)
        addWheel(bx, -0.18, bz, 0.076, 0.06, bz > 0);

        // Machined beveled guide block at (bx, -0.25, gz), envelope (0.16 x 0.10 x 0.06)
        const gz = bz + (bz > 0 ? -0.06 : 0.06);
        addBeveledGuide(bx, -0.25, gz, 0.16, 0.10, 0.06);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
    return geo;
  });

  // Shared bucket seat geometry (two contoured seats side by side)
  const seatGeo = getGeometry(ctx, 'coaster_car_seats_geo_v1', () => {
    const geo = new THREE.BufferGeometry();
    const pos = [];
    const norm = [];

    function quadFace(a, b, c, d) {
      pos.push(
        ...a, ...b, ...c,
        ...a, ...c, ...d
      );
      const ab = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const ac = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
      const n = new THREE.Vector3().crossVectors(ab, ac).normalize();
      for (let k = 0; k < 6; k++) norm.push(n.x, n.y, n.z);
    }

    function triFace(a, b, c) {
      pos.push(...a, ...b, ...c);
      const ab = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const ac = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
      const n = new THREE.Vector3().crossVectors(ab, ac).normalize();
      for (let k = 0; k < 3; k++) norm.push(n.x, n.y, n.z);
    }

    function addPaddedCushion(sz) {
      // Center (0.04, 0.22, sz), size (0.48, 0.12, 0.40) -> X [-0.20..0.28], Y [0.16..0.28], Z [sz±0.20]
      const xR = -0.20, xF = 0.28, xPadF = 0.23;
      const yB = 0.16, yT = 0.28, yPadFront = 0.24, ySide = 0.24;
      const zL = sz + 0.20, zR = sz - 0.20;
      const zPadL = sz + 0.15, zPadR = sz - 0.15;

      // Bottom face (-Y normal)
      quadFace([xR, yB, zR], [xF, yB, zR], [xF, yB, zL], [xR, yB, zL]);
      // Rear face (-X normal)
      quadFace([xR, yB, zR], [xR, yB, zL], [xR, yT, zL], [xR, yT, zR]);
      // Front lower face (+X normal)
      quadFace([xF, yB, zL], [xF, yB, zR], [xF, yPadFront, zR], [xF, yPadFront, zL]);
      // Left side lower (+Z normal)
      quadFace([xR, yB, zL], [xF, yB, zL], [xF, yPadFront, zL], [xR, ySide, zL]);
      // Right side lower (-Z normal)
      quadFace([xF, yB, zR], [xR, yB, zR], [xR, ySide, zR], [xF, yPadFront, zR]);

      // Thigh bolster front bevel (+X, +Y normal)
      quadFace([xF, yPadFront, zPadR], [xPadF, yT, zPadR], [xPadF, yT, zPadL], [xF, yPadFront, zPadL]);
      // Left side bolster bevel (+Z, +Y normal)
      quadFace([xF, yT, zPadL], [xR, yT, zPadL], [xR, ySide, zL], [xF, yPadFront, zL]);
      // Right side bolster bevel (-Z, +Y normal)
      quadFace([xR, yT, zPadR], [xF, yT, zPadR], [xF, yPadFront, zR], [xR, ySide, zR]);
      // Main central seat support pad (+Y normal)
      quadFace([xR, yT, zPadL], [xPadF, yT, zPadL], [xPadF, yT, zPadR], [xR, yT, zPadR]);

      // Inset front-corner faces point toward the seat center, outside the raised side padding.
      triFace([xF, yPadFront, zPadL], [xPadF, yT, zPadL], [xF, yT, zPadL]);
      triFace([xF, yPadFront, zPadR], [xF, yT, zPadR], [xPadF, yT, zPadR]);
    }

    function addPaddedBackrest(sz) {
      // Center (-0.22, 0.48, sz), size (0.10, 0.46, 0.38) -> X [-0.27..-0.17], Y [0.25..0.71], Z [sz±0.19]
      const xBack = -0.27, xFront = -0.17, xBolster = -0.21, xTopBevel = -0.24;
      const yB = 0.25, yT = 0.71, yTopPad = 0.67;
      const zL = sz + 0.19, zR = sz - 0.19;
      const zPadL = sz + 0.14, zPadR = sz - 0.14;

      // Rear face (-X normal)
      quadFace([xBack, yB, zR], [xBack, yB, zL], [xBack, yT, zL], [xBack, yT, zR]);
      // Bottom face (-Y normal)
      quadFace([xBack, yB, zR], [xFront, yB, zR], [xFront, yB, zL], [xBack, yB, zL]);
      // Left outer side (+Z normal)
      quadFace([xBack, yB, zL], [xBolster, yB, zL], [xBolster, yT, zL], [xBack, yT, zL]);
      // Right outer side (-Z normal)
      quadFace([xBolster, yB, zR], [xBack, yB, zR], [xBack, yT, zR], [xBolster, yT, zR]);

      // Front center lumbar/backrest pad (+X normal)
      quadFace([xFront, yB, zPadL], [xFront, yB, zPadR], [xFront, yTopPad, zPadR], [xFront, yTopPad, zPadL]);
      // Left lateral bolster (+X, +Z normal)
      quadFace([xBolster, yB, zL], [xFront, yB, zPadL], [xFront, yTopPad, zPadL], [xBolster, yT, zL]);
      // Right lateral bolster (+X, -Z normal)
      quadFace([xFront, yB, zPadR], [xBolster, yB, zR], [xBolster, yT, zR], [xFront, yTopPad, zPadR]);
      // Top shoulder bevel (+X, +Y normal)
      quadFace([xTopBevel, yT, zPadR], [xTopBevel, yT, zPadL], [xFront, yTopPad, zPadL], [xFront, yTopPad, zPadR]);
      // Central top crown surface (+Y normal)
      quadFace([xBack, yT, zPadR], [xBack, yT, zPadL], [xTopBevel, yT, zPadL], [xTopBevel, yT, zPadR]);

      // Left crown corner closure (horizontal quad + shoulder transition triangle)
      quadFace([xBack, yT, zL], [xBolster, yT, zL], [xTopBevel, yT, zPadL], [xBack, yT, zPadL]);
      triFace([xTopBevel, yT, zPadL], [xBolster, yT, zL], [xFront, yTopPad, zPadL]);

      // Right crown corner closure (horizontal quad + shoulder transition triangle)
      quadFace([xBack, yT, zPadR], [xTopBevel, yT, zPadR], [xBolster, yT, zR], [xBack, yT, zR]);
      triFace([xBolster, yT, zR], [xTopBevel, yT, zPadR], [xFront, yTopPad, zPadR]);
    }

    function addPaddedHeadrest(sz) {
      // Center (-0.20, 0.76, sz), size (0.12, 0.18, 0.32) -> X [-0.26..-0.14], Y [0.67..0.85], Z [sz±0.16]
      const xBack = -0.26, xFront = -0.14, xChamf = -0.19;
      const yB = 0.67, yT = 0.85, yPadT = 0.81;
      const zL = sz + 0.16, zR = sz - 0.16;
      const zPadL = sz + 0.12, zPadR = sz - 0.12;

      // Rear face (-X normal)
      quadFace([xBack, yB, zR], [xBack, yB, zL], [xBack, yT, zL], [xBack, yT, zR]);
      // Bottom face (-Y normal)
      quadFace([xBack, yB, zR], [xFront, yB, zR], [xFront, yB, zL], [xBack, yB, zL]);
      // Left side rectangle (+Z normal)
      quadFace([xBack, yB, zL], [xChamf, yB, zL], [xChamf, yT, zL], [xBack, yT, zL]);
      // Right side rectangle (-Z normal)
      quadFace([xChamf, yB, zR], [xBack, yB, zR], [xBack, yT, zR], [xChamf, yT, zR]);

      // Front center pad (+X normal)
      quadFace([xFront, yB, zPadL], [xFront, yB, zPadR], [xFront, yPadT, zPadR], [xFront, yPadT, zPadL]);
      // Top chamfer (+X, +Y normal)
      quadFace([xChamf, yT, zPadR], [xChamf, yT, zPadL], [xFront, yPadT, zPadL], [xFront, yPadT, zPadR]);
      // Left side chamfer (+X, +Z normal)
      quadFace([xChamf, yB, zL], [xFront, yB, zPadL], [xFront, yPadT, zPadL], [xChamf, yT, zL]);
      // Right side chamfer (+X, -Z normal)
      quadFace([xFront, yB, zPadR], [xChamf, yB, zR], [xChamf, yT, zR], [xFront, yPadT, zPadR]);
      // Central top crown surface (+Y normal)
      quadFace([xBack, yT, zPadR], [xBack, yT, zPadL], [xChamf, yT, zPadL], [xChamf, yT, zPadR]);

      // Left crown corner closure (horizontal quad + chamfer transition triangle)
      quadFace([xBack, yT, zL], [xChamf, yT, zL], [xChamf, yT, zPadL], [xBack, yT, zPadL]);
      triFace([xChamf, yT, zPadL], [xChamf, yT, zL], [xFront, yPadT, zPadL]);

      // Right crown corner closure (horizontal quad + chamfer transition triangle)
      quadFace([xBack, yT, zPadR], [xChamf, yT, zPadR], [xChamf, yT, zR], [xBack, yT, zR]);
      triFace([xChamf, yT, zR], [xChamf, yT, zPadR], [xFront, yPadT, zPadR]);
    }

    // Two bucket seats at Z = -0.24 and +0.24 with ergonomic contours within frozen envelopes
    for (const sz of [-0.24, 0.24]) {
      addPaddedCushion(sz);
      addPaddedBackrest(sz);
      addPaddedHeadrest(sz);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
    return geo;
  });

  // Shared restraint / lap bar geometry
  const restraintGeo = getGeometry(ctx, 'coaster_car_restraint_geo_v1', () => {
    const geo = new THREE.BufferGeometry();
    const pos = [];
    const norm = [];

    function quadFace(a, b, c, d) {
      pos.push(
        ...a, ...b, ...c,
        ...a, ...c, ...d
      );
      const ab = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const ac = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
      const n = new THREE.Vector3().crossVectors(ab, ac).normalize();
      for (let k = 0; k < 6; k++) norm.push(n.x, n.y, n.z);
    }

    function triFace(a, b, c) {
      pos.push(...a, ...b, ...c);
      const ab = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const ac = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
      const n = new THREE.Vector3().crossVectors(ab, ac).normalize();
      for (let k = 0; k < 3; k++) norm.push(n.x, n.y, n.z);
    }

    function addPaddedLapBar(z0, z1) {
      // Flattened six-facet padded cross section within baseline envelope X [0.14..0.22], Y [0.380..0.460]
      // Lower facet spans X 0.16..0.20 at Y 0.380; the hinge arm overlaps it by 2 mm.
      const pts = [
        [0.20, 0.380], // 0: bottom front
        [0.22, 0.420], // 1: front snout
        [0.20, 0.460], // 2: top front
        [0.16, 0.460], // 3: top rear
        [0.14, 0.420], // 4: rear snout
        [0.16, 0.380]  // 5: bottom rear
      ];

      // 6 extruded longitudinal facets along Z (12 triangles)
      for (let i = 0; i < 6; i++) {
        const next = (i + 1) % 6;
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[next];
        quadFace([x0, y0, z0], [x1, y1, z0], [x1, y1, z1], [x0, y0, z1]);
      }

      // End caps with perimeter triangulation from vertex 0 (n - 2 = 4 triangles each)
      // +Z end cap (z1, normal [0, 0, 1])
      for (let i = 1; i < 5; i++) {
        triFace(
          [pts[0][0], pts[0][1], z1],
          [pts[i][0], pts[i][1], z1],
          [pts[i + 1][0], pts[i + 1][1], z1]
        );
      }
      // -Z end cap (z0, normal [0, 0, -1])
      for (let i = 1; i < 5; i++) {
        triFace(
          [pts[0][0], pts[0][1], z0],
          [pts[i + 1][0], pts[i + 1][1], z0],
          [pts[i][0], pts[i][1], z0]
        );
      }
    }

    function addArmWithHinge(armZ) {
      // The 19 mm half-width leaves 1 mm beside the seated torso while joining the lap pad.
      const hw = 0.019;
      const z0 = armZ - hw, z1 = armZ + hw;

      // Continuous solid arm with chamfered hinge knuckle at pivot end (X -0.08..0.18, Y 0.31..0.382)
      // Front face (+X normal)
      quadFace([0.18, 0.31, z1], [0.18, 0.31, z0], [0.18, 0.382, z0], [0.18, 0.382, z1]);
      // Top face (+Y normal)
      quadFace([0.18, 0.382, z1], [0.18, 0.382, z0], [-0.05, 0.382, z0], [-0.05, 0.382, z1]);
      // Bottom face (-Y normal)
      quadFace([-0.05, 0.31, z1], [-0.05, 0.31, z0], [0.18, 0.31, z0], [0.18, 0.31, z1]);
      // Rear bottom chamfer (-X, -Y normal)
      quadFace([-0.08, 0.34, z1], [-0.08, 0.34, z0], [-0.05, 0.31, z0], [-0.05, 0.31, z1]);
      // Rear top chamfer (-X, +Y normal)
      quadFace([-0.05, 0.382, z1], [-0.05, 0.382, z0], [-0.08, 0.34, z0], [-0.08, 0.34, z1]);

      // Outer side cap (+Z normal)
      quadFace([-0.05, 0.31, z1], [0.18, 0.31, z1], [0.18, 0.382, z1], [-0.05, 0.382, z1]);
      triFace([-0.08, 0.34, z1], [-0.05, 0.31, z1], [-0.05, 0.382, z1]);

      // Inner side cap (-Z normal)
      quadFace([0.18, 0.31, z0], [-0.05, 0.31, z0], [-0.05, 0.382, z0], [0.18, 0.382, z0]);
      triFace([-0.08, 0.34, z0], [-0.05, 0.382, z0], [-0.05, 0.31, z0]);
    }

    for (const rz of [-0.24, 0.24]) {
      // Flattened padded horizontal lap bar (length 0.36, lower facet Y 0.380 spanning X 0.16..0.20)
      addPaddedLapBar(rz - 0.18, rz + 0.18);

      // Two solid hinge arms join the underside of each lap pad.
      addArmWithHinge(rz - 0.16);
      addArmWithHinge(rz + 0.16);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
    return geo;
  });

  function combineRiderParts(parts) {
    const positions = [], normals = [];
    for (const part of parts) {
      const source = part.index ? part.toNonIndexed() : part;
      positions.push(...source.attributes.position.array);
      normals.push(...source.attributes.normal.array);
      if (source !== part) source.dispose();
      part.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geometry;
  }

  const riderTorsoGeo = getGeometry(ctx, 'coaster_rider_torso_geo_v2', () => {
    const torso = new THREE.CylinderGeometry(1, 1, 0.36, 8, 3);
    const vertices = torso.attributes.position;
    const widths = [0.065, 0.113, 0.098, 0.09];
    for (let i = 0; i < vertices.count; i++) {
      const y = vertices.getY(i);
      const width = widths[Math.round((0.18 - y) / 0.12)];
      vertices.setXYZ(i, vertices.getX(i) * width * 0.78, y, vertices.getZ(i) * width);
    }
    torso.computeVertexNormals();
    const sleeves = [-1, 1].map(side => new THREE.CylinderGeometry(0.024, 0.023, 0.19, 6)
      .translate(-0.005, 0.01, side * 0.114));
    return combineRiderParts([torso, ...sleeves]);
  });
  const riderHeadGeo = getGeometry(ctx, 'coaster_rider_head_geo_v2', () => {
    const head = new THREE.SphereGeometry(0.118, 10, 6).scale(0.86, 1, 0.92);
    const neck = new THREE.CylinderGeometry(0.04, 0.04, 0.10, 6).translate(0, -0.15, 0);
    const nose = new THREE.BoxGeometry(0.025, 0.025, 0.035).translate(0.105, -0.01, 0);
    // These share the head's skin tint and stay behind the lap pad's X=0.14 face.
    const forearms = [-1, 1].map(side => new THREE.BoxGeometry(0.09, 0.045, 0.045)
      .translate(0.04, -0.415, side * 0.11));
    return combineRiderParts([head, neck, nose, ...forearms]);
  });
  const riderHairGeo = getGeometry(ctx, 'coaster_rider_hair_geo_v1', () =>
    new THREE.SphereGeometry(0.12, 10, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.86, 1, 0.92));

  // Materials
  const shellMat = getMaterial(ctx, 'coaster_car_shell_mat', {
    color: '#ffffff',
    roughness: 0.28,
    metalness: 0.15,
    vertexColors: true
  });
  const undercarriageMat = getMaterial(ctx, 'coaster_car_undercarriage_mat', {
    color: '#26292c',
    roughness: 0.45,
    metalness: 0.70
  });
  const seatMat = getMaterial(ctx, 'coaster_car_seat_mat', {
    color: '#1f2124',
    roughness: 0.52,
    metalness: 0.0
  });
  const restraintMat = getMaterial(ctx, 'coaster_car_restraint_mat', {
    color: '#f4ba1c',
    roughness: 0.45,
    metalness: 0.0
  });
  const riderTorsoMat = getMaterial(ctx, 'coaster_rider_torso_mat', {
    color: GUEST_TORSO_BASE_HEX,
    ...GUEST_MATERIAL_FINISH.shirt
  });
  const riderHeadMat = getMaterial(ctx, 'coaster_rider_head_mat', {
    color: GUEST_HEAD_BASE_HEX,
    ...GUEST_MATERIAL_FINISH.skin
  });
  const riderHairMat = getMaterial(ctx, 'coaster_rider_hair_mat', {
    color: GUEST_HAIR_BASE_HEX,
    ...GUEST_MATERIAL_FINISH.hair
  });

  // Instanced Meshes
  const shellMesh = new THREE.InstancedMesh(shellGeo, shellMat, maxCars);
  shellMesh.castShadow = true;
  shellMesh.frustumCulled = false;

  const undercarriageMesh = new THREE.InstancedMesh(undercarriageGeo, undercarriageMat, maxCars);
  undercarriageMesh.castShadow = true;
  undercarriageMesh.frustumCulled = false;

  const seatMesh = new THREE.InstancedMesh(seatGeo, seatMat, maxCars);
  seatMesh.castShadow = true;
  seatMesh.frustumCulled = false;

  const restraintMesh = new THREE.InstancedMesh(restraintGeo, restraintMat, maxCars);
  restraintMesh.castShadow = true;
  restraintMesh.frustumCulled = false;

  const riderTorsoMesh = new THREE.InstancedMesh(riderTorsoGeo, riderTorsoMat, maxRiders);
  riderTorsoMesh.castShadow = true;
  riderTorsoMesh.frustumCulled = false;

  const riderHeadMesh = new THREE.InstancedMesh(riderHeadGeo, riderHeadMat, maxRiders);
  riderHeadMesh.castShadow = true;
  riderHeadMesh.frustumCulled = false;

  const riderHairMesh = new THREE.InstancedMesh(riderHairGeo, riderHairMat, maxRiders);
  riderHairMesh.castShadow = true;
  riderHairMesh.frustumCulled = false;

  group.add(shellMesh, undercarriageMesh, seatMesh, restraintMesh, riderTorsoMesh, riderHeadMesh, riderHairMesh);

  const selections = [];
  const pickMeshes = [shellMesh, seatMesh];

  const carColors=['#c72c35','#167e9a','#d79326'].map(c=>new THREE.Color(c));
  function update(packet) {
    const cars = (packet?.cars || []).filter(car=>car.rig===null);
    const carCount = Math.min(cars.length, maxCars);
    selections.length = 0;

    const half = ctx?.half ?? 2.0;
    const fVec = new THREE.Vector3();
    const upVec = new THREE.Vector3();
    const sideVec = new THREE.Vector3();
    const basisMat = new THREE.Matrix4();
    const posVec = new THREE.Vector3();
    const subMat = new THREE.Matrix4();

    let riderIndex = 0;

    for (let i = 0; i < carCount; i++) {
      const c = cars[i];
      fVec.set(c.direction.x, c.direction.z, c.direction.y).normalize();
      upVec.set(c.up.x, c.up.z, c.up.y).normalize();
      sideVec.crossVectors(fVec, upVec).normalize();

      posVec.set(c.position.x + half, c.position.z + 0.65, c.position.y + half);

      basisMat.makeBasis(fVec, upVec, sideVec);
      basisMat.setPosition(posVec);

      shellMesh.setMatrixAt(i, basisMat);shellMesh.setColorAt(i,carColors[c.ride%3]);
      undercarriageMesh.setMatrixAt(i, basisMat);
      seatMesh.setMatrixAt(i, basisMat);
      restraintMesh.setMatrixAt(i, basisMat);

      selections[i] = { kind: 'ride', id: c.ride };

      // Keep sparse owners at their original physical seat; GPU instances remain dense.
      const seatIds = c.seatIds ?? [];
      for (let j = 0; j < Math.min(seatIds.length, 2) && riderIndex < maxRiders; j++) {
        if (seatIds[j] === null) continue;
        const appearance = getGuestAppearance(seatIds[j]);
        const sideOffset = (j === 0) ? -0.24 : 0.24;
        const riderPos = posVec.clone()
          .addScaledVector(upVec, 0.48)
          .addScaledVector(sideVec, sideOffset)
          .addScaledVector(fVec, 0.04);

        subMat.makeBasis(fVec, upVec, sideVec);
        subMat.setPosition(riderPos);
        riderTorsoMesh.setMatrixAt(riderIndex, subMat);
        riderTorsoMesh.setColorAt(riderIndex, appearance.shirtColor);

        const headPos = riderPos.clone().addScaledVector(upVec, 0.32);
        subMat.setPosition(headPos);
        riderHeadMesh.setMatrixAt(riderIndex, subMat);
        riderHeadMesh.setColorAt(riderIndex, appearance.skinInstanceColor);
        riderHairMesh.setMatrixAt(riderIndex, subMat);
        riderHairMesh.setColorAt(riderIndex, appearance.hairInstanceColor);

        riderIndex++;
      }
    }

    shellMesh.count = carCount;
    undercarriageMesh.count = carCount;
    seatMesh.count = carCount;
    restraintMesh.count = carCount;
    riderTorsoMesh.count = riderIndex;
    riderHeadMesh.count = riderIndex;
    riderHairMesh.count = riderIndex;

    shellMesh.instanceMatrix.needsUpdate = true;
    undercarriageMesh.instanceMatrix.needsUpdate = true;
    seatMesh.instanceMatrix.needsUpdate = true;
    restraintMesh.instanceMatrix.needsUpdate = true;
    riderTorsoMesh.instanceMatrix.needsUpdate = true;
    riderHeadMesh.instanceMatrix.needsUpdate = true;
    riderHairMesh.instanceMatrix.needsUpdate = true;

    if (shellMesh.instanceColor) shellMesh.instanceColor.needsUpdate = true;
    if (riderTorsoMesh.instanceColor) riderTorsoMesh.instanceColor.needsUpdate = true;
    if (riderHeadMesh.instanceColor) riderHeadMesh.instanceColor.needsUpdate = true;
    if (riderHairMesh.instanceColor) riderHairMesh.instanceColor.needsUpdate = true;

    shellMesh.boundingSphere = null;
    undercarriageMesh.boundingSphere = null;
    seatMesh.boundingSphere = null;
    restraintMesh.boundingSphere = null;
    riderTorsoMesh.boundingSphere = null;
    riderHeadMesh.boundingSphere = null;
    riderHairMesh.boundingSphere = null;
  }

  function dispose() {
    group.clear();
    shellMesh.dispose();
    undercarriageMesh.dispose();
    seatMesh.dispose();
    restraintMesh.dispose();
    riderTorsoMesh.dispose();
    riderHeadMesh.dispose();
    riderHairMesh.dispose();
  }

  return {
    group,
    update,
    pickMeshes,
    selections,
    dispose
  };
}

// ---------------------------------------------------------------------------
// 4. createPeople
// ---------------------------------------------------------------------------
export function createPeople(ctx, capacity) {
  const group = new THREE.Group();
  const maxPeople = Math.min(Math.max(capacity || 2048, 64), 10000);

  function combinePeopleParts(parts) {
    const positions = [], normals = [];
    for (const part of parts) {
      const source = part.index ? part.toNonIndexed() : part;
      positions.push(...source.attributes.position.array);
      normals.push(...source.attributes.normal.array);
      if (source !== part) source.dispose();
      part.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geometry;
  }

  const torsoGeo = getGeometry(ctx, 'people_torso_geo_v2', () => {
    const geometry = new THREE.CylinderGeometry(0.17, 0.135, 0.46, 8);
    geometry.rotateY(Math.PI / 8);
    geometry.scale(1.06, 1, 0.78);
    return geometry;
  });

  // Keep the original sole plane while joining each leg directly to its shoe.
  const trousersGeo = getGeometry(ctx, 'people_trousers_geo_v2', () => {
    const pelvis = new THREE.BoxGeometry(0.27, 0.14, 0.19).translate(0, 0.19, 0);
    const legs = [-0.075, 0.075].map(x =>
      new THREE.BoxGeometry(0.11, 0.30, 0.17).translate(x, -0.03, 0));
    const shoes = [-0.075, 0.075].map(x =>
      new THREE.BoxGeometry(0.105, 0.08, 0.22).translate(x, -0.22, 0.02));
    return combinePeopleParts([pelvis, ...legs, ...shoes]);
  });

  const headGeo = getGeometry(ctx, 'people_head_geo_v1', () => {
    const cranium = new THREE.SphereGeometry(0.14, 10, 6).scale(0.94, 1, 0.92);
    // Keep the chin at the original neck seam and each feature within the old envelope.
    const jaw = new THREE.CylinderGeometry(0.072, 0.052, 0.10, 8)
      .rotateY(Math.PI / 8).scale(1.08, 1, 1.15).translate(0, -0.09, 0.016);
    const nose = new THREE.BoxGeometry(0.028, 0.032, 0.045)
      .translate(0, -0.012, 0.1175);
    const ears = [-1, 1].map(side =>
      new THREE.BoxGeometry(0.018, 0.036, 0.024).translate(side * 0.128, 0.004, -0.008));
    return combinePeopleParts([cranium, jaw, nose, ...ears]);
  });

  const hairCapGeo = getGeometry(ctx, 'people_hair_cap_geo_v2', () => {
    const crown = new THREE.CylinderGeometry(0.125, 0.148, 0.11, 8);
    crown.rotateY(Math.PI / 8);
    crown.translate(0, 0.04, 0);
    const visor = new THREE.BoxGeometry(0.22, 0.022, 0.11);
    visor.rotateX(0.16);
    visor.translate(0, 0.005, 0.16);
    const button = new THREE.CylinderGeometry(0.02, 0.02, 0.015, 6).translate(0, 0.0925, 0);
    return combinePeopleParts([crown, visor, button]);
  });

  // Arms use the person's clothing color; equipment belongs only to staff.
  const armsGeo = getGeometry(ctx, 'people_arms_geo', () => {
    const geo = new THREE.BufferGeometry();
    const pos = [];
    const norm = [];

    function addBoxPart(cx, cy, cz, sx, sy, sz) {
      const hx = sx / 2, hy = sy / 2, hz = sz / 2;
      const faces = [
        { n: [0, 0, 1], q: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]] },
        { n: [0, 0, -1], q: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]] },
        { n: [0, 1, 0], q: [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]] },
        { n: [0, -1, 0], q: [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]] },
        { n: [1, 0, 0], q: [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]] },
        { n: [-1, 0, 0], q: [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]] }
      ];
      for (const f of faces) {
        const [a, b, c, d] = f.q;
        pos.push(
          cx + a[0], cy + a[1], cz + a[2],
          cx + b[0], cy + b[1], cz + b[2],
          cx + c[0], cy + c[1], cz + c[2],
          cx + a[0], cy + a[1], cz + a[2],
          cx + c[0], cy + c[1], cz + c[2],
          cx + d[0], cy + d[1], cz + d[2]
        );
        for (let k = 0; k < 6; k++) norm.push(...f.n);
      }
    }

    // Left arm & right arm
    addBoxPart(-0.21, 0.00, 0, 0.08, 0.40, 0.10);
    addBoxPart(0.21, 0.00, 0, 0.08, 0.40, 0.10);

    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
    return geo;
  });

  // Materials
  const torsoMat = getMaterial(ctx, 'people_torso_mat', { color: '#ffffff', roughness: 0.78 });
  const trousersMat = getMaterial(ctx, 'people_trousers_mat', { color: '#ffffff', roughness: 0.82 });
  const headMat = getMaterial(ctx, 'people_head_mat', { color: '#ebc19c', roughness: 0.65 });
  const hairCapMat = getMaterial(ctx, 'people_hair_cap_mat', { color: '#ffffff', roughness: 0.70 });
  const armsMat = getMaterial(ctx, 'people_arms_mat', { color: '#ffffff', roughness: 0.78 });
  const toolGeo = getGeometry(ctx, 'people_staff_tool', () => new THREE.BoxGeometry(.04, .50, .04));
  const toolMat = getMaterial(ctx, 'people_staff_tool_mat', { color: '#8c9499', roughness: .60 });

  // Instanced Meshes
  const torsosMesh = new THREE.InstancedMesh(torsoGeo, torsoMat, maxPeople);
  torsosMesh.castShadow = true;
  torsosMesh.frustumCulled = false;

  const trousersMesh = new THREE.InstancedMesh(trousersGeo, trousersMat, maxPeople);
  trousersMesh.castShadow = true;
  trousersMesh.frustumCulled = false;

  const headsMesh = new THREE.InstancedMesh(headGeo, headMat, maxPeople);
  headsMesh.castShadow = true;
  headsMesh.frustumCulled = false;

  const hairCapMesh = new THREE.InstancedMesh(hairCapGeo, hairCapMat, maxPeople);
  hairCapMesh.castShadow = true;
  hairCapMesh.frustumCulled = false;

  const armsMesh = new THREE.InstancedMesh(armsGeo, armsMat, maxPeople);
  armsMesh.castShadow = true;
  armsMesh.frustumCulled = false;

  const toolsMesh = new THREE.InstancedMesh(toolGeo, toolMat, maxPeople);
  toolsMesh.castShadow = true;
  toolsMesh.frustumCulled = false;
  toolsMesh.userData.staffTools = true;

  group.add(torsosMesh, trousersMesh, headsMesh, hairCapMesh, armsMesh, toolsMesh);

  const selections = [];
  const pickMeshes = [torsosMesh, trousersMesh, headsMesh];

  const {
    mechanicUniform: mechanicUniformColor,
    mechanicCap: mechanicCapColor,
    handymanUniform: handymanUniformColor,
    handymanCap: handymanCapColor,
    pants: staffPantsColor,
  } = STAFF_APPEARANCE_COLORS;

  const transformMat = new THREE.Matrix4();
  const posVec = new THREE.Vector3();

  function update(packet) {
    const people = packet?.people || [];
    const stride = 6;
    const count = Math.min(Math.floor(people.length / stride), maxPeople);
    selections.length = 0;

    const half = ctx?.half ?? 2.0;

    let toolCount = 0;
    for (let i = 0; i < count; i++) {
      const offset = i * stride;
      const id = people[offset];
      const px = people[offset + 1];
      const pz = people[offset + 2]; // Z in Three.js coordinates
      const py = people[offset + 3]; // Elevation in Three.js coordinates
      const phase = people[offset + 4]; // Guest phase index, or staff role (0: mechanic, 1: handyman)
      const isStaff = people[offset + 5];

      const wx = px + half;
      const wz = pz + half;
      const wy = py;

      const appearance = getGuestAppearance(id);
      selections[i] = { kind: isStaff ? 'staff' : 'guest', id };

      // 1. Torso
      posVec.set(wx, wy + 0.78, wz);
      transformMat.setPosition(posVec);
      torsosMesh.setMatrixAt(i, transformMat);

      if (isStaff) {
        torsosMesh.setColorAt(i, (phase === 0) ? mechanicUniformColor : handymanUniformColor);
      } else {
        torsosMesh.setColorAt(i, appearance.shirtColor);
      }

      // 2. Trousers
      posVec.set(wx, wy + 0.32, wz);
      transformMat.setPosition(posVec);
      trousersMesh.setMatrixAt(i, transformMat);

      if (isStaff) {
        trousersMesh.setColorAt(i, staffPantsColor);
      } else {
        trousersMesh.setColorAt(i, appearance.trousersColor);
      }

      // 3. Head
      posVec.set(wx, wy + 1.15, wz);
      transformMat.setPosition(posVec);
      headsMesh.setMatrixAt(i, transformMat);
      headsMesh.setColorAt(i, appearance.skinInstanceColor);

      // 4. Hair / Staff Uniform Cap
      posVec.set(wx, wy + 1.27, wz);
      transformMat.setPosition(posVec);
      hairCapMesh.setMatrixAt(i, transformMat);

      if (isStaff) {
        hairCapMesh.setColorAt(i, (phase === 0) ? mechanicCapColor : handymanCapColor);
      } else {
        hairCapMesh.setColorAt(i, appearance.hairColor);
      }

      // 5. Arms and actual employee equipment
      posVec.set(wx, wy + 0.78, wz);
      transformMat.setPosition(posVec);
      armsMesh.setMatrixAt(i, transformMat);
      armsMesh.setColorAt(i, isStaff ? phase === 0 ? mechanicUniformColor : handymanUniformColor : appearance.shirtColor);
      if (isStaff) {
        posVec.set(wx + .24, wy + .70, wz + .12);
        transformMat.setPosition(posVec);
        toolsMesh.setMatrixAt(toolCount++, transformMat);
      }
    }

    torsosMesh.count = count;
    trousersMesh.count = count;
    headsMesh.count = count;
    hairCapMesh.count = count;
    armsMesh.count = count;
    toolsMesh.count = toolCount;

    torsosMesh.instanceMatrix.needsUpdate = true;
    trousersMesh.instanceMatrix.needsUpdate = true;
    headsMesh.instanceMatrix.needsUpdate = true;
    hairCapMesh.instanceMatrix.needsUpdate = true;
    armsMesh.instanceMatrix.needsUpdate = true;
    toolsMesh.instanceMatrix.needsUpdate = true;

    if (torsosMesh.instanceColor) torsosMesh.instanceColor.needsUpdate = true;
    if (trousersMesh.instanceColor) trousersMesh.instanceColor.needsUpdate = true;
    if (headsMesh.instanceColor) headsMesh.instanceColor.needsUpdate = true;
    if (hairCapMesh.instanceColor) hairCapMesh.instanceColor.needsUpdate = true;
    if (armsMesh.instanceColor) armsMesh.instanceColor.needsUpdate = true;

    torsosMesh.boundingSphere = null;
    trousersMesh.boundingSphere = null;
    headsMesh.boundingSphere = null;
    hairCapMesh.boundingSphere = null;
    armsMesh.boundingSphere = null;
    toolsMesh.boundingSphere = null;
  }

  function dispose() {
    group.clear();
    torsosMesh.dispose();
    trousersMesh.dispose();
    headsMesh.dispose();
    hairCapMesh.dispose();
    armsMesh.dispose();
    toolsMesh.dispose();
  }

  return {
    group,
    update,
    pickMeshes,
    selections,
    dispose
  };
}
