import { Engine } from '../simulation/engine.js';
import { initialWorld } from './steel-coaster.js';
import { legacyRideContent, woodenRideContent, carouselRideContent, flumeRideContent, detailedFacilityContent } from './registry.js';
import { flumePortalSocket } from '../simulation/flume-portal.js';
import { carouselPortal } from '../simulation/carousel.js';
export function newClassicShowcase(rules) {
    const engine = new Engine(initialWorld, rules);
    const apply = (command) => {
        const quote = engine.quote(command);
        if (!quote.ok)
            throw new Error(quote.error.message);
        const receipt = engine.execute(command, quote.value.revision);
        if (!receipt.ok)
            throw new Error(receipt.error.message);
        return receipt.value.id;
    };
    const pathIds = new Map();
    const path = (x, y, queueFor = null) => {
        const key = `${x},${y}`;
        if (pathIds.has(key))
            throw new Error(`Duplicate authored path ${key}`);
        const id = apply({ type: 'place-path', tile: { x, y }, height: 32, queueFor });
        pathIds.set(key, id);
        return id;
    };
    const tracked = (name, x, y, content, pieces, cars, exitIndex) => {
        const ride = apply({ type: 'create-ride', name, tile: { x, y }, height: 32, direction: 0, content });
        const stations = [];
        for (const piece of pieces) {
            const id = apply({ type: 'append-track', ride, piece });
            if (piece === 'station')
                stations.push(id);
        }
        apply({ type: 'set-train-cars', ride, cars });
        apply({ type: 'place-portal', ride, station: stations[0], role: 'entrance', tile: { x, y: y - 1 }, height: 32, direction: 1 });
        apply({ type: 'place-portal', ride, station: stations[exitIndex], role: 'exit', tile: { x: x + exitIndex, y: y - 1 }, height: 32, direction: 1 });
        return ride;
    };
    const wood = tracked('Cedar Timber Run', 8, 19, woodenRideContent(), ['station', 'station', 'station', 'station', 'right', 'flat', 'flat', 'flat', 'flat', 'right', 'flat', 'flat', 'flat', 'flat', 'right', 'flat', 'flat', 'flat', 'flat', 'right'], 2, 3);
    const steel = tracked('Copper Loop', 26, 19, legacyRideContent(), ['station', 'station', 'station', 'lift-start', 'lift', 'lift-end', 'right', 'flat', 'flat', 'flat', 'right', 'drop-start', 'drop', 'drop-end', 'flat', 'flat', 'flat', 'right', 'flat', 'flat', 'flat', 'right'], 4, 2);
    // The lake is inside the loop; every channel support cell stays dry.
    for (let x = 9; x <= 12; x++)
        for (let y = 8; y <= 9; y++)
            apply({ type: 'set-terrain', tile: { x, y }, height: 16, water: 32 });
    const flume = apply({ type: 'create-ride', name: 'Timber Splash', tile: { x: 8, y: 12 }, height: 32, direction: 0, content: flumeRideContent() });
    for (const piece of ['station', 'station', 'lift-start', 'lift', 'lift-end', 'left', 'channel', 'channel', 'left', 'drop-start', 'drop', 'drop-end', 'splash', 'splash', 'left', 'channel', 'channel', 'left'])
        apply({ type: 'append-track', ride: flume, piece });
    for (const role of ['entrance', 'exit']) {
        const s = engine.snapshot(), r = s.rides.find(r => r.id === flume);
        if (!r || !r.track)
            throw new Error('Flume track was not created.');
        const socket = flumePortalSocket(r, new Map(s.elements.map(e => [e.id, e])), role);
        apply({ type: 'place-portal', ride: flume, role, ...socket });
    }
    const carousel = apply({ type: 'create-ride', name: 'Golden Carousel', tile: { x: 26, y: 7 }, height: 32, direction: 3, content: carouselRideContent() });
    const body = engine.snapshot().elements.find(e => e.kind === 'fixed-body' && e.ride === carousel);
    if (!body || body.kind !== 'fixed-body')
        throw new Error('Carousel body was not created.');
    for (const role of ['entrance', 'exit']) {
        const socket = carouselPortal(body, role);
        apply({ type: 'place-portal', ride: carousel, station: body.id, role, ...socket });
    }
    for (let y = 9; y <= 16; y++)
        path(21, y);
    for (let x = 5; x <= 30; x++)
        if (x !== 21)
            path(x, 15);
    path(8, 14, flume);
    path(9, 14);
    path(8, 16, wood);
    path(8, 17, wood);
    path(11, 16);
    path(11, 17);
    path(26, 16, steel);
    path(26, 17, steel);
    path(28, 16);
    path(28, 17);
    for (let y = 11; y <= 14; y++)
        path(26, y, carousel);
    for (let y = 11; y <= 14; y++)
        path(28, y);
    for (const [, kind, y, name, content] of [
        ['burger', 'food', 11, 'Burger', detailedFacilityContent('independent.burger')],
        ['drink', 'drink', 13, 'Soft drinks', detailedFacilityContent('independent.soft-drink')],
        ['restroom', 'restroom', 16, 'Restrooms', undefined],
    ]) {
        const command = { type: 'place-facility', name, kind, tile: { x: 22, y }, height: 32, direction: 2 };
        if (content)
            command.content = content;
        const facility = apply(command);
        apply({ type: 'set-facility-open', facility, open: true });
    }
    for (const [kind, x, y] of [['bench', 21, 10], ['bin', 21, 12], ['bin', 21, 14], ['bench', 19, 15], ['bin', 11, 15], ['bench', 28, 15]])
        apply({ type: 'place-amenity', kind, path: pathIds.get(`${x},${y}`) });
    const entry = { x: 21, y: 9, z: 32 };
    apply({ type: 'set-park-entrance', point: entry });
    for (const role of ['mechanic', 'handyman'])
        apply({ type: 'hire-staff', role, point: { x: 21, y: 15, z: 32 } });
    for (const [sceneryType, x, y] of [
        ['fountain', 19, 9], ['fountain', 23, 8], ['flower', 20, 10], ['lamp', 20, 12], ['flower', 23, 11], ['lamp', 23, 13],
        ['tree', 4, 7], ['tree', 4, 10], ['rock', 5, 5], ['tree', 17, 5], ['tree', 18, 7], ['flower', 17, 13],
        ['flower', 25, 11], ['flower', 29, 11], ['tree', 31, 7], ['tree', 32, 10],
        ['tree', 9, 24], ['tree', 11, 25], ['rock', 10, 26], ['hedge', 18, 21], ['flower', 18, 17], ['tree', 18, 29],
        ['tree', 35, 21], ['rock', 36, 24], ['tree', 31, 29], ['hedge', 23, 29],
    ])
        apply({ type: 'place-scenery', sceneryType, tile: { x, y }, height: 32 });
    for (const ride of [wood, steel, flume])
        apply({ type: 'set-ride-status', ride, status: 'testing' });
    const test = engine.advance(2400);
    if (!test.ok)
        throw new Error(`Qualification advance failed: ${JSON.stringify(test)}`);
    for (const ride of [wood, steel, flume, carousel])
        apply({ type: 'set-ride-status', ride, status: 'open' });
    apply({ type: 'set-park-open', open: true });
    const warm = engine.advance(2400);
    if (!warm.ok)
        throw new Error(`Arrival warm-up failed: ${JSON.stringify(warm)}`);
    return engine;
}
