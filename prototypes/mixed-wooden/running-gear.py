"""Standalone running-gear replacement module for wooden coaster bogie upstop brackets.

Replaces rail-penetrating legacy upstop brackets with finite closed-manifold C-channel
hangers clearing outboard rail head and web obstacles while mounting to frozen hubcap
and upstop-tyre outer planes without axle-contact or manufacturing claims.
"""

import bpy
import mathutils


def _create_empty(name, location=(0.0, 0.0, 0.0), parent=None):
    # Reference anchor empty linking replacement running-gear components at origin
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = "PLAIN_AXES"
    empty.empty_display_size = 0.2
    empty.location = mathutils.Vector(location)
    if parent:
        empty.parent = parent
    bpy.context.scene.collection.objects.link(empty)
    return empty


def _apply_physical_uvs(mesh):
    # Generates explicit physical metre-grain UV projection (1.0 UV unit per 1.0 metre)
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
            uv_data[loop_idx].uv = (u, v)


def _build_bracket_mesh_data(profile_xz, y_half, mirror_x=False):
    # Extrudes 2D continuous C-profile along longitudinal Y axis into a closed 2-manifold
    if mirror_x:
        # Reflect X across lateral symmetry plane
        profile = [(-x, z) for x, z in profile_xz]
    else:
        profile = list(profile_xz)

    n = len(profile)
    # Front ring at Y = -y_half and back ring at Y = +y_half
    verts_front = [(x, -y_half, z) for x, z in profile]
    verts_back = [(x, y_half, z) for x, z in profile]
    verts = verts_front + verts_back

    # Front cap normal points in -Y; back cap normal points in +Y
    face_front = tuple(range(n))
    face_back = tuple(reversed(range(n, 2 * n)))

    # Side quads connecting front and back ring edges
    side_faces = []
    for i in range(n):
        nxt = (i + 1) % n
        side_faces.append((i, n + i, n + nxt, nxt))

    faces = [face_front, face_back] + side_faces

    if mirror_x:
        # Chirality inversion from X reflection requires reversed winding on all faces
        faces = [tuple(reversed(f)) for f in faces]

    return verts, faces


def _create_mesh_object(name, verts, faces, material=None, parent=None, location=(0.0, 0.0, 0.0)):
    # Assembles Blender mesh object with polygons, metre-grain UVs, and material binding
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    _apply_physical_uvs(mesh)

    obj = bpy.data.objects.new(name, mesh)
    obj.location = mathutils.Vector(location)
    if parent:
        obj.parent = parent
    bpy.context.scene.collection.objects.link(obj)

    if material is not None:
        obj.data.materials.append(material)

    return obj


def build(materials):
    """Build standalone replacement running-gear upstop brackets.

    Args:
        materials: dictionary containing canonical material instances.
            'metal' is strictly required and non-None; no fallback permitted.

    Returns:
        Contract dictionary recording candidateDimensions, named empty anchors,
        meshNames, attachment parameters, contact planes, and unexecuted check scope.
    """
    # Strict validation: require non-None metal material without fallback
    if not isinstance(materials, dict) or "metal" not in materials or materials["metal"] is None:
        raise ValueError("Material 'metal' is required and must not be None")
    mat_metal = materials["metal"]

    # Module root anchor empty at local origin; exporter expects ONLY named Empty in anchors
    running_gear_root = _create_empty("RunningGearRoot", location=(0.0, 0.0, 0.0))

    # Revised 8-vertex continuous C-profile from measured counterexample resolution
    # Upper inner vertical plane X=0.5400000214576721 mounts to outer hubcap plane without volume collision
    # Lower inner vertical plane X=0.505 (exports float 0.5049999952316284) mates to upstop-tyre outer plane
    # Road axle bottom is at localUp ~ -0.0341224782; top bridge at -0.035 leaves 0.878mm gap (no axle contact claim)
    right_profile_xz = [
        (0.505, -0.335),                # Lower ledge inner bottom corner
        (0.605, -0.335),                # Lower outer bottom corner
        (0.605, -0.035),                # Upper outer top corner
        (0.5400000214576721, -0.035),   # Upper bridge inner top corner (outer hubcap mating edge)
        (0.5400000214576721, -0.075),   # Upper bridge inner bottom corner (hubcap boundary)
        (0.570, -0.075),                # Vertical leg inner top corner (clears web lateral bound |X| <= 0.562)
        (0.570, -0.300),                # Vertical leg inner bottom corner
        (0.505, -0.300),                # Lower ledge inner top corner (upstop tyre mating edge)
    ]

    # Longitudinal extrusion half-extent preserving |Y| <= 0.030 envelope
    y_half = 0.030

    # Right upstop hanger mesh
    r_verts, r_faces = _build_bracket_mesh_data(right_profile_xz, y_half, mirror_x=False)
    _create_mesh_object(
        "UpstopBracket_Right",
        r_verts,
        r_faces,
        material=mat_metal,
        parent=running_gear_root,
        location=(0.0, 0.0, 0.0),
    )

    # Mirrored left upstop hanger mesh with reversed winding
    l_verts, l_faces = _build_bracket_mesh_data(right_profile_xz, y_half, mirror_x=True)
    _create_mesh_object(
        "UpstopBracket_Left",
        l_verts,
        l_faces,
        material=mat_metal,
        parent=running_gear_root,
        location=(0.0, 0.0, 0.0),
    )

    # Standard exporter requires anchors dictionary to contain ONLY named Empty objects
    anchors = {
        "RunningGearRoot": running_gear_root,
    }

    mesh_names = [
        "UpstopBracket_Left",
        "UpstopBracket_Right",
    ]

    attachment = {
        "parent": "RunningGearRoot",
        "targetBogiePivots": ["BogieFront", "BogieRear"],
        "bogiePivotHeightBase": 0.67,
        "hubcapOuterPlaneRightX": 0.5400000214576721,
        "hubcapOuterPlaneLeftX": -0.5400000214576721,
        "upstopTyreOuterPlaneRightX": 0.5049999952316284,
        "upstopTyreOuterPlaneLeftX": -0.5049999952316284,
        "roadAxleBottomLocalZ": -0.0341224782,
        "roadAxleBridgeGapMeters": 0.0008775218,
    }

    contactfaces = {
        "upperInnerFaceHubcapMountPlane": {
            "normal": [-1.0, 0.0, 0.0],
            "rightLocalX": 0.5400000214576721,
            "leftLocalX": -0.5400000214576721,
            "localZRange": [-0.075, -0.035],
            "axialYRange": [-0.030, 0.030],
            "matingTarget": "outer_hubcap_plane",
            "witnessPointNear": [0.5400000214576721, 0.0, -0.042],
        },
        "lowerInnerFaceUpstopTyreMountPlane": {
            "normal": [-1.0, 0.0, 0.0],
            "rightLocalX": 0.5049999952316284,
            "leftLocalX": -0.5049999952316284,
            "localZRange": [-0.335, -0.300],
            "axialYRange": [-0.030, 0.030],
            "matingTarget": "upstop_tyre_outer_plane",
            "witnessPointNear": [0.5049999952316284, 0.0, -0.315],
        },
    }

    intendedchecksscope = {
        "checksStatus": "UNEXECUTED",
        "scope": "standalone_visual_running_gear_repair",
        "permittedContactDomain": "measured_finite_intersection_of_matching_opposing_faces",
        "actualFrozenFacePlanes": {
            "hubcapOuterPlaneRightX": 0.5400000214576721,
            "hubcapOuterPlaneLeftX": -0.5400000214576721,
            "upstopTyreOuterPlaneRightX": 0.5049999952316284,
            "upstopTyreOuterPlaneLeftX": -0.5049999952316284,
            "roadAxleBottomLocalZ": -0.0341224782,
        },
        "opposedContactWitnesses": {
            "upperWitness": {
                "localUpZ": -0.042,
                "axialY": 0.0,
                "needsActualSourceTriangleChecker": True,
            },
            "lowerWitness": {
                "localUpZ": -0.315,
                "axialY": 0.0,
                "needsActualSourceTriangleChecker": True,
            },
        },
        "obstacleClearance": {
            "railHeadRelativeZ": [-0.23, -0.17],
            "railBaseRelativeZ": [-0.25, -0.23],
            "railWebRelativeZ": [-0.49, -0.23],
            "railWebLateralX": [0.538, 0.562],
            "hangerVerticalClearanceX": 0.570,
            "hangerEnvelopeX": [-0.610, 0.610],
            "hangerEnvelopeY": [-0.030, 0.030],
            "hangerEnvelopeZ": [-0.335, -0.035],
        },
        "manifold": "closed_2_manifold_single_extrusion_per_side",
        "winding": "outward_normals",
        "uvMapping": "physical_metre_grain",
        "assertions": "no_axle_contact_or_manufacturing_claim",
    }

    return {
        "assetId": "running-gear",
        "referenceVariant": "PTC-inspired wooden running-gear upstop bracket replacement",
        "candidateDimensions": {
            "width": 1.21,
            "length": 0.06,
            "height": 0.30,
        },
        "anchors": anchors,
        "meshNames": mesh_names,
        "attachment": attachment,
        "contactfaces": contactfaces,
        "intendedchecksscope": intendedchecksscope,
        "notes": (
            "Standalone replacement upstop safety brackets for PTC-inspired wooden coaster bogies. "
            "Replaces rail-crossing legacy brackets with outboard C-channel hangers clearing rail head "
            "and web obstacles while interfacing with outer hubcap and upstop-tyre face planes."
        ),
        "geometryIntent": (
            "Closed manifold single extruded C-shaped profile per side with outward normals and "
            "metre-grain UV mapping, mounting to outer hubcap plane without volume collision or axle contact."
        ),
    }
