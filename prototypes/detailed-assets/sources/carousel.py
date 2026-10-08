"""Independently authored 16-seat Carousel BODY model source for Coaster Tycoon 3D.

Blender 4.3.2 Python module.
Conforms strictly to the authoring datum contract:
- glTF metres basis: Authored (+Yup, +Zfront) maps to Blender (+X, -Zfront, +Yup).
- CarouselRoot static at (0, 0, 0).
- DeckRoot and RotorRoot at local (0, 0.4, 0)m.
- 16 direct children empties Seat_00..Seat_15 under RotorRoot with literal integer mm coordinates.
- Station-body interface empties: EntranceBuildingRoot, ExitBuildingRoot, EntranceDeckInterface, ExitDeckInterface.
- Clear passenger walking openings preserved at entrance/exit sectors with dedicated deck extensions.
- Distinct rotating rotor vs static roof, centre column, foundation, and walk-in deck extensions.
- Full anatomical sculpted horses with saddles, bridles, manes, tails, hooves, and forward mounting poles.
- 16 radial canopy panels (alternating yellow/cream), scalloped valance, frieze medallions, finial, and timber ceiling.
- Explicit non-degenerate UV unwrapping on all geometry including caps and cylinders.
- Shared mesh datablocks for repeated horses, columns, and medallions to strictly respect performance budgets.
"""

import bpy
import math
import mathutils


# ============================================================================
# Coordinate Transformation Helpers
# ============================================================================

def to_blender(x, y, z):
    """Convert authored coordinates (+Yup, +Zfront) to Blender (+Zup, -Yfront).

    Basis transformation:
        Blender X =  Authored X
        Blender Y = -Authored Z
        Blender Z =  Authored Y
    """
    return (float(x), -float(z), float(y))


def _create_empty(name, parent=None, location=(0.0, 0.0, 0.0), rotation=(0.0, 0.0, 0.0)):
    """Create a named Blender empty object for hierarchy and anchors."""
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = "PLAIN_AXES"
    empty.empty_display_size = 0.3
    empty.location = location
    empty.rotation_euler = rotation
    bpy.context.collection.objects.link(empty)
    if parent is not None:
        empty.parent = parent
    return empty


def _create_mesh_object(name, vertices, faces, materials=None, parent=None, uvs=None, material_indices=None):
    """Create a Blender mesh object with explicit non-degenerate UVs and material assignments."""
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()

    if uvs is not None and len(uvs) == len(faces):
        uv_layer = mesh.uv_layers.new(name="UVMap")
        loop_idx = 0
        for face_uv in uvs:
            for u, v in face_uv:
                uv_layer.data[loop_idx].uv = (float(u), float(v))
                loop_idx += 1

    if material_indices is not None and len(material_indices) == len(faces):
        for poly, mat_idx in zip(mesh.polygons, material_indices):
            poly.material_index = int(mat_idx)

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    if materials is not None:
        if isinstance(materials, (list, tuple)):
            for mat in materials:
                if mat is not None:
                    obj.data.materials.append(mat)
        elif materials is not None:
            obj.data.materials.append(materials)

    if parent is not None:
        obj.parent = parent

    return obj


# ============================================================================
# Architectural Primitive Builders
# ============================================================================

def _build_cylinder(name, radius_bottom, radius_top, height, segments=16, z_base=0.0,
                    material=None, parent=None, uv_scale=(1.0, 1.0)):
    """Generate a clean cylindrical or conical trunk with quad sides and non-degenerate tri-fan caps."""
    verts = []
    faces = []
    uvs = []
    u_sc, v_sc = uv_scale

    # Bottom cap center: vertex 0
    verts.append((0.0, 0.0, z_base))
    # Top cap center: vertex 1
    verts.append((0.0, 0.0, z_base + height))

    base_idx = 2
    for i in range(segments):
        angle = (2.0 * math.pi * i) / segments
        ca = math.cos(angle)
        sa = math.sin(angle)
        verts.append((radius_bottom * ca, radius_bottom * sa, z_base))
        verts.append((radius_top * ca, radius_top * sa, z_base + height))

    for i in range(segments):
        i_next = (i + 1) % segments
        b0 = base_idx + i * 2
        t0 = b0 + 1
        b1 = base_idx + i_next * 2
        t1 = b1 + 1

        # Side quad
        faces.append([b0, b1, t1, t0])
        u0 = (i / segments) * u_sc
        u1 = ((i + 1) / segments) * u_sc
        uvs.append([(u0, 0.0), (u1, 0.0), (u1, height * v_sc), (u0, height * v_sc)])

        # Recompute angles for current and next segment per face to avoid stale UV coordinates
        ang0 = (2.0 * math.pi * i) / segments
        ang1 = (2.0 * math.pi * (i + 1)) / segments
        ca0 = math.cos(ang0)
        sa0 = math.sin(ang0)
        ca1 = math.cos(ang1)
        sa1 = math.sin(ang1)

        # Bottom cap tri (winding: center -> b1 -> b0 for -Z normal)
        faces.append([0, b1, b0])
        uvs.append([
            (0.5, 0.5),
            (0.5 + 0.48 * ca1, 0.5 + 0.48 * sa1),
            (0.5 + 0.48 * ca0, 0.5 + 0.48 * sa0)
        ])

        # Top cap tri (winding: center -> t0 -> t1 for +Z normal)
        faces.append([1, t0, t1])
        uvs.append([
            (0.5, 0.5),
            (0.5 + 0.48 * ca0, 0.5 + 0.48 * sa0),
            (0.5 + 0.48 * ca1, 0.5 + 0.48 * sa1)
        ])

    return _create_mesh_object(name, verts, faces, material, parent, uvs)


def _build_annulus_sector(r_inner, r_outer, z_floor, z_ceil, angle_start, angle_end, segments=2):
    """Return mesh vertices, faces, and UVs for an annular radial step segment."""
    verts = []
    faces = []
    uvs = []
    th = z_ceil - z_floor

    step_a = (angle_end - angle_start) / segments
    for s in range(segments + 1):
        ang = angle_start + s * step_a
        ca = math.cos(ang)
        sa = math.sin(ang)
        verts.append((r_inner * ca, r_inner * sa, z_floor))
        verts.append((r_outer * ca, r_outer * sa, z_floor))
        verts.append((r_inner * ca, r_inner * sa, z_ceil))
        verts.append((r_outer * ca, r_outer * sa, z_ceil))

    for s in range(segments):
        base = s * 4
        next_b = (s + 1) * 4
        # Top face quad
        faces.append([base + 2, next_b + 2, next_b + 3, base + 3])
        u0 = s / segments
        u1 = (s + 1) / segments
        uvs.append([(u0, 0.0), (u1, 0.0), (u1, 1.0), (u0, 1.0)])
        # Outer riser quad
        faces.append([base + 1, next_b + 1, next_b + 3, base + 3])
        uvs.append([(u0, 0.0), (u1, 0.0), (u1, th), (u0, th)])

    return verts, faces, uvs


# ============================================================================
# Detailed Sculpted Horse Mesh Builder
# ============================================================================

def _build_sculpted_horse_mesh(mesh_name, pose_prance=True):
    """Build an anatomical carved carousel horse mesh with saddle, bridle, mane, tail, and mounting pole.

    Material Slot Indices:
        0: horse (white sculpt body)
        1: red (saddle, blanket, bridle, trappings)
        2: metal (brass mounting pole, stirrups, buckles)
        3: dark (hooves, eyes, bridle bits)
    """
    verts = []
    faces = []
    uvs = []
    mat_indices = []

    def _add_poly(v_indices, uv_coords, mat_id):
        faces.append(v_indices)
        uvs.append(uv_coords)
        mat_indices.append(mat_id)

    # ------------------------------------------------------------------------
    # 1. Anatomical Torso (Lofted Cross-sectional Rings along Y)
    # ------------------------------------------------------------------------
    torso_rings = [
        # (Y_pos, Z_center, semi_width_x, semi_height_z)
        (0.50, 1.04, 0.16, 0.19),   # Ring 0: Croup / rump
        (0.30, 1.01, 0.19, 0.22),   # Ring 1: Flank / hindquarters
        (0.06, 0.97, 0.18, 0.20),   # Ring 2: Waist / saddle dip
        (-0.16, 0.99, 0.20, 0.23),  # Ring 3: Ribcage / girth
        (-0.36, 1.05, 0.18, 0.25),  # Ring 4: Withers / breast base
        (-0.48, 0.94, 0.14, 0.19),  # Ring 5: Front chest curve
    ]
    num_torso_pts = 8
    torso_base_idx = len(verts)

    for r_idx, (ry, rz, rx, rz_dim) in enumerate(torso_rings):
        for p in range(num_torso_pts):
            theta = (2.0 * math.pi * p) / num_torso_pts
            vx = rx * math.sin(theta)
            vz = rz + rz_dim * math.cos(theta)
            verts.append((vx, ry, vz))

    # Rear end cap (vertex at tail base)
    tail_base_vert = len(verts)
    verts.append((0.0, 0.56, 1.05))

    # Chest front end cap
    chest_front_vert = len(verts)
    verts.append((0.0, -0.53, 0.94))

    # Stitch torso ring quads
    for r in range(len(torso_rings) - 1):
        r0 = torso_base_idx + r * num_torso_pts
        r1 = torso_base_idx + (r + 1) * num_torso_pts
        v_coord0 = r / (len(torso_rings) - 1)
        v_coord1 = (r + 1) / (len(torso_rings) - 1)
        for p in range(num_torso_pts):
            p_next = (p + 1) % num_torso_pts
            u0 = p / num_torso_pts
            u1 = (p + 1) / num_torso_pts
            _add_poly(
                [r0 + p, r1 + p, r1 + p_next, r0 + p_next],
                [(u0, v_coord0), (u0, v_coord1), (u1, v_coord1), (u1, v_coord0)],
                0
            )

    # Torso end caps with non-degenerate fan UVs
    r_first = torso_base_idx
    r_last = torso_base_idx + (len(torso_rings) - 1) * num_torso_pts
    for p in range(num_torso_pts):
        p_next = (p + 1) % num_torso_pts
        ang_p0 = (2.0 * math.pi * p) / num_torso_pts
        ang_p1 = (2.0 * math.pi * (p + 1)) / num_torso_pts
        # Rear cap
        _add_poly(
            [tail_base_vert, r_first + p_next, r_first + p],
            [(0.5, 0.5),
             (0.5 + 0.45 * math.sin(ang_p1), 0.5 + 0.45 * math.cos(ang_p1)),
             (0.5 + 0.45 * math.sin(ang_p0), 0.5 + 0.45 * math.cos(ang_p0))],
            0
        )
        # Front chest cap
        _add_poly(
            [chest_front_vert, r_last + p, r_last + p_next],
            [(0.5, 0.5),
             (0.5 + 0.45 * math.sin(ang_p0), 0.5 + 0.45 * math.cos(ang_p0)),
             (0.5 + 0.45 * math.sin(ang_p1), 0.5 + 0.45 * math.cos(ang_p1))],
            0
        )

    # ------------------------------------------------------------------------
    # 2. Arched Neck and Head (Bent Forward and Upward)
    # ------------------------------------------------------------------------
    neck_rings = [
        (-0.38, 1.15, 0.11, 0.14),
        (-0.48, 1.28, 0.09, 0.13),
        (-0.58, 1.40, 0.08, 0.12),
        (-0.66, 1.48, 0.07, 0.10),
    ]
    num_neck_pts = 6
    neck_base_idx = len(verts)

    for ry, rz, rx, rz_dim in neck_rings:
        for p in range(num_neck_pts):
            theta = (2.0 * math.pi * p) / num_neck_pts
            vx = rx * math.sin(theta)
            vz = rz + rz_dim * math.cos(theta)
            verts.append((vx, ry, vz))

    for r in range(len(neck_rings) - 1):
        r0 = neck_base_idx + r * num_neck_pts
        r1 = neck_base_idx + (r + 1) * num_neck_pts
        v0 = r / (len(neck_rings) - 1)
        v1 = (r + 1) / (len(neck_rings) - 1)
        for p in range(num_neck_pts):
            p_next = (p + 1) % num_neck_pts
            _add_poly(
                [r0 + p, r1 + p, r1 + p_next, r0 + p_next],
                [(p / 6, v0), (p / 6, v1), ((p + 1) / 6, v1), ((p + 1) / 6, v0)],
                0
            )

    # Head rings (poll down to muzzle)
    head_rings = [
        (-0.71, 1.44, 0.075, 0.09),  # Cheeks / jaw
        (-0.79, 1.36, 0.060, 0.07),  # Nose bridge
        (-0.86, 1.29, 0.042, 0.05),  # Muzzle / nostrils
    ]
    head_base_idx = len(verts)
    for ry, rz, rx, rz_dim in head_rings:
        for p in range(num_neck_pts):
            theta = (2.0 * math.pi * p) / num_neck_pts
            vx = rx * math.sin(theta)
            vz = rz + rz_dim * math.cos(theta)
            verts.append((vx, ry, vz))

    # Connect neck top to head base
    r_neck_top = neck_base_idx + (len(neck_rings) - 1) * num_neck_pts
    for p in range(num_neck_pts):
        p_next = (p + 1) % num_neck_pts
        _add_poly(
            [r_neck_top + p, head_base_idx + p, head_base_idx + p_next, r_neck_top + p_next],
            [(p / 6, 0.0), (p / 6, 0.3), ((p + 1) / 6, 0.3), ((p + 1) / 6, 0.0)],
            0
        )

    for r in range(len(head_rings) - 1):
        r0 = head_base_idx + r * num_neck_pts
        r1 = head_base_idx + (r + 1) * num_neck_pts
        for p in range(num_neck_pts):
            p_next = (p + 1) % num_neck_pts
            _add_poly(
                [r0 + p, r1 + p, r1 + p_next, r0 + p_next],
                [(p / 6, 0.3 + r * 0.3), (p / 6, 0.6 + r * 0.3), ((p + 1) / 6, 0.6 + r * 0.3), ((p + 1) / 6, 0.3 + r * 0.3)],
                0
            )

    # Muzzle tip cap with explicit scaled radial UVs
    muzzle_tip_idx = len(verts)
    verts.append((0.0, -0.90, 1.27))
    r_muzzle = head_base_idx + (len(head_rings) - 1) * num_neck_pts
    for p in range(num_neck_pts):
        p_next = (p + 1) % num_neck_pts
        ang_m0 = (2.0 * math.pi * p) / num_neck_pts
        ang_m1 = (2.0 * math.pi * (p + 1)) / num_neck_pts
        _add_poly(
            [muzzle_tip_idx, r_muzzle + p, r_muzzle + p_next],
            [(0.5, 0.5),
             (0.5 + 0.45 * math.sin(ang_m0), 0.5 + 0.45 * math.cos(ang_m0)),
             (0.5 + 0.45 * math.sin(ang_m1), 0.5 + 0.45 * math.cos(ang_m1))],
            3  # dark muzzle
        )

    # Sculpted Ears (pointed cones at poll)
    for ear_sign, ear_x in [(-1, -0.05), (1, 0.05)]:
        b_idx = len(verts)
        verts.append((ear_x - 0.02, -0.65, 1.51))
        verts.append((ear_x + 0.02, -0.65, 1.51))
        verts.append((ear_x, -0.67, 1.50))
        verts.append((ear_x + ear_sign * 0.01, -0.67, 1.62))  # ear tip
        _add_poly([b_idx, b_idx + 1, b_idx + 3], [(0.0, 0.0), (1.0, 0.0), (0.5, 1.0)], 0)
        _add_poly([b_idx + 1, b_idx + 2, b_idx + 3], [(0.0, 0.0), (1.0, 0.0), (0.5, 1.0)], 0)
        _add_poly([b_idx + 2, b_idx, b_idx + 3], [(0.0, 0.0), (1.0, 0.0), (0.5, 1.0)], 0)

    # Sculpted Mane Crest (curving wave along neck top)
    mane_pts = [
        (-0.66, 1.53), (-0.58, 1.48), (-0.50, 1.39), (-0.42, 1.28), (-0.36, 1.18)
    ]
    for m in range(len(mane_pts) - 1):
        my0, mz0 = mane_pts[m]
        my1, mz1 = mane_pts[m + 1]
        b_idx = len(verts)
        verts.append((-0.03, my0, mz0))
        verts.append((0.03, my0, mz0))
        verts.append((0.03, my1, mz1))
        verts.append((-0.03, my1, mz1))
        verts.append((0.0, (my0 + my1) * 0.5, max(mz0, mz1) + 0.04))
        _add_poly([b_idx, b_idx + 1, b_idx + 4], [(0.0, 0.0), (1.0, 0.0), (0.5, 1.0)], 0)
        _add_poly([b_idx + 1, b_idx + 2, b_idx + 4], [(1.0, 0.0), (1.0, 1.0), (0.5, 1.0)], 0)
        _add_poly([b_idx + 2, b_idx + 3, b_idx + 4], [(1.0, 1.0), (0.0, 1.0), (0.5, 0.0)], 0)
        _add_poly([b_idx + 3, b_idx, b_idx + 4], [(0.0, 1.0), (0.0, 0.0), (0.5, 1.0)], 0)

    # ------------------------------------------------------------------------
    # 3. Sculpted Tail (Flowing Backward and Downward)
    # ------------------------------------------------------------------------
    tail_rings = [
        (0.55, 1.12, 0.05, 0.06),
        (0.66, 1.18, 0.07, 0.08),
        (0.76, 0.98, 0.06, 0.09),
        (0.82, 0.72, 0.05, 0.07),
        (0.84, 0.52, 0.03, 0.04),
    ]
    tail_base_v = len(verts)
    for ry, rz, rx, rz_dim in tail_rings:
        for p in range(4):
            th = (math.pi * 0.5 * p) + (math.pi * 0.25)
            verts.append((rx * math.sin(th), ry, rz + rz_dim * math.cos(th)))

    for t in range(len(tail_rings) - 1):
        t0 = tail_base_v + t * 4
        t1 = tail_base_v + (t + 1) * 4
        for p in range(4):
            p_next = (p + 1) % 4
            _add_poly(
                [t0 + p, t1 + p, t1 + p_next, t0 + p_next],
                [(p * 0.25, t * 0.25), (p * 0.25, (t + 1) * 0.25), ((p + 1) * 0.25, (t + 1) * 0.25), ((p + 1) * 0.25, t * 0.25)],
                0
            )

    # ------------------------------------------------------------------------
    # 4. Articulated Legs and Hooves (Prance vs Gallop)
    # ------------------------------------------------------------------------
    def _add_limb_segment(p_start, p_end, r_start, r_end, mat_id=0):
        p0 = mathutils.Vector(p_start)
        p1 = mathutils.Vector(p_end)
        axis = (p1 - p0)
        length = axis.length
        if length < 1e-4:
            return
        d = axis.normalized()
        ref = mathutils.Vector((0.0, 1.0, 0.0)) if abs(d.y) < 0.9 else mathutils.Vector((1.0, 0.0, 0.0))
        u_vec = d.cross(ref).normalized()
        v_vec = d.cross(u_vec).normalized()

        b_idx = len(verts)
        for i in range(4):
            ang = (math.pi * 0.5 * i) + (math.pi * 0.25)
            off = (u_vec * math.cos(ang) + v_vec * math.sin(ang))
            verts.append(tuple(p0 + off * r_start))
            verts.append(tuple(p1 + off * r_end))

        for i in range(4):
            i_next = (i + 1) % 4
            v0 = b_idx + i * 2
            v1 = v0 + 1
            v2 = b_idx + i_next * 2 + 1
            v3 = b_idx + i_next * 2
            _add_poly([v0, v1, v2, v3], [(i / 4.0, 0.0), (i / 4.0, 1.0), ((i + 1) / 4.0, 1.0), ((i + 1) / 4.0, 0.0)], mat_id)

    for side in [-1, 1]:
        lx = side * 0.14
        # Forelegs
        if pose_prance:
            p_shoulder = (lx, -0.32, 0.95)
            p_elbow = (lx, -0.44, 0.76)
            p_knee = (lx, -0.52, 0.58)
            p_fetlock = (lx, -0.42, 0.40)
            p_hoof = (lx, -0.38, 0.30)
        else:
            p_shoulder = (lx, -0.32, 0.95)
            p_elbow = (lx, -0.40, 0.72)
            p_knee = (lx, -0.46, 0.48)
            p_fetlock = (lx, -0.42, 0.30)
            p_hoof = (lx, -0.40, 0.18)

        _add_limb_segment(p_shoulder, p_elbow, 0.065, 0.055, 0)
        _add_limb_segment(p_elbow, p_knee, 0.055, 0.045, 0)
        _add_limb_segment(p_knee, p_fetlock, 0.045, 0.038, 0)
        _add_limb_segment(p_fetlock, p_hoof, 0.038, 0.045, 3)

        # Hind legs
        hx = side * 0.15
        if pose_prance:
            p_hip = (hx, 0.30, 0.98)
            p_stifle = (hx, 0.46, 0.78)
            p_hock = (hx, 0.60, 0.56)
            p_h_fetlock = (hx, 0.68, 0.36)
            p_h_hoof = (hx, 0.72, 0.24)
        else:
            p_hip = (hx, 0.30, 0.98)
            p_stifle = (hx, 0.44, 0.72)
            p_hock = (hx, 0.56, 0.46)
            p_h_fetlock = (hx, 0.64, 0.26)
            p_h_hoof = (hx, 0.68, 0.16)

        _add_limb_segment(p_hip, p_stifle, 0.075, 0.060, 0)
        _add_limb_segment(p_stifle, p_hock, 0.060, 0.048, 0)
        _add_limb_segment(p_hock, p_h_fetlock, 0.048, 0.040, 0)
        _add_limb_segment(p_h_fetlock, p_h_hoof, 0.040, 0.048, 3)

    # ------------------------------------------------------------------------
    # 5. Elaborate Saddle, Blanket, Trappings, Stirrups
    # ------------------------------------------------------------------------
    blanket_u_steps = 4
    blanket_y_steps = 5
    b_y_min, b_y_max = -0.22, 0.32
    bl_idx = len(verts)

    for iy in range(blanket_y_steps + 1):
        by = b_y_min + (b_y_max - b_y_min) * (iy / blanket_y_steps)
        for ix in range(blanket_u_steps + 1):
            s_u = -1.0 + 2.0 * (ix / blanket_u_steps)
            bx = s_u * 0.23
            bz = 1.06 - (s_u * s_u) * 0.18
            verts.append((bx, by, bz))

    for iy in range(blanket_y_steps):
        row0 = bl_idx + iy * (blanket_u_steps + 1)
        row1 = bl_idx + (iy + 1) * (blanket_u_steps + 1)
        for ix in range(blanket_u_steps):
            _add_poly(
                [row0 + ix, row1 + ix, row1 + ix + 1, row0 + ix + 1],
                [(ix / 4, iy / 5), (ix / 4, (iy + 1) / 5), ((ix + 1) / 4, (iy + 1) / 5), ((ix + 1) / 4, iy / 5)],
                1
            )

    # Raised Cantle (rear) & Pommel (front)
    for part_name, py, pz, r_arch, mat_id in [
        ("Pommel", -0.16, 1.16, 0.14, 1),
        ("Cantle", 0.26, 1.15, 0.16, 1),
    ]:
        p_idx = len(verts)
        for i in range(5):
            a = math.pi * (i / 4.0)
            verts.append((r_arch * math.cos(a), py - 0.03, pz + 0.06 * math.sin(a)))
            verts.append((r_arch * math.cos(a), py + 0.03, pz + 0.06 * math.sin(a)))
        for i in range(4):
            v0 = p_idx + i * 2
            v1 = v0 + 1
            v2 = p_idx + (i + 1) * 2 + 1
            v3 = p_idx + (i + 1) * 2
            u0 = i / 4.0
            u1 = (i + 1) / 4.0
            _add_poly([v0, v1, v2, v3], [(u0, 0.0), (u0, 1.0), (u1, 1.0), (u1, 0.0)], mat_id)

    # Hanging Brass Stirrups (repaired with non-degenerate tubular arch & tread bar)
    for side in [-1, 1]:
        st_x = side * 0.23
        st_y = 0.02
        # Stirrup leather strap
        _add_limb_segment((st_x, st_y, 1.02), (st_x, st_y, 0.70), 0.015, 0.015, 1)
        # Stirrup iron hoop arch
        r_stirrup = 0.045
        arch_pts = []
        for a_idx in range(5):
            a_ang = math.pi * a_idx / 4.0
            arch_pts.append((st_x, st_y - r_stirrup * math.cos(a_ang), 0.65 + r_stirrup * math.sin(a_ang)))
        for a_idx in range(4):
            _add_limb_segment(arch_pts[a_idx], arch_pts[a_idx + 1], 0.008, 0.008, 2)
        # Stirrup bottom tread bar
        _add_limb_segment(arch_pts[0], arch_pts[4], 0.008, 0.008, 2)

    # ------------------------------------------------------------------------
    # 6. Brass Vertical Mounting Pole & Finials
    # ------------------------------------------------------------------------
    pole_y = -0.32
    pole_radius = 0.035
    pole_segments = 8
    p_base_idx = len(verts)

    for i in range(pole_segments):
        a = (2.0 * math.pi * i) / pole_segments
        ca = math.cos(a) * pole_radius
        sa = math.sin(a) * pole_radius
        verts.append((ca, pole_y + sa, 0.0))
        verts.append((ca, pole_y + sa, 3.50))

    for i in range(pole_segments):
        i_next = (i + 1) % pole_segments
        v0 = p_base_idx + i * 2
        v1 = v0 + 1
        v2 = p_base_idx + i_next * 2 + 1
        v3 = p_base_idx + i_next * 2
        u0 = i / pole_segments
        u1 = (i + 1) / pole_segments
        _add_poly([v0, v1, v2, v3], [(u0, 0.0), (u0, 1.0), (u1, 1.0), (u1, 0.0)], 2)

    # Sealed pole caps with non-degenerate tri-fan UVs
    pole_top_center = len(verts)
    verts.append((0.0, pole_y, 3.50))
    pole_bot_center = len(verts)
    verts.append((0.0, pole_y, 0.0))

    for i in range(pole_segments):
        i_next = (i + 1) % pole_segments
        ang0 = (2.0 * math.pi * i) / pole_segments
        ang1 = (2.0 * math.pi * (i + 1)) / pole_segments
        ca0, sa0 = math.cos(ang0), math.sin(ang0)
        ca1, sa1 = math.cos(ang1), math.sin(ang1)

        v_top0 = p_base_idx + i * 2 + 1
        v_top1 = p_base_idx + i_next * 2 + 1
        _add_poly(
            [pole_top_center, v_top0, v_top1],
            [(0.5, 0.5), (0.5 + 0.45 * ca0, 0.5 + 0.45 * sa0), (0.5 + 0.45 * ca1, 0.5 + 0.45 * sa1)],
            2
        )

        v_bot0 = p_base_idx + i * 2
        v_bot1 = p_base_idx + i_next * 2
        _add_poly(
            [pole_bot_center, v_bot1, v_bot0],
            [(0.5, 0.5), (0.5 + 0.45 * ca1, 0.5 + 0.45 * sa1), (0.5 + 0.45 * ca0, 0.5 + 0.45 * sa0)],
            2
        )

    # Flanged decorative brass collars on pole
    for collar_z in [0.04, 0.84, 1.36, 3.44]:
        c_idx = len(verts)
        r_col = pole_radius * 1.5
        for i in range(pole_segments):
            a = (2.0 * math.pi * i) / pole_segments
            verts.append((r_col * math.cos(a), pole_y + r_col * math.sin(a), collar_z - 0.02))
            verts.append((r_col * math.cos(a), pole_y + r_col * math.sin(a), collar_z + 0.02))
        for i in range(pole_segments):
            i_next = (i + 1) % pole_segments
            u0 = i / pole_segments
            u1 = (i + 1) / pole_segments
            _add_poly(
                [c_idx + i * 2, c_idx + i * 2 + 1, c_idx + i_next * 2 + 1, c_idx + i_next * 2],
                [(u0, 0.0), (u0, 1.0), (u1, 1.0), (u1, 0.0)],
                2
            )

    mesh = bpy.data.meshes.new(mesh_name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    uv_layer = mesh.uv_layers.new(name="UVMap")
    loop_idx = 0
    for face_uv in uvs:
        for u, v in face_uv:
            uv_layer.data[loop_idx].uv = (float(u), float(v))
            loop_idx += 1

    # Deliberate smooth shading on horse anatomy and hard edges on hooves/saddle/pole
    for poly, mat_idx in zip(mesh.polygons, mat_indices):
        poly.material_index = int(mat_idx)
        poly.use_smooth = (mat_idx == 0)

    return mesh


# ============================================================================
# Canopy, Valance, Frieze, and Central Structure Builders
# ============================================================================

def _build_16_canopy_panels(parent, mat_yellow, mat_cream, mat_metal):
    """Generate 16 radial tensioned canvas fabric panels with fine piping ribs between seams."""
    verts = []
    faces = []
    uvs = []
    mat_indices = []

    profile = [
        (0.18, 6.10),   # Apex hub
        (1.30, 5.65),   # Cupola tier ridge
        (3.00, 5.05),   # Mid cone camber
        (5.25, 4.55),   # Eave perimeter
    ]
    num_sectors = 16
    prof_len = len(profile)

    for i in range(num_sectors):
        a0 = (2.0 * math.pi * i) / num_sectors
        a1 = (2.0 * math.pi * (i + 1)) / num_sectors
        mat_id = 0 if (i % 2 == 0) else 1

        base_idx = len(verts)
        for r_dim, z_dim in profile:
            verts.append((r_dim * math.cos(a0), r_dim * math.sin(a0), z_dim))
            a_mid = (a0 + a1) * 0.5
            sag = -0.015 if r_dim > 1.5 else 0.0
            verts.append((r_dim * math.cos(a_mid), r_dim * math.sin(a_mid), z_dim + sag))
            verts.append((r_dim * math.cos(a1), r_dim * math.sin(a1), z_dim))

        for p in range(prof_len - 1):
            row0 = base_idx + p * 3
            row1 = base_idx + (p + 1) * 3
            v0 = p / (prof_len - 1)
            v1 = (p + 1) / (prof_len - 1)

            # Left sub-quad
            faces.append([row0, row1, row1 + 1, row0 + 1])
            uvs.append([(0.0, v0), (0.0, v1), (0.5, v1), (0.5, v0)])
            mat_indices.append(mat_id)

            # Right sub-quad
            faces.append([row0 + 1, row1 + 1, row1 + 2, row0 + 2])
            uvs.append([(0.5, v0), (0.5, v1), (1.0, v1), (1.0, v0)])
            mat_indices.append(mat_id)

    # Fine radial piping ribs along panel seams
    pipe_w = 0.02
    for i in range(num_sectors):
        ang = (2.0 * math.pi * i) / num_sectors
        cos_a = math.cos(ang)
        sin_a = math.sin(ang)
        tan_x = -sin_a * (pipe_w * 0.5)
        tan_y = cos_a * (pipe_w * 0.5)

        for p in range(prof_len - 1):
            r0_dim, z0_dim = profile[p]
            r1_dim, z1_dim = profile[p + 1]
            p0_x, p0_y = r0_dim * cos_a, r0_dim * sin_a
            p1_x, p1_y = r1_dim * cos_a, r1_dim * sin_a

            b_idx = len(verts)
            verts.append((p0_x - tan_x, p0_y - tan_y, z0_dim + 0.01))
            verts.append((p0_x + tan_x, p0_y + tan_y, z0_dim + 0.01))
            verts.append((p1_x + tan_x, p1_y + tan_y, z1_dim + 0.01))
            verts.append((p1_x - tan_x, p1_y - tan_y, z1_dim + 0.01))

            faces.append([b_idx, b_idx + 1, b_idx + 2, b_idx + 3])
            uvs.append([(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)])
            mat_indices.append(2)  # metal piping

    return _create_mesh_object(
        "Roof_Canopy_Panels", verts, faces,
        materials=[mat_yellow, mat_cream, mat_metal],
        parent=parent, uvs=uvs, material_indices=mat_indices
    )


def _build_scalloped_valance(parent, mat_red, mat_yellow, mat_cream):
    """Generate 16 prominent scalloped valance curtains readable from park camera distance."""
    verts = []
    faces = []
    uvs = []
    mat_indices = []

    r_valance = 5.25
    z_top = 4.22
    z_mid = 4.02
    scallop_drop = 0.20
    num_sectors = 16
    subdiv = 4

    for i in range(num_sectors):
        a_start = (2.0 * math.pi * i) / num_sectors
        a_end = (2.0 * math.pi * (i + 1)) / num_sectors
        mat_id = 1 if (i % 2 == 0) else 2

        base_idx = len(verts)
        for s in range(subdiv + 1):
            t = s / subdiv
            ang = a_start + t * (a_end - a_start)
            z_bot = z_mid - scallop_drop * math.sin(math.pi * t)
            ca = math.cos(ang)
            sa = math.sin(ang)
            verts.append((r_valance * ca, r_valance * sa, z_top))
            verts.append((r_valance * ca, r_valance * sa, z_bot + 0.06))
            verts.append((r_valance * ca, r_valance * sa, z_bot))

        for s in range(subdiv):
            col0 = base_idx + s * 3
            col1 = base_idx + (s + 1) * 3
            u0 = s / subdiv
            u1 = (s + 1) / subdiv

            # Upper fabric panel
            faces.append([col0, col1, col1 + 1, col0 + 1])
            uvs.append([(u0, 0.35), (u1, 0.35), (u1, 1.0), (u0, 1.0)])
            mat_indices.append(mat_id)

            # Lower red scalloped fringe trim
            faces.append([col0 + 1, col1 + 1, col1 + 2, col0 + 2])
            uvs.append([(u0, 0.0), (u1, 0.0), (u1, 0.35), (u0, 0.35)])
            mat_indices.append(0)

    return _create_mesh_object(
        "Roof_Valance_Scallops", verts, faces,
        materials=[mat_red, mat_yellow, mat_cream],
        parent=parent, uvs=uvs, material_indices=mat_indices
    )


def _build_fascia_frieze(parent, mat_timber, mat_red, mat_metal):
    """Generate prominent 0.35m tall double rim frieze fascia with gilded relief medallions."""
    r_frieze = 5.28
    z_frieze_bot = 4.20
    z_frieze_top = 4.55
    segments = 32

    verts = []
    faces = []
    uvs = []
    mat_indices = []

    for s in range(segments):
        a0 = (2.0 * math.pi * s) / segments
        a1 = (2.0 * math.pi * (s + 1)) / segments
        u0 = s / segments
        u1 = (s + 1) / segments

        b_idx = len(verts)
        # 4 height rings: lower gold molding, lower frieze, upper frieze, upper gold cornice
        for z_h in [z_frieze_bot, z_frieze_bot + 0.05, z_frieze_top - 0.05, z_frieze_top]:
            verts.append((r_frieze * math.cos(a0), r_frieze * math.sin(a0), z_h))
            verts.append((r_frieze * math.cos(a1), r_frieze * math.sin(a1), z_h))

        # Bottom gold rim
        faces.append([b_idx, b_idx + 1, b_idx + 3, b_idx + 2])
        uvs.append([(u0, 0.0), (u1, 0.0), (u1, 0.2), (u0, 0.2)])
        mat_indices.append(2)

        # Central red frieze band
        faces.append([b_idx + 2, b_idx + 3, b_idx + 5, b_idx + 4])
        uvs.append([(u0, 0.2), (u1, 0.2), (u1, 0.8), (u0, 0.8)])
        mat_indices.append(1)

        # Top gold cornice
        faces.append([b_idx + 4, b_idx + 5, b_idx + 7, b_idx + 6])
        uvs.append([(u0, 0.8), (u1, 0.8), (u1, 1.0), (u0, 1.0)])
        mat_indices.append(2)

    frieze_obj = _create_mesh_object(
        "Roof_Fascia_Frieze", verts, faces,
        materials=[mat_timber, mat_red, mat_metal],
        parent=parent, uvs=uvs, material_indices=mat_indices
    )

    # Shared Mesh for 16 Gilded Medallions
    med_mesh = bpy.data.meshes.new("Shared_Frieze_Medallion_Mesh")
    m_verts = [(0.0, 0.0, 0.0), (0.0, 0.0, 0.03)]
    m_faces = []
    m_uvs = []
    m_mat_ids = []
    m_segs = 8
    m_radius = 0.10

    for i in range(m_segs):
        ang = (2.0 * math.pi * i) / m_segs
        m_verts.append((m_radius * math.cos(ang), 0.0, m_radius * math.sin(ang)))

    for i in range(m_segs):
        i_next = (i + 1) % m_segs
        v_outer0 = 2 + i
        v_outer1 = 2 + i_next
        ang0 = (2.0 * math.pi * i) / m_segs
        ang1 = (2.0 * math.pi * (i + 1)) / m_segs
        ca0, sa0 = math.cos(ang0), math.sin(ang0)
        ca1, sa1 = math.cos(ang1), math.sin(ang1)

        # Outer gold ring tri
        m_faces.append([0, v_outer0, v_outer1])
        m_uvs.append([(0.5, 0.5), (0.5 + 0.45 * ca0, 0.5 + 0.45 * sa0), (0.5 + 0.45 * ca1, 0.5 + 0.45 * sa1)])
        m_mat_ids.append(0)

        # Center raised red boss tri
        m_faces.append([1, v_outer1, v_outer0])
        m_uvs.append([(0.5, 0.5), (0.5 + 0.45 * ca1, 0.5 + 0.45 * sa1), (0.5 + 0.45 * ca0, 0.5 + 0.45 * sa0)])
        m_mat_ids.append(1)

    med_mesh.from_pydata(m_verts, [], m_faces)
    med_mesh.update()
    m_uv_layer = med_mesh.uv_layers.new(name="UVMap")
    m_loop_idx = 0
    for f_uv in m_uvs:
        for u, v in f_uv:
            m_uv_layer.data[m_loop_idx].uv = (float(u), float(v))
            m_loop_idx += 1
    for poly, mid in zip(med_mesh.polygons, m_mat_ids):
        poly.material_index = mid

    med_mesh.materials.append(mat_metal)
    med_mesh.materials.append(mat_red)

    z_med = (z_frieze_bot + z_frieze_top) * 0.5
    for i in range(16):
        a_med = (2.0 * math.pi * (i + 0.5)) / 16
        m_obj = bpy.data.objects.new(f"Frieze_Medallion_{i:02d}", med_mesh)
        bpy.context.collection.objects.link(m_obj)
        m_obj.parent = parent
        m_obj.location = ((r_frieze + 0.015) * math.cos(a_med), (r_frieze + 0.015) * math.sin(a_med), z_med)
        m_obj.rotation_euler = (0.0, 0.0, a_med - math.pi * 0.5)

    return frieze_obj


def _build_timber_ceiling(parent, mat_timber):
    """Generate 16 radial structural timber rafters under the canopy."""
    verts = []
    faces = []
    uvs = []

    r_inner = 0.85
    r_outer = 5.20
    z_inner = 4.30
    z_outer = 4.22
    beam_w = 0.08
    beam_d = 0.10

    for i in range(16):
        ang = (2.0 * math.pi * i) / 16
        cos_a = math.cos(ang)
        sin_a = math.sin(ang)
        tan_x = -sin_a * (beam_w * 0.5)
        tan_y = cos_a * (beam_w * 0.5)

        p0_x = r_inner * cos_a
        p0_y = r_inner * sin_a
        p1_x = r_outer * cos_a
        p1_y = r_outer * sin_a

        b_idx = len(verts)
        verts.append((p0_x - tan_x, p0_y - tan_y, z_inner - beam_d))
        verts.append((p0_x + tan_x, p0_y + tan_y, z_inner - beam_d))
        verts.append((p1_x + tan_x, p1_y + tan_y, z_outer - beam_d))
        verts.append((p1_x - tan_x, p1_y - tan_y, z_outer - beam_d))
        verts.append((p0_x - tan_x, p0_y - tan_y, z_inner))
        verts.append((p0_x + tan_x, p0_y + tan_y, z_inner))
        verts.append((p1_x + tan_x, p1_y + tan_y, z_outer))
        verts.append((p1_x - tan_x, p1_y - tan_y, z_outer))

        faces.append([b_idx, b_idx + 1, b_idx + 2, b_idx + 3])
        uvs.append([(0.0, 0.0), (0.2, 0.0), (0.2, 4.0), (0.0, 4.0)])
        faces.append([b_idx, b_idx + 3, b_idx + 7, b_idx + 4])
        uvs.append([(0.0, 0.0), (4.0, 0.0), (4.0, 0.2), (0.0, 0.2)])
        faces.append([b_idx + 1, b_idx + 5, b_idx + 6, b_idx + 2])
        uvs.append([(0.0, 0.0), (0.2, 0.0), (0.2, 4.0), (0.0, 4.0)])

    return _create_mesh_object(
        "Roof_Ceiling_Structure", verts, faces,
        materials=mat_timber, parent=parent, uvs=uvs
    )


def _build_gold_finial(parent, mat_metal):
    """Generate Victorian spire turnstile apex gold finial extending up to Z=6.85m with non-degenerate caps."""
    return _build_cylinder(
        "Roof_Finial_Spire",
        radius_bottom=0.22, radius_top=0.02, height=0.75,
        segments=12, z_base=6.05, material=mat_metal, parent=parent,
        uv_scale=(1.0, 3.0)
    )


def _build_central_shaft(parent, mat_timber, mat_red, mat_metal, mat_dark):
    """Generate static central column mast with carved timber pilasters and decorative panels."""
    verts = []
    faces = []
    uvs = []
    mat_indices = []

    r_shaft = 0.85
    z_bot = 0.40
    z_top = 4.25
    segments = 16

    for s in range(segments):
        a0 = (2.0 * math.pi * s) / segments
        a1 = (2.0 * math.pi * (s + 1)) / segments
        u0 = s / segments
        u1 = (s + 1) / segments
        mat_id = 1 if (s % 2 == 0) else 0

        b_idx = len(verts)
        for z_h in [z_bot, z_bot + 0.25, z_top - 0.25, z_top]:
            verts.append((r_shaft * math.cos(a0), r_shaft * math.sin(a0), z_h))
            verts.append((r_shaft * math.cos(a1), r_shaft * math.sin(a1), z_h))

        # Bottom collar (metal)
        faces.append([b_idx, b_idx + 1, b_idx + 3, b_idx + 2])
        uvs.append([(u0, 0.0), (u1, 0.0), (u1, 0.5), (u0, 0.5)])
        mat_indices.append(2)

        # Center mirror / decorative panel
        faces.append([b_idx + 2, b_idx + 3, b_idx + 5, b_idx + 4])
        uvs.append([(u0, 0.5), (u1, 0.5), (u1, 3.5), (u0, 3.5)])
        mat_indices.append(mat_id)

        # Top capital molding (metal)
        faces.append([b_idx + 4, b_idx + 5, b_idx + 7, b_idx + 6])
        uvs.append([(u0, 3.5), (u1, 3.5), (u1, 4.0), (u0, 4.0)])
        mat_indices.append(2)

    return _create_mesh_object(
        "Central_Column_Mast", verts, faces,
        materials=[mat_timber, mat_red, mat_metal, mat_dark],
        parent=parent, uvs=uvs, material_indices=mat_indices
    )


# ============================================================================
# Deck, Stepped Base, Walk-In Extensions, and Perimeter Columns
# ============================================================================

def _build_deck_and_base(carousel_root, rotor_root, mat_deck, mat_timber, mat_red, mat_yellow, mat_metal):
    """Generate foundation skirt, stepped deck, rotating wood floor, and static walk-in extensions."""
    # 1. Foundation Ground Skirt (Z: 0.00 to 0.16m, Radius 5.60m)
    skirt_verts = []
    skirt_faces = []
    skirt_uvs = []
    skirt_mat_ids = []
    skirt_segs = 32

    for s in range(skirt_segs):
        a0 = (2.0 * math.pi * s) / skirt_segs
        a1 = (2.0 * math.pi * (s + 1)) / skirt_segs
        u0 = s / skirt_segs
        u1 = (s + 1) / skirt_segs
        mat_id = 0 if (s % 2 == 0) else 1

        b_idx = len(skirt_verts)
        skirt_verts.append((5.60 * math.cos(a0), 5.60 * math.sin(a0), 0.0))
        skirt_verts.append((5.60 * math.cos(a1), 5.60 * math.sin(a1), 0.0))
        skirt_verts.append((5.60 * math.cos(a1), 5.60 * math.sin(a1), 0.16))
        skirt_verts.append((5.60 * math.cos(a0), 5.60 * math.sin(a0), 0.16))

        skirt_faces.append([b_idx, b_idx + 1, b_idx + 2, b_idx + 3])
        skirt_uvs.append([(u0, 0.0), (u1, 0.0), (u1, 1.0), (u0, 1.0)])
        skirt_mat_ids.append(mat_id)

    _create_mesh_object(
        "Foundation_Skirt", skirt_verts, skirt_faces,
        materials=[mat_red, mat_yellow],
        parent=carousel_root, uvs=skirt_uvs, material_indices=skirt_mat_ids
    )

    # 2. Middle Step & Static Outer Deck Border (Z: 0.16 to 0.40m, R: 4.85 to 5.40m)
    step_verts, step_faces, step_uvs = _build_annulus_sector(
        r_inner=4.85, r_outer=5.40, z_floor=0.16, z_ceil=0.40,
        angle_start=0.0, angle_end=2.0 * math.pi, segments=32
    )
    _create_mesh_object(
        "Static_Deck_Border", step_verts, step_faces,
        materials=mat_timber, parent=carousel_root, uvs=step_uvs
    )

    # 3. Rotating Wood Deck Floor (Child of RotorRoot, R: 0.88 to 4.85m, Z=0.0 in RotorRoot)
    floor_verts = [(0.0, 0.0, 0.0)]
    floor_faces = []
    floor_uvs = []
    floor_mat_ids = []
    floor_segs = 32

    rings = [0.88, 2.00, 3.60, 4.85]
    for r_val in rings:
        for s in range(floor_segs):
            ang = (2.0 * math.pi * s) / floor_segs
            floor_verts.append((r_val * math.cos(ang), r_val * math.sin(ang), 0.0))

    for r_idx in range(len(rings) - 1):
        r0_base = 1 + r_idx * floor_segs
        r1_base = 1 + (r_idx + 1) * floor_segs
        for s in range(floor_segs):
            s_next = (s + 1) % floor_segs
            v0 = r0_base + s
            v1 = r0_base + s_next
            v2 = r1_base + s_next
            v3 = r1_base + s
            floor_faces.append([v0, v1, v2, v3])
            floor_uvs.append([
                (floor_verts[v0][0] * 0.4, floor_verts[v0][1] * 0.4),
                (floor_verts[v1][0] * 0.4, floor_verts[v1][1] * 0.4),
                (floor_verts[v2][0] * 0.4, floor_verts[v2][1] * 0.4),
                (floor_verts[v3][0] * 0.4, floor_verts[v3][1] * 0.4),
            ])
            floor_mat_ids.append(0)

    _create_mesh_object(
        "Rotating_Deck_Floor", floor_verts, floor_faces,
        materials=mat_deck, parent=rotor_root, uvs=floor_uvs, material_indices=floor_mat_ids
    )

    # 4. Static Timber Walk-In Deck Extensions
    # Connects circular border (R=5.40m) to entrance/exit interfaces at Authored [+/-4.0, 0.4, -6.0]
    # (Blender [+/-4.0, 6.0, 0.4]), width 1.6m, stopping exactly at boundary edge Y=6.0m (Authored Z=-6.0m).
    ext_verts = []
    ext_faces = []
    ext_uvs = []
    r_static_outer = 5.40
    y_boundary = 6.0  # Authored Z = -6.0m
    z_deck = 0.40     # Authored Y = 0.40m
    num_y_subdiv = 4
    rim = [(r_static_outer * math.cos(i * math.pi / 16),
            r_static_outer * math.sin(i * math.pi / 16)) for i in range(17)]

    def border_y(x):
        for (ax, ay), (bx, by) in zip(rim, rim[1:]):
            if bx <= x <= ax and ax != bx:
                return ay + (by - ay) * (x - ax) / (bx - ax)
        raise ValueError("Walk-in interface is outside the actual deck rim")

    for x_center in [4.0, -4.0]:
        x_min = x_center - 0.8
        x_max = x_center + 0.8
        # Include every polygon corner so the extension shares the real deck edge.
        xs = sorted(set([x_min, x_max] + [x for x, y in rim if x_min < x < x_max]))
        num_x_subdiv = len(xs) - 1
        grid_base = len(ext_verts)
        for cur_x in xs:
            y_inner = border_y(cur_x)

            for iy in range(num_y_subdiv + 1):
                t_y = iy / num_y_subdiv
                cur_y = y_inner + t_y * (y_boundary - y_inner)
                ext_verts.append((cur_x, cur_y, z_deck))

        # Top floor quads
        for ix in range(num_x_subdiv):
            col0 = grid_base + ix * (num_y_subdiv + 1)
            col1 = grid_base + (ix + 1) * (num_y_subdiv + 1)
            for iy in range(num_y_subdiv):
                v0 = col0 + iy
                v1 = col1 + iy
                v2 = col1 + iy + 1
                v3 = col0 + iy + 1
                ext_faces.append([v0, v1, v2, v3])
                ext_uvs.append([
                    (ext_verts[v0][0] * 0.5, ext_verts[v0][1] * 0.5),
                    (ext_verts[v1][0] * 0.5, ext_verts[v1][1] * 0.5),
                    (ext_verts[v2][0] * 0.5, ext_verts[v2][1] * 0.5),
                    (ext_verts[v3][0] * 0.5, ext_verts[v3][1] * 0.5),
                ])

        # Vertical side skirts down to ground Z=0.0
        # Outer boundary face at Y = y_boundary (Authored Z = -6.0)
        b_idx_bound = len(ext_verts)
        ext_verts.append((x_min, y_boundary, 0.0))
        ext_verts.append((x_max, y_boundary, 0.0))
        ext_verts.append((x_max, y_boundary, z_deck))
        ext_verts.append((x_min, y_boundary, z_deck))
        ext_faces.append([b_idx_bound, b_idx_bound + 1, b_idx_bound + 2, b_idx_bound + 3])
        ext_uvs.append([(0.0, 0.0), (1.6, 0.0), (1.6, 0.4), (0.0, 0.4)])

        # Left flank skirt (at x_min)
        y_in_left = border_y(x_min)
        b_idx_left = len(ext_verts)
        ext_verts.append((x_min, y_in_left, 0.0))
        ext_verts.append((x_min, y_boundary, 0.0))
        ext_verts.append((x_min, y_boundary, z_deck))
        ext_verts.append((x_min, y_in_left, z_deck))
        ext_faces.append([b_idx_left, b_idx_left + 1, b_idx_left + 2, b_idx_left + 3])
        ext_uvs.append([(0.0, 0.0), ((y_boundary - y_in_left), 0.0), ((y_boundary - y_in_left), 0.4), (0.0, 0.4)])

        # Right flank skirt (at x_max)
        y_in_right = border_y(x_max)
        b_idx_right = len(ext_verts)
        ext_verts.append((x_max, y_boundary, 0.0))
        ext_verts.append((x_max, y_in_right, 0.0))
        ext_verts.append((x_max, y_in_right, z_deck))
        ext_verts.append((x_max, y_boundary, z_deck))
        ext_faces.append([b_idx_right, b_idx_right + 1, b_idx_right + 2, b_idx_right + 3])
        ext_uvs.append([(0.0, 0.0), ((y_boundary - y_in_right), 0.0), ((y_boundary - y_in_right), 0.4), (0.0, 0.4)])

    _create_mesh_object(
        "Static_Deck_Extensions", ext_verts, ext_faces,
        materials=mat_timber, parent=carousel_root, uvs=ext_uvs
    )


def _build_fixed_roof_columns(carousel_root, mat_red, mat_metal, mat_timber):
    """Generate 8 outer classical support columns at R=5.05m flanking walking corridors."""
    col_mesh = bpy.data.meshes.new("Shared_Roof_Column_Mesh")
    c_verts = []
    c_faces = []
    c_uvs = []
    c_mat_ids = []

    # Plinth base: square box at Z: 0.40 to 0.60
    b_half = 0.09
    c_verts.extend([
        (-b_half, -b_half, 0.40), (b_half, -b_half, 0.40), (b_half, b_half, 0.40), (-b_half, b_half, 0.40),
        (-b_half, -b_half, 0.60), (b_half, -b_half, 0.60), (b_half, b_half, 0.60), (-b_half, b_half, 0.60),
    ])
    for f in [
        [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 6, 7]
    ]:
        c_faces.append(f)
        c_uvs.append([(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)])
        c_mat_ids.append(0)

    # Column fluted cylindrical shaft: Z: 0.60 to 3.85m, radius 0.065m
    shaft_base = len(c_verts)
    col_segs = 8
    for i in range(col_segs):
        ang = (2.0 * math.pi * i) / col_segs
        ca = math.cos(ang) * 0.065
        sa = math.sin(ang) * 0.065
        c_verts.append((ca, sa, 0.60))
        c_verts.append((ca, sa, 3.85))

    for i in range(col_segs):
        i_next = (i + 1) % col_segs
        v0 = shaft_base + i * 2
        v1 = v0 + 1
        v2 = shaft_base + i_next * 2 + 1
        v3 = shaft_base + i_next * 2
        c_faces.append([v0, v1, v2, v3])
        c_uvs.append([(i / col_segs, 0.0), (i / col_segs, 3.0), ((i + 1) / col_segs, 3.0), ((i + 1) / col_segs, 0.0)])
        c_mat_ids.append(0)

    # Corinthian / Victorian Capital: Z: 3.85 to 4.16m
    cap_base = len(c_verts)
    for i in range(col_segs):
        ang = (2.0 * math.pi * i) / col_segs
        c_verts.append((0.075 * math.cos(ang), 0.075 * math.sin(ang), 3.85))
        c_verts.append((0.130 * math.cos(ang), 0.130 * math.sin(ang), 4.16))

    for i in range(col_segs):
        i_next = (i + 1) % col_segs
        c_faces.append([cap_base + i * 2, cap_base + i * 2 + 1, cap_base + i_next * 2 + 1, cap_base + i_next * 2])
        c_uvs.append([(0.0, 0.0), (0.0, 1.0), (1.0, 1.0), (1.0, 0.0)])
        c_mat_ids.append(1)

    col_mesh.from_pydata(c_verts, [], c_faces)
    col_mesh.update()
    col_uv_layer = col_mesh.uv_layers.new(name="UVMap")
    loop_idx = 0
    for f_uv in c_uvs:
        for u, v in f_uv:
            col_uv_layer.data[loop_idx].uv = (float(u), float(v))
            loop_idx += 1
    for poly, mid in zip(col_mesh.polygons, c_mat_ids):
        poly.material_index = mid

    col_mesh.materials.append(mat_red)
    col_mesh.materials.append(mat_metal)
    col_mesh.materials.append(mat_timber)

    # Place 8 columns around perimeter at R = 5.05m flanking walk-in paths
    col_angles = [12.0, 62.0, 105.0, 168.0, 205.0, 250.0, 290.0, 335.0]
    for c_idx, deg in enumerate(col_angles):
        c_ang = math.radians(deg)
        cx = 5.05 * math.cos(c_ang)
        cy = 5.05 * math.sin(c_ang)

        col_obj = bpy.data.objects.new(f"Roof_Column_{c_idx:02d}", col_mesh)
        bpy.context.collection.objects.link(col_obj)
        col_obj.parent = carousel_root
        col_obj.location = (cx, cy, 0.0)
        col_obj.rotation_euler = (0.0, 0.0, c_ang)


def _build_perimeter_railings(carousel_root, mat_metal):
    """Generate perimeter safety railings with precise open corridors for walk-in deck extensions."""
    verts = []
    faces = []
    uvs = []

    r_rail = 5.15
    z_rail_mid = 0.85
    z_rail_top = 1.05
    num_spans = 32

    # Circular railing segments excluding walk-in corridors
    for i in range(num_spans):
        a0 = (2.0 * math.pi * i) / num_spans
        a1 = (2.0 * math.pi * (i + 1)) / num_spans
        mid_ang = (a0 + a1) * 0.5
        mid_x = r_rail * math.cos(mid_ang)
        mid_y = r_rail * math.sin(mid_ang)

        # Omit spans within entrance corridor (X: 3.1..4.9) and exit corridor (X: -4.9..-3.1)
        if (3.1 <= mid_x <= 4.9 and mid_y > 0.0) or (-4.9 <= mid_x <= -3.1 and mid_y > 0.0):
            continue

        p0_x, p0_y = r_rail * math.cos(a0), r_rail * math.sin(a0)
        p1_x, p1_y = r_rail * math.cos(a1), r_rail * math.sin(a1)

        # Top rail
        b_idx = len(verts)
        verts.extend([(p0_x, p0_y, z_rail_top - 0.02), (p1_x, p1_y, z_rail_top - 0.02),
                      (p1_x, p1_y, z_rail_top + 0.02), (p0_x, p0_y, z_rail_top + 0.02)])
        faces.append([b_idx, b_idx + 1, b_idx + 2, b_idx + 3])
        uvs.append([(0.0, 0.0), (1.0, 0.0), (1.0, 0.1), (0.0, 0.1)])

        # Mid rail
        b_idx2 = len(verts)
        verts.extend([(p0_x, p0_y, z_rail_mid - 0.02), (p1_x, p1_y, z_rail_mid - 0.02),
                      (p1_x, p1_y, z_rail_mid + 0.02), (p0_x, p0_y, z_rail_mid + 0.02)])
        faces.append([b_idx2, b_idx2 + 1, b_idx2 + 2, b_idx2 + 3])
        uvs.append([(0.0, 0.0), (1.0, 0.0), (1.0, 0.1), (0.0, 0.1)])

    # Flank guide railings along walk-in deck extension borders
    r_static = 5.40
    y_bound = 6.0
    for xc in [4.0, -4.0]:
        for edge_x in [xc - 0.8, xc + 0.8]:
            y_start = math.sqrt(max(0.0, r_static * r_static - edge_x * edge_x))
            b_top = len(verts)
            verts.extend([(edge_x, y_start, z_rail_top - 0.02), (edge_x, y_bound, z_rail_top - 0.02),
                          (edge_x, y_bound, z_rail_top + 0.02), (edge_x, y_start, z_rail_top + 0.02)])
            faces.append([b_top, b_top + 1, b_top + 2, b_top + 3])
            uvs.append([(0.0, 0.0), (y_bound - y_start, 0.0), (y_bound - y_start, 0.1), (0.0, 0.1)])

            b_mid = len(verts)
            verts.extend([(edge_x, y_start, z_rail_mid - 0.02), (edge_x, y_bound, z_rail_mid - 0.02),
                          (edge_x, y_bound, z_rail_mid + 0.02), (edge_x, y_start, z_rail_mid + 0.02)])
            faces.append([b_mid, b_mid + 1, b_mid + 2, b_mid + 3])
            uvs.append([(0.0, 0.0), (y_bound - y_start, 0.0), (y_bound - y_start, 0.1), (0.0, 0.1)])

    return _create_mesh_object(
        "Perimeter_Railings", verts, faces,
        materials=mat_metal, parent=carousel_root, uvs=uvs
    )


def build_carousel(materials):
    """Build the complete 16-seat Carousel BODY model asset.

    Args:
        materials: dict mapping ready Blender material keys:
                   'timber', 'deck', 'metal', 'fabric_yellow',
                   'fabric_cream', 'red', 'horse', 'dark'.

    Returns:
        bpy.types.Object: The root Blender object 'CarouselRoot'.
    """
    mat_timber = materials.get("timber")
    mat_deck = materials.get("deck")
    mat_metal = materials.get("metal")
    mat_fabric_yellow = materials.get("fabric_yellow")
    mat_fabric_cream = materials.get("fabric_cream")
    mat_red = materials.get("red")
    mat_horse = materials.get("horse")
    mat_dark = materials.get("dark")

    # 1. Root Hierarchy & Sockets
    carousel_root = _create_empty("CarouselRoot", location=(0.0, 0.0, 0.0))

    loc_rotor = to_blender(0.0, 0.4, 0.0)
    deck_root = _create_empty("DeckRoot", parent=carousel_root, location=loc_rotor)
    rotor_root = _create_empty("RotorRoot", parent=carousel_root, location=loc_rotor)

    # Static boundary interface empties
    _create_empty("EntranceBuildingRoot", parent=carousel_root, location=to_blender(4.0, 0.0, -8.0))
    _create_empty("ExitBuildingRoot", parent=carousel_root, location=to_blender(-4.0, 0.0, -8.0))
    _create_empty("EntranceDeckInterface", parent=carousel_root, location=to_blender(4.0, 0.4, -6.0))
    _create_empty("ExitDeckInterface", parent=carousel_root, location=to_blender(-4.0, 0.4, -6.0))

    # 2. Frozen 16 Seat Anchors (Seat_00..Seat_15) & Rotating Horses
    seat_datums = [
        (0,  "outer",     0,  4200,  90.0),
        (1,  "inner",  1033,  2494, 112.5),
        (2,  "outer",  2970,  2970, 135.0),
        (3,  "inner",  2494,  1033, 157.5),
        (4,  "outer",  4200,     0, 180.0),
        (5,  "inner",  2494, -1033, 202.5),
        (6,  "outer",  2970, -2970, 225.0),
        (7,  "inner",  1033, -2494, 247.5),
        (8,  "outer",     0, -4200, 270.0),
        (9,  "inner", -1033, -2494, 292.5),
        (10, "outer", -2970, -2970, 315.0),
        (11, "inner", -2494, -1033, 337.5),
        (12, "outer", -4200,     0, 360.0),
        (13, "inner", -2494,  1033, 382.5),
        (14, "outer", -2970,  2970, 405.0),
        (15, "inner", -1033,  2494, 427.5),
    ]

    horse_mesh_outer = _build_sculpted_horse_mesh("Horse_Mesh_Outer", pose_prance=True)
    horse_mesh_inner = _build_sculpted_horse_mesh("Horse_Mesh_Inner", pose_prance=False)

    for h_mesh in [horse_mesh_outer, horse_mesh_inner]:
        h_mesh.materials.append(mat_horse)
        h_mesh.materials.append(mat_red)
        h_mesh.materials.append(mat_metal)
        h_mesh.materials.append(mat_dark)

    for s_idx, tier, x_mm, z_mm, yaw_deg in seat_datums:
        x_m = x_mm / 1000.0
        z_m = z_mm / 1000.0
        loc_seat_blender = (x_m, -z_m, 1.2)
        rot_seat_blender = (0.0, 0.0, math.radians(yaw_deg))

        _create_empty(
            f"Seat_{s_idx:02d}",
            parent=rotor_root,
            location=loc_seat_blender,
            rotation=rot_seat_blender
        )

        chosen_mesh = horse_mesh_outer if (tier == "outer") else horse_mesh_inner
        horse_obj = bpy.data.objects.new(f"Horse_{s_idx:02d}", chosen_mesh)
        bpy.context.collection.objects.link(horse_obj)
        horse_obj.parent = rotor_root
        horse_obj.location = (x_m, -z_m, 0.0)
        horse_obj.rotation_euler = rot_seat_blender

    # 3. Deck, Stepped Base, and Static Walk-In Extensions
    _build_deck_and_base(
        carousel_root, rotor_root,
        mat_deck=mat_deck, mat_timber=mat_timber, mat_red=mat_red,
        mat_yellow=mat_fabric_yellow, mat_metal=mat_metal
    )

    # 4. Central Column Core
    _build_central_shaft(
        carousel_root,
        mat_timber=mat_timber, mat_red=mat_red, mat_metal=mat_metal, mat_dark=mat_dark
    )

    # 5. Fixed Roof Canopy, Valance, Frieze, Ceiling & Finial
    _build_16_canopy_panels(carousel_root, mat_yellow=mat_fabric_yellow, mat_cream=mat_fabric_cream, mat_metal=mat_metal)
    _build_scalloped_valance(carousel_root, mat_red=mat_red, mat_yellow=mat_fabric_yellow, mat_cream=mat_fabric_cream)
    _build_fascia_frieze(carousel_root, mat_timber=mat_timber, mat_red=mat_red, mat_metal=mat_metal)
    _build_timber_ceiling(carousel_root, mat_timber=mat_timber)
    _build_gold_finial(carousel_root, mat_metal=mat_metal)

    # 6. Roof Support Columns & Perimeter Railings
    _build_fixed_roof_columns(
        carousel_root,
        mat_red=mat_red, mat_metal=mat_metal, mat_timber=mat_timber
    )
    _build_perimeter_railings(carousel_root, mat_metal=mat_metal)

    return carousel_root


build = build_carousel
