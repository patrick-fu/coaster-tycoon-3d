# Third-party notices

The simulation kernel runtime has no third-party dependency. All current
simulation code and test fixtures are independently authored for this MIT
project. No commercial game binaries, original media or OpenRCT2 implementation
are included. Reference catalogue metadata has a separate attribution below.

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

## Reference catalogue metadata

`src/content/rct2-reference.ts` contains reference identifiers, English object
labels and source links derived from the
[OpenRCT2 objects repository](https://github.com/OpenRCT2/objects/tree/978f596972c1163dc670d853dd6add4766f10dbd),
by the OpenRCT2 contributors, at commit
`978f596972c1163dc670d853dd6add4766f10dbd`. The upstream object metadata is
licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
The derived metadata remains under that license, separately from this project's
MIT code. Changes select the 155 base-game ride/shop object records, assign
project reference IDs, crosswalk family memberships and exclude upstream media,
expansion and synthetic objects. Each record retains its pinned upstream link.

Family classification, native type slots, named operating policies and starting
piece names are reference facts investigated against the
[pinned OpenRCT2 descriptors](https://github.com/OpenRCT2/OpenRCT2/tree/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/ride/rtd),
then recorded in independently authored project data. No descriptor code is
copied or linked. These reconstructed facts do not establish original-executable
parity or supply executable motion, construction, pricing or presentation rules.
All reference content capabilities are explicitly unimplemented at this stage.
