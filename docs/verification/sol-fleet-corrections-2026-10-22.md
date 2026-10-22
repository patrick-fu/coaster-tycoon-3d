# Ride editing and guest departure corrections

This slice corrects four failures found by the ten-direction Sol review on
2026-10-22. It builds on source `63c4efd0c74fc9aeac4353ba4aa6bb7b500fe1bc`.

- A ticket draft remains intact when Tab moves focus to Apply or Set while the
  inspector refreshes. Live inspector telemetry resumes after focus leaves the
  editing form; existing selection, instance and command guards remain active.
- Log Flume construction selects its native first station bay for Entrance and
  connected second bay for Exit. The view derives detached role IDs through the
  existing portal resolver; unavailable roles have no selectable station.
- An idle guest already leaving the park heads toward the current entrance
  before considering another service. Previously, moving that entrance after
  a paid service could leave conflicting departure and facility ownership,
  producing an invalid save.
- New Park asks players to Export before replacing their park. The single local
  save slot does not preserve an independent backup of the preceding park.

Save version18, content version11, worker protocol11, numeric Rules, dependencies
and game assets are unchanged. The new Flume view field requires a matched UI
and worker distribution; unchanged protocol numbers do not establish mixed
version compatibility. The historical view adapter removes only this newly
derived field from its cloned old projection. Frozen saves and expected views
remain unchanged.

## Verification

All execution ran on the Grok Bot Linux host. No build, test, simulation or game
browser ran on Patrick's Mac.

| Check | Actual result |
| --- | --- |
| Leaving regression against baseline | Natural failure at tick574: `INVALID_SAVE: Conflicting guest destination.` |
| Same regression with correction | Natural pass, including per-tick fresh-engine reload and once-only departure accounting |
| Current `npm run build:web` | Natural exit0 before canonical checks |
| Current `npm test` | 466 passed, 0 failed, 0 skipped; natural exit0 |
| Flume view regression | Incomplete/three-station construction, reversed storage order, clipped/no-static view and detached projection pass |
| Native Chrome picker | Actual Entrance selects station53; clicking Exit selects station54 |
| Native Chrome ticket editing | Draft2.7 survives Tab and live refresh; Return submits; Clear and reopening the same ride reads2.7 |
| Native New Park warning | Actual Export-only warning observed; Cancel preserves the park |

The first canonical run failed439/25. Twenty-four old-view comparisons needed
the explicit derived-field projection; one model test required the web build
before testing. Both causes were corrected and the failed originals retained.
No failed run was relabelled as a pass.

The accepted canonical stdout is118596 bytes, SHA256
`4c28e3392a968ce0b336ca92c0fe2ef50b63db55760aa2f8f3e32d23ae06aa82`.
The253-file source manifest is
`a9399398e8005095ae7718fe07615fe293a15df7171e41d83e64e007fc44a883`;
the215-file web manifest is
`5250d2088d670b8a53e12dbbd189f67edee97211b2c78baf017d490c91b24193`.
The web delta contains four JavaScript files and four emitted declarations.

Root operated the existing default Chrome through CUA against the unmodified
web distribution.185 completed HTTP writes across134 paths matched that
manifest. Original CUA actions and screenshots remain in the task transcript;
this is operator observation, not an independent image audit. An initial remote
selection shortcut appended22.7; it was corrected before submission. A brief
VNC reconnect delayed Clear, after which the successful authoritative reread
was observed. The page was unloaded to `about:blank`; the owned HTTP server
exited naturally and its PID absence and closed port were checked.

Cumulative independent Sol Design and Drift rounds found no confirmed source
blocker. A complete Gemini3.8FlashHigh source review adds model independence;
two preceding empty-final timeout attempts remain excluded. Retained originals,
pins, decisions and reports are under the external workspace's
`implementation/sol-fleet-2026-10-22-r1` and
`runtime/sol-fleet-2026-10-22-r1` directories.

This evidence does not establish public delivery, a current native Save/fresh
browser-worker reload, WebKit behavior, GPU performance, physical contact,
large-park soak or complete original-game breadth. Publication must separately
bind and verify the delivered UI and worker bodies.
