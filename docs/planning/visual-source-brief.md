# Visual source and authoring brief

This is a planning input, not a validated asset pipeline or rendering pass.
Patrick rejected the current bare/low-detail miniature twice. He requests much
more precise original-inspired modelling, actual source textures, a dedicated
modelling workflow and the entire original catalogue/frontend, planned first.

## Source baseline and concrete deficiencies

Production source remains `37ee9a8`; the planning-only commit is `8473eec`.
The current runtime source and six source-bound images are recorded under
`docs/verification/classic-art/`. Three layouts still use one candidate steel
family. Primitive-composed trees, sparse planting, repetitive grass and water,
small simplified facilities, minimally articulated people and low-detail train
models are rejected. Functional browser tests do not certify visual quality.

Logic research has audited original-object metadata at
`978f596972c1163dc670d853dd6add4766f10dbd`: 155 base ride objects, including
41 shops/services; 507 scenery objects across 29 organising groups. It identifies
33 canonical coaster families, with distinct vehicle variants and modes. These
are metadata/reconstruction counts, not observed original executable results.
Objects from a base theme group can include modern custom children; membership
must be checked at each object. Shops may offer two products; kiosk fronts are
four-sided; physical car helpers can have no seats.

Current render scale is 4 m/tile and one engine Z coordinate = 0.125 m. Stations,
portals and facilities are globally fitted to a 16-coordinate/2 m envelope.
Original-object stall clearances vary 32–64 legacy units, whose meaning must be
reconciled with per-type logical reservations. Displayed original Z conversion,
ride-length measurement and map-area display are not one proven isotropic metre
scale. Author models to explicit role/anchor/envelope contracts; do not distort
all models with `fitModel` to conceal unverified assumptions.

## Reference-only corpus

Original Steam gallery pictures (unmodified, outside distribution):

- `/Volumes/WD/code/workspaces/coaster-rct2-program/evidence/references/original-0.jpg`
- `/Volumes/WD/code/workspaces/coaster-rct2-program/evidence/references/original-1.jpg`
- `/Volumes/WD/code/workspaces/coaster-rct2-program/evidence/references/original-3.jpg`

Rejected current actual screenshots:

- `/Volumes/WD/code/projects/coaster-tycoon-3d/docs/verification/classic-art/art-overview.png`
- `/Volumes/WD/code/projects/coaster-tycoon-3d/docs/verification/classic-art/art-gate-facilities.png`
- `/Volumes/WD/code/projects/coaster-tycoon-3d/docs/verification/classic-art/art-train.png`
- `/Volumes/WD/code/projects/coaster-tycoon-3d/docs/verification/classic-art/art-narrow.png`

The publisher's [2002 manual](https://store.steampowered.com/manual/285330) contains
original UI examples and operating/construction/scenario context. Treat that
text/art as reference, not publishable project assets. No original executable
was run and no original graphic pack has been licensed for distribution.

## Modelling and materials to assess

Proposed: independently authored editable Blender sources and UV/material/rig/
animation data, exported to GLB; procedural topology for rail/connectors/support
placement remains separate from high-quality authored components. Not yet
implemented or measured. Grok Bot availability will be reported by root.

Build representative assets before an entire library: wooden lattice support
and station, wooden/steel car with coupling/bogies/restraints/real seat anchors,
flume trough/boat/water transition, Ferris cabins/rig or carousel horses, a burger
shop, information kiosk with maps/umbrellas, balloon vendor, restroom, a mature
tree and paving/roof/wood/metal materials. Deliberate geometry, bevels, UV density,
material variation, silhouette and detail must be visible at fixed original-
inspired overview and close cameras. Actual export dimensions, transforms,
materials, animation and browser selection/loading must be verified.

Eligible texture source candidates:

- [ambientCG licence](https://docs.ambientcg.com/license/) explicitly covers
  downloadable assets and material previews under CC0. Its documented API can
  retrieve exact asset/download metadata; record URLs, licence, hashes and maps.
- [Poly Haven licence](https://polyhaven.com/license) covers assets under CC0;
  sample/example renders and website text are separate. Use its public API only
  under [the published API terms](https://github.com/Poly-Haven/Public-API), and
  record exact selected files rather than bulk-scraping its website.
- No model or material is selected merely because a supplier has a general
  licence. Root will acquire a bounded representative source set, preserving
  source identity, licence and runtime-derivative decisions.

[glTF 2.0](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) specifies units,
coordinate/scene/mesh/material/animation representation; it does not dictate our
collision rules, simulation behaviour or instancing budget. Export transforms
must match role-specific forward/up axes. Clip phase decorates authoritative
ride/guest state; no fictional riders, facilities or unsupported motions.

## Frontend and full-content acceptance

Keep Classic horizontal controls and construction workflow; assess original
compact window/tab hierarchy and catalogue thumbnails, ride/category/object/mode
selection, per-type operating/settings/test/price/maintenance panels, guest
inventory/thoughts, all staff roles, gate/money/research/marketing/calendar views,
scenario selection/briefings/objectives/results and preset/design management.
The worker remains authoritative. Unsupported implementation must not masquerade
as locked research content or operational attractions.

Each proposed batch needs its owned files, upstream data contract, real user
flow, fixed-camera visual evidence and interaction/save/selection acceptance.
Do not write production code during the planning streams or invent runtime
success from drawings. Return a concrete finite sequence and acceptance gates.
