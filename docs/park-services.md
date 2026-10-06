# Candidate park services and recurring finance

Food, drink and restroom instances share the 255-instance pool with coasters.
Each has an owned construction element, facing public-path counter, adjustable
price and opening flag. Guests choose reachable services from explicit needs,
walk to the counter and finish a timed service. Completion rechecks current
availability and price, debits guest cash and credits sales while separately
charging stock costs. Demolished shops retain historical income and stock in
reconciled accumulators. There is no invented stock warehouse.

Mechanics and handymen use the shared entity registry and the additional legacy
200-staff cap. The current mechanic implementation walks public paths within
its complete patrol route, claims one station job, and completes repair or
inspection only after arrival and the configured work duration. Removed paths,
portals, changed patrol or cleared breakdown invalidate existing jobs. Inspections
update their saved completion tick. Handyman cleanup, benches and bins are the
next extension; this milestone does not claim their behavior is implemented.

Profile-specified weekly wages and interest and fortnightly upkeep use integer
accounting. Cash can become negative; required operating costs continue and paid
construction is refused until sufficient cash is available. Borrowing changes
cash and principal without becoming income. The fixture uses a reconstructed
4,096-tick week and two-week upkeep cadence; actual rates, rounding, failure
probabilities and original inspection/repair behavior remain unqualified.

Version 4 adds services and staff to complete save validation and staged dynamic
updates. It replaces the development-only version 3 without migration. Guest
navigation import now validates the same queue permissions as movement. An
independent reviewer supplied a foreign-queue saved-step counterexample; it
failed on the preceding guest commit and passed after the guard was added.

On 2026-10-07 Grok Bot Linux compiled and passed 68 checks in 13.35 seconds.
Fourteen service cases cover need-based purchases, current-price changes,
closure/demolition recovery, historical stock, the shared instance pool, expense
cadences/debt, non-selling ride upkeep, patrol-blocked and disconnected repair,
partial inspection/shop continuation, invalid job/ledger imports, payroll batch
rollback, the staff cap and immediate stale-job invalidation. One additional
navigation-save regression covers the independently identified import failure.
This evidence does not qualify performance, original formulas or first-playable
acceptance. The integrated Classic caller and remaining cleanliness behavior
are still required.
