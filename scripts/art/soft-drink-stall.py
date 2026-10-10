"""soft-drink-stall.py - Complete independently authored detailed Soft-drink stall Blender module.

Conforms strictly to AUTHORING-CONTRACT.md and inputs/prior-authoring-contract.md:
- Blender Authoring axes: +X right, -Y frontage, +Z up; origin (0, 0, 0) at ground reference.
- Candidate render pitch: Fits 4m square tile:
    * Mesh X/Y bounds strictly within +/-1.95m (authored design footprint ~3.64m x 3.44m)
    * Mesh Z bounds strictly within 0.00m to 3.79m (under the 3.85m contract ceiling)
- Single frontage at -Y:
    * Genuinely recessed service opening with counter slab at exactly 1.05m height
    * Commercial beverage equipment positioned behind the closed curtain line (Y > -1.22):
      - Multi-valve commercial soda fountain dispenser with shaped swan-neck tap heads,
        dispensing levers, drip tray, slotted drain grille, and ice hopper
      - Point-of-sale cash register at Y=-0.97 (handle at Y=-1.165, maintaining >0.05m clearance
        behind the closed shutter backplane at Y=-1.22)
      - Stainless tiered cup organizer fixture rack
    * Coherent addressable visual shutter states in one asset (groups at origin):
      - 'OpenShutter': compact horizontal rolled coil in upper housing, visible by default,
        completely exposing counter and equipment
      - 'ClosedShutter': calm solid opaque curtain covering opening down to counter level (1.05m),
        hidden by default, ready for Root facility.open authority to toggle
      Both states strictly remain within horizontal [-1.95, 1.95] and vertical [0.0, 3.85].
- Architecture & Distinct Broad Silhouette:
    * Distinct broad pavilion/canopy silhouette contrasting with the Burger hipped roof
    * Independently copied/tinted calm warm cream siding preserving ambientCG CC0 grain/normal/roughness
    * Light coherent teal/neutral roof compatible with Burger palette
    * Teal structural framing accents, corner shoes, entablature beam, and decorative brackets
    * Cantilevered teal and cream striped awning with mathematically verified outward normal winding
    * Sweeping broad pavilion eave cornice with exposed scrolled rafter tails
    * Broad low flared pavilion roof with genuinely slender sloped seams following the roof surface (no fins)
    * Compact low-profile clerestory monitor vent chassis with louvered ventilation slats
    * Ventilated back service door with louvers, brass handle, and exterior utility conduit
- Exterior Signage & Menu:
    * Prominent exterior contrasting "SOFT DRINKS" marquee plaque mounted on front pediment
      at Z = 2.70m, remaining completely clear of awning occlusion from all viewing angles
    * Wall-mounted framed menu panel displaying soft drink items and fizz iconography
- Crowning sculpted soda can landmark on roof turntable:
    * Sized intentionally for park overview readability (height 0.75m, diameter 0.66m, top Z ~3.78m)
    * Hand-modelled rounded concave bottom dome, standing chime foot, and tapered lower flare
    * Cylindrical body with designed neutral teal/cream dynamic graphic bands and 3D effervescence relief
    * Rounded shoulder curve, neck furrow, rolled double-seam lip rim, and sunken top lid
    * Embossed aperture score line and hand-modelled ring-pull tab with rivet and finger loop
    * Mathematically verified outward normal winding on all lathe profile segments and caps
- Six real named anchors: GroundRoot, CounterFront, ProductSign, MenuPanel, OpenShutter, ClosedShutter.
- Explicit UV coordinates on every textured mesh; <= 12 static material groups; candidate budget 6-15k tris.
"""

import math
import bpy
import mathutils


# ---------------------------------------------------------------------------
# Material Resolution & Independent Tinting Helpers
# ---------------------------------------------------------------------------

def _get_mat(materials, key, fallback_color=(0.5, 0.5, 0.5, 1.0), roughness=0.6, metalness=0.0):
    """Retrieve material by key from dictionary or generate clean fallback if missing."""
    if materials and key in materials and materials[key]:
        return materials[key]
    mat_name = f"mat_softdrink_{key}"
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



def _link_and_assign(mesh, name, mat, parent=None, smooth=False, authored_edge_finish=False):
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
    if authored_edge_finish:
        obj["authoredEdgeFinish"] = True
        mesh["authoredEdgeFinish"] = True
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

def _create_prism(name, min_pt, max_pt, mat=None, parent=None, uv_scale=1.0, authored_edge_finish=False):
    """Generate an axis-aligned box with explicit 6-face UV mapping and outward normals."""
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

    mesh.update()
    return _link_and_assign(mesh, name, mat, parent, authored_edge_finish=authored_edge_finish)


def _create_cylinder(name, radius, height, segments=16, z_offset=0.0, center_xy=(0.0, 0.0), mat=None, parent=None, smooth=True, authored_edge_finish=False):
    """Generate a vertical cylinder with flat end caps, outward normals, and cylindrical UV unwrap."""
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

    # Caps with verified outward-facing normals
    for i in range(segments):
        i_next = (i + 1) % segments
        b0 = i * 2
        b1 = i_next * 2
        faces.append((c_bot_idx, b1, b0))  # Bottom cap points -Z
        t0 = i * 2 + 1
        t1 = i_next * 2 + 1
        faces.append((c_top_idx, t0, t1))  # Top cap points +Z

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
    return _link_and_assign(mesh, name, mat, parent, authored_edge_finish=authored_edge_finish)


def _create_horizontal_cylinder_x(name, radius, length, segments=16, x_offset=-1.0, center_yz=(0.0, 0.0), mat=None, parent=None, smooth=True, authored_edge_finish=False):
    """Generate a horizontal cylinder aligned with X axis with outward end caps."""
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

    # Caps with verified outward winding
    for i in range(segments):
        i_next = (i + 1) % segments
        l0 = i * 2
        l1 = i_next * 2
        faces.append((c_left_idx, l0, l1))  # Points -X
        r0 = i * 2 + 1
        r1 = i_next * 2 + 1
        faces.append((c_right_idx, r1, r0))  # Points +X

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
    return _link_and_assign(mesh, name, mat, parent, authored_edge_finish=authored_edge_finish)


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

        bx0 = x0 - nx * wall_thick
        by0 = y0 - ny * wall_thick
        bx1 = x1 - nx * wall_thick
        by1 = y1 - ny * wall_thick

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
    return _link_and_assign(mesh, name, mat, parent, authored_edge_finish=True)


def _create_lathed_mesh(name, profile_pts, center_xy=(0.0, 0.0), segments=28, mat=None, parent=None, smooth=True):
    """Generate a rotational surface from a 2D profile [(r, z), ...] revolved around Z.

    Corrects the baseline's inverted cap winding mistake:
    - Bottom apex (r0 < 1e-4) winds (bot_center, b1, b0) pointing OUTWARD (-Z)
    - Top apex (r1 < 1e-4) winds (top_center, b0, b1) pointing OUTWARD (+Z)
    - Side quads wind (v0, v1, v2, v3) pointing radially OUTWARD (+r)
    """
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
            # Bottom apex: normal must point OUTWARD (-Z)
            bot_center = get_v_idx(k, 0)
            for i in range(segments):
                i_next = (i + 1) % segments
                b0 = get_v_idx(k + 1, i)
                b1 = get_v_idx(k + 1, i_next)
                faces.append((bot_center, b1, b0))
                u0 = i / segments
                u1 = (i + 1) / segments
                uv_per_face_loop.append([((u0 + u1) * 0.5, v_low), (u1, v_high), (u0, v_high)])
        elif r1 < 1e-4:
            # Top apex: normal must point OUTWARD (+Z)
            top_center = get_v_idx(k + 1, 0)
            for i in range(segments):
                i_next = (i + 1) % segments
                b0 = get_v_idx(k, i)
                b1 = get_v_idx(k, i_next)
                faces.append((top_center, b0, b1))
                u0 = i / segments
                u1 = (i + 1) / segments
                uv_per_face_loop.append([((u0 + u1) * 0.5, v_high), (u0, v_low), (u1, v_low)])
        else:
            # Revolved quad: normal points radially OUTWARD (+r)
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
    return _link_and_assign(mesh, name, mat, parent, authored_edge_finish=True)


def _create_hipped_roof(name, base_min, base_max, top_min, top_max, z_bot, z_top, mat=None, parent=None, uv_scale=3.0):
    """Generate a 4-sided truncated pavilion/roof section with course-aligned UVs."""
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
        (4, 5, 6, 7),  # Top cap (+Z)
        (3, 2, 1, 0),  # Bottom soffit (-Z)
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

    mesh.update()
    return _link_and_assign(mesh, name, mat, parent)


def _create_sloped_roof_seam(name, rib_x, y0, z0, y1, z1, width=0.024, height=0.014, is_front=True, mat=None, parent=None):
    """Generate a genuinely slender sloped roof seam batten following the roof slope (no vertical fins)."""
    hw = width / 2.0
    dy = y1 - y0
    dz = z1 - z0
    len_yz = math.hypot(dy, dz)
    if len_yz < 1e-4:
        return None

    # Normal perpendicular to roof slope pointing outward
    if is_front:
        ny = -dz / len_yz
        nz = dy / len_yz
    else:
        ny = dz / len_yz
        nz = -dy / len_yz

    oy = ny * height
    oz = nz * height

    verts = [
        (rib_x - hw, y0, z0),              # 0: base bottom-left
        (rib_x + hw, y0, z0),              # 1: base bottom-right
        (rib_x + hw, y1, z1),              # 2: base top-right
        (rib_x - hw, y1, z1),              # 3: base top-left
        (rib_x - hw, y0 + oy, z0 + oz),    # 4: seam bottom-left
        (rib_x + hw, y0 + oy, z0 + oz),    # 5: seam bottom-right
        (rib_x + hw, y1 + oy, z1 + oz),    # 6: seam top-right
        (rib_x - hw, y1 + oy, z1 + oz),    # 7: seam top-left
    ]

    faces = [
        (4, 5, 6, 7),  # Top face along roof slope
        (0, 4, 7, 3),  # Left side
        (1, 2, 6, 5),  # Right side
        (0, 1, 5, 4),  # Bottom end cap
        (2, 3, 7, 6),  # Top end cap
        (3, 2, 1, 0),  # Under face against roof
    ]

    if not is_front:
        faces = [tuple(reversed(f)) for f in faces]

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    uv_l = mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        for loop_i in poly.loop_indices:
            v_i = mesh.loops[loop_i].vertex_index
            vx, vy, vz = verts[v_i]
            u = (vx - (rib_x - hw)) / width
            dist_along = math.hypot(vy - y0, vz - z0)
            v = dist_along / max(0.001, len_yz)
            uv_l.data[loop_i].uv = (u, v)

    mesh.update()
    return _link_and_assign(mesh, name, mat, parent, authored_edge_finish=True)


def _create_striped_awning(name, origin, width, depth, drop_angle_deg, stripes=14, mat_teal=None, mat_cream=None, parent=None):
    """Generate a cantilevered canopy with 3D thickness, alternating teal/cream stripes,
    and a scalloped valance silhouette.

    All face windings are mathematically verified to face strictly OUTWARD:
    - Top slope: winds (0, 3, 2, 1) pointing forward-upward (-Y, +Z)
    - Underside ceiling: winds (4, 5, 6, 7) pointing backward-downward (+Y, -Z)
    - Back junction: winds (0, 1, 5, 4) pointing backward (+Y)
    - Front valance facet: winds (ft0, fb0, fb1, ft1) pointing forward (-Y)
    - Back valance facet: winds (bt0, bt1, bb1, bb0) pointing backward (+Y)
    - Bottom valance rim: winds (fb0, bb0, bb1, fb1) pointing downward (-Z)
    - Left/Right returns: wind outward along -X / +X
    """
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
        mat = mat_teal if (i % 2 == 0) else mat_cream
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
            (0, 3, 2, 1),  # Top slope: normal points OUTWARD (forward-upward: -Y, +Z)
            (4, 5, 6, 7),  # Underside ceiling: normal points OUTWARD (downward-backward: +Y, -Z)
            (0, 1, 5, 4),  # Back wall junction: normal points OUTWARD (backward: +Y)
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

        # Scalloped valance facets with outward normals
        for s in range(scallop_segs):
            ft0 = val_front_top_start + s
            ft1 = val_front_top_start + s + 1
            fb0 = val_front_bot_start + s
            fb1 = val_front_bot_start + s + 1

            bt0 = val_back_top_start + s
            bt1 = val_back_top_start + s + 1
            bb0 = val_back_bot_start + s
            bb1 = val_back_bot_start + s + 1

            faces.append((ft0, fb0, fb1, ft1))  # Front scalloped facet: points -Y (forward)
            faces.append((bt0, bt1, bb1, bb0))  # Back scalloped facet: points +Y (backward)
            faces.append((fb0, bb0, bb1, fb1))  # Bottom scalloped rim: points -Z (downward)

        # Lateral outer returns for end stripes with outward normals
        if i == 0:
            faces.append((0, 4, 7, 3))  # Left outer slope cap: points -X (left)
            faces.append((val_front_top_start, val_back_top_start, val_back_bot_start, val_front_bot_start))  # Left valance cap: points -X

        if i == stripes - 1:
            faces.append((1, 2, 6, 5))  # Right outer slope cap: points +X (right)
            s_end = scallop_segs
            faces.append((val_front_top_start + s_end, val_front_bot_start + s_end, val_back_bot_start + s_end, val_back_top_start + s_end))  # Right valance cap: points +X

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


def _create_calm_closed_curtain(name, origin, width, height, panel_count=10, mat=None, parent=None):
    """Generate a calm solid opaque security shutter curtain with clean interlocking panel seams."""
    ox, oy, oz = origin
    half_w = width / 2.0
    panel_h = height / panel_count
    seam_gap = 0.008
    panel_thick = 0.024
    reveal_depth = 0.006

    verts = []
    faces = []

    for p in range(panel_count):
        pz0 = p * panel_h
        pz1 = (p + 1) * panel_h - seam_gap
        v_base = len(verts)

        # Front panel face with recessed reveal lip
        f0 = (-half_w, 0.0, pz0)
        f1 = (half_w, 0.0, pz0)
        f2 = (half_w, 0.0, pz1)
        f3 = (-half_w, 0.0, pz1)

        # Back flat face
        b0 = (-half_w, panel_thick, pz0)
        b1 = (half_w, panel_thick, pz0)
        b2 = (half_w, panel_thick, pz1)
        b3 = (-half_w, panel_thick, pz1)

        verts.extend([f0, f1, f2, f3, b0, b1, b2, b3])
        faces.extend([
            (v_base + 0, v_base + 1, v_base + 2, v_base + 3),  # Front
            (v_base + 7, v_base + 6, v_base + 5, v_base + 4),  # Back
            (v_base + 4, v_base + 5, v_base + 1, v_base + 0),  # Bottom
            (v_base + 3, v_base + 2, v_base + 6, v_base + 7),  # Top
            (v_base + 0, v_base + 3, v_base + 7, v_base + 4),  # Left end
            (v_base + 1, v_base + 5, v_base + 6, v_base + 2),  # Right end
        ])

        # Recessed horizontal seam reveal strip between panels
        if p < panel_count - 1:
            s_base = len(verts)
            sz0 = pz1
            sz1 = (p + 1) * panel_h
            verts.extend([
                (-half_w, reveal_depth, sz0),
                (half_w, reveal_depth, sz0),
                (half_w, reveal_depth, sz1),
                (-half_w, reveal_depth, sz1),
                (-half_w, panel_thick, sz0),
                (half_w, panel_thick, sz0),
                (half_w, panel_thick, sz1),
                (-half_w, panel_thick, sz1),
            ])
            faces.extend([
                (s_base + 0, s_base + 1, s_base + 2, s_base + 3),
                (s_base + 7, s_base + 6, s_base + 5, s_base + 4),
                (s_base + 4, s_base + 5, s_base + 1, s_base + 0),
                (s_base + 3, s_base + 2, s_base + 6, s_base + 7),
                (s_base + 0, s_base + 3, s_base + 7, s_base + 4),
                (s_base + 1, s_base + 5, s_base + 6, s_base + 2),
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
            v = vz / max(0.001, height) * 2.0
            uv_l.data[loop_i].uv = (u, v)

    mesh.update()
    obj = _link_and_assign(mesh, name, mat, parent)
    obj.location = (ox, oy, oz)
    return obj


# ---------------------------------------------------------------------------
# Specialized Commercial Beverage Equipment & Signage
# ---------------------------------------------------------------------------

def _create_commercial_soda_dispenser(name, origin, mat_metal, mat_brass, mat_dark, mat_accent, parent=None):
    """Generate a commercial stainless steel fountain soda dispenser machine with multi-valve taps."""
    ox, oy, oz = origin
    disp_root = bpy.data.objects.new(name, None)
    disp_root.location = (ox, oy, oz)
    if parent:
        disp_root.parent = parent
    bpy.context.scene.collection.objects.link(disp_root)

    dw = 0.60
    dd = 0.44
    dh = 0.40

    # 1. Main dispenser cabinet chassis
    _create_prism(f"{name}_Cabinet", (-dw / 2, -dd / 2, 0.0), (dw / 2, dd / 2, dh), mat=mat_metal, parent=disp_root)

    # 2. Lower drip tray extending forward
    tray_d = 0.12
    tray_h = 0.045
    _create_prism(f"{name}_DripTray", (-dw / 2 + 0.02, -dd / 2 - tray_d, 0.0), (dw / 2 - 0.02, -dd / 2, tray_h), mat=mat_metal, parent=disp_root)
    _create_prism(f"{name}_DrainGrille", (-dw / 2 + 0.03, -dd / 2 - tray_d + 0.01, tray_h - 0.006), (dw / 2 - 0.03, -dd / 2 - 0.01, tray_h), mat=mat_dark, parent=disp_root)

    # 3. Dispenser splash backpanel
    _create_prism(f"{name}_SplashPanel", (-dw / 2 + 0.02, -dd / 2 - 0.005, tray_h), (dw / 2 - 0.02, -dd / 2, dh - 0.02), mat=mat_metal, parent=disp_root)
    _create_prism(f"{name}_GraphicEmblem", (-0.14, -dd / 2 - 0.012, dh - 0.12), (0.14, -dd / 2 - 0.005, dh - 0.03), mat=mat_accent, parent=disp_root)

    # 4. Ice hopper top lid with handle
    _create_prism(f"{name}_IceLid", (-dw / 2 + 0.01, -dd / 2 + 0.02, dh), (dw / 2 - 0.01, dd / 2 - 0.02, dh + 0.045), mat=mat_metal, parent=disp_root)
    _create_prism(f"{name}_LidHandle", (-0.12, -0.04, dh + 0.045), (0.12, 0.04, dh + 0.075), mat=mat_brass, parent=disp_root)

    # 5. Dispensing Valve Assemblies (5 distinct beverage tap spouts)
    valve_xs = [-0.20, -0.10, 0.0, 0.10, 0.20]
    valve_z = 0.22

    for v_i, vx in enumerate(valve_xs):
        _create_prism(f"{name}_ValveBlock_{v_i}", (vx - 0.032, -dd / 2 - 0.045, valve_z), (vx + 0.032, -dd / 2, valve_z + 0.08), mat=mat_metal, parent=disp_root)
        _create_cylinder(f"{name}_TapNozzle_{v_i}", 0.014, 0.045, segments=10, z_offset=valve_z - 0.04, center_xy=(vx, -dd / 2 - 0.055), mat=mat_brass, parent=disp_root, smooth=True)
        _create_prism(f"{name}_TapLever_{v_i}", (vx - 0.018, -dd / 2 - 0.025, valve_z - 0.06), (vx + 0.018, -dd / 2 - 0.015, valve_z + 0.02), mat=mat_metal, parent=disp_root)
        _create_cylinder(f"{name}_FlavorButton_{v_i}", 0.016, 0.008, segments=10, z_offset=valve_z + 0.04, center_xy=(vx, -dd / 2 - 0.048), mat=mat_accent, parent=disp_root, smooth=True)

    return disp_root


def _create_cash_register(name, origin, mat_metal, mat_brass, mat_cream, parent=None):
    """Generate a detailed point-of-sale cash register with cash drawer, keypad, and pole display."""
    ox, oy, oz = origin
    reg_root = bpy.data.objects.new(name, None)
    reg_root.location = (ox, oy, oz)
    if parent:
        reg_root.parent = parent
    bpy.context.scene.collection.objects.link(reg_root)

    _create_prism(f"{name}_CashDrawer", (-0.18, -0.18, 0.0), (0.18, 0.18, 0.08), mat=mat_metal, parent=reg_root)
    _create_prism(f"{name}_DrawerHandle", (-0.06, -0.195, 0.035), (0.06, -0.18, 0.055), mat=mat_brass, parent=reg_root)
    _create_cylinder(f"{name}_Keyhole", 0.008, 0.008, segments=8, z_offset=0.04, center_xy=(0.10, -0.185), mat=mat_brass, parent=reg_root)

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


def _create_cup_dispenser_rack(name, origin, mat_metal, mat_brass, parent=None):
    """Generate a slanted stainless tiered cup dispenser organizer fixture rack."""
    ox, oy, oz = origin
    rack_root = bpy.data.objects.new(name, None)
    rack_root.location = (ox, oy, oz)
    if parent:
        rack_root.parent = parent
    bpy.context.scene.collection.objects.link(rack_root)

    _create_prism(f"{name}_Chassis", (-0.16, -0.14, 0.0), (0.16, 0.14, 0.28), mat=mat_metal, parent=rack_root)

    for c_i, cy in enumerate([-0.07, 0.0, 0.07]):
        _create_cylinder(f"{name}_ChuteCollar_{c_i}", 0.042, 0.028, segments=12, z_offset=0.28, center_xy=(0.0, cy), mat=mat_brass, parent=rack_root)
        _create_cylinder(f"{name}_ChuteInner_{c_i}", 0.036, 0.022, segments=12, z_offset=0.284, center_xy=(0.0, cy), mat=mat_metal, parent=rack_root)

    return rack_root


def _create_soft_drink_menu_panel(name, origin, mat_timber, mat_brass, mat_cream, mat_teal, parent=None):
    """Generate a wall-mounted framed menu panel displaying soft drink items and fizz iconography."""
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
    _create_prism(f"{name}_HeaderBanner", (-pw / 2 + 0.06, -pt - 0.014, ph / 2 - 0.16), (pw / 2 - 0.06, -pt - 0.006, ph / 2 - 0.06), mat=mat_teal, parent=panel_root)

    _create_cylinder(f"{name}_IconCupRim", 0.042, 0.010, segments=12, z_offset=ph / 2 - 0.09, center_xy=(0.0, -pt - 0.018), mat=mat_cream, parent=panel_root, smooth=True)
    _create_cylinder(f"{name}_IconCupBody", 0.036, 0.034, segments=12, z_offset=ph / 2 - 0.13, center_xy=(0.0, -pt - 0.018), mat=mat_cream, parent=panel_root, smooth=True)

    for b_i, (bx, bz) in enumerate([(-0.06, ph / 2 - 0.08), (0.05, ph / 2 - 0.07), (-0.03, ph / 2 - 0.06)]):
        _create_cylinder(f"{name}_Bubble_{b_i}", 0.010, 0.006, segments=8, z_offset=bz, center_xy=(bx, -pt - 0.019), mat=mat_brass, parent=panel_root, smooth=True)

    items_z = [ph / 2 - 0.24, ph / 2 - 0.35, ph / 2 - 0.46, ph / 2 - 0.57]
    for row_i, rz in enumerate(items_z):
        _create_prism(f"{name}_ItemBar_{row_i}", (-pw / 2 + 0.08, -pt - 0.012, rz - 0.035), (pw / 2 - 0.08, -pt - 0.004, rz + 0.015), mat=mat_timber, parent=panel_root)
        _create_cylinder(f"{name}_ItemBullet_{row_i}", 0.012, 0.008, segments=8, z_offset=rz - 0.01, center_xy=(-pw / 2 + 0.12, -pt - 0.015), mat=mat_teal, parent=panel_root)

    return panel_root


def _create_soft_drinks_plaque(name, origin, mat_teal, mat_cream, mat_brass, parent=None):
    """Generate a readable exterior contrasting 'SOFT DRINKS' marquee plaque on the front pediment,
    mounted safely above the awning to ensure complete immunity from awning occlusion.
    """
    ox, oy, oz = origin
    sign_root = bpy.data.objects.new(name, None)
    sign_root.location = (ox, oy, oz)
    if parent:
        sign_root.parent = parent
    bpy.context.scene.collection.objects.link(sign_root)

    pw = 1.76
    ph = 0.28
    pt = 0.038

    _create_prism(f"{name}_BackBoard", (-pw / 2, -pt, -ph / 2), (pw / 2, 0.0, ph / 2), mat=mat_teal, parent=sign_root)
    _create_prism(f"{name}_OuterBorder", (-pw / 2 - 0.02, -pt - 0.008, -ph / 2 - 0.02), (pw / 2 + 0.02, 0.004, ph / 2 + 0.02), mat=mat_cream, parent=sign_root)
    _create_prism(f"{name}_InnerFace", (-pw / 2 + 0.02, -pt - 0.012, -ph / 2 + 0.02), (pw / 2 - 0.02, -pt, ph / 2 - 0.02), mat=mat_teal, parent=sign_root)

    rosette_r = 0.020
    for rx, rz in [(-pw / 2 + 0.03, -ph / 2 + 0.03), (pw / 2 - 0.03, -ph / 2 + 0.03),
                  (-pw / 2 + 0.03, ph / 2 - 0.03), (pw / 2 - 0.03, ph / 2 - 0.03)]:
        _create_cylinder(f"{name}_Rosette", rosette_r, 0.010, segments=10, z_offset=rz - rosette_r, center_xy=(rx, -pt - 0.018), mat=mat_brass, parent=sign_root, smooth=True)

    glyphs = {
        "S": ["0111", "1000", "0110", "0001", "1110"],
        "O": ["0110", "1001", "1001", "1001", "0110"],
        "F": ["1111", "1000", "1110", "1000", "1000"],
        "T": ["1111", "0110", "0110", "0110", "0110"],
        "D": ["1110", "1001", "1001", "1001", "1110"],
        "R": ["1110", "1001", "1110", "1010", "1001"],
        "I": ["1111", "0110", "0110", "0110", "1111"],
        "N": ["1001", "1101", "1011", "1001", "1001"],
        "K": ["1001", "1010", "1100", "1010", "1001"],
    }

    words = [("SOFT", -0.42), ("DRINKS", 0.22)]
    dot_w = 0.022
    dot_h = 0.026
    dot_thk = 0.022
    char_spacing = 0.115

    for word, center_x in words:
        start_x = center_x - (len(word) * char_spacing) / 2.0
        for c_idx, char in enumerate(word):
            if char not in glyphs:
                continue
            grid = glyphs[char]
            char_x = start_x + c_idx * char_spacing
            for row_i, row_str in enumerate(grid):
                col = 0
                while col < len(row_str):
                    if row_str[col] == "1":
                        start_col = col
                        while col < len(row_str) and row_str[col] == "1":
                            col += 1
                        end_col = col
                        bx0 = char_x + start_col * dot_w
                        bx1 = char_x + end_col * dot_w - 0.003
                        bz1 = 0.065 - row_i * dot_h
                        bz0 = bz1 - dot_h + 0.003
                        _create_prism(
                            f"Glyph_{word}_{c_idx}_{row_i}_{start_col}",
                            (bx0, -pt - 0.012 - dot_thk, bz0),
                            (bx1, -pt - 0.012, bz1),
                            mat=mat_cream, parent=sign_root
                        )
                    else:
                        col += 1

    _create_cylinder(f"{name}_StarBadge", 0.022, 0.012, segments=10, z_offset=-0.01, center_xy=(-0.08, -pt - 0.024), mat=mat_brass, parent=sign_root, smooth=True)

    return sign_root


def _create_sculpted_can_landmark(name, center_xy, base_z, mat_teal, mat_cream, mat_metal, mat_brass, mat_ruby, parent=None):
    """Generate a larger proportionate recognizable sculpted beverage can landmark on the roof turntable.

    Refined proportions (radius 0.33m, height 0.75m, reaching top Z ~3.78m) make the landmark
    unmistakably readable from park overview camera angles.
    """
    cx, cy = center_xy
    can_root = bpy.data.objects.new(name, None)
    can_root.location = (cx, cy, 0.0)
    if parent:
        can_root.parent = parent
    bpy.context.scene.collection.objects.link(can_root)

    # 1. Base Pedestal Plinth & Circular Turntable
    _create_prism(f"{name}_PedestalBase", (-0.46, -0.46, base_z), (0.46, 0.46, base_z + 0.05), mat=mat_cream, parent=can_root)
    _create_prism(f"{name}_PedestalCollar", (-0.42, -0.42, base_z + 0.05), (0.42, 0.42, base_z + 0.09), mat=mat_teal, parent=can_root)
    _create_cylinder(f"{name}_Turntable", 0.38, 0.024, segments=24, z_offset=base_z + 0.09, center_xy=(0.0, 0.0), mat=mat_brass, parent=can_root, smooth=True)

    can_bot_z = base_z + 0.114

    # 2. Main Sculpted Can Body (Revolved Profile around Z with verified outward normals)
    can_profile = [
        # Concave bottom dome center
        (0.000, can_bot_z + 0.040),
        (0.075, can_bot_z + 0.034),
        (0.160, can_bot_z + 0.022),
        (0.230, can_bot_z + 0.008),
        # Chime foot contact rim (lowest standing lip)
        (0.275, can_bot_z),
        # Outer chime bevel
        (0.298, can_bot_z + 0.012),
        # Inward neck above chime
        (0.282, can_bot_z + 0.032),
        # Lower body flare up to main diameter
        (0.305, can_bot_z + 0.075),
        (0.328, can_bot_z + 0.130),
        # Main cylindrical can wall (radius 0.330m, diameter 0.66m)
        (0.330, can_bot_z + 0.180),
        (0.330, can_bot_z + 0.380),
        (0.330, can_bot_z + 0.540),
        # Upper shoulder curve
        (0.322, can_bot_z + 0.595),
        (0.304, can_bot_z + 0.640),
        (0.280, can_bot_z + 0.675),
        # Neck furrow
        (0.266, can_bot_z + 0.692),
        # Rolled rim outer flange / seam
        (0.274, can_bot_z + 0.710),
        (0.282, can_bot_z + 0.728),
        (0.280, can_bot_z + 0.740),
        # Rim top and inward drop to sunken lid
        (0.266, can_bot_z + 0.738),
        (0.254, can_bot_z + 0.722),
        # Sunken top lid surface
        (0.242, can_bot_z + 0.718),
        (0.000, can_bot_z + 0.718),
    ]

    _create_lathed_mesh(f"{name}_CanBody", can_profile, center_xy=(0.0, 0.0), segments=28, mat=mat_teal, parent=can_root, smooth=True)

    # 3. Designed Neutral Label: Cream Wrap Sleeve & Dynamic Wave Bands
    label_z0 = can_bot_z + 0.18
    label_h = 0.34
    _create_cylinder(f"{name}_LabelWrap", 0.333, label_h, segments=28, z_offset=label_z0, center_xy=(0.0, 0.0), mat=mat_cream, parent=can_root, smooth=True)

    # Curved dynamic accent bands on label
    _create_cylinder(f"{name}_WaveBandTop", 0.335, 0.034, segments=28, z_offset=label_z0 + 0.27, center_xy=(0.0, 0.0), mat=mat_teal, parent=can_root, smooth=True)
    _create_cylinder(f"{name}_WaveBandBot", 0.335, 0.034, segments=28, z_offset=label_z0 + 0.04, center_xy=(0.0, 0.0), mat=mat_ruby, parent=can_root, smooth=True)

    # Central front beverage crest emblem facing -Y
    _create_prism(f"{name}_CrestDiamond", (-0.075, -0.342, label_z0 + 0.11), (0.075, -0.324, label_z0 + 0.21), mat=mat_brass, parent=can_root)
    _create_cylinder(f"{name}_CrestStar", 0.045, 0.018, segments=12, z_offset=label_z0 + 0.14, center_xy=(0.0, -0.338), mat=mat_ruby, parent=can_root, smooth=True)

    # 3D Effervescence Bubble Relief Dots
    bubble_coords = [
        (-0.16, -0.315, label_z0 + 0.08), (0.15, -0.316, label_z0 + 0.09),
        (-0.11, -0.328, label_z0 + 0.24), (0.12, -0.326, label_z0 + 0.23),
        (-0.19, -0.300, label_z0 + 0.17), (0.20, -0.298, label_z0 + 0.16)
    ]
    for b_idx, (bx, by, bz) in enumerate(bubble_coords):
        _create_cylinder(f"{name}_Bubble_{b_idx}", 0.020, 0.014, segments=8, z_offset=bz, center_xy=(bx, by), mat=mat_brass, parent=can_root, smooth=True)

    # 4. Sunken Can Top Lid Features (Z = can_bot_z + 0.718m)
    lid_z = can_bot_z + 0.718

    # Aperture score line bezel outline on front half of lid
    _create_cylinder(f"{name}_ScoreLineBezel", 0.060, 0.008, segments=16, z_offset=lid_z, center_xy=(0.0, -0.09), mat=mat_metal, parent=can_root, smooth=True)
    _create_cylinder(f"{name}_ScoreLineHole", 0.052, 0.010, segments=16, z_offset=lid_z + 0.002, center_xy=(0.0, -0.09), mat=mat_teal, parent=can_root, smooth=True)

    # Central attachment rivet stud
    _create_cylinder(f"{name}_TabRivet", 0.018, 0.012, segments=12, z_offset=lid_z, center_xy=(0.0, 0.0), mat=mat_brass, parent=can_root, smooth=True)

    # 5. Hand-Modelled 3D Ring-Pull Tab
    _create_prism(f"{name}_TabNose", (-0.032, -0.075, lid_z + 0.004), (0.032, -0.016, lid_z + 0.016), mat=mat_metal, parent=can_root)
    _create_prism(f"{name}_TabHinge", (-0.036, -0.016, lid_z + 0.004), (0.036, 0.030, lid_z + 0.018), mat=mat_metal, parent=can_root)

    # Contoured pull lever with hollow finger ring loop hole extending towards +Y
    _create_prism(f"{name}_TabLoopLeft", (-0.048, 0.030, lid_z + 0.008), (-0.028, 0.135, lid_z + 0.024), mat=mat_metal, parent=can_root)
    _create_prism(f"{name}_TabLoopRight", (0.028, 0.030, lid_z + 0.008), (0.048, 0.135, lid_z + 0.024), mat=mat_metal, parent=can_root)
    _create_prism(f"{name}_TabLoopRear", (-0.048, 0.118, lid_z + 0.012), (0.048, 0.142, lid_z + 0.032), mat=mat_metal, parent=can_root)

    return can_root


# ---------------------------------------------------------------------------
# Main Contract Entry Point: build(materials)
# ---------------------------------------------------------------------------

def build(materials):
    """Builds the complete single-frontage detailed Soft-drink stall asset module.

    Conforms strictly to AUTHORING-CONTRACT.md and returns English metadata.
    """
    # 1. Resolve Materials (<= 12 static material groups)
    mat_brick = _get_mat(materials, "brick", fallback_color=(0.52, 0.28, 0.22, 1.0), roughness=0.85)
    mat_timber = _get_mat(materials, "timber", fallback_color=(0.34, 0.22, 0.12, 1.0), roughness=0.60)

    # Independently copied and tinted ambientCG materials preserving normal/roughness maps
    raw_boards = _get_mat(materials, "boards", fallback_color=(0.95, 0.92, 0.82, 1.0), roughness=0.70)
    mat_boards = _copy_and_tint_material(raw_boards, (0.96, 0.93, 0.84), factor=0.82, name_suffix="_cream")

    raw_roof = _get_mat(materials, "roof", fallback_color=(0.20, 0.48, 0.46, 1.0), roughness=0.65)
    mat_roof = _copy_and_tint_material(raw_roof, (0.24, 0.54, 0.52), factor=0.78, name_suffix="_teal")

    mat_metal = _get_mat(materials, "metal", fallback_color=(0.42, 0.44, 0.46, 1.0), roughness=0.35, metalness=0.85)
    mat_brass = _get_mat(materials, "brass", fallback_color=(0.85, 0.65, 0.22, 1.0), roughness=0.30, metalness=0.85)
    mat_cream = _get_mat(materials, "cream", fallback_color=(0.95, 0.93, 0.85, 1.0), roughness=0.50)
    mat_teal = _get_mat(materials, "paint_teal", fallback_color=(0.12, 0.52, 0.50, 1.0), roughness=0.45)
    mat_red = _get_mat(materials, "paint_red", fallback_color=(0.78, 0.15, 0.12, 1.0), roughness=0.45)

    # Calm solid warm-grey/teal painted metal for closed shutter curtain
    mat_shutter = _authored_mat(materials, None, "mat_softdrink_shutter", (0.48, 0.52, 0.52, 1.0), roughness=0.55, metalness=0.20)

    # 2 Dedicated solid-color accent materials for beverage equipment and can graphics
    mat_dark = _authored_mat(materials, None, "mat_softdrink_dark", (0.12, 0.14, 0.15, 1.0), roughness=0.30)
    mat_ruby = _authored_mat(materials, None, "mat_softdrink_ruby", (0.65, 0.08, 0.12, 1.0), roughness=0.40)

    # 2. Root Empty Node
    root = bpy.data.objects.new("GroundRoot", None)
    root.location = (0.0, 0.0, 0.0)
    bpy.context.scene.collection.objects.link(root)

    # 3. Base Plinth & Perimeter Masonry Foundation (Z: 0.00 -> 0.18)
    _create_prism("Plinth_Foundation", (-1.68, -1.45, 0.0), (1.68, 1.38, 0.10), mat=mat_brick, parent=root)
    _create_prism("Plinth_SteppedKerb", (-1.58, -1.35, 0.10), (1.58, 1.28, 0.18), mat=mat_timber, parent=root)

    # 4. Corner Heavy Timber/Teal Structural Framing (Z: 0.18 -> 2.45)
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
            mat=mat_teal, parent=root
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
            mat=mat_cream, parent=root
        )

    # Continuous horizontal entablature beam at Z = 2.35 -> 2.48
    _create_prism("Entablature_Beam", (-1.62, -1.38, 2.35), (1.62, 1.32, 2.48), mat=mat_teal, parent=root)

    # 5. Exterior Enclosure Walls: Calm Cream Painted Lap-Board Siding
    # Left Wall (-X)
    _create_lap_siding_wall("Wall_Left_Siding", (-1.44, 1.18), (-1.44, -1.22), 0.18, 2.35, (-1.0, 0.0), mat=mat_boards, parent=root)

    # Right Wall (+X)
    _create_lap_siding_wall("Wall_Right_Siding", (1.44, -1.22), (1.44, 1.18), 0.18, 2.35, (1.0, 0.0), mat=mat_boards, parent=root)

    # Rear Wall (+Y): Siding flanking the staff door and header band above door
    _create_lap_siding_wall("Wall_Rear_Left_Siding", (-1.44, 1.21), (-0.48, 1.21), 0.18, 2.35, (0.0, 1.0), mat=mat_boards, parent=root)
    _create_lap_siding_wall("Wall_Rear_Right_Siding", (0.48, 1.21), (1.44, 1.21), 0.18, 2.35, (0.0, 1.0), mat=mat_boards, parent=root)
    _create_lap_siding_wall("Wall_Rear_Header_Siding", (-0.48, 1.21), (0.48, 1.21), 2.05, 2.35, (0.0, 1.0), mat=mat_boards, parent=root)

    # Staff Service Door on Rear Wall (+Y)
    _create_prism("Door_Frame_Rear", (-0.48, 1.17, 0.18), (0.48, 1.26, 2.08), mat=mat_teal, parent=root)
    _create_prism("Door_Panel_Rear", (-0.42, 1.19, 0.20), (0.42, 1.24, 2.04), mat=mat_cream, parent=root)
    _create_prism("Door_Handle_Rear", (0.32, 1.26, 1.05), (0.36, 1.30, 1.12), mat=mat_brass, parent=root)
    for l_i in range(3):
        lz = 1.75 + l_i * 0.08
        _create_prism(f"Door_Louver_{l_i}", (-0.32, 1.24, lz), (0.32, 1.26, lz + 0.05), mat=mat_metal, parent=root)

    # Rear exterior utility electrical junction box & vertical conduit
    _create_prism("Rear_UtilityBox", (0.85, 1.25, 1.15), (1.15, 1.34, 1.55), mat=mat_metal, parent=root)
    _create_cylinder("Rear_UtilityConduit", 0.016, 0.95, segments=8, z_offset=0.20, center_xy=(0.92, 1.28), mat=mat_metal, parent=root)

    # 6. SINGLE ACTIVE FRONTAGE (-Y): Recessed Service Bay & Equipped Counter
    counter_z = 1.05
    opening_top_z = 2.15

    # Flanking front return piers with cream lap siding
    _create_lap_siding_wall("Front_Pier_Left_Siding", (-1.44, -1.26), (-1.10, -1.26), 0.18, 2.35, (0.0, -1.0), mat=mat_boards, parent=root)
    _create_lap_siding_wall("Front_Pier_Right_Siding", (1.10, -1.26), (1.44, -1.26), 0.18, 2.35, (0.0, -1.0), mat=mat_boards, parent=root)

    # Knee-wall / kickplate below the front counter with lap panelling (Z: 0.18 -> 0.98)
    _create_lap_siding_wall("Counter_Kickplate_Siding", (-1.10, -1.22), (1.10, -1.22), 0.18, 0.98, (0.0, -1.0), course_h=0.13, mat=mat_boards, parent=root)
    _create_prism("Counter_BaseShoe", (-1.14, -1.28, 0.18), (1.14, -1.24, 0.30), mat=mat_teal, parent=root)

    # HEAVY POLISHED TIMBER SERVICE COUNTER SLAB (Top at exactly 1.05m height!)
    _create_prism("Counter_Slab", (-1.18, -1.45, 0.98), (1.18, -0.85, counter_z), mat=mat_timber, parent=root)
    _create_prism("Counter_Bullnose", (-1.20, -1.48, 0.96), (1.20, -1.43, counter_z), mat=mat_brass, parent=root)

    # Side jambs framing the service opening
    _create_prism("Jamb_Left", (-1.14, -1.28, counter_z), (-1.08, -1.18, opening_top_z), mat=mat_teal, parent=root)
    _create_prism("Jamb_Right", (1.08, -1.28, counter_z), (1.14, -1.18, opening_top_z), mat=mat_teal, parent=root)

    # Permanent vertical guide channels on jamb inner edges
    _create_prism("ShutterTrack_Left", (-1.09, -1.24, counter_z), (-1.06, -1.20, opening_top_z), mat=mat_metal, parent=root)
    _create_prism("ShutterTrack_Right", (1.06, -1.24, counter_z), (1.09, -1.20, opening_top_z), mat=mat_metal, parent=root)

    # Upper horizontal shutter housing & valance above the opening (Z: 2.12 -> 2.38)
    _create_prism("Shutter_Housing", (-1.15, -1.30, opening_top_z - 0.03), (1.15, -1.15, opening_top_z + 0.23), mat=mat_teal, parent=root)

    # 7. COHERENT SHUTTER VISUAL STATES (OpenShutter & ClosedShutter)
    # State A: 'OpenShutter' Subtree (Visible in default Blender authoring pose)
    # Features a compact horizontal rolled coil in the upper housing, fully exposing counter & equipment
    open_shutter_root = bpy.data.objects.new("OpenShutter", None)
    open_shutter_root.location = (0.0, 0.0, 0.0)
    open_shutter_root.parent = root
    bpy.context.scene.collection.objects.link(open_shutter_root)

    # Horizontal rolled header cylinder oriented along X inside the upper housing
    _create_horizontal_cylinder_x("Shutter_OpenRolledCoil", radius=0.075, length=2.14, segments=16, x_offset=-1.07, center_yz=(-1.22, 2.24), mat=mat_metal, parent=open_shutter_root)
    _create_prism("Shutter_OpenMount_Left", (-1.08, -1.27, 2.16), (-1.06, -1.17, 2.31), mat=mat_metal, parent=open_shutter_root)
    _create_prism("Shutter_OpenMount_Right", (1.06, -1.27, 2.16), (1.08, -1.17, 2.31), mat=mat_metal, parent=open_shutter_root)
    _create_prism("Shutter_OpenBottomBar", (-1.07, -1.24, 2.13), (1.07, -1.20, 2.16), mat=mat_metal, parent=open_shutter_root)
    _create_prism("Shutter_OpenPullHandle", (-0.06, -1.245, 2.115), (0.06, -1.225, 2.135), mat=mat_brass, parent=open_shutter_root)

    # State B: 'ClosedShutter' Subtree (Hidden by default in Blender authoring pose)
    # Features a calm solid opaque curtain covering opening down to counter level (Z = 1.05m)
    closed_shutter_root = bpy.data.objects.new("ClosedShutter", None)
    closed_shutter_root.location = (0.0, 0.0, 0.0)
    closed_shutter_root.parent = root
    bpy.context.scene.collection.objects.link(closed_shutter_root)

    # Full calm solid closed curtain covering opening between Z = 1.05m and Z = 2.15m at absolute Y = -1.22m
    _create_calm_closed_curtain("ClosedShutter_Curtain", (0.0, -1.22, 1.05), width=2.14, height=1.10, panel_count=10, mat=mat_shutter, parent=closed_shutter_root)
    _create_prism("ClosedShutter_LockRail", (-1.07, -1.245, 1.05), (1.07, -1.195, 1.085), mat=mat_metal, parent=closed_shutter_root)
    _create_prism("ClosedShutter_Padlock", (-0.04, -1.255, 1.055), (0.04, -1.235, 1.080), mat=mat_brass, parent=closed_shutter_root)
    _create_horizontal_cylinder_x("ClosedShutter_SpoolCore", radius=0.035, length=2.14, segments=12, x_offset=-1.07, center_yz=(-1.22, 2.24), mat=mat_metal, parent=closed_shutter_root)

    # Set default Blender authoring visibility: OpenShutter visible, ClosedShutter hidden
    _set_visibility(open_shutter_root, True)
    _set_visibility(closed_shutter_root, False)

    # 8. COMMERCIAL BEVERAGE EQUIPMENT (Inside the Recessed Counter Bay, behind Y = -1.22)
    _create_commercial_soda_dispenser("SodaDispenserStation", (0.46, -0.65, counter_z), mat_metal, mat_brass, mat_dark, mat_teal, parent=root)

    # Cash register positioned at Y=-0.97 so drawer handle (rel y=-0.195) sits at building Y=-1.165,
    # ensuring a robust 0.055m clearance behind the closed shutter curtain plane (Y=-1.22)
    _create_cash_register("CashRegister", (-0.48, -0.97, counter_z), mat_metal, mat_brass, mat_cream, parent=root)

    _create_cup_dispenser_rack("CupDispenserRack", (0.00, -0.62, counter_z), mat_metal, mat_brass, parent=root)
    _create_prism("UnderCounter_Shelf", (-1.05, -1.05, 0.55), (1.05, -0.35, 0.58), mat=mat_timber, parent=root)

    # 9. AWNING, EXTERIOR "SOFT DRINKS" MARQUEE PLAQUE & MENU PANEL
    # Cantilevered striped canopy awning with 3D thickness, scalloped valance, and verified outward winding
    awning_origin = (0.0, -1.25, 2.46)
    _create_striped_awning("FrontAwning", awning_origin, width=2.64, depth=0.52, drop_angle_deg=22.0, stripes=14, mat_teal=mat_teal, mat_cream=mat_cream, parent=root)

    # 3 Cantilevered structural brackets supporting the awning
    for bx in [-1.15, 0.0, 1.15]:
        _create_prism(f"AwningBracket_Top_{bx}", (bx - 0.035, -1.65, 2.22), (bx + 0.035, -1.26, 2.28), mat=mat_teal, parent=root)
        _create_prism(f"AwningBracket_Diag_{bx}", (bx - 0.025, -1.55, 1.95), (bx + 0.025, -1.26, 2.25), mat=mat_metal, parent=root)

    # READABLE EXTERIOR CONTRASTING "SOFT DRINKS" MARQUEE PLAQUE
    # Mounted on front pediment at Z = 2.70m, completely clear of awning occlusion
    plaque_pos = (0.0, -1.48, 2.70)
    _create_soft_drinks_plaque("SoftDrinksPlaque", plaque_pos, mat_teal=mat_teal, mat_cream=mat_cream, mat_brass=mat_brass, parent=root)

    # Framed wall-mounted menu panel
    menu_pos = (-1.28, -1.26, 1.55)
    _create_soft_drink_menu_panel("SoftDrinkMenuPanel", menu_pos, mat_timber, mat_brass, mat_cream, mat_teal, parent=root)

    # 10. DISTINCT BROAD LOW PAVILION ROOF & EAVES
    # Broad lower eaves soffit & fascia cornice (width 3.64m)
    _create_hipped_roof("Roof_EavesSoffit", (-1.82, -1.58), (1.82, 1.48), (-1.62, -1.38), (1.62, 1.28), 2.42, 2.52, mat=mat_roof, parent=root, uv_scale=3.5)

    # Exposed scrolled rafter tails along front and rear eaves
    for rx in [-1.60, -1.20, -0.80, -0.40, 0.0, 0.40, 0.80, 1.20, 1.60]:
        _create_prism(f"RafterTail_Front_{rx}", (rx - 0.035, -1.56, 2.42), (rx + 0.035, -1.34, 2.49), mat=mat_teal, parent=root)
        _create_prism(f"RafterTail_Rear_{rx}", (rx - 0.035, 1.26, 2.42), (rx + 0.035, 1.46, 2.49), mat=mat_teal, parent=root)

    # Broad low flared pavilion roof deck (Z: 2.52 -> 2.76)
    _create_hipped_roof("Roof_BroadPavilion", (-1.62, -1.38), (1.62, 1.28), (-0.95, -0.85), (0.95, 0.75), 2.52, 2.76, mat=mat_roof, parent=root, uv_scale=4.0)

    # Genuinely slender sloped roof seam battens following the roof surface (width 0.024m, height 0.014m, no fins)
    for rib_x in [-1.20, -0.60, 0.0, 0.60, 1.20]:
        _create_sloped_roof_seam(f"Roof_Seam_Front_{rib_x}", rib_x, -1.38, 2.52, -0.85, 2.76, width=0.024, height=0.014, is_front=True, mat=mat_teal, parent=root)
        _create_sloped_roof_seam(f"Roof_Seam_Rear_{rib_x}", rib_x, 1.28, 2.52, 0.75, 2.76, width=0.024, height=0.014, is_front=False, mat=mat_teal, parent=root)

    # Compact low-profile Clerestory Ventilation Monitor (Monitor Roof Vent, Z: 2.76 -> 2.92)
    _create_prism("Roof_MonitorChassis", (-0.80, -0.70, 2.76), (0.80, 0.60, 2.88), mat=mat_cream, parent=root)
    for m_i, mz in enumerate([2.78, 2.81, 2.84]):
        _create_prism(f"Monitor_Louver_Front_{m_i}", (-0.74, -0.71, mz), (0.74, -0.69, mz + 0.022), mat=mat_teal, parent=root)
        _create_prism(f"Monitor_Louver_Rear_{m_i}", (-0.74, 0.59, mz), (0.74, 0.61, mz + 0.022), mat=mat_teal, parent=root)

    # Monitor cap cornice deck
    _create_prism("Roof_MonitorCap", (-0.84, -0.74, 2.88), (0.84, 0.64, 2.92), mat=mat_teal, parent=root)

    # 11. CROWNING SCULPTED SODA CAN LANDMARK (On Roof Turntable)
    # Refined larger proportionate landmark (radius 0.33m, height 0.75m, reaching top Z ~3.78m)
    landmark_center = (0.0, -0.05)
    base_landmark_z = 2.92
    _create_sculpted_can_landmark("SodaCanLandmark", landmark_center, base_landmark_z, mat_teal, mat_cream, mat_metal, mat_brass, mat_ruby, parent=root)

    # 12. CONTRACT RIG EMPTIES / ANCHORS (Actual 6 Named Objects)
    counter_front_anchor = bpy.data.objects.new("CounterFront", None)
    counter_front_anchor.location = (0.0, -1.45, counter_z)
    counter_front_anchor.parent = root
    bpy.context.scene.collection.objects.link(counter_front_anchor)

    product_sign_anchor = bpy.data.objects.new("ProductSign", None)
    product_sign_anchor.location = (landmark_center[0], landmark_center[1], base_landmark_z + 0.85)
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
        "assetId": "soft_drink_stall",
        "referenceVariant": "single_frontage_soft_drink_stall",
        "candidateDimensions": (3.64, 3.44, 3.79),
        "anchors": anchors,
        "shutterStates": {
            "openNode": "OpenShutter",
            "closedNode": "ClosedShutter",
            "defaultState": "open",
            "default": "open",
        },
        "restraints": [],
        "derivedTextures": [
            {
                "material": "boards_cream",
                "sourceTexture": "WoodFloor043_1K-PNG_Color.png",
                "derivedTexture": "WoodFloor043_1K-PNG_Color_cream",
                "tint": [0.96, 0.93, 0.84],
                "factor": 0.82,
                "role": "Wall lap-board siding cream albedo",
            },
            {
                "material": "roof_teal",
                "sourceTexture": "RoofingTiles013A_1K-PNG_Color.png",
                "derivedTexture": "RoofingTiles013A_1K-PNG_Color_teal",
                "tint": [0.24, 0.54, 0.52],
                "factor": 0.78,
                "role": "Broad pavilion roof teal albedo",
            },
        ],
        "notes": (
            'Independent single-frontage detailed stall with unit anchors and exclusive open/closed shutter states. Authored dimensions are design intent; actual exported bounds and resource measurements are recorded in the source manifest.'
        ),
        "geometryIntent": (
            "Theme-park consumable beverage stall serving exclusively Soft-drink products. "
            "Provides a distinct broad low pavilion silhouette contrasting with the Burger hipped roof, "
            "featuring sweeping eave cornices, genuinely slender sloped batten seams, and a compact rooftop clerestory ventilation cupola. "
            "Crowning sculpted can landmark features rounded shoulder/foot, rolled double-seam lip rim, sunken lid, embossed score line, "
            "and hand-modelled ring-pull tab with rivet and finger loop hole. "
            "Readable exterior contrasting 'SOFT DRINKS' plaque elevated safely on front pediment to prevent awning occlusion. "
            "Dual serializable shutter state nodes (OpenShutter/ClosedShutter) normalized to origin for facility.open authority toggling. "
            "Explicit UVs on all meshes, smooth normals on organic can features, rigid node hierarchy parented to GroundRoot, "
            "and strict bounds within the 4m tile footprint without rescale."
        ),
    }
