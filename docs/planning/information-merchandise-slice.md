# Four-counter information kiosk with two permanent products

Status: finite candidate contract accepted by Root after independent static
Design/Drift, material re-review and the targeted refusal-loop correction.
Old13 oracle is the next production gate; no implementation or runtime pass.
Base main524cf01/executable1bdec0d is unchanged, using save13/content6/protocol6.

## Player outcome and scope

A player builds and opens an information kiosk, independently prices Map and
Umbrella, sees their actual sales/revenue/stock margins, and inspects those items
owned by a guest. Each visit completes at most one purchase. Ownership survives
save continuation, vendor closure/demolition and slot reuse, and coexists with
unfinished Burger/drink or packaging. Four adjacent public-path counters work.

This finite contribution to broad P4 does not close its native40/41 dependencies
or the full catalogue. Map navigation, rain/temperature exceptions, vouchers,
purchase happiness/satisfaction, outdoor umbrella animation and original numeric/
random agreement remain required separate work. No voucher capability exists in
the current authority; merchandise cannot invent or consume a food/drink voucher.

Root owns authority/integration; AGY owns disjoint authored kiosk/product/frontend
presentation. The kiosk must use a qualified unit-scale editable asset and its
numeric receiving profile before it becomes playable Library content. An
authority-only identity or isolated model is not playable catalogue acceptance.
Human style and representative hardware/park-scale gates remain open.

Use one finite information placement profile reserving32 native height units on
dry ground, with the existing4m/tile unit mapping and eight validated model anchors.
Old facility reservations stay unchanged; no geometry fitting or collision-rule
enlargement is allowed. Availability requires both receiving merchandise/profile
rules and qualified presentation, following ADR0004's explicit capability boundary.

## Candidate products and fixed color

| Product | Stock per sale | Default price | Non-rain value | Max price |
| --- | ---: | ---: | ---: | ---: |
| Map | 1 | 6 | 7 | 1000 |
| Umbrella | 20 | 25 | 35 | 1000 |

These are labelled reconstructed seeds from the pinned products-reference.csv;
money units are the project's existing tenths, with no further multiplication.
Use only independent Map/Umbrella IDs and one optional merchandise Rules profile,
absent by default. Fixed vendor color uses original IDs0..31; default11 is an
independent candidate choice. No random-color feature or color RNG is introduced.
Owned Umbrella copies the vendor's current saved color. An old purchase is never
recolored by later vendor data, another purchase or slot reuse. IDs alone do not
establish original visual color agreement.

## Visit selection, refusal and transaction

Preserve existing amenity and ordinary need-service priority, then consider an
information visit before rides. Candidate counters are ordered by route distance,
facility ID and local counter ID. Selection and walking draw no merchandise RNG.
Reject impossible products with a pure prefilter: owned item, insufficient cash,
deterministic Umbrella ride/happiness gate or discounted excess price above7.
At least one product must remain possible for a visit to become a target.

Save only the chosen local counter0..3 with the existing facility reference; do
not duplicate an absolute approach or the fixed Umbrella-first product order.
Derive the counter from facility direction. Walking goal and buying point must
agree with that counter's same-height reachable public path. Ordinary facilities
keep their existing single counter and exact old behavior.

At actual service completion, recheck receiving profile, live/open facility and
the chosen lawful counter. Try Umbrella, then at most one Map fallback. Recheck
ownership/current price/cash for each product. A personal refusal can fall back;
closed/path-lost/unavailable/capacity failure cannot fabricate another visit or
transaction. Never reroute a committed counter to a newly reachable side.

Candidate demand uses hRaw=floor(happiness*255/1000). Non-rain Umbrella requires
at least3 completed rides, then one existing saved RNG draw0..127 with
115+draw<=hRaw. Map exempts this ordinary souvenir gate. For price above value,
halve the positive difference with integer truncation at hRaw>=128, and again
at hRaw>=180; one draw0..7 accepts iff difference<=draw. No value draw is needed
for price<=value; a possible Umbrella still requires its demand draw. No
merchandise draw is needed for duplicate/cash/deterministic impossibility. Samples
occur once per service attempt, never during inspect/quote/import/walking.
Mapping, preflight order and sample timing are independent candidate choices;
upstream's good-value thought/happiness draws are not claimed here.
Purchase reads the mapped happiness but does not change happiness or ride
satisfaction in this finite candidate.

After both products are personally refused, clear the visit and immediately
choose ordinary activity once with merchandise excluded. Existing goals/
destination preserve that activity across ticks/save. This gives rides a real
selection opportunity without a new cooldown, last-vendor ledger or saved flag.
Do not borrow thought/lastRideTick/queuedAt as a hidden scheduling field.

Preflight all safe integer bounds with BigInt before committing payment, stock,
the one product account and immutable guest ownership together. A capacity
exception retains the existing whole-advance rollback semantics, including
demand and ordinary activity RNG. Free sales still charge stock; failures grant
neither ownership nor accounts. Normal simulation pause stops service/time.

## Saved authority, accounts and receiving compatibility

Candidate save14/content7/protocol7 adds permanent guest merchandise separately
from held food/drink/container, legacy wrapper and live vendor identity. Departure
removes the guest's items without refunding booked sales. Counter intent is null
outside an information visit; wrong-counter goal/point or foreign facility rejects.

Information is a strict separate facility union with two {price,sales,income}
accounts and fixed umbrella color. Keep old facilities' exact scalar record.
Do not store duplicate aggregate price/income or derived stock. Retired merchandise
has only per-product {sales,income}; old retiredShopIncome/retiredStock history is
preserved, never redistributed. Active+retired products reconcile with the existing
global revenue and stock ledger. Stock is immutable Rules cost times sales;
0<=income<=maxPrice*sales allows free sales and repricing. Current price does not
reconstruct historical revenue. All products/sums use safe BigInt preflight.

Strictly validate incoming13 against historical content6 positive identity
whitelist, exact old keysets and the old Rules projection before appending empty
ownership/counter/retired accounts. Fix historical12->13 to explicit13/6/old Rules,
not future CONTENT_VERSION or full receiving Rules. Every earlier codec excludes
merchandise capability/identity/fields. Do not replace the whitelist with a
negative 'not detailed' check. Failed imports preserve full state/pause/revision/
quote generation. Old receiving configurations remain valid with profile absent.

Nested accounts, ownership and visit intent are immutable replacements so shallow
advance copies cannot leak a failed batch. Views also copy all nested values;
mutating a returned view cannot mutate authority. No whole-State deep copy,
product entity IDs, duplicate instance guards or general commerce rewrite.

## Required checks and implementation gate

Freeze genuine old13 full and lifecycle-derived partial parks on Grok before any
production edit. Bind old source/runtime/Rules and complete authority/view/audit,
legal nondefault Rules, pause and independent batching. Reuse preserved v7-v12
fixtures. Old13/new-field/identity/Rules smuggling must fail before migration.

Remote authority/worker checks cover actual autonomous Map and Umbrella sales,
one fallback, demand/value refusals, exact31 revenue/21 stock/10 net before separate
operating charges, free/repriced sales, concurrent buyers, all four rotated lawful
counter sides, queue/wrong-height/path-loss rejection, permanent ownership with
held items, retirement/save conservation and detached views. Include Map price39,
value7,cash100,ride0,needGrowth0 with an available ride: pure prefilter consumes no
merchandise RNG and leaves ride selection reachable. An Umbrella random refusal
followed by Map success books exactly one Map sale. Only complete refusal of both
products clears the visit and performs ordinary activity selection; with a legal
ordinary activity available, its goal survives save without immediately revisiting
the kiosk. No goal is fabricated when ordinary activity is unavailable. A later
finance overflow must roll back earlier sale/refusal/goal/RNG/time/ownership in full.

One actual guest must own both products alongside an unfinished consumable or
container, save, survive kiosk removal/slot reuse and retain all three items.
Without required receiving profiles, or with unqualified presentation, information
must be absent from Library and placement must fail atomically.

Actual Classic UI must expose separate product prices and realized margins,
guest items, lawful construction/opening, removal and export/import/reload. Use
authoritative values and the actual worker; no label injection or metadata-only
proof. Qualify source/model/load/picking/disposal/current/public composition on
Grok, consume independent reviews, preserve failures and update PROGRESS before
acceptance. No unchanged native79 or broad catalogue research replay is required.
