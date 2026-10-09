import * as THREE from 'three';

function createPhysicalBox(sx, sy, sz) {
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  const uvs = geo.attributes.uv;
  const scales = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
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
  const normMat = new THREE.Matrix3(), v = new THREE.Vector3(), n = new THREE.Vector3();
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

export function createFlumePortal(ctx, parent, portal, station, frames, materials) {
  if (!portal || !station || !frames || frames.length < 2) return parent;
  const parsed = frames.map(f => ({
    pos: new THREE.Vector3(f.position.x / 1000, f.position.z / 1000, f.position.y / 1000),
    fwd: new THREE.Vector3(f.direction.x, f.direction.z, f.direction.y).normalize(),
    up: new THREE.Vector3(f.up.x, f.up.z, f.up.y).normalize(),
  }));
  const f0 = parsed[0], fMid = parsed[Math.floor(parsed.length / 2)];
  const f = f0.fwd.clone().normalize();
  const r = new THREE.Vector3().crossVectors(f0.up, f).normalize();
  const u = new THREE.Vector3().crossVectors(f, r).normalize();
  const stationBasis = new THREE.Matrix4().makeBasis(r, u, f).setPosition(fMid.pos);
  const stationDir = station.origin?.direction ?? (
    Math.abs(f0.fwd.x) > Math.abs(f0.fwd.z) ? (f0.fwd.x > 0 ? 0 : 2) : (f0.fwd.z > 0 ? 1 : 3)
  );
  const side = ((portal.direction - stationDir + 4) % 4 === 1) ? 1 : -1;
  const portalGroup = new THREE.Group();
  portalGroup.name = `FlumePortal_${portal.role}_${portal.id ?? station.id}`;
  if (parent.userData?.selection) portalGroup.userData.selection = parent.userData.selection;
  const buckets = { boards: [], timber: [], metal: [] }, disposables = [];
  function addBox(bucket, a0, a1, b0, b1, y0, y1) {
    const da = Math.abs(a1 - a0), db = Math.abs(b1 - b0), dy = Math.abs(y1 - y0);
    const geo = createPhysicalBox(db, dy, da);
    const aMid = (a0 + a1) * 0.5, bMid = (b0 + b1) * 0.5, yMid = (y0 + y1) * 0.5;
    const mat = stationBasis.clone().multiply(new THREE.Matrix4().setPosition(side * (4 - bMid), yMid, aMid - 2));
    bucket.push({ geometry: geo, matrix: mat });
    disposables.push(geo);
    return mat;
  }
  // 1. Lower landing (a[-.40,1.35], b[-2,-1.20], Top above h: .140)
  addBox(buckets.boards, -0.40, 1.35, -2.00, -1.20, 0.09, 0.14);
  addBox(buckets.timber, -0.38, 1.33, -1.98, -1.22, 0.00, 0.09);
  // 2. Five .40m treads (a[.55,1.35], b[-1.20,.80], Top above h: .282,.424,.566,.708,.850)
  const treadTops = [0.282, 0.424, 0.566, 0.708, 0.850];
  for (let i = 0; i < 5; i++) {
    const b0 = -1.20 + i * 0.40, b1 = b0 + 0.40, topY = treadTops[i];
    addBox(buckets.boards, 0.55, 1.35, b0, b1, topY - 0.05, topY);
    addBox(buckets.timber, 0.57, 1.33, b0, b0 + 0.04, i === 0 ? 0.14 : treadTops[i - 1], topY - 0.05);
  }
  // 3. Upper landing (a[.55,1.35], b[.80,1.80], Top above h: .850)
  addBox(buckets.boards, 0.55, 1.35, 0.80, 1.80, 0.80, 0.85);
  addBox(buckets.timber, 0.57, 1.33, 0.82, 1.78, 0.50, 0.80);
  addBox(buckets.timber, 0.56, 0.62, 0.82, 0.88, 0.00, 0.50);
  addBox(buckets.timber, 1.28, 1.34, 0.82, 0.88, 0.00, 0.50);
  addBox(buckets.timber, 0.56, 0.62, 1.70, 1.76, 0.00, 0.50);
  addBox(buckets.timber, 1.28, 1.34, 1.70, 1.76, 0.00, 0.50);
  addBox(buckets.timber, 0.56, 0.64, 1.55, 1.97, 0.71, 0.80);
  addBox(buckets.timber, 1.26, 1.34, 1.55, 1.97, 0.71, 0.80);
  // 4. Visible continuous timber stringers (repositioned so every vertex >= h while supporting treads)
  const theta = Math.atan2(0.71, 2.00), strLen = Math.hypot(2.00, 0.71);
  const geoStringer = createPhysicalBox(strLen, 0.14, 0.05);
  for (const aCenter of [0.575, 1.325]) {
    const matStr = stationBasis.clone().multiply(
      new THREE.Matrix4().setPosition(side * (4 - (-0.20)), 0.428, aCenter - 2)
    ).multiply(new THREE.Matrix4().makeRotationZ(-side * theta));
    buckets.timber.push({ geometry: geoStringer, matrix: matStr });
  }
  disposables.push(geoStringer);
  // 5. Handrails: sloped stair rails, landing rails, posts outside .60m clear lane
  const geoRailTopSlope = createPhysicalBox(strLen, 0.06, 0.04);
  const geoRailMidSlope = createPhysicalBox(strLen, 0.04, 0.03);
  for (const aCenter of [0.575, 1.325]) {
    const matTop = stationBasis.clone().multiply(
      new THREE.Matrix4().setPosition(side * (4 - (-0.20)), 1.295, aCenter - 2)
    ).multiply(new THREE.Matrix4().makeRotationZ(-side * theta));
    const matMid = stationBasis.clone().multiply(
      new THREE.Matrix4().setPosition(side * (4 - (-0.20)), 0.855, aCenter - 2)
    ).multiply(new THREE.Matrix4().makeRotationZ(-side * theta));
    buckets.timber.push({ geometry: geoRailTopSlope, matrix: matTop });
    buckets.timber.push({ geometry: geoRailMidSlope, matrix: matMid });
    addBox(buckets.timber, aCenter - 0.02, aCenter + 0.02, 0.80, 1.80, 1.69, 1.75);
    addBox(buckets.timber, aCenter - 0.015, aCenter + 0.015, 0.80, 1.80, 1.28, 1.32);
    addBox(buckets.timber, aCenter - 0.025, aCenter + 0.025, 0.77, 0.83, 0.85, 1.75);
    addBox(buckets.timber, aCenter - 0.025, aCenter + 0.025, 1.74, 1.80, 0.85, 1.75);
  }
  disposables.push(geoRailTopSlope, geoRailMidSlope);
  // Lower landing railing along perimeter
  addBox(buckets.timber, 1.305, 1.345, -2.00, -1.20, 0.96, 1.02);
  addBox(buckets.timber, 1.31, 1.34, -2.00, -1.20, 0.57, 0.61);
  addBox(buckets.timber, -0.40, -0.36, -2.00, -1.20, 0.96, 1.02);
  addBox(buckets.timber, -0.395, -0.365, -2.00, -1.20, 0.57, 0.61);
  addBox(buckets.timber, -0.40, 0.58, -1.22, -1.18, 0.96, 1.02);
  addBox(buckets.timber, -0.40, 0.58, -1.215, -1.185, 0.57, 0.61);
  addBox(buckets.timber, -0.40, -0.36, -1.22, -1.18, 0.14, 1.02);
  addBox(buckets.timber, -0.40, -0.36, -2.00, -1.96, 0.14, 1.02);
  addBox(buckets.timber, 1.305, 1.345, -2.00, -1.96, 0.14, 1.02);
  // 6. Portal entry jambs, lintel & restrained steel hardware outside .60m corridor
  addBox(buckets.timber, -0.40, -0.34, -1.98, -1.92, 0.14, 2.20);
  addBox(buckets.timber, 0.34, 0.40, -1.98, -1.92, 0.14, 2.20);
  addBox(buckets.timber, -0.42, 0.42, -1.98, -1.90, 2.10, 2.22);
  addBox(buckets.timber, -0.35, 0.35, -1.98, -1.94, 2.05, 2.25);
  addBox(buckets.metal, -0.41, -0.33, -1.99, -1.91, 0.14, 0.16);
  addBox(buckets.metal, 0.33, 0.41, -1.99, -1.91, 0.14, 0.16);
  addBox(buckets.metal, -0.36, -0.32, -1.99, -1.91, 2.06, 2.10);
  addBox(buckets.metal, 0.32, 0.36, -1.99, -1.91, 2.06, 2.10);
  // 7. Legible role signage facing approach path within b[-2,2]
  const roleText = portal.role === 'entrance' ? 'ENTRANCE' : 'EXIT';
  const signMesh = ctx.text(portalGroup, roleText, {
    width: 0.68, height: 0.20, color: '#fbf4dc',
    background: portal.role === 'entrance' ? '#1e3f28' : '#3b201e',
  });
  if (signMesh) {
    const signPos = new THREE.Vector3(side * (4 - (-1.96)), 2.16, -2.00).applyMatrix4(stationBasis);
    const fwdSign = new THREE.Vector3().setFromMatrixColumn(stationBasis, 0).multiplyScalar(side);
    const upSign = new THREE.Vector3().setFromMatrixColumn(stationBasis, 1);
    const rightSign = new THREE.Vector3().crossVectors(upSign, fwdSign).normalize();
    signMesh.position.copy(signPos);
    signMesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(rightSign, upSign, fwdSign));
  }
  mergeBucket(ctx, portalGroup, materials.boards, buckets.boards);
  mergeBucket(ctx, portalGroup, materials.timber, buckets.timber);
  mergeBucket(ctx, portalGroup, materials.metal, buckets.metal);
  for (const g of disposables) g.dispose();
  parent.add(portalGroup);
  return parent;
}
