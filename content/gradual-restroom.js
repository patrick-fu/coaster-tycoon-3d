import { resolveContent } from './registry.js';
import { ensure, integer, record } from '../simulation/validation.js';
export const restroomProfileId = 'independent.gradual-restroom-service-v1';
export const restroomPlacementId = 'independent.gradual-restroom-v1';
export function withGradualRestroomProfile(base) {
    return { ...base, restroomProfiles: { ...base.restroomProfiles, [restroomProfileId]: { defaultPrice: 0, reliefPerTick: 4 } }, facilityProfiles: { ...base.facilityProfiles, [restroomPlacementId]: { height: 32 } } };
}
export function validateRestroomProfiles(input, rules) {
    const supplied = input === undefined ? {} : input;
    ensure(supplied !== null && typeof supplied === 'object' && !Array.isArray(supplied), 'INVALID_COMMAND', 'Invalid restroom profiles.');
    const ids = Object.keys(supplied);
    record(supplied, ids);
    ensure(ids.length <= 1 && ids.every(id => id === restroomProfileId), 'UNSUPPORTED_CONTENT', 'Unavailable restroom profile.');
    if (!Object.hasOwn(supplied, restroomProfileId))
        return {};
    const p = supplied[restroomProfileId];
    record(p, ['defaultPrice', 'reliefPerTick']);
    ensure(integer(p.defaultPrice, 0, rules.services.maxPrice) && integer(p.reliefPerTick, 1, 1000) && rules.motion.tickHz === 40 && rules.motion.tileMetres === 4, 'INVALID_COMMAND', 'Invalid gradual restroom profile.');
    return { [restroomProfileId]: { defaultPrice: p.defaultPrice, reliefPerTick: p.reliefPerTick } };
}
export function gradualRestroomProfile(content, rules) {
    const operation = resolveContent(content).capabilities.operation;
    if (operation.kind !== 'service' || operation.service !== 'restroom' || operation.profileId !== restroomProfileId)
        return null;
    const profile = rules.restroomProfiles?.[restroomProfileId];
    ensure(profile, 'UNSUPPORTED_CONTENT', 'The gradual restroom service is unavailable in this receiving park.');
    return profile;
}
