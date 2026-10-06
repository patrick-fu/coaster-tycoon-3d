# Classic browser integration

The browser caller now uses the authoritative engine in a module Worker. A
fixed-rate worker clock retains missed tick debt and drains bounded batches;
pause discards paused wall time. Changing render frame rate does not change the
simulation rules. Normal, 2× and 4× controls alter tick accumulation.

The independently authored steel candidate includes straight/station, left/right
curves, lift/drop transitions, brakes and banking transitions. Copper Meadows
starts with a closed loop containing a lift and drop, four measured cars, real
paths/queue, three services, amenities and two employees. It requires no original
game data. Geometry, rates and motion remain candidate metadata; excitement,
intensity/nausea rating formulas and exact original catalogue comparisons are
not yet qualified.

Classic controls use a horizontal command desk and bottom palette. Construction
quotes come from the worker; clicks execute a fresh quoted command and surface
errors. Track editing uses the actual selected endpoint. Ride/facility inspection
exposes pricing and operation, guests expose needs/pocket spending, and staff
inspection exposes real jobs plus patrol selection. Land/water, loan, park
opening, speed/pause and camera controls use the same integrated park.

Rendering reads copied bounded projections, not whole snapshots every frame.
Views cover at most 64×64 tiles with at most 8,192 visible static construction
records (explicit truncation). Shared entity projections are packed arrays, and
vehicle poses come from the actual measured course. Individual inspection is
an explicit request. The current caller covers the starter world; full-map camera
windowing, dense-layer truncation UX and large-map presentation remain pending.

IndexedDB stores the current versioned park. Export/import uses portable JSON;
failed imports preserve the live park and display their error. New park requires
a player confirmation. Saves are local to this browser and origin; the preview
server is a static-file service without a game backend.

## Executed verification

Grok Bot Linux compiled and passed 96 source tests, including candidate starter
operation, bounded projection/copy isolation and fixed-clock debt/pause/speed.
Headless Chrome 154 using SwiftShader passed 13 actual Classic browser scenarios:
rendering, pause, speed, pointer path placement/payment, duplicate-placement
rejection, new coaster/track/removal refund, loans, facility price/opening, real
staff picking, patrol painting, IndexedDB save/file import, malformed file
recovery and worker guest arrivals. No page exceptions were recorded.

The first test harness used accelerated virtual time and could expire a main
thread timeout before asynchronous worker messages arrived. The corrected
remote test server provides real network timing barriers; the game clock and
production worker code are unchanged by that harness correction. The headless
harness explicitly renders before projection-based pointer actions. Test-only
check.html/browser-check.js are removed from the distribution after validation.

Three repeats each of synthetic 2,000/5,000 guest candidate workloads ran the
production engine for 600 ticks after warmup. At 5,000 guests, per-tick p95 was
9.63–11.13 ms, bounded dynamic-view p95 1.83–2.70 ms, process RSS peak up to
292 MB, and the entity packet 240,096 bytes. These are crowded starter-graph
CPU results, with two staff/four cars and no renderer. They are not organic
demand, representative multi-ride scale, soak or integrated-GPU qualification.

Build/test only on the designated Linux host:

```sh
npm ci
npm test
npm run build:web
```

The web build copies pinned Three.js modules plus the complete license. All
visible geometry is project-authored. See third-party notices and fidelity gaps.
