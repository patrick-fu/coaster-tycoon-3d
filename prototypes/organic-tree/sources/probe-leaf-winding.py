"""Check actual authored card winding on Grok Bot, independently of its normal list."""
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

from mathutils import Vector

source = Path(sys.argv[sys.argv.index("--") + 1])
spec = importlib.util.spec_from_file_location("leaf_source", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
forward, up = Vector((1, 0, 0)), Vector((0, 0, 1))
right = forward.cross(up)
records = []
for folded in [False, True]:
    vertices, faces, uvs, normals = module._build_leaf_card(
        Vector((0, 0, 0)), forward, right, up, 0.4, 0.18, 0.022,
        module.OAK_ATLAS_VARIATIONS[0], folded)
    for face, uv, declared in zip(faces, uvs, normals):
        area = (vertices[face[1]] - vertices[face[0]]).cross(vertices[face[2]] - vertices[face[0]])
        records.append({"folded": folded, "face": face, "area": area.length / 2,
                        "normalDotUp": area.normalized().dot(up),
                        "declaredAgreement": area.normalized().dot(declared)})
result = {"sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(), "records": records,
          "passed": all(r["area"] > 0 and r["normalDotUp"] > 0.9 and
                        r["declaredAgreement"] > 0.999999 for r in records)}
print("LEAF_WINDING " + json.dumps(result))
if not result["passed"]:
    raise SystemExit(1)
