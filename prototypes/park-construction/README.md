# Rivermere Park Construction Prototype

An independently authored, high-fidelity **throwaway interaction prototype**
for [Validate 3D construction controls and park readability](https://github.com/patrick-fu/coaster-tycoon-3d/issues/7).
It asks whether precise endpoint construction, camera movement and park
inspection remain clear in a 3D park. Patrick explicitly requested high visual
fidelity rather than a rough mockup.

There was no existing application route. This isolated prototype is hosted at
`/prototype/park-construction/` on its own branch, outside main. Three
structurally different layouts share the same worker-owned park state:

- `?variant=studio`: a management sidebar, contextual construction palette and
  persistent ride inspector.
- `?variant=classic`: a horizontal command desk and bottom track palette.
- `?variant=immersive`: a compact icon dock and floating construction deck,
  giving the park more room.

The bottom layout explorer and left/right arrow keys cycle the layouts; the
URL preserves the selection. This build is exclusively a prototype, so the
explorer remains visible in its preview. It must not be promoted to production.

Patrick selected **Classic** on 2026-10-05. It is now the default layout,
including the fallback for an unknown variant. Explicit Studio and Immersive
URLs remain available as comparison references. This selects the layout
direction; it does not certify original-rule fidelity or every construction
interaction.

## Remote execution only

**Do not run these commands on Patrick's Mac.** Use the designated Linux build
host; keep dependencies, generated output and browser execution there.

```sh
cd prototypes/park-construction
npm ci
npm run build
npm run preview -- --host 127.0.0.1
```

For a private network preview, pass the build host's Tailnet address as the
host value. Build and test against the same pinned package lock. The preview
server uses port 4173. It has no backend or user account system.

With that preview running on the remote host:

```sh
node verify.mjs
# For a preview bound to a private network address:
PROTOTYPE_URL=http://BUILD_HOST:4173/prototype/park-construction/ node verify.mjs
```

The verification script uses the remote system Chrome and `playwright-core`;
it does not download another browser. `EVIDENCE_DIR` selects the remote output
directory. The default software WebGL renderer is suitable for functional and
visual checks, **not** a representative integrated-GPU performance benchmark.

## Try the interaction

1. Orbit the park, zoom, reset the camera, and switch between layouts.
2. Choose **Edit track**. The ride closes but its circuit stays intact. Use
   **Undo** to remove the final section, then place the highlighted right turn
   to reconnect it. Inspect the cost, refund, endpoint and circuit status.
3. Choose **Build a coaster**. Existing rides remain in the park. Click a clear
   tile to locate the station, rotate it before placing, then add track from
   its endpoint. Base-height controls move the whole selected coaster and
   recheck terrain, buildings and other rides.
4. Stamp paths or queues, or raise/lower a terrain tile. Inspect the changes
   and costs. Switch to guests and finances to see the worker-owned state.
5. Export the park, change it, then import the file. Tracks, stored rides,
   terrain, added paths, guests, finances, RNG, time and pause state are restored.
   Loading a save replaces the in-memory park. There is no automatic persistence
   in this disposable prototype.

Shortcuts: B construction, P paths, T terrain, Enter place section,
Ctrl/Cmd-Z remove the last section, Space pause, Escape park overview. Arrow
keys cycle layouts unless an editable control or the shortcuts dialog has focus.

## Implemented behavior and boundaries

All geometry, signage, park objects, UI and simulation metadata are authored
for this project. Three.js is the only runtime dependency. Retain its MIT
notice; development dependencies keep their own licences.

The worker owns construction, costs/refunds, simplified clearances, ride
selection/opening, fixed simulation steps and save state. Rendering reads that
state. One world unit represents four displayed metres. Quarter-turns, smooth
height transitions and a procedural loop support visual construction feedback;
these are not validated original track descriptors or motion formulas.

The 420 ambient guests follow an authored circulation route, with demonstration
needs and purchases. Added path/queue tiles are rendered and charged, but do
not rewire those ambient routes. The queueing tag is illustrative, not a
linked queue/boarding system. Ride view moves a train along sampled geometry
for inspection, not vehicle physics. Full ratings, arrivals, staff service,
loans, upkeep, research, pathfinding and park economics are not implemented.

The visible construction area and save-validation bounds are prototype bounds,
not the accepted original-game capacity contract. No original-scale, vanilla
parity or integrated-GPU performance pass is claimed. The separate performance
prototype requires representative simulation workloads, not this visual crowd.

## Provenance and review

The repository MIT licence covers this project's authored work. Runtime
dependency attribution is included in `public/THIRD_PARTY_NOTICES.txt`.
No commercial game assets or OpenRCT2 implementation code are bundled.
Retain remote execution logs, browser results and screenshots with their source
commit before requesting Patrick's interaction verdict. Keep the issue open
until he has tried or reacted to the prototype.

See [validation evidence](VALIDATION.md) and the retained layout captures:
[studio](screenshots/studio.png), [classic construction](screenshots/classic.png),
and [immersive](screenshots/immersive.png).
