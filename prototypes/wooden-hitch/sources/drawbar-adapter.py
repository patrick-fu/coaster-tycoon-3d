"""Export the isolated finite drawbar at its authored unit frame."""
import importlib.util
import sys
from pathlib import Path
import bpy

ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT))


def serializable(value):
    if isinstance(value,bpy.types.ID):return value.name
    if isinstance(value,dict):return {key:serializable(item) for key,item in value.items()}
    if isinstance(value,(list,tuple)):return [serializable(item) for item in value]
    return value


def build(materials):
    root=bpy.data.objects.new("DrawbarRoot",None)
    bpy.context.collection.objects.link(root)
    spec=importlib.util.spec_from_file_location("drawbar_part",ROOT/"drawbar-part.py")
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    metadata=module.build(materials,root)
    if __import__("os").environ.get("HITCH_SOLID_UNION")=="1":
        spec=importlib.util.spec_from_file_location("solid_union",ROOT/"union-parts.py")
        unions=importlib.util.module_from_spec(spec);spec.loader.exec_module(unions)
        metadata=serializable(metadata)
        unions.union(["Drawbar_Bar","Drawbar_Eye_EndA","Drawbar_Eye_EndB"],"Drawbar_Body")
        metadata["offlineSolidUnion"]=True
        metadata["exportedParts"]=["Drawbar_Body"]
    for obj in bpy.context.scene.objects:
        if obj.type=="MESH":obj["hitchCandidate"]=True
    return {"assetId":"wooden-drawbar","anchors":["DrawbarRoot","Joint_EndA","Joint_EndB"],
            "restraints":[],"jointAuthoring":serializable(metadata),"scope":"Finite hardware candidate; no native ride availability"}
