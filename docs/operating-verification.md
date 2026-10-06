# Operating and motion milestone verification

Base implementation: `f3016af...a79c375`. The fixed candidate extends this
milestone; it does not complete the integrated simulation task or first playable.

The initial 38-test run compiled strict TypeScript and passed on the designated
Linux host. Current source/test/toolchain SHA-256 values were matched against
that remote tree before review. No builds or tests ran on Patrick's Mac.

GPT 6.1 Sol Max independently identified three source-confirmed defects:
unsafe-integer G measurements under allowed extreme parameters, a vertical
initial tangent producing NaN orientation, and inconsistent completed-lap
counts/measurements accepted on import. All three were reproduced as failing
regressions against compiled commit `a79c375` on Linux on 2026-10-07.
The first reproduction attempt could not locate `tsc` through an obsolete
compiler symlink; a fresh isolated `npm ci --ignore-scripts` from the unchanged
lockfile restored the toolchain before the actual three failures were recorded.

The fixed full suite passed all **41 tests**, including the real worker tests,
construction/ownership/resource boundaries, operating/portal/access semantics,
train fit, closure/edit/reset recovery, measured speed/forces, pause and
batch-independent save continuation. The final correctness run took 3.75
seconds. It is not a performance benchmark or original-game comparison.

Motion now establishes a finite perpendicular orientation frame and rejects
unrepresentable speed, travel or force values. Tick batches stage their train
updates and commit the clock and trains together only after every step succeeds.
The regression includes another train and a failure after a successful earlier
tick, proving that a failed batch does not leave partial actor/clock updates.
Completed travel must preserve its completed lap and copied measurements.

Sol completed focused source verification of all three fixes with no residual
counterexample. The independent Grok review of the frozen base is pending. Do not integrate this extension before closing any further confirmed
correctness findings. Raw baseline, red/green and review evidence are retained
on external storage and the designated host.

Outstanding acceptance includes passengers and exclusive queue/seat ownership,
facilities/staff/economy, multiple-train blocks, selected-family catalogue and
original motion/ratings qualification, browser controls/projections, real
integrated-GPU capacity and longer stability checks. These tests certify none
of those unimplemented or unmeasured cases.
