# Guest, Queue, and Staff Dependency Model

## Evidence boundary

This is a source inspection of OpenRCT2 commit `11513222890717e81431c83a28aafb7555f2ccd2`, not a vanilla RCT2 conformance result. OpenRCT2 explicitly advertises improved guest/staff AI. Its source also marks the map-versus-toy candidate-selection change and queue-loop recovery as fixes. These behaviors need original-game comparison. No executable, browser simulation, or performance benchmark was run. [Project boundary][readme]; [selection correction][choice]; [queue recovery][queue-update].

## State and ownership

`Peep` owns location, next tile, destination/tolerance, state/substate, current ride/station/seat, energy, and route history. `Guest` adds intended destination, queue successor, needs, inventory, cash, ride memory, and thoughts; intended ride and current queue membership are distinct. `Staff` adds role, orders, patrol, call timer, and service statistics. [Shared state][peep-fields]; [guest state][guest-fields]; [staff state][staff-fields].

| State family | Trigger and dependent state |
| --- | --- |
| Walking; entering/leaving park | Destination may be ride, facility, park entrance, spawn, or aimless movement. [Routing][routing] |
| Queuing → queuingFront | Join a facing queue banner; associate ride/station and successor. Front detection advances to entrance handling. [Join][join]; [front][queue-update] |
| Entering/on/leaving ride | Entrance, vehicle/seat, and exit substates; unsuccessful boarding can reinsert at queue front. [Substates][states]; [rejoin][rejoin] |
| Sitting, watching, buying, usingBin | Separate movement/action states alongside walking. [State vocabulary][states] |
| Falling, picked, reset (`one`) | Distinct exceptional states; reset validates a path before resuming walking/patrolling. [Recovery][recovery] |
| Patrolling → handyman service | Enabled orders and local litter, grass, bins, or aged flowers trigger service. [Detection][service] |
| Answering/headingToInspection → fixing/inspecting | Ride assigns mechanic and station; arrival and service substates complete the job. [Assignment][assignment]; [service completion][completion] |

## Decisions and time

Ride selection ranks eligible, unridden, considered rides by excitement; maps expand consideration beyond nearby track/tall rides. Evaluation depends on opening/breakdown status, queue room, cash/vouchers, previous ride, ratings/preferences, weather, crashes, and value. Intent and arrival checks differ; entrance price checks can reject a previously accepted guest. Needs generate facility destinations; consumption changes inventory and motives. Ride entry/exit updates satisfaction, happiness/nausea, memory, and possible return intent. Thoughts age independently. [Selection][choice]; [evaluation][evaluation]; [entrance][entrance-price]; [needs][needs]; [ride feedback][feedback]; [thought aging][thoughts].

Every peep-update pass traverses all guests and staff, with additional work staggered by entity-list index modulo 128; guest motive/decision branches further use 512/1,024-tick masks. Movement/state dispatch uses accumulated step progress. Therefore population, active states, periodic decisions, and arrival density are separate workload variables. [Scheduler][scheduler]; [guest cadence][cadence]; [step dispatch][dispatch].

## Paths and queues

Navigation reads tile height/slope, permitted edges/banners, wide-path status, and ride entrances/exits. Ride routing chooses a station then walks its queue outward to target the queue end; foreign queues can be excluded. Searches retain junction history and have role/map/leaving-dependent junction limits plus tile budgets. Failed ride search resets its goal and falls back to aimless movement; dead ends trigger lost/destination checks. [Topology][path-topology]; [search bounds/history][path-search]; [ride routing/recovery][routing].

Queue topology and membership require separate updates. Connection edits constrain queue neighbors, clear/rebuild ride/station associations, and move the entrance banner along the chain. Joining updates `station.lastPeepInQueue`, `guestNextInQueue`, and `queueLength`; successor proximity controls spacing. Closure, path loss, changed association, or impatience can remove a guest; removal may traverse the station's linked list. [Connectivity][queue-topology]; [reassociation][reassociation]; [membership][join]; [spacing/removal][queue-list]; [abandonment][queue-update].

## Staff and dependency map

Patrol eligibility includes ownership/rights and an optional area. Handymen detect work after reaching a patrol destination, check enabled orders, and avoid a tile already being serviced. Entertainers locally affect happiness and queue timers; nearby security suppresses attempted vandalism. [Patrol][patrol]; [detection][service]; [entertainment][entertainment]; [security][security].

Inspection intervals and breakdown flags drive mechanic calls. Assignment filters role, current task, orders, patrol, and position, then minimizes Manhattan distance; it does not establish route reachability. Routing targets the station exit, with entrance fallback; failed search retries, and prolonged travel can return the ride to calling. Completion clears inspection state or fixes breakdown and updates statistics/reliability. [Inspection clock][inspection]; [assignment][assignment]; [mechanic routing][mechanic-route]; [travel timeout][mechanic-timeout]; [completion][completion].

The dependency cycle is map topology → destinations/queues/service access → ride boarding and maintenance → guest motives/spending. Guest payment changes pocket cash, expenditure category, park cash, and ride income; staff population produces wage payments. Rendering must expose these evolving states without becoming their clock. The cycle/rendering statement is a proposed implementation obligation, not a selected architecture. [Ride payment][payment]; [guest ledger][guest-ledger]; [cash ledger/wages][finance].

## Workload and observable checks

Proposed measurements should vary guest/staff state mix, ride count and map possession, layered tile density, junctions/loops/wide paths, queue length and departures, clustered guests around entertainers, simultaneous mechanic calls, and topology-edit bursts. This follows the traversals above; no target capacity or replacement algorithm is established.

Useful experiments: disconnect an occupied queue; close or reprice its ride; exhaust boarding availability; remove a park exit; separate a mechanic from an assigned station within its patrol; accumulate litter/full bins. Record membership/count consistency, chosen destinations, reroutes, thoughts, boarding/payment, call-to-arrival/completion, and unresolved maintenance. These are proposed reproducible checks, not observed successful runs. Vanilla decision cadence, tie-breaks, exact thresholds, and changed AI remain unresolved.

[readme]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/readme.md#L66-L68
[peep-fields]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Peep.h#L345-L414
[guest-fields]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Guest.h#L289-L350
[staff-fields]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Staff.h#L42-L80
[states]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Peep.h#L47-L121
[recovery]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Peep.cpp#L774-L923
[choice]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Guest.cpp#L1760-L1880
[evaluation]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Guest.cpp#L1882-L2168
[entrance-price]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Guest.cpp#L2571-L2610
[needs]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Guest.cpp#L724-L1075
[feedback]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Guest.cpp#L1674-L1739
[thoughts]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Guest.cpp#L5143-L5201
[scheduler]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Peep.cpp#L191-L228
[cadence]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Guest.cpp#L833-L989
[dispatch]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Guest.cpp#L5237-L5298
[path-topology]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/peep/GuestPathfinding.cpp#L817-L887
[path-search]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/peep/GuestPathfinding.cpp#L1224-L1315
[routing]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/peep/GuestPathfinding.cpp#L1875-L2121
[queue-topology]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/world/Footpath.cpp#L724-L974
[reassociation]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/world/Footpath.cpp#L1547-L1580
[join]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Peep.cpp#L2039-L2139
[queue-list]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Guest.cpp#L7437-L7546
[queue-update]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Guest.cpp#L5627-L5738
[rejoin]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Guest.cpp#L3877-L4009
[patrol]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Staff.cpp#L59-L70
[service]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Staff.cpp#L1476-L1895
[entertainment]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Staff.cpp#L889-L953
[security]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Guest.cpp#L6240-L6307
[inspection]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/ride/Ride.cpp#L1025-L1058
[assignment]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/ride/Ride.cpp#L1387-L1567
[mechanic-route]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Staff.cpp#L677-L749
[mechanic-timeout]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Staff.cpp#L1263-L1412
[completion]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Staff.cpp#L2546-L2644
[payment]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Guest.cpp#L3814-L3831
[guest-ledger]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Guest.cpp#L2246-L2274
[finance]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/management/Finance.cpp#L92-L125
