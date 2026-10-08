import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url), validatorPath = '/workspace/coaster-detailed-assets/checks/node_modules/gltf-validator/index.js', validator = require(validatorPath);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const script = fileURLToPath(import.meta.url), evidence = path.dirname(script), workspace = path.resolve(evidence, '../..');
const args = process.argv.slice(2), outputAt = args.indexOf('--output'), output = outputAt >= 0 ? path.resolve(args[outputAt + 1]) : '';
if (!output.endsWith('-composed.glb')) throw new Error('Expected composer flags including an owned *-composed.glb output.');
const stem = path.basename(output, '.glb'), runPath = path.join(evidence, `${stem}-run.json`);
if (fs.existsSync(runPath)) throw new Error('This evidence name already exists; use a fresh output name.');
const report = { schemaVersion: 1, verdict: 'unavailable', execution: { host: os.hostname(), platform: process.platform, architecture: process.arch, node: process.version, timeUtc: new Date().toISOString(), argv: process.argv, runnerSha256: sha(fs.readFileSync(script)) }, steps: [], scope: 'Composition preservation and GLB structure only; no 59-pose rerun or collision acceptance.' };
function commandStep(name, command, commandArgs) {
  const start = new Date().toISOString(), result = spawnSync(command, commandArgs, { cwd: workspace, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const stdoutPath = path.join(evidence, `${stem}-${name}.stdout`), stderrPath = path.join(evidence, `${stem}-${name}.stderr`);
  fs.writeFileSync(stdoutPath, result.stdout ?? '', { flag: 'wx' }); fs.writeFileSync(stderrPath, result.stderr ?? result.error?.message ?? '', { flag: 'wx' });
  const step = { name, command: [command, ...commandArgs], cwd: workspace, startUtc: start, completedUtc: new Date().toISOString(), exitCode: result.status, signal: result.signal, stdout: { path: stdoutPath, sha256: sha(fs.readFileSync(stdoutPath)) }, stderr: { path: stderrPath, sha256: sha(fs.readFileSync(stderrPath)) }, error: result.error?.message ?? null };
  report.steps.push(step); console.log(JSON.stringify({ event: name, exitCode: step.exitCode, signal: step.signal }));
  if (result.status !== 0) throw new Error(`${name} did not complete successfully.`);
}
try {
  commandStep('compose', process.execPath, [path.join(workspace, 'compose-car.mjs'), ...args]);
  const bytes = fs.readFileSync(output), composition = JSON.parse(fs.readFileSync(output.replace(/\.glb$/, '.json')));
  report.inputs = composition.inputs; report.output = { path: output, sha256: sha(bytes), bytes: bytes.length }; report.composerSha256 = composition.execution.moduleSha256;
  const start = new Date().toISOString(), validation = await validator.validateBytes(new Uint8Array(bytes), { uri: path.basename(output), maxIssues: 1000 });
  const structuralPath = path.join(evidence, `${stem}-structural.json`), stdoutPath = path.join(evidence, `${stem}-structural.stdout`), stderrPath = path.join(evidence, `${stem}-structural.stderr`);
  fs.writeFileSync(structuralPath, JSON.stringify(validation, null, 2) + '\n', { flag: 'wx' });
  const summary = { errors: validation.issues.numErrors, warnings: validation.issues.numWarnings, infos: validation.issues.numInfos, hints: validation.issues.numHints, truncated: validation.issues.truncated, messages: validation.issues.messages.map(m => ({ code: m.code, severity: m.severity, pointer: m.pointer })) };
  fs.writeFileSync(stdoutPath, JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' }); fs.writeFileSync(stderrPath, '', { flag: 'wx' });
  const exitCode = validation.issues.numErrors || validation.issues.truncated ? 1 : 0;
  report.steps.push({ name: 'structural', command: [process.execPath, script, 'gltf-validator.validateBytes', output, '--maxIssues=1000'], libraryPath: validatorPath, librarySha256: sha(fs.readFileSync(validatorPath)), cwd: workspace, startUtc: start, completedUtc: new Date().toISOString(), exitCode, stdout: { path: stdoutPath, sha256: sha(fs.readFileSync(stdoutPath)) }, stderr: { path: stderrPath, sha256: sha(fs.readFileSync(stderrPath)) }, reportPath: structuralPath, reportSha256: sha(fs.readFileSync(structuralPath)), summary });
  console.log(JSON.stringify({ event: 'structural', exitCode, ...summary }));
  if (exitCode) throw new Error('GLB structural validation failed.');
  commandStep('independent', process.execPath, [path.join(evidence, 'verify-composition.mjs'), output, path.join(evidence, `${stem}-independent.json`)]);
  report.verdict = 'preserve-exact-original-with-bounded-mount-composition'; report.verificationCompleted = true;
} catch (error) { report.error = error.message; report.verificationCompleted = false; process.exitCode = 1; console.error(JSON.stringify({ event: 'composition-check-rejected', message: error.message })); }
report.completedUtc = new Date().toISOString();
fs.writeFileSync(runPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ event: 'composition-check-completed', verdict: report.verdict, reportPath: runPath, output: report.output ?? null }));
