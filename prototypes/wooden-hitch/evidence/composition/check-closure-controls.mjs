import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), workspace = path.resolve(here, '../../..');
const verifier = path.join(workspace, 'evidence/composition/verify-composition.mjs');
const frozenVerifier = path.join(here, 'previous-verifier.mjs');
const accepted = path.join(workspace, 'outputs/wooden-car-routed-composed.glb');
const acceptedSha = '7b6ae0f47746d4e8bd624ad2323f7cd20abec214711cbfb4e89329adc687202e';
const previousVerifierSha = '99873f1dd311aa8fb771819da643828277ed7b988c4d4d0646ec788d6c65f845';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const assert = (c, m) => { if (!c) throw new Error(m); };
const write = (p, data) => fs.writeFileSync(p, data, { flag: 'wx' });
const [phase, expectedNewSha] = process.argv.slice(2);
assert(['--old', '--new'].includes(phase), 'Use --old before replacing the verifier, then --new NEW_VERIFIER_SHA.');
const bytes = fs.readFileSync(accepted), jl = bytes.readUInt32LE(12), source = bytes.subarray(20, 20 + jl).toString(), bin = bytes.subarray(28 + jl);
assert(sha(bytes) === acceptedSha, 'Accepted routed model hash changed.');

function appendArrayEntry(key, entry) {
  const match = new RegExp(`"${key}"\\s*:\\s*\\[`).exec(source);
  assert(match, `Missing source ${key} array.`);
  const begin = match.index + match[0].length - 1;
  let depth = 0, quoted = false, escaped = false;
  for (let at = begin; at < source.length; at++) {
    const c = source[at];
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue; }
    if (c === '"') quoted = true;
    else if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') {
      depth--; if (depth === 0) return source.slice(0, at) + ',' + JSON.stringify(entry) + source.slice(at);
    }
  }
  throw new Error('Unterminated source array.');
}
function encode(jsonText) {
  const json = Buffer.from(jsonText.trimEnd()), padding = Buffer.alloc((4 - json.length % 4) % 4, 0x20), header = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + padding.length + bin.length, 8);
  jh.writeUInt32LE(json.length + padding.length); jh.writeUInt32LE(0x4e4f534a, 4); bh.writeUInt32LE(bin.length); bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jh, json, padding, bh, bin]);
}
const stepRecords = [];
function execute(name, module, input, expectedExit) {
  const reportPath = path.join(here, `${name}-${phase.slice(2)}-verifier.json`), command = [process.execPath, module, input, reportPath];
  const run = spawnSync(command[0], command.slice(1), { cwd: workspace, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const stdoutPath = path.join(here, `${name}-${phase.slice(2)}.stdout`), stderrPath = path.join(here, `${name}-${phase.slice(2)}.stderr`);
  write(stdoutPath, run.stdout ?? ''); write(stderrPath, run.stderr ?? run.error?.message ?? '');
  const record = { name, command, cwd: workspace, verifierSha256: sha(fs.readFileSync(module)), input: { path: input, sha256: sha(fs.readFileSync(input)), bytes: fs.statSync(input).size },
    exitCode: run.status, signal: run.signal, stdout: { path: stdoutPath, sha256: sha(fs.readFileSync(stdoutPath)) }, stderr: { path: stderrPath, sha256: sha(fs.readFileSync(stderrPath)) },
    report: fs.existsSync(reportPath) ? { path: reportPath, sha256: sha(fs.readFileSync(reportPath)) } : null };
  stepRecords.push(record);
  assert(run.status === expectedExit, `${name}: expected exit ${expectedExit}, observed ${run.status}.`);
  if (expectedExit === 0) {
    const result = JSON.parse(fs.readFileSync(reportPath));
    assert(result.verificationCompleted && result.assertions.onlyRequiredAppendedBinaryData, `${name}: previous verifier did not assert successful appended-data validation.`);
    if (phase === '--new') assert(result.assertions.exactAppendedMeshAccessorDependencyClosure, 'Repaired positive result lacks the new exact closure assertion.');
  } else {
    const reason = name === 'duplicate-mesh' ? 'Unexpected appended mesh dependency inventory.' : 'Unexpected appended accessor dependency inventory.';
    assert((run.stderr ?? '').includes(reason) && !fs.existsSync(reportPath), `${name}: repaired rejection did not identify the exact dependency gap.`);
  }
  console.log(JSON.stringify({ event: name, phase, exitCode: run.status, inputSha256: record.input.sha256, reportPath: record.report?.path ?? null }));
}

try {
  if (phase === '--old') {
    assert(sha(fs.readFileSync(verifier)) === previousVerifierSha, 'Previous verifier is not the executed frozen source.');
    fs.copyFileSync(verifier, frozenVerifier, fs.constants.COPYFILE_EXCL);
    for (const name of ['wooden-car-routed-composed-independent.json', 'wooden-car-baseline-composed-independent.json', 'wooden-car-routed-composed-run.json', 'wooden-car-baseline-composed-run.json'])
      fs.copyFileSync(path.join(workspace, 'evidence/composition', name), path.join(here, `previous-${name}`), fs.constants.COPYFILE_EXCL);
    const g = JSON.parse(source), originalSidecar = JSON.parse(fs.readFileSync(accepted.replace(/\.glb$/, '.json')));
    const controls = [{ name: 'duplicate-mesh', key: 'meshes', entry: g.meshes.at(-1) }, { name: 'duplicate-accessor', key: 'accessors', entry: g.accessors.at(-1) }];
    const provenance = [];
    for (const control of controls) {
      const altered = encode(appendArrayEntry(control.key, control.entry)), input = path.join(here, `${control.name}-composed.glb`), sidecar = structuredClone(originalSidecar);
      sidecar.output = { path: input, sha256: sha(altered), bytes: altered.length };
      sidecar.syntheticControl = { kind: control.name, sourceModel: { path: accepted, sha256: acceptedSha }, appendedArray: control.key, appendedIndex: g[control.key].length, reuseExistingView: control.key === 'accessors' };
      write(input, altered); write(input.replace(/\.glb$/, '.json'), JSON.stringify(sidecar, null, 2) + '\n');
      provenance.push({ name: control.name, output: sidecar.output, sidecarSha256: sha(fs.readFileSync(input.replace(/\.glb$/, '.json'))), controlledDifference: sidecar.syntheticControl });
      execute(control.name, frozenVerifier, input, 0);
    }
    write(path.join(here, 'controls-provenance.json'), JSON.stringify({ source: { path: accepted, sha256: acceptedSha }, previousVerifier: { path: frozenVerifier, sha256: previousVerifierSha }, controls: provenance }, null, 2) + '\n');
  } else {
    assert(sha(fs.readFileSync(frozenVerifier)) === previousVerifierSha && /^[a-f0-9]{64}$/.test(expectedNewSha ?? '') && sha(fs.readFileSync(verifier)) === expectedNewSha, 'Frozen old/current new verifier hash differs.');
    for (const name of ['duplicate-mesh', 'duplicate-accessor']) execute(name, verifier, path.join(here, `${name}-composed.glb`), 1);
    execute('routed-positive', verifier, accepted, 0);
  }
  assert(sha(fs.readFileSync(accepted)) === acceptedSha, 'Accepted routed model bytes changed during controls.');
  const result = { schemaVersion: 1, verdict: phase === '--old' ? 'red-confirmed-previous-verifier-false-accepts-unused-duplicates' : 'green-confirmed-exact-closure-rejects-duplicates-and-preserves-positive', phase,
    host: os.hostname(), node: process.version, argv: process.argv, timeUtc: new Date().toISOString(), controlsRunnerSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))), acceptedModelUnchanged: { path: accepted, sha256: acceptedSha }, steps: stepRecords };
  write(path.join(here, `${phase.slice(2)}-execution.json`), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ event: 'closure-controls-completed', verdict: result.verdict, steps: stepRecords.length, acceptedModelSha256: acceptedSha }));
} catch (error) {
  write(path.join(here, `${phase.slice(2)}-failure.json`), JSON.stringify({ error: error.message, steps: stepRecords }, null, 2) + '\n');
  console.error(error.message); process.exitCode = 1;
}
