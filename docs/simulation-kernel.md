# Authoritative simulation kernel

First production foundation under the [accepted contract](first-playable-acceptance.md).
The initial milestone implements commands, construction topology, integer
accounting and versioned state continuation. The [operating extension](operating-simulation.md)
adds station access and candidate train motion. It is not a playable park, a complete guest or
vehicle simulation, or original RCT2 conformance.

## Interface and ownership

`Engine` owns its world and a normalized, privately copied rule profile.
Rendering and the message host call the same small interface:

- `quote(command)` validates and returns cost, revision and clearance/endpoint
  feedback without allocating identifiers or changing any state.
- `revision` is an opaque instance/load/command token. Successful loads and
  new engine instances invalidate pending quotes; failed loads preserve them.
  Session entropy stays outside the saved simulation RNG and state.
- `execute(command, revision)` revalidates the command and current funds before
  committing it. Stale revisions and invalid commands leave world, finance,
  identifiers and RNG unchanged. The receipt does not expose mutable state.
- `advance(ticks)` advances logical time in bounded batches, suppressing updates
  while paused. Candidate train updates now run on these ticks; guest/economy
  integration and original physics qualification are still outstanding.
- `route(from, to, queueRide)` queries flat path reachability. Foreign queues
  cannot form public shortcuts; removing/replacing paths updates the index and
  topology revision. This is topology support, not original guest path-choice AI.
- `circuit(ride)` checks connector closure for the placed track sequence.
- `snapshot()` returns an independent copy for diagnostics; do not broadcast
  this whole backing map for every rendered frame.
- `exportSave()` / `restoreSave()` preserve versioned state and validate the
  entire candidate before replacing the live world.

`createHost` provides a transport-independent message handler with validated
numeric correlation IDs, including correlated request-validation errors once
a valid ID is available. A real Node worker test exercises messages through
the same production handler; the Node transport wrapper is test-only. Browser
worker timing and presentation projections will be added with their actual
caller, without moving rule authority to the UI.

## Geometry and resource model

The backing map has 256×256 surface records even for a smaller active world.
Usable tiles exclude the one-tile boundary. Technical side bounds 15–256,
255 shared instance slots and the reconstructed 196,096 construction-record
threshold are implemented from [original-oriented scale evidence](research/original-rct2-scale.md).
These are reference-oriented limits, not a saturation pass for a running
original executable. Stable car IDs now count against the 10,000 shared entity budget; guest/staff
allocation and the complete registry boundary remain to be integrated.

Track uses discrete position/heading/pitch/bank connectors and per-tile vertical
intervals/quarter-tile occupancy. An appended piece must match input attitude;
footprints must stay on owned usable land, above terrain/water, inside the profile
height/support limits and outside existing clearance. Cells are charged against
the element budget separately from piece count. Circuit closure is distinct
from ride operating eligibility and guest access; the operating extension adds
portal, configured-train and reachability checks.

Project heading codes are 0 east, 1 south, 2 west, 3 north. They are **not**
original game direction IDs. XY connector units use 32 per tile; Z positions
are quantized in eights, and terrain in sixteens. That convention follows the
[reconstructed coordinate evidence](research/track-simulation-model.md); it does
not certify every original piece descriptor or height rule.

## Profiles and fidelity

The engine requires an explicit rule profile. It supplies independently authored
piece connectors/footprints, costs, refund fraction and support/height limits.
The normalized profile content is saved as its identity; a changed profile
cannot silently load old state under new costs or geometry. Caller mutation of
the supplied profile cannot change engine rules. Declared evidence labels are
metadata, not proof that a profile was verified.

The test profile is `project-candidate`, lives in test fixtures and is not a
production RCT2 catalogue. Its example prices, 50% rounded-down demolition
refund and abbreviated geometry exist to verify module contracts. They are not
accepted original-game rules. The earlier disposable prototype's full refund,
fixed crowd and visual ride motion were not copied into this kernel.
See the [fidelity gap register](fidelity-gaps.md) before selecting production rules.

Cash, loans, costs and ledger aggregates use integer tenths with safe-integer
checks. Loan transfers affect cash/principal without becoming construction
expense. This implements the [accounting distinction](research/park-economy-model.md),
not every original loan, wage, upkeep, pricing or profit formula.

## Save validation

Version 2 stores clock/pause/RNG, command/topology revisions, profile identity,
funds/loan/ledger aggregates, surface ownership/heights/water, ride anchors and
ordered track membership, path/queue associations, portals, stable element/car
IDs and train motion/measurements. The initial kernel was version 1.
Derived clearance and path indexes are rebuilt, not trusted from the save.

Import checks exact record shapes, numeric/range/array bounds, usable ownership,
money reconciliation and net expenditure covering active construction, catalogue references, identifiers, ride membership/order,
connector attitude, clearances/supports and cumulative resource capacity.
The fixed backing map and 32 MiB input-string ceiling bound the import workload.
Malformed, semantically inconsistent or wrong-profile input leaves the live
park untouched. This is a local state-validation contract, not tamper-proof
online accounting or original `.sv6` compatibility.

## Verification

Use the designated Linux build host; no builds or tests on Patrick's Mac:

```sh
npm ci
npm test
```

TypeScript 7.0.2 is the only development dependency; compiled kernel runtime
uses platform JavaScript APIs only. Tests cross the public engine/host interface
and include real-worker ordering, cost/identifier atomicity, connector and
clearance failures, route invalidation, loan conservation, malformed saves,
continuation and near-limit map records. Passing these checks does not resolve
unimplemented acceptance cases or representative integrated-GPU qualification.
