import { Engine } from '../simulation/engine.js';
const samples = (end, slope) => Array.from({ length: 17 }, (_, i) => ({ x: end * i / 16, y: 0, z: slope(i / 16) }));
const piece = (price, z = 0, pitchIn = 0, pitchOut = 0) => ({ price, station: false, entry: { pitch: pitchIn, bank: 0 }, end: { x: 32, y: 0, z, turn: 0, pitch: pitchOut, bank: 0 }, cells: [{ x: 0, y: 0, low: Math.min(0, z), high: Math.max(16, z + 16), mask: 15 }], motion: { samples: samples(32, t => z * t), chain: false, brake: null } });
const flat = piece(61);
function curve(sign) {
    const radius = 64;
    return { ...flat, price: 160, end: { x: radius, y: sign * radius, z: 0, turn: sign, pitch: 0, bank: 0 }, cells: sign === 1 ? [{ x: 0, y: 0, low: 0, high: 16, mask: 15 }, { x: 32, y: 0, low: 0, high: 16, mask: 15 }, { x: 32, y: 32, low: 0, high: 16, mask: 15 }] : [{ x: 0, y: -32, low: 0, high: 16, mask: 15 }, { x: 32, y: -32, low: 0, high: 16, mask: 15 }, { x: 32, y: -64, low: 0, high: 16, mask: 15 }], motion: { samples: Array.from({ length: 33 }, (_, i) => i === 0 ? { x: 0, y: 0, z: 0 } : i === 32 ? { x: radius, y: sign * radius, z: 0 } : { x: radius * Math.sin(i * Math.PI / 64), y: sign * radius * (1 - Math.cos(i * Math.PI / 64)), z: 0 }), chain: false, brake: null } };
}
export const steelRules = {
    id: 'independent-steel-candidate-v1', evidence: 'project-candidate', pathPrice: 12, portalPrice: 50, terrainPrice: 15, refundPerThousand: 500, maxSupport: 128, maxHeight: 256,
    housekeeping: { buildPrice: 15, binCapacity: 8, restTicks: 160, restEnergy: 500, restNausea: 400, energyThreshold: 250, nauseaThreshold: 500, wrapperTicks: 1200, cleanupTicks: 120 },
    services: { buildPrice: 200, defaultPrice: 10, maxPrice: 1000, foodStock: 3, drinkStock: 2, needThreshold: 500, relief: 700, initialBladder: 80, serviceTicks: 80, weekTicks: 4096, upkeepWeeks: 2, mechanicMonthlyWage: 800, handymanMonthlyWage: 600, rideUpkeep: 200, facilityUpkeep: 100, interestPer10000: 100, staffWalkTicks: 12, repairTicks: 200, inspectionTicks: 160, inspectionInterval: 16384 },
    guests: { spawnTicks: 80, walkTicks: 12, decisionTicks: 64, needTicks: 256, queueSlotsPerTile: 2, patienceTicks: 4096, rideCooldownTicks: 1200, defaultRidePrice: 20, maxRidePrice: 1000, cashMin: 100, cashMax: 300, fareMin: 30, fareMax: 100, forceMin: 2000, forceMax: 8000, initialHunger: 300, initialThirst: 400, initialHappiness: 800, initialEnergy: 800, needGrowth: 8, rideHappiness: 40, rideNausea: 100 },
    motion: { tickHz: 40, tileMetres: 4, gravity: 9810, rolling: 0, drag: 0, stationSpeed: 200, chainSpeed: 120, brakeDeceleration: 8, carLength: 2000, seatsPerCar: 2, maxCars: 8, waitTicks: 160, unloadTicks: 80, bankDegrees: 30 },
    pieces: { station: { ...flat, price: 101, station: true }, flat, right: curve(1), left: curve(-1), brake: { ...flat, price: 90, motion: { ...flat.motion, brake: 160 } }, 'lift-start': { ...piece(90, 8, 0, 1), motion: { samples: samples(32, t => 8 * t * t), chain: true, brake: null } }, lift: { ...piece(70, 16, 1, 1), motion: { samples: samples(32, t => 16 * t), chain: true, brake: null } }, 'lift-end': { ...piece(90, 8, 1, 0), motion: { samples: samples(32, t => 8 * (2 * t - t * t)), chain: true, brake: null } }, 'drop-start': { ...piece(90, -8, 0, -1), motion: { samples: samples(32, t => -8 * t * t), chain: false, brake: null } }, drop: piece(70, -16, -1, -1), 'drop-end': { ...piece(90, -8, -1, 0), motion: { samples: samples(32, t => -8 * (2 * t - t * t)), chain: false, brake: null } }, 'bank-start': { ...flat, price: 70, end: { ...flat.end, bank: 1 } }, banked: { ...flat, entry: { pitch: 0, bank: 1 }, end: { ...flat.end, bank: 1 } }, 'bank-end': { ...flat, price: 70, entry: { pitch: 0, bank: 1 } } }
};
export const initialWorld = { side: 48, cash: 500000, maxLoan: 200000, seed: 20261007, land: Array.from({ length: 46 * 46 }, (_, i) => ({ tile: { x: 1 + i % 46, y: 1 + Math.floor(i / 46) }, height: 32, water: 0, owned: true })) };
export function newPark() {
    const engine = new Engine(initialWorld, steelRules);
    const apply = (c) => { const q = engine.quote(c); if (!q.ok)
        throw new Error(q.error.message); const r = engine.execute(c, q.value.revision); if (!r.ok)
        throw new Error(r.error.message); return r.value.id; };
    const ride = apply({ type: 'create-ride', name: 'Copper Loop', tile: { x: 18, y: 18 }, height: 32, direction: 0 });
    const stations = [];
    for (const name of ['station', 'station', 'station', 'lift-start', 'lift', 'lift-end', 'right', 'flat', 'flat', 'flat', 'right', 'drop-start', 'drop', 'drop-end', 'flat', 'flat', 'flat', 'right', 'flat', 'flat', 'flat', 'right']) {
        const id = apply({ type: 'append-track', ride, piece: name });
        if (name === 'station')
            stations.push(id);
    }
    for (const [station, role, x] of [[stations[0], 'entrance', 18], [stations[1], 'exit', 19]])
        apply({ type: 'place-portal', ride, station, role, tile: { x, y: 17 }, height: 32, direction: 1 });
    apply({ type: 'set-train-cars', ride, cars: 4 });
    const publicPaths = new Map();
    for (let y = 10; y <= 16; y++)
        publicPaths.set(`20,${y}`, apply({ type: 'place-path', tile: { x: 20, y }, height: 32, queueFor: null }));
    publicPaths.set('19,16', apply({ type: 'place-path', tile: { x: 19, y: 16 }, height: 32, queueFor: null }));
    for (const [x, y] of [[19, 14], [18, 14], [17, 14], [17, 15], [17, 16], [18, 16]])
        apply({ type: 'place-path', tile: { x: x, y: y }, height: 32, queueFor: ride });
    for (const [kind, y, name] of [['food', 12, 'Hot food'], ['drink', 14, 'Cold drinks'], ['restroom', 16, 'Restrooms']]) {
        const id = apply({ type: 'place-facility', name, kind, tile: { x: 21, y }, height: 32, direction: 2 });
        apply({ type: 'set-facility-open', facility: id, open: true });
    }
    apply({ type: 'place-amenity', kind: 'bench', path: publicPaths.get('20,11') });
    apply({ type: 'place-amenity', kind: 'bin', path: publicPaths.get('20,15') });
    apply({ type: 'set-park-entrance', point: { x: 20, y: 10, z: 32 } });
    for (const role of ['mechanic', 'handyman'])
        apply({ type: 'hire-staff', role, point: { x: 20, y: 16, z: 32 } });
    apply({ type: 'set-ride-status', ride, status: 'testing' });
    const warm = engine.advance(2400);
    if (!warm.ok)
        throw new Error(warm.error.message);
    apply({ type: 'set-ride-status', ride, status: 'open' });
    apply({ type: 'set-park-open', open: true });
    return engine;
}
