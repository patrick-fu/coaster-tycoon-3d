# Affected running-gear/station result

**Preserve within this finite flat-geometry scope.** The actual new car and new
station remove the former bracket/head and tyre/bed penetrations at the two
prescribed straight poses. Actual cap/hanger and upstop-tyre/hanger opposed
surface contacts exist. The changed relative-position hanger pairs remain
separated at all 59 frozen R16 poses; the detached finite drawbar is also clear.
No model, pivot, tolerance, old evidence or production file was changed.

The primary checker intentionally retains its **exit 1** and `verdict: reject`
after a world-coordinate contact reconstruction failed. That conservative
checker stop is not a verified model penetration. The separate executed local
adjudication below resolves it without rewriting the raw result. A preceding
inventory-assertion bug is also preserved, rather than hidden as a model failure.

## Exact inputs and execution

All numerical work ran on `grok-bot-vm-405605737`, Node `v20.19.2`, Three.js
revision 186. Body matrices are unit translations `(0,.5,0)` and `(0,.5,.25)` m
in exported +X-right/+Y-up/+Z-forward coordinates. Station root is identity.
Actual bogie pivots remain `(0,.17000000178813934,+/-.75)` relative to the car.

| Input | SHA-256 |
| --- | --- |
| New car, retained as `input-car.glb` | `ed293d53712c1bc02ce01a5c027d69dd7b31e60ae41c8a811d9a9464274f9adc` |
| New station, `input-station.glb` | `32214cdb6f388bcda1bdbbd59b8ac5a59ba454d947d2fde45380898572809cbd` |
| Actual C-hanger part export, `input-parts.glb` | `c1a54215b61bc1d05c7ec58d8a4c678741cd997230f198b39ab105be7934b584` |
| Old car, immutable parent `inputs/wooden-car-joint.glb` | `7b6ae0f47746d4e8bd624ad2323f7cd20abec214711cbfb4e89329adc687202e` |
| Old station, immutable parent `inputs/timber-station.glb` | `60d94b3c784726b3dfa5aa89bed37a4da8dee05769ff1f648d918a0de1bf7b41` |
| Frozen finite drawbar | `bd65312ab91197d08d66fd6258e31f31e46b6d529832a0d741fcb729e0fec671` |
| Original saved R16 matrices/results fixture | `167ba3e1da273b66a4bc1d9fb1c3a6fe6c1ec0d2ea54673395f94ae73a287ab6` |

The exact commands were:

```sh
ssh grok-build 'bash /workspace/coaster-wooden-native-placement/station-contact/new-candidate/run-check.sh'
ssh grok-build 'bash /workspace/coaster-wooden-native-placement/station-contact/new-candidate/run-r16-affected.sh'
ssh grok-build 'bash /workspace/coaster-wooden-native-placement/station-contact/new-candidate/run-link-bounds.sh'
```

| Run | Actual exit | Actual result SHA-256 |
| --- | ---: | --- |
| First inventory assertion, before the specific selector repair | 1 | `67fe443a51bcce9627f1d8cbdd00ce0a88c2072d6f07e8f2196722ece793e377` |
| Primary contact checker; both straight poses pass before the R16 contact stop | 1 | `35e0910c4122b3d4ca521a7ce23ae3ca2ca71ad73727cf54a4c4064cc17b2249` |
| Local contact adjudication plus affected R16 pairs | 0 | `080acfb424e2c061a9b4d8ccaf0a828102ec714e4f4e4b4f141138751eebeb26` |
| Actual finite link/hanger bounds | 0 | `a4d4afbceab1a7d36f4c269dc625eee41a25b93aa2b6c662e011a29565280b04` |

Raw commands, stdout, stderr, exits and pre-execution hashes are retained beside
the results. The initial inventory failure and executed source are in
`inventory-assertion-run/`: the selector included two platform boards while
asserting 17 track-interface components. Only that selector was corrected to
`boards.001` component 0. The completed primary source is
`check-new-contact.mjs`, SHA
`5ff5cdeae37746ffbc01487a66e2d73546de0039f8553e2ae1371e5c49e152be`.
The adjudicator is SHA
`8e39cb611cef9e0cd7cbb2c92d30350ec1130007053055301f5e5bc50ed3655c`;
the link bounds runner is SHA
`9ed298678205a6d9330c383c2cb84640a943b459cc4eff2c7a9d41aad0dc7f63`.
The unchanged geometry kernel is SHA
`dbae8359483725ec1f32d6d315b14143793fe275942799bccf83bbe94e069365`.

The actual author source retained as `source-running-gear.py` is SHA
`6a39cf624b126035e20d58d21edef024ab8710b7e04f3ff52340cd838bfd62db`.
The read-only GLB loader is SHA
`b6a1c91e6ec19b0b488d6f2176876db9c838e3abbdd57c2096347afdbe5a7458`;
the pinned Three.js module is SHA
`9052042d676cb0fdc1ddfefe193053f34b7ac0513a616fdac4535d49987812ea`.
Original source/accessor/resource preservation is the separate composition
verifier's gate; this experiment does not substitute for it.

## Actual straight red/green evidence

The four `UpstopBracket_Left/Right_BogieFront/Rear` leaves each contain one
220-triangle closed oriented solid, with 112 welded vertices, 330 edges, zero
bad edge/vertex links, zero degenerate triangles and zero welded residual. Each
passes the actual self-intersection check, has identity local transform under
its exact unchanged bogie node, and uses original metal material 0.

The primary run executes 101 passing assertions before its subsequent R16
stop. Eight red ablation contexts (two offsets × two bogies × two sides) each
produce both strict closed-solid controls: old car/new station bracket into
head, and new car/old station upstop tyre into old bed. For example, at offset
.25, old `BogieRear_Metal` component 6 triangle 1382 edge 0 crosses new
`Static_StationRoot_metal` head component 6 triangle 653 at
`(-.5,.5,-.5242597545819938)`, edge fraction `.5673311679151566`, with all
face barycentric coordinates strictly positive. In the same context, new
`BogieRear_Treads` component 4 triangle 971 edge 0 crosses old
`Static_StationRoot_timber.001` bed component 18 triangle 2029 at
`(-.46005951666157413,.3191962287521593,-.4613981874944937)`.
Complete opposite-side/front/rear witnesses are in `results.json.controls`.

Both positive poses test 20 potentially touching hanger/component pairs
(492 exact triangle pairs per pose), and 12 retained gear/station pairs.
They have **zero strict penetration, zero closed-solid containment and zero
ambiguous containment**. Sixteen finite cap/tyre-to-hanger surface proofs are
retained with triangle polygons, actual points, barycentrics and opposed
normals (`normalDot=-1`). These proofs authorize only their actual shared
surface intersection. No entire bogie metal/tread/component is exempted.

Representative front contacts at offset 0:

| Actual pair | Hanger/counterpart triangle IDs | Interior contact point, metres | Witness polygon area, m² |
| --- | --- | --- | ---: |
| Left hanger / `BogieFront_Metal` cap component 4 | 7 / 177 | `(-.5400000214576721,.62718091532588,.75)` | `.00001287341889866733` |
| Right hanger / cap component 7 | 6 / 348 | `(.5400000214576721,.62718091532588,.7533827561299256)` | `.000003449421744086803` |
| Left hanger / `BogieFront_Treads` upstop component 4 | 218 / 266 | `(-.5049999952316284,.3511038180947752,.7351888676106517)` | `.0002744300590481793` |
| Right hanger / upstop component 5 | 218 / 352 | `(.5049999952316284,.35387644938620166,.7332938360050321)` | `.0002175142512500153` |

Triangle IDs are the **actual new active mesh ordering**, not an assertion
that old primitive triangle ordinals survive composition. The cap witness is
below the exporter's trimmed upper hanger face; the unexecuted nominal -.042 m
local-up author point is not used. These small measured areas do not qualify
strength, wear, manufacturing or an axle attachment.

Actual station targets are metal head components 6/7, baseplates 27/28, webs
29/30; timber beds 14/15 and ties 16–23; and boards.001 catwalk component 0.
All 17 target solids are closed. Head maximum Y remains exactly `.5`; running
tread minimum Y is exactly `.5`. Eight positive wheel/head boundary witnesses
exist, including front-left point `(-.49799999594688416,.5,.75)` on new head
triangle 653. The unchanged flange and guide tread also touch the head's
inner X boundary without strict penetration or containment. These additional
boundary observations are not newly qualified contact mechanics.

Actual upstop tyre minimum Y is `.30150432884693146`; new bed maximum Y is
`.18000000715255737` and tie maximum Y is `.2800000011920929`. This gives
`.12150432169437408` m bed gap and `.021504327654838562` m tie gap. The
whole exported vertical envelopes are separated for every flat axial tie phase,
not merely offsets 0/.25. This statement does not extend to grade or banking.
Retained guide-pin components are not watertight under the frozen topology
rules; they remain actual surface targets, without an invented solid interior.

## World contact adjudication and affected R16 scope

The raw primary checker stopped at `right-entry--100`, leading front-right
hanger triangle 201 against cap component 7 triangles 348/1433/1441. World SAT
is true but world intersection reconstruction returns no points; strict
witness and containment are both absent. In the exact shared bogie frame,
the same three pairs yield a two-point edge contact and two one-point contacts
on X=`.5400000214576721`, zero plane separation, and no strict crossing. These
points are the already measured cap/hanger contact boundary. SAT itself was
correct; treating failed world point reconstruction as a model collision was
the conservative checker false rejection. Vertex-to-triangle diagnostic
distances in the probe are not surface clearance and are not used to qualify.

Both meshes have the same exact actual bogie parent/world basis. The unit rigid
frame residual is `2.220446049250313e-16`, and roundtrip coordinate residual is
`1.5700924586837752e-16` m. Relative surface intersection/containment is
invariant under the identical rigid transform, so the executed straight basis
proof is reused for those exact same-bogie pairs. This introduces no new
contact domain, body snap, pose, tolerance or blanket component exemption.

The supplementary run completes all 59 frozen flat R16 poses: 129,800 possible
new-hanger component pairs, 7,552 previously qualified shared-basis pairs, and
122,248 other pairs conservatively AABB-separated. Thus no changed-basis pair
requires an exact triangle test, and no penetration is inferred from AABBs.
Maximum unit-frame residual is `4.440892098500626e-16`. Actual own-car
shell/chassis/hitch and all other-car components are included. Separately,
the actual frozen `Drawbar_Body` is separated from all eight hangers at all
59 saved link/bogie matrices: 472 pair bounds, minimum vertical gap
`.07299999706447124` m. Actual meshes, not a centreline or empty marker, supply
these bounds.

## Finite consequence and limits

The measured old straight penetration blocker is closed for these pinned new
assets and unchanged flat body/bogie poses. Keep the old red inputs and raw
checker stops. A future reusable contact checker should perform shared-basis
tests in that basis or handle rigidly transformed boundary point reconstruction;
do not reuse the stopped primary exit as a universal pass/reject oracle.

This is no full-production activation, original agreement, manufacturing
qualification, global radius guarantee, grade/bank proof, generated-track
cross-section proof, dynamics proof, occupancy/portal proof, GPU or human
acceptance. The former full 59 hitch and 159+12 native checks were not rerun or
changed. Root retains the independent composition, generated-section and real
game/browser gates. Local and remote evidence are retained under the assigned
`station-contact/new-candidate` directories only.
