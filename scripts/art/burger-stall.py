"""burger-stall.py - Complete independently authored detailed Burger-stall Blender module.

Conforms strictly to AUTHORING-CONTRACT.md and inputs/prior-authoring-contract.md:
- Blender Authoring axes: +X right, -Y frontage, +Z up; origin (0, 0, 0) at ground reference.
- Candidate render pitch: Fits 4m square tile:
    * Mesh X/Y bounds strictly within +/-1.95m (authored design footprint ~3.56m x 3.50m)
    * Mesh Z bounds strictly within 0.00m to 3.72m (under the 3.85m contract ceiling)
- Single frontage at -Y:
    * Genuinely recessed service opening with counter slab at exactly 1.05m height
    * Commercial kitchen equipment: heavy-duty flat-top griddle with sizzling patties,
      overhead trapezoidal exhaust hood with explicit face-oriented UVs and flue duct, and
      point-of-sale cash register with cash drawer and pole display
    * Coherent addressable visual shutter states in one asset:
      - 'OpenShutter': compact horizontal rolled coil in the upper housing, visible in default
        Blender authoring pose, completely exposing counter and equipment.
      - 'ClosedShutter': full 1.10m corrugated curtain covering the opening down to 1.05m counter,
        hidden by default, ready for Root facility.open authority to toggle.
      Both states strictly remain within X/Y in [-1.78, 1.78] and Z in [0.0, 3.72].
- Siding & Canopy Architectural Details:
    * Layered horizontal lap-board siding with physical overlapping edge relief and shadow reveals
    * Cantilevered carnival red and cream striped awning with 3D thickness and scalloped valance silhouette
    * Hipped terracotta shingle roof with exposed rafter tails, moulded fascia, and rooftop vent cowl
- Crowning sculpted layered burger landmark on roof ridge:
    * Hand-modelled rounded bottom bun with heel profile
    * Charred grilled beef patty with bevelled edges
    * Melted American cheese slice with four draped droop corners
    * Fresh ruffled green lettuce layer with undulating folds and thickness
    * Sliced ripe red tomato discs
    * High domed top crown bun with distinct crust seam
    * Restrained individual sesame seeds distributed gracefully across the dome
- Signage & Menu:
    * Project-neutral English 3D dimensional lettering "BURGERS" mounted on prominent front roof-brow plaque
    * Framed wall-mounted menu panel showing only burger items (no fries, no soft drinks, no fake prices)
- Strictly serves only Burger; no fries, extra products, or decorative patrons.
- Explicit UV coordinates with grain and tile courses oriented on all meshes.
- <= 12 static material groups; candidate budget target 6-15k evaluated triangles.
"""

import math
import bpy
import mathutils


# ---------------------------------------------------------------------------
# Material Resolution & Fallback Helpers
# ---------------------------------------------------------------------------

def _get_mat(materials, key, fallback_color=(0.5, 0.5, 0.5, 1.0), roughness=0.6, metalness=0.0):
    """Retrieve material by key from dictionary or generate clean fallback if missing."""
    if materials and key in materials and materials[key]:
        return materials[key]
    mat_name = f"mat_burger_{key}"
    existing = bpy.data.materials.get(mat_name)
    if existing:
        return existing
    mat = bpy.data.materials.new(name=mat_name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = fallback_color
        bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metalness
    return mat


def _authored_mat(materials, key, name, color, roughness=0.6, metalness=0.0):
    """Retrieve material key if present, or create a named project solid material."""
    if materials and key and key in materials and materials[key]:
        return materials[key]
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color[:3], 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metalness
    return mat


def _copy_and_tint_material(mat, tint_color, factor=0.80, name_suffix="_tinted"):
    """Bake the existing linear MIX into a portable sRGB albedo; preserve native sources."""
    import numpy as np

    mat_copy = mat.copy()
    mat_copy.name = f"{mat.name}{name_suffix}"
    nodes, links = mat_copy.node_tree.nodes, mat_copy.node_tree.links
    bsdf = next(node for node in nodes if node.type == 'BSDF_PRINCIPLED')
    source_link = next(link for link in links if link.to_socket == bsdf.inputs["Base Color"])
    source_node = source_link.from_node
    source = source_node.image
    if source.source != 'FILE' or source.is_float or source.colorspace_settings.name != 'sRGB':
        raise ValueError(f"Tint requires the qualified byte/sRGB source: {source.name}")
    if min(source.size) <= 0 or not source.filepath:
        raise ValueError(f"Tint source dimensions or identity are invalid: {source.name}")
    source.use_fake_user = True

    # Match the existing export's resize-before-MIX order without changing native source pixels.
    sample = source.copy()
    try:
        sample.scale(512, 512)
        sample_pixel_count = len(sample.pixels)
        pixels = np.empty(512 * 512 * 4, dtype=np.float32)
        sample.pixels.foreach_get(pixels)
    finally:
        bpy.data.images.remove(sample)
    rgba = pixels.reshape(-1, 4)
    if not np.isfinite(rgba).all():
        raise ValueError(f"Non-finite tint source pixels: {source.name}")
    encoded = rgba[:, :3].copy()
    linear = np.where(encoded <= 0.04045, encoded / 12.92,
                      ((encoded + 0.055) / 1.055) ** 2.4)
    mixed = (1.0 - factor) * linear + factor * np.asarray(tint_color[:3], dtype=np.float32)
    rgba[:, :3] = np.where(mixed <= 0.0031308, 12.92 * mixed,
                          1.055 * mixed ** (1.0 / 2.4) - 0.055)
    rgba[:, 3] = (1.0 - factor) * rgba[:, 3] + factor
    if not np.isfinite(rgba).all() or np.any(rgba < 0.0) or np.any(rgba > 1.0):
        raise ValueError(f"Invalid derived tint pixels: {source.name}")
    image = bpy.data.images.new(source.name.rsplit('.', 1)[0] + name_suffix,
                                width=512, height=512, alpha=True, float_buffer=False)
    image.colorspace_settings.name = 'sRGB'
    image.pixels.foreach_set(np.ascontiguousarray(rgba.reshape(-1)))
    image.update()
    image['coaster_derivation'] = 'srgb-decode-linear-mix-srgb-encode-v1'
    image['source_image'] = source.name
    image['source_filepath'] = source.filepath
    image['tint_color'] = list(tint_color[:3])
    image['mix_factor'] = factor
    image['color_space'] = 'sRGB'
    image['sample_dimensions'] = [512, 512]
    image['source_channels'] = source.channels
    image['sample_pixel_count'] = sample_pixel_count
    image.pack()
    if not image.packed_file or not image.packed_file.data or tuple(image.size) != (512, 512):
        raise ValueError(f"Derived tint was not packed: {image.name}")
    source_node.label = 'Native source reference'
    links.remove(source_link)
    derived_node = nodes.new('ShaderNodeTexImage')
    derived_node.image = image
    for link in source_node.inputs['Vector'].links:
        links.new(link.from_socket, derived_node.inputs['Vector'])
    links.new(derived_node.outputs['Color'], bsdf.inputs['Base Color'])
    return mat_copy



def _link_and_assign(mesh, name, mat, parent=None, smooth=False):
    """Link mesh object to active scene collection, assign material, parent, and shading."""
    obj = bpy.data.objects.new(name, mesh)
    if parent:
        obj.parent = parent
    bpy.context.scene.collection.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    if smooth:
        for poly in mesh.polygons:
            poly.use_smooth = True
        mesh.update()
    return obj


def _set_visibility(obj, visible=True):
    """Recursively set viewport and render visibility on an object subtree."""
    obj.hide_viewport = not visible
    obj.hide_render = not visible
    for child in obj.children:
        _set_visibility(child, visible)


# ---------------------------------------------------------------------------
# Procedural Geometry & Explicit UV Helpers
# ---------------------------------------------------------------------------

def _create_prism(name, min_pt, max_pt, mat=None, parent=None, uv_scale=1.0):
    """Generate an axis-aligned box with explicit 6-face UV mapping."""
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


def _create_cylinder(name, radius, height, segments=16, z_offset=0.0, center_xy=(0.0, 0.0), mat=None, parent=None, smooth=True):
    """Generate a vertical cylinder with flat end caps and cylindrical UV unwrap."""
    cx, cy = center_xy
    verts = []
    z_bot = z_offset
    z_top = z_offset + height

    for i in range(segments):
        theta = (2.0 * math.pi * i) / segments
        vx = cx + radius * math.cos(theta)
        vy = cy + radius * math.sin(theta)
        verts.append((vx, vy, z_bot))
        verts.append((vx, vy, z_top))

    c_bot_idx = len(verts)
    verts.append((cx, cy, z_bot))
    c_top_idx = len(verts)
    verts.append((cx, cy, z_top))

    faces = []
    for i in range(segments):
        i_next = (i + 1) % segments
        b0 = i * 2
        t0 = b0 + 1
        b1 = i_next * 2
        t1 = b1 + 1
        faces.append((b0, b1, t1, t0))

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
        if smooth and len(poly.vertices) == 4:
            poly.use_smooth = True
        for loop_idx in poly.loop_indices:
            v_idx = mesh.loops[loop_idx].vertex_index
            vx, vy, vz = verts[v_idx]
            if v_idx in (c_bot_idx, c_top_idx):
                uv_data[loop_idx].uv = (0.5, 0.5)
            else:
                ang = math.atan2(vy - cy, vx - cx)
                u = (ang / (2.0 * math.pi)) % 1.0
                v = (vz - z_bot) / max(0.001, height)
                uv_data[loop_idx].uv = (u, v)

    mesh.update()
    return _link_and_assign(mesh, name, mat, parent)


def _create_horizontal_cylinder_x(name, radius, length, segments=16, x_offset=-1.0, center_yz=(0.0, 0.0), mat=None, parent=None, smooth=True):
    """Generate a horizontal cylinder aligned with X axis inside [x_offset, x_offset + length]."""
    cy, cz = center_yz
    x_min = x_offset
    x_max = x_offset + length
    verts = []

    for i in range(segments):
        theta = (2.0 * math.pi * i) / segments
        vy = cy + radius * math.sin(theta)
        vz = cz + radius * math.cos(theta)
        verts.append((x_min, vy, vz))
        verts.append((x_max, vy, vz))

    c_left_idx = len(verts)
    verts.append((x_min, cy, cz))
    c_right_idx = len(verts)
    verts.append((x_max, cy, cz))

    faces = []
    for i in range(segments):
        i_next = (i + 1) % segments
        l0 = i * 2
        r0 = l0 + 1
        l1 = i_next * 2
        r1 = l1 + 1
        faces.append((l0, r0, r1, l1))

    # Caps (reversed triangle winding so end cap normals point outward)
    for i in range(segments):
        i_next = (i + 1) % segments
        l0 = i * 2
        l1 = i_next * 2
        faces.append((c_left_idx, l0, l1))
        r0 = i * 2 + 1
        r1 = i_next * 2 + 1
        faces.append((c_right_idx, r1, r0))

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    uv_layer = mesh.uv_layers.new(name="UVMap")
    uv_data = uv_layer.data

    for poly in mesh.polygons:
        if smooth and len(poly.vertices) == 4:
            poly.use_smooth = True
        for loop_idx in poly.loop_indices:
            v_idx = mesh.loops[loop_idx].vertex_index
            vx, vy, vz = verts[v_idx]
            if v_idx in (c_left_idx, c_right_idx):
                uv_data[loop_idx].uv = (0.5, 0.5)
            else:
                ang = math.atan2(vy - cy, vz - cz)
                u = (vx - x_min) / max(0.001, length)
                v = (ang / (2.0 * math.pi)) % 1.0
                uv_data[loop_idx].uv = (u, v)

    mesh.update()
    return _link_and_assign(mesh, name, mat, parent)


def _create_lap_siding_wall(name, p0, p1, z_bot, z_top, normal_xy, course_h=0.145, bevel_depth=0.018, mat=None, parent=None):
    """Generate layered horizontal lap-board siding with physical overlapping edge relief and shadow reveals."""
    x0, y0 = p0
    x1, y1 = p1
    nx, ny = normal_xy
    n_len = math.hypot(nx, ny)
    if n_len > 1e-5:
        nx /= n_len
        ny /= n_len

    dx = x1 - x0
    dy = y1 - y0
    wall_len = math.hypot(dx, dy)
    total_h = z_top - z_bot
    num_courses = max(1, int(round(total_h / course_h)))
    step_h = total_h / num_courses
    overlap = 0.022
    wall_thick = 0.045

    # Derive orientation from wall tangent crossed with up and check alignment with declared outward normal
    tangent = mathutils.Vector((dx, dy, 0.0))
    up = mathutils.Vector((0.0, 0.0, 1.0))
    derived_normal = tangent.cross(up)
    outward_target = mathutils.Vector((nx, ny, 0.0))
    reverse_faces = (derived_normal.dot(outward_target) < 0.0)

    verts = []
    faces = []

    for c in range(num_courses):
        zc_bot = z_bot + c * step_h - (overlap if c > 0 else 0.0)
        zc_top = z_bot + (c + 1) * step_h
        base_v = len(verts)

        # Back face interior plane
        bx0 = x0 - nx * wall_thick
        by0 = y0 - ny * wall_thick
        bx1 = x1 - nx * wall_thick
        by1 = y1 - ny * wall_thick

        # Front face bevelled outward towards the bottom lip
        fx0_top = x0 + nx * 0.006
        fy0_top = y0 + ny * 0.006
        fx1_top = x1 + nx * 0.006
        fy1_top = y1 + ny * 0.006

        fx0_bot = x0 + nx * (0.006 + bevel_depth)
        fy0_bot = y0 + ny * (0.006 + bevel_depth)
        fx1_bot = x1 + nx * (0.006 + bevel_depth)
        fy1_bot = y1 + ny * (0.006 + bevel_depth)

        verts.extend([
            (fx0_bot, fy0_bot, zc_bot),  # 0: front-left-bot lip
            (fx1_bot, fy1_bot, zc_bot),  # 1: front-right-bot lip
            (fx1_top, fy1_top, zc_top),  # 2: front-right-top
            (fx0_top, fy0_top, zc_top),  # 3: front-left-top
            (bx0, by0, zc_bot),          # 4: back-left-bot
            (bx1, by1, zc_bot),          # 5: back-right-bot
            (bx1, by1, zc_top),          # 6: back-right-top
            (bx0, by0, zc_top),          # 7: back-left-top
        ])

        faces.extend([
            (base_v + 0, base_v + 1, base_v + 2, base_v + 3),  # Front sloped lap face
            (base_v + 7, base_v + 6, base_v + 5, base_v + 4),  # Back interior face
            (base_v + 4, base_v + 5, base_v + 1, base_v + 0),  # Bottom drip lip face (shadow reveal)
            (base_v + 3, base_v + 2, base_v + 6, base_v + 7),  # Top rim face
            (base_v + 0, base_v + 3, base_v + 7, base_v + 4),  # Left end cap
            (base_v + 1, base_v + 5, base_v + 6, base_v + 2),  # Right end cap
        ])

    if reverse_faces:
        faces = [tuple(reversed(f)) for f in faces]

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    uv_layer = mesh.uv_layers.new(name="UVMap")
    uv_data = uv_layer.data

    for poly in mesh.polygons:
        for loop_idx in poly.loop_indices:
            v_idx = mesh.loops[loop_idx].vertex_index
            vx, vy, vz = verts[v_idx]
            dist = math.hypot(vx - x0, vy - y0)
            u = dist / max(0.001, wall_len) * 2.0
            v = (vz - z_bot) / max(0.001, total_h) * (num_courses * 0.5)
            uv_data[loop_idx].uv = (u, v)

    mesh.update()
    obj = _link_and_assign(mesh, name, mat, parent)
    obj["authoredEdgeFinish"] = True
    mesh["authoredEdgeFinish"] = True
    return obj


def _create_lathed_mesh(name, profile_pts, center_xy=(0.0, 0.0), segments=24, mat=None, parent=None, smooth=True):
    """Generate a rotational surface from a 2D profile [(r, z), ...] revolved around Z."""
    cx, cy = center_xy
    verts = []
    num_rings = len(profile_pts)

    arc_lens = [0.0]
    for k in range(1, num_rings):
        dr = profile_pts[k][0] - profile_pts[k - 1][0]
        dz = profile_pts[k][1] - profile_pts[k - 1][1]
        arc_lens.append(arc_lens[-1] + math.sqrt(dr * dr + dz * dz))
    total_arc = max(0.001, arc_lens[-1])

    for k, (r, z) in enumerate(profile_pts):
        if r < 1e-4:
            verts.append((cx, cy, z))
        else:
            for i in range(segments):
                theta = (2.0 * math.pi * i) / segments
                verts.append((cx + r * math.cos(theta), cy + r * math.sin(theta), z))

    faces = []
    uv_per_face_loop = []

    def get_v_idx(k, i):
        r, _ = profile_pts[k]
        if r < 1e-4:
            idx = 0
            for prev_k in range(k):
                idx += 1 if profile_pts[prev_k][0] < 1e-4 else segments
            return idx
        idx = 0
        for prev_k in range(k):
            idx += 1 if profile_pts[prev_k][0] < 1e-4 else segments
        return idx + i

    for k in range(num_rings - 1):
        r0, _ = profile_pts[k]
        r1, _ = profile_pts[k + 1]
        v_low = arc_lens[k] / total_arc
        v_high = arc_lens[k + 1] / total_arc

        if r0 < 1e-4 and r1 < 1e-4:
            continue
        elif r0 < 1e-4:
            top_center = get_v_idx(k, 0)
            for i in range(segments):
                i_next = (i + 1) % segments
                b0 = get_v_idx(k + 1, i)
                b1 = get_v_idx(k + 1, i_next)
                faces.append((top_center, b1, b0))
                u0 = i / segments
                u1 = (i + 1) / segments
                uv_per_face_loop.append([( (u0 + u1) * 0.5, v_low ), (u1, v_high), (u0, v_high)])
        elif r1 < 1e-4:
            top_center = get_v_idx(k + 1, 0)
            for i in range(segments):
                i_next = (i + 1) % segments
                b0 = get_v_idx(k, i)
                b1 = get_v_idx(k, i_next)
                faces.append((top_center, b0, b1))
                u0 = i / segments
                u1 = (i + 1) / segments
                uv_per_face_loop.append([( (u0 + u1) * 0.5, v_high ), (u0, v_low), (u1, v_low)])
        else:
            for i in range(segments):
                i_next = (i + 1) % segments
                v0 = get_v_idx(k, i)
                v1 = get_v_idx(k, i_next)
                v2 = get_v_idx(k + 1, i_next)
                v3 = get_v_idx(k + 1, i)
                faces.append((v0, v1, v2, v3))
                u0 = i / segments
                u1 = (i + 1) / segments
                uv_per_face_loop.append([(u0, v_low), (u1, v_low), (u1, v_high), (u0, v_high)])

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    uv_layer = mesh.uv_layers.new(name="UVMap")
    uv_data = uv_layer.data

    for poly_idx, poly in enumerate(mesh.polygons):
        if smooth:
            poly.use_smooth = True
        uvs = uv_per_face_loop[poly_idx]
        for loop_idx, uv in zip(poly.loop_indices, uvs):
            uv_data[loop_idx].uv = uv

    mesh.update()
    return _link_and_assign(mesh, name, mat, parent)


def _create_hipped_roof(name, base_min, base_max, top_min, top_max, z_bot, z_top, mat=None, parent=None, uv_scale=3.0):
    """Generate a 4-sided truncated pyramid/hipped roof with course-aligned UVs."""
    bx0, by0 = base_min
    bx1, by1 = base_max
    tx0, ty0 = top_min
    tx1, ty1 = top_max

    verts = [
        (bx0, by0, z_bot), (bx1, by0, z_bot), (bx1, by1, z_bot), (bx0, by1, z_bot),  # Base: 0, 1, 2, 3
        (tx0, ty0, z_top), (tx1, ty0, z_top), (tx1, ty1, z_top), (tx0, ty1, z_top),  # Top:  4, 5, 6, 7
    ]
    faces = [
        (0, 1, 5, 4),  # Front (-Y)
        (1, 2, 6, 5),  # Right (+X)
        (2, 3, 7, 6),  # Back (+Y)
        (3, 0, 4, 7),  # Left (-X)
        (4, 5, 6, 7),  # Top cap
        (3, 2, 1, 0),  # Bottom soffit
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
            normal = poly.normal
            if abs(normal.z) > 0.6:
                u = (vx - bx0) / max(0.001, (bx1 - bx0)) * uv_scale
                v = (vy - by0) / max(0.001, (by1 - by0)) * uv_scale
            else:
                v = (vz - z_bot) / max(0.001, (z_top - z_bot)) * uv_scale
                if abs(normal.y) > 0.5:
                    u = (vx - bx0) / max(0.001, (bx1 - bx0)) * uv_scale
                else:
                    u = (vy - by0) / max(0.001, (by1 - by0)) * uv_scale
            uv_data[loop_idx].uv = (u, v)

    return _link_and_assign(mesh, name, mat, parent)


# ---------------------------------------------------------------------------
# Specialized Architectural & Landmark Generators
# ---------------------------------------------------------------------------

def _create_ruffled_lettuce(name, center_xy, center_z, inner_r=0.30, outer_r=0.64, waves=16, amp=0.035, thickness=0.016, mat=None, parent=None):
    """Generate a solid manifold ruffled leaf ring with natural organic folds and thickness."""
    cx, cy = center_xy
    verts = []
    faces = []
    segments = waves * 4

    for i in range(segments):
        theta = (2.0 * math.pi * i) / segments
        wave_z = amp * math.sin(waves * theta) + (amp * 0.35) * math.sin(waves * 2 * theta + 0.5)
        rad_wave = outer_r + 0.035 * math.sin(waves * theta * 1.5)

        cos_t = math.cos(theta)
        sin_t = math.sin(theta)

        p_in_top = (cx + inner_r * cos_t, cy + inner_r * sin_t, center_z + wave_z * 0.15)
        p_in_bot = (cx + inner_r * cos_t, cy + inner_r * sin_t, center_z + wave_z * 0.15 - thickness)
        p_out_top = (cx + rad_wave * cos_t, cy + rad_wave * sin_t, center_z + wave_z)
        p_out_bot = (cx + rad_wave * cos_t, cy + rad_wave * sin_t, center_z + wave_z - thickness)

        verts.extend([p_in_top, p_in_bot, p_out_top, p_out_bot])

    for i in range(segments):
        i_next = (i + 1) % segments
        b = i * 4
        bn = i_next * 4
        faces.append((b + 0, b + 2, bn + 2, bn + 0))
        faces.append((b + 1, bn + 1, bn + 3, b + 3))
        faces.append((b + 2, b + 3, bn + 3, bn + 2))
        faces.append((b + 0, bn + 0, bn + 1, b + 1))

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    uv_layer = mesh.uv_layers.new(name="UVMap")
    uv_data = uv_layer.data

    for poly in mesh.polygons:
        poly.use_smooth = True
        for loop_idx in poly.loop_indices:
            v_idx = mesh.loops[loop_idx].vertex_index
            vx, vy, _ = verts[v_idx]
            u = 0.5 + (vx - cx) / (2.0 * outer_r)
            v = 0.5 + (vy - cy) / (2.0 * outer_r)
            uv_data[loop_idx].uv = (u, v)

    mesh.update()
    return _link_and_assign(mesh, name, mat, parent)


def _create_melted_cheese(name, center_xy, center_z, size=0.86, droop=0.13, thickness=0.012, mat=None, parent=None):
    """Generate a square melted American cheese slice draped over the burger with 4 drooping corners."""
    cx, cy = center_xy
    half_s = size / 2.0
    patty_radius = 0.54

    grid_n = 5
    verts_top = []
    verts_bot = []

    for gy in range(grid_n):
        fy = -1.0 + 2.0 * (gy / (grid_n - 1))
        vy = cy + fy * half_s
        for gx in range(grid_n):
            fx = -1.0 + 2.0 * (gx / (grid_n - 1))
            vx = cx + fx * half_s

            dist = math.sqrt((vx - cx) ** 2 + (vy - cy) ** 2)
            if dist > patty_radius:
                falloff = (dist - patty_radius) / max(0.001, (half_s * 1.414 - patty_radius))
                z_drop = -droop * (falloff ** 1.6)
            else:
                z_drop = 0.0

            verts_top.append((vx, vy, center_z + z_drop))
            verts_bot.append((vx, vy, center_z + z_drop - thickness))

    all_verts = verts_top + verts_bot
    top_offset = 0
    bot_offset = len(verts_top)

    faces = []
    for gy in range(grid_n - 1):
        for gx in range(grid_n - 1):
            t00 = top_offset + gy * grid_n + gx
            t10 = top_offset + gy * grid_n + (gx + 1)
            t11 = top_offset + (gy + 1) * grid_n + (gx + 1)
            t01 = top_offset + (gy + 1) * grid_n + gx
            faces.append((t00, t10, t11, t01))

            b00 = bot_offset + gy * grid_n + gx
            b10 = bot_offset + gy * grid_n + (gx + 1)
            b11 = bot_offset + (gy + 1) * grid_n + (gx + 1)
            b01 = bot_offset + (gy + 1) * grid_n + gx
            faces.append((b00, b01, b11, b10))

    # South rim
    for gx in range(grid_n - 1):
        t0 = top_offset + gx
        t1 = top_offset + gx + 1
        b0 = bot_offset + gx
        b1 = bot_offset + gx + 1
        faces.append((t0, t1, b1, b0))
    # North rim
    for gx in range(grid_n - 1):
        t0 = top_offset + (grid_n - 1) * grid_n + gx
        t1 = top_offset + (grid_n - 1) * grid_n + gx + 1
        b0 = bot_offset + (grid_n - 1) * grid_n + gx
        b1 = bot_offset + (grid_n - 1) * grid_n + gx + 1
        faces.append((t1, t0, b0, b1))
    # West rim
    for gy in range(grid_n - 1):
        t0 = top_offset + gy * grid_n
        t1 = top_offset + (gy + 1) * grid_n
        b0 = bot_offset + gy * grid_n
        b1 = bot_offset + (gy + 1) * grid_n
        faces.append((t1, t0, b0, b1))
    # East rim
    for gy in range(grid_n - 1):
        t0 = top_offset + gy * grid_n + (grid_n - 1)
        t1 = top_offset + (gy + 1) * grid_n + (grid_n - 1)
        b0 = bot_offset + gy * grid_n + (grid_n - 1)
        b1 = bot_offset + (gy + 1) * grid_n + (grid_n - 1)
        faces.append((t0, t1, b1, b0))

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(all_verts, [], faces)
    mesh.update()

    uv_layer = mesh.uv_layers.new(name="UVMap")
    uv_data = uv_layer.data

    for poly in mesh.polygons:
        poly.use_smooth = True
        for loop_idx in poly.loop_indices:
            v_idx = mesh.loops[loop_idx].vertex_index
            vx, vy, _ = all_verts[v_idx]
            uv_data[loop_idx].uv = (0.5 + (vx - cx) / size, 0.5 + (vy - cy) / size)

    mesh.update()
    return _link_and_assign(mesh, name, mat, parent)


def _create_sesame_seed(name, origin, normal, mat=None, parent=None):
    """Generate a single restrained teardrop sesame seed oriented along the bun dome normal."""
    ox, oy, oz = origin
    norm = mathutils.Vector(normal).normalized()
    tangent = norm.orthogonal().normalized()
    bitangent = norm.cross(tangent).normalized()

    len_s = 0.038
    wid_s = 0.020
    thk_s = 0.012

    p_tip = norm * 0.002 + tangent * (len_s * 0.55)
    p_tail = norm * 0.002 - tangent * (len_s * 0.45)
    p_left = norm * 0.002 - bitangent * (wid_s * 0.50)
    p_right = norm * 0.002 + bitangent * (wid_s * 0.50)
    p_peak = norm * thk_s + tangent * 0.004

    verts = [
        (ox + p_tip.x, oy + p_tip.y, oz + p_tip.z),
        (ox + p_tail.x, oy + p_tail.y, oz + p_tail.z),
        (ox + p_left.x, oy + p_left.y, oz + p_left.z),
        (ox + p_right.x, oy + p_right.y, oz + p_right.z),
        (ox + p_peak.x, oy + p_peak.y, oz + p_peak.z),
    ]

    faces = [
        (0, 3, 4),  # Front right
        (0, 4, 2),  # Front left
        (1, 4, 3),  # Back right
        (1, 2, 4),  # Back left
        (0, 2, 1, 3),  # Base against bun
    ]

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    uv_layer = mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        poly.use_smooth = True
        for loop_idx in poly.loop_indices:
            uv_layer.data[loop_idx].uv = (0.5, 0.5)

    mesh.update()
    return _link_and_assign(mesh, name, mat, parent)


def _create_striped_awning(name, origin, width, depth, drop_angle_deg, stripes=14, mat_red=None, mat_cream=None, parent=None):
    """Generate a cantilevered canopy with 3D thickness, alternating red/cream stripes,
    and an authentic scalloped valance silhouette."""
    ox, oy, oz = origin
    rad = math.radians(drop_angle_deg)
    cos_a = math.cos(rad)
    sin_a = math.sin(rad)
    thick = 0.038
    valance_base_drop = 0.040
    scallop_depth = 0.045
    valance_thick = 0.014

    stripe_w = width / stripes
    half_w = width / 2.0

    group_root = bpy.data.objects.new(name, None)
    group_root.location = (ox, oy, oz)
    if parent:
        group_root.parent = parent
    bpy.context.scene.collection.objects.link(group_root)

    scallop_segs = 6

    for i in range(stripes):
        mat = mat_red if (i % 2 == 0) else mat_cream
        sx0 = -half_w + i * stripe_w
        sx1 = sx0 + stripe_w

        y_front = -depth * cos_a
        z_front_top = -depth * sin_a
        z_front_bot = -depth * sin_a - thick

        p0 = (sx0, 0.0, 0.0)
        p1 = (sx1, 0.0, 0.0)
        p2 = (sx1, y_front, z_front_top)
        p3 = (sx0, y_front, z_front_top)

        p4 = (sx0, 0.0, -thick)
        p5 = (sx1, 0.0, -thick)
        p6 = (sx1, y_front + valance_thick, z_front_bot)
        p7 = (sx0, y_front + valance_thick, z_front_bot)

        verts = [p0, p1, p2, p3, p4, p5, p6, p7]
        faces = [
            (0, 3, 2, 1),  # Top slope (outward normal pointing up and forward)
            (4, 5, 6, 7),  # Underside ceiling slope (outward normal pointing down and backward)
            (0, 1, 5, 4),  # Back wall junction (outward normal pointing +Y)
        ]

        val_front_top_start = len(verts)
        val_front_bot_start = val_front_top_start + (scallop_segs + 1)
        val_back_bot_start = val_front_bot_start + (scallop_segs + 1)
        val_back_top_start = val_back_bot_start + (scallop_segs + 1)

        # 1. Front top row along nose
        for s in range(scallop_segs + 1):
            t = s / scallop_segs
            vx = sx0 + t * stripe_w
            verts.append((vx, y_front, z_front_top))

        # 2. Front bottom scalloped arch
        for s in range(scallop_segs + 1):
            t = s / scallop_segs
            vx = sx0 + t * stripe_w
            scallop_drop = valance_base_drop + scallop_depth * math.sin(t * math.pi)
            vz = z_front_bot - scallop_drop
            verts.append((vx, y_front, vz))

        # 3. Back bottom scalloped arch
        for s in range(scallop_segs + 1):
            t = s / scallop_segs
            vx = sx0 + t * stripe_w
            scallop_drop = valance_base_drop + scallop_depth * math.sin(t * math.pi)
            vz = z_front_bot - scallop_drop
            verts.append((vx, y_front + valance_thick, vz))

        # 4. Back top row along valance header
        for s in range(scallop_segs + 1):
            t = s / scallop_segs
            vx = sx0 + t * stripe_w
            verts.append((vx, y_front + valance_thick, z_front_bot))

        # Quads connecting the scalloped valance
        for s in range(scallop_segs):
            ft0 = val_front_top_start + s
            ft1 = val_front_top_start + s + 1
            fb0 = val_front_bot_start + s
            fb1 = val_front_bot_start + s + 1

            bt0 = val_back_top_start + s
            bt1 = val_back_top_start + s + 1
            bb0 = val_back_bot_start + s
            bb1 = val_back_bot_start + s + 1

            faces.append((fb0, fb1, ft1, ft0))  # Front scalloped facet (outward normal pointing -Y)
            faces.append((bt0, bt1, bb1, bb0))  # Back scalloped facet (outward normal pointing +Y)
            faces.append((fb0, bb0, bb1, fb1))  # Bottom scalloped rim (outward normal pointing -Z)

        # Lateral outer returns for end stripes
        if i == 0:
            faces.append((0, 4, 7, 3))  # Left body return (outward normal pointing -X)
            faces.append((val_front_top_start, val_back_top_start, val_back_bot_start, val_front_bot_start))  # Left valance return (outward normal pointing -X)

        if i == stripes - 1:
            faces.append((1, 2, 6, 5))  # Right body return (outward normal pointing +X)
            s_end = scallop_segs
            faces.append((val_front_top_start + s_end, val_front_bot_start + s_end, val_back_bot_start + s_end, val_back_top_start + s_end))  # Right valance return (outward normal pointing +X)

        mesh = bpy.data.meshes.new(f"{name}_Stripe_{i}")
        mesh.from_pydata(verts, [], faces)
        mesh.update()

        uv_l = mesh.uv_layers.new(name="UVMap")
        for poly in mesh.polygons:
            for loop_i in poly.loop_indices:
                v_i = mesh.loops[loop_i].vertex_index
                vx, vy, vz = verts[v_i]
                u = (vx - sx0) / stripe_w
                dist_slope = math.hypot(vy, vz)
                v = dist_slope / (depth + valance_base_drop + scallop_depth)
                uv_l.data[loop_i].uv = (u, v)

        mesh.update()
        _link_and_assign(mesh, f"{name}_Stripe_{i}", mat, group_root)

    return group_root


def _create_shutter(name, origin, width, height, slat_height=0.075, mat=None, parent=None):
    """Generate a roll-up security shutter curtain with corrugated horizontal slats."""
    ox, oy, oz = origin
    half_w = width / 2.0
    num_slats = int(math.ceil(height / slat_height))

    verts = []
    faces = []
    slat_thick = 0.024
    corrugate = 0.012

    for s in range(num_slats):
        sz0 = s * slat_height
        sz1 = min(height, (s + 1) * slat_height)
        v_base = len(verts)

        p0 = (-half_w, 0.0, sz0)
        p1 = (half_w, 0.0, sz0)
        p2 = (half_w, -corrugate, sz0 + slat_height * 0.5)
        p3 = (-half_w, -corrugate, sz0 + slat_height * 0.5)
        p4 = (half_w, 0.0, sz1)
        p5 = (-half_w, 0.0, sz1)

        p6 = (-half_w, slat_thick, sz0)
        p7 = (half_w, slat_thick, sz0)
        p8 = (half_w, slat_thick, sz1)
        p9 = (-half_w, slat_thick, sz1)

        verts.extend([p0, p1, p2, p3, p4, p5, p6, p7, p8, p9])
        faces.extend([
            (v_base + 0, v_base + 1, v_base + 2, v_base + 3),  # Lower front facet
            (v_base + 3, v_base + 2, v_base + 4, v_base + 5),  # Upper front facet
            (v_base + 7, v_base + 6, v_base + 9, v_base + 8),  # Back flat
            (v_base + 0, v_base + 3, v_base + 9, v_base + 6),  # Left end
            (v_base + 1, v_base + 7, v_base + 8, v_base + 2),  # Right end
        ])

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    uv_l = mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        for loop_i in poly.loop_indices:
            v_i = mesh.loops[loop_i].vertex_index
            vx, vy, vz = verts[v_i]
            u = (vx + half_w) / width
            v = vz / max(0.001, height) * 4.0
            uv_l.data[loop_i].uv = (u, v)

    mesh.update()
    obj = _link_and_assign(mesh, name, mat, parent)
    obj.location = (ox, oy, oz)
    return obj


def _create_commercial_grill(name, origin, mat_metal, mat_brass, mat_patty, parent=None):
    """Generate a commercial flat-top stainless steel burger griddle with sizzling patties."""
    ox, oy, oz = origin
    grill_root = bpy.data.objects.new(name, None)
    grill_root.location = (ox, oy, oz)
    if parent:
        grill_root.parent = parent
    bpy.context.scene.collection.objects.link(grill_root)

    gw = 0.82
    gd = 0.54
    gh = 0.32
    _create_prism(f"{name}_Cabinet", (-gw / 2, -gd / 2, 0.08), (gw / 2, gd / 2, 0.08 + gh), mat=mat_metal, parent=grill_root)

    leg_r = 0.022
    for lx, ly in [(-gw / 2 + 0.05, -gd / 2 + 0.05), (gw / 2 - 0.05, -gd / 2 + 0.05),
                  (-gw / 2 + 0.05, gd / 2 - 0.05), (gw / 2 - 0.05, gd / 2 - 0.05)]:
        _create_cylinder(f"{name}_Leg", leg_r, 0.08, segments=8, z_offset=0.0, center_xy=(lx, ly), mat=mat_metal, parent=grill_root)
        _create_cylinder(f"{name}_Foot", leg_r * 1.3, 0.02, segments=8, z_offset=0.0, center_xy=(lx, ly), mat=mat_brass, parent=grill_root)

    plate_z = 0.08 + gh
    _create_prism(f"{name}_Plate", (-gw / 2 + 0.02, -gd / 2 + 0.08, plate_z), (gw / 2 - 0.02, gd / 2 - 0.03, plate_z + 0.028), mat=mat_metal, parent=grill_root)

    _create_prism(f"{name}_Trough", (-gw / 2 + 0.03, -gd / 2 + 0.02, plate_z - 0.02), (gw / 2 - 0.03, -gd / 2 + 0.08, plate_z + 0.015), mat=mat_metal, parent=grill_root)
    _create_prism(f"{name}_GreaseDrawer", (-0.12, -gd / 2 - 0.01, plate_z - 0.12), (0.12, -gd / 2 + 0.02, plate_z - 0.02), mat=mat_brass, parent=grill_root)

    splash_h = 0.14
    _create_prism(f"{name}_SplashRear", (-gw / 2 + 0.01, gd / 2 - 0.03, plate_z), (gw / 2 - 0.01, gd / 2 - 0.01, plate_z + splash_h), mat=mat_metal, parent=grill_root)
    _create_prism(f"{name}_SplashLeft", (-gw / 2 + 0.01, -gd / 2 + 0.02, plate_z), (-gw / 2 + 0.03, gd / 2 - 0.01, plate_z + splash_h), mat=mat_metal, parent=grill_root)
    _create_prism(f"{name}_SplashRight", (gw / 2 - 0.03, -gd / 2 + 0.02, plate_z), (gw / 2 - 0.01, gd / 2 - 0.01, plate_z + splash_h), mat=mat_metal, parent=grill_root)

    for k, kx in enumerate([-0.25, 0.0, 0.25]):
        _create_cylinder(f"{name}_KnobBezel_{k}", 0.028, 0.012, segments=12, z_offset=plate_z - 0.08, center_xy=(kx, -gd / 2 - 0.005), mat=mat_brass, parent=grill_root)
        _create_cylinder(f"{name}_Knob_{k}", 0.022, 0.022, segments=12, z_offset=plate_z - 0.08, center_xy=(kx, -gd / 2 - 0.018), mat=mat_metal, parent=grill_root)

    patty_z = plate_z + 0.028
    patty_locs = [(-0.20, -0.05), (0.05, 0.08), (0.18, -0.08)]
    for p_i, (px, py) in enumerate(patty_locs):
        _create_cylinder(f"{name}_GrillingPatty_{p_i}", 0.085, 0.024, segments=14, z_offset=patty_z, center_xy=(px, py), mat=mat_patty, parent=grill_root, smooth=True)

    return grill_root


def _create_exhaust_hood(name, origin, mat_metal, parent=None):
    """Generate a commercial stainless steel kitchen ventilation hood with explicit face-oriented UV mapping."""
    ox, oy, oz = origin
    hood_root = bpy.data.objects.new(name, None)
    hood_root.location = (ox, oy, oz)
    if parent:
        hood_root.parent = parent
    bpy.context.scene.collection.objects.link(hood_root)

    hw = 1.05
    hd = 0.72
    h_top = 0.32

    verts = [
        (-hw / 2, -hd / 2, 0.0), (hw / 2, -hd / 2, 0.0),
        (hw / 2, hd / 2, 0.0), (-hw / 2, hd / 2, 0.0),
        (-hw / 2 * 0.75, -hd / 2 * 0.65, h_top), (hw / 2 * 0.75, -hd / 2 * 0.65, h_top),
        (hw / 2 * 0.75, hd / 2 * 0.65, h_top), (-hw / 2 * 0.75, hd / 2 * 0.65, h_top),
    ]
    faces = [
        (0, 1, 5, 4),  # Front slope
        (1, 2, 6, 5),  # Right slope
        (2, 3, 7, 6),  # Back slope
        (3, 0, 4, 7),  # Left slope
        (4, 5, 6, 7),  # Top cap
        (3, 2, 1, 0),  # Underside baffle cavity
    ]

    mesh = bpy.data.meshes.new(f"{name}_Canopy")
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    # Explicit face-oriented UV mapping to ensure GLB exporter succeeds
    uv_layer = mesh.uv_layers.new(name="UVMap")
    uv_data = uv_layer.data

    for poly in mesh.polygons:
        for loop_idx in poly.loop_indices:
            v_idx = mesh.loops[loop_idx].vertex_index
            vx, vy, vz = verts[v_idx]
            normal = poly.normal
            if abs(normal.z) > 0.6:
                u = (vx + hw / 2) / hw
                v = (vy + hd / 2) / hd
            elif abs(normal.y) > 0.5:
                u = (vx + hw / 2) / hw
                v = vz / max(0.001, h_top)
            else:
                u = (vy + hd / 2) / hd
                v = vz / max(0.001, h_top)
            uv_data[loop_idx].uv = (u, v)

    mesh.update()
    _link_and_assign(mesh, f"{name}_Canopy", mat_metal, hood_root)

    _create_prism(f"{name}_Rim", (-hw / 2 - 0.02, -hd / 2 - 0.02, -0.04), (hw / 2 + 0.02, hd / 2 + 0.02, 0.0), mat=mat_metal, parent=hood_root)

    for f_i, fx in enumerate([-0.30, -0.10, 0.10, 0.30]):
        _create_prism(f"{name}_Baffle_{f_i}", (fx - 0.07, -hd / 2 + 0.06, 0.01), (fx + 0.07, hd / 2 - 0.06, 0.035), mat=mat_metal, parent=hood_root)

    _create_cylinder(f"{name}_FlueCollar", 0.14, 0.45, segments=12, z_offset=h_top, center_xy=(0.0, 0.0), mat=mat_metal, parent=hood_root)

    return hood_root


def _create_cash_register(name, origin, mat_metal, mat_brass, mat_cream, parent=None):
    """Generate a detailed point-of-sale cash register with cash drawer and pole display."""
    ox, oy, oz = origin
    reg_root = bpy.data.objects.new(name, None)
    reg_root.location = (ox, oy, oz)
    if parent:
        reg_root.parent = parent
    bpy.context.scene.collection.objects.link(reg_root)

    _create_prism(f"{name}_CashDrawer", (-0.18, -0.16, 0.0), (0.18, 0.16, 0.08), mat=mat_metal, parent=reg_root)
    _create_prism(f"{name}_DrawerHandle", (-0.06, -0.175, 0.035), (0.06, -0.16, 0.055), mat=mat_brass, parent=reg_root)
    _create_cylinder(f"{name}_Keyhole", 0.008, 0.008, segments=8, z_offset=0.04, center_xy=(0.10, -0.165), mat=mat_brass, parent=reg_root)

    _create_prism(f"{name}_Chassis", (-0.15, -0.14, 0.08), (0.15, 0.14, 0.22), mat=mat_cream, parent=reg_root)

    for row in range(3):
        for col in range(4):
            kx = -0.09 + col * 0.045
            ky = -0.10 + row * 0.045
            _create_prism(f"{name}_Key_{row}_{col}", (kx - 0.016, ky - 0.016, 0.22), (kx + 0.016, ky + 0.016, 0.235), mat=mat_metal, parent=reg_root)

    _create_prism(f"{name}_ClerkScreen", (-0.10, 0.06, 0.22), (0.10, 0.12, 0.28), mat=mat_metal, parent=reg_root)

    _create_cylinder(f"{name}_Pole", 0.012, 0.16, segments=8, z_offset=0.18, center_xy=(0.10, -0.10), mat=mat_metal, parent=reg_root)
    _create_prism(f"{name}_CustomerDisplay", (0.02, -0.12, 0.34), (0.18, -0.06, 0.39), mat=mat_cream, parent=reg_root)

    return reg_root


def _create_menu_panel(name, origin, mat_timber, mat_brass, mat_cream, mat_red, parent=None):
    """Generate a wall-mounted framed menu panel displaying only Burger items."""
    ox, oy, oz = origin
    panel_root = bpy.data.objects.new(name, None)
    panel_root.location = (ox, oy, oz)
    if parent:
        panel_root.parent = parent
    bpy.context.scene.collection.objects.link(panel_root)

    pw = 0.58
    ph = 0.72
    pt = 0.035

    _create_prism(f"{name}_Frame", (-pw / 2, -pt, -ph / 2), (pw / 2, 0.0, ph / 2), mat=mat_timber, parent=panel_root)

    cb = 0.045
    for cx, cz in [(-pw / 2, -ph / 2), (pw / 2 - cb, -ph / 2), (-pw / 2, ph / 2 - cb), (pw / 2 - cb, ph / 2 - cb)]:
        _create_prism(f"{name}_CornerBracket", (cx, -pt - 0.005, cz), (cx + cb, -pt + 0.005, cz + cb), mat=mat_brass, parent=panel_root)

    _create_prism(f"{name}_Face", (-pw / 2 + 0.04, -pt - 0.008, -ph / 2 + 0.04), (pw / 2 - 0.04, -pt, ph / 2 - 0.04), mat=mat_cream, parent=panel_root)
    _create_prism(f"{name}_HeaderBanner", (-pw / 2 + 0.06, -pt - 0.014, ph / 2 - 0.16), (pw / 2 - 0.06, -pt - 0.006, ph / 2 - 0.06), mat=mat_red, parent=panel_root)

    _create_cylinder(f"{name}_IconBunTop", 0.042, 0.016, segments=12, z_offset=ph / 2 - 0.10, center_xy=(0.0, -pt - 0.018), mat=mat_cream, parent=panel_root, smooth=True)
    _create_cylinder(f"{name}_IconPatty", 0.045, 0.008, segments=12, z_offset=ph / 2 - 0.112, center_xy=(0.0, -pt - 0.018), mat=mat_timber, parent=panel_root)
    _create_cylinder(f"{name}_IconBunBot", 0.040, 0.010, segments=12, z_offset=ph / 2 - 0.126, center_xy=(0.0, -pt - 0.018), mat=mat_cream, parent=panel_root, smooth=True)

    items_z = [ph / 2 - 0.24, ph / 2 - 0.35, ph / 2 - 0.46, ph / 2 - 0.57]
    for row_i, rz in enumerate(items_z):
        _create_prism(f"{name}_ItemBar_{row_i}", (-pw / 2 + 0.08, -pt - 0.012, rz - 0.035), (pw / 2 - 0.08, -pt - 0.004, rz + 0.015), mat=mat_timber, parent=panel_root)
        _create_cylinder(f"{name}_ItemBullet_{row_i}", 0.012, 0.008, segments=8, z_offset=rz - 0.01, center_xy=(-pw / 2 + 0.12, -pt - 0.015), mat=mat_red, parent=panel_root)

    return panel_root


def _create_sign_letters(name, origin, mat_text, parent=None):
    """Generate crisp 3D dimensional lettering 'BURGERS' mounted on the front fascia."""
    ox, oy, oz = origin
    sign_root = bpy.data.objects.new(name, None)
    sign_root.location = (ox, oy, oz)
    if parent:
        sign_root.parent = parent
    bpy.context.scene.collection.objects.link(sign_root)

    glyphs = {
        "B": ["1110", "1001", "1110", "1001", "1110"],
        "U": ["1001", "1001", "1001", "1001", "0110"],
        "R": ["1110", "1001", "1110", "1010", "1001"],
        "G": ["0111", "1000", "1011", "1001", "0110"],
        "E": ["1111", "1000", "1110", "1000", "1111"],
        "S": ["0111", "1000", "0110", "0001", "1110"],
    }

    word = "BURGERS"
    spacing = 0.25
    total_len = len(word) * spacing
    start_x = -total_len / 2.0 + 0.02
    dot_w = 0.040
    dot_h = 0.042
    dot_thk = 0.026

    for l_idx, char in enumerate(word):
        if char not in glyphs:
            continue
        grid = glyphs[char]
        lx = start_x + l_idx * spacing
        for row_i, row in enumerate(grid):
            for col_i, bit in enumerate(row):
                if bit == "1":
                    bx = lx + col_i * dot_w
                    bz = 0.20 - row_i * dot_h
                    _create_prism(
                        f"Glyph_{l_idx}_{row_i}_{col_i}",
                        (bx, -dot_thk, bz), (bx + dot_w - 0.004, 0.0, bz + dot_h - 0.004),
                        mat=mat_text, parent=sign_root
                    )

    return sign_root


# ---------------------------------------------------------------------------
# Main Contract Entry Point: build(materials)
# ---------------------------------------------------------------------------

def build(materials):
    """Builds the complete single-frontage detailed Burger-stall asset module.

    Conforms strictly to AUTHORING-CONTRACT.md and returns English metadata.
    """
    # 1. Resolve Materials (<= 12 static material groups)
    mat_brick = _get_mat(materials, "brick", fallback_color=(0.55, 0.28, 0.20, 1.0), roughness=0.85)
    mat_timber = _get_mat(materials, "timber", fallback_color=(0.36, 0.20, 0.10, 1.0), roughness=0.60)

    # Independently copied and tinted ambientCG materials preserving normal/roughness maps
    raw_boards = _get_mat(materials, "boards", fallback_color=(0.95, 0.91, 0.82, 1.0), roughness=0.70)
    mat_boards = _copy_and_tint_material(raw_boards, (0.96, 0.92, 0.82), factor=0.82, name_suffix="_cream")

    raw_roof = _get_mat(materials, "roof", fallback_color=(0.78, 0.24, 0.16, 1.0), roughness=0.75)
    mat_roof = _copy_and_tint_material(raw_roof, (0.78, 0.24, 0.16), factor=0.80, name_suffix="_terracotta")

    mat_metal = _get_mat(materials, "metal", fallback_color=(0.35, 0.38, 0.40, 1.0), roughness=0.35, metalness=0.85)
    mat_brass = _get_mat(materials, "brass", fallback_color=(0.85, 0.65, 0.22, 1.0), roughness=0.30, metalness=0.85)
    mat_cream = _get_mat(materials, "cream", fallback_color=(0.95, 0.92, 0.82, 1.0), roughness=0.50)
    mat_red = _get_mat(materials, "paint_red", fallback_color=(0.78, 0.12, 0.10, 1.0), roughness=0.45)

    # Calm solid warm-grey painted metal for roller shutter (replaces busy repeating metal stripes)
    mat_shutter = _authored_mat(materials, None, "mat_burger_shutter", (0.52, 0.53, 0.55, 1.0), roughness=0.55, metalness=0.20)

    # 4 Dedicated solid-color food materials for the sculpted burger landmark
    mat_bun = _authored_mat(materials, None, "mat_burger_bun", (0.84, 0.54, 0.22, 1.0), roughness=0.65)         # Golden baked bun
    mat_patty = _authored_mat(materials, None, "mat_burger_patty", (0.24, 0.12, 0.06, 1.0), roughness=0.85)     # Savory grilled beef patty
    mat_cheese = _authored_mat(materials, None, "mat_burger_cheese", (0.98, 0.72, 0.12, 1.0), roughness=0.40)   # Melted American cheddar
    mat_lettuce = _authored_mat(materials, None, "mat_burger_lettuce", (0.16, 0.65, 0.20, 1.0), roughness=0.55) # Fresh crisp lettuce

    # 2. Root Empty Node
    root = bpy.data.objects.new("GroundRoot", None)
    root.location = (0.0, 0.0, 0.0)
    bpy.context.scene.collection.objects.link(root)

    # 3. Base Plinth & Perimeter Masonry Foundation (Z: 0.00 -> 0.18)
    _create_prism("Plinth_Foundation", (-1.65, -1.45, 0.0), (1.65, 1.40, 0.10), mat=mat_brick, parent=root)
    _create_prism("Plinth_SteppedKerb", (-1.55, -1.35, 0.10), (1.55, 1.30, 0.18), mat=mat_timber, parent=root)

    # 4. Corner Heavy Timber Posts & Structural Framing (Z: 0.18 -> 2.45)
    post_w = 0.18
    post_corners = [
        (-1.50, -1.30),  # Front Left (-X, -Y)
        (1.50, -1.30),   # Front Right (+X, -Y)
        (1.50, 1.25),    # Back Right (+X, +Y)
        (-1.50, 1.25),   # Back Left (-X, +Y)
    ]
    for i, (cx, cy) in enumerate(post_corners):
        _create_prism(
            f"CornerPost_{i}",
            (cx - post_w / 2, cy - post_w / 2, 0.18),
            (cx + post_w / 2, cy + post_w / 2, 2.45),
            mat=mat_timber, parent=root
        )
        _create_prism(
            f"CornerShoe_{i}",
            (cx - post_w * 0.60, cy - post_w * 0.60, 0.18),
            (cx + post_w * 0.60, cy + post_w * 0.60, 0.35),
            mat=mat_metal, parent=root
        )
        _create_prism(
            f"CornerBracket_{i}",
            (cx - post_w * 0.70, cy - post_w * 0.70, 2.30),
            (cx + post_w * 0.70, cy + post_w * 0.70, 2.45),
            mat=mat_timber, parent=root
        )

    # Continuous horizontal frieze/entablature beam at Z = 2.35 -> 2.48
    _create_prism("Entablature_Beam", (-1.60, -1.38, 2.35), (1.60, 1.32, 2.48), mat=mat_timber, parent=root)

    # 5. Exterior Enclosure Walls: Physical Layered Horizontal Lap-Board Siding
    # Left Wall (-X): Layered lap siding with edge relief
    _create_lap_siding_wall("Wall_Left_Siding", (-1.44, 1.18), (-1.44, -1.22), 0.18, 2.35, (-1.0, 0.0), mat=mat_boards, parent=root)

    # Right Wall (+X): Layered lap siding with edge relief
    _create_lap_siding_wall("Wall_Right_Siding", (1.44, -1.22), (1.44, 1.18), 0.18, 2.35, (1.0, 0.0), mat=mat_boards, parent=root)

    # Rear Wall (+Y): Siding flanking the staff door and header band above door
    _create_lap_siding_wall("Wall_Rear_Left_Siding", (-1.44, 1.21), (-0.48, 1.21), 0.18, 2.35, (0.0, 1.0), mat=mat_boards, parent=root)
    _create_lap_siding_wall("Wall_Rear_Right_Siding", (0.48, 1.21), (1.44, 1.21), 0.18, 2.35, (0.0, 1.0), mat=mat_boards, parent=root)
    _create_lap_siding_wall("Wall_Rear_Header_Siding", (-0.48, 1.21), (0.48, 1.21), 2.05, 2.35, (0.0, 1.0), mat=mat_boards, parent=root)

    # Staff Service Door on Rear Wall (+Y)
    _create_prism("Door_Frame_Rear", (-0.48, 1.17, 0.18), (0.48, 1.26, 2.08), mat=mat_timber, parent=root)
    _create_prism("Door_Panel_Rear", (-0.42, 1.19, 0.20), (0.42, 1.24, 2.04), mat=mat_cream, parent=root)
    _create_prism("Door_Handle_Rear", (0.32, 1.26, 1.05), (0.36, 1.30, 1.12), mat=mat_brass, parent=root)
    for l_i in range(3):
        lz = 1.75 + l_i * 0.08
        _create_prism(f"Door_Louver_{l_i}", (-0.32, 1.24, lz), (0.32, 1.26, lz + 0.05), mat=mat_metal, parent=root)

    # Rear exterior utility electrical junction box
    _create_prism("Rear_UtilityBox", (0.85, 1.25, 1.15), (1.15, 1.34, 1.55), mat=mat_metal, parent=root)
    _create_cylinder("Rear_UtilityConduit", 0.016, 0.95, segments=8, z_offset=0.20, center_xy=(0.92, 1.28), mat=mat_metal, parent=root)

    # 6. SINGLE ACTIVE FRONTAGE (-Y): Recessed Service Bay & Counter
    counter_z = 1.05
    opening_top_z = 2.15

    # Flanking front return piers with layered lap siding
    _create_lap_siding_wall("Front_Pier_Left_Siding", (-1.44, -1.26), (-1.10, -1.26), 0.18, 2.35, (0.0, -1.0), mat=mat_boards, parent=root)
    _create_lap_siding_wall("Front_Pier_Right_Siding", (1.10, -1.26), (1.44, -1.26), 0.18, 2.35, (0.0, -1.0), mat=mat_boards, parent=root)

    # Knee-wall / kickplate below the front counter with lap panelling (Z: 0.18 -> 0.98)
    _create_lap_siding_wall("Counter_Kickplate_Siding", (-1.10, -1.22), (1.10, -1.22), 0.18, 0.98, (0.0, -1.0), course_h=0.13, mat=mat_boards, parent=root)
    _create_prism("Counter_BaseShoe", (-1.14, -1.28, 0.18), (1.14, -1.24, 0.30), mat=mat_timber, parent=root)

    # HEAVY POLISHED TIMBER SERVICE COUNTER SLAB (Top at exactly 1.05m height!)
    _create_prism("Counter_Slab", (-1.18, -1.45, 0.98), (1.18, -0.80, counter_z), mat=mat_timber, parent=root)
    _create_prism("Counter_Bullnose", (-1.20, -1.48, 0.96), (1.20, -1.43, counter_z), mat=mat_brass, parent=root)

    # Side jambs framing the service opening
    _create_prism("Jamb_Left", (-1.14, -1.28, counter_z), (-1.08, -1.18, opening_top_z), mat=mat_timber, parent=root)
    _create_prism("Jamb_Right", (1.08, -1.28, counter_z), (1.14, -1.18, opening_top_z), mat=mat_timber, parent=root)

    # Permanent vertical guide channels on jamb inner edges
    _create_prism("ShutterTrack_Left", (-1.09, -1.24, counter_z), (-1.06, -1.20, opening_top_z), mat=mat_metal, parent=root)
    _create_prism("ShutterTrack_Right", (1.06, -1.24, counter_z), (1.09, -1.20, opening_top_z), mat=mat_metal, parent=root)

    # Upper horizontal shutter housing & valance above the opening (Z: 2.12 -> 2.35)
    _create_prism("Shutter_Housing", (-1.15, -1.30, opening_top_z - 0.03), (1.15, -1.15, opening_top_z + 0.20), mat=mat_timber, parent=root)

    # 7. COHERENT SHUTTER VISUAL STATES (OpenShutter & ClosedShutter)
    # State A: 'OpenShutter' Subtree (Visible in default Blender authoring pose)
    # Features a compact horizontal rolled coil in the upper housing, fully exposing counter & equipment
    open_shutter_root = bpy.data.objects.new("OpenShutter", None)
    open_shutter_root.location = (0.0, 0.0, 0.0)
    open_shutter_root.parent = root
    bpy.context.scene.collection.objects.link(open_shutter_root)

    # Horizontal rolled header cylinder oriented along X inside the upper housing (calm painted-metal mat_shutter)
    _create_horizontal_cylinder_x("Shutter_OpenRolledCoil", radius=0.075, length=2.14, segments=16, x_offset=-1.07, center_yz=(-1.22, 2.235), mat=mat_shutter, parent=open_shutter_root)
    _create_prism("Shutter_OpenMount_Left", (-1.08, -1.27, 2.16), (-1.06, -1.17, 2.31), mat=mat_metal, parent=open_shutter_root)
    _create_prism("Shutter_OpenMount_Right", (1.06, -1.27, 2.16), (1.08, -1.17, 2.31), mat=mat_metal, parent=open_shutter_root)
    _create_prism("Shutter_OpenBottomBar", (-1.07, -1.24, 2.13), (1.07, -1.20, 2.16), mat=mat_shutter, parent=open_shutter_root)
    _create_prism("Shutter_OpenPullHandle", (-0.06, -1.245, 2.115), (0.06, -1.225, 2.135), mat=mat_brass, parent=open_shutter_root)

    # State B: 'ClosedShutter' Subtree (Hidden by default in Blender authoring pose)
    # Features a full 1.10m curtain completely covering the opening down to counter level (Z = 1.05m)
    closed_shutter_root = bpy.data.objects.new("ClosedShutter", None)
    closed_shutter_root.location = (0.0, 0.0, 0.0)
    closed_shutter_root.parent = root
    bpy.context.scene.collection.objects.link(closed_shutter_root)

    # Full closed curtain covering opening between Z = 1.05m and Z = 2.15m at absolute building coordinates (calm solid mat_shutter)
    _create_shutter("ClosedShutter_Curtain", (0.0, -1.22, 1.05), width=2.14, height=1.10, slat_height=0.075, mat=mat_shutter, parent=closed_shutter_root)
    _create_prism("ClosedShutter_LockRail", (-1.07, -1.245, 1.05), (1.07, -1.195, 1.085), mat=mat_shutter, parent=closed_shutter_root)
    _create_prism("ClosedShutter_Padlock", (-0.04, -1.255, 1.055), (0.04, -1.235, 1.080), mat=mat_brass, parent=closed_shutter_root)
    _create_horizontal_cylinder_x("ClosedShutter_SpoolCore", radius=0.035, length=2.14, segments=12, x_offset=-1.07, center_yz=(-1.22, 2.235), mat=mat_shutter, parent=closed_shutter_root)

    # Set default Blender authoring visibility: OpenShutter visible, ClosedShutter hidden
    _set_visibility(open_shutter_root, True)
    _set_visibility(closed_shutter_root, False)

    # 8. COMMERCIAL KITCHEN EQUIPMENT (Inside the Recessed Counter Bay)
    _create_commercial_grill("GrillStation", (0.50, -0.55, counter_z - 0.15), mat_metal, mat_brass, mat_patty, parent=root)
    _create_exhaust_hood("ExhaustHood", (0.50, -0.55, 2.05), mat_metal, parent=root)

    # Cash register positioned safely behind closed shutter plane with 4.1cm clearance
    _create_cash_register("CashRegister", (-0.45, -0.98, counter_z), mat_metal, mat_brass, mat_cream, parent=root)

    _create_prism("PrepWorktop", (-0.05, -0.80, counter_z - 0.02), (0.15, -0.35, counter_z), mat=mat_metal, parent=root)
    _create_prism("Spatula_Blade", (0.02, -0.65, counter_z), (0.08, -0.52, counter_z + 0.004), mat=mat_metal, parent=root)
    _create_cylinder("Spatula_Handle", 0.012, 0.14, segments=8, z_offset=counter_z + 0.002, center_xy=(0.05, -0.72), mat=mat_timber, parent=root)
    _create_prism("UnderCounter_Shelf", (-1.05, -1.05, 0.55), (1.05, -0.35, 0.58), mat=mat_timber, parent=root)

    # 9. AWNING, UNOPPOSED PROMINENT SIGNAGE & MENU PANEL
    # Cantilevered striped canopy awning with 3D thickness and scalloped valance silhouette
    awning_origin = (0.0, -1.25, 2.44)
    _create_striped_awning("FrontAwning", awning_origin, width=2.70, depth=0.55, drop_angle_deg=22.0, stripes=14, mat_red=mat_red, mat_cream=mat_cream, parent=root)

    # 3 Cantilevered structural timber/metal brackets supporting the awning
    for bx in [-1.15, 0.0, 1.15]:
        _create_prism(f"AwningBracket_Top_{bx}", (bx - 0.035, -1.65, 2.18), (bx + 0.035, -1.26, 2.24), mat=mat_timber, parent=root)
        _create_prism(f"AwningBracket_Diag_{bx}", (bx - 0.025, -1.55, 1.91), (bx + 0.025, -1.26, 2.21), mat=mat_metal, parent=root)

    # Prominent Front Roof-Brow Sign Plaque (Mounted proudly above awning on front eaves - completely unoccluded)
    _create_prism("Sign_Mount_Left", (-0.92, -1.45, 2.46), (-0.84, -1.36, 2.80), mat=mat_timber, parent=root)
    _create_prism("Sign_Mount_Right", (0.84, -1.45, 2.46), (0.92, -1.36, 2.80), mat=mat_timber, parent=root)
    _create_prism("Sign_Plaque_Border", (-1.14, -1.48, 2.50), (1.14, -1.45, 2.86), mat=mat_cream, parent=root)
    _create_prism("Sign_Plaque_Main", (-1.10, -1.49, 2.52), (1.10, -1.46, 2.84), mat=mat_red, parent=root)
    for px, pz in [(-1.06, 2.54), (1.02, 2.54), (-1.06, 2.80), (1.02, 2.80)]:
        _create_prism(f"Sign_Rosette_{px}_{pz}", (px, -1.495, pz), (px + 0.04, -1.485, pz + 0.04), mat=mat_brass, parent=root)
    _create_sign_letters("Sign_Letters", (0.0, -1.49, 2.54), mat_text=mat_cream, parent=root)

    menu_pos = (-1.28, -1.26, 1.55)
    _create_menu_panel("BurgerMenuPanel", menu_pos, mat_timber, mat_brass, mat_cream, mat_red, parent=root)

    # 10. MAIN HIPPED TERRACOTTA ROOF & EAVES
    _create_hipped_roof("Roof_EavesSoffit", (-1.78, -1.55), (1.78, 1.48), (-1.55, -1.35), (1.55, 1.28), 2.44, 2.60, mat=mat_roof, parent=root, uv_scale=3.5)

    for rx in [-1.60, -1.20, -0.80, -0.40, 0.0, 0.40, 0.80, 1.20, 1.60]:
        _create_prism(f"RafterTail_Front_{rx}", (rx - 0.035, -1.54, 2.42), (rx + 0.035, -1.32, 2.50), mat=mat_timber, parent=root)
        _create_prism(f"RafterTail_Rear_{rx}", (rx - 0.035, 1.28, 2.42), (rx + 0.035, 1.48, 2.50), mat=mat_timber, parent=root)

    _create_hipped_roof("Roof_MainHip", (-1.55, -1.35), (1.55, 1.28), (-0.85, -0.75), (0.85, 0.68), 2.60, 2.96, mat=mat_roof, parent=root, uv_scale=4.0)
    _create_prism("Roof_RidgeDeck", (-0.88, -0.78, 2.94), (0.88, 0.72, 3.02), mat=mat_timber, parent=root)

    _create_cylinder("Rooftop_ExhaustFlue", 0.12, 0.28, segments=12, z_offset=2.96, center_xy=(0.50, -0.55), mat=mat_metal, parent=root)
    _create_cylinder("Rooftop_VentCowl", 0.20, 0.06, segments=12, z_offset=3.20, center_xy=(0.50, -0.55), mat=mat_metal, parent=root, smooth=True)

    # 11. CROWNING SCULPTED LAYERED BURGER LANDMARK (On Roof Ridge)
    landmark_center = (0.0, -0.05)
    base_landmark_z = 3.02

    _create_prism("SignPedestal_Base", (-0.75, -0.65, base_landmark_z), (0.75, 0.55, base_landmark_z + 0.08), mat=mat_cream, parent=root)
    _create_prism("SignPedestal_Collar", (-0.68, -0.58, base_landmark_z + 0.08), (0.68, 0.48, base_landmark_z + 0.14), mat=mat_red, parent=root)

    burger_base_z = base_landmark_z + 0.14
    obj_tt = _create_cylinder("Burger_TurnTable", 0.58, 0.035, segments=24, z_offset=burger_base_z, center_xy=landmark_center, mat=mat_brass, parent=root, smooth=True)
    obj_tt["authoredEdgeFinish"] = True

    # A. Bottom Bun
    bun_bot_z0 = burger_base_z + 0.035
    bun_bot_profile = [
        (0.00, bun_bot_z0),
        (0.20, bun_bot_z0),
        (0.42, bun_bot_z0 + 0.015),
        (0.52, bun_bot_z0 + 0.045),
        (0.55, bun_bot_z0 + 0.080),
        (0.54, bun_bot_z0 + 0.105),
        (0.50, bun_bot_z0 + 0.110),
        (0.00, bun_bot_z0 + 0.110),
    ]
    obj_bb = _create_lathed_mesh("Burger_BottomBun", bun_bot_profile, center_xy=landmark_center, segments=24, mat=mat_bun, parent=root, smooth=True)
    obj_bb["authoredEdgeFinish"] = True

    # B. Savory Grilled Beef Patty
    patty_z0 = bun_bot_z0 + 0.105
    patty_profile = [
        (0.00, patty_z0),
        (0.50, patty_z0),
        (0.57, patty_z0 + 0.018),
        (0.58, patty_z0 + 0.045),
        (0.57, patty_z0 + 0.072),
        (0.50, patty_z0 + 0.088),
        (0.00, patty_z0 + 0.088),
    ]
    obj_bp = _create_lathed_mesh("Burger_Patty", patty_profile, center_xy=landmark_center, segments=24, mat=mat_patty, parent=root, smooth=True)
    obj_bp["authoredEdgeFinish"] = True

    # C. Melted American Cheese Slice
    cheese_z = patty_z0 + 0.088
    obj_ch = _create_melted_cheese("Burger_Cheese", landmark_center, cheese_z, size=0.86, droop=0.13, thickness=0.012, mat=mat_cheese, parent=root)
    obj_ch["authoredEdgeFinish"] = True

    # D. Fresh Ruffled Green Lettuce
    lettuce_z = cheese_z + 0.014
    obj_lt = _create_ruffled_lettuce("Burger_Lettuce", landmark_center, lettuce_z, inner_r=0.28, outer_r=0.64, waves=16, amp=0.036, thickness=0.016, mat=mat_lettuce, parent=root)
    obj_lt["authoredEdgeFinish"] = True

    # E. Sliced Ripe Red Tomatoes
    tomato_z = lettuce_z + 0.018
    obj_t1 = _create_cylinder("Burger_Tomato_1", 0.24, 0.038, segments=18, z_offset=tomato_z, center_xy=(-0.16, -0.12), mat=mat_red, parent=root, smooth=True)
    obj_t1["authoredEdgeFinish"] = True
    obj_t2 = _create_cylinder("Burger_Tomato_2", 0.24, 0.038, segments=18, z_offset=tomato_z + 0.006, center_xy=(0.16, 0.02), mat=mat_red, parent=root, smooth=True)
    obj_t2["authoredEdgeFinish"] = True

    # F. Top Crown Bun (Smooth parabolic dome without flat shoulder)
    bun_top_z0 = tomato_z + 0.032
    bun_top_profile = [
        (0.00, bun_top_z0),
        (0.50, bun_top_z0),
        (0.56, bun_top_z0 + 0.020),
        (0.55, bun_top_z0 + 0.065),
        (0.50, bun_top_z0 + 0.120),
        (0.42, bun_top_z0 + 0.170),
        (0.31, bun_top_z0 + 0.215),
        (0.17, bun_top_z0 + 0.245),
        (0.00, bun_top_z0 + 0.255),
    ]
    obj_tb = _create_lathed_mesh("Burger_TopBun", bun_top_profile, center_xy=landmark_center, segments=28, mat=mat_bun, parent=root, smooth=True)
    obj_tb["authoredEdgeFinish"] = True

    # G. Restrained Sesame Seeds (Proud on the actual dome crust surface)
    sesame_coords = [
        (15, 0.38, 0.189), (45, 0.44, 0.160), (75, 0.32, 0.214), (105, 0.42, 0.173),
        (135, 0.25, 0.231), (165, 0.45, 0.154), (195, 0.36, 0.198), (225, 0.28, 0.224),
        (255, 0.43, 0.167), (285, 0.35, 0.202), (315, 0.22, 0.237), (345, 0.46, 0.148),
        (30, 0.18, 0.246), (90, 0.15, 0.249), (150, 0.12, 0.251), (210, 0.16, 0.249),
        (270, 0.14, 0.250), (330, 0.17, 0.248), (60, 0.26, 0.229), (240, 0.24, 0.233)
    ]
    for s_idx, (s_deg, s_r, s_dz) in enumerate(sesame_coords):
        s_rad = math.radians(s_deg)
        sx = landmark_center[0] + s_r * math.cos(s_rad)
        sy = landmark_center[1] + s_r * math.sin(s_rad)
        sz = bun_top_z0 + s_dz
        slope_r = max(0.15, s_r / 0.50 * 0.45)
        s_norm = (math.cos(s_rad) * slope_r, math.sin(s_rad) * slope_r, 0.50)
        seed_obj = _create_sesame_seed(f"SesameSeed_{s_idx}", (sx, sy, sz), s_norm, mat=mat_cream, parent=root)
        seed_obj["authoredEdgeFinish"] = True

    # 12. CONTRACT RIG EMPTIES / ANCHORS
    counter_front_anchor = bpy.data.objects.new("CounterFront", None)
    counter_front_anchor.location = (0.0, -1.45, counter_z)
    counter_front_anchor.parent = root
    bpy.context.scene.collection.objects.link(counter_front_anchor)

    product_sign_anchor = bpy.data.objects.new("ProductSign", None)
    product_sign_anchor.location = (landmark_center[0], landmark_center[1], bun_top_z0 + 0.12)
    product_sign_anchor.parent = root
    bpy.context.scene.collection.objects.link(product_sign_anchor)

    menu_panel_anchor = bpy.data.objects.new("MenuPanel", None)
    menu_panel_anchor.location = (menu_pos[0], menu_pos[1] - 0.05, menu_pos[2])
    menu_panel_anchor.parent = root
    bpy.context.scene.collection.objects.link(menu_panel_anchor)

    anchors = {
        "GroundRoot": root,
        "CounterFront": counter_front_anchor,
        "ProductSign": product_sign_anchor,
        "MenuPanel": menu_panel_anchor,
        "ClosedShutter": closed_shutter_root,
        "OpenShutter": open_shutter_root,
    }

    # 13. RETURN METADATA
    return {
        "assetId": "burger_stall",
        "referenceVariant": "single_frontage_burger_stall",
        "candidateDimensions": (3.56, 3.50, 3.72),
        "anchors": anchors,
        "shutterStates": {
            "openNode": "OpenShutter",
            "closedNode": "ClosedShutter",
            "defaultState": "open",
        },
        "restraints": [],
        "derivedTextures": [
            {
                "material": "boards_cream",
                "sourceTexture": "WoodFloor043_1K-PNG_Color.png",
                "derivedTexture": "WoodFloor043_1K-PNG_Color_cream",
                "tint": [0.96, 0.92, 0.82],
                "factor": 0.82,
                "role": "Wall lap-board siding cream albedo",
            },
            {
                "material": "roof_terracotta",
                "sourceTexture": "RoofingTiles013A_1K-PNG_Color.png",
                "derivedTexture": "RoofingTiles013A_1K-PNG_Color_terracotta",
                "tint": [0.78, 0.24, 0.16],
                "factor": 0.80,
                "role": "Hipped roof terracotta shingle albedo",
            },
        ],
        "notes": (
            'Independent single-frontage detailed stall with unit anchors and exclusive open/closed shutter states. Authored dimensions are design intent; actual exported bounds and resource measurements are recorded in the source manifest.'
        ),
        "geometryIntent": (
            "Theme-park consumable food stall serving exclusively Burger products. "
            "Features warm cream painted lap-board siding, terracotta hipped roof, cantilevered striped awning with scalloped valance, "
            "unoccluded dimensional BURGERS signage on the front roof brow, recessed service bay with 1.05m counter and commercial kitchen equipment, "
            "dual normalized OpenShutter/ClosedShutter visual states for facility.open toggling, and a crowning sculpted layered burger landmark. "
            "Explicit UVs on all meshes, correct outward face winding on all lathe caps and siding courses, smooth normals on organic features, "
            "rigid node hierarchy parented to GroundRoot, and strict bounds within the 4m tile footprint without rescale."
        ),
    }
