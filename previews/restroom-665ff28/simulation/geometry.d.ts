import type { MotionRules } from './motion.js';
import type { Cell, Connector, PieceRule, Rules } from './types.js';
export declare function validateRules(input: Rules): Rules;
export declare function turn(x: number, y: number, d: number): {
    x: number;
    y: number;
};
export declare function endpoint(a: Connector, p: PieceRule): Connector;
export declare function footprint(a: Connector, p: PieceRule): Cell[];
export declare function same(a: Connector, b: Connector): boolean;
export declare function validateMotionRules(input: MotionRules): MotionRules;
