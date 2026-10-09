# Candidate Log Flume slice after the Carousel

Root adopts the bounded independent four-seat, single-boat channel candidate
from the established Sol Max seam investigation. The complete RCT2 programme
remains required; reference LFB1 is unavailable and original numerical values
are not replaced with candidate figures. This is the next owned P3 outcome.

## Authority and construction

Identity: independent.log-flume / independent.four-seat-log /
independent.channel-circuit. World 4m/40Hz, one real 4-seat boat, zero bank.
Closed channel has one connected≥8m station, four matching-direction R8m
quarter turns, exactly one4m-rise lift and one4m-drop, followed by≥8m splash
before any turn. Future multiple boats, reversers, free water and lake crossing
remain separate required family coverage, not this profile's permissions.

Independent native pieces use local X forward/Y lateral/Z up in32 units/tile:
station/channel/splash end(32,0,0), prices300/100/180; left/right R64
end(64,−64,0)/(64,+64,0), direction−1/+1, price250. Lift start/core/end end Z8/16/8
and Z(t)=8t²/16t/8(2t−t²), price200/150/200. Drop counterparts negate Z,
price180/140/180. Horizontal slope span32. All joins preserve endpoint,
pitch and direction; connector pitch±1 denotes slope±.5.

Trough is ride-owned water: inner width2m/outer2.4m, course-relative inner
floor+.1m/water+.6m/wall top+1m. Conservative finite quarter-cell reservations
cover trough/supports/passengers through course high+24 units. Validate dry
owned terrain and≤48-unit support before lowering collision low to terrain;
never make support height vanish by checking the already expanded envelope.
Reject terrain changes and water under retained cells. Share the exact native
calculation for quote/execute/load; same-ride exceptions require a verified
local connected seam, not a blanket exemption. Actual final native/mesh checks
are required before availability becomes executable.

The finite entrance references the actual first station, whose origin equals
the anchor. Exit references the actual second station at the first's exact
station endpoint, with the same height/direction and zero pitch/bank. Each role
occurs once. Both portals use one physical side: direction d+1 or d+3 modulo4.
Tile is the selected station origin/32 minus its facing unit vector; height is
the selected origin.z. Both roles use one full tile, mask15, and height24 units
to include the .85m landing and pedestrian/roof clearance. Approach remains one
tile behind facing. Firststation entrance needs no circuit; exit needs the
secondstation. Either role placement order is legal. When turn is known,
outside d+1 for right/d+3 for left is the helper's default placement, not a
validation restriction or permission to move existing doors on append.
Actual route diagnosis rejected opposite-side gates: native support reservations
divide road connectivity into outside/inside components. Same-side adjacent bays
preserve the existing inbound and pure-public outbound admission conditions.

Define S=selected station origin.xy+(16,16), P=portal tile*32+(16,16), and world
quarter centres Q=cell tile*32+[(8,8),(24,8),(24,24),(8,24)] in bits0–3.
For each actual selected station/portal pair, only its one nonzero quarter with
(Q-S)·stationForward===8 and (Q-P)·portalFacing===8 may overlap. Only exit may
also meet the actual connected preceding firststation, separately requiring
(Q-S)·stationForward===-8 and the same facing dot8. Never accept the union of
two masks or another station/track/path/portal/foreign ride/stale object.
Portal Cell stays exact fullmask15/[height,height+24); station Cell is its actual
ground-expanded Native reservation, whose low is not portal height. Shared
quarter mask must be exact; wider masks and wrong sockets are rejected.
Quote/execute/load use identical calculations; arrays can have different element
orders. Old unpublished v11 opposite-door drafts are rejected, not migrated by
moving doors. The Portal candidate need not be in the map, but referenced Tracks
must be the actual selected/preceding station objects. Roles are unique across
this finite ride. Construction cannot require a complete circuit before a gate.
Design probes cover actual native quarters and eight legal road routes; new
Portal execution, paid guest transitions and authored mesh/walk need separate
acceptance. Opposite-door failure proof remains retained.

## Boat, economics and lifecycle

An independent Boat with real entity ID/4 ordered owner slots has loading/
running/unloading phase, progress/travel/speed/waits/laps and measured test
result. It cannot share owners or operating container with Train or Carousel.
All three use one global owner check and real guest{ride,slot}; shared entity
capacity includes the boat ID. No fake Train cars, measured G-force or riders.
Boat/4 seat poses follow the same authoritative channel frame and literal
unit asset anchors. [The model contract](../../prototypes/detailed-assets/log-boat-contract.md) freezes them.

Candidate movement is mm/tick: channel target50/lift25; per-tick accel1,
channel brake1/lift and splash brake4. Drop acceleration is
`vNext=max(1,v−round(9810*tangent.z/1600))`. Splash returns to50; station
brakes to an exactly clamped dock. A qualification bound300 detects failure;
it cannot silently clamp energy or freeze a departed test boat. Freeze rounding/segment/clock
order and course endpoint interpolation without changing old Train arithmetic.

FIFO boards≤1 every8ticks at the lowest free slot. First successful paid seat
starts load wait; full dispatch after80, partial after240, unload40. Ticket20/
max100, portal50, fortnight upkeep150; inspection interval16384/work160,
repair200. All are authored candidate parameters. Set-open requires an actual
complete successful testing lap. Testing permits empty dispatch; open empty
waits. Close finishes already paid/loading or departed test boats, stopping at
dock. Pause/breakdown freeze progress and owners; absent public exit blocks
unload at40. Inspection starts only empty home/loading and blocks boarding;
occupied broken boats can be repaired and resume exact saved work.

Editing/demolition requires closed empty loading/dock. Retirement preserves
ride income, guest spending/history, clears queue/navigation/portal/job links,
removes tracks/portals/boat/ride atomically and creates a fresh instance on ID
reuse. Existing authoritative money and command rejection rules remain.

## Migration and evidence

Proposed save11/content4/protocol4 adds only declared Flume profile/state.
Validate exact v10 receiving Rules and old identity/owners before adding new
fields. Preserve explicit v8/content1, v9/content2 and v10/content3 validators and
projections; historical fixtures do not receive new Flume fields. Append the
new Rules field, remove only declared fields per historical receiving version,
and preserve legal1m/1000Hz receivers without this4m/40Hz profile. Browser
reads versioned slots by absence only and writes only the new slot.

The independently frozen pre-change v10 paid mixed/Carousel oracle is owned
in /Volumes/WD/code/workspaces/coaster-v10-carousel-golden. Retain v7/v8/v9
masters too. Required finite controls: four orientations/left and right/R8
joins; actual hull/four riders against channel floor/walls on flat/lift/drop;
native terrain/foreign/support/atomic rejection;1/4paid and ordered holes;
combined duplicate owner with actual Train and Carousel; true lift/drop/
splash/dock traces; closure/pause/breakdown/exit loss; real160/200 staff work;
demolition/slot reuse; full matching-runtime historical authority/views/RNG/
poses/ledger continuation; actual browser ownership/picking/static budget/
loading/disposal/IndexedDB plus public distribution byte identity.

Root owns production/design/integration/acceptance. Existing Sol Max performs
logical analysis and isolated oracle; AGY authors only isolated boat/visual
sources from a frozen frame. All compilation, simulation, Blender, images and
browser runtime checks run on Grok Bot; WD retains evidence. This document
freezes design choices but supplies no executed Flume correctness, original,
scale/GPU or human visual/play acceptance.

## Root's finite implementation datums

The water plane and hull roots follow the bank-zero channel frame: native
horizontal course positions include the existing fixed world half-tile
offset (16,16 units), and floor/water/wall offsets use its local up vector.
Station platforms reserve one metre beyond each outer trough wall, giving
4.4m total station width and .85m platform deck height; roof/people remain
within the declared course-high plus24-unit reservation. These are candidates.

The finite boarding bay is the first two contiguous station sections. Dock is
exactly8000mm minus1900mm hull half-length, or6100mm, even when the station is
extended. The full stationEnd, spans, length and course identity retain the
extension; entrance/exit sockets stay on the first/second sections. Old
unpublished v11 positional drafts at a farther dock reject atomically rather
than moving their Boat or owners. Dock is an integer course distance, not Train
carLength.
Successful testing records actual running ticks, travelled distance and maximum
speed after one complete qualified testing circuit back to dock. Pause/breakdown
freeze these counters; a speed above300mm/tick fails qualification rather than
being clamped. A failed test still returns to the exact dock, enters empty
unloading40 and retains its actual maxSpeed, with no successful witness.
Close/pause do not erase that failure evidence. No G-force is invented.

Successful public unloading adds authored happiness40/nausea20, each clamped
to1000; missing exit retains owners and applies no reward/history mutation.
This explicit independent policy does not infer zero nausea from absent
Train measurements. Prices/parameters remain original-comparison candidates.

Boat root is course position plus600mm along local up; the ordered hip datums
are then transformed from the unit asset's +Z forward/+Y up frame. Native asset
right is direction×up; after sim-to-Three `(x,y,z)→(x,z,y)`, Three right is
up×forward. An empty testing boat without a successful witness starts an80-tick
dock wait. After its first successful test and unloading it stays loading with
wait0 and that witness, until Open or an explicit new Test intent. A failed
test retains null witness and retries under the existing intent. Open empty
boats reset wait to0. A paid
first seat starts the same wait; full boats dispatch at80 and partial at240.
Dispatch begins with50mm/tick and advances on that tick. Running movement
chooses the current authoritative piece/frame before adjusting speed, then
clamps travel to the remaining circuit distance. Lift targets25 with brake4;
drop alone applies the declared gravity term; other channel targets50 with
brake1, splash with brake4. On returning station, remaining distance at or
below `speed*(speed+1)/2` latches exclusive brake1 down to minimum1 until the
exact dock clamp, replacing ordinary target50. Docking resets only at dispatch
or after successful unloading. Every lap records real distance/ticks/max speed
and enters unloading with speed0. Only a qualified testing dispatch creates
`measured={ticks,distance,maxSpeed,courseKey}`. Dispatch mode testing/paid remains
captured through close and unloading; paid laps preserve the test witness.
`courseKey` is the canonical scalar-array descriptor of ride ID, anchor and
ordered track IDs/piece IDs/connectors, not a security signature. Set-open/load
must match that exact receiving course. Editing removes the prior boat/test
witness; a new testing intent at an empty loading dock and its later testing
dispatch clear older measured. Testing never starts with paid loading owners.
Unloading wait saturates at40; only successful public
exit transfer (or an empty testing return) resets loading, preserving measured
result and lap count. Broken/paused ticks do not call this movement step.

## Reviewed presentation integration

Initialize a dedicated asset loader only when a supported Flume ride appears.
Require both exact unit GLBs and five opaque channel material sets before
readiness. Asset-owned GLB geometry/maps/materials/depth/bitmaps survive static
refresh; clone instances only detach. Art context owns merged channel geometry
and procedural water/sign resources. Latest packet/scenery callbacks must not
resurrect stale records after demolition, restore, new park or disposal.

Static geometry consumes native millimetre frames sampled by `flumeFrame` using
the selected profile's actual sample count; it supports incomplete track editing.
Public Boat/body/Hip frames already use metres and include water/half-tile.
Only swap native Y/Z for dynamic presentation. Parent unchanged real-owner
rider clones to `Seat_00..03` at identity; preserve ordered holes and validate
boat/ride instance/profile identity. Bodies select rides; riders select guests.

Resolve actual `portal.station` from current scenery, never array order. Carve
only that selected station and keep Flume parents at identity, outside generic
`fitModel`. Actual shared-tile terrain supplies station passage supports.
Approach seam belongs to the actual same-height referenced path's own tile.
Under-deck joint support and each actual lateral support foot on varying terrain
need their separate reviewed author repair and checks. Finite static person fit
does not establish actual approach-to-seat walking or continuous sweeps.

Default old parks must request no Flume resources. An opt-in receiver and
channel piece/Boat inspector controls follow the finite art/browser gate,
preserving strict complete receiving Rules identity and historical factories.
