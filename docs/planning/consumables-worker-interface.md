# Finite consumables worker and presentation interface

Root freezes this interface for the [accepted finite contract](consumables-slice.md).
These fields exist in the working implementation using12/5/5. Current public
versions remain11/4/4; working browser/player qualification is recorded in PROGRESS.
Authority owns all transactions, use counters, needs, ownership and disposal.

## Identities and receiving availability

The two new candidate variants use existing independent food/drink families and
`independent.retail` mode. Variant IDs are `independent.burger-stand` and
`independent.soft-drink-stand`; product IDs are `independent.burger` and
`independent.soft-drink`. Construction and operation capabilities both include
the fixed `productId` and `profileId:'independent.consumables-v1'`. Presentation
uses the existing `procedural-facility` service silhouette. Original reference
variants remain unimplemented. Library choice requires actual `runtimeAvailable`.

The explicit browser receiver is
`withConsumablesProfile(withFlumeProfile(mixedRules))`; zero-argument factory
receivers keep their previous configuration. New candidates are unavailable
without this profile. Existing generic candidates continue to use their old
`independent-services-v1` capability.

## Actual view data

Preserve existing facility fields. Every facility gains `priceBounds:{min:0,max}`,
from its actual selected receiver, and `product:null` for generic facilities or:

```ts
product: {
  id: 'independent.burger' | 'independent.soft-drink',
  label: string,
  stockCost: number,       // actual cost of one sold unit
  stockExpense: number,   // actual selected stockCost × facility.sales
  grossMargin: number     // facility.income − stockExpense, before other expenses
}
```

Existing `price`, `sales` and `income` supply the price, units sold and revenue;
do not duplicate counters. Price controls use integer money units and the actual
`priceBounds.max`; money display remains the existing `n/10` convention. Show
the product name and stock/margin distinction clearly. Gross margin is not total
park profit. A zero-price sale still incurs stock expense.

The world view also supplies `products`, one descriptor per available product:

```ts
{
  id: 'independent.burger' | 'independent.soft-drink',
  label: string,
  service: 'food' | 'drink',
  defaultPrice: number,
  maxPrice: number,
  stockCost: number,
  useUnits: number,
  container: { id: 'emptyBurgerBox' | 'emptyCan', label: string }
}
```

These are derived from receiving Rules and remain available after vendor removal.
An empty profile gives `products:[]`. Do not hardcode default counter, price bound
or timing in UI. Metadata does not imply a constructed vendor or a purchase.

## Guest-owned item inspection

The actual existing `inspect` response for a guest adds `held`:

```ts
null
| { kind: 'consumable', productId: 'independent.burger' | 'independent.soft-drink', remaining: number }
| { kind: 'container', containerId: 'emptyBurgerBox' | 'emptyCan', sinceTick: number }
```

Read the name and initial `useUnits` from actual `packet.products`. Display
remaining units or used fraction from authority; do not add a presentation timer
or inferred sale. A held container is empty packaging awaiting disposal.
Riding/stranded/park pause suspend authoritative use. Generic `wrapper:true`
retains its previous meaning and is mutually exclusive with non-null `held`.

Existing generic needs/wallet/history panels remain. A consumed item may change
into its container between refreshes. Vendor closure/demolition/slot reuse do
not affect the descriptor or ownership. No live vendor reference is required.

## Typed ground waste

Keep the existing four-number `litter` Float64Array stride and coordinates.
Add `litterTypes:{id:number,containerId:'emptyBurgerBox'|'emptyCan'}[]` only for
visible typed ground litter. Join by actual entity ID; entries without a type
use the existing generic wrapper mesh. No overlay/mesh may allocate an entity.
An empty can and folded empty burger box should have distinct small readable
3D silhouettes and materials, with owned resources disposed on replacement and
scene teardown. Do not change picking/path reservation or ordinary litter jobs.

## Commands, persistence and tests

Reuse `place-facility`, `set-facility-price`, `set-facility-open`, `remove-facility`,
and the existing amenity/path commands. Construction includes the selected
content identity. Price/open/removal still use quote then execute with its exact
revision. Bind controls to the constructed instance being inspected; refuse a
known replacement before sending an old control. Root will check actual delayed
quote/control behavior and add only a proven necessary narrow guard.

Save slots are current-v12, then existing v11/v10/v9/unversioned fallbacks, with
absence-only fallback and no overwrite after a present invalid save. UI imports
the compiled protocol constant. Expose real errors; do not replace authoritative
telemetry with invented balances or successful placeholder actions.

AGY owns isolated UI/presentation files. Root owns source/simulation/profiles/
tests/documentation, integration and actual Grok runtime checks. AGY must not
run any local build/test/render/browser. Retain the real two-sale/wallet/use/
container/save/disposal user flow. Existing complete old views compare after
removing only declared new `products`, `litterTypes`, facility `product` and
`priceBounds` fields and restoring their old versions; all old values remain exact.
