# Admission, finance, calendar and scenarios

Sources and evidence classes are pinned in [the research index](README.md).
Exact rates, prices, thresholds, calendar update cadence and original scenario
values are unobserved unless explicitly stated otherwise. Reconstructed values
below are discriminating comparison seeds, not silently adopted balance settings.

## Admission and demand

Original qualitative rules support a park-entry-fee mode or individual ride
tickets. Gate and ride price permissions belong to a scenario/park policy, with
vouchers and permitted shop/service prices separate. Charging both gate and ride
fees is an explicit modern `unlockAllPrices` option; it is not automatically the
original default. [Policy reference](https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/world/ParkData.h).

Guest arrivals are demand-driven outside the gate. Eligibility includes park
open/access, pocket cash, perceived entrance value and discounts; accepted entry
commits payment/voucher once. The entry-paid flag can influence subsequent ride
value. Price versus value and affordability are different decisions. Reconstructed
cash distribution around a scenario's £50 differs from current random £10–30.
The reference gate maximum changed over time; current £999 is not an original
cap. Ride/shop reference limits differ from the project's generic £0–100 input.
No frontend may invent price ranges independently of the content/policy contract.

Demand depends on rating, open rides/value, population, awards, admission and
marketing. Distinguish arrival demand, ride choice and product purchase. An ATM
can recover pocket affordability without adding park revenue. Free admission,
half-price admission, free ride and free food vouchers must select/consume the
proper target and preserve integer rounding. Exact order/thresholds need original
traces, including rejected entry and repeat attempts.

## Authoritative game calendar

The original manual establishes an eight-month March–October year. The current
UI **already derives month/year from ticks**; an earlier root draft's claim that
March was hardcoded was incorrect. Missing work is authoritative day/month/year,
accounting phase, history and objective deadlines, not replacing a constant label.

Reconstructed cadence is 16,384 updates/month, 4,096/week and 8,192/fortnight;
displayed day advances proportionally across each month's real day count. These
accounting weeks are not seven displayed days. Forty updates/second is a reference
nominal cadence, not measured original runtime. Store exact simulation phase and
never derive financial obligations from renderer wall time or rounded UI dates.

Weekly/fortnightly obligations, monthly ledger rotation and objective evaluation
have a defined order relative to subsequent guest transactions. Pause freezes
simulation/RNG/obligations; original manual also restricts construction while
paused and permits management. Current command eligibility differs. Record and
verify that gap before changing pause behavior or acceptance workflows.

[Date reference](https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/Date.cpp),
[finance reference](https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/management/Finance.cpp).

## Accounting and profitability

The source has **14 expenditure categories**, independently verified after a
research summary mistakenly called them 13: ride construction, running costs,
land, landscaping, entry tickets, ride tickets, merchandise sales/stock,
food-and-drink sales/stock, wages, marketing, research and interest.
[Category declaration](https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/management/Finance.h).
Borrowing/repayment change cash and debt outside operating sales/expense. Refunds
reverse the appropriate construction category. Negative recurring cash is possible;
upfront construction still requires its own affordability rule.

| Metric | Meaning and evaluation window |
|---|---|
| Cash | Available funds; loan proceeds are not earned profit. |
| Completed-month category net | Rotated ledger for the month just completed. |
| Monthly ride income objective | Gross ride-ticket sales, not overall net income. |
| Monthly food/merchandise objective | Food and merchandise sales minus their stock expense. |
| Current weekly profit projection | Reference projection, distinct from literal weekly cash difference. |
| Ride income/profit per hour | Customer-history projection with its own time window. |
| Park value | Ride/asset valuation and park policy; not cash on hand. |
| Company value | Park value + cash − debt. |

Cost contracts cover family/piece/support-height construction, land versus
construction rights, landscaping/scenery, opened/unopened demolition, family
running cost, trains/cars/stations/lifts/mode/photos, staff role wage, research,
campaigns and interest. Current uniform upkeep, 50% refunds and 1% interest
cadence are candidates, not verified vanilla rules. Reconstructed wage/month
comparison seeds are handyman £50, mechanic £80, security £60, entertainer £55;
weekly charges are quarters. Four research funding tiers have monthly £0/100/
200/400. Ride upkeep occurs fortnightly for eligible non-closed rides, including
testing/broken conditions. The ordinary interest rule has native integer
arithmetic; do not interpret its raw setting as a conventional real-world APR.

Land ownership, construction rights and sale availability are separate bits and
height-dependent permissions. Reference land/right initial quotes £90/£40 and
opened-track refund about 70% require original validation. Quotes and actual
transactions share geometry/material eligibility and must reconcile atomically.

Marketing has six campaign types: free gate, free ride, half gate, free food,
park advertising and ride advertising. Each owns target, duration, paid upfront
cost, arrival effect and vouchers. Funding research affects discovery speed,
category priorities and weekly cost. Research availability and scenario selected
content are different from installed catalogue membership.

## Original scenario system

The manual permits scenarios in any order; no compulsory linked campaign or
unlock-by-winning story progression is established. Beginner, Challenging,
Expert, Real and Other group scenarios. Tutorial, scenario editor, coaster
designer and save-to-scenario conversion are separate experiences. Original
commercial park layouts, Six Flags branding and briefing text are references;
the independent game uses its own names, authored maps and prose.

The reconstructed base registry lists five Beginner, four Challenging, six
Expert and five real Six Flags parks, plus corresponding build-your-own entries.
Supplementary generic Six Flags/Tycoon Park membership needs original-file
evidence. Twenty-seven metadata records do not establish launch distribution
membership or scenario values. [Scenario registry](https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/scenario/ScenarioSources.cpp).

| Objective | Required evaluator and boundary |
|---|---|
| Guests by deadline | Guest target plus rating threshold at the October year deadline; early attainment is not automatic completion. |
| Park value by deadline | Park valuation target at deadline, independently of cash. |
| Ten coasters | Ten distinct original ride-object subtypes, open and qualifying excitement; ten layouts of one train variant do not suffice. |
| Guests and rating | Guest target with sustained quality; low-rating failure includes a grace/countdown/closure rule. |
| Monthly ride income | Completed-month gross ride ticket income. |
| Ten long coasters | Distinct qualifying subtypes, excitement and minimum individual length. |
| Finish five coasters | Designated protected unfinished rides, qualifying lifecycle/excitement; modern stricter designation/null validation is explicit. |
| Repay loan and park value | Debt at/below zero plus valuation threshold. |
| Monthly food/merchandise margin | Completed-month relevant sales minus stock. |
| None / Have fun | No automatic victory evaluator. |
| Build the best | No implemented evaluator established in the reference; do not invent a judge. |

Reference thresholds (for example E≥6 or E≥7, rating 600/700) are source-bound
comparison seeds. Exact objective numbers, deadlines and original omissions/fixes
must be observed before a parity claim. [Objective reference](https://github.com/OpenRCT2/OpenRCT2/blob/11513222890717e81431c83a28aafb7555f2ccd2/src/openrct2/scenario/Scenario.cpp).

## Scenario recipe and presets

A versioned, independently authored recipe must carry identity/briefing/category,
source/evidence and RNG seed; terrain heights/slopes/styles/water; climate and
weather schedule/state; owned land/construction rights/sale bits; entrances,
outside spawn and path connectivity; selected object manifest; invented versus
pending ordered research; finances/admission; initial rides, protected rides/
track, guests/traits/staff; restrictions; objective/deadline/win/failure state.
Initial cash already includes the loan in the reference; do not add it twice.

Seven research categories are transport, gentle, coaster, thrill, water, shop
and scenery. Installed, scenario-selected, invented and physically buildable
are four different statuses. Track-family and object unlocks may be separate.
Cool/wet, warm, hot/dry and cold are original climate types. Modern custom/snow/
blizzard weather is separately indexed. Exact original weather probabilities are
unobserved. Restrictions include terrain editing, tree removal, high construction,
marketing, money policy and guest preferences; tree exceptions/clearance-top
height rules require native-unit tests rather than arbitrary metre limits.

Candidate authored recipe suite, **unbalanced and unexecuted**:

| Recipe | Challenge purpose |
|---|---|
| Meadow Opening | Reach a guest/rating target by year 2 in an accessible starter park. |
| Ridge Renewal | Reach park value while terrain/right costs constrain expansion. |
| Coaster Exhibition / Long Circuits | Distinct variant/excitement objective and then individual length. |
| Extension Yard | Complete five protected partial coasters while retaining existing track. |
| Debt Recovery | Repay debt and restore park value with marketing restricted. |
| Ticket District | Meet completed-month ride income under per-ride admission. |
| Market Waterside | Food/merchandise margin under hot/dry demand and water scenery. |
| Quality Arrival | Sustain rating with guests, service/maintenance and failure countdown. |
| Money-enabled sandbox / Coaster Workshop | No objective with money constraints / no-money design and no guests. |

Numbers/layouts/research lists are authored balance work; none is claimed to be
an original scenario preset. Original stories can inform challenge structure
without duplicating proprietary prose or maps. Coaster design presets need a
content/geometry hash, footprint, compatible variants, actual tested ratings and
prices; missing measurements are shown as untested rather than invented.

## Save and acceptance implications

Version 7's lifetime ledger cannot reconstruct missing monthly history. Migration
must state `history unavailable`, preserve earned cash and provide deterministic
new calendar/accounting phases. Persist admission policy, campaigns/vouchers,
research progress/order, recipe/objective/failure countdown, climate/RNG, ownership
bits and valuation inputs. Entity limits and invalid imported content reject
atomically; stale profile identity cannot silently reinterpret a family or price.

Cases F01–F06 and S01–S05 in [the gap register](../../planning/fidelity-gaps.md)
cover admissions, accounting rollovers, loan/refund/valuation, campaign/research,
calendar pause/save, objective distinctness/deadline and protected terrain/rights.
