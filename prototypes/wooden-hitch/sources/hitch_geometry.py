"""Small metric mesh helpers for isolated hitch authoring on Grok Bot."""
import math
import bpy


def mesh(name, vertices, faces, material, parent):
    data = bpy.data.meshes.new(name + "_Mesh")
    data.from_pydata(vertices, [], faces)
    data.update()
    uv=data.uv_layers.new(name="UVMap")
    for polygon in data.polygons:
        axis=max(range(3),key=lambda i:abs(polygon.normal[i]))
        plane=[i for i in range(3) if i!=axis]
        for index in polygon.loop_indices:
            co=data.vertices[data.loops[index].vertex_index].co
            uv.data[index].uv=(co[plane[0]]*.5+.5,co[plane[1]]*.5+.5)
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(material)
    return obj


def box(name, center, size, material, parent):
    x, y, z = center
    a, b, c = [value / 2 for value in size]
    vertices = [(x+dx*a, y+dy*b, z+dz*c) for dx,dy,dz in
                [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),
                 (-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    return mesh(name, vertices, [(3,2,1,0),(4,5,6,7),(0,1,5,4),
                                (1,2,6,5),(2,3,7,6),(3,0,4,7)], material, parent)


def tube(name, center, outer_radius, inner_radius, height, material, parent, segments=24):
    x,y,z = center
    vertices = [(x+r*math.cos(i*2*math.pi/segments),
                 y+r*math.sin(i*2*math.pi/segments),z+h)
                for h,r in [(-height/2,outer_radius),(height/2,outer_radius),
                            (-height/2,inner_radius),(height/2,inner_radius)]
                for i in range(segments)]
    faces=[]
    for i in range(segments):
        j=(i+1)%segments;n=segments
        faces.extend([(i,j,n+j,n+i),(2*n+j,2*n+i,3*n+i,3*n+j),
                      (n+i,n+j,3*n+j,3*n+i),(j,i,2*n+i,2*n+j)])
    return mesh(name,vertices,faces,material,parent)


def cylinder(name, center, radius, height, material, parent, segments=24):
    x,y,z=center
    vertices=[(x+radius*math.cos(i*2*math.pi/segments),
               y+radius*math.sin(i*2*math.pi/segments),z+h)
              for h in (-height/2,height/2) for i in range(segments)]
    faces=[tuple(reversed(range(segments))),tuple(range(segments,2*segments))]
    faces.extend((i,(i+1)%segments,(i+1)%segments+segments,i+segments) for i in range(segments))
    return mesh(name,vertices,faces,material,parent)


def anchor(name, position, parent):
    obj=bpy.data.objects.new(name,None)
    bpy.context.collection.objects.link(obj)
    obj.parent=parent;obj.location=position
    return obj
