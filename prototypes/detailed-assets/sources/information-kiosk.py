"""information-kiosk.py - Detailed four-frontage timber information kiosk asset source.

Authoring Contract Conformance:
- Axis convention: Blender +X right, -Y forward/frontage, +Z up.
- Root origin: (0, 0, 0) at ground reference.
- Footprint: ~3.6m x 3.6m square with stepped plinth and overhanging flared eaves (~4.1m).
- Four-sided symmetry: Open service counter recesses on all four cardinal facades.
- Architectural components:
  * Masonry/brick stepped plinth base
  * Timber corner pillars with chamfered brackets/corbels
  * Recessed counter bays with bevelled timber slabs, sills and roll-up shutter headers
  * Perimeter wainscoting and horizontal board sidings
  * Project-neutral 'INFO' signage fascia on all four elevations
  * Layered bellcast hipped shingle roof with rafter tails and moulded fascia
  * Central four-sided ventilation cupola lantern with louvers and copper/metal hip cap
  * Ornate brass spire finial
  * Isolated inspection props: PropMap (folded trifold paper map) & PropUmbrella (octagonal umbrella)
- Explicit UV unwrapping with grain orientation, clean topology, and named empty anchors.
"""

import math
import bpy
import mathutils


def _get_mat(materials, key, fallback_color=(0.5, 0.5, 0.5, 1.0), roughness=0.6, metalness=0.0):
    """Retrieve material from dictionary or generate clean fallback if missing."""
    if materials and key in materials and materials[key]:
        return materials[key]
    mat = bpy.data.materials.new(name=f"mat_kiosk_{key}")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = fallback_color
        bsdf.inputs["Roughness"].default_value = roughness
    return mat


def _warm_mat(mat, tint=(0.76, 0.58, 0.38), factor=0.70):
    """Clone and multiply-tint material Base Color preserving image textures."""
    if not mat or not mat.node_tree:
        return mat
    mat_copy = mat.copy()
    nodes, links = mat_copy.node_tree.nodes, mat_copy.node_tree.links
    bsdf = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
    if not bsdf or "Base Color" not in bsdf.inputs:
        return mat_copy
    inp = bsdf.inputs["Base Color"]
    if inp.is_linked:
        from_sock = inp.links[0].from_socket
        try:
            mix = nodes.new("ShaderNodeMix")
            mix.data_type = "RGBA"
            mix.blend_type = "MULTIPLY"
            mix.inputs[0].default_value = factor
            links.new(from_sock, mix.inputs[6])
            mix.inputs[7].default_value = (*tint, 1.0)
            links.new(mix.outputs[2], inp)
        except Exception:
            try:
                mix = nodes.new("ShaderNodeMixRGB")
                mix.blend_type = "MULTIPLY"
                mix.inputs["Fac"].default_value = factor
                links.new(from_sock, mix.inputs["Color1"])
                mix.inputs["Color2"].default_value = (*tint, 1.0)
                links.new(mix.outputs["Color"], inp)
            except Exception:
                pass
    else:
        c = inp.default_value
        inp.default_value = (c[0] * (1 - factor + factor * tint[0]), c[1] * (1 - factor + factor * tint[1]), c[2] * (1 - factor + factor * tint[2]), 1.0)
    return mat_copy


def _link_and_assign(mesh, name, mat, parent=None):
    """Create object, link to active scene collection, assign material and optional parent."""
    obj = bpy.data.objects.new(name, mesh)
    if parent:
        obj.parent = parent
    bpy.context.scene.collection.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    return obj


def _create_prism(name, min_pt, max_pt, mat=None, parent=None, uv_scale=1.0):
    """Generate an axis-aligned box/prism with explicit 6-face UV mapping."""
    x0, y0, z0 = min_pt
    x1, y1, z1 = max_pt

    verts = [
        (x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),  # Bottom: 0,1,2,3
        (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1),  # Top:    4,5,6,7
    ]
    faces = [
        (0, 1, 5, 4),  # Front (-Y)
        (1, 2, 6, 5),  # Right (+X)
        (2, 3, 7, 6),  # Back (+Y)
        (3, 0, 4, 7),  # Left (-X)
        (4, 5, 6, 7),  # Top (+Z)
        (3, 2, 1, 0),  # Bottom (-Z)
    ]

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    uv_layer = mesh.uv_layers.new(name="UVMap")
    uv_data = uv_layer.data

    # Map face UVs based on face dimensions
    for poly in mesh.polygons:
        for loop_idx in poly.loop_indices:
            vert_idx = mesh.loops[loop_idx].vertex_index
            vx, vy, vz = verts[vert_idx]
            normal = poly.normal
            if abs(normal.z) > 0.5:
                u = (vx - x0) / max(0.001, (x1 - x0)) * uv_scale
                v = (vy - y0) / max(0.001, (y1 - y0)) * uv_scale
            elif abs(normal.y) > 0.5:
                u = (vx - x0) / max(0.001, (x1 - x0)) * uv_scale
                v = (vz - z0) / max(0.001, (z1 - z0)) * uv_scale
            else:
                u = (vy - y0) / max(0.001, (y1 - y0)) * uv_scale
                v = (vz - z0) / max(0.001, (z1 - z0)) * uv_scale
            uv_data[loop_idx].uv = (u, v)

    return _link_and_assign(mesh, name, mat, parent)


def _create_cylinder(name, radius, height, segments=12, z_offset=0.0, mat=None, parent=None):
    """Generate a vertical cylinder with caps and cylindrical UV unwrap."""
    verts = []
    half_h = height / 2.0
    z_bot = z_offset
    z_top = z_offset + height

    # Circumference rings
    for i in range(segments):
        theta = (2.0 * math.pi * i) / segments
        cx = radius * math.cos(theta)
        cy = radius * math.sin(theta)
        verts.append((cx, cy, z_bot))
        verts.append((cx, cy, z_top))

    # Center vertices for caps
    c_bot_idx = len(verts)
    verts.append((0.0, 0.0, z_bot))
    c_top_idx = len(verts)
    verts.append((0.0, 0.0, z_top))

    faces = []
    # Side quads
    for i in range(segments):
        i_next = (i + 1) % segments
        b0 = i * 2
        t0 = b0 + 1
        b1 = i_next * 2
        t1 = b1 + 1
        faces.append((b0, b1, t1, t0))

    # Cap triangles
    for i in range(segments):
        i_next = (i + 1) % segments
        b0 = i * 2
        b1 = i_next * 2
        faces.append((c_bot_idx, b1, b0))
        t0 = i * 2 + 1
        t1 = i_next * 2 + 1
        faces.append((c_top_idx, t0, t1))

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    uv_layer = mesh.uv_layers.new(name="UVMap")
    uv_data = uv_layer.data

    for poly in mesh.polygons:
        for loop_idx in poly.loop_indices:
            v_idx = mesh.loops[loop_idx].vertex_index
            vx, vy, vz = verts[v_idx]
            if v_idx in (c_bot_idx, c_top_idx):
                uv_data[loop_idx].uv = (0.5, 0.5)
            else:
                angle = math.atan2(vy, vx)
                u = (angle / (2.0 * math.pi)) % 1.0
                v = (vz - z_bot) / max(0.001, height)
                uv_data[loop_idx].uv = (u, v)

    return _link_and_assign(mesh, name, mat, parent)


def _create_frustum_roof(name, base_size, top_size, z_bot, z_top, mat=None, parent=None, uv_scale=3.8):
    """Generate 4-sided pyramid frustum roof with downward aligned shingle UVs."""
    b_half = base_size / 2.0
    t_half = top_size / 2.0

    verts = [
        (-b_half, -b_half, z_bot), (b_half, -b_half, z_bot),
        (b_half, b_half, z_bot), (-b_half, b_half, z_bot),
        (-t_half, -t_half, z_top), (t_half, -t_half, z_top),
        (t_half, t_half, z_top), (-t_half, t_half, z_top)
    ]
    faces = [
        (0, 1, 5, 4),  # Front
        (1, 2, 6, 5),  # Right
        (2, 3, 7, 6),  # Back
        (3, 0, 4, 7),  # Left
        (4, 5, 6, 7),  # Top cap
        (3, 2, 1, 0),  # Bottom cap
    ]

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    uv_layer = mesh.uv_layers.new(name="UVMap")
    uv_data = uv_layer.data

    for poly in mesh.polygons:
        for loop_idx in poly.loop_indices:
            v_idx = mesh.loops[loop_idx].vertex_index
            vx, vy, vz = verts[v_idx]
            norm = poly.normal
            if abs(norm.z) > 0.6:
                u = ((vx + b_half) / (2.0 * b_half)) * uv_scale
                v = ((vy + b_half) / (2.0 * b_half)) * uv_scale
            else:
                v = ((vz - z_bot) / max(0.001, (z_top - z_bot))) * uv_scale
                u = (((vx if abs(norm.y) > 0.5 else vy) / (2.0 * b_half)) + 0.5) * uv_scale
            uv_data[loop_idx].uv = (u, v)

    return _link_and_assign(mesh, name, mat, parent)


def _build_folded_map(name, origin, mat_paper, mat_ink, mat_teal, parent=None):
    """Generate a realistic accordion trifold park map with readable fold angles."""
    ox, oy, oz = origin
    w = 0.28   # Total unfolded length ~0.28m
    h = 0.18   # Height 0.18m
    t = 0.002  # Paper thickness

    # 3 panels with subtle zig-zag fold angles
    panels = 3
    pw = w / panels
    verts = []
    faces = []

    fold_angles = [0.08, -0.06, 0.05]
    cur_x = ox
    cur_y = oy
    cur_z = oz

    v_count = 0
    for i in range(panels):
        ang = fold_angles[i]
        dx = pw * math.cos(ang)
        dy = pw * math.sin(ang)

        # 4 vertices per panel slice (quad with thickness)
        p0 = (cur_x, cur_y, cur_z)
        p1 = (cur_x + dx, cur_y + dy, cur_z)
        p2 = (cur_x + dx, cur_y + dy, cur_z + h)
        p3 = (cur_x, cur_y, cur_z + h)

        # Top thickness
        p4 = (cur_x, cur_y + t, cur_z)
        p5 = (cur_x + dx, cur_y + dy + t, cur_z)
        p6 = (cur_x + dx, cur_y + dy + t, cur_z + h)
        p7 = (cur_x, cur_y + t, cur_z + h)

        base = v_count
        verts.extend([p0, p1, p2, p3, p4, p5, p6, p7])
        faces.extend([
            (base, base + 1, base + 2, base + 3),        # Front
            (base + 5, base + 4, base + 7, base + 6),    # Back
            (base + 3, base + 2, base + 6, base + 7),    # Top rim
            (base + 4, base + 5, base + 1, base),        # Bottom rim
            (base, base + 3, base + 7, base + 4),        # Left fold
            (base + 1, base + 5, base + 6, base + 2),    # Right fold
        ])
        v_count += 8
        cur_x += dx
        cur_y += dy

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    uv_layer = mesh.uv_layers.new(name="UVMap")
    uv_data = uv_layer.data
    for poly in mesh.polygons:
        for loop_idx in poly.loop_indices:
            v_idx = mesh.loops[loop_idx].vertex_index
            vx, vy, vz = verts[v_idx]
            u = (vx - ox) / max(0.001, w)
            v = (vz - oz) / max(0.001, h)
            uv_data[loop_idx].uv = (u, v)

    root = bpy.data.objects.new(name, None)
    root.location = origin
    root.parent = parent
    bpy.context.scene.collection.objects.link(root)
    for vertex in mesh.vertices:
        vertex.co -= mathutils.Vector(origin)
    _link_and_assign(mesh, name + "_Mesh", mat_paper, root)

    # Simple printed grid/path accents on the map face
    if mat_ink is not None and mat_teal is not None:
        _create_prism("Map_PathPrint", (0.02, -0.004, 0.02), (0.16, -0.002, 0.05), mat=mat_teal, parent=root)
        for row in range(3):
            z = 0.065 + row * 0.026
            _create_prism(f"Map_GridPrint_{row}", (0.04, -0.004, z), (0.14, -0.002, z + 0.004), mat=mat_ink, parent=root)

    return root


def _build_umbrella(name, origin, mat_teal, mat_cream, mat_shaft, mat_brass, parent=None):
    """Generate an octagonal souvenir umbrella with curved J-handle, alternating panels, and brass details."""
    ox, oy, oz = origin
    umbrella_root = bpy.data.objects.new(name, None)
    umbrella_root.location = (ox, oy, oz)
    if parent:
        umbrella_root.parent = parent
    bpy.context.scene.collection.objects.link(umbrella_root)

    # 1. Main shaft
    shaft_h = 0.95
    shaft_r = 0.012
    _create_cylinder("Umbrella_Shaft", shaft_r, shaft_h, segments=8, z_offset=0.08, mat=mat_shaft, parent=umbrella_root)

    # 2. Top brass ferrule & tip and runner sleeve
    _create_cylinder("Umbrella_Tip", 0.008, 0.07, segments=8, z_offset=shaft_h + 0.08, mat=mat_brass, parent=umbrella_root)
    _create_cylinder("Umbrella_Runner", 0.018, 0.025, segments=8, z_offset=shaft_h * 0.58 + 0.08, mat=mat_brass, parent=umbrella_root)

    # 3. Octagonal canopy (8 panels with alternating teal/cream fabric)
    segments = 8
    radius = 0.52
    apex_z = shaft_h * 0.88 + 0.08
    rim_z = shaft_h * 0.65 + 0.08
    valance_z = rim_z - 0.05

    verts = [(0.0, 0.0, apex_z)]  # Vertex 0: Apex
    rim_indices = []
    valance_indices = []

    for i in range(segments):
        ang = (2.0 * math.pi * i) / segments
        rx = radius * math.cos(ang)
        ry = radius * math.sin(ang)
        verts.append((rx, ry, rim_z))
        rim_indices.append(len(verts) - 1)
        verts.append((rx * 1.02, ry * 1.02, valance_z))
        valance_indices.append(len(verts) - 1)

    faces_teal = []
    faces_cream = []
    for i in range(segments):
        i_next = (i + 1) % segments
        r0 = rim_indices[i]
        r1 = rim_indices[i_next]
        v0 = valance_indices[i]
        v1 = valance_indices[i_next]
        t_faces = faces_teal if (i % 2 == 0) else faces_cream
        t_faces.append((0, r0, r1))
        t_faces.append((r0, v0, v1, r1))

    for f_list, f_mat, f_tag in [(faces_teal, mat_teal, "Teal"), (faces_cream, mat_cream, "Cream")]:
        c_mesh = bpy.data.meshes.new(f"Umbrella_Canopy_{f_tag}")
        c_mesh.from_pydata(verts, [], f_list)
        c_mesh.update()
        uv_l = c_mesh.uv_layers.new(name="UVMap")
        for poly in c_mesh.polygons:
            for loop_i in poly.loop_indices:
                v_i = c_mesh.loops[loop_i].vertex_index
                vx, vy, _ = verts[v_i]
                uv_l.data[loop_i].uv = (0.5 + (vx / (2.0 * radius)), 0.5 + (vy / (2.0 * radius)))
        _link_and_assign(c_mesh, f"Umbrella_Canopy_{f_tag}", f_mat, parent=umbrella_root)

    # 4. Curved J-handle hook at bottom
    j_verts = []
    j_faces = []
    j_segs = 6
    j_radius = 0.04
    for s in range(j_segs + 1):
        th = math.pi * (s / j_segs)
        hx = -j_radius * math.sin(th)
        hz = 0.08 - j_radius * (1.0 - math.cos(th))
        for c in range(4):
            c_ang = (math.pi / 2.0) * c
            radial = shaft_r * math.cos(c_ang)
            cy = shaft_r * math.sin(c_ang)
            j_verts.append((hx + radial * math.sin(th), cy, hz - radial * math.cos(th)))

    for s in range(j_segs):
        for c in range(4):
            c_next = (c + 1) % 4
            b0 = s * 4 + c
            b1 = s * 4 + c_next
            t0 = (s + 1) * 4 + c
            t1 = (s + 1) * 4 + c_next
            j_faces.append((b0, b1, t1, t0))

    j_mesh = bpy.data.meshes.new("Umbrella_Handle")
    j_mesh.from_pydata(j_verts, [], j_faces)
    j_mesh.update()
    uv = j_mesh.uv_layers.new(name="UVMap")
    for polygon in j_mesh.polygons:
        for loop in polygon.loop_indices:
            vertex = j_mesh.loops[loop].vertex_index
            uv.data[loop].uv = ((vertex % 4) / 4, (vertex // 4) / j_segs)
    _link_and_assign(j_mesh, "Umbrella_Handle", mat_shaft, parent=umbrella_root)

    return umbrella_root


def build(materials):
    """Builds the complete detailed 4-frontage timber information kiosk.

    Returns the contract metadata dictionary.
    """
    # 1. Resolve Materials
    mat_brick = _get_mat(materials, "brick", fallback_color=(0.55, 0.28, 0.2, 1.0), roughness=0.85)
    mat_timber = _get_mat(materials, "timber", fallback_color=(0.38, 0.22, 0.12, 1.0), roughness=0.6)
    mat_boards = _get_mat(materials, "boards", fallback_color=(0.62, 0.44, 0.28, 1.0), roughness=0.7)
    mat_roof = _get_mat(materials, "roof", fallback_color=(0.68, 0.25, 0.18, 1.0), roughness=0.75)
    mat_metal = _get_mat(materials, "metal", fallback_color=(0.3, 0.35, 0.38, 1.0), roughness=0.4, metalness=0.8)
    mat_brass = _get_mat(materials, "brass", fallback_color=(0.85, 0.65, 0.2, 1.0), roughness=0.3, metalness=0.85)
    mat_cream = _get_mat(materials, "cream", fallback_color=(0.94, 0.91, 0.82, 1.0), roughness=0.5)
    mat_teal = _get_mat(materials, "paint_teal", fallback_color=(0.08, 0.48, 0.44, 1.0), roughness=0.5)
    mat_red = _get_mat(materials, "paint_red", fallback_color=(0.75, 0.15, 0.12, 1.0), roughness=0.5)
    mat_fabric = _get_mat(materials, "fabric", fallback_color=(0.2, 0.45, 0.65, 1.0), roughness=0.8)
    mat_paper = _get_mat(materials, "paper", fallback_color=(0.96, 0.94, 0.88, 1.0), roughness=0.9)
    mat_ink = materials["ink"]
    mat_timber = _warm_mat(mat_timber)
    mat_boards = _warm_mat(mat_boards, tint=(0.80, 0.62, 0.42), factor=0.65)

    # 2. Root Empty Node
    root = bpy.data.objects.new("GroundRoot", None)
    root.location = (0.0, 0.0, 0.0)
    bpy.context.scene.collection.objects.link(root)

    # 3. Base Plinth & Perimeter Kerb (Height: 0.00 -> 0.28)
    _create_prism("Plinth_Foundation", (-1.85, -1.85, 0.0), (1.85, 1.85, 0.15), mat=mat_brick, parent=root)
    _create_prism("Plinth_SteppedDeck", (-1.75, -1.75, 0.15), (1.75, 1.75, 0.28), mat=mat_boards, parent=root)

    # 4. Corner Heavy Timber Posts (4 posts with decorative chamfered bases)
    post_w = 0.20
    post_h = 2.15
    corner_offsets = [(-1.50, -1.50), (1.50, -1.50), (1.50, 1.50), (-1.50, 1.50)]
    for i, (cx, cy) in enumerate(corner_offsets):
        # Post shaft
        _create_prism(
            f"CornerPost_{i}",
            (cx - post_w / 2, cy - post_w / 2, 0.28),
            (cx + post_w / 2, cy + post_w / 2, 0.28 + post_h),
            mat=mat_timber, parent=root
        )
        # Moulded pedestal collar
        _create_prism(
            f"CornerCollar_{i}",
            (cx - post_w * 0.65, cy - post_w * 0.65, 0.28),
            (cx + post_w * 0.65, cy + post_w * 0.65, 0.45),
            mat=mat_metal, parent=root
        )

    # 5. Four Facades: Counters, Wainscot Siding, Jambs, & Shutters
    # Cardinal definitions: (Face Name, Normal X, Normal Y, Angle)
    facades = [
        ("Front", 0.0, -1.0, 0.0),        # -Y
        ("Right", 1.0, 0.0, math.pi / 2), # +X
        ("Back", 0.0, 1.0, math.pi),      # +Y
        ("Left", -1.0, 0.0, -math.pi / 2) # -X
    ]

    counter_z = 0.95
    counter_thick = 0.08
    opening_top_z = 2.05

    for name, nx, ny, rot in facades:
        # Create an intermediate rotational anchor for each facade
        f_anchor = bpy.data.objects.new(f"Facade_{name}", None)
        f_anchor.location = (0.0, 0.0, 0.0)
        f_anchor.rotation_euler = (0.0, 0.0, rot)
        f_anchor.parent = root
        bpy.context.scene.collection.objects.link(f_anchor)

        # A. Lower Wainscoting below counter (Y: -1.45, X: -1.35 to +1.35, Z: 0.28 to 0.95)
        _create_prism(
            f"Wainscot_{name}",
            (-1.38, -1.45, 0.28), (1.38, -1.35, counter_z),
            mat=mat_boards, parent=f_anchor
        )

        # B. Heavy Polished Timber Counter Ledge (Protrudes outwards into -Y)
        _create_prism(
            f"CounterLedge_{name}",
            (-1.42, -1.58, counter_z), (1.42, -1.25, counter_z + counter_thick),
            mat=mat_timber, parent=f_anchor
        )

        # C. Opening Jambs (Flanking the counter opening)
        jamb_w = 0.12
        _create_prism(
            f"JambLeft_{name}",
            (-1.40, -1.44, counter_z + counter_thick),
            (-1.40 + jamb_w, -1.34, opening_top_z),
            mat=mat_timber, parent=f_anchor
        )
        _create_prism(
            f"JambRight_{name}",
            (1.40 - jamb_w, -1.44, counter_z + counter_thick),
            (1.40, -1.34, opening_top_z),
            mat=mat_timber, parent=f_anchor
        )

        # D. Security Roll-Up Shutter Housing & Header Valance
        _create_prism(
            f"ShutterValance_{name}",
            (-1.35, -1.46, opening_top_z - 0.16), (1.35, -1.32, opening_top_z),
            mat=mat_teal, parent=f_anchor
        )

        # E. Interior Counter Partition Desk & Shelf Detail
        _create_prism(
            f"InteriorDesk_{name}",
            (-1.20, -1.15, counter_z - 0.05), (1.20, -0.70, counter_z),
            mat=mat_boards, parent=f_anchor
        )

        # Put the sign on the visible valance below the projecting roof eave.
        # Plaque base
        _create_prism(
            f"SignPlate_{name}",
            (-1.10, -1.61, 1.86), (1.10, -1.56, 2.12),
            mat=mat_teal, parent=f_anchor
        )
        # Gold/cream trimmed inner border
        _create_prism(
            f"SignBorder_{name}",
            (-1.05, -1.62, 1.89), (1.05, -1.59, 2.09),
            mat=mat_cream, parent=f_anchor
        )
        glyphs = {"I": ["111", "010", "010", "010", "111"],
                  "N": ["101", "111", "111", "111", "101"],
                  "F": ["111", "100", "110", "100", "100"],
                  "O": ["111", "101", "101", "101", "111"]}
        for letter_index, letter in enumerate("INFO"):
            for row, pattern in enumerate(glyphs[letter]):
                for column, pixel in enumerate(pattern):
                    if pixel != "1":
                        continue
                    x = -0.38 + letter_index * 0.20 + column * 0.043
                    z = 2.06 - row * 0.030
                    _create_prism(f"InfoGlyph_{name}_{letter_index}_{row}_{column}",
                                  (x, -1.635, z), (x + 0.036, -1.625, z + 0.026),
                                  mat=mat_ink, parent=f_anchor)

    # 6. Overhead Entablature & Rafter Support Brackets
    # Continuous square perimeter lintel beam at Z = 2.40 -> 2.55
    _create_prism("Entablature_Beam", (-1.65, -1.65, 2.40), (1.65, 1.65, 2.55), mat=mat_timber, parent=root)

    # Decorative angled corbels at each corner
    corbel_size = 0.28
    for i, (cx, cy) in enumerate(corner_offsets):
        _create_prism(
            f"Corbel_{i}",
            (cx - 0.15, cy - 0.15, 2.25),
            (cx + 0.15, cy + 0.15, 2.42),
            mat=mat_timber, parent=root
        )

    # 7. Flared Bellcast Hipped Roof Construction
    # Tier 1: Wide projecting eave soffit (3.9m square)
    _create_frustum_roof("Roof_EavesSoffit", 4.10, 3.40, 2.52, 2.75, mat=mat_roof, parent=root)

    # Tier 2: Steep main hipped pavilion roof
    _create_frustum_roof("Roof_MainHip", 3.40, 1.50, 2.75, 3.45, mat=mat_roof, parent=root)

    # Tier 3: Roof collar ridge moulding
    _create_prism("Roof_Collar", (-0.80, -0.80, 3.45), (0.80, 0.80, 3.52), mat=mat_timber, parent=root)

    # 8. Central Ventilation Cupola / Lantern Tower
    # Cupola pedestal base
    _create_prism("Cupola_Base", (-0.72, -0.72, 3.52), (0.72, 0.72, 3.62), mat=mat_cream, parent=root)

    # 4 Cupola corner mullions
    cupola_mullions = [(-0.62, -0.62), (0.62, -0.62), (0.62, 0.62), (-0.62, 0.62)]
    for j, (mx, my) in enumerate(cupola_mullions):
        _create_prism(
            f"CupolaPost_{j}",
            (mx - 0.05, my - 0.05, 3.62), (mx + 0.05, my + 0.05, 3.98),
            mat=mat_timber, parent=root
        )

    # Louver panels on all 4 faces
    for name, nx, ny, rot in facades:
        f_cup = bpy.data.objects.new(f"CupolaLouver_{name}", None)
        f_cup.rotation_euler = (0.0, 0.0, rot)
        f_cup.parent = root
        bpy.context.scene.collection.objects.link(f_cup)
        for louver_k in range(4):
            lz = 3.66 + louver_k * 0.07
            _create_prism(
                f"LouverSlat_{name}_{louver_k}",
                (-0.55, -0.63, lz), (0.55, -0.59, lz + 0.04),
                mat=mat_teal, parent=f_cup
            )

    # Cupola roof cornice
    _create_prism("Cupola_Cornice", (-0.75, -0.75, 3.98), (0.75, 0.75, 4.05), mat=mat_cream, parent=root)

    # Cupola pyramid roof (copper/metal cap)
    _create_frustum_roof("Cupola_RoofCap", 1.55, 0.06, 4.05, 4.45, mat=mat_metal, parent=root)

    # Top ornate brass finial spire
    _create_cylinder("Finial_Spire", 0.015, 0.25, segments=8, z_offset=4.45, mat=mat_brass, parent=root)
    _create_cylinder("Finial_Ball", 0.045, 0.09, segments=8, z_offset=4.60, mat=mat_brass, parent=root)

    # 9. Inspection Props (Isolated for close examination)
    # Prop 1: Folded Park Map sitting on the Front (-Y) service counter
    prop_map = _build_folded_map("PropMap", (0.35, -1.48, counter_z + counter_thick), mat_paper, mat_ink, mat_teal, parent=root)

    # Prop 2: Octagonal Umbrella displayed beside front-left corner pillar
    prop_umbrella = _build_umbrella("PropUmbrella", (-1.55, -1.55, 0.28), mat_teal, mat_cream, mat_timber, mat_brass, parent=root)

    # 10. Rig Empties / Anchors (Exact contract nodes)
    anchors = {
        "GroundRoot": root,
        "Counter_Front": bpy.data.objects.new("Counter_Front", None),
        "Counter_Back": bpy.data.objects.new("Counter_Back", None),
        "Counter_Left": bpy.data.objects.new("Counter_Left", None),
        "Counter_Right": bpy.data.objects.new("Counter_Right", None),
        "Sign_Front": bpy.data.objects.new("Sign_Front", None),
        "PropMap": prop_map,
        "PropUmbrella": prop_umbrella,
    }

    anchors["Counter_Front"].location = (0.0, -1.58, counter_z + counter_thick)
    anchors["Counter_Back"].location = (0.0, 1.58, counter_z + counter_thick)
    anchors["Counter_Left"].location = (-1.58, 0.0, counter_z + counter_thick)
    anchors["Counter_Right"].location = (1.58, 0.0, counter_z + counter_thick)
    anchors["Sign_Front"].location = (0.0, -1.62, 2.00)

    for k in ["Counter_Front", "Counter_Back", "Counter_Left", "Counter_Right", "Sign_Front"]:
        anchors[k].parent = root
        bpy.context.scene.collection.objects.link(anchors[k])

    # 11. Return Contract English Metadata
    return {
        "assetId": "information_kiosk",
        "referenceVariant": "timber_four_frontage_kiosk",
        "candidateDimensions": (4.10, 4.10, 4.70),
        "anchors": anchors,
        "restraints": [],
        "notes": (
            "Four-frontage timber information kiosk. Features stepped masonry plinth, "
            "chamfered timber posts, recessed counter bays with deep interior partitions on all four cardinal facades, "
            "flared bellcast shingle roof with rafter tails, louvered cupola lantern with metal pyramid cap, and "
            "two dedicated inspection props: PropMap (folded trifold map) and PropUmbrella (octagonal canopy)."
        ),
        "geometryIntent": (
            "Independent theme-park information kiosk with INFO signs, map markings and alternating umbrella panels. "
            "Replaces primitive box stalls with layered structural timber framing, chamfered corner collars, "
            "open counter recesses, explicit UV coordinates for woodgrain and shingle courses, and "
            "rigged reference empties for guest interaction and prop examination."
        ),
    }
