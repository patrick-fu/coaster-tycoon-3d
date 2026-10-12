import * as THREE from 'three';
import {planFlumeTerrain,appendFlumeTerrain} from './flume-terrain.js';

function makeBasisMatrix(fwd, up, pos) {
  const f = fwd.clone().normalize();
  const r = new THREE.Vector3().crossVectors(up, f).normalize();
  const u = new THREE.Vector3().crossVectors(f, r).normalize();
  return new THREE.Matrix4().makeBasis(r, u, f).setPosition(pos);
}

function createPhysicalBox(sx, sy, sz) {
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  const uvs = geo.attributes.uv;
  const scales = [
    [sz, sy], [sz, sy],
    [sx, sz], [sx, sz],
    [sx, sy], [sx, sy],
  ];
  for (let f = 0; f < 6; f++) {
    const [uScale, vScale] = scales[f];
    for (let v = 0; v < 4; v++) {
      const idx = f * 4 + v;
      uvs.setXY(idx, uvs.getX(idx) * uScale, uvs.getY(idx) * vScale);
    }
  }
  uvs.needsUpdate = true;
  return geo;
}

function mergeBucket(ctx, group, mat, items) {
  if (!items || items.length === 0) return null;
  let totalVerts = 0, totalIdx = 0;
  for (const it of items) {
    const p = it.geometry.attributes.position;
    if (!p) continue;
    totalVerts += p.count;
    totalIdx += it.geometry.index ? it.geometry.index.count : p.count;
  }
  if (totalVerts === 0) return null;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const indices = totalVerts > 65535 ? new Uint32Array(totalIdx) : new Uint16Array(totalIdx);

  let vOff = 0, iOff = 0;
  const normMat = new THREE.Matrix3();
  const v = new THREE.Vector3(), n = new THREE.Vector3();

  for (const it of items) {
    const geo = it.geometry, mat4 = it.matrix;
    if (mat4) normMat.getNormalMatrix(mat4);
    const pos = geo.attributes.position, norm = geo.attributes.normal, uv = geo.attributes.uv, idx = geo.index;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (mat4) v.applyMatrix4(mat4);
      positions[(vOff + i) * 3] = v.x;
      positions[(vOff + i) * 3 + 1] = v.y;
      positions[(vOff + i) * 3 + 2] = v.z;
      if (norm) {
        n.fromBufferAttribute(norm, i);
        if (mat4) n.applyMatrix3(normMat).normalize();
        normals[(vOff + i) * 3] = n.x;
        normals[(vOff + i) * 3 + 1] = n.y;
        normals[(vOff + i) * 3 + 2] = n.z;
      }
      if (uv) {
        uvs[(vOff + i) * 2] = uv.getX(i);
        uvs[(vOff + i) * 2 + 1] = uv.getY(i);
      }
    }
    if (idx) {
      for (let i = 0; i < idx.count; i++) indices[iOff + i] = vOff + idx.getX(i);
      iOff += idx.count;
    } else {
      for (let i = 0; i < pos.count; i++) indices[iOff + i] = vOff + i;
      iOff += pos.count;
    }
    vOff += pos.count;
  }

  const mergedGeo = new THREE.BufferGeometry();
  mergedGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  mergedGeo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  mergedGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  mergedGeo.setIndex(new THREE.BufferAttribute(indices, 1));
  mergedGeo.computeBoundingBox();
  mergedGeo.computeBoundingSphere();
  ctx.ownGeometry(mergedGeo);

  const mesh = new THREE.Mesh(mergedGeo, mat);
  mesh.castShadow = !mat.transparent;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function buildFlumeChannel(ctx, parent, track, frames, materials, passage = null, terrain = null) {
  if (!frames || frames.length < 2) return parent;

  const parsed = frames.map(f => {
    const pos = new THREE.Vector3(f.position.x / 1000, f.position.z / 1000, f.position.y / 1000);
    const fwd = new THREE.Vector3(f.direction.x, f.direction.z, f.direction.y).normalize();
    const up = new THREE.Vector3(f.up.x, f.up.z, f.up.y).normalize();
    const right = new THREE.Vector3().crossVectors(up, fwd).normalize();
    const ground = (f.groundMm != null)
      ? f.groundMm / 1000
      : (ctx.surfaceHeight ? ctx.surfaceHeight(pos.x / 4, pos.z / 4) : 0);
    return { pos, fwd, up, right, ground };
  });

  const sDist = [0];
  for (let i = 1; i < parsed.length; i++) {
    sDist[i] = sDist[i - 1] + parsed[i].pos.distanceTo(parsed[i - 1].pos);
  }

  const terrainPlan = planFlumeTerrain(parsed, sDist, track, passage, terrain, makeBasisMatrix);

  const pieceGroup = new THREE.Group();
  pieceGroup.name = `Flume_${track.piece}_${track.id}`;
  if (parent.userData?.selection) {
    pieceGroup.userData.selection = parent.userData.selection;
  }

  const buckets = { concrete: [], timber: [], boards: [], roof: [], metal: [], water: [] };
  const disposables = [];
  try {

  // 1. Continuous Solid Trough Cross-Section Sweep
  const PROFILE = [
    [-1.2, 0.0], [-1.2, 1.0],
    [-1.0, 1.0], [-1.0, 0.1],
    [+1.0, 0.1], [+1.0, 1.0],
    [+1.2, 1.0], [+1.2, 0.0],
  ];
  const STRIP_WIDTHS = [1.0, 0.2, 0.9, 2.0, 0.9, 0.2, 1.0, 2.4];
  const N = parsed.length;
  const troughVertCount = 8 * 2 * N;
  const troughIdxCount = 8 * (N - 1) * 6;
  const tPos = new Float32Array(troughVertCount * 3);
  const tNorm = new Float32Array(troughVertCount * 3);
  const tUv = new Float32Array(troughVertCount * 2);
  const tIdx = new Uint16Array(troughIdxCount);

  let vPtr = 0, iPtr = 0;
  for (let s = 0; s < 8; s++) {
    const sBase = vPtr / 3;
    const [rA, uA] = PROFILE[s];
    const [rB, uB] = PROFILE[(s + 1) % 8];
    const width = STRIP_WIDTHS[s];

    for (let i = 0; i < N; i++) {
      const { pos, up, right } = parsed[i];
      const vDist = sDist[i];

      const pA = pos.clone().addScaledVector(right, rA).addScaledVector(up, uA);
      tPos[vPtr] = pA.x; tPos[vPtr + 1] = pA.y; tPos[vPtr + 2] = pA.z;
      tUv[(vPtr / 3) * 2] = 0; tUv[(vPtr / 3) * 2 + 1] = vDist;
      vPtr += 3;

      const pB = pos.clone().addScaledVector(right, rB).addScaledVector(up, uB);
      tPos[vPtr] = pB.x; tPos[vPtr + 1] = pB.y; tPos[vPtr + 2] = pB.z;
      tUv[(vPtr / 3) * 2] = width; tUv[(vPtr / 3) * 2 + 1] = vDist;
      vPtr += 3;

      if (i < N - 1) {
        const a0 = sBase + i * 2, b0 = a0 + 1, a1 = a0 + 2, b1 = a0 + 3;
        tIdx[iPtr++] = a0; tIdx[iPtr++] = a1; tIdx[iPtr++] = b0;
        tIdx[iPtr++] = b0; tIdx[iPtr++] = a1; tIdx[iPtr++] = b1;
      }
    }
  }

  const troughGeo = new THREE.BufferGeometry();
  troughGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  troughGeo.setAttribute('normal', new THREE.BufferAttribute(tNorm, 3));
  troughGeo.setAttribute('uv', new THREE.BufferAttribute(tUv, 2));
  troughGeo.setIndex(new THREE.BufferAttribute(tIdx, 1));
  troughGeo.computeVertexNormals();
  disposables.push(troughGeo);
  buckets.concrete.push({ geometry: troughGeo, matrix: null });

  // 2. Physical Water Plane Sweep at Local Up +0.6m
  const wVertCount = 2 * N;
  const wIdxCount = (N - 1) * 6;
  const wPos = new Float32Array(wVertCount * 3);
  const wNorm = new Float32Array(wVertCount * 3);
  const wUv = new Float32Array(wVertCount * 2);
  const wIdx = new Uint16Array(wIdxCount);

  let wvPtr = 0, wiPtr = 0;
  for (let i = 0; i < N; i++) {
    const { pos, up, right } = parsed[i];
    const vDist = sDist[i];

    const pL = pos.clone().addScaledVector(right, -0.99).addScaledVector(up, 0.60);
    wPos[wvPtr] = pL.x; wPos[wvPtr + 1] = pL.y; wPos[wvPtr + 2] = pL.z;
    wNorm[wvPtr] = up.x; wNorm[wvPtr + 1] = up.y; wNorm[wvPtr + 2] = up.z;
    wUv[(wvPtr / 3) * 2] = 0; wUv[(wvPtr / 3) * 2 + 1] = vDist;
    wvPtr += 3;

    const pR = pos.clone().addScaledVector(right, 0.99).addScaledVector(up, 0.60);
    wPos[wvPtr] = pR.x; wPos[wvPtr + 1] = pR.y; wPos[wvPtr + 2] = pR.z;
    wNorm[wvPtr] = up.x; wNorm[wvPtr + 1] = up.y; wNorm[wvPtr + 2] = up.z;
    wUv[(wvPtr / 3) * 2] = 1.98; wUv[(wvPtr / 3) * 2 + 1] = vDist;
    wvPtr += 3;

    if (i < N - 1) {
      const a0 = i * 2, b0 = a0 + 1, a1 = a0 + 2, b1 = a0 + 3;
      wIdx[wiPtr++] = a0; wIdx[wiPtr++] = a1; wIdx[wiPtr++] = b0;
      wIdx[wiPtr++] = b0; wIdx[wiPtr++] = a1; wIdx[wiPtr++] = b1;
    }
  }

  const waterGeo = new THREE.BufferGeometry();
  waterGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3));
  waterGeo.setAttribute('normal', new THREE.BufferAttribute(wNorm, 3));
  waterGeo.setAttribute('uv', new THREE.BufferAttribute(wUv, 2));
  waterGeo.setIndex(new THREE.BufferAttribute(wIdx, 1));
  disposables.push(waterGeo);
  buckets.water.push({ geometry: waterGeo, matrix: null });

  // 3. Lift Hardware (Start/Core/End): Steel Mechanism Below Local Up +0.3m
  const isLift = track.piece && track.piece.startsWith('lift');
  if (isLift) {
    for (let i = 0; i < N - 1; i++) {
      const f0 = parsed[i], f1 = parsed[i + 1];
      const chordLen = f0.pos.distanceTo(f1.pos);
      if (chordLen < 0.001) continue;

      const segCenter = f0.pos.clone().add(f1.pos).multiplyScalar(0.5);
      const chordBasis = makeBasisMatrix(f1.pos.clone().sub(f0.pos), f0.up, segCenter);

      let boxLen = chordLen;
      let longBasis = chordBasis;
      if (track.piece === 'lift-start' && i === 0) {
        const chordForward = f1.pos.clone().sub(f0.pos).normalize();
        const chordUp = new THREE.Vector3().setFromMatrixColumn(chordBasis, 1);
        const inset = Math.max(0, -0.25 * chordUp.dot(f0.fwd) / chordForward.dot(f0.fwd)) + 0.001;
        boxLen = chordLen - inset;
        longBasis = chordBasis.clone().setPosition(segCenter.clone().addScaledVector(chordForward, inset * 0.5));
      }

      const geoChain = createPhysicalBox(0.22, 0.08, boxLen);
      const matChain = longBasis.clone().multiply(new THREE.Matrix4().setPosition(0, 0.14, 0));
      buckets.metal.push({ geometry: geoChain, matrix: matChain });
      disposables.push(geoChain);

      const geoRatchet = createPhysicalBox(0.04, 0.06, boxLen);
      const matRatchet = longBasis.clone().multiply(new THREE.Matrix4().setPosition(0.16, 0.15, 0));
      buckets.metal.push({ geometry: geoRatchet, matrix: matRatchet });
      disposables.push(geoRatchet);

      const geoRubL = createPhysicalBox(0.05, 0.06, boxLen);
      const matRubL = longBasis.clone().multiply(new THREE.Matrix4().setPosition(-0.96, 0.22, 0));
      const matRubR = longBasis.clone().multiply(new THREE.Matrix4().setPosition(0.96, 0.22, 0));
      buckets.timber.push({ geometry: geoRubL, matrix: matRubL });
      buckets.timber.push({ geometry: geoRubL, matrix: matRubR });
      disposables.push(geoRubL);

      if (i % 2 === 0) {
        const geoRoller = createPhysicalBox(0.18, 0.05, 0.08);
        const matRoller = chordBasis.clone().multiply(new THREE.Matrix4().setPosition(0, 0.17, 0));
        buckets.metal.push({ geometry: geoRoller, matrix: matRoller });
        disposables.push(geoRoller);
      }
    }
  }

  // 4. Structural Timber Trestles to Native Terrain (Open Channel)
  if (track.piece !== 'station') {
    let nextBentDist = 1.0;
    for (let i = 0; i < N - 1; i++) {
      const f0 = parsed[i], f1 = parsed[i + 1];
      const chordLen = f0.pos.distanceTo(f1.pos);

      while (nextBentDist <= sDist[i] + chordLen) {
        const alpha = (nextBentDist - sDist[i]) / chordLen;
        const bPos = f0.pos.clone().lerp(f1.pos, alpha);
        const bUp = f0.up.clone().lerp(f1.up, alpha).normalize();
        const bFwd = f0.fwd.clone().lerp(f1.fwd, alpha).normalize();
        const bGround = f0.ground + (f1.ground - f0.ground) * alpha;

        const terrainEntry = terrainPlan?.bents.get(nextBentDist);
        if (terrainEntry && !terrainEntry.legacy) {
          appendFlumeTerrain(terrainEntry, buckets, disposables);
        } else {
        const h = bPos.y - bGround;
        if (h > 0.45) {
          const bentBasis = makeBasisMatrix(bFwd, bUp, bPos);
          const hUp = new THREE.Vector3(0, 1, 0);
          const hFwd = bFwd.clone().setY(0).normalize();
          if (hFwd.lengthSq() < 1e-4) hFwd.set(0, 0, 1);
          const hRight = new THREE.Vector3().crossVectors(hUp, hFwd).normalize();
          const hBasis = new THREE.Matrix4().makeBasis(hRight, hUp, hFwd);

          const geoCap = createPhysicalBox(2.36, 0.16, 0.20);
          const matCap = bentBasis.clone().multiply(new THREE.Matrix4().setPosition(0, -0.08, 0));
          buckets.timber.push({ geometry: geoCap, matrix: matCap });
          disposables.push(geoCap);

          const postH = Math.max(0.15, (bPos.y - 0.16) - (bGround + 0.14));
          const geoPost = createPhysicalBox(0.14, postH, 0.14);
          const pL = bPos.clone().addScaledVector(hRight, -1.02); pL.y = bGround + 0.14 + postH * 0.5;
          const pR = bPos.clone().addScaledVector(hRight, 1.02); pR.y = bGround + 0.14 + postH * 0.5;
          buckets.timber.push({ geometry: geoPost, matrix: hBasis.clone().setPosition(pL) });
          buckets.timber.push({ geometry: geoPost, matrix: hBasis.clone().setPosition(pR) });
          disposables.push(geoPost);

          const geoFoot = createPhysicalBox(0.28, 0.14, 0.28);
          const fL = pL.clone(); fL.y = bGround + 0.07;
          const fR = pR.clone(); fR.y = bGround + 0.07;
          buckets.concrete.push({ geometry: geoFoot, matrix: hBasis.clone().setPosition(fL) });
          buckets.concrete.push({ geometry: geoFoot, matrix: hBasis.clone().setPosition(fR) });
          disposables.push(geoFoot);

          if (postH > 1.8) {
            const geoTie = createPhysicalBox(2.04, 0.12, 0.12);
            const tiePos = bPos.clone(); tiePos.y = bGround + 0.14 + postH * 0.5;
            buckets.timber.push({ geometry: geoTie, matrix: hBasis.clone().setPosition(tiePos) });
            disposables.push(geoTie);
          }
        }
        }
        nextBentDist += 2.4;
      }
    }
  }

  // 5. Restrained 4.4m Station Dock (Deck +0.85m, Walkway ≥0.8m, Roof Under 3m, Underside ≥2.25m)
  if (track.piece === 'station') {
    const f0 = parsed[0];
    const fMid = parsed[Math.floor(N / 2)];
    const stationBasis = makeBasisMatrix(f0.fwd, f0.up, fMid.pos);
    const L = 4.0;

    const geoPlank = createPhysicalBox(1.0, 0.05, L);
    const matDeckL = stationBasis.clone().multiply(new THREE.Matrix4().setPosition(-1.70, 0.825, 0));
    const matDeckR = stationBasis.clone().multiply(new THREE.Matrix4().setPosition(1.70, 0.825, 0));
    buckets.boards.push({ geometry: geoPlank, matrix: matDeckL });
    buckets.boards.push({ geometry: geoPlank, matrix: matDeckR });
    disposables.push(geoPlank);

    const geoJoist = createPhysicalBox(0.12, 0.35, L);
    const matJoistL = stationBasis.clone().multiply(new THREE.Matrix4().setPosition(-1.26, 0.625, 0));
    const matJoistR = stationBasis.clone().multiply(new THREE.Matrix4().setPosition(1.26, 0.625, 0));
    buckets.timber.push({ geometry: geoJoist, matrix: matJoistL });
    buckets.timber.push({ geometry: geoJoist, matrix: matJoistR });
    disposables.push(geoJoist);

    const hasPassage = Boolean(passage && passage.portal && passage.portal.station === track.id);
    if (!hasPassage) {
      const geoRailTop = createPhysicalBox(0.04, 0.06, L - 0.04);
      const geoRailMid = createPhysicalBox(0.03, 0.04, L - 0.04);
      const geoKerb = createPhysicalBox(0.04, 0.06, L - 0.04);
      for (const sign of [-1, 1]) {
        const matTop = stationBasis.clone().multiply(new THREE.Matrix4().setPosition(sign * 2.17, 1.72, 0));
        const matMid = stationBasis.clone().multiply(new THREE.Matrix4().setPosition(sign * 2.17, 1.30, 0));
        const matK = stationBasis.clone().multiply(new THREE.Matrix4().setPosition(sign * 1.22, 0.88, 0));
        buckets.timber.push({ geometry: geoRailTop, matrix: matTop });
        buckets.timber.push({ geometry: geoRailMid, matrix: matMid });
        buckets.timber.push({ geometry: geoKerb, matrix: matK });
      }
      disposables.push(geoRailTop, geoRailMid, geoKerb);

      const geoRPost = createPhysicalBox(0.05, 0.90, 0.05);
      for (const sign of [-1, 1]) {
        for (const z of [-1.5, -0.75, 0, 0.75, 1.5]) {
          const matRP = stationBasis.clone().multiply(new THREE.Matrix4().setPosition(sign * 2.17, 1.30, z));
          buckets.timber.push({ geometry: geoRPost, matrix: matRP });
        }
      }
      disposables.push(geoRPost);
    } else {
      const stationDir = track.origin?.direction ?? (
        Math.abs(f0.fwd.x) > Math.abs(f0.fwd.z) ? (f0.fwd.x > 0 ? 0 : 2) : (f0.fwd.z > 0 ? 1 : 3)
      );
      const side = ((passage.portal.direction - stationDir + 4) % 4 === 1) ? 1 : -1;
      const geoRailTop = createPhysicalBox(0.04, 0.06, L - 0.04);
      const geoRailMid = createPhysicalBox(0.03, 0.04, L - 0.04);
      const geoKerb = createPhysicalBox(0.04, 0.06, L - 0.04);
      const geoRailTopA = createPhysicalBox(0.04, 0.06, 0.53);
      const geoRailTopB = createPhysicalBox(0.04, 0.06, 2.63);
      const geoRailMidA = createPhysicalBox(0.03, 0.04, 0.53);
      const geoRailMidB = createPhysicalBox(0.03, 0.04, 2.63);

      for (const sign of [-1, 1]) {
        if (sign !== side) {
          buckets.timber.push({ geometry: geoRailTop, matrix: stationBasis.clone().multiply(new THREE.Matrix4().setPosition(sign * 2.17, 1.72, 0)) });
          buckets.timber.push({ geometry: geoRailMid, matrix: stationBasis.clone().multiply(new THREE.Matrix4().setPosition(sign * 2.17, 1.30, 0)) });
        } else {
          buckets.timber.push(
            { geometry: geoRailTopA, matrix: stationBasis.clone().multiply(new THREE.Matrix4().setPosition(sign * 2.17, 1.72, -1.715)) },
            { geometry: geoRailTopB, matrix: stationBasis.clone().multiply(new THREE.Matrix4().setPosition(sign * 2.17, 1.72, 0.665)) },
            { geometry: geoRailMidA, matrix: stationBasis.clone().multiply(new THREE.Matrix4().setPosition(sign * 2.17, 1.30, -1.715)) },
            { geometry: geoRailMidB, matrix: stationBasis.clone().multiply(new THREE.Matrix4().setPosition(sign * 2.17, 1.30, 0.665)) }
          );
        }
        buckets.timber.push({ geometry: geoKerb, matrix: stationBasis.clone().multiply(new THREE.Matrix4().setPosition(sign * 1.22, 0.88, 0)) });
      }
      disposables.push(geoRailTop, geoRailMid, geoKerb, geoRailTopA, geoRailTopB, geoRailMidA, geoRailMidB);

      const geoRPost = createPhysicalBox(0.05, 0.90, 0.05);
      for (const sign of [-1, 1]) {
        for (const z of [-1.5, -0.75, 0, 0.75, 1.5]) {
          if (sign === side && z === -0.75) continue;
          buckets.timber.push({ geometry: geoRPost, matrix: stationBasis.clone().multiply(new THREE.Matrix4().setPosition(sign * 2.17, 1.30, z)) });
        }
      }
      disposables.push(geoRPost);

      if (passage.sharedGroundMm != null) {
        const groundY = passage.sharedGroundMm / 1000;
        const beamY = fMid.pos.y + 0.80;
        const legH = beamY - groundY;
        if (legH > 0.05) {
          const footH = Math.min(0.14, legH);
          const postH = legH - footH;
          const geoFoot = createPhysicalBox(0.14, footH, 0.14);
          disposables.push(geoFoot);
          const geoLegPost = postH > 0.001 ? createPhysicalBox(0.10, postH, 0.10) : null;
          if (geoLegPost) disposables.push(geoLegPost);

          for (const aLeg of [0.60, 1.30]) {
            const zLeg = aLeg - 2;
            const xLeg = side * (4 - 1.91);
            const fCenterY = (groundY + footH * 0.5) - fMid.pos.y;
            buckets.concrete.push({ geometry: geoFoot, matrix: stationBasis.clone().multiply(new THREE.Matrix4().setPosition(xLeg, fCenterY, zLeg)) });
            if (geoLegPost) {
              const pCenterY = (groundY + footH + postH * 0.5) - fMid.pos.y;
              buckets.timber.push({ geometry: geoLegPost, matrix: stationBasis.clone().multiply(new THREE.Matrix4().setPosition(xLeg, pCenterY, zLeg)) });
            }
          }
        }
      }
    }

    const geoPost = createPhysicalBox(0.10, 1.43, 0.10);
    const geoPlate = createPhysicalBox(0.12, 0.03, 0.12);
    const geoTie = createPhysicalBox(4.30, 0.08, 0.12);
    const geoKing = createPhysicalBox(0.10, 0.54, 0.10);
    for (const z of [-1.5, 0, 1.5]) {
      for (const sign of [-1, 1]) {
        const matPost = stationBasis.clone().multiply(new THREE.Matrix4().setPosition(sign * 2.12, 1.565, z));
        const matPlate = stationBasis.clone().multiply(new THREE.Matrix4().setPosition(sign * 2.12, 0.865, z));
        buckets.timber.push({ geometry: geoPost, matrix: matPost });
        buckets.metal.push({ geometry: geoPlate, matrix: matPlate });
      }
      const matTie = stationBasis.clone().multiply(new THREE.Matrix4().setPosition(0, 2.30, z));
      const matKing = stationBasis.clone().multiply(new THREE.Matrix4().setPosition(0, 2.61, z));
      buckets.timber.push({ geometry: geoTie, matrix: matTie });
      buckets.timber.push({ geometry: geoKing, matrix: matKing });
    }
    disposables.push(geoPost, geoPlate, geoTie, geoKing);

    const angle = Math.atan2(0.56, 2.16);
    const geoRoof = createPhysicalBox(2.23, 0.05, L);
    const matRoofL = stationBasis.clone().multiply(
      new THREE.Matrix4().setPosition(-1.08, 2.64, 0).multiply(new THREE.Matrix4().makeRotationZ(angle))
    );
    const matRoofR = stationBasis.clone().multiply(
      new THREE.Matrix4().setPosition(1.08, 2.64, 0).multiply(new THREE.Matrix4().makeRotationZ(-angle))
    );
    buckets.roof.push({ geometry: geoRoof, matrix: matRoofL });
    buckets.roof.push({ geometry: geoRoof, matrix: matRoofR });
    disposables.push(geoRoof);

    const geoRidge = createPhysicalBox(0.16, 0.04, L);
    const matRidge = stationBasis.clone().multiply(new THREE.Matrix4().setPosition(0, 2.94, 0));
    buckets.roof.push({ geometry: geoRidge, matrix: matRidge });
    disposables.push(geoRidge);

    const geoBollard = createPhysicalBox(0.06, 0.08, 0.06);
    for (const z of [-0.9, 0.9]) {
      for (const sign of [-1, 1]) {
        const matB = stationBasis.clone().multiply(new THREE.Matrix4().setPosition(sign * 1.23, 0.89, z));
        buckets.metal.push({ geometry: geoBollard, matrix: matB });
      }
    }
    disposables.push(geoBollard);
  }

  // 6. Materials & Final Piece Batches
  const rippleMap = ctx.texture('flume:water:ripples', 128, 128, (c, w, h) => {
    c.fillStyle = '#2c7686';
    c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      for (let x = 0; x < w; x += 16) {
        const k = Math.sin((x / w) * Math.PI * 4) * Math.cos((y / h) * Math.PI * 4);
        c.fillStyle = k > 0 ? 'rgba(64, 150, 168, 0.28)' : 'rgba(26, 76, 88, 0.28)';
        c.beginPath();
        c.arc((x + 8) % w, (y + 8) % h, 10, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.strokeStyle = 'rgba(218, 246, 252, 0.42)';
    c.lineWidth = 1.2;
    c.lineCap = 'round';
    for (let row = 0; row < 8; row++) {
      const y = row * 16 + 8;
      const xOff = (row * 37) % 32;
      for (let xBase = xOff - 32; xBase < w + 32; xBase += 32) {
        const len = 14 + (row % 3) * 3;
        c.beginPath();
        c.moveTo(xBase, y);
        c.quadraticCurveTo(xBase + len * 0.5, y - 1.5, xBase + len, y);
        c.stroke();
      }
    }
  });

  const matWater = ctx.material('flume:water:standard', {
    color: '#d6f2f7',
    map: rippleMap,
    roughness: 0.18,
    metalness: 0.08,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });

  mergeBucket(ctx, pieceGroup, materials.concrete, buckets.concrete);
  mergeBucket(ctx, pieceGroup, materials.timber, buckets.timber);
  mergeBucket(ctx, pieceGroup, materials.boards, buckets.boards);
  mergeBucket(ctx, pieceGroup, materials.roof ?? materials.boards, buckets.roof);
  mergeBucket(ctx, pieceGroup, materials.metal, buckets.metal);
  mergeBucket(ctx, pieceGroup, matWater, buckets.water);

  for (const g of disposables) {
    g.dispose();
  }

  parent.add(pieceGroup);
  return parent;
  } catch (error) {
    for (const geometry of disposables) geometry.dispose();
    throw error;
  }
}
