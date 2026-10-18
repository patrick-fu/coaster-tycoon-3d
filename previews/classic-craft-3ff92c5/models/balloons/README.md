# Independent Balloon assets

The Balloon Stall and held balloon are independently authored MIT project models. Editable Python sources are in `scripts/art/balloon-stall.py` and `scripts/art/held-balloon.py`; use the existing `scripts/art/export-detailed-stall.py` remotely on Grok Bot. Never run asset builds or tests on the Mac.

The stall uses a native four-metre tile without arbitrary fitting, separate open/closed shutter nodes and embedded CC0-source textures. The held prop has independent skin/string meshes, no texture fetches and a hand anchor at the origin; saved palette colours tint only the skin. `source-manifest.json`, `material-provenance.json` and `export-evidence.json` retain exact sources, exported resources, external editable-master locations and finite qualification limits.

Remote Blender export/reopen and six CPU views are qualified. Runtime loader, native guest hand placement/picking, performance, original-style fidelity and human visual acceptance are separate gates.
