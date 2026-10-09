import { resolveContent } from './registry.js';
import { ensure } from '../simulation/validation.js';
import { footprint } from '../simulation/geometry.js';
import { flumeProfile } from '../simulation/flume-profile.js';
export function woodenProfile(content, rules) {
    const { construction, operation } = resolveContent(content).capabilities;
    if (construction.kind === 'fixed' || construction.kind === 'channel')
        return null;
    ensure(construction.kind === 'tracked' && operation.kind === 'circuit' && construction.profileId === operation.profileId, 'INVALID_CONTENT', 'The ride has no compatible tracked operation profile.');
    if (construction.profileId === 'independent-circuit-v1')
        return null;
    const profile = rules.rideProfiles?.[construction.profileId];
    ensure(profile, 'UNSUPPORTED_CONTENT', 'The selected ride profile is unavailable in this receiving park.');
    return profile;
}
export function resolveRideRules(content, rules) {
    const channel = flumeProfile(content, rules);
    if (channel)
        return { ...rules, pieces: channel.pieces };
    const profile = woodenProfile(content, rules);
    return profile ? { ...rules, motion: profile.motion, pieces: profile.pieces } : rules;
}
export function rideFootprint(origin, piece, profile, pieceId) {
    if (!profile)
        return footprint(origin, piece);
    return profile.footprints[pieceId][origin.direction].map(c => ({ x: (origin.x + c.x) / 32, y: (origin.y + c.y) / 32, low: origin.z + c.low, high: origin.z + c.high, mask: c.mask }));
}
export function legacyRuleJSON(rules) {
    const { rideProfiles, fixedProfiles, channelProfiles, commerceProfiles, ...common } = rules;
    return JSON.stringify(common);
}
export function v9RuleJSON(rules) {
    const { fixedProfiles, channelProfiles, commerceProfiles, ...previous } = rules;
    return JSON.stringify(previous);
}
export function v10RuleJSON(rules) {
    const { channelProfiles, commerceProfiles, ...previous } = rules;
    return JSON.stringify(previous);
}
export function v11RuleJSON(rules) {
    const { commerceProfiles, ...previous } = rules;
    return JSON.stringify(previous);
}
