import { resolveContent } from './registry.js';
import { commerceProfileId, facilityProduct } from './consumables.js';
import { informationProfileId, merchandiseProfileId, withMerchandiseProfile } from './merchandise.js';
import { restroomPlacementId, restroomProfileId, gradualRestroomProfile } from './gradual-restroom.js';
import { ensure, record } from '../simulation/validation.js';
export const detailedStallsProfileId = 'independent.detailed-stalls-v1';
export function withDetailedStallsProfile(base) { return { ...base, facilityProfiles: { ...base.facilityProfiles, [detailedStallsProfileId]: { height: 32 } } }; }
export function withInformationProfile(base) { const rules = withMerchandiseProfile(base); return { ...rules, facilityProfiles: { ...rules.facilityProfiles, [informationProfileId]: { height: 32 } } }; }
export function validateFacilityProfiles(input, rules) {
    const supplied = input === undefined ? {} : input;
    ensure(supplied !== null && typeof supplied === 'object' && !Array.isArray(supplied), 'INVALID_COMMAND', 'Invalid facility profiles.');
    const ids = Object.keys(supplied);
    record(supplied, ids);
    ensure(ids.length <= 3 && ids.every(id => id === detailedStallsProfileId || id === informationProfileId || id === restroomPlacementId), 'UNSUPPORTED_CONTENT', 'Unavailable facility placement profile.');
    const result = {};
    for (const id of [detailedStallsProfileId, informationProfileId, restroomPlacementId]) {
        if (!Object.hasOwn(supplied, id))
            continue;
        const p = supplied[id];
        record(p, ['height']);
        ensure(p.height === 32 && rules.motion.tileMetres === 4 && (id === informationProfileId ? rules.merchandiseProfiles?.[merchandiseProfileId] : id === restroomPlacementId ? rules.restroomProfiles?.[restroomProfileId] : rules.commerceProfiles?.[commerceProfileId]), 'INVALID_COMMAND', 'Detailed stalls require the qualified height, world mapping and complete commerce profile.');
        result[id] = { height: 32 };
    }
    return result;
}
export function resolveFacilityPlacement(content, rules) {
    const { construction: c, operation: o } = resolveContent(content).capabilities;
    ensure(c.kind === 'facility' && o.kind === 'service' && c.service === o.service, 'INVALID_CONTENT', 'The facility has no compatible placement and service capabilities.');
    facilityProduct(content, rules);
    gradualRestroomProfile(content, rules);
    if (c.service === 'information')
        ensure(c.profileId === informationProfileId && o.profileId === merchandiseProfileId && rules.merchandiseProfiles?.[merchandiseProfileId], 'UNSUPPORTED_CONTENT', 'Information requires compatible receiving merchandise and placement profiles.');
    if (c.profileId !== detailedStallsProfileId && c.profileId !== informationProfileId && c.profileId !== restroomPlacementId)
        return { height: 16, dryGround: false };
    const profile = rules.facilityProfiles?.[c.profileId];
    ensure(profile, 'UNSUPPORTED_CONTENT', 'The selected facility profile is unavailable in this receiving park.');
    return { height: profile.height, dryGround: true };
}
