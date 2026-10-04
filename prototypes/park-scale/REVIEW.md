# Review disposition

Two independent read-only reviews were performed: GPT 6.1 Sol Max through an
internal sub-agent and Grok 4.7 Extra High through Cursor CLI ask mode. The latter
was additionally denied filesystem writes under the experiment repository by a
host sandbox. Its completed tool stream used only file reads, grep and glob;
the process exited successfully. Reviewers did not run builds or tests on the
Mac. The main agent owned all code changes and remote execution.

## Verified defects corrected

- Worker backlog originally sampled a clock captured before processing the
  current batch. It now measures after processing and records each step's
  entry delay and deadline misses, so catching up does not hide entry lateness.
- Restore correctly rebuilds a derived BFS cache. The continuation comparison
  now excludes only the two derived search-work counters; it still compares all
  saved dynamic state. A cold rebuilt cache is not a behavior mismatch.
- Staff losing a repair job to another staff member now clear service progress
  before accepting another job. A remote regression case verifies that the
  next job still requires its full synthetic service duration.
- The controller captures the rendered fixture before removing/disposing its
  canvas and resources.
- Empty timing series now report null rather than a false zero.

## Methodology strengthened

- A real-time message-only control uses the same cached routing and packed
  cloned projection as the rendering variant. Their difference is rendering
  and associated presentation work. Offline simulation throughput is reported
  separately and is not compared with real-time wall duration as if both were
  throughput measurements.
- Cold-start and scheduled topology-edit/save-restore timings are recorded
  separately from steady-state quantiles. Population-state mix is sampled; the
  tiers are not assumed to have the same walking/queueing distribution.
- Main-thread decode, instance upload and render submission costs are measured
  separately. Snapshot arrival starts before packing/cloning, so these
  overlapping metrics must not be summed as disjoint work. A main-thread copy
  before transferred-buffer recycling remains explicitly part of the design.
- The transfer pool covers the maximum five snapshots emitted by one 20-step
  catch-up batch plus an in-flight buffer. Any drop or incomplete receipt now
  rejects the run rather than appearing as a cheap snapshot path.
- Visual car proxy coordinates now advance inside each simulation tick and
  are included in saved state and final state hashing. This is still proxy
  motion, not vehicle physics.
- The renderer now includes path edges, visible bridge edits and a crowded
  near camera phase, with separate overview/near frame distributions. Every
  variant also performs a structured-cloned save/restore at tick 960.

## Deliberate evidence boundaries

Grok highlighted that software rasterization, reduced path graphs and simplified
geometry cannot qualify the full hardware/game target. The main agent accepts
that limitation and keeps it explicit, rather than expanding this bounded
experiment into production implementation. A 256-tile map envelope with 1,600
path graph nodes is not a fully populated 65,536-node route graph. Synthetic
record arrays exercise snapshot payload weight, not production map logic.

Likewise, the full-state and projected-message comparison intentionally changes
payload content. It tests the practical cost of repeatedly copying whole park
state, including static arrays. Packed clone versus packed transfer holds
projection content fixed; neither result proves a universal transfer advantage.

The cached-versus-uncached comparison tests only this identical BFS formulation
and fixture state mix. It does not select the original game's route semantics,
compare all alternative searches, or establish the full-game scale budget.
The original integrated-GPU qualification and exact original-rule evidence
remain pending. This review disposition is not Patrick's acceptance verdict.

A targeted Sol re-review of the stable measurement implementation found no
additional confirmed defect. It independently confirmed the paired control,
entry/deadline sampling, car tick work, save/restore and complete receipt checks.
It also confirmed that snapshot-to-render-submission covers only snapshots
actually drawn (the latest state may replace an earlier one), not every received
snapshot or physical screen presentation. All runtime conclusions still depend
on the main agent's remote checks and recorded measurements.
