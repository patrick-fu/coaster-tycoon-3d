# Independent bounded running-gear preservation result

**The actual composed GLB preserves the frozen car within the approved four-bracket revision.** One independent positive passed, and all four targeted corrupted-output controls were rejected for their intended violations. This establishes exact preservation and composition correspondence only; it does not establish physical compatibility or authorize game activation.

All parsing and checks ran on `grok-bot-vm-405605737`, Linux x64, Node v20.19.2. The outer runner terminated with exit0; the positive verifier terminated with exit0 and empty stderr. Each corruption verifier terminated with expected exit1 and a specific rejection code. No Mac model processing, production/source/Git writes, composer rerun, station/pose simulation, browser or broader control suite was performed.

## Actual identities and command

| Input | Actual path | SHA256 | Bytes |
| --- | --- | --- | ---: |
| Frozen source | `/workspace/coaster-wooden-native-placement/inputs/wooden-car-joint.glb` | `7b6ae0f47746d4e8bd624ad2323f7cd20abec214711cbfb4e89329adc687202e` | 3,590,960 |
| Actual two-mesh parts | `/workspace/coaster-mixed-wooden/models/running-gear.glb` | `c1a54215b61bc1d05c7ec58d8a4c678741cd997230f198b39ab105be7934b584` | 982,392 |
| Actual composed output | `/workspace/coaster-mixed-wooden/models/car.glb` | `ed293d53712c1bc02ce01a5c027d69dd7b31e60ae41c8a811d9a9464274f9adc` | 3,636,520 |

Actual Grok command:

```sh
cd /workspace/coaster-wooden-running-gear-preservation
node check-preservation.mjs \
  --source /workspace/coaster-wooden-native-placement/inputs/wooden-car-joint.glb \
  --source-sha 7b6ae0f47746d4e8bd624ad2323f7cd20abec214711cbfb4e89329adc687202e \
  --parts /workspace/coaster-mixed-wooden/models/running-gear.glb \
  --parts-sha c1a54215b61bc1d05c7ec58d8a4c678741cd997230f198b39ab105be7934b584 \
  --output /workspace/coaster-mixed-wooden/models/car.glb \
  --output-sha ed293d53712c1bc02ce01a5c027d69dd7b31e60ae41c8a811d9a9464274f9adc
```

Executed verifier SHA256: `dd902022b4fd8c2474f9ddb3371833cf56de33adc88b6ff8ee4273e0684a157e`.
Control runner SHA256: `af40ee95c35c26f7dacc5a5fd7e886568c3e636a2fe02841a6e2e2efcd4f4663`.
The actual executed verifier source is frozen in the attempt directory. The verifier does not import the production composer or read its composition sidecar, removal list, matrices or verdict.

## Preservation and correspondence

- Original BIN prefix:3,576,804 exact bytes, SHA256 `439910cd640d04949ccccb9a3ab1d4f70e9a132b1a4fc0768ee889b2957f6a56`. Every original accessor payload and descriptor, all56 original bufferViews, all6 materials/images/textures and the original sampler remain exact.
- All24 original node definitions, parents and local/world matrices remain exact, apart from precisely two new bracket children appended to each original bogie. Couplers, seats, restraints, wheels, chassis and all hitch geometry remain unchanged.
- Exact-coordinate adjacency/BFS independently finds11 components and1,772 triangles in each source BogieMetal. Removing only components6/10,108 triangles each, leaves1,556 original triangles per bogie. The actual output index accessor50 contains that exact ordered subsequence for both Metal primitives. Total removed triangles:432. Original dormant index accessor3 remains stored but is referenced by no primitive.
- All other original primitive definitions and ordered index sequences remain exact. Only the two declared BogieMetal primitive index references change.
- Each actual appended bracket POSITION/NORMAL/UV/index accessor and view matches the supplied parts data byte for byte. Each bracket reuses original BogieMetal material0. No material, bitmap, texture or sampler resource is added or replaced.
- Four bracket nodes have correct original bogie parents and world-rest transforms `T(original bogie WORLD pivot) * parts mesh WORLD rest`. Independent scalar matrix computation and original-parent inverse agree with every actual local/world matrix: all local, world and unit-frame residuals are0.
- Exact appended reachability closure: nodes24–27, meshes13–16, accessors50–66, bufferViews56–72. Every added resource is reachable; front/rear duplicates are legitimate. Added data:41,752 geometry/index bytes,0 alignment bytes, no unrelated binary content.

JSON definition equality means decoded values and fields; serialization spelling/order is not treated as a geometry mutation. Original binary attributes are always compared byte for byte. Frame tolerances cover scalar arithmetic only: unit residual≤1e-9, intended-matrix correspondence≤1e-12; actual residuals are0.

## Meaningful corrupted-output controls

Each control is a real isolated GLB copy and receives its refreshed actual SHA in the verifier command. Input-hash failure cannot explain these rejections.

| Control | Actual corrupt GLB SHA256 | Exit | Actual rejection |
| --- | --- | ---: | --- |
| Change one finite old UV component | `6b276e8cf4bb85b00b6d85fde2f93e263aef50edd4af4cee3b3f71d310fb998e` | 1 | `OLD_ATTRIBUTE_BYTES` |
| Keep old bracket6 and remove retained component1 instead, same108-triangle count and coherent index bounds | `f09f2ba6cb828ae9cfd2ece6078433ce98801792ecea31f51aec72e91d446338` | 1 | `COMPONENT_REMOVAL` |
| Attach front-left bracket to rear bogie and compensate local transform so rest-world residual remains0 | `0593e18cf9f6854593b2941af736ed5e840c8f995971c813ae02f1419c8dd826` | 1 | `HIERARCHY_SCOPE` |
| Bind new front-left bracket to existing brass3 instead of original metal0, unchanged material resources | `7a5c3ba327201e405099c9c1e8520ac255c7e192c80158ab8ec14c6ee9e4c8bd` | 1 | `MATERIAL_BINDING` |

The wrong-parent control proves that an unchanged rest-world pose cannot conceal an incorrect bogie steering attachment. The wrong-component control preserves triangle count, distinguishing exact selection from count-only verification. Source, parts and accepted output hashes were checked again after all controls and remained unchanged. There were no unexpected failed attempts.

## Retained evidence

Directory: `attempt-2026-10-08T085223-129Z-ed293d53712c/`, alongside this report, mirrored under `/workspace/coaster-wooden-running-gear-preservation/evidence/`.

- `positive.json`: detailed assertions, all old accessor hashes/frames, exact removed triangle ordinals, part correspondence and append closure. SHA256 `d3f6c42c35831bb033582e7f5eb867a1f997fa65ac88faf69c955ca22c35557f`.
- `execution.json`: every actual command, exit, input/output SHA, stdout/stderr/report paths and hashes. SHA256 `a8d0863661e67233a3cbb70e038bfa05b4c4ff9b48ea5c6409aae2f35cddf80e`.
- `manifest.json`: executed source, all reports, logs, control GLBs and mutation provenance hashes. SHA256 `9e567b61f161a00c0c9160dd2a926c15f27ef6a1af8b9171f65f521edc513299`.

Physical rail/station contact, attachment, collision, curves/swept/continuous motion, manufacturing, native/original agreement, production execution, GPU rendering and human acceptance remain outside this report. Root owns those checks separately.
