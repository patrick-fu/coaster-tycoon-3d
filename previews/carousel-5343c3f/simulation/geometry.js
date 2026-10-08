import { validateHousekeepingRules } from './housekeeping.js';
import { validateServiceRules } from './services.js';
import { ensure, integer, record } from './validation.js';
import { validateFixedProfiles } from './carousel.js';
import { defaultScenery, sceneryTypes } from './scenery.js';
export function validateRules(input) {
    record(input, [...(Object.hasOwn(input ?? {}, 'scenery') ? ['scenery'] : []), 'housekeeping', 'services', 'guests', 'motion', 'id', 'evidence', 'pathPrice', 'portalPrice', 'terrainPrice', 'refundPerThousand', 'maxSupport', 'maxHeight', 'pieces', ...(Object.hasOwn(input ?? {}, 'rideProfiles') ? ['rideProfiles'] : []), ...(Object.hasOwn(input ?? {}, 'fixedProfiles') ? ['fixedProfiles'] : [])]);
    const scenery = structuredClone(Object.hasOwn(input, 'scenery') ? input.scenery : defaultScenery);
    record(scenery, [...sceneryTypes]);
    for (const type of sceneryTypes) {
        const rule = scenery[type];
        record(rule, ['price', 'height']);
        ensure(integer(rule.price, 0, 1000000) && integer(rule.height, 8, 256) && rule.height % 8 === 0, 'INVALID_COMMAND', 'Invalid scenery rule.');
    }
    const housekeeping = validateHousekeepingRules(input.housekeeping), services = validateServiceRules(input.services), motion = validateMotionRules(input.motion), guests = validateGuestRules(input.guests);
    ensure(typeof input.id === 'string' && input.id.length > 0 && input.id.length <= 80 && ['project-candidate', 'reference-verified'].includes(input.evidence), 'INVALID_COMMAND', 'Invalid rule identity.');
    for (const v of [input.pathPrice, input.portalPrice, input.terrainPrice, input.maxSupport, input.maxHeight])
        ensure(integer(v, 0, 1000000), 'INVALID_COMMAND', 'Invalid rule value.');
    ensure(integer(input.refundPerThousand, 0, 1000) && input.maxHeight >= 16 && input.maxHeight % 8 === 0, 'INVALID_COMMAND', 'Invalid refund or height rule.');
    ensure(input.pieces !== null && typeof input.pieces === 'object' && !Array.isArray(input.pieces), 'INVALID_COMMAND', 'Invalid piece catalogue.');
    const keys = Object.keys(input.pieces);
    ensure(keys.length > 0 && keys.length <= 128, 'INVALID_COMMAND', 'Invalid piece catalogue.');
    record(input.pieces, keys);
    let stations = 0;
    for (const key of keys) {
        ensure(/^[a-z][a-z0-9-]{0,39}$/.test(key), 'INVALID_COMMAND', 'Invalid piece identifier.');
        const p = input.pieces[key];
        record(p, ['price', 'station', 'end', 'entry', 'cells', 'motion']);
        record(p.end, ['x', 'y', 'z', 'turn', 'pitch', 'bank']);
        record(p.entry, ['pitch', 'bank']);
        ensure(integer(p.price, 0, 1000000) && typeof p.station === 'boolean', 'INVALID_COMMAND', 'Invalid piece price or role.');
        record(p.motion, ['samples', 'chain', 'brake']);
        ensure(typeof p.motion.chain === 'boolean' && (p.motion.brake === null || integer(p.motion.brake, 1, 100000)) && Array.isArray(p.motion.samples) && p.motion.samples.length >= 2 && p.motion.samples.length <= 128, 'INVALID_COMMAND', 'Invalid motion descriptor.');
        for (let i = 0; i < p.motion.samples.length; i++) {
            const point = p.motion.samples[i];
            record(point, ['x', 'y', 'z']);
            for (const v of [point.x, point.y, point.z])
                ensure(typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1024, 'INVALID_COMMAND', 'Invalid motion sample.');
            if (i) {
                const previous = p.motion.samples[i - 1];
                ensure(point.x !== previous.x || point.y !== previous.y || point.z !== previous.z, 'INVALID_COMMAND', 'Duplicate motion sample.');
            }
        }
        const start = p.motion.samples[0], finish = p.motion.samples.at(-1);
        ensure(start.x === 0 && start.y === 0 && start.z === 0 && finish.x === p.end.x && finish.y === p.end.y && finish.z === p.end.z, 'INVALID_COMMAND', 'Motion samples must join piece connectors.');
        if (p.station)
            stations++;
        for (const a of [p.entry.pitch, p.entry.bank, p.end.pitch, p.end.bank])
            ensure(integer(a, -1, 1), 'INVALID_COMMAND', 'Invalid connector attitude.');
        ensure(integer(p.end.turn, -3, 3) && integer(p.end.x, -1024, 1024) && p.end.x % 32 === 0 && integer(p.end.y, -1024, 1024) && p.end.y % 32 === 0 && integer(p.end.z, -1024, 1024) && p.end.z % 8 === 0, 'INVALID_COMMAND', 'Invalid endpoint.');
        ensure(p.end.x !== 0 || p.end.y !== 0 || p.end.z !== 0, 'INVALID_COMMAND', 'A piece must advance its endpoint.');
        ensure(Array.isArray(p.cells) && p.cells.length > 0 && p.cells.length <= 64, 'INVALID_COMMAND', 'Invalid clearance footprint.');
        const occupied = new Set();
        for (const c of p.cells) {
            record(c, ['x', 'y', 'low', 'high', 'mask']);
            ensure(integer(c.x, -1024, 1024) && c.x % 32 === 0 && integer(c.y, -1024, 1024) && c.y % 32 === 0 && integer(c.low, -1024, 1024) && integer(c.high, -1024, 2048) && c.low % 8 === 0 && c.high % 8 === 0 && c.high > c.low && integer(c.mask, 1, 15), 'INVALID_COMMAND', 'Invalid clearance cell.');
            const k = `${c.x},${c.y}`;
            ensure(!occupied.has(k), 'INVALID_COMMAND', 'Duplicate footprint cell.');
            occupied.add(k);
        }
    }
    ensure(stations > 0, 'INVALID_COMMAND', 'A station definition is required.');
    const common = { scenery, housekeeping, services, guests, motion, id: input.id, evidence: input.evidence, pathPrice: input.pathPrice, portalPrice: input.portalPrice, terrainPrice: input.terrainPrice, refundPerThousand: input.refundPerThousand, maxSupport: input.maxSupport, maxHeight: input.maxHeight, pieces: Object.fromEntries(keys.sort().map(k => { const p = input.pieces[k]; return [k, { price: p.price, station: p.station, motion: { samples: p.motion.samples.map(q => ({ x: q.x, y: q.y, z: q.z })), chain: p.motion.chain, brake: p.motion.brake }, end: { x: p.end.x, y: p.end.y, z: p.end.z, turn: p.end.turn, pitch: p.end.pitch, bank: p.end.bank }, entry: { pitch: p.entry.pitch, bank: p.entry.bank }, cells: p.cells.map(c => ({ x: c.x, y: c.y, low: c.low, high: c.high, mask: c.mask })) }]; })) };
    const supplied = Object.hasOwn(input, 'rideProfiles') ? input.rideProfiles : {};
    ensure(supplied !== null && typeof supplied === 'object' && !Array.isArray(supplied), 'INVALID_COMMAND', 'Invalid ride profiles.');
    const profileIds = Object.keys(supplied);
    record(supplied, profileIds);
    ensure(profileIds.length <= 1 && profileIds.every(id => id === 'independent.wooden-circuit-v1'), 'UNSUPPORTED_CONTENT', 'Unavailable ride profile.');
    const rideProfiles = {};
    for (const id of profileIds) {
        const value = supplied[id];
        record(value, ['motion', 'pieces', 'vehicle', 'footprints']);
        const selected = validateRules({ ...common, motion: value.motion, pieces: value.pieces });
        ensure(selected.motion.tileMetres === 4 && selected.motion.tickHz === 40 && motion.tileMetres === 4 && motion.tickHz === 40 && selected.motion.carLength === 2880 && selected.motion.seatsPerCar === 4 && selected.motion.maxCars <= 2, 'INVALID_COMMAND', 'The wooden vehicle requires its qualified world, nominal pitch and seat capacity.');
        const vehicle = value.vehicle;
        record(vehicle, ['kind', 'originMm', 'wheelbaseMm', 'bogiePivotHeightMm', 'couplerHalfSpanMm', 'couplerHeightMm', 'drawbarLengthMm', 'railHalfGaugeMm', 'stationDeckMm']);
        record(vehicle.originMm, ['x', 'y', 'z']);
        ensure(vehicle.kind === 'coupled-flat' && vehicle.originMm.x === 2000 && vehicle.originMm.y === 2000 && vehicle.originMm.z === 500 && vehicle.wheelbaseMm === 1500 && vehicle.bogiePivotHeightMm === 170 && vehicle.couplerHalfSpanMm === 1340 && vehicle.couplerHeightMm === 220 && vehicle.drawbarLengthMm === 200 && vehicle.railHalfGaugeMm === 480 && vehicle.stationDeckMm === 820, 'INVALID_COMMAND', 'Wooden pose datums differ from the delivered assets.');
        record(selected.pieces, ['flat', 'left', 'right', 'station']);
        record(value.footprints, ['flat', 'left', 'right', 'station']);
        for (const [key, piece] of Object.entries(selected.pieces)) {
            const curved = key === 'left' || key === 'right', sign = key === 'left' ? -1 : 1, count = curved ? 64 : 16;
            ensure(piece.station === (key === 'station') && piece.entry.pitch === 0 && piece.entry.bank === 0 && piece.end.pitch === 0 && piece.end.bank === 0 && piece.end.x === (curved ? 128 : 32) && piece.end.y === (curved ? sign * 128 : 0) && piece.end.z === 0 && piece.end.turn === (curved ? sign : 0) && !piece.motion.chain && piece.motion.brake === null && piece.motion.samples.length === count + 1, 'GEOMETRY', 'Unsupported wooden track geometry.');
            for (let i = 0; i <= count; i++) {
                const point = piece.motion.samples[i], angle = i * Math.PI / (2 * count), x = curved ? (i === count ? 128 : 128 * Math.sin(angle)) : 32 * i / count, y = curved ? (i === count ? sign * 128 : sign * 128 * (1 - Math.cos(angle))) : 0;
                ensure(Math.abs(point.x - x) <= 1e-9 && Math.abs(point.y - y) <= 1e-9 && point.z === 0, 'GEOMETRY', 'Wooden track samples differ from the finite qualified geometry.');
            }
            const directions = value.footprints[key];
            ensure(Array.isArray(directions) && directions.length === 4, 'INVALID_COMMAND', 'Four explicit wooden footprints are required.');
            for (const cells of directions) {
                ensure(Array.isArray(cells) && cells.length > 0 && cells.length <= 64, 'INVALID_COMMAND', 'Invalid wooden clearance footprint.');
                const seen = new Set();
                for (const cell of cells) {
                    record(cell, ['x', 'y', 'low', 'high', 'mask']);
                    ensure(integer(cell.x, -1024, 1024) && cell.x % 32 === 0 && integer(cell.y, -1024, 1024) && cell.y % 32 === 0 && integer(cell.low, -1024, 1024) && integer(cell.high, -1024, 2048) && cell.low % 8 === 0 && cell.high % 8 === 0 && cell.high > cell.low && integer(cell.mask, 1, 15), 'INVALID_COMMAND', 'Invalid wooden clearance cell.');
                    const key = `${cell.x},${cell.y},${cell.low},${cell.high},${cell.mask}`;
                    ensure(!seen.has(key), 'INVALID_COMMAND', 'Duplicate wooden clearance cell.');
                    seen.add(key);
                }
            }
        }
        const footprints = Object.fromEntries(['flat', 'left', 'right', 'station'].map(key => [key, value.footprints[key].map(cells => cells.map(c => ({ x: c.x, y: c.y, low: c.low, high: c.high, mask: c.mask })).sort((a, b) => a.x - b.x || a.y - b.y || a.low - b.low || a.high - b.high || a.mask - b.mask))]));
        rideProfiles[id] = { motion: selected.motion, pieces: selected.pieces, vehicle: { kind: 'coupled-flat', originMm: { x: vehicle.originMm.x, y: vehicle.originMm.y, z: vehicle.originMm.z }, wheelbaseMm: vehicle.wheelbaseMm, bogiePivotHeightMm: vehicle.bogiePivotHeightMm, couplerHalfSpanMm: vehicle.couplerHalfSpanMm, couplerHeightMm: vehicle.couplerHeightMm, drawbarLengthMm: vehicle.drawbarLengthMm, railHalfGaugeMm: vehicle.railHalfGaugeMm, stationDeckMm: vehicle.stationDeckMm }, footprints };
    }
    return { ...common, rideProfiles, fixedProfiles: validateFixedProfiles(input.fixedProfiles, common) };
}
export function turn(x, y, d) { const vectors = [[1, 0], [0, 1], [-1, 0], [0, -1]]; const [dx, dy] = vectors[d]; return { x: x * dx - y * dy, y: x * dy + y * dx }; }
export function endpoint(a, p) { const b = turn(p.end.x, p.end.y, a.direction); return { x: a.x + b.x, y: a.y + b.y, z: a.z + p.end.z, direction: ((a.direction + p.end.turn + 4) % 4), pitch: p.end.pitch, bank: p.end.bank }; }
export function footprint(a, p) { return p.cells.map(c => { const q = turn(c.x, c.y, a.direction); let mask = 0; for (let i = 0; i < 4; i++)
    if (c.mask & (1 << i))
        mask |= 1 << ((i + a.direction) % 4); return { x: (a.x + q.x) / 32, y: (a.y + q.y) / 32, low: a.z + c.low, high: a.z + c.high, mask }; }); }
export function same(a, b) { return a.x === b.x && a.y === b.y && a.z === b.z && a.direction === b.direction && a.pitch === b.pitch && a.bank === b.bank; }
export function validateMotionRules(input) {
    const keys = ['tickHz', 'tileMetres', 'gravity', 'rolling', 'drag', 'stationSpeed', 'chainSpeed', 'brakeDeceleration', 'carLength', 'seatsPerCar', 'maxCars', 'waitTicks', 'unloadTicks', 'bankDegrees'];
    record(input, [...keys]);
    for (const key of ['tickHz', 'tileMetres', 'gravity', 'stationSpeed', 'chainSpeed', 'brakeDeceleration', 'carLength', 'seatsPerCar', 'maxCars', 'waitTicks', 'unloadTicks'])
        ensure(integer(input[key], 1, 100000), 'INVALID_COMMAND', 'Invalid train rule.');
    ensure(input.tickHz <= 1000 && input.tileMetres <= 100 && input.maxCars <= 32 && input.seatsPerCar <= 32 && integer(input.rolling, 0, 1000) && integer(input.drag, 0, 1000000) && integer(input.bankDegrees, 0, 90), 'INVALID_COMMAND', 'Invalid motion bounds.');
    return Object.fromEntries(keys.map(key => [key, input[key]]));
}
function validateGuestRules(input) {
    const keys = ['spawnTicks', 'walkTicks', 'decisionTicks', 'needTicks', 'queueSlotsPerTile', 'patienceTicks', 'rideCooldownTicks', 'defaultRidePrice', 'maxRidePrice', 'cashMin', 'cashMax', 'fareMin', 'fareMax', 'forceMin', 'forceMax', 'initialHunger', 'initialThirst', 'initialHappiness', 'initialEnergy', 'needGrowth', 'rideHappiness', 'rideNausea'];
    record(input, [...keys]);
    for (const key of keys)
        ensure(integer(input[key], 0, 1000000), 'INVALID_COMMAND', 'Invalid guest rule.');
    for (const key of ['spawnTicks', 'walkTicks', 'decisionTicks', 'needTicks', 'queueSlotsPerTile', 'patienceTicks', 'rideCooldownTicks'])
        ensure(input[key] > 0, 'INVALID_COMMAND', 'Invalid guest cadence or capacity.');
    ensure(input.cashMin <= input.cashMax && input.fareMin <= input.fareMax && input.forceMin <= input.forceMax && input.defaultRidePrice <= input.maxRidePrice && input.fareMax <= input.maxRidePrice && input.queueSlotsPerTile <= 64, 'INVALID_COMMAND', 'Invalid guest profile range.');
    for (const key of ['initialHunger', 'initialThirst', 'initialHappiness', 'initialEnergy', 'needGrowth', 'rideHappiness', 'rideNausea'])
        ensure(input[key] <= 1000, 'INVALID_COMMAND', 'Invalid guest need range.');
    return Object.fromEntries(keys.map(key => [key, input[key]]));
}
