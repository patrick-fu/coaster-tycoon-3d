import * as THREE from 'three';

const TILE = 4;
const plans = new WeakSet();
const faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 4, 7, 3], [1, 2, 6, 5], [0, 1, 5, 4], [3, 7, 6, 2]];
const float = new Float32Array(1);
const bits = new Uint32Array(float.buffer);
const equal = (a, b) => a.every((v, i) => v === b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = a => { const l = Math.hypot(...a); return a.map(v => v / l); };

function clean(poly) {
  const out = poly.filter((p, i) => !equal(p, poly[(i + poly.length - 1) % poly.length]));
  return out.length >= 3 ? out : [];
}

function polygonNormal(poly) {
  const n = [0, 0, 0];
  for (let i = 1; i + 1 < poly.length; i++) {
    const c = cross(sub(poly[i], poly[0]), sub(poly[i + 1], poly[0]));
    for (let j = 0; j < 3; j++) n[j] += c[j];
  }
  return n;
}

function area(poly) {
  let a = 0;
  for (let i = 1; i + 1 < poly.length; i++) {
    a += (poly[i][0] - poly[0][0]) * (poly[i + 1][1] - poly[0][1])
      - (poly[i][1] - poly[0][1]) * (poly[i + 1][0] - poly[0][0]);
  }
  return Math.abs(a) / 2;
}

function footprint(corners) {
  const points = [...new Map(corners.map(p => [[p[0], p[2]].join(','), [p[0], p[2]]])).values()]
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const half = seq => {
    const h = [];
    for (const p of seq) {
      while (h.length > 1 && turn(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
      h.push(p);
    }
    return h.slice(0, -1);
  };
  return [...half(points), ...half([...points].reverse())];
}

function clipPolygon(poly, axis, bound, above) {
  const result = [];
  const inside = p => above ? p[axis] >= bound : p[axis] <= bound;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if (inside(a)) result.push(a);
    if (inside(a) !== inside(b)) {
      // Use one edge direction on both incident faces to keep their cut vertices identical.
      const [lo, hi] = a[axis] < b[axis] ? [a, b] : [b, a];
      const t = (bound - lo[axis]) / (hi[axis] - lo[axis]);
      const p = lo.map((v, j) => v + (hi[j] - v) * t);
      p[axis] = bound;
      result.push(p);
    }
  }
  return clean(result);
}

function clipSolid(polys, axis, bound, above) {
  const vertices = polys.flat();
  const d = p => (above ? 1 : -1) * (p[axis] - bound);
  if (!vertices.some(p => d(p) < 0)) return polys;
  if (!vertices.some(p => d(p) > 0)) return [];
  const clipped = polys.map(p => clipPolygon(p, axis, bound, above))
    .filter(p => p.length && Math.hypot(...polygonNormal(p)) > 0);
  const rim = [...new Map(clipped.flat().filter(p => p[axis] === bound).map(p => [p.join(','), p])).values()];
  const a = (axis + 1) % 3, b = (axis + 2) % 3;
  const centre = rim.reduce((c, p) => c.map((v, i) => v + p[i] / rim.length), [0, 0, 0]);
  rim.sort((p, q) => Math.atan2(p[b] - centre[b], p[a] - centre[a]) - Math.atan2(q[b] - centre[b], q[a] - centre[a]));
  if (above) rim.reverse();
  if (rim.length >= 3 && Math.hypot(...polygonNormal(rim)) > 0) clipped.push(rim);
  return clipped;
}

/** Preflight the actual world projection of all eight BOX corners. Allocates no BufferGeometry. */
export function planSupportBox({ size, matrix }, surfaceHeight) {
  if (!Array.isArray(size) || size.length !== 3 || size.some(v => !Number.isFinite(v) || v <= 0)) {
    throw new TypeError('Support BOX size must contain three finite positive metre lengths.');
  }
  const e = Array.from(matrix?.elements ?? matrix ?? []);
  if (e.length !== 16 || e.some(v => !Number.isFinite(v)) || e[3] !== 0 || e[7] !== 0 || e[11] !== 0 || e[15] !== 1) {
    throw new TypeError('Support BOX matrix must be finite and affine (THREE column-major order).');
  }
  const determinant = e[0] * (e[5] * e[10] - e[9] * e[6]) - e[4] * (e[1] * e[10] - e[9] * e[2]) + e[8] * (e[1] * e[6] - e[5] * e[2]);
  if (!Number.isFinite(determinant) || determinant <= 0) throw new RangeError('Support BOX matrix determinant must be positive.');
  if (typeof surfaceHeight !== 'function') throw new TypeError('A strict terrain sampler is required.');
  const corners = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]
    .map(s => s.map((v, i) => v * size[i] / 2))
    .map(([x, y, z]) => [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]);
  if (corners.flat().some(v => !Number.isFinite(v))) throw new RangeError('Transformed support BOX corners must be finite.');
  const projected = footprint(corners), tiles = [];
  const x0 = Math.floor(Math.min(...projected.map(p => p[0])) / TILE), x1 = Math.ceil(Math.max(...projected.map(p => p[0])) / TILE);
  const z0 = Math.floor(Math.min(...projected.map(p => p[1])) / TILE), z1 = Math.ceil(Math.max(...projected.map(p => p[1])) / TILE);
  for (let tileX = x0; tileX < x1; tileX++) for (let tileY = z0; tileY < z1; tileY++) {
    let polygon = projected;
    for (const [axis, bound, above] of [[0, tileX * TILE, true], [0, (tileX + 1) * TILE, false], [1, tileY * TILE, true], [1, (tileY + 1) * TILE, false]]) {
      polygon = clipPolygon(polygon, axis, bound, above);
    }
    const footprintArea = area(polygon);
    if (!(footprintArea > 0)) continue;
    const ground = surfaceHeight(tileX + 0.5, tileY + 0.5);
    if (!Number.isFinite(ground)) throw new RangeError(`Missing or non-finite support terrain at tile ${tileX},${tileY}.`);
    tiles.push(Object.freeze({ tileX, tileY, ground, footprintArea, footprint: Object.freeze(polygon.map(p => Object.freeze([...p]))) }));
  }
  const plan = Object.freeze({ size: Object.freeze([...size]), matrix: Object.freeze(e), corners: Object.freeze(corners.map(p => Object.freeze(p))), tiles: Object.freeze(tiles) });
  plans.add(plan);
  return plan;
}

function roundedBound(v, up) {
  float[0] = v;
  if ((up && float[0] < v) || (!up && float[0] > v)) bits[0] += (v >= 0) === up ? 1 : -1;
  return float[0];
}

function trianglesOfFace(poly, normal) {
  const triangles = [], remaining = [...poly];
  const turnsOutward = (a, b, c) => dot(cross(sub(b, a), sub(c, a)), normal) > 0;
  while (remaining.length > 3) {
    const i = remaining.findIndex((p, j) => {
      const a = remaining[(j + remaining.length - 1) % remaining.length], c = remaining[(j + 1) % remaining.length];
      if (!turnsOutward(a, p, c)) return false;
      const rest = remaining.filter((_, k) => k !== j);
      // Preserve collinear boundary vertices; consuming the last off-line corner would leave an open edge.
      if (!(dot(polygonNormal(rest), normal) > 0)) return false;
      return !rest.some(q => q !== a && q !== c && [[a, p], [p, c], [c, a]].every(([u, v]) => dot(cross(sub(v, u), sub(q, u)), normal) >= 0));
    });
    if (i < 0) throw new RangeError('Support BOX face cannot be triangulated at Float32 precision.');
    triangles.push([remaining[(i + remaining.length - 1) % remaining.length], remaining[i], remaining[(i + 1) % remaining.length]]);
    remaining.splice(i, 1);
  }
  if (!turnsOutward(...remaining)) throw new RangeError('Support BOX face collapsed at Float32 precision.');
  triangles.push(remaining);
  return triangles;
}

function geometryOf(polys, floor, ceiling) {
  const low = roundedBound(floor, true), high = ceiling === Infinity ? Infinity : roundedBound(ceiling, false);
  if (low > high) return null;
  const quantize = p => [Math.fround(p[0]), Math.max(low, Math.min(high, Math.fround(p[1]))), Math.fround(p[2])];
  const positions = [], normals = [], uvs = [];
  for (const polygon of polys) {
    const poly = clean(polygon.map(quantize));
    if (poly.length < 3) continue;
    const n = polygonNormal(poly);
    if (!(Math.hypot(...n) > 0)) continue;
    const normal = unit(n), origin = poly[0];
    const edge = poly.map((p, i) => sub(poly[(i + 1) % poly.length], p)).sort((a, b) => dot(b, b) - dot(a, a))[0];
    const u = unit(edge), v = unit(cross(normal, u));
    for (const triangle of trianglesOfFace(poly, normal)) {
      for (const p of triangle) {
        positions.push(...p); normals.push(...normal);
        uvs.push(dot(sub(p, origin), u), dot(sub(p, origin), v));
      }
    }
  }
  if (!positions.length) return null;
  if ([...positions, ...normals, ...uvs].some(v => !Number.isFinite(v))) throw new RangeError('Support BOX exceeds finite Float32 geometry range.');
  const anchor = positions.slice(0, 3);
  let volume = 0;
  for (let i = 0; i < positions.length; i += 9) volume += dot(sub(positions.slice(i, i + 3), anchor), cross(sub(positions.slice(i + 3, i + 6), anchor), sub(positions.slice(i + 6, i + 9), anchor))) / 6;
  if (!(volume > 0)) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return geometry;
}

/** Temporary, closed world-space BOX portions. The caller disposes every returned geometry. */
export function buildSupportBox(plan, { bottomAboveGround = 0, topAboveGround = Infinity } = {}) {
  if (!plans.has(plan)) throw new TypeError('Use an unmodified planSupportBox result.');
  if (!Number.isFinite(bottomAboveGround) || bottomAboveGround < 0 || !(Number.isFinite(topAboveGround) || topAboveGround === Infinity) || topAboveGround < bottomAboveGround) {
    throw new RangeError('Ground-relative bounds must satisfy 0 <= bottomAboveGround <= topAboveGround.');
  }
  const result = [];
  try {
    for (const tile of plan.tiles) {
      const floor = tile.ground + bottomAboveGround, ceiling = topAboveGround === Infinity ? Infinity : tile.ground + topAboveGround;
      if (!Number.isFinite(floor) || !(Number.isFinite(ceiling) || ceiling === Infinity)) throw new RangeError('Ground-relative bounds must be finite.');
      let solid = faces.map(f => f.map(i => plan.corners[i]));
      for (const [axis, bound, above] of [[0, tile.tileX * TILE, true], [0, (tile.tileX + 1) * TILE, false], [2, tile.tileY * TILE, true], [2, (tile.tileY + 1) * TILE, false], [1, floor, true]]) {
        solid = clipSolid(solid, axis, bound, above);
      }
      if (ceiling !== Infinity) solid = clipSolid(solid, 1, ceiling, false);
      const geometry = geometryOf(solid, floor, ceiling);
      if (geometry) result.push({ tileX: tile.tileX, tileY: tile.tileY, ground: tile.ground, geometry });
    }
    return result;
  } catch (error) {
    for (const part of result) part.geometry.dispose();
    throw error;
  }
}
