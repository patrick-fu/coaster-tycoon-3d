import { ensure, record } from '../simulation/validation.js';
import { referenceFamilies, referenceVariants } from './rct2-reference.js';
export const CONTENT_VERSION = 2;
const rideIdentity = { familyId: 'independent.circuit-coaster', variantId: 'independent.steel-train', modeId: 'independent.continuous-circuit' };
const families = new Map(), variants = new Map(), modes = new Map();
families.set(rideIdentity.familyId, { id: rideIdentity.familyId, label: 'Independent circuit coaster', category: 'rollerCoaster', reference: null });
modes.set(rideIdentity.modeId, { id: rideIdentity.modeId, label: 'Independent continuous circuit', evidence: 'project-candidate' });
variants.set(rideIdentity.variantId, { id: rideIdentity.variantId, label: 'Independent uniform steel train', reference: null, choices: [{ familyId: rideIdentity.familyId, modeIds: [rideIdentity.modeId], capabilities: { construction: { kind: 'tracked', profileId: 'independent-circuit-v1' }, operation: { kind: 'circuit', profileId: 'independent-circuit-v1' }, presentation: { kind: 'procedural-coaster', profileId: 'classic-candidate-v1' } } }] });
const woodenIdentity = { familyId: 'independent.wooden-circuit-coaster', variantId: 'independent.wooden-four-seat-train', modeId: rideIdentity.modeId };
families.set(woodenIdentity.familyId, { id: woodenIdentity.familyId, label: 'Independent wooden coaster', category: 'rollerCoaster', reference: null });
variants.set(woodenIdentity.variantId, { id: woodenIdentity.variantId, label: 'Detailed four-seat wooden train', reference: null, choices: [{ familyId: woodenIdentity.familyId, modeIds: [woodenIdentity.modeId], capabilities: { construction: { kind: 'tracked', profileId: 'independent.wooden-circuit-v1' }, operation: { kind: 'circuit', profileId: 'independent.wooden-circuit-v1' }, presentation: { kind: 'detailed-wooden-coaster', profileId: 'detailed-wooden-candidate-v1' } } }] });
for (const service of ['food', 'drink', 'restroom']) {
    const familyId = `independent.${service}-facility`, variantId = `independent.${service === 'restroom' ? 'restroom' : service + '-stand'}`, modeId = service === 'restroom' ? 'independent.restroom-service' : 'independent.retail';
    families.set(familyId, { id: familyId, label: `Independent ${service} facility`, category: 'commercial', reference: null });
    modes.set(modeId, { id: modeId, label: service === 'restroom' ? 'Independent restroom service' : 'Independent retail service', evidence: 'project-candidate' });
    variants.set(variantId, { id: variantId, label: `Independent ${service} facility`, reference: null, choices: [{ familyId, modeIds: [modeId], capabilities: { construction: { kind: 'facility', service, profileId: 'independent-services-v1' }, operation: { kind: 'service', service, profileId: 'independent-services-v1' }, presentation: { kind: 'procedural-facility', service, profileId: 'classic-candidate-v1' } } }] });
}
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
export function legacyFacilityContent(service) { return { familyId: `independent.${service}-facility`, variantId: `independent.${service === 'restroom' ? 'restroom' : service + '-stand'}`, modeId: service === 'restroom' ? 'independent.restroom-service' : 'independent.retail' }; }
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
    ensure(kind === 'ride' ? construction.kind === 'tracked' && operation.kind === 'circuit' && (presentation.kind === 'procedural-coaster' || presentation.kind === 'detailed-wooden-coaster') : construction.kind === 'facility' && construction.service === kind && operation.kind === 'service' && operation.service === kind && presentation.kind === 'procedural-facility' && presentation.service === kind, 'INVALID_CONTENT', 'Content capabilities do not match the requested instance kind.');
    return resolved.content;
}
export function catalogue(availableProfiles = new Set()) {
    return structuredClone({ contentVersion: CONTENT_VERSION, families: [...families.values()], variants: [...variants.values()].map(v => ({ ...v, choices: v.choices.map(c => ({ ...c, runtimeAvailable: c.capabilities.construction.kind !== 'unimplemented' && c.capabilities.operation.kind !== 'unimplemented' && c.capabilities.presentation.kind !== 'unimplemented' && (c.capabilities.construction.kind !== 'tracked' || c.capabilities.construction.profileId === 'independent-circuit-v1' || availableProfiles.has(c.capabilities.construction.profileId)) })) })), modes: [...modes.values()] });
}
