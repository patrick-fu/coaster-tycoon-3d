# Frozen complete caller and actual Native diagnostics

The bounded diagnostic groups passed on Grok. This conclusion combines the executed passing groups in attempt-002 with the remaining contact checks in attempts-003 and -004. Attempt-002 retains its actual overall exit **1** and `passed:false`; it has not been relabelled as a successful whole run. No production file was edited by this task.

## Frozen scope and source pins

The only write boundary is `/Volumes/WD/code/workspaces/coaster-log-flume-terrain-authoring/caller-sol` and its Grok mirror `/workspace/coaster-log-flume-terrain-authoring/caller-sol`. Frozen production code is in `inputs/current`, the original channel is in `inputs/reference`, and production TypeScript is in `inputs/source`. All Node, Three, Engine and geometry execution occurred through `ssh grok-build`, using Node **v20.19.2** and Three **0.186.1**.

| Input | SHA-256 |
| --- | --- |
| Integrated channel | `931974b2615e49f9a1ffe59b5514b5811e8c68ac10bf48eb6ecc4ba9cd4649e8` |
| Integrated terrain adapter | `c541601fa7f37777d1a259c9e3c8103d7d3bba87ad24b4376b1dba7b6f7f7808` |
| Support BOX utility | `554a01c412ec368a02841eb525fba61f1541453467e25877d7d42081d33ab26d` |
| Original r2 channel | `0c3373ffd35068dff26ea16579b41b00549fa6e35c34068d5290cdb8c54e17a3` |
| Art runtime | `8b85e50ffed823678e3235639ae726ba7bee3e0c52c527855fce056b98df9e60` |
| Compiled Engine | `c4746856289fb00195dac90305ae2865d5a5579c2c38b4e37c2dfc09c7c73902` |
| Engine TypeScript | `f17f9495cf856f52c35b09ce50d690b9785add39906b143f7600d7cd5107d2da` |
| Native TypeScript | `4643337936b8c5d5ff80aebb4363df640eecd0fac8bbe5bb998c44d7d9c615c5` |

`freeze-runtime.mjs` copied the existing compiled Engine's 27-module import closure. Every corresponding fixture TypeScript source matched its frozen current production source by SHA-256 before use. `inputs/runtime-pins.json` records both compiled and source pins; its hash is `d4b10c706be5be60c087942cbddfb6ddb2a4a9613eafaa6507ff91713c5ea277`. `inputs/three-pins.json` records the resolved installed module and copied package/module/core hashes. The complete caller tests imported the frozen Engine closure, not an invented Native fixture. The unchanged reference drivers remain pinned reference data.

## Actual commands and retained attempts

Every attempt retains its driver, input hashes, command list, syntax exit, stdout, stderr, result and actual exit under `evidence/attempt-NNN`. The remote shell runner is `run-check.sh`.

| Run | Actual remote command | Exit | Result |
| --- | --- | ---: | --- |
| Freeze | `node freeze-runtime.mjs` | 0 | 27 compiled/source modules matched |
| 001 | `bash run-check.sh 001` | 1 | Driver setup rejected boundary tile0 in `Engine` land initialization; no channel matrix executed |
| 002 | `bash run-check.sh 002` | 1 | Five named groups passed; one old-buffer diagnostic expectation failed |
| 003 | `bash run-check.sh 003 remaining` | 0 | Five actual R8 foot/post/cap contact cases and old-buffer contact controls passed |
| 004 | `bash run-check.sh 004 tie` | 0 | Five actual R8 tie retention/omission and contact cases passed |
| Summary | `node summarize.mjs` | 0 | Input identity and retained exits checked; structured summary produced |

In focused attempts003/004, the phase labelled `actual-engine-varied-courses-and-native` only constructs five actual Engine courses for contact tests. Both focused results explicitly report `nativeCases:0` and `nativeTriangles:0`. The accepted 320-buffer/536-Native matrix was not rerun. Source inputs and thresholds remained identical across the accepted groups. `evidence/summary.json` identifies exactly which groups are consumed.

## Exact full caller equivalence

Attempt-002 passed **320 complete caller comparisons**: 288 pieces from 16 actual closed representative courses, plus 32 actual selected station/portal combinations. The courses cover ground2/4m, directions0/1/2/3, left/right turns, station, channel, splash, all lift pieces and all drop pieces. Portal cases cover both sides, entrance/exit, all directions and ground2/4m.

For every ordinary piece, original r2, integrated terrain-absent, and integrated descriptor-equal-ground calls produced identical fingerprints of the actual typed-array bytes for position, normal, UV and index, including attribute/index types, counts, normalized flags, world matrices, mesh order, geometry groups, material grouping/properties, selection metadata and shadow flags. Equal-ground calls produced zero helper parts, confirming that the original primitive branch was used. Selected station cases also matched the original passage buffers exactly.

The real `createArtContext` owns geometry and materials. Channel paint is deliberately bypassed with real `THREE.Texture` metadata, consistently for both callers. No Canvas mock or `ctx.text` substitute is involved. This establishes geometry and material grouping equivalence under that explicit diagnostic seam; it does not establish texture pixels or rendered visual equivalence. Root decides whether prior flat visual/contact evidence can be reused.

## Actual Engine terrain and full Native partitions

Attempt-002 passed **536 whole-caller Native cases**, **442,904 actual triangles** and **386,344 positive-area projected quarter partitions**, with zero vertex misses or partition violations. Each piece's authority is its actual `Engine.quote(append-track).value.cells`, retained together with the successful execute receipt, final actual origins and closed-circuit result. Engine-view terrain is converted exactly as the frozen Scene does: native height/8 metres, with strict frame and footprint lookup.

Each Native mask bit becomes its actual 2m by2m quarter prism. Every actual triangle is clipped against all intersected quarter bounds and checked against the entire corresponding vertical interval; boundary polygons are checked against the closed Native union. The fixed prior boundary tolerance is **5e-6m**. This is not a vertex or centreline-only test. Final attributes and triangle indices are finite/valid and no actual triangle collapses.

The finite legal set includes the existing representative lift/drop courses, all legal directions and both turns, and five varying-ground R8 courses. All origins came from successful Engine commands and satisfy the current 32-unit connector grid. No half-tile translated diagnostic origin is used or claimed as Engine legal. Varied support emission is directly exercised by the five R8 terrain patterns; flat orientation/lift/drop cases exercise the preserved branch. This does not claim that every legal straight piece must use varied support.

A positive control removes one quarter bit from a copied Native authority, without editing Engine or source. Actual concrete triangle403 retains all three vertices and its centroid inside the modified authority, while **0.000030296447580191228m²** of its projected interior occupies the removed quarter `[22,21]`. The complete partition checker fails the modified authority. Other triangles/vertices also fail globally; the control's vertex/centroid statement is specifically about the retained triangle, not the entire mutated mesh.

## Actual R8 ground, cap, post and tie contact

All five courses start at tile anchor `(8,10)`, height48, direction0, then append two stations followed by right R8. Their actual right origin is `(320,320,48)`. At bent distance5.8m, the bent is `[47.304795872634216,6,44.01254943081722]` and its retained post top/cap bottom is **5.84m**.

The outer 0.28m foot crosses worldX48 between tile11,10 and tile12,10. Independent original-source bases and complete square footprints define the expected tile patches; actual downward/upward final-buffer triangles supply measured coverage. Fixed contact area tolerance is **5.6e-6m²**, derived before execution from the 5e-6m geometric tolerance and the 0.28m foot perimeter.

| Native ground11,10 /12,10 | Expected outer-foot patch areas | Actual bottom coverage | Bottom heights |
| --- | --- | --- | --- |
| 16/32 (2/4m) | 0.0461826819844 /0.0322173180156m² | 0.0461824811794 /0.0322171937782m² | 2 /4m |
| 32/16 (4/2m) | Same complete footprint patches | 0.0461824811794 /0.0322171937782m² | 4 /2m |

Neither entire contained half is lost. Foot tops are at their own ground+.14m; post bottoms meet them there, post tops meet actual downward cap faces at5.84m. These are actual final-buffer area/contact checks, not a restatement of the adapter plan. The high-centre6m/low-lateral2m fixture retains the east support area even though the old frame ground is6m and old support emission is absent. Regions where ground6m removes the whole support produce zero foot/post/cap contact area. Ground4m produces the legal shorter post rather than a minimum-height extension.

The low-leg fixture uses ground0/2m and retains a three-part tie at actual vertical bounds **3.930000066757202..4.050000190734863m**. Each actual tie/post joint covers approximately **0.0084m²**; every vertex of the entire positive-area joint, at both vertical bounds, lies in the emitted convex post solids. The other four fixtures omit the tie because the short or absent legs do not meet the retained-height rule. No unverified middle-only high tie tile or half-grid fixture is substituted for this actual Engine evidence.

The original r2 buffers fail actual per-tile bottom coverage in all five varying-ground fixtures. Attempt-002 incorrectly expected both2/4 and4/2 old buffers to fail Native containment. In4/2, an old foot can float while still remaining inside the allowed Native prism. This failed inference is retained; Native containment was never changed to force that old-buffer failure. Attempt-003 uses unchanged independent ground-contact coverage for both arrangements and discriminates the floating support directly.

## Ownership, preflight and error cleanup

The actual caller is instrumented after an existing real context is prepared. A BufferGeometry ID interval and prototype inventory agree on every allocation. Ownership/material/texture calls and parent attachments are separately counted. Successful calls retain owned merged geometry until real `ctx.releaseStatic`, which disposes each once; every temporary is already disposed exactly once before return.

For the **42 actual helper parts** emitted in the varying-ground whole calls, original temporary position/normal/UV bytes and every helper triangle survive the actual material-bucket merge exactly. The actual merged slices retain finite metre UVs, nondegenerate triangles, outward normals/winding, positive volume and closed paired edges. This tests complete caller merging; it does not rerun the standalone BOX/adapter mathematical suite.

- All32 stale station shared-ground cases throw `RangeError` with zero actual-call BufferGeometry allocations, ownership/material/texture calls or parent children.
- Removing actual late footprint tile12,12 causes preflight failure after earlier samples. It first appears at sample index34 of42. BufferGeometry allocations, ownership, material/texture calls and parent attachments are all zero.
- A controlled throw at the actual texture stage occurs after **24 temporary geometries** have been built. The complete caller catch disposes all24 exactly once; no geometry has been transferred to context ownership and no child is attached. The one attempted texture call is recorded.

Only the controlled failure boundary above is claimed. Arbitrary OOM, process termination, renderer failure and user-supplied context methods that throw while transferring ownership are not qualified by this diagnostic.

## Remaining gates and handoff

No unresolved source defect was found in this finite caller/Native/contact contract. Root must consume these frozen groups and their source pins, decide conditional reuse of prior unchanged flat composition evidence, and finish its separate real application/browser/pixel/runtime acceptance. This task makes no body/rider, continuous walk/contact, picking, full default/public availability, GPU or playable-goal acceptance claim.

`MANIFEST.sha256` covers all regular source, input and evidence files. `MANIFEST.sha256.digest` pins that inventory; `MANIFEST.grok-*` and `MANIFEST.wd-*` retain each side's verification receipts. Manifest receipts and the manifest itself are intentionally excluded from their own inventory. Terminal handoff supplies the verified digest and file count. The task stops after this isolated diagnostic bundle; production integration and availability remain Root's responsibility.
