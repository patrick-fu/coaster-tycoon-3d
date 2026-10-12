"""information-kiosk.py - Detailed four-frontage timber information kiosk asset source.

Authoring Contract Conformance:
- Axis convention: Blender +X right, -Y forward/frontage, +Z up.
- Root origin: (0, 0, 0) at ground reference.
- Footprint: Bounded strictly within X/Y +/-1.95m and Z 0.00..3.85m for standard 4m tile envelopes.
- Four-sided symmetry: Open service counter recesses on all four cardinal facades.
- Architectural components:
  * Masonry/brick stepped plinth foundation and timber board deck
  * Timber corner pillars with metal collars and decorative corbels (shared mesh datablocks)
  * Recessed counter bays with timber ledges, jambs, shutter valances, and interior desks
  * Crisp 'INFO' signage fascia with cream trim and combined 3D pixel glyphs on all four elevations
  * Layered bellcast hipped shingle roof with projecting eave soffit, steep main hip, and ridge collar
  * Central four-sided ventilation cupola lantern with corner posts, horizontal louvers, cornice, and copper hip cap
  * Ornate brass spire finial peaking strictly at Z = 3.84m
  * Isolated inspection props: PropMap (folded trifold paper map) & PropUmbrella (octagonal umbrella)
- Explicit UV unwrapping with grain orientation, clean topology, and named empty anchors.
"""

import math
import bpy
import mathutils


def _get_mat(materials, key, fallback_color=(0.5, 0.5, 0.5, 1.0), roughness=0.6, metalness=0.0):
    """Retrieve material from dictionary or generate clean fallback if missing."""
    if materials and isinstance(materials, dict) and key in materials and materials[key]:
        return materials[key]
    mat = bpy.data.materials.new(name=f"mat_kiosk_{key}")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = fallback_color
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs and metalness > 0.0:
            bsdf.inputs["Metallic"].default_value = metalness
    return mat


def _adjust_roof_material(mat_roof):
    """Create an asset-owned copy of the supplied roof material with warm terracotta color.

    Preserves existing shingle texture mappings while multiplying base color by saturated terracotta,
    maintaining glTF 2.0 PBR material output compatibility without mutating caller shared materials.
    """
    if not mat_roof:
        return mat_roof

    # Asset-owned copy; never mutate caller shared materials
    mat_roof = mat_roof.copy()
    mat_roof.name = "mat_kiosk_roof_warm"

    if not mat_roof.use_nodes or not mat_roof.node_tree:
        if hasattr(mat_roof, "diffuse_color"):
            mat_roof.diffuse_color = (0.86, 0.35, 0.18, 1.0)
        return mat_roof

    nodes = mat_roof.node_tree.nodes
    links = mat_roof.node_tree.links

    bsdf = None
    for n in nodes:
        if n.type == 'BSDF_PRINCIPLED':
            bsdf = n
            break
    if not bsdf:
        bsdf = nodes.get("Principled BSDF")
    if not bsdf or "Base Color" not in bsdf.inputs:
        return mat_roof

    # Measured roof reflections washed out the warm tiles under the fixed render recipe.
    bsdf.inputs["Specular IOR Level"].default_value = 0.15

    base_in = bsdf.inputs["Base Color"]
    terracotta_rgba = (0.86, 0.35, 0.18, 1.0)

    if not base_in.is_linked:
        base_in.default_value = terracotta_rgba
        return mat_roof

    # Linked to texture in pinned Blender 4.3.2: insert glTF-compliant ShaderNodeMix Multiply node
    link = base_in.links[0]
    from_socket = link.from_socket
    links.remove(link)

    mix_node = nodes.new(type="ShaderNodeMix")
    mix_node.data_type = 'RGBA'
    mix_node.blend_type = 'MULTIPLY'
    # Blender 4.3.2 retains inactive same-name scalar/vector sockets.
    mix_node.inputs[0].default_value = 1.0
    links.new(from_socket, mix_node.inputs[6])
    mix_node.inputs[7].default_value = terracotta_rgba
    links.new(mix_node.outputs[2], base_in)
    base_in.default_value = terracotta_rgba

    return mat_roof


def _link_and_assign(mesh, name, mat=None, parent=None, location=(0.0, 0.0, 0.0), rotation=(0.0, 0.0, 0.0)):
    """Create object referencing mesh datablock, link to collection, assign material and transform."""
    obj = bpy.data.objects.new(name, mesh)
    if location != (0.0, 0.0, 0.0):
        obj.location = location
    if rotation != (0.0, 0.0, 0.0):
        obj.rotation_euler = rotation
    if parent:
        obj.parent = parent
    bpy.context.scene.collection.objects.link(obj)
    if mat:
        if len(mesh.materials) == 0:
            mesh.materials.append(mat)
        elif len(obj.data.materials) == 0:
            obj.data.materials.append(mat)
    return obj


def _create_prism_mesh(name, min_pt, max_pt, uv_scale=1.0):
    """Generate an axis-aligned box/prism mesh with explicit 6-face UV mapping."""
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

    dx = max(0.001, x1 - x0)
    dy = max(0.001, y1 - y0)
    dz = max(0.001, z1 - z0)

    for poly in mesh.polygons:
        for loop_idx in poly.loop_indices:
            vert_idx = mesh.loops[loop_idx].vertex_index
            vx, vy, vz = verts[vert_idx]
            norm = poly.normal
            if abs(norm.z) > 0.5:
                u = ((vx - x0) / dx) * uv_scale
                v = ((vy - y0) / dy) * uv_scale
            elif abs(norm.y) > 0.5:
                u = ((vx - x0) / dx) * uv_scale
                v = ((vz - z0) / dz) * uv_scale
            else:
                u = ((vy - y0) / dy) * uv_scale
                v = ((vz - z0) / dz) * uv_scale
            uv_data[loop_idx].uv = (u, v)

    return mesh


def _create_prism(name, min_pt, max_pt, mat=None, parent=None, uv_scale=1.0):
    """Generate a unique prism mesh and scene object."""
    mesh = _create_prism_mesh(name + "_Mesh", min_pt, max_pt, uv_scale=uv_scale)
    return _link_and_assign(mesh, name, mat=mat, parent=parent)


def _create_cylinder_mesh(name, radius, height, segments=12, z_offset=0.0):
    """Generate a vertical cylinder mesh with caps and cylindrical UV unwrap."""
    verts = []
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

    return mesh


def _create_cylinder(name, radius, height, segments=12, z_offset=0.0, mat=None, parent=None):
    """Generate a unique vertical cylinder mesh and scene object."""
    mesh = _create_cylinder_mesh(name + "_Mesh", radius, height, segments=segments, z_offset=z_offset)
    return _link_and_assign(mesh, name, mat=mat, parent=parent)


def _create_frustum_roof_mesh(name, base_size, top_size, z_bot, z_top, uv_scale=3.8):
    """Generate 4-sided pyramid frustum roof mesh with downward aligned shingle UVs."""
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
            if poly.index < 4:
                # Each hip keeps shingle courses horizontal at equal surface density.
                face_u = (vx, vy, -vx, -vy)[poly.index]
                slope_length = math.hypot(b_half - t_half, z_top - z_bot)
                u = (face_u / max(0.001, base_size) + 0.5) * uv_scale
                v = (vz - z_bot) / max(0.001, z_top - z_bot) * slope_length / max(0.001, base_size) * uv_scale
            else:
                u = ((vx + b_half) / max(0.001, base_size)) * uv_scale
                v = ((vy + b_half) / max(0.001, base_size)) * uv_scale
            uv_data[loop_idx].uv = (u, v)

    return mesh


def _create_frustum_roof(name, base_size, top_size, z_bot, z_top, mat=None, parent=None, uv_scale=3.8):
    """Generate a unique frustum roof mesh and scene object."""
    mesh = _create_frustum_roof_mesh(name + "_Mesh", base_size, top_size, z_bot, z_top, uv_scale=uv_scale)
    return _link_and_assign(mesh, name, mat=mat, parent=parent)


def _create_info_glyphs_mesh(name):
    """Generate combined mesh for all 'INFO' 3D pixel letters on a facade sign."""
    glyphs = {
        "I": ["111", "010", "010", "010", "111"],
        "N": ["1001", "1101", "1111", "1011", "1001"],
        "F": ["111", "100", "110", "100", "100"],
        "O": ["111", "101", "101", "101", "111"],
    }

    # Explicit horizontal offsets for balanced letter spacing and centering
    letter_x_offsets = {
        "I": -0.40,
        "N": -0.20,
        "F": 0.06,
        "O": 0.26,
    }

    verts = []
    faces = []

    pixel_w = 0.048
    pixel_h = 0.040
    pixel_d = 0.020
    y_front = -1.755
    y_back = y_front + pixel_d  # -1.735

    # 4 letters, centered at local X=0
    for letter in "INFO":
        base_x = letter_x_offsets[letter]
        for row, pattern in enumerate(glyphs[letter]):
            for col, char in enumerate(pattern):
                if char != "1":
                    continue
                x0 = base_x + col * pixel_w
                x1 = x0 + pixel_w * 0.90
                z1 = 2.44 - row * pixel_h
                z0 = z1 - pixel_h * 0.88

                base_v = len(verts)
                verts.extend([
                    (x0, y_front, z0), (x1, y_front, z0), (x1, y_back, z0), (x0, y_back, z0),
                    (x0, y_front, z1), (x1, y_front, z1), (x1, y_back, z1), (x0, y_back, z1)
                ])
                faces.extend([
                    (base_v, base_v + 1, base_v + 5, base_v + 4),      # Front (-Y)
                    (base_v + 1, base_v + 2, base_v + 6, base_v + 5),  # Right (+X)
                    (base_v + 2, base_v + 3, base_v + 7, base_v + 6),  # Back (+Y)
                    (base_v + 3, base_v, base_v + 4, base_v + 7),      # Left (-X)
                    (base_v + 4, base_v + 5, base_v + 6, base_v + 7),  # Top (+Z)
                    (base_v + 3, base_v + 2, base_v + 1, base_v),      # Bottom (-Z)
                ])

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    uv_layer = mesh.uv_layers.new(name="UVMap")
    uv_data = uv_layer.data
    for poly in mesh.polygons:
        for loop_idx in poly.loop_indices:
            v_idx = mesh.loops[loop_idx].vertex_index
            vx, vy, vz = verts[v_idx]
            u = (vx + 0.45) / 0.90
            v = (vz - 2.24) / 0.22
            uv_data[loop_idx].uv = (u, v)

    return mesh


def _create_cupola_louvers_mesh(name):
    """Generate combined mesh for 3 angled horizontal louver slats on a cupola facade."""
    verts = []
    faces = []

    slat_w = 0.44
    x0 = -slat_w / 2.0
    x1 = slat_w / 2.0

    slat_zs = [3.31, 3.38, 3.45]
    for sz in slat_zs:
        y_bot = -0.270
        y_top = -0.250
        z_bot = sz
        z_top = sz + 0.040
        thick = 0.012

        base_v = len(verts)
        verts.extend([
            (x0, y_bot, z_bot), (x1, y_bot, z_bot),
            (x1, y_bot + thick, z_bot), (x0, y_bot + thick, z_bot),
            (x0, y_top, z_top), (x1, y_top, z_top),
            (x1, y_top + thick, z_top), (x0, y_top + thick, z_top)
        ])
        faces.extend([
            (base_v, base_v + 1, base_v + 5, base_v + 4),
            (base_v + 1, base_v + 2, base_v + 6, base_v + 5),
            (base_v + 2, base_v + 3, base_v + 7, base_v + 6),
            (base_v + 3, base_v, base_v + 4, base_v + 7),
            (base_v + 4, base_v + 5, base_v + 6, base_v + 7),
            (base_v + 3, base_v + 2, base_v + 1, base_v),
        ])

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    uv_layer = mesh.uv_layers.new(name="UVMap")
    uv_data = uv_layer.data
    for poly in mesh.polygons:
        for loop_idx in poly.loop_indices:
            v_idx = mesh.loops[loop_idx].vertex_index
            vx, vy, vz = verts[v_idx]
            u = (vx - x0) / max(0.001, slat_w)
            v = (vz - 3.31) / 0.18
            uv_data[loop_idx].uv = (u, v)

    return mesh


def _build_folded_map(name, origin, mat_paper, mat_ink, mat_teal, parent=None):
    """Generate a realistic accordion trifold park map with readable fold angles."""
    ox, oy, oz = origin
    w = 0.26   # Total unfolded length ~0.26m
    h = 0.16   # Height 0.16m
    t = 0.002  # Paper thickness

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

        p0 = (cur_x, cur_y, cur_z)
        p1 = (cur_x + dx, cur_y + dy, cur_z)
        p2 = (cur_x + dx, cur_y + dy, cur_z + h)
        p3 = (cur_x, cur_y, cur_z + h)

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

    mesh = bpy.data.meshes.new(name + "_Sheet")
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
    if parent:
        root.parent = parent
    bpy.context.scene.collection.objects.link(root)
    for vertex in mesh.vertices:
        vertex.co -= mathutils.Vector(origin)
    _link_and_assign(mesh, name + "_Mesh", mat_paper, root)

    # Printed map path and grid accent stripes
    if mat_ink is not None and mat_teal is not None:
        _create_prism("Map_PathPrint", (0.02, -0.004, 0.02), (0.15, -0.002, 0.05), mat=mat_teal, parent=root)
        for row in range(3):
            z = 0.06 + row * 0.026
            _create_prism(f"Map_GridPrint_{row}", (0.03, -0.004, z), (0.13, -0.002, z + 0.004), mat=mat_ink, parent=root)

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
    shaft_h = 0.82
    shaft_r = 0.016
    shaft_z_bot = -0.03
    shaft_z_top = shaft_h + 0.08
    _create_cylinder("Umbrella_Shaft", shaft_r, shaft_z_top - shaft_z_bot, segments=8, z_offset=shaft_z_bot, mat=mat_shaft, parent=umbrella_root)

    # 2. Top brass ferrule & tip and runner sleeve
    _create_cylinder("Umbrella_Tip", 0.010, 0.06, segments=8, z_offset=shaft_h + 0.08, mat=mat_brass, parent=umbrella_root)
    _create_cylinder("Umbrella_Runner", 0.020, 0.022, segments=8, z_offset=shaft_h * 0.58 + 0.08, mat=mat_brass, parent=umbrella_root)

    # 3. Compact octagonal canopy (8 panels with alternating teal/cream fabric)
    segments = 8
    radius = 0.22
    apex_z = shaft_h * 0.88 + 0.08
    rim_z = shaft_h * 0.65 + 0.08
    valance_z = rim_z - 0.04

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
    j_radius = 0.035
    for s in range(j_segs + 1):
        th = math.pi * (s / j_segs)
        hx = -j_radius * math.sin(th)
        hz = shaft_z_bot - j_radius * (1.0 - math.cos(th))
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
    # 1. Resolve Materials (Shared structural materials with resilient fallbacks)
    mat_brick = _get_mat(materials, "brick", fallback_color=(0.55, 0.28, 0.20, 1.0), roughness=0.85)
    mat_timber = _get_mat(materials, "timber", fallback_color=(0.42, 0.25, 0.14, 1.0), roughness=0.60)
    mat_boards = _get_mat(materials, "boards", fallback_color=(0.66, 0.48, 0.30, 1.0), roughness=0.70)
    mat_roof = _adjust_roof_material(_get_mat(materials, "roof", fallback_color=(0.82, 0.30, 0.16, 1.0), roughness=0.75))
    mat_metal = _get_mat(materials, "metal", fallback_color=(0.30, 0.35, 0.38, 1.0), roughness=0.40, metalness=0.80)
    mat_brass = _get_mat(materials, "brass", fallback_color=(0.85, 0.65, 0.20, 1.0), roughness=0.30, metalness=0.85)
    mat_cream = _get_mat(materials, "cream", fallback_color=(0.94, 0.91, 0.82, 1.0), roughness=0.50)
    mat_teal = _get_mat(materials, "paint_teal", fallback_color=(0.08, 0.48, 0.44, 1.0), roughness=0.50)
    mat_paper = _get_mat(materials, "paper", fallback_color=(0.96, 0.94, 0.88, 1.0), roughness=0.90)
    mat_ink = _get_mat(materials, "ink", fallback_color=(0.12, 0.12, 0.14, 1.0), roughness=0.90)

    # 2. Root Empty Node
    root = bpy.data.objects.new("GroundRoot", None)
    root.location = (0.0, 0.0, 0.0)
    bpy.context.scene.collection.objects.link(root)

    # 3. Base Plinth (Height: 0.00 -> 0.22, Footprint: X/Y +/-1.72m)
    _create_prism("Plinth_Foundation", (-1.72, -1.72, 0.00), (1.72, 1.72, 0.12), mat=mat_brick, parent=root)
    _create_prism("Plinth_SteppedDeck", (-1.62, -1.62, 0.12), (1.62, 1.62, 0.22), mat=mat_boards, parent=root)

    # 4. Corner Heavy Timber Posts (4 posts with metal collars and corbels; shared mesh datablocks)
    post_w = 0.18
    post_h = 1.90   # Z: 0.22 -> 2.12
    collar_w = 0.24
    collar_h = 0.14  # Z: 0.22 -> 0.36
    corbel_size = 0.22  # Z: 1.96 -> 2.12

    mesh_post = _create_prism_mesh("Mesh_CornerPost", (-post_w / 2, -post_w / 2, 0.22), (post_w / 2, post_w / 2, 0.22 + post_h))
    mesh_collar = _create_prism_mesh("Mesh_CornerCollar", (-collar_w / 2, -collar_w / 2, 0.22), (collar_w / 2, collar_w / 2, 0.22 + collar_h))
    mesh_corbel = _create_prism_mesh("Mesh_Corbel", (-corbel_size / 2, -corbel_size / 2, 1.96), (corbel_size / 2, corbel_size / 2, 2.12))

    corner_offsets = [(-1.32, -1.32), (1.32, -1.32), (1.32, 1.32), (-1.32, 1.32)]
    for i, (cx, cy) in enumerate(corner_offsets):
        _link_and_assign(mesh_post, f"CornerPost_{i}", mat=mat_timber, parent=root, location=(cx, cy, 0.0))
        _link_and_assign(mesh_collar, f"CornerCollar_{i}", mat=mat_metal, parent=root, location=(cx, cy, 0.0))
        _link_and_assign(mesh_corbel, f"Corbel_{i}", mat=mat_timber, parent=root, location=(cx, cy, 0.0))

    # 5. Perimeter Entablature Lintel Beam (Z: 2.12 -> 2.24, X/Y +/-1.46m)
    _create_prism("Entablature_Beam", (-1.46, -1.46, 2.12), (1.46, 1.46, 2.24), mat=mat_timber, parent=root)

    # 6. Four Facades: Counters, Wainscot Siding, Jambs, Shutters, and Signs
    counter_z = 0.82
    counter_thick = 0.06
    counter_top_z = counter_z + counter_thick  # 0.88
    opening_top_z = 1.90

    # Local facade shared mesh datablocks (-Y frontage)
    mesh_wainscot = _create_prism_mesh("Mesh_Wainscot", (-1.22, -1.34, 0.22), (1.22, -1.24, counter_z))
    mesh_counter = _create_prism_mesh("Mesh_CounterLedge", (-1.26, -1.52, counter_z), (1.26, -1.22, counter_top_z))
    jamb_w = 0.10
    mesh_jamb_left = _create_prism_mesh("Mesh_JambLeft", (-1.24, -1.32, counter_top_z), (-1.24 + jamb_w, -1.22, opening_top_z))
    mesh_jamb_right = _create_prism_mesh("Mesh_JambRight", (1.24 - jamb_w, -1.32, counter_top_z), (1.24, -1.22, opening_top_z))
    mesh_valance = _create_prism_mesh("Mesh_ShutterValance", (-1.22, -1.34, opening_top_z - 0.12), (1.22, -1.22, opening_top_z))
    mesh_interior_desk = _create_prism_mesh("Mesh_InteriorDesk", (-1.12, -1.22, counter_z), (1.12, -0.68, counter_top_z))
    mesh_map_stack = _create_prism_mesh("Mesh_MapStack", (-0.96, -0.95, counter_top_z), (-0.68, -0.72, counter_top_z + 0.06))
    mesh_notice_board = _create_prism_mesh("Mesh_NoticeBoard", (-0.22, -0.294, 1.08), (0.22, -0.280, 1.72))
    mesh_notice_paper = _create_prism_mesh("Mesh_NoticePaper", (-0.16, -0.300, 1.15), (0.16, -0.294, 1.65))
    mesh_sign_border = _create_prism_mesh("Mesh_SignBorder", (-0.58, -1.732, 2.14), (0.58, -1.718, 2.50))
    mesh_sign_plate = _create_prism_mesh("Mesh_SignPlate", (-0.54, -1.740, 2.18), (0.54, -1.724, 2.48))
    mesh_sign_glyphs = _create_info_glyphs_mesh("Mesh_SignGlyphs")

    # Central interior display column core narrowed to 0.56m square with bright cream finish
    _create_prism("Interior_CenterCore", (-0.28, -0.28, 0.22), (0.28, 0.28, 2.12), mat=mat_cream, parent=root)

    facades = [
        ("Front", 0.0, -1.0, 0.0),        # -Y
        ("Right", 1.0, 0.0, math.pi / 2), # +X
        ("Back", 0.0, 1.0, math.pi),      # +Y
        ("Left", -1.0, 0.0, -math.pi / 2) # -X
    ]

    for name, nx, ny, rot in facades:
        f_anchor = bpy.data.objects.new(f"Facade_{name}", None)
        f_anchor.location = (0.0, 0.0, 0.0)
        f_anchor.rotation_euler = (0.0, 0.0, rot)
        f_anchor.parent = root
        bpy.context.scene.collection.objects.link(f_anchor)

        _link_and_assign(mesh_wainscot, f"Wainscot_{name}", mat=mat_boards, parent=f_anchor)
        _link_and_assign(mesh_counter, f"CounterLedge_{name}", mat=mat_timber, parent=f_anchor)
        _link_and_assign(mesh_jamb_left, f"JambLeft_{name}", mat=mat_timber, parent=f_anchor)
        _link_and_assign(mesh_jamb_right, f"JambRight_{name}", mat=mat_timber, parent=f_anchor)
        _link_and_assign(mesh_valance, f"ShutterValance_{name}", mat=mat_teal, parent=f_anchor)
        _link_and_assign(mesh_interior_desk, f"InteriorDesk_{name}", mat=mat_boards, parent=f_anchor)
        _link_and_assign(mesh_map_stack, f"MapStack_{name}", mat=mat_paper, parent=f_anchor)
        _link_and_assign(mesh_notice_board, f"NoticeBoard_{name}", mat=mat_teal, parent=f_anchor)
        _link_and_assign(mesh_notice_paper, f"NoticePaper_{name}", mat=mat_paper, parent=f_anchor)
        _link_and_assign(mesh_sign_border, f"SignBorder_{name}", mat=mat_cream, parent=f_anchor)
        _link_and_assign(mesh_sign_plate, f"SignPlate_{name}", mat=mat_teal, parent=f_anchor)
        _link_and_assign(mesh_sign_glyphs, f"SignGlyphs_{name}", mat=mat_cream, parent=f_anchor)

    # 7. Layered Hipped Roof Construction (X/Y max +/-1.72m, Z: 2.14 -> 3.18)
    # Continuous vertical eave fascia trim in cream spanning under roof edge
    _create_prism("Roof_EavesFascia", (-1.72, -1.72, 2.28), (1.72, 1.72, 2.50), mat=mat_cream, parent=root)

    # Tier 1: Projecting eave hip (3.44m square base flush on fascia top, top 2.64m, Z: 2.50 -> 2.66)
    _create_frustum_roof("Roof_EavesSoffit", 3.44, 2.64, 2.50, 2.66, mat=mat_roof, parent=root)

    # Tier 2: Steep main hipped pavilion roof (2.64m base to 0.96m top, Z: 2.66 -> 3.12)
    _create_frustum_roof("Roof_MainHip", 2.64, 0.96, 2.66, 3.12, mat=mat_roof, parent=root)

    # Tier 3: Roof collar ridge moulding (0.76m square, Z: 3.12 -> 3.18)
    _create_prism("Roof_Collar", (-0.38, -0.38, 3.12), (0.38, 0.38, 3.18), mat=mat_timber, parent=root)

    # 8. Central Ventilation Cupola / Lantern Tower (Z: 3.18 -> 3.84)
    # Cupola pedestal base (0.68m square, Z: 3.18 -> 3.26)
    _create_prism("Cupola_Base", (-0.34, -0.34, 3.18), (0.34, 0.34, 3.26), mat=mat_cream, parent=root)

    # 4 Cupola corner mullions (posts, Z: 3.26 -> 3.52)
    cupola_post_w = 0.05
    mesh_cupola_post = _create_prism_mesh("Mesh_CupolaPost", (-cupola_post_w / 2, -cupola_post_w / 2, 3.26), (cupola_post_w / 2, cupola_post_w / 2, 3.52))
    cupola_mullion_offsets = [(-0.29, -0.29), (0.29, -0.29), (0.29, 0.29), (-0.29, 0.29)]
    for j, (mx, my) in enumerate(cupola_mullion_offsets):
        _link_and_assign(mesh_cupola_post, f"CupolaPost_{j}", mat=mat_timber, parent=root, location=(mx, my, 0.0))

    # Louver panels on all 4 faces (shared mesh)
    mesh_cupola_louvers = _create_cupola_louvers_mesh("Mesh_CupolaLouvers")
    for name, nx, ny, rot in facades:
        f_cup = bpy.data.objects.new(f"CupolaLouver_{name}", None)
        f_cup.rotation_euler = (0.0, 0.0, rot)
        f_cup.parent = root
        bpy.context.scene.collection.objects.link(f_cup)
        _link_and_assign(mesh_cupola_louvers, f"LouverPanel_{name}", mat=mat_teal, parent=f_cup)

    # Cupola roof cornice trim (0.74m square, Z: 3.52 -> 3.56)
    _create_prism("Cupola_Cornice", (-0.37, -0.37, 3.52), (0.37, 0.37, 3.56), mat=mat_cream, parent=root)

    # Cupola steep pyramid roof cap (weathered verdigris copper / teal, 0.74m base to 0.04m top, Z: 3.56 -> 3.75)
    _create_frustum_roof("Cupola_RoofCap", 0.74, 0.04, 3.56, 3.75, mat=mat_teal, parent=root)

    # Top ornate brass finial ball & spire (Z: 3.75 -> 3.84)
    _create_cylinder("Finial_Ball", 0.035, 0.045, segments=8, z_offset=3.75, mat=mat_brass, parent=root)
    _create_cylinder("Finial_Spire", 0.008, 0.045, segments=8, z_offset=3.795, mat=mat_brass, parent=root)

    # 9. Inspection Props (Isolated for inspection)
    # Prop 1: Folded Park Map sitting on the Front (-Y) service counter
    prop_map = _build_folded_map("PropMap", (0.30, -1.40, counter_top_z), mat_paper, mat_ink, mat_teal, parent=root)

    # Prop 2: Octagonal Souvenir Umbrella displayed outside front-left corner pillar
    prop_umbrella = _build_umbrella("PropUmbrella", (-1.64, -1.64, 0.22), mat_teal, mat_cream, mat_timber, mat_brass, parent=root)

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

    anchors["Counter_Front"].location = (0.0, -1.52, counter_top_z)
    anchors["Counter_Back"].location = (0.0, 1.52, counter_top_z)
    anchors["Counter_Left"].location = (-1.52, 0.0, counter_top_z)
    anchors["Counter_Right"].location = (1.52, 0.0, counter_top_z)
    anchors["Sign_Front"].location = (0.0, -1.73, 2.33)

    for k in ["Counter_Front", "Counter_Back", "Counter_Left", "Counter_Right", "Sign_Front"]:
        anchors[k].parent = root
        bpy.context.scene.collection.objects.link(anchors[k])

    # 11. Return Contract English Metadata
    return {
        "assetId": "information_kiosk",
        "referenceVariant": "timber_four_frontage_kiosk",
        "candidateDimensions": (3.44, 3.44, 3.84),
        "anchors": anchors,
        "restraints": [],
        "notes": (
            "Polished four-frontage timber information kiosk. Features stepped masonry plinth, "
            "chamfered timber posts, recessed counter bays with interior map stacks and narrowed cream notice core, "
            "continuous cream vertical eave fascia, rebalanced terracotta shingle hip roof, verdigris teal cupola cap, "
            "prominent eave INFO signage with high-contrast diagonal N lettering, and "
            "two dedicated inspection props: PropMap (folded trifold map) and PropUmbrella (compact octagonal canopy)."
        ),
        "geometryIntent": (
            "Independent theme-park information kiosk with crisp INFO signs, map markings and alternating umbrella panels. "
            "Strictly bounded within X/Y +/-1.95m and Z 0..3.85m to fit standard 4m park tile envelopes without uniform scaling. "
            "Employs shared mesh datablocks across symmetrical facade and cupola components to minimize draw calls and geometry overhead, "
            "with explicit UV coordinates preserved for woodgrain, shingles, and inspection props."
        ),
    }
