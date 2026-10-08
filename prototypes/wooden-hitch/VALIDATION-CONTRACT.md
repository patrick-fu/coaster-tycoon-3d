# Frozen finite joint validation

This validator qualifies exported candidate geometry only. It replays the exact
59 saved body, bogie and link matrices from the immutable articulated experiment;
it creates no course, trailing-position solver or body correction. Production,
original/native agreement, continuous motion, grades/Z/occupancy, guide/upstop,
station clearance, GPU and human acceptance remain separate.

Inputs are the original `/workspace/coaster-detailed-assets/outputs/wooden-car.glb`
(SHA-256 `fc988c55ed60dcd5abf7c5e02ecbc1ac3a8cd828cfe7fe4bb8f30bcf21699b59`),
the retained `/workspace/coaster-articulated-wooden-joint/results.json`
(`167ba3e1da273b66a4bc1d9fb1c3a6fe6c1ec0d2ea54673395f94ae73a287ab6`),
the exported `outputs/wooden-car-joint.glb`, `outputs/wooden-drawbar.glb`, and
`outputs/hitch-metadata.json`. Root supplies the three actual candidate SHA-256
values after successful export. Existing pinned Three.js is read only. All
execution is remote on Grok Bot; no package installation or Mac runtime.

## Metadata consumed by the validator

Root normalizes the visual author's returned dimensions/parts into this JSON.
Dimensions are recorded, not accepted as geometric evidence. No contact rules
means no new contact exemptions. Replace every example name/number with the
actual exported names and geometry; the example is not an accepted contact.

```json
{
  "schemaVersion": 1,
  "carParts": [
    {"name": "ACTUAL_FRONT_CARRIER", "end": "front", "kind": "carrier"},
    {"name": "ACTUAL_REAR_PIN", "end": "rear", "kind": "pin"}
  ],
  "drawbarParts": [
    {"name": "ACTUAL_BAR", "end": "span", "kind": "bar"},
    {"name": "ACTUAL_EYE_A", "end": "A", "kind": "eye"}
  ],
  "contacts": [],
  "joints": [
    {"end": "front", "carrier": "ACTUAL_FRONT_ASSEMBLY",
     "pin": "ACTUAL_FRONT_ASSEMBLY", "eye": "ACTUAL_UNIFIED_DRAWBAR",
     "attachmentContact": "ACTUAL_FRONT_TO_BOLSTER",
     "bearing": {"axis": [0,1,0], "eyeInnerRadiusMetres": 0.014,
       "eyeOuterRadiusMetres": 0.030, "eyeHalfThicknessMetres": 0.012,
       "pinRadiusMetres": 0.012, "pinHalfHeightMetres": 0.030}},
    {"end": "rear", "carrier": "ACTUAL_REAR_ASSEMBLY",
     "pin": "ACTUAL_REAR_ASSEMBLY", "eye": "ACTUAL_UNIFIED_DRAWBAR",
     "attachmentContact": "ACTUAL_REAR_TO_BOLSTER",
     "bearing": {"axis": [0,1,0], "eyeInnerRadiusMetres": 0.014,
       "eyeOuterRadiusMetres": 0.030, "eyeHalfThicknessMetres": 0.012,
       "pinRadiusMetres": 0.012, "pinHalfHeightMetres": 0.030}}
  ],
  "authorDimensions": {},
  "authorSourceHashes": {}
}
```

All newly exported car meshes and every drawbar mesh must be listed exactly
once. Both inventories must be nonempty and every listed mesh must have actual
nonempty triangles/components. Both `joints` rows are mandatory and bind the
actual carrier, hinge pin and eye to the frozen markers. A physically unified
closed mount may serve as both carrier and pin. A physically unified closed
drawbar may serve both eyes with `end: "span", kind: "unified-link"`; a merely
joined object with overlapping/disconnected shells is not a solid union.
Root's hashed metadata may supply the five bearing dimensions through
`authorDimensions.link.candidateDimensions` (`eye_inner_radius`,
`eye_outer_radius`, `eye_thickness`) and
`authorDimensions.car.candidateDimensions` (`pin_radius`, `pin_height`) instead
of repeating `joint.bearing`. These nominal inputs are checked against the same
concrete candidate dimensions and remain independently measured, not accepted
as collision evidence.
Original mesh names cannot be reused for new parts. Each new part must be
a separately named, single connected, closed, consistently oriented manifold
triangle surface. New surfaces also receive a self-intersection check; only
their actual shared topology is permitted.
Every welded vertex link must be a single cycle, so two otherwise closed solids
touching at a vertex cannot masquerade as one manifold. Intra-mesh component
intersection/containment evidence is retained even when multiple components
already reject the single-part contract.
Original open components are reported and never treated as watertight solids.
The original 1e-7 m component key groups candidates, but cannot prove closure:
the actual welded-edge residual must also be <= the frozen 1e-9 m segment
tolerance. Gaps beyond that threshold are explicitly open/unsupported.

An optional, individually bounded **planar mating** rule has this shape:

```json
{
  "id": "ACTUAL_CARRIER_TO_ONE_BOLSTER_FACE",
  "kind": "planar-mating",
  "a": {"asset": "car", "mesh": "ACTUAL_CARRIER", "component": 0,
        "outwardNormal": [0, 0, -1]},
  "b": {"asset": "car", "mesh": "Chassis_Frame", "originalComponent": 2,
        "outwardNormal": [0, 0, 1]},
  "patch": {"centreInA": [0, 0.22, 0.81], "radiusMetres": 0.01}
}
```

The validator derives each support plane from the actual selected component
vertices and supplied unit outward normal. In each applicable pose those planes
must oppose and coincide within the frozen 1e-9 m triangle projection tolerance.
Actual intersection points must lie on that plane and within the finite patch.
The patch centre is projected onto the measured plane; the projection is
reported and does not move geometry. The rule cannot authorize penetration,
nonplanar contact, another component, another mesh, or an opposite car.
Every declared rule must exhibit its measured support-plane coincidence and
actual bounded contact in each applicable retained pose; an unused or invalid
declared contact cannot qualify an attachment.
Car-to-car rules apply only within the same car. Car-to-drawbar rules apply only
to the connected rear/EndB or front/EndA part pair. A pin inside an actual annular
eye with positive clearance needs no exemption; cylindrical penetration is not
authorized by this schema. Any unsupported contact is rejected and retained.

`originalComponent` refers to the original connected Chassis_Frame component,
identified by exact retained triangles. Components 7 and 8 are the only removed
components and cannot appear in a contact rule. New-part `component` is the
reported connected-component index after export; omitted selection is permitted
only for a one-component mesh. Normals and patch centres use exported glTF asset
coordinates, metres, +Y up/+Z forward.

## Frozen checks

- Verify all original named nodes and their local/world matrices. Compare every
  original non-hitch triangle's encoded per-vertex attributes and material
  assignment through a canonical cyclic triangle signature. Reordering is
  permitted; reversed winding or changed attributes are not. Chassis removal is
  limited to original components 7/8, each 108 triangles, corroborated by the
  retained source/bounds. All seven other chassis components must remain exact.
  Material fingerprints resolve texture references to sampler semantics and
  actual embedded image-content SHA. Numerical texture/image index reordering
  cannot hide a changed bitmap, sampler or source binding.
- Replay all 59 saved matrices. Joint_EndA must remain exported `(0,0,+0.10)`
  and close onto the following-front hinge; Joint_EndB `(0,0,-0.10)` closes onto
  the leading-rear hinge using the saved linkFrame. Check actual coupler and
  tread-bottom points, not metadata numbers alone. Length/closure <=0.1 mm,
  running-wheel contact <=5 mm, finite unit frames <=1e-9; no snapping or scale.
- Bind actual finite hardware to the markers before replay. For this concrete
  candidate, root specified eye inner/outer radii .014/.030 m, half-thickness
  .012 m, and pin radius .012 m with core half-height .030 m. Check actual axis
  void/surface clearance through each eye, 16 radial directions at three axial
  sections, actual ring material and cap exits, inner-boundary vertices, and
  measured free outward half-rim vertices/second radial exits. The direction
  toward the unified span is excluded from outer-rim dimension measurement.
  Actual facet angular gaps determine the polygon apothem lower bound; the
  outer vertex radius must still match the nominal .030 m within recorded
  float32 representation precision. Smaller/larger .029/.031 m rims are
  independently retained red/green controls, not accepted from metadata.
  actual exposed pin radius/material/core height. A unified mount can extend
  beyond the buried pin caps; the measured core must reach the specified height
  and all extensions still receive full collision checks. The two eyes must
  belong to one closed unified-link component with a continuous material span:
  the retained straight centre span has inside endpoints/midpoint, zero surface
  exits and positive surface distance. Empty markers or a distant cube fail.
  Actual binary float32 coordinate precision is recorded for nominal dimension
  comparisons. It does not widen any collision, joint, wheel or frame tolerance.
- Include all original meshes (shell, trim, chassis, seats, restraints,
  bogie carriers and treads), all new car parts and every finite drawbar part.
  Check whole-car inter-car pairs, each new part against its own car, all new
  part pairs, and drawbar against both cars and its other parts. Frozen original
  same-car assembly overlaps are outside this change; they are not exemptions
  for new geometry.
- Use bounds/component BVHs before exact triangle intersection/distance tests.
  Report actual pair counts, bounded contact classifications, strict crossing
  witnesses and minimum surface clearances. Test containment only for closed
  components; ambiguity or unsupported new topology rejects qualification.
- Replay the unchanged original 8 m/32-chord negative control: rounded length
  12576 mm, 30 shell pairs, retained strict 87/11 witness and coupler gap. Kernel
  controls include crossing, separation, closed containment and open-surface
  classification. They do not extend the physical acceptance scope.

No whole-part, chassis or regional collision exemptions are supported. The
previous 0.134212 m centreline clearance does not qualify finite surfaces or
carriers. Any failed invariant, numerical check, unsupported contact, triangle
intersection or closed-solid overlap returns `unavailable` with finite evidence.
New closed parts are mandatory; original open surfaces receive only explicit
surface checks, not invented solid semantics.

Run remotely after root sends actual hashes:

```sh
ssh grok-build 'bash /workspace/coaster-wooden-hitch-authoring/run-check.sh CAR_SHA LINK_SHA METADATA_SHA'
```

The shell retains command, stdout, stderr, exit and runner/contract/input/output
hashes in a fresh `checks/` run directory. Exit 0 means this finite candidate
passes; exit 1 is a complete geometric/invariant rejection; exit 2 means the
measurement could not complete. Local/remote copies and hashes are retained.

Revision after the c75a7e run: outer-rim measurement closes the independently
reviewed P2 nominal-only dimension gap. Two missing zero initializers in numeric
test-count summary reducers are repaired; all original per-pair counts and the
first complete rejection are retained unchanged in their c75a7e snapshot.
