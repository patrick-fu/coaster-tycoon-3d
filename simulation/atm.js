import { atmProfile, hasAtmProfile, maxAtmWithdrawals } from '../content/atm.js';
import { facilityApproach } from './services.js';
import { random } from './random.js';
import { ensure } from './validation.js';
const same = (a, b) => a.x === b.x && a.y === b.y && a.z === b.z;
const publicPath = (p, index) => index.paths.get(`${p.x},${p.y},${p.z}`)?.queueFor === null;
export function chooseAtm(g, s, rules, index, route) {
    if (!hasAtmProfile(rules) || g.phase === 'leaving' || g.cash > 90 || Math.floor(g.happiness * 255 / 1000) < 105)
        return null;
    let choice = null;
    for (const f of s.facilities) {
        if (f.kind !== 'atm' || !f.open || g.atmRefusal?.instanceId === f.instanceId && s.tick - g.atmRefusal.tick < 720)
            continue;
        const e = index.elements.get(f.element);
        if (e?.kind !== 'facility')
            continue;
        const goal = facilityApproach(e);
        if (!publicPath(goal, index))
            continue;
        const distance = route.distance(g.point, goal, null);
        if (distance !== null && (!choice || distance < choice.distance))
            choice = { facility: f.id, goal, distance };
    }
    return choice;
}
function capacity(g, f, amount) {
    ensure(BigInt(g.cash) + BigInt(amount) <= 1000000n && BigInt(g.withdrawn) + BigInt(amount) <= BigInt(Number.MAX_SAFE_INTEGER) && BigInt(f.withdrawals) + 1n <= BigInt(maxAtmWithdrawals), 'CAPACITY', 'Withdrawal accounting capacity exhausted.');
}
function release(g) { g.facility = null; g.informationCounter = null; g.serviceProgress = 0; g.phase = 'walking'; g.goal = null; g.next = null; g.walkProgress = 0; g.thought = 'none'; }
function refuse(g, f, s) { g.atmRefusal = { instanceId: f.instanceId, tick: s.tick }; release(g); }
export function admitAtm(g, s, rules, index) {
    const f = g.facility === null ? undefined : index.facilities.get(g.facility), e = f ? index.elements.get(f.element) : undefined;
    if (f?.kind !== 'atm' || !f.open || e?.kind !== 'facility' || !same(g.point, facilityApproach(e)) || !publicPath(g.point, index))
        return false;
    const profile = atmProfile(f.content, rules);
    if (g.cash > 200) {
        refuse(g, f, s);
        return false;
    }
    capacity(g, f, profile.amount);
    const happinessRequired = 115 + random(s, 0, 127);
    if (Math.floor(g.happiness * 255 / 1000) < happinessRequired || Math.floor(g.energy * 128 / 1000) < 80) {
        refuse(g, f, s);
        return false;
    }
    g.phase = 'withdrawing';
    g.serviceProgress = 0;
    g.goal = null;
    g.next = null;
    g.walkProgress = 0;
    g.navigationRide = null;
    g.thought = 'none';
    return true;
}
export function stepAtm(g, rules, index) {
    const f = index.facilities.get(g.facility);
    ensure(f.kind === 'atm', 'INVALID_CONTENT', 'Withdrawal has no cash machine.');
    g.serviceProgress++;
    if (g.serviceProgress < rules.services.serviceTicks)
        return;
    const profile = atmProfile(f.content, rules);
    capacity(g, f, profile.amount);
    g.cash += profile.amount;
    g.withdrawn += profile.amount;
    f.withdrawals++;
    release(g);
}
