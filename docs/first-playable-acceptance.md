# First playable acceptance proposal

Prepared on 2026-10-05 for
[Agree on the first playable acceptance criteria and development handoff](https://github.com/patrick-fu/coaster-tycoon-3d/issues/9).
**Draft for Patrick's decision. Not an accepted contract or a production pass.**
Patrick chose on 2026-10-05 to proceed, retaining representative integrated-GPU
qualification as a mandatory first-playable gate. The performance decision is
settled; the integrated acceptance contract remains proposed.

## Existing decisions

- Independent MIT implementation and resources, unaffiliated with RCT2/OpenRCT2;
  original game data is not required to play this project.
- Browser, desktop Chrome/Edge, keyboard/mouse; original RCT2 gameplay is the
  reference. Smaller initial content selection does not authorize shallower
  simulation rules or smaller park-scale goals.
- Money-enabled sandbox combining coaster construction, individual guest
  simulation and management. The first catalogue uses one looping steel coaster
  family, food/drink/restroom facilities, benches/bins, handyman and mechanic.
- Authoritative TypeScript worker, separate Three.js rendering, local browser
  state with portable export/import. Wasm is conditional on demonstrated need.
- Classic layout: horizontal command desk and bottom construction palette.
- Original-oriented scale and the 16 GB integrated-GPU / 1080p / 60 FPS aim /
  30 FPS floor remain goals, not achieved measurements.

Source decisions: [scope](https://github.com/patrick-fu/coaster-tycoon-3d/issues/5#issuecomment-5961666227),
[architecture](https://github.com/patrick-fu/coaster-tycoon-3d/issues/6#issuecomment-5961821750),
[Classic](https://github.com/patrick-fu/coaster-tycoon-3d/issues/7#issuecomment-5982831833).

## Evidence rules

Each case records source commit, content recipe/hash, initial state/RNG, ordered
tick-indexed commands, expected observations, actual observations and verdict.
Label the expected-result source: original manual, observed original build,
historical reconstructed behavior, modern OpenRCT2-only behavior, or project
design decision. Only observed original comparisons can establish disputed
exact vanilla formulas or timings. Source inspection of changed OpenRCT2 AI
does not establish original AI parity.

Do not label an unresolved exact rule as passed by substituting an arbitrary
prototype formula. Keep a fidelity-gap register with its gameplay consequence
and proposed comparison. Stability/error recovery can be corrected directly;
gameplay-changing departures require Patrick's decision.

Reference corpus: [RCT2 manual baseline](research/rct2-reference.md),
[construction dependencies](research/track-simulation-model.md),
[guest/staff dependencies](research/guest-staff-model.md),
[economy/time](research/park-economy-model.md),
[scale](research/original-rct2-scale.md), and
[continuation evidence](research/save-reference-validation.md).
These reports have explicit unverified areas; this proposal does not close them.

## Observable cases

| Case | Required observation | Validation seam |
|---|---|---|
| C1 Legal construction | Station orientation, endpoint direction/height and legal piece transitions connect exactly; charged state matches preview. | Worker command replay + 3D controls. |
| C2 Rejection is atomic | Bounds, ownership, height, terrain and occupied clearance reject placement without charging cash or changing unrelated state. | Before/after authoritative snapshots + visible error. |
| C3 Edit/removal | Removal disconnects the correct section, applies the independently validated refund rule and updates circuit/opening status. Undo does not use the throwaway prototype's full-refund assumption as a vanilla rule. | Tick-indexed edit replay and finance delta. |
| C4 Operating prerequisites | Station, entrance, exit and connected public/queue paths control testing/opening and access. Incomplete/invalid circuits cannot operate. | Topology fixture, operating flags and guest paths. |
| C5 Train operation | Vehicles follow connected track, station dispatch and boarding capacity; closed/broken rides stop admitting new riders, existing riders recover safely. | Vehicle/seat/queue traces; original comparison for disputed motion rules. |
| C6 Testing and ratings | A test produces duration/speed/forces and ratings; changed geometry changes the appropriate measurements. Exact rating formulas require named evidence, not arbitrary visual scores. | Deterministic track corpus and calculation traces. |
| G1 Individual motives | Cash, hunger/thirst, nausea/happiness and preferences influence destinations and spending; unavailable destinations cause explicit recovery. | Seeded guests with contrasting initial traits. |
| G2 Path/queue edits | Added paths actually change connectivity. Removing an occupied queue or closing/repricing its ride updates membership and reroutes/rechecks affected guests. | Queue membership invariants and destination traces. |
| G3 Boarding/payment | A guest belongs to at most one queue/vehicle seat; boarding removes queue membership and books exactly one authorized payment. | Identity/membership/seat and integer-money reconciliation. |
| G4 Facilities and cleanliness | Shops charge guest cash and book sales/stock separately; restroom/bench/bin use affects the appropriate needs or waste state. | Facility events and needs/accounting snapshots. |
| G5 Staff | Handyman work changes litter/bin state; mechanic patrol/access and job completion affect repair/inspection. Unreachable jobs cannot silently finish. | Service fixtures and call-to-completion traces. |
| E1 Money-enabled sandbox | Affordability constrains paid actions; income, stock cost, wages, upkeep and interest reconcile to cash and categorized ledger. | Integer accounting across scheduled boundaries. |
| E2 Loans | Borrowing/repayment change cash and principal consistently; limits and insufficient-cash rejection are atomic. | Command replay and value/accounting comparison. |
| E3 Time/speed/pause | Renderer stalls do not advance rules arbitrarily. Pause stops rules; normal/fast speed replays the same tick-indexed command sequence to the same state. | Worker clock, backlog, RNG and whole-state comparison. |
| E4 Economy feedback | Ride opening/pricing/service affects guest admission/choice, queue behavior, revenues and running costs across the same integrated park. | Cross-system scenario, not three disconnected demos. |
| P1 Continue a park | Save/import restores the versioned park, RNG/tick, ride/vehicle/queue/guest/staff states and finances. Same future commands produce equivalent continuation. | Export/import + full authoritative checkpoint comparison. |
| P2 Invalid or incompatible save | Malformed/out-of-range/version-incompatible files give a clear result and preserve the current park. | Visible file control and before/after state. |
| U1 Classic construction | Patrick can place, reconnect, remove, adjust height/orientation, understand obstruction feedback and inspect finance/guests with the selected layout. | Human experience of integrated production slice. |
| U2 Readability/access | Close/overview camera views, selection, keyboard focus and error messages remain usable; direct desktop entry works without a developer tunnel setup. | Human review plus remotely executed control checks. |
| S1 Original-scale envelope | Practical map/ride/shared-entity/staff/tile limits are distinguished; failed allocations and multi-record construction are atomic. The 10,000 shared entities must not be advertised as 10,000 operating guests. | Boundary fixtures, allocation accounting and own metadata. |
| S2 Representative capacity | Ordinary/large synthetic tiers include real production rules, realistic occupancy, queue/path edits and legal selected-family train configurations. | Fixed recipes and captured state/category counts. |
| S3 Runtime target | On a named 16 GB integrated-GPU desktop, 1080p/DPR1, normal cadence reaches the accepted FPS floor and time cadence across overview, crowd, construction and save/reload. | Three repetitions with raw frame/tick/backlog/latency/memory evidence. |
| S4 Stability | A longer session covering recurring finance/staff work and repeated topology edits has no sustained backlog, corrupt membership or unbounded resource growth. | Proposed 30-minute production soak; short experiment does not qualify this. |
| L1 Provenance | Own code/resources or explicit compatible dependency/asset rights, notices included, no original assets or GPL core dependency. | Manifest and distribution inspection. |

## Proposed development sequence

1. A deterministic authoritative world/command/save kernel with independent
   track connectors, topology and atomic integer-cost mutations.
2. One integrated legal coaster: testing/operation, seats/queues, individual
   guest decisions, two staff roles and constrained park finances.
3. Classic 3D presentation reading bounded projections, including construction
   and management controls and own local persistence/export/import.
4. Production-rule representative and boundary fixtures; real integrated-GPU
   profiling, optimized only at proven bottlenecks, then long-session checks.
5. Fidelity-gap review and Patrick's integrated hands-on acceptance before any
   first-playable completion claim.

These are agent-owned implementation steps; Patrick need not decompose them.
This proposal introduces no permission to promote disposable code into main,
lower scale targets, claim exact original parity, or skip the hardware gate.

## Remaining decision and release gates

Patrick chose on 2026-10-05 to continue development preparation while deferring
representative integrated-GPU testing to mandatory first-playable acceptance.
The accepted numerical targets and original-scale direction remain unchanged.
The completed remote synthetic experiment is evidence about CPU/message work,
not a full-game or hardware pass. Its source and results are retained on the
[experiment branch](https://github.com/patrick-fu/coaster-tycoon-3d/tree/p/patrick/experiment/park-scale/prototypes/park-scale).

The final planning decision is Patrick's confirmation that these observable
cases and agent-owned development sequence define the first playable contract.
Do not close the integrated acceptance ticket from this draft alone.

Exact original formulas and timings still require named original evidence.
Production implementation can expose independently implemented behavior for
comparison, but unresolved gameplay-changing gaps cannot be marked as faithful
or passed. Keep those gaps visible for Patrick's fidelity verdict rather than
silently borrowing modern fixes or declaring arbitrary toy rules equivalent.

Before claiming the first playable complete, require the integrated production
cases, real representative hardware evidence, production-rule original-scale
fixtures, the proposed longer stability run, resource provenance and Patrick's
hands-on acceptance. A subset implementation milestone may be delivered earlier
with its scope and unverified items labelled explicitly.
