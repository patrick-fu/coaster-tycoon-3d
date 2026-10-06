# Kernel milestone verification

Initial kernel commit [34c1b68](https://github.com/patrick-fu/coaster-tycoon-3d/commit/34c1b68),
verified on 2026-10-05 on the designated Linux build host, using Node 20.19.2,
npm 9.2.0 and TypeScript 7.0.2. No compilation or tests ran on Patrick's Mac.

`npm ci --ignore-scripts` installed the isolated locked compiler toolchain.
`npm test` compiled all strict TypeScript modules and passed 21 public-interface
tests, including an actual Node worker using the production message handler.
The final test run took 7.05 seconds; this is a correctness run, not a benchmark.

Coverage includes quotes/costs/identifiers, command rejection and clearance,
connector attitudes and circuit edits, terrain/water/support, public versus
foreign-queue paths, loans, pause, save continuation, hostile saves/profile
identity, 255 shared instance slots and the fixed backing map plus 130,560
constructed path records at the tile-element threshold.

Independent read-only review used GPT 6.1 Sol Max and Grok 4.7 Extra High.
Sol found three concrete defects: an old quote accepted after loading a park
with the same saved revision, premature refunds attributed to active purchases,
and loss of correlation IDs on malformed execution requests. All three were
first reproduced by failing remote regressions, then fixed and included in the
21-test green run. Sol's focused source verification closed its counterexamples.
Grok completed its source review with no additional verified findings. Its Git
metadata command was rejected in read-only mode; the main agent independently
verified the base, clean final working tree and full committed diff. No conclusion
depends on that rejected command. Both reviews were file-only, not test runs.

The engine preserves persisted deterministic state while issuing opaque quote
tokens scoped to each engine instance and successful load. Imported net
expenditure must cover active purchases. Worker request errors preserve an
already validated correlation ID. These changes correct state safety; they do
not establish original gameplay fidelity.

Not exercised: complete train/guest/staff/economy rules, browser-worker
transport or render projections, original executable comparisons, hardware
frame-rate qualification and long-session gameplay. No first-playable or
original-parity pass is claimed. Raw red/green logs and review terminal evidence
are retained in the task's external-storage evidence directory.
