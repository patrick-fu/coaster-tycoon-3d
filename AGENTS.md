# Project instructions

## Language

Use English for all project artifacts, including README files, documentation,
issues and issue comments, pull requests, commit messages, code comments, and
agent instruction files. Continue communicating with Patrick in Chinese.

## Patrick's execution environment

Do not run builds or tests on Patrick's Mac. Execute compilation, test suites,
simulation experiments, and runtime validation on the designated Grok Bot Linux
build host over SSH. Use the Mac for editing, documentation, and remote
orchestration. Keep local project workspaces and retained experiment artifacts
on the external storage volume, and keep generated build output on the remote
host. Do not silently fall back to local execution when the remote host is
unavailable.

## Agent skills

Before adding simulation code, dependencies or game resources, read
`docs/adr/0001-independent-mit-implementation.md` for the independent MIT source
strategy and provenance requirements.

### Issue tracker

Track issues, specifications, and Wayfinder maps in this repository's GitHub Issues. Before tracker operations, read `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage labels. Before triage, read `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context layout: root `CONTEXT.md` and `docs/adr/`. Before domain exploration or documentation changes, read `docs/agents/domain.md`.
