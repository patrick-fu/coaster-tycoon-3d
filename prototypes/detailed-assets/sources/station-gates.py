"""Timber station gate, portal, and track refinement module for Coaster Tycoon 3D.

Refines modular timber station bay geometry to resolve physical avatar and coaster train clearances:
1. Passenger Avatar Clearance:
   - Widens Boarding Queue and Unload Exit portal clear openings to 0.68m (Queue Y: 1.06..1.74,
     Exit Y: -1.74..-1.06) clearing 0.50m walking avatars.
   - Raises portal lintels (Z: 2.88..2.98) and signage above Z: 2.70 to clear 1.80m head height
     above the 0.82m platform deck.
   - Installs articulated single-boom lift gates (QueueGate_Hinge at (1.80, 1.02, 1.36) and
     ExitGate_Hinge at (-1.86, -1.78, 1.33)) with slim profiles strictly confined within
     local Z +/- 0.026m, ensuring zero component intrusion into the 0.50m arm corridor when open.
2. Coaster Car Upstop Tyre Clearance:
   - Lowers longitudinal TrackBed_L/R stringers to Z: 0.06..0.18 (originally 0.20..0.32).
   - Lowers transverse Tie_0..7 sleepers to Z: 0.18..0.28 (originally 0.32..0.42), completely
     clearing train upstop tyres occupying Z: 0.30..0.42.
   - Widens RailBase_L/R inboard (Right X: 0.300..0.532, Left X: -0.532..-0.300, Z: 0.42..0.44).
   - Adds narrow inboard steel webs RailWeb_R (X: 0.300..0.324) and RailWeb_L (X: -0.324..-0.300)
     spanning Z: 0.18..0.44, structurally supporting the rails while maintaining nominal 8mm clearance
     to outboard car upstop brackets at |X| >= 0.570.
   - Preserves exact RailHead_L/R (|X|: 0.445..0.515, Z: 0.44..0.50, rail gauge 0.48) and central CatwalkWalkway.
"""

import math
import bpy
import mathutils


def _create_empty(name, parent=None, location=(0.0, 0.0, 0.0), rotation=(0.0, 0.0, 0.0)):
    """Create a named Blender empty for anchors and articulation pivots."""
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = "PLAIN_AXES"
    empty.empty_display_size = 0.20
    empty.location = location
    empty.rotation_euler = rotation
    bpy.context.collection.objects.link(empty)
    if parent is not None:
        empty.parent = parent
    return empty


def _create_mesh_object(name, vertices, faces, material=None, parent=None, uvs=None):
    """Create a mesh object from explicit geometry and face-loop UV mapping."""
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


def _add_box(name, min_pt, max_pt, material=None, parent=None, uv_scale=(1.0, 1.0)):
    """Generate an axis-aligned box with explicit unwrap UVs."""
    x0, y0, z0 = min_pt
    x1, y1, z1 = max_pt
    dx, dy, dz = x1 - x0, y1 - y0, z1 - z0
    sx, sy = uv_scale

    verts = [
        (x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
        (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)
    ]
    faces = [
        [0, 3, 2, 1],  # -Z
        [4, 5, 6, 7],  # +Z
        [0, 1, 5, 4],  # -Y
        [2, 3, 7, 6],  # +Y
        [3, 0, 4, 7],  # -X
        [1, 2, 6, 5],  # +X
    ]
    uvs = [
        [(0.0, 0.0), (0.0, dy * sy), (dx * sx, dy * sy), (dx * sx, 0.0)],
        [(0.0, 0.0), (dx * sx, 0.0), (dx * sx, dy * sy), (0.0, dy * sy)],
        [(0.0, 0.0), (dx * sx, 0.0), (dx * sx, dz * sy), (0.0, dz * sy)],
        [(0.0, 0.0), (dx * sx, 0.0), (dx * sx, dz * sy), (0.0, dz * sy)],
        [(0.0, 0.0), (dy * sx, 0.0), (dy * sx, dz * sy), (0.0, dz * sy)],
        [(0.0, 0.0), (dy * sx, 0.0), (dy * sx, dz * sy), (0.0, dz * sy)],
    ]
    return _create_mesh_object(name, verts, faces, material=material, parent=parent, uvs=uvs)


def _add_chamfered_bar(name, min_pt, max_pt, chamfer=0.005, material=None, parent=None, uv_scale=(2.0, 2.0)):
    """Generate a thickness-bearing bar along Y with chamfered longitudinal edges."""
    x0, y0, z0 = min_pt
    x1, y1, z1 = max_pt

    hx = (x1 - x0) * 0.5
    hz = (z1 - z0) * 0.5
    cx = (x0 + x1) * 0.5
    cz = (z0 + z1) * 0.5
    c = min(chamfer, hx * 0.45, hz * 0.45)

    profile = [
        (cx + hx - c, cz + hz),
        (cx - hx + c, cz + hz),
        (cx - hx, cz + hz - c),
        (cx - hx, cz - hz + c),
        (cx - hx + c, cz - hz),
        (cx + hx - c, cz - hz),
        (cx + hx, cz - hz + c),
        (cx + hx, cz + hz - c),
    ]

    verts = []
    for px, pz in profile:
        verts.append((px, y0, pz))
    for px, pz in profile:
        verts.append((px, y1, pz))

    faces = [
        [7, 6, 5, 4, 3, 2, 1, 0],
        [8, 9, 10, 11, 12, 13, 14, 15]
    ]
    for i in range(8):
        ni = (i + 1) % 8
        faces.append([i, 8 + i, 8 + ni, ni])

    dy = y1 - y0
    sx, sy = uv_scale
    perim_dists = [0.0]
    for i in range(8):
        ni = (i + 1) % 8
        dist = math.hypot(profile[ni][0] - profile[i][0], profile[ni][1] - profile[i][1])
        perim_dists.append(perim_dists[-1] + dist)

    uvs = []
    start_cap_uvs = []
    for i in [7, 6, 5, 4, 3, 2, 1, 0]:
        px, pz = profile[i]
        start_cap_uvs.append(((px - x0) * sx, (pz - z0) * sy))
    uvs.append(start_cap_uvs)

    end_cap_uvs = []
    for i in range(8):
        px, pz = profile[i]
        end_cap_uvs.append(((px - x0) * sx, (pz - z0) * sy))
    uvs.append(end_cap_uvs)

    for i in range(8):
        u0 = perim_dists[i] * sx
        u1 = perim_dists[i + 1] * sx
        uvs.append([
            (u0, 0.0),
            (u0, dy * sy),
            (u1, dy * sy),
            (u1, 0.0)
        ])

    return _create_mesh_object(name, verts, faces, material=material, parent=parent, uvs=uvs)


def refine(root, materials):
    """Rebuild station portals, rails, lift gates, and track structure for avatar and upstop clearance.

    Args:
        root: Return dictionary from timber_station.build() or StationRoot bpy.types.Object.
        materials: Dictionary mapping required role names to bpy.types.Material instances.

    Returns:
        Merged metadata dictionary preserving original fields and recording refinement details.
    """
    # 1. Strict validation of StationRoot and prior builder execution
    base_metadata = dict(root) if isinstance(root, dict) else {}
    station_root = None
    if isinstance(root, dict):
        station_root = root.get("anchors", {}).get("StationRoot")
    if station_root is None:
        station_root = bpy.data.objects.get("StationRoot")

    if station_root is None or not isinstance(station_root, bpy.types.Object):
        raise ValueError("Original StationRoot object not found; refine requires prior builder execution")

    # 2. Strict validation of required material keys
    required_materials = ["timber", "metal", "brass", "paint_teal", "cream", "paint_red"]
    if not isinstance(materials, dict):
        raise TypeError("materials must be a dictionary")
    for mat_key in required_materials:
        if mat_key not in materials or materials[mat_key] is None:
            raise ValueError(f"Required material key '{mat_key}' missing or None in materials dict")

    mat_timber = materials["timber"]
    mat_metal = materials["metal"]
    mat_brass = materials["brass"]
    mat_teal = materials["paint_teal"]
    mat_cream = materials["cream"]
    mat_red = materials["paint_red"]

    # 3. Strict validation that all 33 source target objects exist before mutation
    exact_source_targets = [
        "Turnstile_Base",
        "Turnstile_Arm1",
        "Turnstile_Arm2",
        "ExitGate_Arm",
        "QueuePortal_Post1",
        "QueuePortal_Post2",
        "QueuePortal_Lintel",
        "QueuePortal_Sign",
        "QueuePortal_SignTrim",
        "ExitGate_Post1",
        "ExitGate_Post2",
        "ExitGate_Lintel",
        "ExitGate_Sign",
        "TopRail_R_0",
        "TopRail_R_1",
        "MidRail_R_0",
        "MidRail_R_1",
        "TopRail_L_0",
        "TopRail_L_1",
        "MidRail_L_0",
        "MidRail_L_1",
        "TrackBed_L",
        "TrackBed_R",
        "Tie_0",
        "Tie_1",
        "Tie_2",
        "Tie_3",
        "Tie_4",
        "Tie_5",
        "Tie_6",
        "Tie_7",
        "RailBase_L",
        "RailBase_R",
    ]

    for target_name in exact_source_targets:
        obj = bpy.data.objects.get(target_name)
        if obj is None or not isinstance(obj, bpy.types.Object):
            raise ValueError(f"Required source target object '{target_name}' missing prior to mutation")

    # 4. Remove all 33 exact source target objects
    removed_objects = []
    for name in exact_source_targets:
        obj = bpy.data.objects.get(name)
        if obj is not None:
            mesh_data = obj.data
            bpy.data.objects.remove(obj, do_unlink=True)
            if mesh_data is not None and mesh_data.users == 0:
                bpy.data.meshes.remove(mesh_data)
            removed_objects.append(name)

    changed_objects = []
    new_objects = []

    # =========================================================================
    # 5. Boarding Queue Portal & Railings (+X side, clear opening Y: 1.06..1.74)
    # =========================================================================
    # Posts: Y 0.98..1.06 and 1.74..1.82, X: 1.87..1.93, Z: 0.82..2.98
    q_post1 = _add_box(
        "QueuePortal_Post1",
        (1.87, 0.98, 0.82), (1.93, 1.06, 2.98),
        material=mat_timber, parent=station_root, uv_scale=(2.0, 3.0)
    )
    changed_objects.append(q_post1.name)

    q_post2 = _add_box(
        "QueuePortal_Post2",
        (1.87, 1.74, 0.82), (1.93, 1.82, 2.98),
        material=mat_timber, parent=station_root, uv_scale=(2.0, 3.0)
    )
    changed_objects.append(q_post2.name)

    # Lintel: X: 1.86..1.94, Y: 0.96..1.84, Z: 2.88..2.98
    q_lintel = _add_box(
        "QueuePortal_Lintel",
        (1.86, 0.96, 2.88), (1.94, 1.84, 2.98),
        material=mat_timber, parent=station_root, uv_scale=(2.0, 3.0)
    )
    changed_objects.append(q_lintel.name)

    # Sign & Trim: entirely above 2.70m and below lintel bottom (2.88m)
    q_sign = _add_box(
        "QueuePortal_Sign",
        (1.85, 1.08, 2.71), (1.95, 1.72, 2.87),
        material=mat_teal, parent=station_root, uv_scale=(2.0, 2.0)
    )
    changed_objects.append(q_sign.name)

    q_trim = _add_box(
        "QueuePortal_SignTrim",
        (1.84, 1.10, 2.73), (1.96, 1.70, 2.85),
        material=mat_cream, parent=station_root, uv_scale=(2.0, 2.0)
    )
    changed_objects.append(q_trim.name)

    # Right handrails adjusted to Y-sections [-2.0..1.06] and [1.74..2.0]
    tr_r_0 = _add_box(
        "TopRail_R_0",
        (1.86, -2.0, 1.76), (1.94, 1.06, 1.82),
        material=mat_timber, parent=station_root, uv_scale=(2.0, 2.0)
    )
    changed_objects.append(tr_r_0.name)

    tr_r_1 = _add_box(
        "TopRail_R_1",
        (1.86, 1.74, 1.76), (1.94, 2.0, 1.82),
        material=mat_timber, parent=station_root, uv_scale=(2.0, 2.0)
    )
    changed_objects.append(tr_r_1.name)

    mr_r_0 = _add_box(
        "MidRail_R_0",
        (1.87, -2.0, 1.30), (1.93, 1.06, 1.35),
        material=mat_timber, parent=station_root, uv_scale=(2.0, 2.0)
    )
    changed_objects.append(mr_r_0.name)

    mr_r_1 = _add_box(
        "MidRail_R_1",
        (1.87, 1.74, 1.30), (1.93, 2.0, 1.35),
        material=mat_timber, parent=station_root, uv_scale=(2.0, 2.0)
    )
    changed_objects.append(mr_r_1.name)

    # =========================================================================
    # 6. Queue Single-Boom Lift Gate (Pedestal & Counterweight Y: 0.94..1.04)
    # =========================================================================
    q_ped_base = _add_box(
        "QueueGate_PedestalBase",
        (1.75, 0.94, 0.82), (1.85, 1.04, 0.86),
        material=mat_metal, parent=station_root, uv_scale=(2.0, 2.0)
    )
    new_objects.append(q_ped_base.name)

    q_ped = _add_box(
        "QueueGate_Pedestal",
        (1.76, 0.95, 0.86), (1.84, 1.03, 1.32),
        material=mat_metal, parent=station_root, uv_scale=(2.0, 3.0)
    )
    new_objects.append(q_ped.name)

    q_ped_cap = _add_box(
        "QueueGate_PedestalCap",
        (1.75, 0.94, 1.32), (1.85, 1.04, 1.40),
        material=mat_metal, parent=station_root, uv_scale=(2.0, 2.0)
    )
    new_objects.append(q_ped_cap.name)

    q_stop = _add_box(
        "QueueGate_Stop",
        (1.77, 1.02, 1.32), (1.83, 1.04, 1.36),
        material=mat_metal, parent=station_root, uv_scale=(1.0, 1.0)
    )
    new_objects.append(q_stop.name)

    # QueueGate_Hinge Empty parented to station_root
    queue_pivot = (1.80, 1.02, 1.36)
    queue_hinge = _create_empty("QueueGate_Hinge", parent=station_root, location=queue_pivot)
    new_objects.append(queue_hinge.name)

    # Single chamfered liftboom with red tip and counterweight.
    # Local Z strictly confined within +/- 0.023m (<= 0.026m).
    # When open (+pi/2 localX), parent Y = 1.02 - local z <= 1.043m, completely outside corridor Y: 1.10..1.70.
    q_arm_bar = _add_chamfered_bar(
        "QueueGate_ArmBar",
        (-0.019, 0.0, -0.022), (0.019, 0.720, 0.022),
        chamfer=0.005, material=mat_brass, parent=queue_hinge, uv_scale=(2.5, 3.0)
    )
    new_objects.append(q_arm_bar.name)

    q_tip = _add_box(
        "QueueGate_ArmTip",
        (-0.020, 0.650, -0.023), (0.020, 0.720, 0.023),
        material=mat_red, parent=queue_hinge, uv_scale=(1.0, 1.0)
    )
    new_objects.append(q_tip.name)

    q_counterweight = _add_box(
        "QueueGate_Counterweight",
        (-0.024, -0.060, -0.020), (0.024, 0.010, 0.020),
        material=mat_metal, parent=queue_hinge, uv_scale=(1.5, 1.5)
    )
    new_objects.append(q_counterweight.name)

    # =========================================================================
    # 7. Unload Exit Portal & Railings (-X side, clear opening Y: -1.74..-1.06)
    # =========================================================================
    # Posts: Y -1.82..-1.74 and -1.06..-0.98, X: -1.93..-1.87, Z: 0.82..2.98
    ex_post1 = _add_box(
        "ExitGate_Post1",
        (-1.93, -1.82, 0.82), (-1.87, -1.74, 2.98),
        material=mat_timber, parent=station_root, uv_scale=(2.0, 3.0)
    )
    changed_objects.append(ex_post1.name)

    ex_post2 = _add_box(
        "ExitGate_Post2",
        (-1.93, -1.06, 0.82), (-1.87, -0.98, 2.98),
        material=mat_timber, parent=station_root, uv_scale=(2.0, 3.0)
    )
    changed_objects.append(ex_post2.name)

    # Lintel: X: -1.94..-1.86, Y: -1.84..-0.96, Z: 2.88..2.98
    ex_lintel = _add_box(
        "ExitGate_Lintel",
        (-1.94, -1.84, 2.88), (-1.86, -0.96, 2.98),
        material=mat_timber, parent=station_root, uv_scale=(2.0, 3.0)
    )
    changed_objects.append(ex_lintel.name)

    # Sign: entirely above 2.70m and below lintel bottom (2.88m)
    ex_sign = _add_box(
        "ExitGate_Sign",
        (-1.95, -1.72, 2.72), (-1.85, -1.08, 2.86),
        material=mat_cream, parent=station_root, uv_scale=(2.0, 2.0)
    )
    changed_objects.append(ex_sign.name)

    # Left handrails adjusted to Y-sections [-2.0..-1.74] and [-1.06..2.0]
    tr_l_0 = _add_box(
        "TopRail_L_0",
        (-1.94, -2.0, 1.76), (-1.86, -1.74, 1.82),
        material=mat_timber, parent=station_root, uv_scale=(2.0, 2.0)
    )
    changed_objects.append(tr_l_0.name)

    tr_l_1 = _add_box(
        "TopRail_L_1",
        (-1.94, -1.06, 1.76), (-1.86, 2.0, 1.82),
        material=mat_timber, parent=station_root, uv_scale=(2.0, 2.0)
    )
    changed_objects.append(tr_l_1.name)

    mr_l_0 = _add_box(
        "MidRail_L_0",
        (-1.93, -2.0, 1.30), (-1.87, -1.74, 1.35),
        material=mat_timber, parent=station_root, uv_scale=(2.0, 2.0)
    )
    changed_objects.append(mr_l_0.name)

    mr_l_1 = _add_box(
        "MidRail_L_1",
        (-1.93, -1.06, 1.30), (-1.87, 2.0, 1.35),
        material=mat_timber, parent=station_root, uv_scale=(2.0, 2.0)
    )
    changed_objects.append(mr_l_1.name)

    # =========================================================================
    # 8. Exit Single-Boom Lift Gate (Brackets & Stop entirely Y <= -1.74)
    # =========================================================================
    ex_mount = _add_box(
        "ExitGate_HingeMount",
        (-1.92, -1.82, 1.22), (-1.84, -1.75, 1.44),
        material=mat_metal, parent=station_root, uv_scale=(1.5, 1.5)
    )
    new_objects.append(ex_mount.name)

    ex_stop = _add_box(
        "ExitGate_Stop",
        (-1.88, -1.78, 1.28), (-1.84, -1.75, 1.33),
        material=mat_metal, parent=station_root, uv_scale=(1.0, 1.0)
    )
    new_objects.append(ex_stop.name)

    # ExitGate_Hinge Empty parented to station_root
    exit_pivot = (-1.86, -1.78, 1.33)
    exit_hinge = _create_empty("ExitGate_Hinge", parent=station_root, location=exit_pivot)
    new_objects.append(exit_hinge.name)

    # Single chamfered liftboom with cream badge and counterweight.
    # Local Z strictly confined within +/- 0.025m (<= 0.026m).
    # When open (+pi/2 localX), parent Y = -1.78 - local z <= -1.755m, completely outside corridor Y: -1.70..-1.10.
    ex_arm_bar = _add_chamfered_bar(
        "ExitGate_LiftArmBar",
        (-0.019, 0.0, -0.024), (0.019, 0.720, 0.024),
        chamfer=0.005, material=mat_metal, parent=exit_hinge, uv_scale=(2.5, 3.0)
    )
    new_objects.append(ex_arm_bar.name)

    ex_badge = _add_box(
        "ExitGate_LiftArmBadge",
        (-0.020, 0.640, -0.025), (0.020, 0.710, 0.025),
        material=mat_cream, parent=exit_hinge, uv_scale=(1.0, 1.0)
    )
    new_objects.append(ex_badge.name)

    ex_counterweight = _add_box(
        "ExitGate_Counterweight",
        (-0.024, -0.050, -0.020), (0.024, 0.010, 0.020),
        material=mat_metal, parent=exit_hinge, uv_scale=(1.5, 1.5)
    )
    new_objects.append(ex_counterweight.name)

    # =========================================================================
    # 9. Track Bed, Ties, and Outboard Rail Support Webs (Upstop Tyre Clearance)
    # =========================================================================
    # Lower TrackBed_L/R to Z: 0.06..0.18 (originally 0.20..0.32)
    tb_l = _add_box(
        "TrackBed_L",
        (-0.65, -2.0, 0.06), (-0.45, 2.0, 0.18),
        material=mat_timber, parent=station_root, uv_scale=(1.5, 3.0)
    )
    changed_objects.append(tb_l.name)

    tb_r = _add_box(
        "TrackBed_R",
        (0.45, -2.0, 0.06), (0.65, 2.0, 0.18),
        material=mat_timber, parent=station_root, uv_scale=(1.5, 3.0)
    )
    changed_objects.append(tb_r.name)

    # Lower 8 transverse ties to Z: 0.18..0.28 (originally 0.32..0.42), below upstop tyres at Z: 0.30..0.42
    tie_centers_y = [-1.75, -1.25, -0.75, -0.25, 0.25, 0.75, 1.25, 1.75]
    for idx, cy in enumerate(tie_centers_y):
        tie_obj = _add_box(
            f"Tie_{idx}",
            (-0.70, cy - 0.08, 0.18), (0.70, cy + 0.08, 0.28),
            material=mat_timber, parent=station_root, uv_scale=(2.0, 2.0)
        )
        changed_objects.append(tie_obj.name)

    # Widen RailBase_L/R inboard (Z: 0.42..0.44)
    rb_l = _add_box(
        "RailBase_L",
        (-0.532, -2.0, 0.42), (-0.300, 2.0, 0.44),
        material=mat_metal, parent=station_root, uv_scale=(1.0, 1.0)
    )
    changed_objects.append(rb_l.name)

    rb_r = _add_box(
        "RailBase_R",
        (0.300, -2.0, 0.42), (0.532, 2.0, 0.44),
        material=mat_metal, parent=station_root, uv_scale=(1.0, 1.0)
    )
    changed_objects.append(rb_r.name)

    # Narrow inboard steel webs connecting bed/ties (Z=0.18) to rail base/head (Z=0.44)
    # An outboard web would obstruct the moving upstop axle ledge.
    rw_l = _add_box(
        "RailWeb_L",
        (-0.324, -2.0, 0.18), (-0.300, 2.0, 0.44),
        material=mat_metal, parent=station_root, uv_scale=(1.0, 2.0)
    )
    new_objects.append(rw_l.name)

    rw_r = _add_box(
        "RailWeb_R",
        (0.300, -2.0, 0.18), (0.324, 2.0, 0.44),
        material=mat_metal, parent=station_root, uv_scale=(1.0, 2.0)
    )
    new_objects.append(rw_r.name)

    # =========================================================================
    # 10. Metadata Compilation (Preserve Original Fields, Append Refinement)
    # =========================================================================
    metadata = dict(base_metadata)

    # Preserve and merge anchors dictionary
    anchors = dict(metadata.get("anchors", {}))
    anchors.update({
        "StationRoot": station_root,
        "RailIn": bpy.data.objects.get("RailIn"),
        "RailOut": bpy.data.objects.get("RailOut"),
        "DeckBoarding": bpy.data.objects.get("DeckBoarding"),
        "DeckUnload": bpy.data.objects.get("DeckUnload"),
        "QueueGate": bpy.data.objects.get("QueueGate"),
        "ExitGate": bpy.data.objects.get("ExitGate"),
        "OperatorBooth": bpy.data.objects.get("OperatorBooth"),
        "RoofApex": bpy.data.objects.get("RoofApex")
    })
    metadata["anchors"] = anchors

    # Preserve prior restraints and register new articulation hinges
    restraints = dict(metadata.get("restraints", {}))
    restraints["QueueGate_Hinge"] = queue_hinge
    restraints["ExitGate_Hinge"] = exit_hinge
    metadata["restraints"] = restraints

    # Hinge definitions and rest transforms
    hinges = {
        "QueueGate_Hinge": {
            "empty": queue_hinge,
            "pivot": queue_pivot,
            "axis": "localX",
            "openAngle": math.pi / 2,
            "closedAngle": 0.0,
            "restTransform": {
                "location": queue_pivot,
                "rotationEuler": (0.0, 0.0, 0.0)
            }
        },
        "ExitGate_Hinge": {
            "empty": exit_hinge,
            "pivot": exit_pivot,
            "axis": "localX",
            "openAngle": math.pi / 2,
            "closedAngle": 0.0,
            "restTransform": {
                "location": exit_pivot,
                "rotationEuler": (0.0, 0.0, 0.0)
            }
        }
    }
    metadata["hinges"] = hinges

    pivots = {
        "QueueGate_Hinge": queue_pivot,
        "ExitGate_Hinge": exit_pivot
    }
    metadata["pivots"] = pivots

    metadata["changedCount"] = len(exact_source_targets)
    metadata["changedSourceTargets"] = exact_source_targets
    metadata["removedObjects"] = removed_objects
    metadata["changedObjects"] = changed_objects
    metadata["newObjects"] = new_objects

    metadata["refinement"] = {
        "status": "applied",
        "changedCount": len(exact_source_targets),
        "changedSourceTargets": exact_source_targets,
        "removedObjects": removed_objects,
        "changedObjects": changed_objects,
        "newObjects": new_objects,
        "pivots": pivots,
        "hinges": hinges,
        "trackRepair": {
            "trackBedZ": (0.06, 0.18),
            "tiesZ": (0.18, 0.28),
            "railBaseZ": (0.42, 0.44),
            "railBaseXRight": (0.300, 0.532),
            "railBaseXLeft": (-0.532, -0.300),
            "railWebRight": {"x": (0.300, 0.324), "y": (-2.0, 2.0), "z": (0.18, 0.44)},
            "railWebLeft": {"x": (-0.324, -0.300), "y": (-2.0, 2.0), "z": (0.18, 0.44)},
            "railHeadZ": (0.44, 0.50),
            "railGauge": 0.48,
            "catwalkBoundsX": (-0.30, 0.30),
            "upstopTyreEnvelopeZ": (0.30, 0.42),
            "upstopBracketClearance": "Inboard support leaves the outboard tyre and axle passage open; actual checks pending."
        },
        "passageSpecifications": {
            "avatarDimensions": {
                "walkingArmWidth": 0.50,
                "rendererClearStairsWidth": 0.60,
                "nativeEnvelopeWidth": 0.80,
                "deckHeight": 0.82,
                "avatarHeadHeightAboveDeck": 1.80,
                "avatarTotalHeadZ": 2.62,
                "headerClearanceZMin": 2.70
            },
            "queue": {
                "clearOpeningY": (1.06, 1.74),
                "walkCorridorY": (1.10, 1.70),
                "armCorridorY": (1.15, 1.65),
                "headerMinZ": 2.71,
                "lintelBottomZ": 2.88,
                "gateOpenMaxY": 1.043
            },
            "exit": {
                "clearOpeningY": (-1.74, -1.06),
                "walkCorridorY": (-1.70, -1.10),
                "armCorridorY": (-1.65, -1.15),
                "headerMinZ": 2.72,
                "lintelBottomZ": 2.88,
                "gateOpenMaxY": -1.755
            },
            "checksStatus": "UNEXECUTED"
        }
    }

    return metadata
