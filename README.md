# Coaster Tycoon 3D

An independently implemented browser-based 3D theme park management game,
using RollerCoaster Tycoon 2 as its gameplay reference. The project is
unaffiliated with RollerCoaster Tycoon 2 and OpenRCT2.

Project code is licensed under [MIT](LICENSE). The implementation and required
game resources are independent; see the [source strategy decision](docs/adr/0001-independent-mit-implementation.md).

Planning is complete. The first production simulation kernel implements atomic
construction commands, path connectivity, integer accounting and validated
save continuation. See its [interface and verification boundary](docs/simulation-kernel.md).
Patrick accepted the scope, independent architecture, Classic controls and
[acceptance contract](docs/first-playable-acceptance.md). The game is not yet
playable or accepted; prototype evidence is kept separate from production checks.

The first playable scope is a money-enabled sandbox integrating custom coaster
construction, individual guest simulation and park management at original-game
scale. The selected [browser architecture](docs/adr/0002-client-side-simulation-and-rendering.md)
uses an independent TypeScript simulation in a Web Worker, Three.js rendering
and project-owned local saves. Patrick selected the Classic interaction layout
on 2026-10-05: a horizontal command desk and a bottom construction palette,
with precise endpoint construction and contextual inspection. The disposable
[construction prototype](https://github.com/patrick-fu/coaster-tycoon-3d/tree/p/patrick/prototype/park-construction/prototypes/park-construction)
is retained outside main. Layout selection does not certify every interaction
or gameplay parity; measured capacity and final acceptance still require
experiments and live feedback. Patrick chose to proceed on 2026-10-05 while
keeping real integrated-GPU qualification as a mandatory first-playable gate.
The remote synthetic experiment informs implementation; it does not lower the
original-scale or frame-rate goals. The concrete
[acceptance contract](docs/first-playable-acceptance.md) defines the production
checks and human review required before completion.

Track implementation: [Implement the authoritative simulation kernel](https://github.com/patrick-fu/coaster-tycoon-3d/issues/18).

Retained planning map: [Define the first playable version of a faithful 3D RCT2 browser game](https://github.com/patrick-fu/coaster-tycoon-3d/issues/1). Its sub-issues and dependencies show the current decision frontier.
