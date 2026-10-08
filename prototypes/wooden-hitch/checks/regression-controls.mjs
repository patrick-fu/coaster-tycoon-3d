import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = '/workspace/coaster-wooden-hitch-authoring';
if (process.platform !== 'linux') throw new Error('Remote-only controls.');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const current = await readFile(path.join(root, 'check-joint.mjs'), 'utf8');
const out = path.join(root, 'checks/regression-controls-' + sha(Buffer.from(current)).slice(0, 12));
await mkdir(out, { recursive: true });
const original = await readFile('/workspace/coaster-detailed-assets/outputs/wooden-car.glb');
if (sha(original) !== 'fc988c55ed60dcd5abf7c5e02ecbc1ac3a8cd828cfe7fe4bb8f30bcf21699b59') throw new Error('Original GLB changed.');
const fixtureBytes = await readFile('/workspace/coaster-articulated-wooden-joint/results.json');
if (sha(fixtureBytes) !== '167ba3e1da273b66a4bc1d9fb1c3a6fe6c1ec0d2ea54673395f94ae73a287ab6') throw new Error('Fixture changed.');
const fixture = JSON.parse(fixtureBytes);
const before = await readFile(path.join(root, 'checks/check-joint-before-inventory.mjs'), 'utf8');
const c75 = await readFile(path.join(root, 'checks/check-joint-c75a7e.mjs'), 'utf8');
const { ShapeUtils, Vector2, Vector3, Matrix4, Quaternion } = await import(pathToFileURL('/workspace/coaster-classic-game/app/node_modules/three/build/three.module.js').href);
function chunks(bytes) {
  let g, bin;
  for (let at = 12; at < bytes.length;) { const n = bytes.readUInt32LE(at), kind = bytes.readUInt32LE(at + 4), data = bytes.subarray(at + 8, at + 8 + n); if (kind === 0x4e4f534a) g = JSON.parse(data); else if (kind === 0x004e4942) bin = Buffer.from(data); at += 8 + n; }
  return { g, bin };
}
function pack(g, bin) {
  g.buffers = [{ byteLength: bin.length }];
  let json = Buffer.from(JSON.stringify(g)); json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const padded = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]), header = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + json.length + 8 + padded.length, 8);
  jh.writeUInt32LE(json.length); jh.writeUInt32LE(0x4e4f534a, 4); bh.writeUInt32LE(padded.length); bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jh, json, bh, padded]);
}
function readAccessor(g, bin, index) {
  const a = g.accessors[index], view = g.bufferViews[a.bufferView], dim = a.type === 'VEC3' ? 3 : 1, size = a.componentType === 5123 ? 2 : 4, reader = a.componentType === 5126 ? 'readFloatLE' : a.componentType === 5123 ? 'readUInt16LE' : 'readUInt32LE';
  return Array.from({ length: a.count }, (_, i) => Array.from({ length: dim }, (_, j) => bin[reader]((view.byteOffset ?? 0) + (a.byteOffset ?? 0) + i * (view.byteStride ?? dim * size) + j * size)));
}
function append(g, bin, data, descriptor, target) {
  const aligned = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]), offset = aligned.length, view = g.bufferViews.length;
  g.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: data.length, target });
  const index = g.accessors.length; g.accessors.push({ bufferView: view, ...descriptor });
  return { bin: Buffer.concat([aligned, data]), index };
}
function withoutOldHitches() {
  let { g, bin } = chunks(original); const worlds = new Map();
  function walk(i, parent) { const n = g.nodes[i], m = n.matrix ? new Matrix4().fromArray(n.matrix) : new Matrix4().compose(new Vector3(...(n.translation ?? [0, 0, 0])), new Quaternion(...(n.rotation ?? [0, 0, 0, 1])), new Vector3(...(n.scale ?? [1, 1, 1]))), world = parent.clone().multiply(m); worlds.set(i, world); for (const c of n.children ?? []) walk(c, world); }
  for (const n of g.scenes[g.scene ?? 0].nodes) walk(n, new Matrix4());
  const ni = g.nodes.findIndex(n => n.name === 'Chassis_Frame'), components = [fixture.measuredAsset.chassisComponents[7], fixture.measuredAsset.chassisComponents[8]];
  let removed = 0;
  for (const primitive of g.meshes[g.nodes[ni].mesh].primitives) {
    const positions = readAccessor(g, bin, primitive.attributes.POSITION).map(v => new Vector3(...v).applyMatrix4(worlds.get(ni))), indices = readAccessor(g, bin, primitive.indices).flat(), kept = [];
    for (let i = 0; i < indices.length; i += 3) {
      const triangle = indices.slice(i, i + 3), old = components.some(c => triangle.every(id => positions[id].toArray().every((v, axis) => v >= c.bounds.min[axis] - 1e-9 && v <= c.bounds.max[axis] + 1e-9)));
      if (old) removed++; else kept.push(...triangle);
    }
    const data = Buffer.alloc(kept.length * 4); kept.forEach((v, i) => data.writeUInt32LE(v, i * 4));
    const result = append(g, bin, data, { componentType: 5125, count: kept.length, type: 'SCALAR' }, 34963); bin = result.bin; primitive.indices = result.index;
  }
  if (removed !== 216) throw new Error(`Control removal mismatch: ${removed}`);
  return { g, bin, removed };
}
function addMesh(g, bin, name, vertices, faces, parent = null) {
  const positions = Buffer.alloc(vertices.length * 12); vertices.forEach((v, i) => v.forEach((n, j) => positions.writeFloatLE(n, i * 12 + j * 4)));
  let added = append(g, bin, positions, { componentType: 5126, count: vertices.length, type: 'VEC3' }, 34962); bin = added.bin; const positionIndex = added.index;
  const indices = Buffer.alloc(faces.length * 12); faces.forEach((f, i) => f.forEach((v, j) => indices.writeUInt32LE(v, i * 12 + j * 4)));
  added = append(g, bin, indices, { componentType: 5125, count: faces.length * 3, type: 'SCALAR' }, 34963); bin = added.bin;
  const mesh = g.meshes.length; g.meshes.push({ primitives: [{ attributes: { POSITION: positionIndex }, indices: added.index }] });
  const node = g.nodes.length; g.nodes.push({ name, mesh });
  if (parent === null) g.scenes[0].nodes.push(node); else (g.nodes[parent].children ??= []).push(node);
  return bin;
}
const endpoints = () => ({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0, 1] }], nodes: [{ name: 'Joint_EndA', translation: [0, 0, .1] }, { name: 'Joint_EndB', translation: [0, 0, -.1] }], meshes: [], accessors: [], bufferViews: [], buffers: [{ byteLength: 0 }] });
const emptyMetadata = () => ({ schemaVersion: 1, carParts: [], drawbarParts: [], contacts: [], joints: [], authorDimensions: {}, authorSourceHashes: {} });
function box(centre, half) {
  const v = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(p => p.map((x, a) => centre[a] + x * half));
  const f = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [3, 7, 6], [3, 6, 2], [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5]];
  return { vertices: v, faces: f };
}
function combined(a, b) { return { vertices: [...a.vertices, ...b.vertices], faces: [...a.faces, ...b.faces.map(f => f.map(i => i + a.vertices.length))] }; }
function cylinder(centre, radius, halfHeight, n = 64) {
  const vertices = []; for (const sign of [-1, 1]) for (let i = 0; i < n; i++) vertices.push([centre[0] + radius * Math.cos(2 * Math.PI * i / n), centre[1] + sign * halfHeight, centre[2] + radius * Math.sin(2 * Math.PI * i / n)]);
  vertices.push([centre[0], centre[1] - halfHeight, centre[2]], [centre[0], centre[1] + halfHeight, centre[2]]);
  const faces = []; for (let i = 0; i < n; i++) { const j = (i + 1) % n; faces.push([i, i + n, j + n], [i, j + n, j], [2 * n, i, j], [2 * n + 1, j + n, i + n]); } return { vertices, faces };
}
function closedBindingControl(outerRadius = .03) {
  const contour = [];
  for (let i = 0; i <= 32; i++) { const a = i * Math.PI / 32; contour.push(new Vector2(outerRadius * Math.cos(a), .1 + outerRadius * Math.sin(a))); }
  for (let i = 0; i <= 32; i++) { const a = Math.PI + i * Math.PI / 32; contour.push(new Vector2(outerRadius * Math.cos(a), -.1 + outerRadius * Math.sin(a))); }
  const holes = [.1, -.1].map(z => Array.from({ length: 64 }, (_, i) => { const a = -i * 2 * Math.PI / 64; return new Vector2(.014 * Math.cos(a), z + .014 * Math.sin(a)); }));
  const all = [...contour, ...holes.flat()], vertices = [-.012, .012].flatMap(y => all.map(p => [p.x, y, p.y])), count = all.length, faces = [];
  for (let f of ShapeUtils.triangulateShape(contour, holes)) { const a = all[f[0]], b = all[f[1]], c = all[f[2]], area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); if (area < 0) f = [f[0], f[2], f[1]]; faces.push(f, [f[2] + count, f[1] + count, f[0] + count]); }
  let offset = 0; for (const loop of [contour, ...holes]) { for (let i = 0; i < loop.length; i++) { const j = (i + 1) % loop.length, a = offset + i, b = offset + j; faces.push([a, a + count, b + count], [a, b + count, b]); } offset += loop.length; }
  return { vertices, faces };
}
async function inputs(label, car, link, metadata) {
  const dir = path.join(out, label); await mkdir(dir, { recursive: true });
  const bytes = { car: pack(car.g, car.bin), link: pack(link.g, link.bin), metadata: Buffer.from(JSON.stringify(metadata, null, 2) + '\n') }, records = {};
  for (const [name, data] of Object.entries(bytes)) { const file = path.join(dir, name === 'metadata' ? 'metadata.json' : name + '.glb'); await writeFile(file, data); records[name] = { path: file, sha256: sha(data), bytes: data.length }; }
  return { dir, records };
}
async function execute(label, source, input, phase = 'inventory') {
  let code = source.replace('const root = path.dirname(fileURLToPath(import.meta.url));', `const root = ${JSON.stringify(root)};`);
  for (const [name, originalName] of [['car', 'wooden-car-joint.glb'], ['link', 'wooden-drawbar.glb']]) code = code.replace(`${name}: path.join(root, 'outputs/${originalName}'),`, `${name}: ${JSON.stringify(input.records[name].path)},`);
  code = code.replace("metadata: path.join(root, 'outputs/hitch-metadata.json'),", `metadata: ${JSON.stringify(input.records.metadata.path)},`);
  const marker = phase === 'inventory' ? '  function selectPart(selector) {' : phase === 'binding' ? '  function applicableRule(rule, a, b, ac, bc) {' : '  const cases = [];';
  const cut = code.indexOf(marker); if (cut < 0) throw new Error(`Control phase not found: ${phase}`);
  const tail = code.slice(code.lastIndexOf('\ntry { await main(); }'));
  const extras = phase === 'binding' ? ', mechanicalBindings, finiteSpan' : phase === 'self' ? ', newPartSelfGeometry, kernelChecks, negativeChecks' : '';
  code = code.slice(0, cut) + `  const phaseResult = { ...partial, measurementCompleted: true, scope: 'Logical validator phase counterexample only; no production or candidate qualification.', phase: ${JSON.stringify(phase)}, failures, preservedMeshes, inventory: { car: [...car.meshes.values()].map(m => ({name:m.name,components:m.components.map(c=>({index:c.index,topology:c.topology}))})), link: [...link.meshes.values()].map(m => ({name:m.name,components:m.components.map(c=>({index:c.index,topology:c.topology}))})) }${extras} };\n  await writeFile(output, JSON.stringify(phaseResult,null,2)+'\\n');\n  console.log(JSON.stringify({event:'phase-complete', phase:phaseResult.phase, failures:failures.map(f=>f.code), output}));\n  return;\n}\n` + tail;
  const runner = path.join(input.dir, label + '.mjs'), stdoutFile = path.join(input.dir, label + '.stdout.jsonl'), stderrFile = path.join(input.dir, label + '.stderr.log'), result = path.join(input.dir, label + '.json');
  await writeFile(runner, code);
  const stdout = await open(stdoutFile, 'w'), stderr = await open(stderrFile, 'w');
  const args = [runner, input.records.car.sha256, input.records.link.sha256, input.records.metadata.sha256];
  const exit = await new Promise((resolve, reject) => { const child = spawn(process.execPath, args, { env: { ...process.env, JOINT_CHECK_OUTPUT: result }, stdio: ['ignore', stdout.fd, stderr.fd] }); child.on('error', reject); child.on('exit', (code, signal) => resolve({ code, signal })); });
  await stdout.close(); await stderr.close();
  await writeFile(path.join(input.dir, label + '.exit.json'), JSON.stringify(exit) + '\n');
  await writeFile(path.join(input.dir, label + '.command.json'), JSON.stringify({ executable: process.execPath, argv: args, env: { JOINT_CHECK_OUTPUT: result } }, null, 2) + '\n');
  const records = {}; for (const file of [runner, stdoutFile, stderrFile, result]) { const data = await readFile(file); records[path.basename(file)] = { sha256: sha(data), bytes: data.length }; }
  const actual = JSON.parse(await readFile(result, 'utf8'));
  console.log(JSON.stringify({ event: 'control-phase', label, phase, exit, failureCodes: actual.failures?.map(f => f.code) ?? null }));
  return { exit, records, result: actual };
}
const checks = {}, evidence = {};
const empty = await inputs('empty-drawbar', withoutOldHitches(), { g: endpoints(), bin: Buffer.alloc(0) }, emptyMetadata());
evidence.emptyRed = await execute('before-inventory', before, empty); evidence.emptyGreen = await execute('after-inventory', current, empty);
checks.emptyVacuousRedReproduced = evidence.emptyRed.result.failures?.length === 0;
checks.emptyRejected = evidence.emptyGreen.result.failures?.some(f => f.code === 'missing-finite-drawbar');
const zeroMesh = endpoints(); zeroMesh.meshes.push({ primitives: [] }); zeroMesh.nodes.push({ name: 'Empty_Listed_Part', mesh: 0 }); zeroMesh.scenes[0].nodes.push(2);
const zeroMetadata = emptyMetadata(); zeroMetadata.drawbarParts.push({ name: 'Empty_Listed_Part', end: 'span', kind: 'unified-link' });
const zeroInput = await inputs('zero-triangle-listed-part', withoutOldHitches(), { g: zeroMesh, bin: Buffer.alloc(0) }, zeroMetadata);
evidence.zeroListed = await execute('nonempty-surface-guard', current, zeroInput);
checks.zeroTrianglePartRejected = evidence.zeroListed.result.failures?.some(f => f.code === 'empty-listed-finite-part');
const swappedCar = withoutOldHitches(); swappedCar.g.textures[0].source = 3;
const swapped = await inputs('changed-original-texture-source', swappedCar, { g: endpoints(), bin: Buffer.alloc(0) }, emptyMetadata());
evidence.textureRed = await execute('before-resource-binding', before, swapped); evidence.textureGreen = await execute('after-resource-binding', current, swapped);
checks.textureBindingRedReproduced = !evidence.textureRed.result.failures?.some(f => f.code === 'changed-original-triangles');
checks.textureBindingRejected = evidence.textureGreen.result.failures?.some(f => f.code === 'changed-original-triangles');
const reorderedCar = withoutOldHitches(), count = reorderedCar.g.textures.length, imageCount = reorderedCar.g.images.length;
reorderedCar.g.textures.reverse(); reorderedCar.g.images.reverse(); for (const texture of reorderedCar.g.textures) texture.source = imageCount - 1 - texture.source;
function reindex(value, key = '') { if (!value || typeof value !== 'object') return; if (/Texture$/.test(key) && value.index !== undefined) value.index = count - 1 - value.index; else for (const [k, v] of Object.entries(value)) reindex(v, k); }
for (const material of reorderedCar.g.materials) reindex(material);
const reordered = await inputs('equivalent-reordered-textures', reorderedCar, { g: endpoints(), bin: Buffer.alloc(0) }, emptyMetadata());
evidence.textureEquivalent = await execute('resolved-equivalent-resources', current, reordered);
checks.equivalentResourceReorderPreserved = !evidence.textureEquivalent.result.failures?.some(f => f.code === 'changed-original-triangles');
for (const [label, shape] of [['coherent-closed-cube', box([0, 0, 0], .01)], ['vertex-touch', combined(box([-.005, -.005, -.005], .005), box([.005, .005, .005], .005))], ['overlapping-components', combined(box([0, 0, 0], .01), box([.005, .005, .005], .01))], ['nested-components', combined(box([0, 0, 0], .02), box([0, 0, 0], .005))]]) {
  const g = endpoints(); const bin = addMesh(g, Buffer.alloc(0), 'Topology_Control', shape.vertices, shape.faces), metadata = emptyMetadata(); metadata.drawbarParts = [{ name: 'Topology_Control', end: 'span', kind: 'unified-link' }];
  const input = await inputs(label, withoutOldHitches(), { g, bin }, metadata);
  evidence[label] = await execute('current-topology-self', current, input, 'self');
  if (label === 'coherent-closed-cube') checks.coherentTopologySelfPreserved = !evidence[label].result.failures.some(f => f.code === 'unsupported-new-solid-topology') && evidence[label].result.newPartSelfGeometry.every(p => !p.selfIntersectionPairs && !p.componentContainments.length);
  else if (label === 'vertex-touch') {
    evidence.vertexAblation = await execute('edge-only-ablation', current.replace(' && !invalidVertexLinks.length', ''), input);
    checks.vertexTouchRedReproduced = !evidence.vertexAblation.result.failures.some(f => f.code === 'unsupported-new-solid-topology');
    checks.vertexTouchRejected = evidence[label].result.failures.some(f => f.code === 'unsupported-new-solid-topology');
  } else if (label === 'overlapping-components') checks.actualSelfCrossingRejected = evidence[label].result.newPartSelfGeometry.some(p => p.selfIntersectionPairs > 0);
  else checks.actualNestedContainmentRejected = evidence[label].result.newPartSelfGeometry.some(p => p.componentContainments.length > 0);
}
for (const [label, shape] of [['distant-cube-link', box([0, 0, 5], .01)], ['closed-finite-binding-positive', closedBindingControl()], ['smaller-outer-rim', closedBindingControl(.029)], ['larger-outer-rim', closedBindingControl(.031)]]) {
  const car = withoutOldHitches(), railRoot = car.g.nodes.findIndex(n => n.name === 'RailRoot'), metadata = emptyMetadata();
  for (const end of ['front', 'rear']) { const centre = fixture.measuredAsset.anchors[end === 'front' ? 'frontCoupler' : 'rearCoupler'], name = 'Control_Pin_' + end, primitive = cylinder(centre, .012, .030); car.bin = addMesh(car.g, car.bin, name, primitive.vertices, primitive.faces, railRoot); metadata.carParts.push({ name, end, kind: 'unified-mount' }); metadata.joints.push({ end, carrier: name, pin: name, eye: 'Drawbar_Body', attachmentContact: 'not-a-qualified-attachment', bearing: { axis: [0, 1, 0], eyeInnerRadiusMetres: .014, eyeOuterRadiusMetres: .030, eyeHalfThicknessMetres: .012, pinRadiusMetres: .012, pinHalfHeightMetres: .030 } }); }
  const g = endpoints(), bin = addMesh(g, Buffer.alloc(0), 'Drawbar_Body', shape.vertices, shape.faces); metadata.drawbarParts = [{ name: 'Drawbar_Body', end: 'span', kind: 'unified-link' }];
  const input = await inputs(label, car, { g, bin }, metadata); evidence[label] = await execute('actual-solid-marker-binding', current, input, 'binding');
  if (label === 'distant-cube-link') checks.distantCubeBindingRejected = evidence[label].result.mechanicalBindings.every(b => !b.passed) && !evidence[label].result.finiteSpan.passed;
  else if (label === 'closed-finite-binding-positive') checks.finiteBindingPositivePreserved = evidence[label].result.mechanicalBindings.every(b => b.passed) && evidence[label].result.finiteSpan.passed;
  else {
    evidence[label + '-c75'] = await execute('before-outer-rim-measurement', c75, input, 'binding');
    checks[label + 'RedReproduced'] = evidence[label + '-c75'].result.mechanicalBindings.every(b => b.passed);
    checks[label + 'Rejected'] = evidence[label].result.mechanicalBindings.every(b => !b.passed && !b.checks.actualOuterBoundary);
  }
}
const complete = Object.values(evidence).every(e => e.exit?.code === 0 && e.result.measurementCompleted);
const result = { schemaVersion: 1, scope: 'Isolated logical phase regression controls using actual synthetic GLB buffers. No candidate/production qualification. Positive capsule-link geometry is a test fixture, not an authored destination.', measurementCompleted: complete, passed: complete && Object.values(checks).every(Boolean), checks, provenance: { controlRunnerSha256: sha(await readFile(path.join(root, 'checks/regression-controls.mjs'))), currentRunnerSha256: sha(Buffer.from(current)), c75RunnerSha256: sha(Buffer.from(c75)), beforeInventorySha256: sha(Buffer.from(before)), originalSha256: sha(original), fixtureSha256: sha(fixtureBytes) }, evidence };
await writeFile(path.join(out, 'results.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ event: 'regressions-complete', passed: result.passed, checks, result: path.join(out, 'results.json'), resultSha256: sha(await readFile(path.join(out, 'results.json'))) }));
process.exitCode = result.passed ? 0 : 1;
