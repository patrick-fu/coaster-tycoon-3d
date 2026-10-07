#!/usr/bin/env bash
set -u
cd /workspace/coaster-native-calibration || exit 2
node /workspace/coaster-native-calibration/measure.mjs \
  --assets /workspace/coaster-detailed-assets/outputs \
  --runtime /workspace/coaster-classic-game/app/node_modules/three/build/three.module.js \
  --output /workspace/coaster-native-calibration/measurements.json \
  > /workspace/coaster-native-calibration/run.stdout.jsonl \
  2> /workspace/coaster-native-calibration/run.stderr.log
calibration_exit=$?
printf '%s\n' "$calibration_exit" > /workspace/coaster-native-calibration/run.exit
cat /workspace/coaster-native-calibration/run.stdout.jsonl
cat /workspace/coaster-native-calibration/run.stderr.log >&2
exit "$calibration_exit"
