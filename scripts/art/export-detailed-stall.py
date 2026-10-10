"""Run only on Grok Bot: create editable masters and real GLB sample exports."""

import argparse
import hashlib
import importlib.util
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def make_materials(source):
    result = {}
    textured = {"timber": "Wood096", "boards": "WoodFloor043",
                "roof": "RoofingTiles013A", "metal": "Metal049A",
                "brick": "Bricks051", "fabric": "Fabric081C", "grass": "Grass001"}
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
    solids = {
        "paint_red": ((0.46, 0.026, 0.022, 1), 0.34, 0.05),
        "paint_teal": ((0.025, 0.22, 0.19, 1), 0.42, 0.05),
        "cream": ((0.85, 0.73, 0.47, 1), 0.55, 0),
        "brass": ((0.58, 0.36, 0.075, 1), 0.28, 0.8),
        "rubber": ((0.018, 0.022, 0.019, 1), 0.87, 0),
        "seat_vinyl": ((0.10, 0.055, 0.036, 1), 0.56, 0),
        "glass": ((0.10, 0.19, 0.17, 1), 0.20, 0),
        "ink": ((0.021, 0.039, 0.031, 1), 0.78, 0),
        "paper": ((0.86, 0.80, 0.60, 1), 0.91, 0),
    }
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
    return {"meshObjects": len(meshes), "trianglesEvaluated": triangles,
            "boundsBlender": {"min": low, "max": high}, "materials": sorted(materials),
            "anchorsBlender": {name: list(bpy.data.objects[name].matrix_world.translation)
                               for name in metadata.get("anchors", []) if bpy.data.objects.get(name)},
            "issues": issues}


def render_views(output, evidence):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 64
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
    light.energy = 1800
    light.shape = "DISK"
    light.size = extent
    lamp.rotation_euler = (center - lamp.location).to_track_quat("-Z", "Y").to_euler()
    fill = bpy.data.lights.new("Fill", "AREA")
    fill.energy = 650
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
    state_nodes = [bpy.data.objects.get(name) for name in ("OpenShutter", "ClosedShutter")]
    poses = ("open", "closed") if all(state_nodes) else ("default",)
    render_visibility = [(obj, obj.hide_render) for obj in scene.objects]
    for pose in poses:
        if pose != "default":
            for i, node in enumerate(state_nodes):
                for obj in [node, *node.children_recursive]:
                    obj.hide_render = (i == 0) != (pose == "open")
        for name, direction in [("front", (1, -1, 0.9)), ("rear", (-1, 1, 0.9))]:
            view.location = center + Vector(direction) * extent * 3
            view.rotation_euler = (center - view.location).to_track_quat("-Z", "Y").to_euler()
            file = output.parent / f"{output.stem}-{pose}-{name}.png"
            scene.render.filepath = str(file)
            bpy.ops.render.render(write_still=True)
            paths.append({"file": file.name, "sha256": sha256(file), "pose": pose})
    for obj, hidden in render_visibility:
        obj.hide_render = hidden
    return paths


def evaluate_all_states():
    # Hidden viewport children otherwise retain stale parent transforms.
    visibility = [(obj, obj.hide_viewport, obj.hide_get())
                  for obj in bpy.context.scene.objects]
    for obj, _, _ in visibility:
        obj.hide_viewport = False
        obj.hide_set(False)
    bpy.context.view_layer.update()
    return visibility


def restore_viewport_visibility(visibility):
    for obj, hidden, local_hidden in visibility:
        obj.hide_viewport = hidden
        obj.hide_set(local_hidden)
    bpy.context.view_layer.update()


def batch_export_meshes():
    buckets = {}
    for obj in list(bpy.context.scene.objects):
        if obj.type != "MESH":
            continue
        bpy.context.view_layer.objects.active = obj
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
    viewport_visibility = evaluate_all_states()
    # Editable bevel modifiers catch structural edges without changing the
    # ground/rail anchors or applying a blanket model scale.
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or len(obj.data.polygons) < 6 or obj.name.startswith("InfoGlyph_") or obj.get("authoredEdgeFinish", False):
            continue
        # Preserve thin authored details; finish structural edges visible at park zoom.
        if min(obj.dimensions) < 0.035 or max(obj.dimensions) < 0.5:
            continue
        if obj.name == "CarBody_Tub":
            shell = obj.modifiers.new("BodyShellThickness", "SOLIDIFY")
            shell.thickness = 0.025
        bevel = obj.modifiers.new("AuthoredEdgeFinish", "BEVEL")
        bevel.width = min(0.012, min(obj.dimensions) * 0.12)
        bevel.segments = 2
        bevel.limit_method = "ANGLE"
        bevel.angle_limit = math.radians(40)
        bevel.harden_normals = True
    bpy.context.view_layer.update()
    evidence = geometry_evidence(metadata)
    all_points = [obj.matrix_world @ vertex.co for obj in bpy.context.scene.objects
                  if obj.type == "MESH" for vertex in obj.data.vertices]
    low = [min(p[i] for p in all_points) for i in range(3)]
    high = [max(p[i] for p in all_points) for i in range(3)]
    evaluated_low = evidence["boundsBlender"]["min"]
    evaluated_high = evidence["boundsBlender"]["max"]
    if (evaluated_low[0] < -1.95 or evaluated_low[1] < -1.95 or evaluated_high[0] > 1.95 or evaluated_high[1] > 1.95 or evaluated_low[2] < -1e-6 or evaluated_high[2] > 3.85):
        evidence["issues"].append("Supported state geometry exceeds one-tile authored envelope")
    state_bounds = {}
    for name in ("OpenShutter", "ClosedShutter"):
        node = bpy.data.objects.get(name)
        points = [obj.matrix_world @ vertex.co for obj in node.children_recursive
                  if obj.type == "MESH" for vertex in obj.data.vertices] if node else []
        state_bounds[name] = {"min": [min(p[i] for p in points) for i in range(3)],
                              "max": [max(p[i] for p in points) for i in range(3)]} if points else None
    preflight = {"geometry": evidence, "allStateBoundsRaw": {"min": low, "max": high},
                 "stateBoundsRaw": state_bounds, "sourceSha256": sha256(options.source),
                 "viewportTransformEvaluation": "All objects unhidden for depsgraph evaluation; authored render pose preserved",
                 "scope": "Actual geometry and all-state envelope; no pixel or human acceptance"}
    options.output.parent.mkdir(parents=True, exist_ok=True)
    options.output.with_suffix(".preflight.json").write_text(json.dumps(preflight, indent=2) + "\n")
    if evidence["issues"]:
        raise ValueError(json.dumps(evidence["issues"]))
    options.output.parent.mkdir(parents=True, exist_ok=True)
    for material in list(bpy.data.materials):
        if material.users == 0:
            bpy.data.materials.remove(material)
    for image in list(bpy.data.images):
        if image.users == 0:
            bpy.data.images.remove(image)
        elif image.source == "FILE" and not image.packed_file:
            # Repacking a generated image after it becomes FILE loses its packed PNG.
            image.pack()
    master = options.output.with_suffix(".blend")
    restore_viewport_visibility(viewport_visibility)
    bpy.ops.wm.save_as_mainfile(filepath=str(master), compress=True)
    evaluate_all_states()
    if options.batch_static:
        batch_export_meshes()
    texture_sources = []
    derived_sources = []
    for image in bpy.data.images:
        if image.users == 0:
            continue
        if image.get("coaster_derivation") == "srgb-decode-linear-mix-srgb-encode-v1":
            if not image.packed_file or tuple(image.size) != (512, 512):
                raise ValueError(f"Derived albedo is not a packed 512 image: {image.name}")
            source_file = Path(bpy.path.abspath(image["source_filepath"]))
            packed = bytes(image.packed_file.data)
            derived_sources.append({"image": image.name, "sourceFile": source_file.name,
                                    "sourceSha256": sha256(source_file),
                                    "algorithm": image["coaster_derivation"],
                                    "linearTint": list(image["tint_color"]),
                                    "mixFactor": image["mix_factor"],
                                    "sampleDimensions": list(image["sample_dimensions"]),
                                    "sourceChannels": image["source_channels"],
                                    "samplePixelCount": image["sample_pixel_count"],
                                    "packedMasterSha256": hashlib.sha256(packed).hexdigest(),
                                    "packedMasterBytes": len(packed),
                                    "runtimeDimensions": list(image.size)})
        elif image.source == "FILE":
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
              "textureSources": texture_sources, "derivedTextures": derived_sources,
              "batchStatic": options.batch_static,
              "glb": {"file": options.output.name, "sha256": sha256(options.output), "bytes": options.output.stat().st_size},
              "editableMaster": {"file": master.name, "sha256": sha256(master), "bytes": master.stat().st_size},
              "scope": "Candidate detailed asset laboratory; no original-metric or gameplay validation"}
    if options.render:
        result["renders"] = render_views(options.output, evidence)
    options.output.with_suffix(".json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"asset": options.output.stem, "triangles": evidence["trianglesEvaluated"],
                      "glbBytes": result["glb"]["bytes"], "issues": evidence["issues"]}))


if __name__ == "__main__":
    main()
