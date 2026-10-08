"""Apply offline exact solid unions to welded candidate hardware only."""
import bpy


def union(names, output_name):
    objects=[bpy.data.objects[name] for name in names]
    target=objects[0]
    bpy.ops.object.select_all(action='DESELECT')
    target.select_set(True)
    bpy.context.view_layer.objects.active=target
    for other in objects[1:]:
        modifier=target.modifiers.new('FiniteWeldUnion','BOOLEAN')
        modifier.operation='UNION';modifier.solver='EXACT';modifier.object=other
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        bpy.data.objects.remove(other,do_unlink=True)
    target.name=output_name
    return target
