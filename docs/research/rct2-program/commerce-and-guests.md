# Products, services, guests and staff

Evidence is pinned in [the research index](README.md). Native thresholds, timing,
costs and defaults remain reconstructed comparison seeds. Original manual
support establishes qualitative service/role behavior, not every numeric rule.

## Complete commercial catalogue

The original metadata has 41 shops/services: 23 food stalls, eight drink stalls,
five merchandise shops, an information kiosk, two toilet buildings, an ATM and
first aid. Food stalls sell 20 distinct foods; the whole stall set sells 35
distinct products. Four on-ride photo inventory classes are separate. The
[variant inventory](ride-variants.csv) links every stall to its product(s), raw
clearance and original identity. Two stalls selling chips remain two buildings
and one commodity. An Information Kiosk sells maps and umbrellas; a souvenir
shop sells toys and umbrellas. Do not invent Burger+Fries or Balloon+Toy combos.

Food coverage: burgers, chips, ice cream, candyfloss, pizza, popcorn, hot dogs,
fried chicken, tentacles, toffee apples, doughnuts, pretzels, funnel cakes,
beef noodles, fried rice noodles, wonton soup, meatball soup, sub sandwiches,
cookies and roast sausages. Drink coverage: soft drinks, coffee, lemonade,
hot chocolate, iced tea, fruit juice, soybean milk and sujeonggwa. Merchandise:
balloons, toys, maps, umbrellas, hats, shirts and sunglasses. Time Twister adds
eight stall variants using existing products; expansion coverage is separate.

[products-reference.csv](products-reference.csv) retains stock cost, default
price, normal/hot/cold value, consumption counter, recolor flags and discard
container from [the reconstructed item table](https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/ride/ShopItem.cpp).
These monetary data are tenths of a pound in that reference. Photo's zero table
default is not the actual ride-photo initialization price. Vouchers and admission
are distinct from purchasable products; ten waste/container identities do not
represent ten shop products. No finite shelf/restocking gameplay was established;
stock expense is charged on successful sale, including voucher redemption.

## Transaction and use contract

`Product` defines stable identity, price/value evidence, stock cost, purchase
conditions, satisfaction/consumption, carry appearance, waste and ledger category.
`FacilityVariant` defines products or a service, logical footprint/clearance,
active frontage, permitted prices and use/occupancy. Each Facility owns its
actual prices, open state, users, sales/stock/history and build costs. Project
facilities currently aggregate one price and three generic kinds; that cannot
account for two-product shops or retire their stock history correctly.

Buying is atomic: evaluate affordability/voucher/owned item/unfinished consumable,
weather/value/need and actual counter access; commit payment, stock expense,
sales, inventory and service admission exactly once. Rejection and entity-capacity
failure leave state/RNG/accounting unchanged where the command contract requires
it. Distinguish second-product fallback and concurrent users. Record actual stock
expense by product, not sales multiplied by the facility kind's nominal cost.

Guest inventory persists after a stall is removed: item ownership, colored
balloon/hat/shirt/umbrella, photo ride target, voucher target and current food/
drink/remaining container. Unfinished consumables prevent another consumable.
The reference has rain/temperature restrictions and duplicate ownership rules;
map and rain-umbrella behavior differs from ordinary souvenirs. Exact nausea,
happiness, temperature and ride-count thresholds require original comparison.
Coffee restoring energy is not verified by the pinned source; omit that claim.

Consumption advances on eligible motive updates and pauses while riding in the
reference. Food changes hunger, thirst and toilet pressure; drink changes thirst.
Different products produce distinct containers or none. Full/absent/vandalized
bins, guest disposal behavior and path location determine litter; buying does
not instantly create a universal wrapper. Outdoor rain gives umbrella appearance
priority, while other owned items persist in inventory. These phases/appearance
priorities need save continuity and an explicit renderer projection.

The information kiosk exposes four active counter sides; ordinary shops normally
have one frontage. Original metadata's 32–64 clearance values are native
reservations, not metres or a complete authored bounding box. A generic service
centre/buildable bank was not established. Bank borrowing belongs to finance.

## Services

Toilets and first aid admit guests into explicit in-facility states with capacity,
queue/availability, gradual relief/recovery and exit routing. They do not give
instant complete relief at the counter. Toilets can charge a fee; first aid is
free in the reference. Neither sells consumable stock. Reconstructed descriptor
operation settings do not prove effective original service occupancy.

ATM withdrawals add guest pocket money, not park sales. The reconstructed amount
is £50, with eligibility and free-use rules requiring comparison. Reconciliation
becomes initial guest cash + withdrawals − purchases, including redeemed vouchers
and entry payment. Preserve treatment/consumption/withdrawal state across save,
removal and load; do not manufacture income or stranded users.

## Guest contract

Traits, motives, thoughts, history and decision state are separate. Reconstructed
happiness/nausea are byte-scaled actual/target values; energy has distinct actual/
target ranges. Hunger/thirst measure remaining satiation, so low raw values mean
need. Toilet pressure grows. The project's rising 0–1000 needs can be a display
mapping, but require explicit inversion/rounding and cannot prove original rules.
Force tolerance alone is not intensity preference range plus nausea tolerance.

Retain typed thoughts with targets/freshness, previous/favourite rides, visited
ride/object-type history, cash/spending and inventories. Guests begin outside,
head toward an entrance, pay once, enter, consider attractions and eventually
leave via park gates. Current automatic admitted spawning and departure only at
zero happiness miss admission demand and ordinary dissatisfaction/recovery.

Ride choice evaluates excitement/intensity/nausea, value/cash, history, happiness,
weather/shelter, crashes and transport destination behavior. Satisfaction can
decrease after a bad ride; always adding happiness is insufficient. Maps affect
navigation/choice but do not prove perfect park-wide shortest-path knowledge.

Navigation must represent slope/height/edges, banners, wide paths, crossings,
search/history and lost/return behavior. Queue ownership is per station with
successors, patience and entertainment. Boarding/payment/seat/restraint phases
must agree with actual train capacity and unload to the selected station exit.
Bench seats and bin compartments are path-edge local resources; litter/vomit
age/exposure, vandalism and recovery feed park cleanliness/rating.

[Guest state reference](https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Guest.h),
[navigation reference](https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/GuestPathfinding.cpp).

## All four staff roles

| Role | Orders and operational state |
|---|---|
| Handyman | Sweep paths/vomit, empty bins, mow grass, water flowers; local target, path travel, work progress and patrol area. |
| Mechanic | Inspect and repair; call assignment, reachable station exit, travel, inspection/individual breakdown work, reliability and downtime. |
| Security | Patrol, vandalism prevention and path-furniture condition. |
| Entertainer | Costume, patrol and local guest/queue entertainment. |

The present two-role global task selection/fixed-duration work is a starting
point, not parity. Eligibility/distance is not proof of an actual route. Breakdowns
need reason, pending/active state, age/reliability, inspection due, repair history
and object exemptions. The ATM, lift and individual variants may override family
rules. No staff teleport or immediate mechanic repair is inferred from a UI button.

[Staff reference](https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/entity/Staff.cpp).
Security/entertainer simulation precedes active UI controls; visible uniforms do
not establish behavior. Preserve four role-specific jobs, patrol and ownership
when saving, relocating or dismissing staff.

## Modern differences and save migration

The reference explicitly changes toy→map behavior, queue successor handling,
bin RNG and rain/scenery coverage; it also contains a guessed low-cash energy
condition. Record comparison cases instead of treating these as vanilla rules.
The current state is version 7, with a limited version-6 scenery-free migration.
New inventory, targeted thoughts, queue/seat phases, treatment, withdrawal totals,
staff orders/jobs and reliability require explicit version/profile migration.
Nested state must survive the engine's transaction clone and rejected commands.

Cases C01–C06 and G01–G05 in [the gap register](../../planning/fidelity-gaps.md)
cover transaction accounting, containers/weather, service continuity, admission,
bad-ride recovery, height-aware routes, local park service and all four roles.
