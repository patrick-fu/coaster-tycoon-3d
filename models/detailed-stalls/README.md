# Detailed consumable buildings

These independent MIT buildings supply the new detailed Burger and Soft-drink
variants. They use a four-metre tile, a unit Y-up/+Z-front glTF frame and six
named anchors. Choose the actual `facility.open` state before static batching;
hidden shutter geometry must not render or intercept picking. Existing facility
identities retain their previous models and 16-unit reservation.

The Burger model has 11,322 evaluated triangles and 13 materials; Soft-drink
has 10,888 and 11. Each GLB embeds fifteen 512-pixel images. Blender 4.3.2
masters preserve seventeen original packed source maps, two derived albedos and the default open pose.
`source-manifest.json` records exact outputs, measured bounds, anchors and
retained editable masters. `material-provenance.json` records CC0 permissions
and source member hashes. Original game media are not included.

The independent authoring modules and exporter are in `scripts/art`. Their
UVs, anchors, shutter poses and unaffected geometry remain exact against the
material candidate. The Soft-drink DrainGrille alone is lifted one millimetre
to separate its dark top from the metal tray; its six-millimetre thickness is
unchanged. [Source/master proof](../../../docs/verification/detailed-stalls/root-grille-export-acceptance.json)
and [actual browser proof](../../../docs/verification/detailed-stalls/root-grille-browser-acceptance.json)
retain the original failed surface and corrected rays, pixels and poses.
Cream siding and the terracotta/teal roofs use portable albedos
derived from the CC0 sources: resize512, decode sRGB, apply the authored linear
MIX and encode sRGB. The exporter preserves the first packed payload; repacking
a generated image after it becomes FILE discards that payload in Blender4.3.2.
Exact source, master, GLB and four-color parity are retained in the
[material qualification](../../../docs/verification/detailed-stalls/root-repaired-material-acceptance.json). Execute only on
Grok Bot, with the recorded material corpus available:

```sh
blender --background --python-exit-code 1 --threads 4 \
  --python scripts/art/export-detailed-stall.py -- \
  --source scripts/art/burger-stall.py \
  --materials /workspace/coaster-detailed-assets/materials \
  --output /workspace/detailed-stall-export/burger.glb --batch-static --render
```

Use `scripts/art/soft-drink-stall.py` for the second building. The exporter
checks finite UV/geometry and the union of both supported poses before writing
the packed master and delivery model. CPU render and independent actual GLB/master checks qualify
these resources; new browser, public, representative GPU, original agreement and
Patrick's visual/play acceptance have separate evidence and status.
