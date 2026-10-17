import { ensure, integer, record } from '../simulation/validation.js';
export const merchandiseProfileId = 'independent.merchandise-v1';
export const informationProfileId = 'independent.information-kiosk-v1';
export const merchandiseIds = ['independent.map', 'independent.umbrella'];
// Reconstructed money seeds; demand and mapped happiness remain independent candidates.
const candidate = { products: {
        'independent.map': { stockCost: 1, defaultPrice: 6, maxPrice: 1000, value: 7 },
        'independent.umbrella': { stockCost: 20, defaultPrice: 25, maxPrice: 1000, value: 35 }
    } };
export function withMerchandiseProfile(base) { return { ...base, merchandiseProfiles: { ...base.merchandiseProfiles, [merchandiseProfileId]: structuredClone(candidate) } }; }
export function isMerchandiseId(id) { return merchandiseIds.includes(id); }
export function emptyMerchandiseAccounts() { return { 'independent.map': { sales: 0, income: 0 }, 'independent.umbrella': { sales: 0, income: 0 } }; }
export function merchandiseProfile(rules) {
    const p = rules.merchandiseProfiles?.[merchandiseProfileId];
    ensure(p, 'UNSUPPORTED_CONTENT', 'The information merchandise profile is unavailable in this receiving park.');
    return p;
}
export function informationProducts(rules) {
    const p = merchandiseProfile(rules);
    return { 'independent.map': { price: p.products['independent.map'].defaultPrice, sales: 0, income: 0 }, 'independent.umbrella': { price: p.products['independent.umbrella'].defaultPrice, sales: 0, income: 0 } };
}
export function validateMerchandiseProfiles(input) {
    const supplied = input === undefined ? {} : input;
    ensure(supplied !== null && typeof supplied === 'object' && !Array.isArray(supplied), 'INVALID_COMMAND', 'Invalid merchandise profiles.');
    const ids = Object.keys(supplied);
    record(supplied, ids);
    ensure(ids.length <= 1 && ids.every(id => id === merchandiseProfileId), 'UNSUPPORTED_CONTENT', 'Unavailable merchandise profile.');
    const result = {};
    for (const id of ids) {
        const p = supplied[id];
        record(p, ['products']);
        record(p.products, [...merchandiseIds]);
        const products = {};
        for (const productId of merchandiseIds) {
            const v = p.products[productId];
            record(v, ['stockCost', 'defaultPrice', 'maxPrice', 'value']);
            ensure([v.stockCost, v.defaultPrice, v.maxPrice, v.value].every(n => integer(n, 0, 1000000)) && v.defaultPrice <= v.maxPrice, 'INVALID_COMMAND', 'Invalid merchandise price, stock or value.');
            products[productId] = { stockCost: v.stockCost, defaultPrice: v.defaultPrice, maxPrice: v.maxPrice, value: v.value };
        }
        result[id] = { products };
    }
    return result;
}
export function informationProductViews(products, rules) {
    const p = merchandiseProfile(rules);
    const view = (id) => { const a = products[id], r = p.products[id], expense = BigInt(a.sales) * BigInt(r.stockCost); ensure(expense <= BigInt(Number.MAX_SAFE_INTEGER), 'CAPACITY', 'Merchandise stock expense capacity exhausted.'); return { ...a, maxPrice: r.maxPrice, stockCost: r.stockCost, stockExpense: Number(expense), grossMargin: a.income - Number(expense) }; };
    return { 'independent.map': view('independent.map'), 'independent.umbrella': view('independent.umbrella') };
}
