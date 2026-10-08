# Project progress and recovery

Last updated: 2026-10-08 18:41 UTC (2026-10-09 02:41 Asia/Shanghai).
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
| Log Flume | Planned next P3 slice in [ticket #69](https://github.com/patrick-fu/coaster-tycoon-3d/issues/69); dependency #65 is closed. No Flume production simulation, UI or playable ride yet. | Working drafts `docs/planning/log-flume-slice.md` and `prototypes/detailed-assets/log-boat-contract.md` are uncommitted in the active worktree. |
| Historical continuation | Independently frozen v10 paid mixed/Carousel oracle retained. Four new regressions pass on the pre-Flume receiver: 20 exact checkpoints. | Active-worktree `docs/verification/v10-carousel-golden/README.md`, test and compressed fixture are uncommitted; retain the oracle unchanged during Flume migration. These four checks have not been run together with the 148-test suite. |
| Log boat art | Isolated repaired-v3 mesh passed export checks: 1,916 triangles, eight meshes, four exact unit-frame hip anchors, no reported degenerate geometry/UV or inward closed components. | WD model evidence below. Actual render still shows a floorboard-like cut end. Replace its material and re-export/render before accepting or shipping it. No boat/rider/channel contact checks yet. |
| Progress documentation | Four-file change in `p/patrick/docs/project-progress` is verified and ready to merge; production WIP remains outside this documentation commit. | Merge the record, then return to `p/patrick/feature/log-flume`. |
| Delegates/processes | Documentation Design and Drift rounds 1/2 are terminal; wording findings are repaired. Endgrain AGY session `83989` is terminal SUCCESS/exit 0; no build/render/browser or AGY process is being claimed. | Root must merge the documentation and bake/export/render the returned material before accepting its pixels. |

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
| `/Volumes/WD/code/workspaces/coaster-log-flume/coaster-tycoon-3d` | Active source worktree. Documentation branch temporarily shares the uncommitted Flume planning/fixture files; stage only intended documentation. |
| `/Volumes/WD/code/workspaces/coaster-log-flume-model-authoring` | Isolated AGY boat source, input contracts, prompts and raw/repaired model evidence; root integrates accepted results. `evidence/repaired-v3/measurements.json` and two rendered PNGs establish the current art state. |
| `/workspace/coaster-log-flume-model-authoring` on Grok Bot | Remote Blender execution and editable/export artifacts. |
| `/Volumes/WD/code/workspaces/coaster-v10-carousel-golden/REPORT.md` | Frozen oracle source, receiving rules, actual setup commands, full/null masters, checks, hashes and retained passive-search failure; isolated Sol oracle outcome accepted by root. |
| `/workspace/coaster-log-flume/app` on Grok Bot | Pre-change engine and integrated v10 regression inputs; `v10-regression.*` in its parent contains exit/stdout/stderr. |
| `/Volumes/WD/code/workspaces/coaster-carousel/publication-request` | Raw Carousel public delivery, failed attempts and repair evidence. |

Repaired boat GLB SHA256:
`0c002ea3cc773e87c252bb56d0e45c179549b3853ac8c29cf6a42fdb8de87744`.
Editable packed Blender master SHA256:
`59f87c24cb389e719a9b4cbdd9a1219ee6fbf360ee6f373f4a2c4bdab08c1c9a`.
These identify isolated v3 geometry, not a shipped asset or final material.

## Decisions, failures and retained milestones

The entries below recover already observed milestones by artifact identity;
their recording date is not an invented execution timestamp.

### Recorded 2026-10-08: programme and completed Carousel

- Retained the complete original-category programme after Patrick rejected
  earlier coarse art. The [programme](docs/planning/rct2-program.md) covers
  coasters, water/fixed/transport rides, commerce/services, finance, guests,
  staff, research, scenarios and scenery. Early playable evidence remains
  scoped; it does not close catalogue or original-comparison gaps.
- Shipped the finite Carousel and closed #65 after source, distribution and
  actual public play checks. Preserved historical previews and saved layouts.
  Next independently verifiable ride outcome is #69 Log Flume.
- Actual public New park failure exposed an old-generation static packet
  crossing a new-generation reply. Reproduced the owner mismatch, then gated
  awaited UI replies by `staticEpoch`. The repaired race and disturbed Classic
  paths passed; strict worker ownership checks remain. A local attempt served
  the old UI and was rejected by hashes before acceptance.
- Kept the failed whole HTTP attempt (503), the missing proof-page driver
  failure (404), and the unrelated early occupancy expectation failure.
  Final distribution/public play proof uses the repaired exact source; full
  paid/null occupancy has separate finite controls.
- Removed disposable own source/temporary copies after retaining source pins
  and compressed CLI logs. Editable masters, failed evidence and previews stay.

### Recorded 2026-10-08: Log Flume preparation

- Adopted the bounded independent four-seat, one-boat channel design from Sol
  analysis. Native construction, real boats/owners, motion, staff, economics
  and historical projections require implementation and executed qualification.
  Proposed save 11/content 4/protocol 4 are design candidates only.
- Frozen v10 oracle and root's four remote regressions passed. The original
  passive search failed to find a full Carousel within its budget and remains
  retained; ordinary controlled commands produced the successful paid case.
- AGY's first boat failed actual basis/anchor and inward-component checks.
  Applied its bounded repair and retained both exports. Repaired v3 passed
  geometry checks, but root rejected the rendered cut-end material for further
  refinement. An earlier missing export-helper driver failure is also retained.
- Prepared a procedural endgrain-only AGY request and remotely probed Blender
  shader sockets. No endgrain job, bake or final art approval has occurred.

### 2026-10-08 18:25 UTC: continuous context requested

Patrick requested immediate progress recording at each step. Added this run
record and recovery/update triggers in `AGENTS.md`, with a pointer from the
domain glossary. Keep meaningful outcomes here as they occur; link detailed
reports instead of duplicating raw logs. Document verification and merge are
the current next action; the Flume programme continues afterward.

### 2026-10-08 18:28 UTC: documentation verification and review launch

Root's `git diff --check` passed. Read current GitHub state: PR #68 is merged,
#69 remains open, and gh-pages still matches the stated publication SHA. Local
boat GLB/Blender hashes match the retained v3 pins; v10 regression exit remains
0. Launched independent read-only Design and Drift document reviews in the
existing named Sol Max agents. Their findings and a second cumulative document
review round remain pending; no game validation was rerun for this doc change.

### 2026-10-08 18:30 UTC: evidence wording repaired

Design round 1 found that the draft's "floor/seat contacts" overstated Carousel
qualification. Root checked the model/browser evidence index and changed it to
floor coverage plus seat-anchor/owner pose alignment; full rider/model contact
remains open. This is a documentation repair, not a newly executed contact
check. The independent Drift result and cumulative second rounds are pending.

### 2026-10-08 18:32 UTC: Design round 1 consumed; round 2 launched

Design round 1 reread the repaired wording and reported no other material
defect. Root consumed that result and launched the second cumulative Design
document pass. Drift remains pending. The review scope is this four-file
documentation delivery; game/programme closure is not established.

### 2026-10-08 18:34 UTC: Design round 2 consumed; endgrain authoring launched

The second cumulative Design document pass found no material defect. Its
read-only scope remains documentation and retained evidence, not new game
execution. Drift is still pending. In parallel, root launched the independent
AGY material-only task after rechecking CLI 1.3.1 help and the available
`gemini-3.8-flash-high` model. Authoring is answer-only in the isolated WD
workspace with OS write/shell restrictions; root retains session `83989` and
fresh stream/stderr/exit captures. Required source/API reads, effective emitted
settings, terminal result and actual process exit have not yet been accepted.

### 2026-10-08 18:36 UTC: AGY material turn consumed

Endgrain turn is terminal SUCCESS with nonempty code, actual exit 0, blank
stderr and no reported denied actions. The emitted effective model and cwd
match the request; three completed `view_file` calls include both required
boat-source and shader-API files. Root accepts the bounded node-graph source
for a remote experiment, not its unseen appearance. Preserve this turn in the
authoring workspace's `evidence/endgrain/`; next bake/export/render on Grok.

### 2026-10-08 18:37 UTC: historical checkpoint wording clarified

Drift round 1 verified the retained Carousel/oracle/boat facts and flagged a
precision issue: 0/1/17/400/1200 are continuation offsets, not absolute park
ticks. Root corrected the record to identify saved tick 7888. Its first-round
terminal report and second cumulative Drift pass remain pending.

### 2026-10-08 18:39 UTC: Drift round 1 consumed; round 2 launched

Drift round 1 found no material P0/P1/P2; its checkpoint-offset clarification
is repaired. It independently confirmed the distinct published/source pins,
separate test scopes and unresolved art/Flume/programme gates from existing
evidence. Root launched the second cumulative Drift document pass. Restage
the updated journal before committing; the earlier staged snapshot is stale.

### 2026-10-08 18:41 UTC: document reviews closed

Both cumulative Design and Drift document rounds are consumed; no material
finding remains after the two wording repairs. Root reread the exact source
and evidence pointers. Reviewers used separate existing Sol Max sessions with
current-artifact tasks, rather than fresh-context sessions; that independence
limit is retained. All conclusions cover these four documents only. Restage,
check the final diff and publish this scoped change next.

## Next actions and unresolved gates

1. Verify and merge the progress-document change, retaining unrelated WIP.
2. Evaluate the returned AGY endgrain material in the isolated authoring directory;
   root bakes/exports/renders on Grok Bot and checks unchanged geometry and
   actual cut-end appearance. Keep both procedural source and texture provenance.
3. Integrate the v10 fixture prerequisite and implement the finite Log Flume
   contract with targeted logical review, real lifecycle/owner/economics checks,
   actual boat/channel/rider contact checks and browser/public validation.
4. Continue the applicable P4–P7 programme and qualified catalogue batches.

Direct original execution/metrics are unavailable. Representative integrated
GPU/park-scale qualification and Patrick's visual/play acceptance remain open.
The next bounded slice can proceed without a new Patrick decision; revisit
these gates when actual acceptance requires them. Independent end-to-end
Design/Drift closure rounds for the expanded programme are not complete.
