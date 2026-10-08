# Editable finite wooden hitch experiment

AGY-authored replacement carrier/clevis/pins and a finite 0.20 m drawbar are
exported separately from the frozen original wooden car. The exact original car
bytes then receive the new hardware through bounded append composition. Actual
remote qualification and its limits are in the
[evidence report](../../docs/experiments/wooden-hitch/README.md).

## Retained source and reproduction

The executed workspace is `/workspace/coaster-wooden-hitch-authoring` on Grok
Bot; WD retains it at `/Volumes/WD/code/workspaces/coaster-wooden-hitch-authoring`.
Editable car/drawbar `.blend` masters, prior rejected inputs and actual run
snapshots are retained there. Shared original material inputs remain in the
detailed-assets and rct2-program workspaces. Do not execute this experiment
on Patrick's Mac.

- `sources/car-adapter-routed.py` preserves the reference authoring source and
  removes only its final two old hitch boxes. `mount-parts-routed.py` authors
  the new Y-shaped supports, clevises and pins.
- `sources/drawbar-adapter.py` and `drawbar-part.py` author the actual drilled
  eye/bar geometry and two endpoint nodes. `union-parts.py` performs offline
  exact unions on welded new parts only.
- `sources/candidate-export.py` exports real GLBs and packed editable masters
  with `blender --background --python-exit-code 1`. The material directory is
  `/workspace/coaster-detailed-assets/materials`. Source and master hashes are
  in the actual [export](../../docs/experiments/wooden-hitch/hardware-export.json).
- `compose-car.mjs --hardware INPUT --hardware-sha SHA --output OUTPUT` appends
  only the two actual mount subtrees to the exact original GLB. See
  [COMPOSITION.md](COMPOSITION.md). `evidence/composition/verify-composition.mjs`
  independently checks original definition/payload bytes, ordered removed
  triangles, resources, frames and exact appended dependencies.
- `check-joint.mjs` and `run-check.sh` replay the frozen fixture using explicit
  car/link/metadata hashes. The recorded command, executed source, contract and
  all three input snapshots remain in the actual run directory named by the
  evidence report. `checks/` retains source-only meaningful regression and
  attribute-diagnostic controls; synthetic outputs remain outside Git.
- `inspector/` retains the actual Model Workshop source and hashed asset index;
  its GLB/vendor inputs are retained externally. `capture.py` records actual
  default-profile Chrome response hashes, views, picking and disposal on Grok.

A narrow `.gitattributes` entry preserves the exact executed artist source
bytes, including its existing trailing blank line; its source checksum remains
unchanged. No physical check or tolerance is relaxed.

The original GLB, Three.js runtime and fixture paths are intentionally pinned
inside the experiment scripts. Restore those exact retained inputs before
replay; this is an evidence package, not a general asset merger or game adapter.
The original reference asset SHA is
`fc988c55ed60dcd5abf7c5e02ecbc1ac3a8cd828cfe7fe4bb8f30bcf21699b59`.
Frozen pose SHA is
`167ba3e1da273b66a4bc1d9fb1c3a6fe6c1ec0d2ea54673395f94ae73a287ab6`.

## Provenance and availability

All geometry and source are independently authored for this MIT project.
Existing Metal049A and WoodFloor043 maps retain their separate ambientCG CC0
provenance from the [original detailed asset laboratory](../detailed-assets/README.md)
and [material source records](../../docs/planning/materials-acquired.json).
No commercial-original sprite/texture or GPL implementation is bundled.
The original wood/metal image bytes and resource bindings are preserved.

Initial AGY tool-writing turns timed out without output. Later nonempty final
code turns completed with actual process exit 0, and root applied their returned
source fragments. Completed authoring audits remain alongside the evidence;
full raw streams and earlier timeout audits stay on WD. Runtime acceptance
comes from actual exports and checks, not executor completion labels.

This finite prototype adds no available ride, content profile, worker rule or
save version to the playable game. Continuous motion, native/station/boarding
integration, original comparisons, GPU and Patrick's art/play acceptance remain
open.
