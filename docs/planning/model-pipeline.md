# Editable detailed models and browser asset delivery

This is root's corrected integration of Antigravity's two visual investigations,
not an acceptance of their unverified dimensions or example measurements. Their
raw proposals and terminal evidence are retained externally. The user rejected
the prior primitive models; another material coat alone does not meet the task.

## Authoring route

Use a dedicated Blender asset workflow, separate from the park renderer. Every
discrete vehicle, kiosk, station kit, fixed ride, person, prop and scenery object
has an editable `.blend` source, explicit UVs/materials and a compact `.glb`
delivery asset. A reproducible authoring/export script complements the editable
mesh; it does not excuse box/cylinder assemblies with no designed silhouette.
Spline-shaped rails, continuous troughs, variable-height supports and repeated
ties remain topology-driven renderer geometry, with authored structural profiles
and reusable detailed components. A curved track must follow the actual layout.

Art authoring uses AGY; root owns the shared renderer/worker integration and
acceptance. All Blender execution, texture processing, exports, render captures,
GLB/runtime checks and performance work run on Grok Bot. The Mac only edits,
collects source files, reads metadata and views remotely generated output.

Remote availability was actually probed: Blender is not installed; Debian 13
offers `4.3.2+dfsg-2`, and the build workspace has roughly 121 GB free. This is a
candidate pinned export tool, **not a claim about the latest Blender release**.
The historical report and AGY's “5.2 LTS” assumption were not verified and are
excluded. Record the actual binary/version/exporter used for every exported asset.
[Package evidence](https://packages.debian.org/trixie/blender).

## Dimensions, topology and anchors

Preserve native simulation geometry. Four metres/tile is the current horizontal
render candidate, not a discovered original metric. An asset's render mapping,
logical occupied quarter-tiles/Z, swept passenger envelope and authored visual
bound are four separate records. No author may enlarge collision rules to make
a roof fit. No ingestion step may squash geometry on one axis to conceal a
reservation mismatch. Reject inconsistent anchors/envelopes with a diagnostic.

Blender masters use explicitly declared local axes and apply mesh transforms
before exporting. The delivered glTF frame is right-handed, +Y up; frontage/
forward is +Z by project convention. Runtime conversion to simulation XY/Z is
one shared boundary. Native car mass/spacing and sprite rows do not define
metre-scale mesh or 3D seat locations. Anchor/pose records are authored against
the selected variant and checked against authoritative seats.

Required named nodes depend on role:

| Role | Required anchors and articulation |
|---|---|
| Vehicle | Rail/body reference, front/rear wheel or bogie pivots, couplers, every passenger seat, restraint hinges; swing/spin/seat-pitch joints only for the selected variant. |
| Station | Rail centreline in/out, deck, queue/exit gates, entrance/exit sockets, roof/support interface; exact repeat pitch. |
| Shop/service | Ground/frontage, active counter side(s), service interior/exit, sign/product attachment; no invented four-sided ordinary stall. |
| Fixed ride | Native footprint, boarding/unloading interface, rotation/tilt/gondola/participant nodes and every actual seat. |
| Person | Feet/hip, hands/head and seated/restraint pose; carried items and staff appearance. |
| Scenery/path | Footprint/quarter placement, base/edge sockets, recolor regions and declared canopy/roof overhang. |

Original footprint data corrects the proposals: Twist is reconstructed 3×3 with
18 places; Ferris Wheel is 1×4 with 32. Their proposed 2×2/4×4 dimensions and
12-place Twist are rejected. Suspended Swinging and fixed Inverted cannot share
one arbitrary ±15° sway; pose capabilities are variant-specific. The 155 count
includes shops/services/other rides; it is not 155 vehicle models. Shared kits
reduce authoring effort without erasing mechanical or silhouette differences.

## Materials and geometry quality

Author primary massing and readable silhouette first: shaped car shells, roof
overhang/thickness/ridge, open counters/windows, irregular branches/canopies,
functional wheel groups/restraints, station trusses/gates and ride linkages.
Use bevels where they catch visible light, layered construction and recesses.
Micro-bolts must not consume the budget while the roof or train proportions fail.
At park zoom, the original's legibility comes from palette, coherent material
scale, volume separation, landmarks and dense meaningful composition.

UV grain follows timber; roof tiles retain pitch/scale; brick courses align;
vehicle shells hide seams; cloth and foliage have appropriate normal/roughness.
Standard metallic-roughness PBR uses sRGB albedo/emission, linear normal/data
maps and explicitly packed AO/roughness/metallic channels when appropriate.
Never treat DirectX normals as OpenGL without conversion. Preserve recolor
channels for track/support/car body/trim and colored merchandise. Painted wood
and enamel are not bare-metal surfaces. Shader brightness alone is not detail.

Opaque structural surfaces have correct normals/winding/thickness where visible.
Leaf cards and decals are intentional cutouts, not blanket watertight geometry.
Use supported Three.js r186 PCF shadows; do not reintroduce the unsupported
PCFSoft path or assume one bias setting cures every self-shadow artifact. Test
rails, posts, foliage and motion under the actual browser shader.

## Actual acquired source corpus

Twelve 1K PNG source bundles were acquired from ambientCG's documented API,
with per-bundle and per-member SHA-256, actual byte lengths, source/preview URLs
and retained licence evidence. They cover timber, board studies, bark, dark roof
tiles, paving, metal, lawn, fabric, concrete, gravel, plaster and brick.
These are candidate materials, not already baked/approved model textures.
Wood096, RoofingTiles013A and PavingStones150 previews were visually inspected;
their grain/roof/paving patterns need appropriately scaled UVs and palette work.
[Acquisition manifest](materials-acquired.json), [ambientCG licence](https://docs.ambientcg.com/license/),
[documented API](https://docs.ambientcg.com/api/v2/full_json/).

Raw bundles and original publisher images/manual are on WD under the retained
programme evidence. Original media is reference-only and absent from the game.
The five publisher gallery images depict the Triple Thrill Pack; individual
scene launch/expansion membership is unproven. Original DAT sprite sheets,
all object views and original scenarios have not been acquired. Poly Haven
assets may be a later CC0 source, but no website/example renders or assumed
material downloads are included in this corpus.

## Representative production briefs

| Asset batch | Visible details and acceptance |
|---|---|
| Wooden train and track kit | Four real seats for the selected PTCT1 comparison variant; shaped tub/nose, padded benches, individually hinged lap bars, guide/upstop/running wheels, couplers; timber bents/bracing, steel running rails, catwalks. Empty bogies only where the selected variant requires them. |
| Steel train/track | Selected family-specific shell/restraint/seat arrangement; painted spine/rails, ties, columns/flanges/footers; front/rear articulation and banking. A generic “steel” label is insufficient. |
| Suspended/inverted vehicle | Overhead carrier, appropriate hanger/fixed seats, legs/clearance; distinct swing/inversion pose. |
| Water kit | Flume trough/lift/drop/splash, log hull, four tandem seat anchors; later distinct rapids raft, splash boat, free-water boat and submarine. Water effects do not create motion/boarding behavior. |
| Carousel/Ferris/Twist | Decorative canopy/horses or gravity-hanging gondolas or secondary rotating arms; real seats, indexed boarding/cycle/tilt nodes; correct footprint and authoritative lifecycle. |
| Information/merchandise | Recognizable kiosk/counter/sign; map and umbrella props; balloons/hats/shirts/toys/sunglasses carried by guests with recolor and visible use. |
| Food/drink/health | Distinct sculpted landmarks/facades for every vendor; counter equipment/menu/roof thickness; real served products/containers; toilets/first-aid entry/interior cues. |
| Station/buildings | Timber/steel roof frames, gates/operator booth/deck/handrails; modular walls/roofs/windows/arches and theme-specific ornaments. |
| Landscape/path kit | Organic trunk/branch/leaf clusters, hedges/flowers/kerbs/rocks and lawn/shore transitions; slopes, edge rails/benches/bins/lamps, not random decorative padding. |
| People and staff | Distinct walk/queue/board/sit/use/work poses, four uniforms/costumes and inventory attachments, visible hands/seat/restraint alignment. |

First sample gate: wooden car, timber station module and information kiosk plus
map/umbrella. Follow with an organic tree, log boat/water channel and an
articulated fixed ride. Review those actual exports before multiplying across
all 155 variants/507 scenery records. A separate asset viewer may use candidate
dimensions while original collision mapping remains unresolved; it must label
that scope and cannot be presented as a newly playable attraction.

## Delivery, performance and acceptance

Each manifest entry has source `.blend`/script/material hashes, variant/role,
licences/author, exporter version/options, axes/mapping version, bounds/anchors,
seat/pose requirements, actual triangles/draw groups/texture dimensions/bytes,
LOD variants and output SHA-256. Unknown quantities are null/pending, not fake
example hashes or copied empty-file hashes. Source completion, export validation,
runtime validation and human visual acceptance are separate statuses.

Initial candidate budgets: station/kiosk 6–15k triangles; coaster car 5–12k;
tree 2–6k with reduced park-distance LOD; 1K shared material maps where visible,
512/256 for small props. These are unmeasured ceilings to test, not permission
to multiply a 12k car across thousands of objects without profiling. Measure
scene totals and projected/actual asset memory, draw groups and loading bytes.
Selective normal/roughness maps, atlases, LOD and instancing are actual experiments.

Static batching preserves picking/entity identity and native placement; dynamic
instances/articulation preserve per-seat guests and state. Track resource
ownership, reference counts and disposal across park reload/import/demolition,
including shared materials/textures. Decorative animation consumes worker
state plus render interpolation; it never changes cash, guest counts or cycles.

Remote gates: export reproducibility/source hashes; glTF structural validation;
finite bounds/normals/UVs/node anchors/all seats; 4-angle/contact-sheet and
overview/close browser captures; restraint/boarding/cycle poses; PCF/no GL errors;
load/reload/picking/disposal; scale/draw/memory measurements. Any validator warning
is reviewed by meaning rather than requiring an arbitrary universal zero-warning
count. Software-renderer checks are not real integrated-GPU qualification.
Patrick's visual acceptance is a distinct required gate and has not occurred.
