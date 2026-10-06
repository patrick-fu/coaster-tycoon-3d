# Candidate resting, waste and handyman work

Benches and bins attach to public paths as separate charged construction
records. A bench owns at most one resting guest. Timed rest restores energy and
reduces nausea; removing an occupied bench releases its guest. Attached amenities
must be removed before their parent path. Placement footprints, need thresholds,
rest durations and refunds are explicit candidates, not original conformance.

Food/drink purchases leave a saved wrapper. Guests seek reachable non-full bins;
deposits change fill and remove the wrapper. A wrapper without an available bin
can become a persistent ground-litter entity after the configured interval.
Litter shares the 10,000-entity budget with guests, staff and cars. Exhausting the
registry retains the wrapper and consumes neither an ID nor RNG. Effects and
outside-park guests are not yet represented.

Handymen claim litter/bin jobs, walk a patrol-constrained public route, then
complete actual timed work. A missing path or target cancels the job; it cannot
complete remotely. Simultaneous employees cannot own the same cleanup target.
Partial work, bench occupation, wrappers, bins and litter continue through saves.

Patrol selection still accepts tile lists at the command interface. Saved staff
use 2,048 unsigned backing-map words instead of duplicated coordinate objects;
an empty array means unrestricted patrol. A remote boundary case loaded and
re-exported 200 complete owned-map patrols below 8 MiB. Path trees incorporate
patrol permissions during search, allowing an in-area detour around a forbidden
shortcut. They remain derived caches, bounded to 32 trees.

## Executed checks and review fixes

On 2026-10-07 the designated Grok Bot Linux host compiled and passed 86 checks
in 13.83 seconds. Twelve housekeeping scenarios cover bin deposits, persistent
litter, full bins, patrol-limited litter removal, bin emptying, exclusive timed
rest, occupied-bench demolition, missing cleanup targets/routes, continuation,
invalid ownership imports, shared capacity and the full-staff patrol save bound.
An additional import case rejects missing amenity walking goals.

The integrated-park case runs one coaster, food stand, bench, bin, guests and
both staff roles together. Guests rest and buy before boarding, a patrol-blocked
breakdown holds paid passengers, a reachable mechanic repairs it, a handyman
cleans waste, and wages/upkeep plus ticket/shop/stock accounts reconcile. Same
future ticks after import produce identical state across different batch sizes.

Four independent service-review counterexamples failed on frozen commit
`1a5fbdb8ecb431eafd7420aceea77692ff2855c4` before correction: a legal patrol
detour was rejected, a saved staff step could leave patrol, a facility guest
could omit its counter goal, and net shop receipts could cross the cash safety
limit through floating-point rounding. Each has a remote regression. Fixes use
patrol-constrained search and saved-step checks, explicit walking destinations,
and exact BigInt net-receipt validation before assigning cash. No saturation or
silent loss of accounting precision is used.

Version 5 is the current development save format; earlier milestone formats
have no migration. These correctness checks do not qualify original AI/formulas,
production catalogue geometry, scale performance, browser controls, the proposed
longer soak or the representative integrated-GPU gate.
