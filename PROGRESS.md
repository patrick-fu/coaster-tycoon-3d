# Project progress and recovery

Last updated: 2026-10-08 19:42 UTC (2026-10-09 03:42 Asia/Shanghai).
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
| Production baseline | `d0057f24795b9e23c31b378f653563324f33fa12`, before the current documentation additions, includes merged PRs #66–68. Shipped source is `5498c35eb4a4013e29a602657e706d46ac68ddcc`. | [PR #68](https://github.com/patrick-fu/coaster-tycoon-3d/pull/68); gh-pages `f0c1417eca241e305e622fe938638c5cebdd7ead`. |
| Carousel outcome | Published and verified; [ticket #65](https://github.com/patrick-fu/coaster-tycoon-3d/issues/65) closed. | 148/148 kernel and a separate 9/9 protocol supplement; paid seats, storage and Classic controls checked. Details below. |
| Log Flume | Planned next P3 slice in [ticket #69](https://github.com/patrick-fu/coaster-tycoon-3d/issues/69); dependency #65 is closed. Candidate contract and historical regression prerequisite are verified and staged. No Flume simulation, UI or playable ride yet. | [Ride contract](docs/planning/log-flume-slice.md), [boat frame](prototypes/detailed-assets/log-boat-contract.md); merge preparation, then implement. |
| Historical continuation | Four guarded v10 regressions retain 20 exact checkpoints. Fresh complete source build/suite passes 152/152 on Grok; compiled engine hash matches the oracle. | [Verification](docs/verification/v10-carousel-golden/README.md), [immutable fixture](test/fixtures/v10-mixed-carousel-continuation.json.gz); staged for integration. |
| Log boat art | V5 files retained with matching hashes; front/rear inspected and the actual GLB anchor/material transport check passed. Root accepts the bounded endgrain replacement as an isolated candidate; geometry/UV/anchors remain exact v3. | V5 GLB SHA `0336a6e7…`, packed master SHA `655140c3…`; not shipped or Patrick-accepted art. Contacts and playable Flume remain unverified. |
| Progress documentation | [PR #70](https://github.com/patrick-fu/coaster-tycoon-3d/pull/70) merged as `8c1761fa74542c20e194ca59e579fc8e6ed290bb`; canonical main and active `p/patrick/feature/log-flume` both include it. | The live journal continues in the active worktree; commit new entries with their scoped deliveries. |
| Delegates/processes | All owned execution/delegates are terminal. Both cumulative prerequisite Design/Drift rounds are consumed; verified findings are repaired. | Commit and merge the preparation, then start production Flume. No active model/build is being claimed. |

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
| `/Volumes/WD/code/workspaces/coaster-log-flume/coaster-tycoon-3d` | Active source worktree on `p/patrick/feature/log-flume`, based on `8c1761f`; verified prerequisite/evidence/current journal are staged for the next scoped commit. |
| `/Volumes/WD/code/workspaces/coaster-log-flume-model-authoring` | Isolated AGY boat source, input contracts, prompts and raw/repaired evidence. Current material candidate: `evidence/endgrain-v5/` with reports, packed master, GLB and front/rear PNGs; original v3 baseline and failed v4 stay retained. |
| `/workspace/coaster-log-flume-model-authoring` on Grok Bot | Remote Blender execution and editable/export artifacts. |
| `/Volumes/WD/code/workspaces/coaster-v10-carousel-golden/REPORT.md` | Frozen oracle source, receiving rules, actual setup commands, full/null masters, checks, hashes and retained passive-search failure; isolated Sol oracle outcome accepted by root. |
| `/workspace/coaster-log-flume/app` on Grok Bot | Pre-change engine and integrated v10 regression inputs; `v10-regression.*` in its parent contains exit/stdout/stderr. |
| `/workspace/coaster-log-flume/fixture-qualification` on Grok Bot | Fresh complete 152/152 guarded baseline; initial and final suite logs, original source archive and exact corrected-input hashes. |
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

1. Consume prerequisite review findings, retain final evidence and merge the
   independently frozen v10 fixture, candidate Flume contract and current context.
2. Implement the finite Log Flume
   contract with targeted logical review, real lifecycle/owner/economics checks,
   actual boat/channel/rider contact checks and browser/public validation.
3. Continue the applicable P4–P7 programme and qualified catalogue batches.

Direct original execution/metrics are unavailable. Representative integrated
GPU/park-scale qualification and Patrick's visual/play acceptance remain open.
The next bounded slice can proceed without a new Patrick decision; revisit
these gates when actual acceptance requires them. Independent end-to-end
Design/Drift closure rounds for the expanded programme are not complete.
