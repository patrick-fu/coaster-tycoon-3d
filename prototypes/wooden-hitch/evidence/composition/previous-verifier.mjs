import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { Matrix4, Quaternion, Vector3 } from '/workspace/coaster-classic-game/app/node_modules/three/build/three.module.js';

const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const assert = (c, m) => { if (!c) throw new Error(m); };
const stable = v => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, stable(x)])) : v;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
const ORIGINAL_SHA = 'fc988c55ed60dcd5abf7c5e02ecbc1ac3a8cd828cfe7fe4bb8f30bcf21699b59';
const FIXTURE_SHA = '167ba3e1da273b66a4bc1d9fb1c3a6fe6c1ec0d2ea54673395f94ae73a287ab6';

function load(path) {
  const bytes = fs.readFileSync(path);
  assert(bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, 'Invalid GLB header.');
  const jl = bytes.readUInt32LE(12), bp = 20 + jl, bl = bytes.readUInt32LE(bp);
  assert(bytes.readUInt32LE(16) === 0x4e4f534a && bytes.readUInt32LE(bp + 4) === 0x004e4942 && bp + 8 + bl === bytes.length, 'Expected exactly JSON+BIN chunks.');
  const source = bytes.subarray(20, 20 + jl).toString(), g = JSON.parse(source), bin = bytes.subarray(bp + 8);
  const nodes = new Map();
  const walk = (index, parent, worldParent) => {
    const n = g.nodes[index], local = n.matrix ? new Matrix4().fromArray(n.matrix) : new Matrix4().compose(new Vector3(...(n.translation ?? [0, 0, 0])), new Quaternion(...(n.rotation ?? [0, 0, 0, 1])), new Vector3(...(n.scale ?? [1, 1, 1])));
    assert(!nodes.has(n.name), 'Ambiguous node names.');
    const world = worldParent ? worldParent.clone().multiply(local) : local.clone();
    nodes.set(n.name, { index, n, parent, local: local.toArray(), world: world.toArray() });
    for (const child of n.children ?? []) walk(child, n.name, world);
  };
  for (const root of g.scenes[g.scene ?? 0].nodes) walk(root, null, null);
  assert(nodes.size === g.nodes.length, 'Inactive node.');
  return { path, bytes, source, g, bin, nodes };
}
function view(model, index) {
  const v = model.g.bufferViews[index];
  return model.bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength);
}
function accessor(model, index) {
  const a = model.g.accessors[index], v = model.g.bufferViews[a.bufferView], bytes = view(model, a.bufferView), sizes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }, dims = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  const size = sizes[a.componentType], dim = dims[a.type], step = v.byteStride ?? size * dim, offset = a.byteOffset ?? 0;
  assert(size && dim && !a.sparse, 'Unsupported verification accessor.');
  const parts = Array.from({ length: a.count }, (_, i) => bytes.subarray(offset + i * step, offset + i * step + size * dim));
  assert(parts.every(p => p.length === size * dim), 'Truncated verification accessor.');
  const raw = Buffer.concat(parts), methods = { 5120: 'readInt8', 5121: 'readUInt8', 5122: 'readInt16LE', 5123: 'readUInt16LE', 5125: 'readUInt32LE', 5126: 'readFloatLE' };
  const values = parts.map(part => Array.from({ length: dim }, (_, i) => part[methods[a.componentType]](i * size)));
  return { a, v, raw, values };
}

// Split only at outer commas, independently of the composer's pointer scanner.
function outerParts(text) {
  const result = []; let depth = 0, quoted = false, escaped = false, begin = 1;
  for (let i = 1; i < text.length - 1; i++) {
    const c = text[i];
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue; }
    if (c === '"') quoted = true;
    else if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) { result.push(text.slice(begin, i)); begin = i + 1; }
  }
  const tail = text.slice(begin, -1); if (tail.trim()) result.push(tail); return result;
}
function topRaw(source) {
  const result = new Map();
  for (const field of outerParts(source.trim())) { const m = /^\s*("(?:[^"\\]|\\.)*")\s*:/.exec(field); assert(m, 'Cannot parse top-level source field.'); result.set(JSON.parse(m[1]), field.slice(m[0].length)); }
  return result;
}
function normalizedMaterial(model, index) {
  const material = model.g.materials[index];
  const texture = (info, role) => {
    if (!info) return null;
    const t = model.g.textures[info.index], image = model.g.images[t.source], sampler = t.sampler === undefined ? {} : model.g.samplers[t.sampler];
    assert(image.bufferView !== undefined && !image.uri, 'Expected actual embedded material bitmap.');
    return { texCoord: info.texCoord ?? 0, bitmapMime: image.mimeType, bitmapSha256: sha(view(model, image.bufferView)),
      filters: [sampler.magFilter ?? null, sampler.minFilter ?? null, sampler.wrapS ?? 10497, sampler.wrapT ?? 10497],
      adjustment: role === 'normal' ? info.scale ?? 1 : role === 'occlusion' ? info.strength ?? 1 : null };
  };
  const p = material.pbrMetallicRoughness ?? {};
  return { doubleSided: material.doubleSided ?? false, alpha: [material.alphaMode ?? 'OPAQUE', material.alphaCutoff ?? 0.5],
    emissive: material.emissiveFactor ?? [0, 0, 0], color: p.baseColorFactor ?? [1, 1, 1, 1], metallic: p.metallicFactor ?? 1, roughness: p.roughnessFactor ?? 1,
    textures: [texture(p.baseColorTexture), texture(p.metallicRoughnessTexture), texture(material.normalTexture, 'normal'), texture(material.occlusionTexture, 'occlusion'), texture(material.emissiveTexture)] };
}

try {
  const [outputPath, reportPath] = process.argv.slice(2);
  assert(outputPath?.endsWith('-composed.glb') && reportPath, 'Usage: node verify-composition.mjs OUTPUT-composed.glb REPORT.json');
  const composition = JSON.parse(fs.readFileSync(outputPath.replace(/\.glb$/, '.json'))), original = load(composition.inputs.original.path), hardware = load(composition.inputs.hardware.path), output = load(outputPath);
  const fixtureBytes = fs.readFileSync(composition.inputs.fixture.path), fixture = JSON.parse(fixtureBytes);
  assert(sha(original.bytes) === ORIGINAL_SHA && sha(fixtureBytes) === FIXTURE_SHA && sha(hardware.bytes) === composition.inputs.hardware.sha256 && sha(output.bytes) === composition.output.sha256, 'Independent input/output hashes differ.');
  assert(output.bin.subarray(0, original.bin.length).equals(original.bin), 'Original BIN prefix differs.');
  const beforeRaw = topRaw(original.source), afterRaw = topRaw(output.source), originals = {};
  for (const key of ['accessors', 'bufferViews', 'materials', 'images', 'textures', 'samplers', 'nodes', 'meshes']) {
    const before = outerParts(beforeRaw.get(key) ?? '[]'), after = outerParts(afterRaw.get(key) ?? '[]');
    const skip = key === 'nodes' ? original.nodes.get('RailRoot').index : key === 'meshes' ? original.nodes.get('Chassis_Frame').n.mesh : -1;
    before.forEach((raw, i) => { if (i !== skip) assert(raw === after[i], `Original raw definition differs: ${key}/${i}`); });
    originals[key] = { preservedDefinitions: before.length - (skip < 0 ? 0 : 1), permittedModifiedDefinitions: skip < 0 ? [] : [skip] };
  }
  const appendKeys = ['nodes', 'meshes', 'accessors', 'bufferViews'], restored = structuredClone(output.g);
  for (const key of appendKeys) restored[key] = restored[key].slice(0, original.g[key].length);
  const oldRail = original.nodes.get('RailRoot'), newRail = output.nodes.get('RailRoot'), oldChassis = original.nodes.get('Chassis_Frame'), newChassis = output.nodes.get('Chassis_Frame');
  assert(same(newRail.n.children.slice(0, oldRail.n.children.length), oldRail.n.children), 'Original RailRoot child ordering differs.');
  restored.nodes[oldRail.index].children = restored.nodes[oldRail.index].children.slice(0, oldRail.n.children.length);
  restored.meshes[oldChassis.n.mesh].primitives[0].indices = original.g.meshes[oldChassis.n.mesh].primitives[0].indices;
  restored.buffers[0].byteLength = original.g.buffers[0].byteLength;
  assert(same(restored, original.g), 'A GLB property outside the bounded permitted modifications differs.');
  for (const [key, raw] of beforeRaw) if (![...appendKeys, 'buffers'].includes(key)) assert(raw === afterRaw.get(key), `Original top-level raw field differs: ${key}`);
  const accessorEvidence = original.g.accessors.map((_, i) => {
    const a = accessor(original, i), b = accessor(output, i); assert(a.raw.equals(b.raw), `Original accessor payload differs: ${i}`);
    return { index: i, count: a.a.count, componentType: a.a.componentType, type: a.a.type, packedBytes: a.raw.length, sha256: sha(a.raw), identical: true };
  });
  const oldP = original.g.meshes[oldChassis.n.mesh].primitives[0], newP = output.g.meshes[newChassis.n.mesh].primitives[0];
  const oldIndices = accessor(original, oldP.indices).values.flat(), newIndices = accessor(output, newP.indices).values.flat(), points = accessor(original, oldP.attributes.POSITION).values;
  const removed = new Map([[7, []], [8, []]]), kept = [];
  for (let at = 0; at < oldIndices.length; at += 3) {
    const triangle = oldIndices.slice(at, at + 3), ids = [7, 8].filter(id => triangle.every(i => points[i].every((n, axis) => n >= fixture.measuredAsset.chassisComponents[id].bounds.min[axis] && n <= fixture.measuredAsset.chassisComponents[id].bounds.max[axis])));
    assert(ids.length <= 1, 'Frozen old hitch bounds overlap.');
    if (ids.length) removed.get(ids[0]).push({ ordinal: at / 3, indices: triangle }); else kept.push(...triangle);
  }
  for (const [id, triangles] of removed) {
    assert(triangles.length === 108, `Exact frozen hitch ${id} must contain 108 triangles.`);
    const positions = triangles.flatMap(t => t.indices.map(i => points[i])), min = [0, 1, 2].map(a => Math.min(...positions.map(p => p[a]))), max = [0, 1, 2].map(a => Math.max(...positions.map(p => p[a])));
    assert(same({ min, max }, fixture.measuredAsset.chassisComponents[id].bounds), `Exact frozen hitch ${id} boundary differs.`);
    assert(same(triangles.map(t => t.ordinal), composition.removedChassisComponents.find(c => c.index === id)?.triangles), `Independent bounds selection differs from component selection ${id}.`);
  }
  assert(kept.length === 2268 && same(newIndices, kept) && same(oldP.attributes, newP.attributes), 'Composed chassis is not the exact ordered non-hitch index subsequence over original vertex attributes.');
  assert(!output.g.meshes.some(m => m.primitives.some(p => p.indices === oldP.indices)), 'Original hitch index accessor is still referenced by an active primitive.');
  const nodeFrames = [...original.nodes].map(([name, n]) => {
    const actual = output.nodes.get(name); assert(actual && n.index === actual.index && n.parent === actual.parent && same(n.local, actual.local) && same(n.world, actual.world), `Original node frame differs: ${name}`);
    return { name, index: n.index, parent: n.parent, localMatrix: n.local, globalMatrix: n.world, identical: true };
  });
  const expectedHardwareNames = new Set();
  const include = name => { const record = hardware.nodes.get(name); expectedHardwareNames.add(name); for (const child of record.n.children ?? []) include(hardware.g.nodes[child].name); };
  for (const name of ['Mount_Assembly_Front', 'Mount_Assembly_Rear']) {
    assert(hardware.nodes.get(name)?.parent === 'RailRoot', 'Hardware mount must directly descend from RailRoot.'); include(name);
  }
  assert(same([...output.nodes.keys()].filter(n => !original.nodes.has(n)).sort(), [...expectedHardwareNames].sort()), 'Unexpected appended node inventory.');
  const mountEvidence = [], copiedViews = new Set();
  for (const name of expectedHardwareNames) {
    const expected = hardware.nodes.get(name), actual = output.nodes.get(name);
    assert(actual && expected.parent === actual.parent && same(expected.local, actual.local) && same(expected.world, actual.world), `Imported hardware frame differs: ${name}`);
    const n = structuredClone(actual.n); if (n.mesh !== undefined) n.mesh = expected.n.mesh; if (n.children) n.children = expected.n.children;
    assert(same(n, expected.n), `Imported hardware node extras/properties differ: ${name}`);
    if (expected.n.mesh === undefined) continue;
    const sourceMesh = hardware.g.meshes[expected.n.mesh], actualMesh = output.g.meshes[actual.n.mesh], normalized = structuredClone(actualMesh);
    assert(sourceMesh.primitives.length === actualMesh.primitives.length, 'Hardware material group count differs.');
    const primitives = [];
    for (let p = 0; p < sourceMesh.primitives.length; p++) {
      const e = sourceMesh.primitives[p], a = actualMesh.primitives[p], checks = [];
      assert(same(Object.keys(e.attributes).sort(), Object.keys(a.attributes).sort()), 'Imported attribute semantics differ.');
      for (const [semantic, index] of [...Object.entries(e.attributes), ['indices', e.indices]]) {
        const actualIndex = semantic === 'indices' ? a.indices : a.attributes[semantic], ea = accessor(hardware, index), aa = accessor(output, actualIndex), descriptor = { ...aa.a, bufferView: ea.a.bufferView }, layout = { ...aa.v, byteOffset: ea.v.byteOffset };
        assert(same(ea.a, descriptor) && same(ea.v, layout) && ea.raw.equals(aa.raw) && view(hardware, ea.a.bufferView).equals(view(output, aa.a.bufferView)), `Imported accessor/view bytes or properties differ: ${name}/${semantic}`);
        assert(actualIndex >= original.g.accessors.length && aa.a.bufferView >= original.g.bufferViews.length, 'Imported hardware aliases immutable old geometry.');
        copiedViews.add(aa.a.bufferView); checks.push({ semantic, hardwareAccessor: index, outputAccessor: actualIndex, viewBytes: aa.v.byteLength, packedBytes: aa.raw.length, sha256: sha(aa.raw), identical: true });
      }
      assert(['metal', 'brass'].includes(original.g.materials[a.material]?.name) && same(normalizedMaterial(hardware, e.material), normalizedMaterial(original, a.material)), 'Hardware material semantics or actual embedded bitmap differs from original metal/brass.');
      normalized.primitives[p].attributes = e.attributes; normalized.primitives[p].indices = e.indices; normalized.primitives[p].material = e.material;
      primitives.push({ checks, hardwareMaterial: e.material, originalMaterial: a.material, materialSemanticsAndEmbeddedBitmapMatch: true });
    }
    assert(same(normalized, sourceMesh), `Imported mesh extras/primitive properties differ: ${name}`);
    mountEvidence.push({ name, hardwareNode: expected.index, outputNode: actual.index, localMatrix: actual.local, globalMatrix: actual.world, primitives });
  }
  const newViewCount = output.g.bufferViews.length - original.g.bufferViews.length;
  assert(newViewCount === copiedViews.size + 1, 'Unexpected appended bufferView inventory.');
  const replacedView = output.g.accessors[newP.indices].bufferView;
  assert(!copiedViews.has(replacedView), 'Replacement chassis index view aliases hardware geometry.');
  const expectedAddedBytes = [...copiedViews].reduce((n, i) => n + output.g.bufferViews[i].byteLength, 0) + view(output, replacedView).length;
  const spans = [...copiedViews, replacedView].map(i => output.g.bufferViews[i]).sort((a, b) => a.byteOffset - b.byteOffset);
  let at = original.bin.length, padding = 0;
  for (const v of spans) {
    const gap = v.byteOffset - at; assert(gap >= 0 && gap <= 3 && output.bin.subarray(at, v.byteOffset).every(x => x === 0), 'Appended geometry contains duplicated unrelated binary content.'); padding += gap; at = v.byteOffset + v.byteLength;
  }
  assert(at === output.g.buffers[0].byteLength && at - original.bin.length === expectedAddedBytes + padding, 'Appended BIN accounting differs.');
  const result = { schemaVersion: 1, verdict: 'preserve-exact-original-and-bounded-hardware', verificationCompleted: true,
    execution: { host: os.hostname(), node: process.version, argv: process.argv, verifierSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))), timeUtc: new Date().toISOString() },
    inputs: composition.inputs, output: { path: outputPath, sha256: sha(output.bytes), bytes: output.bytes.length },
    assertions: { inputOutputHashes: true, rawOriginalDefinitionBytes: true, exactOriginalBinaryPrefix: true, everyOriginalAccessorPayload: true, noOtherJsonPropertyChanges: true, exactOrderedRemainingChassisTriangles: true, independentFrozenBoundsRemoval: true, allOriginalNodeFrames: true, actualImportedGeometryAndFrames: true, materialSemanticsAndActualBitmap: true, onlyRequiredAppendedBinaryData: true },
    originalDefinitions: originals, accessorEvidence, nodeFrames, removedOriginalHitchTriangles: [...removed].map(([id, triangles]) => ({ component: id, triangles })), remainingChassisTriangles: 756,
    mountEvidence, appendedBinary: { originalPrefixBytes: original.bin.length, geometryBytes: expectedAddedBytes, alignmentPaddingBytes: padding, totalAddedBytes: at - original.bin.length },
    limitations: ['This report verifies composition fidelity only. It does not qualify hitch collision, continuous motion, native/original agreement, production, GPU or human acceptance.'] };
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ event: 'independent-composition-verified', output: result.output, assertions: result.assertions, appendedBinary: result.appendedBinary }));
} catch (e) { console.error(JSON.stringify({ event: 'independent-composition-rejected', message: e.message })); process.exitCode = 1; }
