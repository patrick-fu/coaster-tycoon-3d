import { endpoint, same } from './geometry.js';
import { woodenProfile } from '../content/ride-profiles.js';
import { legacyRideContent } from '../content/registry.js';
const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
export function portalMountYaw(portal, station) {
    const normal = (station.origin.direction + (portal.role === 'entrance' ? 1 : 3)) % 4;
    return portal.direction === normal ? 0 : 2;
}
export function woodenTransition(portal, station) {
    const [fx, fy] = directions[station.origin.direction], normalX = -fy, normalY = fx, yaw = portalMountYaw(portal, station), sign = yaw === 0 ? 1 : -1;
    const lateral = portal.role === 'entrance' ? 1.9 : -1.9, axial = portal.role === 'entrance' ? -1.4 : 1.4;
    const centre = { x: station.origin.x / 8 + 2 + fx * 2, y: station.origin.y / 8 + 2 + fy * 2, z: station.origin.z / 8 };
    const gate = { x: centre.x + sign * (fx * axial + fy * lateral), y: centre.y + sign * (fy * axial - fx * lateral), z: centre.z + .82 };
    const [dx, dy] = directions[portal.direction], approach = { x: portal.tile.x - dx, y: portal.tile.y - dy, z: portal.height };
    const bottom = { x: gate.x - dx * (6 - 1.9), y: gate.y - dy * (6 - 1.9), z: centre.z };
    const landing = { x: gate.x - dx * 4.17, y: gate.y - dy * 4.17, z: centre.z + .14 }, across = { x: dy, y: -dx };
    const offset = (landing.x - (approach.x * 4 + 2)) * across.x + (landing.y - (approach.y * 4 + 2)) * across.y;
    // Queue side rails begin at 1.68 m; preserve the .40 m envelope and .03 m gap.
    const correction = Math.max(-1.25, Math.min(1.25, offset)) - offset;
    const ingress = { x: landing.x + across.x * correction, y: landing.y + across.y * correction, z: landing.z };
    const bounds = { x0: Math.min(gate.x, landing.x, ingress.x) - .4, y0: Math.min(gate.y, landing.y, ingress.y) - .4, z0: centre.z, x1: Math.max(gate.x, landing.x, ingress.x) + .4, y1: Math.max(gate.y, landing.y, ingress.y) + .4, z1: gate.z + 1.8 };
    return { gate, bottom, landing, ingress, approach, bounds, yaw, normal: { x: normalX, y: normalY } };
}
function cellsForBounds(bounds) {
    const cells = new Map(), mod = (n) => (n % 2 + 2) % 2;
    for (let x = Math.floor(bounds.x0 / 2); x < Math.ceil(bounds.x1 / 2); x++)
        for (let y = Math.floor(bounds.y0 / 2); y < Math.ceil(bounds.y1 / 2); y++) {
            const tx = Math.floor(x / 2), ty = Math.floor(y / 2), key = `${tx},${ty}`, bit = 1 << [[0, 1], [3, 2]][mod(y)][mod(x)];
            const cell = cells.get(key) ?? { x: tx, y: ty, low: Math.floor(bounds.z0) * 8, high: Math.ceil(bounds.z1) * 8, mask: 0 };
            cell.mask |= bit;
            cells.set(key, cell);
        }
    return [...cells.values()];
}
export function woodenPortalCells(portal, station) { return cellsForBounds(woodenTransition(portal, station).bounds); }
function adjacent(a, b, ride, elements, rules) {
    const i = ride.track.indexOf(a.id), j = ride.track.indexOf(b.id);
    if (i < 0 || j < 0)
        return false;
    if (j === i + 1)
        return same(endpoint(a.origin, rules.pieces[a.piece]), b.origin);
    if (i === j + 1)
        return same(endpoint(b.origin, rules.pieces[b.piece]), a.origin);
    const last = elements.get(ride.track.at(-1));
    return !!last && last.kind === 'track' && ((i === 0 && j === ride.track.length - 1) || (j === 0 && i === ride.track.length - 1)) && same(endpoint(last.origin, rules.pieces[last.piece]), ride.anchor);
}
function trackBounds(track) {
    const [fx, fy] = directions[track.origin.direction], nx = -fy, ny = fx, turn = track.piece === 'right' ? 1 : track.piece === 'left' ? -1 : 0;
    const points = [];
    for (const u of [track.piece === 'station' ? -.010001 : 0, turn ? 18.5 : track.piece === 'station' ? 4.010001 : 4])
        for (const w of [-2.5, turn ? 16 : 2.5])
            points.push([track.origin.x / 8 + 2 + fx * u + nx * (turn || 1) * w, track.origin.y / 8 + 2 + fy * u + ny * (turn || 1) * w]);
    return { x0: Math.min(...points.map(p => p[0])), y0: Math.min(...points.map(p => p[1])), z0: track.origin.z / 8, x1: Math.max(...points.map(p => p[0])), y1: Math.max(...points.map(p => p[1])), z1: track.origin.z / 8 + (track.piece === 'station' ? 4.051 : 3) };
}
const disjoint = (a, b) => a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0 || a.z1 <= b.z0 || b.z1 <= a.z0;
export function woodenInterface(a, b, rides, elements, common) {
    if (a.kind === 'track' && b.kind === 'track') {
        if (a.ride !== b.ride)
            return false;
        const ride = rides.get(a.ride);
        const profile = woodenProfile(ride.content ?? legacyRideContent(), common);
        return !!profile && adjacent(a, b, ride, elements, { ...common, pieces: profile.pieces });
    }
    const portal = a.kind === 'portal' ? a : b.kind === 'portal' ? b : null;
    if (!portal)
        return false;
    const ride = rides.get(portal.ride), profile = ride ? woodenProfile(ride.content ?? legacyRideContent(), common) : null;
    if (!ride || !profile)
        return false;
    const station = elements.get(portal.station);
    if (station?.kind !== 'track' || station.ride !== portal.ride || !profile.pieces[station.piece]?.station)
        return false;
    const other = portal === a ? b : a, transition = woodenTransition(portal, station);
    if (other.kind === 'track') {
        if (other.ride !== portal.ride)
            return false;
        if (other.id === station.id)
            return true;
        return adjacent(station, other, ride, elements, { ...common, pieces: profile.pieces }) && disjoint(transition.bounds, trackBounds(other));
    }
    return other.kind === 'path' && other.tile.x === transition.approach.x && other.tile.y === transition.approach.y && other.height === transition.approach.z && (portal.role === 'entrance' ? other.queueFor === ride.id : other.queueFor === null);
}
