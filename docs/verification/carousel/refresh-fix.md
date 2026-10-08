# Discard obsolete scene refreshes after park changes

The first real public run of source5343c3f failed while starting a new park from
an older saved layout. Every224 published root/pinned file matched its remote
build, so this was a frontend request-order defect, not a publication mismatch.
The [actual request trace](public-race-diagnostic.json) starts with three old
rides and no fixed body. New request4 precedes partial view5; ACK4 changes the
refresh epoch, but view5 returns the new ride7/session/body313 without scenery.
The original refresh applied that view to the old cached244 elements, causing
`Fixed-body owner mismatch for ride 7` in the scene owner check. The next full
view6 repaired the scene, but the error banner remained. The entire public run
failed and remains retained.

Root added only `if(requestedEpoch!==staticEpoch)return` after the awaited view
and before changing the current packet. The existing finally releases the
request, and the pending full-static flag remains for the next refresh. Worker,
physics, saves, model assets and strict owner validation are unchanged.

The [remote discriminating control](refresh-race.json) loads the actual frozen
v9 park, suppresses the ordinary50ms poll only to choose the real New/view
order, and runs the old committed source and repaired input. Old source
reproduces the missing-body error; repaired input reaches version10/content3/
protocol3, all five rides, one unit Carousel, no scene failure, no browser
exceptions and no WebGL error. This is a bounded causal regression control,
not a representative-hardware or broad race-absence claim.

The independent established Sol Max source reviewer identified the refresh seam.
[AGY static review](refresh-agy-review.json) completed the three required source
reads, returned SUCCESS with exit0 and no denied actions, and found no concrete
new failure from the guard. Its attempted extra art path was absent in the
isolated copy. Root accepts the sequencing explanation; the answer's promise
of a50ms wall-clock bound is not established by timers or source inspection.

Two earlier local attempts remain failures: one inadvertently served the old
file despite the proposed input, and was rejected by source hashes; the next
used the correct guard and removed the owner error, but its unrelated16-rider
wait failed after asynchronous asset loading. Neither whole attempt is counted
as a pass. Absolute transfer then verified input/web game hashes
`996d6b990691ae3e24289ee1f84ebf2a4af1f62952bcf57dc5670819af03e52f`.
Public verification after publishing the repair is recorded separately.
