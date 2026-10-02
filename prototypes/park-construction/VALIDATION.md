# Prototype validation

Validated on 2026-10-03 on the designated Grok Bot Linux host. Compilation,
browser execution and interaction checks all ran remotely. Patrick's Mac was
used for editing, Git operations, orchestration and viewing retained captures.

## Environment and build

- Debian 13, Node 20.19.2, npm 9.2.0.
- Three.js and its types 0.186.0, TypeScript 7.0.2, Vite 8.3.2,
  Playwright Core 1.63.0, pinned in the package lock.
- System Google Chrome 154.0.8037.57, headless with SwiftShader.
- `npm run build` passed TypeScript checking and Vite production compilation.
- Vite reports a main JavaScript chunk of about 629 kB uncompressed / 161 kB
  gzip, above its default 500 kB warning threshold. This remains a prototype
  delivery-size limitation; the warning has not been suppressed.

## Functional evidence

`verify.mjs` passed all 16 checks through the preview, with no uncaught page
errors. It operates visible controls, reads worker state through the prototype
diagnostic hook, and retains captures and a machine-readable result outside
the source tree.

1. Initial connected circuit, visible 3D canvas and 420 ambient guests.
2. Pausing preserves worker simulation time.
3. Explicit removal opens the circuit; a right turn reconnects it.
4. Undo restores placement funds and track state.
5. Building a new coaster preserves the existing ride.
6. Base-height controls move real track without changing funds.
7. Footpath stamping changes world state and charges £12.
8. Raising terrain changes tile height and charges £15.
9. Visible export/import controls round-trip the paused park state.
10. Malformed saves leave the existing park intact.
11. Inherited catalogue keys and out-of-range geometry are rejected.
12. Whole-coaster height changes cannot intersect an archived station.
13. Closing the selected ride exits its ride camera.
14. Native keyboard button activation and canvas placement both work.
15. Layouts differ structurally, preserve the selected variant on reload,
    and support selecting the actual coaster in the 3D view.
16. Guest and financial inspectors display worker-owned state.

The three layout captures are retained in `screenshots/`. A separate 1280×800
construction capture confirmed that the inspector does not overlap the park
map and the placement button remains visible. The complete remote results,
additional captures, source hashes and served commit are retained with the
external experiment evidence and linked from the tracking issue checkpoint.

## Independent review and corrections

Independent read-only reviews by GPT 6.1 Sol Max and GPT 6 Luna Max examined
construction state and interaction behavior. Verified findings were corrected:
endpoint closure, whole-track clearance after height changes, save catalogue
validation, camera recovery after closing a ride, implicit removal on editing,
native keyboard activation, and toast obstruction of construction hints.
The final remote checks exercise these failure paths.

During visual diagnosis, a controlled comparison found that removing distance
fog while keeping shadows restored missing low park props in remote
SwiftShader. The final diorama retains shadows and omits distance fog. This
observation does not establish a general hardware-renderer defect.

## Acceptance boundaries

This evidence establishes a usable, polished construction interaction
prototype. It does not establish Patrick's layout or construction-feel verdict,
original-game rule parity, vehicle physics, full pathfinding/boarding/economics,
original park capacity, or integrated-GPU performance. The crowd is an authored
visual workload, not a validated park-scale simulation workload.

The private preview is supervised on the remote host and bound to its Tailnet
address. It is not a public internet deployment. Session state is in memory;
manual export/import is available, and automatic persistence is not implemented.
The prototype remains on an isolated branch; the construction review ticket
stays open for Patrick's interaction feedback.
