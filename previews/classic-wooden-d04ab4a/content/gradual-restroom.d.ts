import type { ContentIdentity } from './registry.js';
import type { Rules } from '../simulation/types.js';
export declare const restroomProfileId: 'independent.gradual-restroom-service-v1';
export declare const restroomPlacementId: 'independent.gradual-restroom-v1';
export type RestroomProfile = {
    defaultPrice: number;
    reliefPerTick: number;
};
export declare function withGradualRestroomProfile(base: Rules): Rules;
export declare function validateRestroomProfiles(input: Rules['restroomProfiles'], rules: Rules): Record<string, RestroomProfile>;
export declare function gradualRestroomProfile(content: ContentIdentity, rules: Rules): RestroomProfile | null;
