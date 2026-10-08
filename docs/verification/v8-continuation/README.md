# Actual historical v8 continuation regression

The unchanged fixture in `test/fixtures/v8-continuation.json.gz` comes from the
actual historical source `9ed66bacb964cb418810d8fe7f40064a18ec4800`, compiled and
executed on Grok Bot Linux. It contains complete saved parks, actual public views
and frozen car-pose calculations at ten checkpoints across two matching receiving
configurations. It was not generated with the receiving source.

`historical-summary.json`, `verification.json` and `reproducibility.json` retain
source/archive/runtime/generator/fixture identities, parameters, preconditions,
commands, outcomes and every checkpoint hash. `historical-generate.mjs` and
`historical-compare.mjs` preserve the exact executed script bytes; their original
filenames were `generate.mjs` and `compare.mjs`. They expect the retained isolated
historical app and evidence layout, not the current production source.

The historical build and 23 relevant tests passed. A second process regenerated
all evidence: 32 files were byte-identical, and ten actual views differed only in
the declared cryptographic commandRevision session token. The initial full-directory
diff exited 1 for those tokens; the comparator exited 0 requiring every other field
and file to match. Saves, poses and the complete compressed fixture were unchanged.

The raw source archive, exact save exports, raw views, Blender-independent fixture
generation and logs remain at `/Volumes/WD/code/workspaces/coaster-v8-golden` and
`/workspace/coaster-v8-golden`. Do not regenerate this oracle with current code.
Builds, tests and isolated negative controls for the integrated regression run only
on Grok Bot. Their actual receiving-source results are recorded separately.

Full persisted fields and the wire-normalized public view are the backward
compatibility contract here. Object-key order in the embedded canonical fixture
is not raw export byte order; tests compare the complete records. Typed-array
projection fields are normalized to their actual wire values. The tests exclude
only commandRevision, leaving numeric revisions, topology, coordinates, car poses,
passenger counts and all other public fields in the comparison.

These cases establish historical candidate behavior under the two recorded rules.
They do not qualify mixed-family migration, original motion, browser wall-time
behavior, visual fidelity or representative GPU performance.

## Receiving-source execution

The actual receiving source is main `17634b91913e3df055011e5476e534bbae6e1fda`
plus the source-pinned regression and handoff-document changes; production
TypeScript, UI, dependencies and assets are unchanged. The transferred source
archive, executed test, fixture and all retained logs are pinned in
`receiving-verification.json`. Local and remote executed-test/fixture/source
bytes were compared after the run.

On Grok Bot, the build and focused tests exited 0; the full suite passed 123/123
with exit 0. Two isolated compiled-runtime controls retained the unchanged fixture:
forcing 2000 mm projected spacing failed both cases, and forcing 4 m world mapping
failed the legal 1 m case. Both exited 1 at the complete public projection
comparison at offset 0. Their source mutations, commands, output hashes and full
compressed assertion output are retained under `receiving/`. The receiving
production baseline remained unchanged. No browser or asset check was rerun for
this test/document-only slice.
