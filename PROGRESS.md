# Project progress and recovery

Last updated: 2026-10-09 11:22 UTC (2026-10-09 19:22 Asia/Shanghai).
Root owns this record. Update triggers are in [AGENTS.md](AGENTS.md).
The [domain glossary](CONTEXT.md), [programme](docs/planning/rct2-program.md),
[fidelity gaps](docs/planning/fidelity-gaps.md) and
[GitHub map #27](https://github.com/patrick-fu/coaster-tycoon-3d/issues/27)
remain the sources for vocabulary, full scope and ticket dependencies.

## Current target and constraints

Build an independent MIT browser park-management game with Classic controls,
substantially detailed 3D art and the original RCT2 gameplay/content breadth.
The finite playable slices are progress toward that target, not full fidelity
or Patrick's visual/play acceptance.

- Communicate with Patrick in Chinese; all repository artifacts use English.
- Root owns production code, integration and acceptance. Logical investigation
  uses existing GPT 6.1 Sol Max agents; visual authoring uses AGY CLI.
- Execute builds, tests, simulations, Blender, image processing and browser
  runtime checks only on Grok Bot via `ssh grok-build`.
- Local editing and orchestration use WD. Preserve editable masters, source
  provenance and failed evidence; remove only disposable task-owned artifacts.
- Original screenshots/metadata inform references. Original numerical agreement
  requires direct evidence; candidate values are explicitly labelled.

## Delivery and working state

| Area | Observed state | Evidence / next action |
| --- | --- | --- |
| Published game | Carousel plus steel/wooden rides, save 10/content 3/protocol 3. Five rides in a new park; existing saved layouts persist. | [Classic play](https://patrick-fu.github.io/coaster-tycoon-3d/?showcase=classic), [frozen repaired route](https://patrick-fu.github.io/coaster-tycoon-3d/previews/carousel-5498c35/?showcase=classic), [public proof](docs/verification/carousel/public-publication.md). |
| Production baseline | Canonical main is4c737dbfc861a87b0ad893d7b88d5f398f2cbba4 with merged planning PRs #70–71. Shipped game source remains5498c35eb4a4013e29a602657e706d46ac68ddcc. | Current gh-pages f0c1417eca241e305e622fe938638c5cebdd7ead; finite Flume source/publication pending. |
| Carousel outcome | Published and verified; [ticket #65](https://github.com/patrick-fu/coaster-tycoon-3d/issues/65) closed. | 148/148 kernel and a separate 9/9 protocol supplement; paid seats, storage and Classic controls checked. Details below. |
| Log Flume | Current full238/238/exit0; finite art/channel/terrain gates and material repair reviews consumed. Actual paid-browser-r3/72053 seven checks/exit0/blankstderr with Engine2b24637b/Native735c2d79/worker6736fcb6. All150 production files remain exact after runtime, zero mismatches. | [Finite evidence](docs/verification/log-flume/README.md) now retains latest paid result/pixels/stage/invariance and authored source-input pins. Independent bounded delivery reviews and source/publication follow. |
| Historical continuation | Shared r5 full11054 actually233/233/exit0/blank stderr,47.614s after four material repairs. Earlier r4/immutable fixture/old bytes retained; r2 helper failure is not relabelled. | Retain r5 raw logs and new version manifest on WD; historical fixture remains unchanged. |
| Log boat art | V5 GLB0336a6e7 and literal4hips qualify. Complete four-rider/channel/Portal finite composition113792 combinations, exact contacts0 after independent ambiguity resolution; prior failed run remains retained. Current terrain-null/equal-ground caller320 complete byte/group comparisons preserves only that unchanged flat geometry. | Varied-ground Boat/Rider composition, continuous contact/walking, GPU, original and human acceptance remain open. No shipped art acceptance. |
| Seated rider art | Frozen e615 export/audit/English qualification all exit0. Four seats contact V5 with12 patches/300 samples gap1.000008mm; six neighbour pairs zero. GLB e0bb0c5e/master b7a9ebe4 retained; AGY38394 remains ERROR. Complete finite flat composition and Scene actual four paid owners/Hip/raycast/resource release qualify separately. | Continuous/varied-ground contact, human/GPU/original and public paid-play acceptance remain open; earlier failures retained. |
| Channel pedestrian access | Portal9f716395 qualifies40layouts/38520 static walk poses and32layouts/28416triangle Native supplement. Approach e310a6 qualifies32layouts/4416 floor samples and Scene integration; finite flat composition also qualifies. | Finite static fit accepted. Actual continuous NPC traversal and original/GPU/human/public qualification remain open. |
| Progress documentation | [PR #70](https://github.com/patrick-fu/coaster-tycoon-3d/pull/70) merged as `8c1761fa74542c20e194ca59e579fc8e6ed290bb`; canonical main and active `p/patrick/feature/log-flume` both include it. | The live journal continues in the active worktree; commit new entries with their scoped deliveries. |
| Delegates/processes | /goal active. Bounded Design/Drift terminal and material QA re-review now closes the confirmed P2 with no new substantive finding. Actual current full238, paid7, Classic27/Library10/canonical tail3 and source/resource hashes consumed. No running delegate or browser/test process. | Root prepares scoped source commit/PR and exact Grok release build/public paths. Full expanded-programme closure, original/GPU/human/continuous gates remain open. |
| Browser integration | Scene r2/16 and previous production UI15/storage5 remain scoped evidence. Current paid-browser-r3 proves completed Test held4000 extra ticks, real four paid owners/render/guest selection, exact occupied save/restore, close preserving seats/pose and original four stored parks. | Root consumes detailed pins/pixels and source invariance next. Public, original/GPU/human/continuous gates remain open. |

### Acceptance evidence that still applies

- [Carousel evidence index](docs/verification/carousel/README.md): native body
  qualification, literal 16 seats, real owners, close/pause/breakdown/unload,
  mechanic work and retirement; historical v9 authority/view continuation;
  actual editable model exports, floor coverage, seat-anchor/owner pose
  alignment and loader disposal. Full rider/model contact remains unqualified.
- [Public distribution](docs/verification/carousel/public-publication.md):
  remote build exit 0; 224 root/pinned files fetched with HTTP 200 and exact
  build hashes; 582 older preview files preserved byte for byte. Both actual
  public browser routes reached five rides and a real paid 16-seat session;
  exceptions, console errors and WebGL errors were zero.
- [Refresh repair](docs/verification/carousel/refresh-fix.md) and
  [Classic rerun](docs/verification/carousel/refresh-classic.json): generation
  race repaired; 27 controls and ten Library checks passed. Public checks
  suppressed quiet autosave to preserve stored parks; separate
  [storage controls](docs/verification/carousel/browser-storage.json) apply.
- V10 oracle: immutable simulation source
  `3387b469f81b15f055b92651308daa439c52488d`, engine SHA256
  `666722f6b77159b7cae8df8b61f2d3d26360dbeb47fefa66c00cf8230a29e6fb`.
  Full case has eight wooden, 16 Carousel and ten steel paid owners; ordered
  holes preserve the declared 90 spending transfer. Checkpoints are tick offsets
  0/1/17/400/1200 from saved tick 7888 under Node 20.19.2. Fixture expectations
  predate Flume code; no cross-runtime or original-game agreement is claimed.

### Recovery locations and ownership

| Location | Purpose / owner |
| --- | --- |
| `/Volumes/WD/code/projects/coaster-tycoon-3d` | Canonical main checkout; root. |
| `/Volumes/WD/code/workspaces/coaster-log-flume/coaster-tycoon-3d` | Active source worktree on `p/patrick/feature/log-flume`, HEAD `4c737db`; native module/tests, finite datum contract and live progress/journal are uncommitted. |
| `/Volumes/WD/code/workspaces/coaster-log-flume-model-authoring` | Isolated AGY boat source, input contracts, prompts and raw/repaired evidence. Current material candidate: `evidence/endgrain-v5/` with reports, packed master, GLB and front/rear PNGs; original v3 baseline and failed v4 stay retained. |
| `/Volumes/WD/code/workspaces/coaster-log-flume-channel-authoring` | Root-frozen native visual API and copied read-only reference inputs; AGY returns isolated source, root owns writes and Grok qualification. |
| `/workspace/coaster-log-flume-model-authoring` on Grok Bot | Remote Blender execution and editable/export artifacts. |
| `/Volumes/WD/code/workspaces/coaster-v10-carousel-golden/REPORT.md` | Frozen oracle source, receiving rules, actual setup commands, full/null masters, checks, hashes and retained passive-search failure; isolated Sol oracle outcome accepted by root. |
| `/workspace/coaster-log-flume/app` on Grok Bot | Restored path currently contains only test inputs; do not use it as an old Engine recovery source. |
| `/workspace/coaster-log-flume/fixture-qualification` on Grok Bot | Current save11 source/compiled Engine2b24637b and Native735c2d79, with independent pinned node_modules. Earlier r5 Engine c4746856 stays retained in raw evidence. Old Engine recovery uses WD v10 source/archive and pre-integration-dist.tar d428df65…. |
| `/Volumes/WD/code/workspaces/coaster-log-flume-channel-authoring/evidence/shared-integration-r1` through `shared-integration-r5` | Actual compile/test/access failure/pass logs and pins retained. R5 red4fail/green4pass/full233 with independent repair review; earlier r4 full229/79focused remains finite pre-repair evidence. |
| `/Volumes/WD/code/workspaces/coaster-carousel/publication-request` | Raw Carousel public delivery, failed attempts and repair evidence. |

Retained v3 baseline GLB SHA256:
`0c002ea3cc773e87c252bb56d0e45c179549b3853ac8c29cf6a42fdb8de87744`.
Retained v3 baseline packed master SHA256:
`59f87c24cb389e719a9b4cbdd9a1219ee6fbf360ee6f373f4a2c4bdab08c1c9a`.
Current isolated v5 GLB SHA256:
`0336a6e7dc4aaa54136193d47187d67d2710ba53c4ccca3f93cf81e9dc693549`.
Current packed master SHA256:
`655140c3855deb1c5c7eac94151fc99d653f40cfc479803287b57771750058e3`.
These identify isolated candidates, not a shipped asset or Patrick's approval.

## Recorded progress

[Detailed progress for 2026-10-09](docs/progress/2026-10-09.md) retains each
meaningful step, decision, failure, review, source pin and result. File date
uses Asia/Shanghai; entry timestamps use UTC. Append new entries there and
refresh this current-state record before dependent work.

## Next actions and unresolved gates

1. Retain and hash-check the terminal paid-browser-r3 proof and current150-file
   source invariance, then freeze actual guest/inspector/vehicle state and pixels.
2. Freeze the bounded Log Flume verification/source manifest, review the finite
   delivery, publish its scoped source/preview and check actual public paths.
3. Continue the applicable P4–P7 programme and qualified catalogue batches.

Direct original execution/metrics are unavailable. Representative integrated
GPU/park-scale qualification and Patrick's visual/play acceptance remain open.
The next bounded slice can proceed without a new Patrick decision; revisit
these gates when actual acceptance requires them. Independent end-to-end
Design/Drift closure rounds for the expanded programme are not complete.
