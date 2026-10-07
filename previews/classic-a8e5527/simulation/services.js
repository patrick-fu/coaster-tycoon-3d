import { inPatrol } from './patrol.js';
import { portalApproach } from './operation.js';
import { ensure, integer, record } from './validation.js';
const same = (a, b) => a.x === b.x && a.y === b.y && a.z === b.z;
const key = (p) => `${p.x},${p.y},${p.z}`;
export function validateServiceRules(input) {
    const keys = ['buildPrice', 'defaultPrice', 'maxPrice', 'foodStock', 'drinkStock', 'needThreshold', 'relief', 'initialBladder', 'serviceTicks', 'weekTicks', 'upkeepWeeks', 'mechanicMonthlyWage', 'handymanMonthlyWage', 'rideUpkeep', 'facilityUpkeep', 'interestPer10000', 'staffWalkTicks', 'repairTicks', 'inspectionTicks', 'inspectionInterval'];
    record(input, [...keys]);
    for (const k of keys)
        ensure(integer(input[k], 0, 1000000), 'INVALID_COMMAND', 'Invalid service profile.');
    for (const k of ['serviceTicks', 'weekTicks', 'upkeepWeeks', 'staffWalkTicks', 'repairTicks', 'inspectionTicks', 'inspectionInterval'])
        ensure(input[k] > 0, 'INVALID_COMMAND', 'Invalid service cadence.');
    ensure(input.needThreshold <= 1000 && input.relief <= 1000 && input.initialBladder <= 1000 && input.defaultPrice <= input.maxPrice && input.interestPer10000 <= 10000, 'INVALID_COMMAND', 'Invalid service range.');
    return Object.fromEntries(keys.map(k => [k, input[k]]));
}
export function facilityApproach(e) {
    const [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][e.direction];
    return { x: e.tile.x + dx, y: e.tile.y + dy, z: e.height };
}
export function sharedCount(s) { return s.people.guests.length + s.staff.length + s.litter.length + s.trains.reduce((n, t) => n + t.carIds.length, 0); }
export function chooseFacility(g, s, rules, index, route) {
    const motive = (f) => f.kind === 'food' ? g.hunger : f.kind === 'drink' ? g.thirst : g.bladder;
    let choice = null;
    for (const f of s.facilities) {
        if (!f.open || g.cash < f.price || g.wrapper && f.kind !== 'restroom' || motive(f) < rules.services.needThreshold)
            continue;
        const e = index.elements.get(f.element);
        if (e?.kind !== 'facility')
            continue;
        const goal = facilityApproach(e);
        if (!publicPath(goal, index))
            continue;
        const distance = route.distance(g.point, goal, null);
        if (distance === null)
            continue;
        if (!choice || motive(f) > choice.need || motive(f) === choice.need && distance < choice.distance)
            choice = { facility: f.id, goal, need: motive(f), distance };
    }
    return choice;
}
export function recoverFacility(g, index) {
    if (g.facility === null)
        return true;
    const f = index.facilities.get(g.facility), e = f ? index.elements.get(f.element) : undefined;
    return !!f && f.open && g.cash >= f.price && e?.kind === 'facility' && publicPath(facilityApproach(e), index);
}
export function buy(g, s, rules, index) {
    const f = index.facilities.get(g.facility), r = rules.services, stock = f.kind === 'food' ? r.foodStock : f.kind === 'drink' ? r.drinkStock : 0, price = f.price;
    const cash = BigInt(s.cash) + BigInt(price) - BigInt(stock);
    ensure(cash >= BigInt(-Number.MAX_SAFE_INTEGER) && cash <= BigInt(Number.MAX_SAFE_INTEGER) && integer(s.ledger.shopSales + price) && integer(s.ledger.stock + stock) && integer(f.income + price) && integer(f.sales + 1) && integer(g.spent + price), 'CAPACITY', 'Shop accounting capacity exhausted.');
    g.cash -= price;
    g.spent += price;
    s.cash = Number(cash);
    s.ledger.shopSales += price;
    s.ledger.stock += stock;
    f.income += price;
    f.sales++;
    if (f.kind !== 'restroom') {
        g.wrapper = true;
        g.wrapperTick = s.tick;
    }
    if (f.kind === 'food')
        g.hunger = Math.max(0, g.hunger - r.relief);
    else if (f.kind === 'drink')
        g.thirst = Math.max(0, g.thirst - r.relief);
    else
        g.bladder = Math.max(0, g.bladder - r.relief);
    g.facility = null;
    g.serviceProgress = 0;
    g.phase = 'walking';
    g.thought = 'none';
}
function publicPath(p, index) { return index.paths.get(key(p))?.queueFor === null; }
function allowed(staff, p) { return inPatrol(staff.patrol, p); }
export function accessible(staff, goal, index, route) {
    if (!publicPath(staff.point, index) || !publicPath(goal, index) || !allowed(staff, staff.point))
        return false;
    const path = route.find(staff.point, goal, null, staff.patrol);
    return path.length > 0 && path.every(p => allowed(staff, p));
}
function clear(staff) { staff.next = null; staff.goal = null; staff.progress = 0; staff.job = null; staff.work = 0; }
export function recoverStaff(s, index, route) {
    for (const staff of s.staff) {
        if (staff.role !== 'mechanic')
            continue;
        const ride = staff.job ? index.rides.get(staff.job.ride) : undefined;
        const station = staff.goal && staff.job && [...index.elements.values()].some(e => e.kind === 'portal' && e.ride === staff.job.ride && same(portalApproach(e), staff.goal));
        if (staff.goal && (!station || !ride || staff.job.kind === 'repair' && !ride.broken || !accessible(staff, staff.goal, index, route) || staff.next && !publicPath(staff.next, index)))
            clear(staff);
    }
}
export function stepStaff(s, rules, index, route) {
    const claimed = new Set(s.staff.filter(t => t.job).map(t => t.job.ride));
    for (const staff of s.staff) {
        if (staff.role !== 'mechanic')
            continue;
        if (staff.job) {
            const ride = index.rides.get(staff.job.ride);
            if (!ride || staff.job.kind === 'repair' && !ride.broken) {
                claimed.delete(staff.job.ride);
                clear(staff);
            }
        }
        if (staff.goal && !accessible(staff, staff.goal, index, route)) {
            if (staff.job)
                claimed.delete(staff.job.ride);
            clear(staff);
        }
        if (!staff.job) {
            let choice;
            for (const ride of s.rides) {
                if (claimed.has(ride.id) || !ride.track.length || !ride.broken && s.tick - ride.lastInspection < rules.services.inspectionInterval)
                    continue;
                for (const e of index.elements.values())
                    if (e.kind === 'portal' && e.ride === ride.id) {
                        const goal = portalApproach(e);
                        if (!accessible(staff, goal, index, route))
                            continue;
                        const distance = route.distance(staff.point, goal, null, staff.patrol);
                        const kind = ride.broken ? 'repair' : 'inspection';
                        if (!choice || kind === 'repair' && choice.kind !== 'repair' || kind === choice.kind && distance < choice.distance)
                            choice = { ride: ride.id, kind, goal, distance };
                    }
            }
            if (choice) {
                staff.job = { ride: choice.ride, kind: choice.kind };
                staff.goal = choice.goal;
                staff.work = 0;
                claimed.add(choice.ride);
            }
        }
        if (!staff.job || !staff.goal)
            continue;
        if (!same(staff.point, staff.goal)) {
            staff.next ??= route.next(staff.point, staff.goal, null, staff.patrol);
            if (!staff.next) {
                claimed.delete(staff.job.ride);
                clear(staff);
                continue;
            }
            staff.progress++;
            if (staff.progress >= rules.services.staffWalkTicks) {
                staff.point = { ...staff.next };
                staff.next = null;
                staff.progress = 0;
            }
            continue;
        }
        staff.work++;
        const duration = staff.job.kind === 'repair' ? rules.services.repairTicks : rules.services.inspectionTicks;
        if (staff.work >= duration) {
            const ride = index.rides.get(staff.job.ride);
            ensure(integer(staff.completed + 1), 'CAPACITY', 'Staff service counter exhausted.');
            if (staff.job.kind === 'repair')
                ride.broken = false;
            ride.lastInspection = s.tick;
            staff.completed++;
            claimed.delete(ride.id);
            clear(staff);
        }
    }
}
export function stepFinance(s, rules) {
    const r = rules.services;
    if (s.tick % r.weekTicks !== 0)
        return;
    // Integer division occurs once per employee, preserving quarter-month rounding.
    const wages = s.staff.reduce((n, t) => n + BigInt(Math.floor((t.role === 'mechanic' ? r.mechanicMonthlyWage : r.handymanMonthlyWage) / 4)), 0n);
    const interest = BigInt(s.loan) * BigInt(r.interestPer10000) / 10000n;
    const upkeep = (s.tick / r.weekTicks) % r.upkeepWeeks === 0 ? BigInt(s.rides.filter(t => t.status !== 'closed').length) * BigInt(r.rideUpkeep) + BigInt(s.facilities.filter(f => f.open).length) * BigInt(r.facilityUpkeep) : 0n;
    const charges = { wages, interest, upkeep };
    let total = 0n;
    for (const [k, v] of Object.entries(charges)) {
        ensure(BigInt(s.ledger[k]) + v <= BigInt(Number.MAX_SAFE_INTEGER), 'CAPACITY', 'Operating ledger capacity exhausted.');
        total += v;
    }
    const cash = BigInt(s.cash) - total;
    ensure(cash >= BigInt(-Number.MAX_SAFE_INTEGER), 'CAPACITY', 'Cash capacity exhausted.');
    s.cash = Number(cash);
    for (const [k, v] of Object.entries(charges))
        s.ledger[k] += Number(v);
}
