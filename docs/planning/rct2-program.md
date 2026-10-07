# RCT2 fidelity and detailed art program

Patrick rejected the second Classic art checkpoint on 2026-10-07 and requested a
complete, source-grounded plan before further implementation: original ride and
facility categories, physics and operation, every shop/product/service, park and
ride admission, profitability, scenarios/challenges/presets, and substantially
more detailed 3D models and textures. This expands the content destination beyond
the earlier one-steel-family first-playable slice; its existing checks remain
valid only for their measured scope.

## Standing decisions

- Independently implemented MIT browser project; classic desktop controls.
- Original 2002 RCT2 is the comparison baseline. Index Wacky Worlds, Time Twister,
  RCT1 compatibility and modern OpenRCT2 additions separately; do not silently
  count them as vanilla RCT2. Expansion coverage is a separately visible layer.
- Root owns design, integration and final acceptance. Logical research uses
  GPT 6.1 Sol Max subagents; visual/art/frontend work uses Antigravity CLI.
- No Mac compilation, tests, rendering or simulation. Execute these on Grok Bot;
  keep checkouts and retained research/asset evidence on WD.
- Original screenshots/object references are an observation corpus. Released
  geometry/textures need per-asset provenance and compatible distribution terms.
- Existing Three.js/worker architecture is the starting point. Exact formulas,
  timings, limits, content membership and art budgets require evidence, not guesses.

## Shared specification, before bulk implementation

Use one identity and evidence contract across every stream:

| Record | Required fields |
|---|---|
| Content entry | Stable project ID; original identity; base/expansion/custom membership; category; ride family, object/vehicle variant and operation mode kept distinct; source; coverage status. |
| Parameter | Name; unit; domain; default/range; source type and revision; original observation or unresolved comparison; user-visible consequence. |
| Ride | Legal construction/collision/support/water envelope; track or fixed footprint; vehicles/seats/stations; modes and dispatch; motion/animation; safety/maintenance; test metrics/ratings; admission and cost rules. |
| Facility/product | Footprint/frontage; served products/services; buying/use conditions; inventory/carried objects; price, stock cost, demand, litter and accounting effects; UI and saved state. |
| Asset | Reference views; silhouettes/proportions; editable model/UV/source textures; palette/recolor; materials; anchors, rig and animation; placement/selection/collision contracts; LOD/batching; license and output hash. |
| Scenario/preset | Authored briefing; climate; terrain/water/ownership; object set and research order; initial money/guests/rides/staff; restrictions; objective/deadline/win/failure; deterministic recipe and save version. |
| Acceptance case | Source/RNG/recipe; tick-indexed actions; original expected-result evidence; actual traces, visual views and verdict; remaining uncertainty. |

Evidence classes: observed original, original manual, original-object membership
metadata, reconstructed implementation, project candidate, and unresolved.
Reconstructed implementation does not settle disputed original numerics.

## Research and planning ownership

The following questions are sharp enough to investigate in parallel. Each stream
returns findings to root without editing production files or choosing the final
retention/integration independently.

| Stream | Single outcome | Owner |
|---|---|---|
| Catalogue and origin | Complete original membership/identity map: coaster families and vehicle variants, transport, gentle/thrill/water rides, shops/services, scenery/buildings; exclusions and unknowns explicit. | Sol Max |
| Coaster construction and physics | Parameter/behavior contract for wooden/steel/suspended/inverted and other original coaster families, legal pieces/modes, trains, motion, testing/ratings and reference cases. | Sol Max |
| Other rides | Behavioral contracts for water, transport and fixed-footprint gentle/thrill rides; distinguish actual cycles/capacity/boarding from decorative animation. | Sol Max |
| Shops, services and merchandise | Product/service catalogue, including food/drink, restrooms, information/maps/umbrellas, balloons and souvenirs, purchase/use/inventory/waste/price contracts. | Sol Max |
| Admissions and finance | Park/ride admission and demand, costs/profit/loans/marketing/research, game calendar and operating accounting; originals and candidate values explicit. | Sol Max |
| Guests, staff and park operations | Original traits/needs/thoughts/navigation, queues/seats/inventory, cleanliness/security/entertainment/mechanics, rating/reliability and recovery cases. | Sol Max |
| Scenarios, challenges and presets | Original objective/restriction/climate/research/preset taxonomy; independently authored scenario recipes, progression/briefing and save implications. | Sol Max |
| Art and model pipeline | Reference-backed critique and model/UV/material/rig/animation workflow; separate editable model sources from renderer placement; measurable output acceptance. | AGY |
| Classic frontend | Reference-backed interaction/density/window/construction/management plan for the complete catalogue and scenarios; implementation batches with unchanged authoritative ownership. | AGY |
| Visual content and material corpus | Representative asset briefs across all categories and a source/provenance manifest for visual references and usable texture/material sources. | AGY |

## Retained planning results

The [complete research checkpoint](../research/rct2-program/README.md) contains
all original selectable families and object variants, per-object product/car
facts and source hashes. Root independently regenerated the inventory from
2,504 pinned JSON records and crosswalked the descriptor splits. Original targets
are 33 coaster families/56 variants, five transport/11 variants, seven water/12,
16 gentle/23, 11 thrill/12 and seven commercial classes/41 buildings. Scenery
has 507 small/large/wall objects, with 29 theme groups. Modern decomposed styles,
synthetic identity, compatibility and expansion rows remain separately classified.

Seven Sol Max logical investigations are retained in the ride, commerce/guest
and finance/scenario specifications. Three AGY visual outcomes are integrated
in [the model pipeline](model-pipeline.md) and [Classic UI contract](classic-content-ui.md).
The frontend run failed with a retryable network stream error, then a fresh
bounded attempt completed. Root corrected false counts, footprints, unsupported
dimensions/versions, invented prices/wages, category errors and fake example
hashes. Execution success is separate from artifact acceptance. See the
[delegation audit](delegation-audit.json).

Twelve actual CC0 material source bundles and five official gallery images plus
the original manual were acquired on WD with hashes. No original DAT assets,
original executable comparison or new Blender export is established by this
checkpoint. The [fidelity register](fidelity-gaps.md) specifies 37 discriminating
ride, commercial, guest, finance, scenario, art and UI cases and their gaps.

## Dependency-ordered implementation

| Batch | Reviewable outcome and gate | Depends on | Write owner |
|---|---|---|---|
| P0 Content/evidence contracts | Audited complete inventory, source-linked native parameters/products, corrected art/UI contracts, gap cases and executable task boundaries. No candidate value is labelled observed original. | Research convergence | Root; independent Sol Max audit |
| P1 Representative asset pipeline | Editable wooden car, timber station and information kiosk/map/umbrella; real UV/material/anchors; remotely exported/validated/rendered GLBs. Then organic foliage, log/water and articulated flat ride. Patrick reviews actual output before bulk style production. | P0; candidate native/render mapping stated | AGY asset writers in isolated files; root remote integration |
| P2 Content and save foundation | Stable family/variant/mode/instance identities, separate construction/operation/presentation capabilities, versioned worker projections and a v8 identity schema with explicit migration from validated v6/v7. Native collision/render mapping calibration cases; no global model squash. | P0 | Root; Sol Max logical review/isolated experiments |
| P3 Contrasting playable slice | Wooden versus steel, Log Flume and Twist/Carousel with actual topology, seats, sessions/dispatch, money, guests and save continuation; comparison traces and actual scene poses. | P1 + P2 | Root simulation/integration; AGY type-specific art |
| P4 Full commerce and park service | All 41 original shop/service variants, 35 vendor products plus photos, carry/consume/container/voucher/ATM/treatment behavior; four staff roles/local jobs, guest motives/history/navigation and rating/reliability. No fake stock-refill mechanic. | P2; terrain/path and lifecycle contracts from P3 | Root logic; AGY visible models/props after P1 gate |
| P5 Finance, research and scenarios | Admission policies, authoritative calendar/phases and 14-category monthly ledger, campaign/research state, distinct valuations/objectives; authored scenario recipes/restrictions/climates/rights and tested coaster presets. | P2 + P4 accounting/guest contracts; type/ratings from P3 | Root logic/integration; Sol Max adversarial review |
| P6 Complete catalogue rollout | Individually qualified batches: ordinary coasters; inverted/suspended/flying/rotating/launch; tracked/free-water; transport; fixed/tower/walking rides; all scenery/theme/path/entrance/station kits. Coverage records below advance per entry. | Applicable P1–P5 capabilities and visual gate | AGY art/frontend; root behavior integration |
| P7 Full qualification | Exact-original comparison cases, production-scale replay/soak, representative integrated GPU, real construction/management play and Patrick's visual acceptance. | Required P3–P6 coverage | Root and independent reviewers; human gates explicit |

Classic UI work follows the same feature dependencies: modeless chrome first,
then real catalogue/operation views, products/guest/staff, finance/research and
scenarios. Each AGY UI batch has one writer for its HTML/CSS/game integration;
root publishes worker contracts first. Never display invented telemetry or use
locked research state to hide unimplemented engine behavior.

The v8 content/instance identity and worker foundation is merged; see
[its interface and remaining calibration](../content-identities.md). The first
finite Classic library now reads that real catalogue and selects only executable
candidate content; [actual remote evidence](content-library-evidence/README.md)
records browsing, building and lifecycle checks. Native/model calibration and
the remaining management windows keep their separate gates.

P1 and P2 preparation can proceed in parallel without a shared-file writer.
P3–P5 worker changes are integrated sequentially by root because they share
transactions, state validation and saves. Separate renderer/asset tasks can run
alongside a frozen worker interface. Delegation is about independent outcomes,
not maximizing process count. Do not start bulk assets or all physics families
before the sample/identity contracts have evidence.

## Coverage and finish criteria

Every family/object/product/scenery/recipe has separate status for membership
evidence, parameter evidence, logic implemented, correctness checked, original
agreement, editable art, GLB/runtime validated and human visual/play acceptance.
Unobserved is not failed or passed. Shared kits require per-variant seat, pose,
frontage, parameter and silhouette checks; a catalog row is not a finished ride.

The current production game contains one candidate steel-family profile, three
generic facilities and six scenery types; its exact original family mapping is
unresolved. None of the new complete catalogue is claimed implemented merely by
being inventoried. Earlier EFK/AFK research resolves factual contracts, not the
whole programme or issue24's fidelity/hardware acceptance. These are staged
deliverables, not a dated promise to complete hundreds of assets in one pass.

## Unsettled frontier

- Exact vanilla formulas/timings and direct original observation access.
- Exact launch membership of bonus/compatibility/scenario/style records; the
  canonical family and 155 ride-variant counts have been audited.
- Dimensional mismatch between current height/clearance reservations and convincing
  detailed buildings/stations; compare original construction before changing rules.
- Art quality and asset/material/animation budgets await actual representative exports.
- Commercial-original references versus independently distributable asset coverage.
- Save evolution, large content UI discoverability and full-scale throughput implications.

This document is the integration specification. GitHub decision tickets own their
research resolutions and dependencies. It is not a completed-game claim or a
promise that arbitrary candidate prices/physics equal the original.
