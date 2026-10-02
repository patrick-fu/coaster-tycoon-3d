# Disposable native headless baseline

This experiment answers whether the pinned OpenRCT2 core can initialize without
commercial game assets and advance an independently created empty park across
one accounting month. It does not implement a reusable browser API or establish
ride, guest, climate, rendering, save or original RCT2 parity.

Run builds and tests on the designated Linux build host, not Patrick's Mac.
Check out OpenRCT2 at `11513222890717e81431c83a28aafb7555f2ccd2` and
nlohmann/json at `9cca280a4d0ccf0c08f47a99aa71d1b0e52f8d03` (v3.11.3).
Use CMake 3.24 or newer, Ninja, a C++20 compiler, Python 3, pkg-config,
libpng, libzip, zlib, zstd and ICU development packages. The macOS configuration
also retains FreeType because the pinned macOS font implementation does not
compile with `DISABLE_TTF=ON`.

```sh
python3 experiments/native-headless/run.py \
  --core /path/to/OpenRCT2 \
  --json-source /path/to/nlohmann-json \
  --scratch /path/to/fresh-scratch
```

CMake's project include hook adds the harness without modifying upstream source.
The runner disables asset downloads and optional services, builds the original
CLI and harness, and stages only the upstream English language file. All seven
platform base directories are isolated. Two fresh processes each create a
closed, money-enabled 5×5 park with no loaded objects, rides, guest spawns or
entities, fixed PRNG seeds and research funding disabled. The backing map still
contains 1,002,001 surface elements; this is not a compact map extraction.

Checkpoint output covers tick/date counters, cash/loan, guest count, tile element
count and scenario PRNG state at each accounting week. Money integers use £0.10
units, as defined by upstream `core/Money.hpp`. After 16,384 updates the expected
cash is £9,878.00 and the loan remains £10,000.00. Equal selected fields across
processes do not constitute a full-state determinism proof.

Logs, configuration and checkpoints are written under `--scratch`. Existing
runtime directories are rejected to prevent profile or cache reuse. Preserve
the source pins, compiler and dependency versions, exit codes and logs alongside
any reported result. This branch is throwaway; keep experimental code off main.
