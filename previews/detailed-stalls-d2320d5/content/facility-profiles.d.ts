import type { ContentIdentity } from './registry.js';
import type { FacilityPlacementProfile, Rules } from '../simulation/types.js';
export declare const detailedStallsProfileId: 'independent.detailed-stalls-v1';
export declare function withDetailedStallsProfile(base: Rules): Rules;
export declare function validateFacilityProfiles(input: Rules['facilityProfiles'], rules: Rules): Record<string, FacilityPlacementProfile>;
export declare function resolveFacilityPlacement(content: ContentIdentity, rules: Rules): {
    height: number;
    dryGround: boolean;
};
