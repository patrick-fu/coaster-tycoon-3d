import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ORIGINAL = '/workspace/coaster-detailed-assets/outputs/wooden-car.glb';
const FIXTURE = '/workspace/coaster-articulated-wooden-joint/results.json';
const ORIGINAL_SHA = 'fc988c55ed60dcd5abf7c5e02ecbc1ac3a8cd828cfe7fe4bb8f30bcf21699b59';
const FIXTURE_SHA = '167ba3e1da273b66a4bc1d9fb1c3a6fe6c1ec0d2ea54673395f94ae73a287ab6';
const MOUNT_NAMES = ['Mount_Assembly_Front', 'Mount_Assembly_Rear'];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const clone = value => structuredClone(value);
const canonical = value => JSON.stringify(value, (_, v) => v && !Array.isArray(v) && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
const same = (a, b) => canonical(a) === canonical(b);
const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const multiply = (a, b) => Array.from({ length: 16 }, (_, i) => {
  const row = i % 4, column = Math.floor(i / 4);
  return [0, 1, 2, 3].reduce((n, k) => n + a[k * 4 + row] * b[column * 4 + k], 0);
});
function localMatrix(node) {
  if (node.matrix) {
    assert(!node.translation && !node.rotation && !node.scale, 'A node mixes matrix and TRS.');
    assert(node.matrix.length === 16, 'Invalid node matrix.');
    return [...node.matrix];
  }
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const xx = 2 * x * x, xy = 2 * x * y, xz = 2 * x * z, yy = 2 * y * y, yz = 2 * y * z, zz = 2 * z * z;
  const wx = 2 * w * x, wy = 2 * w * y, wz = 2 * w * z;
  return [(1 - yy - zz) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - xx - zz) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - xx - yy) * sz, 0, tx, ty, tz, 1];
}
function rigid(matrix) {
  assert(matrix.every(Number.isFinite), 'Nonfinite node transform.');
  assert(matrix[3] === 0 && matrix[7] === 0 && matrix[11] === 0 && matrix[15] === 1, 'Non-affine node transform.');
  const columns = [matrix.slice(0, 3), matrix.slice(4, 7), matrix.slice(8, 11)];
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  const determinant = matrix[0] * (matrix[5] * matrix[10] - matrix[6] * matrix[9]) - matrix[4] * (matrix[1] * matrix[10] - matrix[2] * matrix[9]) + matrix[8] * (matrix[1] * matrix[6] - matrix[2] * matrix[5]);
  assert(columns.every((c, i) => Math.abs(dot(c, c) - 1) <= 1e-9 && columns.every((d, j) => i === j || Math.abs(dot(c, d)) <= 1e-9)) && Math.abs(determinant - 1) <= 1e-9, 'Only unit rigid node frames are supported; no fitting or rescaling.');
}

function parseGlb(bytes, label) {
  assert(bytes.length >= 28 && bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, `Invalid GLB header: ${label}`);
  const chunks = [];
  for (let at = 12; at < bytes.length;) {
    assert(at + 8 <= bytes.length, `Truncated GLB chunk: ${label}`);
    const length = bytes.readUInt32LE(at), type = bytes.readUInt32LE(at + 4);
    assert(length % 4 === 0 && at + 8 + length <= bytes.length, `Invalid GLB chunk extent: ${label}`);
    chunks.push({ type, bytes: bytes.subarray(at + 8, at + 8 + length) });
    at += 8 + length;
  }
  assert(chunks.length === 2 && chunks[0].type === 0x4e4f534a && chunks[1].type === 0x004e4942, `Only JSON+BIN GLBs are supported: ${label}`);
  const source = chunks[0].bytes.toString('utf8'), g = JSON.parse(source), bin = chunks[1].bytes;
  assert(g.asset?.version === '2.0' && g.buffers?.length === 1 && !g.buffers[0].uri, `Only a single embedded glTF 2.0 buffer is supported: ${label}`);
  assert(Number.isInteger(g.buffers[0].byteLength) && g.buffers[0].byteLength <= bin.length && bin.length - g.buffers[0].byteLength <= 3, `Invalid embedded buffer length: ${label}`);
  assert(!g.skins?.length && !g.animations?.length && !g.cameras?.length && !g.extensionsRequired?.length && !g.extensionsUsed?.length, `Skins, animations, cameras and extensions are unsupported: ${label}`);
  assert(g.meshes?.every(m => !m.weights?.length && m.primitives?.every(p => !p.targets?.length)), `Morph targets and mesh weights are unsupported: ${label}`);
  const rejectExtensions = value => {
    if (!value || typeof value !== 'object') return;
    assert(!value.extensions || !Object.keys(value.extensions).length, `Extension semantics are unsupported: ${label}`);
    for (const [key, child] of Object.entries(value)) if (key !== 'extras') rejectExtensions(child);
  };
  rejectExtensions(g);
  assert(g.scenes?.length === 1 && (g.scene ?? 0) === 0, `Only a single active scene is supported: ${label}`);
  const nodes = new Map(), visited = new Set();
  function walk(index, parent = null) {
    assert(Number.isInteger(index) && !visited.has(index), `Repeated or cyclic active node: ${label}`);
    const sourceNode = g.nodes?.[index];
    assert(sourceNode && typeof sourceNode.name === 'string' && sourceNode.name && !nodes.has(sourceNode.name) && sourceNode.skin === undefined && sourceNode.camera === undefined && !sourceNode.weights, `Unsupported or ambiguous active node: ${label}`);
    visited.add(index);
    const local = localMatrix(sourceNode), world = parent ? multiply(parent.world, local) : [...local];
    rigid(local); rigid(world);
    const record = { index, source: sourceNode, local, world, parent };
    nodes.set(sourceNode.name, record);
    for (const child of sourceNode.children ?? []) walk(child, record);
  }
  for (const index of g.scenes[0].nodes ?? []) walk(index);
  assert(visited.size === g.nodes?.length, `Inactive nodes are unsupported: ${label}`);
  return { bytes, source, g, bin, nodes, label };
}
function viewBytes(model, index) {
  const view = model.g.bufferViews?.[index], begin = view?.byteOffset ?? 0;
  assert(view && view.buffer === 0 && Number.isInteger(begin) && begin >= 0 && Number.isInteger(view.byteLength) && view.byteLength > 0 && begin + view.byteLength <= model.g.buffers[0].byteLength, `Invalid bufferView ${index}: ${model.label}`);
  return model.bin.subarray(begin, begin + view.byteLength);
}
const components = { 5120: [1, 'readInt8'], 5121: [1, 'readUInt8'], 5122: [2, 'readInt16LE'], 5123: [2, 'readUInt16LE'], 5125: [4, 'readUInt32LE'], 5126: [4, 'readFloatLE'] };
const dimensions = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function readAccessor(model, index) {
  const a = model.g.accessors?.[index], v = model.g.bufferViews?.[a?.bufferView], dim = dimensions[a?.type], format = components[a?.componentType];
  assert(a && v && dim && format && !a.sparse && Number.isInteger(a.count) && a.count > 0, `Unsupported accessor ${index}: ${model.label}`);
  const raw = viewBytes(model, a.bufferView), [size, read] = format, stride = v.byteStride ?? dim * size, offset = a.byteOffset ?? 0;
  assert(Number.isInteger(offset) && offset >= 0 && offset % size === 0 && Number.isInteger(stride) && stride >= size * dim && offset + (a.count - 1) * stride + size * dim <= raw.length, `Invalid accessor layout ${index}: ${model.label}`);
  const values = Array.from({ length: a.count }, (_, row) => Array.from({ length: dim }, (_, col) => raw[read](offset + row * stride + col * size)));
  assert(values.every(row => row.every(Number.isFinite)), `Nonfinite accessor ${index}: ${model.label}`);
  return { a, v, raw, values, size, stride, dim };
}
function validatePrimitive(model, primitive) {
  assert((primitive.mode ?? 4) === 4 && !primitive.targets?.length && primitive.indices !== undefined && primitive.material !== undefined, `Only indexed fixed material triangles are supported: ${model.label}`);
  const position = readAccessor(model, primitive.attributes?.POSITION);
  assert(position.a.type === 'VEC3' && position.a.componentType === 5126 && !position.a.normalized, `Expected float VEC3 POSITION: ${model.label}`);
  for (const [semantic, index] of Object.entries(primitive.attributes)) {
    assert(!/^(JOINTS|WEIGHTS)_/.test(semantic), `Skin attributes are unsupported: ${model.label}`);
    assert(readAccessor(model, index).a.count === position.a.count, `Attribute vertex counts differ: ${model.label}`);
  }
  const indices = readAccessor(model, primitive.indices);
  assert(indices.a.type === 'SCALAR' && [5121, 5123, 5125].includes(indices.a.componentType) && !indices.a.normalized && !indices.v.byteStride && indices.a.count % 3 === 0, `Unsupported triangle indices: ${model.label}`);
  assert(indices.values.every(([i]) => Number.isInteger(i) && i >= 0 && i < position.a.count), `Invalid triangle index: ${model.label}`);
  return { position, indices };
}
function imageSemantic(model, index) {
  const image = model.g.images?.[index];
  assert(image && image.bufferView !== undefined && !image.uri && ['image/png', 'image/jpeg'].includes(image.mimeType), `Only embedded PNG/JPEG material images are supported: ${model.label}`);
  const bytes = viewBytes(model, image.bufferView);
  return { mimeType: image.mimeType, bytes: bytes.length, sha256: sha(bytes) };
}
function textureSemantic(model, info, usage) {
  if (!info) return null;
  const texture = model.g.textures?.[info.index], sampler = texture?.sampler === undefined ? {} : model.g.samplers?.[texture.sampler];
  assert(texture && texture.source !== undefined && sampler, `Invalid material texture/sampler: ${model.label}`);
  const result = { texCoord: info.texCoord ?? 0, image: imageSemantic(model, texture.source), sampler: { magFilter: sampler.magFilter ?? null, minFilter: sampler.minFilter ?? null, wrapS: sampler.wrapS ?? 10497, wrapT: sampler.wrapT ?? 10497 } };
  if (usage === 'normal') result.scale = info.scale ?? 1;
  if (usage === 'occlusion') result.strength = info.strength ?? 1;
  return result;
}
function materialSemantic(model, index) {
  const m = model.g.materials?.[index];
  assert(m, `Missing material ${index}: ${model.label}`);
  const allowed = ['name', 'extras', 'extensions', 'doubleSided', 'alphaMode', 'alphaCutoff', 'emissiveFactor', 'emissiveTexture', 'normalTexture', 'occlusionTexture', 'pbrMetallicRoughness'];
  assert(Object.keys(m).every(key => allowed.includes(key)), `Unsupported material field: ${model.label}`);
  const p = m.pbrMetallicRoughness ?? {};
  assert(Object.keys(p).every(key => ['extras', 'extensions', 'baseColorFactor', 'baseColorTexture', 'metallicFactor', 'roughnessFactor', 'metallicRoughnessTexture'].includes(key)), `Unsupported PBR field: ${model.label}`);
  return { doubleSided: m.doubleSided ?? false, alphaMode: m.alphaMode ?? 'OPAQUE', alphaCutoff: m.alphaCutoff ?? 0.5,
    emissiveFactor: m.emissiveFactor ?? [0, 0, 0], emissiveTexture: textureSemantic(model, m.emissiveTexture),
    normalTexture: textureSemantic(model, m.normalTexture, 'normal'), occlusionTexture: textureSemantic(model, m.occlusionTexture, 'occlusion'),
    pbrMetallicRoughness: { baseColorFactor: p.baseColorFactor ?? [1, 1, 1, 1], metallicFactor: p.metallicFactor ?? 1, roughnessFactor: p.roughnessFactor ?? 1,
      baseColorTexture: textureSemantic(model, p.baseColorTexture), metallicRoughnessTexture: textureSemantic(model, p.metallicRoughnessTexture) } };
}

// Record source spans so the original JSON definitions remain literal source bytes.
function jsonSpans(source) {
  let at = 0;
  const spans = new Map(), whitespace = () => { while (/\s/.test(source[at] ?? '') && at < source.length) at++; };
  function string() { const begin = at++; while (at < source.length) { const c = source[at++]; if (c === '\\') at++; else if (c === '"') return JSON.parse(source.slice(begin, at)); } throw new Error('Unterminated JSON string.'); }
  function value(pointer) {
    whitespace(); const begin = at, c = source[at];
    if (c === '{') {
      at++; whitespace();
      if (source[at] !== '}') while (true) {
        assert(source[at] === '"', 'Invalid JSON property span.'); const key = string(); whitespace(); assert(source[at++] === ':', 'Invalid JSON property separator.');
        value(`${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`); whitespace();
        if (source[at] !== ',') break; at++; whitespace();
      }
      assert(source[at++] === '}', 'Invalid JSON object span.');
    } else if (c === '[') {
      at++; whitespace(); let index = 0;
      if (source[at] !== ']') while (true) { value(`${pointer}/${index++}`); whitespace(); if (source[at] !== ',') break; at++; whitespace(); }
      assert(source[at++] === ']', 'Invalid JSON array span.');
    } else if (c === '"') string();
    else { while (at < source.length && !/[\s,\]}]/.test(source[at])) at++; assert(at > begin, 'Invalid JSON scalar span.'); }
    spans.set(pointer, { begin, end: at });
  }
  value(''); whitespace(); assert(at === source.length, 'Trailing JSON data.'); return spans;
}
function patchJson(original, changes, additions) {
  const spans = jsonSpans(original), edits = [];
  for (const [pointer, value] of changes) { const span = spans.get(pointer); assert(span, `Missing original JSON field: ${pointer}`); edits.push({ ...span, text: JSON.stringify(value) }); }
  for (const [pointer, values] of additions) {
    if (!values.length) continue;
    const span = spans.get(pointer); assert(span && original[span.begin] === '[', `Missing original JSON array: ${pointer}`);
    const empty = !JSON.parse(original.slice(span.begin, span.end)).length;
    edits.push({ begin: span.end - 1, end: span.end - 1, text: (empty ? '' : ',') + values.map(v => JSON.stringify(v)).join(',') });
  }
  edits.sort((a, b) => b.begin - a.begin);
  for (let i = 1; i < edits.length; i++) assert(edits[i].end <= edits[i - 1].begin, 'Overlapping original JSON patches.');
  let result = original;
  for (const edit of edits) result = result.slice(0, edit.begin) + edit.text + result.slice(edit.end);
  return { source: result, edits };
}
function encodeGlb(source, bin) {
  const json = Buffer.from(source.trimEnd(), 'utf8'), jp = Buffer.alloc((4 - json.length % 4) % 4, 0x20), bp = Buffer.alloc((4 - bin.length % 4) % 4);
  const header = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + jp.length + bin.length + bp.length, 8);
  jh.writeUInt32LE(json.length + jp.length); jh.writeUInt32LE(0x4e4f534a, 4); bh.writeUInt32LE(bin.length + bp.length); bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jh, json, jp, bh, bin, bp]);
}

function chassisSelection(original, fixture) {
  const node = original.nodes.get('Chassis_Frame');
  assert(node, 'Original Chassis_Frame is missing.');
  const mesh = original.g.meshes[node.source.mesh];
  assert(mesh.primitives.length === 1, 'Frozen chassis must have exactly one primitive.');
  const primitive = mesh.primitives[0], { position, indices } = validatePrimitive(original, primitive);
  const frozen = fixture.measuredAsset?.chassisComponents;
  assert(frozen?.length === 9 && fixture.solver?.componentVertexKeyMetres === 1e-7 && same(node.world, identity()), 'Frozen chassis/coordinate contract changed.');
  const parent = Array.from({ length: indices.a.count / 3 }, (_, i) => i), firstAtVertex = new Map();
  function find(i) { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }
  for (let t = 0; t < parent.length; t++) for (const [i] of indices.values.slice(t * 3, t * 3 + 3)) {
    const key = position.values[i].map(n => Math.round(n / 1e-7)).join(',');
    if (firstAtVertex.has(key)) parent[find(t)] = find(firstAtVertex.get(key)); else firstAtVertex.set(key, t);
  }
  const groups = new Map();
  for (let t = 0; t < parent.length; t++) { const root = find(t); if (!groups.has(root)) groups.set(root, []); groups.get(root).push(t); }
  const componentRecords = [...groups.values()].map((triangles, index) => {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const t of triangles) for (const [i] of indices.values.slice(t * 3, t * 3 + 3)) position.values[i].forEach((n, axis) => { min[axis] = Math.min(min[axis], n); max[axis] = Math.max(max[axis], n); });
    const bounds = { min, max };
    assert(frozen[index]?.index === index && frozen[index].triangles === triangles.length && same(frozen[index].bounds, bounds), `Frozen chassis component ${index} differs in exact bounds/triangle count.`);
    const actualIndices = triangles.flatMap(t => indices.values.slice(t * 3, t * 3 + 3).map(([i]) => i));
    return { index, triangles, bounds, indicesSha256: sha(Buffer.from(JSON.stringify(actualIndices))) };
  });
  assert(componentRecords.length === 9 && componentRecords[7].triangles.length === 108 && componentRecords[8].triangles.length === 108 && frozen[7].contact === 'front' && frozen[8].contact === 'rear', 'Frozen hitch component correspondence changed.');
  const removed = new Set([...componentRecords[7].triangles, ...componentRecords[8].triangles]);
  const kept = indices.values.filter((_, i) => !removed.has(Math.floor(i / 3))).map(([i]) => i);
  assert(removed.size === 216 && kept.length === 756 * 3, 'Only exactly 216 frozen hitch triangles may be removed.');
  const raw = Buffer.alloc(kept.length * indices.size), writer = { 5121: 'writeUInt8', 5123: 'writeUInt16LE', 5125: 'writeUInt32LE' }[indices.a.componentType];
  kept.forEach((index, i) => raw[writer](index, i * indices.size));
  return { node, primitive, sourceAccessor: indices.a, componentRecords, removed, raw, kept };
}

function compose(original, hardware, fixture) {
  const rail = original.nodes.get('RailRoot'), hardwareRail = hardware.nodes.get('RailRoot');
  assert(rail && hardwareRail && same(rail.local, hardwareRail.local) && same(rail.world, hardwareRail.world), 'Hardware RailRoot must exactly equal the original local and global frame.');
  const selectedNodes = new Set();
  function include(record) {
    assert(!original.nodes.has(record.source.name), `Candidate subtree reuses original node name: ${record.source.name}`);
    assert(!selectedNodes.has(record.index), 'Candidate mount subtrees overlap.'); selectedNodes.add(record.index);
    for (const child of record.source.children ?? []) include([...hardware.nodes.values()].find(n => n.index === child));
  }
  const roots = MOUNT_NAMES.map(name => {
    const record = hardware.nodes.get(name);
    assert(record && record.parent === hardwareRail && record.source.mesh !== undefined, `Expected a direct RailRoot mount mesh: ${name}`); include(record); return record;
  });
  const selectedMeshes = [...new Set([...selectedNodes].map(i => hardware.g.nodes[i].mesh).filter(i => i !== undefined))].sort((a, b) => a - b);
  const selectedAccessors = new Set(), materialMatches = new Map();
  const allowedMaterials = ['metal', 'brass'].map(name => {
    const matches = original.g.materials.map((m, i) => ({ m, i })).filter(({ m }) => m.name === name);
    assert(matches.length === 1, `Expected one original ${name} material.`); return { index: matches[0].i, name, semantics: materialSemantic(original, matches[0].i) };
  });
  for (const index of selectedMeshes) {
    const mesh = hardware.g.meshes[index];
    assert(mesh?.primitives?.length && !mesh.weights, 'Unsupported mount mesh weights or empty primitives.');
    for (const primitive of mesh.primitives) {
      validatePrimitive(hardware, primitive);
      for (const index of [primitive.indices, ...Object.values(primitive.attributes)]) selectedAccessors.add(index);
      if (!materialMatches.has(primitive.material)) {
        const semantics = materialSemantic(hardware, primitive.material), matches = allowedMaterials.filter(m => same(m.semantics, semantics));
        assert(matches.length === 1, `Mount material ${primitive.material} must match exactly one original metal/brass material by normalized semantics and actual embedded bitmap bytes.`);
        materialMatches.set(primitive.material, { hardwareIndex: primitive.material, originalIndex: matches[0].index, originalName: matches[0].name, normalizedSemanticsSha256: sha(Buffer.from(canonical(semantics))), semantics });
      }
    }
  }
  const selectedViews = [...new Set([...selectedAccessors].map(i => hardware.g.accessors[i].bufferView))].sort((a, b) => a - b);
  for (const view of selectedViews) {
    assert(hardware.g.accessors.every((a, i) => a.bufferView !== view || selectedAccessors.has(i)) && !hardware.g.images?.some(i => i.bufferView === view), 'A mount geometry view includes nonselected accessor/image data; this bounded composer will not duplicate it.');
    const raw = viewBytes(hardware, view), ranges = [];
    for (const index of selectedAccessors) if (hardware.g.accessors[index].bufferView === view) {
      const accessor = readAccessor(hardware, index), offset = accessor.a.byteOffset ?? 0;
      for (let row = 0; row < accessor.a.count; row++) ranges.push([offset + row * accessor.stride, offset + row * accessor.stride + accessor.size * accessor.dim]);
    }
    ranges.sort((a, b) => a[0] - b[0]); let end = 0;
    for (const [begin, stop] of [...ranges, [raw.length, raw.length]]) {
      const gap = Math.max(0, begin - end);
      assert(gap <= 3 && raw.subarray(end, begin).every(n => n === 0), 'A selected geometry view contains unrelated binary bytes beyond its actual accessor data and alignment padding.');
      end = Math.max(end, stop);
    }
  }
  const added = { bufferViews: [], accessors: [], meshes: [], nodes: [] }, segments = [original.bin];
  let length = original.bin.length;
  function appendView(source, raw) {
    const pad = (4 - length % 4) % 4;
    if (pad) { segments.push(Buffer.alloc(pad)); length += pad; }
    const index = original.g.bufferViews.length + added.bufferViews.length;
    added.bufferViews.push({ ...clone(source), buffer: 0, byteOffset: length, byteLength: raw.length });
    segments.push(raw); length += raw.length; return index;
  }
  const chassis = chassisSelection(original, fixture);
  const replacementIndices = original.g.accessors.length;
  const chassisView = appendView({ target: 34963 }, chassis.raw);
  added.accessors.push({ ...clone(chassis.sourceAccessor), bufferView: chassisView, byteOffset: 0, count: chassis.kept.length });
  delete added.accessors[0].min; delete added.accessors[0].max;
  const viewMap = new Map(), accessorMap = new Map(), meshMap = new Map(), nodeMap = new Map();
  for (const index of selectedViews) viewMap.set(index, appendView(hardware.g.bufferViews[index], viewBytes(hardware, index)));
  for (const index of [...selectedAccessors].sort((a, b) => a - b)) {
    accessorMap.set(index, original.g.accessors.length + added.accessors.length);
    added.accessors.push({ ...clone(hardware.g.accessors[index]), bufferView: viewMap.get(hardware.g.accessors[index].bufferView) });
  }
  for (const index of selectedMeshes) {
    meshMap.set(index, original.g.meshes.length + added.meshes.length);
    const mesh = clone(hardware.g.meshes[index]);
    for (const primitive of mesh.primitives) {
      primitive.attributes = Object.fromEntries(Object.entries(primitive.attributes).map(([name, a]) => [name, accessorMap.get(a)]));
      primitive.indices = accessorMap.get(primitive.indices); primitive.material = materialMatches.get(primitive.material).originalIndex;
    }
    added.meshes.push(mesh);
  }
  for (const index of [...selectedNodes].sort((a, b) => a - b)) nodeMap.set(index, original.g.nodes.length + nodeMap.size);
  for (const [index] of nodeMap) {
    const node = clone(hardware.g.nodes[index]);
    if (node.mesh !== undefined) node.mesh = meshMap.get(node.mesh);
    if (node.children) node.children = node.children.map(i => nodeMap.get(i));
    added.nodes.push(node);
  }
  const patched = patchJson(original.source, [[`/buffers/0/byteLength`, length], [`/meshes/${chassis.node.source.mesh}/primitives/0/indices`, replacementIndices]],
    [[`/nodes/${rail.index}/children`, roots.map(n => nodeMap.get(n.index))], ...Object.entries(added).map(([key, values]) => [`/${key}`, values])]);
  const binary = Buffer.concat(segments), bytes = encodeGlb(patched.source, binary), output = parseGlb(bytes, 'composed');
  assert(output.bin.subarray(0, original.bin.length).equals(original.bin), 'Original BIN prefix changed.');
  const beforeSpans = jsonSpans(original.source), afterSpans = jsonSpans(output.source);
  const rawAt = (source, spans, pointer) => { const s = spans.get(pointer); assert(s, `Missing verification span: ${pointer}`); return source.slice(s.begin, s.end); };
  for (const key of ['accessors', 'bufferViews', 'materials', 'images', 'textures', 'samplers']) for (let i = 0; i < (original.g[key]?.length ?? 0); i++)
    assert(rawAt(original.source, beforeSpans, `/${key}/${i}`) === rawAt(output.source, afterSpans, `/${key}/${i}`), `Original ${key}/${i} source bytes changed.`);
  for (const node of original.nodes.values()) {
    const actual = output.nodes.get(node.source.name); assert(actual && same(node.local, actual.local) && same(node.world, actual.world), `Original frame changed: ${node.source.name}`);
    if (node.index !== rail.index) assert(rawAt(original.source, beforeSpans, `/nodes/${node.index}`) === rawAt(output.source, afterSpans, `/nodes/${node.index}`), `Original node bytes changed: ${node.source.name}`);
  }
  for (let i = 0; i < original.g.meshes.length; i++) if (i !== chassis.node.source.mesh)
    assert(rawAt(original.source, beforeSpans, `/meshes/${i}`) === rawAt(output.source, afterSpans, `/meshes/${i}`), `Original mesh definition bytes changed: ${i}`);
  for (const index of selectedNodes) {
    const expected = [...hardware.nodes.values()].find(n => n.index === index), actual = output.nodes.get(expected.source.name);
    assert(actual && same(expected.local, actual.local) && same(expected.world, actual.world), `Imported mount frame changed: ${expected.source.name}`);
  }
  return { bytes, report: { originalBinaryPrefix: { bytes: original.bin.length, sha256: sha(original.bin), identical: true },
    originalInventory: Object.fromEntries(['nodes', 'meshes', 'accessors', 'bufferViews', 'materials', 'images', 'textures', 'samplers'].map(key => [key, original.g[key]?.length ?? 0])),
    appendedInventory: Object.fromEntries(Object.entries(added).map(([key, values]) => [key, values.length])),
    appendBytes: length - original.bin.length, hardwareGeometryBytes: selectedViews.reduce((n, i) => n + hardware.g.bufferViews[i].byteLength, 0),
    removedChassisComponents: chassis.componentRecords.filter(c => [7, 8].includes(c.index)), retainedChassisComponents: chassis.componentRecords.filter(c => ![7, 8].includes(c.index)),
    chassisReplacementIndices: { originalAccessor: chassis.primitive.indices, replacementAccessor: replacementIndices, triangles: chassis.kept.length / 3, bytes: chassis.raw.length, sha256: sha(chassis.raw), preservesOriginalVertexAccessors: true },
    hardwareMapping: { node: [...nodeMap], mesh: [...meshMap], accessor: [...accessorMap], bufferView: [...viewMap], material: [...materialMatches.values()] },
    permittedJsonPatches: patched.edits.map(({ begin, end, text }) => ({ originalBegin: begin, originalEnd: end, replacementBytes: Buffer.byteLength(text) })),
    assertions: { originalBinaryPrefix: true, originalDefinitionSourceBytes: true, originalNodeLocalAndGlobalMatrices: true, importedMountLocalAndGlobalMatrices: true, frozenExactHitchRemoval: true, originalResourceReuseBySemanticsAndBitmap: true } } };
}

try {
  const args = process.argv.slice(2), options = new Map();
  for (let i = 0; i < args.length; i += 2) { assert(['--hardware', '--hardware-sha', '--output'].includes(args[i]) && args[i + 1] && !options.has(args[i]), 'Usage: node compose-car.mjs --hardware INPUT.glb --hardware-sha SHA256 --output outputs/NAME-composed.glb'); options.set(args[i], args[i + 1]); }
  assert(options.size === 3 && /^[a-f0-9]{64}$/.test(options.get('--hardware-sha') ?? ''), 'All three flags and a lowercase SHA256 are required.');
  const modulePath = fileURLToPath(import.meta.url), workspace = path.dirname(modulePath), outputPath = path.resolve(options.get('--output'));
  assert(path.dirname(outputPath) === path.join(workspace, 'outputs') && path.basename(outputPath).endsWith('-composed.glb'), 'Output must be an owned outputs/*-composed.glb path.');
  assert(!fs.existsSync(outputPath) && !fs.existsSync(outputPath.replace(/\.glb$/, '.json')), 'Output already exists; choose a fresh composed name to preserve evidence.');
  const hardwarePath = path.resolve(options.get('--hardware')), inputPaths = { original: ORIGINAL, fixture: FIXTURE, hardware: hardwarePath }, inputBytes = Object.fromEntries(Object.entries(inputPaths).map(([key, p]) => [key, fs.readFileSync(p)]));
  const hashes = Object.fromEntries(Object.entries(inputBytes).map(([key, bytes]) => [key, sha(bytes)]));
  assert(hashes.original === ORIGINAL_SHA && hashes.fixture === FIXTURE_SHA && hashes.hardware === options.get('--hardware-sha'), 'A frozen original/fixture or explicitly pinned hardware input hash differs.');
  const result = compose(parseGlb(inputBytes.original, 'original'), parseGlb(inputBytes.hardware, 'hardware'), JSON.parse(inputBytes.fixture));
  const report = { schemaVersion: 1, verdict: 'preserve-original-bytes-with-exact-hitch-removal', compositionCompleted: true,
    scope: 'Immutable original geometry retention and bounded mount composition only; no finite collision, continuous, native/original, production, GPU or human acceptance.',
    execution: { host: os.hostname(), platform: process.platform, architecture: process.arch, node: process.version, timeUtc: new Date().toISOString(), argv: process.argv, modulePath, moduleSha256: sha(fs.readFileSync(modulePath)) },
    inputs: Object.fromEntries(Object.entries(inputPaths).map(([key, p]) => [key, { path: p, sha256: hashes[key], bytes: inputBytes[key].length }])),
    output: { path: outputPath, sha256: sha(result.bytes), bytes: result.bytes.length }, ...result.report,
    limitations: ['The known baseline carrier interference remains unqualified.', 'No old triangle/attribute drift is accepted; all old vertex attributes and original BIN bytes are retained.', 'The removed old hitch indices remain in the preserved original BIN but are no longer referenced by any active primitive.', 'Only two named mount subtrees and their required geometry views are imported; extension, skin, morph and animation composition is unsupported.'] };
  fs.writeFileSync(outputPath, result.bytes, { flag: 'wx' });
  fs.writeFileSync(outputPath.replace(/\.glb$/, '.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ event: 'composition-completed', output: report.output, assertions: report.assertions, appendedInventory: report.appendedInventory, appendBytes: report.appendBytes }));
} catch (error) {
  console.error(JSON.stringify({ event: 'composition-rejected', message: error.message })); process.exitCode = 1;
}
