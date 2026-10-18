import { woodenPieces, woodenProfileRecord } from './wooden-coaster.js';
import { woodenFootprints } from './wooden-footprints.js';
function slope(price, z, entry, end, chain, height) {
    return { price, station: false, entry: { pitch: entry, bank: 0 }, end: { x: 32, y: 0, z, turn: 0, pitch: end, bank: 0 }, cells: [{ x: 0, y: 0, low: Math.min(0, z), high: Math.max(0, z) + 24, mask: 15 }], motion: { chain, brake: null, samples: Array.from({ length: 17 }, (_, i) => ({ x: 2 * i, y: 0, z: height(i / 16) })) } };
}
export const woodenRiseReturnPieces = {
    ...structuredClone(woodenPieces),
    'lift-start': slope(90, 8, 0, 1, true, t => 8 * t * t),
    lift: slope(70, 16, 1, 1, true, t => 16 * t),
    'lift-end': slope(90, 8, 1, 0, true, t => 8 * (2 * t - t * t)),
    'drop-start': slope(90, -8, 0, -1, false, t => -8 * t * t),
    drop: slope(70, -16, -1, -1, false, t => -16 * t),
    'drop-end': slope(90, -8, -1, 0, false, t => -8 * (2 * t - t * t)),
};
export function woodenRiseReturnProfileRecord() {
    const profile = woodenProfileRecord(woodenFootprints);
    profile.vehicle.kind = 'coupled-unbanked';
    profile.pieces = structuredClone(woodenRiseReturnPieces);
    for (const [key, piece] of Object.entries(woodenRiseReturnPieces)) {
        if (Object.hasOwn(woodenFootprints, key))
            continue;
        profile.footprints[key] = woodenFootprints.flat.map(cells => cells.map(c => ({ ...c, low: Math.min(0, piece.end.z), high: Math.max(0, piece.end.z) + 24 })));
    }
    return profile;
}
export function withWoodenRiseReturnProfile(common) {
    return { ...common, rideProfiles: { ...common.rideProfiles, 'independent.wooden-rise-return-v2': woodenRiseReturnProfileRecord() } };
}
