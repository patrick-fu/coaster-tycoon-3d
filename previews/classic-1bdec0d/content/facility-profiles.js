import { resolveContent } from './registry.js';
import { commerceProfileId, facilityProduct } from './consumables.js';
import { ensure, record } from '../simulation/validation.js';
export const detailedStallsProfileId = 'independent.detailed-stalls-v1';
export function withDetailedStallsProfile(base) { return { ...base, facilityProfiles: { ...base.facilityProfiles, [detailedStallsProfileId]: { height: 32 } } }; }
export function validateFacilityProfiles(input, rules) {
    const supplied = input === undefined ? {} : input;
    ensure(supplied !== null && typeof supplied === 'object' && !Array.isArray(supplied), 'INVALID_COMMAND', 'Invalid facility profiles.');
    const ids = Object.keys(supplied);
    record(supplied, ids);
    ensure(ids.length <= 1 && ids.every(id => id === detailedStallsProfileId), 'UNSUPPORTED_CONTENT', 'Unavailable facility placement profile.');
    const result = {};
    for (const id of ids) {
        const p = supplied[id];
        record(p, ['height']);
        ensure(p.height === 32 && rules.motion.tileMetres === 4 && rules.commerceProfiles?.[commerceProfileId], 'INVALID_COMMAND', 'Detailed stalls require the qualified height, world mapping and complete commerce profile.');
        result[id] = { height: 32 };
    }
    return result;
}
export function resolveFacilityPlacement(content, rules) {
    const { construction: c, operation: o } = resolveContent(content).capabilities;
    ensure(c.kind === 'facility' && o.kind === 'service' && c.service === o.service, 'INVALID_CONTENT', 'The facility has no compatible placement and service capabilities.');
    facilityProduct(content, rules);
    if (c.profileId !== detailedStallsProfileId)
        return { height: 16, dryGround: false };
    const profile = rules.facilityProfiles?.[c.profileId];
    ensure(profile, 'UNSUPPORTED_CONTENT', 'The selected facility profile is unavailable in this receiving park.');
    return { height: profile.height, dryGround: true };
}
