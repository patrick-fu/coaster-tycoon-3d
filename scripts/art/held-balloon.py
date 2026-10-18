import bpy
import math
import mathutils

PROFILE = [
    (0.702, 0.000), (0.706, 0.012), (0.712, 0.010), (0.720, 0.015),
    (0.728, 0.009), (0.750, 0.018), (0.790, 0.040), (0.840, 0.082),
    (0.900, 0.138), (0.960, 0.186), (1.020, 0.210), (1.080, 0.206),
    (1.140, 0.184), (1.190, 0.148), (1.230, 0.102), (1.260, 0.055),
    (1.280, 0.000)
]

def get_material(materials, name, color, roughness):
    if materials and name in materials:
        return materials[name]
    mat = bpy.data.materials.get(name)
    if not mat:
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = color
            bsdf.inputs["Roughness"].default_value = roughness
            bsdf.inputs["Metallic"].default_value = 0.0
    return mat

def build_balloon_mesh_data():
    S, np = 18, len(PROFILE)
    verts = [mathutils.Vector((0.0, 0.0, PROFILE[0][0]))]
    for i in range(1, np - 1):
        z, r = PROFILE[i]
        for j in range(S):
            th = 2.0 * math.pi * j / S
            verts.append(mathutils.Vector((r * math.cos(th), r * math.sin(th), z)))
    top_idx = len(verts)
    verts.append(mathutils.Vector((0.0, 0.0, PROFILE[-1][0])))

    def v_idx(i, j):
        return 1 + (i - 1) * S + (j % S)

    faces, uvs = [], []
    v0, v1 = 0.0, 1.0 / (np - 1)
    for j in range(S):
        j1 = (j + 1) % S
        faces.append((0, v_idx(1, j1), v_idx(1, j)))
        uvs.append([((j + 0.5) / S, v0), ((j + 1) / S, v1), (j / S, v1)])

    for i in range(1, np - 2):
        vi, vi1 = i / (np - 1), (i + 1) / (np - 1)
        for j in range(S):
            j1 = (j + 1) % S
            faces.append((v_idx(i, j), v_idx(i, j1), v_idx(i + 1, j1), v_idx(i + 1, j)))
            uvs.append([(j / S, vi), ((j + 1) / S, vi), ((j + 1) / S, vi1), (j / S, vi1)])

    v_top_ring = (np - 2) / (np - 1)
    for j in range(S):
        j1 = (j + 1) % S
        faces.append((top_idx, v_idx(np - 2, j), v_idx(np - 2, j1)))
        uvs.append([((j + 0.5) / S, 1.0), (j / S, v_top_ring), ((j + 1) / S, v_top_ring)])

    return verts, faces, uvs

def build_string_mesh_data():
    Ns, M, r = 14, 8, 0.004
    centers = [
        mathutils.Vector((0.016 * math.sin(math.pi * k / Ns), 0.008 * math.sin(math.pi * k / Ns), 0.702 * k / Ns))
        for k in range(Ns + 1)
    ]
    verts = []
    for k in range(Ns + 1):
        c = centers[k]
        # Flat end sections keep the grip cap entirely at or above its ground datum.
        T = mathutils.Vector((0.0, 0.0, 1.0)) if k in (0, Ns) else (centers[k + 1] - centers[k - 1]).normalized()
        ref = mathutils.Vector((1.0, 0.0, 0.0))
        U = (ref - T * ref.dot(T)).normalized()
        V = T.cross(U).normalized()
        for m in range(M):
            phi = 2.0 * math.pi * m / M
            verts.append(c + r * (math.cos(phi) * U + math.sin(phi) * V))

    bot_c_idx = len(verts)
    verts.append(centers[0])
    top_c_idx = len(verts)
    verts.append(centers[-1])

    faces, uvs = [], []
    for k in range(Ns):
        vk, vk1 = k / Ns, (k + 1) / Ns
        for m in range(M):
            m1 = (m + 1) % M
            faces.append((k * M + m, k * M + m1, (k + 1) * M + m1, (k + 1) * M + m))
            uvs.append([(m / M, vk), ((m + 1) / M, vk), ((m + 1) / M, vk1), (m / M, vk1)])

    for m in range(M):
        m1 = (m + 1) % M
        faces.append((bot_c_idx, m1, m))
        disk = lambda j: (0.5 + 0.5 * math.cos(2 * math.pi * j / M), 0.5 + 0.5 * math.sin(2 * math.pi * j / M))
        uvs.append([(0.5, 0.5), disk(m1), disk(m)])

    top_off = Ns * M
    for m in range(M):
        m1 = (m + 1) % M
        faces.append((top_c_idx, top_off + m, top_off + m1))
        uvs.append([(0.5, 0.5), disk(m), disk(m1)])

    return verts, faces, uvs

def make_mesh_object(scene, name, mesh_name, verts, faces, uvs, mat, parent):
    mesh = bpy.data.meshes.new(mesh_name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for idx, poly in enumerate(mesh.polygons):
        poly.use_smooth = True
        poly_uvs = uvs[idx]
        for l_idx, loop_idx in enumerate(poly.loop_indices):
            uv_layer.data[loop_idx].uv = poly_uvs[l_idx]
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    obj["authoredEdgeFinish"] = True
    obj.parent = parent
    scene.collection.objects.link(obj)
    return obj

def build(materials=None):
    scene = bpy.context.scene if bpy.context and bpy.context.scene else bpy.data.scenes[0]

    mat_skin = get_material(materials, "BalloonSkin", (1.0, 1.0, 1.0, 1.0), 0.30)
    mat_string = get_material(materials, "BalloonString", (0.88, 0.86, 0.82, 1.0), 0.85)

    root = bpy.data.objects.new("GroundRoot", None)
    root.empty_display_type = "PLAIN_AXES"
    root.location = (0.0, 0.0, 0.0)
    scene.collection.objects.link(root)

    hand = bpy.data.objects.new("HandAnchor", None)
    hand.empty_display_type = "PLAIN_AXES"
    hand.location = (0.0, 0.0, 0.0)
    hand.parent = root
    scene.collection.objects.link(hand)

    b_verts, b_faces, b_uvs = build_balloon_mesh_data()
    make_mesh_object(scene, "BalloonSkinMesh", "BalloonSkinMesh", b_verts, b_faces, b_uvs, mat_skin, root)

    s_verts, s_faces, s_uvs = build_string_mesh_data()
    make_mesh_object(scene, "BalloonStringMesh", "BalloonStringMesh", s_verts, s_faces, s_uvs, mat_string, root)

    return {
        "assetId": "held_balloon",
        "anchors": ["GroundRoot", "HandAnchor"],
        "restraints": [],
        "notes": "Original sculpted balloon with knotted neck and taut curved string; 780 tris, 2 PBR materials"
    }
