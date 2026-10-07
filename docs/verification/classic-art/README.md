# Detailed Classic park checkpoint

All compilation, source tests and browser rendering ran on Grok Bot Linux.
Chrome for Testing 154.0.8037.57 reused the existing default profile. Its renderer
was SwiftShader; these results do not qualify a representative integrated GPU.

## Executed checkpoint

The frozen runtime source is `a7d6451bac636c40bf669e1c2f9c73ca1f3833c6`.
Its final JavaScript syntax checks, strict web compilation and 28 real browser
checks passed on Grok Bot, including actual page reload and showcase/player-save
isolation. The unchanged simulation and source-test inputs passed 106 checks in
15.66 seconds at source `38524db248403dde96eec84759f28c07b0fab4f1`; the later
source commit changes only scenery art and camera positions. The remote source
input manifest independently compares all 57 build/test inputs with the frozen
checkout. The snapshot has three operating layouts,
four measured cars each and 116 authoritative scenery placements. All three
layouts use one independently authored steel family.

The frozen capture manifest records six image hashes, viewport sizes/DPR,
all build artifact hashes, per-shot camera/tick state, browser/profile/renderer identity, real occupied-car
pose, one active task page and zero page exceptions/WebGL errors. Overview,
station/queue, gate/facilities, landscaping and occupied-train views are
1920×1080; the narrow-desktop view is 1280×800. Captured population and revenue
come from advancing the actual engine, not a decorative crowd. Visible-person
counts decode the six-number projection stride. Five unused AppleDouble
metadata files were discarded after capture; the recorded runtime byte hashes
are unchanged and exclude those files.

| Evidence | Meaning |
|---|---|
| `art-source-tests-final.log`, `art-build-final.log` | 106 unchanged simulation/source passes and the final strict remote web compilation. |
| `browser-check-result.json` | 28 browser checks, including path prices/refunds, staff picking/patrol, fitted overhead clearance, real facility frontage, staff-only tools, keyboard handling, save/import/reload and separate showcase saves. |
| `art-capture-result.json` and `art-*.png` | Source-bound actual runtime capture set; retain its source identity when comparing later art passes. |
| `source-input-hashes.json`, `source-input-verification.json` | All 57 frozen build/test inputs match the remote source tree. |
| `shape-probe-before.json`, `shape-probe-after.json` | Remote signed-volume comparison proves outward custom pine/flower winding after repair; all eight cached shape variants have finite positions and zero degenerate triangles. |
| `gl-probe.json` | Initial cached-shadow shader failure reproduced as WebGL error 1282; disabling shadows or recompiling for the supported PCF type cleared it. Production now chooses supported PCF from startup and initializes dynamic instance counts to zero. |
| `frame-probe-before.json`, `frame-probe-after.json` | One-variable rail-detail transform ablation: reflected meshes 1,110→0; cached draws 1,459→351, with equal triangles. Single CPU-submission observations include the default-profile environment and are not FPS measurements. |
| `scenery-guard-red.json` | Corrected malformed-rule regression failed before the null-root normalization guard. |
| `agy-*-audit.json` | CLI status, requested model, completed tools and stream hashes; these establish observed tool execution rather than visual or runtime acceptance. |

The functional harness initially ran alongside restored task-owned preview
tabs, whose autosaves competed for the same local slot. It now suppresses
startup windows, closes only restored Coaster Tycoon preview tabs, disables
the client cache and saves a final paused checkpoint before reloading. The
corrected run passed actual reload and separate-showcase preservation. Normal
browser use should keep one editing tab per save slot; same-slot multi-tab
write ownership remains a follow-up rather than a claimed persistence guarantee.

## Review and authoring evidence

Four isolated Antigravity writers authored environment, buildings, coaster/
people/vehicle art and the HTML/CSS shell. An independent Gemini audit reviewed
scenery state/migration and scene resource ownership. Luna Max reviewers
independently examined the simulation seam, references, model dimensions,
runtime/picking/disposal and interface, followed by cumulative design and drift
reviews. Reviewers performed static inspection; remote execution belongs to the
primary agent.

Verified defects were repaired: incorrect bin-capacity display, closed portal
approach, flower-height clearance, radial primitive units, roof slope direction,
building envelopes, reflected rail-detail bases, focused-button keyboard
handling, focus-ring contrast, guest equipment, false shop-side openings and reversed custom pine/flower faces.
A final Luna geometry pass closed the winding counterexamples; a separate Luna
runtime pass found no remaining verified issue in cache, fitting, selection or
camera contracts. Neither static review certifies runtime visuals or performance.
The apparent fresh-park height mismatch was a false finding: the real browser
starter ground and footer both use height 32.

The second coaster-polish and final environment-shapes runs returned exit 0 and
a `SUCCESS` marker but timed out after 20 and 12 minutes respectively, with
empty responses. Both are **partial artifact evidence**.
Their completed writes were consumed, independently reviewed and repaired, then
validated through the integrated remote checks. A missing emitted model leaves
effective model identity unverified; audit records preserve the explicit request.
Source screenshots remain observation-only outside the distribution. All runtime
geometry, canvas textures and icons are independently authored.

The final source-bound image set replaces the intermediate C1 images. The C1
baseline remains outside the repository under the external task evidence
folder. These screenshots are observations, not original-game conformance.

## Runlog

- Surprises: unsupported shadow initialization hid dynamic meshes; reflected detail transforms defeated batching; model units/roof bounds disagreed with legal construction; restored preview tabs competed for saves; two CLI polish runs timed out; unused AppleDouble metadata reached the remote source copy and was removed; a new regression's initial constructor argument order was corrected before recording its true failure.
- Adapted decisions: normalize radial dimensions, fit decoration to authoritative reservations, preserve actual rails/poses and portal alignment, separate showcase/player saves, and retain partial CLI evidence without presenting it as task completion.
- Human judgments: visual/play experience, original-game conformance and representative integrated-GPU qualification remain open in [the first-playable qualification task](https://github.com/patrick-fu/coaster-tycoon-3d/issues/24).
- Deferred follow-ups: original station/course descriptors and exposed canopy ends, exact ratings/catalogue/rates, large-map view windows, same-slot editing-tab ownership and final-source integrated scale/soak/hardware evidence.
- Evidence pointers: the files above preserve executed results; older baseline evidence remains in `../classic-preview/` and does not qualify the expanded art.
