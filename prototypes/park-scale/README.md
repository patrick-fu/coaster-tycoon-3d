# Park-scale workload experiment

A disposable, independently authored MIT experiment for
[Validate the proposed simulation and rendering budgets](https://github.com/patrick-fu/coaster-tycoon-3d/issues/8).
It measures the accepted TypeScript-worker / Three.js separation using real
synthetic state transitions, not the construction prototype's ambient crowd.
It remains outside main on `p/patrick/experiment/park-scale`.

## Question and workload

Can the worker keep a 40 Hz synthetic simulation cadence at two proposed
original-oriented workload tiers, and which snapshot/routing mechanism causes
material overhead? These fixture sizes are measurement recipes, not accepted
guest caps or proof that original parks naturally reach these populations.
See the [original-scale source research](../../docs/research/original-rct2-scale.md).

| Recipe | Ordinary | Large |
|---|---:|---:|
| Technical map side | 128 | 256 |
| Guests | 2,000 | 5,000 |
| Staff | 50 | 200 |
| Coaster / shop instances | 20 / 20 | 100 / 100 |
| Shared ride slots | 40 | 200 |
| Visual car entities | 360 | 1,800 |
| Total guests + staff + cars | 2,410 | 7,000 |
| Path graph nodes | 400 | 1,600 |
| Synthetic tile records | 69,176 | 83,336 |

The fixture uses a seeded rectangular junction graph with clustered entrance
starts and dispersed destinations. Guests find routes through graph edges,
join bounded FIFO queues, board in batches, pay from pocket cash, finish rides,
choose shops when hungry and purchase food. Staff route to breakdown calls and
complete simplified service. Four scheduled path/queue edits invalidate route
fields, interrupt walking routes and release queue membership. Wage events and
construction/refund accounting conserve total money including expenses.

These mechanics are workload proxies authored for the experiment. Movement
speed, routing, desires, capacity, train dispatch, wages and breakdowns are
not original RCT2 formulas. Cars move around procedural loops and are not
linked seat-level vehicle physics. Shops are destination/accounting instances;
the renderer only draws guest/staff/car boxes, path-node tiles and edges,
coaster rings and ground. Cars integrate proxy loop coordinates each tick,
without forces, blocks or seat-level physical motion. It does not draw complete production buildings, track,
scenery, shadows or the Classic game UI. This is a deliberately light rendering
workload and an incomplete simulation, so capacity results are a lower bound
on the required production work, not a full game pass.

The 65,536 initial surface records and additional element records are allocated
as **synthetic 32-byte records** and included in the full-clone snapshot. They
are not legacy storage structures, populated production tile geometry or
max-density map fixtures. No guest arrival guard, allocator saturation or
255-instance boundary gameplay is qualified by these nominally in-range tiers.

## Comparisons and protocol

Six variants hold the seed, transition rules, edit schedule and tick count
constant:

1. Simulation only, cached BFS destination fields, no snapshots or renderer.
2. Simulation only, uncached BFS fields. This isolates route-cache value.
3. Real-time simulation plus packed cloned messages, with rendering off.
4. Real-time simulation plus rendering, full worker state cloned at 10 Hz.
5. Real-time simulation plus rendering, packed position projection cloned at 10 Hz.
6. Real-time simulation plus rendering, the same packed projection transferred
   at 10 Hz, with six reusable buffers returned by the main thread. Any buffer
   drop or missing snapshot fails the run.

The full-vs-packed comparison changes payload content as well as representation;
the packed-clone-vs-packed-transfer comparison holds content constant. This is
not a claim that transfer alone accounts for full-state-clone savings. The
message-only and packed-clone variants differ only in rendering/presentation,
including its geometry/camera work, so they provide the paired real-time control.
Packing
currently includes a main-thread copy before recycling, and that work is part
of observed cadence and arrival behavior. No SharedArrayBuffer or Wasm is used.

Each variant runs three times for each tier. The first 240 ticks warm the
runtime. The next 1,200 ticks represent 30 simulated seconds at 40 Hz, including
path edits at ticks 400, 600, 1,200 and 1,400. Simulation-only runs advance as
fast as possible; combined runs use a wall-clock scheduler. Therefore offline
throughput and combined normal-cadence observations are reported separately.
Tick p50/p95/p99/max, snapshot construction/posting, main-thread arrival latency,
current backlog, step-entry lateness, deadline misses, frame intervals, decode,
instance upload, render submission and buffer drops are reported. An empty
series reports null, not a false zero. Cold-start steps and individual edit and
save/restore ticks are retained separately from steady-state quantiles. Walking,
queuing and riding counts are sampled every 40 ticks, so each tier's measured
state mix is visible rather than assumed equal. The loopback page uses Chrome's
ordinary non-isolated timer precision; sub-millisecond values are quantized.
Arrival latency includes packing/serialization and event-loop delay.
Frame intervals include renderer scheduling; they are not GPU-only timings.
Snapshot-to-render-submission latency includes decoding and waiting for a frame,
but ends at CPU submission, not confirmed screen presentation. Overlapping
stages must not be added as if they were disjoint. Step-entry lateness is relative
to the scheduled start of each step; a deadline miss means the step plus its
snapshot finishes more than one 25 ms period after that scheduled start.

The camera switches from overview to a crowded near view at tick 800, with
separate frame distributions. The edited bridge is visibly removed/restored
from worker metadata. At tick 960, every variant structured-clones a saved park
and restores it; its latency and derived-cache rebuild appear in event/max data.
This does not test production persistent storage or human input latency.

Every run checks its completed tick, money conservation, guest count, boarding,
purchases and edit execution. Final dynamic-state hashes must match across
routing and rendering variants. Separate invariants check queue membership,
money, continuation after structured-cloned saving, cached/uncached behavioral
equivalence and occupied-queue release/cache invalidation. Only derived BFS
search counters are excluded from continuation equality, because saved state
does not preserve the derived route cache.

The browser uses fresh contexts within one Chrome process. Process RSS samples
are summed over that owned Chrome process tree before/during/after each run;
shared pages can be double-counted and Chromium retains allocations across
contexts. These are observations, not exact process-unique memory or a leak
qualification. Main-thread `performance.memory` samples are separately labelled
and do not claim worker heap coverage. This short run cannot establish long
session memory stability. Browser and renderer identities are recorded.

## Remote execution only

Do not build, test or execute the browser on Patrick's Mac. On the designated
Grok Bot Linux host, install the pinned lock or reuse its matching dependency
installation, then run:

```sh
npm ci
npm run build
./node_modules/.bin/tsc --ignoreConfig src/simulation.ts --target ES2022 \
  --module NodeNext --moduleResolution NodeNext --skipLibCheck --outDir .check
node invariants.mjs
npm run preview
# In another remote shell:
REPEATS=3 node run.mjs
```

`EXPERIMENT_URL`, `EVIDENCE_DIR`, `REPEATS` and `TICKS` are optional runner
settings. The fixed validation currently expects the four edits, so keep
`TICKS=1440` or longer. The runner uses installed system Chrome and
`playwright-core`, without downloading a browser. The experiment route is
`/prototype/park-scale/`, served on loopback port 4174. This temporary service
is stopped after evidence capture; the separate Classic preview stays online.

Three.js attribution is retained in `public/THIRD_PARTY_NOTICES.txt`. The worker
uses ordinary [postMessage clone/transfer semantics](https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage),
and repeated render objects use [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html).
No commercial game assets or OpenRCT2 implementation code are bundled.

## Qualification boundary

Grok Bot is an eight-vCPU Xeon virtual Linux host with 16 GB RAM and no exposed
hardware GPU. Chrome uses SwiftShader. Its CPU and software-renderer observations
cannot accept or reject the agreed 1080p integrated-GPU 60 FPS aim / 30 FPS floor.
That hardware qualification remains outstanding, as do complete game rules,
production rendering, maximum-density map cases and long-duration memory tests.
The issue remains open until Patrick discusses the evidence and decides the
next qualification/development gate.
