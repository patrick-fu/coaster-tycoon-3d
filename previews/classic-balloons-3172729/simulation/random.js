export function random(state, min, max) { state.rng = (state.rng * 1664525 + 1013904223) >>> 0; return min + state.rng % (max - min + 1); }
