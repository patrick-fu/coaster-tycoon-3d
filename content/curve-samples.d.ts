import type { PieceRule, Vector } from '../simulation/types.js';
export type CurveBank = 'stable' | 'legacy-browser';
export declare function quarterCurveSamples(count: 32 | 64, sign: -1 | 1, radius: 64 | 128, bank?: CurveBank): Vector[];
export declare function piecesWithCurveBank(pieces: Record<string, PieceRule>, count: 32 | 64, radius: 64 | 128, bank: CurveBank): Record<string, PieceRule>;
