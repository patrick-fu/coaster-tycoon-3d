# Two consumable stalls with owned use and typed disposal

Status: finite contract accepted by Root after independent Design/Drift review
and actual old-v11 oracle/retention acceptance. Working authority is implemented
and passes262 canonical kernel checks; frontend/player proof remains pending.
Current public implementation remains save11/content4/protocol4, source89030f9.

## Player outcome and applicable prerequisites

A player builds and prices a Burger stand and a Soft-drink stand, observes actual
purchases and their different product margins, inspects an unfinished item owned
by its buyer, saves and continues its use, then sees its empty box or can deposited
in a bin or left on a public path. Closing or demolishing the vendor does not
delete its already purchased item. The three generic facilities keep their exact
previous behavior, identities and accounting.

This independent candidate contributes a bounded subset of C02/C03/F04. It does
not implement C01's multi-product shop or the 41 original commercial buildings,
nor close broad [P4](https://github.com/patrick-fu/coaster-tycoon-3d/issues/42).
That broad ticket retains its open native #40/#41 dependencies. A finite task
requires the merged identity/save foundation (PRs #48/#61), actual Library (PR #50),
mixed wooden foundation (PR #64), completed Carousel (#65), finite Flume (#69/PR #72), source
research (#31/#33), and an accepted immutable old-v11 oracle. The original
R01–R08/S05, representative GPU and human gates remain open. Independent contract
review must confirm these applicable dependencies before the finite task is
claimed or production begins; no broad native edge may be removed.

Use the existing independently authored stall footprint and procedural silhouette
for this slice. AGY owns the bounded frontend/product and waste presentation after
Root freezes the actual worker interface. This is not bulk visual production,
new detailed-stall-art acceptance or satisfaction of P1's human style gate.

## Evidence and candidate parameter contract

Behavioral seeds come from retained upstream revision
`11513222890717e81431c83a28aafb7555f2ccd2`, particularly `Guest.cpp:724–763`
and `Peep.cpp:200–214`, and the pinned
[product reference](../research/rct2-program/products-reference.csv).
They are reconstructed evidence, not direct observed-original numerics or copied
implementation. Independent code and resources follow [ADR0001](../adr/0001-independent-mit-implementation.md).

| Independent product | Stock per sale | Default price | Initial use counter | Discard container |
| --- | ---: | ---: | ---: | --- |
| Burger | 5 money units | 15 | 150 | Empty burger box |
| Soft drink | 3 money units | 12 | 100 | Empty can |

Money units are the project's existing tenths. These labelled seeds do not
establish a currency conversion or original-price observation.

The new optional finite commerce profile defines these two immutable product
descriptors, 128-tick eligible cadence, decrement3 and explicit 0–1000 mapped
effects. Existing `ServiceRules` values and generic `needTicks:256` do not change.
Stable guest-ID phase follows the existing project convention; upstream uses
current guest-list position. This difference is an explicit candidate choice.

On each eligible call, subtract3 with a zero clamp. Burger reduces rising hunger
by27, increases thirst by12 and bladder by8; drink reduces thirst by27. Clamp each
need to0–1000; apply the effect even on the final partial decrement. There is no
new energy effect. These nearest-rounded mappings are candidate choices from
raw upstream255-range effects, not original numerical agreement.

`150` and `100` are counters, not ticks. They require50 and34 eligible calls.
Elapsed use is the initial phase wait plus49 or33 subsequent128-tick intervals;
riding or being stranded extends it. Consume before purchase handling so a new
purchase is first used at its next eligible call. Ordinary walking, queueing,
buying, resting and leaving may consume; riding and stranded guests retain the
item without use. Pausing the park stops use and all other simulation time.
Preserve existing generic need growth first, then apply eligible consumption,
then existing non-riding recovery/disposal/purchase handling.

## Ownership and minimal authority

Each new constructed facility sells one immutable product resolved from content.
Existing facility `price`, `sales` and `income` represent it directly. Keep the
existing facility record shape. Actual stock expense is exactly `sales ×` that
product's stock amount under immutable saved Rules, computed with safe BigInt
arithmetic. This avoids duplicating a derivable stored counter. The same selected
stock amount must drive every sale, retirement and active-plus-retired ledger
check. A different receiving Rules profile cannot reinterpret past stock cost.

Add a guest-owned finite held state: no item, unfinished product with its product
identity and remaining counter, or discard container with its identity and
acquisition tick. No live vendor/slot reference belongs in that ownership.
Returning to a reused slot cannot replace or delete a previous purchase.
New typed ground litter carries its container identity; generic litter retains
its previous `{id,point}` record. An unfinished item or container blocks another
food/drink purchase, including generic food/drink; restroom behavior is retained.
This single held-item limit is a candidate boundary, not original inventory parity.

On successful purchase, atomically commit current price/payment, selected stock
expense, sale/revenue counters and the owned unfinished item. Give neither
instant generic relief nor an immediate wrapper. Generic facilities continue
their old instant-relief/wrapper path. Recheck actual vendor, open state, cash,
current price, clear held slot and reachable public counter at completion.
Unaffordable repricing, closure, demolition or path loss recovers without a sale.

At completion replace the item with its empty box/can. Use existing bin choice,
deposit, timeout and cleanup behavior for that container, preserving generic
wrapper behavior. A bin deposit allocates no entity. Ground disposal requires a
current public path, available shared capacity and a valid next ID; otherwise
retain the container. Full registry capacity cannot prevent consumption from
finishing. Departure removes carried ownership without undoing booked sales.

Held transitions must replace immutable objects or explicitly clone before
mutation. `advance()` currently shallow-copies guests; a later failing finance
tick must roll back the entire batch including earlier consumption, sales, RNG,
time and item counters. No rendering clock may consume, discard or book a sale.

## Save and receiving contract

The working implementation uses save12/content5/protocol5. Public remains11/4/4.
Default factories keep their prior receiving configurations; the browser composes
the new commerce profile explicitly around its existing Flume-enabled Rules.
Actual profile availability gates both Library selection and placement.

Validate an incoming v11 park against the exact historical v11 shape and receiving
v11 Rules projection before adding fields. Then append `held:null`, preserving
all generic facilities/litter, and attach the complete receiving Rules. Do not
convert historical sales or wrappers into new products/typed waste. Update all
older Rules codecs to exclude commerce; reject new candidate facilities or held/
typed-litter fields smuggled into historical versions. New saves require exact
complete receiving Rules agreement and strict product/remainder/container keys.
A guest cannot have both a legacy wrapper and a held item. A remaining counter
is positive, bounded by its initial counter and reachable by repeated decrement;
container acquisition tick is an integer in0–current tick.
Failed import leaves state, pause, revision and quote generation unchanged.

Freeze the old-v11 fixture before any production change. Retain full and genuinely
lifecycle-derived partial inputs, actual unpause, complete authority/view/audit
at0/1/17/400/1200, exact old Rules, old source/runtime hashes, independent batching,
mutation checks, reconstruction and failed attempts. Preserve v7–v10 fixtures.
This oracle is matching Linux Node20.19.2 evidence, not browser/default portability.

## Acceptance and bounded delivery

Remote Engine/worker checks must establish real purchases without instant wrapper,
both complete use sequences and mapped effects, ride/stranded/pause retention,
mid-use and mid-container continuation, vendor removal/slot reuse, bin and ground
alternatives, last-bin-capacity race, retirement/ledger conservation, profile and
historical capability rejection, zero-price stock, overflow/capacity retention,
and whole-batch rollback after an earlier held-item transition. Use actual state
and observable side effects; do not replace these with implementation mirrors.

Old-v11 input must continue with every old authoritative field and complete old
view equal to its immutable expectations after the declared new-field projection.
All prior receiving configurations and historical legal nondefault Rules remain
covered by their existing fixtures and relevant integration checks. Inspect a
delayed quoted/control action after demolition/reuse; add an instance guard only
if a real reachable replacement mutation defeats the existing revision guard.

The real browser flow uses Library, legal placement, price/open, guest inspection,
export/import and public-path/bin controls. Two actual buyers produce15+12 revenue,
5+3 stock expense and19 net cash before separately recorded operating charges;
their unfinished items and corresponding box/can outcomes appear from authority.
Retain actual worker/source hashes, snapshots, paid screenshots, terminal exits
and runtime errors. No DOM text injection or catalogue-only evidence qualifies.

Root integrates and accepts. Sol Max investigates/reviews logical seams; Luna Max
provides independent adversarial review. AGY writes disjoint UI/presentation after
the contract is frozen. All runtime work stays on Grok; sources/masters/evidence
stay on WD. Record each meaningful step in PROGRESS and its journal. At finite
closure complete both cumulative Design/Drift lenses twice; retain failures and
remaining original/human/hardware/full-programme gaps. The overall goal stays open.
