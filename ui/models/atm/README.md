# Independent Park ATM Candidate

## Overview

This candidate model is an independently authored, game-ready Victorian park ATM kiosk designed for unit tile placement in Coaster Tycoon 3D.
The model features an architectural timber-framed kiosk with an ashlar masonry plinth, shallow privacy cheeks, a forward-mounted enameled teal terminal fascia, an open-frame beveled display surround with soft-key buttons and a recessed CRT screen, a prominent right-hand card reader, a projecting numeric keypad console shelf with twelve discrete 3D buttons flanked by wooden side counter ledges, an exposed open-frame cash-dispenser slot recess with presenter lip and security shutter, a pitched tile canopy with turned metal spires, and an unoccluded front-facing ATM sign board with whole raised geometric glyphs.

## Silhouette & Readability Decisions

- **Shallow Front Alcove & Exposed Terminal Controls**: The terminal fascia is positioned close to the frontage (`y = -0.318..-0.298`) inside a wide (`x = -0.25..0.25`), shallow (`~0.04–0.05` unit) front alcove so that the display bezel, screen, card reader, keypad, and cash dispenser remain in direct sight and catch key/fill light from both normal front-left and front-right isometric camera angles (`(±1, -1, 0.9)`).
- **Split Counter Ledges & Unoccluded Keypad/Cash Slot**: Instead of a continuous horizontal plank blocking the lower machine, `ATM_Public_Counter` forms two timber side ledges (`x = -0.245..-0.175` and `x = 0.055..0.245`) flanking the projecting metal keypad shelf (`y = -0.402..-0.315`, `z = 0.315..0.345`). The 12 raised 3D keypad buttons (`z = 0.345..0.358`) sit proud above low side rims, and the cash dispenser surround (`z = 0.155..0.265`, `y = -0.365..-0.335`) and scoop lip (`y = -0.385..-0.360`) sit along an unobstructed sightline below the keypad shelf.
- **Open-Frame Fascia, Display Bezel & Cash Surround**: The teal fascia, metal display bezel, and metal cash surround are constructed from non-blocking open frame pieces around the recessed CRT screen (`y = -0.324..-0.310`) and cash pocket cavity (`y = -0.345..-0.285`).
- **Whole, Unfragmented ATM Sign**: The front gable rake beams and roof eaves terminate at `y = -0.390`, while the sign frame (`y = -0.425..-0.405`), teal sign board (`y = -0.432..-0.420`), and cream `A T M` glyphs (`y = -0.442..-0.432`, `z = 0.634..0.686`) are mounted proud in front of the rakes and sized (`x = -0.195..0.195`, `z = 0.615..0.705`) to sit below the roof slope (`z = 0.708` at `|x| = 0.195`) and above the screen bezel sightline.
- **Continuous Sidewalls & Inset Timber Joints**: Exterior plaster sidewalls and wainscot boards run continuously from rear (`y = 0.28`) to front cheek posts (`y = -0.35`), and horizontal timber rails are inset `0.004` units from corner post faces to prevent coplanar shading artifacts.

## Geometric Specifications (Proposed)

- **Coordinate System**: Local Blender right-handed axes: `+X` right, `-Y` frontage (maps to `+Z` frontage in export), `+Z` up.
- **Unit Tile Scale**: All geometry is strictly authored within normalized tile bounds:
  - `x`: `[-0.432, 0.432]` (within contract envelope `[-0.49, 0.49]`)
  - `y`: `[-0.460, 0.395]` (within contract envelope `[-0.49, 0.49]`)
  - `z`: `[0.000, 0.860]` (within contract envelope `[0.00, 0.90]`)
- **Triangle Budget**: Targeted `<= 4,200` evaluated triangles under the selective bevel finishing driver (consolidated box count reduced from R2's 4,136-triangle layout to keep a wider margin below the 4,200 ceiling; actual measurements pending Root's Grok Bot export run).
- **Topology & Normals**: 100% finite vertex coordinates, outward counter-clockwise winding normals, nondegenerate faces, and per-loop UV coordinates.

## Materials & Palette (8 Groups)

Reuses the 8 declared material keys without mutating caller dictionaries:
1. `timber`: Wood096 CC0 bundle for timber posts, beams, brackets, rails, side counter ledges, and sign frame.
2. `boards`: WoodFloor043 CC0 bundle for lower wainscot panels and rear service door paneling.
3. `roof`: Canonical ambientCG source `RoofTiles013A` CC0 bundle for pitched canopy roof slabs, consumed via the existing project/exporter `RoofingTiles013A` directory alias.
4. `plaster`: Concrete034 CC0 bundle for stepped ashlar plinth, continuous sidewalls, and shallow alcove returns.
5. `metal`: Metal049A CC0 bundle for open display bezel, keypad shelf console, card reader throat, open cash slot surround/shutter/scoop, finials, gutters, downspout, and rear door ironmongery.
6. `paint_teal`: Deep Victorian enameled teal for open-frame terminal fascia panels, card reader housing, and header sign board.
7. `cream`: Warm cream paint for raised 3D ATM glyphs, sign border rules, 12 numeric keypad keys, screen status prompts, card guide, and soft keys.
8. `ink`: Deep charcoal black for recessed CRT display face/lining, card slot mouth, and cash dispenser pocket cavity.

## Semantic Anchors

Three empty object anchors parented to root at unit scale:
- `GroundRoot`: `(0.0, 0.0, 0.0)` — Tile base origin.
- `Counter_Front`: `(0.0, -0.48, 0.35)` — External public service interaction point where guests stand.
- `Sign_Front`: `(0.0, -0.44, 0.66)` — Center attachment point for the prominent ATM header sign.

## Contract Reconciliations

- **No Sales Alias**: Withdrawals are free guest cash actions at an outdoor amenity counter; no sales, income, stock, or price semantics.
- **Outside Counter Only**: Single-sided exterior frontage with no enclosed interior room or fabricated queue capacity.
- **Canonical Texture Spelling & Alias**: `RoofTiles013A` is the canonical ambientCG bundle name; the existing exporter `RoofingTiles013A` directory alias is preserved when consumed.
- **Single Candidate Authorization**: This candidate asset is authored for Root's pipeline review; bulk style variants remain subject to Patrick's style gate.
