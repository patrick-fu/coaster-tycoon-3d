# One independent Carousel beside the saved mixed coasters

Root owns the next fixed-ride slice, starting at mixed main10fba9b. Logical investigation uses established GPT6.1 Sol Max; isolated art uses AGY. All runtime/export/checks stay on Grok Bot; WD retains masters/evidence. The complete programme remains required.

## Evidence

Pinned base mgr1 has16 seats; expansion mgr2 has32 and is excluded. The reconstructed descriptor uses flatTrack3x3/rotation. Exact original timing, seating, boarding and clearance remain unobserved. The publisher manual supports paths, load controls, tickets and maintenance. Every number below is an independent project candidate. Original-reference MGR1 stays unavailable.

Chris Sawyer's external rct-render-2.jpg is an original RCT object render, not RCT2-exclusive retail evidence or a texture licence. Observe its yellow/cream radial canopy, red/gold framing and sculpted horses. Author new geometry with permitted CC0 material inputs; do not redistribute original pixels in the game.

## Finite behavior

Distinct independent Carousel family/variant/timed-rotation identities. A complete fixedProfiles['independent.carousel-v1'] supplies its own placement/seat/cycle/pricing record, not fake track or inherited coaster motion. Add a fixed body/ride and CarouselSession with16 ordered seats, loading/running/unloading, phaseTick and completedCycles. Keep common instance/status/price/income/queue/breakdown/inspection fields. Resolve actual ride access and seat ownership through only the two new seams needed by guests; coasters keep Train/course behavior unchanged.

| Candidate | Contract |
| --- | --- |
| World | Existing4m tiles/40Hz |
| Foundation | Owned dry level3×3, nine full-mask cells |
| Envelope | Native[h,h+64]; all actual static/rotor/participant bounds must fit |
| Seating | FIFO/lowest free slot; at most one board per8 ticks |
| Dispatch | At least one paid rider; min80/max240 ticks; full after minimum or partial at maximum |
| Cycle | Accelerate80/cruise880/decelerate80 ticks; two revolutions, peak5rpm |
| Indexed law |5760 angle units/turn; accel floor(12*t*t/160); cruise starts480; decel starts11040 and adds12*u-floor(12*u*u/160); endpoint11520/home0 |
| Unload |40 ticks at home with safe public exit; once per participant |
| Money | Build2000, each portal50, default ticket10, max100; upkeep100 at existing fortnight boundary, integer money units |
| Maintenance | Inspection interval16384, inspection160, repair200; existing staff paths/patrol |

Board atomically commits queue removal, cash/spending, seat ownership, ride income and park sales once. Dispatch does not charge. Testing may rotate empty; open mode has no phantom riders/repeated empty paid cycles. Closing stops admission but finishes paid riders; repricing affects future boards. Breakdown freezes saved progress until a reachable mechanic repairs it. Inspection reserves an empty stationary loading interval. Internal pedestrian boarding and vertical horse bobbing are outside this first contract.

Empty open loading keeps phaseTick0; the first successful paid board starts the
80/240 wait. Already paid loading/running riders finish under closed/testing;
an already started empty test finishes at home when closed. Entering unloading
increments completedCycles once; blocked unloading saturates at40 and retains
all owners until a safe public exit permits one unload/history update. Body and
portal edits require closed, empty seats, loading at home; angle0 alone is
insufficient because a running session crosses it mid-cycle. Removing only an
approach path remains legal and exercises blocked unload/recovery.

Fixed admission explicitly checks open, breakdown/maintenance, reachable access,
cash and fare preference, without a fabricated measured Train/G-force gate.
The candidate successful unload uses the existing common ride happiness reward
and zero additional carousel nausea, both declared candidate policies. A single
staff.job owns inspection: only empty/home/loading work blocks boarding, and
fire/lost access/demolition release it. Repair may work on occupied broken
mid-cycle sessions and resumes their preserved progress.

Demolition permits only a closed empty indexed ride. Add retiredRideIncome; retire revenue, detach its queues, evacuate incoming targets, cancel jobs and clear deleted lastRide references while retaining spending/counts/timestamps. Remove body/portals atomically and allocate a new instanceId on slot reuse.

Detach all Path.queueFor records to public, clear deleted destination/queueRide/
navigationRide/portal references, reroute with public permissions and increment
topologyRevision. Reconcile retiredRideIncome plus live ride incomes to cumulative
rideSales; guest spending plus departedSpent still equals rideSales plus shopSales.
Carousel defaults/max ticket/upkeep are used in create/price/load/charge; existing
steel and wood continue under their exact receiving numbers. Seat ownership
validation covers Train and CarouselSession together, with deep copies on
advance/view. Legacy1m/1000Hz receivers may have no fixedProfiles; migration must
not inject the incompatible4m/40Hz candidate.

Proposed save10/content3/protocol3 validates v9 entirely against its exact receiving projection before adding empty sessions, zero retired income and explicitly supplied fixed profiles. Preserve all steel/wood numeric records, prior state/history and golden continuation. Default cross-runtime Rules portability stays separate.

## Frozen authoring datums

GLB metres, unit scale, +Y up/+Z front. CarouselRoot is the footprint centre at native offset[48,48,0] from minimum tile. At direction0, authored(X,Y,Z) maps to SIM(Z,-X,Y). Root corrected the investigation's swapped portal local X signs before art dispatch.

DeckRoot and RotorRoot at[0,400,0]mm; Seat_00..Seat_15 are rotor children, hipY1200mm relative to rotor/Y1600mm from root. Horses/seat supports rotate; roof/centre column/foundation remain static. Positive angle moves local+Z toward+X. Use literal integer default coordinates, not generated trig defaults.

| Outer/inner slots | OuterX,Z mm | InnerX,Z mm | Outer/inner yaw° |
| --- | --- | --- | --- |
|00/01|0,4200|1033,2494|90/112.5|
|02/03|2970,2970|2494,1033|135/157.5|
|04/05|4200,0|2494,-1033|180/202.5|
|06/07|2970,-2970|1033,-2494|225/247.5|
|08/09|0,-4200|-1033,-2494|270/292.5|
|10/11|-2970,-2970|-2494,-1033|315/337.5|
|12/13|-4200,0|-2494,1033|360/382.5|
|14/15|-2970,2970|-1033,2494|405/427.5|

Direction0 entrance tile(x-1,y), exit(x-1,y+2), both inward direction0; approaches(x-2,y)/(x-2,y+2) with entrance ride-owned queue/exit public. Rotate sockets about footprint centre for four directions. Each portal is outside the body and reserves candidate[h,h+24], with no blanket same-ride exception. Portal.station references the real fixed body, not fake station track.

| Datum | Authored local mm |
| --- | --- |
|EntranceBuildingRoot|+4000,0,-8000|
|ExitBuildingRoot|-4000,0,-8000|
|EntranceDeckInterface|+4000,400,-6000|
|ExitDeckInterface|-4000,400,-6000|

Actual floor/gate/stair transition qualification is separate from logical access. First model task authors body/deck/rotor/seats plus edge socket empties only; outside portal buildings follow a separately frozen transition contract. Do not add audience mannequins.

## Required checks

Four directions, footprint edge/terrain/water/foreign obstruction, atomic stale/insufficient-funds receipts; slots0/15 and two null patterns, full16/rejected17th owner, FIFO/no duplicate cross-ride owners; partial load/reprice/closure/breakdown/exit loss; pause/different tick batches at ramp boundaries, home/blocked unload/mechanic; paid demolition/slot reuse; actual worker/UI/file/IndexedDB and unit model anchors/bounds/picking/lifetime. Existing v7/v8 golden and frozen actual finalv9 mixed fixture continue unchanged without Carousel. Original, scale/GPU and Patrick visual/play acceptance remain open.
