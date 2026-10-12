# Core phase reviews before runtime checks

Base docs HEAD bcb8a2457ed9fbf31bf7cb73b4d87a5cd8e76cdf plus Root-owned dirty core draft.
Both reviewers read source and existing artifacts only. No build/test/simulation/browser work
was requested or executed. These are phase findings, not cumulative closure rounds.

## Sol 6.1 Max Design

- P2: validateServices checks only element kind, whereas element validation checks the other
  direction. A unique information record can borrow an ordinary facility element without
  its placement profile, creating a phantom counter and destructive removal. Repair the
  reciprocal e.facility===f.id guard and service entry ownership.
- P2: indexState reads f.kind before record/ensure. facilities:[null] throws TypeError through
  restoreSave and validation result instead of returning INVALID_SAVE. Guard the record first.
- Boundary: numeric profiles alone cannot prove qualified presentation. Verify actual
  receiving/art unavailability and command rollback before Library acceptance.
- Other policy/counter/refusal/RNG/nested-state/retirement/old13 paths had no confirmed static
  defect. This does not establish runtime success.

## Luna Max adversarial

- P2: validateFacilityProfiles preserves input insertion order for two independent keys.
  Opposite helper composition order therefore gives different exact saved Rules strings and
  WRONG_RULES on otherwise equivalent configurations. Canonicalize the finite profile order.
- Known stage gap: browser-worker/Library/game/Scene/assets do not yet receive information.
  The source draft cannot claim player delivery.
- No additional confirmed static transaction/RNG/refusal/slot-reuse/old13 defects. No checks ran.

## Root disposition

Root independently read the full import/validation/service/profile paths and accepts the
three concrete source-backed defects for minimal repair and remote reproductions. No new
saved identity or general presentation system is warranted by these findings. The qualified
presentation boundary remains unresolved until existing ADR0004 and actual game loader/gates
are inspected; that decision must be reviewed before dependent changes. Full Goal ACTIVE.
