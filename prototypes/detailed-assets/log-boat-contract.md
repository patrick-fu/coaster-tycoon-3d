# Independent four-seat log boat authoring contract

Root freezes this bounded candidate before shared simulation changes. This is
one representative model for the next contrasting Log Flume slice, not a bulk
style acceptance or an original LFB1 implementation. Retained metadata supports
four-seat membership; all following metric dimensions are independent choices.

Use Blender4.3.2. One self-contained Python module under500lines exports
`build_log_boat(materials)` and returns the root Blender object. It creates only
its own hierarchy; no scene reset, operators that touch unrelated objects,
files, textures, cameras, lighting, render, export or network side effects.
Root supplies real permitted materials; module keys exactly bark, timber,
cutwood, brass, upholstery, dark. No material loading or generated bitmap.

Authored delivered frame: glTF metres, +Y up/+Z forward. Source Blender frame
conversion `(x,y,z)->(x,-z,y)`. BoatRoot identity transform at design waterline
(0,0,0); local scale1. Hull and hardware actual bounds X±.600m, Y−.200..+.900m,
Z±1.900m. Four direct empty children `Seat_00`..`Seat_03`, unit rotations/scale,
hip locations (0,.600,1.050), (0,.600,.350), (0,.600,−.350),
(0,.600,−1.050)m, all face +Z. These are hip roots, not seat bases: saddle/seat
contact must be designed relative to these roots and an actual person later.

Design a convincing hollow oak-log vessel with swept sculpted bow/stern,
continuous rim and open four-place cockpit, layered bark exterior with useful
UV grain direction, visible cut end grain, smooth varnished inner surfaces,
four actual bench/backrest positions, foot wells, brass fasteners and restrained
functional handles. Avoid a box or full cylinder used as the finished hull.
Use designed cross sections and true rim/inner floor thickness; do not hide
overlapping solids or generate phantom riders, water, supports or station.
The future actual channel has2.0m inner width/2.4m outer width, inner floor
+.100m/waterline+.600m/wall top+1.000m relative to its course base, flat R8m
turns, zero bank, one4m-rise lift/drop with slope transitions. Nothing is
qualified against actual channel/rider meshes yet; root performs those checks.

All meshes have applied identity object transform, intentional outward winding
and explicit nondegenerate UVs on every face, including caps and seams. Keep
UVs useful for real material maps. Bound budget≤20000 triangles,≤50 mesh
objects,≤6 supplied materials, share repeated bench/fastener geometry. No
modifier-dependent export, unapplied object squash or internal bpy primitive
UV reliance. Clearly name parts for hull/inner floor/rim/seats/handles/hardware
measurement. Geometry must remain editable after export. No copyrighted
original pixels or copied GPL implementation.

Root owns source integration and all Blender/export/mesh/rider/channel/runtime
verification over SSH Grok Bot. The Mac only receives this source answer.
