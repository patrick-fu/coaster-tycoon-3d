# Visual Acceptance Critique: Coaster Tycoon 3D Mixed-Park Production Candidate

## 1. Inspected Files & Operational Constraints

### Inspected Files
1. [`overview.png`](file:///Volumes/WD/code/workspaces/coaster-wooden-renderer-authoring/final-mixed-frames/overview.png) (1440×900 isometric full-park capture: March Year 1, 33 guests, 4 operating coasters, commercial plaza, water body, terrain grid).
2. [`wooden-station.png`](file:///Volumes/WD/code/workspaces/coaster-wooden-renderer-authoring/final-mixed-frames/wooden-station.png) (1440×900 close capture: Cedar Timber Run station structure, queue fence, adjoining path plaza, landscape props).
3. [`wooden-car.png`](file:///Volumes/WD/code/workspaces/coaster-wooden-renderer-authoring/final-mixed-frames/wooden-car.png) (1440×900 close running capture: 2-car wooden coaster train with 8 seated guests on curved track).
4. [`model-pipeline.md`](file:///Volumes/WD/code/workspaces/coaster-mixed-wooden/coaster-tycoon-3d/docs/planning/model-pipeline.md) (Authoritative Blender/Grok Bot asset pipeline: 6–15k/5–12k candidate triangle budgets, acquired ambientCG 1K material corpus, named node anchors, non-copyrighted independent production briefs).

### Operational Constraints Observed
- **Read-Only / No Certification**: Independent visual critique only; no code/model edits, no Mac builds or test scripts executed. Does not certify release readiness or accept style on Patrick's behalf.
- **Copyright & Contract Bounds**: No original copyrighted DAT sprites or assets adopted. Simulation geometry, finite flat/R16 physics contract, and UI layout remain strictly unmodified.
- **Fixed Scope**: Station roof, floor, and support geometry are fixed for this evaluation.

---

## 2. Concrete Visual Evaluation Across Core Dimensions

### A. Composition & Density
- **Expansive Barren Turf**: [`overview.png`](file:///Volumes/WD/code/workspaces/coaster-wooden-renderer-authoring/final-mixed-frames/overview.png) displays vast expanses of bare, flat green grass separating the four coaster loops. The park feels largely empty rather than dense, cohesive, or bustling.
- **Abrupt Water Basin**: The pond is a sharp, untextured rectangular depression without shoreline transitions, sloping banks, reeds, or edge rocks.
- **Under-articulated Plaza**: Stalls and paths occupy only a tiny cluster in the park center. There is no sense of organized park districts, layered thoroughfares, or architectural framing around attractions.

### B. Silhouettes & Materials
- **Stall Primitives vs. Sculpted Facades**: The food, drink, and restroom facilities in [`overview.png`](file:///Volumes/WD/code/workspaces/coaster-wooden-renderer-authoring/final-mixed-frames/overview.png) are basic geometric boxes with wedge/tent roofs and flat vertex colors. They lack service counters, menus, fascia boards, or thematic silhouettes required by the pipeline briefs.
- **Steel Coasters vs. Wooden Candidate**: While the wooden coaster (Cedar Timber Run) features articulated timber bents and cross-ties, the three steel coasters (Copper Loop, Juniper Sprint, Highland Flyer) still feature generic rail extrusions and simplified block trains, revealing a stark quality contrast within the same scene.
- **Material Flatness**: Surfaces currently lack the micro-contrast, directional timber grain, and brick/tile patterns provided by the acquired ambientCG bundles. Flat-shaded albedo dominates paths, stall roofs, and lawns.

### C. Clutter, Grid, & Lighting
- **Grid Dominance**: Faint gridlines crisscross the entire park over flat terrain, emphasizing the underlying grid rather than creating an organic landscape.
- **Scattered Props**: Deciduous trees, pine trees, rock clusters, and hedge blocks are sprinkled uniformly across empty grass fields without spatial clustering (e.g., perimeter belts, garden beds, or tree groves).
- **Hedge & Rock Geometry**: Box hedges appear as monolithic, sharp green bricks. Rocks read as low-poly polyhedra dropped onto turf without embedded dirt or vegetation blending.
- **Lighting & Foliage Palette**: Directional sunlight and PCF shadows function correctly, but the ambient light level washes out tree canopies. In [`wooden-station.png`](file:///Volumes/WD/code/workspaces/coaster-wooden-renderer-authoring/final-mixed-frames/wooden-station.png) and [`wooden-car.png`](file:///Volumes/WD/code/workspaces/coaster-wooden-renderer-authoring/final-mixed-frames/wooden-car.png), deciduous foliage appears pale, chalky lime-green, lacking internal depth and shadowing.

### D. Car & Station Readability
- **Wooden Car Readability**: In [`wooden-car.png`](file:///Volumes/WD/code/workspaces/coaster-wooden-renderer-authoring/final-mixed-frames/wooden-car.png), the 8 seated guests (2 rows of 2 per car) and lap bars are clearly readable at running zoom. However, the red car tub has an overly glossy, specular finish that reads as molded plastic rather than painted/varnished wood with metallic trim. Bogies and wheel assemblies beneath the chassis are lost in dark, undifferentiated shadow.
- **Wooden Station Readability**: In [`wooden-station.png`](file:///Volumes/WD/code/workspaces/coaster-wooden-renderer-authoring/final-mixed-frames/wooden-station.png), the open timber truss roof structure is delicate, but its dark slats visually merge with the track and chassis below. The platform lacks railings, turnstiles, safety gates, and an operator booth. The bright white picket fence used for the queue clashes stylistically with the rustic timber bents.

### E. Gap to Full Required Asset Programme
- The current candidate demonstrates that the independent wooden coaster kit (car, ties, bents, open station roof) can render and advance guests under the Engine. However, it represents only the first sample gate.
- The gap to Patrick's requirement of "RCT2-like richly detailed buildings, varied rides and textured material" remains substantial: the remaining 3 coaster types, all commercial/service stalls, path paving, landscape kits, and queue architecture still need full Blender authoring and UV/material baking on Grok Bot.

---

## 3. Categorization: Quick Polish vs. Future Qualified Modelling

| Category | Scope & Targets | Rationale |
|---|---|---|
| **Quick Presentation Polish** *(Renderer / Material Config)* | - UV texture mapping of acquired ambientCG assets (`PavingStones150` on path tiles, `Wood096` on ties/deck, subtle lawn noise).<br>- Material roughness/metallic rebalancing on the wooden car (reduce specular plastic sheen, increase roughness).<br>- Foliage albedo curve adjustment (darken and saturate desaturated pale tree leaves).<br>- Scenery placement clustering (reposition existing props along paths instead of random grass scatter). | Can be achieved without modifying geometry, mesh topologies, or physics boundaries, using already acquired 1K textures and existing scene configuration. |
| **Future Qualified Modelling** *(Blender / Grok Bot Pipeline)* | - Modular station kit extensions: operator booth, entrance/exit turnstiles, platform gates, marquee signage.<br>- Sculpted vendor kiosks: custom 3D facades for Hot Food, Cold Drinks, Restrooms, Info Kiosk.<br>- Dedicated steel coaster vehicle shells and family-specific track cross-sections (box ties, spine tubes, articulated bogies).<br>- Organic tree meshes with multi-layered canopy cards and root-base blends. | Requires authored `.blend` master sources, UV unwrapping, vertex/triangle budgeting (6–15k / 5–12k), node anchors, and glTF validation under Debian Blender 4.3.2. |

---

## 4. Compelling Immediate Visual-Only Change

- **Exact Change Type**: **Path & Ground Texture Mapping with Palette Rebalancing**
- **Budget**: **Zero additional triangles; within existing acquired 1K texture asset corpus**.
- **Specification**: Apply `PavingStones150` (diffuse + roughness) at appropriate tiling scale (4× repeat per 4m tile) to path surfaces, add subtle ground lawn variation, and lower the albedo brightness on the deciduous tree canopy material by ~25% with increased saturation.
- **Expected Impact**: Immediately eliminates the barren flat-shaded grid appearance and grounds the elevated structures without touching any model geometry or invalidating unit bounds.

---

## 5. Three Actionable Next Steps

1. **Plaza & Path Network Grounding ([`overview.png`](file:///Volumes/WD/code/workspaces/coaster-wooden-renderer-authoring/final-mixed-frames/overview.png), Central Hub)**
   - *Action*: Apply the acquired `PavingStones150` texture to all pedestrian path tiles with edge kerb definition, and cluster benches, bins, and flower planters directly along path edges rather than isolated on open grass.
   - *Reason*: Replaces the clinical "checkerboard grid" look with readable park walkways and immediately boosts visual density where guests congregate.

2. **Thematic Station & Queue Integration ([`wooden-station.png`](file:///Volumes/WD/code/workspaces/coaster-wooden-renderer-authoring/final-mixed-frames/wooden-station.png), Cedar Timber Run Platform)**
   - *Action*: Replace the stark white picket fence with a dark timber post-and-rail queue fence matching `Wood096`, and author modular timber station accessories (operator booth, ride entrance archway/sign, platform handrails/gates).
   - *Reason*: Eliminates the stylistic clash between the queue and station, transforming an empty skeletal frame into a functional, recognizable RCT2-style ride station.

3. **Train Chassis Shading & Track Bed Grounding ([`wooden-car.png`](file:///Volumes/WD/code/workspaces/coaster-wooden-renderer-authoring/final-mixed-frames/wooden-car.png), Cedar Timber Run Track Spline)**
   - *Action*: Adjust the car body material roughness to tone down the specular plastic reflection, articulate wheel/bogie contrast against the rails, and introduce a gravel ballast strip (`Gravel001`) beneath the ground-level coaster track.
   - *Reason*: Eliminates the toy-like plastic feel of the train and visually grounds the track structure into the terrain, preventing rails from looking suspended over raw turf.
