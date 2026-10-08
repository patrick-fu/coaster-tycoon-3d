"""
organic-tree.py - Broadleaf Oak Park Tree Scenery Generator for Blender 4.3+

Exports:
    def build(materials, lod=0) -> dict

Specifications & Constraints:
    - AmbientCG LeafSet026 1K CC0 atlas with 6 real oak leaf variations.
    - 3 explicit geometry LODs:
        * LOD 0 target: 2,000 - 6,000 evaluated triangles (mixed folded/flat leaf cards)
        * LOD 1 target:   800 - 2,000 evaluated triangles (simplified 2-tri rectangular cards)
        * LOD 2 target:   250 -   700 evaluated triangles (simplified 2-tri rectangular cards)
    - Natural broadleaf park tree morphology:
        * Organic 4-buttress root flare anchored at ground (0, 0, 0)
        * Tapered organic trunk with natural gentle curvature
        * 4 bifurcated scaffold limbs terminating cleanly inside foliage
        * 8 cohesive interlocking crown lobes (lower skirt, mid tier, summit dome)
        * Authored oak leaf cards enclosing individual leaf alpha silhouettes (~2.2:1 ratio)
        * Upward counter-clockwise winding ensuring outwards/upwards geometric normals
        * Dual textured sunlit and shaded green foliage materials
    - Coordinate system:
        * Blender: +X right, -Y forward, +Z up
        * glTF export: +Y up, +Z forward
        * Visual envelope strictly within x/y [-1.90, 1.90] and z [0.0, 7.8] m
        * Scenery reservation: 4.0 x 4.0 x 8.0 m
    - Bark UVs follow branch grain at metre scale (~1 repeat/m) without stretching.
    - Named empties: TreeRoot, GroundAnchor, CrownCenter.
    - Deterministic mesh construction (seeded pseudo-random generator).
"""

import math
import random
from typing import Any, Dict, List, Optional, Tuple

import bpy
from mathutils import Matrix, Vector

# AmbientCG LeafSet026 1024x512 atlas UV sub-rectangles (u0, v0, u1, v1)
# Blender UV bottom origin: U increases stem -> tip, V bottom -> top
OAK_ATLAS_VARIATIONS: List[Tuple[float, float, float, float]] = [
    (20.0 / 1024.0, 317.0 / 512.0, 326.0 / 1024.0, 455.0 / 512.0),   # Var 0
    (354.0 / 1024.0, 329.0 / 512.0, 674.0 / 1024.0, 461.0 / 512.0),  # Var 1
    (691.0 / 1024.0, 313.0 / 512.0, 1011.0 / 1024.0, 458.0 / 512.0), # Var 2
    (15.0 / 1024.0, 56.0 / 512.0, 324.0 / 1024.0, 195.0 / 512.0),    # Var 3
    (362.0 / 1024.0, 50.0 / 512.0, 667.0 / 1024.0, 190.0 / 512.0),   # Var 4
    (699.0 / 1024.0, 61.0 / 512.0, 1012.0 / 1024.0, 199.0 / 512.0),  # Var 5
]


def _get_scene_collection() -> bpy.types.Collection:
    """Retrieve the primary collection of the active scene."""
    if bpy.context.scene and bpy.context.scene.collection:
        return bpy.context.scene.collection
    if bpy.data.scenes and bpy.data.scenes[0].collection:
        return bpy.data.scenes[0].collection
    raise RuntimeError("No active Blender scene or collection found to link objects.")


def _create_empty(
    name: str,
    location: Vector,
    parent: Optional[bpy.types.Object] = None,
) -> bpy.types.Object:
    """Create a named empty node at the given world location."""
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = "PLAIN_AXES"
    empty.empty_display_size = 0.4
    empty.location = location
    if parent:
        empty.parent = parent
    _get_scene_collection().objects.link(empty)
    return empty


def _get_or_create_material(
    name: str,
    base_color: Tuple[float, float, float, float],
    roughness: float = 0.55,
    specular: float = 0.25,
) -> bpy.types.Material:
    """Get or create a Principled BSDF fallback material with deliberate roughness and double-sided flags."""
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        bsdf = nodes.get("Principled BSDF")
        if bsdf is None:
            for n in list(nodes):
                nodes.remove(n)
            bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")
            out = nodes.new(type="ShaderNodeOutputMaterial")
            mat.node_tree.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = base_color
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Specular IOR Level" in bsdf.inputs:
            bsdf.inputs["Specular IOR Level"].default_value = specular
        elif "Specular" in bsdf.inputs:
            bsdf.inputs["Specular"].default_value = specular

    mat.use_backface_culling = False
    return mat


def _resolve_materials(materials_dict: Optional[Dict[str, Any]]) -> Tuple[bpy.types.Material, bpy.types.Material, bpy.types.Material]:
    """Resolve bark, textured sunlit foliage, and textured shaded foliage materials."""
    bark_mat: Optional[bpy.types.Material] = None
    sun_mat: Optional[bpy.types.Material] = None
    shade_mat: Optional[bpy.types.Material] = None

    if isinstance(materials_dict, dict):
        bark_mat = materials_dict.get("bark")
        sun_mat = materials_dict.get("foliage_sun") or materials_dict.get("foliage")
        shade_mat = materials_dict.get("foliage_shade")

    if bark_mat is None:
        bark_mat = _get_or_create_material(
            "M_Bark_Fallback",
            (0.18, 0.12, 0.08, 1.0),
            roughness=0.85,
            specular=0.10,
        )

    if sun_mat is None:
        sun_mat = _get_or_create_material(
            "M_Foliage_Sun",
            (0.18, 0.36, 0.08, 1.0),
            roughness=0.52,
            specular=0.25,
        )

    if shade_mat is None:
        shade_mat = _get_or_create_material(
            "M_Foliage_Shade",
            (0.08, 0.20, 0.05, 1.0),
            roughness=0.65,
            specular=0.15,
        )

    return bark_mat, sun_mat, shade_mat


def _interpolate_tube_path(
    ctrl_pts: List[Vector],
    ctrl_radii: List[float],
    num_rings: int,
) -> Tuple[List[Vector], List[float]]:
    """Interpolate centerline points and radii along cumulative arc length."""
    if len(ctrl_pts) < 2 or num_rings < 2:
        return ctrl_pts, ctrl_radii

    seg_lens = [(ctrl_pts[i + 1] - ctrl_pts[i]).length for i in range(len(ctrl_pts) - 1)]
    total_len = sum(seg_lens)
    if total_len <= 1e-6:
        return [ctrl_pts[0].copy() for _ in range(num_rings)], [ctrl_radii[0] for _ in range(num_rings)]

    cum_lens = [0.0]
    for sl in seg_lens:
        cum_lens.append(cum_lens[-1] + sl)

    out_pts: List[Vector] = []
    out_radii: List[float] = []
    for r in range(num_rings):
        target_s = total_len * (r / (num_rings - 1))
        idx = 0
        while idx < len(cum_lens) - 2 and cum_lens[idx + 1] < target_s:
            idx += 1
        seg_len = cum_lens[idx + 1] - cum_lens[idx]
        t = (target_s - cum_lens[idx]) / max(1e-6, seg_len)
        t = max(0.0, min(1.0, t))
        out_pts.append(ctrl_pts[idx].lerp(ctrl_pts[idx + 1], t))
        out_radii.append(ctrl_radii[idx] * (1.0 - t) + ctrl_radii[idx + 1] * t)

    return out_pts, out_radii


def _build_branch_tube(
    ctrl_pts: List[Vector],
    ctrl_radii: List[float],
    num_rings: int,
    num_sides: int,
    is_trunk: bool,
    flare_height: float = 0.75,
) -> Tuple[List[Vector], List[List[int]], List[List[Tuple[float, float]]]]:
    """
    Construct a procedural branch tube with continuous grain-following UVs.
    Uses parallel transport to prevent cross-section twisting.
    Buttress flare uses 4 smooth asymmetric Gaussian bell curves.
    """
    pts, radii = _interpolate_tube_path(ctrl_pts, ctrl_radii, num_rings)

    tangents: List[Vector] = []
    for i in range(num_rings):
        if i == 0:
            tan = (pts[1] - pts[0]).normalized()
        elif i == num_rings - 1:
            tan = (pts[-1] - pts[-2]).normalized()
        else:
            tan = (pts[i + 1] - pts[i - 1]).normalized()
        tangents.append(tan)

    up_ref = Vector((0.0, 0.0, 1.0))
    if abs(tangents[0].dot(up_ref)) > 0.90:
        up_ref = Vector((1.0, 0.0, 0.0))
    n0 = tangents[0].cross(up_ref).normalized()
    b0 = tangents[0].cross(n0).normalized()

    normals: List[Vector] = [n0]
    binormals: List[Vector] = [b0]
    for i in range(1, num_rings):
        t_prev = tangents[i - 1]
        t_curr = tangents[i]
        axis = t_prev.cross(t_curr)
        dot = max(-1.0, min(1.0, t_prev.dot(t_curr)))
        angle = math.acos(dot)
        if axis.length > 1e-6 and angle > 1e-5:
            rot = Matrix.Rotation(angle, 3, axis.normalized())
            n_curr = (rot @ normals[i - 1]).normalized()
        else:
            n_curr = normals[i - 1].copy()
        normals.append(n_curr)
        binormals.append(t_curr.cross(n_curr).normalized())

    arc_lens = [0.0]
    for i in range(1, num_rings):
        arc_lens.append(arc_lens[-1] + (pts[i] - pts[i - 1]).length)

    base_circ = 2.0 * math.pi * radii[0]
    u_repeats = max(1, round(base_circ / 0.95))

    buttress_defs = [
        (0.70, 0.65, 0.26),  # North-East anchor root
        (2.27, 0.55, 0.18),  # North-West anchor root
        (4.10, 0.70, 0.24),  # South anchor root
        (5.67, 0.60, 0.16),  # South-East anchor root
    ]

    verts: List[Vector] = []
    ring_indices: List[List[int]] = []

    for i in range(num_rings):
        cur_ring: List[int] = []
        center = pts[i]
        rad = radii[i]
        z_pos = center.z

        for j in range(num_sides):
            theta = 2.0 * math.pi * (j / num_sides)
            normal_dir = math.cos(theta) * normals[i] + math.sin(theta) * binormals[i]

            actual_rad = rad
            if is_trunk and z_pos < flare_height:
                decay = max(0.0, 1.0 - z_pos / flare_height) ** 1.8
                flare_add = 0.0
                for r_angle, r_width, r_peak in buttress_defs:
                    d_theta = math.atan2(math.sin(theta - r_angle), math.cos(theta - r_angle))
                    flare_add += r_peak * math.exp(-((d_theta / r_width) ** 2))
                actual_rad += decay * flare_add

            v_pos = center + normal_dir * actual_rad
            if is_trunk and i == 0:
                v_pos.z = max(0.0, v_pos.z)

            cur_ring.append(len(verts))
            verts.append(v_pos)

        ring_indices.append(cur_ring)

    faces: List[List[int]] = []
    face_uvs: List[List[Tuple[float, float]]] = []

    for i in range(num_rings - 1):
        v0_coord = arc_lens[i] * 1.0
        v1_coord = arc_lens[i + 1] * 1.0
        for j in range(num_sides):
            next_j = (j + 1) % num_sides
            idx_a = ring_indices[i][j]
            idx_b = ring_indices[i][next_j]
            idx_c = ring_indices[i + 1][next_j]
            idx_d = ring_indices[i + 1][j]

            faces.append([idx_a, idx_b, idx_c, idx_d])

            u0 = (j / num_sides) * u_repeats
            u1 = ((j + 1) / num_sides) * u_repeats
            face_uvs.append([
                (u0, v0_coord),
                (u1, v0_coord),
                (u1, v1_coord),
                (u0, v1_coord),
            ])

    if is_trunk:
        base_fan = [ring_indices[0][j] for j in reversed(range(num_sides))]
        faces.append(base_fan)
        fan_uvs = [
            (0.5 + 0.5 * math.cos(2.0 * math.pi * j / num_sides), 0.5 + 0.5 * math.sin(2.0 * math.pi * j / num_sides))
            for j in reversed(range(num_sides))
        ]
        face_uvs.append(fan_uvs)

    return verts, faces, face_uvs


def _build_leaf_card(
    origin: Vector,
    forward: Vector,
    right: Vector,
    up: Vector,
    length: float,
    width: float,
    fold_height: float,
    uv_rect: Tuple[float, float, float, float],
    is_folded: bool,
) -> Tuple[List[Vector], List[List[int]], List[List[Tuple[float, float]]], List[Vector]]:
    """
    Construct an individual rectangular card mapped to an atlas variation UV rectangle.
    If is_folded is True, builds 6 vertices / 4 triangles with central-vein crease.
    If is_folded is False, builds 4 vertices / 2 triangles.
    Vertices are wound counter-clockwise so face normals point upward (+Z).
    """
    u0, v0, u1, v1 = uv_rect
    v_mid = (v0 + v1) * 0.5
    half_w = width * 0.5

    verts: List[Vector] = []
    faces: List[List[int]] = []
    uvs: List[List[Tuple[float, float]]] = []
    normals: List[Vector] = []

    if is_folded:
        # 6 Vertices: [v0..v2 at stem base, v3..v5 at tip]
        # Base ring
        p0 = origin - right * half_w
        p1 = origin + up * fold_height
        p2 = origin + right * half_w

        # Tip ring
        tip_origin = origin + forward * length
        p3 = tip_origin - right * half_w
        p4 = tip_origin + up * (fold_height * 0.40)
        p5 = tip_origin + right * half_w

        verts = [p0, p1, p2, p3, p4, p5]

        # Left quad: 2 triangles [0, 4, 1] and [0, 3, 4] wound counter-clockwise
        f0 = [0, 4, 1]
        faces.append(f0)
        uvs.append([(u0, v0), (u1, v_mid), (u0, v_mid)])
        n0 = ((verts[f0[1]] - verts[f0[0]]).cross(verts[f0[2]] - verts[f0[0]])).normalized()
        normals.append(n0)

        f1 = [0, 3, 4]
        faces.append(f1)
        uvs.append([(u0, v0), (u1, v0), (u1, v_mid)])
        n1 = ((verts[f1[1]] - verts[f1[0]]).cross(verts[f1[2]] - verts[f1[0]])).normalized()
        normals.append(n1)

        # Right quad: 2 triangles [1, 5, 2] and [1, 4, 5] wound counter-clockwise
        f2 = [1, 5, 2]
        faces.append(f2)
        uvs.append([(u0, v_mid), (u1, v1), (u0, v1)])
        n2 = ((verts[f2[1]] - verts[f2[0]]).cross(verts[f2[2]] - verts[f2[0]])).normalized()
        normals.append(n2)

        f3 = [1, 4, 5]
        faces.append(f3)
        uvs.append([(u0, v_mid), (u1, v_mid), (u1, v1)])
        n3 = ((verts[f3[1]] - verts[f3[0]]).cross(verts[f3[2]] - verts[f3[0]])).normalized()
        normals.append(n3)

    else:
        # 4 Vertices: 2 triangles [0, 2, 1] and [0, 3, 2]
        p0 = origin - right * half_w
        p1 = origin + right * half_w
        tip_origin = origin + forward * length
        p2 = tip_origin + right * half_w
        p3 = tip_origin - right * half_w

        verts = [p0, p1, p2, p3]

        f0 = [0, 2, 1]
        faces.append(f0)
        uvs.append([(u0, v0), (u1, v1), (u0, v1)])
        n0 = ((verts[f0[1]] - verts[f0[0]]).cross(verts[f0[2]] - verts[f0[0]])).normalized()
        normals.append(n0)

        f1 = [0, 3, 2]
        faces.append(f1)
        uvs.append([(u0, v0), (u1, v0), (u1, v1)])
        n1 = ((verts[f1[1]] - verts[f1[0]]).cross(verts[f1[2]] - verts[f1[0]])).normalized()
        normals.append(n1)

    # forward × right opposes up in the authored spray frame. Keep UV winding
    # paired with vertex winding so the outward side carries the leaf texture.
    return verts, [face[::-1] for face in faces], [uv[::-1] for uv in uvs], [-normal for normal in normals]


def _create_oak_spray(
    origin: Vector,
    forward: Vector,
    up: Vector,
    scale: float,
    lod: int,
    rng: random.Random,
) -> Tuple[List[Vector], List[List[int]], List[List[Tuple[float, float]]], List[Vector]]:
    """
    Generate an authored oak leaf spray comprising overlapping cards.
    Each leaf deterministically selects one of the 6 LeafSet026 atlas variations.
    LOD 0 uses 5 cards: 1 folded blade (4-tri) + 4 flat blades (2-tri each) = 12 tris.
    LOD 1 uses 4 flat 2-tri cards (8 tris).
    LOD 2 uses 3 flat 2-tri cards (6 tris).
    """
    right = forward.cross(up).normalized()
    ortho_up = right.cross(forward).normalized()

    # Configurations: (yaw_deg, pitch_deg, roll_deg, stem_fwd, stem_rgt, stem_up, length_mult)
    # Stagger local leaf bases along forward, lateral, and vertical offsets to avoid repeated star shapes
    if lod == 0:
        card_configs = [
            (0.0, -4.0, 0.0, 0.12, 0.00, 0.00, 1.04),
            (-28.0, -7.0, -12.0, 0.08, -0.04, 0.01, 0.99),
            (28.0, -6.0, 12.0, 0.05, 0.04, -0.01, 1.01),
            (-16.0, 10.0, -8.0, 0.01, -0.03, 0.02, 0.96),
            (18.0, -12.0, 10.0, -0.02, 0.03, -0.02, 0.95),
        ]
        base_len = 0.32 * scale
    elif lod == 1:
        card_configs = [
            (0.0, -6.0, 0.0, 0.10, 0.00, 0.00, 1.02),
            (-30.0, -10.0, -12.0, 0.05, -0.04, 0.01, 0.98),
            (30.0, -9.0, 12.0, 0.02, 0.04, -0.01, 0.98),
            (10.0, 12.0, 0.0, -0.02, -0.02, 0.01, 0.94),
        ]
        base_len = 0.40 * scale
    else:  # lod == 2
        card_configs = [
            (0.0, -8.0, 0.0, 0.08, 0.00, 0.00, 1.02),
            (-32.0, -12.0, -12.0, 0.02, -0.04, 0.01, 0.96),
            (32.0, -12.0, 12.0, -0.02, 0.04, -0.01, 0.96),
        ]
        base_len = 0.48 * scale

    all_verts: List[Vector] = []
    all_faces: List[List[int]] = []
    all_uvs: List[List[Tuple[float, float]]] = []
    all_normals: List[Vector] = []

    for blade_idx, (yaw, pitch, roll, stem_fwd, stem_rgt, stem_up, len_mult) in enumerate(card_configs):
        rad_yaw = math.radians(yaw)
        rad_pitch = math.radians(pitch)
        rad_roll = math.radians(roll)

        rot_z = Matrix.Rotation(rad_yaw, 3, ortho_up)
        rot_x = Matrix.Rotation(rad_pitch, 3, right)
        rot_y = Matrix.Rotation(rad_roll, 3, forward)
        card_rot = rot_z @ rot_x @ rot_y

        c_fwd = (card_rot @ forward).normalized()
        c_up = (card_rot @ ortho_up).normalized()
        c_rgt = c_fwd.cross(c_up).normalized()

        card_origin = (
            origin
            + forward * (stem_fwd * scale)
            + right * (stem_rgt * scale)
            + ortho_up * (stem_up * scale)
        )
        card_len = base_len * len_mult
        card_wid = card_len / 2.22  # Follows ~2.2:1 pixel silhouette
        fold_h = 0.022 * scale

        # Deterministic variation pick per blade
        var_idx = rng.randint(0, len(OAK_ATLAS_VARIATIONS) - 1)
        uv_rect = OAK_ATLAS_VARIATIONS[var_idx]

        blade_is_folded = (lod == 0 and blade_idx == 0)

        v, f, u, norms = _build_leaf_card(
            card_origin,
            c_fwd,
            c_rgt,
            c_up,
            card_len,
            card_wid,
            fold_h,
            uv_rect,
            is_folded=blade_is_folded,
        )

        base_idx = len(all_verts)
        all_verts.extend(v)
        for face in f:
            all_faces.append([idx + base_idx for idx in face])
        all_uvs.extend(u)
        all_normals.extend(norms)

    return all_verts, all_faces, all_uvs, all_normals

def _build_branch_network(lod: int) -> Tuple[List[Vector], List[List[int]], List[List[Tuple[float, float]]]]:
    """
    Assemble the complete wood skeleton (trunk + scaffold limbs + branches).
    All limbs terminate cleanly inside foliage cluster volumes.
    """
    all_verts: List[Vector] = []
    all_faces: List[List[int]] = []
    all_uvs: List[List[Tuple[float, float]]] = []

    if lod == 0:
        trunk_rings, trunk_sides = 10, 10
        limb_rings, limb_sides = 6, 8
        sub_rings, sub_sides = 5, 6
        twig_rings, twig_sides = 4, 5
        include_sub_limbs = 8
        include_twigs = 10
    elif lod == 1:
        trunk_rings, trunk_sides = 7, 7
        limb_rings, limb_sides = 4, 6
        sub_rings, sub_sides = 3, 5
        twig_rings, twig_sides = 0, 0
        include_sub_limbs = 6
        include_twigs = 0
    else:  # lod == 2
        trunk_rings, trunk_sides = 5, 5
        limb_rings, limb_sides = 3, 4
        sub_rings, sub_sides = 2, 3
        twig_rings, twig_sides = 0, 0
        include_sub_limbs = 4
        include_twigs = 0

    # 1. Main Trunk
    trunk_ctrl_pts = [
        Vector((0.00, 0.00, 0.00)),
        Vector((0.01, -0.01, 0.35)),
        Vector((0.02, -0.02, 0.80)),
        Vector((0.04, -0.03, 1.30)),
        Vector((0.04, -0.03, 1.75)),
    ]
    trunk_ctrl_radii = [0.42, 0.36, 0.32, 0.28, 0.25]

    tubes_to_build: List[Tuple[List[Vector], List[float], int, int, bool]] = [
        (trunk_ctrl_pts, trunk_ctrl_radii, trunk_rings, trunk_sides, True)
    ]

    # 2. Four Primary Scaffold Limbs
    limb_0_pts = [
        Vector((0.04, -0.03, 1.70)),
        Vector((0.26, -0.18, 2.05)),
        Vector((0.52, -0.34, 2.45)),
        Vector((0.76, -0.48, 2.90)),
    ]
    limb_0_rad = [0.18, 0.15, 0.12, 0.09]

    limb_1_pts = [
        Vector((0.04, -0.03, 1.70)),
        Vector((-0.24, -0.16, 2.05)),
        Vector((-0.50, -0.32, 2.45)),
        Vector((-0.74, -0.44, 2.85)),
    ]
    limb_1_rad = [0.17, 0.14, 0.12, 0.09]

    limb_2_pts = [
        Vector((0.04, -0.03, 1.70)),
        Vector((-0.08, 0.24, 2.05)),
        Vector((-0.18, 0.52, 2.45)),
        Vector((-0.22, 0.78, 2.90)),
    ]
    limb_2_rad = [0.17, 0.14, 0.12, 0.09]

    limb_3_pts = [
        Vector((0.04, -0.03, 1.70)),
        Vector((0.06, 0.02, 2.30)),
        Vector((0.08, -0.02, 3.00)),
        Vector((0.05, 0.00, 3.80)),
        Vector((0.02, 0.01, 4.45)),
    ]
    limb_3_rad = [0.18, 0.14, 0.11, 0.08, 0.06]

    for p_pts, p_rad in [(limb_0_pts, limb_0_rad), (limb_1_pts, limb_1_rad), (limb_2_pts, limb_2_rad), (limb_3_pts, limb_3_rad)]:
        tubes_to_build.append((p_pts, p_rad, limb_rings, limb_sides, False))

    # 3. Secondary Branches
    sub_limbs = [
        ([Vector((0.76, -0.48, 2.90)), Vector((0.98, -0.42, 3.25)), Vector((1.12, -0.38, 3.55))], [0.07, 0.05, 0.035]),
        ([Vector((0.76, -0.48, 2.90)), Vector((0.70, -0.72, 3.25)), Vector((0.65, -0.88, 3.55))], [0.07, 0.05, 0.035]),
        ([Vector((-0.74, -0.44, 2.85)), Vector((-0.98, -0.32, 3.20)), Vector((-1.14, -0.22, 3.50))], [0.07, 0.05, 0.035]),
        ([Vector((-0.74, -0.44, 2.85)), Vector((-0.72, -0.68, 3.20)), Vector((-0.70, -0.86, 3.50))], [0.07, 0.05, 0.035]),
        ([Vector((-0.22, 0.78, 2.90)), Vector((-0.46, 0.96, 3.25)), Vector((-0.60, 1.08, 3.55))], [0.07, 0.05, 0.035]),
        ([Vector((-0.22, 0.78, 2.90)), Vector((0.14, 0.92, 3.25)), Vector((0.28, 1.02, 3.55))], [0.07, 0.05, 0.035]),
        ([Vector((0.05, 0.00, 3.80)), Vector((0.28, 0.18, 4.25)), Vector((0.38, 0.24, 4.55))], [0.06, 0.045, 0.030]),
        ([Vector((0.05, 0.00, 3.80)), Vector((-0.22, -0.12, 4.25)), Vector((-0.32, -0.16, 4.55))], [0.06, 0.045, 0.030]),
    ]
    for s_pts, s_rad in sub_limbs[:include_sub_limbs]:
        tubes_to_build.append((s_pts, s_rad, sub_rings, sub_sides, False))

    # 4. Tertiary Twigs (LOD 0 only)
    if include_twigs > 0:
        twigs = [
            ([Vector((0.98, -0.42, 3.25)), Vector((1.08, -0.58, 3.45))], [0.035, 0.024]),
            ([Vector((0.70, -0.72, 3.25)), Vector((0.50, -0.85, 3.45))], [0.035, 0.024]),
            ([Vector((-0.98, -0.32, 3.20)), Vector((-1.12, -0.48, 3.40))], [0.035, 0.024]),
            ([Vector((-0.72, -0.68, 3.20)), Vector((-0.55, -0.80, 3.40))], [0.035, 0.024]),
            ([Vector((-0.46, 0.96, 3.25)), Vector((-0.38, 1.15, 3.45))], [0.035, 0.024]),
            ([Vector((0.14, 0.92, 3.25)), Vector((0.26, 1.10, 3.45))], [0.035, 0.024]),
            ([Vector((0.28, 0.18, 4.25)), Vector((0.45, 0.28, 4.45))], [0.030, 0.022]),
            ([Vector((-0.22, -0.12, 4.25)), Vector((-0.35, -0.08, 4.45))], [0.030, 0.022]),
            ([Vector((0.02, 0.01, 4.45)), Vector((0.08, -0.15, 4.75))], [0.030, 0.022]),
            ([Vector((0.02, 0.01, 4.45)), Vector((0.00, 0.02, 4.90))], [0.030, 0.022]),
        ]
        for t_pts, t_rad in twigs[:include_twigs]:
            tubes_to_build.append((t_pts, t_rad, twig_rings, twig_sides, False))

    for pts, rad, rings, sides, is_t in tubes_to_build:
        v, f, u = _build_branch_tube(pts, rad, rings, sides, is_t)
        base_idx = len(all_verts)
        all_verts.extend(v)
        for face in f:
            all_faces.append([idx + base_idx for idx in face])
        all_uvs.extend(u)

    return all_verts, all_faces, all_uvs


def _build_foliage_canopy(lod: int) -> Tuple[List[Vector], List[List[int]], List[List[Tuple[float, float]]], List[int]]:
    """
    Distribute authored oak leaf sprays across 8 cohesive crown lobes.
    Ensures upward counter-clockwise winding and dual sun/shade material assignment.
    """
    # 8 Cohesive Crown Lobes strictly inside candidate cell:
    crown_lobes = [
        (Vector((0.71, -0.40, 3.55)), 0.68, 0.68, 0.76),  # Lobe 0: Lower Front-East
        (Vector((-0.71, -0.35, 3.48)), 0.68, 0.68, 0.76), # Lobe 1: Lower Front-West
        (Vector((-0.46, 0.69, 3.55)), 0.68, 0.68, 0.76),  # Lobe 2: Lower Back-West
        (Vector((0.42, 0.63, 3.60)), 0.68, 0.68, 0.76),   # Lobe 3: Lower Back-East
        (Vector((0.15, -0.44, 4.25)), 0.64, 0.64, 0.74),  # Lobe 4: Mid Front-Center
        (Vector((-0.48, 0.16, 4.38)), 0.64, 0.64, 0.74),  # Lobe 5: Mid West
        (Vector((0.48, 0.20, 4.42)), 0.64, 0.64, 0.74),   # Lobe 6: Mid East
        (Vector((0.00, 0.03, 4.62)), 0.82, 0.82, 0.80),   # Lobe 7: Broad Summit Dome
    ]
    # Larger lower-detail cards need inset spray origins, while their actual
    # leaf shape and the tree's unit transform remain unchanged.
    if lod == 1:
        crown_lobes = [(Vector((c.x * 0.82, c.y * 0.82, c.z)), rx * 0.82, ry * 0.82, rz * 0.90)
                       for c, rx, ry, rz in crown_lobes]
    elif lod == 2:
        crown_lobes = [(Vector((c.x * 0.70, c.y * 0.70, c.z)), rx * 0.70, ry * 0.70, rz * 0.82)
                       for c, rx, ry, rz in crown_lobes]

    all_verts: List[Vector] = []
    all_faces: List[List[int]] = []
    all_uvs: List[List[Tuple[float, float]]] = []
    face_materials: List[int] = []

    sun_dir = Vector((0.35, -0.45, 0.82)).normalized()

    if lod == 0:
        # 350 sprays total * 12 tris/spray = 4,200 foliage tris (+ 1192 skeleton = 5,392 total tris)
        counts_per_lobe = [38, 38, 38, 38, 46, 46, 46, 60]
        base_spray_scale = 1.00
    elif lod == 1:
        # 160 sprays total * 8 tris/spray = 1,280 foliage tris (+ 353 skeleton = 1,633 total tris)
        counts_per_lobe = [18, 18, 18, 18, 20, 20, 20, 28]
        base_spray_scale = 1.25
    else:  # lod == 2
        # 88 sprays total * 6 tris/spray = 528 foliage tris (+ 131 skeleton = 659 total tris)
        counts_per_lobe = [10, 10, 10, 10, 11, 11, 11, 15]
        base_spray_scale = 1.50

    for lobe_idx, (center, rx, ry, rz) in enumerate(crown_lobes):
        num_sprays = counts_per_lobe[lobe_idx]
        rng = random.Random(lobe_idx * 1000 + lod * 100 + 42)

        for _ in range(num_sprays):
            phi = rng.uniform(0.0, 2.0 * math.pi)
            cos_theta = rng.uniform(-0.65, 0.92)
            sin_theta = math.sqrt(max(0.0, 1.0 - cos_theta * cos_theta))
            unit_dir = Vector((sin_theta * math.cos(phi), sin_theta * math.sin(phi), cos_theta))

            # Varied interior and surface radii eliminate hollow halo
            if rng.random() < 0.35:
                dist = rng.uniform(0.20, 0.60)
            else:
                dist = rng.uniform(0.60, 0.96)
            spray_pos = center + Vector((unit_dir.x * rx * dist, unit_dir.y * ry * dist, unit_dir.z * rz * dist))

            # Mostly horizontal/outward spread with modest droop/up variation for isometric view readability
            horiz = Vector((unit_dir.x, unit_dir.y, 0.0))
            if horiz.length > 1e-4:
                h_dir = horiz.normalized()
            else:
                h_dir = Vector((math.cos(phi), math.sin(phi), 0.0))

            yaw_jitter = rng.uniform(-0.25, 0.25)
            h_cos = math.cos(yaw_jitter)
            h_sin = math.sin(yaw_jitter)
            h_fwd = Vector((h_dir.x * h_cos - h_dir.y * h_sin, h_dir.x * h_sin + h_dir.y * h_cos, 0.0))

            droop = rng.uniform(-0.22, 0.10)
            spray_fwd = Vector((h_fwd.x, h_fwd.y, droop)).normalized()
            spray_up = Vector((0.0, 0.0, 1.0))

            spray_scale = base_spray_scale * rng.uniform(0.92, 1.12)
            v, f, u, norms = _create_oak_spray(spray_pos, spray_fwd, spray_up, spray_scale, lod, rng)

            base_idx = len(all_verts)
            all_verts.extend(v)
            for face_idx, face in enumerate(f):
                all_faces.append([idx + base_idx for idx in face])
                norm = norms[face_idx]
                f_center = (v[face[0]] + v[face[1]] + v[face[2]]) / 3.0

                sun_score = norm.dot(sun_dir)
                # Nearly horizontal cards all face the sun; inset sprays still
                # need the understory tint to give the crown visible depth.
                is_sun = dist >= 0.60 and ((sun_score > 0.08) or (norm.z > 0.22 and f_center.z > 3.4))
                face_materials.append(0 if is_sun else 1)

            all_uvs.extend(u)

    return all_verts, all_faces, all_uvs, face_materials

def _assemble_mesh_object(
    name: str,
    vertices: List[Vector],
    faces: List[List[int]],
    face_uvs: List[List[Tuple[float, float]]],
    face_materials: List[int],
    materials: List[bpy.types.Material],
    parent: Optional[bpy.types.Object] = None,
) -> Tuple[bpy.types.Object, int]:
    """Create a Blender mesh object, apply UVs, materials, and smooth shading."""
    mesh = bpy.data.meshes.new(name)
    py_verts = [(v.x, v.y, v.z) for v in vertices]
    mesh.from_pydata(py_verts, [], faces)
    mesh.update()

    for poly in mesh.polygons:
        poly.use_smooth = True

    uv_layer = mesh.uv_layers.new(name="UVMap")
    for poly_idx, poly in enumerate(mesh.polygons):
        poly_uv = face_uvs[poly_idx]
        for loop_offset in range(poly.loop_total):
            loop_idx = poly.loop_start + loop_offset
            uv_layer.data[loop_idx].uv = poly_uv[loop_offset]

    for poly_idx, poly in enumerate(mesh.polygons):
        poly.material_index = face_materials[poly_idx]

    obj = bpy.data.objects.new(name, mesh)
    for mat in materials:
        obj.data.materials.append(mat)

    if parent:
        obj.parent = parent

    _get_scene_collection().objects.link(obj)

    eval_tris = sum(len(poly.vertices) - 2 for poly in mesh.polygons)
    return obj, eval_tris


def build(materials: Optional[Dict[str, Any]] = None, lod: int = 0) -> Dict[str, Any]:
    """
    Build the refined oak park tree at the specified LOD.

    Parameters:
        materials: Dictionary with material definitions ('bark', 'foliage_sun', 'foliage_shade')
        lod: Geometry detail level (0 = high, 1 = medium, 2 = low)

    Returns:
        Metadata dictionary with asset identification, anchors, dimensions, and triangle counts.
    """
    if lod not in (0, 1, 2):
        raise ValueError(f"Unsupported lod={lod}. Contract requires lod in (0, 1, 2).")

    # 1. Resolve materials
    bark_mat, sun_mat, shade_mat = _resolve_materials(materials)

    # 2. Create Root Anchor Empty
    tree_root = _create_empty("TreeRoot", Vector((0.0, 0.0, 0.0)))
    _create_empty("GroundAnchor", Vector((0.0, 0.0, 0.0)), parent=tree_root)

    # 3. Build Branch Skeleton
    b_verts, b_faces, b_uvs = _build_branch_network(lod)
    b_mat_indices = [0] * len(b_faces)
    branch_obj, branch_tris = _assemble_mesh_object(
        f"Tree_Branch_LOD{lod}",
        b_verts,
        b_faces,
        b_uvs,
        b_mat_indices,
        [bark_mat],
        parent=tree_root,
    )

    # 4. Build Foliage Canopy
    f_verts, f_faces, f_uvs, f_mat_indices = _build_foliage_canopy(lod)
    foliage_obj, foliage_tris = _assemble_mesh_object(
        f"Tree_Foliage_LOD{lod}",
        f_verts,
        f_faces,
        f_uvs,
        f_mat_indices,
        [sun_mat, shade_mat],
        parent=tree_root,
    )

    # 5. Compute Enclosing Dimensions & Crown Center
    all_vertices = b_verts + f_verts
    min_x = min(v.x for v in all_vertices)
    max_x = max(v.x for v in all_vertices)
    min_y = min(v.y for v in all_vertices)
    max_y = max(v.y for v in all_vertices)
    min_z = min(v.z for v in all_vertices)
    max_z = max(v.z for v in all_vertices)

    crown_x = sum(v.x for v in f_verts) / len(f_verts)
    crown_y = sum(v.y for v in f_verts) / len(f_verts)
    crown_z = sum(v.z for v in f_verts) / len(f_verts)
    crown_center = Vector((crown_x, crown_y, crown_z))

    _create_empty("CrownCenter", crown_center, parent=tree_root)

    total_eval_tris = branch_tris + foliage_tris

    # Verify contractual envelope safety bounds
    if not (-1.90 <= min_x and max_x <= 1.90):
        raise ValueError(f"Tree exceeds x envelope [-1.90, 1.90]: min_x={min_x:.3f}, max_x={max_x:.3f}")
    if not (-1.90 <= min_y and max_y <= 1.90):
        raise ValueError(f"Tree exceeds y envelope [-1.90, 1.90]: min_y={min_y:.3f}, max_y={max_y:.3f}")
    if not (0.0 <= min_z and max_z <= 7.80):
        raise ValueError(f"Tree exceeds z envelope [0.0, 7.80]: min_z={min_z:.3f}, max_z={max_z:.3f}")

    target_brackets = {
        0: "2000-6000",
        1: "800-2000",
        2: "250-700",
    }

    metadata = {
        "assetId": "independent.organic-tree",
        "role": "scenery",
        "axes": {
            "blender": "+X right, -Y forward, +Z up",
            "gltfExport": "+Y up, +Z forward",
        },
        "lod": int(lod),
        "anchors": {
            "TreeRoot": (0.0, 0.0, 0.0),
            "GroundAnchor": (0.0, 0.0, 0.0),
            "CrownCenter": (round(crown_x, 3), round(crown_y, 3), round(crown_z, 3)),
        },
        "candidateDimensions": {
            "width_x": round(max_x - min_x, 3),
            "depth_y": round(max_y - min_y, 3),
            "height_z": round(max_z - min_z, 3),
            "envelope_bounds": {
                "min": [round(min_x, 3), round(min_y, 3), round(min_z, 3)],
                "max": [round(max_x, 3), round(max_y, 3), round(max_z, 3)],
            },
            "reservation": [4.0, 4.0, 8.0],
        },
        "geometryIntent": (
            "Oak-like broadleaf park tree using 6-variation LeafSet026 atlas cards, "
            "flared root anchor, bifurcated scaffold limbs, and cohesive 8-lobe crown dome."
        ),
        "edgeFinish": "authored",
        "notes": (
            f"LOD {lod} built targeting {target_brackets[lod]} bracket. "
            "Bark UVs follow branch grain at ~1m metric scale. "
            "Foliage utilizes LeafSet026 atlas rectangular cards with outward winding "
            "and dual textured sunlit/shaded materials."
        ),
        "triangleBudget": {
            "evaluatedTriangles": total_eval_tris,
            "branchTriangles": branch_tris,
            "foliageTriangles": foliage_tris,
            "targetBudget": target_brackets[lod],
        },
        "createdObjects": [
            tree_root.name,
            "GroundAnchor",
            "CrownCenter",
            branch_obj.name,
            foliage_obj.name,
        ],
    }

    return metadata
