import { accessible, sharedCount } from './services.js';
import { inPatrol } from './patrol.js';
import { LIMITS } from './types.js';
import { ensure, integer, record } from './validation.js';
const key = (p) => `${p.x},${p.y},${p.z}`;
const same = (a, b) => a.x === b.x && a.y === b.y && a.z === b.z;
export function validateHousekeepingRules(input) {
    const keys = ['buildPrice', 'binCapacity', 'restTicks', 'restEnergy', 'restNausea', 'energyThreshold', 'nauseaThreshold', 'wrapperTicks', 'cleanupTicks'];
    record(input, [...keys]);
    for (const k of keys)
        ensure(integer(input[k], 0, 1000000), 'INVALID_COMMAND', 'Invalid housekeeping rule.');
    for (const k of ['binCapacity', 'restTicks', 'wrapperTicks', 'cleanupTicks'])
        ensure(input[k] > 0, 'INVALID_COMMAND', 'Invalid housekeeping cadence or capacity.');
    for (const k of ['restEnergy', 'restNausea', 'energyThreshold', 'nauseaThreshold'])
        ensure(input[k] <= 1000, 'INVALID_COMMAND', 'Invalid resting need range.');
    return Object.fromEntries(keys.map(k => [k, input[k]]));
}
export function amenityPoint(a, index) { const p = index.elements.get(a.path); return p?.kind === 'path' ? { x: p.tile.x, y: p.tile.y, z: p.height } : null; }
function publicPoint(p, index) { return index.paths.get(key(p))?.queueFor === null; }
export function releaseAmenity(g, index) { if (g.amenity !== null) {
    const a = index.amenities.get(g.amenity);
    if (a?.occupant === g.id)
        a.occupant = null;
} g.amenity = null; g.restProgress = 0; }
export function chooseAmenity(g, s, rules, index, route) {
    let choice = null;
    for (const a of s.amenities) {
        if (a.kind === 'bin' ? !g.wrapper || a.fill >= rules.housekeeping.binCapacity : g.wrapper || a.occupant !== null || g.energy > rules.housekeeping.energyThreshold && g.nausea < rules.housekeeping.nauseaThreshold)
            continue;
        const goal = amenityPoint(a, index);
        if (!goal || !publicPoint(goal, index))
            continue;
        const distance = route.distance(g.point, goal, null);
        if (distance === null)
            continue;
        if (!choice || distance < choice.distance)
            choice = { amenity: a.id, goal, distance };
    }
    return choice;
}
export function amenityAvailable(g, rules, index) {
    if (g.amenity === null)
        return true;
    const a = index.amenities.get(g.amenity), point = a ? amenityPoint(a, index) : null;
    return !!a && !!point && publicPoint(point, index) && (a.kind === 'bin' ? g.wrapper && a.fill < rules.housekeeping.binCapacity : a.occupant === null || a.occupant === g.id);
}
export function useAmenity(g, rules, index) {
    const a = index.amenities.get(g.amenity);
    if (a.kind === 'bin') {
        a.fill++;
        g.wrapper = false;
        g.wrapperTick = 0;
        releaseAmenity(g, index);
        g.thought = 'none';
    }
    else {
        a.occupant = g.id;
        g.phase = 'resting';
        g.restProgress = 0;
    }
}
export function rest(g, rules, index) {
    g.restProgress++;
    if (g.restProgress >= rules.housekeeping.restTicks) {
        g.energy = Math.min(1000, g.energy + rules.housekeeping.restEnergy);
        g.nausea = Math.max(0, g.nausea - rules.housekeeping.restNausea);
        releaseAmenity(g, index);
        g.phase = 'walking';
    }
}
export function dropLitter(g, s, rules, index) {
    if (g.wrapper && g.amenity === null && g.phase !== 'riding' && g.phase !== 'queued' && s.tick - g.wrapperTick >= rules.housekeeping.wrapperTicks && publicPoint(g.point, index) && sharedCount(s) < LIMITS.sharedEntities && integer(s.nextEntity + 1)) {
        const litter = { id: s.nextEntity++, point: { ...g.point } };
        s.litter.push(litter);
        index.litter.set(litter.id, litter);
        g.wrapper = false;
        g.wrapperTick = 0;
    }
}
function clear(t) { t.cleanup = null; t.goal = null; t.next = null; t.progress = 0; t.work = 0; }
function goal(t, index) {
    if (!t.cleanup)
        return null;
    if (t.cleanup.kind === 'litter')
        return index.litter.get(t.cleanup.target)?.point ?? null;
    const bin = index.amenities.get(t.cleanup.target);
    return bin?.kind === 'bin' && bin.fill > 0 ? amenityPoint(bin, index) : null;
}
export function recoverCleanup(s, index, route) { for (const t of s.staff)
    if (t.role === 'handyman' && t.cleanup) {
        const p = goal(t, index);
        if (!p || !t.goal || !same(p, t.goal) || !accessible(t, p, index, route) || t.next !== null && (!publicPoint(t.next, index) || !inPatrol(t.patrol, t.next)))
            clear(t);
    } }
export function stepHandymen(s, rules, index, route) {
    const claimed = new Set(s.staff.filter(t => t.cleanup).map(t => `${t.cleanup.kind}:${t.cleanup.target}`));
    recoverCleanup(s, index, route);
    for (const t of s.staff) {
        if (t.role !== 'handyman')
            continue;
        if (!t.cleanup) {
            const jobs = [...s.litter.map(l => ({ job: { kind: 'litter', target: l.id }, point: l.point })), ...s.amenities.filter(a => a.kind === 'bin' && a.fill > 0).map(a => ({ job: { kind: 'bin', target: a.id }, point: amenityPoint(a, index) }))];
            let choice = null;
            for (const item of jobs) {
                if (!item.point || claimed.has(`${item.job.kind}:${item.job.target}`) || !accessible(t, item.point, index, route))
                    continue;
                const distance = route.distance(t.point, item.point, null, t.patrol);
                if (!choice || distance < choice.distance)
                    choice = { job: item.job, point: item.point, distance };
            }
            if (choice) {
                t.cleanup = choice.job;
                t.goal = choice.point;
                claimed.add(`${choice.job.kind}:${choice.job.target}`);
            }
        }
        if (!t.cleanup || !t.goal)
            continue;
        if (!same(t.point, t.goal)) {
            t.next ??= route.next(t.point, t.goal, null, t.patrol);
            if (!t.next) {
                clear(t);
                continue;
            }
            t.progress++;
            if (t.progress >= rules.services.staffWalkTicks) {
                t.point = { ...t.next };
                t.next = null;
                t.progress = 0;
            }
            continue;
        }
        t.work++;
        if (t.work >= rules.housekeeping.cleanupTicks) {
            ensure(integer(t.completed + 1), 'CAPACITY', 'Staff cleanup counter exhausted.');
            if (t.cleanup.kind === 'litter') {
                s.litter = s.litter.filter(l => l.id !== t.cleanup.target);
                index.litter.delete(t.cleanup.target);
            }
            else
                index.amenities.get(t.cleanup.target).fill = 0;
            t.completed++;
            clear(t);
        }
    }
}
