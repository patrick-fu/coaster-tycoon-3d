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
