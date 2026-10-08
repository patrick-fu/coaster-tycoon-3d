# Editable oak asset source

The playable park uses this independently authored oak for planted deciduous
trees and its deciduous perimeter trees. Geometry and authoring code are MIT;
ambientCG [Bark014](https://ambientcg.com/a/Bark014) and
[LeafSet026](https://ambientcg.com/a/LeafSet026) surfaces are CC0. Original RCT2
graphics are not distributed. See [asset notices](../../ui/models/trees/ASSET-NOTICES.txt).

The source builds a flared trunk, bifurcated branches and a dense crown of six
textured oak-leaf variations. Leaf cards use double-sided alpha masking rather
than translucent sorting. Bark color, roughness and normal maps and leaf color,
opacity and normals survive export. The runtime retains masked leaf shadows.

| Level | Evaluated triangles | GLB bytes | Use |
| --- | ---: | ---: | --- |
| 0 | 5,392 | 5,103,704 | Close camera |
| 1 | 1,633 | 4,806,916 | Park camera |
| 2 | 659 | 4,721,376 | Distant camera and perimeter |

Blender uses +Z up and -Y forward; export uses +Y up and +Z forward. All three
models have identity scale, a root and ground anchor at the origin, and actual
transformed vertices inside the existing 4 × 4 × 8 m scenery reservation. The
runtime positions and rotates the models without fitting their bounds. Camera
LOD selection changes presentation only; the park's placement, price, clearance
and save format retain their existing authoritative rules.

The checked GLBs and packed editable `.blend` masters remain in the external
asset workspace and on Grok Bot. The delivered
[separate glTF models](../../ui/models/trees/) share five published image files;
the complete eleven-file runtime payload is 5,325,346 bytes. This file sharing
does not claim GPU texture deduplication between independently loaded LODs.
[Export metadata](../../ui/models/trees/export-manifest.json) records exact
source, driver, master, GLB and runtime hashes.

## Reproduce on Grok Bot

Do not execute Blender, builds, validators or browser checks on Patrick's Mac.
The retained asset workspace is `/workspace/coaster-organic-tree`. It has
`sources`, `materials`, `outputs` and `checks` directories. Copy these five
source files into its `sources` directory. The material inputs are the provider's
1K PNG bundle under `materials/Bark014` and the provider's 1K PNG bundle under
`materials/leaf-candidates/LeafSet026`. Keep the provider metadata, license and
download hashes with the original bundles.

Export each LOD using Blender 4.3.2 on the remote host:

```sh
blender --background --python-exit-code 1 \
  --python /workspace/coaster-organic-tree/sources/export.py -- \
  --source /workspace/coaster-organic-tree/sources/organic-tree.py \
  --materials /workspace/coaster-organic-tree/materials \
  --output /workspace/coaster-organic-tree/outputs/organic-tree-lod0.glb \
  --lod 0 --batch-static --runtime-gltf
```

Repeat with `--lod 1` / `organic-tree-lod1.glb` and `--lod 2` /
`organic-tree-lod2.glb`. The explicit Python exit-code flag matters: otherwise a
Blender Python exception can return a successful shell status and leave an old
export on disk.

The existing remote `checks/node_modules` uses `gltf-validator`
`2.0.0-dev.3.10` and Three.js `0.186.1`. Run:

```sh
node /workspace/coaster-organic-tree/sources/validate-tree.mjs \
  /workspace/coaster-organic-tree
node /workspace/coaster-organic-tree/sources/validate-runtime-gltf.mjs \
  /workspace/coaster-organic-tree
```

The first validator checks actual transformed vertices, anchors, materials,
triangle budgets and current source/driver hashes. The second compares every
separate-runtime vertex coordinate and image byte hash with its inspected GLB.
Keep real exit statuses and logs. Copy only verified glTF/bin resources and
their shared textures into `ui/models/trees`; the ordinary remote web build
copies them to the browser distribution.

AGY authored the visual source in isolated, bounded tasks. Root integration
corrected winding, indexing, material ownership, shadow cloning and the tangent
export. Independent Sol Max review and actual remote checks are recorded in
[verification evidence](../../docs/verification/oak-scenery/README.md).

This is an art iteration. Patrick's overall visual acceptance, original-game
comparison and representative integrated-GPU qualification remain open.
