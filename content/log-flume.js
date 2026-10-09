import { ensure } from '../simulation/validation.js';
export const flumeProfileId = 'independent.log-flume-v1';
export const flumePieceIds = ['station', 'channel', 'splash', 'left', 'right', 'lift-start', 'lift', 'lift-end', 'drop-start', 'drop', 'drop-end'];
export const flumeCandidate = { tickHz: 40, tileMetres: 4, innerWidthMm: 2000, outerWidthMm: 2400, stationWidthMm: 4400, floorMm: 100, waterMm: 600, wallMm: 1000, platformMm: 850, envelopeUnits: 24, maxSupport: 48, hullHalfLengthMm: 1900,
    channelSpeed: 50, liftSpeed: 25, acceleration: 1, channelBrake: 1, liftBrake: 4, splashBrake: 4, maxSpeed: 300, gravity: 9810,
    boardTicks: 8, minLoadTicks: 80, maxLoadTicks: 240, unloadTicks: 40, defaultPrice: 20, maxPrice: 100, portalPrice: 50, portalHeight: 24, upkeep: 150, inspectionInterval: 16384, inspectionTicks: 160, repairTicks: 200, happiness: 40, nausea: 20,
    seats: [{ x: 0, y: 600, z: 1050 }, { x: 0, y: 600, z: 350 }, { x: 0, y: 600, z: -350 }, { x: 0, y: 600, z: -1050 }],
};
export function withFlumeProfile(rules) { return { ...rules, channelProfiles: { ...rules.channelProfiles, [flumeProfileId]: { vehicle: structuredClone(flumeCandidate), pieces: structuredClone(flumePieces) } } }; }
export function flumeLocalFrame(piece, t) {
    ensure(flumePieceIds.includes(piece) && Number.isFinite(t) && t >= 0 && t <= 1, 'GEOMETRY', 'Invalid channel frame sample.');
    let point = { x: 32 * t, y: 0, z: 0 }, delta = { x: 32, y: 0, z: 0 };
    if (piece === 'left' || piece === 'right') {
        const sign = piece === 'left' ? -1 : 1, angle = t * Math.PI / 2;
        point = { x: t === 1 ? 64 : 64 * Math.sin(angle), y: sign * (t === 1 ? 64 : 64 * (1 - Math.cos(angle))), z: 0 };
        delta = { x: t === 1 ? 0 : Math.cos(angle), y: sign * Math.sin(angle), z: 0 };
    }
    else if (piece.startsWith('lift') || piece.startsWith('drop')) {
        const sign = piece.startsWith('lift') ? 1 : -1;
        if (piece.endsWith('start')) {
            point.z = sign * 8 * t * t;
            delta.z = sign * 16 * t;
        }
        else if (piece.endsWith('end')) {
            point.z = sign * 8 * (2 * t - t * t);
            delta.z = sign * 16 * (1 - t);
        }
        else {
            point.z = sign * 16 * t;
            delta.z = sign * 16;
        }
    }
    const length = Math.hypot(delta.x, delta.y, delta.z), direction = { x: delta.x / length, y: delta.y / length, z: delta.z / length }, horizontal = Math.hypot(direction.x, direction.y);
    return { point, direction, up: { x: -direction.x * direction.z / horizontal, y: -direction.y * direction.z / horizontal, z: horizontal } };
}
export const flumePieces = {};
for (const id of flumePieceIds) {
    const curve = id === 'left' || id === 'right', lift = id.startsWith('lift'), drop = id.startsWith('drop'), count = curve ? 64 : 16;
    const pitchIn = (lift || drop) && !id.endsWith('start') ? (lift ? 1 : -1) : 0, pitchOut = (lift || drop) && !id.endsWith('end') ? (lift ? 1 : -1) : 0;
    const finish = flumeLocalFrame(id, 1).point;
    const price = id === 'station' ? 300 : id === 'splash' ? 180 : curve ? 250 : id === 'lift' ? 150 : id === 'lift-start' || id === 'lift-end' ? 200 : id === 'drop' ? 140 : drop ? 180 : 100;
    flumePieces[id] = { price, station: id === 'station', entry: { pitch: pitchIn, bank: 0 }, end: { ...finish, turn: id === 'left' ? -1 : id === 'right' ? 1 : 0, pitch: pitchOut, bank: 0 }, cells: [{ x: 0, y: 0, low: Math.min(0, finish.z), high: Math.max(0, finish.z) + 24, mask: 15 }], motion: { chain: lift, brake: id === 'splash' ? 50 : null, samples: Array.from({ length: count + 1 }, (_, i) => flumeLocalFrame(id, i / count).point) } };
}
for (const seat of flumeCandidate.seats)
    Object.freeze(seat);
Object.freeze(flumeCandidate.seats);
Object.freeze(flumeCandidate);
Object.freeze(flumePieceIds);
for (const piece of Object.values(flumePieces)) {
    Object.freeze(piece.entry);
    Object.freeze(piece.end);
    for (const cell of piece.cells)
        Object.freeze(cell);
    Object.freeze(piece.cells);
    for (const point of piece.motion.samples)
        Object.freeze(point);
    Object.freeze(piece.motion.samples);
    Object.freeze(piece.motion);
    Object.freeze(piece);
}
Object.freeze(flumePieces);
