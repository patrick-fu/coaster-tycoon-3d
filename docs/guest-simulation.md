# Individual guests and boarding payments

This extension implements a candidate guest loop through the authoritative
engine. It does not qualify original RCT2 AI, demand, ratings or prices.

## Ownership and transitions

Guests share the 10,000-entity budget and monotonically allocated identifiers
with train cars. Arrivals draw cash, fare limits and force tolerance from the
saved deterministic RNG only when allocation is possible. Explicit profile
cadences govern movement, decisions, needs, patience and repeat-ride cooldown.

A guest walks actual flat paths, joins an associated queue, advances in FIFO
order and boards an available seat. Intent, queue membership and paid seat
ownership are separate. Boarding rechecks the current price, pocket cash and
force tolerance; pocket spending, park cash, ticket revenue and ride income
change together exactly once. Ride choice currently uses measured raw forces
and shortest reachable distance, not an invented excitement rating.

Closure, repricing and removed queue paths release unboarded guests. Paid
passengers finish their trip after closure. A missing exit approach holds paid
seats until it is restored. A broken ride stops admission and motion; mechanic
repair is a subsequent extension. Guests on removed/disconnected paths remain
explicitly stranded and can recover after reconnection.

## Navigation and continuation

Each guest persists its point, goal, adjacent next step and partial movement
progress. Reverse path trees are derived caches bounded to 32 destinations;
full routes are not duplicated into every guest save. Public navigation excludes
foreign queues. Topology changes invalidate caches and recover affected guests
synchronously without consuming RNG. Only the initial platform is selected for
boarding; multiple-platform passenger operation remains a fidelity gap.

Version 3 saves preserve guest traits, needs, history, navigation, queue order,
seat identities, pocket spending and retired-guest spending. Import reconciles
all guest payments with ticket/shop ledger totals and ticket income with rides.
An advance batch stages dynamic state and commits it only after every requested
tick succeeds, including money and numeric-capacity checks.

## Executed verification

On 2026-10-07 the designated Grok Bot Linux host compiled the current source and
passed 53 tests, including 11 guest integration cases. These cover real arrivals,
queue-to-seat payment, affordable and unaffordable repricing, queue demolition
and reconstruction, closure with paid riders, missing-exit recovery, trait-driven
eligibility, save/RNG continuation, corrupt ownership/payment rejection, the
10,000-entity boundary and partial movement continuation. Existing kernel,
worker, train and imported-speed regressions also passed. The full run took
12.45 seconds. This is correctness evidence, not a population-performance or
representative integrated-GPU acceptance result.

Facilities, amenities, staff work, recurring costs, demand calibration and
original behavioral comparison are not covered by this milestone.

## Recovery review

A second independent model found two additional queue-topology recovery cases.
A cancelled ride intent could plan a return using its own queue, then forget
that permission before movement. A shorter public approach could change the
queue body without synchronously releasing guests excluded from that body.
Both were reproduced on the designated Linux host, with legal independent
station/path geometry. Version 6 persists an exclusive evacuation-route ride
permission until arrival at the public entry. Public routes still exclude
foreign queues. Topology recovery now applies the same queue-body membership
check as the tick loop, without consuming RNG. A partial evacuation save and
immediate shortcut edit have regression coverage. The integrated backend passed
92 tests remotely in 14.01 seconds after these corrections.
