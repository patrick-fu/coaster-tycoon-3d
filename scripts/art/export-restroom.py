"""Run only on Grok Bot: create editable masters and real GLB sample exports."""

import argparse
import hashlib
import importlib.util
import json
import math
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def make_materials(source):
    result = {}
    textured = {"timber": "Wood096", "boards": "WoodFloor043", "roof": "RoofingTiles013A", "plaster": "Concrete034", "metal": "Metal049A"}
    for key, asset in textured.items():
        mat = bpy.data.materials.new(key)
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        shader = nodes.get("Principled BSDF")
        shader.inputs["Roughness"].default_value = 0.7
        if key == "grass":
            shader.inputs["Base Color"].default_value = (0.035, 0.17, 0.055, 1)
        for suffix, slot in [("Color", "Base Color"), ("Roughness", "Roughness"),
                             ("Metalness", "Metallic"), ("NormalGL", "Normal")]:
            file = source / asset / f"{asset}_1K-PNG_{suffix}.png"
            if not file.exists():
                continue
            image = bpy.data.images.load(str(file), check_existing=True)
            image.colorspace_settings.name = "sRGB" if suffix == "Color" else "Non-Color"
            image_node = nodes.new("ShaderNodeTexImage")
            image_node.image = image
            if suffix == "NormalGL":
                normal = nodes.new("ShaderNodeNormalMap")
                normal.inputs["Strength"].default_value = 0.4
                mat.node_tree.links.new(image_node.outputs["Color"], normal.inputs["Color"])
                mat.node_tree.links.new(normal.outputs["Normal"], shader.inputs[slot])
            else:
                mat.node_tree.links.new(image_node.outputs["Color"], shader.inputs[slot])
        result[key] = mat
    solids = {"paint_teal": ((0.025,0.22,0.19,1),0.55,0), "cream": ((0.85,0.73,0.47,1),0.65,0), "ink": ((0.021,0.039,0.031,1),0.78,0)}
    for key, (color, roughness, metalness) in solids.items():
        mat = bpy.data.materials.new(key)
        mat.use_nodes = True
        shader = mat.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = color
        shader.inputs["Roughness"].default_value = roughness
        shader.inputs["Metallic"].default_value = metalness
        result[key] = mat
    return result


def geometry_evidence(metadata):
    deps = bpy.context.evaluated_depsgraph_get()
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    points = []
    triangles = 0
    issues = []
    materials = set()
    for obj in meshes:
        evaluated = obj.evaluated_get(deps)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        if any(t.area <= 1e-12 for t in mesh.loop_triangles):
            issues.append(f"Degenerate triangles: {obj.name}")
        if any(not math.isfinite(n) for poly in mesh.polygons for n in poly.normal):
            issues.append(f"Non-finite normals: {obj.name}")
        if mesh.uv_layers and any(not math.isfinite(v) for loop in mesh.uv_layers.active.data for v in loop.uv):
            issues.append(f"Non-finite UVs: {obj.name}")
        triangles += len(mesh.loop_triangles)
        points.extend(obj.matrix_world @ v.co for v in mesh.vertices)
        if any(not math.isfinite(x) for v in mesh.vertices for x in v.co):
            issues.append(f"Non-finite geometry: {obj.name}")
        if not mesh.uv_layers and any(mat and mat.use_nodes and any(n.type == "TEX_IMAGE" for n in mat.node_tree.nodes) for mat in obj.data.materials):
            issues.append(f"Textured mesh lacks UVs: {obj.name}")
        materials.update(mat.name for mat in obj.data.materials if mat)
        evaluated.to_mesh_clear()
    for name in metadata.get("anchors", []):
        obj = bpy.data.objects.get(name)
        if obj is None or obj.type != "EMPTY":
            issues.append(f"Missing authored empty anchor: {name}")
    if not points:
        issues.append("No authored mesh")
    low = [min(v[i] for v in points) for i in range(3)] if points else [0, 0, 0]
    high = [max(v[i] for v in points) for i in range(3)] if points else [0, 0, 0]
    if any(low[i] < -0.49001 or high[i] > 0.49001 for i in [0, 1]) or low[2] < -0.00001 or high[2] > 0.90001:
        issues.append("Geometry exceeds normalized one-tile bounds")
    if triangles > 8000 or len(materials) > 8:
        issues.append("Evaluated asset exceeds the declared triangle/material budget")
    return {"meshObjects": len(meshes), "trianglesEvaluated": triangles,
            "boundsBlender": {"min": low, "max": high}, "materials": sorted(materials),
            "anchorsBlender": {name: list(bpy.data.objects[name].matrix_world.translation)
                               for name in metadata.get("anchors", []) if bpy.data.objects.get(name)},
            "issues": issues}


def render_views(output, evidence):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 128
    scene.cycles.use_denoising = False
    scene.render.resolution_x = 768
    scene.render.resolution_y = 768
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (0.26, 0.26, 0.26)
    scene.view_settings.view_transform = "AgX"
    low = Vector(evidence["boundsBlender"]["min"])
    high = Vector(evidence["boundsBlender"]["max"])
    center = (low + high) / 2
    extent = max(high.x - low.x, high.y - low.y, high.z - low.z)
    bpy.ops.mesh.primitive_plane_add(size=extent * 8, location=(center.x, center.y, low.z - 0.015))
    ground = bpy.context.object
    ground.name = "RenderGround"
    mat = bpy.data.materials.new("RenderGroundMaterial")
    mat.diffuse_color = (0.065, 0.12, 0.09, 1)
    ground.data.materials.append(mat)
    light = bpy.data.lights.new("Key", "AREA")
    lamp = bpy.data.objects.new("Key", light)
    scene.collection.objects.link(lamp)
    lamp.location = center + Vector((-extent, -extent, extent * 2))
    light.energy = 65
    light.shape = "DISK"
    light.size = extent
    lamp.rotation_euler = (center - lamp.location).to_track_quat("-Z", "Y").to_euler()
    fill = bpy.data.lights.new("Fill", "AREA")
    fill.energy = 25
    fill.size = extent * 1.5
    lamp2 = bpy.data.objects.new("Fill", fill)
    scene.collection.objects.link(lamp2)
    lamp2.location = center + Vector((extent, extent, extent))
    lamp2.rotation_euler = (center - lamp2.location).to_track_quat("-Z", "Y").to_euler()
    camera = bpy.data.cameras.new("ReviewCamera")
    view = bpy.data.objects.new("ReviewCamera", camera)
    scene.collection.objects.link(view)
    camera.type = "ORTHO"
    camera.ortho_scale = extent * 1.45
    scene.camera = view
    paths = []
    for name, direction in [("front-right",(1,-1,0.9)),("front-left",(-1,-1,0.9)),("rear-left",(-1,1,0.9)),("rear-right",(1,1,0.9))]:
        view.location = center + Vector(direction) * extent * 3
        view.rotation_euler = (center - view.location).to_track_quat("-Z", "Y").to_euler()
        for distance, resolution, framing in [("close",768,1.45),("overview",384,3.4)]:
            camera.ortho_scale = extent * framing
            scene.render.resolution_x = resolution
            scene.render.resolution_y = resolution
            file = output.parent / f"{output.stem}-{name}-{distance}.png"
            scene.render.filepath = str(file)
            bpy.ops.render.render(write_still=True)
            paths.append({"file": file.name,"sha256": sha256(file)})
    return paths


def batch_export_meshes():
    buckets = {}
    for obj in list(bpy.context.scene.objects):
        if obj.type != "MESH":
            continue
        bpy.context.view_layer.objects.active = obj
        if obj.data.users > 1:
            obj.data = obj.data.copy()
        for modifier in list(obj.modifiers):
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        key = (obj.parent.name if obj.parent else "Scene", tuple(mat.name for mat in obj.data.materials))
        buckets.setdefault(key, []).append(obj)
    for (parent, materials), objects in buckets.items():
        if len(objects) < 2:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        objects[0].name = "Static_" + parent + "_" + "_".join(materials)


def main():
    args = sys.argv[sys.argv.index("--") + 1:]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--materials", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--render", action="store_true")
    parser.add_argument("--batch-static", action="store_true")
    options = parser.parse_args(args)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    spec = importlib.util.spec_from_file_location("asset_source", options.source)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    metadata = module.build(make_materials(options.materials))
    metadata["anchors"] = list(metadata.get("anchors", []))
    metadata["restraints"] = list(metadata.get("restraints", []))
    # Weld coincident face vertices so the editable bevel acts on actual edges.
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        mesh = bmesh.new()
        mesh.from_mesh(obj.data)
        bmesh.ops.remove_doubles(mesh, verts=list(mesh.verts), dist=1e-7)
        mesh.normal_update()
        mesh.to_mesh(obj.data)
        mesh.free()
        # Bevel collapses edges at the shared corners of these welded frame members.
        if obj.name in {"Restroom_Sign_Details", "Restroom_Roof_Planes", "Restroom_Timber_Framing", "Restroom_Baffle_Frame"}:
            continue
        bevel = obj.modifiers.new("AuthoredEdgeFinish", "BEVEL")
        bevel.width = 0.0015
        bevel.segments = 1
        bevel.limit_method = "ANGLE"
        bevel.angle_limit = math.radians(40)
        bevel.harden_normals = True
    bpy.context.view_layer.update()
    evidence = geometry_evidence(metadata)
    options.output.parent.mkdir(parents=True, exist_ok=True)
    (options.output.parent / "geometry-evidence.json").write_text(json.dumps(evidence, indent=2) + "\n")
    if evidence["issues"]:
        raise ValueError(json.dumps(evidence["issues"]))
    options.output.parent.mkdir(parents=True, exist_ok=True)
    for material in list(bpy.data.materials):
        if material.users == 0:
            bpy.data.materials.remove(material)
    for image in list(bpy.data.images):
        if image.users == 0:
            bpy.data.images.remove(image)
        elif image.source == "FILE":
            image.pack()
    master = options.output.with_suffix(".blend")
    bpy.ops.wm.save_as_mainfile(filepath=str(master), compress=True)
    if options.batch_static:
        batch_export_meshes()
    texture_sources = []
    for image in bpy.data.images:
        if image.source != "FILE" or image.users == 0:
            continue
        file = Path(bpy.path.abspath(image.filepath))
        texture_sources.append({"file": file.name, "sourceSha256": sha256(file),
                                "sourceDimensions": list(image.size), "runtimeDimensions": [512, 512]})
        if max(image.size) > 512:
            image.scale(512, 512)
    bpy.ops.export_scene.gltf(filepath=str(options.output), export_format="GLB", export_yup=True,
                              export_apply=True, export_extras=True, export_cameras=False,
                              export_lights=False)
    result = {"authoring": metadata, "geometry": evidence, "blender": bpy.app.version_string,
              "sourceSha256": sha256(options.source), "driverSha256": sha256(Path(__file__)),
              "textureSources": texture_sources,
              "batchStatic": options.batch_static,
              "glb": {"file": options.output.name, "sha256": sha256(options.output), "bytes": options.output.stat().st_size},
              "editableMaster": {"file": master.name, "sha256": sha256(master), "bytes": master.stat().st_size},
              "scope": "Normalized independent detailed restroom candidate; no original-metric, gameplay, human or GPU acceptance"}
    if options.render:
        result["renders"] = render_views(options.output, evidence)
    options.output.with_suffix(".json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"asset": options.output.stem, "triangles": evidence["trianglesEvaluated"],
                      "glbBytes": result["glb"]["bytes"], "issues": evidence["issues"]}))


if __name__ == "__main__":
    main()
