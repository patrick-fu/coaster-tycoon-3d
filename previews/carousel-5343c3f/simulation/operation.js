import { endpoint, same } from './geometry.js';
import { ensure } from './validation.js';
import { legacyRideContent } from '../content/registry.js';
import { resolveRideRules, woodenProfile } from '../content/ride-profiles.js';
import { portalMountYaw } from './wooden-placement.js';
import { carouselPortal, fixedProfile } from './carousel.js';
const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
export function stationGroups(ride, elements, rules) {
    if (ride.body !== undefined)
        return [];
    rules = resolveRideRules(ride.content ?? legacyRideContent(), rules);
    const groups = [];
    let current;
    for (const id of ride.track) {
        const track = elements.get(id);
        if (!rules.pieces[track.piece].station) {
            current = undefined;
            continue;
        }
        if (!current) {
            current = { id, track: [] };
            groups.push(current);
        }
        current.track.push(id);
    }
    const last = ride.track.at(-1);
    if (groups.length > 1 && last !== undefined) {
        const track = elements.get(last);
        if (rules.pieces[track.piece].station && same(endpoint(track.origin, rules.pieces[track.piece]), ride.anchor)) {
            groups[0].track.push(...groups.pop().track);
        }
    }
    return groups;
}
export function validatePortal(portal, ride, elements, rules) {
    if (fixedProfile(ride.content, rules)) {
        const body = elements.get(portal.station);
        ensure(body?.kind === 'fixed-body' && body.ride === ride.id && ride.body === body.id, 'GEOMETRY', 'Carousel portals must reference their fixed body.');
        const socket = carouselPortal(body, portal.role);
        ensure(portal.tile.x === socket.tile.x && portal.tile.y === socket.tile.y && portal.height === socket.height && portal.direction === socket.direction, 'GEOMETRY', 'Carousel portal differs from its authored socket.');
        ensure(![...elements.values()].some(e => e.kind === 'portal' && e.id !== portal.id && e.ride === ride.id && e.role === portal.role), 'GEOMETRY', 'The Carousel already has this portal role.');
        return;
    }
    const profile = woodenProfile(ride.content ?? legacyRideContent(), rules);
    rules = resolveRideRules(ride.content ?? legacyRideContent(), rules);
    const track = elements.get(portal.station);
    ensure(track?.kind === 'track' && track.ride === ride.id && rules.pieces[track.piece].station, 'GEOMETRY', 'Portal must reference a station track piece.');
    const [dx, dy] = directions[portal.direction];
    ensure(portal.height === track.origin.z && (portal.tile.x + dx) * 32 === track.origin.x && (portal.tile.y + dy) * 32 === track.origin.y && portal.direction % 2 !== track.origin.direction % 2, 'GEOMETRY', 'Portal must face the side of its station at platform height.');
    const group = stationGroups(ride, elements, rules).find(s => s.track.includes(portal.station));
    ensure(group, 'GEOMETRY', 'Station does not belong to the ride.');
    for (const e of elements.values()) {
        if (profile && e.kind === 'portal' && e.id !== portal.id && e.station === portal.station) {
            ensure(portalMountYaw(e, track) === portalMountYaw(portal, track), 'GEOMETRY', 'Wooden station portals must agree on the physical bay orientation.');
        }
        if (e.kind === 'portal' && e.id !== portal.id && e.ride === ride.id && e.role === portal.role) {
            ensure(!group.track.includes(e.station), 'GEOMETRY', 'Station already has this portal role.');
        }
    }
}
export function eligibility(ride, elements, rules) {
    if (fixedProfile(ride.content, rules)) {
        const body = ride.body === undefined ? undefined : elements.get(ride.body), issues = [];
        if (body?.kind !== 'fixed-body' || body.ride !== ride.id)
            issues.push('A fixed Carousel body is required.');
        for (const role of ['entrance', 'exit'])
            if (![...elements.values()].some(e => e.kind === 'portal' && e.ride === ride.id && e.station === ride.body && e.role === role))
                issues.push(`A Carousel ${role} is required.`);
        return { circuit: false, stations: [], issues };
    }
    ensure(ride.body === undefined, 'INVALID_CONTENT', 'Tracked eligibility requires a tracked ride.');
    const profile = woodenProfile(ride.content ?? legacyRideContent(), rules);
    rules = resolveRideRules(ride.content ?? legacyRideContent(), rules);
    const stations = stationGroups(ride, elements, rules), last = ride.track.at(-1), track = last === undefined ? undefined : elements.get(last);
    const circuit = ride.track.length > 1 && !!track && same(endpoint(track.origin, rules.pieces[track.piece]), ride.anchor);
    const portals = [...elements.values()].filter((e) => e.kind === 'portal' && e.ride === ride.id);
    const issues = [];
    if (!stations.length)
        issues.push('A station is required.');
    if (!circuit)
        issues.push('The circuit is incomplete.');
    if (!portals.some(p => p.role === 'entrance'))
        issues.push('An entrance is required.');
    if (!portals.some(p => p.role === 'exit'))
        issues.push('An exit is required.');
    for (const station of stations) {
        if (!portals.some(p => station.track.includes(p.station)))
            issues.push(`Station ${station.id} has no entrance or exit.`);
    }
    if (profile) {
        const turns = ride.track.map(id => rules.pieces[elements.get(id).piece].end.turn).filter(turn => turn !== 0);
        if (stations.length !== 1)
            issues.push('The wooden candidate requires one connected station.');
        if (turns.length !== 4 || turns.some(turn => turn !== turns[0]))
            issues.push('The wooden candidate supports one flat four-turn loop with a single turn direction.');
    }
    return { circuit, stations, issues };
}
export function portalApproach(portal) {
    const [dx, dy] = directions[portal.direction];
    return { x: portal.tile.x - dx, y: portal.tile.y - dy, z: portal.height };
}
