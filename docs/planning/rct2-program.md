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

## Implementation sequence to refine from findings

1. Close membership and evidence ambiguities; integrate one content/parameter
   matrix, fidelity-gap register and asset/reference manifest.
2. Fix art authoring contracts and original placement reservations. Author a
   representative detailed station/coaster car/shop/tree/water/flat-ride sample;
   export and inspect actual browser GLB assets. Do not distort complete models
   to hide unverified collision/height assumptions.
3. Expand declarative content identities and per-family construction/operation,
   add merchandise and services, and migrate saves with explicit compatibility.
4. Validate a contrasting vertical slice: wooden versus steel, a water ride,
   a fixed-footprint ride, admission/shop/merchandise revenue and guest/staff work.
5. Add scenario objectives/calendar/research/restrictions and authored presets;
   cover every original category through successive bounded batches.
6. Run original comparisons, production-scale fixtures/soak, representative GPU
   qualification and Patrick's visual/play acceptance. Keep failed/unobserved
   fidelity cases visible; a catalogue row or screenshot is not implementation.

## Unsettled frontier

- Exact vanilla formulas/timings and direct original observation access.
- Original membership versus shared track families/object variants; counts await audit.
- Dimensional mismatch between current height/clearance reservations and convincing
  detailed buildings/stations; compare original construction before changing rules.
- Art quality and asset/material/animation budgets await actual representative exports.
- Commercial-original references versus independently distributable asset coverage.
- Save evolution, large content UI discoverability and full-scale throughput implications.

This document is the integration specification. GitHub decision tickets own their
research resolutions and dependencies. It is not a completed-game claim or a
promise that arbitrary candidate prices/physics equal the original.
