# Integrated operating-park verification

The production-interface backend milestone passes 96 checks on Grok Bot Linux
(2026-10-07, TypeScript 7.0.2 / Node 20.19.2). The Mac did not execute builds,
tests or simulation. All code and fixtures are independently authored under MIT.
See guest, park-service and housekeeping documents for scope and actual cases.

## Independent review and reproduced failures

GPT 6.1 Sol Max read frozen guest `aeba02d`, service `1a5fbdb` and housekeeping
`d484ab8` sources independently; Cursor Grok 4.7 Extra High read frozen guest
`aeba02d` and backend `37f41d1` with read-only filesystem enforcement. Each
formed its assessment before receiving other review conclusions. Main retains
raw terminal results, exit status, source identity and tool audits outside Git.
Only read/glob/grep tools executed in the external reviews; no writes or shell
execution. The first external run could not read `.git/HEAD`; the later run was
provided a precise diff and hash manifest. Source identity was independently
verified by the main agent and the Sol reviewer. These are static reviews;
actual reproduction and regression execution belongs to the main agent on Linux.

Every actionable finding was reproduced failing before its fix:

- Guest saved steps could enter a foreign queue without permission.
- Patrol search rejected an in-area detour and saved staff steps could leave it.
- A walking facility guest could omit its physical counter goal.
- Shop net cash could cross the safe-integer boundary through rounding.
- Removing a cleaner's next path retained stale movement despite a detour.
- Same-tick bench/bin contention produced a legitimate pending intent rejected
  by import; malformed resting positions escaped structured errors.
- Evacuation forgot own-queue permission and a changed queue body retained
  excluded members until the next tick.
- A moved park entry overlapped evacuation permission and new intents.
- Queue-starting imported pedestrians lacked explicit ownership, and a corrupt
  queue-internal evacuation goal could erase its own permission.

Fixes preserve actual ownership, exact accounting and continuation rather than
saturating values or silently discarding state. Regression fixtures use legal
independent placement and test the public Engine/save seams. Sol focused source
reviews closed the initial guest, four service and three housekeeping defects;
later recovery counterexamples were reproduced and guarded with dedicated
regressions including moved/missing entries and legal partial evacuation saves.

The integrated scenario combines coaster boarding/payment, needs-driven services,
bench rest, bins, both staff roles, a patrol-blocked breakdown, successful repair,
cleanliness and categorized recurring finance. Same future ticks after import
produce identical authoritative state across different batch sizes. Shared
ride/facility, guest/staff/car/litter and 200-staff limits are explicit; full-map
patrol save-size checks do not constitute original-scale runtime qualification.

## Remaining qualification

Exact original physics, catalogue legality/costs/refunds, ratings, guest/staff AI,
calendar/rates and spontaneous breakdown behavior remain candidate gaps. This
milestone implements the accepted dependency loop without claiming those exact
original rules. Classic caller delivery follows separately. Representative
production scale, longer combined stability, real integrated-GPU measurements
and Patrick's hands-on acceptance are required before first-playable completion.
