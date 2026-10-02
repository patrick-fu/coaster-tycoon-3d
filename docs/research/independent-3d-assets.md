# Independent 3D Asset Authoring and Browser Delivery

**Research snapshot:** 2026-10-03. Reviewed the current Blender 5.2 LTS manual, glTF 2.0 specification, renderer documentation and pinned OpenGraphics contents. This establishes documented capabilities and proposed workflows, not measured performance or an asset-library audit. No renderer, style, asset license or physical tile size is selected; no assets were generated or exported.

## Authoring routes

Both inputs can support independent art; the following allocation is a proposal, not a style decision.

| Input | Practical workflow and coverage | Cost to verify |
|---|---|---|
| Procedural modular meshes | Generate rail profiles, sleepers, supports and path surfaces from independently defined piece geometry; cache each piece/parameter combination. Primitive vehicles, guests, flat rides and scenery also provide disposable placeholders. Browser geometry buffers can represent positions, indices, normals, UVs and colors. [three.js BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html) | Endpoint continuity, bank transitions, normals and tessellation need checks. A visually smooth curve must still represent the intended discrete construction piece. Detailed characters and distinctive rides require further authoring work. |
| Blender sources → glTF/GLB | Author reusable track/path modules, vehicles, rigged guests, articulated rides and scenery; export a defined subset. Blender supports meshes, materials, textures, skinning and shape-key animation. Export triangulates polygons and can split vertices at UV/shading discontinuities; convert curves to meshes. [Blender glTF manual](https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html#meshes) | Inspect the exported asset, not only the Blender viewport. Shader graphs, modifier results, animation sampling and exported vertex counts need verification. Keep editable `.blend` sources. |

A mixed workflow is feasible: generated topology can place independently authored decorative parts. Its practical benefit remains unmeasured.

## A shared contract before bulk authoring

glTF specifies meters, a right-handed coordinate system, +Y up and +Z forward. Blender provides a Y Up export option. [glTF coordinates](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#coordinate-system-and-units), [Blender export](https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html#export)

**Proposed contract:** preserve discrete simulation tiles/heights and define explicit meters-per-tile and meters-per-height-step mappings. Fix each asset's origin and orientation. Track sockets need position, tangent/up frame, slope/bank and compatible connection type; paths need edge/height sockets. Vehicles need wheel/seat anchors, guests a foot origin, rides entrance/exit anchors, and scenery a placement footprint. Matching positions alone should not imply a legal connection.

Use stable asset IDs and revisions in a manifest; glTF names are not guaranteed unique. Blender can export custom properties as `extras`, but their schema and interpretation belong to this project. [glTF names](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#indices-and-names), [Blender custom properties](https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html#custom-properties)

## Repetition, variants and simulation

Renderer capability example: three.js `InstancedMesh` shares geometry/materials across transforms and supports per-instance colors. Batch repeated track parts, paths and scenery accordingly; measure material/mesh variants separately. This example does not select three.js. [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)

Core glTF animation covers node transforms, skeletal motion and morph weights; playback, looping and synchronization are application decisions. **Proposal:** guest walk/idle clips decorate simulated movement, vehicles follow simulation track frames, and ride clips follow operating state. Independent skeletal animation phases across many guests require a separate runtime test; static instancing evidence does not establish that capacity. [glTF animation](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#animations)

Use color parameters for simple recolors and distinct meshes for silhouette changes. Material variants and compression are optional compatibility decisions: three.js lists material variants as a separately registered plugin, while Draco, KTX2 and Meshopt require configured decoders/loaders. Verify the actual selected renderer/export combination. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)

**Proposed simulation boundary:** keep occupied tiles/heights, legal clearance, path connectivity and vehicle swept envelopes independent of visible triangles. Picking proxies and any physical collision shapes are separate derived assets. Changing decoration or mesh detail must not change construction legality. glTF itself does not mandate runtime behavior. [glTF scope](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#motivation)

## Delivery and existing replacement contents

GLB can bundle geometry, animation and images; it can also retain external dependencies. Preserve authoring sources because glTF deliberately omits authoring information. **Proposal:** retain source revisions, generator recipes, exporter version/settings, output hashes, connector schema, and per-model/texture author, origin URL, license text and modifications. Existing licensing questions remain in [source-assets.md](source-assets.md). [glTF delivery](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#glb-file-format-specification), [glTF authoring boundary](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#motivation)

OpenGraphics at `930b0140685f85db92147af832080e8df12d8d4e` contains vehicle/scenery `.blend` sources, including a Corkscrew car; the complete recursive tree contains no `.gltf`/`.glb`. Its build script packages JSON and sprite `images.dat` into `.parkap`. These are sprite-authoring outputs, not a verified 3D runtime library. The README identifies unresolved peep, track and flat-ride rendering work. Binary models, rigs and exportability were not inspected. [Pinned recursive tree](https://api.github.com/repos/OpenRCT2/OpenGraphics/git/trees/930b0140685f85db92147af832080e8df12d8d4e?recursive=1), [build script](https://github.com/OpenRCT2/OpenGraphics/blob/930b0140685f85db92147af832080e8df12d8d4e/build.mjs), [README](https://github.com/OpenRCT2/OpenGraphics/blob/930b0140685f85db92147af832080e8df12d8d4e/README.md)

## Smallest disposable test and human feedback

An agent can prepare a neutral scene with a straight-to-slope track joint, one car, one animated guest, connected path/queue tiles, a rotating ride placeholder and repeated scenery. Compare procedural and Blender-exported versions of one module at identical dimensions; hold camera, lighting, renderer and device constant. Validate exports with the Khronos validator; measure connector error, orientation, clip playback, dependency loading, bytes, draw calls and frame time. This test is proposed and unrun. [glTF Validator](https://github.com/KhronosGroup/glTF-Validator)

Patrick's visual feedback is needed for camera/zoom readability, proportions, silhouette differentiation, crowd legibility, colors/materials and animation character. Full library coverage, performance budgets and conversion of existing Blender models remain unverified.
