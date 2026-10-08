# Previous-kernel continuation fixture

`v7-continuation.json.gz` was generated on Grok Bot using the actual TypeScript
kernel at source commit `5571d39bc88b024ecccaa46dbacfa6707099a449`, before any
identity implementation. It contains two independently authored, MIT test parks:
an occupied circuit train with queued guests and nondefault motion/wages, and a
sold/demolished food shop whose slot is reused by a drink shop with different
stock costs. Each records the full initial v7 save and the previous kernel's
state after another 1,200 ticks.

The migration regression imports those actual previous-format bytes and compares
all previous persisted fields before and after continuation with split tick
batches. New identity fields are excluded from the old-state comparison and
checked separately. The fixture contains no original RCT2 or third-party media.
Its SHA256 is
`863d3d72fb11f81f2cb119b812856e5979605f9fac817ace762379f2b4d438e2`.
Retained generation evidence is linked from
[content identity verification](../../docs/planning/content-identity-evidence/README.md).

## Historical v8 state and projection

`v8-continuation.json.gz` is the unchanged, independently generated fixture from
source `9ed66bacb964cb418810d8fe7f40064a18ec4800`. Its SHA256 is
`f2077d5e44b25411261a8260ec7954c08bd171c9c25a1da64075b78c7c847061`.
The actual historical kernel records complete saves and public views at offsets
0, 1, 17, 400 and 1200. Tests receive the exact saved numeric rules and compare
all persisted fields and projected car trajectories under different tick batches;
only the nonpersisted cryptographic commandRevision quote token is omitted.

Both parks contain three-car occupied trains, waiting queues, nonzero complete
financial ledgers, RNG state and demolished/reused shop-instance history. The
second retains a legal 1 m / 1000 Hz nondefault world, preventing future content
profiles from silently injecting the shipping 4 m / 40 Hz defaults into old saves.
No expected result comes from the receiving implementation. Independent replay,
source/runtime hashes and original generation scripts are retained in
[v8 continuation evidence](../../docs/verification/v8-continuation/README.md).
This is project-candidate regression evidence, not original RCT2 calibration.
