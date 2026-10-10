import { resolveContent } from './registry.js';
import { ensure, integer, record } from '../simulation/validation.js';
export const commerceProfileId = 'independent.consumables-v1';
export const productIds = ['independent.burger', 'independent.soft-drink'];
export const containerIds = ['emptyBurgerBox', 'emptyCan'];
const labels = { 'independent.burger': 'Burger', 'independent.soft-drink': 'Soft drink' };
const containers = { 'independent.burger': 'emptyBurgerBox', 'independent.soft-drink': 'emptyCan' };
const containerLabels = { emptyBurgerBox: 'Empty burger box', emptyCan: 'Empty can' };
export const productService = (id) => id === 'independent.burger' ? 'food' : 'drink';
// Reconstructed seeds; ID phase and 0–1000 need mapping remain project candidates.
const candidate = { consumeTicks: 128, unitsPerCall: 3, products: {
        'independent.burger': { stockCost: 5, defaultPrice: 15, maxPrice: 1000, useUnits: 150, effects: { hunger: -27, thirst: 12, bladder: 8 }, containerId: 'emptyBurgerBox' },
        'independent.soft-drink': { stockCost: 3, defaultPrice: 12, maxPrice: 1000, useUnits: 100, effects: { hunger: 0, thirst: -27, bladder: 0 }, containerId: 'emptyCan' }
    } };
export function withConsumablesProfile(base) { return { ...base, commerceProfiles: { ...base.commerceProfiles, [commerceProfileId]: structuredClone(candidate) } }; }
export function validateCommerceProfiles(input) {
    const supplied = input === undefined ? {} : input;
    ensure(supplied !== null && typeof supplied === 'object' && !Array.isArray(supplied), 'INVALID_COMMAND', 'Invalid commerce profiles.');
    const ids = Object.keys(supplied);
    record(supplied, ids);
    ensure(ids.length <= 1 && ids.every(id => id === commerceProfileId), 'UNSUPPORTED_CONTENT', 'Unavailable commerce profile.');
    const result = {};
    for (const id of ids) {
        const p = supplied[id];
        record(p, ['consumeTicks', 'unitsPerCall', 'products']);
        ensure(integer(p.consumeTicks, 1, 1000000) && integer(p.unitsPerCall, 1, 1000000), 'INVALID_COMMAND', 'Invalid consumption cadence.');
        record(p.products, [...productIds]);
        const products = {};
        for (const productId of productIds) {
            const v = p.products[productId];
            record(v, ['stockCost', 'defaultPrice', 'maxPrice', 'useUnits', 'effects', 'containerId']);
            record(v.effects, ['hunger', 'thirst', 'bladder']);
            ensure(integer(v.stockCost, 0, 1000000) && integer(v.defaultPrice, 0, 1000000) && integer(v.maxPrice, 0, 1000000) && v.defaultPrice <= v.maxPrice && integer(v.useUnits, p.unitsPerCall, 1000000) && v.containerId === containers[productId], 'INVALID_COMMAND', 'Invalid product cost, use or container.');
            for (const effect of Object.values(v.effects))
                ensure(integer(effect, -1000, 1000), 'INVALID_COMMAND', 'Invalid mapped product need effect.');
            products[productId] = { stockCost: v.stockCost, defaultPrice: v.defaultPrice, maxPrice: v.maxPrice, useUnits: v.useUnits, effects: { hunger: v.effects.hunger, thirst: v.effects.thirst, bladder: v.effects.bladder }, containerId: v.containerId };
        }
        result[id] = { consumeTicks: p.consumeTicks, unitsPerCall: p.unitsPerCall, products };
    }
    return result;
}
export function productRule(id, rules) {
    ensure(productIds.includes(id), 'INVALID_CONTENT', 'Unknown independent product.');
    const profile = rules.commerceProfiles?.[commerceProfileId];
    ensure(profile, 'UNSUPPORTED_CONTENT', 'The selected product profile is unavailable in this receiving park.');
    return profile.products[id];
}
export function facilityProduct(content, rules) {
    const { construction: c, operation: o } = resolveContent(content).capabilities;
    if (c.kind !== 'facility')
        return null;
    if (c.profileId === 'independent-services-v1') {
        ensure(o.kind === 'service' && o.profileId === c.profileId && o.service === c.service, 'INVALID_CONTENT', 'Facility service capabilities disagree.');
        return null;
    }
    ensure((c.profileId === commerceProfileId || c.profileId === 'independent.detailed-stalls-v1') && o.kind === 'service' && o.profileId === commerceProfileId && o.productId === c.productId && o.service === c.service && productService(c.productId) === c.service, 'INVALID_CONTENT', 'Facility product capabilities disagree.');
    return { id: c.productId, rule: productRule(c.productId, rules) };
}
export function facilityStockCost(f, rules) {
    return (f.content ? facilityProduct(f.content, rules)?.rule.stockCost : undefined) ?? (f.kind === 'food' ? rules.services.foodStock : f.kind === 'drink' ? rules.services.drinkStock : 0);
}
export function productDescriptors(rules) {
    if (!rules.commerceProfiles?.[commerceProfileId])
        return [];
    return productIds.map(id => { const p = productRule(id, rules); return { id, label: labels[id], service: productService(id), defaultPrice: p.defaultPrice, maxPrice: p.maxPrice, stockCost: p.stockCost, useUnits: p.useUnits, container: { id: p.containerId, label: containerLabels[p.containerId] } }; });
}
export function facilityProductView(f, rules) {
    const product = facilityProduct(f.content, rules);
    if (!product)
        return null;
    const expense = BigInt(f.sales) * BigInt(product.rule.stockCost);
    ensure(expense <= BigInt(Number.MAX_SAFE_INTEGER), 'CAPACITY', 'Product stock expense capacity exhausted.');
    return { id: product.id, label: labels[product.id], stockCost: product.rule.stockCost, stockExpense: Number(expense), grossMargin: f.income - Number(expense) };
}
