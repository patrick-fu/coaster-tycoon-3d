# Classic browser integration

The [public development preview](https://patrick-fu.github.io/coaster-tycoon-3d/)
is served from the remotely built `gh-pages` static distribution. Its `build.json`
identifies the source, pinned tools and selected artifact hashes. Grok Bot Chrome
for Testing, reusing the default profile, loaded the HTTPS page at 1080p/DPR1,
rendered 43 starter elements and observed worker ticks/guest arrivals without
page exceptions. The downloaded `game.js` hash matched the remote build. This
confirms direct entry and relative module/Worker loading, not GPU qualification.
The repaired deployment was checked again with client cache disabled: all five
named runtime module hashes matched source `5ae0957`, and a malformed Worker
envelope returned `INVALID_COMMAND` before a subsequent valid save succeeded.

The browser caller now uses the authoritative engine in a module Worker. A
fixed-rate worker clock retains missed tick debt and drains bounded batches;
pause retains existing debt without advancing it and excludes paused wall time. Changing render frame rate does not change the
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

Grok Bot Linux compiled and passed 100 source tests, including candidate starter
operation, bounded projection/copy isolation and fixed-clock debt/pause/speed.
Headless Chrome 154 using SwiftShader passed 20 actual Classic browser scenarios:
rendering, pause, speed, pointer path placement/payment, duplicate-placement
rejection, new coaster/track/removal refund, loans, facility price/opening, real
staff picking, patrol painting, IndexedDB save/file import, malformed file
recovery, obsolete instance disposal, retained forced static refresh, overlapping
employee list selection, rejected/rapid patrol painting, correlated malformed
Worker errors with a subsequent valid save, actual IndexedDB page reload and
worker guest arrivals. No page exceptions were recorded.

The first test harness used accelerated virtual time and could expire a main
thread timeout before asynchronous worker messages arrived. The retained check harness controls the existing remote Chrome through CDP and
uses real wall time; it creates a tab, without a separate browser profile. The
game clock and production worker code are unchanged by that harness correction. The headless
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

Independent GPT 6.1 Sol Max review identified obsolete ground instance buffers,
a dropped forced refresh during automatic local restoration, and overlapping
initial employees without individual selection. The old-instance check failed
before repair. Static rebuilding now dispatches instance disposal while shared
geometry/material remain reusable; requested static refreshes survive in-flight
views with an epoch guard; automatic restore invalidates scenery; and the staff
list exposes every employee independent of overlap. Browser regressions cover
all three seams.

A synthetic 34-tile queue stress at 400/1,600 queued guests measured p95
1.50/5.34 ms per tick on the same CPU. That profile stretches movement/dispatch
to hold the queue and does not qualify original timings or organic crowd state.

Startup waits for IndexedDB recovery before enabling player controls or regular
projection polling. This prevents a late automatic load from overwriting a new
park or early construction. The actual reload check recovers both the saved
Browser Probe coaster and newly placed path in authoritative state and scenery.
The pre-review real-time CDP run passed all 17 browser scenarios without exceptions.
All 17 scenarios were repeated successfully with the same-version official
Chrome for Testing and the explicit existing default profile directory. This
corrects the earlier standard headless Chrome's automatic temporary profile.
Raw results and their limits are retained in [preview evidence](verification/classic-preview/README.md).

Independent Grok 4.7 xhigh review identified three further defects: rejected
patrol points polluted later edits and mutated an in-flight proposal; pause
discarded previously retained unpaused tick debt; and a malformed request
envelope threw before the structured Worker reply. All were reproduced remotely
before repair, including both patrol failure paths. Patrol edits now serialize
independent proposals and update local tiles only after success; paused polling
keeps debt with zero advance; load side effects require a valid inner response.
GPT 6.1 Sol Max performed focused static closure and found no remaining verified
counterexample within these fixes. The repaired source `5ae0957` passed 100
source checks and all 20 real-browser scenarios on the default profile.

The extended browser run initially failed to reach its terminal result, leaving
an active park with its initial tools at timeout. The harness's initial state
predicate did not establish that the new-park projection was current. It now
waits for startup completion, the new-park acknowledgement and the visible
unpaused control; that corrected run passed all scenarios, and diagnostics also
retain the active check. Production commands
and the clock were not changed to accommodate that harness synchronization.

The focused GPT 6.1 Sol Max closure review independently checked these three
repairs plus startup ownership at source `9371cdd`; it reported no remaining
verified issue within that scope. The reviewer inspected code and regressions;
Linux source/browser execution was performed by the primary agent.

A 30-minute real-wall-time simulation baseline completed 72,000 additional ticks
with 30 rounds of price/breakdown changes, path placement/removal and full
save/restore checkpoints. Its 32 sampled checkpoints had zero backlog and no
errors. The final state contained 899 guests, two staff and 3,046 litter records;
sampled JavaScript heap peaked at 43,188,413 bytes and finished at 18,987,697.
Ticket/shop sales, stock, wages and upkeep reconciled to final cash after the
180-unit net construction cost of repeated path edits.

This baseline started before the later import-validation and presentation
repairs, against the `ee21d6a` development state. Its raw result did not capture
an initial source hash, so it is retained as diagnostic baseline evidence,
not a final-source stability qualification. It exercised the engine inside
Chrome without the production renderer/Worker caller. An integrated long run,
representative scale and real integrated-GPU qualification remain open in
[the first-playable qualification task](https://github.com/patrick-fu/coaster-tycoon-3d/issues/24).
