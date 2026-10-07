# Detailed sample calibration and the next mixed-ride slice

The unchanged detailed car, station and kiosk cannot be attached to the current
procedural adapter without explicit rule/pose/clearance changes. Actual remote
measurements and a retained curved-body counterexample establish why. These are
candidate calibration results, not implemented original rides or original RCT2
agreement.

## Executed evidence

GPT 6.1 Sol Max authored the isolated measurements and next production plan.
All Node execution ran on Grok Bot; the Mac only retained/inspected sources and
outputs. The primary runner passed five measurement groups and 13 explicit
profile decisions with exit0 and empty stderr. AGY independently reviewed the
exact frozen runner/contract; root checked the actual result and corrected one
review-prose rounding error. See [review audit](review.json).

| Actual sample relationship | Result |
|---|---|
| Station seams in four cardinal directions | 0 m residual; 4 m pitch; unit scale |
| Legacy procedural basis applied to glTF+Z-forward model | Forward dot product0; reject |
| Station rail datum versus old nominal rail top | .5 m versus .358 m; .142 m mismatch |
| Car couplers at old2000mm / measured2680mm straight pitch | .6800000668 m / 6.675720199e-8 m residual |
| Equal-count four-seat patterns | Different null slots remain distinct; count-only view loses them |
| Kiosk full extent versus old4×2×4 m reservation | 4.1239477992×4.6999998093×4.1239477992 m; reject squashing/reservation compatibility |

All active GLB parents and binary POSITION values were measured: 23,069 car,
19,391 station and 14,732 kiosk vertices. Accessor-bound residuals are zero.
The executed preserve/reject guard belongs to this isolated experiment; no
production capability is enabled by its pass.

A second retained CPU runner reproduces the actual car shell failure on the
old8m/32-chord curve at lead6000/following3320mm. Its 14 checks pass: the straight
2680mm control has zero shell intersections; the curved pose has30 intersecting
triangle pairs and a .0307189824m coupler gap. Pair87/11 includes an edge strictly
crossing the other triangle's interior. This is a surface witness, beyond an
AABB overlap. See [actual result](curved-counterexample-result.json) and
[exact command/hashes](curved-counterexample-command.log). It does not determine
safe minimum radius or qualify a proposed16m curve.

## Reproduction and source scope

The runners require the original frozen sample outputs and the pinned-source
files under the owned remote `/workspace/coaster-native-calibration` workspace.
The primary wrapper [run-remote.sh](run-remote.sh) executes the exact Three.js
module; [measurements.json](measurements.json) records source, runtime, authoring,
GLB and exporter hashes and invocation. Retained input snapshots remain on WD
at `/Volumes/WD/code/workspaces/coaster-native-calibration/pinned-source`.
They were read with git-show from production2c19a1b and asset-sourcee17c646;
no GPL implementation or commercial image input is included in this artifact.

The [mixed production plan](next-production-plan.md) identifies every consumer
that must resolve per-ride numeric rules and ordered seats. Root's required
destination is steel and wood in one saved park. A separate wooden-only park or
renderer-only spacing override would leave construction, motion, seats and saved
validation inconsistent. New schema/profile/pose details in that report remain
proposals until implemented and checked. The existing authoritative seat state
can be reused; no duplicate seat ownership representation is required.

## Remaining gates

Native/visual/participant occupancy, exact original comparisons, a qualified
curve/coupling/body/bogie sweep, station/path/deck transitions, unit-scale
production adapters, mixed-save continuation, full R01–R03/S05, actual GPU and
Patrick's art/play acceptance remain open. No simulation or asset was modified
by this research batch. The full programme remains active.
