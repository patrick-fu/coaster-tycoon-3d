"""Preserve the original car and replace only its two authored hitch solids."""
import importlib.util
import sys
from pathlib import Path
import bpy

ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT))


def load(name,filename):
    spec=importlib.util.spec_from_file_location(name,ROOT/filename)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def serializable(value):
    if isinstance(value,bpy.types.ID):return value.name
    if isinstance(value,dict):return {key:serializable(item) for key,item in value.items()}
    if isinstance(value,(list,tuple)):return [serializable(item) for item in value]
    return value


def build(materials):
    original=load("original_car","wooden-car-reference.py")
    frame=original._build_chassis_frame
    def without_old_hitches():
        vertices,faces=frame()
        if len(vertices)!=72 or len(faces)!=54:
            raise ValueError("Original nine-box chassis structure changed")
        # The final two disjoint eight-vertex boxes are the frozen old hitches.
        return vertices[:56],[face for face in faces if max(face)<56]
    original._build_chassis_frame=without_old_hitches
    metadata=original.build(materials)
    old_names={obj.name for obj in bpy.context.scene.objects}
    joint=load("mount_parts","mount-parts-routed.py").build(materials,bpy.data.objects["RailRoot"])
    if __import__("os").environ.get("HITCH_SOLID_UNION")=="1":
        unions=load("solid_union","union-parts.py")
        joint=serializable(joint)
        for end in ("Front","Rear"):
            unions.union(["Mount_Carrier_"+end,"Mount_Clevis_"+end,"Mount_Pin_"+end],"Mount_Assembly_"+end)
        joint["offlineSolidUnion"]=True
        joint["exportedParts"]=["Mount_Assembly_Front","Mount_Assembly_Rear"]
    for obj in bpy.context.scene.objects:
        if obj.name not in old_names and obj.type=="MESH":obj["hitchCandidate"]=True
    metadata["assetId"]="wooden-car-joint"
    metadata["jointAuthoring"]=serializable(joint)
    metadata["scope"]="Finite hardware candidate; no native ride availability"
    return metadata
