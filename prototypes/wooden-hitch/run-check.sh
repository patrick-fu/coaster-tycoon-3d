#!/usr/bin/env bash
set -u
set -o pipefail
task_root=$(cd -- "$(dirname -- "$0")" && pwd)
if [[ $# -ne 3 || ! $1 =~ ^[0-9a-f]{64}$ || ! $2 =~ ^[0-9a-f]{64}$ || ! $3 =~ ^[0-9a-f]{64}$ ]]; then
  printf '%s\n' 'Usage: bash run-check.sh CAR_SHA LINK_SHA METADATA_SHA' >&2
  exit 2
fi
run_dir="$task_root/checks/$(date -u +%Y%m%dT%H%M%SZ)-${1:0:12}-$$"
mkdir -p -- "$run_dir"
cp -- "$task_root/check-joint.mjs" "$run_dir/check-joint.executed.mjs"
cp -- "$task_root/VALIDATION-CONTRACT.md" "$run_dir/VALIDATION-CONTRACT.executed.md"
cp -- "$task_root/run-check.sh" "$run_dir/run-check.executed.sh"
cp -- "$task_root/outputs/wooden-car-joint.glb" "$run_dir/input-car.glb"
cp -- "$task_root/outputs/wooden-drawbar.glb" "$run_dir/input-link.glb"
cp -- "$task_root/outputs/hitch-metadata.json" "$run_dir/input-metadata.json"
sha256sum -- "$run_dir/input-car.glb" "$run_dir/input-link.glb" "$run_dir/input-metadata.json" > "$run_dir/input-sha256.txt"
printf '%s\n' "node $task_root/check-joint.mjs $1 $2 $3" > "$run_dir/command.txt"
export JOINT_CHECK_OUTPUT="$run_dir/results.json"
node "$task_root/check-joint.mjs" "$1" "$2" "$3" > "$run_dir/stdout.jsonl" 2> "$run_dir/stderr.log"
check_exit=$?
printf '%s\n' "$check_exit" > "$run_dir/exit.txt"
sha256sum -- "$run_dir/check-joint.executed.mjs" "$run_dir/run-check.executed.sh" "$run_dir/VALIDATION-CONTRACT.executed.md" "$run_dir/input-car.glb" "$run_dir/input-link.glb" "$run_dir/input-metadata.json" "$run_dir/input-sha256.txt" "$run_dir/command.txt" "$run_dir/stdout.jsonl" "$run_dir/stderr.log" "$run_dir/exit.txt" "$run_dir/results.json" > "$run_dir/sha256.txt"
cat -- "$run_dir/stdout.jsonl"
cat -- "$run_dir/stderr.log" >&2
printf 'retained_run_directory=%s\n' "$run_dir"
printf 'retained_exit=%s\n' "$check_exit"
exit "$check_exit"
