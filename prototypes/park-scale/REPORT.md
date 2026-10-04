# Synthetic worker and presentation experiment results

Executed on 2026-10-05. **CPU/message evidence is available; original-scale game
capacity and the integrated-GPU target are not qualified.** Patrick's next
decision is the timing of the real-hardware gate, not a silent reduction of the
accepted park scale or frame-rate goals.

## Reproducible evidence

- Runtime source: [e50ad70](https://github.com/patrick-fu/coaster-tycoon-3d/commit/e50ad704766356f35225c5d3d99fe4ac6e128ee0).
  All 11 runtime/configuration/verification file hashes matched the remote copy.
- Debian 13, eight virtual Xeon CPU cores, 16 GB RAM, no exposed hardware GPU.
  Other bots were present; this was not an isolated hardware lab.
- Node 20.19.2, npm 9.2.0, Chrome 154.0.8037.57; pinned Three.js 0.186.0,
  TypeScript 7.0.2, Vite 8.3.2 and Playwright Core 1.63.0.
- Production TypeScript/Vite build passed. Vite retains a 538.95 kB raw /
  135.47 kB gzip JavaScript chunk warning; it was not suppressed.
- Seven remote invariant/regression checks passed. **36 measurements** completed:
  two tiers × six variants × three repetitions, each with 240 warm-up ticks
  and 1,200 measured ticks. All runs kept money consistent, executed edits,
  boarding and purchases, and completed 1,440 ticks without page errors.
- Each tier's final dynamic-state hash matched across every variant/repetition:
  ordinary `1530625783`, large `3001532936`. Full continuation equality was
  independently checked, excluding only derived BFS search-work counters.
- Every real-time run received all 360 scheduled snapshots; no transfer buffer
  drop occurred. Timings include a save/restore event and route-cache invalidation.

See the [protocol and workload boundary](README.md), [review disposition](REVIEW.md),
[complete per-run records](results/results.json), [summary](results/summary.json),
and retained fixture captures [ordinary](results/ordinary.png) /
[large](results/large.png). Records contain per-run quantile summaries, event
samples and state-mix observations; they do not retain every individual timing
sample or claim a long-session memory pass.

## CPU and routing observations

Each range below is the minimum-to-maximum of the three **per-run p95s**, not a
pooled percentile. Ordinary means 2,000 guests / 400 path nodes / 2,410 total
guest-staff-car proxies; large means 5,000 / 1,600 / 7,000. The two tiers have
different measured state mixes: 1,293–1,633 ordinary guests and 4,550–4,822 large
guests were walking in post-warm-up samples. These are initialized synthetic
populations, not observed original parks or accepted guest caps.

| Variant | Ordinary step p95, ms | Large step p95, ms |
|---|---:|---:|
| Offline simulation, cached routing | 0.2 | 0.5–0.6 |
| Offline simulation, uncached routing | 4.9–5.0 | 71.8–78.5 |
| Real-time packed messages, rendering off | 0.2 | 0.7 |
| Real-time full clone + software rendering | 0.2 | 0.7 |
| Real-time packed clone + software rendering | 0.2 | 0.6–0.7 |
| Real-time packed transfer + software rendering | 0.2 | 0.7–0.8 |

The cached/uncached arms produce the same behavior in this fixture. Rebuilding
an entire BFS field for each request is substantially more expensive. The large
uncached p95 exceeds a 25 ms step budget, while cached steady steps are well
below it. **Inference:** preserve opportunities to reuse validated topology and
route work, and invalidate it correctly after edits. This does not select BFS
as production guest AI, compare every route algorithm, or prove a full dense
256×256 path graph can run at the target rate.

The paired message-only and packed-clone real-time arms show low steady worker
cost even with software rendering. Offline wall durations include chunk-yield
timers and must not be compared with scheduled real-time wall durations as if
both measured maximum throughput. Sub-millisecond results use quantized
non-isolated Chrome timers, so fine differences should not be overinterpreted.

## Snapshot observations

| Worker projection/build/post p95 | Ordinary, ms | Large, ms |
|---|---:|---:|
| Full state cloned | 5.1–5.5 | 9.1 |
| Packed positions cloned | 0.3–0.4 | 0.5–0.6 |
| Packed positions transferred/recycled | 0.3 | 0.4–0.5 |

The full payload includes static synthetic tile records, topology and guest
objects. Projection removes unnecessary render payload: it is a different
payload design, not a transfer-only improvement. Large full-clone arrival p95
was 12.3–14.1 ms versus 0.7–1.0 ms for packed clone. Arrival overlaps worker
packing/serialization and must not be added again to that worker cost.

Packed transfer has only a small advantage in worker posting at this timer
resolution, still copies on the main thread before returning a buffer, and
does not establish an improved software frame rate. **Recommendation:** begin
production presentation with bounded projected messages using ordinary cloning;
add transfer/recycling only if target-device profiling justifies its ownership
and backpressure complexity. Do not repeatedly broadcast the entire park state
for drawing. Neither this recommendation nor the experiment authorizes reuse
of the disposable simulation as production game rules.

## Peaks, cadence and memory

All real-time measured windows finished near the intended 30 seconds
(29,998–30,006 ms, rounded). That does not mean every step met its deadline.
Ordinary runs had no measured deadline miss. Across the 12 large real-time runs,
15 step completions exceeded one 25 ms period after their scheduled start:
message-only 4, full clone 4, packed clone 5, transfer 2. Individual save/restore
steps reached 35.4 ms; large uncached steps reached 156.7 ms. The maximum observed
post-batch backlog in large real-time runs was one tick, with entry lateness
retained separately. These results establish recovery in the short fixture,
not a guarantee of uninterrupted normal cadence.

**Remaining risk:** whole-state capture/restore and derived-cache rebuild need
production-specific profiling, clear pause/load semantics and controlled peak
cost. A low steady p95 cannot hide save or construction peaks. No speculative
Wasm migration or new save subsystem was added just to improve this toy result.

The highest sampled sum of Chrome process RSS was about 1.12 GiB. This sum can
double-count shared pages, includes the software GPU process and may retain
allocations across contexts. Main-thread heap samples do not cover the worker.
There was no memory-growth qualification or 30-minute soak, and these values
are not a production memory ceiling.

## Rendering and hardware gate

Renderer identities confirm ANGLE/SwiftShader. Software frame p95s were about
100 ms at ordinary load and 233–267 ms at large load; overview and near-camera
distributions are recorded separately. These results fail a 30 FPS floor **on
this software renderer**, while saying nothing decisive about the accepted
integrated-GPU target. GPU-only completion time was not measured; render
submission and latest-snapshot-to-submission latency are distinct observations.

The renderer uses boxes, path edges and coaster rings rather than production
track/scenery/buildings/shadows/Classic UI. The simulation omits complete vehicle
physics, original guest decisions, queue geometry, ratings and management rules.
Nominal legacy envelopes, mock record payloads and reduced route graphs must
not be described as full original-scale qualification. Maximum allocation,
legal train configurations, full production behavior, long-duration stability
and a named 16 GB integrated-GPU device remain unvalidated.

## Next decision

Keep the accepted independent TypeScript-worker / Three.js architecture, original
scale direction and 1080p 60 FPS aim / 30 FPS floor unchanged. The evidence
supports preparing a bounded projected presentation and invalidatable route
work; it does not force an architecture replacement or justify lowering scope.

**Recommended gate:** allow implementation preparation/development to proceed
with representative integrated-GPU validation explicitly required before a
first-playable acceptance claim. Alternatively, require matching remote hardware
and complete that qualification before development begins. Patrick must choose
the gate; the performance ticket stays OPEN pending that choice.

The [acceptance proposal](ACCEPTANCE-PROPOSAL.md) is prepared for the subsequent
integrated contract discussion. It remains unaccepted and its ticket remains
blocked by the performance decision. No production game code or prototype was
merged into main by this experiment.

## Resource cleanup

Removed the discontinued native-core experiment's clean worktrees after verifying
its source commit was pushed: about 136 MiB on external storage. Historical
source pools and 184 KiB of decisive native evidence remain. Removed the
construction prototype's 94 MiB npm download cache while retaining the live
Classic application and its shared pinned dependency installation.

Superseded/interrupted benchmark processes and their owned temporary Chrome
profiles were stopped and deleted. Incomplete measurements were discarded;
none are used above. The audited external-review stream was reduced to retained
result/exit/audit evidence. After the successful run, stopped loopback performance
port 4174, removed its generated `.check`/`dist` outputs and verified that its
36 per-run files were duplicates of the retained combined result before removal.
The Classic preview on its separate service still returns HTTP 200. Future
reruns rebuild from the committed source and lock; no Mac build/test was run.
