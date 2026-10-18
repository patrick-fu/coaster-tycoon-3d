import { balloonProfile, hasBalloonProfile } from '../content/balloons.js';
import { facilityApproach } from './services.js';
import { random } from './random.js';
import { ensure } from './validation.js';
const key = (p) => `${p.x},${p.y},${p.z}`;
function excess(g, price, p) { let n = Math.max(0, price - p.value); const h = Math.floor(g.happiness * 255 / 1000); if (h >= 128)
    n = Math.floor(n / 2); if (h >= 180)
    n = Math.floor(n / 2); return n; }
function eligible(g, f, p) { return g.balloonColour === null && g.cash >= f.price && g.ridesTaken >= 3 && Math.floor(g.happiness * 255 / 1000) >= 115 && excess(g, f.price, p) <= 7; }
export function chooseBalloon(g, s, rules, index, route) {
    if (!hasBalloonProfile(rules) || g.balloonColour !== null)
        return null;
    const p = balloonProfile(rules);
    let choice = null;
    for (const f of s.facilities) {
        if (f.kind !== 'balloon' || !f.open || !eligible(g, f, p))
            continue;
        const e = index.elements.get(f.element);
        if (e?.kind !== 'facility' || e.facility !== f.id)
            continue;
        const goal = facilityApproach(e);
        if (index.paths.get(key(goal))?.queueFor !== null)
            continue;
        const distance = route.distance(g.point, goal, null);
        if (distance === null)
            continue;
        if (!choice || distance < choice.distance || distance === choice.distance && f.id < choice.facility)
            choice = { facility: f.id, goal, distance };
    }
    return choice;
}
export function buyBalloon(g, s, rules, index) {
    const f = g.facility === null ? undefined : index.facilities.get(g.facility), e = f ? index.elements.get(f.element) : undefined;
    if (f?.kind !== 'balloon' || !f.open || e?.kind !== 'facility' || e.facility !== f.id || g.informationCounter !== null || !hasBalloonProfile(rules))
        return 'unavailable';
    const front = facilityApproach(e);
    if (key(g.point) !== key(front) || index.paths.get(key(front))?.queueFor !== null)
        return 'unavailable';
    const p = balloonProfile(rules);
    let purchased = false;
    // The souvenir heuristic is a project candidate; only eligible attempts draw randomness.
    if (eligible(g, f, p) && 115 + random(s, 0, 127) <= Math.floor(g.happiness * 255 / 1000) && (f.price <= p.value || excess(g, f.price, p) <= random(s, 0, 7))) {
        const price = BigInt(f.price), stock = BigInt(p.stockCost), limit = BigInt(Number.MAX_SAFE_INTEGER), cash = BigInt(s.cash) + price - stock;
        ensure(cash >= -limit && cash <= limit && BigInt(s.ledger.shopSales) + price <= limit && BigInt(s.ledger.stock) + stock <= limit && BigInt(f.income) + price <= limit && BigInt(f.sales) + 1n <= limit && BigInt(g.spent) + price <= limit, 'CAPACITY', 'Balloon accounting capacity exhausted.');
        g.cash -= f.price;
        g.spent += f.price;
        g.balloonColour = f.balloonColour;
        s.cash = Number(cash);
        s.ledger.shopSales += f.price;
        s.ledger.stock += p.stockCost;
        f.income += f.price;
        f.sales++;
        purchased = true;
    }
    g.facility = null;
    g.informationCounter = null;
    g.serviceProgress = 0;
    g.phase = 'walking';
    g.thought = 'none';
    return purchased ? 'purchased' : 'refused';
}
