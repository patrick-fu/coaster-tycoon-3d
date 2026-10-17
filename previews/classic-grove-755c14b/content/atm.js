import { resolveContent } from './registry.js';
import { ensure, record } from '../simulation/validation.js';
export const atmProfileId = 'independent.atm-withdrawal-v1';
export const atmPlacementId = 'independent.atm-v1';
export const withdrawalAmount = 500;
export const maxAtmWithdrawals = Math.floor(Number.MAX_SAFE_INTEGER / withdrawalAmount);
export function withAtmProfile(base) {
    return { ...base, atmProfiles: { ...base.atmProfiles, [atmProfileId]: { amount: 500 } }, facilityProfiles: { ...base.facilityProfiles, [atmPlacementId]: { height: 32 } } };
}
export function validateAtmProfiles(input, rules) {
    const supplied = input === undefined ? {} : input;
    ensure(supplied !== null && typeof supplied === 'object' && !Array.isArray(supplied), 'INVALID_COMMAND', 'Invalid ATM profiles.');
    const ids = Object.keys(supplied);
    record(supplied, ids);
    ensure(ids.length <= 1 && ids.every(id => id === atmProfileId), 'UNSUPPORTED_CONTENT', 'Unavailable ATM profile.');
    if (!Object.hasOwn(supplied, atmProfileId))
        return {};
    const p = supplied[atmProfileId];
    record(p, ['amount']);
    ensure(p.amount === withdrawalAmount && rules.motion.tickHz === 40 && rules.motion.tileMetres === 4, 'INVALID_COMMAND', 'Invalid independent ATM profile.');
    return { [atmProfileId]: { amount: 500 } };
}
export function hasAtmProfile(rules) { return !!rules.atmProfiles?.[atmProfileId] && !!rules.facilityProfiles?.[atmPlacementId]; }
export function atmProfile(content, rules) {
    const { construction: c, operation: o } = resolveContent(content).capabilities;
    if (o.kind !== 'service' || o.service !== 'atm')
        return null;
    ensure(c.kind === 'facility' && c.service === 'atm' && c.profileId === atmPlacementId && o.profileId === atmProfileId, 'INVALID_CONTENT', 'ATM capabilities disagree.');
    ensure(hasAtmProfile(rules), 'UNSUPPORTED_CONTENT', 'The ATM requires complete receiving placement and withdrawal profiles.');
    return rules.atmProfiles[atmProfileId];
}
