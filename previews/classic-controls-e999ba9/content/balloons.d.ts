import type { ContentIdentity } from './registry.js';
import type { Rules } from '../simulation/types.js';
export declare const balloonProfileId: 'independent.balloon-v1';
export declare const balloonPlacementId: 'independent.balloon-stall-v1';
export declare const defaultBalloonColour = 11;
export type BalloonProfile = {
    stockCost: number;
    defaultPrice: number;
    maxPrice: number;
    value: number;
};
export type BalloonAccount = {
    sales: number;
    income: number;
};
export declare const defaultBalloonProfile: BalloonProfile;
export declare function withBalloonProfile(base: Rules): Rules;
export declare function withoutBalloonProfile(base: Rules): Rules;
export declare function hasBalloonProfile(rules: Rules): boolean;
export declare function balloonProfile(rules: Rules): BalloonProfile;
export declare function validateBalloonProfiles(input: Rules['balloonProfiles']): Record<string, BalloonProfile>;
export declare function facilityBalloon(content: ContentIdentity, rules: Rules): BalloonProfile | null;
