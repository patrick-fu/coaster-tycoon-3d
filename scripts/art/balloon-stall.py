"""
Balloon Stall - Park Game Asset Module
Single-front 4m tile kiosk with detailed interior, canopy, signage, and dual shutter states.
Authoring contract compliant: +X right, -Y front, +Z up; origin ground 0.
"""

import bpy
import math
from mathutils import Vector, Matrix


def get_mat(materials, name, fallback_color=(0.8, 0.8, 0.8, 1.0), roughness=0.5, metallic=0.0):
    if materials is not None:
        try:
            if name in materials and materials[name]:
                return materials[name]
        except Exception:
            pass
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = fallback_color
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
    return mat


def box_geom(min_c, max_c):
    x0, y0, z0 = min_c
    x1, y1, z1 = max_c
    verts = [
        (x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
        (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)
    ]
    faces = [
        (0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
        (2, 3, 7, 6), (3, 0, 4, 7), (1, 2, 6, 5)
    ]
    return verts, faces


def merge_geoms(geom_list):
    all_verts, all_faces = [], []
    offset = 0
    for verts, faces in geom_list:
        all_verts.extend(verts)
        for f in faces:
            all_faces.append(tuple(idx + offset for idx in f))
        offset += len(verts)
    return all_verts, all_faces


def cylinder_geom(center, r, height, segs=12, axis='Z'):
    cx, cy, cz = center
    verts, faces = [], []
    if axis == 'Z':
        for i in range(segs):
            ang = 2 * math.pi * i / segs
            verts.append((cx + r * math.cos(ang), cy + r * math.sin(ang), cz))
            verts.append((cx + r * math.cos(ang), cy + r * math.sin(ang), cz + height))
        verts.append((cx, cy, cz))
        verts.append((cx, cy, cz + height))
        bc, tc = 2 * segs, 2 * segs + 1
        for i in range(segs):
            n = (i + 1) % segs
            faces.append((2 * i, 2 * n, 2 * n + 1, 2 * i + 1))
            faces.append((bc, 2 * n, 2 * i))
            faces.append((tc, 2 * i + 1, 2 * n + 1))
    else:
        for i in range(segs):
            ang = 2 * math.pi * i / segs
            verts.append((cx, cy + r * math.cos(ang), cz + r * math.sin(ang)))
            verts.append((cx + height, cy + r * math.cos(ang), cz + r * math.sin(ang)))
        verts.append((cx, cy, cz))
        verts.append((cx + height, cy, cz))
        lc, rc = 2 * segs, 2 * segs + 1
        for i in range(segs):
            n = (i + 1) % segs
            faces.append((2 * i, 2 * n, 2 * n + 1, 2 * i + 1))
            faces.append((lc, 2 * n, 2 * i))
            faces.append((rc, 2 * i + 1, 2 * n + 1))
    return verts, faces


def sphere_geom(center, r, scale_z=1.2, rings=8, segs=12):
    cx, cy, cz = center
    verts, faces = [(cx, cy, cz - r * scale_z)], []
    for i in range(1, rings):
        phi = -math.pi / 2 + math.pi * i / rings
        z = cz + r * scale_z * math.sin(phi)
        rr = r * math.cos(phi)
        for j in range(segs):
            theta = 2 * math.pi * j / segs
            verts.append((cx + rr * math.cos(theta), cy + rr * math.sin(theta), z))
    verts.append((cx, cy, cz + r * scale_z))
    for j in range(segs):
        n = (j + 1) % segs
        faces.append((0, 1 + n, 1 + j))
    for i in range(rings - 2):
        r0 = 1 + i * segs
        r1 = 1 + (i + 1) * segs
        for j in range(segs):
            n = (j + 1) % segs
            faces.append((r0 + j, r0 + n, r1 + n, r1 + j))
    top_v = len(verts) - 1
    r_last = 1 + (rings - 2) * segs
    for j in range(segs):
        n = (j + 1) % segs
        faces.append((top_v, r_last + j, r_last + n))
    return verts, faces


def make_letter_boxes(char, cx, z_mid, y_front, y_back):
    y_lo, y_hi = sorted((y_front, y_back))
    hw, hh, t = 0.045, 0.08, 0.018
    z0, z1 = z_mid - hh, z_mid + hh
    boxes = []
    if char in "BALON":
        boxes.append(box_geom((cx - hw, y_lo, z0), (cx - hw + t, y_hi, z1)))
    if char in "AON":
        boxes.append(box_geom((cx + hw - t, y_lo, z0), (cx + hw, y_hi, z1)))
    if char in "BAOS":
        boxes.append(box_geom((cx - hw, y_lo, z1 - t), (cx + hw, y_hi, z1)))
    if char in "BAS":
        boxes.append(box_geom((cx - hw, y_lo, z_mid - t / 2), (cx + hw, y_hi, z_mid + t / 2)))
    if char in "BLOS":
        boxes.append(box_geom((cx - hw, y_lo, z0), (cx + hw, y_hi, z0 + t)))
    if char == "B":
        boxes.append(box_geom((cx + hw - t, y_lo, z_mid), (cx + hw, y_hi, z1)))
        boxes.append(box_geom((cx + hw - t, y_lo, z0), (cx + hw, y_hi, z_mid)))
    elif char == "S":
        boxes.append(box_geom((cx - hw, y_lo, z_mid), (cx - hw + t, y_hi, z1)))
        boxes.append(box_geom((cx + hw - t, y_lo, z0), (cx + hw, y_hi, z_mid)))
    elif char == "N":
        boxes.append(box_geom((cx - hw / 2, y_lo, z_mid - hh / 2), (cx + hw / 2, y_hi, z_mid + hh / 2)))
    return merge_geoms(boxes)


def add_mesh(name, verts, faces, mat=None, parent=None, edge_finish=False):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update(calc_edges=True)
    uv_layer = me.uv_layers.new(name="UVMap")
    for p_idx, poly in enumerate(me.polygons):
        f = faces[p_idx]
        p0, p1, p2 = verts[f[0]], verts[f[1]], verts[f[2]]
        v1 = (p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2])
        v2 = (p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2])
        nx = v1[1] * v2[2] - v1[2] * v2[1]
        ny = v1[2] * v2[0] - v1[0] * v2[2]
        nz = v1[0] * v2[1] - v1[1] * v2[0]
        anx, any_, anz = abs(nx), abs(ny), abs(nz)
        for loop_idx in poly.loop_indices:
            v = verts[me.loops[loop_idx].vertex_index]
            if anz >= anx and anz >= any_:
                uv = (v[0], v[1])
            elif anx >= any_:
                uv = (v[1], v[2])
            else:
                uv = (v[0], v[2])
            uv_layer.data[loop_idx].uv = uv
    if name.startswith(("Balloon_", "Knot_", "Spool_")) or name == "Helium_Dome":
        for poly in me.polygons:
            poly.use_smooth = True
    if mat:
        me.materials.append(mat)
    obj = bpy.data.objects.new(name, me)
    if parent:
        obj.parent = parent
    if edge_finish:
        obj["authoredEdgeFinish"] = True
    bpy.context.collection.objects.link(obj)
    return obj


def build(materials):
    mat_timber = get_mat(materials, "timber", (0.55, 0.35, 0.20, 1.0), 0.6)
    mat_boards = mat_timber
    mat_roof = get_mat(materials, "roof", (0.28, 0.28, 0.32, 1.0), 0.65)
    mat_metal = get_mat(materials, "metal", (0.65, 0.68, 0.70, 1.0), 0.35, 0.8)
    mat_red = get_mat(materials, "paint_red", (0.85, 0.12, 0.12, 1.0), 0.4)
    mat_teal = get_mat(materials, "paint_teal", (0.08, 0.52, 0.54, 1.0), 0.45)
    mat_cream = get_mat(materials, "cream", (0.95, 0.92, 0.82, 1.0), 0.5)
    mat_brass = get_mat(materials, "brass", (0.85, 0.72, 0.28, 1.0), 0.3, 0.9)
    mat_rubber = get_mat(materials, "rubber", (0.15, 0.15, 0.16, 1.0), 0.85)
    mat_paper = mat_cream

    root = bpy.data.objects.new("GroundRoot", None)
    root.empty_display_type = 'PLAIN_AXES'
    bpy.context.collection.objects.link(root)

    def make_anchor(name, loc, parent=root):
        a = bpy.data.objects.new(name, None)
        a.empty_display_type = 'PLAIN_AXES'
        a.location = loc
        a.parent = parent
        bpy.context.collection.objects.link(a)
        return a

    make_anchor("CounterFront", (0.0, -1.50, 1.00))
    make_anchor("ProductSign", (0.0, -1.65, 2.42))
    make_anchor("MenuPanel", (-1.10, -1.66, 1.75))

    open_shutter = make_anchor("OpenShutter", (0.0, 0.0, 0.0))
    open_shutter.hide_viewport = False
    open_shutter.hide_render = False

    closed_shutter = make_anchor("ClosedShutter", (0.0, 0.0, 0.0))
    closed_shutter.hide_viewport = True
    closed_shutter.hide_render = True

    # 1. Plinth Base & Brass Corners
    plinth_v, plinth_f = box_geom((-1.45, -1.45, 0.0), (1.45, 1.25, 0.18))
    add_mesh("Plinth_Base", plinth_v, plinth_f, mat_teal, root)

    corners = [
        box_geom((-1.46, -1.46, 0.0), (-1.36, -1.36, 0.42)),
        box_geom((1.36, -1.46, 0.0), (1.46, -1.36, 0.42)),
        box_geom((-1.46, 1.16, 0.0), (-1.36, 1.26, 0.42)),
        box_geom((1.36, 1.16, 0.0), (1.46, 1.26, 0.42))
    ]
    cv, cf = merge_geoms(corners)
    add_mesh("Plinth_Corners", cv, cf, mat_brass, root)

    # 2. Cabin Walls (Warm cream painted timber siding)
    walls = [
        box_geom((-1.40, -1.40, 0.18), (-1.30, 1.20, 2.50)),
        box_geom((1.30, -1.40, 0.18), (1.40, 1.20, 2.50)),
        box_geom((-1.40, 1.15, 0.18), (-0.45, 1.20, 2.50)),
        box_geom((0.45, 1.15, 0.18), (1.40, 1.20, 2.50)),
        box_geom((-0.45, 1.15, 2.05), (0.45, 1.20, 2.50)),
        box_geom((-1.40, -1.40, 0.18), (-0.95, -1.30, 2.50)),
        box_geom((0.95, -1.40, 0.18), (1.40, -1.30, 2.50)),
        box_geom((-0.95, -1.40, 0.18), (0.95, -1.32, 0.94)),
        box_geom((-0.95, -1.40, 2.22), (0.95, -1.30, 2.50))
    ]
    wv, wf = merge_geoms(walls)
    add_mesh("Cabin_Walls", wv, wf, mat_cream, root)

    # Split the rear rails around the service door and reuse the existing timber finish.
    facade_battens = []
    for x0, x1 in [(-1.445, -1.395), (1.395, 1.445)]:
        for y in [-0.65, 0.45]:
            facade_battens.append(box_geom((x0, y - 0.04, 0.18), (x1, y + 0.04, 2.48)))
        facade_battens.append(box_geom((x0, -1.38, 1.00), (x1, 1.18, 1.07)))
    for x0, x1 in [(-0.98, -0.90), (0.90, 0.98)]:
        facade_battens.append(box_geom((x0, 1.195, 0.18), (x1, 1.24, 2.48)))
    for x0, x1 in [(-1.38, -0.48), (0.48, 1.38)]:
        facade_battens.append(box_geom((x0, 1.195, 1.00), (x1, 1.24, 1.07)))
    fv, ff = merge_geoms(facade_battens)
    add_mesh("Facade_Battens", fv, ff, mat_timber, root)

    # 3. Layered Trims, Jambs & Cornice
    trims = [
        box_geom((-0.98, -1.42, 0.94), (-0.94, -1.38, 2.24)),
        box_geom((0.94, -1.42, 0.94), (0.98, -1.38, 2.24)),
        box_geom((-0.98, -1.42, 2.20), (0.98, -1.38, 2.25)),
        box_geom((-1.48, -1.48, 2.48), (1.48, 1.28, 2.58))
    ]
    tv, tf = merge_geoms(trims)
    add_mesh("Cabin_Trims", tv, tf, mat_teal, root)

    # 4. Service Counter & Corbels (Anchor CounterFront at [0, -1.50, 1.00])
    counters = [
        box_geom((-1.05, -1.50, 0.94), (1.05, -1.25, 1.00)),
        box_geom((-1.30, -1.25, 0.94), (1.30, -0.85, 1.00))
    ]
    cnt_v, cnt_f = merge_geoms(counters)
    add_mesh("Service_Counter", cnt_v, cnt_f, mat_timber, root)

    corbels = [
        box_geom((-0.85, -1.48, 0.82), (-0.79, -1.40, 0.94)),
        box_geom((-0.03, -1.48, 0.82), (0.03, -1.40, 0.94)),
        box_geom((0.79, -1.48, 0.82), (0.85, -1.40, 0.94))
    ]
    crb_v, crb_f = merge_geoms(corbels)
    add_mesh("Counter_Corbels", crb_v, crb_f, mat_teal, root)

    # 5. Interior Floor, Shelf & Fittings
    add_mesh("Interior_Floor", *box_geom((-1.30, -1.30, 0.16), (1.30, 1.15, 0.18)), mat_boards, root)

    int_wood = [
        box_geom((-1.10, 0.95, 1.35), (1.10, 1.15, 1.39)),
        box_geom((-0.44, 1.17, 0.20), (0.44, 1.21, 2.04))
    ]
    iw_v, iw_f = merge_geoms(int_wood)
    add_mesh("Interior_Woodwork", iw_v, iw_f, mat_timber, root)

    int_fittings = [
        box_geom((-0.30, 1.19, 2.18), (0.30, 1.22, 2.34)),
        cylinder_geom((0.70, -0.90, 0.18), 0.085, 0.65, 12, 'Z')
    ]
    iv_m, if_m = merge_geoms(int_fittings)
    add_mesh("Interior_Metal", iv_m, if_m, mat_metal, root)

    brass_fittings = [
        cylinder_geom((-0.88, -0.85, 1.35), 0.01, 0.28, 8, 'X'),
        box_geom((0.67, -0.93, 0.83), (0.73, -0.87, 0.95)),
        box_geom((-0.80, -1.25, 2.18), (0.80, -1.23, 2.20)),
        box_geom((0.38, 1.215, 0.65), (0.44, 1.225, 0.75)),
        box_geom((0.38, 1.215, 1.60), (0.44, 1.225, 1.70)),
        box_geom((-0.38, 1.215, 1.00), (-0.32, 1.235, 1.05))
    ]
    bf_v, bf_f = merge_geoms(brass_fittings)
    add_mesh("Interior_Brass", bf_v, bf_f, mat_brass, root, True)

    add_mesh("Helium_Dome", *sphere_geom((0.70, -0.90, 0.83), 0.085, 0.7, 6, 12), mat_teal, root, True)
    add_mesh("Helium_Hose", *cylinder_geom((0.73, -0.90, 0.88), 0.012, 0.22, 6, 'Z'), mat_rubber, root)

    add_mesh("Spool_Red", *cylinder_geom((-0.86, -0.85, 1.35), 0.055, 0.06, 10, 'X'), mat_red, root, True)
    add_mesh("Spool_Teal", *cylinder_geom((-0.78, -0.85, 1.35), 0.055, 0.06, 10, 'X'), mat_teal, root, True)
    add_mesh("Spool_Cream", *cylinder_geom((-0.70, -0.85, 1.35), 0.055, 0.06, 10, 'X'), mat_cream, root, True)

    # 6. Scalloped Striped Awning & Support Frame
    red_awning, cream_awning = [], []
    stripes = 11
    step = 2.50 / stripes
    for i in range(stripes):
        xs = -1.25 + i * step
        xe = xs + step
        xm = 0.5 * (xs + xe)
        sv = [
            (xs, -1.35, 2.45), (xe, -1.35, 2.45), (xe, -1.75, 2.18), (xs, -1.75, 2.18),
            (xm, -1.75, 2.18), (xs, -1.75, 2.10), (xm, -1.75, 2.04), (xe, -1.75, 2.10)
        ]
        sf = [(0, 3, 2, 1), (3, 5, 6, 4), (4, 6, 7, 2)]
        target = red_awning if i % 2 == 0 else cream_awning
        target.append((sv, sf))

    ar_v, ar_f = merge_geoms(red_awning)
    ac_v, ac_f = merge_geoms(cream_awning)
    add_mesh("Awning_Red", ar_v, ar_f, mat_red, root)
    add_mesh("Awning_Cream", ac_v, ac_f, mat_cream, root)

    awning_frame = [
        box_geom((-1.24, -1.74, 2.15), (1.24, -1.72, 2.18)),
        box_geom((-1.22, -1.74, 1.40), (-1.20, -1.40, 2.16)),
        box_geom((1.20, -1.74, 1.40), (1.22, -1.40, 2.16))
    ]
    af_v, af_f = merge_geoms(awning_frame)
    add_mesh("Awning_Frame", af_v, af_f, mat_brass, root, True)

    # 7. Dimensional BALLOONS Sign (Anchor ProductSign at [0, -1.65, 2.42])
    add_mesh("Sign_Plaque", *box_geom((-0.70, -1.66, 2.27), (0.70, -1.63, 2.57)), mat_cream, root)

    sign_trim = [
        box_geom((-0.72, -1.665, 2.56), (0.72, -1.625, 2.585)),
        box_geom((-0.72, -1.665, 2.255), (0.72, -1.625, 2.28)),
        box_geom((-0.725, -1.665, 2.26), (-0.695, -1.625, 2.58)),
        box_geom((0.695, -1.665, 2.26), (0.725, -1.625, 2.58))
    ]
    st_v, st_f = merge_geoms(sign_trim)
    add_mesh("Sign_Trim", st_v, st_f, mat_brass, root)

    letter_geoms = [make_letter_boxes(ch, -0.52 + idx * 0.148, 2.42, -1.68, -1.66) for idx, ch in enumerate("BALLOONS")]
    lv, lf = merge_geoms(letter_geoms)
    add_mesh("Sign_Letters", lv, lf, mat_red, root, True)

    # 8. Menu Board (Anchor MenuPanel at [-1.10, -1.66, 1.75])
    add_mesh("Menu_Frame", *box_geom((-1.26, -1.66, 1.55), (-0.94, -1.63, 1.95)), mat_teal, root)
    add_mesh("Menu_Slate", *box_geom((-1.24, -1.67, 1.57), (-0.96, -1.66, 1.93)), mat_paper, root)
    add_mesh("Menu_Arm", *box_geom((-1.12, -1.63, 1.70), (-1.08, -1.40, 1.80)), mat_brass, root)

    # 9. Main Roof & Landmark Balloon Cluster (Strict Z <= 3.80m)
    rf_v = [
        (-1.50, -1.50, 2.58), (1.50, -1.50, 2.58), (1.50, 1.30, 2.58), (-1.50, 1.30, 2.58),
        (-0.35, -0.35, 3.08), (0.35, -0.35, 3.08), (0.35, 0.15, 3.08), (-0.35, 0.15, 3.08)
    ]
    rf_f = [
        (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7)
    ]
    add_mesh("Roof_Main", rf_v, rf_f, mat_roof, root)
    add_mesh("Roof_CrestCollar", *box_geom((-0.37, -0.37, 3.07), (0.37, 0.17, 3.10)), mat_brass, root)

    add_mesh("Balloon_Red", *sphere_geom((-0.18, -0.12, 3.42), 0.21, 1.24, 8, 12), mat_red, root, True)
    add_mesh("Knot_Red", *cylinder_geom((-0.18, -0.12, 3.12), 0.035, 0.04, 8, 'Z'), mat_red, root, True)

    add_mesh("Balloon_Teal", *sphere_geom((0.18, -0.08, 3.46), 0.20, 1.22, 8, 12), mat_teal, root, True)
    add_mesh("Knot_Teal", *cylinder_geom((0.18, -0.08, 3.18), 0.032, 0.04, 8, 'Z'), mat_teal, root, True)

    add_mesh("Balloon_Cream", *sphere_geom((0.0, 0.14, 3.52), 0.19, 1.20, 8, 12), mat_cream, root, True)
    add_mesh("Knot_Cream", *cylinder_geom((0.0, 0.14, 3.26), 0.030, 0.04, 8, 'Z'), mat_cream, root, True)

    balloon_wires = [
        cylinder_geom((-0.18, -0.12, 3.08), 0.008, 0.05, 6, 'Z'),
        cylinder_geom((0.18, -0.08, 3.08), 0.008, 0.11, 6, 'Z'),
        cylinder_geom((0.0, 0.14, 3.08), 0.008, 0.19, 6, 'Z')
    ]
    bw_v, bw_f = merge_geoms(balloon_wires)
    add_mesh("Balloon_Ties", bw_v, bw_f, mat_brass, root)

    # 10. Shutter States (Mutually Exclusive Subtrees)
    # Open Shutter (Rolled Coil & Brackets)
    open_parts = [
        cylinder_geom((-0.95, -1.36, 2.15), 0.065, 1.90, 12, 'X'),
        box_geom((-0.98, -1.41, 2.08), (-0.95, -1.33, 2.22)),
        box_geom((0.95, -1.41, 2.08), (0.98, -1.33, 2.22))
    ]
    ov, of_ = merge_geoms(open_parts)
    add_mesh("Shutter_Rolled_Coil", ov, of_, mat_metal, open_shutter, True)

    # Closed Shutter (Corrugated Slatted Curtain, Guides & Lock Rail)
    closed_parts = [
        box_geom((-0.96, -1.39, 1.00), (0.96, -1.35, 1.06)),
        box_geom((-0.97, -1.39, 1.00), (-0.94, -1.35, 2.22)),
        box_geom((0.94, -1.39, 1.00), (0.97, -1.35, 2.22)),
        box_geom((-0.08, -1.40, 1.02), (0.08, -1.38, 1.04))
    ]
    for s in range(12):
        z0 = 1.00 + s * 0.1016
        z1 = z0 + 0.1016
        zm = 0.5 * (z0 + z1)
        sv = [
            (-0.95, -1.37, z0), (0.95, -1.37, z0), (0.95, -1.382, zm), (-0.95, -1.382, zm),
            (0.95, -1.37, z1), (-0.95, -1.37, z1)
        ]
        sf = [(0, 1, 2, 3), (3, 2, 4, 5)]
        closed_parts.append((sv, sf))
    cl_v, cl_f = merge_geoms(closed_parts)
    closed_mesh = add_mesh("Shutter_Closed_Curtain", cl_v, cl_f, mat_metal, closed_shutter, True)
    closed_mesh.hide_viewport = True
    closed_mesh.hide_render = True

    return {
        "assetId": "balloon_stall",
        "anchors": {
            "GroundRoot": [0.0, 0.0, 0.0],
            "CounterFront": [0.0, -1.50, 1.00],
            "ProductSign": [0.0, -1.65, 2.42],
            "MenuPanel": [-1.10, -1.66, 1.75],
            "OpenShutter": [0.0, 0.0, 0.0],
            "ClosedShutter": [0.0, 0.0, 0.0]
        },
        "restraints": [],
        "notes": "Coherent single-tile balloon stall with cream timber siding, teal trims, striped red/cream scalloped canopy, dimensional BALLOONS sign, helium cylinder with regulator, ribbon rolls, roof balloon landmark cluster, and dual-state shutters."
    }
