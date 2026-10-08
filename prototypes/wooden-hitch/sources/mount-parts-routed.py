"""Detailed candidate carrier, U-clevis and pin mount hardware for wooden coaster car."""
from hitch_geometry import mesh, cylinder, anchor


def _build_carrier(name, sign_y, material, parent):
    """Build a closed manifold Y-shaped carrier plate connecting stringers to clevis."""
    # Outline in positive-Y frame (+Y rear)
    outline = [
        (-0.476, 1.250), (-0.444, 1.250), (-0.016, 1.284), (0.016, 1.284),
        (0.444, 1.250), (0.476, 1.250), (0.476, 1.274), (0.034, 1.300),
        (-0.034, 1.300), (-0.476, 1.274),
    ]
    z0, z1 = 0.206, 0.234
    pts = [(x, sign_y * y) for x, y in outline]
    verts = [(x, y, z0) for x, y in pts] + [(x, y, z1) for x, y in pts]

    n = len(outline)
    p_quads = [(0, 1, 8, 9), (2, 3, 7, 8), (4, 5, 6, 7)]
    p_tris = [(1, 2, 8), (3, 4, 7)]

    if sign_y > 0:  # Rear mount (+Y)
        sides = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
        caps = (
            [(n + a, n + b, n + c, n + d) for a, b, c, d in p_quads]
            + [(n + a, n + b, n + c) for a, b, c in p_tris]
            + [(d, c, b, a) for a, b, c, d in p_quads]
            + [(c, b, a) for a, b, c in p_tris]
        )
    else:  # Front mount (-Y)
        sides = [((i + 1) % n, i, n + i, n + (i + 1) % n) for i in range(n)]
        caps = (
            [(n + d, n + c, n + b, n + a) for a, b, c, d in p_quads]
            + [(n + c, n + b, n + a) for a, b, c in p_tris]
            + [(a, b, c, d) for a, b, c, d in p_quads]
            + [(a, b, c) for a, b, c in p_tris]
        )

    return mesh(name, verts, sides + caps, material, parent)

def _build_clevis(name, sign_y, material, parent):
    """Build a closed manifold U-clevis fork with horizontal plates around eye."""
    y0 = sign_y * 1.300
    y1 = sign_y * 1.380
    yt = sign_y * 1.305
    w = 0.068 / 2
    z_lb, z_lt = 0.195, 0.205
    z_ub, z_ut = 0.235, 0.245

    profile = [
        (y0, z_lb), (y1, z_lb), (y1, z_lt), (yt, z_lt),
        (yt, z_ub), (y1, z_ub), (y1, z_ut), (y0, z_ut),
    ]
    verts = [(-w, y, z) for y, z in profile] + [(w, y, z) for y, z in profile]

    if sign_y < 0:  # Front mount (-Y)
        mantle = [((i + 1) % 8, i, 8 + i, 8 + (i + 1) % 8) for i in range(8)]
        caps = [
            (0, 1, 2, 3), (4, 5, 6, 7), (0, 3, 4, 7),          # -X cap
            (11, 10, 9, 8), (15, 14, 13, 12), (15, 12, 11, 8),  # +X cap
        ]
    else:  # Rear mount (+Y)
        mantle = [(i, (i + 1) % 8, 8 + (i + 1) % 8, 8 + i) for i in range(8)]
        caps = [
            (3, 2, 1, 0), (7, 6, 5, 4), (7, 4, 3, 0),          # -X cap
            (8, 9, 10, 11), (12, 13, 14, 15), (8, 11, 12, 15),  # +X cap
        ]

    return mesh(name, verts, mantle + caps, material, parent)


def build(materials, parent):
    """Build detailed mirrored front and rear carrier beams, U-clevises, and pins.

    Args:
        materials: Dictionary with 'metal' and 'brass' materials.
        parent: Unchanged car root object.

    Returns:
        Metadata dict with candidate dimensions, parts, anchors, and intended attachment pairs.
    """
    mat_metal = materials.get("metal")
    mat_brass = materials.get("brass") or mat_metal

    carrier_f = _build_carrier("Mount_Carrier_Front", -1.0, mat_metal, parent)
    carrier_r = _build_carrier("Mount_Carrier_Rear", 1.0, mat_metal, parent)

    # 2. Front and rear U-clevises with matching planar interfaces at |Y|=1.30 and 0.030m clear eye gap
    clevis_f = _build_clevis("Mount_Clevis_Front", -1.0, mat_metal, parent)
    clevis_r = _build_clevis("Mount_Clevis_Rear", 1.0, mat_metal, parent)

    # 3. Upright pins centered at exact coupler axes (radius 0.012m clearing 0.014m eye hole)
    pin_f = cylinder("Mount_Pin_Front", (0.0, -1.34, 0.22), 0.012, 0.060, mat_brass, parent)
    pin_r = cylinder("Mount_Pin_Rear", (0.0, 1.34, 0.22), 0.012, 0.060, mat_brass, parent)

    # Anchors reference
    anchors = {
        "Coupler_Front": (0.0, -1.34, 0.22),
        "Coupler_Rear": (0.0, 1.34, 0.22),
        "Stringer_Front_Left_Face": (-0.46, -1.25, 0.22),
        "Stringer_Front_Right_Face": (0.46, -1.25, 0.22),
        "Stringer_Rear_Left_Face": (-0.46, 1.25, 0.22),
        "Stringer_Rear_Right_Face": (0.46, 1.25, 0.22),
    }
    for child in getattr(parent, "children", []):
        if child.name in ("Coupler_Front", "Coupler_Rear"):
            anchors[child.name] = child

    return {
        "assetId": "coaster-hitch-mounts",
        "candidateScope": "finite visual candidate mount hardware; unqualified; pending root collision validation",
        "parts": {
            "Mount_Carrier_Front": carrier_f,
            "Mount_Clevis_Front": clevis_f,
            "Mount_Pin_Front": pin_f,
            "Mount_Carrier_Rear": carrier_r,
            "Mount_Clevis_Rear": clevis_r,
            "Mount_Pin_Rear": pin_r,
        },
        "anchors": anchors,
        "candidateDimensions": {
            "carrier_attachment_width_x": 0.032,
            "carrier_outer_half_span_x": 0.476,
            "carrier_height_z": 0.028,
            "carrier_y_front": (-1.25, -1.30),
            "carrier_y_rear": (1.25, 1.30),
            "clevis_gap_vertical": 0.030,
            "clevis_plate_thickness": 0.010,
            "pin_radius": 0.012,
            "pin_height": 0.060,
            "eye_hole_clearance_radial": 0.002,
            "eye_thickness_clearance_vertical": 0.006,
            "head_envelope_radius": 0.058,
            "head_envelope_bound": 0.09995,
        },
        "intendedAttachmentPairs": [
            ("Mount_Carrier_Front", "Mount_Clevis_Front"),
            ("Mount_Clevis_Front", "Mount_Pin_Front"),
            ("Mount_Carrier_Rear", "Mount_Clevis_Rear"),
            ("Mount_Clevis_Rear", "Mount_Pin_Rear"),
        ],
        "requiredKinematicYaw": {
            "front_deg": 15.8242714,
            "rear_deg": 15.1308793,
        },
        "validationStatus": "unqualified candidate; root validation required on Grok Bot; collision clearance uncertified",
    }

