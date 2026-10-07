# Detailed asset sample authoring contract

This laboratory answers whether actual editable meshes/UV/materials and GLB
delivery can improve the rejected primitive miniature. It does not add newly
simulated rides/services or settle original collision/metre conversion.

Each AGY visual author owns one file under `sources/`:

- `wooden-car.py`: four-passenger PTCT1-inspired independent wooden train car.
- `timber-station.py`: one modular timber station bay with roof/deck/gates/anchors.
- `information-kiosk.py`: information kiosk with four counter fronts plus map and
  opened umbrella props. Product/clearance semantics remain reference-bound.

Do not write outside your source file. Root owns export, viewer, checks and
integration. No local execution; Grok Bot has Blender 4.3.2 and its glTF exporter.
All model sources, comments and UI are English. Reference images are observation
only; geometry is independently authored. Use the supplied actual material maps.

## Blender source function

Write a self-contained Python module using `bpy`, `math`, `mathutils` and standard
library, with `def build(materials):`. It creates its object hierarchy and returns
an English metadata dictionary: `assetId`, `referenceVariant`, `candidateDimensions`,
`anchors` (actual named empty nodes), `restraints` (actual hinge nodes if any),
`notes`, and `geometryIntent`. It must not render, export, read/write disk, install
dependencies or delete scene objects. Root's driver starts an empty scene, calls
this function, records/export checks and saves the editable `.blend`.

`materials` is a dictionary of actual `bpy.types.Material` objects. Keys:
`timber`, `boards`, `roof`, `metal`, `brick`, `fabric`, `paint_red`, `paint_teal`,
`cream`, `brass`, `rubber`, `seat_vinyl`, `glass`, `ink`, `paper`, `grass`.
Shared texture materials expose UV coordinates; meshes need explicit sensible UVs
with grain/roof courses oriented. New authored solid-color materials are allowed;
no invented image files or external paths. Image-derived normal maps are OpenGL.

Blender authoring axes: +X right, **−Y forward/frontage**, +Z up; origin at the
ground/rail reference. glTF export converts to +Y up and +Z frontage. Candidate
tile pitch is 4 m; do not claim this is the original metric. Car target width
~1.3–1.5 m, length~2.5–2.8 m with two rows/two seats; kiosk footprint~3.6–3.8 m
square; station exactly one 4 m repeat bay. Vertical visual proportions may
exceed the current generic 2 m reservation because this is a labelled asset
viewer. Do not edit production reservations or fit/squash geometry.

## Visible geometry, not primitive decoration

Design shaped massing, rounded/chamfered edges, recessed openings, thickness,
layered construction and appropriate topology. Do not substitute spheres for
organic detail or bare boxes for body/roofs. Repeated structural posts, wheel
cylinders and boards are legitimate components within a deliberately modelled
asset. Details must be readable at 4 m/tile overview and close views.

Four-seat car: sculpted timber tub/nose with curved/beveled panels, individual
padded seats/backs, two hinged lap bars, front/rear bogies with road/guide/upstop
wheel groups, axles/frame/brake/coupler detail. Four `Seat_*` nodes agree with
the actual seats; front is −Y. No eight-seat fictional capacity. Named `RailRoot`,
`BogieFront`, `BogieRear` and restraint hinges allow later actual pose tests.

Station: repeated timber roof/truss/ridge/eaves, boards/kerbs/handrails, rail
trough with realistic deck gap, queue gate and separate exit interface, operator
equipment/sign. Both bay endpoints match 4 m repeat pitch. Interior is visible
from a normal isometric view; roof thickness and material scale matter.

Kiosk: shaped roof/cupola/eaves, timber siding/trim/pillars, genuinely open
counter recesses on four sides, menu/map detail and sensible base. Include a
separate folded map model and octagonal umbrella with curved shaft, spokes,
fabric panels/hem; name `PropMap`/`PropUmbrella` roots, isolate them for inspection.
Use neutral project text (`PARK INFO`), no original brand or copied signage art.

Target budgets are candidates: car5–12k triangles, station/kiosk6–15k. Prefer
silhouette and visible structure over hundreds of invisible micro-bolts.
Smooth normals use explicit hard-edge/bevel decisions. UVs must survive export;
all transforms are intentional. Use rigid node articulation for these assets,
not an unnecessary skeleton. Parent mesh nodes to meaningful roots without
double-applying transforms. Geometry and anchors must have finite coordinates.

Root reviews actual diff and remotely runs export/structural/pose/material checks,
renders multiple views and inspects the actual result. Code-written success or
the planning document cannot establish model quality. State any deferred detail.
