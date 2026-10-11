# Log Flume art resources

These are independently authored candidate resources for the MIT project.
They are not original game media. The boat and rider are exact retained
exports; this directory does not imply playable or visual acceptance.

- `boat.glb`: V5 boat, 8 meshes and 1,916 triangles. Unit `BoatRoot`, local
  Y-up/Z-forward. Direct `Seat_00` through `Seat_03` Hip anchors are at
  `(0, .6, 1.05/.35/-.35/-1.05)` metres.
- `rider.glb`: finite fitted rider, 15 meshes and 1,700 triangles. Unit
  `RiderRoot` with anatomical Hip at zero. Parent each actual occupied clone
  to its literal boat Hip without fitting, moving the datum or scaling.
- `source-manifest.json` identifies exact exports, editable master hashes
  and delivered map bytes. Editable masters and failed experiments stay in
  the external authoring corpus rather than the browser distribution.
- `material-provenance.json` records retained CC0 provider bundles and
  member hashes. Channel maps under `textures/flume` are the unmodified
  acquired colour, OpenGL-normal and roughness members. Bark and fabric
  inputs are embedded in the authored models; endgrain is project art.

The finite rider-to-boat contact gate covers four seats, twelve support
patches and 300 samples, with actual collision and displaced-patch controls.
It does not establish a continuous channel sweep, production walking,
representative GPU performance or Patrick's visual/play acceptance.

Public Boat frames already use metres and include water height. Static
channel frames use native millimetres. Neither requires a second half-tile
offset. Resources should load only when a supported Flume ride is present.
