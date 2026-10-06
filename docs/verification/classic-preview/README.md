# Classic preview evidence

Captured on Grok Bot Debian Linux, Node 20.19.2 and Chrome 154.0.8037.57.
Browser rendering used SwiftShader. No build or runtime check ran on Patrick's
Mac. The independent steel rule recipe SHA-256 is
`fec73050499a6b9a021c21e4209e16eb9031387fe490d326cc0cbcb0f0fc1aa2`.

| File | Executed scope | Limits |
|---|---|---|
| `browser-check-result-final.json` | 17 real-wall-time browser scenarios against source `9371cdd`, including actual IndexedDB reload. | Functional browser verification; no original-game or integrated-GPU pass. Reproduce with `scripts/verify-browser.mjs` and the existing remote Chrome CDP endpoint. |
| `browser-check-default-profile.json` | All 17 scenarios repeated using Chrome for Testing 154.0.8037.57 and the existing default profile directory. | Corrects the earlier headless browser's automatic temporary-profile use; no separate profile was created for this repeat. |
| `public-preview-result.json` | The published HTTPS page loaded relative modules/Worker, rendered the starter and advanced actual ticks/guest arrivals at 1080p/DPR1 without page exceptions. | Direct public-entry functional check with SwiftShader; no integrated-GPU verdict. |
| `simulation-profile.json` | Three repetitions each at synthetic 2,000/5,000 guests, 600 measured ticks after warmup. | CPU-only crowded starter graph; no organic demand, renderer or representative multi-ride qualification. Recipe: `scripts/profile-simulation.mjs`. |
| `long-queue-profile.json` | 400/1,600 queued guests on an independent 34-tile candidate queue. | Altered timing holds the queue for stress; no original timing or organic crowd verdict. Recipe: `scripts/long-queue-profile.mjs`. |
| `soak-result-ee21d6a.json` | 30-minute engine baseline, 72,000 additional ticks, 30 topology/operation/save rounds. | Started before later repairs; initial source hash absent from raw output. No production renderer/Worker caller or final-source stability verdict. Recipe: `scripts/soak-browser.mjs`. |

The final source suite passed 99 checks in 13.59 seconds. The primary agent
executed the remote checks and inspected these outputs; independent reviewers
performed static review without claiming their own execution. See
[Classic browser integration](../../classic-browser.md) for repairs and scope.

Standard Chrome rejects remote debugging against its default profile directory
from version 136. The corrected repeat used the same-version official Chrome
for Testing binary with explicit `--user-data-dir=/home/box/.config/google-chrome`,
following [Chrome's automation guidance](https://developer.chrome.com/blog/remote-debugging-port).
The temporary browser binary is test infrastructure, not a game dependency.
