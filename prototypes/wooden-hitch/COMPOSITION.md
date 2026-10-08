# Immutable wooden-car composition

`compose-car.mjs` retains the frozen original car and imports only the separately authored front/rear mount subtrees. All executions and numerical checks reported here ran on `grok-bot` (Linux x64, Node v20.19.2). No production source, validator contract, collision rule, or tolerance was changed.

## Interface

Run from `/workspace/coaster-wooden-hitch-authoring`:

```sh
node evidence/composition/run-composition-check.mjs \
  --hardware outputs/wooden-car-joint-routed.glb \
  --hardware-sha 575eaffa6f934ba52cc34fe34f37109a93aff960c0b8c350970b7ca9715ee1f3 \
  --output outputs/wooden-car-routed-composed.glb
```

The harness invokes the composer, Khronos `gltf-validator` from the existing `/workspace/coaster-detailed-assets/checks/node_modules`, and `evidence/composition/verify-composition.mjs`. It records each command, working directory, timestamps, terminal exit, stdout/stderr paths and hashes, input provenance, and the output GLB SHA256. The composer can also be invoked directly with the same three flags. Each output must be a fresh `outputs/*-composed.glb` name; existing outputs and reports are never overwritten.

Frozen inputs:

| Input | SHA256 |
| --- | --- |
| `/workspace/coaster-detailed-assets/outputs/wooden-car.glb` | `fc988c55ed60dcd5abf7c5e02ecbc1ac3a8cd828cfe7fe4bb8f30bcf21699b59` |
| `/workspace/coaster-articulated-wooden-joint/results.json` | `167ba3e1da273b66a4bc1d9fb1c3a6fe6c1ec0d2ea54673395f94ae73a287ab6` |

Hardware input is independently pinned by the required `--hardware-sha` flag. `Mount_Assembly_Front` and `Mount_Assembly_Rear` must be direct children of a `RailRoot` whose local and global matrices exactly equal the original. Their new descendant nodes, mesh attributes, material groups, extras, and unit rigid transforms are preserved.

## Permitted modifications

- Preserve the entire original 3,533,132-byte BIN chunk as an identical output prefix. All 41 original accessors and 47 original bufferViews retain their exact definitions and data.
- Identify all nine original chassis components from their actual indices and welded positions, then require exact agreement with the frozen component bounds and triangle counts. Remove only components 7 and 8: front/rear old hitch boxes, 108 triangles each.
- Append a new 2,268-index accessor containing the exact ordered 756-triangle non-hitch subsequence. Change only `Chassis_Frame`'s primitive index reference; retain its original position, normal, UV and other attribute references. The seven retained chassis components and every other original mesh keep their actual triangle/attribute bytes unchanged.
- Append only mount geometry bufferViews/accessors/primitives/meshes/nodes. A selected view shared with a nonselected accessor or image is rejected. Each copied view must consist only of its actual selected accessor data and at most three zero alignment bytes per gap. No candidate texture or whole candidate BIN is appended.
- Reuse the original `metal`/`brass` materials after matching normalized PBR/texture/sampler semantics and actual embedded PNG/JPEG content SHA256. Candidate material names alone cannot establish a match. Original material, image, texture, and sampler definitions and image bytes remain exact.
- Patch the original JSON text at bounded spans: append entries to its node/mesh/accessor/bufferView arrays, append mount children to `RailRoot`, update the chassis index reference, and extend the single buffer's byteLength. All other original definition text remains literal source bytes.

Only one embedded glTF 2.0 JSON+BIN scene with indexed triangle primitives and fixed rigid frames is supported. Skins, morph targets, mesh weights, animation, cameras, extension semantics, fitting, rescaling, and unrelated shared geometry data are explicitly rejected.

The old hitch index accessor and unused old vertices remain in the immutable BIN prefix but no active primitive references the old hitch index accessor. Their unused bytes do not constitute active hitch geometry.

## Executed evidence

| Composition | Hardware input SHA256 | Composed GLB SHA256 | GLB bytes | Terminal result |
| --- | --- | --- | ---: | --- |
| Baseline | `8eb82e43eac118cbeb652f70755110215b1168202adb8ef28747e1fccc3093ce` | `0d2cc7e3c93fc07200dd97f70d76728b53b1df441cbd388deb04d3f065058e29` | 3,588,140 | compose/structural/independent each exit 0 |
| Routed | `575eaffa6f934ba52cc34fe34f37109a93aff960c0b8c350970b7ca9715ee1f3` | `7b6ae0f47746d4e8bd624ad2323f7cd20abec214711cbfb4e89329adc687202e` | 3,590,960 | compose/structural/independent each exit 0 |

Both outputs append nine accessors, nine bufferViews, two meshes and two nodes. Baseline appends 36,288 bytes of actual mount geometry plus 4,536 bytes of replacement chassis indices; routed appends 39,136 plus 4,536 bytes. Neither output adds alignment padding beyond those data in its declared buffer.

Both structural reports contain 0 errors, 6 `MESH_PRIMITIVE_GENERATED_TANGENT_SPACE` warnings and 14 informational messages. Four tangent warnings were present in the original structural report; the two appended textured mounts add two. The additional unused-object info identifies the retained original chassis index accessor 29. These reports establish structural validity, without claiming warning-free output or GPU rendering acceptance.

The independent verifier uses a separate GLB decoder, an outer-comma source-text splitter, Three.js matrix composition, and direct frozen-bounds triangle selection. It asserts every original packed accessor payload, original definition bytes/resources, original local/global node frames, exact ordered remaining chassis triangles, actual imported geometry and frames, semantic material/embedded bitmap correspondence, and complete appended-byte accounting. Its frozen-bounds selection must independently equal the composer's connected-component selection of the 216 removed triangles.

Evidence is retained under `evidence/composition/`:

- `wooden-car-{baseline,routed}-composed-run.json`: commands, exits, stdout/stderr hashes, validator messages, and input/output provenance.
- `wooden-car-{baseline,routed}-composed-independent.json`: assertions, all original accessor payload hashes and frames, removed triangle ordinals/indices, and imported hardware correspondence.
- `wooden-car-{baseline,routed}-composed-structural.json`: full Khronos structural reports.
- Corresponding `*-compose`, `*-structural`, and `*-independent` stdout/stderr files.
- `compose-car-baseline-source.mjs`: the exact composer source used for baseline, retained before adding stricter rejection of morph features and unrelated bytes inside selected views. The current module source/hash is recorded by routed composition.

Each composed GLB has an `outputs/*-composed.json` sidecar containing its composer source hash, actual input hashes, permitted JSON patches, component/geometry mappings and assertions.

## Exact appended mesh/accessor closure repair

Independent review identified a gap in the first verifier: it checked the appended node and bufferView inventories, but did not require an exact appended mesh/accessor inventory. No defect was established in the current composer's selected dependency closure. The previously accepted routed GLB was retained unchanged.

The old verifier source (`99873f1dd311aa8fb771819da643828277ed7b988c4d4d0646ec788d6c65f845`) and its earlier run/independent reports are preserved under `evidence/composition/new-closure-controls/`. Its successful reports establish the checks it actually performed; they did not establish complete appended mesh/accessor closure.

The repaired verifier (`7336160344a96a3506299b9eac3fb5f9bb478703306c79203c8286c2cbb8dfc7`) independently derives all required mesh and accessor indices from the actual two hardware mount subtrees. It verifies consistent one-to-one source/output dependency mappings, adds exactly one separate filtered chassis index accessor, and requires every appended mesh/accessor index to be covered by those required sets. Distinct source dependencies cannot collapse to one output resource, and one source dependency cannot spread across multiple output resources. Unreferenced appended duplicates are rejected even if they reuse an already valid view and have a coherently refreshed output SHA in their sidecar.

Actual Grok controls, without rerunning the composer or any motion/collision check:

| Model | SHA256 | Frozen old verifier | Repaired verifier |
| --- | --- | --- | --- |
| Append one unused duplicate mount mesh | `f6d09846ece5984971c7fe87882d96b5bafd73e08a506087da1bb01995d0c3e8` | exit 0, false acceptance | exit 1, exact mesh inventory rejection |
| Append one unused duplicate mount accessor over an existing view | `bcc5dced3b424f7096ebbbe0246668ba8b4efc299ece73fddc822e05dc4965cb` | exit 0, false acceptance | exit 1, exact accessor inventory rejection |
| Unchanged accepted routed composition | `7b6ae0f47746d4e8bd624ad2323f7cd20abec214711cbfb4e89329adc687202e` | prior exit 0 | new exit 0 |

The repaired positive report requires exactly two appended meshes and nine appended accessors: eight from the actual mounts, plus one filtered chassis indices accessor. Its new assertion is `exactAppendedMeshAccessorDependencyClosure=true`.

Retained repair evidence under `evidence/composition/new-closure-controls/` includes `old-execution.json` and `new-execution.json` (actual commands/exits/stdout/stderr/report hashes), `controls-provenance.json`, both synthetic GLBs and coherently refreshed sidecars, frozen old/new verifier sources, old false-positive reports, `routed-positive-new-verifier.json`, and `closure-manifest.json`. Existing baseline/routed composition outputs, sidecars, and earlier reports remain unchanged.

## Acceptance boundary

This composition/closure stage establishes composition fidelity only. The baseline carrier's known interference remains rejected. No 59-pose requalification was run in this stage. The separate subsequent [finite hardware run](../../docs/experiments/wooden-hitch/README.md) qualifies the unchanged routed car at exactly its 59 frozen flat poses. Continuous motion, grades/Z, native/original agreement, manufacturing/load/fatigue behavior, production integration, GPU rendering and human acceptance remain open. The composer supplies no collision omission, material substitution, fitting, or tolerance relaxation.
