"""Timber station bay model source for Coaster Tycoon 3D.

Modular 4.0-metre timber station bay featuring:
- Seamless 4m repeat along the Y-axis (-Y forward / frontage, +Z up).
- Heavy timber post-and-beam construction with concrete footers and knee braces.
- Dual boarding (+X) and unload (-X) platforms with timber decking and kerbs.
- Open central track trough with cross ties, steel rails, and clearance gaps.
- Layered timber roof structure: king-post trusses, longitudinal purlins,
  ridge beam, fascia trim, and pitched clay tile roofing.
- Boarding queue gate portal and 4 pneumatic air-gates aligned with car rows.
- Unload platform exit gate and perimeter safety handrails.
- Operator console pedestal with controls, emergency stop, and status cabinet.
- Fully authored UV mappings oriented along wood grain and tile pitch.
"""

import bpy
import math
import mathutils


def _create_empty(name, parent=None, location=(0.0, 0.0, 0.0), rotation=(0.0, 0.0, 0.0)):
    """Create a named Blender empty object for hierarchy and anchors."""
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = "PLAIN_AXES"
    empty.empty_display_size = 0.25
    empty.location = location
    empty.rotation_euler = rotation
    bpy.context.collection.objects.link(empty)
    if parent is not None:
        empty.parent = parent
    return empty


def _create_mesh_object(name, vertices, faces, material=None, parent=None, uvs=None):
    """Create a Blender mesh object from raw geometry with explicit UV mapping."""
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()

    if uvs is not None and len(uvs) == len(faces):
        uv_layer = mesh.uv_layers.new(name="UVMap")
        loop_idx = 0
        for face_uv in uvs:
            for u, v in face_uv:
                uv_layer.data[loop_idx].uv = (u, v)
                loop_idx += 1

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    if material is not None:
        obj.data.materials.append(material)

    if parent is not None:
        obj.parent = parent

    return obj


def _warm_material(mat, tint_rgb=(0.76, 0.58, 0.38), factor=0.68, roughness_val=None):
    """Clone material and tint its Base Color using multiply mix node or direct color multiplication."""
    if mat is None:
        return None
    mat_copy = mat.copy()
    if not mat_copy.use_nodes or not mat_copy.node_tree:
        return mat_copy
    nodes = mat_copy.node_tree.nodes
    links = mat_copy.node_tree.links
    bsdf = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
    if not bsdf:
        return mat_copy

    if roughness_val is not None and "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = roughness_val

    base_col = bsdf.inputs.get("Base Color")
    if not base_col:
        return mat_copy

    if base_col.is_linked:
        from_socket = base_col.links[0].from_socket
        try:
            mix = nodes.new("ShaderNodeMix")
            mix.data_type = "RGBA"
            mix.blend_type = "MULTIPLY"
            mix.inputs[0].default_value = factor
            links.new(from_socket, mix.inputs[6])
            mix.inputs[7].default_value = (*tint_rgb, 1.0)
            links.new(mix.outputs[2], base_col)
        except Exception:
            try:
                mix = nodes.new("ShaderNodeMixRGB")
                mix.blend_type = "MULTIPLY"
                mix.inputs["Fac"].default_value = factor
                links.new(from_socket, mix.inputs["Color1"])
                mix.inputs["Color2"].default_value = (*tint_rgb, 1.0)
                links.new(mix.outputs["Color"], base_col)
            except Exception:
                pass
    else:
        c = base_col.default_value
        base_col.default_value = (
            c[0] * (1.0 - factor + factor * tint_rgb[0]),
            c[1] * (1.0 - factor + factor * tint_rgb[1]),
            c[2] * (1.0 - factor + factor * tint_rgb[2]),
            c[3] if len(c) > 3 else 1.0,
        )
    return mat_copy


def _add_box(name, min_pt, max_pt, material=None, parent=None, uv_scale=(1.0, 1.0)):
    """Generate an axis-aligned box with properly oriented unwrapped UVs."""
    x0, y0, z0 = min_pt
    x1, y1, z1 = max_pt

    dx = x1 - x0
    dy = y1 - y0
    dz = z1 - z0
    sx, sy = uv_scale

    verts = [
        (x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),  # bottom 0..3
        (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)   # top    4..7
    ]

    faces = [
        [0, 3, 2, 1],  # -Z bottom
        [4, 5, 6, 7],  # +Z top
        [0, 1, 5, 4],  # -Y front
        [2, 3, 7, 6],  # +Y back
        [3, 0, 4, 7],  # -X left
        [1, 2, 6, 5],  # +X right
    ]

    uvs = [
        # bottom (-Z): u along X, v along Y
        [(0.0, 0.0), (0.0, dy * sy), (dx * sx, dy * sy), (dx * sx, 0.0)],
        # top (+Z): u along X, v along Y
        [(0.0, 0.0), (dx * sx, 0.0), (dx * sx, dy * sy), (0.0, dy * sy)],
        # front (-Y): u along X, v along Z
        [(0.0, 0.0), (dx * sx, 0.0), (dx * sx, dz * sy), (0.0, dz * sy)],
        # back (+Y): u along X, v along Z
        [(0.0, 0.0), (dx * sx, 0.0), (dx * sx, dz * sy), (0.0, dz * sy)],
        # left (-X): u along Y, v along Z
        [(0.0, 0.0), (dy * sx, 0.0), (dy * sx, dz * sy), (0.0, dz * sy)],
        # right (+X): u along Y, v along Z
        [(0.0, 0.0), (dy * sx, 0.0), (dy * sx, dz * sy), (0.0, dz * sy)],
    ]

    return _create_mesh_object(name, verts, faces, material, parent, uvs)


def _add_beam(name, start, end, width, depth, material=None, parent=None, uv_scale=(2.5, 3.0)):
    """Generate an oriented rectangular timber beam between two points."""
    p0 = mathutils.Vector(start)
    p1 = mathutils.Vector(end)
    axis = (p1 - p0)
    length = axis.length
    if length < 1e-5:
        return None
    dir_vec = axis.normalized()

    ref = mathutils.Vector((0.0, 0.0, 1.0)) if abs(dir_vec.z) < 0.9 else mathutils.Vector((1.0, 0.0, 0.0))
    u_vec = dir_vec.cross(ref).normalized() * (width * 0.5)
    v_vec = dir_vec.cross(u_vec).normalized() * (depth * 0.5)

    v0 = p0 - u_vec - v_vec
    v1 = p0 + u_vec - v_vec
    v2 = p0 + u_vec + v_vec
    v3 = p0 - u_vec + v_vec

    v4 = p1 - u_vec - v_vec
    v5 = p1 + u_vec - v_vec
    v6 = p1 + u_vec + v_vec
    v7 = p1 - u_vec + v_vec

    verts = [
        (v0.x, v0.y, v0.z), (v1.x, v1.y, v1.z), (v2.x, v2.y, v2.z), (v3.x, v3.y, v3.z),
        (v4.x, v4.y, v4.z), (v5.x, v5.y, v5.z), (v6.x, v6.y, v6.z), (v7.x, v7.y, v7.z)
    ]

    faces = [
        [3, 2, 1, 0],  # start cap
        [4, 5, 6, 7],  # end cap
        [0, 1, 5, 4],  # side 1
        [1, 2, 6, 5],  # side 2
        [2, 3, 7, 6],  # side 3
        [3, 0, 4, 7],  # side 4
    ]

    su, sv = uv_scale
    lu = length * su
    wu = width * sv
    du = depth * sv

    uvs = [
        [(0.0, 0.0), (wu, 0.0), (wu, du), (0.0, du)],
        [(0.0, 0.0), (wu, 0.0), (wu, du), (0.0, du)],
        [(0.0, 0.0), (wu, 0.0), (wu, lu), (0.0, lu)],
        [(0.0, 0.0), (du, 0.0), (du, lu), (0.0, lu)],
        [(0.0, 0.0), (wu, 0.0), (wu, lu), (0.0, lu)],
        [(0.0, 0.0), (du, 0.0), (du, lu), (0.0, lu)],
    ]

    return _create_mesh_object(name, verts, faces, material, parent, uvs)


def _add_sloped_panel(name, p_left_start, p_left_end, p_right_start, p_right_end, thickness, material=None, parent=None, uv_scale=(3.8, 5.0)):
    """Generate a thick sloped roof panel with top, bottom, and edges with fine shingle courses."""
    pl0 = mathutils.Vector(p_left_start)
    pl1 = mathutils.Vector(p_left_end)
    pr0 = mathutils.Vector(p_right_start)
    pr1 = mathutils.Vector(p_right_end)

    span = (pr0 - pl0)
    length_vec = (pl1 - pl0)
    normal = span.cross(length_vec).normalized() * thickness

    # Top surface vertices
    t0 = pl0
    t1 = pr0
    t2 = pr1
    t3 = pl1

    # Bottom surface vertices
    b0 = pl0 - normal
    b1 = pr0 - normal
    b2 = pr1 - normal
    b3 = pl1 - normal

    verts = [
        (t0.x, t0.y, t0.z), (t1.x, t1.y, t1.z), (t2.x, t2.y, t2.z), (t3.x, t3.y, t3.z),
        (b0.x, b0.y, b0.z), (b1.x, b1.y, b1.z), (b2.x, b2.y, b2.z), (b3.x, b3.y, b3.z)
    ]

    faces = [
        [0, 1, 2, 3],  # top
        [7, 6, 5, 4],  # bottom
        [0, 4, 5, 1],  # start end-cap
        [2, 6, 7, 3],  # back end-cap
        [1, 5, 6, 2],  # right edge
        [3, 7, 4, 0],  # left edge
    ]

    u_span = span.length * uv_scale[0]
    v_len = length_vec.length * uv_scale[1]
    th_v = thickness * uv_scale[0]

    uvs = [
        [(0.0, 0.0), (u_span, 0.0), (u_span, v_len), (0.0, v_len)],
        [(0.0, 0.0), (u_span, 0.0), (u_span, v_len), (0.0, v_len)],
        [(0.0, 0.0), (0.0, th_v), (u_span, th_v), (u_span, 0.0)],
        [(0.0, 0.0), (0.0, th_v), (u_span, th_v), (u_span, 0.0)],
        [(0.0, 0.0), (0.0, th_v), (v_len, th_v), (v_len, 0.0)],
        [(0.0, 0.0), (0.0, th_v), (v_len, th_v), (v_len, 0.0)],
    ]

    return _create_mesh_object(name, verts, faces, material, parent, uvs)


def build(materials):
    """Build a detailed timber station bay asset matching the project authoring contract.

    Args:
        materials: dict mapping material role names to bpy.types.Material objects.

    Returns:
        English metadata dictionary with assetId, dimensions, anchors, notes.
    """
    raw_timber = materials.get("timber")
    raw_boards = materials.get("boards")
    mat_roof = materials.get("roof")
    mat_metal = materials.get("metal")
    mat_brick = materials.get("brick")
    mat_brass = materials.get("brass")
    mat_red = materials.get("paint_red")
    mat_teal = materials.get("paint_teal")
    mat_cream = materials.get("cream")

    # Clone and apply warm treated timber palette (prevents bleached white appearance)
    mat_timber = _warm_material(raw_timber, tint_rgb=(0.76, 0.58, 0.38), factor=0.72)
    mat_boards = _warm_material(raw_boards, tint_rgb=(0.80, 0.62, 0.42), factor=0.65)

    root = _create_empty("StationRoot", location=(0.0, 0.0, 0.0))

    # ==========================================
    # 1. Foundation & Footers (Z: 0.0 to 0.20 m)
    # ==========================================
    post_x_coords = [-1.75, 1.75]
    post_y_coords = [-1.90, 0.0, 1.90]

    for ix, px in enumerate(post_x_coords):
        for iy, py in enumerate(post_y_coords):
            _add_box(
                f"Footer_{ix}_{iy}",
                (px - 0.16, max(-2.0, py - 0.16), 0.0),
                (px + 0.16, min(2.0, py + 0.16), 0.20),
                material=mat_brick,
                parent=root,
                uv_scale=(2.0, 2.0)
            )

    # Deck intermediate foundation footers under platforms
    sub_footers = [(-1.0, -1.5), (-1.0, 0.0), (-1.0, 1.5),
                   (1.0, -1.5), (1.0, 0.0), (1.0, 1.5)]
    for idx, (fx, fy) in enumerate(sub_footers):
        _add_box(
            f"SubFooter_{idx}",
            (fx - 0.12, fy - 0.12, 0.0),
            (fx + 0.12, fy + 0.12, 0.15),
            material=mat_brick,
            parent=root,
            uv_scale=(2.0, 2.0)
        )

    # ========================================================
    # 2. Main Structural Timber Posts & Braces (Z: 0.20 to 2.85 m)
    # ========================================================
    for ix, px in enumerate(post_x_coords):
        for iy, py in enumerate(post_y_coords):
            # Column timber post
            _add_box(
                f"MainPost_{ix}_{iy}",
                (px - 0.10, py - 0.10, 0.20),
                (px + 0.10, py + 0.10, 2.85),
                material=mat_timber,
                parent=root,
                uv_scale=(2.0, 3.0)
            )

            # Metal base standoff collar on footer
            _add_box(
                f"PostCollar_{ix}_{iy}",
                (px - 0.11, py - 0.11, 0.20),
                (px + 0.11, py + 0.11, 0.25),
                material=mat_metal,
                parent=root,
                uv_scale=(1.0, 1.0)
            )

            # Diagonal knee braces from post to top cross-beam
            sign_x = -1.0 if px > 0 else 1.0
            brace_start = (px, py, 2.30)
            brace_end = (px + sign_x * 0.45, py, 2.80)
            _add_beam(
                f"KneeBrace_X_{ix}_{iy}",
                brace_start, brace_end,
                width=0.08, depth=0.10,
                material=mat_timber, parent=root,
                uv_scale=(2.5, 3.0)
            )

            if abs(py) > 0.1:
                sign_y = -1.0 if py > 0 else 1.0
                brace_y_start = (px, py, 2.35)
                brace_y_end = (px, py + sign_y * 0.50, 2.80)
                _add_beam(
                    f"KneeBrace_Y_{ix}_{iy}",
                    brace_y_start, brace_y_end,
                    width=0.08, depth=0.10,
                    material=mat_timber, parent=root,
                    uv_scale=(2.5, 3.0)
                )

    # Longitudinal wall top plates connecting columns (Y: -2.0 to +2.0)
    for px in post_x_coords:
        _add_box(
            f"WallPlate_{'R' if px > 0 else 'L'}",
            (px - 0.10, -2.0, 2.75),
            (px + 0.10, 2.0, 2.88),
            material=mat_timber, parent=root, uv_scale=(2.0, 3.0)
        )

    # ==============================================================
    # 3. Track Bed, Sleepers, Rails & Walkways (Z: 0.15 to 0.45 m)
    # ==============================================================
    # Longitudinal track stringers / bed timbers
    _add_box("TrackBed_L", (-0.65, -2.0, 0.20), (-0.45, 2.0, 0.32), material=mat_timber, parent=root, uv_scale=(1.5, 3.0))
    _add_box("TrackBed_R", (0.45, -2.0, 0.20), (0.65, 2.0, 0.32), material=mat_timber, parent=root, uv_scale=(1.5, 3.0))

    # Timber ties (sleepers) spaced along the 4m bay
    num_ties = 8
    tie_spacing = 4.0 / num_ties
    for i in range(num_ties):
        ty = -2.0 + (i + 0.5) * tie_spacing
        _add_box(
            f"Tie_{i}",
            (-0.70, ty - 0.08, 0.32),
            (0.70, ty + 0.08, 0.42),
            material=mat_timber, parent=root, uv_scale=(2.0, 2.0)
        )

    # Steel coaster running rails (+X and -X, gauge ~1.0m, rail gauge 0.48)
    rail_gauge = 0.48
    for side, rx in [("L", -rail_gauge), ("R", rail_gauge)]:
        # Lower rail base flange
        _add_box(f"RailBase_{side}", (rx - 0.05, -2.0, 0.42), (rx + 0.05, 2.0, 0.44), material=mat_metal, parent=root)
        # Rail head tubular / box profile
        _add_box(f"RailHead_{side}", (rx - 0.035, -2.0, 0.44), (rx + 0.035, 2.0, 0.50), material=mat_metal, parent=root)

    # Central maintenance walkway catwalk between rails (fine grain board UV)
    _add_box("CatwalkWalkway", (-0.30, -2.0, 0.36), (0.30, 2.0, 0.39), material=mat_boards, parent=root, uv_scale=(4.0, 6.0))

    # ==============================================================
    # 4. Boarding & Unload Platforms (Z: 0.20 to 0.85 m)
    # ==============================================================
    # Boarding Platform (+X: 0.72 to 1.95, Y: -2.0 to 2.0, Deck top Z: 0.82)
    _add_box("Joist_Boarding_Edge", (0.72, -2.0, 0.65), (0.84, 2.0, 0.78), material=mat_timber, parent=root, uv_scale=(2.0, 3.0))
    _add_box("Joist_Boarding_Mid", (1.30, -2.0, 0.65), (1.42, 2.0, 0.78), material=mat_timber, parent=root, uv_scale=(2.0, 3.0))
    _add_box("Joist_Boarding_Outer", (1.80, -2.0, 0.65), (1.92, 2.0, 0.78), material=mat_timber, parent=root, uv_scale=(2.0, 3.0))

    for i in range(5):
        jy = -1.90 + i * 0.95
        _add_box(f"CrossJoist_B_{i}", (0.72, jy - 0.06, 0.55), (1.92, jy + 0.06, 0.65), material=mat_timber, parent=root, uv_scale=(2.0, 2.0))

    # Boarding deck surface (tight UV scale = 5.0, 6.0 to avoid oversized wood knots)
    _add_box("BoardingDeck", (0.74, -2.0, 0.78), (1.92, 2.0, 0.82), material=mat_boards, parent=root, uv_scale=(5.0, 6.0))
    # Platform edge safety bullnose kerb and contrast caution strip
    _add_box("BoardingKerb", (0.71, -2.0, 0.77), (0.75, 2.0, 0.83), material=mat_timber, parent=root)
    _add_box("BoardingCautionLine", (0.75, -2.0, 0.821), (0.79, 2.0, 0.824), material=mat_cream, parent=root)

    # Unload Platform (-X: -1.92 to -0.72, Y: -2.0 to 2.0, Deck top Z: 0.82)
    _add_box("Joist_Unload_Edge", (-0.84, -2.0, 0.65), (-0.72, 2.0, 0.78), material=mat_timber, parent=root, uv_scale=(2.0, 3.0))
    _add_box("Joist_Unload_Mid", (-1.42, -2.0, 0.65), (-1.30, 2.0, 0.78), material=mat_timber, parent=root, uv_scale=(2.0, 3.0))
    _add_box("Joist_Unload_Outer", (-1.92, -2.0, 0.65), (-1.80, 2.0, 0.78), material=mat_timber, parent=root, uv_scale=(2.0, 3.0))

    for i in range(5):
        jy = -1.90 + i * 0.95
        _add_box(f"CrossJoist_U_{i}", (-1.92, jy - 0.06, 0.55), (-0.72, jy + 0.06, 0.65), material=mat_timber, parent=root, uv_scale=(2.0, 2.0))

    _add_box("UnloadDeck", (-1.92, -2.0, 0.78), (-0.74, 2.0, 0.82), material=mat_boards, parent=root, uv_scale=(5.0, 6.0))
    _add_box("UnloadKerb", (-0.75, -2.0, 0.77), (-0.71, 2.0, 0.83), material=mat_timber, parent=root)
    _add_box("UnloadCautionLine", (-0.79, -2.0, 0.821), (-0.75, 2.0, 0.824), material=mat_cream, parent=root)

    # Outer railings along platforms (back wall boundaries)
    for x_outer in [-1.90, 1.90]:
        tag = "R" if x_outer > 0 else "L"
        for s_idx, sy in enumerate([-1.90, -0.95, 0.0, 0.95, 1.90]):
            _add_box(f"RailingPost_{tag}_{s_idx}", (x_outer - 0.03, sy - 0.03, 0.82), (x_outer + 0.03, sy + 0.03, 1.82), material=mat_timber, parent=root)
        opening = (1.18, 1.62) if x_outer > 0 else (-1.58, -1.15)
        for section, (start, end) in enumerate([(-2.0, opening[0]), (opening[1], 2.0)]):
            _add_box(f"TopRail_{tag}_{section}", (x_outer - 0.04, start, 1.76), (x_outer + 0.04, end, 1.82), material=mat_timber, parent=root)
            _add_box(f"MidRail_{tag}_{section}", (x_outer - 0.03, start, 1.30), (x_outer + 0.03, end, 1.35), material=mat_timber, parent=root)

    # ==============================================================
    # 5. Heavy Timber Roof Trusses (King Post Design & Joint Straps)
    # ==============================================================
    truss_y_positions = [-1.90, 0.0, 1.90]
    apex_z = 3.95
    tie_z = 2.80

    for idx, ty in enumerate(truss_y_positions):
        # Tie beam spanning across the station from X: -1.95 to +1.95
        _add_box(
            f"Truss_TieBeam_{idx}",
            (-1.95, ty - 0.09, tie_z),
            (1.95, ty + 0.09, tie_z + 0.14),
            material=mat_timber, parent=root, uv_scale=(2.0, 3.0)
        )

        # Central vertical King Post (X: 0, Z: tie_z to apex_z)
        _add_box(
            f"Truss_KingPost_{idx}",
            (-0.08, ty - 0.08, tie_z + 0.14),
            (0.08, ty + 0.08, apex_z - 0.05),
            material=mat_timber, parent=root, uv_scale=(2.0, 3.0)
        )

        # Steel T-bracket gusset plate at king post base joint
        _add_box(
            f"TrussGusset_{idx}",
            (-0.10, ty - 0.095, tie_z + 0.12),
            (0.10, ty + 0.095, tie_z + 0.32),
            material=mat_metal, parent=root
        )

        # Left principal rafter
        _add_beam(
            f"Rafter_L_{idx}",
            (-2.25, ty, 2.65), (0.0, ty, apex_z),
            width=0.14, depth=0.12,
            material=mat_timber, parent=root,
            uv_scale=(2.5, 3.0)
        )

        # Right principal rafter
        _add_beam(
            f"Rafter_R_{idx}",
            (2.25, ty, 2.65), (0.0, ty, apex_z),
            width=0.14, depth=0.12,
            material=mat_timber, parent=root,
            uv_scale=(2.5, 3.0)
        )

        # Diagonal truss web struts
        _add_beam(f"TrussStrut_L_{idx}", (-0.05, ty, tie_z + 0.25), (-1.10, ty, 3.25), width=0.08, depth=0.08, material=mat_timber, parent=root, uv_scale=(2.5, 3.0))
        _add_beam(f"TrussStrut_R_{idx}", (0.05, ty, tie_z + 0.25), (1.10, ty, 3.25), width=0.08, depth=0.08, material=mat_timber, parent=root, uv_scale=(2.5, 3.0))

    # Longitudinal Purlins and Ridge Beam (Y: -2.0 to +2.0)
    _add_box("RidgeBeam", (-0.09, -2.0, apex_z - 0.06), (0.09, 2.0, apex_z + 0.08), material=mat_timber, parent=root, uv_scale=(2.0, 3.0))

    purlin_offsets = [-1.50, -0.75, 0.75, 1.50]
    for p_idx, pox in enumerate(purlin_offsets):
        p_ratio = abs(pox) / 2.25
        poz = 2.65 + (1.0 - p_ratio) * (apex_z - 2.65)
        _add_box(
            f"Purlin_{p_idx}",
            (pox - 0.06, -2.0, poz - 0.05),
            (pox + 0.06, 2.0, poz + 0.05),
            material=mat_timber, parent=root, uv_scale=(2.0, 3.0)
        )

    # ==============================================================
    # 6. Pitched Roof Covering & Fascia Trim (Believable Tile Scale)
    # ==============================================================
    roof_thickness = 0.07

    # Left roof slope with fine architectural shingle courses (3.8 x 5.0 UV repeats)
    _add_sloped_panel(
        "RoofSlope_Left",
        p_left_start=(-2.35, -2.0, 2.62),
        p_left_end=(-2.35, 2.0, 2.62),
        p_right_start=(0.0, -2.0, apex_z + 0.04),
        p_right_end=(0.0, 2.0, apex_z + 0.04),
        thickness=roof_thickness,
        material=mat_roof,
        parent=root,
        uv_scale=(3.8, 5.0)
    )

    # Right roof slope
    _add_sloped_panel(
        "RoofSlope_Right",
        p_left_start=(0.0, -2.0, apex_z + 0.04),
        p_left_end=(0.0, 2.0, apex_z + 0.04),
        p_right_start=(2.35, -2.0, 2.62),
        p_right_end=(2.35, 2.0, 2.62),
        thickness=roof_thickness,
        material=mat_roof,
        parent=root,
        uv_scale=(3.8, 5.0)
    )

    # Roof ridge cap running along Y: -2.0 to 2.0
    _add_box("RidgeCap", (-0.12, -2.0, apex_z + 0.04), (0.12, 2.0, apex_z + 0.10), material=mat_metal, parent=root)

    # Eaves fascia boards / gutters along left and right edges
    _add_box("Fascia_Left", (-2.38, -2.0, 2.54), (-2.32, 2.0, 2.68), material=mat_timber, parent=root, uv_scale=(2.0, 3.0))
    _add_box("Fascia_Right", (2.32, -2.0, 2.54), (2.38, 2.0, 2.68), material=mat_timber, parent=root, uv_scale=(2.0, 3.0))

    # ==============================================================
    # 7. Boarding Queue Gates & Pneumatic Air-Gates
    # ==============================================================
    # Queue entry turnstile portal at boarding platform back (X: 1.90, Y: 1.10 to 1.70)
    _add_box("QueuePortal_Post1", (1.87, 1.10, 0.82), (1.93, 1.18, 2.20), material=mat_timber, parent=root)
    _add_box("QueuePortal_Post2", (1.87, 1.62, 0.82), (1.93, 1.70, 2.20), material=mat_timber, parent=root)
    _add_box("QueuePortal_Lintel", (1.86, 1.08, 2.15), (1.94, 1.72, 2.25), material=mat_timber, parent=root)
    _add_box("QueuePortal_Sign", (1.85, 1.18, 1.95), (1.95, 1.62, 2.12), material=mat_teal, parent=root)
    _add_box("QueuePortal_SignTrim", (1.84, 1.20, 1.97), (1.96, 1.60, 2.10), material=mat_cream, parent=root)

    # Queue turnstile pedestal and brass rotating arms
    _add_box("Turnstile_Base", (1.75, 1.35, 0.82), (1.85, 1.45, 1.45), material=mat_metal, parent=root)
    _add_box("Turnstile_Arm1", (1.65, 1.38, 1.35), (1.75, 1.42, 1.39), material=mat_brass, parent=root)
    _add_box("Turnstile_Arm2", (1.78, 1.45, 1.35), (1.82, 1.55, 1.39), material=mat_brass, parent=root)

    # Four pneumatic queue air-gates at the track boarding edge (X: 0.74)
    gate_y_positions = [-1.20, -0.40, 0.40, 1.20]
    for g_idx, gy in enumerate(gate_y_positions):
        _add_box(f"AirGate_Post_{g_idx}", (0.72, gy - 0.28, 0.82), (0.76, gy - 0.24, 1.60), material=mat_metal, parent=root)
        _add_box(f"AirGate_PostB_{g_idx}", (0.72, gy + 0.24, 0.82), (0.76, gy + 0.28, 1.60), material=mat_metal, parent=root)
        _add_box(f"AirGate_ArmTop_{g_idx}", (0.73, gy - 0.24, 1.45), (0.75, gy + 0.24, 1.50), material=mat_brass, parent=root)
        _add_box(f"AirGate_ArmMid_{g_idx}", (0.73, gy - 0.24, 1.10), (0.75, gy + 0.24, 1.15), material=mat_brass, parent=root)
        _add_box(f"AirGate_Actuator_{g_idx}", (0.77, gy - 0.28, 0.82), (0.83, gy - 0.22, 1.05), material=mat_red, parent=root)

    # Unload exit swing gate at unload platform back (X: -1.90, Y: -1.40)
    _add_box("ExitGate_Post1", (-1.93, -1.65, 0.82), (-1.87, -1.58, 2.15), material=mat_timber, parent=root)
    _add_box("ExitGate_Post2", (-1.93, -1.15, 0.82), (-1.87, -1.08, 2.15), material=mat_timber, parent=root)
    _add_box("ExitGate_Lintel", (-1.94, -1.68, 2.10), (-1.86, -1.05, 2.20), material=mat_timber, parent=root)
    _add_box("ExitGate_Sign", (-1.95, -1.55, 1.92), (-1.85, -1.18, 2.08), material=mat_cream, parent=root)
    _add_box("ExitGate_Arm", (-1.91, -1.58, 1.30), (-1.89, -1.15, 1.36), material=mat_metal, parent=root)

    # ==============================================================
    # 8. Operator Console Booth & Controls (Boarding side, Y: -1.40)
    # ==============================================================
    op_x = 1.45
    op_y = -1.40
    _add_box("OperatorPedestal", (op_x - 0.22, op_y - 0.25, 0.82), (op_x + 0.22, op_y + 0.25, 1.65), material=mat_metal, parent=root)
    _add_box("OperatorDesk", (op_x - 0.20, op_y - 0.22, 1.65), (op_x + 0.20, op_y + 0.22, 1.74), material=mat_teal, parent=root)
    _add_box("Operator_EStop", (op_x - 0.12, op_y - 0.10, 1.74), (op_x - 0.04, op_y - 0.02, 1.82), material=mat_red, parent=root)
    _add_box("Operator_Dispatch", (op_x + 0.04, op_y - 0.10, 1.74), (op_x + 0.12, op_y - 0.02, 1.79), material=mat_brass, parent=root)
    _add_box("Operator_Cabinet", (op_x - 0.18, op_y + 0.05, 1.74), (op_x + 0.18, op_y + 0.20, 2.00), material=mat_cream, parent=root)

    # ==============================================================
    # 9. Required Named Empty Anchors & Metadata
    # ==============================================================
    rail_in = _create_empty("RailIn", parent=root, location=(0.0, 2.0, 0.50))
    rail_out = _create_empty("RailOut", parent=root, location=(0.0, -2.0, 0.50))
    deck_boarding = _create_empty("DeckBoarding", parent=root, location=(1.35, 0.0, 0.82))
    deck_unload = _create_empty("DeckUnload", parent=root, location=(-1.35, 0.0, 0.82))
    queue_gate = _create_empty("QueueGate", parent=root, location=(1.90, 1.40, 0.82))
    exit_gate = _create_empty("ExitGate", parent=root, location=(-1.90, -1.40, 0.82))
    op_booth = _create_empty("OperatorBooth", parent=root, location=(op_x, op_y, 0.82))
    roof_apex = _create_empty("RoofApex", parent=root, location=(0.0, 0.0, apex_z + 0.10))

    return {
        "assetId": "timber-station",
        "referenceVariant": "classic-timber-station-bay",
        "candidateDimensions": {
            "width": 4.70,
            "length": 4.00,
            "height": 4.15,
            "pitch": 4.00
        },
        "anchors": {
            "StationRoot": root,
            "RailIn": rail_in,
            "RailOut": rail_out,
            "DeckBoarding": deck_boarding,
            "DeckUnload": deck_unload,
            "QueueGate": queue_gate,
            "ExitGate": exit_gate,
            "OperatorBooth": op_booth,
            "RoofApex": roof_apex
        },
        "restraints": {},
        "notes": [
            "Modular 4.0m timber station bay with exact repeating pitch along Y-axis",
            "King-post roof trusses with steel joint gussets, rafters, purlins, and fine-scale tile courses",
            "Dual boarding (+X) and unload (-X) platforms with warm treated timber framing, decking, and kerb caution lines",
            "Track trough with timber ties, running rails, and central maintenance catwalk",
            "Four pneumatic air-gates for passenger row boarding and turnstile queue portal",
            "Unload platform exit swing gate and outer timber safety handrails",
            "Operator control pedestal with dispatch, emergency stop, and status display cabinet",
            "Explicit UV unwrap coordinates conforming to timber grain and roof tile courses"
        ],
        "geometryIntent": "Detailed timber-framed coaster station bay module with warm treated timber palette, fine-scale roof shingle courses, deck joists, track trough, and queue/exit interfaces."
    }
