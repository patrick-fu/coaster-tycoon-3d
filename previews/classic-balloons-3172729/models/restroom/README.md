# Independent timber restroom

This MIT building has a single public entrance, a covered privacy baffle,
readable WC board, timber frame, plaster walls, roof vents and drainage details.
Geometry is independently authored. Its five surface families reuse the recorded
CC0 Wood096, WoodFloor043, RoofingTiles013A, Concrete034 and Metal049A inputs in
[the material provenance](../flume/material-provenance.json).

The exported asset has 3,826 triangles, eight mesh primitives and eight materials.
Its authoring tile is one unit, with +Y up and +Z front. Four named anchors mark
the ground, entrance, interior and WC sign. The renderer applies a uniform scale
of four to match the four-metre simulation tile. This preserves proportions
inside the dry 32-native-unit construction envelope.

[Source manifest](source-manifest.json) pins the GLB, authoring and exporter
bytes, and the external 21,202,922-byte editable packed Blender master.
[Export evidence](export-evidence.json) records the actual Blender 4.3.2 output.
Eight real close/overview renders and the full mirror/GLB/image reader qualify
the R4 art candidate. Actual browser loading, four-direction frames and scoped
native gameplay/persistence have passing retained evidence. The original native
PNG response-body compound check remains failed; separate read-only source/GLB
reconciliation preserves that failure. See the
[validation record](../../../docs/validation/gradual-restroom.md). Publication,
original agreement, human style and representative GPU checks remain separate.

The gradual service charges once on admission, then derives its inside/exit
occupancy from guest ownership. It has no invented capacity or queue. Its default
free admission and four-unit relief per tick are independent candidate values.
Legacy restrooms retain their existing service behavior.

Reproduce on Grok Bot with the retained material corpus:

```sh
blender --background --factory-startup --threads 2 --python-exit-code 1 \
  --python scripts/art/export-restroom.py -- \
  --source scripts/art/restroom.py \
  --materials /workspace/coaster-information-merchandise/source-r7/ui/textures/flume \
  --output /workspace/restroom-export/restroom.glb --batch-static --render
```
