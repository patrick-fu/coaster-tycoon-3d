# Run an independent client-side simulation with separate rendering

Patrick accepted the browser architecture on 2026-10-03: a self-contained
single-player client using an independently authored TypeScript simulation in
a Web Worker and Three.js for 3D presentation. The worker owns authoritative
park state and advances fixed simulation steps; rendering presents that state
independently of frame rate. This separates simulation work from interface
interaction while keeping the first implementation straightforward to iterate.

Persist the project-owned, versioned park state locally in the browser, with
file export/import and enough state to continue the same simulation. The first
version requires neither an account nor a game server. Dependency versions and
notices must be recorded under the independent MIT source strategy.

Original-scale capacity and the accepted frame-rate/time-cadence targets remain
unmeasured. Validate simulation-only and combined workloads remotely before
acceptance; consider moving bounded, independently authored computation to Wasm
only when profiling identifies a material bottleneck. This decision selects an
architecture, not a claim of determinism, fidelity or achieved performance.

On 2026-10-05 Patrick chose to continue after reviewing the bounded
[remote CPU/software-renderer experiment](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a582a33/prototypes/park-scale/REPORT.md).
Representative real integrated-GPU testing is deferred to a mandatory
first-playable acceptance gate, rather than blocking development preparation.
The original-scale goals, 16 GB desktop, 1080p 60 FPS aim / 30 FPS floor and
normal simulation cadence remain unchanged. The experiment does not qualify
complete game capacity, exact original rules or hardware frame rate. Begin
presentation with bounded projected messages; add transfer ownership or Wasm
only when production profiling demonstrates a worthwhile benefit.
