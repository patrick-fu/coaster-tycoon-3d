# Independent information kiosk

This timber kiosk is an independently authored MIT model for the information
facility. It has four public-path counters, map stacks, an umbrella display,
four INFO signs, a warm shingle roof and a teal cupola. It uses a four-metre
tile and unit Y-up/+Z-front glTF frame. Placement reserves 32 native height
units above dry ground; the model stays within +/-1.95 metres horizontally
and 0–3.85 metres vertically.

The delivery GLB has 12,864 triangles, 39 mesh primitives and ten materials.
Eight named anchors define the ground, four counters, front sign and two
product props. The game validates these anchors and the unit frame before
offering the kiosk in the Library or dispatching kiosk placement/import.
Map and Umbrella are permanent guest items with independent prices and
accounts. The visible umbrella colour is fixed for this finite candidate.

[Source manifest](source-manifest.json) records exact authoring/exporter/GLB
hashes and the retained 25,904,218-byte editable Blender master on WD.
[Export evidence](export-evidence.json) records the Blender 4.3.2 export.
Materials reuse the separately recorded
[CC0 source maps](../detailed-stalls/material-provenance.json); no original
game media are included. The independent source preserves useful AGY geometry
and Root's measured specular and hip-UV corrections. Actual exported roof
specular factor is 0.3; the original three roof texture roles remain unchanged.

Reproduce only on Grok Bot with the recorded material corpus available:

```sh
blender --background --python-exit-code 1 --threads 4 \
  --python scripts/art/export-information-kiosk.py -- \
  --source scripts/art/information-kiosk.py \
  --materials /workspace/coaster-detailed-assets/materials \
  --output /workspace/information-kiosk-export/information-kiosk.glb \
  --batch-static --render
```

Isolated export, material and pixel checks qualify the R7 candidate. Actual
Chrome integration, publication, original-game agreement, representative GPU
and Patrick's visual/play acceptance have separate evidence and status in
[project progress](../../../PROGRESS.md).
