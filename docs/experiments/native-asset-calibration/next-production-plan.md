# Next production slice: mixed steel and detailed wooden candidates

## Decision

The next playable destination must contain steel and wooden coasters in the
**same saved park**. Add one finite, authoritative per-ride rule profile for an
independently authored wooden candidate, plus its detailed presentation adapter.
A presentation-only adapter is insufficient. A separate wooden-only `Rules`
object can prove experiments but cannot satisfy this destination.

Keep the existing steel rule numbers and identity unchanged. Existing steel
rides resolve to the exact top-level `Rules.motion` and `Rules.pieces`, including
nondefault receiving-engine values. Wooden rides resolve to a complete numeric
record stored in the same saved rule JSON. Do not look up numeric defaults from
an identity string, mutate `steelRules`, or overwrite steel train state when
wooden content is selected.

The new wooden capability should initially cover one uniform four-seat vehicle,
one modular station, flat unbanked track, one qualified left/right curve and the
existing independent single-train continuous-circuit lifecycle. Slopes, banking,
inversions, mixed car roles, blocks, synchronized stations, water and fixed rides
remain unavailable. Reference PTCT1 and reference Wooden Roller Coaster IDs
remain unimplemented; the new candidate does not relabel those entries.

The unchanged sample already fails a curved multi-car counterexample. Therefore
do not advertise its operation capability as implemented until the finite curve,
coupling, bogie and body-clearance qualification passes. This is a qualification
gate inside the next production batch, not a reason to replace the 2680 mm
straight coupling with the old 2000 mm value or to squash the geometry.

## Source and evidence inspected

Production workspace: `/Volumes/WD/code/workspaces/coaster-content-library/coaster-tycoon-3d`,
HEAD `2c19a1b214e7c3a5b58ec6f9982cb94d485ab867`. The directory already contained
uncommitted content-library work: `src/content/rct2-reference.ts`, `ui/game.js`,
`ui/index.html`, `ui/content-browser.js`, `ui/content-browser.css` and
`test/content-library-browser.js`. The integration-relevant `ui/game.js` and
library code were inspected; none of those files was changed. No production,
Git, dependency or tracker write was made for this report.

Measured samples come from source `e17c646bc2d49781bd567054309d6c2096bd847c`:

- Car SHA-256: `fc988c55ed60dcd5abf7c5e02ecbc1ac3a8cd828cfe7fe4bb8f30bcf21699b59`.
- Station SHA-256: `60d94b3c784726b3dfa5aa89bed37a4da8dee05769ff1f648d918a0de1bf7b41`.
- Kiosk SHA-256: `6e54f9362e967ac7b7a2427f178dd39163894e006ce86958e07dcc636cb900d0`.

[measurements.json](measurements.json)
has SHA-256 `d4726cb3798b5f300e367189fb91ae21af504a46806b27c41a3a2cf279127d90`.
The CPU runner executed on `grok-build`, Node 20.19.2 / Three.js revision 186,
with exit 0 and empty stderr. It checked binary POSITION values against accessor
bounds, complete parent transforms, four station directions, rail datums,
couplers, ordered seats and reservations. Its successful checks qualify the
recorded candidate relationships and rejection decisions only.

This report also includes two additional read-only CPU calculations performed
through `ssh grok-build` using `node --input-type=module` with script input;
both exited 0. They did not execute production simulation or create files.
The first used actual GLB `CarBody_Tub` triangles and the existing candidate
curve's rounded-chord construction to find a counterexample; the second
confirmed an intersection through a triangle interior. Inputs and actual
results are recorded below. No Mac runtime, build, test, Blender or browser
execution was used.

## Why replacing meshes fails

| Current consumer | Relevant source | Consequence |
|---|---|---|
| Train allocation and station fit | [motion.ts:71](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/src/simulation/motion.ts#L71), `createTrain()` | `carLength` controls fit and initial stop position; `seatsPerCar` allocates authoritative slots. A four-seat mesh does not change either. |
| Train stepping | [motion.ts:92](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/src/simulation/motion.ts#L92), `stepTrain()` | Average slope samples use `position-i*carLength`. A new coupling law cannot exist only in the renderer when those samples affect motion. |
| Car projection | [view.ts:20](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/src/simulation/view.ts#L20), `project()` | Root spacing and seat slicing use the global motion record; only an occupant count survives projection. Distinct null slots become indistinguishable. |
| Saved train validation | [engine.ts:337](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/src/simulation/engine.ts#L337), `validateTrains()` | Seat length, station fit, starting position, course and phase bounds all use global rules. A renderer override creates inconsistent saves. |
| Track construction, indexing and lifecycle | [engine.ts:164](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/src/simulation/engine.ts#L164), [engine.ts:190](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/src/simulation/engine.ts#L190), [engine.ts:317](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/src/simulation/engine.ts#L317) | Tip, occupied cells, pricing, append/remove and saved track membership need the same selected piece record. |
| Station grouping and portals | [operation.ts:10](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/src/simulation/operation.ts#L10), `stationGroups()`, `validatePortal()`, `eligibility()` | Grouping and connector closure must resolve the ride's pieces, not the steel catalogue. Portal logical height is currently the station's native reference, not the authored deck height. |
| Rendering | [park-scene.js:30](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/ui/park-scene.js#L30), [coaster.js:1333](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/ui/art/coaster.js#L1333) | Static track uses imported `steelRules`; procedural cars use local +X forward and offset +.65 m. Delivered GLBs use +Z forward and require their own rail datum. |
| Capability and library gates | [registry.ts:51](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/src/content/registry.ts#L51), [game.js:13](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/ui/game.js#L13) | Both currently require `presentation.kind==='procedural-coaster'`. Merely adding a GLB entry cannot make construction, operation and presentation executable. |

Concrete measured failures:

1. At 2000 mm root pitch, unchanged car couplers miss by
   `.6800000667572021 m`. At 2680 mm on a straight, they miss by only
   `6.675720198856538e-8 m`. That qualifies the straight attachment, not curves.
2. The old local +X-forward matrix turns the GLB forward axis sideways: forward
   dot product is 0 in all four station-direction controls.
3. The station's RailIn/Out are .5 m above StationRoot. The existing flat
   procedural rail's nominal top is `.3+.058=.358 m`; residual `.142 m`.
   The station rail gauge is ±.48 m, versus the current generated ±.52 m
   ([timber-station.py:393](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/prototypes/detailed-assets/sources/timber-station.py#L393),
   [coaster.js:404](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/ui/art/coaster.js#L404)).
4. The station's actual extent is `4.7600002289 × 4.0500001907 × 4.0199999809 m`
   in glTF X/Y/Z. The current station reservation is one generic 2 m-high cell;
   the current station calls `fitModel()` at
   [coaster.js:856](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/ui/art/coaster.js#L856).
   Unit-scale station admission needs a separate qualified native placement and
   clearance contract. A roof bound is not permission to alter native collision.
5. `[101,null,103,104]` and `[101,102,103,null]` both have count 3 but leave
   different seats empty. The current renderer further caps that count at 2
   ([coaster.js:1350](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/ui/art/coaster.js#L1350)).

### Actual curved counterexample

The standalone [replay runner](curved-counterexample.mjs)
was executed once on Grok Bot with exit 0. Its
[retained result](curved-counterexample-result.json)
reproduces all reported values and the strict interior-crossing witness;
[command and byte-match evidence](curved-counterexample-command.log)
record matching local/remote runner, result and raw stdout/stderr/exit hashes.

The steel candidate curve is radius 64 native units = 8 candidate metres, with
32 straight sample chords ([steel-coaster.ts:7](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/src/content/steel-coaster.ts#L7)).
The readonly calculation reconstructed those points and rounded each chord to
millimetres as `compileCourse()` does; this is a geometry fixture, not a report
of a newly executed production train.

Inputs: lead course position 6000 mm, following 3320 mm, pitch 2680 mm, constant
up, rigid centre-point tangent pose and the correct GLB +Z-forward basis. The
rounded quarter-course length was 12576 mm. Default closed `CarBody_Tub` has
2132 triangles, with actual bounds X ±.6999999881, Y .2599999905–.8398956060,
Z ±1.2799999714 m.

Actual results:

```json
{
  "straight2680mmShellIntersectionPairs": 0,
  "curvedAngleDegrees": 19.687500000000068,
  "curvedCouplerResidualMetres": 0.030718982413461864,
  "curvedTriangleBroadphasePairs": 1859,
  "curvedShellSurfaceIntersectionPairs": 30,
  "confirmedPair": {"leadTriangle": 87, "followingTriangle": 11},
  "confirmedLeadEdge": 0,
  "edgeSegmentFraction": 0.9455778566636841,
  "followingTriangleBarycentrics": [0.20729934465877922, 0.0045391413622160835, 0.7881615139790047],
  "strictInteriorCrossing": true,
  "exit": 0
}
```

The lead shell triangle crosses the other triangle's plane: signed distances
`.1270290840, -.0073110796, -.0097191299 m`. Its edge intersects strictly inside
the following triangle, so this result is not inferred from full-car AABB
overlap or from touching coupler geometry. The calculation covered one selected
curve pose; it does not establish the safe minimum radius or a full swept-volume
solution. Rotating bogies alone cannot remove this inter-car shell intersection.

## Small authoritative contract

### Subsequent finite joint evidence

The [finite replacement-hitch experiment](../wooden-hitch/README.md) supersedes
the direct-coupler 2680 mm nominal-pitch proposal below. Its unchanged coupler
span is 2680 mm, and its fixed finite drawbar is 200 mm, giving approximately
2880 mm straight root pitch. Preserve the steel meanings and numbers; for the
new wooden profile `carLength` must represent this 2880 mm nominal centre pitch
and station reservation, rather than the visible body length. Two cars reserve
5760 mm and allocate eight slots: one 4 m bay rejects logical fit, two bays pass
that limited fit calculation. Actual end/roof/boarding clearance is separate.

The revised car retains original position, normal, UV, bitmap and node data,
removes exactly the two old hitch solids and appends actual carrier/pin geometry.
All 59 frozen flat poses pass finite body/bogie/hardware/eye/pin/contact checks.
That result does not qualify continuous motion or enable a 16 m piece, native
placement or wooden availability. The earlier 2680 mm direct-contact and 8 m
failure measurements remain historical controls; do not use the superseded
pitch in the next saved numeric profile or station-fit expectations.

Use one shared resolver for the two real adapters. A proposed interface is
`resolveRideRules(content, canonicalRules)`, returning the selected complete
motion, piece and wooden pose records. Its steel branch returns the existing
receiving-engine numbers. Its wooden branch requires the named record in
`canonicalRules.rideProfiles`. Absence, an unavailable profile, a wrong content
combination or an unsupported geometric configuration rejects before allocation,
charging, mutation or drawing.

Add only the new collection to the complete rule schema:

```text
Rules = existing complete common/legacy-steel record
      + rideProfiles[profileId] = {
          motion: complete MotionRules,
          pieces: complete supported PieceRule records,
          vehicle: explicit coupled-flat pose kind and authored-local mm datums
        }
```

Use distinct proposed candidate IDs, for example
`independent.wooden-circuit-coaster`, `independent.wooden-four-seat-train`,
`independent.continuous-circuit`, authoritative profile
`independent.wooden-circuit-v1` and presentation profile
`detailed-wooden-candidate-v1`. These are proposed project identifiers, not
already registered content. The authoritative profile is selected by the
family/variant/mode capability combination, not by a model filename.

The first wooden record has `tileMetres=4`, `tickHz=40`, `carLength=2680`,
`seatsPerCar=4`, and an explicit small maximum car count such as 2. Store complete
other motion values rather than implicit inheritance. Initially require the
same world metres/tile and tick rate as the common rule record; one park cannot
quietly run two world scales or worker clocks. The existing steel record remains
2000 mm / two seats, or its exact saved nondefault values.

Author-local datum candidates, quantized from the measured GLB to integer mm:
RailRoot-to-course reference `500`; front/rear couplers `[0,220,±1340]`;
front/rear bogie pivots `[0,170,±750]`, in explicitly named glTF +Y-up/+Z-forward
local axes. Check those numbers against actual delivered anchors within
`1e-4 m`. These are candidate numbers. The asset manifest separately pins
GLB/source hashes, its exact bounds and the explicit four-seat anchor order.

For the new wooden adapter, return actual RailRoot poses and deterministic bogie
poses from the worker. Generate continuous root orientation from its qualified
geometry and solve bounded trailing-car coupling consistently. Using
`position-i*2680` plus independent local tangents is the demonstrated failing
baseline. The existing steel adapter keeps that old law unchanged. Motion's
slope sampling, view projection and envelope checks must consume the same
selected poses; the renderer must not invent a different car chain.

A finite flat, memoryless pose solution can remain derived from saved train
progress, ordered car IDs and complete saved rules. No new independently mutable
per-car position state is needed for that slice. If an eventual coupling model
needs history, swing velocity or hysteresis, it would require its own explicit
state and migration; that is outside this first implementation.

The failed 8 m multi-car curve must be unsupported for this candidate. A bounded
next experiment can try radius 128 native units = 16 candidate metres with 64
chords, retaining the 4 m station pitch and 2680 mm straight coupling. This is a
proposed fixture, **not a passed radius**. Qualify its coupling and full body
sweep, including straight/curve transitions, before putting its left/right
pieces in the executable profile. If it fails, resolve the authored hull or
curve/coupling design from that evidence; do not silently widen tracks or relabel
the old radius as calibrated.

### Native placement and collision

Keep native collision cells, visual mesh bounds and swept participant bounds
separate. Preserve the existing steel coordinate-origin behavior. Explicitly
declare the wooden profile's coordinate-origin policy and ensure its quoted
native cells match the actual generated track/station placement in all four
directions. The current global half-tile offset means native origin x=640 draws
a flat span at x=82–86 m, while cell tile20 spans x=80–84 m. Reusing its single
cell is therefore not a passed wooden footprint.

Author the new profile's native `pieces[].cells` from its intended installation,
then independently check actual mesh and swept poses against that contract.
Do not enlarge old cells on asset ingestion. Initially use a finite qualified
construction set and conservative candidate cells with explicit quarter/Z
quantization. If one rotated footprint cannot represent the declared origin
policy, the necessary minimal extension is four explicit direction footprints
for the wooden profile; do not conceal that discrepancy in rendering.

`Engine.clear()` currently treats all intersecting cells uniformly. Connected
wooden modules can have intentional shared station seams or track/car-envelope
interfaces. Any allowance must identify the actual connected same-ride
interface and preserve rejection of nonadjacent self-crossings and other rides,
paths, walls, scenery and terrain. Blanket same-ride exclusion is unsafe.
Full AABB overlap alone is not the narrow-phase body-collision verdict, and
coupler engagement cannot justify shell overlap outside the joint region.

The station root stays on the chosen native ground/reference datum at unit
scale. RailIn/Out remain .5 m above it; the wooden generated rail top and car
RailRoot must match that value and the ±.48 m gauge. The generated track must
not add duplicate rails through the authored station bay. The authored roof is
preserved; bypass `fitModel()` for this adapter.

Deck/gate anchors are .82 m above StationRoot, while logical portals/path points
are currently at the station native reference. Preserve that distinction. A
qualified authored entrance transition and seated guest hip/restraint mapping
are required for an accepted visible boarding path. Do not round .82 m into a
different native path height, elevate path collision to hide it, or claim a gate
socket is already connected because an entrance command succeeds. The existing
instantaneous boarding lifecycle can remain a labelled independent candidate;
it does not establish original boarding phases.

## Required schema and consumer changes

| File/function | Required change and reason |
|---|---|
| `src/simulation/types.ts`, `geometry.ts::validateRules()` | Version and strictly validate the finite `rideProfiles` collection, complete motion/pieces, pose kind and datums. Canonicalize key ordering and reject nonfinite/malformed/unavailable records. Existing top-level numbers stay exact. |
| Proposed `src/content/ride-profiles.ts` | Own the small shared per-ride resolver and finite capability/profile validation. This is an actual steel/wood adapter seam, not a registry for every future family. |
| `src/content/registry.ts::resolveContent()/executableContent()/catalogue()` | Add the independent identities and detailed presentation capability; bind execution to a profile available in the receiving engine. Catalogue placeability must follow that gate. Leave reference catalogue entries unavailable. |
| `engine.ts::plan()/tip()/cells()/course()/indexState()/validateTrains()/advance()` | Resolve selected rules at every current global-piece/motion use: quote and execute, remove/refund, rebuild indexes, eligibility, train creation, station fit/start position, stepping and load validation. Clear failures remain atomic. Profile-aware clearance and finite pose qualification are necessary before wooden operation is enabled. |
| `operation.ts::stationGroups()/validatePortal()/eligibility()` and their callers in `people.ts` | Use the same per-ride pieces for station and portal logic. Preserve the existing logical path/queue policy; do not let geometry and boarding resolve different stations. |
| `motion.ts::compileCourse()/createTrain()/stepTrain()` | Accept the resolved profile consistently. Add the wooden deterministic coupled-flat pose implementation and expose it through one train-pose interface; preserve the steel path. Distinguish nominal straight coupling/station fit from full visual length. |
| `view.ts::project()` | Project each ride with its selected profile and exact ordered per-car `seatIds`, including nulls; copy arrays. Supply the wood RailRoot/bogie poses and a supported render contract. Static projected geometry must derive from worker-selected rules rather than renderer steel defaults. |
| `protocol.ts`, `host.ts`, `browser-worker.ts`, `ui/game.js`, `ui/park-scene.js` | Version the changed view contract, reject unsupported/mismatched contracts before mutation/drawing, and instantiate a mixed-rule park. Keep one common 40 Hz clock. The current `newPark()`/worker hardcodes steel; the content-library callback rejects authored presentation kinds. |
| New detailed-coaster render module and `scripts/build-web.mjs` | Load the pinned GLBs through the existing Three.js version's GLTFLoader dependency closure; separate steel and wood resource ownership. Apply +Z-forward unit transforms, rail/station/bogie/seat anchors, picking and deterministic disposal. Never send an unknown profile to the steel adapter. |

There is already authoritative seat state: `Train.seats` and each guest's
`{ride,slot}`. `boardGuests()` scans slots, and `validatePeople()` verifies
one-to-one ownership
([people.ts:156](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/src/simulation/people.ts#L156),
[engine.ts:417](https://github.com/patrick-fu/coaster-tycoon-3d/blob/a8e5527fe443b69753b8263821f71e73e5f7cbf8/src/simulation/engine.ts#L417)).
Keep those representations. Only their profile-derived allocation/validation
and ordered projection must change; no duplicate seat authority or serialized
model matrices are needed.

### Save and message versions

Use an explicit new save schema, proposed version 9 / content version 2, because
the numeric rule contract gains ride profiles and new content may use a new
pose law. A worker/view protocol bump is required for the ordered seat and
selected-geometry contract; changing the worker protocol does not invalidate
historical save readers.

New saves contain the complete canonical common record and complete wooden
profile numbers in `state.rules`, plus the existing per-ride content identity.
Do not duplicate that entire record on every instance or reconstruct it from
`Rules.id`. New-format load requires exact receiving-engine rule JSON and
supported profile/content combinations.

For v6/v7/v8 steel input, validate the complete historical state and numeric
record first. Compare its exact old common/steel record with the receiving
engine's declared legacy projection. Only then perform an explicit migration
that preserves all old numbers, identities, slot/instance history, RNG, tick,
pause, cash, ledger, train progress, car IDs, seat owners and queue state, and
adds the new rule collection supplied by the receiving configuration. All added
numbers become serialized; this is a documented capability extension, not
inference of original wooden rules or missing scenario history.

During v6/v7 validation, rides have not yet received content identities; those
historical checks must explicitly use the exact legacy top-level rules rather
than attempting to resolve a missing identity through the new adapter.

An incompatible old common world scale/tick profile cannot silently gain a
4 m/40 Hz wooden profile. It must retain its exact supported legacy
configuration or reject the requested extension with a diagnostic. Nondefault
legacy fixtures must continue under correspondingly configured receiving
engines. Failed loads preserve quotes and pause; successful migration retains
the current documented quote invalidation and clock reset behavior.

Save bytes will differ after the explicit schema upgrade. Acceptance compares
old fields after removing only documented version/rule-collection additions,
and then compares future tick-indexed continuation against the actual previous
kernel. It does not merely compare two new engines using the same new code.

## Smallest first executable batch

Implement one vertical slice behind unavailable capability flags until its
qualification gates pass:

1. Add canonical mixed rules, the finite per-ride resolver and versioned save
   migration. Thread it through worker construction, course/train validation and
   ordered view projection. Verify an actual legacy steel continuation while a
   wooden train independently allocates four seats at 2680 mm straight pitch.
2. Implement the wooden coupled-flat poses and one proposed broad curve; retain
   the demonstrated 8 m failing fixture as a negative control. Sweep actual
   authored shell/chassis, bogies, couplers, passengers and station interfaces.
   Only the passed finite pieces enter the wooden executable profile.
3. Integrate the car/station GLBs at unit scale in a small mixed park, with one
   two-car steel circuit and one two-car wooden circuit. Show the four actual
   ordered slots, actual nulls and matching rail sockets. Expose construction
   through the current library only once the worker and renderer qualify the
   complete capability combination.

This batch does not need a universal object scheduler, per-instance arbitrary
rule editor, new research/scenario systems, nonuniform vehicle composition,
dynamic swing state or a redesign of steel motion. Further family support and
bulk model production are optional later work. Production asset LOD/atlas and
large-scene optimization follow measured loading/draw/memory evidence, not an
unmeasured up-front framework.

## Meaningful remote acceptance cases

Each case records source/rule/asset hashes, starting save, tick commands, actual
outputs and remote command/exit. No production cases below have been executed
by this report.

| Case | Exact input and discriminating expectation |
|---|---|
| Mixed station fit and seat allocation | One 4 m station: steel two cars at 2000 mm fit; wooden two cars at 2680 mm reject. Two 4 m bays: wooden two cars fit and allocate 8 slots. In the first maxCars=2 wooden profile, requesting three cars rejects the capacity gate; do not misreport that as a station-length test. Include coupler/body overhang checks separately; 2.94 m visual length is not automatically the native spacing. |
| Straight poses and ordered passengers | Four-direction station sockets retain scale `[1,1,1]` and seam residual ≤`1e-4 m`. Car coupling residual at 2680 mm ≤`1e-4 m`; 2000 mm rejects. `[101,null,103,104]` versus `[101,102,103,null]` leaves the corresponding distinct seat empty. Copied view mutation does not change owners. Guest payments, queue removal, seats and unloading reconcile once. |
| Curved negative control and candidate qualification | Replay 8 m/32-chord lead6000/following3320 mm to preserve the shell-intersection/coupler-gap failure. Sweep the proposed 16 m/64-chord curve, both turns and straight/curve joins, using the new coupled poses. Require joint residual ≤`1e-4 m`, finite unit transforms, wheel/bogie contact within the explicitly declared candidate tolerance, and no shell/passenger/roof/support penetration outside named intended joint contacts. Use actual component triangles or independently checked convex component volumes; AABB is only broad phase. A failing phase prevents piece/profile enablement. |
| Placement and native clearance | Station anchor tile `(20,30)`, height32, all four directions. Check actual quote cells against placement/overhang. Put other-ride track/path/scenery in measured lateral/roof/swept occupancy at adjacent quarter/Z steps; reject intersecting cases and preserve legal touching boundaries. Test connected bays, nonadjacent self-crossing, portal gate/deck approach, both ground and elevated placement. No blanket same-ride exemption or automatic fit scale. |
| Save/worker/UI integration | Retain real v7/v8 occupied steel train and queue fixtures with nondefault rules. Migrate into matching receiving configurations; legacy future continuation matches the actual previous kernel. Save/reload the mixed park while both trains run and the wood's null-seat pattern is nontrivial. Reject malformed profile numbers, unavailable profile IDs, wrong identities, capacity mismatch and incompatible world scale atomically. Verify versioned real-worker messages, actual file export/import/IndexedDB continuation, asset reload/picking/disposal, finite bounds and cumulative GL errors. |

The current shared slot maximum is 255, existing seat slot bound is 0–1023, and
the finite first wood capacity is far below it. No slot-capacity expansion is
needed for two four-seat cars. Bounds/performance measurements must still use
the actual integrated scene and resource lifetimes.

## Remaining gates

All proposed values and geometry are independently authored candidates. The
native 32/8/16 discretization evidence does not establish original isotropic
metres, legal track groups, collision, PTCT1 spacing, physics, ratings, dispatch
or boarding order. Original R01 family contrasts, R02 suspended/inverted
clearance, R03 nonuniform cars/dispatch and S05 recipe/research/weather/objective
state remain open.

The car and station exceed their initial triangle budgets; a small mixed scene
is not original-scale or real integrated-GPU qualification. Retain asset
loading, texture/draw/geometry memory, lifecycle and GPU measurements separately.
Patrick's actual visual/play review remains required before bulk style
acceptance. That review is not needed to inspect source facts or run the
candidate correctness cases described here.
