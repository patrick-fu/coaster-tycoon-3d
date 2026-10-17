import { type ContentIdentity } from './registry.js';
import type { Rules } from '../simulation/types.js';
export declare const atmProfileId: 'independent.atm-withdrawal-v1';
export declare const atmPlacementId: 'independent.atm-v1';
export declare const withdrawalAmount = 500;
export declare const maxAtmWithdrawals: number;
export type AtmProfile = {
    amount: 500;
};
export declare function withAtmProfile(base: Rules): Rules;
export declare function validateAtmProfiles(input: Rules['atmProfiles'], rules: Rules): Record<string, AtmProfile>;
export declare function hasAtmProfile(rules: Rules): boolean;
export declare function atmProfile(content: ContentIdentity, rules: Rules): AtmProfile | null;
