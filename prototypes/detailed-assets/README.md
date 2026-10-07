# Detailed asset laboratory

Review three independently authored editable assets in the
[Model Workshop](https://patrick-fu.github.io/coaster-tycoon-3d/previews/model-workshop/):
a four-seat wooden coaster car, a repeatable timber station bay and an
information kiosk with map/umbrella props. This laboratory implements no new
production rides, transactions or save format.

The sources contain real meshes, UV coordinates, material assignments and
named anchors. Blender saves a compressed, editable `.blend` master with packed
1K source images before reducing delivery images to 512 pixels and grouping
static export meshes. Lap-bar hinges and prop/placement roots remain separate.
Geometry, material files and delivered binaries have recorded SHA-256 hashes.

The candidate 4 m repeat pitch and rendered proportions do not establish
original metric/collision parity. All delivered root scales are identity. These
models are inspected independently of the current park renderer; they must not
be squashed into its uncalibrated reservations.

## Reproduce on Grok Bot

Do not execute Blender, npm checks, rendering or browser validation on Patrick's
Mac. The measured host is Debian 13, Blender **4.3.2**, Node **20.19.2** and
software WebGL. Remote workspace: `/workspace/coaster-detailed-assets`.

1. Copy `export.py`, `package.py`, `capture.py` and the three authoring modules
   into the remote `sources/` directory. Copy `index.html`, `style.css`,
   `viewer.js` and `validate.mjs` into `site/`.
2. Copy this directory's `package.json`/`package-lock.json` into `checks/` and
   run `npm ci --prefix /workspace/coaster-detailed-assets/checks` remotely.
3. Extract the acquired 1K PNG material files into `materials/<asset-id>/`.
   Used sources: Wood096, WoodFloor043, RoofingTiles013A, Metal049A,
   Fabric081C and Bricks051. See the programme's
   [acquisition manifest](../../docs/planning/materials-acquired.json).
4. For each authoring module, invoke the remote exporter, for example:

   ```sh
   blender --background --factory-startup --threads 4 --python-exit-code 1 \
     --python /workspace/coaster-detailed-assets/sources/export.py -- \
     --source /workspace/coaster-detailed-assets/sources/wooden-car.py \
     --materials /workspace/coaster-detailed-assets/materials \
     --output /workspace/coaster-detailed-assets/outputs/wooden-car.glb \
     --batch-static
   ```

5. Run `node site/validate.mjs /workspace/coaster-detailed-assets`, then
   `python3 sources/package.py --workspace /workspace/coaster-detailed-assets`.
6. Run `capture.py` using the remote Python environment with `websockets`.
   It uses Chrome for Testing with the existing default Chrome profile and
   closes its own browser/server. It refuses to proceed if an existing page is
   present. `--url` checks a published URL; `--output` keeps that result separate.

The browser binary/version/source hash and final checks are recorded in
[evidence](evidence/). That evidence qualifies the frozen source and binaries,
not every future export or deployment. CPU Cycles rendering is optional
(`--render`); the retained browser captures show the delivered GLB.

## Provenance and scope

Project code and authored geometry are MIT. Texture inputs are ambientCG CC0;
the package includes their notice and the Three.js MIT licence. Original RCT2
media remains an external observation corpus. No original game object, sprite,
scenario or commercial texture is included in the release.

The wooden car is a four-seat PTCT1 comparison candidate, not an original 3D
asset. The kiosk is an independently designed four-frontage information stall;
its umbrella and map demonstrate separately addressable props. It is not proof
of product simulation or a new generic service-centre mechanic.

The car and station exceed the initial triangle budgets, and the runtime
package embeds separate image sets rather than a production shared atlas.
Seat contours, timber palette, signage scale and park-distance readability
remain visual review items. There is no park-scale LOD, instancing, integrated
GPU qualification, passenger/hinge clearance proof, original gameplay
comparison or Patrick visual acceptance in this laboratory.

## Investigation record

- AGY authored each model and the frontend shell in separate write scopes.
  Initial runs repeatedly read unrelated code and were interrupted. Narrowed
  resumes produced usable source. Two later style runs timed out with empty
  terminal responses despite reporting SUCCESS; their partial files were
  independently corrected, not treated as completed delegations. See
  [delegation audit](delegation-audit.json).
- Root corrected geometry winding/bounds, anchor identities, wheel/rail gaps,
  station openings, texture path/export handling and stale loader ownership.
  The acquired maps needed genuine UVs and deliberate color treatment; merely
  adding textures did not resolve silhouette or seating quality.
- A same-source station comparison changed only static export grouping:
  **148 to 9 mesh nodes**, with **15,984 triangles** and the same anchors.
  Later visual changes alter that baseline; they are not part of the ablation.
- Chrome's installed build rejected default-directory remote debugging.
  Chrome for Testing provided that access without making a separate profile.
  Browser loading exposed a missing addon dependency; the packager now copies
  the actual relative-import closure.
- Independent Sol Max review found a first-load Reload dead end and missing
  decoded-bitmap disposal. The first-load failure was reproduced before its
  fix. Upload-stack and bitmap-ID traces then identified a disposed station
  image in Three's shared shadow-material uniform. Asset-owned depth materials
  now retire that sampler with the model. This route covers the current opaque
  assets and directional PCF shadows; it is not a general transparent/point-
  light material solution. Final checks accumulate GL errors rather than
  consuming one error only when a status snapshot is taken.

The full programme, source-linked catalogue and dependency order are in
[the implementation route](../../docs/planning/rct2-program.md). Bulk asset
authoring follows review of these actual samples; content identity/save
migration and exact original observations have separate gates.
