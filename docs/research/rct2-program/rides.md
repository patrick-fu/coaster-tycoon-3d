# Ride construction, physics and operation contracts

Evidence: pinned reconstructed descriptors and original-object metadata in the
[inventory](README.md), plus the original manual for qualitative controls.
Values below labelled reconstructed require direct original comparison.

## Identity and common state

Keep `familyId`, `variantId` and `operationMode` separate. A family defines legal
construction, topology and operation; a variant defines ordered vehicle
components, seats, native mass/spacing and visible articulation. A player-created
Ride owns stations, layout, trains/sessions, queue/seat ownership, prices, test
measurements, ratings, maintenance and lifecycle. Appearance skins cannot create
capabilities. The present one-family `Rules.id`/Ride model cannot express this.

Construction is a tagged contract: tracked course, fixed footprint, tower or
pedestrian topology. Motion is a separate adapter: rail, channel, free-water,
cable/destination, simultaneous race, rotation/program or walking participation.
Share transaction/admission/queue/maintenance interfaces, not a fictional
complete coaster circuit for every attraction.

## Coordinates and reservations

The reference uses 32 native XY units per tile, eight native Z units per stored
height increment and 16 for a land/water step. Its displayed-height conversion
maps eight Z units to 0.75 m, while land area and traversal measurements have
different authorities. **No verified isotropic metre conversion exists.**
The current renderer's 4 m tile and uniform XYZ conversion makes a 16-unit
facility reservation only 2 m high, then `fitModel` hides the mismatch. Changing
the tile number alone cannot reconcile original logical clearances, displayed
heights and convincing models. Store native geometry and explicitly version the
render mapping. Authored visual bounds, legal occupancy and swept rider/vehicle
envelopes are separate. A decorative roof alone cannot justify larger collision.

Every legal track piece needs start/end position, yaw, pitch, roll, inverted
state, per-sequence quarter-tile occupancy, base/clearance Z, supports, terrain
and water rules. Proximity is not collision. Suspended rider clearance is below
the rail; ordinary car clearance is above it. The descriptor height tuple is
maximum-support height / clearance / vehicle Z / platform Z in different native
conventions, not a four-dimensional asset bounding box. Support limits use the
clearance top. Original-format limits are four stations and 32 trains; modern
255/255 limits are outside the baseline. [Format limits](https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/rct12/Limits.h).

## Coaster mechanisms and parameters

All 33 canonical families and 56 base variants are individually enumerated in
the CSVs. Implement and verify the following mechanisms as explicit capabilities:

| Family cluster | Distinguishing construction/motion/operation |
|---|---|
| Wooden, Wooden Wild Mouse, Side Friction, Virginia Reel, Reverser | Lattice supports and legal tight turns; spinning independent of banking; no-upstop/derailment rules where applicable; reverser-specific bogies and empty components. |
| Spiral, Junior, Mini, Mine Train, Mine Ride, Steeplechase | Family-specific curves/slopes/lifts, vehicle fitting, supports and restraint poses. Visual timber does not make the family Wooden. |
| Steel Wild Mouse | SMC1/SMC2 versus WMSPIN share original slot 54 but differ in tight-turn/slope groups and controlled vehicle spin. Spin and bank are separate states; a modern Spinning Wild Mouse descriptor is a crosswalk, not an extra original family. |
| Looping, Corkscrew, Twister, Giga, Vertical Drop, LIM | Inversion availability, bank transitions, chain/cable/launch mechanisms, block operation and holding brakes. Modern extra track groups are separately classified. |
| Suspended Swinging, Mini Suspended, Inverted, Compact Inverted, Inverted Hairpin | Overhead swept clearance, swinging body versus fixed seats, family-specific bank and inversion capability. |
| Stand-up, Flying, Lay-down, Multi Dimension, Heartline Twister | Standing restraint posture; prone/inverted state; independently rotating seats; special roll topology. Seat pitch is not rail inversion. |
| Bobsleigh, Water Coaster | Trough/no-upstop dynamics or rail/channel transitions. Water Coaster does not require terrain water everywhere. |
| Reverse Freefall, Air Powered Vertical, Inverted Impulse | Signed speed, launch/shuttle, rollback, open ends, station-return and rollback safety rather than closed-circuit-only motion. |

Parameter records must include native unit/domain, family default/range, vehicle
override and evidence. Cover mass, ordered component spacing, wheelbase, traction,
rolling/air resistance, acceleration/braking/lift/launch, spin/swing/seat pitch,
safe derailment/stall conditions, G-force sampling, geometry length/time/speed,
E/I/N ratings, support/build/refund/upkeep, dispatch/inspection/reliability and
pricing/value. Do not label the metadata mass field kilograms or spacing metres
until conversion is verified. Known original offsets in reconstructed code do
not constitute original execution evidence.
Canonical-family descriptor parameters are not invariants for every converted
variant. The separate [descriptor records](descriptor-parameters.csv) retain
reconstructed Hypercoaster versus Corkscrew support limits 55/28, Hyper Twister
versus Twister 61/40 and Monster Trucks versus Car Ride 18/6. Resolve the selected
variant's supported construction, motion and limits before applying a family
fallback, and verify those reconstructed distinctions against the original.

Four-seat wooden variant PTCT1 has native component mass 540, spacing 209184 and
2–7 cars; PTCT2 differs in mass, spacing and car count. Reverser has passenger and
empty bogie components; Splash Boats has helper components. Summing `numSeats`
over components or multiplying every component by a generic capacity is wrong.
`numSeatRows` is sprite/loading metadata, not an automatic 3D seat layout.
[PTCT1 metadata](https://github.com/OpenRCT2/objects/blob/978f596972c1163dc670d853dd6add4766f10dbd/objects/rct2/ride/rct2.ride.ptct1.json).

Train composition and fitting use ordered front/body/rear/empty components and
the shortest station. Dispatch requires load fraction/any load, minimum/maximum
wait, departure option, station synchronization and available block. One free
block is reserved. Reconstructed wait settings 0–250 have native time semantics;
minimum/maximum defaults 10/60 are comparison seeds. The modern quarter-load
rounding change is explicitly not vanilla evidence. Queue ownership is per
station, and admission/payment must occur once at the authoritative transition.

Ratings contain excitement, intensity and nausea separately, with family bases,
vehicle adjustments, length/drop/speed/G/inversion/duration modifiers, proximity,
scenery/shelter, requirements and penalties. Raw G-force or a single thrill score
cannot stand in for these. Exact original fixed-point arithmetic remains open.
[Rating reference](https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/ride/RideRatings.cpp).

## Water, transport and course rides

| Attraction | Required distinction; metadata capacity examples |
|---|---|
| Log Flume / Rapids / Splash Boats / River Rafts | Channel flow, lift/drop/splash, log reverser, raft spin and shelter; 4/log, 8/raft, 16/Splash boat, 4/River raft. Flume is not blanket terrain-water placement. |
| Dinghy Slide | Two-person slide, descent, swing/stall behavior; its operation differs from a flume boat. |
| Boat Hire | Guided course or free-water dock/return; canoe/row/bumper/trike 2, swan 4, jet ski 1. A closed rail circuit is not universally required. |
| Submarine / Water Coaster | Five-person powered submerged course versus six-person rail/channel coaster; separate water-height rules and poses. |
| Railway / Monorail / Suspended Monorail | Multiple stations, destination boarding/unloading, circuit/shuttle, ordered empty locomotive/tender/end cars; differing coach capacities. |
| Chairlift / Lift | Cable spacing and terminal behavior, two seats/chair; 3×3 tower/cabin with 16 seats and object-specific breakdown exemptions. |
| Car Ride / Ghost Train / Helicopters / Cycles | Guided powered course, differing seats, shelter and effects. |
| Go Karts | One seat, race laps, overtaking/finish versus continuous circuit. |

## Fixed-footprint and walking attractions

The following are reconstructed footprints/capacities; original occupancy,
boarding cadence and timing still need observation. Capacities are passenger
places/session, not decorative mesh counts.

| Attraction | Footprint | Places | Operation |
|---|---|---:|---|
| Carousel | 3×3 | 16 | Load, rotate, ramp down; passenger mounts and gates. |
| Ferris Wheel | 1×4 | 32 | Indexed pairs/boarding, forward/backward; gravity-hanging gondolas. |
| Pirate Ship | 1×5 | 16 | Progressive swing cycle. |
| Inverter Ship / Magic Carpet | 1×4 | 12 | Inverting swing / articulated cycle. |
| Twist | 3×3 | 18 | Central and secondary rotation, load/stop phase. |
| Enterprise | 4×4 | 16 | Rotation plus tilt. |
| Top Spin | 3×3 | 8 | Beginner/intense/berserk programmes. |
| Dodgems / Flying Saucers | 4×4 | 12 | One-seat participants, timed motion/collision. |
| Space Rings | 3×3 | 4 | Independently moving rings. |
| Simulator / 3D Cinema | 2×2 / 3×3 | 8 / 20 | Film choice, indoor timed session. |
| Circus / Haunted / Crooked House | 3×3 | 30 / 15 / 5 | Timed indoor occupancy. |
| Spiral Slide | 2×2 | 1 active slider | Admitted participants and repeated/unlimited slide mode are separate. |
| Observation / Launched Freefall / Roto Drop | 3×3 + height | 20 or 32 / 8 / 16 | Cabin/tower height, guided motion, launch/drop and loading. |
| Maze / Mini Golf | Walking topology | Participant limit | Cells/holes, people and balls; not trains or generic cyclic animation. |

[Flat-ride topology reference](https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/ride/ted/TED.FlatRide.h).
The visual proposals incorrectly gave Twist 2×2 and Ferris Wheel 4×4: those
dimensions are rejected. A single visual phase is insufficient for all rides;
the worker owns participant/cycle/seat/articulation state, and the renderer only
interpolates it. Original object exemptions override generic family maintenance.

## Delivery and acceptance

Introduce declarative content identity first, then separate topology, composition,
operation, motion, measurement/rating and presentation seams. Preserve atomic
construction/money rejection, queue/seat uniqueness and deterministic save
continuation. Expand the current closed-course/one-train/one-station model in
bounded capability batches. Renderer interpolation and authored seats must agree
with every authoritative passenger, including more than two riders per car.

Acceptance cases R01–R08 in [the gap register](../../planning/fidelity-gaps.md)
discriminate wooden/steel legality, overhead collision, block/dispatch, launch
rollback, rail/water transitions, free-water return, destination unloading and
fixed-ride passenger/cycle ownership. Compare against original observations
before claiming parity; remote candidate correctness checks can proceed earlier.
