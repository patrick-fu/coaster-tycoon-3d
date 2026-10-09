# Detailed consumable buildings

These independent MIT buildings supply the new detailed Burger and Soft-drink
variants. They use a four-metre tile, a unit Y-up/+Z-front glTF frame and six
named anchors. Choose the actual `facility.open` state before static batching;
hidden shutter geometry must not render or intercept picking. Existing facility
identities retain their previous models and 16-unit reservation.

The Burger model has 11,322 evaluated triangles and 13 materials; Soft-drink
has 10,888 and 11. Each GLB embeds fifteen 512-pixel images. Blender 4.3.2
masters preserve seventeen packed source maps and the default open pose.
`source-manifest.json` records exact outputs, measured bounds, anchors and
retained editable masters. `material-provenance.json` records CC0 permissions
and source member hashes. Original game media are not included.

The independent authoring modules and exporter are in `scripts/art`. Their
geometry-producing source is unchanged from the retained export inputs;
repository metadata notes omit historical authoring attempts. Execute only on
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
the packed master and delivery model. CPU render and asset checks qualify
these candidates; browser, public, representative GPU, original agreement and
Patrick's visual/play acceptance have separate evidence and status.
