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
