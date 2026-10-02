# Original RCT2 Scale and Qualification Workloads

Research date: 2026-10-03. Patrick requested original-game scale alignment,
replacing the proposed 64x64 map, 500 guests and three operating coasters.
Source inspection used OpenRCT2 `11513222890717e81431c83a28aafb7555f2ccd2`
and historical v0.0.6 `2005d68b516d942654afc1a555dc8004a39bb380`.
This report separates legacy-format constraints, reconstructed original
functions and modern extensions. No original executable, simulation,
browser benchmark or commercial asset was acquired or run.

## Original-oriented capacity envelope

| Resource | Source-backed baseline | Evidence boundary |
|---|---|---|
| Map | 256x256 backing grid. Historical active bounds are 15–256 technical tiles per side, or 13–254 practical tiles after the boundary. | Legacy maximum and historical reconstruction; minimum vanilla UI behavior has not been directly observed. [RCT2 maximum][rct2-limits], [historical map window][map-window], [fixed backing grid][map-budget]. |
| Constructed rides and facilities | 255 shared instance slots, IDs 0–254; 255 is null. Shops and service facilities participate in the ride system. | Distinct from catalogue size or coaster-family count. [Inherited limit][ride-limits], [ID sentinel][ride-id], [historical facility types][facility-types]. |
| Selected ride objects | 128 legacy object slots. | Selection budget, not the number of constructed instances. [Legacy object limit][ride-limits]. |
| Entities | 10,000 shared legacy records for guests, staff, vehicle cars, litter and effects. | The separate 15,000-record Classic variant is excluded. [Limits][rct2-limits], [entity union][entity-union], [Classic-dependent reading][classic-reading]. |
| Staff | 200 legacy staff slots, also consuming shared entities. | Staff bookkeeping and total entity availability both apply. [Limits][rct2-limits], [staff arrays][staff-arrays]. |
| Tile elements | 196,608 physical legacy records; historical construction threshold 196,096. | Reconstructed allocator leaves 512 records below physical capacity. [Legacy storage][rct2-limits], [threshold][map-budget], [allocation check][tile-check]. |
| Ride-local records | Four stations and 32 train references per ride. | Record capacity does not prove every ride can operate that configuration. Ride type, station length, blocks and car availability also matter. [Stations][ride-limits], [trains][rct2-limits]. |

Historical initialization creates 65,536 surface records even for a smaller
active map. Subtracting this from the construction threshold leaves 130,560
additional records in that initialized layout; subtracting only the practical
map area would overstate the budget. This is reconstruction evidence, not an
observed original saturation test. [Initialization][map-init], [threshold][map-budget].

A track piece can consume multiple tile elements. Its sequences, occupied
records and rendered geometry must be counted separately. The current placement
action counts sequences before insertion. [Placement capacity][track-capacity].

## Guest capacity and interacting limits

The shared-format constraint is:

`inside guests + outside guests + staff + vehicle cars + litter + effects <= 10,000`.

It does not establish capacity for 10,000 visitors in an operating park.
Cars are individually allocated from the shared registry. [Entity union][entity-union],
[car creation][car-creation].

Historical and current guest-generation functions refuse allocation when fewer
than 400 slots remain. Both carry the original address `0x0069A05D`, but neither
was compared with a vanilla executable here. The check precedes allocation:
exactly 400 free slots can become 399. A fixed 9,600-guest ceiling would be
unjustified, especially with staff, vehicles and guests outside the gate.
[Historical guard][guest-guard-old], [current guard][guest-guard].

Arrival demand is another constraint: the current ride-derived
`suggestedGuestMaximum` influences arrival probability rather than defining
physical capacity. An initialized benchmark population is not evidence that it
would arise or remain naturally. [Demand calculation][guest-demand].

Modern OpenRCT2 expands the practical map maximum to 999x999, ride instances to
1,000, entities to 65,535 and tile elements to 16,776,704. These are not the
original-scale target. [Modern map and tile limits][modern-map],
[modern rides][modern-rides], [modern entities][modern-entities].

## Proposed independent qualification fixtures

No primary-source sample establishing typical populations of running original
parks was verified. These synthetic tiers are measurement proposals inside the
legacy envelope, not accepted capacity caps or observed original workloads.

| Variable | Ordinary tier | Large tier |
|---|---:|---:|
| Technical map side | 128 | 256 |
| Practical map side | 126 | 254 |
| Initialized inside guests | 2,000 | 5,000 |
| Operating coaster instances | 20 | 100 |
| Shop/service instances | 20 | 100 |
| Shared ride slots used | 40 | 200 |
| Staff | 50 | 200 |
| Proposed trains/cars per coaster | 3 trains, 6 cars each | 3 trains, 6 cars each |
| Derived car entities | 360 | 1,800 |
| Guests + staff + cars | 2,410 | 7,000 |

The entity arithmetic fits the nominal budgets, but does not establish legal
tracks, viable demand or performance. Validate the train configuration against
the selected coaster. Generate independent layouts from a versioned recipe and
seed, with dispersed districts and crowded entrance/queue areas. Record track
length, elevation, tile records, junctions, queues and every entity category.
Multiple instances of the initial family test scale without enlarging the
content catalogue.

Test boundaries separately: map edges and ownership; mixed facilities around
255 slots; shared allocation and the 400-free-slot guard; tile placement near
196,096 records, including multi-record pieces. These values come from the
sources above; combining all maxima is not assumed feasible.

Compare simulation-only and simulation-plus-rendering. Record frame-time
distribution, simulation-step timing/backlog, simulated-time versus wall-time,
memory growth, allocation errors and interaction latency. Cover overview,
crowded close views, construction and save/reload. The accepted 1080p,
16 GB integrated-graphics target, 60 FPS aim, 30 FPS floor and normal-speed
simulation remain unmeasured; hardware and browser versions must be fixed.

## Remaining uncertainty

Original runtime minimum-map behavior, exact guest saturation, construction
failure at the tile threshold and simultaneous operation limits remain
unobserved. Source-backed capacities are suitable qualification baselines;
they do not prove vanilla parity or browser performance. Numeric fixture
recipes and the benchmark protocol remain preparation for runtime validation.

[rct2-limits]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/rct2/Limits.h#L17-L48
[map-window]: https://github.com/OpenRCT2/OpenRCT2/blob/2005d68b516d942654afc1a555dc8004a39bb380/src/openrct2/windows/map.c#L35-L38
[map-budget]: https://github.com/OpenRCT2/OpenRCT2/blob/2005d68b516d942654afc1a555dc8004a39bb380/src/openrct2/world/map.h#L239-L240
[ride-limits]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/rct12/Limits.h#L16-L24
[ride-id]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/rct12/RCT12.h#L338-L339
[facility-types]: https://github.com/OpenRCT2/OpenRCT2/blob/2005d68b516d942654afc1a555dc8004a39bb380/src/openrct2/ride/ride.h#L483-L500
[entity-union]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/rct2/RCT2.h#L730-L749
[classic-reading]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/rct2/S6Importer.cpp#L1677-L1679
[staff-arrays]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/rct2/RCT2.h#L1005-L1006
[tile-check]: https://github.com/OpenRCT2/OpenRCT2/blob/2005d68b516d942654afc1a555dc8004a39bb380/src/openrct2/world/map.c#L4138-L4162
[map-init]: https://github.com/OpenRCT2/OpenRCT2/blob/2005d68b516d942654afc1a555dc8004a39bb380/src/openrct2/world/map.c#L371-L400
[track-capacity]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/actions/track/TrackPlaceAction.cpp#L184-L208
[car-creation]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/ride/Ride.cpp#L2964-L2983
[guest-guard-old]: https://github.com/OpenRCT2/OpenRCT2/blob/2005d68b516d942654afc1a555dc8004a39bb380/src/openrct2/peep/peep.c#L7094-L7109
[guest-guard]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Guest.cpp#L7144-L7158
[guest-demand]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/world/Park.cpp#L103-L177
[modern-map]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/world/MapLimits.h#L19-L45
[modern-rides]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/Limits.h#L18-L25
[modern-entities]: https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/EntityRegistry.h#L25-L26
