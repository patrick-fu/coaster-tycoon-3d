# Content identities and historical continuation

The authoritative worker now separates a ride family, object variant, operating
mode and constructed instance. A copied catalogue is available through
`Engine.catalogue()` or the `catalogue` worker request. Its 79 reference families
and 155 base-game variants declare reference coverage, not buildable content.
Construction, operation and presentation each have a tagged capability; every
reference entry currently has `kind: 'unimplemented'` in all three. Expansion
and synthetic objects are excluded. Per-variant mode membership follows the
chosen descriptor, including variants folded into an original canonical family.
See [the retained inventories](research/rct2-program/README.md) and
[metadata attribution](../THIRD_PARTY_NOTICES.md#reference-catalogue-metadata).

## Creation and capability checks

`create-ride` and `place-facility` accept their exact previous command shape,
or that shape plus a complete `content` record:

```json
{
  "familyId": "independent.circuit-coaster",
  "variantId": "independent.steel-train",
  "modeId": "independent.continuous-circuit"
}
```

Omitting `content` selects the existing independent candidate, preserving its
current behavior. An explicit missing/extra field or accessor is rejected;
`content: null` or `undefined` never means the default. The three IDs must exist
and form a supported combination. Unknown IDs return `UNKNOWN_CONTENT`, a wrong
combination or service kind returns `INVALID_CONTENT`, and a valid reference
selection without executable capabilities returns `UNSUPPORTED_CONTENT`.
Quotation and execution check this before allocating, charging or changing any
state. Unavailable original-reference wood, water, free-water, shuttle and fixed rides
cannot borrow an independent candidate adapter. Candidate identities describe independently
authored algorithms; they never relabel an old park as an original object.

The seven implemented variants are the candidate uniform steel train, detailed
independent wooden train, sixteen-seat Carousel, four-seat Log Flume, and
candidate food, drink and restroom facilities. Catalogue availability also
requires the actual receiving numeric profile: the browser explicitly selects
the complete Flume profile, while zero-argument park factories retain their
previous configuration. Their capability profile IDs identify the verified
construction/operation/presentation implementation. Numeric rules
remain the complete canonical `Rules` record, not defaults looked up by name.
New adapters and independently authored art must supply their own verified
capabilities before catalogue controls can create them.

## Instances and saves

Historical save `version: 8` adds `contentVersion: 1`, `nextInstance` and, on each ride or
facility, `content` and `instanceId`. The existing `id` remains the finite
0–254 shared ride/facility slot. `instanceId` is a positive allocation sequence
within this saved park; demolishing and replacing a shop may reuse its slot
but must allocate a different instance identity. The counter is persisted and
must exceed every surviving unique instance ID. New parks and separately
loaded/forked parks do not promise globally unique instance numbers.

Accepted v6 input still requires no scenery element and no scenery rule field;
its exact previous profile is normalized to the current scenery schema. A v7
candidate then passes the complete previous state validation before identities
are attached. Surviving instances receive deterministic IDs in slot order;
unknown demolished-instance history is never fabricated. Full v8 validation
then checks capabilities and all existing geometry, ownership, money, stock,
queue, train, seat, guest, staff and housekeeping invariants before atomic load.
V8 input must contain its complete identity schema before migration to v9.
The declared sequence then validates v9/content 2 before adding v10/content 3
Carousel fields, and validates v10 before adding v11/content 4 Boat fields.
Current saves use **version 11 / content version 4**. Matching historical
receivers keep their complete old Rules, owner and accounting behavior; only
declared later fields are added. See the [mixed coaster contract](mixed-coasters.md),
[Carousel contract](planning/carousel-slice.md) and
[finite Log Flume contract](planning/log-flume-slice.md). Versions 1–5, future
save or content versions, incompatible profiles, and unavailable content reject.

The full canonical rule JSON must match the receiving engine, including prices,
motion, services, scenery and wages. A matching `Rules.id` never substitutes
default numbers. Migration preserves RNG, paused tick state, active and retired
commerce ledgers, train/car/seat state, guest payments and subsequent behavior.
Failed imports preserve the current park and outstanding quotes. Successful
imports invalidate prior quotes and reset worker wall-clock accounting.

This format does not invent recipe, monthly finance, weather, research or
scenario histories. Those remain explicit implementation work in the programme.

## Worker and presentation

Requests, replies, ready/error events and view packets use
`protocolVersion: 4`. Requests require `{id, protocolVersion, request}`; an
unsupported or missing version receives a correlated structured rejection.
Browser `speed` and `new-park` controls use the same version gate. Older save
formats are migrated independently of this current message protocol.

View packets carry copied instance/content identities, presentation capability
tags and `contentVersion`. Catalogue/view changes made by a caller never alter
the engine or registry. The Classic renderer verifies its supported presentation
profile and coordinate profile before drawing. It cannot silently render an
unknown content family as the candidate steel coaster.

The coordinate declaration keeps native 32 units per tile, 8-unit connector
height steps and 16-unit land steps distinct. Metres per tile remain the exact
current rule value, explicitly marked `project-candidate`; this does not prove
the original isotropic world mapping. Track connectors/clearance and ordered
train seats remain authoritative simulation data. Authored model anchors,
visual bounds and swept bounds require their separate measurements.

## Qualification

Remote checks cover populated v7 train/queue continuation with nondefault rules,
demolished/reused shop stock and income, restricted v6 normalization, malformed
identities and versions, failed-load quote/pause preservation, capability
rejection in both quote and execute, instance lifecycle, copied projections and
versioned real worker messages. Current [Classic/Library checks](verification/log-flume/classic-library-browser.json)
cover the historical v7 steel-only projection, v11/content-4 export and canonical
reload/showcase separation. [Storage controls](verification/log-flume/production-storage.json)
cover same-Chrome historical admission, explicit incompatible Rules refusal,
quiet saving and unchanged existing slots. [The verification index](verification/log-flume/README.md)
records each actual source/version, result and retained failure; it does not
claim cross-runtime default-rule portability or original numerical agreement.

R01–R03 still require contrasting family geometry, suspended/inverted clearance,
ordered nonuniform vehicle/dispatch implementations and original comparison;
S05 still requires authored recipe/research/weather/objective state. Identity
checks alone do not close those fidelity cases or the representative integrated
GPU and Patrick visual gates.
