import type { PieceRule, RideProfile, Rules } from '../simulation/types.js';
export declare const woodenPieces: Record<string, PieceRule>;
export declare function woodenProfileRecord(footprints: RideProfile['footprints']): RideProfile;
export declare function withWoodenProfile(common: Rules, footprints?: RideProfile['footprints']): Rules;
