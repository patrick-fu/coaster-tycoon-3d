# Third-party notices

The simulation kernel runtime has no third-party dependency. All current
simulation code and test fixtures are independently authored for this MIT
project. No original game data or OpenRCT2 implementation is included.

The development toolchain uses TypeScript 7.0.2 and its optional platform compiler
packages from Microsoft, licensed under Apache-2.0. `npm ci` installs their
bundled license and notice files; the lockfile records exact versions and
registry integrity. The compiler is not bundled into the game runtime.
Source: [Microsoft TypeScript](https://github.com/microsoft/TypeScript).

Add separate dependency and resource permissions here before including further
third-party code or assets in a distribution.

The browser presentation uses Three.js 0.186.1 (MIT), including its OrbitControls
addon. The locked registry package supplies the runtime modules; web builds
include its complete license at `vendor/THREE-LICENSE.txt`. No third-party visual
assets are included. Source: [Three.js](https://github.com/mrdoob/three.js).

Park models, canvas surface textures and UI icons are independently authored
under this project's MIT license. The publisher's Steam gallery and original
manual are observation references; no original sprites, textures, models,
commercial game files or gallery images are included in the game distribution.
See [art direction and provenance](docs/art-direction.md).
