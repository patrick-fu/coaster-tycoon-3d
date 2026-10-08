import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const paths = {
  original: '/workspace/coaster-detailed-assets/outputs/wooden-car.glb',
  fixture: '/workspace/coaster-articulated-wooden-joint/results.json',
  fixtureRunner: '/workspace/coaster-articulated-wooden-joint/measure-articulated-joint.mjs',
  fixtureContract: '/workspace/coaster-articulated-wooden-joint/FROZEN-CONTRACT.md',
  negative: '/workspace/coaster-native-calibration/curved-counterexample-result.json',
  reference: path.join(root, 'sources/wooden-car-reference.py'),
  car: path.join(root, 'outputs/wooden-car-joint.glb'),
  link: path.join(root, 'outputs/wooden-drawbar.glb'),
  metadata: path.join(root, 'outputs/hitch-metadata.json'),
  runtime: '/workspace/coaster-classic-game/app/node_modules/three/build/three.module.js',
};
const pinned = {
  original: 'fc988c55ed60dcd5abf7c5e02ecbc1ac3a8cd828cfe7fe4bb8f30bcf21699b59',
  fixture: '167ba3e1da273b66a4bc1d9fb1c3a6fe6c1ec0d2ea54673395f94ae73a287ab6',
  fixtureRunner: '81cb9539c0284d8ee255dfaeae917c4cc15d68e1fb4fa48d102e91b7d81009ee',
  fixtureContract: 'e434bd011890328af693c1e1162bb804479e6ad5eb93a91cf2f0e264287c8107',
  negative: 'b8eef0231d5eedce48b17a9c00465d18c8995296bb7c6845519955c92e8f2311',
  reference: '568a3a3429d2d1ea3edabeadedf253c2b73305626fa58f665b9959b4edf171f2',
};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const output = path.resolve(process.env.JOINT_CHECK_OUTPUT ?? path.join(root, 'checks/joint-results.json'));
if (!output.startsWith(path.join(root, 'checks') + path.sep)) throw new Error('Output must be inside the owned checks directory.');
const partial = { schemaVersion: 1, verdict: 'unavailable', measurementCompleted: false, provenance: {}, scope: 'Finite exported hardware qualification at exactly 59 retained flat poses; no production/native/original/GPU/human acceptance.' };

async function main() {
  if (process.platform !== 'linux' || root !== '/workspace/coaster-wooden-hitch-authoring') throw new Error('Numerical execution is restricted to the owned remote Grok Bot directory.');
  const expected = process.argv.slice(2);
  if (expected.length !== 3 || expected.some(s => !/^[0-9a-f]{64}$/.test(s))) throw new Error('Expected CAR_SHA LINK_SHA METADATA_SHA.');
  const inputs = {};
  for (const key of ['original', 'fixture', 'fixtureRunner', 'fixtureContract', 'negative', 'reference', 'car', 'link', 'metadata']) {
    const bytes = await readFile(paths[key]);
    const hash = sha(bytes), wanted = pinned[key] ?? expected[{ car: 0, link: 1, metadata: 2 }[key]];
    if (hash !== wanted) throw new Error(`Input hash mismatch: ${key}: ${hash}, expected ${wanted}`);
    inputs[key] = { path: paths[key], sha256: hash, bytes: bytes.length };
    inputs[key].data = bytes;
  }
  const fixture = JSON.parse(inputs.fixture.data), retained = JSON.parse(inputs.negative.data);
  if (fixture.sampling.caseCount !== 59 || fixture.cases.length !== 59 || !fixture.sampling.samePriorCourseAndOffsets || fixture.kinematicsVerdict !== 'preserve-finite-sampled-kinematics' || fixture.verdict !== 'unavailable') throw new Error('Unexpected retained fixture verdict or sampling.');
  if (!retained.reproducesReportedWitness) throw new Error('Retained negative control lacks its exact witness.');
  const tol = fixture.tolerances;
  const frozenTolerances = { linkLengthMetres: 1e-4, runningWheelContactMetres: .005, unitFrame: 1e-9, triangleSatProjectionMetres: 1e-9, ignoredAxisLengthSquared: 1e-16, strictInteriorFraction: 1e-6, solidRayMergeMetres: 1e-7, segmentMetres: 1e-9 };
  if (JSON.stringify(tol) !== JSON.stringify(frozenTolerances)) throw new Error('Frozen tolerances changed.');
  if (fixture.constants.drawbarLengthMetres !== .20 || fixture.constants.tileMetres !== 4 || fixture.constants.tickHz !== 40 || fixture.constants.railHalfGaugeMetres !== .48 || fixture.constants.railDatumMetres !== .5) throw new Error('Frozen fixture quantities changed.');
  const runtimeFiles = {};
  for (const [file, record] of Object.entries(fixture.execution.runtimeFiles)) {
    const bytes = await readFile(file), hash = sha(bytes);
    if (hash !== record.sha256) throw new Error(`Pinned runtime file changed: ${file}`);
    runtimeFiles[file] = { sha256: hash, bytes: bytes.length };
  }
  const { Vector3, Matrix4, Quaternion, Triangle, Box3, Ray, REVISION } = await import(pathToFileURL(paths.runtime).href);
  if (REVISION !== fixture.execution.threeRevision || process.version !== fixture.execution.node) throw new Error('Runtime revision differs from the retained experiment.');
  const runnerBytes = await readFile(fileURLToPath(import.meta.url));
  const ownContractBytes = await readFile(path.join(root, 'VALIDATION-CONTRACT.md'));
  const shellBytes = await readFile(path.join(root, 'run-check.sh'));
  const nodeBytes = await readFile(process.execPath);
  partial.provenance = Object.fromEntries(Object.entries(inputs).map(([k, { data, ...record }]) => [k, record]));
  partial.execution = { host: os.hostname(), node: process.version, nodeBinary: process.execPath, nodeBinarySha256: sha(nodeBytes), threeRevision: REVISION, runtimeFiles, timeUtc: new Date().toISOString(), argv: process.argv, runnerSha256: sha(runnerBytes), contractSha256: sha(ownContractBytes), shellSha256: sha(shellBytes) };
  const metadata = JSON.parse(inputs.metadata.data);
  if (metadata.schemaVersion !== 1 || !Array.isArray(metadata.carParts) || !Array.isArray(metadata.drawbarParts) || !Array.isArray(metadata.contacts)) throw new Error('Metadata must follow VALIDATION-CONTRACT.md.');
  const failures = [];
  const fail = (code, details) => failures.push({ code, ...details });
  const vec = value => {
    if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) throw new Error('Expected a finite 3-vector.');
    return new Vector3(...value);
  };
  const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])])) : value;
  const canonical = value => JSON.stringify(stable(value));
  const matrixResidual = (a, b) => Math.max(...a.elements.map((v, i) => Math.abs(v - b.elements[i])));
  function frameCheck(matrix) {
    const e = matrix.elements, x = new Vector3(e[0], e[1], e[2]), y = new Vector3(e[4], e[5], e[6]), z = new Vector3(e[8], e[9], e[10]);
    return { finite: e.every(Number.isFinite), residual: Math.max(Math.abs(x.length() - 1), Math.abs(y.length() - 1), Math.abs(z.length() - 1), Math.abs(x.dot(y)), Math.abs(x.dot(z)), Math.abs(y.dot(z)), Math.abs(matrix.determinant() - 1), Math.abs(e[3]), Math.abs(e[7]), Math.abs(e[11]), Math.abs(e[15] - 1)) };
  }

  let treeId = 0;
  function bvh(triangles) {
    const bounds = new Box3();
    for (const t of triangles) bounds.union(t.bounds);
    const id = treeId++;
    if (triangles.length <= 8) return { id, bounds, triangles };
    const size = bounds.getSize(new Vector3()), axis = size.x >= size.y && size.x >= size.z ? 'x' : size.y >= size.z ? 'y' : 'z';
    const ordered = [...triangles].sort((a, b) => (a.bounds.min[axis] + a.bounds.max[axis]) - (b.bounds.min[axis] + b.bounds.max[axis]));
    const mid = Math.floor(ordered.length / 2);
    return { id, bounds, left: bvh(ordered.slice(0, mid)), right: bvh(ordered.slice(mid)) };
  }
  const vertexKey = p => p.toArray().map(v => Math.round(v / fixture.solver.componentVertexKeyMetres)).join(',');
  function components(triangles) {
    const parent = triangles.map((_, i) => i), seen = new Map();
    const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    for (let i = 0; i < triangles.length; i++) for (const p of triangles[i].vertices) {
      const key = vertexKey(p);
      if (seen.has(key)) parent[find(i)] = find(seen.get(key)); else seen.set(key, i);
    }
    const grouped = new Map();
    for (let i = 0; i < triangles.length; i++) { const id = find(i), list = grouped.get(id) ?? []; list.push(triangles[i]); grouped.set(id, list); }
    return [...grouped.values()].map((list, index) => {
      const vertices = new Map(), edges = new Map(), vertexLinks = new Map();
      let degenerate = 0, volume = 0, weldResidual = 0;
      const origin = list[0].vertices[0];
      for (const t of list) {
        t.component = index;
        const keys = t.vertices.map(vertexKey);
        keys.forEach((key, i) => { if (!vertices.has(key)) vertices.set(key, t.vertices[i]); else weldResidual = Math.max(weldResidual, vertices.get(key).distanceTo(t.vertices[i])); });
        if (new Set(keys).size !== 3 || t.vertices[1].clone().sub(t.vertices[0]).cross(t.vertices[2].clone().sub(t.vertices[0])).lengthSq() < 1e-24) degenerate++;
        volume += t.vertices[0].clone().sub(origin).dot(t.vertices[1].clone().sub(origin).cross(t.vertices[2].clone().sub(origin))) / 6;
        for (let e = 0; e < 3; e++) {
          const a = keys[e], b = keys[(e + 1) % 3], key = [a, b].sort().join('|'), record = edges.get(key) ?? { count: 0, orientation: 0 };
          record.count++; record.orientation += a < b ? 1 : -1; edges.set(key, record);
          const centre = keys[e], left = keys[(e + 1) % 3], right = keys[(e + 2) % 3], link = vertexLinks.get(centre) ?? new Map();
          for (const [one, other] of [[left, right], [right, left]]) { const neighbours = link.get(one) ?? []; neighbours.push(other); link.set(one, neighbours); }
          vertexLinks.set(centre, link);
        }
      }
      const boundaryEdges = [...edges.values()].filter(e => e.count === 1).length;
      const nonmanifoldEdges = [...edges.values()].filter(e => e.count !== 1 && e.count !== 2).length;
      const inconsistentEdges = [...edges.values()].filter(e => e.count === 2 && e.orientation !== 0).length;
      const invalidVertexLinks = [];
      for (const [vertex, link] of vertexLinks) {
        const reached = new Set(), stack = [link.keys().next().value];
        while (stack.length) { const at = stack.pop(); if (reached.has(at)) continue; reached.add(at); for (const neighbour of link.get(at) ?? []) stack.push(neighbour); }
        if (reached.size !== link.size || [...link.values()].some(neighbours => neighbours.length !== 2)) invalidVertexLinks.push({ vertex, neighbours: link.size, connectedNeighbours: reached.size, degrees: [...link.values()].map(n => n.length) });
      }
      const closed = !degenerate && !boundaryEdges && !nonmanifoldEdges && !inconsistentEdges && !invalidVertexLinks.length && weldResidual <= tol.segmentMetres && Math.abs(volume) > 1e-20;
      return { index, triangles: list, vertices: [...vertices.values()], bounds: new Box3().setFromPoints([...vertices.values()]), topology: { closed, boundaryEdges, nonmanifoldEdges, inconsistentEdges, nonmanifoldVertices: invalidVertexLinks.length, firstInvalidVertexLink: invalidVertexLinks[0] ?? null, degenerateTriangles: degenerate, signedVolumeMetres3: volume, componentVertexKeyMetres: fixture.solver.componentVertexKeyMetres, maximumVertexWeldResidualMetres: weldResidual, allowedEdgeClosureResidualMetres: tol.segmentMetres }, tree: bvh(list) };
    });
  }
  function decode(bytes, label) {
    if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) throw new Error(`Invalid GLB: ${label}`);
    let g, bin;
    for (let at = 12; at < bytes.length;) {
      const n = bytes.readUInt32LE(at), type = bytes.readUInt32LE(at + 4), chunk = bytes.subarray(at + 8, at + 8 + n);
      if (at + 8 + n > bytes.length) throw new Error('GLB chunk exceeds file.');
      if (type === 0x4e4f534a) { if (g) throw new Error('Repeated JSON chunk.'); g = JSON.parse(chunk.toString('utf8')); }
      else if (type === 0x004e4942) { if (bin) throw new Error('Repeated BIN chunk.'); bin = chunk; }
      at += 8 + n;
    }
    if (!g || !bin || g.extensionsRequired?.length || g.skins?.length || g.animations?.length || g.buffers.length !== 1 || g.buffers[0].uri) throw new Error('Unsupported fixed rigid GLB.');
    const nodes = new Map(), visited = new Set(), accessorCache = new Map();
    function walk(i, parent) {
      if (visited.has(i)) throw new Error('Repeated or cyclic GLB node.');
      visited.add(i);
      const source = g.nodes[i];
      if (!source?.name || nodes.has(source.name)) throw new Error('All active nodes require unique names.');
      const local = source.matrix ? new Matrix4().fromArray(source.matrix) : new Matrix4().compose(vec(source.translation ?? [0, 0, 0]), new Quaternion(...(source.rotation ?? [0, 0, 0, 1])), vec(source.scale ?? [1, 1, 1]));
      const world = parent ? parent.world.clone().multiply(local) : local.clone();
      if (![...local.elements, ...world.elements].every(Number.isFinite)) throw new Error('Nonfinite GLB node transform.');
      const record = { index: i, name: source.name, source, local, world, parent: parent?.name ?? null };
      nodes.set(source.name, record);
      for (const child of source.children ?? []) walk(child, record);
    }
    for (const i of g.scenes[g.scene ?? 0].nodes) walk(i, null);
    if (visited.size !== g.nodes.length) throw new Error('Inactive GLB nodes are unsupported.');
    function accessor(i) {
      if (accessorCache.has(i)) return accessorCache.get(i);
      const a = g.accessors[i], view = g.bufferViews[a?.bufferView];
      const dim = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a?.type];
      const info = { 5120: [1, 'readInt8'], 5121: [1, 'readUInt8'], 5122: [2, 'readInt16LE'], 5123: [2, 'readUInt16LE'], 5125: [4, 'readUInt32LE'], 5126: [4, 'readFloatLE'] }[a?.componentType];
      if (!a || !view || !dim || !info || a.sparse || view.buffer !== 0) throw new Error('Unsupported accessor.');
      const [size, reader] = info, begin = (view.byteOffset ?? 0) + (a.byteOffset ?? 0), stride = view.byteStride ?? size * dim;
      if (stride < size * dim || begin < 0 || !Number.isInteger(a.count) || a.count < 1) throw new Error('Invalid accessor layout.');
      const data = Array.from({ length: a.count }, (_, row) => Array.from({ length: dim }, (_, col) => {
        const at = begin + row * stride + col * size;
        if (at + size > bin.length || at + size > (view.byteOffset ?? 0) + view.byteLength) throw new Error('Accessor exceeds buffer view.');
        const value = bin[reader](at);
        if (!Number.isFinite(value)) throw new Error('Nonfinite accessor value.');
        return value;
      }));
      const result = { data, descriptor: { type: a.type, componentType: a.componentType, normalized: a.normalized ?? false } };
      accessorCache.set(i, result); return result;
    }
    const materialCache = new Map();
    function imageContent(index) {
      const image = g.images?.[index];
      if (!image) throw new Error('Material refers to missing image.');
      let data, mimeType = image.mimeType;
      if (image.bufferView !== undefined) {
        const view = g.bufferViews[image.bufferView], begin = view?.byteOffset ?? 0;
        if (!view || view.buffer !== 0 || begin < 0 || begin + view.byteLength > bin.length) throw new Error('Image exceeds embedded buffer.');
        data = bin.subarray(begin, begin + view.byteLength);
      } else {
        const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/.exec(image.uri ?? '');
        if (!match) throw new Error('Only embedded image content is supported.');
        mimeType = match[1]; data = Buffer.from(match[2], 'base64');
      }
      return { mimeType, bytes: data.length, contentSha256: sha(data) };
    }
    function textureContent(index) {
      const texture = g.textures?.[index];
      if (!texture || texture.source === undefined || texture.extensions && Object.keys(texture.extensions).length) throw new Error('Unsupported material texture source.');
      const sampler = texture.sampler === undefined ? {} : g.samplers?.[texture.sampler];
      if (!sampler) throw new Error('Missing material sampler.');
      const { name, ...parameters } = sampler;
      return { sampler: { wrapS: 10497, wrapT: 10497, ...parameters }, image: imageContent(texture.source) };
    }
    function materialContent(index) {
      if (index === undefined) return null;
      if (materialCache.has(index)) return materialCache.get(index);
      const source = g.materials?.[index];
      if (!source) throw new Error('Missing material.');
      const resolve = (value, key = '') => {
        if (Array.isArray(value)) return value.map(v => resolve(v));
        if (!value || typeof value !== 'object') return value;
        if (/Texture$/.test(key) && value.index !== undefined) { const { index: textureIndex, ...fields } = value; return { ...stable(fields), resolvedTexture: textureContent(textureIndex) }; }
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v, k)]));
      };
      const result = stable(resolve(source)); materialCache.set(index, result); return result;
    }
    const meshes = new Map();
    for (const node of nodes.values()) if (node.source.mesh !== undefined) {
      const triangles = [], positions = [], records = [];
      for (const p of g.meshes[node.source.mesh].primitives) {
        if ((p.mode ?? 4) !== 4 || p.targets?.length) throw new Error('Only fixed triangle meshes are supported.');
        const attributes = Object.fromEntries(Object.entries(p.attributes).map(([key, i]) => [key, accessor(i)]));
        if (attributes.POSITION?.descriptor.type !== 'VEC3' || attributes.POSITION.descriptor.componentType !== 5126 || attributes.POSITION.descriptor.normalized) throw new Error('Expected float VEC3 POSITION.');
        const count = attributes.POSITION.data.length;
        if (Object.values(attributes).some(a => a.data.length !== count)) throw new Error('Attribute vertex counts differ.');
        const values = attributes.POSITION.data.map(v => vec(v).applyMatrix4(node.world));
        const indexAccessor = p.indices === undefined ? null : accessor(p.indices);
        if (indexAccessor && (indexAccessor.descriptor.type !== 'SCALAR' || ![5121, 5123, 5125].includes(indexAccessor.descriptor.componentType) || indexAccessor.descriptor.normalized)) throw new Error('Unsupported indices.');
        const indices = indexAccessor ? indexAccessor.data.flat() : Array.from({ length: count }, (_, i) => i);
        if (indices.length % 3 || indices.some(i => !Number.isInteger(i) || i < 0 || i >= count)) throw new Error('Invalid triangle indices.');
        const material = materialContent(p.material);
        for (let t = 0; t < indices.length; t += 3) {
          const ids = indices.slice(t, t + 3), vertices = ids.map(i => values[i]);
          const signatures = ids.map(i => canonical(Object.fromEntries(Object.entries(attributes).map(([key, a]) => [key, { ...a.descriptor, value: a.data[i] }]))));
          const cyclic = [0, 1, 2].map(start => [0, 1, 2].map(j => signatures[(start + j) % 3]).join('|')).sort()[0];
          triangles.push({ mesh: node.name, index: triangles.length, vertices, bounds: new Box3().setFromPoints(vertices), signature: canonical(material) + ':' + cyclic });
        }
        positions.push(...values);
        records.push({ position: p.attributes.POSITION, indices: p.indices ?? null, attributes: p.attributes, material: p.material ?? null });
        const a = g.accessors[p.attributes.POSITION], actualBounds = new Box3().setFromPoints(attributes.POSITION.data.map(vec));
        if (a.min && Math.max(...a.min.map((v, i) => Math.abs(v - actualBounds.min.getComponent(i)))) > 1e-6) throw new Error('POSITION minimum disagrees with actual binary values.');
        if (a.max && Math.max(...a.max.map((v, i) => Math.abs(v - actualBounds.max.getComponent(i)))) > 1e-6) throw new Error('POSITION maximum disagrees with actual binary values.');
      }
      const result = { name: node.name, node, triangles, positions, accessors: records, bounds: new Box3().setFromPoints(positions), components: components(triangles), tree: bvh(triangles) };
      result.fingerprint = sha(Buffer.from(triangles.map(t => t.signature).sort().join('\n')));
      meshes.set(node.name, result);
    }
    return { label, nodes, meshes, materialBindings: [...materialCache].map(([index, resolved]) => ({ index, resolved })) };
  }
  const original = decode(inputs.original.data, 'original'), car = decode(inputs.car.data, 'candidate-car'), link = decode(inputs.link.data, 'drawbar');
  const fingerprint = list => sha(Buffer.from(list.map(t => t.signature).sort().join('\n')));
  const originalChassis = original.meshes.get('Chassis_Frame');
  if (!originalChassis || originalChassis.components.length !== 9) throw new Error('Original chassis component inventory changed.');
  for (const id of [7, 8]) {
    const actual = originalChassis.components[id], frozen = fixture.measuredAsset.chassisComponents[id];
    if (actual.triangles.length !== 108 || Math.max(...actual.bounds.min.toArray().map((v, i) => Math.abs(v - frozen.bounds.min[i])), ...actual.bounds.max.toArray().map((v, i) => Math.abs(v - frozen.bounds.max[i]))) > tol.segmentMetres) throw new Error('Original removable component does not match frozen bounds/triangles.');
  }
  const identity = [];
  for (const [name, node] of original.nodes) {
    const candidate = car.nodes.get(name);
    if (!candidate) { fail('missing-original-node', { name }); continue; }
    const localResidual = matrixResidual(node.local, candidate.local), worldResidual = matrixResidual(node.world, candidate.world);
    const passed = localResidual <= tol.unitFrame && worldResidual <= tol.unitFrame && node.parent === candidate.parent && (node.source.mesh === undefined) === (candidate.source.mesh === undefined);
    identity.push({ name, passed, localResidual, worldResidual, originalParent: node.parent, candidateParent: candidate.parent });
    if (!passed) fail('changed-original-node', { name, localResidual, worldResidual, originalParent: node.parent, candidateParent: candidate.parent });
  }
  const preservedMeshes = [];
  for (const [name, mesh] of original.meshes) {
    const candidate = car.meshes.get(name);
    if (!candidate) { fail('missing-original-mesh', { name }); continue; }
    const wanted = name === 'Chassis_Frame' ? originalChassis.components.filter(c => ![7, 8].includes(c.index)).flatMap(c => c.triangles) : mesh.triangles;
    const wantedHash = fingerprint(wanted), actualHash = fingerprint(candidate.triangles), passed = wantedHash === actualHash && wanted.length === candidate.triangles.length;
    preservedMeshes.push({ name, passed, originalTriangles: mesh.triangles.length, expectedTriangles: wanted.length, actualTriangles: candidate.triangles.length, expectedFingerprint: wantedHash, actualFingerprint: actualHash });
    if (!passed) {
      const counts = new Map(); for (const t of wanted) counts.set(t.signature, (counts.get(t.signature) ?? 0) + 1);
      let unexpected = 0; for (const t of candidate.triangles) { const n = counts.get(t.signature) ?? 0; if (n) counts.set(t.signature, n - 1); else unexpected++; }
      fail('changed-original-triangles', { name, unexpectedTriangles: unexpected, missingTriangles: [...counts.values()].reduce((a, b) => a + b, 0), expectedFingerprint: wantedHash, actualFingerprint: actualHash });
    }
    if (name === 'Chassis_Frame') for (const c of candidate.components) {
      const hash = fingerprint(c.triangles), matches = originalChassis.components.filter(o => fingerprint(o.triangles) === hash);
      if (matches.length === 1) c.originalComponent = matches[0].index;
    }
  }
  const partMap = { car: new Map(), link: new Map() };
  if (!metadata.carParts.length) fail('missing-finite-car-hardware', {});
  if (!metadata.drawbarParts.length || !link.meshes.size) fail('missing-finite-drawbar', {});
  for (const [asset, list, model] of [['car', metadata.carParts, car], ['link', metadata.drawbarParts, link]]) {
    for (const part of list) {
      if (typeof part.name !== 'string' || partMap[asset].has(part.name) || !model.meshes.has(part.name) || (asset === 'car' && original.meshes.has(part.name)) || !['front', 'rear'].includes(part.end) && asset === 'car' || !['A', 'B', 'span'].includes(part.end) && asset === 'link' || typeof part.kind !== 'string') throw new Error(`Invalid declared ${asset} part: ${canonical(part)}`);
      partMap[asset].set(part.name, part);
    }
    const actualNewNames = [...model.meshes.keys()].filter(name => asset === 'link' || !original.meshes.has(name));
    if (actualNewNames.length !== list.length || actualNewNames.some(n => !partMap[asset].has(n))) fail('unlisted-new-mesh', { asset, actual: actualNewNames, declared: list.map(p => p.name) });
    for (const part of list) {
      const mesh = model.meshes.get(part.name), frame = frameCheck(mesh.node.world);
      if (!mesh.triangles.length || !mesh.components.length) fail('empty-listed-finite-part', { asset, mesh: part.name });
      if (!frame.finite || frame.residual > tol.unitFrame) fail('non-unit-new-mesh-frame', { asset, mesh: part.name, frame });
      if (mesh.components.length !== 1) fail('new-parts-must-be-separate-connected-meshes', { asset, mesh: part.name, connectedComponents: mesh.components.length });
      for (const c of mesh.components) if (!c.topology.closed) fail('unsupported-new-solid-topology', { asset, mesh: part.name, component: c.index, topology: c.topology });
    }
  }
  const joints = [];
  if (!Array.isArray(metadata.joints) || metadata.joints.length !== 2) fail('missing-required-joint-inventory', { actual: metadata.joints ?? null });
  else for (const joint of metadata.joints) {
    const carrier = partMap.car.get(joint.carrier), pin = partMap.car.get(joint.pin), eye = partMap.link.get(joint.eye);
    const bearing = joint.bearing ?? {
      axis: [0, 1, 0],
      eyeInnerRadiusMetres: metadata.authorDimensions?.link?.candidateDimensions?.eye_inner_radius,
      eyeOuterRadiusMetres: metadata.authorDimensions?.link?.candidateDimensions?.eye_outer_radius,
      eyeHalfThicknessMetres: metadata.authorDimensions?.link?.candidateDimensions?.eye_thickness / 2,
      pinRadiusMetres: metadata.authorDimensions?.car?.candidateDimensions?.pin_radius,
      pinHalfHeightMetres: metadata.authorDimensions?.car?.candidateDimensions?.pin_height / 2,
    };
    const required = { eyeInnerRadiusMetres: .014, eyeOuterRadiusMetres: .030, eyeHalfThicknessMetres: .012, pinRadiusMetres: .012, pinHalfHeightMetres: .030 };
    if (!['front', 'rear'].includes(joint.end) || joints.some(j => j.end === joint.end) || !carrier || !pin || !eye || carrier.end !== joint.end || pin.end !== joint.end || ![joint.end === 'front' ? 'A' : 'B', 'span'].includes(eye.end) || typeof joint.attachmentContact !== 'string' || !bearing || Object.entries(required).some(([key, value]) => bearing[key] !== value) || canonical(bearing.axis) !== canonical([0, 1, 0])) {
      fail('invalid-required-joint-inventory', { joint }); continue;
    }
    joints.push({ ...joint, bearing, bearingDataSource: joint.bearing ? 'joint.bearing' : 'root-hashed-authorDimensions' });
  }
  if (joints.length !== 2) fail('finite-link-needs-two-bound-joints', { acceptedSemanticJoints: joints.length });
  if (!metadata.drawbarParts.some(p => p.end === 'span' && ['bar', 'unified-link'].includes(p.kind))) fail('missing-actual-span-part', {});
  for (const [asset, model] of [['car', car], ['link', link]]) for (const node of model.nodes.values()) if (asset === 'link' || !original.nodes.has(node.name)) {
    const frame = frameCheck(node.world);
    if (!frame.finite || frame.residual > tol.unitFrame) fail('non-unit-new-node-frame', { asset, node: node.name, frame });
  }
  for (const name of ['Joint_EndA', 'Joint_EndB']) if (!link.nodes.has(name) || link.nodes.get(name).source.mesh !== undefined) fail('missing-or-nonempty-link-endpoint', { name });
  const endpointA = link.nodes.get('Joint_EndA') ? new Vector3().setFromMatrixPosition(link.nodes.get('Joint_EndA').world) : new Vector3(NaN, NaN, NaN);
  const endpointB = link.nodes.get('Joint_EndB') ? new Vector3().setFromMatrixPosition(link.nodes.get('Joint_EndB').world) : new Vector3(NaN, NaN, NaN);
  if (endpointA.distanceTo(new Vector3(0, 0, .10)) > tol.linkLengthMetres || endpointB.distanceTo(new Vector3(0, 0, -.10)) > tol.linkLengthMetres || ![...endpointA.toArray(), ...endpointB.toArray()].every(Number.isFinite)) fail('changed-link-endpoint-contract', { endpointA: endpointA.toArray(), endpointB: endpointB.toArray() });

  function selectPart(selector) {
    if (!selector || !['car', 'link'].includes(selector.asset) || typeof selector.mesh !== 'string') throw new Error('Invalid contact selector.');
    const model = selector.asset === 'car' ? car : link, mesh = model.meshes.get(selector.mesh);
    if (!mesh) throw new Error(`Contact names unknown mesh: ${selector.mesh}`);
    let c;
    if (selector.originalComponent !== undefined) {
      if (selector.asset !== 'car' || selector.mesh !== 'Chassis_Frame' || !Number.isInteger(selector.originalComponent) || [7, 8].includes(selector.originalComponent)) throw new Error('Invalid original contact component.');
      c = mesh.components.find(c => c.originalComponent === selector.originalComponent);
    } else c = mesh.components[selector.component ?? (mesh.components.length === 1 ? 0 : -1)];
    if (!c) throw new Error('Contact requires one exact, retained component.');
    const normal = vec(selector.outwardNormal);
    if (Math.abs(normal.length() - 1) > tol.unitFrame) throw new Error('Contact outward normal must be unit.');
    return { ...selector, componentRecord: c, normal, support: Math.max(...c.vertices.map(v => v.dot(normal))) };
  }
  const contactRules = [];
  for (const spec of metadata.contacts) {
    try {
    if (typeof spec.id !== 'string' || contactRules.some(r => r.id === spec.id) || spec.kind !== 'planar-mating' || !Number.isFinite(spec.patch?.radiusMetres) || spec.patch.radiusMetres <= 0) throw new Error('Unsupported or invalid contact rule.');
    const a = selectPart(spec.a), b = selectPart(spec.b);
    if (!partMap[a.asset].has(a.mesh) && !partMap[b.asset].has(b.mesh)) throw new Error('A new contact must include new hardware.');
    const centre = vec(spec.patch.centreInA), projected = centre.clone().addScaledVector(a.normal, a.support - centre.dot(a.normal));
    contactRules.push({ id: spec.id, a, b, centre: projected, radius: spec.patch.radiusMetres, centreProjectionMetres: projected.distanceTo(centre) });
    } catch (error) { fail('unsupported-contact-rule', { id: spec?.id ?? null, reason: error.message }); }
  }
  for (const joint of joints) {
    const rule = contactRules.find(r => r.id === joint.attachmentContact);
    const carrierToChassis = rule && ((rule.a.asset === 'car' && rule.a.mesh === joint.carrier && rule.b.asset === 'car' && rule.b.mesh === 'Chassis_Frame') || (rule.b.asset === 'car' && rule.b.mesh === joint.carrier && rule.a.asset === 'car' && rule.a.mesh === 'Chassis_Frame'));
    if (!carrierToChassis) fail('missing-geometrically-declared-carrier-attachment', { end: joint.end, carrier: joint.carrier, attachmentContact: joint.attachmentContact });
  }

  class Heap {
    data = [];
    push(value) { const d = this.data; d.push(value); let i = d.length - 1; while (i) { const p = (i - 1) >> 1; if (d[p].lower <= value.lower) break; d[i] = d[p]; i = p; } d[i] = value; }
    pop() { const d = this.data, first = d[0], last = d.pop(); if (d.length) { let i = 0; while (i * 2 + 1 < d.length) { let c = i * 2 + 1; if (c + 1 < d.length && d[c + 1].lower < d[c].lower) c++; if (d[c].lower >= last.lower) break; d[i] = d[c]; i = c; } d[i] = last; } return first; }
  }
  function boxDistance(a, b) {
    let squared = 0;
    for (const axis of ['x', 'y', 'z']) squared += Math.max(0, a.min[axis] - b.max[axis], b.min[axis] - a.max[axis]) ** 2;
    return Math.sqrt(squared);
  }
  function instantiate(mesh, matrix, asset, instance) {
    const nodeCache = new Map(), triangleCache = new Map();
    return { mesh, matrix, asset, instance, bounds: mesh.bounds.clone().applyMatrix4(matrix), boundsFor(n) { if (!nodeCache.has(n.id)) nodeCache.set(n.id, n.bounds.clone().applyMatrix4(matrix)); return nodeCache.get(n.id); }, triangle(t) { if (!triangleCache.has(t.index)) { const vertices = t.vertices.map(p => p.clone().applyMatrix4(matrix)); triangleCache.set(t.index, { ...t, vertices, bounds: new Box3().setFromPoints(vertices) }); } return triangleCache.get(t.index); } };
  }
  function triIntersects(a, b) {
    if (!a.bounds.intersectsBox(b.bounds)) return false;
    const av = a.vertices, bv = b.vertices;
    const ea = [av[1].clone().sub(av[0]), av[2].clone().sub(av[1]), av[0].clone().sub(av[2])], eb = [bv[1].clone().sub(bv[0]), bv[2].clone().sub(bv[1]), bv[0].clone().sub(bv[2])];
    const na = ea[0].clone().cross(ea[1]), nb = eb[0].clone().cross(eb[1]), axes = [na, nb];
    for (const x of ea) for (const y of eb) axes.push(x.clone().cross(y));
    for (const x of ea) axes.push(na.clone().cross(x));
    for (const x of eb) axes.push(nb.clone().cross(x));
    for (const axis of axes) {
      if (axis.lengthSq() < tol.ignoredAxisLengthSquared) continue;
      axis.normalize(); const ap = av.map(v => v.dot(axis)), bp = bv.map(v => v.dot(axis));
      if (Math.max(...ap) < Math.min(...bp) - tol.triangleSatProjectionMetres || Math.max(...bp) < Math.min(...ap) - tol.triangleSatProjectionMetres) return false;
    }
    return true;
  }
  function witness(a, b) {
    const triangle = new Triangle(...b.vertices), normal = triangle.getNormal(new Vector3()), hits = [];
    for (let edge = 0; edge < 3; edge++) {
      const start = a.vertices[edge], end = a.vertices[(edge + 1) % 3], delta = end.clone().sub(start), length = delta.length();
      if (!length) continue;
      const hit = new Ray(start, delta.normalize()).intersectTriangle(...b.vertices, false, new Vector3());
      if (hit) { const fraction = hit.distanceTo(start) / length, bary = triangle.getBarycoord(hit, new Vector3()); if (fraction > 0 && fraction < 1) hits.push({ edge, segmentFraction: fraction, otherTriangleBarycentrics: bary.toArray(), point: hit.toArray(), strictInterior: fraction > tol.strictInteriorFraction && fraction < 1 - tol.strictInteriorFraction && bary.toArray().every(v => v > tol.strictInteriorFraction) }); }
    }
    return { a: { mesh: a.mesh, triangle: a.index, component: a.component, vertices: a.vertices.map(p => p.toArray()) }, b: { mesh: b.mesh, triangle: b.index, component: b.component, vertices: b.vertices.map(p => p.toArray()) }, signedDistancesToBPlane: a.vertices.map(p => normal.dot(p.clone().sub(b.vertices[0]))), edgeIntersections: hits, strictInteriorCrossing: hits.some(h => h.strictInterior) };
  }
  function segmentDistance(p1, q1, p2, q2) {
    const d1 = q1.clone().sub(p1), d2 = q2.clone().sub(p2), r = p1.clone().sub(p2), a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r); let s = 0, t = 0;
    if (a <= 1e-20 && e <= 1e-20) return p1.distanceTo(p2);
    if (a <= 1e-20) t = Math.max(0, Math.min(1, f / e));
    else { const c = d1.dot(r); if (e <= 1e-20) s = Math.max(0, Math.min(1, -c / a)); else { const b = d1.dot(d2), den = a * e - b * b; if (den !== 0) s = Math.max(0, Math.min(1, (b * f - c * e) / den)); t = (b * s + f) / e; if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -c / a)); } else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (b - c) / a)); } } }
    return p1.clone().addScaledVector(d1, s).distanceTo(p2.clone().addScaledVector(d2, t));
  }
  function triangleDistance(a, b) {
    if (triIntersects(a, b)) return 0;
    const at = new Triangle(...a.vertices), bt = new Triangle(...b.vertices);
    let distance = Infinity;
    for (const p of a.vertices) distance = Math.min(distance, p.distanceTo(bt.closestPointToPoint(p, new Vector3())));
    for (const p of b.vertices) distance = Math.min(distance, p.distanceTo(at.closestPointToPoint(p, new Vector3())));
    for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) distance = Math.min(distance, segmentDistance(a.vertices[x], a.vertices[(x + 1) % 3], b.vertices[y], b.vertices[(y + 1) % 3]));
    return distance;
  }
  function nearestPair(a, b) {
    const heap = new Heap(); let minimum = Infinity, closest = null, exactTests = 0, nodePairs = 0;
    heap.push({ an: a.mesh.tree, bn: b.mesh.tree, lower: boxDistance(a.bounds, b.bounds) });
    while (heap.data.length) {
      const { an, bn, lower } = heap.pop(); nodePairs++;
      if (lower >= minimum) continue;
      if (an.triangles && bn.triangles) for (const al of an.triangles) for (const bl of bn.triangles) {
        const at = a.triangle(al), bt = b.triangle(bl);
        if (boxDistance(at.bounds, bt.bounds) >= minimum) continue;
        exactTests++; const distance = triangleDistance(at, bt);
        if (distance < minimum) { minimum = distance; closest = { aTriangle: al.index, bTriangle: bl.index, aComponent: al.component, bComponent: bl.component, aVertices: at.vertices.map(p => p.toArray()), bVertices: bt.vertices.map(p => p.toArray()) }; }
      }
      else {
        const ac = an.triangles ? [an] : [an.left, an.right], bc = bn.triangles ? [bn] : [bn.left, bn.right];
        for (const x of ac) for (const y of bc) { const lo = boxDistance(a.boundsFor(x), b.boundsFor(y)); if (lo < minimum) heap.push({ an: x, bn: y, lower: lo }); }
      }
      if (minimum === 0) break;
    }
    return { metres: minimum, witness: closest, exactDistanceTests: exactTests, distanceNodePairs: nodePairs };
  }
  function nearestPoint(point, instance, component) {
    const heap = new Heap(); let minimum = Infinity;
    heap.push({ n: component.tree, lower: instance.boundsFor(component.tree).distanceToPoint(point) });
    while (heap.data.length) { const { n, lower } = heap.pop(); if (lower >= minimum) continue;
      if (n.triangles) for (const t of n.triangles) { const at = instance.triangle(t); if (at.bounds.distanceToPoint(point) >= minimum) continue; const tri = new Triangle(...at.vertices); minimum = Math.min(minimum, point.distanceTo(tri.closestPointToPoint(point, new Vector3()))); }
      else for (const child of [n.left, n.right]) { const lo = instance.boundsFor(child).distanceToPoint(point); if (lo < minimum) heap.push({ n: child, lower: lo }); }
    } return minimum;
  }
  function inside(point, instance, component) {
    if (!component.topology.closed) return { supported: false, reason: 'open-or-invalid-surface' };
    if (!instance.boundsFor(component.tree).containsPoint(point)) return { supported: true, inside: false, boundary: false, parities: [] };
    const surfaceDistance = nearestPoint(point, instance, component);
    if (surfaceDistance <= tol.segmentMetres) return { supported: true, inside: false, boundary: true, surfaceDistanceMetres: surfaceDistance, parities: [] };
    const rays = [[.312, .419, .851], [.713, -.271, .647], [-.533, .791, .301]], parities = [];
    for (const values of rays) {
      const ray = new Ray(point, new Vector3(...values).normalize()), hits = [], stack = [component.tree];
      while (stack.length) { const n = stack.pop(); if (!ray.intersectsBox(instance.boundsFor(n))) continue;
        if (n.triangles) for (const t of n.triangles) { const at = instance.triangle(t), hit = ray.intersectTriangle(...at.vertices, false, new Vector3()); if (hit) { const distance = point.distanceTo(hit); if (distance > tol.segmentMetres) hits.push(distance); } }
        else stack.push(n.left, n.right);
      }
      hits.sort((a, b) => a - b); const unique = hits.filter((v, i) => !i || v - hits[i - 1] > tol.solidRayMergeMetres);
      parities.push({ direction: ray.direction.toArray(), uniqueRayDistances: unique, inside: unique.length % 2 === 1 });
    }
    const ambiguous = parities.some(p => p.inside !== parities[0].inside);
    return { supported: true, inside: !ambiguous && parities[0].inside, ambiguous, boundary: false, surfaceDistanceMetres: surfaceDistance, parities };
  }
  function rayProfile(point, direction, instance, component) {
    const ray = new Ray(point, direction.clone().normalize()), hits = [], stack = [component.tree];
    while (stack.length) {
      const n = stack.pop(); if (!ray.intersectsBox(instance.boundsFor(n))) continue;
      if (n.triangles) for (const local of n.triangles) {
        const t = instance.triangle(local), hit = ray.intersectTriangle(...t.vertices, false, new Vector3());
        if (hit) { const distance = point.distanceTo(hit); if (distance > tol.segmentMetres) hits.push({ distance, triangle: t.index, point: hit.toArray() }); }
      } else stack.push(n.left, n.right);
    }
    hits.sort((a, b) => a.distance - b.distance);
    const unique = hits.filter((h, i) => !i || h.distance - hits[i - 1].distance > tol.solidRayMergeMetres);
    return { direction: ray.direction.toArray(), firstMetres: unique[0]?.distance ?? null, hits: unique };
  }
  function segmentSurfaceProfile(start, end, instance, component) {
    const delta = end.clone().sub(start), length = delta.length(), ray = new Ray(start, delta.clone().normalize()), hits = [];
    const midpoint = start.clone().add(end).multiplyScalar(.5), heap = new Heap(); let minimum = Infinity, nearest = null;
    heap.push({ n: component.tree, lower: Math.max(0, instance.boundsFor(component.tree).distanceToPoint(midpoint) - length / 2) });
    while (heap.data.length) {
      const { n, lower } = heap.pop(); if (lower > minimum) continue;
      if (n.triangles) for (const local of n.triangles) {
        const t = instance.triangle(local), triangle = new Triangle(...t.vertices);
        if (Math.max(0, t.bounds.distanceToPoint(midpoint) - length / 2) > minimum) continue;
        const hit = ray.intersectTriangle(...t.vertices, false, new Vector3());
        let distance;
        if (hit && hit.distanceTo(start) <= length + tol.segmentMetres) { distance = 0; hits.push({ triangle: t.index, point: hit.toArray(), distanceFromStartMetres: hit.distanceTo(start) }); }
        else {
          distance = Math.min(start.distanceTo(triangle.closestPointToPoint(start, new Vector3())), end.distanceTo(triangle.closestPointToPoint(end, new Vector3())));
          for (let e = 0; e < 3; e++) distance = Math.min(distance, segmentDistance(start, end, t.vertices[e], t.vertices[(e + 1) % 3]));
        }
        if (distance < minimum) { minimum = distance; nearest = { triangle: t.index, vertices: t.vertices.map(p => p.toArray()) }; }
      } else for (const child of [n.left, n.right]) { const lo = Math.max(0, instance.boundsFor(child).distanceToPoint(midpoint) - length / 2); if (lo <= minimum) heap.push({ n: child, lower: lo }); }
    }
    return { start: start.toArray(), end: end.toArray(), minimumSurfaceDistanceMetres: minimum, nearestTriangle: nearest, surfaceHits: hits };
  }
  function nominalStorageBound(mesh, centre) {
    const halfUlp = v => v === 0 ? 2 ** -150 : 2 ** (Math.floor(Math.log2(Math.abs(v))) - 24);
    const perAxis = [0, 1, 2].map(i => Math.max(...mesh.positions.map(p => halfUlp(p.getComponent(i)))) + halfUlp(centre.getComponent(i)));
    return { radialMetres: Math.hypot(perAxis[0], perAxis[2]) + tol.segmentMetres, axialMetres: perAxis[1] + tol.segmentMetres, perAxisMetres: perAxis, meaning: 'IEEE-754 float32 POSITION/Blender-marker representation bound for nominal dimension comparisons only; collision/closure tolerances are unchanged.' };
  }
  const mechanicalBindings = [];
  for (const joint of joints) {
    const pinMesh = car.meshes.get(joint.pin), eyeMesh = link.meshes.get(joint.eye), pinComponent = pinMesh?.components[0], eyeComponent = eyeMesh?.components[0];
    if (!pinComponent?.topology.closed || !eyeComponent?.topology.closed) { const binding = { end: joint.end, passed: false, reason: 'Required pin/eye does not have a qualified closed surface.' }; mechanicalBindings.push(binding); fail('mechanical-marker-binding-failed', binding); continue; }
    const pinCentre = new Vector3().setFromMatrixPosition(car.nodes.get(joint.end === 'front' ? 'Coupler_Front' : 'Coupler_Rear').world), eyeCentre = joint.end === 'front' ? endpointA : endpointB;
    const pi = instantiate(pinMesh, new Matrix4(), 'car', 'static'), ei = instantiate(eyeMesh, new Matrix4(), 'link', 'static');
    const dimensions = joint.bearing, pq = nominalStorageBound(pinMesh, pinCentre), eq = nominalStorageBound(eyeMesh, eyeCentre);
    const axisStart = eyeCentre.clone().add(new Vector3(0, -dimensions.eyeHalfThicknessMetres, 0)), axisEnd = eyeCentre.clone().add(new Vector3(0, dimensions.eyeHalfThicknessMetres, 0));
    const axisProfile = segmentSurfaceProfile(axisStart, axisEnd, ei, eyeComponent);
    const axisVoid = [-1, 0, 1].map(t => ({ point: eyeCentre.clone().add(new Vector3(0, t * dimensions.eyeHalfThicknessMetres, 0)).toArray(), classification: inside(eyeCentre.clone().add(new Vector3(0, t * dimensions.eyeHalfThicknessMetres, 0)), ei, eyeComponent) }));
    const ringSamples = [], boreRays = [], thicknessRays = [], pinSamples = [], pinRadiusRays = [], pinHeightRays = [];
    const ringRadius = (dimensions.eyeInnerRadiusMetres + dimensions.eyeOuterRadiusMetres) / 2;
    for (let i = 0; i < 16; i++) {
      const direction = new Vector3(Math.cos(i * Math.PI / 8), 0, Math.sin(i * Math.PI / 8));
      for (const h of [-.5, 0, .5]) {
        const origin = eyeCentre.clone().add(new Vector3(0, h * dimensions.eyeHalfThicknessMetres, 0)), ringPoint = origin.clone().addScaledVector(direction, ringRadius);
        ringSamples.push({ angleIndex: i, axialFraction: h, point: ringPoint.toArray(), classification: inside(ringPoint, ei, eyeComponent) });
        boreRays.push({ angleIndex: i, axialFraction: h, ...rayProfile(origin, direction, ei, eyeComponent) });
        const pinPoint = pinCentre.clone().add(new Vector3(0, h * dimensions.pinHalfHeightMetres, 0)).addScaledVector(direction, dimensions.pinRadiusMetres / 2);
        pinSamples.push({ angleIndex: i, axialFraction: h, point: pinPoint.toArray(), classification: inside(pinPoint, pi, pinComponent) });
      }
      const ringPoint = eyeCentre.clone().addScaledVector(direction, ringRadius);
      for (const sign of [-1, 1]) thicknessRays.push({ angleIndex: i, sign, ...rayProfile(ringPoint, new Vector3(0, sign, 0), ei, eyeComponent) });
    }
    for (const h of [-.5, 0, .5]) for (const direction of [new Vector3(1, 0, 0), new Vector3(-1, 0, 0), new Vector3(0, 0, joint.end === 'front' ? 1 : -1)]) pinRadiusRays.push({ axialFraction: h, ...rayProfile(pinCentre.clone().add(new Vector3(0, h * dimensions.eyeHalfThicknessMetres, 0)), direction, pi, pinComponent) });
    for (const sign of [-1, 1]) {
      pinHeightRays.push({ sign, ...rayProfile(pinCentre, new Vector3(0, sign, 0), pi, pinComponent) });
      for (const direction of [new Vector3(1, 0, 0), new Vector3(-1, 0, 0)]) {
        const point = pinCentre.clone().add(new Vector3(0, sign * .99 * dimensions.pinHalfHeightMetres, 0)).addScaledVector(direction, dimensions.pinRadiusMetres / 2);
        pinSamples.push({ nearCap: sign, point: point.toArray(), classification: inside(point, pi, pinComponent) });
      }
    }
    const innerBoundaryVertices = eyeMesh.positions.filter(p => { const d = p.clone().sub(eyeCentre), r = Math.hypot(d.x, d.z); return Math.abs(r - dimensions.eyeInnerRadiusMetres) <= eq.radialMetres && Math.abs(Math.abs(d.y) - dimensions.eyeHalfThicknessMetres) <= eq.axialMetres; });
    const angles = innerBoundaryVertices.map(p => Math.atan2(p.z - eyeCentre.z, p.x - eyeCentre.x)).sort((a, b) => a - b), angleKey = Math.max(eq.radialMetres / dimensions.eyeInnerRadiusMetres, Number.EPSILON);
    const uniqueAngles = angles.filter((a, i) => !i || a - angles[i - 1] > angleKey);
    const maximumGap = uniqueAngles.length ? Math.max(...uniqueAngles.map((a, i) => (i + 1 < uniqueAngles.length ? uniqueAngles[i + 1] : uniqueAngles[0] + 2 * Math.PI) - a)) : Infinity;
    const endSign = joint.end === 'front' ? 1 : -1;
    const outerBoundaryVertices = eyeMesh.positions.filter(p => { const d = p.clone().sub(eyeCentre); return d.z * endSign >= -eq.radialMetres && Math.abs(d.y) <= dimensions.eyeHalfThicknessMetres + eq.axialMetres && Math.hypot(d.x, d.z) > ringRadius; });
    const outerRadii = outerBoundaryVertices.map(p => Math.hypot(p.x - eyeCentre.x, p.z - eyeCentre.z));
    const outerAngles = outerBoundaryVertices.map(p => { const d = p.clone().sub(eyeCentre); return Math.atan2(Math.max(0, d.z * endSign), d.x); }).sort((a, b) => a - b);
    const outerAngleKey = eq.radialMetres / dimensions.eyeOuterRadiusMetres, uniqueOuterAngles = outerAngles.filter((a, i) => !i || a - outerAngles[i - 1] > outerAngleKey);
    const outerMaximumGap = uniqueOuterAngles.length > 1 ? Math.max(...uniqueOuterAngles.slice(1).map((a, i) => a - uniqueOuterAngles[i])) : Infinity;
    const facetLower = dimensions.eyeOuterRadiusMetres * Math.cos(outerMaximumGap / 2) - eq.radialMetres;
    const freeOuterRays = boreRays.filter(r => r.direction[2] * endSign >= -tol.unitFrame).map(r => ({ angleIndex: r.angleIndex, axialFraction: r.axialFraction, direction: r.direction, innerEntryMetres: r.firstMetres, outerExitMetres: r.hits[1]?.distance ?? null, outerExit: r.hits[1] ?? null }));
    const checks = {
      closedPinAndEye: pinComponent.topology.closed && eyeComponent.topology.closed,
      actualAxisVoid: !axisProfile.surfaceHits.length && axisVoid.every(v => v.classification.supported && !v.classification.inside && !v.classification.boundary && !v.classification.ambiguous),
      fullAxisPinClearance: axisProfile.minimumSurfaceDistanceMetres > dimensions.pinRadiusMetres + pq.radialMetres,
      finiteRingMaterial: ringSamples.every(v => v.classification.inside && !v.classification.ambiguous),
      actualBoreSections: boreRays.every(r => Number.isFinite(r.firstMetres) && r.firstMetres >= axisProfile.minimumSurfaceDistanceMetres - tol.segmentMetres && r.firstMetres <= dimensions.eyeInnerRadiusMetres + eq.radialMetres),
      actualInnerBoundary: innerBoundaryVertices.length >= 3 && maximumGap < Math.PI,
      actualOuterBoundary: outerRadii.length >= 3 && outerRadii.every(r => Math.abs(r - dimensions.eyeOuterRadiusMetres) <= eq.radialMetres) && uniqueOuterAngles[0] <= outerAngleKey && uniqueOuterAngles.at(-1) >= Math.PI - outerAngleKey,
      actualFreeOuterExits: freeOuterRays.length > 0 && Number.isFinite(facetLower) && freeOuterRays.every(r => Number.isFinite(r.outerExitMetres) && r.outerExitMetres >= facetLower && r.outerExitMetres <= dimensions.eyeOuterRadiusMetres + eq.radialMetres),
      actualEyeThickness: thicknessRays.every(r => Number.isFinite(r.firstMetres) && Math.abs(r.firstMetres - dimensions.eyeHalfThicknessMetres) <= eq.axialMetres),
      finitePinMaterial: pinSamples.every(v => v.classification.inside && !v.classification.ambiguous) && inside(pinCentre, pi, pinComponent).inside,
      actualPinRadius: pinRadiusRays.every(r => Number.isFinite(r.firstMetres) && Math.abs(r.firstMetres - dimensions.pinRadiusMetres) <= pq.radialMetres),
      actualPinCoreHeight: pinHeightRays.every(r => Number.isFinite(r.firstMetres) && r.firstMetres >= dimensions.pinHalfHeightMetres - pq.axialMetres),
    };
    const binding = { end: joint.end, pin: joint.pin, eye: joint.eye, pinCentre: pinCentre.toArray(), eyeCentre: eyeCentre.toArray(), dimensions, nominalStorageBounds: { pin: pq, eye: eq }, checks, passed: Object.values(checks).every(Boolean), axisProfile, axisVoid, ringSamples, boreRays, thicknessRays, pinSamples, pinRadiusRays, pinHeightRays, innerBoundaryVertices: innerBoundaryVertices.map(p => p.toArray()), maximumInnerBoundaryAngularGapRadians: maximumGap, actualOuterRim: { scope: 'Free outward half-rim only; unified material span direction excluded.', vertices: outerBoundaryVertices.map(p => p.toArray()), vertexRadiiMetres: outerRadii, minimumVertexRadiusMetres: outerRadii.length ? Math.min(...outerRadii) : null, maximumVertexRadiusMetres: outerRadii.length ? Math.max(...outerRadii) : null, maximumFacetAngleRadians: outerMaximumGap, facetLowerBoundMetres: facetLower, rays: freeOuterRays } };
    mechanicalBindings.push(binding); if (!binding.passed) fail('mechanical-marker-binding-failed', { end: joint.end, checks });
  }
  let finiteSpan = { passed: false, reason: 'Concrete unified-link inventory missing.' };
  const frontJoint = joints.find(j => j.end === 'front'), rearJoint = joints.find(j => j.end === 'rear');
  if (frontJoint && rearJoint && frontJoint.eye === rearJoint.eye && partMap.link.get(frontJoint.eye)?.kind === 'unified-link') {
    const mesh = link.meshes.get(frontJoint.eye), component = mesh.components[0];
    if (component?.topology.closed) {
      const instance = instantiate(mesh, new Matrix4(), 'link', 'static'), midRadius = (.014 + .030) / 2;
      const start = endpointB.clone().add(new Vector3(0, 0, midRadius)), end = endpointA.clone().add(new Vector3(0, 0, -midRadius));
      const profile = segmentSurfaceProfile(start, end, instance, component), samples = [start, start.clone().lerp(end, .5), end].map(p => ({ point: p.toArray(), classification: inside(p, instance, component) }));
      finiteSpan = { passed: !profile.surfaceHits.length && profile.minimumSurfaceDistanceMetres > tol.segmentMetres && samples.every(s => s.classification.inside && !s.classification.ambiguous), mesh: mesh.name, profile, materialSamples: samples };
    }
  }
  if (!finiteSpan.passed) fail('actual-finite-material-span-missing', finiteSpan);
  function applicableRule(rule, a, b, ac, bc) {
    const match = (selector, i, c) => selector.asset === i.asset && selector.mesh === i.mesh.name && selector.componentRecord.index === c;
    let direct = match(rule.a, a, ac) && match(rule.b, b, bc), reverse = match(rule.a, b, bc) && match(rule.b, a, ac);
    if (!direct && !reverse) return null;
    const ai = direct ? a : b, bi = direct ? b : a;
    if (ai.asset === 'car' && bi.asset === 'car' && ai.instance !== bi.instance) return null;
    if (ai.asset !== bi.asset) {
      const ci = ai.asset === 'car' ? ai : bi, li = ai.asset === 'link' ? ai : bi;
      const cp = partMap.car.get(ci.mesh.name), lp = partMap.link.get(li.mesh.name);
      if (!cp || !lp || !(ci.instance === 'leading' && cp.end === 'rear' && lp.end === 'B' || ci.instance === 'following' && cp.end === 'front' && lp.end === 'A')) return null;
    }
    const normalA = rule.a.normal.clone().transformDirection(ai.matrix), normalB = rule.b.normal.clone().transformDirection(bi.matrix);
    const pointA = rule.a.normal.clone().multiplyScalar(rule.a.support).applyMatrix4(ai.matrix), pointB = rule.b.normal.clone().multiplyScalar(rule.b.support).applyMatrix4(bi.matrix);
    const coincidence = Math.abs(normalA.dot(pointB.clone().sub(pointA))), opposed = normalA.clone().add(normalB).length();
    return { id: rule.id, valid: coincidence <= tol.triangleSatProjectionMetres && opposed <= tol.unitFrame, planePoint: pointA, normal: normalA, centre: rule.centre.clone().applyMatrix4(ai.matrix), radius: rule.radius, coincidenceMetres: coincidence, opposedResidual: opposed };
  }
  function intersectionPointsOnPlane(a, b, normal, planePoint) {
    const onPlane = t => {
      const points = [], distances = t.vertices.map(p => normal.dot(p.clone().sub(planePoint)));
      t.vertices.forEach((p, i) => { if (Math.abs(distances[i]) <= tol.triangleSatProjectionMetres) points.push(p); });
      for (let i = 0; i < 3; i++) { const j = (i + 1) % 3; if (distances[i] * distances[j] < 0) points.push(t.vertices[i].clone().lerp(t.vertices[j], distances[i] / (distances[i] - distances[j]))); }
      return points;
    };
    const x = Math.abs(normal.x) < .8 ? new Vector3(1, 0, 0).cross(normal).normalize() : new Vector3(0, 1, 0).cross(normal).normalize(), y = normal.clone().cross(x);
    const project = p => [p.clone().sub(planePoint).dot(x), p.clone().sub(planePoint).dot(y)];
    const ap = onPlane(a), bp = onPlane(b), candidates = [];
    const inTriangle = (p, t) => p.distanceTo(new Triangle(...t.vertices).closestPointToPoint(p, new Vector3())) <= tol.segmentMetres;
    for (const p of ap) if (inTriangle(p, b)) candidates.push(p);
    for (const p of bp) if (inTriangle(p, a)) candidates.push(p);
    const edges = points => points.length === 2 ? [[points[0], points[1]]] : points.length >= 3 ? points.map((p, i) => [p, points[(i + 1) % points.length]]) : [];
    for (const [a0, a1] of edges(ap)) for (const [b0, b1] of edges(bp)) {
      const aa = project(a0), ab = project(a1), ba = project(b0), bb = project(b1), u = [ab[0] - aa[0], ab[1] - aa[1]], v = [bb[0] - ba[0], bb[1] - ba[1]], d = [ba[0] - aa[0], ba[1] - aa[1]], cross = (p, q) => p[0] * q[1] - p[1] * q[0], den = cross(u, v);
      if (Math.abs(den) <= 1e-20) continue;
      const t = cross(d, v) / den, s = cross(d, u) / den;
      if (t >= -tol.segmentMetres && t <= 1 + tol.segmentMetres && s >= -tol.segmentMetres && s <= 1 + tol.segmentMetres) candidates.push(a0.clone().lerp(a1, Math.max(0, Math.min(1, t))));
    }
    return candidates.filter((p, i) => candidates.findIndex(q => p.distanceTo(q) <= tol.segmentMetres) === i);
  }
  function triangleIntersectionPoints(a, b) {
    const an = new Triangle(...a.vertices).getNormal(new Vector3()), bn = new Triangle(...b.vertices).getNormal(new Vector3());
    if (an.clone().cross(bn).length() <= tol.unitFrame && Math.abs(an.dot(b.vertices[0].clone().sub(a.vertices[0]))) <= tol.segmentMetres) return intersectionPointsOnPlane(a, b, an, a.vertices[0]);
    const points = [];
    for (const [one, other] of [[a, b], [b, a]]) {
      const ot = new Triangle(...other.vertices);
      for (const p of one.vertices) if (p.distanceTo(ot.closestPointToPoint(p, new Vector3())) <= tol.segmentMetres) points.push(p);
      for (let edge = 0; edge < 3; edge++) {
        const start = one.vertices[edge], end = one.vertices[(edge + 1) % 3], delta = end.clone().sub(start), length = delta.length();
        if (!length) continue;
        const hit = new Ray(start, delta.normalize()).intersectTriangle(...other.vertices, false, new Vector3());
        if (hit && hit.distanceTo(start) <= length + tol.segmentMetres) points.push(hit);
      }
    }
    return points.filter((p, i) => points.findIndex(q => p.distanceTo(q) <= tol.segmentMetres) === i);
  }
  function checkSelf(mesh) {
    const stack = [[mesh.tree, mesh.tree]]; let exactTests = 0, rejected = 0, first = null;
    while (stack.length) {
      const [an, bn] = stack.pop();
      if (!an.bounds.intersectsBox(bn.bounds)) continue;
      if (an.triangles && bn.triangles) for (const a of an.triangles) for (const b of bn.triangles) {
        if (a.index >= b.index || !a.bounds.intersectsBox(b.bounds)) continue;
        exactTests++; if (!triIntersects(a, b)) continue;
        const shared = a.vertices.filter(p => b.vertices.some(q => p.distanceTo(q) <= tol.segmentMetres));
        const points = triangleIntersectionPoints(a, b);
        const onlySharedTopology = shared.length && points.length && points.every(p => {
          if (shared.length === 1) return p.distanceTo(shared[0]) <= tol.segmentMetres;
          if (shared.length === 2) { const d = shared[1].clone().sub(shared[0]), fraction = Math.max(0, Math.min(1, p.clone().sub(shared[0]).dot(d) / d.lengthSq())); return p.distanceTo(shared[0].clone().addScaledVector(d, fraction)) <= tol.segmentMetres; }
          return false;
        });
        if (!onlySharedTopology) { rejected++; first ??= { ...witness(a, b), intersectionPoints: points.map(p => p.toArray()), sharedVertices: shared.map(p => p.toArray()) }; }
      }
      else { const ac = an.triangles ? [an] : [an.left, an.right], bc = bn.triangles ? [bn] : [bn.left, bn.right]; for (const x of ac) for (const y of bc) stack.push([x, y]); }
    }
    const instance = instantiate(mesh, new Matrix4(), 'self', mesh.name), componentContainments = [], ambiguousContainments = [];
    for (let a = 0; a < mesh.components.length; a++) for (let b = a + 1; b < mesh.components.length; b++) {
      const ac = mesh.components[a], bc = mesh.components[b];
      if (!ac.bounds.intersectsBox(bc.bounds)) continue;
      for (const [subject, target] of [[ac, bc], [bc, ac]]) {
        if (!target.topology.closed) continue;
        let classification = null, point = null;
        for (const p of subject.vertices) { const value = inside(p, instance, target); if (!value.boundary) { classification = value; point = p; break; } }
        const record = { subjectComponent: subject.index, targetComponent: target.index, point: point?.toArray() ?? null, classification };
        if (classification?.inside) componentContainments.push(record);
        if (classification?.ambiguous) ambiguousContainments.push(record);
      }
    }
    return { mesh: mesh.name, exactTriangleTests: exactTests, selfIntersectionPairs: rejected, firstWitness: first, componentContainments, ambiguousContainments };
  }
  function checkPair(a, b, category) {
    const stack = [[a.mesh.tree, b.mesh.tree]], groups = new Map(), witnesses = [];
    let nodePairs = 0, exactTests = 0, intersections = 0, classified = 0, rejected = 0, firstStrict = null;
    while (stack.length) {
      const [an, bn] = stack.pop(); nodePairs++;
      if (!a.boundsFor(an).intersectsBox(b.boundsFor(bn))) continue;
      if (an.triangles && bn.triangles) for (const al of an.triangles) for (const bl of bn.triangles) {
        const at = a.triangle(al), bt = b.triangle(bl);
        if (!at.bounds.intersectsBox(bt.bounds)) continue;
        exactTests++; if (!triIntersects(at, bt)) continue; intersections++;
        const key = `${al.component}:${bl.component}`, group = groups.get(key) ?? { aComponent: al.component, bComponent: bl.component, intersections: 0, classifiedContacts: 0, unexempted: 0, contactIds: {} };
        group.intersections++;
        let contact = null;
        for (const rule of contactRules) {
          const candidate = applicableRule(rule, a, b, al.component, bl.component);
          if (!candidate?.valid) continue;
          const points = intersectionPointsOnPlane(at, bt, candidate.normal, candidate.planePoint);
          if (points.length && points.every(p => Math.abs(candidate.normal.dot(p.clone().sub(candidate.planePoint))) <= tol.triangleSatProjectionMetres && p.distanceTo(candidate.centre) <= candidate.radius + tol.segmentMetres)) { contact = { ...candidate, points: points.map(p => p.toArray()) }; break; }
        }
        if (contact) { classified++; group.classifiedContacts++; group.contactIds[contact.id] = (group.contactIds[contact.id] ?? 0) + 1; }
        else {
          rejected++; group.unexempted++;
          const w = witnesses.length < 4 || !firstStrict ? witness(at, bt) : null;
          if (w && witnesses.length < 4) witnesses.push(w);
          if (w?.strictInteriorCrossing) firstStrict ??= w;
          if (!firstStrict && w) { const reverse = witness(bt, at); if (reverse.strictInteriorCrossing) firstStrict = { ...reverse, direction: 'b-edge-through-a' }; }
        }
        groups.set(key, group);
      }
      else { const ac = an.triangles ? [an] : [an.left, an.right], bc = bn.triangles ? [bn] : [bn.left, bn.right]; for (const x of ac) for (const y of bc) stack.push([x, y]); }
    }
    const containment = [], ambiguities = [];
    if (a.bounds.intersectsBox(b.bounds)) for (const ac of a.mesh.components) for (const bc of b.mesh.components) {
      if (!a.boundsFor(ac.tree).intersectsBox(b.boundsFor(bc.tree))) continue;
      if (contactRules.some(r => applicableRule(r, a, b, ac.index, bc.index)?.valid)) continue;
      for (const [subject, sc, target, tc] of [[a, ac, b, bc], [b, bc, a, ac]]) {
        if (!tc.topology.closed) continue;
        let classification = null, point = null;
        for (const v of sc.vertices) { const p = v.clone().applyMatrix4(subject.matrix); const value = inside(p, target, tc); if (!value.boundary) { classification = value; point = p; break; } }
        if (classification?.ambiguous) ambiguities.push({ subject: subject.mesh.name, subjectComponent: sc.index, target: target.mesh.name, targetComponent: tc.index, point: point.toArray(), classification });
        else if (classification?.inside) containment.push({ subject: subject.mesh.name, subjectComponent: sc.index, target: target.mesh.name, targetComponent: tc.index, point: point.toArray(), classification });
      }
    }
    const distance = nearestPair(a, b);
    return { category, a: { asset: a.asset, instance: a.instance, mesh: a.mesh.name }, b: { asset: b.asset, instance: b.instance, mesh: b.mesh.name }, nodePairs, exactTriangleTests: exactTests, intersectionPairs: intersections, classifiedContactPairs: classified, unexemptedIntersectionPairs: rejected, componentPairs: [...groups.values()], firstStrictWitness: firstStrict, rejectionWitnesses: witnesses, containment, ambiguousContainment: ambiguities, minimumSurfaceClearance: distance };
  }

  const shell = original.meshes.get('CarBody_Tub'), up = new Vector3(0, 1, 0);
  const frame = (forward, position) => new Matrix4().makeBasis(up.clone().cross(forward).normalize(), up, forward.clone().normalize()).setPosition(position);
  const segments = []; let total = 0;
  for (let i = 0; i < 32; i++) { const a = new Vector3(8 * Math.sin(i * Math.PI / 64), 0, 8 * (1 - Math.cos(i * Math.PI / 64))), b = new Vector3(8 * Math.sin((i + 1) * Math.PI / 64), 0, 8 * (1 - Math.cos((i + 1) * Math.PI / 64))), d = b.clone().sub(a), length = Math.round(d.length() * 1000); segments.push({ begin: total, length, a, forward: d.normalize() }); total += length; }
  const legacyPose = mm => { const s = segments.findLast(s => s.begin <= mm); return frame(s.forward, s.a.clone().addScaledVector(s.forward, (mm - s.begin) / 1000)); };
  const negativeLead = instantiate(shell, legacyPose(6000), 'original', 'leading'), negativeFollowing = instantiate(shell, legacyPose(3320), 'original', 'following');
  const negativePair = checkPair(negativeLead, negativeFollowing, 'retained-8m-negative');
  const negativeWitness = witness(negativeLead.triangle(shell.triangles[87]), negativeFollowing.triangle(shell.triangles[11]));
  const anchor = (model, name) => { const n = model.nodes.get(name); if (!n) throw new Error(`Missing anchor ${name}`); return new Vector3().setFromMatrixPosition(n.world); };
  const negativeGap = anchor(original, 'Coupler_Rear').applyMatrix4(negativeLead.matrix).distanceTo(anchor(original, 'Coupler_Front').applyMatrix4(negativeFollowing.matrix));
  const negativeChecks = { roundedLength: total === 12576, shellPairs: negativePair.unexemptedIntersectionPairs === 30, strictWitness: negativeWitness.strictInteriorCrossing, gap: Math.abs(negativeGap - retained.curve.couplerResidualMetres) <= 1e-10 };
  if (!Object.values(negativeChecks).every(Boolean)) fail('negative-control-not-reproduced', { negativeChecks });

  function cube(size = 1) {
    const p = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(v => new Vector3(...v).multiplyScalar(size));
    const faces = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [3, 7, 6], [3, 6, 2], [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5]];
    const triangles = faces.map((f, index) => { const vertices = f.map(i => p[i]); return { mesh: 'kernel-cube', index, vertices, bounds: new Box3().setFromPoints(vertices) }; });
    return { name: 'kernel-cube', triangles, bounds: new Box3().setFromPoints(p), components: components(triangles), tree: bvh(triangles) };
  }
  const kernelCube = cube(), kernelInstance = instantiate(kernelCube, new Matrix4(), 'kernel', 'cube');
  const openTopology = components(kernelCube.triangles.slice(1).map(t => ({ ...t })))[0].topology;
  const kernelInside = inside(new Vector3(0, 0, 0), kernelInstance, kernelCube.components[0]);
  const kernelOutside = inside(new Vector3(2, 0, 0), kernelInstance, kernelCube.components[0]);
  const separated = nearestPair(kernelInstance, instantiate(kernelCube, new Matrix4().makeTranslation(3, 0, 0), 'kernel', 'separate'));
  const kernelChecks = { closedCube: kernelCube.components[0].topology.closed, inside: kernelInside.inside && !kernelInside.ambiguous, outside: !kernelOutside.inside, openNotSolid: !openTopology.closed, separatedDistance: Math.abs(separated.metres - 1) <= tol.segmentMetres, crossing: negativeWitness.strictInteriorCrossing };
  if (!Object.values(kernelChecks).every(Boolean)) fail('geometry-kernel-control-failed', { kernelChecks });
  const geometryInventory = model => [...model.meshes.values()].map(m => ({ name: m.name, triangles: m.triangles.length, bounds: { min: m.bounds.min.toArray(), max: m.bounds.max.toArray() }, components: m.components.map(c => ({ index: c.index, originalComponent: c.originalComponent ?? null, triangles: c.triangles.length, bounds: { min: c.bounds.min.toArray(), max: c.bounds.max.toArray() }, topology: c.topology })) }));
  const newPartSelfGeometry = [];
  for (const [asset, model] of [['car', car], ['link', link]]) for (const name of partMap[asset].keys()) {
    const checked = { asset, ...checkSelf(model.meshes.get(name)) };
    newPartSelfGeometry.push(checked);
    if (checked.selfIntersectionPairs || checked.componentContainments.length || checked.ambiguousContainments.length) fail('new-part-self-intersection-or-containment', checked);
  }
  const cases = [];
  const staticFailures = failures.length;
  console.log(JSON.stringify({ event: 'inputs-verified', runnerSha256: partial.execution.runnerSha256, candidateHashes: { car: inputs.car.sha256, link: inputs.link.sha256, metadata: inputs.metadata.sha256 }, originalIdentityFailures: staticFailures, meshes: { car: car.meshes.size, link: link.meshes.size }, negativeChecks, kernelChecks }));
  for (const saved of fixture.cases) {
    const leadingMatrix = new Matrix4().fromArray(saved.lead.matrix), followingMatrix = new Matrix4().fromArray(saved.following.matrix), linkMatrix = new Matrix4().fromArray(saved.joint.linkFrame);
    function carInstances(body, bodyMatrix, contacts) {
      return [...car.meshes.values()].map(mesh => {
        let ancestor = mesh.node, pivot = null;
        while (ancestor) { if (['BogieFront', 'BogieRear'].includes(ancestor.name)) { pivot = ancestor.name; break; } ancestor = car.nodes.get(ancestor.parent); }
        let matrix = bodyMatrix;
        if (pivot) { const role = pivot === 'BogieFront' ? 'front' : 'rear', savedBogie = contacts.find(c => c.role === role); if (!savedBogie) throw new Error('Saved bogie matrix missing.'); matrix = new Matrix4().fromArray(savedBogie.bogieMatrix).multiply(car.nodes.get(pivot).world.clone().invert()); }
        return instantiate(mesh, matrix, 'car', body);
      });
    }
    const leading = carInstances('leading', leadingMatrix, saved.leadBogieContacts), following = carInstances('following', followingMatrix, saved.followingBogieContacts), drawbar = [...link.meshes.values()].map(mesh => instantiate(mesh, linkMatrix, 'link', 'joint'));
    const pairResults = [];
    for (const a of leading) for (const b of following) pairResults.push(checkPair(a, b, 'whole-car-inter-car'));
    for (const group of [leading, following]) for (let a = 0; a < group.length; a++) for (let b = a + 1; b < group.length; b++) if (partMap.car.has(group[a].mesh.name) || partMap.car.has(group[b].mesh.name)) pairResults.push(checkPair(group[a], group[b], 'new-hardware-own-car'));
    for (const a of drawbar) for (const b of [...leading, ...following]) pairResults.push(checkPair(a, b, 'drawbar-to-whole-car'));
    for (let a = 0; a < drawbar.length; a++) for (let b = a + 1; b < drawbar.length; b++) pairResults.push(checkPair(drawbar[a], drawbar[b], 'drawbar-internal'));
    const leadingHinge = anchor(car, 'Coupler_Rear').applyMatrix4(leadingMatrix), followingHinge = anchor(car, 'Coupler_Front').applyMatrix4(followingMatrix), endA = endpointA.clone().applyMatrix4(linkMatrix), endB = endpointB.clone().applyMatrix4(linkMatrix);
    const numerical = { linkLengthResidualMetres: Math.abs(endA.distanceTo(endB) - .20), endAClosureMetres: endA.distanceTo(followingHinge), endBClosureMetres: endB.distanceTo(leadingHinge), hingeDistanceResidualMetres: Math.abs(leadingHinge.distanceTo(followingHinge) - .20), leadingHingeAgainstSavedMetres: leadingHinge.distanceTo(vec(saved.joint.leadingRearHinge)), followingHingeAgainstSavedMetres: followingHinge.distanceTo(vec(saved.joint.followingFrontHinge)), maximumRunningContactResidualMetres: 0, maximumRunningPointAgainstSavedMetres: 0, maximumFrameResidual: 0, finiteFrames: true, rootTranslationApplied: saved.joint.rootTranslationApplied, rootCorrectionMetres: saved.joint.rootCorrectionMetres };
    const runningContacts = [];
    for (const [body, records] of [['leading', saved.leadBogieContacts], ['following', saved.followingBogieContacts]]) for (const r of records) {
      const pivotName = r.role === 'front' ? 'BogieFront' : 'BogieRear', treadName = pivotName + '_Treads', mesh = car.meshes.get(treadName), inverse = car.nodes.get(pivotName).world.clone().invert();
      const local = mesh.positions.map(p => p.clone().applyMatrix4(inverse)).filter(p => p.y >= -.17001 && p.x * r.wheelSide > 0), bounds = new Box3().setFromPoints(local);
      if (bounds.isEmpty()) throw new Error('Missing actual running tread side.');
      const contact = new Vector3((bounds.min.x + bounds.max.x) / 2, bounds.min.y, (bounds.min.z + bounds.max.z) / 2).applyMatrix4(new Matrix4().fromArray(r.bogieMatrix));
      const residual = contact.distanceTo(vec(r.nearestRailPoint)), savedResidual = contact.distanceTo(vec(r.actualRunningContactWorld));
      numerical.maximumRunningContactResidualMetres = Math.max(numerical.maximumRunningContactResidualMetres, residual); numerical.maximumRunningPointAgainstSavedMetres = Math.max(numerical.maximumRunningPointAgainstSavedMetres, savedResidual);
      runningContacts.push({ body, role: r.role, wheelSide: r.wheelSide, actualWorld: contact.toArray(), railResidualMetres: residual, againstSavedMetres: savedResidual });
    }
    const frames = [leadingMatrix, followingMatrix, linkMatrix, ...saved.leadBogieContacts.map(r => new Matrix4().fromArray(r.bogieMatrix)), ...saved.followingBogieContacts.map(r => new Matrix4().fromArray(r.bogieMatrix))].map(frameCheck);
    numerical.maximumFrameResidual = Math.max(...frames.map(f => f.residual)); numerical.finiteFrames = frames.every(f => f.finite);
    const numericalPassed = [numerical.linkLengthResidualMetres, numerical.endAClosureMetres, numerical.endBClosureMetres, numerical.hingeDistanceResidualMetres].every(v => Number.isFinite(v) && v <= tol.linkLengthMetres) && numerical.leadingHingeAgainstSavedMetres <= tol.segmentMetres && numerical.followingHingeAgainstSavedMetres <= tol.segmentMetres && numerical.maximumRunningPointAgainstSavedMetres <= tol.segmentMetres && numerical.maximumRunningContactResidualMetres <= tol.runningWheelContactMetres && numerical.maximumFrameResidual <= tol.unitFrame && numerical.finiteFrames && numerical.rootTranslationApplied === false && numerical.rootCorrectionMetres === 0;
    const rejected = pairResults.filter(p => p.unexemptedIntersectionPairs || p.containment.length || p.ambiguousContainment.length), intersections = pairResults.reduce((n, p) => n + p.unexemptedIntersectionPairs, 0), containments = pairResults.reduce((n, p) => n + p.containment.length, 0), ambiguities = pairResults.reduce((n, p) => n + p.ambiguousContainment.length, 0);
    const usedContacts = {};
    for (const p of pairResults) for (const g of p.componentPairs) for (const [id, count] of Object.entries(g.contactIds)) usedContacts[id] = (usedContacts[id] ?? 0) + count;
    const allInstances = [...leading, ...following, ...drawbar], contactEvidence = [];
    for (const rule of contactRules) {
      const aa = allInstances.filter(i => i.asset === rule.a.asset && i.mesh.name === rule.a.mesh), bb = allInstances.filter(i => i.asset === rule.b.asset && i.mesh.name === rule.b.mesh); let applicable = 0;
      for (const a of aa) for (const b of bb) {
        const check = applicableRule(rule, a, b, rule.a.componentRecord.index, rule.b.componentRecord.index);
        if (!check) continue; applicable++;
        const pairs = pairResults.filter(p => p.a.asset === a.asset && p.a.instance === a.instance && p.a.mesh === a.mesh.name && p.b.asset === b.asset && p.b.instance === b.instance && p.b.mesh === b.mesh.name || p.b.asset === a.asset && p.b.instance === a.instance && p.b.mesh === a.mesh.name && p.a.asset === b.asset && p.a.instance === b.instance && p.a.mesh === b.mesh.name);
        const contacts = pairs.reduce((n, p) => n + p.componentPairs.reduce((s, g) => s + (g.contactIds[rule.id] ?? 0), 0), 0);
        contactEvidence.push({ id: rule.id, aInstance: a.instance, bInstance: b.instance, planeCoincidenceMetres: check.coincidenceMetres, opposedNormalResidual: check.opposedResidual, classifiedIntersectionPairs: contacts, passed: check.valid && contacts > 0 });
      }
      if (!applicable) contactEvidence.push({ id: rule.id, passed: false, reason: 'No valid connected-part application.' });
    }
    const contactsPassed = contactEvidence.every(c => c.passed);
    const record = { id: saved.id, matrices: { leading: saved.lead.matrix, following: saved.following.matrix, link: saved.joint.linkFrame, bogies: [...saved.leadBogieContacts, ...saved.followingBogieContacts].map(r => ({ role: r.role, wheelSide: r.wheelSide, matrix: r.bogieMatrix })) }, passed: staticFailures === 0 && numericalPassed && !rejected.length && contactsPassed, numericalPassed, numerical, runningContacts, contactEvidence, contactsPassed, requiredHingeYawDegrees: { leadingRear: saved.joint.leadingHingeSignedYawDegrees, followingFront: saved.joint.followingHingeSignedYawDegrees }, collision: { checkedMeshPairs: pairResults.length, unexemptedIntersectionPairs: intersections, closedContainments: containments, ambiguousContainments: ambiguities, classifiedContactPairs: pairResults.reduce((n, p) => n + p.classifiedContactPairs, 0), usedContacts, firstRejection: rejected[0] ?? null, pairResults } };
    cases.push(record);
    console.log(JSON.stringify({ event: 'pose', id: saved.id, passed: record.passed, numericalPassed, unexemptedIntersectionPairs: intersections, closedContainments: containments, ambiguousContainments: ambiguities, meshPairs: pairResults.length, exactTests: pairResults.reduce((n, p) => n + p.exactTriangleTests, 0) }));
  }
  const failedCases = cases.filter(c => !c.passed), available = failures.length === 0 && failedCases.length === 0;
  const result = { ...partial, verdict: available ? 'preserve-finite-exported-joint' : 'unavailable', measurementCompleted: true, finiteCandidateQualified: available, tolerances: tol, constants: fixture.constants, metadata, originalIdentity: { nodes: identity, meshes: preservedMeshes, removedOriginalChassisComponents: [7, 8], materialBindings: { original: original.materialBindings, candidate: car.materialBindings } }, inventory: { original: geometryInventory(original), car: geometryInventory(car), drawbar: geometryInventory(link), newPartSelfGeometry }, mechanicalBindings, finiteSpan, contactRules: contactRules.map(r => ({ id: r.id, a: r.a.mesh, aComponent: r.a.componentRecord.index, b: r.b.mesh, bComponent: r.b.componentRecord.index, aSupport: r.a.support, bSupport: r.b.support, patchCentre: r.centre.toArray(), patchRadiusMetres: r.radius, metadataCentreProjectionMetres: r.centreProjectionMetres })), controls: { negative: { checks: negativeChecks, roundedLengthMm: total, couplerGapMetres: negativeGap, witness: negativeWitness, collision: negativePair }, kernel: { checks: kernelChecks, closedContainment: kernelInside, outside: kernelOutside, openTopology, separatedDistanceMetres: separated.metres } }, failures, summary: { cases: cases.length, passedCases: cases.length - failedCases.length, failedCases: failedCases.map(c => c.id), failedContactCases: cases.filter(c => !c.contactsPassed).map(c => c.id), staticFailures: failures.length, totalUnexemptedIntersectionPairs: cases.reduce((n, c) => n + c.collision.unexemptedIntersectionPairs, 0), totalClosedContainments: cases.reduce((n, c) => n + c.collision.closedContainments, 0), totalAmbiguousContainments: cases.reduce((n, c) => n + c.collision.ambiguousContainments, 0), maximumRunningContactResidualMetres: Math.max(...cases.map(c => c.numerical.maximumRunningContactResidualMetres)), maximumEndpointClosureMetres: Math.max(...cases.flatMap(c => [c.numerical.endAClosureMetres, c.numerical.endBClosureMetres])), totalExactTriangleTests: cases.reduce((n, c) => n + c.collision.pairResults.reduce((s, p) => s + p.exactTriangleTests, 0), 0), totalExactDistanceTests: cases.reduce((n, c) => n + c.collision.pairResults.reduce((s, p) => s + p.minimumSurfaceClearance.exactDistanceTests, 0), 0) }, cases, limitations: ['Exactly 59 retained flat poses, not a continuous sweep or safe minimum radius.', 'Open original components receive surface checks only; no invented watertight solids.', 'No manufacturing/force/fatigue/native hinge-angle agreement.', 'No grades/Z/native occupancy, guide/upstop rail mechanics, station/passenger clearance, production integration, original agreement, GPU or human acceptance.'] };
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ event: 'complete', verdict: result.verdict, measurementCompleted: true, summary: result.summary, output, resultSha256: sha(await readFile(output)) }));
  process.exitCode = available ? 0 : 1;
}

try { await main(); }
catch (error) {
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify({ ...partial, error: { name: error.name, message: error.message, stack: error.stack } }, null, 2) + '\n');
  console.error(error.stack); process.exitCode = 2;
}
