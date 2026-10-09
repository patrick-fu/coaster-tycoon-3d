# Detailed wooden and steel candidates in one park

The mixed-coaster slice added Cedar Timber Run to the three existing steel rides.
The wooden car, station, track, passengers and drawbar present authoritative
worker state at metre scale. This is an independently authored candidate;
the reference Wooden/PTCT1 entry remains unavailable. The complete reference
catalogue and the broader [programme](planning/rct2-program.md) remain separate.

## Finite operating contract

| Property | Independent wooden candidate |
| --- | --- |
| World and clock | 4 metres per tile; 40 simulation ticks per second |
| Track | Flat station/flat; planar R16 left/right, 64 chords per quarter |
| Foundations | Level, dry ground beneath every reserved track cell; elevated foundations unavailable |
| Circuit | One closed loop with four turns in one direction and one contiguous station |
| Vehicle | Four ordered seats per car; at most two cars |
| Nominal pitch | 2880 mm; two-car reservation 5760 mm |
| Rig | 1500 mm wheelbase; 170 mm bogie pivot; 1340 mm coupler half-span; 200 mm drawbar |
| Rail and deck | 480 mm half-gauge; rail head 500 mm above base; station deck 820 mm above base |
| Initial motion | 200 mm/tick station speed; zero rolling resistance/drag; no grade or banking |
| Construction prices | Station 101, flat 61, quarter curve 160 in integer money units |

The numbers above are candidate parameters and measured model datums, not
verified original physics or prices. Elevated foundations, slopes, banking, inversions, mixed turn
sequences, shuttle/block modes and arbitrary vehicle compositions are rejected
before operation. Renderer frames come from current course progress and the
saved complete profile; the old inspector's pose table is not played back.

The existing steel numeric rules remain intact. Quote/build/remove/refund,
course compilation, seats, dispatch, load validation and view projection resolve
the selected ride's profile. The steel view carries `rig: null`; wooden views
carry body, bogie and link frames. `seatIds` preserves the authored four-position
order, including empty positions between occupied seats.

## Placement and visible interfaces

Wooden construction uses explicit four-direction native quarter-cell footprints.
Actual model placement keeps fixed world tile-centre offsets and unit GLB scale;
there is no nonuniform bounds fitting. Only connected track bays, a portal's own
station, and its exact correctly associated approach path have bounded interface
exceptions. Other rides, paths, scenery, land, water and ownership still obstruct
construction. A legal mount does not imply every combination of adjacent bays
and approach paths is possible.

The finite candidate requires its track footprint to rest on level, dry ground.
Changing terrain beneath built wooden track is rejected before mutation. Elevated
station foundations and trestles require their own visible supports and ground
reservations; the authoring experiment's elevated meshes are not enabled here.

Physical paving tops are 140 mm above logical path height. Four 170 mm risers
reach the 820 mm deck, with 600 mm walking width and a reserved 800 mm outer
envelope. A far-side gate's axial offset requires an extended lower landing;
its ingress remains inside the actual paving and queue side rails. The worker
reserves the gate, physical landing and ingress together. This keeps model
anchors, logical approach tiles and physical floor heights distinct.

Imported cars, station roofs and source anchors keep their authored transforms.
The four upstop brackets and station rail-bed interface have a bounded authored
revision. Other original car attributes, materials, texture bytes, seats and
couplers remain preserved. Continuous track/support geometry follows the exact
native chord data, with metre UVs and per-element material buffer concatenation.

## Saves and browser storage

The original mixed-coaster snapshot used v9/content 2. Current saves are
**version 11 / content version 4**, and worker messages/views use **protocol 4**.
Complete declared profiles and selected content are saved. Historical v6–v10
inputs are validated at each original schema before adding only declared
identity/profile/session/Boat fields. The actual historical continuation tests use their
matching complete receiving numeric rules. Unsupported profiles and invalid
loads preserve the live park, pending quotes and pause state.

The browser writes `current-v11` or `showcase-classic-v11`. Reading checks the
matching v11, v10, v9 and original unversioned slots in that order, continuing
only when a key is absent. Existing older slots remain intact. A present invalid
record is rejected rather than bypassed for an older slot; quiet saving stays
disabled until an explicit successful save, matching import or confirmed New
park. [Current storage evidence](verification/log-flume/production-storage.json)
and [Classic reload checks](verification/log-flume/classic-library-browser.json)
record the actual receiving versions and complete original-store preservation.

Exact rule matching is deliberate. Runtime-generated default curve coordinates
currently have tiny Node/Chrome differences, so a portable-default profile is
not established. Same-browser export/import and IndexedDB continuation are
separate checks. Frozen parameter tables and declared historical profile support
remain follow-up work; do not round/drop numeric fields to conceal this limit.

## Scope of verification

Retained remote checks cover historical continuation, mixed paid operation,
ordered seats, saves, native placement, bounded car/rail contact, generated
geometry correspondence, real browser picking and asset lifecycle controls.
Their exact versions and raw failures belong to the verification record.
Software WebGL results do not qualify representative integrated-GPU performance.
No exact-original agreement, universal radius/grade clearance, structural
manufacturing or human visual acceptance is implied.

The current park also includes the independent Carousel; the independent Log
Flume is available for construction. Their [finite Carousel](verification/carousel/README.md)
and [Flume checks](verification/log-flume/README.md) have separate boundaries.
Original family agreement, remaining ride families, all commercial products and
services, admission policies, full finance/calendar/research, authored scenarios
and reusable track presets remain required programme work.
