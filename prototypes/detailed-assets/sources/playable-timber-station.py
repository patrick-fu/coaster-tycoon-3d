"""Compose the bounded station refinement and verify every unchanged source object."""

import hashlib
import importlib.util
import json
from pathlib import Path

import bpy


def _load(name):
    path = Path(__file__).with_name(name + ".py")
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module, hashlib.sha256(path.read_bytes()).hexdigest()


def _stamp(obj):
    value = {"parent": obj.parent.name if obj.parent else None,
             "matrix": [list(row) for row in obj.matrix_local]}
    if obj.type == "MESH":
        mesh = obj.data
        value.update(vertices=[list(v.co) for v in mesh.vertices],
                     faces=[list(p.vertices) for p in mesh.polygons],
                     uv=[[list(loop.uv) for loop in layer.data] for layer in mesh.uv_layers],
                     materials=[mat.name for mat in mesh.materials])
    return hashlib.sha256(json.dumps(value, separators=(",", ":")).encode()).hexdigest()


def _serializable(value):
    if isinstance(value, bpy.types.Object):
        return value.name
    if isinstance(value, dict):
        return {key: _serializable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_serializable(item) for item in value]
    return value


def build(materials):
    source, source_hash = _load("timber-station")
    gates, gate_hash = _load("station-gates")
    original = source.build(materials)
    bpy.context.view_layer.update()
    before = {obj.name: _stamp(obj) for obj in bpy.context.scene.objects}
    metadata = gates.refine(original, materials)
    bpy.context.view_layer.update()
    changed = set(metadata["removedObjects"])
    assert len(changed) == 33
    survivors = {name: signature for name, signature in before.items() if name not in changed}
    for name, signature in survivors.items():
        obj = bpy.data.objects.get(name)
        if obj is None or _stamp(obj) != signature:
            raise ValueError("Station refinement changed an unrelated source object: " + name)
    metadata["sourcePreservation"] = {
        "originalSourceSha256": source_hash, "gateSourceSha256": gate_hash,
        "unchangedObjects": survivors, "changedObjects": sorted(changed),
        "railSupport": "The inboard web joins lowered ties to the extended base flange; the outboard moving axle passage remains open.",
        "checks": "Exact source vertices, faces, UVs, materials, parent and local matrix equality",
    }
    return _serializable(metadata)
