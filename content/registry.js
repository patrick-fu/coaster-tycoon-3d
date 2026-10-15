import { ensure, record } from '../simulation/validation.js';
import { referenceFamilies, referenceVariants } from './rct2-reference.js';
export const CONTENT_VERSION = 9;
const rideIdentity = { familyId: 'independent.circuit-coaster', variantId: 'independent.steel-train', modeId: 'independent.continuous-circuit' };
const families = new Map(), variants = new Map(), modes = new Map();
families.set(rideIdentity.familyId, { id: rideIdentity.familyId, label: 'Independent circuit coaster', category: 'rollerCoaster', reference: null });
modes.set(rideIdentity.modeId, { id: rideIdentity.modeId, label: 'Independent continuous circuit', evidence: 'project-candidate' });
variants.set(rideIdentity.variantId, { id: rideIdentity.variantId, label: 'Independent uniform steel train', reference: null, choices: [{ familyId: rideIdentity.familyId, modeIds: [rideIdentity.modeId], capabilities: { construction: { kind: 'tracked', profileId: 'independent-circuit-v1' }, operation: { kind: 'circuit', profileId: 'independent-circuit-v1' }, presentation: { kind: 'procedural-coaster', profileId: 'classic-candidate-v1' } } }] });
const woodenIdentity = { familyId: 'independent.wooden-circuit-coaster', variantId: 'independent.wooden-four-seat-train', modeId: rideIdentity.modeId };
families.set(woodenIdentity.familyId, { id: woodenIdentity.familyId, label: 'Independent wooden coaster', category: 'rollerCoaster', reference: null });
variants.set(woodenIdentity.variantId, { id: woodenIdentity.variantId, label: 'Detailed four-seat wooden train', reference: null, choices: [{ familyId: woodenIdentity.familyId, modeIds: [woodenIdentity.modeId], capabilities: { construction: { kind: 'tracked', profileId: 'independent.wooden-circuit-v1' }, operation: { kind: 'circuit', profileId: 'independent.wooden-circuit-v1' }, presentation: { kind: 'detailed-wooden-coaster', profileId: 'detailed-wooden-candidate-v1' } } }] });
const carouselIdentity = { familyId: 'independent.carousel', variantId: 'independent.sixteen-seat-carousel', modeId: 'independent.timed-rotation' };
families.set(carouselIdentity.familyId, { id: carouselIdentity.familyId, label: 'Independent Carousel', category: 'gentle', reference: null });
modes.set(carouselIdentity.modeId, { id: carouselIdentity.modeId, label: 'Independent timed rotation', evidence: 'project-candidate' });
variants.set(carouselIdentity.variantId, { id: carouselIdentity.variantId, label: 'Sixteen-seat canopy Carousel', reference: null, choices: [{ familyId: carouselIdentity.familyId, modeIds: [carouselIdentity.modeId], capabilities: { construction: { kind: 'fixed', profileId: 'independent.carousel-v1' }, operation: { kind: 'rotation', profileId: 'independent.carousel-v1' }, presentation: { kind: 'detailed-carousel', profileId: 'detailed-carousel-candidate-v1' } } }] });
const flumeIdentity = { familyId: 'independent.log-flume', variantId: 'independent.four-seat-log', modeId: 'independent.channel-circuit' };
families.set(flumeIdentity.familyId, { id: flumeIdentity.familyId, label: 'Independent Log Flume', category: 'water', reference: null });
modes.set(flumeIdentity.modeId, { id: flumeIdentity.modeId, label: 'Independent channel circuit', evidence: 'project-candidate' });
variants.set(flumeIdentity.variantId, { id: flumeIdentity.variantId, label: 'Four-seat carved log boat', reference: null, choices: [{ familyId: flumeIdentity.familyId, modeIds: [flumeIdentity.modeId], capabilities: { construction: { kind: 'channel', profileId: 'independent.log-flume-v1' }, operation: { kind: 'channel-circuit', profileId: 'independent.log-flume-v1' }, presentation: { kind: 'detailed-log-flume', profileId: 'detailed-log-flume-candidate-v1' } } }] });
for (const service of ['food', 'drink', 'restroom']) {
    const familyId = `independent.${service}-facility`, variantId = `independent.${service === 'restroom' ? 'restroom' : service + '-stand'}`, modeId = service === 'restroom' ? 'independent.restroom-service' : 'independent.retail';
    families.set(familyId, { id: familyId, label: `Independent ${service} facility`, category: 'commercial', reference: null });
    modes.set(modeId, { id: modeId, label: service === 'restroom' ? 'Independent restroom service' : 'Independent retail service', evidence: 'project-candidate' });
    variants.set(variantId, { id: variantId, label: `Independent ${service} facility`, reference: null, choices: [{ familyId, modeIds: [modeId], capabilities: { construction: { kind: 'facility', service, profileId: 'independent-services-v1' }, operation: { kind: 'service', service, profileId: 'independent-services-v1' }, presentation: { kind: 'procedural-facility', service, profileId: 'classic-candidate-v1' } } }] });
}
for (const [service, variantId, productId, label] of [['food', 'independent.burger-stand', 'independent.burger', 'Independent Burger stand'], ['drink', 'independent.soft-drink-stand', 'independent.soft-drink', 'Independent Soft-drink stand']]) {
    const familyId = 'independent.' + service + '-facility', modeId = 'independent.retail', profileId = 'independent.consumables-v1';
    variants.set(variantId, { id: variantId, label, reference: null, choices: [{ familyId, modeIds: [modeId], capabilities: { construction: { kind: 'facility', service, profileId, productId }, operation: { kind: 'service', service, profileId, productId }, presentation: { kind: 'procedural-facility', service, profileId: 'classic-candidate-v1' } } }] });
}
for (const [service, variantId, productId, label] of [['food', 'independent.detailed-burger-stand', 'independent.burger', 'Detailed Burger stand'], ['drink', 'independent.detailed-soft-drink-stand', 'independent.soft-drink', 'Detailed Soft-drink stand']]) {
    const familyId = 'independent.' + service + '-facility', modeId = 'independent.retail';
    variants.set(variantId, { id: variantId, label, reference: null, choices: [{ familyId, modeIds: [modeId], capabilities: { construction: { kind: 'facility', service, profileId: 'independent.detailed-stalls-v1', productId }, operation: { kind: 'service', service, profileId: 'independent.consumables-v1', productId }, presentation: { kind: 'detailed-facility', service, profileId: 'detailed-consumable-stalls-v1' } } }] });
}
const informationIdentity = { familyId: 'independent.information-facility', variantId: 'independent.timber-information-kiosk', modeId: 'independent.retail' };
families.set(informationIdentity.familyId, { id: informationIdentity.familyId, label: 'Independent Information kiosk', category: 'commercial', reference: null });
variants.set(informationIdentity.variantId, { id: informationIdentity.variantId, label: 'Four-counter timber Information kiosk', reference: null, choices: [{ familyId: informationIdentity.familyId, modeIds: [informationIdentity.modeId], capabilities: { construction: { kind: 'facility', service: 'information', profileId: 'independent.information-kiosk-v1' }, operation: { kind: 'service', service: 'information', profileId: 'independent.merchandise-v1' }, presentation: { kind: 'detailed-facility', service: 'information', profileId: 'detailed-information-kiosk-v1' } } }] });
const restroomIdentity = { familyId: 'independent.restroom-facility', variantId: 'independent.gradual-restroom', modeId: 'independent.gradual-restroom-service' };
modes.set(restroomIdentity.modeId, { id: restroomIdentity.modeId, label: 'Independent gradual restroom service', evidence: 'project-candidate' });
variants.set(restroomIdentity.variantId, { id: restroomIdentity.variantId, label: 'Detailed Victorian restroom', reference: null, choices: [{ familyId: restroomIdentity.familyId, modeIds: [restroomIdentity.modeId], capabilities: { construction: { kind: 'facility', service: 'restroom', profileId: 'independent.gradual-restroom-v1' }, operation: { kind: 'service', service: 'restroom', profileId: 'independent.gradual-restroom-service-v1' }, presentation: { kind: 'detailed-facility', service: 'restroom', profileId: 'detailed-gradual-restroom-v1' } } }] });
const atmIdentity = { familyId: 'independent.atm-facility', variantId: 'independent.cash-machine', modeId: 'independent.cash-withdrawal' };
families.set(atmIdentity.familyId, { id: atmIdentity.familyId, label: 'Independent Cash machine', category: 'commercial', reference: null });
modes.set(atmIdentity.modeId, { id: atmIdentity.modeId, label: 'Independent cash withdrawal', evidence: 'project-candidate' });
variants.set(atmIdentity.variantId, { id: atmIdentity.variantId, label: 'Detailed park Cash machine', reference: null, choices: [{ familyId: atmIdentity.familyId, modeIds: [atmIdentity.modeId], capabilities: { construction: { kind: 'facility', service: 'atm', profileId: 'independent.atm-v1' }, operation: { kind: 'service', service: 'atm', profileId: 'independent.atm-withdrawal-v1' }, presentation: { kind: 'detailed-facility', service: 'atm', profileId: 'detailed-atm-v1' } } }] });
for (const f of referenceFamilies)
    families.set(f.id, { id: f.id, label: f.label, category: f.category, reference: { originalSlot: f.originalSlot, sourceUrl: f.sourceUrl } });
for (const v of referenceVariants) {
    const choices = v.choices.map(c => {
        for (const modeId of c.modeIds)
            modes.set(modeId, { id: modeId, label: modeId.split('.').at(-1), evidence: 'reconstructed-reference' });
        const family = referenceFamilies.find(f => f.id === c.familyId);
        return { familyId: c.familyId, modeIds: [...c.modeIds], capabilities: { construction: { kind: 'unimplemented', referenceShape: family.startPiece }, operation: { kind: 'unimplemented' }, presentation: { kind: 'unimplemented' } } };
    });
    variants.set(v.id, { id: v.id, label: v.label, choices, reference: { id: v.referenceId, sourceUrl: v.sourceUrl } });
}
export function legacyRideContent() { return { ...rideIdentity }; }
export function woodenRideContent() { return { ...woodenIdentity }; }
export function carouselRideContent() { return { ...carouselIdentity }; }
export function flumeRideContent() { return { ...flumeIdentity }; }
export function consumableFacilityContent(product) { return { familyId: 'independent.' + (product === 'independent.burger' ? 'food' : 'drink') + '-facility', variantId: product === 'independent.burger' ? 'independent.burger-stand' : 'independent.soft-drink-stand', modeId: 'independent.retail' }; }
export function detailedFacilityContent(product) { return { ...consumableFacilityContent(product), variantId: product === 'independent.burger' ? 'independent.detailed-burger-stand' : 'independent.detailed-soft-drink-stand' }; }
export function legacyFacilityContent(service) { return { familyId: `independent.${service}-facility`, variantId: `independent.${service === 'restroom' ? 'restroom' : service + '-stand'}`, modeId: service === 'restroom' ? 'independent.restroom-service' : 'independent.retail' }; }
export function gradualRestroomContent() { return { ...restroomIdentity }; }
export function atmContent() { return { ...atmIdentity }; }
export function informationFacilityContent() { return { ...informationIdentity }; }
export function historicalContentAllowed(value, kind, version) {
    const allowed = kind === 'atm' ? [] : kind === 'ride' ? [rideIdentity, ...(version >= 9 ? [woodenIdentity] : []), ...(version >= 10 ? [carouselIdentity] : []), ...(version >= 11 ? [flumeIdentity] : [])] : kind === 'information' ? (version >= 14 ? [informationIdentity] : []) : [legacyFacilityContent(kind)];
    if ((kind === 'food' || kind === 'drink') && version >= 12) {
        const product = kind === 'food' ? 'independent.burger' : 'independent.soft-drink';
        allowed.push(consumableFacilityContent(product));
        if (version >= 13)
            allowed.push(detailedFacilityContent(product));
    }
    if (kind === 'restroom' && version >= 15)
        allowed.push(restroomIdentity);
    return allowed.some(c => c.familyId === value?.familyId && c.variantId === value?.variantId && c.modeId === value?.modeId);
}
export function resolveContent(value) {
    record(value, ['familyId', 'variantId', 'modeId']);
    ensure([value.familyId, value.variantId, value.modeId].every(id => typeof id === 'string' && id.length > 0 && id.length <= 160), 'INVALID_CONTENT', 'Invalid content identity.');
    const content = value, family = families.get(content.familyId), variant = variants.get(content.variantId), mode = modes.get(content.modeId);
    ensure(family && variant && mode, 'UNKNOWN_CONTENT', 'Unknown family, variant or operating mode.');
    const choice = variant.choices.find(c => c.familyId === family.id);
    ensure(choice && choice.modeIds.includes(mode.id), 'INVALID_CONTENT', 'The selected variant does not support this family and operating mode.');
    return { content: { ...content }, capabilities: structuredClone(choice.capabilities), evidence: variant.reference ? 'reconstructed-reference' : 'project-candidate' };
}
export function executableContent(value, kind) {
    const resolved = resolveContent(value), { construction, operation, presentation } = resolved.capabilities;
    ensure(construction.kind !== 'unimplemented' && operation.kind !== 'unimplemented' && presentation.kind !== 'unimplemented', 'UNSUPPORTED_CONTENT', 'This reference content has no executable construction, operation and presentation implementation yet.');
    ensure(kind === 'ride' ? (construction.kind === 'tracked' && operation.kind === 'circuit' && (presentation.kind === 'procedural-coaster' || presentation.kind === 'detailed-wooden-coaster')) || (construction.kind === 'fixed' && operation.kind === 'rotation' && presentation.kind === 'detailed-carousel') || (construction.kind === 'channel' && operation.kind === 'channel-circuit' && presentation.kind === 'detailed-log-flume') : construction.kind === 'facility' && construction.service === kind && operation.kind === 'service' && operation.service === kind && (presentation.kind === 'procedural-facility' || presentation.kind === 'detailed-facility') && presentation.service === kind, 'INVALID_CONTENT', 'Content capabilities do not match the requested instance kind.');
    return resolved.content;
}
export function catalogue(availableProfiles = new Set()) {
    return structuredClone({ contentVersion: CONTENT_VERSION, families: [...families.values()], variants: [...variants.values()].map(v => ({ ...v, choices: v.choices.map(c => ({ ...c, runtimeAvailable: c.capabilities.construction.kind !== 'unimplemented' && c.capabilities.operation.kind !== 'unimplemented' && c.capabilities.presentation.kind !== 'unimplemented' && (c.capabilities.construction.profileId === 'independent-circuit-v1' || c.capabilities.construction.profileId === 'independent-services-v1' || availableProfiles.has(c.capabilities.construction.profileId)) && (c.capabilities.operation.kind !== 'service' || (c.capabilities.operation.service !== 'information' && c.capabilities.operation.service !== 'atm' && c.capabilities.operation.profileId !== 'independent.gradual-restroom-service-v1') || availableProfiles.has(c.capabilities.operation.profileId)) })) })), modes: [...modes.values()] });
}
