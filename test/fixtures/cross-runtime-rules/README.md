# Immutable cross-runtime Rules save fixtures

Three actual retained save originals, compressed without regeneration of state or Rules. The regression reader uses `gunzipSync`, verifies each uncompressed SHA256, then exercises public Engine/Host receiving. These data establish historical receiving oracles, not full browser/native/resource/GPU acceptance.

| Fixture | Provenance | Uncompressed bytes | Uncompressed SHA256 |
|---|---|---:|---|
| node16.save.json.gz | Genuine R2 CPU Engine steel-only save, actual Node producer/recorder output |775841|`dbc75c286cc78bd555e088f6e3e31d353a00787eeb8aff30195b36adf5a94762`|
| browser16.save.json.gz | Actual default-profile Chrome Rules diagnostic, paused Classic save from the real Worker |817089|`e1b2e11977dd67a3743659f114336291b8a731e0e1ffa8d5bd39ff81260f9665`|
| genuine-browser15.save.json.gz | Genuine retained pre-ATM browser15/content8 authority; not synthetic scaffolding |816152|`5c14b5f50140e18811ef727943966b3706d213b1430582d93ca1f3b7967f2496`|

Packaging copied the exact bytes from `runtime/cross-runtime-rules-root-r1/evidence/{node16,browser16,genuine-browser15}.save.json`. The upstream retained originals are respectively `runtime/readiness-genuine-fixtures-sol-high-r2/postflight-r1/mirror/outputs/steel-only.save.json`, `runtime/readiness-native-driver-root-r11/rules-diagnostic-r1/selected-retention-r1/mirror/rules-diagnostic-r1/evidence/actual-browser-paused.save.json`, and `runtime/current-native-preparation-root-r3/inputs/native/original15.save.json`, relative to `/Volumes/WD/code/workspaces/coaster-gradual-restroom`. Full metadata and compressed hashes are in `provenance.json`.

Each artifact was produced by `gzip -n -9 -c` from its immutable source. Gzip headers omit the original filename and set MTIME0; repeated compression here produced identical bytes. Decompressed bytes compare equal to the originals. Different compressor implementations may emit different deflate bytes; the uncompressed hashes are the authoritative historical data identity. Do not rebuild a park or normalize its Rules to replace these fixtures.

Together they occupy42643 bytes, down from2409082 bytes. Copy this directory with the test into a full project tree at `test/fixtures/cross-runtime-rules/`. The default fixture URL is test-relative; `COASTER_RULES_REGRESSION_FIXTURES` can point to another directory containing these same `.save.json.gz` artifacts. No Mac-specific path is embedded in the reader. Node reader/tests were not executed during packaging; Root owns execution on the designated host.
