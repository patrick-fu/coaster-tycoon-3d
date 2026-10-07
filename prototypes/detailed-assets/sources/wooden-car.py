"""Wooden roller coaster train car asset generator.

Implements the detailed-asset authoring contract for an independent,
PTC-inspired four-passenger wooden coaster car with layered chassis framing,
complete road/guide/upstop bogie assemblies, contoured vinyl seating,
articulated lap bar restraints, and export-stable UV mapping.
"""

import math
import bpy
import mathutils


def _create_empty(name, location, parent=None, rotation=None):
    """Create a named reference or articulation Empty node."""
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = "PLAIN_AXES"
    empty.empty_display_size = 0.2
    empty.location = mathutils.Vector(location)
    if rotation:
        empty.rotation_euler = mathutils.Euler(rotation, "XYZ")
    if parent:
        empty.parent = parent
    bpy.context.scene.collection.objects.link(empty)
    return empty


def _apply_box_uvs(mesh):
    """Generate planar-box UV coordinates for export-stable texture mapping."""
    if not mesh.uv_layers:
        uv_layer = mesh.uv_layers.new(name="UVMap")
    else:
        uv_layer = mesh.uv_layers.active
    uv_data = uv_layer.data

    for poly in mesh.polygons:
        norm = poly.normal
        nx, ny, nz = abs(norm.x), abs(norm.y), abs(norm.z)
        for loop_idx in poly.loop_indices:
            vert_idx = mesh.loops[loop_idx].vertex_index
            co = mesh.vertices[vert_idx].co
            if nz >= nx and nz >= ny:
                u, v = co.x, co.y
            elif ny >= nx:
                u, v = co.x, co.z
            else:
                u, v = co.y, co.z
            uv_data[loop_idx].uv = (u * 0.5 + 0.5, v * 0.5 + 0.5)


def _create_mesh_object(name, verts, faces, material=None, parent=None, location=(0, 0, 0)):
    """Assemble a Blender mesh object with polygons, UVs and material binding."""
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    _apply_box_uvs(mesh)

    obj = bpy.data.objects.new(name, mesh)
    obj.location = mathutils.Vector(location)
    if parent:
        obj.parent = parent
    bpy.context.scene.collection.objects.link(obj)

    if material is not None:
        obj.data.materials.append(material)

    return obj


def _box_mesh(size, offset=(0, 0, 0)):
    """Return vertices and quad faces for an axis-aligned box."""
    sx, sy, sz = size[0] * 0.5, size[1] * 0.5, size[2] * 0.5
    ox, oy, oz = offset
    verts = [
        (ox - sx, oy - sy, oz - sz),
        (ox + sx, oy - sy, oz - sz),
        (ox + sx, oy + sy, oz - sz),
        (ox - sx, oy + sy, oz - sz),
        (ox - sx, oy - sy, oz + sz),
        (ox + sx, oy - sy, oz + sz),
        (ox + sx, oy + sy, oz + sz),
        (ox - sx, oy + sy, oz + sz),
    ]
    faces = [
        (0, 3, 2, 1),  # bottom (-Z)
        (4, 5, 6, 7),  # top (+Z)
        (0, 1, 5, 4),  # front (-Y)
        (2, 3, 7, 6),  # back (+Y)
        (0, 4, 7, 3),  # left (-X)
        (1, 2, 6, 5),  # right (+X)
    ]
    return verts, faces


def _cylinder_mesh(radius, length, segments=16, axis="X", offset=(0, 0, 0)):
    """Return vertices and faces for a cylinder oriented along X, Y, or Z."""
    ox, oy, oz = offset
    half = length * 0.5
    verts = []
    for side in (-half, half):
        for i in range(segments):
            angle = (2.0 * math.pi * i) / segments
            c, s = math.cos(angle) * radius, math.sin(angle) * radius
            if axis == "X":
                verts.append((ox + side, oy + c, oz + s))
            elif axis == "Y":
                verts.append((ox + c, oy + side, oz + s))
            else:
                verts.append((ox + c, oy + s, oz + side))

    faces = []
    # Tube mantle
    for i in range(segments):
        nxt = (i + 1) % segments
        faces.append((i, nxt, segments + nxt, segments + i))
    # End caps
    cap1 = [i for i in reversed(range(segments))]
    cap2 = [segments + i for i in range(segments)]
    faces.append(cap1)
    faces.append(cap2)
    if axis == "Y":
        faces = [tuple(reversed(face)) for face in faces]
    return verts, faces


def _combine_meshes(mesh_list):
    """Combine multiple (verts, faces) tuples into a unified mesh definition."""
    combined_verts = []
    combined_faces = []
    vert_offset = 0
    for verts, faces in mesh_list:
        combined_verts.extend(verts)
        for face in faces:
            combined_faces.append([idx + vert_offset for idx in face])
        vert_offset += len(verts)
    return combined_verts, combined_faces


def _build_sculpted_tub():
    """Build contoured wooden body shell with closed rounded prow cowl and recessed seating tubs."""
    # Tub outer cross-section profile stations from front (-Y) to rear (+Y)
    profiles = [
        # y_pos, z_base, z_top, x_base, x_top, is_closed_deck
        (-1.28, 0.34, 0.60, 0.34, 0.46, True),   # Blunt curved prow tip
        (-1.18, 0.32, 0.68, 0.44, 0.58, True),   # Forward nose curve
        (-0.95, 0.30, 0.77, 0.50, 0.66, True),   # Forward cowl hood deck
        (-0.70, 0.28, 0.84, 0.54, 0.68, False),  # Front dashboard bulkhead
        (-0.40, 0.28, 0.77, 0.54, 0.68, False),  # Row 1 passenger tub cutout
        (0.00, 0.28, 0.83, 0.54, 0.68, False),   # Mid divider bulkhead
        (0.40, 0.28, 0.77, 0.54, 0.68, False),   # Row 2 passenger tub cutout
        (0.86, 0.28, 0.84, 0.54, 0.68, False),   # Rear seat bulkhead
        (1.18, 0.30, 0.78, 0.48, 0.62, True),   # Rear curved fairing
        (1.28, 0.34, 0.66, 0.36, 0.48, True),   # Rear tail cap
    ]

    all_verts = []
    all_faces = []

    # Build 8-point rings for refined roundness: bottom-L, bottom-R, mid-R, top-R, top-L, mid-L
    for y_pos, z_base, z_top, x_base, x_top, _ in profiles:
        z_mid = (z_base + z_top) * 0.48
        x_mid = (x_base + x_top) * 0.52
        ring = [
            (-x_base, y_pos, z_base),
            (x_base, y_pos, z_base),
            (x_mid, y_pos, z_mid),
            (x_top, y_pos, z_top),
            (-x_top, y_pos, z_top),
            (-x_mid, y_pos, z_mid),
        ]
        all_verts.extend(ring)

    num_rings = len(profiles)
    for r in range(num_rings - 1):
        c0 = r * 6
        c1 = (r + 1) * 6
        # Bottom panel
        all_faces.append((c0 + 0, c1 + 0, c1 + 1, c0 + 1))
        # Right lower panel
        all_faces.append((c0 + 1, c1 + 1, c1 + 2, c0 + 2))
        # Right upper panel
        all_faces.append((c0 + 2, c1 + 2, c1 + 3, c0 + 3))
        # Left upper panel
        all_faces.append((c0 + 4, c1 + 4, c1 + 5, c0 + 5))
        # Left lower panel
        all_faces.append((c0 + 5, c1 + 5, c1 + 0, c0 + 0))

        # Closed top hood deck for nose stations and rear fairing
        if profiles[r][5] and profiles[r + 1][5]:
            all_faces.append((c0 + 3, c1 + 3, c1 + 4, c0 + 4))

    # Prow front cap (Y = -1.28) and rear tail cap (Y = 1.28)
    c_front = 0
    all_faces.append((c_front + 0, c_front + 1, c_front + 2, c_front + 3, c_front + 4, c_front + 5))
    c_back = (num_rings - 1) * 6
    all_faces.append((c_back + 5, c_back + 4, c_back + 3, c_back + 2, c_back + 1, c_back + 0))

    # Continuous nose cowl closure connecting station 2 to station 3 dashboard
    c2 = 2 * 6
    c3 = 3 * 6
    all_faces.append((c2 + 3, c3 + 3, c3 + 4, c2 + 4))

    # Rear fairing deck closure connecting station 7 bulkhead to station 8
    c7 = 7 * 6
    c8 = 8 * 6
    all_faces.append((c7 + 3, c8 + 3, c8 + 4, c7 + 4))

    # Interior structural bulkheads, cockpit coaming lip and floor
    internal_parts = [
        # Main interior tongue-and-groove floor
        _box_mesh((1.04, 2.14, 0.04), offset=(0, 0.02, 0.28)),
        # Front dash bulkhead with instrument ledge
        _box_mesh((1.12, 0.06, 0.54), offset=(0, -0.71, 0.55)),
        # Center seat divider partition
        _box_mesh((1.14, 0.06, 0.54), offset=(0, 0.01, 0.55)),
        # Rear seat back bulkhead
        _box_mesh((1.12, 0.06, 0.54), offset=(0, 0.85, 0.55)),
        # Cockpit side gunwale coaming lips (Left & Right)
        _box_mesh((0.04, 1.56, 0.03), offset=(-0.68, 0.07, 0.78)),
        _box_mesh((0.04, 1.56, 0.03), offset=(0.68, 0.07, 0.78)),
    ]
    interior_verts, interior_faces = _combine_meshes(internal_parts)

    return _combine_meshes([((all_verts, all_faces)), (interior_verts, interior_faces)])


def _build_timber_side_inserts():
    """Build recessed varnished timber flank panels for classic coachwork aesthetics."""
    side_panels = [
        # Left side timber insert panels (Row 1 and Row 2)
        _box_mesh((0.02, 0.60, 0.32), offset=(-0.67, -0.38, 0.56)),
        _box_mesh((0.02, 0.60, 0.32), offset=(-0.67, 0.42, 0.56)),
        # Right side timber insert panels (Row 1 and Row 2)
        _box_mesh((0.02, 0.60, 0.32), offset=(0.67, -0.38, 0.56)),
        _box_mesh((0.02, 0.60, 0.32), offset=(0.67, 0.42, 0.56)),
    ]
    return _combine_meshes(side_panels)


def _build_decorative_trim():
    """Build brass and cream accents: grab rails, cowl bumper, crest, and panel moldings."""
    trim_components = [
        # Front rounded tubular bumper bar
        _cylinder_mesh(0.025, 1.02, segments=14, axis="X", offset=(0, -1.26, 0.38)),
        # Front decorative center shield crest badge
        _box_mesh((0.16, 0.03, 0.20), offset=(0, -1.27, 0.50)),
        # Cowl nose center spear trim molding
        _box_mesh((0.03, 0.36, 0.02), offset=(0, -1.08, 0.74)),
        # Left top rim handrail
        _cylinder_mesh(0.018, 2.12, segments=12, axis="Y", offset=(-0.69, 0.04, 0.81)),
        # Right top rim handrail
        _cylinder_mesh(0.018, 2.12, segments=12, axis="Y", offset=(0.69, 0.04, 0.81)),
        # Front dashboard passenger grab bar
        _cylinder_mesh(0.018, 0.96, segments=12, axis="X", offset=(0, -0.67, 0.80)),
        # Center partition passenger grab bar
        _cylinder_mesh(0.018, 0.96, segments=12, axis="X", offset=(0, 0.05, 0.80)),
        # Rear tailgate grab rail
        _cylinder_mesh(0.020, 0.98, segments=12, axis="X", offset=(0, 1.24, 0.77)),
        # Flank timber panel bead trim moldings (L & R)
        _box_mesh((0.025, 0.64, 0.02), offset=(-0.68, -0.38, 0.73)),
        _box_mesh((0.025, 0.64, 0.02), offset=(-0.68, 0.42, 0.73)),
        _box_mesh((0.025, 0.64, 0.02), offset=(0.68, -0.38, 0.73)),
        _box_mesh((0.025, 0.64, 0.02), offset=(0.68, 0.42, 0.73)),
    ]
    return _combine_meshes(trim_components)


def _build_chassis_frame():
    """Build steel chassis stringers, crossmembers, brake fin, and drawbar tongues."""
    frame_parts = [
        # Longitudinal steel channel stringers (Left & Right)
        _box_mesh((0.08, 2.50, 0.10), offset=(-0.46, 0.0, 0.22)),
        _box_mesh((0.08, 2.50, 0.10), offset=(0.46, 0.0, 0.22)),
        # Front cross bolster
        _box_mesh((1.04, 0.12, 0.08), offset=(0, -0.75, 0.22)),
        # Mid cross member
        _box_mesh((1.00, 0.10, 0.08), offset=(0, 0.0, 0.22)),
        # Rear cross bolster
        _box_mesh((1.04, 0.12, 0.08), offset=(0, 0.75, 0.22)),
        # Station skid brake fin (center vertical blade)
        _box_mesh((0.02, 1.60, 0.14), offset=(0, 0.0, 0.08)),
        # Chain lift dog ratchet hook
        _box_mesh((0.05, 0.18, 0.12), offset=(0, -0.20, 0.06)),
        # Front coupler hitch tongue
        _box_mesh((0.10, 0.26, 0.06), offset=(0, -1.34, 0.22)),
        # Rear coupler hitch receiver
        _box_mesh((0.12, 0.26, 0.08), offset=(0, 1.34, 0.22)),
    ]
    return _combine_meshes(frame_parts)


def _build_contoured_seat(x_center, y_center):
    """Build an individual contoured bucket seat with rounded cushion, curved back and headrest."""
    parts = []

    # 1. Base cushion pan with rounded front thigh roll and raised lateral bolsters
    # Center seat well
    parts.append(_box_mesh((0.36, 0.34, 0.09), offset=(x_center, y_center - 0.01, 0.36)))
    # Rounded front thigh roll (cylinder across seat front edge)
    parts.append(_cylinder_mesh(0.045, 0.42, segments=14, axis="X", offset=(x_center, y_center - 0.18, 0.36)))
    # Left and right raised lateral hip bolsters (contouring the bucket)
    parts.append(_box_mesh((0.05, 0.34, 0.12), offset=(x_center - 0.19, y_center - 0.01, 0.38)))
    parts.append(_box_mesh((0.05, 0.34, 0.12), offset=(x_center + 0.19, y_center - 0.01, 0.38)))
    # Perimeter seam piping welt bead
    parts.append(_box_mesh((0.44, 0.02, 0.02), offset=(x_center, y_center + 0.16, 0.41)))

    # 2. Ergonomic curved lumbar backrest with fluted vertical channels
    # Lower lumbar support (steep slight backward rake)
    parts.append(_box_mesh((0.42, 0.08, 0.22), offset=(x_center, y_center + 0.19, 0.52)))
    # Upper backrest with forward-wrapping side wings
    parts.append(_box_mesh((0.38, 0.07, 0.20), offset=(x_center, y_center + 0.21, 0.69)))
    parts.append(_box_mesh((0.04, 0.10, 0.38), offset=(x_center - 0.20, y_center + 0.18, 0.60)))
    parts.append(_box_mesh((0.04, 0.10, 0.38), offset=(x_center + 0.20, y_center + 0.18, 0.60)))

    # 3. Fluted vertical cushion pleats (channel tufting relief)
    parts.append(_box_mesh((0.08, 0.03, 0.34), offset=(x_center - 0.09, y_center + 0.17, 0.60)))
    parts.append(_box_mesh((0.08, 0.03, 0.34), offset=(x_center + 0.09, y_center + 0.17, 0.60)))

    # 4. Rounded headrest bolster with horizontal seam
    parts.append(_cylinder_mesh(0.055, 0.36, segments=14, axis="X", offset=(x_center, y_center + 0.21, 0.84)))
    # Headrest back plate mounting flange
    parts.append(_box_mesh((0.38, 0.04, 0.12), offset=(x_center, y_center + 0.24, 0.84)))

    # 5. Seat mounting pedestal bracket (anchoring to floorboard)
    parts.append(_box_mesh((0.30, 0.26, 0.05), offset=(x_center, y_center, 0.30)))

    return _combine_meshes(parts)


def _build_seat_pair(y_center):
    """Build two individual contoured bucket seats for one row."""
    left_seat = _build_contoured_seat(x_center=-0.32, y_center=y_center)
    right_seat = _build_contoured_seat(x_center=0.32, y_center=y_center)
    return _combine_meshes([left_seat, right_seat])


def _build_lap_bar_mesh():
    """Build U-shaped articulated safety lap bar with twin padded grips and pivot ratchets."""
    bar_parts = [
        # Main crossbar connecting both passenger seats
        _cylinder_mesh(0.022, 1.04, segments=14, axis="X", offset=(0, 0.22, 0.0)),
        # Left passenger padded grip cushion
        _cylinder_mesh(0.042, 0.38, segments=16, axis="X", offset=(-0.32, 0.22, 0.0)),
        # Right passenger padded grip cushion
        _cylinder_mesh(0.042, 0.38, segments=16, axis="X", offset=(0.32, 0.22, 0.0)),
        # Left pivot arm connecting hinge to crossbar
        _box_mesh((0.03, 0.26, 0.03), offset=(-0.52, 0.11, 0.0)),
        # Right pivot arm connecting hinge to crossbar
        _box_mesh((0.03, 0.26, 0.03), offset=(0.52, 0.11, 0.0)),
        # Left hinge ratchet hub
        _cylinder_mesh(0.030, 0.04, segments=12, axis="X", offset=(-0.52, 0.0, 0.0)),
        # Right hinge ratchet hub
        _cylinder_mesh(0.030, 0.04, segments=12, axis="X", offset=(0.52, 0.0, 0.0)),
    ]
    return _combine_meshes(bar_parts)


def _build_bogie_carriers():
    """Build bogie carrier frame, axles, wheel hubs, and steel guide flanges (metallic parts)."""
    metal_parts = [
        # Steel axle connecting left and right road wheels
        _cylinder_mesh(0.035, 1.08, segments=14, axis="X", offset=(0, 0, 0)),
        # Bogie frame carrier plate
        _box_mesh((1.04, 0.22, 0.05), offset=(0, 0, 0.06)),
        # Central pivot pin bolster collar
        _cylinder_mesh(0.06, 0.08, segments=12, axis="Z", offset=(0, 0, 0.08)),
    ]

    for side_x in (-0.48, 0.48):
        flange_offset = 0.045 if side_x < 0 else -0.045
        metal_parts.extend([
            # Inner rail guide flange (high-strength steel disc)
            _cylinder_mesh(0.20, 0.02, segments=18, axis="X", offset=(side_x + flange_offset, 0, 0)),
            # Outer wheel bearing hub cap with grease fitting
            _cylinder_mesh(0.05, 0.03, segments=12, axis="X", offset=(side_x - flange_offset, 0, 0)),
            # Guide wheel mounting bracket pin
            _cylinder_mesh(0.015, 0.08, segments=8, axis="Z", offset=(side_x * 0.79, 0, -0.16)),
            # Upstop safety arm bracket
            _box_mesh((0.04, 0.06, 0.16), offset=(side_x, 0, -0.18)),
        ])

    return _combine_meshes(metal_parts)


def _build_bogie_treads():
    """Build resilient dark rubber/polyurethane tires for road, guide and upstop wheels."""
    rubber_parts = []

    # Road wheel resilient treads (gauge ±0.48, radius 0.17)
    for side_x in (-0.48, 0.48):
        rubber_parts.append(
            _cylinder_mesh(0.17, 0.06, segments=20, axis="X", offset=(side_x, 0, 0))
        )

    # Side-friction guide wheels (gauge clearance ±0.38, level Z = -0.20)
    for guide_x in (-0.38, 0.38):
        rubber_parts.append(
            _cylinder_mesh(0.065, 0.04, segments=14, axis="Z", offset=(guide_x, 0, -0.20))
        )

    # Upstop under-friction safety wheels (track clamp Z = -0.31, gauge ±0.48)
    for upstop_x in (-0.48, 0.48):
        rubber_parts.append(
            _cylinder_mesh(0.060, 0.05, segments=14, axis="X", offset=(upstop_x, 0, -0.31))
        )

    return _combine_meshes(rubber_parts)


def build(materials):
    """Build independent four-passenger wooden coaster car adhering to authoring contract.

    Args:
        materials: dict of bpy.types.Material keyed by canonical names.

    Returns:
        Metadata dictionary with asset ID, variant, dimensions, anchors, restraints, notes.
    """
    # Material lookups with safe fallbacks
    mat_paint_red = materials.get("paint_red") or materials.get("timber")
    mat_boards = materials.get("boards") or materials.get("timber")
    mat_cream = materials.get("cream") or materials.get("brass")
    mat_brass = materials.get("brass") or materials.get("metal")
    mat_metal = materials.get("metal")
    mat_vinyl = materials.get("seat_vinyl") or materials.get("fabric")
    mat_rubber = materials.get("rubber") or materials.get("metal")

    # 1. Root Anchor at track rail level
    rail_root = _create_empty("RailRoot", location=(0.0, 0.0, 0.0))

    # 2. Main Sculpted Body Tub (warm classic coach finish)
    tub_verts, tub_faces = _build_sculpted_tub()
    tub_obj = _create_mesh_object("CarBody_Tub", tub_verts, tub_faces, material=mat_paint_red, parent=rail_root)

    # 3. Flank Varnished Timber Insert Panels
    timber_verts, timber_faces = _build_timber_side_inserts()
    timber_obj = _create_mesh_object("CarBody_TimberSide", timber_verts, timber_faces, material=mat_boards, parent=rail_root)

    # 4. Decorative Cowl Bumper, Crest, Rails, and Molding Trim
    trim_verts, trim_faces = _build_decorative_trim()
    trim_obj = _create_mesh_object("CarBody_Trim", trim_verts, trim_faces, material=mat_brass, parent=rail_root)

    # 5. Steel Chassis Frame and Skid Brake Equipment
    chassis_verts, chassis_faces = _build_chassis_frame()
    chassis_obj = _create_mesh_object("Chassis_Frame", chassis_verts, chassis_faces, material=mat_metal, parent=rail_root)

    # 6. Contoured Ergonomic Seating (Row 1 & Row 2)
    seats_r1_v, seats_r1_f = _build_seat_pair(y_center=-0.42)
    seats_r2_v, seats_r2_f = _build_seat_pair(y_center=0.42)
    seats_verts, seats_faces = _combine_meshes([(seats_r1_v, seats_r1_f), (seats_r2_v, seats_r2_f)])
    seats_obj = _create_mesh_object("Seating_Cushions", seats_verts, seats_faces, material=mat_vinyl, parent=rail_root)

    # 7. Passenger Seat Anchors (Agree with individual seat centers)
    seat_fl = _create_empty("Seat_FrontLeft", location=(-0.32, -0.42, 0.46), parent=rail_root)
    seat_fr = _create_empty("Seat_FrontRight", location=(0.32, -0.42, 0.46), parent=rail_root)
    seat_rl = _create_empty("Seat_RearLeft", location=(-0.32, 0.42, 0.46), parent=rail_root)
    seat_rr = _create_empty("Seat_RearRight", location=(0.32, 0.42, 0.46), parent=rail_root)

    # 8. Articulated Restraint Lap Bars (Row 1 & Row 2 hinges; positive X opens bars)
    lapbar_front = _create_empty("LapBar_Front", location=(0.0, -0.62, 0.62), parent=rail_root)
    lap_mesh_v, lap_mesh_f = _build_lap_bar_mesh()
    lap_obj_f = _create_mesh_object("LapBar_Front_Mesh", lap_mesh_v, lap_mesh_f, material=mat_rubber, parent=lapbar_front)

    lapbar_rear = _create_empty("LapBar_Rear", location=(0.0, 0.22, 0.62), parent=rail_root)
    lap_obj_r = _create_mesh_object("LapBar_Rear_Mesh", lap_mesh_v, lap_mesh_f, material=mat_rubber, parent=lapbar_rear)

    # 9. Articulated Bogies (Road, Guide, Upstop Wheel Groups with separate rubber treads and metal carriers)
    # Front Bogie Empty at (0, -0.75, 0.17)
    bogie_front = _create_empty("BogieFront", location=(0.0, -0.75, 0.17), parent=rail_root)
    bogie_metal_v, bogie_metal_f = _build_bogie_carriers()
    bogie_f_metal = _create_mesh_object("BogieFront_Metal", bogie_metal_v, bogie_metal_f, material=mat_metal, parent=bogie_front)
    bogie_tread_v, bogie_tread_f = _build_bogie_treads()
    bogie_f_treads = _create_mesh_object("BogieFront_Treads", bogie_tread_v, bogie_tread_f, material=mat_rubber, parent=bogie_front)

    # Rear Bogie Empty at (0, 0.75, 0.17)
    bogie_rear = _create_empty("BogieRear", location=(0.0, 0.75, 0.17), parent=rail_root)
    bogie_r_metal = _create_mesh_object("BogieRear_Metal", bogie_metal_v, bogie_metal_f, material=mat_metal, parent=bogie_rear)
    bogie_r_treads = _create_mesh_object("BogieRear_Treads", bogie_tread_v, bogie_tread_f, material=mat_rubber, parent=bogie_rear)

    # 10. Coupler Anchors
    coupler_front = _create_empty("Coupler_Front", location=(0.0, -1.34, 0.22), parent=rail_root)
    coupler_rear = _create_empty("Coupler_Rear", location=(0.0, 1.34, 0.22), parent=rail_root)

    anchors = {
        "RailRoot": rail_root,
        "BogieFront": bogie_front,
        "BogieRear": bogie_rear,
        "Seat_FrontLeft": seat_fl,
        "Seat_FrontRight": seat_fr,
        "Seat_RearLeft": seat_rl,
        "Seat_RearRight": seat_rr,
        "Coupler_Front": coupler_front,
        "Coupler_Rear": coupler_rear,
    }

    restraints = {
        "LapBar_Front": lapbar_front,
        "LapBar_Rear": lapbar_rear,
    }

    return {
        "assetId": "wooden-car",
        "referenceVariant": "PTCT1-inspired wooden train car",
        "candidateDimensions": {
            "width": 1.44,
            "length": 2.68,
            "height": 1.24,
        },
        "anchors": anchors,
        "restraints": restraints,
        "notes": (
            "Four-passenger articulated wooden coaster car with sculpted tub, contoured vinyl seats, "
            "hinged lap bars, complete road/guide/upstop wheel groups, couplers, and export-stable UVs."
        ),
        "geometryIntent": (
            "Independently authored PTC-inspired wooden coaster car geometry featuring shaped prow/nose "
            "curvature, closed cowl deck, varnished timber side inserts, recessed cockpit tubs, layered "
            "steel undercarriage stringers, fin brake equipment, two articulated two-passenger rows with "
            "individual contoured bucket cushions and fluted lumbar backrests, and dual bogie pivot assemblies "
            "with differentiated rubber treads and metal hubs."
        ),
    }
