# Mixed wooden integration sources

These sources support the independently authored
[finite mixed operating contract](../../docs/mixed-coasters.md). They are not a
second game or an original RCT2 asset importer. Run compilation, Blender exports,
simulation and browser checks on Grok Bot; keep editable masters/material inputs
and retained evidence on WD.

## Asset route

- The original detailed car and hitch sources are in
  [the detailed asset laboratory](../detailed-assets/README.md) and
  [the finite hitch experiment](../../docs/experiments/wooden-hitch/README.md).
- `running-gear.py` authors only the four replacement bogie leaves.
  `compose-running-gear.mjs` requires the frozen source GLB hash and explicit
  parts hash, removes exactly two disconnected bracket components per bogie and
  appends new leaves while preserving original BIN bytes and source transforms.
  Its proposed rail-profile metadata is not production geometry: the accepted
  rail web is inboard, as the executed contact record documents.
- `../detailed-assets/sources/station-gates.py` and
  `playable-timber-station.py` apply the bounded station gate/rail-bed refinement.
  Imported car/link/station GLBs remain at unit scale in `ui/models/wooden`.
- Material acquisition and editable masters remain under
  `/Volumes/WD/code/workspaces/coaster-detailed-assets-authoring`,
  `/Volumes/WD/code/workspaces/coaster-wooden-running-gear`,
  `/Volumes/WD/code/workspaces/coaster-wooden-station-gates` and their recorded
  retained input/evidence paths. Do not delete them as build cache.

## Verification sources

`capture.py` owns a Grok Bot HTTP server and default-profile Chrome only for its
bounded check, and closes both in `finally`. `COASTER_BROWSER_EVIDENCE` chooses
a fresh evidence directory. Matching actual Engine-generated checkpoints are
required for cross-save selection and readable paid-train views; do not inject
renderer poses or replace complete numeric Rules to bypass validation.

`lifecycle.js` uses actual GLTFLoader failure/late-completion/cancel controls.
`browser-controls.mjs` generates matching-rule valid parks for ID reuse and the
three-steel camera control. `foundation-control.mjs` compares the frozen old
admission behavior with the finite ground-only rejection. `compare-track.mjs`
checks indexed generated triangle/normal/UV correspondence with the retained
pre-merge renderer. Red modules and test HTML are served only during checks;
they are removed from publication output.

The [verification record](../../docs/verification/mixed-wooden/README.md) pins
actual inputs, exits, raw failures, repaired controls and unexecuted gates.
