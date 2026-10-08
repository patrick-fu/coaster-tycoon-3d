# Repaired generated portals: finite connection and placement result

**Preserve within the executed finite scope.** All 16 actual mounts now support
the complete .60 m ingress band on real floor and paving triangles. Actual
portal meshes, full cylinder envelopes and the local ingress/stair apertures
pass native-cell and barrier checks. Valid connected far mounts save/restore in
four directions. The specified far-side pair with its **actual approach paths**
rejects atomically in both placement orders and both saved element orders.
The old broken floor and omission of ingress bounds remain effective negatives.

No production, asset, datum, solver, tolerance or collision exception changed
in this experiment. It performed no build, browser run or previous broad suite.

## Frozen sources, commands and actual exits

Production read source:
`/Volumes/WD/code/workspaces/coaster-mixed-wooden/coaster-tycoon-3d`.
All executed source/modules were copied to this owned experiment's `inputs/`
tree; pinned shared Three.js stayed read-only. Local evidence directory is
`/Volumes/WD/code/workspaces/coaster-wooden-native-placement/generated-portals/repaired`;
remote is `/workspace/coaster-wooden-native-placement/generated-portals/repaired`.
Execution host was `grok-bot-vm-405605737`, Node v20.19.2, Three.js revision186.

| Actual source/input | SHA-256 |
| --- | --- |
| `ui/art/wooden-coaster.js`, exported portal builder | `d7b8b9b67ca37ecb56feeb287698ea2943e89fcf8a22c8538e19c174bf673232` |
| `src/simulation/wooden-placement.ts` | `0209a4c07a298a538c5820f4e68a7e47a1d4b230762a28ea09b66c8faee92973` |
| Executed compiled `simulation/wooden-placement.js` | `c0ce952233aa5e32448b21309e72d2b6e6cba11d85fb30109921ac2e9ac36670` |
| Frozen core4 `src/simulation/engine.ts` | `abf0d6537d223eb8bd2250250dad4efd70a7fb17fdd991b35c0392000d3b253d` |
| Executed compiled `simulation/engine.js` | `765f74a3d30afbed1de6147a5a1453cbbe3c91f4101580bfbc33f0c08ad4cec5` |
| Actual art runtime / path builder | `8b85e50ffed823678e3235639ae726ba7bee3e0c52c527855fce056b98df9e60` / `fe32698008e3f040fd3abf7fa93e9f24b0854473a21117aae222f3f63529bb00` |
| Actual station GLB, retained in `inputs/station.glb` | `32214cdb6f388bcda1bdbbd59b8ac5a59ba454d947d2fde45380898572809cbd` |
| Three.js module / core | `9052042d676cb0fdc1ddfefe193053f34b7ac0513a616fdac4535d49987812ea` / `9edde002b066a9a05676a6127f67735b62baf399bdea529f2f7e31657da769e6` |

The unchanged car was not involved in this portal experiment; no new car
preservation/contact result is claimed. The actual station QueueGate/ExitGate
world node matrices were read from the pinned GLB and fed through the real
`stationAnchor` seam. Their translations are respectively
`(1.899999976158142,.8199999928474426,-1.399999976158142)` and its mirrored
X/Z counterpart. Actual builder-to-core gate residual is
`3.446777223336864e-8` m.

Exact remote commands:

```sh
ssh grok-build 'bash /workspace/coaster-wooden-native-placement/generated-portals/repaired/run-check.sh'
ssh grok-build 'bash /workspace/coaster-wooden-native-placement/generated-portals/repaired/run-placement.sh'
ssh grok-build 'bash /workspace/coaster-wooden-native-placement/generated-portals/repaired/run-summary.sh'
```

| Run | Actual exit | Result SHA-256 |
| --- | ---: | --- |
| Main actual16 geometry/storage check; retained wrong portal-only assertions | 1 | `b6fa978d7bc0d94f83b7a55715b8967af21a82f6f06f28cdec13926cb2d24e01` |
| Actual approach-path rejection and ledger-valid saved-order supplement | 0 | `5b67365ababa0a9f3e6ed08febdac1c5bbf6e324383244c296fa9cf81dd810bd` |
| First side-gap reducer, retained wrong corner-post classification | 1 | `5db80278d2a1e522dae0f52aa24ed34404fb7f54260f4e424bf2806dabef28bd` |
| Correct actual side-gap reducer, no geometry rerun | 0 | `5bedb2b89b77b6ede36f3ac728788d135ea116d7ad7814986c2bdaf5a79641d4` |

Raw exit1 files remain intact. Main `results.json` is not relabelled as a
process pass: its 970 assertions include two incorrect **portal-only** rejection
premises. All 16 geometry case records pass. Its initial malformed saved-pair
fixtures were rejected for missing net construction expenditure; those are
explicitly not counted as geometry rejection evidence. The separate executed
supplement inserts actual approach paths and accounts for their construction
price, and obtains the intended clearance-specific result.

The first reducer incorrectly selected a rear-edge corner post at across1.60 m
as a side-boundary post. Its projected -.09 m envelope gap was not a real ingress
collision: the post lay more than3 m behind the aperture. The corrected reducer
classifies actual side centres at across±1.72 m or kerb±1.93 m from unchanged
path source and exported vertices. Other posts remain recorded, and **all** were
already included in the primary three-dimensional aperture test. No tolerance
or geometry predicate was relaxed.

Executed runners: main SHA
`f8c0b6149cc56500b59527572bdbe243f61248fee05844a3e7c8eef44b9486a2`,
placement supplement SHA
`d39197a5af180536f4ff95eb3738ef69583070200861ae09e75b3cf8fb776307`,
final reducer SHA
`9513f55d4c22caa79433879872f9e49827a5061ff4993f938ef53a1b903a7b3c`.
Raw stdout/stderr, exact commands/exits and pre-execution manifests accompany
each result. `sidebarrier-reducer-first/` preserves the first reducer snapshot.
The preceding genuine broken-floor exit1 evidence remains in `old-evidence/`
and the immutable parent experiment. Actual new mesh coordinates/matrices/
triangle indices are retained in `actual-meshes.json`, SHA
`fb366142499dbe04f58cbadecd06dcb8016a8d3824600f0de126343c57c63359`.

## Actual meshes, complete ingress bands and apertures

Sixteen cases use station origin `(384,384,32)`: four directions × two roles ×
both legal mount choices. Native32/tile maps to4 m, native8 height to1 m and
each quarter mask to2×2 m. Eight zero-jog cases have32 meshes/14 cylinders;
eight repaired jog cases have38 meshes/18 cylinders. In total, the actual
builder produced **560 meshes, 26,752 vertices, 15,936 active triangles and
256 circular-cylinder envelopes**. Every actual vertex and every conservatively
partitioned mesh/cylinder bound is covered by public Engine.quote native masks
and height intervals. The real public cells equal executed woodenPortalCells.

The lower plank measures `.6000000238418579` m across in zero-jog cases and
exactly2.75 m in jog cases; the measured jog is2.15 m. Circular handrail/post
support envelopes span approximately .750000024 m or2.90 m respectively,
inside the logical endpoint padding widths .80 m or2.95 m. Actual geometry is
checked; these widths do not substitute for quarter/height containment.

The complete .60 m ingress line is intersected against actual upward horizontal
floor and paving triangles. Its interval union covers `[-.30,+.30]` without a
hole in every case. The maximum actual front-plane separation is
`5.960465898624534e-9` m; floor/paving top separation is
`3.7252778639640383e-10` m. Width coverage uses the original1e-9 m boundary
tolerance; float32 datum correspondence uses the existing1e-5 m threshold.
Neither threshold increased. Actual stair height/run records preserve .14 m
paving, .82 m deck, four .17 m rises/.50 m treads and the1.47 m upper landing.

Concrete repaired direction0 turned entrance / independent normal exit:

```text
landing: (53.4,4.14,56.07)
ingress: (51.25,4.14,56.07)
actual full floor band:
  (51.55,4.140000000372528,56.069999994039534)
  (50.95,4.140000000372528,56.069999994039534)
actual full paving band:
  (51.55,4.140000000000001,56.07)
  (50.95,4.140000000000001,56.07)
```

Lower-floor mesh0 upward triangle4 supplies the complete band, with triangle5
retaining its end boundary; paving mesh0 upward triangle4 supplies the same
whole interval. Their actual vertices/normals and covered intervals are retained.
The former landing centre need not be on the paving: it is now connected by
the real widened floor to the actual ingress. Other directions are executed,
not accepted merely by a rotation premise.

The primary check uses a .60 m wide,1.80 m high local ingress prism extending
run `-.10..+.20` about the actual front junction, and a separate .60 m stair
opening prism at run `.65..+.85` above the first tread. All actual generated
kerbs/posts/rails, full circular-cylinder bounds and actual queue/public path
kerbs/posts/rails are separated from their relevant prism interiors. It also
checks the .80 m path-side endpoint envelope separately. Boundary contact at
the exact .60 m kerb limit is not advertised as extra clearance.

Actual queue side-post inner coordinate is1.68 m from path centre; the clamped
ingress is1.25 m away. The actual .80 m envelope leaves
`.029999999999999805` m lateral separation, and the .60 m band leaves
`.12999999999999967` m. For the direction0 turned entrance, path mesh4 bounds
are X`51.68..51.76`, Y`4..5.1`, Z`56.36..56.44`, with actual inner vertex
`(51.68,5.1,56.36)`. Public-path side-kerb clearance for the far exit is .21 m
for the .80 m envelope, .31 m for the .60 band. These source-backed local
intervals do not qualify complete guest turning/motion across the platform.

## Discriminating negative controls

All eight jog cases reject both controls with actual geometry:

1. The pre-repair lower-floor triangles entirely miss the new ingress band.
   For direction0, their X range is `53.09999996423721..53.69999998807907`,
   while the required band is X`50.95..51.55`; its full interval is uncovered.
   The original executed centre-to-paving gap1.469999976 m remains retained.
2. Omitting ingress from bounds uses the actual old compiled helper's native
   cells. Real expanded lower-floor vertex
   `(50.95,4.140000000372528,55.37000000596046)` lies outside those old cells
   in direction0. The counterpart actual outside vertex is retained for every
   other jog orientation. This is not a metadata-only synthetic point failure.

## Public placement and storage-safe rejection

Four valid fixtures have two immediate connected bays, normal entrance on the
first and independent normal/far-side exit on the second. Both portal/path
quotes succeed, exact save round-trip succeeds and reversed element source
order restores the same elements in every direction. No train/guest advance or
circuit is asserted.

For the prescribed direction0 pair, track origins are `(384,384,32)` and
`(416,384,32)`. First turned entrance is dir3/tile`(12,13)`, second normal exit
is dir3/tile`(13,13)`; approaches are `(12,14)` and `(13,14)`. **The portals
alone do not collide:** their shared tile masks are8/4,9/6 and1/2, whose ANDs
are zero; their physical bounds have1.05 m X separation. This explains the
retained wrong portal-only test assertion without inventing a new rejection.

The first widened portal reserves tile`(13,14)`, mask1, low32/high56. The
second actual public approach path uses the same tile, mask15, low32/high48,
so it shares mask1 and height. It is not the first portal's exact approach.
The unchanged interface rule correctly grants no cross-portal path exception:

- Entrance portal → own queue path → exit portal → other public path: last
  path quote and execute reject **CLEARANCE**, with byte-identical before/after
  saved state.
- Exit portal → own public path → turned entrance portal: last portal quote
  and execute reject **CLEARANCE**, with byte-identical state.
- Ledger-complete saved versions of both conflicts reject **INVALID_SAVE**
  specifically with `Construction intersects an existing element.` in both
  original and reversed element orders. Seeded valid receiver state remains
  byte-identical, proving restore atomicity beyond a premature finance failure.

Relevant production seams are `woodenTransition` lines14–27 and
`woodenPortalCells` line39; actual portal generation starts renderer line746,
shared landing/ingress at792–793 and widened lower floor at818–824; actual
opening kerbs/rails/posts are867–944. Public Engine cells/clear use lines176–185,
path/portal plans225/241, and save indexing357. No blanket exception or direction
restriction was added by this experiment.

## Limits

The finite repaired ingress/native/storage gate passes. Full station/avatar
solid collisions, full traversal/turning animation, grade/bank geometry, moving
ride dynamics, manufacturing, original/native parity, GPU and human acceptance
remain separate. Existing159/59/contact/preservation and broad simulation suites
were not rerun. Root owns integration, browser verification and publication.
