"""Finite articulated drawbar authoring fragment; not yet qualified."""
from hitch_geometry import mesh, tube, anchor


def build(materials, parent):
    """Build a finite 0.20m hinged steel drawbar with drilled annular eyes.

    Args:
        materials: Mapping with 'metal' and 'brass' material entries.
        parent: Link root object at origin.

    Returns:
        Metadata dict with candidate dimensions, parts, anchors, and internal attachment pairs.
    """
    mat_metal = materials.get("metal")
    mat_brass = materials.get("brass") or mat_metal

    # 1. Exact kinematic endpoint articulation nodes at 0.20m spacing (+Z vertical)
    joint_a = anchor("Joint_EndA", (0.0, -0.10, 0.0), parent)
    joint_b = anchor("Joint_EndB", (0.0, 0.10, 0.0), parent)

    # 2. Drilled annular bearing eyes (outer r=0.030m, inner r=0.014m, height=0.024m)
    eye_a = tube("Drawbar_Eye_EndA", (0.0, -0.10, 0.0), 0.030, 0.014, 0.024, mat_brass, parent)
    eye_b = tube("Drawbar_Eye_EndB", (0.0, 0.10, 0.0), 0.030, 0.014, 0.024, mat_brass, parent)

    # 3. Closed manifold tapered steel bar connecting both eye rims
    we, he = 0.028 / 2, 0.022 / 2
    wm, hm = 0.025 / 2, 0.018 / 2
    ye = 0.074
    verts = [
        (-we, -ye, -he), (we, -ye, -he), (we, -ye, he), (-we, -ye, he),  # Station 0 (-Y)
        (-wm, 0.0, -hm), (wm, 0.0, -hm), (wm, 0.0, hm), (-wm, 0.0, hm),  # Station 1 (mid)
        (-we, ye, -he), (we, ye, -he), (we, ye, he), (-we, ye, he),      # Station 2 (+Y)
    ]
    faces = [
        (0, 1, 2, 3),        # -Y cap
        (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0),  # front taper segment
        (4, 8, 9, 5), (5, 9, 10, 6), (6, 10, 11, 7), (7, 11, 8, 4),  # rear taper segment
        (8, 11, 10, 9),      # +Y cap
    ]
    bar_obj = mesh("Drawbar_Bar", verts, faces, mat_metal, parent)

    return {
        "assetId": "coaster-drawbar-0.20m",
        "candidateScope": "finite visual candidate; unqualified; pending root kinematic and collision validation",
        "endpointNodes": {
            "Joint_EndA": joint_a,
            "Joint_EndB": joint_b,
        },
        "parts": {
            "Drawbar_Bar": bar_obj,
            "Drawbar_Eye_EndA": eye_a,
            "Drawbar_Eye_EndB": eye_b,
        },
        "candidateDimensions": {
            "length_between_joints": 0.20,
            "bar_width_mid": 0.025,
            "bar_thickness_mid": 0.018,
            "bar_width_end": 0.028,
            "bar_thickness_end": 0.022,
            "eye_outer_radius": 0.030,
            "eye_inner_radius": 0.014,
            "eye_thickness": 0.024,
            "head_envelope_radius": 0.030,
            "head_envelope_bound": 0.09995,
        },
        "intendedInternalAttachments": [
            ("Drawbar_Bar", "Drawbar_Eye_EndA"),
            ("Drawbar_Bar", "Drawbar_Eye_EndB"),
        ],
        "validationStatus": "unqualified candidate; root validation required; collisions uncertified",
    }
