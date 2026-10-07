# Classic art direction

Patrick's 2026-10-07 hands-on verdict rejected the bare development preview.
This pass rebuilds the park's visual language while retaining the authoritative
simulation, Classic controls, local saves and independent MIT provenance.

## Reference and intent

The publisher's [Steam gallery](https://store.steampowered.com/app/285330/RollerCoaster_Tycoon_2_Triple_Thrill_Pack/)
and [2002 manual](https://cdn.akamai.steamstatic.com/steam/apps/285330/manuals/manual.pdf)
are visual/behavioral references. Original screenshots are retained outside the
distribution solely for observation. No source sprites, textures, models or
commercial game data are bundled. All runtime surfaces and geometry are authored
for this project.

The reference gallery emphasizes saturated ride colors, legible twin rails and
cross ties, dense supports, peaked station roofs, identifiable concession
silhouettes, white queue rails, trees and planted borders. Translate those cues
into a detailed, inviting 3D miniature park with restrained material roughness,
warm daylight and readable management controls. Avoid the previous empty lawn,
box shops, cone trees and unsegmented trains. Increase visible variety without
pretending decorative scenery is an operating ride.

## Ownership and module boundary

The primary agent owns scene integration, simulation/content, tests and final
verification. Four independent Antigravity workspaces own environment art,
building art, coaster/vehicle/people art and the Classic HTML/CSS shell. Each
writer changes only its assigned files. Luna Max reviewers independently inspect
the frozen implementation and actual remote evidence.

Art modules receive a scene context and emit geometry. They never call the
simulation, mutate packets, allocate IDs, change cash or persist game state.
Static repeated primitives are batched by shared geometry/material during scene
integration, preserving per-instance selection. Unique rail geometry is disposed
on static rebuild; shared material/geometry/texture resources live with the scene.

### Shared context

- `ctx.tile = 4`, `ctx.half = 2`; coordinates are Three.js X/elevation-Y/Z.
- `ctx.material(key, props)` caches a `MeshStandardMaterial` by stable key.
- `ctx.geometry(key, create)` caches shared geometry.
- `ctx.ownGeometry(geometry)` registers rebuild-owned geometry for disposal.
- `ctx.texture(key, width, height, paint)` caches an own CanvasTexture. `paint`
  receives a 2D context and dimensions. No external image/network fetches.
- `ctx.add(parent, geometry, material, position=[0,0,0], scale=[1,1,1],
  rotation=[0,0,0])` returns a Mesh with cast/receive shadows enabled.
- `ctx.box/cylinder/sphere/cone(parent, material, x,y,z, sx,sy,sz)` use shared
  geometry with unit bounding width/height/depth; cylinder's axis is Y.
  Radial primitives have radius 0.5, so sx/sz specify diameters. Rotation may
  be set on the returned mesh. `ctx.segment` accepts an actual radius.
- `ctx.text(parent, text, {x,y,z,width,height,color,background,rotation})`
  uses a cached project-authored canvas label and returns a plane Mesh. Labels
  must face a useful view or follow their parent orientation.
- `ctx.segment(parent, material, fromVector3, toVector3, radius)` emits a
  shared cylindrical segment between the given positions.
- `ctx.packet` is the copied current view; `ctx.surfaceHeight(x,y)` returns
  visible authoritative terrain elevation in metres (fallback 4 outside view).
- Element parent groups carry `userData.selection={kind:'element',id}`.

Detailed static buildings, portals and scenery are fitted within their actual
tile and vertical reservation before batching. This changes presentation scale,
not construction rules. Station decoration is fitted separately so sampled
rails and actual vehicle motion remain intact. Roof slopes rise toward their
ridge. Rail-detail transforms use a right-handed basis; mirrored transforms
remain excluded from instancing.

Station decoration follows the reserved tile center, aligning each side-facing
portal with the platform opening. The three connected canopy sections remain
continuous. The candidate sampled course extends half a tile past the final
canopy; that exposed end is not an original station-descriptor qualification.
Do not shift the portal/frontage merely to center each canopy on a motion segment.

### Exports

- `ui/art/environment.js`: `buildEnvironment(ctx, scenery, entry)` builds
  terrain/water plus boundary planting and park gate; returns the ground
  InstancedMesh. Ground instances retain row-major scenery.surfaces order,
  centre Y = terrainHeight/32*4/2 and `userData.ground=true` for diagnostics.
  `buildPath(ctx,parent,element,scenery)` uses actual path neighbors, height,
  public/queue ownership and elevated supports. `buildScenery(ctx,parent,e)`
  renders own scenery objects (`sceneryType`: tree/flower/hedge/lamp/fountain/rock).
- `ui/art/buildings.js`: `buildFacility(ctx,parent,e,facility)` and
  `buildAmenity(ctx,parent,e,amenity)`. Only actual facilities/amenities appear.
  Facility frontage local +X rotates by e.direction (0 east,1 south,2 west,3 north).
- `ui/art/coaster.js`: `buildTrack(ctx,parent,e,rules)`,
  `buildPortal(ctx,parent,e,ride)`, `createVehicles(ctx,capacity)` and
  `createPeople(ctx,capacity)`. Dynamic factories return
  `{group, update(packet), pickMeshes, selections, dispose()}`; selections map
  each instance index to guest/staff or ride identity consistently across meshes.
  Preserve actual car position/direction/up; no invented train animation.
- HTML/CSS shell retains every existing ID, data-tool/data-speed attribute and
  dynamic class contract. Root will add the scenery palette and preview/catalogue.

## Acceptance

Capture public overview, station/queue, shops/gate, occupied train and landscaping
at 1920×1080/DPR1 and one narrower desktop viewport. Verify selection, real
construction/removal, rejected edits, employee patrol, operation, save/reload and
dynamic geometry disposal after rebuilds. Record draw calls, triangle/resource
counts and timing without mislabelling SwiftShader as integrated-GPU evidence.
Retain before/after screenshots and reviewer observations. Exact original
formulas, catalogue and real hardware gates remain explicitly unqualified.
