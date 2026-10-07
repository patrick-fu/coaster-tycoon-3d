# Classic frontend for the full content programme

Root's corrected integration of AGY's frontend planning preserves Patrick's
chosen Classic top command desk and bottom construction palette. The present
UI already supports endpoint/piece construction and a tick-derived calendar;
the proposal's claim that these were absent is rejected. This document specifies
new capabilities, not an unexecuted screenshot or original numerical parity.

## Visual hierarchy and windows

Keep the park viewport dominant, with compact icon/label tools and a bottom
funds/guests/calendar/weather/news strip. Use tactile bevels, readable warm
surfaces, strong silhouettes and color-coded lifecycle status. Candidate tokens:
teal/slate chrome, warm cream content, near-black type, green/open, red/closed
and amber/test/warning. Target 12–13px desktop body type, tabular numbers, 22–26px
title/tab rows and 6–8px content spacing; check 1080p legibility rather than
copying tiny pixel font sizes blindly.

Add compact modeless tabbed windows where simultaneous comparison helps: rides,
guests, shops, finance, staff and park objectives. Permit two ride inspectors and
finance at once with focus/z-order, close/minimize and viewport clamping. Avoid a
generic desktop toolkit or proliferating one-use components. Construction remains
a single authoritative active tool in the accepted bottom desk. Switching windows
must not discard the in-flight tool or mutate an asynchronous proposal.

## Catalogue and construction

Six attraction categories come from [the audited family inventory](../research/rct2-program/families.csv).
Transport is railway/monorail/chairlift/lift/suspended monorail; helicopters are
Gentle. Dodgems are Gentle; simulators/cinema are Thrill. Top Spin is original;
“Top Scan” in the proposal was erroneous. Coasters distinguish 33 families and
56 base object variants. Shops/services distinguish products from building variants.
Building/scenery, path items, terrain/water and station/entrance kits have their
own browsers. Expansion/modern filters do not contaminate the original count.

Catalogue entries show owned thumbnails, name/category, actual variant/capacity,
available operating modes and construction capability. Scenario-selected,
researched, implemented and presently placeable are separate statuses. Match
original discovery behavior where observed; the preview's planned catalogue can
expose incomplete coverage outside the playable build menu. Use plain “Not yet
available in this preview” when needed, not internal “Engine Stub” labels.
Do not fabricate a simulation snapshot, rating or affordable quote for disabled
content. Search/filter/favourites and virtualized thumbnail grids scale to the
full catalogue without loading every model at startup.

Construction UI is selected by topology: track endpoint with legal pieces,
pitch/bank/direction/height/lift/launch/block controls; fixed footprint preview;
tower height; maze/minigolf walking topology; free-water dock. Show legal next
pieces, native/render height context, station/entrance/exit state, active frontage,
quarter occupancy/support/water conflict and actual quote/rejection reason. Public
and queue paths include height/slope/edge connectivity and station ownership.
All choices are worker commands with confirmed receipts; an optimistic preview
does not debit money or change topology.

Authored track-design presets have footprint, variant/content version and actual
remote test measurements. Display “Untested” for missing ratings; fit/cost/terrain
adjustment use authoritative validation. Scenario recipes and track designs are
different preset types and cannot share a misleading generic “park preset” record.

## Management coverage

| Window/tab | Required information and controls |
|---|---|
| Ride main/vehicles | Lifecycle, stations/queues, actual participant/train/car composition, all seats and occupied count; go-to/selection. |
| Operations | Legal mode, dispatch load/waits/synchronization/blocks or type-specific race/rotation/film/slide/program controls. |
| Measurements/ratings | Excitement/intensity/nausea; speed, length, duration, drops/inversions/Gs, test validity/provenance. |
| Price/finance | Permitted admission/photo price, stock where applicable, clearly named income/profit periods, running cost and actual history. |
| Maintenance | Inspection options, reliability/breakdown reason, assigned mechanic/travel/repair, downtime/history. No instant-repair button semantics. |
| Appearance/music | Owned color/entrance/vehicle/track regions, compatible music/sounds; artwork controls cannot change family rules. |
| Shop/service | Actual served products (up to two where defined), separate prices/costs/sales/margin, active frontage, status/users and service recovery. No stock refill mechanic unless evidenced. |
| Guest | Traits and correctly mapped needs; targeted thoughts/history; pocket cash/spending/withdrawals; colored merchandise, consumable/container, photo/voucher and phase. |
| Staff | All four roles, orders/costume/patrol, real job/target/travel/work, wage and history. |
| Park/gate | Open/access, admission policy/permissions, entry price/arrivals, rating/value, land/right availability and purchases. |
| Finance | Fourteen categories and completed/current months, cash/debt/company value; borrow/repay, six campaigns and separate research expense. |
| Research | Seven correct categories, funding and selected/invented/pending state, current project/progress/discovery; no invented “Ride Improvements” category. |
| Scenario | Authored briefing/climate/restrictions, precise objective/deadline, actual progress/failure countdown, win/failure state and saved recipe identity. |

Prices, wages, funding, inspection intervals and plot units come from the worker
policy/evidence contract. AGY's invented £0–50 ride/£0–100 gate ranges, example
wages and stall combos are excluded. Finance distinguishes gross ride income,
stock-adjusted food/merchandise margin, overall net and company value. Imported
legacy saves display unavailable historical months explicitly.

## Interaction and delivery

Keep Space/speed/camera shortcuts and precise pointer placement. Ignore game
shortcuts while editing an input, respect native Tab order, and use a separate
explicit shortcut to switch windows. Escape first cancels the active transient
tool/dialog state, then closes the appropriate window with focus restoration.
Deleting a selected object uses the authoritative removal confirmation/receipt;
never let stale selection remove a later entity. Camera gestures remain available
over the viewport and do not drag windows or place a track accidentally.

At narrow widths dock the active window into a clamped drawer and scroll the
construction palette; keep viewport, cash, date, notifications and error feedback
reachable. Compare 1080p desktop, 1024×768 and a narrow viewport; the browser game
remains desktop mouse/keyboard focused. Do not invent a separate touch product
or replace accessible labels with unlabeled icons.

Single AGY writer owns each finite UI batch. Begin with `ui/classic-windows.js`
and the smallest necessary `ui/index.html`/`style.css`/`game.js` edits; add
`ui/catalogue.js` only when a real shared catalogue projection exists. Root
owns worker schemas/commands and scene integration. No parallel author writes
the same stylesheet, game module or inspector host. Add later windows only when
their underlying simulation feature is present.

Remote acceptance: open two inspectors plus finance; drag/focus/resize/close;
switch tool with delayed receipts; build/reject each supported topology and
frontage; search/lock/unlock/versioned presets; verify product prices and ledgers;
save/load selected state; keyboard/input focus/Escape; resize and entity removal;
pointer camera/selection conflicts. Capture actual desktop/narrow layouts and
browser errors. Patrick's visual/play acceptance remains required.
