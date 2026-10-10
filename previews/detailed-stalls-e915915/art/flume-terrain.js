import * as THREE from 'three';
import { planSupportBox, buildSupportBox } from './flume-support-box.js';

function sampledHeight(plan, x, y) {
  return plan.tiles.find(t => t.tileX === Math.floor(x) && t.tileY === Math.floor(y))?.ground;
}

function envelope(probe, width, centre, basis, top) {
  const bottom = Math.min(...probe.tiles.map(t => t.ground));
  if (bottom >= top) return null;
  return planSupportBox({ size: [width, top - bottom, width], matrix: basis.clone().setPosition(centre.clone().setY((bottom + top) / 2)) },
    (x, y) => sampledHeight(probe, x, y));
}

function finish(bents) {
  const reject = () => { throw new TypeError('Terrain bent plans are read-only.'); };
  Object.defineProperties(bents, { set: { value: reject }, delete: { value: reject }, clear: { value: reject } });
  return Object.freeze({ bents: Object.freeze(bents) });
}

function planStation(parsed, track, passage, sample, makeBasisMatrix) {
  if (!(passage && passage.portal && passage.portal.station === track.id)) return;
  if (!Number.isFinite(passage.sharedGroundMm)) throw new RangeError('Passage shared ground must be finite.');
  const f0 = parsed[0], fMid = parsed[Math.floor(parsed.length / 2)];
  const basis = makeBasisMatrix(f0.fwd, f0.up, fMid.pos);
  const direction = track.origin?.direction ?? (Math.abs(f0.fwd.x) > Math.abs(f0.fwd.z) ? (f0.fwd.x > 0 ? 0 : 2) : (f0.fwd.z > 0 ? 1 : 3));
  const side = (passage.portal.direction - direction + 4) % 4 === 1 ? 1 : -1;
  const ground = passage.sharedGroundMm / 1000, legH = fMid.pos.y + 0.80 - ground;
  // Positive probes retain the horizontal Native-station footprints even when no leg is emitted.
  const footH = legH > 0.05 ? Math.min(0.14, legH) : 0.14;
  const postH = legH - footH > 0.001 ? legH - footH : 0.10;
  for (const a of [0.60, 1.30]) {
    for (const [width, height, y] of [[0.14, footH, ground + footH * 0.5], [0.10, postH, ground + footH + postH * 0.5]]) {
      const matrix = basis.clone().multiply(new THREE.Matrix4().setPosition(side * 2.09, y - fMid.pos.y, a - 2));
      const plan = planSupportBox({ size: [width, height, width], matrix }, sample);
      if (plan.tiles.some(t => t.ground !== ground)) throw new RangeError('Passage support terrain differs from shared ground.');
    }
  }
}

export function planFlumeTerrain(parsed, sDist, track, passage, terrain, makeBasisMatrix) {
  if (terrain == null) return null;
  if (typeof terrain.surfaceHeight !== 'function') throw new TypeError('A strict terrain surfaceHeight sampler is required.');
  const sample = (x, y) => terrain.surfaceHeight(x, y), bents = new Map();
  if (track.piece === 'station') {
    planStation(parsed, track, passage, sample, makeBasisMatrix);
    return finish(bents);
  }
  let nextBentDist = 1.0;
  for (let i = 0; i < parsed.length - 1; i++) {
    const f0 = parsed[i], f1 = parsed[i + 1], chordLen = f0.pos.distanceTo(f1.pos);
    while (nextBentDist <= sDist[i] + chordLen) {
      const alpha = (nextBentDist - sDist[i]) / chordLen;
      const bPos = f0.pos.clone().lerp(f1.pos, alpha);
      const bUp = f0.up.clone().lerp(f1.up, alpha).normalize();
      const bFwd = f0.fwd.clone().lerp(f1.fwd, alpha).normalize();
      const bGround = f0.ground + (f1.ground - f0.ground) * alpha;
      const bentBasis = makeBasisMatrix(bFwd, bUp, bPos);
      const hUp = new THREE.Vector3(0, 1, 0), hFwd = bFwd.clone().setY(0).normalize();
      if (hFwd.lengthSq() < 1e-4) hFwd.set(0, 0, 1);
      const hRight = new THREE.Vector3().crossVectors(hUp, hFwd).normalize();
      const hBasis = new THREE.Matrix4().makeBasis(hRight, hUp, hFwd);
      const centres = [-1, 1].map(sign => bPos.clone().addScaledVector(hRight, sign * 1.02));
      const feetProbe = centres.map(p => planSupportBox({ size: [0.28, 1, 0.28], matrix: hBasis.clone().setPosition(p) }, sample));
      const postsProbe = centres.map(p => planSupportBox({ size: [0.14, 1, 0.14], matrix: hBasis.clone().setPosition(p) }, sample));
      const cap = planSupportBox({ size: [2.36, 0.16, 0.20], matrix: bentBasis.clone().multiply(new THREE.Matrix4().setPosition(0, -0.08, 0)) }, sample);
      const tieProbe = planSupportBox({ size: [2.04, 0.12, 0.12], matrix: hBasis.clone().setPosition(bPos) }, sample);
      const all = [...feetProbe, ...postsProbe, cap, tieProbe];
      const legacy = all.every(p => p.tiles.every(t => t.ground === bGround));
      const emit = feetProbe.some(p => p.tiles.some(t => bPos.y - t.ground > 0.45));
      const top = bPos.y - 0.16;
      const feet = feetProbe.map((p, side) => envelope(p, 0.28, centres[side], hBasis, top));
      const posts = postsProbe.map((p, side) => envelope(p, 0.14, centres[side], hBasis, top));
      const surviving = postsProbe.map(p => p.tiles.filter(t => top > t.ground + 0.14).map(t => t.ground + 0.14));
      let tie = null;
      if (surviving.every(p => p.length > 0)) {
        const postBottom = Math.max(...surviving.flat());
        if (top - postBottom > 1.8) {
          const terrainTop = Math.max(...tieProbe.tiles.map(t => t.ground));
          const low = Math.max(postBottom, terrainTop) + 0.06, high = top - 0.06;
          if (low <= high) {
            const y = Math.max((postBottom + top) * 0.5, low);
            tie = planSupportBox({ size: [2.04, 0.12, 0.12], matrix: hBasis.clone().setPosition(bPos.clone().setY(y)) },
              (x, z) => sampledHeight(tieProbe, x, z));
          }
        }
      }
      bents.set(nextBentDist, Object.freeze({ legacy, emit, cap, feet: Object.freeze(feet), posts: Object.freeze(posts), tie }));
      nextBentDist += 2.4;
    }
  }
  return finish(bents);
}

export function appendFlumeTerrain(entry, buckets, disposables) {
  if (!entry?.emit || entry.legacy) return;
  if (!Array.isArray(buckets.concrete) || !Array.isArray(buckets.timber) || !Array.isArray(disposables)) throw new TypeError('Support buckets and temporary disposables must be arrays.');
  const append = (plan, material, options) => {
    if (!plan) return;
    for (const part of buildSupportBox(plan, options)) {
      disposables.push(part.geometry);
      buckets[material].push({ geometry: part.geometry, matrix: null });
    }
  };
  append(entry.cap, 'timber');
  entry.feet.forEach(p => append(p, 'concrete', { topAboveGround: 0.14 }));
  entry.posts.forEach(p => append(p, 'timber', { bottomAboveGround: 0.14 }));
  append(entry.tie, 'timber');
}
