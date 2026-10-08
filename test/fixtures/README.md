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

## Historical v9 paid mixed park

`v9-mixed-continuation.json.gz` retains actual pre-Carousel source `1fef531`
(production main `ccba3cf`) for full eight paid wooden seats and an explicitly
recorded slots1/5 null control, alongside three operating steel coasters.
It packages unchanged prior-kernel saves and public views at offsets
0/1/17/400/1200 from the read-only WD oracle. The new implementation never
generates expected trajectories. Exact receiving browser numeric Rules are
preserved; tests remove only the new version/profile/session/retired-income
fields and normalize the quote token's session/generation prefixes. All old
values, poses, ordered owners, guest history and financial records compare
exactly. Both receivers with and without the new fixed profile are tested.

Fixture SHA256: `6148fc5dc7a74a1522b447726549ab365dd40b86e72d3f07e2526a29f981bb76`.
Original oracle index SHA256:
`ad4a682d30ffb2207227a2dd360f9aca5146741876e4930303bdfbbda8a1e4ab`.
Full independent generation/replay records remain at
`/Volumes/WD/code/workspaces/coaster-v9-mixed-golden/REPORT.md`.
These are independent project regression fixtures, without original game media.

## Actual pre-Flume v10 mixed and Carousel continuation

`v10-mixed-carousel-continuation.json.gz` is packed byte-for-byte from the
independently frozen source3387b469 paid Engine oracle. Immutable external
index SHA256 is `ebbe5dfb3b9f0df9131c9620ff43dfbc92be4d81ee7e266ca326af4b102d4464`;
fixture SHA256 is `bcdd54f017e0dd769fecf8771fee3a0bd63c6318a8f4ee078729c5c497afff9f`.

The actual controlled park has8 wooden,16 Carousel and10 steel paid owners,
created by real commands/boarding. The ordered-null case removes wood1/5 and
Carousel1/14 owners and retires their actual spending90, preserving every
other field. Two cases ×0/1/17/400/1200 offsets preserve complete authority
bytes and original public views, including actual rotor/seat and body/bogie/
link poses. Only random session/restore prefixes are normalized; numeric
revision suffix remains. Exact serialized receiving Rules come from the
frozen Node park, rather than regenerated defaults.

The immutable source/master/generation/independent reconstruction, alternate
17-tick checks and raw passive-search failure remain at
`/Volumes/WD/code/workspaces/coaster-v10-carousel-golden/REPORT.md`. This is
matching-runtime evidence. The initial passive search never observed16
Carousel owners; the successful fixture uses declared real close/breakdown/
reopen commands and does not mutate owner containers or Rules.

The current production receiver independently passes all20 packaged authority/
view checkpoints under17 and1200 tick batches. Future Flume changes must
preserve them and all earlier v7/v8/v9 oracles; this fixture supplies no
Flume, original, cross-runtime, scale/GPU or human acceptance.
