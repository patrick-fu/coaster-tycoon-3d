"""Victorian park restroom asset generator for Blender 4.3.2.

Constructs an independently authored, game-ready Victorian timber and plaster
park restroom on a normalized unit tile with explicit UVs, strict bounds,
correct outward normals, and named semantic anchors.
"""

import math
import bpy
from mathutils import Vector


class _MeshBuilder:
    """Helper for assembling low-poly geometry with per-loop UVs and outward normals."""

    def __init__(self):
        self.verts = []
        self.faces = []
        self.face_uvs = []
        self.smooth = []

    def add_quad(self, v0, v1, v2, v3, uvs, smooth=False):
        idx = len(self.verts)
        self.verts.extend([v0, v1, v2, v3])
        self.faces.append([idx, idx + 1, idx + 2, idx + 3])
        self.face_uvs.append(uvs)
        self.smooth.append(smooth)

    def add_tri(self, v0, v1, v2, uvs, smooth=False):
        idx = len(self.verts)
        self.verts.extend([v0, v1, v2])
        self.faces.append([idx, idx + 1, idx + 2])
        self.face_uvs.append(uvs)
        self.smooth.append(smooth)

    def add_box(self, x0, x1, y0, y1, z0, z1, uv_scale=(2.0, 2.0)):
        xa, xb = min(x0, x1), max(x0, x1)
        ya, yb = min(y0, y1), max(y0, y1)
        za, zb = min(z0, z1), max(z0, z1)
        sx, sy = uv_scale

        p000 = (xa, ya, za)
        p100 = (xb, ya, za)
        p110 = (xb, yb, za)
        p010 = (xa, yb, za)
        p001 = (xa, ya, zb)
        p101 = (xb, ya, zb)
        p111 = (xb, yb, zb)
        p011 = (xa, yb, zb)

        # Bottom (-Z) & Top (+Z)
        self.add_quad(
            p000, p010, p110, p100,
            [(xa * sx, ya * sy), (xa * sx, yb * sy), (xb * sx, yb * sy), (xb * sx, ya * sy)]
        )
        self.add_quad(
            p001, p101, p111, p011,
            [(xa * sx, ya * sy), (xb * sx, ya * sy), (xb * sx, yb * sy), (xa * sx, yb * sy)]
        )
        # Front (-Y) & Back (+Y)
        self.add_quad(
            p000, p100, p101, p001,
            [(xa * sx, za * sy), (xb * sx, za * sy), (xb * sx, zb * sy), (xa * sx, zb * sy)]
        )
        self.add_quad(
            p110, p010, p011, p111,
            [(xb * sx, za * sy), (xa * sx, za * sy), (xa * sx, zb * sy), (xb * sx, zb * sy)]
        )
        # Left (-X) & Right (+X)
        self.add_quad(
            p010, p000, p001, p011,
            [(yb * sx, za * sy), (ya * sx, za * sy), (ya * sx, zb * sy), (yb * sx, zb * sy)]
        )
        self.add_quad(
            p100, p110, p111, p101,
            [(ya * sx, za * sy), (yb * sx, za * sy), (yb * sx, zb * sy), (ya * sx, zb * sy)]
        )

    def add_oriented_beam(self, p1, p2, width=0.022, depth=0.024, up_axis=(0.0, 1.0, 0.0), uv_scale=(1.5, 3.0)):
        """Builds an oriented 3D rectangular beam between p1 and p2 with outward winding and length UVs."""
        v1 = Vector(p1)
        v2 = Vector(p2)
        axis = v2 - v1
        length = axis.length
        if length < 1e-6:
            return
        ez = axis.normalized()

        up = Vector(up_axis).normalized()
        if abs(ez.dot(up)) > 0.99:
            up = Vector((1.0, 0.0, 0.0))

        ex = up.cross(ez).normalized()
        ey = ez.cross(ex).normalized()

        hw = width * 0.5
        hd = depth * 0.5

        c0 = -hw * ex - hd * ey
        c1 = hw * ex - hd * ey
        c2 = hw * ex + hd * ey
        c3 = -hw * ex + hd * ey

        q0, q1, q2, q3 = v1 + c0, v1 + c1, v1 + c2, v1 + c3
        q4, q5, q6, q7 = v2 + c0, v2 + c1, v2 + c2, v2 + c3

        su, sv = uv_scale
        w_u, d_u, len_v = width * su, depth * su, length * sv

        # End cap at p1 (-ez)
        self.add_quad(
            (q0.x, q0.y, q0.z), (q3.x, q3.y, q3.z), (q2.x, q2.y, q2.z), (q1.x, q1.y, q1.z),
            [(0.0, 0.0), (0.0, d_u), (w_u, d_u), (w_u, 0.0)]
        )
        # End cap at p2 (+ez)
        self.add_quad(
            (q4.x, q4.y, q4.z), (q5.x, q5.y, q5.z), (q6.x, q6.y, q6.z), (q7.x, q7.y, q7.z),
            [(0.0, 0.0), (w_u, 0.0), (w_u, d_u), (0.0, d_u)]
        )
        # Side face -ey
        self.add_quad(
            (q0.x, q0.y, q0.z), (q1.x, q1.y, q1.z), (q5.x, q5.y, q5.z), (q4.x, q4.y, q4.z),
            [(0.0, 0.0), (w_u, 0.0), (w_u, len_v), (0.0, len_v)]
        )
        # Side face +ex
        self.add_quad(
            (q1.x, q1.y, q1.z), (q2.x, q2.y, q2.z), (q6.x, q6.y, q6.z), (q5.x, q5.y, q5.z),
            [(0.0, 0.0), (d_u, 0.0), (d_u, len_v), (0.0, len_v)]
        )
        # Side face +ey
        self.add_quad(
            (q2.x, q2.y, q2.z), (q3.x, q3.y, q3.z), (q7.x, q7.y, q7.z), (q6.x, q6.y, q6.z),
            [(0.0, 0.0), (w_u, 0.0), (w_u, len_v), (0.0, len_v)]
        )
        # Side face -ex
        self.add_quad(
            (q3.x, q3.y, q3.z), (q0.x, q0.y, q0.z), (q4.x, q4.y, q4.z), (q7.x, q7.y, q7.z),
            [(0.0, 0.0), (d_u, 0.0), (d_u, len_v), (0.0, len_v)]
        )

    def add_cylinder(self, p1, p2, radius, segments=8, uv_scale=(1.0, 2.0)):
        v1 = Vector(p1)
        v2 = Vector(p2)
        axis = v2 - v1
        length = axis.length
        if length < 1e-6:
            return
        d = axis.normalized()

        ref = Vector((0.0, 0.0, 1.0)) if abs(d.z) < 0.9 else Vector((1.0, 0.0, 0.0))
        u_vec = d.cross(ref).normalized()
        v_vec = d.cross(u_vec).normalized()

        ring1, ring2 = [], []
        for i in range(segments):
            th = 2.0 * math.pi * i / segments
            c, s = math.cos(th), math.sin(th)
            offset = radius * (c * u_vec + s * v_vec)
            ring1.append(v1 + offset)
            ring2.append(v2 + offset)

        su, sv = uv_scale
        for i in range(segments):
            j = (i + 1) % segments
            u0 = (i / segments) * su
            u1 = ((i + 1) / segments) * su
            v0 = 0.0
            v1 = length * sv
            self.add_quad(
                (ring1[i].x, ring1[i].y, ring1[i].z),
                (ring1[j].x, ring1[j].y, ring1[j].z),
                (ring2[j].x, ring2[j].y, ring2[j].z),
                (ring2[i].x, ring2[i].y, ring2[i].z),
                [(u0, v0), (u1, v0), (u1, v1), (u0, v1)],
                smooth=True
            )


def _build_mesh_object(name, builder, material, parent, col):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(builder.verts, [], builder.faces)
    mesh.update()

    if builder.face_uvs:
        uv_layer = mesh.uv_layers.new(name="UVMap")
        uv_data = uv_layer.data
        for poly_idx, poly in enumerate(mesh.polygons):
            if poly_idx < len(builder.face_uvs):
                uvs = builder.face_uvs[poly_idx]
                for i, loop_idx in enumerate(poly.loop_indices):
                    if i < len(uvs):
                        uv_data[loop_idx].uv = uvs[i]

    for poly_idx, poly in enumerate(mesh.polygons):
        if poly_idx < len(builder.smooth):
            poly.use_smooth = builder.smooth[poly_idx]

    obj = bpy.data.objects.new(name, mesh)
    if material:
        obj.data.materials.append(material)
    if parent:
        obj.parent = parent
    col.objects.link(obj)
    return obj


def _create_anchor(name, location, parent, col):
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = 'PLAIN_AXES'
    empty.location = location
    empty.parent = parent
    col.objects.link(empty)
    return empty


def _resolve_materials(materials):
    keys = ["timber", "boards", "roof", "plaster", "metal", "paint_teal", "cream", "ink"]
    resolved = {}
    for k in keys:
        if materials and k in materials and materials[k] is not None:
            resolved[k] = materials[k]
        else:
            mat = bpy.data.materials.new(name=f"Mat_{k}")
            mat.use_nodes = True
            resolved[k] = mat
    return resolved


def build(materials=None):
    """Builds the complete Victorian park restroom model.

    Args:
        materials: Dictionary holding callers' materials. Never mutated.

    Returns:
        JSON-serializable metadata dictionary.
    """
    mats = _resolve_materials(materials)
    col = bpy.context.collection if bpy.context.collection else bpy.context.scene.collection

    # Primary scene root at unit tile origin
    root = bpy.data.objects.new("RestroomRoot", None)
    root.empty_display_type = 'PLAIN_AXES'
    root.location = (0.0, 0.0, 0.0)
    root.scale = (1.0, 1.0, 1.0)
    col.objects.link(root)

    # 1. Stepped Grey Masonry Plinth (Concrete034 / plaster)
    mb_plinth = _MeshBuilder()
    mb_plinth.add_box(-0.38, 0.38, -0.42, 0.38, 0.0, 0.035, uv_scale=(2.5, 2.5))
    mb_plinth.add_box(-0.36, 0.36, -0.40, 0.36, 0.035, 0.065, uv_scale=(2.5, 2.5))
    mb_plinth.add_box(-0.19, 0.19, -0.47, -0.42, 0.0, 0.035, uv_scale=(3.0, 3.0))
    mb_plinth.add_box(-0.17, 0.17, -0.45, -0.42, 0.035, 0.065, uv_scale=(3.0, 3.0))
    _build_mesh_object("Restroom_Plinth", mb_plinth, mats["plaster"], root, col)

    # 2. Porch Deck & Interior Floorboards (WoodFloor043 / boards)
    mb_deck = _MeshBuilder()
    mb_deck.add_box(-0.165, 0.165, -0.42, -0.24, 0.035, 0.066, uv_scale=(3.0, 3.0))
    mb_deck.add_box(-0.34, 0.34, -0.24, 0.34, 0.035, 0.066, uv_scale=(3.0, 3.0))
    _build_mesh_object("Restroom_Deck", mb_deck, mats["boards"], root, col)

    # 3. Inset Warm Plaster Bays & Gables (Concrete034 / plaster)
    mb_plaster = _MeshBuilder()
    mb_plaster.add_box(-0.342, -0.338, -0.32, 0.34, 0.065, 0.495, uv_scale=(2.0, 2.0))
    mb_plaster.add_box(0.338, 0.342, -0.32, 0.34, 0.065, 0.495, uv_scale=(2.0, 2.0))
    mb_plaster.add_box(-0.338, 0.338, 0.338, 0.342, 0.065, 0.495, uv_scale=(2.0, 2.0))
    mb_plaster.add_box(-0.338, -0.155, -0.322, -0.318, 0.065, 0.495, uv_scale=(2.0, 2.0))
    mb_plaster.add_box(0.155, 0.338, -0.322, -0.318, 0.065, 0.495, uv_scale=(2.0, 2.0))
    mb_plaster.add_box(-0.16, -0.156, -0.32, -0.20, 0.065, 0.495, uv_scale=(2.0, 2.0))
    mb_plaster.add_box(0.156, 0.16, -0.32, -0.20, 0.065, 0.495, uv_scale=(2.0, 2.0))
    mb_plaster.add_tri(
        (-0.34, -0.32, 0.495), (0.34, -0.32, 0.495), (0.0, -0.32, 0.69),
        [(-0.34, 0.495), (0.34, 0.495), (0.0, 0.69)]
    )
    mb_plaster.add_tri(
        (0.34, 0.34, 0.495), (-0.34, 0.34, 0.495), (0.0, 0.34, 0.69),
        [(0.34, 0.495), (-0.34, 0.495), (0.0, 0.69)]
    )
    _build_mesh_object("Restroom_Walls_Plaster", mb_plaster, mats["plaster"], root, col)

    # 4. Victorian Timber Framing, Braces & Doorway Trim (Wood096 / timber)
    mb_timber = _MeshBuilder()
    for cx in (-0.355, 0.325):
        for cy in (-0.335, 0.325):
            mb_timber.add_box(cx, cx + 0.03, cy, cy + 0.03, 0.065, 0.51, uv_scale=(1.5, 4.0))

    # Base sills
    mb_timber.add_box(-0.355, -0.325, -0.335, 0.345, 0.065, 0.09, uv_scale=(1.5, 4.0))
    mb_timber.add_box(0.325, 0.355, -0.335, 0.345, 0.065, 0.09, uv_scale=(1.5, 4.0))
    mb_timber.add_box(-0.355, 0.355, 0.325, 0.355, 0.065, 0.09, uv_scale=(4.0, 1.5))
    mb_timber.add_box(-0.355, -0.15, -0.335, -0.305, 0.065, 0.09, uv_scale=(3.0, 1.5))
    mb_timber.add_box(0.15, 0.355, -0.335, -0.305, 0.065, 0.09, uv_scale=(3.0, 1.5))

    # Mid-rails
    mb_timber.add_box(-0.355, -0.325, -0.335, 0.345, 0.27, 0.295, uv_scale=(1.5, 4.0))
    mb_timber.add_box(0.325, 0.355, -0.335, 0.345, 0.27, 0.295, uv_scale=(1.5, 4.0))
    mb_timber.add_box(-0.355, 0.355, 0.325, 0.355, 0.27, 0.295, uv_scale=(4.0, 1.5))
    mb_timber.add_box(-0.355, -0.15, -0.335, -0.305, 0.27, 0.295, uv_scale=(3.0, 1.5))
    mb_timber.add_box(0.15, 0.355, -0.335, -0.305, 0.27, 0.295, uv_scale=(3.0, 1.5))

    # Top wall plates
    mb_timber.add_box(-0.36, -0.325, -0.34, 0.35, 0.49, 0.515, uv_scale=(1.5, 4.0))
    mb_timber.add_box(0.325, 0.36, -0.34, 0.35, 0.49, 0.515, uv_scale=(1.5, 4.0))
    mb_timber.add_box(-0.36, 0.36, 0.325, 0.355, 0.49, 0.515, uv_scale=(4.0, 1.5))
    mb_timber.add_box(-0.36, 0.36, -0.335, -0.305, 0.49, 0.515, uv_scale=(4.0, 1.5))

    # Doorway frame jambs and molded lintel
    mb_timber.add_box(-0.165, -0.14, -0.335, -0.31, 0.065, 0.49, uv_scale=(1.5, 4.0))
    mb_timber.add_box(0.14, 0.165, -0.335, -0.31, 0.065, 0.49, uv_scale=(1.5, 4.0))
    mb_timber.add_box(-0.175, 0.175, -0.34, -0.305, 0.46, 0.49, uv_scale=(4.0, 1.5))

    # Rear center division stud
    mb_timber.add_box(-0.015, 0.015, 0.325, 0.355, 0.065, 0.49, uv_scale=(1.5, 4.0))

    # Porch posts, chamfered details and corbels
    for px in (-0.175, 0.145):
        mb_timber.add_box(px - 0.005, px + 0.035, -0.425, -0.395, 0.035, 0.08, uv_scale=(2.0, 2.0))
        mb_timber.add_box(px, px + 0.03, -0.42, -0.395, 0.08, 0.51, uv_scale=(1.5, 4.0))
        corbel_x0 = px - 0.03 if px < 0 else px
        corbel_x1 = px + 0.03 if px < 0 else px + 0.06
        mb_timber.add_box(corbel_x0, corbel_x1, -0.425, -0.39, 0.45, 0.51, uv_scale=(2.0, 2.0))

    # Porch tie beam and side rafters
    mb_timber.add_box(-0.19, 0.19, -0.43, -0.395, 0.49, 0.525, uv_scale=(4.0, 1.5))
    mb_timber.add_box(-0.18, -0.145, -0.42, -0.32, 0.49, 0.52, uv_scale=(1.5, 3.0))
    mb_timber.add_box(0.145, 0.18, -0.42, -0.32, 0.49, 0.52, uv_scale=(1.5, 3.0))

    # Porch low side handrails
    for hx in (-0.175, 0.145):
        mb_timber.add_box(hx, hx + 0.025, -0.41, -0.32, 0.21, 0.23, uv_scale=(1.5, 3.0))
        mb_timber.add_box(hx, hx + 0.025, -0.37, -0.35, 0.065, 0.21, uv_scale=(1.5, 3.0))

    # Pitched rake beams following (-0.445,y,0.485)->(0,y,0.735)->(0.445,y,0.485)
    for y_rake in (-0.465, 0.435):
        mb_timber.add_oriented_beam(
            (-0.445, y_rake, 0.485), (0.0, y_rake, 0.735),
            width=0.022, depth=0.024, up_axis=(0.0, 1.0, 0.0)
        )
        mb_timber.add_oriented_beam(
            (0.0, y_rake, 0.735), (0.445, y_rake, 0.485),
            width=0.022, depth=0.024, up_axis=(0.0, 1.0, 0.0)
        )

    # Front gable decoration: raised strictly above z=0.62 to clear WC sign
    mb_timber.add_box(-0.11, 0.11, -0.470, -0.448, 0.625, 0.645, uv_scale=(3.0, 1.5))
    mb_timber.add_box(-0.015, 0.015, -0.470, -0.448, 0.645, 0.715, uv_scale=(1.5, 3.0))

    # Rear gable decoration
    mb_timber.add_box(-0.16, 0.16, 0.430, 0.455, 0.56, 0.585, uv_scale=(3.0, 1.5))
    mb_timber.add_box(-0.015, 0.015, 0.430, 0.455, 0.585, 0.71, uv_scale=(1.5, 3.0))

    # Eave fascias along length
    mb_timber.add_box(-0.452, -0.432, -0.465, 0.445, 0.47, 0.505, uv_scale=(1.5, 4.0))
    mb_timber.add_box(0.432, 0.452, -0.465, 0.445, 0.47, 0.505, uv_scale=(1.5, 4.0))

    # Ridgecap geometry running along roof apex
    mb_timber.add_box(-0.035, 0.035, -0.468, 0.448, 0.73, 0.752, uv_scale=(1.5, 4.0))
    _build_mesh_object("Restroom_Timber_Framing", mb_timber, mats["timber"], root, col)

    # 5. Opaque Privacy Baffle (ink panel with timber border)
    mb_baffle = _MeshBuilder()
    mb_baffle.add_box(-0.16, 0.16, -0.175, -0.165, 0.065, 0.49, uv_scale=(1.0, 1.0))
    _build_mesh_object("Restroom_Privacy_Baffle", mb_baffle, mats["ink"], root, col)

    mb_baffle_frame = _MeshBuilder()
    mb_baffle_frame.add_box(-0.17, -0.155, -0.18, -0.16, 0.065, 0.50, uv_scale=(1.5, 3.0))
    mb_baffle_frame.add_box(0.155, 0.17, -0.18, -0.16, 0.065, 0.50, uv_scale=(1.5, 3.0))
    mb_baffle_frame.add_box(-0.17, 0.17, -0.18, -0.16, 0.475, 0.50, uv_scale=(3.0, 1.5))
    _build_mesh_object("Restroom_Baffle_Frame", mb_baffle_frame, mats["timber"], root, col)

    # 6. Pitched Roof Planes (RoofingTiles013A / roof)
    mb_roof = _MeshBuilder()
    y_front = -0.465
    y_back = 0.445
    u_course_scale = 3.5
    v_slope_scale = 3.0
    u0 = y_front * u_course_scale
    u1 = y_back * u_course_scale

    # Left pitched roof slab
    v_bottom_l = Vector((-0.445, y_front, 0.485))
    v_bottom_r = Vector((-0.445, y_back, 0.485))
    v_top_r = Vector((0.0, y_back, 0.735))
    v_top_l = Vector((0.0, y_front, 0.735))
    mb_roof.add_quad(
        (v_bottom_l.x, v_bottom_l.y, v_bottom_l.z),
        (v_top_l.x, v_top_l.y, v_top_l.z),
        (v_top_r.x, v_top_r.y, v_top_r.z),
        (v_bottom_r.x, v_bottom_r.y, v_bottom_r.z),
        [(u0, 0.0), (u0, v_slope_scale), (u1, v_slope_scale), (u1, 0.0)]
    )

    # Right pitched roof slab
    v_bottom_l2 = Vector((0.445, y_front, 0.485))
    v_bottom_r2 = Vector((0.445, y_back, 0.485))
    v_top_r2 = Vector((0.0, y_back, 0.735))
    v_top_l2 = Vector((0.0, y_front, 0.735))
    mb_roof.add_quad(
        (v_bottom_l2.x, v_bottom_l2.y, v_bottom_l2.z),
        (v_bottom_r2.x, v_bottom_r2.y, v_bottom_r2.z),
        (v_top_r2.x, v_top_r2.y, v_top_r2.z),
        (v_top_l2.x, v_top_l2.y, v_top_l2.z),
        [(u0, 0.0), (u1, 0.0), (u1, v_slope_scale), (u0, v_slope_scale)]
    )
    _build_mesh_object("Restroom_Roof_Planes", mb_roof, mats["roof"], root, col)

    # 7. Roof Ventilation Cupola
    mb_cupola_timber = _MeshBuilder()
    mb_cupola_timber.add_box(-0.075, 0.075, -0.08, 0.08, 0.725, 0.76, uv_scale=(2.0, 2.0))
    mb_cupola_timber.add_box(-0.085, 0.085, -0.09, 0.09, 0.815, 0.83, uv_scale=(2.0, 2.0))
    _build_mesh_object("Restroom_Cupola_Base", mb_cupola_timber, mats["timber"], root, col)

    mb_cupola_teal = _MeshBuilder()
    mb_cupola_teal.add_box(-0.065, 0.065, -0.07, 0.07, 0.76, 0.815, uv_scale=(2.0, 2.0))
    for slat_z in (0.772, 0.787, 0.802):
        mb_cupola_teal.add_box(-0.068, 0.068, -0.073, -0.067, slat_z, slat_z + 0.008, uv_scale=(2.0, 2.0))
        mb_cupola_teal.add_box(-0.068, 0.068, 0.067, 0.073, slat_z, slat_z + 0.008, uv_scale=(2.0, 2.0))
        mb_cupola_teal.add_box(-0.073, -0.067, -0.068, 0.068, slat_z, slat_z + 0.008, uv_scale=(2.0, 2.0))
        mb_cupola_teal.add_box(0.067, 0.073, -0.068, 0.068, slat_z, slat_z + 0.008, uv_scale=(2.0, 2.0))
    _build_mesh_object("Restroom_Cupola_Louvers", mb_cupola_teal, mats["paint_teal"], root, col)

    mb_cupola_roof = _MeshBuilder()
    apex = (0.0, 0.0, 0.875)
    c_c0 = (-0.09, -0.095, 0.83)
    c_c1 = (0.09, -0.095, 0.83)
    c_c2 = (0.09, 0.095, 0.83)
    c_c3 = (-0.09, 0.095, 0.83)
    mb_cupola_roof.add_tri(c_c0, c_c1, apex, [(0.0, 0.0), (1.0, 0.0), (0.5, 1.0)])
    mb_cupola_roof.add_tri(c_c1, c_c2, apex, [(0.0, 0.0), (1.0, 0.0), (0.5, 1.0)])
    mb_cupola_roof.add_tri(c_c2, c_c3, apex, [(0.0, 0.0), (1.0, 0.0), (0.5, 1.0)])
    mb_cupola_roof.add_tri(c_c3, c_c0, apex, [(0.0, 0.0), (1.0, 0.0), (0.5, 1.0)])
    _build_mesh_object("Restroom_Cupola_Cap", mb_cupola_roof, mats["roof"], root, col)

    mb_finial = _MeshBuilder()
    mb_finial.add_cylinder((0.0, 0.0, 0.875), (0.0, 0.0, 0.895), radius=0.005, segments=6)
    _build_mesh_object("Restroom_Cupola_Spire", mb_finial, mats["metal"], root, col)

    # 8. High Privacy Louvers
    mb_side_frames = _MeshBuilder()
    mb_side_frames.add_box(-0.352, -0.338, -0.11, 0.11, 0.35, 0.46, uv_scale=(2.0, 2.0))
    mb_side_frames.add_box(0.338, 0.352, -0.11, 0.11, 0.35, 0.46, uv_scale=(2.0, 2.0))
    _build_mesh_object("Restroom_Louver_Frames", mb_side_frames, mats["timber"], root, col)

    mb_slats = _MeshBuilder()
    for lz in (0.365, 0.385, 0.405, 0.425, 0.445):
        mb_slats.add_box(-0.355, -0.335, -0.095, 0.095, lz, lz + 0.008, uv_scale=(2.0, 2.0))
        mb_slats.add_box(0.335, 0.355, -0.095, 0.095, lz, lz + 0.008, uv_scale=(2.0, 2.0))
    _build_mesh_object("Restroom_Louver_Slats", mb_slats, mats["paint_teal"], root, col)

    # 9. Rear Utility Hatch & Exhaust Louver
    mb_hatch = _MeshBuilder()
    mb_hatch.add_box(-0.13, 0.13, 0.338, 0.352, 0.11, 0.31, uv_scale=(2.0, 2.0))
    mb_hatch.add_box(-0.105, 0.105, 0.352, 0.356, 0.13, 0.29, uv_scale=(2.0, 2.0))
    mb_hatch.add_box(-0.09, 0.09, 0.356, 0.360, 0.19, 0.21, uv_scale=(2.0, 2.0))
    _build_mesh_object("Restroom_Utility_Hatch", mb_hatch, mats["timber"], root, col)

    mb_rear_metal = _MeshBuilder()
    mb_rear_metal.add_box(-0.125, -0.07, 0.353, 0.361, 0.25, 0.265, uv_scale=(1.0, 1.0))
    mb_rear_metal.add_box(-0.125, -0.07, 0.353, 0.361, 0.15, 0.165, uv_scale=(1.0, 1.0))
    mb_rear_metal.add_box(0.06, 0.095, 0.353, 0.362, 0.20, 0.22, uv_scale=(1.0, 1.0))
    mb_rear_metal.add_box(-0.07, 0.07, 0.338, 0.352, 0.38, 0.46, uv_scale=(2.0, 2.0))
    for ez in (0.395, 0.415, 0.435):
        mb_rear_metal.add_box(-0.06, 0.06, 0.352, 0.356, ez, ez + 0.006, uv_scale=(1.0, 1.0))
    _build_mesh_object("Restroom_Rear_Exhaust", mb_rear_metal, mats["metal"], root, col)

    # 10. Fine Gutters & Downspouts (Metal049A / metal)
    mb_pipe = _MeshBuilder()
    for gx in (-0.450, 0.442):
        mb_pipe.add_box(gx, gx + 0.015, -0.468, 0.448, 0.47, 0.485, uv_scale=(1.0, 4.0))

    for by in (-0.42, 0.0, 0.40):
        mb_pipe.add_box(-0.452, -0.435, by - 0.006, by + 0.006, 0.465, 0.48, uv_scale=(1.0, 1.0))
        mb_pipe.add_box(0.435, 0.452, by - 0.006, by + 0.006, 0.465, 0.48, uv_scale=(1.0, 1.0))

    mb_pipe.add_box(-0.452, -0.432, -0.42, -0.40, 0.46, 0.48, uv_scale=(1.0, 1.0))
    mb_pipe.add_cylinder((-0.44, -0.41, 0.46), (-0.385, -0.375, 0.42), radius=0.007, segments=6)
    mb_pipe.add_cylinder((-0.385, -0.375, 0.42), (-0.385, -0.375, 0.04), radius=0.007, segments=6)
    mb_pipe.add_cylinder((-0.385, -0.375, 0.04), (-0.385, -0.395, 0.02), radius=0.007, segments=6)
    for pz in (0.18, 0.36):
        mb_pipe.add_box(-0.395, -0.375, -0.38, -0.36, pz, pz + 0.012, uv_scale=(1.0, 1.0))

    mb_pipe.add_box(0.432, 0.452, 0.38, 0.40, 0.46, 0.48, uv_scale=(1.0, 1.0))
    mb_pipe.add_cylinder((0.44, 0.39, 0.46), (0.385, 0.355, 0.42), radius=0.007, segments=6)
    mb_pipe.add_cylinder((0.385, 0.355, 0.42), (0.385, 0.355, 0.04), radius=0.007, segments=6)
    mb_pipe.add_cylinder((0.385, 0.355, 0.04), (0.385, 0.375, 0.02), radius=0.007, segments=6)
    for pz in (0.18, 0.36):
        mb_pipe.add_box(0.375, 0.395, 0.34, 0.36, pz, pz + 0.012, uv_scale=(1.0, 1.0))
    _build_mesh_object("Restroom_Gutters_Downspouts", mb_pipe, mats["metal"], root, col)

    # 11. Readable Teal/Cream WC Front Sign with Geometric Glyphs
    mb_sign_bg = _MeshBuilder()
    mb_sign_bg.add_box(-0.115, 0.115, -0.475, -0.465, 0.535, 0.605, uv_scale=(2.0, 2.0))
    _build_mesh_object("Restroom_Sign_Board", mb_sign_bg, mats["paint_teal"], root, col)

    mb_sign_cream = _MeshBuilder()
    mb_sign_cream.add_box(-0.12, 0.12, -0.477, -0.464, 0.60, 0.61, uv_scale=(2.0, 2.0))
    mb_sign_cream.add_box(-0.12, 0.12, -0.477, -0.464, 0.53, 0.54, uv_scale=(2.0, 2.0))
    mb_sign_cream.add_box(-0.12, -0.11, -0.477, -0.464, 0.54, 0.60, uv_scale=(2.0, 2.0))
    mb_sign_cream.add_box(0.11, 0.12, -0.477, -0.464, 0.54, 0.60, uv_scale=(2.0, 2.0))

    # Authored geometric 'W' glyph
    mb_sign_cream.add_box(-0.068, -0.058, -0.479, -0.474, 0.552, 0.588, uv_scale=(1.0, 1.0))
    mb_sign_cream.add_box(-0.032, -0.022, -0.479, -0.474, 0.552, 0.588, uv_scale=(1.0, 1.0))
    mb_sign_cream.add_box(-0.048, -0.042, -0.479, -0.474, 0.552, 0.578, uv_scale=(1.0, 1.0))
    mb_sign_cream.add_box(-0.060, -0.030, -0.479, -0.474, 0.548, 0.556, uv_scale=(1.0, 1.0))

    # Authored geometric 'C' glyph
    mb_sign_cream.add_box(0.025, 0.035, -0.479, -0.474, 0.554, 0.586, uv_scale=(1.0, 1.0))
    mb_sign_cream.add_box(0.032, 0.065, -0.479, -0.474, 0.582, 0.590, uv_scale=(1.0, 1.0))
    mb_sign_cream.add_box(0.032, 0.065, -0.479, -0.474, 0.550, 0.558, uv_scale=(1.0, 1.0))
    mb_sign_cream.add_box(0.058, 0.065, -0.479, -0.474, 0.574, 0.583, uv_scale=(1.0, 1.0))
    mb_sign_cream.add_box(0.058, 0.065, -0.479, -0.474, 0.557, 0.566, uv_scale=(1.0, 1.0))
    _build_mesh_object("Restroom_Sign_Details", mb_sign_cream, mats["cream"], root, col)

    # 12. Named Semantic Empty Anchors
    _create_anchor("GroundRoot", (0.0, 0.0, 0.0), root, col)
    _create_anchor("Entrance_Front", (0.0, -0.49, 0.0), root, col)
    _create_anchor("Service_Interior", (0.0, 0.0, 0.08), root, col)
    _create_anchor("Sign_Front", (0.0, -0.465, 0.57), root, col)

    return {
        "asset_name": "VictorianParkRestroom",
        "axes": {"right": "+X", "front": "-Y", "up": "+Z"},
        "ground_origin": [0.0, 0.0, 0.0],
        "bounds_contract": {
            "x": [-0.49, 0.49],
            "y": [-0.49, 0.49],
            "z": [0.0, 0.90]
        },
        "anchors": [
            "GroundRoot",
            "Entrance_Front",
            "Service_Interior",
            "Sign_Front"
        ],
        "declared_material_keys": [
            "timber",
            "boards",
            "roof",
            "plaster",
            "metal",
            "paint_teal",
            "cream",
            "ink"
        ],
        "candidate_scope": "small Victorian timber/plaster park restroom"
    }
