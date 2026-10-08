import type { ContentIdentity } from './registry.js';
import type { Cell, Connector, PieceRule, RideProfile, Rules } from '../simulation/types.js';
export declare function woodenProfile(content: ContentIdentity, rules: Rules): RideProfile | null;
export declare function resolveRideRules(content: ContentIdentity, rules: Rules): Rules;
export declare function rideFootprint(origin: Connector, piece: PieceRule, profile: RideProfile | null, pieceId: string): Cell[];
export declare function legacyRuleJSON(rules: Rules): string;
