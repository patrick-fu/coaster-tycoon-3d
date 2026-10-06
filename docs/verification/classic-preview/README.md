# Classic preview evidence

Captured on Grok Bot Debian Linux, Node 20.19.2 and Chrome 154.0.8037.57.
Browser rendering used SwiftShader. No build or runtime check ran on Patrick's
Mac. The independent steel rule recipe SHA-256 is
`fec73050499a6b9a021c21e4209e16eb9031387fe490d326cc0cbcb0f0fc1aa2`.

| File | Executed scope | Limits |
|---|---|---|
| `browser-check-result-final.json` | 17 real-wall-time browser scenarios against source `9371cdd`, including actual IndexedDB reload. | Functional browser verification; no original-game or integrated-GPU pass. Reproduce with `scripts/verify-browser.mjs` and the existing remote Chrome CDP endpoint. |
| `browser-check-default-profile.json` | All 17 scenarios repeated using Chrome for Testing 154.0.8037.57 and the existing default profile directory. | Corrects the earlier headless browser's automatic temporary-profile use; no separate profile was created for this repeat. |
| `browser-check-repaired.json` | All 20 browser scenarios passed against source `5ae0957`, including rejected/rapid patrol edits and malformed Worker envelopes followed by a valid save. | Functional verification with the default profile and SwiftShader. |
| `presentation-regressions-red-9371.json` | The two patrol failures and thrown malformed-envelope error were reproduced against source `9371cdd` before repair. | Diagnostic reproduction; expected failing results are superseded by the repaired checks. |
| `grok-presentation-audit.json` | Independent Grok 4.7 xhigh read-only review reached terminal success and process exit 0 with the source unchanged. | Two vendor-directory lookups failed because local runtime dependencies were intentionally absent. The three findings concern successfully read production sources, not those lookups. |
| `public-preview-result.json` | The published HTTPS page loaded relative modules/Worker, rendered the starter and advanced actual ticks/guest arrivals at 1080p/DPR1 without page exceptions. | Direct public-entry functional check with SwiftShader; no integrated-GPU verdict. |
| `simulation-profile.json` | Three repetitions each at synthetic 2,000/5,000 guests, 600 measured ticks after warmup. | CPU-only crowded starter graph; no organic demand, renderer or representative multi-ride qualification. Recipe: `scripts/profile-simulation.mjs`. |
| `long-queue-profile.json` | 400/1,600 queued guests on an independent 34-tile candidate queue. | Altered timing holds the queue for stress; no original timing or organic crowd verdict. Recipe: `scripts/long-queue-profile.mjs`. |
| `soak-result-ee21d6a.json` | 30-minute engine baseline, 72,000 additional ticks, 30 topology/operation/save rounds. | Started before later repairs; initial source hash absent from raw output. No production renderer/Worker caller or final-source stability verdict. Recipe: `scripts/soak-browser.mjs`. |

The repaired source suite passed 100 checks in 13.90 seconds. Its clock regression
failed before repair with 60 retained ticks replaced by zero during pause.
The primary agent
executed the remote checks and inspected these outputs; independent reviewers
performed static review without claiming their own execution. See
[Classic browser integration](../../classic-browser.md) for repairs and scope.

Standard Chrome rejects remote debugging against its default profile directory
from version 136. The corrected repeat used the same-version official Chrome
for Testing binary with explicit `--user-data-dir=/home/box/.config/google-chrome`,
following [Chrome's automation guidance](https://developer.chrome.com/blog/remote-debugging-port).
The temporary browser binary is test infrastructure, not a game dependency.
